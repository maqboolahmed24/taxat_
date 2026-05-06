import type {
  EnquiryPackExplanationStatus,
  EnquiryPackMaskingPosture,
  EnquiryPackOmissionEntry,
} from "../models/enquiry_pack.ts";
import type { ProofBundleLimitationNote, ProofBundleRetentionBinding } from "../models/proof_bundle.ts";

export type BuildMaskingPostureInput = {
  explanation_status: EnquiryPackExplanationStatus;
  retention_binding: ProofBundleRetentionBinding;
  limitation_notes?: readonly ProofBundleLimitationNote[];
  omission_entries?: readonly EnquiryPackOmissionEntry[];
  requested_masking_posture?: EnquiryPackMaskingPosture | null;
};

export function buildMaskingPosture(input: BuildMaskingPostureInput): EnquiryPackMaskingPosture {
  if (input.requested_masking_posture) {
    return input.requested_masking_posture;
  }
  if (input.explanation_status === "FAILED") {
    return "REDACTED";
  }
  if (["LIMITED", "TOMBSTONED", "PSEUDONYMISED"].includes(input.retention_binding.limitation_behavior)) {
    return "LIMITED_EXPORT";
  }
  const classes = new Set([
    ...(input.limitation_notes ?? []).map((note) => note.note_class),
    ...(input.omission_entries ?? []).map((entry) => entry.omission_class),
  ]);
  if (classes.has("RETENTION") || classes.has("PRIVACY")) {
    return "LIMITED_EXPORT";
  }
  if (classes.has("MASKING")) {
    return "MASKED";
  }
  if (input.explanation_status === "LIMITED") {
    return "LIMITED_EXPORT";
  }
  return "NONE";
}
