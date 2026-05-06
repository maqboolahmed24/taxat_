import type {
  CrossDeviceContinuityContract,
  FocusRestoreReturnTargetHarnessObjectLossState,
  FocusRestoreReturnTargetHarnessTriggerAction,
  FocusRestorationContract,
} from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import { projectFocusRestorationContract } from "./project_focus_restoration_contract.ts";
import { validateReturnTargetNarrowness } from "./validate_return_target_narrowness.ts";

export type ReturnTargetKind =
  | "INVOKER"
  | "SAME_OBJECT_REMAP"
  | "OBJECT_SUMMARY"
  | "PARENT_RETURN"
  | "NARROWEST_SURVIVING_LIST"
  | "INVALIDATED";

export type ProjectReturnTargetAndFallbackInput = {
  activeFocusLockKindOrNull?: "COMPOSER" | "PICKER" | "COMPARE_CONTROL" | null | undefined;
  activeFocusLockRefOrNull?: string | null | undefined;
  canonicalObjectRefOrNull?: string | null | undefined;
  continuityContract?: CrossDeviceContinuityContract | undefined;
  exactInvokerFocusAnchorRefOrNull?: string | null | undefined;
  fallbackFocusAnchorRefOrNull?: string | null | undefined;
  fallbackObjectRefOrNull?: string | null | undefined;
  fallbackRouteOrSceneRefOrNull?: string | null | undefined;
  fallbackTargetLawful?: boolean | undefined;
  objectLossState?: FocusRestoreReturnTargetHarnessObjectLossState | undefined;
  objectSummaryFocusAnchorRefOrNull?: string | null | undefined;
  objectSummaryRouteOrSceneRefOrNull?: string | null | undefined;
  parentReturnFocusAnchorRefOrNull?: string | null | undefined;
  parentReturnRouteOrSceneRefOrNull?: string | null | undefined;
  parentReturnTargetLawful?: boolean | undefined;
  remappedFocusAnchorRefOrNull?: string | null | undefined;
  requestedFocusAnchorRefOrNull?: string | null | undefined;
  routeOrSceneRef: string;
  triggerAction: FocusRestoreReturnTargetHarnessTriggerAction;
};

export type ReturnTargetAndFallbackProjection = {
  canonicalObjectRefOrNull: string | null;
  fallbackOrderPolicy: "REMAP_WITHIN_OBJECT_THEN_OBJECT_SUMMARY_THEN_PARENT_RETURN_THEN_NARROWEST_LIST";
  focusAnchorRefOrNull: string | null;
  focusRestoration: FocusRestorationContract;
  restorationReasonCodeOrNull: string | null;
  routeOrSceneRefOrNull: string | null;
  targetKind: ReturnTargetKind;
};

function normalized(value: string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error("Route and focus refs must be non-empty strings when present");
  }
  return trimmed;
}

function hasPair(route: string | null, focus: string | null) {
  return route !== null && focus !== null;
}

function projection(input: {
  canonicalObjectRefOrNull: string | null;
  focusAnchorRefOrNull: string | null;
  focusRestoration: FocusRestorationContract;
  routeOrSceneRefOrNull: string | null;
  targetKind: ReturnTargetKind;
}): ReturnTargetAndFallbackProjection {
  return {
    ...input,
    fallbackOrderPolicy:
      "REMAP_WITHIN_OBJECT_THEN_OBJECT_SUMMARY_THEN_PARENT_RETURN_THEN_NARROWEST_LIST",
    restorationReasonCodeOrNull: input.focusRestoration.restoration_reason_code_or_null,
  };
}

