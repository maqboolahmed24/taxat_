import { expect, test } from "@playwright/test";

import {
  buildDetailDrawerState,
  buildLowNoiseExperienceFrame,
  deriveSupportRegionPromotion,
  resolveDetailFallbackState,
  type LowNoiseDetailEntryCandidate,
} from "../index.ts";
import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";

const manifestId = "manifest.pc0171";
const objectAnchorRef = manifestId;

function detailCandidate(
  moduleCode: LowNoiseDetailEntryCandidate["moduleCode"],
  overrides: Omit<Partial<LowNoiseDetailEntryCandidate>, "moduleCode"> = {},
): LowNoiseDetailEntryCandidate {
  return {
    anchorableObjectRefs: [objectAnchorRef],
    moduleCode,
    ...overrides,
  };
}

function baseFrameInput(overrides: Partial<Parameters<typeof buildLowNoiseExperienceFrame>[0]> = {}) {
  return {
    accessBindingHash: "access.pc0171",
    decisionBundleHash: "decision.hash.pc0171",
    frameEpoch: 1,
    lastPublishedSequence: 17,
    manifestId,
    maskingContextHash: "mask.pc0171",
    objectAnchorRef,
    principalClass: "STAFF_OPERATOR",
    publicationGeneration: 5,
    renderedAt: "2026-05-04T11:00:00.000Z",
    resumeToken: "resume.pc0171",
    sessionBindingHash: "session.hash.pc0171",
    sessionRef: "session.pc0171",
    shellStabilityToken: "shell.pc0171",
    tenantId: "tenant.pc0171",
    ...overrides,
  } satisfies Parameters<typeof buildLowNoiseExperienceFrame>[0];
}

test("caps ranked entry points at five and preserves the active focus anchor", async () => {
  const result = buildDetailDrawerState({
    activeDetailSurfaceCode: "AUTHORITY_TUNNEL",
    detailEntries: [
      detailCandidate("EVIDENCE_TIDE"),
      detailCandidate("PACKET_FORGE"),
      detailCandidate("AUTHORITY_TUNNEL"),
      detailCandidate("DRIFT_FIELD"),
      detailCandidate("FOCUS_LENS"),
      detailCandidate("TWIN_PANEL"),
    ],
    focusAnchorObjectRef: objectAnchorRef,
    manifestId,
    previousDetailEntryPoints: ["FOCUS_LENS", "PACKET_FORGE"],
    previousFocusAnchorRef: "focus://previous-authority",
    suggestedDetailSurfaceCode: "TWIN_PANEL",
  });

  expect(result.entryPoints).toHaveLength(5);
  expect(result.entryPoints.map((entry) => entry.module_code)).toEqual([
    "AUTHORITY_TUNNEL",
    "TWIN_PANEL",
    "EVIDENCE_TIDE",
    "PACKET_FORGE",
    "FOCUS_LENS",
  ]);
  expect(result.detailDrawer.expanded_module_code).toBe("AUTHORITY_TUNNEL");
  expect(result.detailFallbackState).toBe("ACTIVE_MODULE_PRESERVED");
  expect(result.focusAnchorRef).toBe("focus://previous-authority");

  await validateContractSchema("detail_drawer_state", result.detailDrawer);
});

test("falls back from invalid active modules with typed audit and drawer reasons", async () => {
  const suggested = buildDetailDrawerState({
    activeDetailSurfaceCode: "AUTHORITY_TUNNEL",
    detailEntries: [detailCandidate("PACKET_FORGE"), detailCandidate("EVIDENCE_TIDE")],
    manifestId,
    suggestedDetailSurfaceCode: "PACKET_FORGE",
  });

  expect(suggested.activeDetailSurfaceCode).toBe("PACKET_FORGE");
  expect(suggested.detailFallbackState).toBe("SUGGESTED_MODULE_SELECTED");
  expect(suggested.detailDrawer.fallback_reason_code).toBe("SUGGESTED_MODULE_SELECTED");

  const firstValid = buildDetailDrawerState({
    activeDetailSurfaceCode: "AUTHORITY_TUNNEL",
    detailEntries: [detailCandidate("EVIDENCE_TIDE"), detailCandidate("PACKET_FORGE")],
    manifestId,
  });

  expect(firstValid.activeDetailSurfaceCode).toBe("EVIDENCE_TIDE");
  expect(firstValid.detailFallbackState).toBe("FIRST_VALID_ENTRY_SELECTED");
  expect(firstValid.detailDrawer.fallback_reason_code).toBe("FIRST_VALID_ENTRY_SELECTED");

  const collapsed = resolveDetailFallbackState({
    activeDetailSurfaceCode: "AUTHORITY_TUNNEL",
    entryPoints: [],
  });

  expect(collapsed.activeDetailSurfaceCode).toBeNull();
  expect(collapsed.detailFallbackState).toBe("COLLAPSED_ROOT_SELECTED");
  expect(collapsed.drawerFallbackReasonCode).toBe("COLLAPSED_ROOT_SELECTED");

  await validateContractSchema("detail_drawer_state", suggested.detailDrawer);
  await validateContractSchema("detail_drawer_state", firstValid.detailDrawer);
});

