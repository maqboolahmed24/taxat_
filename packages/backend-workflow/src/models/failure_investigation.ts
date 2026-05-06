import {
  assertFailureEnum,
  assertNoSelfReference,
  assertNotBefore,
  assertNullableFailureEnum,
  assertOwnerReference,
  assertRetentionLinkage,
  appendFailureRefs,
  cloneFailureCompanionRecord,
  failureCompanionContentFingerprint,
  failureCompanionError,
  normalizeFailureResolutionContract,
  normalizeFailureStringSet,
  normalizeFailureTimestamp,
  normalizeNullableFailureString,
  normalizeNullableFailureTimestamp,
  requireFailureString,
  type FailureCompanionOwnerType,
  type FailureResolutionContract,
  type FailureRetentionClass,
} from "./failure_companion_common.ts";

export type FailureInvestigationClass =
  | "AUTHORITY_STATE_AMBIGUITY"
  | "AMENDMENT_READINESS"
  | "RETENTION_PRIVACY_EXCEPTION"
  | "AUDIT_PROVENANCE_DIVERGENCE"
  | "SECURITY_ACCESS_ANOMALY"
  | "SYSTEM_INVARIANT_BREACH"
  | "MULTI_ERROR_CORRELATION";
export type FailureInvestigationOwnerType = Exclude<
  FailureCompanionOwnerType,
  "SYSTEM" | "CLIENT"
>;
export type FailureInvestigationPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT" | "CRITICAL";
export type FailureInvestigationState =
  | "OPEN"
  | "EVIDENCE_GATHERING"
  | "AWAITING_EXTERNAL_INPUT"
  | "IN_REVIEW"
  | "RESOLVED"
  | "ACCEPTED_RISK"
  | "SUPERSEDED"
  | "CANCELLED";
export type FailureInvestigationOutcome =
  | "ROOT_CAUSE_CONFIRMED"
  | "FALSE_POSITIVE"
  | "RETRY_AUTHORIZED"
  | "RECONCILIATION_REQUIRED"
  | "REMEDIATION_SPAWNED"
  | "ACCEPTED_RISK"
  | "SUPERSEDED"
  | "CANCELLED";
export type ResolvedFailureInvestigationOutcome = Exclude<
  FailureInvestigationOutcome,
  "ACCEPTED_RISK" | "SUPERSEDED" | "CANCELLED"
>;

export type FailureInvestigation = {
  accepted_risk_approval_ref: string | null;
  artifact_retention_ref: string | null;
  audit_refs: string[];
  closure_evidence_refs: string[];
  due_at: string | null;
  error_id: string;
  failure_resolution_contract: FailureResolutionContract;
  investigation_class: FailureInvestigationClass;
  investigation_id: string;
  investigation_state: FailureInvestigationState;
  investigation_steps_ref: string;
  last_activity_at: string;
  manifest_id: string;
  opened_at: string;
  outcome: FailureInvestigationOutcome | null;
  owner_ref: string | null;
  owner_type: FailureInvestigationOwnerType;
  priority: FailureInvestigationPriority;
  provenance_refs: string[];
  remediation_task_refs: string[];
  resolution_basis_ref: string | null;
  resolved_at: string | null;
  retention_class: FailureRetentionClass | null;
  root_manifest_id: string;
  superseded_by_investigation_id: string | null;
  workflow_item_id: string | null;
};

export type FailureInvestigationInput = Partial<FailureInvestigation> & {
  audit_refs: readonly string[];
  error_id: string;
  failure_resolution_contract: FailureResolutionContract;
  investigation_class: FailureInvestigationClass;
  investigation_id: string;
  investigation_steps_ref: string;
  manifest_id: string;
  opened_at: string;
  owner_type: FailureInvestigationOwnerType;
  provenance_refs: readonly string[];
  root_manifest_id: string;
};

