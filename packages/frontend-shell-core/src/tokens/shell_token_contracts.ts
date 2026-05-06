import type { InteractionLayerFoundationContract } from "../route_contracts/interaction_layer_foundation";
import type { SelectorProfile, ShellFamilyCode } from "../route_contracts/semantic_accessibility";
import type { ResponsiveCompactionToken } from "./responsive_compaction_tokens";

export type ShellFamily = ShellFamilyCode;

export type ThemeContractErrorCode =
  | "THEME_CONTRACT_MISSING_FOUNDATION"
  | "THEME_CONTRACT_FAMILY_MISMATCH"
  | "THEME_CONTRACT_SELECTOR_MISMATCH"
  | "THEME_CONTRACT_TOKEN_MISMATCH"
  | "THEME_CONTRACT_ROUTE_LOCAL_OVERRIDE";

export class ThemeContractError extends Error {
  readonly code: ThemeContractErrorCode;

  constructor(code: ThemeContractErrorCode, message: string) {
    super(message);
    this.name = "ThemeContractError";
    this.code = code;
  }
}

export type ShellFoundationExpectation = Pick<
  InteractionLayerFoundationContract,
  | "shell_family"
  | "layout_density_token"
  | "surface_spacing_token"
  | "support_surface_spacing_token"
  | "responsive_compaction_token"
  | "selector_profile"
  | "continuity_policy"
  | "recovery_surface_policy"
  | "history_presentation_policy"
  | "preview_surface_policy"
  | "notification_surface_policy"
  | "secondary_window_policy"
>;

export const expectedShellFoundationContracts = {
  CALM_SHELL: {
    shell_family: "CALM_SHELL",
    layout_density_token: "CALM_FOUR_SURFACE_DENSITY_V1",
    surface_spacing_token: "CALM_FOUR_SURFACE_SPACING_V1",
    support_surface_spacing_token: "CALM_DETAIL_DRAWER_SUPPORT_SPACING_V1",
    responsive_compaction_token: "CALM_SUPPORT_REDOCK_V1",
    selector_profile: "OPERATOR_SEMANTIC_SELECTORS_V1",
    continuity_policy: "SAME_OBJECT_SAME_SHELL_INLINE_RECOVERY",
    recovery_surface_policy: "INLINE_EXPLICIT_REBASE",
    history_presentation_policy: "CURRENT_PRIMARY_HISTORY_SECONDARY",
    preview_surface_policy: "DETAIL_DRAWER_OR_PARENT_BOUND_SECONDARY_WINDOW",
    notification_surface_policy: "CONTEXT_BOUND_INLINE_FEEDBACK_OR_PARENT_MIRROR",
    secondary_window_policy: "SUPPORT_ONLY_PARENT_BOUND_CLOSE_RETURNS_FOCUS",
  },
  CLIENT_PORTAL_SHELL: {
    shell_family: "CLIENT_PORTAL_SHELL",
    layout_density_token: "PORTAL_COMFORTABLE_TASK_DENSITY_V1",
    surface_spacing_token: "PORTAL_PRIMARY_STACK_SPACING_V1",
    support_surface_spacing_token: "PORTAL_INLINE_SUPPORT_SPACING_V1",
    responsive_compaction_token: "PORTAL_STACK_BELOW_PRIMARY_V1",
    selector_profile: "PORTAL_SEMANTIC_SELECTORS_V1",
    continuity_policy: "SAME_SHELL_CONTEXTUAL_RETURN",
    recovery_surface_policy: "INLINE_REVIEW_OR_RECOVERY_NOTICE",
    history_presentation_policy: "CURRENT_PRIMARY_HISTORY_SECONDARY",
    preview_surface_policy: "PRIMARY_CONTEXT_WITH_STACKED_SUPPORT",
    notification_surface_policy: "CONTEXT_BOUND_INLINE_FEEDBACK",
    secondary_window_policy: "NOT_APPLICABLE",
  },
  GOVERNANCE_DENSITY_SHELL: {
    shell_family: "GOVERNANCE_DENSITY_SHELL",
    layout_density_token: "GOVERNANCE_WORKSPACE_DENSITY_V1",
    surface_spacing_token: "GOVERNANCE_CANVAS_SPACING_V1",
    support_surface_spacing_token: "GOVERNANCE_AUXILIARY_SURFACE_SPACING_V1",
    responsive_compaction_token: "GOVERNANCE_AUXILIARY_REDOCK_V1",
    selector_profile: "GOVERNANCE_SEMANTIC_SELECTORS_V1",
    continuity_policy: "SAME_OBJECT_SAME_SHELL_CONTEXT_RETENTION",
    recovery_surface_policy: "INLINE_TYPED_CONTEXTUAL_RECOVERY",
    history_presentation_policy: "ACTIVE_SLICE_PRIMARY_CONTEXTUAL_HISTORY",
    preview_surface_policy: "AUXILIARY_SURFACE_CONTEXTUAL_ONLY",
    notification_surface_policy: "CONTEXT_BOUND_INLINE_FEEDBACK",
    secondary_window_policy: "NOT_APPLICABLE",
  },
} as const satisfies Record<ShellFamily, ShellFoundationExpectation>;

