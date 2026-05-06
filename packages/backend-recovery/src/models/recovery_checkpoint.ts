import { createHash } from "node:crypto";

const INSTANT_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/;

type CanonicalJsonValue =
  | boolean
  | null
  | number
  | string
  | CanonicalJsonValue[]
  | { [key: string]: CanonicalJsonValue };

function appendUnicodeEscape(parts: string[], codePoint: number) {
  if (codePoint <= 0xffff) {
    parts.push(`\\u${codePoint.toString(16).padStart(4, "0")}`);
    return;
  }
  const normalizedCodePoint = codePoint - 0x10000;
  const highSurrogate = 0xd800 + (normalizedCodePoint >> 10);
  const lowSurrogate = 0xdc00 + (normalizedCodePoint & 0x3ff);
  parts.push(`\\u${highSurrogate.toString(16).padStart(4, "0")}`);
  parts.push(`\\u${lowSurrogate.toString(16).padStart(4, "0")}`);
}

function escapeAsciiJsonString(value: string) {
  const parts = ['"'];
  for (const character of value.normalize("NFC")) {
    switch (character) {
      case '"':
        parts.push('\\"');
        continue;
      case "\\":
        parts.push("\\\\");
        continue;
      case "\b":
        parts.push("\\b");
        continue;
      case "\f":
        parts.push("\\f");
        continue;
      case "\n":
        parts.push("\\n");
        continue;
      case "\r":
        parts.push("\\r");
        continue;
      case "\t":
        parts.push("\\t");
        continue;
      default:
        break;
    }
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) {
      continue;
    }
    if (codePoint <= 0x1f || codePoint > 0x7e) {
      appendUnicodeEscape(parts, codePoint);
      continue;
    }
    parts.push(character);
  }
  parts.push('"');
  return parts.join("");
}

function normalizeCanonicalValue(value: unknown): CanonicalJsonValue {
  if (value === null) {
    return null;
  }
  if (typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) {
      throw new RecoveryCheckpointModelError(
        "RECOVERY_CHECKPOINT_FIELD_INVALID",
        "canonical privacy hash input contains an unsupported number",
      );
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeCanonicalValue(entry));
  }
  if (value !== null && typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new RecoveryCheckpointModelError(
        "RECOVERY_CHECKPOINT_FIELD_INVALID",
        "canonical privacy hash input accepts only plain JSON objects",
      );
    }
    const normalizedEntries = new Map<string, CanonicalJsonValue>();
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      const normalizedKey = key.normalize("NFC");
      if (normalizedEntries.has(normalizedKey)) {
        throw new RecoveryCheckpointModelError(
          "RECOVERY_CHECKPOINT_FIELD_INVALID",
          "canonical privacy hash input contains duplicate normalized keys",
        );
      }
      normalizedEntries.set(normalizedKey, normalizeCanonicalValue(entry));
    }
    const normalizedObject: Record<string, CanonicalJsonValue> = {};
    for (const key of [...normalizedEntries.keys()].sort()) {
      normalizedObject[key] = normalizedEntries.get(key)!;
    }
    return normalizedObject;
  }
  throw new RecoveryCheckpointModelError(
    "RECOVERY_CHECKPOINT_FIELD_INVALID",
    "canonical privacy hash input contains a non-JSON value",
  );
}

function serializeCanonicalJson(value: CanonicalJsonValue): string {
  if (value === null) {
    return "null";
  }
  if (typeof value === "string") {
    return escapeAsciiJsonString(value);
  }
  if (typeof value === "number") {
    return JSON.stringify(value);
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => serializeCanonicalJson(entry)).join(",")}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${escapeAsciiJsonString(key)}:${serializeCanonicalJson(value[key]!)}`)
    .join(",")}}`;
}

function stableJsonHash(value: unknown) {
  return createHash("sha256")
    .update(serializeCanonicalJson(normalizeCanonicalValue(value)), "utf8")
    .digest("hex");
}

export function normalizeRecoveryCheckpointInstant(value: unknown) {
  assertCheckpoint(
    typeof value === "string" && INSTANT_PATTERN.test(value),
    "RECOVERY_CHECKPOINT_FIELD_INVALID",
    "instants must be ISO-8601 strings with seconds and timezone",
  );
  const candidate = new Date(value);
  assertCheckpoint(
    !Number.isNaN(candidate.valueOf()),
    "RECOVERY_CHECKPOINT_FIELD_INVALID",
    "instant could not be parsed into a valid UTC-normalized timestamp",
  );
  const iso = candidate.toISOString();
  return iso.endsWith(".000Z") ? iso.replace(".000Z", "Z") : iso;
}

export const RECOVERY_CHECKPOINT_SCHEMA_ID =
  "https://taxat.dev/schemas/recovery_checkpoint.schema.json";
export const RECOVERY_GOVERNANCE_CONTRACT_VERSION = "RECOVERY_GOVERNANCE_V1";
export const RECOVERY_CHECKPOINT_MACHINE_CODE = "RECOVERY_CHECKPOINT_LIFECYCLE_V1";
export const RECOVERY_CHECKPOINT_STATE_FIELD = "checkpoint_state";
export const RECOVERY_CHECKPOINT_INITIAL_EVENT = "checkpoint_requested";
export const RESTORE_PRIVACY_RECONCILIATION_CONTRACT_VERSION =
  "RESTORE_PRIVACY_RECONCILIATION_V1";
export const RESTORE_PRIVACY_RECONCILIATION_SCOPE_POLICY =
  "RESTORE_REQUIRES_PRIVACY_LIMITATION_AND_RE_ERASURE_PROOF";

export const PROTECTED_WORKLOAD_CLASSES = [
  "CONTROL_PLANE_LEGAL_TRUTH",
  "REBUILDABLE_PROJECTION",
  "DISPOSABLE_RUNTIME_CACHE",
] as const;
export type ProtectedWorkloadClass = (typeof PROTECTED_WORKLOAD_CLASSES)[number];

export const RECOVERY_TIER_CLASSES = [
  "TIER_0_CONTROL_PLANE",
  "TIER_1_REBUILDABLE",
  "TIER_2_DISPOSABLE",
] as const;
export type RecoveryTierClass = (typeof RECOVERY_TIER_CLASSES)[number];

export const RPO_CLASSES = ["RPO_15M", "RPO_4H", "RPO_BEST_EFFORT"] as const;
export type RpoClass = (typeof RPO_CLASSES)[number];

export const RTO_CLASSES = ["RTO_60M", "RTO_4H", "RTO_24H"] as const;
export type RtoClass = (typeof RTO_CLASSES)[number];

export const RECOVERY_TIER_BY_PROTECTED_WORKLOAD_CLASS = {
  CONTROL_PLANE_LEGAL_TRUTH: {
    recovery_tier_class: "TIER_0_CONTROL_PLANE",
    rpo_class: "RPO_15M",
    rto_class: "RTO_60M",
  },
  REBUILDABLE_PROJECTION: {
    recovery_tier_class: "TIER_1_REBUILDABLE",
    rpo_class: "RPO_4H",
    rto_class: "RTO_4H",
  },
  DISPOSABLE_RUNTIME_CACHE: {
    recovery_tier_class: "TIER_2_DISPOSABLE",
    rpo_class: "RPO_BEST_EFFORT",
    rto_class: "RTO_24H",
  },
} as const satisfies Record<
  ProtectedWorkloadClass,
  {
    recovery_tier_class: RecoveryTierClass;
    rpo_class: RpoClass;
    rto_class: RtoClass;
  }
>;

export const RECOVERY_CHECKPOINT_STATES = [
  "REQUESTED",
  "CREATED",
  "VERIFIED",
  "QUARANTINED",
  "EXPIRED",
] as const;
export type RecoveryCheckpointState = (typeof RECOVERY_CHECKPOINT_STATES)[number];

export const RECOVERY_CHECKPOINT_TRANSITION_EVENTS = [
  RECOVERY_CHECKPOINT_INITIAL_EVENT,
  "snapshot_complete",
  "restore_drill_passed",
  "restore_drill_failed",
  "privacy_reconciliation_failed",
  "remediation_and_redrill_passed",
  "retention_elapsed",
] as const;
export type RecoveryCheckpointTransitionEventCode =
  (typeof RECOVERY_CHECKPOINT_TRANSITION_EVENTS)[number];

export const RECOVERY_CHECKPOINT_ALLOWED_TRANSITIONS = {
  REQUESTED: {
    snapshot_complete: "CREATED",
  },
  CREATED: {
    restore_drill_passed: "VERIFIED",
    restore_drill_failed: "QUARANTINED",
    retention_elapsed: "EXPIRED",
  },
  VERIFIED: {
    privacy_reconciliation_failed: "QUARANTINED",
    retention_elapsed: "EXPIRED",
  },
  QUARANTINED: {
    remediation_and_redrill_passed: "VERIFIED",
    retention_elapsed: "EXPIRED",
  },
  EXPIRED: {},
} as const satisfies Record<
  RecoveryCheckpointState,
  Partial<Record<RecoveryCheckpointTransitionEventCode, RecoveryCheckpointState>>
>;

export const REOPEN_READINESS_STATES = [
  "BLOCKED_PENDING_CHECKPOINT_CREATION",
  "BLOCKED_PENDING_RESTORE_DRILL",
  "BLOCKED_PENDING_PRIVACY_RECONCILIATION",
  "BLOCKED_PENDING_COMPENSATING_RE_ERASURE",
  "BLOCKED_PENDING_LIMITATION_RECONCILIATION",
  "BLOCKED_LEGAL_HOLD_REVIEW",
  "BLOCKED_PROOF_PRESERVATION_REVIEW",
  "BLOCKED_AUTHORITY_AMBIGUITY_REVIEW",
  "BLOCKED_PENDING_AUDIT_CONTINUITY",
  "BLOCKED_PENDING_QUEUE_REBUILD",
  "BLOCKED_PENDING_AUTHORITY_REVALIDATION",
  "READY_FOR_REOPEN",
  "QUARANTINED",
  "EXPIRED",
] as const;
export type ReopenReadinessState = (typeof REOPEN_READINESS_STATES)[number];

