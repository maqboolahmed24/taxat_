# Governance Access Simulation And Basis Hash Reuse

`pc_0191` moves the governance access simulator boundary into
`packages/backend-governance/src/projectors/build_governance_access_simulation.ts`.
The projector is read-side only: it delegates `AUTHORIZE(...)`,
`SIMULATE_GOVERNANCE_MUTATION(...)`, topology scoring, and canonical hash construction to
`packages/backend-access`, then normalizes one schema-valid `GovernanceAccessSimulation`.

## Projection Boundary

- Read-only previews keep `mutation_hazard = null`, `mutation_basis_contract = null`, and
  `simulator_posture = READ_ONLY_DECISION`.
- Mutation-capable previews require one proposed diff, one frozen dependency topology, and one
  authorization result bound to the same `dependency_topology_hash` and `simulation_basis_hash`.
- Low-confidence or low-predictability mutation previews keep their hazard and basis contracts, but
  publish `commit_authority_posture = PREVIEW_ONLY` and `simulator_posture = ADVISORY_ONLY`.

## Reuse Rules

- `authorization_decision.access_binding_hash`, `mutation_hazard.access_binding_hash`, and
  `mutation_basis_contract.access_binding_hash` must remain identical.
- `mutation_basis_contract.hazard_contract_hash` must mirror the reviewed
  `mutation_hazard.hazard_contract_hash`.
- `hazard_contract_hash` and `basis_contract_hash` are produced by the backend-access canonical hash
  builders, not by route handlers or browser code.
- Approval posture is derived only from the governed risk ladder; `NOT_REQUIRED` is lawful only when
  `bounded_safe_mutation = 1`.

## Authority Chain

`buildGovernanceAuthorityChainLayers(...)` uses the same authority-boundary reasoning stack as the
access matrix. It always preserves the fixed order:

1. `SESSION_AUTHN_POSTURE`
2. `TENANT_OPERATIONAL_AUTHORITY`
3. `CLIENT_DELEGATION_COVERAGE`
4. `EXTERNAL_AUTHORITY_LINK_READINESS`
5. `AUTHORITY_OF_RECORD_OUTCOME` only when authority-of-record truth is material.

This keeps simulator explanations aligned with selected access cells and avoids a second simulator-only
explanation grammar.
