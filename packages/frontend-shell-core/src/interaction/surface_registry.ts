import type { InteractionLayerFoundationContract } from "../route_contracts/interaction_layer_foundation";
import type { ShellFamilyCode } from "../route_contracts/semantic_accessibility";
import {
  assertInteractionFoundationAlignment,
  buildInteractionLayerFoundationContract,
} from "./foundation_contract";
import { failInteractionContract } from "./interaction_contract_errors";
import {
  enforcePromotedSupportSurfaceBudget,
  type SupportSurfaceBudgetDecision,
  type SupportSurfaceMode,
} from "./support_surface_budget";

export type SurfaceRole =
  | "SHELL_ROOT"
  | "STRUCTURAL_CONTEXT"
  | "PRIMARY_WORKSPACE"
  | "PRIMARY_ACTION"
  | "PROMOTED_SUPPORT"
  | "NOTICE"
  | "RETURN_CONTROL";

export type SupportPlacement =
  | "RIGHT_SUPPORT"
  | "STACK_BELOW_PRIMARY"
  | "AUXILIARY_SIDECAR"
  | "AUXILIARY_REDOCK"
  | "PARENT_BOUND_SECONDARY_WINDOW"
  | "NOT_SUPPORT";

export type SurfaceModalEligibility =
  | "NEVER_MODAL"
  | "NON_MODAL_BY_DEFAULT"
  | "EXPLICIT_HIGH_RISK_CHECKPOINT_ONLY";

export type LiveRegionRole = "none" | "status" | "alert";

export type ReturnFocusBehavior =
  | "NONE"
  | "RETURN_TO_INVOKER_OR_LAWFUL_ANCESTOR"
  | "RETURN_FOCUS_ANCHOR_THEN_LATEST_VISIBLE"
  | "RETURN_FOCUS_ANCHOR_OR_ROVING_SELECTION";

export type SurfaceRegistryEntry = {
  shell_family: ShellFamilyCode;
  surface_code: string;
  semantic_anchor_ref: string;
  label: string;
  role: SurfaceRole;
  default_reading_order_index: number | null;
  promoted_support_eligible: boolean;
  default_promoted_support: boolean;
  support_mode: "DEFAULT" | "COMPARE" | "AUDIT" | "BLOCKER" | "HELP" | "RECOVERY";
  support_placement: SupportPlacement;
  modal_eligibility: SurfaceModalEligibility;
  live_region_role: LiveRegionRole;
  artifact_preview_policy: InteractionLayerFoundationContract["preview_surface_policy"] | "NOT_ARTIFACT_PREVIEW";
  return_focus_behavior: ReturnFocusBehavior;
  writable_controls_allowed: boolean;
};

export type SurfaceMountPlan = {
  shell_family: ShellFamilyCode;
  foundation_contract: InteractionLayerFoundationContract;
  default_reading_order: readonly string[];
  mounted_surfaces: readonly SurfaceRegistryEntry[];
  promoted_support_regions: readonly SurfaceRegistryEntry[];
  support_budget: SupportSurfaceBudgetDecision;
  notification_surface_policy: InteractionLayerFoundationContract["notification_surface_policy"];
  preview_surface_policy: InteractionLayerFoundationContract["preview_surface_policy"];
  recovery_surface_policy: InteractionLayerFoundationContract["recovery_surface_policy"];
};

