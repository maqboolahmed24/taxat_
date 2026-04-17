#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
import re
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[2]
ALGORITHM_DIR = ROOT / "Algorithm"
DATA_ANALYSIS_DIR = ROOT / "data" / "analysis"
DOCS_ANALYSIS_DIR = ROOT / "docs" / "analysis"
DIAGRAMS_ANALYSIS_DIR = ROOT / "diagrams" / "analysis"

MODULE_CATALOG_PATH = DATA_ANALYSIS_DIR / "module_catalog.json"
MODULE_EDGE_CSV_PATH = DATA_ANALYSIS_DIR / "module_dependency_edges.csv"
MODULE_CALLSITE_INDEX_PATH = DATA_ANALYSIS_DIR / "module_callsite_index.jsonl"
SIDE_EFFECT_MATRIX_PATH = DATA_ANALYSIS_DIR / "module_side_effect_matrix.json"
SCHEMA_TOUCHPOINTS_PATH = DATA_ANALYSIS_DIR / "module_schema_touchpoints.json"
UNRESOLVED_CALLS_PATH = DATA_ANALYSIS_DIR / "unresolved_or_primitive_calls.json"

MODULE_DOC_PATH = DOCS_ANALYSIS_DIR / "07_module_catalog_and_dependency_edges.md"
PHASE_BINDING_DOC_PATH = DOCS_ANALYSIS_DIR / "07_phase_to_module_binding.md"
FAMILY_TAXONOMY_DOC_PATH = DOCS_ANALYSIS_DIR / "07_module_families_and_side_effect_taxonomy.md"
MODULE_GRAPH_PATH = DIAGRAMS_ANALYSIS_DIR / "07_module_dependency_graph.mmd"

MODULES_PATH = "Algorithm/modules.md"
CORE_ENGINE_PATH = "Algorithm/core_engine.md"
DATA_MODEL_PATH = "Algorithm/data_model.md"
STATE_MACHINES_PATH = "Algorithm/state_machines.md"
GATE_LOGIC_PATH = "Algorithm/exact_gate_logic_and_decision_tables.md"
FORMULAS_PATH = "Algorithm/compute_parity_and_trust_formulas.md"
AUTHORITY_PROTOCOL_PATH = "Algorithm/authority_interaction_protocol.md"
LOW_NOISE_PATH = "Algorithm/low_noise_experience_contract.md"
FRONTEND_LAW_PATH = "Algorithm/frontend_shell_and_interaction_law.md"
PORTAL_PATH = "Algorithm/customer_client_portal_experience_contract.md"
COLLABORATION_PATH = "Algorithm/collaboration_workspace_contract.md"
GOVERNANCE_PATH = "Algorithm/admin_governance_console_architecture.md"
SWIMLANE_PHASE_INDEX_PATH = DATA_ANALYSIS_DIR / "run_engine_phase_index.json"
SWIMLANE_STEP_LEDGER_PATH = DATA_ANALYSIS_DIR / "run_engine_step_ledger.jsonl"

LABEL_RE = re.compile(r"^\*\*([A-Za-z0-9 /_-]+)\*\*:\s*(.*)$")
UPPER_CALL_RE = re.compile(r"\b([A-Z][A-Z0-9_]+)\(")
HEADING_RE = re.compile(r"^##\s+(.+)$")
SCHEMA_RE = re.compile(r"schemas/([a-z0-9_]+)\.schema\.json")
OBJECT_BULLET_RE = re.compile(r"^- \*\*([A-Za-z0-9_]+)\*\*:")
STATE_MACHINE_HEADING_RE = re.compile(r"^##\s+\d+(?:\.\d+)?\s+`([A-Za-z0-9_]+)\.lifecycle_state`")
SIDE_EFFECT_VERB_RE = re.compile(
    r"\b(?:persist(?:ed|ing)?|mutat(?:e|ed|ing)|updat(?:e|ed|ing)|append(?:ed|ing)?|"
    r"enqueue(?:d|ing)?|transition(?:ed|ing)?|claim(?:ed|ing)?|seal(?:ed|ing)?|"
    r"upsert(?:ed|ing)?|tag(?:ged|ging)?)\b"
)

DEPENDENCY_TYPES = [
    "parameter_data_dependency",
    "control_flow_dependency",
    "state_transition_dependency",
    "artifact_availability_dependency",
    "external_boundary_dependency",
]
FAMILY_ORDER = [
    "authorization",
    "manifest",
    "freeze",
    "collection",
    "canonicalization",
    "gate",
    "compute",
    "graph",
    "twin",
    "workflow",
    "filing",
    "authority",
    "drift_amendment",
    "retention",
    "observability",
    "read_model",
    "experience_projection",
    "nightly",
    "replay",
    "misc",
]
PURITY_ORDER = [
    "pure_transform",
    "deterministic_builder",
    "state_mutator",
    "artifact_persister",
    "event_emitter",
    "external_transport",
    "projection_builder",
    "mixed",
]