export const RECOVERY_CHECKPOINT_CREATED_READINESS_STATES = [
  "BLOCKED_PENDING_RESTORE_DRILL",
  "BLOCKED_PENDING_PRIVACY_RECONCILIATION",
  "BLOCKED_PENDING_COMPENSATING_RE_ERASURE",
  "BLOCKED_PENDING_LIMITATION_RECONCILIATION",
  "BLOCKED_LEGAL_HOLD_REVIEW",
  "BLOCKED_PROOF_PRESERVATION_REVIEW",
  "BLOCKED_AUTHORITY_AMBIGUITY_REVIEW",
  "BLOCKED_PENDING_AUDIT_CONTINUITY",
  "BLOCKED_PENDING_QUEUE_REBUILD",
  "BLOCKED_PENDING_AUTHORITY_REVALIDATION",
] as const satisfies readonly ReopenReadinessState[];

export const RESTORE_PRIVACY_RECONCILIATION_STATES = [
  "PENDING_RECONCILIATION",
  "RECONCILED_NO_COMPENSATION_REQUIRED",
  "COMPENSATING_RE_ERASURE_REQUIRED",
  "COMPENSATING_RE_ERASURE_IN_PROGRESS",
  "RECONCILED_WITH_COMPENSATING_RE_ERASURE",
  "BLOCKED_LEGAL_HOLD",
  "BLOCKED_PROOF_PRESERVATION",
  "BLOCKED_AUTHORITY_AMBIGUITY",
] as const;
export type RestorePrivacyReconciliationState =
  (typeof RESTORE_PRIVACY_RECONCILIATION_STATES)[number];

export const RESTORE_PRIVACY_RECONCILIATION_FINAL_STATES = [
  "RECONCILED_NO_COMPENSATION_REQUIRED",
  "RECONCILED_WITH_COMPENSATING_RE_ERASURE",
] as const satisfies readonly RestorePrivacyReconciliationState[];

export const RESTORE_PRIVACY_RECONCILIATION_BLOCKED_LIMITED_STATES = [
  "BLOCKED_LEGAL_HOLD",
  "BLOCKED_PROOF_PRESERVATION",
  "BLOCKED_AUTHORITY_AMBIGUITY",
] as const satisfies readonly RestorePrivacyReconciliationState[];

export const RESTORE_PRIVACY_COMPENSATING_STATES = [
  "NOT_REQUIRED",
  "REQUIRED_PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "BLOCKED",
] as const;
export type RestorePrivacyCompensatingState =
  (typeof RESTORE_PRIVACY_COMPENSATING_STATES)[number];

export const RESTORE_PRIVACY_RESURRECTED_POSTURES = [
  "UNKNOWN_UNTIL_RECONCILED",
  "NONE_DETECTED",
  "ERASURE_OR_PSEUDONYMISATION_RESURRECTED",
] as const;
export type RestorePrivacyResurrectedPosture =
  (typeof RESTORE_PRIVACY_RESURRECTED_POSTURES)[number];

export const RESTORE_PRIVACY_AUDIT_CHAIN_STATES = ["VERIFIED", "FAILED"] as const;
export type RestorePrivacyAuditChainState = (typeof RESTORE_PRIVACY_AUDIT_CHAIN_STATES)[number];

export const RESTORE_PRIVACY_LIMITATION_STATES = [
  "VERIFIED",
  "LIMITED_RECONCILED",
  "FAILED",
] as const;
export type RestorePrivacyLimitationState = (typeof RESTORE_PRIVACY_LIMITATION_STATES)[number];

export const RESTORE_PRIVACY_REOPEN_ACCESS_STATES = [
  "BLOCKED",
  "LIMITED",
  "READY_FOR_REOPEN",
] as const;
export type RestorePrivacyReopenAccessState =
  (typeof RESTORE_PRIVACY_REOPEN_ACCESS_STATES)[number];

export const RECOVERY_CHECKPOINT_QUARANTINE_REASON_CODES = [
  "RESTORE_DRILL_FAILED",
  "PRIVACY_RECONCILIATION_FAILED",
  "COMPENSATING_RE_ERASURE_BLOCKED",
  "LEGAL_HOLD_REVIEW_REQUIRED",
  "PROOF_PRESERVATION_REVIEW_REQUIRED",
  "AUTHORITY_AMBIGUITY_REVIEW_REQUIRED",
  "AUDIT_CONTINUITY_FAILED",
  "QUEUE_REBUILD_FAILED",
  "AUTHORITY_REBUILD_FAILED",
  "AUTHORITY_BINDING_REVALIDATION_FAILED",
  "LIMITATION_RECONCILIATION_FAILED",
  "RESTORE_EVIDENCE_LINEAGE_DRIFT",
  "REOPEN_GATE_REGRESSION",
] as const;
export type RecoveryCheckpointQuarantineReasonCode =
  (typeof RECOVERY_CHECKPOINT_QUARANTINE_REASON_CODES)[number];

export type RecoveryGovernanceContract = {
  contract_version: "RECOVERY_GOVERNANCE_V1";
  boundary_scope: "RECOVERY_CHECKPOINT" | "DEPLOYMENT_RELEASE";
  protected_workload_class: ProtectedWorkloadClass;
  recovery_tier_class: RecoveryTierClass;
  rpo_class: RpoClass;
  rto_class: RtoClass;
  boundary_specific_binding_policy:
    | "CHECKPOINT_RETAINS_INVENTORY_RESTORE_EVIDENCE_AND_REOPEN_GATES"
    | "RELEASE_RETAINS_ROLLBACK_BOUNDARY_AND_FAIL_FORWARD_GOVERNANCE";
  checkpoint_inventory_policy: "CHECKPOINTS_REQUIRED_AND_INVENTORY_LINKED";
  checkpoint_evidence_policy: "VERIFIED_CHECKPOINT_REQUIRES_BOUND_RESTORE_DRILL";
  privacy_reconciliation_policy: "POST_RESTORE_PRIVACY_RECONCILIATION_REQUIRED_BEFORE_REOPEN";
  compensating_re_erasure_policy: "RESURRECTED_RESTRICTED_DATA_REQUIRES_TYPED_COMPENSATING_RE_ERASURE";
  limitation_reconciliation_policy: "REPLAY_AND_ENQUIRY_LIMITATIONS_MUST_REMAIN_REOPEN_SAFE";
  queue_recovery_policy: "QUEUES_REBUILT_FROM_DURABLE_TRUTH_ONLY";
  authority_recovery_policy: "AUTHORITY_MUTATIONS_REQUIRE_LINEAGE_AND_BINDING_REVALIDATION";
  reopen_gate_policy: "REOPEN_BLOCKED_UNTIL_RESTORE_PRIVACY_AUDIT_QUEUE_AND_AUTHORITY_PASS";
  rollback_boundary_policy: "ROLLBACK_ONLY_WHILE_SCHEMA_WINDOW_COMPATIBLE";
  fail_forward_policy: "FAIL_FORWARD_REQUIRES_COMPENSATING_RELEASE_AND_OWNER";
  failover_audit_policy: "FAILOVER_AND_FAILBACK_REQUIRE_AUDITABLE_OWNER";
};

export type RecoveryCheckpointStateTransitionContract = {
  contract_version: "STATE_TRANSITION_CONTRACT_V1";
  object_family: "RECOVERY_CHECKPOINT";
  machine_code: "RECOVERY_CHECKPOINT_LIFECYCLE_V1";
  state_field_name: "checkpoint_state";
  current_state: RecoveryCheckpointState;
  previous_state_or_null: RecoveryCheckpointState | null;
  transition_event_code: RecoveryCheckpointTransitionEventCode;
  transition_applied_at: string;
  transition_audit_ref: string;
  transition_application_policy: "NAMED_EVENT_ONLY";
  illegal_transition_policy: "REJECT_WITH_TYPED_REASON_AND_NO_PARTIAL_WRITE";
  concurrency_guard_policy: "COMPARE_AND_SWAP_OR_SINGLE_WRITER_LEASE";
  terminal_reentry_policy: "TERMINAL_STATES_REQUIRE_NEW_LINEAGE";
  recovery_supersession_policy: "RECOVERY_AND_SUPERSESSION_ALLOCATE_SUCCESSOR_OR_SUPERSEDING_LINEAGE";
  audit_evidence_policy: "EVERY_TRANSITION_RETAINS_AUDIT_EVENT_REF";
  typed_rejection_family: "ILLEGAL_STATE_TRANSITION";
};

export type RestorePrivacyReconciliationContract = {
  contract_version: "RESTORE_PRIVACY_RECONCILIATION_V1";
  reconciliation_contract_hash: string;
  checkpoint_ref: string;
  restore_drill_ref: string;
  reconciliation_scope_policy: "RESTORE_REQUIRES_PRIVACY_LIMITATION_AND_RE_ERASURE_PROOF";
  resurrected_data_posture: RestorePrivacyResurrectedPosture;
  resurrected_subject_count_or_null: number | null;
  privacy_reconciliation_state: RestorePrivacyReconciliationState;
  privacy_reconciliation_outcome_ref: string;
  compensating_re_erasure_state: RestorePrivacyCompensatingState;
  compensating_re_erasure_workflow_ref_or_null: string | null;
  compensating_re_erasure_audit_ref_or_null: string | null;
  legal_hold_ref_or_null: string | null;
  proof_preservation_basis_ref_or_null: string | null;
  authority_ambiguity_ref_or_null: string | null;
  audit_chain_continuity_state: RestorePrivacyAuditChainState;
  audit_chain_continuity_ref: string;
  replay_limitation_state: RestorePrivacyLimitationState;
  enquiry_limitation_state: RestorePrivacyLimitationState;
  reopen_access_state: RestorePrivacyReopenAccessState;
  reconciliation_decided_at_or_null: string | null;
  re_erasure_completed_at_or_null: string | null;
};

