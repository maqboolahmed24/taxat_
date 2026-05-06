import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  assertBuildArtifactRecord,
  BuildArtifactModelError,
  BuildArtifactRepository,
  BuildArtifactRepositoryError,
  normalizeBuildArtifactRecord,
  type BuildArtifactDraft,
} from "../index.ts";

function buildArtifactFixture(overrides: Partial<BuildArtifactDraft> = {}): BuildArtifactDraft {
  return {
    artifact_digest:
      "sha256:pc0219a8a907775aeb31c49363ee96508f756d6273c42eda8a99694c7cf6cef62cd1d",
    artifact_registry_ref:
      "ghcr.io/taxat/preprod/server/api@sha256:pc0219a8a907775aeb31c49363ee96508f756d6273c42eda8a99694c7cf6cef62cd1d",
    build_id: "build.pc0219.preprod.0001",
    build_time: "2026-05-05T08:15:00+00:00",
    desktop_notarization_ref: "evidence://notary/pc0219",
    distribution_targets: ["MACOS_DESKTOP", "SERVER", "WEB_OPERATOR_SHELL", "SERVER"],
    hardened_runtime_attestation_ref: "evidence://hardened-runtime/pc0219",
    provenance_ref: "evidence://provenance/pc0219",
    release_channel: "PREPRODUCTION",
    sbom_ref: "evidence://sbom/pc0219",
    signature_ref: "evidence://signature/pc0219",
    vcs_ref: "release/1.4.0",
    ...overrides,
  };
}

test("normalizes build artifacts into schema-valid canonical distribution target order", async () => {
  const artifact = normalizeBuildArtifactRecord(buildArtifactFixture());

  expect(artifact.distribution_targets).toEqual([
    "SERVER",
    "WEB_OPERATOR_SHELL",
    "MACOS_DESKTOP",
  ]);
  expect(artifact.build_time).toBe("2026-05-05T08:15:00Z");
  expect(artifact.desktop_notarization_ref).toBe("evidence://notary/pc0219");
  expect(artifact.hardened_runtime_attestation_ref).toBe(
    "evidence://hardened-runtime/pc0219",
  );
  expect(() =>
    assertBuildArtifactRecord({
      ...artifact,
      distribution_targets: ["MACOS_DESKTOP", "SERVER"],
    }),
  ).toThrow(BuildArtifactModelError);

  await validateContractSchema("build_artifact", artifact);
});

test("clears desktop-only evidence for non-desktop builds and fails closed for desktop omissions", async () => {
  const webArtifact = normalizeBuildArtifactRecord(
    buildArtifactFixture({
      artifact_registry_ref:
        "ghcr.io/taxat/preprod/web/operator-web@sha256:pc0219web907775aeb31c49363ee96508f756d6273c42eda8a99694c7cf6cef62cd1d",
      build_id: "build.pc0219.web.0001",
      distribution_targets: ["WEB_OPERATOR_SHELL"],
      desktop_notarization_ref: "stale-notary-ref",
      hardened_runtime_attestation_ref: "stale-hardened-ref",
    }),
  );

  expect(webArtifact.distribution_targets).toEqual(["WEB_OPERATOR_SHELL"]);
  expect(webArtifact.desktop_notarization_ref).toBeNull();
  expect(webArtifact.hardened_runtime_attestation_ref).toBeNull();
  expect(() =>
    assertBuildArtifactRecord({
      ...webArtifact,
      desktop_notarization_ref: "stale-notary-ref",
    }),
  ).toThrow(BuildArtifactModelError);
  expect(() =>
    normalizeBuildArtifactRecord(
      buildArtifactFixture({
        desktop_notarization_ref: null,
        distribution_targets: ["MACOS_DESKTOP"],
      }),
    ),
  ).toThrow(BuildArtifactModelError);

  await validateContractSchema("build_artifact", webArtifact);
});

test("persists build artifacts as immutable first-class release records", async () => {
  const repository = new BuildArtifactRepository();
  const artifact = normalizeBuildArtifactRecord(buildArtifactFixture());
  const stored = await repository.persistBuildArtifact({
    build_artifact: artifact,
    persisted_at: "2026-05-05T08:20:00Z",
  });
  const idempotent = await repository.persistBuildArtifact({
    build_artifact: artifact,
    persisted_at: "2026-05-05T08:25:00Z",
  });

  expect(stored.build_artifact_ref).toBe(artifact.build_id);
  expect(idempotent.persisted_at).toBe(stored.persisted_at);
  expect(
    await repository.listBuildArtifacts({
      distribution_target: "MACOS_DESKTOP",
      release_channel: "PREPRODUCTION",
    }),
  ).toHaveLength(1);
  await expect(
    repository.persistBuildArtifact({
      build_artifact: {
        ...artifact,
        artifact_digest: "sha256:different-pc0219-digest",
      },
      persisted_at: "2026-05-05T08:26:00Z",
    }),
  ).rejects.toThrow(BuildArtifactRepositoryError);
});
