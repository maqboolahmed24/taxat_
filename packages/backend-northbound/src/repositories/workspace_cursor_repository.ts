import {
  acknowledgeStreamCursor,
  expireStreamCursorIfNeeded,
  touchStreamCursor,
  transitionStreamCursor,
  type CursorInvalidationReasonCode,
  type StreamCursorState,
  type WorkspaceCursorRecord,
} from "../../../domain-kernel/src/streaming/cursor_store.ts";

export type {
  CursorInvalidationReasonCode,
  StreamCursorState,
  WorkspaceCursorRecord,
};

export type PersistWorkspaceCursorInput = {
  cursor: WorkspaceCursorRecord;
};

export type WorkspaceCursorRepositoryLike = {
  acknowledgeCursor: (
    cursorId: string,
    input: {
      at: string;
      lastPublishedSequenceOrNull?: number | null;
      sequence: number;
    },
  ) => Promise<WorkspaceCursorRecord> | WorkspaceCursorRecord;
  expireCursorIfNeeded: (
    cursorId: string,
    at: string,
  ) => Promise<WorkspaceCursorRecord> | WorkspaceCursorRecord;
  findLatestCursorByResumeTokenHash: (
    resumeTokenHash: string,
  ) => Promise<WorkspaceCursorRecord | null> | WorkspaceCursorRecord | null;
  getCursorById: (
    cursorId: string,
  ) => Promise<WorkspaceCursorRecord | null> | WorkspaceCursorRecord | null;
  listCursors: () => Promise<WorkspaceCursorRecord[]> | WorkspaceCursorRecord[];
  saveCursor: (
    input: PersistWorkspaceCursorInput,
  ) => Promise<WorkspaceCursorRecord> | WorkspaceCursorRecord;
  touchCursor: (
    cursorId: string,
    at: string,
  ) => Promise<WorkspaceCursorRecord> | WorkspaceCursorRecord;
  transitionCursor: (
    cursorId: string,
    input: {
      at: string;
      nextState: Exclude<StreamCursorState, "LIVE">;
      reasonCode: Exclude<CursorInvalidationReasonCode, null>;
      replacementSnapshotRef?: string | null;
      replacementStabilityContractOrNull?: Record<string, unknown> | null;
    },
  ) => Promise<WorkspaceCursorRecord> | WorkspaceCursorRecord;
};

export class WorkspaceCursorValidationError extends Error {
  readonly reasonCodes: string[];

  constructor(message: string, reasonCodes: string[]) {
    super(message);
    this.name = "WorkspaceCursorValidationError";
    this.reasonCodes = reasonCodes;
  }
}

const rebaseReasonCodes = new Set<Exclude<CursorInvalidationReasonCode, null>>([
  "FRAME_EPOCH_ADVANCED",
  "HISTORY_COMPACTED",
  "ROUTE_CONTEXT_CHANGED",
  "SHELL_STABILITY_CHANGED",
]);

const revokedReasonCodes = new Set<Exclude<CursorInvalidationReasonCode, null>>([
  "ACCESS_BINDING_CHANGED",
  "MASKING_POSTURE_CHANGED",
  "PRINCIPAL_CLASS_CHANGED",
  "SCHEMA_INCOMPATIBLE",
  "SESSION_BINDING_CHANGED",
  "SESSION_REVOKED",
  "TENANT_SWITCHED",
]);

function fail(message: string, reasonCodes: string[]): never {
  throw new WorkspaceCursorValidationError(message, reasonCodes);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertRecord(label: string, value: unknown): asserts value is Record<string, unknown> {
  if (!isRecord(value)) {
    fail(`${label} must be an object`, ["WORKSPACE_CURSOR_SCHEMA_INVALID"]);
  }
}

function assertNonEmptyString(label: string, value: unknown): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    fail(`${label} must be a non-empty string`, ["WORKSPACE_CURSOR_SCHEMA_INVALID"]);
  }
}

