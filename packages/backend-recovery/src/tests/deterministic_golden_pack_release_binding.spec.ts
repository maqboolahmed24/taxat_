import { expect, test } from "@playwright/test";

import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import type { GateAdmissibilityRecord } from "../../../generated-models/src/generated/typescript/decisioning-and-nightly.ts";
import type { VerificationSuiteResult } from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type {
  ReleaseVerificationManifest,
  ReleaseVerificationManifestAssemblyContract,
  ReleaseVerificationManifestAssemblyContractGateBinding,
  ReleaseVerificationManifestGateResult,
  SchemaBundleCompatibilityGateContract,
  SchemaReaderWindowContract,
} from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  bindDeterministicGoldenPackRefToGateAdmissibilityRecord,
  bindDeterministicGoldenPackRefToReleaseVerificationManifest,
  bindDeterministicGoldenPackRefToVerificationSuiteResult,
  deriveReleaseVerificationManifestAssemblyContractHash,
  propagateDeterministicGoldenPackRefToReleaseEvidence,
  validateDeterministicGoldenPackRefForGateAdmissibilityRecord,
  validateDeterministicGoldenPackRefForReleaseVerificationManifest,
  validateDeterministicGoldenPackRefForVerificationSuiteResult,
} from "../index.ts";
import {
  candidateIdentityFixture,
  deterministicGoldenPackFixture,
  stateTransitionContractFixture,
} from "./deterministic_golden_pack_contract.spec.ts";

function sorted(values: readonly string[]) {
  return [...values].sort();
}

function schemaReaderWindowContractFixture(): SchemaReaderWindowContract {
  return {
    contract_version: "SCHEMA_READER_WINDOW_CONTRACT_V1",
    compatibility_window_ref: "compat-window-1",
    writer_schema_bundle_hash: "schema-hash-1",
    supported_reader_schema_bundle_hashes: ["schema-hash-0", "schema-hash-1"],
    protected_historical_schema_bundle_hashes: ["schema-hash-0"],
    window_state: "VERIFIED_PREVIOUS_READERS_SUPPORTED",
    historical_manifest_policy:
      "FROZEN_MANIFESTS_REQUIRE_RECORDED_BUNDLE_OR_COMPATIBLE_READER",
    destructive_change_policy: "DESTRUCTIVE_CHANGE_BLOCKED_UNTIL_WINDOW_CLOSED",
    rollback_boundary_policy: "ROLLBACK_ALLOWED_ONLY_WHILE_PREVIOUS_READERS_SUPPORTED",
    fail_forward_policy: "FAIL_FORWARD_REQUIRED_AFTER_WINDOW_CLOSE_OR_BREAKING_CONTRACT",
    replay_restore_policy: "RESTORE_AND_REPLAY_REQUIRE_WINDOW_COMPATIBLE_READER",
  };
}

function deriveSchemaBundleCompatibilityGateHash(
  contract: SchemaBundleCompatibilityGateContract,
) {
  return stableJsonHash({
    contract_version: contract.contract_version,
    candidate_identity_hash: contract.candidate_identity_hash,
    schema_bundle_hash: contract.schema_bundle_hash,
    compatibility_window_ref: contract.compatibility_window_ref,
    reader_window_state: contract.reader_window_state,
    migration_plan_ref_or_null: contract.migration_plan_ref_or_null,
    migration_ledger_refs: sorted(contract.migration_ledger_refs),
    supported_client_window_ref_or_null: contract.supported_client_window_ref_or_null,
    historical_manifest_guard_state: contract.historical_manifest_guard_state,
    replay_restore_guard_state: contract.replay_restore_guard_state,
    native_client_window_state: contract.native_client_window_state,
    migration_chronology_state: contract.migration_chronology_state,
    destructive_contract_state: contract.destructive_contract_state,
    rollback_boundary_state: contract.rollback_boundary_state,
    reason_codes: sorted(contract.reason_codes),
    writer_schema_bundle_hash: contract.schema_reader_window_contract.writer_schema_bundle_hash,
    supported_reader_schema_bundle_hashes: sorted(
      contract.schema_reader_window_contract.supported_reader_schema_bundle_hashes,
    ),
    protected_historical_schema_bundle_hashes: sorted(
      contract.schema_reader_window_contract.protected_historical_schema_bundle_hashes,
    ),
    historical_manifest_policy: contract.historical_manifest_policy,
    destructive_change_policy: contract.destructive_change_policy,
    rollback_boundary_policy: contract.rollback_boundary_policy,
    fail_forward_policy: contract.fail_forward_policy,
    replay_restore_policy: contract.replay_restore_policy,
    client_persistence_policy: contract.client_persistence_policy,
    evidence_binding_policy: contract.evidence_binding_policy,
  });
}

