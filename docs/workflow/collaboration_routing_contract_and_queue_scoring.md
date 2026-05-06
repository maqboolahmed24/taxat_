# Collaboration Routing Contract And Queue Scoring

`WorkflowItem.routing_contract` is the persisted routing boundary for staff inboxes, workspace rows,
notifications, and automation. Consumers reuse the contract instead of recomputing local ranking or
recommendation heuristics.

## Routing Basis

The basis builder freezes these inputs at `evaluated_at`:

- due posture: `effective_due_at_or_null = min_non_null(sla_due_at, customer_due_at, due_at)`
- waiting posture: `waiting_on_actor`, `waiting_age_hours`, customer, staff, and authority wait pressure
- item age: `queue_entered_at`, `item_age_hours`, and frozen priority base
- ownership posture: current assignee, escalation target, reassignment count, and eligible assignee signals
- assignee eligibility set: skill fit, capacity fit inputs, context reuse, queue affinity, and availability
- queue health inputs: arrival rate, service rate, staffed parallelism, target hours, backlog p90, churn, and stale command rejection rate
- resolution inputs: ownership integrity, evidence readiness, next-action clarity, response guard, lane guard, and freshness
- continuity inputs: active draft lock and active pending command

## Hashes

`routing_profile_hash` is the canonical hash of the frozen `COLLABORATION_ROUTING_FORMULA_V1`
profile, including thresholds and half-lives. Historical replay can pass an older profile snapshot
and produce a different profile hash without changing the contract vocabulary.

`basis_hash` follows the repository contract validator: it is the canonical hash of the persisted
routing contract fields excluding `basis_hash` itself. A changed profile or changed scoring basis
that changes persisted scores, recommendation posture, or the canonical tuple changes the hash.

## Scores And Recommendations

The services translate the formulas in `Algorithm/compute_parity_and_trust_formulas.md`:

- SLA pressure uses due-soon and breach signals, or age pressure with `WORK_SLA_UNBOUND` when no due exists.
- assignment efficiency uses the weighted geometric mean over skill, capacity, context reuse, queue affinity, and availability.
- ownership confidence uses best candidate strength plus deterministic margin.
- resolution confidence applies fail-closed caps for stale response/lane guards, unclear next action, or no current owner.
- escalation pressure combines SLA, handoff churn, ownership gap, authority wait pressure, and item age.
- queue health uses Erlang C, queue churn, stale command rejection, backlog age, and target wait.
- collaboration priority uses the multiplicative weighted signal and queue pressure.

Assignment states:

- `NO_ELIGIBLE_OWNER`: no eligible assignee signal exists.
- `ASSIGN_RECOMMENDED`: the item has no current owner and a best eligible owner exists.
- `REASSIGN_RECOMMENDED`: a different eligible owner beats the current owner by the frozen reassignment gain threshold.
- `KEEP_CURRENT_OWNER`: the current owner remains strongest, or the challenger gain is below threshold.

Escalation states:

- `ESCALATED_ACTIVE`: the item already has an escalation target.
- `ESCALATE_RECOMMENDED`: escalation pressure breaches the frozen threshold, or the current owner is below the continuation floor while a better owner exists.
- `MANUAL_REVIEW_REQUIRED`: routing cannot name an eligible owner and resolution confidence is below floor.
- `NO_ESCALATION`: none of the escalation predicates are active.

## Stable Order

The canonical tuple is:

```text
(collaboration_priority_score desc,
 escalation_rank desc,
 effective_due_at_or_null asc nulls_last,
 resolution_confidence_score asc,
 queue_entered_at asc,
 item_id asc)
```

`rankWorkQueueItems` and `compareCanonicalRoutingSortKeys` use only this tuple, so identical scores
fall through to due date, resolution confidence, queue entry time, and finally item id.

## Continuity

Authoritative `WORKFLOW_ITEM` contracts always set `focused_row_reorder_state = APPLY_IMMEDIATELY`.
Focus deferral is projection-scoped and must be derived by later inbox/workspace projectors.

`draft_safety_state` is `COMMAND_PENDING_PREVENTS_TRANSFER` when an unconfirmed command is active,
`DRAFT_LOCK_PREVENTS_TRANSFER` when a composer draft is active, otherwise `NO_DRAFT_LOCK`. The
recommendation can still be persisted, but no assignment transfer is implied by the contract.
