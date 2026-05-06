import type { DetailDrawerStateDetailEntry } from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import type {
  LowNoiseDetailFallbackState,
  LowNoiseDetailModuleCode,
} from "../models/low_noise_frame.ts";

export type LowNoiseDrawerFallbackReasonCode =
  | "ACTIVE_DETAIL_NOT_POPULATED"
  | "ACTIVE_MODULE_UNAVAILABLE"
  | "AUDIT_MODULE_UNAVAILABLE"
  | "AUDIT_MODE_REQUIRES_FOCUS_LENS"
  | "COLLAPSED_ROOT_SELECTED"
  | "COMPARE_MODE_REQUIRES_COMPARISON_MODULE"
  | "FIRST_VALID_ENTRY_SELECTED"
  | "SUGGESTED_MODULE_SELECTED";

export type DetailFallbackResolution = {
  activeDetailSurfaceCode: LowNoiseDetailModuleCode | null;
  auditModeExplicit: boolean;
  compareModeExplicit: boolean;
  detailFallbackState: LowNoiseDetailFallbackState;
  drawerFallbackReasonCode: LowNoiseDrawerFallbackReasonCode | null;
  suggestedDetailSurfaceCode: LowNoiseDetailModuleCode | null;
};

const compareDetailModules = new Set<LowNoiseDetailModuleCode>(["DRIFT_FIELD", "TWIN_PANEL"]);

function moduleExists(
  entries: readonly DetailDrawerStateDetailEntry[],
  moduleCode: LowNoiseDetailModuleCode | null,
) {
  return moduleCode === null
    ? false
    : entries.some((entry) => entry.module_code === moduleCode);
}

function firstEntry(entries: readonly DetailDrawerStateDetailEntry[]) {
  return entries[0]?.module_code ?? null;
}

function firstCompareEntry(entries: readonly DetailDrawerStateDetailEntry[]) {
  return entries.find((entry) => compareDetailModules.has(entry.module_code))?.module_code ?? null;
}

export function resolveDetailFallbackState(input: {
  activeDetailSurfaceCode?: LowNoiseDetailModuleCode | null | undefined;
  auditModeExplicit?: boolean | undefined;
  compareModeExplicit?: boolean | undefined;
  entryPoints: readonly DetailDrawerStateDetailEntry[];
  suggestedDetailSurfaceCode?: LowNoiseDetailModuleCode | null | undefined;
}): DetailFallbackResolution {
  const requestedActive = input.activeDetailSurfaceCode ?? null;
  const requestedSuggested = input.suggestedDetailSurfaceCode ?? null;

  if (input.auditModeExplicit === true) {
    if (moduleExists(input.entryPoints, "FOCUS_LENS")) {
      return {
        activeDetailSurfaceCode: "FOCUS_LENS",
        auditModeExplicit: true,
        compareModeExplicit: false,
        detailFallbackState:
          requestedActive === "FOCUS_LENS" ? "ACTIVE_MODULE_PRESERVED" : "SUGGESTED_MODULE_SELECTED",
        drawerFallbackReasonCode:
          requestedActive === "FOCUS_LENS" ? null : "AUDIT_MODE_REQUIRES_FOCUS_LENS",
        suggestedDetailSurfaceCode: "FOCUS_LENS",
      };
    }
    return {
      activeDetailSurfaceCode: firstEntry(input.entryPoints),
      auditModeExplicit: false,
      compareModeExplicit: false,
      detailFallbackState: "FIRST_VALID_ENTRY_SELECTED",
      drawerFallbackReasonCode: "AUDIT_MODULE_UNAVAILABLE",
      suggestedDetailSurfaceCode: firstEntry(input.entryPoints),
    };
  }

  if (input.compareModeExplicit === true) {
    const compareModule =
      requestedActive !== null &&
      compareDetailModules.has(requestedActive) &&
      moduleExists(input.entryPoints, requestedActive)
        ? requestedActive
        : requestedSuggested !== null &&
            compareDetailModules.has(requestedSuggested) &&
            moduleExists(input.entryPoints, requestedSuggested)
          ? requestedSuggested
          : firstCompareEntry(input.entryPoints);
    if (compareModule !== null) {
      return {
        activeDetailSurfaceCode: compareModule,
        auditModeExplicit: false,
        compareModeExplicit: true,
        detailFallbackState:
          compareModule === requestedActive ? "ACTIVE_MODULE_PRESERVED" : "SUGGESTED_MODULE_SELECTED",
        drawerFallbackReasonCode:
          compareModule === requestedActive ? null : "COMPARE_MODE_REQUIRES_COMPARISON_MODULE",
        suggestedDetailSurfaceCode: compareModule,
      };
    }
    return {
      activeDetailSurfaceCode: firstEntry(input.entryPoints),
      auditModeExplicit: false,
      compareModeExplicit: false,
      detailFallbackState: "FIRST_VALID_ENTRY_SELECTED",
      drawerFallbackReasonCode: "COMPARE_MODE_REQUIRES_COMPARISON_MODULE",
      suggestedDetailSurfaceCode: firstEntry(input.entryPoints),
    };
  }

  if (requestedActive !== null && moduleExists(input.entryPoints, requestedActive)) {
    return {
      activeDetailSurfaceCode: requestedActive,
      auditModeExplicit: false,
      compareModeExplicit: false,
      detailFallbackState: "ACTIVE_MODULE_PRESERVED",
      drawerFallbackReasonCode: null,
      suggestedDetailSurfaceCode: requestedSuggested,
    };
  }

  if (requestedSuggested !== null && moduleExists(input.entryPoints, requestedSuggested)) {
    return {
      activeDetailSurfaceCode: requestedSuggested,
      auditModeExplicit: false,
      compareModeExplicit: false,
      detailFallbackState: "SUGGESTED_MODULE_SELECTED",
      drawerFallbackReasonCode: "SUGGESTED_MODULE_SELECTED",
      suggestedDetailSurfaceCode: requestedSuggested,
    };
  }

  if (requestedActive !== null) {
    return {
      activeDetailSurfaceCode: firstEntry(input.entryPoints),
      auditModeExplicit: false,
      compareModeExplicit: false,
      detailFallbackState:
        firstEntry(input.entryPoints) === null ? "COLLAPSED_ROOT_SELECTED" : "FIRST_VALID_ENTRY_SELECTED",
      drawerFallbackReasonCode:
        firstEntry(input.entryPoints) === null
          ? "COLLAPSED_ROOT_SELECTED"
          : "FIRST_VALID_ENTRY_SELECTED",
      suggestedDetailSurfaceCode: firstEntry(input.entryPoints),
    };
  }

  return {
    activeDetailSurfaceCode: null,
    auditModeExplicit: false,
    compareModeExplicit: false,
    detailFallbackState: "NOT_APPLICABLE",
    drawerFallbackReasonCode: null,
    suggestedDetailSurfaceCode: requestedSuggested,
  };
}

export function fallbackReasonForExpandedEntry(
  entry: DetailDrawerStateDetailEntry | null,
  resolution: DetailFallbackResolution,
) {
  if (resolution.drawerFallbackReasonCode !== null) {
    return resolution.drawerFallbackReasonCode;
  }
  if (entry !== null && entry.content_state !== "POPULATED") {
    return "ACTIVE_DETAIL_NOT_POPULATED" as const;
  }
  return null;
}
