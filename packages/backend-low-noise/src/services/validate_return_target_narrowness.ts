import type {
  CrossDeviceContinuityContract,
} from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import type {
  ProjectReturnTargetAndFallbackInput,
  ReturnTargetAndFallbackProjection,
} from "./project_return_target_and_fallback.ts";

export class ReturnTargetNarrownessError extends Error {
  readonly reasonCodes: string[];

  constructor(message: string, reasonCodes: string[]) {
    super(message);
    this.name = "ReturnTargetNarrownessError";
    this.reasonCodes = reasonCodes;
  }
}

function fail(message: string, reasonCodes: string[]): never {
  throw new ReturnTargetNarrownessError(message, reasonCodes);
}

function hasValue(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

const genericRouteTokens = new Set(["/home", "/dashboard", "HOME", "DASHBOARD"]);

export function validateReturnTargetNarrowness(input: {
  continuityContract?: CrossDeviceContinuityContract | undefined;
  request: ProjectReturnTargetAndFallbackInput;
  selection: ReturnTargetAndFallbackProjection;
}) {
  const request = input.request;
  const selection = input.selection;
  const hasParentRoute = hasValue(request.parentReturnRouteOrSceneRefOrNull);
  const hasParentFocus = hasValue(request.parentReturnFocusAnchorRefOrNull);

  if (hasParentRoute !== hasParentFocus) {
    fail("Parent return route and focus anchor must be restored together", [
      "RETURN_TARGET_PARENT_ROUTE_FOCUS_PAIR_DRIFT",
    ]);
  }

  if (
    ["BACK_NAVIGATION", "HELP_HANDOFF_RETURN", "SECONDARY_WINDOW_CLOSE"].includes(
      request.triggerAction,
    ) &&
    (!hasParentRoute || !hasParentFocus)
  ) {
    fail("Back, help-return, and secondary-window close require a serialized parent return target", [
      "RETURN_TARGET_PARENT_RETURN_REQUIRED",
    ]);
  }

  if (
    request.triggerAction === "SECONDARY_WINDOW_CLOSE" &&
    selection.focusAnchorRefOrNull !== request.parentReturnFocusAnchorRefOrNull
  ) {
    fail("Secondary-window close must restore the serialized parent focus anchor", [
      "RETURN_TARGET_SECONDARY_WINDOW_PARENT_ANCHOR_DRIFT",
    ]);
  }

  if (
    genericRouteTokens.has(selection.routeOrSceneRefOrNull ?? "") &&
    hasValue(request.fallbackRouteOrSceneRefOrNull)
  ) {
    fail("Fallback must not reopen a generic home or dashboard while a narrower target exists", [
      "RETURN_TARGET_GENERIC_ROUTE_WITH_NARROW_FALLBACK",
    ]);
  }

  if (selection.targetKind === "OBJECT_SUMMARY" && hasValue(request.remappedFocusAnchorRefOrNull)) {
    fail("Same-object focus remap outranks object-summary fallback", [
      "RETURN_TARGET_SKIPPED_SAME_OBJECT_REMAP",
    ]);
  }

  if (
    selection.targetKind === "PARENT_RETURN" &&
    (hasValue(request.remappedFocusAnchorRefOrNull) ||
      hasValue(request.objectSummaryFocusAnchorRefOrNull))
  ) {
    fail("Same-object remap and summary fallback outrank parent return", [
      "RETURN_TARGET_SKIPPED_SAME_OBJECT_FALLBACK",
    ]);
  }

  if (
    selection.targetKind === "NARROWEST_SURVIVING_LIST" &&
    hasParentRoute &&
    hasParentFocus &&
    request.parentReturnTargetLawful !== false
  ) {
    fail("Serialized parent return outranks narrowest-list fallback while still lawful", [
      "RETURN_TARGET_SKIPPED_LAWFUL_PARENT_RETURN",
    ]);
  }

  const hasAnyLawfulFallback =
    hasValue(request.exactInvokerFocusAnchorRefOrNull) ||
    hasValue(request.remappedFocusAnchorRefOrNull) ||
    hasValue(request.objectSummaryFocusAnchorRefOrNull) ||
    (hasParentRoute && hasParentFocus && request.parentReturnTargetLawful !== false) ||
    (hasValue(request.fallbackRouteOrSceneRefOrNull) &&
      hasValue(request.fallbackFocusAnchorRefOrNull) &&
      request.fallbackTargetLawful !== false);
  if (selection.targetKind === "INVALIDATED" && hasAnyLawfulFallback) {
    fail("Restoration can be invalidated only after every lawful fallback is exhausted", [
      "RETURN_TARGET_INVALIDATED_WITH_LAWFUL_FALLBACK",
    ]);
  }

  if (input.continuityContract !== undefined) {
    const continuity = input.continuityContract;
    if (continuity.focus_anchor_ref_or_null !== request.requestedFocusAnchorRefOrNull) {
      fail("Route context requested focus must mirror cross-device continuity focus", [
        "RETURN_TARGET_CONTINUITY_FOCUS_DRIFT",
      ]);
    }
    if (
      continuity.return_focus_anchor_ref_or_null !== request.parentReturnFocusAnchorRefOrNull
    ) {
      fail("Route context parent return focus must mirror cross-device continuity return focus", [
        "RETURN_TARGET_CONTINUITY_RETURN_FOCUS_DRIFT",
      ]);
    }
  }

  return selection;
}
