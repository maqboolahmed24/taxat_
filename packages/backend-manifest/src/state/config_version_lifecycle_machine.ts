import {
  buildConfigVersionStateTransitionContract,
  cloneConfigVersionRecord,
  normalizeConfigVersionRecord,
  type ConfigVersionLifecycleState,
  type ConfigVersionRecord,
  type ConfigVersionTransitionEventCode,
} from "../models/config_version.ts";

export const CONFIG_VERSION_ALLOWED_TRANSITIONS = {
  DRAFT: {
    submit_for_test: "CANDIDATE",
  },
  CANDIDATE: {
    verification_pass: "VERIFIED",
  },
  VERIFIED: {
    approval_granted: "APPROVED",
  },
  APPROVED: {
    replacement_approved: "DEPRECATED",
    urgent_withdrawal: "REVOKED",
  },
  DEPRECATED: {
    retired: "RETIRED",
  },
  REVOKED: {
    retired: "RETIRED",
  },
  RETIRED: {},
} as const satisfies Record<
  ConfigVersionLifecycleState,
  Partial<Record<ConfigVersionTransitionEventCode, ConfigVersionLifecycleState>>
>;

type ConfigVersionLifecycleErrorCode = "CONFIG_VERSION_ILLEGAL_TRANSITION";

export class ConfigVersionLifecycleError extends Error {
  readonly code: ConfigVersionLifecycleErrorCode;
  readonly current_state: ConfigVersionLifecycleState;
  readonly event_code: ConfigVersionTransitionEventCode;

  constructor(
    currentState: ConfigVersionLifecycleState,
    eventCode: ConfigVersionTransitionEventCode,
  ) {
    super(`CONFIG_VERSION_ILLEGAL_TRANSITION: ${currentState} cannot handle ${eventCode}`);
    this.name = "ConfigVersionLifecycleError";
    this.code = "CONFIG_VERSION_ILLEGAL_TRANSITION";
    this.current_state = currentState;
    this.event_code = eventCode;
  }
}

export function getNextConfigVersionLifecycleState(
  currentState: ConfigVersionLifecycleState,
  eventCode: ConfigVersionTransitionEventCode,
) {
  const nextState = CONFIG_VERSION_ALLOWED_TRANSITIONS[currentState]?.[eventCode];
  if (!nextState) {
    throw new ConfigVersionLifecycleError(currentState, eventCode);
  }
  return nextState;
}

export function isConfigVersionTransitionAllowed(
  currentState: ConfigVersionLifecycleState,
  eventCode: ConfigVersionTransitionEventCode,
) {
  return CONFIG_VERSION_ALLOWED_TRANSITIONS[currentState]?.[eventCode] ?? null;
}

export function applyConfigVersionTransition(input: {
  current: ConfigVersionRecord;
  event_code: ConfigVersionTransitionEventCode;
  next: ConfigVersionRecord;
  transition_applied_at: string;
  transition_audit_ref: string;
}) {
  const current = normalizeConfigVersionRecord(input.current);
  const expectedState = getNextConfigVersionLifecycleState(
    current.lifecycle_state,
    input.event_code,
  );
  const next = normalizeConfigVersionRecord({
    ...cloneConfigVersionRecord(input.next),
    lifecycle_state: expectedState,
    state_changed_at: input.transition_applied_at,
    audit_refs: [...input.next.audit_refs, input.transition_audit_ref],
    state_transition_contract: buildConfigVersionStateTransitionContract({
      current_state: expectedState,
      previous_state_or_null: current.lifecycle_state,
      transition_event_code: input.event_code,
      transition_applied_at: input.transition_applied_at,
      transition_audit_ref: input.transition_audit_ref,
    }),
  });
  return next;
}
