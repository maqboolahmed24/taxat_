import type { AuditInvestigationFrame } from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";
import {
  materializeObservabilityFrame,
  normalizeQueryAnchor,
  objectOrContextRefs,
  type ObservabilityQueryBaseInput,
} from "./observability_query_support.ts";

export type GetFilingEvidenceLedgerInput = ObservabilityQueryBaseInput & {
  submissionRecordId: string;
};

export function getFilingEvidenceLedger(
  input: GetFilingEvidenceLedgerInput,
): Promise<AuditInvestigationFrame> {
  const submissionRecordId = normalizeQueryAnchor(
    "submissionRecordId",
    input.submissionRecordId,
  );
  return materializeObservabilityFrame({
    ...input,
    eventPredicate: (entry) =>
      entry.event.correlation_context.submission_record_id === submissionRecordId ||
      objectOrContextRefs(entry).includes(submissionRecordId),
    queryAnchorRef: submissionRecordId,
    queryContractCode: "FILING_EVIDENCE_LEDGER",
  });
}
