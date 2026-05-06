import { WorkflowModelError } from "../models/workflow_item.ts";
import {
  buildVisibilityPartitionContract,
  normalizeProjectorTimestamp,
  projectionHash,
  requireProjectorString,
  routingContractForProjection,
  type VisibilityPartitionContract,
} from "./projection_contract_helpers.ts";
import type { WorkInboxRow, WorkInboxSnapshot } from "./build_work_inbox_snapshot.ts";

export type WorkInboxDeltaDeliveryClass = "LIVE" | "CATCH_UP" | "SNAPSHOT";
export type WorkInboxDeltaRemovalCause =
  | "FILTER_EXIT"
  | "VISIBILITY_EXIT"
  | "ITEM_CLOSED"
  | "ITEM_SUPERSEDED"
  | "ACCESS_REBIND_REQUIRED";

export type WorkInboxDeltaRowUpsert = {
  defer_reorder_until_focus_exit: boolean;
  item_id: string;
  order_changed: boolean;
  queue_projection_basis_hash: string;
  row: WorkInboxRow;
};

export type WorkInboxDeltaRowRemoval = {
  item_id: string;
  preserve_until_focus_exit: boolean;
  queue_projection_basis_hash: string;
  removal_cause: WorkInboxDeltaRemovalCause;
};

export type WorkInboxDeltaBadgeUpdate = {
  basis_hash: string;
  customer_activity_module_badge_count: number;
  customer_unread_count: number;
  internal_activity_module_badge_count_or_null: number | null;
  internal_unread_count: number;
  item_id: string;
  latest_change_lane_or_null: "CUSTOMER_VISIBLE" | "INTERNAL_ONLY" | "MIXED_VISIBLE" | null;
};

export type WorkInboxDelta = {
  artifact_type: "WorkInboxDelta";
  badge_updates: WorkInboxDeltaBadgeUpdate[];
  causal_semantic_action_id: string | null;
  delivery_class: WorkInboxDeltaDeliveryClass;
  inbox_route_key: string;
  inbox_sequence: number;
  inbox_version: number;
  occurred_at: string;
  row_removals: WorkInboxDeltaRowRemoval[];
  row_upserts: WorkInboxDeltaRowUpsert[];
  tenant_id: string;
  visibility_partition: VisibilityPartitionContract;
};

export type BuildWorkInboxDeltaInput = {
  causal_semantic_action_id?: string | null | undefined;
  delivery_class?: WorkInboxDeltaDeliveryClass | undefined;
  focused_item_ref_or_null?: string | null | undefined;
  inbox_sequence?: number | undefined;
  next_snapshot: WorkInboxSnapshot;
  occurred_at: string;
  previous_snapshot?: WorkInboxSnapshot | null | undefined;
  removal_cause_by_item_id?: Readonly<Record<string, WorkInboxDeltaRemovalCause>> | undefined;
};

function rowContentFingerprint(row: WorkInboxRow) {
  return projectionHash(row);
}

function rowOrderFingerprint(row: WorkInboxRow) {
  return projectionHash(row.sort_key);
}

function cloneRowWithQueuePosture(input: {
  filter_membership_state: WorkInboxRow["queue_projection"]["filter_membership_state"];
  focus_continuity_state: WorkInboxRow["queue_projection"]["focus_continuity_state"];
  row: WorkInboxRow;
}): WorkInboxRow {
  const routingContract =
    input.focus_continuity_state === "PENDING_REORDER_UNTIL_FOCUS_EXIT"
      ? routingContractForProjection({
          routing_contract: {
            ...input.row.queue_projection.routing_contract,
            focused_row_reorder_state: "DEFER_REORDER_UNTIL_FOCUS_EXIT",
          },
          routing_scope: "WORK_INBOX_ROW",
        })
      : input.row.queue_projection.routing_contract;
  return {
    ...input.row,
    queue_projection: {
      ...input.row.queue_projection,
      basis_hash: routingContract.basis_hash,
      canonical_sort_key: routingContract.canonical_sort_key,
      filter_membership_state: input.filter_membership_state,
      focus_continuity_state: input.focus_continuity_state,
      routing_contract: routingContract,
    },
  };
}

function buildBadgeUpdate(row: WorkInboxRow): WorkInboxDeltaBadgeUpdate {
  return {
    basis_hash: row.queue_projection.basis_hash,
    customer_activity_module_badge_count: row.queue_projection.customer_activity_module_badge_count,
    customer_unread_count: row.customer_unread_count,
    internal_activity_module_badge_count_or_null:
      row.queue_projection.internal_activity_module_badge_count_or_null,
    internal_unread_count: row.internal_unread_count,
    item_id: row.item_id,
    latest_change_lane_or_null: row.queue_projection.latest_change_lane_or_null,
  };
}

