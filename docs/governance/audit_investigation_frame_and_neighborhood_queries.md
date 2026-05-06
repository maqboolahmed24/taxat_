# Audit Investigation Frame And Neighborhood Queries

`pc_0194` adds the backend-governance read-side query and projector set for
`GET /v1/governance/tenants/{tenant_id}/audit-investigations`. The projector emits a schema-valid
`AuditInvestigationFrame` from durable audit event inputs and keeps telemetry refs secondary to the
ordered audit slice.

## Query Slice

- `queryAuditSlice` normalizes active filters, validates `window_from <= window_to`, and rejects
  empty evidence slices.
- `AUDIT_TRAIL` uses `ordering_basis = AUDIT_STREAM_SEQUENCE` and sorts by
  `audit_stream_ref -> stream_sequence -> event_ref`, not wall-clock time.
- Timeline and ledger contracts use `RECORDED_AT_THEN_STREAM_SEQUENCE`, while audit stream and
  sequence remain the deterministic tie-breakers.
- `RUN_TIMELINE` automatically keeps the query anchor in `active_filters.manifest_refs[]`.
- `PRIVACY_ACTION_LEDGER` automatically keeps the query anchor in `active_filters.client_refs[]`.
- A focused event outside the requested page rebases the returned page around that event so
  `selected_event_ref` remains present in `ordered_event_refs[]` and `audit_tape.rows[]`.

## Workspace Shape

- The workspace surface order is fixed as
  `INVENTORY_RAIL -> WORKSPACE_CANVAS -> EVENT_DIFF_INSPECTOR -> AUDIT_SIDECAR`.
- `audit_tape.rows[]` exactly mirrors `ordered_event_refs[]`.
- The interaction layer preserves active filters, selection, focus anchor, promoted support surface,
  and query slice.
- Active filter chips follow validator order:
  `actor`, `event_family`, `client`, `manifest`, `authority_operation`, `object`, `window_from`,
  `window_to`.

## Object Neighborhood And Diff Inspector

- `buildObjectNeighborhood` binds the selected object to the selected event context, publishes the
  same `object_refs[]` through top-level `object_neighborhood_refs[]`, and retains upstream or
  downstream neighbor events from the ordered slice.
- Neighbor lists never repeat the selected event.
- `buildEventDiffInspector` is always `raw_payload_posture = SUMMARY_FIRST`.
- Masked exports use `MASKED_CHANGE_NUCLEI`; denied exports use `LIMITATION_NOTICE` with summary
  copy instead of raw payload access.

## Export Binding

- `buildExportEligibilityPanel` binds export invocation to the active filtered slice through
  `active_slice_scope_ref = query_anchor_ref`.
- `FULL_ALLOWED` is the only posture that can serialize `FULL_EXPORT_READY`.
- `MASKED_ONLY`, `APPROVAL_REQUIRED`, and `DENIED` promote `EXPORT_ELIGIBILITY_PANEL` as the
  support surface and retain non-empty reason codes.
- The nested `externalization_governance_contract` uses
  `boundary_scope = AUDIT_INVESTIGATION_FRAME`, `delivery_surface_kind = FILTERED_AUDIT_EXPORT`,
  `history_meaning_state = ACTIVE_FILTERED_SLICE`, and the same query anchor for both
  `context_anchor_ref` and `slice_binding_ref`.
- The delivery binding hash uses the canonical validator field set and sorted blocking tokens, so
  masked, approval-gated, and denied exports cannot detach from the active slice.
