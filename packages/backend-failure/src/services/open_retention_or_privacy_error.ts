import type { InvariantEnforcementContract } from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  bindRetentionToErrorAndRemediation,
  type ArtifactRetentionRecord,
  type RetentionClass,
  type RetentionTagRecord,
} from "../../../backend-retention/src/index.ts";
import {
  buildFailureResolutionContract,
  compensationRecordRef as toCompensationRecordRef,
  failureInvestigationRef as toFailureInvestigationRef,
  remediationTaskRef as toRemediationTaskRef,
  type FailureCompanionOwnerType,
} from "../../../backend-workflow/src/index.ts";
import {
  assertRetentionAnchorLinkage,
  RetentionFailureBindingError,
} from "./assert_retention_anchor_linkage.ts";

export type RetentionPrivacyConditionCode =
  | "BLOCKED_LEGAL_HOLD"
  | "BLOCKED_PROOF_PRESERVATION"
  | "BLOCKED_AUTHORITY_AMBIGUITY"
  | "RETENTION_LIMITED_SURVIVAL"
  | "ERASURE_PENDING_CHECKPOINT"
  | "PRIVACY_MINIMIZATION_DIAGNOSTIC_BLOCK";

export type RetentionPrivacyErrorFamily = "RETENTION_ERROR" | "PRIVACY_ERROR";
export type RetentionPrivacyBlockingClass =
  | "BLOCKS_AUTHORITY_CALL"
  | "BLOCKS_ERASURE"
  | "BLOCKS_REVIEW_PROGRESS"
  | "BLOCKS_RUN";
export type RetentionPrivacyRemediationClass =
  | "OPEN_INVESTIGATION"
  | "REQUEST_OPERATOR_REVIEW"
  | "SPAWN_WORKFLOW"
  | "SUPERSEDE_AND_REPLAN";

export type RetentionPrivacyErrorMapping = {
  audit_event_type: "ErasureRequested" | "LegalHoldApplied" | "RetentionLimited";
  blocking_class: RetentionPrivacyBlockingClass;
  capability_code: string;
  default_reason_code: string;
  description_template: string;
  error_code: string;
  error_family: RetentionPrivacyErrorFamily;
  impact_level: "BLOCKED" | "REVIEW_REQUIRED";
  remediation_class: RetentionPrivacyRemediationClass;
  requires_compensation: boolean;
  requires_investigation: boolean;
  requires_remediation_task: boolean;
  severity: "WARNING" | "ERROR" | "CRITICAL";
  title: string;
};

