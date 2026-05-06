# Gate Decision Record And Ordered Gate Evaluation Engine

`pc_0126` implements the non-access gate chain as durable command-side records. The implementation follows `gate_decision_record.schema.json`, `gate_semantics_contract.schema.json`, `decision_explainability_contract.schema.json`, `command_truth_boundary_contract.schema.json`, and the ordered gate tables in `Algorithm/exact_gate_logic_and_decision_tables.md`.

The canonical order is data in `get_canonical_gate_stage_profile.ts`: manifest, artifact contract, input boundary, data quality, retention evidence, parity, trust, conditional amendment, conditional filing, conditional submission. `ACCESS_GATE` is intentionally outside this engine. Conditional gates are only selected when the normalized runtime `effective_scope` contains the required action token; missing required inputs become deferred gates, not inapplicable gates.

Each `GateDecisionRecord` freezes:

- exact gate code and stable `gate_stage_index`
- canonical `effective_scope` with one reporting token first
- ordered reason codes with `dominant_reason_code` equal to the first reason
- decision severity/rank/progression/override semantics
- command-side truth boundary, input refs, prerequisite gate refs, override state, and next actions

Persistence is append-only. The repository allows idempotent replays of the exact same payload, but rejects same-manifest same-stage or same-code mutations. Manifest projections are rebuilt from durable records and preserve the previous records' `decided_at`, reason order, and scope while computing the progression ceiling so later passes cannot soften an earlier hard block.
