export type CrossDeviceContinuityInspectorCase = {
  case_id: string;
  fallback_order: readonly string[];
  invalidation_reasons: readonly string[];
  post_focus_anchor_ref_or_null: string | null;
  post_route_ref: string;
  pre_focus_anchor_ref_or_null: string | null;
  pre_route_ref: string;
};

export const crossDeviceContinuityInspectorContract = {
  component_id: "continuity-contract-preview",
  required_selectors: [
    "continuity-case-row",
    "continuity-route-focus-map",
    "continuity-fallback-order",
    "continuity-invalidation-reasons",
  ],
  source_policy: "SERIALIZED_CONTINUITY_AND_FOCUS_METADATA_ONLY",
} as const;

export function renderContinuityRouteFocusMap(
  inspectorCase: CrossDeviceContinuityInspectorCase,
) {
  return `${inspectorCase.pre_route_ref} [${inspectorCase.pre_focus_anchor_ref_or_null ?? "none"}] -> ${inspectorCase.post_route_ref} [${inspectorCase.post_focus_anchor_ref_or_null ?? "none"}]`;
}
