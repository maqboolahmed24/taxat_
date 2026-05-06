import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import {
  buildWorkQueueHealthContract,
  type WorkQueueHealthContract,
} from "./build_work_queue_health_contract.ts";
import {
  computeWorkQueueHealth,
  type WorkQueueHealthComputation,
} from "./compute_work_queue_health.ts";
import {
  queryQueueHealthInputs,
  type QueryQueueHealthInputsInput,
  type QueryQueueHealthInputsResult,
} from "./query_queue_health_inputs.ts";

export type QueueHealthAnalyticsSnapshot = {
  analytics_basis_hash: string;
  computation: WorkQueueHealthComputation;
  contract: WorkQueueHealthContract;
  input_basis: QueryQueueHealthInputsResult;
  published_at: string;
  snapshot_hash: string;
};

export function queueHealthAnalyticsSnapshotHash(
  snapshot: Omit<QueueHealthAnalyticsSnapshot, "snapshot_hash">,
) {
  return stableJsonHash(snapshot);
}

export function queryQueueHealthSnapshot(input: QueryQueueHealthInputsInput): QueueHealthAnalyticsSnapshot {
  const inputBasis = queryQueueHealthInputs(input);
  const computation = computeWorkQueueHealth(inputBasis);
  const contract = buildWorkQueueHealthContract({
    health_computation: computation,
    queue_route_key: inputBasis.queue_route_key,
    routing_profile_hash: inputBasis.routing_profile_hash,
  });
  const withoutHash: Omit<QueueHealthAnalyticsSnapshot, "snapshot_hash"> = {
    analytics_basis_hash: computation.analytics_basis_hash,
    computation,
    contract,
    input_basis: inputBasis,
    published_at: inputBasis.evaluated_at,
  };
  return {
    ...withoutHash,
    snapshot_hash: queueHealthAnalyticsSnapshotHash(withoutHash),
  };
}
