import { expect, test } from "@playwright/test";

import {
  buildTemporalPropagationEventRecord,
  enforceTemporalReplayBasisIntegrity,
  temporalPropagationEventRef,
} from "../../../packages/backend-authority/src/index.ts";

const event = buildTemporalPropagationEventRecord({
  affected_scope_refs: ["obligation://0142/replay"],
  affected_submission_refs: ["submission-record://0142/replay"],
  emitted_at: "2026-04-29T21:00:00Z",
  event_class: "AUTHORITY_CORRECTION",
  manifest_id: "manifest-0142-replay",
  source_authority_basis_refs: ["authority-basis://0142/replay-correction"],
});

test("exact replay reuses persisted temporal-event lineage", () => {
  const result = enforceTemporalReplayBasisIntegrity({
    available_temporal_events: [event],
    replay_basis_integrity_contract: {
      replay_class: "AUDIT_REPLAY",
      temporal_propagation_event_source_class: "HISTORICAL_POST_SEAL_REUSED",
    },
    required_temporal_event_refs: [temporalPropagationEventRef(event)],
  });

  expect(result.replay_temporal_posture).toBe("HISTORICAL_EVENT_REUSED");
  expect(result.missing_temporal_event_refs).toEqual([]);
});

test("exact replay fails closed instead of fresh temporal reclassification", () => {
  expect(() =>
    enforceTemporalReplayBasisIntegrity({
      available_temporal_events: [],
      replay_basis_integrity_contract: {
        replay_class: "STANDARD_REPLAY",
        temporal_propagation_event_source_class: "HISTORICAL_POST_SEAL_REUSED",
      },
      required_temporal_event_refs: [temporalPropagationEventRef(event)],
    }),
  ).toThrow(/historical temporal event lineage missing/);

  expect(() =>
    enforceTemporalReplayBasisIntegrity({
      available_temporal_events: [event],
      replay_basis_integrity_contract: {
        replay_class: "STANDARD_REPLAY",
        temporal_propagation_event_source_class: "NOT_MATERIAL",
      },
      required_temporal_event_refs: [temporalPropagationEventRef(event)],
    }),
  ).toThrow(/must reuse historical post-seal event lineage/);
});

test("counterfactual replay downgrade remains explicit", () => {
  const result = enforceTemporalReplayBasisIntegrity({
    available_temporal_events: [],
    missing_policy: "DOWNGRADE",
    replay_basis_integrity_contract: {
      replay_class: "COUNTERFACTUAL_ANALYSIS",
      temporal_propagation_event_source_class: "DECLARED_COUNTERFACTUAL_SUBSTITUTION",
    },
    required_temporal_event_refs: [temporalPropagationEventRef(event)],
  });
  expect(result.replay_temporal_posture).toBe("DOWNGRADED_COUNTERFACTUAL");
  expect(result.reason_codes).toContain("TEMPORAL_EVENT_HISTORY_NOT_REUSED");
});
