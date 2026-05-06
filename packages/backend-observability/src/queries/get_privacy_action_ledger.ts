import type { AuditInvestigationFrame } from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";
import {
  eventClientRefs,
  materializeObservabilityFrame,
  normalizeQueryAnchor,
  objectOrContextRefs,
  type ObservabilityQueryBaseInput,
} from "./observability_query_support.ts";

export type GetPrivacyActionLedgerInput = ObservabilityQueryBaseInput & {
  clientId: string;
};

export function getPrivacyActionLedger(
  input: GetPrivacyActionLedgerInput,
): Promise<AuditInvestigationFrame> {
  const clientId = normalizeQueryAnchor("clientId", input.clientId);
  return materializeObservabilityFrame({
    ...input,
    eventPredicate: (entry) =>
      eventClientRefs(entry).includes(clientId) ||
      objectOrContextRefs(entry).includes(clientId),
    queryAnchorRef: clientId,
    queryContractCode: "PRIVACY_ACTION_LEDGER",
  });
}