export const FAILURE_INVESTIGATION_CLASSES = [
  "AUTHORITY_STATE_AMBIGUITY",
  "AMENDMENT_READINESS",
  "RETENTION_PRIVACY_EXCEPTION",
  "AUDIT_PROVENANCE_DIVERGENCE",
  "SECURITY_ACCESS_ANOMALY",
  "SYSTEM_INVARIANT_BREACH",
  "MULTI_ERROR_CORRELATION",
] as const satisfies readonly FailureInvestigationClass[];
export const FAILURE_INVESTIGATION_OWNER_TYPES = [
  "SERVICE_OPERATOR",
  "REVIEWER",
  "APPROVER",
  "TENANT_ADMIN",
  "SECURITY_OPERATOR",
] as const satisfies readonly FailureInvestigationOwnerType[];
export const FAILURE_INVESTIGATION_PRIORITIES = [
  "LOW",
  "NORMAL",
  "HIGH",
  "URGENT",
  "CRITICAL",
] as const satisfies readonly FailureInvestigationPriority[];
export const FAILURE_INVESTIGATION_STATES = [
  "OPEN",
  "EVIDENCE_GATHERING",
  "AWAITING_EXTERNAL_INPUT",
  "IN_REVIEW",
  "RESOLVED",
  "ACCEPTED_RISK",
  "SUPERSEDED",
  "CANCELLED",
] as const satisfies readonly FailureInvestigationState[];
export const FAILURE_INVESTIGATION_TERMINAL_STATES = [
  "RESOLVED",
  "ACCEPTED_RISK",
  "SUPERSEDED",
  "CANCELLED",
] as const satisfies readonly FailureInvestigationState[];
export const FAILURE_INVESTIGATION_OUTCOMES = [
  "ROOT_CAUSE_CONFIRMED",
  "FALSE_POSITIVE",
  "RETRY_AUTHORIZED",
  "RECONCILIATION_REQUIRED",
  "REMEDIATION_SPAWNED",
  "ACCEPTED_RISK",
  "SUPERSEDED",
  "CANCELLED",
] as const satisfies readonly FailureInvestigationOutcome[];
export const RESOLVED_FAILURE_INVESTIGATION_OUTCOMES = [
  "ROOT_CAUSE_CONFIRMED",
  "FALSE_POSITIVE",
  "RETRY_AUTHORIZED",
  "RECONCILIATION_REQUIRED",
  "REMEDIATION_SPAWNED",
] as const satisfies readonly ResolvedFailureInvestigationOutcome[];

export const FAILURE_INVESTIGATION_TRANSITIONS = {
  ACCEPTED_RISK: [],
  AWAITING_EXTERNAL_INPUT: [
    "EVIDENCE_GATHERING",
    "IN_REVIEW",
    "RESOLVED",
    "ACCEPTED_RISK",
    "SUPERSEDED",
    "CANCELLED",
  ],
  CANCELLED: [],
  EVIDENCE_GATHERING: [
    "AWAITING_EXTERNAL_INPUT",
    "IN_REVIEW",
    "RESOLVED",
    "ACCEPTED_RISK",
    "SUPERSEDED",
    "CANCELLED",
  ],
  IN_REVIEW: [
    "EVIDENCE_GATHERING",
    "AWAITING_EXTERNAL_INPUT",
    "RESOLVED",
    "ACCEPTED_RISK",
    "SUPERSEDED",
    "CANCELLED",
  ],
  OPEN: [
    "EVIDENCE_GATHERING",
    "AWAITING_EXTERNAL_INPUT",
    "IN_REVIEW",
    "RESOLVED",
    "ACCEPTED_RISK",
    "SUPERSEDED",
    "CANCELLED",
  ],
  RESOLVED: [],
  SUPERSEDED: [],
} as const satisfies Record<FailureInvestigationState, readonly FailureInvestigationState[]>;

export function failureInvestigationRef(
  investigation: Pick<FailureInvestigation, "investigation_id">,
) {
  return `failure-investigation://${investigation.investigation_id}`;
}

