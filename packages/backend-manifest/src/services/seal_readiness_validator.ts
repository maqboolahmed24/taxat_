import type { RunManifestRecord } from "../models/run_manifest.ts";
import { validateRunManifestMirrorConsistency } from "./manifest_mirror_consistency_validator.ts";
import { assertPresealGateChain } from "./preseal_gate_chain_validator.ts";
import { validateManifestLineageProjection } from "./validate_manifest_lineage_projection.ts";

export type SealReadinessValidation = {
  reason_codes: string[];
  valid: boolean;
};

export type SealReadinessValidationErrorCode = "SEAL_READINESS_INVALID";

export class SealReadinessValidationError extends Error {
  readonly code: SealReadinessValidationErrorCode;
  readonly reason_codes: string[];

  constructor(reasonCodes: string[]) {
    super(`SEAL_READINESS_INVALID: ${reasonCodes.join(", ")}`);
    this.name = "SealReadinessValidationError";
    this.code = "SEAL_READINESS_INVALID";
    this.reason_codes = [...reasonCodes];
  }
}

function collectThrownReason(error: unknown) {
  if (error && typeof error === "object" && "reason_codes" in error) {
    const reasonCodes = (error as { reason_codes?: unknown }).reason_codes;
    if (Array.isArray(reasonCodes)) {
      return reasonCodes.filter((value): value is string => typeof value === "string");
    }
  }
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") {
      return [code];
    }
  }
  return ["SEAL_READINESS_UNKNOWN_VALIDATION_ERROR"];
}

export function validateSealReadiness(manifest: RunManifestRecord): SealReadinessValidation {
  const reasonCodes: string[] = [];
  if (manifest.lifecycle_state !== "FROZEN") {
    reasonCodes.push("SEAL_REQUIRES_FROZEN_MANIFEST");
  }
  if (manifest.sealed_at !== null || manifest.opened_at !== null) {
    reasonCodes.push("SEAL_REQUIRES_PRESTART_UNSEALED_MANIFEST");
  }
  if (manifest.config_freeze == null) {
    reasonCodes.push("SEAL_REQUIRES_CONFIG_FREEZE");
  }
  if (manifest.input_freeze == null) {
    reasonCodes.push("SEAL_REQUIRES_INPUT_FREEZE");
  }
  if (manifest.hash_set?.execution_basis_hash == null || manifest.hash_set.manifest_hash == null) {
    reasonCodes.push("SEAL_REQUIRES_FROZEN_HASH_SET");
  }
  if (manifest.frozen_execution_binding == null) {
    reasonCodes.push("SEAL_REQUIRES_FROZEN_EXECUTION_BINDING");
  }
  if (manifest.append_only_outcome_projection == null) {
    reasonCodes.push("SEAL_REQUIRES_APPEND_ONLY_OUTCOME_PROJECTION");
  }
  if (manifest.manifest_start_claim != null) {
    reasonCodes.push("SEAL_REQUIRES_UNCLAIMED_START_CLAIM_SLOT");
  }
  if (manifest.preseal_gate_evaluation?.completion_state !== "COMPLETE_READY_TO_SEAL") {
    reasonCodes.push("SEAL_REQUIRES_READY_PRESEAL_GATE_EVALUATION");
  }
  if (
    (manifest.access_decision?.required_approvals ?? []).some(
      (approvalRef) => !manifest.approval_refs.includes(approvalRef),
    )
  ) {
    reasonCodes.push("SEAL_REQUIRES_REQUIRED_APPROVAL_REFS");
  }

  try {
    const lineage = validateManifestLineageProjection(manifest);
    if (!lineage.valid) {
      reasonCodes.push(...lineage.reason_codes);
    }
  } catch (error) {
    reasonCodes.push(...collectThrownReason(error));
  }
  try {
    validateRunManifestMirrorConsistency(manifest);
  } catch (error) {
    reasonCodes.push(...collectThrownReason(error));
  }
  if (manifest.preseal_gate_evaluation != null) {
    try {
      assertPresealGateChain({
        manifest,
        gate_records: manifest.gating_decisions,
        evaluation: manifest.preseal_gate_evaluation,
      });
    } catch (error) {
      reasonCodes.push(...collectThrownReason(error));
    }
  }

  return {
    valid: reasonCodes.length === 0,
    reason_codes: [...new Set(reasonCodes)].sort((left, right) => left.localeCompare(right)),
  };
}

export function assertSealReadiness(manifest: RunManifestRecord) {
  const validation = validateSealReadiness(manifest);
  if (!validation.valid) {
    throw new SealReadinessValidationError(validation.reason_codes);
  }
  return validation;
}
