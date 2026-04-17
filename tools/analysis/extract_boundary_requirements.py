#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
import re
from collections import Counter, defaultdict
from dataclasses import dataclass, fields
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[2]
DATA_ANALYSIS_DIR = ROOT / "data" / "analysis"
DOCS_ANALYSIS_DIR = ROOT / "docs" / "analysis"

SYSTEM_BOUNDARY_JSONL_PATH = DATA_ANALYSIS_DIR / "system_boundary_requirements.jsonl"
BOUNDARY_CAPABILITY_MATRIX_CSV_PATH = DATA_ANALYSIS_DIR / "boundary_capability_matrix.csv"
OUT_OF_SCOPE_REGISTER_PATH = DATA_ANALYSIS_DIR / "out_of_scope_but_adjacent_functions.json"
REQUIREMENTS_DOC_PATH = DOCS_ANALYSIS_DIR / "05_invention_and_system_boundary_requirements.md"
MATRIX_DOC_PATH = DOCS_ANALYSIS_DIR / "05_boundary_capability_matrix.md"
CONTEXT_DIAGRAM_PATH = DOCS_ANALYSIS_DIR / "05_controlled_edge_and_external_actor_context.mmd"

BOUNDARY_PATH = "Algorithm/invention_and_system_boundary.md"
CORE_ENGINE_PATH = "Algorithm/core_engine.md"
SOURCE_TAXONOMY_PATH = "Algorithm/canonical_source_and_evidence_taxonomy.md"
AUTHORITY_PROTOCOL_PATH = "Algorithm/authority_interaction_protocol.md"
NORTHBOUND_PATH = "Algorithm/northbound_api_and_session_contract.md"
SECURITY_PATH = "Algorithm/security_and_runtime_hardening_contract.md"
DEPLOYMENT_PATH = "Algorithm/deployment_and_resilience_contract.md"
RETENTION_PATH = "Algorithm/retention_and_privacy.md"
REPLAY_PATH = "Algorithm/replay_and_reproducibility_contract.md"
ACTOR_MODEL_PATH = "Algorithm/actor_and_authority_model.md"
DATA_MODEL_PATH = "Algorithm/data_model.md"

ZONE_ORDER = [
    "inside_core_engine",
    "controlled_edge",
    "broader_product_outside_core",
    "external_authority_or_actor",
]
VALID_ZONES = set(ZONE_ORDER)
EXPLICIT_BOUNDARY_RULE_FAMILIES = {
    "identity_issuance_outside_engine",
    "canonicalization_not_raw_source_truth",
    "filing_intent_and_packet_not_authority_acceptance",
    "boundary_ingress_requires_auth_correlation_normalization",
    "parity_and_trust_not_authority_calculation",
    "amendment_recommendation_not_unrestricted_amendment_right",
    "lineage_safe_replay_recovery_continuation",
    "exact_scope_posture_not_client_flattening",
    "guide_not_absorb_hmrc_online_services_only",
    "explainability_for_engine_created_states",
    "compliance_vs_analysis_segregation",
}
ZONE_DEFAULTS = {
    "inside_core_engine": {
        "lawful": (
            "The engine owns this semantic rule and its durable state transitions; adjacent layers "
            "may invoke or deliver it but must not reinterpret it."
        ),
        "security": (
            "Fail closed on scope, mode, policy, and authority-binding drift; preserve immutable "
            "manifest lineage and least-privilege evidence access."
        ),
        "observability": (
            "Emit phase-bounded audit events, reason codes, hashes, and artifact refs sufficient to "
            "replay and defend the resulting posture."
        ),
        "degraded": (
            "Downgrade to blocked, review, or analysis-only posture with typed reasons rather than "
            "silently proceeding."
        ),
    },
    "controlled_edge": {
        "lawful": (
            "The engine may instruct or consume this edge capability through typed contracts, but "
            "the edge must not promote payloads to canonical truth or mutate legal state on its own."
        ),
        "security": (
            "Bind edge execution to explicit client, scope, token, and egress controls; keep secret "
            "custody and transport dedupe outside disposable projections."
        ),
        "observability": (
            "Persist transport lineage, dedupe keys, quarantine state, and receipt evidence before "
            "engine adoption."
        ),
        "degraded": (
            "Quarantine, bounded-retry, or surface unavailable-edge posture; do not synthesize engine "
            "truth from transport success alone."
        ),
    },
    "broader_product_outside_core": {
        "lawful": (
            "The broader product may render, secure, route, or transport engine-authored artifacts, "
            "but it must not infer or mutate core legal posture locally."
        ),
        "security": (
            "Enforce session binding, cache partitioning, least privilege, and secret isolation so "
            "delivery layers cannot widen scope or leak protected data."
        ),
        "observability": (
            "Capture delivery/runtime evidence separately from engine decision evidence and keep "
            "projection rebuild paths independent from command-side truth."
        ),
        "degraded": (
            "Rebase, require re-authentication, or fall back to read-only recovery; do not rewrite "
            "engine truth to preserve UX continuity."
        ),
    },
    "external_authority_or_actor": {
        "lawful": (
            "The engine may guide, request, compare, record, or react to this function, but it "
            "cannot absorb, impersonate, or overwrite the external actor's authority."
        ),
        "security": (
            "Treat external state as untrusted until authenticated and correlated; never derive "
            "identity issuance or legal truth from local convenience."
        ),
        "observability": (
            "Record handoff, acknowledgement, comparison, and provenance evidence so external truth "
            "and internal intent remain distinguishable."
        ),
        "degraded": (
            "Remain pending, blocked, or advisory-only until external resolution exists; never assume "
            "success from silence or local intent."
        ),
    },
}

CAP_RUN_INITIATION = "Run initiation and authority-to-act evaluation"
CAP_MANIFEST_STRATEGY = "Manifest reuse, replay, recovery, continuation, and branching decisions"
CAP_CONFIG_FREEZE = "Config freeze and immutable execution-envelope binding"
CAP_INTAKE_DECISIONING = "Engine-controlled evidence intake decisioning"
CAP_CANONICALIZATION = "Canonicalization from raw source material into Snapshot"
CAP_VALIDATION_QUALITY = "Explicit validation quality, completeness, and uncertainty measurement"
CAP_OUTCOME_COMPUTE = "Outcome computation on the frozen canonical snapshot"
CAP_ANALYSIS_SEGREGATION = "Analysis-only forecast and counterfactual segregation"
CAP_PARITY = "Parity comparison against authority values and prior submissions"
CAP_TRUST = "Trust synthesis, gate evaluation, and bounded override handling"
CAP_PROVENANCE = "Evidence-linked provenance graph and proof binding"
CAP_TWIN = "TwinView and cross-source delta formation"
CAP_WORKFLOW = "Workflow planning from trust, parity, risk, data quality, and drift"
CAP_FILING_PACKET = "Filing packet formation and basis declaration"
CAP_SUBMISSION_INTENT = "Submission intent, request identity, and SubmissionRecord persistence"
CAP_INGRESS_NORMALIZATION = "Authenticated authority ingress normalization and acknowledgement-state interpretation"
CAP_READ_SIDE_POSTURE = "Semantic read-side legal posture projection"
CAP_DRIFT = "Drift classification and amendment recommendation"
CAP_RETENTION = "Retention, expiry, erasure, and limitation propagation governance"
CAP_LINEAGE = "Lineage-safe replay, recovery, continuation, and supersession governance"
CAP_EXPLAINABILITY = "Evidence-linked explainability for engine-created states"
CAP_MODE_BOUNDARY = "Compliance-vs-analysis execution boundary enforcement"

CAP_AUTH_GATEWAY = "Controlled authority gateway transport and callback channel"
CAP_CONNECTOR_RUNTIME = "Connector worker execution and retry orchestration"
CAP_OCR_RUNTIME = "OCR and document-extraction runtime"
CAP_INGRESS_CHECKPOINT = "Transactional ingress checkpoint for callbacks, polls, and imported notices"
CAP_FETCH_TRANSPORT = "Scoped external-data fetch transport"

CAP_UI_RENDERING = "User-interface rendering, dashboards, and front-end layout"
CAP_CONSOLES = "Staff console, client portal, and admin-console surface embodiment"
CAP_NORTHBOUND = "Northbound API gateway, session management, and experience-stream transport"
CAP_ROUTING = "Platform routing, scene restoration, and window choreography"
CAP_SESSION_HARDENING = "Identity, session, step-up, CSRF, and device-binding runtime controls"
CAP_SECRET_CUSTODY = "Token vault, OAuth session maintenance, and key or secret lifecycle custody"
CAP_NOTIFICATIONS = "Notification delivery"
CAP_RUNTIME_TOPOLOGY = "Durable storage, object store, queue, cache, and observability runtime"
CAP_RELEASE_CONTROL = "Schema migration, release admission, rollback, backup, restore, DR, and packaging control plane"
CAP_STANDALONE_FORECASTING = "Standalone advisory forecasting disconnected from manifest, trust, and provenance governance"

CAP_IDENTITY_ISSUANCE = "Identity issuance, HMRC sign-up, and agent authorisation setup"
CAP_HMRC_ONLY_TASKS = "HMRC-online-services-only tasks and provider-hosted journeys"
CAP_AUTHORITY_TRUTH = "Authority-owned legal submission truth"
CAP_AUTHORITY_CALC = "HMRC's own calculation service"
CAP_HUMAN_JUDGMENT = "Human judgment outside the approved override protocol"
CAP_LEGAL_CONSENT = "Reporting-subject legal consent, declaration, and signatory acts"
CAP_EXTERNAL_SOURCE_ORIGINS = "External source systems and document providers as raw-source origins"
CAP_AUTHORITY_PROCESSING = "Authority-side processing semantics beyond what is returned"

CORE_CAPABILITY_NAMES = {
    CAP_RUN_INITIATION,
    CAP_MANIFEST_STRATEGY,
    CAP_CONFIG_FREEZE,
    CAP_INTAKE_DECISIONING,
    CAP_CANONICALIZATION,
    CAP_VALIDATION_QUALITY,
    CAP_OUTCOME_COMPUTE,
    CAP_ANALYSIS_SEGREGATION,
    CAP_PARITY,
    CAP_TRUST,
    CAP_PROVENANCE,
    CAP_TWIN,
    CAP_WORKFLOW,
    CAP_FILING_PACKET,
    CAP_SUBMISSION_INTENT,
    CAP_INGRESS_NORMALIZATION,
    CAP_READ_SIDE_POSTURE,
    CAP_DRIFT,
    CAP_RETENTION,
    CAP_LINEAGE,
    CAP_EXPLAINABILITY,
    CAP_MODE_BOUNDARY,
}


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def heading_ref(path: str, heading: str) -> str:
    return f"{path}#{slugify(heading)}"


