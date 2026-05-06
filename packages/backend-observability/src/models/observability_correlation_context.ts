import type {
  TelemetryResourceAttributeMap,
  TelemetryResourceAttributeValue,
  TelemetryResourceCorrelationContext,
} from "../../../generated-models/src/generated/typescript/retention-failure-and-observability.ts";
import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";

export type ObservabilityCorrelationContext = TelemetryResourceCorrelationContext;

export type ObservabilityContractErrorCode =
  | "OBSERVABILITY_ATTRIBUTE_INVALID"
  | "OBSERVABILITY_CONTEXT_BRANCH_MIRROR_DRIFT"
  | "OBSERVABILITY_CONTEXT_FIELD_INVALID"
  | "OBSERVABILITY_CONTEXT_NIGHTLY_DRIFT"
  | "OBSERVABILITY_CONTEXT_REPLAY_DRIFT"
  | "OBSERVABILITY_CONTEXT_START_CLAIM_MIRROR_DRIFT"
  | "OBSERVABILITY_CONTEXT_TRACE_DRIFT";

export class ObservabilityContractError extends Error {
  readonly code: ObservabilityContractErrorCode;

  constructor(code: ObservabilityContractErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ObservabilityContractError";
    this.code = code;
  }
}

export const RUN_KINDS = [
  "INTERACTIVE",
  "NIGHTLY",
  "BACKFILL",
  "REPLAY",
  "REMEDIATION",
  "AMENDMENT",
  "MIGRATION",
] as const satisfies readonly NonNullable<ObservabilityCorrelationContext["run_kind"]>[];

export const EXECUTION_MODES = [
  "COMPLIANCE",
  "ANALYSIS",
] as const satisfies readonly NonNullable<ObservabilityCorrelationContext["mode"]>[];

export const REPLAY_CLASSES = [
  "STANDARD_REPLAY",
  "AUDIT_REPLAY",
  "COUNTERFACTUAL_ANALYSIS",
] as const satisfies readonly NonNullable<ObservabilityCorrelationContext["replay_class"]>[];

export const REPLAY_COMPARISON_MODES = [
  "EXACT_HASH_MATCH",
  "COUNTERFACTUAL_DECLARED",
  "LIMITED_HISTORICAL_COMPARISON",
  "BASIS_INCOMPLETE",
  "BASIS_CORRUPT",
] as const satisfies readonly NonNullable<ObservabilityCorrelationContext["comparison_mode"]>[];

export const REPLAY_BASIS_VALIDATION_STATES = [
  "VALID",
  "RETENTION_LIMITED",
  "MISSING_DEPENDENCY",
  "CORRUPT",
  "SCHEMA_INCOMPATIBLE",
  "BUILD_UNAVAILABLE",
] as const satisfies readonly NonNullable<ObservabilityCorrelationContext["basis_validation_state"]>[];

export const NIGHTLY_SELECTION_DISPOSITIONS = [
  "EXECUTE_NEW_MANIFEST",
  "EXECUTE_CONTINUATION_CHILD",
  "REUSE_EXISTING_TERMINAL_RESULT",
  "DEFER_ACTIVE_ATTEMPT",
  "DEFER_RETRY_WINDOW",
  "ESCALATE_ONLY",
  "SKIP_INELIGIBLE",
] as const satisfies readonly NonNullable<ObservabilityCorrelationContext["selection_disposition"]>[];

export const CONFIG_INHERITANCE_MODES = [
  "FRESH_CHILD_RESOLUTION",
  "REPLAY_EXACT",
  "RECOVERY_EXACT",
  "HISTORICAL_EXPLICIT",
] as const satisfies readonly NonNullable<ObservabilityCorrelationContext["config_inheritance_mode"]>[];

export const INPUT_INHERITANCE_MODES = [
  "FRESH_CHILD_COLLECTION",
  "REPLAY_EXACT",
  "RECOVERY_EXACT",
  "HISTORICAL_EXPLICIT",
] as const satisfies readonly NonNullable<ObservabilityCorrelationContext["input_inheritance_mode"]>[];

