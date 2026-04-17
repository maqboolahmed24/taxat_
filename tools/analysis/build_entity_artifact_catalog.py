#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

import build_module_dependency_graph as module_builder


ROOT = Path(__file__).resolve().parents[2]
ALGORITHM_DIR = ROOT / "Algorithm"
DATA_ANALYSIS_DIR = ROOT / "data" / "analysis"
DOCS_ANALYSIS_DIR = ROOT / "docs" / "analysis"
DIAGRAMS_ANALYSIS_DIR = ROOT / "diagrams" / "analysis"

ENTITY_CATALOG_PATH = DATA_ANALYSIS_DIR / "entity_catalog.json"
ARTIFACT_CATALOG_PATH = DATA_ANALYSIS_DIR / "artifact_catalog.json"
SCHEMA_OWNERSHIP_MATRIX_PATH = DATA_ANALYSIS_DIR / "schema_ownership_matrix.csv"
READ_MODEL_PROJECTION_INDEX_PATH = DATA_ANALYSIS_DIR / "read_model_projection_index.json"
TRUTH_PROJECTION_BOUNDARY_MAP_PATH = DATA_ANALYSIS_DIR / "truth_vs_projection_boundary_map.json"
OBJECT_LIFECYCLE_COVERAGE_PATH = DATA_ANALYSIS_DIR / "object_lifecycle_coverage.json"
AMBIGUOUS_SCHEMA_RECORDS_PATH = DATA_ANALYSIS_DIR / "unowned_or_ambiguous_schema_records.json"

ENTITY_DOC_PATH = DOCS_ANALYSIS_DIR / "08_entity_artifact_and_schema_ownership.md"
BOUNDARY_DOC_PATH = DOCS_ANALYSIS_DIR / "08_truth_projection_control_boundary_matrix.md"
LIFECYCLE_DOC_PATH = DOCS_ANALYSIS_DIR / "08_mutability_and_lifecycle_ownership_notes.md"
RELATIONSHIP_DIAGRAM_PATH = DIAGRAMS_ANALYSIS_DIR / "08_entity_artifact_relationships.mmd"

DATA_MODEL_PATH = ALGORITHM_DIR / "data_model.md"
STATE_MACHINES_PATH = ALGORITHM_DIR / "state_machines.md"
CANONICAL_TAXONOMY_PATH = ALGORITHM_DIR / "canonical_source_and_evidence_taxonomy.md"
AUTHORITY_TRUTH_PATH = ALGORITHM_DIR / "authority_truth_and_internal_projection_separation_contract.md"
AUDIT_PROVENANCE_PATH = ALGORITHM_DIR / "audit_and_provenance.md"
PROVENANCE_SEMANTICS_PATH = ALGORITHM_DIR / "provenance_graph_semantics.md"
RETENTION_PRIVACY_PATH = ALGORITHM_DIR / "retention_and_privacy.md"
FRONTEND_LAW_PATH = ALGORITHM_DIR / "frontend_shell_and_interaction_law.md"
LOW_NOISE_PATH = ALGORITHM_DIR / "low_noise_experience_contract.md"
PORTAL_PATH = ALGORITHM_DIR / "customer_client_portal_experience_contract.md"
COLLABORATION_PATH = ALGORITHM_DIR / "collaboration_workspace_contract.md"
GOVERNANCE_PATH = ALGORITHM_DIR / "admin_governance_console_architecture.md"
SCHEMAS_DIR = ALGORITHM_DIR / "schemas"

OBJECT_BULLET_RE = re.compile(r"^- \*\*([A-Za-z0-9_]+)\*\*:\s*(.*)$")
CODE_SPAN_RE = re.compile(r"`([A-Z][A-Za-z0-9_]+)`")
SCHEMA_TITLE_RE = re.compile(r'"title"\s*:\s*"([^"]+)"')
STATE_MACHINE_REF_RE = re.compile(r"`([A-Z][A-Za-z0-9_]+)\.([a-z_]+)`")
FIELD_TOKEN_RE = re.compile(r"([A-Za-z0-9_]+(?:\[\])?)")
SIDE_FIELD_PRIORITY = (
    "lifecycle_state",
    "cursor_state",
    "promotion_state",
    "bundle_state",
    "assembly_state",
    "attention_state",
    "presentation_state",
    "recovery_posture",
    "parity_classification",
    "filing_readiness",
)

OBJECT_KINDS = {
    "mutable_entity",
    "append_only_artifact",
    "control_contract",
    "read_model",
    "envelope",
    "projection",
    "schema_bundle",
    "sample_only",
}
TRUTH_CLASSES = {
    "internal_authoritative",
    "authority_of_record_mirror",
    "projection_only",
    "mixed_with_guardrails",
}
LIFECYCLE_COVERAGE_CLASSES = {
    "explicit",
    "inferred",
    "absent",
    "intentionally_not_lifecycle",
}
SCHEMA_OWNERSHIP_CLASSES = {
    "canonical_object_storage",
    "control_contract",
    "read_model",
    "transport_envelope",
    "projection",
    "regression_harness",
    "schema_bundle",
    "ambiguous",
}
WRITE_AUTHORITY_CLASSES = {
    "mutable_engine_writer",
    "append_only_engine_writer",
    "projection_builder_only",
    "boundary_transport_writer",
    "contract_governed",
    "schema_registry_governed",
    "human_gated_engine_write",
    "engine_controlled_authority_subordinate",
    "test_fixture_only",
}

PORTAL_AUDIENCE = "customer_client"
WORKSPACE_AUDIENCE = "operator_staff"
GOVERNANCE_AUDIENCE = "governance_staff"
AUTHORITY_AUDIENCE = "authority_edge"
INTERNAL_AUDIENCE = "internal_engine"
AUDIT_AUDIENCE = "audit_sensitive"

PORTAL_SHELL = "CLIENT_PORTAL_SHELL"
CALM_SHELL = "CALM_SHELL"
GOVERNANCE_SHELL = "GOVERNANCE_DENSITY_SHELL"
WORKSPACE_SHELL = "COLLABORATION_WORKSPACE"
WORK_INBOX_SHELL = "WORK_INBOX"
NATIVE_OPERATOR_SHELL = "NATIVE_OPERATOR"

MANUAL_DOC_ONLY_OBJECTS = {
    "GovernanceRiskLedger": {
        "audiences": [GOVERNANCE_AUDIENCE],
        "shell_families": [GOVERNANCE_SHELL],
        "object_kind": "read_model",
        "source_docs": [GOVERNANCE_PATH],
    },
    "TenantConfigWorkspace": {
        "audiences": [GOVERNANCE_AUDIENCE],
        "shell_families": [GOVERNANCE_SHELL],
        "object_kind": "read_model",
        "source_docs": [GOVERNANCE_PATH],
    },
    "PendingChangeQueue": {
        "audiences": [GOVERNANCE_AUDIENCE],
        "shell_families": [GOVERNANCE_SHELL],
        "object_kind": "projection",
        "source_docs": [GOVERNANCE_PATH],
    },
    "WorkspaceDelta": {
        "audiences": [WORKSPACE_AUDIENCE, PORTAL_AUDIENCE],
        "shell_families": [WORKSPACE_SHELL, PORTAL_SHELL],
        "object_kind": "projection",
        "source_docs": [COLLABORATION_PATH],
    },
}

