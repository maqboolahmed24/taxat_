import { expect, test } from "@playwright/test";

import {
  beginSubmissionRecord,
  buildAuthenticatedIngressProofContract,
  buildSubmissionRequestIdentityContract,
  projectAuthorityTruthBundle,
  SubmissionRecordRepository,
  submissionRecordRef,
  transitionSubmissionRecord,
} from "../../../packages/backend-authority/src/index.ts";

const at = "2026-04-29T18:00:00Z";

function ids(suffix: string) {
  return {
    clientId: `client-0134-${suffix}`,
    duplicateMeaningKey: `duplicate-meaning://0134-${suffix}`,
    idempotencyKey: `idempotency-key://0134-${suffix}`,
    identityNamespaceHash: `hash.identity-namespace.0134-${suffix}`,
    manifestId: `manifest-0134-${suffix}`,
    obligationRef: `obligation://hmrc/itsa/0134-${suffix}`,
    requestHash: `hash.request.0134-${suffix}`,
    submissionId: `submission-0134-${suffix}`,
  };
}

function requestIdentity(suffix: string) {
  const values = ids(suffix);
  return buildSubmissionRequestIdentityContract({
    attempt_lineage_manifest_id: `manifest-root-0134-${suffix}`,
    authority_scope: "HMRC_ITSA_FINAL_DECLARATION",
    basis_type_or_null: "FINAL_DECLARATION",
    business_partition_refs: ["business-partition://itsa/2026"],
    client_id: values.clientId,
    duplicate_meaning_key: values.duplicateMeaningKey,
    identity_namespace_hash: values.identityNamespaceHash,
    idempotency_key: values.idempotencyKey,
    manifest_id: values.manifestId,
    obligation_ref_or_null: values.obligationRef,
    operation_family: "FINAL_DECLARATION_SUBMISSION",
    provider_environment: "HMRC_PRODUCTION",
    request_hash: values.requestHash,
    tenant_id: "tenant-0134",
  });
}

function proof(suffix: string, responseRef: string) {
  const values = ids(suffix);
  return buildAuthenticatedIngressProofContract({
    authority_reference: `authority-ref://hmrc/0134-${suffix}`,
    binding_scope_class: "SUBMISSION_RECORD",
    bound_interaction_ref: `authority-interaction://0134-${suffix}`,
    canonical_ingress_receipt_ref: `authority-ingress-receipt://0134-${suffix}`,
    delivery_dedupe_key: `delivery-dedupe://0134-${suffix}`,
    duplicate_meaning_key: values.duplicateMeaningKey,
    idempotency_key: values.idempotencyKey,
    identity_namespace_hash: values.identityNamespaceHash,
    ingress_channel_metadata_hash: `hash.ingress-metadata.0134-${suffix}`,
    normalized_response_ref: responseRef,
    provider_delivery_ref: `provider-delivery://0134-${suffix}`,
    request_hash: values.requestHash,
    request_lineage_proof_hash: `hash.request-lineage.0134-${suffix}`,
    response_body_hash: `hash.response-body.0134-${suffix}`,
  });
}

async function pendingSubmission(suffix: string) {
  const values = ids(suffix);
  const repository = new SubmissionRecordRepository();
  const started = await beginSubmissionRecord({
    attempt_lineage_manifest_id: `manifest-root-0134-${suffix}`,
    authority_scope: "HMRC_ITSA_FINAL_DECLARATION",
    basis_type: "FINAL_DECLARATION",
    client_id: values.clientId,
    duplicate_meaning_key: values.duplicateMeaningKey,
    idempotency_key: values.idempotencyKey,
    identity_namespace_hash: values.identityNamespaceHash,
    manifest_id: values.manifestId,
    obligation_ref: values.obligationRef,
    operation_family: "FINAL_DECLARATION_SUBMISSION",
    packet_ref: `filing-packet://0134-${suffix}`,
    proof_bundle_hash: `hash.proof-bundle.0134-${suffix}`,
    proof_bundle_ref: `proof-bundle://0134-${suffix}`,
    provider_environment: "HMRC_PRODUCTION",
    repository,
    request_envelope_ref: `authority-request-envelope://0134-${suffix}`,
    request_hash: values.requestHash,
    request_identity_contract: requestIdentity(suffix),
    state_changed_at: at,
    submission_id: values.submissionId,
  });
  const queued = await transitionSubmissionRecord({
    current: started.submission,
    event: "send_queued",
    repository,
    state_changed_at: "2026-04-29T18:01:00Z",
  });
  const transmitted = await transitionSubmissionRecord({
    current: queued.submission,
    event: "request_sent",
    repository,
    state_changed_at: "2026-04-29T18:02:00Z",
  });
  const responseRef = `authority-response://0134-${suffix}/pending`;
  const pendingProof = proof(suffix, responseRef);
  const pending = await transitionSubmissionRecord({
    authority_ingress_proof_contract: pendingProof,
    correlation_refs: [pendingProof.canonical_ingress_receipt_ref_or_null],
    current: transmitted.submission,
    event: "awaiting_authority_confirmation",
    repository,
    response_ref: responseRef,
    state_changed_at: "2026-04-29T18:03:00Z",
  });
  return { pending: pending.submission, repository };
}

function bundleInput(submission) {
  return {
    authority_refs: [`authority-obligation://hmrc/itsa/${submission.submission_id}`],
    client_id: submission.client_id,
    due_at: "2026-07-31T23:00:00Z",
    income_source_partition: "income-source://business/sole-trader",
    obligation_mirror_id: `obligation-mirror-${submission.submission_id}`,
    period: "2026-Q1",
    submission,
    tenant_id: "tenant-0134",
  };
}