function assertNullableString(label: string, value: unknown): asserts value is string | null {
  if (value !== null && (typeof value !== "string" || value.length === 0)) {
    fail(`${label} must be a non-empty string or null`, [
      "WORKSPACE_CURSOR_SCHEMA_INVALID",
    ]);
  }
}

function assertNonNegativeInteger(label: string, value: unknown): asserts value is number {
  if (!Number.isInteger(value) || (value as number) < 0) {
    fail(`${label} must be a non-negative integer`, [
      "WORKSPACE_CURSOR_SCHEMA_INVALID",
    ]);
  }
}

function assertIsoInstant(label: string, value: unknown): asserts value is string {
  assertNonEmptyString(label, value);
  if (!Number.isFinite(Date.parse(value))) {
    fail(`${label} must be a valid ISO instant`, ["WORKSPACE_CURSOR_SCHEMA_INVALID"]);
  }
}

function assertCursorState(cursor: WorkspaceCursorRecord) {
  if (cursor.invalidation_reason_code === null) {
    if (cursor.cursor_state !== "LIVE") {
      fail("live workspace cursors require a null invalidation reason", [
        "WORKSPACE_CURSOR_STATE_REASON_DRIFT",
      ]);
    }
    return;
  }
  if (rebaseReasonCodes.has(cursor.invalidation_reason_code)) {
    if (cursor.cursor_state !== "REBASED") {
      fail("workspace rebase reason codes require REBASED cursor state", [
        "WORKSPACE_CURSOR_STATE_REASON_DRIFT",
      ]);
    }
    return;
  }
  if (revokedReasonCodes.has(cursor.invalidation_reason_code)) {
    if (cursor.cursor_state !== "REVOKED") {
      fail("workspace access reason codes require REVOKED cursor state", [
        "WORKSPACE_CURSOR_STATE_REASON_DRIFT",
      ]);
    }
    return;
  }
  if (cursor.invalidation_reason_code === "CURSOR_TTL_ELAPSED") {
    if (cursor.cursor_state !== "EXPIRED") {
      fail("workspace TTL reason requires EXPIRED cursor state", [
        "WORKSPACE_CURSOR_STATE_REASON_DRIFT",
      ]);
    }
    return;
  }
  if (cursor.invalidation_reason_code === "CLIENT_CLOSED") {
    if (cursor.cursor_state !== "CLOSED") {
      fail("workspace client close reason requires CLOSED cursor state", [
        "WORKSPACE_CURSOR_STATE_REASON_DRIFT",
      ]);
    }
    return;
  }
  fail("cursor invalidation reason is not legal for WorkspaceCursor", [
    "WORKSPACE_CURSOR_REASON_INVALID",
  ]);
}

