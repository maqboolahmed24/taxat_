import { expect, test } from "@playwright/test";

import { applyPrivacyMinimizationTransform } from "../index.ts";

test("minimizes diagnostics and exports without leaking sensitive raw values", () => {
  const minimized = applyPrivacyMinimizationTransform({
    payload: {
      authority_token: "raw-token-never-log",
      client_name: "Ada Example",
      client_ref: "client://pc0210/ada",
      notes: "support note with personal context",
      tax_reference: "1234567890",
    },
    policies: [
      {
        field: "authority_token",
        mode: "REDACT",
        reason_code: "AUTHORITY_SECRET_NOT_DIAGNOSTIC_SAFE",
      },
      {
        field: "client_name",
        mode: "MASK",
        reason_code: "PERSONAL_DATA_MASKED",
      },
      {
        field: "tax_reference",
        mode: "HASH",
        reason_code: "REFERENCE_HASH_ONLY",
      },
      {
        field: "notes",
        mode: "DROP",
        reason_code: "SUPPORT_NOTES_NOT_EXPORT_SAFE",
      },
    ],
    surface: "DIAGNOSTIC",
  });

  expect(JSON.stringify(minimized.transformed_payload)).not.toContain("raw-token-never-log");
  expect(JSON.stringify(minimized.transformed_payload)).not.toContain("Ada Example");
  expect(minimized.transformed_payload).toMatchObject({
    authority_token: "[REDACTED]",
    client_name: "[MASKED]",
    client_ref: "client://pc0210/ada",
  });
  expect(String(minimized.transformed_payload.tax_reference)).toMatch(/^minimized-hash:\/\//);
  expect(minimized.transformed_payload.notes).toBeUndefined();
  expect(minimized.compensating_re_erasure_posture).toBeNull();
});

test("restore re-entry opens compensating re-erasure posture for resurrected restricted data", () => {
  const minimized = applyPrivacyMinimizationTransform({
    audit_ref: "audit://pc0210/re-erasure-required",
    payload: {
      client_name: "Ada Example",
      restored_payload_ref: "restore-payload://pc0210/restricted",
    },
    policies: [
      {
        field: "client_name",
        mode: "TOMBSTONE",
        reason_code: "RESTORE_RESTRICTED_DATA_TOMBSTONED",
      },
    ],
    resurrected_restricted_data: true,
    surface: "RESTORE_REENTRY",
    workflow_ref: "workflow://pc0210/re-erasure-required",
  });

  expect(minimized.transformed_payload.client_name).toBe("[TOMBSTONED]");
  expect(minimized.compensating_re_erasure_posture).toMatchObject({
    audit_ref_or_null: "audit://pc0210/re-erasure-required",
    compensating_re_erasure_state: "REQUIRED_PENDING",
    privacy_reconciliation_state: "COMPENSATING_RE_ERASURE_REQUIRED",
    workflow_ref_or_null: "workflow://pc0210/re-erasure-required",
  });
});

test("restore re-entry keeps blocker-specific limited posture when cleanup is blocked", () => {
  const blocked = applyPrivacyMinimizationTransform({
    audit_ref: "audit://pc0210/re-erasure-blocked",
    legal_hold_ref: "legal-hold://pc0210/restore-block",
    payload: {
      client_name: "Ada Example",
    },
    policies: [
      {
        field: "client_name",
        mode: "MASK",
        reason_code: "RESTORE_RESTRICTED_DATA_MASKED",
      },
    ],
    resurrected_restricted_data: true,
    surface: "RESTORE_REENTRY",
    workflow_ref: "workflow://pc0210/re-erasure-blocked",
  });

  expect(blocked.compensating_re_erasure_posture).toMatchObject({
    blocker_ref_or_null: "legal-hold://pc0210/restore-block",
    compensating_re_erasure_state: "BLOCKED",
    privacy_reconciliation_state: "BLOCKED_LEGAL_HOLD",
  });

  expect(() =>
    applyPrivacyMinimizationTransform({
      payload: {
        client_name: "Ada Example",
      },
      policies: [
        {
          field: "client_name",
          mode: "MASK",
          reason_code: "RESTORE_RESTRICTED_DATA_MASKED",
        },
      ],
      resurrected_restricted_data: true,
      surface: "RESTORE_REENTRY",
    }),
  ).toThrow(/workflow_ref/i);
});
