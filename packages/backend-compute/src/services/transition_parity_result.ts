import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import type { ParityLifecycleState, ParityResultRecord } from "../models/parity_result.ts";
import { withRefreshedParityResultContract } from "../models/parity_result.ts";

export type ParityTransitionEvent = "parity_complete" | "newer_parity_run";

export type ParityTransitionDecision = {
  from_lifecycle_state: ParityLifecycleState;
  parity_id: string;
  to_lifecycle_state: ParityLifecycleState;
  transition_event: ParityTransitionEvent;
  transition_id: string;
};

export class ParityResultTransitionError extends Error {
  readonly code:
    | "PARITY_TRANSITION_ARTIFACT_MISMATCH"
    | "PARITY_TRANSITION_ILLEGAL_STATE";

  constructor(code: ParityResultTransitionError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ParityResultTransitionError";
    this.code = code;
  }
}

function stableTransitionId(input: {
  event: ParityTransitionEvent;
  from: ParityLifecycleState;
  parity_id: string;
  to: ParityLifecycleState;
}) {
  return `parity-transition.${stableJsonHash(input)}`;
}

export function assertParityTransition(input: {
  event: ParityTransitionEvent;
  from: ParityLifecycleState;
  parity_id: string;
  to: ParityLifecycleState;
}): ParityTransitionDecision {
  if (
    input.event === "parity_complete" &&
    input.from === "NOT_EVALUATED" &&
    input.to === "EVALUATED"
  ) {
    return {
      from_lifecycle_state: input.from,
      parity_id: input.parity_id,
      to_lifecycle_state: input.to,
      transition_event: input.event,
      transition_id: stableTransitionId(input),
    };
  }
  if (
    input.event === "newer_parity_run" &&
    input.from === "EVALUATED" &&
    input.to === "SUPERSEDED"
  ) {
    return {
      from_lifecycle_state: input.from,
      parity_id: input.parity_id,
      to_lifecycle_state: input.to,
      transition_event: input.event,
      transition_id: stableTransitionId(input),
    };
  }
  throw new ParityResultTransitionError(
    "PARITY_TRANSITION_ILLEGAL_STATE",
    `${input.event} cannot transition ${input.from} to ${input.to}`,
  );
}

export function transitionParityResult(input: {
  current: ParityResultRecord;
  event: ParityTransitionEvent;
  next?: ParityResultRecord;
  schema_bundle_hash?: string;
  writer_build_id?: string;
}) {
  if (input.event === "parity_complete") {
    if (!input.next) {
      throw new ParityResultTransitionError(
        "PARITY_TRANSITION_ARTIFACT_MISMATCH",
        "parity_complete requires the evaluated next parity result",
      );
    }
    if (input.current.parity_id !== input.next.parity_id) {
      throw new ParityResultTransitionError(
        "PARITY_TRANSITION_ARTIFACT_MISMATCH",
        "parity_complete must preserve parity_id",
      );
    }
    const transition = assertParityTransition({
      event: "parity_complete",
      from: input.current.lifecycle_state,
      parity_id: input.current.parity_id,
      to: input.next.lifecycle_state,
    });
    const { contract: _nextContract, ...nextParityResult } = input.next;
    return {
      parity_result: withRefreshedParityResultContract({
        parity_result: nextParityResult,
        ...(input.schema_bundle_hash === undefined
          ? {}
          : { schema_bundle_hash: input.schema_bundle_hash }),
        ...(input.writer_build_id === undefined ? {} : { writer_build_id: input.writer_build_id }),
      }),
      transition,
    };
  }
  const transition = assertParityTransition({
    event: "newer_parity_run",
    from: input.current.lifecycle_state,
    parity_id: input.current.parity_id,
    to: "SUPERSEDED",
  });
  const { contract: _contract, ...parityResult } = input.current;
  return {
    parity_result: withRefreshedParityResultContract({
      parity_result: {
        ...parityResult,
        lifecycle_state: "SUPERSEDED",
      },
      ...(input.schema_bundle_hash === undefined
        ? {}
        : { schema_bundle_hash: input.schema_bundle_hash }),
      ...(input.writer_build_id === undefined ? {} : { writer_build_id: input.writer_build_id }),
    }),
    transition,
  };
}
