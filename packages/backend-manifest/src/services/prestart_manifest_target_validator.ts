import type { RunManifestRecord } from "../models/run_manifest.ts";

export type PrestartManifestTargetInvalidReasonCode =
  | "APPEND_ONLY_OUTCOME_DRIFT_PRESENT"
  | "DECISION_BUNDLE_HASH_PRESENT"
  | "DETERMINISTIC_OUTCOME_HASH_PRESENT"
  | "DRIFT_REFS_PRESENT"
  | "FROZEN_BASIS_MISSING"
  | "LIFECYCLE_NOT_SEALED"
  | "OPENED_AT_PRESENT"
  | "OUTPUT_REFS_PRESENT"
  | "PRESEAL_GATE_NOT_READY"
  | "REPLAY_ATTESTATION_PRESENT"
  | "SEALED_AT_MISSING"
  | "START_CLAIM_FIRST_PUBLICATION_PRESENT"
  | "START_CLAIM_HASH_MISMATCH"
  | "START_CLAIM_MISSING"
  | "START_CLAIM_NOT_UNCLAIMED"
  | "SUBMISSION_REFS_PRESENT";

export type PrestartManifestTargetValidation = {
  valid: boolean;
  reason_codes: PrestartManifestTargetInvalidReasonCode[];
};

export class PrestartManifestTargetValidationError extends Error {
  readonly reason_codes: PrestartManifestTargetInvalidReasonCode[];

  constructor(reasonCodes: PrestartManifestTargetInvalidReasonCode[]) {
    super(`INVALID_PRESTART_MANIFEST_TARGET: ${reasonCodes.join(", ")}`);
    this.name = "PrestartManifestTargetValidationError";
    this.reason_codes = [...reasonCodes];
  }
}

function pushUnique<T>(values: T[], value: T) {
  if (!values.includes(value)) {
    values.push(value);
  }
}

function hasOutcomeProjectionDrift(manifest: RunManifestRecord) {
  const projection = manifest.append_only_outcome_projection;
  return (
    projection != null &&
    (Object.keys(projection.output_refs ?? {}).length > 0 ||
      projection.submission_refs.length > 0 ||
      projection.drift_refs.length > 0 ||
      projection.decision_bundle_hash !== null ||
      projection.deterministic_outcome_hash !== null ||
      projection.replay_attestation_ref !== null)
  );
}

export function validatePrestartManifestTarget(
  manifest: RunManifestRecord,
): PrestartManifestTargetValidation {
  const reasonCodes: PrestartManifestTargetInvalidReasonCode[] = [];

  if (manifest.lifecycle_state !== "SEALED") {
    pushUnique(reasonCodes, "LIFECYCLE_NOT_SEALED");
  }
  if (manifest.sealed_at === null) {
    pushUnique(reasonCodes, "SEALED_AT_MISSING");
  }
  if (manifest.opened_at !== null) {
    pushUnique(reasonCodes, "OPENED_AT_PRESENT");
  }
  if (
    manifest.hash_set == null ||
    manifest.frozen_execution_binding == null ||
    manifest.config_freeze == null ||
    manifest.input_freeze == null
  ) {
    pushUnique(reasonCodes, "FROZEN_BASIS_MISSING");
  }
  if (manifest.preseal_gate_evaluation?.completion_state !== "COMPLETE_READY_TO_SEAL") {
    pushUnique(reasonCodes, "PRESEAL_GATE_NOT_READY");
  }
  if (manifest.manifest_start_claim == null) {
    pushUnique(reasonCodes, "START_CLAIM_MISSING");
  } else {
    if (manifest.manifest_start_claim.claim_state !== "UNCLAIMED_SEALED") {
      pushUnique(reasonCodes, "START_CLAIM_NOT_UNCLAIMED");
    }
    if (
      manifest.hash_set != null &&
      (manifest.manifest_start_claim.manifest_hash !== manifest.hash_set.manifest_hash ||
        manifest.manifest_start_claim.execution_basis_hash !==
          manifest.hash_set.execution_basis_hash ||
        manifest.manifest_start_claim.access_binding_hash !== manifest.access_binding_hash)
    ) {
      pushUnique(reasonCodes, "START_CLAIM_HASH_MISMATCH");
    }
    if (
      manifest.manifest_start_claim.stage_dag_ref_or_null !== null ||
      manifest.manifest_start_claim.outbox_batch_ref_or_null !== null ||
      manifest.manifest_start_claim.first_publication_committed_at_or_null !== null
    ) {
      pushUnique(reasonCodes, "START_CLAIM_FIRST_PUBLICATION_PRESENT");
    }
  }
  if (Object.keys(manifest.output_refs).length > 0) {
    pushUnique(reasonCodes, "OUTPUT_REFS_PRESENT");
  }
  if (manifest.submission_refs.length > 0) {
    pushUnique(reasonCodes, "SUBMISSION_REFS_PRESENT");
  }
  if (manifest.drift_refs.length > 0) {
    pushUnique(reasonCodes, "DRIFT_REFS_PRESENT");
  }
  if (manifest.decision_bundle_hash !== null) {
    pushUnique(reasonCodes, "DECISION_BUNDLE_HASH_PRESENT");
  }
  if (manifest.deterministic_outcome_hash !== null) {
    pushUnique(reasonCodes, "DETERMINISTIC_OUTCOME_HASH_PRESENT");
  }
  if (manifest.replay_attestation_ref !== null) {
    pushUnique(reasonCodes, "REPLAY_ATTESTATION_PRESENT");
  }
  if (hasOutcomeProjectionDrift(manifest)) {
    pushUnique(reasonCodes, "APPEND_ONLY_OUTCOME_DRIFT_PRESENT");
  }

  return {
    valid: reasonCodes.length === 0,
    reason_codes: reasonCodes,
  };
}

export function assertPrestartManifestTarget(manifest: RunManifestRecord) {
  const validation = validatePrestartManifestTarget(manifest);
  if (!validation.valid) {
    throw new PrestartManifestTargetValidationError(validation.reason_codes);
  }
  return manifest;
}
