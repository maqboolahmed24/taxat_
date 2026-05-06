import type { NorthboundActorContext } from "../../../../apps/control-plane-api/src/northbound/policy.ts";
import { buildNativeCacheHydrationContract as buildSharedNativeCacheHydrationContract } from "../../../backend-recovery/src/services/build_native_cache_hydration_contract.ts";
import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import {
  createWorkspaceCursor,
  type CursorInvalidationReasonCode,
  type WorkspaceCursorRecord,
} from "../../../domain-kernel/src/streaming/cursor_store.ts";
import {
  hashLiveStreamRecoveryContract,
  hashTransportResumeToken,
} from "../../../domain-kernel/src/streaming/stream_recovery.ts";
import type { StoredWorkspaceSnapshot } from "../../../backend-workflow/src/repositories/workspace_snapshot_repository.ts";
import {
  WorkspaceCursorRepository,
  validateWorkspaceCursorRecord,
  type WorkspaceCursorRepositoryLike,
} from "../repositories/workspace_cursor_repository.ts";
import { detectAccessBindingOrMaskingRebindRequirement } from "./detect_access_binding_or_masking_rebind_requirement.ts";
import { invalidateResumeTokenOnBindingDrift } from "./invalidate_resume_token_on_binding_drift.ts";

export type OpenWorkspaceCursorFailureKind =
  | "ACCESS_REBIND_REQUIRED"
  | "REBASE_REQUIRED"
  | "RESUME_TOKEN_REQUIRED";

export class OpenWorkspaceCursorError extends Error {
  readonly cursor: WorkspaceCursorRecord | null;
  readonly kind: OpenWorkspaceCursorFailureKind;
  readonly reasonCodes: string[];

  constructor(input: {
    cursor?: WorkspaceCursorRecord | null;
    kind: OpenWorkspaceCursorFailureKind;
    message: string;
    reasonCodes: string[];
  }) {
    super(input.message);
    this.name = "OpenWorkspaceCursorError";
    this.cursor = input.cursor ?? null;
    this.kind = input.kind;
    this.reasonCodes = input.reasonCodes;
  }
}

export type WorkspaceResumeBinding = {
  accessBindingHash: string;
  frameEpoch: number;
  itemId: string;
  lastPublishedSequence: number;
  maskingPostureFingerprint: string;
  publicationGeneration: number;
  schemaCompatibilityRef: string;
  sessionBindingHash: string;
  sessionRef: string;
  shellStabilityToken: string;
  viewerScope: "STAFF_FULL" | "CUSTOMER_VISIBLE";
  workspaceRouteKey: string;
  workspaceVersion: number;
};

export type ValidatedWorkspaceResumeToken = {
  actorContext: NorthboundActorContext;
  binding: WorkspaceResumeBinding;
  rawResumeToken: string;
  resumeTokenHash: string;
  schemaCompatibilityRef: string;
  snapshot: StoredWorkspaceSnapshot;
};

const cursorDefaultTtlMs = 15 * 60 * 1000;

function isoFromMillis(millis: number) {
  return new Date(millis).toISOString();
}

function defaultExpiresAt(now: string) {
  return isoFromMillis(Date.parse(now) + cursorDefaultTtlMs);
}

function fail(
  kind: OpenWorkspaceCursorFailureKind,
  message: string,
  reasonCodes: string[],
): never {
  throw new OpenWorkspaceCursorError({ kind, message, reasonCodes });
}

function assertEqual(
  actual: unknown,
  expected: unknown,
  kind: OpenWorkspaceCursorFailureKind,
  message: string,
  reasonCodes: string[],
) {
  if (actual !== expected) {
    fail(kind, message, reasonCodes);
  }
}

export function deriveWorkspaceSessionBindingHash(actorContext: NorthboundActorContext) {
  return stableJsonHash({
    client_id_or_null: actorContext.client_id_or_null,
    principal_ref: actorContext.principal_ref,
    session_ref: actorContext.session_ref,
    tenant_id: actorContext.tenant_id,
    token_contract_version: "WORKSPACE_SESSION_BINDING_V1",
  });
}

export function deriveWorkspaceAccessBindingHash(actorContext: NorthboundActorContext) {
  return (
    actorContext.access_binding_hash_or_null ??
    stableJsonHash({
      client_id_or_null: actorContext.client_id_or_null,
      principal_ref: actorContext.principal_ref,
      tenant_id: actorContext.tenant_id,
      token_contract_version: "WORKSPACE_ACCESS_BINDING_V1",
    })
  );
}

