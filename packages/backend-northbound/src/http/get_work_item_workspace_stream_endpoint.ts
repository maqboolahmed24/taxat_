import type { NorthboundActorContext } from "../../../../apps/control-plane-api/src/northbound/policy.ts";
import type { ProblemEnvelope } from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type { WorkspaceStreamEvent } from "../../../../packages/generated-models/src/generated/typescript/client-and-collaboration.ts";
import {
  advanceSequenceWindow,
  openSequenceWindow,
} from "../../../domain-kernel/src/streaming/sequence_window.ts";
import { hashTransportResumeToken } from "../../../domain-kernel/src/streaming/stream_recovery.ts";
import type { WorkspaceCursorRecord } from "../../../domain-kernel/src/streaming/cursor_store.ts";
import {
  WorkspaceSnapshotRepository,
  type StoredWorkspaceSnapshot,
} from "../../../backend-workflow/src/repositories/workspace_snapshot_repository.ts";
import {
  getWorkspaceSnapshot,
  WorkspaceReadError,
  viewerScopeFromAudience,
  type WorkspaceSnapshotRepositoryLike,
} from "../query/get_workspace_snapshot.ts";
import {
  buildWorkspaceProblemEnvelope,
  workspaceReadNoStoreHeaders,
  type WorkspaceReadProblemResponse,
} from "../services/build_workspace_problem_envelope.ts";
import { buildWorkspaceStreamRecoveryContract } from "../services/build_workspace_stream_recovery_contract.ts";
import { invalidateResumeTokenOnBindingDrift } from "../services/invalidate_resume_token_on_binding_drift.ts";
import {
  OpenWorkspaceCursorError,
  openOrResumeWorkspaceCursor,
} from "../services/open_or_resume_workspace_cursor.ts";
import {
  WorkspaceCursorRepository,
  type WorkspaceCursorRepositoryLike,
} from "../repositories/workspace_cursor_repository.ts";
import {
  serializeWorkspaceStreamEvent,
  validateWorkspaceStreamEvent,
  WorkspaceStreamEventValidationError,
} from "../streams/serialize_workspace_stream_event.ts";
import {
  authorizeCollaborationReadScope,
  resolveWorkspaceViewerScope,
  type CollaborationReadAuthorizer,
  type GetWorkItemWorkspaceSnapshotEndpointRequest,
} from "./get_work_item_workspace_snapshot_endpoint.ts";
import { mapStreamRecoveryFailure } from "./stream_recovery_error_mapper.ts";

export type GetWorkItemWorkspaceStreamEndpointRequest =
  GetWorkItemWorkspaceSnapshotEndpointRequest & {
    cursorExpiresAt?: string;
    includeHeartbeat?: boolean;
    initialLastAckSequence?: number;
    resumeToken?: string | null;
    schemaCompatibilityRef?: string;
  };

export type GetWorkItemWorkspaceStreamEndpointResponse =
  | {
      body: string;
      cursor: WorkspaceCursorRecord;
      events: WorkspaceStreamEvent[];
      headers: typeof workspaceStreamHeaders;
      status: 200;
    }
  | {
      body: ProblemEnvelope;
      headers: WorkspaceReadProblemResponse["headers"];
      status: number;
    };

export type StoredWorkspaceStreamEventRecord = {
  event: WorkspaceStreamEvent;
  frame_epoch: number;
  item_id: string;
  workspace_sequence: number;
};

export type PersistWorkspaceStreamEventInput = {
  event: WorkspaceStreamEvent;
};

export type WorkspaceStreamEventRepositoryLike = {
  listEventsByItemFrame: (
    itemId: string,
    frameEpoch: number,
  ) => Promise<StoredWorkspaceStreamEventRecord[]> | StoredWorkspaceStreamEventRecord[];
  persistEvent?: (
    input: PersistWorkspaceStreamEventInput,
  ) => Promise<StoredWorkspaceStreamEventRecord> | StoredWorkspaceStreamEventRecord;
};

