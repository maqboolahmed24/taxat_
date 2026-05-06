import { AuthorityModelError, cloneRecord } from "../models/authority_common.ts";
import {
  type AuthorityResponseEnvelope,
  normalizeAuthorityResponseEnvelope,
} from "../models/authority_response_envelope.ts";
import { AuthorityResponseEnvelopeRepository } from "../repositories/authority_response_envelope_repository.ts";

export type AuthorityResponseMeaningResolutionState =
  | "NO_RESPONSE"
  | "PROVISIONAL_TIMEOUT"
  | "RECONCILIATION_REQUIRED"
  | "RECONCILIATION_RESOLVED";

export type AuthorityResponseObservationHistory = {
  active_response_id: string | null;
  meaning_resolution_state: AuthorityResponseMeaningResolutionState;
  request_id: string;
  response_history_ids: string[];
};

export type MergeAuthorityResponseObservationResult = {
  history: AuthorityResponseObservationHistory;
  reconciliation_opened: boolean;
  response: AuthorityResponseEnvelope;
  stored?: Awaited<ReturnType<AuthorityResponseEnvelopeRepository["persistAuthorityResponseEnvelope"]>>;
};

function sameAuthorityMeaning(left: AuthorityResponseEnvelope, right: AuthorityResponseEnvelope) {
  return (
    left.response_class === right.response_class &&
    left.authority_reference === right.authority_reference &&
    left.response_body_hash === right.response_body_hash &&
    left.correlation_status === right.correlation_status
  );
}

function appendHistory(history: AuthorityResponseObservationHistory, responseId: string) {
  return history.response_history_ids.includes(responseId)
    ? [...history.response_history_ids]
    : [...history.response_history_ids, responseId];
}

function defaultHistory(response: AuthorityResponseEnvelope): AuthorityResponseObservationHistory {
  return {
    active_response_id: null,
    meaning_resolution_state: "NO_RESPONSE",
    request_id: response.request_id,
    response_history_ids: [],
  };
}

function responseById(priorResponses: readonly AuthorityResponseEnvelope[], responseId: string | null) {
  return responseId === null ? null : priorResponses.find((response) => response.response_id === responseId) ?? null;
}

function deriveMergedResponse(input: {
  history: AuthorityResponseObservationHistory;
  observation: AuthorityResponseEnvelope;
  prior_responses: readonly AuthorityResponseEnvelope[];
}) {
  const active = responseById(input.prior_responses, input.history.active_response_id);
  if (active === null) {
    return normalizeAuthorityResponseEnvelope(input.observation);
  }
  if (sameAuthorityMeaning(active, input.observation)) {
    return normalizeAuthorityResponseEnvelope({
      ...input.observation,
      conflicting_response_ids: [],
      corroborates_response_ids: [active.response_id],
      derivation_posture: "CORROBORATING_OBSERVATION",
      legal_effect_posture: "NO_STATE_MUTATION",
      supersedes_response_id: null,
    });
  }
  if (active.response_class === "ACK_TIMEOUT_OR_NO_RESOLUTION" && input.observation.response_class !== active.response_class) {
    return normalizeAuthorityResponseEnvelope({
      ...input.observation,
      conflicting_response_ids: [],
      corroborates_response_ids: [],
      derivation_posture: "SUPERSEDES_TIMEOUT_PLACEHOLDER",
      legal_effect_posture: "RECONCILIATION_ONLY",
      response_class: input.observation.response_class,
      retry_class: "RECONCILE_THEN_RETRY",
      supersedes_response_id: active.response_id,
    });
  }
  return normalizeAuthorityResponseEnvelope({
    ...input.observation,
    conflicting_response_ids: [active.response_id],
    corroborates_response_ids: [],
    derivation_posture: "CONFLICTING_OBSERVATION",
    legal_effect_posture: "RECONCILIATION_ONLY",
    response_class: "ACK_INCONSISTENT_STATE",
    retry_class: "HUMAN_REVIEW_THEN_RETRY",
    supersedes_response_id: null,
  });
}

function updateHistory(input: {
  history: AuthorityResponseObservationHistory;
  response: AuthorityResponseEnvelope;
}): AuthorityResponseObservationHistory {
  const responseHistoryIds = appendHistory(input.history, input.response.response_id);
  if (input.history.active_response_id === null) {
    return {
      active_response_id: input.response.response_id,
      meaning_resolution_state: input.response.response_class === "ACK_TIMEOUT_OR_NO_RESOLUTION"
        ? "PROVISIONAL_TIMEOUT"
        : "RECONCILIATION_RESOLVED",
      request_id: input.response.request_id,
      response_history_ids: responseHistoryIds,
    } satisfies AuthorityResponseObservationHistory;
  }
  if (input.response.derivation_posture === "CORROBORATING_OBSERVATION") {
    return {
      ...input.history,
      response_history_ids: responseHistoryIds,
    };
  }
  if (
    input.response.derivation_posture === "SUPERSEDES_TIMEOUT_PLACEHOLDER" ||
    input.response.derivation_posture === "CONFLICTING_OBSERVATION" ||
    input.response.legal_effect_posture === "RECONCILIATION_ONLY"
  ) {
    return {
      ...input.history,
      meaning_resolution_state: "RECONCILIATION_REQUIRED",
      response_history_ids: responseHistoryIds,
    };
  }
  return {
    ...input.history,
    active_response_id: input.response.response_id,
    response_history_ids: responseHistoryIds,
  };
}

export async function mergeAuthorityResponseObservation(input: {
  history?: AuthorityResponseObservationHistory;
  observation: AuthorityResponseEnvelope;
  persist?: boolean;
  prior_responses?: readonly AuthorityResponseEnvelope[];
  repository?: AuthorityResponseEnvelopeRepository;
}): Promise<MergeAuthorityResponseObservationResult> {
  const history = input.history ?? defaultHistory(input.observation);
  if (history.request_id !== input.observation.request_id) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "response observation history must belong to the same request_id as the observation",
    );
  }
  const response = deriveMergedResponse({
    history,
    observation: input.observation,
    prior_responses: input.prior_responses ?? [],
  });
  const nextHistory = updateHistory({ history, response });
  const repository = input.repository;
  const stored = input.persist && repository !== undefined
    ? await repository.persistAuthorityResponseEnvelope({ response })
    : undefined;
  return {
    history: nextHistory,
    reconciliation_opened: nextHistory.meaning_resolution_state === "RECONCILIATION_REQUIRED",
    response,
    stored,
  };
}

export function resolveAuthorityResponseObservationConflict(input: {
  history: AuthorityResponseObservationHistory;
  resolution_basis_ref: string;
  selected_active_response_id: string;
}) {
  if (!input.history.response_history_ids.includes(input.selected_active_response_id)) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "explicit authority response resolution must select a response already present in append-only history",
    );
  }
  return {
    ...cloneRecord(input.history),
    active_response_id: input.selected_active_response_id,
    meaning_resolution_state: "RECONCILIATION_RESOLVED" as const,
    resolution_basis_ref: input.resolution_basis_ref,
  };
}
