# Queue Health And Escalation Analytics

`pc_0156` makes queue health a backend-authored contract instead of a UI badge heuristic.

## Frozen Input Collection

- `arrival_rate_q`: accepted work items whose `queue_entered_at` falls inside the frozen rolling window, divided by `rolling_window_hours`.
- `service_rate_q`: resolved items inside the same rolling window, divided by staffed hours. If there are no staffed hours, the service rate is `0`.
- `staffed_parallelism_q`: explicit frozen override when supplied; otherwise the distinct active assignee count for active rows in the queue.
- `backlog_age_p90_hours_q`: nearest-rank p90 of active item queue age at `evaluated_at`.
- `stale_view_rejection_rate_q`: rejected stale commands divided by `max(1, mutating_command_attempts_q)`.
- `reassignment_churn_q`: reassignment count over the 30-day queue basis divided by `max(1, resolved_30d_q)`.

The default rolling window is 24 hours. A scheduled publisher and on-demand rebuild both use `queryQueueHealthSnapshot`, so replay freezes the same input basis before building the contract.

## Formula And Thresholds

`computeWorkQueueHealth` implements the queue-health formula from `Algorithm/compute_parity_and_trust_formulas.md`.

- `staffed_parallelism_q = 0`, `service_rate_q = 0`, or `rho_q >= 1` sets `P_wait_q = 1` and `expected_wait_hours_q = POSITIVE_INFINITY`.
- `queue_health_signal_q` is clamped to `[0, 1]`.
- `queue_health_score_q = round_score(100 * queue_health_signal_q)`.
- `queue_pressure_score_q = max(0, 100 - queue_health_score_q)`.
- `queue_health_state = HEALTHY` when the score meets the frozen floor, `SATURATED` when capacity is exhausted or the score is below 35, otherwise `DEGRADED`.

Recommendations are deterministic:

- `HEALTHY` -> `NONE`
- capacity saturation -> `STAFFING_REVIEW`
- score below 35 without a capacity reason -> `MANUAL_TRIAGE`
- high reassignment churn while below floor -> `REBALANCE`
- high stale-view rejection while below floor -> `MANUAL_TRIAGE`
- other below-floor posture -> `REBALANCE`

## Hashing

`routing_profile_hash` is carried from the frozen collaboration routing profile or from the routing contracts being published.

`queue_health_contract.basis_hash` follows the canonical schema validator: it is the stable JSON hash of the accepted work-queue-health contract fields excluding `basis_hash`. The raw formula input basis is separately exposed as `analytics_basis_hash` on `QueueHealthAnalyticsSnapshot`.

## Publication

`publishQueueHealthPosture` queries or accepts workflow items, builds a `QueueHealthAnalyticsSnapshot`, stamps its `work_queue_health_contract` onto `WorkInboxSnapshot.queue_health_contract`, and mirrors score, pressure, floor, and state into every row `queue_projection.routing_contract`.

The UI and preview surfaces must consume the serialized contract only. They must not recompute health from backlog count, unread count, local clocks, or browser arrival order.