export type GetWorkItemWorkspaceStreamEndpointDependencies = {
  authorizeRead?: CollaborationReadAuthorizer;
  workspaceCursorRepository: WorkspaceCursorRepositoryLike;
  workspaceSnapshotRepository: WorkspaceSnapshotRepositoryLike;
  workspaceStreamEventRepository: WorkspaceStreamEventRepositoryLike;
};

export const workspaceStreamHeaders = {
  ...workspaceReadNoStoreHeaders,
  "Content-Type": "text/event-stream",
  "X-Accel-Buffering": "no",
} as const;

const streamPathPattern = /^\/v1\/work-items\/([^/]+)\/workspace\/stream$/;

export class WorkspaceCatchUpEventsError extends Error {
  readonly reasonCodes: string[];

  constructor(message: string, reasonCodes: string[]) {
    super(message);
    this.name = "WorkspaceCatchUpEventsError";
    this.reasonCodes = reasonCodes;
  }
}

function catchUpFail(message: string, reasonCodes: string[]): never {
  throw new WorkspaceCatchUpEventsError(message, reasonCodes);
}

function correlationId(request: { correlationId?: string }) {
  return request.correlationId ?? `corr.${Date.now()}`;
}

function requestNow(request: { now?: string }) {
  return request.now ?? new Date().toISOString();
}

function requestUrl(path: string | undefined) {
  try {
    return new URL(path ?? "/", "http://taxat.local");
  } catch {
    return null;
  }
}

function parseStreamPath(request: GetWorkItemWorkspaceStreamEndpointRequest) {
  if (request.itemId !== undefined && request.itemId.length > 0) {
    return {
      itemId: request.itemId,
      resumeToken: request.resumeToken ?? null,
      viewerScope: request.viewerScope ?? null,
    };
  }
  const url = requestUrl(request.path);
  if (url === null) {
    return null;
  }
  const match = streamPathPattern.exec(url.pathname);
  if (match === null) {
    return null;
  }
  try {
    return {
      itemId: decodeURIComponent(match[1]),
      resumeToken: request.resumeToken ?? url.searchParams.get("resume_token"),
      viewerScope: request.viewerScope ?? viewerScopeFromAudience(url.searchParams.get("viewer")),
    };
  } catch {
    return null;
  }
}

function eventSort(
  left: StoredWorkspaceStreamEventRecord,
  right: StoredWorkspaceStreamEventRecord,
) {
  if (left.workspace_sequence !== right.workspace_sequence) {
    return left.workspace_sequence - right.workspace_sequence;
  }
  return Date.parse(left.event.occurred_at) - Date.parse(right.event.occurred_at);
}

export class WorkspaceStreamEventRepository implements WorkspaceStreamEventRepositoryLike {
  readonly #eventsByItemId = new Map<string, StoredWorkspaceStreamEventRecord[]>();

  persistEvent(input: PersistWorkspaceStreamEventInput) {
    const event = validateWorkspaceStreamEvent(input.event);
    const stored = {
      event,
      frame_epoch: event.frame_epoch,
      item_id: event.item_id,
      workspace_sequence: event.workspace_sequence,
    } satisfies StoredWorkspaceStreamEventRecord;
    const existing = this.#eventsByItemId.get(event.item_id) ?? [];
    this.#eventsByItemId.set(event.item_id, [...existing, stored]);
    return stored;
  }

  listEventsByItemFrame(itemId: string, frameEpoch: number) {
    return (this.#eventsByItemId.get(itemId) ?? []).filter(
      (event) => event.frame_epoch === frameEpoch,
    );
  }
}

function assertEventMatchesCursor(input: {
  cursor: WorkspaceCursorRecord;
  event: WorkspaceStreamEvent;
}) {
  const event = input.event;
  const cursor = input.cursor;
  if (event.item_id !== cursor.item_id) {
    catchUpFail("catch-up event item drifted", ["WORKSPACE_STREAM_EVENT_SUBJECT_DRIFT"]);
  }
  if (event.frame_epoch !== cursor.frame_epoch) {
    catchUpFail("catch-up event crossed frame epoch", ["FRAME_EPOCH_ADVANCED"]);
  }
  if (
    event.workspace_route_key !== cursor.workspace_route_key ||
    event.session_visibility_class !== cursor.session_visibility_class ||
    event.shell_stability_token !== cursor.shell_stability_token ||
    event.access_binding_hash !== cursor.access_binding_hash ||
    event.masking_posture_fingerprint !== cursor.masking_posture_fingerprint
  ) {
    catchUpFail("catch-up event route visibility binding drifted", [
      "ROUTE_CONTEXT_CHANGED",
    ]);
  }
  if (
    cursor.session_visibility_class === "CUSTOMER_VISIBLE" &&
    (event.event_type === "audit.appended" || event.audit_ref !== null)
  ) {
    catchUpFail("customer workspace stream cannot receive audit events", [
      "WORKSPACE_CUSTOMER_AUDIT_EVENT_FORBIDDEN",
    ]);
  }
}

