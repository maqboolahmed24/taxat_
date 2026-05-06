# Work Inbox Snapshot And Delta Rules

`WorkInboxSnapshot` is the only queue-bearing staff inbox snapshot. `WorkInboxDelta` is the only live-update patch format for that snapshot. Both are backend-authored read models; neither is command-side truth.

## Projector Boundary

- `WorkInboxSnapshot` is rebuilt from persisted `WorkflowItem.routing_contract`, workflow lifecycle fields, due/assignee state, and unread notification lineage.
- `WorkInboxDelta` is derived by comparing the previous mounted snapshot with the next backend-authored snapshot.
- `delivery_class = SNAPSHOT` is used for full rehydration or first mount and carries row upserts only.
- `delivery_class = LIVE` is used for a single causal semantic action after the current mounted snapshot.
- `delivery_class = CATCH_UP` is used after coalescing or replaying multiple missed deltas.

## Selection And Focus

- `selected_item_ref` is either `null` or the `item_id` of a mounted row.
- `selected_focus_anchor_ref_or_null` mirrors the selected row's `focus_anchor_ref`; it is `null` when no row is selected.
- If the selected row changes canonical order, the delta upsert sets `order_changed = true`, `defer_reorder_until_focus_exit = true`, and row queue focus posture `PENDING_REORDER_UNTIL_FOCUS_EXIT`.
- If the selected row leaves the active filter set, the delta emits both a `FILTER_EXIT` removal and a matching placeholder upsert with `PENDING_REMOVAL_UNTIL_FOCUS_EXIT`.

## Queue Health

- `queue_health_contract` is built from persisted routing contract queue-health fields, not raw backlog counts or local clocks.
- `queue_pressure_score` is always `100 - queue_health_score`.
- `queue_health_state` is `HEALTHY` at or above the floor, `DEGRADED` below the floor, and `SATURATED` below 35.
- `ordering_policy` is pinned to `CANONICAL_SORT_KEY_ONLY`.

## Row Field Mirrors

- Row order follows the persisted canonical routing tuple: priority descending, escalation descending, due ascending with nulls last, resolution confidence ascending, queue entry ascending, item id ascending.
- `row.queue_projection.routing_contract` is the source for priority, escalation, confidence, SLA pressure, effective due date, and queue order.
- Row unread counts mirror `row.queue_projection.customer_unread_count` and `internal_unread_count_or_null`.
- Badge updates carry the same queue-projection basis hash as the upserted row.

## Actions

- `row_actions.authoritative_action` is the legal source for visible row actions.
- `primary_action_code` must be present in `available_action_codes[]` and absent from `blocked_action_codes[]`.
- Mutation-capable actions publish a `mutation_precondition_binding_or_null` entry with the appropriate work-item stale guard profile.
- No-safe-action rows carry a recovery route back to `/work/items/{item_id}` and the row focus anchor.

## Delta Coalescing

- Deltas are idempotent by `causal_semantic_action_id`.
- Repeated downstream publication of the same causal action returns the stored delta.
- Immediate removals do not overlap upserts.
- The only lawful upsert/removal overlap is a deferred `FILTER_EXIT` placeholder for the focused row.
