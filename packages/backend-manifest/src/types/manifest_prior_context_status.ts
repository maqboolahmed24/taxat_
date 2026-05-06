import type { ManifestRejectionReasonCode } from "../models/manifest_branch_decision_contract.ts";
import type { RunManifestRecord } from "../models/run_manifest.ts";
import type {
  ManifestRequestIdentity,
  ManifestRequestIdentityInput,
} from "../services/compute_request_identity_hash.ts";

export type ManifestPriorContextStatus = "ABSENT" | "INVALID" | "VALID";

export type PriorManifestInvalidReasonCode =
  | "ACCESS_BINDING_HASH_MISMATCH"
  | "CLIENT_ID_MISMATCH"
  | "EFFECTIVE_SCOPE_MISMATCH"
  | "LINEAGE_MIRROR_MISMATCH"
  | "MANIFEST_HASH_MISSING"
  | "MODE_MISMATCH"
  | "NIGHTLY_WINDOW_MISMATCH"
  | "PERIOD_MISMATCH"
  | "REPLAY_CLASS_MISMATCH"
  | "REQUESTED_SCOPE_MISMATCH"
  | "REQUEST_IDENTITY_HASH_MISMATCH"
  | "RUN_KIND_MISMATCH"
  | "TENANT_ID_MISMATCH";

export type PriorManifestCompatibilityEvaluation = {
  blocking_reason_codes: PriorManifestInvalidReasonCode[];
  branch_disqualifier_reason_codes: ManifestRejectionReasonCode[];
  identity_drift_reason_codes: PriorManifestInvalidReasonCode[];
  request_identity_matches_prior: boolean;
};

export type LoadedPriorManifestContext = {
  compatibility: PriorManifestCompatibilityEvaluation | null;
  invalid_reason_codes: PriorManifestInvalidReasonCode[];
  prior_manifest: RunManifestRecord | null;
  prior_manifest_hash: string | null;
  request: ManifestRequestIdentityInput;
  request_identity: ManifestRequestIdentity;
  status: ManifestPriorContextStatus;
};
