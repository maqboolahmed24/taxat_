import { AuthorityModelError } from "../models/authority_common.ts";
import {
  temporalPropagationEventRef,
  type TemporalPropagationEventRecord,
} from "../models/temporal_propagation_event.ts";

export type ReplayBasisTemporalSourceClass =
  | "HISTORICAL_POST_SEAL_REUSED"
  | "DECLARED_COUNTERFACTUAL_SUBSTITUTION"
  | "NOT_MATERIAL"
  | "MISSING_HISTORICAL_BASIS"
  | "CORRUPT_HISTORICAL_BASIS";

export type TemporalReplayBasisIntegrityInput = {
  available_temporal_events?: readonly TemporalPropagationEventRecord[];
  missing_policy?: "FAIL_CLOSED" | "DOWNGRADE";
  replay_basis_integrity_contract: {
    replay_class: "STANDARD_REPLAY" | "AUDIT_REPLAY" | "COUNTERFACTUAL_ANALYSIS";
    temporal_propagation_event_source_class: ReplayBasisTemporalSourceClass;
  };
  required_temporal_event_refs?: readonly string[];
};

export function enforceTemporalReplayBasisIntegrity(input: TemporalReplayBasisIntegrityInput) {
  const requiredRefs = Array.from(new Set(input.required_temporal_event_refs ?? []));
  const availableRefs = new Set(
    (input.available_temporal_events ?? []).map((event) => temporalPropagationEventRef(event)),
  );
  const missingRefs = requiredRefs.filter((ref) => !availableRefs.has(ref));
  const sourceClass = input.replay_basis_integrity_contract.temporal_propagation_event_source_class;

  if (requiredRefs.length === 0) {
    return {
      missing_temporal_event_refs: [],
      replay_temporal_posture: "NOT_MATERIAL" as const,
      required_temporal_event_refs: [],
    };
  }
  if (sourceClass !== "HISTORICAL_POST_SEAL_REUSED") {
    const message =
      "exact replay with temporal propagation events must reuse historical post-seal event lineage";
    if (input.missing_policy === "DOWNGRADE") {
      return {
        missing_temporal_event_refs: requiredRefs,
        replay_temporal_posture: "DOWNGRADED_COUNTERFACTUAL" as const,
        required_temporal_event_refs: requiredRefs,
        reason_codes: ["TEMPORAL_EVENT_HISTORY_NOT_REUSED"],
      };
    }
    throw new AuthorityModelError("AUTHORITY_CONTRACT_INVALID", message);
  }
  if (missingRefs.length > 0) {
    if (input.missing_policy === "DOWNGRADE") {
      return {
        missing_temporal_event_refs: missingRefs,
        replay_temporal_posture: "DOWNGRADED_COUNTERFACTUAL" as const,
        required_temporal_event_refs: requiredRefs,
        reason_codes: ["MISSING_HISTORICAL_TEMPORAL_EVENT"],
      };
    }
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      `historical temporal event lineage missing for replay: ${missingRefs.join(", ")}`,
    );
  }
  return {
    missing_temporal_event_refs: [],
    replay_temporal_posture: "HISTORICAL_EVENT_REUSED" as const,
    required_temporal_event_refs: requiredRefs,
  };
}
