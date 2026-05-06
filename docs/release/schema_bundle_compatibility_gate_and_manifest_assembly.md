# Schema Bundle Compatibility Gate And Manifest Assembly

## Scope

`SchemaBundleCompatibilityGateContract` is the shared schema-safety boundary for release evidence. It binds the candidate identity hash to the current schema reader-window contract, historical-manifest protection, replay/restore guard posture, migration chronology, native supported-client posture, destructive-contract eligibility, and rollback versus fail-forward state.

`ReleaseVerificationManifestAssemblyContract` is the deterministic proof tape used before a top-level `ReleaseVerificationManifest` is serialized. It freezes the exact ordered gate rows, first-class result/admissibility refs, companion evidence refs, and explicit decision posture.

## Compatibility Hash Input

`compatibility_gate_hash` is derived from the canonical schema compatibility tuple:

- contract version, candidate identity hash, schema bundle hash, compatibility-window ref, and reader-window state
- migration plan ref, sorted migration ledger refs, supported client-window ref
- historical-manifest, replay/restore, native-client, migration chronology, destructive-contract, and rollback-boundary states
- sorted reason codes
- writer schema bundle hash, sorted supported reader hashes, and sorted protected historical schema hashes from `schema_reader_window_contract`
- fixed compatibility policies

The hash changes when the reader window narrows or closes, protected historical readers change, replay/restore readability changes, migration chronology changes, native client posture changes, or rollback becomes fail-forward only, even when the candidate binary and candidate identity hash stay stable.

## Gate Order

The reusable canonical blocking gate order is:

1. `schema_compatibility`
2. `deterministic_and_state_machine`
3. `northbound_api`
4. `authority_sandbox`
5. `operator_client`
6. `security`
7. `performance_and_canary`
8. `restore_drill`
9. `migration_verification`
10. `supply_chain`
11. `suite_admissibility`

`deriveReleaseGateBindings` accepts first-class gate evidence rows and returns bindings in this order. The manifest assembly model rejects serialized contracts whose `gate_bindings[]` are not already in this order.

## Companion Evidence

Schema, migration-verification, and operator-client gate rows must mirror the non-null `compatibility_gate_hash`. The authority-sandbox row must mirror the non-null `authority_sandbox_coverage_hash`.

Green supporting gates require companion evidence refs in the assembly contract:

- `deterministic_and_state_machine`: `deterministic_golden_pack_ref_or_null`
- `performance_and_canary`: `canary_summary_ref_or_null`
- `operator_client`: `client_compatibility_matrix_ref_or_null`
- `restore_drill`: both `restore_drill_ref_or_null` and `restore_checkpoint_ref_or_null`

## Decision Posture

`APPROVED` requires all gates `GREEN` plus explicit approval and deployment refs. `BLOCKED` requires at least one `RED` gate and no approval, deployment, or supersession refs. `PENDING` clears approval, deployment, and supersession refs. `SUPERSEDED` requires `superseded_by_verification_manifest_ref_or_null` and does not mutate the old assembly contract.

## Persistence

`ReleaseVerificationManifestAssemblyRepository` validates both contract families against the JSON schema callback before persistence. Compatibility gates are keyed by `compatibility_gate_hash`; assembly contracts are keyed by `assembly_contract_hash`. Duplicate writes are idempotent only when the existing immutable payload is byte-stable under canonical JSON hashing.
