import type { NorthboundActorContext } from "../../../../apps/control-plane-api/src/northbound/policy.ts";
import type { ProblemEnvelope } from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type { ExperienceStreamEvent } from "../../../../packages/generated-models/src/generated/typescript/surface-and-experience.ts";
import { hashTransportResumeToken } from "../../../domain-kernel/src/streaming/stream_recovery.ts";
import type { ExperienceCursorRecord } from "../models/experience_cursor.ts";
import {
  getLatestLowNoiseExperienceFrame,
  LowNoiseExperienceFrameRepository,
  type LowNoiseExperienceFrameRepositoryLike,
  type StoredLowNoiseExperienceFrameRecord,
} from "../query/get_latest_low_noise_experience_frame.ts";
import {
  ExperienceCursorRepository,
  type ExperienceCursorRepositoryLike,
} from "../repositories/experience_cursor_repository.ts";
import {
  ExperienceStreamEventRepository,
  loadManifestCatchUpEvents,
  ManifestCatchUpEventsError,
  type ExperienceStreamEventRepositoryLike,
} from "../services/load_manifest_catch_up_events.ts";
import { buildManifestRouteStabilityContract } from "../services/build_manifest_route_stability_contract.ts";
import { buildManifestStreamRecoveryContract } from "../services/build_manifest_stream_recovery_contract.ts";
import {
  buildManifestStreamProblemEnvelope,
  manifestStreamNoStoreHeaders,
  type ManifestStreamProblemResponse,
} from "../services/build_manifest_stream_problem_envelope.ts";
import { manifestResumeBindingFromActor } from "../services/issue_manifest_resume_token.ts";
import { markExperienceCursorRebasedOrRevoked } from "../services/mark_experience_cursor_rebased_or_revoked.ts";
import {
  OpenExperienceCursorError,
  openOrResumeExperienceCursor,
} from "../services/open_or_resume_experience_cursor.ts";
import {
  validateManifestResumeToken,
  ManifestResumeTokenError,
} from "../services/validate_manifest_resume_token.ts";
import {
  LowNoiseExperiencePublicationError,
  validateLowNoiseExperiencePublication,
} from "../services/validate_low_noise_experience_publication.ts";
import {
  ExperienceStreamEventValidationError,
  serializeExperienceStreamEvent,
} from "../streams/serialize_experience_stream_event.ts";
import { mapStreamRecoveryFailure } from "./stream_recovery_error_mapper.ts";

export type ManifestExperienceStreamReadAuthorization =
  | {
      authorized: true;
      reasonCodes?: string[];
    }
  | {
      authorized: false;
      hidden?: true;
      reasonCodes?: string[];
    };

export type ManifestExperienceStreamReadAuthorizer = (input: {
  actorContext: NorthboundActorContext;
  manifestId: string;
  storedFrame: StoredLowNoiseExperienceFrameRecord | null;
}) =>
  | ManifestExperienceStreamReadAuthorization
  | Promise<ManifestExperienceStreamReadAuthorization>;

export type GetManifestExperienceStreamEndpointRequest = {
  actorContext: NorthboundActorContext;
  correlationId?: string;
  cursorExpiresAt?: string;
  includeHeartbeat?: boolean;
  initialLastAckSequence?: number;
  lastEventId?: string | null;
  manifestId?: string;
  method?: string;
  now?: string;
  path?: string;
  resumeToken?: string | null;
  schemaCompatibilityRef?: string;
};

export type GetManifestExperienceStreamEndpointResponse =
  | {
      body: string;
      cursor: ExperienceCursorRecord;
      events: ExperienceStreamEvent[];
      headers: typeof manifestExperienceStreamHeaders;
      status: 200;
    }
  | {
      body: ProblemEnvelope;
      headers: ManifestStreamProblemResponse["headers"];
      status: number;
    };

export type GetManifestExperienceStreamEndpointDependencies = {
  authorizeRead?: ManifestExperienceStreamReadAuthorizer;
  experienceCursorRepository: ExperienceCursorRepositoryLike;
  experienceStreamEventRepository: ExperienceStreamEventRepositoryLike;
  lowNoiseExperienceFrameRepository: LowNoiseExperienceFrameRepositoryLike;
};

export const manifestExperienceStreamHeaders = {
  ...manifestStreamNoStoreHeaders,
  "Content-Type": "text/event-stream",
  "X-Accel-Buffering": "no",
} as const;

const manifestStreamPathPrefix = "/v1/manifests/";
const manifestStreamPathSuffix = "/experience/stream";

