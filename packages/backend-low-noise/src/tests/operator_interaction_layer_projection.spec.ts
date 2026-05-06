import { expect, test } from "@playwright/test";

import {
  buildLowNoiseExperienceFrame,
  deriveCalmShellMotionAndRecoveryPresentation,
  projectInteractionLayerFoundationContract,
  projectOperatorInteractionLayer,
  validateLowNoiseFramePublication,
  validateOperatorInteractionLayerContract,
  OperatorInteractionLayerContractError,
} from "../index.ts";
import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";

function baseFrameInput(overrides: Partial<Parameters<typeof buildLowNoiseExperienceFrame>[0]> = {}) {
  return {
    accessBindingHash: "access.pc0175.test",
    decisionBundleHash: "decision.hash.pc0175.test",
    frameEpoch: 1,
    frameId: `frame.pc0175.${overrides.lastPublishedSequence ?? 175}`,
    lastPublishedSequence: 175,
    manifestId: "manifest.pc0175.test",
    maskingContextHash: "mask.pc0175.test",
    principalClass: "STAFF_OPERATOR",
    publicationGeneration: 1,
    renderedAt: "2026-05-04T15:00:00.000Z",
    resumeToken: "resume.pc0175.test",
    sessionBindingHash: "session.hash.pc0175.test",
    sessionRef: "session.pc0175.test",
    shellStabilityToken: "shell.pc0175.test",
    tenantId: "tenant.pc0175.test",
    ...overrides,
  } satisfies Parameters<typeof buildLowNoiseExperienceFrame>[0];
}

test("projects the calm-shell interaction foundation from the shared typed factory", async () => {
  const foundation = projectInteractionLayerFoundationContract({ shellFamily: "CALM_SHELL" });

  expect(foundation).toEqual({
    contract_version: "CROSS_SHELL_INTERACTION_FOUNDATION_V1",
    continuity_policy: "SAME_OBJECT_SAME_SHELL_INLINE_RECOVERY",
    design_token_binding_policy: "EXPLICIT_SEMANTIC_BINDINGS_ONLY",
    feedback_truth_policy: "DURABLE_RECEIPT_AND_TYPED_FAILURE_DRIVEN",
    history_presentation_policy: "CURRENT_PRIMARY_HISTORY_SECONDARY",
    layout_density_token: "CALM_FOUR_SURFACE_DENSITY_V1",
    motion_profile: "SUBTLE_CAUSAL_ONLY",
    motion_token: "SUBTLE_CAUSAL_MOTION_V1",
    notification_surface_policy: "CONTEXT_BOUND_INLINE_FEEDBACK_OR_PARENT_MIRROR",
    platform_parity_policy: "SAME_FAMILY_REUSES_SAME_INTERACTION_GRAMMAR",
    preview_surface_policy: "DETAIL_DRAWER_OR_PARENT_BOUND_SECONDARY_WINDOW",
    recovery_surface_policy: "INLINE_EXPLICIT_REBASE",
    responsive_compaction_token: "CALM_SUPPORT_REDOCK_V1",
    secondary_window_policy: "SUPPORT_ONLY_PARENT_BOUND_CLOSE_RETURNS_FOCUS",
    selector_profile: "OPERATOR_SEMANTIC_SELECTORS_V1",
    shell_family: "CALM_SHELL",
    support_surface_policy: "ONE_PROMOTED_SUPPORT_SURFACE_MAX",
    support_surface_spacing_token: "CALM_DETAIL_DRAWER_SUPPORT_SPACING_V1",
    surface_spacing_token: "CALM_FOUR_SURFACE_SPACING_V1",
  });
  await validateContractSchema("interaction_layer_foundation_contract", foundation);
});