export const RETENTION_PRIVACY_ERROR_CONDITION_MAP = {
  BLOCKED_AUTHORITY_AMBIGUITY: {
    audit_event_type: "RetentionLimited",
    blocking_class: "BLOCKS_AUTHORITY_CALL",
    capability_code: "AUTHORITY_STATE_RECONCILIATION",
    default_reason_code: "BLOCKED_AUTHORITY_AMBIGUITY",
    description_template:
      "Authority-facing state ambiguity prevents retention or privacy mutation until reconciliation is opened.",
    error_code: "PRIVACY_AUTHORITY_AMBIGUITY_BLOCKS_ACTION",
    error_family: "PRIVACY_ERROR",
    impact_level: "BLOCKED",
    remediation_class: "OPEN_INVESTIGATION",
    requires_compensation: false,
    requires_investigation: true,
    requires_remediation_task: false,
    severity: "CRITICAL",
    title: "Authority ambiguity blocks privacy action",
  },
  BLOCKED_LEGAL_HOLD: {
    audit_event_type: "LegalHoldApplied",
    blocking_class: "BLOCKS_ERASURE",
    capability_code: "ERASURE_EXECUTION",
    default_reason_code: "LEGAL_HOLD_BLOCKS_ERASURE",
    description_template:
      "A legal hold prevents erasure until a governed retention-hold review task clears the hold.",
    error_code: "RETENTION_HOLD_PREVENTS_ERASURE",
    error_family: "RETENTION_ERROR",
    impact_level: "BLOCKED",
    remediation_class: "REQUEST_OPERATOR_REVIEW",
    requires_compensation: false,
    requires_investigation: false,
    requires_remediation_task: true,
    severity: "ERROR",
    title: "Legal hold prevents erasure",
  },
  BLOCKED_PROOF_PRESERVATION: {
    audit_event_type: "RetentionLimited",
    blocking_class: "BLOCKS_ERASURE",
    capability_code: "PROOF_PRESERVATION",
    default_reason_code: "BLOCKED_PROOF_PRESERVATION",
    description_template:
      "Proof-preservation requirements block destructive privacy action until a typed exception branch is investigated.",
    error_code: "RETENTION_PROOF_PRESERVATION_BLOCKS_ERASURE",
    error_family: "RETENTION_ERROR",
    impact_level: "BLOCKED",
    remediation_class: "OPEN_INVESTIGATION",
    requires_compensation: false,
    requires_investigation: true,
    requires_remediation_task: false,
    severity: "ERROR",
    title: "Proof preservation blocks erasure",
  },
  ERASURE_PENDING_CHECKPOINT: {
    audit_event_type: "ErasureRequested",
    blocking_class: "BLOCKS_ERASURE",
    capability_code: "ERASURE_EXECUTION",
    default_reason_code: "ERASURE_PENDING_REQUIRES_CHECKPOINT",
    description_template:
      "A pending erasure workflow must preserve checkpoint and workflow refs before execution can continue.",
    error_code: "PRIVACY_ERASURE_PENDING_CHECKPOINT_REQUIRED",
    error_family: "PRIVACY_ERROR",
    impact_level: "BLOCKED",
    remediation_class: "SPAWN_WORKFLOW",
    requires_compensation: false,
    requires_investigation: false,
    requires_remediation_task: false,
    severity: "ERROR",
    title: "Erasure pending checkpoint required",
  },
  PRIVACY_MINIMIZATION_DIAGNOSTIC_BLOCK: {
    audit_event_type: "RetentionLimited",
    blocking_class: "BLOCKS_RUN",
    capability_code: "DIAGNOSTIC_EMISSION",
    default_reason_code: "PRIVACY_MINIMIZATION_BLOCKS_DIAGNOSTIC_PAYLOAD",
    description_template:
      "Privacy minimization prevents diagnostic payload emission; the failure must remain correlated without raw personal or authority-secret data.",
    error_code: "PRIVACY_MINIMIZATION_DIAGNOSTIC_BLOCK",
    error_family: "PRIVACY_ERROR",
    impact_level: "BLOCKED",
    remediation_class: "OPEN_INVESTIGATION",
    requires_compensation: false,
    requires_investigation: true,
    requires_remediation_task: false,
    severity: "CRITICAL",
    title: "Privacy minimization blocks diagnostics",
  },
  RETENTION_LIMITED_SURVIVAL: {
    audit_event_type: "RetentionLimited",
    blocking_class: "BLOCKS_REVIEW_PROGRESS",
    capability_code: "LIMITED_EVIDENCE_REVIEW",
    default_reason_code: "RETENTION_LIMITED_SURVIVING_ARTIFACT",
    description_template:
      "A surviving derived artifact is retention-limited and requires preserve-and-limit compensation instead of silent deletion.",
    error_code: "RETENTION_LIMITED_SURVIVING_ARTIFACT",
    error_family: "RETENTION_ERROR",
    impact_level: "REVIEW_REQUIRED",
    remediation_class: "SUPERSEDE_AND_REPLAN",
    requires_compensation: true,
    requires_investigation: false,
    requires_remediation_task: false,
    severity: "WARNING",
    title: "Retention-limited artifact requires settlement",
  },
} as const satisfies Record<RetentionPrivacyConditionCode, RetentionPrivacyErrorMapping>;

export type ErrorRecordBlockingEffect = {
  affected_object_refs: string[];
  capability_code: string;
  impact_level: "BLOCKED" | "DEGRADED" | "REVIEW_REQUIRED";
  reason_codes: string[];
};

