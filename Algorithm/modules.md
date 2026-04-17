# Module Contracts (named procedures)

These modules are the building blocks of the Core Engine. Each can be implemented independently,
but MUST preserve the invariants in `invariants_and_gates.md`.

## AUTHORIZE(...)
**Goal**: Decide whether `principal` may perform `action` on (tenant, client, period, scope), and when only a reduced or masked execution is allowed, return the exact runtime scope and masking policy that must bind the rest of the run. For governance/control-plane mutations, nominal ABAC allowability SHALL also be intersected with a bounded mutation-hazard simulation so a caller with static permission cannot commit a materially risky write without the hazard model explicitly proving bounded safety or forcing the required approval path.  
**Input**: principal attributes; resource attributes; environment attributes; action; canonical `requested_scope[]`; canonical `requested_partition_scope_refs[]`; optional current governance-simulation result for mutation-capable governance actions.  
**Output**:
- `decision` in `{ALLOW, ALLOW_MASKED, REQUIRE_STEP_UP, REQUIRE_APPROVAL, DENY}`
- `reason_codes[]`
- `effective_scope[]` (canonical ordered scope-token array; subset of `requested_scope[]`)
- `effective_partition_scope_refs[]` (canonical ordered partition-scope set; subset of the requested partition coverage)
- `masking_rules[]`
- `required_approvals[]`
- `required_authn_level`
- `policy_snapshot_hash`
- `access_binding_hash`
- `dependency_topology_hash` for governance mutation-capable actions; else `null`
- `simulation_basis_hash` for governance mutation-capable actions; else `null`
- `delegation_snapshot_refs[]`
- `authority_link_snapshot_refs[]`
- `bounded_safe_mutation in {0,1}` for governance mutation-capable actions; else `null`
- `approval_requirement` from governance mutation simulation when applicable; else `null`

**Deterministic formulation**:
For each canonical execution tuple `u = (tau, pi)` where `tau in requested_scope[]` and `pi in requested_partition_scope_refs[]`
(or `GLOBAL` when the action family is not partition-bound), define:

- `policy_allow_u in {0,1}` from the frozen role/policy matrix
- `delegation_cover_u in {0,1}` from the applicable `DelegationGrant` set
- `authority_cover_u in {0,1}` from the applicable `AuthorityLink` / token-binding state when the action is authority-facing; else `1`
- `partition_cover_u in {0,1}` from the requested versus granted partition set
- `freshness_ok_u in {0,1}` requiring current policy/delegation/link evidence for live-capable actions
- `sod_safe_u in {0,1}` from the frozen segregation-of-duties policy
- `masking_legal_u in {0,1}` requiring that any masked presentation remains legally compatible with the requested action family
- `step_up_gap_u in {0,1}` where `1` means the current session has not yet satisfied the required authentication level for `u`
- `approval_gap_u in {0,1}` where `1` means an access-policy approval obligation for `u` remains unsatisfied
- `governance_gap_u in {0,1}` where `1` means `u` is mutation-capable governance scope and neither `bounded_safe_mutation = 1` nor the simulated governance approval obligation has been satisfied

Then compute:

`core_cover_u = policy_allow_u * delegation_cover_u * authority_cover_u * partition_cover_u * freshness_ok_u * sod_safe_u * masking_legal_u`

`direct_allow_u = core_cover_u * (1 - step_up_gap_u) * (1 - approval_gap_u) * (1 - governance_gap_u)`

`step_up_path_u = core_cover_u * step_up_gap_u`

`approval_path_u = core_cover_u * (1 - step_up_gap_u) * max(approval_gap_u, governance_gap_u)`

`candidate_u = max(direct_allow_u, step_up_path_u, approval_path_u)`

`blocked_u = 1 - candidate_u`

`effective_scope[]` and `effective_partition_scope_refs[]` SHALL be the canonical ordered projections of tuples with `candidate_u = 1`; for a directly executable write, downstream runtime execution SHALL use only tuples with `direct_allow_u = 1`.

For mutation-capable governance actions, the returned authorization contract SHALL retain the exact
`dependency_topology_hash` and `simulation_basis_hash` of the hazard result that informed
`bounded_safe_mutation` / `approval_requirement`; outside governance mutation-capable scope, both
fields SHALL remain `null`.

When both step-up and approval/governance obligations remain outstanding for the same tuple,
`AUTHORIZE(...)` SHALL surface `REQUIRE_STEP_UP` first while preserving the pending approval
obligations in canonical `required_approvals[]` and `approval_requirement`.

If the requested action is mutation-capable governance scope and any requested tuple has `step_up_path_u = 1`, `approval_path_u = 1`, or `blocked_u = 1`, implementations SHALL treat the request as atomic and SHALL set `direct_allow_u = 0` for all tuples before decision selection.

Decision precedence SHALL be:

- `DENY` if `sum(candidate_u) = 0`
- `REQUIRE_STEP_UP` if `sum(direct_allow_u) = 0` and `sum(step_up_path_u) > 0`
- `REQUIRE_APPROVAL` if `sum(direct_allow_u) = 0`, `sum(step_up_path_u) = 0`, and `sum(approval_path_u) > 0`
- `ALLOW_MASKED` if `sum(direct_allow_u) > 0` and at least one directly executable tuple carries active projection masking
- `ALLOW` otherwise

For mutation-capable governance actions, the canonical target set SHALL be atomic: if any requested tuple is blocked or requires escalation, the engine SHALL NOT silently auto-drop that tuple and commit a narrower write. The caller MUST either satisfy the surfaced requirement or explicitly reform the request against the narrower canonical target set.

## SIMULATE_GOVERNANCE_MUTATION(...)
**Goal**: Evaluate a proposed governance/control-plane mutation without mutating live state. The simulator SHALL estimate a bounded blast radius over the frozen dependency topology, compute policy risk, derive approval necessity, and quantify the fidelity and predictability of the estimate itself. Every governance mutation SHALL be treated as hazardous unless `bounded_safe_mutation = 1` is proven on the frozen simulation basis.  
**Input**: current `GovernancePolicySnapshot`; relevant principal/role, authority-link, retention, and audit-topology read models; canonical proposed diff `Delta`; current actor; requested approver scope; frozen simulation profile.  
**Output**:
- `simulation_basis_hash`
- `dependency_topology_hash`
- `mutation_hazard_contract{ contract_version, hazard_contract_hash, policy_snapshot_hash, access_binding_hash, dependency_topology_hash, simulation_basis_hash, count_class_profile_code, commit_authority_posture, impact_radius_lower_score, impact_radius_upper_score, impacted_principal_count, impacted_principal_count_class, impacted_client_count, impacted_client_count_class, impacted_authority_operation_count, impacted_authority_operation_count_class, impacted_workflow_count, impacted_workflow_count_class, impacted_limitation_count, impacted_limitation_count_class, privilege_gain_score, scope_expansion_score, masking_relaxation_score, policy_risk_score, approval_necessity_score, approval_requirement, bounded_safe_mutation, required_approvals[], simulation_confidence_score, predictability_score, risk_driver_codes[], approval_trigger_codes[], confidence_limiter_codes[], bounded_safety_blocker_codes[], reason_codes[] }`
- `mutation_basis_contract{ contract_version, basis_contract_hash, policy_snapshot_hash, access_binding_hash, dependency_topology_hash, simulation_basis_hash, hazard_contract_hash, commit_authority_posture, approval_requirement, bounded_safe_mutation, required_approvals[], simulation_confidence_score, predictability_score }`
- `impact_radius_lower_score in [0,100]`
- `impact_radius_upper_score in [0,100]`
- `impacted_principal_count >= 0`
- `impacted_client_count >= 0`
- `impacted_authority_operation_count >= 0`
- `impacted_workflow_count >= 0`
- `impacted_limitation_count >= 0`
- `privilege_gain_score in [0,100]`
- `scope_expansion_score in [0,100]`
- `masking_relaxation_score in [0,100]`
- `policy_risk_score in [0,100]`
- `approval_necessity_score in [0,100]`
- `approval_requirement in {NOT_REQUIRED, SINGLE_APPROVER, DUAL_APPROVER, SECURITY_REVIEW, CHANGE_ADVISORY_QUORUM}`
- `simulation_confidence_score in [0,100]`
- `predictability_score in [0,100]`
- `bounded_safe_mutation in {0,1}`
- `required_approvals[]`
- `reason_codes[]`

**Hash binding**:

`dependency_topology_hash = HASH(canonical ordered impacted node ids, canonical ordered edge list, node-weight profile ref, edge-weight profile ref, and referenced object-version refs)`

`simulation_basis_hash = HASH(policy_snapshot_hash, dependency_topology_hash, canonical proposed diff, acting principal ref, requested approver scope, and simulation profile ref)`

`commit_authority_posture = PREVIEW_ONLY` iff `simulation_confidence_score < 80` or `predictability_score < 75`; else `BOUNDED_SAFE` iff `bounded_safe_mutation = 1`; else `APPROVAL_GATED`

`policy_risk_score = round_score(100 * (1 - ((1 - privilege_gain_score/100)^0.40 * (1 - scope_expansion_score/100)^0.25 * (1 - masking_relaxation_score/100)^0.20 * (1 - impact_radius_upper_score/100)^0.15)))`

`approval_necessity_score = round_score(100 * (1 - ((1 - policy_risk_score/100)^0.70 * (1 - impact_radius_upper_score/100)^0.30)))`

`bounded_safe_mutation = 1` iff `privilege_gain_score = 0`, `scope_expansion_score = 0`,
`masking_relaxation_score = 0`, `impact_radius_upper_score < 5`, `policy_risk_score < 15`,
`simulation_confidence_score >= 90`, and `predictability_score >= 85`

`approval_requirement = NOT_REQUIRED` iff `bounded_safe_mutation = 1`; else
`CHANGE_ADVISORY_QUORUM` iff `approval_necessity_score >= 80`; else `SECURITY_REVIEW` iff
`approval_necessity_score >= 55`; else `DUAL_APPROVER` iff `approval_necessity_score >= 30`; else
`SINGLE_APPROVER`

`hazard_contract_hash = HASH(contract_version, policy_snapshot_hash, access_binding_hash, dependency_topology_hash, simulation_basis_hash, count_class_profile_code, commit_authority_posture, impact_radius_lower_score, impact_radius_upper_score, impacted_*_count / impacted_*_count_class pairs, privilege_gain_score, scope_expansion_score, masking_relaxation_score, policy_risk_score, approval_necessity_score, approval_requirement, bounded_safe_mutation, canonical ordered required_approvals[], canonical ordered risk/approval/confidence/blocker explanation arrays, canonical ordered reason_codes[])`

`basis_contract_hash = HASH(contract_version, policy_snapshot_hash, access_binding_hash, dependency_topology_hash, simulation_basis_hash, hazard_contract_hash, commit_authority_posture, approval_requirement, bounded_safe_mutation, canonical ordered required_approvals[], simulation_confidence_score, predictability_score)`

The returned `mutation_hazard_contract` is the authoritative bounded risk packet for preview,
staging, and blast-radius rendering, and the returned `mutation_basis_contract` is the
simulation-to-commit continuity boundary. `ChangeBasket`, `BlastRadiusPanel`, `ApprovalComposer`,
`CommandEnvelope`, and `ApiCommandReceipt` SHALL preserve the same `hazard_contract_hash` /
`basis_contract_hash` pair or stale-reject before mutation.

`risk_driver_codes[]` SHALL be limited to the typed non-zero contributors
`PRIVILEGE_GAIN`, `SCOPE_EXPANSION`, `MASKING_RELAXATION`, and `BROAD_BLAST_RADIUS`.
`approval_trigger_codes[]` SHALL reflect only the derived approval posture, and low-confidence or
low-predictability simulations SHALL surface `confidence_limiter_codes[]` instead of direct
commit-ready styling.

**Normalization**:
Use `clamp01(...)`, `round_score(...)`, exact deterministic ordering, and `epsilon > 0` from
`compute_parity_and_trust_formulas.md section 8.2`. For weighted set overlap, use
`weighted_jaccard(A, B) = sum_i min(a_i, b_i) / sum_i max(a_i, b_i)` over the canonical ordered
joint scope/partition basis, with the ratio defined as `1` only when both compared objects are
globally scoped and the denominator is empty.

**Dependency-weight formulation**:
Let `G = (V, E)` be the directed dependency graph induced by the frozen control-plane state over principals,
roles, policy rules, authority links, retention rules, workflows, export surfaces, and approval objects
reachable from `Delta`.

For each edge `i -> j`, define bounded factors:

- `scope_overlap_ij in [0,1]` from weighted overlap of the edge endpoints' canonical scope and partition coverage
- `privilege_coupling_ij in [0,1]` = fraction of `j`'s action-matrix cells whose decision path references `i`
- `control_criticality_ij in [0,1]` from the frozen governance-criticality profile
- `externality_ij in [0,1]` = whether the edge crosses an authority-of-record, retention-limit, or export-visibility boundary
- `irreversibility_ij in [0,1]` from the frozen mutation-class profile
- `propagation_speed_ij = exp(-ln(2) * settlement_p50_ij / max(tau_prop, epsilon))`

with default non-negative exponents summing to `1`:

- `alpha_scope = 0.22`
- `alpha_privilege = 0.22`
- `alpha_criticality = 0.18`
- `alpha_externality = 0.14`
- `alpha_irreversibility = 0.14`
- `alpha_speed = 0.10`

Then:

`w_ij = clamp01(1 - (1 - scope_overlap_ij)^alpha_scope * (1 - privilege_coupling_ij)^alpha_privilege * (1 - control_criticality_ij)^alpha_criticality * (1 - externality_ij)^alpha_externality * (1 - irreversibility_ij)^alpha_irreversibility * (1 - propagation_speed_ij)^alpha_speed)`

`D_out(i,i) = max(1, sum_j w_ij)`

`P = gamma * D_out^(-1) * W` with frozen `gamma in (0,1)` and default `gamma = 0.85`

This row-normalized contraction keeps the induced propagation operator bounded with spectral radius `< 1`.

**Impact-radius formulation**:
For each node `v`, let `seed_v in [0,1]` be the normalized direct mutation severity from the frozen diff-severity profile, with categorical add/remove, privilege-widening, approval-policy, retention-minimum, or authority-link mutations mapping to `1`.

Let `q^(0) = seed` and `q^(h) = P^h q^(0)` for `h = 1..H`, where `H` is the frozen maximum propagation depth.

`reach_lb_v = max_h q_v^(h)`

`reach_ub_v = min(1, sum_h q_v^(h))`

The true propagated reach SHALL be treated as lying in `[reach_lb_v, reach_ub_v]`; implementations SHALL NOT collapse the interval to a point estimate unless the interval width is provably zero.

Let `node_weight_v > 0` come from the frozen governance-criticality profile.

`impact_radius_lower_score = 0 if sum(node_weight_v) = 0 else round_score(100 * sum(node_weight_v * reach_lb_v) / sum(node_weight_v))`

`impact_radius_upper_score = 0 if sum(node_weight_v) = 0 else round_score(100 * sum(node_weight_v * reach_ub_v) / sum(node_weight_v))`

For each impacted object class `kappa in {PRINCIPAL, CLIENT, AUTHORITY_OPERATION, WORKFLOW, LIMITATION}`:

`impacted_kappa_count = |{v in V_kappa : reach_ub_v >= impact_presence_threshold}|`

where `impact_presence_threshold in (0,1]` is frozen in the simulation profile.

**Privilege- and scope-delta formulation**:
For each affected action-matrix cell `c`, let `cell_weight_c > 0` come from the frozen action-criticality profile, and define:

- `exec_gain_c = 1` iff `post_decision(c) in {ALLOW, ALLOW_MASKED}` and `pre_decision(c) not in {ALLOW, ALLOW_MASKED}`; else `0`
- `mask_relax_c = 1` iff `pre_decision(c) = ALLOW_MASKED` and `post_decision(c) = ALLOW`; else `0`
- `approval_guard_removed_c = 1` iff `pre_decision(c) = REQUIRE_APPROVAL` and `post_decision(c) in {ALLOW, ALLOW_MASKED, REQUIRE_STEP_UP}`; else `0`
- `step_up_guard_removed_c = 1` iff `pre_decision(c) = REQUIRE_STEP_UP` and `post_decision(c) in {ALLOW, ALLOW_MASKED}`; else `0`
- `privilege_delta_c = clamp01(exec_gain_c + 0.50 * mask_relax_c + 0.35 * approval_guard_removed_c + 0.15 * step_up_guard_removed_c)`
- `scope_expansion_c = |post_effective_scope_c \ pre_effective_scope_c| / max(1, |post_effective_scope_c union pre_effective_scope_c|)`

Then:

`privilege_gain_score = 0 if sum(cell_weight_c) = 0 else round_score(100 * sum(cell_weight_c * privilege_delta_c) / sum(cell_weight_c))`

`scope_expansion_score = 0 if sum(cell_weight_c) = 0 else round_score(100 * sum(cell_weight_c * scope_expansion_c) / sum(cell_weight_c))`

`masking_relaxation_score = 0 if sum(cell_weight_c) = 0 else round_score(100 * sum(cell_weight_c * mask_relax_c) / sum(cell_weight_c))`

Let:

- `external_authority_exposure = 0` if no external-authority nodes are impacted or their aggregate node weight is `0`, else `sum(node_weight_v * reach_ub_v) / sum(node_weight_v)` over impacted external-authority nodes
- `sod_violation_score in [0,1]` from the frozen segregation-of-duties policy, with `1` meaning the mutation creates at least one self-approval or mutually-exclusive critical-permission path
- `reversibility_score in [0,1]` from the frozen rollback profile, where `1` means fully reversible within the bounded rollback SLA and `0` means materially irreversible

**Policy-risk formulation**:
Define the normalized component scores:

- `d_priv = privilege_gain_score / 100`
- `d_scope = scope_expansion_score / 100`
- `d_mask = masking_relaxation_score / 100`
- `d_ext = external_authority_exposure`
- `d_irrev = 1 - reversibility_score`
- `d_sod = sod_violation_score`
- `d_tail = impact_radius_upper_score / 100`

with default non-negative risk exponents summing to `1`:

- `omega_priv = 0.26`
- `omega_scope = 0.16`
- `omega_mask = 0.14`
- `omega_ext = 0.14`
- `omega_irrev = 0.12`
- `omega_sod = 0.10`
- `omega_tail = 0.08`

Then:

`policy_risk_raw = 1 - (1 - d_priv)^omega_priv * (1 - d_scope)^omega_scope * (1 - d_mask)^omega_mask * (1 - d_ext)^omega_ext * (1 - d_irrev)^omega_irrev * (1 - d_sod)^omega_sod * (1 - d_tail)^omega_tail`

`policy_risk_score = round_score(100 * policy_risk_raw)`

**Simulation-confidence formulation**:
Let:

- `required_edge_mass = sum(w_ij)` across all edges that the frozen topology and simulation profile mark as semantically relevant to the requested mutation
- `observed_edge_mass = sum(w_ij)` across that same relevant edge set whose endpoints, version tokens, and supporting read models are all present and admissible at simulation time
- `freshness_factor = min_r exp(-ln(2) * age_r / max(freshness_budget_r, epsilon))` over all read models actually referenced by the simulation
- `coverage_factor = 1` if `sum(required_edge_mass) = 0`, else `clamp01(sum(observed_edge_mass) / sum(required_edge_mass))`
- `binding_factor = 1` iff every referenced read model, version token, and diff basis belongs to the same frozen snapshot cut and reproduces `dependency_topology_hash`; else `0`
- `interval_factor = 1 - clamp01((impact_radius_upper_score - impact_radius_lower_score) / 100)`
- `impacted_node_weight = sum(node_weight_v)` across nodes with `reach_ub_v >= impact_presence_threshold`
- `validated_impacted_node_weight = sum(node_weight_v)` across that impacted set whose schema/invariant checks all pass on the same snapshot cut
- `validation_factor = 1` if `sum(impacted_node_weight) = 0`, else `clamp01(sum(validated_impacted_node_weight) / sum(impacted_node_weight))`

Then:

`simulation_confidence_score = 0 if min(freshness_factor, coverage_factor, binding_factor, interval_factor, validation_factor) = 0 else round_score(100 * exp(0.30 * ln(freshness_factor) + 0.25 * ln(coverage_factor) + 0.20 * ln(binding_factor) + 0.15 * ln(interval_factor) + 0.10 * ln(validation_factor)))`

**Control-plane predictability formulation**:
Let:

- `idempotency_factor = 1` iff re-evaluating the same `simulation_basis_hash` under the frozen profile is byte-stable; else `0`
- `monotonicity_factor = 1` iff replacing `Delta` with a stricter diff under the policy partial order cannot lower `approval_requirement`, `policy_risk_score`, or `impact_radius_upper_score`; else `0`
- `settlement_factor = exp(-ln(2) * settlement_p95 / max(settlement_sla, epsilon))`

Then:

`predictability_score = 0 if min(simulation_confidence_score / 100, idempotency_factor, monotonicity_factor, settlement_factor) = 0 else round_score(100 * exp(0.45 * ln(simulation_confidence_score / 100) + 0.25 * ln(idempotency_factor) + 0.15 * ln(monotonicity_factor) + 0.15 * ln(settlement_factor)))`

**Approval-necessity formulation**:

`approval_necessity_raw = 1 - ((1 - policy_risk_score / 100)^0.70 * (1 - impact_radius_upper_score / 100)^0.30)`

`approval_necessity_score = round_score(100 * approval_necessity_raw)`

Map to approval requirement as follows:

- `NOT_REQUIRED` only if `bounded_safe_mutation = 1`
- `CHANGE_ADVISORY_QUORUM` if `approval_necessity_score >= 80`
- `SECURITY_REVIEW` if `55 <= approval_necessity_score < 80`
- `DUAL_APPROVER` if `30 <= approval_necessity_score < 55`
- `SINGLE_APPROVER` otherwise

`required_approvals[]` SHALL be the canonical ordered obligation set implied by the frozen approval policy for the resolved `approval_requirement` and the impacted object families.

**Bounded-safe predicate**:
`bounded_safe_mutation = 1` iff all of the following are true:

- `privilege_gain_score = 0`
- `scope_expansion_score = 0`
- `masking_relaxation_score = 0`
- `impact_radius_upper_score < 5`
- `policy_risk_score < 15`
- `simulation_confidence_score >= 90`
- `predictability_score >= 85`

Else `bounded_safe_mutation = 0`.

**Invariants**:
- the simulation SHALL be non-mutating, deterministic under the same `simulation_basis_hash`, and replay-safe
- lower/upper impact bounds SHALL be monotone in edge weights and seed severity
- `approval_requirement = NOT_REQUIRED` SHALL be unreachable unless `bounded_safe_mutation = 1`
- if `simulation_confidence_score < 80` or `predictability_score < 75`, the result SHALL remain advisory-only and SHALL NOT by itself authorize immediate governance mutation
- northbound simulator responses SHALL serialize this output as
  `GovernanceAccessSimulation.mutation_hazard{{...}}` bound to the same nested
  `authorization_decision{{...}}` and frozen `policy_snapshot_hash`

## ACCESS_BLOCKED_RESPONSE(...)
**Goal**: Return the non-manifest response for access outcomes that stop execution before manifest allocation, such as `REQUIRE_STEP_UP`, `REQUIRE_APPROVAL`, or `DENY`.  
**Output**: access-blocked response payload with reason and next action hints. The response SHALL reuse the same low-noise posture grammar as the mounted `CALM_SHELL`: `attention_state`, `plain_reason`, `actionability_state`, `primary_action_code`, `no_safe_action_reason_code`, ordered `detail_entry_points[]`, and `suggested_detail_surface_code`.
**Invariant**:
- pre-manifest access exits SHALL preserve the same decision model as post-manifest UX; step-up or approval SHALL not force a different summary/action grammar
- when no safe legal action exists, the response SHALL emit explicit `NO_SAFE_ACTION` semantics plus the least-destructive investigation or recovery entry point

## VALIDATE_EFFECTIVE_SCOPE_BINDING(...)
**Goal**: Fail closed when post-authorization scope binding is empty, exceeds caller intent, or otherwise cannot safely drive execution.  
**Input**: canonical `requested_scope[]`; structured `access_decision`; canonical `runtime_scope[]`.  
**Output**: `status ∈ {VALID, INVALID}` + typed `reason_code`.  
**Invariant**:
- `runtime_scope[]` SHALL be the single executable scope for downstream orchestration, compute, filing, and authority interaction
- invalid effective-scope binding SHALL return typed reason codes rather than relying on process-crashing `ASSERT(...)` checks
- the minimum structural failures are `RUNTIME_SCOPE_EMPTY` and `RUNTIME_SCOPE_NOT_SUBSET_OF_REQUEST`
- when a failed scope binding is persisted on `RunManifest` / `ErrorRecord`, callers SHALL bind
  invariant class `SCOPE_BINDING` through `invariant_enforcement_contract{...}` instead of
  collapsing the failure into a generic system fault
- raw caller intent SHALL remain audit-only once `runtime_scope[]` has been validated
- live-capable requested scope SHALL additionally fail closed when authorization would silently narrow the executable set instead of preserving the atomic request boundary

## MATERIALIZE_SCOPE_EXECUTION_BINDING(...)
**Goal**: Freeze one authoritative raw-versus-executable scope contract immediately after authorization and before manifest reuse, gate planning, worker enqueue, or authority interaction begins.  
**Input**: canonical `requested_scope[]`; structured `access_decision`; canonical `runtime_scope[]`; `execution_mode`; canonical executable partition coverage.  
**Output**: `scope_execution_binding{ requested_scope_family, executable_scope_family, requested_scope[], executable_scope[], executable_partition_scope_refs[], reduction_posture, mutation_atomicity, masking_rules[], required_approvals[], required_authn_level, access_binding_hash, reason_codes[] }`.  
**Invariant**:
- downstream gates, workers, authority operations, and read models SHALL consume `scope_execution_binding{...}` rather than re-deriving executable meaning from raw `requested_scope[]`
- `requested_scope_family` and `executable_scope_family` SHALL be explicit and deterministic
- `reduction_posture = REDUCED_BY_AUTHORIZATION` SHALL be illegal when `mutation_atomicity = ATOMIC_REQUIRED`
- analysis-mode bindings SHALL remain `READ_ONLY` and SHALL reject live-capable scope families

