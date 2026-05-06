import { createProblemTruthBoundaryContract } from "../../../../apps/control-plane-api/src/northbound/policy.ts";
import type { ProblemEnvelope } from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";

export const experienceSnapshotNoStoreHeaders = {
  "Cache-Control": "no-store",
} as const;

export type ExperienceSnapshotProblemKind =
  | "CORRUPT"
  | "HIDDEN"
  | "METHOD_INVALID"
  | "NOT_READY"
  | "ROUTE_INVALID";

export type ExperienceSnapshotProblemResponse = {
  body: ProblemEnvelope;
  headers: typeof experienceSnapshotNoStoreHeaders;
  status: number;
};

const problemDefaults = {
  CORRUPT: {
    detail:
      "A materialized low-noise experience frame exists but failed publication validation, so snapshot recovery data was not emitted.",
    problemCode: "EXPERIENCE_SNAPSHOT_CORRUPT",
    reasonCodes: ["EXPERIENCE_SNAPSHOT_CORRUPT"],
    retryable: false,
    status: 500,
    suggestedSurface: "AUDIT_TRAIL",
    title: "Experience snapshot is corrupt",
  },
  HIDDEN: {
    detail: "No experience snapshot is visible for this manifest.",
    problemCode: "EXPERIENCE_SNAPSHOT_NOT_READY",
    reasonCodes: ["EXPERIENCE_SNAPSHOT_NOT_READY"],
    retryable: true,
    status: 404,
    suggestedSurface: "FOCUS_LENS",
    title: "Experience snapshot is not ready",
  },
  METHOD_INVALID: {
    detail: "The experience snapshot endpoint only supports GET.",
    problemCode: "EXPERIENCE_SNAPSHOT_METHOD_INVALID",
    reasonCodes: ["HTTP_METHOD_INVALID"],
    retryable: false,
    status: 405,
    suggestedSurface: "FOCUS_LENS",
    title: "Experience snapshot method is invalid",
  },
  NOT_READY: {
    detail:
      "The manifest does not have a materialized low-noise experience frame yet; retry the snapshot route after projection publication or continue through the typed command receipt surface.",
    problemCode: "EXPERIENCE_SNAPSHOT_NOT_READY",
    reasonCodes: ["EXPERIENCE_SNAPSHOT_NOT_READY"],
    retryable: true,
    status: 404,
    suggestedSurface: "FOCUS_LENS",
    title: "Experience snapshot is not ready",
  },
  ROUTE_INVALID: {
    detail: "The experience snapshot route did not include a valid manifest id.",
    problemCode: "EXPERIENCE_SNAPSHOT_ROUTE_INVALID",
    reasonCodes: ["HTTP_ROUTE_INVALID"],
    retryable: false,
    status: 404,
    suggestedSurface: "FOCUS_LENS",
    title: "Experience snapshot route is invalid",
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
  if (
    problem.actionability_state === "NO_SAFE_ACTION" &&
    problem.suggested_detail_surface_code === null
  ) {
    throw new Error("problem envelope requires a suggested surface when no safe action exists");
  }
}

export function buildExperienceSnapshotNotReadyProblem(input: {
  correlationId: string;
  detailOverride?: string | null;
  kind?: ExperienceSnapshotProblemKind;
  manifestId: string | null;
  reasonCodes?: string[];
}): ExperienceSnapshotProblemResponse {
  const defaults = problemDefaults[input.kind ?? "NOT_READY"];
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
    manifest_id: input.manifestId,
    mutation_precondition_binding_or_null: null,
    problem_code: defaults.problemCode,
    reason_codes: unique(input.reasonCodes ?? [...defaults.reasonCodes]),
    rebase_required: false,
    retryable: defaults.retryable,
    stale_guard_family: null,
    suggested_detail_surface_code: defaults.suggestedSurface,
    title: defaults.title,
    truth_boundary_contract: createProblemTruthBoundaryContract(),
  };
  assertProblemEnvelopeShape(problem);
  return {
    body: problem,
    headers: experienceSnapshotNoStoreHeaders,
    status: defaults.status,
  };
}