function schemaBundleCompatibilityGateContractFixture(): SchemaBundleCompatibilityGateContract {
  const candidate = candidateIdentityFixture();
  const readerWindow = schemaReaderWindowContractFixture();
  const contract: SchemaBundleCompatibilityGateContract = {
    contract_version: "SCHEMA_BUNDLE_COMPATIBILITY_GATE_V1",
    compatibility_gate_hash: "pending",
    candidate_identity_hash: candidate.candidate_identity_hash,
    candidate_identity_contract: candidate,
    schema_bundle_hash: candidate.schema_bundle_hash,
    compatibility_window_ref: readerWindow.compatibility_window_ref,
    reader_window_state: readerWindow.window_state,
    schema_reader_window_contract: readerWindow,
    migration_plan_ref_or_null: candidate.migration_plan_ref_or_null,
    migration_ledger_refs: [],
    supported_client_window_ref_or_null: candidate.supported_client_window_ref_or_null,
    historical_manifest_guard_state: "PROTECTED",
    replay_restore_guard_state: "PROTECTED",
    native_client_window_state: "VERIFIED_COMPATIBLE",
    migration_chronology_state: "NOT_REQUIRED",
    destructive_contract_state: "BLOCKED_UNTIL_WINDOW_CLOSE",
    rollback_boundary_state: "ROLLBACK_ALLOWED",
    reason_codes: [],
    historical_manifest_policy: readerWindow.historical_manifest_policy,
    destructive_change_policy: readerWindow.destructive_change_policy,
    rollback_boundary_policy: readerWindow.rollback_boundary_policy,
    fail_forward_policy: readerWindow.fail_forward_policy,
    replay_restore_policy: readerWindow.replay_restore_policy,
    client_persistence_policy: "SERVER_SCHEMA_GATE_REQUIRES_SUPPORTED_CLIENT_WINDOW_COMPATIBILITY",
    evidence_binding_policy: "EXACT_CANDIDATE_READER_WINDOW_AND_CLIENT_WINDOW_BINDING_REQUIRED",
  };
  return {
    ...contract,
    compatibility_gate_hash: deriveSchemaBundleCompatibilityGateHash(contract),
  };
}

function gateBindingsFixture(
  overridesByGate: Partial<
    Record<ReleaseVerificationManifestAssemblyContractGateBinding["gate_name"], Partial<ReleaseVerificationManifestAssemblyContractGateBinding>>
  > = {},
): ReleaseVerificationManifestAssemblyContractGateBinding[] {
  const candidate = candidateIdentityFixture();
  const compatibilityGateHash =
    schemaBundleCompatibilityGateContractFixture().compatibility_gate_hash;
  const authoritySandboxCoverageHash = "authority-sandbox-coverage-hash-1";
  const gateNames = [
    "schema_compatibility",
    "deterministic_and_state_machine",
    "northbound_api",
    "authority_sandbox",
    "operator_client",
    "security",
    "performance_and_canary",
    "restore_drill",
    "migration_verification",
    "supply_chain",
    "suite_admissibility",
  ] as const;
  const suiteFamilyByGate = {
    schema_compatibility: "SCHEMA_COMPATIBILITY",
    deterministic_and_state_machine: "DETERMINISTIC_AND_STATE_MACHINE",
    northbound_api: "NORTHBOUND_API",
    authority_sandbox: "AUTHORITY_SANDBOX",
    operator_client: "OPERATOR_CLIENT",
    security: "SECURITY",
    performance_and_canary: "PERFORMANCE_AND_CANARY",
    restore_drill: "RESTORE_DRILL",
    migration_verification: "MIGRATION_VERIFICATION",
    supply_chain: "SUPPLY_CHAIN",
    suite_admissibility: "SUITE_ADMISSIBILITY",
  } as const;
  return gateNames.map((gateName) => ({
    gate_name: gateName,
    suite_family: suiteFamilyByGate[gateName],
    candidate_identity_hash: candidate.candidate_identity_hash,
    compatibility_gate_hash_or_null: [
      "schema_compatibility",
      "migration_verification",
      "operator_client",
    ].includes(gateName)
      ? compatibilityGateHash
      : null,
    authority_sandbox_coverage_hash_or_null:
      gateName === "authority_sandbox" ? authoritySandboxCoverageHash : null,
    result_ref: `${gateName}-result-1`,
    admissibility_ref: `${gateName}-admissibility-1`,
    status: "GREEN",
    admissibility_state: "ADMISSIBLE",
    quarantine_state: "NONE",
    manual_waiver_state: "NONE",
    executed_at: "2026-03-31T11:00:00+00:00",
    ...overridesByGate[gateName],
  }));
}

