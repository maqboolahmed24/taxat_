# SSE Resume, Rebase, And Sequence Runbook

## Purpose

The streaming substrate under `packages/domain-kernel/src/streaming` is the only lawful place to
compose resumable SSE behavior for experience and workspace endpoints.
Later northbound handlers should publish typed events and recovery contracts through this layer
instead of hand-rolling cursor, heartbeat, or rebase logic.

## Operating rules

1. Treat `stream_recovery_contract` as the authoritative continuity object.
   Raw `resume_token` is transport material only.
2. Keep sequence application strictly monotonic and gap-free within one `frame_epoch`.
3. Finish catch-up before treating live delivery as current.
4. Fail closed into `REBASE_REQUIRED` on epoch advance, compaction, shell drift, or route drift.
5. Fail closed into `ACCESS_REBIND_REQUIRED` on session, access, masking, or schema drift.
6. Use SSE comments for heartbeats so liveness does not masquerade as a business event.
7. Persist cursor state explicitly as `LIVE`, `REBASED`, `REVOKED`, `EXPIRED`, or `CLOSED`.

## Compose a northbound stream

1. Load `stream_scope_catalog.json` and `event_type_catalog.json` through
   `loadStreamingCatalogBundle()`.
2. Build the authoritative `stream_recovery_contract` with `createStreamRecoveryContract()`.
3. Open a `SequenceWindowState` with `openSequenceWindow()` from the caller's last acknowledged
   sequence.
4. On reconnect, evaluate resume legality with `assessStreamResume()` before sending any event.
5. When the decision is resumable, emit typed events with `encodeSseFrame()` and update cursor
   state through `acknowledgeStreamCursor()`.
6. When the decision is `REBASE_REQUIRED` or `ACCESS_REBIND_REQUIRED`, transition the cursor with
   `transitionStreamCursor()` and return the replacement snapshot or recovery contract without
   attempting partial replay.

## Cursor handling

- Cursor ids must derive from principal, session, and recovery contract lineage.
- `resume_token_hash` is persisted, not raw token material.
- Heartbeats may update `last_seen_at` on LIVE cursors only.
- TTL expiry moves cursors to `EXPIRED`; clients never silently resume from expired state.
- Client-initiated close moves cursors to `CLOSED`; rebased cursors remain non-resumable until a
  new bind is created.

## Browser and native shells

- Browser and native consumers must apply the same `scope / epoch / sequence` idempotency rule.
- Reconnect logic must compare the full recovery contract, not only the raw token.
- A rebase selection must replace the old epoch dataset entirely.
- Access or masking drift must trigger fresh bind or snapshot flow rather than stale-cache reuse.

## Observability

- Correlate stream events with `scope / subject / frame_epoch / sequence`.
- Keep transport frames ref-oriented; do not embed declaration text, tokens, or broad privileged
  payloads into SSE data.
- Use the internal `stream-recovery-atlas` to explain epoch seams, compaction, and access-rebind
  posture to operators without exposing raw secrets.
