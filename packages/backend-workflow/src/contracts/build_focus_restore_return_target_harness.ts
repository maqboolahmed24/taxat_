import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { WorkflowModelError } from "../models/workflow_item.ts";

export type FocusRestoreHarnessStateSnapshot = {
  active_focus_anchor_ref_or_null: string | null;
  active_focus_lock_ref_or_null: string | null;
  browser_active_identifier_or_null: string | null;
  browser_return_identifier_or_null: string | null;
  canonical_object_ref_or_null: string | null;
  fallback_focus_anchor_ref_or_null: string | null;
  fallback_route_or_scene_ref_or_null: string | null;
  focus_restoration_disposition_or_null: string | null;
  focus_restoration_reason_code_or_null: string | null;
  native_active_identifier_or_null: string | null;
  native_return_identifier_or_null: string | null;
  return_focus_anchor_ref_or_null: string | null;
  return_route_or_scene_ref_or_null: string | null;
  route_or_scene_ref: string;
};

export type FocusRestoreHarnessCase = {
  active_focus_lock_kind_or_null: "COMPOSER" | "PICKER" | "COMPARE_CONTROL" | null;
  case_id: string;
  covered_modalities: ("KEYBOARD_ONLY" | "POINTER_BASELINE" | "ASSISTIVE_TECH")[];
  expected_focus_restoration_disposition:
    | "EXACT_FOCUS"
    | "REMAPPED_FOCUS"
    | "OBJECT_SUMMARY"
    | "PARENT_RETURN"
    | "INVALIDATED";
  expected_target_kind: "INVOKER" | "OBJECT_SUMMARY" | "PARENT_RETURN" | "NARROWEST_SURVIVING_LIST";
  focus_scope:
    | "MANIFEST_SUPPORT_REGION"
    | "WORKSPACE_DETAIL_ROUTE"
    | "CLIENT_PORTAL_CONTEXTUAL_ROUTE"
    | "GOVERNANCE_SUPPORT_ROUTE"
    | "NATIVE_SECONDARY_WINDOW";
  object_loss_state:
    | "EXACT_TARGET_VISIBLE"
    | "EXACT_TARGET_STALE_SAME_OBJECT_LAWFUL"
    | "OBJECT_STALE_PARENT_LAWFUL"
    | "PARENT_STALE_NARROW_LIST_LAWFUL";
  post_state: FocusRestoreHarnessStateSnapshot;
  pre_state: FocusRestoreHarnessStateSnapshot;
  support_surface_kind_or_null:
    | "TRAILING_INSPECTOR"
    | "DETAIL_DRAWER"
    | "CONTEXTUAL_DETAIL"
    | "HELP_ROUTE"
    | "SECONDARY_COMPARE_WINDOW"
    | null;
  surface_type:
    | "LowNoiseExperienceFrame"
    | "WorkspaceSnapshot"
    | "ClientPortalWorkspace"
    | "TenantGovernanceSnapshot"
    | "NativeOperatorSecondaryWindowScene";
  trigger_action:
    | "CLOSE_SUPPORT_REGION"
    | "BACK_NAVIGATION"
    | "HELP_HANDOFF_RETURN"
    | "STALE_REBASE_RECOVERY"
    | "LIVE_UPDATE_DURING_ACTIVE_INPUT"
    | "RESPONSIVE_RESTACK"
    | "SECONDARY_WINDOW_CLOSE";
};

