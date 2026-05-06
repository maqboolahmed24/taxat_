import { expect, test } from "@playwright/test";

import {
  deriveReleaseIdentity,
  type ReleaseIdentityInput,
} from "../../../scripts/release/derive_release_identity.ts";
import { renderArtifactNames } from "../../../scripts/release/render_artifact_names.ts";

function createReleaseIdentityInput(
  overrides: Partial<ReleaseIdentityInput> = {},
): ReleaseIdentityInput {
  return {
    artifactDigest: "878a907775aeb31c49363ee96508f756d6273c42eda8a99694c7cf6cef62cd1d",
    branchRef: "release/1.4.0",
    configBundleHash: "5ca5ae7efb64c77371a14d8dd846772a33e5b70f256e12e741324ef5734ee3a0",
    enabledProviderProfileRefs: ["provider.github-actions.oidc", "provider.sigstore.keyless"],
    requestedReleaseChannel: "PREPRODUCTION",
    rolloutStrategyRef: "STANDARD_CANARY",
    sourceRevision: "f4d31d6b2f43f1d29c0b1544f1d7ee30e7de8abc",
    supportedClientWindowRefOrNull: "client-window.operator.stable",
    versionSeed: {
      channelIterationOrNull: 2,
      hotfixIterationOrNull: null,
      major: 1,
      minor: 4,
      patch: 0,
    },
    buildMetadata: {
      buildSequence: 17,
      buildTimestamp: "2026-04-23T10:45:30Z",
      canaryAbortedReleaseIdOrNull: null,
      compensatingReleaseIdOrNull: null,
      compatibilityVerdictRef: "ROLLBACK_SAFE",
      emergencyOverrideExpiresAtOrNull: null,
      emergencyOverrideRefOrNull: null,
      failForwardOwnerRefOrNull: null,
      pinnedBaselineReleaseIdOrNull: null,
      schemaBundleHash: "95b977085cc49325a17ae82e81d2e151f57d228682a538b3e3191e9c2d218b7d",
    },
    migrationPlanRefOrNull: null,
    ...overrides,
  };
}

test("release identity derivation stays deterministic for identical inputs", async () => {
  const input = createReleaseIdentityInput();
  const [first, second] = await Promise.all([
    deriveReleaseIdentity(input),
    deriveReleaseIdentity(input),
  ]);

  expect(second).toEqual(first);
  expect(first.build.build_id).toContain("preprod");
  expect(first.version.human_version).toContain("1.4.0-rc.2+");
  expect(first.candidate_identity_contract.candidate_identity_hash).toHaveLength(64);
});

test("same commit built for two release channels diverges in version and candidate identity", async () => {
  const sandboxInput = createReleaseIdentityInput({
    requestedReleaseChannel: "SANDBOX",
    branchRef: "dev",
  });
  const productionInput = createReleaseIdentityInput({
    requestedReleaseChannel: "PRODUCTION",
    branchRef: "main",
    versionSeed: {
      channelIterationOrNull: null,
      hotfixIterationOrNull: null,
      major: 1,
      minor: 4,
      patch: 0,
    },
  });

  const [sandboxIdentity, productionIdentity] = await Promise.all([
    deriveReleaseIdentity(sandboxInput),
    deriveReleaseIdentity(productionInput),
  ]);

  expect(sandboxIdentity.build.build_id).not.toBe(productionIdentity.build.build_id);
  expect(sandboxIdentity.version.human_version).not.toBe(productionIdentity.version.human_version);
  expect(sandboxIdentity.candidate_identity_contract.candidate_identity_hash).not.toBe(
    productionIdentity.candidate_identity_contract.candidate_identity_hash,
  );
});

test("hotfix pinned baseline releases surface hotfix and pin lineage in build metadata", async () => {
  const identity = await deriveReleaseIdentity(
    createReleaseIdentityInput({
      branchRef: "hotfix/1.4.1--vat-rounding-fix",
      requestedReleaseChannel: "PRODUCTION",
      rolloutStrategyRef: "PIN_BASELINE",
      versionSeed: {
        channelIterationOrNull: null,
        hotfixIterationOrNull: 1,
        major: 1,
        minor: 4,
        patch: 1,
      },
      buildMetadata: {
        buildSequence: 22,
        buildTimestamp: "2026-04-23T11:10:00Z",
        canaryAbortedReleaseIdOrNull: "release.prod.2026.04.22.3",
        compensatingReleaseIdOrNull: null,
        compatibilityVerdictRef: "ROLLBACK_SAFE",
        emergencyOverrideExpiresAtOrNull: null,
        emergencyOverrideRefOrNull: null,
        failForwardOwnerRefOrNull: null,
        pinnedBaselineReleaseIdOrNull: "release.prod.2026.04.18.7",
        schemaBundleHash: "95b977085cc49325a17ae82e81d2e151f57d228682a538b3e3191e9c2d218b7d",
      },
    }),
  );

  expect(identity.branch.branch_family_ref).toBe("HOTFIX");
  expect(identity.version.human_version).toContain("prod");
  expect(identity.version.build_metadata_tokens).toContain("hf1");
  expect(
    identity.version.build_metadata_tokens.some((token) => token.startsWith("pin")),
  ).toBeTruthy();
  expect(identity.rollout.posture_marker).toBe("pin");
});

test("config-only changes keep code revision stable but still change candidate and artifact names", async () => {
  const baseInput = createReleaseIdentityInput();
  const configChangeInput = createReleaseIdentityInput({
    configBundleHash: "9be1412ea1af514d7f6017f1abf90a7d2a7c39b510f5e5c13f412cbfe55c1100",
  });

  const [baseIdentity, changedIdentity, baseArtifacts, changedArtifacts] = await Promise.all([
    deriveReleaseIdentity(baseInput),
    deriveReleaseIdentity(configChangeInput),
    renderArtifactNames(baseInput),
    renderArtifactNames(configChangeInput),
  ]);

  expect(baseIdentity.build.source_revision).toBe(changedIdentity.build.source_revision);
  expect(baseIdentity.candidate_identity_contract.candidate_identity_hash).not.toBe(
    changedIdentity.candidate_identity_contract.candidate_identity_hash,
  );
  const basePrimary = baseArtifacts.primary_artifacts.at(0);
  const changedPrimary = changedArtifacts.primary_artifacts.at(0);
  expect(basePrimary).toBeTruthy();
  expect(changedPrimary).toBeTruthy();
  expect(basePrimary?.filename).not.toBe(changedPrimary?.filename);
});

test("duplicate provider profile refs fail closed before candidate identity derivation", async () => {
  await expect(
    deriveReleaseIdentity(
      createReleaseIdentityInput({
        enabledProviderProfileRefs: [
          "provider.github-actions.oidc",
          "provider.github-actions.oidc",
        ],
      }),
    ),
  ).rejects.toThrow("Provider profile refs must be unique before candidate hashing");
});

test("rendered artifact plan stays collision-free across primary and evidence coordinates", async () => {
  const rendered = await renderArtifactNames(createReleaseIdentityInput());
  const refs = rendered.primary_artifacts.flatMap((artifact) => [
    artifact.artifact_registry_ref,
    artifact.discovery_tag_ref,
    artifact.filename,
    artifact.companions.sbom_ref,
    artifact.companions.provenance_ref,
    artifact.companions.signature_ref,
  ]);

  expect(new Set(refs).size).toBe(refs.length);
  expect(rendered.release_verification_manifest.filename).toContain(
    "release-verification-manifest",
  );
});
