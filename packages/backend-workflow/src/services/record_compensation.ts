import {
  buildCompensationRecord,
  type CompensationRecord,
  type CompensationRecordInput,
} from "../models/compensation_record.ts";
import type { CompensationRecordRepository } from "../repositories/compensation_record_repository.ts";
import { buildFailureResolutionContract } from "./build_failure_resolution_contract.ts";

export type RecordCompensationInput = Omit<
  CompensationRecordInput,
  "failure_resolution_contract"
> & {
  repository: CompensationRecordRepository;
};

export async function recordCompensation(
  input: RecordCompensationInput,
): Promise<CompensationRecord> {
  const record = buildCompensationRecord({
    ...input,
    failure_resolution_contract: buildFailureResolutionContract({
      lifecycle_role: "COMPENSATION_RECORD",
    }),
  });
  const stored = await input.repository.persistCompensationRecord({ record });
  return stored.record;
}
