import type { InteractionLayerFoundationContract } from "../route_contracts/interaction_layer_foundation";
import {
  assertFoundationContractAlignment,
  shellVisualTokenContracts,
  ThemeContractError,
  type ShellFamily,
} from "./shell_token_contracts";
import {
  resolveResponsiveCompactionToken,
  type ResponsiveCompactionToken,
} from "./responsive_compaction_tokens";
import { resolveShellMotionToken, shellMotionDurationCeilingMs } from "./motion_tokens";

export type ShellThemeRuntimeInput = {
  shellFamily: ShellFamily;
  foundationContract: InteractionLayerFoundationContract | undefined | null;
  reducedMotion?: boolean;
};

export type ShellThemeCssVars = Readonly<Record<`--${string}`, string>>;

export type ShellThemeContract = {
  shell_family: ShellFamily;
  selector_profile: InteractionLayerFoundationContract["selector_profile"];
  data_attributes: Readonly<Record<string, string>>;
  css_vars: ShellThemeCssVars;
  token_strips: readonly { label: string; value: string }[];
  motion_ceiling_ms: typeof shellMotionDurationCeilingMs;
};

const sharedVisualBaseline = {
  "--taxat-page": "#F7F5F1",
  "--taxat-surface": "#FFFFFF",
  "--taxat-surface-secondary": "#F1F3F0",
  "--taxat-surface-wash": "#ECE8DF",
  "--taxat-ink": "#171717",
  "--taxat-muted": "#667085",
  "--taxat-line": "rgba(17, 24, 39, 0.08)",
  "--taxat-shadow": "0 10px 28px rgba(17, 24, 39, 0.06)",
  "--taxat-radius": "20px",
  "--taxat-radius-tight": "18px",
  "--taxat-space-base": "8px",
  "--taxat-space-section": "32px",
  "--taxat-font-ui":
    'Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif',
  "--taxat-font-mono": 'ui-monospace, "SFMono-Regular", Consolas, monospace',
  "--taxat-caution": "#B7791F",
  "--taxat-danger": "#C2410C",
  "--taxat-verified": "#166534",
} as const satisfies ShellThemeCssVars;

export function deriveShellThemeContract({
  shellFamily,
  foundationContract,
  reducedMotion = false,
}: ShellThemeRuntimeInput) {
  if (!foundationContract) {
    throw new ThemeContractError(
      "THEME_CONTRACT_MISSING_FOUNDATION",
      `Missing InteractionLayerFoundationContract for ${shellFamily}.`,
    );
  }

  const expected = assertFoundationContractAlignment(shellFamily, foundationContract);
  const contract = foundationContract;
  const visual = shellVisualTokenContracts[shellFamily];
  const compaction = resolveResponsiveCompactionToken(
    contract.responsive_compaction_token as ResponsiveCompactionToken,
  );
  const motion = resolveShellMotionToken(contract.motion_token, reducedMotion);

  const cssVars = {
    ...sharedVisualBaseline,
    "--taxat-accent": visual.accent,
    "--taxat-focus-ring": visual.focus_ring,
    "--taxat-shell-max-width": `${visual.max_width_px}px`,
    "--taxat-shell-leading-width": `${visual.leading_surface_px}px`,
    "--taxat-shell-primary-min-width": `${visual.primary_surface_min_px}px`,
    "--taxat-shell-support-width": `${visual.support_surface_px}px`,
    "--taxat-shell-grid-template": compaction.wide_grid_template,
    "--taxat-shell-compact-grid-template": compaction.compact_grid_template,
    "--taxat-shell-compact-breakpoint": `${compaction.compact_breakpoint_px}px`,
    "--taxat-motion-duration": `${motion.duration_ms}ms`,
    "--taxat-motion-easing": motion.easing,
    "--taxat-motion-opacity-from": motion.opacity_from,
    "--taxat-motion-translate-y": motion.translate_y,
    "--taxat-motion-transition-property": motion.transition_property,
  } as const satisfies ShellThemeCssVars;

  return {
    shell_family: shellFamily,
    selector_profile: contract.selector_profile,
    data_attributes: {
      "data-taxat-shell-family": shellFamily,
      "data-selector-profile": contract.selector_profile,
      "data-layout-density-token": contract.layout_density_token,
      "data-surface-spacing-token": contract.surface_spacing_token,
      "data-support-spacing-token": contract.support_surface_spacing_token,
      "data-responsive-compaction-token": contract.responsive_compaction_token,
      "data-motion-token": contract.motion_token,
      "data-motion-mode": motion.mode,
      "data-theme-contract-state": "valid",
      "data-card-glyph": visual.card_glyph,
    },
    css_vars: cssVars,
    token_strips: [
      { label: "density", value: expected.layout_density_token },
      { label: "spacing", value: expected.surface_spacing_token },
      { label: "support", value: expected.support_surface_spacing_token },
      { label: "compaction", value: compaction.support_placement },
      { label: "motion", value: `${contract.motion_profile} / ${motion.duration_ms}ms` },
      { label: "current/history", value: expected.history_presentation_policy },
      { label: "preview", value: expected.preview_surface_policy },
      { label: "notification", value: expected.notification_surface_policy },
      { label: "recovery", value: expected.recovery_surface_policy },
    ],
    motion_ceiling_ms: shellMotionDurationCeilingMs,
  } as const satisfies ShellThemeContract;
}

export function serializeThemeCssVars(cssVars: ShellThemeCssVars) {
  return Object.entries(cssVars)
    .map(([name, value]) => `${name}: ${value};`)
    .join(" ");
}

export function assertRouteLocalThemeOverridesAreBound(
  overrides: Readonly<Record<string, string>>,
  boundShellFamilyToken?: string,
) {
  const guardedKeys = Object.keys(overrides).filter((key) =>
    [
      "--taxat-motion-duration",
      "--taxat-motion-easing",
      "--taxat-shell-grid-template",
      "--taxat-shell-compact-grid-template",
      "--taxat-shell-leading-width",
      "--taxat-shell-primary-min-width",
      "--taxat-shell-support-width",
    ].includes(key),
  );

  if (guardedKeys.length > 0 && !boundShellFamilyToken) {
    throw new ThemeContractError(
      "THEME_CONTRACT_ROUTE_LOCAL_OVERRIDE",
      `Route-local theme override for ${guardedKeys.join(", ")} must bind to a shell-family token.`,
    );
  }

  return true;
}
