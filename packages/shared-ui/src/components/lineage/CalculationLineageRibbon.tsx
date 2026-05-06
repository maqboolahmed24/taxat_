export type CalculationLineageRibbonItem = {
  label: string;
  state: "complete" | "current" | "blocked" | "pending";
  value: string;
};

export const calculationLineageRibbonContract = {
  component_id: "calculation-lineage-ribbon",
  purpose:
    "Render one slim lineage cue for authority calculation request, result, basis, confirmation, and readiness posture without exposing raw provider payloads.",
  semantic_role: "status",
  visual_tokens: {
    accent: "#0F766E",
    blocked: "#C2410C",
    border: "rgba(23,23,23,0.08)",
    surface: "#FFFFFF",
    text: "#171717",
    warning: "#B7791F",
  },
} as const;

export function renderCalculationLineageRibbon(items: readonly CalculationLineageRibbonItem[]) {
  return items
    .map((item) => `${item.label}: ${item.value} [${item.state}]`)
    .join(" -> ");
}