READ_MODEL_AUDIENCE_OVERRIDES = {
    "WorkInboxSnapshot": [WORKSPACE_AUDIENCE],
    "WorkInboxDelta": [WORKSPACE_AUDIENCE],
    "WorkspaceSnapshot": [WORKSPACE_AUDIENCE, PORTAL_AUDIENCE],
    "WorkspaceStreamEvent": [WORKSPACE_AUDIENCE, PORTAL_AUDIENCE],
    "WorkspaceCursor": [WORKSPACE_AUDIENCE, PORTAL_AUDIENCE],
    "CustomerRequestListSnapshot": [PORTAL_AUDIENCE],
    "CollaborationActivitySlice": [WORKSPACE_AUDIENCE, PORTAL_AUDIENCE],
    "CollaborationAttachmentSlice": [WORKSPACE_AUDIENCE, PORTAL_AUDIENCE],
    "OperatorMorningDigest": [WORKSPACE_AUDIENCE],
    "LowNoiseExperienceFrame": [WORKSPACE_AUDIENCE],
    "ExperienceDelta": [WORKSPACE_AUDIENCE],
    "ExperienceStreamEvent": [WORKSPACE_AUDIENCE],
    "ExperienceCursor": [WORKSPACE_AUDIENCE],
    "ContextBarState": [WORKSPACE_AUDIENCE],
    "DecisionSummaryState": [WORKSPACE_AUDIENCE],
    "ActionStripState": [WORKSPACE_AUDIENCE],
    "DetailDrawerState": [WORKSPACE_AUDIENCE],
    "LowNoiseBudgetAudit": [WORKSPACE_AUDIENCE],
    "LowNoiseBudgetAuditPack": [WORKSPACE_AUDIENCE],
    "NativeOperatorWorkspaceScene": [WORKSPACE_AUDIENCE],
    "NativeOperatorSecondaryWindowScene": [WORKSPACE_AUDIENCE],
    "ClientPortalWorkspace": [PORTAL_AUDIENCE],
    "ClientDocumentRequest": [PORTAL_AUDIENCE],
    "ClientUploadSession": [PORTAL_AUDIENCE],
    "ClientApprovalPack": [PORTAL_AUDIENCE],
    "ClientOnboardingJourney": [PORTAL_AUDIENCE],
    "ClientTimelineEvent": [PORTAL_AUDIENCE],
    "PortalHelpRequest": [PORTAL_AUDIENCE],
    "WorkItemNotification": [WORKSPACE_AUDIENCE, PORTAL_AUDIENCE],
    "TenantGovernanceSnapshot": [GOVERNANCE_AUDIENCE],
    "GovernancePolicySnapshot": [GOVERNANCE_AUDIENCE],
    "PrincipalAccessView": [GOVERNANCE_AUDIENCE],
    "RoleTemplateMatrix": [GOVERNANCE_AUDIENCE],
    "GovernanceAccessSimulation": [GOVERNANCE_AUDIENCE],
    "AuthorityLinkInventoryItem": [GOVERNANCE_AUDIENCE, AUTHORITY_AUDIENCE],
    "RetentionGovernanceFrame": [GOVERNANCE_AUDIENCE],
    "AuditInvestigationFrame": [GOVERNANCE_AUDIENCE, AUDIT_AUDIENCE],
    "AuthorityReconciliationAnalyticsSnapshot": [AUTHORITY_AUDIENCE, GOVERNANCE_AUDIENCE],
    "FailureLifecycleDashboard": [WORKSPACE_AUDIENCE, AUDIT_AUDIENCE],
}
READ_MODEL_SHELL_OVERRIDES = {
    "WorkInboxSnapshot": [WORK_INBOX_SHELL],
    "WorkInboxDelta": [WORK_INBOX_SHELL],
    "WorkspaceSnapshot": [WORKSPACE_SHELL, PORTAL_SHELL],
    "WorkspaceStreamEvent": [WORKSPACE_SHELL, PORTAL_SHELL],
    "WorkspaceCursor": [WORKSPACE_SHELL, PORTAL_SHELL],
    "CustomerRequestListSnapshot": [PORTAL_SHELL],
    "CollaborationActivitySlice": [WORKSPACE_SHELL, PORTAL_SHELL],
    "CollaborationAttachmentSlice": [WORKSPACE_SHELL, PORTAL_SHELL],
    "OperatorMorningDigest": [WORKSPACE_SHELL],
    "LowNoiseExperienceFrame": [CALM_SHELL],
    "ExperienceDelta": [CALM_SHELL],
    "ExperienceStreamEvent": [CALM_SHELL],
    "ExperienceCursor": [CALM_SHELL],
    "ContextBarState": [CALM_SHELL],
    "DecisionSummaryState": [CALM_SHELL],
    "ActionStripState": [CALM_SHELL],
    "DetailDrawerState": [CALM_SHELL],
    "LowNoiseBudgetAudit": [CALM_SHELL],
    "LowNoiseBudgetAuditPack": [CALM_SHELL],
    "NativeOperatorWorkspaceScene": [NATIVE_OPERATOR_SHELL, CALM_SHELL],
    "NativeOperatorSecondaryWindowScene": [NATIVE_OPERATOR_SHELL, CALM_SHELL],
    "ClientPortalWorkspace": [PORTAL_SHELL],
    "ClientDocumentRequest": [PORTAL_SHELL],
    "ClientUploadSession": [PORTAL_SHELL],
    "ClientApprovalPack": [PORTAL_SHELL],
    "ClientOnboardingJourney": [PORTAL_SHELL],
    "ClientTimelineEvent": [PORTAL_SHELL],
    "PortalHelpRequest": [PORTAL_SHELL],
    "WorkItemNotification": [WORKSPACE_SHELL, PORTAL_SHELL],
    "TenantGovernanceSnapshot": [GOVERNANCE_SHELL],
    "GovernancePolicySnapshot": [GOVERNANCE_SHELL],
    "PrincipalAccessView": [GOVERNANCE_SHELL],
    "RoleTemplateMatrix": [GOVERNANCE_SHELL],
    "GovernanceAccessSimulation": [GOVERNANCE_SHELL],
    "AuthorityLinkInventoryItem": [GOVERNANCE_SHELL],
    "RetentionGovernanceFrame": [GOVERNANCE_SHELL],
    "AuditInvestigationFrame": [GOVERNANCE_SHELL],
    "AuthorityReconciliationAnalyticsSnapshot": [GOVERNANCE_SHELL],
    "FailureLifecycleDashboard": [WORKSPACE_SHELL],
}

