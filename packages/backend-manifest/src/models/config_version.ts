import type { StateTransitionContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import {
  REQUIRED_CONFIG_TYPE_ORDER,
  type ConfigTypeRef,
} from "../../../domain-kernel/src/config/config_resolution_context.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import { requireTrimmedString } from "../../../backend-access/src/services/principal_context_normalizer.ts";

export type ConfigVersionLifecycleState =
  | "DRAFT"
  | "CANDIDATE"
  | "VERIFIED"
  | "APPROVED"
  | "DEPRECATED"
  | "REVOKED"
  | "RETIRED";

export type ConfigVersionTransitionEventCode =
  | "submit_for_test"
  | "verification_pass"
  | "approval_granted"
  | "replacement_approved"
  | "urgent_withdrawal"
  | "retired";

export type ConfigVersionRecord = {
  artifact_type: "ConfigVersion";
  version_id: string;
  content_hash: string;
  effective_scope: string[];
  approvals: string[];
  verification_evidence_ref_or_null: string | null;
  approved_at_or_null: string | null;
  config_type: ConfigTypeRef;
  lifecycle_state: ConfigVersionLifecycleState;
  superseded_by_version_id_or_null: string | null;
  revocation_reason_code_or_null: string | null;
  retired_at_or_null: string | null;
  state_changed_at: string;
  created_at: string;
  audit_refs: string[];
  provenance_refs: string[];
  state_transition_contract: StateTransitionContract & {
    object_family: "CONFIG_VERSION";
    machine_code: "CONFIG_VERSION_LIFECYCLE_V1";
    state_field_name: "lifecycle_state";
  };
};

export const CONFIG_VERSION_MACHINE_CODE = "CONFIG_VERSION_LIFECYCLE_V1";
export const CONFIG_VERSION_STATE_FIELD = "lifecycle_state";
export const CONFIG_VERSION_SCHEMA_ID = "https://taxat.dev/schemas/config_version.schema.json";

type ConfigVersionModelErrorCode =
  | "CONFIG_VERSION_FIELD_REQUIRED"
  | "CONFIG_VERSION_INVALID_CONFIG_TYPE"
  | "CONFIG_VERSION_STATE_CONTRACT_MISMATCH"
  | "CONFIG_VERSION_STATE_POSTURE_INVALID";

export class ConfigVersionModelError extends Error {
  readonly code: ConfigVersionModelErrorCode;

  constructor(code: ConfigVersionModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ConfigVersionModelError";
    this.code = code;
  }
}

function assertConfigVersion(
  condition: unknown,
  code: ConfigVersionModelErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new ConfigVersionModelError(code, detail);
  }
}

function normalizeOptionalString(label: string, value: string | null) {
  return value === null ? null : requireTrimmedString(label, value);
}

function normalizeOptionalInstant(label: string, value: string | null) {
  return value === null ? null : normalizeUtcInstantString(value);
}

function normalizeUniqueStrings(
  label: string,
  values: readonly string[],
  options?: { minItems?: number },
) {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const value of values) {
    const candidate = requireTrimmedString(label, value);
    if (!seen.has(candidate)) {
      seen.add(candidate);
      normalized.push(candidate);
    }
  }
  if (options?.minItems !== undefined && normalized.length < options.minItems) {
    throw new ConfigVersionModelError(
      "CONFIG_VERSION_FIELD_REQUIRED",
      `${label} must contain at least ${options.minItems} value(s)`,
    );
  }
  return normalized;
}

export function assertConfigTypeRef(value: string): asserts value is ConfigTypeRef {
  assertConfigVersion(
    (REQUIRED_CONFIG_TYPE_ORDER as readonly string[]).includes(value),
    "CONFIG_VERSION_INVALID_CONFIG_TYPE",
    `config_type ${value} is not in the governed config-type catalog`,
  );
}