export type ShellVisualTokenContract = {
  shell_family: ShellFamily;
  accent: string;
  focus_ring: string;
  max_width_px: number;
  primary_surface_min_px: number;
  support_surface_px: number;
  leading_surface_px: number;
  card_glyph: "CALM_FOUR_PLANES" | "PORTAL_TASK_WITH_SUPPORT_SHELF" | "GOVERNANCE_CANVAS_SIDECAR";
};

export const shellVisualTokenContracts = {
  CALM_SHELL: {
    shell_family: "CALM_SHELL",
    accent: "#1D4ED8",
    focus_ring: "#1D4ED8",
    max_width_px: 1560,
    primary_surface_min_px: 760,
    support_surface_px: 380,
    leading_surface_px: 280,
    card_glyph: "CALM_FOUR_PLANES",
  },
  CLIENT_PORTAL_SHELL: {
    shell_family: "CLIENT_PORTAL_SHELL",
    accent: "#0F766E",
    focus_ring: "#0F766E",
    max_width_px: 1120,
    primary_surface_min_px: 720,
    support_surface_px: 320,
    leading_surface_px: 0,
    card_glyph: "PORTAL_TASK_WITH_SUPPORT_SHELF",
  },
  GOVERNANCE_DENSITY_SHELL: {
    shell_family: "GOVERNANCE_DENSITY_SHELL",
    accent: "#6D28D9",
    focus_ring: "#6D28D9",
    max_width_px: 1560,
    primary_surface_min_px: 760,
    support_surface_px: 344,
    leading_surface_px: 292,
    card_glyph: "GOVERNANCE_CANVAS_SIDECAR",
  },
} as const satisfies Record<ShellFamily, ShellVisualTokenContract>;

export function selectorProfileForShellFamily(shellFamily: ShellFamily) {
  return expectedShellFoundationContracts[shellFamily].selector_profile satisfies SelectorProfile;
}

export function assertFoundationContractAlignment(
  shellFamily: ShellFamily,
  foundationContract: InteractionLayerFoundationContract | undefined | null,
) {
  if (!foundationContract) {
    throw new ThemeContractError(
      "THEME_CONTRACT_MISSING_FOUNDATION",
      `Missing InteractionLayerFoundationContract for ${shellFamily}.`,
    );
  }

  if (foundationContract.shell_family !== shellFamily) {
    throw new ThemeContractError(
      "THEME_CONTRACT_FAMILY_MISMATCH",
      `Foundation shell family ${foundationContract.shell_family} cannot theme ${shellFamily}.`,
    );
  }

  const expected = expectedShellFoundationContracts[shellFamily];
  if (foundationContract.selector_profile !== expected.selector_profile) {
    throw new ThemeContractError(
      "THEME_CONTRACT_SELECTOR_MISMATCH",
      `Foundation selector ${foundationContract.selector_profile} must be ${expected.selector_profile}.`,
    );
  }

  for (const key of [
    "layout_density_token",
    "surface_spacing_token",
    "support_surface_spacing_token",
    "responsive_compaction_token",
    "continuity_policy",
    "recovery_surface_policy",
    "history_presentation_policy",
    "preview_surface_policy",
    "notification_surface_policy",
    "secondary_window_policy",
  ] as const) {
    if (foundationContract[key] !== expected[key]) {
      throw new ThemeContractError(
        "THEME_CONTRACT_TOKEN_MISMATCH",
        `${shellFamily} expected ${key}=${expected[key]} but received ${foundationContract[key]}.`,
      );
    }
  }

  return expected;
}

export function responsiveTokenForShellFamily(shellFamily: ShellFamily) {
  return expectedShellFoundationContracts[shellFamily]
    .responsive_compaction_token as ResponsiveCompactionToken;
}
