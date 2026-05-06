import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import {
  buildRequestListContinuityContract,
  type CanonicalCrossDeviceContinuityContract,
} from "../contracts/build_cross_device_continuity_contract.ts";
import {
  buildExactFocusRestorationContract,
  type CanonicalFocusRestorationContract,
} from "../contracts/build_focus_restoration_contract.ts";
import { cloneWorkflowRecord } from "../models/workflow_item.ts";

export type ContinuityFallbackTargetKind =
  | "EXACT_FOCUS"
  | "OBJECT_SUMMARY"
  | "PARENT_RETURN"
  | "NARROWEST_SURVIVING_LIST";

export type ContinuityFallbackTarget = {
  fallback_rank: number;
  focus_anchor_ref_or_null: string | null;
  reason_code: string;
  route_ref: string;
  target_kind: ContinuityFallbackTargetKind;
};

type RequestListContinuityStampSource = {
  access_binding_hash: string;
  active_filters: unknown;
  client_id: string;
  list_version: number;
  masking_posture_fingerprint: string;
  object_anchor_ref: string;
  request_list_route_key: "/portal/requests";
  rows: readonly { focus_anchor_ref: string; item_id: string }[];
  selected_focus_anchor_ref_or_null: string | null;
  selected_item_ref_or_null: string | null;
  visibility_partition: {
    cache_partition_key: string;
  };
};

export type RequestListContinuityStamped<T extends RequestListContinuityStampSource> = T & {
  continuity_fallback_order: ContinuityFallbackTarget[];
  cross_device_continuity_contract: CanonicalCrossDeviceContinuityContract;
  focus_restoration: CanonicalFocusRestorationContract;
};

function selectedDetailRoute(snapshot: RequestListContinuityStampSource) {
  return snapshot.selected_item_ref_or_null === null
    ? snapshot.request_list_route_key
    : `/portal/requests/${snapshot.selected_item_ref_or_null}`;
}

function objectSummaryAnchor(snapshot: RequestListContinuityStampSource) {
  return snapshot.selected_item_ref_or_null === null
    ? null
    : `request-summary://${snapshot.selected_item_ref_or_null}`;
}

function buildRequestListFallbackOrder(
  snapshot: RequestListContinuityStampSource,
): ContinuityFallbackTarget[] {
  const selectedFocus = snapshot.selected_focus_anchor_ref_or_null;
  const detailRoute = selectedDetailRoute(snapshot);
  return [
    {
      fallback_rank: 1,
      target_kind: "EXACT_FOCUS",
      route_ref: detailRoute,
      focus_anchor_ref_or_null: selectedFocus,
      reason_code: "EXACT_TARGET_VISIBLE",
    },
    {
      fallback_rank: 2,
      target_kind: "OBJECT_SUMMARY",
      route_ref: detailRoute,
      focus_anchor_ref_or_null: objectSummaryAnchor(snapshot),
      reason_code: "EXACT_TARGET_CHANGED_SAME_OBJECT_LAWFUL",
    },
    {
      fallback_rank: 3,
      target_kind: "PARENT_RETURN",
      route_ref: snapshot.request_list_route_key,
      focus_anchor_ref_or_null: selectedFocus,
      reason_code: "SERIALIZED_PARENT_RETURN",
    },
    {
      fallback_rank: 4,
      target_kind: "NARROWEST_SURVIVING_LIST",
      route_ref: snapshot.request_list_route_key,
      focus_anchor_ref_or_null: selectedFocus,
      reason_code: "NARROWEST_LIST_RETURN",
    },
  ];
}

export function requestListContinuityStabilityGuard(
  snapshot: RequestListContinuityStampSource,
) {
  return `request-list-stability://${stableJsonHash({
    active_filters: snapshot.active_filters,
    client_id: snapshot.client_id,
    list_version: snapshot.list_version,
    request_list_route_key: snapshot.request_list_route_key,
    row_ids: snapshot.rows.map((row) => row.item_id),
    selected_item_ref_or_null: snapshot.selected_item_ref_or_null,
  })}`;
}

export function stampRequestListContinuityMetadata<T extends RequestListContinuityStampSource>(
  input: {
    snapshot: T;
  },
): RequestListContinuityStamped<T> {
  const snapshot = cloneWorkflowRecord(input.snapshot);
  return {
    ...snapshot,
    continuity_fallback_order: buildRequestListFallbackOrder(snapshot),
    cross_device_continuity_contract: buildRequestListContinuityContract({
      access_scope_hash_or_null: snapshot.access_binding_hash,
      canonical_object_ref: snapshot.object_anchor_ref,
      focus_anchor_ref_or_null: snapshot.selected_focus_anchor_ref_or_null,
      masking_scope_fingerprint_or_null: snapshot.masking_posture_fingerprint,
      route_identity_ref: snapshot.request_list_route_key,
      stability_guard_hash_or_null: requestListContinuityStabilityGuard(snapshot),
      visibility_cache_partition_key_or_null: snapshot.visibility_partition.cache_partition_key,
    }),
    focus_restoration: buildExactFocusRestorationContract(
      snapshot.selected_focus_anchor_ref_or_null,
    ),
  };
}