function correlationId(request: GetManifestExperienceStreamEndpointRequest) {
  return request.correlationId ?? `corr.${Date.now()}`;
}

function requestNow(request: GetManifestExperienceStreamEndpointRequest) {
  return request.now ?? new Date().toISOString();
}

function pathUrl(path: string) {
  try {
    return new URL(path, "http://taxat.local");
  } catch {
    return null;
  }
}

function manifestIdFromPath(path: string) {
  const url = pathUrl(path);
  if (url === null) {
    return null;
  }
  if (
    !url.pathname.startsWith(manifestStreamPathPrefix) ||
    !url.pathname.endsWith(manifestStreamPathSuffix)
  ) {
    return null;
  }
  const encoded = url.pathname.slice(
    manifestStreamPathPrefix.length,
    url.pathname.length - manifestStreamPathSuffix.length,
  );
  if (encoded.length === 0 || encoded.includes("/")) {
    return null;
  }
  try {
    const manifestId = decodeURIComponent(encoded);
    return manifestId.length > 0 ? manifestId : null;
  } catch {
    return null;
  }
}

function resumeTokenFromPath(path: string | undefined) {
  if (path === undefined) {
    return null;
  }
  const url = pathUrl(path);
  return url?.searchParams.get("resume_token") ?? null;
}

function resolveManifestId(request: GetManifestExperienceStreamEndpointRequest) {
  const pathManifestId =
    request.path === undefined ? undefined : manifestIdFromPath(request.path);
  if (request.path !== undefined && pathManifestId === null) {
    return null;
  }
  if (
    request.manifestId !== undefined &&
    pathManifestId !== undefined &&
    request.manifestId !== pathManifestId
  ) {
    return null;
  }
  return request.manifestId ?? pathManifestId ?? null;
}

function resolveResumeToken(request: GetManifestExperienceStreamEndpointRequest) {
  return request.resumeToken ?? resumeTokenFromPath(request.path) ?? null;
}

async function authorize(input: {
  dependencies: GetManifestExperienceStreamEndpointDependencies;
  manifestId: string;
  request: GetManifestExperienceStreamEndpointRequest;
  storedFrame: StoredLowNoiseExperienceFrameRecord | null;
}) {
  const authorizer =
    input.dependencies.authorizeRead ??
    (() =>
      ({
        authorized: true,
        reasonCodes: ["MANIFEST_EXPERIENCE_STREAM_READ_AUTHORIZED"],
      }) satisfies ManifestExperienceStreamReadAuthorization);
  return authorizer({
    actorContext: input.request.actorContext,
    manifestId: input.manifestId,
    storedFrame: input.storedFrame,
  });
}

function publicationGeneration(storedFrame: StoredLowNoiseExperienceFrameRecord) {
  const generation = storedFrame.record.stability_contract?.publication_generation;
  if (!Number.isInteger(generation) || generation < 0) {
    throw new LowNoiseExperiencePublicationError(
      "low-noise frame stability contract does not publish a valid generation",
      ["LOW_NOISE_PUBLICATION_GENERATION_INVALID"],
    );
  }
  return generation;
}

function rebaseStaleGuardValue(
  reasonCodes: string[],
  storedFrame: StoredLowNoiseExperienceFrameRecord,
) {
  if (reasonCodes.includes("SHELL_STABILITY_CHANGED")) {
    return {
      family: "SHELL_STABILITY_TOKEN" as const,
      value: storedFrame.shell_stability_token,
    };
  }
  return {
    family: "FRAME_EPOCH" as const,
    value: storedFrame.frame_epoch,
  };
}

function problemForOpenError(input: {
  correlationId: string;
  error: OpenExperienceCursorError;
  manifestId: string;
  storedFrame: StoredLowNoiseExperienceFrameRecord;
}) {
  if (input.error.kind === "ACCESS_REBIND_REQUIRED") {
    return mapStreamRecoveryFailure({
      correlationId: input.correlationId,
      failureKind: "ACCESS_REBIND_REQUIRED",
      frameEpoch: input.storedFrame.frame_epoch,
      latestDecisionBundleRef: input.storedFrame.record.decision_bundle_ref,
      manifestId: input.manifestId,
      reasonCodes: input.error.reasonCodes,
      scope: "MANIFEST_EXPERIENCE",
      shellStabilityToken: input.storedFrame.shell_stability_token,
    });
  }
  const staleGuard = rebaseStaleGuardValue(input.error.reasonCodes, input.storedFrame);
  return mapStreamRecoveryFailure({
    correlationId: input.correlationId,
    failureKind: "REBASE_REQUIRED",
    frameEpoch: input.storedFrame.frame_epoch,
    latestDecisionBundleRef: input.storedFrame.record.decision_bundle_ref,
    latestResumeToken: input.storedFrame.record.resume_token,
    latestStabilityContract: input.storedFrame.record.stability_contract,
    manifestId: input.manifestId,
    reasonCodes: input.error.reasonCodes,
    scope: "MANIFEST_EXPERIENCE",
    shellStabilityToken:
      staleGuard.family === "SHELL_STABILITY_TOKEN"
        ? String(staleGuard.value)
        : input.storedFrame.shell_stability_token,
  });
}

