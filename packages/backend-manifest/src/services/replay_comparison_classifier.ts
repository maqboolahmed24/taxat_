import { sortSetLikeStrings } from "../../../domain-kernel/src/primitives/hash.ts";
import type {
  ReplayAttestationBasisDimensionResult,
  ReplayAttestationMismatchItem,
  ReplayAttestationOutcomeComponentResult,
} from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import type { RunManifestReplayClass } from "../models/run_manifest.ts";
import {
  computeDeterministicOutcomeComponentDigest,
  type DeterministicOutcomeHashResult,
} from "../hash/deterministic_outcome_hash.ts";
import {
  OUTCOME_COMPONENT_CLASSES,
  type NormalizedMaterialOutcomeComponent,
  type OutcomeComponentClass,
} from "./normalize_material_outcome_surface.ts";

export const REPLAY_BASIS_DIMENSION_CODES = [
  "IDENTITY_AUTHORITY",
  "EXECUTABLE",
  "CONFIG",
  "INPUT",
  "POST_SEAL",
  "DETERMINISM",
] as const;

export type ReplayBasisDimensionCode = (typeof REPLAY_BASIS_DIMENSION_CODES)[number];
export type ReplayBasisValidationState =
  | "VALID"
  | "RETENTION_LIMITED"
  | "MISSING_DEPENDENCY"
  | "CORRUPT"
  | "SCHEMA_INCOMPATIBLE"
  | "BUILD_UNAVAILABLE";

export type ReplayComparisonClassification = {
  basis_coverage: number;
  basis_identity_verdict: "IDENTICAL" | "DIFFERENT" | "UNDECIDABLE" | "CORRUPT";
  basis_match_ratio: number;
  comparison_mode:
    | "EXACT_HASH_MATCH"
    | "COUNTERFACTUAL_DECLARED"
    | "LIMITED_HISTORICAL_COMPARISON"
    | "BASIS_INCOMPLETE"
    | "BASIS_CORRUPT";
  deterministic_equivalence_verdict: "IDENTICAL" | "DIFFERENT" | "UNDECIDABLE" | "CORRUPT";
  difference_reason_codes: string[];
  limitation_codes: string[];
  material_outcome_coverage: number;
  material_outcome_match_ratio: number;
  mismatch_inventory: ReplayAttestationMismatchItem[];
  outcome_class:
    | "EXACT_MATCH"
    | "EXPECTED_EQUIVALENCE"
    | "EXPECTED_DIFFERENCE"
    | "LIMITED_COMPARABLE"
    | "BASIS_INCOMPLETE"
    | "BASIS_CORRUPT"
    | "UNEXPECTED_MISMATCH";
  outcome_coverage: number;
  outcome_match_ratio: number;
};

function ratio(numerator: number, denominator: number) {
  if (denominator === 0) {
    return 0;
  }
  return Number((numerator / denominator).toFixed(6));
}

function isObserved(state: "MATCH" | "MISMATCH" | "DECLARED_CHANGE" | "UNOBSERVABLE" | "CORRUPT") {
  return state === "MATCH" || state === "MISMATCH" || state === "DECLARED_CHANGE";
}

function emptyReasonsForMatch(
  state: "MATCH" | "MISMATCH" | "DECLARED_CHANGE" | "UNOBSERVABLE" | "CORRUPT",
) {
  return state === "MATCH" ? [] : ["REPLAY_COMPARISON_VARIANCE"];
}