## ENFORCE_ACCESS_SCOPE_AND_MASKING(...)
**Goal**: Convert the structured access result into the exact runtime scope and bound masking context used by the engine after authorization.  
**Input**: canonical `requested_scope[]`; structured `access_decision`; `mode`.  
**Output**: `runtime_scope[]`, `masking_context`, `scope_execution_binding`.  
**Invariant**:
- `runtime_scope[]` SHALL equal canonical `access_decision.effective_scope[]` when present, else canonical `requested_scope[]`.
- `runtime_scope[]` SHALL be non-empty and SHALL be a subset of `requested_scope[]`.
- `masking_context` is a projection-only redaction context.
- `runtime_scope[]` SHALL control execution semantics.
- `masking_context` SHALL control only human/view/export projections.
- Source planning, canonicalization, compute, parity, trust, filing-packet generation, authority-request canonicalization, request hashing, and transmit semantics SHALL use the full canonical facts required for the authorized tokens and SHALL NOT consume redacted bytes created solely for masked presentation.

## EVALUATE_GATE_CHAIN(...)
**Goal**: Execute the ordered non-access gate sequence in stage order as each gate's prerequisite artifacts become available.
**Output**: ordered non-access `GateDecisionRecord` set with decision enum
`{PASS, PASS_WITH_NOTICE, MANUAL_REVIEW, OVERRIDABLE_BLOCK, HARD_BLOCK}` plus fixed stage indexes,
canonical `effective_scope[]`, frozen input / basis refs, next actions, override-resolution outcome,
and one explicit `gate_semantics_contract{...}` so downstream consumers do not infer progression
rank or override-dependency posture from the raw decision enum alone.
**Invariant**:
- Later gates never downgrade an earlier `HARD_BLOCK`.
- A gate SHALL not be skipped merely because its inputs arise later in the run.
- Gates evaluated after seal SHALL append manifest-linked gate records without rewriting the frozen manifest core.

## COMPUTE_SCOPE_FLAGS(...)
**Goal**: Normalize canonical `runtime_scope[]` into a single intent record consumed by the orchestrator and downstream gates.  
**Output**: `scope_flags` with `reporting_scope`, `wants_prepare_submission`, `wants_submit`, `wants_amendment_intent`, and `wants_amendment_submit`.  
**Invariant**:
- scope intent SHALL be derived once from canonical `runtime_scope[]` and reused downstream
- downstream logic SHALL NOT re-parse `runtime_scope[]` ad hoc in multiple branches

## VALIDATE_SCOPE_GRAMMAR(...)
**Goal**: Validate the canonical runtime scope before manifest lookup, config work, or stage allocation begins.  
**Output**: `status ∈ {VALID, INVALID}` + typed `reason_code`.  
**Invariant**:
- invalid scope grammar SHALL fail closed with a typed response
- scope validation SHALL NOT rely on process-crashing `ASSERT(...)` checks for user-supplied or persisted inputs

## LOAD_AND_VALIDATE_PRIOR_MANIFEST_CONTEXT(...)
**Goal**: Load a referenced prior manifest, derive its effective scope and access binding once, and validate tenant/client/period/mode/lineage compatibility before any continuation decision is made.  
**Output**: `status ∈ {ABSENT, VALID, INVALID}` + `prior_manifest`, `prior_effective_scope`, `prior_access_binding_hash`, `same_request_identity`, `continuation_decision`, `reason_code`.  
**Invariant**:
- if `manifest_id` is absent, return `ABSENT` without side effects
- compatibility failures SHALL return typed reason codes rather than relying on `ASSERT(...)`
- loaders SHALL reject any manifest whose duplicated top-level lineage projection diverges from `continuation_set{...}` rather than heuristically trusting one side
- `CONTINUATION_ALLOWED(...)` SHALL be evaluated at most once per request envelope for a given prior manifest

## VALIDATE_REUSE_SEALED_CONTEXT(...)
**Goal**: Confirm that same-manifest pre-start reuse is safe before the orchestrator binds to an existing sealed context.  
**Input**: `prior_manifest`.  
**Output**: `status ∈ {VALID, INVALID}` + typed `reason_code`.  
**Invariant**:
- same-manifest reuse is legal only when no start lease has been taken, no output refs have been materialized, and no submission refs exist for the reused manifest
- same-manifest reuse SHALL also reject any manifest that already carries `decision_bundle_hash`,
  `deterministic_outcome_hash`, `replay_attestation_ref`, or populated `drift_refs[]`; a reusable
  sealed manifest must still be pre-start
- invalid reuse SHALL fail closed with typed reasons rather than relying on `ASSERT(...)` checks over persisted state
- implementations SHALL surface `REUSED_SEALED_CONTEXT_MUTATED` when a supposedly reusable sealed manifest has already been opened or has materialized outputs/submissions
- persisted rejection of same-manifest reuse SHALL bind invariant class `MANIFEST_REUSE` through
  `invariant_enforcement_contract{...}` so the manifest and error object agree on the fail-closed
  reuse boundary

## DECIDE_MANIFEST_REUSE_STRATEGY(...)
**Goal**: Choose the orchestrator action for a validated prior context.  
**Output**: `action ∈ {NEW_MANIFEST, RETURN_EXISTING_BUNDLE, REUSE_SEALED_MANIFEST, REPLAY_CHILD, RECOVERY_CHILD, CONTINUATION_CHILD, NEW_REQUEST_CHILD}` + `continuation_basis`.  
**Invariant**:
- exact same-request terminal manifests SHALL return the existing `DecisionBundle` before any child-manifest allocation is considered
- exact same-request still-sealed manifests SHALL be reused before generic continuation logic
- exact same replay request against an already completed replay child SHALL return the existing attested
  replay bundle instead of allocating a duplicate replay child
- `RECOVERY_CHILD` is legal only when no active start lease exists for the same attempt lineage
- the decision MUST materialize one `manifest_branch_decision{ branch_action, idempotency_key, access_binding_hash, requested_scope[], run_kind, replay_class_or_null, nightly_window_key_or_null, prior_manifest_* , selected_manifest_continuation_basis, selected lineage refs, selected_manifest_generation, config_inheritance_mode_or_null, input_inheritance_mode_or_null, returned_decision_bundle_hash_or_null }` object so request-time branch action and persisted manifest continuation basis cannot collapse into one ambiguous field

## RESOLVE_CONFIG(...)
**Goal**: Freeze rule/policy/config versions for the run.  
**Output**: config refs + thresholds + materiality boundaries + retention profile.  
**Invariant**: New live compliance runs must reference approved config versions; replay may
materialize from the prior frozen config set under the documented replay carve-out for
`DEPRECATED` or `REVOKED` versions.

## FREEZE_CONFIG(...)
**Goal**: Materialize a first-class `ConfigFreeze` with ordered config entries, provider versions, and freeze hashes.  
**Output**: config_freeze_id + config entries + config_freeze_hash + config_surface_hash + `config_resolution_basis`.  
**Invariant**: No compliance artifact may be produced against floating configuration.

## LOAD_MANIFEST(...)
**Goal**: Load an existing `RunManifest` together with its frozen envelope, append-only outcome projections, and lineage metadata.  
**Output**: `RunManifest`.  
**Invariant**:
- `root_manifest_id`, `parent_manifest_id`, `continuation_of_manifest_id`, `replay_of_manifest_id`, `supersedes_manifest_id`, and `manifest_generation` SHALL byte-match their mirrors inside `continuation_set{...}`
- loader implementations SHALL reject `MANIFEST_LINEAGE_PROJECTION_MISMATCH` rather than choosing a preferred copy heuristically
- `frozen_execution_binding{...}` is the authoritative worker-facing frozen envelope and SHALL remain byte-identical to the manifest, config-freeze, input-freeze, and hash mirrors it summarizes
- that frozen envelope SHALL also carry the complete continuation/inheritance mirror (`continuation_of_manifest_id`, `parent_manifest_hash_at_branch`, config/input inheritance modes, inherited-freeze refs, and fresh-child reason codes) so worker reload never reconstructs branch causality from neighboring rows
- `append_only_outcome_projection{...}` is the authoritative append-only carrier for post-seal basis, gates, and terminal refs; top-level outcome fields are mirrors only
- `output_refs{...}` SHALL reload as structured output-link entries with preserved dependency identity; callers SHALL NOT treat them as alias-to-ref strings

## LOAD_CONFIG_FREEZE(...)
**Goal**: Load an already-frozen `ConfigFreeze` by reference for replay or continuation-safe reuse.  
**Output**: `ConfigFreeze`.
**Invariant**:
- the loaded freeze SHALL already carry `config_completeness_state = COMPLETE_REQUIRED_CONFIG_SET`
- the loaded freeze SHALL keep `config_consumption_mode = FROZEN_CONFIG_ONLY`

## CONTINUATION_REUSES_FROZEN_CONFIG(...)
**Goal**: Decide whether a child manifest may inherit the parent frozen config set rather than resolving a fresh config set.  
**Output**: boolean `reuse_parent_frozen_config` + `config_inheritance_mode ∈ {REPLAY_EXACT, RECOVERY_EXACT, FRESH_CHILD_RESOLUTION, HISTORICAL_EXPLICIT}`.  
**Invariant**:
- return `true` only for:
  - `run_kind = REPLAY` with `config_inheritance_mode = REPLAY_EXACT`
  - same-attempt recovery of an already-started manifest with `config_inheritance_mode = RECOVERY_EXACT`
  - an explicitly declared historical-config child branch recorded as `config_inheritance_mode = HISTORICAL_EXPLICIT`
- return `false` by default for amendment, remediation, drift-reassessment, analysis, and other continuation children, and record `config_inheritance_mode = FRESH_CHILD_RESOLUTION`
- inheriting a non-live compliance config set SHALL NOT authorize a new live filing-capable or amendment-capable progression unless the branch is `REPLAY` or same-attempt recovery
- the chosen inheritance mode SHALL map to `ConfigFreeze.config_resolution_basis` rather than being reconstructed later from hash coincidence

## MATERIALIZE_CFG_FROM_FREEZE(...)
**Goal**: Reconstruct the executable config view from a frozen `ConfigFreeze` without resolving fresh floating config.  
**Output**: config refs + thresholds + policy/materiality settings derived from the freeze.
**Invariant**:
- downstream consumers SHALL accept only `config_consumption_mode = FROZEN_CONFIG_ONLY`

## CONTINUATION_REUSES_FROZEN_INPUT(...)
**Goal**: Decide whether a child manifest may inherit the parent frozen input set rather than recollecting sources.
**Output**: boolean `reuse_parent_frozen_input` + `input_inheritance_mode ∈ {REPLAY_EXACT, RECOVERY_EXACT, FRESH_CHILD_COLLECTION, HISTORICAL_EXPLICIT}`.
**Invariant**:
- return `true` only for:
  - `run_kind = REPLAY` with `replay_class in {STANDARD_REPLAY, AUDIT_REPLAY}` and `input_inheritance_mode = REPLAY_EXACT`
  - same-attempt recovery of an already-started manifest with `input_inheritance_mode = RECOVERY_EXACT`
  - an explicitly declared historical-input child branch recorded as `input_inheritance_mode = HISTORICAL_EXPLICIT`
- return `false` by default for amendment, remediation, drift-reassessment, analysis, and other continuation children, and record `input_inheritance_mode = FRESH_CHILD_COLLECTION`
- inheriting a frozen input set SHALL also inherit the frozen normalization context, late-data policy bindings, and authoritative intake artifact-set identities needed to reproduce the same boundary

## RESOLVE_CONFIG_FOR_REQUEST(...)
**Goal**: Resolve fresh config or inherit a parent frozen config according to continuation policy and the chosen manifest strategy.  
**Output**: executable `cfg`, optional inherited `cfg_freeze`, `schema_bundle_hash`, optional `config_inheritance_mode ∈ {REPLAY_EXACT, RECOVERY_EXACT, FRESH_CHILD_RESOLUTION, HISTORICAL_EXPLICIT}`, `config_resolution_basis`, and optional `source_config_freeze_ref/hash/surface_hash`.  
**Invariant**:
- same-manifest pre-start reuse SHALL keep the previously frozen config set
- child-manifest inheritance SHALL be driven by `CONTINUATION_REUSES_FROZEN_CONFIG(...)`, not by the mere presence of `prior_manifest`
- amendment, remediation, drift-reassessment, analysis, and new-request continuation children SHALL default to `FRESH_CHILD_RESOLUTION`
- inherited non-live compliance config SHALL NOT authorize a new live filing-capable or amendment-capable progression outside the documented replay or same-attempt recovery carve-outs
- `COUNTERFACTUAL_ANALYSIS` replay SHALL still declare explicitly whether config stayed exact, was historically inherited, or was freshly resolved
- `DIRECT_REQUEST_RESOLUTION` SHALL keep `source_config_freeze_ref/hash/surface_hash = null`
- exact or historical frozen reuse SHALL keep non-null `source_config_freeze_ref/hash/surface_hash` and SHALL preserve exact hash equality against the active `ConfigFreeze`

## CONTINUATION_ALLOWED(...)
**Goal**: Decide whether a prior manifest may legally spawn a continuation child under the requested scope and run kind, including recovery after a started or failed run.  
**Output**: boolean + continuation basis/reason code.  
**Invariant**:
- return `false` when a same-request retry targets a terminal manifest whose persisted `DecisionBundle` can be reloaded idempotently; bundle reload has precedence over child creation
- recovery of an already-started attempt SHALL return `true` only when `manifest_start_claim.claim_state = STALE_RECLAIM_REQUIRED`; an `ACTIVE_LEASED` manifest SHALL block recovery-child allocation

## BEGIN_MANIFEST(...)
**Goal**: Create the `RunManifest` control object that captures the run envelope before freeze/seal transitions are applied.  
**Output**: `RunManifest`.  
**Invariant**:
- No artifact exists without being attached to exactly one manifest.
- when `run_kind = NIGHTLY`, `launch_context.nightly_batch_run_ref` and
  `launch_context.nightly_window_key` SHALL be captured on the manifest before freeze so same-window
  duplicate suppression and cross-window continuity do not depend on scheduler memory alone.

## BEGIN_CHILD_MANIFEST(...)
**Goal**: Create a child manifest for approved continuation, late-data branching, replay, remediation, started-run recovery, or amendment progression while preserving lineage.  
**Output**: child `RunManifest`.  
**Invariant**:
- parent/child lineage must be explicit; continuation never silently mutates the old manifest
- child manifests SHALL persist `continuation_basis`, `continuation_set.config_inheritance_mode`, and
  `continuation_set.input_inheritance_mode` so lineage replay can distinguish replay-exact,
  recovery-exact, historical-explicit, fresh-child resolution, and fresh-child collection paths
- child manifests SHALL also persist non-null `root_manifest_id`, non-null `parent_manifest_id`, and
  `continuation_set.parent_manifest_hash_at_branch`; replay children SHALL bind
  `parent_manifest_id = replay_of_manifest_id`
- started-run recovery children SHALL reuse the parent's `manifest_start_claim.attempt_lineage_ref`
  and SHALL not be allocated while the parent still reports `manifest_start_claim.claim_state = ACTIVE_LEASED`
- when the caller supplies nightly launch context, the child manifest SHALL preserve the same
  `nightly_window_key`; a changed `nightly_batch_run_ref` is legal only for a formally recorded
  successor recovery batch

## UPDATE_MANIFEST_PRESEAL_CONTEXT(...)
**Goal**: Persist pre-seal manifest fields that are allowed to change before seal, including access decision, config freeze identity, and continuation-set patches.  
**Output**: updated pre-seal manifest projection.  
**Invariant**:
- SHALL NOT rewrite a sealed manifest's frozen envelope
- SHALL record `continuation_set.config_inheritance_mode` whenever a child manifest inherits or intentionally does not inherit parent config
- SHALL record `continuation_set.input_inheritance_mode` whenever a child manifest inherits or intentionally does not inherit parent input
- SHALL persist `hash_set.execution_basis_hash` no later than `FROZEN` when the input and config freeze are known
- SHALL persist `frozen_execution_binding{...}` atomically with `config_freeze`, `input_freeze`, and `hash_set` so downstream workers have one sealed manifest-bound ref/hash packet to consume
- SHALL persist `ConfigFreeze.config_resolution_basis`, `source_config_freeze_ref/hash/surface_hash`,
  and `config_consumption_mode` atomically with `continuation_set.config_inheritance_mode`
- when lineage fields are projected both top-level and inside `continuation_set{...}`, the write path SHALL update them atomically and preserve byte-identical values in both locations
- when the worker-facing lineage and freeze mirror is published in `frozen_execution_binding{...}`, the write path SHALL update that envelope in the same transaction so reloaders never have to merge partial lineage from `continuation_set{...}` plus adjacent freeze rows
- `nightly_batch_run_ref` and `nightly_window_key` SHALL be treated as frozen identity fields for
  `run_kind = NIGHTLY`; a pre-seal write MAY validate or copy them from launch context, but SHALL
  NOT silently substitute them after idempotency identity has been derived

## VALIDATE_MANIFEST_LINEAGE_PROJECTION(...)
**Goal**: Ensure duplicated lineage projection fields remain exact mirrors of `continuation_set{...}` before the manifest is reused, continued, sealed, or rendered.  
**Output**: `status ∈ {VALID, INVALID}` + typed `reason_code`.  
**Invariant**:
- duplicated lineage fields are read-model accelerators only and SHALL NOT become an alternate source of truth
- validation SHALL compare `root_manifest_id`, `parent_manifest_id`, `continuation_of_manifest_id`, `replay_of_manifest_id`, `supersedes_manifest_id`, and `manifest_generation` against `continuation_set{...}`
- validation SHALL reject any `NEW_MANIFEST` whose `root_manifest_id != manifest_id` or whose child
  lineage refs are non-null
- validation SHALL reject any child manifest missing non-null `root_manifest_id`,
  `parent_manifest_id`, or `continuation_set.parent_manifest_hash_at_branch`
- validation SHALL reject any replay child whose `parent_manifest_id != replay_of_manifest_id`
- divergence SHALL fail closed and open remediation rather than silently normalizing one copy

## EMIT_MANIFEST_LINEAGE_TRACE(...)
**Goal**: Persist one `ManifestLineageTrace` for every branch-selection invocation and link it back
to the selected manifest plus the audit/span narrative for that branch.  
**Output**: `ManifestLineageTrace` + append-only selected-manifest trace ref update where a selected
manifest exists.  
**Invariant**:
- the explorer SHALL serialize exact branch inputs, selected branch outcome, selected manifest
  lineage snapshot, exhaustive `candidate_evaluations[]`, typed disqualifier reason codes,
  `mirror_consistency_state`, and nightly predecessor context
- `ManifestLineageTrace.selected_branch_action` SHALL record the request-time branch outcome even
  when the selected manifest's persisted `continuation_basis` remains `NEW_MANIFEST`
- bundle return and same-manifest sealed reuse SHALL still emit a trace instead of relying on the
  selected manifest's original `manifest_branch_decision{...}` to explain the later request
- the selected manifest SHALL append the new `manifest_lineage_trace_ref` to
  `manifest_lineage_trace_refs[]` without rewriting the manifest's original lineage truth
- operator tooling SHALL consume the persisted trace and SHALL NOT reconstruct lineage by scanning
  adjacent manifest rows

## LOAD_EXISTING_DECISION_BUNDLE(...)
**Goal**: Return the already-persisted outcome for a terminal manifest (`COMPLETED` or `BLOCKED`) when the same operation is retried against the same manifest envelope.  
**Output**: existing `DecisionBundle`.  
**Invariant**: Idempotent same-manifest retry never duplicates artifacts or submissions.

## LOAD_SEALED_RUN_CONTEXT(...)
**Goal**: Reload the previously persisted pre-start sealed execution context for same-manifest retry, exact replay, exact recovery, or explicitly historical child reuse without recollecting sources, rebuilding intake artifacts, or resealing the source manifest.
**Input**: `source_manifest`.
**Output**: `source_plan`, `source_window`, `collection_boundary`, `normalization_context`, authoritative intake artifact sets, `snapshot`, `input_freeze`, and the ordered pre-seal non-access gate record sequence.
**Invariant**:
- the loader SHALL fail closed if any referenced authoritative intake artifact is missing, hash-mismatched, schema-incompatible, or outside the allowed historical-read window for the requested replay mode
- exact replay and exact recovery SHALL consume the persisted historical artifacts returned by this loader and SHALL NOT fall back to fresh collection

## VALIDATE_REPLAY_PRECONDITIONS(...)
**Goal**: Confirm that a replay or historical-input child can legally bind to the source manifest's frozen execution basis before any artifact is reused.
**Output**: `status ∈ {VALID, INVALID}` + typed `reason_code`.
**Invariant**:
- `STANDARD_REPLAY` and `AUDIT_REPLAY` SHALL require byte-identical `execution_basis_hash`, `config_inheritance_mode = REPLAY_EXACT`, and `input_inheritance_mode = REPLAY_EXACT`
- exact replay SHALL fail closed on missing or corrupt `ConfigFreeze`, `InputFreeze`, gate records, historical authority basis, or historical late-data monitor basis
- policy-version skew, schema-reader incompatibility, or unavailable historical decrypt/build capability SHALL surface typed replay-basis failure rather than silent approximation

## LOAD_FROZEN_POST_SEAL_BASIS(...)
**Goal**: Reload the persisted historical authority basis and post-seal late-data monitor result from a source manifest for exact replay or historically limited comparison.
**Output**: `status ∈ {VALID, INVALID}` + `append_only_outcome_projection.post_seal_basis{...}`, `authority_context`, `late_data_monitor_result`, and typed limitation metadata when applicable.

## LOAD_SUBMISSION_LINEAGE(...)
**Goal**: Load known `SubmissionRecord` lineage relevant to the current manifest, including current-manifest refs plus parent/root/continuation-linked submission history needed for baseline and amendment decisions.  
**Output**: ordered submission-lineage refs.

## LOAD_AMENDMENT_CASE(...)
**Goal**: Load the active lineage-linked `AmendmentCase` for the current client/period when amendment submission or reassessment depends on previously persisted intent-to-amend state.  
**Output**: `AmendmentCase` or `None`.

## TRANSITION_MANIFEST(...)
**Goal**: Apply one named lifecycle transition to `RunManifest` and fail closed if the transition is illegal for the current state.  
**Output**: updated manifest lifecycle state.  
**Invariant**: Manifest lifecycle changes occur only through the state machine in `state_machines.md`.

## CLAIM_MANIFEST_START(...)
**Goal**: Atomically claim the right to execute a `SEALED` manifest under a single-writer lease and,
on success, perform the legal `run_started` transition.  
**Output**: status in `{CLAIM_GRANTED, ALREADY_TERMINAL, ALREADY_ACTIVE, INVALID_PRESTART_STATE, RECOVERY_REQUIRED, RECLAIM_GRANTED, RECLAIM_REJECTED_ACTIVE_LEASE}` + updated manifest/start-claim refs.  
**Invariant**:
- only one live writer may claim a given sealed manifest at a time
- the `SEALED -> IN_PROGRESS` transition SHALL be compare-and-swap protected
- the claim target SHALL still be a pre-start sealed manifest with `opened_at = null`, empty
  outcome/submission/drift projections, and null `decision_bundle_hash`,
  `deterministic_outcome_hash`, and `replay_attestation_ref`
- `manifest_start_claim{ claim_state, claim_status_code, claim_epoch, claim_holder_ref_or_null,
  claim_token_or_null, claim_acquired_at_or_null, claim_expires_at_or_null, stage_dag_ref_or_null,
  outbox_batch_ref_or_null, first_publication_committed_at_or_null }` SHALL be committed in the same
  durable boundary as `RunManifest.opened_at`
- `CLAIM_GRANTED` and `RECLAIM_GRANTED` SHALL publish the first post-seal stage/outbox batch in that
  same commit; broker replay SHALL never be the source of truth for whether execution started
- `RECOVERY_REQUIRED` SHALL retain `manifest_start_claim.claim_state = STALE_RECLAIM_REQUIRED` plus a
  typed `stale_reclaim_reason_code_or_null`; recovery SHALL continue from persisted publication
  evidence rather than blind resend
- a failed claim SHALL prevent execution and SHALL NOT duplicate artifacts or submissions
- a recovery child SHALL NOT be created while another active start lease still exists for the same
  attempt lineage

## UPDATE_MANIFEST_GATES(...)
**Goal**: Rebuild or synchronize the manifest's gate-outcome projection from persisted `GateDecisionRecord`s without mutating the underlying gate records. Incremental post-seal writes SHALL use `APPEND_MANIFEST_GATES(...)`.  
**Output**: updated manifest gate summary.

## APPEND_MANIFEST_GATES(...)
**Goal**: Append post-seal `GateDecisionRecord` refs for later ordered gates whose inputs arise only after seal.  
**Output**: updated manifest gate summary / ordered gate refs.  
**Invariant**:
- append-only; never rewrite earlier gate records
- never alter sealed scope, config freeze, input freeze, deterministic seed, or manifest hash
- later gate refs remain ordered and replayable

## PERSIST_GATE_BATCH(...)
**Goal**: Persist an ordered batch of `GateDecisionRecord`s and emit the paired `GateEvaluated` events in one transaction-safe unit.  
**Output**: persisted ordered gate refs.  
**Invariant**:
- supplied order SHALL be preserved exactly
- a batch of one SHALL be semantically identical to single-record persistence
- batch persistence SHALL NOT reorder pre-seal vs post-seal gate families

## BUILD_PRESEAL_GATE_EVALUATION(...)
**Goal**: Materialize the authoritative `preseal_gate_evaluation{...}` contract from the frozen
execution basis and the ordered canonical pre-seal gate tape.  
**Output**: `preseal_gate_evaluation`.
**Invariant**:
- the required gate order SHALL remain exactly `[MANIFEST_GATE, ARTIFACT_CONTRACT_GATE,
  INPUT_BOUNDARY_GATE, DATA_QUALITY_GATE]`
