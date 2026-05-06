import type {
  ReplayAttestation,
} from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import { sortSetLikeStrings } from "../../../domain-kernel/src/primitives/hash.ts";
import type { RunManifestRepository } from "../repositories/run_manifest_repository.ts";
import type { RunManifestOutputLinkMapRecord, RunManifestRecord } from "../models/run_manifest.ts";
import {
  normalizeAppendOnlyOutcomeProjection,
  synchronizeManifestOutcomeProjectionMirrors,
} from "./output_ref_projection_normalizer.ts";

export class ReplayAttestationRepositoryError extends Error {
  constructor(detail: string) {
    super(`REPLAY_ATTESTATION_REPOSITORY_ERROR: ${detail}`);
    this.name = "ReplayAttestationRepositoryError";
  }
}

export class ReplayAttestationRepository {
  readonly #attestations = new Map<string, ReplayAttestation>();

  async getReplayAttestationById(replayAttestationId: string) {
    const attestation = this.#attestations.get(replayAttestationId);
    return attestation ? structuredClone(attestation) : null;
  }

  async putReplayAttestation(attestation: ReplayAttestation) {
    const existing = this.#attestations.get(attestation.replay_attestation_id);
    if (existing && JSON.stringify(existing) !== JSON.stringify(attestation)) {
      throw new ReplayAttestationRepositoryError(
        `${attestation.replay_attestation_id} already exists with a different payload`,
      );
    }
    this.#attestations.set(attestation.replay_attestation_id, structuredClone(attestation));
    return structuredClone(attestation);
  }
}

export class PersistReplayAttestationError extends Error {
  constructor(detail: string) {
    super(`PERSIST_REPLAY_ATTESTATION_FAILED: ${detail}`);
    this.name = "PersistReplayAttestationError";
  }
}

function addReplayAttestationOutputRef(
  outputRefs: RunManifestOutputLinkMapRecord,
  manifest: RunManifestRecord,
  attestation: ReplayAttestation,
) {
  const dependencyIdentityRefs = [
    ...new Set(
      sortSetLikeStrings([
        attestation.expected_execution_basis_hash,
        attestation.actual_execution_basis_hash,
        attestation.expected_deterministic_outcome_hash,
        attestation.actual_deterministic_outcome_hash,
      ].filter((value): value is string => value !== null)),
    ),
  ];

  return {
    ...structuredClone(outputRefs),
    replay_attestation: {
      linkage_role_code: "REPLAY_ATTESTATION",
      artifact_type: "ReplayAttestation",
      artifact_ref: attestation.replay_attestation_id,
      artifact_hash_or_null: attestation.contract.artifact_content_hash,
      produced_by_manifest_id: manifest.manifest_id,
      dependency_identity_refs: dependencyIdentityRefs,
    },
  } satisfies RunManifestOutputLinkMapRecord;
}

function ensureDecisionBundleOutputRef(
  outputRefs: RunManifestOutputLinkMapRecord,
  input: {
    decision_bundle_hash: string;
    decision_bundle_ref?: string | null;
    manifest: RunManifestRecord;
  },
) {
  if (
    Object.values(outputRefs).some(
      (entry) =>
        entry.linkage_role_code === "DECISION_BUNDLE" &&
        entry.artifact_hash_or_null === input.decision_bundle_hash,
    )
  ) {
    return structuredClone(outputRefs);
  }
  const dependencyIdentityRefs = [
    ...new Set(
      sortSetLikeStrings([
        input.manifest.hash_set?.execution_basis_hash,
        input.manifest.frozen_execution_binding?.execution_basis_hash,
      ].filter((value): value is string => value !== null && value !== undefined)),
    ),
  ];

  return {
    ...structuredClone(outputRefs),
    decision_bundle: {
      linkage_role_code: "DECISION_BUNDLE",
      artifact_type: "DecisionBundle",
      artifact_ref: input.decision_bundle_ref ?? `decision-bundle://${input.manifest.manifest_id}`,
      artifact_hash_or_null: input.decision_bundle_hash,
      produced_by_manifest_id: input.manifest.manifest_id,
      dependency_identity_refs: dependencyIdentityRefs,
    },
  } satisfies RunManifestOutputLinkMapRecord;
}

