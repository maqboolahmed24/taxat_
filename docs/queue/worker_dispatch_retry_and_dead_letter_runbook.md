# Worker Dispatch Retry And Dead-Letter Runbook

## Purpose

This runbook defines the shared queue posture for stage workers, authority transmit workers,
reconciliation follow-up workers, projection refresh workers, and recovery jobs.
The queue is delivery fabric only.
Durable outbox, inbox, interaction, checkpoint, and audit truth remain authoritative.

## Queue families

| Family | Queue | Routing key | Ordering scope | Worker |
| --- | --- | --- | --- | --- |
| `STAGE_WORK` | `queue.stage-work` | `worker.stage.execute` | `HASH(manifest_ref, "POST_SEAL_STAGE", stage_code)` | `STAGE_RUNNER` |
| `AUTHORITY_TRANSMIT` | `queue.authority-transmit` | `authority.transmit` | `HASH(tenant_id, client_id, period_ref, operation_family, ordered(runtime_scope))` | `AUTHORITY_GATEWAY_TRANSMITTER` |
| `RECONCILIATION_FOLLOW_UP` | `queue.reconciliation-follow-up` | `authority.reconciliation.follow-up` | `HASH(authority_interaction_ref, duplicate_meaning_key)` | `AUTHORITY_RECONCILIATION_WORKER` |
| `PROJECTION_REFRESH` | `queue.projection-refresh` | `projection.refresh` | `HASH(manifest_ref, projection_family_ref)` | `READ_MODEL_PROJECTOR` |
| `RECOVERY_JOB` | `queue.recovery-job` | `runtime.recovery` | `HASH(attempt_lineage_ref, job_class_ref)` | `RECOVERY_COORDINATOR` |

## Non-negotiable rules

1. Queue packets carry refs, hashes, routing keys, policy refs, and correlation keys only.
2. Queue packets never carry raw declaration text, upload bytes, secrets, access tokens, or authority payload bodies.
3. Ordering is lawful only inside one declared `order_domain_key`.
4. Workers must persist effect proof or inbox truth before ack.
5. Visibility timeout reclaim requires claim fencing so a stale worker cannot ack after successor reclaim.
6. Queue loss is recoverable from durable outbox, inbox, interaction, checkpoint, and audit truth.
7. Queue rebuild must never re-send a live authority mutation from queue memory alone.

## Claim and visibility posture

- Claims are explicit leases with a fence tuple: `(queue_packet_ref, claim_epoch, claim_token, worker_ref)`.
- A worker may extend visibility only while its claim remains active.
- Once visibility expires, a successor worker may reclaim the packet and receives a higher `claim_epoch`.
- Any ack, retry release, or dead-letter action must present the active fence tuple.

## Retry posture

- Retry budgets are serialized in `config/queue/retry_budget_matrix.json`.
- Delay is deterministic:
  `min(backoff_cap_seconds, base_delay_seconds * 2^retry_attempt_count) + phase_offset_seconds`.
- `phase_offset_seconds` is deterministic spread, not random jitter.
- Automatic retry is allowed only when:
  - retry class permits it;
  - budget remains open;
  - required preconditions are satisfied;
  - expected gain remains positive; and
  - authority send legality still clears any external-mutation guard.

## Authority transmit guardrail

- `AUTHORITY_TRANSMIT` packets must carry persisted `resend_legality_state`.
- `TRANSMIT_AUTHORITY_MUTATION` is lawful only while resend legality remains `QUEUED_UNASSESSED`.
- `RECOVER_AUTHORITY_IDEMPOTENT_ATTEMPT` is lawful only while resend legality remains `IDEMPOTENT_RECOVERY_ONLY`.
- The gateway must re-run send-time revalidation immediately before bytes leave the process.
- If revalidation blocks, the packet must fail closed into reconciliation or operator review according to dead-letter policy.

## Dead-letter posture

- Dead-letter classification is serialized in `config/queue/dead_letter_resolution_policy.json`.
- Resolution classes are:
  - `SAFE_REPLAY_FROM_DURABLE_TRUTH`
  - `RECONCILE_THEN_RETRY`
  - `REBUILD_FROM_DURABLE_TRUTH`
  - `OPERATOR_REVIEW_REQUIRED`
  - `TERMINAL_NO_RETRY`
- Every dead-letter record retains queue packet ref, durable truth ref, reason codes, resolution class, and operator action.

## Broker rebuild

When broker state is lost:

1. Rebuild pending packets from durable outbox, inbox, interaction, checkpoint, and audit truth.
2. Skip any packet whose durable disposition is already acknowledged or dead-lettered.
3. Skip any authority packet whose persisted resend legality or send-time revalidation posture blocks replay.
4. Rebuild projections and recovery jobs from durable source truth rather than copying prior queue memory.
5. Record the rebuild as audit-visible transport evidence.

## Investigation checklist

- Confirm the queue family and order-domain formula from `worker_queue_catalog.json` and `order_domain_scope_matrix.json`.
- Confirm whether the packet is awaiting first execution, retry, idempotent authority recovery, or read-only reconciliation.
- Confirm whether inbox truth already proves side effect or duplicate suppression.
- Confirm whether retry budget closed because of exhaustion, failed precondition, or negative expected gain.
- For authority work, confirm persisted resend legality, send revalidation posture, and duplicate-bucket state before any redrive.

## Source grounding

- `Algorithm/deployment_and_resilience_contract.md`
- `Algorithm/core_engine.md`
- `Algorithm/authority_interaction_protocol.md`
- `Algorithm/error_model_and_remediation_model.md`
- `Algorithm/manifest_start_claim_protocol.md`
- `Algorithm/security_and_runtime_hardening_contract.md`
- `Algorithm/observability_and_audit_contract.md`