export type RecoveryCheckpointRecord = {
  checkpoint_id: string;
  datastore_ref: string;
  recovery_governance_contract: RecoveryGovernanceContract;
  backup_ref: string | null;
  checkpoint_inventory_ref: string | null;
  snapshot_time: string | null;
  restore_tested_at: string | null;
  restore_verification_hash: string | null;
  rpo_class: RpoClass;
  rto_class: RtoClass;
  checkpoint_state: RecoveryCheckpointState;
  state_transition_contract: RecoveryCheckpointStateTransitionContract;
  restore_drill_ref: string | null;
  privacy_reconciliation_contract: RestorePrivacyReconciliationContract | null;
  audit_continuity_verified: boolean;
  queue_rebuild_verified: boolean;
  authority_rebuild_verified: boolean;
  authority_binding_revalidation_verified: boolean;
  privacy_reconciliation_outcome_ref: string | null;
  reopen_readiness_state: ReopenReadinessState;
  quarantine_reason_code: RecoveryCheckpointQuarantineReasonCode | null;
};

export type RecoveryCheckpointModelErrorCode =
  | "RECOVERY_CHECKPOINT_CHRONOLOGY_INVALID"
  | "RECOVERY_CHECKPOINT_CONTRACT_INVALID"
  | "RECOVERY_CHECKPOINT_EVIDENCE_INVALID"
  | "RECOVERY_CHECKPOINT_FIELD_INVALID"
  | "RECOVERY_CHECKPOINT_PRIVACY_INVALID"
  | "RECOVERY_CHECKPOINT_QUARANTINE_INVALID"
  | "RECOVERY_CHECKPOINT_REOPEN_INVALID"
  | "RECOVERY_CHECKPOINT_STATE_CONTRACT_MISMATCH"
  | "RECOVERY_CHECKPOINT_TIER_INVALID";

export class RecoveryCheckpointModelError extends Error {
  readonly code: RecoveryCheckpointModelErrorCode;

  constructor(code: RecoveryCheckpointModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "RecoveryCheckpointModelError";
    this.code = code;
  }
}

export class RecoveryCheckpointLifecycleError extends Error {
  readonly code = "RECOVERY_CHECKPOINT_ILLEGAL_TRANSITION" as const;
  readonly current_state: RecoveryCheckpointState;
  readonly event_code: RecoveryCheckpointTransitionEventCode;

  constructor(
    currentState: RecoveryCheckpointState,
    eventCode: RecoveryCheckpointTransitionEventCode,
  ) {
    super(`RECOVERY_CHECKPOINT_ILLEGAL_TRANSITION: ${currentState} cannot handle ${eventCode}`);
    this.name = "RecoveryCheckpointLifecycleError";
    this.current_state = currentState;
    this.event_code = eventCode;
  }
}

function assertCheckpoint(
  condition: unknown,
  code: RecoveryCheckpointModelErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new RecoveryCheckpointModelError(code, detail);
  }
}

function requireObject(label: string, value: unknown): Record<string, unknown> {
  assertCheckpoint(
    value !== null && typeof value === "object" && !Array.isArray(value),
    "RECOVERY_CHECKPOINT_FIELD_INVALID",
    `${label} must be an object`,
  );
  return value as Record<string, unknown>;
}

function assertKnownKeys(label: string, value: unknown, allowedKeys: readonly string[]) {
  const object = requireObject(label, value);
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(object)) {
    assertCheckpoint(
      allowed.has(key),
      "RECOVERY_CHECKPOINT_FIELD_INVALID",
      `${label}.${key} is not allowed by the schema-backed recovery checkpoint contract`,
    );
  }
}

export function requireTrimmedString(label: string, value: unknown) {
  assertCheckpoint(
    typeof value === "string" && value.trim().length > 0,
    "RECOVERY_CHECKPOINT_FIELD_INVALID",
    `${label} must be a non-empty string`,
  );
  return value.trim().normalize("NFC");
}

function requireBoolean(label: string, value: unknown) {
  assertCheckpoint(
    typeof value === "boolean",
    "RECOVERY_CHECKPOINT_FIELD_INVALID",
    `${label} must be a boolean`,
  );
  return value;
}

function requireStringEnum<const T extends readonly string[]>(
  label: string,
  value: unknown,
  allowedValues: T,
): T[number] {
  const normalized = requireTrimmedString(label, value);
  assertCheckpoint(
    new Set<string>(allowedValues).has(normalized),
    "RECOVERY_CHECKPOINT_FIELD_INVALID",
    `${label} must be one of ${allowedValues.join(", ")}`,
  );
  return normalized as T[number];
}

function normalizeOptionalString(label: string, value: string | null) {
  if (value === null) {
    return null;
  }
  return requireTrimmedString(label, value);
}

function normalizeOptionalInstant(label: string, value: string | null) {
  if (value === null) {
    return null;
  }
  return normalizeRecoveryCheckpointInstant(value);
}

function assertInstantNotBefore(input: {
  earlier_label: string;
  earlier: string;
  later_label: string;
  later: string;
}) {
  assertCheckpoint(
    new Date(input.later).valueOf() >= new Date(input.earlier).valueOf(),
    "RECOVERY_CHECKPOINT_CHRONOLOGY_INVALID",
    `${input.later_label} must not be earlier than ${input.earlier_label}`,
  );
}

function isFinalPrivacyState(state: RestorePrivacyReconciliationState | undefined) {
  return new Set<string>(RESTORE_PRIVACY_RECONCILIATION_FINAL_STATES).has(state ?? "");
}

function hasCompleteRestoreEvidence(record: {
  restore_drill_ref: string | null;
  restore_tested_at: string | null;
  restore_verification_hash: string | null;
}) {
  return (
    record.restore_drill_ref !== null &&
    record.restore_tested_at !== null &&
    record.restore_verification_hash !== null
  );
}

function assertNullableStringsCleared(input: {
  label: string;
  values: Array<[string, string | null]>;
}) {
  for (const [field, value] of input.values) {
    assertCheckpoint(
      value === null,
      "RECOVERY_CHECKPOINT_PRIVACY_INVALID",
      `${input.label}.${field} must stay null in this privacy state`,
    );
  }
}

export function getNextRecoveryCheckpointState(
  currentState: RecoveryCheckpointState,
  eventCode: RecoveryCheckpointTransitionEventCode,
) {
  const nextState = (
    RECOVERY_CHECKPOINT_ALLOWED_TRANSITIONS[currentState] as Partial<
      Record<RecoveryCheckpointTransitionEventCode, RecoveryCheckpointState>
    >
  )[eventCode];
  if (!nextState) {
    throw new RecoveryCheckpointLifecycleError(currentState, eventCode);
  }
  return nextState;
}

export function isRecoveryCheckpointTransitionAllowed(
  currentState: RecoveryCheckpointState,
  eventCode: RecoveryCheckpointTransitionEventCode,
) {
  return (
    (
      RECOVERY_CHECKPOINT_ALLOWED_TRANSITIONS[currentState] as Partial<
        Record<RecoveryCheckpointTransitionEventCode, RecoveryCheckpointState>
      >
    )[eventCode] ?? null
  );
}

export function buildRecoveryCheckpointStateTransitionContract(input: {
  current_state: RecoveryCheckpointState;
  previous_state_or_null: RecoveryCheckpointState | null;
  transition_event_code: RecoveryCheckpointTransitionEventCode;
  transition_applied_at: string;
  transition_audit_ref: string;
}): RecoveryCheckpointStateTransitionContract {
  return {
    contract_version: "STATE_TRANSITION_CONTRACT_V1",
    object_family: "RECOVERY_CHECKPOINT",
    machine_code: RECOVERY_CHECKPOINT_MACHINE_CODE,
    state_field_name: RECOVERY_CHECKPOINT_STATE_FIELD,
    current_state: input.current_state,
    previous_state_or_null: input.previous_state_or_null,
    transition_event_code: input.transition_event_code,
    transition_applied_at: normalizeRecoveryCheckpointInstant(input.transition_applied_at),
    transition_audit_ref: requireTrimmedString(
      "recovery_checkpoint.transition_audit_ref",
      input.transition_audit_ref,
    ),
    transition_application_policy: "NAMED_EVENT_ONLY",
    illegal_transition_policy: "REJECT_WITH_TYPED_REASON_AND_NO_PARTIAL_WRITE",
    concurrency_guard_policy: "COMPARE_AND_SWAP_OR_SINGLE_WRITER_LEASE",
    terminal_reentry_policy: "TERMINAL_STATES_REQUIRE_NEW_LINEAGE",
    recovery_supersession_policy:
      "RECOVERY_AND_SUPERSESSION_ALLOCATE_SUCCESSOR_OR_SUPERSEDING_LINEAGE",
    audit_evidence_policy: "EVERY_TRANSITION_RETAINS_AUDIT_EVENT_REF",
    typed_rejection_family: "ILLEGAL_STATE_TRANSITION",
  };
}