export async function loadWorkspaceCatchUpEvents(input: {
  cursor: WorkspaceCursorRecord;
  eventRepository: WorkspaceStreamEventRepositoryLike;
}) {
  if (input.cursor.last_ack_sequence > input.cursor.last_published_sequence) {
    catchUpFail("cursor acknowledged beyond the published workspace frontier", [
      "WORKSPACE_CURSOR_ACK_EXCEEDS_FRONTIER",
    ]);
  }
  const compactionFloor =
    input.cursor.stream_recovery_contract.compaction_floor_sequence_or_null;
  if (compactionFloor !== null && input.cursor.last_ack_sequence < compactionFloor) {
    catchUpFail("workspace cursor fell below the compaction floor", [
      "HISTORY_COMPACTED",
    ]);
  }
  const allEvents = await input.eventRepository.listEventsByItemFrame(
    input.cursor.item_id,
    input.cursor.frame_epoch,
  );
  const candidates = allEvents
    .filter(
      (record) =>
        record.workspace_sequence > input.cursor.last_ack_sequence &&
        record.workspace_sequence <= input.cursor.last_published_sequence,
    )
    .sort(eventSort);
  let window = openSequenceWindow({
    initial_last_applied_sequence: input.cursor.last_ack_sequence,
    stream_recovery_contract: input.cursor.stream_recovery_contract,
  });
  const events: WorkspaceStreamEvent[] = [];
  const skippedDuplicates: WorkspaceStreamEvent[] = [];

  for (const record of candidates) {
    const event = validateWorkspaceStreamEvent(record.event);
    assertEventMatchesCursor({ cursor: input.cursor, event });
    const advanced = advanceSequenceWindow(window, event);
    if (advanced.decision.code === "APPLY") {
      events.push(event);
      window = advanced.next_state;
      continue;
    }
    if (advanced.decision.code === "ACK_DUPLICATE") {
      skippedDuplicates.push(event);
      window = advanced.next_state;
      continue;
    }
    if (
      advanced.decision.code === "REBASE_REQUIRED" ||
      advanced.decision.code === "BLOCK_GAP"
    ) {
      catchUpFail(advanced.decision.summary, advanced.decision.reason_codes);
    }
  }

  if (window.last_applied_sequence < input.cursor.last_published_sequence) {
    catchUpFail("catch-up stream is missing one or more required workspace events", [
      "SEQUENCE_GAP_DETECTED",
    ]);
  }

  return {
    catchUpComplete: true,
    events,
    nextLastAckSequence: window.last_applied_sequence,
    skippedDuplicates,
  };
}

function streamVisibilityPartition(snapshot: StoredWorkspaceSnapshot["record"]) {
  return {
    ...snapshot.visibility_partition,
    partition_scope: "WORKSPACE_STREAM_EVENT" as const,
  };
}

function streamCustomerSafeProjection(snapshot: StoredWorkspaceSnapshot["record"]) {
  return snapshot.customer_safe_projection === null
    ? null
    : {
        ...snapshot.customer_safe_projection,
        boundary_scope: "WORKSPACE_STREAM_EVENT" as const,
      };
}