export function deriveWorkspaceMaskingPostureFingerprint(actorContext: NorthboundActorContext) {
  return (
    actorContext.masking_posture_fingerprint_or_null ??
    stableJsonHash({
      principal_ref: actorContext.principal_ref,
      tenant_id: actorContext.tenant_id,
      token_contract_version: "WORKSPACE_MASKING_POSTURE_V1",
      visibility_posture: "UNMASKED_OR_NOT_DECLARED",
    })
  );
}

export function workspaceResumeBindingFromActor(input: {
  actorContext: NorthboundActorContext;
  schemaCompatibilityRef?: string;
  snapshot: StoredWorkspaceSnapshot;
}): WorkspaceResumeBinding {
  const snapshot = input.snapshot.record;
  return {
    accessBindingHash: deriveWorkspaceAccessBindingHash(input.actorContext),
    frameEpoch: snapshot.frame_epoch,
    itemId: snapshot.item_id,
    lastPublishedSequence: snapshot.last_published_sequence,
    maskingPostureFingerprint: deriveWorkspaceMaskingPostureFingerprint(input.actorContext),
    publicationGeneration: snapshot.stability_contract.publication_generation,
    schemaCompatibilityRef:
      input.schemaCompatibilityRef ?? "workspace_snapshot.schema.json@current",
    sessionBindingHash: deriveWorkspaceSessionBindingHash(input.actorContext),
    sessionRef: input.actorContext.session_ref,
    shellStabilityToken: snapshot.shell_stability_token,
    viewerScope: snapshot.viewer_scope,
    workspaceRouteKey: snapshot.workspace_route_key,
    workspaceVersion: snapshot.workspace_version,
  };
}

function nonEmptyWorkspaceResumeToken(resumeToken: string | null | undefined) {
  if (resumeToken === undefined || resumeToken === null || resumeToken.length === 0) {
    fail("RESUME_TOKEN_REQUIRED", "workspace stream requires a resume token", [
      "WORKSPACE_RESUME_TOKEN_REQUIRED",
    ]);
  }
  if (!resumeToken.startsWith("workspace-resume://")) {
    fail("ACCESS_REBIND_REQUIRED", "resume token is not scoped to a workspace stream", [
      "WORKSPACE_RESUME_TOKEN_SCOPE_INVALID",
    ]);
  }
  return resumeToken;
}

function assertPublicationStillCurrent(input: {
  binding: WorkspaceResumeBinding;
  snapshot: StoredWorkspaceSnapshot;
}) {
  const snapshot = input.snapshot.record;
  const recovery = snapshot.stream_recovery_contract;
  assertEqual(snapshot.item_id, input.binding.itemId, "REBASE_REQUIRED", "item drifted", [
    "WORKSPACE_STREAM_SUBJECT_DRIFT",
  ]);
  assertEqual(
    snapshot.object_anchor_ref,
    snapshot.item_id,
    "REBASE_REQUIRED",
    "object anchor drifted",
    ["WORKSPACE_OBJECT_ANCHOR_DRIFT"],
  );
  assertEqual(
    recovery.stream_scope_class,
    "WORKSPACE",
    "REBASE_REQUIRED",
    "workspace stream scope drifted",
    ["WORKSPACE_STREAM_SCOPE_DRIFT"],
  );
  assertEqual(
    recovery.route_key,
    snapshot.workspace_route_key,
    "REBASE_REQUIRED",
    "workspace route key drifted",
    ["WORKSPACE_STREAM_ROUTE_DRIFT"],
  );
  assertEqual(
    recovery.subject_ref,
    snapshot.item_id,
    "REBASE_REQUIRED",
    "workspace stream subject drifted",
    ["WORKSPACE_STREAM_SUBJECT_DRIFT"],
  );
  assertEqual(
    recovery.shell_stability_token,
    snapshot.shell_stability_token,
    "REBASE_REQUIRED",
    "shell stability token drifted",
    ["SHELL_STABILITY_CHANGED"],
  );
  assertEqual(
    recovery.frame_epoch,
    snapshot.frame_epoch,
    "REBASE_REQUIRED",
    "frame epoch advanced",
    ["FRAME_EPOCH_ADVANCED"],
  );
  assertEqual(
    recovery.last_published_sequence,
    snapshot.last_published_sequence,
    "REBASE_REQUIRED",
    "published frontier drifted",
    ["WORKSPACE_STREAM_FRONTIER_DRIFT"],
  );
  assertEqual(
    recovery.publication_generation,
    input.binding.publicationGeneration,
    "REBASE_REQUIRED",
    "publication generation drifted",
    ["WORKSPACE_STREAM_PUBLICATION_GENERATION_DRIFT"],
  );
  if (
    recovery.compaction_floor_sequence_or_null !== null &&
    recovery.compaction_floor_sequence_or_null > recovery.last_published_sequence
  ) {
    fail("REBASE_REQUIRED", "compaction floor moved beyond the published frontier", [
      "HISTORY_COMPACTED",
    ]);
  }
}

