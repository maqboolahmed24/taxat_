import type { StateTransitionContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import { requireTrimmedString } from "../../../backend-access/src/services/principal_context_normalizer.ts";

export type ConfigChangeRequestLifecycleState =
  | "OPEN"
  | "UNDER_REVIEW"
  | "TESTING"
  | "APPROVED"
  | "REJECTED"
  | "IMPLEMENTED"
  | "ROLLED_BACK";

export type ConfigChangeRequestTransitionEventCode =
  | "assigned"
  | "sent_to_test"
  | "pass"
  | "fail"
  | "deployed"
  | "rollback";

export type ConfigChangeRequestRecord = {
  artifact_type: "ConfigChangeRequest";
  ccr_id: string;
  tenant_id: string;
  lifecycle_state: ConfigChangeRequestLifecycleState;
  diff_ref: string;
  risk_assessment_ref: string;
  approvals: string[];
  rejected_reason_code_or_null: string | null;
  implemented_release_ref_or_null: string | null;
  rolled_back_release_ref_or_null: string | null;
  state_changed_at: string;
  created_at: string;
  audit_refs: string[];
  provenance_refs: string[];
  state_transition_contract: StateTransitionContract & {
    object_family: "CONFIG_CHANGE_REQUEST";
    machine_code: "CONFIG_CHANGE_REQUEST_LIFECYCLE_V1";
    state_field_name: "lifecycle_state";
  };
};

export const CONFIG_CHANGE_REQUEST_MACHINE_CODE = "CONFIG_CHANGE_REQUEST_LIFECYCLE_V1";
export const CONFIG_CHANGE_REQUEST_STATE_FIELD = "lifecycle_state";
export const CONFIG_CHANGE_REQUEST_SCHEMA_ID =
  "https://taxat.dev/schemas/config_change_request.schema.json";

type ConfigChangeRequestModelErrorCode =
  | "CONFIG_CHANGE_REQUEST_FIELD_REQUIRED"
  | "CONFIG_CHANGE_REQUEST_STATE_CONTRACT_MISMATCH"
  | "CONFIG_CHANGE_REQUEST_STATE_POSTURE_INVALID";

export class ConfigChangeRequestModelError extends Error {
  readonly code: ConfigChangeRequestModelErrorCode;

  constructor(code: ConfigChangeRequestModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ConfigChangeRequestModelError";
    this.code = code;
  }
}

function assertCcr(
  condition: unknown,
  code: ConfigChangeRequestModelErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new ConfigChangeRequestModelError(code, detail);
  }
}

function normalizeOptionalString(label: string, value: string | null) {
  return value === null ? null : requireTrimmedString(label, value);
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
    throw new ConfigChangeRequestModelError(
      "CONFIG_CHANGE_REQUEST_FIELD_REQUIRED",
      `${label} must contain at least ${options.minItems} value(s)`,
    );
  }
  return normalized;
}

