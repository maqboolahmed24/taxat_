import {
  buildWorkflowAuthorityTruthContract,
  buildWorkflowTruthBoundaryContract,
  normalizeWorkflowAuthorityTruthContract,
  normalizeWorkflowTruthBoundaryContract,
  type WorkflowAuthorityTruthContract,
  type WorkflowTruthBoundaryContract,
} from "../models/workflow_item.ts";

export type WorkflowTruthBoundaryPacket = {
  authority_truth_contract: WorkflowAuthorityTruthContract;
  truth_boundary_contract: WorkflowTruthBoundaryContract;
};

export function buildWorkflowTruthBoundaryContractPacket(
  input: Partial<WorkflowTruthBoundaryPacket> = {},
): WorkflowTruthBoundaryPacket {
  return {
    authority_truth_contract: normalizeWorkflowAuthorityTruthContract(
      input.authority_truth_contract ?? buildWorkflowAuthorityTruthContract(),
    ),
    truth_boundary_contract: normalizeWorkflowTruthBoundaryContract(
      input.truth_boundary_contract ?? buildWorkflowTruthBoundaryContract(),
    ),
  };
}