function assertRouteAndRecoveryContracts(cursor: WorkspaceCursorRecord) {
  const recovery = cursor.stream_recovery_contract;
  if (recovery.stream_scope_class !== "WORKSPACE") {
    fail("workspace cursor stream scope must be WORKSPACE", [
      "WORKSPACE_CURSOR_STREAM_SCOPE_DRIFT",
    ]);
  }
  if (recovery.route_key !== cursor.workspace_route_key) {
    fail("workspace cursor route key drifted", [
      "WORKSPACE_CURSOR_STREAM_ROUTE_DRIFT",
    ]);
  }
  if (recovery.subject_ref !== cursor.item_id) {
    fail("workspace cursor subject drifted", [
      "WORKSPACE_CURSOR_STREAM_SUBJECT_DRIFT",
    ]);
  }
  if (
    recovery.shell_stability_token !== cursor.shell_stability_token ||
    recovery.session_ref !== cursor.session_ref ||
    recovery.session_binding_hash !== cursor.session_binding_hash ||
    recovery.access_binding_hash !== cursor.access_binding_hash ||
    recovery.masking_context_hash !== cursor.masking_posture_fingerprint ||
    recovery.frame_epoch !== cursor.frame_epoch ||
    recovery.last_published_sequence !== cursor.last_published_sequence
  ) {
    fail("workspace cursor recovery contract drifted from cursor fields", [
      "WORKSPACE_CURSOR_STREAM_RECOVERY_DRIFT",
    ]);
  }
  if (
    recovery.compaction_floor_sequence_or_null !== null &&
    cursor.cursor_state === "LIVE" &&
    cursor.last_ack_sequence < recovery.compaction_floor_sequence_or_null
  ) {
    fail("live workspace cursor fell below the compaction floor", [
      "WORKSPACE_CURSOR_COMPACTION_REBASE_REQUIRED",
    ]);
  }

  const stability = cursor.stability_contract;
  assertRecord("stability_contract", stability);
  if (stability.route_scope_class !== "WORKSPACE") {
    fail("workspace cursor stability scope drifted", [
      "WORKSPACE_CURSOR_STABILITY_SCOPE_DRIFT",
    ]);
  }
  if (stability.resume_capability !== "STREAM_RESUMABLE") {
    fail("workspace cursor stability resume capability drifted", [
      "WORKSPACE_CURSOR_STABILITY_RESUME_DRIFT",
    ]);
  }
  if (stability.last_published_sequence_or_null !== cursor.last_published_sequence) {
    fail("workspace cursor stability sequence frontier drifted", [
      "WORKSPACE_CURSOR_STABILITY_SEQUENCE_DRIFT",
    ]);
  }
  const guardVector = stability.guard_vector_components;
  assertRecord("stability_contract.guard_vector_components", guardVector);
  if (
    guardVector.shell_stability_token_or_null !== cursor.shell_stability_token ||
    guardVector.frame_epoch_or_null !== cursor.frame_epoch ||
    guardVector.work_item_version_or_null !== cursor.workspace_version ||
    guardVector.customer_thread_head_or_null !== cursor.customer_head_sequence ||
    guardVector.internal_thread_head_or_null !== cursor.internal_head_sequence_or_null ||
    guardVector.request_state_version_or_null !== cursor.request_state_version_or_null
  ) {
    fail("workspace cursor stability guard vector drifted", [
      "WORKSPACE_CURSOR_STABILITY_GUARD_DRIFT",
    ]);
  }
}

function assertInvalidationChronology(cursor: WorkspaceCursorRecord) {
  const lastSeenAt = Date.parse(cursor.last_seen_at);
  const expiresAt = Date.parse(cursor.expires_at);
  if (cursor.cursor_state === "LIVE") {
    if (
      cursor.replacement_snapshot_ref !== null ||
      cursor.invalidation_reason_code !== null ||
      cursor.invalidated_at !== null ||
      cursor.replacement_stability_contract_or_null !== null
    ) {
      fail("live workspace cursor cannot carry terminal replacement fields", [
        "WORKSPACE_CURSOR_LIVE_TERMINAL_FIELD_DRIFT",
      ]);
    }
    return;
  }

  assertNonEmptyString("invalidated_at", cursor.invalidated_at);
  const invalidatedAt = Date.parse(cursor.invalidated_at);
  if (invalidatedAt < lastSeenAt) {
    fail("workspace cursor invalidated_at cannot predate last_seen_at", [
      "WORKSPACE_CURSOR_INVALIDATION_TIME_TRAVEL",
    ]);
  }
  if (cursor.cursor_state === "EXPIRED" && invalidatedAt < expiresAt) {
    fail("expired workspace cursor cannot invalidate before expires_at", [
      "WORKSPACE_CURSOR_EXPIRED_BEFORE_TTL",
    ]);
  }
  if (cursor.cursor_state === "REBASED") {
    assertNonEmptyString("replacement_snapshot_ref", cursor.replacement_snapshot_ref);
    if (cursor.replacement_snapshot_ref === cursor.latest_snapshot_ref) {
      fail("rebased workspace cursor cannot point back to the stale snapshot", [
        "WORKSPACE_CURSOR_REPLACEMENT_SNAPSHOT_STALE",
      ]);
    }
    assertRecord(
      "replacement_stability_contract_or_null",
      cursor.replacement_stability_contract_or_null,
    );
    return;
  }
  if (
    cursor.replacement_snapshot_ref !== null ||
    cursor.replacement_stability_contract_or_null !== null
  ) {
    fail("only rebased workspace cursors may carry replacement snapshot state", [
      "WORKSPACE_CURSOR_REPLACEMENT_FIELD_DRIFT",
    ]);
  }
}

