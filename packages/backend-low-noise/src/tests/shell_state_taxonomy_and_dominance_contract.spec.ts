import { expect, test } from "@playwright/test";

import {
  buildLowNoiseExperienceFrame,
  deriveDominantQuestionAndSafeAction,
  projectShellDominanceContract,
  projectShellStateTaxonomyContract,
  ShellSalienceAlignmentError,
  ShellStateTaxonomyProjectionError,
  validateShellSalienceAlignment,
} from "../index.ts";
import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";

function baseFrameInput(overrides: Partial<Parameters<typeof buildLowNoiseExperienceFrame>[0]> = {}) {
  return {
    accessBindingHash: "access.pc0174.test",
    decisionBundleHash: "decision.hash.pc0174.test",
    frameEpoch: 1,
    frameId: `frame.pc0174.${overrides.lastPublishedSequence ?? 174}`,
    lastPublishedSequence: 174,
    manifestId: "manifest.pc0174.test",
    maskingContextHash: "mask.pc0174.test",
    principalClass: "STAFF_OPERATOR",
    publicationGeneration: 1,
    renderedAt: "2026-05-04T14:00:00.000Z",
    resumeToken: "resume.pc0174.test",
    sessionBindingHash: "session.hash.pc0174.test",
    sessionRef: "session.pc0174.test",
    shellStabilityToken: "shell.pc0174.test",
    tenantId: "tenant.pc0174.test",
    ...overrides,
  } satisfies Parameters<typeof buildLowNoiseExperienceFrame>[0];
}

test("low-noise frames consume the shared dominance and taxonomy projector layer", async () => {
  const frame = buildLowNoiseExperienceFrame(baseFrameInput());

  expect(frame.dominance_contract).toEqual(
    projectShellDominanceContract({
      actionabilityState: frame.action_strip.actionability_state,
      activeDetailSurfaceCode: frame.active_detail_surface_code,
      auditModeExplicit: frame.detail_drawer.audit_mode_explicit,
      compareModeExplicit: frame.detail_drawer.compare_mode_explicit,
      dominantActionRefOrNull: frame.action_strip.primary_action?.action_code ?? null,
      primaryActionCode: frame.action_strip.primary_action?.action_code ?? null,
      recoveryPosture: frame.recovery_posture,
      settlementState: frame.settlement_state,
      shellFamily: "CALM_SHELL",
    }),
  );
  expect(frame.state_taxonomy_contract).toEqual(
    projectShellStateTaxonomyContract({
      recoveryPosture: "NONE",
      settlementState: "STEADY",
    }),
  );

  await validateContractSchema("shell_dominance_contract", frame.dominance_contract);
  await validateContractSchema("shell_state_taxonomy_contract", frame.state_taxonomy_contract);
  await validateContractSchema("low_noise_experience_frame", frame);
});

test("preserves dominant question through receipt-pending posture", () => {
  const salience = deriveDominantQuestionAndSafeAction({
    actionabilityState: "ACTION_AVAILABLE",
    dominantQuestion: "Did the receipt settle?",
    previousDominantQuestion: "Is this manifest ready to file?",
    primaryActionCode: "FILE_RETURN",
    settlementState: "RECEIPT_PENDING",
    shellFamily: "CALM_SHELL",
  });

  expect(salience.dominantQuestion).toBe("Is this manifest ready to file?");
  expect(salience.dominantActionRefOrNull).toBe("FILE_RETURN");
});

test("requires typed limitation reasons and canonical empty-state surfaces", async () => {
  const limited = projectShellStateTaxonomyContract({
    currentEmptyStateOrNull: "LIMITED",
    currentEmptySurfaceCodeOrNull: "DECISION_SUMMARY",
    limitationReasonCodes: ["MASKED_ACCESS", "RETENTION_LIMITED"],
    recoveryPosture: "NONE",
    settlementState: "STEADY",
  });

  expect(limited.current_empty_surface_code_or_null).toBe("DECISION_SUMMARY");
  expect(limited.limitation_reason_codes).toEqual(["MASKED_ACCESS", "RETENTION_LIMITED"]);
  await validateContractSchema("shell_state_taxonomy_contract", limited);

  expect(() =>
    projectShellStateTaxonomyContract({
      currentEmptyStateOrNull: "LIMITED",
      currentEmptySurfaceCodeOrNull: "DECISION_SUMMARY",
      recoveryPosture: "NONE",
      settlementState: "STEADY",
    }),
  ).toThrow(ShellStateTaxonomyProjectionError);

  expect(() =>
    projectShellStateTaxonomyContract({
      currentEmptyStateOrNull: "NOT_REQUESTED",
      currentEmptySurfaceCodeOrNull: "DETAIL_DRAWER",
      limitationReasonCodes: ["MASKED_ACCESS"],
      recoveryPosture: "NONE",
      settlementState: "STEADY",
    }),
  ).toThrow(ShellStateTaxonomyProjectionError);
});

