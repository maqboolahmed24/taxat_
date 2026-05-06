import type { WorkflowItem, WorkflowRoutingContract } from "../models/workflow_item.ts";
import { compareCanonicalRoutingSortKeys } from "./serialize_canonical_routing_sort_key.ts";

export type RankableWorkQueueItem =
  | WorkflowItem
  | {
      routing_contract: WorkflowRoutingContract;
    }
  | WorkflowRoutingContract;

function routingContractOf(item: RankableWorkQueueItem) {
  if ("contract_version" in item) {
    return item;
  }
  return item.routing_contract;
}

export function compareWorkQueueItems(left: RankableWorkQueueItem, right: RankableWorkQueueItem) {
  return compareCanonicalRoutingSortKeys(
    routingContractOf(left).canonical_sort_key,
    routingContractOf(right).canonical_sort_key,
  );
}

export function rankWorkQueueItems<T extends RankableWorkQueueItem>(items: readonly T[]) {
  return [...items].sort(compareWorkQueueItems);
}
