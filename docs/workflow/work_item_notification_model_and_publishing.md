# Work Item Notification Model And Publishing

`pc_0149` adds `WorkItemNotification` as the durable artifact for delivery, dedupe, route-open,
focus restoration, suppression, and read state.

## Dedupe

`computeWorkItemNotificationDedupeKey` is channel-neutral. The key includes recipient, item,
notification type, visibility class, target route, target module, focus anchor, request-info ref,
access binding, masking posture, and a five-minute queue window. It deliberately excludes
`delivery_channel` and `semantic_action_id`, so retries and equivalent email/push/in-app attempts
reuse one artifact while different target contexts still get different keys.

Duplicate publish attempts return the existing artifact with `publish_state = DUPLICATE_SUPPRESSED`
and do not create a second delivery lineage.

## Route And Visibility

The builder writes the full route envelope once:

- `INTERNAL_ONLY`: `CALM_SHELL`, `/work/items/{item_id}`, `/work` return/fallback, staff visibility
  partition, no `customer_safe_projection`
- `CUSTOMER_VISIBLE`: `CLIENT_PORTAL_SHELL`, `/portal/requests/{item_id}`,
  `/portal/requests` return/fallback, client-portal visibility partition, and a
  `customer_safe_projection`

Customer-visible notifications are limited to request-info opened, customer-visible comments, due
date changes, resolved, and cancelled. Staff notification families remain internal-only.

## Suppression And State

Suppressed notifications retain non-empty `suppressed_reason_codes[]` and must clear `delivered_at`
and `read_at`. Delivered/read state is monotonic:

- queued notifications may become delivered
- delivered notifications may become read
- read cannot exist before delivered
- delivered or read notifications cannot be retroactively suppressed

Access-binding or masking drift suppresses undelivered artifacts during publishing. For already
persisted open targets, `projectNotificationOpenTarget` invalidates the target and returns no active
route when access, masking, or cache partition no longer matches.

## Continuity Binding

Every notification persists:

- `visibility_partition`
- `access_binding_hash`
- `customer_safe_projection` for portal-safe payloads
- `queue_projection`
- `cross_device_continuity_contract`
- `focus_restoration`
- target route/module/focus, return route/focus, and fallback route/focus

Open-target projection uses those stored fields directly. It does not reconstruct shell, route,
module, focus, or fallback from queue rows or browser history.
