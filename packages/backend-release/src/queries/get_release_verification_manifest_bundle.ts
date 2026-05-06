import type {
  ReleaseVerificationManifestAssemblyContractGateBinding,
} from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import type { StoredBuildArtifactRecord } from "../repositories/build_artifact_repository.ts";
import type {
  StoredClientCompatibilityMatrixRecord,
} from "../repositories/client_compatibility_matrix_repository.ts";
import type {
  StoredCanaryHealthSummaryRecord,
  StoredDeploymentReleaseRecord,
} from "../repositories/deployment_release_repository.ts";
import type {
  StoredGateAdmissibilityRecord,
} from "../repositories/gate_admissibility_record_repository.ts";
import type {
  StoredReleaseVerificationManifestAssemblyContractRecord,
  StoredSchemaBundleCompatibilityGateContractRecord,
} from "../repositories/release_verification_manifest_assembly_repository.ts";
import type {
  StoredRestoreDrillResultRecord,
} from "../repositories/restore_drill_result_repository.ts";
import type {
  StoredVerificationSuiteResultRecord,
} from "../repositories/verification_suite_result_repository.ts";
import {
  assertReleaseVerificationManifestBinding,
  deriveReleaseEvidenceEtag,
  optionalRead,
  RELEASE_EVIDENCE_QUERY_DTO_VERSION,
  releaseVerificationManifestCompatibilityGateHash,
  summarizeManifestCompanionEvidence,
  type ReleaseEvidenceBundleSource,
  type ReleaseEvidenceCompanionEvidence,
  type ReleaseEvidenceCurrentnessState,
  ReleaseEvidenceQueryError,
  type ReleaseEvidenceReadKey,
  type StoredReleaseVerificationManifestRecord,
} from "./get_release_candidate_identity_bundle.ts";

export type ReleaseVerificationManifestGateEvidenceBundle = {
  admissibility_ref: string;
  admissibility_record_or_null: StoredGateAdmissibilityRecord | null;
  binding: ReleaseVerificationManifestAssemblyContractGateBinding;
  evidence_binding_state:
    | "BOUND"
    | "MISSING_ADMISSIBILITY_RECORD"
    | "MISSING_SUITE_RESULT"
    | "MISSING_SUITE_RESULT_AND_ADMISSIBILITY_RECORD";
  gate_name: ReleaseVerificationManifestAssemblyContractGateBinding["gate_name"];
  result_ref: string;
  suite_result_record_or_null: StoredVerificationSuiteResultRecord | null;
};

export type ReleaseVerificationManifestBundle = {
  artifact_type: "ReleaseVerificationManifestBundle";
  build_artifact_record_or_null: StoredBuildArtifactRecord | null;
  canary_health_summary_record_or_null: StoredCanaryHealthSummaryRecord | null;
  candidate_identity_hash: string;
  client_compatibility_matrix_record_or_null: StoredClientCompatibilityMatrixRecord | null;
  companion_evidence: ReleaseEvidenceCompanionEvidence[];
  compatibility_gate_hash: string;
  compatibility_gate_record_or_null: StoredSchemaBundleCompatibilityGateContractRecord | null;
  currentness_state: Exclude<ReleaseEvidenceCurrentnessState, "NO_MANIFEST">;
  deployment_release_record_or_null: StoredDeploymentReleaseRecord | null;
  dto_version: typeof RELEASE_EVIDENCE_QUERY_DTO_VERSION;
  etag: string;
  gate_evidence_bundles: ReleaseVerificationManifestGateEvidenceBundle[];
  manifest_assembly_record_or_null: StoredReleaseVerificationManifestAssemblyContractRecord | null;
  missing_companion_evidence: ReleaseEvidenceCompanionEvidence[];
  read_key: Extract<ReleaseEvidenceReadKey, { key_type: "verification_manifest_id" }>;
  release_verification_manifest_record: StoredReleaseVerificationManifestRecord;
  restore_drill_result_record_or_null: StoredRestoreDrillResultRecord | null;
  source_contract_availability: {
    build_artifact_record: "AVAILABLE" | "MISSING";
    compatibility_gate_record: "AVAILABLE" | "MISSING";
    manifest_assembly_record: "AVAILABLE" | "MISSING";
  };
  superseded_by_verification_manifest_ref: string | null;
};

function currentnessForManifest(record: StoredReleaseVerificationManifestRecord) {
  if (
    record.decision_state === "SUPERSEDED" ||
    record.superseded_by_verification_manifest_ref !== null
  ) {
    return "SUPERSEDED" as const;
  }
  if (record.decision_state === "BLOCKED") {
    return "BLOCKED" as const;
  }
  return "CURRENT" as const;
}

