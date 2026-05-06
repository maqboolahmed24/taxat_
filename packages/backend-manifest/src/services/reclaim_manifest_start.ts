import { normalizeUtcInstantString, parseUtcInstant } from "../../../domain-kernel/src/primitives/time.ts";
import {
  RunManifestRepositoryError,
  type RunManifestRepository,
  type StoredRunManifestRecord,
} from "../repositories/run_manifest_repository.ts";
import {
  buildManifestStartClaimOutcome,
  type ManifestStartClaimOutcome,
} from "../types/manifest_start_claim_outcome.ts";
import { buildReclaimStartAtomicPublication } from "./start_claim_atomic_publication.ts";

export type ReclaimManifestStartInput = {
  claim_expires_at: string;
  claim_holder_ref: string;
  claim_token: string;
  expected_manifest_row_version?: number;
  manifest_id: string;
  reclaimed_at: string;
  run_manifest_repository: RunManifestRepository;
  stale_reclaim_evidence_ref: string;
  tenant_id: string;
  transition_audit_ref?: string;
  transition_reason_code?: string;
};

function hasNonEmptyEvidence(evidenceRef: string) {
  return evidenceRef.trim().length > 0;
}

function staleLeaseStillActive(stored: StoredRunManifestRecord, reclaimedAt: string) {
  const expiresAt = stored.manifest.manifest_start_claim?.claim_expires_at_or_null;
  if (!expiresAt) {
    return false;
  }
  return parseUtcInstant(expiresAt).valueOf() > parseUtcInstant(reclaimedAt).valueOf();
}

function classifyReclaimTarget(
  stored: StoredRunManifestRecord,
  reclaimedAt: string,
  evidenceRef: string,
): ManifestStartClaimOutcome | null {
  const manifest = stored.manifest;
  const claim = manifest.manifest_start_claim;
  if (claim?.claim_state === "ACTIVE_LEASED") {
    return buildManifestStartClaimOutcome({
      outcome_code: "RECLAIM_REJECTED_ACTIVE_LEASE",
      manifest,
      stored_manifest: stored,
      reason_codes: ["START_CLAIM_ACTIVE_LEASE_PRESENT"],
    });
  }
  if (claim?.claim_state === "TERMINAL_RESULT_RECORDED") {
    return buildManifestStartClaimOutcome({
      outcome_code: "ALREADY_TERMINAL",
      manifest,
      stored_manifest: stored,
      reason_codes: ["START_CLAIM_TERMINAL_RESULT_RECORDED"],
    });
  }
  if (claim?.claim_state !== "STALE_RECLAIM_REQUIRED") {
    return buildManifestStartClaimOutcome({
      outcome_code: "INVALID_PRESTART_STATE",
      manifest,
      stored_manifest: stored,
      reason_codes: ["START_CLAIM_NOT_STALE_RECLAIM_REQUIRED"],
    });
  }
  if (!hasNonEmptyEvidence(evidenceRef)) {
    return buildManifestStartClaimOutcome({
      outcome_code: "INVALID_PRESTART_STATE",
      manifest,
      stored_manifest: stored,
      reason_codes: ["STALE_RECLAIM_EVIDENCE_REQUIRED"],
    });
  }
  if (staleLeaseStillActive(stored, reclaimedAt)) {
    return buildManifestStartClaimOutcome({
      outcome_code: "RECLAIM_REJECTED_ACTIVE_LEASE",
      manifest,
      stored_manifest: stored,
      reason_codes: ["STALE_RECLAIM_BEFORE_LEASE_EXPIRY"],
    });
  }
  if (manifest.lifecycle_state !== "IN_PROGRESS") {
    return buildManifestStartClaimOutcome({
      outcome_code: "RECOVERY_REQUIRED",
      manifest,
      stored_manifest: stored,
      reason_codes: ["RECOVERY_CHILD_REQUIRED_FOR_TERMINAL_RUN_INSTANCE"],
    });
  }
  return null;
}

