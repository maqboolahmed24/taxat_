import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { buildNativeCacheHydrationContract as buildSharedNativeCacheHydrationContract } from "../../../backend-recovery/src/services/build_native_cache_hydration_contract.ts";
import {
  hashLiveStreamRecoveryContract,
  hashTransportResumeToken,
} from "../../../domain-kernel/src/streaming/stream_recovery.ts";
import { createExperienceCursor } from "../../../domain-kernel/src/streaming/cursor_store.ts";
import {
  validateExperienceCursorRecord,
  type CursorInvalidationReasonCode,
  type ExperienceCursorRecord,
} from "../models/experience_cursor.ts";
import {
  ExperienceCursorRepository,
  type ExperienceCursorRepositoryLike,
} from "../repositories/experience_cursor_repository.ts";
import type { ValidatedManifestResumeToken } from "./validate_manifest_resume_token.ts";
import { invalidateResumeTokenOnBindingDrift } from "./invalidate_resume_token_on_binding_drift.ts";
import { detectAccessBindingOrMaskingRebindRequirement } from "./detect_access_binding_or_masking_rebind_requirement.ts";

export type OpenExperienceCursorFailureKind =
  | "ACCESS_REBIND_REQUIRED"
  | "REBASE_REQUIRED";

export class OpenExperienceCursorError extends Error {
  readonly kind: OpenExperienceCursorFailureKind;
  readonly cursor: ExperienceCursorRecord | null;
  readonly reasonCodes: string[];

  constructor(input: {
    cursor?: ExperienceCursorRecord | null;
    kind: OpenExperienceCursorFailureKind;
    message: string;
    reasonCodes: string[];
  }) {
    super(input.message);
    this.name = "OpenExperienceCursorError";
    this.cursor = input.cursor ?? null;
    this.kind = input.kind;
    this.reasonCodes = input.reasonCodes;
  }
}

const cursorDefaultTtlMs = 15 * 60 * 1000;

function isoFromMillis(millis: number) {
  return new Date(millis).toISOString();
}

function defaultExpiresAt(now: string) {
  return isoFromMillis(Date.parse(now) + cursorDefaultTtlMs);
}

function readSideTruthBoundaryContract() {
  return {
    artifact_role: "READ_SIDE_PROJECTION",
    authoritative_record_families: [
      "RUN_MANIFEST",
      "GATE_DECISION_RECORD",
      "WORKFLOW_ITEM",
      "AUTHORITY_INTERACTION_RECORD",
      "AUDIT_EVENT",
    ],
    authoritative_source_policy: "MIRROR_DURABLE_COMMAND_RECORDS_ONLY",
    contract_version: "COMMAND_TRUTH_BOUNDARY_V1",
    durable_writeback_policy: "NO_DURABLE_STATE_WRITEBACK",
    observable_projection_families: [],
    projection_input_policy: "NO_PROJECTION_INPUTS",
    recovery_basis_policy: "REBUILD_FROM_DURABLE_RECORDS_ONLY",
  };
}

