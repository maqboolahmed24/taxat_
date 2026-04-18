#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[2]
ALGORITHM_DIR = ROOT / "Algorithm"
DATA_ANALYSIS_DIR = ROOT / "data" / "analysis"
DOCS_ARCH_ADR_DIR = ROOT / "docs" / "architecture" / "adr"
DIAGRAMS_ANALYSIS_DIR = ROOT / "diagrams" / "analysis"

ACTOR_MODEL_PATH = ALGORITHM_DIR / "actor_and_authority_model.md"
AUTHORITY_PATH = ALGORITHM_DIR / "authority_interaction_protocol.md"
TRUTH_SEPARATION_PATH = (
    ALGORITHM_DIR / "authority_truth_and_internal_projection_separation_contract.md"
)
DEPLOYMENT_PATH = ALGORITHM_DIR / "deployment_and_resilience_contract.md"
SECURITY_PATH = ALGORITHM_DIR / "security_and_runtime_hardening_contract.md"
NORTHBOUND_PATH = ALGORITHM_DIR / "northbound_api_and_session_contract.md"
MODULES_PATH = ALGORITHM_DIR / "modules.md"

AUTHORITY_OPERATION_CATALOG_PATH = DATA_ANALYSIS_DIR / "authority_operation_catalog.json"
REQUEST_IDENTITY_RULES_PATH = (
    DATA_ANALYSIS_DIR / "request_identity_and_idempotency_rules.json"
)
RESPONSE_CLASS_REGISTRY_PATH = DATA_ANALYSIS_DIR / "response_class_registry.json"
AUTHORITY_TRUTH_MAP_PATH = (
    DATA_ANALYSIS_DIR / "authority_truth_vs_internal_projection_map.json"
)
UNRESOLVED_PROTOCOL_GAPS_PATH = DATA_ANALYSIS_DIR / "unresolved_protocol_gaps.json"
DEPENDENCY_REGISTER_PATH = DATA_ANALYSIS_DIR / "dependency_register.json"
CREDENTIAL_INVENTORY_PATH = DATA_ANALYSIS_DIR / "credential_secret_inventory.json"

ADR_PATH = DOCS_ARCH_ADR_DIR / "ADR-004-authority-integration-boundary.md"
COMPARISON_PATH = (
    DOCS_ARCH_ADR_DIR / "ADR-004-authority-integration-boundary-comparison.md"
)
SCORECARD_PATH = (
    DOCS_ARCH_ADR_DIR / "ADR-004-authority-integration-boundary-scorecard.json"
)
RESPONSIBILITY_MATRIX_PATH = (
    DATA_ANALYSIS_DIR / "authority_boundary_responsibility_matrix.json"
)
OPERATION_BOUNDARY_MAP_PATH = (
    DATA_ANALYSIS_DIR / "authority_operation_to_boundary_map.json"
)
SEND_RECEIVE_FLOW_PATH = (
    DATA_ANALYSIS_DIR / "authority_send_receive_reconciliation_flow.json"
)
CREDENTIAL_BOUNDARY_PATH = (
    DATA_ANALYSIS_DIR / "authority_credential_and_token_boundary.json"
)
CALLBACK_QUARANTINE_PATH = (
    DATA_ANALYSIS_DIR / "authority_callback_ingress_and_quarantine_matrix.json"
)
TRUTH_SURFACE_MAPPING_PATH = DATA_ANALYSIS_DIR / "authority_truth_surface_mapping.json"
MERMAID_PATH = DIAGRAMS_ANALYSIS_DIR / "ADR-004-authority-boundary.mmd"

HEADING_RE = re.compile(r"^(#{2,4})\s+(.*)$")
TODAY = "2026-04-17"


