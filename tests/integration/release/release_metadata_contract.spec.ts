import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  deriveReleaseIdentity,
  type ReleaseIdentityInput,
} from "../../../scripts/release/derive_release_identity.ts";
import {
  renderArtifactNames,
  type RenderedReleaseArtifactPlan,
} from "../../../scripts/release/render_artifact_names.ts";
import {
  validateReleaseMetadata,
  type ReleaseMetadataEnvelope,
} from "../../../scripts/release/validate_release_metadata.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const deriveScript = path.join(repoRoot, "scripts/release/derive_release_identity.ts");
const renderScript = path.join(repoRoot, "scripts/release/render_artifact_names.ts");
const validateScript = path.join(repoRoot, "scripts/release/validate_release_metadata.ts");

function createReleaseIdentityInput(
  overrides: Partial<ReleaseIdentityInput> = {},
): ReleaseIdentityInput {
  return {
    artifactDigest: "878a907775aeb31c49363ee96508f756d6273c42eda8a99694c7cf6cef62cd1d",
    branchRef: "release/1.4.0",
    configBundleHash: "5ca5ae7efb64c77371a14d8dd846772a33e5b70f256e12e741324ef5734ee3a0",
    enabledProviderProfileRefs: [
      "provider.github-actions.oidc",
      "provider.sigstore.keyless",
    ],
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

function inferRolloutState(input: ReleaseIdentityInput) {
  switch (input.rolloutStrategyRef) {
    case "STANDARD_CANARY":
      return "CANARY";
    case "EMERGENCY_PROMOTE":
      return "PROMOTED";
    case "PIN_BASELINE":
      return "PINNED";
    case "FAIL_FORWARD_COMPENSATING":
      return "FAILED_FORWARD";
  }
}

async function buildEnvelope(input: ReleaseIdentityInput): Promise<ReleaseMetadataEnvelope> {
  const [identity, rendered] = await Promise.all([
    deriveReleaseIdentity(input),
    renderArtifactNames(input),
  ]);

  return {
    build_artifacts: rendered.primary_artifacts.map((artifact) => ({
      artifact_class_ref: artifact.artifact_class_ref,
      build_artifact: {
        artifact_digest: input.artifactDigest,
        artifact_registry_ref: artifact.artifact_registry_ref,
        build_id: identity.build.build_id,
        build_time: input.buildMetadata.buildTimestamp,
        desktop_notarization_ref: artifact.companions.desktop_notarization_ref,
        distribution_targets: artifact.distribution_targets,
        hardened_runtime_attestation_ref: artifact.companions.hardened_runtime_attestation_ref,
        provenance_ref: artifact.companions.provenance_ref,
        release_channel: identity.release_channel.release_channel_ref,
        sbom_ref: artifact.companions.sbom_ref,
        signature_ref: artifact.companions.signature_ref,
        vcs_ref: input.branchRef,
      },
      component_ref: artifact.component_ref,
    })),
    compatibility_gate: {
      compatibility_gate_hash: `compatibility.${identity.candidate_identity_contract.candidate_identity_hash.slice(0, 16)}`,
      reader_window_state:
        input.buildMetadata.compatibilityVerdictRef === "ROLLBACK_SAFE"
          ? "EXPAND_ONLY_PREVIOUS_READERS_SUPPORTED"
          : "CONTRACTED_FAIL_FORWARD_ONLY",
      rollback_boundary_state: identity.compatibility.rollback_boundary_state,
      verdict_ref: input.buildMetadata.compatibilityVerdictRef,
    },
    deployment_release: {
      build_id: identity.build.build_id,
      compensating_release_id_or_null: input.buildMetadata.compensatingReleaseIdOrNull ?? null,
      emergency_override_expires_at:
        input.buildMetadata.emergencyOverrideExpiresAtOrNull ?? null,
      emergency_override_ref: input.buildMetadata.emergencyOverrideRefOrNull ?? null,
      fail_forward_owner_ref_or_null: input.buildMetadata.failForwardOwnerRefOrNull ?? null,
      health_gate_state: "GREEN",
      release_id: `release.${identity.release_channel.channel_slug}.${identity.build.build_id}`,
      release_verification_manifest_ref: rendered.release_verification_manifest.registry_ref,
      rollback_boundary_state: identity.compatibility.rollback_boundary_state,
      rollback_of_release_id: input.buildMetadata.canaryAbortedReleaseIdOrNull ?? null,
      rollout_state: inferRolloutState(input),
      rollout_strategy: input.rolloutStrategyRef,
      supported_client_window_ref:
        identity.candidate_identity_contract.supported_client_window_ref_or_null ?? "",
    },
    promotion_evidence: {
      builder_identity: "builder.github-actions.release",
      canary_aborted_release_id_or_null: input.buildMetadata.canaryAbortedReleaseIdOrNull ?? null,
      dependency_lock_ref: "pnpm-lock.yaml#sha256:1234567890abcdef",
      pinned_baseline_release_id_or_null:
        input.buildMetadata.pinnedBaselineReleaseIdOrNull ?? null,
      workflow_run_ref: "github-run/2026-04-23/42",
    },
    release_identity_input: input,
    release_verification_manifest: {
      approval_ref: input.rolloutStrategyRef === "EMERGENCY_PROMOTE" ? "approval.emergency.42" : "approval.standard.17",
      artifact_digest: input.artifactDigest,
      build_artifact_ref: identity.candidate_identity_contract.build_artifact_ref,
      candidate_environment_ref: identity.release_channel.candidate_environment_ref,
      candidate_identity_hash: identity.candidate_identity_contract.candidate_identity_hash,
      config_bundle_hash: identity.candidate_identity_contract.config_bundle_hash,
      decision_state: "APPROVED",
      deployment_release_ref: `release.${identity.release_channel.channel_slug}.${identity.build.build_id}`,
      executed_test_run_identifiers: [
        "suite.schema-compatibility.001",
        "suite.security.001",
        "suite.operator-client.001",
      ],
      migration_plan_ref: input.migrationPlanRefOrNull ?? null,
      release_verification_manifest_ref: rendered.release_verification_manifest.registry_ref,
      schema_bundle_hash: identity.candidate_identity_contract.schema_bundle_hash,
      supported_client_window_ref:
        identity.candidate_identity_contract.supported_client_window_ref_or_null ?? "",
    },
  };
}

async function writeJsonTemp(payload: unknown) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "taxat-release-"));
  const filePath = path.join(dir, "input.json");
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return { dir, filePath };
}

