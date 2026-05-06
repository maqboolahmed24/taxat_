# Outbox, Inbox, and Idempotency Runbook

## Purpose

The shared messaging foundation keeps packets as transport-only evidence. Durable source records,
transactional outbox rows, transactional inbox rows, and downstream ledgers remain the legal truth.

## Core Rules

1. Persist the source record before publishing any packet.
2. Freeze `duplicate_meaning_key`, `request_hash`, and `idempotency_key` on the outbox-side source truth.
3. Treat broker delivery as rebuildable transport. Packet ids, delivery counters, and queue history are never authoritative truth.
4. Run durable inbox dedupe and source-record continuity checks before any mutation.
5. Dead-letter or quarantine after safe retries are exhausted. Do not loop blindly.

## Identity Posture

- `duplicate_meaning_key`: retry and reconciliation bucket for the same business meaning.
- `request_hash`: exact sealed-send identity.
- `idempotency_key`: durable duplicate-meaning identity that survives lawful resend of the same meaning.

Authority traffic keeps those concepts separate on purpose. Lawful token rotation within one frozen
binding lineage may change `request_hash` while preserving `duplicate_meaning_key` and
`idempotency_key`.

## Source-Record Continuity

Inbox delivery is mutation-safe only when the referenced source record is still present and current.

- `CURRENT`: continue through claim, side effect, and acknowledgement.
- `STALE`: quarantine and require operator review or explicit replay from current truth.
- `MISSING`: quarantine immediately. Do not infer truth from broker payload alone.

## Retry and Dead-Letter Posture

- Commands and worker-stage packets dead-letter after bounded safe retries.
- Authority request and ingress packets quarantine after bounded safe retries because legal meaning or correlation may have drifted.
- Redrive is lawful only when the same durable meaning still holds.

## Redaction Posture

Packets, inbox rows, and observability traces may carry refs, hashes, reason codes, and safe routing
hints. They may not carry:

- raw secrets or token values
- plaintext authority request or callback bodies
- signed URLs or inline blob content used as durable truth
- customer plaintext copied out of protected ledgers

## Restore and Recovery

Recovery rebuilds outstanding work from durable source, outbox, inbox, ingress, interaction, and
submission truth. Do not rebuild legal state by replaying broker history.
