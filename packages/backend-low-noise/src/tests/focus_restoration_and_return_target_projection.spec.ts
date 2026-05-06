import { expect, test } from "@playwright/test";

import {
  buildFocusRestoreCaseSeeds,
  projectFocusRestorationContract,
  projectRecoveryNavigationPosture,
  projectReturnTargetAndFallback,
  ReturnTargetNarrownessError,
  validateReturnTargetNarrowness,
} from "../index.ts";
import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";

test("projects exact, remapped, object-summary, parent-return, and invalidated focus contracts", async () => {
  const exact = projectFocusRestorationContract({
    exactFocusAnchorRefOrNull: "detail://current",
    requestedFocusAnchorRefOrNull: "detail://current",
  });
  expect(exact).toEqual({
    requested_focus_anchor_ref_or_null: "detail://current",
    resolved_focus_anchor_ref_or_null: "detail://current",
    restoration_disposition: "EXACT_FOCUS",
    restoration_reason_code_or_null: null,
  });

  const remapped = projectFocusRestorationContract({
    remappedFocusAnchorRefOrNull: "detail://same-object-remap",
    requestedFocusAnchorRefOrNull: "detail://stale-row",
  });
  expect(remapped.restoration_disposition).toBe("REMAPPED_FOCUS");
  expect(remapped.restoration_reason_code_or_null).toBe("FOCUS_ANCHOR_REMAPPED_WITHIN_OBJECT");

  const summary = projectFocusRestorationContract({
    objectSummaryAvailable: true,
    requestedFocusAnchorRefOrNull: "detail://removed-module",
  });
  expect(summary.restoration_disposition).toBe("OBJECT_SUMMARY");
  expect(summary.resolved_focus_anchor_ref_or_null).toBeNull();

  const parent = projectFocusRestorationContract({
    parentReturnAvailable: true,
    requestedFocusAnchorRefOrNull: "request-detail://old",
  });
  expect(parent.restoration_disposition).toBe("PARENT_RETURN");

  const invalidated = projectFocusRestorationContract({
    requestedFocusAnchorRefOrNull: "request-detail://gone",
  });
  expect(invalidated.restoration_disposition).toBe("INVALIDATED");
  expect(invalidated.restoration_reason_code_or_null).toBe("NO_LAWFUL_FOCUS_TARGET");

  for (const contract of [exact, remapped, summary, parent, invalidated]) {
    await validateContractSchema("focus_restoration_contract", contract);
  }
});

test("selects narrow return targets in the governed fallback order", () => {
  const remap = projectReturnTargetAndFallback({
    exactInvokerFocusAnchorRefOrNull: null,
    objectLossState: "EXACT_TARGET_STALE_SAME_OBJECT_LAWFUL",
    objectSummaryFocusAnchorRefOrNull: "summary://manifest-1",
    parentReturnFocusAnchorRefOrNull: "manifest-row://1",
    parentReturnRouteOrSceneRefOrNull: "/staff/manifests",
    remappedFocusAnchorRefOrNull: "detail://manifest-1-remapped",
    requestedFocusAnchorRefOrNull: "detail://manifest-1-old",
    routeOrSceneRef: "/staff/manifests/1",
    triggerAction: "RESPONSIVE_RESTACK",
  });
  expect(remap.targetKind).toBe("SAME_OBJECT_REMAP");
  expect(remap.focusRestoration.restoration_disposition).toBe("REMAPPED_FOCUS");

  const summary = projectReturnTargetAndFallback({
    exactInvokerFocusAnchorRefOrNull: null,
    objectLossState: "EXACT_TARGET_STALE_SAME_OBJECT_LAWFUL",
    objectSummaryFocusAnchorRefOrNull: "summary://manifest-1",
    parentReturnFocusAnchorRefOrNull: "manifest-row://1",
    parentReturnRouteOrSceneRefOrNull: "/staff/manifests",
    requestedFocusAnchorRefOrNull: "detail://manifest-1-old",
    routeOrSceneRef: "/staff/manifests/1",
    triggerAction: "RESPONSIVE_RESTACK",
  });
  expect(summary.targetKind).toBe("OBJECT_SUMMARY");

  const fallback = projectReturnTargetAndFallback({
    fallbackFocusAnchorRefOrNull: "request-row://replacement",
    fallbackObjectRefOrNull: "request://replacement",
    fallbackRouteOrSceneRefOrNull: "/portal/documents/open-requests",
    objectLossState: "PARENT_STALE_NARROW_LIST_LAWFUL",
    parentReturnFocusAnchorRefOrNull: "request-row://stale",
    parentReturnRouteOrSceneRefOrNull: "/portal/documents",
    parentReturnTargetLawful: false,
    requestedFocusAnchorRefOrNull: "request-detail://stale-upload",
    routeOrSceneRef: "/portal/requests/stale",
    triggerAction: "STALE_REBASE_RECOVERY",
  });
  expect(fallback.targetKind).toBe("NARROWEST_SURVIVING_LIST");
  expect(fallback.routeOrSceneRefOrNull).toBe("/portal/documents/open-requests");
  expect(fallback.focusAnchorRefOrNull).toBe("request-row://replacement");
  expect(fallback.focusRestoration.restoration_disposition).toBe("PARENT_RETURN");
  expect(fallback.restorationReasonCodeOrNull).toBe("NARROWEST_SURVIVING_LIST_SELECTED");
});

