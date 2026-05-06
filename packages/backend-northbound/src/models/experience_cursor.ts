import type {
  CursorInvalidationReasonCode,
  ExperienceCursorRecord,
  StreamCursorState,
} from "../../../domain-kernel/src/streaming/cursor_store.ts";

export type {
  CursorInvalidationReasonCode,
  ExperienceCursorRecord,
  StreamCursorState,
};

export class ExperienceCursorValidationError extends Error {
  readonly reasonCodes: string[];

  constructor(message: string, reasonCodes: string[]) {
    super(message);
    this.name = "ExperienceCursorValidationError";
    this.reasonCodes = reasonCodes;
  }
}

const terminalCursorStates = new Set<StreamCursorState>([
  "CLOSED",
  "EXPIRED",
  "REBASED",
  "REVOKED",
]);

const rebaseReasonCodes = new Set<Exclude<CursorInvalidationReasonCode, null>>([
  "FRAME_EPOCH_ADVANCED",
  "HISTORY_COMPACTED",
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
  throw new ExperienceCursorValidationError(message, reasonCodes);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertNonEmptyString(label: string, value: unknown): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    fail(`${label} must be a non-empty string`, ["EXPERIENCE_CURSOR_SCHEMA_INVALID"]);
  }
}

function assertNullableString(label: string, value: unknown): asserts value is string | null {
  if (value !== null && (typeof value !== "string" || value.length === 0)) {
    fail(`${label} must be a non-empty string or null`, [
      "EXPERIENCE_CURSOR_SCHEMA_INVALID",
    ]);
  }
}

function assertNonNegativeInteger(label: string, value: unknown): asserts value is number {
  if (!Number.isInteger(value) || (value as number) < 0) {
    fail(`${label} must be a non-negative integer`, [
      "EXPERIENCE_CURSOR_SCHEMA_INVALID",
    ]);
  }
}

function assertIsoInstant(label: string, value: unknown): asserts value is string {
  assertNonEmptyString(label, value);
  if (!Number.isFinite(Date.parse(value))) {
    fail(`${label} must be a valid ISO instant`, ["EXPERIENCE_CURSOR_SCHEMA_INVALID"]);
  }
}

function instantMillis(label: string, value: string) {
  const millis = Date.parse(value);
  if (!Number.isFinite(millis)) {
    fail(`${label} must be a valid ISO instant`, ["EXPERIENCE_CURSOR_SCHEMA_INVALID"]);
  }
  return millis;
}

function assertRecord(label: string, value: unknown): asserts value is Record<string, unknown> {
  if (!isRecord(value)) {
    fail(`${label} must be an object`, ["EXPERIENCE_CURSOR_SCHEMA_INVALID"]);
  }
}

function assertCursorState(cursor: ExperienceCursorRecord) {
  if (cursor.invalidation_reason_code === null) {
    if (cursor.cursor_state !== "LIVE") {
      fail("live cursor state must be used while invalidation_reason_code is null", [
        "EXPERIENCE_CURSOR_STATE_REASON_DRIFT",
      ]);
    }
  } else if (rebaseReasonCodes.has(cursor.invalidation_reason_code)) {
    if (cursor.cursor_state !== "REBASED") {
      fail("rebase reason codes require a REBASED cursor state", [
        "EXPERIENCE_CURSOR_STATE_REASON_DRIFT",
      ]);
    }
  } else if (revokedReasonCodes.has(cursor.invalidation_reason_code)) {
    if (cursor.cursor_state !== "REVOKED") {
      fail("access or session reason codes require a REVOKED cursor state", [
        "EXPERIENCE_CURSOR_STATE_REASON_DRIFT",
      ]);
    }
  } else if (cursor.invalidation_reason_code === "CURSOR_TTL_ELAPSED") {
    if (cursor.cursor_state !== "EXPIRED") {
      fail("cursor TTL reason requires an EXPIRED cursor state", [
        "EXPERIENCE_CURSOR_STATE_REASON_DRIFT",
      ]);
    }
  } else if (cursor.invalidation_reason_code === "CLIENT_CLOSED") {
    if (cursor.cursor_state !== "CLOSED") {
      fail("client close reason requires a CLOSED cursor state", [
        "EXPERIENCE_CURSOR_STATE_REASON_DRIFT",
      ]);
    }
  } else {
    fail("cursor invalidation reason is not legal for ExperienceCursor", [
      "EXPERIENCE_CURSOR_REASON_INVALID",
    ]);
  }
}

