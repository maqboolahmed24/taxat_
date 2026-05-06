import { expect, test } from "@playwright/test";

import {
  buildActionStripState,
  buildContextBarState,
  buildDecisionSummaryState,
  buildLowNoiseExperienceFrame,
  buildLowNoiseMutationPreconditionBinding,
  type LowNoiseSurfaceProjectorInput,
} from "../index.ts";
import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";

function baseSurfaceInput(
  overrides: Partial<LowNoiseSurfaceProjectorInput> = {},
): LowNoiseSurfaceProjectorInput {
  return {
    attentionState: "CALM",
    manifestId: "manifest.pc0170",
    objectAnchorRef: "manifest.pc0170",
    posture: {
      connectionState: "CONNECTED",
      modePosture: "LIVE_COMPLIANCE",
      recoveryPosture: "NONE",
      settlementState: "STEADY",
    },
    truthOrigin: "PERSISTED_STATE",
    ...overrides,
  };
}

function baseFrameInput(overrides: Partial<Parameters<typeof buildLowNoiseExperienceFrame>[0]> = {}) {
  return {
    accessBindingHash: "access.pc0170",
    decisionBundleHash: "decision.hash.pc0170",
    frameEpoch: 1,
    lastPublishedSequence: 11,
    manifestId: "manifest.pc0170.frame",
    maskingContextHash: "mask.pc0170",
    principalClass: "STAFF_OPERATOR",
    publicationGeneration: 4,
    renderedAt: "2026-05-04T10:00:00.000Z",
    resumeToken: "resume.pc0170",
    sessionBindingHash: "session.hash.pc0170",
    sessionRef: "session.pc0170",
    shellStabilityToken: "shell.pc0170",
    tenantId: "tenant.pc0170",
    ...overrides,
  } satisfies Parameters<typeof buildLowNoiseExperienceFrame>[0];
}

test("projects calm context, summary, and action surfaces with no visible reasons or warnings", async () => {
  const input = baseSurfaceInput();
  const contextBar = buildContextBarState(input);
  const decisionSummary = buildDecisionSummaryState(input);
  const { actionStrip } = buildActionStripState(input);

  expect(decisionSummary.visible_reasons).toEqual([]);
  expect(decisionSummary.visible_warning_count).toBe(0);
  expect(decisionSummary.primary_issue_ref).toBeNull();
  expect(decisionSummary.machine_reason_codes).toEqual(["FRAME_CURRENT"]);
  expect(actionStrip.actionability_state).toBe("ACTION_AVAILABLE");
  expect(actionStrip.primary_action?.action_kind).toBe("REFRESH");

  await validateContractSchema("context_bar_state", contextBar);
  await validateContractSchema("decision_summary_state", decisionSummary);
  await validateContractSchema("action_strip_state", actionStrip);
});

test("ranks and truncates review reasons while keeping visible reason codes machine-readable", async () => {
  const decisionSummary = buildDecisionSummaryState(
    baseSurfaceInput({
      attentionState: "REVIEW",
      reasons: [
        { label: "Lower ranked review signal", rankScore: 30, reasonCode: "REVIEW_LOW" },
        { label: "Dominant blocked filing gate", rankScore: 90, reasonCode: "REVIEW_HIGH" },
        { label: "Middle ranked review signal", rankScore: 60, reasonCode: "REVIEW_MID" },
        { label: "Hidden review signal", rankScore: 20, reasonCode: "REVIEW_HIDDEN" },
      ],
    }),
  );

  expect(decisionSummary.visible_reasons.map((reason) => reason.reason_code)).toEqual([
    "REVIEW_HIGH",
    "REVIEW_MID",
    "REVIEW_LOW",
  ]);
  expect(decisionSummary.additional_reason_count).toBe(1);
  expect(
    decisionSummary.visible_reasons.every((reason) =>
      decisionSummary.machine_reason_codes.includes(reason.reason_code),
    ),
  ).toBe(true);

  await validateContractSchema("decision_summary_state", decisionSummary);
});