EXPLICIT_SOURCE_REFS = {
    "read_model": [PORTAL_PATH, COLLABORATION_PATH, GOVERNANCE_PATH],
    "experience_projection": [LOW_NOISE_PATH, FRONTEND_LAW_PATH],
    "authority": [AUTHORITY_PROTOCOL_PATH],
    "compute": [FORMULAS_PATH],
    "gate": [GATE_LOGIC_PATH],
}
EVENT_EMITTERS = {"RECORD_EVENT", "EMIT_AUDIT_EVENT", "RECORD_OBSERVABILITY"}
ARTIFACT_PERSISTERS = {"WRITE_ARTIFACT", "PERSIST_DECISION_BUNDLE", "PERSIST_PRESTART_TERMINAL_CONTEXT"}
STATE_MUTATOR_PREFIXES = (
    "APPLY_",
    "BEGIN_",
    "TRANSITION_",
    "UPDATE_",
    "APPEND_",
    "UPSERT_",
    "CLAIM_",
    "SEAL_",
    "FINALIZE_",
    "RECONCILE_",
)
READ_MODEL_NAME_TOKENS = {
    "CLIENT_PORTAL",
    "WORKSPACE",
    "GOVERNANCE_SNAPSHOT",
    "WORK_INBOX",
    "CUSTOMER_REQUEST",
    "UPLOAD_SESSION",
    "APPROVAL_PACK",
    "ONBOARDING",
    "TIMELINE",
    "HELP_REQUEST",
}
EXPERIENCE_NAME_TOKENS = {
    "EXPERIENCE",
    "CONTEXT_BAR",
    "DECISION_SUMMARY",
    "ACTION_STRIP",
    "DETAIL_DRAWER",
    "PULSE_SPINE",
    "MANIFEST_RIBBON",
    "DECISION_STAGE",
    "CONSEQUENCE_RAIL",
    "PACKET_FORGE",
    "AUTHORITY_TUNNEL",
    "DRIFT_FIELD",
    "FOCUS_LENS",
    "TWIN_PANEL",
    "HANDOFF_BATON",
}
EXTERNAL_BOUNDARY_TOKENS = {
    "authority": ["AUTHORITY", "TRANSMIT", "REQUEST", "RECONCILE", "CALLBACK", "POLL", "RESPONSE"],
    "browser_handoff": ["BROWSER_HANDOFF", "PRINT", "EXPORT", "DOWNLOAD", "DEEPLINK"],
    "notification": ["NOTIFICATION", "NOTIFY", "EMAIL", "PUSH"],
    "storage": ["WRITE_", "PERSIST_", "LOAD_", "STORE", "UPLOAD"],
}
FORCED_FAMILY = {
    "WRITE_ARTIFACT": "manifest",
    "RECORD_EVENT": "observability",
    "EMIT_AUDIT_EVENT": "observability",
    "RECORD_OBSERVABILITY": "observability",
}
PASSIVE_AUTHORITY_MODULES = {
    "AUTHORITY_PREFLIGHT",
    "EXTRACT_AUTHORITY_VIEWS",
    "LOAD_AUTHORITY_STATE",
    "OBLIGATION_STATUS",
    "RECONCILE_AUTHORITY_STATE",
    "RESOLVE_AUTHORITY_BINDING",
    "RESOLVE_AUTHORITY_OPERATION",
}
AUTHORITY_TRANSPORT_NAME_FRAGMENTS = (
    "TRANSMIT",
    "CALLBACK",
    "POLL",
    "AUTHORITY_REQUEST",
    "WAIT_FOR_TRANSMIT",
    "EXECUTE_AUTHORITY_CALCULATION_FLOW",
)
AUTHORITY_TRANSPORT_TEXT_PHRASES = (
    "live authority",
    "authority traffic",
    "authority call is attempted",
    "authority call",
    "governed transmit",
    "request canonicalization/build/transmit sequence",
)
STORAGE_LOAD_FAMILIES = {"manifest", "freeze", "canonicalization", "replay", "retention"}
GENERIC_SHARED_OBJECTS = {
    "AuditEvent",
    "BuildArtifact",
    "DecisionBundle",
    "GateDecisionRecord",
    "RunManifest",
    "Snapshot",
    "WorkflowItem",
}
MAX_SHARED_OBJECT_FANOUT = 8
OBJECT_OVERRIDES = {
    "AUTHORIZE": ["AuthorizationDecision", "PrincipalContext"],
    "SIMULATE_GOVERNANCE_MUTATION": ["GovernanceMutationBasisContract", "AuthorizationDecision"],
    "ACCESS_BLOCKED_RESPONSE": ["AuthorizationDecision"],
    "MATERIALIZE_SCOPE_EXECUTION_BINDING": ["PrincipalContext", "AuthorizationDecision"],
    "LOAD_AND_VALIDATE_PRIOR_MANIFEST_CONTEXT": ["RunManifest", "DecisionBundle"],
    "VALIDATE_REUSE_SEALED_CONTEXT": ["RunManifest"],
    "DECIDE_MANIFEST_REUSE_STRATEGY": ["RunManifest", "DecisionBundle"],
    "BEGIN_MANIFEST": ["RunManifest"],
    "BEGIN_CHILD_MANIFEST": ["RunManifest"],
    "UPDATE_MANIFEST_PRESEAL_CONTEXT": ["RunManifest", "ConfigFreeze", "InputFreeze"],
    "LOAD_EXISTING_DECISION_BUNDLE": ["DecisionBundle"],
    "LOAD_SEALED_RUN_CONTEXT": ["RunManifest", "ConfigFreeze", "InputFreeze"],
    "LOAD_FROZEN_POST_SEAL_BASIS": ["RunManifest", "ReplayAttestation"],
    "LOAD_SUBMISSION_LINEAGE": ["SubmissionRecord"],
    "LOAD_AMENDMENT_CASE": ["AmendmentCase"],
    "TRANSITION_MANIFEST": ["RunManifest"],
    "CLAIM_MANIFEST_START": ["RunManifest"],
    "UPDATE_MANIFEST_GATES": ["RunManifest", "GateDecisionRecord"],
    "APPEND_MANIFEST_GATES": ["RunManifest", "GateDecisionRecord"],
    "PERSIST_GATE_BATCH": ["GateDecisionRecord"],
    "UPDATE_MANIFEST_OUTPUTS": ["RunManifest"],
    "APPLY_EXECUTION_MODE_STAMP": ["RunManifest"],
    "PERSIST_DECISION_BUNDLE": ["DecisionBundle"],
    "COMPUTE_EXECUTION_BASIS_HASH": ["RunManifest"],
    "COMPARE_REPLAY_OUTCOMES": ["ReplayAttestation", "DecisionBundle"],
    "PERSIST_REPLAY_ATTESTATION": ["ReplayAttestation"],
    "FINALIZE_TERMINAL_OUTCOME": ["RunManifest", "DecisionBundle", "ErrorRecord", "RemediationTask"],
    "FINALIZE_RUN_FAILURE": ["RunManifest", "ErrorRecord"],
    "PERSIST_PRESTART_TERMINAL_CONTEXT": ["Snapshot", "InputFreeze", "GateDecisionRecord"],
    "PLAN_SOURCE_COLLECTION": ["SourcePlan", "SourceCollectionRun"],
    "COLLECT_SOURCES": ["SourceCollectionRun", "SourceRecordSet"],
    "FREEZE_COLLECTION_BOUNDARY": ["CollectionBoundary"],
    "LATE_DATA_INDICATORS": ["LateDataIndicatorSet"],
    "MATERIALIZE_SOURCE_WINDOW": ["SourceWindow"],
    "MATERIALIZE_SOURCE_RECORDS": ["SourceRecordSet"],
    "MATERIALIZE_EVIDENCE_ITEMS": ["EvidenceItemSet"],
    "EXTRACT_CANDIDATE_FACTS": ["CandidateFactSet"],
    "DETECT_CONFLICTS": ["ConflictSet"],
    "PROMOTE_CANONICAL_FACTS": ["CanonicalFactSet"],
    "BUILD_ARTIFACT_SET": ["BuildArtifact"],
    "WRAP_AND_HASH": ["HashSet"],
    "FREEZE_NORMALIZATION_CONTEXT": ["NormalizationContext"],
    "DECLARE_MISSING_SOURCES": ["SourcePlan"],
    "DECLARE_STALE_SOURCES": ["SourcePlan"],
    "FREEZE_INPUT_SET": ["InputFreeze"],
    "COLLECTION_LATE_DATA_BINDINGS": ["LateDataPolicyBinding"],
    "MONITOR_LATE_DATA_AFTER_SEAL": ["LateDataMonitorResult"],
    "LOAD_SCHEMA_BUNDLE": ["SchemaBundle"],
    "VALIDATE_ARTIFACT_SET": ["BuildArtifact"],
    "VALIDATE_ARTIFACT": ["BuildArtifact"],
    "RECORD_ARTIFACT_CONTRACT_REF": ["BuildArtifact"],
    "RECORD_ARTIFACT_CONTRACT_REFS": ["BuildArtifact"],
    "ASSEMBLE_RELEASE_VERIFICATION_MANIFEST": ["ReleaseVerificationManifest"],
    "BUILD_PRESEAL_GATE_EVALUATION": ["PresealGateEvaluationContract"],
    "MANIFEST_GATE": ["GateDecisionRecord", "RunManifest"],
    "ARTIFACT_CONTRACT_GATE": ["GateDecisionRecord", "BuildArtifact"],
    "INPUT_BOUNDARY_GATE": ["GateDecisionRecord", "InputFreeze"],
    "DATA_QUALITY_GATE": ["GateDecisionRecord", "Snapshot"],
    "SEAL_MANIFEST": ["RunManifest"],
    "WRITE_ARTIFACT": ["BuildArtifact"],
    "RECORD_EVENT": ["AuditEvent"],
    "RETENTION_TAG": ["RetentionTag"],
    "APPLY_RETENTION_POLICY": ["ArtifactRetention", "RetentionTag", "ErasureProof"],
    "TRANSITION_CONFIG_VERSION": ["ConfigVersion"],
    "TRANSITION_CONFIG_CHANGE_REQUEST": ["ConfigChangeRequest"],
    "TRANSITION_SOURCE_COLLECTION_RUN": ["SourceCollectionRun"],
    "BUILD_SNAPSHOT": ["Snapshot"],
    "VALIDATE": ["Snapshot"],
    "MEASURE_COMPLETENESS": ["Snapshot"],
    "SCORE_GRAPH_QUALITY": ["EvidenceGraph"],
    "COMPUTE_OUTCOME": ["ComputeResult"],
    "FORECAST": ["ForecastSet"],
    "SCORE_RISK": ["RiskReport"],
    "EVALUATE_PARITY": ["ParityResult"],
    "RETENTION_EVIDENCE_GATE": ["GateDecisionRecord", "ProofBundle"],
    "PARITY_GATE": ["GateDecisionRecord", "ParityResult"],
    "LOAD_OVERRIDES": ["AcceptedRiskApproval"],
    "EXTRACT_AUTHORITY_VIEWS": ["AuthorityTruthContract"],
    "LOAD_AUTHORITY_STATE": ["AuthorityTruthContract", "SubmissionRecord"],
    "EXECUTE_AUTHORITY_CALCULATION_FLOW": [
        "AuthorityCalculationReadinessContext",
        "AuthorityCalculationRequest",
        "AuthorityCalculationResult",
        "CalculationBasis",
        "CalculationUserConfirmation",
    ],
    "APPROVAL_STATE": ["ClientApprovalPack"],
    "DECLARED_BASIS_ACK_STATE": ["FilingPacket"],
    "DERIVE_REQUIRED_HUMAN_STEPS": ["WorkflowItem"],
    "DERIVE_PACKET_NOTICE_STEPS": ["FilingNoticeStep"],
    "VALIDATE_OVERRIDE_DEPENDENCIES": ["AcceptedRiskApproval"],
    "ASSESS_TRUST_INPUT_STATE": ["TrustSummary"],
    "BUILD_GATE_EXPLANATION": ["GateDecisionRecord"],
    "SYNTHESIZE_TRUST": ["TrustSummary"],
    "TRUST_GATE": ["GateDecisionRecord", "TrustSummary"],
    "BUILD_EVIDENCE_GRAPH": ["EvidenceGraph", "ProofBundle"],
    "GET_PROVENANCE": ["ProvenancePath"],
    "GENERATE_ENQUIRY_PACK": ["EnquiryPack"],
    "BUILD_TWIN_VIEW": ["TwinView"],
    "ASSEMBLE_TWIN_STATE_SNAPSHOT": ["TwinStateSnapshot"],
    "COMPUTE_TWIN_DELTA_SET": ["TwinDeltaArc"],
    "SUMMARIZE_TWIN_MISMATCHES": ["TwinMismatchSummary"],
    "DERIVE_TWIN_READINESS": ["TwinReadinessState"],
    "UPSERT_WORKFLOW_ITEMS": ["WorkflowItem"],
    "EMIT_WORKFLOW_ITEM": ["WorkflowItem", "WorkItemNotification"],
    "BUILD_LIVE_EXPERIENCE_FRAME": ["LowNoiseExperienceFrame", "ExperienceDelta"],
    "BUILD_CONTEXT_BAR_STATE": ["ContextBarState"],
    "BUILD_DECISION_SUMMARY_STATE": ["DecisionSummaryState"],
    "BUILD_ACTION_STRIP_STATE": ["ActionStripState"],
    "BUILD_DETAIL_DRAWER_STATE": ["DetailDrawerState"],
    "BUILD_CLIENT_PORTAL_WORKSPACE": ["ClientPortalWorkspace"],
    "BUILD_TENANT_GOVERNANCE_SNAPSHOT": ["TenantGovernanceSnapshot"],
    "BUILD_FILING_PACKET": ["FilingPacket"],
    "RESOLVE_FILING_NOTICES": ["FilingNoticeResolution"],
    "APPROVE_FILING_PACKET": ["FilingPacket"],
    "UPSERT_FILING_CASE": ["FilingCase"],
    "FILING_GATE": ["GateDecisionRecord", "FilingPacket"],
    "CONSTRUCT_AMENDMENT_BUNDLE": ["AmendmentBundle"],
    "RESOLVE_AUTHORITY_OPERATION": ["AuthorityOperation"],
    "RESOLVE_AUTHORITY_BINDING": ["AuthorityBinding"],
    "CANONICALIZE_AUTHORITY_REQUEST": ["AuthorityRequestEnvelope"],
    "DERIVE_AUTHORITY_REQUEST_HASHES": ["AuthorityRequestIdentityContract"],
    "BUILD_AUTHORITY_REQUEST_ENVELOPE": ["AuthorityRequestEnvelope"],
    "SUBMISSION_GATE": ["GateDecisionRecord", "SubmissionRecord"],
    "BEGIN_SUBMISSION_RECORD": ["SubmissionRecord"],
    "TRANSITION_SUBMISSION_RECORD": ["SubmissionRecord"],
    "TRANSITION_FILING_PACKET": ["FilingPacket"],
    "WAIT_FOR_TRANSMIT_OR_RECONCILIATION": ["SubmissionRecord", "AuthorityInteractionRecord"],
    "RECONCILE_AUTHORITY_STATE": ["SubmissionRecord", "ObligationMirror", "AuthorityTruthContract"],
    "UPSERT_OBLIGATION_MIRROR": ["ObligationMirror"],
    "SELECT_DRIFT_BASELINE": ["DriftBaselineEnvelope"],
    "ANALYZE_RETROACTIVE_IMPACT": ["RetroactiveImpactAnalysis"],
    "DETECT_DRIFT": ["DriftRecord"],
    "MATERIALIZE_AMENDMENT_WINDOW_CONTEXT": ["AmendmentWindowContext"],
    "EVALUATE_AMENDMENT_ELIGIBILITY": ["AmendmentEligibilityContract", "AmendmentCase"],
    "UPSERT_AMENDMENT_CASE": ["AmendmentCase"],
    "AMENDMENT_GATE": ["GateDecisionRecord", "AmendmentCase"],
    "RUN_NIGHTLY_AUTOPILOT": ["NightlyBatchRun", "OperatorMorningDigest"],
    "SELECT_NIGHTLY_PORTFOLIO": ["NightlyBatchRun", "RunManifest"],
    "PLAN_NIGHTLY_SHARDS": ["NightlyBatchRun"],
    "EXECUTE_NIGHTLY_CLIENT_ATTEMPT": ["RunManifest", "NightlyBatchRun"],
}
HELPER_CLASS_OVERRIDES = {
    "BEGIN_ATOMIC_TRANSACTION": ("primitive_transaction", "Atomic transaction primitive used directly in `core_engine.md`."),
    "COMMIT_ATOMIC_TRANSACTION": ("primitive_transaction", "Atomic transaction primitive used directly in `core_engine.md`."),
    "ROLLBACK_ATOMIC_TRANSACTION": ("primitive_transaction", "Atomic transaction primitive used directly in `core_engine.md`."),
    "HASH": ("builtin_primitive", "Deterministic hash primitive, not a named module heading."),
    "ASSERT": ("builtin_primitive", "Assertion shorthand used in pseudocode, not a named module heading."),
    "ERROR": ("builtin_primitive", "Error-return shorthand used in pseudocode, not a named module heading."),
    "NOOP": ("builtin_primitive", "Explicit no-op shorthand used in pseudocode, not a named module heading."),
}