export async function persistReplayAttestation(input: {
  attestation: ReplayAttestation;
  decision_bundle_hash?: string | null;
  decision_bundle_ref?: string | null;
  expected_manifest_row_version: number;
  persisted_at: string;
  replay_attestation_repository: ReplayAttestationRepository;
  run_manifest_repository: RunManifestRepository;
  tenant_id: string;
}) {
  const attestation = input.attestation;
  const existing = await input.replay_attestation_repository.getReplayAttestationById(
    attestation.replay_attestation_id,
  );
  if (existing && JSON.stringify(existing) !== JSON.stringify(attestation)) {
    throw new PersistReplayAttestationError(
      "attestation id already exists with a different payload",
    );
  }
  const storedManifest = await input.run_manifest_repository.requireManifestById(
    input.tenant_id,
    attestation.manifest_id,
  );
  if (storedManifest.manifest_row_version !== input.expected_manifest_row_version) {
    throw new PersistReplayAttestationError("manifest row version is stale");
  }
  const manifest = storedManifest.manifest;
  if (manifest.run_kind !== "REPLAY") {
    throw new PersistReplayAttestationError("only replay manifests can publish replay attestation");
  }
  if (manifest.replay_of_manifest_id !== attestation.replay_of_manifest_id) {
    throw new PersistReplayAttestationError(
      "attestation replay_of_manifest_id must mirror manifest lineage",
    );
  }
  if (attestation.actual_deterministic_outcome_hash === null) {
    throw new PersistReplayAttestationError(
      "manifest synchronization requires actual_deterministic_outcome_hash",
    );
  }
  const decisionBundleHash =
    manifest.decision_bundle_hash ??
    manifest.append_only_outcome_projection?.decision_bundle_hash ??
    input.decision_bundle_hash ??
    null;
  if (decisionBundleHash == null) {
    throw new PersistReplayAttestationError(
      "manifest synchronization requires decision_bundle_hash for deterministic replay outcome publication",
    );
  }
  const existingOutputRefs = ensureDecisionBundleOutputRef(
    manifest.append_only_outcome_projection?.output_refs ?? manifest.output_refs,
    {
      decision_bundle_hash: decisionBundleHash,
      decision_bundle_ref: input.decision_bundle_ref,
      manifest,
    },
  );

  const projection = normalizeAppendOnlyOutcomeProjection({
    ...(manifest.append_only_outcome_projection ?? {
      projection_generation: 0,
      projection_hash: "",
      post_seal_basis: {
        basis_state: "NULL_SENTINEL",
        post_seal_basis_hash: "",
        authority_context_ref: null,
        authority_context_hash: null,
        late_data_monitor_result_ref: null,
        late_data_monitor_result_hash: null,
        baseline_envelope_refs: [],
        baseline_envelope_hashes: [],
        temporal_propagation_event_refs: [],
        temporal_propagation_event_hashes: [],
        authority_calculation_result_refs: [],
        authority_calculation_result_hashes: [],
        drift_record_refs: [],
        drift_record_hashes: [],
      },
      gating_decisions: manifest.gating_decisions,
      output_refs: existingOutputRefs,
      audit_refs: manifest.audit_refs,
      submission_refs: manifest.submission_refs,
      drift_refs: manifest.drift_refs,
      decision_bundle_hash: decisionBundleHash,
      deterministic_outcome_hash: attestation.actual_deterministic_outcome_hash,
      replay_attestation_ref: attestation.replay_attestation_id,
    }),
    projection_generation: (manifest.append_only_outcome_projection?.projection_generation ?? 0) + 1,
    output_refs: addReplayAttestationOutputRef(existingOutputRefs, manifest, attestation),
    decision_bundle_hash: decisionBundleHash,
    deterministic_outcome_hash: attestation.actual_deterministic_outcome_hash,
    replay_attestation_ref: attestation.replay_attestation_id,
  });

  const nextManifest = synchronizeManifestOutcomeProjectionMirrors({
    ...manifest,
    append_only_outcome_projection: projection,
    decision_bundle_hash: decisionBundleHash,
    deterministic_outcome_hash: attestation.actual_deterministic_outcome_hash,
    replay_attestation_ref: attestation.replay_attestation_id,
    output_refs: projection.output_refs,
  });

  const stored = await input.run_manifest_repository.compareAndSwapManifest({
    expected_manifest_row_version: input.expected_manifest_row_version,
    next_manifest: nextManifest,
    persisted_at: input.persisted_at,
  });
  const persistedAttestation =
    await input.replay_attestation_repository.putReplayAttestation(attestation);

  return {
    attestation: persistedAttestation,
    manifest: stored.manifest,
    manifest_row_version: stored.manifest_row_version,
  };
}
