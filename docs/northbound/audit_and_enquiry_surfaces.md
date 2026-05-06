# Audit And Enquiry Read Surfaces

This note records the northbound contract implemented for `pc_0166`.

## Routes

- `GET /v1/manifests/{manifest_id}/audit-trail`
- `GET /v1/manifests/{manifest_id}/enquiry-pack?target_ref=...`
- `GET /v1/governance/tenants/{tenant_id}/audit-investigations`

All three routes are read-only. Retrieval never mutates workflow, compliance, provenance, authority, or audit truth.

## Query Grammar

Audit-frame routes share one canonical filter grammar:

- `actor` / `actor_ref` / `actor_refs`
- `event_family` / `event_family_ref` / `event_families`
- `client` / `client_ref` / `client_refs`
- `manifest` / `manifest_ref` / `manifest_refs`
- `authority_operation` / `authority_operation_ref` / `authority_operation_refs`
- `object` / `object_ref` / `object_refs`
- `window_from` / `from`
- `window_to` / `to`
- `focus_event_ref` / `selected_event_ref`
- `focus_anchor_ref`
- `limit`
- `cursor`

Repeated params and comma-delimited params are both supported. Empty filter tokens are rejected. Cursor tokens are route/query-hash bound and cannot be replayed against different filters.

`/manifest/{manifest_id}/audit-trail` is fixed to `query_contract_code = AUDIT_TRAIL` and `ordering_basis = AUDIT_STREAM_SEQUENCE`. It cannot widen its manifest filter beyond the routed manifest.

`/governance/.../audit-investigations` defaults to `AUDIT_TRAIL`. It also accepts `query_contract=run_timeline` and `query_contract=filing_evidence_ledger`. `AUDIT_TRAIL` uses audit stream sequence ordering; timeline and ledger frames use `RECORDED_AT_THEN_STREAM_SEQUENCE`.

## Frame Semantics

`AuditInvestigationFrame` is built from append-only `AuditEvent` rows. `ordered_event_refs[]` is always the primary evidence spine. Trace spans and log refs are supporting context only and never replace audit evidence.

Export posture is derived from server-side authorization, not query parameters:

- full staff sessions receive `FULL_ALLOWED`
- masked staff sessions receive `MASKED_ONLY` and staff-only supporting trace/log refs are removed
- customer/client portal sessions are hidden behind a typed `ProblemEnvelope`

Audit and enquiry responses use `Cache-Control: no-store` because masking, retention, and access posture can change independently of object identity.

## Enquiry Pack Semantics

`GET /enquiry-pack` requires `target_ref`. It returns the latest materialized `EnquiryPack` for that manifest and target. The pack must preserve:

- `primary_path_ref` inside `critical_path_refs[]`
- `retention_binding`
- `limitation_notes[]`
- `omission_entries[]` when masking or retention limits apply
- `audit_refs[]`
- `externalization_governance_contract`

`explanation_status = AVAILABLE` is rejected if masking, omission, or non-full retention posture materially limits the pack. Masked readers do not receive a full-posture pack unless a masked pack has been materialized.

## Failure Semantics

All failures return `ProblemEnvelope` with the narrowest route-local reason codes:

- invalid route or missing `target_ref`
- invalid filters, limits, or cursor
- no materialized audit/enquiry artifact
- customer or tenant-mismatched access
- corrupt frame or pack contract

No route falls back to framework-default errors.
