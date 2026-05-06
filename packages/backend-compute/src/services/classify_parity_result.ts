import type {
  ParityClassification,
  ParityComparisonRequirement,
  ParityComparisonSetState,
  ParityFieldDeltaRecord,
} from "../models/parity_result.ts";

export type ClassifyParityResultInput = {
  blocking_ratio_cap?: number;
  comparison_requirement: ParityComparisonRequirement;
  comparison_set_state: ParityComparisonSetState;
  deltas: Record<string, ParityFieldDeltaRecord>;
  ordered_field_codes: readonly string[];
};

export type ParityAggregateClassification = {
  cause_hypotheses: string[];
  comparison_coverage: number;
  critical_blocking_field_count: number;
  critical_material_field_count: number;
  dominant_reason_code: string;
  parity_classification: ParityClassification;
  parity_score: number;
  reason_codes: string[];
  weighted_parity_pressure: number;
};

const REASON_ORDER = [
  "PARITY_COMPARISON_SET_INVALID",
  "PARITY_NOT_COMPARABLE",
  "PARITY_PARTIAL_COVERAGE",
  "PARITY_BLOCKING_DIFFERENCE",
  "PARITY_MATERIAL_DIFFERENCE",
  "PARITY_MINOR_DIFFERENCE",
  "PARITY_MATCH",
];

function roundMetric(value: number) {
  return Number(value.toFixed(12));
}

function roundScore(value: number) {
  return Math.round(value);
}

function orderReasonCodes(reasonCodes: readonly string[]) {
  const normalized = [...new Set(reasonCodes)].filter((value) => value.trim().length > 0);
  const present = new Set(normalized);
  return [
    ...REASON_ORDER.filter((reason) => present.has(reason)),
    ...normalized.filter((reason) => !REASON_ORDER.includes(reason)).sort(),
  ];
}

function notComparableInvalid(): ParityAggregateClassification {
  return {
    cause_hypotheses: ["PARITY_COMPARISON_SET_INVALID"],
    comparison_coverage: 0,
    critical_blocking_field_count: 0,
    critical_material_field_count: 0,
    dominant_reason_code: "PARITY_COMPARISON_SET_INVALID",
    parity_classification: "NOT_COMPARABLE",
    parity_score: 0,
    reason_codes: orderReasonCodes(["PARITY_COMPARISON_SET_INVALID", "PARITY_NOT_COMPARABLE"]),
    weighted_parity_pressure: 0,
  };
}

export function classifyParityResult(
  input: ClassifyParityResultInput,
): ParityAggregateClassification {
  if (input.comparison_set_state === "INVALID") {
    return notComparableInvalid();
  }
  const blockingRatioCap = input.blocking_ratio_cap ?? 3;
  const deltas = input.ordered_field_codes.map((fieldCode) => input.deltas[fieldCode]);
  if (
    deltas.length === 0 ||
    deltas.some((delta) => delta === undefined) ||
    !Number.isFinite(blockingRatioCap) ||
    blockingRatioCap < 2.5
  ) {
    return notComparableInvalid();
  }

  const totalRequiredWeight = deltas.reduce((total, delta) => total + delta.criticality_weight, 0);
  if (!Number.isFinite(totalRequiredWeight) || totalRequiredWeight <= 0) {
    return notComparableInvalid();
  }
  const comparable = deltas.filter((delta) => delta.comparison_input_state === "COMPARABLE");
  const comparableWeight = comparable.reduce((total, delta) => total + delta.criticality_weight, 0);
  const comparisonCoverage = roundMetric(comparableWeight / totalRequiredWeight);
  const weightedPressure =
    comparableWeight === 0
      ? 0
      : roundMetric(
          comparable.reduce(
            (total, delta) =>
              total + delta.criticality_weight * Math.min(delta.breach_ratio ?? 0, blockingRatioCap),
            0,
          ) / comparableWeight,
        );
  const rawScore = 100 * comparisonCoverage * Math.max(0, 1 - weightedPressure / blockingRatioCap);
  const parityScore = roundScore(rawScore);

  const hasIncompleteCoverage =
    (input.comparison_requirement === "MANDATORY" ||
      input.comparison_requirement === "DESIRABLE") &&
    comparisonCoverage < 1;
  const criticalBlockingCount = deltas.filter(
    (delta) =>
      delta.criticality_class === "CRITICAL" && delta.field_class === "BLOCKING_DIFFERENCE",
  ).length;
  const criticalMaterialCount = deltas.filter(
    (delta) =>
      delta.criticality_class === "CRITICAL" && delta.field_class === "MATERIAL_DIFFERENCE",
  ).length;
  const hasCriticalOrHighMaterial = deltas.some(
    (delta) =>
      (delta.criticality_class === "CRITICAL" || delta.criticality_class === "HIGH") &&
      delta.field_class === "MATERIAL_DIFFERENCE",
  );
  const hasMinor = deltas.some((delta) => delta.field_class === "MINOR_DIFFERENCE");

  let parityClassification: ParityClassification;
  const reasons: string[] = [];
  const causeHypotheses: string[] = [];
  if (hasIncompleteCoverage) {
    parityClassification = "NOT_COMPARABLE";
    reasons.push("PARITY_NOT_COMPARABLE", "PARITY_PARTIAL_COVERAGE");
    causeHypotheses.push("PARITY_PARTIAL_COVERAGE");
  } else if (criticalBlockingCount > 0) {
    parityClassification = "BLOCKING_DIFFERENCE";
    reasons.push("PARITY_BLOCKING_DIFFERENCE");
  } else if (hasCriticalOrHighMaterial || weightedPressure >= 1) {
    parityClassification = "MATERIAL_DIFFERENCE";
    reasons.push("PARITY_MATERIAL_DIFFERENCE");
  } else if (hasMinor || weightedPressure >= 0.25) {
    parityClassification = "MINOR_DIFFERENCE";
    reasons.push("PARITY_MINOR_DIFFERENCE");
  } else {
    parityClassification = "MATCH";
    reasons.push("PARITY_MATCH");
  }
  const orderedReasons = orderReasonCodes(reasons);
  return {
    cause_hypotheses: causeHypotheses,
    comparison_coverage: comparisonCoverage,
    critical_blocking_field_count: criticalBlockingCount,
    critical_material_field_count: criticalMaterialCount,
    dominant_reason_code: orderedReasons[0],
    parity_classification: parityClassification,
    parity_score: parityScore,
    reason_codes: orderedReasons,
    weighted_parity_pressure: weightedPressure,
  };
}
