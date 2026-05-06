# Twin State Snapshot, View, and Mismatch Summary Builder

`pc_0131` adds `packages/backend-twin`, marked `ASSUMPTION_TWIN_PACKAGE_CREATED` because the shared operating contract requires a twin package and no existing package was present.

The implementation cross-checks `twin_state_snapshot`, `twin_delta_arc`, `twin_timeline`, `twin_mismatch_summary`, `twin_readiness_state`, and `twin_view` schemas, the twin validator rules, `twin_view_contract.md`, `modules.md`, `state_machines.md`, `data_model.md`, authority-truth separation, patch notes, and test vectors `TV-45` through `TV-49C`.

## Contracts

- `comparison_key` uses `TWIN_KEY_V1_SHA256` and is derived only from subject class, identity, scope, period, basis, partition, and lineage anchor. Value/status/freshness data never changes the key.
- `AUTHORITY` snapshots reject subjects that are not authority-originated or reconciliation-proven.
- Subject-key collisions and contradictory lane components force `assembly_state = CONTRADICTORY`; contradiction refs remain subsets of component refs.
- Delta classification emits one terminal `TwinDeltaArc` per normalized key and persists comparability state, reason code, precedence rank, materiality, resolution, and priority rank.
- `priority_rank` follows the validator formula: materiality, resolution, subject class, authority escalation, freshness escalation, and confidence escalation.
- `TwinMismatchSummary` is computed from persisted ranked deltas. `top_mismatch_refs[]` mirrors `top_ranked_mismatches[].delta_arc_ref` in rank order.
- Readiness does not derive from filing readiness alone. Missing baseline, stale authority, contradictory posture, non-live execution, and unresolved reconciliation cap safe action and usefulness explicitly.

## Generated Binding Note

Generated twin type names exist in `packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts`, but that generated shard currently references unresolved cross-file symbols when imported directly. The backend-twin models therefore keep local schema-shaped record types with the same field names while enforcing the checked schema and Python validator invariants. This avoids forking semantics while keeping the package compileable.

## pc_0132 Boundary

`TwinView` requires reconciliation and interpretation refs, but `pc_0132` owns those artifact models. `pc_0131` writes deterministic reserved refs:

- `twin-reconciliation-state://{twinId}/reserved-pc0132`
- `twin-interpretation-state://{twinId}/reserved-pc0132`

Those refs are stable placeholders for the follow-up service layer, not renderer-local state.
