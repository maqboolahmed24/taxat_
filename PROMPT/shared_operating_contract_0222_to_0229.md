# Shared Operating Contract for tasks 0222–0229

## Scope

This tranche completes the remaining backend release-resilience spine for phase 04 and then opens the first frontend-shared scaffold for phase 05.

- `pc_0222` through `pc_0228` are release-evidence, compatibility-window, recovery-governance, query-surface, and CI-integrity tasks.
- `pc_0229` is the first browser-shared scaffold task and MUST establish shell-law-compliant route/runtime foundations instead of a generic SPA shell.

Use this contract before executing any individual card. The card-level prompt adds task-specific requirements; this file defines the shared boundaries that MUST stay invariant across the whole slice.

## Mandatory source-of-truth corpus

Read these first and treat them as the canonical semantic boundary:

- `release_candidate_identity_and_promotion_evidence_contract.md`
- `deployment_and_resilience_contract.md`
- `verification_and_release_gates.md`
- `recovery_tier_checkpoint_and_fail_forward_governance_contract.md`
- `data_model.md`
- `modules.md`
- `state_machines.md`
- `audit_and_provenance.md`
- `architecture_coherence_guardrails.md`
- `constraint_coverage_index.md`
- `contract_integrity_requirements.md`
- `README.md`

For `pc_0229`, also treat the full frontend corpus as authoritative:

- `frontend_shell_and_interaction_law.md`
- `cross_shell_design_token_and_interaction_layer_foundation_contract.md`
- `semantic_selector_and_accessibility_contract.md`
- `shell_continuity_fuzzing_and_recovery_contract.md`
- `focus_restoration_and_return_target_harness_contract.md`
- `low_noise_experience_contract.md`
- `customer_client_portal_experience_contract.md`
- `admin_governance_console_architecture.md`
- `UIUX_DESIGN_SKILL.md`

## Schema and validator inventory for this block

At minimum, preserve and actively validate against these artifacts:

- `schemas/release_candidate_identity_contract.schema.json`
- `schemas/schema_bundle_compatibility_gate_contract.schema.json`
- `schemas/release_verification_manifest_assembly_contract.schema.json`
- `schemas/release_verification_manifest.schema.json`
- `schemas/verification_suite_result.schema.json`
- `schemas/gate_admissibility_record.schema.json`
- `schemas/restore_drill_result.schema.json`
- `schemas/client_compatibility_matrix.schema.json`
- `schemas/recovery_governance_contract.schema.json`
- `schemas/recovery_checkpoint.schema.json`
- `schemas/constraint_traceability_register.schema.json`
- `schemas/interaction_layer_foundation_contract.schema.json`
- `schemas/route_stability_contract.schema.json`
- `schemas/semantic_accessibility_contract.schema.json`
- `schemas/semantic_accessibility_regression_pack.schema.json`
- `schemas/shell_state_taxonomy_contract.schema.json`
- `scripts/validate_contracts.py`
- `tools/forensic_contract_guard.py`

## Repo and package placement rules

Follow the previously established monorepo/package map. If a prior ADR or card fixed package names, obey that decision and emit an explicit assumption/override note in the card rather than silently renaming boundaries.

Default placement rules for this tranche:

- `pc_0222` through `pc_0227` live primarily in `packages/backend-release`.
- Release-query or read-only diagnostic routes MAY live in `apps/admin-console-web/src/routes/debug/release/`.
- Docs for release/resilience work MUST live under `docs/release/`.
- `pc_0228` MAY touch root CI/config files, `README.md`, `Algorithm/scripts/validate_contracts.py`, `Algorithm/tools/forensic_contract_guard.py`, `Algorithm/constraint_traceability_register.json`, and `Algorithm/constraint_coverage_index.md`.
- `pc_0229` lives primarily in:
  - `apps/operator-web`
  - `apps/client-portal-web`
  - one shared web shell/runtime package such as `packages/frontend-shell-core` or the ADR-approved equivalent
  - `packages/shared-ui`
  - `packages/playwright-kit`
  - `docs/frontend/`

If `packages/backend-release` does not exist, create it and emit `ASSUMPTION_BACKEND_RELEASE_PACKAGE_CREATED`.
If the shared frontend runtime package does not exist, create it and emit `ASSUMPTION_FRONTEND_SHELL_RUNTIME_PACKAGE_CREATED`.

## Tranche boundaries

This block MAY complete:

- the canonical compatibility-gate contract and deterministic release-manifest assembly basis
- persistence and admissibility logic for verification-suite evidence
- restore-drill capture and release-evidence binding
- generated client-compatibility matrices for browser and native supported windows
- recovery-tier / fail-forward governance and checkpoint reopen law
- internal query surfaces for candidate identity and promotion evidence
- CI enforcement around the forensic contract guard and live constraint register
- the shared browser workspace scaffold, route contract provider, shell registry, and Playwright-first frontend foundation

This block MUST NOT silently absorb:

- ad hoc promotion decisions reconstructed from CI dashboards, deploy logs, or operator summary rows
- schema safety claimed from `candidate_identity_hash` alone without a non-stale `compatibility_gate_hash`
- browser-visible frontend foundations that violate same-object same-shell, route-stability, or semantic-anchor law
- a mega-application shell that collapses operator, governance, and portal grammars into one undifferentiated route model
- product semantics that bypass the existing contract families to create “temporary” release or shell metadata

## Browser-visible contract for optional labs and for `pc_0229`

Any browser-visible lab, preview, or scaffold created in this tranche MUST remain a reflection of server-authored or contract-authored truth. It MUST NOT become a second implementation.

### Shared visual language

- posture: minimalist premium, typography-led, quiet control-plane or task-first surfaces; never a metric wall and never a generic AI dashboard
- typography stack: `Inter`, `SF Pro Text`, `Segoe UI`, sans-serif
- monospace stack: `ui-monospace`, `SFMono-Regular`, `Consolas`, monospace
- radius: `18px` to `20px`
- border: `rgba(17,24,39,0.08)`
- shadow ceiling: `0 10px 28px rgba(17,24,39,0.06)`
- motion: opacity / translate / height only, `140ms` to `180ms`; reduced-motion parity mandatory
- no pie charts, no donut charts, no gauge clusters, no decorative hero analytics

### Palette

- background: `#F7F5F1`
- primary surface: `#FFFFFF`
- secondary surface: `#F1F3F0`
- primary ink: `#171717`
- secondary ink: `#667085`
- release / continuity accent: `#0F766E`
- operator / diagnostic accent: `#1D4ED8`
- governance accent: `#6D28D9`
- caution: `#B7791F`
- danger: `#C2410C`
- max content width: `1440px`
- outer padding: `28px` mobile / `36px` desktop

### Shell-specific preview budgets for `pc_0229`

- `CALM_SHELL`: left rail `272–296px`, primary decision column `760–880px`, support inspector `360–400px`
- `CLIENT_PORTAL_SHELL`: content max width `1120px`, task column `680–760px`, promoted support stacks below primary under `1024px`
- `GOVERNANCE_DENSITY_SHELL`: nav `272–296px`, worklist/canvas `760px` minimum, auxiliary sidecar `320–400px`, compact mode redocks auxiliary surfaces without changing shell meaning

### Playwright rules

- use locator-first selectors and semantic roles only
- rely on built-in auto-waiting and actionability checks
- prefer user-facing locators over implementation selectors
- use `APIRequestContext` for route-contract and internal-query verification where feasible
- record traces on failure
- test reduced-motion behavior explicitly whenever browser-visible work is touched

## Non-negotiable interpretation rules

- `ReleaseCandidateIdentityContract` freezes the candidate tuple. `SchemaBundleCompatibilityGateContract` freezes the mutable reader-window / historical-manifest / replay-restore / native-client / rollback boundary. Candidate identity alone is never sufficient for schema-safety claims.

- `compatibility_gate_hash` MUST change whenever the reader-window contract, historical-manifest protection, replay/restore posture, migration chronology, native client window posture, or rollback boundary changes, even if the binary candidate did not.

- `ReleaseVerificationManifestAssemblyContract` is the deterministic assembly tape for release proof. It MUST preserve canonical gate order, exact `result_ref` and `admissibility_ref` pairs, companion canary/restore/client-matrix evidence refs, and decision posture.

- `VerificationSuiteResult` and `GateAdmissibilityRecord` are first-class persisted evidence objects, not CI summaries. They MUST retain suite-family-specific dimensions such as migration plan, supported client window, restore drill/checkpoint lineage, deterministic golden pack refs, and authority sandbox coverage contracts where applicable.

- Green supporting gates require their companion evidence refs. A green operator-client gate without a client matrix, a green performance gate without canary evidence, or a green restore gate without drill/checkpoint pairing is unlawful.

- `RecoveryGovernanceContract` is shared by `RecoveryCheckpoint` and `DeploymentRelease`. It freezes tier, RPO/RTO, checkpoint evidence policy, reopen gates, rollback boundary posture, and fail-forward law. Control-plane truth cannot serialize a weaker tier.

