# Shared Operating Contract for `pc_0190` to `pc_0197`

## Governing sources and precedence

1. Coordination authority:
   - `PROMPT/AGENT.md`
   - `PROMPT/Checklist.md`
   - this tranche contract
   - cards `pc_0190` through `pc_0197`

2. Taxat source-of-truth documents you SHALL read before changing code:
   - `admin_governance_console_architecture.md`
   - `data_model.md`
   - `modules.md`
   - `actor_and_authority_model.md`
   - `authority_truth_and_internal_projection_separation_contract.md`
   - `policy_risk_and_blast_radius_modeling_contract.md`
   - `manifest_lineage_explorer_and_reuse_decision_tracer_contract.md`
   - `manifest_branch_selection_contract.md`
   - `audit_and_provenance.md`
   - `observability_and_audit_contract.md`
   - `retention_and_privacy.md`
   - `frontend_shell_and_interaction_law.md`
   - `cross_shell_design_token_and_interaction_layer_foundation_contract.md`
   - `dominant_question_and_single_action_contract.md`
   - `low_noise_experience_contract.md`
   - `semantic_selector_and_accessibility_contract.md`
   - `semantic_selector_and_accessibility_regression_pack_contract.md`
   - `focus_restoration_and_return_target_harness_contract.md`
   - `northbound_api_and_session_contract.md`
   - `contract_integrity_requirements.md`
   - `invariant_enforcement_and_fail_closed_contract.md`
   - `architecture_coherence_guardrails.md`
   - `PATCH_RESOLUTION_INDEX.md`
   - `AUDIT_FINDINGS.md`
   - `test_vectors.md`
   - `UIUX_DESIGN_SKILL.md`

3. Authoritative executable artifacts and validators:
   - `schemas/governance_policy_snapshot.schema.json`
   - `schemas/governance_access_simulation.schema.json`
   - `schemas/authority_link_inventory_item.schema.json`
   - `schemas/retention_governance_frame.schema.json`
   - `schemas/audit_investigation_frame.schema.json`
   - `schemas/governance_interaction_layer.schema.json`
   - `schemas/governance_mutation_hazard_contract.schema.json`
   - `schemas/governance_mutation_basis_contract.schema.json`
   - `schemas/manifest_lineage_trace.schema.json`
   - `schemas/tenant_governance_snapshot.schema.json`
   - `schemas/problem_envelope.schema.json`
   - `schemas/externalization_governance_contract.schema.json`
   - `scripts/validate_contracts.py`
   - `tools/forensic_contract_guard.py`
   Treat schema and validator behavior as more authoritative than prose examples when they conflict.

4. External implementation guidance may sharpen technique but never override Taxat semantics:
   - Playwright locator-first testing, auto-waiting, actionability checks, APIRequestContext coverage, and trace capture
   - Apple guidance for typography, readable layout width, accessibility, and subtle reduced-motion-safe transitions
   - Material guidance for hierarchy, structure, typography, color roles, and restrained motion

## Package and implementation placement rules

- `pc_0190` through `pc_0196` belong in `packages/backend-governance`.
  If that package does not exist, create it and emit `ASSUMPTION_BACKEND_GOVERNANCE_PACKAGE_CREATED`.

- `pc_0197` still belongs to the governance read-side boundary, but it MAY patch `packages/core-engine`, `packages/backend-orchestration`, or equivalent manifest-lineage persistence modules where necessary to read durable `ManifestLineageTrace` truth. The explorer query surface and any northbound read adapter still belong in `packages/backend-governance`.

- Reuse the earlier foundations instead of cloning semantics:
  - governance overview projection from `pc_0189`
  - governance principal / authority / approval groundwork from `pc_0086` through `pc_0093`
  - policy snapshot, config freeze, stale-view, and session guard foundations from `pc_0094` through `pc_0101`
  - manifest-branch, start-claim, replay-attestation, and collection lineage groundwork from `pc_0102` through `pc_0117`
  - provenance, proof, twin, authority, and settlement foundations from `pc_0126` through `pc_0141`
  - authority correction, workflow, projector, command-edge, and northbound read boundaries from `pc_0142` through `pc_0168`
  - low-noise shell, accessibility, portal/governance shell-law, and interaction projector foundations from `pc_0169` through `pc_0181`

- Organize code by boundary rather than by page name:
  - `packages/backend-governance/src/projectors`
  - `packages/backend-governance/src/services`
  - `packages/backend-governance/src/queries`
  - `packages/backend-governance/src/contracts`
  - `packages/backend-governance/src/tests`
  - docs under `docs/governance/`
  - optional browser-visible labs under `apps/admin-console-web/src/routes/debug/governance/`