function heartbeatEvent(input: {
  cursor: ExperienceCursorRecord;
  now: string;
  resumeToken: string;
}): ExperienceStreamEvent {
  const recovery = input.cursor.stream_recovery_contract;
  return {
    artifact_type: "ExperienceStreamEvent",
    delta_ref: null,
    event_type: "heartbeat",
    experience_sequence: input.cursor.last_ack_sequence,
    frame_epoch: input.cursor.frame_epoch,
    manifest_id: input.cursor.manifest_id,
    occurred_at: input.now,
    resume_token: input.resumeToken,
    shell_route_key: input.cursor.shell_route_key,
    shell_stability_token: input.cursor.shell_stability_token,
    snapshot_ref: null,
    stability_contract: input.cursor.stability_contract as ExperienceStreamEvent["stability_contract"],
    stream_recovery_contract: buildManifestStreamRecoveryContract({
      accessBindingHash: recovery.access_binding_hash,
      compactionFloorSequenceOrNull: recovery.compaction_floor_sequence_or_null,
      frameEpoch: input.cursor.frame_epoch,
      lastPublishedSequence: recovery.last_published_sequence,
      manifestId: input.cursor.manifest_id,
      maskingContextHash: recovery.masking_context_hash,
      publicationGeneration: recovery.publication_generation,
      resumeToken: input.resumeToken,
      sessionBindingHash: recovery.session_binding_hash,
      sessionRef: recovery.session_ref,
      shellRouteKey: input.cursor.shell_route_key,
      shellStabilityToken: input.cursor.shell_stability_token,
    }),
    stream_scope_class: "MANIFEST_EXPERIENCE",
    terminal_bundle_ref: null,
  };
}

function replacementSnapshotRef(input: {
  cursor: ExperienceCursorRecord;
  storedFrame: StoredLowNoiseExperienceFrameRecord;
}) {
  if (input.storedFrame.frame_ref !== input.cursor.latest_snapshot_ref) {
    return input.storedFrame.frame_ref;
  }
  return `${input.storedFrame.frame_ref}#rebase.catch-up`;
}

