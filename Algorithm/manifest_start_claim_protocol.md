# Manifest Start Claim Protocol

This contract defines the concurrency-critical protocol for the `SEALED --run_started--> IN_PROGRESS`
boundary. A manifest start claim is not a best-effort status flip. It is the single-writer control
record that binds lease ownership, first post-seal execution, recovery eligibility, and successor
reclaim lineage.

## 1. Durable control object

Every manifest that has reached `sealed_at` SHALL carry one authoritative
`manifest_start_claim{...}` object. The object freezes:

- the exact `manifest_id`, `manifest_hash`, `execution_basis_hash`, and `access_binding_hash`
  protected by the start claim
- one stable `attempt_lineage_ref` that survives same-attempt recovery children
- the durable `claim_state` / `claim_status_code` pair that distinguishes claimable sealed state,
  active leased state, stale reclaim posture, and terminal result reuse
- the lease epoch, holder, claim token, acquisition time, expiry time, and release time when
  applicable
- the durable `stage_dag_ref_or_null`, `outbox_batch_ref_or_null`, and
  `first_publication_committed_at_or_null` triple that proves the first post-seal publication
- typed stale-reclaim and release reason codes so recovery and terminal closure stay explicit

`manifest_start_claim{...}` is the authoritative write-side source of truth for start-lease posture.
Queue state, worker memory, and read-side mirrors SHALL NOT substitute for it.

## 2. Legal claim outcomes

`CLAIM_MANIFEST_START(...)` SHALL return exactly one typed outcome:

- `CLAIM_GRANTED`: the caller atomically acquired the start lease and performed `run_started`
- `ALREADY_ACTIVE`: another live lease still owns the same sealed manifest and same attempt lineage
- `ALREADY_TERMINAL`: the manifest already has terminal post-start outcome and the caller must reuse
  that persisted result rather than execute again
- `INVALID_PRESTART_STATE`: the manifest is not a legal pre-start sealed target because pre-start
  invariants, hash binding, or append-only outcome posture already drifted
- `RECOVERY_REQUIRED`: the prior start lease expired and durable checkpoint truth proves recovery is
  required before any fresh dispatch
- `RECLAIM_GRANTED`: the caller became the successor for a stale attempt and resumed from persisted
  checkpoint truth
- `RECLAIM_REJECTED_ACTIVE_LEASE`: reclamation was attempted while the prior lease still remained
  active under policy

Callers SHALL treat every non-granted outcome as fail-closed for new post-seal execution.

## 3. Atomicity rule

When the outcome is `CLAIM_GRANTED`, the same durable write boundary SHALL commit all of the
following together:

- `RunManifest.lifecycle_state = IN_PROGRESS`
- `RunManifest.opened_at = manifest_start_claim.claim_acquired_at_or_null`
- `manifest_start_claim.claim_state = ACTIVE_LEASED`
- the active claim token, holder, epoch, and expiry
- the first durable stage/outbox publication refs plus `first_publication_committed_at_or_null`

There SHALL be no legal committed state where the manifest is opened but the start claim remains
pre-start, where the claim is active but no durable first-publication proof exists, or where a
broker replay can infer execution from queue absence alone.

## 4. Recovery and reclaim

Stale-lease recovery SHALL be explicit:

- a claim becomes reclaimable only when durable expiry proof exists under frozen policy
- reclaim SHALL preserve the same `attempt_lineage_ref`
- reclaim SHALL set `claim_state = STALE_RECLAIM_REQUIRED` plus a non-null
  `stale_reclaim_reason_code_or_null`
- reclaim SHALL continue from the durable stage/outbox publication proof already bound to the claim;
  the recovery child SHALL NOT infer safety from broker silence
- the successor child SHALL be explicit in manifest lineage and SHALL NOT silently downgrade stale
  reclaim into ordinary continuation

Nightly recovery flows SHALL read the same `manifest_start_claim{...}` truth. Scheduler replay,
batch heartbeat loss, or broker redelivery SHALL NOT authorize a second start while an active lease
still exists.

## 5. Invariants

- `SEALED` manifests are strictly pre-start: no `opened_at`, no outputs, no submission refs, no
  drift refs, and `manifest_start_claim.claim_state = UNCLAIMED_SEALED`
- `IN_PROGRESS` manifests SHALL have `manifest_start_claim.claim_state = ACTIVE_LEASED`
- terminal post-start manifests SHALL have `manifest_start_claim.claim_state = TERMINAL_RESULT_RECORDED`
- `FAILED` started manifests SHALL distinguish reclaim-required posture from terminal failure posture;
  they SHALL not collapse those cases into one ambiguous failure state
- same-attempt recovery children SHALL reuse the original `attempt_lineage_ref`; ordinary
  continuation, replay, and new-request children SHALL not impersonate that lineage
- audit events and metrics SHALL make claim conflicts, stale-lease recovery, and duplicate-start
  suppression observable without reconstructing worker-local logs
