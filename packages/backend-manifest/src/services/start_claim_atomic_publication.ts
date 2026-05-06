import type { ManifestStartClaimContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  buildRunManifestStartClaimContract,
  type RunManifestRecord,
} from "../models/run_manifest.ts";
import { buildAttemptLineageRef } from "./attempt_lineage_ref_service.ts";

export type StartClaimAtomicPublicationErrorCode =
  | "FIRST_PUBLICATION_REF_REQUIRED"
  | "MANIFEST_FROZEN_HASHES_REQUIRED"
  | "STALE_RECLAIM_PUBLICATION_PROOF_REQUIRED"
  | "TERMINAL_START_CLAIM_SOURCE_REQUIRED";

export class StartClaimAtomicPublicationError extends Error {
  readonly code: StartClaimAtomicPublicationErrorCode;

  constructor(code: StartClaimAtomicPublicationErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "StartClaimAtomicPublicationError";
    this.code = code;
  }
}

function requireNonEmpty(
  code: StartClaimAtomicPublicationErrorCode,
  label: string,
  value: string | null | undefined,
) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new StartClaimAtomicPublicationError(code, `${label} is required`);
  }
  return value.trim();
}

function requireFrozenHashes(manifest: RunManifestRecord) {
  if (!manifest.hash_set?.manifest_hash || !manifest.hash_set.execution_basis_hash) {
    throw new StartClaimAtomicPublicationError(
      "MANIFEST_FROZEN_HASHES_REQUIRED",
      "start claims require hash_set.manifest_hash and hash_set.execution_basis_hash",
    );
  }
  return {
    manifest_hash: manifest.hash_set.manifest_hash,
    execution_basis_hash: manifest.hash_set.execution_basis_hash,
  };
}

function activeClaimContract(input: {
  attempt_lineage_ref: string;
  claim_acquired_at: string;
  claim_epoch: number;
  claim_expires_at: string;
  claim_holder_ref: string;
  claim_token: string;
  first_publication_committed_at: string;
  manifest: RunManifestRecord;
  outbox_batch_ref: string;
  stage_dag_ref: string;
}): ManifestStartClaimContract {
  const hashes = requireFrozenHashes(input.manifest);
  return {
    ...buildRunManifestStartClaimContract({
      manifest_id: input.manifest.manifest_id,
      manifest_hash: hashes.manifest_hash,
      execution_basis_hash: hashes.execution_basis_hash,
      access_binding_hash: input.manifest.access_binding_hash,
      attempt_lineage_ref: input.attempt_lineage_ref,
      claim_state: "ACTIVE_LEASED",
      claim_acquired_at_or_null: input.claim_acquired_at,
      claim_expires_at_or_null: input.claim_expires_at,
    }),
    claim_epoch: input.claim_epoch,
    claim_holder_ref_or_null: input.claim_holder_ref,
    claim_token_or_null: input.claim_token,
    stage_dag_ref_or_null: input.stage_dag_ref,
    outbox_batch_ref_or_null: input.outbox_batch_ref,
    first_publication_committed_at_or_null: input.first_publication_committed_at,
  } as ManifestStartClaimContract;
}

export function buildStartClaimAtomicPublication(input: {
  attempt_lineage_ref?: string | null;
  claim_acquired_at: string;
  claim_expires_at: string;
  claim_holder_ref: string;
  claim_token: string;
  manifest: RunManifestRecord;
  outbox_batch_ref: string;
  source_manifest?: RunManifestRecord | null;
  stage_dag_ref: string;
}): RunManifestRecord {
  const claimAcquiredAt = normalizeUtcInstantString(input.claim_acquired_at);
  const claimExpiresAt = normalizeUtcInstantString(input.claim_expires_at);
  const stageDagRef = requireNonEmpty(
    "FIRST_PUBLICATION_REF_REQUIRED",
    "stage_dag_ref",
    input.stage_dag_ref,
  );
  const outboxBatchRef = requireNonEmpty(
    "FIRST_PUBLICATION_REF_REQUIRED",
    "outbox_batch_ref",
    input.outbox_batch_ref,
  );
  const attemptLineageInput: Parameters<typeof buildAttemptLineageRef>[0] = {
    manifest: input.manifest,
  };
  if (input.attempt_lineage_ref !== undefined) {
    attemptLineageInput.explicit_attempt_lineage_ref = input.attempt_lineage_ref;
  }
  if (input.source_manifest !== undefined) {
    attemptLineageInput.source_manifest = input.source_manifest;
  }
  const attemptLineageRef = buildAttemptLineageRef(attemptLineageInput);
  const claimEpoch = (input.manifest.manifest_start_claim?.claim_epoch ?? 0) + 1;

  return {
    ...structuredClone(input.manifest),
    lifecycle_state: "IN_PROGRESS",
    opened_at: claimAcquiredAt,
    manifest_start_claim: activeClaimContract({
      manifest: input.manifest,
      attempt_lineage_ref: attemptLineageRef,
      claim_epoch: claimEpoch,
      claim_holder_ref: requireNonEmpty(
        "FIRST_PUBLICATION_REF_REQUIRED",
        "claim_holder_ref",
        input.claim_holder_ref,
      ),
      claim_token: requireNonEmpty(
        "FIRST_PUBLICATION_REF_REQUIRED",
        "claim_token",
        input.claim_token,
      ),
      claim_acquired_at: claimAcquiredAt,
      claim_expires_at: claimExpiresAt,
      stage_dag_ref: stageDagRef,
      outbox_batch_ref: outboxBatchRef,
      first_publication_committed_at: claimAcquiredAt,
    }),
  };
}

