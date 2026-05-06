import type { StreamRecoveryContract } from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import { stableJsonHash } from "../primitives/hash.ts";
import {
  type ISO8601DateTimeString,
  normalizeUtcInstantString,
  parseUtcInstant,
} from "../primitives/time.ts";
import { createStreamRecoveryContract, hashTransportResumeToken } from "./stream_recovery.ts";

export type StreamCursorState = "LIVE" | "REBASED" | "CLOSED" | "REVOKED" | "EXPIRED";
export type CursorInvalidationReasonCode =
  | "FRAME_EPOCH_ADVANCED"
  | "HISTORY_COMPACTED"
  | "SHELL_STABILITY_CHANGED"
  | "ROUTE_CONTEXT_CHANGED"
  | "SESSION_REVOKED"
  | "SESSION_BINDING_CHANGED"
  | "ACCESS_BINDING_CHANGED"
  | "MASKING_POSTURE_CHANGED"
  | "SCHEMA_INCOMPATIBLE"
  | "TENANT_SWITCHED"
  | "PRINCIPAL_CLASS_CHANGED"
  | "CURSOR_TTL_ELAPSED"
  | "CLIENT_CLOSED"
  | null;

export type ExperienceCursorRecord = {
  artifact_type: "ExperienceCursor";
  access_binding_hash: string;
  cursor_id: string;
  cursor_scope_class: "MANIFEST_EXPERIENCE";
  expires_at: ISO8601DateTimeString;
  frame_epoch: number;
  invalidated_at: ISO8601DateTimeString | null;
  invalidation_reason_code: CursorInvalidationReasonCode;
  last_ack_sequence: number;
  last_published_sequence: number;
  last_seen_at: ISO8601DateTimeString;
  latest_snapshot_ref: string;
  masking_posture_hash: string;
  manifest_id: string;
  native_cache_hydration_contract: Record<string, unknown>;
  principal_class: string;
  principal_ref: string;
  replacement_snapshot_ref: string | null;
  replacement_stability_contract_or_null: Record<string, unknown> | null;
  resume_token_hash: string;
  schema_compatibility_ref: string;
  session_binding_hash: string;
  session_ref: string;
  shell_route_key: string;
  shell_stability_token: string;
  stability_contract: Record<string, unknown>;
  stream_recovery_contract: StreamRecoveryContract;
  tenant_id: string;
  truth_boundary_contract: Record<string, unknown>;
  cursor_state: StreamCursorState;
};

export type WorkspaceCursorRecord = {
  access_binding_hash: string;
  artifact_type: "WorkspaceCursor";
  cursor_id: string;
  cursor_scope_class: "WORKSPACE";
  cursor_state: StreamCursorState;
  customer_head_sequence: number;
  expires_at: ISO8601DateTimeString;
  frame_epoch: number;
  internal_head_sequence_or_null: number | null;
  invalidated_at: ISO8601DateTimeString | null;
  invalidation_reason_code: CursorInvalidationReasonCode;
  item_id: string;
  last_ack_sequence: number;
  last_published_sequence: number;
  last_seen_at: ISO8601DateTimeString;
  latest_snapshot_ref: string;
  masking_posture_fingerprint: string;
  native_cache_hydration_contract: Record<string, unknown>;
  principal_class: string;
  principal_ref: string;
  replacement_snapshot_ref: string | null;
  replacement_stability_contract_or_null: Record<string, unknown> | null;
  request_state_version_or_null: number | null;
  resume_token_hash: string;
  schema_compatibility_ref: string;
  session_binding_hash: string;
  session_ref: string;
  session_visibility_class: "STAFF_FULL" | "CUSTOMER_VISIBLE";
  shell_stability_token: string;
  stability_contract: Record<string, unknown>;
  stream_recovery_contract: StreamRecoveryContract;
  tenant_id: string;
  workspace_route_key: string;
  workspace_version: number;
};

export type StreamCursorRecord = ExperienceCursorRecord | WorkspaceCursorRecord;

