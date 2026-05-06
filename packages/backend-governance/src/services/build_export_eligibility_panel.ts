import type {
  AuditInvestigationFrameExportEligibilityPanel,
  AuditInvestigationFrameExportPosture,
} from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";

function uniqueReasonCodes(values: readonly string[]) {
  return [
    ...new Set(
      values
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  ];
}

export function normalizeAuditExportPosture(
  posture: AuditInvestigationFrameExportPosture | undefined,
): AuditInvestigationFrameExportPosture {
  const state = posture?.state ?? "FULL_ALLOWED";
  const reason_codes = uniqueReasonCodes(posture?.reason_codes ?? []);
  if (state === "FULL_ALLOWED") {
    return {
      reason_codes: [],
      state,
    };
  }
  if (reason_codes.length > 0) {
    return {
      reason_codes,
      state,
    };
  }
  return {
    reason_codes: [
      {
        APPROVAL_REQUIRED: "EXPORT_APPROVAL_REQUIRED",
        DENIED: "EXPORT_DENIED",
        MASKED_ONLY: "EXPORT_MASKING_POLICY",
      }[state],
    ],
    state,
  };
}

export function buildExportEligibilityPanel(input: {
  activeSliceScopeRef: string;
  frameId: string;
  exportPosture?: AuditInvestigationFrameExportPosture | undefined;
}): {
  export_eligibility_panel: AuditInvestigationFrameExportEligibilityPanel;
  export_posture: AuditInvestigationFrameExportPosture;
} {
  const export_posture = normalizeAuditExportPosture(input.exportPosture);
  switch (export_posture.state) {
    case "FULL_ALLOWED":
      return {
        export_eligibility_panel: {
          active_slice_scope_ref: input.activeSliceScopeRef,
          approval_requirement_ref_or_null: null,
          invocation_posture: "ACTIVE_FILTERED_SLICE",
          masked_preview_ref_or_null: null,
          panel_mode: "FULL_EXPORT_READY",
          reason_codes: [],
          state: "FULL_ALLOWED",
        },
        export_posture,
      };
    case "MASKED_ONLY":
      return {
        export_eligibility_panel: {
          active_slice_scope_ref: input.activeSliceScopeRef,
          approval_requirement_ref_or_null: null,
          invocation_posture: "ACTIVE_FILTERED_SLICE",
          masked_preview_ref_or_null: `audit-preview://${input.frameId}/masked`,
          panel_mode: "MASKED_EXPORT_ONLY",
          reason_codes: [...export_posture.reason_codes],
          state: "MASKED_ONLY",
        },
        export_posture,
      };
    case "APPROVAL_REQUIRED":
      return {
        export_eligibility_panel: {
          active_slice_scope_ref: input.activeSliceScopeRef,
          approval_requirement_ref_or_null: `approval://audit-export/${input.frameId}`,
          invocation_posture: "ACTIVE_FILTERED_SLICE",
          masked_preview_ref_or_null: null,
          panel_mode: "APPROVAL_GATE",
          reason_codes: [...export_posture.reason_codes],
          state: "APPROVAL_REQUIRED",
        },
        export_posture,
      };
    case "DENIED":
      return {
        export_eligibility_panel: {
          active_slice_scope_ref: input.activeSliceScopeRef,
          approval_requirement_ref_or_null: null,
          invocation_posture: "ACTIVE_FILTERED_SLICE",
          masked_preview_ref_or_null: null,
          panel_mode: "DENIED_NOTICE",
          reason_codes: [...export_posture.reason_codes],
          state: "DENIED",
        },
        export_posture,
      };
  }
}
