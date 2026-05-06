export type ResponsiveCompactionToken =
  | "CALM_SUPPORT_REDOCK_V1"
  | "PORTAL_STACK_BELOW_PRIMARY_V1"
  | "GOVERNANCE_AUXILIARY_REDOCK_V1";

export type ResponsiveCompactionResolution = {
  token: ResponsiveCompactionToken;
  compact_breakpoint_px: number;
  wide_grid_template: string;
  compact_grid_template: string;
  support_placement: string;
  semantic_order: readonly string[];
};

export const responsiveCompactionTokens = {
  CALM_SUPPORT_REDOCK_V1: {
    token: "CALM_SUPPORT_REDOCK_V1",
    compact_breakpoint_px: 920,
    wide_grid_template: "280px minmax(720px, 1fr) 368px",
    compact_grid_template: "minmax(0, 1fr)",
    support_placement: "DETAIL_DRAWER_REDOCKS_BELOW_ACTION_STRIP",
    semantic_order: ["CONTEXT_BAR", "DECISION_SUMMARY", "ACTION_STRIP", "DETAIL_DRAWER"],
  },
  PORTAL_STACK_BELOW_PRIMARY_V1: {
    token: "PORTAL_STACK_BELOW_PRIMARY_V1",
    compact_breakpoint_px: 1024,
    wide_grid_template: "minmax(0, 720px) minmax(280px, 320px)",
    compact_grid_template: "minmax(0, 1fr)",
    support_placement: "SUPPORT_STACKS_BELOW_PRIMARY_TASK",
    semantic_order: ["PORTAL_HEADER", "STATUS_HERO", "PRIMARY_ACTION", "PROMOTED_SUPPORT_REGION"],
  },
  GOVERNANCE_AUXILIARY_REDOCK_V1: {
    token: "GOVERNANCE_AUXILIARY_REDOCK_V1",
    compact_breakpoint_px: 1040,
    wide_grid_template: "292px minmax(760px, 1fr) 344px",
    compact_grid_template: "minmax(0, 1fr)",
    support_placement: "AUXILIARY_SURFACE_REDOCKS_WITH_SELECTION_CONTEXT",
    semantic_order: [
      "PRIMARY_WORKLIST",
      "WORKSPACE_HEADER",
      "ATTENTION_SUMMARY",
      "PRIMARY_CANVAS",
      "TRAILING_INSPECTOR",
    ],
  },
} as const satisfies Record<ResponsiveCompactionToken, ResponsiveCompactionResolution>;

export function resolveResponsiveCompactionToken(token: ResponsiveCompactionToken) {
  const resolution = responsiveCompactionTokens[token];
  if (!resolution) {
    throw new Error(`Unsupported responsive compaction token: ${token}`);
  }
  return resolution;
}