function assertActorBinding(input: {
  binding: WorkspaceResumeBinding;
  snapshot: StoredWorkspaceSnapshot;
}) {
  const recovery = input.snapshot.record.stream_recovery_contract;
  assertEqual(
    recovery.session_ref,
    input.binding.sessionRef,
    "ACCESS_REBIND_REQUIRED",
    "session ref drifted",
    ["SESSION_BINDING_CHANGED"],
  );
  assertEqual(
    recovery.session_binding_hash,
    input.binding.sessionBindingHash,
    "ACCESS_REBIND_REQUIRED",
    "session binding drifted",
    ["SESSION_BINDING_CHANGED"],
  );
  assertEqual(
    recovery.access_binding_hash,
    input.binding.accessBindingHash,
    "ACCESS_REBIND_REQUIRED",
    "access binding drifted",
    ["ACCESS_BINDING_CHANGED"],
  );
  assertEqual(
    recovery.masking_context_hash,
    input.binding.maskingPostureFingerprint,
    "ACCESS_REBIND_REQUIRED",
    "masking posture drifted",
    ["MASKING_POSTURE_CHANGED"],
  );
}

export function validateWorkspaceResumeToken(input: {
  actorContext: NorthboundActorContext;
  resumeToken: string | null | undefined;
  schemaCompatibilityRef?: string;
  snapshot: StoredWorkspaceSnapshot;
}): ValidatedWorkspaceResumeToken {
  const resumeToken = nonEmptyWorkspaceResumeToken(input.resumeToken);
  const binding = workspaceResumeBindingFromActor({
    actorContext: input.actorContext,
    schemaCompatibilityRef: input.schemaCompatibilityRef,
    snapshot: input.snapshot,
  });
  assertPublicationStillCurrent({ binding, snapshot: input.snapshot });
  assertActorBinding({ binding, snapshot: input.snapshot });
  const snapshot = input.snapshot.record;
  if (
    snapshot.stream_recovery_contract.resume_binding_representation !== "RAW_TOKEN" ||
    snapshot.stream_recovery_contract.resume_binding_ref_or_null !== resumeToken ||
    snapshot.stability_contract.resume_token_or_null !== resumeToken ||
    snapshot.resume_token !== resumeToken
  ) {
    fail("ACCESS_REBIND_REQUIRED", "resume token does not match the grouped stream contract", [
      "WORKSPACE_RESUME_TOKEN_BINDING_MISMATCH",
    ]);
  }
  if (snapshot.stream_recovery_contract.delivery_window_state !== "LIVE_RESUMABLE") {
    fail("REBASE_REQUIRED", "resume token no longer has a live delivery window", [
      snapshot.stream_recovery_contract.rebase_reason_code_or_null ??
        "WORKSPACE_STREAM_DELIVERY_WINDOW_DRIFT",
    ]);
  }
  return {
    actorContext: input.actorContext,
    binding,
    rawResumeToken: resumeToken,
    resumeTokenHash: hashTransportResumeToken(resumeToken),
    schemaCompatibilityRef: binding.schemaCompatibilityRef,
    snapshot: input.snapshot,
  };
}

