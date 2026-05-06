# Collaboration Read Surfaces

This note documents the `pc_0165` northbound collaboration work-item detail read family.

## Routes

- `GET /v1/work-items/{item_id}/workspace/snapshot`
- `GET /v1/work-items/{item_id}/workspace/stream?resume_token=...`
- `GET /v1/work-items/{item_id}/activity?thread=customer|internal&before_sequence=...`
- `GET /v1/work-items/{item_id}/attachments?visibility=customer|internal`

These routes depend on a separately materialized work-item/list surface only for discovery. They do not create a second queue system; every detail read is anchored to the latest visibility-scoped `WorkspaceSnapshot`.

## Audience Semantics

Staff reads use `viewer_scope = STAFF_FULL`, `shell_family = CALM_SHELL`, and route key `/work/items/{item_id}`. Staff may read customer, internal, files, linked-context, and audit modules when the stored snapshot and authorizer allow it.

Customer reads use `viewer_scope = CUSTOMER_VISIBLE`, `shell_family = CLIENT_PORTAL_SHELL`, and route key `/portal/requests/{item_id}`. Customer snapshots mount only `CUSTOMER_ACTIVITY` and `FILES`, clear `internal_head_sequence_or_null`, and require a customer-safe projection. Customer activity and attachment reads are forced to the customer-visible lane.

## Guards And ETags

Snapshot reads return `ETag = workspace_version`. Activity and attachment slices preserve the same guard spine as the mounted snapshot: `workspace_route_key`, `workspace_version`, `shell_stability_token`, `access_binding_hash`, `masking_posture_fingerprint`, and `latest_workspace_snapshot_ref`.

## Stream Recovery

Workspace streams use persisted `WorkspaceCursor` records. Raw `resume_token` remains transport material; legality is checked against the grouped `stream_recovery_contract` and current actor binding. Resume fails closed on tenant, session, access, masking, schema, route, visibility, shell, epoch, compaction, or workspace guard drift.

Events are serialized as SSE and only allow `workspace.delta`, `workspace.snapshot`, `activity.appended`, `audit.appended`, `notification.badge`, and `heartbeat`. Duplicate delivery is idempotent by `(WORKSPACE, item_id, frame_epoch, workspace_sequence)`. Gaps, compaction, or epoch changes return `REBASE_REQUIRED`.

## Attachment Posture

Attachment reads keep `current_attachment_refs[]` separate from `historical_attachment_refs[]`. When `include_history=false`, historical refs are cleared. Customer reads always set `include_pending_placeholders=false`; pending placeholders may be surfaced only for staff and never become default preview, download, or print targets.
