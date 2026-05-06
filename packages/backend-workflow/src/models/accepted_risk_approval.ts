import {
  assertAfter,
  assertFailureEnum,
  assertNoSelfReference,
  assertNotBefore,
  assertNullableFailureEnum,
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
  type FailureResolutionContract,
  type FailureRetentionClass,
} from "./failure_companion_common.ts";

export type AcceptedRiskDecisionBasis = "EXPLICIT_APPROVAL" | "POLICY_BASIS";
export type AcceptedRiskApprovalState = "ACTIVE" | "EXPIRED" | "REVOKED" | "SUPERSEDED";
export type AcceptedRiskApproverType =
  | "APPROVER"
  | "TENANT_ADMIN"
  | "SECURITY_OPERATOR"
  | "SYSTEM_POLICY";

export type AcceptedRiskApproval = {
  accepted_risk_approval_id: string;
  approval_state: AcceptedRiskApprovalState;
  approved_at: string;
  approver_ref: string | null;
  approver_type: AcceptedRiskApproverType;
  artifact_retention_ref: string | null;
  audit_refs: string[];
  bounded_scope_refs: string[];
  decision_basis: AcceptedRiskDecisionBasis;
  error_id: string;
  expires_at: string;
  failure_resolution_contract: FailureResolutionContract;
  manifest_id: string;
  policy_basis_ref: string | null;
  provenance_refs: string[];
  rationale_ref: string;
  retention_class: FailureRetentionClass | null;
  revoked_at: string | null;
  root_manifest_id: string;
  superseded_by_approval_id: string | null;
  workflow_item_id: string | null;
};

export type AcceptedRiskApprovalInput = Partial<AcceptedRiskApproval> & {
  accepted_risk_approval_id: string;
  approved_at: string;
  approver_type: AcceptedRiskApproverType;
  audit_refs: readonly string[];
  bounded_scope_refs: readonly string[];
  decision_basis: AcceptedRiskDecisionBasis;
  error_id: string;
  expires_at: string;
  failure_resolution_contract: FailureResolutionContract;
  manifest_id: string;
  provenance_refs: readonly string[];
  rationale_ref: string;
  root_manifest_id: string;
};

export const ACCEPTED_RISK_APPROVAL_STATES = [
  "ACTIVE",
  "EXPIRED",
  "REVOKED",
  "SUPERSEDED",
] as const satisfies readonly AcceptedRiskApprovalState[];
export const ACCEPTED_RISK_APPROVAL_TERMINAL_STATES = [
  "EXPIRED",
  "REVOKED",
  "SUPERSEDED",
] as const satisfies readonly AcceptedRiskApprovalState[];
export const ACCEPTED_RISK_DECISION_BASES = [
  "EXPLICIT_APPROVAL",
  "POLICY_BASIS",
] as const satisfies readonly AcceptedRiskDecisionBasis[];
export const ACCEPTED_RISK_APPROVER_TYPES = [
  "APPROVER",
  "TENANT_ADMIN",
  "SECURITY_OPERATOR",
  "SYSTEM_POLICY",
] as const satisfies readonly AcceptedRiskApproverType[];

export const ACCEPTED_RISK_APPROVAL_TRANSITIONS = {
  ACTIVE: ["EXPIRED", "REVOKED", "SUPERSEDED"],
  EXPIRED: [],
  REVOKED: [],
  SUPERSEDED: [],
} as const satisfies Record<AcceptedRiskApprovalState, readonly AcceptedRiskApprovalState[]>;

export function acceptedRiskApprovalRef(
  approval: Pick<AcceptedRiskApproval, "accepted_risk_approval_id">,
) {
  return `accepted-risk-approval://${approval.accepted_risk_approval_id}`;
}

export function isAcceptedRiskApprovalTerminalState(state: AcceptedRiskApprovalState) {
  return ACCEPTED_RISK_APPROVAL_TERMINAL_STATES.includes(
    state as (typeof ACCEPTED_RISK_APPROVAL_TERMINAL_STATES)[number],
  );
}

