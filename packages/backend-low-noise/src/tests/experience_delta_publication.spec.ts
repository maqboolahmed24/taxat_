import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  buildExperienceDelta,
  buildLowNoiseExperienceFrame,
  coalesceNonMaterialRefresh,
  computeContinuityCost,
  LowNoiseDeltaPublicationError,
  publishExperienceDeltaBatch,
  validateDeltaMirrorContract,
  type LowNoiseDetailEntryCandidate,
} from "../index.ts";
import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

function baseFrameInput(overrides: Partial<Parameters<typeof buildLowNoiseExperienceFrame>[0]> = {}) {
  return {
    accessBindingHash: "access.pc0173.test",
    decisionBundleHash: "decision.hash.pc0173.test",
    frameEpoch: 1,
    frameId: `frame.pc0173.${overrides.lastPublishedSequence ?? 173}`,
    lastPublishedSequence: 173,
    manifestId: "manifest.pc0173.test",
    maskingContextHash: "mask.pc0173.test",
    principalClass: "STAFF_OPERATOR",
    publicationGeneration: 1,
    renderedAt: "2026-05-04T13:00:00.000Z",
    resumeToken: "resume.pc0173.test",
    sessionBindingHash: "session.hash.pc0173.test",
    sessionRef: "session.pc0173.test",
    shellStabilityToken: "shell.pc0173.test",
    tenantId: "tenant.pc0173.test",
    ...overrides,
  } satisfies Parameters<typeof buildLowNoiseExperienceFrame>[0];
}

function detailCandidate(
  moduleCode: LowNoiseDetailEntryCandidate["moduleCode"],
  rankScore: number,
  objectRef = "manifest.pc0173.test",
): LowNoiseDetailEntryCandidate {
  return {
    anchorableObjectRefs: [objectRef],
    moduleCode,
    rankScore,
  };
}

async function validateJsonSchemaOnly(kind: string, payload: unknown) {
  const script = `
import json
import pathlib
import sys

repo = pathlib.Path(sys.argv[1])
sys.path.insert(0, str(repo / "packages" / "contracts-core" / "python"))
from validate_contracts import Draft202012Validator, build_registry, load_json  # type: ignore

kind = sys.argv[2]
payload = json.loads(sys.argv[3])
schema = load_json(repo / "packages" / "contracts-core" / "schemas" / f"{kind}.schema.json")
validator = Draft202012Validator(
    schema,
    registry=build_registry(),
    format_checker=Draft202012Validator.FORMAT_CHECKER,
)
issues = [
    f"schema:{'/'.join(map(str, error.absolute_path)) or '<root>'}: {error.message}"
    for error in sorted(validator.iter_errors(payload), key=lambda error: list(error.absolute_path))
]
if issues:
    raise SystemExit("\\n".join(issues))
`;
  await execFileAsync(path.join(repoRoot, ".venv", "bin", "python3"), [
    "-c",
    script,
    repoRoot,
    kind,
    JSON.stringify(payload),
  ]);
}

test("builds a schema-valid material ExperienceDelta with exact mirror fields", async () => {
  const previousFrame = buildLowNoiseExperienceFrame(baseFrameInput());
  const nextFrame = buildLowNoiseExperienceFrame(
    baseFrameInput({
      activeDetailSurfaceCode: "EVIDENCE_TIDE",
      frameId: "frame.pc0173.material",
      lastPublishedSequence: 174,
      primaryAction: {
        action_code: "REQUEST_REVIEW",
        action_kind: "REQUEST_REVIEW",
        label: "Request review",
        mutation_precondition_binding_or_null: null,
        requires_live_freshness: false,
        target_detail_surface_code: "EVIDENCE_TIDE",
        target_object_ref: "manifest.pc0173.test",
      },
      reasons: [
        {
          label: "Payment evidence needs review before filing.",
          reasonCode: "PAYMENT_REVIEW",
          severity: "REVIEW",
        },
      ],
      renderedAt: "2026-05-04T13:00:01.000Z",
      visibleWarningCount: 1,
    }),
  );

  const result = buildExperienceDelta({
    causeRef: "cause://pc0173/material",
    experienceSequence: 10,
    materiality: "MATERIAL",
    nextFrame,
    previousFrame,
  });

  expect(result.delta).not.toBeNull();
  const delta = result.delta!;
  expect(delta.experience_sequence).toBe(10);
  expect(delta.semantic_motion).toBe("RIPPLE");
  expect(delta.affected_surface_codes).toEqual([
    "DECISION_SUMMARY",
    "ACTION_STRIP",
    "DETAIL_DRAWER",
  ]);
  expect(delta.affected_surface_codes).toEqual(
    delta.surface_updates.map((update) => update.surface_code),
  );
  expect(delta.attention_state).toBe(delta.attention_policy.attention_state);
  expect(delta.primary_object_ref).toBe(delta.attention_policy.primary_object_ref);
  expect(delta.actionability_state).toBe(delta.attention_policy.actionability_state);
  expect(delta.primary_action_code).toBe(delta.attention_policy.primary_action_code);
  expect(delta.detail_entry_points).toEqual(delta.attention_policy.detail_entry_points);
  expect(delta.shell_route_key).toBe(delta.manifest_id);

  await validateContractSchema("low_noise_experience_frame", nextFrame);
  await validateJsonSchemaOnly("experience_delta", delta);
});

