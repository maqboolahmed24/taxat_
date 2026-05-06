import type { InteractionLayerFoundationContract } from "../route_contracts/interaction_layer_foundation";
import type { ShellFamilyCode } from "../route_contracts/semantic_accessibility";
import { expectedShellFoundationContracts } from "../tokens/shell_token_contracts";
import { failInteractionContract } from "./interaction_contract_errors";

export type InteractionLayerShellFamily = ShellFamilyCode;

export const orderedInteractionLayerShellFamilies = [
  "CALM_SHELL",
  "CLIENT_PORTAL_SHELL",
  "GOVERNANCE_DENSITY_SHELL",
] as const satisfies readonly InteractionLayerShellFamily[];

const baseFoundationContract = {
  contract_version: "CROSS_SHELL_INTERACTION_FOUNDATION_V1",
  design_token_binding_policy: "EXPLICIT_SEMANTIC_BINDINGS_ONLY",
  support_surface_policy: "ONE_PROMOTED_SUPPORT_SURFACE_MAX",
  motion_profile: "SUBTLE_CAUSAL_ONLY",
  motion_token: "SUBTLE_CAUSAL_MOTION_V1",
  feedback_truth_policy: "DURABLE_RECEIPT_AND_TYPED_FAILURE_DRIVEN",
  platform_parity_policy: "SAME_FAMILY_REUSES_SAME_INTERACTION_GRAMMAR",
} as const;

export const interactionFoundationContracts = Object.freeze(
  Object.fromEntries(
    orderedInteractionLayerShellFamilies.map((shellFamily) => [
      shellFamily,
      Object.freeze({
        ...baseFoundationContract,
        ...expectedShellFoundationContracts[shellFamily],
      }),
    ]),
  ) as Record<InteractionLayerShellFamily, InteractionLayerFoundationContract>,
);

export function buildInteractionLayerFoundationContract(shellFamily: InteractionLayerShellFamily) {
  return {
    ...interactionFoundationContracts[shellFamily],
  } satisfies InteractionLayerFoundationContract;
}

export function assertInteractionFoundationAlignment(
  shellFamily: InteractionLayerShellFamily,
  foundationContract: InteractionLayerFoundationContract | null | undefined,
) {
  if (!foundationContract) {
    failInteractionContract(
      "INTERACTION_FOUNDATION_MISSING",
      `Missing InteractionLayerFoundationContract for ${shellFamily}.`,
      { shell_family: shellFamily },
    );
  }

  if (foundationContract.shell_family !== shellFamily) {
    failInteractionContract(
      "INTERACTION_FOUNDATION_FAMILY_MISMATCH",
      `Foundation shell family ${foundationContract.shell_family} cannot back ${shellFamily}.`,
      {
        expected_shell_family: shellFamily,
        received_shell_family: foundationContract.shell_family,
      },
    );
  }

  const expected = interactionFoundationContracts[shellFamily];
  for (const key of Object.keys(expected) as (keyof InteractionLayerFoundationContract)[]) {
    if (foundationContract[key] !== expected[key]) {
      failInteractionContract(
        key === "selector_profile"
          ? "INTERACTION_FOUNDATION_SELECTOR_MISMATCH"
          : "INTERACTION_FOUNDATION_TOKEN_MISMATCH",
        `${shellFamily} expected ${key}=${expected[key]} but received ${foundationContract[key]}.`,
        {
          shell_family: shellFamily,
          field: key,
          expected: expected[key],
          received: foundationContract[key],
        },
      );
    }
  }

  return foundationContract;
}

export function foundationContractForInteractionLayer(
  shellFamily: InteractionLayerShellFamily,
  foundationContract?: InteractionLayerFoundationContract | null | undefined,
) {
  return assertInteractionFoundationAlignment(
    shellFamily,
    foundationContract ?? buildInteractionLayerFoundationContract(shellFamily),
  );
}
