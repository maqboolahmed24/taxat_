import type { CanonicalJsonValue } from "../../../domain-kernel/src/primitives/hash.ts";

export const OUTCOME_COMPONENT_CLASSES = [
  "DECISION_BUNDLE",
  "GATE_SEQUENCE",
  "SNAPSHOT",
  "COMPUTE_RESULT",
  "FORECAST_SET",
  "RISK_REPORT",
  "PARITY_RESULT",
  "TRUST_SUMMARY",
  "EVIDENCE_GRAPH",
  "TWIN_VIEW",
  "FILING_PACKET",
  "AUTHORITY_RESULT",
  "LATE_DATA_BASIS",
  "DRIFT_RECORD",
] as const;

export type OutcomeComponentClass = (typeof OUTCOME_COMPONENT_CLASSES)[number];
export type OutcomeComponentMateriality = "NON_MATERIAL" | "MATERIAL" | "BLOCKING";

export type MaterialOutcomeComponentInput = {
  component_class: OutcomeComponentClass;
  component_ref?: string | null;
  materiality?: OutcomeComponentMateriality;
  payload?: unknown;
};

export type NormalizedMaterialOutcomeComponent = {
  component_class: OutcomeComponentClass;
  component_ref: string | null;
  materiality: OutcomeComponentMateriality;
  payload: CanonicalJsonValue;
};

const PERSISTENCE_NOISE_FIELDS = new Set([
  "created_at",
  "database_row_id",
  "dequeued_at",
  "emitted_at",
  "manifest_row_version",
  "message_id",
  "persisted_at",
  "queue_id",
  "queue_message_id",
  "row_version",
  "span_id",
  "trace_id",
  "transport_correlation_id",
  "updated_at",
  "workflow_queue_id",
  "written_at",
]);

const PERSISTENCE_NOISE_SUFFIXES = [
  "_created_at",
  "_database_row_id",
  "_dequeued_at",
  "_emitted_at",
  "_manifest_row_version",
  "_message_id",
  "_persisted_at",
  "_queue_id",
  "_queue_message_id",
  "_row_version",
  "_span_id",
  "_trace_id",
  "_transport_correlation_id",
  "_updated_at",
  "_workflow_queue_id",
  "_written_at",
];

function isPersistenceNoiseField(key: string) {
  return (
    PERSISTENCE_NOISE_FIELDS.has(key) ||
    PERSISTENCE_NOISE_SUFFIXES.some((suffix) => key.endsWith(suffix))
  );
}

function normalizeScalar(value: unknown): CanonicalJsonValue {
  if (value === undefined) {
    return null;
  }
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}

export function normalizeMaterialOutcomePayload(value: unknown): CanonicalJsonValue {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeMaterialOutcomePayload(entry));
  }

  if (typeof value !== "object" || value === null || value instanceof Date) {
    return normalizeScalar(value);
  }

  const normalizedObject: Record<string, CanonicalJsonValue> = {};
  for (const [key, entry] of Object.entries(value).sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    if (isPersistenceNoiseField(key)) {
      continue;
    }
    normalizedObject[key.normalize("NFC")] = normalizeMaterialOutcomePayload(entry);
  }
  return normalizedObject;
}

export function normalizeMaterialOutcomeComponent(
  component: MaterialOutcomeComponentInput,
): NormalizedMaterialOutcomeComponent {
  return {
    component_class: component.component_class,
    component_ref:
      component.component_ref == null ? null : component.component_ref.trim().normalize("NFC"),
    materiality: component.materiality ?? "MATERIAL",
    payload: normalizeMaterialOutcomePayload(component.payload ?? null),
  };
}
