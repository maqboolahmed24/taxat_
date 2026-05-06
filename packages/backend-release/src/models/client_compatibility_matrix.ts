import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  assertReleaseCandidateIdentityContract,
  cloneReleaseCandidateIdentityContract,
  type ReleaseCandidateIdentityContractRecord,
} from "./release_candidate_identity_contract.ts";
import {
  assertSchemaBundleCompatibilityGateContract,
  cloneSchemaBundleCompatibilityGateContract,
  type SchemaBundleCompatibilityGateContractRecord,
} from "./schema_bundle_compatibility_gate_contract.ts";
import {
  CLIENT_COMPATIBILITY_SCENARIOS,
  compareClientCompatibilityRows,
  deriveClientMatrixState,
  type ClientCompatibilityMatrixRow,
  type ClientCompatibilityOutcome,
  type ClientCompatibilityScenario,
  type ClientMatrixState,
} from "../services/derive_client_matrix_state.ts";
import {
  isPlainRecord,
  requireUtcInstant,
  requireVerificationSuiteString,
} from "../services/canonicalize_verification_suite_scope.ts";

export type ClientCompatibilityMatrixRecord = {
  compatibility_matrix_id: string;
  candidate_environment_ref: string;
  build_artifact_ref: string;
  candidate_identity_hash: string;
  candidate_identity_contract: ReleaseCandidateIdentityContractRecord;
  schema_bundle_compatibility_gate_contract: SchemaBundleCompatibilityGateContractRecord;
  supported_client_window_ref: string;
  browser_rows: ClientCompatibilityMatrixRow[];
  macos_rows: ClientCompatibilityMatrixRow[];
  matrix_state: ClientMatrixState;
  evaluated_at: string;
};

export const CLIENT_COMPATIBILITY_MATRIX_SCHEMA_ID =
  "https://taxat.dev/schemas/client_compatibility_matrix.schema.json";

export type ClientCompatibilityMatrixModelErrorCode =
  | "CLIENT_COMPATIBILITY_MATRIX_FIELD_INVALID"
  | "CLIENT_COMPATIBILITY_MATRIX_CANDIDATE_DRIFT"
  | "CLIENT_COMPATIBILITY_MATRIX_GATE_DRIFT"
  | "CLIENT_COMPATIBILITY_MATRIX_ROW_DUPLICATE"
  | "CLIENT_COMPATIBILITY_MATRIX_ROW_COVERAGE_INVALID"
  | "CLIENT_COMPATIBILITY_MATRIX_ROW_ORDER_INVALID"
  | "CLIENT_COMPATIBILITY_MATRIX_STATE_INVALID";

export class ClientCompatibilityMatrixModelError extends Error {
  readonly code: ClientCompatibilityMatrixModelErrorCode;

  constructor(code: ClientCompatibilityMatrixModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ClientCompatibilityMatrixModelError";
    this.code = code;
  }
}

function assertClientMatrix(
  condition: unknown,
  code: ClientCompatibilityMatrixModelErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new ClientCompatibilityMatrixModelError(code, detail);
  }
}

