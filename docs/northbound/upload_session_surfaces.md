# Upload Session Surfaces

`pc_0164` exposes the governed binary-transfer exception outside `POST /v1/commands`:

- `POST /v1/uploads/sessions`
- `PUT /v1/uploads/sessions/{upload_session_id}/blob`
- `GET /v1/uploads/sessions/{upload_session_id}`

Allocation freezes `tenant_id`, `client_id`, `request_id`, `request_identity_ref`, and
`request_version_ref` into `upload_request_binding_contract`. Status reads always preserve those
frozen fields. A live request rebase is represented by `live_request_version_ref`,
`request_binding_state`, and `binding_resolution_basis`; the session is never silently rewritten to
the newer request version.

## PUT Wire Profile

This implementation supports one deterministic blob profile: contiguous chunk-window PUT.

- Allocation declares `byte_count`, `chunk_size_bytes`, `checksum_algorithm_ref`, and the final
  ordered chunk-manifest `checksum`.
- Each `PUT /blob` sends exactly one chunk window at the current contiguous offset or replays an
  already verified prior window.
- The caller supplies `x-upload-offset` and `x-upload-chunk-digest`.
- The default algorithm is `SHA256_CHUNK_HEX_V1`; the final checksum is the domain-kernel ordered
  chunk-digest manifest, not a provider ETag.
- Completed bytes move through integrity, scan, and validation into `ACCEPTED`, but attachment stays
  `CONFIRMATION_REQUIRED` until a separate command confirms attachment.

Duplicate allocation is suppressed by the frozen `(tenant, client, request, request_version,
request_identity, filename, media_type, byte_count, checksum, algorithm, chunk_size)` identity. A
lawful reconnect, browser reload, duplicate retry, or cross-device continuation returns the existing
`upload_session_id` and `storage_ref`.

## Rebase And Recovery

If `live_request_version_ref` advances while bytes are in flight, the same session and storage object
continue. Accepted stale bytes publish `attachment_state = REBIND_REQUIRED`,
`next_action_code = RECONFIRM_REQUEST`, and a stale recovery posture. They do not satisfy the current
request until explicit reconfirmation and attachment confirmation happen through governed state
transitions.

Problem envelopes use `latest_upload_session_ref` as the recovery anchor when a session exists.
Raw upload bytes never traverse `POST /v1/commands`.
