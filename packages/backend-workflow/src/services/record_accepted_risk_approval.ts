import {
  buildAcceptedRiskApproval,
  type AcceptedRiskApproval,
  type AcceptedRiskApprovalInput,
} from "../models/accepted_risk_approval.ts";
import type { AcceptedRiskApprovalRepository } from "../repositories/accepted_risk_approval_repository.ts";
import { buildFailureResolutionContract } from "./build_failure_resolution_contract.ts";

export type RecordAcceptedRiskApprovalInput = Omit<
  AcceptedRiskApprovalInput,
  "failure_resolution_contract"
> & {
  repository: AcceptedRiskApprovalRepository;
};

export async function recordAcceptedRiskApproval(
  input: RecordAcceptedRiskApprovalInput,
): Promise<AcceptedRiskApproval> {
  const approval = buildAcceptedRiskApproval({
    ...input,
    failure_resolution_contract: buildFailureResolutionContract({
      lifecycle_role: "ACCEPTED_RISK_APPROVAL",
    }),
  });
  const stored = await input.repository.persistAcceptedRiskApproval({ approval });
  return stored.record;
}
