# Contract, Schema, Script Cross-Reference Index

This report is the machine-generated bridge between the Taxat algorithm corpus and the repository enforcement surfaces.
It unifies prose contracts, schema artifacts, sample payloads, validator symbols, forensic guard themes, live constraint coverage, and historical closure context into one deterministic map.

## Corpus Summary

- Total logical families indexed: `784`.
- Object families: `241`.
- Contract families: `76`.
- State-machine families: `34`.
- Validator families: `198`.
- Forensic guard families: `226`.
- Live constraint families: `9`.

## Coverage Status

- `fully_mapped`: `647`.
- `partially_mapped`: `101`.
- `doc_only`: `19`.
- `schema_only`: `0`.
- `validator_only`: `3`.
- `gap`: `14`.

## Outputs

- Canonical JSON index: `data/analysis/contract_schema_script_index.json`.
- Flat CSV export: `data/analysis/contract_schema_script_index.csv`.
- Object-family enforcement view: `data/analysis/object_family_to_enforcement_map.json`.
- Gap register: `data/analysis/enforcement_gap_register.json`.
- Graph projection: `docs/analysis/03_contract_enforcement_graph.mmd`.

## High-Signal Gaps

- Schemas without a clear prose anchor: `6`.
- Data-model families without a schema artifact: `5`.
- Validator families without a prose anchor: `4`.
- Forensic guard families without a prose anchor: `7`.
- Duplicate `CUSTOM_VALIDATORS` keys surfaced: `3`.

## Representative Non-Full Rows

| ID | Kind | Status | Coverage | Gap notes |
| --- | --- | --- | --- | --- |
| `CONSTRAINT_CC_08` | `constraint_family` | `partially_mapped` | `prose+sample+validator+guard+constraint+history` | n/a |
| `DOC_AUDIT_AND_PROVENANCE` | `contract_family` | `doc_only` | `prose` | n/a |
| `DOC_CROSS_SHELL_DESIGN_TOKEN_AND_INTERACTION_LAYER_FOUNDATION_CONTRACT` | `contract_family` | `partially_mapped` | `prose+schema+sample+guard+constraint` | n/a |
| `DOC_DOMINANT_QUESTION_AND_SINGLE_ACTION_CONTRACT` | `contract_family` | `partially_mapped` | `prose+schema+guard+constraint` | n/a |
| `DOC_EMBODIMENTS_AND_EXAMPLES` | `contract_family` | `doc_only` | `prose` | n/a |
| `DOC_GLOSSARY` | `contract_family` | `doc_only` | `prose` | n/a |
| `DOC_INPUT_BOUNDARY_AND_CUTOFF_CONTRACT` | `contract_family` | `doc_only` | `prose` | n/a |
| `DOC_INVARIANTS_AND_GATES` | `contract_family` | `doc_only` | `prose` | n/a |
| `DOC_LOW_NOISE_SURFACE_COMPRESSION_AND_NOISE_BUDGET_AUDIT_CONTRACT` | `contract_family` | `doc_only` | `prose` | n/a |
| `DOC_RETENTION_ERROR_AND_OBSERVABILITY_CONTRACT` | `contract_family` | `doc_only` | `prose` | n/a |
| `DOC_SEMANTIC_SELECTOR_AND_ACCESSIBILITY_CONTRACT` | `contract_family` | `doc_only` | `prose` | n/a |
| `DOC_SEMANTIC_SELECTOR_AND_ACCESSIBILITY_REGRESSION_PACK_CONTRACT` | `contract_family` | `doc_only` | `prose` | n/a |

## Method Notes

- Object-family extraction starts from `Algorithm/data_model.md` and unions in schema-backed families from `schemas/` plus state-machine families from `Algorithm/state_machines.md`.
- Validator extraction uses AST parsing of `Algorithm/scripts/validate_contracts.py` to read `CUSTOM_VALIDATORS` and the live pipeline stage functions.
- Forensic guard extraction uses AST parsing of `Algorithm/tools/forensic_contract_guard.py` to read the ordered `run_guard_checks()` execution list.
- Constraint rows are sourced directly from `Algorithm/constraint_traceability_register.json` and cross-linked back into schema, validator, and guard families.
