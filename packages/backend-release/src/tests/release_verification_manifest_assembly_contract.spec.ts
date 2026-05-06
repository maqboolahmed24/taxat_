import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  assertReleaseVerificationManifestAssemblyContract,
  assembleReleaseVerificationManifestAssemblyContract,
  assembleSchemaBundleCompatibilityGateContract,
  buildSchemaReaderWindowContract,
  deriveCandidateIdentityContract,
  deriveReleaseGateBindings,
  deriveReleaseVerificationManifestAssemblyContractHash,
  RELEASE_VERIFICATION_MANIFEST_GATE_ORDER,
  ReleaseVerificationManifestAssemblyRepository,
  type ReleaseGateBindingEvidenceInput,
  type ReleaseVerificationGateName,
  type ReleaseVerificationGateStatus,
} from "../index.ts";

const candidateIdentity = deriveCandidateIdentityContract({
  artifact_digest:
    "sha256:pc0222c8a907775aeb31c49363ee96508f756d6273c42eda8a99694c7cf6cef62cd1d",
  build_artifact_ref: "build://pc0222/manifest-assembly",
  candidate_environment_ref: "candidate-env://pc0222/preproduction",
  config_bundle_hash: "config-bundle-hash.pc0222.manifest",
  enabled_provider_profile_refs: ["provider.hmrc.it", "provider.hmrc.vat"],
  migration_plan_ref_or_null: null,
  schema_bundle_hash: "schema-bundle-hash.pc0222.manifest",
  supported_client_window_ref_or_null: "client-window://operator/pc0222/manifest",
});

const readerWindow = buildSchemaReaderWindowContract({
  compatibility_window_ref: "compat-window://pc0222/manifest",
  writer_schema_bundle_hash: candidateIdentity.schema_bundle_hash,
  supported_reader_schema_bundle_hashes: [
    candidateIdentity.schema_bundle_hash,
    "schema-bundle-hash.pc0222.manifest.previous",
  ],
  protected_historical_schema_bundle_hashes: [],
  window_state: "VERIFIED_PREVIOUS_READERS_SUPPORTED",
});

const compatibilityGate = assembleSchemaBundleCompatibilityGateContract({
  candidate_identity_contract: candidateIdentity,
  schema_reader_window_contract: readerWindow,
});

const authoritySandboxCoverageHash = "authority-sandbox-coverage-hash.pc0222";

function gateEvidence(
  overrides: Partial<
    Record<
      ReleaseVerificationGateName,
      Partial<ReleaseGateBindingEvidenceInput>
    >
  > = {},
): ReleaseGateBindingEvidenceInput[] {
  return RELEASE_VERIFICATION_MANIFEST_GATE_ORDER.map((gateName) => {
    const status =
      overrides[gateName]?.status ??
      ("GREEN" satisfies ReleaseVerificationGateStatus);
    return {
      gate_name: gateName,
      result_ref: `verification-suite-result://pc0222/${gateName}`,
      admissibility_ref: `gate-admissibility://pc0222/${gateName}`,
      status,
      admissibility_state: status === "GREEN" ? "ADMISSIBLE" : "INADMISSIBLE",
      quarantine_state: "NONE",
      manual_waiver_state: "NONE",
      executed_at: "2026-05-05T15:30:00Z",
      ...overrides[gateName],
    };
  });
}

function gateBindings(
  overrides: Partial<
    Record<
      ReleaseVerificationGateName,
      Partial<ReleaseGateBindingEvidenceInput>
    >
  > = {},
) {
  return deriveReleaseGateBindings({
    authority_sandbox_coverage_hash: authoritySandboxCoverageHash,
    candidate_identity_hash: candidateIdentity.candidate_identity_hash,
    compatibility_gate_hash: compatibilityGate.compatibility_gate_hash,
    gate_evidence: gateEvidence(overrides),
  });
}