function streamRecoveryReasonForCursorReason(
  reasonCode: Exclude<CursorInvalidationReasonCode, null>,
): StreamRecoveryContract["rebase_reason_code_or_null"] {
  if (
    reasonCode === "ACCESS_BINDING_CHANGED" ||
    reasonCode === "MASKING_POSTURE_CHANGED" ||
    reasonCode === "SCHEMA_INCOMPATIBLE" ||
    reasonCode === "SESSION_BINDING_CHANGED"
  ) {
    return reasonCode;
  }
  if (
    reasonCode === "PRINCIPAL_CLASS_CHANGED" ||
    reasonCode === "SESSION_REVOKED" ||
    reasonCode === "TENANT_SWITCHED"
  ) {
    return "SESSION_BINDING_CHANGED";
  }
  if (
    reasonCode === "FRAME_EPOCH_ADVANCED" ||
    reasonCode === "HISTORY_COMPACTED" ||
    reasonCode === "ROUTE_CONTEXT_CHANGED" ||
    reasonCode === "SHELL_STABILITY_CHANGED"
  ) {
    return reasonCode;
  }
  return null;
}

function deliveryWindowStateForCursorState(
  cursorState: Exclude<StreamCursorState, "LIVE">,
): StreamRecoveryContract["delivery_window_state"] {
  if (cursorState === "REBASED") {
    return "REBASE_REQUIRED";
  }
  if (cursorState === "REVOKED") {
    return "ACCESS_REBIND_REQUIRED";
  }
  return "SNAPSHOT_ONLY";
}

function compactedFloorForTransition(input: {
  cursor: StreamCursorRecord;
  reasonCode: Exclude<CursorInvalidationReasonCode, null>;
}) {
  const existingFloor = input.cursor.stream_recovery_contract.compaction_floor_sequence_or_null;
  if (input.reasonCode !== "HISTORY_COMPACTED" || existingFloor !== null) {
    return existingFloor;
  }
  return Math.min(input.cursor.last_published_sequence, input.cursor.last_ack_sequence + 1);
}

function cursorStreamRecoveryContract(input: {
  base: StreamRecoveryContract;
  deliveryWindowState: StreamRecoveryContract["delivery_window_state"];
  lastPublishedSequence: number;
  reasonCode: StreamRecoveryContract["rebase_reason_code_or_null"];
  resumeBindingRefOrNull: string | null;
}) {
  return createStreamRecoveryContract({
    access_binding_hash: input.base.access_binding_hash,
    compaction_floor_sequence_or_null: input.base.compaction_floor_sequence_or_null,
    delivery_window_state: input.deliveryWindowState,
    frame_epoch: input.base.frame_epoch,
    last_published_sequence: input.lastPublishedSequence,
    masking_context_hash: input.base.masking_context_hash,
    publication_generation: input.base.publication_generation,
    rebase_reason_code_or_null: input.reasonCode,
    resume_binding_ref_or_null: input.resumeBindingRefOrNull,
    resume_binding_representation: "HASHED_TOKEN",
    route_key: input.base.route_key,
    session_binding_hash: input.base.session_binding_hash,
    session_ref: input.base.session_ref,
    shell_stability_token: input.base.shell_stability_token,
    stream_scope_class: input.base.stream_scope_class,
    subject_ref: input.base.subject_ref,
  });
}

function liveCursorStreamRecoveryContract(base: StreamRecoveryContract, rawResumeToken: string) {
  return cursorStreamRecoveryContract({
    base,
    deliveryWindowState: "LIVE_RESUMABLE",
    lastPublishedSequence: base.last_published_sequence,
    reasonCode: null,
    resumeBindingRefOrNull: hashTransportResumeToken(rawResumeToken),
  });
}

