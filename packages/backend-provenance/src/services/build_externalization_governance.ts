import {
  buildExternalizationGovernanceContractRecord,
  type EnquiryPackExplanationStatus,
  type EnquiryPackMaskingPosture,
  type ExternalizationGovernanceContract,
} from "../models/enquiry_pack.ts";
import type { ProofBundleLimitationNote, ProofBundleRetentionBinding } from "../models/proof_bundle.ts";
import type { EnquiryPackOmissionEntry } from "../models/enquiry_pack.ts";

export type BuildExternalizationGovernanceInput = {
  tenant_id: string;
  target_ref: string;
  human_readable_ref: string;
  machine_readable_ref: string;
  explanation_status: EnquiryPackExplanationStatus;
  masking_posture: EnquiryPackMaskingPosture;
  retention_binding: ProofBundleRetentionBinding;
  limitation_notes?: readonly ProofBundleLimitationNote[];
  omission_entries?: readonly EnquiryPackOmissionEntry[];
};

export function buildExternalizationGovernance(
  input: BuildExternalizationGovernanceInput,
): ExternalizationGovernanceContract {
  const tokens = new Set<string>();
  for (const note of input.limitation_notes ?? []) {
    tokens.add(note.note_class);
  }
  for (const omission of input.omission_entries ?? []) {
    tokens.add(omission.omission_class);
  }
  if (input.explanation_status === "LIMITED" && tokens.size === 0) {
    tokens.add("LIMITED_EXPLANATION");
  }
  if (input.explanation_status === "FAILED" && tokens.size === 0) {
    tokens.add("RENDER_FAILED");
  }
  return buildExternalizationGovernanceContractRecord({
    blocking_context_tokens: [...tokens].sort(),
    explanation_status: input.explanation_status,
    human_readable_ref: input.human_readable_ref,
    limitation_behavior: input.retention_binding.limitation_behavior,
    machine_readable_ref: input.machine_readable_ref,
    masking_posture: input.masking_posture,
    target_ref: input.target_ref,
    tenant_id: input.tenant_id,
  });
}
