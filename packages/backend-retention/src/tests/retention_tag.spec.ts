import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  deriveRetentionTag,
  type DeriveRetentionTagInput,
  type RetentionPolicySource,
} from "../index.ts";

const regulatedPolicy: RetentionPolicySource = {
  policy_ref: "retention-basis://pc0209/regulated-default",
  retention_class: "regulated_record",
  minimum_retention_days: 2555,
  policy_retention_days: 2555,
  pseudonymisation_mode: "PSEUDONYMIZE_ALLOWED_AFTER_EXPIRY",
};

function baseTagInput(
  overrides: Partial<DeriveRetentionTagInput> = {},
): DeriveRetentionTagInput {
  return {
    anchor_timestamp: "2026-05-01T09:00:00Z",
    artifact_ref: "source-record://pc0209/client-source",
    erasure_decided_at: "2026-05-05T09:00:00Z",
    object_class: "SOURCE_RECORD",
    policy: regulatedPolicy,
    ...overrides,
  };
}

test("derives deterministic RetentionTag from the object-class anchor mapping", async () => {
  const first = deriveRetentionTag(baseTagInput());
  const second = deriveRetentionTag(baseTagInput());

  expect(first).toEqual(second);
  expect(first.anchor_event).toBe("SOURCE_RECORD_CAPTURED");
  expect(first.erasure_eligibility).toBe("BLOCKED_STATUTORY_MINIMUM");
  expect(first.retention_basis_ref).toBe("retention-basis://pc0209/regulated-default");
  await validateContractSchema("retention_tag", first);
});

test("fails closed when expiry chronology drifts behind the anchor or effective basis", () => {
  expect(() =>
    deriveRetentionTag(
      baseTagInput({
        minimum_expiry_at: "2026-04-30T09:00:00Z",
        policy_expiry_at: "2033-04-29T09:00:00Z",
        effective_expiry_at: "2033-04-29T09:00:00Z",
      }),
    ),
  ).toThrow(/minimum_expiry_at/i);

  expect(() =>
    deriveRetentionTag(
      baseTagInput({
        minimum_expiry_at: "2033-04-28T09:00:00Z",
        policy_expiry_at: "2033-04-29T09:00:00Z",
        effective_expiry_at: "2033-04-28T09:00:00Z",
      }),
    ),
  ).toThrow(/effective_expiry_at/i);
});

test("legal hold blocks erasure even after minimum and policy expiry are satisfied", async () => {
  const tag = deriveRetentionTag(
    baseTagInput({
      anchor_timestamp: "2020-01-01T09:00:00Z",
      erasure_decided_at: "2030-01-01T09:00:00Z",
      legal_hold: {
        changed_at: "2026-05-01T09:00:00Z",
        hold_ref: "legal-hold://pc0209/open-enquiry",
        state: "ACTIVE",
      },
      policy: {
        ...regulatedPolicy,
        minimum_retention_days: 1,
        policy_retention_days: 1,
      },
    }),
  );

  expect(tag.erasure_eligibility).toBe("BLOCKED_LEGAL_HOLD");
  expect(tag.legal_hold_ref).toBe("legal-hold://pc0209/open-enquiry");
  expect(tag.erasure_reason_codes).toEqual(["LEGAL_HOLD_ACTIVE"]);
  await validateContractSchema("retention_tag", tag);
});

test("blocking-basis refs remain mutually exclusive and bound to erasure posture", () => {
  expect(() =>
    deriveRetentionTag(
      baseTagInput({
        authority_ambiguity_ref: "authority-ambiguity://pc0209/source-state",
        proof_preservation_basis_ref: "proof-preservation://pc0209/source-proof",
      }),
    ),
  ).toThrow(/mutually exclusive/i);
});
