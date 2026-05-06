# Low-Noise Experience Delta Publication

`ExperienceDelta` publication is a pure byproduct of immutable low-noise frame publication. The backend takes a previous `LowNoiseExperienceFrame`, a next frame, and a server-issued sequence frontier, then emits either one deterministic delta or a typed coalescing decision. The transport layer can replay the same frame inputs without widening or mutating the shell meaning after publication.

## Materiality

A change is treated as material when it is the first frame for a route, crosses a `frame_epoch`, or the caller explicitly classifies the frame transition as `MATERIAL`. Material deltas publish all governed surface changes and stamp each update with the next frame's material timestamp.

A same-epoch refresh is non-material by default. Non-material refreshes may publish only when they preserve the calm-shell continuity budget: dominant question and primary action remain stable, focus is not lost, rank movement is bounded, prominent motion is bounded, and the visible-change burst stays within the frozen budget.

## Continuity Cost

The backend computes the frozen formula from consecutive frames:

```text
continuity_cost =
  5 * dominant_question_changed
  + 4 * primary_action_code_changed
  + 3 * focus_anchor_ref_lost
  + 2 * rank_swap_count
  + 2 * prominent_motion_count
```

The non-material limits are the constants in `lowNoiseCognitiveBudget`: rank swaps at most `1`, prominent motion at most `1`, continuity cost at most `6`, and visible promoted changes at most `2` per coalescing window.

## Coalescing Outcomes

`PUBLISH` emits the delta. `HOLD_UNTIL_MATERIAL` suppresses a same-epoch delta when dominant question, primary action, or continuity cost would churn the shell; dominant-question and primary-action changes are explicit coalescing reasons even when the numeric cost still fits the ceiling. `COLLAPSE_TO_COUNTS` suppresses visible burst churn while letting downstream systems represent count or freshness changes. `DETAIL_LOCAL_ONLY` suppresses lower-ranked drawer or refresh effects that are lawful but too noisy for a shell-level delta.

## Mirror Contract

Every published delta is validated before return. Top-level convenience fields mirror `attention_policy` exactly for attention state, primary object, actionability, primary action, no-safe-action reason, secondary notice count, detail entry points, and suggested detail surface. `affected_surface_codes` must equal the actual `surface_updates[].surface_code` set, and action strip payload state must agree with shell actionability.

The schema validator is applied to delta payloads against `experience_delta.schema.json`. The local publication validator covers the runtime mirror and budget invariants that stream consumers rely on.

## Ordering And Idempotency

`publishExperienceDeltaBatch` rejects mixed `frame_epoch` batches. Duplicate `frame_id`s are skipped so replayed deliveries remain idempotent. Published deltas receive strict monotonic `experience_sequence` values from the provided sequence frontier; suppressed non-material refreshes do not consume sequence numbers.
