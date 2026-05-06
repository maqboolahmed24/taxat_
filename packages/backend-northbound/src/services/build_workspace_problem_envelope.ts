import { createProblemTruthBoundaryContract } from "../../../../apps/control-plane-api/src/northbound/policy.ts";
import type { ProblemEnvelope } from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type { RouteStabilityContract } from "../../../../packages/generated-models/src/generated/typescript/surface-and-experience.ts";
import { buildAccessRebindRequiredProblem } from "./build_access_rebind_required_problem.ts";
import {
  buildRebaseRequiredProblem,
  workspaceStreamRebaseBinding,
} from "./build_rebase_required_problem.ts";

export const workspaceReadNoStoreHeaders = {
  "Cache-Control": "no-store",
} as const;

export type WorkspaceReadProblemKind =
  | "ACCESS_REBIND_REQUIRED"
  | "CORRUPT"
  | "HIDDEN"
  | "METHOD_INVALID"
  | "NOT_READY"
  | "QUERY_INVALID"
  | "REBASE_REQUIRED"
  | "RESUME_TOKEN_REQUIRED"
  | "ROUTE_INVALID";

export type WorkspaceReadProblemResponse = {
  body: ProblemEnvelope;
  headers: typeof workspaceReadNoStoreHeaders;
  status: number;
};

