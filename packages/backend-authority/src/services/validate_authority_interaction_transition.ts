import { AuthorityModelError, normalizeTimestamp, requireString } from "../models/authority_common.ts";
import {
  type AuthorityInteractionLifecycleState,
  type AuthorityInteractionRecord,
} from "../models/authority_interaction_record.ts";

export const AUTHORITY_INTERACTION_TRANSITION_EVENTS = [
  "dispatch_materialized",
  "exclusive_gateway_claim_and_send_begin",
  "duplicate_bucket_changed_before_send",
  "binding_invalidated_before_send",
  "provider_response_captured",
  "timeout_envelope_recorded",
  "reconciliation_begin",
  "response_terminal_without_reconciliation",
  "resolution_reached",
  "exchange_superseded_or_quarantined",
] as const;

export type AuthorityInteractionTransitionEvent =
  (typeof AUTHORITY_INTERACTION_TRANSITION_EVENTS)[number];

const TRANSITIONS: Record<
  AuthorityInteractionLifecycleState,
  Partial<Record<AuthorityInteractionTransitionEvent, AuthorityInteractionLifecycleState>>
> = {
  ABANDONED: {},
  DISPATCH_READY: {
    binding_invalidated_before_send: "ABANDONED",
    duplicate_bucket_changed_before_send: "ABANDONED",
    exclusive_gateway_claim_and_send_begin: "TRANSMIT_IN_FLIGHT",
  },
  RECONCILING: {
    resolution_reached: "RESOLVED",
  },
  REQUEST_REGISTERED: {
    dispatch_materialized: "DISPATCH_READY",
  },
  RESOLVED: {},
  RESPONSE_CAPTURED: {
    reconciliation_begin: "RECONCILING",
    response_terminal_without_reconciliation: "RESOLVED",
  },
  TRANSMIT_IN_FLIGHT: {
    exchange_superseded_or_quarantined: "ABANDONED",
    provider_response_captured: "RESPONSE_CAPTURED",
    timeout_envelope_recorded: "RESPONSE_CAPTURED",
  },
};

export function targetAuthorityInteractionLifecycleStateForEvent(input: {
  current_state: AuthorityInteractionLifecycleState;
  event: AuthorityInteractionTransitionEvent;
}) {
  const target = TRANSITIONS[input.current_state][input.event];
  if (target === undefined) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      `AuthorityInteractionRecord cannot transition from ${input.current_state} on ${input.event}`,
    );
  }
  return target;
}

export function validateAuthorityInteractionTransition(input: {
  current: AuthorityInteractionRecord;
  event: AuthorityInteractionTransitionEvent;
  transition_audit_ref?: string;
  transition_at?: string;
}) {
  const toState = targetAuthorityInteractionLifecycleStateForEvent({
    current_state: input.current.lifecycle_state,
    event: input.event,
  });
  return {
    event: input.event,
    from_state: input.current.lifecycle_state,
    to_state: toState,
    transition_at: normalizeTimestamp(
      "transition_at",
      input.transition_at ?? input.current.last_status_at,
    ),
    transition_audit_ref: requireString(
      "transition_audit_ref",
      input.transition_audit_ref ??
        `audit://authority-interaction/${input.current.interaction_id}/${input.event}`,
    ),
  };
}

export function isAuthorityInteractionTransitionAllowed(input: {
  current_state: AuthorityInteractionLifecycleState;
  next_state: AuthorityInteractionLifecycleState;
}) {
  if (input.current_state === input.next_state) {
    return true;
  }
  return Object.values(TRANSITIONS[input.current_state]).includes(input.next_state);
}
