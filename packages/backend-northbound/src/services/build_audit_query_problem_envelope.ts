import { createProblemTruthBoundaryContract } from "../../../../apps/control-plane-api/src/northbound/policy.ts";
import type { ProblemEnvelope } from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";

export const auditQueryNoStoreHeaders = {
  "Cache-Control": "no-store",
} as const;

export type AuditQueryProblemKind =
  | "CORRUPT"
  | "HIDDEN"
  | "METHOD_INVALID"
  | "NOT_READY"
  | "QUERY_INVALID"
  | "ROUTE_INVALID";

export type AuditQueryProblemResponse = {
  body: ProblemEnvelope;
  headers: typeof auditQueryNoStoreHeaders;
  status: number;
};

const problemDefaults = {
  CORRUPT: {
    detail:
      "The audit or enquiry read artifact exists but failed contract validation, so it was not emitted.",
    problemCode: "AUDIT_QUERY_CORRUPT",
    reasonCodes: ["AUDIT_QUERY_CORRUPT"],
    retryable: false,
    status: 500,
    title: "Audit query is corrupt",
  },
  HIDDEN: {
    detail: "No audit or enquiry artifact is visible for this actor and route.",
    problemCode: "AUDIT_QUERY_NOT_VISIBLE",
    reasonCodes: ["AUDIT_QUERY_NOT_VISIBLE"],
    retryable: false,
    status: 404,
    title: "Audit query is not visible",
  },
  METHOD_INVALID: {
    detail: "Audit and enquiry read endpoints only support GET.",
    problemCode: "AUDIT_QUERY_METHOD_INVALID",
    reasonCodes: ["HTTP_METHOD_INVALID"],
    retryable: false,
    status: 405,
    title: "Audit query method is invalid",
  },
  NOT_READY: {
    detail: "No deterministic audit or enquiry artifact has been materialized for this route yet.",
    problemCode: "AUDIT_QUERY_NOT_READY",
    reasonCodes: ["AUDIT_QUERY_NOT_READY"],
    retryable: true,
    status: 404,
    title: "Audit query is not ready",
  },
  QUERY_INVALID: {
    detail: "The audit query filters, cursor, target, or focus anchor are invalid.",
    problemCode: "AUDIT_QUERY_INVALID",
    reasonCodes: ["AUDIT_QUERY_INVALID"],
    retryable: false,
    status: 400,
    title: "Audit query is invalid",
  },
  ROUTE_INVALID: {
    detail: "The audit or enquiry route did not include a valid manifest or tenant id.",
    problemCode: "AUDIT_QUERY_ROUTE_INVALID",
    reasonCodes: ["HTTP_ROUTE_INVALID"],
    retryable: false,
    status: 404,
    title: "Audit query route is invalid",
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

export function buildAuditQueryProblemEnvelope(input: {
  correlationId: string;
  detailOverride?: string | null;
  kind: AuditQueryProblemKind;
  manifestId?: string | null;
  reasonCodes?: readonly string[];
}): AuditQueryProblemResponse {
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
    latest_policy_snapshot_ref: null,
    latest_resume_token: null,
    latest_stability_contract_or_null: null,
    latest_stale_guard_value: null,
    latest_upload_session_ref: null,
    latest_workspace_snapshot_ref: null,
    manifest_id: input.manifestId ?? null,
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
    headers: auditQueryNoStoreHeaders,
    status: defaults.status,
  };
}
