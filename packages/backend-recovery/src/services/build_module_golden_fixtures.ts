import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import type { DeterministicGoldenPackModuleFixture } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import {
  DETERMINISTIC_GOLDEN_PACK_MODULE_FIXTURE_BINDING_POLICY,
  DETERMINISTIC_GOLDEN_PACK_ORDERING_POLICY,
  DeterministicGoldenPackModelError,
  assertDeterministicGoldenPack,
  normalizeDeterministicModuleFixture,
  requireGoldenPackTrimmedString,
} from "../models/deterministic_golden_pack.ts";

export type ModuleGoldenFixtureDecimalExpectationInput = {
  field_path: string;
  decimal_value: string;
};

export type ModuleGoldenFixtureOrderedArrayExpectationInput = {
  field_path: string;
  expected_values: readonly string[];
  ordering_policy?: typeof DETERMINISTIC_GOLDEN_PACK_ORDERING_POLICY;
};

export type BuildModuleGoldenFixtureInput = {
  fixture_id: string;
  module_code: string;
  artifact_family: string;
  scope_binding_hash: string;
  payload: unknown;
  expected_null_field_paths?: readonly string[];
  expected_decimal_fields: readonly ModuleGoldenFixtureDecimalExpectationInput[];
  expected_ordered_array_fields: readonly ModuleGoldenFixtureOrderedArrayExpectationInput[];
};

function childPath(parentPath: string, segment: string) {
  return parentPath.length === 0 ? segment : `${parentPath}.${segment}`;
}

function collectNullFieldPaths(value: unknown, path = ""): string[] {
  if (value === null) {
    return path.length === 0 ? ["$"] : [path];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => collectNullFieldPaths(entry, `${path}[${index}]`));
  }
  if (value !== null && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .flatMap((key) =>
        collectNullFieldPaths((value as Record<string, unknown>)[key], childPath(path, key)),
      );
  }
  return [];
}

function parseExpectedPath(path: string) {
  const parts: Array<string | number> = [];
  for (const segment of path.split(".")) {
    const head = segment.match(/^([^\[]+)/);
    if (head) {
      parts.push(head[1]!);
    }
    const indexMatches = segment.matchAll(/\[(\d+)\]/g);
    for (const match of indexMatches) {
      parts.push(Number(match[1]));
    }
  }
  return parts;
}

function valueAtExpectedPath(payload: unknown, path: string) {
  if (path === "$") {
    return payload;
  }
  return parseExpectedPath(path).reduce<unknown>((current, segment) => {
    if (current === null || typeof current !== "object") {
      return undefined;
    }
    return (current as Record<string, unknown>)[String(segment)];
  }, payload);
}

function normalizeExplicitNullPaths(payload: unknown, paths: readonly string[]) {
  const normalized = paths.map((path, index) =>
    requireGoldenPackTrimmedString(`expected_null_field_paths[${index}]`, path),
  );
  for (const path of normalized) {
    assertDeterministicGoldenPack(
      valueAtExpectedPath(payload, path) === null,
      "DETERMINISTIC_GOLDEN_PACK_NULL_SLOT_INVALID",
      `expected_null_field_paths entry ${path} must resolve to an explicit null in the module payload`,
    );
  }
  return normalized;
}

function assertDecimalExpectationsCapturePayload(
  payload: unknown,
  fields: readonly ModuleGoldenFixtureDecimalExpectationInput[],
) {
  for (const field of fields) {
    const actual = valueAtExpectedPath(payload, field.field_path);
    assertDeterministicGoldenPack(
      typeof actual === "string" && actual === field.decimal_value,
      "DETERMINISTIC_GOLDEN_PACK_DECIMAL_INVALID",
      `decimal expectation ${field.field_path} must capture the exact string value in the module payload`,
    );
  }
}

function assertOrderedArrayExpectationsCapturePayload(
  payload: unknown,
  fields: readonly ModuleGoldenFixtureOrderedArrayExpectationInput[],
) {
  for (const field of fields) {
    const actual = valueAtExpectedPath(payload, field.field_path);
    assertDeterministicGoldenPack(
      Array.isArray(actual) &&
        actual.length === field.expected_values.length &&
        actual.every((value, index) => value === field.expected_values[index]),
      "DETERMINISTIC_GOLDEN_PACK_ORDER_INVALID",
      `ordered-array expectation ${field.field_path} must capture the declared payload order exactly`,
    );
  }
}

export function buildModuleGoldenFixture(
  input: BuildModuleGoldenFixtureInput,
): DeterministicGoldenPackModuleFixture {
  const expectedNullFieldPaths =
    input.expected_null_field_paths === undefined
      ? collectNullFieldPaths(input.payload)
      : normalizeExplicitNullPaths(input.payload, input.expected_null_field_paths);
  assertDeterministicGoldenPack(
    expectedNullFieldPaths.length > 0,
    "DETERMINISTIC_GOLDEN_PACK_NULL_SLOT_INVALID",
    "module golden fixtures must retain at least one explicit null-slot path",
  );
  assertDecimalExpectationsCapturePayload(input.payload, input.expected_decimal_fields);
  assertOrderedArrayExpectationsCapturePayload(input.payload, input.expected_ordered_array_fields);
  const fixture: DeterministicGoldenPackModuleFixture = {
    fixture_id: input.fixture_id,
    module_code: input.module_code,
    artifact_family: input.artifact_family,
    scope_binding_hash: input.scope_binding_hash,
    canonical_payload_hash: stableJsonHash(input.payload),
    expected_null_field_paths: expectedNullFieldPaths,
    expected_decimal_fields: input.expected_decimal_fields.map((field) => ({
      field_path: field.field_path,
      decimal_value: field.decimal_value,
    })),
    expected_ordered_array_fields: input.expected_ordered_array_fields.map((field) => ({
      field_path: field.field_path,
      ordering_policy: field.ordering_policy ?? DETERMINISTIC_GOLDEN_PACK_ORDERING_POLICY,
      expected_values: [...field.expected_values],
    })),
    fixture_binding_policy: DETERMINISTIC_GOLDEN_PACK_MODULE_FIXTURE_BINDING_POLICY,
  };
  try {
    return normalizeDeterministicModuleFixture(fixture);
  } catch (error) {
    if (error instanceof DeterministicGoldenPackModelError) {
      throw error;
    }
    throw new DeterministicGoldenPackModelError(
      "DETERMINISTIC_GOLDEN_PACK_FIXTURE_INVALID",
      `module fixture ${input.fixture_id} could not be normalized`,
    );
  }
}

export function buildModuleGoldenFixtures(
  inputs: readonly BuildModuleGoldenFixtureInput[],
): DeterministicGoldenPackModuleFixture[] {
  return inputs
    .map((input) => buildModuleGoldenFixture(input))
    .sort((left, right) =>
      left.fixture_id < right.fixture_id ? -1 : left.fixture_id > right.fixture_id ? 1 : 0,
    );
}
