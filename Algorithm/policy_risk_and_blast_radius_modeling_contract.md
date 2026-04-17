# Policy Risk and Blast-Radius Modeling Contract

This contract governs how mutation-capable governance previews estimate blast radius, derive policy
risk, decide whether approval is required, and determine whether the result is preview-only,
approval-gated, or bounded-safe. The same contract is reused by
`GovernanceAccessSimulation.mutation_hazard`, each staged governance change group,
`GovernancePolicySnapshot.change_basket.active_mutation_hazard_or_null`,
`GovernancePolicySnapshot.blast_radius_panel.mutation_hazard_or_null`, and the companion
`mutation_basis_contract`.

## Shared Hazard Packet

Every governed preview SHALL publish one `governance_mutation_hazard_contract` carrying:

- frozen identity inputs: `policy_snapshot_hash`, `access_binding_hash`,
  `dependency_topology_hash`, `simulation_basis_hash`
- one bounded blast-radius interval:
  `impact_radius_lower_score`, `impact_radius_upper_score`
- exact impacted counts plus typed count buckets for principals, clients, authority operations,
  workflows, and limitations
- contribution scores for `privilege_gain_score`, `scope_expansion_score`,
  and `masking_relaxation_score`
- derived posture:
  `policy_risk_score`, `approval_necessity_score`, `approval_requirement`,
  `bounded_safe_mutation`, `commit_authority_posture`, `required_approvals[]`
- explanation arrays:
  `risk_driver_codes[]`, `approval_trigger_codes[]`, `confidence_limiter_codes[]`,
  `bounded_safety_blocker_codes[]`, and `reason_codes[]`

`hazard_contract_hash` SHALL hash that full packet. `mutation_basis_contract` SHALL point back to it
through `hazard_contract_hash` and mirror the same approval/confidence posture. Reviewed risk cannot
be silently recomputed at basket, approval, blast-panel, or commit time.

## Deterministic Derivation

`policy_risk_score` SHALL be derived only from:

- `privilege_gain_score`
- `scope_expansion_score`
- `masking_relaxation_score`
- `impact_radius_upper_score`

The structured `risk_driver_codes[]` SHALL be the typed non-zero contributors from that same set:
`PRIVILEGE_GAIN`, `SCOPE_EXPANSION`, `MASKING_RELAXATION`, and `BROAD_BLAST_RADIUS`.

`approval_necessity_score` SHALL be derived only from `policy_risk_score` and the blast-radius upper
bound. `approval_trigger_codes[]` SHALL reflect only the typed approval posture:
`SINGLE_APPROVER_REQUIRED`, `DUAL_APPROVER_REQUIRED`, `SECURITY_REVIEW_REQUIRED`, or
`CHANGE_ADVISORY_QUORUM_REQUIRED`.

`bounded_safe_mutation = 1` is lawful only when all of the following are true on the frozen preview:

- `privilege_gain_score = 0`
- `scope_expansion_score = 0`
- `masking_relaxation_score = 0`
- `impact_radius_upper_score < 5`
- `policy_risk_score < 15`
- `simulation_confidence_score >= 90`
- `predictability_score >= 85`

If any of those conditions fail, `bounded_safety_blocker_codes[]` SHALL surface the exact failing
families and `approval_requirement` SHALL be non-`NOT_REQUIRED`.

## Commit Posture And UI Law

`commit_authority_posture` SHALL be derived from the frozen scores:

- `PREVIEW_ONLY` iff `simulation_confidence_score < 80` or `predictability_score < 75`
- `BOUNDED_SAFE` iff the preview is not `PREVIEW_ONLY` and `bounded_safe_mutation = 1`
- `APPROVAL_GATED` otherwise

Low-confidence or low-predictability simulations SHALL remain advisory. They may be saved for review,
but SHALL NOT surface direct commit styling, immediate mutation commands, or UI language that implies
the simulation is already approved for execution.

Approval requirements SHALL use one deterministic ladder:

- `NOT_REQUIRED` iff `bounded_safe_mutation = 1`
- `CHANGE_ADVISORY_QUORUM` iff `approval_necessity_score >= 80`
- `SECURITY_REVIEW` iff `approval_necessity_score >= 55`
- `DUAL_APPROVER` iff `approval_necessity_score >= 30`
- `SINGLE_APPROVER` otherwise

## Atomic Basket And Panel Reuse

Staged governance change groups may each carry a `mutation_hazard`, but the basket-level
`active_mutation_hazard_or_null` and blast-panel `mutation_hazard_or_null` may become non-null only
when the grouped mutations are atomic on the same hazard/basis identity. Mixed change baskets with
different `hazard_contract_hash`, `basis_contract_hash`, approval posture, or required approvals
SHALL remain non-atomic and SHALL not collapse into one committable hazard packet.

The approval composer, blast-radius panel, and command boundary SHALL all preserve the same
`hazard_contract_hash` and `basis_contract_hash` reviewed in the simulator. If the frozen policy
snapshot, access binding, dependency topology, or simulation basis changes, the prior hazard packet
is stale and must be recomputed instead of reused.
