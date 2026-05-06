import { createProblemTruthBoundaryContract } from "../../../../apps/control-plane-api/src/northbound/policy.ts";
import type { ProblemEnvelope } from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type { RouteStabilityContract } from "../../../../packages/generated-models/src/generated/typescript/surface-and-experience.ts";
import { buildAccessRebindRequiredProblem } from "./build_access_rebind_required_problem.ts";
import {
  buildRebaseRequiredProblem,
  manifestRenderFrameBinding,
} from "./build_rebase_required_problem.ts";

export const manifestStreamNoStoreHeaders = {
  "Cache-Control": "no-store",
} as const;

export type ManifestStreamProblemKind =
  | "ACCESS_REBIND_REQUIRED"
  | "CORRUPT"
  | "METHOD_INVALID"
  | "NOT_READY"
  | "REBASE_REQUIRED"
  | "RESUME_TOKEN_REQUIRED"
  | "ROUTE_INVALID";

export type ManifestStreamProblemResponse = {
  body: ProblemEnvelope;
  headers: typeof manifestStreamNoStoreHeaders;
  status: number;
};

const problemDefaults = {
  ACCESS_REBIND_REQUIRED: {
    detail:
      "The manifest stream resume token no longer matches the active session, access binding, masking posture, or schema window.",
    problemCode: "ACCESS_REBIND_REQUIRED",
    reasonCodes: ["ACCESS_REBIND_REQUIRED"],
    rebaseRequired: false,
    retryable: false,
    status: 403,
    staleGuardFamily: null,
    suggestedSurface: "FOCUS_LENS",
    title: "Access rebind is required",
  },
  CORRUPT: {
    detail:
      "The manifest stream could not be emitted because a cursor, event, or recovery marker failed schema validation.",
    problemCode: "MANIFEST_STREAM_CORRUPT",
    reasonCodes: ["MANIFEST_STREAM_CORRUPT"],
    rebaseRequired: false,
    retryable: false,
    status: 500,
    staleGuardFamily: null,
    suggestedSurface: "AUDIT_TRAIL",
    title: "Manifest stream is corrupt",
  },
  METHOD_INVALID: {
    detail: "The manifest experience stream endpoint only supports GET.",
    problemCode: "MANIFEST_STREAM_METHOD_INVALID",
    reasonCodes: ["HTTP_METHOD_INVALID"],
    rebaseRequired: false,
    retryable: false,
    status: 405,
    staleGuardFamily: null,
    suggestedSurface: "FOCUS_LENS",
    title: "Manifest stream method is invalid",
  },
  NOT_READY: {
    detail:
      "The manifest does not have a materialized low-noise experience frame yet; fetch the snapshot route after publication.",
    problemCode: "MANIFEST_STREAM_NOT_READY",
    reasonCodes: ["MANIFEST_STREAM_NOT_READY"],
    rebaseRequired: false,
    retryable: true,
    status: 404,
    staleGuardFamily: null,
    suggestedSurface: "FOCUS_LENS",
    title: "Manifest stream is not ready",
  },
  REBASE_REQUIRED: {
    detail:
      "The manifest stream cursor fell outside the lawful epoch, route, shell, or compaction window and must rebase to the latest snapshot.",
    problemCode: "REBASE_REQUIRED",
    reasonCodes: ["REBASE_REQUIRED"],
    rebaseRequired: true,
    retryable: false,
    status: 409,
    staleGuardFamily: "FRAME_EPOCH",
    suggestedSurface: "FOCUS_LENS",
    title: "Manifest stream rebase is required",
  },
  RESUME_TOKEN_REQUIRED: {
    detail: "The manifest experience stream requires a snapshot-issued resume_token.",
    problemCode: "MANIFEST_RESUME_TOKEN_REQUIRED",
    reasonCodes: ["MANIFEST_RESUME_TOKEN_REQUIRED"],
    rebaseRequired: false,
    retryable: false,
    status: 400,
    staleGuardFamily: null,
    suggestedSurface: "FOCUS_LENS",
    title: "Manifest stream resume token is required",
  },
  ROUTE_INVALID: {
    detail: "The manifest experience stream route did not include a valid manifest id.",
    problemCode: "MANIFEST_STREAM_ROUTE_INVALID",
    reasonCodes: ["HTTP_ROUTE_INVALID"],
    rebaseRequired: false,
    retryable: false,
    status: 404,
    staleGuardFamily: null,
    suggestedSurface: "FOCUS_LENS",
    title: "Manifest stream route is invalid",
  },
} as const;

function unique(values: string[]) {
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
  if (
    problem.actionability_state === "NO_SAFE_ACTION" &&
    problem.suggested_detail_surface_code === null
  ) {
    throw new Error("problem envelope requires a suggested surface when no safe action exists");
  }
}

export function buildManifestStreamProblemEnvelope(input: {
  correlationId: string;
  detailOverride?: string | null;
  kind: ManifestStreamProblemKind;
  latestDecisionBundleRef?: string | null;
  latestResumeToken?: string | null;
  latestStabilityContractOrNull?: RouteStabilityContract | null;
  latestStaleGuardValue?: ProblemEnvelope["latest_stale_guard_value"];
  manifestId: string | null;
  reasonCodes?: string[];
  staleGuardFamily?: ProblemEnvelope["stale_guard_family"];
}): ManifestStreamProblemResponse {
  const defaults = problemDefaults[input.kind];
  const rebaseRequired = defaults.rebaseRequired;
  if (input.kind === "ACCESS_REBIND_REQUIRED") {
    return buildAccessRebindRequiredProblem({
      correlationId: input.correlationId,
      detail: input.detailOverride ?? defaults.detail,
      manifestId: input.manifestId,
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
      throw new Error("manifest stream rebase problems require current grouped recovery state");
    }
    return buildRebaseRequiredProblem({
      correlationId: input.correlationId,
      detail: input.detailOverride ?? defaults.detail,
      latestDecisionBundleRef: input.latestDecisionBundleRef ?? null,
      latestResumeToken: input.latestResumeToken ?? null,
      latestStabilityContract: input.latestStabilityContractOrNull,
      latestStaleGuardValue: input.latestStaleGuardValue,
      manifestId: input.manifestId,
      mutationPreconditionBinding: manifestRenderFrameBinding,
      reasonCodes: input.reasonCodes ?? defaults.reasonCodes,
      scope: "MANIFEST_EXPERIENCE",
      staleGuardFamily: input.staleGuardFamily ?? "FRAME_EPOCH",
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
    latest_decision_bundle_ref: input.latestDecisionBundleRef ?? null,
    latest_policy_snapshot_ref: null,
    latest_resume_token: rebaseRequired ? input.latestResumeToken ?? null : null,
    latest_stability_contract_or_null: rebaseRequired
      ? input.latestStabilityContractOrNull ?? null
      : null,
    latest_stale_guard_value: rebaseRequired
      ? input.latestStaleGuardValue ?? null
      : null,
    latest_upload_session_ref: null,
    latest_workspace_snapshot_ref: null,
    manifest_id: input.manifestId,
    mutation_precondition_binding_or_null: rebaseRequired
      ? manifestRenderFrameBinding
      : null,
    problem_code: defaults.problemCode,
    reason_codes: unique(input.reasonCodes ?? [...defaults.reasonCodes]),
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
    headers: manifestStreamNoStoreHeaders,
    status: defaults.status,
  };
}
