import { expect, test } from "@playwright/test";

import {
  AuthorityModelError,
  buildAuthorityBinding,
  buildAuthorityInteractionRecord,
  buildAuthorityOperation,
  buildAuthorityReconciliationAnalyticsSnapshot,
  buildAuthorityReconciliationAnalyticsSnapshotRecord,
  buildAuthorityRequestEnvelope,
  buildBindingDriftSentinelContract,
  buildInteractionReconciliationControlContract,
  projectReconciliationInsightViewModel,
  projectRequestIdentityContractScope,
} from "../../../packages/backend-authority/src/index.ts";

const profile = "authority-operation-profile://hmrc-periodic-0144";
const environment = "HMRC_SANDBOX";
const operationFamily = "AUTH_SUBMIT_PERIODIC_UPDATE";

function authorityTriplet(id: string) {
  const operation = buildAuthorityOperation({
    access_binding_hash: `hash.access.${id}`,
    acting_party_ref: `client://${id}`,
    authority_binding_ref: `authority-binding://${id}`,
    authority_link_ref: `authority-link://${id}`,
    basis_type: "PERIODIC_UPDATE",
    binding_lineage_ref: `authority-binding-lineage://${id}`,
    business_partitions: [`business-partition://${id}/2026-q1`],
    client_id: `client-${id}`,
    manifest_id: `manifest-${id}`,
    operation_family: operationFamily,
    operation_id: `operation-${id}`,
    operation_profile_ref: profile,
    policy_snapshot_hash: `hash.policy.${id}`,
    provider_environment: environment,
    requested_scope: ["quarterly_update", "prepare_submission", "submit"],
    runtime_scope: ["quarterly_update", "prepare_submission", "submit"],
    subject_ref: `client://${id}`,
    target_obligation_ref: `obligation://${id}/q1`,
    tenant_id: `tenant-${id}`,
    token_binding_ref: `authority-token-binding://${id}`,
  });
  const binding = buildAuthorityBinding({
    access_binding_hash: operation.access_binding_hash,
    authority_binding_id: id,
    authority_link_ref: operation.authority_link_ref,
    authority_scope: operation.authority_scope,
    binding_lineage_ref: operation.binding_lineage_ref,
    client_id: operation.client_id,
    manifest_id: operation.manifest_id,
    partition_scope_refs: operation.business_partitions,
    policy_snapshot_hash: operation.policy_snapshot_hash,
    provider_api_version: operation.provider_api_version,
    provider_environment: operation.provider_environment,
    subject_ref: operation.subject_ref,
    acting_party_ref: operation.acting_party_ref,
    tenant_id: operation.tenant_id,
    token_binding_ref: operation.token_binding_ref,
    token_version_ref: `authority-token-version://${id}/sealed`,
  });
  const request = buildAuthorityRequestEnvelope({
    client_id: operation.client_id,
    http_method: "POST",
    manifest_id: operation.manifest_id,
    operation,
    operation_family: operation.operation_family,
    operation_id: operation.operation_id,
    payload: { period: "2026-Q1" },
    payload_ref: `payload://${id}`,
    request_id: `request-${id}`,
    resolved_path_params: { clientId: operation.client_id, period: "2026-Q1" },
    resource_template: "/clients/{clientId}/periods/{period}/updates",
    tenant_id: operation.tenant_id,
  });
  const sentinel = buildBindingDriftSentinelContract({
    authority_binding: binding,
    authority_request: request,
    checked_action_class: "TRANSMIT_MUTATION",
    checked_at: "2026-04-29T09:00:00Z",
    checked_token_version_ref_or_null: binding.token_version_ref,
    decision_state: "CLEAR_TO_PROCEED",
    duplicate_truth_inputs_state: "RECHECKED_NO_CONFLICT",
    exclusive_send_claim_state: "CLAIM_HELD",
    pass_reason_code_or_null: "SEALED_TOKEN_VERSION_REUSED",
  });
  return { binding, operation, request, sentinel };
}