export type CanonicalFocusRestoreReturnTargetHarness = {
  cases: FocusRestoreHarnessCase[];
  contract_version: "FOCUS_RESTORE_RETURN_TARGET_HARNESS_V1";
  deterministic_seed: number;
  fallback_order_policy: "REMAP_WITHIN_OBJECT_THEN_OBJECT_SUMMARY_THEN_PARENT_RETURN_THEN_NARROWEST_LIST";
  harness_id: string;
  help_handoff_policy: "HELP_HANDOFF_RETURNS_TO_SERIALIZED_SOURCE_ANCHOR";
  identifier_policy: "DATA_TESTID_AND_ACCESSIBILITY_IDENTIFIER_MIRROR_SERIALIZED_ANCHORS";
  live_update_focus_policy: "NEVER_STEAL_ACTIVE_COMPOSER_PICKER_OR_COMPARE_FOCUS";
  modality_policy: "KEYBOARD_FIRST_WITH_POINTER_AND_ASSISTIVE_PARITY";
  return_target_policy: "SERIALIZED_INVOKER_OR_NARROWEST_LAWFUL_FALLBACK";
  run_mode: "DETERMINISTIC_SEEDED_ENUMERATION";
  suite_profile: "KEYBOARD_FIRST_RETURN_TARGET_AND_FALLBACK_MATRIX";
};

export type BuildFocusRestoreReturnTargetHarnessInput = {
  deterministic_seed?: number | undefined;
  harness_id?: string | undefined;
};

const TOP_LEVEL_CONTRACT = {
  contract_version: "FOCUS_RESTORE_RETURN_TARGET_HARNESS_V1",
  suite_profile: "KEYBOARD_FIRST_RETURN_TARGET_AND_FALLBACK_MATRIX",
  run_mode: "DETERMINISTIC_SEEDED_ENUMERATION",
  modality_policy: "KEYBOARD_FIRST_WITH_POINTER_AND_ASSISTIVE_PARITY",
  identifier_policy: "DATA_TESTID_AND_ACCESSIBILITY_IDENTIFIER_MIRROR_SERIALIZED_ANCHORS",
  return_target_policy: "SERIALIZED_INVOKER_OR_NARROWEST_LAWFUL_FALLBACK",
  fallback_order_policy:
    "REMAP_WITHIN_OBJECT_THEN_OBJECT_SUMMARY_THEN_PARENT_RETURN_THEN_NARROWEST_LIST",
  live_update_focus_policy: "NEVER_STEAL_ACTIVE_COMPOSER_PICKER_OR_COMPARE_FOCUS",
  help_handoff_policy: "HELP_HANDOFF_RETURNS_TO_SERIALIZED_SOURCE_ANCHOR",
} as const;

function harnessError(message: string): never {
  throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", message);
}

function browserState(input: {
  active_focus_anchor_ref_or_null: string | null;
  active_focus_lock_ref_or_null?: string | null | undefined;
  canonical_object_ref_or_null: string | null;
  fallback_focus_anchor_ref_or_null: string | null;
  fallback_route_or_scene_ref_or_null: string | null;
  focus_restoration_disposition_or_null: string | null;
  focus_restoration_reason_code_or_null: string | null;
  return_focus_anchor_ref_or_null: string | null;
  return_route_or_scene_ref_or_null: string | null;
  route_or_scene_ref: string;
}): FocusRestoreHarnessStateSnapshot {
  return {
    route_or_scene_ref: input.route_or_scene_ref,
    canonical_object_ref_or_null: input.canonical_object_ref_or_null,
    active_focus_anchor_ref_or_null: input.active_focus_anchor_ref_or_null,
    return_route_or_scene_ref_or_null: input.return_route_or_scene_ref_or_null,
    return_focus_anchor_ref_or_null: input.return_focus_anchor_ref_or_null,
    fallback_route_or_scene_ref_or_null: input.fallback_route_or_scene_ref_or_null,
    fallback_focus_anchor_ref_or_null: input.fallback_focus_anchor_ref_or_null,
    focus_restoration_disposition_or_null: input.focus_restoration_disposition_or_null,
    focus_restoration_reason_code_or_null: input.focus_restoration_reason_code_or_null,
    browser_active_identifier_or_null: input.active_focus_anchor_ref_or_null,
    browser_return_identifier_or_null: input.return_focus_anchor_ref_or_null,
    native_active_identifier_or_null: null,
    native_return_identifier_or_null: null,
    active_focus_lock_ref_or_null: input.active_focus_lock_ref_or_null ?? null,
  };
}

