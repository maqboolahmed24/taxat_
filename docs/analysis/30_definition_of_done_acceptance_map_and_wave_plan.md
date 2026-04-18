# Definition Of Done Acceptance Map And Wave Plan

Generated on `2026-04-18` from the live checklist, the execution DAG, the acceptance-law corpus, and the release evidence contracts.

## Summary

- Checklist tasks normalized: `428`
- Phase records: `8`
- Parallel wave blocks: `4`
- Tasks with explicit typed gaps: `33`
- Tasks touching at least one release gate: `333`
- Current first incomplete task under AGENT law: `pc_0030`
- Current claimable set: `pc_0030`
- Next blocked boundary: `pc_0031`

## Acceptance Layers

1. `roadmap_task_completion`
   A task is locally done only when the checklist state, the card evidence, and the declared deliverables all line up.
2. `blueprint_coverage_closure`
   The task must advance named `FE-*`, `BE-*`, and `SYS-*` coverage together with linked test vectors and constraint refs.
3. `release_admissibility`
   Release truth is separate from task completion. Where a task affects a blocking gate, the map points to the exact gate families and evidence artifact classes instead of implying readiness by adjacency.

## Phase Exit Overview

| Phase | Tasks | Blueprint Refs | Gate Families | Current Open |
| --- | --- | --- | --- | --- |
| phase_00 | 30 | 65 | 11 | pc_0030 |
| phase_01 | 28 | 65 | 6 | closed |
| phase_02 | 26 | 65 | 5 | closed |
| phase_03 | 84 | 63 | 11 | closed |
| phase_04 | 60 | 65 | 11 | closed |
| phase_05 | 72 | 54 | 9 | closed |
| phase_06 | 91 | 65 | 11 | closed |
| phase_07 | 37 | 65 | 11 | closed |

## Parallel Wave Overview

| Wave | Tasks | Tracks | State | Gate Sample |
| --- | --- | --- | --- | --- |
| phase_03_parallel_wave_01 | 84 | 7 | blocked | NORTHBOUND_API, OPERATOR_CLIENT, SCHEMA_COMPATIBILITY, MIGRATION_VERIFICATION |
| phase_04_parallel_wave_02 | 60 | 6 | blocked | SUITE_ADMISSIBILITY, SCHEMA_COMPATIBILITY, MIGRATION_VERIFICATION, NORTHBOUND_API |
| phase_05_parallel_wave_03 | 72 | 6 | blocked | SCHEMA_COMPATIBILITY, MIGRATION_VERIFICATION, NORTHBOUND_API, OPERATOR_CLIENT |
| phase_06_parallel_wave_04 | 91 | 8 | blocked | SCHEMA_COMPATIBILITY, MIGRATION_VERIFICATION, SUITE_ADMISSIBILITY, DETERMINISTIC_AND_STATE_MACHINE |

## Task Matrix Sample

| Task | Phase | Deliverable | Blueprint Groups | Vector Sample | Gate Sample |
| --- | --- | --- | --- | --- | --- |
| pc_0001 | phase_00 | analysis_pack | system_pass_chain | n/a | n/a |
| pc_0002 | phase_00 | analysis_pack | system_pass_chain | n/a | n/a |
| pc_0003 | phase_00 | analysis_pack | system_pass_chain | n/a | SCHEMA_COMPATIBILITY, MIGRATION_VERIFICATION |
| pc_0004 | phase_00 | analysis_pack | system_pass_chain | n/a | n/a |
| pc_0005 | phase_00 | analysis_pack | system_pass_chain | n/a | n/a |
| pc_0006 | phase_00 | analysis_pack | system_pass_chain | n/a | n/a |
| pc_0007 | phase_00 | analysis_pack | execution_core | TV-40..TV-70, TV-71..TV-78, TV-79..TV-79D | DETERMINISTIC_AND_STATE_MACHINE |
| pc_0008 | phase_00 | analysis_pack | system_pass_chain | n/a | SCHEMA_COMPATIBILITY, MIGRATION_VERIFICATION |

## Bundle Inventory

- Acceptance bundles: `15`
- Release-evidence bundles: `13`
- Cross-cutting roadmap validators remain the canonical exact commands:
  - `python3 Algorithm/scripts/validate_contracts.py --self-test`
  - `python3 Algorithm/tools/forensic_contract_guard.py`

## Typed Findings

| Finding | Type | Summary |
| --- | --- | --- |
| shared_operating_contract_0014_to_0021_missing | SOURCE_GAP | pc_0014 references `shared_operating_contract_0014_to_0021.md`, but that shared operating contract file is absent from the repository. |
| shared_operating_contract_0022_to_0029_missing | SOURCE_GAP | pc_0029 references shared_operating_contract_0022_to_0029.md, but that shared operating contract file is absent from the repository. |
| shared_operating_contract_0030_to_0037_missing | SOURCE_GAP | pc_0030 references `shared_operating_contract_0030_to_0037.md`, but that shared operating contract file is absent from the repository. |
| shared_operating_contract_0038_to_0045_missing | SOURCE_GAP | pc_0038 references `shared_operating_contract_0038_to_0045.md`, but that shared operating contract file is absent from the repository. |
| vault_export_precedes_secrets_manager_provisioning | ORDERING_TENSION | pc_0038 exports HMRC client identifiers and secrets into vault records before pc_0049 provisions the secrets-manager/KMS root. The DAG preserves checklist protocol order and records the storage precondition as ambiguous instead of injecting a backward edge. |
