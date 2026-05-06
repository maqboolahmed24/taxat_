import {
  buildConfigChangeRequestStateTransitionContract,
  cloneConfigChangeRequestRecord,
  normalizeConfigChangeRequestRecord,
  type ConfigChangeRequestLifecycleState,
  type ConfigChangeRequestRecord,
  type ConfigChangeRequestTransitionEventCode,
} from "../models/config_change_request.ts";

export const CONFIG_CHANGE_REQUEST_ALLOWED_TRANSITIONS = {
  OPEN: {
    assigned: "UNDER_REVIEW",
  },
  UNDER_REVIEW: {
    sent_to_test: "TESTING",
  },
  TESTING: {
    pass: "APPROVED",
    fail: "REJECTED",
  },
  APPROVED: {
    deployed: "IMPLEMENTED",
  },
  REJECTED: {},
  IMPLEMENTED: {
    rollback: "ROLLED_BACK",
  },
  ROLLED_BACK: {},
} as const satisfies Record<
  ConfigChangeRequestLifecycleState,
  Partial<Record<ConfigChangeRequestTransitionEventCode, ConfigChangeRequestLifecycleState>>
>;

type ConfigChangeRequestLifecycleErrorCode = "CONFIG_CHANGE_REQUEST_ILLEGAL_TRANSITION";

export class ConfigChangeRequestLifecycleError extends Error {
  readonly code: ConfigChangeRequestLifecycleErrorCode;
  readonly current_state: ConfigChangeRequestLifecycleState;
  readonly event_code: ConfigChangeRequestTransitionEventCode;

  constructor(
    currentState: ConfigChangeRequestLifecycleState,
    eventCode: ConfigChangeRequestTransitionEventCode,
  ) {
    super(
      `CONFIG_CHANGE_REQUEST_ILLEGAL_TRANSITION: ${currentState} cannot handle ${eventCode}`,
    );
    this.name = "ConfigChangeRequestLifecycleError";
    this.code = "CONFIG_CHANGE_REQUEST_ILLEGAL_TRANSITION";
    this.current_state = currentState;
    this.event_code = eventCode;
  }
}

export function getNextConfigChangeRequestLifecycleState(
  currentState: ConfigChangeRequestLifecycleState,
  eventCode: ConfigChangeRequestTransitionEventCode,
) {
  const nextState = CONFIG_CHANGE_REQUEST_ALLOWED_TRANSITIONS[currentState]?.[eventCode];
  if (!nextState) {
    throw new ConfigChangeRequestLifecycleError(currentState, eventCode);
  }
  return nextState;
}

export function isConfigChangeRequestTransitionAllowed(
  currentState: ConfigChangeRequestLifecycleState,
  eventCode: ConfigChangeRequestTransitionEventCode,
) {
  return CONFIG_CHANGE_REQUEST_ALLOWED_TRANSITIONS[currentState]?.[eventCode] ?? null;
}

export function applyConfigChangeRequestTransition(input: {
  current: ConfigChangeRequestRecord;
  event_code: ConfigChangeRequestTransitionEventCode;
  next: ConfigChangeRequestRecord;
  transition_applied_at: string;
  transition_audit_ref: string;
}) {
  const current = normalizeConfigChangeRequestRecord(input.current);
  const expectedState = getNextConfigChangeRequestLifecycleState(
    current.lifecycle_state,
    input.event_code,
  );
  return normalizeConfigChangeRequestRecord({
    ...cloneConfigChangeRequestRecord(input.next),
    lifecycle_state: expectedState,
    state_changed_at: input.transition_applied_at,
    audit_refs: [...input.next.audit_refs, input.transition_audit_ref],
    state_transition_contract: buildConfigChangeRequestStateTransitionContract({
      current_state: expectedState,
      previous_state_or_null: current.lifecycle_state,
      transition_event_code: input.event_code,
      transition_applied_at: input.transition_applied_at,
      transition_audit_ref: input.transition_audit_ref,
    }),
  });
}
