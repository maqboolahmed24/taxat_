import { expect, test } from "@playwright/test";

import {
  buildTwinDeltaArcRecord,
  planTwinReconciliation,
  TwinReconciliationStateRepository,
  transitionTwinReconciliationState,
  twinDeltaArcRef,
} from "../../../packages/backend-twin/src/index.ts";

const at = "2026-04-29T13:00:00Z";

function delta(
  delta_class: Parameters<typeof buildTwinDeltaArcRecord>[0]["delta_class"],
  overrides: Partial<Parameters<typeof buildTwinDeltaArcRecord>[0]> = {},
) {
  const subject_identity_code = overrides.subject_identity_code ?? `VAT_BOX_${delta_class}`;
  return buildTwinDeltaArcRecord({
    authority_scope_ref_or_null: "authority://hmrc/vat",
    basis_type_or_null: "VAT_RETURN",
    business_partition_ref_or_null: "partition://vat",
    delta_class,
    last_compared_at: at,
    left_observed_at: at,
    left_subject_refs:
      delta_class === "AUTHORITY_ONLY" ? [] : [`internal-subject://${subject_identity_code}`],
    period_ref_or_null: "period://2026-Q1",
    reporting_scope_ref_or_null: "scope://client-0132/vat",
    right_observed_at: at,
    right_subject_refs:
      delta_class === "INTERNAL_ONLY" ? [] : [`authority-subject://${subject_identity_code}`],
    subject_class: "ACKNOWLEDGEMENT",
    subject_identity_code,
    timeline_ref: "twin-timeline://reconciliation-test",
    twin_id: "twin-reconciliation-0132",
    ...overrides,
  });
}

test("plans NOT_REQUIRED only when no active mismatch requires reconciliation", async () => {
  const result = await planTwinReconciliation({
    deltas: [delta("MATCH_EXACT", { subject_identity_code: "MATCHED" })],
    generated_at: at,
    twin_id: "twin-reconciliation-0132",
  });

  expect(result.reconciliation_state).toMatchObject({
    auto_attempt_count: 0,
    lifecycle_state: "NOT_REQUIRED",
    next_action_owner: "NONE",
    reconciliation_budget_state: "NOT_APPLICABLE",
    resolution_state: "NONE",
    target_mismatch_refs: [],
  });
});

test("dedupes identical unresolved deltas into one active state", async () => {
  const repository = new TwinReconciliationStateRepository();
  const partial = delta("ACK_PARTIAL");
  const first = await planTwinReconciliation({
    deltas: [partial],
    generated_at: at,
    repository,
    twin_id: "twin-reconciliation-0132",
  });
  const second = await planTwinReconciliation({
    deltas: [partial],
    generated_at: at,
    repository,
    twin_id: "twin-reconciliation-0132",
  });

  expect(second.reconciliation_dedupe_key).toBe(first.reconciliation_dedupe_key);
  expect(second.reconciliation_state.twin_reconciliation_state_id).toBe(
    first.reconciliation_state.twin_reconciliation_state_id,
  );
  await expect(
    repository.listTwinReconciliationStatesByTwinId("twin-reconciliation-0132"),
  ).resolves.toHaveLength(1);
});

test("keeps pending authority acknowledgements waiting while budget remains open", async () => {
  const pending = delta("ACK_PENDING");
  const result = await planTwinReconciliation({
    auto_attempt_count: 1,
    deltas: [pending],
    generated_at: at,
    profile: { max_auto_attempts: 3, reconciliation_window_seconds: 3600 },
    twin_id: "twin-reconciliation-0132",
  });

  expect(result.reconciliation_state.lifecycle_state).toBe("WAITING_ON_AUTHORITY");
  expect(result.reconciliation_state.next_action_owner).toBe("AUTHORITY");
  expect(result.reconciliation_state.reconciliation_budget_state).toBe("WITHIN_BUDGET");
  expect(result.reconciliation_state.target_mismatch_refs).toEqual([twinDeltaArcRef(pending)]);
});

test("opens owned workflow when waiting-on-authority exceeds budget or deadline", async () => {
  const pending = delta("ACK_PENDING");
  const exhausted = await planTwinReconciliation({
    auto_attempt_count: 2,
    deltas: [pending],
    generated_at: at,
    profile: { max_auto_attempts: 2, reconciliation_window_seconds: 3600 },
    twin_id: "twin-reconciliation-0132",
  });
  const expired = await planTwinReconciliation({
    auto_attempt_count: 0,
    deltas: [pending],
    generated_at: at,
    profile: { max_auto_attempts: 2, reconciliation_window_seconds: -1 },
    twin_id: "twin-reconciliation-expired-0132",
  });

  expect(exhausted.reconciliation_state).toMatchObject({
    lifecycle_state: "WAITING_ON_OPERATOR",
    next_action_owner: "OPERATOR",
    reconciliation_budget_state: "EXHAUSTED",
  });
  expect(exhausted.reconciliation_state.primary_workflow_item_ref_or_null).toContain(
    "workflow-item://twin-reconciliation/",
  );
  expect(expired.reconciliation_state).toMatchObject({
    lifecycle_state: "WAITING_ON_OPERATOR",
    next_action_owner: "OPERATOR",
    reconciliation_budget_state: "MANUAL_ESCALATION",
  });
});

test("transitions preserve budget exhaustion and require explicit resolution state", async () => {
  const pending = delta("ACK_PENDING");
  const planned = await planTwinReconciliation({
    auto_attempt_count: 2,
    deltas: [pending],
    generated_at: at,
    profile: { max_auto_attempts: 2 },
    twin_id: "twin-reconciliation-transition-0132",
  });
  const progressed = await transitionTwinReconciliationState({
    current: planned.reconciliation_state,
    event: "operator_action_recorded",
    transitioned_at: "2026-04-29T13:05:00Z",
  });

  expect(progressed.reconciliation_state.auto_attempt_count).toBe(2);
  expect(progressed.reconciliation_state.reconciliation_budget_state).toBe("EXHAUSTED");
  await expect(
    transitionTwinReconciliationState({
      current: progressed.reconciliation_state,
      event: "awaiting_authority_window",
      transitioned_at: "2026-04-29T13:06:00Z",
    }),
  ).rejects.toThrow(/exhausted automatic budget/);

  const resolved = await transitionTwinReconciliationState({
    current: progressed.reconciliation_state,
    event: "resolution_proved",
    resolution_state: "RESOLVED_OUT_OF_BAND",
    transitioned_at: "2026-04-29T13:10:00Z",
  });
  expect(resolved.reconciliation_state).toMatchObject({
    lifecycle_state: "RESOLVED",
    next_action_owner: "NONE",
    recommended_action_code: "RESOLVED",
    resolution_state: "RESOLVED_OUT_OF_BAND",
    resolved_at: "2026-04-29T13:10:00Z",
  });
});
