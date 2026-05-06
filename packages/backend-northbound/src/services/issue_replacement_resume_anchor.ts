import type { RouteStabilityContract } from "../../../../packages/generated-models/src/generated/typescript/surface-and-experience.ts";
import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";

export type ReplacementResumeAnchor = {
  replacementSnapshotRef: string;
  replacementStabilityContractOrNull: Record<string, unknown>;
};

function cloneStabilityContract(contract: Record<string, unknown>) {
  return structuredClone(contract) as RouteStabilityContract;
}

function advanceGuardVector(input: {
  contract: RouteStabilityContract;
  replacementSeed: string;
}) {
  const next = cloneStabilityContract(input.contract);
  next.publication_generation += 1;
  const components = {
    ...next.guard_vector_components,
  };
  if (next.route_scope_class === "MANIFEST_EXPERIENCE") {
    components.frame_epoch_or_null =
      typeof components.frame_epoch_or_null === "number"
        ? components.frame_epoch_or_null + 1
        : 1;
  } else if (next.route_scope_class === "WORKSPACE") {
    components.work_item_version_or_null =
      typeof components.work_item_version_or_null === "number"
        ? components.work_item_version_or_null + 1
        : 1;
  } else {
    components.view_guard_ref_or_null =
      typeof components.view_guard_ref_or_null === "string"
        ? `${components.view_guard_ref_or_null}.${input.replacementSeed}`
        : input.replacementSeed;
  }
  next.guard_vector_components = components;
  next.guard_vector_hash = stableJsonHash(components);
  return next as unknown as Record<string, unknown>;
}

export function issueReplacementResumeAnchor(input: {
  currentStabilityContract: Record<string, unknown>;
  latestSnapshotRef: string;
  latestStabilityContractOrNull: Record<string, unknown> | null;
}): ReplacementResumeAnchor {
  const latestStability = input.latestStabilityContractOrNull;
  const current = input.currentStabilityContract as RouteStabilityContract;
  const latest = latestStability as RouteStabilityContract | null;
  const replacementSeed = stableJsonHash({
    current_guard_vector_hash: current.guard_vector_hash,
    latest_snapshot_ref: input.latestSnapshotRef,
  }).slice(0, 12);
  if (
    latest !== null &&
    latest.guard_vector_hash !== current.guard_vector_hash &&
    latest.publication_generation > current.publication_generation
  ) {
    return {
      replacementSnapshotRef: input.latestSnapshotRef,
      replacementStabilityContractOrNull: latest as unknown as Record<string, unknown>,
    };
  }
  return {
    replacementSnapshotRef: input.latestSnapshotRef,
    replacementStabilityContractOrNull: advanceGuardVector({
      contract: latest ?? current,
      replacementSeed,
    }),
  };
}
