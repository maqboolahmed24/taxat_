import type { ShellDominanceContract } from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import type {
  LowNoiseActionabilityState,
  LowNoiseDetailModuleCode,
} from "../models/low_noise_frame.ts";

export type LowNoiseSupportRegionPromotion = {
  explicitMultifocusMode: ShellDominanceContract["explicit_multifocus_mode"];
  promotedSupportSurfaceCodeOrNull: ShellDominanceContract["promoted_support_surface_code_or_null"];
  responsiveCollapsePolicy: ShellDominanceContract["responsive_collapse_policy"];
  supportSurfaceRole: ShellDominanceContract["support_surface_role"];
};

export function deriveSupportRegionPromotion(input: {
  actionabilityState: LowNoiseActionabilityState;
  activeDetailSurfaceCode: LowNoiseDetailModuleCode | null;
  auditModeExplicit?: boolean | undefined;
  compareModeExplicit?: boolean | undefined;
}): LowNoiseSupportRegionPromotion {
  const explicitMultifocusMode = input.auditModeExplicit
    ? "AUDIT"
    : input.compareModeExplicit
      ? "COMPARE"
      : "DEFAULT";
  const promotedSupportSurfaceCodeOrNull =
    input.activeDetailSurfaceCode === null ? null : "DETAIL_DRAWER";
  const supportSurfaceRole =
    promotedSupportSurfaceCodeOrNull === null
      ? "NONE"
      : explicitMultifocusMode === "AUDIT" || explicitMultifocusMode === "COMPARE"
        ? "INVESTIGATION"
        : input.actionabilityState === "NO_SAFE_ACTION"
          ? "RECOVERY"
          : "SUBORDINATE";

  return {
    explicitMultifocusMode,
    promotedSupportSurfaceCodeOrNull,
    responsiveCollapsePolicy: "PRESERVE_DOMINANT_SUMMARY_AND_ACTION",
    supportSurfaceRole,
  };
}