test("keeps contextual parent return anchors aligned with cross-device continuity", () => {
  const request = {
    fallbackFocusAnchorRefOrNull: "request-row://7",
    fallbackRouteOrSceneRefOrNull: "/portal/documents",
    objectLossState: "EXACT_TARGET_VISIBLE" as const,
    parentReturnFocusAnchorRefOrNull: "request-row://7",
    parentReturnRouteOrSceneRefOrNull: "/portal/documents",
    requestedFocusAnchorRefOrNull: "request-detail://upload-panel",
    routeOrSceneRef: "/portal/requests/7",
    triggerAction: "BACK_NAVIGATION" as const,
  };
  const selection = projectReturnTargetAndFallback(request);
  validateReturnTargetNarrowness({
    continuityContract: {
      access_scope_hash_or_null: "access://client-7",
      action_posture_policy: "DOMINANCE_AND_SETTLEMENT_SERVER_AUTHORED_ONLY",
      allowed_embodiments: ["BROWSER_WIDE", "BROWSER_NARROW_STACKED"],
      canonical_object_ref: "request://7",
      compatibility_basis_class: "ROUTE_GUARD_AND_VISIBILITY",
      contract_version: "CROSS_DEVICE_CONTINUITY_V1",
      continuity_scope: "CLIENT_PORTAL_ROUTE",
      deep_link_return_policy: "EXPLICIT_PARENT_CONTEXT_AND_FOCUS",
      dominant_action_state_or_null: "ACTION_AVAILABLE",
      focus_anchor_ref_or_null: "request-detail://upload-panel",
      hydration_compatibility_policy: "TENANT_ACCESS_MASKING_AND_SESSION_BOUND",
      masking_scope_fingerprint_or_null: "mask://client-7",
      narrow_layout_policy: "STACK_WITHIN_SAME_SHELL",
      parent_context_ref_or_null: "/portal/documents",
      restoration_mode_policy: "EXPLICIT_CARRY_FORWARD_OR_REBASE_ONLY",
      return_focus_anchor_ref_or_null: "request-row://7",
      route_identity_ref: "/portal/requests/7",
      same_object_policy: "PRESERVE_EXACT_OBJECT_OR_EXPLICIT_LAWFUL_FALLBACK",
      same_shell_policy: "PRESERVE_SAME_SHELL_FAMILY",
      secondary_window_policy: "NOT_APPLICABLE",
      session_scope_ref_or_null: null,
      shell_family: "CLIENT_PORTAL_SHELL",
      stability_guard_hash_or_null: "guard://client-7",
      supported_invalidation_reason_codes: [
        "TENANT_SWITCH",
        "PRIVILEGE_DOWNGRADE",
        "ACCESS_BINDING_CHANGE",
        "MASKING_CHANGE",
        "VIEW_GUARD_CHANGE",
        "SESSION_REVOKED",
        "SCHEMA_INCOMPATIBLE",
        "OBJECT_GONE",
      ],
      visibility_cache_partition_key_or_null: "cache://client-7",
    },
    request,
    selection,
  });
  expect(selection.targetKind).toBe("PARENT_RETURN");
  expect(selection.focusAnchorRefOrNull).toBe("request-row://7");
});

