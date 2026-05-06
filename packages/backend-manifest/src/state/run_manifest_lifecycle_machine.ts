import type {
  RunManifestLifecycleState,
  RunManifestTransitionEventCode,
} from "../models/run_manifest.ts";

export const RUN_MANIFEST_ALLOWED_TRANSITIONS = {
  ALLOCATED: {
    freeze_success: "FROZEN",
    freeze_blocked: "BLOCKED",
    system_fault: "BLOCKED",
  },
  FROZEN: {
    seal_success: "SEALED",
    seal_blocked: "BLOCKED",
    system_fault: "BLOCKED",
  },
  SEALED: {
    run_started: "IN_PROGRESS",
    system_fault: "BLOCKED",
  },
  IN_PROGRESS: {
    run_completed: "COMPLETED",
    gate_block: "BLOCKED",
    system_fault: "FAILED",
  },
  COMPLETED: {
    superseded_by_new_manifest: "SUPERSEDED",
    replay_designation: "REPLAY_ONLY",
  },
  SUPERSEDED: {
    retention_expiry: "RETIRED",
  },
  REPLAY_ONLY: {
    retention_expiry: "RETIRED",
  },
  BLOCKED: {},
  FAILED: {},
  RETIRED: {},
} as const satisfies Record<
  RunManifestLifecycleState,
  Partial<Record<RunManifestTransitionEventCode, RunManifestLifecycleState>>
>;

type RunManifestLifecycleErrorCode = "RUN_MANIFEST_ILLEGAL_TRANSITION";

export class RunManifestLifecycleError extends Error {
  readonly code: RunManifestLifecycleErrorCode;
  readonly current_state: RunManifestLifecycleState;
  readonly event_code: RunManifestTransitionEventCode;

  constructor(
    currentState: RunManifestLifecycleState,
    eventCode: RunManifestTransitionEventCode,
  ) {
    super(
      `RUN_MANIFEST_ILLEGAL_TRANSITION: ${currentState} cannot handle ${eventCode}`,
    );
    this.name = "RunManifestLifecycleError";
    this.code = "RUN_MANIFEST_ILLEGAL_TRANSITION";
    this.current_state = currentState;
    this.event_code = eventCode;
  }
}

export function getNextRunManifestLifecycleState(
  currentState: RunManifestLifecycleState,
  eventCode: RunManifestTransitionEventCode,
) {
  const nextState = RUN_MANIFEST_ALLOWED_TRANSITIONS[currentState]?.[eventCode];
  if (!nextState) {
    throw new RunManifestLifecycleError(currentState, eventCode);
  }
  return nextState;
}

export function isRunManifestTransitionAllowed(
  currentState: RunManifestLifecycleState,
  eventCode: RunManifestTransitionEventCode,
) {
  return RUN_MANIFEST_ALLOWED_TRANSITIONS[currentState]?.[eventCode] ?? null;
}
