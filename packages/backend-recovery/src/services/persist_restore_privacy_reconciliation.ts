import type { RestorePrivacyReconciliationContract } from "../models/recovery_checkpoint.ts";
import type { RestorePrivacyReconciliationRepository } from "../repositories/restore_privacy_reconciliation_repository.ts";

export async function persistRestorePrivacyReconciliation(input: {
  repository: RestorePrivacyReconciliationRepository;
  contract: RestorePrivacyReconciliationContract;
  persisted_at: string;
}) {
  return input.repository.persistRestorePrivacyReconciliation({
    contract: input.contract,
    persisted_at: input.persisted_at,
  });
}
