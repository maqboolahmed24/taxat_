import {
  buildFailureInvestigation,
  type FailureInvestigation,
  type FailureInvestigationInput,
} from "../models/failure_investigation.ts";
import type { FailureInvestigationRepository } from "../repositories/failure_investigation_repository.ts";
import { buildFailureResolutionContract } from "./build_failure_resolution_contract.ts";

export type OpenFailureInvestigationInput = Omit<
  FailureInvestigationInput,
  "failure_resolution_contract"
> & {
  repository: FailureInvestigationRepository;
};

export async function openFailureInvestigation(
  input: OpenFailureInvestigationInput,
): Promise<FailureInvestigation> {
  const investigation = buildFailureInvestigation({
    ...input,
    failure_resolution_contract: buildFailureResolutionContract({
      lifecycle_role: "FAILURE_INVESTIGATION",
    }),
  });
  const stored = await input.repository.persistFailureInvestigation({ investigation });
  return stored.record;
}
