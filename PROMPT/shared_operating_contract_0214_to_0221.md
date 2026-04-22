# Shared Operating Contract for `pc_0214` to `pc_0221`

## Governing sources and precedence

1. Coordination authority:
   - `PROMPT/AGENT.md`
   - `PROMPT/Checklist.md`
   - this tranche contract
   - cards `pc_0214` through `pc_0221`

2. Taxat source-of-truth documents you SHALL read before changing code:
   - `observability_and_audit_contract.md`
   - `retention_error_and_observability_contract.md`
   - `error_model_and_remediation_model.md`
   - `failure_lifecycle_dashboard_and_lineage_contract.md`
   - `nightly_autopilot_contract.md`
   - `deployment_and_resilience_contract.md`
   - `release_candidate_identity_and_promotion_evidence_contract.md`
   - `verification_and_release_gates.md`
   - `data_model.md`
   - `modules.md`
   - `northbound_api_and_session_contract.md`
   - `admin_governance_console_architecture.md`
   - `retention_and_privacy.md`
   - `audit_and_provenance.md`
   - `contract_integrity_requirements.md`
   - `invariant_enforcement_and_fail_closed_contract.md`
   - `architecture_coherence_guardrails.md`
   - `PATCH_RESOLUTION_INDEX.md`
   - `AUDIT_FINDINGS.md`
   - `test_vectors.md`
   - `UIUX_DESIGN_SKILL.md`

3. Authoritative executable artifacts and validators:
   - `schemas/audit_event.schema.json`
   - `schemas/trace_span.schema.json`
   - `schemas/metric_event.schema.json`
   - `schemas/log_record.schema.json`
   - `schemas/audit_investigation_frame.schema.json`
   - `schemas/failure_lifecycle_dashboard.schema.json`
   - `schemas/operator_morning_digest.schema.json`
   - `schemas/build_artifact.schema.json`
   - `schemas/release_candidate_identity_contract.schema.json`
   - `schemas/canary_health_summary.schema.json`
   - `schemas/deployment_release.schema.json`
   - `schemas/schema_bundle_compatibility_gate_contract.schema.json`
   - `schemas/schema_migration_ledger.schema.json`
   - `schemas/schema_reader_window_contract.schema.json`
   - `schemas/state_transition_contract.schema.json`
   - `schemas/backfill_execution_contract.schema.json`
   - `schemas/release_verification_manifest.schema.json`
   - `schemas/release_verification_manifest_assembly_contract.schema.json`
   - `scripts/validate_contracts.py`
   - `tools/forensic_contract_guard.py`
   Treat schema and validator behavior as more authoritative than prose examples when they conflict.

## Package and implementation placement rules

- `pc_0214`, `pc_0215`, and `pc_0218` belong primarily in `packages/backend-observability`.
  If that package does not exist, create it and emit `ASSUMPTION_BACKEND_OBSERVABILITY_PACKAGE_CREATED`.

- `pc_0216` and `pc_0217` belong primarily in `packages/backend-failure` but MAY patch `packages/backend-observability` where shared correlation, audit, or query code already lives.
  If that package does not exist, create it and emit `ASSUMPTION_BACKEND_FAILURE_PACKAGE_CREATED`.

- `pc_0219` through `pc_0221` belong primarily in `packages/backend-release`.
  If that package does not exist, create it and emit `ASSUMPTION_BACKEND_RELEASE_PACKAGE_CREATED`.

- Optional read-only diagnostics MAY live under:
  - `apps/admin-console-web/src/routes/debug/observability/`
  - `apps/admin-console-web/src/routes/debug/failure/`
  - `apps/admin-console-web/src/routes/debug/release/`

- Docs MUST live under:
  - `docs/observability/`
  - `docs/failure/`
  - `docs/release/`

- Reuse earlier tranche outputs instead of cloning semantics:
  - `pc_0134` through `pc_0141` for authority request identity, ingress normalization, and exact request correlation
  - `pc_0150` through `pc_0165` for projector/read-model truth, command receipts, and northbound read boundaries
  - `pc_0166` through `pc_0189` for typed failure envelopes, low-noise shells, portal/governance frames, and externalization rules
  - `pc_0190` through `pc_0197` for governance investigation frames, manifest lineage, and blast/basis continuity
  - `pc_0198` through `pc_0205` for explainability, checkpoints, replay, deterministic evidence, cache isolation, and continuity
  - `pc_0206` through `pc_0213` for nightly batch truth, operator digest inputs, retention/privacy, runtime hardening, and authority ingress proof

## Tranche boundaries