export function isFailureInvestigationTerminalState(state: FailureInvestigationState) {
  return FAILURE_INVESTIGATION_TERMINAL_STATES.includes(
    state as (typeof FAILURE_INVESTIGATION_TERMINAL_STATES)[number],
  );
}

export function assertFailureInvestigationTransition(input: {
  from_state: FailureInvestigationState;
  to_state: FailureInvestigationState;
}) {
  if (input.from_state === input.to_state) {
    return input.to_state;
  }
  if (
    !(
      FAILURE_INVESTIGATION_TRANSITIONS[
        input.from_state
      ] as readonly FailureInvestigationState[]
    ).includes(input.to_state)
  ) {
    failureCompanionError(
      `illegal FailureInvestigation transition ${input.from_state} -> ${input.to_state}`,
    );
  }
  return input.to_state;
}

function assertNoTerminalFields(investigation: FailureInvestigation) {
  if (
    investigation.resolved_at !== null ||
    investigation.resolution_basis_ref !== null ||
    investigation.outcome !== null ||
    investigation.accepted_risk_approval_ref !== null ||
    investigation.superseded_by_investigation_id !== null ||
    investigation.closure_evidence_refs.length > 0
  ) {
    failureCompanionError(
      "non-terminal investigations must not carry terminal closure, accepted-risk, or supersession fields",
    );
  }
}

function assertTerminalEvidence(investigation: FailureInvestigation) {
  if (investigation.resolved_at === null) {
    failureCompanionError("terminal investigations require resolved_at");
  }
  if (investigation.resolution_basis_ref === null) {
    failureCompanionError("terminal investigations require resolution_basis_ref");
  }
  if (investigation.closure_evidence_refs.length === 0) {
    failureCompanionError("terminal investigations require closure_evidence_refs");
  }
  if (investigation.outcome === null) {
    failureCompanionError("terminal investigations require outcome");
  }
}

function assertFailureInvestigationStateContract(investigation: FailureInvestigation) {
  if (!isFailureInvestigationTerminalState(investigation.investigation_state)) {
    assertNoTerminalFields(investigation);
    return;
  }

  assertTerminalEvidence(investigation);
  switch (investigation.investigation_state) {
    case "RESOLVED":
      if (
        investigation.outcome === null ||
        !(
          RESOLVED_FAILURE_INVESTIGATION_OUTCOMES as readonly FailureInvestigationOutcome[]
        ).includes(investigation.outcome)
      ) {
        failureCompanionError("resolved investigations require a resolved investigation outcome");
      }
      if (
        investigation.accepted_risk_approval_ref !== null ||
        investigation.superseded_by_investigation_id !== null
      ) {
        failureCompanionError("resolved investigations must clear accepted-risk and supersession refs");
      }
      break;
    case "ACCEPTED_RISK":
      if (
        investigation.outcome !== "ACCEPTED_RISK" ||
        investigation.accepted_risk_approval_ref === null ||
        investigation.superseded_by_investigation_id !== null
      ) {
        failureCompanionError(
          "accepted-risk investigations require accepted-risk outcome and approval ref only",
        );
      }
      break;
    case "SUPERSEDED":
      if (
        investigation.outcome !== "SUPERSEDED" ||
        investigation.superseded_by_investigation_id === null ||
        investigation.accepted_risk_approval_ref !== null
      ) {
        failureCompanionError(
          "superseded investigations require supersession outcome and successor investigation id only",
        );
      }
      break;
    case "CANCELLED":
      if (
        investigation.outcome !== "CANCELLED" ||
        investigation.accepted_risk_approval_ref !== null ||
        investigation.superseded_by_investigation_id !== null
      ) {
        failureCompanionError(
          "cancelled investigations require cancelled outcome with no accepted-risk or supersession refs",
        );
      }
      break;
  }

  if (
    (investigation.outcome === "REMEDIATION_SPAWNED" ||
      investigation.outcome === "RECONCILIATION_REQUIRED") &&
    investigation.remediation_task_refs.length === 0
  ) {
    failureCompanionError(
      "remediation-spawned or reconciliation-required investigations require remediation_task_refs",
    );
  }
}

