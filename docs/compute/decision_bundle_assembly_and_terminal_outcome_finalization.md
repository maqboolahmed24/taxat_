# Decision Bundle Assembly And Terminal Outcome Finalization

`DecisionBundle` is the terminal read-side projection for one manifest. It is persisted after terminal or review posture is known, then mirrored into the `RunManifest` append-only outcome projection.

## Assembly

- `buildDecisionBundleRecord` constructs schema-shaped bundles with `artifact_type = DecisionBundle`.
- `decision_reason_codes` is always the first three `reason_codes`; `dominant_reason_code` is always `reason_codes[0]`.
- `buildDecisionExplainabilityContract` mirrors the compressed reason prefix, dominant reason, suppressed count, semantic qualifiers, and action projection.
- `ACTION_AVAILABLE` requires `primary_action_code` in `next_action_codes` and absent from `blocked_action_codes`.
- `NO_SAFE_ACTION` clears `next_action_codes` and `primary_action_code`, while persisting a machine reason and detail surface.

## Outcome Bridge

- `COMPLETED` maps to `FINAL_SUCCESS`; `BLOCKED` maps to `FINAL_BLOCKED`.
- `REVIEW_REQUIRED` remains terminal for manifest lifecycle purposes and maps to the specific review class: human, approval, authority, late data, or out-of-band review.
- Authority postures `CONFIRMED`, `REJECTED`, `UNKNOWN`, `OUT_OF_BAND`, and `AUTHORITY_*` equivalents drive `decision_status`, `outcome_class`, `checkpoint_state`, and `truth_state`.
- Authority pending and unknown outcomes require `submission_record_id` and at least one open `workflow_item_ref`.

## Reference Set

- `primary_proof_bundle_ref` requires `graph_id`.
- `twin_id` requires both `graph_id` and `parity_id`.
- Pre-start blocked bundles reject snapshot, compute, forecast, risk, parity, trust, graph, twin, filing, submission, replay, proof, and gate-record refs.
- Resolved workflow refs are filtered before bundle persistence so terminal reload surfaces only unresolved work.

## Manifest Finalization

`finalizeTerminalOutcome` persists the bundle, computes the deterministic outcome hash using the manifest component inventory profile, synchronizes `RunManifest.append_only_outcome_projection`, and applies the legal lifecycle transition.

- `COMPLETED` and `REVIEW_REQUIRED` use `run_completed`, so review-required bundles leave `RunManifest.lifecycle_state = COMPLETED`.
- `BLOCKED` after start uses `gate_block`.
- Pre-start blocked finalization uses `seal_blocked`.
- Same-request retry against a terminal manifest reloads the persisted bundle and does not allocate a continuation child.

## Determinism

`computeDecisionBundleDeterministicOutcomeHash` feeds ordered components into the existing manifest deterministic outcome hasher: decision bundle, gate sequence, snapshot, compute, forecast, risk, parity, trust, graph, twin, filing packet, authority result, late-data basis, and drift record. Persistence noise fields are normalized by the manifest hasher, keeping repeated same-basis hashes byte-stable.