export function buildReplayBasisDimensionResults(input: {
  actual_hashes: Partial<Record<ReplayBasisDimensionCode, string | null>>;
  corrupt_dimensions?: readonly ReplayBasisDimensionCode[];
  declared_change_dimensions?: readonly ReplayBasisDimensionCode[];
  expected_hashes: Partial<Record<ReplayBasisDimensionCode, string | null>>;
  unobservable_dimensions?: readonly ReplayBasisDimensionCode[];
}): ReplayAttestationBasisDimensionResult[] {
  const corrupt = new Set(input.corrupt_dimensions ?? []);
  const declared = new Set(input.declared_change_dimensions ?? []);
  const unobservable = new Set(input.unobservable_dimensions ?? []);

  return REPLAY_BASIS_DIMENSION_CODES.map((dimensionCode) => {
    const expectedHash = input.expected_hashes[dimensionCode] ?? null;
    const actualHash = input.actual_hashes[dimensionCode] ?? null;
    const comparison_state = corrupt.has(dimensionCode)
      ? "CORRUPT"
      : unobservable.has(dimensionCode)
        ? "UNOBSERVABLE"
        : declared.has(dimensionCode)
          ? "DECLARED_CHANGE"
          : expectedHash !== null && expectedHash === actualHash
            ? "MATCH"
            : "MISMATCH";
    const variance_class =
      comparison_state === "MATCH"
        ? "NONE"
        : comparison_state === "DECLARED_CHANGE"
          ? "DECLARED_COUNTERFACTUAL"
          : comparison_state === "UNOBSERVABLE"
            ? "LIMITATION_ONLY"
            : comparison_state === "CORRUPT"
              ? "INTEGRITY_FAILURE"
              : "UNDECLARED_BASIS_VARIANCE";
    return {
      dimension_code: dimensionCode,
      comparison_state,
      variance_class,
      comparison_weight: 1,
      expected_hash: expectedHash,
      actual_hash: actualHash,
      reason_codes: emptyReasonsForMatch(comparison_state),
    };
  });
}

export function buildReplayOutcomeComponentResults(input: {
  actual: readonly NormalizedMaterialOutcomeComponent[];
  corrupt_components?: readonly OutcomeComponentClass[];
  declared_change_components?: readonly OutcomeComponentClass[];
  expected: readonly NormalizedMaterialOutcomeComponent[];
  unobservable_components?: readonly OutcomeComponentClass[];
}) {
  const actualByClass = new Map(input.actual.map((entry) => [entry.component_class, entry]));
  const expectedByClass = new Map(input.expected.map((entry) => [entry.component_class, entry]));
  const corrupt = new Set(input.corrupt_components ?? []);
  const declared = new Set(input.declared_change_components ?? []);
  const unobservable = new Set(input.unobservable_components ?? []);
  const mismatchInventory: ReplayAttestationMismatchItem[] = [];

  const results = OUTCOME_COMPONENT_CLASSES.map((componentClass) => {
    const expected = expectedByClass.get(componentClass)!;
    const actual = actualByClass.get(componentClass)!;
    const expectedHash =
      expected.payload === null ? null : computeDeterministicOutcomeComponentDigest(expected);
    const actualHash =
      actual.payload === null ? null : computeDeterministicOutcomeComponentDigest(actual);
    const comparison_state = corrupt.has(componentClass)
      ? "CORRUPT"
      : unobservable.has(componentClass)
        ? "UNOBSERVABLE"
        : declared.has(componentClass)
          ? "DECLARED_CHANGE"
          : expectedHash !== null && expectedHash === actualHash
            ? "MATCH"
            : "MISMATCH";
    const variance_class =
      comparison_state === "MATCH"
        ? "NONE"
        : comparison_state === "DECLARED_CHANGE"
          ? "DECLARED_COUNTERFACTUAL"
          : comparison_state === "UNOBSERVABLE"
            ? "LIMITATION_ONLY"
            : comparison_state === "CORRUPT"
              ? "INTEGRITY_FAILURE"
            : actual.materiality === "NON_MATERIAL"
              ? "NON_MATERIAL_OUTCOME_VARIANCE"
              : actual.materiality === "BLOCKING"
                ? "BLOCKING_OUTCOME_VARIANCE"
                : "MATERIAL_OUTCOME_VARIANCE";
    const componentRef =
      actual.component_ref ??
      expected.component_ref ??
      (comparison_state === "UNOBSERVABLE"
        ? null
        : `outcome-component://${componentClass.toLowerCase().replaceAll("_", "-")}`);
    const result: ReplayAttestationOutcomeComponentResult = {
      component_class: componentClass,
      component_ref: componentRef,
      comparison_state,
      variance_class,
      comparison_weight: 1,
      materiality: actual.materiality,
      expected_hash: expectedHash,
      actual_hash: actualHash,
      reason_codes: emptyReasonsForMatch(comparison_state),
    };

    if (
      comparison_state === "MISMATCH" ||
      comparison_state === "DECLARED_CHANGE" ||
      comparison_state === "CORRUPT"
    ) {
      mismatchInventory.push({
        component_class: componentClass,
        component_ref: result.component_ref,
        mismatch_class:
          comparison_state === "DECLARED_CHANGE"
            ? "DECLARED_COUNTERFACTUAL"
            : comparison_state === "CORRUPT"
              ? "CORRUPT_ACTUAL"
            : "HASH_DIFFERENCE",
        materiality: actual.materiality,
        expected_hash: expectedHash,
        actual_hash: actualHash,
        reason_codes: result.reason_codes.length > 0 ? result.reason_codes : ["HASH_DIFFERENCE"],
        variance_class:
          comparison_state === "DECLARED_CHANGE"
            ? "DECLARED_COUNTERFACTUAL"
            : comparison_state === "CORRUPT"
              ? "INTEGRITY_FAILURE"
            : actual.materiality === "NON_MATERIAL"
              ? "NON_MATERIAL_OUTCOME_VARIANCE"
              : actual.materiality === "BLOCKING"
                ? "BLOCKING_OUTCOME_VARIANCE"
                : "MATERIAL_OUTCOME_VARIANCE",
        comparison_weight: 1,
      });
    }

    return result;
  });

  return { mismatch_inventory: mismatchInventory, outcome_component_results: results };
}

