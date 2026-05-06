import type { StreamRecoveryContract } from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type { WorkspaceStreamEvent } from "../../../generated-models/src/generated/typescript/client-and-collaboration.ts";
import type { ExperienceStreamEvent } from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import { streamEventSequence, streamEventScopeClass } from "./stream_scope.ts";

export type StreamSequenceEvent = ExperienceStreamEvent | WorkspaceStreamEvent;

export type SequenceWindowState = {
  catch_up_target_sequence: number;
  compaction_floor_sequence_or_null: number | null;
  frame_epoch: number;
  last_applied_sequence: number;
  last_published_sequence: number;
  pending_catch_up: boolean;
  stream_scope_class: StreamRecoveryContract["stream_scope_class"];
};

export type SequenceAdvanceDecisionCode =
  | "APPLY"
  | "ACK_DUPLICATE"
  | "BLOCK_GAP"
  | "HEARTBEAT_ONLY"
  | "REBASE_REQUIRED";

export type SequenceAdvanceDecision = {
  code: SequenceAdvanceDecisionCode;
  phase_ref: "SNAPSHOT" | "CATCH_UP" | "LIVE" | "HEARTBEAT";
  reason_codes: string[];
  summary: string;
};

export type SequenceAdvanceResult = {
  decision: SequenceAdvanceDecision;
  next_state: SequenceWindowState;
  sequence_or_null: number | null;
};

type SequenceWindowErrorInit = {
  code: "SEQUENCE_SCOPE_MISMATCH" | "WINDOW_INVALID";
  detail: string;
};

export class SequenceWindowError extends Error {
  readonly code: SequenceWindowErrorInit["code"];

  constructor(init: SequenceWindowErrorInit) {
    super(`${init.code}: ${init.detail}`);
    this.name = "SequenceWindowError";
    this.code = init.code;
  }
}

function assertCondition(condition: unknown, init: SequenceWindowErrorInit): asserts condition {
  if (!condition) {
    throw new SequenceWindowError(init);
  }
}

export function openSequenceWindow(input: {
  initial_last_applied_sequence: number;
  stream_recovery_contract: StreamRecoveryContract;
}) {
  assertCondition(
    input.initial_last_applied_sequence >= 0,
    {
      code: "WINDOW_INVALID",
      detail: "initial last applied sequence must be non-negative",
    },
  );

  return {
    catch_up_target_sequence: input.stream_recovery_contract.last_published_sequence,
    compaction_floor_sequence_or_null:
      input.stream_recovery_contract.compaction_floor_sequence_or_null,
    frame_epoch: input.stream_recovery_contract.frame_epoch,
    last_applied_sequence: input.initial_last_applied_sequence,
    last_published_sequence: input.stream_recovery_contract.last_published_sequence,
    pending_catch_up:
      input.initial_last_applied_sequence < input.stream_recovery_contract.last_published_sequence,
    stream_scope_class: input.stream_recovery_contract.stream_scope_class,
  } satisfies SequenceWindowState;
}

function phaseForEvent(state: SequenceWindowState, event: StreamSequenceEvent) {
  if (event.event_type === "heartbeat") {
    return "HEARTBEAT";
  }
  if (event.event_type.endsWith(".snapshot")) {
    return "SNAPSHOT";
  }
  return state.pending_catch_up ? "CATCH_UP" : "LIVE";
}

export function advanceSequenceWindow(
  state: SequenceWindowState,
  event: StreamSequenceEvent,
): SequenceAdvanceResult {
  assertCondition(streamEventScopeClass(event) === state.stream_scope_class, {
    code: "SEQUENCE_SCOPE_MISMATCH",
    detail: "stream event scope does not match the active sequence window",
  });

  const phaseRef = phaseForEvent(state, event);
  const currentSequence = streamEventSequence(event);
  const nextStateBase = {
    ...state,
    catch_up_target_sequence: Math.max(
      state.catch_up_target_sequence,
      event.stream_recovery_contract.last_published_sequence,
    ),
    compaction_floor_sequence_or_null: event.stream_recovery_contract.compaction_floor_sequence_or_null,
    last_published_sequence: Math.max(
      state.last_published_sequence,
      event.stream_recovery_contract.last_published_sequence,
    ),
  };

  if (event.frame_epoch !== state.frame_epoch) {
    return {
      decision: {
        code: "REBASE_REQUIRED",
        phase_ref: phaseRef,
        reason_codes: ["FRAME_EPOCH_ADVANCED"],
        summary:
          "The incoming event crossed an epoch seam. Clients must replace local frame state before applying later data.",
      },
      next_state: state,
      sequence_or_null: currentSequence,
    };
  }

  if (event.event_type === "heartbeat") {
    return {
      decision: {
        code: "HEARTBEAT_ONLY",
        phase_ref: "HEARTBEAT",
        reason_codes: ["LIVENESS_ONLY"],
        summary:
          "Heartbeats preserve connection liveness and frontier metadata without advancing business sequence state.",
      },
      next_state: nextStateBase,
      sequence_or_null: currentSequence,
    };
  }

  if (
    nextStateBase.compaction_floor_sequence_or_null !== null &&
    currentSequence < nextStateBase.compaction_floor_sequence_or_null
  ) {
    return {
      decision: {
        code: "REBASE_REQUIRED",
        phase_ref: phaseRef,
        reason_codes: ["HISTORY_COMPACTED"],
        summary:
          "The requested event sequence fell behind the compaction floor, so replay must start from a fresh snapshot.",
      },
      next_state: state,
      sequence_or_null: currentSequence,
    };
  }

  if (currentSequence <= state.last_applied_sequence) {
    return {
      decision: {
        code: "ACK_DUPLICATE",
        phase_ref: phaseRef,
        reason_codes: ["DUPLICATE_SCOPE_EPOCH_SEQUENCE"],
        summary:
          "Duplicate delivery remained idempotent because scope, epoch, and sequence were already applied.",
      },
      next_state: nextStateBase,
      sequence_or_null: currentSequence,
    };
  }

  if (currentSequence !== state.last_applied_sequence + 1) {
    return {
      decision: {
        code: "BLOCK_GAP",
        phase_ref: phaseRef,
        reason_codes: ["SEQUENCE_GAP_DETECTED"],
        summary:
          "Strictly monotonic gap-free delivery rejected the event because one or more earlier sequences are still missing.",
      },
      next_state: state,
      sequence_or_null: currentSequence,
    };
  }

  const appliedState = {
    ...nextStateBase,
    last_applied_sequence: currentSequence,
    pending_catch_up: currentSequence < nextStateBase.catch_up_target_sequence,
  } satisfies SequenceWindowState;

  return {
    decision: {
      code: "APPLY",
      phase_ref: phaseRef,
      reason_codes: [],
      summary:
        phaseRef === "SNAPSHOT"
          ? "Snapshot established the recovery baseline for the current epoch."
          : phaseRef === "CATCH_UP"
            ? "Catch-up remained gap-free and advanced toward the published frontier."
            : "Live delivery advanced immediately after the cursor cleared catch-up.",
    },
    next_state: appliedState,
    sequence_or_null: currentSequence,
  };
}
