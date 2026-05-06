# Low-Noise Context, Summary, and Action Projectors

`packages/backend-low-noise` publishes the first three low-noise surfaces through dedicated
read-side projectors:

- `buildContextBarState`
- `buildDecisionSummaryState`
- `buildActionStripState`

All three consume `LowNoiseSurfaceProjectorInput`, so context posture, attention state, action
candidate ranking, ownership, and investigation routing are normalized from one shared contract.

## Copy And Reason Budgets

Surface copy is normalized by `enforceLowNoiseCopyBudget`. The helper uses caps that stay within
the frozen `LowNoiseExperienceFrameCopyBudget`, while keeping first-view text shorter than the
schema maximums.

`buildDecisionSummaryState` ranks reason candidates deterministically by `rankScore`, then stable
input order. It publishes at most three visible reasons and computes `additional_reason_count` from
the hidden remainder. Visible reason codes are always mirrored into `machine_reason_codes`.

`attention_state = CALM` is fail-quiet: it clears visible reasons, warning count, primary issue, and
blocking copy.

## Action Selection

`scoreAndSelectPrimaryAction` selects one dominant action candidate. Mutation-capable primary
actions are only published when all of these are true:

- the mode safety posture allows live compliance mutations
- the candidate has an explicit frozen mutation precondition binding
- `primary_action_score >= 60`
- `dominance_margin >= action_dominance_min_margin`

If a mutation candidate fails those gates, the action strip degrades to a safe inspect, review, or
refresh posture when one is available. If no governed fallback exists, the strip publishes
`NO_SAFE_ACTION` with a deterministic blocking reason and investigation entry point.

Secondary actions are filtered by `filterVisibleActions`. Published secondary actions are a subset
of `available_action_codes`, disjoint from `blocked_action_codes`, and never expose parallel
mutation options.

## No-Safe And Waiting States

Recovery, stale, degraded, explicit no-safe, and external waiting postures fail closed through the
action strip. Waiting states keep the owner and waiting party machine-readable through
`ownership_posture`, `ownership_label`, and `waiting_on_label`; no-safe states mirror
`investigation_entry_point` into `suggested_detail_surface_code`.