export function buildReclaimStartAtomicPublication(input: {
  claim_expires_at: string;
  claim_holder_ref: string;
  claim_token: string;
  manifest: RunManifestRecord;
  reclaimed_at: string;
}): RunManifestRecord {
  const currentClaim = input.manifest.manifest_start_claim;
  if (
    currentClaim?.stage_dag_ref_or_null == null ||
    currentClaim.outbox_batch_ref_or_null == null ||
    currentClaim.first_publication_committed_at_or_null == null
  ) {
    throw new StartClaimAtomicPublicationError(
      "STALE_RECLAIM_PUBLICATION_PROOF_REQUIRED",
      "reclaim requires the stale claim's durable first-publication refs",
    );
  }
  const reclaimedAt = normalizeUtcInstantString(input.reclaimed_at);
  const claimExpiresAt = normalizeUtcInstantString(input.claim_expires_at);
  const claimEpoch = currentClaim.claim_epoch + 1;

  return {
    ...structuredClone(input.manifest),
    lifecycle_state: "IN_PROGRESS",
    opened_at: input.manifest.opened_at ?? currentClaim.claim_acquired_at_or_null ?? reclaimedAt,
    manifest_start_claim: activeClaimContract({
      manifest: input.manifest,
      attempt_lineage_ref: currentClaim.attempt_lineage_ref,
      claim_epoch: claimEpoch,
      claim_holder_ref: requireNonEmpty(
        "FIRST_PUBLICATION_REF_REQUIRED",
        "claim_holder_ref",
        input.claim_holder_ref,
      ),
      claim_token: requireNonEmpty(
        "FIRST_PUBLICATION_REF_REQUIRED",
        "claim_token",
        input.claim_token,
      ),
      claim_acquired_at: reclaimedAt,
      claim_expires_at: claimExpiresAt,
      stage_dag_ref: currentClaim.stage_dag_ref_or_null,
      outbox_batch_ref: currentClaim.outbox_batch_ref_or_null,
      first_publication_committed_at: currentClaim.first_publication_committed_at_or_null,
    }),
  };
}

export function buildTerminalResultRecordedStartClaim(input: {
  manifest: RunManifestRecord;
  released_at: string;
  release_reason_code: "COMPLETED" | "FAILED" | "BLOCKED" | "SUPERSEDED" | "REPLAY_ONLY" | "RETIRED";
}): ManifestStartClaimContract {
  const currentClaim = input.manifest.manifest_start_claim;
  if (
    currentClaim == null ||
    currentClaim.claim_state === "UNCLAIMED_SEALED" ||
    currentClaim.claim_holder_ref_or_null == null ||
    currentClaim.claim_token_or_null == null ||
    currentClaim.claim_acquired_at_or_null == null ||
    currentClaim.claim_expires_at_or_null == null ||
    currentClaim.stage_dag_ref_or_null == null ||
    currentClaim.outbox_batch_ref_or_null == null ||
    currentClaim.first_publication_committed_at_or_null == null
  ) {
    throw new StartClaimAtomicPublicationError(
      "TERMINAL_START_CLAIM_SOURCE_REQUIRED",
      "terminal start-claim recording requires a started claim with publication proof",
    );
  }
  const hashes = requireFrozenHashes(input.manifest);
  return {
    ...buildRunManifestStartClaimContract({
      manifest_id: input.manifest.manifest_id,
      manifest_hash: hashes.manifest_hash,
      execution_basis_hash: hashes.execution_basis_hash,
      access_binding_hash: input.manifest.access_binding_hash,
      attempt_lineage_ref: currentClaim.attempt_lineage_ref,
      claim_state: "TERMINAL_RESULT_RECORDED",
      claim_acquired_at_or_null: currentClaim.claim_acquired_at_or_null,
      claim_expires_at_or_null: currentClaim.claim_expires_at_or_null,
      claim_released_at_or_null: normalizeUtcInstantString(input.released_at),
      claim_release_reason_code_or_null: input.release_reason_code,
    }),
    claim_epoch: currentClaim.claim_epoch,
    claim_holder_ref_or_null: currentClaim.claim_holder_ref_or_null,
    claim_token_or_null: currentClaim.claim_token_or_null,
    stage_dag_ref_or_null: currentClaim.stage_dag_ref_or_null,
    outbox_batch_ref_or_null: currentClaim.outbox_batch_ref_or_null,
    first_publication_committed_at_or_null:
      currentClaim.first_publication_committed_at_or_null,
  } as ManifestStartClaimContract;
}

export function markManifestStartClaimTerminal(input: {
  manifest: RunManifestRecord;
  released_at: string;
  release_reason_code: "COMPLETED" | "FAILED" | "BLOCKED" | "SUPERSEDED" | "REPLAY_ONLY" | "RETIRED";
}): RunManifestRecord {
  return {
    ...structuredClone(input.manifest),
    manifest_start_claim: buildTerminalResultRecordedStartClaim(input),
  };
}
