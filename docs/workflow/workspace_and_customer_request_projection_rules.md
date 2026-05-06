# Workspace and Customer Request Projection Rules

`WorkspaceSnapshot`, `CustomerRequestListSnapshot`, and `CollaborationActivitySlice` are backend-authored read models. Staff detail routes, portal request lists, and visible activity panes must consume these projections rather than joining workflow items, threads, requests, attachments, participants, and notifications in the client.

## Canonical Inputs

`WorkspaceSnapshot` is projected from one `WorkflowItem`, its internal thread, its customer-visible thread when mounted, the active open `RequestInfoRecord`, item participants, collaboration attachments, unread mirrors or notifications, and the caller access binding and masking posture.

`CustomerRequestListSnapshot` is projected from all customer-shared `WorkflowItem` records for one tenant/client pair, request-info rows, customer-visible attachments, unread notification mirrors, active filters, access binding, and masking posture.

`CollaborationActivitySlice` is projected from one `CollaborationThread`, persisted `CollaborationEntry` rows in that thread, route/version continuity data from the compatible workspace snapshot, access binding, masking posture, and paging filters.

## Shell and Route Ownership

Staff workspace detail uses `CALM_SHELL` and `/work/items/{item_id}`. Its return targets are `/work` or the manifest workflow focus route, and it may include customer, internal, files, linked context, and audit modules.

Customer workspace detail uses `CLIENT_PORTAL_SHELL` and `/portal/requests/{item_id}`. Its return targets stay inside `/portal`, `/portal/requests`, `/portal/approvals`, or `/portal/help`. Internal heads, internal participants, internal modules, internal file refs, and staff route hints are removed at projection time.

The customer request list always uses `CLIENT_PORTAL_SHELL` and `/portal/requests`. Row focus anchors use `customer-request-row://{item_id}`. A selected item must resolve to a returned row and must reuse that row focus anchor.

## Action Alignment

Customer request rows and customer-visible workspace details share the same customer-safe action vocabulary: `REPLY`, `UPLOAD_FILE`, and `RESPOND_TO_REQUEST_INFO`. An actionable request exposes one visible primary action and clears recovery route/focus. A non-actionable request clears visible actions, publishes a plain-language no-safe-action reason, and points recovery to `/portal/requests/{item_id}` plus the row focus anchor.

The customer workspace `customer_request_workspace.authoritative_action` mirrors the detail action posture, while list rows use `CUSTOMER_REQUEST_ROW` scope for list-route ownership. Both contracts are server-authored and include access binding, cache partition, projection version, and machine reason codes.

## Visibility and Cache Boundaries

Staff workspace snapshots use a `WORKSPACE_SNAPSHOT` visibility partition with both `CUSTOMER_VISIBLE` and `INTERNAL_ONLY` lanes. Customer workspace snapshots, request lists, and customer activity slices use only `CUSTOMER_VISIBLE` and must include `customer_safe_projection`.

Request lists use `CUSTOMER_REQUEST_LIST` cache isolation with the client id and route identity `/portal/requests`. Workspace snapshots use `WORKSPACE_SNAPSHOT` cache isolation with the mounted item and shell stability token. Activity slices carry no cache contract; they carry visibility partition, route/version keys, and `latest_workspace_snapshot_ref`.

## Activity Paging

Activity slices are lane-bound. Customer-visible activity rejects `INTERNAL_ONLY` threads. `active_filters.thread_visibility_class` mirrors the top-level thread visibility. Entries are sorted newest-first, constrained by `before_sequence_or_null`, and never exceed `head_sequence`.

`next_before_sequence_or_null` is `oldest_returned_sequence - 1` when an earlier matching page exists; otherwise it is `null`. Empty slices clear newest and oldest sequence fields. `latest_workspace_snapshot_ref` points to the compatible workspace projection for the same item, viewer scope, route key, workspace version, and shell stability token.

## Verification Harnesses

The static previews under `apps/admin-console-web/public/debug/workspace-snapshot-preview` and `apps/client-portal-web/public/debug/customer-request-list-preview` render serialized projection fixtures. They expose governed selectors for Playwright:

- `workspace-snapshot-preview`
- `workspace-context-bar`
- `workspace-action-strip`
- `workspace-detail-drawer`
- `workspace-route-focus-map`
- `customer-request-list-preview`
- `customer-request-row`
- `customer-request-authoritative-action`
