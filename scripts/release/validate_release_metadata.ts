import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  deriveReleaseIdentity,
  type ReleaseIdentityInput,
} from "./derive_release_identity.ts";
import { renderArtifactNames, type RenderedPrimaryArtifact } from "./render_artifact_names.ts";

export type ReleaseMetadataEnvelope = {
  build_artifacts: Array<{
    artifact_class_ref: string;
    build_artifact: {
      artifact_digest: string;
      artifact_registry_ref: string;
      build_id: string;
      build_time: string;
      desktop_notarization_ref: string | null;
      distribution_targets: string[];
      hardened_runtime_attestation_ref: string | null;
      provenance_ref: string;
      release_channel: string;
      sbom_ref: string;
      signature_ref: string;
      vcs_ref: string;
    };
    component_ref: string;
  }>;
  compatibility_gate: {
    compatibility_gate_hash: string;
    reader_window_state: string;
    rollback_boundary_state: "FAIL_FORWARD_ONLY" | "ROLLBACK_ALLOWED";
    verdict_ref: string;
  };
  deployment_release: {
    build_id: string;
    compensating_release_id_or_null: string | null;
    emergency_override_expires_at: string | null;
    emergency_override_ref: string | null;
    fail_forward_owner_ref_or_null: string | null;
    health_gate_state: string;
    release_id: string;
    release_verification_manifest_ref: string;
    rollback_boundary_state: "FAIL_FORWARD_ONLY" | "ROLLBACK_ALLOWED";
    rollback_of_release_id: string | null;
    rollout_state: string;
    rollout_strategy: string;
    supported_client_window_ref: string;
  };
  promotion_evidence: {
    builder_identity: string;
    canary_aborted_release_id_or_null: string | null;
    dependency_lock_ref: string;
    pinned_baseline_release_id_or_null: string | null;
    workflow_run_ref: string;
  };
  release_identity_input: ReleaseIdentityInput;
  release_verification_manifest: {
    approval_ref: string | null;
    artifact_digest: string;
    build_artifact_ref: string;
    candidate_environment_ref: string;
    candidate_identity_hash: string;
    config_bundle_hash: string;
    decision_state: string;
    deployment_release_ref: string | null;
    executed_test_run_identifiers: string[];
    migration_plan_ref: string | null;
    release_verification_manifest_ref: string;
    schema_bundle_hash: string;
    supported_client_window_ref: string;
  };
};

