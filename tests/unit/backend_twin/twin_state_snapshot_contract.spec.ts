import { expect, test } from "@playwright/test";

import {
  buildTwinStateSnapshotRecord,
  deriveTwinComparisonKey,
} from "../../../packages/backend-twin/src/index.ts";

const generated_at = "2026-04-29T10:00:00Z";

function subject(overrides = {}) {
  return {
    authority_scope_ref_or_null: "authority://hmrc/vat",
    basis_type_or_null: "VAT_RETURN",
    business_partition_ref_or_null: "partition://vat",
    component_ref: "authority-component://vat-box-1",
    observed_at: generated_at,
    period_ref_or_null: "period://2026-Q1",
    reporting_scope_ref_or_null: "scope://client-0131/vat",
    subject_class: "TOTAL" as const,
    subject_identity_code: "VAT_BOX_1",
    subject_ref: "subject://vat-box-1",
    value_normal_form: "100.00",
    ...overrides,
  };
}

test("canonical comparison key ignores value content and lane-local ordering", () => {
  const key = deriveTwinComparisonKey(subject());
  const changedValueKey = deriveTwinComparisonKey(subject({ value_normal_form: "999.99" }));
  const changedScopeKey = deriveTwinComparisonKey(
    subject({ period_ref_or_null: "period://2026-Q2" }),
  );

  expect(changedValueKey).toBe(key);
  expect(changedScopeKey).not.toBe(key);
});

test("authority lane rejects internal inference as authority truth", () => {
  expect(() =>
    buildTwinStateSnapshotRecord({
      as_of: generated_at,
      comparison_basis_ref: "comparison-basis://0131",
      generated_at,
      lane_code: "AUTHORITY",
      subjects: [subject({ authority_admission: "INTERNAL_INFERENCE" })],
      twin_id: "twin-0131",
    }),
  ).toThrow(/authority-originated or reconciliation-proven/);
});

test("subject-key collisions force contradictory snapshot posture", () => {
  const assembled = buildTwinStateSnapshotRecord({
    as_of: generated_at,
    authority_truth_state: "CONFIRMED",
    comparison_basis_ref: "comparison-basis://0131",
    generated_at,
    lane_code: "AUTHORITY",
    subjects: [
      subject({
        authority_admission: "AUTHORITY_ORIGINATED",
        component_ref: "authority-component://vat-box-1-a",
        subject_ref: "subject://vat-box-1-a",
        value_normal_form: "100.00",
      }),
      subject({
        authority_admission: "AUTHORITY_ORIGINATED",
        component_ref: "authority-component://vat-box-1-b",
        subject_ref: "subject://vat-box-1-b",
        value_normal_form: "101.00",
      }),
    ],
    twin_id: "twin-0131",
  });

  expect(assembled.snapshot.assembly_state).toBe("CONTRADICTORY");
  expect(assembled.snapshot.subject_key_collision_refs).toEqual([
    "authority-component://vat-box-1-a",
    "authority-component://vat-box-1-b",
  ]);
  expect(assembled.snapshot.non_comparable_subject_count).toBeGreaterThanOrEqual(1);
  expect(assembled.snapshot.limitation_codes).toContain("SUBJECT_KEY_COLLISION");
});
