import { createProblemTruthBoundaryContract } from "../../../../apps/control-plane-api/src/northbound/policy.ts";
import type { ProblemEnvelope } from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";

export const clientPortalReadNoStoreHeaders = {
  "Cache-Control": "no-store",
} as const;

export type ClientPortalReadProblemKind =
  | "CORRUPT"
  | "HIDDEN"
  | "METHOD_INVALID"
  | "NOT_READY"
  | "QUERY_INVALID"
  | "ROUTE_INVALID";

export type ClientPortalReadProblemResponse = {
  body: ProblemEnvelope;
  headers: typeof clientPortalReadNoStoreHeaders;
  status: number;
};

const problemDefaults = {
  CORRUPT: {
    detail:
      "A client portal workspace projection exists but failed contract validation, so the customer-safe payload was not emitted.",
    problemCode: "CLIENT_PORTAL_READ_CORRUPT",
    reasonCodes: ["CLIENT_PORTAL_READ_CORRUPT"],
    retryable: false,
    status: 500,
    title: "Client portal read is corrupt",
  },
  HIDDEN: {
    detail: "No client portal workspace projection is visible for this actor and client.",
    problemCode: "CLIENT_PORTAL_READ_NOT_VISIBLE",
    reasonCodes: ["CLIENT_PORTAL_READ_NOT_VISIBLE"],
    retryable: false,
    status: 404,
    title: "Client portal read is not visible",
  },
  METHOD_INVALID: {
    detail: "Client portal read endpoints only support GET.",
    problemCode: "CLIENT_PORTAL_READ_METHOD_INVALID",
    reasonCodes: ["HTTP_METHOD_INVALID"],
    retryable: false,
    status: 405,
    title: "Client portal read method is invalid",
  },
  NOT_READY: {
    detail:
      "The client does not have a materialized customer-safe portal workspace for this route yet.",
    problemCode: "CLIENT_PORTAL_READ_NOT_READY",
    reasonCodes: ["CLIENT_PORTAL_READ_NOT_READY"],
    retryable: true,
    status: 404,
    title: "Client portal read is not ready",
  },
  QUERY_INVALID: {
    detail: "The client portal read query focus, route context, or artifact selection is invalid.",
    problemCode: "CLIENT_PORTAL_READ_QUERY_INVALID",
    reasonCodes: ["CLIENT_PORTAL_READ_QUERY_INVALID"],
    retryable: false,
    status: 400,
    title: "Client portal read query is invalid",
  },
  ROUTE_INVALID: {
    detail: "The client portal read route did not match a supported portal route.",
    problemCode: "CLIENT_PORTAL_READ_ROUTE_INVALID",
    reasonCodes: ["HTTP_ROUTE_INVALID"],
    retryable: false,
    status: 404,
    title: "Client portal read route is invalid",
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

export function buildClientPortalReadProblemEnvelope(input: {
  clientId: string | null;
  correlationId: string;
  detailOverride?: string | null;
  kind: ClientPortalReadProblemKind;
  latestClientPortalWorkspaceRef?: string | null;
  latestStaleGuardValue?: string | null;
  reasonCodes?: readonly string[];
  tenantId: string | null;
}): ClientPortalReadProblemResponse {
  const defaults = problemDefaults[input.kind];
  const problem: ProblemEnvelope = {
    actionability_state: "NO_SAFE_ACTION",
    artifact_type: "ProblemEnvelope",
    correlation_id: input.correlationId,
    detail: input.detailOverride ?? defaults.detail,
    latest_approval_pack_ref: null,
    latest_client_portal_workspace_ref: input.latestClientPortalWorkspaceRef ?? null,
    latest_command_receipt_ref: null,
    latest_decision_bundle_ref: null,
    latest_policy_snapshot_ref: null,
    latest_resume_token: null,
    latest_stability_contract_or_null: null,
    latest_stale_guard_value: input.latestStaleGuardValue ?? null,
    latest_upload_session_ref: null,
    latest_workspace_snapshot_ref: null,
    manifest_id: input.tenantId,
    mutation_precondition_binding_or_null: null,
    problem_code: defaults.problemCode,
    reason_codes: unique(input.reasonCodes ?? defaults.reasonCodes),
    rebase_required: false,
    retryable: defaults.retryable,
    stale_guard_family:
      input.latestStaleGuardValue === undefined || input.latestStaleGuardValue === null
        ? null
        : "CLIENT_PORTAL_WORKSPACE_VERSION",
    suggested_detail_surface_code: "FOCUS_LENS",
    title: defaults.title,
    truth_boundary_contract: createProblemTruthBoundaryContract(),
  };
  assertProblemEnvelopeShape(problem);
  return {
    body: problem,
    headers: clientPortalReadNoStoreHeaders,
    status: defaults.status,
  };
}
