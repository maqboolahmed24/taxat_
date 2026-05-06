import {
  stableJsonHash,
  type HashDigest,
} from "../../../domain-kernel/src/primitives/hash.ts";
import {
  buildOutcomeComponentInventory,
  type MaterialOutcomeComponentInput,
  type NormalizedMaterialOutcomeComponent,
} from "../services/outcome_component_inventory_builder.ts";

export const DETERMINISTIC_OUTCOME_COMPONENT_PROFILE =
  "deterministic-outcome-component/v2" as const;
export const DETERMINISTIC_OUTCOME_ROOT_PROFILE = "deterministic-outcome-root/v2" as const;

export type DeterministicOutcomeHashResult = {
  component_digests: Array<{
    component_class: NormalizedMaterialOutcomeComponent["component_class"];
    component_digest: HashDigest;
    component_ref: string | null;
  }>;
  deterministic_outcome_hash: HashDigest;
  normalized_components: NormalizedMaterialOutcomeComponent[];
};

export function computeDeterministicOutcomeComponentDigest(
  component: NormalizedMaterialOutcomeComponent,
): HashDigest {
  return stableJsonHash({
    profile: DETERMINISTIC_OUTCOME_COMPONENT_PROFILE,
    component: component.component_class,
    payload: component.payload,
  });
}

export function computeDeterministicOutcomeHash(input: {
  components: readonly MaterialOutcomeComponentInput[];
}): DeterministicOutcomeHashResult {
  const normalizedComponents = buildOutcomeComponentInventory({
    components: input.components,
  });
  const componentDigests = normalizedComponents.map((component) => ({
    component_class: component.component_class,
    component_ref: component.component_ref,
    component_digest: computeDeterministicOutcomeComponentDigest(component),
  }));

  return {
    normalized_components: normalizedComponents,
    component_digests: componentDigests,
    deterministic_outcome_hash: stableJsonHash({
      profile: DETERMINISTIC_OUTCOME_ROOT_PROFILE,
      components: componentDigests.map((entry) => entry.component_digest),
    }),
  };
}