export async function getManifestExperienceStreamEndpoint(
  request: GetManifestExperienceStreamEndpointRequest,
  dependencies: GetManifestExperienceStreamEndpointDependencies,
): Promise<GetManifestExperienceStreamEndpointResponse> {
  const requestCorrelationId = correlationId(request);
  const now = requestNow(request);

  if (request.method !== undefined && request.method !== "GET") {
    return buildManifestStreamProblemEnvelope({
      correlationId: requestCorrelationId,
      kind: "METHOD_INVALID",
      manifestId: null,
    });
  }

  const manifestId = resolveManifestId(request);
  if (manifestId === null) {
    return buildManifestStreamProblemEnvelope({
      correlationId: requestCorrelationId,
      kind: "ROUTE_INVALID",
      manifestId: null,
    });
  }
  const resumeToken = resolveResumeToken(request);
  if (resumeToken === null || resumeToken.length === 0) {
    return buildManifestStreamProblemEnvelope({
      correlationId: requestCorrelationId,
      kind: "RESUME_TOKEN_REQUIRED",
      manifestId,
    });
  }

  const storedFrame = await getLatestLowNoiseExperienceFrame({
    lowNoiseExperienceFrameRepository: dependencies.lowNoiseExperienceFrameRepository,
    manifestId,
  });

  const authorization = await authorize({
    dependencies,
    manifestId,
    request,
    storedFrame,
  });
  if (!authorization.authorized) {
    return buildManifestStreamProblemEnvelope({
      correlationId: requestCorrelationId,
      kind: "NOT_READY",
      manifestId,
      reasonCodes: authorization.reasonCodes ?? ["MANIFEST_STREAM_NOT_VISIBLE"],
    });
  }

  if (storedFrame === null) {
    return buildManifestStreamProblemEnvelope({
      correlationId: requestCorrelationId,
      kind: "NOT_READY",
      manifestId,
    });
  }

  try {
    const generation = publicationGeneration(storedFrame);
    const binding = manifestResumeBindingFromActor({
      actorContext: request.actorContext,
      frameEpoch: storedFrame.frame_epoch,
      lastPublishedSequence: storedFrame.last_published_sequence,
      manifestId,
      publicationGeneration: generation,
      schemaCompatibilityRef: request.schemaCompatibilityRef,
      shellRouteKey: storedFrame.record.shell_route_key,
      shellStabilityToken: storedFrame.shell_stability_token,
    });
    const stabilityContract = buildManifestRouteStabilityContract({
      decisionBundleHash: storedFrame.decision_bundle_hash,
      frameEpoch: storedFrame.frame_epoch,
      lastPublishedSequence: storedFrame.last_published_sequence,
      publicationGeneration: generation,
      resumeToken,
      shellStabilityToken: storedFrame.shell_stability_token,
    });
    const streamRecoveryContract = buildManifestStreamRecoveryContract({
      accessBindingHash: binding.accessBindingHash,
      compactionFloorSequenceOrNull:
        storedFrame.record.stream_recovery_contract.compaction_floor_sequence_or_null,
      frameEpoch: storedFrame.frame_epoch,
      lastPublishedSequence: storedFrame.last_published_sequence,
      manifestId,
      maskingContextHash: binding.maskingContextHash,
      publicationGeneration: generation,
      resumeToken,
      sessionBindingHash: binding.sessionBindingHash,
      sessionRef: binding.sessionRef,
      shellRouteKey: storedFrame.record.shell_route_key,
      shellStabilityToken: storedFrame.shell_stability_token,
    });
    const publication = validateLowNoiseExperiencePublication({
      accessBindingHash: binding.accessBindingHash,
      maskingContextHash: binding.maskingContextHash,
      republishedStabilityContract: stabilityContract,
      republishedStreamRecoveryContract: streamRecoveryContract,
      resumeToken,
      sessionBindingHash: binding.sessionBindingHash,
      sessionRef: binding.sessionRef,
      stored: storedFrame,
    });
    const validation = validateManifestResumeToken({
      actorContext: request.actorContext,
      frame: publication.frame,
      manifestId,
      resumeToken,
      schemaCompatibilityRef: request.schemaCompatibilityRef,
      storedFrame,
    });
    let cursor = await openOrResumeExperienceCursor({
      cursorExpiresAt: request.cursorExpiresAt,
      experienceCursorRepository: dependencies.experienceCursorRepository,
      initialLastAckSequence: request.initialLastAckSequence,
      now,
      validation,
    });
    const catchUp = await loadManifestCatchUpEvents({
      cursor,
      eventRepository: dependencies.experienceStreamEventRepository,
    });
    const frames: string[] = [];
    const emittedEvents: ExperienceStreamEvent[] = [];
    for (const event of catchUp.events) {
      frames.push(serializeExperienceStreamEvent(event));
      emittedEvents.push(event);
      cursor = await dependencies.experienceCursorRepository.acknowledgeCursor(
        cursor.cursor_id,
        {
          at: now,
          lastPublishedSequenceOrNull:
            event.stream_recovery_contract.last_published_sequence,
          sequence: event.experience_sequence,
        },
      );
    }

    if (request.includeHeartbeat !== false) {
      const heartbeat = heartbeatEvent({
        cursor,
        now,
        resumeToken,
      });
      frames.push(serializeExperienceStreamEvent(heartbeat));
      emittedEvents.push(heartbeat);
    }

    return {
      body: frames.join("\n"),
      cursor,
      events: emittedEvents,
      headers: manifestExperienceStreamHeaders,
      status: 200,
    };
  } catch (error) {
    if (error instanceof LowNoiseExperiencePublicationError) {
      return buildManifestStreamProblemEnvelope({
        correlationId: requestCorrelationId,
        kind: "CORRUPT",
        manifestId,
        reasonCodes: error.reasonCodes,
      });
    }
    if (error instanceof ManifestResumeTokenError) {
      if (error.kind === "ACCESS_REBIND_REQUIRED") {
        return mapStreamRecoveryFailure({
          correlationId: requestCorrelationId,
          failureKind: "ACCESS_REBIND_REQUIRED",
          frameEpoch: storedFrame.frame_epoch,
          latestDecisionBundleRef: storedFrame.record.decision_bundle_ref,
          manifestId,
          reasonCodes: error.reasonCodes,
          scope: "MANIFEST_EXPERIENCE",
          shellStabilityToken: storedFrame.shell_stability_token,
        });
      }
      if (error.kind === "RESUME_TOKEN_REQUIRED") {
        return buildManifestStreamProblemEnvelope({
          correlationId: requestCorrelationId,
          kind: "RESUME_TOKEN_REQUIRED",
          manifestId,
          reasonCodes: error.reasonCodes,
        });
      }
      const staleGuard = rebaseStaleGuardValue(error.reasonCodes, storedFrame);
      return mapStreamRecoveryFailure({
        correlationId: requestCorrelationId,
        failureKind: "REBASE_REQUIRED",
        frameEpoch: storedFrame.frame_epoch,
        latestDecisionBundleRef: storedFrame.record.decision_bundle_ref,
        latestResumeToken: storedFrame.record.resume_token,
        latestStabilityContract: storedFrame.record.stability_contract,
        manifestId,
        reasonCodes: error.reasonCodes,
        scope: "MANIFEST_EXPERIENCE",
        shellStabilityToken:
          staleGuard.family === "SHELL_STABILITY_TOKEN"
            ? String(staleGuard.value)
            : storedFrame.shell_stability_token,
      });
    }
    if (error instanceof OpenExperienceCursorError) {
      return problemForOpenError({
        correlationId: requestCorrelationId,
        error,
        manifestId,
        storedFrame,
      });
    }
    if (error instanceof ManifestCatchUpEventsError) {
      const liveCursor = (
        await dependencies.experienceCursorRepository.findLatestCursorByResumeTokenHash(
          hashTransportResumeToken(resumeToken),
        )
      ) ?? null;
      if (liveCursor !== null && liveCursor.cursor_state === "LIVE") {
        await markExperienceCursorRebasedOrRevoked({
          at: now,
          cursor: liveCursor,
          reasonCode: error.reasonCodes.includes("FRAME_EPOCH_ADVANCED")
            ? "FRAME_EPOCH_ADVANCED"
            : "HISTORY_COMPACTED",
          replacementSnapshotRef: replacementSnapshotRef({
            cursor: liveCursor,
            storedFrame,
          }),
          replacementStabilityContractOrNull:
            storedFrame.record.stability_contract as unknown as Record<string, unknown>,
          repository: dependencies.experienceCursorRepository,
        });
      }
      const staleGuard = rebaseStaleGuardValue(error.reasonCodes, storedFrame);
      return mapStreamRecoveryFailure({
        correlationId: requestCorrelationId,
        failureKind: "REBASE_REQUIRED",
        frameEpoch: storedFrame.frame_epoch,
        latestDecisionBundleRef: storedFrame.record.decision_bundle_ref,
        latestResumeToken: storedFrame.record.resume_token,
        latestStabilityContract: storedFrame.record.stability_contract,
        manifestId,
        reasonCodes: error.reasonCodes,
        scope: "MANIFEST_EXPERIENCE",
        shellStabilityToken:
          staleGuard.family === "SHELL_STABILITY_TOKEN"
            ? String(staleGuard.value)
            : storedFrame.shell_stability_token,
      });
    }
    if (error instanceof ExperienceStreamEventValidationError) {
      return buildManifestStreamProblemEnvelope({
        correlationId: requestCorrelationId,
        kind: "CORRUPT",
        manifestId,
        reasonCodes: error.reasonCodes,
      });
    }
    throw error;
  }
}

export function createGetManifestExperienceStreamEndpointDependencies(input: {
  authorizeRead?: ManifestExperienceStreamReadAuthorizer;
  experienceCursorRepository?: ExperienceCursorRepositoryLike;
  experienceStreamEventRepository?: ExperienceStreamEventRepositoryLike;
  lowNoiseExperienceFrameRepository?: LowNoiseExperienceFrameRepositoryLike;
} = {}): GetManifestExperienceStreamEndpointDependencies {
  const dependencies = {
    experienceCursorRepository:
      input.experienceCursorRepository ?? new ExperienceCursorRepository(),
    experienceStreamEventRepository:
      input.experienceStreamEventRepository ?? new ExperienceStreamEventRepository(),
    lowNoiseExperienceFrameRepository:
      input.lowNoiseExperienceFrameRepository ?? new LowNoiseExperienceFrameRepository(),
  } as GetManifestExperienceStreamEndpointDependencies;
  if (input.authorizeRead !== undefined) {
    dependencies.authorizeRead = input.authorizeRead;
  }
  return dependencies;
}