def logical_block_ref(path: str, label: str) -> str:
    return f"{path}::block::{slugify(label)}"


def dedupe(values: Iterable[str]) -> list[str]:
    return sorted({value for value in values if value})


def json_write(path: Path, payload: Any) -> None:
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")


def write_jsonl(path: Path, payloads: Iterable[dict[str, Any]]) -> None:
    lines = [json.dumps(payload, sort_keys=True) for payload in payloads]
    path.write_text("\n".join(lines) + "\n")


@dataclass(frozen=True)
class BoundaryRequirement:
    boundary_requirement_id: str
    capability_name: str
    zone: str
    boundary_rule_family: str
    authoritative_source_refs: tuple[str, ...]
    owning_objects_or_contracts: tuple[str, ...]
    triggering_actors: tuple[str, ...]
    required_inputs: tuple[str, ...]
    produced_outputs_or_artifacts: tuple[str, ...]
    lawful_engine_relationship: str
    security_privacy_implications: str
    observability_implications: str
    degraded_or_failure_behavior: str
    forbidden_shortcuts_or_false_equivalences: tuple[str, ...]
    downstream_phase_implications: tuple[str, ...]
    notes: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "boundary_requirement_id": self.boundary_requirement_id,
            "capability_name": self.capability_name,
            "zone": self.zone,
            "boundary_rule_family": self.boundary_rule_family,
            "authoritative_source_refs": list(self.authoritative_source_refs),
            "owning_objects_or_contracts": list(self.owning_objects_or_contracts),
            "triggering_actors": list(self.triggering_actors),
            "required_inputs": list(self.required_inputs),
            "produced_outputs_or_artifacts": list(self.produced_outputs_or_artifacts),
            "lawful_engine_relationship": self.lawful_engine_relationship,
            "security_privacy_implications": self.security_privacy_implications,
            "observability_implications": self.observability_implications,
            "degraded_or_failure_behavior": self.degraded_or_failure_behavior,
            "forbidden_shortcuts_or_false_equivalences": list(self.forbidden_shortcuts_or_false_equivalences),
            "downstream_phase_implications": list(self.downstream_phase_implications),
            "notes": self.notes,
        }


def requirement(
    boundary_requirement_id: str,
    capability_name: str,
    zone: str,
    boundary_rule_family: str,
    authoritative_source_refs: Iterable[str],
    owning_objects_or_contracts: Iterable[str],
    triggering_actors: Iterable[str],
    required_inputs: Iterable[str],
    produced_outputs_or_artifacts: Iterable[str],
    forbidden_shortcuts_or_false_equivalences: Iterable[str],
    downstream_phase_implications: Iterable[str],
    notes: str,
    lawful_engine_relationship: str | None = None,
    security_privacy_implications: str | None = None,
    observability_implications: str | None = None,
    degraded_or_failure_behavior: str | None = None,
) -> BoundaryRequirement:
    if zone not in VALID_ZONES:
        raise ValueError(f"Unexpected zone: {zone}")
    defaults = ZONE_DEFAULTS[zone]
    return BoundaryRequirement(
        boundary_requirement_id=boundary_requirement_id,
        capability_name=capability_name,
        zone=zone,
        boundary_rule_family=boundary_rule_family,
        authoritative_source_refs=tuple(dedupe(authoritative_source_refs)),
        owning_objects_or_contracts=tuple(dedupe(owning_objects_or_contracts)),
        triggering_actors=tuple(dedupe(triggering_actors)),
        required_inputs=tuple(dedupe(required_inputs)),
        produced_outputs_or_artifacts=tuple(dedupe(produced_outputs_or_artifacts)),
        lawful_engine_relationship=lawful_engine_relationship or defaults["lawful"],
        security_privacy_implications=security_privacy_implications or defaults["security"],
        observability_implications=observability_implications or defaults["observability"],
        degraded_or_failure_behavior=degraded_or_failure_behavior or defaults["degraded"],
        forbidden_shortcuts_or_false_equivalences=tuple(
            dedupe(forbidden_shortcuts_or_false_equivalences)
        ),
        downstream_phase_implications=tuple(dedupe(downstream_phase_implications)),
        notes=notes.strip(),
    )


