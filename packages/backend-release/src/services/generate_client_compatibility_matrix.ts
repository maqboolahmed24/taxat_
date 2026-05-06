import {
  buildClientCompatibilityMatrix,
  type ClientCompatibilityMatrixRecord,
} from "../models/client_compatibility_matrix.ts";
import type { ClientCompatibilityMatrixRepository } from "../repositories/client_compatibility_matrix_repository.ts";
import type { ReleaseCandidateIdentityContractRecord } from "../models/release_candidate_identity_contract.ts";
import type { SchemaBundleCompatibilityGateContractRecord } from "../models/schema_bundle_compatibility_gate_contract.ts";
import {
  CLIENT_COMPATIBILITY_SCENARIOS,
  compareClientCompatibilityRows,
  type ClientCompatibilityMatrixRow,
  type ClientCompatibilityScenario,
} from "./derive_client_matrix_state.ts";
import {
  isPlainRecord,
  requireUtcInstant,
  requireVerificationSuiteString,
} from "./canonicalize_verification_suite_scope.ts";

export type ClientCompatibilitySurface = "browser" | "macos";

export type ClientCompatibilityMatrixIncompatibleRowInput = {
  surface: ClientCompatibilitySurface;
  client_version: string;
  scenario: ClientCompatibilityScenario;
  suite_result_ref?: string;
};

export type ClientCompatibilityMatrixSuiteResultRefInput = {
  surface: ClientCompatibilitySurface;
  client_version: string;
  scenario: ClientCompatibilityScenario;
  suite_result_ref: string;
};

export type GenerateClientCompatibilityMatrixInput = {
  compatibility_matrix_id: unknown;
  candidate_identity_contract: ReleaseCandidateIdentityContractRecord;
  schema_bundle_compatibility_gate_contract: SchemaBundleCompatibilityGateContractRecord;
  browser_client_versions?: unknown;
  macos_client_versions?: unknown;
  incompatible_rows?: unknown;
  suite_result_refs?: unknown;
  suite_result_ref_prefix?: unknown;
  evaluated_at: unknown;
  repository?: ClientCompatibilityMatrixRepository;
  persisted_at?: unknown;
};

export type ClientCompatibilityMatrixGenerationErrorCode =
  | "CLIENT_COMPATIBILITY_MATRIX_GENERATION_FIELD_INVALID"
  | "CLIENT_COMPATIBILITY_MATRIX_GENERATION_DUPLICATE"
  | "CLIENT_COMPATIBILITY_MATRIX_GENERATION_SCOPE_INVALID";

export class ClientCompatibilityMatrixGenerationError extends Error {
  readonly code: ClientCompatibilityMatrixGenerationErrorCode;

  constructor(
    code: ClientCompatibilityMatrixGenerationErrorCode,
    detail: string,
  ) {
    super(`${code}: ${detail}`);
    this.name = "ClientCompatibilityMatrixGenerationError";
    this.code = code;
  }
}

function assertGeneration(
  condition: unknown,
  code: ClientCompatibilityMatrixGenerationErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new ClientCompatibilityMatrixGenerationError(code, detail);
  }
}

function requireSurface(label: string, value: unknown): ClientCompatibilitySurface {
  assertGeneration(
    value === "browser" || value === "macos",
    "CLIENT_COMPATIBILITY_MATRIX_GENERATION_FIELD_INVALID",
    `${label} must be browser or macos`,
  );
  return value;
}

function requireScenario(
  label: string,
  value: unknown,
): ClientCompatibilityScenario {
  assertGeneration(
    typeof value === "string" &&
      CLIENT_COMPATIBILITY_SCENARIOS.includes(
        value as ClientCompatibilityScenario,
      ),
    "CLIENT_COMPATIBILITY_MATRIX_GENERATION_FIELD_INVALID",
    `${label} must be one of the required compatibility scenarios`,
  );
  return value as ClientCompatibilityScenario;
}

function normalizeClientVersionList(label: string, values: unknown) {
  const input = typeof values === "undefined" ? [] : values;
  assertGeneration(
    Array.isArray(input),
    "CLIENT_COMPATIBILITY_MATRIX_GENERATION_FIELD_INVALID",
    `${label} must be an array`,
  );
  const versions = input.map((value, index) =>
    requireVerificationSuiteString(`${label}[${index}]`, value),
  );
  const unique = new Set(versions);
  assertGeneration(
    unique.size === versions.length,
    "CLIENT_COMPATIBILITY_MATRIX_GENERATION_DUPLICATE",
    `${label} must not contain duplicate client versions`,
  );
  return [...unique].sort();
}