export function validateWorkspaceCursorRecord(cursor: WorkspaceCursorRecord) {
  if (cursor.artifact_type !== "WorkspaceCursor") {
    fail("cursor artifact_type must be WorkspaceCursor", [
      "WORKSPACE_CURSOR_ARTIFACT_INVALID",
    ]);
  }
  if (cursor.cursor_scope_class !== "WORKSPACE") {
    fail("cursor scope must be WORKSPACE", ["WORKSPACE_CURSOR_SCOPE_INVALID"]);
  }
  assertNonEmptyString("cursor_id", cursor.cursor_id);
  assertNonEmptyString("tenant_id", cursor.tenant_id);
  assertNonEmptyString("principal_ref", cursor.principal_ref);
  assertNonEmptyString("principal_class", cursor.principal_class);
  assertNonEmptyString("item_id", cursor.item_id);
  assertNonEmptyString("workspace_route_key", cursor.workspace_route_key);
  assertNonEmptyString("session_visibility_class", cursor.session_visibility_class);
  assertNonEmptyString("shell_stability_token", cursor.shell_stability_token);
  assertNonEmptyString("session_ref", cursor.session_ref);
  assertNonEmptyString("session_binding_hash", cursor.session_binding_hash);
  assertNonEmptyString("access_binding_hash", cursor.access_binding_hash);
  assertNonEmptyString("masking_posture_fingerprint", cursor.masking_posture_fingerprint);
  assertNonEmptyString("latest_snapshot_ref", cursor.latest_snapshot_ref);
  assertNonEmptyString("resume_token_hash", cursor.resume_token_hash);
  assertNonEmptyString("schema_compatibility_ref", cursor.schema_compatibility_ref);
  assertNullableString("replacement_snapshot_ref", cursor.replacement_snapshot_ref);
  assertIsoInstant("last_seen_at", cursor.last_seen_at);
  assertIsoInstant("expires_at", cursor.expires_at);
  if (cursor.invalidated_at !== null) {
    assertIsoInstant("invalidated_at", cursor.invalidated_at);
  }
  assertNonNegativeInteger("frame_epoch", cursor.frame_epoch);
  assertNonNegativeInteger("workspace_version", cursor.workspace_version);
  assertNonNegativeInteger("customer_head_sequence", cursor.customer_head_sequence);
  if (cursor.internal_head_sequence_or_null !== null) {
    assertNonNegativeInteger(
      "internal_head_sequence_or_null",
      cursor.internal_head_sequence_or_null,
    );
  }
  if (cursor.request_state_version_or_null !== null) {
    assertNonNegativeInteger(
      "request_state_version_or_null",
      cursor.request_state_version_or_null,
    );
  }
  assertNonNegativeInteger("last_ack_sequence", cursor.last_ack_sequence);
  assertNonNegativeInteger("last_published_sequence", cursor.last_published_sequence);
  assertRecord("native_cache_hydration_contract", cursor.native_cache_hydration_contract);
  if (
    cursor.session_visibility_class === "CUSTOMER_VISIBLE" &&
    cursor.internal_head_sequence_or_null !== null
  ) {
    fail("customer workspace cursors must clear internal head sequence", [
      "WORKSPACE_CURSOR_CUSTOMER_INTERNAL_HEAD_LEAK",
    ]);
  }
  if (cursor.last_ack_sequence > cursor.last_published_sequence) {
    fail("last_ack_sequence cannot exceed last_published_sequence", [
      "WORKSPACE_CURSOR_ACK_EXCEEDS_FRONTIER",
    ]);
  }
  assertCursorState(cursor);
  assertRouteAndRecoveryContracts(cursor);
  assertInvalidationChronology(cursor);
  return cursor;
}