function nativeState(input: {
  active_focus_anchor_ref_or_null: string | null;
  canonical_object_ref_or_null: string | null;
  fallback_focus_anchor_ref_or_null: string | null;
  fallback_route_or_scene_ref_or_null: string | null;
  focus_restoration_disposition_or_null: string | null;
  focus_restoration_reason_code_or_null: string | null;
  return_focus_anchor_ref_or_null: string | null;
  return_route_or_scene_ref_or_null: string | null;
  route_or_scene_ref: string;
}): FocusRestoreHarnessStateSnapshot {
  return {
    route_or_scene_ref: input.route_or_scene_ref,
    canonical_object_ref_or_null: input.canonical_object_ref_or_null,
    active_focus_anchor_ref_or_null: input.active_focus_anchor_ref_or_null,
    return_route_or_scene_ref_or_null: input.return_route_or_scene_ref_or_null,
    return_focus_anchor_ref_or_null: input.return_focus_anchor_ref_or_null,
    fallback_route_or_scene_ref_or_null: input.fallback_route_or_scene_ref_or_null,
    fallback_focus_anchor_ref_or_null: input.fallback_focus_anchor_ref_or_null,
    focus_restoration_disposition_or_null: input.focus_restoration_disposition_or_null,
    focus_restoration_reason_code_or_null: input.focus_restoration_reason_code_or_null,
    browser_active_identifier_or_null: null,
    browser_return_identifier_or_null: null,
    native_active_identifier_or_null: input.active_focus_anchor_ref_or_null,
    native_return_identifier_or_null: input.return_focus_anchor_ref_or_null,
    active_focus_lock_ref_or_null: null,
  };
}