function rowKey(input: {
  surface: ClientCompatibilitySurface;
  client_version: string;
  scenario: ClientCompatibilityScenario;
}) {
  return `${input.surface}\u241f${input.client_version}\u241f${input.scenario}`;
}

function normalizeIncompatibleRows(values: unknown) {
  const input = typeof values === "undefined" ? [] : values;
  assertGeneration(
    Array.isArray(input),
    "CLIENT_COMPATIBILITY_MATRIX_GENERATION_FIELD_INVALID",
    "incompatible_rows must be an array",
  );
  const seen = new Set<string>();
  return input.map((value, index): ClientCompatibilityMatrixIncompatibleRowInput => {
    assertGeneration(
      isPlainRecord(value),
      "CLIENT_COMPATIBILITY_MATRIX_GENERATION_FIELD_INVALID",
      `incompatible_rows[${index}] must be an object`,
    );
    const row = {
      surface: requireSurface(
        `incompatible_rows[${index}].surface`,
        value.surface,
      ),
      client_version: requireVerificationSuiteString(
        `incompatible_rows[${index}].client_version`,
        value.client_version,
      ),
      scenario: requireScenario(
        `incompatible_rows[${index}].scenario`,
        value.scenario,
      ),
    };
    const rowWithOptionalRef =
      typeof value.suite_result_ref === "undefined"
        ? row
        : {
            ...row,
            suite_result_ref: requireVerificationSuiteString(
              `incompatible_rows[${index}].suite_result_ref`,
              value.suite_result_ref,
            ),
          };
    const key = rowKey(rowWithOptionalRef);
    assertGeneration(
      !seen.has(key),
      "CLIENT_COMPATIBILITY_MATRIX_GENERATION_DUPLICATE",
      `incompatible_rows contains duplicate row ${key}`,
    );
    seen.add(key);
    return rowWithOptionalRef;
  });
}

function normalizeSuiteResultRefs(values: unknown) {
  const input = typeof values === "undefined" ? [] : values;
  assertGeneration(
    Array.isArray(input),
    "CLIENT_COMPATIBILITY_MATRIX_GENERATION_FIELD_INVALID",
    "suite_result_refs must be an array",
  );
  const refs = new Map<string, string>();
  for (const [index, value] of input.entries()) {
    assertGeneration(
      isPlainRecord(value),
      "CLIENT_COMPATIBILITY_MATRIX_GENERATION_FIELD_INVALID",
      `suite_result_refs[${index}] must be an object`,
    );
    const ref = {
      surface: requireSurface(`suite_result_refs[${index}].surface`, value.surface),
      client_version: requireVerificationSuiteString(
        `suite_result_refs[${index}].client_version`,
        value.client_version,
      ),
      scenario: requireScenario(
        `suite_result_refs[${index}].scenario`,
        value.scenario,
      ),
      suite_result_ref: requireVerificationSuiteString(
        `suite_result_refs[${index}].suite_result_ref`,
        value.suite_result_ref,
      ),
    };
    const key = rowKey(ref);
    assertGeneration(
      !refs.has(key),
      "CLIENT_COMPATIBILITY_MATRIX_GENERATION_DUPLICATE",
      `suite_result_refs contains duplicate row ${key}`,
    );
    refs.set(key, ref.suite_result_ref);
  }
  return refs;
}

function assertIncompatibleRowsTargetGeneratedVersions(input: {
  incompatible_rows: ClientCompatibilityMatrixIncompatibleRowInput[];
  browser_client_versions: string[];
  macos_client_versions: string[];
}) {
  const browserVersions = new Set(input.browser_client_versions);
  const macosVersions = new Set(input.macos_client_versions);
  for (const row of input.incompatible_rows) {
    const versionSet = row.surface === "browser" ? browserVersions : macosVersions;
    assertGeneration(
      versionSet.has(row.client_version),
      "CLIENT_COMPATIBILITY_MATRIX_GENERATION_SCOPE_INVALID",
      `incompatible row ${rowKey(row)} must target a generated client version`,
    );
  }
}

function suiteResultRef(input: {
  compatibility_matrix_id: string;
  surface: ClientCompatibilitySurface;
  client_version: string;
  scenario: ClientCompatibilityScenario;
  suite_result_refs: ReadonlyMap<string, string>;
  suite_result_ref_prefix: string | null;
  incompatible_rows: readonly ClientCompatibilityMatrixIncompatibleRowInput[];
}) {
  const key = rowKey(input);
  const explicitRef = input.suite_result_refs.get(key);
  if (explicitRef) {
    return explicitRef;
  }
  const incompatibleRef = input.incompatible_rows.find(
    (row) => rowKey(row) === key,
  )?.suite_result_ref;
  if (incompatibleRef) {
    return incompatibleRef;
  }
  const prefix =
    input.suite_result_ref_prefix ??
    `client-compatibility-suite-result://${input.compatibility_matrix_id}`;
  return `${prefix}/${input.surface}/${input.client_version}/${input.scenario}`;
}

