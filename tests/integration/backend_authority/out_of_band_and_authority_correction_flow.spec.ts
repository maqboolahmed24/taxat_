import { expect, test } from "@playwright/test";

import {
  applyAuthorityCorrectionToSubmissionChain,
  applyOutOfBandTruthToSubmissionChain,
  beginSubmissionRecord,
  buildAuthenticatedIngressProofContract,
  buildFilingCaseRecord,
  buildFilingPacket,
  buildStateTransitionContract,
  buildSubmissionRequestIdentityContract,
  buildTemporalPropagationEvent,
  filingPacketRef,
  propagateTemporalEventToBaselines,
  propagateTemporalEventToFilingCaseAndPacket,
  propagateTemporalEventToProofAndTrust,
  propagateTemporalEventToWorkflowAndClientProjection,
  projectTemporalEventSummary,
  SubmissionRecordRepository,
  submissionRecordRef,
  temporalPropagationEventRef,
  TemporalPropagationEventRepository,
  transitionSubmissionRecord,
} from "../../../packages/backend-authority/src/index.ts";

const at = "2026-04-29T20:00:00Z";

function ids(suffix: string) {
  return {
    clientId: `client-0142-${suffix}`,
    duplicateMeaningKey: `duplicate-meaning://0142-${suffix}`,
    idempotencyKey: `idempotency-key://0142-${suffix}`,
    identityNamespaceHash: `hash.identity-namespace.0142-${suffix}`,
    manifestId: `manifest-0142-${suffix}`,
    obligationRef: `obligation://hmrc/itsa/0142-${suffix}`,
    requestHash: `hash.request.0142-${suffix}`,
    submissionId: `submission-0142-${suffix}`,
  };
}

function requestIdentity(suffix: string) {
  const values = ids(suffix);
  return buildSubmissionRequestIdentityContract({
    attempt_lineage_manifest_id: `manifest-root-0142-${suffix}`,
    authority_scope: "HMRC_ITSA_FINAL_DECLARATION",
    basis_type_or_null: "FINAL_DECLARATION",
    business_partition_refs: [`income-source://0142-${suffix}`],
    client_id: values.clientId,
    duplicate_meaning_key: values.duplicateMeaningKey,
    identity_namespace_hash: values.identityNamespaceHash,
    idempotency_key: values.idempotencyKey,
    manifest_id: values.manifestId,
    obligation_ref_or_null: values.obligationRef,
    operation_family: "FINAL_DECLARATION_SUBMISSION",
    provider_environment: "HMRC_PRODUCTION",
    request_hash: values.requestHash,
    tenant_id: "tenant-0142",
  });
}

function proof(suffix: string, responseRef: string) {
  const values = ids(suffix);
  return buildAuthenticatedIngressProofContract({
    authority_reference: `authority-ref://hmrc/0142-${suffix}`,
    binding_scope_class: "SUBMISSION_RECORD",
    bound_interaction_ref: `authority-interaction://0142-${suffix}`,
    canonical_ingress_receipt_ref: `authority-ingress-receipt://0142-${suffix}`,
    delivery_dedupe_key: `delivery-dedupe://0142-${suffix}`,
    duplicate_meaning_key: values.duplicateMeaningKey,
    idempotency_key: values.idempotencyKey,
    identity_namespace_hash: values.identityNamespaceHash,
    ingress_channel_metadata_hash: `hash.ingress-metadata.0142-${suffix}`,
    normalized_response_ref: responseRef,
    provider_delivery_ref: `provider-delivery://0142-${suffix}`,
    request_hash: values.requestHash,
    request_lineage_proof_hash: `hash.request-lineage.0142-${suffix}`,
    response_body_hash: `hash.response-body.0142-${suffix}`,
  });
}