@dataclass(frozen=True)
class RawHeadingEntry:
    heading_index: int
    line_number: int
    heading_text: str
    module_names: tuple[str, ...]
    body_lines: tuple[str, ...]

    def heading_ref(self) -> str:
        slug = re.sub(r"[^a-z0-9]+", "-", self.heading_text.lower()).strip("-")
        return f"{MODULES_PATH}#{slug}"


@dataclass
class ModuleRecord:
    module_name: str
    defined_in: str
    source_heading_or_logical_block: str
    module_family: str
    semantic_role: str
    inputs: list[str]
    outputs: list[str]
    stateful_side_effects: list[str]
    artifact_writes: list[str]
    audit_event_emissions: list[str]
    state_transition_impacts: list[str]
    external_boundary_crossing: str
    purity_class: str
    run_phase_bindings: list[dict[str, Any]]
    upstream_dependencies: list[str]
    downstream_dependents: list[str]
    related_schemas: list[str]
    related_artifacts: list[str]
    performance_notes: str
    security_notes: str
    notes: list[str]
    source_heading_refs: list[str]
    raw_heading_indexes: list[int]
    callsite_count: int
    input_objects: list[str]
    output_objects: list[str]

    def to_dict(self) -> dict[str, Any]:
        return {
            "module_name": self.module_name,
            "defined_in": self.defined_in,
            "source_heading_or_logical_block": self.source_heading_or_logical_block,
            "module_family": self.module_family,
            "semantic_role": self.semantic_role,
            "inputs": self.inputs,
            "outputs": self.outputs,
            "stateful_side_effects": self.stateful_side_effects,
            "artifact_writes": self.artifact_writes,
            "audit_event_emissions": self.audit_event_emissions,
            "state_transition_impacts": self.state_transition_impacts,
            "external_boundary_crossing": self.external_boundary_crossing,
            "purity_class": self.purity_class,
            "run_phase_bindings": self.run_phase_bindings,
            "upstream_dependencies": self.upstream_dependencies,
            "downstream_dependents": self.downstream_dependents,
            "related_schemas": self.related_schemas,
            "related_artifacts": self.related_artifacts,
            "performance_notes": self.performance_notes,
            "security_notes": self.security_notes,
            "notes": self.notes,
            "source_heading_refs": self.source_heading_refs,
            "raw_heading_indexes": self.raw_heading_indexes,
            "callsite_count": self.callsite_count,
        }


def repo_rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def snake_case(text: str) -> str:
    text = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", text)
    text = re.sub(r"[^A-Za-z0-9]+", "_", text)
    return text.strip("_").lower()


def line_ref(path: str, line_number: int, label: str) -> str:
    safe_label = re.sub(r"[^A-Za-z0-9_.-]+", "_", label).strip("_") or "line"
    return f"{path}::L{line_number}[{safe_label}]"