function assertRouteAndRecoveryContracts(cursor: ExperienceCursorRecord) {
  const streamRecovery = cursor.stream_recovery_contract;
  if (streamRecovery.stream_scope_class !== "MANIFEST_EXPERIENCE") {
    fail("cursor stream scope must be MANIFEST_EXPERIENCE", [
      "EXPERIENCE_CURSOR_STREAM_SCOPE_DRIFT",
    ]);
  }
  if (streamRecovery.route_key !== cursor.shell_route_key) {
    fail("cursor stream route key drifted from shell route key", [
      "EXPERIENCE_CURSOR_STREAM_ROUTE_DRIFT",
    ]);
  }
  if (streamRecovery.subject_ref !== cursor.manifest_id) {
    fail("cursor stream subject drifted from manifest id", [
      "EXPERIENCE_CURSOR_STREAM_SUBJECT_DRIFT",
    ]);
  }
  if (streamRecovery.shell_stability_token !== cursor.shell_stability_token) {
    fail("cursor stream shell token drifted", ["EXPERIENCE_CURSOR_STREAM_SHELL_DRIFT"]);
  }
  if (streamRecovery.session_ref !== cursor.session_ref) {
    fail("cursor stream session drifted", ["EXPERIENCE_CURSOR_STREAM_SESSION_DRIFT"]);
  }
  if (streamRecovery.session_binding_hash !== cursor.session_binding_hash) {
    fail("cursor stream session binding drifted", [
      "EXPERIENCE_CURSOR_STREAM_SESSION_BINDING_DRIFT",
    ]);
  }
  if (streamRecovery.access_binding_hash !== cursor.access_binding_hash) {
    fail("cursor stream access binding drifted", [
      "EXPERIENCE_CURSOR_STREAM_ACCESS_BINDING_DRIFT",
    ]);
  }
  if (streamRecovery.masking_context_hash !== cursor.masking_posture_hash) {
    fail("cursor stream masking posture drifted", [
      "EXPERIENCE_CURSOR_STREAM_MASKING_DRIFT",
    ]);
  }
  if (streamRecovery.frame_epoch !== cursor.frame_epoch) {
    fail("cursor stream epoch drifted", ["EXPERIENCE_CURSOR_STREAM_EPOCH_DRIFT"]);
  }
  if (streamRecovery.last_published_sequence !== cursor.last_published_sequence) {
    fail("cursor stream sequence frontier drifted", [
      "EXPERIENCE_CURSOR_STREAM_SEQUENCE_DRIFT",
    ]);
  }
  if (
    streamRecovery.compaction_floor_sequence_or_null !== null &&
    cursor.cursor_state === "LIVE" &&
    cursor.last_ack_sequence < streamRecovery.compaction_floor_sequence_or_null
  ) {
    fail("live cursor fell below the stream compaction floor", [
      "EXPERIENCE_CURSOR_COMPACTION_REBASE_REQUIRED",
    ]);
  }
  if (cursor.cursor_state === "LIVE") {
    if (streamRecovery.delivery_window_state !== "LIVE_RESUMABLE") {
      fail("live cursor requires a live resumable delivery window", [
        "EXPERIENCE_CURSOR_DELIVERY_WINDOW_DRIFT",
      ]);
    }
  }

  const stability = cursor.stability_contract;
  assertRecord("stability_contract", stability);
  if (stability.route_scope_class !== "MANIFEST_EXPERIENCE") {
    fail("cursor stability scope must be MANIFEST_EXPERIENCE", [
      "EXPERIENCE_CURSOR_STABILITY_SCOPE_DRIFT",
    ]);
  }
  if (stability.resume_capability !== "STREAM_RESUMABLE") {
    fail("cursor stability contract must remain stream resumable", [
      "EXPERIENCE_CURSOR_STABILITY_RESUME_DRIFT",
    ]);
  }
  if (stability.last_published_sequence_or_null !== cursor.last_published_sequence) {
    fail("cursor stability sequence frontier drifted", [
      "EXPERIENCE_CURSOR_STABILITY_SEQUENCE_DRIFT",
    ]);
  }
  const guardVector = stability.guard_vector_components;
  assertRecord("stability_contract.guard_vector_components", guardVector);
  if (guardVector.shell_stability_token_or_null !== cursor.shell_stability_token) {
    fail("cursor stability shell token drifted", [
      "EXPERIENCE_CURSOR_STABILITY_SHELL_DRIFT",
    ]);
  }
  if (guardVector.frame_epoch_or_null !== cursor.frame_epoch) {
    fail("cursor stability frame epoch drifted", [
      "EXPERIENCE_CURSOR_STABILITY_EPOCH_DRIFT",
    ]);
  }
}

