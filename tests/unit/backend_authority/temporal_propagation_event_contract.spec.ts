import { expect, test } from "@playwright/test";

import {
  buildTemporalPropagationEventRecord,
  TemporalPropagationEventRepository,
  temporalPropagationEventRef,
} from "../../../packages/backend-authority/src/index.ts";

const emittedAt = "2026-04-29T19:00:00Z";

test("builds canonical authority-correction events with required effect families", async () => {
  const event = buildTemporalPropagationEventRecord({
    affected_scope_refs: ["obligation://b", "obligation://a"],
    affected_submission_refs: ["submission-record://0142/corrected"],
    emitted_at: emittedAt,
    event_class: "AUTHORITY_CORRECTION",
    manifest_id: "manifest-0142",
    source_authority_basis_refs: ["authority-basis://0142/correction"],
    source_baseline_envelope_ref_or_null: "drift-baseline-envelope://0142/filed",
  });

  expect(event.active_exact_scope_key).toBe("exact-scope:obligation://a|obligation://b");
  expect(event.trust_effect).toBe("RECALC_REQUIRED");
  expect(event.proof_effect).toBe("STALE_REVALIDATION_REQUIRED");
  expect(event.baseline_effect).toBe("SCOPE_SLICED_REBUILD_REQUIRED");
  expect(event.replay_effect).toBe("HISTORICAL_EVENT_REQUIRED");
  expect(event.mirror_reopen_effect).toBe("REOPEN_REQUIRED");
  expect(event.historical_reuse_policy).toBe("NO_FRESH_RECLASSIFICATION");

  const repository = new TemporalPropagationEventRepository();
  const first = await repository.persistTemporalPropagationEvent({ event });
  const duplicate = await repository.persistTemporalPropagationEvent({ event });
  expect(duplicate.temporal_event_id).toBe(first.temporal_event_id);
  expect(
    await repository.getTemporalPropagationEventByRef(temporalPropagationEventRef(event)),
  ).not.toBeNull();
});

test("fails closed on schema-like invariant violations", () => {
  expect(() =>
    buildTemporalPropagationEventRecord({
      affected_scope_refs: ["obligation://0142"],
      emitted_at: emittedAt,
      event_class: "AUTHORITY_CORRECTION",
      manifest_id: "manifest-0142",
    }),
  ).toThrow(/source_authority_basis_refs/);

  expect(() =>
    buildTemporalPropagationEventRecord({
      affected_scope_refs: ["obligation://0142"],
      emitted_at: emittedAt,
      event_class: "TEMPORAL_UNCERTAINTY_BLOCK",
      manifest_id: "manifest-0142",
    }),
  ).toThrow(/late-data monitor or finding/);
});

test("rejects stale event hash and preserves partial-scope identity", () => {
  const partial = buildTemporalPropagationEventRecord({
    affected_scope_refs: ["income-source://sole-trader"],
    affected_submission_refs: ["submission-record://0142/partial"],
    emitted_at: emittedAt,
    event_class: "OUT_OF_BAND_DISCOVERY",
    manifest_id: "manifest-0142",
    source_authority_basis_refs: ["authority-basis://0142/out-of-band"],
  });

  expect(partial.active_exact_scope_key).toBe("exact-scope:income-source://sole-trader");
  expect(partial.affected_scope_refs).toEqual(["income-source://sole-trader"]);

  expect(() =>
    buildTemporalPropagationEventRecord({
      ...partial,
      event_hash: "stale-hash",
    }),
  ).toThrow(/event_hash/);
});