test("publishes waiting posture as no-safe-action with deterministic investigation routing", async () => {
  const input = baseSurfaceInput({
    activeDetailSurfaceCode: "AUTHORITY_TUNNEL",
    attentionState: "WAITING",
    ownershipLabel: "HMRC",
    ownershipPosture: "AUTHORITY_WAIT",
    suggestedDetailSurfaceCode: "AUTHORITY_TUNNEL",
    waitingOnLabel: "HMRC",
  });
  const decisionSummary = buildDecisionSummaryState(input);
  const { actionStrip } = buildActionStripState(input);

  expect(decisionSummary.visible_reasons[0]?.severity).toBe("WAITING");
  expect(actionStrip.actionability_state).toBe("NO_SAFE_ACTION");
  expect(actionStrip.ownership_posture).toBe("AUTHORITY_WAIT");
  expect(actionStrip.waiting_on_label).toBe("HMRC");
  expect(actionStrip.investigation_entry_point).toBe("AUTHORITY_TUNNEL");
  expect(actionStrip.suggested_detail_surface_code).toBe(actionStrip.investigation_entry_point);

  await validateContractSchema("decision_summary_state", decisionSummary);
  await validateContractSchema("action_strip_state", actionStrip);
});

test("keeps blocked recovery read-only with blocking copy on summary and action strip", async () => {
  const input = baseSurfaceInput({
    attentionState: "BLOCKED",
    noSafeActionReasonCode: "FRAME_RECOVERY_REQUIRED",
    posture: {
      connectionState: "STALE",
      modePosture: "READ_ONLY",
      recoveryPosture: "INLINE_RECONNECT",
      settlementState: "RECOVERY_REQUIRED",
    },
  });
  const contextBar = buildContextBarState(input);
  const decisionSummary = buildDecisionSummaryState(input);
  const { actionStrip } = buildActionStripState(input);

  expect(contextBar.freshness_state).toBe("STALE");
  expect(contextBar.limitation_statement).not.toBeNull();
  expect(decisionSummary.blocking_reason).not.toBeNull();
  expect(actionStrip.actionability_state).toBe("NO_SAFE_ACTION");
  expect(actionStrip.blocking_reason).not.toBeNull();

  await validateContractSchema("context_bar_state", contextBar);
  await validateContractSchema("decision_summary_state", decisionSummary);
  await validateContractSchema("action_strip_state", actionStrip);
});

test("normalizes limited summary state with typed reason codes and copy budget", async () => {
  const decisionSummary = buildDecisionSummaryState(
    baseSurfaceInput({
      attentionState: "LIMITED",
      decisionLimitationReasonCodes: ["MASKED_ACCESS"],
      decisionLimitationState: "LIMITED",
      decisionLimitationStatement:
        "Some trust evidence is hidden by the current access mask and must stay out of the first view.",
    }),
  );

  expect(decisionSummary.limitation_state).toBe("LIMITED");
  expect(decisionSummary.state_reason_code_or_null).toBeNull();
  expect(decisionSummary.limitation_reason_codes).toEqual(["MASKED_ACCESS"]);
  expect(decisionSummary.limitation_statement).not.toBeNull();

  await validateContractSchema("decision_summary_state", decisionSummary);
});

test("downgrades mutation primaries without the frozen dominance margin", async () => {
  const { actionStrip } = buildActionStripState(
    baseSurfaceInput({
      attentionState: "REVIEW",
      primaryActionCandidates: [
        {
          actionCode: "FILE_NOW",
          actionKind: "FILING_MUTATION",
          label: "File now",
          mutationPreconditionBindingOrNull: buildLowNoiseMutationPreconditionBinding(),
          rankScore: 70,
          requiresLiveFreshness: true,
          targetObjectRef: "manifest.pc0170",
        },
        {
          actionCode: "REQUEST_REVIEW",
          actionKind: "REQUEST_REVIEW",
          label: "Request review",
          rankScore: 60,
        },
      ],
    }),
  );

  expect(actionStrip.primary_action?.action_kind).toBe("REQUEST_REVIEW");
  expect(actionStrip.blocked_action_codes).toContain("FILE_NOW");
  expect(actionStrip.machine_reason_codes).toContain("MUTATION_DOMINANCE_MARGIN_TOO_SMALL");

  await validateContractSchema("action_strip_state", actionStrip);
});

