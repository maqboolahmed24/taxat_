import type { ShellDominanceContract } from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import type {
  LowNoiseActionabilityState,
  LowNoiseDetailModuleCode,
} from "../models/low_noise_frame.ts";
import { projectShellDominanceContract } from "./project_shell_dominance_contract.ts";

export type BuildMinimalDominanceContractAdapterInput = {
  actionabilityState: LowNoiseActionabilityState;
  activeDetailSurfaceCode: LowNoiseDetailModuleCode | null;
  auditModeExplicit?: boolean;
  compareModeExplicit?: boolean;
  dominantActionRefOrNull: string | null;
};

export function buildMinimalDominanceContractAdapter(
  input: BuildMinimalDominanceContractAdapterInput,
): ShellDominanceContract {
  return projectShellDominanceContract({
    actionabilityState: input.actionabilityState,
    activeDetailSurfaceCode: input.activeDetailSurfaceCode,
    auditModeExplicit: input.auditModeExplicit,
    compareModeExplicit: input.compareModeExplicit,
    dominantActionRefOrNull: input.dominantActionRefOrNull,
    primaryActionCode: input.dominantActionRefOrNull,
    shellFamily: "CALM_SHELL",
  });
}