def json_write(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")


def write_jsonl(path: Path, rows: Iterable[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w") as handle:
        for row in rows:
            handle.write(json.dumps(row, sort_keys=True))
            handle.write("\n")


def ordered_unique(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if not value or value in seen:
            continue
        seen.add(value)
        result.append(value)
    return result


def expand_heading_names(heading_text: str) -> list[str]:
    without_args = heading_text.replace("(...)","")
    parts = [part.strip() for part in without_args.split("/")]
    return [part for part in parts if re.fullmatch(r"[A-Z][A-Z0-9_]+", part)]


def parse_module_headings() -> list[RawHeadingEntry]:
    lines = (ALGORITHM_DIR / "modules.md").read_text().splitlines()
    entries: list[RawHeadingEntry] = []
    index = 0
    while index < len(lines):
        match = HEADING_RE.match(lines[index])
        if not match:
            index += 1
            continue
        heading_text = match.group(1).strip()
        module_names = expand_heading_names(heading_text)
        if not module_names:
            index += 1
            continue
        start = index + 1
        end = start
        while end < len(lines):
            next_match = HEADING_RE.match(lines[end])
            if next_match and expand_heading_names(next_match.group(1).strip()):
                break
            end += 1
        entries.append(
            RawHeadingEntry(
                heading_index=len(entries) + 1,
                line_number=index + 1,
                heading_text=heading_text,
                module_names=tuple(module_names),
                body_lines=tuple(lines[start:end]),
            )
        )
        index = end
    return entries


def parse_data_model_objects() -> tuple[list[str], dict[str, str], list[str]]:
    text = (ALGORITHM_DIR / "data_model.md").read_text().splitlines()
    object_names: list[str] = []
    for line in text:
        match = OBJECT_BULLET_RE.match(line.strip())
        if match:
            object_names.append(match.group(1))
    object_names = ordered_unique(object_names)
    schema_paths = sorted((ALGORITHM_DIR / "schemas").glob("*.schema.json"))
    schema_lookup = {path.stem.replace(".schema", ""): repo_rel(path) for path in schema_paths}
    object_to_schema: dict[str, str] = {}
    for object_name in object_names:
        key = snake_case(object_name)
        if key in schema_lookup:
            object_to_schema[object_name] = schema_lookup[key]
    return object_names, object_to_schema, list(schema_lookup.values())


def parse_state_machine_objects() -> list[str]:
    names: list[str] = []
    for line in (ALGORITHM_DIR / "state_machines.md").read_text().splitlines():
        match = STATE_MACHINE_HEADING_RE.match(line.strip())
        if match:
            names.append(match.group(1))
    return ordered_unique(names)


def load_swimlane_data() -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]]]:
    phase_index = json.loads(SWIMLANE_PHASE_INDEX_PATH.read_text())
    step_rows = [json.loads(line) for line in SWIMLANE_STEP_LEDGER_PATH.read_text().splitlines() if line.strip()]
    phase_map = {phase["phase_id"]: phase for phase in phase_index["phases"]}
    return step_rows, phase_map


def extract_labeled_blocks(lines: Iterable[str]) -> dict[str, list[str]]:
    blocks: dict[str, list[str]] = defaultdict(list)
    current_label: str | None = None
    for raw_line in lines:
        stripped = raw_line.rstrip()
        match = LABEL_RE.match(stripped.strip())
        if match:
            current_label = match.group(1).lower().replace(" ", "_").replace("/", "_")
            remainder = match.group(2).strip()
            if remainder:
                blocks[current_label].append(remainder)
            continue
        if current_label is not None:
            blocks[current_label].append(stripped)
    return blocks


def compact_items(lines: Iterable[str]) -> list[str]:
    items: list[str] = []
    current: str | None = None
    for raw_line in lines:
        stripped = raw_line.strip()
        if not stripped:
            if current:
                items.append(current.strip())
                current = None
            continue
        if stripped.startswith("- "):
            if current:
                items.append(current.strip())
            current = stripped[2:].strip()
            continue
        if current is None:
            current = stripped
        else:
            current = f"{current} {stripped}"
    if current:
        items.append(current.strip())

    normalized: list[str] = []
    for item in items:
        if ";" in item and not item.startswith("`"):
            parts = [part.strip() for part in item.split(";") if part.strip()]
            if len(parts) > 1:
                normalized.extend(parts)
                continue
        normalized.append(item)
    return ordered_unique(normalized)


def section_goal_text(blocks: dict[str, list[str]]) -> str:
    goal = " ".join(line.strip() for line in blocks.get("goal", []) if line.strip())
    return re.sub(r"\s+", " ", goal).strip().rstrip(".")


def extract_schema_refs(text: str) -> list[str]:
    return ordered_unique(f"Algorithm/schemas/{stem}.schema.json" for stem in SCHEMA_RE.findall(text))


def contains_token(name: str, tokens: Iterable[str]) -> bool:
    return any(token in name for token in tokens)


def contains_whole_word(text: str, token: str) -> bool:
    return re.search(rf"\b{re.escape(token)}\b", text) is not None


def contains_any_whole_word(text: str, tokens: Iterable[str]) -> bool:
    return any(contains_whole_word(text, token) for token in tokens)


def has_side_effect_verb(text: str) -> bool:
    return SIDE_EFFECT_VERB_RE.search(text) is not None


def infer_family(name: str, text: str, run_phase_bindings: list[dict[str, Any]]) -> str:
    dominant_lane = None
    if run_phase_bindings:
        lane_counts = Counter(binding["primary_lane"] for binding in run_phase_bindings)
        dominant_lane = lane_counts.most_common(1)[0][0]

    if name in FORCED_FAMILY:
        return FORCED_FAMILY[name]
    if "NIGHTLY" in name or "BATCH" in name:
        return "nightly"
    if any(token in name for token in ["REPLAY", "RECOVER", "RECOVERY", "RECLAIM", "ATTESTATION"]):
        return "replay"
    if name in EVENT_EMITTERS or any(token in name for token in ["AUDIT", "OBSERVABILITY", "TRACE", "METRIC", "LOG_"]):
        return "observability"
    if contains_token(name, READ_MODEL_NAME_TOKENS):
        return "read_model"
    if name.startswith("BUILD_") and (contains_token(name, EXPERIENCE_NAME_TOKENS) or name.endswith("_STATE")):
        return "experience_projection"
    if name.endswith("_GATE") or "GATE" in name:
        return "gate"
    if any(token in name for token in ["AUTHORITY", "TRANSMIT", "SUBMISSION", "RECONCILE", "CALCULATION"]):
        return "authority"
    if any(token in name for token in ["FILING", "PACKET", "DECLARED_BASIS", "NOTICE"]):
        return "filing"
    if any(token in name for token in ["DRIFT", "AMENDMENT", "RETROACTIVE", "BASELINE"]):
        return "drift_amendment"
    if any(token in name for token in ["TRUST", "WORKFLOW", "OVERRIDE", "APPROVAL"]):
        return "workflow"
    if any(token in name for token in ["TWIN"]):
        return "twin"
    if any(token in name for token in ["GRAPH", "PROVENANCE", "PROOF", "ENQUIRY"]):
        return "graph"
    if any(token in name for token in ["COMPUTE", "FORECAST", "RISK", "PARITY", "VALIDATE", "MEASURE_COMPLETENESS", "SEED"]):
        return "compute"
    if any(token in name for token in ["SOURCE", "COLLECT", "WINDOW", "MISSING_SOURCES", "STALE_SOURCES", "LATE_DATA"]):
        return "collection"
    if any(token in name for token in ["CANDIDATE", "CANONICAL", "CONFLICT", "ARTIFACT_SET", "NORMALIZATION", "EVIDENCE"]):
        return "canonicalization"
    if any(token in name for token in ["CONFIG", "FREEZE", "INPUT_SET", "SCHEMA_BUNDLE", "EXECUTION_BASIS"]):
        return "freeze"
    if any(token in name for token in ["MANIFEST", "LINEAGE", "CONTINUATION", "DECISION_BUNDLE"]):
        return "manifest"
    if any(token in name for token in ["RETENTION", "ERASURE"]):
        return "retention"
    if name == "AUTHORIZE" or "requested_scope[]" in text or "access_binding_hash" in text:
        return "authorization"

    lane_to_family = {
        "CALLER_AND_SCOPE": "authorization",
        "AUTHORIZATION": "authorization",
        "MANIFEST_AND_LINEAGE": "manifest",
        "CONFIG_AND_FREEZE": "freeze",
        "SOURCE_COLLECTION_AND_CANONICALIZATION": "collection",
        "PRESEAL_GATES": "gate",
        "POSTSEAL_DAG": "compute",
        "AUTHORITY_CONTEXT": "authority",
        "DRIFT_AND_AMENDMENT": "drift_amendment",
        "TRUST_AND_WORKFLOW": "workflow",
        "FILING_AND_SUBMISSION": "filing",
        "LIVE_EXPERIENCE": "experience_projection",
        "RETENTION_AND_TERMINALIZATION": "retention",
    }
    if dominant_lane is not None:
        return lane_to_family[dominant_lane]
    return "misc"


def infer_external_boundary(name: str, text: str, family: str) -> str:
    if family in {"read_model", "experience_projection"}:
        return "none"

    lower_text = text.lower()
    upper_text = text.upper()
    if name in PASSIVE_AUTHORITY_MODULES:
        return "none"
    if (
        any(fragment in name for fragment in AUTHORITY_TRANSPORT_NAME_FRAGMENTS)
        or any(phrase in lower_text for phrase in AUTHORITY_TRANSPORT_TEXT_PHRASES)
        or (
            family == "authority"
            and contains_any_whole_word(upper_text, ("AUTHORITY",))
            and any(
                phrase in lower_text
                for phrase in ("request envelope", "submission path", "live authority", "callback", "poll")
            )
        )
    ):
        return "authority"
    if contains_any_whole_word(name, EXTERNAL_BOUNDARY_TOKENS["browser_handoff"]) or contains_any_whole_word(
        upper_text, EXTERNAL_BOUNDARY_TOKENS["browser_handoff"]
    ):
        return "browser_handoff"
    if contains_any_whole_word(name, EXTERNAL_BOUNDARY_TOKENS["notification"]):
        return "notification"
    if name.startswith(("WRITE_", "PERSIST_")):
        return "storage"
    if name.startswith("LOAD_") and family in STORAGE_LOAD_FAMILIES:
        return "storage"
    return "none"


def infer_purity(name: str, text: str, family: str, boundary: str) -> str:
    lower_text = text.lower()
    if name in EVENT_EMITTERS or name.startswith("EMIT_"):
        return "event_emitter"
    if name in ARTIFACT_PERSISTERS or name.startswith(("WRITE_", "PERSIST_")):
        return "artifact_persister"
    if boundary in {"authority", "browser_handoff", "notification"}:
        return "external_transport"
    if name.startswith(STATE_MUTATOR_PREFIXES) or "persist the" in lower_text:
        if "event" in lower_text or "audit" in lower_text:
            return "mixed"
        return "state_mutator"
    if name.startswith(("NORMALIZE_", "TRIM_", "FILTER_")):
        return "pure_transform"
    if name.startswith("RUN_") and any(token in name for token in ("HARNESS", "PACK")):
        return "deterministic_builder"
    if family == "experience_projection" or family == "read_model":
        return "projection_builder"
    if family == "gate":
        return "deterministic_builder"
    if (
        family in {"compute", "graph", "twin"}
        or name.startswith("BUILD_")
        or name.startswith("COMPUTE_")
        or name.startswith("DERIVE_")
        or name.startswith("SELECT_")
        or name.startswith("CLASSIFY_")
        or name.startswith("EVALUATE_")
        or name.startswith("ASSEMBLE_")
        or name.startswith("PLAN_")
        or name.startswith("SUMMARIZE_")
        or name.startswith("SYNTHESIZE_")
    ):
        return "deterministic_builder"
    if (
        name.startswith("LOAD_")
        or name.startswith("VALIDATE_")
        or name.startswith("MEASURE_")
        or name.startswith("SCORE_")
        or name.startswith("CANONICALIZE_")
        or name.startswith("EXTRACT_")
        or name.startswith("RESOLVE_")
        or name.startswith("GET_")
        or name.startswith("FILTER_")
    ):
        return "pure_transform"
    if not has_side_effect_verb(lower_text):
        if name.startswith(("NORMALIZE_", "TRIM_", "FILTER_")) or name.endswith("_STATUS"):
            return "pure_transform"
        return "deterministic_builder"
    return "mixed"


def extract_objects(text: str, object_names: Iterable[str], module_name: str) -> list[str]:
    found: list[str] = []
    for object_name in object_names:
        if re.search(rf"\b{re.escape(object_name)}\b", text):
            found.append(object_name)
    found.extend(OBJECT_OVERRIDES.get(module_name, []))
    return ordered_unique(found)


def infer_state_transitions(
    name: str,
    text: str,
    related_artifacts: list[str],
    state_machine_objects: list[str],
) -> list[str]:
    impacts: list[str] = []
    for object_name in related_artifacts:
        if object_name in state_machine_objects and ("lifecycle_state" in text or name.startswith(STATE_MUTATOR_PREFIXES)):
            impacts.append(f"{object_name}.lifecycle_state")
    if name.startswith("TRANSITION_"):
        suffix = name.replace("TRANSITION_", "")
        for object_name in state_machine_objects:
            if snake_case(object_name).upper() == suffix:
                impacts.append(f"{object_name}.lifecycle_state")
    if name.startswith("FINALIZE_"):
        impacts.append("RunManifest.lifecycle_state")
    if name in {"BEGIN_MANIFEST", "BEGIN_CHILD_MANIFEST", "CLAIM_MANIFEST_START", "SEAL_MANIFEST"}:
        impacts.append("RunManifest.lifecycle_state")
    return ordered_unique(impacts)


def infer_artifact_writes(
    name: str,
    outputs: list[str],
    related_artifacts: list[str],
    purity: str,
) -> list[str]:
    if name == "WRITE_ARTIFACT":
        return ["Dynamic caller-supplied first-class artifact"]
    if purity not in {"artifact_persister", "state_mutator", "mixed"}:
        return []
    output_objects = [item for item in related_artifacts if item in " ".join(outputs)]
    if output_objects:
        return ordered_unique(output_objects)
    if related_artifacts:
        return ordered_unique(related_artifacts[:4])
    if name.startswith("PERSIST_"):
        return ["Dynamic persisted artifact set"]
    return []


def infer_audit_emissions(name: str, text: str, known_event_codes: set[str]) -> list[str]:
    if name == "RECORD_EVENT":
        return ["Dynamic caller-supplied manifest or protocol event"]
    if name in {"EMIT_AUDIT_EVENT", "RECORD_OBSERVABILITY"}:
        return ["Audit or observability emission"]
    found = [event_code for event_code in known_event_codes if re.search(rf"\b{re.escape(event_code)}\b", text)]
    return sorted(found)


def infer_side_effects(
    purity: str,
    boundary: str,
    related_artifacts: list[str],
    state_transition_impacts: list[str],
    audit_events: list[str],
) -> list[str]:
    notes: list[str] = []
    if purity == "artifact_persister":
        notes.append(
            f"Persists durable artifact state for {', '.join(related_artifacts[:4]) if related_artifacts else 'caller-supplied artifacts'}."
        )
    if purity == "state_mutator":
        notes.append(
            f"Mutates durable lifecycle or control state for {', '.join(related_artifacts[:4]) if related_artifacts else 'governed entities'}."
        )
    if purity == "event_emitter":
        notes.append("Emits audit or observability events without directly widening domain state.")
    if purity == "projection_builder":
        notes.append("Builds read-side or shell projection state only; command-side truth must already exist.")
    if purity == "external_transport":
        notes.append(f"Crosses the `{boundary}` boundary under governed transport or reconciliation rules.")
    if purity == "mixed":
        notes.append("Combines durable state work with additional event, artifact, or orchestration consequences.")
    if state_transition_impacts:
        notes.append(f"Touches lifecycle law for {', '.join(state_transition_impacts[:4])}.")
    if audit_events and purity != "event_emitter":
        notes.append(f"Explicitly references audit outcomes {', '.join(audit_events[:4])}.")
    return ordered_unique(notes)


def performance_note(family: str, purity: str, boundary: str) -> str:
    if boundary == "authority":
        return "Authority-facing transport must stay idempotent, bounded by inline budgets, and recovery-aware."
    if purity == "projection_builder":
        return "Read-side projection work should remain cacheable and may complete after command-side truth persists."
    if purity in {"artifact_persister", "state_mutator", "mixed"}:
        return "Durability ordering matters; transactional persistence and deterministic sort order are required."
    return "Deterministic over frozen inputs; suitable for static reasoning and replay-safe recomputation."


def security_note(family: str, boundary: str, purity: str) -> str:
    if boundary == "authority":
        return "Must preserve `access_binding_hash`, authority-link posture, and never widen scope or resend blindly."
    if family in {"read_model", "experience_projection"}:
        return "Must preserve customer-safe visibility, masking posture, and shell continuity without write-side side effects."
    if purity in {"artifact_persister", "state_mutator", "mixed"}:
        return "Must fail closed and preserve immutable lineage, audit refs, and partition isolation."
    return "Consumes only authorized, frozen, and partition-safe inputs; no local scope widening is permitted."


def find_input_output_objects(items: Iterable[str], object_names: Iterable[str]) -> list[str]:
    text = " ".join(items)
    return extract_objects(text, object_names, module_name="")


def build_callsite_rows(step_rows: list[dict[str, Any]], phase_map: dict[str, dict[str, Any]]) -> tuple[list[dict[str, Any]], dict[str, list[dict[str, Any]]], list[dict[str, Any]]]:
    callsite_rows: list[dict[str, Any]] = []
    run_bindings: dict[str, list[dict[str, Any]]] = defaultdict(list)
    helper_rows: list[dict[str, Any]] = []
    for step in step_rows:
        phase = phase_map[step["phase_id"]]
        for module_name in step["module_calls"]:
            row = {
                "call_name": module_name,
                "resolution": "module",
                "phase_id": step["phase_id"],
                "phase_name": phase["phase_name"],
                "ordered_index": phase["ordered_index"],
                "step_id": step["row_id"],
                "step_order": step["step_order"],
                "source_line_start": step["source_line_start"],
                "source_line_end": step["source_line_end"],
                "primary_lane": step["primary_lane"],
                "statement_kind": step["statement_kind"],
                "statement": step["statement"],
                "source_heading_or_logical_block": phase["source_heading_or_logical_block"],
            }
            callsite_rows.append(row)
            run_bindings[module_name].append(row)
        for helper in step["helper_calls"]:
            helper_row = {
                "call_name": helper["call_name"],
                "resolution": "helper",
                "phase_id": step["phase_id"],
                "phase_name": phase["phase_name"],
                "ordered_index": phase["ordered_index"],
                "step_id": step["row_id"],
                "step_order": step["step_order"],
                "source_line_start": step["source_line_start"],
                "source_line_end": step["source_line_end"],
                "primary_lane": step["primary_lane"],
                "statement_kind": step["statement_kind"],
                "statement": step["statement"],
                "classification": HELPER_CLASS_OVERRIDES.get(helper["call_name"], ("orchestrator_helper", helper.get("reason", "Helper outside modules.md")))[0],
                "rationale": HELPER_CLASS_OVERRIDES.get(helper["call_name"], ("orchestrator_helper", helper.get("reason", "Helper outside modules.md")))[1],
            }
            helper_rows.append(helper_row)
            callsite_rows.append(helper_row)
    return callsite_rows, run_bindings, helper_rows


def build_module_records(
    raw_entries: list[RawHeadingEntry],
    step_rows: list[dict[str, Any]],
    phase_map: dict[str, dict[str, Any]],
) -> tuple[list[ModuleRecord], list[dict[str, Any]], dict[str, list[dict[str, Any]]]]:
    object_names, object_to_schema, schema_paths = parse_data_model_objects()
    state_machine_objects = parse_state_machine_objects()
    known_event_codes = {
        row["event_code"]
        for row in csv.DictReader((DATA_ANALYSIS_DIR / "run_engine_event_timeline.csv").open())
    }
    callsite_rows, run_bindings, helper_rows = build_callsite_rows(step_rows, phase_map)

    grouped_entries: dict[str, list[RawHeadingEntry]] = defaultdict(list)
    for entry in raw_entries:
        for module_name in entry.module_names:
            grouped_entries[module_name].append(entry)

    records: list[ModuleRecord] = []
    for module_name in sorted(grouped_entries):
        entries = grouped_entries[module_name]
        preferred_entry = next((entry for entry in entries if entry.module_names == (module_name,)), entries[0])
        blocks = extract_labeled_blocks(line for entry in entries for line in entry.body_lines)
        goal = section_goal_text(blocks)
        inputs = compact_items(blocks.get("input", []))
        outputs = compact_items(blocks.get("output", []))
        merged_text = "\n".join(
            [entry.heading_text for entry in entries]
            + [line for entry in entries for line in entry.body_lines]
        )
        run_phase_bindings = [
            {
                "phase_id": row["phase_id"],
                "phase_name": row["phase_name"],
                "ordered_index": row["ordered_index"],
                "step_id": row["step_id"],
                "step_order": row["step_order"],
                "source_line_start": row["source_line_start"],
                "source_line_end": row["source_line_end"],
                "primary_lane": row["primary_lane"],
            }
            for row in run_bindings.get(module_name, [])
        ]
        family = infer_family(module_name, merged_text, run_phase_bindings)
        boundary = infer_external_boundary(module_name, merged_text, family)
        purity = infer_purity(module_name, merged_text, family, boundary)
        related_artifacts = extract_objects(merged_text, object_names, module_name)
        related_schemas = ordered_unique(
            extract_schema_refs(merged_text)
            + [object_to_schema[name] for name in related_artifacts if name in object_to_schema]
        )
        state_impacts = infer_state_transitions(module_name, merged_text, related_artifacts, state_machine_objects)
        audit_emissions = infer_audit_emissions(module_name, merged_text, known_event_codes)
        artifact_writes = infer_artifact_writes(module_name, outputs, related_artifacts, purity)
        stateful_side_effects = infer_side_effects(purity, boundary, related_artifacts, state_impacts, audit_emissions)
        input_objects = ordered_unique(find_input_output_objects(inputs, object_names))
        output_objects = ordered_unique(
            find_input_output_objects(outputs, object_names)
            + [item for item in artifact_writes if item in object_names]
            + (
                related_artifacts
                if module_name.startswith(("BUILD_", "COMPUTE_", "DERIVE_", "ASSEMBLE_", "SUMMARIZE_", "SYNTHESIZE_"))
                else []
            )
        )
        notes = []
        if len(entries) > 1:
            notes.append(
                f"Merged {len(entries)} source heading blocks, including composite heading notation in `modules.md`."
            )
        if preferred_entry.heading_text != f"{module_name}(...)":
            notes.append(
                f"Primary source heading is composite or shared: `{preferred_entry.heading_text}`."
            )
        if family in EXPLICIT_SOURCE_REFS:
            notes.append(
                "Related bounded-domain contracts: "
                + ", ".join(EXPLICIT_SOURCE_REFS[family])
            )
        records.append(
            ModuleRecord(
                module_name=module_name,
                defined_in=MODULES_PATH,
                source_heading_or_logical_block=line_ref(MODULES_PATH, preferred_entry.line_number, preferred_entry.heading_text),
                module_family=family,
                semantic_role=goal or f"Named procedure `{module_name}` from the module contract catalog.",
                inputs=inputs,
                outputs=outputs,
                stateful_side_effects=stateful_side_effects,
                artifact_writes=artifact_writes,
                audit_event_emissions=audit_emissions,
                state_transition_impacts=state_impacts,
                external_boundary_crossing=boundary,
                purity_class=purity,
                run_phase_bindings=run_phase_bindings,
                upstream_dependencies=[],
                downstream_dependents=[],
                related_schemas=related_schemas,
                related_artifacts=related_artifacts,
                performance_notes=performance_note(family, purity, boundary),
                security_notes=security_note(family, boundary, purity),
                notes=notes,
                source_heading_refs=[entry.heading_ref() for entry in entries],
                raw_heading_indexes=[entry.heading_index for entry in entries],
                callsite_count=len(run_phase_bindings),
                input_objects=input_objects,
                output_objects=output_objects,
            )
        )
    return records, helper_rows, run_bindings


def make_dependency_type(
    source: ModuleRecord,
    target: ModuleRecord,
    shared_outputs: list[str],
    run_related: bool,
) -> str:
    if source.external_boundary_crossing != "none" or target.external_boundary_crossing != "none":
        if shared_outputs or source.external_boundary_crossing == "authority" or target.external_boundary_crossing == "authority":
            return "external_boundary_dependency"
    if source.state_transition_impacts and set(source.state_transition_impacts) & set(target.state_transition_impacts):
        return "state_transition_dependency"
    if shared_outputs:
        return "artifact_availability_dependency"
    if run_related:
        return "control_flow_dependency"
    return "parameter_data_dependency"


def build_dependency_edges(records: list[ModuleRecord], run_bindings: dict[str, list[dict[str, Any]]]) -> list[dict[str, Any]]:
    record_by_name = {record.module_name: record for record in records}
    edges: dict[tuple[str, str, str], dict[str, Any]] = {}

    def register(
        upstream: str,
        downstream: str,
        dependency_type: str,
        rationale: str,
        source_ref: str,
        shared_artifacts: Iterable[str] = (),
        run_phase_context: str | None = None,
    ) -> None:
        if upstream == downstream:
            return
        key = (upstream, downstream, dependency_type)
        if key not in edges:
            edges[key] = {
                "upstream_module": upstream,
                "downstream_module": downstream,
                "dependency_type": dependency_type,
                "rationales": [],
                "source_refs": [],
                "shared_artifacts": [],
                "run_phase_contexts": [],
            }
        row = edges[key]
        row["rationales"] = ordered_unique(list(row["rationales"]) + [rationale])
        row["source_refs"] = ordered_unique(list(row["source_refs"]) + [source_ref])
        row["shared_artifacts"] = ordered_unique(list(row["shared_artifacts"]) + list(shared_artifacts))
        if run_phase_context:
            row["run_phase_contexts"] = ordered_unique(list(row["run_phase_contexts"]) + [run_phase_context])

    canonical_names = {record.module_name for record in records}

    # Explicit contract references inside the module body.
    text_by_module: dict[str, str] = {}
    raw_entries = parse_module_headings()
    for module_name in canonical_names:
        sections = []
        for entry in raw_entries:
            if module_name in entry.module_names:
                sections.extend(entry.body_lines)
        text_by_module[module_name] = "\n".join(sections)

    for target in records:
        text = text_by_module[target.module_name]
        for referenced in ordered_unique(
            name for name in UPPER_CALL_RE.findall(text) if name in canonical_names and name != target.module_name
        ):
            source = record_by_name[referenced]
            shared = ordered_unique(set(source.output_objects) & set(target.input_objects))
            register(
                upstream=source.module_name,
                downstream=target.module_name,
                dependency_type=make_dependency_type(source, target, shared, run_related=False),
                rationale=f"`{target.module_name}` references `{source.module_name}` in its module contract body.",
                source_ref=target.source_heading_or_logical_block,
                shared_artifacts=shared,
            )

    # RUN_ENGINE adjacency edges.
    for module_name, bindings in run_bindings.items():
        bindings.sort(key=lambda row: (row["ordered_index"], row["step_order"], row["source_line_start"], row["call_name"]))

    phase_steps: dict[int, list[tuple[int, str, dict[str, Any]]]] = defaultdict(list)
    for module_name, bindings in run_bindings.items():
        for binding in bindings:
            phase_steps[binding["ordered_index"]].append((binding["step_order"], module_name, binding))

    for ordered_index, items in phase_steps.items():
        items.sort(key=lambda item: (item[0], item[2]["source_line_start"], item[1]))
        flattened = [(module_name, binding) for _step_order, module_name, binding in items]
        for (upstream, upstream_binding), (downstream, downstream_binding) in zip(flattened, flattened[1:]):
            source = record_by_name[upstream]
            target = record_by_name[downstream]
            shared = ordered_unique(set(source.output_objects) & set(target.input_objects))
            register(
                upstream=upstream,
                downstream=downstream,
                dependency_type=make_dependency_type(source, target, shared, run_related=True),
                rationale=(
                    f"Adjacent in `RUN_ENGINE(...)` phase `{upstream_binding['phase_id']}` "
                    f"between steps `{upstream_binding['step_id']}` and `{downstream_binding['step_id']}`."
                ),
                source_ref=CORE_ENGINE_PATH,
                shared_artifacts=shared,
                run_phase_context=f"{upstream_binding['phase_id']}::{upstream_binding['step_id']}->{downstream_binding['step_id']}",
            )

    # Producer/consumer edges from output objects to input objects.
    producers_by_object: dict[str, list[ModuleRecord]] = defaultdict(list)
    consumers_by_object: dict[str, list[ModuleRecord]] = defaultdict(list)
    for record in records:
        for object_name in record.output_objects:
            producers_by_object[object_name].append(record)
        for object_name in record.input_objects:
            consumers_by_object[object_name].append(record)
    for object_name, producers in producers_by_object.items():
        if object_name in GENERIC_SHARED_OBJECTS:
            continue
        consumers = consumers_by_object.get(object_name, [])
        if len(producers) > MAX_SHARED_OBJECT_FANOUT or len(consumers) > MAX_SHARED_OBJECT_FANOUT:
            continue
        for producer in producers:
            for consumer in consumers:
                if producer.module_name == consumer.module_name:
                    continue
                register(
                    upstream=producer.module_name,
                    downstream=consumer.module_name,
                    dependency_type=make_dependency_type(producer, consumer, [object_name], run_related=False),
                    rationale=f"`{producer.module_name}` produces or persists `{object_name}` consumed by `{consumer.module_name}`.",
                    source_ref=producer.source_heading_or_logical_block,
                    shared_artifacts=[object_name],
                )

    rows: list[dict[str, Any]] = []
    for index, ((upstream, downstream, dependency_type), row) in enumerate(sorted(edges.items()), start=1):
        rows.append(
            {
                "edge_id": f"E{index:04d}",
                "upstream_module": upstream,
                "downstream_module": downstream,
                "dependency_type": dependency_type,
                "rationale": " ".join(row["rationales"]),
                "source_refs": row["source_refs"],
                "shared_artifacts": row["shared_artifacts"],
                "run_phase_contexts": row["run_phase_contexts"],
            }
        )
    return rows


def write_edges_csv(edges: list[dict[str, Any]]) -> None:
    MODULE_EDGE_CSV_PATH.parent.mkdir(parents=True, exist_ok=True)
    with MODULE_EDGE_CSV_PATH.open("w", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "edge_id",
                "upstream_module",
                "downstream_module",
                "dependency_type",
                "rationale",
                "source_refs",
                "shared_artifacts",
                "run_phase_contexts",
            ],
        )
        writer.writeheader()
        for row in edges:
            writer.writerow(
                {
                    **row,
                    "source_refs": "; ".join(row["source_refs"]),
                    "shared_artifacts": "; ".join(row["shared_artifacts"]),
                    "run_phase_contexts": "; ".join(row["run_phase_contexts"]),
                }
            )


