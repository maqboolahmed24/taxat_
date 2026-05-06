import type {
  FocusRestoreReturnTargetHarness,
  FocusRestoreReturnTargetHarnessActiveFocusLockKind,
  FocusRestoreReturnTargetHarnessExpectedTargetKind,
  FocusRestoreReturnTargetHarnessFocusScope,
  FocusRestoreReturnTargetHarnessHarnessCase,
  FocusRestoreReturnTargetHarnessModality,
  FocusRestoreReturnTargetHarnessObjectLossState,
  FocusRestoreReturnTargetHarnessStateSnapshot,
  FocusRestoreReturnTargetHarnessSupportSurfaceKind,
  FocusRestoreReturnTargetHarnessSurfaceType,
  FocusRestoreReturnTargetHarnessTriggerAction,
} from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import {
  projectReturnTargetAndFallback,
  type ProjectReturnTargetAndFallbackInput,
} from "./project_return_target_and_fallback.ts";

type CaseSeedInput = {
  activeFocusLockKindOrNull?: FocusRestoreReturnTargetHarnessActiveFocusLockKind | null | undefined;
  activeFocusLockRefOrNull?: string | null | undefined;
  canonicalObjectRefOrNull: string | null;
  caseId: string;
  coveredModalities?: readonly FocusRestoreReturnTargetHarnessModality[] | undefined;
  exactInvokerFocusAnchorRefOrNull?: string | null | undefined;
  expectedTargetKind?: FocusRestoreReturnTargetHarnessExpectedTargetKind | undefined;
  fallbackFocusAnchorRefOrNull?: string | null | undefined;
  fallbackObjectRefOrNull?: string | null | undefined;
  fallbackRouteOrSceneRefOrNull?: string | null | undefined;
  focusScope: FocusRestoreReturnTargetHarnessFocusScope;
  objectLossState: FocusRestoreReturnTargetHarnessObjectLossState;
  objectSummaryFocusAnchorRefOrNull?: string | null | undefined;
  objectSummaryRouteOrSceneRefOrNull?: string | null | undefined;
  parentReturnFocusAnchorRefOrNull?: string | null | undefined;
  parentReturnRouteOrSceneRefOrNull?: string | null | undefined;
  parentReturnTargetLawful?: boolean | undefined;
  requestedFocusAnchorRefOrNull: string | null;
  routeOrSceneRef: string;
  supportSurfaceKindOrNull?: FocusRestoreReturnTargetHarnessSupportSurfaceKind | null | undefined;
  surfaceType: FocusRestoreReturnTargetHarnessSurfaceType;
  triggerAction: FocusRestoreReturnTargetHarnessTriggerAction;
};

const browserScopes = new Set<FocusRestoreReturnTargetHarnessFocusScope>([
  "MANIFEST_SUPPORT_REGION",
  "WORKSPACE_DETAIL_ROUTE",
  "CLIENT_PORTAL_CONTEXTUAL_ROUTE",
  "GOVERNANCE_SUPPORT_ROUTE",
]);

