import { expect, test } from "@playwright/test";

import {
  buildSubmissionRecord,
  classifyAuthorityTemporalEvent,
} from "../../../packages/backend-authority/src/index.ts";

test("classifies correction without inventing an illegal SubmissionRecord state", () => {
  const classification = classifyAuthorityTemporalEvent({
    affected_scope_refs: ["obligation://0142/correction"],
    current_submission: {
      baseline_type: "FILED",
      lifecycle_state: "CONFIRMED",
      response_ref: "authority-response://0142/original",
      submission_id: "submission-0142-original",
      temporal_propagation_event_refs: ["temporal-propagation-event://0142/original"],
    },
    observed_authority_basis_refs: ["authority-basis://0142/corrected"],
    observed_authority_state: "CONFIRMED",
    observed_response_ref: "authority-response://0142/corrected",
  });

  expect(classification.active).toBe(true);
  if (classification.active) {
    expect(classification.event_class).toBe("AUTHORITY_CORRECTION");
    expect(classification.target_submission_lifecycle_state).toBe("CONFIRMED");
    expect(classification.target_baseline_type).toBe("AUTHORITY_CORRECTED");
  }

  expect(() =>
    buildSubmissionRecord({
      attempt_lineage_manifest_id: "manifest-root-0142",
      authority_evidence_ref: "authority-evidence://0142",
      authority_reference: "authority-ref://0142",
      authority_scope: "HMRC_ITSA",
      baseline_type: "AUTHORITY_CORRECTED",
      basis_type: "FINAL_DECLARATION",
      client_id: "client-0142",
      duplicate_meaning_key: "duplicate-meaning://0142",
      identity_namespace_hash: "hash.identity-namespace.0142",
      lifecycle_state: "AUTHORITY_CORRECTED" as never,
      manifest_id: "manifest-0142",
      obligation_ref: "obligation://0142",
      operation_family: "FINAL_DECLARATION_SUBMISSION",
      provider_environment: "HMRC_PRODUCTION",
      response_ref: "authority-response://0142",
      state_changed_at: "2026-04-29T19:05:00Z",
      submission_id: "submission-0142-illegal",
      temporal_propagation_event_refs: ["temporal-propagation-event://0142/correction"],
    }),
  ).toThrow(/lifecycle_state/);
});

test("distinguishes out-of-band discovery and temporal uncertainty blocks", () => {
  const outOfBand = classifyAuthorityTemporalEvent({
    affected_scope_refs: ["obligation://0142/out-of-band"],
    live_authority_lineage_matches_packet: false,
    observed_authority_basis_refs: ["authority-basis://0142/external"],
    observed_authority_state: "OUT_OF_BAND",
  });
  expect(outOfBand.active && outOfBand.event_class).toBe("OUT_OF_BAND_DISCOVERY");

  const weakEvidence = classifyAuthorityTemporalEvent({
    affected_scope_refs: ["obligation://0142/weak"],
    correlation_status: "BOUND_WITH_AUTHORITY_REFERENCE_ONLY",
    observed_authority_basis_refs: ["authority-basis://0142/weak"],
    observed_authority_state: "UNKNOWN",
  });
  expect(weakEvidence.active && weakEvidence.event_class).toBe("TEMPORAL_UNCERTAINTY_BLOCK");
});
