# GET /v1/manifests/{manifest_id}/experience/stream

`GET /v1/manifests/{manifest_id}/experience/stream?resume_token=...` is the manifest-scoped SSE recovery surface for low-noise experience frames.

Design decisions:

- The endpoint requires a snapshot-issued `resume_token`; token-less bootstrap is not supported. Clients first fetch `GET /v1/manifests/{manifest_id}/experience/snapshot`, then connect the stream with that manifest token.
- `Last-Event-ID` is observability-only. It does not override the persisted `ExperienceCursor`, because recovery is governed by the resume token, grouped `stream_recovery_contract`, and server cursor state.
- Successful responses use `Cache-Control: no-store` and `Content-Type: text/event-stream`.
- Heartbeats are deterministic SSE comments emitted after catch-up in the contract handler. They do not advance semantic sequence state and do not require sleeps in tests.
- Catch-up events are serialized before the heartbeat and before any caller treats the stream as current.

Cursor semantics:

- `ExperienceCursor.cursor_state = LIVE` is the only resumable state.
- `REBASED`, `REVOKED`, `CLOSED`, and `EXPIRED` are terminal records for that persisted cursor. Recovery allocates a successor cursor instead of reopening the old record.
- `last_ack_sequence` cannot exceed `last_published_sequence`.
- Compaction, frame epoch advance, shell stability drift, route drift, or missing catch-up history returns `409 REBASE_REQUIRED` with the latest manifest recovery marker.
- Session, access-binding, masking, tenant, principal, or schema drift returns `403 ACCESS_REBIND_REQUIRED` without replaying cached deltas.

Event semantics:

- Events validate as `ExperienceStreamEvent`.
- Delivery is idempotent by `(MANIFEST_EXPERIENCE, manifest_id, frame_epoch, experience_sequence)`.
- Duplicate delivery is legal but does not produce duplicate semantic application.
- `terminal.bundle` is ordered by `experience_sequence` like `experience.delta` and `experience.snapshot`; it is not promoted ahead of missing catch-up.