function normalizeStateTransitionContract(
  contract: RecoveryCheckpointStateTransitionContract,
  checkpointState: RecoveryCheckpointState,
) {
  assertKnownKeys("state_transition_contract", contract, [
    "contract_version",
    "object_family",
    "machine_code",
    "state_field_name",
    "current_state",
    "previous_state_or_null",
    "transition_event_code",
    "transition_applied_at",
    "transition_audit_ref",
    "transition_application_policy",
    "illegal_transition_policy",
    "concurrency_guard_policy",
    "terminal_reentry_policy",
    "recovery_supersession_policy",
    "audit_evidence_policy",
    "typed_rejection_family",
  ]);
  const currentState = requireStringEnum(
    "state_transition_contract.current_state",
    contract.current_state,
    RECOVERY_CHECKPOINT_STATES,
  );
  const previousState =
    contract.previous_state_or_null === null
      ? null
      : requireStringEnum(
          "state_transition_contract.previous_state_or_null",
          contract.previous_state_or_null,
          RECOVERY_CHECKPOINT_STATES,
        );
  const eventCode = requireStringEnum(
    "state_transition_contract.transition_event_code",
    contract.transition_event_code,
    RECOVERY_CHECKPOINT_TRANSITION_EVENTS,
  );
  assertCheckpoint(
    contract.object_family === "RECOVERY_CHECKPOINT" &&
      contract.machine_code === RECOVERY_CHECKPOINT_MACHINE_CODE &&
      contract.state_field_name === RECOVERY_CHECKPOINT_STATE_FIELD &&
      currentState === checkpointState,
    "RECOVERY_CHECKPOINT_STATE_CONTRACT_MISMATCH",
    "state_transition_contract must bind RECOVERY_CHECKPOINT_LIFECYCLE_V1.checkpoint_state",
  );
  assertCheckpoint(
    contract.contract_version === "STATE_TRANSITION_CONTRACT_V1" &&
      contract.transition_application_policy === "NAMED_EVENT_ONLY" &&
      contract.illegal_transition_policy === "REJECT_WITH_TYPED_REASON_AND_NO_PARTIAL_WRITE" &&
      contract.concurrency_guard_policy === "COMPARE_AND_SWAP_OR_SINGLE_WRITER_LEASE" &&
      contract.terminal_reentry_policy === "TERMINAL_STATES_REQUIRE_NEW_LINEAGE" &&
      contract.recovery_supersession_policy ===
        "RECOVERY_AND_SUPERSESSION_ALLOCATE_SUCCESSOR_OR_SUPERSEDING_LINEAGE" &&
      contract.audit_evidence_policy === "EVERY_TRANSITION_RETAINS_AUDIT_EVENT_REF" &&
      contract.typed_rejection_family === "ILLEGAL_STATE_TRANSITION",
    "RECOVERY_CHECKPOINT_STATE_CONTRACT_MISMATCH",
    "state_transition_contract must retain the shared fail-closed lifecycle policies",
  );
  assertCheckpoint(
    previousState !== currentState,
    "RECOVERY_CHECKPOINT_STATE_CONTRACT_MISMATCH",
    "state_transition_contract.previous_state_or_null must not equal current_state",
  );
  const isInitial =
    previousState === null &&
    currentState === "REQUESTED" &&
    eventCode === RECOVERY_CHECKPOINT_INITIAL_EVENT;
  const isNamed =
    previousState !== null &&
    (
      RECOVERY_CHECKPOINT_ALLOWED_TRANSITIONS[previousState] as Partial<
        Record<RecoveryCheckpointTransitionEventCode, RecoveryCheckpointState>
      >
    )[eventCode] === currentState;
  assertCheckpoint(
    isInitial || isNamed,
    "RECOVERY_CHECKPOINT_STATE_CONTRACT_MISMATCH",
    "state_transition_contract must encode the legal initial checkpoint event or a legal named recovery transition",
  );
  return buildRecoveryCheckpointStateTransitionContract({
    current_state: currentState,
    previous_state_or_null: previousState,
    transition_event_code: eventCode,
    transition_applied_at: contract.transition_applied_at,
    transition_audit_ref: contract.transition_audit_ref,
  });
}

export function normalizeRecoveryGovernanceContract(
  contract: RecoveryGovernanceContract,
  expected?: {
    boundary_scope?: RecoveryGovernanceContract["boundary_scope"];
    rpo_class?: RpoClass;
    rto_class?: RtoClass;
  },
): RecoveryGovernanceContract {
  assertKnownKeys("recovery_governance_contract", contract, [
    "contract_version",
    "boundary_scope",
    "protected_workload_class",
    "recovery_tier_class",
    "rpo_class",
    "rto_class",
    "boundary_specific_binding_policy",
    "checkpoint_inventory_policy",
    "checkpoint_evidence_policy",
    "privacy_reconciliation_policy",
    "compensating_re_erasure_policy",
    "limitation_reconciliation_policy",
    "queue_recovery_policy",
    "authority_recovery_policy",
    "reopen_gate_policy",
    "rollback_boundary_policy",
    "fail_forward_policy",
    "failover_audit_policy",
  ]);
  const protectedWorkloadClass = requireStringEnum(
    "recovery_governance_contract.protected_workload_class",
    contract.protected_workload_class,
    PROTECTED_WORKLOAD_CLASSES,
  );
  const mapping = RECOVERY_TIER_BY_PROTECTED_WORKLOAD_CLASS[protectedWorkloadClass];
  const boundaryScope = requireStringEnum("recovery_governance_contract.boundary_scope", contract.boundary_scope, [
    "RECOVERY_CHECKPOINT",
    "DEPLOYMENT_RELEASE",
  ] as const);
  const recoveryTierClass = requireStringEnum(
    "recovery_governance_contract.recovery_tier_class",
    contract.recovery_tier_class,
    RECOVERY_TIER_CLASSES,
  );
  const rpoClass = requireStringEnum(
    "recovery_governance_contract.rpo_class",
    contract.rpo_class,
    RPO_CLASSES,
  );
  const rtoClass = requireStringEnum(
    "recovery_governance_contract.rto_class",
    contract.rto_class,
    RTO_CLASSES,
  );
  assertCheckpoint(
    contract.contract_version === RECOVERY_GOVERNANCE_CONTRACT_VERSION &&
      contract.checkpoint_inventory_policy === "CHECKPOINTS_REQUIRED_AND_INVENTORY_LINKED" &&
      contract.checkpoint_evidence_policy === "VERIFIED_CHECKPOINT_REQUIRES_BOUND_RESTORE_DRILL" &&
      contract.privacy_reconciliation_policy ===
        "POST_RESTORE_PRIVACY_RECONCILIATION_REQUIRED_BEFORE_REOPEN" &&
      contract.compensating_re_erasure_policy ===
        "RESURRECTED_RESTRICTED_DATA_REQUIRES_TYPED_COMPENSATING_RE_ERASURE" &&
      contract.limitation_reconciliation_policy ===
        "REPLAY_AND_ENQUIRY_LIMITATIONS_MUST_REMAIN_REOPEN_SAFE" &&
      contract.queue_recovery_policy === "QUEUES_REBUILT_FROM_DURABLE_TRUTH_ONLY" &&
      contract.authority_recovery_policy ===
        "AUTHORITY_MUTATIONS_REQUIRE_LINEAGE_AND_BINDING_REVALIDATION" &&
      contract.reopen_gate_policy ===
        "REOPEN_BLOCKED_UNTIL_RESTORE_PRIVACY_AUDIT_QUEUE_AND_AUTHORITY_PASS" &&
      contract.rollback_boundary_policy === "ROLLBACK_ONLY_WHILE_SCHEMA_WINDOW_COMPATIBLE" &&
      contract.fail_forward_policy === "FAIL_FORWARD_REQUIRES_COMPENSATING_RELEASE_AND_OWNER" &&
      contract.failover_audit_policy === "FAILOVER_AND_FAILBACK_REQUIRE_AUDITABLE_OWNER",
    "RECOVERY_CHECKPOINT_CONTRACT_INVALID",
    "recovery_governance_contract must retain the canonical recovery governance policy constants",
  );
  assertCheckpoint(
    recoveryTierClass === mapping.recovery_tier_class &&
      rpoClass === mapping.rpo_class &&
      rtoClass === mapping.rto_class,
    "RECOVERY_CHECKPOINT_TIER_INVALID",
    "recovery_governance_contract cannot serialize a weaker or mismatched tier for protected_workload_class",
  );
  assertCheckpoint(
    expected?.boundary_scope === undefined || boundaryScope === expected.boundary_scope,
    "RECOVERY_CHECKPOINT_CONTRACT_INVALID",
    `recovery_governance_contract.boundary_scope must be ${expected?.boundary_scope}`,
  );
  assertCheckpoint(
    expected?.rpo_class === undefined || rpoClass === expected.rpo_class,
    "RECOVERY_CHECKPOINT_TIER_INVALID",
    "recovery_governance_contract.rpo_class must mirror the checkpoint rpo_class",
  );
  assertCheckpoint(
    expected?.rto_class === undefined || rtoClass === expected.rto_class,
    "RECOVERY_CHECKPOINT_TIER_INVALID",
    "recovery_governance_contract.rto_class must mirror the checkpoint rto_class",
  );
  const expectedBoundaryPolicy =
    boundaryScope === "RECOVERY_CHECKPOINT"
      ? "CHECKPOINT_RETAINS_INVENTORY_RESTORE_EVIDENCE_AND_REOPEN_GATES"
      : "RELEASE_RETAINS_ROLLBACK_BOUNDARY_AND_FAIL_FORWARD_GOVERNANCE";
  assertCheckpoint(
    contract.boundary_specific_binding_policy === expectedBoundaryPolicy,
    "RECOVERY_CHECKPOINT_CONTRACT_INVALID",
    "recovery_governance_contract.boundary_specific_binding_policy must mirror boundary_scope",
  );
  return {
    contract_version: RECOVERY_GOVERNANCE_CONTRACT_VERSION,
    boundary_scope: boundaryScope,
    protected_workload_class: protectedWorkloadClass,
    recovery_tier_class: recoveryTierClass,
    rpo_class: rpoClass,
    rto_class: rtoClass,
    boundary_specific_binding_policy: expectedBoundaryPolicy,
    checkpoint_inventory_policy: "CHECKPOINTS_REQUIRED_AND_INVENTORY_LINKED",
    checkpoint_evidence_policy: "VERIFIED_CHECKPOINT_REQUIRES_BOUND_RESTORE_DRILL",
    privacy_reconciliation_policy: "POST_RESTORE_PRIVACY_RECONCILIATION_REQUIRED_BEFORE_REOPEN",
    compensating_re_erasure_policy:
      "RESURRECTED_RESTRICTED_DATA_REQUIRES_TYPED_COMPENSATING_RE_ERASURE",
    limitation_reconciliation_policy:
      "REPLAY_AND_ENQUIRY_LIMITATIONS_MUST_REMAIN_REOPEN_SAFE",
    queue_recovery_policy: "QUEUES_REBUILT_FROM_DURABLE_TRUTH_ONLY",
    authority_recovery_policy:
      "AUTHORITY_MUTATIONS_REQUIRE_LINEAGE_AND_BINDING_REVALIDATION",
    reopen_gate_policy: "REOPEN_BLOCKED_UNTIL_RESTORE_PRIVACY_AUDIT_QUEUE_AND_AUTHORITY_PASS",
    rollback_boundary_policy: "ROLLBACK_ONLY_WHILE_SCHEMA_WINDOW_COMPATIBLE",
    fail_forward_policy: "FAIL_FORWARD_REQUIRES_COMPENSATING_RELEASE_AND_OWNER",
    failover_audit_policy: "FAILOVER_AND_FAILBACK_REQUIRE_AUDITABLE_OWNER",
  };
}