function mismatchInventoryFromOutcomeRows(
  results: readonly ReplayAttestationOutcomeComponentResult[],
) {
  return results
    .filter(
      (row) =>
        row.comparison_state === "MISMATCH" ||
        row.comparison_state === "DECLARED_CHANGE" ||
        row.comparison_state === "CORRUPT",
    )
    .map((row) => ({
      component_class: row.component_class,
      component_ref:
        row.component_ref ??
        `outcome-component://${row.component_class.toLowerCase().replaceAll("_", "-")}`,
      mismatch_class:
        row.comparison_state === "DECLARED_CHANGE"
          ? ("DECLARED_COUNTERFACTUAL" as const)
          : row.comparison_state === "CORRUPT"
            ? ("CORRUPT_ACTUAL" as const)
            : ("HASH_DIFFERENCE" as const),
      materiality: row.materiality,
      expected_hash: row.expected_hash,
      actual_hash: row.actual_hash,
      reason_codes: row.reason_codes.length > 0 ? row.reason_codes : ["HASH_DIFFERENCE"],
      variance_class:
        row.comparison_state === "DECLARED_CHANGE"
          ? ("DECLARED_COUNTERFACTUAL" as const)
          : row.comparison_state === "CORRUPT"
            ? ("INTEGRITY_FAILURE" as const)
            : row.variance_class === "NONE" || row.variance_class === "LIMITATION_ONLY"
              ? ("MATERIAL_OUTCOME_VARIANCE" as const)
              : row.variance_class,
      comparison_weight: row.comparison_weight,
    })) satisfies ReplayAttestationMismatchItem[];
}

function classifyBasis(results: readonly ReplayAttestationBasisDimensionResult[]) {
  const total = results.reduce((sum, row) => sum + row.comparison_weight, 0);
  const observed = results
    .filter((row) => isObserved(row.comparison_state))
    .reduce((sum, row) => sum + row.comparison_weight, 0);
  const matches = results
    .filter((row) => row.comparison_state === "MATCH")
    .reduce((sum, row) => sum + row.comparison_weight, 0);
  const declared = results
    .filter((row) => row.comparison_state === "DECLARED_CHANGE")
    .reduce((sum, row) => sum + row.comparison_weight, 0);
  const mismatches = results
    .filter((row) => row.comparison_state === "MISMATCH")
    .reduce((sum, row) => sum + row.comparison_weight, 0);
  const coverage = ratio(observed, total);
  const declaredMass = ratio(declared, total);
  const undeclaredMass = ratio(mismatches, total);
  const verdict = results.some((row) => row.comparison_state === "CORRUPT")
    ? "CORRUPT"
    : coverage === 1 && declaredMass === 0 && undeclaredMass === 0
      ? "IDENTICAL"
      : declaredMass + undeclaredMass > 0
        ? "DIFFERENT"
        : "UNDECIDABLE";
  return {
    basis_coverage: coverage,
    basis_declared_variance_mass: declaredMass,
    basis_identity_verdict: verdict as "IDENTICAL" | "DIFFERENT" | "UNDECIDABLE" | "CORRUPT",
    basis_match_ratio: ratio(matches, observed),
    basis_undeclared_variance_mass: undeclaredMass,
  };
}