def build_rows() -> list[BoundaryRequirement]:
    rows = [
        requirement(
            "BR_001",
            CAP_RUN_INITIATION,
            "inside_core_engine",
            "run_initiation_and_authority_to_act",
            [
                heading_ref(BOUNDARY_PATH, "The invention begins where"),
                heading_ref(BOUNDARY_PATH, "1. Run initiation and authority to act"),
                heading_ref(CORE_ENGINE_PATH, "Summary (technical solution)"),
                heading_ref(ACTOR_MODEL_PATH, "Actor and authority model"),
            ],
            ["RunManifest", "PrincipalContext", "AuthorizationDecision", "actor_and_authority_model.md"],
            ["authenticated human principal", "service principal", "tenant policy engine"],
            ["tenant_id", "client_id", "period", "requested_scope", "execution_mode", "run_kind", "principal context"],
            ["RunManifest", "AuthorizationDecision", "runtime_scope", "access_binding_hash"],
            [
                "treating session presence as sufficient authority to act",
                "reusing a prior manifest without legality and lineage checks",
                "flattening client, period, or partition scope before the manifest is frozen",
            ],
            [
                "Swimlane and manifest-lifecycle implementations must start with authorize, scope-bind, and manifest-strategy decisions before any side effects.",
                "Access-control modules must freeze one access_binding_hash that later collection, compute, and authority phases consume verbatim.",
            ],
            "The engine begins at authenticated, scope-bound evaluation, not at transport receipt or UI intent.",
        ),
        requirement(
            "BR_002",
            CAP_MANIFEST_STRATEGY,
            "inside_core_engine",
            "lineage_safe_replay_recovery_continuation",
            [
                heading_ref(BOUNDARY_PATH, "1. Run initiation and authority to act"),
                heading_ref(BOUNDARY_PATH, "Boundary Rule 5A - The engine owns lineage-safe replay, recovery, and continuation decisions"),
                heading_ref(REPLAY_PATH, "Core principles"),
                heading_ref(REPLAY_PATH, "Exact replay preconditions"),
            ],
            ["RunManifest", "ReplayAttestation", "continuation basis", "replay_and_reproducibility_contract.md"],
            ["authenticated human principal", "scheduler service", "replay service"],
            ["prior_manifest", "requested_scope", "run_kind", "frozen basis refs", "access_binding_hash"],
            ["manifest strategy", "child-manifest lineage", "ReplayAttestation"],
            [
                "treating replay as generic retry or job restart",
                "letting queue or session infrastructure decide legal continuation posture",
                "substituting fresh inputs while still labelling the result an exact replay",
            ],
            [
                "Replay, recovery, and supersession modules must consume persisted historical basis instead of ambient runtime state.",
                "Lineage-aware state machines must model same-manifest reuse, child branching, and replay attestation explicitly.",
            ],
            "Whether a run may be reused, replayed, or superseded is part of the governed decision spine rather than infrastructure convenience.",
        ),
        requirement(
            "BR_003",
            CAP_CONFIG_FREEZE,
            "inside_core_engine",
            "config_freeze_and_execution_envelope",
            [
                heading_ref(BOUNDARY_PATH, "Positive boundary: what is inside the invention"),
                heading_ref(BOUNDARY_PATH, "2. Config freeze and execution envelope"),
                heading_ref(CORE_ENGINE_PATH, "Summary (technical solution)"),
                heading_ref(REPLAY_PATH, "1. Immutable execution basis"),
            ],
            ["RunManifest", "ConfigFreeze", "execution_basis_hash", "ConfigVersion"],
            ["manifest orchestrator", "operator or scheduler principal"],
            ["policy versions", "rule versions", "thresholds", "connector profile refs", "retention profile refs", "mode"],
            ["ConfigFreeze", "execution_basis_hash", "frozen execution envelope"],
            [
                "mutable config lookup during a live run",
                "analysis-only configuration silently authorizing compliance progression",
                "reconstructing the execution basis from current defaults at replay time",
            ],
            [
                "Config services, release gates, and replay tooling must preserve a byte-stable execution basis before collection begins.",
                "All downstream contracts must read frozen config refs from the manifest rather than re-resolving ambient policy.",
            ],
            "The inventive spine depends on a sealed execution envelope, not on best-effort configuration discipline.",
        ),
        requirement(
            "BR_004",
            CAP_INTAKE_DECISIONING,
            "inside_core_engine",
            "controlled_intake_before_canonicalization",
            [
                heading_ref(BOUNDARY_PATH, "2. System boundary"),
                heading_ref(BOUNDARY_PATH, "3. Evidence acquisition as engine-controlled intake"),
                heading_ref(SOURCE_TAXONOMY_PATH, "Canonical source and evidence taxonomy"),
            ],
            ["SourceCollectionRun", "ConnectorBinding", "RunManifest", "Snapshot"],
            ["manifest orchestrator", "connector service"],
            ["runtime_scope", "source plan", "source-window policy", "connector profile refs"],
            ["fetch instructions", "scoped payload refs", "collection audit refs"],
            [
                "treating a successful fetch as canonical truth",
                "letting connector retry logic widen partition or obligation scope",
                "allowing raw source payloads to satisfy scope without manifest linkage",
            ],
            [
                "Collection modules must separate engine-owned fetch intent from connector-owned transport execution.",
                "Collection persistence must retain source-window and partition scope so later compute cannot over-read evidence.",
            ],
            "The engine owns the decision to fetch, the lawful scope of fetched payloads, and the rule that nothing becomes canonical before normalization.",
        ),
        requirement(
            "BR_005",
            CAP_CANONICALIZATION,
            "inside_core_engine",
            "canonicalization_not_raw_source_truth",
            [
                heading_ref(BOUNDARY_PATH, "4. Canonicalization and data-quality formation"),
                heading_ref(BOUNDARY_PATH, "Boundary Rule 2 - The engine owns canonicalization, not raw-source truth"),
                heading_ref(SOURCE_TAXONOMY_PATH, "Canonical source and evidence taxonomy"),
            ],
            ["SourceRecord", "EvidenceItem", "CandidateFact", "CanonicalFact", "Snapshot"],
            ["normalizer service", "manifest orchestrator"],
            ["raw payload refs", "source_class", "scope bindings", "normalization context"],
            ["Snapshot", "CanonicalFact", "EvidenceItem", "validation output"],
            [
                "treating external payloads as canonical facts on receipt",
                "equating OCR text or imported CSV rows with engine truth",
                "skipping scope binding before canonical fact promotion",
            ],
            [
                "Normalization services must persist the exact raw-to-canonical chain used by compute and parity.",
                "Schema ownership work must distinguish SourceRecord, EvidenceItem, CandidateFact, and CanonicalFact as separate families.",
            ],
            "Raw source material stays external input until the engine validates, scopes, and promotes it into Snapshot-backed canonical facts.",
        ),
        requirement(
            "BR_006",
            CAP_VALIDATION_QUALITY,
            "inside_core_engine",
            "validation_quality_and_completeness",
            [
                heading_ref(BOUNDARY_PATH, "Positive boundary: what is inside the invention"),
                heading_ref(BOUNDARY_PATH, "4. Canonicalization and data-quality formation"),
                heading_ref(SOURCE_TAXONOMY_PATH, "4.5 Strength tiers"),
                heading_ref(SOURCE_TAXONOMY_PATH, "4.6 Confidence model"),
            ],
            ["Snapshot", "validation result sets", "TrustSummary"],
            ["normalizer service", "compute service"],
            ["canonical facts", "evidence strength", "confidence state", "completeness checks"],
            ["quality metrics", "completeness metrics", "uncertainty markers", "gate inputs"],
            [
                "silent degradation when evidence is partial or weak",
                "treating missing support as zero or non-occurrence",
                "bypassing quality signals before trust synthesis",
            ],
            [
                "Later gate and trust modules must consume explicit quality or completeness metrics instead of informal heuristics.",
                "Observability and remediation flows must surface typed data-health posture rather than generic warnings.",
            ],
            "The corpus makes quality and completeness first-class inputs to later trust and automation decisions.",
        ),
        requirement(
            "BR_007",
            CAP_OUTCOME_COMPUTE,
            "inside_core_engine",
            "outcome_computation_from_snapshot",
            [
                heading_ref(BOUNDARY_PATH, "5. Outcome computation"),
                heading_ref(CORE_ENGINE_PATH, "Summary (technical solution)"),
                heading_ref(CORE_ENGINE_PATH, "Outputs (DecisionBundle)"),
            ],
            ["Snapshot", "DerivedValue", "DecisionBundle", "data_model.md"],
            ["compute service"],
            ["Snapshot", "frozen config refs", "execution mode", "deterministic seed"],
            ["computed outcomes", "DecisionBundle", "derived value refs"],
            [
                "re-reading live systems during compute and still calling the result frozen",
                "mixing analysis-only basis into filing-capable result paths",
                "treating disposable read models as the compute source of truth",
            ],
            [
                "Compute modules must accept only manifest-frozen inputs and return durable artifact refs.",
                "Deterministic hashing and replay attestation depend on compute being re-executable from Snapshot and ConfigFreeze alone.",
            ],
            "The invention claims outcome computation only when it is bound to Snapshot, manifest freeze, and deterministic replay controls.",
        ),
        requirement(
            "BR_008",
            CAP_ANALYSIS_SEGREGATION,
            "inside_core_engine",
            "compliance_vs_analysis_segregation",
            [
                heading_ref(BOUNDARY_PATH, "5. Outcome computation"),
                heading_ref(BOUNDARY_PATH, "Boundary Rule 8 - The engine owns compliance-vs-analysis segregation"),
                heading_ref(REPLAY_PATH, "COUNTERFACTUAL_ANALYSIS"),
            ],
            ["DecisionBundle", "Forecast artifacts", "execution_mode_boundary_contract"],
            ["compute service", "operator principal"],
            ["execution_mode", "counterfactual basis", "forecast request"],
            ["forecast artifacts", "analysis_only flags", "execution_mode_boundary_contract"],
            [
                "treating advisory outputs as live compliance truth",
                "reusing analysis-mode artifacts on authority-facing mutation paths",
                "inferring counterfactual posture from UI labels instead of persisted mode boundaries",
            ],
            [
                "Forecasting, replay, and filing modules must serialize explicit analysis posture and block authority-facing side effects from it.",
                "UI and API surfaces must present analysis posture without collapsing it into ordinary submit-ready workflow.",
            ],
            "Advisory modeling is allowed only when the engine preserves a hard legal-effect boundary around non-compliance outputs.",
        ),
        requirement(
            "BR_009",
            CAP_PARITY,
            "inside_core_engine",
            "parity_and_trust_not_authority_calculation",
            [
                heading_ref(BOUNDARY_PATH, "6. Risk, parity, and trust"),
                heading_ref(BOUNDARY_PATH, "Boundary Rule 4 - The engine owns parity and trust, not HMRC's own calculations"),
                heading_ref(AUTHORITY_PROTOCOL_PATH, "9.2 Protocol scope"),
            ],
            ["AuthorityReference", "SubmissionRecord", "parity result", "CanonicalFact"],
            ["compute service", "authority gateway", "operator principal"],
            ["internal compute result", "authority reference values", "prior submission refs"],
            ["parity deltas", "comparison facts", "mismatch reasons"],
            [
                "treating parity match as legal acknowledgement",
                "substituting internal optimism for authority-returned calculations",
                "dropping prior-submission comparisons because internal compute succeeded",
            ],
            [
                "Parity modules must treat authority values as comparison inputs with their own provenance and freshness posture.",
                "Read-side twins and workflow planning must preserve mismatch detail rather than a single pass or fail bit.",
            ],
            "The engine owns the comparison logic, not the external authority's own calculation service.",
        ),
        requirement(
            "BR_010",
            CAP_TRUST,
            "inside_core_engine",
            "override_bounded_gate_evaluation",
            [
                heading_ref(BOUNDARY_PATH, "6. Risk, parity, and trust"),
                heading_ref(CORE_ENGINE_PATH, "Summary (technical solution)"),
                heading_ref(ACTOR_MODEL_PATH, "Layer 4 - Exceptional authority"),
            ],
            ["TrustSummary", "GateDecisionRecord", "ExceptionalAuthorityGrant"],
            ["compute service", "approver", "reviewer"],
            ["quality metrics", "parity results", "risk signals", "override refs"],
            ["TrustSummary", "gate decisions", "filing readiness posture"],
            [
                "implicit override without persisted approval evidence",
                "treating workflow completion as trust synthesis",
                "using broad human authority to bypass bounded gate semantics",
            ],
            [
                "Gate-order and override modules must preserve typed reason codes and bounded exceptional-authority evidence.",
                "Filing-readiness decisions must consume TrustSummary rather than ad hoc UI or worker heuristics.",
            ],
            "Trust is a formulaic engine output grounded in quality, parity, risk, defense quality, and approved overrides.",
        ),
        requirement(
            "BR_011",
            CAP_PROVENANCE,
            "inside_core_engine",
            "explainability_for_engine_created_states",
            [
                heading_ref(BOUNDARY_PATH, "7. Provenance and twin formation"),
                heading_ref(BOUNDARY_PATH, "Boundary Rule 7 - The engine owns evidence-linked explainability for all states it creates"),
                heading_ref(CORE_ENGINE_PATH, "Summary (technical solution)"),
            ],
            ["EvidenceGraph", "ProofBundle", "DecisionBundle", "audit and provenance contract"],
            ["graph service", "compute service"],
            ["canonical facts", "rule refs", "config refs", "override refs", "authority acknowledgement refs"],
            ["EvidenceGraph", "ProofBundle", "traceable artifact bindings"],
            [
                "opaque output with no evidence path",
                "render-time joins standing in for persisted provenance",
                "dropping override or authority lineage from proof paths",
            ],
            [
                "Graph, proof, and audit implementations must share durable artifact identity rather than reconstructing explanations from UI state.",
                "Retention and replay modules must preserve or tombstone decisive proof-path segments explicitly.",
            ],
            "The inventive center includes the evidence-linked provenance closure that makes each material output defensible and replayable.",
        ),
        requirement(
            "BR_012",
            CAP_TWIN,
            "inside_core_engine",
            "twin_view_and_delta_exposure",
            [
                heading_ref(BOUNDARY_PATH, "7. Provenance and twin formation"),
                heading_ref(CORE_ENGINE_PATH, "Summary (technical solution)"),
            ],
            ["TwinView", "AuthorityComparisonFact", "DecisionBundle"],
            ["graph service", "compute service"],
            ["internal compute results", "authority references", "canonical facts"],
            ["TwinView", "delta summaries", "mismatch clusters"],
            [
                "letting clients compute their own unofficial twin from raw projections",
                "flattening conflict detail into one status badge",
                "discarding provenance links when presenting deltas",
            ],
            [
                "Twin and reconciliation work must be durable engine artifacts, not only a presentation layer convenience.",
                "Later portal and governance read models should consume TwinView semantics instead of redefining mismatch posture locally.",
            ],
            "The twin representation is an engine-authored artifact that exposes cross-source deltas without surrendering provenance.",
        ),
        requirement(
            "BR_013",
            CAP_WORKFLOW,
            "inside_core_engine",
            "workflow_planning",
            [
                heading_ref(BOUNDARY_PATH, "8. Workflow planning"),
                heading_ref(CORE_ENGINE_PATH, "Summary (technical solution)"),
                heading_ref(DATA_MODEL_PATH, "WorkflowItem"),
            ],
            ["WorkflowItem", "DecisionBundle", "TrustSummary", "TwinView"],
            ["workflow service", "reviewer", "approver"],
            ["TrustSummary", "parity results", "risk signals", "data health", "drift posture"],
            ["WorkflowItem", "routing hints", "review or remediation posture"],
            [
                "generic task generation detached from evidence and trust posture",
                "marking workflow complete as a substitute for authority truth",
                "allowing notification delivery state to redefine workflow legality",
            ],
            [
                "Workflow modules must remain subordinate to trust, authority truth, and drift evidence rather than becoming an independent truth system.",
                "Read-side inbox and portal views must consume workflow projections without promoting them above engine-owned legal posture.",
            ],
            "Inside the engine, workflow planning is derived from evidence-backed decision posture, not from generic task-management mechanics.",
        ),
        requirement(
            "BR_014",
            CAP_FILING_PACKET,
            "inside_core_engine",
            "filing_intent_and_packet_not_authority_acceptance",
            [
                heading_ref(BOUNDARY_PATH, "9. Filing packet formation"),
                heading_ref(BOUNDARY_PATH, "Boundary Rule 3 - The engine owns filing intent and packet formation, not authority acceptance"),
                heading_ref(AUTHORITY_PROTOCOL_PATH, "Authority interaction protocol"),
            ],
            ["FilingPacket", "RunManifest", "AuthorityOperation"],
            ["filing service", "operator principal", "client signatory"],
            ["DecisionBundle", "declared basis", "manifest linkage", "authority operation profile"],
            ["FilingPacket", "basis declaration", "manifest-linked packet identity"],
            [
                "treating packet build or local send intent as legal completion",
                "omitting basis, disclaimer, or manifest lineage from filing artifacts",
                "using unscoped packet templates across different legal journeys",
            ],
            [
                "Authority-integration modules must separate packet construction semantics from transport or legal acknowledgement.",
                "Later filing and amendment flows must preserve basis type and manifest linkage explicitly.",
            ],
            "The engine owns packet formation and intent declaration, but legal completion remains authority-controlled.",
        ),
        requirement(
            "BR_015",
            CAP_SUBMISSION_INTENT,
            "inside_core_engine",
            "filing_intent_and_packet_not_authority_acceptance",
            [
                heading_ref(BOUNDARY_PATH, "10. Submission state handling"),
                heading_ref(AUTHORITY_PROTOCOL_PATH, "9.1 Boundary rule"),
                heading_ref(AUTHORITY_PROTOCOL_PATH, "9.3 Core protocol objects"),
            ],
            ["AuthorityOperation", "AuthorityBinding", "AuthorityRequestEnvelope", "SubmissionRecord"],
            ["filing service", "authority gateway"],
            ["FilingPacket", "authority binding", "token/client selection", "policy snapshot hash"],
            ["request_hash", "idempotency_key", "SubmissionRecord", "authority interaction lineage"],
            [
                "deriving request identity from live transport state after the fact",
                "treating queue resend as new legal intent without idempotency checks",
                "rebinding a request onto a different authority link or token lineage",
            ],
            [
                "Authority request builders, dedupe logic, and recovery tooling must reuse frozen request identity fields.",
                "Submission state machines must preserve request-to-manifest linkage independently from UI or gateway retries.",
            ],
            "Inside the engine boundary, submission intent is a governed identity-complete artifact set, not an ordinary HTTP send.",
        ),
        requirement(
            "BR_016",
            CAP_INGRESS_NORMALIZATION,
            "inside_core_engine",
            "boundary_ingress_requires_auth_correlation_normalization",
            [
                heading_ref(BOUNDARY_PATH, "10. Submission state handling"),
                logical_block_ref(BOUNDARY_PATH, "boundary ingress note"),
                heading_ref(SECURITY_PATH, "5. Service-to-service and network hardening"),
                heading_ref(AUTHORITY_PROTOCOL_PATH, "9.1 Boundary rule"),
            ],
            ["AuthorityIngressReceipt", "AuthorityResponseEnvelope", "SubmissionRecord", "AuthorityInteractionRecord"],
            ["authority gateway", "ingress worker", "filing service"],
            ["provider callback or poll payload", "request lineage", "dedupe key", "authority reference"],
            ["normalized authority artifacts", "acknowledgement state", "legal-state mutation inputs"],
            [
                "treating a callback or imported notice as legal truth before authentication and correlation",
                "equating transport success or silence with CONFIRMED acknowledgement",
                "skipping quarantine for ambiguous or duplicate ingress",
            ],
            [
                "Authority ingress pipelines must persist authenticated receipts before normalization and state mutation.",
                "Submission lifecycle, drift, and portal projections must distinguish PENDING, CONFIRMED, REJECTED, UNKNOWN, and OUT_OF_BAND states explicitly.",
            ],
            "Authority-side messages remain outside-engine signals until the engine turns them into governed authority artifacts.",
        ),
        requirement(
            "BR_017",
            CAP_READ_SIDE_POSTURE,
            "inside_core_engine",
            "exact_scope_posture_not_client_flattening",
            [
                heading_ref(BOUNDARY_PATH, "10A. Read-side legal posture projection"),
                heading_ref(BOUNDARY_PATH, "Boundary Rule 5B - The engine owns exact-scope posture, not client-wide flattening"),
                heading_ref(NORTHBOUND_PATH, "1. Core principles"),
            ],
            [
                "DecisionBundle",
                "ExperienceDelta",
                "LowNoiseExperienceFrame",
                "ClientPortalWorkspace",
                "TenantGovernanceSnapshot",
                "WorkInboxSnapshot",
            ],
            ["read-side projector", "product clients"],
            ["durable command-side truth", "manifest_id", "scope bindings", "masking context"],
            ["machine-stable posture artifacts", "ExperienceDelta", "route-visible read models"],
            [
                "letting browsers or native shells reinterpret legal posture heuristically",
                "flattening client, partition, or obligation scope into one generic status",
                "treating stream transport fields as command-side truth",
            ],
            [
                "Read-model and API contracts must preserve exact-scope posture and shell continuity without re-authoring legal semantics.",
                "Future frontend implementations should consume engine-authored frames, deltas, and portal workspaces rather than inventing local truth.",
            ],
            "The engine owns the semantic content of route-visible posture even though client runtime and transport live outside the core.",
        ),
        requirement(
            "BR_018",
            CAP_DRIFT,
            "inside_core_engine",
            "amendment_recommendation_not_unrestricted_amendment_right",
            [
                heading_ref(BOUNDARY_PATH, "11. Drift and amendment recommendation"),
                heading_ref(BOUNDARY_PATH, "Boundary Rule 5 - The engine owns amendment recommendation, not unrestricted amendment rights"),
                heading_ref(AUTHORITY_PROTOCOL_PATH, "9.2 Protocol scope"),
            ],
            ["SubmissionRecord", "WorkflowItem", "DecisionBundle", "drift monitor"],
            ["drift monitor", "reviewer", "operator principal"],
            ["filing baseline", "later evidence", "later runs", "authority timeline"],
            ["drift classification", "amendment recommendation", "review workflow"],
            [
                "treating detected drift as automatic amendment authority",
                "assuming HMRC amendment acceptance from internal recommendation",
                "mutating the original filing baseline instead of creating explicit amendment lineage",
            ],
            [
                "Amendment flows must separate recommendable drift from legally permitted amendment attempts.",
                "Later authority-integration work must keep amendment intent, amendment submit, and authority acceptance as distinct states.",
            ],
            "The engine decides whether amendment review is justified; the authority still controls legal amendment acceptance.",
        ),
        requirement(
            "BR_019",
            CAP_RETENTION,
            "inside_core_engine",
            "retention_and_limitation_governance",
            [
                heading_ref(BOUNDARY_PATH, "12. Retention and erasure governance"),
                heading_ref(RETENTION_PATH, "Retention and privacy"),
                heading_ref(RETENTION_PATH, "Expiry and limitation behavior"),
            ],
            ["RetentionTag", "ArtifactRetention", "ErasureProof", "DecisionBundle", "EvidenceGraph"],
            ["retention service", "privacy workflow", "audit investigator"],
            ["artifact refs", "retention basis", "legal hold state", "proof-preservation state"],
            ["RetentionTag", "ArtifactRetention", "erasure proofs", "limitation notes"],
            [
                "silently deleting decisive support while preserving filing-capable posture",
                "serializing expired or masked data as zero, false, or not observed",
                "treating retention as storage-only housekeeping rather than semantic governance",
            ],
            [
                "Retention services must propagate limitation posture into proof, replay, and portal surfaces explicitly.",
                "Later storage and recovery tasks must preserve replay basis hashes and erasure-proof lineage even when payload content is minimized.",
            ],
            "Retention is inside the boundary because the engine governs how expiry and erasure change explainability, trust, and replay posture.",
        ),
        requirement(
            "BR_020",
            CAP_LINEAGE,
            "inside_core_engine",
            "lineage_safe_replay_recovery_continuation",
            [
                heading_ref(BOUNDARY_PATH, "Positive boundary: what is inside the invention"),
                heading_ref(BOUNDARY_PATH, "Boundary Rule 5A - The engine owns lineage-safe replay, recovery, and continuation decisions"),
                heading_ref(REPLAY_PATH, "Purpose"),
            ],
            ["RunManifest", "ReplayAttestation", "continuation_set", "replay_and_reproducibility_contract.md"],
            ["manifest orchestrator", "replay service", "recovery worker"],
            ["historical manifest", "execution basis hash", "post-seal basis", "continuation request"],
            ["ReplayAttestation", "continuation lineage", "recovery posture"],
            [
                "treating lineage-safe continuation as generic queue retry",
                "using fresh authority reads during exact recovery",
                "silently superseding prior manifests instead of binding explicit lineage",
            ],
            [
                "Manifest, replay, and recovery modules must share one exact lineage vocabulary and comparison contract.",
                "Recovery and restore automation must respect persisted reconciliation control rather than re-opening live authority behaviour heuristically.",
            ],
            "Replay, recovery, continuation, and supersession are named engine capabilities, not incidental runtime behaviours.",
        ),
        requirement(
            "BR_021",
            CAP_EXPLAINABILITY,
            "inside_core_engine",
            "explainability_for_engine_created_states",
            [
                heading_ref(BOUNDARY_PATH, "Boundary Rule 7 - The engine owns evidence-linked explainability for all states it creates"),
                heading_ref(CORE_ENGINE_PATH, "Practical technical effect"),
                heading_ref(NORTHBOUND_PATH, "1. Core principles"),
            ],
            ["DecisionBundle", "EvidenceGraph", "EnquiryPack", "AuditInvestigationFrame"],
            ["graph service", "audit investigator", "read-side projector"],
            ["manifest refs", "evidence refs", "config refs", "override refs", "authority refs"],
            ["reason codes", "proof paths", "enquiry-pack artifacts", "investigation frames"],
            [
                "a final status label with no evidence path",
                "explanations that exist only in transient logs",
                "customer-safe or masked views that hide limitations silently",
            ],
            [
                "Any later explanation, audit, or portal surface must degrade gracefully via typed limitation entries rather than vague copy.",
                "Future automation and review agents can only rely on states that remain explainable through durable evidence and config lineage.",
            ],
            "Rule 7 is broader than graph construction: every state the engine creates must remain explainable back to manifest, evidence, config, overrides, and authority acknowledgement.",
        ),
        requirement(
            "BR_022",
            CAP_MODE_BOUNDARY,
            "inside_core_engine",
            "compliance_vs_analysis_segregation",
            [
                heading_ref(BOUNDARY_PATH, "Boundary Rule 8 - The engine owns compliance-vs-analysis segregation"),
                heading_ref(BOUNDARY_PATH, "Practical technical effect"),
                heading_ref(REPLAY_PATH, "COUNTERFACTUAL_ANALYSIS"),
            ],
            ["execution_mode_boundary_contract", "DecisionBundle", "ReplayAttestation", "FilingPacket"],
            ["compute service", "replay service", "filing service"],
            ["execution_mode", "analysis_only", "counterfactual_basis", "legal_effect_boundary"],
            ["execution_mode_boundary_contract", "disclosure reason codes", "blocked legal-effect posture"],
            [
                "analysis-only or replay-only outputs flowing onto live submit paths",
                "inferring filing capability from successful compute alone",
                "collapsing COMPLIANCE and ANALYSIS into one generic mode label",
            ],
            [
                "Future replay, forecast, filing, and read-model work must branch on persisted execution-mode boundaries rather than UI state.",
                "Authority-facing modules must reject any artifact whose execution boundary remains analysis or counterfactual.",
            ],
            "The engine must preserve a durable legal-effect boundary around all modeled, replay-only, or counterfactual results.",
        ),
        requirement(
            "BR_023",
            CAP_AUTH_GATEWAY,
            "controlled_edge",
            "controlled_authority_channel_not_core_logic",
            [
                heading_ref(BOUNDARY_PATH, "System boundary"),
                heading_ref(DEPLOYMENT_PATH, "1. Reference runtime topology"),
                heading_ref(AUTHORITY_PROTOCOL_PATH, "Authority interaction protocol"),
            ],
            ["controlled authority gateway", "AuthorityRequestEnvelope", "AuthorityIngressReceipt"],
            ["authority gateway", "filing service"],
            ["AuthorityRequestEnvelope", "provider credentials", "callback deliveries"],
            ["transport responses", "raw callback payloads", "delivery dedupe keys"],
            [
                "letting provider-specific transport logic redefine submission state",
                "mutating legal posture directly from gateway callbacks",
                "treating transport success as proof of legal completion",
            ],
            [
                "Authority integration work must keep provider HTTP mechanics behind the boundary while reusing engine-authored request identity and ingress normalization rules.",
                "Recovery and DR paths must rebuild transport queues from durable engine truth rather than from gateway-local memory.",
            ],
            "The gateway is necessary infrastructure, but the engine still owns intent, request identity, normalization, and legal-state interpretation.",
        ),
        requirement(
            "BR_024",
            CAP_CONNECTOR_RUNTIME,
            "controlled_edge",
            "controlled_connector_use_not_generic_etl",
            [
                heading_ref(BOUNDARY_PATH, "B. What is outside the core engine but still inside the broader product"),
                heading_ref(BOUNDARY_PATH, "Negative boundary: what is not the invention"),
                heading_ref(DEPLOYMENT_PATH, "1. Reference runtime topology"),
            ],
            ["connector workers", "ConnectorBinding", "SourceCollectionRun"],
            ["connector service", "manifest orchestrator"],
            ["fetch jobs", "connector binding", "scoped payload requests"],
            ["provider payloads", "retry metadata", "fetch audit refs"],
            [
                "claiming generic ETL runtime as the inventive center",
                "letting connector retry state decide legal continuation or scope widening",
                "promoting fetched payloads directly into compute without Snapshot formation",
            ],
            [
                "Connector modules should remain thin transport executors behind engine-owned fetch intent and scope controls.",
                "Collection and normalization tasks must document when payloads cross from connector runtime into engine-governed artifacts.",
            ],
            "The corpus allows controlled connector use, but it explicitly disclaims generic ETL or simple connector products as the invention.",
        ),
        requirement(
            "BR_025",
            CAP_OCR_RUNTIME,
            "controlled_edge",
            "controlled_ocr_not_inventive_center",
            [
                heading_ref(BOUNDARY_PATH, "B. What is outside the core engine but still inside the broader product"),
                heading_ref(BOUNDARY_PATH, "Negative boundary: what is not the invention"),
                heading_ref(SOURCE_TAXONOMY_PATH, "Class E - DOCUMENTARY_EVIDENCE"),
            ],
            ["OCR runtime", "document extraction worker", "EvidenceItem"],
            ["OCR service", "operator reviewer"],
            ["uploaded documents", "extraction model configuration", "quarantine results"],
            ["extracted text", "candidate spans", "document-derived payloads"],
            [
                "treating OCR output as canonical truth",
                "claiming generic document extraction as the inventive center",
                "allowing OCR confidence to bypass normalization and validation",
            ],
            [
                "Document-ingestion work must preserve a hard handoff from extraction output into engine-owned candidate-fact and Snapshot logic.",
                "Security and privacy controls must quarantine unsafe documents before any retained evidence path is formed.",
            ],
            "OCR is an adjacent runtime that supports evidence acquisition but does not itself define engine truth.",
        ),
        requirement(
            "BR_026",
            CAP_INGRESS_CHECKPOINT,
            "controlled_edge",
            "boundary_ingress_requires_auth_correlation_normalization",
            [
                logical_block_ref(BOUNDARY_PATH, "boundary ingress note"),
                heading_ref(SECURITY_PATH, "5. Service-to-service and network hardening"),
                heading_ref(DEPLOYMENT_PATH, "5. Backup, restore, and DR rules"),
            ],
            ["AuthorityIngressReceipt", "transactional inbox", "quarantine queue"],
            ["authority gateway", "ingress worker"],
            ["provider deliveries", "request lineage hints", "dedupe keys", "provider channel auth"],
            ["AuthorityIngressReceipt", "quarantine posture", "canonical_ingress_receipt_ref"],
            [
                "treating duplicate or weakly-bound ingress as safe legal truth",
                "normalizing ingress before authenticating the provider channel",
                "recovering ingress correlation from transport timestamps alone",
            ],
            [
                "Authority ingress pipelines must persist receipt-proof artifacts that later normalization and reconciliation consume.",
                "Restore and replay tooling must rebuild unresolved authority work from persisted ingress receipts, not from broker-local retries.",
            ],
            "This checkpoint is outside the inventive core but is the controlled edge the core depends on before it may normalize authority-side signals.",
        ),
        requirement(
            "BR_027",
            CAP_FETCH_TRANSPORT,
            "controlled_edge",
            "controlled_fetch_transport_not_raw_truth",
            [
                heading_ref(BOUNDARY_PATH, "3. Evidence acquisition as engine-controlled intake"),
                heading_ref(BOUNDARY_PATH, "Boundary Rule 2 - The engine owns canonicalization, not raw-source truth"),
                heading_ref(SECURITY_PATH, "5. Service-to-service and network hardening"),
            ],
            ["connector transport", "source fetch adapters", "SourceRecord"],
            ["connector service", "external provider systems"],
            ["engine-authored fetch request", "connector binding", "egress allowlist"],
            ["raw payload capture", "SourceRecord bodies", "fetch receipts"],
            [
                "equating captured payload bytes with canonical facts",
                "letting fetch transport infer scope or data quality locally",
                "treating external provider availability as equivalent to engine readiness",
            ],
            [
                "Connector and import adapters must preserve raw payload identity and provider context without inventing canonical meaning.",
                "Later source-taxonomy work should keep raw-source truth outside the core until normalization is complete.",
            ],
            "External fetch transport is a boundary edge: necessary for intake, but insufficient on its own to create engine truth.",
        ),
        requirement(
            "BR_028",
            CAP_UI_RENDERING,
            "broader_product_outside_core",
            "semantic_posture_not_renderer_layout",
            [
                heading_ref(BOUNDARY_PATH, "B. What is outside the core engine but still inside the broader product"),
                heading_ref(BOUNDARY_PATH, "Negative boundary: what is not the invention"),
                heading_ref(NORTHBOUND_PATH, "Purpose"),
            ],
            ["browser UI", "native UI", "design system", "frontend shells"],
            ["browser client", "native operator client"],
            ["engine-authored read models", "design tokens", "route state"],
            ["pixels", "layout", "surface components"],
            [
                "claiming styling, dashboards, or layout as the inventive center",
                "redefining legal posture through renderer-local copy or badges",
                "letting visible convenience labels outrank typed reason codes",
            ],
            [
                "Frontend work must preserve engine-authored semantics while remaining free to change layout, styling, and component composition.",
                "Design and shell tasks should treat layout as delivery, not as the source of legal meaning.",
            ],
            "UI rendering is product embodiment, not the invention as such; only the semantic posture the UI consumes belongs inside the engine.",
        ),
        requirement(
            "BR_029",
            CAP_CONSOLES,
            "broader_product_outside_core",
            "product_surface_embodiment_not_engine",
            [
                heading_ref(BOUNDARY_PATH, "B. What is outside the core engine but still inside the broader product"),
                heading_ref(BOUNDARY_PATH, "10A. Read-side legal posture projection"),
                heading_ref(NORTHBOUND_PATH, "2. Required northbound surfaces"),
            ],
            ["staff console", "ClientPortalWorkspace", "TenantGovernanceSnapshot", "admin console"],
            ["product clients", "operators", "client users", "governance users"],
            ["engine-authored snapshots", "portal workspaces", "governance read models"],
            ["surface-specific embodiments", "portal routes", "governance views"],
            [
                "treating portal or admin-console state as command-side truth",
                "re-authoring scope, authority, or workflow semantics per surface",
                "using console-local session state to bypass engine truth",
            ],
            [
                "Frontend and northbound tasks must model distinct portal, operator, and governance surfaces as consumers of engine-authored semantics.",
                "Route-specific read models should remain replaceable without changing the underlying legal posture vocabulary.",
            ],
            "The product includes many surfaces, but none of them becomes the source of manifest, authority, or legal-state truth.",
        ),
        requirement(
            "BR_030",
            CAP_NORTHBOUND,
            "broader_product_outside_core",
            "core_semantics_vs_northbound_transport",
            [
                heading_ref(BOUNDARY_PATH, "B. What is outside the core engine but still inside the broader product"),
                heading_ref(NORTHBOUND_PATH, "Purpose"),
                heading_ref(NORTHBOUND_PATH, "1. Core principles"),
            ],
            ["ApiCommandReceipt", "experience stream transport", "northbound API gateway"],
            ["API gateway", "browser client", "native client"],
            ["commands", "resume tokens", "ETags", "session state"],
            ["command receipts", "snapshot transport", "stream events", "problem envelopes"],
            [
                "treating partial POST success as legal state",
                "promoting ExperienceDelta or receipt transport fields into command truth",
                "using reconnect logic to invent missing transitions client-side",
            ],
            [
                "API and streaming work must preserve command/read separation, stale-view guards, and duplicate suppression at the edge.",
                "Frontend flows must recover via durable receipts and snapshot rebase rather than by replaying writes heuristically.",
            ],
            "Northbound delivery is required for the product, but the contract itself says command-side truth remains inside the core engine.",
        ),
        requirement(
            "BR_031",
            CAP_ROUTING,
            "broader_product_outside_core",
            "route_shell_choreography_not_engine_truth",
            [
                heading_ref(BOUNDARY_PATH, "B. What is outside the core engine but still inside the broader product"),
                heading_ref(NORTHBOUND_PATH, "1. Core principles"),
            ],
            ["route controller", "scene restoration", "window choreography", "shell continuity metadata"],
            ["browser client", "native client"],
            ["shell_route_key", "object_anchor_ref", "shell_family", "restoration metadata"],
            ["route transitions", "restored windows", "focus anchors"],
            [
                "treating a route alias as a new legal object or scope",
                "restoring UI selection without the underlying engine-authored stability contract",
                "letting local choreography rewrite scope or authority posture",
            ],
            [
                "Desktop and browser shell work must consume route-stable engine posture fields without inventing a second interaction grammar.",
                "Recovery UX should prefer rebase and stable anchors over local recreation of missing state.",
            ],
            "Routing and restoration consume engine-authored shell semantics but do not themselves define what the legal posture means.",
        ),
        requirement(
            "BR_032",
            CAP_SESSION_HARDENING,
            "broader_product_outside_core",
            "runtime_identity_and_secret_hardening_not_engine",
            [
                heading_ref(SECURITY_PATH, "2. Identity, session, and command trust"),
                heading_ref(BOUNDARY_PATH, "B. What is outside the core engine but still inside the broader product"),
            ],
            ["ActorSession", "session gateway", "device binding", "CSRF protections"],
            ["identity provider", "browser client", "native client"],
            ["OIDC or OAuth identity", "session binding", "step-up policy", "revocation state"],
            ["ActorSession", "revocation audit", "device-bound session posture"],
            [
                "treating client-held tokens as the only trust boundary",
                "smuggling session runtime controls into engine semantics",
                "allowing stale or replayed commands to masquerade as valid engine intent",
            ],
            [
                "Access-control and northbound work must validate every command against live session posture while preserving a separate engine authorization record.",
                "Frontend clients should lean on server-issued session state, not local trust shortcuts, for privileged actions.",
            ],
            "Session and command-trust hardening protects the engine but is defined as broader-product runtime control rather than inventive core logic.",
        ),
        requirement(
            "BR_033",
            CAP_SECRET_CUSTODY,
            "broader_product_outside_core",
            "runtime_identity_and_secret_hardening_not_engine",
            [
                heading_ref(BOUNDARY_PATH, "B. What is outside the core engine but still inside the broader product"),
                heading_ref(SECURITY_PATH, "3. Secret, key, and token handling"),
            ],
            ["token vault", "SecretVersion", "KMS or HSM boundary", "OAuth session maintenance"],
            ["identity provider", "authority gateway", "security operator"],
            ["token lineage", "secret rotation state", "authority link refs"],
            ["token refs", "secret-version lineage", "rotation evidence"],
            [
                "claiming mere token or OAuth handling as the invention",
                "keeping raw authority tokens in queues, read models, or logs",
                "using secret rotation to silently rebind a request to a different client context",
            ],
            [
                "Authority transport, recovery, and release work must treat secret custody as a separate runtime boundary from engine-owned request identity.",
                "Security automation should preserve token-binding lineage without turning secret storage into command-side truth.",
            ],
            "Provider-specific credential custody mechanics remain outside the core even though the engine depends on them lawfully.",
        ),
        requirement(
            "BR_034",
            CAP_NOTIFICATIONS,
            "broader_product_outside_core",
            "notification_delivery_not_engine_decisioning",
            [
                heading_ref(BOUNDARY_PATH, "B. What is outside the core engine but still inside the broader product"),
                heading_ref(ACTOR_MODEL_PATH, "C. Service principals"),
            ],
            ["notification service", "email provider", "push delivery channel"],
            ["notification service", "operator", "client user"],
            ["workflow posture", "customer-safe projection", "delivery channel config"],
            ["emails", "push notifications", "delivery receipts"],
            [
                "treating a delivered notification as legal or workflow completion",
                "letting channel failure rewrite underlying engine posture",
                "serializing internal-only reason codes directly into customer messaging",
            ],
            [
                "Workflow and portal modules must treat notification delivery as side-effectful communication, never as the source of truth.",
                "Later messaging integrations should read customer-safe projections from the engine and keep delivery state orthogonal.",
            ],
            "Notifications communicate engine posture but do not define or complete it.",
        ),
        requirement(
            "BR_035",
            CAP_RUNTIME_TOPOLOGY,
            "broader_product_outside_core",
            "runtime_topology_not_engine",
            [
                heading_ref(BOUNDARY_PATH, "B. What is outside the core engine but still inside the broader product"),
                heading_ref(DEPLOYMENT_PATH, "1. Reference runtime topology"),
                heading_ref(SECURITY_PATH, "6. Data protection, privacy, and cache safety"),
            ],
            ["primary control store", "append-only audit store", "object store", "queue or broker", "cache", "observability stack"],
            ["platform runtime", "operators", "workers"],
            ["engine-authored artifacts", "outbox or inbox truth", "cache partition keys"],
            ["stored artifact bodies", "queue deliveries", "telemetry", "cache entries"],
            [
                "treating the queue or cache as the legal system of record",
                "rebuilding truth from read models instead of durable command-side artifacts",
                "reusing cache entries across tenants or masking postures",
            ],
            [
                "Infrastructure work must keep durable truth rebuildable from manifests, audit evidence, and authority records.",
                "Projection and cache systems should remain disposable and partition-safe, especially across tenant and masking boundaries.",
            ],
            "Runtime topology is essential for operability, but the corpus explicitly keeps legal truth and inventive semantics out of queues, caches, and delivery substrates.",
        ),
        requirement(
            "BR_036",
            CAP_RELEASE_CONTROL,
            "broader_product_outside_core",
            "release_resilience_not_engine",
            [
                heading_ref(BOUNDARY_PATH, "B. What is outside the core engine but still inside the broader product"),
                heading_ref(DEPLOYMENT_PATH, "Deployment and resilience contract"),
                heading_ref(DEPLOYMENT_PATH, "6. Rollout, rollback, and fail-forward posture"),
            ],
            ["DeploymentRelease", "SchemaMigrationLedger", "RecoveryCheckpoint", "BuildArtifact"],
            ["release engineer", "operators", "platform runtime"],
            ["build artifacts", "schema bundle", "migration plan", "restore evidence"],
            ["deployment releases", "restore drills", "compatibility gates", "rollback or fail-forward posture"],
            [
                "treating release automation as the inventive core",
                "rolling back legal truth by deleting or obscuring persisted evidence",
                "blindly replaying live authority mutations during restore or DR",
            ],
            [
                "Release, migration, and recovery work must preserve manifest, audit, privacy, and authority guarantees rather than redefining them.",
                "Future platform tasks should model fail-forward and restore evidence as runtime governance, not as substitutions for engine lineage.",
            ],
            "Promotion, rollback, restore, and packaging are broader-product control-plane functions that protect the engine without becoming its inventive center.",
        ),
        requirement(
            "BR_037",
            CAP_STANDALONE_FORECASTING,
            "broader_product_outside_core",
            "standalone_forecasting_outside_invention",
            [
                heading_ref(BOUNDARY_PATH, "Negative boundary: what is not the invention"),
                heading_ref(BOUNDARY_PATH, "Boundary Rule 8 - The engine owns compliance-vs-analysis segregation"),
            ],
            ["advisory model", "forecast UI", "analysis workspace"],
            ["operator", "analyst"],
            ["what-if inputs", "advisory assumptions"],
            ["standalone forecasts", "advisory scenarios"],
            [
                "claiming disconnected forecasting as the invention",
                "reusing ungoverned advisory output inside filing-capable flows",
                "omitting manifest, trust, or provenance boundaries around analysis products",
            ],
            [
                "Any advisory-only tooling must remain clearly outside filing-capable paths unless it is reintroduced through the governed engine boundary.",
                "Forecast features should either serialize execution-mode boundaries or stay explicitly outside the core decision spine.",
            ],
            "The corpus explicitly excludes standalone forecasting models that are disconnected from manifest freeze, trust, and provenance governance.",
        ),
        requirement(
            "BR_038",
            CAP_IDENTITY_ISSUANCE,
            "external_authority_or_actor",
            "identity_issuance_outside_engine",
            [
                heading_ref(BOUNDARY_PATH, "1. HMRC sign-up and agent authorisation setup"),
                heading_ref(BOUNDARY_PATH, "Boundary Rule 1 - The engine owns decisions, not identity issuance"),
                heading_ref(AUTHORITY_PROTOCOL_PATH, "9.1 Boundary rule"),
            ],
            ["HMRC sign-up flow", "agent services account", "authority-issued identity"],
            ["reporting subject", "agent", "HMRC"],
            ["external identity proofing", "authority onboarding data"],
            ["authority account creation", "delegation setup", "authorisation grants"],
            [
                "implementing HMRC sign-up or primary identity issuance inside the engine",
                "treating local tenant policy as equivalent to authority-issued identity",
                "using RPA or local shortcuts to absorb prohibited sign-up journeys",
            ],
            [
                "Authority-link and delegation modules must validate imported or existing authority context instead of fabricating it.",
                "User journeys should treat sign-up as an external prerequisite and surface bounded handoff or prerequisite failure posture.",
            ],
            "Identity proofing, sign-up, and primary authority issuance remain with HMRC or the relevant external provider.",
        ),
        requirement(
            "BR_039",
            CAP_HMRC_ONLY_TASKS,
            "external_authority_or_actor",
            "guide_not_absorb_hmrc_online_services_only",
            [
                heading_ref(BOUNDARY_PATH, "2. HMRC-online-services-only tasks"),
                heading_ref(BOUNDARY_PATH, "Boundary Rule 6 - The engine may guide users to HMRC online services, but does not absorb HMRC-only tasks"),
            ],
            ["HMRC online services", "system browser handoff", "external session"],
            ["reporting subject", "agent", "HMRC online service"],
            ["user intent", "external-service URLs", "task eligibility guidance"],
            ["external-task completion", "handoff context"],
            [
                "reimplementing HMRC-only journeys inside product flows",
                "using embedded trusted web surfaces to blur the authority boundary",
                "presenting guided handoff as if the engine completed the task itself",
            ],
            [
                "Portal and operator journeys must model formal boundary crossings for HMRC-only tasks.",
                "Workflow and posture layers may guide, link, or track completion evidence, but they must not absorb the task semantics.",
            ],
            "The lawful engine relationship is guidance and handoff, not absorption of HMRC-reserved journeys.",
        ),
        requirement(
            "BR_040",
            CAP_AUTHORITY_TRUTH,
            "external_authority_or_actor",
            "authority_acceptance_and_legal_truth_external",
            [
                heading_ref(BOUNDARY_PATH, "3. Authority-owned legal status"),
                heading_ref(BOUNDARY_PATH, "Boundary Rule 3 - The engine owns filing intent and packet formation, not authority acceptance"),
                heading_ref(ACTOR_MODEL_PATH, "Layer 5 - Authority-of-record precedence"),
            ],
            ["Authority of Record", "authority acknowledgement", "submission legal status"],
            ["HMRC", "authority system"],
            ["authority acknowledgement", "authority status feeds", "authority-side corrections"],
            ["legal status", "authority-defined submission truth"],
            [
                "treating internal submitted or done labels as legal truth",
                "allowing workflow completion to outrank authority acknowledgement",
                "rewriting authority truth from internal convenience or timeout heuristics",
            ],
            [
                "Submission, portal, and governance work must preserve a hard boundary between internal intent and authority-owned truth.",
                "Any state machine that surfaces filing posture must keep authority precedence explicit and typed.",
            ],
            "The engine records and interprets authority truth, but it does not own or replace it.",
        ),
        requirement(
            "BR_041",
            CAP_AUTHORITY_CALC,
            "external_authority_or_actor",
            "parity_and_trust_not_authority_calculation",
            [
                heading_ref(BOUNDARY_PATH, "4. HMRC's own calculation service"),
                heading_ref(BOUNDARY_PATH, "Boundary Rule 4 - The engine owns parity and trust, not HMRC's own calculations"),
                heading_ref(AUTHORITY_PROTOCOL_PATH, "9.2 Protocol scope"),
            ],
            ["HMRC calculation service", "AuthorityReference"],
            ["HMRC", "authority gateway", "compute service"],
            ["calculation request", "authority calculation result"],
            ["authority calculation", "comparison input"],
            [
                "presenting internal compute as if it were the same as the authority's own calculation service",
                "overwriting authority-returned calculation meaning with local heuristics",
                "claiming authority calculation retrieval as the inventive center",
            ],
            [
                "Parity and filing-readiness modules must preserve authority-calculation provenance separately from internal compute results.",
                "Later authority-integration tasks should treat calculation retrieval as comparison input, not as local legal truth creation.",
            ],
            "The engine may request and compare HMRC calculations, but it never becomes HMRC's calculation service.",
        ),
        requirement(
            "BR_042",
            CAP_HUMAN_JUDGMENT,
            "external_authority_or_actor",
            "human_judgment_outside_override_protocol",
            [
                heading_ref(BOUNDARY_PATH, "5. Human judgment outside override protocol"),
                heading_ref(BOUNDARY_PATH, "Negative boundary: what is not the invention"),
                heading_ref(ACTOR_MODEL_PATH, "Layer 4 - Exceptional authority"),
            ],
            ["off-system professional advice", "manual conversations", "external judgment"],
            ["reviewer", "approver", "external advisor"],
            ["human interpretation", "off-system conversation"],
            ["external advice", "undocumented decision"],
            [
                "treating undocumented human judgment as engine truth",
                "using ad hoc verbal approval to bypass override or audit artifacts",
                "claiming generic manual workflow as the invention",
            ],
            [
                "Workflow, override, and audit modules must ingest human judgment only through governed records and typed state transitions.",
                "Later collaboration tooling should differentiate off-system context from persisted override or rationale artifacts.",
            ],
            "Human judgment only enters the engine when it is captured through governed override, workflow, or audit artifacts.",
        ),
        requirement(
            "BR_043",
            CAP_LEGAL_CONSENT,
            "external_authority_or_actor",
            "legal_consent_external_to_engine",
            [
                heading_ref(ACTOR_MODEL_PATH, "Layer 1 - Legal subject authority"),
                heading_ref(ACTOR_MODEL_PATH, "Layer 2 - Delegated client authority"),
                heading_ref(ACTOR_MODEL_PATH, "3.6 Principal context schema"),
            ],
            ["reporting-subject authority", "DelegationGrant", "signatory evidence"],
            ["reporting subject", "delegate", "client signatory"],
            ["external legal authority", "signatory basis", "delegation evidence"],
            ["declaration consent", "delegated authority evidence"],
            [
                "treating an internal role assignment as equivalent to external legal consent",
                "letting step-up completion fabricate a missing signatory basis",
                "using product session state as a substitute for delegated client authority",
            ],
            [
                "Approval, portal, and authority-link flows must keep legal consent and delegated authority as explicit prerequisites rather than UI assumptions.",
                "Sign-off journeys must capture and persist evidence of who had the right to act, not just who clicked submit.",
            ],
            "The engine can verify and record signatory or delegation evidence, but it does not create the reporting subject's legal authority.",
        ),
        requirement(
            "BR_044",
            CAP_EXTERNAL_SOURCE_ORIGINS,
            "external_authority_or_actor",
            "external_source_truth_outside_engine",
            [
                heading_ref(SOURCE_TAXONOMY_PATH, "4.3 Source classes by origin"),
                heading_ref(BOUNDARY_PATH, "Boundary Rule 2 - The engine owns canonicalization, not raw-source truth"),
            ],
            ["bank feeds", "document sources", "bookkeeping systems", "declared assertions"],
            ["customer bank", "document source system", "client user", "external provider"],
            ["external records", "documents", "declarations", "provider payloads"],
            ["raw source material", "documentary evidence", "declared assertions"],
            [
                "treating source origin as already canonical",
                "collapsing EvidenceItem, CandidateFact, and CanonicalFact into one raw data bucket",
                "assuming freshness or correctness because the payload came from an institution",
            ],
            [
                "Collection and normalization work must preserve origin class, source strength, and freshness before promotion into canonical facts.",
                "Future provenance and trust modules should use source origin as input, not as a substitute for canonicalization.",
            ],
            "Banks, document providers, and declared human inputs remain external origins even when the engine later normalizes them.",
        ),
        requirement(
            "BR_045",
            CAP_AUTHORITY_PROCESSING,
            "external_authority_or_actor",
            "authority_side_processing_external",
            [
                heading_ref(AUTHORITY_PROTOCOL_PATH, "9.1 Boundary rule"),
                heading_ref(BOUNDARY_PATH, "3. Authority-owned legal status"),
            ],
            ["authority-side processing", "authority queues", "provider internal semantics"],
            ["HMRC", "authority system"],
            ["authority request", "provider-side internal processing"],
            ["returned responses", "acknowledgement or rejection states", "unresolved external latency"],
            [
                "pretending local retries know what the authority is doing internally",
                "reconstructing authority processing semantics from timeout behaviour alone",
                "treating internal queue state as a substitute for authority-side progress",
            ],
            [
                "Reconciliation and pending-state logic must react only to returned or authenticated authority evidence, not to local optimism.",
                "Later authority analytics should preserve unresolved or unknown posture rather than inventing deterministic external state.",
            ],
            "The engine can only reason over what the authority returns or lawfully acknowledges; internal provider processing remains external.",
        ),
    ]
    return sorted(rows, key=lambda row: row.boundary_requirement_id)