async function pendingSubmission(suffix: string, repository = new SubmissionRecordRepository()) {
  const values = ids(suffix);
  const started = await beginSubmissionRecord({
    attempt_lineage_manifest_id: `manifest-root-0142-${suffix}`,
    authority_scope: "HMRC_ITSA_FINAL_DECLARATION",
    basis_type: "FINAL_DECLARATION",
    client_id: values.clientId,
    duplicate_meaning_key: values.duplicateMeaningKey,
    idempotency_key: values.idempotencyKey,
    identity_namespace_hash: values.identityNamespaceHash,
    manifest_id: values.manifestId,
    obligation_ref: values.obligationRef,
    operation_family: "FINAL_DECLARATION_SUBMISSION",
    packet_ref: `filing-packet://0142-${suffix}`,
    proof_bundle_hash: `hash.proof-bundle.0142-${suffix}`,
    proof_bundle_ref: `proof-bundle://0142-${suffix}`,
    provider_environment: "HMRC_PRODUCTION",
    repository,
    request_envelope_ref: `authority-request-envelope://0142-${suffix}`,
    request_hash: values.requestHash,
    request_identity_contract: requestIdentity(suffix),
    state_changed_at: at,
    submission_id: values.submissionId,
  });
  const queued = await transitionSubmissionRecord({
    current: started.submission,
    event: "send_queued",
    repository,
    state_changed_at: "2026-04-29T20:01:00Z",
  });
  const transmitted = await transitionSubmissionRecord({
    current: queued.submission,
    event: "request_sent",
    repository,
    state_changed_at: "2026-04-29T20:02:00Z",
  });
  const responseRef = `authority-response://0142-${suffix}/pending`;
  const pendingProof = proof(suffix, responseRef);
  const pending = await transitionSubmissionRecord({
    authority_ingress_proof_contract: pendingProof,
    correlation_refs: [pendingProof.canonical_ingress_receipt_ref_or_null],
    current: transmitted.submission,
    event: "awaiting_authority_confirmation",
    repository,
    response_ref: responseRef,
    state_changed_at: "2026-04-29T20:03:00Z",
  });
  return { pending: pending.submission, repository };
}

async function confirmedSubmission(suffix: string) {
  const repository = new SubmissionRecordRepository();
  const { pending } = await pendingSubmission(suffix, repository);
  const responseRef = `authority-response://0142-${suffix}/confirmed`;
  const confirmedProof = proof(suffix, responseRef);
  const confirmed = await transitionSubmissionRecord({
    authority_evidence_ref: `authority-evidence://0142-${suffix}/confirmed`,
    authority_ingress_proof_contract: confirmedProof,
    correlation_refs: [confirmedProof.canonical_ingress_receipt_ref_or_null],
    current: pending,
    event: "authority_confirms",
    repository,
    response_ref: responseRef,
    state_changed_at: "2026-04-29T20:05:00Z",
    temporal_propagation_event_refs: [`temporal-propagation-event://0142-${suffix}/filed`],
  });
  return { confirmed: confirmed.submission, repository };
}