- If shipped northbound routes already exist, patch them as thin adapters over these projector / query / service layers instead of re-encoding governance semantics inside controllers or frontend code.

- Respect tranche boundaries.
  This block MAY complete:
  - `GovernancePolicySnapshot`
  - `GovernanceAccessSimulation`
  - `AuthorityLinkInventoryItem`
  - `RetentionGovernanceFrame`
  - `AuditInvestigationFrame`
  - the shared `GovernanceInteractionLayer`
  - reusable governance mutation hazard / basis derivation
  - manifest-lineage explorer queries over persisted `ManifestLineageTrace`
  It MUST NOT silently absorb:
  - later mutation command handlers or commit executors beyond what this tranche needs to keep read-side semantics coherent
  - ad hoc alternate shells, alternate mobile-only governance routes, or renderer-owned diff / export / stale-view logic
  - heuristic lineage reconstruction from nearby manifests or timestamps
  If a current card needs a future abstraction, introduce the smallest schema-valid seam and mark it explicitly as replaceable.

## Browser-visible preview and verification surface contract

Most cards in this tranche are backend-first. Any preview, atlas, or lab you add MUST remain read-only and MUST mirror server-authored truth instead of becoming a second implementation.

### Shared visual language

- posture: minimalist premium, typography-led, quiet governance surfaces, explicit hierarchy, no dashboard wall
- typography stack: `Inter`, `SF Pro Text`, `Segoe UI`, sans-serif
- monospace stack: `ui-monospace`, `SFMono-Regular`, `Consolas`, monospace
- radius: `18px` to `20px`
- border: `rgba(17,24,39,0.08)`
- shadow ceiling: `0 10px 28px rgba(17,24,39,0.06)`
- motion: opacity / translate / height only, `140ms` to `180ms`; reduced motion mandatory
- no pie charts, no donut charts, no metric-wall cards, no decorative gradients

### Governance preview grammar

Use the same quiet control-plane palette across optional labs:
- background: `#F7F5F1`
- primary surface: `#FFFFFF`
- secondary surface: `#F1F3F0`
- primary ink: `#171717`
- secondary ink: `#667085`
- accent: `#0F766E`
- audit accent: `#1D4ED8`
- caution: `#B7791F`
- danger: `#C2410C`
- content width: `1440px` max
- outer padding: `28px` mobile / `36px` desktop

Shared layout rules:
- top context bar, filter rail, one primary canvas, and one subordinate audit or support sidecar at most
- one promoted support surface maximum, even on wide layouts
- context, selected object, focus anchor, active chips, and staged basket context must survive compaction, reconnect, and stale rebase
- charts or diagrams are allowed only when they clarify causality; prefer slim interval bands, ladders, rails, ribbons, or matrices

Preferred read-only lab forms by card:
- `pc_0190`: basis ribbon + section-nav stack + staged-change ledger
- `pc_0191`: ordered authority-chain ladder + blast-radius interval strip + approval-confidence rail
- `pc_0192`: guided handshake stepper + binding-health timeline + affected-operation rail
- `pc_0193`: retention policy matrix + legal-hold register + erasure swimlane + impact preview
- `pc_0194`: append-only audit tape + object-neighborhood ribbon + export-eligibility strip
- `pc_0195`: governance interaction atlas with compaction transitions, filter-chip echo, and support-surface precedence
- `pc_0196`: bounded blast-radius interval band + confidence / predictability rails + reason-code ledger
- `pc_0197`: lineage ribbon / branch lattice with selected path, rejected candidates, and nightly predecessor markers

## Non-negotiable interpretation rules

- `GovernancePolicySnapshot` is a control-plane stale-view anchor, not a generic settings JSON blob. It SHALL keep exact `policy_snapshot_hash`, `environment_bindings[]`, `session_security_posture`, `step_up_rules[]`, `approval_rules[]`, `masking_defaults[]`, `tenant_config_workspace`, `change_basket`, `approval_composer`, `blast_radius_panel`, and `config_history_timeline` aligned to one frozen basis.

- `TenantConfigWorkspace.surface_order` and `section_nav_order` are fixed governance semantics, not responsive suggestions. Inline policy help stays inside the active form context. Direct submission stays disabled until the mounted basket is atomic on one live `simulation_basis_hash`, one live `dependency_topology_hash`, and one reviewed `mutation_basis_contract.basis_contract_hash` that still matches the visible blast-radius panel.