test("computes suppressed secondary count from the hidden lawful remainder", async () => {
  const { actionStrip } = buildActionStripState(
    baseSurfaceInput({
      attentionState: "REVIEW",
      secondaryActionCandidates: [
        {
          actionCode: "COMPARE_BASELINE",
          actionKind: "COMPARE",
          label: "Compare",
          rankScore: 50,
          targetDetailSurfaceCode: "TWIN_PANEL",
        },
        {
          actionCode: "EXPORT_PACKET",
          actionKind: "EXPORT",
          label: "Export",
          rankScore: 45,
        },
      ],
      visibleSecondaryLimit: 1,
    }),
  );

  expect(actionStrip.secondary_actions.map((action) => action.action_code)).toEqual([
    "COMPARE_BASELINE",
  ]);
  expect(actionStrip.available_action_codes).toEqual([
    "REFRESH_FRAME",
    "COMPARE_BASELINE",
    "EXPORT_PACKET",
  ]);
  expect(actionStrip.suppressed_secondary_count).toBe(1);
  expect(actionStrip.secondary_actions.every((action) =>
    actionStrip.available_action_codes.includes(action.action_code),
  )).toBe(true);

  await validateContractSchema("action_strip_state", actionStrip);
});

test("allows mutation primary only with live freshness, binding, threshold, and margin", async () => {
  const { actionStrip } = buildActionStripState(
    baseSurfaceInput({
      attentionState: "REVIEW",
      primaryAction: {
        action_code: "FILE_NOW",
        action_kind: "FILING_MUTATION",
        label: "File now",
        mutation_precondition_binding_or_null: buildLowNoiseMutationPreconditionBinding(),
        requires_live_freshness: true,
        target_detail_surface_code: null,
        target_object_ref: "manifest.pc0170",
      },
    }),
  );

  expect(actionStrip.primary_action?.action_kind).toBe("FILING_MUTATION");
  expect(actionStrip.primary_action_score).toBeGreaterThanOrEqual(60);
  expect(actionStrip.dominance_margin).toBeGreaterThanOrEqual(15);
  expect(actionStrip.secondary_actions).toEqual([]);

  await validateContractSchema("action_strip_state", actionStrip);
});

test("frame integration mirrors summary/action policy and action-strip invariants", async () => {
  const frame = buildLowNoiseExperienceFrame(
    baseFrameInput({
      reasons: [
        { label: "First reason", rankScore: 90, reasonCode: "FRAME_REASON_1" },
        { label: "Second reason", rankScore: 70, reasonCode: "FRAME_REASON_2" },
        { label: "Third reason", rankScore: 60, reasonCode: "FRAME_REASON_3" },
        { label: "Fourth reason", rankScore: 30, reasonCode: "FRAME_REASON_4" },
      ],
      secondaryActions: [
        { action_code: "REQUEST_REVIEW", action_kind: "REQUEST_REVIEW", label: "Review" },
        {
          action_code: "OPEN_EVIDENCE",
          action_kind: "INVESTIGATE",
          label: "Evidence",
          target_detail_surface_code: "EVIDENCE_TIDE",
        },
      ],
      visibleWarningCount: 1,
    }),
  );

  expect(frame.decision_summary.attention_state).toBe(frame.attention_policy.attention_state);
  expect(frame.action_strip.actionability_state).toBe(frame.attention_policy.actionability_state);
  expect(frame.action_strip.dominance_margin).toBe(
    frame.action_strip.primary_action_score - frame.action_strip.runner_up_action_score,
  );
  expect(new Set(frame.action_strip.available_action_codes)).toEqual(
    new Set([frame.action_strip.primary_action?.action_code, ...frame.action_strip.secondary_actions.map((action) => action.action_code)]),
  );
  expect(frame.decision_summary.visible_reasons.every((reason) =>
    frame.decision_summary.machine_reason_codes.includes(reason.reason_code),
  )).toBe(true);

  await validateContractSchema("low_noise_experience_frame", frame);
});
