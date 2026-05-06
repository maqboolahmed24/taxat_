import { expect, test } from "@playwright/test";

import {
  buildOutcomeComponentInventory,
  buildReplayAttestation,
  buildReplayBasisDimensionResults,
  buildReplayOutcomeComponentResults,
  classifyReplayComparison,
  computeDeterministicOutcomeHash,
  type MaterialOutcomeComponentInput,
  OUTCOME_COMPONENT_CLASSES,
  type OutcomeComponentClass,
  REPLAY_BASIS_DIMENSION_CODES,
  type ReplayBasisValidationState,
} from "../../../packages/backend-manifest/src/index.ts";

function fullOutcomeSurface(
  seed: string,
  overrides: Partial<Record<OutcomeComponentClass, Record<string, unknown>>> = {},
) {
  return OUTCOME_COMPONENT_CLASSES.map((componentClass, index) => ({
    component_class: componentClass,
    component_ref: `artifact://${seed}/${componentClass.toLowerCase().replaceAll("_", "-")}`,
    payload: {
      artifact_hash: `artifact-hash://${seed}/${componentClass}`,
      component_class: componentClass,
      material_gate: componentClass === "GATE_SEQUENCE" ? "PASS" : "NOT_APPLICABLE",
      ordinal: index + 1,
      ...overrides[componentClass],
    },
  })) satisfies MaterialOutcomeComponentInput[];
}

function basisHashes(seed: string) {
  return Object.fromEntries(
    REPLAY_BASIS_DIMENSION_CODES.map((dimension) => [
      dimension,
      `basis-hash://${seed}/${dimension}`,
    ]),
  );
}

function comparisonFor(input: {
  actualComponents?: readonly MaterialOutcomeComponentInput[];
  actualOutcomeHash?: string;
  basisValidationState?: ReplayBasisValidationState;
  corruptBasis?: readonly (typeof REPLAY_BASIS_DIMENSION_CODES)[number][];
  declaredBasis?: readonly (typeof REPLAY_BASIS_DIMENSION_CODES)[number][];
  declaredComponents?: readonly OutcomeComponentClass[];
  expectedComponents?: readonly MaterialOutcomeComponentInput[];
  replayClass?: "STANDARD_REPLAY" | "AUDIT_REPLAY" | "COUNTERFACTUAL_ANALYSIS";
  unobservableBasis?: readonly (typeof REPLAY_BASIS_DIMENSION_CODES)[number][];
}) {
  const expectedComponents = input.expectedComponents ?? fullOutcomeSurface("expected");
  const actualComponents = input.actualComponents ?? expectedComponents;
  const expectedOutcome = computeDeterministicOutcomeHash({ components: expectedComponents });
  const actualOutcome = computeDeterministicOutcomeHash({ components: actualComponents });
  const expectedBasis = basisHashes("expected");
  const actualBasis =
    input.declaredBasis && input.declaredBasis.length > 0
      ? {
          ...basisHashes("expected"),
          ...Object.fromEntries(
            input.declaredBasis.map((dimension) => [dimension, `basis-hash://actual/${dimension}`]),
          ),
        }
      : basisHashes("expected");
  const basis_dimension_results = buildReplayBasisDimensionResults({
    actual_hashes: actualBasis,
    corrupt_dimensions: input.corruptBasis,
    declared_change_dimensions: input.declaredBasis,
    expected_hashes: expectedBasis,
    unobservable_dimensions: input.unobservableBasis,
  });
  const outcomeComparison = buildReplayOutcomeComponentResults({
    actual: actualOutcome.normalized_components,
    declared_change_components: input.declaredComponents,
    expected: expectedOutcome.normalized_components,
  });

  return {
    actual_deterministic_outcome_hash:
      input.actualOutcomeHash ?? actualOutcome.deterministic_outcome_hash,
    actual_execution_basis_hash:
      input.declaredBasis && input.declaredBasis.length > 0
        ? "execution-basis-hash://actual"
        : "execution-basis-hash://expected",
    basis_dimension_results,
    basis_validation_state: input.basisValidationState ?? "VALID",
    expected_deterministic_outcome_hash: expectedOutcome.deterministic_outcome_hash,
    expected_execution_basis_hash: "execution-basis-hash://expected",
    mismatch_inventory: outcomeComparison.mismatch_inventory,
    outcome_component_results: outcomeComparison.outcome_component_results,
    replay_class: input.replayClass ?? "STANDARD_REPLAY",
  };
}