test("keeps portal and governance foundation semantics distinct for future consumers", async () => {
  const portal = projectInteractionLayerFoundationContract({ shellFamily: "CLIENT_PORTAL_SHELL" });
  const governance = projectInteractionLayerFoundationContract({
    shellFamily: "GOVERNANCE_DENSITY_SHELL",
  });

  expect(portal.selector_profile).toBe("PORTAL_SEMANTIC_SELECTORS_V1");
  expect(portal.continuity_policy).toBe("SAME_SHELL_CONTEXTUAL_RETURN");
  expect(portal.secondary_window_policy).toBe("NOT_APPLICABLE");
  expect(governance.selector_profile).toBe("GOVERNANCE_SEMANTIC_SELECTORS_V1");
  expect(governance.preview_surface_policy).toBe("AUXILIARY_SURFACE_CONTEXTUAL_ONLY");
  expect(governance.history_presentation_policy).toBe("ACTIVE_SLICE_PRIMARY_CONTEXTUAL_HISTORY");

  await validateContractSchema("interaction_layer_foundation_contract", portal);
  await validateContractSchema("interaction_layer_foundation_contract", governance);
});

test("projects schema-valid browser-primary operator interaction semantics", async () => {
  const layer = projectOperatorInteractionLayer();

  expect(layer.recovery_notice_surface).toBe("CONTEXT_BAR");
  expect(layer.notification_surface).toBe("CONTEXT_BAR");
  expect(layer.artifact_preview_surface).toBe("DETAIL_DRAWER");
  expect(layer.history_presentation).toBe("CURRENT_PRIMARY_HISTORY_SECONDARY");
  expect(layer.selector_profile).toBe(layer.foundation_contract.selector_profile);
  expect(layer.shell_continuity_policy).toBe(layer.foundation_contract.continuity_policy);

  await validateContractSchema("operator_interaction_layer", layer);
});

test("uses identity header and parent notification only for parent-bound support windows", async () => {
  const supportWindow = projectOperatorInteractionLayer({
    embodiment: "PARENT_BOUND_SUPPORT_WINDOW",
  });

  expect(supportWindow.recovery_notice_surface).toBe("IDENTITY_HEADER");
  expect(supportWindow.notification_surface).toBe("PARENT_CONTEXT_BAR");
  expect(supportWindow.artifact_preview_surface).toBe("SECONDARY_WINDOW_BODY");
  expect(supportWindow.history_presentation).toBe("CURRENT_PRIMARY_HISTORY_SECONDARY");

  await validateContractSchema("operator_interaction_layer", supportWindow);
});

test("derives fail-closed unsafe-action posture without changing the operator contract shape", () => {
  const degraded = deriveCalmShellMotionAndRecoveryPresentation({
    actionabilityState: "NO_SAFE_ACTION",
    recoveryPosture: "READ_ONLY_LIMITED",
    settlementState: "DEGRADED_READ_ONLY",
  });

  expect(degraded.requiresFailClosedActions).toBe(true);
  expect(degraded.refresh_presentation).toBe("INLINE_STATUS_ONLY");
  expect(degraded.recovery_presentation).toBe("INLINE_EXPLICIT_REBASE");
  expect(degraded.unsafe_action_policy).toBe("FAIL_CLOSED_DURING_DEGRADED_OR_RECOVERY");
});

test("low-noise frames consume the operator interaction projector", async () => {
  const frame = buildLowNoiseExperienceFrame(baseFrameInput());

  expect(frame.interaction_layer).toEqual(
    projectOperatorInteractionLayer({
      actionabilityState: frame.action_strip.actionability_state,
      recoveryPosture: frame.recovery_posture,
      settlementState: frame.settlement_state,
    }),
  );

  await validateContractSchema("low_noise_experience_frame", frame);
});

test("rejects cross-family foundations and interaction-layer drift", () => {
  const portalFoundation = projectInteractionLayerFoundationContract({
    shellFamily: "CLIENT_PORTAL_SHELL",
  });
  expect(() =>
    projectOperatorInteractionLayer({ foundationContract: portalFoundation }),
  ).toThrow(/CALM_SHELL/u);

  const frame = buildLowNoiseExperienceFrame(baseFrameInput());
  const drifted = structuredClone(frame);
  drifted.interaction_layer.notification_surface = "PARENT_CONTEXT_BAR";

  expect(() =>
    validateOperatorInteractionLayerContract({
      actionabilityState: frame.action_strip.actionability_state,
      interactionLayer: drifted.interaction_layer,
      recoveryPosture: frame.recovery_posture,
      settlementState: frame.settlement_state,
    }),
  ).toThrow(OperatorInteractionLayerContractError);
  expect(() => validateLowNoiseFramePublication(drifted)).toThrow(
    OperatorInteractionLayerContractError,
  );
});