This block MAY complete:
- canonical observability signal models and shared correlation context
- deterministic observability query envelopes for audit trails, run timelines, batch timelines, and privacy ledgers
- retention/privacy error binding into typed failure objects and correlated telemetry/audit evidence
- authoritative failure-lifecycle dashboard projection and query surfaces
- operator-morning-digest read/query surfaces plus audit-hotspot analytics feeds
- build-artifact persistence, candidate-identity persistence, and release-evidence tuple freezing
- deployment release state-machine persistence, canary-health summaries, and rollout / rollback / fail-forward posture
- schema-migration ledger persistence and grouped reader-window blocking rules

This block MUST NOT silently absorb:
- live authority transport or callback mutation work outside already-defined authority boundaries
- UI-local inference of lifecycle, audit order, digest grouping, release state, or migration legality
- CI-vendor-specific deployment scripting that is not anchored to the canonical release artifacts
- new product semantics that bypass `ReleaseCandidateIdentityContract`, `SchemaBundleCompatibilityGateContract`, `SchemaReaderWindowContract`, or `StateTransitionContract`
- log-only reconstruction of operational or legal truth

## Browser-visible preview and verification surface contract

Most cards in this tranche are backend-first. Any browser-visible lab, atlas, or read-only diagnostic you add MUST mirror server-authored truth and MUST NOT become a second implementation.

### Shared visual language

- posture: minimalist premium, typography-led, quiet control-plane surfaces, never a KPI wall
- typography stack: `Inter`, `SF Pro Text`, `Segoe UI`, sans-serif
- monospace stack: `ui-monospace`, `SFMono-Regular`, `Consolas`, monospace
- radius: `18px` to `20px`
- border: `rgba(17,24,39,0.08)`
- shadow ceiling: `0 10px 28px rgba(17,24,39,0.06)`
- motion: opacity / translate / height only, `140ms` to `180ms`; reduced motion mandatory
- no pie charts, no donut charts, no gauge walls, no decorative “AI dashboard” aesthetics

### Palette

- background: `#F7F5F1`
- primary surface: `#FFFFFF`
- secondary surface: `#F1F3F0`
- primary ink: `#171717`
- secondary ink: `#667085`
- observability accent: `#1D4ED8`
- continuity / release accent: `#0F766E`
- caution: `#B7791F`
- danger: `#C2410C`
- max content width: `1440px`
- outer padding: `28px` mobile / `36px` desktop

Shared layout rules:
- one context ribbon, one primary canvas, and one narrow supporting sidecar at most
- one promoted support surface maximum
- preserve selected object, active filters, focus anchor, and route context through compaction, reconnect, resize, and stale rebase whenever the same object remains lawful
- diagrams are allowed only when they clarify causality or lineage; prefer ladders, tapes, rails, ribbons, matrices, and ordered ledgers

Preferred optional diagnostic forms by card:
- `pc_0214`: signal-correlation atlas with trace/audit/log/metric rails and a correlation-key sidecar
- `pc_0215`: investigation tape with run/batch/privacy query modes, neighborhood rail, and export posture sidecar
- `pc_0216`: retention-error linkage matrix with typed companion-object ladder and minimized signal disclosure
- `pc_0217`: failure-lineage spine with owner/action strip, compensation posture, and closure-evidence sidecar
- `pc_0218`: operator-morning ribbon, queue partition lanes, and audit-hotspot tape
- `pc_0219`: candidate tuple atlas with build-provenance ladder and artifact-binding chips
- `pc_0220`: rollout-state ladder with canary budget rails and rollback/fail-forward boundary strip
- `pc_0221`: reader-window matrix with protected historical bundles, migration phase rail, and destructive-change blocker strip

Playwright rules for any lab or route work:
- use locator-first selectors and semantic roles only
- rely on built-in auto-waiting and actionability checks
- use `APIRequestContext` for route-level verification where feasible
- record trace artifacts on failures
- keep reduced-motion behavior first-class in tests

## Non-negotiable interpretation rules

- `AuditEvent` is append-only compliance evidence. `TraceSpan`, `MetricEvent`, and `LogRecord` are operational telemetry. They correlate through shared keys but SHALL NOT collapse into one artifact family.

- All observability signals SHALL use one canonical correlation-context builder. Repeated identity fields on a parent artifact and its nested `correlation_context{...}` SHALL mirror exactly.

- `AuditInvestigationFrame` or an equivalent backend-owned query envelope is the durable read contract for run timelines, batch timelines, privacy ledgers, filing evidence ledgers, and audit trails. Order MUST be frozen by explicit `ordering_basis`, not inferred at render time.

- `FailureLifecycleDashboard` is a persisted projection from typed lifecycle objects, workflow refs, audit refs, and provenance refs only. Logs, operator notes, or UI-local joins SHALL NOT determine current state or next legal action.

