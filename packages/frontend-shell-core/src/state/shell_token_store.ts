import type { RouteScopeClass } from "../route_contracts/route_stability";
import {
  readGuardVectorComponent,
  type RouteIdentity,
  type RouteStabilityFrame,
} from "./route_stability_store";

export type ShellTokenRecord = {
  frame_epoch_or_null: number | null;
  guard_vector_hash: string;
  publication_generation: number;
  route_identity_ref: string;
  route_scope_class: RouteScopeClass;
  shell_stability_token_or_null: string | null;
};

export type ShellTokenComparison =
  | {
      outcome: "CURRENT";
      record: ShellTokenRecord;
    }
  | {
      next: ShellTokenRecord;
      outcome: "MISSING_RECORD";
    }
  | {
      next: ShellTokenRecord;
      outcome: "SHELL_TOKEN_DRIFT" | "SHELL_TOKEN_MIXED_FRAME_EPOCH";
      previous: ShellTokenRecord;
    };

export type ShellTokenStore = {
  records: Readonly<Record<string, ShellTokenRecord>>;
};

function routeIdentityRef(identity: RouteIdentity) {
  return [
    identity.shell_route_key,
    identity.workspace_route_key,
    identity.route_context_ref,
    identity.object_anchor_ref,
  ].join("|");
}

export function shellTokenRecordKey(record: Pick<ShellTokenRecord, "route_identity_ref" | "route_scope_class">) {
  return `${record.route_scope_class}:${record.route_identity_ref}`;
}

export function shellTokenRecordFromFrame(frame: RouteStabilityFrame): ShellTokenRecord {
  const components = frame.stability_contract.guard_vector_components;
  return {
    frame_epoch_or_null: readGuardVectorComponent(components, "frame_epoch_or_null"),
    guard_vector_hash: frame.stability_contract.guard_vector_hash,
    publication_generation: frame.stability_contract.publication_generation,
    route_identity_ref: routeIdentityRef(frame.route_identity),
    route_scope_class: frame.stability_contract.route_scope_class,
    shell_stability_token_or_null: readGuardVectorComponent(
      components,
      "shell_stability_token_or_null",
    ),
  };
}

export function createShellTokenStore(records: readonly ShellTokenRecord[] = []): ShellTokenStore {
  const indexedRecords: Record<string, ShellTokenRecord> = {};
  for (const record of records) {
    indexedRecords[shellTokenRecordKey(record)] = record;
  }

  return { records: indexedRecords };
}

export function upsertShellTokenRecord(
  store: ShellTokenStore,
  frame: RouteStabilityFrame,
): ShellTokenStore {
  const record = shellTokenRecordFromFrame(frame);
  return {
    records: {
      ...store.records,
      [shellTokenRecordKey(record)]: record,
    },
  };
}

export function compareShellTokenRecord(
  store: ShellTokenStore,
  frame: RouteStabilityFrame,
): ShellTokenComparison {
  const next = shellTokenRecordFromFrame(frame);
  const previous = store.records[shellTokenRecordKey(next)];
  if (previous === undefined) {
    return { next, outcome: "MISSING_RECORD" };
  }
  if (previous.shell_stability_token_or_null !== next.shell_stability_token_or_null) {
    return { next, outcome: "SHELL_TOKEN_DRIFT", previous };
  }
  if (
    previous.frame_epoch_or_null !== null &&
    next.frame_epoch_or_null !== null &&
    next.frame_epoch_or_null > previous.frame_epoch_or_null &&
    previous.guard_vector_hash !== next.guard_vector_hash
  ) {
    return { next, outcome: "SHELL_TOKEN_MIXED_FRAME_EPOCH", previous };
  }

  return { outcome: "CURRENT", record: previous };
}