test("deterministic outcome hash excludes persistence and transport noise", () => {
  const base = fullOutcomeSurface("noise").map((component) => ({
    ...component,
    payload: {
      ...component.payload,
      created_at: "2026-04-27T10:00:00Z",
      database_row_id: "row-a",
      manifest_row_version: 1,
      queue_message_id: "queue-a",
      trace_id: "trace-a",
      nested: {
        workflow_queue_id: "workflow-a",
        value: "material",
      },
    },
  }));
  const noisy = fullOutcomeSurface("noise").map((component) => ({
    ...component,
    payload: {
      ...component.payload,
      created_at: "2026-04-27T11:00:00Z",
      database_row_id: "row-b",
      manifest_row_version: 99,
      queue_message_id: "queue-b",
      trace_id: "trace-b",
      nested: {
        workflow_queue_id: "workflow-b",
        value: "material",
      },
    },
  }));

  expect(computeDeterministicOutcomeHash({ components: base }).deterministic_outcome_hash).toBe(
    computeDeterministicOutcomeHash({ components: noisy }).deterministic_outcome_hash,
  );
});

test("deterministic outcome hash changes when material gate output changes", () => {
  const baseline = computeDeterministicOutcomeHash({
    components: fullOutcomeSurface("material"),
  });
  const changed = computeDeterministicOutcomeHash({
    components: fullOutcomeSurface("material", {
      GATE_SEQUENCE: { material_gate: "HARD_BLOCK" },
    }),
  });

  expect(changed.deterministic_outcome_hash).not.toBe(baseline.deterministic_outcome_hash);
});

test("exact replay classifies as exact hash match", () => {
  const classification = classifyReplayComparison(comparisonFor({}));

  expect(classification.comparison_mode).toBe("EXACT_HASH_MATCH");
  expect(classification.outcome_class).toBe("EXACT_MATCH");
  expect(classification.basis_coverage).toBe(1);
  expect(classification.material_outcome_match_ratio).toBe(1);
});

test("declared counterfactual equivalence and difference stay distinct", () => {
  const equivalent = classifyReplayComparison(
    comparisonFor({
      declaredBasis: ["CONFIG"],
      replayClass: "COUNTERFACTUAL_ANALYSIS",
    }),
  );
  expect(equivalent.comparison_mode).toBe("COUNTERFACTUAL_DECLARED");
  expect(equivalent.outcome_class).toBe("EXPECTED_EQUIVALENCE");

  const expectedDifference = classifyReplayComparison(
    comparisonFor({
      actualComponents: fullOutcomeSurface("expected", {
        RISK_REPORT: { counterfactual_risk_band: "HIGH" },
      }),
      declaredBasis: ["CONFIG"],
      declaredComponents: ["RISK_REPORT"],
      replayClass: "COUNTERFACTUAL_ANALYSIS",
    }),
  );
  expect(expectedDifference.outcome_class).toBe("EXPECTED_DIFFERENCE");
  expect(expectedDifference.difference_reason_codes).toContain("DECLARED_COUNTERFACTUAL_BASIS");
});

test("limited, corrupt, and unexpected mismatch comparisons fail closed", () => {
  const limited = classifyReplayComparison(
    comparisonFor({
      basisValidationState: "MISSING_DEPENDENCY",
      unobservableBasis: ["INPUT"],
    }),
  );
  expect(limited.comparison_mode).toBe("LIMITED_HISTORICAL_COMPARISON");
  expect(limited.outcome_class).toBe("LIMITED_COMPARABLE");
  expect(limited.limitation_codes).toContain("MISSING_REPLAY_DEPENDENCY");

  const corrupt = buildReplayAttestation({
    ...comparisonFor({
      basisValidationState: "CORRUPT",
      corruptBasis: ["CONFIG"],
    }),
    compared_at: "2026-04-27T14:00:00Z",
    manifest_id: "manifest.run.corrupt-replay.0107",
    replay_class: "STANDARD_REPLAY",
    replay_of_manifest_id: "manifest.run.source.0107",
  });
  expect(corrupt.outcome_class).toBe("BASIS_CORRUPT");
  expect(corrupt.basis_identity_verdict).toBe("CORRUPT");
  expect(corrupt.attestation_confidence_score).toBe(0);

  const unexpected = classifyReplayComparison(
    comparisonFor({
      actualComponents: fullOutcomeSurface("expected", {
        TRUST_SUMMARY: { trust_score: 12 },
      }),
      declaredBasis: ["CONFIG"],
      replayClass: "COUNTERFACTUAL_ANALYSIS",
    }),
  );
  expect(unexpected.outcome_class).toBe("UNEXPECTED_MISMATCH");
  expect(unexpected.mismatch_inventory.length).toBeGreaterThan(0);
});

test("outcome inventory is fixed to the schema component order", () => {
  const inventory = buildOutcomeComponentInventory({
    components: fullOutcomeSurface("ordered").reverse(),
  });

  expect(inventory.map((component) => component.component_class)).toEqual(
    OUTCOME_COMPONENT_CLASSES,
  );
});