function transitionedCursorStreamRecoveryContract(input: {
  cursor: StreamCursorRecord;
  nextState: Exclude<StreamCursorState, "LIVE">;
  reasonCode: Exclude<CursorInvalidationReasonCode, null>;
}) {
  const deliveryWindowState = deliveryWindowStateForCursorState(input.nextState);
  const reasonCode =
    deliveryWindowState === "SNAPSHOT_ONLY"
      ? null
      : streamRecoveryReasonForCursorReason(input.reasonCode);
  return createStreamRecoveryContract({
    access_binding_hash: input.cursor.stream_recovery_contract.access_binding_hash,
    compaction_floor_sequence_or_null: compactedFloorForTransition({
      cursor: input.cursor,
      reasonCode: input.reasonCode,
    }),
    delivery_window_state: deliveryWindowState,
    frame_epoch: input.cursor.stream_recovery_contract.frame_epoch,
    last_published_sequence: input.cursor.last_published_sequence,
    masking_context_hash: input.cursor.stream_recovery_contract.masking_context_hash,
    publication_generation: input.cursor.stream_recovery_contract.publication_generation,
    rebase_reason_code_or_null: reasonCode,
    resume_binding_ref_or_null: null,
    resume_binding_representation: "HASHED_TOKEN",
    route_key: input.cursor.stream_recovery_contract.route_key,
    session_binding_hash: input.cursor.stream_recovery_contract.session_binding_hash,
    session_ref: input.cursor.stream_recovery_contract.session_ref,
    shell_stability_token: input.cursor.stream_recovery_contract.shell_stability_token,
    stream_scope_class: input.cursor.stream_recovery_contract.stream_scope_class,
    subject_ref: input.cursor.stream_recovery_contract.subject_ref,
  });
}

function nativeHydrationWithoutResumeBinding(value: Record<string, unknown>) {
  return {
    ...value,
    resume_binding_ref_or_null: null,
  };
}

export type CursorStatePolicy = {
  basis_statement: string;
  contract_version: "STREAM_CURSOR_STATE_POLICY_V1";
  policy_id: string;
  state_rows: Array<{
    allowed_next_states: StreamCursorState[];
    cursor_state: StreamCursorState;
    heartbeat_posture: "TOUCH_LAST_SEEN_ONLY" | "IGNORE";
    mutable_fields: string[];
    notes: string[];
    terminal_state: boolean;
  }>;
  source_lineage: Array<{
    rationale: string;
    source_file: string;
    source_heading_or_logical_block: string;
  }>;
};

type CursorStoreErrorInit = {
  code:
    | "CURSOR_NOT_FOUND"
    | "CURSOR_STATE_INVALID"
    | "CURSOR_TTL_ELAPSED"
    | "POLICY_VALIDATION_FAILED";
  detail: string;
};

export class CursorStoreError extends Error {
  readonly code: CursorStoreErrorInit["code"];

  constructor(init: CursorStoreErrorInit) {
    super(`${init.code}: ${init.detail}`);
    this.name = "CursorStoreError";
    this.code = init.code;
  }
}

const stateRows: CursorStatePolicy["state_rows"] = [
  {
    allowed_next_states: ["REBASED", "REVOKED", "EXPIRED", "CLOSED"],
    cursor_state: "LIVE",
    heartbeat_posture: "TOUCH_LAST_SEEN_ONLY",
    mutable_fields: ["last_ack_sequence", "last_published_sequence", "last_seen_at", "expires_at"],
    notes: ["Active cursors accept monotonic acknowledgements and liveness touches only."],
    terminal_state: false,
  },
  {
    allowed_next_states: ["REVOKED", "EXPIRED", "CLOSED"],
    cursor_state: "REBASED",
    heartbeat_posture: "IGNORE",
    mutable_fields: ["replacement_snapshot_ref", "replacement_stability_contract_or_null"],
    notes: ["Rebased cursors may advertise replacement material but cannot resume live delivery."],
    terminal_state: false,
  },
  {
    allowed_next_states: [],
    cursor_state: "REVOKED",
    heartbeat_posture: "IGNORE",
    mutable_fields: [],
    notes: ["Revoked cursors are terminal and require a fresh bind."],
    terminal_state: true,
  },
  {
    allowed_next_states: [],
    cursor_state: "EXPIRED",
    heartbeat_posture: "IGNORE",
    mutable_fields: [],
    notes: ["Expired cursors are terminal and may only be replaced."],
    terminal_state: true,
  },
  {
    allowed_next_states: [],
    cursor_state: "CLOSED",
    heartbeat_posture: "IGNORE",
    mutable_fields: [],
    notes: ["Client-closed cursors never reopen in place."],
    terminal_state: true,
  },
];

