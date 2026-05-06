import { expect, test } from "@playwright/test";

import {
  buildTwinStateSnapshotRecord,
  buildTwinTimeline,
  computeTwinDeltaSet,
  summarizeTwinMismatches,
} from "../../../packages/backend-twin/src/index.ts";

const at = "2026-04-29T11:00:00Z";

function laneSubject(value: string, ref: string, overrides = {}) {
  return {
    authority_scope_ref_or_null: "authority://hmrc/vat",
    basis_type_or_null: "VAT_RETURN",
    business_partition_ref_or_null: "partition://vat",
    component_ref: ref,
    observed_at: at,
    period_ref_or_null: "period://2026-Q1",
    reporting_scope_ref_or_null: "scope://client-0131/vat",
    subject_class: "TOTAL" as const,
    subject_identity_code: "VAT_BOX_1",
    subject_ref: ref,
    value_normal_form: value,
    ...overrides,
  };
}

async function assembledPair() {
  const internal = buildTwinStateSnapshotRecord({
    as_of: at,
    baseline_ref: "baseline://filed/vat/2026-Q1",
    baseline_state: "PROVED",
    comparison_basis_ref: "comparison-basis://0131",
    generated_at: at,
    lane_code: "INTERNAL_COMPUTED",
    subjects: [laneSubject("100.00", "internal-subject://vat-box-1")],
    twin_id: "twin-delta-0131",
  });
  const authority = buildTwinStateSnapshotRecord({
    as_of: at,
    authority_truth_state: "PARTIAL_ACK",
    baseline_ref: "baseline://filed/vat/2026-Q1",
    baseline_state: "PROVED",
    comparison_basis_ref: "comparison-basis://0131",
    generated_at: at,
    lane_code: "AUTHORITY",
    subjects: [
      laneSubject("100.00", "authority-subject://vat-box-1", {
        authority_admission: "AUTHORITY_ORIGINATED",
        authority_truth_state: "PARTIAL_ACK",
      }),
    ],
    twin_id: "twin-delta-0131",
  });
  const timeline = await buildTwinTimeline({
    authority_snapshot: authority.snapshot,
    authority_subjects: authority.subjects,
    generated_at: at,
    internal_snapshot: internal.snapshot,
    internal_subjects: internal.subjects,
    twin_id: "twin-delta-0131",
  });
  return { authority, internal, timeline: timeline.timeline };
}

test("emits exactly one terminal delta for one normalized comparison key", async () => {
  const { authority, internal, timeline } = await assembledPair();
  const result = await computeTwinDeltaSet({
    authority_snapshot: authority.snapshot,
    authority_subjects: authority.subjects,
    compared_at: at,
    internal_snapshot: internal.snapshot,
    internal_subjects: internal.subjects,
    timeline,
  });

  expect(result.deltas).toHaveLength(1);
  expect(result.deltas[0]).toMatchObject({
    comparability_reason_code: "ACK_PARTIAL",
    comparability_state: "PARTIALLY_COMPARABLE",
    delta_class: "ACK_PARTIAL",
  });
  expect(result.deltas[0].priority_rank).toBeGreaterThan(0);
});

test("mismatch summary follows persisted ranking, not input order", async () => {
  const { authority, internal, timeline } = await assembledPair();
  const partial = await computeTwinDeltaSet({
    authority_snapshot: authority.snapshot,
    authority_subjects: authority.subjects,
    compared_at: at,
    internal_snapshot: internal.snapshot,
    internal_subjects: internal.subjects,
    timeline,
  });
  const stale = partial.deltas[0];
  const manualOrder = [
    {
      ...stale,
      delta_arc_id: "delta.low",
      materiality_class: "REVIEW" as const,
      priority_rank: 225,
    },
    stale,
  ];
  const summary = await summarizeTwinMismatches({
    deltas: manualOrder,
    generated_at: at,
    twin_id: "twin-delta-0131",
  });

  expect(summary.summary.top_ranked_mismatches[0].delta_arc_ref).toBe(
    `twin-delta-arc://${stale.delta_arc_id}`,
  );
  expect(summary.summary.top_mismatch_refs).toEqual(
    summary.summary.top_ranked_mismatches.map((entry) => entry.delta_arc_ref),
  );
  expect(summary.summary.highest_priority_rank).toBe(stale.priority_rank);
});