export function deriveRestorePrivacyReconciliationContractHash(
  contract: RestorePrivacyReconciliationContract,
): string | null {
  const requiredStrings = {
    contract_version: contract.contract_version,
    checkpoint_ref: contract.checkpoint_ref,
    restore_drill_ref: contract.restore_drill_ref,
    reconciliation_scope_policy: contract.reconciliation_scope_policy,
    resurrected_data_posture: contract.resurrected_data_posture,
    privacy_reconciliation_state: contract.privacy_reconciliation_state,
    privacy_reconciliation_outcome_ref: contract.privacy_reconciliation_outcome_ref,
    compensating_re_erasure_state: contract.compensating_re_erasure_state,
    audit_chain_continuity_state: contract.audit_chain_continuity_state,
    audit_chain_continuity_ref: contract.audit_chain_continuity_ref,
    replay_limitation_state: contract.replay_limitation_state,
    enquiry_limitation_state: contract.enquiry_limitation_state,
    reopen_access_state: contract.reopen_access_state,
  };
  for (const value of Object.values(requiredStrings)) {
    if (typeof value !== "string" || value.length === 0) {
      return null;
    }
  }

  const resurrectedSubjectCountOrNull = contract.resurrected_subject_count_or_null;
  if (
    resurrectedSubjectCountOrNull !== null &&
    (!Number.isInteger(resurrectedSubjectCountOrNull) || resurrectedSubjectCountOrNull < 0)
  ) {
    return null;
  }

  const nullableFields = {
    resurrected_subject_count_or_null: resurrectedSubjectCountOrNull,
    compensating_re_erasure_workflow_ref_or_null:
      contract.compensating_re_erasure_workflow_ref_or_null,
    compensating_re_erasure_audit_ref_or_null:
      contract.compensating_re_erasure_audit_ref_or_null,
    legal_hold_ref_or_null: contract.legal_hold_ref_or_null,
    proof_preservation_basis_ref_or_null: contract.proof_preservation_basis_ref_or_null,
    authority_ambiguity_ref_or_null: contract.authority_ambiguity_ref_or_null,
    reconciliation_decided_at_or_null: contract.reconciliation_decided_at_or_null,
    re_erasure_completed_at_or_null: contract.re_erasure_completed_at_or_null,
  };
  for (const value of Object.values(nullableFields)) {
    if (value !== null && (typeof value !== "string" && typeof value !== "number")) {
      return null;
    }
    if (value === "") {
      return null;
    }
  }

  return stableJsonHash({ ...requiredStrings, ...nullableFields });
}

