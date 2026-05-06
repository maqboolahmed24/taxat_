import type { AuditInvestigationFrame } from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";
import {
  eventManifestRefs,
  materializeObservabilityFrame,
  normalizeQueryAnchor,
  type ObservabilityQueryBaseInput,
} from "./observability_query_support.ts";

export type GetRunTimelineInput = ObservabilityQueryBaseInput & {
  manifestId: string;
};

export function getRunTimeline(
  input: GetRunTimelineInput,
): Promise<AuditInvestigationFrame> {
  const manifestId = normalizeQueryAnchor("manifestId", input.manifestId);
  return materializeObservabilityFrame({
    ...input,
    eventPredicate: (entry) => eventManifestRefs(entry).includes(manifestId),
    queryAnchorRef: manifestId,
    queryContractCode: "RUN_TIMELINE",
  });
}