function gateBindingState(input: {
  admissibilityRecord: StoredGateAdmissibilityRecord | null;
  suiteResultRecord: StoredVerificationSuiteResultRecord | null;
}) {
  if (input.suiteResultRecord !== null && input.admissibilityRecord !== null) {
    return "BOUND" as const;
  }
  if (input.suiteResultRecord === null && input.admissibilityRecord === null) {
    return "MISSING_SUITE_RESULT_AND_ADMISSIBILITY_RECORD" as const;
  }
  if (input.suiteResultRecord === null) {
    return "MISSING_SUITE_RESULT" as const;
  }
  return "MISSING_ADMISSIBILITY_RECORD" as const;
}

function assertOptionalCandidateMirror(input: {
  candidateIdentityHash: string;
  label: string;
  record: null | { candidate_identity_hash: string };
}) {
  if (input.record === null) {
    return;
  }
  if (input.record.candidate_identity_hash !== input.candidateIdentityHash) {
    throw new ReleaseEvidenceQueryError(
      "RELEASE_EVIDENCE_MANIFEST_MIXED_CANDIDATE",
      `${input.label} belongs to ${input.record.candidate_identity_hash}, not ${input.candidateIdentityHash}`,
    );
  }
}

export async function getReleaseVerificationManifestBundle(input: {
  source: ReleaseEvidenceBundleSource;
  verification_manifest_id: string;
}): Promise<ReleaseVerificationManifestBundle> {
  const manifestRecord =
    await input.source.releaseVerificationManifestRepository.getReleaseVerificationManifestById(
      input.verification_manifest_id,
    );
  const manifest = assertReleaseVerificationManifestBinding(
    manifestRecord.release_verification_manifest,
  );
  const candidateIdentityHash = manifest.candidate_identity_hash;
  const compatibilityGateHash =
    releaseVerificationManifestCompatibilityGateHash(manifest);
  const candidateIdentityRecord = await optionalRead(() =>
    input.source.buildArtifactRepository.getReleaseCandidateIdentityContractByHash(
      candidateIdentityHash,
    ),
  );
  const buildArtifactRecord = await optionalRead(() =>
    input.source.buildArtifactRepository.getBuildArtifactByRef(
      manifest.build_artifact_ref,
    ),
  );
  const compatibilityGateRecord = await optionalRead(() =>
    input.source.releaseVerificationManifestAssemblyRepository.getSchemaBundleCompatibilityGateContractByHash(
      compatibilityGateHash,
    ),
  );
  const manifestAssemblyRecord = await optionalRead(() =>
    input.source.releaseVerificationManifestAssemblyRepository.getReleaseVerificationManifestAssemblyContractByHash(
      manifest.manifest_assembly_contract.assembly_contract_hash,
    ),
  );
  const canaryHealthSummaryRecord =
    manifest.canary_summary_ref === null
      ? null
      : await optionalRead(() =>
          input.source.deploymentReleaseRepository.getCanaryHealthSummaryById(
            manifest.canary_summary_ref!,
          ),
        );
  const clientCompatibilityMatrixRecord =
    manifest.client_compatibility_matrix_ref === null
      ? null
      : await optionalRead(() =>
          input.source.clientCompatibilityMatrixRepository.getClientCompatibilityMatrixById(
            manifest.client_compatibility_matrix_ref!,
          ),
        );
  const restoreDrillResultRecord =
    manifest.restore_drill_ref === null
      ? null
      : await optionalRead(() =>
          input.source.restoreDrillResultRepository.getRestoreDrillResultById(
            manifest.restore_drill_ref!,
          ),
        );
  const deploymentReleaseRecord =
    manifest.deployment_release_ref === null
      ? null
      : await optionalRead(() =>
          input.source.deploymentReleaseRepository.getDeploymentReleaseById(
            manifest.deployment_release_ref!,
          ),
        );

  for (const [label, record] of [
    ["candidate identity", candidateIdentityRecord],
    ["build artifact candidate", buildArtifactRecord],
    ["compatibility gate", compatibilityGateRecord],
    ["manifest assembly", manifestAssemblyRecord],
    ["canary summary", canaryHealthSummaryRecord],
    ["client compatibility matrix", clientCompatibilityMatrixRecord],
    ["restore drill result", restoreDrillResultRecord],
    ["deployment release", deploymentReleaseRecord],
  ] as const) {
    if (label === "build artifact candidate") {
      continue;
    }
    assertOptionalCandidateMirror({
      candidateIdentityHash,
      label,
      record,
    });
  }
  if (
    compatibilityGateRecord !== null &&
    compatibilityGateRecord.compatibility_gate_hash !== compatibilityGateHash
  ) {
    throw new ReleaseEvidenceQueryError(
      "RELEASE_EVIDENCE_COMPATIBILITY_GATE_MIXED_CANDIDATE",
      "compatibility gate record must mirror the manifest compatibility gate hash",
    );
  }
  if (
    clientCompatibilityMatrixRecord !== null &&
    clientCompatibilityMatrixRecord.compatibility_gate_hash !== compatibilityGateHash
  ) {
    throw new ReleaseEvidenceQueryError(
      "RELEASE_EVIDENCE_COMPATIBILITY_GATE_MIXED_CANDIDATE",
      "client compatibility matrix must mirror the manifest compatibility gate hash",
    );
  }

  const gateEvidenceBundles = await Promise.all(
    manifest.manifest_assembly_contract.gate_bindings.map(async (binding) => {
      const suiteResultRecord = await optionalRead(() =>
        input.source.verificationSuiteResultRepository.getVerificationSuiteResultById(
          binding.result_ref,
        ),
      );
      const admissibilityRecord = await optionalRead(() =>
        input.source.gateAdmissibilityRecordRepository.getGateAdmissibilityRecordById(
          binding.admissibility_ref,
        ),
      );
      assertOptionalCandidateMirror({
        candidateIdentityHash,
        label: `gate ${binding.gate_name} suite result`,
        record: suiteResultRecord,
      });
      assertOptionalCandidateMirror({
        candidateIdentityHash,
        label: `gate ${binding.gate_name} admissibility`,
        record: admissibilityRecord,
      });
      return {
        admissibility_ref: binding.admissibility_ref,
        admissibility_record_or_null: admissibilityRecord,
        binding,
        evidence_binding_state: gateBindingState({
          admissibilityRecord,
          suiteResultRecord,
        }),
        gate_name: binding.gate_name,
        result_ref: binding.result_ref,
        suite_result_record_or_null: suiteResultRecord,
      };
    }),
  );

  const companionEvidence = summarizeManifestCompanionEvidence({
    canaryHealthSummaryRecords:
      canaryHealthSummaryRecord === null ? [] : [canaryHealthSummaryRecord],
    clientCompatibilityMatrixRecords:
      clientCompatibilityMatrixRecord === null ? [] : [clientCompatibilityMatrixRecord],
    manifest,
    restoreDrillResultRecords:
      restoreDrillResultRecord === null ? [] : [restoreDrillResultRecord],
  });
  const bodyWithoutEtag = {
    artifact_type: "ReleaseVerificationManifestBundle" as const,
    build_artifact_record_or_null: buildArtifactRecord,
    canary_health_summary_record_or_null: canaryHealthSummaryRecord,
    candidate_identity_hash: candidateIdentityHash,
    client_compatibility_matrix_record_or_null: clientCompatibilityMatrixRecord,
    companion_evidence: companionEvidence,
    compatibility_gate_hash: compatibilityGateHash,
    compatibility_gate_record_or_null: compatibilityGateRecord,
    currentness_state: currentnessForManifest(manifestRecord),
    deployment_release_record_or_null: deploymentReleaseRecord,
    dto_version: RELEASE_EVIDENCE_QUERY_DTO_VERSION,
    gate_evidence_bundles: gateEvidenceBundles,
    manifest_assembly_record_or_null: manifestAssemblyRecord,
    missing_companion_evidence: companionEvidence.filter((entry) =>
      entry.availability_state.startsWith("MISSING"),
    ),
    read_key: {
      key_type: "verification_manifest_id" as const,
      verification_manifest_id: manifest.verification_manifest_id,
    },
    release_verification_manifest_record: manifestRecord,
    restore_drill_result_record_or_null: restoreDrillResultRecord,
    source_contract_availability: {
      build_artifact_record:
        buildArtifactRecord === null ? "MISSING" : ("AVAILABLE" as const),
      compatibility_gate_record:
        compatibilityGateRecord === null ? "MISSING" : ("AVAILABLE" as const),
      manifest_assembly_record:
        manifestAssemblyRecord === null ? "MISSING" : ("AVAILABLE" as const),
    },
    superseded_by_verification_manifest_ref:
      manifest.superseded_by_verification_manifest_ref,
  };
  return {
    ...bodyWithoutEtag,
    etag: deriveReleaseEvidenceEtag(bodyWithoutEtag),
  };
}
