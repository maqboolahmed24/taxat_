import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  buildAuthorityIngressCorrelationContract,
  normalizeAuthorityIngressCorrelationContract,
} from "../index.ts";

function candidate(suffix: string, overrides = {}) {
  return {
    authority_reference: "authority-ref://hmrc/pc0213",
    duplicate_meaning_key: "duplicate-meaning://pc0213",
    idempotency_key: "idempotency-key://pc0213",
    identity_namespace_hash: "hash.identity.pc0213",
    interaction_ref: `authority-interaction://pc0213/${suffix}`,
    latest_obligation_mirror_ref: `obligation-mirror://pc0213/${suffix}`,
    latest_submission_record_ref: `submission-record://pc0213/${suffix}`,
    request_hash: "hash.request.pc0213",
    ...overrides,
  };
}

test("builds schema-valid exact, weak, ambiguous, and unbound correlation contracts", async () => {
  const exact = buildAuthorityIngressCorrelationContract({
    candidates: [candidate("exact")],
    extracted_identity_claims: {
      authority_reference: "authority-ref://hmrc/pc0213",
      duplicate_meaning_key: "duplicate-meaning://pc0213",
      idempotency_key: "idempotency-key://pc0213",
      identity_namespace_hash: "hash.identity.pc0213",
      request_hash: "hash.request.pc0213",
    },
  });
  expect(exact.correlation_status).toBe("BOUND");
  expect(exact.comparison_set_state).toBe("ONE_EXACT_MATCH");
  expect(exact.legal_mutation_policy).toBe("NO_DIRECT_LEGAL_STATE_MUTATION_FROM_CORRELATION");
  await validateContractSchema("authority_ingress_correlation_contract", exact);

  const weak = buildAuthorityIngressCorrelationContract({
    candidates: [
      candidate("weak", {
        duplicate_meaning_key: null,
        idempotency_key: null,
        identity_namespace_hash: null,
        request_hash: null,
      }),
    ],
    extracted_identity_claims: {
      authority_reference: "authority-ref://hmrc/pc0213",
    },
  });
  expect(weak.correlation_status).toBe("BOUND_WITH_AUTHORITY_REFERENCE_ONLY");
  expect(weak.candidate_lineages[0].match_basis_codes).toEqual(["AUTHORITY_REFERENCE_MATCH"]);
  await validateContractSchema("authority_ingress_correlation_contract", weak);

  const ambiguous = buildAuthorityIngressCorrelationContract({
    candidates: [candidate("one"), candidate("two")],
    extracted_identity_claims: {
      request_hash: "hash.request.pc0213",
    },
  });
  expect(ambiguous.correlation_status).toBe("AMBIGUOUS");
  expect(ambiguous.candidate_lineages).toHaveLength(2);
  await validateContractSchema("authority_ingress_correlation_contract", ambiguous);

  const missingKeys = buildAuthorityIngressCorrelationContract({
    extracted_identity_claims: {},
  });
  expect(missingKeys.comparison_set_state).toBe("MISSING_PROVIDER_KEYS");
  expect(missingKeys.resolution_state).toBe("UNBOUND_MISSING_IDENTITY_CLAIMS");
  await validateContractSchema("authority_ingress_correlation_contract", missingKeys);

  const noMatch = buildAuthorityIngressCorrelationContract({
    candidates: [candidate("not-matched")],
    extracted_identity_claims: {
      request_hash: "hash.request.unknown",
    },
  });
  expect(noMatch.comparison_set_state).toBe("NO_MATCH");
  expect(noMatch.resolution_state).toBe("UNBOUND_NO_MATCH");
  await validateContractSchema("authority_ingress_correlation_contract", noMatch);
});

test("rejects non-contiguous candidates and weak contracts carrying exact evidence", () => {
  const exact = buildAuthorityIngressCorrelationContract({
    candidates: [candidate("exact")],
    extracted_identity_claims: {
      request_hash: "hash.request.pc0213",
    },
  });

  expect(() =>
    normalizeAuthorityIngressCorrelationContract({
      ...exact,
      candidate_lineages: [
        {
          ...exact.candidate_lineages[0],
          candidate_rank: 2,
        },
      ],
    }),
  ).toThrow(/contiguous rank/);

  const weak = buildAuthorityIngressCorrelationContract({
    candidates: [
      candidate("weak", {
        duplicate_meaning_key: null,
        idempotency_key: null,
        identity_namespace_hash: null,
        request_hash: null,
      }),
    ],
    extracted_identity_claims: {
      authority_reference: "authority-ref://hmrc/pc0213",
    },
  });
  expect(() =>
    normalizeAuthorityIngressCorrelationContract({
      ...weak,
      candidate_lineages: [
        {
          ...weak.candidate_lineages[0],
          match_basis_codes: ["AUTHORITY_REFERENCE_MATCH", "REQUEST_HASH_MATCH"],
        },
      ],
    }),
  ).toThrow(/weak authority-reference evidence/);
});
