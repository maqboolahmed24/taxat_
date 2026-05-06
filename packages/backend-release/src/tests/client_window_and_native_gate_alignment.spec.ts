import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  assertClientCompatibilityMatrixRecord,
  assembleSchemaBundleCompatibilityGateContract,
  buildSchemaReaderWindowContract,
  ClientCompatibilityMatrixModelError,
  deriveCandidateIdentityContract,
  generateClientCompatibilityMatrix,
  type ReleaseCandidateIdentityContractRecord,
} from "../index.ts";

function candidate(input: {
  id?: string;
  supported_client_window_ref_or_null?: string | null;
} = {}) {
  const id = input.id ?? "alignment";
  const supportedClientWindowRef =
    typeof input.supported_client_window_ref_or_null === "undefined"
      ? `client-window://pc0225/${id}`
      : input.supported_client_window_ref_or_null;
  return deriveCandidateIdentityContract({
    artifact_digest: `sha256:${"6".repeat(64)}`,
    build_artifact_ref: `build://pc0225/${id}`,
    candidate_environment_ref: `candidate-env://pc0225/${id}`,
    config_bundle_hash: `config-bundle-hash.pc0225.${id}`,
    enabled_provider_profile_refs: ["provider.hmrc.it"],
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

test("fails closed when supported client window binding drifts from the candidate contract", async () => {
  const candidateIdentity = candidate();
  const matrix = await generateClientCompatibilityMatrix({
    browser_client_versions: ["2.2.0"],
    candidate_identity_contract: candidateIdentity,
    compatibility_matrix_id: "client-compatibility-matrix://pc0225/alignment",
    evaluated_at: "2026-05-05T18:20:00Z",
    schema_bundle_compatibility_gate_contract: compatibilityGate({
      candidate_identity_contract: candidateIdentity,
      native_client_window_state: "VERIFIED_COMPATIBLE",
    }),
  });

  expect(() =>
    assertClientCompatibilityMatrixRecord({
      ...matrix,
      supported_client_window_ref: "client-window://pc0225/stale",
    }),
  ).toThrow(ClientCompatibilityMatrixModelError);
});

test("does not fabricate a green matrix when the candidate has no supported client window", async () => {
  const candidateIdentity = candidate({
    id: "no-window",
    supported_client_window_ref_or_null: null,
  });

  await expect(
    generateClientCompatibilityMatrix({
      browser_client_versions: ["2.2.0"],
      candidate_identity_contract: candidateIdentity,
      compatibility_matrix_id: "client-compatibility-matrix://pc0225/no-window",
      evaluated_at: "2026-05-05T18:25:00Z",
      schema_bundle_compatibility_gate_contract:
        assembleSchemaBundleCompatibilityGateContract({
          candidate_identity_contract: candidateIdentity,
          schema_reader_window_contract: readerWindow(candidateIdentity),
        }),
    }),
  ).rejects.toThrow(/supported_client_window_ref_or_null/);
});

test("keeps green and red matrix state aligned with native client gate posture", async () => {
  const greenCandidate = candidate({ id: "blocked-green" });
  await expect(
    generateClientCompatibilityMatrix({
      browser_client_versions: ["2.2.0"],
      candidate_identity_contract: greenCandidate,
      compatibility_matrix_id: "client-compatibility-matrix://pc0225/blocked-green",
      evaluated_at: "2026-05-05T18:30:00Z",
      schema_bundle_compatibility_gate_contract: compatibilityGate({
        candidate_identity_contract: greenCandidate,
        native_client_window_state: "BLOCKED",
      }),
    }),
  ).rejects.toThrow(/VERIFIED_COMPATIBLE/);

  const redCandidate = candidate({ id: "red" });
  const redMatrix = await generateClientCompatibilityMatrix({
    browser_client_versions: ["2.2.0"],
    candidate_identity_contract: redCandidate,
    compatibility_matrix_id: "client-compatibility-matrix://pc0225/red",
    evaluated_at: "2026-05-05T18:35:00Z",
    incompatible_rows: [
      {
        client_version: "2.2.0",
        scenario: "CURRENT_CLIENT_TO_ROLLBACK_SAFE_SERVER",
        surface: "browser",
      },
    ],
    schema_bundle_compatibility_gate_contract: compatibilityGate({
      candidate_identity_contract: redCandidate,
      native_client_window_state: "BLOCKED",
    }),
  });

  expect(redMatrix.matrix_state).toBe("RED");
  expect(redMatrix.browser_rows.some((row) => row.outcome === "INCOMPATIBLE")).toBe(
    true,
  );
  await validateContractSchema("client_compatibility_matrix", redMatrix);

  expect(() =>
    assertClientCompatibilityMatrixRecord({
      ...redMatrix,
      browser_rows: redMatrix.browser_rows.map((row) => ({
        ...row,
        outcome: "COMPATIBLE",
      })),
    }),
  ).toThrow(/matrix_state must mirror/);
});