function heartbeatEvent(input: {
  cursor: WorkspaceCursorRecord;
  now: string;
  resumeToken: string;
  snapshot: StoredWorkspaceSnapshot;
}): WorkspaceStreamEvent {
  const snapshot = input.snapshot.record;
  const recovery = input.cursor.stream_recovery_contract;
  return {
    access_binding_hash: input.cursor.access_binding_hash,
    activity_ref: null,
    artifact_type: "WorkspaceStreamEvent",
    audit_ref: null,
    customer_safe_projection: streamCustomerSafeProjection(snapshot),
    delta_ref: null,
    event_type: "heartbeat",
    frame_epoch: input.cursor.frame_epoch,
    item_id: input.cursor.item_id,
    masking_posture_fingerprint: input.cursor.masking_posture_fingerprint,
    notification_ref: null,
    object_anchor_ref: snapshot.object_anchor_ref,
    occurred_at: input.now,
    queue_projection_or_null: null,
    resume_token: input.resumeToken,
    session_visibility_class: input.cursor.session_visibility_class,
    shell_family: snapshot.shell_family,
    shell_stability_token: input.cursor.shell_stability_token,
    snapshot_ref: null,
    stability_contract: input.cursor.stability_contract as WorkspaceStreamEvent["stability_contract"],
    stream_recovery_contract: buildWorkspaceStreamRecoveryContract({
      accessBindingHash: input.cursor.access_binding_hash,
      compactionFloorSequenceOrNull: recovery.compaction_floor_sequence_or_null,
      frameEpoch: input.cursor.frame_epoch,
      lastPublishedSequence: recovery.last_published_sequence,
      maskingPostureFingerprint: input.cursor.masking_posture_fingerprint,
      publicationGeneration: recovery.publication_generation,
      resumeToken: input.resumeToken,
      routeKey: input.cursor.workspace_route_key,
      sessionBindingHash: recovery.session_binding_hash,
      sessionRef: recovery.session_ref,
      shellStabilityToken: input.cursor.shell_stability_token,
      subjectRef: input.cursor.item_id,
    }),
    stream_scope_class: "WORKSPACE",
    visibility_partition: streamVisibilityPartition(snapshot),
    workspace_route_key: input.cursor.workspace_route_key,
    workspace_sequence: input.cursor.last_ack_sequence,
    workspace_version: input.cursor.workspace_version,
  };
}

function rebaseReason(input: { reasonCodes: readonly string[] }) {
  if (input.reasonCodes.includes("FRAME_EPOCH_ADVANCED")) {
    return {
      family: "FRAME_EPOCH" as const,
      reasonCode: "FRAME_EPOCH_ADVANCED" as const,
    };
  }
  if (input.reasonCodes.includes("HISTORY_COMPACTED")) {
    return {
      family: "FRAME_EPOCH" as const,
      reasonCode: "HISTORY_COMPACTED" as const,
    };
  }
  if (input.reasonCodes.includes("SHELL_STABILITY_CHANGED")) {
    return {
      family: "SHELL_STABILITY_TOKEN" as const,
      reasonCode: "SHELL_STABILITY_CHANGED" as const,
    };
  }
  return {
    family: "WORK_ITEM_VERSION" as const,
    reasonCode: "ROUTE_CONTEXT_CHANGED" as const,
  };
}

function staleGuardValue(input: {
  family: ReturnType<typeof rebaseReason>["family"];
  snapshot: StoredWorkspaceSnapshot;
}) {
  const snapshot = input.snapshot.record;
  if (input.family === "FRAME_EPOCH") {
    return snapshot.frame_epoch;
  }
  if (input.family === "SHELL_STABILITY_TOKEN") {
    return snapshot.shell_stability_token;
  }
  return snapshot.workspace_version;
}

async function markCursorForCatchUpRebase(input: {
  at: string;
  cursor: WorkspaceCursorRecord | null;
  reasonCodes: readonly string[];
  repository: WorkspaceCursorRepositoryLike;
  snapshot: StoredWorkspaceSnapshot;
}) {
  if (input.cursor === null || input.cursor.cursor_state !== "LIVE") {
    return null;
  }
  const reason = rebaseReason({ reasonCodes: input.reasonCodes });
  return invalidateResumeTokenOnBindingDrift({
    at: input.at,
    cursor: input.cursor,
    latestSnapshotRef:
      input.snapshot.snapshot_ref === input.cursor.latest_snapshot_ref
        ? `${input.snapshot.snapshot_ref}#rebase.catch-up`
        : input.snapshot.snapshot_ref,
    latestStabilityContractOrNull:
      input.snapshot.record.stability_contract as unknown as Record<string, unknown>,
    reasonCode: reason.reasonCode,
    repository: input.repository,
  });
}