test("CLI scripts derive, render, and validate a standard canary candidate", async () => {
  const input = createReleaseIdentityInput();
  const { dir, filePath } = await writeJsonTemp(input);

  try {
    const [deriveResult, renderResult] = await Promise.all([
      execFileAsync("node", ["--experimental-strip-types", deriveScript, "--input", filePath], {
        cwd: repoRoot,
        maxBuffer: 32 * 1024 * 1024,
      }),
      execFileAsync("node", ["--experimental-strip-types", renderScript, "--input", filePath], {
        cwd: repoRoot,
        maxBuffer: 32 * 1024 * 1024,
      }),
    ]);

    const derived = JSON.parse(deriveResult.stdout);
    const rendered = JSON.parse(renderResult.stdout) as RenderedReleaseArtifactPlan;
    expect(derived.version.human_version).toContain("1.4.0-rc.2+");
    expect(rendered.primary_artifacts.length).toBeGreaterThan(4);

    const envelope = await buildEnvelope(input);
    const envelopeFile = path.join(dir, "envelope.json");
    await writeFile(envelopeFile, `${JSON.stringify(envelope, null, 2)}\n`, "utf8");
    const validateResult = await execFileAsync(
      "node",
      ["--experimental-strip-types", validateScript, "--input", envelopeFile],
      {
        cwd: repoRoot,
        maxBuffer: 32 * 1024 * 1024,
      },
    );
    expect(validateResult.stdout).toContain("validated release metadata");
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
});

test("production emergency hotfix metadata validates when override lineage is present", async () => {
  const input = createReleaseIdentityInput({
    branchRef: "hotfix/1.4.1--vat-rounding-fix",
    requestedReleaseChannel: "PRODUCTION",
    rolloutStrategyRef: "EMERGENCY_PROMOTE",
    versionSeed: {
      channelIterationOrNull: null,
      hotfixIterationOrNull: 1,
      major: 1,
      minor: 4,
      patch: 1,
    },
    buildMetadata: {
      buildSequence: 29,
      buildTimestamp: "2026-04-23T12:05:00Z",
      canaryAbortedReleaseIdOrNull: null,
      compensatingReleaseIdOrNull: null,
      compatibilityVerdictRef: "ROLLBACK_SAFE",
      emergencyOverrideExpiresAtOrNull: "2026-04-24T12:05:00Z",
      emergencyOverrideRefOrNull: "override.emergency.2026-04-23",
      failForwardOwnerRefOrNull: null,
      pinnedBaselineReleaseIdOrNull: "release.prod.2026.04.20.2",
      schemaBundleHash: "95b977085cc49325a17ae82e81d2e151f57d228682a538b3e3191e9c2d218b7d",
    },
  });

  const result = await validateReleaseMetadata(await buildEnvelope(input));
  expect(result.ok).toBe(true);
  expect(result.expected_identity.rollout.rollout_strategy_ref).toBe("EMERGENCY_PROMOTE");
});

test("pinned baseline re-promotion after canary abort validates with baseline lineage", async () => {
  const input = createReleaseIdentityInput({
    branchRef: "main",
    requestedReleaseChannel: "PRODUCTION",
    rolloutStrategyRef: "PIN_BASELINE",
    versionSeed: {
      channelIterationOrNull: null,
      hotfixIterationOrNull: null,
      major: 1,
      minor: 4,
      patch: 0,
    },
    buildMetadata: {
      buildSequence: 31,
      buildTimestamp: "2026-04-23T12:15:00Z",
      canaryAbortedReleaseIdOrNull: "release.prod.2026.04.23.1",
      compensatingReleaseIdOrNull: null,
      compatibilityVerdictRef: "ROLLBACK_SAFE",
      emergencyOverrideExpiresAtOrNull: null,
      emergencyOverrideRefOrNull: null,
      failForwardOwnerRefOrNull: null,
      pinnedBaselineReleaseIdOrNull: "release.prod.2026.04.17.9",
      schemaBundleHash: "95b977085cc49325a17ae82e81d2e151f57d228682a538b3e3191e9c2d218b7d",
    },
  });

  const result = await validateReleaseMetadata(await buildEnvelope(input));
  expect(result.ok).toBe(true);
  expect(result.expected_identity.rollout.posture_marker).toBe("pin");
});

test("fail-forward-only candidates require compensating release metadata", async () => {
  const validInput = createReleaseIdentityInput({
    branchRef: "release/1.4.2",
    requestedReleaseChannel: "PRODUCTION",
    rolloutStrategyRef: "FAIL_FORWARD_COMPENSATING",
    versionSeed: {
      channelIterationOrNull: null,
      hotfixIterationOrNull: null,
      major: 1,
      minor: 4,
      patch: 2,
    },
    migrationPlanRefOrNull: "migration.control-plane.000002",
    buildMetadata: {
      buildSequence: 33,
      buildTimestamp: "2026-04-23T12:40:00Z",
      canaryAbortedReleaseIdOrNull: null,
      compensatingReleaseIdOrNull: "release.prod.2026.04.23.3",
      compatibilityVerdictRef: "FAIL_FORWARD_ONLY",
      emergencyOverrideExpiresAtOrNull: null,
      emergencyOverrideRefOrNull: null,
      failForwardOwnerRefOrNull: "principal.release-manager.sara",
      pinnedBaselineReleaseIdOrNull: null,
      schemaBundleHash: "98d977085cc49325a17ae82e81d2e151f57d228682a538b3e3191e9c2d218b7d",
    },
  });

  const validResult = await validateReleaseMetadata(await buildEnvelope(validInput));
  expect(validResult.ok).toBe(true);

  const invalidInput = createReleaseIdentityInput({
    ...validInput,
    buildMetadata: {
      ...validInput.buildMetadata,
      compensatingReleaseIdOrNull: null,
      failForwardOwnerRefOrNull: null,
    },
  });
  await expect(buildEnvelope(invalidInput)).rejects.toThrow(
    /requires compensating_release_id_or_null|fail_forward_owner_ref_or_null/i,
  );
});

test("illegal branch-channel combinations and missing desktop notarization fail closed", async () => {
  const invalidBranchInput = createReleaseIdentityInput({
    branchRef: "dev",
    requestedReleaseChannel: "PRODUCTION",
    versionSeed: {
      channelIterationOrNull: null,
      hotfixIterationOrNull: null,
      major: 1,
      minor: 4,
      patch: 0,
    },
  });
  await expect(buildEnvelope(invalidBranchInput)).rejects.toThrow(
    /not allowed to build channel PRODUCTION|rejects branch family/i,
  );

  const desktopEnvelope = await buildEnvelope(
    createReleaseIdentityInput({
      requestedReleaseChannel: "PRODUCTION",
      branchRef: "main",
      versionSeed: {
        channelIterationOrNull: null,
        hotfixIterationOrNull: null,
        major: 1,
        minor: 4,
        patch: 0,
      },
    }),
  );
  const desktopEntry = desktopEnvelope.build_artifacts.find((entry) =>
    entry.build_artifact.distribution_targets.includes("MACOS_DESKTOP"),
  );
  expect(desktopEntry).toBeTruthy();
  if (desktopEntry) {
    desktopEntry.build_artifact.desktop_notarization_ref = null;
    desktopEntry.build_artifact.hardened_runtime_attestation_ref = null;
  }
  const result = await validateReleaseMetadata(desktopEnvelope);
  expect(result.ok).toBe(false);
  expect(result.errors.join("\n")).toMatch(/Desktop artifact/);
});