const problemDefaults = {
  ACCESS_REBIND_REQUIRED: {
    detail:
      "The workspace read no longer matches the active session, access binding, masking posture, or schema window.",
    problemCode: "ACCESS_REBIND_REQUIRED",
    reasonCodes: ["ACCESS_REBIND_REQUIRED"],
    rebaseRequired: false,
    retryable: false,
    status: 403,
    staleGuardFamily: null,
    suggestedSurface: "CUSTOMER_ACTIVITY",
    title: "Access rebind is required",
  },
  CORRUPT: {
    detail:
      "A collaboration workspace read artifact exists but failed contract validation, so it was not emitted.",
    problemCode: "WORKSPACE_READ_CORRUPT",
    reasonCodes: ["WORKSPACE_READ_CORRUPT"],
    rebaseRequired: false,
    retryable: false,
    status: 500,
    staleGuardFamily: null,
    suggestedSurface: "AUDIT_TRAIL",
    title: "Workspace read is corrupt",
  },
  HIDDEN: {
    detail: "No collaboration workspace projection is visible for this actor and work item.",
    problemCode: "WORKSPACE_READ_NOT_VISIBLE",
    reasonCodes: ["WORKSPACE_READ_NOT_VISIBLE"],
    rebaseRequired: false,
    retryable: false,
    status: 404,
    staleGuardFamily: null,
    suggestedSurface: "CUSTOMER_ACTIVITY",
    title: "Workspace read is not visible",
  },
  METHOD_INVALID: {
    detail: "Collaboration workspace read endpoints only support GET.",
    problemCode: "WORKSPACE_READ_METHOD_INVALID",
    reasonCodes: ["HTTP_METHOD_INVALID"],
    rebaseRequired: false,
    retryable: false,
    status: 405,
    staleGuardFamily: null,
    suggestedSurface: "CUSTOMER_ACTIVITY",
    title: "Workspace read method is invalid",
  },
  NOT_READY: {
    detail:
      "The work item does not have a materialized collaboration workspace projection for this route yet.",
    problemCode: "WORKSPACE_READ_NOT_READY",
    reasonCodes: ["WORKSPACE_READ_NOT_READY"],
    rebaseRequired: false,
    retryable: true,
    status: 404,
    staleGuardFamily: null,
    suggestedSurface: "CUSTOMER_ACTIVITY",
    title: "Workspace read is not ready",
  },
  QUERY_INVALID: {
    detail: "The workspace read query, thread filter, visibility filter, or route context is invalid.",
    problemCode: "WORKSPACE_READ_QUERY_INVALID",
    reasonCodes: ["WORKSPACE_READ_QUERY_INVALID"],
    rebaseRequired: false,
    retryable: false,
    status: 400,
    staleGuardFamily: null,
    suggestedSurface: "CUSTOMER_ACTIVITY",
    title: "Workspace read query is invalid",
  },
  REBASE_REQUIRED: {
    detail:
      "The workspace stream cursor fell outside the lawful epoch, route, shell, visibility, or compaction window and must rebase to the latest snapshot.",
    problemCode: "REBASE_REQUIRED",
    reasonCodes: ["REBASE_REQUIRED"],
    rebaseRequired: true,
    retryable: false,
    status: 409,
    staleGuardFamily: "FRAME_EPOCH",
    suggestedSurface: "CUSTOMER_ACTIVITY",
    title: "Workspace stream rebase is required",
  },
  RESUME_TOKEN_REQUIRED: {
    detail: "The workspace stream requires a snapshot-issued resume_token.",
    problemCode: "WORKSPACE_RESUME_TOKEN_REQUIRED",
    reasonCodes: ["WORKSPACE_RESUME_TOKEN_REQUIRED"],
    rebaseRequired: false,
    retryable: false,
    status: 400,
    staleGuardFamily: null,
    suggestedSurface: "CUSTOMER_ACTIVITY",
    title: "Workspace stream resume token is required",
  },
  ROUTE_INVALID: {
    detail: "The collaboration workspace route did not include a valid work item id.",
    problemCode: "WORKSPACE_READ_ROUTE_INVALID",
    reasonCodes: ["HTTP_ROUTE_INVALID"],
    rebaseRequired: false,
    retryable: false,
    status: 404,
    staleGuardFamily: null,
    suggestedSurface: "CUSTOMER_ACTIVITY",
    title: "Workspace read route is invalid",
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
  if (problem.rebase_required && problem.latest_stability_contract_or_null === null) {
    throw new Error("rebase problem envelope requires latest stability contract");
  }
}

export function buildWorkspaceProblemEnvelope(input: {
  correlationId: string;
  detailOverride?: string | null;
  itemId: string | null;
  kind: WorkspaceReadProblemKind;
  latestResumeToken?: string | null;
  latestStabilityContractOrNull?: RouteStabilityContract | null;
  latestStaleGuardValue?: ProblemEnvelope["latest_stale_guard_value"];
  latestWorkspaceSnapshotRef?: string | null;
  reasonCodes?: readonly string[];
  staleGuardFamily?: ProblemEnvelope["stale_guard_family"];
  tenantId?: string | null;
}): WorkspaceReadProblemResponse {
  const defaults = problemDefaults[input.kind];
  const rebaseRequired = defaults.rebaseRequired;
  if (input.kind === "ACCESS_REBIND_REQUIRED") {
    return buildAccessRebindRequiredProblem({
      audience: "PORTAL",
      correlationId: input.correlationId,
      detail: input.detailOverride ?? defaults.detail,
      manifestId: input.tenantId ?? input.itemId,
      reasonCodes: input.reasonCodes ?? defaults.reasonCodes,
      suggestedDetailSurfaceCode: defaults.suggestedSurface,
      title: defaults.title,
    });
  }
  if (input.kind === "REBASE_REQUIRED") {
    if (
      input.latestStabilityContractOrNull === undefined ||
      input.latestStabilityContractOrNull === null ||
      input.latestStaleGuardValue === undefined ||
      input.latestStaleGuardValue === null
    ) {
      throw new Error("workspace rebase problems require current grouped recovery state");
    }
    return buildRebaseRequiredProblem({
      audience: "PORTAL",
      correlationId: input.correlationId,
      detail: input.detailOverride ?? defaults.detail,
      latestResumeToken: input.latestResumeToken ?? null,
      latestStabilityContract: input.latestStabilityContractOrNull,
      latestStaleGuardValue: input.latestStaleGuardValue,
      latestWorkspaceSnapshotRef: input.latestWorkspaceSnapshotRef ?? null,
      manifestId: input.tenantId ?? input.itemId,
      mutationPreconditionBinding: workspaceStreamRebaseBinding,
      reasonCodes: input.reasonCodes ?? defaults.reasonCodes,
      scope: "WORKSPACE",
      staleGuardFamily: input.staleGuardFamily ?? "WORK_ITEM_VERSION",
      suggestedDetailSurfaceCode: defaults.suggestedSurface,
      title: defaults.title,
    });
  }
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
    latest_resume_token: rebaseRequired ? input.latestResumeToken ?? null : null,
    latest_stability_contract_or_null: rebaseRequired
      ? input.latestStabilityContractOrNull ?? null
      : null,
    latest_stale_guard_value: rebaseRequired
      ? input.latestStaleGuardValue ?? null
      : null,
    latest_upload_session_ref: null,
    latest_workspace_snapshot_ref: input.latestWorkspaceSnapshotRef ?? null,
    manifest_id: input.tenantId ?? input.itemId,
    mutation_precondition_binding_or_null: rebaseRequired ? workspaceStreamRebaseBinding : null,
    problem_code: defaults.problemCode,
    reason_codes: unique(input.reasonCodes ?? defaults.reasonCodes),
    rebase_required: rebaseRequired,
    retryable: defaults.retryable,
    stale_guard_family: rebaseRequired
      ? input.staleGuardFamily ?? defaults.staleGuardFamily
      : null,
    suggested_detail_surface_code: defaults.suggestedSurface,
    title: defaults.title,
    truth_boundary_contract: createProblemTruthBoundaryContract(),
  };
  assertProblemEnvelopeShape(problem);
  return {
    body: problem,
    headers: workspaceReadNoStoreHeaders,
    status: defaults.status,
  };
}
