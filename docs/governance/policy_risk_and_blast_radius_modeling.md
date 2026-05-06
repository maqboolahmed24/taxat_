# Policy Risk And Blast Radius Modeling

`packages/backend-governance/src/services/build_governance_mutation_hazard_contract.ts`
is the governance read-side entry point for mutation hazard packets. It delegates final schema
normalization and hash construction to the existing access contract normalizers, but all reusable
policy risk, approval necessity, count bucketing, reason-code, and preview posture derivation is
available as explicit backend-governance services.

## Canonical Hash Order

`hazard_contract_hash` is derived from the closed hazard packet excluding the hash itself, in this
order:

1. frozen identity: `contract_version`, `policy_snapshot_hash`, `access_binding_hash`,
   `dependency_topology_hash`, `simulation_basis_hash`
2. count profile and posture: `count_class_profile_code`, `commit_authority_posture`
3. blast interval and impacted count/class pairs for principals, clients, authority operations,
   workflows, and limitations
4. contributor scores, derived policy risk, derived approval necessity, approval requirement, and
   bounded-safe flag
5. ordered arrays: `required_approvals`, `risk_driver_codes`, `approval_trigger_codes`,
   `confidence_limiter_codes`, `bounded_safety_blocker_codes`, `reason_codes`

`basis_contract_hash` is derived from the closed basis packet excluding the hash itself, in this
order: frozen identity, `hazard_contract_hash`, commit/approval/bounded-safe posture,
`required_approvals`, `simulation_confidence_score`, and `predictability_score`.

## Count Classes

The profile is fixed as `GOVERNANCE_IMPACT_COUNT_CLASS_V1`:

- `0`: `ZERO`
- `1`: `ONE`
- `2..5`: `SMALL_BATCH`
- `6..20`: `MEDIUM_BATCH`
- `21..100`: `LARGE_BATCH`
- `101+`: `ESTATE_WIDE`

## Derived Posture

`policy_risk_score` and `approval_necessity_score` use the formulas from
`Algorithm/modules.md` and the shared round helper `roundGovernanceScore`.

`approval_requirement = NOT_REQUIRED` is emitted only when every bounded-safe gate passes. Low
confidence or low predictability always forces `commit_authority_posture = PREVIEW_ONLY` and emits
the corresponding confidence limiter codes.

Reason arrays are deterministic:

- `risk_driver_codes`: non-zero contributor families, plus `BROAD_BLAST_RADIUS` only at upper
  impact radius `>= 25`
- `approval_trigger_codes`: the derived non-`NOT_REQUIRED` approval requirement
- `confidence_limiter_codes`: confidence `< 80` or predictability `< 75`
- `bounded_safety_blocker_codes`: every failed bounded-safe gate
- `reason_codes`: sorted union of those codes plus `BOUNDED_SAFE_MUTATION` or
  `UNCERTAIN_BLAST_RADIUS` when applicable

## Basket Reuse

`buildGovernanceChangeBasket` now calls
`governanceStagedGroupsShareAtomicMutationBasis(...)`. A staged basket can expose one active
reviewed hazard/basis only when every group agrees on:

- `hazard_contract_hash`
- `basis_contract_hash`
- `approval_requirement`
- canonical `required_approvals`

Groups that differ on any of those fields stay `MIXED_BASIS_BLOCKED`, keeping the blast-radius panel
and approval composer from silently recomputing reviewed risk.