function verificationSuiteResultFixture(): VerificationSuiteResult {
  const candidate = candidateIdentityFixture();
  return {
    suite_result_id: "suite-result-1",
    suite_family: "DETERMINISTIC_AND_STATE_MACHINE",
    candidate_environment_ref: candidate.candidate_environment_ref,
    build_artifact_ref: candidate.build_artifact_ref,
    artifact_digest: candidate.artifact_digest,
    candidate_identity_hash: candidate.candidate_identity_hash,
    candidate_identity_contract: candidate,
    schema_bundle_hash: candidate.schema_bundle_hash,
    schema_reader_window_contract: schemaReaderWindowContractFixture(),
    schema_bundle_compatibility_gate_contract: schemaBundleCompatibilityGateContractFixture(),
    config_bundle_hash: candidate.config_bundle_hash,
    migration_plan_ref: null,
    enabled_provider_profile_refs: candidate.enabled_provider_profile_refs,
    authority_sandbox_coverage_contract_or_null: null,
    supported_client_window_ref: candidate.supported_client_window_ref_or_null,
    restore_drill_ref: null,
    restore_checkpoint_ref: null,
    deterministic_golden_pack_ref: null,
    test_run_identifiers: ["run-1"],
    result_state: "PASSED",
    result_summary_ref: "suite-summary-1",
    executed_at: "2026-03-31T11:00:00+00:00",
  };
}

function gateAdmissibilityRecordFixture(): GateAdmissibilityRecord {
  const candidate = candidateIdentityFixture();
  return {
    admissibility_id: "admissibility-1",
    suite_result_ref: "suite-result-1",
    suite_family: "DETERMINISTIC_AND_STATE_MACHINE",
    candidate_environment_ref: candidate.candidate_environment_ref,
    artifact_digest: candidate.artifact_digest,
    candidate_identity_hash: candidate.candidate_identity_hash,
    candidate_identity_contract: candidate,
    schema_bundle_hash: candidate.schema_bundle_hash,
    schema_reader_window_contract: schemaReaderWindowContractFixture(),
    schema_bundle_compatibility_gate_contract: schemaBundleCompatibilityGateContractFixture(),
    migration_plan_ref: null,
    authority_sandbox_coverage_contract_or_null: null,
    supported_client_window_ref: candidate.supported_client_window_ref_or_null,
    restore_drill_ref: null,
    restore_checkpoint_ref: null,
    deterministic_golden_pack_ref: null,
    candidate_identity_match: true,
    freshness_verified: true,
    contract_window_consistent: true,
    rerun_scope_preserved: true,
    quarantine_state: "NONE",
    admissibility_state: "ADMISSIBLE",
    evaluated_at: "2026-03-31T11:15:00+00:00",
    reason_codes: [],
  };
}