export function buildConfigChangeRequestStateTransitionContract(input: {
  current_state: ConfigChangeRequestLifecycleState;
  previous_state_or_null: ConfigChangeRequestLifecycleState | null;
  transition_event_code: ConfigChangeRequestTransitionEventCode;
  transition_applied_at: string;
  transition_audit_ref: string;
}): ConfigChangeRequestRecord["state_transition_contract"] {
  return {
    contract_version: "STATE_TRANSITION_CONTRACT_V1",
    object_family: "CONFIG_CHANGE_REQUEST",
    machine_code: CONFIG_CHANGE_REQUEST_MACHINE_CODE,
    state_field_name: CONFIG_CHANGE_REQUEST_STATE_FIELD,
    current_state: input.current_state,
    previous_state_or_null: input.previous_state_or_null,
    transition_event_code: input.transition_event_code,
    transition_applied_at: normalizeUtcInstantString(input.transition_applied_at),
    transition_audit_ref: requireTrimmedString(
      "config_change_request.transition_audit_ref",
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
  state: ConfigChangeRequestLifecycleState,
): ConfigChangeRequestRecord["state_transition_contract"] {
  assertCcr(
    contract.object_family === "CONFIG_CHANGE_REQUEST" &&
      contract.machine_code === CONFIG_CHANGE_REQUEST_MACHINE_CODE &&
      contract.state_field_name === CONFIG_CHANGE_REQUEST_STATE_FIELD,
    "CONFIG_CHANGE_REQUEST_STATE_CONTRACT_MISMATCH",
    "state_transition_contract must bind CONFIG_CHANGE_REQUEST_LIFECYCLE_V1.lifecycle_state",
  );
  assertCcr(
    contract.current_state === state,
    "CONFIG_CHANGE_REQUEST_STATE_CONTRACT_MISMATCH",
    "state_transition_contract.current_state must match lifecycle_state",
  );

  return {
    ...structuredClone(contract),
    object_family: "CONFIG_CHANGE_REQUEST",
    machine_code: CONFIG_CHANGE_REQUEST_MACHINE_CODE,
    state_field_name: CONFIG_CHANGE_REQUEST_STATE_FIELD,
    current_state: state,
    previous_state_or_null:
      contract.previous_state_or_null === null
        ? null
        : requireTrimmedString(
            "config_change_request.state_transition_contract.previous_state_or_null",
            contract.previous_state_or_null,
          ),
    transition_event_code: requireTrimmedString(
      "config_change_request.state_transition_contract.transition_event_code",
      contract.transition_event_code,
    ),
    transition_applied_at: normalizeUtcInstantString(contract.transition_applied_at),
    transition_audit_ref: requireTrimmedString(
      "config_change_request.state_transition_contract.transition_audit_ref",
      contract.transition_audit_ref,
    ),
  };
}

function assertStatePosture(record: ConfigChangeRequestRecord) {
  switch (record.lifecycle_state) {
    case "OPEN":
    case "UNDER_REVIEW":
    case "TESTING":
      assertCcr(
        record.approvals.length === 0 &&
          record.rejected_reason_code_or_null === null &&
          record.implemented_release_ref_or_null === null &&
          record.rolled_back_release_ref_or_null === null,
        "CONFIG_CHANGE_REQUEST_STATE_POSTURE_INVALID",
        `${record.lifecycle_state} CCRs cannot carry approval or implementation posture`,
      );
      return;
    case "APPROVED":
      assertCcr(
        record.approvals.length > 0 &&
          record.rejected_reason_code_or_null === null &&
          record.implemented_release_ref_or_null === null &&
          record.rolled_back_release_ref_or_null === null,
        "CONFIG_CHANGE_REQUEST_STATE_POSTURE_INVALID",
        "APPROVED CCRs require approval evidence and no implementation or rollback ref",
      );
      return;
    case "REJECTED":
      assertCcr(
        record.rejected_reason_code_or_null !== null &&
          record.implemented_release_ref_or_null === null &&
          record.rolled_back_release_ref_or_null === null,
        "CONFIG_CHANGE_REQUEST_STATE_POSTURE_INVALID",
        "REJECTED CCRs require a rejection reason and no release refs",
      );
      return;
    case "IMPLEMENTED":
      assertCcr(
        record.approvals.length > 0 &&
          record.rejected_reason_code_or_null === null &&
          record.implemented_release_ref_or_null !== null &&
          record.rolled_back_release_ref_or_null === null,
        "CONFIG_CHANGE_REQUEST_STATE_POSTURE_INVALID",
        "IMPLEMENTED CCRs require approvals and implemented release lineage",
      );
      return;
    case "ROLLED_BACK":
      assertCcr(
        record.approvals.length > 0 &&
          record.rejected_reason_code_or_null === null &&
          record.implemented_release_ref_or_null !== null &&
          record.rolled_back_release_ref_or_null !== null,
        "CONFIG_CHANGE_REQUEST_STATE_POSTURE_INVALID",
        "ROLLED_BACK CCRs require implemented and rollback release lineage",
      );
      return;
  }
}

export function normalizeConfigChangeRequestRecord(
  record: ConfigChangeRequestRecord,
): ConfigChangeRequestRecord {
  const lifecycleState = record.lifecycle_state;
  const normalized: ConfigChangeRequestRecord = {
    artifact_type: "ConfigChangeRequest",
    ccr_id: requireTrimmedString("config_change_request.ccr_id", record.ccr_id),
    tenant_id: requireTrimmedString("config_change_request.tenant_id", record.tenant_id),
    lifecycle_state: lifecycleState,
    state_transition_contract: normalizeStateTransitionContract(
      record.state_transition_contract,
      lifecycleState,
    ),
    diff_ref: requireTrimmedString("config_change_request.diff_ref", record.diff_ref),
    risk_assessment_ref: requireTrimmedString(
      "config_change_request.risk_assessment_ref",
      record.risk_assessment_ref,
    ),
    approvals: normalizeUniqueStrings("config_change_request.approvals", record.approvals),
    rejected_reason_code_or_null: normalizeOptionalString(
      "config_change_request.rejected_reason_code_or_null",
      record.rejected_reason_code_or_null,
    ),
    implemented_release_ref_or_null: normalizeOptionalString(
      "config_change_request.implemented_release_ref_or_null",
      record.implemented_release_ref_or_null,
    ),
    rolled_back_release_ref_or_null: normalizeOptionalString(
      "config_change_request.rolled_back_release_ref_or_null",
      record.rolled_back_release_ref_or_null,
    ),
    state_changed_at: normalizeUtcInstantString(record.state_changed_at),
    created_at: normalizeUtcInstantString(record.created_at),
    audit_refs: normalizeUniqueStrings("config_change_request.audit_refs", record.audit_refs, {
      minItems: 1,
    }),
    provenance_refs: normalizeUniqueStrings(
      "config_change_request.provenance_refs",
      record.provenance_refs,
    ),
  };
  assertStatePosture(normalized);
  return normalized;
}

export function cloneConfigChangeRequestRecord(record: ConfigChangeRequestRecord) {
  return structuredClone(record);
}