PROJECTION_SUFFIXES = ("Delta", "Cursor", "StreamEvent", "Slice")
READ_MODEL_SUFFIXES = ("Snapshot", "Workspace", "Frame", "View", "Scene", "Digest")
CONTROL_CONTRACT_NAMES = {
    "OperatorInteractionLayer",
    "PortalInteractionLayer",
    "GovernanceInteractionLayer",
}
ENVELOPE_NAMES = {
    "ApiCommandReceipt",
    "CommandEnvelope",
    "ProblemEnvelope",
    "AuthorityIngressReceipt",
}
SCHEMA_BUNDLE_NAMES = {"SchemaBundle", "SchemaBundleEntry"}
AUTHORITY_MIRROR_NAMES = {
    "SubmissionRecord",
    "ObligationMirror",
    "AuthorityInteractionRecord",
    "AuthorityIngressReceipt",
}
HUMAN_GATED_NAMES = {
    "Override",
    "AcceptedRiskApproval",
    "ConfigChangeRequest",
    "ClientApprovalPack",
}
MIXED_GUARDRAIL_NAMES = {
    "WorkflowItem",
    "FilingPacket",
    "AuthorityOperation",
    "AuthorityBinding",
    "AuthorityRequestEnvelope",
    "AuthorityResponseEnvelope",
    "AuthorityCalculationRequest",
    "AuthorityCalculationResult",
    "CalculationBasis",
    "CalculationUserConfirmation",
    "AuthorityCalculationReadinessContext",
    "ExperienceCursor",
    "WorkspaceCursor",
    "ConfigFreeze",
}
SECOND_SECTION_MUTABLE_NAMES = {
    "RunManifest",
    "NightlyBatchRun",
    "SubmissionRecord",
    "AuthorityInteractionRecord",
    "FilingPacket",
    "FilingCase",
    "AmendmentCase",
    "ArtifactRetention",
    "AuthorityBinding",
    "TrustSummary",
}
APPEND_ONLY_EVIDENCE_NAMES = {
    "Snapshot",
    "ComputeResult",
    "ForecastSet",
    "RiskReport",
    "ParityResult",
    "DecisionBundle",
    "ReplayAttestation",
    "EvidenceGraph",
    "ProofBundle",
    "EnquiryPack",
    "AuditEvent",
    "ErasureProof",
    "AuthorityRequestEnvelope",
    "AuthorityResponseEnvelope",
    "AuthorityIngressReceipt",
    "AuthorityOperation",
    "AuthorityCalculationRequest",
    "AuthorityCalculationResult",
    "CalculationBasis",
    "CalculationUserConfirmation",
    "AuthorityCalculationReadinessContext",
}
REGRESSION_OR_HARNESS_TITLES = {
    "FocusRestoreReturnTargetHarness",
    "SemanticAccessibilityRegressionPack",
    "ShellContinuityFuzzHarness",
    "NativeCacheHydrationAutomationPack",
    "UploadSessionRecoveryHarness",
    "LowNoiseBudgetAuditPack",
}
FIELD_ALIAS_OVERRIDES = {
    "manifest": "RunManifest",
    "root_manifest": "RunManifest",
    "parent_manifest": "RunManifest",
    "tenant": "Tenant",
    "user": "User",
    "client": "Client",
    "item": "WorkflowItem",
    "packet": "FilingPacket",
    "submission": "SubmissionRecord",
    "thread": "CollaborationThread",
    "entry": "CollaborationEntry",
    "attachment": "CollaborationAttachment",
    "workspace_cursor": "WorkspaceCursor",
    "experience_cursor": "ExperienceCursor",
    "request_info": "RequestInfoRecord",
    "decision_bundle": "DecisionBundle",
    "trust_summary": "TrustSummary",
    "authority_binding": "AuthorityBinding",
    "authority_link": "AuthorityLink",
    "delegation_grant": "DelegationGrant",
    "authority_operation": "AuthorityOperation",
    "request_envelope": "AuthorityRequestEnvelope",
    "response": "AuthorityResponseEnvelope",
    "request": "AuthorityRequestEnvelope",
    "ingress_receipt": "AuthorityIngressReceipt",
    "interaction": "AuthorityInteractionRecord",
    "retention_tag": "RetentionTag",
    "artifact_retention": "ArtifactRetention",
    "erasure_proof": "ErasureProof",
    "proof_bundle": "ProofBundle",
    "evidence_graph": "EvidenceGraph",
    "source_plan": "SourcePlan",
    "source_window": "SourceWindow",
    "collection_boundary": "CollectionBoundary",
    "source_record": "SourceRecord",
    "source_record_set": "SourceRecordSet",
    "evidence_item": "EvidenceItem",
    "evidence_item_set": "EvidenceItemSet",
    "candidate_fact": "CandidateFact",
    "candidate_fact_set": "CandidateFactSet",
    "canonical_fact": "CanonicalFact",
    "canonical_fact_set": "CanonicalFactSet",
    "conflict_record": "ConflictRecord",
    "conflict_set": "ConflictSet",
    "snapshot": "Snapshot",
    "compute_result": "ComputeResult",
    "forecast_set": "ForecastSet",
    "risk_report": "RiskReport",
    "parity_result": "ParityResult",
    "drift_record": "DriftRecord",
    "drift_baseline_envelope": "DriftBaselineEnvelope",
    "amendment_case": "AmendmentCase",
    "filing_case": "FilingCase",
    "work_item_notification": "WorkItemNotification",
    "portal_help_request": "PortalHelpRequest",
}
MANUAL_BOUNDARY_GROUPS = {
    "authority_truth_boundary": [
        "AuthorityIngressReceipt",
        "AuthorityInteractionRecord",
        "SubmissionRecord",
        "ObligationMirror",
        "WorkflowItem",
        "ClientTimelineEvent",
    ],
    "workspace_visibility_boundary": [
        "WorkspaceSnapshot",
        "CustomerRequestListSnapshot",
        "ClientPortalWorkspace",
        "RequestInfoRecord",
        "WorkItemNotification",
    ],
    "calm_shell_projection_boundary": [
        "LowNoiseExperienceFrame",
        "ContextBarState",
        "DecisionSummaryState",
        "ActionStripState",
        "DetailDrawerState",
        "DecisionBundle",
        "TrustSummary",
    ],
    "governance_projection_boundary": [
        "TenantGovernanceSnapshot",
        "GovernancePolicySnapshot",
        "PrincipalAccessView",
        "RoleTemplateMatrix",
        "AuthorityLinkInventoryItem",
        "RetentionGovernanceFrame",
        "AuditInvestigationFrame",
        "GovernanceRiskLedger",
        "TenantConfigWorkspace",
    ],
    "authority_edge_boundary": [
        "AuthorityOperation",
        "AuthorityBinding",
        "AuthorityRequestEnvelope",
        "AuthorityResponseEnvelope",
        "AuthorityCalculationRequest",
        "AuthorityCalculationResult",
        "CalculationBasis",
        "CalculationUserConfirmation",
        "AuthorityCalculationReadinessContext",
    ],
}
DOC_OBJECTS = {
    FRONTEND_LAW_PATH: [
        "WorkspaceSnapshot",
        "ClientPortalWorkspace",
        "WorkInboxSnapshot",
        "CustomerRequestListSnapshot",
        "OperatorInteractionLayer",
        "PortalInteractionLayer",
        "GovernanceInteractionLayer",
        "NativeOperatorWorkspaceScene",
        "NativeOperatorSecondaryWindowScene",
    ],
    LOW_NOISE_PATH: [
        "LowNoiseExperienceFrame",
        "ContextBarState",
        "DecisionSummaryState",
        "ActionStripState",
        "DetailDrawerState",
        "ExperienceDelta",
        "ExperienceStreamEvent",
        "ExperienceCursor",
        "TwinView",
        "TwinStateSnapshot",
        "TwinTimeline",
        "TwinDeltaArc",
        "TwinMismatchSummary",
        "TwinReadinessState",
        "TwinReconciliationState",
        "TwinInterpretationState",
        "LowNoiseBudgetAudit",
        "LowNoiseBudgetAuditPack",
    ],
    PORTAL_PATH: [
        "ClientPortalWorkspace",
        "CustomerRequestListSnapshot",
        "ClientDocumentRequest",
        "ClientUploadSession",
        "ClientApprovalPack",
        "ClientOnboardingJourney",
        "ClientTimelineEvent",
        "PortalHelpRequest",
        "PortalInteractionLayer",
        "WorkItemNotification",
    ],
    COLLABORATION_PATH: [
        "WorkspaceSnapshot",
        "WorkspaceStreamEvent",
        "WorkspaceCursor",
        "WorkInboxSnapshot",
        "WorkInboxDelta",
        "CollaborationActivitySlice",
        "CollaborationAttachmentSlice",
        "RequestInfoRecord",
        "CollaborationThread",
        "CollaborationEntry",
        "CollaborationAttachment",
        "WorkItemParticipant",
        "WorkItemNotification",
        "CustomerRequestListSnapshot",
        "WorkspaceDelta",
    ],
    GOVERNANCE_PATH: [
        "TenantGovernanceSnapshot",
        "GovernancePolicySnapshot",
        "PrincipalAccessView",
        "RoleTemplateMatrix",
        "GovernanceAccessSimulation",
        "AuthorityLinkInventoryItem",
        "RetentionGovernanceFrame",
        "AuditInvestigationFrame",
        "GovernanceInteractionLayer",
        "GovernanceRiskLedger",
        "TenantConfigWorkspace",
        "PendingChangeQueue",
    ],
}
MANUAL_PROSE_OWNER_MAP = {
    "AuthorityTruthContract": [AUTHORITY_TRUTH_PATH],
    "CustomerSafeProjectionContract": [FRONTEND_LAW_PATH, PORTAL_PATH, COLLABORATION_PATH],
    "PortalLanguageContract": [FRONTEND_LAW_PATH, PORTAL_PATH],
    "FocusRestoreReturnTargetHarness": [FRONTEND_LAW_PATH, PORTAL_PATH, COLLABORATION_PATH, GOVERNANCE_PATH],
    "SemanticAccessibilityRegressionPack": [FRONTEND_LAW_PATH, PORTAL_PATH, COLLABORATION_PATH, GOVERNANCE_PATH],
    "ShellContinuityFuzzHarness": [LOW_NOISE_PATH, FRONTEND_LAW_PATH],
    "CrossDeviceContinuityContract": [LOW_NOISE_PATH, PORTAL_PATH, COLLABORATION_PATH, GOVERNANCE_PATH],
    "CacheIsolationContract": [FRONTEND_LAW_PATH, LOW_NOISE_PATH, PORTAL_PATH, COLLABORATION_PATH, GOVERNANCE_PATH],
    "RetentionLimitedExplainabilityContract": [RETENTION_PRIVACY_PATH],
    "ProvenancePartitionContract": [AUDIT_PROVENANCE_PATH, PROVENANCE_SEMANTICS_PATH],
    "ProofClosureContract": [AUDIT_PROVENANCE_PATH, PROVENANCE_SEMANTICS_PATH],
    "AuthorityIngressProofContract": [AUTHORITY_TRUTH_PATH],
    "AuthorityIngressCorrelationContract": [AUTHORITY_TRUTH_PATH],
    "ExternalizationGovernanceContract": [PORTAL_PATH, FRONTEND_LAW_PATH],
}