const calmSurfaceRegistry = [
  {
    artifact_preview_policy: "NOT_ARTIFACT_PREVIEW",
    default_promoted_support: false,
    default_reading_order_index: 0,
    label: "Context bar",
    live_region_role: "status",
    modal_eligibility: "NEVER_MODAL",
    promoted_support_eligible: false,
    return_focus_behavior: "NONE",
    role: "STRUCTURAL_CONTEXT",
    semantic_anchor_ref: "calm.context-bar",
    shell_family: "CALM_SHELL",
    support_mode: "DEFAULT",
    support_placement: "NOT_SUPPORT",
    surface_code: "CONTEXT_BAR",
    writable_controls_allowed: false,
  },
  {
    artifact_preview_policy: "NOT_ARTIFACT_PREVIEW",
    default_promoted_support: false,
    default_reading_order_index: 1,
    label: "Decision summary",
    live_region_role: "none",
    modal_eligibility: "NEVER_MODAL",
    promoted_support_eligible: false,
    return_focus_behavior: "NONE",
    role: "PRIMARY_WORKSPACE",
    semantic_anchor_ref: "calm.decision-summary",
    shell_family: "CALM_SHELL",
    support_mode: "DEFAULT",
    support_placement: "NOT_SUPPORT",
    surface_code: "DECISION_SUMMARY",
    writable_controls_allowed: false,
  },
  {
    artifact_preview_policy: "NOT_ARTIFACT_PREVIEW",
    default_promoted_support: false,
    default_reading_order_index: 2,
    label: "Action strip",
    live_region_role: "none",
    modal_eligibility: "NEVER_MODAL",
    promoted_support_eligible: false,
    return_focus_behavior: "NONE",
    role: "PRIMARY_ACTION",
    semantic_anchor_ref: "calm.action-strip",
    shell_family: "CALM_SHELL",
    support_mode: "DEFAULT",
    support_placement: "NOT_SUPPORT",
    surface_code: "ACTION_STRIP",
    writable_controls_allowed: true,
  },
  {
    artifact_preview_policy: "DETAIL_DRAWER_OR_PARENT_BOUND_SECONDARY_WINDOW",
    default_promoted_support: true,
    default_reading_order_index: 3,
    label: "Detail drawer",
    live_region_role: "none",
    modal_eligibility: "NON_MODAL_BY_DEFAULT",
    promoted_support_eligible: true,
    return_focus_behavior: "RETURN_TO_INVOKER_OR_LAWFUL_ANCESTOR",
    role: "PROMOTED_SUPPORT",
    semantic_anchor_ref: "calm.detail-drawer",
    shell_family: "CALM_SHELL",
    support_mode: "DEFAULT",
    support_placement: "RIGHT_SUPPORT",
    surface_code: "DETAIL_DRAWER",
    writable_controls_allowed: false,
  },
  {
    artifact_preview_policy: "DETAIL_DRAWER_OR_PARENT_BOUND_SECONDARY_WINDOW",
    default_promoted_support: false,
    default_reading_order_index: null,
    label: "Compare support",
    live_region_role: "none",
    modal_eligibility: "NON_MODAL_BY_DEFAULT",
    promoted_support_eligible: true,
    return_focus_behavior: "RETURN_TO_INVOKER_OR_LAWFUL_ANCESTOR",
    role: "PROMOTED_SUPPORT",
    semantic_anchor_ref: "calm.compare-support",
    shell_family: "CALM_SHELL",
    support_mode: "COMPARE",
    support_placement: "RIGHT_SUPPORT",
    surface_code: "CALM_COMPARE_SUPPORT",
    writable_controls_allowed: false,
  },
  {
    artifact_preview_policy: "DETAIL_DRAWER_OR_PARENT_BOUND_SECONDARY_WINDOW",
    default_promoted_support: false,
    default_reading_order_index: null,
    label: "Audit support",
    live_region_role: "none",
    modal_eligibility: "NON_MODAL_BY_DEFAULT",
    promoted_support_eligible: true,
    return_focus_behavior: "RETURN_TO_INVOKER_OR_LAWFUL_ANCESTOR",
    role: "PROMOTED_SUPPORT",
    semantic_anchor_ref: "calm.audit-support",
    shell_family: "CALM_SHELL",
    support_mode: "AUDIT",
    support_placement: "RIGHT_SUPPORT",
    surface_code: "CALM_AUDIT_SUPPORT",
    writable_controls_allowed: false,
  },
  {
    artifact_preview_policy: "NOT_ARTIFACT_PREVIEW",
    default_promoted_support: false,
    default_reading_order_index: null,
    label: "Recovery notice",
    live_region_role: "status",
    modal_eligibility: "NEVER_MODAL",
    promoted_support_eligible: false,
    return_focus_behavior: "NONE",
    role: "NOTICE",
    semantic_anchor_ref: "calm.recovery-notice",
    shell_family: "CALM_SHELL",
    support_mode: "RECOVERY",
    support_placement: "NOT_SUPPORT",
    surface_code: "RECOVERY_NOTICE",
    writable_controls_allowed: false,
  },
] as const satisfies readonly SurfaceRegistryEntry[];

