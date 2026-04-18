export const SELECTOR_STRATEGY_ORDER = [
  "ROLE",
  "LABEL",
  "TEXT",
  "URL",
  "TEST_ID",
  "CSS_FALLBACK",
] as const;

export type SelectorStrategy = (typeof SELECTOR_STRATEGY_ORDER)[number];

export interface SelectorDescriptor {
  selectorId: string;
  description: string;
  strategy: SelectorStrategy;
  value: string;
  accessibleName?: string;
  justification?: string;
  driftSignal?: string;
}

export interface SelectorManifest {
  manifestId: string;
  providerId: string;
  flowId: string;
  selectors: SelectorDescriptor[];
}

const selectorOrder = new Map(
  SELECTOR_STRATEGY_ORDER.map((strategy, index) => [strategy, index]),
);

export function validateSelectorManifest(manifest: SelectorManifest): void {
  for (const selector of manifest.selectors) {
    if (
      selector.strategy === "CSS_FALLBACK" &&
      (!selector.justification || !selector.driftSignal)
    ) {
      throw new Error(
        `Selector ${selector.selectorId} must document justification and drift signal for CSS fallback use.`,
      );
    }
  }
}

export function rankSelectors(
  selectors: readonly SelectorDescriptor[],
): SelectorDescriptor[] {
  return [...selectors].sort(
    (left, right) =>
      (selectorOrder.get(left.strategy) ?? 999) -
      (selectorOrder.get(right.strategy) ?? 999),
  );
}

export function detectBrittleFallbacks(
  selectors: readonly SelectorDescriptor[],
): SelectorDescriptor[] {
  return selectors.filter((selector) => selector.strategy === "CSS_FALLBACK");
}
