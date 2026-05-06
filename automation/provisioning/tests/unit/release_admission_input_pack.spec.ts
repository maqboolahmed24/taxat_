import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import {
  createBuildTargetCatalog,
  createReleaseAdmissionInputPack,
  createReleaseSupplyChainAtlasViewModel,
  evaluateReleaseAdmissionEvidence,
  validateReleaseAdmissionInputPack,
  type AdmissionEvidenceEnvelope,
  type ReleaseAdmissionInputPack,
  type ReleaseSupplyChainAtlasViewModel,
} from "../../../../infra/supplychain/bootstrap/provision_registry_signing_and_attestation.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

async function readJson<T>(segments: string[]): Promise<T> {
  return JSON.parse(await readFile(path.join(repoRoot, ...segments), "utf8")) as T;
}

function digest(seed: string): string {
  return `sha256:${seed.repeat(64).slice(0, 64)}`;
}

function createBaseEnvelope(
  targetRef: string,
  subjectReference: string,
): AdmissionEvidenceEnvelope {
  const subjectDigest = subjectReference.includes("@")
    ? subjectReference.slice(subjectReference.lastIndexOf("@") + 1)
    : null;

  return {
    target_ref: targetRef,
    candidate_hash: digest("c"),
    subject_reference: subjectReference,
    signature_verified: true,
    signature_trust_root_ref_or_null: "trust_root.sigstore.fulcio.github-oidc",
    provenance_ref_or_null: "oci://ghcr.io/taxat/evidence/provenance/example",
    sbom_ref_or_null: "oci://ghcr.io/taxat/evidence/sbom/example",
    notarization_ref_or_null: "notarization://taxat/operator-client/example",
    vulnerability_gate: "PASS",
    source_revision: "git:refs/heads/dev@abc1234",
    dependency_lock_ref: "sha256:lockcafedeadbeeflockcafedeadbeeflockcafedeadbeeflockcafe",
    schema_bundle_hash_or_null: digest("d"),
    workflow_run_ref: "github://taxat/actions/runs/123456",
    builder_identity: "repo:taxat/taxat_:ref:refs/heads/dev",
    builder_identity_verified: true,
    signature_subject_digest_or_null: subjectDigest,
    provenance_subject_digest_or_null: subjectDigest,
    sbom_subject_digest_or_null: subjectDigest,
    notarization_subject_digest_or_null: subjectDigest,
    attested_candidate_hashes: [digest("c")],
  };
}

test("checked-in release admission pack and sample atlas match the builder", async () => {
  const persistedPack = await readJson<ReleaseAdmissionInputPack>([
    "config",
    "supplychain",
    "release_admission_input_pack.json",
  ]);
  const sampleRun = await readJson<{
    releaseSupplyChainAtlas: ReleaseSupplyChainAtlasViewModel;
  }>(["automation", "provisioning", "report_viewer", "data", "sample_run.json"]);

  expect(persistedPack).toEqual(createReleaseAdmissionInputPack());
  expect(sampleRun.releaseSupplyChainAtlas).toEqual(createReleaseSupplyChainAtlasViewModel());
});

test("release admission rules reject tag-only refs, mixed-candidate evidence, and missing macOS notarization", () => {
  const pack = createReleaseAdmissionInputPack();
  const catalog = createBuildTargetCatalog();
  validateReleaseAdmissionInputPack(pack, catalog);

  const apiDigest = digest("a");
  const apiReference = `ghcr.io/taxat/prod/server/northbound-api@${apiDigest}`;
  const baseApiEnvelope = createBaseEnvelope("target.northbound-api-session-gateway", apiReference);

  const tagOnlyEvaluation = evaluateReleaseAdmissionEvidence(pack, catalog, {
    ...baseApiEnvelope,
    subject_reference: "ghcr.io/taxat/prod/server/northbound-api:stable",
    signature_subject_digest_or_null: null,
    provenance_subject_digest_or_null: null,
    sbom_subject_digest_or_null: null,
  });
  expect(tagOnlyEvaluation.admissible).toBe(false);
  expect(tagOnlyEvaluation.reasons).toContain("TAG_ONLY_REFERENCE_NOT_ADMISSIBLE");

  const mixedCandidateEvaluation = evaluateReleaseAdmissionEvidence(pack, catalog, {
    ...baseApiEnvelope,
    attested_candidate_hashes: [digest("c"), digest("e")],
  });
  expect(mixedCandidateEvaluation.admissible).toBe(false);
  expect(mixedCandidateEvaluation.reasons).toContain("MIXED_CANDIDATE_EVIDENCE");

  const nativeDigest = digest("b");
  const nativeReference = `ghcr.io/taxat/prod/native/operator-client@${nativeDigest}`;
  const missingNotarizationEvaluation = evaluateReleaseAdmissionEvidence(pack, catalog, {
    ...createBaseEnvelope("target.native-macos-operator-client", nativeReference),
    notarization_ref_or_null: null,
    notarization_subject_digest_or_null: null,
  });
  expect(missingNotarizationEvaluation.admissible).toBe(false);
  expect(missingNotarizationEvaluation.reasons).toContain("NOTARIZATION_REQUIRED");
});