function frameCacheIsolationContract(validation: ValidatedManifestResumeToken) {
  const value = validation.storedFrame.record["cache_isolation_contract"];
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function buildNativeCacheHydrationContract(input: {
  cursor: ValidatedManifestResumeToken;
  principalClass: string;
  schemaCompatibilityRef: string;
}) {
  const cacheIsolation = frameCacheIsolationContract(input.cursor);
  return buildSharedNativeCacheHydrationContract({
    access_binding_hash_or_null: input.cursor.binding.accessBindingHash,
    canonical_object_ref: input.cursor.frame.manifest_id,
    hydration_scope_class: "EXPERIENCE_CURSOR",
    masking_posture_fingerprint: input.cursor.binding.maskingContextHash,
    principal_class: input.principalClass,
    projection_guard_ref: input.cursor.frame.stability_contract.guard_vector_hash,
    resume_binding_ref_or_null: hashTransportResumeToken(input.cursor.rawResumeToken),
    route_identity_ref: input.cursor.frame.shell_route_key,
    schema_compatibility_ref: input.schemaCompatibilityRef,
    session_binding_hash: input.cursor.binding.sessionBindingHash,
    session_lineage_ref_or_null: input.cursor.binding.sessionRef,
    shell_family: input.cursor.frame.shell_family,
    tenant_id:
      typeof cacheIsolation?.tenant_id === "string"
        ? cacheIsolation.tenant_id
        : input.cursor.actorContext.tenant_id,
  });
}

function replacementSnapshotRef(input: {
  cursor: ExperienceCursorRecord;
  validation: ValidatedManifestResumeToken;
  now: string;
}) {
  if (input.validation.frameRef !== input.cursor.latest_snapshot_ref) {
    return input.validation.frameRef;
  }
  return `${input.validation.frameRef}#rebase.${stableJsonHash({
    cursor_id: input.cursor.cursor_id,
    now: input.now,
  }).slice(0, 12)}`;
}

function assertExistingCursorStillBound(input: {
  cursor: ExperienceCursorRecord;
  validation: ValidatedManifestResumeToken;
}) {
  const cursor = input.cursor;
  const validation = input.validation;
  const accessRebind = detectAccessBindingOrMaskingRebindRequirement({
    current: {
      accessBindingHash: cursor.access_binding_hash,
      maskingContextHash: cursor.masking_posture_hash,
      principalRef: cursor.principal_ref,
      schemaCompatibilityRef: cursor.schema_compatibility_ref,
      sessionBindingHash: cursor.session_binding_hash,
      sessionRef: cursor.session_ref,
      tenantId: cursor.tenant_id,
    },
    expected: {
      accessBindingHash: validation.binding.accessBindingHash,
      maskingContextHash: validation.binding.maskingContextHash,
      principalRef: validation.actorContext.principal_ref,
      schemaCompatibilityRef: validation.binding.schemaCompatibilityRef,
      sessionBindingHash: validation.binding.sessionBindingHash,
      sessionRef: validation.binding.sessionRef,
      tenantId: validation.actorContext.tenant_id,
    },
  });
  if (accessRebind !== null) {
    throw new OpenExperienceCursorError({
      cursor,
      kind: "ACCESS_REBIND_REQUIRED",
      message: "cursor access binding drifted",
      reasonCodes: accessRebind.reasonCodes,
    });
  }
  if (cursor.tenant_id !== validation.actorContext.tenant_id) {
    throw new OpenExperienceCursorError({
      cursor,
      kind: "ACCESS_REBIND_REQUIRED",
      message: "cursor tenant drifted",
      reasonCodes: ["TENANT_SWITCHED"],
    });
  }
  if (cursor.principal_ref !== validation.actorContext.principal_ref) {
    throw new OpenExperienceCursorError({
      cursor,
      kind: "ACCESS_REBIND_REQUIRED",
      message: "cursor principal drifted",
      reasonCodes: ["SESSION_BINDING_CHANGED"],
    });
  }
  if (cursor.session_binding_hash !== validation.binding.sessionBindingHash) {
    throw new OpenExperienceCursorError({
      cursor,
      kind: "ACCESS_REBIND_REQUIRED",
      message: "cursor session binding drifted",
      reasonCodes: ["SESSION_BINDING_CHANGED"],
    });
  }
  if (cursor.access_binding_hash !== validation.binding.accessBindingHash) {
    throw new OpenExperienceCursorError({
      cursor,
      kind: "ACCESS_REBIND_REQUIRED",
      message: "cursor access binding drifted",
      reasonCodes: ["ACCESS_BINDING_CHANGED"],
    });
  }
  if (cursor.masking_posture_hash !== validation.binding.maskingContextHash) {
    throw new OpenExperienceCursorError({
      cursor,
      kind: "ACCESS_REBIND_REQUIRED",
      message: "cursor masking posture drifted",
      reasonCodes: ["MASKING_POSTURE_CHANGED"],
    });
  }
  if (cursor.schema_compatibility_ref !== validation.binding.schemaCompatibilityRef) {
    throw new OpenExperienceCursorError({
      cursor,
      kind: "ACCESS_REBIND_REQUIRED",
      message: "cursor schema compatibility drifted",
      reasonCodes: ["SCHEMA_INCOMPATIBLE"],
    });
  }
  if (
    cursor.manifest_id !== validation.frame.manifest_id ||
    cursor.shell_route_key !== validation.frame.shell_route_key
  ) {
    throw new OpenExperienceCursorError({
      cursor,
      kind: "REBASE_REQUIRED",
      message: "cursor route drifted",
      reasonCodes: ["SHELL_STABILITY_CHANGED"],
    });
  }
  if (cursor.shell_stability_token !== validation.frame.shell_stability_token) {
    throw new OpenExperienceCursorError({
      cursor,
      kind: "REBASE_REQUIRED",
      message: "cursor shell stability token drifted",
      reasonCodes: ["SHELL_STABILITY_CHANGED"],
    });
  }
  if (cursor.frame_epoch !== validation.frame.frame_epoch) {
    throw new OpenExperienceCursorError({
      cursor,
      kind: "REBASE_REQUIRED",
      message: "cursor frame epoch advanced",
      reasonCodes: ["FRAME_EPOCH_ADVANCED"],
    });
  }
  const compactionFloor =
    validation.frame.stream_recovery_contract.compaction_floor_sequence_or_null;
  if (compactionFloor !== null && cursor.last_ack_sequence < compactionFloor) {
    throw new OpenExperienceCursorError({
      cursor,
      kind: "REBASE_REQUIRED",
      message: "cursor fell below compaction floor",
      reasonCodes: ["HISTORY_COMPACTED"],
    });
  }
}

function currentCursorPublication(input: {
  cursor: ExperienceCursorRecord;
  validation: ValidatedManifestResumeToken;
}) {
  return validateExperienceCursorRecord({
    ...input.cursor,
    latest_snapshot_ref: input.validation.frameRef,
    last_published_sequence: input.validation.frame.last_published_sequence,
    stability_contract: input.validation.frame.stability_contract,
    stream_recovery_contract: hashLiveStreamRecoveryContract(
      input.validation.frame.stream_recovery_contract,
      input.validation.rawResumeToken,
    ),
  });
}

async function createNewCursor(input: {
  cursorExpiresAt?: string;
  cursorId?: string;
  initialLastAckSequence: number;
  now: string;
  principalClass: string;
  repository: ExperienceCursorRepositoryLike;
  validation: ValidatedManifestResumeToken;
}) {
  const cursor = createExperienceCursor({
    cursor_id: input.cursorId,
    expires_at: input.cursorExpiresAt ?? defaultExpiresAt(input.now),
    last_ack_sequence: input.initialLastAckSequence,
    latest_snapshot_ref: input.validation.frameRef,
    manifest_id: input.validation.frame.manifest_id,
    masking_posture_hash: input.validation.binding.maskingContextHash,
    native_cache_hydration_contract: buildNativeCacheHydrationContract({
      cursor: input.validation,
      principalClass: input.principalClass,
      schemaCompatibilityRef: input.validation.binding.schemaCompatibilityRef,
    }),
    now: input.now,
    principal_class: input.principalClass,
    principal_ref: input.validation.actorContext.principal_ref,
    raw_resume_token: input.validation.rawResumeToken,
    schema_compatibility_ref: input.validation.binding.schemaCompatibilityRef,
    stability_contract: input.validation.frame.stability_contract,
    stream_recovery_contract: input.validation.frame.stream_recovery_contract,
    tenant_id: input.validation.actorContext.tenant_id,
    truth_boundary_contract: readSideTruthBoundaryContract(),
  });
  return input.repository.saveCursor({ cursor });
}

function successorCursorId(input: {
  existing: ExperienceCursorRecord;
  now: string;
  validation: ValidatedManifestResumeToken;
}) {
  return `${input.existing.cursor_id}.successor.${stableJsonHash({
    now: input.now,
    resume_token_hash: input.validation.resumeTokenHash,
  }).slice(0, 12)}`;
}

export async function openOrResumeExperienceCursor(input: {
  cursorExpiresAt?: string;
  experienceCursorRepository?: ExperienceCursorRepositoryLike;
  initialLastAckSequence?: number;
  now: string;
  principalClass?: string;
  validation: ValidatedManifestResumeToken;
}) {
  const repository = input.experienceCursorRepository ?? new ExperienceCursorRepository();
  const existing = await repository.findLatestCursorByResumeTokenHash(
    input.validation.resumeTokenHash,
  );
  const principalClass =
    input.principalClass ??
    (typeof frameCacheIsolationContract(input.validation)?.principal_class === "string"
      ? (frameCacheIsolationContract(input.validation)?.principal_class as string)
      : null) ??
    "STAFF_FULL";

  if (existing === null) {
    const initialLastAckSequence =
      input.initialLastAckSequence ?? input.validation.frame.last_published_sequence;
    return createNewCursor({
      cursorExpiresAt: input.cursorExpiresAt,
      initialLastAckSequence,
      now: input.now,
      principalClass,
      repository,
      validation: input.validation,
    });
  }

  let current = validateExperienceCursorRecord(existing);
  current = await repository.expireCursorIfNeeded(current.cursor_id, input.now);
  if (current.cursor_state === "EXPIRED") {
    return createNewCursor({
      cursorExpiresAt: input.cursorExpiresAt,
      cursorId: successorCursorId({
        existing: current,
        now: input.now,
        validation: input.validation,
      }),
      initialLastAckSequence: input.validation.frame.last_published_sequence,
      now: input.now,
      principalClass,
      repository,
      validation: input.validation,
    });
  }
  if (current.cursor_state !== "LIVE") {
    return createNewCursor({
      cursorExpiresAt: input.cursorExpiresAt,
      cursorId: successorCursorId({
        existing: current,
        now: input.now,
        validation: input.validation,
      }),
      initialLastAckSequence: input.validation.frame.last_published_sequence,
      now: input.now,
      principalClass,
      repository,
      validation: input.validation,
    });
  }

  try {
    assertExistingCursorStillBound({
      cursor: current,
      validation: input.validation,
    });
  } catch (error) {
    if (error instanceof OpenExperienceCursorError) {
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
          validation: input.validation,
        }),
        latestStabilityContractOrNull:
          input.validation.frame.stability_contract as unknown as Record<string, unknown>,
        reasonCode,
        repository,
      });
      throw new OpenExperienceCursorError({
        cursor: transitioned,
        kind: error.kind,
        message: error.message,
        reasonCodes: error.reasonCodes,
      });
    }
    throw error;
  }

  const refreshed = currentCursorPublication({
    cursor: current,
    validation: input.validation,
  });
  return repository.saveCursor({
    cursor: {
      ...refreshed,
      expires_at: input.cursorExpiresAt ?? refreshed.expires_at,
      last_seen_at: input.now,
    },
  });
}