- `completion_state = COMPLETE_READY_TO_SEAL` or `COMPLETE_BLOCKED_PRESTART` SHALL imply that all
  four canonical pre-seal gates were evaluated exactly once on one `execution_basis_hash`
- `completion_state = PENDING_PREREQUISITES` SHALL publish explicit `missing_prerequisite_refs[]`
  and SHALL NOT publish any persisted gate tape yet
- later post-seal gates SHALL append after this frozen prefix; they SHALL NOT rewrite or
  reinterpret the pre-seal gate ids, order, or disposition
- any persisted mismatch between the frozen pre-seal tape and the published gate evaluation SHALL
  bind invariant class `PRESEAL_GATE_CHAIN` rather than being normalized into a nearby completion
  state

## UPDATE_MANIFEST_OUTPUTS(...)
**Goal**: Append or synchronize post-seal manifest outcome projections such as `output_refs`, `audit_refs`, `submission_refs`, `drift_refs`, and related top-level refs without altering the frozen execution envelope.  
**Output**: updated manifest outcome projection.
**Invariant**:
- the authoritative append path SHALL be `append_only_outcome_projection{...}`
- top-level `gating_decisions[]`, `output_refs{...}`, `audit_refs[]`, `submission_refs[]`, `drift_refs[]`, `decision_bundle_hash`, `deterministic_outcome_hash`, and `replay_attestation_ref` SHALL be synchronized mirrors only
- every `output_refs{...}` update SHALL preserve the structured output-link entry (`linkage_role_code`, `artifact_type`, `artifact_ref`, `artifact_hash_or_null`, `produced_by_manifest_id`, and `dependency_identity_refs[]`) so proof/twin/replay lineage is not reconstructed later from adjacent bundle or graph rows
- post-seal authority and late-data lineage adopted after seal SHALL be written only into `append_only_outcome_projection.post_seal_basis{...}`, never back into `frozen_execution_binding{...}` or `hash_set.execution_basis_hash`

## APPLY_EXECUTION_MODE_STAMP(...)
**Goal**: Attach the common execution-context field group to a derived artifact before persistence.  
**Output**: stamped artifact.  
**Invariant**:
- for `mode = COMPLIANCE`:
  - `analysis_only = false`
  - `non_compliance_config_refs[] = []`
  - `counterfactual_basis = None`
- for `mode = ANALYSIS`:
  - `analysis_only = true`
  - `non_compliance_config_refs[]` SHALL identify every frozen config entry whose status-at-freeze is
    not compliance-live for the modeled action
  - `counterfactual_basis` SHALL record the modeled/non-live basis for the run
- replay-derived artifacts SHALL keep replay class and execution mode aligned:
  `STANDARD_REPLAY` / `AUDIT_REPLAY` use `mode = COMPLIANCE`, while
  `COUNTERFACTUAL_ANALYSIS` uses `mode = ANALYSIS`
- every derived artifact persisted after manifest allocation SHALL carry this field group, whether the
  caller applies the stamp explicitly or the callee persists the artifact internally
- every downstream artifact that can be reopened, replayed, audited, or routed for action SHALL also
  persist `execution_mode_boundary_contract{ run_kind, replay_class_or_null, execution_mode,
  analysis_only, non_compliance_config_refs[], counterfactual_basis, execution_posture,
  legal_effect_boundary, disclosure_reason_codes[] }`
- `legal_effect_boundary = COMPLIANCE_CAPABLE` is reserved for live compliance posture only;
  `LIVE_ANALYSIS`, `REPLAY_COMPLIANCE`, and `REPLAY_COUNTERFACTUAL` SHALL stay read-only and SHALL
  cap filing, amendment, authority-waiting, and operator-safe-action projections accordingly

## PERSIST_DECISION_BUNDLE(...)
**Goal**: Persist the terminal or review `DecisionBundle`, stamp `persisted_at`, compute `decision_bundle_hash`, and synchronize any top-level bundle refs into the manifest's append-only outcome projection.  
**Output**: persisted `DecisionBundle`.
**Invariant**:
- any persisted `primary_proof_bundle_ref` SHALL imply a persisted `graph_id`
- any persisted `twin_id` SHALL imply persisted `graph_id` and `parity_id`
- replay children SHALL not expose `replay_attestation_ref` until the attestation has been durably persisted

## COMPUTE_EXECUTION_BASIS_HASH(...)
**Goal**: Canonically hash the full deterministic execution basis from the frozen config surface, frozen input surface, actor/access binding, build, and environment context.
**Output**: `execution_basis_hash`.
**Invariant**:
- canonical serialization SHALL be byte-stable across runtimes and language implementations
- the hashed surface SHALL match `frozen_execution_binding{...}` and SHALL exclude append-only post-seal outcome material
- exact replay and same-attempt recovery SHALL preserve the same `execution_basis_hash`; counterfactual replay SHALL surface a different hash or an explicitly declared limited-comparison reason

## COMPUTE_DETERMINISTIC_OUTCOME_HASH(...)
**Goal**: Canonically hash the normalized material outcome surface for a persisted manifest.
**Output**: `deterministic_outcome_hash`.
**Invariant**:
- the normalized surface SHALL exclude persistence-only identifiers, workflow queue ids, and wall-clock write times
- the normalized surface SHALL include every gate and material artifact whose content can affect the legal or compliance meaning of the run
- the hash input SHALL be limited to already persisted or transactionally staged outcome artifacts; replay workers SHALL not fold non-persisted material into a supposedly deterministic outcome hash

## PERSIST_DETERMINISTIC_GOLDEN_PACK(...)
**Goal**: Persist the candidate-bound deterministic fixture pack reviewed by the blocking deterministic and state-machine suite.
**Output**: `DeterministicGoldenPack`.
**Invariant**:
- the pack SHALL bind the exact `candidate_identity_hash`, `schema_bundle_hash`, and `config_bundle_hash`
- module fixtures SHALL retain explicit ordered null-slot paths, canonical decimal strings, and ordered array expectations
- state-transition fixtures SHALL retain named previous/current/event tuples through `state_transition_contract{...}`
- replay fixtures SHALL retain expected `execution_basis_hash` and `deterministic_outcome_hash`
- cadence fixtures SHALL retain deterministic schedule derivation and SHALL set `jitter_policy = NONE`
- green deterministic release evidence SHALL retain the persisted pack ref instead of collapsing the suite into a summary string alone

## COMPARE_REPLAY_OUTCOMES(...)
**Goal**: Compare a replay child's actual execution basis and deterministic outcome against the replay target's expected historical values.
**Output**: comparison object with `basis_validation_state`, `comparison_mode`, `outcome_class`, `difference_reason_codes[]`, `limitation_codes[]`, and mismatch inventory.
**Invariant**:
- `STANDARD_REPLAY` and `AUDIT_REPLAY` SHALL classify any material mismatch against an unchanged execution basis as `UNEXPECTED_MISMATCH`
- `COUNTERFACTUAL_ANALYSIS` SHALL classify declared-basis differences as `EXPECTED_EQUIVALENCE`, `EXPECTED_DIFFERENCE`, or `LIMITED_COMPARABLE`; any undeclared observed variance SHALL be `UNEXPECTED_MISMATCH`
- `LIMITED_COMPARABLE` SHALL require explicit `limitation_codes[]` and at least one observable
  material outcome component; otherwise the replay SHALL fall to `BASIS_INCOMPLETE`
- every observable or corrupt outcome-component comparison row and every persisted artifact-backed
  mismatch entry SHALL retain a non-null `component_ref` so auditors can reopen the exact object
  that was compared

## PERSIST_REPLAY_ATTESTATION(...)
**Goal**: Persist the replay-comparison artifact that explains the replay outcome to operators and auditors.
**Output**: `ReplayAttestation`.
**Invariant**:
- no replay child may expose exact, expected, limited, or corrupt replay posture until the
  persisted attestation exists and `RunManifest.replay_attestation_ref` has been synchronized
- the persisted attestation SHALL retain `basis_integrity_contract{...}` so historical-basis reuse,
  declared counterfactual substitution, hidden live reads, and non-persisted outcome-material drift
  are explicit rather than inferred from root hashes
- `STANDARD_REPLAY` and `AUDIT_REPLAY` SHALL stamp compliance posture, while
  `COUNTERFACTUAL_ANALYSIS` SHALL stamp analysis posture plus non-null `counterfactual_basis`
- the persisted attestation SHALL keep concrete `component_ref` linkage for every observable
  decision, graph, twin, packet, authority, late-data, or drift artifact it compares

## FINALIZE_TERMINAL_OUTCOME(...)
**Goal**: Normalize every blocked, review-required, or completed return after manifest allocation.
The helper SHALL apply the legal manifest lifecycle transition before persistence:
- `decision_status = BLOCKED` while manifest is `FROZEN` -> `seal_blocked`
- `decision_status = BLOCKED` while manifest is `IN_PROGRESS` -> `gate_block`
- `decision_status = REVIEW_REQUIRED` -> `run_completed`
- `decision_status = COMPLETED` -> `run_completed`

Review-required outcomes SHALL therefore persist `RunManifest.lifecycle_state = COMPLETED` while
preserving `DecisionBundle.decision_status = REVIEW_REQUIRED`.
Review posture SHALL be carried by gate records, trust posture, and workflow items, not by a blocked
manifest lifecycle state.

If the helper is invoked with `decision_status = REVIEW_REQUIRED` before the manifest has entered
`IN_PROGRESS`, it SHALL fail closed unless the caller first progresses the manifest legally into run
execution.
If the supplied terminal posture disagrees with the lawful lifecycle state or the bound
`invariant_enforcement_contract{...}`, the helper SHALL reject that input as a
`LIFECYCLE_TRANSITION` invariant failure instead of normalizing it to a nearby legal state.

Before finalizing, the helper SHALL ensure that every object reference carried in the supplied
`DecisionBundle`, `terminal_reasons`, or `gate_records` is already durably persisted. For pre-start
blocked outcomes this SHALL include persisting the supplied snapshot/input/gate artifacts through
`PERSIST_PRESTART_TERMINAL_CONTEXT(...)` or an equivalent transactional persistence step before the
bundle is written.

The helper SHALL derive and persist required `ErrorRecord` / `RemediationTask` objects from terminal
reasons, emit the manifest lifecycle audit event implied by the terminal decision (`ManifestBlocked`
or `ManifestCompleted`), release any active manifest-start lease, apply retention and observability
across the currently materialized manifest refs, and normalize the bundle's replay-safe UX bridge
before persistence. That normalization SHALL preserve backward-compatible `decision_status` while also
backfilling `decision_bundle_id`, `artifact_type = DecisionBundle`, the common execution-context
field group, `decision_reason_codes[]`, `dominant_reason_code`,
`decision_explainability_contract{...}`, `outcome_class`, `waiting_on`, `checkpoint_state`,
`truth_state`, `plain_reason`, `reason_codes[]`, `next_action_codes[]`, `blocked_action_codes[]`,
`actionability_state`, `primary_action_code`, `no_safe_action_reason_code`,
`suggested_detail_surface_code`, `active_detail_surface_code`, `focus_anchor_ref`,
`next_checkpoint_at`, and `persisted_at` from terminal reasons, gate records, workflow posture, and
known authority posture. When `manifest.output_refs{}` already contains `filing_case_id` or
`amendment_case_id`,
the helper SHALL copy those refs into the bundle unless the caller supplied a more specific value.
It SHALL also normalize `workflow_item_refs[]` so only still-open post-terminal work survives in the
persisted bundle; resolved transmit/reconciliation trackers MUST be closed or excluded before the
bundle is written. It SHALL also attach artifact-contract metadata before persistence. The helper SHALL then persist the
supplied `DecisionBundle`, synchronize `decision_bundle_hash`, compute and persist
`deterministic_outcome_hash`, and, when `run_kind = REPLAY`, invoke `COMPARE_REPLAY_OUTCOMES(...)` and
`PERSIST_REPLAY_ATTESTATION(...)` before returning the persisted bundle. Exact replay mismatch, basis
corruption, retention limitation, or expected counterfactual difference SHALL therefore become a
first-class manifest-linked artifact rather than a log-only afterthought. When a replay attestation
is persisted, the helper SHALL also copy `replay_attestation_ref` into the returned bundle. It
SHALL also preserve the bundle's artifact-identity spine so proof/twin refs never outlive the
graph or parity refs needed to reopen them safely.
**Output**: persisted `DecisionBundle`.

## FINALIZE_RUN_FAILURE(...)
**Goal**: Normalize an unhandled system fault after manifest allocation.  
The helper SHALL transition `RunManifest` with `system_fault` when legal, persist the normalized
`ErrorRecord`, release any active manifest-start lease, emit `ManifestFailed`, apply retention and
observability across already materialized refs, and return a manifest-linked failure response.  
The helper SHALL also persist `invariant_enforcement_contract{...}` on both the manifest and the
error object. Pre-start faults, including failures while the manifest is still `SEALED`, SHALL bind
`failure_stage_or_null = PRESTART` and `terminal_audit_event_type_or_null = ManifestBlocked`;
post-start faults SHALL bind `failure_stage_or_null = POSTSTART` and
`terminal_audit_event_type_or_null = ManifestFailed`.
**Output**: failure response linked to `manifest_id` and `error_id`.

## PERSIST_PRESTART_TERMINAL_CONTEXT(...)
**Goal**: Persist the minimum authoritative artifact pack required to explain and defend a blocked
pre-start outcome before the run ever enters `IN_PROGRESS`.  
**Output**: persisted refs for snapshot, input freeze, boundary artifacts, `preseal_gate_evaluation`,
and ordered pre-seal gate records.  
**Invariant**:
- no pre-start blocked `DecisionBundle` may reference a snapshot, input freeze, or gate record that
  has not already been durably persisted
- the persisted `preseal_gate_evaluation{...}` SHALL record
  `completion_state = COMPLETE_BLOCKED_PRESTART` and the exact blocking pre-seal gate codes
- the helper SHALL persist its artifact set transactionally or fail closed
- the helper SHALL NOT mark the manifest `SEALED`

## PLAN_SOURCE_COLLECTION(...)
**Goal**: Build a required-domain source plan before canonicalization begins.  
**Output**: `source_plan` with source classes, partitions, read model, cursor strategy, late-data policy, and completeness expectations.
**Invariant**:
- planning SHALL bind to `runtime_scope[]` and frozen connector/input policy
- projection masking SHALL NOT remove source domains or fields required to execute the authorized tokens
- every `required_domains[]` entry SHALL be covered by at least one `planned_sources[]` entry and no
  planned source may sit outside `required_domains[]`; omission is lawful only when later persisted
  as an explicit exclusion or missing-source declaration, never as an implied planner shortcut

## COLLECT_SOURCES(...)
**Goal**: Fetch raw payloads via the controlled gateway according to `source_plan`.  
**Output**: `raw_batch` + page/request audit refs.  
**Invariant**:
- never access providers directly from application code
- collection after the frozen `read_cutoff_at` SHALL NOT extend the active manifest's intake set; it
  becomes late-data evidence only

## FREEZE_COLLECTION_BOUNDARY(...)
**Goal**: Freeze the source completeness and read boundary before canonicalization.  
**Output**: `collection_boundary` with `source_plan_ref`, `source_window_id`, read cutoff,
provider version set, connector build/profile refs, cursor checkpoints, request audit refs,
completeness expectations, late-data policy, and one explicit per-domain `boundary_disposition`.
**Invariant**:
- every planned source domain SHALL be frozen as exactly one of
  `{IN_SCOPE_COLLECTED, NO_DATA_CONFIRMED_AT_CUTOFF, EXCLUDED_BY_POLICY, MISSING_AT_CUTOFF, STALE_AT_CUTOFF}`
- canonicalization SHALL NOT infer "no data" from omission

## LATE_DATA_INDICATORS(...)
**Goal**: Derive late-arrival indicators and policy-relevant source freshness signals from the frozen source plan and collection boundary.  
**Output**: `late_data_indicator_set`.

## MATERIALIZE_SOURCE_WINDOW(...)
**Goal**: Materialize the frozen collection interval as a first-class `SourceWindow` artifact.  
**Output**: `source_window`.
**Invariant**:
- `collection_started_at <= collection_completed_at <= read_cutoff_at`; a post-completion cutoff or
  back-dated completion MUST be rejected before the boundary becomes authoritative
- once the window is materialized, post-cutoff observations SHALL be routed only through the
  late-data contracts; they SHALL NOT reopen the active manifest boundary

## MATERIALIZE_SOURCE_RECORDS(...)
**Goal**: Convert frozen raw payloads into first-class `SourceRecord` artifacts.  
**Output**: `source_records`.

## MATERIALIZE_EVIDENCE_ITEMS(...)
**Goal**: Create first-class `EvidenceItem` artifacts from source records and extraction rules.  
**Output**: `evidence_items`.
**Invariant**:
- every `EvidenceItem` SHALL retain non-null `extraction_method`, `extraction_confidence`, and
  `lineage_refs[]`; derived evidence may be low-confidence, but it SHALL NOT become structurally
  indistinguishable from an unexamined payload

## EXTRACT_CANDIDATE_FACTS(...)
**Goal**: Extract normalized `CandidateFact` artifacts from source records and evidence items.  
**Output**: `candidate_facts`.
**Invariant**:
- every `CandidateFact` SHALL keep explicit `confidence` and at least one
  `supporting_evidence_refs[]`; extraction MAY remain weak or contested, but it SHALL NOT become an
  implicit fact with no retained support
- every `CandidateFact` SHALL retain `collection_boundary_ref`, `normalization_context_ref`,
  `source_record_refs[]`, `source_record_lineage_hash`, `evidence_lineage_hash`, exact
  single-partition binding, and `visibility_basis = UNMASKED_AUTHORITATIVE_ONLY`
- candidate extraction SHALL fail closed if the normalized result widens partition scope beyond the
  exact partition carried by the supporting source/evidence lineage

## DETECT_CONFLICTS(...)
**Goal**: Persist first-class `ConflictRecord` artifacts for unresolved inconsistencies.  
**Output**: `conflicts`.
- cross-partition contamination SHALL surface as first-class conflict posture rather than by
  widening a candidate or canonical fact's partition scope

## PROMOTE_CANONICAL_FACTS(...)
**Goal**: Promote eligible candidates into first-class `CanonicalFact` artifacts under promotion rules.  
**Output**: `canonical_facts`.
**Invariant**:
- promotion to compliance-authoritative posture SHALL preserve `freshness_state` plus at least one
  retained `supporting_evidence_refs[]`; unresolved blocking conflicts or support-free promotion
  SHALL fail closed rather than silently hardening an assumption
- every promoted `CanonicalFact` SHALL retain `promoted_from_candidate_fact_refs[]`,
  `promotion_record{...}`, exact single-partition binding, and complete source/evidence lineage
- `promotion_record.blocking_conflict_count_at_promotion` SHALL equal `0` for
  `promotion_state = CANONICAL`
- masked, customer-safe, or otherwise visibility-limited projections SHALL NOT be promotion input;
  authoritative promotion uses only unmasked frozen lineage

## BUILD_ARTIFACT_SET(...)
**Goal**: Wrap artifact lists into first-class set artifacts with deterministic ordering and stable set identity.
**Output**: typed set artifact (for example `SourceRecordSet`, `EvidenceItemSet`, `CandidateFactSet`, `ConflictSet`, `CanonicalFactSet`).
- candidate and canonical fact sets SHALL deduplicate by stable logical identity inside exact
  partition scope, not merely by artifact id

## WRAP_AND_HASH(...)
**Goal**: Build a typed artifact set and compute deterministic `item_identity_hash`, `set_hash`, and
`artifact_contract_hash`.
**Output**: typed set artifact with hashing fields and `produced_at` ready for contract validation.
- candidate and canonical set ordering SHALL remain stable across replay, retry, and conflict-only
  posture changes

## FREEZE_NORMALIZATION_CONTEXT(...)
**Goal**: Freeze mapping, evidence, promotion, and normalization rules used for candidate/canonical formation into a first-class artifact.  
**Output**: `normalization_context` + normalization context hash.

## DECLARED_EXCLUSIONS(...)
**Goal**: Materialize the explicit exclusion declarations attached to the frozen input set.  
**Output**: exclusion declaration set.

## DECLARE_MISSING_SOURCES(...)
**Goal**: Declare source domains that were required but not present inside the frozen collection boundary.  
**Output**: missing-source declaration set.

## DECLARE_STALE_SOURCES(...)
**Goal**: Declare source domains whose freshness state violates the frozen freshness policy.  
**Output**: stale-source declaration set.

## FREEZE_INPUT_SET(...)
**Goal**: Freeze the exact source/evidence/candidate/canonical/conflict population and authoritative artifact-contract set in scope for the run, together with the exact frozen `source_plan_ref`, `source_window_ref`, and per-source `late_data_policy_bindings[]`.  
**Input**: `manifest`, `source_plan`, `source_window`, `collection_boundary`, authoritative record/fact sets, exclusion declarations, missing/stale declarations, normalization context, `artifact_contract_refs[]`, and `artifact_contract_hash`.  
**Output**: `input_freeze` with `source_plan_ref`, `source_window_ref`, `collection_boundary_ref`, `late_data_policy_bindings[]`, `input_set_hash`, exclusion/missing/stale declarations, normalization context ref/hash, `artifact_contract_refs[]`, and `artifact_contract_hash`.
**Invariant**:
- `exclusion_refs[]`, `missing_source_declarations[]`, and `stale_source_declarations[]` SHALL all be
  explicit and disjoint; required domains SHALL NOT disappear from the frozen input set without one
  of those declarations making the omission reviewable
- `artifact_contract_refs[]` SHALL cover the authoritative pre-seal intake pack:
  `SourcePlan`, `SourceWindow`, `CollectionBoundary`, `NormalizationContext`,
  `SourceRecordSet`, `EvidenceItemSet`, `CandidateFactSet`, `ConflictSet`, `CanonicalFactSet`, and
  `Snapshot`

## COLLECTION_LATE_DATA_BINDINGS(...)
**Goal**: Project the ordered set of frozen late-data policy bindings that apply to the current runtime scope from the frozen collection boundary.  
**Output**: ordered `LateDataPolicyBinding[]` keyed by `source_domain` and the applicable partition/scope refs.

## MONITOR_LATE_DATA_AFTER_SEAL(...)
**Goal**: Aggregate post-seal late-data indicators into policy-resolved findings and a gate-visible monitor result.
**Output**: `late_data_findings[]` + `late_data_monitor_result`.

## LOAD_SCHEMA_BUNDLE(...)
**Goal**: Load the frozen schema bundle by `schema_bundle_hash` and expose versioned artifact contracts for intake-boundary and intake-data artifacts.  
**Output**: `schema_bundle` with schema metadata (`schema_id`, `artifact_type`, `semantic_version`, `content_hash`, compatibility metadata).
**Invariant**:
- one loaded bundle SHALL expose at most one active contract entry per authoritative artifact type;
  multiple schema entries for the same intake artifact type SHALL be treated as bundle corruption
- the loaded bundle SHALL carry `schema_reader_window_contract{...}` so historical manifests,
  replay, restore, and migration verification can prove that the current reader is still lawful for
  the recorded bundle rather than assuming latest-writer compatibility
- release and migration control surfaces SHALL additionally derive one shared
  `schema_bundle_compatibility_gate_contract{...}` plus canonical `compatibility_gate_hash` from
  the loaded bundle, reader-window contract, migration plan or ledgers, native client window, and
  rollback policy so schema safety is bound as a first-class gate object rather than re-inferred by
  each verifier

## VALIDATE_ARTIFACT_SET(...)
**Goal**: Validate each intake artifact set against the frozen set schema before authoritative use.  
**Output**: validation result + `artifact_contract_hash`.
**Invariant**: Leaf schemas are closed with `additionalProperties: false`; composed schemas are closed with `unevaluatedProperties: false`.
- validation SHALL fail closed when the resolved frozen contract set is incomplete, version-ambiguous,
  or does not cover every authoritative intake artifact included in `artifact_contract_refs[]`
- validation SHALL resolve contracts from the manifest's frozen `schema_bundle_hash` plus the
  persisted `schema_reader_window_contract{...}`; it SHALL NOT silently upgrade to the newest live
  bundle just because a compatible reader happens to exist elsewhere

## VALIDATE_ARTIFACT(...)
**Goal**: Validate a single authoritative artifact against the frozen schema for its artifact type.  
**Output**: validation result + artifact contract metadata.
- during schema evolution, callers SHALL respect `SchemaMigrationLedger.schema_reader_window_contract{...}`
  and `SchemaMigrationLedger.backfill_execution_contract{...}`; validation and replay remain on the
  historical meaning until idempotent backfill is complete and the reader window is lawfully closed

## RECORD_ARTIFACT_CONTRACT_REF(...)
**Goal**: Persist the contract reference for one authoritative intake-boundary artifact.  
**Output**: single contract ref for `SourcePlan`, `SourceWindow`, `CollectionBoundary`, or `NormalizationContext`.

## RECORD_ARTIFACT_CONTRACT_REFS(...)
**Goal**: Persist contract references for the authoritative intake-data artifact sets included in `InputFreeze`.  
**Output**: `artifact_contract_refs[]` + ordered `artifact_contract_hashes[]`.

## ARTIFACT_CONTRACT_GATE(...)
**Goal**: Fail closed when intake-boundary or intake-data artifacts are unvalidated, schema-mismatched, or version-incompatible for the frozen bundle.  
**Output**: non-access `GateDecisionRecord` with decision enum
`{PASS, PASS_WITH_NOTICE, MANUAL_REVIEW, OVERRIDABLE_BLOCK, HARD_BLOCK}`.

Release and promotion controls that consume schema evidence SHALL treat the resulting
`schema_bundle_compatibility_gate_contract{...}` as the shared schema-safety boundary across
`VerificationSuiteResult`, `GateAdmissibilityRecord`, `ClientCompatibilityMatrix`,
`ReleaseVerificationManifest`, and `DeploymentRelease`. That shared boundary SHALL freeze the exact
reader-window state, historical-manifest protection, replay/restore readability, migration
chronology, native client window posture, and rollback-vs-fail-forward outcome so release evidence
cannot remain green after the compatibility window changes without recomputing the compatibility
gate hash.

