import {
  type AuthorityReconciliationControlContract,
  AuthorityModelError,
  normalizeAuthorityReconciliationControlContract,
  normalizeTimestamp,
} from "../models/authority_common.ts";
import {
  type AuthorityInteractionRecord,
  authorityInteractionRecordRef,
  normalizeAuthorityInteractionRecord,
} from "../models/authority_interaction_record.ts";
import type { AuthorityInteractionRecordRepository } from "../repositories/authority_interaction_record_repository.ts";

function mergeUnique(left: readonly string[], right: readonly string[]) {
  return [...new Set([...left, ...right])].sort();
}

export async function persistAuthorityReconciliationControl(input: {
  audit_refs?: readonly string[];
  control: AuthorityReconciliationControlContract;
  interaction: AuthorityInteractionRecord;
  last_status_at?: string;
  provenance_refs?: readonly string[];
  repository?: AuthorityInteractionRecordRepository;
}) {
  const control = normalizeAuthorityReconciliationControlContract(input.control);
  if (control.binding_scope_class !== "AUTHORITY_INTERACTION_RECORD") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "persistAuthorityReconciliationControl only accepts AUTHORITY_INTERACTION_RECORD scoped controls",
    );
  }
  if (control.interaction_ref_or_null !== authorityInteractionRecordRef(input.interaction)) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "reconciliation control interaction_ref_or_null must match the target interaction",
    );
  }
  const next = normalizeAuthorityInteractionRecord({
    ...input.interaction,
    audit_refs: mergeUnique(
      input.interaction.audit_refs,
      input.audit_refs ?? [
        `audit://authority-interaction/${input.interaction.interaction_id}/reconciliation-control`,
      ],
    ),
    last_status_at: normalizeTimestamp(
      "last_status_at",
      input.last_status_at ?? control.last_budget_event_at,
    ),
    max_auto_reconciliation_attempts: control.max_auto_reconciliation_attempts,
    next_reconciliation_at: control.next_reconciliation_at_or_null,
    provenance_refs: mergeUnique(
      input.interaction.provenance_refs,
      input.provenance_refs ?? [control.control_contract_hash],
    ),
    reconciliation_attempt_count: control.reconciliation_attempt_count,
    reconciliation_budget_state: control.reconciliation_budget_state,
    reconciliation_cadence_seconds: control.reconciliation_cadence_seconds_or_null,
    reconciliation_control_contract: control,
    reconciliation_deadline_at: control.reconciliation_deadline_at_or_null,
    reconciliation_workflow_item_ref:
      control.escalation_workflow_item_ref_or_null ?? input.interaction.reconciliation_workflow_item_ref,
    reconciliation_method: control.reconciliation_method,
    resend_control_reason_codes: control.resend_control_reason_codes,
    resend_legality_state: control.resend_legality_state,
  });
  const stored = input.repository
    ? await input.repository.persistAuthorityInteractionRecord({ interaction: next })
    : null;
  return { interaction: next, stored };
}