function assemblyInput(
  overrides: Partial<
    Parameters<typeof assembleReleaseVerificationManifestAssemblyContract>[0]
  > = {},
): Parameters<typeof assembleReleaseVerificationManifestAssemblyContract>[0] {
  return {
    approval_ref_or_null: "approval://pc0222/release",
    canary_summary_ref_or_null: "canary-summary://pc0222/release",
    candidate_identity_hash: candidateIdentity.candidate_identity_hash,
    client_compatibility_matrix_ref_or_null:
      "client-compatibility-matrix://pc0222/release",
    compatibility_gate_hash: compatibilityGate.compatibility_gate_hash,
    decision_state: "APPROVED",
    deployment_release_ref_or_null: "deployment-release://pc0222/release",
    deterministic_golden_pack_ref_or_null:
      "deterministic-golden-pack://pc0222/release",
    enabled_provider_profile_refs: candidateIdentity.enabled_provider_profile_refs,
    executed_test_run_identifiers: ["test-run://pc0222/release"],
    gate_bindings: gateBindings(),
    migration_ledger_refs: [],
    migration_mode: "NO_MIGRATION",
    migration_plan_ref_or_null: null,
    restore_checkpoint_ref_or_null: "recovery-checkpoint://pc0222/release",
    restore_drill_ref_or_null: "restore-drill://pc0222/release",
    superseded_by_verification_manifest_ref_or_null: null,
    supported_client_window_ref:
      candidateIdentity.supported_client_window_ref_or_null!,
    ...overrides,
  };
}

test("assembles a schema-valid manifest assembly contract with canonical gate bindings", async () => {
  const assembly = assembleReleaseVerificationManifestAssemblyContract(
    assemblyInput(),
  );

  expect(assembly.gate_bindings.map((binding) => binding.gate_name)).toEqual(
    RELEASE_VERIFICATION_MANIFEST_GATE_ORDER,
  );
  expect(assembly.assembly_contract_hash).toBe(
    deriveReleaseVerificationManifestAssemblyContractHash(assembly),
  );
  expect(
    assembly.gate_bindings.filter((binding) =>
      ["schema_compatibility", "migration_verification", "operator_client"].includes(
        binding.gate_name,
      ),
    ),
  ).toHaveLength(3);
  for (const binding of assembly.gate_bindings) {
    if (
      binding.gate_name === "schema_compatibility" ||
      binding.gate_name === "migration_verification" ||
      binding.gate_name === "operator_client"
    ) {
      expect(binding.compatibility_gate_hash_or_null).toBe(
        compatibilityGate.compatibility_gate_hash,
      );
    }
    if (binding.gate_name === "authority_sandbox") {
      expect(binding.authority_sandbox_coverage_hash_or_null).toBe(
        authoritySandboxCoverageHash,
      );
    }
  }
  await validateContractSchema(
    "release_verification_manifest_assembly_contract",
    assembly,
  );
});

test("normalizes derived gate bindings but rejects serialized contracts in noncanonical order", () => {
  const reversedBindings = deriveReleaseGateBindings({
    authority_sandbox_coverage_hash: authoritySandboxCoverageHash,
    candidate_identity_hash: candidateIdentity.candidate_identity_hash,
    compatibility_gate_hash: compatibilityGate.compatibility_gate_hash,
    gate_evidence: [...gateEvidence()].reverse(),
  });
  expect(reversedBindings.map((binding) => binding.gate_name)).toEqual(
    RELEASE_VERIFICATION_MANIFEST_GATE_ORDER,
  );

  const assembly = assembleReleaseVerificationManifestAssemblyContract(
    assemblyInput(),
  );
  const reversedContract = {
    ...assembly,
    gate_bindings: [...assembly.gate_bindings].reverse(),
  };
  reversedContract.assembly_contract_hash =
    deriveReleaseVerificationManifestAssemblyContractHash(reversedContract);

  expect(() =>
    assertReleaseVerificationManifestAssemblyContract(reversedContract),
  ).toThrow(/canonical blocking-gate order/);
});

