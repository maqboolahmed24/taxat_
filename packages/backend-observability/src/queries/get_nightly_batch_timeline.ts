import type { AuditInvestigationFrame } from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";
import {
  materializeObservabilityFrame,
  normalizeQueryAnchor,
  objectOrContextRefs,
  type ObservabilityQueryBaseInput,
} from "./observability_query_support.ts";

export type GetNightlyBatchTimelineInput = ObservabilityQueryBaseInput & {
  batchRunId: string;
};

export function getNightlyBatchTimeline(
  input: GetNightlyBatchTimelineInput,
): Promise<AuditInvestigationFrame> {
  const batchRunId = normalizeQueryAnchor("batchRunId", input.batchRunId);
  return materializeObservabilityFrame({
    ...input,
    eventPredicate: (entry) =>
      entry.event.correlation_context.nightly_batch_run_ref === batchRunId ||
      objectOrContextRefs(entry).includes(batchRunId),
    queryAnchorRef: batchRunId,
    queryContractCode: "NIGHTLY_BATCH_TIMELINE",
  });
}