- Closed reader windows force `FAIL_FORWARD_ONLY`. Rollback posture cannot remain `ROLLBACK_ALLOWED` once the shared compatibility gate says the reader window has closed.

- `constraint_traceability_register.json` is the live machine-readable constraint register. Historical notes stay in forensic documents only. Register, index, downstream refs, validator, and forensic guard MUST move in the same change set.

- For browser foundations, same object, same shell is mandatory. Route continuity, shell family, semantic focus order, semantic anchors, support-surface budgets, and recovery grammar are server-authored/contract-authored truth rather than local renderer invention.

## Validator expectations to preserve

Treat these checks as non-negotiable whenever you patch models, builders, routes, repositories, or CI.

### Release / compatibility / manifest checks
- `schema_bundle_compatibility_gate_contract_hash_drift`
- `schema_bundle_compatibility_gate_contract_migration_chronology_drift`
- `schema_bundle_compatibility_gate_contract_supported_client_window_drift`
- `verification_suite_result_candidate_contract_drift`
- `verification_suite_result_order_and_suite_identity_posture`
- `verification_suite_result_order_and_migration_plan`
- `verification_suite_result_restore_lineage_pairing`
- `verification_suite_result_deterministic_golden_pack_missing`
- `verification_suite_result_authority_sandbox_coverage_missing`
- `gate_admissibility_record_authority_sandbox_coverage_missing`
- `client_compatibility_matrix_candidate_contract_drift`
- `client_compatibility_matrix_green_native_gate_drift`
- `restore_drill_result_identity_and_failure_basis_posture`
- `restore_drill_result_passed_requires_final_ready_privacy_contract`
- `release_verification_manifest_assembly_contract_deterministic_companion_drift`
- `release_verification_manifest_assembly_contract_gate_order_drift`
- `release_verification_manifest_assembly_contract_operator_companion_drift`
- `release_verification_manifest_assembly_contract_blocked_all_green`
- `release_verification_manifest_evidence_gate_and_timeline_drift`
- `release_verification_manifest_assembly_mirror_drift`
- `release_verification_manifest_authority_sandbox_coverage_hash_missing`
- `release_verification_manifest_gate_candidate_hash_drift`

### Recovery / rollout checks
- `recovery_governance_contract_control_plane_tier_drift`
- `deployment_release_strategy_state_and_override_posture`
- `state_transition_contract_recovery_checkpoint_illegal_tuple`
- `state_transition_contract_deployment_release_illegal_tuple`
- `state_transition_contract_release_verification_illegal_tuple`

### Constraint-register / forensic checks
- live register must stay ordered by `constraint_id`
- enforcement refs must include both `scripts/validate_contracts.py` and `tools/forensic_contract_guard.py`
- required terms for every traced path must remain present
- live constraints must not drift into stale-defect phrasing
- `constraint_coverage_index.md` must mirror the machine register for active rows

### Frontend scaffold checks
- `validate_route_stability_contract`
- `validate_shell_state_taxonomy_contract`
- `semantic_accessibility_contract_shell_profile_alignment`
- `semantic_accessibility_contract_low_noise_exact_anchor_set`
- `semantic_accessibility_contract_governance_focus_order`
- `semantic_accessibility_regression_pack_missing_native_secondary_surface`
- `semantic_accessibility_regression_pack_browser_identifier_drift`
- `semantic_accessibility_regression_pack_polite_activity_announcement_drift`
- `semantic_accessibility_regression_pack_secondary_return_path_lost`
- `semantic_accessibility_regression_pack_reduced_motion_semantic_drift`

## Reuse expectations from earlier cards

Do not re-solve already-defined foundations.

- Reuse `pc_0059` through `pc_0061` for monorepo, package, and contract import topology.
- Reuse `pc_0198` through `pc_0205` for replay, golden-pack, cache-isolation, native hydration, and continuity law.
- Reuse `pc_0214` through `pc_0221` for observability, failure-lineage, build artifact identity, deployment release, and schema reader-window governance.
- Reuse `pc_0190` through `pc_0197` for governance query-surface, blast/basis, and manifest-lineage explorer posture where internal read models are helpful.

## Validation and completion discipline

For every card in this tranche:

1. validate against the authoritative JSON schema(s) before persistence or publication
2. patch fixtures/builders/examples when you change canonical payload shape
3. rerun `python3 Algorithm/scripts/validate_contracts.py --self-test`
4. rerun `python3 Algorithm/tools/forensic_contract_guard.py`
5. if you add browser-visible work, run the relevant Playwright tests with trace capture on failure

The task is not done until the implementation is deterministic, replay-safe, and machine-checkable.
