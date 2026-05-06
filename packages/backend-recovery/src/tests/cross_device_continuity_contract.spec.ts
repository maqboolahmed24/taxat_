import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  buildCrossDeviceContinuityContract,
  buildGovernanceRouteContinuityContract,
  buildManifestRouteContinuityContract,
  buildNativeSecondaryWindowContinuityContract,
  buildNotificationOpenContinuityContract,
  buildWorkspaceRouteContinuityContract,
  classifyContinuityBasisClass,
  CROSS_DEVICE_GOVERNANCE_INVALIDATION_REASONS,
  CROSS_DEVICE_LOW_NOISE_INVALIDATION_REASONS,
  CROSS_DEVICE_NATIVE_SECONDARY_WORKSPACE_INVALIDATION_REASONS,
  CROSS_DEVICE_WORKSPACE_INVALIDATION_REASONS,
  CrossDeviceContinuityContractBuildError,
} from "../index.ts";

test("builds schema-valid workspace continuity with explicit route, object, parent, and invalidation truth", async () => {
  const contract = buildWorkspaceRouteContinuityContract({
    access_scope_hash_or_null: "access-workspace-205",
    canonical_object_ref: "workitem-205",
    dominant_action_state_or_null: "ACTION_AVAILABLE",
    focus_anchor_ref_or_null: "request:block:workitem-205",
    masking_scope_fingerprint_or_null: "mask-workspace-205",
    parent_context_ref_or_null: "/work",
    return_focus_anchor_ref_or_null: "queue-row:workitem-205",
    route_identity_ref: "/work/items/workitem-205",
    shell_family: "CALM_SHELL",
    stability_guard_hash_or_null: "workspace-guard-205",
    visibility_cache_partition_key_or_null: "workspace-cache-205",
  });

  await validateContractSchema("cross_device_continuity_contract", contract);
  expect(contract).toMatchObject({
    allowed_embodiments: [
      "BROWSER_WIDE",
      "BROWSER_NARROW_STACKED",
      "NATIVE_PRIMARY_SCENE",
      "NATIVE_SUPPORT_WINDOW",
    ],
    compatibility_basis_class: "ROUTE_GUARD_AND_VISIBILITY",
    continuity_scope: "WORKSPACE_ROUTE",
    parent_context_ref_or_null: "/work",
    return_focus_anchor_ref_or_null: "queue-row:workitem-205",
    secondary_window_policy: "SUPPORT_ONLY_PARENT_BOUND",
    shell_family: "CALM_SHELL",
    supported_invalidation_reason_codes: [...CROSS_DEVICE_WORKSPACE_INVALIDATION_REASONS],
  });
});

test("classifies every governed continuity surface into its compatibility basis", () => {
  expect(classifyContinuityBasisClass({ continuity_scope: "MANIFEST_ROUTE" })).toBe(
    "ROUTE_GUARD_ONLY",
  );
  expect(classifyContinuityBasisClass({ continuity_scope: "WORKSPACE_ROUTE" })).toBe(
    "ROUTE_GUARD_AND_VISIBILITY",
  );
  expect(classifyContinuityBasisClass({ continuity_scope: "CLIENT_PORTAL_ROUTE" })).toBe(
    "ROUTE_GUARD_AND_VISIBILITY",
  );
  expect(classifyContinuityBasisClass({ continuity_scope: "WORK_ITEM_NOTIFICATION" })).toBe(
    "VISIBILITY_ONLY",
  );
  expect(classifyContinuityBasisClass({ continuity_scope: "NATIVE_PRIMARY_SCENE" })).toBe(
    "SESSION_MASKING_AND_ROUTE_GUARD",
  );
  expect(classifyContinuityBasisClass({ surface_type: "NativeOperatorSecondaryWindowScene" })).toBe(
    "SESSION_MASKING_AND_PARENT_SCENE",
  );
  expect(classifyContinuityBasisClass({ surface_type: "TenantGovernanceSnapshot" })).toBe(
    "ROUTE_GUARD_ONLY",
  );
});

test("builds manifest and governance route-guard-only contracts that clear visibility fields", async () => {
  const manifest = buildManifestRouteContinuityContract({
    canonical_object_ref: "manifest-205",
    dominant_action_state_or_null: "NO_SAFE_ACTION",
    focus_anchor_ref_or_null: "summary-card:manifest-205",
    route_identity_ref: "/manifests/manifest-205",
    stability_guard_hash_or_null: "manifest-guard-205",
  });
  expect(manifest).toMatchObject({
    access_scope_hash_or_null: null,
    compatibility_basis_class: "ROUTE_GUARD_ONLY",
    masking_scope_fingerprint_or_null: null,
    session_scope_ref_or_null: null,
    supported_invalidation_reason_codes: [...CROSS_DEVICE_LOW_NOISE_INVALIDATION_REASONS],
    visibility_cache_partition_key_or_null: null,
  });
  await validateContractSchema("cross_device_continuity_contract", manifest);

  const governance = buildGovernanceRouteContinuityContract({
    canonical_object_ref: "/governance",
    dominant_action_state_or_null: "ACTION_AVAILABLE",
    focus_anchor_ref_or_null: "approval-cell:tenant-205",
    route_identity_ref: "/governance",
    stability_guard_hash_or_null: "policy-snapshot-205",
  });
  expect(governance).toMatchObject({
    compatibility_basis_class: "ROUTE_GUARD_ONLY",
    continuity_scope: "GOVERNANCE_ROUTE",
    shell_family: "GOVERNANCE_DENSITY_SHELL",
    supported_invalidation_reason_codes: [...CROSS_DEVICE_GOVERNANCE_INVALIDATION_REASONS],
  });
  await validateContractSchema("cross_device_continuity_contract", governance);
});

