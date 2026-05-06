import type { ReleaseVerificationManifest } from "../../../../packages/generated-models/src/generated/typescript/manifest-and-release.ts";
import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  assembleReleaseVerificationManifestAssemblyContract,
  assembleSchemaBundleCompatibilityGateContract,
  buildCanaryHealthSummary,
  buildDeploymentReleaseRecord,
  buildVerificationSuiteResult,
  BuildArtifactRepository,
  ClientCompatibilityMatrixRepository,
  DeploymentReleaseRepository,
  deriveCandidateIdentityContract,
  deriveReleaseGateBindings,
  evaluateGateAdmissibilityRecord,
  GateAdmissibilityRecordRepository,
  generateClientCompatibilityMatrix,
  RELEASE_VERIFICATION_MANIFEST_GATE_ORDER,
  ReleaseVerificationManifestAssemblyRepository,
  ReleaseVerificationManifestReadRepository,
  RestoreDrillResultRepository,
  VerificationSuiteResultRepository,
  buildSchemaReaderWindowContract,
  normalizeBuildArtifactRecord,
  type ReleaseEvidenceBundleSource,
  type ReleaseVerificationGateName,
  type ReleaseVerificationGateStatus,
  type ReleaseGateBindingEvidenceInput,
  type ReleaseVerificationManifestAssemblyContractRecord,
  type ReleaseCandidateIdentityContractRecord,
  type SchemaBundleCompatibilityGateContractRecord,
  type SchemaReaderWindowContractRecord,
} from "../index.ts";

const currentManifestId = "verification-manifest://pc0227/current";
const supersededManifestId = "verification-manifest://pc0227/superseded";
const deploymentReleaseId = "deployment-release://pc0227/current";
const canarySummaryId = "canary-summary://pc0227/current";
const clientMatrixId = "client-compatibility-matrix://pc0227/current";
const deterministicSuiteResultId =
  "verification-suite-result://pc0227/deterministic";
const deterministicAdmissibilityId =
  "gate-admissibility://pc0227/deterministic";

export function releaseEvidenceCandidate() {
  return deriveCandidateIdentityContract({
    artifact_digest:
      "sha256:pc0227candidate907775aeb31c49363ee96508f756d6273c42eda8a99694c7cf6cef62cd1d",
    build_artifact_ref: "build://pc0227/current",
    candidate_environment_ref: "candidate-env://pc0227/preproduction",
    config_bundle_hash: "config-bundle-hash.pc0227.current",
    enabled_provider_profile_refs: ["provider.hmrc.it", "provider.hmrc.vat"],
    migration_plan_ref_or_null: null,
    schema_bundle_hash: "schema-bundle-hash.pc0227.current",
    supported_client_window_ref_or_null: "client-window://pc0227/operator",
  });
}

function readerWindow(candidate: ReleaseCandidateIdentityContractRecord) {
  return buildSchemaReaderWindowContract({
    compatibility_window_ref: "compat-window://pc0227/current",
    protected_historical_schema_bundle_hashes: [],
    supported_reader_schema_bundle_hashes: [
      candidate.schema_bundle_hash,
      "schema-bundle-hash.pc0227.previous",
    ],
    window_state: "VERIFIED_PREVIOUS_READERS_SUPPORTED",
    writer_schema_bundle_hash: candidate.schema_bundle_hash,
  });
}

function buildArtifact(candidate: ReleaseCandidateIdentityContractRecord) {
  return normalizeBuildArtifactRecord({
    artifact_digest: candidate.artifact_digest,
    artifact_registry_ref: "registry://pc0227/current",
    build_id: candidate.build_artifact_ref,
    build_time: "2026-05-05T20:00:00Z",
    desktop_notarization_ref: null,
    distribution_targets: ["SERVER", "WEB_OPERATOR_SHELL"],
    hardened_runtime_attestation_ref: null,
    provenance_ref: "provenance://pc0227/current",
    release_channel: "preproduction",
    sbom_ref: "sbom://pc0227/current",
    signature_ref: "signature://pc0227/current",
    vcs_ref: "git://pc0227/current",
  });
}

