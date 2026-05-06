import type { BuildLowNoiseBudgetAuditInput } from "../audit/build_low_noise_budget_audit.ts";
import {
  assertLowNoiseBudgetWithinFrozenRules,
  buildFrameLowNoiseBudgetAudit,
  buildLowNoiseBudgetAudit,
} from "../audit/build_low_noise_budget_audit.ts";
import { computeLowNoiseScanLoadQuarterUnits } from "../audit/compute_scan_load.ts";
import { detectDuplicatePostureCodes } from "../audit/detect_duplicate_posture_codes.ts";
import type { LowNoiseExperienceFrameRecord } from "../models/low_noise_frame.ts";

export type DeriveSurfaceBudgetContractInput = BuildLowNoiseBudgetAuditInput;

export {
  assertLowNoiseBudgetWithinFrozenRules,
  computeVisibleShellCharCount,
} from "../audit/build_low_noise_budget_audit.ts";
export { computeLowNoiseScanLoadQuarterUnits, computeScanLoad } from "../audit/compute_scan_load.ts";
export {
  countLowNoiseActionInventory,
  countSecondaryMutationActions,
} from "../audit/count_secondary_mutation_actions.ts";
export { detectDuplicatePostureCodes } from "../audit/detect_duplicate_posture_codes.ts";

export function lowNoiseExpectedScanLoadQuarterUnits(
  input: Parameters<typeof computeLowNoiseScanLoadQuarterUnits>[0],
) {
  return computeLowNoiseScanLoadQuarterUnits(input);
}

export function lowNoiseDuplicatePostureCodesFromFrame(
  input: BuildLowNoiseBudgetAuditInput,
) {
  return detectDuplicatePostureCodes(input);
}

export function deriveSurfaceBudgetContract(input: DeriveSurfaceBudgetContractInput) {
  return buildLowNoiseBudgetAudit(input);
}

export function deriveFrameSurfaceBudgetContract(frame: LowNoiseExperienceFrameRecord) {
  return buildFrameLowNoiseBudgetAudit(frame);
}