function classifyOutcome(
  results: readonly ReplayAttestationOutcomeComponentResult[],
  hashes: Pick<
    DeterministicOutcomeHashResult,
    "deterministic_outcome_hash"
  > & { expected_deterministic_outcome_hash: string | null },
) {
  const total = results.reduce((sum, row) => sum + row.comparison_weight, 0);
  const observed = results
    .filter((row) => isObserved(row.comparison_state))
    .reduce((sum, row) => sum + row.comparison_weight, 0);
  const matches = results
    .filter((row) => row.comparison_state === "MATCH")
    .reduce((sum, row) => sum + row.comparison_weight, 0);
  const materialRows = results.filter((row) => row.materiality !== "NON_MATERIAL");
  const materialTotal = materialRows.reduce((sum, row) => sum + row.comparison_weight, 0);
  const materialObserved = materialRows
    .filter((row) => isObserved(row.comparison_state))
    .reduce((sum, row) => sum + row.comparison_weight, 0);
  const materialMatches = materialRows
    .filter((row) => row.comparison_state === "MATCH")
    .reduce((sum, row) => sum + row.comparison_weight, 0);
  const declared = materialRows
    .filter((row) => row.comparison_state === "DECLARED_CHANGE")
    .reduce((sum, row) => sum + row.comparison_weight, 0);
  const mismatches = materialRows
    .filter((row) => row.comparison_state === "MISMATCH")
    .reduce((sum, row) => sum + row.comparison_weight, 0);
  const materialCoverage = ratio(materialObserved, materialTotal);
  const declaredMass = ratio(declared, materialTotal);
  const undeclaredMass = ratio(mismatches, materialTotal);
  const verdict = results.some((row) => row.comparison_state === "CORRUPT")
    ? "CORRUPT"
    : materialCoverage === 1 &&
        declaredMass === 0 &&
        undeclaredMass === 0 &&
        hashes.expected_deterministic_outcome_hash === hashes.deterministic_outcome_hash
      ? "IDENTICAL"
      : declaredMass + undeclaredMass > 0
        ? "DIFFERENT"
        : "UNDECIDABLE";
  return {
    declared_material_variance_mass: declaredMass,
    deterministic_equivalence_verdict: verdict as
      | "IDENTICAL"
      | "DIFFERENT"
      | "UNDECIDABLE"
      | "CORRUPT",
    material_outcome_coverage: materialCoverage,
    material_outcome_match_ratio: ratio(materialMatches, materialObserved),
    outcome_coverage: ratio(observed, total),
    outcome_match_ratio: ratio(matches, observed),
    undeclared_material_variance_mass: undeclaredMass,
  };
}