export const cursorStatePolicy: CursorStatePolicy = {
  basis_statement:
    "Cursor state is durable recovery posture. Resume is legal only while LIVE and before TTL or explicit invalidation.",
  contract_version: "STREAM_CURSOR_STATE_POLICY_V1",
  policy_id: "stream-cursor-state-policy",
  state_rows: stateRows,
  source_lineage: [
    {
      rationale:
        "Captures the state progression required by the stream recovery and cursor schemas without allowing silent reopen or stateful heuristics.",
      source_file: "Algorithm/schemas/experience_cursor.schema.json",
      source_heading_or_logical_block: "cursor_state and invalidation fields",
    },
  ],
};

function assertCondition(condition: unknown, init: CursorStoreErrorInit): asserts condition {
  if (!condition) {
    throw new CursorStoreError(init);
  }
}

function cursorStateRow(cursorState: StreamCursorState) {
  const row = stateRows.find((entry) => entry.cursor_state === cursorState) ?? null;
  assertCondition(row !== null, {
    code: "POLICY_VALIDATION_FAILED",
    detail: `missing cursor state policy row ${cursorState}`,
  });
  return row;
}

function assertTransitionAllowed(current: StreamCursorState, next: StreamCursorState) {
  const row = cursorStateRow(current);
  assertCondition(row.allowed_next_states.includes(next), {
    code: "CURSOR_STATE_INVALID",
    detail: `cursor state transition ${current} -> ${next} is not allowed`,
  });
}

export function deriveStreamCursorId(input: {
  principal_ref: string;
  session_ref: string;
  stream_recovery_contract: StreamRecoveryContract;
}) {
  return `cursor.stream.${stableJsonHash({
    principal_ref: input.principal_ref,
    session_ref: input.session_ref,
    stream_recovery_contract: input.stream_recovery_contract,
  }).slice(0, 24)}`;
}

export function createExperienceCursor(input: {
  cursor_id?: string;
  expires_at: ISO8601DateTimeString;
  last_ack_sequence: number;
  latest_snapshot_ref: string;
  manifest_id: string;
  masking_posture_hash: string;
  native_cache_hydration_contract: Record<string, unknown>;
  now: ISO8601DateTimeString;
  principal_class: string;
  principal_ref: string;
  raw_resume_token: string;
  schema_compatibility_ref: string;
  stability_contract: Record<string, unknown>;
  stream_recovery_contract: StreamRecoveryContract;
  tenant_id: string;
  truth_boundary_contract: Record<string, unknown>;
}) {
  const now = normalizeUtcInstantString(input.now);
  const expiresAt = normalizeUtcInstantString(input.expires_at);
  return {
    access_binding_hash: input.stream_recovery_contract.access_binding_hash,
    artifact_type: "ExperienceCursor",
    cursor_id:
      input.cursor_id ??
      deriveStreamCursorId({
        principal_ref: input.principal_ref,
        session_ref: input.stream_recovery_contract.session_ref,
        stream_recovery_contract: input.stream_recovery_contract,
      }),
    cursor_scope_class: "MANIFEST_EXPERIENCE",
    cursor_state: "LIVE",
    expires_at: expiresAt,
    frame_epoch: input.stream_recovery_contract.frame_epoch,
    invalidated_at: null,
    invalidation_reason_code: null,
    last_ack_sequence: input.last_ack_sequence,
    last_published_sequence: input.stream_recovery_contract.last_published_sequence,
    last_seen_at: now,
    latest_snapshot_ref: input.latest_snapshot_ref,
    manifest_id: input.manifest_id,
    masking_posture_hash: input.masking_posture_hash,
    native_cache_hydration_contract: input.native_cache_hydration_contract,
    principal_class: input.principal_class,
    principal_ref: input.principal_ref,
    replacement_snapshot_ref: null,
    replacement_stability_contract_or_null: null,
    resume_token_hash: hashTransportResumeToken(input.raw_resume_token),
    schema_compatibility_ref: input.schema_compatibility_ref,
    session_binding_hash: input.stream_recovery_contract.session_binding_hash,
    session_ref: input.stream_recovery_contract.session_ref,
    shell_route_key: input.stream_recovery_contract.route_key,
    shell_stability_token: input.stream_recovery_contract.shell_stability_token,
    stability_contract: input.stability_contract,
    stream_recovery_contract: liveCursorStreamRecoveryContract(
      input.stream_recovery_contract,
      input.raw_resume_token,
    ),
    tenant_id: input.tenant_id,
    truth_boundary_contract: input.truth_boundary_contract,
  } satisfies ExperienceCursorRecord;
}

