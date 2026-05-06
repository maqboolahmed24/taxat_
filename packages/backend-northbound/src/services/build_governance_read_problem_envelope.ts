import { createProblemTruthBoundaryContract } from "../../../../apps/control-plane-api/src/northbound/policy.ts";
import type { ProblemEnvelope } from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";

export const governanceReadNoStoreHeaders = {
  "Cache-Control": "no-store",
} as const;

export type GovernanceReadProblemKind =
  | "CORRUPT"
  | "HIDDEN"
  | "METHOD_INVALID"
  | "NOT_READY"
  | "QUERY_INVALID"
  | "ROUTE_INVALID";

export type GovernanceReadProblemResponse = {
  body: ProblemEnvelope;
  headers: typeof governanceReadNoStoreHeaders;
  status: number;
};

const problemDefaults = {
  CORRUPT: {
    detail:
      "A governance read projection exists but failed contract validation, so the control-plane payload was not emitted.",
    problemCode: "GOVERNANCE_READ_CORRUPT",
    reasonCodes: ["GOVERNANCE_READ_CORRUPT"],
    retryable: false,
    status: 500,
    title: "Governance read is corrupt",
  },
  HIDDEN: {
    detail: "No governance read projection is visible for this tenant and actor.",
    problemCode: "GOVERNANCE_READ_NOT_VISIBLE",
    reasonCodes: ["GOVERNANCE_READ_NOT_VISIBLE"],
    retryable: false,
    status: 404,
    title: "Governance read is not visible",
  },
  METHOD_INVALID: {
    detail: "Governance read endpoints only support GET.",
    problemCode: "GOVERNANCE_READ_METHOD_INVALID",
    reasonCodes: ["HTTP_METHOD_INVALID"],
    retryable: false,
    status: 405,
    title: "Governance read method is invalid",
  },
  NOT_READY: {
    detail:
      "The tenant does not have a materialized governance read projection for this route yet.",
    problemCode: "GOVERNANCE_READ_NOT_READY",
    reasonCodes: ["GOVERNANCE_READ_NOT_READY"],
    retryable: true,
    status: 404,
    title: "Governance read is not ready",
  },
  QUERY_INVALID: {
    detail: "The governance read query filters or selection anchors are invalid.",
    problemCode: "GOVERNANCE_READ_QUERY_INVALID",
    reasonCodes: ["GOVERNANCE_READ_QUERY_INVALID"],
    retryable: false,
    status: 400,
    title: "Governance read query is invalid",
  },
  ROUTE_INVALID: {
    detail: "The governance read route did not include a valid tenant or route object id.",
    problemCode: "GOVERNANCE_READ_ROUTE_INVALID",
    reasonCodes: ["HTTP_ROUTE_INVALID"],
    retryable: false,
    status: 404,
    title: "Governance read route is invalid",
  },
} as const;

function unique(values: readonly string[]) {
  return [...new Set(values)];
}

function assertProblemEnvelopeShape(problem: ProblemEnvelope) {
  if (problem.artifact_type !== "ProblemEnvelope") {
    throw new Error("problem envelope artifact_type must be ProblemEnvelope");
  }
  if (!/^[A-Z][A-Z0-9_]*$/.test(problem.problem_code)) {
    throw new Error("problem envelope problem_code is invalid");
  }
  if (problem.reason_codes.length === 0) {
    throw new Error("problem envelope requires reason_codes");
  }
}

export function buildGovernanceReadProblemEnvelope(input: {
  correlationId: string;
  detailOverride?: string | null;
  kind: GovernanceReadProblemKind;
  policySnapshotRef?: string | null;
  reasonCodes?: readonly string[];
  tenantId: string | null;
}): GovernanceReadProblemResponse {
  const defaults = problemDefaults[input.kind];
  const problem: ProblemEnvelope = {
    actionability_state: "NO_SAFE_ACTION",
    artifact_type: "ProblemEnvelope",
    correlation_id: input.correlationId,
    detail: input.detailOverride ?? defaults.detail,
    latest_approval_pack_ref: null,
    latest_client_portal_workspace_ref: null,
    latest_command_receipt_ref: null,
    latest_decision_bundle_ref: null,
    latest_policy_snapshot_ref: input.policySnapshotRef ?? null,
    latest_resume_token: null,
    latest_stability_contract_or_null: null,
    latest_stale_guard_value: null,
    latest_upload_session_ref: null,
    latest_workspace_snapshot_ref: null,
    manifest_id: input.tenantId,
    mutation_precondition_binding_or_null: null,
    problem_code: defaults.problemCode,
    reason_codes: unique(input.reasonCodes ?? defaults.reasonCodes),
    rebase_required: false,
    retryable: defaults.retryable,
    stale_guard_family: null,
    suggested_detail_surface_code: "AUDIT_TRAIL",
    title: defaults.title,
    truth_boundary_contract: createProblemTruthBoundaryContract(),
  };
  assertProblemEnvelopeShape(problem);
  return {
    body: problem,
    headers: governanceReadNoStoreHeaders,
    status: defaults.status,
  };
}