test("computes continuity cost from the frozen non-material refresh formula", () => {
  const previousFrame = buildLowNoiseExperienceFrame(
    baseFrameInput({
      activeDetailSurfaceCode: "EVIDENCE_TIDE",
      detailEntries: [
        detailCandidate("EVIDENCE_TIDE", 90, "manifest.pc0173.cost"),
        detailCandidate("PACKET_FORGE", 80, "manifest.pc0173.cost"),
        detailCandidate("FOCUS_LENS", 70, "manifest.pc0173.cost"),
      ],
      frameEpoch: 7,
      frameId: "frame.pc0173.cost.prev",
      lastPublishedSequence: 700,
      manifestId: "manifest.pc0173.cost",
    }),
  );
  const nextFrame = buildLowNoiseExperienceFrame(
    baseFrameInput({
      activeDetailSurfaceCode: null,
      detailEntries: [
        detailCandidate("PACKET_FORGE", 90, "manifest.pc0173.cost"),
        detailCandidate("EVIDENCE_TIDE", 80, "manifest.pc0173.cost"),
        detailCandidate("FOCUS_LENS", 70, "manifest.pc0173.cost"),
      ],
      dominantQuestion: "Should this filing be paused for review?",
      frameEpoch: 7,
      frameId: "frame.pc0173.cost.next",
      lastPublishedSequence: 701,
      manifestId: "manifest.pc0173.cost",
      primaryAction: {
        action_code: "REQUEST_REVIEW",
        action_kind: "REQUEST_REVIEW",
        label: "Request review",
        mutation_precondition_binding_or_null: null,
        requires_live_freshness: false,
        target_detail_surface_code: "EVIDENCE_TIDE",
        target_object_ref: "manifest.pc0173.cost",
      },
      reasons: [
        {
          label: "Review required before filing.",
          reasonCode: "REVIEW_REQUIRED",
          severity: "REVIEW",
        },
      ],
      renderedAt: "2026-05-04T13:10:01.000Z",
      visibleWarningCount: 1,
    }),
  );

  const cost = computeContinuityCost({
    nextFrame,
    previousFrame,
    prominentMotionCount: 1,
    visibleChangeCount: 2,
  });

  expect(cost).toEqual({
    continuityCost: 18,
    dominantQuestionChanged: true,
    focusAnchorLost: true,
    primaryActionChanged: true,
    prominentMotionCount: 1,
    rankSwapCount: 2,
    visibleChangeCount: 2,
  });
});