export function classifyReplayComparison(input: {
  actual_deterministic_outcome_hash: string | null;
  actual_execution_basis_hash: string | null;
  basis_dimension_results: readonly ReplayAttestationBasisDimensionResult[];
  basis_validation_state: ReplayBasisValidationState;
  expected_deterministic_outcome_hash: string | null;
  expected_execution_basis_hash: string | null;
  mismatch_inventory?: readonly ReplayAttestationMismatchItem[];
  outcome_component_results: readonly ReplayAttestationOutcomeComponentResult[];
  replay_class: RunManifestReplayClass;
}): ReplayComparisonClassification {
  const basis = classifyBasis(input.basis_dimension_results);
  const outcome = classifyOutcome(input.outcome_component_results, {
    deterministic_outcome_hash: input.actual_deterministic_outcome_hash ?? "",
    expected_deterministic_outcome_hash: input.expected_deterministic_outcome_hash,
  });
  const hasObservedComparison =
    input.basis_dimension_results.some((row) => isObserved(row.comparison_state)) ||
    input.outcome_component_results.some((row) => isObserved(row.comparison_state));
  const hasMaterialObserved = input.outcome_component_results.some(
    (row) => row.materiality !== "NON_MATERIAL" && isObserved(row.comparison_state),
  );
  const exactReplayClaimable =
    (input.replay_class === "STANDARD_REPLAY" || input.replay_class === "AUDIT_REPLAY") &&
    input.basis_validation_state === "VALID" &&
    basis.basis_identity_verdict === "IDENTICAL" &&
    outcome.deterministic_equivalence_verdict === "IDENTICAL" &&
    basis.basis_coverage === 1 &&
    outcome.material_outcome_coverage === 1 &&
    input.expected_execution_basis_hash === input.actual_execution_basis_hash &&
    input.expected_deterministic_outcome_hash === input.actual_deterministic_outcome_hash;

  let comparison_mode: ReplayComparisonClassification["comparison_mode"];
  let outcome_class: ReplayComparisonClassification["outcome_class"];
  let basis_identity_verdict = basis.basis_identity_verdict;
  let deterministic_equivalence_verdict = outcome.deterministic_equivalence_verdict;
  if (
    input.basis_validation_state === "CORRUPT" ||
    basis.basis_identity_verdict === "CORRUPT" ||
    outcome.deterministic_equivalence_verdict === "CORRUPT"
  ) {
    comparison_mode = "BASIS_CORRUPT";
    outcome_class = "BASIS_CORRUPT";
    basis_identity_verdict = "CORRUPT";
    deterministic_equivalence_verdict = "CORRUPT";
  } else if (exactReplayClaimable) {
    comparison_mode = "EXACT_HASH_MATCH";
    outcome_class = "EXACT_MATCH";
  } else if (
    input.replay_class === "COUNTERFACTUAL_ANALYSIS" &&
    basis.basis_identity_verdict === "DIFFERENT" &&
    basis.basis_undeclared_variance_mass === 0 &&
    outcome.deterministic_equivalence_verdict === "IDENTICAL"
  ) {
    comparison_mode = "COUNTERFACTUAL_DECLARED";
    outcome_class = "EXPECTED_EQUIVALENCE";
  } else if (
    input.replay_class === "COUNTERFACTUAL_ANALYSIS" &&
    basis.basis_identity_verdict === "DIFFERENT" &&
    basis.basis_undeclared_variance_mass === 0 &&
    outcome.undeclared_material_variance_mass === 0 &&
    outcome.deterministic_equivalence_verdict === "DIFFERENT"
  ) {
    comparison_mode = "COUNTERFACTUAL_DECLARED";
    outcome_class = "EXPECTED_DIFFERENCE";
  } else if (
    hasObservedComparison &&
    hasMaterialObserved &&
    (basis.basis_coverage < 1 || outcome.material_outcome_coverage < 1)
  ) {
    comparison_mode = "LIMITED_HISTORICAL_COMPARISON";
    outcome_class = "LIMITED_COMPARABLE";
  } else if (!hasMaterialObserved) {
    comparison_mode = "BASIS_INCOMPLETE";
    outcome_class = "BASIS_INCOMPLETE";
  } else {
    comparison_mode =
      input.replay_class === "COUNTERFACTUAL_ANALYSIS"
        ? "COUNTERFACTUAL_DECLARED"
        : "BASIS_INCOMPLETE";
    outcome_class =
      input.replay_class === "COUNTERFACTUAL_ANALYSIS"
        ? "UNEXPECTED_MISMATCH"
        : "BASIS_INCOMPLETE";
  }

  const limitationCodes =
    comparison_mode === "LIMITED_HISTORICAL_COMPARISON"
      ? [
          "LIMITED_HISTORICAL_BASIS",
          ...(input.basis_validation_state === "RETENTION_LIMITED"
            ? ["RETENTION_LIMITED_BASIS"]
            : input.basis_validation_state === "MISSING_DEPENDENCY"
              ? ["MISSING_REPLAY_DEPENDENCY"]
              : input.basis_validation_state === "SCHEMA_INCOMPATIBLE"
                ? ["SCHEMA_INCOMPATIBLE_BASIS"]
                : input.basis_validation_state === "BUILD_UNAVAILABLE"
                  ? ["BUILD_UNAVAILABLE"]
                  : []),
        ]
      : comparison_mode === "BASIS_INCOMPLETE"
        ? ["BASIS_INCOMPLETE"]
        : [];
  const differenceCodes =
    comparison_mode === "COUNTERFACTUAL_DECLARED"
      ? ["DECLARED_COUNTERFACTUAL_BASIS"]
      : [];

  const mismatchInventory = input.mismatch_inventory?.length
    ? [...input.mismatch_inventory]
    : mismatchInventoryFromOutcomeRows(input.outcome_component_results);

  return {
    ...basis,
    ...outcome,
    basis_identity_verdict,
    comparison_mode,
    deterministic_equivalence_verdict,
    difference_reason_codes: sortSetLikeStrings(differenceCodes),
    limitation_codes: sortSetLikeStrings(limitationCodes),
    mismatch_inventory: mismatchInventory,
    outcome_class,
  };
}