- `GovernanceAccessSimulation` is the non-mutating preview contract. It SHALL preserve the exact nested `AuthorizationDecision`, the ordered authority-chain explanation, and—when the target is mutation-capable governance scope—the reusable `mutation_hazard` packet plus the reusable `mutation_basis_contract`. Low confidence or low predictability SHALL force preview-only posture.

- `AuthorityLinkInventoryItem` keeps authority-link lifecycle, delegation coverage, token/client binding, provider environment, and binding health distinct. Guided handshake state, preflight blockers, handshake history, and affected operations are first-class route semantics, not inferred UI glue.

- `RetentionGovernanceFrame` keeps policy matrix, legal holds, erasure queue, and impact preview distinct. Release preview for legal holds and destructive-flow review for erasure are mandatory; destructive execution remains `CHANGE_BASKET_ONLY`.

- `AuditInvestigationFrame` preserves append-only order, explicit `ordering_basis`, explicit `query_contract_code`, slice-bound export eligibility, and summary-first diff posture. Telemetry may enrich investigation but SHALL NOT replace audit truth or provenance topology.

- `GovernanceInteractionLayer` is the server-authored contract boundary for filter grammar, support-surface precedence, diff/basket continuity, export binding, focus restoration, semantic selector profile, compaction, preserved context, and durable receipt / typed failure feedback.

- `ManifestLineageTrace` is the persisted request-time explorer artifact for every branch-selection invocation. Operator or UI tooling SHALL render lineage from persisted traces and explicit selected-manifest refs, not from adjacent rows, timestamps, or heuristic sibling scans. `selected_branch_action` may lawfully differ from the selected manifest's persisted `continuation_basis`.

## Validator expectations to preserve

Treat the following validator expectations as non-negotiable when you patch fixtures, projector code, or route adapters:

- policy snapshot alignment:
  - `governance_policy_snapshot_fe31_shared_interaction_policy`
  - `governance_policy_snapshot_workspace_and_staged_change_posture`
  - `governance_policy_snapshot_interaction_layer_non_modal_compaction`
  - `governance_policy_snapshot_atomic_submission_and_blast_alignment`
  - `governance_policy_snapshot_approval_and_history_timeline_alignment`
  - `governance_policy_snapshot_atomic_basis_contract_hash_continuity`
  - `governance_policy_snapshot_approval_composer_basis_contract_alignment`
  - `governance_policy_snapshot_blast_radius_basis_contract_alignment`
- authority-link alignment:
  - `authority_link_inventory_item_surface_issue_and_handshake_alignment`
  - `authority_link_inventory_item_preflight_and_operation_alignment`
- retention alignment:
  - `retention_governance_frame_policy_matrix_order_and_warning_alignment`
  - `retention_governance_frame_legal_hold_selection_and_release_preview_alignment`
  - `retention_governance_frame_erasure_queue_and_destructive_review_posture`
- audit alignment:
  - `audit_investigation_frame_query_contract_alignment`
  - `audit_investigation_frame_workspace_selection_and_export_alignment`
  - `audit_investigation_frame_interaction_layer_compaction_alignment`
- manifest-lineage coverage:
  - `manifest_lineage_trace_new_manifest`
  - `manifest_lineage_trace_bundle_return`
  - `manifest_lineage_trace_sealed_reuse`
  - `manifest_lineage_trace_replay_child`
  - `manifest_lineage_trace_recovery_child`
  - `manifest_lineage_trace_amendment_new_request_child`
  - `manifest_lineage_trace_nightly_continuation_child`
  - `manifest_lineage_trace_requires_one_selected_candidate`
  - `manifest_lineage_trace_rejected_candidate_requires_disqualifier_reason`
  - `manifest_lineage_trace_nightly_predecessor_context_required`

## Common validation and test rules

- Validate every newly published projector, query response, or reusable contract packet against its canonical JSON schema before persistence or response emission.
- If you touch shipped northbound routes, add or patch Playwright `APIRequestContext` tests against those routes.
- If you add any browser-visible lab, test it with Playwright using semantic or user-facing locators only. No CSS-chain selectors, no coordinate clicks, no fixed sleeps.
- Capture traces or equivalent serialized request/response payloads on failure.
- Prefer deterministic fixtures and seeded artifacts over timing-dependent data.
- Re-run `python3 Algorithm/scripts/validate_contracts.py --self-test` and `python3 Algorithm/tools/forensic_contract_guard.py` after the tranche changes land.