function buildNativeCacheHydrationContract(input: {
  principalClass: string;
  schemaCompatibilityRef: string;
  snapshot: StoredWorkspaceSnapshot;
}) {
  const snapshot = input.snapshot.record;
  return buildSharedNativeCacheHydrationContract({
    access_binding_hash_or_null: snapshot.access_binding_hash,
    canonical_object_ref: snapshot.item_id,
    hydration_scope_class: "WORKSPACE_CURSOR",
    masking_posture_fingerprint: snapshot.masking_posture_fingerprint,
    principal_class: input.principalClass,
    projection_guard_ref: snapshot.stability_contract.guard_vector_hash,
    resume_binding_ref_or_null: hashTransportResumeToken(snapshot.resume_token),
    route_identity_ref: snapshot.workspace_route_key,
    schema_compatibility_ref: input.schemaCompatibilityRef,
    session_binding_hash: snapshot.stream_recovery_contract.session_binding_hash,
    session_lineage_ref_or_null: snapshot.stream_recovery_contract.session_ref,
    shell_family: snapshot.shell_family,
    tenant_id: snapshot.tenant_id,
  });
}

function replacementSnapshotRef(input: {
  cursor: WorkspaceCursorRecord;
  now: string;
  snapshot: StoredWorkspaceSnapshot;
}) {
  if (input.snapshot.snapshot_ref !== input.cursor.latest_snapshot_ref) {
    return input.snapshot.snapshot_ref;
  }
  return `${input.snapshot.snapshot_ref}#rebase.${stableJsonHash({
    cursor_id: input.cursor.cursor_id,
    now: input.now,
  }).slice(0, 12)}`;
}

function assertExistingCursorStillBound(input: {
  cursor: WorkspaceCursorRecord;
  validation: ValidatedWorkspaceResumeToken;
}) {
  const cursor = input.cursor;
  const snapshot = input.validation.snapshot.record;
  const binding = input.validation.binding;
  const accessRebind = detectAccessBindingOrMaskingRebindRequirement({
    current: {
      accessBindingHash: cursor.access_binding_hash,
      maskingContextHash: cursor.masking_posture_fingerprint,
      principalClass: cursor.principal_class,
      principalRef: cursor.principal_ref,
      schemaCompatibilityRef: cursor.schema_compatibility_ref,
      sessionBindingHash: cursor.session_binding_hash,
      sessionRef: cursor.session_ref,
      tenantId: cursor.tenant_id,
    },
    expected: {
      accessBindingHash: binding.accessBindingHash,
      maskingContextHash: binding.maskingPostureFingerprint,
      principalClass:
        snapshot.viewer_scope === "STAFF_FULL" ? "STAFF_FULL" : "CUSTOMER_VISIBLE",
      principalRef: input.validation.actorContext.principal_ref,
      schemaCompatibilityRef: input.validation.schemaCompatibilityRef,
      sessionBindingHash: binding.sessionBindingHash,
      sessionRef: binding.sessionRef,
      tenantId: input.validation.actorContext.tenant_id,
    },
  });
  if (accessRebind !== null) {
    throw new OpenWorkspaceCursorError({
      cursor,
      kind: "ACCESS_REBIND_REQUIRED",
      message: "cursor access binding drifted",
      reasonCodes: accessRebind.reasonCodes,
    });
  }
  if (cursor.tenant_id !== input.validation.actorContext.tenant_id) {
    throw new OpenWorkspaceCursorError({
      cursor,
      kind: "ACCESS_REBIND_REQUIRED",
      message: "cursor tenant drifted",
      reasonCodes: ["TENANT_SWITCHED"],
    });
  }
  if (cursor.principal_ref !== input.validation.actorContext.principal_ref) {
    throw new OpenWorkspaceCursorError({
      cursor,
      kind: "ACCESS_REBIND_REQUIRED",
      message: "cursor principal drifted",
      reasonCodes: ["SESSION_BINDING_CHANGED"],
    });
  }
  if (
    cursor.session_binding_hash !== binding.sessionBindingHash ||
    cursor.session_ref !== binding.sessionRef
  ) {
    throw new OpenWorkspaceCursorError({
      cursor,
      kind: "ACCESS_REBIND_REQUIRED",
      message: "cursor session binding drifted",
      reasonCodes: ["SESSION_BINDING_CHANGED"],
    });
  }
  if (cursor.access_binding_hash !== binding.accessBindingHash) {
    throw new OpenWorkspaceCursorError({
      cursor,
      kind: "ACCESS_REBIND_REQUIRED",
      message: "cursor access binding drifted",
      reasonCodes: ["ACCESS_BINDING_CHANGED"],
    });
  }
  if (cursor.masking_posture_fingerprint !== binding.maskingPostureFingerprint) {
    throw new OpenWorkspaceCursorError({
      cursor,
      kind: "ACCESS_REBIND_REQUIRED",
      message: "cursor masking posture drifted",
      reasonCodes: ["MASKING_POSTURE_CHANGED"],
    });
  }
  if (cursor.schema_compatibility_ref !== input.validation.schemaCompatibilityRef) {
    throw new OpenWorkspaceCursorError({
      cursor,
      kind: "ACCESS_REBIND_REQUIRED",
      message: "cursor schema compatibility drifted",
      reasonCodes: ["SCHEMA_INCOMPATIBLE"],
    });
  }
  if (
    cursor.item_id !== snapshot.item_id ||
    cursor.workspace_route_key !== snapshot.workspace_route_key ||
    cursor.session_visibility_class !== snapshot.viewer_scope
  ) {
    throw new OpenWorkspaceCursorError({
      cursor,
      kind: "REBASE_REQUIRED",
      message: "cursor route or visibility drifted",
      reasonCodes: ["ROUTE_CONTEXT_CHANGED"],
    });
  }
  if (cursor.shell_stability_token !== snapshot.shell_stability_token) {
    throw new OpenWorkspaceCursorError({
      cursor,
      kind: "REBASE_REQUIRED",
      message: "cursor shell stability token drifted",
      reasonCodes: ["SHELL_STABILITY_CHANGED"],
    });
  }
  if (cursor.frame_epoch !== snapshot.frame_epoch) {
    throw new OpenWorkspaceCursorError({
      cursor,
      kind: "REBASE_REQUIRED",
      message: "cursor frame epoch advanced",
      reasonCodes: ["FRAME_EPOCH_ADVANCED"],
    });
  }
  if (
    cursor.workspace_version !== snapshot.workspace_version ||
    cursor.customer_head_sequence !== snapshot.customer_head_sequence ||
    cursor.internal_head_sequence_or_null !== snapshot.internal_head_sequence_or_null ||
    cursor.request_state_version_or_null !== snapshot.request_state_version_or_null
  ) {
    throw new OpenWorkspaceCursorError({
      cursor,
      kind: "REBASE_REQUIRED",
      message: "cursor workspace guard vector drifted",
      reasonCodes: ["SHELL_STABILITY_CHANGED"],
    });
  }
  const compactionFloor =
    snapshot.stream_recovery_contract.compaction_floor_sequence_or_null;
  if (compactionFloor !== null && cursor.last_ack_sequence < compactionFloor) {
    throw new OpenWorkspaceCursorError({
      cursor,
      kind: "REBASE_REQUIRED",
      message: "cursor fell below compaction floor",
      reasonCodes: ["HISTORY_COMPACTED"],
    });
  }
}

