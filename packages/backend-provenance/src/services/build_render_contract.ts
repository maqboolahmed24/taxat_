import type {
  EnquiryPackExplanationStatus,
  EnquiryPackRenderContract,
} from "../models/enquiry_pack.ts";

export type BuildRenderContractInput = {
  enquiry_pack_id: string;
  explanation_status: EnquiryPackExplanationStatus;
  render_contract?: EnquiryPackRenderContract | null;
};

export function buildRenderContract(input: BuildRenderContractInput): EnquiryPackRenderContract {
  if (input.render_contract) {
    return input.render_contract;
  }
  if (input.explanation_status === "FAILED") {
    return {
      filing_artifact_ref: null,
      operator_render_ref: null,
      reviewer_render_ref: null,
    };
  }
  if (input.explanation_status === "LIMITED") {
    return {
      filing_artifact_ref: null,
      operator_render_ref: `render://enquiry-pack/${input.enquiry_pack_id}/operator`,
      reviewer_render_ref: null,
    };
  }
  return {
    filing_artifact_ref: `render://enquiry-pack/${input.enquiry_pack_id}/filing-artifact`,
    operator_render_ref: `render://enquiry-pack/${input.enquiry_pack_id}/operator`,
    reviewer_render_ref: `render://enquiry-pack/${input.enquiry_pack_id}/reviewer`,
  };
}
