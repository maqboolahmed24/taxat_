import { createProblemTruthBoundaryContract } from "../../../../apps/control-plane-api/src/northbound/policy.ts";
import type { ProblemEnvelope } from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import { commandReceiptNoStoreHeaders } from "./build_command_receipt_response.ts";

export type CommandReceiptProblemKind =
  | "CORRUPT"
  | "METHOD_INVALID"
  | "NOT_FOUND"
  | "ROUTE_INVALID";

export type CommandReceiptProblemEnvelope = {
  body: ProblemEnvelope;
  headers: typeof commandReceiptNoStoreHeaders;
  status: number;
};

const problemDefaults = {
  CORRUPT: {
    actionabilityState: "NO_SAFE_ACTION",
    detail:
      "A durable command receipt exists but failed contract validation, so recovery data was not emitted.",
    problemCode: "COMMAND_RECEIPT_CORRUPT",
    reasonCodes: ["COMMAND_RECEIPT_CORRUPT"],
    retryable: false,
    status: 500,
    suggestedSurface: "AUDIT_TRAIL",
    title: "Command receipt is corrupt",
  },
  METHOD_INVALID: {
    actionabilityState: "NO_SAFE_ACTION",
    detail: "The command receipt recovery endpoint only supports GET.",
    problemCode: "COMMAND_RECEIPT_METHOD_INVALID",
    reasonCodes: ["HTTP_METHOD_INVALID"],
    retryable: false,
    status: 405,
    suggestedSurface: "FOCUS_LENS",
    title: "Command receipt method is invalid",
  },
  NOT_FOUND: {
    actionabilityState: "NO_SAFE_ACTION",
    detail: "No durable command receipt is visible for this command id.",
    problemCode: "COMMAND_RECEIPT_NOT_FOUND",
    reasonCodes: ["COMMAND_RECEIPT_NOT_FOUND"],
    retryable: true,
    status: 404,
    suggestedSurface: "FOCUS_LENS",
    title: "Command receipt was not found",
  },
  ROUTE_INVALID: {
    actionabilityState: "NO_SAFE_ACTION",
    detail: "The command receipt recovery route did not include a valid command id.",
    problemCode: "COMMAND_RECEIPT_ROUTE_INVALID",
    reasonCodes: ["HTTP_ROUTE_INVALID"],
    retryable: false,
    status: 404,
    suggestedSurface: "FOCUS_LENS",
    title: "Command receipt route is invalid",
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

export function buildCommandReceiptProblemEnvelope(input: {
  correlationId: string;
  detailOverride?: string | null;
  kind: CommandReceiptProblemKind;
  latestCommandReceiptRefOrNull?: string | null;
  manifestIdOrNull?: string | null;
  reasonCodes?: string[];
}): CommandReceiptProblemEnvelope {
  const defaults = problemDefaults[input.kind];
  const problem: ProblemEnvelope = {
    actionability_state: defaults.actionabilityState,
    artifact_type: "ProblemEnvelope",
    correlation_id: input.correlationId,
    detail: input.detailOverride ?? defaults.detail,
    latest_approval_pack_ref: null,
    latest_client_portal_workspace_ref: null,
    latest_command_receipt_ref: input.latestCommandReceiptRefOrNull ?? null,
    latest_decision_bundle_ref: null,
    latest_policy_snapshot_ref: null,
    latest_resume_token: null,
    latest_stability_contract_or_null: null,
    latest_stale_guard_value: null,
    latest_upload_session_ref: null,
    latest_workspace_snapshot_ref: null,
    manifest_id: input.manifestIdOrNull ?? null,
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
    headers: commandReceiptNoStoreHeaders,
    status: defaults.status,
  };
}