## ASSEMBLE_RELEASE_VERIFICATION_MANIFEST(...)
**Goal**: Assemble one canonical `ReleaseVerificationManifest` from first-class gate evidence, admissibility evidence, companion release evidence, and explicit approval or supersession posture.  
**Output**: `ReleaseVerificationManifest`.
**Invariant**:
- the module SHALL consume only first-class `VerificationSuiteResult`, `GateAdmissibilityRecord`,
  `CanaryHealthSummary`, `RestoreDrillResult`, `ClientCompatibilityMatrix`, migration-ledger, and
  approval artifacts rather than CI dashboards, deploy logs, or ad hoc operator summaries;
- blocking gates SHALL be serialized in one canonical order through
  `manifest_assembly_contract.gate_bindings[]`, and each gate binding SHALL mirror the top-level
  `blocking_gates{...}` row exactly;
- green supporting gates SHALL retain their companion refs in both the top-level manifest and the
  nested `manifest_assembly_contract{...}`;
- restore-drill evidence SHALL remain candidate-bound and SHALL preserve one bound
  `privacy_reconciliation_contract{...}` so promotion cannot treat byte-restore availability as
  sufficient evidence after resurrected or limitation-sensitive data is detected;
- candidate hash, compatibility gate hash, provider-profile set, test-run set, migration posture,
  restore pairing, client window, and approval or supersession posture SHALL remain byte-stable and
  machine-auditable; and
- approval, rollback, deployment, and supersession logic SHALL read that persisted manifest plus its
  nested `manifest_assembly_contract{...}` rather than reconstructing release truth from adjacent
  evidence or environment defaults.

## MANIFEST_GATE(...)
**Goal**: Verify that the manifest envelope, lineage, build refs, and freeze state are valid
for the ordered pre-seal compliance gate chain and that the manifest is ready to be sealed
into a reproducible execution envelope.  
**Output**: non-access `GateDecisionRecord`.
**Invariant**:
- `MANIFEST_GATE` is a pre-seal gate, not a post-seal gate
- it runs while `RunManifest.lifecycle_state == FROZEN`
- sealed-state checks required before authority calls are enforced separately by the authority
  interaction preflight sequence

## INPUT_BOUNDARY_GATE(...)
**Goal**: Verify that the frozen input boundary, late-data policy, and exclusion declarations remain valid for this manifest.  
**Output**: non-access `GateDecisionRecord`.

## DATA_QUALITY_GATE(...)
**Goal**: Convert snapshot quality and completeness posture into a policy-governed non-access gate decision.  
**Output**: non-access `GateDecisionRecord`.

## SEAL_MANIFEST(...)
**Goal**: Seal manifest scope, build refs, config freeze, input freeze, deterministic controls, and the gate results required before seal before filing-capable outputs.  
**Output**: sealed manifest state.  
**Invariant**:
- sealed manifest fields do not drift silently after seal
- later gate refs may append without changing the frozen manifest core
- `preseal_gate_evaluation{...}` SHALL already exist and SHALL carry
  `completion_state = COMPLETE_READY_TO_SEAL` before seal
- `SEAL_MANIFEST(...)` persists the successful pre-seal gate chain; it does not retroactively
  reinterpret `MANIFEST_GATE` as a post-seal check

## WRITE_ARTIFACT(...)
**Goal**: Persist one first-class artifact under exactly one manifest with the correct retention and contract metadata.  
**Output**: persisted artifact reference.

## RECORD_EVENT(...)
**Goal**: Persist the named lifecycle or protocol event for the manifest and linked objects; implementations MAY realize this via `AuditEvent`. Manifest-scoped events SHALL append their audit refs to `RunManifest.audit_refs[]`.  
**Output**: event/audit reference.

## RETENTION_TAG(...)
**Goal**: Resolve the retention class and tagging metadata to apply when an artifact is persisted.  
**Output**: `RetentionTag` or equivalent retention-tag reference.

## TRANSITION_CONFIG_VERSION(...)
**Goal**: Apply one named `ConfigVersion` lifecycle transition and fail closed if the transition is illegal.  
**Output**: updated `ConfigVersion`.
**Invariant**:
- approval, deprecation, revocation, and retirement posture SHALL remain impossible without the
  matching named transition, transition audit ref, and required lineage fields for the target
  state.

## TRANSITION_CONFIG_CHANGE_REQUEST(...)
**Goal**: Apply one named `ConfigChangeRequest` lifecycle transition and fail closed if the transition is illegal.  
**Output**: updated `ConfigChangeRequest`.
**Invariant**:
- implementation and rollback SHALL retain release lineage on the CCR itself; queue movement or
  worker-local status text SHALL not substitute for the formal CCR machine.

## TRANSITION_SOURCE_COLLECTION_RUN(...)
**Goal**: Apply one named `SourceCollectionRun` lifecycle transition and fail closed if the transition is illegal.  
**Output**: updated `SourceCollectionRun`.
**Invariant**:
- partial, failed, and abandoned collection outcomes SHALL retain typed gap or reason refs on the
  same persisted collection object rather than inferring lifecycle from missing rows, logs, or
  worker-local retries.

## BUILD_SNAPSHOT(...)
**Goal**: Build a snapshot from first-class intake artifacts.  
**Output**: snapshot + refs to source, evidence, candidate, canonical, and conflict sets.
**Invariant**:
- the first persisted snapshot SHALL enter `BUILT` through a named `snapshot_built` transition, and
  later validation, supersession, retention-limitation, or erasure posture SHALL advance only via
  `state_transition_contract{...}` with explicit successor or retention lineage where applicable.

## VALIDATE / MEASURE_COMPLETENESS(...)
**Goal**: Identify invalid data and incompleteness explicitly.  
**Output**: quality flags, completeness metrics, incomplete domain set.

## VALIDATE(...)
**Goal**: Validate one authoritative artifact or composite artifact against the frozen rules/profile in context.  
**Output**: validation result.

## MEASURE_COMPLETENESS(...)
**Goal**: Measure completeness of the snapshot or required-domain set against the frozen completeness rules.  
**Output**: completeness metrics.

## SCORE_GRAPH_QUALITY(...)
**Goal**: Score provenance coverage, critical-path completeness, and retention limitations for the built evidence graph.  
**Output**: graph quality summary.

## COMPUTE_OUTCOME(...) / FORECAST(...)
**Goal**: Produce liability/obligation figures; optionally forecast.  
**Output**: compute result, forecast scenarios.  
**Invariant**:
- Forecast must not mutate compliance artifacts.
- `ComputeResult.reporting_scope` SHALL remain a true reporting-scope token only; amendment action
  posture SHALL not appear here.
- Quarterly compute SHALL stay record-layer only even when the frozen provider profile uses a
  cumulative quarterly basis.
- Compliance compute SHALL derive adjustment inclusion from executable reporting scope and exact
  partition scope, not from raw requested scope or analysis-only counterfactual flexibility.

## FORECAST(...)
**Goal**: Produce deterministic analysis-only forecast scenarios from the frozen snapshot and compute result.  
**Output**: `ForecastSet`.

## SEED(...)
**Goal**: Derive a deterministic seed only from frozen deterministic-seed controls and module-local forecast or analysis inputs; `manifest_id` alone SHALL never perturb the seed, and wall-clock randomness is forbidden.  
**Output**: deterministic seed value.

## SCORE_RISK(...)
**Goal**: Generate deterministic feature-level risk flags and a normalized `risk_score` under the
frozen `risk_threshold_profile_ref`, plus `unresolved_material_blocking_risk_flag` for trust
synthesis and workflow gating.  

## EVALUATE_PARITY(...)
**Goal**: Compare computed values against authority values / previously submitted values.  
**Output**: `ParityResult`.
**Invariant**:
- the module SHALL freeze one `parity_threshold_profile_ref`, one deterministic comparison set, and
  one `ordered_field_codes[]` projection before any aggregate classification is attempted
- every persisted field delta SHALL retain the threshold and floor inputs used to compute its exact
  breach ratio so threshold-edge review does not depend on renderer-local rounding
- `comparison_set_state = INVALID` or partial mandatory/desirable coverage SHALL fail closed as
  `parity_classification = NOT_COMPARABLE`; the module SHALL never coerce these conditions into
  `MATCH`
- aggregate classification SHALL follow one deterministic precedence ladder:
  invalid or required-gap not-comparable -> critical blocking -> critical/high material or
  pressure-material -> minor -> match
- the artifact SHALL persist ordered `reason_codes[]` and one `dominant_reason_code` so replay,
  gating, and review surfaces share the same decisive explanation
- `input_artifact_refs[]`, `blocking_dependency_refs[]`, and `active_override_refs[]` SHALL remain
  canonically ordered and deduplicated so replay and audit do not depend on container iteration

## RETENTION_EVIDENCE_GATE(...)
**Goal**: Gate filing-capable progression on provenance coverage, critical-path explainability, retention limitations, and decisively survivable proof posture.
**Output**: non-access `GateDecisionRecord`.

## PARITY_GATE(...)
**Goal**: Convert parity outcomes into a filing/governance gate decision under the frozen parity policy.  
**Output**: non-access `GateDecisionRecord`.
**Invariant**:
- the gate SHALL read `comparison_set_state`, `parity_classification`, and `dominant_reason_code`
  from the persisted `ParityResult`; it SHALL not rebuild those semantics from rounded UI values or
  field iteration order
- invalid comparison sets SHALL remain fail-closed `NOT_COMPARABLE` posture, with mandatory scopes
  blocked and desirable scopes routed to explicit review

## LOAD_OVERRIDES(...)
**Goal**: Load active approved overrides that are in scope for the current manifest, gate family, or filing action, optionally constrained to request-supplied `override_refs[]`.  
**Output**: ordered override set.

## EXTRACT_AUTHORITY_VIEWS(...)
**Goal**: Derive authority comparison views from the frozen intake artifacts within collection boundary scope.  
**Output**: authority view refs for parity and reconciliation.

## LOAD_AUTHORITY_STATE(...)
**Goal**: Materialize the best current authority-grounded state for baseline, reconciliation, filing, and amendment decisions from authority views plus known submission lineage.  
**Output**: authority state summary suitable for drift and filing decisions.

## OBLIGATION_STATUS(...)
**Goal**: Project a normalized obligation-status value from the authority-state summary for filing gating.  
**Output**: obligation status enum.

## AUTHORITY_LINK_STATE(...)
**Goal**: Project whether the principal and client currently have the authority-link prerequisites required for the requested operation.  
**Output**: authority-link state enum.

## APPROVAL_STATE(...)
**Goal**: Evaluate approval posture for either the pre-trust phase or the packet phase.  
**Input**: principal, authorized `runtime_scope[]`, `required_approvals[]`, optional `packet`, and
`phase in {PRE_TRUST, PACKET}`.  
**Output**: one of `{NOT_REQUIRED, SATISFIED, REQUIRED_PENDING, UNSATISFIABLE, DENIED}`.  
**Rules**:
- this module is filing/packet-specific. Governance/control-plane mutations SHALL derive approval posture from `SIMULATE_GOVERNANCE_MUTATION(...).approval_requirement` and SHALL NOT reuse packet-local approval semantics as authorization for policy writes
- when `phase = PRE_TRUST`, packet-local approvals SHALL NOT yield `REQUIRED_PENDING`; they SHALL be
  deferred until packet build
- when `phase = PACKET`, unresolved packet-local approvals that can still be satisfied through the
  filing-notice flow SHALL yield `REQUIRED_PENDING`
- when both step-up and approval are outstanding for the same filing-capable action, `AUTHORIZE(...)`
  SHALL surface `REQUIRE_STEP_UP` first while preserving the packet-local approval obligations in
  canonical `required_approvals[]`

## DECLARED_BASIS_ACK_STATE(...)
**Goal**: Evaluate declaration-basis acknowledgement posture for the concrete filing packet.  
**Input**: principal, authorized `runtime_scope[]`, `packet`.  
**Output**: one of `{NOT_APPLICABLE, NOT_REQUIRED, SATISFIED, REQUIRED_PENDING, UNSATISFIABLE}`.  
**Rules**:
- this module SHALL be evaluated only after `BUILD_FILING_PACKET(...)`
- callers on a legitimate pre-packet path SHALL treat the acknowledgement state as `NOT_APPLICABLE`

## DERIVE_REQUIRED_HUMAN_STEPS(...)
**Goal**: Produce only the pre-trust human-step catalog from the current runtime scope, mode, authority state,
authority-link posture, pre-trust approval posture, parity posture, and amendment posture.  
**Output**: ordered step records with:
- `step_code`
- `reason_codes[]`
- `scope_refs[]`  
**Rule**:
- this module SHALL NOT emit packet-local declaration-basis, disclaimer, or packet-local approval steps
- packet-local notice steps SHALL be emitted only by `DERIVE_PACKET_NOTICE_STEPS(...)` after
  `BUILD_FILING_PACKET(...)`

## DERIVE_PACKET_NOTICE_STEPS(...)
**Goal**: Derive packet-local declaration-basis, disclaimer, and packet-local approval notice steps
from a `PREPARED` filing packet plus the current actor state.  
**Input**: `packet`, principal, authorized `runtime_scope[]`, packet-phase `approval_state`,
packet-phase `declared_basis_ack_state`, `required_approvals[]`.  
**Output**: ordered `FilingNoticeStep` records with:
- `step_code`
- `reason_codes[]`
- `scope_refs[]`
- `packet_refs[]`
**Invariant**:
- persisted packet-local notice-step artifacts SHALL validate against
  `schemas/filing_notice_step.schema.json`

## VALIDATE_OVERRIDE_DEPENDENCIES(...)
**Goal**: Reduce caller-supplied override refs to the exact valid, in-scope override dependencies
that may legally affect the current gate family and runtime scope.
**Input**: manifest, gate family, authorized `runtime_scope[]`, active override refs, authority
context.
**Output**: `valid_override_refs[]`, `invalid_reason_codes[]`, `effective_override_dependency_count`,
`earliest_expiry_at`, `audit_action_codes[]`.
**Invariant**:
- invalid, expired, exhausted, self-approved, or scope-mismatched overrides SHALL never silently count
  as active
- override validation SHALL remain gate-scoped; a trust or filing path SHALL not invent a new
  override family that no upstream gate documented

## ASSESS_TRUST_INPUT_STATE(...)
**Goal**: Classify the current trust basis as `ADMISSIBLE_CURRENT`, `ADMISSIBLE_STALE`,
`INCOMPLETE`, or `CONTRADICTED` before trust synthesis proceeds.
**Input**: snapshot, compute, parity, risk, graph-quality basis, upstream gates, authority state,
late-data monitor, required human steps, overrides, trust policy.
**Output**: `trust_input_state`, `trust_input_basis_contract`, `reason_codes[]`,
`trust_fresh_until`, `blocking_dependency_refs[]`.
**Invariant**:
- missing, superseded, manifest-mismatched, or internally contradictory inputs SHALL fail closed and
  SHALL surface explicit reason codes rather than being normalized away
- the emitted `trust_input_basis_contract` SHALL freeze typed admissibility/currentness states plus
  the resulting automation/readiness ceiling before score or band math is considered
- if baseline selection imposed a stricter cap than freshness or authority state alone,
  `trust_input_basis_contract` SHALL retain `baseline_selection_contract_hash_or_null`,
  `baseline_automation_ceiling`, and explicit baseline limitation reasons so trust cannot silently
  re-open automation by flattening baseline ambiguity into a generic score

## CHECK_TRUST_CURRENCY(...)
**Goal**: Before any filing-capable progression, verify that the currently persisted trust artifact is
still reusable under the latest authority, late-data, override, and upstream-artifact state.
**Input**: current trust artifact, latest upstream decision artifacts, authority state, late-data
monitor, amendment/baseline posture, overrides, current time, trust policy.
**Output**: `state in {CURRENT, RECALC_REQUIRED, NOT_APPLICABLE_PRETRUST}`, `reason_codes[]`,
`blocking_dependency_refs[]`.
**Invariant**:
- any later late-data finding, authority correction, override lifecycle change, or dependency
  supersession that would change trust semantics SHALL yield `RECALC_REQUIRED`
- `LateDataMonitorResult.temporal_consequence_summary` SHALL drive trust invalidation from the
  persisted legal consequence profile, not from raw late-data severity or discovery time alone;
  temporally unproved or filing-critical baseline-touch late data SHALL fail closed into
  `RECALC_REQUIRED`

## BUILD_GATE_EXPLANATION(...)
**Goal**: Generate the bounded operator-facing explanation persisted on `GateDecisionRecord`.
**Input**: final decision, ordered reason codes, blocking dependency refs, threshold metrics, policy
priority order.
**Output**: `dominant_reason_code`, `plain_explanation`, `decision_explainability_contract`.
**Invariant**:
- explanation text SHALL be generated from the frozen reason/dependency basis, not from ad hoc UI copy
- the explanation SHALL remain within the low-noise copy budget and SHALL not omit decisive blockers
- `decision_explainability_contract` SHALL mirror the full ordered reasons, persist the dominant
  reason, compress the first three reasons into a stable summary prefix, retain the exact
  suppressed-reason tail count, and disclose any required authority/limitation/override/actionability
  qualifiers

## SYNTHESIZE_TRUST(...)
**Goal**: Convert quality, parity, risk, graph/defence quality, required human steps, override
reliance, and trust-input admissibility into one actionable trust posture:
- trust_input_state
- trust_input_basis_contract
- trust_sensitivity_analysis_contract
- score_band
- cap_band
- threshold_stability_state
- upstream_gate_cap
- trust_band (machine-facing)
- trust_level (human-facing)
- automation_level (for autopilot)
- filing_readiness (for submission)
- trust_fresh_until
- blocking_dependency_refs[]
- dominant reason / bounded summary
**Input note**:
- `required_human_steps[]` consumed by trust SHALL include only pre-trust human steps
- `baseline_submission_state` and `live_authority_progression_requested` SHALL be explicit inputs;
  trust SHALL NOT infer legal progression posture from UI state or packet-local state
- `trust_input_basis_contract.automation_ceiling` and
  `trust_input_basis_contract.filing_readiness_ceiling` SHALL remain hard upper bounds on the final
  `automation_level` and `filing_readiness`
- `trust_input_basis_contract.baseline_automation_ceiling` SHALL remain an additional hard upper
  bound on the final `automation_level` whenever baseline selection was applicable
- `trust_sensitivity_analysis_contract` SHALL freeze the current score-vs-cap relation, active
  guard-band triggers, trust and authority margins, and the canonical six trust perturbation probes
  before any downstream gate or UI surface consumes trust
- the `risk` input SHALL expose at least `risk_score` and `unresolved_material_blocking_risk_flag`
- packet-local declaration-basis, disclaimer, and packet-local approval notices SHALL NOT be
  inputs to trust synthesis
- packet-local notice steps SHALL instead be derived only after packet build and carried to
  `FILING_GATE(...)` and `RESOLVE_FILING_NOTICES(...)`
**Invariant**:
- trust SHALL not synthesize automation or readiness above the current upstream non-access gate cap
- trust SHALL not synthesize automation or readiness above the persisted
  `trust_input_basis_contract` ceiling
- trust SHALL not publish a stricter `cap_band` than `score_band` without at least one persisted
  non-score `trust_sensitivity_analysis_contract.cap_driver_reason_codes[]` entry explaining why
- the persisted bridge SHALL remain exact:
  `ALLOWED <-> READY_TO_SUBMIT`, `LIMITED <-> READY_REVIEW`, `BLOCKED <-> NOT_READY`
- `TrustSummary.decision_explainability_contract` SHALL remain the authoritative compressed trust
  explanation packet for queues, workflow reload, and low-noise shell restoration

## TRUST_GATE(...)
**Goal**: Convert the synthesized trust posture, upstream gate posture, and unresolved pre-trust
human steps into a non-access gate decision for review, filing, or block progression.
**Output**: non-access `GateDecisionRecord`.
**Invariant**:
- the gate SHALL consume the persisted `trust_input_state` and `threshold_stability_state`, not infer
  them from score alone
- the gate SHALL not invent a synthetic trust-level override path; unresolved overrideability must
  come from documented upstream gates

## BUILD_EVIDENCE_GRAPH(...)
**Goal**: Build a manifest-scoped provenance graph with stable node/edge ids, critical paths, target-level support assessments, proof bundles, and support semantics.
**Output**: `EvidenceGraph` + critical path projection + target assessments + proof-bundle refs + graph address refs.
**Invariant**:
- canonical graph semantics SHALL be derived from unmasked canonical facts
- any `projection_masking_context` SHALL affect only rendered/projection views of the graph, not its
  canonical support semantics
- filing-capable graph builds SHALL emit `target_assessments[]`, `proof_bundle_refs[]`,
  `integrity_summary`, and `graph_hash` in addition to path-level metrics
- every filing-capable target assessment SHALL also persist one shared `proof_closure_contract`
  rather than inferring replay closure, contradiction isolation, or decisive-anchor presence from
  support labels alone
- the builder SHALL classify unsupported, contradicted, stale, and non-replayable critical targets
  explicitly rather than collapsing them into one scalar confidence score
- `proof_bundle_refs[]` SHALL equal the non-null set of `target_assessments[].proof_bundle_ref`, and
  root `primary_path_ref` SHALL resolve to one assessed current target path
- the builder SHALL emit one shared `partition_contract` and SHALL stamp every serialized
  `lineage_boundaries[]` entry with `boundary_edge_ref`, exposed vs decisive path refs, and exact
  tenant/client/scope metadata so cross-manifest traversal never falls back to adjacency lookup
- the builder SHALL also preserve enough path and limitation basis that weighted survivability,
  limitation clarity, and silent-limitation ambiguity are deterministically derivable from the
  persisted graph rather than reconstructed from prose

## SELECT_PRIMARY_PROOF_BUNDLE_REF(...)
**Goal**: Resolve the current controlling proof bundle for the manifest's filing-capable posture from the graph target assessments and runtime scope.
**Output**: proof-bundle ref or explicit null.
**Invariant**:
- the selector SHALL return only a non-superseded proof bundle that corresponds to the current
  dominant filing-capable target in scope
- the selector SHALL also require `proof_closure_contract.support_closed = authority_closed = replay_closed = true`,
  `contradiction_isolated = true`, `current_decisive_anchor_present = true`, and
  `staleness_invalidated = false`
- unsupported, contradicted, stale-beyond-policy, or open-closure posture SHALL not be normalized
  into a healthy controlling ref

## GET_PROVENANCE(...)
**Goal**: Return graph projections, defence paths, authority-state paths, drift paths, retention-limitation paths, or target-level proof posture for a target object.
**Output**: manifest-safe provenance query response.
**Invariant**:
- provenance query results for filing-capable targets SHALL include the resolved target assessment,
  proof-bundle ref, closure state, rejected-path refs, proof-closure contract, and explicit
  contradiction refs when they exist
- query results that span more than one manifest SHALL include the home-manifest-first
  `manifest_refs[]`, the shared `partition_contract`, and every explicit lineage boundary hop rather
  than reconstructing cross-manifest proof from neighboring graph objects

## GENERATE_ENQUIRY_PACK(...)
**Goal**: Render a deterministic enquiry pack from graph critical paths, proof-bundle posture, evidence refs, config refs, authority refs, and limitation notes.
**Output**: human-readable and machine-readable enquiry pack.
**Invariant**:
- enquiry-pack generation SHALL fail closed when the referenced proof bundle is missing, stale beyond
  policy, or non-replayable for the requested audience
- the rendered pack SHALL preserve `explanation_status` and SHALL declare any omitted or failed render
  segment explicitly
- retention-limited exports SHALL preserve `retention_binding`, `limitation_notes[]`, and
  `omission_entries[]` bound to the affected primary or critical path refs
- `primary_path_ref` SHALL remain inside `critical_path_refs[]`, and lineage-boundary exposure SHALL
  stay limited to those serialized critical paths
- every serialized lineage boundary SHALL preserve the same `partition_contract` as the pack and
  SHALL point at the exact `boundary_edge_ref` that licensed the cross-manifest hop

## BUILD_TWIN_VIEW(...)
**Goal**: Materialize the manifest-scoped compliance twin from mirrored lane snapshots, paired
timeline semantics, deterministic delta classification, mismatch summarization, reconciliation
posture, and operator interpretation state.
**Output**: `TwinView` + `TwinStateSnapshot{internal,authority}` + `TwinTimeline` +
`TwinDeltaArc[]` + `TwinMismatchSummary` + `TwinReadinessState` +
`TwinReconciliationState` + `TwinInterpretationState`.
**Invariant**:
- canonical twin semantics SHALL be derived from unmasked canonical facts and authority-grounded
  artifacts
- any `projection_masking_context` SHALL affect only the rendered view
- the twin SHALL persist mirrored lane snapshots before cross-lane comparison begins
- the root twin SHALL freeze `comparison_key_profile_code`, `delta_precedence_profile_code`, and
  `mismatch_ranking_profile_code` so replay cannot reinterpret keying, precedence, or ranking
- the root twin SHALL preserve distinct internal and authority snapshot refs plus distinct
  subordinate builder refs rather than collapsing them into one renderer-local bundle id
- one normalized comparison key SHALL yield exactly one terminal `TwinDeltaArc`
- persisted twin artifacts SHALL validate against `schemas/twin_view.schema.json`,
  `schemas/twin_state_snapshot.schema.json`, `schemas/twin_timeline.schema.json`,
  `schemas/twin_delta_arc.schema.json`, `schemas/twin_mismatch_summary.schema.json`,
  `schemas/twin_readiness_state.schema.json`,
  `schemas/twin_reconciliation_state.schema.json`, and
  `schemas/twin_interpretation_state.schema.json`

## ASSEMBLE_TWIN_STATE_SNAPSHOT(...)
**Goal**: Freeze one comparison lane before any cross-lane comparison occurs.
**Input**: `lane_code`, comparison-basis context, baseline selector output, scope envelope, compute or
authority artifacts, filing/amendment lineage, late-data posture, and replay/analysis posture.
**Output**: `TwinStateSnapshot`.
**Invariant**:
- `INTERNAL_COMPUTED` and `AUTHORITY` snapshots SHALL share the same comparison-key profile and scope
  envelope