export function normalizeRestorePrivacyReconciliationContract(
  contract: RestorePrivacyReconciliationContract,
  expected?: {
    checkpoint_ref?: string;
    restore_drill_ref?: string;
    privacy_reconciliation_outcome_ref?: string;
  },
): RestorePrivacyReconciliationContract {
  assertKnownKeys("privacy_reconciliation_contract", contract, [
    "contract_version",
    "reconciliation_contract_hash",
    "checkpoint_ref",
    "restore_drill_ref",
    "reconciliation_scope_policy",
    "resurrected_data_posture",
    "resurrected_subject_count_or_null",
    "privacy_reconciliation_state",
    "privacy_reconciliation_outcome_ref",
    "compensating_re_erasure_state",
    "compensating_re_erasure_workflow_ref_or_null",
    "compensating_re_erasure_audit_ref_or_null",
    "legal_hold_ref_or_null",
    "proof_preservation_basis_ref_or_null",
    "authority_ambiguity_ref_or_null",
    "audit_chain_continuity_state",
    "audit_chain_continuity_ref",
    "replay_limitation_state",
    "enquiry_limitation_state",
    "reopen_access_state",
    "reconciliation_decided_at_or_null",
    "re_erasure_completed_at_or_null",
  ]);
  const normalized: RestorePrivacyReconciliationContract = {
    contract_version: "RESTORE_PRIVACY_RECONCILIATION_V1",
    reconciliation_contract_hash: requireTrimmedString(
      "privacy_reconciliation_contract.reconciliation_contract_hash",
      contract.reconciliation_contract_hash,
    ),
    checkpoint_ref: requireTrimmedString(
      "privacy_reconciliation_contract.checkpoint_ref",
      contract.checkpoint_ref,
    ),
    restore_drill_ref: requireTrimmedString(
      "privacy_reconciliation_contract.restore_drill_ref",
      contract.restore_drill_ref,
    ),
    reconciliation_scope_policy: RESTORE_PRIVACY_RECONCILIATION_SCOPE_POLICY,
    resurrected_data_posture: requireStringEnum(
      "privacy_reconciliation_contract.resurrected_data_posture",
      contract.resurrected_data_posture,
      RESTORE_PRIVACY_RESURRECTED_POSTURES,
    ),
    resurrected_subject_count_or_null: contract.resurrected_subject_count_or_null,
    privacy_reconciliation_state: requireStringEnum(
      "privacy_reconciliation_contract.privacy_reconciliation_state",
      contract.privacy_reconciliation_state,
      RESTORE_PRIVACY_RECONCILIATION_STATES,
    ),
    privacy_reconciliation_outcome_ref: requireTrimmedString(
      "privacy_reconciliation_contract.privacy_reconciliation_outcome_ref",
      contract.privacy_reconciliation_outcome_ref,
    ),
    compensating_re_erasure_state: requireStringEnum(
      "privacy_reconciliation_contract.compensating_re_erasure_state",
      contract.compensating_re_erasure_state,
      RESTORE_PRIVACY_COMPENSATING_STATES,
    ),
    compensating_re_erasure_workflow_ref_or_null: normalizeOptionalString(
      "privacy_reconciliation_contract.compensating_re_erasure_workflow_ref_or_null",
      contract.compensating_re_erasure_workflow_ref_or_null,
    ),
    compensating_re_erasure_audit_ref_or_null: normalizeOptionalString(
      "privacy_reconciliation_contract.compensating_re_erasure_audit_ref_or_null",
      contract.compensating_re_erasure_audit_ref_or_null,
    ),
    legal_hold_ref_or_null: normalizeOptionalString(
      "privacy_reconciliation_contract.legal_hold_ref_or_null",
      contract.legal_hold_ref_or_null,
    ),
    proof_preservation_basis_ref_or_null: normalizeOptionalString(
      "privacy_reconciliation_contract.proof_preservation_basis_ref_or_null",
      contract.proof_preservation_basis_ref_or_null,
    ),
    authority_ambiguity_ref_or_null: normalizeOptionalString(
      "privacy_reconciliation_contract.authority_ambiguity_ref_or_null",
      contract.authority_ambiguity_ref_or_null,
    ),
    audit_chain_continuity_state: requireStringEnum(
      "privacy_reconciliation_contract.audit_chain_continuity_state",
      contract.audit_chain_continuity_state,
      RESTORE_PRIVACY_AUDIT_CHAIN_STATES,
    ),
    audit_chain_continuity_ref: requireTrimmedString(
      "privacy_reconciliation_contract.audit_chain_continuity_ref",
      contract.audit_chain_continuity_ref,
    ),
    replay_limitation_state: requireStringEnum(
      "privacy_reconciliation_contract.replay_limitation_state",
      contract.replay_limitation_state,
      RESTORE_PRIVACY_LIMITATION_STATES,
    ),
    enquiry_limitation_state: requireStringEnum(
      "privacy_reconciliation_contract.enquiry_limitation_state",
      contract.enquiry_limitation_state,
      RESTORE_PRIVACY_LIMITATION_STATES,
    ),
    reopen_access_state: requireStringEnum(
      "privacy_reconciliation_contract.reopen_access_state",
      contract.reopen_access_state,
      RESTORE_PRIVACY_REOPEN_ACCESS_STATES,
    ),
    reconciliation_decided_at_or_null: normalizeOptionalInstant(
      "privacy_reconciliation_contract.reconciliation_decided_at_or_null",
      contract.reconciliation_decided_at_or_null,
    ),
    re_erasure_completed_at_or_null: normalizeOptionalInstant(
      "privacy_reconciliation_contract.re_erasure_completed_at_or_null",
      contract.re_erasure_completed_at_or_null,
    ),
  };
  assertCheckpoint(
    contract.contract_version === RESTORE_PRIVACY_RECONCILIATION_CONTRACT_VERSION &&
      contract.reconciliation_scope_policy === RESTORE_PRIVACY_RECONCILIATION_SCOPE_POLICY,
    "RECOVERY_CHECKPOINT_PRIVACY_INVALID",
    "privacy_reconciliation_contract must retain the shared restore privacy contract constants",
  );
  const expectedHash = deriveRestorePrivacyReconciliationContractHash(normalized);
  assertCheckpoint(
    normalized.reconciliation_contract_hash === expectedHash,
    "RECOVERY_CHECKPOINT_PRIVACY_INVALID",
    "privacy_reconciliation_contract.reconciliation_contract_hash must equal the canonical reconciliation hash",
  );
  assertCheckpoint(
    expected?.checkpoint_ref === undefined || normalized.checkpoint_ref === expected.checkpoint_ref,
    "RECOVERY_CHECKPOINT_PRIVACY_INVALID",
    "privacy_reconciliation_contract.checkpoint_ref must mirror the enclosing checkpoint_id",
  );
  assertCheckpoint(
    expected?.restore_drill_ref === undefined ||
      normalized.restore_drill_ref === expected.restore_drill_ref,
    "RECOVERY_CHECKPOINT_PRIVACY_INVALID",
    "privacy_reconciliation_contract.restore_drill_ref must mirror the enclosing restore_drill_ref",
  );
  assertCheckpoint(
    expected?.privacy_reconciliation_outcome_ref === undefined ||
      normalized.privacy_reconciliation_outcome_ref ===
        expected.privacy_reconciliation_outcome_ref,
    "RECOVERY_CHECKPOINT_PRIVACY_INVALID",
    "privacy_reconciliation_contract.privacy_reconciliation_outcome_ref must mirror the enclosing outcome ref",
  );

  const resurrectedCount = normalized.resurrected_subject_count_or_null;
  if (normalized.resurrected_data_posture === "UNKNOWN_UNTIL_RECONCILED") {
    assertCheckpoint(
      resurrectedCount === null,
      "RECOVERY_CHECKPOINT_PRIVACY_INVALID",
      "unknown resurrected-data posture must keep resurrected_subject_count_or_null null",
    );
  }
  if (normalized.resurrected_data_posture === "NONE_DETECTED") {
    assertCheckpoint(
      resurrectedCount === 0,
      "RECOVERY_CHECKPOINT_PRIVACY_INVALID",
      "NONE_DETECTED posture must keep resurrected_subject_count_or_null at 0",
    );
  }
  if (normalized.resurrected_data_posture === "ERASURE_OR_PSEUDONYMISATION_RESURRECTED") {
    assertCheckpoint(
      typeof resurrectedCount === "number" && Number.isInteger(resurrectedCount) && resurrectedCount >= 1,
      "RECOVERY_CHECKPOINT_PRIVACY_INVALID",
      "resurrected restricted data must retain at least one subject count",
    );
  }

  if (normalized.privacy_reconciliation_state === "PENDING_RECONCILIATION") {
    assertCheckpoint(
      normalized.resurrected_data_posture === "UNKNOWN_UNTIL_RECONCILED" &&
        normalized.compensating_re_erasure_state === "NOT_REQUIRED" &&
        normalized.reopen_access_state === "BLOCKED" &&
        normalized.reconciliation_decided_at_or_null === null &&
        normalized.re_erasure_completed_at_or_null === null,
      "RECOVERY_CHECKPOINT_PRIVACY_INVALID",
      "pending restore privacy reconciliation must remain blocked and undecided",
    );
    assertNullableStringsCleared({
      label: "privacy_reconciliation_contract",
      values: [
        [
          "compensating_re_erasure_workflow_ref_or_null",
          normalized.compensating_re_erasure_workflow_ref_or_null,
        ],
        [
          "compensating_re_erasure_audit_ref_or_null",
          normalized.compensating_re_erasure_audit_ref_or_null,
        ],
        ["legal_hold_ref_or_null", normalized.legal_hold_ref_or_null],
        ["proof_preservation_basis_ref_or_null", normalized.proof_preservation_basis_ref_or_null],
        ["authority_ambiguity_ref_or_null", normalized.authority_ambiguity_ref_or_null],
      ],
    });
  }

  if (isFinalPrivacyState(normalized.privacy_reconciliation_state)) {
    assertCheckpoint(
      normalized.audit_chain_continuity_state === "VERIFIED" &&
        normalized.replay_limitation_state === "VERIFIED" &&
        normalized.enquiry_limitation_state === "VERIFIED" &&
        normalized.reopen_access_state === "READY_FOR_REOPEN" &&
        normalized.reconciliation_decided_at_or_null !== null,
      "RECOVERY_CHECKPOINT_PRIVACY_INVALID",
      "final restore privacy reconciliation requires audit, replay, enquiry, and reopen readiness",
    );
  }

  if (normalized.privacy_reconciliation_state === "RECONCILED_NO_COMPENSATION_REQUIRED") {
    assertCheckpoint(
      normalized.resurrected_data_posture === "NONE_DETECTED" &&
        normalized.compensating_re_erasure_state === "NOT_REQUIRED",
      "RECOVERY_CHECKPOINT_PRIVACY_INVALID",
      "clean restore privacy reconciliation must keep no resurrected restricted data",
    );
  }

  if (normalized.privacy_reconciliation_state === "RECONCILED_WITH_COMPENSATING_RE_ERASURE") {
    assertCheckpoint(
      normalized.resurrected_data_posture === "ERASURE_OR_PSEUDONYMISATION_RESURRECTED" &&
        normalized.compensating_re_erasure_state === "COMPLETED" &&
        normalized.re_erasure_completed_at_or_null !== null,
      "RECOVERY_CHECKPOINT_PRIVACY_INVALID",
      "completed compensating re-erasure must retain resurrected posture and completion evidence",
    );
  }

  if (
    normalized.privacy_reconciliation_state === "COMPENSATING_RE_ERASURE_REQUIRED" ||
    normalized.privacy_reconciliation_state === "COMPENSATING_RE_ERASURE_IN_PROGRESS"
  ) {
    const expectedState =
      normalized.privacy_reconciliation_state === "COMPENSATING_RE_ERASURE_REQUIRED"
        ? "REQUIRED_PENDING"
        : "IN_PROGRESS";
    assertCheckpoint(
      normalized.resurrected_data_posture === "ERASURE_OR_PSEUDONYMISATION_RESURRECTED" &&
        normalized.compensating_re_erasure_state === expectedState &&
        normalized.reopen_access_state === "BLOCKED" &&
        normalized.reconciliation_decided_at_or_null !== null,
      "RECOVERY_CHECKPOINT_PRIVACY_INVALID",
      "open compensating re-erasure must remain blocked and retain workflow posture",
    );
  }

  if (
    new Set<string>(RESTORE_PRIVACY_RECONCILIATION_BLOCKED_LIMITED_STATES).has(
      normalized.privacy_reconciliation_state,
    )
  ) {
    assertCheckpoint(
      normalized.compensating_re_erasure_state === "BLOCKED" &&
        normalized.reopen_access_state === "LIMITED" &&
        normalized.replay_limitation_state === "LIMITED_RECONCILED" &&
        normalized.enquiry_limitation_state === "LIMITED_RECONCILED" &&
        normalized.reconciliation_decided_at_or_null !== null,
      "RECOVERY_CHECKPOINT_PRIVACY_INVALID",
      "legal-hold, proof-preservation, and authority-ambiguity blockers must retain limited reopen posture",
    );
  }

  const blockerRefByState: Partial<
    Record<
      RestorePrivacyReconciliationState,
      | "legal_hold_ref_or_null"
      | "proof_preservation_basis_ref_or_null"
      | "authority_ambiguity_ref_or_null"
    >
  > = {
    BLOCKED_LEGAL_HOLD: "legal_hold_ref_or_null",
    BLOCKED_PROOF_PRESERVATION: "proof_preservation_basis_ref_or_null",
    BLOCKED_AUTHORITY_AMBIGUITY: "authority_ambiguity_ref_or_null",
  };
  const expectedBlockerRef = blockerRefByState[normalized.privacy_reconciliation_state];
  for (const field of [
    "legal_hold_ref_or_null",
    "proof_preservation_basis_ref_or_null",
    "authority_ambiguity_ref_or_null",
  ] as const) {
    const value = normalized[field];
    if (field === expectedBlockerRef) {
      assertCheckpoint(
        value !== null,
        "RECOVERY_CHECKPOINT_PRIVACY_INVALID",
        `${field} must be present for privacy_reconciliation_state=${normalized.privacy_reconciliation_state}`,
      );
    } else {
      assertCheckpoint(
        value === null,
        "RECOVERY_CHECKPOINT_PRIVACY_INVALID",
        `${field} must stay null outside its matching blocker state`,
      );
    }
  }

  if (normalized.compensating_re_erasure_state === "NOT_REQUIRED") {
    assertNullableStringsCleared({
      label: "privacy_reconciliation_contract",
      values: [
        [
          "compensating_re_erasure_workflow_ref_or_null",
          normalized.compensating_re_erasure_workflow_ref_or_null,
        ],
        [
          "compensating_re_erasure_audit_ref_or_null",
          normalized.compensating_re_erasure_audit_ref_or_null,
        ],
        ["re_erasure_completed_at_or_null", normalized.re_erasure_completed_at_or_null],
      ],
    });
  } else {
    assertCheckpoint(
      normalized.compensating_re_erasure_workflow_ref_or_null !== null &&
        normalized.compensating_re_erasure_audit_ref_or_null !== null,
      "RECOVERY_CHECKPOINT_PRIVACY_INVALID",
      "compensating re-erasure states other than NOT_REQUIRED must retain workflow and audit refs",
    );
  }
  if (normalized.audit_chain_continuity_state === "FAILED") {
    assertCheckpoint(
      normalized.reopen_access_state === "BLOCKED",
      "RECOVERY_CHECKPOINT_PRIVACY_INVALID",
      "failed audit-chain continuity must block reopen access",
    );
  }
  if (
    normalized.replay_limitation_state === "FAILED" ||
    normalized.enquiry_limitation_state === "FAILED"
  ) {
    assertCheckpoint(
      normalized.reopen_access_state === "BLOCKED",
      "RECOVERY_CHECKPOINT_PRIVACY_INVALID",
      "failed replay or enquiry limitation reconciliation must block reopen access",
    );
  }
  if (
    normalized.re_erasure_completed_at_or_null !== null &&
    normalized.reconciliation_decided_at_or_null !== null
  ) {
    assertInstantNotBefore({
      earlier_label: "privacy_reconciliation_contract.reconciliation_decided_at_or_null",
      earlier: normalized.reconciliation_decided_at_or_null,
      later_label: "privacy_reconciliation_contract.re_erasure_completed_at_or_null",
      later: normalized.re_erasure_completed_at_or_null,
    });
  }
  return normalized;
}

