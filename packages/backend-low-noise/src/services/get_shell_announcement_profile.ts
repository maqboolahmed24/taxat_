import type {
  SemanticAccessibilityContractAnnouncedChangeKind,
} from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import {
  getShellAnchorInventory,
  type SemanticAccessibilityRouteVariant,
  type SemanticAccessibilitySurfaceType,
} from "./get_shell_anchor_inventory.ts";

export type SemanticAccessibilityLiveRegionMode = "POLITE" | "ASSERTIVE";

export type ShellAnnouncementProfile = {
  announced_change_kinds: SemanticAccessibilityContractAnnouncedChangeKind[];
  assertive_change_kinds: SemanticAccessibilityContractAnnouncedChangeKind[];
  contextual_notice_change_kinds: SemanticAccessibilityContractAnnouncedChangeKind[];
  live_region_mode_by_kind: Readonly<
    Partial<Record<SemanticAccessibilityContractAnnouncedChangeKind, SemanticAccessibilityLiveRegionMode>>
  >;
  polite_change_kinds: SemanticAccessibilityContractAnnouncedChangeKind[];
  route_variant: SemanticAccessibilityRouteVariant;
  surface_type: SemanticAccessibilitySurfaceType;
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
} as const satisfies Record<
  SemanticAccessibilitySurfaceType,
  readonly SemanticAccessibilityContractAnnouncedChangeKind[]
>);

export const semanticAccessibilityLiveRegionModeByChangeKind: Readonly<
  Partial<Record<SemanticAccessibilityContractAnnouncedChangeKind, SemanticAccessibilityLiveRegionMode>>
> = Object.freeze({
  ACTIVITY_DELTA: "POLITE",
  BADGE_DELTA: "POLITE",
  COMMAND_FAILURE: "ASSERTIVE",
  RECOVERY_NOTICE: "ASSERTIVE",
  TERMINAL_SETTLEMENT: "ASSERTIVE",
});

function cloneArray<T>(values: readonly T[]): T[] {
  return [...values];
}

export function getShellAnnouncementProfile(input: {
  routeVariant?: SemanticAccessibilityRouteVariant | undefined;
  surfaceType?: SemanticAccessibilitySurfaceType | undefined;
}): ShellAnnouncementProfile {
  const inventory = getShellAnchorInventory(input);
  const announcedChangeKinds = announcedChangeKindsBySurface[inventory.surface_type];
  const politeChangeKinds = announcedChangeKinds.filter(
    (kind) => semanticAccessibilityLiveRegionModeByChangeKind[kind] === "POLITE",
  );
  const assertiveChangeKinds = announcedChangeKinds.filter(
    (kind) => semanticAccessibilityLiveRegionModeByChangeKind[kind] === "ASSERTIVE",
  );
  const contextualNoticeChangeKinds = announcedChangeKinds.filter(
    (kind) => semanticAccessibilityLiveRegionModeByChangeKind[kind] === undefined,
  );

  return {
    announced_change_kinds: cloneArray(announcedChangeKinds),
    assertive_change_kinds: cloneArray(assertiveChangeKinds),
    contextual_notice_change_kinds: cloneArray(contextualNoticeChangeKinds),
    live_region_mode_by_kind: semanticAccessibilityLiveRegionModeByChangeKind,
    polite_change_kinds: cloneArray(politeChangeKinds),
    route_variant: inventory.route_variant,
    surface_type: inventory.surface_type,
  };
}