function buildHarnessCases(): FocusRestoreHarnessCase[] {
  return [
    {
      case_id: "low-noise-responsive-restack-object-summary",
      surface_type: "LowNoiseExperienceFrame",
      focus_scope: "MANIFEST_SUPPORT_REGION",
      trigger_action: "RESPONSIVE_RESTACK",
      covered_modalities: ["KEYBOARD_ONLY", "POINTER_BASELINE", "ASSISTIVE_TECH"],
      object_loss_state: "EXACT_TARGET_STALE_SAME_OBJECT_LAWFUL",
      support_surface_kind_or_null: "TRAILING_INSPECTOR",
      active_focus_lock_kind_or_null: null,
      expected_target_kind: "OBJECT_SUMMARY",
      expected_focus_restoration_disposition: "OBJECT_SUMMARY",
      pre_state: browserState({
        route_or_scene_ref: "/manifests/manifest-0155",
        canonical_object_ref_or_null: "manifest-0155",
        active_focus_anchor_ref_or_null: "inspector:variance-chip:manifest-0155",
        return_route_or_scene_ref_or_null: "/manifests/manifest-0155",
        return_focus_anchor_ref_or_null: "summary-action:file-now:manifest-0155",
        fallback_route_or_scene_ref_or_null: "/manifests",
        fallback_focus_anchor_ref_or_null: "manifest-row:manifest-0155",
        focus_restoration_disposition_or_null: "EXACT_FOCUS",
        focus_restoration_reason_code_or_null: null,
      }),
      post_state: browserState({
        route_or_scene_ref: "/manifests/manifest-0155",
        canonical_object_ref_or_null: "manifest-0155",
        active_focus_anchor_ref_or_null: "summary-card:manifest-0155",
        return_route_or_scene_ref_or_null: null,
        return_focus_anchor_ref_or_null: null,
        fallback_route_or_scene_ref_or_null: "/manifests",
        fallback_focus_anchor_ref_or_null: "manifest-row:manifest-0155",
        focus_restoration_disposition_or_null: "OBJECT_SUMMARY",
        focus_restoration_reason_code_or_null: "RESPONSIVE_REGION_COLLAPSE",
      }),
    },
    {
      case_id: "workspace-drawer-close-returns-to-invoker",
      surface_type: "WorkspaceSnapshot",
      focus_scope: "WORKSPACE_DETAIL_ROUTE",
      trigger_action: "CLOSE_SUPPORT_REGION",
      covered_modalities: ["KEYBOARD_ONLY", "POINTER_BASELINE"],
      object_loss_state: "EXACT_TARGET_VISIBLE",
      support_surface_kind_or_null: "DETAIL_DRAWER",
      active_focus_lock_kind_or_null: null,
      expected_target_kind: "INVOKER",
      expected_focus_restoration_disposition: "EXACT_FOCUS",
      pre_state: browserState({
        route_or_scene_ref: "/work/items/workflow-item-0155",
        canonical_object_ref_or_null: "workflow-item-0155",
        active_focus_anchor_ref_or_null: "drawer:request-info:response",
        return_route_or_scene_ref_or_null: "/work/items/workflow-item-0155",
        return_focus_anchor_ref_or_null: "work-inbox-row://workflow-item-0155",
        fallback_route_or_scene_ref_or_null: "/work",
        fallback_focus_anchor_ref_or_null: "work-inbox-row://workflow-item-0155",
        focus_restoration_disposition_or_null: "EXACT_FOCUS",
        focus_restoration_reason_code_or_null: null,
      }),
      post_state: browserState({
        route_or_scene_ref: "/work/items/workflow-item-0155",
        canonical_object_ref_or_null: "workflow-item-0155",
        active_focus_anchor_ref_or_null: "work-inbox-row://workflow-item-0155",
        return_route_or_scene_ref_or_null: null,
        return_focus_anchor_ref_or_null: null,
        fallback_route_or_scene_ref_or_null: "/work",
        fallback_focus_anchor_ref_or_null: "work-inbox-row://workflow-item-0155",
        focus_restoration_disposition_or_null: "EXACT_FOCUS",
        focus_restoration_reason_code_or_null: null,
      }),
    },
    {
      case_id: "portal-back-returns-to-serialized-parent-anchor",
      surface_type: "ClientPortalWorkspace",
      focus_scope: "CLIENT_PORTAL_CONTEXTUAL_ROUTE",
      trigger_action: "BACK_NAVIGATION",
      covered_modalities: ["KEYBOARD_ONLY", "POINTER_BASELINE"],
      object_loss_state: "EXACT_TARGET_VISIBLE",
      support_surface_kind_or_null: "CONTEXTUAL_DETAIL",
      active_focus_lock_kind_or_null: null,
      expected_target_kind: "PARENT_RETURN",
      expected_focus_restoration_disposition: "EXACT_FOCUS",
      pre_state: browserState({
        route_or_scene_ref: "/portal/requests/workflow-item-0155",
        canonical_object_ref_or_null: "workflow-item-0155",
        active_focus_anchor_ref_or_null: "upload-request:block:workflow-item-0155",
        return_route_or_scene_ref_or_null: "/portal/requests",
        return_focus_anchor_ref_or_null: "customer-request-row://workflow-item-0155",
        fallback_route_or_scene_ref_or_null: "/portal/requests",
        fallback_focus_anchor_ref_or_null: "customer-request-row://workflow-item-0155",
        focus_restoration_disposition_or_null: "EXACT_FOCUS",
        focus_restoration_reason_code_or_null: null,
      }),
      post_state: browserState({
        route_or_scene_ref: "/portal/requests",
        canonical_object_ref_or_null: "workflow-item-0155",
        active_focus_anchor_ref_or_null: "customer-request-row://workflow-item-0155",
        return_route_or_scene_ref_or_null: null,
        return_focus_anchor_ref_or_null: null,
        fallback_route_or_scene_ref_or_null: "/portal/requests",
        fallback_focus_anchor_ref_or_null: "customer-request-row://workflow-item-0155",
        focus_restoration_disposition_or_null: "EXACT_FOCUS",
        focus_restoration_reason_code_or_null: null,
      }),
    },
    {
      case_id: "portal-help-handoff-returns-to-source-anchor",
      surface_type: "ClientPortalWorkspace",
      focus_scope: "CLIENT_PORTAL_CONTEXTUAL_ROUTE",
      trigger_action: "HELP_HANDOFF_RETURN",
      covered_modalities: ["KEYBOARD_ONLY", "ASSISTIVE_TECH"],
      object_loss_state: "EXACT_TARGET_VISIBLE",
      support_surface_kind_or_null: "HELP_ROUTE",
      active_focus_lock_kind_or_null: null,
      expected_target_kind: "PARENT_RETURN",
      expected_focus_restoration_disposition: "EXACT_FOCUS",
      pre_state: browserState({
        route_or_scene_ref: "/portal/help?request=workflow-item-0155",
        canonical_object_ref_or_null: "workflow-item-0155",
        active_focus_anchor_ref_or_null: "help:message-body:workflow-item-0155",
        return_route_or_scene_ref_or_null: "/portal/requests/workflow-item-0155",
        return_focus_anchor_ref_or_null: "help-link:workflow-item-0155",
        fallback_route_or_scene_ref_or_null: "/portal/requests",
        fallback_focus_anchor_ref_or_null: "customer-request-row://workflow-item-0155",
        focus_restoration_disposition_or_null: "EXACT_FOCUS",
        focus_restoration_reason_code_or_null: null,
      }),
      post_state: browserState({
        route_or_scene_ref: "/portal/requests/workflow-item-0155",
        canonical_object_ref_or_null: "workflow-item-0155",
        active_focus_anchor_ref_or_null: "help-link:workflow-item-0155",
        return_route_or_scene_ref_or_null: null,
        return_focus_anchor_ref_or_null: null,
        fallback_route_or_scene_ref_or_null: "/portal/requests",
        fallback_focus_anchor_ref_or_null: "customer-request-row://workflow-item-0155",
        focus_restoration_disposition_or_null: "EXACT_FOCUS",
        focus_restoration_reason_code_or_null: null,
      }),
    },
    {
      case_id: "workspace-stale-rebase-falls-back-to-narrow-list",
      surface_type: "WorkspaceSnapshot",
      focus_scope: "WORKSPACE_DETAIL_ROUTE",
      trigger_action: "STALE_REBASE_RECOVERY",
      covered_modalities: ["KEYBOARD_ONLY", "POINTER_BASELINE"],
      object_loss_state: "PARENT_STALE_NARROW_LIST_LAWFUL",
      support_surface_kind_or_null: "CONTEXTUAL_DETAIL",
      active_focus_lock_kind_or_null: null,
      expected_target_kind: "NARROWEST_SURVIVING_LIST",
      expected_focus_restoration_disposition: "PARENT_RETURN",
      pre_state: browserState({
        route_or_scene_ref: "/work/items/workflow-item-0155-stale",
        canonical_object_ref_or_null: "workflow-item-0155-stale",
        active_focus_anchor_ref_or_null: "comparison-control:workflow-item-0155-stale",
        return_route_or_scene_ref_or_null: "/work/inbox/all-open",
        return_focus_anchor_ref_or_null: "work-inbox-row://workflow-item-0155-stale",
        fallback_route_or_scene_ref_or_null: "/work/inbox/awaiting-triage",
        fallback_focus_anchor_ref_or_null: "work-inbox-row://workflow-item-0155-stale:awaiting-triage",
        focus_restoration_disposition_or_null: "EXACT_FOCUS",
        focus_restoration_reason_code_or_null: null,
      }),
      post_state: browserState({
        route_or_scene_ref: "/work/inbox/awaiting-triage",
        canonical_object_ref_or_null: "workflow-item-0155-stale",
        active_focus_anchor_ref_or_null: "work-inbox-row://workflow-item-0155-stale:awaiting-triage",
        return_route_or_scene_ref_or_null: null,
        return_focus_anchor_ref_or_null: null,
        fallback_route_or_scene_ref_or_null: "/work/inbox/awaiting-triage",
        fallback_focus_anchor_ref_or_null: "work-inbox-row://workflow-item-0155-stale:awaiting-triage",
        focus_restoration_disposition_or_null: "PARENT_RETURN",
        focus_restoration_reason_code_or_null: "STALE_DETAIL_REOPEN_FORBIDDEN",
      }),
    },
    {
      case_id: "governance-live-update-preserves-active-compare-focus",
      surface_type: "TenantGovernanceSnapshot",
      focus_scope: "GOVERNANCE_SUPPORT_ROUTE",
      trigger_action: "LIVE_UPDATE_DURING_ACTIVE_INPUT",
      covered_modalities: ["KEYBOARD_ONLY", "ASSISTIVE_TECH"],
      object_loss_state: "EXACT_TARGET_VISIBLE",
      support_surface_kind_or_null: "TRAILING_INSPECTOR",
      active_focus_lock_kind_or_null: "COMPARE_CONTROL",
      expected_target_kind: "INVOKER",
      expected_focus_restoration_disposition: "EXACT_FOCUS",
      pre_state: browserState({
        route_or_scene_ref: "/governance/risk/pending-approvals",
        canonical_object_ref_or_null: "tenant-0155",
        active_focus_anchor_ref_or_null: "compare-toggle:tenant-0155",
        return_route_or_scene_ref_or_null: "/governance/risk/pending-approvals",
        return_focus_anchor_ref_or_null: "approval-cell:tenant-0155",
        fallback_route_or_scene_ref_or_null: "/governance/risk/pending-approvals",
        fallback_focus_anchor_ref_or_null: "approval-cell:tenant-0155",
        focus_restoration_disposition_or_null: "EXACT_FOCUS",
        focus_restoration_reason_code_or_null: null,
        active_focus_lock_ref_or_null: "compare-toggle:tenant-0155",
      }),
      post_state: browserState({
        route_or_scene_ref: "/governance/risk/pending-approvals",
        canonical_object_ref_or_null: "tenant-0155",
        active_focus_anchor_ref_or_null: "compare-toggle:tenant-0155",
        return_route_or_scene_ref_or_null: "/governance/risk/pending-approvals",
        return_focus_anchor_ref_or_null: "approval-cell:tenant-0155",
        fallback_route_or_scene_ref_or_null: "/governance/risk/pending-approvals",
        fallback_focus_anchor_ref_or_null: "approval-cell:tenant-0155",
        focus_restoration_disposition_or_null: "EXACT_FOCUS",
        focus_restoration_reason_code_or_null: null,
        active_focus_lock_ref_or_null: "compare-toggle:tenant-0155",
      }),
    },
    {
      case_id: "native-secondary-window-close-restores-parent-focus",
      surface_type: "NativeOperatorSecondaryWindowScene",
      focus_scope: "NATIVE_SECONDARY_WINDOW",
      trigger_action: "SECONDARY_WINDOW_CLOSE",
      covered_modalities: ["KEYBOARD_ONLY", "POINTER_BASELINE", "ASSISTIVE_TECH"],
      object_loss_state: "EXACT_TARGET_VISIBLE",
      support_surface_kind_or_null: "SECONDARY_COMPARE_WINDOW",
      active_focus_lock_kind_or_null: null,
      expected_target_kind: "PARENT_RETURN",
      expected_focus_restoration_disposition: "EXACT_FOCUS",
      pre_state: nativeState({
        route_or_scene_ref: "scene:secondary:compare:workflow-item-0155",
        canonical_object_ref_or_null: "workflow-item-0155",
        active_focus_anchor_ref_or_null: "compare-row:workflow-item-0155",
        return_route_or_scene_ref_or_null: "scene:primary:workflow-item-0155",
        return_focus_anchor_ref_or_null: "canvas:workflow-item-0155",
        fallback_route_or_scene_ref_or_null: "scene:primary:workflow-item-0155",
        fallback_focus_anchor_ref_or_null: "canvas:workflow-item-0155",
        focus_restoration_disposition_or_null: "EXACT_FOCUS",
        focus_restoration_reason_code_or_null: null,
      }),
      post_state: nativeState({
        route_or_scene_ref: "scene:primary:workflow-item-0155",
        canonical_object_ref_or_null: "workflow-item-0155",
        active_focus_anchor_ref_or_null: "canvas:workflow-item-0155",
        return_route_or_scene_ref_or_null: null,
        return_focus_anchor_ref_or_null: null,
        fallback_route_or_scene_ref_or_null: "scene:primary:workflow-item-0155",
        fallback_focus_anchor_ref_or_null: "canvas:workflow-item-0155",
        focus_restoration_disposition_or_null: "EXACT_FOCUS",
        focus_restoration_reason_code_or_null: null,
      }),
    },
  ];
}