function gateEvidence(
  overrides: Partial<
    Record<ReleaseVerificationGateName, Partial<ReleaseGateBindingEvidenceInput>>
  > = {},
): ReleaseGateBindingEvidenceInput[] {
  return RELEASE_VERIFICATION_MANIFEST_GATE_ORDER.map((gateName) => {
    const status =
      overrides[gateName]?.status ??
      ("GREEN" satisfies ReleaseVerificationGateStatus);
    const resultRef =
      gateName === "deterministic_and_state_machine"
        ? deterministicSuiteResultId
        : `verification-suite-result://pc0227/${gateName}`;
    const admissibilityRef =
      gateName === "deterministic_and_state_machine"
        ? deterministicAdmissibilityId
        : `gate-admissibility://pc0227/${gateName}`;
    return {
      admissibility_ref: admissibilityRef,
      admissibility_state: status === "GREEN" ? "ADMISSIBLE" : "INADMISSIBLE",
      executed_at: "2026-05-05T20:20:00Z",
      gate_name: gateName,
      manual_waiver_state: "NONE",
      quarantine_state: "NONE",
      result_ref: resultRef,
      status,
      ...overrides[gateName],
    };
  });
}

function releaseManifestStateTransition(input: {
  at: string;
  current_state: ReleaseVerificationManifest["decision_state"];
  event: "approval_granted" | "supersede";
  previous_state_or_null: ReleaseVerificationManifest["decision_state"] | null;
}) {
  return {
    audit_evidence_policy: "EVERY_TRANSITION_RETAINS_AUDIT_EVENT_REF",
    concurrency_guard_policy: "COMPARE_AND_SWAP_OR_SINGLE_WRITER_LEASE",
    contract_version: "STATE_TRANSITION_CONTRACT_V1",
    current_state: input.current_state,
    illegal_transition_policy: "REJECT_WITH_TYPED_REASON_AND_NO_PARTIAL_WRITE",
    machine_code: "RELEASE_VERIFICATION_MANIFEST_DECISION_V1",
    object_family: "RELEASE_VERIFICATION_MANIFEST",
    previous_state_or_null: input.previous_state_or_null,
    recovery_supersession_policy:
      "RECOVERY_AND_SUPERSESSION_ALLOCATE_SUCCESSOR_OR_SUPERSEDING_LINEAGE",
    state_field_name: "decision_state",
    terminal_reentry_policy: "TERMINAL_STATES_REQUIRE_NEW_LINEAGE",
    transition_application_policy: "NAMED_EVENT_ONLY",
    transition_applied_at: input.at,
    transition_audit_ref: `audit://pc0227/manifest/${input.event}`,
    transition_event_code: input.event,
    typed_rejection_family: "ILLEGAL_STATE_TRANSITION",
  };
}

function blockingGatesFromAssembly(
  assembly: ReleaseVerificationManifestAssemblyContractRecord,
) {
  return Object.fromEntries(
    assembly.gate_bindings.map((binding) => {
      const { gate_name: _gateName, ...gate } = binding;
      return [binding.gate_name, gate];
    }),
  ) as ReleaseVerificationManifest["blocking_gates"];
}

