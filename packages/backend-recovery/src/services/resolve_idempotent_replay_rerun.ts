import type { ReplayAttestation } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import type {
  RunManifestRecord,
  RunManifestReplayClass,
} from "../../../backend-manifest/src/index.ts";

export type ReplayRerunCandidate = {
  attestation: ReplayAttestation | null;
  replay_manifest: RunManifestRecord;
};

export type ReplayRerunIdempotencyKeyInput = {
  declared_counterfactual_dimensions?: readonly string[];
  execution_mode: "COMPLIANCE" | "ANALYSIS";
  replay_class: RunManifestReplayClass;
  request_idempotency_key: string;
  source_deterministic_outcome_hash: string | null;
  source_execution_basis_hash: string | null;
  source_manifest_id: string;
  tenant_id: string;
};

export type IdempotentReplayRerunResult =
  | {
      existing_attestation: ReplayAttestation;
      existing_replay_manifest: RunManifestRecord;
      idempotency_key: string;
      resolved: true;
    }
  | {
      idempotency_key: string;
      resolved: false;
    };

export function buildReplayRerunIdempotencyKey(input: ReplayRerunIdempotencyKeyInput) {
  return `replay-rerun.${stableJsonHash({
    declared_counterfactual_dimensions: [...(input.declared_counterfactual_dimensions ?? [])].sort(),
    execution_mode: input.execution_mode,
    replay_class: input.replay_class,
    request_idempotency_key: input.request_idempotency_key,
    source_deterministic_outcome_hash: input.source_deterministic_outcome_hash,
    source_execution_basis_hash: input.source_execution_basis_hash,
    source_manifest_id: input.source_manifest_id,
    tenant_id: input.tenant_id,
  })}`;
}

function executionBasisHash(manifest: RunManifestRecord) {
  return (
    manifest.hash_set?.execution_basis_hash ??
    manifest.frozen_execution_binding?.execution_basis_hash ??
    null
  );
}

function deterministicOutcomeHash(manifest: RunManifestRecord) {
  return (
    manifest.append_only_outcome_projection?.deterministic_outcome_hash ??
    manifest.deterministic_outcome_hash ??
    null
  );
}

function candidateMatches(input: {
  attestation: ReplayAttestation | null;
  candidate: RunManifestRecord;
  idempotency_key: string;
  replay_class: RunManifestReplayClass;
  request_idempotency_key: string;
  source_execution_basis_hash: string | null;
  source_manifest: RunManifestRecord;
}) {
  if (input.attestation === null) {
    return false;
  }
  if (
    input.candidate.tenant_id !== input.source_manifest.tenant_id ||
    input.candidate.run_kind !== "REPLAY" ||
    input.candidate.replay_of_manifest_id !== input.source_manifest.manifest_id ||
    input.candidate.replay_class !== input.replay_class
  ) {
    return false;
  }
  if (
    input.candidate.idempotency_key !== input.request_idempotency_key &&
    input.candidate.idempotency_key !== input.idempotency_key
  ) {
    return false;
  }
  if (input.replay_class !== "COUNTERFACTUAL_ANALYSIS") {
    const candidateBasis = executionBasisHash(input.candidate);
    if (
      input.source_execution_basis_hash === null ||
      candidateBasis !== input.source_execution_basis_hash
    ) {
      return false;
    }
  }
  return (
    input.attestation.manifest_id === input.candidate.manifest_id &&
    input.attestation.replay_of_manifest_id === input.source_manifest.manifest_id &&
    input.attestation.replay_class === input.replay_class
  );
}

export function resolveIdempotentReplayRerun(input: {
  declared_counterfactual_dimensions?: readonly string[];
  existing_replay_candidates?: readonly ReplayRerunCandidate[];
  replay_class: RunManifestReplayClass;
  request_idempotency_key: string;
  source_manifest: RunManifestRecord;
}): IdempotentReplayRerunResult {
  const executionMode =
    input.replay_class === "COUNTERFACTUAL_ANALYSIS" ? "ANALYSIS" : "COMPLIANCE";
  const idempotencyKey = buildReplayRerunIdempotencyKey({
    declared_counterfactual_dimensions: input.declared_counterfactual_dimensions,
    execution_mode: executionMode,
    replay_class: input.replay_class,
    request_idempotency_key: input.request_idempotency_key,
    source_deterministic_outcome_hash: deterministicOutcomeHash(input.source_manifest),
    source_execution_basis_hash: executionBasisHash(input.source_manifest),
    source_manifest_id: input.source_manifest.manifest_id,
    tenant_id: input.source_manifest.tenant_id,
  });
  const match = (input.existing_replay_candidates ?? []).find((candidate) =>
    candidateMatches({
      attestation: candidate.attestation,
      candidate: candidate.replay_manifest,
      idempotency_key: idempotencyKey,
      replay_class: input.replay_class,
      request_idempotency_key: input.request_idempotency_key,
      source_execution_basis_hash: executionBasisHash(input.source_manifest),
      source_manifest: input.source_manifest,
    }),
  );

  if (!match || match.attestation === null) {
    return {
      idempotency_key: idempotencyKey,
      resolved: false,
    };
  }

  return {
    existing_attestation: structuredClone(match.attestation),
    existing_replay_manifest: structuredClone(match.replay_manifest),
    idempotency_key: idempotencyKey,
    resolved: true,
  };
}
