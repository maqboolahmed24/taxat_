import {
  assertRestoreDrillResultRecord,
  deriveRestoreVerificationHash,
  restoreDrillResultIsPromotionEligible,
  type RestoreDrillResultRecord,
} from "../models/restore_drill_result.ts";

export type RestoreDrillPromotionReadiness = {
  promotion_eligible: true;
  restore_drill_ref: string;
  restore_checkpoint_ref: string;
  restore_verification_hash: string;
  privacy_reconciliation_contract_hash: string;
};

export class RestoreDrillPromotionReadinessError extends Error {
  readonly code = "RESTORE_DRILL_PROMOTION_NOT_READY" as const;

  constructor(detail: string) {
    super(`${"RESTORE_DRILL_PROMOTION_NOT_READY"}: ${detail}`);
    this.name = "RestoreDrillPromotionReadinessError";
  }
}

export function validateRestoreDrillPromotionReadiness(
  input: RestoreDrillResultRecord,
): RestoreDrillPromotionReadiness {
  const result = assertRestoreDrillResultRecord(input);
  if (!restoreDrillResultIsPromotionEligible(result)) {
    throw new RestoreDrillPromotionReadinessError(
      "restore drill result must be PASSED with audit, privacy, queue, authority rebuild, authority binding revalidation, and final reopen-safe privacy reconciliation",
    );
  }
  return {
    promotion_eligible: true,
    restore_drill_ref: result.restore_drill_id,
    restore_checkpoint_ref: result.checkpoint_ref,
    restore_verification_hash: deriveRestoreVerificationHash(result),
    privacy_reconciliation_contract_hash:
      result.privacy_reconciliation_contract.reconciliation_contract_hash,
  };
}
