import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import type { RunManifestRecord } from "../models/run_manifest.ts";
import {
  RunManifestRepositoryError,
  type RunManifestRepository,
  type StoredRunManifestRecord,
} from "../repositories/run_manifest_repository.ts";
import {
  applyRunManifestTransitionDefaults,
  validateRunManifestTransition,
} from "../state/manifest_transition_validator.ts";
import {
  buildManifestStartClaimOutcome,
  type ManifestStartClaimOutcome,
} from "../types/manifest_start_claim_outcome.ts";
import { buildStartClaimAtomicPublication } from "./start_claim_atomic_publication.ts";
import { validatePrestartManifestTarget } from "./prestart_manifest_target_validator.ts";

export type ClaimManifestStartInput = {
  claim_expires_at: string;
  claim_holder_ref: string;
  claim_token: string;
  claimed_at: string;
  expected_manifest_row_version?: number;
  first_stage_dag_ref: string;
  manifest_id: string;
  outbox_batch_ref: string;
  run_manifest_repository: RunManifestRepository;
  tenant_id: string;
  transition_audit_ref?: string;
  transition_reason_code?: string;
};

const TERMINAL_LIFECYCLE_STATES = new Set<RunManifestRecord["lifecycle_state"]>([
  "COMPLETED",
  "BLOCKED",
  "SUPERSEDED",
  "REPLAY_ONLY",
  "RETIRED",
]);

function classifyExistingManifest(
  stored: StoredRunManifestRecord,
): ManifestStartClaimOutcome | null {
  const manifest = stored.manifest;
  const claimState = manifest.manifest_start_claim?.claim_state ?? null;
  if (claimState === "ACTIVE_LEASED") {
    return buildManifestStartClaimOutcome({
      outcome_code: "ALREADY_ACTIVE",
      manifest,
      stored_manifest: stored,
      reason_codes: ["START_CLAIM_ACTIVE_LEASE_PRESENT"],
    });
  }
  if (claimState === "STALE_RECLAIM_REQUIRED") {
    return buildManifestStartClaimOutcome({
      outcome_code: "RECOVERY_REQUIRED",
      manifest,
      stored_manifest: stored,
      reason_codes: ["START_CLAIM_STALE_RECLAIM_REQUIRED"],
    });
  }
  if (claimState === "TERMINAL_RESULT_RECORDED" || TERMINAL_LIFECYCLE_STATES.has(manifest.lifecycle_state)) {
    return buildManifestStartClaimOutcome({
      outcome_code: "ALREADY_TERMINAL",
      manifest,
      stored_manifest: stored,
      reason_codes: ["START_CLAIM_TERMINAL_RESULT_RECORDED"],
    });
  }
  if (manifest.lifecycle_state !== "SEALED") {
    return buildManifestStartClaimOutcome({
      outcome_code: "INVALID_PRESTART_STATE",
      manifest,
      stored_manifest: stored,
      reason_codes: ["LIFECYCLE_NOT_SEALED"],
    });
  }
  return null;
}

async function reloadAfterCompareAndSwapConflict(input: ClaimManifestStartInput) {
  const latest = await input.run_manifest_repository.requireManifestById(
    input.tenant_id,
    input.manifest_id,
  );
  return (
    classifyExistingManifest(latest) ??
    buildManifestStartClaimOutcome({
      outcome_code: "INVALID_PRESTART_STATE",
      manifest: latest.manifest,
      stored_manifest: latest,
      reason_codes: ["START_CLAIM_COMPARE_AND_SWAP_CONFLICT"],
    })
  );
}

export async function claimManifestStart(
  input: ClaimManifestStartInput,
): Promise<ManifestStartClaimOutcome> {
  const stored = await input.run_manifest_repository.requireManifestById(
    input.tenant_id,
    input.manifest_id,
  );
  const existingOutcome = classifyExistingManifest(stored);
  if (existingOutcome !== null) {
    return existingOutcome;
  }

  const prestartValidation = validatePrestartManifestTarget(stored.manifest);
  if (!prestartValidation.valid) {
    return buildManifestStartClaimOutcome({
      outcome_code: "INVALID_PRESTART_STATE",
      manifest: stored.manifest,
      stored_manifest: stored,
      reason_codes: prestartValidation.reason_codes,
    });
  }

  const claimedAt = normalizeUtcInstantString(input.claimed_at);
  const nextManifest = buildStartClaimAtomicPublication({
    manifest: stored.manifest,
    claim_acquired_at: claimedAt,
    claim_expires_at: input.claim_expires_at,
    claim_holder_ref: input.claim_holder_ref,
    claim_token: input.claim_token,
    stage_dag_ref: input.first_stage_dag_ref,
    outbox_batch_ref: input.outbox_batch_ref,
  });
  applyRunManifestTransitionDefaults({
    current_manifest: stored.manifest,
    event_code: "run_started",
    transition_applied_at: claimedAt,
    transition_audit_ref:
      input.transition_audit_ref ?? `audit://${stored.manifest.manifest_id}/run-started`,
    next_manifest: nextManifest,
  });
  validateRunManifestTransition({
    current_manifest: stored.manifest,
    event_code: "run_started",
    next_manifest: nextManifest,
  });

  try {
    const updated = await input.run_manifest_repository.compareAndSwapManifest({
      expected_manifest_row_version:
        input.expected_manifest_row_version ?? stored.manifest_row_version,
      next_manifest: nextManifest,
      persisted_at: claimedAt,
      transition: {
        event_code: "run_started",
        from_lifecycle_state: stored.manifest.lifecycle_state,
        to_lifecycle_state: nextManifest.lifecycle_state,
        transition_audit_ref:
          input.transition_audit_ref ?? `audit://${stored.manifest.manifest_id}/run-started`,
        transition_reason_code: input.transition_reason_code ?? "START_CLAIM_GRANTED",
        transitioned_at: claimedAt,
      },
    });
    return buildManifestStartClaimOutcome({
      outcome_code: "CLAIM_GRANTED",
      manifest: updated.manifest,
      stored_manifest: updated,
      reason_codes: ["START_CLAIM_GRANTED"],
    });
  } catch (error) {
    if (
      error instanceof RunManifestRepositoryError &&
      error.code === "RUN_MANIFEST_COMPARE_AND_SWAP_CONFLICT"
    ) {
      return reloadAfterCompareAndSwapConflict(input);
    }
    throw error;
  }
}

export class ClaimManifestStartService {
  constructor(
    private readonly dependencies: {
      runManifestRepository: RunManifestRepository;
    },
  ) {}

  async claim(input: Omit<ClaimManifestStartInput, "run_manifest_repository">) {
    return claimManifestStart({
      ...input,
      run_manifest_repository: this.dependencies.runManifestRepository,
    });
  }
}