test("rejects broad fallback and invalidated-with-lawful-target drift", () => {
  const selection = projectReturnTargetAndFallback({
    fallbackFocusAnchorRefOrNull: "request-row://1",
    fallbackRouteOrSceneRefOrNull: "/portal/documents",
    objectLossState: "PARENT_STALE_NARROW_LIST_LAWFUL",
    parentReturnTargetLawful: false,
    requestedFocusAnchorRefOrNull: "request-detail://gone",
    routeOrSceneRef: "/portal/requests/gone",
    triggerAction: "STALE_REBASE_RECOVERY",
  });
  const driftedSelection = { ...selection, routeOrSceneRefOrNull: "HOME" };
  expect(() =>
    validateReturnTargetNarrowness({
      request: {
        fallbackFocusAnchorRefOrNull: "request-row://1",
        fallbackRouteOrSceneRefOrNull: "/portal/documents",
        objectLossState: "PARENT_STALE_NARROW_LIST_LAWFUL",
        parentReturnTargetLawful: false,
        requestedFocusAnchorRefOrNull: "request-detail://gone",
        routeOrSceneRef: "/portal/requests/gone",
        triggerAction: "STALE_REBASE_RECOVERY",
      },
      selection: driftedSelection,
    }),
  ).toThrow(ReturnTargetNarrownessError);

  expect(() =>
    validateReturnTargetNarrowness({
      request: {
        exactInvokerFocusAnchorRefOrNull: "detail://still-visible",
        requestedFocusAnchorRefOrNull: "detail://still-visible",
        routeOrSceneRef: "/staff/manifests/1",
        triggerAction: "RESPONSIVE_RESTACK",
      },
      selection: {
        canonicalObjectRefOrNull: "manifest://1",
        fallbackOrderPolicy:
          "REMAP_WITHIN_OBJECT_THEN_OBJECT_SUMMARY_THEN_PARENT_RETURN_THEN_NARROWEST_LIST",
        focusAnchorRefOrNull: null,
        focusRestoration: projectFocusRestorationContract({
          requestedFocusAnchorRefOrNull: "detail://still-visible",
        }),
        restorationReasonCodeOrNull: "NO_LAWFUL_FOCUS_TARGET",
        routeOrSceneRefOrNull: null,
        targetKind: "INVALIDATED",
      },
    }),
  ).toThrow(ReturnTargetNarrownessError);
});

test("projects recovery navigation posture for live locks and parent-bound windows", () => {
  const liveUpdate = projectRecoveryNavigationPosture({
    activeFocusLockKindOrNull: "COMPARE_CONTROL",
    activeFocusLockRefOrNull: "compare-lock://1",
    exactInvokerFocusAnchorRefOrNull: "compare://control-1",
    requestedFocusAnchorRefOrNull: "compare://control-1",
    routeOrSceneRef: "/governance/policies/1",
    triggerAction: "LIVE_UPDATE_DURING_ACTIVE_INPUT",
  });
  expect(liveUpdate.focus_lock_policy).toBe("PRESERVE_ACTIVE_FOCUS_LOCK");
  expect(liveUpdate.recovery_navigation_state).toBe("RESTORE_INVOKER");

  const secondaryClose = projectRecoveryNavigationPosture({
    exactInvokerFocusAnchorRefOrNull: "secondary://detail",
    parentReturnFocusAnchorRefOrNull: "parent://launch",
    parentReturnRouteOrSceneRefOrNull: "native://primary-scene/1",
    requestedFocusAnchorRefOrNull: "secondary://detail",
    routeOrSceneRef: "native://secondary/1",
    triggerAction: "SECONDARY_WINDOW_CLOSE",
  });
  expect(secondaryClose.recovery_navigation_state).toBe("RETURN_TO_PARENT");
  expect(secondaryClose.focus_anchor_ref_or_null).toBe("parent://launch");
});

test("builds deterministic focus-restore harness case seeds", async () => {
  const harness = buildFocusRestoreCaseSeeds();
  const rerun = buildFocusRestoreCaseSeeds();

  expect(harness).toEqual(rerun);
  expect(harness.cases).toHaveLength(7);
  expect(harness.cases.map((entry) => entry.trigger_action)).toEqual([
    "CLOSE_SUPPORT_REGION",
    "BACK_NAVIGATION",
    "HELP_HANDOFF_RETURN",
    "STALE_REBASE_RECOVERY",
    "LIVE_UPDATE_DURING_ACTIVE_INPUT",
    "RESPONSIVE_RESTACK",
    "SECONDARY_WINDOW_CLOSE",
  ]);
  expect(harness.cases.every((entry) => entry.covered_modalities.includes("KEYBOARD_ONLY"))).toBe(
    true,
  );
  expect(
    harness.cases.find((entry) => entry.trigger_action === "HELP_HANDOFF_RETURN")
      ?.support_surface_kind_or_null,
  ).toBe("HELP_ROUTE");
  expect(
    harness.cases.find((entry) => entry.trigger_action === "SECONDARY_WINDOW_CLOSE")?.post_state
      .active_focus_anchor_ref_or_null,
  ).toBe("parent-scene://compare-launch");

  await validateContractSchema("focus_restore_return_target_harness", harness);
});