export const OBSERVABILITY_CONTEXT_STRING_FIELDS = [
  "tenant_id",
  "client_id",
  "manifest_id",
  "root_manifest_id",
  "parent_manifest_id",
  "continuation_of_manifest_id",
  "replay_of_manifest_id",
  "nightly_batch_run_ref",
  "nightly_window_key",
  "trace_id",
  "span_id",
  "idempotency_key",
  "access_binding_hash",
  "continuation_basis",
  "gate_code",
  "workflow_item_id",
  "task_id",
  "investigation_id",
  "compensation_id",
  "accepted_risk_approval_id",
  "submission_record_id",
  "drift_id",
  "amendment_case_id",
  "amendment_bundle_id",
  "baseline_envelope_id",
  "retroactive_impact_id",
  "authority_operation_id",
  "error_id",
  "retention_class",
  "service_name",
  "environment_ref",
  "code_build_id",
  "expected_execution_basis_hash",
  "actual_execution_basis_hash",
  "expected_deterministic_outcome_hash",
  "actual_deterministic_outcome_hash",
  "manifest_lineage_trace_ref",
] as const satisfies readonly (keyof ObservabilityCorrelationContext)[];

export const OBSERVABILITY_CONTEXT_ENUM_FIELDS = {
  basis_validation_state: REPLAY_BASIS_VALIDATION_STATES,
  comparison_mode: REPLAY_COMPARISON_MODES,
  config_inheritance_mode: CONFIG_INHERITANCE_MODES,
  input_inheritance_mode: INPUT_INHERITANCE_MODES,
  mode: EXECUTION_MODES,
  replay_class: REPLAY_CLASSES,
  run_kind: RUN_KINDS,
  selection_disposition: NIGHTLY_SELECTION_DISPOSITIONS,
} as const;

export function assertObservabilityCondition(
  condition: unknown,
  code: ObservabilityContractErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new ObservabilityContractError(code, detail);
  }
}

export function assertNonEmptyObservabilityString(field: string, value: unknown) {
  assertObservabilityCondition(
    typeof value === "string" && value.trim().length > 0,
    "OBSERVABILITY_CONTEXT_FIELD_INVALID",
    `${field} must remain a non-empty string`,
  );
  return value.trim();
}

export function normalizeOptionalObservabilityString(field: string, value: unknown) {
  if (value === undefined || value === null) {
    return null;
  }
  return assertNonEmptyObservabilityString(field, value);
}

export function normalizeObservabilityStringSet(field: string, values: readonly string[] | null | undefined) {
  return [
    ...new Set(
      (values ?? []).map((value) =>
        assertNonEmptyObservabilityString(`${field}[]`, value),
      ),
    ),
  ];
}

export function normalizeAttributeValue(
  field: string,
  value: unknown,
): TelemetryResourceAttributeValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    if (typeof value === "string" && value.length > 240) {
      throw new ObservabilityContractError(
        "OBSERVABILITY_ATTRIBUTE_INVALID",
        `${field} exceeds bounded structured-field length`,
      );
    }
    const normalized = value as TelemetryResourceAttributeValue;
    return normalized;
  }
  throw new ObservabilityContractError(
    "OBSERVABILITY_ATTRIBUTE_INVALID",
    `${field} must be a scalar telemetry attribute value`,
  );
}

export function normalizeAttributeMap(
  field: string,
  values: TelemetryResourceAttributeMap | undefined,
): TelemetryResourceAttributeMap {
  const normalized: TelemetryResourceAttributeMap = {};
  for (const [key, value] of Object.entries(values ?? {})) {
    if (!/^[a-z][a-z0-9_.-]*$/.test(key)) {
      throw new ObservabilityContractError(
        "OBSERVABILITY_ATTRIBUTE_INVALID",
        `${field}.${key} must use a bounded lower-case attribute key`,
      );
    }
    normalized[key] = normalizeAttributeValue(`${field}.${key}`, value);
  }
  return normalized;
}

export function createStableObservabilityRef(prefix: string, payload: unknown) {
  return `${prefix}.${stableJsonHash(payload)}`;
}

function isPresent(value: unknown) {
  return value !== undefined && value !== null;
}