function fixtureInteraction(input: {
  budget_state: "ACTIVE" | "CLOSED" | "ESCALATED" | "EXHAUSTED";
  escalated_at?: string | undefined;
  id: string;
  identity_id?: string | undefined;
  last_budget_event_at: string;
  provenance_refs?: readonly string[] | undefined;
  truth_state?: "CONFIRMED" | "PENDING_ACK" | "UNKNOWN" | "REJECTED" | undefined;
}) {
  const { binding, operation, request, sentinel } = authorityTriplet(input.identity_id ?? input.id);
  const attempts = input.budget_state === "ACTIVE" ? 1 : input.budget_state === "CLOSED" ? 2 : 3;
  const control = buildInteractionReconciliationControlContract({
    authority_operation_profile_ref: profile,
    authority_truth_state:
      input.truth_state ?? (input.budget_state === "CLOSED" ? "CONFIRMED" : "UNKNOWN"),
    contradictory_authority_evidence: input.budget_state === "EXHAUSTED",
    duplicate_meaning_key: request.duplicate_meaning_key,
    escalation_due_at_or_null:
      input.budget_state === "ESCALATED" ? "2026-04-29T13:00:00Z" : undefined,
    escalation_evidence_refs:
      input.budget_state === "ESCALATED"
        ? [`authority-evidence://${input.id}/escalation`]
        : undefined,
    escalation_owner_ref_or_null:
      input.budget_state === "ESCALATED" ? "operator://authority-ops" : undefined,
    escalation_reason_codes:
      input.budget_state === "ESCALATED" || input.budget_state === "EXHAUSTED"
        ? ["AUTO_RECONCILIATION_BUDGET_EXHAUSTED"]
        : undefined,
    escalation_state: input.budget_state === "ESCALATED" ? "ESCALATED" : undefined,
    escalation_workflow_item_ref_or_null:
      input.budget_state === "ESCALATED" ? `workflow-item://${input.id}/escalation` : undefined,
    idempotency_key: request.idempotency_key,
    interaction_id: `interaction-${input.id}`,
    last_budget_event_at: input.last_budget_event_at,
    max_auto_reconciliation_attempts: 3,
    operation_family: operation.operation_family,
    provider_environment: operation.provider_environment,
    reconciliation_attempt_count: attempts,
    reconciliation_budget_state: input.budget_state,
    reconciliation_cadence_seconds_or_null: 300,
    reconciliation_deadline_at_or_null: "2026-04-29T12:00:00Z",
    reconciliation_method: "POLL_STATUS",
    resend_control_reason_codes:
      input.budget_state === "CLOSED" ? ["TERMINAL_AUTHORITY_STATE_RECORDED"] : undefined,
    resend_legality_state: input.budget_state === "CLOSED" ? "CLOSED_NO_RESEND" : undefined,
    unresolved_reason_codes:
      input.budget_state === "EXHAUSTED" ? ["CONTRADICTORY_AUTHORITY_EVIDENCE"] : undefined,
  });
  return buildAuthorityInteractionRecord({
    access_binding_hash: operation.access_binding_hash,
    active_response_id: `response-${input.id}`,
    audit_refs: [`audit://authority-interaction/${input.id}`],
    authority_binding_ref: binding.authority_binding_id.startsWith("authority-binding://")
      ? binding.authority_binding_id
      : `authority-binding://${binding.authority_binding_id}`,
    authority_link_ref: operation.authority_link_ref,
    authority_operation_profile_ref: profile,
    binding_drift_sentinel_contract: sentinel,
    binding_lineage_ref: operation.binding_lineage_ref,
    created_at: "2026-04-29T08:00:00Z",
    dispatch_ref: `dispatch://${input.id}`,
    duplicate_meaning_key: request.duplicate_meaning_key,
    idempotency_key: request.idempotency_key,
    identity_namespace_hash: request.identity_namespace_hash,
    interaction_id: `interaction-${input.id}`,
    last_status_at: input.last_budget_event_at,
    lifecycle_state: input.budget_state === "CLOSED" ? "RESOLVED" : "RECONCILING",
    manifest_id: operation.manifest_id,
    max_auto_reconciliation_attempts: control.max_auto_reconciliation_attempts,
    meaning_resolution_state:
      input.budget_state === "CLOSED" ? "RECONCILIATION_RESOLVED" : "RECONCILIATION_REQUIRED",
    next_reconciliation_at: control.next_reconciliation_at_or_null,
    operation_id: operation.operation_id,
    policy_snapshot_hash: operation.policy_snapshot_hash,
    provenance_refs: input.provenance_refs ?? [`provenance://authority-interaction/${input.id}`],
    reconciliation_attempt_count: control.reconciliation_attempt_count,
    reconciliation_budget_state: control.reconciliation_budget_state,
    reconciliation_cadence_seconds: control.reconciliation_cadence_seconds_or_null,
    reconciliation_control_contract: control,
    reconciliation_deadline_at: control.reconciliation_deadline_at_or_null,
    reconciliation_escalated_at: input.escalated_at ?? null,
    reconciliation_method: control.reconciliation_method,
    reconciliation_workflow_item_ref: control.escalation_workflow_item_ref_or_null,
    request_hash: request.request_hash,
    request_id: request.request_id,
    request_identity_contract: projectRequestIdentityContractScope(
      request.request_identity_contract,
      "AUTHORITY_INTERACTION_RECORD",
    ),
    resend_control_reason_codes: control.resend_control_reason_codes,
    resend_legality_state: control.resend_legality_state,
    resolution_basis: input.budget_state === "CLOSED" ? "RECONCILIATION_RESULT" : null,
    response_history_ids: [`response-${input.id}`],
    send_authorized_token_version_ref: binding.token_version_ref,
    send_revalidated_at: "2026-04-29T09:00:00Z",
    send_revalidation_reason_codes: ["SEALED_TOKEN_VERSION_REUSED"],
    send_revalidation_state: "CLEAR_TO_SEND",
  });
}