def build_summary(rows: list[BoundaryRequirement]) -> dict[str, Any]:
    zone_counts = Counter(row.zone for row in rows)
    family_counts = Counter(row.boundary_rule_family for row in rows)
    explicit_rule_coverage = {
        family: [row.boundary_requirement_id for row in rows if row.boundary_rule_family == family]
        for family in sorted(EXPLICIT_BOUNDARY_RULE_FAMILIES)
    }
    return {
        "generated_from_task": "pc_0005",
        "requirement_count": len(rows),
        "zone_counts": {zone: zone_counts.get(zone, 0) for zone in ZONE_ORDER},
        "rule_family_count": len(family_counts),
        "explicit_boundary_rule_coverage": explicit_rule_coverage,
        "inside_core_capability_count": len([row for row in rows if row.zone == "inside_core_engine"]),
        "outside_core_capability_count": len([row for row in rows if row.zone != "inside_core_engine"]),
    }


def build_out_of_scope_register(rows: list[BoundaryRequirement]) -> dict[str, Any]:
    grouped = defaultdict(list)
    entries: list[dict[str, Any]] = []
    for row in rows:
        if row.zone == "inside_core_engine":
            continue
        if row.zone == "controlled_edge":
            why_out_of_scope = "Necessary dependency or transport edge the engine instructs, but not part of the inventive semantic core."
        elif row.zone == "broader_product_outside_core":
            why_out_of_scope = "Broader-product delivery or runtime function that carries or protects engine artifacts without creating their legal meaning."
        else:
            why_out_of_scope = "Authority-owned, provider-owned, or human-owned behavior outside engine control and not absorbable into the invention boundary."
        entry = {
            "boundary_requirement_id": row.boundary_requirement_id,
            "capability_name": row.capability_name,
            "zone": row.zone,
            "boundary_rule_family": row.boundary_rule_family,
            "why_out_of_scope": why_out_of_scope,
            "lawful_engine_relationship": row.lawful_engine_relationship,
            "authoritative_source_refs": list(row.authoritative_source_refs),
            "forbidden_shortcuts_or_false_equivalences": list(row.forbidden_shortcuts_or_false_equivalences),
            "downstream_phase_implications": list(row.downstream_phase_implications),
            "notes": row.notes,
        }
        entries.append(entry)
        grouped[row.zone].append(row.boundary_requirement_id)
    return {
        "generated_from_task": "pc_0005",
        "summary": {
            "entry_count": len(entries),
            "zone_counts": {zone: len(grouped.get(zone, [])) for zone in ZONE_ORDER if zone != "inside_core_engine"},
        },
        "rows": entries,
    }


