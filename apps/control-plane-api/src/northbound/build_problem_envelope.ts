import { createProblemTruthBoundaryContract, selectRecoveryRefs } from "./policy.ts";
import type { ParsedCommandEnvelope } from "./parse_command_envelope.ts";
import type {
  MutationPreconditionBinding,
  ProblemEnvelope,
} from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type { RouteStabilityContract } from "../../../../packages/generated-models/src/generated/typescript/surface-and-experience.ts";
import type {
  CommandFamilyPolicyRow,
  NorthboundPolicyBundle,
  NorthboundRouteState,
  ProblemActionabilityState,
  ProblemSurfaceCode,
  StaleGuardFamily,
} from "./policy.ts";

export type BuildProblemEnvelopeInput = {
  problemCode: string;
  policyBundle: NorthboundPolicyBundle;
  correlationId: string;
  parsed?: ParsedCommandEnvelope;
  commandFamily?: CommandFamilyPolicyRow;
  detailOverride?: string | null;
  reasonCodes?: string[];
  latestCommandReceiptRefOrNull?: string | null;
  mutationPreconditionBindingOrNull?: MutationPreconditionBinding | null;
  staleGuardFamily?: StaleGuardFamily | null;
  latestStaleGuardValue?: ProblemEnvelope["latest_stale_guard_value"];
  latestStabilityContractOrNull?: RouteStabilityContract | null;
  routeState?: NorthboundRouteState | null;
  recoveryRefFamilyOverride?: Parameters<typeof selectRecoveryRefs>[1];
  latestResumeTokenOverride?: string | null;
  actionabilityStateOverride?: ProblemActionabilityState;
  suggestedDetailSurfaceCodeOverride?: ProblemSurfaceCode;
};

export function buildProblemEnvelope(input: BuildProblemEnvelopeInput): ProblemEnvelope {
  const row = input.policyBundle.problemCodesByCode.get(input.problemCode);
  if (!row) {
    throw new Error(`Unknown problem code ${input.problemCode}.`);
  }

  const commandFamily = input.commandFamily ?? input.parsed?.commandFamily ?? null;
  const routeState = input.routeState ?? null;
  const recoveryRefFamily =
    input.recoveryRefFamilyOverride ?? commandFamily?.default_recovery_ref_family ?? null;
  const recoveryRefs =
    routeState && recoveryRefFamily ? selectRecoveryRefs(routeState, recoveryRefFamily) : null;
  const actionabilityState = input.actionabilityStateOverride ?? row.actionability_state;
  const suggestedDetailSurfaceCode =
    actionabilityState === "ACTION_AVAILABLE"
      ? null
      : input.suggestedDetailSurfaceCodeOverride ??
        commandFamily?.default_problem_detail_surface_code ??
        row.suggested_detail_surface_code;

  return {
    artifact_type: "ProblemEnvelope",
    problem_code: row.problem_code,
    title: row.title,
    detail: input.detailOverride ?? row.detail_template,
    reason_codes: [...new Set(input.reasonCodes ?? row.default_reason_codes)],
    retryable: row.retryable,
    correlation_id: input.correlationId,
    manifest_id: input.parsed?.command.manifest_id ?? null,
    latest_decision_bundle_ref: recoveryRefs?.latest_decision_bundle_ref ?? null,
    latest_workspace_snapshot_ref: recoveryRefs?.latest_workspace_snapshot_ref ?? null,
    latest_approval_pack_ref: recoveryRefs?.latest_approval_pack_ref ?? null,
    latest_client_portal_workspace_ref:
      recoveryRefs?.latest_client_portal_workspace_ref ?? null,
    latest_upload_session_ref: recoveryRefs?.latest_upload_session_ref ?? null,
    latest_policy_snapshot_ref: recoveryRefs?.latest_policy_snapshot_ref ?? null,
    latest_command_receipt_ref: input.latestCommandReceiptRefOrNull ?? null,
    truth_boundary_contract: createProblemTruthBoundaryContract(),
    mutation_precondition_binding_or_null:
      input.mutationPreconditionBindingOrNull ??
      (row.rebase_required
        ? input.parsed?.command.mutation_precondition_binding ?? null
        : null),
    stale_guard_family: row.rebase_required ? input.staleGuardFamily ?? null : null,
    latest_stale_guard_value: row.rebase_required ? input.latestStaleGuardValue ?? null : null,
    latest_resume_token:
      input.latestResumeTokenOverride ??
      recoveryRefs?.latest_resume_token ??
      null,
    latest_stability_contract_or_null:
      row.rebase_required ? input.latestStabilityContractOrNull ?? null : null,
    rebase_required: row.rebase_required,
    actionability_state: actionabilityState,
    suggested_detail_surface_code: suggestedDetailSurfaceCode,
  };
}
