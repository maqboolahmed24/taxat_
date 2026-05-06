import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  assertClientCompatibilityMatrixRecord,
  assembleSchemaBundleCompatibilityGateContract,
  buildSchemaReaderWindowContract,
  ClientCompatibilityMatrixModelError,
  ClientCompatibilityMatrixRepository,
  ClientCompatibilityMatrixRepositoryError,
  deriveCandidateIdentityContract,
  generateClientCompatibilityMatrix,
  type ReleaseCandidateIdentityContractRecord,
} from "../index.ts";

function candidate(input: {
  id?: string;
  supported_client_window_ref_or_null?: string | null;
} = {}) {
  const id = input.id ?? "green";
  const supportedClientWindowRef =
    typeof input.supported_client_window_ref_or_null === "undefined"
      ? `client-window://pc0225/${id}`
      : input.supported_client_window_ref_or_null;
  return deriveCandidateIdentityContract({
    artifact_digest: `sha256:${"5".repeat(64)}`,
    build_artifact_ref: `build://pc0225/${id}`,
    candidate_environment_ref: `candidate-env://pc0225/${id}`,
    config_bundle_hash: `config-bundle-hash.pc0225.${id}`,
    enabled_provider_profile_refs: ["provider.hmrc.it", "provider.hmrc.vat"],
    migration_plan_ref_or_null: null,
    schema_bundle_hash: `schema-bundle-hash.pc0225.${id}`,
    supported_client_window_ref_or_null: supportedClientWindowRef,
  });
}

function readerWindow(candidateIdentity: ReleaseCandidateIdentityContractRecord) {
  return buildSchemaReaderWindowContract({
    compatibility_window_ref: `compat-window://pc0225/${candidateIdentity.build_artifact_ref}`,
    protected_historical_schema_bundle_hashes: [],
    supported_reader_schema_bundle_hashes: [candidateIdentity.schema_bundle_hash],
    window_state: "VERIFIED_PREVIOUS_READERS_SUPPORTED",
    writer_schema_bundle_hash: candidateIdentity.schema_bundle_hash,
  });
}

function compatibilityGate(input: {
  candidate_identity_contract: ReleaseCandidateIdentityContractRecord;
  native_client_window_state?: "VERIFIED_COMPATIBLE" | "BLOCKED";
}) {
  return assembleSchemaBundleCompatibilityGateContract({
    candidate_identity_contract: input.candidate_identity_contract,
    reason_codes:
      input.native_client_window_state === "BLOCKED"
        ? ["NATIVE_CLIENT_WINDOW_BLOCKED"]
        : [],
    schema_reader_window_contract: readerWindow(input.candidate_identity_contract),
    ...(typeof input.native_client_window_state === "undefined"
      ? {}
      : { native_client_window_state: input.native_client_window_state }),
  });
}

async function greenMatrix() {
  const candidateIdentity = candidate();
  return generateClientCompatibilityMatrix({
    browser_client_versions: ["2.3.0", "2.2.0"],
    candidate_identity_contract: candidateIdentity,
    compatibility_matrix_id: "client-compatibility-matrix://pc0225/green",
    evaluated_at: "2026-05-05T18:00:00Z",
    macos_client_versions: ["14.4.0"],
    schema_bundle_compatibility_gate_contract: compatibilityGate({
      candidate_identity_contract: candidateIdentity,
      native_client_window_state: "VERIFIED_COMPATIBLE",
    }),
    suite_result_ref_prefix: "verification-suite-result://pc0225/client",
  });
}

test("generates schema-valid client compatibility matrix rows in canonical order", async () => {
  const matrix = await greenMatrix();

  expect(matrix.supported_client_window_ref).toBe("client-window://pc0225/green");
  expect(matrix.matrix_state).toBe("GREEN");
  expect(matrix.browser_rows.map((row) => [row.client_version, row.scenario])).toEqual([
    ["2.2.0", "OLDEST_SUPPORTED_TO_CURRENT_SERVER"],
    ["2.2.0", "CURRENT_CLIENT_TO_ROLLBACK_SAFE_SERVER"],
    ["2.3.0", "OLDEST_SUPPORTED_TO_CURRENT_SERVER"],
    ["2.3.0", "CURRENT_CLIENT_TO_ROLLBACK_SAFE_SERVER"],
  ]);
  expect(matrix.macos_rows.map((row) => [row.client_version, row.scenario])).toEqual([
    ["14.4.0", "OLDEST_SUPPORTED_TO_CURRENT_SERVER"],
    ["14.4.0", "CURRENT_CLIENT_TO_ROLLBACK_SAFE_SERVER"],
  ]);
  expect(matrix.browser_rows.every((row) => row.outcome === "COMPATIBLE")).toBe(
    true,
  );
  await validateContractSchema("client_compatibility_matrix", matrix);
});

test("rejects non-canonical row ordering, duplicate rows, and missing scenarios", async () => {
  const matrix = await greenMatrix();

  expect(() =>
    assertClientCompatibilityMatrixRecord({
      ...matrix,
      browser_rows: [
        matrix.browser_rows[1],
        matrix.browser_rows[0],
        ...matrix.browser_rows.slice(2),
      ],
    }),
  ).toThrow(/canonical row order/);

  expect(() =>
    assertClientCompatibilityMatrixRecord({
      ...matrix,
      browser_rows: [
        matrix.browser_rows[0],
        matrix.browser_rows[0],
        ...matrix.browser_rows.slice(1),
      ],
    }),
  ).toThrow(ClientCompatibilityMatrixModelError);

  expect(() =>
    assertClientCompatibilityMatrixRecord({
      ...matrix,
      browser_rows: matrix.browser_rows.filter(
        (row) =>
          !(
            row.client_version === "2.2.0" &&
            row.scenario === "CURRENT_CLIENT_TO_ROLLBACK_SAFE_SERVER"
          ),
      ),
    }),
  ).toThrow(/must cover both compatibility scenarios/);
});

test("repository persists immutable first-class client compatibility evidence", async () => {
  const repository = new ClientCompatibilityMatrixRepository({
    validate_contract_schema: validateContractSchema,
  });
  const matrix = await greenMatrix();
  const persisted = await repository.persistClientCompatibilityMatrix({
    client_compatibility_matrix: matrix,
    persisted_at: "2026-05-05T18:05:00Z",
  });
  const idempotent = await repository.persistClientCompatibilityMatrix({
    client_compatibility_matrix: matrix,
    persisted_at: "2026-05-05T18:10:00Z",
  });

  expect(idempotent.persisted_at).toBe("2026-05-05T18:05:00Z");
  expect(persisted.compatibility_gate_hash).toBe(
    matrix.schema_bundle_compatibility_gate_contract.compatibility_gate_hash,
  );
  await expect(
    repository.listClientCompatibilityMatrices({
      matrix_state: "GREEN",
      supported_client_window_ref: matrix.supported_client_window_ref,
    }),
  ).resolves.toHaveLength(1);
  await expect(
    repository.persistClientCompatibilityMatrix({
      client_compatibility_matrix: {
        ...matrix,
        evaluated_at: "2026-05-05T18:15:00Z",
      },
      persisted_at: "2026-05-05T18:15:00Z",
    }),
  ).rejects.toThrow(ClientCompatibilityMatrixRepositoryError);
});
