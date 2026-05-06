import { buildProblemEnvelope } from "../../../../apps/control-plane-api/src/northbound/build_problem_envelope.ts";
import {
  loadNorthboundPolicyBundle,
  type NorthboundPolicyBundle,
  type NorthboundRouteState,
  type ProblemCodeCatalogRow,
  type StaleGuardFamily,
} from "../../../../apps/control-plane-api/src/northbound/policy.ts";
import type { ParsedCommandEnvelope } from "../../../../apps/control-plane-api/src/northbound/parse_command_envelope.ts";
import type {
  MutationPreconditionBinding,
  ProblemEnvelope,
} from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type { RouteStabilityContract } from "../../../../packages/generated-models/src/generated/typescript/surface-and-experience.ts";

export type CommandRejectionProblem = {
  problem: ProblemEnvelope;
  status: number;
};

function problemRow(bundle: NorthboundPolicyBundle, problemCode: string): ProblemCodeCatalogRow {
  const row = bundle.problemCodesByCode.get(problemCode);
  if (!row) {
    throw new Error(`Unknown northbound problem code ${problemCode}.`);
  }
  return row;
}

export async function buildProblemEnvelopeForCommandRejection(input: {
  correlationId: string;
  detailOverride?: string | null;
  latestCommandReceiptRefOrNull?: string | null;
  latestStabilityContractOrNull?: RouteStabilityContract | null;
  latestStaleGuardValue?: ProblemEnvelope["latest_stale_guard_value"];
  mutationPreconditionBindingOrNull?: MutationPreconditionBinding | null;
  parsed?: ParsedCommandEnvelope;
  policyBundle?: NorthboundPolicyBundle;
  problemCode: string;
  reasonCodes?: string[];
  routeState?: NorthboundRouteState | null;
  staleGuardFamily?: StaleGuardFamily | null;
}): Promise<CommandRejectionProblem> {
  const policyBundle = input.policyBundle ?? (await loadNorthboundPolicyBundle());
  const row = problemRow(policyBundle, input.problemCode);
  const problemInput = {
    correlationId: input.correlationId,
    latestCommandReceiptRefOrNull: input.latestCommandReceiptRefOrNull ?? null,
    latestStabilityContractOrNull: input.latestStabilityContractOrNull ?? null,
    latestStaleGuardValue: input.latestStaleGuardValue ?? null,
    policyBundle,
    problemCode: row.problem_code,
    routeState: input.routeState ?? null,
    staleGuardFamily: input.staleGuardFamily ?? null,
  } as Parameters<typeof buildProblemEnvelope>[0];
  if (input.detailOverride !== undefined) {
    problemInput.detailOverride = input.detailOverride;
  }
  if (input.mutationPreconditionBindingOrNull !== undefined) {
    problemInput.mutationPreconditionBindingOrNull =
      input.mutationPreconditionBindingOrNull;
  }
  if (input.parsed !== undefined) {
    problemInput.parsed = input.parsed;
  }
  if (input.reasonCodes !== undefined) {
    problemInput.reasonCodes = input.reasonCodes;
  }
  const problem = buildProblemEnvelope(problemInput);
  return {
    problem,
    status: row.http_status,
  };
}