function cursorSortTime(cursor: WorkspaceCursorRecord) {
  const lastSeen = Date.parse(cursor.last_seen_at);
  return Number.isFinite(lastSeen) ? lastSeen : 0;
}

export class WorkspaceCursorRepository implements WorkspaceCursorRepositoryLike {
  readonly #cursorsById = new Map<string, WorkspaceCursorRecord>();

  acknowledgeCursor(
    cursorId: string,
    input: {
      at: string;
      lastPublishedSequenceOrNull?: number | null;
      sequence: number;
    },
  ) {
    const existing = this.#cursorsById.get(cursorId) ?? null;
    if (existing === null) {
      throw new Error(`missing workspace cursor ${cursorId}`);
    }
    const cursor = acknowledgeStreamCursor(existing, {
      at: input.at,
      last_published_sequence_or_null: input.lastPublishedSequenceOrNull ?? null,
      sequence: input.sequence,
    }) as WorkspaceCursorRecord;
    this.#cursorsById.set(cursor.cursor_id, validateWorkspaceCursorRecord(cursor));
    return cursor;
  }

  expireCursorIfNeeded(cursorId: string, at: string) {
    const existing = this.#cursorsById.get(cursorId) ?? null;
    if (existing === null) {
      throw new Error(`missing workspace cursor ${cursorId}`);
    }
    const cursor = expireStreamCursorIfNeeded(existing, at) as WorkspaceCursorRecord;
    this.#cursorsById.set(cursor.cursor_id, validateWorkspaceCursorRecord(cursor));
    return cursor;
  }

  findLatestCursorByResumeTokenHash(resumeTokenHash: string) {
    const matching = [...this.#cursorsById.values()].filter(
      (cursor) => cursor.resume_token_hash === resumeTokenHash,
    );
    return matching.sort((left, right) => cursorSortTime(left) - cursorSortTime(right)).at(-1) ?? null;
  }

  getCursorById(cursorId: string) {
    return this.#cursorsById.get(cursorId) ?? null;
  }

  listCursors() {
    return [...this.#cursorsById.values()];
  }

  saveCursor(input: PersistWorkspaceCursorInput) {
    const cursor = validateWorkspaceCursorRecord(input.cursor);
    this.#cursorsById.set(cursor.cursor_id, cursor);
    return cursor;
  }

  touchCursor(cursorId: string, at: string) {
    const existing = this.#cursorsById.get(cursorId) ?? null;
    if (existing === null) {
      throw new Error(`missing workspace cursor ${cursorId}`);
    }
    const cursor = touchStreamCursor(existing, at) as WorkspaceCursorRecord;
    this.#cursorsById.set(cursor.cursor_id, validateWorkspaceCursorRecord(cursor));
    return cursor;
  }

  transitionCursor(
    cursorId: string,
    input: {
      at: string;
      nextState: Exclude<StreamCursorState, "LIVE">;
      reasonCode: Exclude<CursorInvalidationReasonCode, null>;
      replacementSnapshotRef?: string | null;
      replacementStabilityContractOrNull?: Record<string, unknown> | null;
    },
  ) {
    const existing = this.#cursorsById.get(cursorId) ?? null;
    if (existing === null) {
      throw new Error(`missing workspace cursor ${cursorId}`);
    }
    const cursor = transitionStreamCursor(existing, {
      at: input.at,
      next_state: input.nextState,
      reason_code: input.reasonCode,
      replacement_snapshot_ref: input.replacementSnapshotRef ?? null,
      replacement_stability_contract_or_null:
        input.replacementStabilityContractOrNull ?? null,
    }) as WorkspaceCursorRecord;
    this.#cursorsById.set(cursor.cursor_id, validateWorkspaceCursorRecord(cursor));
    return cursor;
  }
}
