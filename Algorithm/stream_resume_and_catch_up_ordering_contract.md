# Stream Resume and Catch-Up Ordering Contract

## Purpose
This contract closes stream-recovery ambiguity for manifest experience streams and collaboration
workspace streams. It freezes the route, subject, session, access binding, masking posture,
publication generation, epoch, published frontier, compaction floor, and resume-binding posture so
resume tokens cannot be replayed outside their lawful context and catch-up delivery cannot invent
ordering locally.

## Contract boundary
Every live manifest frame, manifest stream event, persisted manifest cursor, collaboration
workspace snapshot, collaboration workspace stream event, and persisted collaboration cursor SHALL
publish one grouped `stream_recovery_contract` validated by
`schemas/stream_recovery_contract.schema.json`.

That contract is authoritative for:

- the stream scope (`MANIFEST_EXPERIENCE` or `WORKSPACE`)
- the exact route key and mounted subject the stream belongs to
- the shell-stability token for the current route generation
- the session and session-binding hash the resume posture belongs to
- the access-binding hash and masking-context hash that freeze visibility and scope
- the current publication generation, epoch, and published sequence frontier
- the earliest sequence still resumable after compaction
- whether the current delivery window is live-resumable, requires rebase, or requires access
  rebinding
- whether the published resume binding is a raw token or a persisted hash
- the fixed policies for monotonic apply, duplicate handling, catch-up ordering, and rebase triggers

## Required rules
- Resume bindings are exact-route objects, not transport hints. A token or token-hash SHALL bind to
  one stream scope, one route key, one mounted subject, one shell-stability token, one session,
  one access-binding hash, and one masking-context hash.
- Sequence application SHALL be strictly monotonic and gap-free within one epoch. Clients SHALL NOT
  reconstruct order from arrival time, activity timestamps, or payload type.
- Duplicate delivery is legal and SHALL be idempotent by `(stream_scope_class, subject_ref,
  frame_epoch, sequence)`. A duplicate delta or event SHALL never apply semantic side effects twice.
- Catch-up delivery SHALL complete before live delivery is treated as current. Clients SHALL NOT mix
  a newer live delta into state that still has an unfilled catch-up gap.
- `compaction_floor_sequence_or_null` is the earliest lawful resume point for the current delivery
  window. If a persisted cursor last acknowledged a smaller sequence, the server SHALL fail closed
  with explicit rebase posture rather than fabricating missed history.
- `delivery_window_state = REBASE_REQUIRED` is mandatory whenever epoch continuity, compaction
  continuity, shell stability, or route context continuity is broken for the current binding.
- `delivery_window_state = ACCESS_REBIND_REQUIRED` is mandatory whenever session binding, access
  binding, masking posture, or schema compatibility drifts underneath the cursor.
- Manifest and workspace streams SHALL obey the same recovery grammar even though they differ in
  subject identity and guard-vector composition.

## Failure modes closed
- resume tokens reused outside the session, route, scope, or masking context they were issued for
- out-of-order or cross-epoch event application after reconnect
- silent omission of `REBASE_REQUIRED` after history compaction
- duplicate deltas replaying non-idempotent meaning
- catch-up flows interleaving with live delivery and reconstructing the wrong state
- manifest and collaboration clients following different recovery semantics for the same class of
  stream defect

## FE-75 Native Hydration Composition

Persisted native cursors now pair `stream_recovery_contract` with `native_cache_hydration_contract`.
`stream_recovery_contract` decides whether a cursor is live-resumable, requires rebase, or requires
access rebinding. `native_cache_hydration_contract` decides whether cached native content may render
or restore before that stream posture is re-established.

That split closes the previous gap where cache-only restoration could preserve a stale visual shell
or stale resume lineage even after the stream had already fallen into `REBASE_REQUIRED` or
`ACCESS_REBIND_REQUIRED`.