function deltaVisibilityPartition(snapshot: WorkInboxSnapshot) {
  return buildVisibilityPartitionContract({
    access_binding_hash: snapshot.access_binding_hash,
    allowed_visibility_classes: ["CUSTOMER_VISIBLE", "INTERNAL_ONLY"],
    audience_class: "STAFF",
    badge_counter_policy: "SPLIT_LANE_COUNTS",
    cache_partition_key: snapshot.visibility_partition.cache_partition_key.replace(
      "WORK_INBOX_SNAPSHOT",
      "WORK_INBOX_DELTA",
    ),
    masking_posture_fingerprint: snapshot.masking_posture_fingerprint,
    ordering_side_channel_policy: "CANONICAL_LIST_ONLY",
    partition_scope: "WORK_INBOX_DELTA",
    subject_ref: snapshot.inbox_route_key,
  });
}

function rowIndexById(rows: readonly WorkInboxRow[]) {
  const index = new Map<string, number>();
  rows.forEach((row, rowIndex) => index.set(row.item_id, rowIndex));
  return index;
}

function rowMapById(rows: readonly WorkInboxRow[]) {
  return new Map(rows.map((row) => [row.item_id, row]));
}

export function validateWorkInboxDelta(delta: WorkInboxDelta) {
  if (delta.artifact_type !== "WorkInboxDelta") {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "work inbox delta artifact type drifted");
  }
  if (delta.visibility_partition.partition_scope !== "WORK_INBOX_DELTA") {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "work inbox delta visibility scope drifted");
  }
  if (delta.delivery_class === "SNAPSHOT") {
    if (
      delta.causal_semantic_action_id !== null ||
      delta.row_removals.length !== 0 ||
      delta.badge_updates.length !== 0
    ) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "snapshot delivery deltas must clear causal/removal/badge fields");
    }
  } else if (delta.causal_semantic_action_id === null) {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "live and catch-up deltas require a causal semantic action id");
  }
  const upsertIds = new Set<string>();
  const removalIds = new Set<string>();
  const badgeIds = new Set<string>();
  const upsertRows = new Map<string, WorkInboxRow>();
  for (const upsert of delta.row_upserts) {
    if (upsertIds.has(upsert.item_id)) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "work inbox delta repeated row upsert");
    }
    upsertIds.add(upsert.item_id);
    upsertRows.set(upsert.item_id, upsert.row);
    if (upsert.item_id !== upsert.row.item_id) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "work inbox delta upsert id drifted");
    }
    if (upsert.queue_projection_basis_hash !== upsert.row.queue_projection.basis_hash) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "work inbox delta upsert basis drifted");
    }
    if (upsert.order_changed && !upsert.defer_reorder_until_focus_exit) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "work inbox reordered upserts must defer reorder");
    }
    if (
      upsert.order_changed &&
      upsert.row.queue_projection.focus_continuity_state !== "PENDING_REORDER_UNTIL_FOCUS_EXIT"
    ) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "work inbox reorder upsert lacks focus posture");
    }
  }
  for (const removal of delta.row_removals) {
    if (removalIds.has(removal.item_id)) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "work inbox delta repeated row removal");
    }
    removalIds.add(removal.item_id);
    if (removal.removal_cause === "FILTER_EXIT" && !removal.preserve_until_focus_exit) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "filter-exit removals must preserve focused row");
    }
    const overlap = upsertRows.get(removal.item_id);
    if (overlap !== undefined) {
      if (
        removal.removal_cause !== "FILTER_EXIT" ||
        !removal.preserve_until_focus_exit ||
        removal.queue_projection_basis_hash !== overlap.queue_projection.basis_hash ||
        overlap.queue_projection.focus_continuity_state !== "PENDING_REMOVAL_UNTIL_FOCUS_EXIT" ||
        overlap.queue_projection.filter_membership_state !== "FILTER_EXIT_PENDING_FOCUS_RELEASE"
      ) {
        throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "work inbox delta upsert/removal overlap is invalid");
      }
    }
  }
  for (const badge of delta.badge_updates) {
    if (badgeIds.has(badge.item_id)) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "work inbox delta repeated badge update");
    }
    badgeIds.add(badge.item_id);
    const upsertedRow = upsertRows.get(badge.item_id);
    if (upsertedRow !== undefined) {
      if (
        badge.basis_hash !== upsertedRow.queue_projection.basis_hash ||
        badge.customer_unread_count !== upsertedRow.customer_unread_count ||
        badge.internal_unread_count !== upsertedRow.internal_unread_count ||
        badge.customer_activity_module_badge_count !==
          upsertedRow.queue_projection.customer_activity_module_badge_count ||
        badge.internal_activity_module_badge_count_or_null !==
          upsertedRow.queue_projection.internal_activity_module_badge_count_or_null
      ) {
        throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "work inbox delta badge basis drifted");
      }
    }
  }
}

export function workInboxDeltaRef(delta: WorkInboxDelta) {
  return `work-inbox-delta://${projectionHash({
    causal_semantic_action_id: delta.causal_semantic_action_id,
    inbox_route_key: delta.inbox_route_key,
    inbox_sequence: delta.inbox_sequence,
    inbox_version: delta.inbox_version,
    tenant_id: delta.tenant_id,
  })}`;
}

export function workInboxDeltaContentFingerprint(delta: WorkInboxDelta) {
  validateWorkInboxDelta(delta);
  return projectionHash(delta);
}