function manifestFromAssembly(input: {
  assembly: ReleaseVerificationManifestAssemblyContractRecord;
  candidate: ReleaseCandidateIdentityContractRecord;
  compatibilityGate: SchemaBundleCompatibilityGateContractRecord;
  decisionChangedAt: string;
  id: string;
  reader: SchemaReaderWindowContractRecord;
}): ReleaseVerificationManifest {
  return {
    approval_ref: input.assembly.approval_ref_or_null,
    artifact_digest: input.candidate.artifact_digest,
    blocking_gates: blockingGatesFromAssembly(input.assembly),
    build_artifact_ref: input.candidate.build_artifact_ref,
    canary_summary_ref: input.assembly.canary_summary_ref_or_null,
    candidate_environment_ref: input.candidate.candidate_environment_ref,
    candidate_identity_contract: input.candidate,
    candidate_identity_hash: input.candidate.candidate_identity_hash,
    client_compatibility_matrix_ref:
      input.assembly.client_compatibility_matrix_ref_or_null,
    config_bundle_hash: input.candidate.config_bundle_hash,
    created_at: "2026-05-05T20:25:00Z",
    decision_changed_at: input.decisionChangedAt,
    decision_state: input.assembly.decision_state,
    deployment_release_ref: input.assembly.deployment_release_ref_or_null,
    deterministic_golden_pack_ref:
      input.assembly.deterministic_golden_pack_ref_or_null,
    enabled_provider_profile_refs: input.assembly.enabled_provider_profile_refs,
    executed_test_run_identifiers: input.assembly.executed_test_run_identifiers,
    manifest_assembly_contract: input.assembly,
    migration_ledger_refs: input.assembly.migration_ledger_refs,
    migration_mode: input.assembly.migration_mode,
    migration_plan_ref: input.assembly.migration_plan_ref_or_null,
    restore_checkpoint_ref: input.assembly.restore_checkpoint_ref_or_null,
    restore_drill_ref: input.assembly.restore_drill_ref_or_null,
    schema_bundle_compatibility_gate_contract: input.compatibilityGate,
    schema_bundle_hash: input.candidate.schema_bundle_hash,
    schema_reader_window_contract: input.reader,
    state_transition_contract: releaseManifestStateTransition({
      at: input.decisionChangedAt,
      current_state: input.assembly.decision_state,
      event:
        input.assembly.decision_state === "SUPERSEDED"
          ? "supersede"
          : "approval_granted",
      previous_state_or_null:
        input.assembly.decision_state === "SUPERSEDED" ? "APPROVED" : "PENDING",
    }),
    superseded_by_verification_manifest_ref:
      input.assembly.superseded_by_verification_manifest_ref_or_null,
    supported_client_window_ref: input.assembly.supported_client_window_ref,
    verification_manifest_id: input.id,
  };
}

