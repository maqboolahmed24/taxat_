import type { ManifestStartClaimContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import type { RunManifestRecord } from "../models/run_manifest.ts";
import type { StoredRunManifestRecord } from "../repositories/run_manifest_repository.ts";

export type ManifestStartClaimOutcomeCode =
  | "CLAIM_GRANTED"
  | "ALREADY_ACTIVE"
  | "ALREADY_TERMINAL"
  | "INVALID_PRESTART_STATE"
  | "RECOVERY_REQUIRED"
  | "RECLAIM_GRANTED"
  | "RECLAIM_REJECTED_ACTIVE_LEASE";

export type ManifestStartClaimOutcome = {
  outcome_code: ManifestStartClaimOutcomeCode;
  manifest: RunManifestRecord;
  stored_manifest: StoredRunManifestRecord | null;
  manifest_start_claim: ManifestStartClaimContract | null;
  attempt_lineage_ref: string | null;
  claim_epoch: number | null;
  claim_token_or_null: string | null;
  claim_holder_ref_or_null: string | null;
  first_publication_committed: boolean;
  reason_codes: string[];
};

export function buildManifestStartClaimOutcome(input: {
  manifest: RunManifestRecord;
  outcome_code: ManifestStartClaimOutcomeCode;
  reason_codes?: string[];
  stored_manifest?: StoredRunManifestRecord | null;
}): ManifestStartClaimOutcome {
  const claim = input.manifest.manifest_start_claim ?? null;
  return {
    outcome_code: input.outcome_code,
    manifest: structuredClone(input.manifest),
    stored_manifest: input.stored_manifest ? structuredClone(input.stored_manifest) : null,
    manifest_start_claim: claim ? structuredClone(claim) : null,
    attempt_lineage_ref: claim?.attempt_lineage_ref ?? null,
    claim_epoch: claim?.claim_epoch ?? null,
    claim_token_or_null: claim?.claim_token_or_null ?? null,
    claim_holder_ref_or_null: claim?.claim_holder_ref_or_null ?? null,
    first_publication_committed:
      claim?.stage_dag_ref_or_null != null &&
      claim.outbox_batch_ref_or_null != null &&
      claim.first_publication_committed_at_or_null != null,
    reason_codes: [...(input.reason_codes ?? [])],
  };
}