def build_unresolved_register(helper_rows: list[dict[str, Any]]) -> dict[str, Any]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in helper_rows:
        grouped[row["call_name"]].append(row)
    rows = []
    for call_name in sorted(grouped):
        entries = grouped[call_name]
        classification = entries[0]["classification"]
        rows.append(
            {
                "call_name": call_name,
                "classification": classification,
                "callsite_count": len(entries),
                "phase_ids": ordered_unique(entry["phase_id"] for entry in entries),
                "primary_lanes": ordered_unique(entry["primary_lane"] for entry in entries),
                "rationale": entries[0]["rationale"],
                "sample_callsite_refs": ordered_unique(
                    f"{entry['phase_id']}::{entry['step_id']}" for entry in entries[:5]
                ),
            }
        )
    return {
        "summary": {
            "unresolved_or_primitive_call_count": len(rows),
            "helper_classification_counts": dict(sorted(Counter(row["classification"] for row in rows).items())),
        },
        "rows": rows,
    }


def attach_dependency_lists(records: list[ModuleRecord], edges: list[dict[str, Any]]) -> None:
    upstreams: dict[str, set[str]] = defaultdict(set)
    downstreams: dict[str, set[str]] = defaultdict(set)
    for edge in edges:
        upstreams[edge["downstream_module"]].add(edge["upstream_module"])
        downstreams[edge["upstream_module"]].add(edge["downstream_module"])
    for record in records:
        record.upstream_dependencies = sorted(upstreams.get(record.module_name, set()))
        record.downstream_dependents = sorted(downstreams.get(record.module_name, set()))


