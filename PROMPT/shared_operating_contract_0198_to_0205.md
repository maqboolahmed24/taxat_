# Shared Operating Contract for `pc_0198` to `pc_0205`

## Governing sources and precedence

1. Coordination authority:
   - `PROMPT/AGENT.md`
   - `PROMPT/Checklist.md`
   - this tranche contract
   - cards `pc_0198` through `pc_0205`

2. Taxat source-of-truth documents you SHALL read before changing code:
   - `gate_decision_explainability_and_reason_code_compression_contract.md`
   - `exact_gate_logic_and_decision_tables.md`
   - `data_model.md`
   - `modules.md`
   - `state_machines.md`
   - `replay_and_reproducibility_contract.md`
   - `manifest_and_config_freeze_contract.md`
   - `recovery_tier_checkpoint_and_fail_forward_governance_contract.md`
   - `deployment_and_resilience_contract.md`
   - `verification_and_release_gates.md`
   - `cache_isolation_and_secure_reuse_contract.md`
   - `native_cache_hydration_purge_and_rebase_contract.md`
   - `cross_device_continuity_and_restoration_contract.md`
   - `shell_continuity_fuzzing_and_recovery_contract.md`
   - `frontend_shell_and_interaction_law.md`
   - `cross_shell_design_token_and_interaction_layer_foundation_contract.md`
   - `low_noise_experience_contract.md`
   - `dominant_question_and_single_action_contract.md`
   - `semantic_selector_and_accessibility_contract.md`
   - `semantic_selector_and_accessibility_regression_pack_contract.md`
   - `focus_restoration_and_return_target_harness_contract.md`
   - `customer_client_portal_experience_contract.md`
   - `macos_native_operator_workspace_blueprint.md`
   - `observability_and_audit_contract.md`
   - `audit_and_provenance.md`
   - `retention_and_privacy.md`
   - `retention_limited_explainability_and_audit_sufficiency_contract.md`
   - `northbound_api_and_session_contract.md`
   - `contract_integrity_requirements.md`
   - `invariant_enforcement_and_fail_closed_contract.md`
   - `architecture_coherence_guardrails.md`
   - `PATCH_RESOLUTION_INDEX.md`
   - `AUDIT_FINDINGS.md`
   - `test_vectors.md`
   - `UIUX_DESIGN_SKILL.md`

3. Authoritative executable artifacts and validators:
   - `schemas/decision_explainability_contract.schema.json`
   - `schemas/gate_decision_record.schema.json`
   - `schemas/trust_summary.schema.json`
   - `schemas/decision_bundle.schema.json`
   - `schemas/recovery_checkpoint.schema.json`
   - `schemas/restore_privacy_reconciliation_contract.schema.json`
   - `schemas/replay_attestation.schema.json`
   - `schemas/replay_basis_integrity_contract.schema.json`
   - `schemas/deterministic_golden_pack.schema.json`
   - `schemas/cache_isolation_contract.schema.json`
   - `schemas/native_cache_hydration_contract.schema.json`
   - `schemas/native_cache_hydration_automation_pack.schema.json`
   - `schemas/cross_device_continuity_contract.schema.json`
   - `schemas/shell_continuity_fuzz_harness.schema.json`
   - `schemas/focus_restore_return_target_harness.schema.json`
   - `schemas/native_operator_workspace_scene.schema.json`
   - `schemas/native_operator_secondary_window_scene.schema.json`
   - `schemas/experience_delta.schema.json`
   - `schemas/experience_stream_event.schema.json`
   - `scripts/validate_contracts.py`
   - `tools/forensic_contract_guard.py`
   Treat schema and validator behavior as more authoritative than prose examples when they conflict.

4. External implementation guidance may sharpen technique but never override Taxat semantics:
   - Playwright locator-first testing, built-in auto-waiting, actionability checks, APIRequestContext coverage, and trace capture
   - Apple guidance for typography, layout clarity, accessibility, restrained motion, and scene/state restoration discipline
   - Material guidance for hierarchy, typography, structure, color roles, and restrained motion

## Package and implementation placement rules

- `pc_0198` is a governance-facing read-side task but it MUST reuse the already-established compute truth.
  The reusable persisted explainability builder remains in `packages/backend-compute` if it already exists.
  The route/query/projector surfaces for governance, audit, or workflow consumers belong in `packages/backend-governance`.
  If one of those packages does not exist, create the minimum required package and emit an explicit assumption note.

- `pc_0199` through `pc_0205` belong to `packages/backend-recovery`.
  If that package does not exist, create it and emit `ASSUMPTION_BACKEND_RECOVERY_PACKAGE_CREATED`.

- `pc_0201` and `pc_0202` MAY patch `packages/backend-manifest` or `packages/backend-compute` where exact replay, deterministic hashing, and release-evidence helpers already live, but the orchestration, checkpoint, cache, hydration, and continuity control plane for this tranche still belongs in `packages/backend-recovery`.