export type RetentionPrivacyErrorRecord = {
  accepted_risk_approval_ref: string | null;
  accepted_risk_expires_at: string | null;
  actor_ref: string | null;
  affected_object_refs: string[];
  artifact_retention_ref: string;
  audit_refs: string[];
  authority_operation_ref: string | null;
  blocking_class: RetentionPrivacyBlockingClass;
  blocking_effects: ErrorRecordBlockingEffect[];
  caused_by_error_id: string | null;
  closure_evidence_refs: string[];
  compensation_record_ref: string | null;
  customer_visibility_class: string;
  dedupe_key: string;
  dedupe_scope: string;
  error_code: string;
  error_description_template: string;
  error_family: RetentionPrivacyErrorFamily;
  error_id: string;
  error_title: string;
  escalated_at: string | null;
  escalation_state:
    | "INCIDENT_ESCALATED"
    | "NONE"
    | "OPERATOR_ESCALATED"
    | "RECONCILIATION_ESCALATED"
    | "SECURITY_ESCALATED"
    | "TENANT_ADMIN_ESCALATED";
  failure_investigation_ref: string | null;
  failure_resolution_contract: ReturnType<typeof buildFailureResolutionContract>;
  first_seen_at: string;
  invariant_enforcement_contract: InvariantEnforcementContract;
  last_seen_at: string;
  manifest_id: string;
  next_action_ref: string;
  next_retry_at: string | null;
  occurrence_count: number;
  opened_at: string;
  operator_visibility_class: string;
  originating_activity_ref: string;
  provenance_refs: string[];
  reason_codes: string[];
  remediation_class: RetentionPrivacyRemediationClass;
  remediation_owner_ref: string | null;
  remediation_owner_type: FailureCompanionOwnerType;
  remediation_task_ref: string | null;
  reopened_by_error_id: string | null;
  resolved_at: string | null;
  resolved_by_task_id: string | null;
  resolution_basis_ref: string | null;
  resolution_notes_ref: string | null;
  resolution_state: "OPEN";
  retention_class: RetentionClass;
  retry_attempt_count: number;
  retry_budget_class: "NONE";
  retry_class: "NO_RETRY";
  retry_idempotency_scope_ref: string | null;
  retry_precondition_refs: string[];
  root_manifest_id: string;
  service_ref: string | null;
  severity: "WARNING" | "ERROR" | "CRITICAL";
  source_object_refs: string[];
  workflow_item_id: string | null;
};

export type OpenRetentionOrPrivacyErrorInput = {
  actor_ref?: string | null;
  affected_object_refs?: readonly string[];
  artifact_retention: ArtifactRetentionRecord;
  audit_refs?: readonly string[];
  authority_operation_ref?: string | null;
  caused_by_error_id?: string | null;
  client_id?: string | null;
  compensation_record_ref?: string | null;
  condition: RetentionPrivacyConditionCode;
  error_id?: string;
  failure_investigation_ref?: string | null;
  first_seen_at?: string;
  last_seen_at?: string;
  manifest_id: string;
  opened_at: string;
  originating_activity_ref?: string | null;
  provenance_refs?: readonly string[];
  reason_codes?: readonly string[];
  remediation_owner_ref?: string | null;
  remediation_owner_type?: FailureCompanionOwnerType;
  remediation_task_ref?: string | null;
  retained_basis_ref?: string | null;
  retention_tag: RetentionTagRecord;
  root_manifest_id: string;
  service_ref?: string | null;
  source_object_refs?: readonly string[];
  workflow_item_id?: string | null;
};

export type OpenRetentionOrPrivacyErrorResult = {
  condition: RetentionPrivacyConditionCode;
  error_record: RetentionPrivacyErrorRecord;
  mapping: RetentionPrivacyErrorMapping;
  retained_basis_ref: string;
};

function bindingError(detail: string): never {
  throw new RetentionFailureBindingError("RETENTION_FAILURE_BINDING_INVALID", detail);
}

function requireString(label: string, value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    bindingError(`${label} must be a non-empty string`);
  }
  return value.trim();
}

function optionalString(label: string, value: unknown) {
  if (value === undefined || value === null) {
    return null;
  }
  return requireString(label, value);
}

function uniqueSorted(label: string, values: readonly (string | null | undefined)[], minItems = 0) {
  const normalized = values
    .filter((value): value is string => value !== null && value !== undefined)
    .map((value) => requireString(`${label}[]`, value));
  const sorted = [...new Set(normalized)].sort((left, right) => left.localeCompare(right));
  if (sorted.length < minItems) {
    bindingError(`${label} must contain at least ${minItems} item(s)`);
  }
  return sorted;
}

