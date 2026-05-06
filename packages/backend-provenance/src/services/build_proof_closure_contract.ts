import { buildProofClosureContract, type ProofClosureContract } from "../models/evidence_graph.ts";
import {
  type ProofBundleClosureState,
  type ProofBundleSupportState,
} from "../models/proof_bundle.ts";

export const PROOF_CLOSURE_PROFILE = "PROOF_CLOSURE_V1";
export const PROOF_PATH_SELECTION_PROFILE = "PROOF_PATH_SELECTION_V1";

export type DefensibleProofClosureInput = {
  support_closed: boolean;
  authority_closed: boolean;
  contradiction_isolated: boolean;
  replay_closed: boolean;
  current_decisive_anchor_present: boolean;
  staleness_invalidated?: boolean;
  silent_limitation_ambiguity_present?: boolean;
  support_state?: ProofBundleSupportState;
  failure_reason_codes?: readonly string[];
};

export type DefensibleProofClosureResult = {
  proof_closure_contract: ProofClosureContract;
  closure_state: ProofBundleClosureState;
  proof_closed: boolean;
};

export function buildDefensibleProofClosureContract(
  input: DefensibleProofClosureInput,
): DefensibleProofClosureResult {
  const failures = new Set(input.failure_reason_codes ?? []);
  const silentLimitation = Boolean(input.silent_limitation_ambiguity_present);
  const stalenessInvalidated = Boolean(input.staleness_invalidated);
  const proofClosed =
    input.support_closed &&
    input.authority_closed &&
    input.contradiction_isolated &&
    input.replay_closed &&
    !silentLimitation &&
    input.current_decisive_anchor_present &&
    !stalenessInvalidated;

  if (!input.support_closed) failures.add("SUPPORT_OPEN");
  if (!input.authority_closed) failures.add("AUTHORITY_OPEN");
  if (!input.contradiction_isolated) failures.add("CONTRADICTION_NOT_ISOLATED");
  if (!input.replay_closed) failures.add("REPLAY_NOT_CLOSED");
  if (silentLimitation) failures.add("SILENT_LIMITATION_AMBIGUITY");
  if (!input.current_decisive_anchor_present) failures.add("CURRENT_DECISIVE_ANCHOR_MISSING");
  if (stalenessInvalidated) failures.add("STALENESS_INVALIDATED");

  const persistedSilentLimitation = false;
  const persistedSupportClosed = silentLimitation ? false : input.support_closed;
  const persistedFailures = new Set(failures);
  if (silentLimitation) {
    persistedFailures.add("SUPPORT_OPEN");
  }

  return {
    closure_state: proofClosed ? "CLOSED" : "OPEN",
    proof_closed: proofClosed,
    proof_closure_contract: buildProofClosureContract({
      authority_closed: input.authority_closed,
      closure_failure_reason_codes: proofClosed ? [] : [...persistedFailures],
      contradiction_isolated: input.contradiction_isolated,
      current_decisive_anchor_present: input.current_decisive_anchor_present,
      replay_closed: input.replay_closed,
      silent_limitation_ambiguity_present: persistedSilentLimitation,
      staleness_invalidated: stalenessInvalidated,
      support_closed: persistedSupportClosed,
    }),
  };
}