test("coalesces non-material churn before it can reorder the calm shell", () => {
  const previousFrame = buildLowNoiseExperienceFrame(baseFrameInput());
  const nextFrame = buildLowNoiseExperienceFrame(
    baseFrameInput({
      frameId: "frame.pc0173.non-material",
      lastPublishedSequence: 174,
      primaryAction: {
        action_code: "REQUEST_REVIEW",
        action_kind: "REQUEST_REVIEW",
        label: "Request review",
        mutation_precondition_binding_or_null: null,
        requires_live_freshness: false,
        target_detail_surface_code: "EVIDENCE_TIDE",
        target_object_ref: "manifest.pc0173.test",
      },
      reasons: [
        {
          label: "Payment evidence needs review before filing.",
          reasonCode: "PAYMENT_REVIEW",
          severity: "REVIEW",
        },
      ],
      renderedAt: "2026-05-04T13:00:02.000Z",
      visibleWarningCount: 1,
    }),
  );

  const result = buildExperienceDelta({
    causeRef: "cause://pc0173/non-material",
    experienceSequence: 11,
    materiality: "NON_MATERIAL",
    nextFrame,
    previousFrame,
  });

  expect(result.delta).toBeNull();
  expect(result.coalescingDecision.outcome).toBe("HOLD_UNTIL_MATERIAL");
  expect(result.coalescingDecision.reasonCodes).toContain("PRIMARY_ACTION_CHANGED");

  expect(
    coalesceNonMaterialRefresh({
      continuity: {
        continuityCost: 0,
        dominantQuestionChanged: false,
        focusAnchorLost: false,
        primaryActionChanged: false,
        prominentMotionCount: 0,
        rankSwapCount: 0,
        visibleChangeCount: 3,
      },
      scanLoad: 8,
    }),
  ).toEqual({
    outcome: "COLLAPSE_TO_COUNTS",
    reasonCodes: ["VISIBLE_CHANGE_BURST_EXCEEDS_LIMIT"],
    shouldPublishDelta: false,
  });
});

test("rejects mirror drift and affected-surface drift before publication", () => {
  const previousFrame = buildLowNoiseExperienceFrame(baseFrameInput());
  const nextFrame = buildLowNoiseExperienceFrame(
    baseFrameInput({
      frameId: "frame.pc0173.mirror",
      headline: "Manifest state updated",
      lastPublishedSequence: 174,
      renderedAt: "2026-05-04T13:00:03.000Z",
    }),
  );
  const result = buildExperienceDelta({
    causeRef: "cause://pc0173/mirror",
    experienceSequence: 12,
    materiality: "MATERIAL",
    nextFrame,
    previousFrame,
  });
  const delta = result.delta!;

  const mirrorDrift = structuredClone(delta);
  mirrorDrift.actionability_state = "NO_SAFE_ACTION";
  expect(() => validateDeltaMirrorContract(mirrorDrift)).toThrow(LowNoiseDeltaPublicationError);

  const surfaceDrift = structuredClone(delta);
  surfaceDrift.affected_surface_codes = ["ACTION_STRIP"];
  expect(() => validateDeltaMirrorContract(surfaceDrift)).toThrow(LowNoiseDeltaPublicationError);
});

test("publishes monotonic idempotent batches and blocks mixed frame epochs", () => {
  const previousFrame = buildLowNoiseExperienceFrame(baseFrameInput());
  const firstFrame = buildLowNoiseExperienceFrame(
    baseFrameInput({
      frameId: "frame.pc0173.batch.first",
      headline: "First batch publication",
      lastPublishedSequence: 174,
      renderedAt: "2026-05-04T13:00:04.000Z",
    }),
  );
  const secondFrame = buildLowNoiseExperienceFrame(
    baseFrameInput({
      frameId: "frame.pc0173.batch.second",
      headline: "Second batch publication",
      lastPublishedSequence: 175,
      renderedAt: "2026-05-04T13:00:05.000Z",
    }),
  );

  const published = publishExperienceDeltaBatch({
    causeRef: "cause://pc0173/batch",
    frames: [firstFrame, firstFrame, secondFrame],
    materiality: "MATERIAL",
    previousFrame,
    startingExperienceSequence: 50,
  });

  expect(published.suppressed).toEqual([]);
  expect(published.deltas.map((delta) => delta.experience_sequence)).toEqual([50, 51]);
  expect(published.nextExperienceSequence).toBe(52);
  expect(published.deltas.map((delta) => delta.frame_epoch)).toEqual([1, 1]);

  const incompatibleFrame = buildLowNoiseExperienceFrame(
    baseFrameInput({
      frameEpoch: 2,
      frameId: "frame.pc0173.batch.epoch2",
      lastPublishedSequence: 176,
      renderedAt: "2026-05-04T13:00:06.000Z",
    }),
  );
  expect(() =>
    publishExperienceDeltaBatch({
      causeRef: "cause://pc0173/mixed",
      frames: [firstFrame, incompatibleFrame],
      previousFrame,
      startingExperienceSequence: 70,
    }),
  ).toThrow(/cannot mix frame epochs/u);
});
