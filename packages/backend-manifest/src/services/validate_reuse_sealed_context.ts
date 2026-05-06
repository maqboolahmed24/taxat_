import type { ManifestRejectionReasonCode } from "../models/manifest_branch_decision_contract.ts";
import type { RunManifestRecord } from "../models/run_manifest.ts";
import { getPriorManifestHash } from "./prior_manifest_compatibility_validator.ts";

export type ReuseSealedContextValidation = {
  reason_codes: ManifestRejectionReasonCode[];
  reusable: boolean;
};

export type ReuseSealedContextValidationErrorCode = "SEALED_CONTEXT_REUSE_INVALID";

export class ReuseSealedContextValidationError extends Error {
  readonly code: ReuseSealedContextValidationErrorCode;
  readonly reason_codes: ManifestRejectionReasonCode[];

  constructor(reasonCodes: ManifestRejectionReasonCode[]) {
    super(`SEALED_CONTEXT_REUSE_INVALID: ${reasonCodes.join(", ")}`);
    this.name = "ReuseSealedContextValidationError";
    this.code = "SEALED_CONTEXT_REUSE_INVALID";
    this.reason_codes = reasonCodes;
  }
}

function hasNestedPostStartProjection(manifest: RunManifestRecord) {
  const projection = manifest.append_only_outcome_projection;
  return (
    projection !== null &&
    (Object.keys(projection.output_refs).length > 0 ||
      projection.submission_refs.length > 0 ||
      projection.drift_refs.length > 0 ||
      projection.decision_bundle_hash !== null ||
      projection.deterministic_outcome_hash !== null ||
      projection.replay_attestation_ref !== null)
  );
}

export function validateReuseSealedContext(
  manifest: RunManifestRecord,
): ReuseSealedContextValidation {
  const reasonCodes: ManifestRejectionReasonCode[] = [];
  if (getPriorManifestHash(manifest) === null) {
    reasonCodes.push("PRIOR_MANIFEST_HASH_MISSING");
  }
  if (manifest.lifecycle_state !== "SEALED" || manifest.sealed_at === null) {
    reasonCodes.push("PRIOR_MANIFEST_NOT_SEALED");
  }
  if (
    manifest.opened_at !== null ||
    Object.keys(manifest.output_refs).length > 0 ||
    manifest.submission_refs.length > 0 ||
    manifest.drift_refs.length > 0 ||
    manifest.decision_bundle_hash !== null ||
    manifest.deterministic_outcome_hash !== null ||
    manifest.replay_attestation_ref !== null ||
    hasNestedPostStartProjection(manifest) ||
    manifest.manifest_start_claim?.claim_state !== "UNCLAIMED_SEALED"
  ) {
    reasonCodes.push("PRIOR_MANIFEST_ALREADY_STARTED");
  }

  return {
    reusable: reasonCodes.length === 0,
    reason_codes: [...new Set(reasonCodes)],
  };
}

export function assertReuseSealedContext(manifest: RunManifestRecord) {
  const validation = validateReuseSealedContext(manifest);
  if (!validation.reusable) {
    throw new ReuseSealedContextValidationError(validation.reason_codes);
  }
  return manifest;
}
