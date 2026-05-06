# Reconciliation Analytics Snapshot and Operator Queries

`AuthorityReconciliationAnalyticsSnapshot` is a replay-safe derived artifact for one authority
operation profile, provider environment, operation family, and exact time window.

## Source Policy

Snapshots use `source_policy = DURABLE_RECONCILIATION_CONTROL_CONTRACTS_ONLY`. The builder accepts
`AuthorityInteractionRecord` objects and reads only the persisted
`reconciliation_control_contract` plus durable interaction lineage refs. Retry-worker counters,
broker redelivery counts, browser telemetry, and raw response payloads are not accepted as
authoritative analytics inputs.

## Window Policy

Windows are `window_started_at <= control.last_budget_event_at < window_ended_at`. The start is
inclusive and the end is exclusive. Interactions are lineage-deduplicated by the persisted duplicate
meaning key from the control contract; if several records describe the same exact meaning, the latest
control packet by `last_budget_event_at`, then `last_status_at`, is selected and older replayed or
superseded refs are reported as excluded.

Zero-interaction windows are valid and emit empty `interaction_refs[]`, total count `0`, zeroed
budget/outcome counts, and `NO_CHANGE_RECOMMENDED`.

## Derived Fields

- `budget_state_counts[]`: count selected control `reconciliation_budget_state`.
- `outcome_class_counts[]`: count selected control `outcome_class_for_analytics`.
- `resend_refusal_reason_counts[]`: count durable resend-control reasons only when resend posture is
  blocked or closed.
- `escalation_reason_counts[]`: count control `escalation_reason_codes[]`.
- `unresolved_ambiguity_count`: count ambiguous outcome, contradictory/manual/out-of-band posture, or
  ambiguous durable unresolved reason codes.
- `deadline_expiry_count`: count deadline-expired reason codes or non-active controls whose deadline
  is at or before the last budget event.
- `replay_resume_count`: count selected lineages whose durable audit, provenance, or escalation
  evidence refs name replay, resume, or restore.
- `average_attempts_consumed` and `max_attempts_consumed`: derive from persisted
  `reconciliation_attempt_count`.
- `escalation_latency_seconds_p95_or_null`: nearest-rank p95 from interaction creation to durable
  `reconciliation_escalated_at`, falling back to the control last budget event.
- `tuning_recommendation_codes[]`: deterministic recommendations from persisted counts and ratios.

## Query Contract

The repository indexes snapshots by profile, provider environment, operation family, and window.
Queries support unresolved-only, escalation-only, resume-heavy, and ambiguity-heavy slices. Hotspot
queries rank ambiguity, resend refusal, escalation latency, and replay-resume pressure from the
persisted snapshot fields.

The admin surface is read-only. It projects one selected snapshot window at a time and never treats
operator filters, table clicks, or browser state as source-of-truth.
