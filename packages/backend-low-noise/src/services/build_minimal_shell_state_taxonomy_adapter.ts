import type { ShellStateTaxonomyContract } from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import type {
  LowNoiseRecoveryPosture,
  LowNoiseSettlementState,
  LowNoiseSurfaceCode,
} from "../models/low_noise_frame.ts";
import { projectShellStateTaxonomyContract } from "./project_shell_state_taxonomy_contract.ts";

export type LowNoiseTaxonomyEmptyState =
  | "NOT_REQUESTED"
  | "NOT_YET_MATERIALIZED"
  | "LIMITED"
  | "NOT_APPLICABLE"
  | null;

export type BuildMinimalShellStateTaxonomyAdapterInput = {
  currentEmptyStateOrNull: LowNoiseTaxonomyEmptyState;
  currentEmptySurfaceCodeOrNull: Extract<
    LowNoiseSurfaceCode,
    "DECISION_SUMMARY" | "DETAIL_DRAWER"
  > | null;
  limitationReasonCodes?: readonly string[];
  recoveryPosture: LowNoiseRecoveryPosture;
  settlementState: LowNoiseSettlementState;
};

export function buildMinimalShellStateTaxonomyAdapter(
  input: BuildMinimalShellStateTaxonomyAdapterInput,
): ShellStateTaxonomyContract {
  return projectShellStateTaxonomyContract({
    currentEmptyStateOrNull: input.currentEmptyStateOrNull,
    currentEmptySurfaceCodeOrNull: input.currentEmptySurfaceCodeOrNull,
    limitationReasonCodes: input.limitationReasonCodes,
    recoveryPosture: input.recoveryPosture,
    settlementState: input.settlementState,
  });
}
