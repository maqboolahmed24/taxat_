# Governance Mutation Simulation

`pc_0091` adds the backend-only simulation bundle that governance preview, approval, and commit stale guards must share.

## Design

- `GovernanceAccessSimulation` is the preview carrier. It always returns the nested reusable `AuthorizationDecision`, and mutation-capable simulations additionally carry `mutation_hazard` plus `mutation_basis_contract`.
- `dependency_topology_hash` is built from one frozen ordered node list, one frozen ordered edge list, the resolved node-weight profile ref, the resolved edge-weight profile ref, and the referenced object-version refs. A version-ref change therefore invalidates the topology hash even when node ids remain stable.
- `simulation_basis_hash` binds the policy snapshot, topology hash, canonical proposed diff, acting principal ref, requested approver scope, and resolved simulation profile ref. Preview and commit stale guards compare this exact basis rather than recomputing risk posture from current UI state.
- Hazard and basis contracts stay coupled to the nested authorization decision through the same `access_binding_hash`, `dependency_topology_hash`, `simulation_basis_hash`, `bounded_safe_mutation`, `approval_requirement`, and `required_approvals[]`.

## Topology Shape

The builder accepts canonical nodes and edges rather than opaque graph dumps.

- Nodes carry `node_ref`, `node_type`, `version_ref`, `seed`, `node_weight`, `validated`, and optional `external_authority`.
- Edges carry `from_node_ref`, `to_node_ref`, `edge_type`, `version_ref`, and the bounded influence factors needed by the corpus propagation formula:
  `scope_overlap`, `privilege_coupling`, `control_criticality`, `externality`, `irreversibility`, and `settlement_p50_seconds`.
- `config/governance/simulation_profile_catalog.json` resolves mutation class to default node weights, default node seeds, edge defaults, propagation depth, freshness budget, and settlement SLA.

This keeps the stored simulation replayable without persisting raw request bodies, secrets, or large unbounded graphs.

## Scoring

The implementation uses the corpus propagation and confidence model for:

- `impact_radius_lower_score`
- `impact_radius_upper_score`
- impacted object counts
- `simulation_confidence_score`
- `predictability_score`

The hazard contract then applies the validator-governed deterministic formulas for:

- `policy_risk_score`
- `approval_necessity_score`
- `bounded_safe_mutation`
- `approval_requirement`
- `commit_authority_posture`
- risk / trigger / limiter / blocker arrays

`simulation_confidence_score < 80` or `predictability_score < 75` always downgrades the commit posture to `PREVIEW_ONLY`, which maps to `simulator_posture = ADVISORY_ONLY`.

## Persistence

`db/migrations/phase03_0004_governance_simulation_and_hazard_basis.sql` adds:

- `control_access.governance_mutation_hazard_contract_register`
- `control_access.governance_mutation_basis_contract_register`
- `control_access.governance_access_simulation_register`

The simulation register stores the frozen simulation payload plus the stale-guard metadata that later approval and commit flows compare directly:

- `policy_snapshot_hash`
- `authorization_decision_access_binding_hash`
- `dependency_topology_hash`
- `simulation_basis_hash`
- `basis_contract_hash`
- `inventory_slice_refs[]`
- `requested_approver_scope[]`
- `simulation_profile_ref`
- `proposed_diff_hash`

## Stale Guard

`SimulationStalenessGuard` fails closed when any reviewed basis component drifts:

- policy snapshot hash
- dependency topology hash
- simulation basis hash
- mutation basis contract hash
- required approval path
- inventory slice refs
- authorization-decision binding
- mirrored authority boundary or chain layers

It also rejects mixed staged batches that try to combine more than one `basis_contract_hash` into one atomic governance action.

## Read-Only Versus Mutation-Capable

- Read-only preview: `mutation_hazard = null`, `mutation_basis_contract = null`, `simulator_posture = READ_ONLY_DECISION`, and the nested authorization decision clears governance basis fields.
- Mutation-capable preview: one topology hash, one simulation basis hash, one hazard contract, one basis contract, and one aligned authorization decision.

If governance authorization resolves to `DENY`, the simulator intentionally falls back to the read-only shape rather than persisting a fake commit-ready basis contract for an impossible write.