@dataclass
class ObjectSourceEntry:
    object_name: str
    line_number: int
    section_heading: str
    field_blob: str
    body_text: str
    source_path: Path
    source_kind: str
    source_refs: list[str]


def repo_rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def snake_case(text: str) -> str:
    text = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", text)
    text = re.sub(r"[^A-Za-z0-9]+", "_", text)
    return text.strip("_").lower()


def line_ref(path: str, line_number: int, label: str) -> str:
    safe_label = re.sub(r"[^A-Za-z0-9_.-]+", "_", label).strip("_") or "line"
    return f"{path}::L{line_number}[{safe_label}]"


def search_named_refs(path: Path, object_name: str) -> list[str]:
    refs: list[str] = []
    pattern = re.compile(rf"(?<![A-Za-z0-9_]){re.escape(object_name)}(?![A-Za-z0-9_])")
    for line_number, line in enumerate(path.read_text().splitlines(), start=1):
        if f"`{object_name}`" in line or pattern.search(line):
            refs.append(line_ref(repo_rel(path), line_number, object_name))
    return ordered_unique(refs)


def fallback_heading_ref(path: Path, label: str) -> str:
    for line_number, line in enumerate(path.read_text().splitlines(), start=1):
        if line.startswith("#"):
            return line_ref(repo_rel(path), line_number, label)
    return line_ref(repo_rel(path), 1, label)


def resolve_named_refs(
    object_name: str,
    paths: Iterable[Path],
    *,
    allow_heading_fallback: bool,
) -> list[str]:
    refs: list[str] = []
    for path in paths:
        path_refs = search_named_refs(path, object_name)
        if path_refs:
            refs.extend(path_refs)
        elif allow_heading_fallback:
            refs.append(fallback_heading_ref(path, object_name))
    return ordered_unique(refs)