function identifierSnapshot(input: {
  activeFocusAnchorRefOrNull: string | null;
  activeFocusLockRefOrNull?: string | null | undefined;
  canonicalObjectRefOrNull: string | null;
  fallbackFocusAnchorRefOrNull: string | null;
  fallbackRouteOrSceneRefOrNull: string | null;
  focusRestorationDispositionOrNull: string | null;
  focusRestorationReasonCodeOrNull: string | null;
  focusScope: FocusRestoreReturnTargetHarnessFocusScope;
  returnFocusAnchorRefOrNull: string | null;
  returnRouteOrSceneRefOrNull: string | null;
  routeOrSceneRef: string;
}): FocusRestoreReturnTargetHarnessStateSnapshot {
  const browserCase = browserScopes.has(input.focusScope);
  return {
    active_focus_anchor_ref_or_null: input.activeFocusAnchorRefOrNull,
    active_focus_lock_ref_or_null: input.activeFocusLockRefOrNull ?? null,
    browser_active_identifier_or_null: browserCase ? input.activeFocusAnchorRefOrNull : null,
    browser_return_identifier_or_null: browserCase ? input.returnFocusAnchorRefOrNull : null,
    canonical_object_ref_or_null: input.canonicalObjectRefOrNull,
    fallback_focus_anchor_ref_or_null: input.fallbackFocusAnchorRefOrNull,
    fallback_route_or_scene_ref_or_null: input.fallbackRouteOrSceneRefOrNull,
    focus_restoration_disposition_or_null: input.focusRestorationDispositionOrNull,
    focus_restoration_reason_code_or_null: input.focusRestorationReasonCodeOrNull,
    native_active_identifier_or_null: browserCase ? null : input.activeFocusAnchorRefOrNull,
    native_return_identifier_or_null: browserCase ? null : input.returnFocusAnchorRefOrNull,
    return_focus_anchor_ref_or_null: input.returnFocusAnchorRefOrNull,
    return_route_or_scene_ref_or_null: input.returnRouteOrSceneRefOrNull,
    route_or_scene_ref: input.routeOrSceneRef,
  };
}

function expectedTargetKindFor(
  targetKind: ReturnType<typeof projectReturnTargetAndFallback>["targetKind"],
): FocusRestoreReturnTargetHarnessExpectedTargetKind {
  switch (targetKind) {
    case "INVOKER":
    case "SAME_OBJECT_REMAP":
      return "INVOKER";
    case "OBJECT_SUMMARY":
      return "OBJECT_SUMMARY";
    case "PARENT_RETURN":
      return "PARENT_RETURN";
    case "NARROWEST_SURVIVING_LIST":
      return "NARROWEST_SURVIVING_LIST";
    case "INVALIDATED":
      throw new Error("Focus-restore harness case seeds cannot use INVALIDATED as expected target");
  }
}