async function reloadAfterReclaimConflict(input: ReclaimManifestStartInput) {
  const latest = await input.run_manifest_repository.requireManifestById(
    input.tenant_id,
    input.manifest_id,
  );
  return (
    classifyReclaimTarget(latest, input.reclaimed_at, input.stale_reclaim_evidence_ref) ??
    buildManifestStartClaimOutcome({
      outcome_code: "RECLAIM_REJECTED_ACTIVE_LEASE",
      manifest: latest.manifest,
      stored_manifest: latest,
      reason_codes: ["RECLAIM_COMPARE_AND_SWAP_CONFLICT"],
    })
  );
}

export async function reclaimManifestStart(
  input: ReclaimManifestStartInput,
): Promise<ManifestStartClaimOutcome> {
  const stored = await input.run_manifest_repository.requireManifestById(
    input.tenant_id,
    input.manifest_id,
  );
  const reclaimedAt = normalizeUtcInstantString(input.reclaimed_at);
  const existingOutcome = classifyReclaimTarget(
    stored,
    reclaimedAt,
    input.stale_reclaim_evidence_ref,
  );
  if (existingOutcome !== null) {
    return existingOutcome;
  }

  const nextManifest = buildReclaimStartAtomicPublication({
    manifest: stored.manifest,
    reclaimed_at: reclaimedAt,
    claim_expires_at: input.claim_expires_at,
    claim_holder_ref: input.claim_holder_ref,
    claim_token: input.claim_token,
  });
  nextManifest.audit_refs = Array.from(
    new Set([
      ...(nextManifest.audit_refs ?? []),
      input.transition_audit_ref ?? `audit://${stored.manifest.manifest_id}/run-reclaimed`,
      input.stale_reclaim_evidence_ref,
    ]),
  ).sort((left, right) => left.localeCompare(right));
  if (nextManifest.append_only_outcome_projection != null) {
    nextManifest.append_only_outcome_projection.audit_refs = Array.from(
      new Set([
        ...(nextManifest.append_only_outcome_projection.audit_refs ?? []),
        input.transition_audit_ref ?? `audit://${stored.manifest.manifest_id}/run-reclaimed`,
        input.stale_reclaim_evidence_ref,
      ]),
    ).sort((left, right) => left.localeCompare(right));
  }

  try {
    const updated = await input.run_manifest_repository.compareAndSwapManifest({
      expected_manifest_row_version:
        input.expected_manifest_row_version ?? stored.manifest_row_version,
      next_manifest: nextManifest,
      persisted_at: reclaimedAt,
      transition: {
        event_code: "run_started",
        from_lifecycle_state: stored.manifest.lifecycle_state,
        to_lifecycle_state: nextManifest.lifecycle_state,
        transition_audit_ref:
          input.transition_audit_ref ?? `audit://${stored.manifest.manifest_id}/run-reclaimed`,
        transition_reason_code: input.transition_reason_code ?? "START_RECLAIM_GRANTED",
        transitioned_at: reclaimedAt,
      },
    });
    return buildManifestStartClaimOutcome({
      outcome_code: "RECLAIM_GRANTED",
      manifest: updated.manifest,
      stored_manifest: updated,
      reason_codes: ["START_RECLAIM_GRANTED", input.stale_reclaim_evidence_ref],
    });
  } catch (error) {
    if (
      error instanceof RunManifestRepositoryError &&
      error.code === "RUN_MANIFEST_COMPARE_AND_SWAP_CONFLICT"
    ) {
      return reloadAfterReclaimConflict(input);
    }
    throw error;
  }
}

export class ReclaimManifestStartService {
  constructor(
    private readonly dependencies: {
      runManifestRepository: RunManifestRepository;
    },
  ) {}

  async reclaim(input: Omit<ReclaimManifestStartInput, "run_manifest_repository">) {
    return reclaimManifestStart({
      ...input,
      run_manifest_repository: this.dependencies.runManifestRepository,
    });
  }
}
