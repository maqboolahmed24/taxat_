# Run, Batch, Filing, And Privacy Query Contracts

This note records the observability-owned query layer implemented for `pc_0215`.

## Scope

`packages/backend-observability` now materializes deterministic `AuditInvestigationFrame` slices for:

- `getAuditTrail(...)`
- `getRunTimeline(...)`
- `getNightlyBatchTimeline(...)`
- `getFilingEvidenceLedger(...)`
- `getPrivacyActionLedger(...)`

The implementation reuses the schema-shaped governance projector from `pc_0194` instead of creating another frame dialect. The observability package owns the signal-source adapter and the five named query entry points; the emitted frame remains the canonical `AuditInvestigationFrame`.

## Query Vocabulary

The closed `query_contract_code` vocabulary is:

- `AUDIT_TRAIL`
- `RUN_TIMELINE`
- `NIGHTLY_BATCH_TIMELINE`
- `FILING_EVIDENCE_LEDGER`
- `PRIVACY_ACTION_LEDGER`

`AUDIT_TRAIL` always uses `ordering_basis = AUDIT_STREAM_SEQUENCE`. Every timeline or ledger query uses `ordering_basis = RECORDED_AT_THEN_STREAM_SEQUENCE`, with audit stream and sequence retained as deterministic tie-breakers inside merged positions.

## Anchor Grammar

`getAuditTrail({ rootRef })` uses `rootRef` as `query_anchor_ref` and matches durable audit events by object refs, manifest refs, audit stream refs, or repeated correlation context refs.

`getRunTimeline({ manifestId })` uses `manifestId` as `query_anchor_ref`; the frame keeps that id in `active_filters.manifest_refs[]`.

`getNightlyBatchTimeline({ batchRunId })` uses the frozen `nightly_batch_run_ref` as `query_anchor_ref`; the frame exposes `nightly_batch_run_ref` in `correlation_keys[]` and requires supporting trace refs.

`getFilingEvidenceLedger({ submissionRecordId })` uses the submission record id as `query_anchor_ref`; the frame exposes `submission_record_id` in `correlation_keys[]`.

`getPrivacyActionLedger({ clientId })` uses `clientId` as `query_anchor_ref`; the frame keeps that id in `active_filters.client_refs[]`.

All anchors are non-empty immutable refs. Empty anchors fail before query materialization.

## Source Adapter

The adapter converts persisted backend observability audit events into `AuditSliceEventInput` rows. It preserves:

- audit event id, family, stream ref, and stream sequence
- recorded time and event time
- actor or service ref
- tenant, client, manifest, authority, submission, nightly, and object refs
- reason-code field refs for summary-first diff posture
- derived trace refs from `correlation_context.trace_id` and `span_id`
- log refs only when they already appear as explicit `log://...` supporting object refs

Logs and traces never become proof. `ordered_event_refs[]` is always the audit evidence spine.

## Selection, Filters, And Cursoring

The backend owns `active_filters`, selected event, selected object, focus anchor, and cursor continuity. A focused event outside the requested page rebases the returned page around that event so the selected event remains present in `ordered_event_refs[]` and `audit_tape.rows[]`.

`next_cursor` is emitted only as a non-empty route-stable cursor. Pagination never drops `query_contract_code`, `query_anchor_ref`, or `ordering_basis`.

## Export Binding

`export_posture` and `export_eligibility_panel` are bound to `query_anchor_ref` through `active_slice_scope_ref` and `invocation_posture = ACTIVE_FILTERED_SLICE`.

`getPrivacyActionLedger(...)` defaults to `MASKED_ONLY` with `PRIVACY_LEDGER_MASKED_PREVIEW_REQUIRED`. Other query modes default to `FULL_ALLOWED` unless the caller supplies a stricter posture.

The externalization governance contract remains `boundary_scope = AUDIT_INVESTIGATION_FRAME`, `delivery_surface_kind = FILTERED_AUDIT_EXPORT`, and `history_meaning_state = ACTIVE_FILTERED_SLICE`.

## Runtime Guards

`assertAuditInvestigationFrameContract(...)` checks the observability-specific invariants before a frame leaves the query layer:

- `object_anchor_ref` mirrors `query_anchor_ref`
- `AUDIT_TRAIL` uses audit stream sequence ordering
- timelines and ledgers use recorded-at then stream-sequence ordering
- `audit_tape.rows[]` mirrors `ordered_event_refs[]`
- run and nightly timelines retain trace support
- nightly batch timelines expose `nightly_batch_run_ref`
- filing ledgers expose `submission_record_id`
- privacy ledgers bind the client id into active client filters
- export posture stays bound to the active filtered slice

These guards complement schema validation and the validator self-tests.