function caseSeed(input: CaseSeedInput): FocusRestoreReturnTargetHarnessHarnessCase {
  const request: ProjectReturnTargetAndFallbackInput = {
    activeFocusLockKindOrNull: input.activeFocusLockKindOrNull,
    activeFocusLockRefOrNull: input.activeFocusLockRefOrNull,
    canonicalObjectRefOrNull: input.canonicalObjectRefOrNull,
    exactInvokerFocusAnchorRefOrNull: input.exactInvokerFocusAnchorRefOrNull,
    fallbackFocusAnchorRefOrNull: input.fallbackFocusAnchorRefOrNull,
    fallbackObjectRefOrNull: input.fallbackObjectRefOrNull,
    fallbackRouteOrSceneRefOrNull: input.fallbackRouteOrSceneRefOrNull,
    objectLossState: input.objectLossState,
    objectSummaryFocusAnchorRefOrNull: input.objectSummaryFocusAnchorRefOrNull,
    objectSummaryRouteOrSceneRefOrNull: input.objectSummaryRouteOrSceneRefOrNull,
    parentReturnFocusAnchorRefOrNull: input.parentReturnFocusAnchorRefOrNull,
    parentReturnRouteOrSceneRefOrNull: input.parentReturnRouteOrSceneRefOrNull,
    parentReturnTargetLawful: input.parentReturnTargetLawful,
    requestedFocusAnchorRefOrNull: input.requestedFocusAnchorRefOrNull,
    routeOrSceneRef: input.routeOrSceneRef,
    triggerAction: input.triggerAction,
  };
  const selection = projectReturnTargetAndFallback(request);
  const preState = identifierSnapshot({
    activeFocusAnchorRefOrNull: input.requestedFocusAnchorRefOrNull,
    activeFocusLockRefOrNull: input.activeFocusLockRefOrNull,
    canonicalObjectRefOrNull: input.canonicalObjectRefOrNull,
    fallbackFocusAnchorRefOrNull: input.fallbackFocusAnchorRefOrNull ?? null,
    fallbackRouteOrSceneRefOrNull: input.fallbackRouteOrSceneRefOrNull ?? null,
    focusRestorationDispositionOrNull: null,
    focusRestorationReasonCodeOrNull: null,
    focusScope: input.focusScope,
    returnFocusAnchorRefOrNull: input.parentReturnFocusAnchorRefOrNull ?? null,
    returnRouteOrSceneRefOrNull: input.parentReturnRouteOrSceneRefOrNull ?? null,
    routeOrSceneRef: input.routeOrSceneRef,
  });
  const postState = identifierSnapshot({
    activeFocusAnchorRefOrNull: selection.focusAnchorRefOrNull,
    activeFocusLockRefOrNull:
      input.triggerAction === "LIVE_UPDATE_DURING_ACTIVE_INPUT"
        ? input.activeFocusLockRefOrNull
        : null,
    canonicalObjectRefOrNull: selection.canonicalObjectRefOrNull,
    fallbackFocusAnchorRefOrNull: input.fallbackFocusAnchorRefOrNull ?? null,
    fallbackRouteOrSceneRefOrNull: input.fallbackRouteOrSceneRefOrNull ?? null,
    focusRestorationDispositionOrNull: selection.focusRestoration.restoration_disposition,
    focusRestorationReasonCodeOrNull:
      selection.focusRestoration.restoration_reason_code_or_null,
    focusScope: input.focusScope,
    returnFocusAnchorRefOrNull: input.parentReturnFocusAnchorRefOrNull ?? null,
    returnRouteOrSceneRefOrNull: input.parentReturnRouteOrSceneRefOrNull ?? null,
    routeOrSceneRef: selection.routeOrSceneRefOrNull ?? input.routeOrSceneRef,
  });

  return {
    active_focus_lock_kind_or_null: input.activeFocusLockKindOrNull ?? null,
    case_id: input.caseId,
    covered_modalities: [...(input.coveredModalities ?? ["KEYBOARD_ONLY"])],
    expected_focus_restoration_disposition: selection.focusRestoration.restoration_disposition,
    expected_target_kind: input.expectedTargetKind ?? expectedTargetKindFor(selection.targetKind),
    focus_scope: input.focusScope,
    object_loss_state: input.objectLossState,
    post_state: postState,
    pre_state: preState,
    support_surface_kind_or_null: input.supportSurfaceKindOrNull ?? null,
    surface_type: input.surfaceType,
    trigger_action: input.triggerAction,
  };
}