function buildErrorRecordInvariantEnforcementContract(): InvariantEnforcementContract {
  return {
    assertion_conversion_policy:
      "ASSERTIONS_AND_GENERIC_EXCEPTIONS_MUST_COLLAPSE_TO_TYPED_FAIL_CLOSED_OUTCOMES",
    audit_evidence_policy: "INVARIANTS_REQUIRE_ERROR_AND_TERMINAL_AUDIT_EVIDENCE",
    boundary_scope: "ERROR_RECORD",
    boundary_specific_binding_policy:
      "ERROR_RETAINS_INVARIANT_CLASS_FAULT_CODE_AND_TERMINAL_BINDING",
    contract_version: "INVARIANT_ENFORCEMENT_V1",
    error_code_or_null: null,
    error_family_or_null: null,
    error_record_ref_or_null: null,
    failure_stage_or_null: null,
    invariant_class_or_null: null,
    invariant_failure_state: "NOT_TRIGGERED",
    lifecycle_mapping_policy: "PRESTART_INVARIANTS_BLOCK_POSTSTART_INVARIANTS_FAIL",
    normalization_rejection_policy: "IMPOSSIBLE_STATES_REJECTED_NEVER_NORMALIZED",
    partial_write_policy: "NO_PARTIAL_MUTATION_OR_SIDE_EFFECT_AFTER_INVARIANT_FAILURE",
    terminal_audit_event_type_or_null: null,
    terminal_manifest_state_or_null: null,
    transition_event_code_or_null: null,
    typed_error_policy: "INVARIANTS_MUST_PERSIST_FAMILY_SPECIFIC_ERROR_RECORDS",
  };
}

export function retentionErrorAuditPublicationRef(input: {
  error_id: string;
  event_type: string;
}) {
  return `audit-publication://retention-error/${input.event_type}/${stableJsonHash(input)}`;
}

function deriveErrorId(input: {
  artifact_retention_ref: string;
  condition: RetentionPrivacyConditionCode;
  manifest_id: string;
  retained_basis_ref: string;
  root_manifest_id: string;
}) {
  return `error://retention-privacy/${stableJsonHash(input)}`;
}

function deriveCompanionId(input: {
  condition: RetentionPrivacyConditionCode;
  error_id: string;
  kind: string;
}) {
  return `${input.kind}.${stableJsonHash(input)}`;
}

function firstWorkflowRef(input: {
  artifact_retention: ArtifactRetentionRecord;
  explicit_workflow_item_id: string | null;
}) {
  return input.explicit_workflow_item_id ?? input.artifact_retention.workflow_item_refs[0] ?? null;
}

function assertOwner(input: { owner_ref: string | null; owner_type: FailureCompanionOwnerType }) {
  if (input.owner_type === "SYSTEM") {
    if (input.owner_ref !== null) {
      bindingError("system-owned retention/privacy errors must clear remediation_owner_ref");
    }
    return;
  }
  if (input.owner_ref === null) {
    bindingError("non-system retention/privacy errors require remediation_owner_ref");
  }
}

function assertChronology(errorRecord: RetentionPrivacyErrorRecord) {
  if (errorRecord.opened_at < errorRecord.first_seen_at) {
    bindingError("opened_at must not be earlier than first_seen_at");
  }
  if (errorRecord.last_seen_at < errorRecord.opened_at) {
    bindingError("last_seen_at must not be earlier than opened_at");
  }
}

function normalizeRetentionPrivacyErrorRecord(
  errorRecord: RetentionPrivacyErrorRecord,
): RetentionPrivacyErrorRecord {
  assertOwner({
    owner_ref: errorRecord.remediation_owner_ref,
    owner_type: errorRecord.remediation_owner_type,
  });
  assertChronology(errorRecord);
  if (!errorRecord.workflow_item_id && !errorRecord.remediation_task_ref) {
    bindingError("retention/privacy errors require workflow_item_id or remediation_task_ref");
  }
  const linkedActionRefs = new Set([
    errorRecord.workflow_item_id,
    errorRecord.remediation_task_ref,
    errorRecord.failure_investigation_ref,
    errorRecord.compensation_record_ref,
    errorRecord.accepted_risk_approval_ref,
  ]);
  if (!linkedActionRefs.has(errorRecord.next_action_ref)) {
    bindingError("next_action_ref must point at a linked follow-up object");
  }
  if (
    errorRecord.remediation_class === "OPEN_INVESTIGATION" &&
    errorRecord.failure_investigation_ref === null
  ) {
    bindingError("OPEN_INVESTIGATION errors require failure_investigation_ref");
  }
  return errorRecord;
}