function modelErrorDetail(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function requireMatrixState(value: unknown): ClientMatrixState {
  assertClientMatrix(
    value === "GREEN" || value === "RED",
    "CLIENT_COMPATIBILITY_MATRIX_FIELD_INVALID",
    "matrix_state must be GREEN or RED",
  );
  return value;
}

function requireMatrixScenario(
  label: string,
  value: unknown,
): ClientCompatibilityScenario {
  assertClientMatrix(
    typeof value === "string" &&
      CLIENT_COMPATIBILITY_SCENARIOS.includes(
        value as ClientCompatibilityScenario,
      ),
    "CLIENT_COMPATIBILITY_MATRIX_FIELD_INVALID",
    `${label} must be one of the required compatibility scenarios`,
  );
  return value as ClientCompatibilityScenario;
}

function requireMatrixOutcome(
  label: string,
  value: unknown,
): ClientCompatibilityOutcome {
  assertClientMatrix(
    value === "COMPATIBLE" || value === "INCOMPATIBLE",
    "CLIENT_COMPATIBILITY_MATRIX_FIELD_INVALID",
    `${label} must be COMPATIBLE or INCOMPATIBLE`,
  );
  return value;
}

function assertMatrixCandidateIdentityContract(
  value: unknown,
  expected: {
    candidate_identity_hash: string;
    candidate_environment_ref: string;
    build_artifact_ref: string;
    supported_client_window_ref: string;
  },
) {
  try {
    return assertReleaseCandidateIdentityContract(value, {
      build_artifact_ref: expected.build_artifact_ref,
      candidate_environment_ref: expected.candidate_environment_ref,
      candidate_identity_hash: expected.candidate_identity_hash,
      supported_client_window_ref_or_null: expected.supported_client_window_ref,
    });
  } catch (error) {
    throw new ClientCompatibilityMatrixModelError(
      "CLIENT_COMPATIBILITY_MATRIX_CANDIDATE_DRIFT",
      `candidate_identity_contract must mirror the compatibility matrix binding: ${modelErrorDetail(error)}`,
    );
  }
}

function assertMatrixCompatibilityGateContract(
  value: unknown,
  expected: {
    candidate_identity_hash: string;
    candidate_environment_ref: string;
    build_artifact_ref: string;
    supported_client_window_ref: string;
  },
) {
  let gate: SchemaBundleCompatibilityGateContractRecord;
  try {
    gate = assertSchemaBundleCompatibilityGateContract(value);
  } catch (error) {
    throw new ClientCompatibilityMatrixModelError(
      "CLIENT_COMPATIBILITY_MATRIX_GATE_DRIFT",
      `schema_bundle_compatibility_gate_contract must be a valid compatibility gate: ${modelErrorDetail(error)}`,
    );
  }
  assertClientMatrix(
    gate.candidate_identity_hash === expected.candidate_identity_hash &&
      gate.candidate_identity_contract.candidate_environment_ref ===
        expected.candidate_environment_ref &&
      gate.candidate_identity_contract.build_artifact_ref ===
        expected.build_artifact_ref,
    "CLIENT_COMPATIBILITY_MATRIX_GATE_DRIFT",
    "schema_bundle_compatibility_gate_contract must bind the exact release candidate",
  );
  assertClientMatrix(
    gate.supported_client_window_ref_or_null ===
      expected.supported_client_window_ref &&
      gate.candidate_identity_contract.supported_client_window_ref_or_null ===
        expected.supported_client_window_ref,
    "CLIENT_COMPATIBILITY_MATRIX_GATE_DRIFT",
    "schema_bundle_compatibility_gate_contract must bind the exact supported client window",
  );
  return gate;
}

function normalizeMatrixRows(
  label: "browser_rows" | "macos_rows",
  value: unknown,
) {
  assertClientMatrix(
    Array.isArray(value),
    "CLIENT_COMPATIBILITY_MATRIX_FIELD_INVALID",
    `${label} must be an array`,
  );
  const rows = value.map((row, index): ClientCompatibilityMatrixRow => {
    assertClientMatrix(
      isPlainRecord(row),
      "CLIENT_COMPATIBILITY_MATRIX_FIELD_INVALID",
      `${label}[${index}] must be an object`,
    );
    return {
      client_version: requireVerificationSuiteString(
        `${label}[${index}].client_version`,
        row.client_version,
      ),
      scenario: requireMatrixScenario(
        `${label}[${index}].scenario`,
        row.scenario,
      ),
      outcome: requireMatrixOutcome(`${label}[${index}].outcome`, row.outcome),
      suite_result_ref: requireVerificationSuiteString(
        `${label}[${index}].suite_result_ref`,
        row.suite_result_ref,
      ),
    };
  });
  const canonical = [...rows].sort(compareClientCompatibilityRows);
  assertClientMatrix(
    rows.every((row, index) => row === canonical[index]),
    "CLIENT_COMPATIBILITY_MATRIX_ROW_ORDER_INVALID",
    `${label} must use canonical row order by client_version and scenario`,
  );

  const scenariosByClientVersion = new Map<string, Set<ClientCompatibilityScenario>>();
  for (const row of rows) {
    const key = `${row.client_version}\u241f${row.scenario}`;
    assertClientMatrix(
      !scenariosByClientVersion.get(row.client_version)?.has(row.scenario),
      "CLIENT_COMPATIBILITY_MATRIX_ROW_DUPLICATE",
      `${label} contains duplicate client/scenario row ${key}`,
    );
    const scenarios =
      scenariosByClientVersion.get(row.client_version) ??
      new Set<ClientCompatibilityScenario>();
    scenarios.add(row.scenario);
    scenariosByClientVersion.set(row.client_version, scenarios);
  }
  for (const [clientVersion, scenarios] of scenariosByClientVersion) {
    const missingScenarios = CLIENT_COMPATIBILITY_SCENARIOS.filter(
      (scenario) => !scenarios.has(scenario),
    );
    assertClientMatrix(
      missingScenarios.length === 0,
      "CLIENT_COMPATIBILITY_MATRIX_ROW_COVERAGE_INVALID",
      `${label} client_version=${clientVersion} must cover both compatibility scenarios`,
    );
  }
  return rows;
}

export function normalizeClientCompatibilityMatrix(
  input: unknown,
): ClientCompatibilityMatrixRecord {
  assertClientMatrix(
    isPlainRecord(input),
    "CLIENT_COMPATIBILITY_MATRIX_FIELD_INVALID",
    "client_compatibility_matrix must be an object",
  );
  const compatibilityMatrixId = requireVerificationSuiteString(
    "client_compatibility_matrix.compatibility_matrix_id",
    input.compatibility_matrix_id,
  );
  const candidateEnvironmentRef = requireVerificationSuiteString(
    "client_compatibility_matrix.candidate_environment_ref",
    input.candidate_environment_ref,
  );
  const buildArtifactRef = requireVerificationSuiteString(
    "client_compatibility_matrix.build_artifact_ref",
    input.build_artifact_ref,
  );
  const candidateIdentityHash = requireVerificationSuiteString(
    "client_compatibility_matrix.candidate_identity_hash",
    input.candidate_identity_hash,
  );
  const supportedClientWindowRef = requireVerificationSuiteString(
    "client_compatibility_matrix.supported_client_window_ref",
    input.supported_client_window_ref,
  );
  const candidateIdentityContract = assertMatrixCandidateIdentityContract(
    input.candidate_identity_contract,
    {
      build_artifact_ref: buildArtifactRef,
      candidate_environment_ref: candidateEnvironmentRef,
      candidate_identity_hash: candidateIdentityHash,
      supported_client_window_ref: supportedClientWindowRef,
    },
  );
  assertClientMatrix(
    candidateIdentityContract.supported_client_window_ref_or_null !== null,
    "CLIENT_COMPATIBILITY_MATRIX_CANDIDATE_DRIFT",
    "candidate_identity_contract must retain supported_client_window_ref_or_null before matrix generation",
  );
  const schemaBundleCompatibilityGateContract =
    assertMatrixCompatibilityGateContract(
      input.schema_bundle_compatibility_gate_contract,
      {
        build_artifact_ref: buildArtifactRef,
        candidate_environment_ref: candidateEnvironmentRef,
        candidate_identity_hash: candidateIdentityHash,
        supported_client_window_ref: supportedClientWindowRef,
      },
    );
  const browserRows = normalizeMatrixRows("browser_rows", input.browser_rows);
  const macosRows = normalizeMatrixRows("macos_rows", input.macos_rows);
  assertClientMatrix(
    browserRows.length > 0 || macosRows.length > 0,
    "CLIENT_COMPATIBILITY_MATRIX_ROW_COVERAGE_INVALID",
    "client_compatibility_matrix must contain browser_rows or macos_rows",
  );
  const matrixState = requireMatrixState(input.matrix_state);
  let expectedMatrixState: ClientMatrixState;
  try {
    expectedMatrixState = deriveClientMatrixState({
      browser_rows: browserRows,
      macos_rows: macosRows,
      native_client_window_state:
        schemaBundleCompatibilityGateContract.native_client_window_state,
    });
  } catch (error) {
    throw new ClientCompatibilityMatrixModelError(
      "CLIENT_COMPATIBILITY_MATRIX_STATE_INVALID",
      `matrix_state must mirror row outcomes and native client gate posture: ${modelErrorDetail(error)}`,
    );
  }
  assertClientMatrix(
    matrixState === expectedMatrixState,
    "CLIENT_COMPATIBILITY_MATRIX_STATE_INVALID",
    `matrix_state must be ${expectedMatrixState} for row outcomes and native client gate posture`,
  );

  return {
    compatibility_matrix_id: compatibilityMatrixId,
    candidate_environment_ref: candidateIdentityContract.candidate_environment_ref,
    build_artifact_ref: candidateIdentityContract.build_artifact_ref,
    candidate_identity_hash: candidateIdentityHash,
    candidate_identity_contract: cloneReleaseCandidateIdentityContract(
      candidateIdentityContract,
    ),
    schema_bundle_compatibility_gate_contract:
      cloneSchemaBundleCompatibilityGateContract(
        schemaBundleCompatibilityGateContract,
      ),
    supported_client_window_ref: supportedClientWindowRef,
    browser_rows: browserRows,
    macos_rows: macosRows,
    matrix_state: matrixState,
    evaluated_at: requireUtcInstant(
      "client_compatibility_matrix.evaluated_at",
      input.evaluated_at,
    ),
  };
}

export type BuildClientCompatibilityMatrixInput = {
  compatibility_matrix_id: unknown;
  candidate_identity_contract: ReleaseCandidateIdentityContractRecord;
  schema_bundle_compatibility_gate_contract: SchemaBundleCompatibilityGateContractRecord;
  browser_rows?: unknown;
  macos_rows?: unknown;
  matrix_state?: unknown;
  evaluated_at: unknown;
};

export function buildClientCompatibilityMatrix(
  input: BuildClientCompatibilityMatrixInput,
): ClientCompatibilityMatrixRecord {
  const candidate = assertReleaseCandidateIdentityContract(
    input.candidate_identity_contract,
  );
  assertClientMatrix(
    candidate.supported_client_window_ref_or_null !== null,
    "CLIENT_COMPATIBILITY_MATRIX_CANDIDATE_DRIFT",
    "candidate_identity_contract.supported_client_window_ref_or_null is required for client compatibility matrix generation",
  );
  const gate = assertSchemaBundleCompatibilityGateContract(
    input.schema_bundle_compatibility_gate_contract,
  );
  const browserRows = Array.isArray(input.browser_rows)
    ? (input.browser_rows as ClientCompatibilityMatrixRow[])
    : [];
  const macosRows = Array.isArray(input.macos_rows)
    ? (input.macos_rows as ClientCompatibilityMatrixRow[])
    : [];
  const derivedMatrixState = deriveClientMatrixState({
    browser_rows: browserRows,
    macos_rows: macosRows,
    native_client_window_state: gate.native_client_window_state,
  });
  return normalizeClientCompatibilityMatrix({
    compatibility_matrix_id: input.compatibility_matrix_id,
    candidate_environment_ref: candidate.candidate_environment_ref,
    build_artifact_ref: candidate.build_artifact_ref,
    candidate_identity_hash: candidate.candidate_identity_hash,
    candidate_identity_contract: candidate,
    schema_bundle_compatibility_gate_contract: gate,
    supported_client_window_ref: candidate.supported_client_window_ref_or_null,
    browser_rows: browserRows,
    macos_rows: macosRows,
    matrix_state: input.matrix_state ?? derivedMatrixState,
    evaluated_at: normalizeUtcInstantString(input.evaluated_at),
  });
}

export function assertClientCompatibilityMatrixRecord(input: unknown) {
  return normalizeClientCompatibilityMatrix(input);
}

export function cloneClientCompatibilityMatrixRecord(
  record: ClientCompatibilityMatrixRecord,
) {
  return structuredClone(normalizeClientCompatibilityMatrix(record));
}

export function clientCompatibilityMatrixRef(
  record: Pick<ClientCompatibilityMatrixRecord, "compatibility_matrix_id">,
) {
  return record.compatibility_matrix_id;
}