def json_write(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")


def ordered_unique(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if not value or value in seen:
            continue
        seen.add(value)
        result.append(value)
    return result


def split_field_tokens(field_blob: str) -> list[str]:
    tokens: list[str] = []
    for raw in field_blob.split(","):
        token = raw.strip()
        if not token:
            continue
        token = token.split(" where ", 1)[0].strip()
        token = token.split("{{", 1)[0].strip()
        token = token.split("{", 1)[0].strip()
        token = token.rstrip(".")
        if token:
            tokens.append(token)
    return ordered_unique(tokens)


def parse_data_model_entries() -> tuple[list[ObjectSourceEntry], list[dict[str, Any]]]:
    lines = DATA_MODEL_PATH.read_text().splitlines()
    entries: list[ObjectSourceEntry] = []
    current_section = ""
    index = 0
    while index < len(lines):
        line = lines[index]
        if line.startswith("## "):
            current_section = line[3:].strip()
            index += 1
            continue
        match = OBJECT_BULLET_RE.match(line)
        if not match:
            index += 1
            continue

        object_name = match.group(1)
        field_lines = [match.group(2).strip()]
        body_lines = [line]
        prose_started = False
        index += 1
        while index < len(lines):
            next_line = lines[index]
            if next_line.startswith("## ") or OBJECT_BULLET_RE.match(next_line):
                break
            body_lines.append(next_line)
            stripped = next_line.strip()
            if stripped.startswith("`"):
                prose_started = True
            elif not prose_started and stripped:
                field_lines.append(stripped)
            index += 1

        entries.append(
            ObjectSourceEntry(
                object_name=object_name,
                line_number=index - len(body_lines) + 1,
                section_heading=current_section,
                field_blob=" ".join(field_lines),
                body_text="\n".join(body_lines),
                source_path=DATA_MODEL_PATH,
                source_kind="data_model",
                source_refs=[
                    line_ref(repo_rel(DATA_MODEL_PATH), index - len(body_lines) + 1, object_name)
                ],
            )
        )

    grouped: dict[str, list[ObjectSourceEntry]] = defaultdict(list)
    for entry in entries:
        grouped[entry.object_name].append(entry)

    merged_entries: list[ObjectSourceEntry] = []
    duplicate_notes: list[dict[str, Any]] = []
    for object_name in sorted(grouped):
        source_entries = grouped[object_name]
        primary = source_entries[0]
        merged_entries.append(
            ObjectSourceEntry(
                object_name=object_name,
                line_number=primary.line_number,
                section_heading=primary.section_heading,
                field_blob=" ".join(entry.field_blob for entry in source_entries),
                body_text="\n\n".join(entry.body_text for entry in source_entries),
                source_path=primary.source_path,
                source_kind=primary.source_kind,
                source_refs=ordered_unique(ref for entry in source_entries for ref in entry.source_refs),
            )
        )
        if len(source_entries) > 1:
            duplicate_notes.append(
                {
                    "record_type": "duplicate_data_model_object_definition",
                    "object_name": object_name,
                    "duplicate_count": len(source_entries),
                    "source_refs": ordered_unique(
                        line_ref(repo_rel(entry.source_path), entry.line_number, object_name)
                        for entry in source_entries
                    ),
                    "rationale": f"`{object_name}` appears {len(source_entries)} times in `data_model.md`; entries were merged conservatively.",
                }
            )
    return merged_entries, duplicate_notes


def parse_state_machine_map() -> dict[str, dict[str, Any]]:
    mapping: dict[str, dict[str, Any]] = defaultdict(lambda: {"state_fields": [], "source_refs": []})
    for line_number, line in enumerate(STATE_MACHINES_PATH.read_text().splitlines(), start=1):
        if not line.startswith("## "):
            continue
        for object_name, state_field in STATE_MACHINE_REF_RE.findall(line):
            row = mapping[object_name]
            row["state_fields"] = ordered_unique(list(row["state_fields"]) + [state_field])
            row["source_refs"] = ordered_unique(
                list(row["source_refs"])
                + [line_ref(repo_rel(STATE_MACHINES_PATH), line_number, f"{object_name}.{state_field}")]
            )
    return dict(mapping)


def parse_schema_index() -> dict[str, list[Path]]:
    rows: dict[str, list[Path]] = defaultdict(list)
    for path in sorted(SCHEMAS_DIR.glob("*.schema.json")):
        text = path.read_text()
        title_match = SCHEMA_TITLE_RE.search(text)
        title = title_match.group(1) if title_match else path.stem.replace(".schema", "")
        rows[title].append(path)
    return dict(rows)


def collect_doc_refs(names: Iterable[str]) -> dict[str, list[str]]:
    name_set = set(names)
    refs: dict[str, list[str]] = defaultdict(list)
    for path, object_names in DOC_OBJECTS.items():
        targets = name_set & set(object_names)
        if not targets:
            continue
        for object_name in sorted(targets):
            refs[object_name].extend(
                resolve_named_refs(object_name, [path], allow_heading_fallback=False)
            )
    for object_name, meta in MANUAL_DOC_ONLY_OBJECTS.items():
        if object_name not in name_set:
            continue
        refs[object_name].extend(
            resolve_named_refs(object_name, meta["source_docs"], allow_heading_fallback=False)
        )
    for object_name, paths in MANUAL_PROSE_OWNER_MAP.items():
        if object_name not in name_set:
            continue
        refs[object_name].extend(
            resolve_named_refs(object_name, paths, allow_heading_fallback=True)
        )
    return {name: ordered_unique(values) for name, values in refs.items() if values}


def classify_object_kind(
    object_name: str,
    entry: ObjectSourceEntry | None,
    schema_paths: list[str],
    doc_refs: list[str],
) -> str:
    field_blob = entry.field_blob if entry else ""
    if object_name in SCHEMA_BUNDLE_NAMES:
        return "schema_bundle"
    if object_name in MANUAL_DOC_ONLY_OBJECTS:
        return MANUAL_DOC_ONLY_OBJECTS[object_name]["object_kind"]
    if object_name in CONTROL_CONTRACT_NAMES or object_name.endswith("Contract"):
        return "control_contract"
    if object_name in ENVELOPE_NAMES or object_name.endswith("Envelope") or object_name.endswith("Receipt"):
        return "envelope"
    if object_name in REGRESSION_OR_HARNESS_TITLES:
        return "control_contract"
    if object_name in READ_MODEL_AUDIENCE_OVERRIDES:
        if object_name.endswith(PROJECTION_SUFFIXES):
            return "projection"
        if object_name in {"ClientTimelineEvent", "WorkInboxDelta", "ExperienceDelta", "ExperienceStreamEvent", "WorkspaceStreamEvent", "WorkspaceCursor", "ExperienceCursor"}:
            return "projection"
        return "read_model"
    if entry and ("shell_family" in field_blob and "object_anchor_ref" in field_blob):
        return "read_model"
    if object_name.endswith(PROJECTION_SUFFIXES):
        return "projection"
    if object_name.endswith(READ_MODEL_SUFFIXES) and object_name not in {"Snapshot", "TwinStateSnapshot"}:
        return "read_model"
    if entry and entry.section_heading == "Mutable operational entities (state)":
        return "mutable_entity"
    if object_name in SECOND_SECTION_MUTABLE_NAMES:
        return "mutable_entity"
    return "append_only_artifact"


def infer_truth_class(object_name: str, object_kind: str, body_text: str) -> str:
    if object_kind in {"read_model", "projection"}:
        return "projection_only"
    if object_name in AUTHORITY_MIRROR_NAMES:
        return "authority_of_record_mirror"
    lower_text = body_text.lower()
    if object_kind in {"control_contract", "envelope", "schema_bundle"}:
        return "mixed_with_guardrails"
    if object_name in MIXED_GUARDRAIL_NAMES:
        return "mixed_with_guardrails"
    if "authority_truth_contract" in lower_text or "customer-safe projection" in lower_text:
        return "mixed_with_guardrails"
    return "internal_authoritative"


def infer_write_authority_class(object_name: str, object_kind: str, truth_class: str) -> str:
    if object_kind in {"read_model", "projection"}:
        return "projection_builder_only"
    if object_kind == "control_contract":
        return "contract_governed"
    if object_kind == "schema_bundle":
        return "schema_registry_governed"
    if object_kind == "sample_only":
        return "test_fixture_only"
    if object_name in HUMAN_GATED_NAMES:
        return "human_gated_engine_write"
    if truth_class == "authority_of_record_mirror":
        return "engine_controlled_authority_subordinate"
    if object_kind == "envelope":
        return "boundary_transport_writer"
    if object_kind == "append_only_artifact":
        return "append_only_engine_writer"
    return "mutable_engine_writer"


def infer_visibility_classes(object_name: str, object_kind: str, body_text: str) -> list[str]:
    classes: list[str] = []
    lower_text = body_text.lower()
    classes.extend(READ_MODEL_AUDIENCE_OVERRIDES.get(object_name, []))
    classes.extend(MANUAL_DOC_ONLY_OBJECTS.get(object_name, {}).get("audiences", []))
    if object_kind not in {"read_model", "projection"}:
        classes.append(INTERNAL_AUDIENCE)
    if any(token in object_name for token in ("Authority", "Submission", "Filing")) or "authority" in lower_text:
        classes.append(AUTHORITY_AUDIENCE)
    if any(token in object_name for token in ("Audit", "Proof", "Provenance", "Enquiry", "Failure", "Error")):
        classes.append(AUDIT_AUDIENCE)
    if "visibility_class" in lower_text or "customer_safe_projection" in lower_text or "customer-safe" in lower_text:
        classes.append(PORTAL_AUDIENCE)
    return ordered_unique(classes or [INTERNAL_AUDIENCE])


def infer_retention_policy(object_name: str, object_kind: str, body_text: str, field_tokens: list[str]) -> str:
    lower_text = body_text.lower()
    lower_fields = " ".join(field_tokens).lower()
    if object_name in {"RetentionTag", "ArtifactRetention", "ErasureProof"}:
        return "retention_and_privacy_owner_control"
    if object_kind in {"read_model", "projection"}:
        return "projection_cache_or_visibility_partition_policy"
    if object_kind == "control_contract":
        return "contract_reference_and_governance_policy"
    if object_kind == "schema_bundle":
        return "schema_registry_and_compatibility_policy"
    if "retention_tag" in lower_fields or "retention_class" in lower_fields or "retention" in lower_text:
        return "retention_tag_governed"
    if object_name in APPEND_ONLY_EVIDENCE_NAMES:
        return "append_only_evidence_and_lineage_preservation"
    if object_kind == "envelope":
        return "transport_boundary_and_receipt_retention"
    return "manifest_lineage_and_tenant_policy_governed"


def infer_primary_state_field(
    object_name: str,
    field_tokens: list[str],
    state_machine_map: dict[str, dict[str, Any]],
    object_kind: str,
) -> str | None:
    if object_name in state_machine_map and state_machine_map[object_name]["state_fields"]:
        return state_machine_map[object_name]["state_fields"][0]
    lower_tokens = set(field_tokens)
    for state_field in SIDE_FIELD_PRIORITY:
        if state_field in lower_tokens:
            return state_field
    if object_kind in {"control_contract", "envelope", "schema_bundle", "read_model", "projection"}:
        return None
    return None


def infer_lifecycle_coverage(
    object_name: str,
    object_kind: str,
    field_tokens: list[str],
    state_machine_map: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    explicit_state_fields = state_machine_map.get(object_name, {}).get("state_fields", [])
    state_fields = [token for token in field_tokens if any(key in token for key in ("state", "classification", "posture", "readiness"))]
    primary_state = infer_primary_state_field(object_name, field_tokens, state_machine_map, object_kind)
    if explicit_state_fields:
        coverage = "explicit"
    elif primary_state:
        coverage = "inferred"
    elif object_kind in {"control_contract", "envelope", "schema_bundle", "read_model", "projection"}:
        coverage = "intentionally_not_lifecycle"
    else:
        coverage = "absent"
    return {
        "coverage_class": coverage,
        "primary_state_field_or_null": primary_state,
        "state_fields": ordered_unique(explicit_state_fields + state_fields),
        "state_machine_refs": state_machine_map.get(object_name, {}).get("source_refs", []),
    }


def infer_lineage_fields(field_tokens: list[str]) -> list[str]:
    return ordered_unique(
        token
        for token in field_tokens
        if (
            token.endswith("_ref")
            or token.endswith("_refs[]")
            or token.endswith("_hash")
            or token.endswith("_id")
            or "lineage" in token
            or "supersed" in token
            or token in {"manifest_id", "root_manifest_id", "parent_manifest_id", "state_changed_at", "created_at"}
        )
    )


def infer_identity_fields(field_tokens: list[str]) -> list[str]:
    preferred = [
        token
        for token in field_tokens
        if token.endswith("_id")
        or token in {"tenant_id", "client_id", "manifest_id", "shell_family", "object_anchor_ref"}
    ]
    return ordered_unique(preferred[:8])


def build_related_objects(
    object_name: str,
    body_text: str,
    field_tokens: list[str],
    known_names: set[str],
) -> list[str]:
    related: list[str] = []
    for candidate in sorted(known_names):
        if candidate == object_name:
            continue
        if re.search(rf"\b{re.escape(candidate)}\b", body_text):
            related.append(candidate)
    aliases = {snake_case(name): name for name in known_names}
    aliases.update(FIELD_ALIAS_OVERRIDES)
    for token in field_tokens:
        normalized = token.replace("[]", "")
        for suffix in ("_ref", "_refs", "_id", "_hash", "_or_null"):
            if normalized.endswith(suffix):
                normalized = normalized[: -len(suffix)]
        candidate = aliases.get(normalized)
        if candidate and candidate != object_name:
            related.append(candidate)
    for group_members in MANUAL_BOUNDARY_GROUPS.values():
        if object_name in group_members:
            related.extend(member for member in group_members if member != object_name)
    return ordered_unique(related)


def infer_schema_role(schema_title: str, object_row: dict[str, Any] | None) -> str:
    if schema_title in SCHEMA_BUNDLE_NAMES:
        return "schema_bundle"
    if schema_title in REGRESSION_OR_HARNESS_TITLES:
        return "regression_harness"
    if schema_title.endswith("Contract") or schema_title in CONTROL_CONTRACT_NAMES:
        return "control_contract"
    if schema_title.endswith("Envelope") or schema_title.endswith("Receipt") or schema_title in ENVELOPE_NAMES:
        return "transport_envelope"
    if object_row is None:
        return "ambiguous"
    if object_row["object_kind"] == "read_model":
        return "read_model"
    if object_row["object_kind"] == "projection":
        return "projection"
    if object_row["object_kind"] == "control_contract":
        return "control_contract"
    if object_row["object_kind"] == "envelope":
        return "transport_envelope"
    if object_row["object_kind"] == "schema_bundle":
        return "schema_bundle"
    return "canonical_object_storage"


def derive_boundary_family(row: dict[str, Any]) -> str:
    for boundary_family, members in MANUAL_BOUNDARY_GROUPS.items():
        if row["object_name"] in members:
            return boundary_family
    if row["truth_class"] == "projection_only":
        return "projection_surface"
    if row["truth_class"] == "authority_of_record_mirror":
        return "authority_subordinate_truth"
    if row["object_kind"] in {"control_contract", "envelope", "schema_bundle"}:
        return "control_and_transport_boundary"
    return "internal_authoritative_truth"


def infer_projection_role(object_name: str) -> str:
    if object_name in {"LowNoiseExperienceFrame", "ContextBarState", "DecisionSummaryState", "ActionStripState", "DetailDrawerState"}:
        return "calm_shell_projection"
    if object_name in {"ClientPortalWorkspace", "CustomerRequestListSnapshot", "ClientDocumentRequest", "ClientUploadSession", "ClientApprovalPack", "ClientOnboardingJourney", "ClientTimelineEvent", "PortalHelpRequest"}:
        return "customer_safe_projection"
    if object_name in {"WorkspaceSnapshot", "WorkspaceStreamEvent", "WorkspaceCursor", "WorkInboxSnapshot", "WorkInboxDelta", "CollaborationActivitySlice", "CollaborationAttachmentSlice", "WorkspaceDelta"}:
        return "workspace_or_queue_projection"
    if object_name in {"TenantGovernanceSnapshot", "GovernancePolicySnapshot", "PrincipalAccessView", "RoleTemplateMatrix", "GovernanceAccessSimulation", "AuthorityLinkInventoryItem", "RetentionGovernanceFrame", "AuditInvestigationFrame", "GovernanceRiskLedger", "TenantConfigWorkspace", "PendingChangeQueue"}:
        return "governance_projection"
    return "derived_projection"


def read_model_projection_rows(object_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    seen_names = {
        row["object_name"]
        for row in object_rows
        if row["object_kind"] in {"read_model", "projection"}
    }
    for object_name, meta in MANUAL_DOC_ONLY_OBJECTS.items():
        seen_names.add(object_name)
    object_map = {row["object_name"]: row for row in object_rows}
    for object_name in sorted(seen_names):
        row = object_map.get(object_name)
        source_refs = row["authoritative_source_refs"] if row else ordered_unique(
            ref
            for path in MANUAL_DOC_ONLY_OBJECTS[object_name]["source_docs"]
            for ref in collect_doc_refs([object_name]).get(object_name, [])
        )
        rows.append(
            {
                "object_name": object_name,
                "object_id_or_null": row["object_id"] if row else None,
                "object_kind": row["object_kind"] if row else MANUAL_DOC_ONLY_OBJECTS[object_name]["object_kind"],
                "projection_role": infer_projection_role(object_name),
                "audience_classes": READ_MODEL_AUDIENCE_OVERRIDES.get(
                    object_name, MANUAL_DOC_ONLY_OBJECTS.get(object_name, {}).get("audiences", [])
                ),
                "shell_families": READ_MODEL_SHELL_OVERRIDES.get(
                    object_name, MANUAL_DOC_ONLY_OBJECTS.get(object_name, {}).get("shell_families", [])
                ),
                "truth_class": row["truth_class"] if row else "projection_only",
                "schema_path_or_paths": row["schema_path_or_paths"] if row else [],
                "authoritative_source_refs": source_refs,
                "source_status": "cataloged" if row else "doc_only_gap",
                "notes": row["notes"] if row else ["GAP_DOC_ONLY_READ_MODEL_WITHOUT_DATA_MODEL_ROW"],
            }
        )
    return rows


def schema_rows(
    schema_index: dict[str, list[Path]],
    object_rows: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    object_map = {row["object_name"]: row for row in object_rows}
    rows: list[dict[str, Any]] = []
    for schema_title in sorted(schema_index):
        object_row = object_map.get(schema_title)
        schema_paths = [repo_rel(path) for path in schema_index[schema_title]]
        source_ref = None
        if object_row:
            prose_refs = [
                ref
                for ref in object_row["authoritative_source_refs"]
                if not ref.startswith("Algorithm/schemas/")
            ]
            if prose_refs:
                source_ref = prose_refs[0]
        if not source_ref:
            owner_refs = collect_doc_refs([schema_title]).get(schema_title, [])
            if owner_refs:
                source_ref = owner_refs[0]
        rows.append(
            {
                "schema_path": schema_paths[0],
                "schema_title": schema_title,
                "catalog_object_id_or_null": object_row["object_id"] if object_row else None,
                "catalog_object_name_or_null": object_row["object_name"] if object_row else None,
                "ownership_class": infer_schema_role(schema_title, object_row),
                "object_kind_or_null": object_row["object_kind"] if object_row else None,
                "truth_class_or_null": object_row["truth_class"] if object_row else None,
                "authoritative_prose_source_ref_or_null": source_ref,
                "source_file": source_ref.split("::", 1)[0] if source_ref else "",
                "source_heading_or_logical_block": source_ref or "",
                "rationale": (
                    f"`{schema_title}` is owned by `{object_row['object_name']}`."
                    if object_row
                    else f"`{schema_title}` has no exact catalog object match; ownership remains heuristic or ambiguous."
                ),
            }
        )
    return rows


def ambiguous_rows(
    object_rows: list[dict[str, Any]],
    schema_index: dict[str, list[Path]],
    schema_matrix_rows: list[dict[str, Any]],
    duplicate_notes: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = list(duplicate_notes)
    schema_titles_with_prose_owner = {
        row["schema_title"]
        for row in schema_matrix_rows
        if row["authoritative_prose_source_ref_or_null"]
    }
    for row in schema_matrix_rows:
        if row["schema_title"] not in schema_titles_with_prose_owner:
            rows.append(
                {
                    "record_type": "schema_without_clear_prose_owner",
                    "schema_title": row["schema_title"],
                    "schema_path": row["schema_path"],
                    "rationale": "No exact authoritative prose owner was found outside schema title and heuristic family mapping.",
                    "source_refs": [],
                }
            )
    schema_titles = set(schema_index)
    for object_row in object_rows:
        if not object_row["schema_path_or_paths"]:
            rows.append(
                {
                    "record_type": "prose_object_without_direct_schema",
                    "object_name": object_row["object_name"],
                    "object_kind": object_row["object_kind"],
                    "rationale": "The prose-defined object has no direct `.schema.json` mapping.",
                    "source_refs": object_row["authoritative_source_refs"],
                }
            )
        elif object_row["object_name"] not in schema_titles and not any(
            Path(path).stem.replace(".schema", "") == snake_case(object_row["object_name"]) for path in map(Path, object_row["schema_path_or_paths"])
        ):
            rows.append(
                {
                    "record_type": "schema_title_drift_or_non_exact_match",
                    "object_name": object_row["object_name"],
                    "schema_paths": object_row["schema_path_or_paths"],
                    "rationale": "The mapped schema path does not share the same top-level title/name as the conceptual object.",
                    "source_refs": object_row["authoritative_source_refs"],
                }
            )
    return rows


def build_outputs() -> dict[str, Any]:
    data_model_entries, duplicate_notes = parse_data_model_entries()
    state_machine_map = parse_state_machine_map()
    schema_index = parse_schema_index()
    raw_entries = module_builder.parse_module_headings()
    step_rows, phase_map = module_builder.load_swimlane_data()
    module_records, _helper_rows, _run_bindings = module_builder.build_module_records(raw_entries, step_rows, phase_map)

    producer_map: dict[str, set[str]] = defaultdict(set)
    consumer_map: dict[str, set[str]] = defaultdict(set)
    for record in module_records:
        produced_objects = set(record.output_objects) | {
            item for item in record.artifact_writes if item and " " not in item
        }
        consumed_objects = set(record.input_objects)
        if record.purity_class in {"state_mutator", "artifact_persister", "mixed"}:
            produced_objects |= set(record.related_artifacts)
            consumed_objects |= set(record.related_artifacts)
        elif record.purity_class in {"projection_builder", "deterministic_builder", "external_transport", "event_emitter"}:
            produced_objects |= set(record.output_objects)
            consumed_objects |= set(record.input_objects)
        elif record.purity_class == "pure_transform":
            consumed_objects |= set(record.related_artifacts)
        for object_name in produced_objects:
            producer_map[object_name].add(record.module_name)
        for object_name in consumed_objects:
            consumer_map[object_name].add(record.module_name)

    schema_titles = set(schema_index)
    catalog_names = {entry.object_name for entry in data_model_entries}
    catalog_names |= set(MANUAL_DOC_ONLY_OBJECTS)
    catalog_names |= set(MANUAL_PROSE_OWNER_MAP)
    for path, object_names in DOC_OBJECTS.items():
        for object_name in object_names:
            if object_name in schema_titles:
                catalog_names.add(object_name)
    doc_refs_map = collect_doc_refs(catalog_names)

    object_rows: list[dict[str, Any]] = []
    object_source_map = {entry.object_name: entry for entry in data_model_entries}
    for object_name in sorted(catalog_names):
        entry = object_source_map.get(object_name)
        body_text = entry.body_text if entry else ""
        field_blob = entry.field_blob if entry else ""
        field_tokens = split_field_tokens(field_blob)
        schema_paths = [repo_rel(path) for path in schema_index.get(object_name, [])]
        source_refs = ordered_unique(
            (entry.source_refs if entry else [])
            + doc_refs_map.get(object_name, [])
        )
        if not source_refs and object_name in MANUAL_DOC_ONLY_OBJECTS:
            source_refs = [
                fallback_heading_ref(path, object_name)
                for path in MANUAL_DOC_ONLY_OBJECTS[object_name]["source_docs"]
            ]
        object_kind = classify_object_kind(object_name, entry, schema_paths, source_refs)
        truth_class = infer_truth_class(object_name, object_kind, body_text)
        write_authority_class = infer_write_authority_class(object_name, object_kind, truth_class)
        visibility_classes = infer_visibility_classes(object_name, object_kind, body_text)
        lifecycle_row = infer_lifecycle_coverage(object_name, object_kind, field_tokens, state_machine_map)
        source_file = (
            repo_rel(entry.source_path)
            if entry
            else (Path(source_refs[0].split("::", 1)[0]).as_posix() if source_refs else "")
        )
        related_object_ids = [
            f"obj_{snake_case(name)}"
            for name in build_related_objects(object_name, body_text, field_tokens, catalog_names)
        ]
        notes: list[str] = []
        if object_name in MANUAL_DOC_ONLY_OBJECTS:
            notes.append("GAP_DOC_ONLY_OBJECT_WITHOUT_DATA_MODEL_ENTRY")
        if object_name in MANUAL_PROSE_OWNER_MAP and not entry:
            notes.append("SCHEMA_OR_CONTRACT_SURFACE_WITHOUT_DATA_MODEL_ENTRY")
        if len(schema_paths) == 0:
            notes.append("GAP_NO_DIRECT_SCHEMA")
        if object_name in {note.get("object_name") for note in duplicate_notes if "object_name" in note}:
            notes.append("CONFLICT_DUPLICATE_DATA_MODEL_DEFINITION")
        object_rows.append(
            {
                "object_id": f"obj_{snake_case(object_name)}",
                "object_name": object_name,
                "object_kind": object_kind,
                "authoritative_source_refs": source_refs,
                "schema_path_or_paths": schema_paths,
                "primary_state_field_or_null": lifecycle_row["primary_state_field_or_null"],
                "truth_class": truth_class,
                "write_authority_class": write_authority_class,
                "visibility_classes": visibility_classes,
                "retention_class_or_policy": infer_retention_policy(object_name, object_kind, body_text, field_tokens),
                "lineage_anchor_fields": infer_lineage_fields(field_tokens),
                "key_identity_fields": infer_identity_fields(field_tokens),
                "produced_by_modules": sorted(producer_map.get(object_name, set())),
                "consumed_by_modules": sorted(consumer_map.get(object_name, set())),
                "related_object_ids": related_object_ids,
                "notes": notes,
                "source_file": source_file,
                "source_heading_or_logical_block": source_refs[0] if source_refs else "",
                "rationale": (
                    f"`{object_name}` is cataloged from `data_model.md` and reconciled with schema and shell-contract ownership hints."
                    if entry
                    else f"`{object_name}` is a doc-only or schema-backed surface needed to preserve ownership boundaries."
                ),
            }
        )

    object_rows.sort(key=lambda row: row["object_name"])
    artifact_rows = [row for row in object_rows if row["object_kind"] != "mutable_entity"]
    schema_matrix_rows = schema_rows(schema_index, object_rows)
    lifecycle_rows = [
        {
            "object_id": row["object_id"],
            "object_name": row["object_name"],
            "coverage_class": infer_lifecycle_coverage(
                row["object_name"],
                row["object_kind"],
                split_field_tokens(object_source_map.get(row["object_name"], ObjectSourceEntry("", 0, "", "", "", DATA_MODEL_PATH, "", [])).field_blob if row["object_name"] in object_source_map else ""),
                state_machine_map,
            )["coverage_class"],
            "primary_state_field_or_null": row["primary_state_field_or_null"],
            "state_fields": infer_lifecycle_coverage(
                row["object_name"],
                row["object_kind"],
                split_field_tokens(object_source_map.get(row["object_name"], ObjectSourceEntry("", 0, "", "", "", DATA_MODEL_PATH, "", [])).field_blob if row["object_name"] in object_source_map else ""),
                state_machine_map,
            )["state_fields"],
            "state_machine_refs": infer_lifecycle_coverage(
                row["object_name"],
                row["object_kind"],
                split_field_tokens(object_source_map.get(row["object_name"], ObjectSourceEntry("", 0, "", "", "", DATA_MODEL_PATH, "", [])).field_blob if row["object_name"] in object_source_map else ""),
                state_machine_map,
            )["state_machine_refs"],
            "source_heading_or_logical_block": row["source_heading_or_logical_block"],
            "rationale": f"Lifecycle coverage for `{row['object_name']}` is `{infer_lifecycle_coverage(row['object_name'], row['object_kind'], split_field_tokens(object_source_map.get(row['object_name'], ObjectSourceEntry('', 0, '', '', '', DATA_MODEL_PATH, '', [])).field_blob if row['object_name'] in object_source_map else ''), state_machine_map)['coverage_class']}`.",
        }
        for row in object_rows
    ]
    lifecycle_rows.sort(key=lambda row: row["object_name"])
    projection_rows = read_model_projection_rows(object_rows)
    boundary_rows = [
        {
            "object_id": row["object_id"],
            "object_name": row["object_name"],
            "object_kind": row["object_kind"],
            "truth_class": row["truth_class"],
            "write_authority_class": row["write_authority_class"],
            "boundary_family": derive_boundary_family(row),
            "visibility_classes": row["visibility_classes"],
            "related_object_ids": row["related_object_ids"],
            "source_heading_or_logical_block": row["source_heading_or_logical_block"],
            "rationale": row["rationale"],
        }
        for row in object_rows
    ]
    ambiguous = ambiguous_rows(object_rows, schema_index, schema_matrix_rows, duplicate_notes)

    entity_catalog = {
        "summary": {
            "object_count": len(object_rows),
            "data_model_object_count": len(data_model_entries),
            "doc_only_object_count": len([row for row in object_rows if "GAP_DOC_ONLY_OBJECT_WITHOUT_DATA_MODEL_ENTRY" in row["notes"]]),
            "schema_mapped_object_count": len([row for row in object_rows if row["schema_path_or_paths"]]),
            "object_kind_counts": dict(sorted(Counter(row["object_kind"] for row in object_rows).items())),
            "truth_class_counts": dict(sorted(Counter(row["truth_class"] for row in object_rows).items())),
        },
        "objects": object_rows,
    }
    artifact_catalog = {
        "summary": {
            "artifact_like_object_count": len(artifact_rows),
            "object_kind_counts": dict(sorted(Counter(row["object_kind"] for row in artifact_rows).items())),
            "truth_class_counts": dict(sorted(Counter(row["truth_class"] for row in artifact_rows).items())),
        },
        "rows": artifact_rows,
    }
    read_model_projection_index = {
        "summary": {
            "projection_row_count": len(projection_rows),
            "audience_counts": dict(
                sorted(Counter(audience for row in projection_rows for audience in row["audience_classes"]).items())
            ),
            "shell_family_counts": dict(
                sorted(Counter(shell for row in projection_rows for shell in row["shell_families"]).items())
            ),
        },
        "rows": projection_rows,
    }
    truth_projection_boundary_map = {
        "summary": {
            "row_count": len(boundary_rows),
            "truth_class_counts": dict(sorted(Counter(row["truth_class"] for row in boundary_rows).items())),
            "boundary_family_counts": dict(sorted(Counter(row["boundary_family"] for row in boundary_rows).items())),
        },
        "rows": boundary_rows,
    }
    object_lifecycle_coverage = {
        "summary": {
            "row_count": len(lifecycle_rows),
            "coverage_counts": dict(sorted(Counter(row["coverage_class"] for row in lifecycle_rows).items())),
        },
        "rows": lifecycle_rows,
    }
    ambiguous_payload = {
        "summary": {
            "row_count": len(ambiguous),
            "record_type_counts": dict(sorted(Counter(row["record_type"] for row in ambiguous).items())),
        },
        "rows": sorted(
            ambiguous,
            key=lambda row: (
                row["record_type"],
                row.get("object_name") or row.get("schema_title") or row.get("schema_paths", [""])[0],
            ),
        ),
    }

    return {
        "entity_catalog": entity_catalog,
        "artifact_catalog": artifact_catalog,
        "schema_matrix_rows": schema_matrix_rows,
        "read_model_projection_index": read_model_projection_index,
        "truth_projection_boundary_map": truth_projection_boundary_map,
        "object_lifecycle_coverage": object_lifecycle_coverage,
        "ambiguous_payload": ambiguous_payload,
    }


def write_schema_matrix(rows: list[dict[str, Any]]) -> None:
    SCHEMA_OWNERSHIP_MATRIX_PATH.parent.mkdir(parents=True, exist_ok=True)
    with SCHEMA_OWNERSHIP_MATRIX_PATH.open("w", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "schema_path",
                "schema_title",
                "catalog_object_id_or_null",
                "catalog_object_name_or_null",
                "ownership_class",
                "object_kind_or_null",
                "truth_class_or_null",
                "authoritative_prose_source_ref_or_null",
                "source_file",
                "source_heading_or_logical_block",
                "rationale",
            ],
        )
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def write_docs(outputs: dict[str, Any]) -> None:
    entity_summary = outputs["entity_catalog"]["summary"]
    schema_rows = outputs["schema_matrix_rows"]
    projection_summary = outputs["read_model_projection_index"]["summary"]
    lifecycle_summary = outputs["object_lifecycle_coverage"]["summary"]
    ambiguous_summary = outputs["ambiguous_payload"]["summary"]

    entity_lines = [
        "# Entity, Artifact, and Schema Ownership",
        "",
        "## Summary",
        "",
        f"- Cataloged objects: `{entity_summary['object_count']}`",
        f"- Data-model object families: `{entity_summary['data_model_object_count']}`",
        f"- Doc-only supplemental objects: `{entity_summary['doc_only_object_count']}`",
        f"- Objects with direct schema bindings: `{entity_summary['schema_mapped_object_count']}`",
        f"- Classified schemas: `{len(schema_rows)}`",
        "",
        "## Object Kind Counts",
        "",
        "| Object Kind | Count |",
        "| --- | ---: |",
    ]
    for kind, count in entity_summary["object_kind_counts"].items():
        entity_lines.append(f"| `{kind}` | {count} |")
    entity_lines.extend(
        [
            "",
            "## Truth Classes",
            "",
            "| Truth Class | Count |",
            "| --- | ---: |",
        ]
    )
    for truth_class, count in entity_summary["truth_class_counts"].items():
        entity_lines.append(f"| `{truth_class}` | {count} |")
    ENTITY_DOC_PATH.write_text("\n".join(entity_lines) + "\n")

    boundary_lines = [
        "# Truth, Projection, and Control Boundary Matrix",
        "",
        f"- Projection rows: `{projection_summary['projection_row_count']}`",
        f"- Ambiguity rows: `{ambiguous_summary['row_count']}`",
        "",
        "## Projection Audiences",
        "",
        "| Audience | Count |",
        "| --- | ---: |",
    ]
    for audience, count in projection_summary["audience_counts"].items():
        boundary_lines.append(f"| `{audience}` | {count} |")
    boundary_lines.extend(
        [
            "",
            "## Shell Families",
            "",
            "| Shell Family | Count |",
            "| --- | ---: |",
        ]
    )
    for shell_family, count in projection_summary["shell_family_counts"].items():
        boundary_lines.append(f"| `{shell_family}` | {count} |")
    BOUNDARY_DOC_PATH.write_text("\n".join(boundary_lines) + "\n")

    lifecycle_lines = [
        "# Mutability and Lifecycle Ownership Notes",
        "",
        f"- Lifecycle rows: `{lifecycle_summary['row_count']}`",
        "",
        "## Lifecycle Coverage",
        "",
        "| Coverage | Count |",
        "| --- | ---: |",
    ]
    for coverage_class, count in lifecycle_summary["coverage_counts"].items():
        lifecycle_lines.append(f"| `{coverage_class}` | {count} |")
    lifecycle_lines.extend(
        [
            "",
            "## Ambiguous Ownership Record Types",
            "",
            "| Record Type | Count |",
            "| --- | ---: |",
        ]
    )
    for record_type, count in ambiguous_summary["record_type_counts"].items():
        lifecycle_lines.append(f"| `{record_type}` | {count} |")
    LIFECYCLE_DOC_PATH.write_text("\n".join(lifecycle_lines) + "\n")


def write_mermaid(object_rows: list[dict[str, Any]]) -> None:
    lines = [
        "flowchart LR",
        "  classDef mutable fill:#121721,stroke:#5AA9FF,color:#F5F7FA;",
        "  classDef artifact fill:#181E29,stroke:#52C18C,color:#F5F7FA;",
        "  classDef control fill:#181E29,stroke:#E7B04B,color:#F5F7FA;",
        "  classDef projection fill:#181E29,stroke:#A7B1BF,color:#F5F7FA;",
        "",
    ]
    by_kind: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in object_rows:
        by_kind[row["object_kind"]].append(row)
    for object_kind in sorted(OBJECT_KINDS):
        rows = sorted(by_kind.get(object_kind, []), key=lambda row: row["object_name"])
        if not rows:
            continue
        lines.append(f'  subgraph {snake_case(object_kind)}["{object_kind}"]')
        for row in rows:
            lines.append(f'    {row["object_id"]}["{row["object_name"]}"]')
        lines.append("  end")
        lines.append("")
    for row in sorted(object_rows, key=lambda item: item["object_name"]):
        for related_object_id in row["related_object_ids"][:12]:
            lines.append(f'  {row["object_id"]} --> {related_object_id}')
    RELATIONSHIP_DIAGRAM_PATH.write_text("\n".join(lines) + "\n")


def main() -> int:
    outputs = build_outputs()
    DATA_ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
    DOCS_ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
    DIAGRAMS_ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
    json_write(ENTITY_CATALOG_PATH, outputs["entity_catalog"])
    json_write(ARTIFACT_CATALOG_PATH, outputs["artifact_catalog"])
    write_schema_matrix(outputs["schema_matrix_rows"])
    json_write(READ_MODEL_PROJECTION_INDEX_PATH, outputs["read_model_projection_index"])
    json_write(TRUTH_PROJECTION_BOUNDARY_MAP_PATH, outputs["truth_projection_boundary_map"])
    json_write(OBJECT_LIFECYCLE_COVERAGE_PATH, outputs["object_lifecycle_coverage"])
    json_write(AMBIGUOUS_SCHEMA_RECORDS_PATH, outputs["ambiguous_payload"])
    write_docs(outputs)
    write_mermaid(outputs["entity_catalog"]["objects"])
    summary = {
        "status": "PASS",
        "object_count": outputs["entity_catalog"]["summary"]["object_count"],
        "artifact_like_object_count": outputs["artifact_catalog"]["summary"]["artifact_like_object_count"],
        "schema_count": len(outputs["schema_matrix_rows"]),
        "projection_row_count": outputs["read_model_projection_index"]["summary"]["projection_row_count"],
        "ambiguity_row_count": outputs["ambiguous_payload"]["summary"]["row_count"],
    }
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