export function buildFocusRestoreCaseSeeds(input: {
  deterministicSeed?: number | undefined;
  harnessId?: string | undefined;
} = {}): FocusRestoreReturnTargetHarness {
  return {
    cases: [
      caseSeed({
        canonicalObjectRefOrNull: "manifest://pc0177/low-noise",
        caseId: "TV-39I-low-noise-support-close",
        coveredModalities: ["KEYBOARD_ONLY", "POINTER_BASELINE"],
        exactInvokerFocusAnchorRefOrNull: "action://open-detail-drawer",
        fallbackFocusAnchorRefOrNull: "manifest-row://pc0177",
        fallbackRouteOrSceneRefOrNull: "/staff/manifests",
        focusScope: "MANIFEST_SUPPORT_REGION",
        objectLossState: "EXACT_TARGET_VISIBLE",
        parentReturnFocusAnchorRefOrNull: "action://open-detail-drawer",
        parentReturnRouteOrSceneRefOrNull: "/staff/manifests/pc0177",
        requestedFocusAnchorRefOrNull: "detail://focus-lens",
        routeOrSceneRef: "/staff/manifests/pc0177",
        supportSurfaceKindOrNull: "DETAIL_DRAWER",
        surfaceType: "LowNoiseExperienceFrame",
        triggerAction: "CLOSE_SUPPORT_REGION",
      }),
      caseSeed({
        canonicalObjectRefOrNull: "request://pc0177/123",
        caseId: "TV-39J-portal-back-parent-return",
        coveredModalities: ["KEYBOARD_ONLY"],
        exactInvokerFocusAnchorRefOrNull: "request-detail://primary-action",
        fallbackFocusAnchorRefOrNull: "request-row://123",
        fallbackRouteOrSceneRefOrNull: "/portal/documents",
        focusScope: "CLIENT_PORTAL_CONTEXTUAL_ROUTE",
        objectLossState: "EXACT_TARGET_VISIBLE",
        parentReturnFocusAnchorRefOrNull: "request-row://123",
        parentReturnRouteOrSceneRefOrNull: "/portal/documents",
        requestedFocusAnchorRefOrNull: "request-detail://primary-action",
        routeOrSceneRef: "/portal/requests/123",
        supportSurfaceKindOrNull: "CONTEXTUAL_DETAIL",
        surfaceType: "ClientPortalWorkspace",
        triggerAction: "BACK_NAVIGATION",
      }),
      caseSeed({
        canonicalObjectRefOrNull: "request://pc0177/help-source",
        caseId: "TV-39K-help-handoff-source-anchor",
        coveredModalities: ["KEYBOARD_ONLY"],
        exactInvokerFocusAnchorRefOrNull: "case-context://source-request",
        fallbackFocusAnchorRefOrNull: "request-row://help-source",
        fallbackRouteOrSceneRefOrNull: "/portal/documents",
        focusScope: "CLIENT_PORTAL_CONTEXTUAL_ROUTE",
        objectLossState: "EXACT_TARGET_VISIBLE",
        parentReturnFocusAnchorRefOrNull: "case-context://source-request",
        parentReturnRouteOrSceneRefOrNull: "/portal/requests/help-source",
        requestedFocusAnchorRefOrNull: "help://contact-options",
        routeOrSceneRef: "/portal/help",
        supportSurfaceKindOrNull: "HELP_ROUTE",
        surfaceType: "ClientPortalWorkspace",
        triggerAction: "HELP_HANDOFF_RETURN",
      }),
      caseSeed({
        canonicalObjectRefOrNull: "request://pc0177/stale",
        caseId: "TV-39L-stale-narrowest-list-fallback",
        coveredModalities: ["KEYBOARD_ONLY"],
        fallbackFocusAnchorRefOrNull: "request-row://replacement-visible",
        fallbackObjectRefOrNull: "request://pc0177/replacement-visible",
        fallbackRouteOrSceneRefOrNull: "/portal/documents/open-requests",
        focusScope: "CLIENT_PORTAL_CONTEXTUAL_ROUTE",
        objectLossState: "PARENT_STALE_NARROW_LIST_LAWFUL",
        parentReturnFocusAnchorRefOrNull: "request-row://stale",
        parentReturnRouteOrSceneRefOrNull: "/portal/documents",
        parentReturnTargetLawful: false,
        requestedFocusAnchorRefOrNull: "request-detail://stale-upload",
        routeOrSceneRef: "/portal/requests/stale",
        supportSurfaceKindOrNull: "CONTEXTUAL_DETAIL",
        surfaceType: "ClientPortalWorkspace",
        triggerAction: "STALE_REBASE_RECOVERY",
      }),
      caseSeed({
        activeFocusLockKindOrNull: "COMPARE_CONTROL",
        activeFocusLockRefOrNull: "compare-lock://policy-diff",
        canonicalObjectRefOrNull: "governance://policy/pc0177",
        caseId: "TV-39M-governance-live-update-focus-lock",
        coveredModalities: ["KEYBOARD_ONLY", "ASSISTIVE_TECH"],
        exactInvokerFocusAnchorRefOrNull: "compare-control://policy-diff",
        fallbackFocusAnchorRefOrNull: "policy-row://pc0177",
        fallbackRouteOrSceneRefOrNull: "/governance/policies",
        focusScope: "GOVERNANCE_SUPPORT_ROUTE",
        objectLossState: "EXACT_TARGET_VISIBLE",
        parentReturnFocusAnchorRefOrNull: "policy-row://pc0177",
        parentReturnRouteOrSceneRefOrNull: "/governance/policies",
        requestedFocusAnchorRefOrNull: "compare-control://policy-diff",
        routeOrSceneRef: "/governance/policies/pc0177",
        supportSurfaceKindOrNull: "TRAILING_INSPECTOR",
        surfaceType: "TenantGovernanceSnapshot",
        triggerAction: "LIVE_UPDATE_DURING_ACTIVE_INPUT",
      }),
      caseSeed({
        canonicalObjectRefOrNull: "work-item://pc0177/restack",
        caseId: "TV-39O-responsive-restack-object-summary",
        coveredModalities: ["KEYBOARD_ONLY"],
        fallbackFocusAnchorRefOrNull: "work-row://restack",
        fallbackRouteOrSceneRefOrNull: "/work/inbox",
        focusScope: "WORKSPACE_DETAIL_ROUTE",
        objectLossState: "EXACT_TARGET_STALE_SAME_OBJECT_LAWFUL",
        objectSummaryFocusAnchorRefOrNull: "work-summary://restack",
        objectSummaryRouteOrSceneRefOrNull: "/work/items/restack",
        parentReturnFocusAnchorRefOrNull: "work-row://restack",
        parentReturnRouteOrSceneRefOrNull: "/work/inbox",
        requestedFocusAnchorRefOrNull: "detail-module://files",
        routeOrSceneRef: "/work/items/restack",
        supportSurfaceKindOrNull: "CONTEXTUAL_DETAIL",
        surfaceType: "WorkspaceSnapshot",
        triggerAction: "RESPONSIVE_RESTACK",
      }),
      caseSeed({
        canonicalObjectRefOrNull: "manifest://pc0177/native-secondary",
        caseId: "TV-39N-native-secondary-parent-anchor",
        coveredModalities: ["KEYBOARD_ONLY"],
        exactInvokerFocusAnchorRefOrNull: "secondary-window://compare-body",
        fallbackFocusAnchorRefOrNull: "manifest-row://native-secondary",
        fallbackRouteOrSceneRefOrNull: "native://operator/manifest-list",
        focusScope: "NATIVE_SECONDARY_WINDOW",
        objectLossState: "EXACT_TARGET_VISIBLE",
        parentReturnFocusAnchorRefOrNull: "parent-scene://compare-launch",
        parentReturnRouteOrSceneRefOrNull: "native://operator/primary-scene/pc0177",
        requestedFocusAnchorRefOrNull: "secondary-window://compare-body",
        routeOrSceneRef: "native://operator/secondary-window/pc0177",
        supportSurfaceKindOrNull: "SECONDARY_COMPARE_WINDOW",
        surfaceType: "NativeOperatorSecondaryWindowScene",
        triggerAction: "SECONDARY_WINDOW_CLOSE",
      }),
    ],
    contract_version: "FOCUS_RESTORE_RETURN_TARGET_HARNESS_V1",
    deterministic_seed: input.deterministicSeed ?? 177,
    fallback_order_policy:
      "REMAP_WITHIN_OBJECT_THEN_OBJECT_SUMMARY_THEN_PARENT_RETURN_THEN_NARROWEST_LIST",
    harness_id: input.harnessId ?? "focus-restore-pc0177-seed",
    help_handoff_policy: "HELP_HANDOFF_RETURNS_TO_SERIALIZED_SOURCE_ANCHOR",
    identifier_policy: "DATA_TESTID_AND_ACCESSIBILITY_IDENTIFIER_MIRROR_SERIALIZED_ANCHORS",
    live_update_focus_policy: "NEVER_STEAL_ACTIVE_COMPOSER_PICKER_OR_COMPARE_FOCUS",
    modality_policy: "KEYBOARD_FIRST_WITH_POINTER_AND_ASSISTIVE_PARITY",
    return_target_policy: "SERIALIZED_INVOKER_OR_NARROWEST_LAWFUL_FALLBACK",
    run_mode: "DETERMINISTIC_SEEDED_ENUMERATION",
    suite_profile: "KEYBOARD_FIRST_RETURN_TARGET_AND_FALLBACK_MATRIX",
  };
}
