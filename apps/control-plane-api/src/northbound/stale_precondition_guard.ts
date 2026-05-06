import {
  buildRouteStabilityContract,
  selectRecoveryRefs,
  type CommandBindingKey,
  type NorthboundRouteState,
  type RecoveryRefFamily,
  type StaleGuardFamily,
  type StaleGuardValue,
} from "./policy.ts";
import type { ParsedCommandEnvelope } from "./parse_command_envelope.ts";
import type { RouteStabilityContract } from "../../../../packages/generated-models/src/generated/typescript/surface-and-experience.ts";

export type StalePreconditionDecision =
  | {
      outcome: "CURRENT";
      routeStabilityContract: RouteStabilityContract;
    }
  | {
      outcome: "STALE";
      routeStabilityContract: RouteStabilityContract;
      problemCode: string;
      reasonCodes: string[];
      staleGuardFamily: StaleGuardFamily;
      latestStaleGuardValue: StaleGuardValue;
      latestCommandReceiptRefOrNull: string | null;
      recoveryRefs: ReturnType<typeof selectRecoveryRefs>;
    };

function commandBindingValue(parsed: ParsedCommandEnvelope, commandBinding: CommandBindingKey) {
  if (commandBinding === "mutation_basis_contract_hash") {
    return parsed.command.mutation_basis_contract?.basis_contract_hash ?? null;
  }
  return parsed.command[commandBinding];
}

function reasonCodeForFamily(staleGuardFamily: StaleGuardFamily) {
  return `${staleGuardFamily}_MISMATCH`;
}

export function evaluateStalePreconditions(
  parsed: ParsedCommandEnvelope,
  routeState: NorthboundRouteState,
): StalePreconditionDecision {
  const routeStabilityContract = buildRouteStabilityContract(routeState);
  const profile = parsed.policyBundle.staleProfilesByCode.get(
    parsed.commandFamily.mutation_precondition_binding.profile_code,
  );
  if (!profile) {
    throw new Error(
      `Missing stale profile ${parsed.commandFamily.mutation_precondition_binding.profile_code}.`,
    );
  }

  for (const guardRow of profile.guard_rows) {
    const commandValue = commandBindingValue(parsed, guardRow.command_binding);
    const currentValue = routeState.guard_vector_components[guardRow.route_component] ?? null;
    if (commandValue === currentValue || currentValue === null) {
      continue;
    }
    return {
      outcome: "STALE",
      routeStabilityContract,
      problemCode: guardRow.mismatch_problem_code,
      reasonCodes: [reasonCodeForFamily(guardRow.stale_guard_family)],
      staleGuardFamily: guardRow.stale_guard_family,
      latestStaleGuardValue: currentValue as StaleGuardValue,
      latestCommandReceiptRefOrNull: routeState.latest_refs.command_receipt_ref_or_null,
      recoveryRefs: selectRecoveryRefs(
        routeState,
        guardRow.recovery_ref_family as RecoveryRefFamily,
      ),
    };
  }

  return {
    outcome: "CURRENT",
    routeStabilityContract,
  };
}
