import type {
  StoredDeploymentReleaseRecord,
} from "../repositories/deployment_release_repository.ts";
import {
  deriveReleaseEvidenceEtag,
  getReleaseCandidateIdentityBundle,
  RELEASE_EVIDENCE_QUERY_DTO_VERSION,
  type ReleaseCandidateIdentityBundle,
  type ReleaseEvidenceBundleSource,
  type ReleaseEvidenceReadKey,
  ReleaseEvidenceQueryError,
} from "./get_release_candidate_identity_bundle.ts";
import {
  getReleaseVerificationManifestBundle,
  type ReleaseVerificationManifestBundle,
} from "./get_release_verification_manifest_bundle.ts";

export type DeploymentReleaseEvidenceBundle = {
  artifact_type: "DeploymentReleaseEvidenceBundle";
  candidate_identity_bundle: ReleaseCandidateIdentityBundle;
  candidate_identity_hash: string;
  deployment_release_record: StoredDeploymentReleaseRecord;
  dto_version: typeof RELEASE_EVIDENCE_QUERY_DTO_VERSION;
  etag: string;
  read_key: Extract<ReleaseEvidenceReadKey, { key_type: "release_id" }>;
  release_id: string;
  release_verification_manifest_bundle_or_null: ReleaseVerificationManifestBundle | null;
};

export async function getDeploymentReleaseBundle(input: {
  release_id: string;
  source: ReleaseEvidenceBundleSource;
}): Promise<DeploymentReleaseEvidenceBundle> {
  const deploymentReleaseRecord =
    await input.source.deploymentReleaseRepository.getDeploymentReleaseById(
      input.release_id,
    );
  const candidateIdentityHash = deploymentReleaseRecord.candidate_identity_hash;
  const manifestRecords =
    await input.source.releaseVerificationManifestRepository.listReleaseVerificationManifests(
      {
        candidate_identity_hash: candidateIdentityHash,
        deployment_release_ref: deploymentReleaseRecord.deployment_release_ref,
      },
    );
  const releaseVerificationManifestBundle =
    manifestRecords.length === 0
      ? null
      : await getReleaseVerificationManifestBundle({
          source: input.source,
          verification_manifest_id:
            manifestRecords[manifestRecords.length - 1]!.verification_manifest_id,
        });
  if (
    releaseVerificationManifestBundle !== null &&
    releaseVerificationManifestBundle.candidate_identity_hash !== candidateIdentityHash
  ) {
    throw new ReleaseEvidenceQueryError(
      "RELEASE_EVIDENCE_MANIFEST_MIXED_CANDIDATE",
      "deployment release manifest bundle must mirror deployment release candidate_identity_hash",
    );
  }
  const candidateIdentityBundle = await getReleaseCandidateIdentityBundle({
    candidate_identity_hash: candidateIdentityHash,
    source: input.source,
  });
  const bodyWithoutEtag = {
    artifact_type: "DeploymentReleaseEvidenceBundle" as const,
    candidate_identity_bundle: candidateIdentityBundle,
    candidate_identity_hash: candidateIdentityHash,
    deployment_release_record: deploymentReleaseRecord,
    dto_version: RELEASE_EVIDENCE_QUERY_DTO_VERSION,
    read_key: {
      key_type: "release_id" as const,
      release_id: deploymentReleaseRecord.release_id,
    },
    release_id: deploymentReleaseRecord.release_id,
    release_verification_manifest_bundle_or_null:
      releaseVerificationManifestBundle,
  };
  return {
    ...bodyWithoutEtag,
    etag: deriveReleaseEvidenceEtag(bodyWithoutEtag),
  };
}