function problem(input: {
  correlationId: string;
  detailOverride?: string | null;
  error?: unknown;
  itemId: string | null;
  kind: Parameters<typeof buildWorkspaceProblemEnvelope>[0]["kind"];
  latestResumeToken?: string | null;
  latestStabilityContractOrNull?: StoredWorkspaceSnapshot["record"]["stability_contract"] | null;
  latestStaleGuardValue?: ProblemEnvelope["latest_stale_guard_value"];
  latestWorkspaceSnapshotRef?: string | null;
  reasonCodes?: readonly string[];
  staleGuardFamily?: ProblemEnvelope["stale_guard_family"];
  tenantId?: string | null;
}) {
  return buildWorkspaceProblemEnvelope({
    correlationId: input.correlationId,
    detailOverride:
      input.detailOverride ??
      (input.error instanceof Error
        ? input.error.message
        : input.error === undefined
          ? null
          : String(input.error)),
    itemId: input.itemId,
    kind: input.kind,
    latestResumeToken: input.latestResumeToken,
    latestStabilityContractOrNull: input.latestStabilityContractOrNull,
    latestStaleGuardValue: input.latestStaleGuardValue,
    latestWorkspaceSnapshotRef: input.latestWorkspaceSnapshotRef,
    reasonCodes: input.reasonCodes,
    staleGuardFamily: input.staleGuardFamily,
    tenantId: input.tenantId,
  });
}

function problemForOpenError(input: {
  correlationId: string;
  error: OpenWorkspaceCursorError;
  itemId: string;
  snapshot: StoredWorkspaceSnapshot;
}) {
  if (input.error.kind === "ACCESS_REBIND_REQUIRED") {
    return mapStreamRecoveryFailure({
      audience: "PORTAL",
      correlationId: input.correlationId,
      failureKind: "ACCESS_REBIND_REQUIRED",
      frameEpoch: input.snapshot.record.frame_epoch,
      latestWorkspaceSnapshotRef: input.snapshot.snapshot_ref,
      manifestId: input.snapshot.tenant_id,
      reasonCodes: input.error.reasonCodes,
      scope: "WORKSPACE",
      shellStabilityToken: input.snapshot.record.shell_stability_token,
      suggestedDetailSurfaceCode: "CUSTOMER_ACTIVITY",
      workspaceVersion: input.snapshot.record.workspace_version,
    });
  }
  if (input.error.kind === "RESUME_TOKEN_REQUIRED") {
    return problem({
      correlationId: input.correlationId,
      itemId: input.itemId,
      kind: "RESUME_TOKEN_REQUIRED",
      latestWorkspaceSnapshotRef: input.snapshot.snapshot_ref,
      reasonCodes: input.error.reasonCodes,
      tenantId: input.snapshot.tenant_id,
    });
  }
  const reason = rebaseReason({ reasonCodes: input.error.reasonCodes });
  return mapStreamRecoveryFailure({
    audience: "PORTAL",
    correlationId: input.correlationId,
    failureKind: "REBASE_REQUIRED",
    frameEpoch: input.snapshot.record.frame_epoch,
    latestResumeToken: input.snapshot.record.resume_token,
    latestStabilityContract: input.snapshot.record.stability_contract,
    latestWorkspaceSnapshotRef: input.snapshot.snapshot_ref,
    manifestId: input.snapshot.tenant_id,
    reasonCodes: input.error.reasonCodes,
    scope: "WORKSPACE",
    shellStabilityToken: input.snapshot.record.shell_stability_token,
    suggestedDetailSurfaceCode: "CUSTOMER_ACTIVITY",
    workspaceVersion:
      reason.family === "WORK_ITEM_VERSION"
        ? Number(staleGuardValue({ family: reason.family, snapshot: input.snapshot }))
        : input.snapshot.record.workspace_version,
  });
}

