import {
  buildWorkInboxDelta,
  type BuildWorkInboxDeltaInput,
  type WorkInboxDelta,
} from "../projectors/build_work_inbox_delta.ts";
import type { WorkInboxSnapshot } from "../projectors/build_work_inbox_snapshot.ts";
import type { WorkInboxDeltaRepository } from "../repositories/work_inbox_delta_repository.ts";
import type { WorkInboxSnapshotRepository } from "../repositories/work_inbox_snapshot_repository.ts";

export type ProjectIncrementalWorkInboxDeltaInput = Omit<
  BuildWorkInboxDeltaInput,
  "next_snapshot" | "previous_snapshot"
> & {
  delta_repository: WorkInboxDeltaRepository;
  next_snapshot: WorkInboxSnapshot;
  previous_snapshot?: WorkInboxSnapshot | null | undefined;
  snapshot_repository?: WorkInboxSnapshotRepository | undefined;
};

export async function projectIncrementalWorkInboxDelta(
  input: ProjectIncrementalWorkInboxDeltaInput,
): Promise<{
  delta: WorkInboxDelta;
  stored: Awaited<ReturnType<WorkInboxDeltaRepository["persistWorkInboxDelta"]>>;
}> {
  const previous =
    input.previous_snapshot === undefined
      ? (await input.snapshot_repository?.getLatestWorkInboxSnapshotForRoute({
          inbox_route_key: input.next_snapshot.inbox_route_key,
          tenant_id: input.next_snapshot.tenant_id,
        }))?.record ?? null
      : input.previous_snapshot;
  const delta = buildWorkInboxDelta({
    ...input,
    next_snapshot: input.next_snapshot,
    previous_snapshot: previous,
  });
  const stored = await input.delta_repository.persistWorkInboxDelta({ delta });
  return {
    delta,
    stored,
  };
}