def write_matrix_csv(rows: list[BoundaryRequirement]) -> None:
    fieldnames = [field.name for field in fields(BoundaryRequirement)]
    with BOUNDARY_CAPABILITY_MATRIX_CSV_PATH.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            payload = row.to_dict()
            writer.writerow(
                {
                    key: " | ".join(payload[key]) if isinstance(payload[key], list) else payload[key]
                    for key in fieldnames
                }
            )


def format_list(values: Iterable[str]) -> str:
    return "; ".join(values)


def build_requirements_doc(rows: list[BoundaryRequirement], summary: dict[str, Any], register: dict[str, Any]) -> str:
    family_to_rows: dict[str, list[BoundaryRequirement]] = defaultdict(list)
    for row in rows:
        family_to_rows[row.boundary_rule_family].append(row)

    lines = [
        "# Invention and System Boundary Requirements",
        "",
        "## Summary",
        "",
        f"- Requirement rows: `{summary['requirement_count']}`",
        f"- Inside-core rows: `{summary['zone_counts']['inside_core_engine']}`",
        f"- Controlled-edge rows: `{summary['zone_counts']['controlled_edge']}`",
        f"- Broader-product rows: `{summary['zone_counts']['broader_product_outside_core']}`",
        f"- External-authority or actor rows: `{summary['zone_counts']['external_authority_or_actor']}`",
        f"- Out-of-scope but adjacent register entries: `{register['summary']['entry_count']}`",
        "",
        "## Authoritative Sources",
        "",
        f"- `{BOUNDARY_PATH}`",
        f"- `{CORE_ENGINE_PATH}`",
        f"- `{SOURCE_TAXONOMY_PATH}`",
        f"- `{AUTHORITY_PROTOCOL_PATH}`",
        f"- `{NORTHBOUND_PATH}`",
        f"- `{SECURITY_PATH}`",
        f"- `{DEPLOYMENT_PATH}`",
        f"- `{RETENTION_PATH}`",
        f"- `{REPLAY_PATH}`",
        f"- `{ACTOR_MODEL_PATH}`",
        f"- `{DATA_MODEL_PATH}`",
        "",
        "## Non-Negotiable Distinctions",
        "",
        "- Raw source truth stays external until normalized into `Snapshot` and promoted into canonical facts.",
        "- Filing intent, packet formation, request identity, and state interpretation are inside the engine; legal acceptance remains authority-owned.",
        "- Parity and trust are engine outputs; HMRC's own calculation service remains external comparison input.",
        "- Amendment recommendation is inside the engine; unrestricted amendment right and acceptance remain authority-controlled.",
        "- Replay, recovery, continuation, and supersession are lineage-governed engine decisions, not queue or session retries.",
        "- Semantic read-side posture is inside the engine; transport, UI layout, routing, and session delivery are outside the core.",
        "- Guidance to HMRC-only journeys is lawful; absorbing HMRC-only tasks into local product logic is not.",
        "- Compliance-vs-analysis segregation is itself a boundary invariant, not a presentation choice.",
        "",
        "## Coverage By Zone",
        "",
        "| Zone | Count | Representative IDs |",
        "| --- | --- | --- |",
    ]
    for zone in ZONE_ORDER:
        zone_rows = [row for row in rows if row.zone == zone]
        representative_ids = ", ".join(row.boundary_requirement_id for row in zone_rows[:6])
        lines.append(f"| `{zone}` | `{len(zone_rows)}` | `{representative_ids}` |")

    lines.extend(
        [
            "",
            "## Explicit Boundary Rule Coverage",
            "",
            "| Boundary rule family | Requirement IDs |",
            "| --- | --- |",
        ]
    )
    for family in sorted(EXPLICIT_BOUNDARY_RULE_FAMILIES):
        row_ids = ", ".join(summary["explicit_boundary_rule_coverage"][family])
        lines.append(f"| `{family}` | `{row_ids}` |")

    core_rows = [row for row in rows if row.zone == "inside_core_engine"]
    lines.extend(
        [
            "",
            "## Inside-Core Semantic Requirements",
            "",
            "| ID | Capability | Rule family | Owning objects/contracts | Produced artifacts |",
            "| --- | --- | --- | --- | --- |",
        ]
    )
    for row in core_rows:
        lines.append(
            "| `{id}` | {name} | `{family}` | {owners} | {outputs} |".format(
                id=row.boundary_requirement_id,
                name=row.capability_name,
                family=row.boundary_rule_family,
                owners=format_list(row.owning_objects_or_contracts),
                outputs=format_list(row.produced_outputs_or_artifacts),
            )
        )

    lines.extend(
        [
            "",
            "## Rule Families With Multiple Requirement Rows",
            "",
            "| Rule family | Row count | Requirement IDs |",
            "| --- | --- | --- |",
        ]
    )
    for family in sorted(family_to_rows):
        family_rows = family_to_rows[family]
        lines.append(
            f"| `{family}` | `{len(family_rows)}` | "
            + ", ".join(f"`{row.boundary_requirement_id}`" for row in family_rows)
            + " |"
        )

    lines.extend(
        [
            "",
            "## Output Files",
            "",
            "- `data/analysis/system_boundary_requirements.jsonl`",
            "- `data/analysis/boundary_capability_matrix.csv`",
            "- `data/analysis/out_of_scope_but_adjacent_functions.json`",
            "- `docs/analysis/05_boundary_capability_matrix.md`",
            "- `docs/analysis/05_controlled_edge_and_external_actor_context.mmd`",
            "",
        ]
    )
    return "\n".join(lines)