function assertInvalidationChronology(cursor: ExperienceCursorRecord) {
  const lastSeenAt = instantMillis("last_seen_at", cursor.last_seen_at);
  const expiresAt = instantMillis("expires_at", cursor.expires_at);
  if (cursor.cursor_state === "LIVE") {
    if (
      cursor.replacement_snapshot_ref !== null ||
      cursor.invalidation_reason_code !== null ||
      cursor.invalidated_at !== null ||
      cursor.replacement_stability_contract_or_null !== null
    ) {
      fail("live cursor cannot carry replacement or invalidation fields", [
        "EXPERIENCE_CURSOR_LIVE_TERMINAL_FIELD_DRIFT",
      ]);
    }
    return;
  }

  assertNonEmptyString("invalidated_at", cursor.invalidated_at);
  const invalidatedAt = instantMillis("invalidated_at", cursor.invalidated_at);
  if (invalidatedAt < lastSeenAt) {
    fail("cursor invalidated_at cannot predate last_seen_at", [
      "EXPERIENCE_CURSOR_INVALIDATION_TIME_TRAVEL",
    ]);
  }
  if (cursor.cursor_state === "EXPIRED" && invalidatedAt < expiresAt) {
    fail("expired cursor cannot invalidate before expires_at", [
      "EXPERIENCE_CURSOR_EXPIRED_BEFORE_TTL",
    ]);
  }

  if (cursor.cursor_state === "REBASED") {
    assertNonEmptyString("replacement_snapshot_ref", cursor.replacement_snapshot_ref);
    if (cursor.replacement_snapshot_ref === cursor.latest_snapshot_ref) {
      fail("rebased cursor cannot point back to the stale latest snapshot", [
        "EXPERIENCE_CURSOR_REPLACEMENT_SNAPSHOT_STALE",
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
    fail("only rebased cursors may carry replacement snapshot state", [
      "EXPERIENCE_CURSOR_REPLACEMENT_FIELD_DRIFT",
    ]);
  }
}

export function validateExperienceCursorRecord(cursor: ExperienceCursorRecord) {
  if (cursor.artifact_type !== "ExperienceCursor") {
    fail("cursor artifact_type must be ExperienceCursor", [
      "EXPERIENCE_CURSOR_ARTIFACT_INVALID",
    ]);
  }
  if (cursor.cursor_scope_class !== "MANIFEST_EXPERIENCE") {
    fail("cursor scope must be MANIFEST_EXPERIENCE", [
      "EXPERIENCE_CURSOR_SCOPE_INVALID",
    ]);
  }

  assertNonEmptyString("cursor_id", cursor.cursor_id);
  assertNonEmptyString("tenant_id", cursor.tenant_id);
  assertNonEmptyString("principal_ref", cursor.principal_ref);
  assertNonEmptyString("principal_class", cursor.principal_class);
  assertNonEmptyString("manifest_id", cursor.manifest_id);
  assertNonEmptyString("shell_route_key", cursor.shell_route_key);
  assertNonEmptyString("shell_stability_token", cursor.shell_stability_token);
  assertNonEmptyString("session_ref", cursor.session_ref);
  assertNonEmptyString("session_binding_hash", cursor.session_binding_hash);
  assertNonEmptyString("access_binding_hash", cursor.access_binding_hash);
  assertNonEmptyString("latest_snapshot_ref", cursor.latest_snapshot_ref);
  assertNonEmptyString("resume_token_hash", cursor.resume_token_hash);
  assertNonEmptyString("masking_posture_hash", cursor.masking_posture_hash);
  assertNonEmptyString("schema_compatibility_ref", cursor.schema_compatibility_ref);
  assertNullableString("replacement_snapshot_ref", cursor.replacement_snapshot_ref);
  assertIsoInstant("last_seen_at", cursor.last_seen_at);
  assertIsoInstant("expires_at", cursor.expires_at);
  if (cursor.invalidated_at !== null) {
    assertIsoInstant("invalidated_at", cursor.invalidated_at);
  }
  assertNonNegativeInteger("frame_epoch", cursor.frame_epoch);
  assertNonNegativeInteger("last_ack_sequence", cursor.last_ack_sequence);
  assertNonNegativeInteger("last_published_sequence", cursor.last_published_sequence);
  assertRecord("native_cache_hydration_contract", cursor.native_cache_hydration_contract);
  assertRecord("truth_boundary_contract", cursor.truth_boundary_contract);

  if (cursor.shell_route_key !== cursor.manifest_id) {
    fail("ExperienceCursor shell_route_key must equal manifest_id", [
      "EXPERIENCE_CURSOR_ROUTE_KEY_DRIFT",
    ]);
  }
  if (cursor.last_ack_sequence > cursor.last_published_sequence) {
    fail("last_ack_sequence cannot exceed last_published_sequence", [
      "EXPERIENCE_CURSOR_ACK_EXCEEDS_FRONTIER",
    ]);
  }

  assertCursorState(cursor);
  assertRouteAndRecoveryContracts(cursor);
  assertInvalidationChronology(cursor);
  return cursor;
}

export function assertExperienceCursorCanResume(
  cursor: ExperienceCursorRecord,
  now: string,
) {
  validateExperienceCursorRecord(cursor);
  if (terminalCursorStates.has(cursor.cursor_state)) {
    fail("terminal cursor records cannot resume in place", [
      "EXPERIENCE_CURSOR_TERMINAL",
    ]);
  }
  if (Date.parse(now) > Date.parse(cursor.expires_at)) {
    fail("cursor TTL elapsed", ["EXPERIENCE_CURSOR_TTL_ELAPSED"]);
  }
  return cursor;
}
