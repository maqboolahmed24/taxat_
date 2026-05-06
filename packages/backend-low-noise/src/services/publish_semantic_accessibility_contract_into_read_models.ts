import type {
  SemanticAccessibilityContract,
} from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import {
  getShellAnchorInventory,
  type SemanticAccessibilityRouteVariant,
  type SemanticAccessibilityShellFamily,
  type SemanticAccessibilitySurfaceType,
} from "./get_shell_anchor_inventory.ts";
import { projectSemanticAccessibilityContract } from "./project_semantic_accessibility_contract.ts";
import {
  SemanticAccessibilityContractError,
  validateSemanticAccessibilityContract,
} from "./validate_semantic_accessibility_contract.ts";

export type SemanticAccessibilityReadModel = Record<string, unknown> & {
  semantic_accessibility_contract?: SemanticAccessibilityContract | undefined;
  shell_family?: SemanticAccessibilityShellFamily | undefined;
};

export type PublishSemanticAccessibilityContractInput<TReadModel extends SemanticAccessibilityReadModel> = {
  readModel: TReadModel;
  routeVariant?: SemanticAccessibilityRouteVariant | undefined;
  surfaceType: SemanticAccessibilitySurfaceType;
};

export function publishSemanticAccessibilityContractIntoReadModels<
  TReadModel extends SemanticAccessibilityReadModel,
>(
  input: PublishSemanticAccessibilityContractInput<TReadModel>,
): TReadModel & { semantic_accessibility_contract: SemanticAccessibilityContract } {
  const inventory = getShellAnchorInventory({
    routeVariant: input.routeVariant,
    surfaceType: input.surfaceType,
  });
  if (
    input.readModel.shell_family !== undefined &&
    input.readModel.shell_family !== inventory.shell_family
  ) {
    throw new SemanticAccessibilityContractError(
      "read model shell_family does not match the semantic accessibility surface contract",
      ["SEMANTIC_ACCESSIBILITY_READ_MODEL_SHELL_FAMILY_DRIFT"],
    );
  }
  const semanticAccessibilityContract = projectSemanticAccessibilityContract({
    routeVariant: input.routeVariant,
    surfaceType: input.surfaceType,
  });
  validateSemanticAccessibilityContract({
    contract: semanticAccessibilityContract,
    routeVariant: input.routeVariant,
    surfaceType: input.surfaceType,
  });
  return {
    ...input.readModel,
    semantic_accessibility_contract: semanticAccessibilityContract,
  };
}