function assertPairedContextFields(
  context: ObservabilityCorrelationContext,
  left: keyof ObservabilityCorrelationContext,
  right: keyof ObservabilityCorrelationContext,
  code: ObservabilityContractErrorCode,
  detail: string,
) {
  if (isPresent(context[left]) !== isPresent(context[right])) {
    throw new ObservabilityContractError(code, detail);
  }
}

function assertMirror(
  context: ObservabilityCorrelationContext,
  contextField: keyof ObservabilityCorrelationContext,
  expected: unknown,
  code: ObservabilityContractErrorCode,
  detail: string,
) {
  const actual = context[contextField];
  if (isPresent(actual) || isPresent(expected)) {
    assertObservabilityCondition(actual === expected, code, detail);
  }
}

export function assertObservabilityCorrelationContext(
  context: ObservabilityCorrelationContext,
) {
  if (context.span_id !== undefined && context.span_id !== null && !context.trace_id) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_TRACE_DRIFT",
      "span_id cannot appear without trace_id",
    );
  }

  assertPairedContextFields(
    context,
    "nightly_batch_run_ref",
    "nightly_window_key",
    "OBSERVABILITY_CONTEXT_NIGHTLY_DRIFT",
    "nightly_batch_run_ref and nightly_window_key must appear together",
  );

  if (context.selection_disposition && (!context.nightly_batch_run_ref || !context.nightly_window_key)) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_NIGHTLY_DRIFT",
      "selection_disposition requires nightly batch and window correlation",
    );
  }
  if (context.nightly_batch_run_ref && context.run_kind && context.run_kind !== "NIGHTLY") {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_NIGHTLY_DRIFT",
      "nightly correlation keys are legal only for NIGHTLY contexts",
    );
  }

  if (context.replay_class && context.run_kind && context.run_kind !== "REPLAY") {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_REPLAY_DRIFT",
      "replay_class is legal only for REPLAY contexts",
    );
  }
  if (
    !context.replay_class &&
    [
      context.comparison_mode,
      context.basis_validation_state,
      context.expected_execution_basis_hash,
      context.actual_execution_basis_hash,
      context.expected_deterministic_outcome_hash,
      context.actual_deterministic_outcome_hash,
    ].some(isPresent)
  ) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_REPLAY_DRIFT",
      "replay comparison keys require replay_class",
    );
  }
  assertPairedContextFields(
    context,
    "expected_execution_basis_hash",
    "actual_execution_basis_hash",
    "OBSERVABILITY_CONTEXT_REPLAY_DRIFT",
    "expected and actual execution-basis hashes must appear together",
  );
  assertPairedContextFields(
    context,
    "expected_deterministic_outcome_hash",
    "actual_deterministic_outcome_hash",
    "OBSERVABILITY_CONTEXT_REPLAY_DRIFT",
    "expected and actual deterministic outcome hashes must appear together",
  );

  const branchDecision = context.manifest_branch_decision;
  if (branchDecision) {
    assertMirror(
      context,
      "manifest_id",
      branchDecision.selected_manifest_id,
      "OBSERVABILITY_CONTEXT_BRANCH_MIRROR_DRIFT",
      "manifest_id must mirror manifest_branch_decision.selected_manifest_id",
    );
    assertMirror(
      context,
      "root_manifest_id",
      branchDecision.root_manifest_id,
      "OBSERVABILITY_CONTEXT_BRANCH_MIRROR_DRIFT",
      "root_manifest_id must mirror manifest_branch_decision.root_manifest_id",
    );
    assertMirror(
      context,
      "parent_manifest_id",
      branchDecision.parent_manifest_id_or_null,
      "OBSERVABILITY_CONTEXT_BRANCH_MIRROR_DRIFT",
      "parent_manifest_id must mirror manifest_branch_decision.parent_manifest_id_or_null",
    );
    assertMirror(
      context,
      "continuation_of_manifest_id",
      branchDecision.continuation_of_manifest_id_or_null,
      "OBSERVABILITY_CONTEXT_BRANCH_MIRROR_DRIFT",
      "continuation_of_manifest_id must mirror manifest_branch_decision.continuation_of_manifest_id_or_null",
    );
    assertMirror(
      context,
      "replay_of_manifest_id",
      branchDecision.replay_of_manifest_id_or_null,
      "OBSERVABILITY_CONTEXT_BRANCH_MIRROR_DRIFT",
      "replay_of_manifest_id must mirror manifest_branch_decision.replay_of_manifest_id_or_null",
    );
    assertMirror(
      context,
      "idempotency_key",
      branchDecision.idempotency_key,
      "OBSERVABILITY_CONTEXT_BRANCH_MIRROR_DRIFT",
      "idempotency_key must mirror manifest_branch_decision.idempotency_key",
    );
    assertMirror(
      context,
      "access_binding_hash",
      branchDecision.access_binding_hash,
      "OBSERVABILITY_CONTEXT_BRANCH_MIRROR_DRIFT",
      "access_binding_hash must mirror manifest_branch_decision.access_binding_hash",
    );
    assertMirror(
      context,
      "continuation_basis",
      branchDecision.selected_manifest_continuation_basis,
      "OBSERVABILITY_CONTEXT_BRANCH_MIRROR_DRIFT",
      "continuation_basis must mirror manifest_branch_decision.selected_manifest_continuation_basis",
    );
    assertMirror(
      context,
      "run_kind",
      branchDecision.run_kind,
      "OBSERVABILITY_CONTEXT_BRANCH_MIRROR_DRIFT",
      "run_kind must mirror manifest_branch_decision.run_kind",
    );
    assertMirror(
      context,
      "mode",
      branchDecision.mode,
      "OBSERVABILITY_CONTEXT_BRANCH_MIRROR_DRIFT",
      "mode must mirror manifest_branch_decision.mode",
    );
    assertMirror(
      context,
      "replay_class",
      branchDecision.replay_class_or_null,
      "OBSERVABILITY_CONTEXT_BRANCH_MIRROR_DRIFT",
      "replay_class must mirror manifest_branch_decision.replay_class_or_null",
    );
    assertMirror(
      context,
      "nightly_window_key",
      branchDecision.nightly_window_key_or_null,
      "OBSERVABILITY_CONTEXT_BRANCH_MIRROR_DRIFT",
      "nightly_window_key must mirror manifest_branch_decision.nightly_window_key_or_null",
    );
    assertMirror(
      context,
      "config_inheritance_mode",
      branchDecision.config_inheritance_mode_or_null,
      "OBSERVABILITY_CONTEXT_BRANCH_MIRROR_DRIFT",
      "config_inheritance_mode must mirror manifest_branch_decision.config_inheritance_mode_or_null",
    );
    assertMirror(
      context,
      "input_inheritance_mode",
      branchDecision.input_inheritance_mode_or_null,
      "OBSERVABILITY_CONTEXT_BRANCH_MIRROR_DRIFT",
      "input_inheritance_mode must mirror manifest_branch_decision.input_inheritance_mode_or_null",
    );
    assertObservabilityCondition(
      typeof context.manifest_lineage_trace_ref === "string" &&
        context.manifest_lineage_trace_ref.length > 0,
      "OBSERVABILITY_CONTEXT_BRANCH_MIRROR_DRIFT",
      "manifest_lineage_trace_ref is required when manifest_branch_decision is carried",
    );
  } else if (context.manifest_lineage_trace_ref) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_BRANCH_MIRROR_DRIFT",
      "manifest_lineage_trace_ref must not appear without manifest_branch_decision",
    );
  }

  const startClaim = context.manifest_start_claim;
  if (startClaim) {
    assertMirror(
      context,
      "manifest_id",
      startClaim.manifest_id,
      "OBSERVABILITY_CONTEXT_START_CLAIM_MIRROR_DRIFT",
      "manifest_id must mirror manifest_start_claim.manifest_id",
    );
    assertMirror(
      context,
      "access_binding_hash",
      startClaim.access_binding_hash,
      "OBSERVABILITY_CONTEXT_START_CLAIM_MIRROR_DRIFT",
      "access_binding_hash must mirror manifest_start_claim.access_binding_hash",
    );
  }
}