export type ReleaseMetadataValidationResult = {
  errors: string[];
  expected_artifacts: Awaited<ReturnType<typeof renderArtifactNames>>;
  expected_identity: Awaited<ReturnType<typeof deriveReleaseIdentity>>;
  ok: boolean;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function mapExpectedArtifacts(artifacts: RenderedPrimaryArtifact[]) {
  return new Map(artifacts.map((artifact) => [`${artifact.component_ref}|${artifact.artifact_class_ref}`, artifact]));
}

export async function validateReleaseMetadata(
  envelope: ReleaseMetadataEnvelope,
): Promise<ReleaseMetadataValidationResult> {
  const errors: string[] = [];
  const [expectedIdentity, expectedArtifacts] = await Promise.all([
    deriveReleaseIdentity(envelope.release_identity_input),
    renderArtifactNames(envelope.release_identity_input),
  ]);

  if (
    envelope.compatibility_gate.rollback_boundary_state !== expectedIdentity.compatibility.rollback_boundary_state
  ) {
    errors.push("compatibility_gate.rollback_boundary_state does not match derived compatibility posture.");
  }
  if (envelope.compatibility_gate.verdict_ref !== expectedIdentity.compatibility.compatibility_verdict_ref) {
    errors.push("compatibility_gate.verdict_ref does not match the requested compatibility verdict.");
  }
  if (
    envelope.deployment_release.rollout_strategy !== expectedIdentity.rollout.rollout_strategy_ref
  ) {
    errors.push("deployment_release.rollout_strategy does not match the derived rollout strategy.");
  }
  if (
    envelope.deployment_release.rollback_boundary_state !== expectedIdentity.compatibility.rollback_boundary_state
  ) {
    errors.push("deployment_release.rollback_boundary_state does not match the compatibility verdict.");
  }
  if (
    envelope.release_verification_manifest.candidate_identity_hash !==
    expectedIdentity.candidate_identity_contract.candidate_identity_hash
  ) {
    errors.push("release_verification_manifest.candidate_identity_hash does not match derived candidate identity.");
  }
  if (
    envelope.release_verification_manifest.candidate_environment_ref !==
    expectedIdentity.release_channel.candidate_environment_ref
  ) {
    errors.push("release_verification_manifest.candidate_environment_ref does not match derived channel environment.");
  }
  if (
    envelope.release_verification_manifest.build_artifact_ref !==
    expectedIdentity.candidate_identity_contract.build_artifact_ref
  ) {
    errors.push("release_verification_manifest.build_artifact_ref does not match the candidate contract.");
  }
  if (
    envelope.release_verification_manifest.schema_bundle_hash !==
      expectedIdentity.candidate_identity_contract.schema_bundle_hash ||
    envelope.release_verification_manifest.config_bundle_hash !==
      expectedIdentity.candidate_identity_contract.config_bundle_hash
  ) {
    errors.push("release_verification_manifest schema/config bundle hashes do not match the candidate contract.");
  }
  if (
    envelope.release_verification_manifest.supported_client_window_ref !==
    (expectedIdentity.candidate_identity_contract.supported_client_window_ref_or_null ?? "")
  ) {
    errors.push("release_verification_manifest.supported_client_window_ref does not match derived client window.");
  }
  if (envelope.release_verification_manifest.executed_test_run_identifiers.length === 0) {
    errors.push("release_verification_manifest.executed_test_run_identifiers must not be empty.");
  }
  if (!envelope.promotion_evidence.workflow_run_ref || !envelope.promotion_evidence.builder_identity) {
    errors.push("promotion_evidence requires workflow_run_ref and builder_identity.");
  }
  if (!envelope.promotion_evidence.dependency_lock_ref) {
    errors.push("promotion_evidence.dependency_lock_ref is required.");
  }
  if (expectedIdentity.rollout.rollout_strategy_ref === "PIN_BASELINE") {
    if (!envelope.promotion_evidence.pinned_baseline_release_id_or_null) {
      errors.push("PIN_BASELINE requires promotion_evidence.pinned_baseline_release_id_or_null.");
    }
  }
  if (expectedIdentity.rollout.rollout_strategy_ref === "FAIL_FORWARD_COMPENSATING") {
    if (!envelope.deployment_release.compensating_release_id_or_null) {
      errors.push("FAIL_FORWARD_COMPENSATING requires deployment_release.compensating_release_id_or_null.");
    }
    if (!envelope.deployment_release.fail_forward_owner_ref_or_null) {
      errors.push("FAIL_FORWARD_COMPENSATING requires deployment_release.fail_forward_owner_ref_or_null.");
    }
  }
  if (expectedIdentity.rollout.rollout_strategy_ref === "EMERGENCY_PROMOTE") {
    if (!envelope.deployment_release.emergency_override_ref) {
      errors.push("EMERGENCY_PROMOTE requires deployment_release.emergency_override_ref.");
    }
    if (!envelope.deployment_release.emergency_override_expires_at) {
      errors.push("EMERGENCY_PROMOTE requires deployment_release.emergency_override_expires_at.");
    }
  }

  const expectedArtifactMap = mapExpectedArtifacts(expectedArtifacts.primary_artifacts);
  const seenRegistryRefs = new Set<string>();
  for (const entry of envelope.build_artifacts) {
    const expected = expectedArtifactMap.get(`${entry.component_ref}|${entry.artifact_class_ref}`);
    if (!expected) {
      errors.push(`Unexpected build artifact mapping ${entry.component_ref}/${entry.artifact_class_ref}.`);
      continue;
    }
    if (seenRegistryRefs.has(entry.build_artifact.artifact_registry_ref)) {
      errors.push(`Duplicate artifact_registry_ref detected: ${entry.build_artifact.artifact_registry_ref}`);
    }
    seenRegistryRefs.add(entry.build_artifact.artifact_registry_ref);

    if (entry.build_artifact.build_id !== expectedIdentity.build.build_id) {
      errors.push(`build_id mismatch for ${entry.component_ref}.`);
    }
    if (entry.build_artifact.vcs_ref !== envelope.release_identity_input.branchRef) {
      errors.push(`vcs_ref mismatch for ${entry.component_ref}.`);
    }
    if (entry.build_artifact.release_channel !== expectedIdentity.release_channel.release_channel_ref) {
      errors.push(`release_channel mismatch for ${entry.component_ref}.`);
    }
    if (entry.build_artifact.artifact_digest !== envelope.release_identity_input.artifactDigest) {
      errors.push(`artifact_digest mismatch for ${entry.component_ref}.`);
    }
    if (entry.build_artifact.artifact_registry_ref !== expected.artifact_registry_ref) {
      errors.push(`artifact_registry_ref mismatch for ${entry.component_ref}.`);
    }
    if (entry.build_artifact.sbom_ref !== expected.companions.sbom_ref) {
      errors.push(`sbom_ref mismatch for ${entry.component_ref}.`);
    }
    if (entry.build_artifact.provenance_ref !== expected.companions.provenance_ref) {
      errors.push(`provenance_ref mismatch for ${entry.component_ref}.`);
    }
    if (entry.build_artifact.signature_ref !== expected.companions.signature_ref) {
      errors.push(`signature_ref mismatch for ${entry.component_ref}.`);
    }
    if (
      entry.build_artifact.desktop_notarization_ref !== expected.companions.desktop_notarization_ref
    ) {
      errors.push(`desktop_notarization_ref mismatch for ${entry.component_ref}.`);
    }
    if (
      entry.build_artifact.hardened_runtime_attestation_ref !==
      expected.companions.hardened_runtime_attestation_ref
    ) {
      errors.push(`hardened_runtime_attestation_ref mismatch for ${entry.component_ref}.`);
    }
    const expectedDesktopTargets = expected.distribution_targets.includes("MACOS_DESKTOP");
    if (
      expectedDesktopTargets &&
      (!entry.build_artifact.desktop_notarization_ref || !entry.build_artifact.hardened_runtime_attestation_ref)
    ) {
      errors.push(`Desktop artifact ${entry.component_ref} requires notarization and hardened runtime evidence.`);
    }
    if (
      !expectedDesktopTargets &&
      (entry.build_artifact.desktop_notarization_ref !== null ||
        entry.build_artifact.hardened_runtime_attestation_ref !== null)
    ) {
      errors.push(`Non-desktop artifact ${entry.component_ref} must not carry desktop companion refs.`);
    }
  }

  if (
    envelope.deployment_release.release_verification_manifest_ref !==
    expectedArtifacts.release_verification_manifest.registry_ref
  ) {
    errors.push("deployment_release.release_verification_manifest_ref does not match rendered naming policy.");
  }
  if (
    envelope.release_verification_manifest.release_verification_manifest_ref !==
    expectedArtifacts.release_verification_manifest.registry_ref
  ) {
    errors.push("release_verification_manifest.release_verification_manifest_ref does not match rendered naming policy.");
  }

  return {
    errors,
    expected_artifacts: expectedArtifacts,
    expected_identity: expectedIdentity,
    ok: errors.length === 0,
  };
}

async function readEnvelope(filePath: string) {
  return readJson<ReleaseMetadataEnvelope>(path.resolve(filePath));
}

export async function main() {
  const args = process.argv.slice(2);
  const inputIndex = args.indexOf("--input");
  const inputPath = inputIndex === -1 ? undefined : args[inputIndex + 1];
  assert(typeof inputPath === "string" && inputPath.length > 0, "Usage: --input <release-metadata.json>");
  const envelope = await readEnvelope(inputPath);
  const result = await validateReleaseMetadata(envelope);
  if (!result.ok) {
    for (const error of result.errors) {
      console.error(error);
    }
    process.exitCode = 1;
    return;
  }
  console.log(
    `validated release metadata for ${result.expected_identity.version.human_version} (${result.expected_identity.release_channel.release_channel_ref})`,
  );
  console.log(`candidate: ${result.expected_identity.candidate_identity_contract.candidate_identity_hash}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
