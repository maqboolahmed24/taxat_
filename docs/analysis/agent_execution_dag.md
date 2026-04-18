# Agent Execution DAG

- Status: Accepted
- Date: 2026-04-18

## Context

Taxat's roadmap contains `428` tasks, but AGENT protocol claimability is defined by checklist order, sequential gates, and parallel-wave boundaries rather than by a ready-made machine DAG. This build closes that gap by separating protocol-hard execution edges from additional artifact, policy, resource, and concurrency edges, then recording softer same-track context separately.

The result is a deterministic executable graph over `428` tasks and `125` protocol blocks, including `4` parallel wave blocks. The hard-edge graph stays acyclic, produces `127` topological levels, and yields a critical path of `127` tasks.

## Current Eligibility Snapshot

- first incomplete task: `pc_0029`
- active claimed tasks: `['pc_0029']`
- claimable unclaimed tasks: `[]`
- next blocked boundary: `pc_0030`

Under the current checklist state, `pc_0029` is the active sequential gate, so no later task is claimable until it is completed.

## Hard Edge Classes

| Edge Class | Count |
| --- | --- |
| ARTIFACT_HARD | 789 |
| CONCURRENCY_HARD | 277 |
| POLICY_HARD | 1210 |
| PROTOCOL_HARD | 16206 |
| RESOURCE_HARD | 83 |

The executable DAG contains `18565` hard edges. Soft context remains separate at `278` edges and is never promoted into claimability without stronger evidence.

## Major Hard Rules

| Rule | Edge Count |
| --- | --- |
| protocol_boundary__phase_05_parallel_wave_03__phase_06_parallel_wave_04 | 6552 |
| protocol_boundary__phase_03_parallel_wave_01__phase_04_parallel_wave_02 | 5040 |
| protocol_boundary__phase_04_parallel_wave_02__phase_05_parallel_wave_03 | 4320 |
| package_policy_precedes_phase02_to_phase06_implementation | 333 |
| generated_models_precede_typed_implementation_tracks | 308 |
| definition_of_done_precedes_parallel_wave_execution | 307 |
| monorepo_bootstrap_precedes_parallel_implementation_waves | 307 |
| testing_adr_precedes_wave04_test_tracks | 93 |
| protocol_boundary__phase_06_parallel_wave_04__pc_0392 | 91 |
| protocol_boundary__pc_0084__phase_03_parallel_wave_01 | 84 |
| projection_adr_precedes_projection_and_surface_tracks | 81 |
| storage_eventing_adr_precedes_storage_runtime_tracks | 77 |

These counts show where claimability is driven by protocol block boundaries versus broad planning or scaffold prerequisites such as the package map, generated models, DoD wave planning, and wave-03 shared frontend or native scaffolds.

## Parallel Wave Levels

| Block | Mode | Tasks | Min Level | Max Level |
| --- | --- | --- | --- | --- |
| phase_03_parallel_wave_01 | parallel | 84 | 84 | 84 |
| phase_04_parallel_wave_02 | parallel | 60 | 85 | 85 |
| phase_05_parallel_wave_03 | parallel | 72 | 86 | 88 |
| phase_06_parallel_wave_04 | parallel | 91 | 89 | 89 |

Phase 03 and Phase 04 stay single-level parallel blocks under the current hard rules. Phase 05 spans multiple levels because shared web foundations (`pc_0229` through `pc_0233`) and the native scaffold (`pc_0289`) intentionally serialize part of the otherwise parallel wave.

## Critical Path

| Order | Task | Phase | Level |
| --- | --- | --- | --- |
| 1 | pc_0001 | phase_00 | 0 |
| 2 | pc_0002 | phase_00 | 1 |
| 3 | pc_0003 | phase_00 | 2 |
| 4 | pc_0004 | phase_00 | 3 |
| 5 | pc_0005 | phase_00 | 4 |
| 6 | pc_0006 | phase_00 | 5 |
| 7 | pc_0007 | phase_00 | 6 |
| 8 | pc_0008 | phase_00 | 7 |
| 9 | pc_0009 | phase_00 | 8 |
| 10 | pc_0010 | phase_00 | 9 |
| 11 | pc_0011 | phase_00 | 10 |
| 12 | pc_0012 | phase_00 | 11 |
| ... | ... | ... | ... |
| 120 | pc_0421 | phase_07 | 119 |
| 121 | pc_0422 | phase_07 | 120 |
| 122 | pc_0423 | phase_07 | 121 |
| 123 | pc_0424 | phase_07 | 122 |
| 124 | pc_0425 | phase_07 | 123 |
| 125 | pc_0426 | phase_07 | 124 |
| 126 | pc_0427 | phase_07 | 125 |
| 127 | pc_0428 | phase_07 | 126 |

The full critical path is recorded in [agent_execution_critical_path.json](/Users/test/Code/taxat_/data/analysis/agent_execution_critical_path.json). The protocol skeleton dominates the early path, while the shared wave-03 browser and native scaffolds lengthen the middle of the path beyond a pure phase-by-phase chain.

## Typed Findings

| Finding | Type | Summary |
| --- | --- | --- |
| shared_operating_contract_0022_to_0029_missing | SOURCE_GAP | pc_0029 references shared_operating_contract_0022_to_0029.md, but that shared operating contract file is absent from the repository. |
| vault_export_precedes_secrets_manager_provisioning | ORDERING_TENSION | pc_0038 exports HMRC client identifiers and secrets into vault records before pc_0049 provisions the secrets-manager/KMS root. The DAG preserves checklist protocol order and records the storage precondition as ambiguous instead of injecting a backward edge. |

## Generated Outputs

- DAG: [agent_execution_dag.json](/Users/test/Code/taxat_/data/analysis/agent_execution_dag.json)
- Levels: [agent_execution_levels.json](/Users/test/Code/taxat_/data/analysis/agent_execution_levels.json)
- Hard-edge rationales: [agent_execution_edge_rationales.json](/Users/test/Code/taxat_/data/analysis/agent_execution_edge_rationales.json)
- Soft-context edges: [agent_execution_soft_context_edges.json](/Users/test/Code/taxat_/data/analysis/agent_execution_soft_context_edges.json)
- Critical path: [agent_execution_critical_path.json](/Users/test/Code/taxat_/data/analysis/agent_execution_critical_path.json)
- Diagram: [agent_execution_dag.mmd](/Users/test/Code/taxat_/diagrams/analysis/agent_execution_dag.mmd)
