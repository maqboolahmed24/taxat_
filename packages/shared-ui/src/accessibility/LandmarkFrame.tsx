import {
  getSemanticAnchorEntry,
  type SemanticAccessibilityRouteVariant,
  type SemanticAccessibilitySurfaceType,
  type SemanticAnchorCatalogEntry,
  type SemanticAnchorCode,
} from "../../../frontend-shell-core/src/index";
import {
  createSemanticAnchorSnapshot,
  type SemanticAnchorElementName,
  type SemanticAnchorSnapshot,
} from "./SemanticAnchor";

export type LandmarkFrameProps = {
  anchorCode: SemanticAnchorCode;
  className?: string | undefined;
  element?: SemanticAnchorElementName | undefined;
  entry?: SemanticAnchorCatalogEntry | undefined;
  focusable?: boolean | undefined;
  routeVariant?: SemanticAccessibilityRouteVariant | undefined;
  surfaceType?: SemanticAccessibilitySurfaceType | undefined;
  title?: string | undefined;
};

export type LandmarkFrameSnapshot = Omit<SemanticAnchorSnapshot, "component_id"> & {
  component_id: "landmark-frame";
  landmark_role: string;
  labelled_by: string;
};

function resolveLandmarkEntry(props: LandmarkFrameProps) {
  if (props.entry !== undefined) {
    return props.entry;
  }
  return getSemanticAnchorEntry({
    anchorCode: props.anchorCode,
    routeVariant: props.routeVariant,
    surfaceType: props.surfaceType,
  });
}

export function createLandmarkFrameSnapshot(props: LandmarkFrameProps): LandmarkFrameSnapshot {
  const entry = resolveLandmarkEntry(props);
  const headingId = `${entry.semantic_anchor_ref}-heading`;
  const snapshot = createSemanticAnchorSnapshot({
    className: props.className,
    element: props.element ?? "section",
    entry,
    focusable: props.focusable,
    labelledBy: headingId,
    textLabel: props.title,
  });

  return {
    ...snapshot,
    attributes: {
      ...snapshot.attributes,
      "aria-labelledby": headingId,
      role: entry.landmark_role_or_null ?? entry.role,
    },
    component_id: "landmark-frame",
    landmark_role: entry.landmark_role_or_null ?? entry.role,
    labelled_by: headingId,
  };
}

export function LandmarkFrame(props: LandmarkFrameProps) {
  return createLandmarkFrameSnapshot(props);
}
