import {
  buildTwinStateSnapshotRecord,
  type AssembledTwinStateSnapshot,
  type TwinStateSnapshotBuildInput,
} from "../models/twin_state_snapshot.ts";
import { TwinStateSnapshotRepository } from "../repositories/twin_state_snapshot_repository.ts";

export type AssembleTwinStateSnapshotInput = TwinStateSnapshotBuildInput & {
  repository?: TwinStateSnapshotRepository;
};

export type AssembleTwinStateSnapshotResult = AssembledTwinStateSnapshot & {
  repository: TwinStateSnapshotRepository;
  stored: Awaited<ReturnType<TwinStateSnapshotRepository["persistTwinStateSnapshot"]>>;
};

export async function assembleTwinStateSnapshot(
  input: AssembleTwinStateSnapshotInput,
): Promise<AssembleTwinStateSnapshotResult> {
  const repository = input.repository ?? new TwinStateSnapshotRepository();
  const assembled = buildTwinStateSnapshotRecord(input);
  const stored = await repository.persistTwinStateSnapshot({ snapshot: assembled.snapshot });
  return {
    ...assembled,
    repository,
    stored,
  };
}