def build_side_effect_matrix(records: list[ModuleRecord]) -> dict[str, Any]:
    return {
        "summary": {
            "module_count": len(records),
            "family_counts": dict(sorted(Counter(record.module_family for record in records).items())),
            "purity_counts": dict(sorted(Counter(record.purity_class for record in records).items())),
            "boundary_counts": dict(sorted(Counter(record.external_boundary_crossing for record in records).items())),
        },
        "modules": [
            {
                "module_name": record.module_name,
                "module_family": record.module_family,
                "purity_class": record.purity_class,
                "external_boundary_crossing": record.external_boundary_crossing,
                "stateful_side_effects": record.stateful_side_effects,
                "artifact_writes": record.artifact_writes,
                "audit_event_emissions": record.audit_event_emissions,
                "state_transition_impacts": record.state_transition_impacts,
                "related_artifacts": record.related_artifacts,
                "related_schemas": record.related_schemas,
            }
            for record in records
        ],
    }


def infer_touchpoint_roles(record: ModuleRecord) -> list[str]:
    roles: list[str] = []
    if any("validate against" in output.lower() for output in record.outputs) or "validate against" in record.semantic_role.lower():
        roles.append("validate")
    if record.purity_class in {"artifact_persister", "state_mutator", "mixed"}:
        roles.append("mutate")
    if record.purity_class in {"deterministic_builder", "projection_builder"}:
        roles.append("produce")
    if record.inputs:
        roles.append("consume")
    return ordered_unique(roles or ["consume"])