export function createWorkspaceCursor(input: {
  cursor_id?: string;
  customer_head_sequence: number;
  expires_at: ISO8601DateTimeString;
  internal_head_sequence_or_null: number | null;
  item_id: string;
  last_ack_sequence: number;
  latest_snapshot_ref: string;
  masking_posture_fingerprint: string;
  native_cache_hydration_contract: Record<string, unknown>;
  now: ISO8601DateTimeString;
  principal_class: string;
  principal_ref: string;
  raw_resume_token: string;
  request_state_version_or_null: number | null;
  schema_compatibility_ref: string;
  session_visibility_class: "STAFF_FULL" | "CUSTOMER_VISIBLE";
  stability_contract: Record<string, unknown>;
  stream_recovery_contract: StreamRecoveryContract;
  tenant_id: string;
  workspace_version: number;
}) {
  const now = normalizeUtcInstantString(input.now);
  const expiresAt = normalizeUtcInstantString(input.expires_at);
  return {
    access_binding_hash: input.stream_recovery_contract.access_binding_hash,
    artifact_type: "WorkspaceCursor",
    cursor_id:
      input.cursor_id ??
      deriveStreamCursorId({
        principal_ref: input.principal_ref,
        session_ref: input.stream_recovery_contract.session_ref,
        stream_recovery_contract: input.stream_recovery_contract,
      }),
    cursor_scope_class: "WORKSPACE",
    cursor_state: "LIVE",
    customer_head_sequence: input.customer_head_sequence,
    expires_at: expiresAt,
    frame_epoch: input.stream_recovery_contract.frame_epoch,
    internal_head_sequence_or_null: input.internal_head_sequence_or_null,
    invalidated_at: null,
    invalidation_reason_code: null,
    item_id: input.item_id,
    last_ack_sequence: input.last_ack_sequence,
    last_published_sequence: input.stream_recovery_contract.last_published_sequence,
    last_seen_at: now,
    latest_snapshot_ref: input.latest_snapshot_ref,
    masking_posture_fingerprint: input.masking_posture_fingerprint,
    native_cache_hydration_contract: input.native_cache_hydration_contract,
    principal_class: input.principal_class,
    principal_ref: input.principal_ref,
    replacement_snapshot_ref: null,
    replacement_stability_contract_or_null: null,
    request_state_version_or_null: input.request_state_version_or_null,
    resume_token_hash: hashTransportResumeToken(input.raw_resume_token),
    schema_compatibility_ref: input.schema_compatibility_ref,
    session_binding_hash: input.stream_recovery_contract.session_binding_hash,
    session_ref: input.stream_recovery_contract.session_ref,
    session_visibility_class: input.session_visibility_class,
    shell_stability_token: input.stream_recovery_contract.shell_stability_token,
    stability_contract: input.stability_contract,
    stream_recovery_contract: liveCursorStreamRecoveryContract(
      input.stream_recovery_contract,
      input.raw_resume_token,
    ),
    tenant_id: input.tenant_id,
    workspace_route_key: input.stream_recovery_contract.route_key,
    workspace_version: input.workspace_version,
  } satisfies WorkspaceCursorRecord;
}

export function touchStreamCursor(cursor: StreamCursorRecord, at: ISO8601DateTimeString) {
  if (cursor.cursor_state !== "LIVE") {
    return cursor;
  }
  return {
    ...cursor,
    last_seen_at: normalizeUtcInstantString(at),
  } satisfies StreamCursorRecord;
}