- `OperatorMorningDigest` is derived only from persisted nightly batch, manifest, workflow, authority, drift, late-data, and error truth. It SHALL NOT use ephemeral queue snapshots or logs as proof of publication or workload partitioning.

- `ReleaseCandidateIdentityContract` freezes the promoted candidate tuple. `SchemaBundleCompatibilityGateContract` freezes the reader-window and compatibility boundary that candidate identity alone does not cover. Both MUST travel together where schema safety is claimed.

- `DeploymentRelease` is the rollout / rollback / fail-forward state machine. It MUST embed `candidate_identity_contract{...}`, `schema_reader_window_contract{...}`, `schema_bundle_compatibility_gate_contract{...}`, and `state_transition_contract{...}`. Reader-window closure SHALL block rollback posture when the contract says rollback is no longer safe.

- `SchemaReaderWindowContract` and `SchemaMigrationLedger` are grouped compatibility and chronology truth. Destructive change SHALL stay blocked until the window is lawfully closed, protected historical bundles SHALL remain a subset of supported readers, and backfill posture SHALL stay explicit and idempotent.

- `BuildArtifact.distribution_targets[]` and every candidate-bound identity array SHALL remain canonicalized, sorted, and unique before hashing or persistence.

## Validator expectations to preserve

Treat the following validator expectations as non-negotiable when patching builders, repositories, projectors, routes, or fixtures:

### Observability signal alignment
- `validate_observability_correlation_context`
- `audit_event_identity_and_correlation_mirror`
- `audit_event_post_expiry_requires_reason_and_lineage_minimum`
- `audit_event_nightly_selection_disposition_alignment`
- `audit_event_remediation_requires_task_correlation`
- `audit_event_compensation_requires_compensation_correlation`
- `trace_span_root_context_and_chronology`
- `trace_span_manifest_lineage_trace_ref_required`
- `trace_span_manifest_start_claim_posture`
- `trace_span_config_resolution_reuse_collision`
- `metric_event_nightly_selection_correlation`
- `log_record_context_mirror_and_replay_posture`

### Failure and retention / privacy alignment
- `error_record_retention_family_linkage`
- `error_record_owner_and_next_action_continuity`
- `remediation_task_retention_hold_linkage_and_chronology`
- `compensation_record_preserve_and_limit_linkage`
- `failure_investigation_retention_privacy_linkage`
- `accepted_risk_approval_retention_linkage`
- `failure_lifecycle_dashboard_root_to_current_lineage_chain`
- `failure_lifecycle_dashboard_next_action_binding`
- `failure_lifecycle_dashboard_accepted_risk_owner_alignment`

### Query, digest, and hotspot alignment
- `validate_audit_investigation_frame`
- `audit_investigation_frame_query_contract_alignment`
- `audit_investigation_frame_workspace_selection_and_export_alignment`
- `audit_investigation_frame_interaction_layer_compaction_alignment`
- `operator_morning_digest_workflow_publication_and_summary_alignment`
- `operator_morning_digest_publication_qa_requires_settled_publication`
- `operator_morning_digest_publication_qa_queue_partition_hash_mirror`
- `operator_morning_digest_recovery_supersession_lineage`
- `tenant_governance_snapshot_attention_queue_alignment`
- `tenant_governance_snapshot_widget_ledger_alignment`

### Release and migration alignment
- `build_artifact_distribution_target_order`
- `build_artifact_desktop_evidence_posture`
- `release_candidate_identity_contract_provider_order_drift`
- `release_candidate_identity_contract_hash_drift`
- `schema_bundle_compatibility_gate_contract_valid`
- `schema_bundle_compatibility_gate_contract_migration_chronology_drift`
- `canary_health_summary_reverse_budget_posture`
- `deployment_release_strategy_state_and_override_posture`
- `deployment_release_closed_window_blocks_rollback`
- `deployment_release_failed_forward_requires_owner_and_compensating_release`
- `schema_migration_ledger_phase_and_chronology_posture`
- `schema_migration_ledger_reader_window_and_backfill_posture`
- `schema_reader_window_contract_writer_not_supported`
- `schema_reader_window_contract_protected_not_subset`
- `backfill_execution_contract_required_without_affected_artifacts`

## External implementation guidance

External guidance may sharpen technique but MUST NOT override Taxat semantics. In this tranche it is relevant for:
- Playwright locator-first testing, auto-waiting, actionability checks, API request testing, and trace capture
- OpenTelemetry signal and context-propagation discipline for traces, metrics, and logs
- build-provenance and artifact-attestation patterns for release evidence
- typography, accessibility, hierarchy, color-role, and restrained-motion guidance for any optional control-plane labs
