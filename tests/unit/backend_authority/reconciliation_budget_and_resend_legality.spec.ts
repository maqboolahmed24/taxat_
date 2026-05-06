import { expect, test } from "@playwright/test";

import {
  buildInteractionReconciliationControlContract,
  classifyResendLegalityState,
  scheduleNextReconciliation,
} from "../../../packages/backend-authority/src/index.ts";

const base = {
  authority_operation_profile_ref: "authority-operation-profile://0140-budget",
  duplicate_meaning_key: "duplicate-meaning://0140-budget",
  idempotency_key: "idempotency-key://0140-budget",
  interaction_id: "interaction-0140-budget",
  operation_family: "AUTH_SUBMIT_PERIODIC_UPDATE",
  provider_environment: "HMRC_SANDBOX",
};

test("schedules deterministic bounded follow-up and preserves replay hash", () => {
  const schedule = scheduleNextReconciliation({
    as_of: "2026-04-29T11:00:00Z",
    idempotency_key: base.idempotency_key,
    max_auto_reconciliation_attempts: 3,
    reconciliation_attempt_count: 0,
    reconciliation_cadence_seconds: 300,
    reconciliation_deadline_at: "2026-04-29T12:00:00Z",
  });
  const replay = scheduleNextReconciliation({
    as_of: "2026-04-29T11:00:00Z",
    idempotency_key: base.idempotency_key,
    max_auto_reconciliation_attempts: 3,
    reconciliation_attempt_count: 0,
    reconciliation_cadence_seconds: 300,
    reconciliation_deadline_at: "2026-04-29T12:00:00Z",
  });

  expect(replay).toEqual(schedule);
  expect(schedule.schedule_state).toBe("ACTIVE");
  expect(schedule.delay_seconds).toBeGreaterThanOrEqual(300);
  expect(schedule.next_reconciliation_at).not.toBeNull();
});

test("freezes active reconciliation budget into one grouped control contract", () => {
  const control = buildInteractionReconciliationControlContract({
    ...base,
    authority_truth_state: "UNKNOWN",
    last_budget_event_at: "2026-04-29T11:00:00Z",
    max_auto_reconciliation_attempts: 3,
    reconciliation_attempt_count: 0,
    reconciliation_budget_state: "ACTIVE",
    reconciliation_cadence_seconds_or_null: 300,
    reconciliation_deadline_at_or_null: "2026-04-29T12:00:00Z",
    reconciliation_method: "POLL_STATUS",
  });
  const replay = buildInteractionReconciliationControlContract({
    ...base,
    authority_truth_state: "UNKNOWN",
    last_budget_event_at: "2026-04-29T11:00:00Z",
    max_auto_reconciliation_attempts: 3,
    reconciliation_attempt_count: 0,
    reconciliation_budget_state: "ACTIVE",
    reconciliation_cadence_seconds_or_null: 300,
    reconciliation_deadline_at_or_null: "2026-04-29T12:00:00Z",
    reconciliation_method: "POLL_STATUS",
  });

  expect(replay.control_contract_hash).toBe(control.control_contract_hash);
  expect(control.replay_resume_policy).toBe("RESUME_PERSISTED_BUDGET_ONLY");
  expect(control.resend_legality_state).toBe("FOLLOW_UP_READ_ONLY");
});

test("blocks resend on contradictory evidence before nominal attempts are exhausted", () => {
  const decision = classifyResendLegalityState({
    budget_state: "ACTIVE",
    contradictory_authority_evidence: true,
    lifecycle_state: "RECONCILING",
    meaning_resolution_state: "RECONCILIATION_REQUIRED",
  });

  expect(decision.resend_legality_state).toBe("BLOCKED_BY_RECONCILIATION");
  expect(decision.resend_control_reason_codes).toEqual(["CONTRADICTORY_AUTHORITY_EVIDENCE"]);
});

test("exhaustion blocks resend and opens durable escalation evidence", () => {
  const control = buildInteractionReconciliationControlContract({
    ...base,
    authority_truth_state: "UNKNOWN",
    last_budget_event_at: "2026-04-29T11:50:00Z",
    max_auto_reconciliation_attempts: 1,
    reconciliation_attempt_count: 1,
    reconciliation_budget_state: "EXHAUSTED",
    reconciliation_cadence_seconds_or_null: 300,
    reconciliation_deadline_at_or_null: "2026-04-29T12:00:00Z",
    reconciliation_method: "POLL_STATUS",
  });

  expect(control.reconciliation_budget_state).toBe("EXHAUSTED");
  expect(control.resend_legality_state).toBe("BLOCKED_BY_RECONCILIATION");
  expect(control.escalation_state).toBe("READY_FOR_ESCALATION");
  expect(control.escalation_evidence_refs.length).toBeGreaterThan(0);
});

test("escalation preserves owner, workflow, evidence, due time, and blocked resend posture", () => {
  const control = buildInteractionReconciliationControlContract({
    ...base,
    authority_truth_state: "UNKNOWN",
    escalation_due_at_or_null: "2026-04-29T13:00:00Z",
    escalation_evidence_refs: ["authority-evidence://0140-budget/escalation"],
    escalation_owner_ref_or_null: "operator://authority-ops",
    escalation_reason_codes: ["AUTO_RECONCILIATION_BUDGET_EXHAUSTED"],
    escalation_workflow_item_ref_or_null: "workflow-item://0140-budget/escalation",
    last_budget_event_at: "2026-04-29T12:00:00Z",
    max_auto_reconciliation_attempts: 1,
    reconciliation_attempt_count: 1,
    reconciliation_budget_state: "ESCALATED",
    reconciliation_cadence_seconds_or_null: 300,
    reconciliation_deadline_at_or_null: "2026-04-29T12:00:00Z",
    reconciliation_method: "POLL_STATUS",
  });

  expect(control.reconciliation_budget_state).toBe("ESCALATED");
  expect(control.resend_legality_state).toBe("BLOCKED_BY_ESCALATION");
  expect(control.escalation_owner_ref_or_null).toBe("operator://authority-ops");
  expect(control.escalation_workflow_item_ref_or_null).toBe(
    "workflow-item://0140-budget/escalation",
  );
  expect(control.escalation_due_at_or_null).toBe("2026-04-29T13:00:00Z");
});