test("builds notification-open continuity as visibility-only and fails closed on action or basis drift", async () => {
  const notification = buildNotificationOpenContinuityContract({
    access_scope_hash_or_null: "access-notification-205",
    canonical_object_ref: "workitem-205",
    focus_anchor_ref_or_null: "request-info-focus://request-205",
    masking_scope_fingerprint_or_null: "mask-notification-205",
    parent_context_ref_or_null: "/work",
    return_focus_anchor_ref_or_null: "work-inbox-row://workitem-205",
    route_identity_ref: "/work/items/workitem-205",
    shell_family: "CALM_SHELL",
    visibility_cache_partition_key_or_null: "visibility-notification-205",
    visibility_class: "INTERNAL_ONLY",
  });

  expect(notification).toMatchObject({
    compatibility_basis_class: "VISIBILITY_ONLY",
    continuity_scope: "WORK_ITEM_NOTIFICATION",
    dominant_action_state_or_null: null,
    narrow_layout_policy: "NOT_APPLICABLE",
    secondary_window_policy: "SUPPORT_ONLY_PARENT_BOUND",
    supported_invalidation_reason_codes: [...CROSS_DEVICE_WORKSPACE_INVALIDATION_REASONS],
  });
  await validateContractSchema("cross_device_continuity_contract", notification);

  expect(() =>
    buildCrossDeviceContinuityContract({
      access_scope_hash_or_null: "access",
      canonical_object_ref: "workitem-205",
      continuity_scope: "WORK_ITEM_NOTIFICATION",
      dominant_action_state_or_null: "ACTION_AVAILABLE",
      focus_anchor_ref_or_null: "focus",
      masking_scope_fingerprint_or_null: "mask",
      parent_context_ref_or_null: "/work",
      return_focus_anchor_ref_or_null: "row",
      route_identity_ref: "/work/items/workitem-205",
      shell_family: "CALM_SHELL",
      visibility_cache_partition_key_or_null: "visibility",
    }),
  ).toThrow(CrossDeviceContinuityContractBuildError);

  expect(() =>
    buildCrossDeviceContinuityContract({
      access_scope_hash_or_null: "access",
      canonical_object_ref: "workitem-205",
      continuity_scope: "WORK_ITEM_NOTIFICATION",
      focus_anchor_ref_or_null: "focus",
      masking_scope_fingerprint_or_null: "mask",
      parent_context_ref_or_null: "/work",
      return_focus_anchor_ref_or_null: "row",
      route_identity_ref: "/work/items/workitem-205",
      shell_family: "CALM_SHELL",
      stability_guard_hash_or_null: "guard",
      visibility_cache_partition_key_or_null: "visibility",
    }),
  ).toThrow(/VISIBILITY_ONLY|stability_guard_hash_or_null/);
});

test("builds secondary native continuity as parent-bound non-dominant session continuity", async () => {
  const secondary = buildNativeSecondaryWindowContinuityContract({
    access_scope_hash_or_null: "access-native-205",
    canonical_object_ref: "workitem-205",
    focus_anchor_ref_or_null: "compare-row:item-205",
    masking_scope_fingerprint_or_null: "mask-native-205",
    native_object_family: "WORK_ITEM",
    parent_context_ref_or_null: "scene:primary:item-205",
    return_focus_anchor_ref_or_null: "canvas:item-205",
    route_identity_ref: "scene:secondary:compare:item-205",
    session_scope_ref_or_null: "native-session-205",
    stability_guard_hash_or_null: "native-guard-205",
  });

  expect(secondary).toMatchObject({
    compatibility_basis_class: "SESSION_MASKING_AND_PARENT_SCENE",
    continuity_scope: "NATIVE_SECONDARY_WINDOW",
    dominant_action_state_or_null: null,
    narrow_layout_policy: "NOT_APPLICABLE",
    parent_context_ref_or_null: "scene:primary:item-205",
    return_focus_anchor_ref_or_null: "canvas:item-205",
    secondary_window_policy: "SUPPORT_ONLY_PARENT_BOUND",
    supported_invalidation_reason_codes: [
      ...CROSS_DEVICE_NATIVE_SECONDARY_WORKSPACE_INVALIDATION_REASONS,
    ],
  });
  await validateContractSchema("cross_device_continuity_contract", secondary);

  expect(() =>
    buildCrossDeviceContinuityContract({
      canonical_object_ref: "workitem-205",
      continuity_scope: "NATIVE_SECONDARY_WINDOW",
      masking_scope_fingerprint_or_null: "mask-native-205",
      native_object_family: "WORK_ITEM",
      parent_context_ref_or_null: "scene:primary:item-205",
      return_focus_anchor_ref_or_null: null,
      route_identity_ref: "scene:secondary:compare:item-205",
      secondary_window_policy: "NOT_APPLICABLE",
      session_scope_ref_or_null: "native-session-205",
      shell_family: "CALM_SHELL",
      stability_guard_hash_or_null: "native-guard-205",
    }),
  ).toThrow(CrossDeviceContinuityContractBuildError);
});
