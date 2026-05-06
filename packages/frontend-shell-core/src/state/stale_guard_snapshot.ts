import {
  createViewGuardStore,
  selectCommandGuardSnapshot,
  type CommandGuardField,
  type CommandGuardSnapshot,
  type CommandMutationFamily,
} from "./view_guard_store";
import type { RouteStabilityFrame } from "./route_stability_store";
import { isStateContainerError } from "./state_container_errors";

export type StaleGuardSnapshot =
  | {
      command_guard_snapshot: CommandGuardSnapshot;
      formation_state: "COMMAND_GUARDS_READY";
      guard_vector_hash: string;
      missing_guard_fields: readonly [];
      mutation_family: CommandMutationFamily;
      safe_for_command_formation: true;
    }
  | {
      formation_state: "COMMAND_GUARDS_BLOCKED";
      guard_vector_hash: string;
      missing_guard_fields: readonly CommandGuardField[];
      mutation_family: CommandMutationFamily;
      reason_code: "STATE_CONTAINER_MISSING_GUARD";
      safe_for_command_formation: false;
    };

export type StaleGuardSnapshotInput = {
  frame: RouteStabilityFrame;
  mutation_family: CommandMutationFamily;
};

function asCommandGuardFields(value: readonly string[] | undefined) {
  return (value ?? []) as readonly CommandGuardField[];
}

export function createStaleGuardSnapshot(input: StaleGuardSnapshotInput): StaleGuardSnapshot {
  try {
    const commandGuardSnapshot = selectCommandGuardSnapshot(
      createViewGuardStore(input.frame),
      input.mutation_family,
    );
    return {
      command_guard_snapshot: commandGuardSnapshot,
      formation_state: "COMMAND_GUARDS_READY",
      guard_vector_hash: input.frame.stability_contract.guard_vector_hash,
      missing_guard_fields: [],
      mutation_family: input.mutation_family,
      safe_for_command_formation: true,
    };
  } catch (error) {
    if (!isStateContainerError(error, "STATE_CONTAINER_MISSING_GUARD")) {
      throw error;
    }

    return {
      formation_state: "COMMAND_GUARDS_BLOCKED",
      guard_vector_hash: input.frame.stability_contract.guard_vector_hash,
      missing_guard_fields: asCommandGuardFields(
        error.details.missing_guard_fields as readonly string[] | undefined,
      ),
      mutation_family: input.mutation_family,
      reason_code: "STATE_CONTAINER_MISSING_GUARD",
      safe_for_command_formation: false,
    };
  }
}