function assemblyContractFixture(
  deterministicGoldenPackRef: string | null,
  gateBindings = gateBindingsFixture(),
): ReleaseVerificationManifestAssemblyContract {
  const candidate = candidateIdentityFixture();
  const compatibility = schemaBundleCompatibilityGateContractFixture();
  const contract: ReleaseVerificationManifestAssemblyContract = {
    contract_version: "RELEASE_VERIFICATION_MANIFEST_ASSEMBLY_V1",
    assembly_contract_hash: "pending",
    candidate_identity_hash: candidate.candidate_identity_hash,
    compatibility_gate_hash: compatibility.compatibility_gate_hash,
    gate_order_policy: "CANONICAL_BLOCKING_GATE_ORDER_V1",
    evidence_source_policy: "FIRST_CLASS_RESULT_AND_ADMISSIBILITY_ARTIFACTS_ONLY",
    admissibility_derivation_policy:
      "GREEN_REQUIRES_ADMISSIBLE_UNQUARANTINED_UNWAIVED_EVIDENCE",
    companion_evidence_policy: "GREEN_SUPPORTING_GATES_REQUIRE_COMPANION_EVIDENCE_REFS",
    decision_posture_policy: "APPROVAL_AND_SUPERSESSION_REQUIRE_EXPLICIT_DECISION_LINEAGE",
    supersession_policy: "NEW_MANIFEST_SUPERSEDES_OLD_MANIFEST_EXPLICITLY_NO_POST_HOC_REWRITE",
    enabled_provider_profile_refs: candidate.enabled_provider_profile_refs,
    executed_test_run_identifiers: ["run-1"],
    gate_bindings: gateBindings,
    migration_mode: "NO_MIGRATION",
    migration_plan_ref_or_null: candidate.migration_plan_ref_or_null,
    migration_ledger_refs: [],
    supported_client_window_ref: candidate.supported_client_window_ref_or_null!,
    canary_summary_ref_or_null: "canary-1",
    deterministic_golden_pack_ref_or_null: deterministicGoldenPackRef,
    restore_drill_ref_or_null: "restore-1",
    restore_checkpoint_ref_or_null: "checkpoint-1",
    client_compatibility_matrix_ref_or_null: "client-matrix-1",
    decision_state: "APPROVED",
    approval_ref_or_null: "approval-1",
    deployment_release_ref_or_null: "release-1",
    superseded_by_verification_manifest_ref_or_null: null,
  };
  return {
    ...contract,
    assembly_contract_hash: deriveReleaseVerificationManifestAssemblyContractHash(contract),
  };
}

function blockingGatesFromBindings(gateBindings: ReleaseVerificationManifestAssemblyContractGateBinding[]) {
  return Object.fromEntries(
    gateBindings.map((binding) => {
      const { gate_name: gateName, ...gate } = binding;
      return [gateName, gate];
    }),
  ) as ReleaseVerificationManifest["blocking_gates"];
}

function releaseVerificationManifestFixture(
  deterministicGoldenPackRef: string | null,
  gateBindings = gateBindingsFixture(),
): ReleaseVerificationManifest {
  const candidate = candidateIdentityFixture();
  return {
    verification_manifest_id: "verify-1",
    candidate_environment_ref: candidate.candidate_environment_ref,
    build_artifact_ref: candidate.build_artifact_ref,
    artifact_digest: candidate.artifact_digest,
    candidate_identity_hash: candidate.candidate_identity_hash,
    candidate_identity_contract: candidate,
    manifest_assembly_contract: assemblyContractFixture(deterministicGoldenPackRef, gateBindings),
    schema_bundle_hash: candidate.schema_bundle_hash,
    schema_reader_window_contract: schemaReaderWindowContractFixture(),
    schema_bundle_compatibility_gate_contract: schemaBundleCompatibilityGateContractFixture(),
    config_bundle_hash: candidate.config_bundle_hash,
    migration_mode: "NO_MIGRATION",
    migration_plan_ref: candidate.migration_plan_ref_or_null,
    enabled_provider_profile_refs: candidate.enabled_provider_profile_refs,
    executed_test_run_identifiers: ["run-1"],
    blocking_gates: blockingGatesFromBindings(gateBindings),
    migration_ledger_refs: [],
    canary_summary_ref: "canary-1",
    deterministic_golden_pack_ref: deterministicGoldenPackRef,
    restore_drill_ref: "restore-1",
    restore_checkpoint_ref: "checkpoint-1",
    supported_client_window_ref: candidate.supported_client_window_ref_or_null!,
    client_compatibility_matrix_ref: "client-matrix-1",
    decision_state: "APPROVED",
    state_transition_contract: stateTransitionContractFixture({
      transition_applied_at: "2026-03-31T12:00:00+00:00",
    }),
    approval_ref: "approval-1",
    deployment_release_ref: "release-1",
    superseded_by_verification_manifest_ref: null,
    decision_changed_at: "2026-03-31T12:00:00+00:00",
    created_at: "2026-03-31T09:00:00+00:00",
  };
}

