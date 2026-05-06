import { canonicalJsonStringify, stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import type {
  DeterministicGoldenPack,
  DeterministicGoldenPackCadenceFixture,
  DeterministicGoldenPackDecimalFieldExpectation,
  DeterministicGoldenPackModuleFixture,
  DeterministicGoldenPackOrderedArrayExpectation,
  DeterministicGoldenPackReplayFixture,
  DeterministicGoldenPackStateTransitionFixture,
  ReleaseCandidateIdentityContract,
  StateTransitionContract,
} from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";

function compareLexicographic(left: string, right: string) {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

export type DeterministicGoldenPackRecord = DeterministicGoldenPack;
export type DeterministicGoldenPackModuleFixtureRecord =
  DeterministicGoldenPackModuleFixture;
export type DeterministicGoldenPackStateTransitionFixtureRecord =
  DeterministicGoldenPackStateTransitionFixture;
export type DeterministicGoldenPackReplayFixtureRecord =
  DeterministicGoldenPackReplayFixture;
export type DeterministicGoldenPackCadenceFixtureRecord =
  DeterministicGoldenPackCadenceFixture;

export const DETERMINISTIC_GOLDEN_PACK_ARTIFACT_TYPE = "DeterministicGoldenPack" as const;
export const DETERMINISTIC_GOLDEN_PACK_CONTRACT_VERSION =
  "DETERMINISTIC_GOLDEN_PACK_V1" as const;
export const DETERMINISTIC_GOLDEN_PACK_CANONICAL_SERIALIZATION_POLICY =
  "CANONICAL_JSON_SORTED_KEYS_UTF8" as const;
export const DETERMINISTIC_GOLDEN_PACK_EXACT_DECIMAL_POLICY =
  "EXACT_DECIMAL_STRING_NO_LOCALE_NO_EXPONENT" as const;
export const DETERMINISTIC_GOLDEN_PACK_NULL_SLOT_POLICY =
  "EXPLICIT_NULL_SLOTS_RETAINED_IN_ORDERED_PAYLOADS" as const;
export const DETERMINISTIC_GOLDEN_PACK_REPLAY_COMPARISON_POLICY =
  "GOLDEN_FIXTURES_BIND_CANDIDATE_SCHEMA_SCOPE_AND_EXPECTED_HASHES" as const;
export const DETERMINISTIC_GOLDEN_PACK_STATE_TRANSITION_POLICY =
  "STATE_MACHINE_FIXTURES_REQUIRE_NAMED_PREVIOUS_AND_CURRENT_STATE" as const;
export const DETERMINISTIC_GOLDEN_PACK_CADENCE_POLICY =
  "DETERMINISTIC_RETRY_AND_RECONCILIATION_CADENCE_NO_RANDOM_JITTER" as const;
export const DETERMINISTIC_GOLDEN_PACK_MODULE_FIXTURE_BINDING_POLICY =
  "CANDIDATE_SCHEMA_SCOPE_BOUND" as const;
export const DETERMINISTIC_GOLDEN_PACK_ORDERING_POLICY =
  "PRESERVE_DECLARED_ORDER" as const;
export const DETERMINISTIC_GOLDEN_PACK_TRANSITION_BINDING_POLICY =
  "NAMED_STATE_MACHINE_TUPLE_AND_EVENT" as const;
export const DETERMINISTIC_GOLDEN_PACK_REPLAY_BINDING_POLICY =
  "CANDIDATE_SCHEMA_SCOPE_AND_HASH_BOUND" as const;
export const DETERMINISTIC_GOLDEN_PACK_CADENCE_JITTER_POLICY = "NONE" as const;

export const DETERMINISTIC_GOLDEN_PACK_REPLAY_CLASSES = [
  "STANDARD_REPLAY",
  "AUDIT_REPLAY",
  "COUNTERFACTUAL_ANALYSIS",
] as const satisfies readonly DeterministicGoldenPackReplayFixture["replay_class"][];

export const DETERMINISTIC_GOLDEN_PACK_REPLAY_COMPARISON_MODES = [
  "EXACT_HASH_MATCH",
  "COUNTERFACTUAL_DECLARED",
  "LIMITED_HISTORICAL_COMPARISON",
  "BASIS_INCOMPLETE",
  "BASIS_CORRUPT",
] as const satisfies readonly DeterministicGoldenPackReplayFixture["comparison_mode"][];

export const DETERMINISTIC_GOLDEN_PACK_REPLAY_OUTCOME_CLASSES = [
  "EXACT_MATCH",
  "EXPECTED_EQUIVALENCE",
  "EXPECTED_DIFFERENCE",
  "LIMITED_COMPARABLE",
  "BASIS_INCOMPLETE",
  "BASIS_CORRUPT",
  "UNEXPECTED_MISMATCH",
] as const satisfies readonly DeterministicGoldenPackReplayFixture["expected_outcome_class"][];

export const DETERMINISTIC_GOLDEN_PACK_CADENCE_FAMILIES = [
  "RETRY",
  "RECONCILIATION",
] as const satisfies readonly DeterministicGoldenPackCadenceFixture["cadence_family"][];

const EXACT_DECIMAL_PATTERN = /^-?(0|[1-9]\d*)(\.\d+)?$/;
const TRANSITION_EVENT_CODE_PATTERN = /^[a-z][a-z0-9_]*$/;

type JsonRecord = Record<string, unknown>;

export type DeterministicGoldenPackModelErrorCode =
  | "DETERMINISTIC_GOLDEN_PACK_FIELD_INVALID"
  | "DETERMINISTIC_GOLDEN_PACK_DECIMAL_INVALID"
  | "DETERMINISTIC_GOLDEN_PACK_NULL_SLOT_INVALID"
  | "DETERMINISTIC_GOLDEN_PACK_ORDER_INVALID"
  | "DETERMINISTIC_GOLDEN_PACK_HASH_INVALID"
  | "DETERMINISTIC_GOLDEN_PACK_FIXTURE_INVALID"
  | "DETERMINISTIC_GOLDEN_PACK_RELEASE_BINDING_INVALID";

export class DeterministicGoldenPackModelError extends Error {
  readonly code: DeterministicGoldenPackModelErrorCode;

  constructor(code: DeterministicGoldenPackModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "DeterministicGoldenPackModelError";
    this.code = code;
  }
}

export function deterministicGoldenPackFailureTrace(value: unknown) {
  try {
    return canonicalJsonStringify(value);
  } catch {
    return JSON.stringify(value, null, 2);
  }
}

export function assertDeterministicGoldenPack(
  condition: unknown,
  code: DeterministicGoldenPackModelErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new DeterministicGoldenPackModelError(code, detail);
  }
}

export function requireGoldenPackTrimmedString(label: string, value: unknown) {
  assertDeterministicGoldenPack(
    typeof value === "string" && value.trim() === value && value.length > 0,
    "DETERMINISTIC_GOLDEN_PACK_FIELD_INVALID",
    `${label} must be a non-empty trimmed string`,
  );
  return value;
}

function requireGoldenPackNullableTrimmedString(label: string, value: unknown) {
  if (value === null) {
    return null;
  }
  return requireGoldenPackTrimmedString(label, value);
}

export function requireGoldenPackStringEnum<const T extends readonly string[]>(
  label: string,
  value: unknown,
  allowed: T,
): T[number] {
  assertDeterministicGoldenPack(
    typeof value === "string" && (allowed as readonly string[]).includes(value),
    "DETERMINISTIC_GOLDEN_PACK_FIELD_INVALID",
    `${label} must be one of ${allowed.join(", ")}`,
  );
  return value as T[number];
}

function requireInteger(label: string, value: unknown, minimum: number) {
  assertDeterministicGoldenPack(
    Number.isInteger(value) && (value as number) >= minimum,
    "DETERMINISTIC_GOLDEN_PACK_FIELD_INVALID",
    `${label} must be an integer >= ${minimum}`,
  );
  return value as number;
}

function requireArray(label: string, value: unknown) {
  assertDeterministicGoldenPack(
    Array.isArray(value),
    "DETERMINISTIC_GOLDEN_PACK_FIELD_INVALID",
    `${label} must be an array`,
  );
  return value;
}

function requirePlainRecord(label: string, value: unknown): JsonRecord {
  assertDeterministicGoldenPack(
    value !== null && typeof value === "object" && !Array.isArray(value),
    "DETERMINISTIC_GOLDEN_PACK_FIELD_INVALID",
    `${label} must be an object`,
  );
  return value as JsonRecord;
}

function assertUnique(label: string, values: readonly string[]) {
  assertDeterministicGoldenPack(
    new Set(values).size === values.length,
    "DETERMINISTIC_GOLDEN_PACK_FIXTURE_INVALID",
    `${label} must not contain duplicates`,
  );
}

function normalizeUniqueStringList(label: string, values: unknown, allowEmpty: boolean) {
  const rows = requireArray(label, values).map((value, index) =>
    requireGoldenPackTrimmedString(`${label}[${index}]`, value),
  );
  assertDeterministicGoldenPack(
    allowEmpty || rows.length > 0,
    "DETERMINISTIC_GOLDEN_PACK_FIXTURE_INVALID",
    `${label} must contain at least one row`,
  );
  assertUnique(label, rows);
  return [...rows].sort(compareLexicographic);
}

function normalizeExpectedValues(label: string, values: unknown) {
  const rows = requireArray(label, values).map((value, index) =>
    requireGoldenPackTrimmedString(`${label}[${index}]`, value),
  );
  assertDeterministicGoldenPack(
    rows.length > 0,
    "DETERMINISTIC_GOLDEN_PACK_ORDER_INVALID",
    `${label} must retain at least one expected ordered value`,
  );
  return rows;
}

export function normalizeDeterministicDecimalExpectations(
  values: unknown,
): DeterministicGoldenPackDecimalFieldExpectation[] {
  const seen = new Set<string>();
  const rows = requireArray("expected_decimal_fields", values).map((value, index) => {
    const row = requirePlainRecord(`expected_decimal_fields[${index}]`, value);
    const fieldPath = requireGoldenPackTrimmedString(
      `expected_decimal_fields[${index}].field_path`,
      row.field_path,
    );
    const decimalValue = requireGoldenPackTrimmedString(
      `expected_decimal_fields[${index}].decimal_value`,
      row.decimal_value,
    );
    assertDeterministicGoldenPack(
      EXACT_DECIMAL_PATTERN.test(decimalValue),
      "DETERMINISTIC_GOLDEN_PACK_DECIMAL_INVALID",
      `expected_decimal_fields[${index}].decimal_value must be an exact decimal string with no locale or exponent`,
    );
    assertDeterministicGoldenPack(
      !seen.has(fieldPath),
      "DETERMINISTIC_GOLDEN_PACK_DECIMAL_INVALID",
      `expected_decimal_fields must not duplicate field_path ${fieldPath}`,
    );
    seen.add(fieldPath);
    return {
      field_path: fieldPath,
      decimal_value: decimalValue,
    };
  });
  assertDeterministicGoldenPack(
    rows.length > 0,
    "DETERMINISTIC_GOLDEN_PACK_DECIMAL_INVALID",
    "expected_decimal_fields must contain at least one exact decimal expectation",
  );
  return rows.sort((left, right) => compareLexicographic(left.field_path, right.field_path));
}

export function normalizeDeterministicOrderedArrayExpectations(
  values: unknown,
): DeterministicGoldenPackOrderedArrayExpectation[] {
  const seen = new Set<string>();
  const rows = requireArray("expected_ordered_array_fields", values).map((value, index) => {
    const row = requirePlainRecord(`expected_ordered_array_fields[${index}]`, value);
    const fieldPath = requireGoldenPackTrimmedString(
      `expected_ordered_array_fields[${index}].field_path`,
      row.field_path,
    );
    const orderingPolicy =
      row.ordering_policy ?? DETERMINISTIC_GOLDEN_PACK_ORDERING_POLICY;
    assertDeterministicGoldenPack(
      orderingPolicy === DETERMINISTIC_GOLDEN_PACK_ORDERING_POLICY,
      "DETERMINISTIC_GOLDEN_PACK_ORDER_INVALID",
      `expected_ordered_array_fields[${index}].ordering_policy must be ${DETERMINISTIC_GOLDEN_PACK_ORDERING_POLICY}`,
    );
    assertDeterministicGoldenPack(
      !seen.has(fieldPath),
      "DETERMINISTIC_GOLDEN_PACK_ORDER_INVALID",
      `expected_ordered_array_fields must not duplicate field_path ${fieldPath}`,
    );
    seen.add(fieldPath);
    return {
      field_path: fieldPath,
      ordering_policy: DETERMINISTIC_GOLDEN_PACK_ORDERING_POLICY,
      expected_values: normalizeExpectedValues(
        `expected_ordered_array_fields[${index}].expected_values`,
        row.expected_values,
      ),
    };
  });
  assertDeterministicGoldenPack(
    rows.length > 0,
    "DETERMINISTIC_GOLDEN_PACK_ORDER_INVALID",
    "expected_ordered_array_fields must contain at least one ordered-array expectation",
  );
  return rows.sort((left, right) => compareLexicographic(left.field_path, right.field_path));
}

export function normalizeDeterministicModuleFixture(
  fixture: DeterministicGoldenPackModuleFixture,
): DeterministicGoldenPackModuleFixture {
  const normalized: DeterministicGoldenPackModuleFixture = {
    fixture_id: requireGoldenPackTrimmedString("module_fixtures[].fixture_id", fixture.fixture_id),
    module_code: requireGoldenPackTrimmedString("module_fixtures[].module_code", fixture.module_code),
    artifact_family: requireGoldenPackTrimmedString(
      "module_fixtures[].artifact_family",
      fixture.artifact_family,
    ),
    scope_binding_hash: requireGoldenPackTrimmedString(
      "module_fixtures[].scope_binding_hash",
      fixture.scope_binding_hash,
    ),
    canonical_payload_hash: requireGoldenPackTrimmedString(
      "module_fixtures[].canonical_payload_hash",
      fixture.canonical_payload_hash,
    ),
    expected_null_field_paths: normalizeUniqueStringList(
      "module_fixtures[].expected_null_field_paths",
      fixture.expected_null_field_paths,
      false,
    ),
    expected_decimal_fields: normalizeDeterministicDecimalExpectations(
      fixture.expected_decimal_fields,
    ),
    expected_ordered_array_fields: normalizeDeterministicOrderedArrayExpectations(
      fixture.expected_ordered_array_fields,
    ),
    fixture_binding_policy: DETERMINISTIC_GOLDEN_PACK_MODULE_FIXTURE_BINDING_POLICY,
  };
  assertDeterministicGoldenPack(
    fixture.fixture_binding_policy === DETERMINISTIC_GOLDEN_PACK_MODULE_FIXTURE_BINDING_POLICY,
    "DETERMINISTIC_GOLDEN_PACK_FIXTURE_INVALID",
    `module fixture ${normalized.fixture_id} must retain fixture_binding_policy=${DETERMINISTIC_GOLDEN_PACK_MODULE_FIXTURE_BINDING_POLICY}`,
  );
  return normalized;
}

export function normalizeDeterministicModuleFixtures(
  fixtures: readonly DeterministicGoldenPackModuleFixture[],
) {
  const rows = fixtures.map((fixture) => normalizeDeterministicModuleFixture(fixture));
  assertDeterministicGoldenPack(
    rows.length > 0,
    "DETERMINISTIC_GOLDEN_PACK_FIXTURE_INVALID",
    "module_fixtures must contain at least one row",
  );
  assertUnique(
    "module_fixtures.fixture_id",
    rows.map((fixture) => fixture.fixture_id),
  );
  return rows.sort((left, right) => compareLexicographic(left.fixture_id, right.fixture_id));
}

export function normalizeDeterministicStateTransitionFixture(
  fixture: DeterministicGoldenPackStateTransitionFixture,
): DeterministicGoldenPackStateTransitionFixture {
  const stateTransitionContract = requirePlainRecord(
    "state_transition_fixtures[].state_transition_contract",
    fixture.state_transition_contract,
  ) as unknown as StateTransitionContract;
  const currentState = requireGoldenPackTrimmedString(
    "state_transition_fixtures[].expected_current_state",
    fixture.expected_current_state,
  );
  const previousStateOrNull = requireGoldenPackNullableTrimmedString(
    "state_transition_fixtures[].expected_previous_state_or_null",
    fixture.expected_previous_state_or_null,
  );
  const eventCode = requireGoldenPackTrimmedString(
    "state_transition_fixtures[].expected_transition_event_code",
    fixture.expected_transition_event_code,
  );
  assertDeterministicGoldenPack(
    TRANSITION_EVENT_CODE_PATTERN.test(eventCode),
    "DETERMINISTIC_GOLDEN_PACK_FIXTURE_INVALID",
    "expected_transition_event_code must be snake_case and start with a lower-case letter",
  );
  assertDeterministicGoldenPack(
    stateTransitionContract.current_state === currentState &&
      stateTransitionContract.previous_state_or_null === previousStateOrNull &&
      stateTransitionContract.transition_event_code === eventCode,
    "DETERMINISTIC_GOLDEN_PACK_FIXTURE_INVALID",
    "state_transition_contract must mirror expected current, previous, and event fields",
  );
  assertDeterministicGoldenPack(
    fixture.transition_binding_policy === DETERMINISTIC_GOLDEN_PACK_TRANSITION_BINDING_POLICY,
    "DETERMINISTIC_GOLDEN_PACK_FIXTURE_INVALID",
    `state transition fixture must retain transition_binding_policy=${DETERMINISTIC_GOLDEN_PACK_TRANSITION_BINDING_POLICY}`,
  );
  return {
    fixture_id: requireGoldenPackTrimmedString(
      "state_transition_fixtures[].fixture_id",
      fixture.fixture_id,
    ),
    scope_binding_hash: requireGoldenPackTrimmedString(
      "state_transition_fixtures[].scope_binding_hash",
      fixture.scope_binding_hash,
    ),
    state_transition_contract: stateTransitionContract,
    expected_current_state: currentState,
    expected_previous_state_or_null: previousStateOrNull,
    expected_transition_event_code: eventCode,
    transition_binding_policy: DETERMINISTIC_GOLDEN_PACK_TRANSITION_BINDING_POLICY,
  };
}

export function normalizeDeterministicStateTransitionFixtures(
  fixtures: readonly DeterministicGoldenPackStateTransitionFixture[],
) {
  const rows = fixtures.map((fixture) => normalizeDeterministicStateTransitionFixture(fixture));
  assertDeterministicGoldenPack(
    rows.length > 0,
    "DETERMINISTIC_GOLDEN_PACK_FIXTURE_INVALID",
    "state_transition_fixtures must contain at least one row",
  );
  assertUnique(
    "state_transition_fixtures.fixture_id",
    rows.map((fixture) => fixture.fixture_id),
  );
  return rows.sort((left, right) => compareLexicographic(left.fixture_id, right.fixture_id));
}

export function normalizeDeterministicReplayFixture(
  fixture: DeterministicGoldenPackReplayFixture,
): DeterministicGoldenPackReplayFixture {
  const replayClass = requireGoldenPackStringEnum(
    "replay_fixtures[].replay_class",
    fixture.replay_class,
    DETERMINISTIC_GOLDEN_PACK_REPLAY_CLASSES,
  );
  const comparisonMode = requireGoldenPackStringEnum(
    "replay_fixtures[].comparison_mode",
    fixture.comparison_mode,
    DETERMINISTIC_GOLDEN_PACK_REPLAY_COMPARISON_MODES,
  );
  const expectedOutcomeClass = requireGoldenPackStringEnum(
    "replay_fixtures[].expected_outcome_class",
    fixture.expected_outcome_class,
    DETERMINISTIC_GOLDEN_PACK_REPLAY_OUTCOME_CLASSES,
  );
  assertDeterministicGoldenPack(
    fixture.comparison_binding_policy === DETERMINISTIC_GOLDEN_PACK_REPLAY_BINDING_POLICY,
    "DETERMINISTIC_GOLDEN_PACK_FIXTURE_INVALID",
    `replay fixture must retain comparison_binding_policy=${DETERMINISTIC_GOLDEN_PACK_REPLAY_BINDING_POLICY}`,
  );
  assertDeterministicGoldenPack(
    comparisonMode !== "EXACT_HASH_MATCH" || expectedOutcomeClass === "EXACT_MATCH",
    "DETERMINISTIC_GOLDEN_PACK_FIXTURE_INVALID",
    "EXACT_HASH_MATCH replay fixtures must expect EXACT_MATCH",
  );
  assertDeterministicGoldenPack(
    comparisonMode !== "COUNTERFACTUAL_DECLARED" ||
      (replayClass === "COUNTERFACTUAL_ANALYSIS" &&
        expectedOutcomeClass === "EXPECTED_DIFFERENCE"),
    "DETERMINISTIC_GOLDEN_PACK_FIXTURE_INVALID",
    "COUNTERFACTUAL_DECLARED replay fixtures must bind COUNTERFACTUAL_ANALYSIS and EXPECTED_DIFFERENCE",
  );
  assertDeterministicGoldenPack(
    !(
      (comparisonMode === "BASIS_INCOMPLETE" || comparisonMode === "BASIS_CORRUPT") &&
      expectedOutcomeClass === "EXACT_MATCH"
    ),
    "DETERMINISTIC_GOLDEN_PACK_FIXTURE_INVALID",
    "incomplete or corrupt replay basis cannot expect EXACT_MATCH",
  );
  return {
    fixture_id: requireGoldenPackTrimmedString("replay_fixtures[].fixture_id", fixture.fixture_id),
    scope_binding_hash: requireGoldenPackTrimmedString(
      "replay_fixtures[].scope_binding_hash",
      fixture.scope_binding_hash,
    ),
    replay_class: replayClass,
    comparison_mode: comparisonMode,
    expected_outcome_class: expectedOutcomeClass,
    expected_execution_basis_hash: requireGoldenPackTrimmedString(
      "replay_fixtures[].expected_execution_basis_hash",
      fixture.expected_execution_basis_hash,
    ),
    expected_deterministic_outcome_hash: requireGoldenPackTrimmedString(
      "replay_fixtures[].expected_deterministic_outcome_hash",
      fixture.expected_deterministic_outcome_hash,
    ),
    comparison_binding_policy: DETERMINISTIC_GOLDEN_PACK_REPLAY_BINDING_POLICY,
  };
}

export function normalizeDeterministicReplayFixtures(
  fixtures: readonly DeterministicGoldenPackReplayFixture[],
) {
  const rows = fixtures.map((fixture) => normalizeDeterministicReplayFixture(fixture));
  assertDeterministicGoldenPack(
    rows.length > 0,
    "DETERMINISTIC_GOLDEN_PACK_FIXTURE_INVALID",
    "replay_fixtures must contain at least one row",
  );
  assertUnique(
    "replay_fixtures.fixture_id",
    rows.map((fixture) => fixture.fixture_id),
  );
  return rows.sort((left, right) => compareLexicographic(left.fixture_id, right.fixture_id));
}

export function normalizeDeterministicCadenceFixture(
  fixture: DeterministicGoldenPackCadenceFixture,
): DeterministicGoldenPackCadenceFixture {
  const jitterPolicy = fixture.jitter_policy;
  assertDeterministicGoldenPack(
    jitterPolicy === DETERMINISTIC_GOLDEN_PACK_CADENCE_JITTER_POLICY,
    "DETERMINISTIC_GOLDEN_PACK_FIXTURE_INVALID",
    `cadence fixture must retain jitter_policy=${DETERMINISTIC_GOLDEN_PACK_CADENCE_JITTER_POLICY}`,
  );
  return {
    fixture_id: requireGoldenPackTrimmedString("cadence_fixtures[].fixture_id", fixture.fixture_id),
    scope_binding_hash: requireGoldenPackTrimmedString(
      "cadence_fixtures[].scope_binding_hash",
      fixture.scope_binding_hash,
    ),
    cadence_family: requireGoldenPackStringEnum(
      "cadence_fixtures[].cadence_family",
      fixture.cadence_family,
      DETERMINISTIC_GOLDEN_PACK_CADENCE_FAMILIES,
    ),
    attempt_index: requireInteger("cadence_fixtures[].attempt_index", fixture.attempt_index, 0),
    expected_cadence_seconds: requireInteger(
      "cadence_fixtures[].expected_cadence_seconds",
      fixture.expected_cadence_seconds,
      1,
    ),
    jitter_policy: DETERMINISTIC_GOLDEN_PACK_CADENCE_JITTER_POLICY,
    schedule_derivation_basis: requireGoldenPackTrimmedString(
      "cadence_fixtures[].schedule_derivation_basis",
      fixture.schedule_derivation_basis,
    ),
  };
}

export function normalizeDeterministicCadenceFixtures(
  fixtures: readonly DeterministicGoldenPackCadenceFixture[],
) {
  const rows = fixtures.map((fixture) => normalizeDeterministicCadenceFixture(fixture));
  assertDeterministicGoldenPack(
    rows.length > 0,
    "DETERMINISTIC_GOLDEN_PACK_FIXTURE_INVALID",
    "cadence_fixtures must contain at least one row",
  );
  assertUnique(
    "cadence_fixtures.fixture_id",
    rows.map((fixture) => fixture.fixture_id),
  );
  return rows.sort((left, right) => compareLexicographic(left.fixture_id, right.fixture_id));
}

export type DeterministicGoldenPackHashPayload = {
  artifact_type: typeof DETERMINISTIC_GOLDEN_PACK_ARTIFACT_TYPE;
  contract_version: typeof DETERMINISTIC_GOLDEN_PACK_CONTRACT_VERSION;
  candidate_identity_hash: string;
  schema_bundle_hash: string;
  config_bundle_hash: string;
  canonical_serialization_policy: typeof DETERMINISTIC_GOLDEN_PACK_CANONICAL_SERIALIZATION_POLICY;
  exact_decimal_policy: typeof DETERMINISTIC_GOLDEN_PACK_EXACT_DECIMAL_POLICY;
  null_slot_policy: typeof DETERMINISTIC_GOLDEN_PACK_NULL_SLOT_POLICY;
  replay_comparison_policy: typeof DETERMINISTIC_GOLDEN_PACK_REPLAY_COMPARISON_POLICY;
  state_transition_policy: typeof DETERMINISTIC_GOLDEN_PACK_STATE_TRANSITION_POLICY;
  cadence_policy: typeof DETERMINISTIC_GOLDEN_PACK_CADENCE_POLICY;
  module_fixtures: DeterministicGoldenPackModuleFixture[];
  state_transition_fixtures: DeterministicGoldenPackStateTransitionFixture[];
  replay_fixtures: DeterministicGoldenPackReplayFixture[];
  cadence_fixtures: DeterministicGoldenPackCadenceFixture[];
};

export function canonicalizeDeterministicGoldenPackHashPayload(
  pack: Pick<
    DeterministicGoldenPack,
    | "artifact_type"
    | "contract_version"
    | "candidate_identity_hash"
    | "schema_bundle_hash"
    | "config_bundle_hash"
    | "canonical_serialization_policy"
    | "exact_decimal_policy"
    | "null_slot_policy"
    | "replay_comparison_policy"
    | "state_transition_policy"
    | "cadence_policy"
    | "module_fixtures"
    | "state_transition_fixtures"
    | "replay_fixtures"
    | "cadence_fixtures"
  >,
): DeterministicGoldenPackHashPayload {
  const payload: DeterministicGoldenPackHashPayload = {
    artifact_type: DETERMINISTIC_GOLDEN_PACK_ARTIFACT_TYPE,
    contract_version: DETERMINISTIC_GOLDEN_PACK_CONTRACT_VERSION,
    candidate_identity_hash: requireGoldenPackTrimmedString(
      "deterministic_golden_pack.candidate_identity_hash",
      pack.candidate_identity_hash,
    ),
    schema_bundle_hash: requireGoldenPackTrimmedString(
      "deterministic_golden_pack.schema_bundle_hash",
      pack.schema_bundle_hash,
    ),
    config_bundle_hash: requireGoldenPackTrimmedString(
      "deterministic_golden_pack.config_bundle_hash",
      pack.config_bundle_hash,
    ),
    canonical_serialization_policy: DETERMINISTIC_GOLDEN_PACK_CANONICAL_SERIALIZATION_POLICY,
    exact_decimal_policy: DETERMINISTIC_GOLDEN_PACK_EXACT_DECIMAL_POLICY,
    null_slot_policy: DETERMINISTIC_GOLDEN_PACK_NULL_SLOT_POLICY,
    replay_comparison_policy: DETERMINISTIC_GOLDEN_PACK_REPLAY_COMPARISON_POLICY,
    state_transition_policy: DETERMINISTIC_GOLDEN_PACK_STATE_TRANSITION_POLICY,
    cadence_policy: DETERMINISTIC_GOLDEN_PACK_CADENCE_POLICY,
    module_fixtures: normalizeDeterministicModuleFixtures(pack.module_fixtures),
    state_transition_fixtures: normalizeDeterministicStateTransitionFixtures(
      pack.state_transition_fixtures,
    ),
    replay_fixtures: normalizeDeterministicReplayFixtures(pack.replay_fixtures),
    cadence_fixtures: normalizeDeterministicCadenceFixtures(pack.cadence_fixtures),
  };
  assertDeterministicGoldenPack(
    pack.artifact_type === DETERMINISTIC_GOLDEN_PACK_ARTIFACT_TYPE &&
      pack.contract_version === DETERMINISTIC_GOLDEN_PACK_CONTRACT_VERSION &&
      pack.canonical_serialization_policy ===
        DETERMINISTIC_GOLDEN_PACK_CANONICAL_SERIALIZATION_POLICY &&
      pack.exact_decimal_policy === DETERMINISTIC_GOLDEN_PACK_EXACT_DECIMAL_POLICY &&
      pack.null_slot_policy === DETERMINISTIC_GOLDEN_PACK_NULL_SLOT_POLICY &&
      pack.replay_comparison_policy ===
        DETERMINISTIC_GOLDEN_PACK_REPLAY_COMPARISON_POLICY &&
      pack.state_transition_policy ===
        DETERMINISTIC_GOLDEN_PACK_STATE_TRANSITION_POLICY &&
      pack.cadence_policy === DETERMINISTIC_GOLDEN_PACK_CADENCE_POLICY,
    "DETERMINISTIC_GOLDEN_PACK_FIELD_INVALID",
    "deterministic golden pack policy constants must match the schema contract",
  );
  return payload;
}

export function deriveDeterministicGoldenPackHash(
  pack: Pick<
    DeterministicGoldenPack,
    | "artifact_type"
    | "contract_version"
    | "candidate_identity_hash"
    | "schema_bundle_hash"
    | "config_bundle_hash"
    | "canonical_serialization_policy"
    | "exact_decimal_policy"
    | "null_slot_policy"
    | "replay_comparison_policy"
    | "state_transition_policy"
    | "cadence_policy"
    | "module_fixtures"
    | "state_transition_fixtures"
    | "replay_fixtures"
    | "cadence_fixtures"
  >,
) {
  return stableJsonHash(canonicalizeDeterministicGoldenPackHashPayload(pack));
}

export function normalizeDeterministicGoldenPack(
  pack: DeterministicGoldenPack,
): DeterministicGoldenPack {
  const candidateIdentityContract = requirePlainRecord(
    "deterministic_golden_pack.candidate_identity_contract",
    pack.candidate_identity_contract,
  ) as unknown as ReleaseCandidateIdentityContract;
  const candidateIdentityHash = requireGoldenPackTrimmedString(
    "deterministic_golden_pack.candidate_identity_hash",
    pack.candidate_identity_hash,
  );
  const schemaBundleHash = requireGoldenPackTrimmedString(
    "deterministic_golden_pack.schema_bundle_hash",
    pack.schema_bundle_hash,
  );
  const configBundleHash = requireGoldenPackTrimmedString(
    "deterministic_golden_pack.config_bundle_hash",
    pack.config_bundle_hash,
  );
  assertDeterministicGoldenPack(
    candidateIdentityContract.candidate_identity_hash === candidateIdentityHash &&
      candidateIdentityContract.schema_bundle_hash === schemaBundleHash &&
      candidateIdentityContract.config_bundle_hash === configBundleHash,
    "DETERMINISTIC_GOLDEN_PACK_FIELD_INVALID",
    "candidate identity, schema bundle, and config bundle fields must mirror candidate_identity_contract",
  );
  const hashPayload = canonicalizeDeterministicGoldenPackHashPayload({
    ...pack,
    artifact_type: DETERMINISTIC_GOLDEN_PACK_ARTIFACT_TYPE,
    contract_version: DETERMINISTIC_GOLDEN_PACK_CONTRACT_VERSION,
    candidate_identity_hash: candidateIdentityHash,
    schema_bundle_hash: schemaBundleHash,
    config_bundle_hash: configBundleHash,
    canonical_serialization_policy: DETERMINISTIC_GOLDEN_PACK_CANONICAL_SERIALIZATION_POLICY,
    exact_decimal_policy: DETERMINISTIC_GOLDEN_PACK_EXACT_DECIMAL_POLICY,
    null_slot_policy: DETERMINISTIC_GOLDEN_PACK_NULL_SLOT_POLICY,
    replay_comparison_policy: DETERMINISTIC_GOLDEN_PACK_REPLAY_COMPARISON_POLICY,
    state_transition_policy: DETERMINISTIC_GOLDEN_PACK_STATE_TRANSITION_POLICY,
    cadence_policy: DETERMINISTIC_GOLDEN_PACK_CADENCE_POLICY,
  });
  return {
    golden_pack_id: requireGoldenPackTrimmedString(
      "deterministic_golden_pack.golden_pack_id",
      pack.golden_pack_id,
    ),
    artifact_type: DETERMINISTIC_GOLDEN_PACK_ARTIFACT_TYPE,
    contract_version: DETERMINISTIC_GOLDEN_PACK_CONTRACT_VERSION,
    golden_pack_hash: stableJsonHash(hashPayload),
    candidate_identity_hash: candidateIdentityHash,
    candidate_identity_contract: candidateIdentityContract,
    schema_bundle_hash: schemaBundleHash,
    config_bundle_hash: configBundleHash,
    canonical_serialization_policy: DETERMINISTIC_GOLDEN_PACK_CANONICAL_SERIALIZATION_POLICY,
    exact_decimal_policy: DETERMINISTIC_GOLDEN_PACK_EXACT_DECIMAL_POLICY,
    null_slot_policy: DETERMINISTIC_GOLDEN_PACK_NULL_SLOT_POLICY,
    replay_comparison_policy: DETERMINISTIC_GOLDEN_PACK_REPLAY_COMPARISON_POLICY,
    state_transition_policy: DETERMINISTIC_GOLDEN_PACK_STATE_TRANSITION_POLICY,
    cadence_policy: DETERMINISTIC_GOLDEN_PACK_CADENCE_POLICY,
    module_fixtures: hashPayload.module_fixtures,
    state_transition_fixtures: hashPayload.state_transition_fixtures,
    replay_fixtures: hashPayload.replay_fixtures,
    cadence_fixtures: hashPayload.cadence_fixtures,
  };
}

export function assertDeterministicGoldenPackHash(pack: DeterministicGoldenPack) {
  const normalized = normalizeDeterministicGoldenPack(pack);
  assertDeterministicGoldenPack(
    pack.golden_pack_hash === normalized.golden_pack_hash,
    "DETERMINISTIC_GOLDEN_PACK_HASH_INVALID",
    `golden_pack_hash must equal canonical hash; trace=${deterministicGoldenPackFailureTrace(
      pack,
    )}`,
  );
  return normalized;
}

export function deterministicGoldenPackRef(pack: DeterministicGoldenPack) {
  return normalizeDeterministicGoldenPack(pack).golden_pack_id;
}

export function cloneDeterministicGoldenPackRecord(pack: DeterministicGoldenPack) {
  return structuredClone(normalizeDeterministicGoldenPack(pack));
}
