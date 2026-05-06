# Cross-Device Continuity And Focus Restore Metadata

`pc_0155` makes workflow-owned route restoration backend-authored. The source of truth is the serialized `cross_device_continuity_contract`, the grouped `focus_restoration`, and the deterministic `focus_restore_return_target_harness`.

## Route And Object Conventions

| Surface | `continuity_scope` | `canonical_object_ref` | `route_identity_ref` | Parent / return anchor |
| --- | --- | --- | --- | --- |
| Staff workspace | `WORKSPACE_ROUTE` | `WorkflowItem.item_id` | `/work/items/{item_id}` | queue/list route plus `work-inbox-row://{item_id}` |
| Portal request detail | `CLIENT_PORTAL_ROUTE` | `WorkflowItem.item_id` | `/portal/requests/{item_id}` | `/portal/requests` plus `customer-request-row://{item_id}` |
| Portal request list | `CLIENT_PORTAL_ROUTE` | `client://{client_id}/requests` | `/portal/requests` | no parent, selected row remains the focus anchor |
| Notification open | `WORK_ITEM_NOTIFICATION` | notification `object_anchor_ref` | persisted notification target route | persisted notification return route and focus anchor |

Staff workspace continuity may advertise `NATIVE_PRIMARY_SCENE` and `NATIVE_SUPPORT_WINDOW`; portal routes are browser wide/narrow only. Notification-open uses the same object, shell family, and visibility partition that was persisted with the notification.

## Fallback Order

When exact focus is unavailable, restoration uses this order:

1. Remap within the same object when possible.
2. Same-object summary.
3. Serialized parent return route and focus anchor.
4. Narrowest surviving list or queue target.

The request-list and notification stamp services serialize that order as `continuity_fallback_order`. `focus_restoration.restoration_disposition` records whether the current outcome is `EXACT_FOCUS`, `OBJECT_SUMMARY`, `PARENT_RETURN`, or `INVALIDATED`.

## Invalidation

Workflow surfaces explicitly publish typed invalidation reasons. Access-binding drift, masking drift, session revocation, view guard drift, object disappearance, schema incompatibility, parent-window closure, tenant switch, privilege downgrade, and policy snapshot drift are never silent hydration events. Notification-open projection returns no active target when one of those typed reasons applies.

## Focus Lock

The deterministic harness carries `active_focus_lock_kind_or_null` and `active_focus_lock_ref_or_null`. Live update cases preserve composer, picker, and compare-control focus. Browser identifiers mirror serialized focus anchors; native identifiers mirror the same anchors for secondary-window close.