export function projectReturnTargetAndFallback(
  input: ProjectReturnTargetAndFallbackInput,
): ReturnTargetAndFallbackProjection {
  const routeOrSceneRef = normalized(input.routeOrSceneRef);
  if (routeOrSceneRef === null) {
    throw new Error("routeOrSceneRef is required");
  }
  const canonicalObjectRefOrNull = normalized(input.canonicalObjectRefOrNull);
  const requestedFocusAnchorRefOrNull = normalized(input.requestedFocusAnchorRefOrNull);
  const exactInvokerFocusAnchorRefOrNull = normalized(input.exactInvokerFocusAnchorRefOrNull);
  const remappedFocusAnchorRefOrNull = normalized(input.remappedFocusAnchorRefOrNull);
  const objectSummaryFocusAnchorRefOrNull = normalized(input.objectSummaryFocusAnchorRefOrNull);
  const objectSummaryRouteOrSceneRefOrNull =
    normalized(input.objectSummaryRouteOrSceneRefOrNull) ?? routeOrSceneRef;
  const parentReturnRouteOrSceneRefOrNull = normalized(input.parentReturnRouteOrSceneRefOrNull);
  const parentReturnFocusAnchorRefOrNull = normalized(input.parentReturnFocusAnchorRefOrNull);
  const fallbackRouteOrSceneRefOrNull = normalized(input.fallbackRouteOrSceneRefOrNull);
  const fallbackFocusAnchorRefOrNull = normalized(input.fallbackFocusAnchorRefOrNull);
  const fallbackObjectRefOrNull = normalized(input.fallbackObjectRefOrNull);
  const objectLossState = input.objectLossState ?? "EXACT_TARGET_VISIBLE";

  let selected: ReturnTargetAndFallbackProjection;
  const parentReturnIsLawful =
    hasPair(parentReturnRouteOrSceneRefOrNull, parentReturnFocusAnchorRefOrNull) &&
    input.parentReturnTargetLawful !== false;
  const fallbackIsLawful =
    hasPair(fallbackRouteOrSceneRefOrNull, fallbackFocusAnchorRefOrNull) &&
    input.fallbackTargetLawful !== false;

  if (
    input.triggerAction === "LIVE_UPDATE_DURING_ACTIVE_INPUT" &&
    exactInvokerFocusAnchorRefOrNull !== null &&
    input.activeFocusLockKindOrNull !== null &&
    input.activeFocusLockKindOrNull !== undefined
  ) {
    selected = projection({
      canonicalObjectRefOrNull,
      focusAnchorRefOrNull: exactInvokerFocusAnchorRefOrNull,
      focusRestoration: projectFocusRestorationContract({
        exactFocusAnchorRefOrNull: exactInvokerFocusAnchorRefOrNull,
      }),
      routeOrSceneRefOrNull: routeOrSceneRef,
      targetKind: "INVOKER",
    });
  } else if (
    ["BACK_NAVIGATION", "HELP_HANDOFF_RETURN", "SECONDARY_WINDOW_CLOSE"].includes(
      input.triggerAction,
    ) &&
    parentReturnIsLawful &&
    objectLossState === "EXACT_TARGET_VISIBLE"
  ) {
    selected = projection({
      canonicalObjectRefOrNull,
      focusAnchorRefOrNull: parentReturnFocusAnchorRefOrNull,
      focusRestoration: projectFocusRestorationContract({
        exactFocusAnchorRefOrNull: parentReturnFocusAnchorRefOrNull,
      }),
      routeOrSceneRefOrNull: parentReturnRouteOrSceneRefOrNull,
      targetKind: "PARENT_RETURN",
    });
  } else if (
    input.triggerAction === "CLOSE_SUPPORT_REGION" &&
    parentReturnFocusAnchorRefOrNull !== null &&
    input.parentReturnTargetLawful !== false
  ) {
    selected = projection({
      canonicalObjectRefOrNull,
      focusAnchorRefOrNull: parentReturnFocusAnchorRefOrNull,
      focusRestoration: projectFocusRestorationContract({
        exactFocusAnchorRefOrNull: parentReturnFocusAnchorRefOrNull,
      }),
      routeOrSceneRefOrNull: routeOrSceneRef,
      targetKind: "INVOKER",
    });
  } else if (exactInvokerFocusAnchorRefOrNull !== null && objectLossState === "EXACT_TARGET_VISIBLE") {
    selected = projection({
      canonicalObjectRefOrNull,
      focusAnchorRefOrNull: exactInvokerFocusAnchorRefOrNull,
      focusRestoration: projectFocusRestorationContract({
        exactFocusAnchorRefOrNull: exactInvokerFocusAnchorRefOrNull,
      }),
      routeOrSceneRefOrNull: routeOrSceneRef,
      targetKind: "INVOKER",
    });
  } else if (remappedFocusAnchorRefOrNull !== null) {
    selected = projection({
      canonicalObjectRefOrNull,
      focusAnchorRefOrNull: remappedFocusAnchorRefOrNull,
      focusRestoration: projectFocusRestorationContract({
        remappedFocusAnchorRefOrNull,
        requestedFocusAnchorRefOrNull,
      }),
      routeOrSceneRefOrNull: routeOrSceneRef,
      targetKind: "SAME_OBJECT_REMAP",
    });
  } else if (objectSummaryFocusAnchorRefOrNull !== null) {
    selected = projection({
      canonicalObjectRefOrNull,
      focusAnchorRefOrNull: objectSummaryFocusAnchorRefOrNull,
      focusRestoration: projectFocusRestorationContract({
        objectSummaryAvailable: true,
        requestedFocusAnchorRefOrNull,
      }),
      routeOrSceneRefOrNull: objectSummaryRouteOrSceneRefOrNull,
      targetKind: "OBJECT_SUMMARY",
    });
  } else if (parentReturnIsLawful) {
    selected = projection({
      canonicalObjectRefOrNull,
      focusAnchorRefOrNull: parentReturnFocusAnchorRefOrNull,
      focusRestoration: projectFocusRestorationContract({
        parentReturnAvailable: true,
        requestedFocusAnchorRefOrNull,
      }),
      routeOrSceneRefOrNull: parentReturnRouteOrSceneRefOrNull,
      targetKind: "PARENT_RETURN",
    });
  } else if (fallbackIsLawful) {
    selected = projection({
      canonicalObjectRefOrNull: fallbackObjectRefOrNull ?? canonicalObjectRefOrNull,
      focusAnchorRefOrNull: fallbackFocusAnchorRefOrNull,
      focusRestoration: projectFocusRestorationContract({
        narrowestListAvailable: true,
        requestedFocusAnchorRefOrNull,
      }),
      routeOrSceneRefOrNull: fallbackRouteOrSceneRefOrNull,
      targetKind: "NARROWEST_SURVIVING_LIST",
    });
  } else {
    selected = projection({
      canonicalObjectRefOrNull,
      focusAnchorRefOrNull: null,
      focusRestoration: projectFocusRestorationContract({
        requestedFocusAnchorRefOrNull,
      }),
      routeOrSceneRefOrNull: null,
      targetKind: "INVALIDATED",
    });
  }

  return validateReturnTargetNarrowness({
    continuityContract: input.continuityContract,
    request: input,
    selection: selected,
  });
}
