import type {
  AnnouncedChangeKind,
  SemanticAccessibilityRouteVariant,
  SemanticAccessibilitySurfaceType,
} from "./semantic_anchor_catalog";

export type LiveRegionMode = "POLITE" | "ASSERTIVE";

export type LiveRegionPolicy = {
  announced_change_kinds: readonly AnnouncedChangeKind[];
  assertive_change_kinds: readonly AnnouncedChangeKind[];
  live_region_mode_by_kind: Readonly<Partial<Record<AnnouncedChangeKind, LiveRegionMode>>>;
  live_update_focus_policy: "NEVER_STEAL_ACTIVE_INPUT_OR_PICKER_FOCUS";
  polite_change_kinds: readonly AnnouncedChangeKind[];
};

const announcedChangeKindsBySurface = Object.freeze({
  ClientPortalWorkspace: [
    "LIMITATION_NOTICE",
    "RECOVERY_NOTICE",
    "COMMAND_FAILURE",
    "TERMINAL_SETTLEMENT",
  ],
  LowNoiseExperienceFrame: [
    "LIMITATION_NOTICE",
    "RECOVERY_NOTICE",
    "COMMAND_FAILURE",
    "TERMINAL_SETTLEMENT",
  ],
  NativeOperatorSecondaryWindowScene: ["RECOVERY_NOTICE", "COMMAND_FAILURE"],
  NativeOperatorWorkspaceScene: ["RECOVERY_NOTICE", "COMMAND_FAILURE", "TERMINAL_SETTLEMENT"],
  TenantGovernanceSnapshot: ["RECOVERY_NOTICE", "COMMAND_FAILURE", "TERMINAL_SETTLEMENT"],
  WorkspaceSnapshot: [
    "ACTIVITY_DELTA",
    "BADGE_DELTA",
    "RECOVERY_NOTICE",
    "COMMAND_FAILURE",
    "TERMINAL_SETTLEMENT",
  ],
} as const satisfies Record<SemanticAccessibilitySurfaceType, readonly AnnouncedChangeKind[]>);

export const liveRegionModeByChangeKind = Object.freeze({
  ACTIVITY_DELTA: "POLITE",
  BADGE_DELTA: "POLITE",
  COMMAND_FAILURE: "ASSERTIVE",
  LIMITATION_NOTICE: "POLITE",
  RECOVERY_NOTICE: "ASSERTIVE",
  TERMINAL_SETTLEMENT: "ASSERTIVE",
} as const satisfies Record<AnnouncedChangeKind, LiveRegionMode>);

export function buildLiveRegionPolicy(input: {
  routeVariant?: SemanticAccessibilityRouteVariant | undefined;
  surfaceType: SemanticAccessibilitySurfaceType;
}) {
  const announcedChangeKinds = announcedChangeKindsBySurface[input.surfaceType];
  const politeChangeKinds = announcedChangeKinds.filter(
    (kind) => liveRegionModeByChangeKind[kind] === "POLITE",
  );
  const assertiveChangeKinds = announcedChangeKinds.filter(
    (kind) => liveRegionModeByChangeKind[kind] === "ASSERTIVE",
  );

  return {
    announced_change_kinds: [...announcedChangeKinds],
    assertive_change_kinds: [...assertiveChangeKinds],
    live_region_mode_by_kind: liveRegionModeByChangeKind,
    live_update_focus_policy: "NEVER_STEAL_ACTIVE_INPUT_OR_PICKER_FOCUS",
    polite_change_kinds: [...politeChangeKinds],
  } satisfies LiveRegionPolicy;
}

export function liveUpdateMayMoveFocus(input: {
  activeFocusKind?: "COMPOSER" | "EDITOR" | "FILE_PICKER" | "COMPARE_CONTROL" | null | undefined;
  changeKind: AnnouncedChangeKind;
}) {
  if (input.activeFocusKind) {
    return false;
  }
  return false;
}
