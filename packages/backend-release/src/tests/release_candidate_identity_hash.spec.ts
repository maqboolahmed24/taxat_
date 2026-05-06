import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  buildArtifactRef,
  BuildArtifactRepository,
  deriveCandidateIdentityContract,
  deriveCandidateIdentityHash,
  persistBuildArtifactAndCandidateTuple,
  type BuildArtifactDraft,
} from "../index.ts";

const baseBuildArtifact = {
  artifact_digest:
    "sha256:pc0219b8a907775aeb31c49363ee96508f756d6273c42eda8a99694c7cf6cef62cd1d",
  artifact_registry_ref:
    "ghcr.io/taxat/preprod/server/api@sha256:pc0219b8a907775aeb31c49363ee96508f756d6273c42eda8a99694c7cf6cef62cd1d",
  build_id: "build.pc0219.preprod.0002",
  build_time: "2026-05-05T09:15:00Z",
  desktop_notarization_ref: null,
  distribution_targets: ["SERVER"],
  hardened_runtime_attestation_ref: null,
  provenance_ref: "evidence://provenance/pc0219-candidate",
  release_channel: "PREPRODUCTION",
  sbom_ref: "evidence://sbom/pc0219-candidate",
  signature_ref: "evidence://signature/pc0219-candidate",
  vcs_ref: "release/1.4.0",
} satisfies BuildArtifactDraft;

const candidateTupleInput = {
  candidate_environment_ref: "candidate-env.preproduction.pc0219",
  config_bundle_hash: "config-bundle-hash.pc0219",
  enabled_provider_profile_refs: ["provider.sigstore.keyless", "provider.github-actions.oidc"],
  migration_plan_ref_or_null: null,
  schema_bundle_hash: "schema-bundle-hash.pc0219",
  supported_client_window_ref_or_null: "client-window.operator.stable",
};

test("derives a stable candidate hash from the canonical tuple and sorted provider profiles", async () => {
  const first = deriveCandidateIdentityContract({
    ...candidateTupleInput,
    artifact_digest: baseBuildArtifact.artifact_digest,
    build_artifact_ref: baseBuildArtifact.build_id,
  });
  const reordered = deriveCandidateIdentityContract({
    ...candidateTupleInput,
    artifact_digest: baseBuildArtifact.artifact_digest,
    build_artifact_ref: baseBuildArtifact.build_id,
    enabled_provider_profile_refs: [
      "provider.github-actions.oidc",
      "provider.sigstore.keyless",
    ],
  });

  expect(first.enabled_provider_profile_refs).toEqual([
    "provider.github-actions.oidc",
    "provider.sigstore.keyless",
  ]);
  expect(reordered.candidate_identity_hash).toBe(first.candidate_identity_hash);
  expect(deriveCandidateIdentityHash(first)).toBe(first.candidate_identity_hash);
  expect(() =>
    deriveCandidateIdentityContract({
      ...candidateTupleInput,
      artifact_digest: baseBuildArtifact.artifact_digest,
      build_artifact_ref: baseBuildArtifact.build_id,
      enabled_provider_profile_refs: [
        "provider.github-actions.oidc",
        "provider.github-actions.oidc",
      ],
    }),
  ).toThrow();

  await validateContractSchema("release_candidate_identity_contract", first);
});

test("persists the build artifact and queryable candidate tuple without hashing write-time noise", async () => {
  const repository = new BuildArtifactRepository();
  const first = await persistBuildArtifactAndCandidateTuple({
    build_artifact: baseBuildArtifact,
    candidate_identity_input: candidateTupleInput,
    persisted_at: "2026-05-05T09:20:00Z",
    repository,
  });
  const idempotent = await persistBuildArtifactAndCandidateTuple({
    build_artifact: baseBuildArtifact,
    candidate_identity_input: candidateTupleInput,
    persisted_at: "2026-05-05T09:25:00Z",
    repository,
  });

  expect(first.build_artifact.build_artifact_ref).toBe(buildArtifactRef(baseBuildArtifact));
  expect(first.release_candidate_identity.build_artifact_ref).toBe(
    first.build_artifact.build_artifact_ref,
  );
  expect(first.release_candidate_identity.artifact_digest).toBe(
    first.build_artifact.artifact_digest,
  );
  expect(idempotent.release_candidate_identity.candidate_identity_hash).toBe(
    first.release_candidate_identity.candidate_identity_hash,
  );
  expect(idempotent.release_candidate_identity.persisted_at).toBe(
    first.release_candidate_identity.persisted_at,
  );
  expect(
    await repository.getReleaseCandidateIdentityContractByHash(
      first.release_candidate_identity.candidate_identity_hash,
    ),
  ).toMatchObject({
    candidate_identity_hash: first.release_candidate_identity.candidate_identity_hash,
    build_artifact_ref: baseBuildArtifact.build_id,
  });
  expect(
    await repository.listReleaseCandidateIdentityContracts({
      build_artifact_ref: baseBuildArtifact.build_id,
      schema_bundle_hash: candidateTupleInput.schema_bundle_hash,
    }),
  ).toHaveLength(1);

  await validateContractSchema(
    "build_artifact",
    first.build_artifact.build_artifact,
  );
  await validateContractSchema(
    "release_candidate_identity_contract",
    first.release_candidate_identity.release_candidate_identity_contract,
  );
});

test("fails closed when candidate tuple fields drift from the persisted build artifact", async () => {
  const repository = new BuildArtifactRepository();
  await expect(
    persistBuildArtifactAndCandidateTuple({
      build_artifact: baseBuildArtifact,
      candidate_identity_input: {
        ...candidateTupleInput,
        artifact_digest: "sha256:wrong-digest",
      },
      persisted_at: "2026-05-05T09:30:00Z",
      repository,
    }),
  ).rejects.toThrow("RELEASE_CANDIDATE_ARTIFACT_DIGEST_MISMATCH");

  const validContract = deriveCandidateIdentityContract({
    ...candidateTupleInput,
    artifact_digest: baseBuildArtifact.artifact_digest,
    build_artifact_ref: baseBuildArtifact.build_id,
  });
  await expect(
    repository.persistReleaseCandidateIdentityContract({
      persisted_at: "2026-05-05T09:35:00Z",
      release_candidate_identity_contract: {
        ...validContract,
        candidate_identity_hash: "stale-candidate-hash",
      },
    }),
  ).rejects.toThrow("RELEASE_CANDIDATE_CONTRACT_HASH_MISMATCH");
});