def build_schema_touchpoints(records: list[ModuleRecord]) -> dict[str, Any]:
    rows: list[dict[str, Any]] = []
    for record in records:
        if not record.related_schemas:
            continue
        roles = infer_touchpoint_roles(record)
        for schema_path in record.related_schemas:
            rows.append(
                {
                    "module_name": record.module_name,
                    "module_family": record.module_family,
                    "schema_path": schema_path,
                    "touchpoint_roles": roles,
                    "related_artifacts": record.related_artifacts,
                    "source_heading_or_logical_block": record.source_heading_or_logical_block,
                    "rationale": (
                        f"`{record.module_name}` references or implies `{schema_path}` through its contract text, "
                        f"outputs, or related artifacts."
                    ),
                }
            )
    return {
        "summary": {
            "touchpoint_row_count": len(rows),
            "module_count_with_schema_touchpoints": len({row["module_name"] for row in rows}),
            "schema_count": len({row["schema_path"] for row in rows}),
        },
        "rows": rows,
    }


def build_catalog_payload(raw_entries: list[RawHeadingEntry], records: list[ModuleRecord], edges: list[dict[str, Any]], helper_rows: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "summary": {
            "raw_heading_count": len(raw_entries),
            "canonical_module_count": len(records),
            "run_bound_module_count": sum(1 for record in records if record.callsite_count > 0),
            "dependency_edge_count": len(edges),
            "helper_call_count": len({row["call_name"] for row in helper_rows}),
            "family_counts": dict(sorted(Counter(record.module_family for record in records).items())),
            "purity_counts": dict(sorted(Counter(record.purity_class for record in records).items())),
        },
        "raw_heading_entries": [
            {
                "heading_index": entry.heading_index,
                "heading_text": entry.heading_text,
                "line_number": entry.line_number,
                "module_names": list(entry.module_names),
                "heading_ref": entry.heading_ref(),
            }
            for entry in raw_entries
        ],
        "modules": [record.to_dict() for record in records],
    }


def write_callsite_index(callsite_rows: list[dict[str, Any]]) -> None:
    write_jsonl(MODULE_CALLSITE_INDEX_PATH, callsite_rows)


