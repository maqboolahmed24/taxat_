# Taxat Core Engine

This repository contains the core Taxat algorithm plus supporting modules, invariants, and data-structure definitions.

## What you get
- **Core Engine Algorithm**: `core_engine.md` (single, end-to-end structure)
- **Module Contracts**: `modules.md` (each functional module as a named, reusable procedure)
- **Low-Noise Experience Contract**: `low_noise_experience_contract.md` (production simplification profile, cognitive load controls, and edge-case UX handling)
- **Customer/Client Portal Experience Contract**: `customer_client_portal_experience_contract.md` (client-facing IA, onboarding, document requests, approvals, and simplified status architecture)
- **UI/UX Design Skill**: `UIUX_DESIGN_SKILL.md` (experience standards, component semantics, and validation guidance for decision, governance, and client surfaces)
- **Admin/Governance Console Architecture**: `admin_governance_console_architecture.md` (high-control control-plane IA for tenant settings, access policy, authority links, retention, and audit workflows)
- **Northbound API & Session Contract**: `northbound_api_and_session_contract.md` (product-facing command/read transport, stale-view protection, and reconnect-safe streaming)
- **Native macOS Workspace Blueprint**: `macos_native_operator_workspace_blueprint.md` (Xcode workspace topology, SwiftUI/AppKit split, native session/auth, local cache, and phased migration from browser workspace to signed desktop app)
- **Runtime Security Hardening**: `security_and_runtime_hardening_contract.md` (threat model, session/auth controls, secret/key handling, network hardening, and supply-chain gates)
- **Deployment & Resilience Contract**: `deployment_and_resilience_contract.md` (runtime topology, release promotion, schema migration, backup/restore, and DR posture)
- **Verification & Release Gates**: `verification_and_release_gates.md` (test matrix, sandbox/security/load/restore suites, and promotion criteria)
- **Data Model**: `data_model.md` (canonical entities + artifact types)
- **Invariants & Gates**: `invariants_and_gates.md` (determinism, idempotency, separation-of-modes, etc.)
- **Audit Overview**: `audit_and_provenance.md` (short overview; see provenance and observability contracts)
- **Retention & Privacy**: `retention_and_privacy.md` (retention tagging + erasure workflow)
- **Test Vectors**: `test_vectors.md` (executable-ish scenarios for QA/UAT)
- **Glossary**: `glossary.md`
- **Boundary Specification**: `invention_and_system_boundary.md` (exact invention scope + system boundary)
- **Actor Model**: `actor_and_authority_model.md` (principals, delegation, authority layers, and policy)
- **Evidence Taxonomy**: `canonical_source_and_evidence_taxonomy.md` (source classes, canonicalization, and precedence)
- **Manifest Contract**: `manifest_and_config_freeze_contract.md` (sealed execution envelope, config freeze, and replay rules)
- **State Machines**: `state_machines.md` (formal transitions for manifests, facts, filing, authority, and amendment flows)
- **Gate Logic**: `exact_gate_logic_and_decision_tables.md` (ordered gates, decision tables, reason-code families)
- **Trust Formulas**: `compute_parity_and_trust_formulas.md` (compute, parity, graph quality, and trust scoring)
- **Authority Protocol**: `authority_interaction_protocol.md` (request envelopes, authority binding, idempotency, and reconciliation)
- **Drift Semantics**: `amendment_and_drift_semantics.md` (baseline hierarchy, drift classes, and amendment eligibility)
- **Provenance Semantics**: `provenance_graph_semantics.md` (graph node/edge/path rules, critical paths, and enquiry packs)
- **Retention/Error Overview**: `retention_error_and_observability_contract.md` (short overview; see detailed retention, error, and observability contracts)
- **Section 13 - Error Model**: `error_model_and_remediation_model.md` (typed failures, remediation tasks, and compensation rules)
- **Section 14 - Observability Contract**: `observability_and_audit_contract.md` (audit event model, traces/metrics/logs, and correlation rules)
- **Section 15 - Embodiments & Examples**: `embodiments_and_examples.md` (worked embodiments, edge cases, and implementation-grade examples)
- JSON schemas + sample payloads in `schemas/`, including `run_manifest`, `decision_bundle`, `trust_summary`, `config_freeze`, the Live Observatory read-side contract `experience_delta`, the client-facing workspace projection `client_portal_workspace`, and first-class intake artifact contracts (`source_*`, `evidence_*`, `candidate_*`, `conflict_*`, `canonical_*`, `snapshot`, `input_freeze`, `schema_bundle`)

## Notes (important)
- The docs are written for clear implementation by engineering and QA teams.