export type ComputeReopenReadinessStateInput = Pick<
  RecoveryCheckpointRecord,
  | "checkpoint_state"
  | "restore_drill_ref"
  | "restore_tested_at"
  | "restore_verification_hash"
  | "privacy_reconciliation_contract"
  | "privacy_reconciliation_outcome_ref"
  | "audit_continuity_verified"
  | "queue_rebuild_verified"
  | "authority_rebuild_verified"
  | "authority_binding_revalidation_verified"
>;

export function computeRecoveryCheckpointReopenReadinessState(
  input: ComputeReopenReadinessStateInput,
): ReopenReadinessState {
  if (input.checkpoint_state === "REQUESTED") {
    return "BLOCKED_PENDING_CHECKPOINT_CREATION";
  }
  if (input.checkpoint_state === "QUARANTINED") {
    return "QUARANTINED";
  }
  if (input.checkpoint_state === "EXPIRED") {
    return "EXPIRED";
  }
  if (!hasCompleteRestoreEvidence(input)) {
    return "BLOCKED_PENDING_RESTORE_DRILL";
  }
  const privacyContract = input.privacy_reconciliation_contract;
  if (privacyContract === null || input.privacy_reconciliation_outcome_ref === null) {
    return "BLOCKED_PENDING_PRIVACY_RECONCILIATION";
  }
  switch (privacyContract.privacy_reconciliation_state) {
    case "PENDING_RECONCILIATION":
      return "BLOCKED_PENDING_PRIVACY_RECONCILIATION";
    case "COMPENSATING_RE_ERASURE_REQUIRED":
    case "COMPENSATING_RE_ERASURE_IN_PROGRESS":
      return "BLOCKED_PENDING_COMPENSATING_RE_ERASURE";
    case "BLOCKED_LEGAL_HOLD":
      return "BLOCKED_LEGAL_HOLD_REVIEW";
    case "BLOCKED_PROOF_PRESERVATION":
      return "BLOCKED_PROOF_PRESERVATION_REVIEW";
    case "BLOCKED_AUTHORITY_AMBIGUITY":
      return "BLOCKED_AUTHORITY_AMBIGUITY_REVIEW";
    default:
      break;
  }
  if (!input.audit_continuity_verified) {
    return "BLOCKED_PENDING_AUDIT_CONTINUITY";
  }
  if (
    privacyContract.reopen_access_state !== "READY_FOR_REOPEN" ||
    privacyContract.replay_limitation_state !== "VERIFIED" ||
    privacyContract.enquiry_limitation_state !== "VERIFIED"
  ) {
    return "BLOCKED_PENDING_LIMITATION_RECONCILIATION";
  }
  if (!input.queue_rebuild_verified) {
    return "BLOCKED_PENDING_QUEUE_REBUILD";
  }
  if (!input.authority_rebuild_verified || !input.authority_binding_revalidation_verified) {
    return "BLOCKED_PENDING_AUTHORITY_REVALIDATION";
  }
  return "READY_FOR_REOPEN";
}

function assertRequestedPosture(record: RecoveryCheckpointRecord) {
  assertCheckpoint(
    record.backup_ref === null &&
      record.checkpoint_inventory_ref === null &&
      record.snapshot_time === null &&
      record.restore_tested_at === null &&
      record.restore_verification_hash === null &&
      record.restore_drill_ref === null &&
      record.privacy_reconciliation_contract === null &&
      record.audit_continuity_verified === false &&
      record.queue_rebuild_verified === false &&
      record.authority_rebuild_verified === false &&
      record.authority_binding_revalidation_verified === false &&
      record.privacy_reconciliation_outcome_ref === null &&
      record.reopen_readiness_state === "BLOCKED_PENDING_CHECKPOINT_CREATION" &&
      record.quarantine_reason_code === null,
    "RECOVERY_CHECKPOINT_EVIDENCE_INVALID",
    "REQUESTED checkpoints must not carry backup, restore, privacy, reopen, or quarantine evidence",
  );
}

function assertNonRequestedInventory(record: RecoveryCheckpointRecord) {
  if (record.checkpoint_state === "REQUESTED") {
    return;
  }
  assertCheckpoint(
    record.backup_ref !== null && record.checkpoint_inventory_ref !== null && record.snapshot_time !== null,
    "RECOVERY_CHECKPOINT_EVIDENCE_INVALID",
    "non-requested checkpoints must retain backup_ref, checkpoint_inventory_ref, and snapshot_time",
  );
}

function assertRestoreEvidenceLineage(record: RecoveryCheckpointRecord) {
  const evidenceFields = [
    record.restore_drill_ref,
    record.restore_tested_at,
    record.restore_verification_hash,
  ];
  const evidenceFieldCount = evidenceFields.filter((value) => value !== null).length;
  assertCheckpoint(
    evidenceFieldCount === 0 || evidenceFieldCount === 3,
    "RECOVERY_CHECKPOINT_EVIDENCE_INVALID",
    "restore_drill_ref, restore_tested_at, and restore_verification_hash must travel together",
  );
  if (record.snapshot_time !== null && record.restore_tested_at !== null) {
    assertInstantNotBefore({
      earlier_label: "snapshot_time",
      earlier: record.snapshot_time,
      later_label: "restore_tested_at",
      later: record.restore_tested_at,
    });
  }
  if (
    record.audit_continuity_verified ||
    record.queue_rebuild_verified ||
    record.authority_rebuild_verified ||
    record.authority_binding_revalidation_verified
  ) {
    assertCheckpoint(
      hasCompleteRestoreEvidence(record),
      "RECOVERY_CHECKPOINT_EVIDENCE_INVALID",
      "recovery verification booleans cannot be true before bound restore-drill evidence exists",
    );
  }
  assertCheckpoint(
    !record.authority_binding_revalidation_verified || record.authority_rebuild_verified,
    "RECOVERY_CHECKPOINT_REOPEN_INVALID",
    "authority binding revalidation cannot pass before authority rebuild passes",
  );
  if (hasCompleteRestoreEvidence(record) || record.privacy_reconciliation_outcome_ref !== null) {
    assertCheckpoint(
      record.privacy_reconciliation_contract !== null,
      "RECOVERY_CHECKPOINT_PRIVACY_INVALID",
      "restore evidence and privacy outcomes must retain a bound privacy_reconciliation_contract",
    );
  }
  if (record.privacy_reconciliation_contract !== null) {
    assertCheckpoint(
      hasCompleteRestoreEvidence(record) && record.privacy_reconciliation_outcome_ref !== null,
      "RECOVERY_CHECKPOINT_PRIVACY_INVALID",
      "non-null privacy_reconciliation_contract requires restore evidence and a mirrored outcome ref",
    );
  }
  if (record.privacy_reconciliation_outcome_ref !== null) {
    assertCheckpoint(
      record.restore_tested_at !== null,
      "RECOVERY_CHECKPOINT_PRIVACY_INVALID",
      "non-null privacy_reconciliation_outcome_ref must retain restore_tested_at",
    );
  }
}

