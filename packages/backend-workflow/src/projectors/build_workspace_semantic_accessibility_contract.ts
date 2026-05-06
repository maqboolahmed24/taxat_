import {
  buildSemanticAccessibilityContract,
  type SemanticAccessibilityContract,
  type WorkspaceShellFamily,
} from "./projection_contract_helpers.ts";

export type BuildWorkspaceSemanticAccessibilityContractInput = {
  shell_family: WorkspaceShellFamily;
};

export function buildWorkspaceSemanticAccessibilityContract(
  input: BuildWorkspaceSemanticAccessibilityContractInput,
): SemanticAccessibilityContract {
  return buildSemanticAccessibilityContract(input.shell_family);
}