const portalSurfaceRegistry = [
  {
    artifact_preview_policy: "NOT_ARTIFACT_PREVIEW",
    default_promoted_support: false,
    default_reading_order_index: 0,
    label: "Identity header",
    live_region_role: "none",
    modal_eligibility: "NEVER_MODAL",
    promoted_support_eligible: false,
    return_focus_behavior: "NONE",
    role: "STRUCTURAL_CONTEXT",
    semantic_anchor_ref: "portal.identity-header",
    shell_family: "CLIENT_PORTAL_SHELL",
    support_mode: "DEFAULT",
    support_placement: "NOT_SUPPORT",
    surface_code: "IDENTITY_HEADER",
    writable_controls_allowed: false,
  },
  {
    artifact_preview_policy: "NOT_ARTIFACT_PREVIEW",
    default_promoted_support: false,
    default_reading_order_index: 1,
    label: "Status hero",
    live_region_role: "status",
    modal_eligibility: "NEVER_MODAL",
    promoted_support_eligible: false,
    return_focus_behavior: "NONE",
    role: "PRIMARY_WORKSPACE",
    semantic_anchor_ref: "portal.status-hero",
    shell_family: "CLIENT_PORTAL_SHELL",
    support_mode: "DEFAULT",
    support_placement: "NOT_SUPPORT",
    surface_code: "SUMMARY_CARD",
    writable_controls_allowed: false,
  },
  {
    artifact_preview_policy: "NOT_ARTIFACT_PREVIEW",
    default_promoted_support: false,
    default_reading_order_index: 2,
    label: "Primary action",
    live_region_role: "none",
    modal_eligibility: "NEVER_MODAL",
    promoted_support_eligible: false,
    return_focus_behavior: "NONE",
    role: "PRIMARY_ACTION",
    semantic_anchor_ref: "portal.primary-action",
    shell_family: "CLIENT_PORTAL_SHELL",
    support_mode: "DEFAULT",
    support_placement: "NOT_SUPPORT",
    surface_code: "PRIMARY_ACTION",
    writable_controls_allowed: true,
  },
  {
    artifact_preview_policy: "PRIMARY_CONTEXT_WITH_STACKED_SUPPORT",
    default_promoted_support: true,
    default_reading_order_index: 3,
    label: "Promoted support region",
    live_region_role: "status",
    modal_eligibility: "NON_MODAL_BY_DEFAULT",
    promoted_support_eligible: true,
    return_focus_behavior: "RETURN_FOCUS_ANCHOR_THEN_LATEST_VISIBLE",
    role: "PROMOTED_SUPPORT",
    semantic_anchor_ref: "portal.promoted-support-region",
    shell_family: "CLIENT_PORTAL_SHELL",
    support_mode: "HELP",
    support_placement: "STACK_BELOW_PRIMARY",
    surface_code: "PROMOTED_SUPPORT_REGION",
    writable_controls_allowed: false,
  },
  {
    artifact_preview_policy: "NOT_ARTIFACT_PREVIEW",
    default_promoted_support: false,
    default_reading_order_index: null,
    label: "Limitation notice",
    live_region_role: "status",
    modal_eligibility: "NEVER_MODAL",
    promoted_support_eligible: true,
    return_focus_behavior: "RETURN_FOCUS_ANCHOR_THEN_LATEST_VISIBLE",
    role: "NOTICE",
    semantic_anchor_ref: "portal.limitation-notice",
    shell_family: "CLIENT_PORTAL_SHELL",
    support_mode: "RECOVERY",
    support_placement: "STACK_BELOW_PRIMARY",
    surface_code: "LIMITATION_NOTICE",
    writable_controls_allowed: false,
  },
] as const satisfies readonly SurfaceRegistryEntry[];