- the `AUTHORITY` snapshot SHALL be assembled only from authority-originated or
  reconciliation-proven artifacts
- subject-key collisions inside one lane SHALL remain explicit in
  `TwinStateSnapshot.subject_key_collision_refs[]` and SHALL force
  `TwinStateSnapshot.assembly_state = CONTRADICTORY`
- contradictory components within the same lane SHALL produce
  `TwinStateSnapshot.assembly_state = CONTRADICTORY`
- `TwinStateSnapshot.non_comparable_subject_count` SHALL persist the share of the lane that cannot
  be defended as comparison-ready, rather than leaving contradiction, stale, or limited posture
  implicit
- missing baseline or missing authority request posture SHALL be explicit machine state rather than a
  null hole left to the client
- `subject_count` SHALL equal `comparable_subject_count + non_comparable_subject_count`, and
  contradiction refs SHALL remain a subset of the serialized component refs

## COMPUTE_TWIN_DELTA_SET(...)
**Goal**: Compare the mirrored state snapshots and emit one classified delta per normalized comparison
subject.
**Input**: internal `TwinStateSnapshot`, authority `TwinStateSnapshot`, `TwinTimeline`,
comparison-threshold profile, authority status-normalization profile, parity result when available,
and amendment/baseline posture.
**Output**: deterministic ordered `TwinDeltaArc[]`.
**Invariant**:
- the comparison universe SHALL be the ordered union of normalized comparison keys from both lanes
- `comparison_key` SHALL be derived only from the frozen subject identity and scope tuple, not value
  payloads or incidental source order
- one comparison key SHALL yield exactly one terminal delta class
- every `TwinDeltaArc` SHALL also persist `comparability_state` and `comparability_reason_code` so
  waiting, partial, non-comparable, out-of-band, and contradiction posture survive beyond labels
- stale, limited, replay-only, baseline-missing, out-of-band, and partial-ack states SHALL use
  dedicated delta classes instead of collapsing into generic mismatch
- each delta SHALL persist its winning `delta_precedence_rank`, left/right lane subject refs, and any
  contradiction component refs needed to explain why that terminal class won
- ordering SHALL be driven by persisted `priority_rank`, then `last_compared_at`, then
  `comparison_key`

## SUMMARIZE_TWIN_MISMATCHES(...)
**Goal**: Collapse the full delta set into a deterministic low-noise summary that is still audit-safe.
**Input**: ordered `TwinDeltaArc[]`.
**Output**: `TwinMismatchSummary`.
**Invariant**:
- matches and suppressed informational deltas SHALL remain countable even when hidden by default
- `top_mismatch_refs[]` SHALL be derived from persisted ranking, never from client-local sort order
- `top_ranked_mismatches[]` SHALL persist the ranked mismatch identity tuple used to derive
  `top_mismatch_refs[]`
- `mismatch_count` SHALL remain partitioned into comparable, waiting, partial-ack, non-comparable,
  contradictory, and out-of-band counts so low-noise surfaces do not reclassify the twin locally
- the summary SHALL preserve counts for stale, limited, and out-of-band mismatch classes because they
  change operator interpretation even when no direct remediation action exists

## DERIVE_TWIN_READINESS(...)
**Goal**: Map trust/gate posture, delta posture, baseline state, and reconciliation posture into one
twin-specific decision/usefulness state.
**Input**: trust summary, gate decisions, `TwinDeltaArc[]`, `TwinMismatchSummary`, amendment/baseline
posture, and authority freshness posture.
**Output**: `TwinReadinessState`.
**Invariant**:
- filing readiness alone SHALL NOT imply twin readiness
- stale truth, contradictory authority posture, missing baseline, or reconciliation-required deltas
  SHALL cap mutation-capable actions
- waiting-on-authority posture SHALL remain distinct from review-required and blocked posture
- readiness SHALL persist explicit contradiction, non-comparable, and out-of-band mismatch refs plus
  `usefulness_cap_reason_codes[]` so authority-first truth limits cannot be collapsed into a generic
  review label

## PLAN_TWIN_RECONCILIATION(...)
**Goal**: Open, advance, or resolve reconciliation posture from unresolved twin deltas.
**Input**: ordered `TwinDeltaArc[]`, provider reconciliation profile, existing submission and
obligation lineage, active workflow refs, and current authority-interaction state.
**Output**: `TwinReconciliationState` + optional workflow refs.
**Invariant**:
- identical unresolved deltas SHALL dedupe to one active reconciliation state per comparison subject
  chain
- pending acknowledgement SHALL respect the profile-defined budget and deadline
- contradictory or out-of-band authority states SHALL open reconciliation immediately
- no resend SHALL occur after the automatic budget is exhausted
- reconciliation SHALL persist `reconciliation_budget_state`, `next_action_owner`,
  `next_action_due_at`, and `primary_workflow_item_ref_or_null` so restore or replay cannot guess
  the next owned step

## BUILD_TWIN_PORTFOLIO_SUMMARY(...)
**Goal**: Aggregate many manifest-level twins into one deterministic portfolio summary without
recomputing per-subject comparison semantics in the UI.
**Input**: ordered `TwinView[]`, `TwinMismatchSummary[]`, and `TwinReadinessState[]` for the selected
portfolio scope.
**Output**: `TwinPortfolioSummary`.
**Invariant**:
- portfolio rank SHALL be derived from manifest-level readiness and highest unresolved mismatch rank
- matched twins SHALL collapse into counts by default
- one client/twin SHALL contribute at most once to each aggregate bucket
- interpretation state SHALL retain one dominant attention state and summary-priority mode so the
  panel cannot default back to an audit-first rendering when reconciliation or non-comparability is
  the primary meaning

## PLAN_WORKFLOW(...)
**Goal**: Produce prioritized work items from gate decisions, trust posture, parity/risk outcomes, and drift/amendment posture with lineage references.
**Output**: planned `WorkflowItem` set.
**Invariant**:
- collaboration ordering, ownership confidence, assignment efficiency, escalation pressure, and resolution confidence SHALL be derived from the frozen formulas in `compute_parity_and_trust_formulas.md` rather than from UI-local heuristics; and
- the same frozen item set and routing profile SHALL yield the same stable priority tuple and queue assignment recommendations; and
- the planner SHALL persist `routing_contract{...}` on every `WorkflowItem` so downstream inbox,
  workspace, stream, notification, and automation clients consume the same recommendation and
  ordering basis instead of reconstructing it locally; and
- planned workflow items SHALL publish explicit `authority_truth_state` plus
  `authority_truth_contract{...}` when they summarize authority-linked work, so workflow urgency,
  completion posture, and customer projection cannot outrank unresolved authority truth.

## UPSERT_WORKFLOW_ITEMS(...)
**Goal**: Create, update, or supersede workflow items deterministically from the current planned action set.  
**Output**: persisted `WorkflowItem` refs.
**Invariant**:
- persisted work items SHALL validate against `schemas/workflow_item.schema.json`
- `customer_status_projection = RESOLVED` or `lifecycle_state = DONE` SHALL remain illegal while
  `authority_truth_state in {UNKNOWN, PENDING_ACK, PARTIAL_ACK, OUT_OF_BAND}`
- workflow persistence SHALL carry forward authority truth from validated settlement or
  reconciliation artifacts rather than fabricating confirmation from internal completion.

## UPSERT_FILING_CASE(...)
**Goal**: Persist or advance the filing-case artifact from current manifest posture, trust/parity readiness, packet state, submission state, amendment posture, trust-currency posture, and the current controlling proof bundle, including any calculation-basis refs used for final declaration or amendment flows.
**Output**: `FilingCase`.  
**Invariant**:
- persisted `FilingCase` artifacts SHALL validate against `schemas/filing_case.schema.json`
- persisted filing-case artifacts SHALL carry the common execution-context field group
- the case SHALL persist current trust/parity refs plus trust-currency state, invalidation
  timestamps, and reason codes so reruns, continuations, amendments, and late-data reversals cannot
  reuse stale readiness implicitly
- the case SHALL treat `current_packet_ref` as the source of packet-local approval,
  declaration-basis acknowledgement, notice-resolution, and filing-gate legality; it SHALL not
  reconstruct that posture from portal approval state, workflow state, or notice presentation
- every filing case in `READY_TO_SUBMIT`, `SUBMITTED_PENDING`, `FILED_CONFIRMED`, `FILED_UNKNOWN`,
  or `AMENDED_CONFIRMED` SHALL bind exactly one non-superseded controlling proof bundle whose closure
  state is `CLOSED`

## BUILD_FILING_PACKET(...)
**Goal**: Produce a structured filing packet in `PREPARED` state with declared basis, required
disclaimers, and explicit packet-local legality fields that later filing-gate and approval steps
update rather than infer.  
**Invariant**:
- persisted `FilingPacket` artifacts SHALL validate against `schemas/filing_packet.schema.json`
- before first persistence, the packet SHALL bind the active readiness/calculation lineage when one
  exists, explicit packet-phase `approval_state`, explicit
  `declared_basis_ack_state`, ordered `notice_step_refs[]`, and explicit null or empty posture for
  any packet-local legality field that is not yet satisfied
- filing-packet bytes SHALL derive from canonical unmasked facts required for the authorized tokens
- projection masking is not an execution transform and SHALL NOT alter packet payload bytes

## FILING_GATE(...)
**Goal**: Govern filing-capable progression across both:
- a prepared filing-packet path, and
- a pre-packet readiness path such as trust-blocked progression, amendment-blocked progression, or a
  failed/review-required `intent-to-finalise` calculation.  
**Input**:
- access result
- manifest state
- manifest mode
- trust output when available
- parity result when available
- `trust_currency_state`
- `trust_currency_reason_codes[]`
- `upstream_gate_records[]`
- obligation status
- filing packet state, if a packet has been prepared
- authority link state
- approval state
- declaration-basis acknowledgement state, which may be `NOT_APPLICABLE` on pre-packet paths
- authorized `runtime_scope[]`
- amendment posture
- active overrides
- `filing_notice_steps[]`
- `late_data_status`
- `late_data_policy_bindings[]`
- optional `filing_readiness_context` from pre-packet filing preparation
- `graph.target_assessments[]`
- `graph.integrity_summary`
- current `proof_bundle_ref` or an explicit null when no controlling bundle exists yet
**Output**: non-access `GateDecisionRecord`.  
**Invariant**:
- `late_data_status` SHALL be read from persisted `LateDataMonitorResult.late_data_status`, not recomputed ad hoc from raw connector drift
- `late_data_policy_bindings[]` SHALL validate against `schemas/late_data_policy_binding.schema.json`
- every filing-capable terminal or review-required outcome SHALL have a `FILING_GATE` record, even when
  no filing packet could be prepared
- analysis-mode manifests SHALL hard-block here for any filing-capable action token
- a null filing packet is legal only on an explicit pre-packet readiness branch
- when a filing packet exists, the gate SHALL consume the packet's persisted readiness lineage,
  proof-bundle posture, packet-phase approval state, declaration-basis acknowledgement state, and
  packet-local notice lineage; callers SHALL NOT synthesize those inputs from loose refs or portal
  presentation state
- any filing-capable path that is beyond a legitimate pre-trust blocking branch SHALL require
  `trust_currency_state = CURRENT`; stale or invalidated trust SHALL hard-block rather than degrade to
  a soft notice
- for `amendment_submit`, `AMENDMENT_GATE` posture SHALL remain upstream input to `FILING_GATE` so the
  filing-capable terminal decision still emits a `FILING_GATE` record
- `FILING_GATE` SHALL fail closed when a filing-critical target is unsupported, contradicted, stale
  beyond policy, missing a proof bundle, or open with respect to proof-path closure

## RESOLVE_FILING_NOTICES(...)
**Goal**: Resolve packet-local declaration-basis, disclaimer, and packet-local approval notices for a `PREPARED` filing packet before promotion to `APPROVED_TO_SUBMIT`.  
**Input**: `packet`, `principal`, authorized `runtime_scope[]`, packet-local `filing_notice_steps[]`.  
**Output**: `FilingNoticeResolution`, carrying `notice_requirements_satisfied`, updated packet-phase
approval state, updated packet-phase declaration-basis acknowledgement state, and notice refs.
**Invariant**:
- persisted notice-resolution artifacts SHALL validate against
  `schemas/filing_notice_resolution.schema.json`
- each `FilingNoticeStep.packet_refs[]` SHALL include the owning `packet_id`
- `FilingNoticeResolution.notice_refs[]` SHALL mirror ordered `notice_step_refs[]` so packet-local
  notice resolution remains replayable
- any packet that later reaches `APPROVED_TO_SUBMIT` or `SUBMITTED` with non-empty
  `notice_step_refs[]` SHALL retain a non-null `notice_resolution_ref`
- `notice_requirements_satisfied = true` MAY coexist with
  `declared_basis_ack_state = NOT_APPLICABLE` when no declaration-basis acknowledgement step exists

## APPROVE_FILING_PACKET(...)
**Goal**: Promote a `PREPARED` filing packet to `APPROVED_TO_SUBMIT` once filing-gate, approval, acknowledgement, and any `PASS_WITH_NOTICE` notice-resolution requirements are satisfied.  
**Invariant**:
- packet promotion SHALL remain packet-local and explicit: `APPROVED_TO_SUBMIT` SHALL require a
  bound `filing_gate_ref`, resolved packet-phase `approval_state`, resolved
  `declared_basis_ack_state`, `proof_closure_state = CLOSED`, and a non-null `notice_resolution_ref`
  whenever the packet carries notice steps
**Output**: filing packet in `APPROVED_TO_SUBMIT` state.

## TRANSITION_FILING_PACKET(...)
**Goal**: Apply a named filing-packet lifecycle transition and fail closed if the transition is illegal.  
**Output**: updated `FilingPacket`.

## EXECUTE_AUTHORITY_CALCULATION_FLOW(...)
**Goal**: Execute the authority calculation handshake for flows that require an authority-grounded calculation basis, including trigger, retrieve, user confirmation, and basis capture.  
**Output**: `AuthorityCalculationReadinessContext`, carrying refs to
`AuthorityCalculationRequest`, `AuthorityCalculationResult`, `CalculationBasis`, and
`CalculationUserConfirmation`.
**Invariant**:
- For end-of-year final declaration flows, this module must execute the authority calculation path before a final-declaration filing packet is prepared for submission.
- For amendment flows, this module must execute the `intent-to-amend` path before confirm-amendment submission is permitted.
- The module SHALL first evaluate any supplied `local_precondition_context`. When local preconditions
  already prove the calculation is illegal, unavailable, or non-live, the module SHALL return a
  modeled non-`PASS` outcome without emitting authority request/response artifacts.
- Before any live authority interaction, the module SHALL execute `AUTHORITY_PREFLIGHT(...)`.
- In `mode = ANALYSIS`, the module SHALL NOT issue live authority traffic unless the frozen provider
  contract explicitly declares the specific calculation path `read_only_analysis_allowed = true`.
  Otherwise the module SHALL return a modeled `HARD_BLOCK` with reason
  `AUTHORITY_LIVE_CALL_FORBIDDEN_IN_ANALYSIS` and `live_authority_call_executed = false`.
- The returned `AuthorityCalculationReadinessContext` SHALL be the gate-visible seal for this
  handshake. It SHALL carry explicit `request_state`, `result_state`, `calculation_hash`,
  `basis_status`, `basis_hash`, `confirmation_state`, and reusable-posture fields so later filing
  and amendment stages do not reconstruct readiness from loose refs.
- Callers SHALL persist the returned calculation/basis refs plus `readiness_context_ref` on a
  `FilingCase`, `AmendmentCase`, or equivalent first-class artifact before packet build or terminal
  outcome decisions rely on them.
- The active readiness context SHALL only point at current request/result/basis posture. Superseded
  request, result, or basis artifacts MAY remain historical lineage, but SHALL NOT be published as
  the current readiness context.
- persisted calculation artifacts SHALL validate against
  `schemas/authority_calculation_request.schema.json`,
  `schemas/authority_calculation_result.schema.json`, `schemas/calculation_basis.schema.json`,
  `schemas/calculation_user_confirmation.schema.json`, and
  `schemas/authority_calculation_readiness_context.schema.json`
- Callers SHALL not terminate a filing-capable run directly from a pre-packet filing-readiness `validation_outcome`; they SHALL route that result through `FILING_GATE(...)` so the gate chain remains explicit and auditable.
- Callers SHALL not terminate an amendment-capable run directly from raw `intent-to-amend` `validation_outcome`; they SHALL persist the returned context on `AmendmentCase` and route any non-`PASS` outcome through `AMENDMENT_GATE(...)`, never through `FILING_GATE(...)`.
- If an `intent-to-amend` calculation was already executed earlier in the same manifest run, later
  amendment-stage logic SHALL reuse the persisted calculation context instead of re-triggering the
  authority call.

## AUTHORITY_PREFLIGHT(...)
**Goal**: Execute the mandatory post-seal authority preflight immediately before any live authority
calculation or submission path.  
**Output**:
- `reauthorization_decision`
- `manifest_state_ok`
- `binding_valid`
- `approval_valid`
- `declared_basis_ack_valid`
- `operation`
- `binding`
**Invariant**:
- the helper SHALL re-run `AUTHORIZE(...)` for the live authority action
- the helper SHALL verify `RunManifest.lifecycle_state in {SEALED, IN_PROGRESS}` for compliance-capable
  live authority operations
- the helper SHALL resolve the frozen `AuthorityOperationProfile` and `AuthorityBinding`
- the helper SHALL verify token/client binding and required approvals/acknowledgements before any live
  authority call is attempted
- the helper SHALL be used inside `EXECUTE_AUTHORITY_CALCULATION_FLOW(...)` and immediately before any
  submission-path request canonicalization/build/transmit sequence
- when these conditions fail, the persisted failure SHALL bind invariant class
  `AUTHORITY_PREFLIGHT` through `invariant_enforcement_contract{...}` rather than surfacing as an
  untyped authority send rejection

## RESOLVE_AUTHORITY_OPERATION(...)
**Goal**: Materialize the intended authority action under a frozen authority operation profile.  
**Output**: `AuthorityOperation` + frozen tenant/client/attempt lineage + provider environment/scope/version + target obligation/basis context.
**Invariant**:
- the materialized `AuthorityOperation` SHALL preserve raw `requested_scope[]` for audit, but SHALL also stamp the authorized `runtime_scope[]` that drives request identity, duplicate handling, and live authority legality
- the materialized `AuthorityOperation` SHALL persist `tenant_id`, `client_id`, and `attempt_lineage_manifest_id` so operation-planned audit and duplicate lineage cannot drift across continuation or recovery
- the materialized `AuthorityOperation` SHALL persist `provider_environment`, `provider_api_version`, and `authority_scope` explicitly rather than relying on later re-resolution from a profile ref alone
- the finalized `AuthorityOperation` SHALL also persist the exact `authority_binding_ref`,
  `authority_link_ref`, `delegation_grant_ref`, `binding_lineage_ref`, `token_binding_ref`,
  `subject_ref`, `acting_party_ref`, and `policy_snapshot_hash` selected by preflight so queued
  sends, replay, and recovery never re-resolve live authority context
- the materialized `AuthorityOperation` SHALL use an explicit empty `business_partitions[]` only for global/account-level read posture; live mutation and calculation families SHALL remain partition-bound
- `business_partitions[]` SHALL remain canonically ordered so duplicate lookup, request hashing, and
  reconciliation bucket identity cannot drift on equivalent operations
- `business_partitions[]` SHALL exactly mirror `scope_execution_binding.executable_partition_scope_refs[]`
  so authorization-time partition narrowing cannot be lost between access evaluation and authority execution
- downstream request hashing, duplicate prevention, and amendment eligibility SHALL read only the authorized executable scope, never raw caller intent

## RESOLVE_AUTHORITY_BINDING(...)
**Goal**: Bind the request to the correct authority link, token context, client scope, and provider version.  
**Output**: `AuthorityBinding`.  
**Invariant**:
- ambiguous token-to-client binding fails closed
- the resolver SHALL select only a `ConnectorBinding` / `AuthorityLink` / `DelegationGrant`
  combination whose tenant, client, reporting subject, authorised party, authority scope, provider
  environment, and provider API version all match the resolved `AuthorityOperation`
- token rotation MAY advance only `token_version_ref` inside the same persisted
  `binding_lineage_ref`; any drift in client, reporting subject, authorised party, authority scope,
  or provider contract SHALL allocate a new binding path rather than silently rebinding the live
  operation
- the sealed `AuthorityBinding.token_version_ref` SHALL remain the preflight-selected token version;
  if send-time revalidation later approves a newer token version within the same
  `binding_lineage_ref`, the gateway SHALL record that concrete send-authorized version on
  `AuthorityInteractionRecord.send_authorized_token_version_ref` rather than mutating the sealed
  binding or request identity
- when the acting party differs from the reporting subject, the resolved binding SHALL retain the
  concrete `delegation_grant_ref`; when delegated authority is not required, the acting party SHALL
  remain the reporting subject
- the resolved binding SHALL retain `principal_context_ref`, `authorization_decision_ref`,
  `delegation_state`, and `authority_link_state` so internal permission, client delegation,
  authority-link readiness, and token/client binding remain distinct typed layers at preflight and in
  later audit
- an `ExceptionalAuthorityGrant` MAY relax only the explicitly approved blocked path for the same
  tenant, client, partition scope, and target action family; it SHALL NOT override frozen
  acknowledgement, declaration-signing, truth-confirmation, or partition-widening prohibitions

## CANONICALIZE_AUTHORITY_REQUEST(...)
**Goal**: Produce canonical path, canonical query, canonical payload bytes, and header-profile refs for
an authority request before the sealed envelope is materialized.  
**Output**: canonical request material.  
**Invariant**:
- canonical request material SHALL be derived from preflight-resolved operation/binding and canonical
  unmasked packet bytes
- projection masking SHALL NOT alter canonical request bytes, request hashes, or idempotency keys

## DERIVE_AUTHORITY_REQUEST_HASHES(...)
**Goal**: Compute `request_body_hash`, `identity_namespace_hash`, `duplicate_meaning_key`,
`request_hash`, and authority-attempt `idempotency_key` from canonical request material plus the
manifest access binding.  
**Input**: manifest lineage, operation, binding, canonical request material (`http_method`,
`canonical_path`, `canonical_query`, ordered `header_profile_refs[]`, canonical payload bytes), and
`access_binding_hash`.  
**Output**: `request_body_hash`, `identity_namespace_hash`, `duplicate_meaning_key`, `request_hash`,
`idempotency_key`.

## BUILD_AUTHORITY_REQUEST_ENVELOPE(...)
**Goal**: Construct the sealed authority request only after canonical request material and all derived
identity fields are already known, including `identity_profile_version`,
`identity_namespace_hash`, `normalized_obligation_ref`, `normalized_basis_type`,
`duplicate_meaning_key`, `request_body_hash`, `request_hash`, `idempotency_key`,
`access_binding_hash`, `canonical_path`, `canonical_query`, and fraud-header profile refs.  
**Output**: `AuthorityRequestEnvelope`.  
**Invariant**:
- an `AuthorityRequestEnvelope` SHALL NOT be materialized or written without populated
  `identity_namespace_hash`, `duplicate_meaning_key`, `request_body_hash`, `request_hash`,
  `idempotency_key`, `access_binding_hash`, `policy_snapshot_hash`, and frozen authority-binding
  lineage refs
- the builder SHALL also materialize `request_identity_contract{...}` as the grouped byte-stable
  request-identity packet reused by `AuthorityInteractionRecord` and request-backed
  `SubmissionRecord`; downstream recovery SHALL NOT rebuild that packet from `AuthorityOperation`,
  `AuthorityBinding`, and envelope top-level fields separately
- `header_profile_refs[]` and `business_partition_refs[]` SHALL be serialized in canonical sorted
  order, and `request_body_hash` SHALL use the explicit `<NONE>` sentinel only when `payload_ref`
  is null
- `duplicate_meaning_key` SHALL be the persisted resend-vs-reconcile bucket, while `request_hash`
  SHALL remain the exact sealed-request identity; callers SHALL NOT compare the wrong one when
  deciding duplicate suppression or collision posture
- submit and mutation-capable envelopes SHALL retain the exact non-empty business-partition set used
  in duplicate and reconciliation identity; packet or route context SHALL NOT reconstruct it later

## BEGIN_SUBMISSION_RECORD(...)
**Goal**: Create the initial `SubmissionRecord` for one authority transmit attempt before the request leaves the engine.  
**Output**: `SubmissionRecord` in `INTENT_RECORDED`.
**Invariant**:
- persisted submission records SHALL validate against `schemas/submission_record.schema.json`
- the initial record SHALL freeze `identity_namespace_hash`, `duplicate_meaning_key`,
  `request_hash`, `request_envelope_ref`, `idempotency_key`, `packet_ref`, proof-bundle lineage,
  and null terminal authority evidence before the request leaves the engine
- any request-backed submission state SHALL copy the grouped `request_identity_contract{...}` from
  the sealed request envelope; only `OUT_OF_BAND` lineage may clear that grouped contract later
- `INTENT_RECORDED` SHALL already carry non-null `proof_bundle_ref` and `proof_bundle_hash`; only
  out-of-band authority settlement MAY later represent legal state without packet-origin transmit
  lineage

## TRANSITION_SUBMISSION_RECORD(...)
**Goal**: Apply one named `SubmissionRecord` lifecycle transition and fail closed if the transition is illegal.  
**Output**: updated `SubmissionRecord`.
**Invariant**:
- `baseline_type` SHALL remain null until authority-grounded or externally-proved legal state exists
- `reconciliation_deadline_at` SHALL remain populated only while the protocol still owes a pending
  or unknown-state reconciliation outcome

## EXISTING_SUBMISSIONS(...)
**Goal**: Load existing `SubmissionRecord`s for the same persisted `duplicate_meaning_key`,
obligation, and operation family before transmit.  
**Output**: ordered submission lineage set.