export function openRetentionOrPrivacyError(
  input: OpenRetentionOrPrivacyErrorInput,
): OpenRetentionOrPrivacyErrorResult {
  const mapping = RETENTION_PRIVACY_ERROR_CONDITION_MAP[input.condition];
  const anchor = assertRetentionAnchorLinkage({
    artifact_retention: input.artifact_retention,
    retained_basis_ref: input.retained_basis_ref,
    retention_tag: input.retention_tag,
  });
  const openedAt = normalizeUtcInstantString(input.opened_at);
  const firstSeenAt = normalizeUtcInstantString(input.first_seen_at ?? openedAt);
  const lastSeenAt = normalizeUtcInstantString(input.last_seen_at ?? openedAt);
  const manifestId = requireString("manifest_id", input.manifest_id);
  const rootManifestId = requireString("root_manifest_id", input.root_manifest_id);
  const errorId =
    input.error_id ??
    deriveErrorId({
      artifact_retention_ref: anchor.artifact_retention.retention_id,
      condition: input.condition,
      manifest_id: manifestId,
      retained_basis_ref: anchor.retained_basis_ref,
      root_manifest_id: rootManifestId,
    });

  const remediationTaskRef = mapping.requires_remediation_task
    ? input.remediation_task_ref ??
      toRemediationTaskRef({
        task_id: deriveCompanionId({
          condition: input.condition,
          error_id: errorId,
          kind: "remediation-task",
        }),
      })
    : optionalString("remediation_task_ref", input.remediation_task_ref);
  const failureInvestigationRef = mapping.requires_investigation
    ? input.failure_investigation_ref ??
      toFailureInvestigationRef({
        investigation_id: deriveCompanionId({
          condition: input.condition,
          error_id: errorId,
          kind: "failure-investigation",
        }),
      })
    : optionalString("failure_investigation_ref", input.failure_investigation_ref);
  const compensationRef = mapping.requires_compensation
    ? input.compensation_record_ref ??
      toCompensationRecordRef({
        compensation_id: deriveCompanionId({
          condition: input.condition,
          error_id: errorId,
          kind: "compensation-record",
        }),
      })
    : optionalString("compensation_record_ref", input.compensation_record_ref);
  const workflowItemId = firstWorkflowRef({
    artifact_retention: anchor.artifact_retention,
    explicit_workflow_item_id: optionalString("workflow_item_id", input.workflow_item_id),
  });
  if (!workflowItemId && !remediationTaskRef) {
    bindingError(`${input.condition} requires workflow_item_id or remediation_task_ref`);
  }

  const reasonCodes = uniqueSorted(
    "reason_codes",
    [
      mapping.default_reason_code,
      mapping.error_code,
      ...anchor.retention_tag.erasure_reason_codes,
      ...anchor.retention_tag.limitation_reason_codes,
      ...anchor.artifact_retention.limitation_reason_codes,
      ...(input.reason_codes ?? []),
    ],
    1,
  );
  const affectedRefs = uniqueSorted(
    "affected_object_refs",
    [
      anchor.artifact_retention.artifact_ref,
      anchor.artifact_retention.retention_id,
      anchor.retention_tag.retention_tag_id,
      anchor.retained_basis_ref,
      ...(input.affected_object_refs ?? []),
    ],
    1,
  );
  const sourceRefs = uniqueSorted("source_object_refs", [
    anchor.retention_tag.retention_tag_id,
    anchor.artifact_retention.retention_id,
    anchor.retained_basis_ref,
    ...(input.source_object_refs ?? []),
  ]);
  const ownerType = input.remediation_owner_type ?? "SERVICE_OPERATOR";
  const ownerRef =
    ownerType === "SYSTEM"
      ? optionalString("remediation_owner_ref", input.remediation_owner_ref)
      : optionalString("remediation_owner_ref", input.remediation_owner_ref) ??
        "operator://retention-control";

  const nextActionRef =
    remediationTaskRef ?? failureInvestigationRef ?? compensationRef ?? workflowItemId;
  if (nextActionRef === null) {
    bindingError("retention/privacy error must retain a next action ref");
  }

  const draft = bindRetentionToErrorAndRemediation({
    artifact_retention: anchor.artifact_retention,
    companion: {
      accepted_risk_approval_ref: null,
      accepted_risk_expires_at: null,
      actor_ref: optionalString("actor_ref", input.actor_ref),
      affected_object_refs: affectedRefs,
      audit_refs: uniqueSorted("audit_refs", [
        retentionErrorAuditPublicationRef({
          error_id: errorId,
          event_type: "ErrorRecorded",
        }),
        ...(input.audit_refs ?? []),
      ], 1),
      authority_operation_ref: optionalString(
        "authority_operation_ref",
        input.authority_operation_ref,
      ),
      blocking_class: mapping.blocking_class,
      blocking_effects: [
        {
          affected_object_refs: affectedRefs,
          capability_code: mapping.capability_code,
          impact_level: mapping.impact_level,
          reason_codes: reasonCodes,
        },
      ],
      caused_by_error_id: optionalString("caused_by_error_id", input.caused_by_error_id),
      closure_evidence_refs: [],
      compensation_record_ref: compensationRef,
      customer_visibility_class: "RETENTION_PRIVACY_LIMITED",
      dedupe_key: `retention-error://${stableJsonHash({
        artifact_retention_ref: anchor.artifact_retention.retention_id,
        condition: input.condition,
        manifest_id: manifestId,
        retained_basis_ref: anchor.retained_basis_ref,
      })}`,
      dedupe_scope: `${manifestId}:${anchor.artifact_retention.retention_id}`,
      error_code: mapping.error_code,
      error_description_template: mapping.description_template,
      error_family: mapping.error_family,
      error_id: errorId,
      error_title: mapping.title,
      escalated_at: null,
      escalation_state: "NONE",
      failure_investigation_ref: failureInvestigationRef,
      failure_resolution_contract: buildFailureResolutionContract({
        lifecycle_role: "ERROR_RECORD",
      }),
      first_seen_at: firstSeenAt,
      invariant_enforcement_contract: buildErrorRecordInvariantEnforcementContract(),
      last_seen_at: lastSeenAt,
      manifest_id: manifestId,
      next_action_ref: nextActionRef,
      next_retry_at: null,
      occurrence_count: 1,
      opened_at: openedAt,
      operator_visibility_class: "RETENTION_PRIVACY_RESTRICTED",
      originating_activity_ref:
        optionalString("originating_activity_ref", input.originating_activity_ref) ??
        `retention-condition://${stableJsonHash({
          condition: input.condition,
          error_id: errorId,
        })}`,
      provenance_refs: uniqueSorted("provenance_refs", [
        anchor.retained_basis_ref,
        anchor.retention_tag.retention_basis_ref,
        ...(input.provenance_refs ?? []),
      ], 1),
      reason_codes: reasonCodes,
      remediation_class: mapping.remediation_class,
      remediation_owner_ref: ownerRef,
      remediation_owner_type: ownerType,
      remediation_task_ref: remediationTaskRef,
      reopened_by_error_id: null,
      resolved_at: null,
      resolved_by_task_id: null,
      resolution_basis_ref: null,
      resolution_notes_ref: null,
      resolution_state: "OPEN",
      retention_class: anchor.artifact_retention.retention_class,
      retry_attempt_count: 0,
      retry_budget_class: "NONE",
      retry_class: "NO_RETRY",
      retry_idempotency_scope_ref: null,
      retry_precondition_refs: [],
      root_manifest_id: rootManifestId,
      service_ref:
        optionalString("service_ref", input.service_ref) ??
        "service://backend-failure/retention-privacy",
      severity: mapping.severity,
      source_object_refs: sourceRefs,
      workflow_item_id: workflowItemId,
    },
    kind: "ERROR_RECORD",
    retained_basis_ref: anchor.retained_basis_ref,
    retention_tag: anchor.retention_tag,
  });

  return {
    condition: input.condition,
    error_record: normalizeRetentionPrivacyErrorRecord(
      draft as RetentionPrivacyErrorRecord,
    ),
    mapping,
    retained_basis_ref: anchor.retained_basis_ref,
  };
}