const governanceSurfaceRegistry = [
  {
    artifact_preview_policy: "NOT_ARTIFACT_PREVIEW",
    default_promoted_support: false,
    default_reading_order_index: 0,
    label: "Primary worklist",
    live_region_role: "none",
    modal_eligibility: "NEVER_MODAL",
    promoted_support_eligible: false,
    return_focus_behavior: "NONE",
    role: "STRUCTURAL_CONTEXT",
    semantic_anchor_ref: "governance.primary-worklist",
    shell_family: "GOVERNANCE_DENSITY_SHELL",
    support_mode: "DEFAULT",
    support_placement: "NOT_SUPPORT",
    surface_code: "PRIMARY_WORKLIST",
    writable_controls_allowed: false,
  },
  {
    artifact_preview_policy: "NOT_ARTIFACT_PREVIEW",
    default_promoted_support: false,
    default_reading_order_index: 1,
    label: "Workspace header",
    live_region_role: "status",
    modal_eligibility: "NEVER_MODAL",
    promoted_support_eligible: false,
    return_focus_behavior: "NONE",
    role: "STRUCTURAL_CONTEXT",
    semantic_anchor_ref: "governance.workspace-header",
    shell_family: "GOVERNANCE_DENSITY_SHELL",
    support_mode: "DEFAULT",
    support_placement: "NOT_SUPPORT",
    surface_code: "WORKSPACE_HEADER",
    writable_controls_allowed: false,
  },
  {
    artifact_preview_policy: "NOT_ARTIFACT_PREVIEW",
    default_promoted_support: false,
    default_reading_order_index: 2,
    label: "Primary canvas",
    live_region_role: "none",
    modal_eligibility: "NEVER_MODAL",
    promoted_support_eligible: false,
    return_focus_behavior: "NONE",
    role: "PRIMARY_WORKSPACE",
    semantic_anchor_ref: "governance.primary-canvas",
    shell_family: "GOVERNANCE_DENSITY_SHELL",
    support_mode: "DEFAULT",
    support_placement: "NOT_SUPPORT",
    surface_code: "PRIMARY_CANVAS",
    writable_controls_allowed: true,
  },
  {
    artifact_preview_policy: "AUXILIARY_SURFACE_CONTEXTUAL_ONLY",
    default_promoted_support: true,
    default_reading_order_index: 3,
    label: "Trailing inspector",
    live_region_role: "none",
    modal_eligibility: "EXPLICIT_HIGH_RISK_CHECKPOINT_ONLY",
    promoted_support_eligible: true,
    return_focus_behavior: "RETURN_FOCUS_ANCHOR_OR_ROVING_SELECTION",
    role: "PROMOTED_SUPPORT",
    semantic_anchor_ref: "governance.trailing-inspector",
    shell_family: "GOVERNANCE_DENSITY_SHELL",
    support_mode: "DEFAULT",
    support_placement: "AUXILIARY_SIDECAR",
    surface_code: "TRAILING_INSPECTOR",
    writable_controls_allowed: false,
  },
  {
    artifact_preview_policy: "AUXILIARY_SURFACE_CONTEXTUAL_ONLY",
    default_promoted_support: false,
    default_reading_order_index: null,
    label: "Audit sidecar",
    live_region_role: "none",
    modal_eligibility: "EXPLICIT_HIGH_RISK_CHECKPOINT_ONLY",
    promoted_support_eligible: true,
    return_focus_behavior: "RETURN_FOCUS_ANCHOR_OR_ROVING_SELECTION",
    role: "PROMOTED_SUPPORT",
    semantic_anchor_ref: "governance.audit-sidecar",
    shell_family: "GOVERNANCE_DENSITY_SHELL",
    support_mode: "AUDIT",
    support_placement: "AUXILIARY_SIDECAR",
    surface_code: "AUDIT_SIDECAR",
    writable_controls_allowed: false,
  },
  {
    artifact_preview_policy: "AUXILIARY_SURFACE_CONTEXTUAL_ONLY",
    default_promoted_support: false,
    default_reading_order_index: null,
    label: "Event diff inspector",
    live_region_role: "none",
    modal_eligibility: "EXPLICIT_HIGH_RISK_CHECKPOINT_ONLY",
    promoted_support_eligible: true,
    return_focus_behavior: "RETURN_FOCUS_ANCHOR_OR_ROVING_SELECTION",
    role: "PROMOTED_SUPPORT",
    semantic_anchor_ref: "governance.event-diff-inspector",
    shell_family: "GOVERNANCE_DENSITY_SHELL",
    support_mode: "COMPARE",
    support_placement: "AUXILIARY_SIDECAR",
    surface_code: "EVENT_DIFF_INSPECTOR",
    writable_controls_allowed: false,
  },
  {
    artifact_preview_policy: "AUXILIARY_SURFACE_CONTEXTUAL_ONLY",
    default_promoted_support: false,
    default_reading_order_index: null,
    label: "Recovery notice",
    live_region_role: "status",
    modal_eligibility: "NEVER_MODAL",
    promoted_support_eligible: false,
    return_focus_behavior: "NONE",
    role: "NOTICE",
    semantic_anchor_ref: "governance.recovery-notice",
    shell_family: "GOVERNANCE_DENSITY_SHELL",
    support_mode: "RECOVERY",
    support_placement: "NOT_SUPPORT",
    surface_code: "RECOVERY_NOTICE",
    writable_controls_allowed: false,
  },
] as const satisfies readonly SurfaceRegistryEntry[];