- `pc_0203` through `pc_0205` MAY patch read-model or scene publishers such as workspace, portal, governance, and native scene packages so they emit the canonical cache/continuity packets, but the builders and harness generators SHALL remain centralized in `packages/backend-recovery`.

- Reuse the earlier foundations instead of cloning semantics:
  - `pc_0102` through `pc_0109` for manifest branching, replay attestation, and execution-basis truth
  - `pc_0126` and `pc_0127` for gate and terminal decision persistence
  - `pc_0158` through `pc_0165` for northbound read surfaces and recovery-safe ETag posture
  - `pc_0166` through `pc_0173` for typed failures, stale-view handling, and low-noise shell projection
  - `pc_0174` through `pc_0189` for shell-law, accessibility, portal-safe vocabulary, and governance shell posture
  - `pc_0190` through `pc_0197` for governance interaction-layer, mutation basis reuse, and manifest-lineage queries

- Organize code by boundary rather than by page name:
  - `packages/backend-governance/src/projectors`
  - `packages/backend-governance/src/queries`
  - `packages/backend-governance/src/tests`
  - `packages/backend-recovery/src/models`
  - `packages/backend-recovery/src/repositories`
  - `packages/backend-recovery/src/services`
  - `packages/backend-recovery/src/tests`
  - docs under `docs/governance/` and `docs/recovery/`
  - optional browser-visible labs under `apps/admin-console-web/src/routes/debug/governance/` or `apps/admin-console-web/src/routes/debug/recovery/`

- Respect tranche boundaries.
  This block MAY complete:
  - persisted decision explainability projection and reason compression reuse
  - recovery checkpoint lifecycle and reopen blockers
  - restore privacy reconciliation and post-restore limitation pass
  - exact replay orchestration against historical frozen basis
  - deterministic golden-pack generation
  - cache isolation and native hydration contracts
  - native hydration automation packs
  - cross-device continuity contracts and shell continuity fuzz harnesses
  It MUST NOT silently absorb:
  - nightly scheduler and autopilot work reserved for `pc_0206+`
  - unrelated command handlers or transport mutation logic
  - renderer-owned continuity heuristics, cache-key heuristics, or UI-local explainability reconstruction
  - non-canonical alternate mobile shells or detached admin-only semantics that bypass the shared shell law

## Browser-visible preview and verification surface contract

Most cards in this tranche are backend-first. Any browser-visible lab, atlas, or read-only diagnostic you add MUST mirror server-authored truth and MUST NOT become a second implementation.

### Shared visual language

- posture: minimalist premium, typography-led, quiet recovery/governance control surfaces, no dashboard wall
- typography stack: `Inter`, `SF Pro Text`, `Segoe UI`, sans-serif
- monospace stack: `ui-monospace`, `SFMono-Regular`, `Consolas`, monospace
- radius: `18px` to `20px`
- border: `rgba(17,24,39,0.08)`
- shadow ceiling: `0 10px 28px rgba(17,24,39,0.06)`
- motion: opacity / translate / height only, `140ms` to `180ms`; reduced motion mandatory
- no pie charts, no donut charts, no gauge walls, no decorative hero gradients

### Recovery / explainability palette

- background: `#F7F5F1`
- primary surface: `#FFFFFF`
- secondary surface: `#F1F3F0`
- primary ink: `#171717`
- secondary ink: `#667085`
- explainability accent: `#1D4ED8`
- continuity accent: `#0F766E`
- caution: `#B7791F`
- danger: `#C2410C`
- max content width: `1440px`
- outer padding: `28px` mobile / `36px` desktop

Shared layout rules:
- one context strip, one primary canvas, and one narrow supporting sidecar at most
- one promoted support surface maximum
- preserve selected object, active context, and focus anchor through compaction, reconnect, resize, and stale recovery whenever the same object remains lawful
- diagrams are allowed only when they clarify causality; prefer ladders, rails, ribbons, matrices, and ordered ledgers

Preferred optional lab forms by card:
- `pc_0198`: reason ladder + compressed prefix rail + semantic-qualifier ledger
- `pc_0199`: checkpoint lifecycle spine + reopen blocker ladder + restore-evidence ledger
- `pc_0200`: restore-privacy matrix + compensating re-erasure timeline + limitation status rail
- `pc_0201`: execution-basis ribbon + historical basis lineage rail + replay comparison strip
- `pc_0202`: deterministic golden-pack atlas with null-slot map, decimal ledger, and state-machine tuple table
- `pc_0203`: cache identity atlas with binding envelope card, purge plan ledger, and hydration legality strip
- `pc_0204`: native hydration automation matrix with scenario rows, harness badges, and purge inventory chips
- `pc_0205`: continuity lattice with perturbation matrix, preserved-vs-inline recovery rows, and parent-return anchors

## Non-negotiable interpretation rules

- `DecisionExplainabilityContract` is the persisted explainability truth for `GateDecisionRecord`, `TrustSummary`, and `DecisionBundle`. Read surfaces SHALL use persisted ordered reasons, dominant reason, compressed prefix, suppressed count, semantic qualifiers, and action projection state; they SHALL NOT recompute or re-rank reasons from metrics.