## RECOVER_SUBMISSION_ATTEMPT(...)
**Goal**: Reuse the already-persisted request/response/submission lineage for a safe idempotent retry instead of transmitting a duplicate authority request.  
**Output**: recovered request/response refs + `SubmissionRecord` + `AuthorityInteractionRecord` + authority-state summary.  
**Invariant**:
- recovery SHALL key resend-vs-reconcile decisions from persisted `duplicate_meaning_key`; exact
  request reuse and collision forensics SHALL continue to use `request_hash`
- recovery SHALL consult `AuthorityInteractionRecord.resend_legality_state` and
  `resend_control_reason_codes[]`; if the interaction is in `FOLLOW_UP_READ_ONLY`,
  `BLOCKED_BY_RECONCILIATION`, `BLOCKED_BY_ESCALATION`, or `CLOSED_NO_RESEND`, recovery SHALL NOT
  emit a fresh mutation packet and SHALL instead continue read-only reconciliation, operator
  escalation, or terminal closure handling as persisted
- recovery alone does not prove legal state; callers SHALL still run `RECONCILE_AUTHORITY_STATE(...)`
  before emitting reconciliation-resolved or submission-outcome events.

## SUBMISSION_GATE(...)
**Goal**: Protect the actual transmit step against duplicate, pending, malformed, illegally staged, or amendment-ineligible submissions.  
**Input**:
- filing packet payload hash
- filing packet manifest-binding hash
- expected manifest-binding hash
- authority-request idempotency key
- existing `SubmissionRecord`s for the same obligation / operation family
- authority link status
- request-body hash
- filing packet state
- authorized `runtime_scope[]`
- amendment posture  
**Output**: non-access `GateDecisionRecord`.
**Invariant**:
- duplicate suppression SHALL consult both `SubmissionRecord.lifecycle_state` and the current
  `AuthorityInteractionRecord.reconciliation_budget_state` / `resend_legality_state` for the same
  `duplicate_meaning_key`; unresolved or escalated exchanges SHALL route to reconciliation or
  operator ownership instead of reopening transport send

## SUBMIT_TO_AUTHORITY(...)
**Goal**: Transmit a sealed authority request through the controlled gateway and capture the resulting authority response envelope.  
**Output**: `AuthorityResponseEnvelope`.
**Invariant**:
- immediately before bytes leave the process, the gateway SHALL compare the sealed request lineage
  against the persisted `AuthorityBinding`, current authority-link posture, authorization posture,
  and duplicate-meaning truth, then persist `send_revalidation_state`, `send_revalidated_at`,
  `send_authorized_token_version_ref`, and `send_revalidation_reason_codes[]` on the
  `AuthorityInteractionRecord`
- `send_revalidation_state = CLEAR_TO_SEND` SHALL require exactly one lawful pass reason
  (`SEALED_TOKEN_VERSION_REUSED` or `TOKEN_ROTATED_WITHIN_LINEAGE`) plus a non-null
  `send_authorized_token_version_ref`; `send_revalidation_state = BLOCKED` SHALL keep
  `send_authorized_token_version_ref = null` and SHALL route the exchange to explicit non-send
  abandonment or reconciliation rather than silently repairing the send
- once bytes have left the process and until a durable provider observation is captured,
  `AuthorityInteractionRecord.resend_legality_state` SHALL be `IDEMPOTENT_RECOVERY_ONLY` so queue
  rebuild or stale-worker reclaim may recover the exact request lineage but may not blind-resend it

## CHECKPOINT_AUTHORITY_INGRESS(...)
**Goal**: Authenticate an inbound authority payload, correlate it against frozen request lineage,
deduplicate callback/poll/recovery deliveries, and persist the authoritative ingress checkpoint
before any response normalization or legal-state mutation.  
**Output**: `AuthorityIngressReceipt`.  
**Invariant**:
- the checkpoint SHALL compute one `delivery_dedupe_key` from `provider_delivery_ref`,
  `response_body_hash`, and `ingress_channel_metadata_hash` so callback, poll, and recovery views of
  the same provider delivery converge on one canonical ingress identity
- the persisted checkpoint SHALL retain `response_body_ref` so quarantined provider payloads remain
  inspectable without reopening transport logs
- `correlation_status = BOUND` SHALL require corroborating frozen request-lineage identity rather
  than a single weak key; `BOUND_WITH_AUTHORITY_REFERENCE_ONLY`, `AMBIGUOUS`, and `UNBOUND` SHALL
  remain fail-closed and SHALL open explicit `reconciliation_owner_ref`
- the persisted receipt SHALL publish `authority_ingress_proof_contract{...}` so authenticated
  channel evidence, canonical delivery identity, exact lineage-binding basis, canonical receipt
  anchor, and mutation-gate posture remain reusable by normalization, settlement, and recovery
- the persisted receipt SHALL also publish `authority_ingress_correlation_contract{...}` so
  extracted provider-visible identity claims, candidate request lineages, and the exact
  explainability posture for weak, ambiguous, or unbound ingress remain durable and reusable by
  investigation tooling
- a repeated delivery SHALL persist `receipt_state = DUPLICATE_SUPPRESSED` with
  `canonical_ingress_receipt_ref` pointing at the first-seen receipt and SHALL NOT emit a second
  normalized response or state mutation
- asynchronous normalization SHALL NOT proceed unless the canonical ingress receipt is already
  durable
- the persisted receipt SHALL remain checkpoint truth only: it SHALL carry
  `authority_truth_contract{...}` with `truth_surface_role = AUTHORITY_INGRESS_CHECKPOINT`, and it
  SHALL not itself settle confirmed, rejected, pending, unknown, or out-of-band legal truth until
  correlation and normalization promote validated authority evidence into `SubmissionRecord`

## PROJECT_AUTHORITY_INGRESS_INVESTIGATION(...)
**Goal**: Build an integration-facing investigation read model for one quarantined or
duplicate-suppressed ingress receipt without relying on transport logs or permitting direct legal
state mutation.  
**Output**: `AuthorityIngressInvestigationSnapshot`.  
**Invariant**:
- the snapshot SHALL be derivable entirely from persisted `AuthorityIngressReceipt`,
  `authority_ingress_proof_contract{...}`, `authority_ingress_correlation_contract{...}`,
  `response_body_ref`, duplicate lineage, and audit refs
- the snapshot SHALL surface compared request-lineage candidates, duplicate lineage, quarantine or
  duplicate review ownership, and only non-mutating safe next actions
- the snapshot SHALL fail closed on legal-state mutation: any bind, duplicate closure, or authority
  truth change SHALL proceed only through a separate reconciliation or protocol write path

## NORMALIZE_AUTHORITY_RESPONSE(...)
**Goal**: Convert transport/provider responses into protocol response classes and advance the in-flight `SubmissionRecord` to its normalized post-response state.  
**Output**: normalized response class + updated `SubmissionRecord`.
**Invariant**:
- normalized response classes SHALL remain bound to the persisted request lineage and correlation
  posture; weak-bound, ambiguous, or unbound provider payloads SHALL NOT advance `SubmissionRecord`
  into a terminal or pending-success state
- any asynchronous `AuthorityResponseEnvelope` SHALL retain `ingress_receipt_ref` to the canonical
  persisted `AuthorityIngressReceipt` used for normalization and a non-null
  `authority_ingress_proof_contract{...}` proving authenticated ingress plus exact lineage-binding
  basis; `INLINE_HTTP` and `TRANSPORT_TIMEOUT` observations SHALL keep that contract null
- normalized response envelopes SHALL also retain `derivation_posture`, `legal_effect_posture`, and
  explicit lineage to any prior timeout, corroborated, or conflicting observation rather than
  silently flattening callback, poll, and recovery-read semantics into one unlabeled result
- `ACK_TIMEOUT_OR_NO_RESOLUTION` SHALL serialize as timeout/no-body transport posture, not as a
  synthetic success
- normalization SHALL preserve the FE-50 separation between checkpoint truth and settlement truth:
  `PENDING_ACK`, `UNKNOWN`, and `OUT_OF_BAND` remain explicit non-confirming authority postures,
  and no internal workflow or customer-safe projection may upgrade them to confirmed.

## MERGE_AUTHORITY_RESPONSE_OBSERVATION(...)
**Goal**: Compare one normalized authority response observation against the interaction’s prior
response history, classify whether it is primary, corroborating, timeout-superseding, or
conflicting, and update the interaction’s current meaning only when legally admissible.  
**Output**: updated `AuthorityResponseEnvelope` + updated `AuthorityInteractionRecord` + optional
reconciliation-open signal.  
**Invariant**:
- every normalized observation SHALL append into `AuthorityInteractionRecord.response_history_ids[]`
  even when it does not become the new `active_response_id`
- `active_response_id` SHALL represent the current admissible response meaning, not the newest raw
  arrival timestamp
- a corroborating callback, poll, or recovery read SHALL retain
  `derivation_posture = CORROBORATING_OBSERVATION` and SHALL NOT drive a second legal-state mutation
- any observation that would replace a timeout placeholder or conflict with an already-admissible
  source SHALL retain `legal_effect_posture = RECONCILIATION_ONLY` and SHALL move
  `meaning_resolution_state` to `RECONCILIATION_REQUIRED` until reconciliation completes

## RECORD_AUTHORITY_INTERACTION(...)
**Goal**: Persist the cross-reference record linking operation, request, response, submission, audit refs, and provenance refs for one authority exchange.  
**Output**: `AuthorityInteractionRecord`.
**Invariant**:
- `binding_drift_sentinel_contract{...}` SHALL be the grouped safety boundary for any live
  authority-side action under the interaction lineage. It SHALL freeze the checked binding identity,
  sealed token version, checked token version, duplicate or stronger-truth consultation posture,
  transmit-claim state where applicable, and the named clear or blocked outcome for
  `TRANSMIT_MUTATION`, `RECONCILIATION_POLL`, and `RECOVERY_READ`
- `send_revalidation_state` SHALL remain `NOT_PERFORMED` while the exchange is only registered or
  queued, SHALL become `CLEAR_TO_SEND` only after a successful mandatory pre-send revalidation, and
  SHALL become `BLOCKED` only when the gateway aborts a pending send before transmit
- `send_revalidated_at` SHALL remain null until the mandatory send-time revalidation runs
- `send_authorized_token_version_ref` SHALL remain null unless `send_revalidation_state =
  CLEAR_TO_SEND`; that field SHALL preserve whether the gateway reused the sealed token version or
  accepted lawful token rotation within the same `binding_lineage_ref`
- `send_revalidation_reason_codes[]` SHALL remain empty before revalidation, SHALL contain exactly
  one lawful pass reason for cleared sends, and SHALL otherwise preserve one or more explicit
  block reasons for fail-closed non-sends; that transmit-only tuple SHALL mirror the transmit-owned
  `binding_drift_sentinel_contract` rather than drifting as a second independently interpreted safety
  boundary
- `response_history_ids[]` SHALL preserve every normalized authority observation for the interaction,
  while `active_response_id` points only at the currently admissible meaning
- `meaning_resolution_state` SHALL remain `NO_RESPONSE` before response capture, MAY become
  `PROVISIONAL_TIMEOUT` for timeout placeholders, SHALL move to `RECONCILIATION_REQUIRED` whenever
  sources conflict or a timeout placeholder is being superseded, and SHALL become
  `RECONCILIATION_RESOLVED` only after explicit reconciliation closes that ambiguity
- `reconciliation_method`, `max_auto_reconciliation_attempts`, and
  `reconciliation_cadence_seconds` SHALL freeze the chosen profile-derived follow-up budget on the
  interaction itself
- `reconciliation_budget_state`, `next_reconciliation_at`, `reconciliation_escalated_at`,
  `reconciliation_workflow_item_ref`, `resend_legality_state`, and
  `resend_control_reason_codes[]` SHALL be the only persisted authority for whether the exchange is
  still inside a bounded read-only follow-up window, limited to idempotent recovery, blocked by
  contradictory or exhausted reconciliation posture, escalated, or terminally closed against resend
- resolved exchanges SHALL clear `reconciliation_deadline_at`
- `resolution_basis` SHALL become non-null only in `RESOLVED`, while `abandonment_reason_code`
  SHALL become non-null only in `ABANDONED`
- the interaction record SHALL publish `authority_truth_contract{...}` as a runtime-ledger
  contract only; response history, active admissible meaning, or send completion SHALL not by
  themselves allow workflow, mirror, or customer layers to invent confirmed legal truth

## PERSIST_AUTHORITY_RECONCILIATION_CONTROL(...)
**Goal**: Advance the runtime reconciliation budget, follow-up schedule, escalation ownership, and
resend-control posture for one authority interaction without recomputing those facts from queue or
worker-local memory.  
**Output**: updated `AuthorityInteractionRecord`.  
**Invariant**:
- the helper SHALL publish one grouped `reconciliation_control_contract{...}` on the interaction so
  recovery, unresolved settlement, mirror projection, and analytics reuse the same immutable budget
  packet instead of re-reading split runtime columns
- the helper SHALL transition `reconciliation_budget_state` through `NOT_OPENED`, `ACTIVE`,
  `EXHAUSTED`, `ESCALATED`, and `CLOSED` explicitly rather than inferring budget openness from
  attempt counts alone
- `next_reconciliation_at` SHALL be populated only while `reconciliation_budget_state = ACTIVE`
- `reconciliation_escalated_at` and `reconciliation_workflow_item_ref` SHALL be populated when the
  automatic budget is exhausted or contradictory authority evidence forces escalation
- the grouped control packet SHALL preserve escalation owner, workflow item, evidence refs, and due
  timestamp whenever escalation is active, and SHALL preserve replay-resume posture plus the
  analytics outcome class at every state change
- `resend_legality_state` SHALL move from `IDEMPOTENT_RECOVERY_ONLY` to `FOLLOW_UP_READ_ONLY`, then
  to a blocked or closed posture as evidence accumulates; no queue rebuild, continuation, or replay
  path may bypass that persisted state

## RECONCILE_AUTHORITY_STATE(...)
**Goal**: Resolve pending, unknown, out-of-band, or authority-corrected states using `SubmissionRecord`, obligation mirror context, authority reference, and correlation keys.  
**Output**: reconciliation outcome + updated `SubmissionRecord` + updated `ObligationMirror` + authority-state summary.
**Invariant**:
- no reconciliation result SHALL mutate legal state before authenticated ingress, dedupe posture,
  and request-lineage correlation have been durably proven
- reconciliation SHALL consume and update the persisted budget/control fields on
  `AuthorityInteractionRecord`; it SHALL increment `reconciliation_attempt_count`, schedule or clear
  `next_reconciliation_at`, open `reconciliation_workflow_item_ref` when required, and block any
  automatic resend once `resend_legality_state` is no longer `IDEMPOTENT_RECOVERY_ONLY` or
  `FOLLOW_UP_READ_ONLY`
- reconciliation SHALL consume the interaction’s preserved multi-source response history rather than
  inferring current meaning from only the freshest callback, poll, or recovery read
- reconciliation SHALL preserve the distinction between `current_submission_ref` and
  `last_confirmed_submission_ref` on the obligation mirror
- only validated authority evidence MAY move downstream state into `CONFIRMED`
- rejected, unknown, and out-of-band outcomes SHALL remain explicit on settlement and mirror
  artifacts instead of being overwritten by internal workflow closure or accepted-risk posture
- late authority corrections SHALL reopen affected mirrors, workflow items, and customer-safe
  projections instead of leaving earlier resolved projections final

## UPSERT_OBLIGATION_MIRROR(...)
**Goal**: Persist the authority-grounded obligation mirror returned from reconciliation or obligations reads without discarding prior legal-state evidence.  
**Output**: updated `ObligationMirror`.
**Invariant**:
- persisted obligation mirrors SHALL validate against `schemas/obligation_mirror.schema.json`
- `current_submission_ref` SHALL represent only pending packet lineage, `last_confirmed_submission_ref`
  only confirmed legal settlement, and `ready_manifest_ref` only pre-submit readiness
- the mirror SHALL also retain explicit `authority_truth_state` plus
  `authority_truth_contract{...}` and remain subordinate to `SubmissionRecord`; internal
  readiness, workflow closure, or customer reassurance SHALL not rewrite authority truth

## EMIT_AUTHORITY_RECONCILIATION_ANALYTICS(...)
**Goal**: Emit replay-safe budget, resend-refusal, and escalation analytics for one authority
operation profile from durable unresolved and terminal reconciliation control packets.  
**Output**: `AuthorityReconciliationAnalyticsSnapshot`.
**Invariant**:
- the snapshot SHALL derive counts, latency, and tuning recommendations only from persisted
  `reconciliation_control_contract{...}` packets and their referenced interaction lineage
- analytics SHALL preserve profile/environment/family scope so tuning advice is not mixed across
  incompatible authority products or operation families
- transient retry-worker counters, broker redelivery logs, and transport error bursts MAY inform
  debugging but SHALL NOT become the authoritative source for budget exhaustion, blind-resend
  refusal, ambiguity, or escalation accounting

## CLASSIFY_TEMPORAL_POSITION(...)
**Goal**: Derive a replay-safe temporal map for each affected field or late-data item using baseline-effective time, cutoff time, business-effective time, visibility time, and discovery time.
**Output**: `LateDataTemporalContract` objects including states such as `TRUE_POST_BASELINE_EVENT`, `PRE_CUTOFF_PREEXISTING_LATE_ARRIVAL`, `POST_CUTOFF_DISCOVERY_PRE_BASELINE_FACT`, `AUTHORITY_POSTING_LAG`, and `TEMPORALLY_UNPROVED`.
**Invariant**: discovery time alone SHALL never decide temporal posture; temporally ambiguous decisive items SHALL surface as explicit uncertainty rather than being silently treated as benign current-period drift. The contract SHALL also freeze baseline scope touch, filing-critical touch, and downstream invalidation posture so later replay never reconstructs legal meaning from live scans.

## SELECT_DRIFT_BASELINE(...)
**Goal**: Choose the highest-precedence legal/operational baseline for drift comparison and freeze the exact-scope selector result.
**Output**: `DriftBaselineEnvelope` + `DriftBaselineSelectionVisualization`.
**Invariant**:
- filed truth is never guessed from a lower-precedence internal state when a higher-precedence authority-grounded baseline exists
- the selector SHALL emit one immutable exact-scope envelope with deterministic tie-break reasons and frozen scope narrowing
- the selector SHALL also persist one visualization artifact that freezes the candidate universe,
  dominance keys, loss reasons, and same-scope envelope lineage so operator and replay surfaces can
  explain why non-winning candidates lost without re-reading live baseline state
- the envelope SHALL retain `selection_contract` so exact-scope candidacy, scope-resolution state,
  same-scope external-truth resolution, dominance ranks, baseline-anchor uncertainty, and the
  resulting automation/review/amendment ceilings stay backend-authored instead of UI- or
  queue-inferred
- callers SHALL persist the returned artifact before drift classification or amendment gating depends on it
- baseline type, submission state, authority basis refs, selection-contract hash, and supersession
  linkage SHALL remain mutually coherent and non-mutating once the envelope is written
- same-scope `AUTHORITY_CORRECTED` or unresolved `OUT_OF_BAND` truth SHALL block weaker filed or
  amended internal lineage from remaining the effective exact-scope baseline

## BUILD_DRIFT_DELTA_VECTOR(...)
**Goal**: Materialize the deterministic field-by-field delta vector between the current manifest and a persisted `DriftBaselineEnvelope`.
**Output**: ordered delta vector + per-plane assignments (`FACT_STATE`, `TOTAL_STATE`, `FILING_STATE`, `AUTHORITY_STATE`, `EXPLANATION_STATE`).
**Invariant**: field ordering, threshold lookup, and plane assignment SHALL be deterministic and replay-safe; missing or contradictory source assignments SHALL emit explicit reason codes rather than being silently dropped.

## ANALYZE_RETROACTIVE_IMPACT(...)
**Goal**: Determine whether the detected change affects only the current exact scope or also alters prior filed, amended, or authority-corrected positions, conditioned on the persisted temporal map.
**Output**: `RetroactiveImpactAnalysis`.
**Invariant**: retroactivity SHALL be bounded to explicit impacted scope refs and prior submission refs; the engine SHALL never reopen unrelated partitions or periods by implication, and it SHALL NOT treat temporally unproved decisive late data as current-scope-only by default.
`restatement_scope_refs[]` SHALL remain a subset of `impacted_scope_refs[]`, contradiction-driven
retroactivity SHALL force reconciliation-first replay posture, retroactivity timestamps SHALL
remain forward-only, and the artifact SHALL retain a deterministic `analysis_hash` so later
freshness or bundle checks do not reconstruct retroactive identity from loose refs alone. When a
persisted late-data temporal contract touches a prior submission chain, retroactive-impact analysis
SHALL run even if the current-manifest late-data policy effect is only notice or exclusion.

## SIMULATE_LATE_DATA_RETROACTIVE_IMPACT(...)
**Goal**: Re-evaluate persisted late-data findings, temporal maps, proof-touch posture, and
retroactive widening consequences against one frozen historical basis without mutating the prior
legal state.
**Output**: `LateDataRetroactiveImpactSimulationBasisContract` +
`LateDataRetroactiveImpactSimulation`.
**Invariant**: the simulator SHALL run only under
`execution_mode_boundary_contract{ run_kind = REPLAY, replay_class_or_null = COUNTERFACTUAL_ANALYSIS,
execution_mode = ANALYSIS, legal_effect_boundary = COUNTERFACTUAL_REPLAY_READ_ONLY }`, SHALL bind
one exact historical basis contract to the same persisted baseline, late-data, proof, and
submission-chain refs, SHALL evaluate exactly the canonical five temporal classes, and SHALL emit
only the canonical outcome buckets `CURRENT_ONLY`, `EXPLANATION_ONLY`, `AMENDMENT_TRIGGERING`,
`REPLAY_TRIGGERING`, and `REVIEW_BLOCKED`. Discovery time SHALL NOT substitute for effective-time
or visibility-time analysis, exact replay SHALL NOT silently reclassify history from fresh reads,
and any impacted or restated scope SHALL stay within the declared covered scope and submission
chain of the simulator basis.

## DETECT_DRIFT(...)
**Goal**: Detect post-baseline change and classify it as correction, explanation-only drift, review materiality, or amendment-worthy change across fact, total, filing, authority, and explanation planes using delta evidence, temporal classification, and retroactive-impact context together.
**Output**: `DriftRecord`.
**Invariant**:
- persisted drift artifacts SHALL validate against `schemas/drift_record.schema.json`
- persistence SHALL atomically supersede any earlier active exact-scope drift record when the new record is semantically newer for the same exact scope
- decisive plane pressure or proved lower-bound materiality SHALL not be diluted merely because many noncritical deltas are also present
- `amendment_eligibility_contract` SHALL keep amendment trigger distinct from immediate legal
  eligibility, SHALL mirror baseline-derived progression ceilings, and `DriftRecord` SHALL not
  serialize active readiness reuse
- the artifact SHALL retain `supersedes_drift_id` and SHALL NOT mutate historical field deltas in place

## MATERIALIZE_AMENDMENT_WINDOW_CONTEXT(...)
**Goal**: Freeze the authority- and provider-grounded amendment window evaluation for one exact scope.
**Output**: `AmendmentWindowContext`.
**Invariant**: amendment-window openness SHALL be derived from proved final-declaration truth and statutory/provider timing, not inferred from local workflow state alone.
Open or closed contexts SHALL classify the exact scope deterministically into eligible vs blocked
refs, and the window SHALL not remain open after its close timestamp.

## EVALUATE_AMENDMENT_ELIGIBILITY(...)
**Goal**: Determine whether a post-finalisation change is legally and operationally eligible for the amendment path, separate from whether it merely triggers amendment or review handling.
**Output**: `amendment_eligibility_contract` posture + required next steps + eligibility reason codes.
**Invariant**: triggered amendment-aware workflow SHALL stay triggered even when the legal result is
review-only, reconcile-first, window-closed, or unproven; only `eligibility_state = ELIGIBLE_NOW`
may recommend amendment preparation or submission. The contract SHALL also retain
`baseline_selection_contract_hash_or_null`, `baseline_progression_ceiling_or_null`, and
`baseline_limitation_reason_codes[]` so unresolved or weakly anchored baselines keep amendment
progression capped even when the raw drift deltas are already proved.

## VALIDATE_AMENDMENT_READINESS_FRESHNESS(...)
**Goal**: Decide whether a persisted amendment readiness context (`intent-to-amend`, basis, and confirmation refs) remains reusable after new evidence, new authority state, or new retroactive impact is observed.
**Output**: freshness verdict + invalidation reason codes + updated `AmendmentCase` freshness fields.
**Invariant**: a stale readiness context SHALL cap amendment submission progression before
`AMENDMENT_GATE(...)` and SHALL never be reused silently.
The persisted `AmendmentCase` SHALL retain the exact `baseline_frozen_hash`,
`retroactive_impact_hash`, `amendment_window_evaluation_hash`, and
`authority_operation_profile_ref` that justified reuse or invalidation, mirrored through
`amendment_eligibility_contract`; stale posture SHALL also retain explicit invalidation reason
codes.

## UPSERT_AMENDMENT_CASE(...)
**Goal**: Persist or advance the amendment-case artifact, including lifecycle state, baseline/drift refs, amendment-window posture, retroactive-impact posture, any authority calculation / confirmation refs produced by the intent-to-amend flow, and deterministic same-scope supersession.
**Output**: `AmendmentCase`.
**Invariant**: at most one non-superseded exact-scope amendment chain may remain active for the same client/period/scope key at a time; historical cases SHALL be preserved and linked rather than overwritten.
Ready-to-amend posture SHALL retain fresh calculation, basis, confirmation, readiness lineage, the
frozen baseline/window/retroactive hashes, and the governing authority-operation-profile ref; stale
posture SHALL retain explicit invalidation reasons; bundle-backed states SHALL retain
`current_bundle_ref`; `amendment_eligibility_contract` SHALL mirror trigger, eligibility, and
readiness posture; and supersession SHALL never self-reference.