export const surfaceRegistryByShellFamily = Object.freeze({
  CALM_SHELL: calmSurfaceRegistry,
  CLIENT_PORTAL_SHELL: portalSurfaceRegistry,
  GOVERNANCE_DENSITY_SHELL: governanceSurfaceRegistry,
} as const satisfies Record<ShellFamilyCode, readonly SurfaceRegistryEntry[]>);

export function getSurfaceRegistry(shellFamily: ShellFamilyCode) {
  return surfaceRegistryByShellFamily[shellFamily];
}

export function getSurfaceRegistryEntry(shellFamily: ShellFamilyCode, surfaceCode: string) {
  const entry = surfaceRegistryByShellFamily[shellFamily].find(
    (candidate) => candidate.surface_code === surfaceCode,
  );
  if (!entry) {
    failInteractionContract(
      "SURFACE_REGISTRY_UNKNOWN_SURFACE",
      `${surfaceCode} is not registered for ${shellFamily}.`,
      { shell_family: shellFamily, surface_code: surfaceCode },
    );
  }
  return entry;
}

export function defaultReadingOrderForShell(shellFamily: ShellFamilyCode) {
  return surfaceRegistryByShellFamily[shellFamily]
    .filter((entry) => entry.default_reading_order_index !== null)
    .toSorted(
      (left, right) =>
        Number(left.default_reading_order_index) - Number(right.default_reading_order_index),
    )
    .map((entry) => entry.surface_code);
}

function defaultPromotedSupportForShell(shellFamily: ShellFamilyCode) {
  return surfaceRegistryByShellFamily[shellFamily]
    .filter((entry) => entry.default_promoted_support)
    .map((entry) => entry.surface_code);
}

function assertMountedSurfaceFamily(shellFamily: ShellFamilyCode, entry: SurfaceRegistryEntry) {
  if (entry.shell_family !== shellFamily) {
    failInteractionContract(
      "SURFACE_REGISTRY_FAMILY_MISMATCH",
      `${entry.surface_code} belongs to ${entry.shell_family}, not ${shellFamily}.`,
      {
        expected_shell_family: shellFamily,
        received_shell_family: entry.shell_family,
        surface_code: entry.surface_code,
      },
    );
  }
}

function assertDefaultReadingOrder(shellFamily: ShellFamilyCode, mountedSurfaces: readonly SurfaceRegistryEntry[]) {
  const orderedMountedDefaults = mountedSurfaces
    .filter((entry) => entry.default_reading_order_index !== null)
    .map((entry) => entry.surface_code);
  const expected = defaultReadingOrderForShell(shellFamily).filter((surfaceCode) =>
    orderedMountedDefaults.includes(surfaceCode),
  );

  if (JSON.stringify(orderedMountedDefaults) !== JSON.stringify(expected)) {
    failInteractionContract(
      "SURFACE_REGISTRY_READING_ORDER_DRIFT",
      `${shellFamily} mounted surfaces drifted from the default semantic reading order.`,
      { shell_family: shellFamily, expected, received: orderedMountedDefaults },
    );
  }
}

