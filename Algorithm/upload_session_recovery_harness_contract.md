# Upload Session Recovery Harness Contract

## Purpose
This harness proves that governed `ClientUploadSession` recovery stays bound to one frozen
tenant/client/request/request-version lineage across reconnect, request rebase, retry, reload, and
cross-device continuation.

It exists to stop transport recovery from being treated as generic blob resumability. The harness
must prove that the same upload session and storage object survive lawful continuation, that stale
request rebases surface explicit reconfirmation instead of silent rebinding, and that transfer
success alone never reads as request completion.

## Contract boundary
Every deterministic upload recovery regression pack SHALL validate against
`schemas/upload_session_recovery_harness.schema.json`.

That harness is authoritative for:

- frozen upload-session identity continuity across `tenant_id`, `client_id`, `request_id`, and
  `frozen_request_version_ref`
- reuse of the same `upload_session_id` and `storage_ref` across reconnect, retry, and
  cross-device continuation
- explicit live-request drift through `live_request_version_ref` and
  `post_request_projection.request_version_ref`
- the fail-closed rule that `RECONFIRM_REQUEST` appears only after a stale upload has settled into
  accepted-but-stale posture
- the completion boundary separating byte transfer, scanner/checksum posture, validation posture,
  attachment confirmation, and lawful current-request satisfaction

## Required case matrix
The harness SHALL cover all of:

- `MOBILE_RECONNECT`
- `BROWSER_RELOAD`
- `STALE_REQUEST_REBASE`
- `DUPLICATE_ALLOCATION_RETRY`
- `CHECKSUM_OR_SCANNER_DELAY`
- `ATTACHMENT_CONFIRMATION`
- `CROSS_DEVICE_CONTINUATION`

## Required rules
- `pre_session.upload_session_id`, `storage_ref`, `tenant_id`, `client_id`, `request_id`, and
  `frozen_request_version_ref` SHALL match the post-state exactly.
- `post_request_projection.request_version_ref` SHALL mirror the session's
  `live_request_version_ref`; read surfaces must publish live request drift explicitly instead of
  mutating the frozen upload identity.
- stale request-rebase cases SHALL clear `current_request_upload_ref_or_null` until explicit
  reconfirmation occurs.
- duplicate-allocation and cross-device continuation cases SHALL keep
  `duplicate_session_created = false` and `duplicate_storage_ref_created = false`.
- checksum/scanner-delay cases SHALL prove that full byte transfer still does not imply attached or
  current-request-satisfied posture.
- attachment-confirmation cases SHALL prove that `CONFIRM_ATTACHMENT` is distinct from
  transfer/scanner/validation success and that only explicit confirmation produces
  `READY_CURRENT_REQUEST_SATISFIED`.

## Failure modes closed
- resumed uploads minting a second session or storage object after reconnect, retry, or device
  switch
- request rebases mutating an older upload session onto a newer request version
- portal reads inferring request completion from transfer success while checksum, scanner,
  validation, or attachment confirmation remains incomplete
- stale request cards hiding the current request version while older upload rows remain visible
