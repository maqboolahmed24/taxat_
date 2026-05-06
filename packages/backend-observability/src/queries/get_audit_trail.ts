import type { AuditInvestigationFrame } from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";
import {
  materializeObservabilityFrame,
  normalizeQueryAnchor,
  objectOrContextRefs,
  type ObservabilityQueryBaseInput,
} from "./observability_query_support.ts";

export type GetAuditTrailInput = ObservabilityQueryBaseInput & {
  rootRef: string;
};

export function getAuditTrail(
  input: GetAuditTrailInput,
): Promise<AuditInvestigationFrame> {
  const rootRef = normalizeQueryAnchor("rootRef", input.rootRef);
  return materializeObservabilityFrame({
    ...input,
    eventPredicate: (entry) => objectOrContextRefs(entry).includes(rootRef),
    queryAnchorRef: rootRef,
    queryContractCode: "AUDIT_TRAIL",
  });
}