function currentCursorPublication(input: {
  cursor: WorkspaceCursorRecord;
  validation: ValidatedWorkspaceResumeToken;
}) {
  const snapshot = input.validation.snapshot.record;
  return validateWorkspaceCursorRecord({
    ...input.cursor,
    customer_head_sequence: snapshot.customer_head_sequence,
    internal_head_sequence_or_null: snapshot.internal_head_sequence_or_null,
    latest_snapshot_ref: input.validation.snapshot.snapshot_ref,
    last_published_sequence: snapshot.last_published_sequence,
    request_state_version_or_null: snapshot.request_state_version_or_null,
    stability_contract: snapshot.stability_contract,
    stream_recovery_contract: hashLiveStreamRecoveryContract(
      snapshot.stream_recovery_contract,
      input.validation.rawResumeToken,
    ),
    workspace_version: snapshot.workspace_version,
  });
}

async function createNewCursor(input: {
  cursorExpiresAt?: string;
  cursorId?: string;
  initialLastAckSequence: number;
  now: string;
  principalClass: string;
  repository: WorkspaceCursorRepositoryLike;
  validation: ValidatedWorkspaceResumeToken;
}) {
  const snapshot = input.validation.snapshot.record;
  const cursor = createWorkspaceCursor({
    cursor_id: input.cursorId,
    customer_head_sequence: snapshot.customer_head_sequence,
    expires_at: input.cursorExpiresAt ?? defaultExpiresAt(input.now),
    internal_head_sequence_or_null: snapshot.internal_head_sequence_or_null,
    item_id: snapshot.item_id,
    last_ack_sequence: input.initialLastAckSequence,
    latest_snapshot_ref: input.validation.snapshot.snapshot_ref,
    masking_posture_fingerprint: snapshot.masking_posture_fingerprint,
    native_cache_hydration_contract: buildNativeCacheHydrationContract({
      principalClass: input.principalClass,
      schemaCompatibilityRef: input.validation.schemaCompatibilityRef,
      snapshot: input.validation.snapshot,
    }),
    now: input.now,
    principal_class: input.principalClass,
    principal_ref: input.validation.actorContext.principal_ref,
    raw_resume_token: input.validation.rawResumeToken,
    request_state_version_or_null: snapshot.request_state_version_or_null,
    schema_compatibility_ref: input.validation.schemaCompatibilityRef,
    session_visibility_class: snapshot.viewer_scope,
    stability_contract: snapshot.stability_contract,
    stream_recovery_contract: snapshot.stream_recovery_contract,
    tenant_id: snapshot.tenant_id,
    workspace_version: snapshot.workspace_version,
  });
  return input.repository.saveCursor({ cursor });
}