function assertInvestigationClassContract(investigation: FailureInvestigation) {
  if (
    investigation.investigation_class === "RETENTION_PRIVACY_EXCEPTION" &&
    (investigation.retention_class === null || investigation.artifact_retention_ref === null)
  ) {
    failureCompanionError(
      "RETENTION_PRIVACY_EXCEPTION investigations require retention linkage",
    );
  }
}

export function buildFailureInvestigation(
  input: FailureInvestigationInput,
): FailureInvestigation {
  return normalizeFailureInvestigation({
    accepted_risk_approval_ref: input.accepted_risk_approval_ref ?? null,
    artifact_retention_ref: input.artifact_retention_ref ?? null,
    audit_refs: [...input.audit_refs],
    closure_evidence_refs: [...(input.closure_evidence_refs ?? [])],
    due_at: input.due_at ?? null,
    error_id: input.error_id,
    failure_resolution_contract: input.failure_resolution_contract,
    investigation_class: input.investigation_class,
    investigation_id: input.investigation_id,
    investigation_state: input.investigation_state ?? "OPEN",
    investigation_steps_ref: input.investigation_steps_ref,
    last_activity_at: input.last_activity_at ?? input.opened_at,
    manifest_id: input.manifest_id,
    opened_at: input.opened_at,
    outcome: input.outcome ?? null,
    owner_ref: input.owner_ref ?? null,
    owner_type: input.owner_type,
    priority: input.priority ?? "NORMAL",
    provenance_refs: [...input.provenance_refs],
    remediation_task_refs: [...(input.remediation_task_refs ?? [])],
    resolution_basis_ref: input.resolution_basis_ref ?? null,
    resolved_at: input.resolved_at ?? null,
    retention_class: input.retention_class ?? null,
    root_manifest_id: input.root_manifest_id,
    superseded_by_investigation_id: input.superseded_by_investigation_id ?? null,
    workflow_item_id: input.workflow_item_id ?? null,
  });
}

