import type {
  InteractionLayerFoundationContract,
} from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import {
  cloneFoundationContractForShell,
  type InteractionLayerShellFamily,
} from "../semantics/shell_family_token_registry.ts";

export function projectFoundationContractForShell(input: {
  shellFamily: InteractionLayerShellFamily;
}): InteractionLayerFoundationContract {
  return cloneFoundationContractForShell({ shellFamily: input.shellFamily });
}