def build_matrix_doc(rows: list[BoundaryRequirement]) -> str:
    grouped = defaultdict(list)
    for row in rows:
        grouped[row.zone].append(row)

    lines = [
        "# Boundary Capability Matrix",
        "",
        "This matrix classifies each major boundary capability into one of four zones and makes the lawful engine relationship explicit for later implementation phases.",
        "",
    ]
    for zone in ZONE_ORDER:
        zone_rows = grouped[zone]
        lines.extend(
            [
                f"## `{zone}`",
                "",
                "| ID | Capability | Rule family | Lawful engine relationship | Key owning objects/contracts |",
                "| --- | --- | --- | --- | --- |",
            ]
        )
        for row in zone_rows:
            lines.append(
                "| `{id}` | {name} | `{family}` | {relationship} | {owners} |".format(
                    id=row.boundary_requirement_id,
                    name=row.capability_name,
                    family=row.boundary_rule_family,
                    relationship=row.lawful_engine_relationship,
                    owners=format_list(row.owning_objects_or_contracts),
                )
            )
        lines.append("")
    return "\n".join(lines)


def build_mermaid_diagram() -> str:
    return "\n".join(
        [
            "flowchart LR",
            '  subgraph EXT["External Authority / External Actor"]',
            '    HMRC["HMRC / Authority of Record"]',
            '    USERS["Reporting subject / delegate / signatory"]',
            '    SOURCES["Banks / ledgers / document providers / external systems"]',
            "  end",
            '  subgraph PRODUCT["Broader Product Outside Core"]',
            '    SURFACES["UI / portal / governance / routing / native scenes"]',
            '    NORTHBOUND["API gateway / session management / SSE snapshot transport"]',
            '    RUNTIME["Vault / storage / queue / cache / observability / release / DR"]',
            "  end",
            '  subgraph EDGE["Controlled Edge"]',
            '    CONNECTORS["Connector runtime / OCR / scoped fetch transport"]',
            '    GATEWAY["Authority gateway / ingress checkpoint / callback capture"]',
            "  end",
            '  subgraph CORE["Core Engine"]',
            '    MANIFEST["Run initiation / manifest strategy / config freeze"]',
            '    SNAPSHOT["Intake governance / Snapshot / canonicalization / quality"]',
            '    DECISION["Compute / parity / trust / gates / workflow"]',
            '    LEGAL["Filing packet / request identity / ack interpretation / drift"]',
            '    GOVERNANCE["Read-side posture / replay lineage / retention / explainability"]',
            "  end",
            '  USERS -->|"authenticated requests, signatory evidence"| MANIFEST',
            '  SOURCES -->|"raw records, documents, declarations"| CONNECTORS',
            '  CONNECTORS -->|"payload refs only"| SNAPSHOT',
            '  MANIFEST --> SNAPSHOT --> DECISION --> LEGAL --> GOVERNANCE',
            '  HMRC -->|"authority acknowledgements, status, calculations"| GATEWAY',
            '  GATEWAY -->|"authenticated receipts and normalized responses"| LEGAL',
            '  DECISION -->|"engine-authored posture and workflow"| NORTHBOUND',
            '  NORTHBOUND -->|"delivery only"| SURFACES',
            '  RUNTIME -. "supports, secures, stores, but does not redefine truth" .-> CORE',
            '  SURFACES -. "consume but may not reinterpret semantics" .-> NORTHBOUND',
            '  CORE -->|"guide, request, compare, record, or react"| HMRC',
        ]
    )


def write_outputs(rows: list[BoundaryRequirement]) -> None:
    DATA_ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
    DOCS_ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)

    summary = build_summary(rows)
    register = build_out_of_scope_register(rows)
    row_dicts = [row.to_dict() for row in rows]

    write_jsonl(SYSTEM_BOUNDARY_JSONL_PATH, row_dicts)
    write_matrix_csv(rows)
    json_write(OUT_OF_SCOPE_REGISTER_PATH, register)
    REQUIREMENTS_DOC_PATH.write_text(build_requirements_doc(rows, summary, register))
    MATRIX_DOC_PATH.write_text(build_matrix_doc(rows))
    CONTEXT_DIAGRAM_PATH.write_text(build_mermaid_diagram() + "\n")


def main() -> int:
    rows = build_rows()
    write_outputs(rows)
    summary = build_summary(rows)
    print(json.dumps({"status": "PASS", **summary}, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
