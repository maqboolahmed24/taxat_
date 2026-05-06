import type {
  InteractionLayerFoundationContract,
} from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import {
  type InteractionLayerShellFamily,
} from "../semantics/shell_family_token_registry.ts";
import { projectFoundationContractForShell } from "./project_foundation_contract_for_shell.ts";

export type { InteractionLayerShellFamily };

export function projectInteractionLayerFoundationContract(input: {
  shellFamily: InteractionLayerShellFamily;
}): InteractionLayerFoundationContract {
  return projectFoundationContractForShell({ shellFamily: input.shellFamily });
}
