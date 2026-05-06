import type { AuthorityCalculationReadinessContextRecord } from "../models/authority_calculation_readiness_context.ts";
import type { AuthorityCalculationRequestRecord } from "../models/authority_calculation_request.ts";
import type { AuthorityCalculationResultRecord } from "../models/authority_calculation_result.ts";
import type { CalculationBasisRecord } from "../models/calculation_basis.ts";
import type { CalculationUserConfirmationRecord } from "../models/calculation_user_confirmation.ts";

export type CalculationApprovalSurfaceOrder =
  | "APPROVAL_SUMMARY"
  | "CHANGE_DIGEST"
  | "DECLARATION_PANEL"
  | "SIGN_OFF_PANEL";

export type CalculationConfirmationViewModel = {
  acknowledgement_required: boolean;
  approval_submit_enabled: boolean;
  calculation_freshness_label: string;
  calculation_identity: {
    calculation_id: string;
    confirmation_state: string;
    live_or_modeled: "LIVE" | "MODELED";
    period_label: string;
    stale_protection_state: "CURRENT" | "STALE" | "SUPERSEDED" | "MODELED_BLOCKED";
    tax_year_label: string;
  };
  declaration_actions: {
    download_ref: string | null;
    print_ref: string | null;
    preview_ref: string | null;
  };
  declaration_text: string;
  material_change_summary: string;
  notices: {
    critical: string[];
    info: string[];
    warning: string[];
  };
  route_order: CalculationApprovalSurfaceOrder[];
  same_shell_state: "REVIEW" | "STEP_UP_REQUIRED" | "PENDING_SIGNATURE" | "FINAL_RECEIPT";
};

export type ProjectCalculationConfirmationViewModelInput = {
  acknowledgement_checked?: boolean;
  approval_context_hash_current?: boolean;
  basis?: CalculationBasisRecord | null;
  confirmation?: CalculationUserConfirmationRecord | null;
  declaration_pack_current?: boolean;
  declaration_text?: string;
  download_ref?: string | null;
  material_change_summary?: string;
  period_label: string;
  preview_ref?: string | null;
  print_ref?: string | null;
  readiness_context: AuthorityCalculationReadinessContextRecord;
  request: AuthorityCalculationRequestRecord;
  result: AuthorityCalculationResultRecord;
  same_shell_state?: CalculationConfirmationViewModel["same_shell_state"];
  step_up_required?: boolean;
  superseded_calculation?: boolean;
  tax_year_label: string;
};

export function projectCalculationConfirmationViewModel(
  input: ProjectCalculationConfirmationViewModelInput,
): CalculationConfirmationViewModel {
  const declarationPackCurrent = input.declaration_pack_current ?? true;
  const approvalContextCurrent = input.approval_context_hash_current ?? true;
  const superseded = input.superseded_calculation ?? false;
  const modeled = !input.request.live_authority_call_executed || input.result.result_state === "MODELED";
  const stale = !declarationPackCurrent || !approvalContextCurrent || superseded;
  const confirmationState =
    input.confirmation?.confirmation_state ?? input.readiness_context.confirmation_state ?? "PENDING";
  const legalReadiness =
    ["PASS", "PASS_WITH_NOTICE"].includes(input.readiness_context.validation_outcome) &&
    input.basis?.basis_status === "CONFIRMED" &&
    confirmationState === "CONFIRMED" &&
    !modeled &&
    !stale;
  const acknowledgementChecked = input.acknowledgement_checked ?? false;
  const stepUpRequired = input.step_up_required ?? false;
  const warning: string[] = [];
  const critical: string[] = [];
  const info: string[] = [];

  if (modeled) {
    warning.push("This calculation is modeled only and cannot be used for final sign-off.");
  }
  if (stale) {
    critical.push("The calculation or declaration pack has changed. Sign-off is locked until it is refreshed.");
  }
  if (stepUpRequired) {
    info.push("Additional authentication is required before final sign-off.");
  }
  if (input.readiness_context.validation_outcome === "PASS_WITH_NOTICE") {
    warning.push("HMRC returned notices that must remain visible with this declaration.");
  }

  return {
    acknowledgement_required: true,
    approval_submit_enabled: legalReadiness && acknowledgementChecked && !stepUpRequired,
    calculation_freshness_label: modeled ? "Modeled" : stale ? "Refresh required" : "Current",
    calculation_identity: {
      calculation_id: input.result.calculation_id,
      confirmation_state: confirmationState,
      live_or_modeled: modeled ? "MODELED" : "LIVE",
      period_label: input.period_label,
      stale_protection_state: modeled
        ? "MODELED_BLOCKED"
        : stale
          ? superseded
            ? "SUPERSEDED"
            : "STALE"
          : "CURRENT",
      tax_year_label: input.tax_year_label,
    },
    declaration_actions: {
      download_ref: stale ? null : input.download_ref ?? "declaration-download://current",
      preview_ref: stale ? null : input.preview_ref ?? "declaration-preview://current",
      print_ref: stale ? null : input.print_ref ?? "declaration-print://current",
    },
    declaration_text:
      input.declaration_text ??
      "I declare that the information and tax return I have submitted are correct and complete to the best of my knowledge.",
    material_change_summary: input.material_change_summary ?? "No material changes since the current calculation.",
    notices: {
      critical,
      info,
      warning,
    },
    route_order: [
      "APPROVAL_SUMMARY",
      "CHANGE_DIGEST",
      "DECLARATION_PANEL",
      "SIGN_OFF_PANEL",
    ],
    same_shell_state: input.same_shell_state ?? (stepUpRequired ? "STEP_UP_REQUIRED" : "REVIEW"),
  };
}