export function assertAcceptedRiskApprovalTransition(input: {
  from_state: AcceptedRiskApprovalState;
  to_state: AcceptedRiskApprovalState;
}) {
  if (input.from_state === input.to_state) {
    return input.to_state;
  }
  if (
    !(
      ACCEPTED_RISK_APPROVAL_TRANSITIONS[input.from_state] as readonly AcceptedRiskApprovalState[]
    ).includes(input.to_state)
  ) {
    failureCompanionError(
      `illegal AcceptedRiskApproval transition ${input.from_state} -> ${input.to_state}`,
    );
  }
  return input.to_state;
}

function assertDecisionBasisContract(approval: AcceptedRiskApproval) {
  if (approval.decision_basis === "EXPLICIT_APPROVAL") {
    if (approval.approver_type === "SYSTEM_POLICY") {
      failureCompanionError("explicit accepted-risk approval cannot use SYSTEM_POLICY approver_type");
    }
    if (approval.approver_ref === null) {
      failureCompanionError("explicit accepted-risk approval requires approver_ref");
    }
    if (approval.policy_basis_ref !== null) {
      failureCompanionError("explicit accepted-risk approval must clear policy_basis_ref");
    }
    return;
  }

  if (approval.approver_type !== "SYSTEM_POLICY") {
    failureCompanionError("policy-basis accepted risk requires SYSTEM_POLICY approver_type");
  }
  if (approval.approver_ref !== null) {
    failureCompanionError("policy-basis accepted risk must clear approver_ref");
  }
  if (approval.policy_basis_ref === null) {
    failureCompanionError("policy-basis accepted risk requires policy_basis_ref");
  }
}

function assertApprovalStateContract(approval: AcceptedRiskApproval) {
  switch (approval.approval_state) {
    case "ACTIVE":
    case "EXPIRED":
      if (approval.revoked_at !== null || approval.superseded_by_approval_id !== null) {
        failureCompanionError("active or expired accepted-risk approval must clear revocation and supersession refs");
      }
      break;
    case "REVOKED":
      if (approval.revoked_at === null) {
        failureCompanionError("revoked accepted-risk approval requires revoked_at");
      }
      if (approval.superseded_by_approval_id !== null) {
        failureCompanionError("revoked accepted-risk approval must clear superseded_by_approval_id");
      }
      break;
    case "SUPERSEDED":
      if (approval.revoked_at !== null) {
        failureCompanionError("superseded accepted-risk approval must clear revoked_at");
      }
      if (approval.superseded_by_approval_id === null) {
        failureCompanionError("superseded accepted-risk approval requires superseded_by_approval_id");
      }
      break;
  }

  if (approval.revoked_at !== null && approval.approval_state !== "REVOKED") {
    failureCompanionError("revoked_at is lawful only on revoked accepted-risk approval");
  }
  if (
    approval.superseded_by_approval_id !== null &&
    approval.approval_state !== "SUPERSEDED"
  ) {
    failureCompanionError("superseded_by_approval_id is lawful only on superseded accepted-risk approval");
  }
}

export function buildAcceptedRiskApproval(input: AcceptedRiskApprovalInput): AcceptedRiskApproval {
  return normalizeAcceptedRiskApproval({
    accepted_risk_approval_id: input.accepted_risk_approval_id,
    approval_state: input.approval_state ?? "ACTIVE",
    approved_at: input.approved_at,
    approver_ref: input.approver_ref ?? null,
    approver_type: input.approver_type,
    artifact_retention_ref: input.artifact_retention_ref ?? null,
    audit_refs: [...input.audit_refs],
    bounded_scope_refs: [...input.bounded_scope_refs],
    decision_basis: input.decision_basis,
    error_id: input.error_id,
    expires_at: input.expires_at,
    failure_resolution_contract: input.failure_resolution_contract,
    manifest_id: input.manifest_id,
    policy_basis_ref: input.policy_basis_ref ?? null,
    provenance_refs: [...input.provenance_refs],
    rationale_ref: input.rationale_ref,
    retention_class: input.retention_class ?? null,
    revoked_at: input.revoked_at ?? null,
    root_manifest_id: input.root_manifest_id,
    superseded_by_approval_id: input.superseded_by_approval_id ?? null,
    workflow_item_id: input.workflow_item_id ?? null,
  });
}