- `RecoveryCheckpoint` is the restoreability control object. `checkpoint_state = VERIFIED` is lawful only when restore evidence, privacy reconciliation, audit continuity, queue rebuild, authority rebuild, authority binding revalidation, and reopen readiness all satisfy the contract at once.

- `RestorePrivacyReconciliationContract` is the post-restore privacy legality boundary. Reconciled states, blocked states, compensating re-erasure lineage, limitation posture, and reopen access posture SHALL remain typed machine truth rather than ticket commentary.

- Replay and exact recovery SHALL load historical frozen basis, historical pre-seal gate context, and historical post-seal basis explicitly. Transport recovery metadata such as resume tokens, frame epochs, and shell stability tokens SHALL NOT be treated as replay legality or execution basis.

- `DeterministicGoldenPack` is the durable deterministic fixture boundary for release and replay evidence. A green deterministic/state-machine gate SHALL retain a reviewed golden-pack ref rather than collapsing the suite into a summary string.

- `CacheIsolationContract` freezes cache identity. `NativeCacheHydrationContract` freezes rendering/restoration legality. Exact identity match and compatibility are required before cached state may render or restore.

- `CrossDeviceContinuityContract` is the same-object continuity boundary for browser, narrow layouts, and native scenes. `ShellContinuityFuzzHarness` is the deterministic perturbation proof. Renderers SHALL not invent alternate shell families, action posture, or return targets during recovery.

## Validator expectations to preserve

Treat the following validator expectations as non-negotiable when you patch fixtures, builders, projector code, or route adapters:

- explainability alignment:
  - `decision_explainability_contract_prefix_and_qualifier_ok`
  - `decision_explainability_contract_prefix_alignment`
  - `decision_explainability_contract_qualifier_order`
- recovery and restore-privacy alignment:
  - `restore_privacy_reconciliation_contract_valid`
  - `restore_privacy_reconciliation_contract_final_limitation_failure`
  - `restore_privacy_reconciliation_contract_blocked_ready_reopen_drift`
  - `restore_privacy_reconciliation_contract_completed_missing_completion_timestamp`
  - `state_transition_contract_recovery_checkpoint_illegal_tuple`
  - `recovery_checkpoint_restore_evidence_and_privacy_posture`
- replay / deterministic evidence alignment:
  - `replay_attestation_basis_dimension_order`
  - `replay_attestation_observable_component_ref`
  - `replay_attestation_confidence_projection`
  - `replay_attestation_counterfactual_posture`
  - `deterministic_golden_pack_valid`
  - `deterministic_golden_pack_module_fixture_order_drift`
  - `deterministic_golden_pack_decimal_string_drift`
  - `deterministic_golden_pack_null_slot_coverage_drift`
  - `deterministic_golden_pack_cadence_jitter_drift`
  - `verification_suite_result_deterministic_golden_pack_missing`
  - `gate_admissibility_record_deterministic_golden_pack_missing`
  - `release_verification_manifest_deterministic_golden_pack_missing`
- cache / hydration / continuity alignment:
  - `cache_isolation_contract_customer_safe_visibility_binding`
  - `cache_isolation_contract_partition_ref_mismatch`
  - `cache_isolation_contract_secondary_preview_binding`
  - `cache_isolation_contract_delivery_binding_hash_drift`
  - `native_cache_hydration_automation_pack_full_matrix_ok`
  - `native_cache_hydration_automation_pack_purge_inventory_must_stay_full`
  - `cross_device_continuity_contract_notification_action_state_clear`
  - `cross_device_continuity_contract_visibility_only_basis_fields`
  - `cross_device_continuity_contract_secondary_window_native_rules`
  - `shell_continuity_fuzz_harness_valid`
  - `shell_continuity_fuzz_harness_missing_native_coverage`
  - `shell_continuity_fuzz_harness_route_drift_without_truth_change`
  - `shell_continuity_fuzz_harness_browser_native_perturbation_mix`
  - `shell_continuity_fuzz_harness_inline_recovery_reason_missing`
  - `shell_continuity_fuzz_harness_shrink_not_subset`
  - `shell_continuity_fuzz_harness_secondary_return_anchor_lost`

## Common validation and test rules

- Validate every newly published model, contract packet, projector output, query response, and harness artifact against its canonical JSON schema before persistence or response emission.
- If you touch shipped northbound routes, add or patch Playwright `APIRequestContext` tests against those routes.
- If you add any browser-visible lab, test it with Playwright using semantic or user-facing locators only. No CSS-chain selectors, no coordinate clicks, no fixed sleeps.
- For native-only automation packs or scene continuity proofs, use the native harness named by the algorithm, but keep any browser diagnostics and browser route tests under Playwright.
- Capture traces or equivalent serialized request/response payloads on failure.
- Prefer deterministic fixtures, seeded enumeration, and canonical sample artifacts over timing-dependent data.
- Re-run `python3 Algorithm/scripts/validate_contracts.py --self-test` and `python3 Algorithm/tools/forensic_contract_guard.py` after the tranche changes land.