test("accepts a zero-interaction snapshot window with durable-only source policy", () => {
  const snapshot = buildAuthorityReconciliationAnalyticsSnapshotRecord({
    authority_operation_profile_ref: profile,
    budget_state_counts: [],
    generated_at: "2026-04-29T10:00:00Z",
    interaction_refs: [],
    operation_family: operationFamily,
    outcome_class_counts: [],
    provider_environment: environment,
    tuning_recommendation_codes: ["NO_CHANGE_RECOMMENDED"],
    window_ended_at: "2026-04-29T10:00:00Z",
    window_started_at: "2026-04-29T10:00:00Z",
  });

  expect(snapshot.total_interaction_count).toBe(0);
  expect(snapshot.interaction_refs).toEqual([]);
  expect(snapshot.source_policy).toBe("DURABLE_RECONCILIATION_CONTROL_CONTRACTS_ONLY");
  expect(snapshot.budget_state_counts.every((entry) => entry.count === 0)).toBe(true);
});

test("fails closed when a snapshot declares a non-durable source policy", () => {
  expect(() =>
    buildAuthorityReconciliationAnalyticsSnapshotRecord({
      authority_operation_profile_ref: profile,
      budget_state_counts: [],
      generated_at: "2026-04-29T10:00:00Z",
      interaction_refs: [],
      operation_family: operationFamily,
      outcome_class_counts: [],
      provider_environment: environment,
      source_policy: "RETRY_LOGS" as never,
      tuning_recommendation_codes: ["NO_CHANGE_RECOMMENDED"],
      window_ended_at: "2026-04-29T10:00:00Z",
      window_started_at: "2026-04-29T10:00:00Z",
    }),
  ).toThrow(AuthorityModelError);
});

test("aggregates lineage-deduped control contracts and projects low-sample escalation insight", () => {
  const older = fixtureInteraction({
    budget_state: "ACTIVE",
    id: "0144-active-old",
    identity_id: "0144-deduped",
    last_budget_event_at: "2026-04-29T09:15:00Z",
  });
  const selected = fixtureInteraction({
    budget_state: "EXHAUSTED",
    id: "0144-exhausted-selected",
    identity_id: "0144-deduped",
    last_budget_event_at: "2026-04-29T09:45:00Z",
  });
  const escalated = fixtureInteraction({
    budget_state: "ESCALATED",
    escalated_at: "2026-04-29T10:00:00Z",
    id: "0144-escalated",
    last_budget_event_at: "2026-04-29T10:00:00Z",
  });
  const closedReplay = fixtureInteraction({
    budget_state: "CLOSED",
    id: "0144-closed-replay",
    last_budget_event_at: "2026-04-29T10:15:00Z",
    provenance_refs: ["provenance://restore/0144-closed-replay"],
  });

  const result = buildAuthorityReconciliationAnalyticsSnapshot({
    authority_operation_profile_ref: profile,
    generated_at: "2026-04-29T11:00:00Z",
    interactions: [older, selected, escalated, closedReplay],
    operation_family: operationFamily,
    provider_environment: environment,
    window_ended_at: "2026-04-29T11:00:00Z",
    window_started_at: "2026-04-29T09:00:00Z",
  });

  expect(result.snapshot.total_interaction_count).toBe(3);
  expect(result.excluded_superseded_or_replayed_interaction_refs).toEqual([
    "authority-interaction://interaction-0144-active-old",
  ]);
  expect(result.snapshot.unresolved_ambiguity_count).toBe(1);
  expect(result.snapshot.replay_resume_count).toBe(1);
  expect(result.snapshot.escalated_count).toBe(1);
  expect(result.snapshot.escalation_latency_seconds_p95_or_null).toBe(7200);
  expect(result.snapshot.tuning_recommendation_codes).toContain("NO_CHANGE_RECOMMENDED");

  const viewModel = projectReconciliationInsightViewModel({ snapshot: result.snapshot });
  expect(viewModel.latency_confidence).toBe("LOW_SAMPLE");
  expect(viewModel.reason_matrix.rows.some((row) => row.reason_code.includes("BUDGET"))).toBe(true);
});
