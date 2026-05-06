import type { BuildReleaseCandidateIdentityContractInput } from "../../../backend-manifest/src/index.ts";
import type { BuildArtifactDraft, BuildArtifactRecord } from "../models/build_artifact.ts";
import { buildArtifactRef, normalizeBuildArtifactRecord } from "../models/build_artifact.ts";
import { buildReleaseCandidateIdentityContract } from "../models/release_candidate_identity_contract.ts";
import type {
  BuildArtifactRepository,
  StoredBuildArtifactRecord,
  StoredReleaseCandidateIdentityContractRecord,
} from "../repositories/build_artifact_repository.ts";

export type PersistBuildArtifactCandidateTupleInput = {
  repository: BuildArtifactRepository;
  build_artifact: BuildArtifactDraft | BuildArtifactRecord;
  candidate_identity_input: Omit<
    BuildReleaseCandidateIdentityContractInput,
    "build_artifact_ref" | "artifact_digest"
  > & {
    build_artifact_ref?: unknown;
    artifact_digest?: unknown;
  };
  persisted_at: string;
  candidate_tuple_persisted_at?: string;
};

export type PersistBuildArtifactCandidateTupleResult = {
  build_artifact: StoredBuildArtifactRecord;
  release_candidate_identity: StoredReleaseCandidateIdentityContractRecord;
};

export class PersistBuildArtifactCandidateTupleError extends Error {
  readonly code:
    | "RELEASE_CANDIDATE_BUILD_ARTIFACT_REF_MISMATCH"
    | "RELEASE_CANDIDATE_ARTIFACT_DIGEST_MISMATCH";

  constructor(
    code: PersistBuildArtifactCandidateTupleError["code"],
    detail: string,
  ) {
    super(`${code}: ${detail}`);
    this.name = "PersistBuildArtifactCandidateTupleError";
    this.code = code;
  }
}

export async function persistBuildArtifactAndCandidateTuple(
  input: PersistBuildArtifactCandidateTupleInput,
): Promise<PersistBuildArtifactCandidateTupleResult> {
  const buildArtifact = normalizeBuildArtifactRecord(input.build_artifact);
  const expectedBuildArtifactRef = buildArtifactRef(buildArtifact);
  if (
    typeof input.candidate_identity_input.build_artifact_ref !== "undefined" &&
    input.candidate_identity_input.build_artifact_ref !== expectedBuildArtifactRef
  ) {
    throw new PersistBuildArtifactCandidateTupleError(
      "RELEASE_CANDIDATE_BUILD_ARTIFACT_REF_MISMATCH",
      "candidate_identity_input.build_artifact_ref must match the persisted BuildArtifact.build_id",
    );
  }
  if (
    typeof input.candidate_identity_input.artifact_digest !== "undefined" &&
    input.candidate_identity_input.artifact_digest !== buildArtifact.artifact_digest
  ) {
    throw new PersistBuildArtifactCandidateTupleError(
      "RELEASE_CANDIDATE_ARTIFACT_DIGEST_MISMATCH",
      "candidate_identity_input.artifact_digest must match BuildArtifact.artifact_digest",
    );
  }

  const candidateIdentityContract = buildReleaseCandidateIdentityContract({
    ...input.candidate_identity_input,
    build_artifact_ref: expectedBuildArtifactRef,
    artifact_digest: buildArtifact.artifact_digest,
  });

  const storedBuildArtifact = await input.repository.persistBuildArtifact({
    build_artifact: buildArtifact,
    persisted_at: input.persisted_at,
  });
  const storedCandidateIdentity =
    await input.repository.persistReleaseCandidateIdentityContract({
      release_candidate_identity_contract: candidateIdentityContract,
      persisted_at: input.candidate_tuple_persisted_at ?? input.persisted_at,
    });

  return {
    build_artifact: storedBuildArtifact,
    release_candidate_identity: storedCandidateIdentity,
  };
}
