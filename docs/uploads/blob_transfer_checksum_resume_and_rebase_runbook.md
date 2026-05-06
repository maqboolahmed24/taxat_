# Blob Transfer, Checksum, Resume, And Rebase Runbook

## Purpose

This runbook defines how later northbound upload endpoints compose the governed upload-transfer
scaffold from `packages/domain-kernel/src/uploads`.

The key rule is stable throughout every endpoint:

- byte transfer is not attachment truth
- attachment truth is not current-request satisfaction
- reconnect, duplicate retry, reload, and cross-device continuation always reuse the same
  `upload_session_id` and `storage_ref` while the session remains lawful

## Canonical flow

1. Allocate the session with `allocateUploadTransferSession(...)`.
2. Persist the returned frozen `upload_request_binding_contract`, `storage_ref`, and
   `resume_token_ref` with the durable upload-session record.
3. On every blob append, call `appendUploadTransferChunk(...)` with the current contiguous offset.
4. After the final chunk window is present, call `closeUploadTransfer(...)`.
5. Publish scanner and validation outcomes with `recordUploadMalwareScanVerdict(...)` and
   `recordUploadValidationOutcome(...)`.
6. Re-evaluate completion posture with `refreshUploadCompletionBoundary(...)`.
7. Only after a separate attachment confirmation command succeeds should the runtime call
   `confirmUploadAttachment(...)`.

## Endpoint composition

### `POST /v1/uploads/sessions`

- Validate tenant, client, request, and request version before allocation.
- Reject stale or cross-scope request identities rather than mutating an existing session.
- Return the frozen `request_version_ref`, grouped `upload_request_binding_contract`,
  `storage_ref`, `resume_token_ref`, `resumability_state`, and `next_action_code`.
- If the caller retried an allocation for the same lawful session, return the existing session
  instead of minting a second session or second storage object.

### `PUT /v1/uploads/sessions/{upload_session_id}/blob`

- Read the governed session and offset tracker first.
- Accept bytes only at the contiguous resume offset or as a duplicate replay of an already
  verified chunk window.
- Verify the supplied chunk digest against the configured catalog before marking the chunk as
  durable.
- Never infer attachment, request satisfaction, or currentness from a full byte count.

### `GET /v1/uploads/sessions/{upload_session_id}`

- Preserve the original frozen `tenant_id`, `client_id`, `request_id`, and `request_version_ref`.
- Publish the grouped `upload_request_binding_contract` with the current live request version.
- Keep `request_binding_state`, `resumability_state`, `attachment_state`, `next_action_code`,
  `integrity_state`, `malware_scan_state`, and `validation_state` separate.
- If the live request rebased, show that drift through the grouped contract and
  `request_binding_state` rather than silently rewriting the session.

## Rebase rules

- `rebaseUploadRequestBinding(...)` keeps the same `upload_session_id` and `storage_ref`.
- In-flight rebases preserve `attachment_state = STAGED`.
- Accepted stale uploads must surface `attachment_state = REBIND_REQUIRED` and
  `next_action_code = RECONFIRM_REQUEST` until an explicit reconfirmation command lands.
- `SUPERSEDED` means the prior bytes stay historical only; they do not satisfy the current request.

## Completion boundary rules

- `closeUploadTransfer(...)` verifies transfer integrity and moves the session into scan posture.
- `recordUploadMalwareScanVerdict(...)` and `recordUploadValidationOutcome(...)` decide whether the
  uploaded bytes are acceptable evidence, replacement-only, or rejected.
- `confirmUploadAttachment(...)` is the first point where attachment truth may become `ATTACHED`.
- `assessUploadCompletionBoundary(...)` is the single authority for mapping byte, checksum, scan,
  validation, attachment, and request-binding posture into `next_action_code`.

## Recovery matrix

The deterministic harness must always cover:

- `MOBILE_RECONNECT`
- `BROWSER_RELOAD`
- `STALE_REQUEST_REBASE`
- `DUPLICATE_ALLOCATION_RETRY`
- `CHECKSUM_OR_SCANNER_DELAY`
- `ATTACHMENT_CONFIRMATION`
- `CROSS_DEVICE_CONTINUATION`

Use `createUploadRecoveryHarnessCase(...)` and `createUploadSessionRecoveryHarness(...)` to render
those scenarios into a typed regression pack.

## Operational notes

- The checksum catalog is intentionally vendor-neutral. The recommended profile is
  `SHA256_CHUNK_HEX_V1`, but the runtime stays free to negotiate other profiles later.
- The scaffold never exposes raw object URLs, signed URLs, or temporary provider handles as
  product truth.
- Storage lineage stays subordinate to the governed upload session and the upload-session source
  object in the storage lifecycle boundary.
- Later portal routes should treat `latest_upload_ref_or_null` as history and
  `current_request_upload_ref_or_null` as current-request satisfaction only.