export function buildWorkInboxDelta(input: BuildWorkInboxDeltaInput): WorkInboxDelta {
  const next = input.next_snapshot;
  const deliveryClass = input.delivery_class ?? (input.previous_snapshot === null ? "SNAPSHOT" : "LIVE");
  const causalSemanticActionId =
    deliveryClass === "SNAPSHOT"
      ? null
      : requireProjectorString(
          "causal_semantic_action_id",
          input.causal_semantic_action_id ?? `inbox-delta:${next.inbox_route_key}:${next.inbox_version}`,
        );
  const previousRows = input.previous_snapshot?.rows ?? [];
  const previousById = rowMapById(previousRows);
  const previousIndex = rowIndexById(previousRows);
  const nextById = rowMapById(next.rows);
  const nextIndex = rowIndexById(next.rows);
  const focusedItemRef = input.focused_item_ref_or_null ?? input.previous_snapshot?.selected_item_ref ?? null;
  const rowUpserts: WorkInboxDeltaRowUpsert[] = [];
  const rowRemovals: WorkInboxDeltaRowRemoval[] = [];
  const badgeUpdates: WorkInboxDeltaBadgeUpdate[] = [];

  if (deliveryClass === "SNAPSHOT") {
    for (const row of next.rows) {
      rowUpserts.push({
        defer_reorder_until_focus_exit: false,
        item_id: row.item_id,
        order_changed: false,
        queue_projection_basis_hash: row.queue_projection.basis_hash,
        row,
      });
    }
  } else {
    for (const row of next.rows) {
      const previous = previousById.get(row.item_id);
      const wasAt = previousIndex.get(row.item_id);
      const isAt = nextIndex.get(row.item_id);
      const orderChanged =
        previous !== undefined &&
        (wasAt !== isAt || rowOrderFingerprint(previous) !== rowOrderFingerprint(row));
      const contentChanged =
        previous === undefined || rowContentFingerprint(previous) !== rowContentFingerprint(row);
      if (!contentChanged && !orderChanged) {
        continue;
      }
      const shouldDeferReorder = orderChanged && row.item_id === focusedItemRef;
      const publishedRow = shouldDeferReorder
        ? cloneRowWithQueuePosture({
            filter_membership_state: "IN_ACTIVE_FILTER_SET",
            focus_continuity_state: "PENDING_REORDER_UNTIL_FOCUS_EXIT",
            row,
          })
        : row;
      rowUpserts.push({
        defer_reorder_until_focus_exit: shouldDeferReorder,
        item_id: row.item_id,
        order_changed: shouldDeferReorder,
        queue_projection_basis_hash: publishedRow.queue_projection.basis_hash,
        row: publishedRow,
      });
      if (
        previous === undefined ||
        previous.customer_unread_count !== row.customer_unread_count ||
        previous.internal_unread_count !== row.internal_unread_count ||
        previous.queue_projection.basis_hash !== row.queue_projection.basis_hash
      ) {
        badgeUpdates.push(buildBadgeUpdate(publishedRow));
      }
    }

    for (const previous of previousRows) {
      if (nextById.has(previous.item_id)) {
        continue;
      }
      const configuredCause = input.removal_cause_by_item_id?.[previous.item_id];
      const isFocusedRemoval = previous.item_id === focusedItemRef;
      const removalCause: WorkInboxDeltaRemovalCause =
        configuredCause ?? (isFocusedRemoval ? "FILTER_EXIT" : "ITEM_CLOSED");
      const preserve = removalCause === "FILTER_EXIT";
      rowRemovals.push({
        item_id: previous.item_id,
        preserve_until_focus_exit: preserve,
        queue_projection_basis_hash: previous.queue_projection.basis_hash,
        removal_cause: removalCause,
      });
      if (preserve) {
        const placeholderRow = cloneRowWithQueuePosture({
          filter_membership_state: "FILTER_EXIT_PENDING_FOCUS_RELEASE",
          focus_continuity_state: "PENDING_REMOVAL_UNTIL_FOCUS_EXIT",
          row: previous,
        });
        rowUpserts.push({
          defer_reorder_until_focus_exit: false,
          item_id: previous.item_id,
          order_changed: false,
          queue_projection_basis_hash: placeholderRow.queue_projection.basis_hash,
          row: placeholderRow,
        });
      }
    }
  }

  const delta: WorkInboxDelta = {
    artifact_type: "WorkInboxDelta",
    badge_updates: deliveryClass === "SNAPSHOT" ? [] : badgeUpdates,
    causal_semantic_action_id: causalSemanticActionId,
    delivery_class: deliveryClass,
    inbox_route_key: next.inbox_route_key,
    inbox_sequence: input.inbox_sequence ?? next.last_published_sequence,
    inbox_version: next.inbox_version,
    occurred_at: normalizeProjectorTimestamp("occurred_at", input.occurred_at),
    row_removals: deliveryClass === "SNAPSHOT" ? [] : rowRemovals,
    row_upserts: rowUpserts,
    tenant_id: next.tenant_id,
    visibility_partition: deltaVisibilityPartition(next),
  };
  validateWorkInboxDelta(delta);
  return delta;
}