test("projects pending and confirmed settlement without reusing anchors", async () => {
  const { pending, repository } = await pendingSubmission("confirmed");
  const pendingBundle = projectAuthorityTruthBundle(bundleInput(pending));
  expect(pendingBundle.obligation_mirror.lifecycle_state).toBe("SUBMITTED_PENDING");
  expect(pendingBundle.obligation_mirror.current_submission_ref).toBe(submissionRecordRef(pending));
  expect(pendingBundle.workflow_projection.lifecycle_state).toBe("WAITING_ON_AUTHORITY");
  expect(pendingBundle.client_timeline_event.is_confirming).toBe(false);

  const responseRef = "authority-response://0134-confirmed/final";
  const confirmedProof = proof("confirmed", responseRef);
  const confirmed = await transitionSubmissionRecord({
    authority_evidence_ref: "authority-evidence://0134-confirmed/final",
    authority_ingress_proof_contract: confirmedProof,
    correlation_refs: [confirmedProof.canonical_ingress_receipt_ref_or_null],
    current: pending,
    event: "authority_confirms",
    repository,
    response_ref: responseRef,
    state_changed_at: "2026-04-29T18:10:00Z",
    temporal_propagation_event_refs: ["temporal-propagation-event://0134-confirmed/final"],
  });
  const confirmedBundle = projectAuthorityTruthBundle(bundleInput(confirmed.submission));
  expect(confirmedBundle.obligation_mirror.current_submission_ref).toBeNull();
  expect(confirmedBundle.obligation_mirror.last_confirmed_submission_ref).toBe(
    submissionRecordRef(confirmed.submission),
  );
  expect(confirmedBundle.workflow_projection.lifecycle_state).toBe("RESOLVED");
  expect(confirmedBundle.client_timeline_event.is_confirming).toBe(true);
});

test("projects rejected and out-of-band truth as non-confirming", async () => {
  const rejectedFlow = await pendingSubmission("rejected");
  const rejectedResponseRef = "authority-response://0134-rejected/final";
  const rejectedProof = proof("rejected", rejectedResponseRef);
  const rejected = await transitionSubmissionRecord({
    authority_evidence_ref: "authority-evidence://0134-rejected/final",
    authority_ingress_proof_contract: rejectedProof,
    correlation_refs: [rejectedProof.canonical_ingress_receipt_ref_or_null],
    current: rejectedFlow.pending,
    event: "authority_rejects",
    repository: rejectedFlow.repository,
    rejection_reason_codes: ["AUTHORITY_VALIDATION_FAILED"],
    response_ref: rejectedResponseRef,
    state_changed_at: "2026-04-29T18:11:00Z",
  });
  const rejectedBundle = projectAuthorityTruthBundle(bundleInput(rejected.submission));
  expect(rejectedBundle.obligation_mirror.authority_truth_state).toBe("REJECTED");
  expect(rejectedBundle.obligation_mirror.last_confirmed_submission_ref).toBeNull();
  expect(rejectedBundle.workflow_projection.lifecycle_state).toBe("BLOCKED");
  expect(rejectedBundle.client_timeline_event.is_confirming).toBe(false);

  const outOfBandFlow = await pendingSubmission("out-of-band");
  const outOfBand = await transitionSubmissionRecord({
    authority_evidence_ref: "authority-evidence://0134-out-of-band/external",
    current: outOfBandFlow.pending,
    event: "external_filing_detected",
    repository: outOfBandFlow.repository,
    state_changed_at: "2026-04-29T18:12:00Z",
    temporal_propagation_event_refs: ["temporal-propagation-event://0134-out-of-band/external"],
  });
  const outOfBandBundle = projectAuthorityTruthBundle(bundleInput(outOfBand.submission));
  expect(outOfBandBundle.obligation_mirror.authority_truth_state).toBe("OUT_OF_BAND");
  expect(outOfBandBundle.obligation_mirror.current_submission_ref).toBeNull();
  expect(outOfBandBundle.obligation_mirror.last_confirmed_submission_ref).toBeNull();
  expect(outOfBandBundle.client_timeline_event.is_confirming).toBe(false);
});

test("late supersession reopens downstream projections", async () => {
  const { pending, repository } = await pendingSubmission("superseded");
  const responseRef = "authority-response://0134-superseded/final";
  const confirmedProof = proof("superseded", responseRef);
  const confirmed = await transitionSubmissionRecord({
    authority_evidence_ref: "authority-evidence://0134-superseded/final",
    authority_ingress_proof_contract: confirmedProof,
    correlation_refs: [confirmedProof.canonical_ingress_receipt_ref_or_null],
    current: pending,
    event: "authority_confirms",
    repository,
    response_ref: responseRef,
    state_changed_at: "2026-04-29T18:10:00Z",
    temporal_propagation_event_refs: ["temporal-propagation-event://0134-superseded/final"],
  });
  const superseded = await transitionSubmissionRecord({
    current: confirmed.submission,
    event: "new_submission_supersedes",
    repository,
    state_changed_at: "2026-04-29T18:20:00Z",
    superseded_by_submission_id: "submission-0134-superseding-lineage",
  });
  const bundle = projectAuthorityTruthBundle(bundleInput(superseded.submission));
  expect(bundle.workflow_projection.lifecycle_state).toBe("REOPENED");
  expect(bundle.client_timeline_event.requires_reopen).toBe(true);
  expect(bundle.client_timeline_event.is_confirming).toBe(false);
});