export async function getWorkItemWorkspaceStreamEndpoint(
  request: GetWorkItemWorkspaceStreamEndpointRequest,
  dependencies: GetWorkItemWorkspaceStreamEndpointDependencies,
): Promise<GetWorkItemWorkspaceStreamEndpointResponse> {
  const requestCorrelationId = correlationId(request);
  const now = requestNow(request);
  if (request.method !== undefined && request.method !== "GET") {
    return problem({
      correlationId: requestCorrelationId,
      itemId: null,
      kind: "METHOD_INVALID",
    });
  }
  const parsed = parseStreamPath(request);
  if (parsed === null || parsed.itemId.length === 0) {
    return problem({
      correlationId: requestCorrelationId,
      itemId: null,
      kind: "ROUTE_INVALID",
    });
  }
  const viewerScope =
    parsed.viewerScope ??
    resolveWorkspaceViewerScope({
      actorContext: request.actorContext,
      path: request.path,
      viewerScope: request.viewerScope,
    });
  const storedForAuth =
    await dependencies.workspaceSnapshotRepository.getLatestWorkspaceSnapshotForItem({
      item_id: parsed.itemId,
      viewer_scope: viewerScope,
    });
  const authorizeRead =
    dependencies.authorizeRead ?? authorizeCollaborationReadScope;
  const authorization = await authorizeRead({
    actorContext: request.actorContext,
    itemId: parsed.itemId,
    principalClass: request.principalClass,
    routeSurface: "WORKSPACE_STREAM",
    storedSnapshot: storedForAuth,
    viewerScope,
  });
  if (!authorization.authorized) {
    return problem({
      correlationId: requestCorrelationId,
      itemId: parsed.itemId,
      kind: "HIDDEN",
      latestWorkspaceSnapshotRef: storedForAuth?.snapshot_ref,
      reasonCodes: authorization.reasonCodes,
      tenantId: request.actorContext.tenant_id,
    });
  }
  if (parsed.resumeToken === null || parsed.resumeToken.length === 0) {
    return problem({
      correlationId: requestCorrelationId,
      itemId: parsed.itemId,
      kind: "RESUME_TOKEN_REQUIRED",
      latestWorkspaceSnapshotRef: storedForAuth?.snapshot_ref,
      tenantId: request.actorContext.tenant_id,
    });
  }

  let snapshot: StoredWorkspaceSnapshot;
  try {
    snapshot = await getWorkspaceSnapshot({
      actorContext: request.actorContext,
      itemId: parsed.itemId,
      repository: dependencies.workspaceSnapshotRepository,
      viewerScope,
    });
  } catch (error) {
    if (error instanceof WorkspaceReadError) {
      return problem({
        correlationId: requestCorrelationId,
        error,
        itemId: parsed.itemId,
        kind: error.kind,
        latestWorkspaceSnapshotRef: storedForAuth?.snapshot_ref,
        reasonCodes: error.reasonCodes,
        tenantId: request.actorContext.tenant_id,
      });
    }
    return problem({
      correlationId: requestCorrelationId,
      error,
      itemId: parsed.itemId,
      kind: "CORRUPT",
      latestWorkspaceSnapshotRef: storedForAuth?.snapshot_ref,
      tenantId: request.actorContext.tenant_id,
    });
  }

  try {
    let cursor = await openOrResumeWorkspaceCursor({
      actorContext: request.actorContext,
      cursorExpiresAt: request.cursorExpiresAt,
      initialLastAckSequence: request.initialLastAckSequence,
      now,
      principalClass: request.principalClass ?? undefined,
      resumeToken: parsed.resumeToken,
      schemaCompatibilityRef: request.schemaCompatibilityRef,
      snapshot,
      workspaceCursorRepository: dependencies.workspaceCursorRepository,
    });
    const catchUp = await loadWorkspaceCatchUpEvents({
      cursor,
      eventRepository: dependencies.workspaceStreamEventRepository,
    });
    const frames: string[] = [];
    const emittedEvents: WorkspaceStreamEvent[] = [];
    for (const event of catchUp.events) {
      frames.push(serializeWorkspaceStreamEvent(event));
      emittedEvents.push(event);
      cursor = await dependencies.workspaceCursorRepository.acknowledgeCursor(
        cursor.cursor_id,
        {
          at: now,
          lastPublishedSequenceOrNull:
            event.stream_recovery_contract.last_published_sequence,
          sequence: event.workspace_sequence,
        },
      );
    }
    if (request.includeHeartbeat !== false) {
      const heartbeat = heartbeatEvent({
        cursor,
        now,
        resumeToken: parsed.resumeToken,
        snapshot,
      });
      frames.push(serializeWorkspaceStreamEvent(heartbeat));
      emittedEvents.push(heartbeat);
    }
    return {
      body: frames.join("\n"),
      cursor,
      events: emittedEvents,
      headers: workspaceStreamHeaders,
      status: 200,
    };
  } catch (error) {
    if (error instanceof OpenWorkspaceCursorError) {
      return problemForOpenError({
        correlationId: requestCorrelationId,
        error,
        itemId: parsed.itemId,
        snapshot,
      });
    }
    if (error instanceof WorkspaceCatchUpEventsError) {
      const liveCursor =
        (await dependencies.workspaceCursorRepository.findLatestCursorByResumeTokenHash(
          hashTransportResumeToken(parsed.resumeToken),
        )) ?? null;
      await markCursorForCatchUpRebase({
        at: now,
        cursor: liveCursor,
        reasonCodes: error.reasonCodes,
        repository: dependencies.workspaceCursorRepository,
        snapshot,
      });
      const reason = rebaseReason({ reasonCodes: error.reasonCodes });
      return mapStreamRecoveryFailure({
        audience: "PORTAL",
        correlationId: requestCorrelationId,
        failureKind: "REBASE_REQUIRED",
        frameEpoch: snapshot.record.frame_epoch,
        latestResumeToken: snapshot.record.resume_token,
        latestStabilityContract: snapshot.record.stability_contract,
        latestWorkspaceSnapshotRef: snapshot.snapshot_ref,
        manifestId: snapshot.tenant_id,
        reasonCodes: error.reasonCodes,
        scope: "WORKSPACE",
        shellStabilityToken: snapshot.record.shell_stability_token,
        suggestedDetailSurfaceCode: "CUSTOMER_ACTIVITY",
        workspaceVersion:
          reason.family === "WORK_ITEM_VERSION"
            ? Number(staleGuardValue({ family: reason.family, snapshot }))
            : snapshot.record.workspace_version,
      });
    }
    if (error instanceof WorkspaceStreamEventValidationError) {
      return problem({
        correlationId: requestCorrelationId,
        error,
        itemId: parsed.itemId,
        kind: "CORRUPT",
        latestWorkspaceSnapshotRef: snapshot.snapshot_ref,
        reasonCodes: error.reasonCodes,
        tenantId: snapshot.tenant_id,
      });
    }
    return problem({
      correlationId: requestCorrelationId,
      error,
      itemId: parsed.itemId,
      kind: "CORRUPT",
      latestWorkspaceSnapshotRef: snapshot.snapshot_ref,
      tenantId: snapshot.tenant_id,
    });
  }
}

export function createGetWorkItemWorkspaceStreamEndpointDependencies(input: {
  authorizeRead?: CollaborationReadAuthorizer;
  workspaceCursorRepository?: WorkspaceCursorRepositoryLike;
  workspaceSnapshotRepository?: WorkspaceSnapshotRepositoryLike;
  workspaceStreamEventRepository?: WorkspaceStreamEventRepositoryLike;
} = {}): GetWorkItemWorkspaceStreamEndpointDependencies {
  const dependencies = {
    workspaceCursorRepository:
      input.workspaceCursorRepository ?? new WorkspaceCursorRepository(),
    workspaceSnapshotRepository:
      input.workspaceSnapshotRepository ?? new WorkspaceSnapshotRepository(),
    workspaceStreamEventRepository:
      input.workspaceStreamEventRepository ?? new WorkspaceStreamEventRepository(),
  } as GetWorkItemWorkspaceStreamEndpointDependencies;
  if (input.authorizeRead !== undefined) {
    dependencies.authorizeRead = input.authorizeRead;
  }
  return dependencies;
}