test("forces no-safe-action posture for degraded and read-only recovery states", async () => {
  const degraded = buildLowNoiseExperienceFrame(
    baseFrameInput({
      connectionState: "DEGRADED",
      frameId: "frame.pc0174.degraded",
      lastPublishedSequence: 175,
      renderedAt: "2026-05-04T14:00:01.000Z",
    }),
  );

  expect(degraded.dominance_contract.safe_action_state).toBe("NO_SAFE_ACTION");
  expect(degraded.dominance_contract.promoted_support_surface_code_or_null).toBe("DETAIL_DRAWER");
  expect(degraded.dominance_contract.support_surface_role).toBe("RECOVERY");
  expect(degraded.state_taxonomy_contract.current_settlement_state).toBe("DEGRADED_READ_ONLY");
  expect(degraded.state_taxonomy_contract.mounted_context_state).toBe("READ_ONLY_PRESERVED");

  const portalForced = projectShellDominanceContract({
    actionabilityState: "ACTION_AVAILABLE",
    portalRoute: "HOME",
    primaryActionCode: "task://upload-evidence",
    recoveryPosture: "READ_ONLY_LIMITED",
    shellFamily: "CLIENT_PORTAL_SHELL",
  });
  expect(portalForced.safe_action_state).toBe("NO_SAFE_ACTION");
  expect(portalForced.dominant_action_ref_or_null).toBeNull();

  await validateContractSchema("shell_dominance_contract", degraded.dominance_contract);
  await validateContractSchema("shell_state_taxonomy_contract", degraded.state_taxonomy_contract);
});

test("maps portal dominant surfaces while keeping queues and help subordinate", async () => {
  const home = projectShellDominanceContract({
    actionabilityState: "ACTION_AVAILABLE",
    dominantActionRefOrNull: "task://upload-evidence",
    portalRoute: "HOME",
    promotedSupportRegion: "LIMITATION_NOTICE",
    shellFamily: "CLIENT_PORTAL_SHELL",
  });
  expect(home.dominant_question_surface_code).toBe("STATUS_HERO");
  expect(home.dominant_action_surface_code).toBe("STATUS_HERO");
  expect(home.supplemental_queue_policy).toBe("PRIMARY_ACTION_MIRROR_ONLY");
  expect(home.promoted_support_surface_code_or_null).toBe("LIMITATION_NOTICE");
  expect(home.support_surface_role).toBe("RECOVERY");

  const documents = projectShellDominanceContract({
    actionabilityState: "NO_SAFE_ACTION",
    portalRoute: "DOCUMENTS",
    shellFamily: "CLIENT_PORTAL_SHELL",
  });
  expect(documents.dominant_question_surface_code).toBe("DOCUMENT_CENTER");
  expect(documents.supplemental_queue_policy).toBe("NOT_APPLICABLE");

  const help = projectShellDominanceContract({
    actionabilityState: "ACTION_AVAILABLE",
    dominantActionRefOrNull: "support://contact",
    portalRoute: "HELP",
    promotedSupportRegion: "SUPPORT_PANEL",
    shellFamily: "CLIENT_PORTAL_SHELL",
  });
  expect(help.dominant_question_surface_code).toBe("SUPPORT_PANEL");
  expect(help.dominant_action_surface_code).toBe("SUPPORT_PANEL");
  expect(help.promoted_support_surface_code_or_null).toBeNull();
  expect(help.support_surface_role).toBe("NONE");

  await validateContractSchema("shell_dominance_contract", home);
  await validateContractSchema("shell_dominance_contract", documents);
  await validateContractSchema("shell_dominance_contract", help);
});

test("keeps compare and audit explicit and rejects salience drift", async () => {
  const compare = projectShellDominanceContract({
    actionabilityState: "ACTION_AVAILABLE",
    activeDetailSurfaceCode: "TWIN_PANEL",
    compareModeExplicit: true,
    primaryActionCode: "COMPARE_TWIN",
    shellFamily: "CALM_SHELL",
  });

  expect(compare.explicit_multifocus_mode).toBe("COMPARE");
  expect(compare.promoted_support_surface_code_or_null).toBe("DETAIL_DRAWER");
  expect(compare.support_surface_role).toBe("INVESTIGATION");
  await validateContractSchema("shell_dominance_contract", compare);

  const drifted = structuredClone(compare);
  drifted.dominant_action_surface_code = "TASK_QUEUE";
  expect(() =>
    validateShellSalienceAlignment({
      actionabilityState: "ACTION_AVAILABLE",
      activeDetailSurfaceCode: "TWIN_PANEL",
      compareModeExplicit: true,
      dominanceContract: drifted,
      primaryActionCode: "COMPARE_TWIN",
      shellFamily: "CALM_SHELL",
    }),
  ).toThrow(ShellSalienceAlignmentError);
});
