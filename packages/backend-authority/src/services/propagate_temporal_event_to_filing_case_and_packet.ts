import { buildStateTransitionContract, normalizeTimestamp } from "../models/authority_common.ts";
import { buildFilingCaseRecord, type FilingCaseRecord } from "../models/filing_case.ts";
import { type FilingPacketRecord } from "../models/filing_packet.ts";
import {
  temporalPropagationEventRef,
  type TemporalPropagationEventRecord,
} from "../models/temporal_propagation_event.ts";
import { FilingCaseRepository } from "../repositories/filing_case_repository.ts";
import { FilingPacketRepository } from "../repositories/filing_packet_repository.ts";
import { transitionFilingPacket } from "./transition_filing_packet.ts";

export type PropagateTemporalEventToFilingCaseAndPacketInput = {
  event: TemporalPropagationEventRecord;
  filing_case?: FilingCaseRecord | null;
  filing_case_repository?: FilingCaseRepository;
  filing_packet?: FilingPacketRecord | null;
  filing_packet_repository?: FilingPacketRepository;
  propagated_at: string;
};

function reopenCaseState(current: FilingCaseRecord): FilingCaseRecord["lifecycle_state"] {
  if (["FILED_CONFIRMED", "FILED_UNKNOWN", "REJECTED", "AMENDMENT_ELIGIBLE"].includes(current.lifecycle_state)) {
    return "AMENDMENT_ELIGIBLE";
  }
  if (current.lifecycle_state === "READY_TO_SUBMIT") {
    return "READY_REVIEW";
  }
  return current.lifecycle_state;
}

function packetStateForCase(input: {
  current: FilingCaseRecord;
  invalidated_packet: FilingPacketRecord | null;
}) {
  if (input.invalidated_packet !== null) {
    return input.invalidated_packet.lifecycle_state;
  }
  return input.current.packet_state;
}

export async function propagateTemporalEventToFilingCaseAndPacket(
  input: PropagateTemporalEventToFilingCaseAndPacketInput,
) {
  const propagatedAt = normalizeTimestamp("propagated_at", input.propagated_at);
  const eventRef = temporalPropagationEventRef(input.event);
  const packetRepository = input.filing_packet_repository ?? new FilingPacketRepository();
  const caseRepository = input.filing_case_repository ?? new FilingCaseRepository();

  let invalidatedPacket: FilingPacketRecord | null = null;
  if (
    input.filing_packet &&
    (input.filing_packet.lifecycle_state === "PREPARED" ||
      input.filing_packet.lifecycle_state === "APPROVED_TO_SUBMIT")
  ) {
    const transitioned = await transitionFilingPacket({
      current: input.filing_packet,
      event: "packet_invalidated",
      repository: packetRepository,
      state_changed_at: propagatedAt,
      voided_at: propagatedAt,
    });
    invalidatedPacket = transitioned.packet;
  }

  let reopenedCase: FilingCaseRecord | null = null;
  if (input.filing_case) {
    const current = input.filing_case;
    const temporalRefs = Array.from(
      new Set([...current.temporal_propagation_event_refs, eventRef]),
    );
    const dependencyRefs = Array.from(
      new Set([...current.trust_invalidation_dependency_refs, eventRef]),
    );
    reopenedCase = buildFilingCaseRecord({
      ...current,
      current_submission_ref: ["AMENDMENT_ELIGIBLE", "READY_REVIEW"].includes(reopenCaseState(current))
        ? null
        : current.current_submission_ref,
      current_submission_state: ["AMENDMENT_ELIGIBLE", "READY_REVIEW"].includes(reopenCaseState(current))
        ? null
        : current.current_submission_state,
      last_transition_at: propagatedAt,
      lifecycle_state: reopenCaseState(current),
      packet_state: packetStateForCase({ current, invalidated_packet: invalidatedPacket }),
      state_transition_contract: buildStateTransitionContract({
        current_state: reopenCaseState(current),
        object_family: "FILING_CASE",
        previous_state_or_null: current.lifecycle_state,
        transition_applied_at: propagatedAt,
        transition_event_code: "temporal_propagation_reopened_case",
      }),
      temporal_propagation_event_refs: temporalRefs,
      trust_currency_state:
        input.event.trust_effect === "RECALC_REQUIRED"
          ? "RECALC_REQUIRED"
          : current.trust_currency_state,
      trust_invalidated_at:
        input.event.trust_effect === "RECALC_REQUIRED"
          ? propagatedAt
          : current.trust_invalidated_at,
      trust_invalidation_dependency_refs:
        input.event.trust_effect === "RECALC_REQUIRED"
          ? dependencyRefs
          : current.trust_invalidation_dependency_refs,
      trust_invalidation_reason_codes:
        input.event.trust_effect === "RECALC_REQUIRED"
          ? Array.from(
              new Set([
                ...current.trust_invalidation_reason_codes,
                "TEMPORAL_PROPAGATION_RECALC_REQUIRED",
                input.event.event_class,
              ]),
            )
          : current.trust_invalidation_reason_codes,
    });
    await caseRepository.persistFilingCase({ filing_case: reopenedCase });
  }

  return {
    filing_case: reopenedCase,
    filing_packet: invalidatedPacket,
    filing_reuse_blocked:
      input.event.trust_effect === "RECALC_REQUIRED" ||
      input.event.proof_effect === "STALE_REVALIDATION_REQUIRED",
    temporal_event_ref: eventRef,
  };
}