export function normalizeAcceptedRiskApproval(input: AcceptedRiskApproval): AcceptedRiskApproval {
  const approval: AcceptedRiskApproval = {
    accepted_risk_approval_id: requireFailureString(
      "accepted_risk_approval_id",
      input.accepted_risk_approval_id,
    ),
    approval_state: assertFailureEnum(
      "approval_state",
      input.approval_state,
      ACCEPTED_RISK_APPROVAL_STATES,
    ),
    approved_at: normalizeFailureTimestamp("approved_at", input.approved_at),
    approver_ref: normalizeNullableFailureString("approver_ref", input.approver_ref),
    approver_type: assertFailureEnum(
      "approver_type",
      input.approver_type,
      ACCEPTED_RISK_APPROVER_TYPES,
    ),
    artifact_retention_ref: normalizeNullableFailureString(
      "artifact_retention_ref",
      input.artifact_retention_ref,
    ),
    audit_refs: normalizeFailureStringSet("audit_refs", input.audit_refs, { minItems: 1 }),
    bounded_scope_refs: normalizeFailureStringSet("bounded_scope_refs", input.bounded_scope_refs, {
      minItems: 1,
    }),
    decision_basis: assertFailureEnum(
      "decision_basis",
      input.decision_basis,
      ACCEPTED_RISK_DECISION_BASES,
    ),
    error_id: requireFailureString("error_id", input.error_id),
    expires_at: normalizeFailureTimestamp("expires_at", input.expires_at),
    failure_resolution_contract: normalizeFailureResolutionContract(
      input.failure_resolution_contract,
      "ACCEPTED_RISK_APPROVAL",
    ),
    manifest_id: requireFailureString("manifest_id", input.manifest_id),
    policy_basis_ref: normalizeNullableFailureString("policy_basis_ref", input.policy_basis_ref),
    provenance_refs: normalizeFailureStringSet("provenance_refs", input.provenance_refs, {
      minItems: 1,
    }),
    rationale_ref: requireFailureString("rationale_ref", input.rationale_ref),
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
    revoked_at: normalizeNullableFailureTimestamp("revoked_at", input.revoked_at),
    root_manifest_id: requireFailureString("root_manifest_id", input.root_manifest_id),
    superseded_by_approval_id: normalizeNullableFailureString(
      "superseded_by_approval_id",
      input.superseded_by_approval_id,
    ),
    workflow_item_id: normalizeNullableFailureString("workflow_item_id", input.workflow_item_id),
  };

  assertRetentionLinkage({
    artifact_retention_ref: approval.artifact_retention_ref,
    label: "AcceptedRiskApproval",
    retention_class: approval.retention_class,
  });
  assertAfter({
    earlier_label: "approved_at",
    earlier_value: approval.approved_at,
    later_label: "expires_at",
    later_value: approval.expires_at,
  });
  assertNotBefore({
    earlier_label: "approved_at",
    earlier_value: approval.approved_at,
    later_label: "revoked_at",
    later_value: approval.revoked_at,
  });
  assertNoSelfReference({
    id: approval.accepted_risk_approval_id,
    id_label: "accepted_risk_approval_id",
    reference: approval.superseded_by_approval_id,
    reference_label: "superseded_by_approval_id",
  });
  assertDecisionBasisContract(approval);
  assertApprovalStateContract(approval);
  return approval;
}

export function cloneAcceptedRiskApproval(approval: AcceptedRiskApproval) {
  return cloneFailureCompanionRecord(approval);
}

export function acceptedRiskApprovalContentFingerprint(approval: AcceptedRiskApproval) {
  return failureCompanionContentFingerprint(normalizeAcceptedRiskApproval(approval));
}

export function withAcceptedRiskApprovalLineage(input: {
  approval: AcceptedRiskApproval;
  audit_refs?: readonly string[];
  provenance_refs?: readonly string[];
}) {
  return normalizeAcceptedRiskApproval({
    ...input.approval,
    audit_refs: appendFailureRefs(input.approval.audit_refs, input.audit_refs, "audit_refs", {
      minItems: 1,
    }),
    provenance_refs: appendFailureRefs(
      input.approval.provenance_refs,
      input.provenance_refs,
      "provenance_refs",
      { minItems: 1 },
    ),
  });
}
