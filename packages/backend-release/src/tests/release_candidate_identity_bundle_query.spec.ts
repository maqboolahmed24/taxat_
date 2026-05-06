import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  getReleaseCandidateIdentityBundle,
  getReleaseVerificationManifestBundle,
  ReleaseEvidenceQueryError,
} from "../index.ts";
import { releaseEvidenceFixture } from "./release_candidate_evidence_test_fixtures.ts";

test("queries a coherent candidate identity bundle by persisted candidate hash", async () => {
  const fixture = await releaseEvidenceFixture({
    includeSupersededManifest: true,
  });
  const bundle = await getReleaseCandidateIdentityBundle({
    candidate_identity_hash: fixture.candidate.candidate_identity_hash,
    source: fixture.source,
  });

  expect(bundle.artifact_type).toBe("ReleaseCandidateIdentityBundle");
  expect(bundle.read_key).toMatchObject({
    candidate_identity_hash: fixture.candidate.candidate_identity_hash,
    key_type: "candidate_identity_hash",
  });
  expect(bundle.candidate_identity_record.candidate_identity_hash).toBe(
    fixture.candidate.candidate_identity_hash,
  );
  expect(bundle.build_artifact_record_or_null?.build_artifact_ref).toBe(
    fixture.candidate.build_artifact_ref,
  );
  expect(bundle.compatibility_gate_records).toHaveLength(1);
  expect(bundle.manifest_assembly_records).toHaveLength(2);
  expect(bundle.release_verification_manifest_records).toHaveLength(2);
  expect(bundle.manifest_lineage).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        supersession_state: "CURRENT",
        verification_manifest_id: fixture.currentManifestId,
      }),
      expect.objectContaining({
        superseded_by_verification_manifest_ref: fixture.currentManifestId,
        supersession_state: "SUPERSEDED",
        verification_manifest_id: fixture.supersededManifestId,
      }),
    ]),
  );
  expect(bundle.verification_suite_result_records).toHaveLength(1);
  expect(bundle.gate_admissibility_records).toHaveLength(1);
  expect(bundle.client_compatibility_matrix_records).toHaveLength(1);
  expect(bundle.canary_health_summary_records).toHaveLength(1);
  expect(bundle.deployment_release_records).toHaveLength(1);
  expect(bundle.companion_evidence).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        availability_state: "AVAILABLE",
        evidence_kind: "CANARY_SUMMARY",
        verification_manifest_id: fixture.currentManifestId,
      }),
      expect.objectContaining({
        availability_state: "AVAILABLE",
        evidence_kind: "CLIENT_COMPATIBILITY_MATRIX",
        verification_manifest_id: fixture.currentManifestId,
      }),
      expect.objectContaining({
        availability_state: "MISSING_RECORD",
        evidence_kind: "RESTORE_DRILL",
        verification_manifest_id: fixture.currentManifestId,
      }),
    ]),
  );
  expect(bundle.etag).toMatch(/^"release-evidence\.[a-f0-9]{64}"$/);
  await validateContractSchema("release_verification_manifest", fixture.currentManifest);
});

test("keeps superseded manifests inspectable and missing companion records explicit", async () => {
  const fixture = await releaseEvidenceFixture({
    includeSupersededManifest: true,
    persistCanaryAndClientCompanions: false,
  });

  const current = await getReleaseVerificationManifestBundle({
    source: fixture.source,
    verification_manifest_id: fixture.currentManifestId,
  });
  const superseded = await getReleaseVerificationManifestBundle({
    source: fixture.source,
    verification_manifest_id: fixture.supersededManifestId,
  });

  expect(current.currentness_state).toBe("CURRENT");
  expect(current.missing_companion_evidence).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        availability_state: "MISSING_RECORD",
        evidence_kind: "CANARY_SUMMARY",
      }),
      expect.objectContaining({
        availability_state: "MISSING_RECORD",
        evidence_kind: "CLIENT_COMPATIBILITY_MATRIX",
      }),
      expect.objectContaining({
        availability_state: "MISSING_RECORD",
        evidence_kind: "RESTORE_DRILL",
      }),
    ]),
  );
  expect(superseded.currentness_state).toBe("SUPERSEDED");
  expect(superseded.superseded_by_verification_manifest_ref).toBe(
    fixture.currentManifestId,
  );
});

test("fails closed for mixed-candidate manifest evidence and exact compatibility-gate misses", async () => {
  const fixture = await releaseEvidenceFixture();
  const badManifest = structuredClone(fixture.currentManifest);
  badManifest.blocking_gates.schema_compatibility.candidate_identity_hash =
    "candidate-hash://pc0227/other";
  const badSource = {
    ...fixture.source,
    releaseVerificationManifestRepository: {
      getReleaseVerificationManifestById: async () => ({
        candidate_identity_hash: fixture.candidate.candidate_identity_hash,
        compatibility_gate_hash: fixture.compatibilityGate.compatibility_gate_hash,
        created_at: fixture.currentManifest.created_at,
        decision_state: fixture.currentManifest.decision_state,
        persisted_at: "2026-05-05T20:30:00Z",
        release_verification_manifest: badManifest,
        superseded_by_verification_manifest_ref:
          fixture.currentManifest.superseded_by_verification_manifest_ref,
        verification_manifest_id: fixture.currentManifestId,
        verification_manifest_ref: fixture.currentManifestId,
      }),
      listReleaseVerificationManifests: async () => [],
    },
  };

  await expect(
    getReleaseVerificationManifestBundle({
      source: badSource,
      verification_manifest_id: fixture.currentManifestId,
    }),
  ).rejects.toThrow(ReleaseEvidenceQueryError);

  await expect(
    getReleaseCandidateIdentityBundle({
      candidate_identity_hash: fixture.candidate.candidate_identity_hash,
      compatibility_gate_hash: "compatibility-gate-hash://pc0227/missing",
      source: fixture.source,
    }),
  ).rejects.toThrow(/does not exist/);
});
