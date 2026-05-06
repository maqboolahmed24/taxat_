import {
  assertEnquiryPackValid,
  type EnquiryPackRecord,
} from "../../../backend-provenance/src/index.ts";

export class EnquiryExternalizationGovernanceError extends Error {
  readonly reasonCodes: string[];

  constructor(reasonCodes: readonly string[], detail: string) {
    super(detail);
    this.name = "EnquiryExternalizationGovernanceError";
    this.reasonCodes = [...reasonCodes];
  }
}

function assertNonEmptyArray(fieldName: string, values: readonly string[]) {
  if (values.length === 0 || values.some((value) => value.trim().length === 0)) {
    throw new EnquiryExternalizationGovernanceError(
      ["ENQUIRY_PACK_EMPTY_REF"],
      `${fieldName} must retain non-empty refs`,
    );
  }
}

export function validateEnquiryExternalizationGovernance(
  pack: EnquiryPackRecord,
): EnquiryPackRecord {
  const normalized = assertEnquiryPackValid({ pack });
  assertNonEmptyArray("critical_path_refs", normalized.critical_path_refs);
  assertNonEmptyArray("audit_refs", normalized.audit_refs);
  if (!normalized.critical_path_refs.includes(normalized.primary_path_ref)) {
    throw new EnquiryExternalizationGovernanceError(
      ["ENQUIRY_PRIMARY_PATH_NOT_CRITICAL"],
      "EnquiryPack.primary_path_ref must appear in critical_path_refs",
    );
  }
  if (
    normalized.explanation_status === "AVAILABLE" &&
    (normalized.retention_binding.limitation_behavior !== "FULL" ||
      normalized.masking_posture !== "NONE" ||
      normalized.omission_entries.length > 0)
  ) {
    throw new EnquiryExternalizationGovernanceError(
      ["ENQUIRY_AVAILABLE_WITH_LIMITED_POSTURE"],
      "AVAILABLE enquiry packs cannot carry material masking, omission, or retention limitation posture",
    );
  }
  if (
    normalized.explanation_status !== "AVAILABLE" &&
    normalized.limitation_notes.length === 0
  ) {
    throw new EnquiryExternalizationGovernanceError(
      ["ENQUIRY_LIMITED_WITHOUT_LIMITATION_NOTE"],
      "limited or failed enquiry packs must retain limitation notes",
    );
  }
  if (normalized.masking_posture !== "NONE" && normalized.omission_entries.length === 0) {
    throw new EnquiryExternalizationGovernanceError(
      ["ENQUIRY_MASKING_WITHOUT_OMISSION"],
      "masked enquiry packs must retain explicit omission entries",
    );
  }
  const contract = normalized.externalization_governance_contract;
  if (
    contract.contract_version !== "EXTERNALIZATION_GOVERNANCE_V1" ||
    contract.boundary_scope !== "ENQUIRY_PACK" ||
    contract.delivery_surface_kind !== "EXPLANATION_EXPORT" ||
    contract.history_meaning_state !== "LIMITED_EXPLANATION_EXPLICIT"
  ) {
    throw new EnquiryExternalizationGovernanceError(
      ["ENQUIRY_EXTERNALIZATION_CONTRACT_INVALID"],
      "enquiry pack externalization contract drifted from ENQUIRY_PACK explanation export posture",
    );
  }
  const expectedEligibility = {
    AVAILABLE: "READY",
    FAILED: "BLOCKED",
    LIMITED: "LIMITED_READY",
  }[normalized.explanation_status];
  if (contract.eligibility_state !== expectedEligibility) {
    throw new EnquiryExternalizationGovernanceError(
      ["ENQUIRY_EXTERNALIZATION_ELIGIBILITY_DRIFT"],
      "enquiry pack externalization eligibility must mirror explanation_status",
    );
  }
  return normalized;
}
