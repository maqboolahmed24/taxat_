# Module Catalog and Dependency Edges

## Summary

- Raw `modules.md` heading blocks: `210`
- Canonical module records: `209`
- RUN_ENGINE-bound modules: `104`
- Dependency edges: `218`
- Unresolved or primitive RUN_ENGINE calls: `75`

## Family Counts

| Family | Count |
| --- | ---: |
| `authority` | 24 |
| `authorization` | 5 |
| `canonicalization` | 6 |
| `collection` | 14 |
| `compute` | 17 |
| `drift_amendment` | 12 |
| `experience_projection` | 5 |
| `filing` | 8 |
| `freeze` | 11 |
| `gate` | 15 |
| `graph` | 5 |
| `manifest` | 20 |
| `misc` | 23 |
| `nightly` | 8 |
| `observability` | 7 |
| `read_model` | 4 |
| `replay` | 4 |
| `retention` | 2 |
| `twin` | 7 |
| `workflow` | 12 |

## Most Connected Modules

| Module | Family | Upstream | Downstream | Purity | Boundary |
| --- | --- | ---: | ---: | --- | --- |
| `RECORD_EVENT` | `observability` | 24 | 33 | `event_emitter` | `none` |
| `WRITE_ARTIFACT` | `manifest` | 25 | 8 | `artifact_persister` | `storage` |
| `UPDATE_MANIFEST_OUTPUTS` | `manifest` | 7 | 8 | `mixed` | `none` |
| `FINALIZE_TERMINAL_OUTCOME` | `manifest` | 5 | 8 | `mixed` | `none` |
| `FINALIZE_RUN_FAILURE` | `manifest` | 4 | 5 | `mixed` | `none` |
| `SUBMISSION_GATE` | `gate` | 7 | 1 | `deterministic_builder` | `none` |
| `LOAD_OVERRIDES` | `workflow` | 4 | 4 | `pure_transform` | `none` |
| `EXECUTE_AUTHORITY_CALCULATION_FLOW` | `authority` | 4 | 4 | `external_transport` | `authority` |
| `UPSERT_AMENDMENT_CASE` | `drift_amendment` | 5 | 2 | `state_mutator` | `none` |
| `SELECT_PRIMARY_PROOF_BUNDLE_REF` | `graph` | 4 | 3 | `deterministic_builder` | `none` |
| `FILING_GATE` | `gate` | 3 | 4 | `deterministic_builder` | `none` |
| `DERIVE_TWIN_READINESS` | `twin` | 4 | 3 | `deterministic_builder` | `none` |
| `APPEND_MANIFEST_GATES` | `gate` | 1 | 6 | `state_mutator` | `none` |
| `UPSERT_FILING_CASE` | `filing` | 5 | 1 | `state_mutator` | `none` |
| `SUMMARIZE_TWIN_MISMATCHES` | `twin` | 3 | 3 | `mixed` | `none` |
| `UPDATE_MANIFEST_PRESEAL_CONTEXT` | `manifest` | 3 | 2 | `state_mutator` | `none` |
| `COMPUTE_TWIN_DELTA_SET` | `twin` | 2 | 3 | `deterministic_builder` | `none` |
| `BUILD_TWIN_VIEW` | `twin` | 0 | 5 | `deterministic_builder` | `none` |
| `AMENDMENT_GATE` | `gate` | 2 | 3 | `external_transport` | `authority` |
| `SYNTHESIZE_TRUST` | `workflow` | 3 | 1 | `deterministic_builder` | `none` |