test("fails closed when green supporting gates lack companion evidence refs", () => {
  expect(() =>
    assembleReleaseVerificationManifestAssemblyContract(
      assemblyInput({
        client_compatibility_matrix_ref_or_null: null,
      }),
    ),
  ).toThrow(/operator-client/);

  expect(() =>
    assembleReleaseVerificationManifestAssemblyContract(
      assemblyInput({
        deterministic_golden_pack_ref_or_null: null,
      }),
    ),
  ).toThrow(/deterministic/);

  expect(() =>
    assembleReleaseVerificationManifestAssemblyContract(
      assemblyInput({
        restore_checkpoint_ref_or_null: null,
      }),
    ),
  ).toThrow(/restore drill and checkpoint/);
});

test("rejects blocked all-green assemblies and accepts blocked posture with a red gate", async () => {
  expect(() =>
    assembleReleaseVerificationManifestAssemblyContract(
      assemblyInput({
        approval_ref_or_null: null,
        decision_state: "BLOCKED",
        deployment_release_ref_or_null: null,
      }),
    ),
  ).toThrow(/BLOCKED assembly requires at least one RED gate/);

  const blocked = assembleReleaseVerificationManifestAssemblyContract(
    assemblyInput({
      approval_ref_or_null: null,
      decision_state: "BLOCKED",
      deployment_release_ref_or_null: null,
      gate_bindings: gateBindings({
        security: {
          status: "RED",
          admissibility_state: "INADMISSIBLE",
        },
      }),
    }),
  );

  expect(blocked.decision_state).toBe("BLOCKED");
  expect(
    blocked.gate_bindings.find((binding) => binding.gate_name === "security")
      ?.status,
  ).toBe("RED");
  await validateContractSchema(
    "release_verification_manifest_assembly_contract",
    blocked,
  );
});

test("requires authority sandbox coverage and compatibility-gate hashes in the governed gate rows", () => {
  expect(() =>
    deriveReleaseGateBindings({
      authority_sandbox_coverage_hash: "",
      candidate_identity_hash: candidateIdentity.candidate_identity_hash,
      compatibility_gate_hash: compatibilityGate.compatibility_gate_hash,
      gate_evidence: gateEvidence(),
    }),
  ).toThrow(/authority_sandbox_coverage_hash_or_null/);

  const bindings = gateBindings();
  expect(
    bindings.find((binding) => binding.gate_name === "schema_compatibility")
      ?.compatibility_gate_hash_or_null,
  ).toBe(compatibilityGate.compatibility_gate_hash);
  expect(
    bindings.find((binding) => binding.gate_name === "migration_verification")
      ?.compatibility_gate_hash_or_null,
  ).toBe(compatibilityGate.compatibility_gate_hash);
  expect(
    bindings.find((binding) => binding.gate_name === "operator_client")
      ?.compatibility_gate_hash_or_null,
  ).toBe(compatibilityGate.compatibility_gate_hash);
});

test("persists compatibility gates and manifest assembly contracts as immutable schema-validated evidence", async () => {
  const repository = new ReleaseVerificationManifestAssemblyRepository({
    validate_contract_schema: validateContractSchema,
  });
  const storedGate = await repository.persistSchemaBundleCompatibilityGateContract({
    schema_bundle_compatibility_gate_contract: compatibilityGate,
    persisted_at: "2026-05-05T15:40:00Z",
  });
  const assembly = assembleReleaseVerificationManifestAssemblyContract(
    assemblyInput(),
  );
  const storedAssembly =
    await repository.persistReleaseVerificationManifestAssemblyContract({
      persisted_at: "2026-05-05T15:45:00Z",
      release_verification_manifest_assembly_contract: assembly,
    });

  expect(storedGate.compatibility_gate_hash).toBe(
    compatibilityGate.compatibility_gate_hash,
  );
  expect(storedAssembly.assembly_contract_hash).toBe(
    assembly.assembly_contract_hash,
  );
  await expect(
    repository.listReleaseVerificationManifestAssemblyContracts({
      compatibility_gate_hash: compatibilityGate.compatibility_gate_hash,
    }),
  ).resolves.toHaveLength(1);
  await expect(
    repository.getReleaseVerificationManifestAssemblyContractByHash(
      assembly.assembly_contract_hash,
    ),
  ).resolves.toMatchObject({
    candidate_identity_hash: candidateIdentity.candidate_identity_hash,
    decision_state: "APPROVED",
  });
});