function assertStateSpecificPosture(record: RecoveryCheckpointRecord) {
  const expectedReadiness = computeRecoveryCheckpointReopenReadinessState(record);
  switch (record.checkpoint_state) {
    case "REQUESTED":
      assertRequestedPosture(record);
      return;
    case "CREATED":
      assertCheckpoint(
        record.quarantine_reason_code === null,
        "RECOVERY_CHECKPOINT_QUARANTINE_INVALID",
        "CREATED checkpoints cannot retain quarantine_reason_code",
      );
      assertCheckpoint(
        expectedReadiness !== "READY_FOR_REOPEN" &&
          new Set<string>(RECOVERY_CHECKPOINT_CREATED_READINESS_STATES).has(expectedReadiness),
        "RECOVERY_CHECKPOINT_REOPEN_INVALID",
        "CREATED checkpoints with all reopen gates satisfied must advance to VERIFIED",
      );
      assertCheckpoint(
        record.reopen_readiness_state === expectedReadiness,
        "RECOVERY_CHECKPOINT_REOPEN_INVALID",
        `CREATED checkpoint reopen_readiness_state must be ${expectedReadiness}`,
      );
      if (!hasCompleteRestoreEvidence(record)) {
        assertCheckpoint(
          !record.audit_continuity_verified &&
            !record.queue_rebuild_verified &&
            !record.authority_rebuild_verified &&
            !record.authority_binding_revalidation_verified,
          "RECOVERY_CHECKPOINT_REOPEN_INVALID",
          "CREATED checkpoints without restore evidence must keep verification booleans false",
        );
      }
      return;
    case "VERIFIED": {
      assertCheckpoint(
        hasCompleteRestoreEvidence(record) &&
          record.privacy_reconciliation_contract !== null &&
          record.privacy_reconciliation_outcome_ref !== null,
        "RECOVERY_CHECKPOINT_EVIDENCE_INVALID",
        "VERIFIED checkpoints require restore evidence and privacy reconciliation outcome",
      );
      assertCheckpoint(
        record.audit_continuity_verified &&
          record.queue_rebuild_verified &&
          record.authority_rebuild_verified &&
          record.authority_binding_revalidation_verified,
        "RECOVERY_CHECKPOINT_REOPEN_INVALID",
        "VERIFIED checkpoints require every reopen verification boolean to be true",
      );
      assertCheckpoint(
        record.reopen_readiness_state === "READY_FOR_REOPEN" &&
          expectedReadiness === "READY_FOR_REOPEN" &&
          record.quarantine_reason_code === null,
        "RECOVERY_CHECKPOINT_REOPEN_INVALID",
        "VERIFIED checkpoints must be READY_FOR_REOPEN and cannot retain quarantine_reason_code",
      );
      assertCheckpoint(
        isFinalPrivacyState(record.privacy_reconciliation_contract.privacy_reconciliation_state) &&
          record.privacy_reconciliation_contract.reopen_access_state === "READY_FOR_REOPEN",
        "RECOVERY_CHECKPOINT_PRIVACY_INVALID",
        "VERIFIED checkpoints require final restore privacy reconciliation",
      );
      return;
    }
    case "QUARANTINED":
      assertCheckpoint(
        hasCompleteRestoreEvidence(record) &&
          record.privacy_reconciliation_contract !== null &&
          record.quarantine_reason_code !== null &&
          record.reopen_readiness_state === "QUARANTINED",
        "RECOVERY_CHECKPOINT_QUARANTINE_INVALID",
        "QUARANTINED checkpoints must retain failing restore evidence, privacy evidence, typed reason, and QUARANTINED readiness",
      );
      if (
        record.privacy_reconciliation_outcome_ref !== null &&
        record.audit_continuity_verified &&
        record.queue_rebuild_verified &&
        record.authority_rebuild_verified &&
        record.authority_binding_revalidation_verified &&
        isFinalPrivacyState(record.privacy_reconciliation_contract.privacy_reconciliation_state)
      ) {
        throw new RecoveryCheckpointModelError(
          "RECOVERY_CHECKPOINT_QUARANTINE_INVALID",
          "QUARANTINED checkpoints must retain at least one failed or missing reopen gate",
        );
      }
      return;
    case "EXPIRED":
      assertCheckpoint(
        record.reopen_readiness_state === "EXPIRED" && record.quarantine_reason_code === null,
        "RECOVERY_CHECKPOINT_REOPEN_INVALID",
        "EXPIRED checkpoints must keep EXPIRED readiness and cannot keep a quarantine_reason_code under the current schema",
      );
      return;
  }
}

export function normalizeRecoveryCheckpointRecord(
  record: RecoveryCheckpointRecord,
): RecoveryCheckpointRecord {
  assertKnownKeys("recovery_checkpoint", record, [
    "checkpoint_id",
    "datastore_ref",
    "recovery_governance_contract",
    "backup_ref",
    "checkpoint_inventory_ref",
    "snapshot_time",
    "restore_tested_at",
    "restore_verification_hash",
    "rpo_class",
    "rto_class",
    "checkpoint_state",
    "state_transition_contract",
    "restore_drill_ref",
    "privacy_reconciliation_contract",
    "audit_continuity_verified",
    "queue_rebuild_verified",
    "authority_rebuild_verified",
    "authority_binding_revalidation_verified",
    "privacy_reconciliation_outcome_ref",
    "reopen_readiness_state",
    "quarantine_reason_code",
  ]);
  const checkpointState = requireStringEnum(
    "recovery_checkpoint.checkpoint_state",
    record.checkpoint_state,
    RECOVERY_CHECKPOINT_STATES,
  );
  const rpoClass = requireStringEnum("recovery_checkpoint.rpo_class", record.rpo_class, RPO_CLASSES);
  const rtoClass = requireStringEnum("recovery_checkpoint.rto_class", record.rto_class, RTO_CLASSES);
  const normalized: RecoveryCheckpointRecord = {
    checkpoint_id: requireTrimmedString("recovery_checkpoint.checkpoint_id", record.checkpoint_id),
    datastore_ref: requireTrimmedString("recovery_checkpoint.datastore_ref", record.datastore_ref),
    recovery_governance_contract: normalizeRecoveryGovernanceContract(
      record.recovery_governance_contract,
      {
        boundary_scope: "RECOVERY_CHECKPOINT",
        rpo_class: rpoClass,
        rto_class: rtoClass,
      },
    ),
    backup_ref: normalizeOptionalString("recovery_checkpoint.backup_ref", record.backup_ref),
    checkpoint_inventory_ref: normalizeOptionalString(
      "recovery_checkpoint.checkpoint_inventory_ref",
      record.checkpoint_inventory_ref,
    ),
    snapshot_time: normalizeOptionalInstant("recovery_checkpoint.snapshot_time", record.snapshot_time),
    restore_tested_at: normalizeOptionalInstant(
      "recovery_checkpoint.restore_tested_at",
      record.restore_tested_at,
    ),
    restore_verification_hash: normalizeOptionalString(
      "recovery_checkpoint.restore_verification_hash",
      record.restore_verification_hash,
    ),
    rpo_class: rpoClass,
    rto_class: rtoClass,
    checkpoint_state: checkpointState,
    state_transition_contract: normalizeStateTransitionContract(
      record.state_transition_contract,
      checkpointState,
    ),
    restore_drill_ref: normalizeOptionalString(
      "recovery_checkpoint.restore_drill_ref",
      record.restore_drill_ref,
    ),
    privacy_reconciliation_contract: null,
    audit_continuity_verified: requireBoolean(
      "recovery_checkpoint.audit_continuity_verified",
      record.audit_continuity_verified,
    ),
    queue_rebuild_verified: requireBoolean(
      "recovery_checkpoint.queue_rebuild_verified",
      record.queue_rebuild_verified,
    ),
    authority_rebuild_verified: requireBoolean(
      "recovery_checkpoint.authority_rebuild_verified",
      record.authority_rebuild_verified,
    ),
    authority_binding_revalidation_verified: requireBoolean(
      "recovery_checkpoint.authority_binding_revalidation_verified",
      record.authority_binding_revalidation_verified,
    ),
    privacy_reconciliation_outcome_ref: normalizeOptionalString(
      "recovery_checkpoint.privacy_reconciliation_outcome_ref",
      record.privacy_reconciliation_outcome_ref,
    ),
    reopen_readiness_state: requireStringEnum(
      "recovery_checkpoint.reopen_readiness_state",
      record.reopen_readiness_state,
      REOPEN_READINESS_STATES,
    ),
    quarantine_reason_code:
      record.quarantine_reason_code === null
        ? null
        : requireStringEnum(
            "recovery_checkpoint.quarantine_reason_code",
            record.quarantine_reason_code,
            RECOVERY_CHECKPOINT_QUARANTINE_REASON_CODES,
          ),
  };

  if (record.privacy_reconciliation_contract === null) {
    normalized.privacy_reconciliation_contract = null;
  } else {
    const expectedPrivacyBinding: {
      checkpoint_ref?: string;
      restore_drill_ref?: string;
      privacy_reconciliation_outcome_ref?: string;
    } = {
      checkpoint_ref: normalized.checkpoint_id,
    };
    if (normalized.restore_drill_ref !== null) {
      expectedPrivacyBinding.restore_drill_ref = normalized.restore_drill_ref;
    }
    if (normalized.privacy_reconciliation_outcome_ref !== null) {
      expectedPrivacyBinding.privacy_reconciliation_outcome_ref =
        normalized.privacy_reconciliation_outcome_ref;
    }
    normalized.privacy_reconciliation_contract = normalizeRestorePrivacyReconciliationContract(
      record.privacy_reconciliation_contract,
      expectedPrivacyBinding,
    );
  }

  assertCheckpoint(
    normalized.quarantine_reason_code === null || normalized.checkpoint_state === "QUARANTINED",
    "RECOVERY_CHECKPOINT_QUARANTINE_INVALID",
    "non-null quarantine_reason_code is legal only for QUARANTINED checkpoints",
  );
  assertNonRequestedInventory(normalized);
  assertRestoreEvidenceLineage(normalized);
  assertStateSpecificPosture(normalized);
  return normalized;
}

export function cloneRecoveryCheckpointRecord(record: RecoveryCheckpointRecord) {
  return structuredClone(record);
}

export function recoveryCheckpointRef(input: Pick<RecoveryCheckpointRecord, "checkpoint_id"> | string) {
  const checkpointId =
    typeof input === "string"
      ? requireTrimmedString("recovery_checkpoint.checkpoint_id", input)
      : requireTrimmedString("recovery_checkpoint.checkpoint_id", input.checkpoint_id);
  return `recovery-checkpoint://${checkpointId}`;
}