test("keeps compare and audit modes explicit, lawful, and mutually exclusive", async () => {
  const compare = buildDetailDrawerState({
    activeDetailSurfaceCode: "EVIDENCE_TIDE",
    compareModeExplicit: true,
    detailEntries: [detailCandidate("EVIDENCE_TIDE"), detailCandidate("TWIN_PANEL")],
    manifestId,
  });

  expect(compare.detailDrawer.compare_mode_explicit).toBe(true);
  expect(compare.detailDrawer.audit_mode_explicit).toBe(false);
  expect(compare.detailDrawer.expanded_module_code).toBe("TWIN_PANEL");
  expect(compare.detailDrawer.fallback_reason_code).toBe(
    "COMPARE_MODE_REQUIRES_COMPARISON_MODULE",
  );

  const auditWins = buildDetailDrawerState({
    auditModeExplicit: true,
    compareModeExplicit: true,
    detailEntries: [detailCandidate("FOCUS_LENS"), detailCandidate("TWIN_PANEL")],
    manifestId,
  });

  expect(auditWins.detailDrawer.audit_mode_explicit).toBe(true);
  expect(auditWins.detailDrawer.compare_mode_explicit).toBe(false);
  expect(auditWins.detailDrawer.expanded_module_code).toBe("FOCUS_LENS");

  await validateContractSchema("detail_drawer_state", compare.detailDrawer);
  await validateContractSchema("detail_drawer_state", auditWins.detailDrawer);
});

test("publishes non-populated active detail as typed empty drawer state", async () => {
  const result = buildDetailDrawerState({
    activeDetailSurfaceCode: "EVIDENCE_TIDE",
    detailEntries: [
      detailCandidate("EVIDENCE_TIDE", {
        contentState: "LIMITED",
        entryReason: "Evidence is limited by the current access mask.",
        limitationReasonCodes: ["MASKED_ACCESS"],
      }),
      detailCandidate("PACKET_FORGE"),
    ],
    manifestId,
  });

  expect(result.detailFallbackState).toBe("ACTIVE_MODULE_PRESERVED");
  expect(result.detailDrawer.expanded_content_state).toBe("LIMITED");
  expect(result.detailDrawer.fallback_reason_code).toBe("ACTIVE_DETAIL_NOT_POPULATED");
  expect(result.entryPoints[0]?.state_reason_code_or_null).toBeNull();
  expect(result.entryPoints[0]?.limitation_reason_codes).toEqual(["MASKED_ACCESS"]);

  await validateContractSchema("detail_drawer_state", result.detailDrawer);
});

test("filters staff-only and non-customer-safe modules from masked audiences", async () => {
  const result = buildDetailDrawerState({
    activeDetailSurfaceCode: "FOCUS_LENS",
    detailAudience: "CUSTOMER_SAFE",
    detailEntries: [
      detailCandidate("FOCUS_LENS", { staffOnly: true }),
      detailCandidate("PACKET_FORGE", { customerSafe: false }),
      detailCandidate("EVIDENCE_TIDE", { customerSafe: true }),
    ],
    manifestId,
    suggestedDetailSurfaceCode: "EVIDENCE_TIDE",
  });

  expect(result.entryPoints.map((entry) => entry.module_code)).toEqual(["EVIDENCE_TIDE"]);
  expect(result.entryPoints.map((entry) => entry.entry_label)).toEqual(["Evidence Prism"]);
  expect(result.detailDrawer.expanded_module_code).toBe("EVIDENCE_TIDE");
  expect(result.detailFallbackState).toBe("SUGGESTED_MODULE_SELECTED");

  await validateContractSchema("detail_drawer_state", result.detailDrawer);
});

test("derives the single promoted support region role from active detail and mode", () => {
  expect(
    deriveSupportRegionPromotion({
      actionabilityState: "ACTION_AVAILABLE",
      activeDetailSurfaceCode: null,
    }).supportSurfaceRole,
  ).toBe("NONE");
  expect(
    deriveSupportRegionPromotion({
      actionabilityState: "NO_SAFE_ACTION",
      activeDetailSurfaceCode: "FOCUS_LENS",
    }).supportSurfaceRole,
  ).toBe("RECOVERY");
  expect(
    deriveSupportRegionPromotion({
      actionabilityState: "ACTION_AVAILABLE",
      activeDetailSurfaceCode: "TWIN_PANEL",
      compareModeExplicit: true,
    }).supportSurfaceRole,
  ).toBe("INVESTIGATION");
});

test("full frame mirrors detail entry points, active detail, focus, and support promotion", async () => {
  const frame = buildLowNoiseExperienceFrame(
    baseFrameInput({
      activeDetailSurfaceCode: "EVIDENCE_TIDE",
      compareModeExplicit: true,
      detailEntries: [
        detailCandidate("EVIDENCE_TIDE"),
        detailCandidate("TWIN_PANEL", { anchorableObjectRefs: [objectAnchorRef] }),
      ],
      detailFocusAnchorObjectRef: objectAnchorRef,
      previousFocusAnchorRef: "focus://previous-twin",
    }),
  );

  expect(frame.active_detail_surface_code).toBe("TWIN_PANEL");
  expect(frame.action_strip.active_detail_surface_code).toBe(frame.active_detail_surface_code);
  expect(frame.detail_drawer.expanded_module_code).toBe(frame.active_detail_surface_code);
  expect(frame.attention_policy.detail_entry_points).toEqual(
    frame.detail_drawer.entry_points.map((entry) => entry.module_code),
  );
  expect(frame.focus_anchor_ref).toBe("focus://previous-twin");
  expect(frame.action_strip.focus_anchor_ref).toBe(frame.focus_anchor_ref);
  expect(frame.detail_drawer.focus_anchor_ref).toBe(frame.focus_anchor_ref);
  expect(frame.cross_device_continuity_contract.focus_anchor_ref_or_null).toBe(
    frame.focus_anchor_ref,
  );
  expect(frame.dominance_contract.support_surface_role).toBe("INVESTIGATION");
  expect(frame.dominance_contract.explicit_multifocus_mode).toBe("COMPARE");

  await validateContractSchema("detail_drawer_state", frame.detail_drawer);
  await validateContractSchema("action_strip_state", frame.action_strip);
  await validateContractSchema("low_noise_experience_frame", frame);
});