export function acknowledgeStreamCursor(
  cursor: StreamCursorRecord,
  input: {
    at: ISO8601DateTimeString;
    last_published_sequence_or_null?: number | null;
    sequence: number;
  },
) {
  const at = normalizeUtcInstantString(input.at);
  assertCondition(cursor.cursor_state === "LIVE", {
    code: "CURSOR_STATE_INVALID",
    detail: "only live cursors may accept acknowledgements",
  });
  assertCondition(input.sequence >= cursor.last_ack_sequence, {
    code: "CURSOR_STATE_INVALID",
    detail: "cursor acknowledgements must remain monotonic",
  });
  return {
    ...cursor,
    last_ack_sequence: input.sequence,
    last_published_sequence:
      input.last_published_sequence_or_null === undefined ||
      input.last_published_sequence_or_null === null
        ? cursor.last_published_sequence
        : Math.max(cursor.last_published_sequence, input.last_published_sequence_or_null),
    last_seen_at: at,
  } satisfies StreamCursorRecord;
}

export function transitionStreamCursor(
  cursor: StreamCursorRecord,
  input: {
    at: ISO8601DateTimeString;
    next_state: Exclude<StreamCursorState, "LIVE">;
    reason_code: Exclude<CursorInvalidationReasonCode, null>;
    replacement_snapshot_ref?: string | null;
    replacement_stability_contract_or_null?: Record<string, unknown> | null;
  },
) {
  assertTransitionAllowed(cursor.cursor_state, input.next_state);
  return {
    ...cursor,
    cursor_state: input.next_state,
    invalidated_at: normalizeUtcInstantString(input.at),
    invalidation_reason_code: input.reason_code,
    native_cache_hydration_contract: nativeHydrationWithoutResumeBinding(
      cursor.native_cache_hydration_contract,
    ),
    replacement_snapshot_ref: input.replacement_snapshot_ref ?? cursor.replacement_snapshot_ref,
    replacement_stability_contract_or_null:
      input.replacement_stability_contract_or_null ?? cursor.replacement_stability_contract_or_null,
    stream_recovery_contract: transitionedCursorStreamRecoveryContract({
      cursor,
      nextState: input.next_state,
      reasonCode: input.reason_code,
    }),
  } satisfies StreamCursorRecord;
}

export function expireStreamCursorIfNeeded(cursor: StreamCursorRecord, now: ISO8601DateTimeString) {
  if (cursor.cursor_state !== "LIVE") {
    return cursor;
  }
  if (parseUtcInstant(now).valueOf() <= parseUtcInstant(cursor.expires_at).valueOf()) {
    return cursor;
  }
  return transitionStreamCursor(cursor, {
    at: now,
    next_state: "EXPIRED",
    reason_code: "CURSOR_TTL_ELAPSED",
  });
}

export async function createInMemoryStreamCursorStore() {
  const store = new Map<string, StreamCursorRecord>();
  const getRecord = (cursorId: string) => {
    const record = store.get(cursorId) ?? null;
    if (!record) {
      throw new CursorStoreError({
        code: "CURSOR_NOT_FOUND",
        detail: `missing cursor ${cursorId}`,
      });
    }
    return record;
  };

  return {
    get(cursorId: string) {
      return getRecord(cursorId);
    },
    list() {
      return [...store.values()];
    },
    put(cursor: StreamCursorRecord) {
      store.set(cursor.cursor_id, cursor);
      return cursor;
    },
    acknowledge(
      cursorId: string,
      input: {
        at: ISO8601DateTimeString;
        last_published_sequence_or_null?: number | null;
        sequence: number;
      },
    ) {
      const next = acknowledgeStreamCursor(getRecord(cursorId), input);
      store.set(cursorId, next);
      return next;
    },
    touch(cursorId: string, at: ISO8601DateTimeString) {
      const next = touchStreamCursor(getRecord(cursorId), at);
      store.set(cursorId, next);
      return next;
    },
    transition(
      cursorId: string,
      input: {
        at: ISO8601DateTimeString;
        next_state: Exclude<StreamCursorState, "LIVE">;
        reason_code: Exclude<CursorInvalidationReasonCode, null>;
        replacement_snapshot_ref?: string | null;
        replacement_stability_contract_or_null?: Record<string, unknown> | null;
      },
    ) {
      const next = transitionStreamCursor(getRecord(cursorId), input);
      store.set(cursorId, next);
      return next;
    },
    expire(cursorId: string, at: ISO8601DateTimeString) {
      const next = expireStreamCursorIfNeeded(getRecord(cursorId), at);
      store.set(cursorId, next);
      return next;
    },
  };
}
