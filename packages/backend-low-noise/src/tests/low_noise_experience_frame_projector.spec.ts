import { expect, test } from "@playwright/test";

import {
  buildLowNoiseExperienceFrame,
  deriveFrameSurfaceBudgetContract,
  lowNoiseSurfaceOrder,
  validateLowNoiseFramePublication,
} from "../index.ts";
import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";

function baseInput(overrides: Partial<Parameters<typeof buildLowNoiseExperienceFrame>[0]> = {}) {
  return {
    accessBindingHash: "access.pc0169",
    decisionBundleHash: "decision.hash.pc0169",
    frameEpoch: 1,
    lastPublishedSequence: 7,
    manifestId: "manifest.pc0169",
    maskingContextHash: "mask.pc0169",
    principalClass: "STAFF_OPERATOR",
    publicationGeneration: 3,
    renderedAt: "2026-05-04T09:00:00.000Z",
    resumeToken: "resume.pc0169",
    sessionBindingHash: "session.hash.pc0169",
    sessionRef: "session.pc0169",
    shellStabilityToken: "shell.pc0169",
    tenantId: "tenant.pc0169",
    ...overrides,
  } satisfies Parameters<typeof buildLowNoiseExperienceFrame>[0];
}

test("projects a schema-valid calm-shell frame with exact peer surface order", async () => {
  const frame = buildLowNoiseExperienceFrame(baseInput());

  expect(frame.surface_order).toEqual([...lowNoiseSurfaceOrder]);
  expect(frame.low_noise_budget_audit.rendered_surface_order).toEqual(frame.surface_order);
  expect(frame.experience_profile).toBe("LOW_NOISE");
  expect(frame.shell_family).toBe("CALM_SHELL");
  expect(frame.dominance_contract.promoted_support_surface_code_or_null).toBeNull();
  expect(frame.cross_device_continuity_contract.continuity_scope).toBe("MANIFEST_ROUTE");
  expect(frame.cross_device_continuity_contract.allowed_embodiments).toEqual([
    "BROWSER_WIDE",
    "BROWSER_NARROW_STACKED",
    "NATIVE_PRIMARY_SCENE",
    "NATIVE_SUPPORT_WINDOW",
  ]);

  await validateContractSchema("context_bar_state", frame.context_bar);
  await validateContractSchema("decision_summary_state", frame.decision_summary);
  await validateContractSchema("action_strip_state", frame.action_strip);
  await validateContractSchema("detail_drawer_state", frame.detail_drawer);
  await validateContractSchema("low_noise_budget_audit", frame.low_noise_budget_audit);
  await validateContractSchema("low_noise_experience_frame", frame);
});

test("keeps recovery inline, fail-closed, and promoted through one support region", async () => {
  const frame = buildLowNoiseExperienceFrame(
    baseInput({
      connectionState: "STALE",
      frameEpoch: 2,
      manifestId: "manifest.pc0169.recovery",
      renderedAt: "2026-05-04T09:01:00.000Z",
      resumeToken: "resume.pc0169.recovery",
      shellStabilityToken: "shell.pc0169.recovery",
    }),
  );

  expect(frame.action_strip.actionability_state).toBe("NO_SAFE_ACTION");
  expect(frame.action_strip.mode_safety_posture).toBe("NON_LIVE_MUTATIONS_FORBIDDEN");
  expect(frame.active_detail_surface_code).toBe("FOCUS_LENS");
  expect(frame.action_strip.active_detail_surface_code).toBe(frame.active_detail_surface_code);
  expect(frame.detail_drawer.expanded_module_code).toBe(frame.active_detail_surface_code);
  expect(frame.dominance_contract.promoted_support_surface_code_or_null).toBe("DETAIL_DRAWER");
  expect(frame.dominance_contract.support_surface_role).toBe("RECOVERY");
  expect(frame.state_taxonomy_contract.mounted_context_state).toBe("READ_ONLY_PRESERVED");
  expect(frame.low_noise_budget_audit.scan_load).toBeLessThanOrEqual(
    frame.cognitive_budget.visibility_budget_units,
  );

  await validateContractSchema("low_noise_experience_frame", frame);
});

test("collapses reason pressure into three visible reasons and frozen budget counts", async () => {
  const frame = buildLowNoiseExperienceFrame(
    baseInput({
      manifestId: "manifest.pc0169.reasons",
      reasons: Array.from({ length: 5 }, (_, index) => ({
        label: `Reason ${index + 1} requires review before continuing with this manifest`,
        reasonCode: `REASON_${index + 1}`,
        severity: "REVIEW",
      })),
      renderedAt: "2026-05-04T09:02:00.000Z",
      resumeToken: "resume.pc0169.reasons",
      shellStabilityToken: "shell.pc0169.reasons",
    }),
  );

  expect(frame.decision_summary.visible_reasons).toHaveLength(3);
  expect(frame.decision_summary.additional_reason_count).toBe(2);
  expect(frame.low_noise_budget_audit.visible_reason_count).toBe(3);
  expect(frame.low_noise_budget_audit.collapsed_reason_count).toBe(2);
  expect(frame.low_noise_budget_audit.scan_load).toBeLessThanOrEqual(
    frame.cognitive_budget.visibility_budget_units,
  );
  expect(frame.low_noise_budget_audit).toEqual(deriveFrameSurfaceBudgetContract(frame));

  await validateContractSchema("low_noise_experience_frame", frame);
});

test("rejects surface-order drift and route-local client salience", () => {
  const frame = buildLowNoiseExperienceFrame(baseInput());
  const wrongOrder = structuredClone(frame);
  wrongOrder.surface_order = ["CONTEXT_BAR", "ACTION_STRIP", "DECISION_SUMMARY", "DETAIL_DRAWER"];
  expect(() => validateLowNoiseFramePublication(wrongOrder)).toThrow(
    /surface order must remain/u,
  );

  const clientSalience = structuredClone(frame) as typeof frame & {
    route_local_salience?: Record<string, unknown>;
  };
  clientSalience.route_local_salience = { ACTION_STRIP: 1 };
  expect(() => validateLowNoiseFramePublication(clientSalience)).toThrow(
    /route-local or client salience/u,
  );
});