export function normalizeFailureInvestigation(
  input: FailureInvestigation,
): FailureInvestigation {
  const investigation: FailureInvestigation = {
    accepted_risk_approval_ref: normalizeNullableFailureString(
      "accepted_risk_approval_ref",
      input.accepted_risk_approval_ref,
    ),
    artifact_retention_ref: normalizeNullableFailureString(
      "artifact_retention_ref",
      input.artifact_retention_ref,
    ),
    audit_refs: normalizeFailureStringSet("audit_refs", input.audit_refs, { minItems: 1 }),
    closure_evidence_refs: normalizeFailureStringSet(
      "closure_evidence_refs",
      input.closure_evidence_refs,
    ),
    due_at: normalizeNullableFailureTimestamp("due_at", input.due_at),
    error_id: requireFailureString("error_id", input.error_id),
    failure_resolution_contract: normalizeFailureResolutionContract(
      input.failure_resolution_contract,
      "FAILURE_INVESTIGATION",
    ),
    investigation_class: assertFailureEnum(
      "investigation_class",
      input.investigation_class,
      FAILURE_INVESTIGATION_CLASSES,
    ),
    investigation_id: requireFailureString("investigation_id", input.investigation_id),
    investigation_state: assertFailureEnum(
      "investigation_state",
      input.investigation_state,
      FAILURE_INVESTIGATION_STATES,
    ),
    investigation_steps_ref: requireFailureString(
      "investigation_steps_ref",
      input.investigation_steps_ref,
    ),
    last_activity_at: normalizeFailureTimestamp("last_activity_at", input.last_activity_at),
    manifest_id: requireFailureString("manifest_id", input.manifest_id),
    opened_at: normalizeFailureTimestamp("opened_at", input.opened_at),
    outcome: assertNullableFailureEnum("outcome", input.outcome, FAILURE_INVESTIGATION_OUTCOMES),
    owner_ref: normalizeNullableFailureString("owner_ref", input.owner_ref),
    owner_type: assertFailureEnum(
      "owner_type",
      input.owner_type,
      FAILURE_INVESTIGATION_OWNER_TYPES,
    ),
    priority: assertFailureEnum("priority", input.priority, FAILURE_INVESTIGATION_PRIORITIES),
    provenance_refs: normalizeFailureStringSet("provenance_refs", input.provenance_refs, {
      minItems: 1,
    }),
    remediation_task_refs: normalizeFailureStringSet(
      "remediation_task_refs",
      input.remediation_task_refs,
    ),
    resolution_basis_ref: normalizeNullableFailureString(
      "resolution_basis_ref",
      input.resolution_basis_ref,
    ),
    resolved_at: normalizeNullableFailureTimestamp("resolved_at", input.resolved_at),
    retention_class: assertNullableFailureEnum(
      "retention_class",
      input.retention_class,
      [
        "regulated_record",
        "derived_artifact",
        "operational_log",
        "analytics_projection",
        "policy_governed_other",
      ] as const,
    ),
    root_manifest_id: requireFailureString("root_manifest_id", input.root_manifest_id),
    superseded_by_investigation_id: normalizeNullableFailureString(
      "superseded_by_investigation_id",
      input.superseded_by_investigation_id,
    ),
    workflow_item_id: normalizeNullableFailureString("workflow_item_id", input.workflow_item_id),
  };

  assertOwnerReference({
    label: "FailureInvestigation",
    owner_ref: investigation.owner_ref,
    owner_type: investigation.owner_type,
  });
  assertRetentionLinkage({
    artifact_retention_ref: investigation.artifact_retention_ref,
    label: "FailureInvestigation",
    retention_class: investigation.retention_class,
  });
  assertInvestigationClassContract(investigation);
  assertNoSelfReference({
    id: investigation.investigation_id,
    id_label: "investigation_id",
    reference: investigation.superseded_by_investigation_id,
    reference_label: "superseded_by_investigation_id",
  });
  assertNotBefore({
    earlier_label: "opened_at",
    earlier_value: investigation.opened_at,
    later_label: "due_at",
    later_value: investigation.due_at,
  });
  assertNotBefore({
    earlier_label: "opened_at",
    earlier_value: investigation.opened_at,
    later_label: "last_activity_at",
    later_value: investigation.last_activity_at,
  });
  assertNotBefore({
    earlier_label: "opened_at",
    earlier_value: investigation.opened_at,
    later_label: "resolved_at",
    later_value: investigation.resolved_at,
  });
  assertNotBefore({
    earlier_label: "last_activity_at",
    earlier_value: investigation.last_activity_at,
    later_label: "resolved_at",
    later_value: investigation.resolved_at,
  });
  assertFailureInvestigationStateContract(investigation);
  return investigation;
}

export function cloneFailureInvestigation(investigation: FailureInvestigation) {
  return cloneFailureCompanionRecord(investigation);
}

export function failureInvestigationContentFingerprint(
  investigation: FailureInvestigation,
) {
  return failureCompanionContentFingerprint(normalizeFailureInvestigation(investigation));
}

export function withFailureInvestigationLineage(input: {
  audit_refs?: readonly string[];
  investigation: FailureInvestigation;
  provenance_refs?: readonly string[];
  remediation_task_refs?: readonly string[];
}) {
  return normalizeFailureInvestigation({
    ...input.investigation,
    audit_refs: appendFailureRefs(input.investigation.audit_refs, input.audit_refs, "audit_refs", {
      minItems: 1,
    }),
    provenance_refs: appendFailureRefs(
      input.investigation.provenance_refs,
      input.provenance_refs,
      "provenance_refs",
      { minItems: 1 },
    ),
    remediation_task_refs: appendFailureRefs(
      input.investigation.remediation_task_refs,
      input.remediation_task_refs,
      "remediation_task_refs",
    ),
  });
}