test("propagates one deterministic golden-pack ref into green deterministic release evidence", async () => {
  const pack = deterministicGoldenPackFixture();
  const ref = pack.golden_pack_id;

  const suiteResult = bindDeterministicGoldenPackRefToVerificationSuiteResult(
    verificationSuiteResultFixture(),
    ref,
  );
  const admissibility = bindDeterministicGoldenPackRefToGateAdmissibilityRecord(
    gateAdmissibilityRecordFixture(),
    ref,
  );
  const manifest = bindDeterministicGoldenPackRefToReleaseVerificationManifest(
    releaseVerificationManifestFixture(null),
    ref,
  );

  expect(suiteResult.deterministic_golden_pack_ref).toBe(ref);
  expect(admissibility.deterministic_golden_pack_ref).toBe(ref);
  expect(manifest.deterministic_golden_pack_ref).toBe(ref);
  expect(manifest.manifest_assembly_contract.deterministic_golden_pack_ref_or_null).toBe(ref);
  expect(manifest.manifest_assembly_contract.assembly_contract_hash).toBe(
    deriveReleaseVerificationManifestAssemblyContractHash(manifest.manifest_assembly_contract),
  );

  await validateContractSchema("verification_suite_result", suiteResult);
  await validateContractSchema("gate_admissibility_record", admissibility);
  await validateContractSchema(
    "release_verification_manifest_assembly_contract",
    manifest.manifest_assembly_contract,
  );
  await validateContractSchema("release_verification_manifest", manifest);
});

test("propagates the persisted pack ref across all release evidence in one call", () => {
  const pack = deterministicGoldenPackFixture();
  const propagated = propagateDeterministicGoldenPackRefToReleaseEvidence({
    golden_pack: pack,
    verification_suite_result: verificationSuiteResultFixture(),
    gate_admissibility_record: gateAdmissibilityRecordFixture(),
    release_verification_manifest: releaseVerificationManifestFixture(null),
  });

  expect(propagated.deterministic_golden_pack_ref).toBe(pack.golden_pack_id);
  expect(propagated.verification_suite_result.deterministic_golden_pack_ref).toBe(
    pack.golden_pack_id,
  );
  expect(propagated.gate_admissibility_record.deterministic_golden_pack_ref).toBe(
    pack.golden_pack_id,
  );
  expect(propagated.release_verification_manifest.deterministic_golden_pack_ref).toBe(
    pack.golden_pack_id,
  );
});

test("rejects missing green refs and clears refs from non-green deterministic release gates", () => {
  expect(() =>
    validateDeterministicGoldenPackRefForVerificationSuiteResult(verificationSuiteResultFixture()),
  ).toThrow(/green deterministic verification/);

  expect(() =>
    validateDeterministicGoldenPackRefForGateAdmissibilityRecord(gateAdmissibilityRecordFixture()),
  ).toThrow(/green deterministic admissibility/);

  expect(() =>
    validateDeterministicGoldenPackRefForReleaseVerificationManifest(
      releaseVerificationManifestFixture(null),
    ),
  ).toThrow(/green deterministic release manifest/);

  const redGateBindings = gateBindingsFixture({
    deterministic_and_state_machine: {
      status: "RED",
      admissibility_state: "INADMISSIBLE",
    },
  });
  const redManifestWithStaleRef = releaseVerificationManifestFixture(
    "golden-pack-1",
    redGateBindings,
  );
  expect(() =>
    validateDeterministicGoldenPackRefForReleaseVerificationManifest(redManifestWithStaleRef),
  ).toThrow(/non-green deterministic/);

  const rebound = bindDeterministicGoldenPackRefToReleaseVerificationManifest(
    redManifestWithStaleRef,
    "golden-pack-1",
  );
  expect(rebound.deterministic_golden_pack_ref).toBeNull();
  expect(rebound.manifest_assembly_contract.deterministic_golden_pack_ref_or_null).toBeNull();
});