## CONSTRUCT_AMENDMENT_BUNDLE(...)
**Goal**: Freeze the authority-facing amendment payload contract that ties together the exact baseline envelope, drift record, retroactive impact analysis, amendment window, calculation basis, user confirmation, and packet hash used for submission.
**Output**: `AmendmentBundle`.
**Invariant**: once a bundle is frozen for submission it SHALL be immutable; later recalculation or scope widening SHALL create a new superseding bundle instead of mutating the previously reviewable authority-facing package.
Active bundles SHALL retain the current baseline/window/retroactive/basis refs together with their
frozen hashes, user-confirmation lineage, authority-operation-profile ref, payload hash, and a
deterministic `bundle_identity_hash`; submitted or confirmed bundles SHALL additionally retain the
transmitted `packet_ref`.

## AMENDMENT_GATE(...)
**Goal**: Govern both:
- the right to begin an amendment journey, and
- the right to continue an amendment journey once `intent-to-amend` readiness context exists.  
**Output**: non-access `GateDecisionRecord`.  
**Rule**:
- `AMENDMENT_GATE(...)` SHALL be the only gate family that speaks for amendment `intent-to-amend` readiness failure.
- A caller SHALL never route `intent-to-amend` readiness failure through `FILING_GATE(...)`.
- A caller SHALL never terminate an amendment-capable run directly from raw `validation_outcome`.
- Where an amendment-intent run begins the authority call inside the amendment stage itself, the caller MAY emit a preparatory `AMENDMENT_GATE(...)` before the authority call and a decisive `AMENDMENT_GATE(...)` after `amendment_readiness_context` is persisted; the later record governs continuation or terminal outcome for that run.

## APPLY_RETENTION_POLICY(...)
**Goal**: Tag all manifest-attached artifacts, enforce expiry/erasure rules consistently, and preserve structural explainability through limitation states and erasure proofs.
**Invariant**:
- pending legal-hold and erasure workflow refs SHALL stay confined to pending retention lifecycle
  states; limited or pseudonymised artifacts SHALL keep limitation semantics without leaking stale
  pending-control refs.

## RECORD_ERROR(...)
**Goal**: Persist normalized error records with retry, blocking, remediation, projection, and visibility semantics.  
**Output**: `ErrorRecord`.
**Invariant**:
- retention/privacy errors SHALL retain direct `artifact_retention_ref`, `retention_class`, and
  governed follow-up linkage (`workflow_item_id` or remediation task ref) rather than pushing that
  context into notes only.
- non-system remediation owners SHALL retain `remediation_owner_ref`, and open non-terminal errors
  SHALL retain either a lawful scheduled retry path or an object-backed `next_action_ref`
- `failure_resolution_contract{...}` SHALL remain bound so error ownership, retry, child-linkage,
  and closure posture stay machine-checkable across reopen, compensation, investigation, and
  accepted-risk paths

## CREATE_REMEDIATION_TASK(...)
**Goal**: Create an owned remediation task from a blocking or review-relevant error.  
**Output**: `RemediationTask`.
**Invariant**:
- retention/privacy remediation SHALL retain manifest lineage plus `artifact_retention_ref`; a
  `CHECK_RETENTION_HOLD` task SHALL remain explicitly tied to a governed work item.
- remediation tasks SHALL NOT publish non-null `retention_class` without the exact
  `artifact_retention_ref` they are governing.
- completed, cancelled, or superseded tasks SHALL retain `resolution_basis_ref`,
  `closure_evidence_refs[]`, and explicit `error_resolution_effect` so task closure cannot silently
  claim source-error closure

## RECORD_COMPENSATION(...)
**Goal**: Persist compensating actions when a partial stateful progression cannot be silently rewound.  
**Output**: `CompensationRecord`.
**Invariant**:
- `PRESERVE_AND_LIMIT` compensation SHALL remain explicitly tied to the affected retention object so
  surviving limited state cannot be mistaken for fully retained evidence.
- compensation artifacts SHALL NOT publish non-null `retention_class` without the exact
  `artifact_retention_ref` they preserve or limit.
- compensation ownership SHALL remain explicit, and any applied, verified, failed, cancelled, or
  superseded compensation posture SHALL retain `resolution_basis_ref` plus closure evidence

## RECORD_ACCEPTED_RISK_APPROVAL(...)
**Goal**: Persist the bounded approval or policy-basis artifact required before any error or
investigation may resolve as accepted risk.
**Output**: `AcceptedRiskApproval`.
**Invariant**:
- retention/privacy exceptions SHALL preserve manifest lineage plus `artifact_retention_ref` even
  when the final outcome is accepted risk rather than direct correction.
- accepted-risk approvals SHALL NOT publish non-null `retention_class` without the exact
  `artifact_retention_ref` that remains under exception handling.
- accepted-risk approval SHALL remain the only lawful companion object for `resolution_state = ACCEPTED_RISK`

## OPEN_FAILURE_INVESTIGATION(...)
**Goal**: Persist a typed investigation record when remediation enters an ambiguity, forensic, or
policy-review lane instead of direct correction.
**Output**: `FailureInvestigation`.
**Invariant**:
- investigations SHALL NOT publish non-null `retention_class` without the exact
  `artifact_retention_ref` they are evaluating; retention/privacy exceptions SHALL therefore stay
  anchored to one governed retention object throughout review and closure.
**Invariant**:
- `RETENTION_PRIVACY_EXCEPTION` investigations SHALL stay bound to the same `ArtifactRetention`
  object that triggered the exception branch.
- investigations SHALL retain explicit owner and evidence-backed closure under
  `failure_resolution_contract{...}` rather than collapsing into notes or detached review UI state

## RECORD_OBSERVABILITY(...)
**Goal**: Emit correlated traces, metrics, and logs for manifest, gate, authority, retention, and drift events without leaking sensitive data.  
**Output**: telemetry records linked by resource and correlation keys.
**Invariant**:
- replay and nightly observability SHALL preserve the frozen correlation keys needed to reconstruct
  branch identity, batch identity, and comparison posture without promoting logs to source-of-truth
  status.

## COLLECT_RUN_ERRORS(...)
**Goal**: Collect the `ErrorRecord`s linked to the current manifest for observability, reporting, or terminal bundle enrichment.  
**Output**: ordered error-record refs.

## BUILD_FAILURE_LIFECYCLE_DASHBOARD(...)
**Goal**: Materialize one authoritative read-side dashboard for a governed failure lineage from
persisted lifecycle objects, workflow state, audit refs, and provenance refs.
**Output**: `FailureLifecycleDashboard`.
**Invariant**:
- the dashboard SHALL preserve one ordered `lineage_error_refs_in_order[]` chain from
  `root_error_ref` to `current_error_ref`; reopened or successor failures SHALL not orphan earlier
  closure evidence;
- `current_state_source`, `current_owner`, and `next_legal_action` SHALL remain typed and
  object-backed; non-terminal dashboards SHALL not derive action posture from logs or UI heuristics;
- compensation posture SHALL remain subordinate to visible underlying error lineage rather than
  replacing it; and
- accepted-risk posture SHALL retain expiry plus an accountable owner so review ownership does not
  float outside the lifecycle read model.

## EMIT_WORKFLOW_ITEM(...)
**Goal**: Emit one workflow item directly when a narrow post-processing action is needed outside the main planner.  
**Output**: workflow item ref.

## ARTIFACT_CONTENT_HASH(...)
**Goal**: Compute the deterministic content hash for a first-class artifact envelope or payload.  
**Output**: content hash.

## EMIT_AUDIT_EVENT(...)
**Goal**: Persist append-only audit evidence for filing-critical, authority-critical, security-critical, and privacy-critical events.  
**Output**: `AuditEvent`.

## QUERY_OBSERVABILITY_SLICE(...)
**Goal**: Materialize a deterministic observability/audit query slice for investigation, export, or
timeline use without collapsing audit evidence into operational telemetry.
**Output**: `AuditInvestigationFrame`.
**Invariant**:
- the slice SHALL freeze `query_contract_code`, `query_anchor_ref`, `ordering_basis`,
  `ordered_event_refs[]`, and any supporting trace/log refs so the consumer does not infer order or
  join rules locally; and
- `supporting_log_record_refs[]` MAY explain runtime behavior but SHALL NOT replace audit evidence as
  the proof of record.

## ALLOCATE_NIGHTLY_BATCH_RUN(...)
**Goal**: Allocate or recover the tenant-scoped `NightlyBatchRun` for one frozen nightly window before any client selection begins.
**Output**: `NightlyBatchRun`.
**Invariant**:
- duplicate scheduler deliveries for the same frozen dedupe tuple SHALL return the same batch or a typed terminal result;
- no second active batch for the same tenant and `nightly_window_key` may exist unless the earlier batch has been formally abandoned or superseded by recovery; and
- release admissibility, environment, policy snapshot, and concurrency profile SHALL be frozen on the batch before selection; and
- recovery-triggered batches SHALL freeze `reclaimed_predecessor_batch_run_ref` on the successor and
  persist `successor_batch_run_ref` on the abandoned predecessor before any resumed selection or
  dispatch work begins.
  `NightlyBatchRun.identity_contract{...}` SHALL mirror the scheduler dedupe tuple, and
  `recovery_resume_state` SHALL prove whether successor reclaim resumed predecessor shard ownership
  or only re-used predecessor selection under lawful resharing.

## SELECT_NIGHTLY_PORTFOLIO(...)
**Goal**: Determine the complete ordered set of nightly candidate dispositions for the batch from durable manifest, workflow, authority, late-data, drift, remediation, and policy truth.
**Output**: ordered `selection_entries[]` attached to `NightlyBatchRun`.
**Invariant**:
- every candidate SHALL resolve to exactly one `selection_disposition`;
- selection SHALL be deterministic from the frozen batch envelope plus durable truth;
- each execution-capable entry SHALL persist `priority_score`, expected service time, component
  pressures, retry economics, and fairness-group identity so ordering is replayable rather than
  reconstructed heuristically; and
- same-window reuse, defer, escalation, and skip decisions SHALL be persisted explicitly rather than implied by omission.
  `REUSE_EXISTING_TERMINAL_RESULT` SHALL retain the reused prior-manifest lineage without allocating
  a new manifest, `EXECUTE_CONTINUATION_CHILD` SHALL retain the concrete prior-manifest lineage that
  forced continuation, deferred entries SHALL retain their next checkpoint, and `ESCALATE_ONLY`
  entries SHALL retain the published workflow refs for operator handoff.
  `selection_universe_count` SHALL equal the persisted entry count, and each row SHALL retain
  `candidate_identity_hash`, `terminal_result_reuse_state`, and
  `active_attempt_resolution_state` so fresh execution can be proven to happen only after lawful
  reuse and active-attempt checks. Reclaim-driven continuation SHALL additionally retain
  `predecessor_selection_entry_ref_or_null` so a successor can prove it resumed durable lineage
  rather than launching a second same-window attempt.

## PLAN_NIGHTLY_SHARDS(...)
**Goal**: Derive a stable shard plan and concurrency ceilings for the selected nightly portfolio.
**Output**: shard plan + frozen concurrency profile.
**Invariant**:
- the same selection set and ceiling profile SHALL produce the same shard assignment;
- ordering SHALL be stable within shard and SHALL NOT require tenant-wide FIFO serialization for unrelated clients;
- admitted work within a shard SHALL be scheduled through deterministic fairness groups and deficit
  accounting rather than naive queue order; and
- per-client serialization plus authority-transmit ceilings SHALL remain stricter than or equal to generic worker-pool concurrency.
  `shard_plan[].entry_refs[]` SHALL partition execution-capable entries exactly once, and
  non-execution dispositions SHALL remain off-shard so unrelated shard failure cannot erase their
  explicit nightly posture. Failure, block, or reclaim shard states SHALL also retain
  `blocked_entry_refs[]` plus `failure_reason_codes[]` so isolated shard damage stays bounded and
  explainable.

## EXECUTE_NIGHTLY_CLIENT_ATTEMPT(...)
**Goal**: Execute one selected nightly disposition by reusing, deferring, escalating, or invoking `RUN_ENGINE(...)` with frozen nightly launch context.
**Output**: persisted per-client nightly outcome record or equivalent batch-entry update.
**Invariant**:
- the helper SHALL re-read durable truth for the candidate immediately before action;
- it SHALL recompute unattended admissibility, `priority_score`, and the active stability regime
  before dispatch rather than trusting stale selection-time assumptions;
- it SHALL refuse duplicate execution while a valid active manifest lease already exists for the same client-period/exclusive action family;
- continuation, late-data, drift, amendment, and recovery branches SHALL use ordinary manifest lineage rather than mutating prior truth in place; and
- `TrustSummary.automation_level = ALLOWED` SHALL be treated as necessary but not sufficient for unattended progression.

## RESOLVE_STALE_NIGHTLY_BATCH(...)
**Goal**: Reclaim or supersede a stale nightly batch or shard after heartbeat expiry without duplicating external effects.
**Output**: successor batch linkage, resumed cursor state, or escalation outcome.
**Invariant**:
- no successor may continue until stale-heartbeat proof, durable cursor recovery, and active manifest-lease posture have been checked;
- no recovery path may blindly resend a live authority mutation before persisted-attempt recovery is performed; and
- unresolved ambiguity SHALL escalate affected entries rather than guessed continuation.
  Successor reclaim SHALL reuse predecessor selection lineage and either resume shard ownership or
  explicitly reshard it under `recovery_resume_state`; it SHALL NOT restart the nightly portfolio
  from scratch.

## AGGREGATE_NIGHTLY_BATCH_OUTCOME(...)
**Goal**: Fold per-client nightly outcomes into one batch-level summary, counters, and quiescence decision.
**Output**: updated `NightlyBatchRun`.
**Invariant**:
- per-client failure SHALL NOT erase successful results from other clients;
- aggregation SHALL compute both outcome counts and coherent portfolio tail risk so the batch is
  not summarized by counts alone;
- `COMPLETED_WITH_FAILURES` SHALL require explicit accounting of every selected entry; and
- quiescence SHALL mean no further autonomous work is legally runnable for this batch window.
  `selected_count` SHALL equal the number of persisted `selection_entries[]`, `execution_count`
  SHALL count only entries that actually invoked `RUN_ENGINE(...)`, `reused_result_count` /
  `deferred_count` / `skipped_count` / `waiting_on_authority_count` /
  `waiting_on_late_data_count` / `completed_count` SHALL mirror their outcome buckets exactly,
  `escalated_count` SHALL cover `{REVIEW_REQUIRED, REQUEST_CLIENT_INFO, BLOCKED_INTERNAL}`, and
  `failed_count` SHALL cover `{FAILED_RETRYABLE, FAILED_NON_RETRYABLE}`. Any quiescing, terminal,
  blocked, failed, or abandoned batch with `selection_completed_at` set SHALL retain one explicit
  `outcome_bucket` per selection entry.

## PUBLISH_OPERATOR_MORNING_DIGEST(...)
**Goal**: Publish the next-morning operator summary and queue-facing handoff state from persisted batch, manifest, workflow, authority, late-data, drift, and error truth.
**Output**: `OperatorMorningDigest`.
**Invariant**:
- queue/workflow publication SHALL occur before digest publication for unresolved items;
- notification publication SHALL either complete with persisted refs or complete with an explicit
  no-notification posture before digest publication;
- digest generation SHALL be idempotent for the same source batch set and SHALL use explicit supersession when a later recovery digest replaces an earlier one; and
- `derivation_contract{...}` SHALL freeze one nightly window key, one source-batch-set hash, one
  persisted-outcome count vector, one published-workflow count vector, settled workflow/notification
  publication timestamps, one passed publication QA packet over the exact outcome, queue, highlight,
  workflow, notification, authority-wait, and late-data-hold partitions, and monotonic supersession lineage; and
- `covered_selection_entry_refs[]` SHALL equal the exact union of `outcome_entry_refs{...}` so
  client outcome counts remain replayable from persisted nightly selection truth instead of
  dashboard counters; and
- `queue_summaries[].item_refs[]` and any highlighted `work_item_ref` SHALL exactly partition the
  persisted `published_workflow_item_refs[]` captured on the digest rather than ephemeral queue
  reads or logs; and
- `queue_summaries[].source_basis` SHALL remain `PUBLISHED_WORKFLOW_ITEMS`, and highlighted
  outcomes SHALL retain `selection_entry_ref`, `highlight_rank`, and `entry_loss_score`; and
- `publication_qa_completed_at` SHALL not predate settled workflow or notification publication, and
  `NightlyBatchRun.operator_digest_publication_state = PUBLISHED_COMPLETE` SHALL only be legal once
  the batch is quiescence-safe and complete digest QA has passed; and
- customer-visible notifications emitted from the digest pipeline SHALL still obey collaboration
  visibility, access revalidation, and template-safety rules.

## SIMULATE_NIGHTLY_PORTFOLIO_WHAT_IF(...)
**Goal**: Derive a non-mutating nightly what-if comparison over one frozen nightly batch set.
**Output**: `NightlyPortfolioWhatIfSimulation`.
**Invariant**:
- the simulator SHALL read only persisted nightly batch, digest, release, workflow, and authority truth already frozen by the source batch set;
- `basis_contract{...}` SHALL freeze one `nightly_window_key`, one `source_batch_set_hash`, one exact covered `selection_entry_ref` set, one baseline release or schema identity, and one modeled-only `execution_mode_boundary_hash`;
- `selection_entries[]` used for comparison SHALL already retain replayable ranking terms, including `selection_basis_hash`, `priority_tuple`, `priority_score`, and the persisted pressure terms that drove baseline ordering;
- hard unattended boundaries such as step-up, approval, release inadmissibility, and authority ambiguity SHALL stay blocking under simulation instead of being treated as executable clears; and
- `entry_diffs[]` and `highlight_diffs[]` SHALL explain every changed bucket, execution rank, highlight rank, or digest inclusion change with explicit reason-code diffs rather than log reconstruction or live-query re-evaluation.

## LOW_NOISE_COGNITIVE_BUDGET(...)
**Goal**: Return the frozen production attention budget used by low-noise shell composition and schema validation.  
**Output**: `cognitive_budget{ persistent_surface_limit=4, concurrent_primary_limit=1, primary_reason_limit=3, secondary_action_limit=2, visible_warning_limit=1, detail_entry_point_limit=5, expanded_detail_module_limit=1, visibility_budget_units=12, prominent_motion_limit=1, issue_dominance_min_margin=12, action_dominance_min_margin=15, primary_rank_hysteresis=8, non_material_rank_swap_limit=1, non_material_continuity_cost_limit=6, refresh_coalescing_window_ms=1500, refresh_burst_visible_change_limit=2 }`.

## LOW_NOISE_COPY_BUDGET(...)
**Goal**: Return the frozen microcopy budget for the low-noise shell so summary surfaces stay one-scan readable even when legal or authority source text is verbose.  
**Output**: `copy_budget{ manifest_label_max_chars=64, context_label_max_chars=48, headline_max_chars=96, reason_label_max_chars=120, explanation_max_chars=240, action_label_max_chars=40, blocking_reason_max_chars=160, uncertainty_max_chars=160, detail_entry_label_max_chars=48, detail_entry_reason_max_chars=120 }`.

## TRIM_LOW_NOISE_COPY(...)
**Goal**: Normalize shell copy to the frozen low-noise budget before schema serialization without mutating machine-stable legal meaning.  
**Output**: bounded context labels, bounded summary copy, bounded action labels, and bounded detail-entry copy.  
**Rule**:
- preserve machine-stable reason codes and action codes even when visible text is shortened
- prefer one literal sentence over stacked clauses, repeated qualifiers, or branded metaphor
- when source text exceeds shell budget, keep the legal nucleus in the shell and route remaining detail into the relevant drawer module
- let `decisive_atoms(C)` be the frozen tuple `{dominant_question, attention_state, primary_issue_ref?, visible machine_reason_codes prefix, limitation_state, actionability_state, primary_action_code | no_safe_action_reason_code}` for canonical semantic set `C`
- let `visible_atoms(v)` be the decisive atoms either rendered directly or exposed through the mounted shell's route-stable disclosure path
- minimize visible copy subject to `semantic_coverage(v) = |decisive_atoms(C) ∩ visible_atoms(v)| / |decisive_atoms(C)| = 1`

## DERIVE_ATTENTION_POLICY(...)
**Goal**: Rank visible concerns and select one dominant posture, one dominant safe action or explicit `NO_SAFE_ACTION`, collapsed notice counts, ordered detail entry points, and the default detail module.  
**Output**: `attention_policy{..., primary_rank_score, runner_up_rank_score, dominance_margin }`.
**Rule**:
- compute `issue_score(i) = 40*severity_weight(i) + 20*action_constraint_weight(i) + 10*urgency_weight(i) + 8*authority_grounding_weight(i) + 6*focus_locality_weight(i) + primary_rank_hysteresis*1[i = previous_primary_issue] - 6*context_switch_cost(i) - 4*noise_cost(i)`
- hard blocks, integrity fractures, and authority contradictions SHALL therefore outrank neutral progress or success by formula, not by renderer folklore
- limitation states outrank neutral progress when they change what the user can safely do
- the top-level primary surface in `LOW_NOISE` SHALL be one of `CONTEXT_BAR`, `DECISION_SUMMARY`, `ACTION_STRIP`, or `DETAIL_DRAWER`; richer observatory surfaces remain internal source modules unless investigation mode is explicit
- the selected primary SHALL satisfy `dominance_margin = primary_rank_score - runner_up_rank_score >= issue_dominance_min_margin`; otherwise keep the prior valid primary or collapse the ambiguous contenders into secondary notices
- the output SHALL mirror the top-level convenience fields emitted in `ExperienceDelta`
- the output SHALL also feed the shared `dominance_contract` so renderers do not infer question ownership or support-surface priority heuristically

## FILTER_VISIBLE_ACTIONS(...)
**Goal**: Omit non-legal, unavailable, or non-material actions and return the bounded default action set for the low-noise shell.  
**Output**: `primary_action`, `secondary_actions[]`, `investigation_entry_point`, `primary_action_score`, `runner_up_action_score`, `dominance_margin`.
**Rule**:
- filter out any action that fails legality, policy, freshness, or mode-safety gating before ranking
- score the survivors by `action_score(a) = 30*completion_gain(a) + 25*risk_reduction(a) + 15*deadline_pressure(a) + 10*ownership_clarity(a) + 8*focus_locality(a) + 6*continuity_bonus(a) - 20*reversibility_cost(a) - 12*context_switch_cost(a)`
- at most one primary action and at most two secondary actions
- visible secondary actions in `LOW_NOISE` SHALL remain non-mutating; mutation-capable actions may
  occupy the dominant slot only
- a mutation-capable primary action SHALL satisfy `primary_action_score >= 60` and `dominance_margin >= action_dominance_min_margin`; otherwise promote the least-destructive inspect/review/refresh action or emit `NO_SAFE_ACTION`
- visible action labels SHALL fit the frozen low-noise copy budget
- when waiting posture or `NO_SAFE_ACTION` applies, disabled controls SHALL NOT be emitted as placeholders
- candidate actions SHALL be intersected with the current legal-progression rank derived from trust,
  decisive gate posture, and terminal bundle state so read-side surfaces never advertise a stronger
  mutation posture than the frozen progression minimum
- decisive gate posture SHALL be read from persisted `GateDecisionRecord.gate_semantics_contract.progression_rank`
  and `override_dependency_state`, not recomputed from the raw decision enum in UI-local code

## NORMALIZE_LIMITATION_STATE(...)
**Goal**: Classify visible absence so latency, policy limits, irrelevance, and true emptiness never collapse into one ambiguous state.  
**Output**: normalized limitation / empty-state classification from `{NONE, NOT_REQUESTED, NOT_YET_MATERIALIZED, LIMITED, NOT_APPLICABLE}`.
**Rule**:
- `LIMITED` SHALL carry machine reason codes that distinguish at minimum masking, retention,
  permission, partial-evidence-loss, and projection minimisation; a limited state with no typed
  reason is invalid
- shell publishers SHALL freeze the mounted shell interpretation through
  `state_taxonomy_contract{ current_empty_state_or_null, current_empty_surface_code_or_null,
  limitation_reason_codes[], current_settlement_state, current_recovery_posture,
  mounted_context_state }`

## BUILD_CONTEXT_BAR_STATE(...)
**Goal**: Build the compressed persistent orientation strip for the low-noise shell.  
**Output**: `CONTEXT_BAR` payload.  
**Rule**:
- mode or non-live posture SHALL appear here once by default rather than as repeated banners elsewhere
- labels SHALL fit the frozen low-noise copy budget and prefer terse, literal status language over decorative phrasing
- emitted context-bar payloads SHALL validate against `schemas/context_bar_state.schema.json`

## BUILD_DECISION_SUMMARY_STATE(...)
**Goal**: Build the primary posture object with a bounded reason set, explicit limitation statement, and plain-language explanation.  
**Output**: `DECISION_SUMMARY` payload.  
**Rule**:
- emit at most three visible reasons plus `additional_reason_count`
- headline, reason labels, uncertainty text, and explanation text SHALL fit the frozen low-noise copy budget
- distinguish `NOT_REQUESTED`, `NOT_YET_MATERIALIZED`, `LIMITED`, and `NOT_APPLICABLE`
- publish `state_reason_code_or_null` for `NOT_REQUESTED`, `NOT_YET_MATERIALIZED`, and
  `NOT_APPLICABLE`, and publish `limitation_reason_codes[]` for `LIMITED`
- when projection-limited visible explanation confidence is lower than retained decision confidence,
  the summary SHALL disclose the lower visible confidence rather than reusing the higher internal
  decision-side confidence as user-facing certainty
- emitted decision-summary payloads SHALL validate against `schemas/decision_summary_state.schema.json`

