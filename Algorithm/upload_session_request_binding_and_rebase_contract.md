# Upload Session Request Binding and Rebase Contract

## Purpose
This contract freezes upload-session identity to the allocated request and request version while
making any later request rebase explicit. It prevents reconnect, replay, or customer-safe
projection layers from silently treating old bytes as if they belonged to the current request.

## Contract boundary
Every governed `ClientUploadSession` and every portal upload-row projection SHALL publish one
`upload_request_binding_contract` validated by
`schemas/upload_request_binding_contract.schema.json`.

That contract is authoritative for:

- the frozen tenant, client, and request tuple the session was allocated against
- the request identity the session was allocated against
- the frozen request version at allocation time
- the currently live request version for the same request lane
- whether the session is still current, requires reconfirmation, or has been superseded
- the fail-closed policies for reconnect resume, duplicate-session prevention, duplicate-file reuse,
  in-flight rebase continuity, stale completion, next-action authority, cross-device continuation,
  and attachment authority
- the canonical frozen scope hash that proves the session never drifted across tenant/client/request
  boundaries
- the timestamp when a request rebase was first detected

## Required rules
- Upload-session allocation freezes the request lane. Reconnect or replay SHALL resume the existing
  governed session rather than minting a second session for the same bytes and frozen request
  identity.
- Reconnect, retry, browser reload, and cross-device continuation SHALL reuse the same governed
  `upload_session_id` and `storage_ref` whenever the session remains lawful to resume.
- `frozen_request_version_ref` is immutable session lineage. `live_request_version_ref` is the
  current request version seen by the read side. A difference between them is a rebase fact, not a
  reason to mutate the session in place.
- `frozen_tenant_id`, `frozen_client_id`, `frozen_request_id`, and `frozen_binding_scope_hash`
  SHALL remain stable for the lifetime of the upload session.
- `request_binding_state = ORIGINAL_CURRENT` means the frozen and live request versions still match.
- `request_binding_state = RECONFIRMED_CURRENT` means bytes allocated against an older request
  version were explicitly reconfirmed for the current live request version.
- `request_binding_state = RECONFIRMATION_REQUIRED` means the request rebased and the client must
  explicitly review and reconfirm before the bytes can satisfy the current request.
- `request_binding_state = SUPERSEDED` means the prior bytes are no longer a lawful candidate for
  the current request and may remain only as explicit history or stale carry-forward context.
- Stale bytes SHALL never satisfy the current request silently. Attachment confirmation remains
  lawful only when the session is still current or explicitly reconfirmed.
- If a request rebases while transfer is still in flight, the upload SHALL remain on the same
  governed session and storage lineage with `attachment_state = STAGED`; only an accepted stale
  upload may surface `attachment_state = REBIND_REQUIRED` and `next_action_code = RECONFIRM_REQUEST`.

## Surface consequences
- `ClientUploadSession` SHALL mirror the contract exactly so API reads and recovery handlers do not
  infer request binding from transfer status alone.
- `ClientDocumentRequest` SHALL separate the latest upload lineage from the upload that actually
  satisfies the current request version.
- Portal upload rows SHALL mirror the same grouped contract so browser, mobile, and desktop
  recoveries describe the same rebase posture without depending on hidden staff-only fields.
- `upload_session_recovery_harness` SHALL serialize deterministic reconnect, reload, stale-rebase,
  duplicate-retry, scanner-delay, attachment-confirmation, and cross-device continuation cases so
  the validator and forensic guard can reject silent rebinding or duplicate storage creation.

## Failure modes closed
- active upload sessions silently rebinding to a newer request version
- old bytes finalizing as if they satisfy the current request after rebase
- duplicate upload sessions appearing after reconnect instead of resuming the governed session
- request cards implying current-request satisfaction when only stale upload history exists
- customer-safe projections inferring currentness from transfer success alone