test("out-of-band discovery emits one event and reopens every dependent posture", async () => {
  const eventRepository = new TemporalPropagationEventRepository();
  const { pending, repository } = await pendingSubmission("out-of-band");
  const built = await buildTemporalPropagationEvent({
    affected_scope_refs: [pending.obligation_ref],
    affected_submission_refs: [submissionRecordRef(pending)],
    emitted_at: "2026-04-29T20:10:00Z",
    event_class: "OUT_OF_BAND_DISCOVERY",
    manifest_id: pending.manifest_id,
    repository: eventRepository,
    source_authority_basis_refs: ["authority-basis://0142/out-of-band"],
  });
  const duplicate = await buildTemporalPropagationEvent({
    ...built.event,
    repository: eventRepository,
  });
  expect(duplicate.stored.temporal_event_id).toBe(built.stored.temporal_event_id);

  const applied = await applyOutOfBandTruthToSubmissionChain({
    authority_evidence_ref: "authority-evidence://0142/out-of-band",
    current: pending,
    proof_bundle_hash: pending.proof_bundle_hash ?? "hash.proof-bundle.0142-out-of-band",
    proof_bundle_ref: pending.proof_bundle_ref ?? "proof-bundle://0142-out-of-band",
    repository,
    state_changed_at: "2026-04-29T20:11:00Z",
    temporal_event: built.event,
  });
  expect(applied.submission.lifecycle_state).toBe("OUT_OF_BAND");
  expect(applied.submission.packet_ref).toBeNull();
  expect(applied.submission.request_identity_contract).toBeNull();
  expect(applied.submission.temporal_propagation_event_refs).toContain(
    temporalPropagationEventRef(built.event),
  );

  const filingCase = buildFilingCaseRecord({
    client_id: pending.client_id,
    controlling_proof_bundle_ref: "proof-bundle://0142/filing-case",
    current_manifest_ref: pending.manifest_id,
    current_parity_ref: "parity-result://0142/ready",
    current_trust_ref: "trust-summary://0142/ready",
    filing_case_id: "filing-case-0142-out-of-band",
    last_transition_at: "2026-04-29T20:04:00Z",
    lifecycle_state: "READY_REVIEW",
    period: "2026-Q1",
    proof_closure_state: "CLOSED",
    tenant_id: "tenant-0142",
    trust_currency_state: "CURRENT",
  });
  const packet = await buildFilingPacket({
    declared_basis: "FINAL_DECLARATION",
    filing_case: filingCase,
    filing_gate_ref: "filing-gate://0142/out-of-band",
    lifecycle_state: "APPROVED_TO_SUBMIT",
    manifest_binding_hash: "hash.manifest-binding.0142-out-of-band",
    payload_hash: "hash.payload.0142-out-of-band",
    payload_ref: "object://filing-payload/0142-out-of-band",
    state_changed_at: "2026-04-29T20:06:00Z",
  });
  const readyCase = buildFilingCaseRecord({
    ...filingCase,
    current_packet_ref: filingPacketRef(packet.packet),
    last_transition_at: "2026-04-29T20:07:00Z",
    lifecycle_state: "READY_TO_SUBMIT",
    packet_state: "APPROVED_TO_SUBMIT",
    state_transition_contract: buildStateTransitionContract({
      current_state: "READY_TO_SUBMIT",
      object_family: "FILING_CASE",
      previous_state_or_null: "READY_REVIEW",
      transition_applied_at: "2026-04-29T20:07:00Z",
      transition_event_code: "approval_complete",
    }),
  });
  const propagated = await propagateTemporalEventToFilingCaseAndPacket({
    event: built.event,
    filing_case: readyCase,
    filing_packet: packet.packet,
    propagated_at: "2026-04-29T20:12:00Z",
  });
  expect(propagated.filing_case?.lifecycle_state).toBe("READY_REVIEW");
  expect(propagated.filing_case?.trust_currency_state).toBe("RECALC_REQUIRED");
  expect(propagated.filing_packet?.lifecycle_state).toBe("VOID");

  const baseline = propagateTemporalEventToBaselines(built.event);
  expect(baseline.selected_baseline_type).toBe("OUT_OF_BAND");
  expect(baseline.automation_ceiling).toBe("BLOCKED");

  const proofAndTrust = propagateTemporalEventToProofAndTrust({
    event: built.event,
    parity_result_refs: ["parity-result://0142/ready"],
    proof_bundle_refs: ["proof-bundle://0142/filing-case"],
    trust_summary_refs: ["trust-summary://0142/ready"],
  });
  expect(proofAndTrust.trust_summary_invalidations[0].trust_currency_state).toBe("RECALC_REQUIRED");

  const workflow = propagateTemporalEventToWorkflowAndClientProjection({ event: built.event });
  expect(workflow.workflow_projection.lifecycle_state).toBe("REOPENED");
  expect(workflow.client_projection.customer_status_projection).toBe("OUT_OF_BAND_RECONCILIATION");
});

test("authority correction preserves legal submission states and routes to review", async () => {
  const { confirmed, repository } = await confirmedSubmission("correction");
  const event = await buildTemporalPropagationEvent({
    affected_scope_refs: [confirmed.obligation_ref],
    affected_submission_refs: [submissionRecordRef(confirmed)],
    emitted_at: "2026-04-29T20:20:00Z",
    event_class: "AUTHORITY_CORRECTION",
    manifest_id: confirmed.manifest_id,
    source_authority_basis_refs: ["authority-basis://0142/corrected"],
    source_baseline_envelope_ref_or_null: "drift-baseline-envelope://0142/filed",
  });
  const corrected = await applyAuthorityCorrectionToSubmissionChain({
    authority_evidence_ref: "authority-evidence://0142/corrected",
    authority_ingress_proof_contract: proof(
      "correction",
      "authority-response://0142-correction/corrected",
    ),
    corrected_response_ref: "authority-response://0142-correction/corrected",
    current: confirmed,
    repository,
    state_changed_at: "2026-04-29T20:21:00Z",
    temporal_event: event.event,
  });

  expect(corrected.superseded_submission.lifecycle_state).toBe("SUPERSEDED");
  expect(corrected.submission.lifecycle_state).toBe("CONFIRMED");
  expect(corrected.submission.baseline_type).toBe("AUTHORITY_CORRECTED");
  expect(corrected.submission.temporal_propagation_event_refs).toContain(
    temporalPropagationEventRef(event.event),
  );
  expect(projectTemporalEventSummary(event.event).mirror_reopen_required).toBe(true);
});
