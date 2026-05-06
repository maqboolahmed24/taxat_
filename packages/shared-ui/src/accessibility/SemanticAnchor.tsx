import {
  buildSemanticAnchorAttributes,
  getSemanticAnchorEntry,
  type SemanticAccessibilityRouteVariant,
  type SemanticAccessibilitySurfaceType,
  type SemanticAnchorAttributes,
  type SemanticAnchorCatalogEntry,
  type SemanticAnchorCode,
} from "../../../frontend-shell-core/src/index";

export type SemanticAnchorElementName =
  | "aside"
  | "button"
  | "div"
  | "footer"
  | "header"
  | "main"
  | "nav"
  | "section";

export type SemanticAnchorProps = {
  anchorCode?: SemanticAnchorCode | undefined;
  className?: string | undefined;
  element?: SemanticAnchorElementName | undefined;
  entry?: SemanticAnchorCatalogEntry | undefined;
  focusable?: boolean | undefined;
  labelledBy?: string | undefined;
  routeVariant?: SemanticAccessibilityRouteVariant | undefined;
  surfaceType?: SemanticAccessibilitySurfaceType | undefined;
  textLabel?: string | undefined;
};

export type SemanticAnchorSnapshot = {
  component_id: "semantic-anchor";
  element: SemanticAnchorElementName;
  anchor_code: SemanticAnchorCode;
  semantic_anchor_ref: string;
  browser_identifier: string;
  native_identifier: string;
  label: string;
  screen_reader_label: string;
  role: string;
  heading: {
    id: string;
    level: 1 | 2 | 3 | 4 | 5 | 6;
    label: string;
  } | null;
  attributes: SemanticAnchorAttributes & Readonly<Record<string, string | number | undefined>>;
};

function resolveSemanticAnchorEntry(props: SemanticAnchorProps) {
  if (props.entry !== undefined) {
    return props.entry;
  }
  if (props.anchorCode === undefined) {
    throw new Error("SemanticAnchor requires an entry or anchorCode.");
  }
  return getSemanticAnchorEntry({
    anchorCode: props.anchorCode,
    routeVariant: props.routeVariant,
    surfaceType: props.surfaceType,
  });
}

export function createSemanticAnchorSnapshot(props: SemanticAnchorProps): SemanticAnchorSnapshot {
  const entry = resolveSemanticAnchorEntry(props);
  const attributeOptions: { labelledBy?: string; tabIndex?: number } = {};
  if (props.labelledBy !== undefined) {
    attributeOptions.labelledBy = props.labelledBy;
  }
  if (props.focusable === true) {
    attributeOptions.tabIndex = 0;
  }
  const attributes = buildSemanticAnchorAttributes(entry, attributeOptions);
  const attributesWithClass =
    props.className === undefined ? attributes : { ...attributes, className: props.className };
  const heading =
    entry.heading_level_or_null === null
      ? null
      : {
          id: `${entry.semantic_anchor_ref}-heading`,
          label: entry.label,
          level: entry.heading_level_or_null,
        };

  return {
    anchor_code: entry.anchor_code,
    attributes: attributesWithClass,
    browser_identifier: entry.browser_identifier,
    component_id: "semantic-anchor",
    element: props.element ?? "section",
    heading,
    label: props.textLabel ?? entry.label,
    native_identifier: entry.native_identifier,
    role: entry.role,
    screen_reader_label: entry.aria_label,
    semantic_anchor_ref: entry.semantic_anchor_ref,
  };
}

export function SemanticAnchor(props: SemanticAnchorProps) {
  return createSemanticAnchorSnapshot(props);
}
