# Northbound Recovery And Rebind Failure Paths

## Split

`REBASE_REQUIRED` is used when the caller is still entitled to the same object shell, but the route generation is no longer continuous. The canonical causes are frame epoch advance, shell stability change, route context change, or history compaction.

`ACCESS_REBIND_REQUIRED` is used when the continuity object is no longer lawful under the active session or visibility binding. The canonical causes are session binding drift, access binding drift, masking posture drift, principal class change, tenant switch, session revocation, or schema incompatibility.

## Resume Binding

Raw `resume_token` values stay transport material on snapshots and stream events. Persisted `ExperienceCursor` and `WorkspaceCursor` records store the hashed resume binding in their grouped `stream_recovery_contract`.

Live cursors publish:

- `delivery_window_state = LIVE_RESUMABLE`
- `resume_binding_representation = HASHED_TOKEN`
- `resume_binding_ref_or_null = resume_token_hash`

Rebased or revoked cursors clear the resume binding. Rebased cursors publish a replacement snapshot ref and replacement stability contract. Revoked cursors do not publish replacement refs.

## Problem Envelopes

Access-rebind problems intentionally do not publish projection recovery refs or latest resume tokens. The client must reacquire the route through an authorized snapshot path.

Rebase problems publish one recovery basis only:

- manifest stream rebase uses `latest_resume_token` plus the current manifest route stability contract
- collaboration stream rebase uses a receipt-backed `latest_workspace_snapshot_ref` when a fresh snapshot is available; the deterministic `stream-recovery-receipt://...` anchor is derived from the correlation id and snapshot ref when no command receipt was created by an upstream mutation
- collaboration stream rebase only falls back to `latest_resume_token` when no projection recovery ref is published
- command stale-view failures may publish a projection ref only with a durable command receipt anchor

Portal-facing surfaces are clamped to customer-safe surfaces by the shared problem-envelope builder.

## Shell Stability Guards

Shell-stability mismatch is always classified as `REBASE_REQUIRED`. Manifest streams report the current shell token as `SHELL_STABILITY_TOKEN` when shell drift is explicit, and otherwise use `FRAME_EPOCH`. Workspace streams report shell drift as `SHELL_STABILITY_TOKEN`; route, epoch, and compaction failures report `WORK_ITEM_VERSION` because the workspace mutation precondition schema does not publish a frame-epoch guard family.