export function buildConfigVersionStateTransitionContract(input: {
  current_state: ConfigVersionLifecycleState;
  previous_state_or_null: ConfigVersionLifecycleState | null;
  transition_event_code: ConfigVersionTransitionEventCode;
  transition_applied_at: string;
  transition_audit_ref: string;
}): ConfigVersionRecord["state_transition_contract"] {
  return {
    contract_version: "STATE_TRANSITION_CONTRACT_V1",
    object_family: "CONFIG_VERSION",
    machine_code: CONFIG_VERSION_MACHINE_CODE,
    state_field_name: CONFIG_VERSION_STATE_FIELD,
    current_state: input.current_state,
    previous_state_or_null: input.previous_state_or_null,
    transition_event_code: input.transition_event_code,
    transition_applied_at: normalizeUtcInstantString(input.transition_applied_at),
    transition_audit_ref: requireTrimmedString(
      "config_version.transition_audit_ref",
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
  contract: StateTransitionContract,
  state: ConfigVersionLifecycleState,
): ConfigVersionRecord["state_transition_contract"] {
  assertConfigVersion(
    contract.object_family === "CONFIG_VERSION" &&
      contract.machine_code === CONFIG_VERSION_MACHINE_CODE &&
      contract.state_field_name === CONFIG_VERSION_STATE_FIELD,
    "CONFIG_VERSION_STATE_CONTRACT_MISMATCH",
    "state_transition_contract must bind CONFIG_VERSION_LIFECYCLE_V1.lifecycle_state",
  );
  assertConfigVersion(
    contract.current_state === state,
    "CONFIG_VERSION_STATE_CONTRACT_MISMATCH",
    "state_transition_contract.current_state must match lifecycle_state",
  );

  return {
    ...structuredClone(contract),
    object_family: "CONFIG_VERSION",
    machine_code: CONFIG_VERSION_MACHINE_CODE,
    state_field_name: CONFIG_VERSION_STATE_FIELD,
    current_state: state,
    previous_state_or_null:
      contract.previous_state_or_null === null
        ? null
        : requireTrimmedString(
            "config_version.state_transition_contract.previous_state_or_null",
            contract.previous_state_or_null,
          ),
    transition_event_code: requireTrimmedString(
      "config_version.state_transition_contract.transition_event_code",
      contract.transition_event_code,
    ),
    transition_applied_at: normalizeUtcInstantString(contract.transition_applied_at),
    transition_audit_ref: requireTrimmedString(
      "config_version.state_transition_contract.transition_audit_ref",
      contract.transition_audit_ref,
    ),
  };
}

function assertStatePosture(record: ConfigVersionRecord) {
  const hasApproval = record.approvals.length > 0;
  const hasVerification = record.verification_evidence_ref_or_null !== null;
  const hasApprovedAt = record.approved_at_or_null !== null;
  switch (record.lifecycle_state) {
    case "DRAFT":
    case "CANDIDATE":
      assertConfigVersion(
        record.approvals.length === 0 &&
          record.verification_evidence_ref_or_null === null &&
          record.approved_at_or_null === null &&
          record.superseded_by_version_id_or_null === null &&
          record.revocation_reason_code_or_null === null &&
          record.retired_at_or_null === null,
        "CONFIG_VERSION_STATE_POSTURE_INVALID",
        `${record.lifecycle_state} config versions cannot carry approval, verification, supersession, revocation, or retirement posture`,
      );
      return;
    case "VERIFIED":
      assertConfigVersion(
        hasVerification &&
          record.approved_at_or_null === null &&
          record.superseded_by_version_id_or_null === null &&
          record.revocation_reason_code_or_null === null &&
          record.retired_at_or_null === null,
        "CONFIG_VERSION_STATE_POSTURE_INVALID",
        "VERIFIED config versions require verification evidence and no approval or terminal posture",
      );
      return;
    case "APPROVED":
      assertConfigVersion(
        hasApproval &&
          hasVerification &&
          hasApprovedAt &&
          record.superseded_by_version_id_or_null === null &&
          record.revocation_reason_code_or_null === null &&
          record.retired_at_or_null === null,
        "CONFIG_VERSION_STATE_POSTURE_INVALID",
        "APPROVED config versions require approval and verification evidence",
      );
      return;
    case "DEPRECATED":
      assertConfigVersion(
        hasApproval &&
          hasVerification &&
          hasApprovedAt &&
          record.superseded_by_version_id_or_null !== null &&
          record.revocation_reason_code_or_null === null,
        "CONFIG_VERSION_STATE_POSTURE_INVALID",
        "DEPRECATED config versions require approval lineage and a superseding version id",
      );
      return;
    case "REVOKED":
      assertConfigVersion(
        hasApproval &&
          hasVerification &&
          hasApprovedAt &&
          record.superseded_by_version_id_or_null === null &&
          record.revocation_reason_code_or_null !== null,
        "CONFIG_VERSION_STATE_POSTURE_INVALID",
        "REVOKED config versions require approval lineage and a revocation reason",
      );
      return;
    case "RETIRED":
      assertConfigVersion(
        record.retired_at_or_null !== null,
        "CONFIG_VERSION_STATE_POSTURE_INVALID",
        "RETIRED config versions require retired_at_or_null",
      );
      return;
  }
}

export function normalizeConfigVersionRecord(record: ConfigVersionRecord): ConfigVersionRecord {
  assertConfigTypeRef(record.config_type);
  const lifecycleState = record.lifecycle_state;
  const normalized: ConfigVersionRecord = {
    artifact_type: "ConfigVersion",
    version_id: requireTrimmedString("config_version.version_id", record.version_id),
    config_type: record.config_type,
    lifecycle_state: lifecycleState,
    state_transition_contract: normalizeStateTransitionContract(
      record.state_transition_contract,
      lifecycleState,
    ),
    content_hash: requireTrimmedString("config_version.content_hash", record.content_hash),
    effective_scope: normalizeUniqueStrings("config_version.effective_scope", record.effective_scope, {
      minItems: 1,
    }),
    approvals: normalizeUniqueStrings("config_version.approvals", record.approvals),
    verification_evidence_ref_or_null: normalizeOptionalString(
      "config_version.verification_evidence_ref_or_null",
      record.verification_evidence_ref_or_null,
    ),
    approved_at_or_null: normalizeOptionalInstant(
      "config_version.approved_at_or_null",
      record.approved_at_or_null,
    ),
    superseded_by_version_id_or_null: normalizeOptionalString(
      "config_version.superseded_by_version_id_or_null",
      record.superseded_by_version_id_or_null,
    ),
    revocation_reason_code_or_null: normalizeOptionalString(
      "config_version.revocation_reason_code_or_null",
      record.revocation_reason_code_or_null,
    ),
    retired_at_or_null: normalizeOptionalInstant(
      "config_version.retired_at_or_null",
      record.retired_at_or_null,
    ),
    state_changed_at: normalizeUtcInstantString(record.state_changed_at),
    created_at: normalizeUtcInstantString(record.created_at),
    audit_refs: normalizeUniqueStrings("config_version.audit_refs", record.audit_refs, {
      minItems: 1,
    }),
    provenance_refs: normalizeUniqueStrings(
      "config_version.provenance_refs",
      record.provenance_refs,
    ),
  };
  assertStatePosture(normalized);
  return normalized;
}

export function cloneConfigVersionRecord(record: ConfigVersionRecord) {
  return structuredClone(record);
}