## BUILD_ACTION_STRIP_STATE(...)
**Goal**: Build the dominant next-step surface for the low-noise shell.  
**Output**: `ACTION_STRIP` payload with primary/secondary action tokens, ownership text, reason inventories, deterministic detail continuity fields, and frozen action-dominance metrics.
**Rule**:
- expose one dominant safe action
- expose at most two subordinate secondary actions
- action tokens SHALL include target object or target detail-module context, and mutation-capable actions SHALL carry an explicit live-freshness requirement
- action labels, ownership copy, waiting copy, reason codes, and blocking reasons SHALL fit the frozen low-noise copy budget
- serialize `primary_action_score`, `runner_up_action_score`, `dominance_margin`, and `suppressed_secondary_count` so clients never infer action dominance heuristically
- when no safe legal action exists, emit `NO_SAFE_ACTION`, the blocking reason, and a deterministic investigation entry point
- emit bounded `available_action_codes[]`, bounded `blocked_action_codes[]`, `machine_reason_codes[]`, and preserve `suggested_detail_surface_code`, `active_detail_surface_code`, and `focus_anchor_ref` when still valid
- emitted action-strip payloads SHALL validate against `schemas/action_strip_state.schema.json`

## BUILD_DETAIL_DRAWER_STATE(...)
**Goal**: Build the collapsed expert-module drawer without allowing expert depth to overwhelm the default shell.  
**Output**: `DETAIL_DRAWER` payload.  
**Rule**:
- expose only modules relevant to the current posture
- expose at most five entry points on default load
- entry ranking SHALL inherit the same issue-ordering and hysteresis policy used by `DERIVE_ATTENTION_POLICY(...)` so high-frequency refresh does not churn drawer prominence
- entry labels and entry reasons SHALL fit the frozen low-noise copy budget
- allow at most one expanded module unless compare or audit mode is explicit
- preserve `focus_anchor_ref` whenever the anchored object still exists
- emitted detail-drawer payloads SHALL validate against `schemas/detail_drawer_state.schema.json`

## BUILD_LOW_NOISE_BUDGET_AUDIT(...)
**Goal**: Materialize one deterministic calm-shell budget audit directly from the published shell
payload.  
**Output**: `low_noise_budget_audit{ contract_version, rendered_surface_order, persistent_surface_count, concurrent_primary_count, visible_reason_count, visible_warning_count, visible_action_count, visible_detail_entry_count, visible_shell_char_count, scan_load, duplicate_posture_codes[], refresh_budget_state, detail_fallback_state }`.  
**Rule**:
- compute `visible_shell_char_count` from the actually rendered context, summary, action, and detail-entry copy, not from hidden full-text disclosures
- compute `scan_load` using the frozen low-noise formula and reject any published frame whose audit exceeds `visibility_budget_units`
- require `duplicate_posture_codes[] = []` on published frames; repeated analysis-only, masking, limitation, or blocking posture SHALL be compressed before serialization
- require `secondary_mutation_action_count = 0` so the calm shell never surfaces a second mutation-capable action story beside the dominant next move
- for `NON_MATERIAL_REFRESH` and `RECOVERY_RECONNECT`, serialize explicit rank-swap, continuity-cost, visible-change, and coalesced-change accounting instead of inferring coalescing after the fact

## RUN_LOW_NOISE_BUDGET_AUDIT_PACK(...)
**Goal**: Publish the deterministic scenario matrix that proves calm-shell compression stays within
budget under first-view, refresh, reconnect, and fallback pressure.  
**Output**: `low_noise_budget_audit_pack{ cases[] }`.  
**Rule**:
- cover first view, high reason pressure, `NO_SAFE_ACTION`, non-material refresh, reconnect or catch-up, and typed detail fallback
- include at least one case where non-material change is explicitly coalesced before attention is reordered
- include at least one case where detail fallback is typed as `ACTIVE_MODULE_PRESERVED`, `FIRST_VALID_ENTRY_SELECTED`, `SUGGESTED_MODULE_SELECTED`, or `COLLAPSED_ROOT_SELECTED`
- bind every case to the shared `low_noise_budget_audit` contract so scenario evidence and per-frame publication evidence cannot drift apart

## BUILD_LIVE_EXPERIENCE_FRAME(...)
**Goal**: Materialize the reconnect-safe shell frame and composite low-noise surfaces from the richer observatory read models.  
**Output**: latest experience frame plus `ExperienceDelta` patch set.  
**Rule**:
- validate composite shell payloads against surface-specific contracts
- validate the published snapshot against `schemas/low_noise_experience_frame.schema.json`
- emit only `CONTEXT_BAR`, `DECISION_SUMMARY`, `ACTION_STRIP`, and `DETAIL_DRAWER` as peer top-level surfaces when `experience_profile = LOW_NOISE`
- emit `attention_policy{{...}}`, `cognitive_budget{{...}}`, `focus_anchor_ref`, and `shell_stability_token`
- emit `low_noise_budget_audit{...}` computed from the published shell payload before release
- compute `scan_load(F)` before publication and collapse lower-ranked warnings, secondary actions, or detail entries rather than publishing any frame with `scan_load(F) > visibility_budget_units`
- for any non-material refresh candidate `R`, compute `continuity_cost(R) = 5*1[dominant_question changes] + 4*1[primary_action_code changes] + 3*1[focus_anchor_ref is lost] + 2*rank_swap_count(R) + 2*prominent_motion_count(R)` and coalesce the patch when the frozen continuity budget would be exceeded
- within any rolling `refresh_coalescing_window_ms` window, promote at most `refresh_burst_visible_change_limit` non-material visible changes; additional churn SHALL collapse into counts, freshness, or drawer-local updates
- responsive, split-view, and embedded renderers MAY redock `DETAIL_DRAWER` or wrap `ACTION_STRIP`,
  but SHALL preserve the same four surface identities and SHALL NOT replace the shell with a
  full-screen takeover during resize or container collapse
- emit one shared `interaction_layer = OperatorInteractionLayer` as the platform-translation
  boundary for browser, native, and automation embodiments; native scene wrappers MAY only vary the
  embodiment surfaces already sanctioned by the owning read model and SHALL NOT invent a second
  refresh, recovery, or current-versus-history grammar
- emit `interaction_layer.foundation_contract = InteractionLayerFoundationContract` so calm-shell
  density, spacing, support-spacing, compaction, motion, preview, notification, and
  secondary-window token bindings remain explicit instead of route-local theme defaults
- emit one shared `semantic_accessibility_contract` with the calm-shell anchor inventory,
  `CONTEXT_BAR -> DECISION_SUMMARY -> ACTION_STRIP -> DETAIL_DRAWER` focus order, and the governed
  live-update announcement kinds so browser automation, assistive technology, and native wrappers
  reuse one semantic boundary
- preserve shell order as `CONTEXT_BAR -> DECISION_SUMMARY -> ACTION_STRIP -> DETAIL_DRAWER` unless compare or audit mode is explicit
- preserve shell order, reading order, and focus anchor across reconnect, catch-up, and non-destructive refresh whenever the focused object still exists

## DERIVE_CLIENT_PORTAL_STATUS(...)
**Goal**: Flatten internal workflow, gate, trust, filing, and authority posture into one plain-language client-facing status hero.  
**Output**: `status_hero`.  
**Rule**:
- emit literal client language such as `Action needed`, `Waiting on us`, `Ready to sign`, or `Completed` rather than raw gate enums or expert terminology
- expose one dominant next step, one due label where relevant, and a bounded step list showing what happens next
- on the `Home` route, any action-requiring hero SHALL align to the one explicit dominant task named
  by `home_primary_task_ref`
- emitted headline, supporting text, due-label, and action copy SHALL obey `PortalLanguageContract`
  and `status_hero.secondary_action` SHALL stay null so the hero cannot publish a competing
  first-view CTA
- internal-only reason codes, manifest lineage, and expert module names SHALL NOT appear in the first-view client projection

## BUILD_CLIENT_TASK_QUEUE(...)
**Goal**: Group client-visible work into a low-friction queue optimized for completion rather than investigation.  
**Output**: ordered `task_groups[]` partitioned into `DO_NOW`, `COMING_UP`, and `DONE`.  
**Rule**:
- the home route SHALL expose at most one dominant task CTA above the fold
- tasks SHALL be grouped by urgency and outcome, not by internal subsystem ownership
- every task SHALL state the requested action, why it matters, the due point if known, and the route that will complete it
- task labels, descriptions, and action labels SHALL obey `PortalLanguageContract` and SHALL not
  leak workflow, manifest, audit, assignment, or staff-role vocabulary
- when a home task is the dominant first-view task, the builder SHALL publish its `task_id` as
  `home_primary_task_ref` and keep its primary action aligned with `status_hero.primary_action`

## BUILD_CLIENT_DOCUMENT_CENTER(...)
**Goal**: Project secure document-request and upload state for the customer/client portal.  
**Output**: `document_center`.  
**Rule**:
- every upload SHALL remain attached to a request, category, or explicit uncategorized holding area; orphaned uploads are forbidden
- accepted file types, size limits, scanner state, and retry posture SHALL be visible without opening help copy
- the builder SHALL derive and publish the current request's `request_version_ref` plus the focused
  upload session's `request_version_ref`, grouped `upload_request_binding_contract`,
  `request_binding_state`, `resumability_state`, `attachment_state`, `next_action_code`,
  `upload_confidence_score`, `recovery_posture`, and `dominant_hazard_code` before serializing the
  dominant request card
- the builder SHALL publish `latest_upload_ref` as upload chronology and
  `current_request_upload_ref_or_null` as the sole current-request-satisfaction pointer; these two
  refs SHALL NOT silently collapse into one field after reconnect, rebase, or replacement flows
- `Submit`, `Attach`, or equivalent completion copy SHALL NOT be primary while
  `upload_confidence_score < 70`
- the current request and current accepted upload SHALL remain the default handoff target; superseded, rejected, or failed uploads SHALL stay secondary and explicitly labeled as history or recovery context
- request rebases SHALL preserve upload draft context on the same request card, but the builder
  SHALL force explicit rebind posture through `request_binding_state` rather than silently updating
  an older upload session onto the new request version
- the builder SHALL preserve the same upload session and storage lineage during in-flight request
  rebases and SHALL only surface `RECONFIRM_REQUEST` after an accepted upload settles into stale
  rebind-required posture
- the builder SHALL resume an existing governed upload session on reconnect when
  `upload_request_binding_contract.resume_identity_policy = RESUME_EXISTING_SESSION_ONLY` and SHALL
  never mint a duplicate current-row upload merely because the client refreshed or changed device
- mobile capture and desktop drag/drop SHALL resolve to the same governed `ClientUploadSession` lifecycle
- deterministic upload recovery SHALL also be proven by
  `schemas/upload_session_recovery_harness.schema.json`, which enumerates reconnect, reload,
  stale-rebase, duplicate-retry, scanner-delay, attachment-confirmation, and cross-device cases

## BUILD_CLIENT_APPROVAL_CENTER(...)
**Goal**: Build the plain-language review and sign-off experience for client declarations, summaries, and approval packs.  
**Output**: `approval_center`.  
**Rule**:
- separate `what you are approving`, `what changed`, and `what happens after you sign` into distinct visible sections
- the builder SHALL derive and publish `approval_readiness_score`, `stale_protection_state`,
  `recovery_posture`, and any current step-up expiry from the governed pack before rendering the
  dominant sign-off action
- sign-off actions SHALL bind to the current `approval_pack_hash`, stale-view guards, and explicit step-up requirements where applicable
- `Sign now` SHALL NOT be primary while `approval_readiness_score < 85` or the pack is not in
  current signable posture
- the current approval pack and latest receipt SHALL render summary-first; superseded packs, prior signatures, and raw payload history SHALL remain accessible but SHALL NOT replace the primary review target
- the client-facing summary SHALL omit operator-only diagnostics while preserving the legal meaning of the declaration

## BUILD_CLIENT_ONBOARDING_STATE(...)
**Goal**: Build the one-step-at-a-time onboarding journey for invited client users.  
**Output**: `onboarding_journey`.  
**Rule**:
- only one required onboarding step may be primary at a time
- completed steps SHALL collapse into a concise progress summary rather than remain open as a long form stack
- save-and-return SHALL preserve the current step, entered answers, and any in-progress upload sessions

## BUILD_CLIENT_PORTAL_WORKSPACE(...)
**Goal**: Compose the simplified customer/client portal workspace from status, tasks, documents, approvals, onboarding, support, and activity data.  
**Output**: `ClientPortalWorkspace`.  
**Rule**:
- global navigation SHALL expose at most five destinations and SHALL omit inactive sections rather than disable them
- the builder SHALL emit `shell_family = CLIENT_PORTAL_SHELL`, one `object_anchor_ref`, and one
  `dominant_question` so the mounted portal shell keeps same-object continuity across deep links,
  reconnect, and responsive collapse
- the builder SHALL emit one shared `language_contract = PortalLanguageContract` and thread that
  same contract through portal request-list and customer-visible request-detail projections so
  client wording, due-label grammar, current-versus-history phrasing, and bounded copy budgets stay
  server-authored
- the workspace SHALL present one dominant status hero, one dominant CTA, and a bounded recent-activity timeline before any secondary detail
- when `route = HOME`, the workspace SHALL emit
  `home_surface_order = [PORTAL_HEADER, STATUS_HERO, TASK_QUEUE, RECENT_ACTIVITY]`, cap
  `activity_timeline[]` to the latest six events, and retain `home_primary_task_ref` whenever the
  hero is asking the client to act
- the builder SHALL derive `workspace_posture{ connection_state, interaction_posture, promoted_support_region, notice_headline, notice_detail, full_text_ref }` so reconnect, review-required, and limited states remain explicit without replacing the mounted object shell
- the builder SHALL also emit top-level shared-shell `settlement_state` and `recovery_posture`
  derived from that posture spine: `RECONNECTING` or `CATCHING_UP` map to
  `FRESHENING` plus `INLINE_RECONNECT`; `freshness_state = STALE_REVIEW_REQUIRED` maps to
  `STALE_REVIEW_REQUIRED` plus `INLINE_REBASE`; `freshness_state = DEGRADED` maps to
  `DEGRADED_READ_ONLY` plus `READ_ONLY_LIMITED`; and `freshness_state = FRESH` with
  `connection_state = CONNECTED` maps to `STEADY` plus `NONE`
- the workspace SHALL emit one shared `interaction_layer = PortalInteractionLayer` as the
  cross-client contract boundary for browser, mobile, and native portal embodiments; those
  embodiments MAY restack support/detail surfaces but SHALL NOT create detached recovery branches,
  duplicate promoted support regions, or reinterpret same-shell return and current-versus-history
  posture locally
- the workspace SHALL emit `interaction_layer.foundation_contract = InteractionLayerFoundationContract`
  so portal task density, primary stack spacing, inline support spacing, responsive stacking, and
  motion posture remain governed token bindings rather than renderer-local style choices
- the builder SHALL emit `cross_device_continuity_contract` bound to the mounted portal object,
  active route identity, contextual parent return/focus anchors, `stability_contract.guard_vector_hash`,
  `visibility_partition{ access_binding_hash, masking_posture_fingerprint, cache_partition_key }`,
  browser-only embodiments, and the route's server-authored dominant-action posture so device changes
  and reconnect restore the same object without widening visibility or remounting a different shell
- the builder SHALL emit `semantic_accessibility_contract` with the portal anchor inventory,
  `PORTAL_HEADER -> STATUS_HERO -> PRIMARY_ACTION -> PROMOTED_SUPPORT_REGION -> SUPPORTING_DETAIL`
  focus order, and typed announcement kinds so contextual routes keep one semantic shell through
  resize, reconnect, and narrow-screen stacking
- the workspace SHALL emit `workspace_version`, `freshness_state`, and `view_guard_ref` so stale or
  degraded portal views can rebase without local client guesswork
- `navigation_tabs[]` SHALL keep canonical labels for `Home`, `Documents`, `Approvals`, `Onboarding`,
  and `Help`; `Home` and `Help` remain badge-free, while `Documents` and `Approvals` badges mirror
  action-required counts from the governed document and approval centers
- the workspace SHALL emit `reliability_summary{ surface_class, network_posture,
  dominant_flow_kind, flow_stability_score, risk_weighted_friction_score,
  completion_probability, recovery_posture, dominant_abort_hazard_code }` from the governed portal
  reliability formulas rather than from renderer-local guesses
- when `freshness_state != FRESH`, the dominant CTA SHALL downgrade to a safe review or refresh
  path and the workspace SHALL publish one explicit limitation notice instead of leaving stale
  mutation visually live
- when `flow_stability_score < 60` or `recovery_posture != NONE`, the dominant CTA SHALL downgrade
  to explicit review or recovery posture unless the only safe mutation left is the recovery action
  itself
- when the current action is legally reversible and `completion_probability < 0.40`, the dominant
  CTA SHALL prefer save, recover, or help over an irreversible submit or sign action
- outside the Help route, the builder SHALL promote at most one support region at a time, preferring the most action-constraining posture among draft resume, limitation notice, and support escalation
- contextual deep-link routes SHALL preserve return route and focus anchor across rebase when the
  object still exists, else fall back deterministically to the parent route with explicit reason
  copy
- when a contextual route is active, `object_anchor_ref` SHALL switch to the contextual request,
  approval, onboarding step, or help object while the top-level `route` and `route_context.return_route`
  continue to name the parent portal tab
- contextual deep links, reconnect rebase, and narrow-screen projections SHALL preserve the same object, return route, focus anchor, and dominant action instead of remounting a different shell for the same request, approval, or onboarding step
- expert observatory modules SHALL remain staff-only or help-mediated routes rather than first-view client surfaces

## BUILD_TENANT_GOVERNANCE_SNAPSHOT(...)
**Goal**: Compose the governance overview projection with one dominant question and route-stable supporting worklists.
**Output**: `TenantGovernanceSnapshot`.
**Rule**:
- derive `attention_summary{attention_family, headline, supporting_text, primary_worklist_ref, primary_action_label, secondary_issue_count}` before serializing overview stacks
- derive the dominant worklist by `family_score(f) = family_base(f) + 25*critical_open_count(f) + 6*min(open_count(f), 9) + 4*oldest_age_bucket(f) + 10*requires_operator_action(f) + 8*1[f = previous_primary_family] - 8*noise_penalty(f)` where `family_base(PENDING_APPROVALS)=500`, `family_base(CONFIGURATION_DRIFT)=420`, `family_base(AUTHORITY_LINK_RISK)=380`, `family_base(RETENTION_EXCEPTION)=340`, and `family_base(AUDIT_HOTSPOT)=300`
- let `oldest_age_bucket(f) = min(floor(oldest_open_age_hours(f) / 8), 6)` and `noise_penalty(f) = 1` when a family changed only through non-material count churn since the previous published snapshot, else `0`
- when the leading family does not exceed the prior still-live family by at least `20`, keep the prior family dominant to suppress prominence thrash
- every issue-family count and the audit-hotspot tape SHALL carry a concrete worklist ref so overview attention never degrades into decorative KPI tiles
- responsive collapse SHALL preserve active filters, selected object context, and any open `ChangeBasket` or audit sidecar state
- the snapshot SHALL emit one shared `interaction_layer = GovernanceInteractionLayer`; browser and
  native governance clients MAY change only `compaction_mode` and
  `auxiliary_surface_presentation`, and SHALL preserve selected object, focus anchor, promoted
  support-surface budgeting, staged diff/basket context, and receipt/problem-driven recovery truth
  while the same governed object still resolves
- the snapshot SHALL emit `interaction_layer.foundation_contract = InteractionLayerFoundationContract`
  so governance density, canvas spacing, auxiliary-surface spacing, redocked compaction, selector,
  motion, and history posture stay explicit and reusable across overview, policy, access, and audit
  routes
- the snapshot SHALL emit `cross_device_continuity_contract` bound to the selected governance
  object, route focus anchor, `policy_snapshot_hash`, browser-only embodiments, and the shared
  dominant-action posture so resize, reconnect, and deep-link recovery preserve one governance
  object identity instead of reopening a different section shell
- the snapshot SHALL emit `semantic_accessibility_contract` with the governance anchor inventory,
  `SECTION_NAV -> PRIMARY_WORKLIST -> WORKSPACE_HEADER -> ATTENTION_SUMMARY -> PROMOTED_AUXILIARY_SURFACE`
  focus order, and typed announcement kinds so dense governance routes remain keyboard and
  assistive-technology coherent across browser and native embodiments

## RUN_SHELL_CONTINUITY_FUZZ_HARNESS(...)
**Goal**: Prove same-object same-shell continuity across browser and native perturbations before
publication or release closure.
**Output**: `shell_continuity_fuzz_harness`.
**Rule**:
- build the harness only from route-visible shells and native scenes that already publish
  `cross_device_continuity_contract`, the shared shell spine, and their authoritative interaction
  posture
- enumerate perturbations with deterministic seeded ordering instead of randomized case generation
- cover rebase, reconnect, resize wide-to-narrow, resize narrow-to-wide, responsive collapse,
  stream catch-up, frame-epoch advance, native scene restore, and secondary-window restore where
  those perturbations are lawful for the surface
- capture `pre_state` and `post_state` for shell family, route identity, canonical object anchor,
  dominant question, settlement or recovery posture, active context, focus anchor, return focus
  anchor, and dominant meaning
- when `truth_change_detected = false`, assert those same-object same-shell fields remain stable;
  the harness SHALL fail if recovery remounts a different route grammar, drops the active module,
  loses the return anchor, or changes dominant action meaning for the same lawful object
- allow degradation only through typed `INLINE_RECOVERY`; silent remount, generic dashboard
  fallback, and untyped shell swaps are forbidden
- emit shrink sequences that remain a strict subset of the injected perturbations so every failing
  case reduces to a replayable minimum
- require both browser and native coverage, at least one preserved case, at least one inline
  recovery case, and at least one secondary-window return-anchor case

## RUN_NATIVE_CACHE_HYDRATION_AUTOMATION_PACK(...)
**Goal**: Prove native cache compatibility, purge, restoration, and post-restore action gating
before release or acceptance closure.
**Output**: `native_cache_hydration_automation_pack`.
**Rule**:
- build the pack only from `ExperienceCursor`, `WorkspaceCursor`,
  `NativeOperatorWorkspaceScene`, and `NativeOperatorSecondaryWindowScene` artifacts that already
  publish `native_cache_hydration_contract`
- enumerate deterministic cases for compatible cold start, schema-incompatible cold start,
  tenant switch, privilege downgrade, session revocation, cache-only restore requiring live rebase,
  and secondary-window masking purge
- require both `XCUITEST` and `NATIVE_PERSISTENCE_FIXTURE` coverage so UI restoration and local
  persistence invalidation cannot drift apart
- assert `compatibility_check_completed_before_render = true`,
  `incompatible_content_rendered = false`, `resume_lineage_reused_illegally = false`, and
  `restoration_reopened_stale_context = false` on every case
- require purge-triggered cases to clear the full regulated local-artifact inventory:
  structured cache, resume metadata, scene-restoration payload, `NSUserActivity`, preview cache,
  temporary export file, and local search index
- allow cache-only restoration to preserve same-object read context only when mutation and
  filing-capable actions remain blocked until live rebase or access rebind re-establishes current
  legality

## RUN_FOCUS_RESTORE_RETURN_TARGET_HARNESS(...)
**Goal**: Prove keyboard-first focus restoration, return-target continuity, and lawful fallback
behavior across contextual routes, support regions, help handoff, stale recovery, live updates,
responsive restack, and native secondary-window dismissal.
**Output**: `focus_restore_return_target_harness`.
**Rule**:
- build the harness only from route-visible shells or native secondary scenes that already publish
  serialized return anchors, fallback targets, and governed interaction posture
- enumerate deterministic close, back, help-return, stale-rebase, live-update, responsive-restack,
  and secondary-window-close cases instead of pointer-only ad hoc checks
- capture `pre_state` and `post_state` for the current route or scene, canonical object, active
  focus anchor, serialized parent return route and anchor, fallback route and anchor, browser or
  native identifier mirror fields, focus-restoration disposition, typed restoration reason, and
  any active focus-lock ref
- require `KEYBOARD_ONLY` on every case; pointer and assistive-tech coverage are additive parity
  proofs, never a substitute for keyboard-first restoration evidence
- mirror browser cases through `browser_*_identifier_or_null` and native-secondary cases through
  `native_*_identifier_or_null`; identifier drift is a contract failure, not a test-only warning
- preserve the serialized invoker or parent-return target whenever the same object and anchor
  remain lawful, and degrade only by the fixed order `OBJECT_SUMMARY -> PARENT_RETURN ->
  NARROWEST_SURVIVING_LIST`
- require help handoff to return to `HELP_ROUTE` source anchors, require live updates to preserve
  typed composer/picker/compare focus locks, and require secondary-window close to restore the
  serialized parent focus anchor on the owning primary scene
- forbid broad home or dashboard fallback whenever a narrower lawful target still exists

## RUN_SEMANTIC_ACCESSIBILITY_REGRESSION_PACK(...)
**Goal**: Prove that semantic anchors, accessibility identifiers, landmarks, headings, keyboard
paths, live announcements, reduced-motion behavior, and support-surface dismissal stay aligned to
the shared semantic contract across browser and native shells.
**Output**: `semantic_accessibility_regression_pack`.
**Rule**:
- build the pack only from route-visible shells and native scenes that already publish
  `semantic_accessibility_contract`
- copy the exact shell-specific `required_anchor_codes[]`, `semantic_focus_order[]`, and
  `announced_change_kinds[]` into each regression case instead of re-deriving local expectations
- require Playwright coverage for shipped browser surfaces and XCUITest coverage for native scenes
- require keyboard-only, screen-reader, and reduced-motion coverage on every case
- mirror browser automation through `browser_identifier_or_null` and native automation through
  `native_identifier_or_null`; both SHALL equal the serialized `semantic_anchor_ref`
- require `DOMINANT_QUESTION` to remain the first heading anchor, require landmarks and headings to
  mirror visible shell structure, and require support surfaces to remain keyboard reachable,
  keyboard dismissible, and non-modal
- require live-update cases to keep activity and badge deltas polite while failure or recovery
  notices remain assertive without stealing active input focus
- cover at minimum `REBASE`, `RECONNECT`, `RESPONSIVE_RESTACK`, `SUPPORT_REGION_COLLAPSE`,
  `LIVE_UPDATE`, and `SECONDARY_WINDOW_RETURN`
- require contextual and detached support flows with lawful return posture to keep
  `RETURN_PATH_CONTROL` addressable in keyboard and screen-reader traversal