export async function releaseEvidenceFixture(input: {
  includeSupersededManifest?: boolean;
  persistCanaryAndClientCompanions?: boolean;
} = {}) {
  const persistCompanions = input.persistCanaryAndClientCompanions ?? true;
  const candidate = releaseEvidenceCandidate();
  const reader = readerWindow(candidate);
  const compatibilityGate = assembleSchemaBundleCompatibilityGateContract({
    candidate_identity_contract: candidate,
    schema_reader_window_contract: reader,
  });
  const gateBindings = deriveReleaseGateBindings({
    authority_sandbox_coverage_hash: "authority-sandbox-coverage-hash.pc0227",
    candidate_identity_hash: candidate.candidate_identity_hash,
    compatibility_gate_hash: compatibilityGate.compatibility_gate_hash,
    gate_evidence: gateEvidence(),
  });
  const currentAssembly = assembleReleaseVerificationManifestAssemblyContract({
    approval_ref_or_null: "approval://pc0227/current",
    canary_summary_ref_or_null: canarySummaryId,
    candidate_identity_hash: candidate.candidate_identity_hash,
    client_compatibility_matrix_ref_or_null: clientMatrixId,
    compatibility_gate_hash: compatibilityGate.compatibility_gate_hash,
    decision_state: "APPROVED",
    deployment_release_ref_or_null: deploymentReleaseId,
    deterministic_golden_pack_ref_or_null:
      "deterministic-golden-pack://pc0227/current",
    enabled_provider_profile_refs: candidate.enabled_provider_profile_refs,
    executed_test_run_identifiers: ["test-run://pc0227/current"],
    gate_bindings: gateBindings,
    migration_ledger_refs: [],
    migration_mode: "NO_MIGRATION",
    migration_plan_ref_or_null: null,
    restore_checkpoint_ref_or_null: "recovery-checkpoint://pc0227/current",
    restore_drill_ref_or_null: "restore-drill://pc0227/current",
    superseded_by_verification_manifest_ref_or_null: null,
    supported_client_window_ref: candidate.supported_client_window_ref_or_null!,
  });
  const currentManifest = manifestFromAssembly({
    assembly: currentAssembly,
    candidate,
    compatibilityGate,
    decisionChangedAt: "2026-05-05T20:30:00Z",
    id: currentManifestId,
    reader,
  });
  const supersededAssembly = assembleReleaseVerificationManifestAssemblyContract({
    ...currentAssembly,
    approval_ref_or_null: null,
    decision_state: "SUPERSEDED",
    deployment_release_ref_or_null: null,
    superseded_by_verification_manifest_ref_or_null: currentManifestId,
  });
  const supersededManifest = manifestFromAssembly({
    assembly: supersededAssembly,
    candidate,
    compatibilityGate,
    decisionChangedAt: "2026-05-05T20:29:00Z",
    id: supersededManifestId,
    reader,
  });

  const buildArtifactRepository = new BuildArtifactRepository();
  const releaseVerificationManifestAssemblyRepository =
    new ReleaseVerificationManifestAssemblyRepository({
      validate_contract_schema: validateContractSchema,
    });
  const releaseVerificationManifestRepository =
    new ReleaseVerificationManifestReadRepository();
  const verificationSuiteResultRepository = new VerificationSuiteResultRepository({
    validate_contract_schema: validateContractSchema,
  });
  const gateAdmissibilityRecordRepository = new GateAdmissibilityRecordRepository({
    validate_contract_schema: validateContractSchema,
  });
  const clientCompatibilityMatrixRepository =
    new ClientCompatibilityMatrixRepository({
      validate_contract_schema: validateContractSchema,
    });
  const restoreDrillResultRepository = new RestoreDrillResultRepository({
    validate_contract_schema: validateContractSchema,
  });
  const deploymentReleaseRepository = new DeploymentReleaseRepository({
    validate_contract_schema: validateContractSchema,
  });

  await buildArtifactRepository.persistBuildArtifact({
    build_artifact: buildArtifact(candidate),
    persisted_at: "2026-05-05T20:01:00Z",
  });
  await buildArtifactRepository.persistReleaseCandidateIdentityContract({
    persisted_at: "2026-05-05T20:02:00Z",
    release_candidate_identity_contract: candidate,
  });
  await releaseVerificationManifestAssemblyRepository.persistSchemaBundleCompatibilityGateContract(
    {
      persisted_at: "2026-05-05T20:10:00Z",
      schema_bundle_compatibility_gate_contract: compatibilityGate,
    },
  );
  await releaseVerificationManifestAssemblyRepository.persistReleaseVerificationManifestAssemblyContract(
    {
      persisted_at: "2026-05-05T20:24:00Z",
      release_verification_manifest_assembly_contract: currentAssembly,
    },
  );
  if (input.includeSupersededManifest) {
    await releaseVerificationManifestAssemblyRepository.persistReleaseVerificationManifestAssemblyContract(
      {
        persisted_at: "2026-05-05T20:23:00Z",
        release_verification_manifest_assembly_contract: supersededAssembly,
      },
    );
  }
  const deterministicSuite = buildVerificationSuiteResult({
    candidate_identity_contract: candidate,
    deterministic_golden_pack_ref: "deterministic-golden-pack://pc0227/current",
    executed_at: "2026-05-05T20:20:00Z",
    result_state: "PASSED",
    result_summary_ref: "result-summary://pc0227/deterministic",
    schema_bundle_compatibility_gate_contract: compatibilityGate,
    schema_reader_window_contract: reader,
    suite_family: "DETERMINISTIC_AND_STATE_MACHINE",
    suite_result_id: deterministicSuiteResultId,
    test_run_identifiers: ["test-run://pc0227/current"],
  });
  const deterministicAdmissibility = evaluateGateAdmissibilityRecord({
    admissibility_id: deterministicAdmissibilityId,
    evaluated_at: "2026-05-05T20:21:00Z",
    suite_result: deterministicSuite,
  });
  await verificationSuiteResultRepository.persistVerificationSuiteResult({
    persisted_at: "2026-05-05T20:21:00Z",
    verification_suite_result: deterministicSuite,
  });
  await gateAdmissibilityRecordRepository.persistGateAdmissibilityRecord({
    gate_admissibility_record: deterministicAdmissibility,
    persisted_at: "2026-05-05T20:22:00Z",
  });
  if (persistCompanions) {
    await deploymentReleaseRepository.persistCanaryHealthSummary({
      canary_health_summary: buildCanaryHealthSummary({
        canary_fraction: 0.1,
        canary_summary_id: canarySummaryId,
        candidate_identity_contract: candidate,
        error_budget_profile_ref: "error-budget://pc0227/current",
        error_budget_state: "WITHIN_BUDGET",
        evaluated_at: "2026-05-05T20:26:00Z",
        latency_budget_state: "WITHIN_BUDGET",
        slo_profile_ref: "slo://pc0227/current",
        summary_ref: "canary-report://pc0227/current",
      }),
      persisted_at: "2026-05-05T20:26:00Z",
    });
    await generateClientCompatibilityMatrix({
      browser_client_versions: ["operator-web@1.0.0"],
      candidate_identity_contract: candidate,
      compatibility_matrix_id: clientMatrixId,
      evaluated_at: "2026-05-05T20:27:00Z",
      repository: clientCompatibilityMatrixRepository,
      schema_bundle_compatibility_gate_contract: compatibilityGate,
      suite_result_ref_prefix: "suite-result://pc0227/client",
    });
  }
  await releaseVerificationManifestRepository.persistReleaseVerificationManifest({
    persisted_at: "2026-05-05T20:30:00Z",
    release_verification_manifest: currentManifest,
  });
  if (input.includeSupersededManifest) {
    await releaseVerificationManifestRepository.persistReleaseVerificationManifest({
      persisted_at: "2026-05-05T20:29:00Z",
      release_verification_manifest: supersededManifest,
    });
  }
  await deploymentReleaseRepository.persistDeploymentRelease({
    deployment_release: buildDeploymentReleaseRecord({
      canary_fraction: 0.1,
      candidate_identity_contract: candidate,
      deployed_at: "2026-05-05T20:34:00Z",
      environment_ref: "environment://pc0227/preproduction",
      fail_forward_runbook_ref: "runbook://pc0227/fail-forward",
      health_gate_state: "GREEN",
      previous_state_or_null: "CANARY",
      release_id: deploymentReleaseId,
      release_verification_manifest_ref: currentManifestId,
      rollback_runbook_ref: "runbook://pc0227/rollback",
      rollout_state: "PROMOTED",
      rollout_strategy: "STANDARD_CANARY",
      schema_reader_window_contract: reader,
      transition_applied_at: "2026-05-05T20:34:00Z",
      transition_audit_ref: "audit://pc0227/promote",
      transition_event_code: "promote",
    }),
    persisted_at: "2026-05-05T20:34:00Z",
  });

  const source = {
    buildArtifactRepository,
    clientCompatibilityMatrixRepository,
    deploymentReleaseRepository,
    gateAdmissibilityRecordRepository,
    releaseVerificationManifestAssemblyRepository,
    releaseVerificationManifestRepository,
    restoreDrillResultRepository,
    verificationSuiteResultRepository,
  } satisfies ReleaseEvidenceBundleSource;

  return {
    candidate,
    clientMatrixId,
    compatibilityGate,
    currentManifest,
    currentManifestId,
    deploymentReleaseId,
    source,
    supersededManifest,
    supersededManifestId,
  };
}