function successorCursorId(input: {
  existing: WorkspaceCursorRecord;
  now: string;
  validation: ValidatedWorkspaceResumeToken;
}) {
  return `${input.existing.cursor_id}.successor.${stableJsonHash({
    now: input.now,
    resume_token_hash: input.validation.resumeTokenHash,
  }).slice(0, 12)}`;
}

export async function openOrResumeWorkspaceCursor(input: {
  actorContext: NorthboundActorContext;
  cursorExpiresAt?: string;
  initialLastAckSequence?: number;
  now: string;
  principalClass?: string;
  resumeToken: string | null | undefined;
  schemaCompatibilityRef?: string;
  snapshot: StoredWorkspaceSnapshot;
  workspaceCursorRepository?: WorkspaceCursorRepositoryLike;
}) {
  const repository = input.workspaceCursorRepository ?? new WorkspaceCursorRepository();
  const validation = validateWorkspaceResumeToken({
    actorContext: input.actorContext,
    resumeToken: input.resumeToken,
    schemaCompatibilityRef: input.schemaCompatibilityRef,
    snapshot: input.snapshot,
  });
  const existing = await repository.findLatestCursorByResumeTokenHash(
    validation.resumeTokenHash,
  );
  const principalClass =
    input.principalClass ??
    (validation.snapshot.record.viewer_scope === "STAFF_FULL"
      ? "STAFF_FULL"
      : "CUSTOMER_VISIBLE");
  if (existing === null) {
    const initialLastAckSequence =
      input.initialLastAckSequence ??
      validation.snapshot.record.last_published_sequence;
    return createNewCursor({
      cursorExpiresAt: input.cursorExpiresAt,
      initialLastAckSequence,
      now: input.now,
      principalClass,
      repository,
      validation,
    });
  }

  let current = validateWorkspaceCursorRecord(existing);
  current = await repository.expireCursorIfNeeded(current.cursor_id, input.now);
  if (current.cursor_state === "EXPIRED" || current.cursor_state !== "LIVE") {
    return createNewCursor({
      cursorExpiresAt: input.cursorExpiresAt,
      cursorId: successorCursorId({ existing: current, now: input.now, validation }),
      initialLastAckSequence: validation.snapshot.record.last_published_sequence,
      now: input.now,
      principalClass,
      repository,
      validation,
    });
  }

  try {
    assertExistingCursorStillBound({ cursor: current, validation });
  } catch (error) {
    if (error instanceof OpenWorkspaceCursorError) {
      const reasonCode = error.reasonCodes[0] as Exclude<
        CursorInvalidationReasonCode,
        null
      >;
      const transitioned = await invalidateResumeTokenOnBindingDrift({
        at: input.now,
        cursor: current,
        latestSnapshotRef: replacementSnapshotRef({
          cursor: current,
          now: input.now,
          snapshot: validation.snapshot,
        }),
        latestStabilityContractOrNull:
          validation.snapshot.record.stability_contract as unknown as Record<string, unknown>,
        reasonCode,
        repository,
      });
      throw new OpenWorkspaceCursorError({
        cursor: transitioned,
        kind: error.kind,
        message: error.message,
        reasonCodes: error.reasonCodes,
      });
    }
    throw error;
  }

  const refreshed = currentCursorPublication({ cursor: current, validation });
  return repository.saveCursor({
    cursor: {
      ...refreshed,
      expires_at: input.cursorExpiresAt ?? refreshed.expires_at,
      last_seen_at: input.now,
    },
  });
}