def repo_rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def ordered_unique(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        result.append(value)
    return result


def json_write(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")


def text_write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)


def load_json(path: Path) -> Any:
    return json.loads(path.read_text())


def find_heading_line(path: Path, heading_text: str) -> int:
    for line_number, line in enumerate(path.read_text().splitlines(), 1):
        match = HEADING_RE.match(line)
        if match and match.group(2).strip() == heading_text:
            return line_number
    raise ValueError(f"Heading `{heading_text}` not found in {path}")


def find_line_containing(path: Path, needle: str) -> int:
    for line_number, line in enumerate(path.read_text().splitlines(), 1):
        if needle in line:
            return line_number
    raise ValueError(f"Text `{needle}` not found in {path}")


def line_ref(path: Path, line_number: int, label: str) -> str:
    safe_label = re.sub(r"[^A-Za-z0-9_.-]+", "_", label).strip("_") or "line"
    return f"{repo_rel(path)}::L{line_number}[{safe_label}]"


def heading_ref(path: Path, heading_text: str, label: str | None = None) -> str:
    return line_ref(path, find_heading_line(path, heading_text), label or heading_text)


def text_ref(path: Path, needle: str, label: str | None = None) -> str:
    return line_ref(path, find_line_containing(path, needle), label or needle)


def md_escape(value: Any) -> str:
    if isinstance(value, list):
        value = ", ".join(str(item) for item in value)
    return str(value).replace("|", "\\|").replace("\n", " ").strip()


def markdown_table(headers: list[str], rows: list[list[Any]]) -> str:
    header_line = "| " + " | ".join(headers) + " |"
    divider_line = "| " + " | ".join("---" for _ in headers) + " |"
    body_lines = [
        "| " + " | ".join(md_escape(cell) for cell in row) + " |" for row in rows
    ]
    return "\n".join([header_line, divider_line, *body_lines])


def build_supporting_context() -> dict[str, Any]:
    operation_catalog = load_json(AUTHORITY_OPERATION_CATALOG_PATH)
    request_rules = load_json(REQUEST_IDENTITY_RULES_PATH)
    response_registry = load_json(RESPONSE_CLASS_REGISTRY_PATH)
    truth_map = load_json(AUTHORITY_TRUTH_MAP_PATH)
    gaps = load_json(UNRESOLVED_PROTOCOL_GAPS_PATH)
    dependency_register = load_json(DEPENDENCY_REGISTER_PATH)
    credential_inventory = load_json(CREDENTIAL_INVENTORY_PATH)

    dependency_rows = {
        row["dependency_key"]: row for row in dependency_register["dependencies"]
    }
    credential_rows = {
        row["credential_key"]: row
        for row in credential_inventory["credential_records"]
    }

    return {
        "operation_family_count": operation_catalog["summary"]["operation_family_count"],
        "response_class_count": response_registry["summary"]["response_class_count"],
        "truth_surface_count": truth_map["summary"]["surface_count"],
        "gap_count": gaps["summary"]["gap_count"],
        "dependency_count": dependency_register["dependency_count"],
        "credential_record_count": credential_inventory["credential_record_count"],
        "send_revalidation_check_count": request_rules["summary"][
            "send_revalidation_check_count"
        ],
        "request_identity_field_count": request_rules["summary"][
            "request_identity_field_count"
        ],
        "provider_interface_dependency": dependency_rows[
            "AUTHORITY_API_PROVIDER_INTERFACE"
        ],
        "profile_matrix_dependency": dependency_rows[
            "ENVIRONMENT_TENANT_AND_AUTHORITY_PROFILE_MATRIX"
        ],
        "callback_configuration_dependency": dependency_rows[
            "AUTHORITY_REDIRECT_URI_CALLBACK_AND_SCOPE_CONFIGURATION"
        ],
        "fraud_profile_dependency": dependency_rows[
            "AUTHORITY_FRAUD_PREVENTION_PROFILE_BINDINGS"
        ],
        "sandbox_client_record": credential_rows["hmrc-sandbox-client-credentials"],
        "production_client_record": credential_rows["hmrc-production-client-credentials"],
        "token_bundle_record": credential_rows["authority-oauth-token-bundle"],
    }


def build_criteria() -> list[dict[str, Any]]:
    return [
        {
            "criterion_id": "authority_of_record_truth_preservation",
            "label": "Authority-of-record truth preservation",
            "weight": 14,
            "priority": "HARD_REQUIREMENT",
            "rationale": "The boundary must preserve the distinct roles of checkpoint, runtime ledger, settlement ledger, workflow coordination, and customer-safe projection so no internal optimism or transport artifact can masquerade as confirmed authority truth.",
            "source_refs": [
                heading_ref(TRUTH_SEPARATION_PATH, "Purpose"),
                heading_ref(TRUTH_SEPARATION_PATH, "Governing Model"),
                heading_ref(TRUTH_SEPARATION_PATH, "Required Outcomes"),
                heading_ref(AUTHORITY_PATH, "9.10 Submission-state write rules"),
                heading_ref(AUTHORITY_PATH, "9.14 Out-of-band and authority-correction semantics"),
            ],
        },
        {
            "criterion_id": "raw_credential_and_token_isolation",
            "label": "Raw credential and token isolation",
            "weight": 12,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Raw authority credentials, client secrets, and signing material must remain behind a governed vault boundary rather than leaking into browser, native, queue, cache, or read-model paths.",
            "source_refs": [
                heading_ref(DEPLOYMENT_PATH, "1. Reference runtime topology"),
                heading_ref(SECURITY_PATH, "3. Secret, key, and token handling"),
                heading_ref(SECURITY_PATH, "5. Service-to-service and network hardening"),
                heading_ref(AUTHORITY_PATH, "9.6 Token and client binding rule"),
            ],
        },
        {
            "criterion_id": "send_time_revalidation_and_client_binding_fidelity",
            "label": "Send-time revalidation and client-binding fidelity",
            "weight": 10,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Every live send must stay bound to the frozen authority lineage, client, subject, environment, access binding, and step-up or approval evidence that originally authorized it, with fail-closed behavior on drift.",
            "source_refs": [
                heading_ref(AUTHORITY_PATH, "9.5 Preflight sequence"),
                heading_ref(AUTHORITY_PATH, "9.6 Token and client binding rule"),
                heading_ref(MODULES_PATH, "AUTHORITY_PREFLIGHT(...)"),
                heading_ref(MODULES_PATH, "RESOLVE_AUTHORITY_BINDING(...)"),
                heading_ref(MODULES_PATH, "SUBMIT_TO_AUTHORITY(...)"),
            ],
        },
        {
            "criterion_id": "callback_ingress_safety_and_quarantine_posture",
            "label": "Callback and inbound ingress safety",
            "weight": 9,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Every callback, poll payload, or recovered provider response must be authenticated, deduped, checkpointed, and strongly correlated before mutation, with weak or ambiguous evidence quarantined instead of promoted.",
            "source_refs": [
                heading_ref(AUTHORITY_PATH, "9.9A Inbound authority ingress protocol"),
                heading_ref(TRUTH_SEPARATION_PATH, "Surface Rules"),
                heading_ref(SECURITY_PATH, "5. Service-to-service and network hardening"),
                heading_ref(MODULES_PATH, "CHECKPOINT_AUTHORITY_INGRESS(...)"),
                heading_ref(MODULES_PATH, "NORMALIZE_AUTHORITY_RESPONSE(...)"),
            ],
        },
        {
            "criterion_id": "idempotency_and_duplicate_suppression_integrity",
            "label": "Idempotency and duplicate suppression integrity",
            "weight": 8,
            "priority": "HARD_REQUIREMENT",
            "rationale": "The architecture must keep request-hash identity, duplicate meaning, idempotency keys, delivery dedupe, and canonical receipt refs as durable control data rather than transient worker memory.",
            "source_refs": [
                heading_ref(AUTHORITY_PATH, "9.8 Request hashing and idempotency"),
                heading_ref(AUTHORITY_PATH, "9.12 Duplicate and pending-state rules"),
                heading_ref(MODULES_PATH, "DERIVE_AUTHORITY_REQUEST_HASHES(...)"),
                heading_ref(MODULES_PATH, "BUILD_AUTHORITY_REQUEST_ENVELOPE(...)"),
                heading_ref(MODULES_PATH, "CHECKPOINT_AUTHORITY_INGRESS(...)"),
            ],
        },
        {
            "criterion_id": "reconciliation_and_out_of_band_correction_support",
            "label": "Reconciliation and out-of-band correction support",
            "weight": 10,
            "priority": "HARD_REQUIREMENT",
            "rationale": "The boundary must keep reconciliation as a first-class control path with persisted budget, ambiguity posture, and reopening semantics so late authority truth or contradictory evidence can safely supersede internal projections.",
            "source_refs": [
                heading_ref(AUTHORITY_PATH, "9.13 Reconciliation protocol"),
                heading_ref(
                    AUTHORITY_PATH, "9.13A Reconciliation budget and escalation rule"
                ),
                heading_ref(
                    AUTHORITY_PATH,
                    "9.13B Quantitative reconciliation confidence and ambiguity",
                ),
                heading_ref(AUTHORITY_PATH, "9.14 Out-of-band and authority-correction semantics"),
                heading_ref(MODULES_PATH, "RECONCILE_AUTHORITY_STATE(...)"),
            ],
        },
        {
            "criterion_id": "no_blind_resend_recovery_posture",
            "label": "No-blind-resend recovery posture",
            "weight": 10,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Queue loss, worker restart, replay, restore, and rollback must recover from persisted ingress, request lineage, and reconciliation control instead of blindly resending live authority mutations.",
            "source_refs": [
                heading_ref(DEPLOYMENT_PATH, "6. Rollout, rollback, and fail-forward posture"),
                text_ref(
                    DEPLOYMENT_PATH,
                    "restore of authority-integrated workloads SHALL rebuild outstanding transmit and reconciliation work",
                    "authority_restore_rebuild_rule",
                ),
                text_ref(
                    DEPLOYMENT_PATH,
                    "no disaster-recovery or queue rebuild path may re-send a live authority mutation without",
                    "no_blind_resend_invariant",
                ),
                heading_ref(MODULES_PATH, "PERSIST_AUTHORITY_RECONCILIATION_CONTROL(...)"),
                heading_ref(MODULES_PATH, "SUBMIT_TO_AUTHORITY(...)"),
            ],
        },
        {
            "criterion_id": "multi_provider_evolvability_and_environment_separation",
            "label": "Multi-provider evolvability and sandbox or production separation",
            "weight": 7,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Provider transports, profile bindings, callback hosts, and sandbox versus production credentials need one stable boundary that can evolve per provider without collapsing the core control plane or mixing environments.",
            "source_refs": [
                heading_ref(AUTHORITY_PATH, "9.3 Core protocol objects"),
                heading_ref(DEPLOYMENT_PATH, "1. Reference runtime topology"),
                heading_ref(SECURITY_PATH, "8. Operational security release gates"),
                heading_ref(AUTHORITY_PATH, "9.7 Fraud-prevention header rule"),
            ],
        },
        {
            "criterion_id": "observability_and_audit_quality",
            "label": "Observability and audit quality",
            "weight": 7,
            "priority": "STRONG_PREFERENCE",
            "rationale": "The chosen boundary should produce one explainable audit lineage from initiating actor through request hashing, gateway send, ingress checkpoint, normalization, reconciliation, and downstream projection.",
            "source_refs": [
                heading_ref(AUTHORITY_PATH, "9.15 Audit invariants"),
                heading_ref(DEPLOYMENT_PATH, "1. Reference runtime topology"),
                heading_ref(MODULES_PATH, "RECORD_AUTHORITY_INTERACTION(...)"),
                heading_ref(MODULES_PATH, "MERGE_AUTHORITY_RESPONSE_OBSERVATION(...)"),
            ],
        },
        {
            "criterion_id": "operability_testability_and_failure_isolation",
            "label": "Operability, testability, and failure isolation",
            "weight": 7,
            "priority": "STRONG_PREFERENCE",
            "rationale": "The design should make provider failure, ingress quarantine, token rotation, and release gating isolatable and testable without turning every northbound request path into provider-coupled runtime logic.",
            "source_refs": [
                heading_ref(DEPLOYMENT_PATH, "7. Minimum operational runbooks"),
                heading_ref(SECURITY_PATH, "8. Operational security release gates"),
                heading_ref(DEPLOYMENT_PATH, "2. Promotion pipeline"),
                heading_ref(MODULES_PATH, "AUTHORITY_PREFLIGHT(...)"),
            ],
        },
        {
            "criterion_id": "browser_native_machine_actor_trust_boundary_clarity",
            "label": "Browser, native, and machine-actor trust-boundary clarity",
            "weight": 4,
            "priority": "HARD_REQUIREMENT",
            "rationale": "The architecture must keep browser, native, and machine callers away from direct provider traffic so human sessions, service principals, and authority tokens do not collapse into one ambiguous transport edge.",
            "source_refs": [
                heading_ref(ACTOR_MODEL_PATH, "3.4 Authority layers"),
                heading_ref(ACTOR_MODEL_PATH, "3.13 Machine-actor rules"),
                heading_ref(ACTOR_MODEL_PATH, "3.15 Frontend and governance-console rendering contract"),
                heading_ref(NORTHBOUND_PATH, "8. Session, browser, and native-client rules"),
                text_ref(
                    MODULES_PATH,
                    "never access providers directly from application code",
                    "no_direct_provider_calls",
                ),
            ],
        },
        {
            "criterion_id": "implementation_complexity_vs_safety_payoff",
            "label": "Implementation complexity versus safety payoff",
            "weight": 2,
            "priority": "TRADEOFF",
            "rationale": "The chosen option should add only the complexity needed to protect legal truth, token isolation, and recovery correctness; convenience alone does not justify boundary collapse.",
            "source_refs": [
                heading_ref(DEPLOYMENT_PATH, "1. Reference runtime topology"),
                heading_ref(SECURITY_PATH, "5. Service-to-service and network hardening"),
                heading_ref(MODULES_PATH, "AUTHORITY_PREFLIGHT(...)"),
            ],
        },
    ]


def build_responsibility_matrix() -> dict[str, Any]:
    records = [
        {
            "component_id": "BROWSER_AND_PORTAL_SURFACES",
            "label": "Browser and portal surfaces",
            "boundary_class": "INTERACTIVE_PRESENTATION_EDGE",
            "may_do": [
                "Collect user intent and display customer-safe or operator-safe authority posture.",
                "Initiate commands and authority-link workflows only through the northbound session gateway.",
                "Preserve same-object return targets across step-up and authority handoffs.",
            ],
            "must_do": [
                "Keep authority truth visibly typed so UNKNOWN, PENDING_ACK, and OUT_OF_BAND do not render as confirmed.",
                "Treat authority-facing actions as command intents rather than direct provider calls.",
            ],
            "must_never_do": [
                "Call authority providers directly.",
                "Persist raw authority tokens, client secrets, or fraud-header payloads.",
                "Settle authority confirmation from optimistic UI state or inline copy.",
            ],
            "authoritative_artifacts": [
                "customer-safe projections only",
                "route_context and return-target metadata",
            ],
            "source_refs": [
                heading_ref(ACTOR_MODEL_PATH, "3.15 Frontend and governance-console rendering contract"),
                heading_ref(NORTHBOUND_PATH, "8. Session, browser, and native-client rules"),
                text_ref(MODULES_PATH, "never access providers directly from application code"),
            ],
        },
        {
            "component_id": "NATIVE_OPERATOR_WORKSPACE",
            "label": "Native operator workspace",
            "boundary_class": "INTERACTIVE_PRESENTATION_EDGE",
            "may_do": [
                "Render operator status, launch browser-managed authority auth flows, and send commands through the northbound gateway.",
                "Store only product-session artifacts and tenant-bound local cache state.",
            ],
            "must_do": [
                "Keep device-local storage free of raw authority credentials.",
                "Return users to the same manifest or workflow context after external handoff.",
            ],
            "must_never_do": [
                "Hold raw authority access or refresh tokens on device.",
                "Bypass the northbound gateway or controlled authority gateway.",
            ],
            "authoritative_artifacts": [
                "local session and resume metadata only",
                "no legal truth surface",
            ],
            "source_refs": [
                heading_ref(NORTHBOUND_PATH, "8. Session, browser, and native-client rules"),
                heading_ref(SECURITY_PATH, "4. Browser, native-client, API, and transport hardening"),
                text_ref(MODULES_PATH, "never access providers directly from application code"),
            ],
        },
        {
            "component_id": "MACHINE_AUTOMATION_CLIENTS",
            "label": "Machine automation clients",
            "boundary_class": "NON_HUMAN_CALLER",
            "may_do": [
                "Issue explicit commands with service identity, command_id, and idempotency_key.",
                "Trigger read or reconciliation flows permitted by server-side policy.",
            ],
            "must_do": [
                "Remain distinct from human sessions and human-only step-up or approval posture.",
                "Use the northbound command surface rather than direct provider traffic.",
            ],
            "must_never_do": [
                "Masquerade as a human signatory or approval actor.",
                "Satisfy human-only step-up by virtue of machine credentials.",
                "Call providers directly with raw authority credentials.",
            ],
            "authoritative_artifacts": [
                "command envelopes and receipts only",
            ],
            "source_refs": [
                heading_ref(ACTOR_MODEL_PATH, "3.13 Machine-actor rules"),
                heading_ref(NORTHBOUND_PATH, "3. Command envelope"),
                text_ref(MODULES_PATH, "never access providers directly from application code"),
            ],
        },
        {
            "component_id": "NORTHBOUND_API_AND_SESSION_GATEWAY",
            "label": "Northbound API and session gateway",
            "boundary_class": "SESSION_AND_COMMAND_EDGE",
            "may_do": [
                "Authenticate browser, native, and machine callers.",
                "Validate command envelopes, stale-view guards, and anti-CSRF or session posture.",
                "Emit command receipts and serve read surfaces derived from durable truth.",
            ],
            "must_do": [
                "Preserve actor, session, and command identity without embedding raw authority credentials in commands.",
                "Pass authority-facing intents into the manifest control plane rather than directly to providers.",
            ],
            "must_never_do": [
                "Perform direct provider transport.",
                "Settle authority truth from session or UI state.",
            ],
            "authoritative_artifacts": [
                "CommandEnvelope",
                "CommandReceipt",
            ],
            "source_refs": [
                heading_ref(NORTHBOUND_PATH, "3. Command envelope"),
                heading_ref(NORTHBOUND_PATH, "4. Command receipt"),
                heading_ref(NORTHBOUND_PATH, "8. Session, browser, and native-client rules"),
            ],
        },
        {
            "component_id": "MANIFEST_WORKFLOW_CONTROL_PLANE",
            "label": "Manifest and workflow control plane",
            "boundary_class": "DURABLE_COMMAND_CORE",
            "may_do": [
                "Authorize action families and freeze PrincipalContext, AuthorityBinding, and request identity.",
                "Resolve operation profiles, submission lineage, and reconciliation control state.",
                "Own legal-state mutation of SubmissionRecord, AuthorityInteractionRecord, and subordinate mirrors.",
            ],
            "must_do": [
                "Begin request lineage before transport.",
                "Persist reconciliation control and resend legality before any recovery path resumes.",
                "Keep queue and projection layers subordinate to durable truth artifacts.",
            ],
            "must_never_do": [
                "Silently rebind requests to a new client, subject, or authority link.",
                "Treat callbacks as settled truth before checkpoint, normalization, and correlation complete.",
            ],
            "authoritative_artifacts": [
                "AuthorityBinding",
                "AuthorityRequestEnvelope identity",
                "AuthorityInteractionRecord",
                "SubmissionRecord",
                "WorkflowItem",
            ],
            "source_refs": [
                heading_ref(AUTHORITY_PATH, "9.1 Boundary rule"),
                heading_ref(AUTHORITY_PATH, "9.10 Submission-state write rules"),
                heading_ref(MODULES_PATH, "AUTHORITY_PREFLIGHT(...)"),
                heading_ref(MODULES_PATH, "PERSIST_AUTHORITY_RECONCILIATION_CONTROL(...)"),
                heading_ref(MODULES_PATH, "RECONCILE_AUTHORITY_STATE(...)"),
            ],
        },
        {
            "component_id": "CONTROLLED_AUTHORITY_GATEWAY",
            "label": "Controlled authority gateway",
            "boundary_class": "PROVIDER_TRANSPORT_EDGE",
            "may_do": [
                "Perform provider-specific transport, callback authentication, and delivery dedupe.",
                "Hydrate vault-held credentials by opaque ref for lawful send-time use.",
                "Checkpoint inbound payloads before handing normalized evidence back to the control plane.",
            ],
            "must_do": [
                "Run send-time revalidation against current binding lineage and policy snapshot.",
                "Preserve sandbox versus production separation and profile-specific fraud-header rules.",
                "Persist AuthorityIngressReceipt before normalization or state mutation.",
            ],
            "must_never_do": [
                "Expose raw credentials to browser, native, queue, or read-model paths.",
                "Settle legal truth on its own.",
                "Silently swap client, subject, authority scope, or provider environment on a prepared request.",
            ],
            "authoritative_artifacts": [
                "transport-level send witness",
                "AuthorityIngressReceipt checkpoint evidence",
            ],
            "source_refs": [
                heading_ref(DEPLOYMENT_PATH, "1. Reference runtime topology"),
                heading_ref(AUTHORITY_PATH, "9.5 Preflight sequence"),
                heading_ref(AUTHORITY_PATH, "9.9A Inbound authority ingress protocol"),
                heading_ref(SECURITY_PATH, "5. Service-to-service and network hardening"),
                heading_ref(MODULES_PATH, "SUBMIT_TO_AUTHORITY(...)"),
            ],
        },
        {
            "component_id": "TOKEN_VAULT_AND_KMS",
            "label": "Token vault and KMS/HSM",
            "boundary_class": "SECRET_ISOLATION_BOUNDARY",
            "may_do": [
                "Store raw authority tokens, client secrets, and secret-version lineage.",
                "Support rotation, attestation, and versioned release of credential material to the controlled gateway.",
            ],
            "must_do": [
                "Keep sandbox and production credentials partitioned.",
                "Expose only opaque refs outside the boundary.",
            ],
            "must_never_do": [
                "Write raw tokens into queues, logs, read models, browser storage, or device caches.",
                "Allow rotation to silently widen scope or change subject lineage.",
            ],
            "authoritative_artifacts": [
                "SecretVersion",
                "vault-held authority token bundle",
                "vault-held client-secret material",
            ],
            "source_refs": [
                heading_ref(DEPLOYMENT_PATH, "1. Reference runtime topology"),
                heading_ref(SECURITY_PATH, "3. Secret, key, and token handling"),
                heading_ref(SECURITY_PATH, "8. Operational security release gates"),
            ],
        },
        {
            "component_id": "PRIMARY_CONTROL_STORE",
            "label": "Primary control store",
            "boundary_class": "DURABLE_STATE_BOUNDARY",
            "may_do": [
                "Persist manifests, submission records, authority interaction ledgers, ingress receipts, and workflow state.",
                "Anchor duplicate suppression, resend legality, and response history.",
            ],
            "must_do": [
                "Remain the source of truth for replay, restore, and reconciliation.",
                "Preserve canonical receipt refs and request identity fields durably.",
            ],
            "must_never_do": [
                "Treat queues or projections as the source of legal truth.",
                "Collapse timeout placeholders, conflict evidence, or correction history during recovery.",
            ],
            "authoritative_artifacts": [
                "SubmissionRecord",
                "AuthorityInteractionRecord",
                "AuthorityIngressReceipt",
                "gate and workflow state",
            ],
            "source_refs": [
                heading_ref(DEPLOYMENT_PATH, "1. Reference runtime topology"),
                text_ref(
                    DEPLOYMENT_PATH,
                    "restore of authority-integrated workloads SHALL rebuild outstanding transmit and reconciliation work",
                ),
                heading_ref(MODULES_PATH, "MERGE_AUTHORITY_RESPONSE_OBSERVATION(...)"),
            ],
        },
        {
            "component_id": "QUEUE_AND_BROKER",
            "label": "Queue and broker",
            "boundary_class": "DELIVERY_FABRIC",
            "may_do": [
                "Coordinate workers and deliver outbox or inbox signals.",
                "Carry opaque refs to durable command-side records.",
            ],
            "must_do": [
                "Remain rebuildable from durable truth.",
                "Never become the system of record for authority or settlement truth.",
            ],
            "must_never_do": [
                "Act as a bearer credential by itself.",
                "Authorize resend of live authority mutations without control-plane checks.",
            ],
            "authoritative_artifacts": [
                "none; transport-only",
            ],
            "source_refs": [
                heading_ref(DEPLOYMENT_PATH, "1. Reference runtime topology"),
                heading_ref(DEPLOYMENT_PATH, "8. Release and resilience invariants"),
                heading_ref(SECURITY_PATH, "9. Security invariants"),
            ],
        },
        {
            "component_id": "READ_SIDE_PROJECTOR_AND_STREAM_BROKER",
            "label": "Read-side projector and stream broker",
            "boundary_class": "DISPOSABLE_PROJECTION_BOUNDARY",
            "may_do": [
                "Materialize operator and customer-safe projections from durable truth artifacts.",
                "Publish low-noise frames, timeline events, and resumable read surfaces.",
            ],
            "must_do": [
                "Keep pending, unknown, and out-of-band posture typed and non-confirming.",
                "Rebuild from durable command-side artifacts after drift or restore.",
            ],
            "must_never_do": [
                "Upgrade authority truth from cached projection state.",
                "Create settlement state without command-side evidence.",
            ],
            "authoritative_artifacts": [
                "ObligationMirror projection",
                "ClientTimelineEvent",
            ],
            "source_refs": [
                heading_ref(DEPLOYMENT_PATH, "1. Reference runtime topology"),
                heading_ref(TRUTH_SEPARATION_PATH, "Surface Rules"),
                heading_ref(NORTHBOUND_PATH, "7. Stream and reconnect rules"),
            ],
        },
        {
            "component_id": "APPEND_ONLY_AUDIT_STORE",
            "label": "Append-only audit store",
            "boundary_class": "FORENSIC_EVIDENCE_BOUNDARY",
            "may_do": [
                "Retain immutable evidence for authority planning, send, ingress, normalization, and reconciliation events.",
                "Support investigation after restore, rollback, or late corrections.",
            ],
            "must_do": [
                "Keep request_hash, idempotency_key, authority_link_ref, and token_binding_ref lineage available.",
                "Remain append-only across rebuilds and rollback.",
            ],
            "must_never_do": [
                "Overwrite or hide already-persisted authority evidence.",
                "Serve as a mutable workflow coordination store.",
            ],
            "authoritative_artifacts": [
                "AuthorityOperationPlanned",
                "AuthorityRequestBuilt",
                "AuthorityRequestSent",
                "AuthorityResponseReceived",
                "AuthorityReconciliationResolved",
            ],
            "source_refs": [
                heading_ref(DEPLOYMENT_PATH, "1. Reference runtime topology"),
                heading_ref(AUTHORITY_PATH, "9.15 Audit invariants"),
                heading_ref(DEPLOYMENT_PATH, "6. Rollout, rollback, and fail-forward posture"),
            ],
        },
        {
            "component_id": "AUTHORITY_PROVIDER",
            "label": "Authority provider",
            "boundary_class": "EXTERNAL_LEGAL_SYSTEM",
            "may_do": [
                "Issue the legal or regulatory observations that Taxat must treat as authority-of-record evidence.",
                "Return synchronous acknowledgements and asynchronous callbacks or poll-visible state.",
            ],
            "must_do": [
                "Remain explicitly separated by provider environment, API version, and profile binding.",
            ],
            "must_never_do": [
                "Be treated as an internal projection boundary.",
                "Be reachable directly from browser, native, or machine callers outside the controlled gateway.",
            ],
            "authoritative_artifacts": [
                "external authority truth only",
            ],
            "source_refs": [
                heading_ref(AUTHORITY_PATH, "9.2 Protocol scope"),
                heading_ref(AUTHORITY_PATH, "9.3 Core protocol objects"),
                heading_ref(DEPLOYMENT_PATH, "1. Reference runtime topology"),
            ],
        },
    ]

    return {
        "generated_at": TODAY,
        "responsibility_record_count": len(records),
        "responsibility_records": records,
    }


def build_operation_boundary_map(
    operation_catalog: dict[str, Any],
) -> dict[str, Any]:
    family_defaults = {
        "authority_read": {
            "initiating_actor_classes": [
                "PREPARER",
                "APPROVER",
                "TENANT_ADMIN",
                "SUPPORT_OPERATOR",
                "SERVICE_INTEGRATION",
            ],
            "required_step_up_level": "STEP_UP_IF_POLICY_OR_BINDING_REQUIRES",
            "allowed_transport_caller": "CONTROLLED_AUTHORITY_GATEWAY_ONLY",
            "send_path": [
                "Northbound API and session gateway",
                "Manifest and workflow control plane",
                "Controlled authority gateway",
                "Authority provider",
            ],
            "callback_path": [
                "Authority provider",
                "Controlled authority gateway",
                "AuthorityIngressReceipt checkpoint",
                "Normalization and merge in the control plane",
            ],
            "reconciliation_path": [
                "AuthorityInteractionRecord",
                "Reconciliation control",
                "SubmissionRecord or ObligationMirror only when stronger bound evidence exists",
            ],
            "truth_settlement_surface": "AuthorityInteractionRecord by default; SubmissionRecord only when reconciliation lawfully upgrades external truth",
        },
        "authority_mutation": {
            "initiating_actor_classes": [
                "PREPARER",
                "APPROVER",
                "TENANT_ADMIN",
            ],
            "required_step_up_level": "STEP_UP_OR_APPROVAL_IF_POLICY_REQUIRES",
            "allowed_transport_caller": "CONTROLLED_AUTHORITY_GATEWAY_ONLY",
            "send_path": [
                "Northbound API and session gateway",
                "Manifest and workflow control plane",
                "Controlled authority gateway",
                "Authority provider",
            ],
            "callback_path": [
                "Authority provider",
                "Controlled authority gateway",
                "AuthorityIngressReceipt checkpoint",
                "Normalization and possible reconciliation",
            ],
            "reconciliation_path": [
                "AuthorityInteractionRecord",
                "Reconciliation control if async confirmation or contradiction appears",
            ],
            "truth_settlement_surface": "AuthorityInteractionRecord for draft or mutation evidence; no customer-safe confirmation without bound authority evidence",
        },
        "authority_calculation": {
            "initiating_actor_classes": [
                "PREPARER",
                "APPROVER",
                "TENANT_ADMIN",
                "SERVICE_INTEGRATION",
            ],
            "required_step_up_level": "STEP_UP_IF_POLICY_OR_BINDING_REQUIRES",
            "allowed_transport_caller": "CONTROLLED_AUTHORITY_GATEWAY_ONLY",
            "send_path": [
                "Northbound API and session gateway",
                "Manifest and workflow control plane",
                "Controlled authority gateway",
                "Authority provider",
            ],
            "callback_path": [
                "Authority provider",
                "Controlled authority gateway",
                "AuthorityIngressReceipt checkpoint",
                "Calculation evidence normalization",
            ],
            "reconciliation_path": [
                "AuthorityInteractionRecord",
                "Calculation lineage comparison",
            ],
            "truth_settlement_surface": "AuthorityInteractionRecord and calculation artifacts only; filing settlement remains separate",
        },
        "authority_submission": {
            "initiating_actor_classes": [
                "APPROVER",
                "CLIENT_SIGNATORY",
                "TENANT_ADMIN",
            ],
            "required_step_up_level": "HUMAN_STEP_UP_OR_APPROVED_EQUIVALENT_REQUIRED",
            "allowed_transport_caller": "CONTROLLED_AUTHORITY_GATEWAY_ONLY",
            "send_path": [
                "Northbound API and session gateway",
                "Manifest and workflow control plane",
                "Controlled authority gateway",
                "Authority provider",
            ],
            "callback_path": [
                "Authority provider",
                "Controlled authority gateway",
                "AuthorityIngressReceipt checkpoint",
                "Normalization and merge",
                "SubmissionRecord settlement or reconciliation",
            ],
            "reconciliation_path": [
                "Persisted reconciliation_control_contract",
                "Read or callback follow-up via controlled gateway",
                "SubmissionRecord",
                "ObligationMirror",
                "ClientTimelineEvent",
            ],
            "truth_settlement_surface": "SubmissionRecord only, with ObligationMirror and ClientTimelineEvent reopened or updated downstream",
        },
        "authority_reconciliation": {
            "initiating_actor_classes": [
                "APPROVER",
                "TENANT_ADMIN",
                "SUPPORT_OPERATOR",
                "SERVICE_INTEGRATION",
            ],
            "required_step_up_level": "STEP_UP_IF_ESCALATION_OR_OVERRIDE_PATH_REQUIRES",
            "allowed_transport_caller": "CONTROLLED_AUTHORITY_GATEWAY_ONLY",
            "send_path": [
                "Manifest and workflow control plane",
                "Controlled authority gateway",
                "Authority provider",
            ],
            "callback_path": [
                "Authority provider",
                "Controlled authority gateway",
                "AuthorityIngressReceipt checkpoint",
                "Reconciliation merge path",
            ],
            "reconciliation_path": [
                "Persisted reconciliation_control_contract",
                "Response merge",
                "SubmissionRecord",
                "ObligationMirror",
                "WorkflowItem",
                "ClientTimelineEvent",
            ],
            "truth_settlement_surface": "SubmissionRecord after reconciliation resolves ambiguity or out-of-band correction",
        },
    }

    family_overrides = {
        "AUTH_READ_OBLIGATIONS": {
            "truth_settlement_surface": "SubmissionRecord or ObligationMirror only through reconciliation-owned paths; customer-safe projection stays typed",
        },
        "AUTH_TRIGGER_CALCULATION": {
            "required_step_up_level": "STEP_UP_OR_APPROVAL_IF_POLICY_REQUIRES",
        },
        "AUTH_RECONCILE_STATUS": {
            "send_path": [
                "Manifest and workflow control plane",
                "Controlled authority gateway",
                "Authority provider",
            ],
        },
    }

    records: list[dict[str, Any]] = []
    for operation in operation_catalog["operation_records"]:
        defaults = family_defaults[operation["protocol_family"]]
        overrides = family_overrides.get(operation["operation_family"], {})
        merged = {**defaults, **overrides}
        records.append(
            {
                "operation_family": operation["operation_family"],
                "protocol_family": operation["protocol_family"],
                "initiating_actor_classes": merged["initiating_actor_classes"],
                "required_step_up_level": merged["required_step_up_level"],
                "allowed_transport_caller": merged["allowed_transport_caller"],
                "token_scope_and_binding_basis": {
                    "required_binding_fields": operation["required_binding_fields"],
                    "scope_requirements": operation["scope_requirements"],
                },
                "preflight_inputs": ordered_unique(
                    [
                        "PrincipalContext",
                        "AuthorityBinding",
                        "AuthorityOperationProfile",
                        *operation["preflight_checks"],
                    ]
                ),
                "send_path": merged["send_path"],
                "callback_path": merged["callback_path"],
                "reconciliation_path": merged["reconciliation_path"],
                "truth_settlement_surface": merged["truth_settlement_surface"],
                "request_identity_fields": operation["request_identity_fields"],
                "response_classes": operation["response_classes"],
                "module_bindings": operation["module_bindings"],
                "projection_rules": operation["projection_rules"],
                "submission_state_write_rules": operation["submission_state_write_rules"],
                "truth_owner": operation["truth_owner"],
                "source_refs": operation["source_refs"],
            }
        )

    return {
        "generated_at": TODAY,
        "operation_family_count": len(records),
        "operation_records": records,
    }


def build_send_receive_reconciliation_flow() -> dict[str, Any]:
    flows = [
        {
            "flow_id": "live_submission_send",
            "label": "Live authority submission send",
            "trigger": "Human-approved submission command",
            "steps": [
                "Northbound API authenticates caller and persists CommandReceipt.",
                "Control plane authorizes, freezes PrincipalContext and AuthorityBinding, derives request hashes, and begins SubmissionRecord lineage.",
                "Controlled authority gateway hydrates vault-held credential material by ref, attaches fraud headers, acquires exclusive send claim, and runs send-time revalidation.",
                "Authority provider receives the request and returns synchronous acknowledgement or later async evidence.",
                "Control plane records AuthorityInteractionRecord and only writes allowed non-confirming submission states until bound authority evidence settles truth.",
            ],
            "quarantine_or_block_conditions": [
                "binding drift",
                "step-up or approval expiry",
                "duplicate occupancy",
                "token-client mismatch",
            ],
            "settlement_surface": "SubmissionRecord only when bound authority evidence lawfully permits mutation",
            "source_refs": [
                heading_ref(AUTHORITY_PATH, "9.5 Preflight sequence"),
                heading_ref(AUTHORITY_PATH, "9.6 Token and client binding rule"),
                heading_ref(MODULES_PATH, "SUBMIT_TO_AUTHORITY(...)"),
            ],
        },
        {
            "flow_id": "inline_acknowledgement_observation",
            "label": "Inline acknowledgement observation",
            "trigger": "Synchronous provider response on the live send path",
            "steps": [
                "Gateway returns the provider response to the control plane as transport evidence rather than customer truth.",
                "Normalizer classifies the response into canonical response classes.",
                "Control plane appends response history and may set PENDING_ACK, REJECTED, or other admissible states where exact lineage binding is present.",
            ],
            "quarantine_or_block_conditions": [
                "ambiguous correlation",
                "inconsistent state",
                "timeout placeholder superseded by stronger evidence",
            ],
            "settlement_surface": "SubmissionRecord for direct bound mutations; otherwise AuthorityInteractionRecord until reconciliation resolves",
            "source_refs": [
                heading_ref(AUTHORITY_PATH, "9.9 Response classes"),
                heading_ref(MODULES_PATH, "NORMALIZE_AUTHORITY_RESPONSE(...)"),
                heading_ref(MODULES_PATH, "MERGE_AUTHORITY_RESPONSE_OBSERVATION(...)"),
            ],
        },
        {
            "flow_id": "async_callback_or_poll_ingress",
            "label": "Asynchronous callback or poll ingress",
            "trigger": "Provider callback, poll result, or recovered gateway response",
            "steps": [
                "Controlled gateway authenticates the provider channel and computes the delivery dedupe key.",
                "Gateway persists AuthorityIngressReceipt before normalization or state mutation.",
                "Control plane reuses the ingress proof contract, normalizes the payload, and merges it into authority response history.",
                "Only bound and admissible evidence can update SubmissionRecord or subordinate mirrors.",
            ],
            "quarantine_or_block_conditions": [
                "weak authority-reference-only binding",
                "unbound delivery",
                "provider authentication failure",
            ],
            "settlement_surface": "AuthorityIngressReceipt is checkpoint only; SubmissionRecord remains the settlement ledger",
            "source_refs": [
                heading_ref(AUTHORITY_PATH, "9.9A Inbound authority ingress protocol"),
                heading_ref(TRUTH_SEPARATION_PATH, "Surface Rules"),
                heading_ref(MODULES_PATH, "CHECKPOINT_AUTHORITY_INGRESS(...)"),
            ],
        },
        {
            "flow_id": "duplicate_or_ambiguous_ingress_quarantine",
            "label": "Duplicate or ambiguous ingress quarantine",
            "trigger": "Duplicate callback, reordered delivery, or weakly correlated provider payload",
            "steps": [
                "Gateway binds the payload against expected lineage and canonical receipt identity.",
                "Duplicate deliveries become DUPLICATE_SUPPRESSED with canonical_ingress_receipt_ref set.",
                "Weak, ambiguous, or unbound deliveries become QUARANTINED with explicit investigation ownership.",
                "No second normalized response or settlement mutation is emitted until stronger evidence exists.",
            ],
            "quarantine_or_block_conditions": [
                "duplicate delivery",
                "authority_reference-only match",
                "ambiguous lineage",
                "unbound payload",
            ],
            "settlement_surface": "None until strong bound evidence exists",
            "source_refs": [
                heading_ref(AUTHORITY_PATH, "9.9A Inbound authority ingress protocol"),
                heading_ref(AUTHORITY_PATH, "9.12 Duplicate and pending-state rules"),
                heading_ref(SECURITY_PATH, "5. Service-to-service and network hardening"),
            ],
        },
        {
            "flow_id": "reconciliation_after_pending_timeout_or_conflict",
            "label": "Reconciliation after pending, timeout, or conflicting evidence",
            "trigger": "PENDING_ACK, timeout placeholder, contradictory callback, or out-of-band discovery",
            "steps": [
                "Control plane resumes from persisted reconciliation_control_contract rather than worker memory.",
                "Gateway performs allowed follow-up read or status operations inside the same binding lineage.",
                "Merge logic compares response history, correlation evidence, and source confidence.",
                "SubmissionRecord, ObligationMirror, WorkflowItem, and ClientTimelineEvent update only after reconciliation resolves or escalates.",
            ],
            "quarantine_or_block_conditions": [
                "budget exhausted",
                "blocked by escalation",
                "contradictory evidence below confidence threshold",
            ],
            "settlement_surface": "SubmissionRecord after reconciliation; subordinate mirrors reopen downstream",
            "source_refs": [
                heading_ref(AUTHORITY_PATH, "9.13 Reconciliation protocol"),
                heading_ref(AUTHORITY_PATH, "9.13A Reconciliation budget and escalation rule"),
                heading_ref(AUTHORITY_PATH, "9.13B Quantitative reconciliation confidence and ambiguity"),
                heading_ref(AUTHORITY_PATH, "9.14 Out-of-band and authority-correction semantics"),
            ],
        },
        {
            "flow_id": "recovery_after_queue_loss_restart_or_rollback",
            "label": "Recovery after queue loss, worker restart, or rollback",
            "trigger": "Queue rebuild, worker reclaim, release rollback, or disaster recovery",
            "steps": [
                "Recovery reloads persisted SubmissionRecord, AuthorityInteractionRecord, AuthorityIngressReceipt, and inbox truth from the primary store.",
                "Outstanding transmit and reconciliation work resumes from canonical ingress receipt refs and reconciliation control state.",
                "Any follow-up send re-runs request-lineage comparison, idempotency verification, and send-time binding revalidation.",
                "If resend legality is blocked, recovery remains read-only or escalates instead of emitting a new live mutation.",
            ],
            "quarantine_or_block_conditions": [
                "resend_legality_state blocks fresh transmit",
                "authority_binding_revalidation not verified",
                "authority_rebuild not verified",
            ],
            "settlement_surface": "Persisted command-side truth only; broker state is never authoritative",
            "source_refs": [
                text_ref(
                    DEPLOYMENT_PATH,
                    "restore of authority-integrated workloads SHALL rebuild outstanding transmit and reconciliation work",
                ),
                text_ref(
                    DEPLOYMENT_PATH,
                    "no disaster-recovery or queue rebuild path may re-send a live authority mutation without",
                ),
                heading_ref(MODULES_PATH, "PERSIST_AUTHORITY_RECONCILIATION_CONTROL(...)"),
                heading_ref(MODULES_PATH, "SUBMIT_TO_AUTHORITY(...)"),
            ],
        },
    ]

    return {
        "generated_at": TODAY,
        "flow_count": len(flows),
        "step_count": sum(len(flow["steps"]) for flow in flows),
        "flows": flows,
    }


def build_credential_boundary(
    support_context: dict[str, Any], request_rules: dict[str, Any]
) -> dict[str, Any]:
    sandbox_record = support_context["sandbox_client_record"]
    production_record = support_context["production_client_record"]
    token_record = support_context["token_bundle_record"]

    records = [
        {
            "material_id": "authority_oauth_token_bundle",
            "label": "Raw authority access and refresh tokens",
            "storage_boundary": token_record["storage_boundary"],
            "permitted_components": [
                "Token vault and KMS/HSM",
                "Controlled authority gateway by opaque ref only",
            ],
            "forbidden_components": [
                "Browser and portal surfaces",
                "Native operator workspace",
                "Queue and broker",
                "Read-side projector and stream broker",
                "General logs",
            ],
            "persistence_form": "vault-held token bundle keyed by token_binding_ref and binding lineage",
            "rotation_or_revalidation": token_record["rotation_or_renewal_rule"],
            "source_refs": [
                *[ref["source_ref"] for ref in token_record["source_refs"]],
                heading_ref(SECURITY_PATH, "3. Secret, key, and token handling"),
            ],
        },
        {
            "material_id": "sandbox_client_credentials",
            "label": "Sandbox provider client credentials",
            "storage_boundary": sandbox_record["storage_boundary"],
            "permitted_components": [
                "Token vault and KMS/HSM",
                "Controlled authority gateway configuration by opaque ref",
            ],
            "forbidden_components": [
                "Production provider profile",
                "Browser and portal surfaces",
                "Read-side projections",
            ],
            "persistence_form": "versioned client_id and client_secret record partitioned by sandbox profiles",
            "rotation_or_revalidation": sandbox_record["rotation_or_renewal_rule"],
            "source_refs": [ref["source_ref"] for ref in sandbox_record["source_refs"]],
        },
        {
            "material_id": "production_client_credentials",
            "label": "Production provider client credentials",
            "storage_boundary": production_record["storage_boundary"],
            "permitted_components": [
                "Token vault and KMS/HSM",
                "Controlled authority gateway configuration by opaque ref",
            ],
            "forbidden_components": [
                "Sandbox provider profile",
                "Browser and portal surfaces",
                "Read-side projections",
            ],
            "persistence_form": "versioned client_id and client_secret record partitioned by production profiles",
            "rotation_or_revalidation": production_record["rotation_or_renewal_rule"],
            "source_refs": [ref["source_ref"] for ref in production_record["source_refs"]],
        },
        {
            "material_id": "token_binding_and_lineage_refs",
            "label": "Token-binding, authority-link, and binding-lineage references",
            "storage_boundary": "PRIMARY_CONTROL_STORE",
            "permitted_components": [
                "Manifest and workflow control plane",
                "Controlled authority gateway",
                "Append-only audit store",
            ],
            "forbidden_components": [
                "Browser and portal surfaces as mutable credentials",
                "Queue and broker as bearer material",
            ],
            "persistence_form": "AuthorityBinding and audit lineage refs only",
            "rotation_or_revalidation": "Every live send revalidates token version, access_binding_hash, policy_snapshot_hash, and authority_link lineage.",
            "source_refs": [
                heading_ref(AUTHORITY_PATH, "9.3 Core protocol objects"),
                heading_ref(AUTHORITY_PATH, "9.6 Token and client binding rule"),
                heading_ref(MODULES_PATH, "RESOLVE_AUTHORITY_BINDING(...)"),
            ],
        },
        {
            "material_id": "request_identity_hashes",
            "label": "Request hashes, duplicate meaning keys, and idempotency keys",
            "storage_boundary": "PRIMARY_CONTROL_STORE_AND_AUDIT",
            "permitted_components": [
                "Manifest and workflow control plane",
                "Controlled authority gateway",
                "Append-only audit store",
            ],
            "forbidden_components": [
                "Browser-generated legal truth",
                "Queue-only storage without durable control-plane copy",
            ],
            "persistence_form": "sealed request identity fields and canonical hashes",
            "rotation_or_revalidation": (
                f"Derived from {request_rules['summary']['request_identity_field_count']} frozen request identity fields and reused across resend legality, duplicate suppression, and audit."
            ),
            "source_refs": [
                heading_ref(AUTHORITY_PATH, "9.8 Request hashing and idempotency"),
                heading_ref(MODULES_PATH, "DERIVE_AUTHORITY_REQUEST_HASHES(...)"),
                heading_ref(MODULES_PATH, "BUILD_AUTHORITY_REQUEST_ENVELOPE(...)"),
            ],
        },
        {
            "material_id": "fraud_prevention_profile_bindings",
            "label": "Fraud-prevention header profiles and callback host configuration",
            "storage_boundary": "CONTROLLED_GATEWAY_CONFIGURATION",
            "permitted_components": [
                "Controlled authority gateway",
                "Profile matrix and provider configuration store",
            ],
            "forbidden_components": [
                "Browser and portal surfaces as direct header composers",
                "General logs with raw fraud-header payloads",
            ],
            "persistence_form": "versioned provider-profile bindings with environment partitioning",
            "rotation_or_revalidation": "Profile changes invalidate affected send paths and require provider-profile separation by environment.",
            "source_refs": [
                support_context["callback_configuration_dependency"]["source_ref"],
                support_context["fraud_profile_dependency"]["source_ref"],
                heading_ref(AUTHORITY_PATH, "9.7 Fraud-prevention header rule"),
            ],
        },
        {
            "material_id": "authority_ingress_proof_packet",
            "label": "Authority ingress proof and correlation packet",
            "storage_boundary": "PRIMARY_CONTROL_STORE_AND_AUDIT",
            "permitted_components": [
                "Controlled authority gateway",
                "Manifest and workflow control plane",
                "Append-only audit store",
            ],
            "forbidden_components": [
                "Read-side projection as a settlement surrogate",
                "Transport-local memory as the only copy",
            ],
            "persistence_form": "AuthorityIngressReceipt plus authority_ingress_proof_contract",
            "rotation_or_revalidation": "Reused across normalization, settlement mutation, replay, and restore rather than re-derived from raw callbacks.",
            "source_refs": [
                heading_ref(AUTHORITY_PATH, "9.9A Inbound authority ingress protocol"),
                heading_ref(TRUTH_SEPARATION_PATH, "Surface Rules"),
                heading_ref(SECURITY_PATH, "5. Service-to-service and network hardening"),
            ],
        },
        {
            "material_id": "response_history_and_reconciliation_control",
            "label": "Response history, resend legality, and reconciliation control",
            "storage_boundary": "PRIMARY_CONTROL_STORE",
            "permitted_components": [
                "Manifest and workflow control plane",
                "Append-only audit store",
            ],
            "forbidden_components": [
                "Queue-only memory",
                "Read-side projection as the authoritative copy",
            ],
            "persistence_form": "AuthorityInteractionRecord response history plus reconciliation_control_contract",
            "rotation_or_revalidation": "Updated when new authority evidence arrives and reused during restore or worker reclaim before any live resend.",
            "source_refs": [
                heading_ref(AUTHORITY_PATH, "9.13 Reconciliation protocol"),
                heading_ref(MODULES_PATH, "RECORD_AUTHORITY_INTERACTION(...)"),
                heading_ref(MODULES_PATH, "PERSIST_AUTHORITY_RECONCILIATION_CONTROL(...)"),
            ],
        },
    ]

    return {
        "generated_at": TODAY,
        "material_count": len(records),
        "material_records": records,
    }


def build_callback_quarantine_matrix() -> dict[str, Any]:
    cases = [
        {
            "case_id": "STRONGLY_BOUND_FIRST_SEEN",
            "receipt_state": "NORMALIZED",
            "correlation_posture": "BOUND",
            "gateway_action": "Authenticate, dedupe, checkpoint, and pass to normalization.",
            "mutation_permission": "Allowed only after normalization and control-plane merge.",
            "canonical_receipt_rule": "Creates first canonical ingress receipt for this delivery.",
            "quarantine_owner": None,
            "source_refs": [
                heading_ref(AUTHORITY_PATH, "9.9A Inbound authority ingress protocol"),
                heading_ref(MODULES_PATH, "CHECKPOINT_AUTHORITY_INGRESS(...)"),
            ],
        },
        {
            "case_id": "DUPLICATE_DELIVERY_SUPPRESSED",
            "receipt_state": "DUPLICATE_SUPPRESSED",
            "correlation_posture": "BOUND",
            "gateway_action": "Persist duplicate receipt with canonical_ingress_receipt_ref and skip second normalization.",
            "mutation_permission": "None.",
            "canonical_receipt_rule": "Must point at the existing canonical ingress receipt.",
            "quarantine_owner": None,
            "source_refs": [
                heading_ref(AUTHORITY_PATH, "9.9A Inbound authority ingress protocol"),
                heading_ref(AUTHORITY_PATH, "9.12 Duplicate and pending-state rules"),
            ],
        },
        {
            "case_id": "BOUND_WITH_AUTHORITY_REFERENCE_ONLY",
            "receipt_state": "QUARANTINED",
            "correlation_posture": "BOUND_WITH_AUTHORITY_REFERENCE_ONLY",
            "gateway_action": "Persist proof and quarantine for investigation; do not normalize to legal mutation.",
            "mutation_permission": "None until stronger lineage proof exists.",
            "canonical_receipt_rule": "May create a receipt, but cannot create a normalized response.",
            "quarantine_owner": "RECONCILIATION_OWNER_REQUIRED",
            "source_refs": [
                heading_ref(AUTHORITY_PATH, "9.9A Inbound authority ingress protocol"),
                heading_ref(SECURITY_PATH, "5. Service-to-service and network hardening"),
            ],
        },
        {
            "case_id": "AMBIGUOUS_CORRELATION",
            "receipt_state": "QUARANTINED",
            "correlation_posture": "AMBIGUOUS",
            "gateway_action": "Checkpoint the payload and block mutation pending operator or reconciliation investigation.",
            "mutation_permission": "None.",
            "canonical_receipt_rule": "No canonical settlement mutation until ambiguity is resolved.",
            "quarantine_owner": "RECONCILIATION_OWNER_REQUIRED",
            "source_refs": [
                heading_ref(AUTHORITY_PATH, "9.9A Inbound authority ingress protocol"),
                heading_ref(AUTHORITY_PATH, "9.13 Reconciliation protocol"),
            ],
        },
        {
            "case_id": "UNBOUND_DELIVERY",
            "receipt_state": "QUARANTINED",
            "correlation_posture": "UNBOUND",
            "gateway_action": "Persist authenticated ingress evidence and route to quarantine.",
            "mutation_permission": "None.",
            "canonical_receipt_rule": "Cannot become a settlement witness without later strong binding evidence.",
            "quarantine_owner": "RECONCILIATION_OWNER_REQUIRED",
            "source_refs": [
                heading_ref(AUTHORITY_PATH, "9.9A Inbound authority ingress protocol"),
                heading_ref(TRUTH_SEPARATION_PATH, "Required Outcomes"),
            ],
        },
        {
            "case_id": "PROVIDER_AUTHENTICATION_FAILURE",
            "receipt_state": "QUARANTINED",
            "correlation_posture": "CHANNEL_UNTRUSTED",
            "gateway_action": "Reject mutation, emit high-severity audit evidence, and preserve transport investigation details.",
            "mutation_permission": "None.",
            "canonical_receipt_rule": "No canonical receipt for settlement purposes.",
            "quarantine_owner": "SECURITY_AND_RECONCILIATION_OWNERS",
            "source_refs": [
                heading_ref(SECURITY_PATH, "5. Service-to-service and network hardening"),
                heading_ref(AUTHORITY_PATH, "9.15 Audit invariants"),
            ],
        },
        {
            "case_id": "REORDERED_OR_SUPERSEDING_PENDING_OBSERVATION",
            "receipt_state": "NORMALIZED_RECONCILIATION_REQUIRED",
            "correlation_posture": "BOUND_BUT_SUPERSEDING",
            "gateway_action": "Checkpoint and normalize, then route to merge or reconciliation rather than direct overwrite.",
            "mutation_permission": "Only through reconciliation or admissible merge rules.",
            "canonical_receipt_rule": "Each delivery gets its own receipt; active_response_id changes only through merge control.",
            "quarantine_owner": "RECONCILIATION_CONTROL",
            "source_refs": [
                heading_ref(AUTHORITY_PATH, "9.9B Multi-source response merge protocol"),
                heading_ref(AUTHORITY_PATH, "9.13 Reconciliation protocol"),
                heading_ref(MODULES_PATH, "MERGE_AUTHORITY_RESPONSE_OBSERVATION(...)"),
            ],
        },
    ]

    return {
        "generated_at": TODAY,
        "case_count": len(cases),
        "cases": cases,
    }


def build_truth_surface_mapping(truth_map: dict[str, Any]) -> dict[str, Any]:
    owner_map = {
        "AUTHORITY_INTERACTION_RECORD": {
            "owning_component": "MANIFEST_WORKFLOW_CONTROL_PLANE",
            "consumer_components": [
                "PRIMARY_CONTROL_STORE",
                "APPEND_ONLY_AUDIT_STORE",
                "READ_SIDE_PROJECTOR_AND_STREAM_BROKER",
            ],
            "settlement_role": "runtime_control_only",
        },
        "AUTHORITY_INGRESS_RECEIPT": {
            "owning_component": "CONTROLLED_AUTHORITY_GATEWAY",
            "consumer_components": [
                "MANIFEST_WORKFLOW_CONTROL_PLANE",
                "PRIMARY_CONTROL_STORE",
                "APPEND_ONLY_AUDIT_STORE",
            ],
            "settlement_role": "checkpoint_only",
        },
        "SUBMISSION_RECORD": {
            "owning_component": "MANIFEST_WORKFLOW_CONTROL_PLANE",
            "consumer_components": [
                "PRIMARY_CONTROL_STORE",
                "READ_SIDE_PROJECTOR_AND_STREAM_BROKER",
                "APPEND_ONLY_AUDIT_STORE",
            ],
            "settlement_role": "authority_settlement",
        },
        "OBLIGATION_MIRROR": {
            "owning_component": "READ_SIDE_PROJECTOR_AND_STREAM_BROKER",
            "consumer_components": [
                "BROWSER_AND_PORTAL_SURFACES",
                "NATIVE_OPERATOR_WORKSPACE",
            ],
            "settlement_role": "subordinate_internal_mirror",
        },
        "WORKFLOW_ITEM": {
            "owning_component": "MANIFEST_WORKFLOW_CONTROL_PLANE",
            "consumer_components": [
                "BROWSER_AND_PORTAL_SURFACES",
                "NATIVE_OPERATOR_WORKSPACE",
            ],
            "settlement_role": "coordination_only",
        },
        "CLIENT_TIMELINE_EVENT": {
            "owning_component": "READ_SIDE_PROJECTOR_AND_STREAM_BROKER",
            "consumer_components": [
                "BROWSER_AND_PORTAL_SURFACES",
            ],
            "settlement_role": "customer_safe_projection_only",
        },
    }

    surfaces: list[dict[str, Any]] = []
    for surface in truth_map["surfaces"]:
        owner = owner_map[surface["boundary_scope"]]
        surfaces.append(
            {
                **surface,
                "owning_component": owner["owning_component"],
                "consumer_components": owner["consumer_components"],
                "settlement_role": owner["settlement_role"],
            }
        )

    return {
        "generated_at": TODAY,
        "surface_count": len(surfaces),
        "northbound_command_constraints": truth_map["northbound_command_constraints"],
        "surfaces": surfaces,
    }


def build_alternatives() -> list[dict[str, Any]]:
    return [
        {
            "alternative_id": "dedicated_controlled_authority_gateway_boundary",
            "label": "Dedicated controlled authority gateway with isolated credential handling, checkpointed ingress, and explicit reconciliation control",
            "summary": "Keep provider transport, callback ingress, fraud-header composition, and vault-mediated credential usage inside a dedicated controlled gateway, while the manifest control plane owns request identity, submission truth, reconciliation control, and downstream projections.",
            "strengths": [
                "Best fit for the corpus rule that browser, native, and machine callers must not talk to providers directly.",
                "Preserves the checkpoint-versus-settlement split by letting ingress stop at AuthorityIngressReceipt while the control plane remains the only writer of SubmissionRecord truth.",
                "Keeps raw tokens, client secrets, and sandbox or production profile differences behind a narrow gateway-plus-vault boundary.",
            ],
            "risks": [
                "Adds an explicit runtime boundary and therefore more inter-service plumbing than an inline transport implementation.",
                "Requires disciplined contract ownership between the gateway, vault, and control plane so the boundary does not degrade into a leaky proxy.",
            ],
            "scores": {
                "authority_of_record_truth_preservation": (
                    4.75,
                    "Only option that cleanly preserves checkpoint, runtime ledger, settlement ledger, and customer-safe projection as separate machine-readable layers.",
                ),
                "raw_credential_and_token_isolation": (
                    4.75,
                    "Concentrates raw credential use inside the vault-plus-gateway boundary and keeps other components on opaque refs.",
                ),
                "send_time_revalidation_and_client_binding_fidelity": (
                    4.75,
                    "Matches the frozen preflight, binding-lineage, and send-time revalidation rules directly.",
                ),
                "callback_ingress_safety_and_quarantine_posture": (
                    4.75,
                    "Supports one ingress checkpoint that authenticates, dedupes, quarantines, and persists AuthorityIngressReceipt before any mutation.",
                ),
                "idempotency_and_duplicate_suppression_integrity": (
                    4.75,
                    "Keeps request hashes, duplicate suppression, and canonical receipt refs on the durable command side rather than transport-local memory.",
                ),
                "reconciliation_and_out_of_band_correction_support": (
                    4.75,
                    "Lets reconciliation remain an explicit control-plane path that consumes gateway evidence without collapsing it into transport behavior.",
                ),
                "no_blind_resend_recovery_posture": (
                    4.75,
                    "Best fit for restore and queue-loss rules because resend legality and ingress proof remain durable and boundary-scoped.",
                ),
                "multi_provider_evolvability_and_environment_separation": (
                    4.5,
                    "Allows provider-specific headers, callback rules, and sandbox or production partitioning without infecting the whole northbound surface.",
                ),
                "observability_and_audit_quality": (
                    4.5,
                    "Produces crisp audit lineage across send, ingress, normalization, and reconciliation.",
                ),
                "operability_testability_and_failure_isolation": (
                    4.25,
                    "Provider degradation, token rotation, and ingress quarantine can fail in the gateway without collapsing the whole command edge.",
                ),
                "browser_native_machine_actor_trust_boundary_clarity": (
                    4.5,
                    "Makes it explicit that all callers use the same northbound command contract while only the gateway speaks provider transport.",
                ),
                "implementation_complexity_vs_safety_payoff": (
                    3.75,
                    "Adds complexity, but almost all of it buys legally significant isolation rather than ornamental abstraction.",
                ),
            },
        },
        {
            "alternative_id": "inline_authority_integration_inside_northbound_orchestrator",
            "label": "Inline authority integration inside the main northbound API and orchestrator boundary",
            "summary": "Let the northbound or orchestrator services perform provider transport directly, with request identity, session checks, ingress handling, and reconciliation all co-located in the main application boundary.",
            "strengths": [
                "Reduces hop count and can be simpler to deploy initially.",
                "Keeps transport logic close to command authorization and may feel easier for small teams to trace at first.",
            ],
            "risks": [
                "Blurs browser or native session boundaries, request identity logic, provider transport, and callback quarantine inside one large service boundary.",
                "Increases the chance that token use, callback handling, and settlement mutation drift together instead of staying explicitly separated.",
            ],
            "scores": {
                "authority_of_record_truth_preservation": (
                    3.0,
                    "Truth separation can still be implemented, but checkpoint, transport, and settlement logic sit close enough together that drift risk stays materially higher.",
                ),
                "raw_credential_and_token_isolation": (
                    2.5,
                    "Vault use remains possible, but raw credential access spreads closer to the main northbound edge.",
                ),
                "send_time_revalidation_and_client_binding_fidelity": (
                    3.25,
                    "Can support frozen binding checks, though transport convenience pressures the orchestrator to take on too much provider-specific state.",
                ),
                "callback_ingress_safety_and_quarantine_posture": (
                    2.75,
                    "Checkpointing is possible, but callback, normalization, and settlement code are easier to collapse together in one process boundary.",
                ),
                "idempotency_and_duplicate_suppression_integrity": (
                    3.25,
                    "Durable request identity can exist, but it competes with inline transport shortcuts and service-local retry behavior.",
                ),
                "reconciliation_and_out_of_band_correction_support": (
                    3.25,
                    "Reconciliation still works, but it is more likely to be treated as a branch of inline transport code rather than a durable control path.",
                ),
                "no_blind_resend_recovery_posture": (
                    3.0,
                    "Recovery can honor resend legality, but coupling transport and orchestration increases accidental resend risk during worker reclaim or rollback.",
                ),
                "multi_provider_evolvability_and_environment_separation": (
                    3.25,
                    "Provider profile variation is feasible, but adapter concerns leak into the core northbound and orchestration layers.",
                ),
                "observability_and_audit_quality": (
                    3.75,
                    "Fewer boundaries can simplify local tracing, though audit semantics become less structurally obvious.",
                ),
                "operability_testability_and_failure_isolation": (
                    3.25,
                    "A large integrated service is still testable, but provider failure and callback quarantine are less isolated.",
                ),
                "browser_native_machine_actor_trust_boundary_clarity": (
                    2.5,
                    "The no-direct-provider rule becomes architectural convention rather than a dedicated enforced boundary.",
                ),
                "implementation_complexity_vs_safety_payoff": (
                    4.5,
                    "Wins on short-term simplicity, though much of that simplicity comes from collapsing boundaries the corpus wants separated.",
                ),
            },
        },
        {
            "alternative_id": "external_managed_integration_transport_edge",
            "label": "External managed integration or iPaaS boundary as the primary transport edge",
            "summary": "Push provider transport, callback ingress, and some normalization into an external managed integration platform, with Taxat consuming already-processed events and adapter outcomes from that external edge.",
            "strengths": [
                "Can reduce some custom transport implementation work and offers adapter convenience across providers.",
                "Looks attractive when provider-specific APIs change often or when a platform team wants hosted connector tooling.",
            ],
            "risks": [
                "Moves too much legal-state-critical logic outside the control boundary that the corpus describes.",
                "Makes checkpoint proof, exact request lineage, secret isolation, and no-blind-resend recovery materially harder to prove and test end to end.",
            ],
            "scores": {
                "authority_of_record_truth_preservation": (
                    2.25,
                    "Checkpoint, settlement, and reconciliation semantics become harder to keep first-class when ingress is mediated by a third-party edge.",
                ),
                "raw_credential_and_token_isolation": (
                    2.0,
                    "Hosted integration platforms tend to widen the blast radius of raw credentials and callback secrets compared with a narrow vault-plus-gateway boundary.",
                ),
                "send_time_revalidation_and_client_binding_fidelity": (
                    2.25,
                    "Exact access_binding_hash and policy_snapshot_hash revalidation become less trustworthy once transport is abstracted outside the core runtime boundary.",
                ),
                "callback_ingress_safety_and_quarantine_posture": (
                    2.0,
                    "Ingress checkpointing can exist, but legal mutation risks being based on externally normalized events rather than first-party proof packets.",
                ),
                "idempotency_and_duplicate_suppression_integrity": (
                    2.0,
                    "Exact request hash and canonical receipt control become harder when delivery identity is shaped by an external platform.",
                ),
                "reconciliation_and_out_of_band_correction_support": (
                    2.25,
                    "External tooling can help fetch provider state, but the bounded reconciliation semantics still need to be rebuilt inside Taxat.",
                ),
                "no_blind_resend_recovery_posture": (
                    2.0,
                    "Recovery correctness is weakest here because hosted retries and replay semantics are harder to bind to Taxat's resend legality model.",
                ),
                "multi_provider_evolvability_and_environment_separation": (
                    3.5,
                    "Managed adapters can help with provider heterogeneity, which is the main reason this option remains viable at all.",
                ),
                "observability_and_audit_quality": (
                    2.25,
                    "Forensic lineage becomes split across first-party and third-party logs.",
                ),
                "operability_testability_and_failure_isolation": (
                    2.5,
                    "Adds another operator boundary and makes incident drills depend on external platform behavior the corpus does not control.",
                ),
                "browser_native_machine_actor_trust_boundary_clarity": (
                    2.0,
                    "Callers still avoid direct provider traffic, but the decisive boundary shifts away from Taxat's own controlled gateway and vault semantics.",
                ),
                "implementation_complexity_vs_safety_payoff": (
                    3.0,
                    "Can reduce adapter coding, but the safety tradeoff is poor because core truth and recovery invariants remain first-party obligations anyway.",
                ),
            },
        },
    ]


def build_scorecard_payload(
    criteria: list[dict[str, Any]],
    alternatives: list[dict[str, Any]],
    supporting_context: dict[str, Any],
    coverage_summary: dict[str, Any],
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    results: list[dict[str, Any]] = []
    for alternative in alternatives:
        criterion_breakdown: list[dict[str, Any]] = []
        weighted_total = 0.0
        for criterion in criteria:
            raw_score, note = alternative["scores"][criterion["criterion_id"]]
            weighted_score = round(raw_score * criterion["weight"] / 5, 2)
            weighted_total += weighted_score
            criterion_breakdown.append(
                {
                    "criterion_id": criterion["criterion_id"],
                    "label": criterion["label"],
                    "priority": criterion["priority"],
                    "weight": criterion["weight"],
                    "raw_score": raw_score,
                    "weighted_score": weighted_score,
                    "note": note,
                }
            )

        results.append(
            {
                "alternative_id": alternative["alternative_id"],
                "label": alternative["label"],
                "summary": alternative["summary"],
                "strengths": alternative["strengths"],
                "risks": alternative["risks"],
                "criterion_breakdown": criterion_breakdown,
                "weighted_total": round(weighted_total, 2),
            }
        )

    results.sort(key=lambda item: item["weighted_total"], reverse=True)
    for rank, result in enumerate(results, 1):
        result["rank"] = rank

    scorecard = {
        "decision_id": "ADR-004",
        "decision_name": "authority_integration_boundary",
        "generated_at": TODAY,
        "criteria": criteria,
        "alternatives": results,
        "recommended_alternative_id": results[0]["alternative_id"],
        "recommended_alternative_label": results[0]["label"],
        "coverage_summary": coverage_summary,
        "supporting_context": {
            "operation_family_count": supporting_context["operation_family_count"],
            "response_class_count": supporting_context["response_class_count"],
            "truth_surface_count": supporting_context["truth_surface_count"],
            "gap_count": supporting_context["gap_count"],
            "dependency_count": supporting_context["dependency_count"],
            "credential_record_count": supporting_context["credential_record_count"],
            "request_identity_field_count": supporting_context[
                "request_identity_field_count"
            ],
            "send_revalidation_check_count": supporting_context[
                "send_revalidation_check_count"
            ],
            "provider_interface_dependency_key": supporting_context[
                "provider_interface_dependency"
            ]["dependency_key"],
            "profile_matrix_dependency_key": supporting_context[
                "profile_matrix_dependency"
            ]["dependency_key"],
            "callback_configuration_dependency_key": supporting_context[
                "callback_configuration_dependency"
            ]["dependency_key"],
            "fraud_profile_dependency_key": supporting_context[
                "fraud_profile_dependency"
            ]["dependency_key"],
            "secret_storage_boundary": supporting_context["token_bundle_record"][
                "storage_boundary"
            ],
        },
    }
    return results, scorecard


def build_adr_markdown(
    criteria: list[dict[str, Any]],
    results: list[dict[str, Any]],
    responsibility_matrix: dict[str, Any],
    operation_boundary_map: dict[str, Any],
    flows: dict[str, Any],
    credential_boundary: dict[str, Any],
    callback_matrix: dict[str, Any],
    truth_surface_mapping: dict[str, Any],
    gaps: dict[str, Any],
    supporting_context: dict[str, Any],
) -> str:
    winner = results[0]

    driver_rows = [
        [criterion["label"], criterion["priority"], criterion["weight"], criterion["rationale"]]
        for criterion in criteria
    ]
    responsibility_rows = [
        [
            row["label"],
            row["boundary_class"],
            row["authoritative_artifacts"][0],
            row["must_never_do"][0],
        ]
        for row in responsibility_matrix["responsibility_records"]
    ]
    operation_rows = [
        [
            row["operation_family"],
            ", ".join(row["initiating_actor_classes"]),
            row["required_step_up_level"],
            row["truth_settlement_surface"],
        ]
        for row in operation_boundary_map["operation_records"]
    ]
    flow_rows = [
        [
            flow["label"],
            flow["trigger"],
            flow["settlement_surface"],
            ", ".join(flow["quarantine_or_block_conditions"]),
        ]
        for flow in flows["flows"]
    ]
    alternative_rows = [
        [result["label"], result["weighted_total"], result["rank"]]
        for result in results
    ]
    truth_rows = [
        [
            surface["artifact_name"],
            surface["truth_surface_role"],
            surface["owning_component"],
            surface["settlement_role"],
        ]
        for surface in truth_surface_mapping["surfaces"]
    ]

    deferred_items = [
        f"{gap['gap_id']}: {gap['required_closure']}" for gap in gaps["gaps"]
    ]

    lines = [
        "# ADR-004: Authority Integration Boundary",
        "",
        "- Status: Accepted",
        f"- Date: {TODAY}",
        "- Deciders: Phase 00 architecture analysis pack",
        "",
        "## Context",
        "",
        "Taxat already specifies the hard parts of authority integration in detail: authority layers and delegation remain separate from legal truth, request identity is frozen before send, fraud headers are protocol validity rather than metadata, callbacks must checkpoint before mutation, and recovery must never blind-resend live authority actions. What the corpus did not do centrally was choose one architectural boundary that holds those rules together.",
        "",
        f"The prior analysis packs normalized `{supporting_context['operation_family_count']}` authority operation families, `{supporting_context['response_class_count']}` canonical response classes, `{supporting_context['truth_surface_count']}` governed truth surfaces, and `{supporting_context['gap_count']}` typed protocol gaps. ADR-004 closes the remaining architecture gap by selecting where provider transport lives, where credentials live, where ingress is checkpointed, where settlement truth is allowed to change, and how recovery resumes without mutating legal state from broker memory or optimistic UI signals.",
        "",
        "## Decision",
        "",
        "Adopt a **dedicated controlled authority gateway boundary** paired with **vault-mediated credential isolation** and a **separate command-side reconciliation control path**:",
        "",
        "- Browser, portal, native, and machine callers may express authority intent only through the northbound command surface; they never call providers directly.",
        "- The manifest and workflow control plane owns request identity, PrincipalContext, AuthorityBinding, submission lineage, response history, resend legality, reconciliation budgets, and all legal-state mutation of `SubmissionRecord`.",
        "- The controlled authority gateway owns provider-specific transport, fraud-header composition, callback authentication, provider-delivery dedupe, and first persistence of `AuthorityIngressReceipt`.",
        "- Raw authority tokens and client-secret material remain inside the token vault and KMS/HSM boundary; the gateway accesses them only by opaque reference.",
        "- `AuthorityIngressReceipt` remains checkpoint truth only. Settlement truth changes only after normalization, merge, and where required reconciliation update the command-side `SubmissionRecord`.",
        "- Recovery after queue loss, restart, or rollback resumes from persisted request lineage, ingress proof, response history, and `reconciliation_control_contract` rather than replaying transport attempts blind.",
        "",
        "## Decision Drivers",
        "",
        markdown_table(
            ["Driver", "Priority", "Weight", "Why It Matters"], driver_rows
        ),
        "",
        "## Responsibility Split",
        "",
        markdown_table(
            ["Boundary", "Class", "Primary Artifact", "First Forbidden Move"],
            responsibility_rows,
        ),
        "",
        f"The responsibility matrix covers `{responsibility_matrix['responsibility_record_count']}` explicit boundaries. The core split is intentional: callers stop at the session and command edge, provider transport stops at the controlled gateway, raw secrets stop at the vault, settlement truth stops at `SubmissionRecord`, and customer-safe rendering stops at projections derived from durable truth.",
        "",
        "## Authority Operation Map",
        "",
        markdown_table(
            ["Operation", "Initiators", "Step-Up Posture", "Truth Settlement Surface"],
            operation_rows,
        ),
        "",
        f"The operation map covers all `{operation_boundary_map['operation_family_count']}` authority-facing operation families. Submission families settle only through `SubmissionRecord`; read, mutation, and calculation families may refresh authority observations but do not bypass the settlement ledger.",
        "",
        "## Flow Handling",
        "",
        markdown_table(
            ["Flow", "Trigger", "Settlement Rule", "Quarantine Or Block Conditions"],
            flow_rows,
        ),
        "",
        f"The chosen boundary centralizes `{flows['flow_count']}` critical send, ingress, reconciliation, and recovery flows and `{callback_matrix['case_count']}` callback or quarantine cases. This closes the earlier gap where send path, callback path, and reconciliation path were each explicit in prose but not collapsed into one architecture choice.",
        "",
        "## Truth Surface Mapping",
        "",
        markdown_table(
            ["Artifact", "Truth Role", "Owning Component", "Settlement Role"],
            truth_rows,
        ),
        "",
        "This mapping is the reason the gateway boundary wins. `AuthorityIngressReceipt` is preserved as checkpoint-only evidence, `AuthorityInteractionRecord` remains runtime control and history, `SubmissionRecord` remains the only durable settlement ledger, and projections remain subordinate to those command-side artifacts.",
        "",
        "## Alternatives Considered",
        "",
        markdown_table(["Alternative", "Weighted Score", "Rank"], alternative_rows),
        "",
        f"The winning option is **{winner['label']}** with a weighted score of `{winner['weighted_total']}`.",
        "",
        "## Why This Option Wins",
        "",
        "- It is the only option that preserves the corpus's checkpoint-versus-settlement split structurally rather than by convention.",
        "- It gives raw credentials one narrow blast radius: the token vault and the controlled gateway.",
        "- It lets provider-specific profile bindings, fraud headers, callback hosts, and sandbox-versus-production differences evolve without infecting the whole northbound surface.",
        "- It matches the no-blind-resend recovery rules because resend legality, ingress proof, and response history remain durable command-side data instead of transport-local behavior.",
        "- It keeps machine callers distinct from human sessions and still enforces the no-direct-provider rule across browser, native, and automation surfaces.",
        "",
        "## Guardrails On The Decision",
        "",
        "- Browser, native, and portal surfaces SHALL NOT call authority providers directly.",
        "- Machine actors SHALL remain distinct from human sessions and SHALL NOT bypass human-only step-up or signatory requirements.",
        "- Raw authority tokens and client secrets SHALL remain in the token vault and KMS/HSM boundary, never in browser storage, device caches, queues, or read models.",
        "- Sandbox and production provider profiles, callback hosts, and credentials SHALL remain explicitly partitioned.",
        "- `AuthorityIngressReceipt` SHALL remain checkpoint evidence only; it SHALL NOT settle legal truth by itself.",
        "- Duplicate, reordered, weakly bound, or ambiguous callback deliveries SHALL dedupe, quarantine, or reconcile rather than silently overwrite active truth.",
        "- Queue loss, replay, or restore SHALL NOT blind-resend live authority mutations without request-lineage comparison, idempotency verification, send-time binding revalidation, and persisted resend legality permitting that exact action.",
        "- Late authority corrections SHALL reopen downstream mirrors, workflow coordination, and customer-safe projections where the truth-separation contract requires it.",
        "",
        "## Consequences",
        "",
        "Positive consequences:",
        "",
        "- Future authority adapter work now has one fixed home: the controlled gateway, not the browser, not the northbound API, and not the projection layer.",
        "- Security posture becomes easier to reason about because token use, callback authentication, and fraud-header composition happen inside one narrow edge.",
        "- Recovery posture becomes explicit: restore resumes from primary truth artifacts and reconciliation control instead of guessing from broker or timeout state.",
        "",
        "Negative consequences and tradeoffs:",
        "",
        "- The runtime topology is more complex than an inline provider integration, because the gateway, vault, and command core must cooperate through durable contracts.",
        "- Engineers must maintain sharper boundary discipline: the gateway cannot become a hidden settlement engine, and the control plane cannot become a direct provider client.",
        "- Provider SDK convenience or hosted integration shortcuts are rejected when they conflict with checkpoint, lineage, or settlement semantics.",
        "",
        "## Rollback And Recovery Posture",
        "",
        "- Code rollback may occur only when schema and compatibility boundaries allow it; legal authority truth is never rolled back by deleting evidence.",
        "- Outstanding authority work rebuilds from persisted `AuthorityIngressReceipt`, `AuthorityInteractionRecord`, `SubmissionRecord`, and inbox truth.",
        "- Fresh resend after bytes have left process remains illegal unless request-lineage comparison, idempotency, binding revalidation, and persisted resend legality all permit it.",
        "- Quarantined, duplicate-suppressed, and ambiguous ingress remains durable so recovery does not lose the reason a payload was blocked.",
        "",
        "## Deferred Decisions",
        "",
        *[f"- {item}" for item in deferred_items],
        "",
        "These are intentionally deferred because they concern concrete provider implementation data or operational workflow specifics, not the boundary choice itself.",
        "",
        "## References",
        "",
        f"- Responsibility matrix: [authority_boundary_responsibility_matrix.json]({RESPONSIBILITY_MATRIX_PATH})",
        f"- Operation map: [authority_operation_to_boundary_map.json]({OPERATION_BOUNDARY_MAP_PATH})",
        f"- Send, receive, and reconciliation flow: [authority_send_receive_reconciliation_flow.json]({SEND_RECEIVE_FLOW_PATH})",
        f"- Credential and token boundary: [authority_credential_and_token_boundary.json]({CREDENTIAL_BOUNDARY_PATH})",
        f"- Callback quarantine matrix: [authority_callback_ingress_and_quarantine_matrix.json]({CALLBACK_QUARANTINE_PATH})",
        f"- Truth surface mapping: [authority_truth_surface_mapping.json]({TRUTH_SURFACE_MAPPING_PATH})",
        f"- Scorecard: [ADR-004-authority-integration-boundary-scorecard.json]({SCORECARD_PATH})",
        f"- Comparison notes: [ADR-004-authority-integration-boundary-comparison.md]({COMPARISON_PATH})",
        f"- Decision diagram: [ADR-004-authority-boundary.mmd]({MERMAID_PATH})",
    ]

    return "\n".join(lines) + "\n"


def build_comparison_markdown(
    criteria: list[dict[str, Any]],
    results: list[dict[str, Any]],
    coverage_summary: dict[str, Any],
) -> str:
    ranking_rows = [
        [
            result["rank"],
            result["label"],
            result["weighted_total"],
            "; ".join(result["strengths"][:2]),
        ]
        for result in results
    ]
    criteria_rows = [
        [
            criterion["label"],
            criterion["priority"],
            criterion["weight"],
            ", ".join(criterion["source_refs"]),
        ]
        for criterion in criteria
    ]

    lines = [
        "# ADR-004 Comparison Notes",
        "",
        "This comparison expands the weighted scorecard that supports ADR-004.",
        "",
        "## Ranking",
        "",
        markdown_table(
            ["Rank", "Alternative", "Weighted Score", "Leading Strengths"],
            ranking_rows,
        ),
        "",
        "## Criteria and Weights",
        "",
        markdown_table(
            ["Criterion", "Priority", "Weight", "Source Grounding"], criteria_rows
        ),
        "",
        "## Coverage Summary",
        "",
        f"- Responsibility boundaries covered: `{coverage_summary['responsibility_record_count']}`",
        f"- Authority operation families covered: `{coverage_summary['operation_family_count']}`",
        f"- Send, receive, and recovery flows covered: `{coverage_summary['flow_count']}`",
        f"- Callback and quarantine cases covered: `{coverage_summary['callback_case_count']}`",
        f"- Truth surfaces covered: `{coverage_summary['truth_surface_count']}`",
        f"- Credential and token material classes covered: `{coverage_summary['credential_material_count']}`",
    ]

    for criterion in criteria:
        lines.extend(
            [
                "",
                f"## {criterion['label']}",
                "",
                f"- Priority: `{criterion['priority']}`",
                f"- Weight: `{criterion['weight']}`",
                f"- Rationale: {criterion['rationale']}",
                "",
                markdown_table(
                    ["Alternative", "Raw Score", "Weighted Contribution", "Reason"],
                    [
                        [
                            result["label"],
                            next(
                                row["raw_score"]
                                for row in result["criterion_breakdown"]
                                if row["criterion_id"] == criterion["criterion_id"]
                            ),
                            next(
                                row["weighted_score"]
                                for row in result["criterion_breakdown"]
                                if row["criterion_id"] == criterion["criterion_id"]
                            ),
                            next(
                                row["note"]
                                for row in result["criterion_breakdown"]
                                if row["criterion_id"] == criterion["criterion_id"]
                            ),
                        ]
                        for result in results
                    ],
                ),
            ]
        )

    lines.extend(
        [
            "",
            "## Why The Runner-Up Options Lost",
            "",
            f"- `{results[1]['label']}` lost because it improves short-term simplicity by collapsing the controlled gateway into the main application boundary, which makes credential use, callback quarantine, and settlement semantics easier to blur together than the corpus allows.",
            f"- `{results[2]['label']}` lost because adapter convenience does not compensate for weaker first-party proof of request lineage, ingress authentication, resend legality, and settlement ownership.",
        ]
    )
    return "\n".join(lines) + "\n"


def build_mermaid() -> str:
    return "\n".join(
        [
            "flowchart LR",
            '  Browser["Browser and Portal Surfaces"] --> API["Northbound API / Session Gateway"]',
            '  Native["Native Operator Workspace"] --> API',
            '  Machine["Machine Automation Clients"] --> API',
            '  API --> Control["Manifest and Workflow Control Plane"]',
            '  Control --> Store["Primary Control Store"]',
            '  Control --> Audit["Append-only Audit Store"]',
            '  Control --> Broker["Queue and Broker"]',
            '  Broker --> Workers["Stage or Recovery Workers"]',
            '  Workers --> Control',
            '  Control --> Gateway["Controlled Authority Gateway"]',
            '  Gateway --> Vault["Token Vault + KMS/HSM"]',
            '  Gateway --> Provider["Authority Provider"]',
            '  Provider --> Gateway',
            '  Gateway --> Ingress["AuthorityIngressReceipt (checkpoint only)"]',
            '  Ingress --> Control',
            '  Control --> Runtime["AuthorityInteractionRecord (runtime ledger)"]',
            '  Control --> Submission["SubmissionRecord (settlement ledger)"]',
            '  Submission --> Projector["Read-side Projector / Stream Broker"]',
            '  Runtime --> Projector',
            '  Projector --> Browser',
            '  Projector --> Native',
            '  Projector --> Timeline["ClientTimelineEvent / ObligationMirror"]',
        ]
    ) + "\n"


def main() -> None:
    operation_catalog = load_json(AUTHORITY_OPERATION_CATALOG_PATH)
    request_rules = load_json(REQUEST_IDENTITY_RULES_PATH)
    truth_map = load_json(AUTHORITY_TRUTH_MAP_PATH)
    gaps = load_json(UNRESOLVED_PROTOCOL_GAPS_PATH)

    supporting_context = build_supporting_context()
    criteria = build_criteria()
    responsibility_matrix = build_responsibility_matrix()
    operation_boundary_map = build_operation_boundary_map(operation_catalog)
    flows = build_send_receive_reconciliation_flow()
    credential_boundary = build_credential_boundary(supporting_context, request_rules)
    callback_matrix = build_callback_quarantine_matrix()
    truth_surface_mapping = build_truth_surface_mapping(truth_map)

    coverage_summary = {
        "responsibility_record_count": responsibility_matrix["responsibility_record_count"],
        "operation_family_count": operation_boundary_map["operation_family_count"],
        "flow_count": flows["flow_count"],
        "callback_case_count": callback_matrix["case_count"],
        "truth_surface_count": truth_surface_mapping["surface_count"],
        "credential_material_count": credential_boundary["material_count"],
    }

    alternatives = build_alternatives()
    results, scorecard = build_scorecard_payload(
        criteria, alternatives, supporting_context, coverage_summary
    )

    adr_markdown = build_adr_markdown(
        criteria,
        results,
        responsibility_matrix,
        operation_boundary_map,
        flows,
        credential_boundary,
        callback_matrix,
        truth_surface_mapping,
        gaps,
        supporting_context,
    )
    comparison_markdown = build_comparison_markdown(
        criteria, results, coverage_summary
    )
    mermaid = build_mermaid()

    json_write(RESPONSIBILITY_MATRIX_PATH, responsibility_matrix)
    json_write(OPERATION_BOUNDARY_MAP_PATH, operation_boundary_map)
    json_write(SEND_RECEIVE_FLOW_PATH, flows)
    json_write(CREDENTIAL_BOUNDARY_PATH, credential_boundary)
    json_write(CALLBACK_QUARANTINE_PATH, callback_matrix)
    json_write(TRUTH_SURFACE_MAPPING_PATH, truth_surface_mapping)
    json_write(SCORECARD_PATH, scorecard)
    text_write(ADR_PATH, adr_markdown)
    text_write(COMPARISON_PATH, comparison_markdown)
    text_write(MERMAID_PATH, mermaid)


if __name__ == "__main__":
    main()