export function validateFocusRestoreReturnTargetHarness(
  harness: CanonicalFocusRestoreReturnTargetHarness,
): CanonicalFocusRestoreReturnTargetHarness {
  if (harness.contract_version !== TOP_LEVEL_CONTRACT.contract_version) {
    harnessError("focus_restore_return_target_harness.contract_version drifted");
  }
  if (harness.suite_profile !== TOP_LEVEL_CONTRACT.suite_profile) {
    harnessError("focus_restore_return_target_harness.suite_profile drifted");
  }
  if (harness.run_mode !== TOP_LEVEL_CONTRACT.run_mode) {
    harnessError("focus_restore_return_target_harness.run_mode drifted");
  }
  if (harness.cases.length < 7) {
    harnessError("focus_restore_return_target_harness must include at least seven cases");
  }
  const triggerActions = new Set(harness.cases.map((harnessCase) => harnessCase.trigger_action));
  for (const triggerAction of [
    "CLOSE_SUPPORT_REGION",
    "BACK_NAVIGATION",
    "HELP_HANDOFF_RETURN",
    "STALE_REBASE_RECOVERY",
    "LIVE_UPDATE_DURING_ACTIVE_INPUT",
    "RESPONSIVE_RESTACK",
    "SECONDARY_WINDOW_CLOSE",
  ] as const) {
    if (!triggerActions.has(triggerAction)) {
      harnessError(`focus_restore_return_target_harness is missing ${triggerAction}`);
    }
  }
  if (!harness.cases.some((harnessCase) => harnessCase.covered_modalities.includes("ASSISTIVE_TECH"))) {
    harnessError("focus_restore_return_target_harness must include assistive-tech parity");
  }
  if (!harness.cases.every((harnessCase) => harnessCase.covered_modalities.includes("KEYBOARD_ONLY"))) {
    harnessError("every focus restore harness case must include KEYBOARD_ONLY");
  }
  if (!harness.cases.some((harnessCase) => harnessCase.focus_scope === "NATIVE_SECONDARY_WINDOW")) {
    harnessError("focus_restore_return_target_harness must include native secondary coverage");
  }
  return harness;
}

export function buildFocusRestoreReturnTargetHarness(
  input: BuildFocusRestoreReturnTargetHarnessInput = {},
): CanonicalFocusRestoreReturnTargetHarness {
  const deterministicSeed = input.deterministic_seed ?? 15501;
  if (!Number.isInteger(deterministicSeed) || deterministicSeed < 0) {
    harnessError("focus_restore_return_target_harness.deterministic_seed must be a non-negative integer");
  }
  return validateFocusRestoreReturnTargetHarness({
    ...TOP_LEVEL_CONTRACT,
    harness_id: input.harness_id ?? `focus-restore-return-target-harness-${deterministicSeed}`,
    deterministic_seed: deterministicSeed,
    cases: buildHarnessCases(),
  });
}

export function focusRestoreReturnTargetHarnessContentFingerprint(
  harness: CanonicalFocusRestoreReturnTargetHarness,
) {
  return stableJsonHash(validateFocusRestoreReturnTargetHarness(harness));
}