def write_docs(catalog: dict[str, Any], edges: list[dict[str, Any]], side_effects: dict[str, Any], schema_touchpoints: dict[str, Any]) -> None:
    summary = catalog["summary"]
    records = catalog["modules"]
    edge_count = len(edges)
    unresolved = json.loads(UNRESOLVED_CALLS_PATH.read_text())

    module_doc_lines = [
        "# Module Catalog and Dependency Edges",
        "",
        "## Summary",
        "",
        f"- Raw `modules.md` heading blocks: `{summary['raw_heading_count']}`",
        f"- Canonical module records: `{summary['canonical_module_count']}`",
        f"- RUN_ENGINE-bound modules: `{summary['run_bound_module_count']}`",
        f"- Dependency edges: `{edge_count}`",
        f"- Unresolved or primitive RUN_ENGINE calls: `{unresolved['summary']['unresolved_or_primitive_call_count']}`",
        "",
        "## Family Counts",
        "",
        "| Family | Count |",
        "| --- | ---: |",
    ]
    for family, count in summary["family_counts"].items():
        module_doc_lines.append(f"| `{family}` | {count} |")
    module_doc_lines.extend(
        [
            "",
            "## Most Connected Modules",
            "",
            "| Module | Family | Upstream | Downstream | Purity | Boundary |",
            "| --- | --- | ---: | ---: | --- | --- |",
        ]
    )
    most_connected = sorted(
        records,
        key=lambda row: (len(row["upstream_dependencies"]) + len(row["downstream_dependents"]), row["module_name"]),
        reverse=True,
    )[:20]
    for row in most_connected:
        module_doc_lines.append(
            f"| `{row['module_name']}` | `{row['module_family']}` | {len(row['upstream_dependencies'])} | "
            f"{len(row['downstream_dependents'])} | `{row['purity_class']}` | `{row['external_boundary_crossing']}` |"
        )
    MODULE_DOC_PATH.write_text("\n".join(module_doc_lines) + "\n")

    phase_bind_lines = [
        "# Phase-to-Module Binding",
        "",
        "| Phase | Module Count | Dominant Families | Sample Modules |",
        "| --- | ---: | --- | --- |",
    ]
    phase_map = json.loads(SWIMLANE_PHASE_INDEX_PATH.read_text())["phases"]
    for phase in phase_map:
        phase_modules = [row for row in records if any(binding["phase_id"] == phase["phase_id"] for binding in row["run_phase_bindings"])]
        family_counts = Counter(module["module_family"] for module in phase_modules)
        dominant = ", ".join(f"{family}:{count}" for family, count in family_counts.most_common(3)) or "n/a"
        sample = ", ".join(module["module_name"] for module in sorted(phase_modules, key=lambda module: module["module_name"])[:8]) or "n/a"
        phase_bind_lines.append(
            f"| `{phase['phase_id']}` | {len(phase_modules)} | {dominant} | {sample} |"
        )
    PHASE_BINDING_DOC_PATH.write_text("\n".join(phase_bind_lines) + "\n")

    family_lines = [
        "# Module Families and Side-Effect Taxonomy",
        "",
        "## Purity Classes",
        "",
        "| Purity | Count |",
        "| --- | ---: |",
    ]
    for purity, count in side_effects["summary"]["purity_counts"].items():
        family_lines.append(f"| `{purity}` | {count} |")
    family_lines.extend(
        [
            "",
            "## Boundary Crossings",
            "",
            "| Boundary | Count |",
            "| --- | ---: |",
        ]
    )
    for boundary, count in side_effects["summary"]["boundary_counts"].items():
        family_lines.append(f"| `{boundary}` | {count} |")
    family_lines.extend(
        [
            "",
            "## Schema Touchpoint Totals",
            "",
            f"- Module records with schema touchpoints: `{schema_touchpoints['summary']['module_count_with_schema_touchpoints']}`",
            f"- Unique schemas touched: `{schema_touchpoints['summary']['schema_count']}`",
            f"- Total touchpoint rows: `{schema_touchpoints['summary']['touchpoint_row_count']}`",
        ]
    )
    FAMILY_TAXONOMY_DOC_PATH.write_text("\n".join(family_lines) + "\n")


def write_mermaid(records: list[ModuleRecord], edges: list[dict[str, Any]]) -> None:
    lines = [
        "flowchart LR",
        "  classDef authorization fill:#121721,stroke:#5AA9FF,color:#F5F7FA;",
        "  classDef manifest fill:#181E29,stroke:#8AB4FF,color:#F5F7FA;",
        "  classDef compute fill:#181E29,stroke:#52C18C,color:#F5F7FA;",
        "  classDef authority fill:#181E29,stroke:#E7B04B,color:#F5F7FA;",
        "  classDef projection fill:#181E29,stroke:#A7B1BF,color:#F5F7FA;",
        "",
    ]
    records_by_family: dict[str, list[ModuleRecord]] = defaultdict(list)
    for record in records:
        records_by_family[record.module_family].append(record)
    for family in FAMILY_ORDER:
        family_records = sorted(records_by_family.get(family, []), key=lambda record: record.module_name)
        if not family_records:
            continue
        lines.append(f"  subgraph {family}[\"{family}\"]")
        for record in family_records:
            node_id = f"M_{record.module_name}"
            lines.append(f"    {node_id}[\"{record.module_name}\"]")
        lines.append("  end")
        lines.append("")
    for edge in edges:
        upstream = f"M_{edge['upstream_module']}"
        downstream = f"M_{edge['downstream_module']}"
        lines.append(
            f"  {upstream} -->|\"{edge['dependency_type']}\"| {downstream}"
        )
    MODULE_GRAPH_PATH.write_text("\n".join(lines) + "\n")


def build_outputs() -> dict[str, Any]:
    raw_entries = parse_module_headings()
    step_rows, phase_map = load_swimlane_data()
    records, helper_rows, run_bindings = build_module_records(raw_entries, step_rows, phase_map)
    edges = build_dependency_edges(records, run_bindings)
    attach_dependency_lists(records, edges)
    catalog = build_catalog_payload(raw_entries, records, edges, helper_rows)
    side_effects = build_side_effect_matrix(records)
    schema_touchpoints = build_schema_touchpoints(records)
    unresolved = build_unresolved_register(helper_rows)
    callsite_rows, _bindings, _helpers = build_callsite_rows(step_rows, phase_map)
    return {
        "catalog": catalog,
        "edges": edges,
        "callsite_rows": callsite_rows,
        "side_effects": side_effects,
        "schema_touchpoints": schema_touchpoints,
        "unresolved": unresolved,
    }


def write_outputs(outputs: dict[str, Any]) -> None:
    records = [
        ModuleRecord(
            module_name=row["module_name"],
            defined_in=row["defined_in"],
            source_heading_or_logical_block=row["source_heading_or_logical_block"],
            module_family=row["module_family"],
            semantic_role=row["semantic_role"],
            inputs=row["inputs"],
            outputs=row["outputs"],
            stateful_side_effects=row["stateful_side_effects"],
            artifact_writes=row["artifact_writes"],
            audit_event_emissions=row["audit_event_emissions"],
            state_transition_impacts=row["state_transition_impacts"],
            external_boundary_crossing=row["external_boundary_crossing"],
            purity_class=row["purity_class"],
            run_phase_bindings=row["run_phase_bindings"],
            upstream_dependencies=row["upstream_dependencies"],
            downstream_dependents=row["downstream_dependents"],
            related_schemas=row["related_schemas"],
            related_artifacts=row["related_artifacts"],
            performance_notes=row["performance_notes"],
            security_notes=row["security_notes"],
            notes=row["notes"],
            source_heading_refs=row["source_heading_refs"],
            raw_heading_indexes=row["raw_heading_indexes"],
            callsite_count=row["callsite_count"],
            input_objects=[],
            output_objects=[],
        )
        for row in outputs["catalog"]["modules"]
    ]
    json_write(MODULE_CATALOG_PATH, outputs["catalog"])
    write_edges_csv(outputs["edges"])
    write_callsite_index(outputs["callsite_rows"])
    json_write(SIDE_EFFECT_MATRIX_PATH, outputs["side_effects"])
    json_write(SCHEMA_TOUCHPOINTS_PATH, outputs["schema_touchpoints"])
    json_write(UNRESOLVED_CALLS_PATH, outputs["unresolved"])
    write_docs(outputs["catalog"], outputs["edges"], outputs["side_effects"], outputs["schema_touchpoints"])
    write_mermaid(records, outputs["edges"])


def main() -> int:
    outputs = build_outputs()
    # Mermaid and docs need the enriched records with dependency lists, so rebuild from catalog rows.
    records = [
        ModuleRecord(
            module_name=row["module_name"],
            defined_in=row["defined_in"],
            source_heading_or_logical_block=row["source_heading_or_logical_block"],
            module_family=row["module_family"],
            semantic_role=row["semantic_role"],
            inputs=row["inputs"],
            outputs=row["outputs"],
            stateful_side_effects=row["stateful_side_effects"],
            artifact_writes=row["artifact_writes"],
            audit_event_emissions=row["audit_event_emissions"],
            state_transition_impacts=row["state_transition_impacts"],
            external_boundary_crossing=row["external_boundary_crossing"],
            purity_class=row["purity_class"],
            run_phase_bindings=row["run_phase_bindings"],
            upstream_dependencies=row["upstream_dependencies"],
            downstream_dependents=row["downstream_dependents"],
            related_schemas=row["related_schemas"],
            related_artifacts=row["related_artifacts"],
            performance_notes=row["performance_notes"],
            security_notes=row["security_notes"],
            notes=row["notes"],
            source_heading_refs=row["source_heading_refs"],
            raw_heading_indexes=row["raw_heading_indexes"],
            callsite_count=row["callsite_count"],
            input_objects=[],
            output_objects=[],
        )
        for row in outputs["catalog"]["modules"]
    ]
    MODULE_CATALOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    DOCS_ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
    DIAGRAMS_ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
    json_write(MODULE_CATALOG_PATH, outputs["catalog"])
    write_edges_csv(outputs["edges"])
    write_callsite_index(outputs["callsite_rows"])
    json_write(SIDE_EFFECT_MATRIX_PATH, outputs["side_effects"])
    json_write(SCHEMA_TOUCHPOINTS_PATH, outputs["schema_touchpoints"])
    json_write(UNRESOLVED_CALLS_PATH, outputs["unresolved"])
    write_docs(outputs["catalog"], outputs["edges"], outputs["side_effects"], outputs["schema_touchpoints"])
    write_mermaid(records, outputs["edges"])
    summary = {
        "status": "PASS",
        "raw_heading_count": outputs["catalog"]["summary"]["raw_heading_count"],
        "canonical_module_count": outputs["catalog"]["summary"]["canonical_module_count"],
        "run_bound_module_count": outputs["catalog"]["summary"]["run_bound_module_count"],
        "dependency_edge_count": outputs["catalog"]["summary"]["dependency_edge_count"],
        "unresolved_helper_count": outputs["unresolved"]["summary"]["unresolved_or_primitive_call_count"],
    }
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
