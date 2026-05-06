import {
  normalizeCompensationRecord,
  type CompensationRecord,
  withCompensationRecordLineage,
} from "../models/compensation_record.ts";
import { WorkflowModelError } from "../models/workflow_item.ts";
import type { CompensationRecordRepository } from "../repositories/compensation_record_repository.ts";

export type VerifyCompensationInput = {
  action: "VERIFY";
  audit_refs: readonly string[];
  compensated_at?: string | undefined;
  compensation_id: string;
  closure_evidence_refs?: readonly string[] | undefined;
  provenance_refs?: readonly string[] | undefined;
  repository: CompensationRecordRepository;
  resolution_basis_ref?: string | undefined;
  verification_ref: string;
};

export type SupersedeCompensationInput = {
  action: "SUPERSEDE";
  audit_refs: readonly string[];
  compensation_id: string;
  closure_evidence_refs: readonly string[];
  provenance_refs?: readonly string[] | undefined;
  repository: CompensationRecordRepository;
  resolution_basis_ref: string;
  superseded_by_compensation_id: string;
};

export async function verifyOrSupersedeCompensation(
  input: VerifyCompensationInput | SupersedeCompensationInput,
): Promise<CompensationRecord> {
  const stored = await input.repository.getCompensationRecordById(input.compensation_id);
  if (stored === null) {
    throw new WorkflowModelError("WORKFLOW_FIELD_INVALID", "compensation record was not found");
  }
  const current = normalizeCompensationRecord(stored.record);

  if (input.action === "VERIFY") {
    if (current.compensation_status !== "APPLIED") {
      throw new WorkflowModelError(
        "WORKFLOW_STATE_TRANSITION_INVALID",
        "only applied compensation can be verified",
      );
    }
    const verified = withCompensationRecordLineage({
      audit_refs: input.audit_refs,
      provenance_refs: input.provenance_refs,
      record: {
        ...current,
        closure_evidence_refs: input.closure_evidence_refs
          ? [...input.closure_evidence_refs]
          : current.closure_evidence_refs,
        compensated_at: current.compensated_at ?? input.compensated_at ?? null,
        compensation_status: "VERIFIED",
        resolution_basis_ref: input.resolution_basis_ref ?? current.resolution_basis_ref,
        superseded_by_compensation_id: null,
        verification_ref: input.verification_ref,
      },
    });
    const persisted = await input.repository.persistCompensationRecord({ record: verified });
    return persisted.record;
  }

  const superseded = withCompensationRecordLineage({
    audit_refs: input.audit_refs,
    provenance_refs: input.provenance_refs,
    record: {
      ...current,
      closure_evidence_refs: [...input.closure_evidence_refs],
      compensation_status: "SUPERSEDED",
      resolution_basis_ref: input.resolution_basis_ref,
      superseded_by_compensation_id: input.superseded_by_compensation_id,
      verification_ref: null,
    },
  });
  const persisted = await input.repository.persistCompensationRecord({ record: superseded });
  return persisted.record;
}