function assertModalEligibility(input: {
  highRiskCheckpointRef?: string | undefined;
  modalSurfaceCodes: readonly string[];
  shellFamily: ShellFamilyCode;
}) {
  for (const surfaceCode of input.modalSurfaceCodes) {
    const entry = getSurfaceRegistryEntry(input.shellFamily, surfaceCode);
    if (input.shellFamily === "GOVERNANCE_DENSITY_SHELL" && !input.highRiskCheckpointRef) {
      failInteractionContract(
        "GOVERNANCE_MODAL_CHECKPOINT_REQUIRED",
        "Ordinary governance inspectors remain non-modal without an explicit high-risk checkpoint.",
        { shell_family: input.shellFamily, surface_code: surfaceCode },
      );
    }
    if (entry.modal_eligibility === "NEVER_MODAL") {
      failInteractionContract(
        "GOVERNANCE_MODAL_SURFACE_NOT_ELIGIBLE",
        `${surfaceCode} is not eligible for modal presentation.`,
        { shell_family: input.shellFamily, surface_code: surfaceCode },
      );
    }
  }
}

export function resolveSurfaceMountPlan(input: {
  foundationContract?: InteractionLayerFoundationContract | undefined;
  highRiskCheckpointRef?: string | undefined;
  modalSurfaceCodes?: readonly string[] | undefined;
  mountedSurfaceCodes?: readonly string[] | undefined;
  promotedSupportSurfaceCodes?: readonly string[] | undefined;
  shellFamily: ShellFamilyCode;
  supportMode?: SupportSurfaceMode | undefined;
}) {
  const foundation = assertInteractionFoundationAlignment(
    input.shellFamily,
    input.foundationContract ?? buildInteractionLayerFoundationContract(input.shellFamily),
  );
  const mountedSurfaceCodes = input.mountedSurfaceCodes ?? defaultReadingOrderForShell(input.shellFamily);
  const promotedSupportSurfaceCodes =
    input.promotedSupportSurfaceCodes ?? defaultPromotedSupportForShell(input.shellFamily);
  const mountedSurfaces = mountedSurfaceCodes.map((surfaceCode) =>
    getSurfaceRegistryEntry(input.shellFamily, surfaceCode),
  );
  const promotedSupportRegions = promotedSupportSurfaceCodes.map((surfaceCode) =>
    getSurfaceRegistryEntry(input.shellFamily, surfaceCode),
  );

  for (const entry of [...mountedSurfaces, ...promotedSupportRegions]) {
    assertMountedSurfaceFamily(input.shellFamily, entry);
  }
  assertDefaultReadingOrder(input.shellFamily, mountedSurfaces);

  const supportBudget = enforcePromotedSupportSurfaceBudget({
    mode: input.supportMode,
    shellFamily: input.shellFamily,
    supportCandidates: promotedSupportRegions,
  });

  if (
    input.shellFamily === "CLIENT_PORTAL_SHELL" &&
    promotedSupportRegions.some((entry) => entry.support_placement !== "STACK_BELOW_PRIMARY")
  ) {
    failInteractionContract(
      "PORTAL_SUPPORT_MUST_STACK_BELOW_PRIMARY",
      "Portal help and recovery support must stack below the primary task.",
      {
        shell_family: input.shellFamily,
        promoted_surface_codes: promotedSupportRegions.map((entry) => entry.surface_code),
      },
    );
  }

  assertModalEligibility({
    highRiskCheckpointRef: input.highRiskCheckpointRef,
    modalSurfaceCodes: input.modalSurfaceCodes ?? [],
    shellFamily: input.shellFamily,
  });

  return {
    default_reading_order: defaultReadingOrderForShell(input.shellFamily),
    foundation_contract: foundation,
    mounted_surfaces: mountedSurfaces,
    notification_surface_policy: foundation.notification_surface_policy,
    preview_surface_policy: foundation.preview_surface_policy,
    promoted_support_regions: promotedSupportRegions,
    recovery_surface_policy: foundation.recovery_surface_policy,
    shell_family: input.shellFamily,
    support_budget: supportBudget,
  } satisfies SurfaceMountPlan;
}

export function createSurfaceRegistrySnapshot() {
  return {
    registry_version: "FRONTEND_SURFACE_REGISTRY_V1",
    shell_families: Object.fromEntries(
      Object.entries(surfaceRegistryByShellFamily).map(([shellFamily, entries]) => [
        shellFamily,
        {
          default_reading_order: defaultReadingOrderForShell(shellFamily as ShellFamilyCode),
          default_promoted_support: defaultPromotedSupportForShell(shellFamily as ShellFamilyCode),
          surfaces: entries,
        },
      ]),
    ),
  } as const;
}