function rowsForSurface(input: {
  compatibility_matrix_id: string;
  surface: ClientCompatibilitySurface;
  client_versions: string[];
  incompatible_rows: readonly ClientCompatibilityMatrixIncompatibleRowInput[];
  suite_result_refs: ReadonlyMap<string, string>;
  suite_result_ref_prefix: string | null;
}) {
  const incompatibleKeys = new Set(input.incompatible_rows.map(rowKey));
  const rows: ClientCompatibilityMatrixRow[] = [];
  for (const clientVersion of input.client_versions) {
    for (const scenario of CLIENT_COMPATIBILITY_SCENARIOS) {
      const key = rowKey({
        surface: input.surface,
        client_version: clientVersion,
        scenario,
      });
      rows.push({
        client_version: clientVersion,
        scenario,
        outcome: incompatibleKeys.has(key) ? "INCOMPATIBLE" : "COMPATIBLE",
        suite_result_ref: suiteResultRef({
          compatibility_matrix_id: input.compatibility_matrix_id,
          surface: input.surface,
          client_version: clientVersion,
          scenario,
          suite_result_refs: input.suite_result_refs,
          suite_result_ref_prefix: input.suite_result_ref_prefix,
          incompatible_rows: input.incompatible_rows,
        }),
      });
    }
  }
  return rows.sort(compareClientCompatibilityRows);
}

export async function generateClientCompatibilityMatrix(
  input: GenerateClientCompatibilityMatrixInput,
): Promise<ClientCompatibilityMatrixRecord> {
  const compatibilityMatrixId = requireVerificationSuiteString(
    "client_compatibility_matrix.compatibility_matrix_id",
    input.compatibility_matrix_id,
  );
  const browserClientVersions = normalizeClientVersionList(
    "browser_client_versions",
    input.browser_client_versions,
  );
  const macosClientVersions = normalizeClientVersionList(
    "macos_client_versions",
    input.macos_client_versions,
  );
  assertGeneration(
    browserClientVersions.length > 0 || macosClientVersions.length > 0,
    "CLIENT_COMPATIBILITY_MATRIX_GENERATION_SCOPE_INVALID",
    "client compatibility matrix generation requires at least one browser or macos client version",
  );
  const incompatibleRows = normalizeIncompatibleRows(input.incompatible_rows);
  const suiteResultRefs = normalizeSuiteResultRefs(input.suite_result_refs);
  assertIncompatibleRowsTargetGeneratedVersions({
    incompatible_rows: incompatibleRows,
    browser_client_versions: browserClientVersions,
    macos_client_versions: macosClientVersions,
  });
  const suiteResultRefPrefix =
    typeof input.suite_result_ref_prefix === "undefined" ||
    input.suite_result_ref_prefix === null
      ? null
      : requireVerificationSuiteString(
          "suite_result_ref_prefix",
          input.suite_result_ref_prefix,
        );
  const matrix = buildClientCompatibilityMatrix({
    compatibility_matrix_id: compatibilityMatrixId,
    candidate_identity_contract: input.candidate_identity_contract,
    schema_bundle_compatibility_gate_contract:
      input.schema_bundle_compatibility_gate_contract,
    browser_rows: rowsForSurface({
      compatibility_matrix_id: compatibilityMatrixId,
      surface: "browser",
      client_versions: browserClientVersions,
      incompatible_rows: incompatibleRows,
      suite_result_refs: suiteResultRefs,
      suite_result_ref_prefix: suiteResultRefPrefix,
    }),
    macos_rows: rowsForSurface({
      compatibility_matrix_id: compatibilityMatrixId,
      surface: "macos",
      client_versions: macosClientVersions,
      incompatible_rows: incompatibleRows,
      suite_result_refs: suiteResultRefs,
      suite_result_ref_prefix: suiteResultRefPrefix,
    }),
    evaluated_at: requireUtcInstant(
      "client_compatibility_matrix.evaluated_at",
      input.evaluated_at,
    ),
  });
  if (!input.repository) {
    return matrix;
  }
  const stored = await input.repository.persistClientCompatibilityMatrix({
    client_compatibility_matrix: matrix,
    persisted_at:
      typeof input.persisted_at === "undefined"
        ? matrix.evaluated_at
        : requireUtcInstant("persisted_at", input.persisted_at),
  });
  return stored.client_compatibility_matrix;
}
