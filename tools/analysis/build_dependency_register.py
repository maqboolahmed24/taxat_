#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[2]
ALGORITHM_DIR = ROOT / "Algorithm"
DATA_ANALYSIS_DIR = ROOT / "data" / "analysis"
DOCS_ANALYSIS_DIR = ROOT / "docs" / "analysis"
DIAGRAMS_ANALYSIS_DIR = ROOT / "diagrams" / "analysis"
PROMPT_DIR = ROOT / "PROMPT"

AUTHORITY_PROTOCOL_PATH = ALGORITHM_DIR / "authority_interaction_protocol.md"
ACTOR_MODEL_PATH = ALGORITHM_DIR / "actor_and_authority_model.md"
NORTHBOUND_API_PATH = ALGORITHM_DIR / "northbound_api_and_session_contract.md"
DEPLOYMENT_PATH = ALGORITHM_DIR / "deployment_and_resilience_contract.md"
SECURITY_PATH = ALGORITHM_DIR / "security_and_runtime_hardening_contract.md"
PORTAL_PATH = ALGORITHM_DIR / "customer_client_portal_experience_contract.md"
COLLABORATION_PATH = ALGORITHM_DIR / "collaboration_workspace_contract.md"
MACOS_BLUEPRINT_PATH = ALGORITHM_DIR / "macos_native_operator_workspace_blueprint.md"
OBSERVABILITY_PATH = ALGORITHM_DIR / "observability_and_audit_contract.md"
INVENTION_BOUNDARY_PATH = ALGORITHM_DIR / "invention_and_system_boundary.md"
FRONTEND_LAW_PATH = ALGORITHM_DIR / "frontend_shell_and_interaction_law.md"
CHECKLIST_PATH = PROMPT_DIR / "Checklist.md"

REGISTER_DOC_PATH = DOCS_ANALYSIS_DIR / "18_external_services_apis_and_control_plane_dependencies.md"
PROVISIONING_DOC_PATH = DOCS_ANALYSIS_DIR / "18_provisioning_feasibility_and_browser_automation_strategy.md"

REGISTER_JSON_PATH = DATA_ANALYSIS_DIR / "dependency_register.json"
SOURCE_MATRIX_CSV_PATH = DATA_ANALYSIS_DIR / "dependency_capability_to_source_matrix.csv"
CLASSIFICATION_JSON_PATH = DATA_ANALYSIS_DIR / "dependency_classification_and_ownership.json"
CREDENTIALS_JSON_PATH = DATA_ANALYSIS_DIR / "credential_secret_inventory.json"
DAG_JSON_PATH = DATA_ANALYSIS_DIR / "provisioning_order_and_prerequisite_dag.json"
BROWSER_MATRIX_JSON_PATH = DATA_ANALYSIS_DIR / "browser_automation_feasibility_matrix.json"

MERMAID_PATH = DIAGRAMS_ANALYSIS_DIR / "18_external_dependency_topology.mmd"

HEADING_RE = re.compile(r"^(#{2,4})\s+(.*)$")
CHECKLIST_ITEM_RE = re.compile(r"^\s*-\s+\[[ X-]\]\s+`(?P<task>pc_\d{4})`\s+(?P<slug>[^(]+)")

CLASSIFICATIONS = [
    "ALGORITHM_EXPLICIT",
    "ROADMAP_IMPLIED",
    "OPTIONAL_VENDOR_SELECTED",
    "INTERNAL_ONLY",
]
AUTOMATION_FEASIBILITY_VALUES = [
    "FULLY_AUTOMATABLE",
    "PARTIALLY_AUTOMATABLE_WITH_STABLE_CALLBACKS",
    "PARTIALLY_AUTOMATABLE_WITH_MANUAL_CHECKPOINTS",
    "MANUAL_OR_PROCUREMENT_GATED",
    "INTERNAL_DELIVERY_ONLY",
]
MVP_REQUIREMENT_VALUES = [
    "MVP_REQUIRED",
    "MVP_CONDITIONAL",
    "PROVISIONING_REQUIRED",
    "INTERNAL_SURFACE",
]
DECISION_STATUS_VALUES = [
    "NO_VENDOR_DECISION_NEEDED",
    "PROCUREMENT_OR_PLATFORM_CHOICE",
    "OPTIONAL_VENDOR_SELECTION",
    "INTERNAL_IMPLEMENTATION",
]
ENVIRONMENT_ORDER = [
    "local-dev",
    "ci",
    "ephemeral-review",
    "sandbox",
    "staging",
    "production",
]
BROWSER_AUTOMATION_STATUS_VALUES = [
    "SUPPORTED",
    "SUPPORTED_WITH_MANUAL_CHECKPOINTS",
    "LIMITED",
    "NOT_RECOMMENDED",
    "NOT_APPLICABLE",
]

REQUIRED_ROW_FIELDS = [
    "dependency_key",
    "capability_category",
    "classification",
    "purpose",
    "required_features",
    "data_or_credential_sensitivity",
    "human_or_machine_actor",
    "owning_subsystem",
    "environment_scope",
    "provisioning_prerequisites",
    "automation_feasibility",
    "candidate_service_types",
    "source_file",
    "source_heading_or_logical_block",
    "notes",
]
LIST_FIELDS = [
    "required_features",
    "environment_scope",
    "provisioning_prerequisites",
    "candidate_service_types",
    "notes",
]

FULL_RUNTIME_SCOPE = ENVIRONMENT_ORDER[:]
PROVISIONING_SCOPE = ["local-dev", "ci", "ephemeral-review", "sandbox", "staging", "production"]
AUTHORITY_SCOPE = ["sandbox", "staging", "production"]
STABLE_CALLBACK_SCOPE = ["sandbox", "staging", "production"]
AUTOMATION_SCOPE = ["local-dev", "ci", "ephemeral-review", "staging"]


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


def find_heading_line(path: Path, heading_text: str) -> int:
    for line_number, line in enumerate(path.read_text().splitlines(), 1):
        match = HEADING_RE.match(line)
        if match and match.group(2).strip() == heading_text:
            return line_number
    raise ValueError(f"Heading `{heading_text}` not found in {path}")


def find_line_containing(path: Path, needle: str) -> tuple[int, str]:
    for line_number, line in enumerate(path.read_text().splitlines(), 1):
        if needle in line:
            return line_number, line
    raise ValueError(f"Text `{needle}` not found in {path}")


def line_ref(path: Path, line_number: int, label: str) -> str:
    safe_label = re.sub(r"[^A-Za-z0-9_.-]+", "_", label).strip("_") or "line"
    return f"{repo_rel(path)}::L{line_number}[{safe_label}]"


def heading_ref(path: Path, heading_text: str, label: str | None = None) -> str:
    return line_ref(path, find_heading_line(path, heading_text), label or heading_text)


def text_ref(path: Path, needle: str, label: str | None = None) -> str:
    line_number, _ = find_line_containing(path, needle)
    return line_ref(path, line_number, label or needle)


def source_record(
    *,
    source_path: Path,
    source_heading_or_logical_block: str,
    source_ref: str,
    rationale: str,
) -> dict[str, str]:
    return {
        "source_file": repo_rel(source_path),
        "source_heading_or_logical_block": source_heading_or_logical_block,
        "source_ref": source_ref,
        "rationale": rationale,
    }


def heading_source(path: Path, heading_text: str, rationale: str) -> dict[str, str]:
    return source_record(
        source_path=path,
        source_heading_or_logical_block=heading_text,
        source_ref=heading_ref(path, heading_text),
        rationale=rationale,
    )


def text_source(path: Path, needle: str, logical_block: str, rationale: str) -> dict[str, str]:
    return source_record(
        source_path=path,
        source_heading_or_logical_block=logical_block,
        source_ref=text_ref(path, needle, logical_block),
        rationale=rationale,
    )


def task_source(task_id: str, rationale: str) -> dict[str, str]:
    line_number, line = find_line_containing(CHECKLIST_PATH, f"`{task_id}`")
    match = CHECKLIST_ITEM_RE.match(line)
    if not match:
        raise ValueError(f"Could not parse checklist item for {task_id}")
    logical_block = f"{match.group('task')} {match.group('slug').strip()}"
    return source_record(
        source_path=CHECKLIST_PATH,
        source_heading_or_logical_block=logical_block,
        source_ref=line_ref(CHECKLIST_PATH, line_number, task_id),
        rationale=rationale,
    )


def dependency_row(
    *,
    dependency_key: str,
    capability_category: str,
    classification: str,
    classification_rationale: str,
    purpose: str,
    required_features: Iterable[str],
    data_or_credential_sensitivity: str,
    human_or_machine_actor: str,
    owning_subsystem: str,
    environment_scope: Iterable[str],
    provisioning_prerequisites: Iterable[str],
    automation_feasibility: str,
    candidate_service_types: Iterable[str],
    source_refs: list[dict[str, str]],
    notes: Iterable[str] = (),
    mvp_requirement: str,
    decision_status: str,
    adr_or_procurement_needed: bool,
    needs_credentials_or_secrets: bool,
) -> dict[str, Any]:
    if not source_refs:
        raise ValueError(f"{dependency_key} requires at least one source reference")
    primary_source = source_refs[0]
    return {
        "dependency_key": dependency_key,
        "capability_category": capability_category,
        "classification": classification,
        "classification_rationale": classification_rationale,
        "purpose": purpose,
        "required_features": ordered_unique(required_features),
        "data_or_credential_sensitivity": data_or_credential_sensitivity,
        "human_or_machine_actor": human_or_machine_actor,
        "owning_subsystem": owning_subsystem,
        "environment_scope": [scope for scope in ENVIRONMENT_ORDER if scope in set(environment_scope)],
        "provisioning_prerequisites": ordered_unique(provisioning_prerequisites),
        "automation_feasibility": automation_feasibility,
        "candidate_service_types": ordered_unique(candidate_service_types),
        "source_file": primary_source["source_file"],
        "source_heading_or_logical_block": primary_source["source_heading_or_logical_block"],
        "source_ref": primary_source["source_ref"],
        "source_refs": source_refs,
        "notes": list(notes),
        "mvp_requirement": mvp_requirement,
        "decision_status": decision_status,
        "adr_or_procurement_needed": adr_or_procurement_needed,
        "needs_credentials_or_secrets": needs_credentials_or_secrets,
    }


def credential_record(
    *,
    credential_key: str,
    dependency_key: str,
    credential_kind: str,
    owner_actor: str,
    owning_subsystem: str,
    environment_scope: Iterable[str],
    storage_boundary: str,
    rotation_or_renewal_rule: str,
    usage_constraints: Iterable[str],
    source_refs: list[dict[str, str]],
    notes: Iterable[str] = (),
) -> dict[str, Any]:
    return {
        "credential_key": credential_key,
        "dependency_key": dependency_key,
        "credential_kind": credential_kind,
        "owner_actor": owner_actor,
        "owning_subsystem": owning_subsystem,
        "environment_scope": [scope for scope in ENVIRONMENT_ORDER if scope in set(environment_scope)],
        "storage_boundary": storage_boundary,
        "rotation_or_renewal_rule": rotation_or_renewal_rule,
        "usage_constraints": list(usage_constraints),
        "source_refs": source_refs,
        "notes": list(notes),
    }


def md_escape(value: Any) -> str:
    if isinstance(value, list):
        value = ", ".join(str(item) for item in value)
    return str(value).replace("|", "\\|").replace("\n", " ").strip()


def markdown_table(headers: list[str], rows: list[list[Any]]) -> str:
    header_line = "| " + " | ".join(headers) + " |"
    divider_line = "| " + " | ".join("---" for _ in headers) + " |"
    body_lines = [
        "| " + " | ".join(md_escape(cell) for cell in row) + " |"
        for row in rows
    ]
    return "\n".join([header_line, divider_line, *body_lines])


def topo_layers(nodes: list[str], edges: list[dict[str, str]]) -> list[list[str]]:
    indegree = {node: 0 for node in nodes}
    outgoing: dict[str, list[str]] = defaultdict(list)
    for edge in edges:
        outgoing[edge["from"]].append(edge["to"])
        indegree[edge["to"]] += 1

    layers: list[list[str]] = []
    ready = sorted(node for node, degree in indegree.items() if degree == 0)
    seen_count = 0
    while ready:
        layers.append(ready)
        seen_count += len(ready)
        next_ready: list[str] = []
        for node in ready:
            for target in sorted(outgoing[node]):
                indegree[target] -= 1
                if indegree[target] == 0:
                    next_ready.append(target)
        ready = sorted(next_ready)

    if seen_count != len(nodes):
        raise ValueError("Provisioning DAG contains a cycle")
    return layers


def validate_rows(rows: list[dict[str, Any]]) -> None:
    dependency_keys = {row["dependency_key"] for row in rows}
    if len(dependency_keys) != len(rows):
        raise ValueError("Duplicate dependency keys detected")

    for row in rows:
        missing = [field for field in REQUIRED_ROW_FIELDS if field not in row]
        if missing:
            raise ValueError(f"{row.get('dependency_key')} missing required fields: {missing}")
        for field in LIST_FIELDS:
            if not isinstance(row[field], list):
                raise ValueError(f"{row['dependency_key']} field `{field}` must be a list")
        if row["classification"] not in CLASSIFICATIONS:
            raise ValueError(f"{row['dependency_key']} has invalid classification {row['classification']}")
        if row["automation_feasibility"] not in AUTOMATION_FEASIBILITY_VALUES:
            raise ValueError(f"{row['dependency_key']} has invalid automation feasibility")
        if row["mvp_requirement"] not in MVP_REQUIREMENT_VALUES:
            raise ValueError(f"{row['dependency_key']} has invalid MVP requirement")
        if row["decision_status"] not in DECISION_STATUS_VALUES:
            raise ValueError(f"{row['dependency_key']} has invalid decision status")
        if not row["source_refs"]:
            raise ValueError(f"{row['dependency_key']} must include source refs")
        for ref in row["source_refs"]:
            for field in ["source_file", "source_heading_or_logical_block", "source_ref", "rationale"]:
                if not ref.get(field):
                    raise ValueError(f"{row['dependency_key']} has malformed source ref: {ref}")
        for prerequisite in row["provisioning_prerequisites"]:
            if prerequisite not in dependency_keys:
                raise ValueError(f"{row['dependency_key']} references missing prerequisite {prerequisite}")
        if row["dependency_key"].startswith("INTERNAL_") and row["classification"] != "INTERNAL_ONLY":
            raise ValueError(f"{row['dependency_key']} must be INTERNAL_ONLY")
        if row["classification"] == "INTERNAL_ONLY" and row["decision_status"] != "INTERNAL_IMPLEMENTATION":
            raise ValueError(f"{row['dependency_key']} must use INTERNAL_IMPLEMENTATION decision status")


def validate_credentials(rows: list[dict[str, Any]], credentials: list[dict[str, Any]]) -> None:
    row_map = {row["dependency_key"]: row for row in rows}
    credential_dependency_keys = {entry["dependency_key"] for entry in credentials}

    for entry in credentials:
        if entry["dependency_key"] not in row_map:
            raise ValueError(f"Credential record references unknown dependency {entry['dependency_key']}")
        if not row_map[entry["dependency_key"]]["needs_credentials_or_secrets"]:
            raise ValueError(
                f"Credential record {entry['credential_key']} attached to dependency that does not require secrets"
            )
        if not entry["source_refs"]:
            raise ValueError(f"Credential record {entry['credential_key']} must include source refs")

    for row in rows:
        if row["needs_credentials_or_secrets"] and row["dependency_key"] not in credential_dependency_keys:
            raise ValueError(f"{row['dependency_key']} needs credentials but is absent from credential inventory")


def build_rows() -> list[dict[str, Any]]:
    return [
        dependency_row(
            dependency_key="ENVIRONMENT_TENANT_AND_AUTHORITY_PROFILE_MATRIX",
            capability_category="CONTROL_PLANE_PREREQUISITE",
            classification="ROADMAP_IMPLIED",
            classification_rationale="The roadmap explicitly schedules environment, tenant, and authority-profile enumeration before third-party provisioning begins.",
            purpose="Freeze the canonical environment, tenant, authority-profile, callback-host, and partition matrix that all later registrations consume.",
            required_features=[
                "stable environment names and promotion lanes",
                "sandbox versus production authority profile separation",
                "tenant partition identifiers",
                "callback hostname strategy",
                "per-surface client inventory planning",
            ],
            data_or_credential_sensitivity="Low sensitivity configuration, but foundational for later secret scopes and authority separation.",
            human_or_machine_actor="HUMAN_AND_MACHINE",
            owning_subsystem="ControlPlaneProvisioning",
            environment_scope=FULL_RUNTIME_SCOPE,
            provisioning_prerequisites=[],
            automation_feasibility="FULLY_AUTOMATABLE",
            candidate_service_types=[
                "environment registry",
                "tenant provisioning manifest",
                "authority profile catalog",
            ],
            source_refs=[
                task_source("pc_0031", "The provisioning wave starts by enumerating environments, tenants, and authority profiles."),
                heading_source(
                    AUTHORITY_PROTOCOL_PATH,
                    "9.3 Core protocol objects",
                    "Authority objects freeze provider environment, scope, and binding identity, so those profiles must exist before registration.",
                ),
                heading_source(
                    ACTOR_MODEL_PATH,
                    "3.5 Actor-to-authority relationships",
                    "Authority links and delegation edges need a canonical environment and authority partition basis.",
                ),
            ],
            notes=[
                "This is a control-plane dependency, not an external SaaS by itself.",
                "Later authority, IdP, email, and edge rows depend on this matrix for stable separation.",
            ],
            mvp_requirement="PROVISIONING_REQUIRED",
            decision_status="NO_VENDOR_DECISION_NEEDED",
            adr_or_procurement_needed=False,
            needs_credentials_or_secrets=False,
        ),
        dependency_row(
            dependency_key="BROWSER_AUTOMATION_WORKSPACE_AND_EVIDENCE_HARNESS",
            capability_category="AUTOMATION_WORKSPACE",
            classification="ROADMAP_IMPLIED",
            classification_rationale="The roadmap directly calls for a browser automation workspace and explicit anti-bot/manual checkpoint evidence capture.",
            purpose="Provide a headed browser automation harness for third-party provisioning, evidence capture, and repeatable console operations.",
            required_features=[
                "persistent browser profiles for controlled admin sessions",
                "screenshot and HAR evidence capture",
                "secure secret injection from vault-managed inputs",
                "headed execution for MFA and CAPTCHA checkpoints",
                "stable callback host testing across local, CI, review, and staging",
            ],
            data_or_credential_sensitivity="Privileged provisioning sessions, screenshots, and provider-console metadata.",
            human_or_machine_actor="HUMAN_AND_MACHINE",
            owning_subsystem="PlatformAutomation",
            environment_scope=AUTOMATION_SCOPE,
            provisioning_prerequisites=["ENVIRONMENT_TENANT_AND_AUTHORITY_PROFILE_MATRIX"],
            automation_feasibility="PARTIALLY_AUTOMATABLE_WITH_MANUAL_CHECKPOINTS",
            candidate_service_types=[
                "Playwright workspace",
                "headed browser runner",
                "automation artifact store",
            ],
            source_refs=[
                task_source("pc_0032", "Provisioning work requires a reusable browser automation workspace."),
                task_source("pc_0048", "The roadmap expects checkpoint evidence capture when portals block full automation."),
            ],
            notes=[
                "This row is required even though it is not a production runtime service.",
                "Manual checkpoint capture is a first-class part of the provisioning contract, not an exception path.",
            ],
            mvp_requirement="PROVISIONING_REQUIRED",
            decision_status="NO_VENDOR_DECISION_NEEDED",
            adr_or_procurement_needed=False,
            needs_credentials_or_secrets=False,
        ),
        dependency_row(
            dependency_key="AUTHORITY_DEVELOPER_HUB_WORKSPACE",
            capability_category="AUTHORITY_CONTROL_PLANE",
            classification="ROADMAP_IMPLIED",
            classification_rationale="The roadmap explicitly schedules creation of an HMRC developer-hub account and project workspace before app registration.",
            purpose="Establish the authority provider account and project workspace used to manage application registrations and provider-side settings.",
            required_features=[
                "provider developer account or project workspace",
                "app-management console access",
                "sandbox enrollment",
                "provider environment visibility",
                "evidence capture for setup outcomes",
            ],
            data_or_credential_sensitivity="Privileged provider-console access and regulated app-management metadata.",
            human_or_machine_actor="HUMAN_AND_MACHINE",
            owning_subsystem="AuthorityGateway",
            environment_scope=AUTHORITY_SCOPE,
            provisioning_prerequisites=[
                "ENVIRONMENT_TENANT_AND_AUTHORITY_PROFILE_MATRIX",
                "BROWSER_AUTOMATION_WORKSPACE_AND_EVIDENCE_HARNESS",
            ],
            automation_feasibility="PARTIALLY_AUTOMATABLE_WITH_MANUAL_CHECKPOINTS",
            candidate_service_types=[
                "developer portal account",
                "authority app-management console",
            ],
            source_refs=[
                task_source("pc_0034", "The roadmap requires a developer-hub workspace before sandbox app registration can begin."),
                heading_source(
                    AUTHORITY_PROTOCOL_PATH,
                    "9.2 Protocol scope",
                    "Authority integration is an external provider boundary rather than an internal-only API.",
                ),
            ],
            notes=[
                "Human-operated provider identities are expected; the system should not persist personal console credentials as product secrets.",
            ],
            mvp_requirement="PROVISIONING_REQUIRED",
            decision_status="NO_VENDOR_DECISION_NEEDED",
            adr_or_procurement_needed=False,
            needs_credentials_or_secrets=False,
        ),
        dependency_row(
            dependency_key="AUTHORITY_SANDBOX_APP_REGISTRATION",
            capability_category="AUTHORITY_CONTROL_PLANE",
            classification="ROADMAP_IMPLIED",
            classification_rationale="The roadmap explicitly calls for a distinct sandbox app registration for obligations, calculations, and submissions.",
            purpose="Register the sandbox authority client used for non-production obligations, calculation, and submission flows.",
            required_features=[
                "sandbox client identifier and secret issuance",
                "per-scope application registration",
                "non-production redirect URI set",
                "environment-specific rate-limit and profile metadata",
                "export-ready credential metadata for vault ingestion",
            ],
            data_or_credential_sensitivity="Authority client identifiers, client secrets, and sandbox scope bindings.",
            human_or_machine_actor="HUMAN_AND_MACHINE",
            owning_subsystem="AuthorityGateway",
            environment_scope=["sandbox", "staging"],
            provisioning_prerequisites=[
                "AUTHORITY_DEVELOPER_HUB_WORKSPACE",
                "ENVIRONMENT_TENANT_AND_AUTHORITY_PROFILE_MATRIX",
                "SECRETS_MANAGER_OR_TOKEN_VAULT",
            ],
            automation_feasibility="PARTIALLY_AUTOMATABLE_WITH_MANUAL_CHECKPOINTS",
            candidate_service_types=[
                "authority sandbox app registration",
                "provider-managed OAuth client",
            ],
            source_refs=[
                task_source("pc_0035", "The roadmap creates a dedicated sandbox application for obligations, calculations, and submissions."),
                heading_source(
                    AUTHORITY_PROTOCOL_PATH,
                    "9.6 Token and client binding rule",
                    "Authority traffic is bound to a specific client and token profile, so sandbox registration is a separate dependency.",
                ),
                heading_source(
                    ACTOR_MODEL_PATH,
                    "3.10 Delegation rules",
                    "Imported authorization and authority-link rules assume stable client identities per provider environment.",
                ),
            ],
            notes=[
                "Sandbox app credentials must remain separate from production credentials and rotation timelines.",
            ],
            mvp_requirement="PROVISIONING_REQUIRED",
            decision_status="NO_VENDOR_DECISION_NEEDED",
            adr_or_procurement_needed=False,
            needs_credentials_or_secrets=True,
        ),
        dependency_row(
            dependency_key="AUTHORITY_PRODUCTION_APP_REGISTRATION",
            capability_category="AUTHORITY_CONTROL_PLANE",
            classification="ROADMAP_IMPLIED",
            classification_rationale="The corpus freezes provider_environment in authority bindings, so production registration cannot be collapsed into the sandbox record even though the checklist names the sandbox task first.",
            purpose="Register the production authority client and approval boundary used for live obligations, filings, and reconciliations.",
            required_features=[
                "production client identifier and secret issuance",
                "live redirect URI and callback host approval",
                "scope approval and go-live review evidence",
                "production rate-limit and support contact metadata",
                "vault-export-ready credential metadata",
            ],
            data_or_credential_sensitivity="Live authority client secrets and production integration approval metadata.",
            human_or_machine_actor="HUMAN_AND_MACHINE",
            owning_subsystem="AuthorityGateway",
            environment_scope=["production"],
            provisioning_prerequisites=[
                "AUTHORITY_DEVELOPER_HUB_WORKSPACE",
                "ENVIRONMENT_TENANT_AND_AUTHORITY_PROFILE_MATRIX",
                "SECRETS_MANAGER_OR_TOKEN_VAULT",
                "DNS_TLS_WAF_AND_EDGE_DELIVERY",
            ],
            automation_feasibility="MANUAL_OR_PROCUREMENT_GATED",
            candidate_service_types=[
                "authority production app registration",
                "provider go-live approval workflow",
            ],
            source_refs=[
                task_source("pc_0031", "Environment and authority-profile planning implies a live provider environment alongside sandbox."),
                task_source("pc_0038", "Vault export and rotation boundaries imply separate live credentials as well as sandbox credentials."),
                heading_source(
                    AUTHORITY_PROTOCOL_PATH,
                    "9.3 Core protocol objects",
                    "Authority bindings freeze provider environment and API version, requiring a distinct production registration.",
                ),
            ],
            notes=[
                "This is explicit in the dependency model even though the early provisioning checklist does not yet split out a dedicated production registration card.",
            ],
            mvp_requirement="PROVISIONING_REQUIRED",
            decision_status="NO_VENDOR_DECISION_NEEDED",
            adr_or_procurement_needed=False,
            needs_credentials_or_secrets=True,
        ),
        dependency_row(
            dependency_key="AUTHORITY_REDIRECT_URI_CALLBACK_AND_SCOPE_CONFIGURATION",
            capability_category="AUTHORITY_CONTROL_PLANE",
            classification="ROADMAP_IMPLIED",
            classification_rationale="The roadmap separately schedules redirect URI, scope, and callback endpoint configuration after app registration.",
            purpose="Bind authority apps to the exact redirect URIs, callback endpoints, and granted scopes required by the controlled authority gateway.",
            required_features=[
                "exact redirect URI registration",
                "stable callback endpoint configuration",
                "per-environment scope mapping",
                "provider-visible callback health verification",
                "non-production and production host separation",
            ],
            data_or_credential_sensitivity="Callback endpoint metadata, approved scopes, and provider-console settings.",
            human_or_machine_actor="HUMAN_AND_MACHINE",
            owning_subsystem="AuthorityGateway",
            environment_scope=STABLE_CALLBACK_SCOPE,
            provisioning_prerequisites=[
                "AUTHORITY_SANDBOX_APP_REGISTRATION",
                "AUTHORITY_PRODUCTION_APP_REGISTRATION",
                "DNS_TLS_WAF_AND_EDGE_DELIVERY",
            ],
            automation_feasibility="PARTIALLY_AUTOMATABLE_WITH_STABLE_CALLBACKS",
            candidate_service_types=[
                "authority callback registration",
                "provider scope configuration",
            ],
            source_refs=[
                task_source("pc_0036", "Redirect URIs, scopes, and callback endpoints are an explicit provisioning step."),
                heading_source(
                    AUTHORITY_PROTOCOL_PATH,
                    "9.5 Preflight sequence",
                    "Preflight checks require exact endpoint and scope readiness before live authority operations proceed.",
                ),
                heading_source(
                    AUTHORITY_PROTOCOL_PATH,
                    "9.9A Inbound authority ingress protocol",
                    "Inbound callbacks are part of the normalized authority ingress boundary and must be registered precisely.",
                ),
            ],
            notes=[
                "Ephemeral review environments are a poor fit for provider callback registration because hostnames are unstable.",
            ],
            mvp_requirement="PROVISIONING_REQUIRED",
            decision_status="NO_VENDOR_DECISION_NEEDED",
            adr_or_procurement_needed=False,
            needs_credentials_or_secrets=False,
        ),
        dependency_row(
            dependency_key="AUTHORITY_FRAUD_PREVENTION_PROFILE_BINDINGS",
            capability_category="AUTHORITY_CONTROL_PLANE",
            classification="ROADMAP_IMPLIED",
            classification_rationale="The roadmap explicitly schedules validation of fraud-prevention header setup and sandbox profile bindings as a separate dependency boundary.",
            purpose="Bind provider-required fraud-prevention and environment-profile metadata to each authority client and execution environment.",
            required_features=[
                "fraud-prevention header input model",
                "sandbox profile binding validation",
                "per-environment device and operator posture separation",
                "evidence capture for provider-side validation",
                "header-generation readiness for runtime sends",
            ],
            data_or_credential_sensitivity="Regulated device and operator posture metadata plus provider binding evidence.",
            human_or_machine_actor="HUMAN_AND_MACHINE",
            owning_subsystem="AuthorityGateway",
            environment_scope=AUTHORITY_SCOPE,
            provisioning_prerequisites=[
                "AUTHORITY_REDIRECT_URI_CALLBACK_AND_SCOPE_CONFIGURATION",
                "ENVIRONMENT_TENANT_AND_AUTHORITY_PROFILE_MATRIX",
            ],
            automation_feasibility="PARTIALLY_AUTOMATABLE_WITH_MANUAL_CHECKPOINTS",
            candidate_service_types=[
                "authority fraud-prevention binding",
                "provider environment profile validation",
            ],
            source_refs=[
                task_source("pc_0037", "The roadmap calls for explicit fraud-prevention and sandbox-profile validation."),
                heading_source(
                    AUTHORITY_PROTOCOL_PATH,
                    "9.7 Fraud-prevention header rule",
                    "Fraud-prevention posture is mandatory runtime law and therefore a distinct setup dependency.",
                ),
            ],
            notes=[
                "Fraud-prevention profile readiness is not equivalent to client registration; it must remain separately testable.",
            ],
            mvp_requirement="PROVISIONING_REQUIRED",
            decision_status="NO_VENDOR_DECISION_NEEDED",
            adr_or_procurement_needed=False,
            needs_credentials_or_secrets=False,
        ),
        dependency_row(
            dependency_key="AUTHORITY_API_PROVIDER_INTERFACE",
            capability_category="EXTERNAL_AUTHORITY_API",
            classification="ALGORITHM_EXPLICIT",
            classification_rationale="Authority transport, callbacks, idempotency, reconciliation, and out-of-band handling are explicit algorithmic boundaries.",
            purpose="Support live authority calculation, submission, duplicate handling, reconciliation, and callback ingress against the external authority of record.",
            required_features=[
                "outbound request signing or authorization",
                "token-to-client binding",
                "fraud-prevention header transport",
                "request hashing and idempotency",
                "callback ingress normalization",
                "duplicate and pending-state reconciliation",
                "sandbox and production environment separation",
            ],
            data_or_credential_sensitivity="Authority tokens, client secrets, taxpayer identifiers, and provider-side response evidence.",
            human_or_machine_actor="MACHINE",
            owning_subsystem="AuthorityGateway",
            environment_scope=AUTHORITY_SCOPE,
            provisioning_prerequisites=[
                "AUTHORITY_REDIRECT_URI_CALLBACK_AND_SCOPE_CONFIGURATION",
                "AUTHORITY_FRAUD_PREVENTION_PROFILE_BINDINGS",
                "SECRETS_MANAGER_OR_TOKEN_VAULT",
            ],
            automation_feasibility="PARTIALLY_AUTOMATABLE_WITH_STABLE_CALLBACKS",
            candidate_service_types=[
                "government tax API",
                "authority OAuth API",
                "authority callback ingress boundary",
            ],
            source_refs=[
                heading_source(
                    AUTHORITY_PROTOCOL_PATH,
                    "9.2 Protocol scope",
                    "The contract defines the authority boundary as a controlled external interaction surface.",
                ),
                heading_source(
                    AUTHORITY_PROTOCOL_PATH,
                    "9.8 Request hashing and idempotency",
                    "Runtime interaction requires exact idempotency and hash handling against the provider API.",
                ),
                heading_source(
                    AUTHORITY_PROTOCOL_PATH,
                    "9.13 Reconciliation protocol",
                    "Authority truth and internal truth must reconcile through a real provider interface, not an internal-only API.",
                ),
            ],
            notes=[
                "The register treats the runtime authority edge as mandatory even though specific vendors or jurisdictions may vary.",
            ],
            mvp_requirement="MVP_REQUIRED",
            decision_status="NO_VENDOR_DECISION_NEEDED",
            adr_or_procurement_needed=False,
            needs_credentials_or_secrets=True,
        ),
        dependency_row(
            dependency_key="EXTERNAL_IDENTITY_PROVIDER_FEDERATION",
            capability_category="IDENTITY_AND_ACCESS",
            classification="ALGORITHM_EXPLICIT",
            classification_rationale="Federated product identity through OIDC/OAuth 2.0 or equivalent is an explicit runtime-security requirement.",
            purpose="Provide external identity federation, short-lived sessions, and step-up-capable authentication for browser and native surfaces.",
            required_features=[
                "OIDC or equivalent short-lived identity flows",
                "federated sign-in for browser and native clients",
                "step-up and MFA compatibility",
                "system-browser or platform-auth-session handoff",
                "service-principal support where needed",
            ],
            data_or_credential_sensitivity="Operator and customer authentication events, client secrets, and session trust state.",
            human_or_machine_actor="HUMAN_AND_MACHINE",
            owning_subsystem="IdentityAndAccess",
            environment_scope=FULL_RUNTIME_SCOPE,
            provisioning_prerequisites=[
                "ENVIRONMENT_TENANT_AND_AUTHORITY_PROFILE_MATRIX",
                "SECRETS_MANAGER_OR_TOKEN_VAULT",
                "DNS_TLS_WAF_AND_EDGE_DELIVERY",
            ],
            automation_feasibility="FULLY_AUTOMATABLE",
            candidate_service_types=[
                "OIDC provider",
                "enterprise identity tenant",
                "federation service",
            ],
            source_refs=[
                heading_source(
                    SECURITY_PATH,
                    "2. Identity, session, and command trust",
                    "The security contract explicitly requires federated product identity through OIDC/OAuth 2.0 or equivalent.",
                ),
                heading_source(
                    ACTOR_MODEL_PATH,
                    "3.13 Machine-actor rules",
                    "Machine actors and federated authorization rules require an external identity boundary.",
                ),
            ],
            notes=[
                "The final session model is internal, but the federation surface itself remains an external dependency.",
            ],
            mvp_requirement="MVP_REQUIRED",
            decision_status="PROCUREMENT_OR_PLATFORM_CHOICE",
            adr_or_procurement_needed=True,
            needs_credentials_or_secrets=True,
        ),
        dependency_row(
            dependency_key="IDP_TENANT_AND_APPLICATION_CLIENTS",
            capability_category="IDENTITY_AND_ACCESS",
            classification="ROADMAP_IMPLIED",
            classification_rationale="The roadmap explicitly schedules creation of the IdP tenant and application clients as a distinct provisioning step.",
            purpose="Provision concrete IdP tenants and client registrations for web, native, and service-principal surfaces.",
            required_features=[
                "tenant or realm creation",
                "separate client applications by surface or environment",
                "redirect URI and logout URI registration",
                "client credential export into vault",
                "service-principal registration where required",
            ],
            data_or_credential_sensitivity="Client secrets, application metadata, and tenant administration state.",
            human_or_machine_actor="HUMAN_AND_MACHINE",
            owning_subsystem="IdentityAndAccess",
            environment_scope=FULL_RUNTIME_SCOPE,
            provisioning_prerequisites=[
                "EXTERNAL_IDENTITY_PROVIDER_FEDERATION",
                "BROWSER_AUTOMATION_WORKSPACE_AND_EVIDENCE_HARNESS",
                "SECRETS_MANAGER_OR_TOKEN_VAULT",
            ],
            automation_feasibility="PARTIALLY_AUTOMATABLE_WITH_MANUAL_CHECKPOINTS",
            candidate_service_types=[
                "IdP tenant",
                "OIDC client registration",
                "service-principal registration",
            ],
            source_refs=[
                task_source("pc_0039", "The roadmap creates IdP tenants and application clients as a first-class provisioning dependency."),
                heading_source(
                    SECURITY_PATH,
                    "2. Identity, session, and command trust",
                    "The federation requirement becomes concrete through per-surface client registrations.",
                ),
            ],
            notes=[
                "This row captures concrete tenant and client objects, not the abstract federation capability.",
            ],
            mvp_requirement="PROVISIONING_REQUIRED",
            decision_status="PROCUREMENT_OR_PLATFORM_CHOICE",
            adr_or_procurement_needed=True,
            needs_credentials_or_secrets=True,
        ),
        dependency_row(
            dependency_key="IDP_ROLE_SCOPE_MFA_AND_SESSION_POLICIES",
            capability_category="IDENTITY_AND_ACCESS",
            classification="ROADMAP_IMPLIED",
            classification_rationale="The roadmap separately schedules roles, scopes, MFA, step-up, and session-policy configuration inside the chosen IdP.",
            purpose="Bind product authorization semantics to the concrete IdP configuration for scopes, MFA, step-up, session lifetime, and role posture.",
            required_features=[
                "role and scope mapping",
                "MFA and step-up policy configuration",
                "session lifetime and revocation posture",
                "device/browser policy hooks",
                "environment-specific policy segmentation",
            ],
            data_or_credential_sensitivity="Authorization policy and session-governance metadata.",
            human_or_machine_actor="HUMAN_AND_MACHINE",
            owning_subsystem="IdentityAndAccess",
            environment_scope=FULL_RUNTIME_SCOPE,
            provisioning_prerequisites=["IDP_TENANT_AND_APPLICATION_CLIENTS"],
            automation_feasibility="PARTIALLY_AUTOMATABLE_WITH_MANUAL_CHECKPOINTS",
            candidate_service_types=[
                "IdP authorization policy set",
                "MFA and step-up policy configuration",
            ],
            source_refs=[
                task_source("pc_0040", "The roadmap treats MFA, step-up, session, and role-policy setup as its own dependency boundary."),
                heading_source(
                    ACTOR_MODEL_PATH,
                    "3.11 Non-delegable and step-up actions",
                    "Step-up and non-delegable action rules must be reflected in concrete IdP policy configuration.",
                ),
                heading_source(
                    SECURITY_PATH,
                    "2. Identity, session, and command trust",
                    "Session and step-up trust rules require explicit policy enforcement, not just raw client registration.",
                ),
            ],
            notes=[
                "This row is configuration, not a new vendor choice.",
            ],
            mvp_requirement="PROVISIONING_REQUIRED",
            decision_status="PROCUREMENT_OR_PLATFORM_CHOICE",
            adr_or_procurement_needed=True,
            needs_credentials_or_secrets=False,
        ),
        dependency_row(
            dependency_key="EMAIL_DELIVERY_PROVIDER_ACCOUNT_AND_SENDER_DOMAIN",
            capability_category="NOTIFICATIONS_AND_DELIVERY",
            classification="ROADMAP_IMPLIED",
            classification_rationale="The roadmap explicitly calls for a delivery-provider account and sender-domain setup, while the collaboration contract only makes email optional.",
            purpose="Provision the optional external email channel used for customer notifications and support communication where the product elects to send email.",
            required_features=[
                "sender domain verification",
                "environment-specific sending identities",
                "outbound API or SMTP credential issuance",
                "bounce and suppression handling",
                "redaction-safe delivery metadata",
            ],
            data_or_credential_sensitivity="Recipient addresses, message metadata, and email API credentials.",
            human_or_machine_actor="HUMAN_AND_MACHINE",
            owning_subsystem="Notifications",
            environment_scope=["sandbox", "staging", "production"],
            provisioning_prerequisites=[
                "BROWSER_AUTOMATION_WORKSPACE_AND_EVIDENCE_HARNESS",
                "DNS_TLS_WAF_AND_EDGE_DELIVERY",
                "SECRETS_MANAGER_OR_TOKEN_VAULT",
                "ENVIRONMENT_TENANT_AND_AUTHORITY_PROFILE_MATRIX",
            ],
            automation_feasibility="MANUAL_OR_PROCUREMENT_GATED",
            candidate_service_types=[
                "transactional email provider",
                "managed SMTP relay",
            ],
            source_refs=[
                task_source("pc_0041", "The roadmap provisions a delivery-provider account and sender domain explicitly."),
                heading_source(
                    COLLABORATION_PATH,
                    "9.2 Notification rules",
                    "Customer notifications are in-app and optionally email, so email remains a separate, non-core channel dependency.",
                ),
            ],
            notes=[
                "Email is optional at the algorithm layer, but once selected it requires real provisioning and domain-proof workflows.",
            ],
            mvp_requirement="MVP_CONDITIONAL",
            decision_status="OPTIONAL_VENDOR_SELECTION",
            adr_or_procurement_needed=True,
            needs_credentials_or_secrets=True,
        ),
        dependency_row(
            dependency_key="EMAIL_TEMPLATE_WEBHOOK_AND_CALLBACK_CONFIGURATION",
            capability_category="NOTIFICATIONS_AND_DELIVERY",
            classification="ROADMAP_IMPLIED",
            classification_rationale="The roadmap separately schedules template, webhook, and delivery-callback configuration after the account exists.",
            purpose="Configure message templates, delivery event webhooks, and callback authentication for the selected email provider.",
            required_features=[
                "template family management",
                "delivery-status webhooks",
                "webhook signing or verification",
                "environment-specific callback endpoints",
                "customer-safe message copy controls",
            ],
            data_or_credential_sensitivity="Email event metadata, webhook secrets, and customer-visible message templates.",
            human_or_machine_actor="HUMAN_AND_MACHINE",
            owning_subsystem="Notifications",
            environment_scope=["sandbox", "staging", "production"],
            provisioning_prerequisites=[
                "EMAIL_DELIVERY_PROVIDER_ACCOUNT_AND_SENDER_DOMAIN",
                "DNS_TLS_WAF_AND_EDGE_DELIVERY",
                "SECRETS_MANAGER_OR_TOKEN_VAULT",
            ],
            automation_feasibility="FULLY_AUTOMATABLE",
            candidate_service_types=[
                "provider template configuration",
                "delivery webhook configuration",
            ],
            source_refs=[
                task_source("pc_0042", "The roadmap isolates email templates, webhooks, and callbacks as a dedicated setup step."),
                heading_source(
                    COLLABORATION_PATH,
                    "9.2 Notification rules",
                    "The notification contract requires delivery events to stay deduplicated and visibility-safe, which provider callbacks must support.",
                ),
            ],
            notes=[
                "Delivery callbacks must not leak internal-only state into customer-visible workflows.",
            ],
            mvp_requirement="MVP_CONDITIONAL",
            decision_status="OPTIONAL_VENDOR_SELECTION",
            adr_or_procurement_needed=True,
            needs_credentials_or_secrets=True,
        ),
        dependency_row(
            dependency_key="PUSH_NOTIFICATION_OR_DEVICE_MESSAGING_PROJECT",
            capability_category="NOTIFICATIONS_AND_DELIVERY",
            classification="ROADMAP_IMPLIED",
            classification_rationale="The roadmap explicitly names push or device messaging, but the algorithm corpus treats external push as an embodiment-dependent extension rather than a universal requirement.",
            purpose="Provision external device-messaging credentials if the chosen native or multi-device embodiment needs remote push delivery.",
            required_features=[
                "device messaging project or keys",
                "environment-separated push credentials",
                "redaction-safe notification payloads",
                "notification-open deep-link integrity",
                "revocation-aware device-targeting controls",
            ],
            data_or_credential_sensitivity="Device tokens, notification payload metadata, and messaging service keys.",
            human_or_machine_actor="HUMAN_AND_MACHINE",
            owning_subsystem="Notifications",
            environment_scope=["staging", "production"],
            provisioning_prerequisites=[
                "BROWSER_AUTOMATION_WORKSPACE_AND_EVIDENCE_HARNESS",
                "SECRETS_MANAGER_OR_TOKEN_VAULT",
                "ENVIRONMENT_TENANT_AND_AUTHORITY_PROFILE_MATRIX",
            ],
            automation_feasibility="PARTIALLY_AUTOMATABLE_WITH_MANUAL_CHECKPOINTS",
            candidate_service_types=[
                "platform push notification service",
                "device messaging gateway",
            ],
            source_refs=[
                task_source("pc_0043", "The roadmap includes a push or device-messaging project and keys."),
                text_source(
                    MACOS_BLUEPRINT_PATH,
                    "system notifications for long-running review or authority callbacks",
                    "11. Security and runtime posture for the desktop client",
                    "The native embodiment expects notification surfaces, which can drive a later decision to use an external messaging project.",
                ),
            ],
            notes=[
                "Treat this as embodiment-conditional, not a universal algorithm requirement.",
            ],
            mvp_requirement="MVP_CONDITIONAL",
            decision_status="OPTIONAL_VENDOR_SELECTION",
            adr_or_procurement_needed=True,
            needs_credentials_or_secrets=True,
        ),
        dependency_row(
            dependency_key="SUPPLEMENTAL_ERROR_MONITORING_WORKSPACE",
            capability_category="OBSERVABILITY_OVERLAY",
            classification="OPTIONAL_VENDOR_SELECTED",
            classification_rationale="The algorithm explicitly requires OpenTelemetry-compatible telemetry, but the checklist's separate error-monitoring workspace is an optional overlay rather than the core observability truth store.",
            purpose="Provide a convenience layer for grouped error triage, release markers, and client-surface crash capture beyond the mandatory telemetry baseline.",
            required_features=[
                "grouped exception and crash views",
                "release marker correlation",
                "PII redaction controls",
                "link-back to manifest and trace identifiers",
                "environment-scoped alert routing",
            ],
            data_or_credential_sensitivity="Stack traces, crash diagnostics, release metadata, and ingest tokens.",
            human_or_machine_actor="HUMAN_AND_MACHINE",
            owning_subsystem="Observability",
            environment_scope=["local-dev", "ci", "staging", "production"],
            provisioning_prerequisites=[
                "OPENTELEMETRY_COLLECTION_AND_BACKEND",
                "SECRETS_MANAGER_OR_TOKEN_VAULT",
            ],
            automation_feasibility="FULLY_AUTOMATABLE",
            candidate_service_types=[
                "error-monitoring SaaS",
                "self-hosted error aggregation workspace",
            ],
            source_refs=[
                task_source("pc_0044", "The roadmap provides a dedicated error-monitoring workspace and project tokens."),
                heading_source(
                    OBSERVABILITY_PATH,
                    "14.2 Separation of concerns",
                    "Operational telemetry is mandatory, but a branded error-monitoring workspace is not the normative audit store.",
                ),
            ],
            notes=[
                "Do not mistake this for the authoritative audit or OpenTelemetry backend.",
            ],
            mvp_requirement="MVP_CONDITIONAL",
            decision_status="OPTIONAL_VENDOR_SELECTION",
            adr_or_procurement_needed=True,
            needs_credentials_or_secrets=True,
        ),
        dependency_row(
            dependency_key="HELPDESK_OR_OPERATOR_ASSIST_INTEGRATION",
            capability_category="SUPPORT_INTEGRATION",
            classification="OPTIONAL_VENDOR_SELECTED",
            classification_rationale="The roadmap marks the helpdesk workspace as conditional ('if selected'), and the algorithm models help as a product capability rather than a required external vendor.",
            purpose="Optionally sync contextual help or operator-assist workflows into an external helpdesk or CRM system.",
            required_features=[
                "ticket creation or sync APIs",
                "context-preserving handoff metadata",
                "redaction-safe transcript export",
                "callback or webhook support",
                "partition-aware access controls",
            ],
            data_or_credential_sensitivity="Support transcripts, portal help context, and integration API tokens.",
            human_or_machine_actor="HUMAN_AND_MACHINE",
            owning_subsystem="SupportOperations",
            environment_scope=["staging", "production"],
            provisioning_prerequisites=[
                "BROWSER_AUTOMATION_WORKSPACE_AND_EVIDENCE_HARNESS",
                "SECRETS_MANAGER_OR_TOKEN_VAULT",
            ],
            automation_feasibility="MANUAL_OR_PROCUREMENT_GATED",
            candidate_service_types=[
                "helpdesk SaaS",
                "CRM case-management integration",
            ],
            source_refs=[
                task_source("pc_0045", "The roadmap treats helpdesk integration as conditional on selection."),
                heading_source(
                    PORTAL_PATH,
                    "`Help`",
                    "The product has a first-class help route, but the contract does not require an external helpdesk vendor.",
                ),
            ],
            notes=[
                "PortalHelpRequest remains an internal artifact even when mirrored into an external system.",
            ],
            mvp_requirement="MVP_CONDITIONAL",
            decision_status="OPTIONAL_VENDOR_SELECTION",
            adr_or_procurement_needed=True,
            needs_credentials_or_secrets=True,
        ),
        dependency_row(
            dependency_key="OCR_DOCUMENT_EXTRACTION_CAPABILITY",
            capability_category="DOCUMENT_PROCESSING",
            classification="OPTIONAL_VENDOR_SELECTED",
            classification_rationale="The corpus keeps generic OCR outside the core invention boundary and the roadmap explicitly allows either a managed OCR project or a self-hosted decision.",
            purpose="Optionally provide document text extraction when the chosen implementation uses OCR to assist intake or evidence review.",
            required_features=[
                "document extraction API or self-hosted runtime",
                "confidence metadata on extracted values",
                "PII-safe payload handling",
                "bounded egress and auditability",
                "object-store integration for source artifact retention",
            ],
            data_or_credential_sensitivity="Uploaded documents, extracted tax fields, and extraction service credentials if managed.",
            human_or_machine_actor="MACHINE",
            owning_subsystem="DocumentIntake",
            environment_scope=["sandbox", "staging", "production"],
            provisioning_prerequisites=[
                "OBJECT_STORAGE_AND_QUARANTINE_BUCKETS",
                "SECRETS_MANAGER_OR_TOKEN_VAULT",
            ],
            automation_feasibility="MANUAL_OR_PROCUREMENT_GATED",
            candidate_service_types=[
                "managed OCR API",
                "self-hosted OCR runtime",
            ],
            source_refs=[
                task_source("pc_0046", "The roadmap makes OCR explicitly pluggable: managed project or self-host decision."),
                text_source(
                    SECURITY_PATH,
                    "connector/OCR/authority gateway components SHALL run with least-privilege network egress policies;",
                    "5. Service-to-service and network hardening",
                    "OCR is treated as an optional externalized connector boundary that still needs runtime hardening when present.",
                ),
                text_source(
                    INVENTION_BOUNDARY_PATH,
                    "generic OCR, generic graph databases, or generic access control",
                    "Out-of-scope adjacent functions",
                    "Generic OCR remains adjacent infrastructure rather than core algorithm law.",
                ),
            ],
            notes=[
                "Do not overstate OCR as mandatory for algorithm conformance; it is a pluggable implementation choice.",
            ],
            mvp_requirement="MVP_CONDITIONAL",
            decision_status="OPTIONAL_VENDOR_SELECTION",
            adr_or_procurement_needed=True,
            needs_credentials_or_secrets=True,
        ),
        dependency_row(
            dependency_key="MALWARE_SCANNING_AND_QUARANTINE_CAPABILITY",
            capability_category="DOCUMENT_PROCESSING",
            classification="ALGORITHM_EXPLICIT",
            classification_rationale="The upload and collaboration contracts make scan/quarantine gating mandatory even though the final vendor or self-host strategy is left open.",
            purpose="Scan uploaded files before download or customer-visible publication, quarantine unsafe content, and preserve typed scan-state evidence.",
            required_features=[
                "pending, clean, and quarantined scan states",
                "non-downloadable until clean",
                "quarantine evidence retention",
                "async verdict delivery or polling",
                "typed reason codes surfaced to product read models",
            ],
            data_or_credential_sensitivity="Raw uploaded binaries, quarantine evidence, and scanner service identities.",
            human_or_machine_actor="MACHINE",
            owning_subsystem="DocumentIntake",
            environment_scope=["sandbox", "staging", "production"],
            provisioning_prerequisites=[
                "OBJECT_STORAGE_AND_QUARANTINE_BUCKETS",
                "QUEUE_OR_BROKER_COORDINATION_FABRIC",
                "SECRETS_MANAGER_OR_TOKEN_VAULT",
            ],
            automation_feasibility="MANUAL_OR_PROCUREMENT_GATED",
            candidate_service_types=[
                "managed malware scanning API",
                "self-hosted antivirus scanner",
                "object-event-driven scanning worker",
            ],
            source_refs=[
                task_source("pc_0047", "The roadmap requires either a scanning/quarantine service or a recorded self-host choice."),
                heading_source(
                    PORTAL_PATH,
                    "Secure document-upload flow",
                    "The portal contract requires explicit transfer, scan, validation, acceptance, rejection, and quarantine states.",
                ),
                heading_source(
                    COLLABORATION_PATH,
                    "8.2 Upload staging",
                    "Staged uploads remain non-downloadable until malware scanning and visibility validation succeed.",
                ),
            ],
            notes=[
                "Capability is mandatory; vendor selection remains open.",
            ],
            mvp_requirement="MVP_REQUIRED",
            decision_status="PROCUREMENT_OR_PLATFORM_CHOICE",
            adr_or_procurement_needed=True,
            needs_credentials_or_secrets=True,
        ),
        dependency_row(
            dependency_key="SECRETS_MANAGER_OR_TOKEN_VAULT",
            capability_category="SECRETS_AND_KEYS",
            classification="ALGORITHM_EXPLICIT",
            classification_rationale="The runtime topology and hardening contract explicitly require a governed token vault or secret store for raw authority credentials.",
            purpose="Hold raw authority tokens, app secrets, and integration credentials behind audited policy and rotation boundaries.",
            required_features=[
                "versioned secret storage",
                "raw authority token isolation",
                "rotation and revocation metadata",
                "least-privilege access policies",
                "auditability of secret access and rotation",
            ],
            data_or_credential_sensitivity="Highest sensitivity secret and token material.",
            human_or_machine_actor="HUMAN_AND_MACHINE",
            owning_subsystem="PlatformSecurity",
            environment_scope=FULL_RUNTIME_SCOPE,
            provisioning_prerequisites=["KMS_HSM_ROOT_OF_TRUST"],
            automation_feasibility="FULLY_AUTOMATABLE",
            candidate_service_types=[
                "secret manager",
                "token vault",
            ],
            source_refs=[
                text_source(
                    DEPLOYMENT_PATH,
                    "**Token vault + KMS/HSM**",
                    "1. Reference runtime topology",
                    "The runtime topology names token vault and KMS/HSM as first-class components.",
                ),
                heading_source(
                    SECURITY_PATH,
                    "3. Secret, key, and token handling",
                    "Raw authority tokens must live only in a governed token vault or secret store.",
                ),
            ],
            notes=[
                "This is the inventory anchor for all later external credentials.",
            ],
            mvp_requirement="MVP_REQUIRED",
            decision_status="PROCUREMENT_OR_PLATFORM_CHOICE",
            adr_or_procurement_needed=True,
            needs_credentials_or_secrets=True,
        ),
        dependency_row(
            dependency_key="KMS_HSM_ROOT_OF_TRUST",
            capability_category="SECRETS_AND_KEYS",
            classification="ALGORITHM_EXPLICIT",
            classification_rationale="The hardening contract explicitly roots envelope keys and protected secrets in KMS/HSM-class controls.",
            purpose="Provide the root cryptographic trust boundary for envelope encryption, secret protection, and signing-key custody.",
            required_features=[
                "root key management",
                "HSM-backed or equivalent key protection",
                "per-tenant or per-sensitivity envelope key support",
                "audited rotation",
                "break-glass and revocation posture",
            ],
            data_or_credential_sensitivity="Root cryptographic material and high-impact admin roles.",
            human_or_machine_actor="HUMAN_AND_MACHINE",
            owning_subsystem="PlatformSecurity",
            environment_scope=FULL_RUNTIME_SCOPE,
            provisioning_prerequisites=[],
            automation_feasibility="FULLY_AUTOMATABLE",
            candidate_service_types=[
                "cloud KMS",
                "managed HSM",
                "platform key-management service",
            ],
            source_refs=[
                text_source(
                    DEPLOYMENT_PATH,
                    "**Token vault + KMS/HSM**",
                    "1. Reference runtime topology",
                    "The topology explicitly names KMS/HSM alongside the token vault boundary.",
                ),
                heading_source(
                    SECURITY_PATH,
                    "3. Secret, key, and token handling",
                    "Envelope keys and secret protection are rooted in KMS/HSM master-key material.",
                ),
            ],
            notes=[
                "Secrets manager, build signing, and storage encryption all fan out from this boundary.",
            ],
            mvp_requirement="MVP_REQUIRED",
            decision_status="PROCUREMENT_OR_PLATFORM_CHOICE",
            adr_or_procurement_needed=True,
            needs_credentials_or_secrets=True,
        ),
        dependency_row(
            dependency_key="PRIMARY_TRANSACTIONAL_CONTROL_STORE",
            capability_category="DATASTORE",
            classification="ALGORITHM_EXPLICIT",
            classification_rationale="The deployment topology explicitly requires a primary control store as the durable system of record.",
            purpose="Persist manifests, workflow truth, authority state, and control-plane records with transactional guarantees.",
            required_features=[
                "ACID transactional semantics",
                "schema migration support",
                "durable system-of-record storage",
                "transactional inbox or outbox coupling",
                "backup and restore support",
            ],
            data_or_credential_sensitivity="Regulated control-plane truth and application service credentials.",
            human_or_machine_actor="MACHINE",
            owning_subsystem="ControlPlaneRuntime",
            environment_scope=["sandbox", "staging", "production"],
            provisioning_prerequisites=[
                "ENVIRONMENT_TENANT_AND_AUTHORITY_PROFILE_MATRIX",
                "KMS_HSM_ROOT_OF_TRUST",
            ],
            automation_feasibility="FULLY_AUTOMATABLE",
            candidate_service_types=[
                "managed PostgreSQL",
                "self-hosted PostgreSQL",
            ],
            source_refs=[
                text_source(
                    DEPLOYMENT_PATH,
                    "**Primary control store**",
                    "1. Reference runtime topology",
                    "The runtime topology names a primary control store as the durable truth boundary.",
                ),
                heading_source(
                    DEPLOYMENT_PATH,
                    "3. Schema and datastore migration rules",
                    "Migration rules assume a transactional primary store with governed schema progression.",
                ),
            ],
            notes=[
                "The checklist later names PostgreSQL explicitly, but the algorithmic need is for a transactional control store first.",
            ],
            mvp_requirement="MVP_REQUIRED",
            decision_status="PROCUREMENT_OR_PLATFORM_CHOICE",
            adr_or_procurement_needed=True,
            needs_credentials_or_secrets=True,
        ),
        dependency_row(
            dependency_key="APPEND_ONLY_AUDIT_STORE",
            capability_category="DATASTORE",
            classification="ALGORITHM_EXPLICIT",
            classification_rationale="The deployment topology and observability contract explicitly separate append-only audit evidence from mutable operational telemetry.",
            purpose="Persist immutable compliance-significant events and audit evidence outside disposable telemetry streams.",
            required_features=[
                "append-only or immutable write posture",
                "audit retention and recovery verification",
                "correlation to manifest and authority identifiers",
                "separate access control from generic observability signals",
                "compliance-grade ordering guarantees",
            ],
            data_or_credential_sensitivity="Compliance-significant audit evidence and write credentials.",
            human_or_machine_actor="MACHINE",
            owning_subsystem="AuditAndEvidence",
            environment_scope=["sandbox", "staging", "production"],
            provisioning_prerequisites=[
                "ENVIRONMENT_TENANT_AND_AUTHORITY_PROFILE_MATRIX",
                "KMS_HSM_ROOT_OF_TRUST",
            ],
            automation_feasibility="FULLY_AUTOMATABLE",
            candidate_service_types=[
                "append-only audit table or store",
                "immutable evidence ledger",
            ],
            source_refs=[
                text_source(
                    DEPLOYMENT_PATH,
                    "**Append-only audit store**",
                    "1. Reference runtime topology",
                    "The topology names an append-only audit store as a distinct component.",
                ),
                heading_source(
                    OBSERVABILITY_PATH,
                    "14.10 Audit versus telemetry retention",
                    "Audit history must remain distinct from sampled telemetry and therefore needs its own governed store.",
                ),
            ],
            notes=[
                "Do not collapse this into the generic OpenTelemetry backend.",
            ],
            mvp_requirement="MVP_REQUIRED",
            decision_status="PROCUREMENT_OR_PLATFORM_CHOICE",
            adr_or_procurement_needed=True,
            needs_credentials_or_secrets=True,
        ),
        dependency_row(
            dependency_key="OBJECT_STORAGE_AND_QUARANTINE_BUCKETS",
            capability_category="STORAGE",
            classification="ALGORITHM_EXPLICIT",
            classification_rationale="The runtime topology explicitly requires an object store, and the upload contracts require quarantine-aware artifact segregation.",
            purpose="Store evidence artifacts, uploads, exports, quarantined files, and other large binary or retained objects.",
            required_features=[
                "bucket or container segmentation for evidence, exports, and quarantine",
                "signed URL or preview delivery controls",
                "versioning and retention support",
                "encryption at rest",
                "event hooks for scan and publish workflows",
            ],
            data_or_credential_sensitivity="Uploaded documents, exports, quarantined binaries, and storage access roles.",
            human_or_machine_actor="MACHINE",
            owning_subsystem="ArtifactStorage",
            environment_scope=["sandbox", "staging", "production"],
            provisioning_prerequisites=[
                "ENVIRONMENT_TENANT_AND_AUTHORITY_PROFILE_MATRIX",
                "KMS_HSM_ROOT_OF_TRUST",
            ],
            automation_feasibility="FULLY_AUTOMATABLE",
            candidate_service_types=[
                "object storage bucket service",
                "blob storage service",
            ],
            source_refs=[
                text_source(
                    DEPLOYMENT_PATH,
                    "**Object store**",
                    "1. Reference runtime topology",
                    "The topology explicitly names an object store for retained artifacts and evidence.",
                ),
                heading_source(
                    COLLABORATION_PATH,
                    "8.2 Upload staging",
                    "Upload staging and quarantine require explicit storage segregation before publication.",
                ),
            ],
            notes=[
                "Quarantine storage is part of the same capability boundary but must stay logically distinct.",
            ],
            mvp_requirement="MVP_REQUIRED",
            decision_status="PROCUREMENT_OR_PLATFORM_CHOICE",
            adr_or_procurement_needed=True,
            needs_credentials_or_secrets=True,
        ),
        dependency_row(
            dependency_key="QUEUE_OR_BROKER_COORDINATION_FABRIC",
            capability_category="MESSAGE_COORDINATION",
            classification="ALGORITHM_EXPLICIT",
            classification_rationale="The runtime topology explicitly requires a queue/broker for outbox, inbox, and worker coordination, even though it may never be the system of record.",
            purpose="Coordinate worker execution, inbox/outbox delivery, and asynchronous integration flows without becoming durable legal truth.",
            required_features=[
                "worker coordination",
                "outbox and inbox delivery fabric",
                "rebuildability from durable truth",
                "transactional inbox and dedupe support",
                "backpressure and backlog observability",
            ],
            data_or_credential_sensitivity="Opaque refs, timing metadata, and broker access credentials.",
            human_or_machine_actor="MACHINE",
            owning_subsystem="AsyncRuntime",
            environment_scope=["sandbox", "staging", "production"],
            provisioning_prerequisites=["PRIMARY_TRANSACTIONAL_CONTROL_STORE"],
            automation_feasibility="FULLY_AUTOMATABLE",
            candidate_service_types=[
                "message broker",
                "queue service",
            ],
            source_refs=[
                text_source(
                    DEPLOYMENT_PATH,
                    "**Queue / broker**",
                    "1. Reference runtime topology",
                    "The topology explicitly names a queue or broker for delivery fabric and worker coordination.",
                ),
                heading_source(
                    SECURITY_PATH,
                    "5. Service-to-service and network hardening",
                    "Inbound callbacks and worker results enter through transactional inbox and dedupe layers before mutation.",
                ),
            ],
            notes=[
                "Queue loss must remain recoverable from durable truth.",
            ],
            mvp_requirement="MVP_REQUIRED",
            decision_status="PROCUREMENT_OR_PLATFORM_CHOICE",
            adr_or_procurement_needed=True,
            needs_credentials_or_secrets=True,
        ),
        dependency_row(
            dependency_key="CACHE_AND_STREAM_RESUME_STORE",
            capability_category="CACHE_AND_RESUME",
            classification="ALGORITHM_EXPLICIT",
            classification_rationale="Disposable caches and resume stores are explicit runtime components, with strict cache-isolation and rebuild rules.",
            purpose="Hold resumable stream cursors, disposable caches, and other rebuildable acceleration state without widening security or truth boundaries.",
            required_features=[
                "resume token support",
                "tenant and masking-aware cache partitioning",
                "rebuildable read-side acceleration",
                "explicit purge or reject on security drift",
                "stream catch-up coordination",
            ],
            data_or_credential_sensitivity="Masked projections, resume tokens, and cache access credentials.",
            human_or_machine_actor="MACHINE",
            owning_subsystem="ReadModelDelivery",
            environment_scope=["sandbox", "staging", "production"],
            provisioning_prerequisites=["PRIMARY_TRANSACTIONAL_CONTROL_STORE"],
            automation_feasibility="FULLY_AUTOMATABLE",
            candidate_service_types=[
                "cache service",
                "stream resume store",
            ],
            source_refs=[
                heading_source(
                    DEPLOYMENT_PATH,
                    "1. Reference runtime topology",
                    "The topology includes a read-side projector or stream broker plus disposable caches and rebuildable read state.",
                ),
                text_source(
                    SECURITY_PATH,
                    "cache keys for northbound read surfaces SHALL include at minimum",
                    "6. Data protection, privacy, and cache safety",
                    "Cache and resume state are governed security boundaries rather than generic performance-only features.",
                ),
            ],
            notes=[
                "This is a real externalized runtime capability even though its stored contents remain disposable.",
            ],
            mvp_requirement="MVP_REQUIRED",
            decision_status="PROCUREMENT_OR_PLATFORM_CHOICE",
            adr_or_procurement_needed=True,
            needs_credentials_or_secrets=True,
        ),
        dependency_row(
            dependency_key="OPENTELEMETRY_COLLECTION_AND_BACKEND",
            capability_category="OBSERVABILITY",
            classification="ALGORITHM_EXPLICIT",
            classification_rationale="The observability contract explicitly grounds telemetry in OpenTelemetry-style traces, metrics, and logs while separating them from audit evidence.",
            purpose="Collect and persist traces, metrics, and logs with mandatory correlation keys and controlled access boundaries.",
            required_features=[
                "trace, metric, and log ingestion",
                "OpenTelemetry-compatible collector model",
                "correlation-key propagation",
                "security and privacy signal separation",
                "retention and access-control support",
            ],
            data_or_credential_sensitivity="Operational, security, and privacy telemetry plus ingest credentials.",
            human_or_machine_actor="MACHINE",
            owning_subsystem="Observability",
            environment_scope=["local-dev", "ci", "staging", "production"],
            provisioning_prerequisites=["ENVIRONMENT_TENANT_AND_AUTHORITY_PROFILE_MATRIX"],
            automation_feasibility="FULLY_AUTOMATABLE",
            candidate_service_types=[
                "OpenTelemetry collector",
                "trace backend",
                "metric backend",
                "log backend",
            ],
            source_refs=[
                heading_source(
                    OBSERVABILITY_PATH,
                    "14.2 Separation of concerns",
                    "The signal model explicitly separates audit evidence from operational, security, and privacy telemetry.",
                ),
                heading_source(
                    OBSERVABILITY_PATH,
                    "14.8 Metric contract",
                    "Metric, trace, and log families are mandatory runtime capabilities even though product choice is open.",
                ),
            ],
            notes=[
                "The capability is mandatory even when the backend is self-hosted rather than vendor SaaS.",
            ],
            mvp_requirement="MVP_REQUIRED",
            decision_status="PROCUREMENT_OR_PLATFORM_CHOICE",
            adr_or_procurement_needed=True,
            needs_credentials_or_secrets=True,
        ),
        dependency_row(
            dependency_key="CONTAINER_REGISTRY_BUILD_SIGNING_AND_ATTESTATION",
            capability_category="SUPPLY_CHAIN",
            classification="ALGORITHM_EXPLICIT",
            classification_rationale="Build signing, SBOMs, provenance attestations, and release admission checks are explicit hardening requirements.",
            purpose="Store deployable artifacts and provide vulnerability scanning, signing, provenance attestation, and release-admission evidence.",
            required_features=[
                "artifact registry",
                "SBOM generation and retention",
                "dependency and image vulnerability scanning",
                "signed build artifacts",
                "provenance or attestation verification",
            ],
            data_or_credential_sensitivity="Build artifacts, registry credentials, provenance metadata, and signing-key references.",
            human_or_machine_actor="MACHINE",
            owning_subsystem="ReleaseEngineering",
            environment_scope=["ci", "staging", "production"],
            provisioning_prerequisites=["KMS_HSM_ROOT_OF_TRUST"],
            automation_feasibility="FULLY_AUTOMATABLE",
            candidate_service_types=[
                "container registry",
                "artifact signing service",
                "provenance attestation service",
            ],
            source_refs=[
                heading_source(
                    SECURITY_PATH,
                    "7. Supply-chain and build integrity",
                    "Supply-chain integrity explicitly requires SBOMs, vulnerability scanning, signed build outputs, and provenance checks.",
                ),
                heading_source(
                    DEPLOYMENT_PATH,
                    "2. Promotion pipeline",
                    "The promotion pipeline builds, signs, and verifies release artifacts before promotion.",
                ),
            ],
            notes=[
                "The capability is explicit even if the eventual ADR selects a specific registry or attestation stack later.",
            ],
            mvp_requirement="MVP_REQUIRED",
            decision_status="PROCUREMENT_OR_PLATFORM_CHOICE",
            adr_or_procurement_needed=True,
            needs_credentials_or_secrets=True,
        ),
        dependency_row(
            dependency_key="DNS_TLS_WAF_AND_EDGE_DELIVERY",
            capability_category="NETWORK_EDGE",
            classification="ROADMAP_IMPLIED",
            classification_rationale="TLS for external traffic is explicit, while the checklist packages DNS, WAF, and edge delivery into the practical provisioning surface.",
            purpose="Provide public DNS, TLS termination or certificate automation, callback host stability, and protective edge controls for exposed endpoints.",
            required_features=[
                "public DNS management",
                "TLS certificate lifecycle",
                "stable authority and IdP callback hostnames",
                "edge routing and ingress protection",
                "WAF or equivalent ingress controls",
            ],
            data_or_credential_sensitivity="Domain-control credentials, certificate private keys, and ingress policy configuration.",
            human_or_machine_actor="HUMAN_AND_MACHINE",
            owning_subsystem="PlatformNetworking",
            environment_scope=["ephemeral-review", "sandbox", "staging", "production"],
            provisioning_prerequisites=["ENVIRONMENT_TENANT_AND_AUTHORITY_PROFILE_MATRIX"],
            automation_feasibility="PARTIALLY_AUTOMATABLE_WITH_STABLE_CALLBACKS",
            candidate_service_types=[
                "DNS provider",
                "TLS certificate manager",
                "WAF or edge gateway",
            ],
            source_refs=[
                task_source("pc_0056", "The roadmap packages DNS, TLS, WAF, and edge delivery as a single provisioning step."),
                heading_source(
                    SECURITY_PATH,
                    "4. Browser, native-client, API, and transport hardening",
                    "TLS for all external traffic is mandatory, and stable ingress is a prerequisite for provider callbacks and identity flows.",
                ),
            ],
            notes=[
                "Ephemeral review hosts should not be used as the canonical provider callback target even if they exist at the edge.",
            ],
            mvp_requirement="PROVISIONING_REQUIRED",
            decision_status="PROCUREMENT_OR_PLATFORM_CHOICE",
            adr_or_procurement_needed=True,
            needs_credentials_or_secrets=True,
        ),
        dependency_row(
            dependency_key="CI_CD_RUNNERS_ENV_SECRETS_AND_EPHEMERAL_PREVIEW",
            capability_category="DELIVERY_AUTOMATION",
            classification="ROADMAP_IMPLIED",
            classification_rationale="The roadmap explicitly schedules CI/CD runners, environment secrets, and ephemeral preview accounts as a combined control-plane dependency.",
            purpose="Provide isolated automation runners, gated secret injection, and preview environments for repeatable delivery and provisioning verification.",
            required_features=[
                "isolated build and deploy runners",
                "environment-scoped secret injection",
                "ephemeral preview environments",
                "policy-gated release promotion",
                "browser automation execution targets",
            ],
            data_or_credential_sensitivity="Deploy credentials, runner registration tokens, preview-account secrets, and build logs.",
            human_or_machine_actor="HUMAN_AND_MACHINE",
            owning_subsystem="ReleaseEngineering",
            environment_scope=["ci", "ephemeral-review", "staging", "production"],
            provisioning_prerequisites=[
                "SECRETS_MANAGER_OR_TOKEN_VAULT",
                "CONTAINER_REGISTRY_BUILD_SIGNING_AND_ATTESTATION",
                "DNS_TLS_WAF_AND_EDGE_DELIVERY",
            ],
            automation_feasibility="FULLY_AUTOMATABLE",
            candidate_service_types=[
                "CI runner fleet",
                "preview environment platform",
                "deployment orchestrator",
            ],
            source_refs=[
                task_source("pc_0057", "The roadmap explicitly provisions CI/CD runners, environment secrets, and preview accounts."),
                heading_source(
                    DEPLOYMENT_PATH,
                    "2. Promotion pipeline",
                    "Promotion requires repeated gated environments and reliable automation execution.",
                ),
                heading_source(
                    SECURITY_PATH,
                    "8. Operational security release gates",
                    "Release admission depends on automated policy checks and secret-hygiene enforcement.",
                ),
            ],
            notes=[
                "Preview environments are useful for internal smoke tests, but they remain a poor source of authority callback hostnames.",
            ],
            mvp_requirement="PROVISIONING_REQUIRED",
            decision_status="PROCUREMENT_OR_PLATFORM_CHOICE",
            adr_or_procurement_needed=True,
            needs_credentials_or_secrets=True,
        ),
        dependency_row(
            dependency_key="MACOS_CODE_SIGNING_NOTARIZATION_AND_KEYCHAIN_TRUST_CHAIN",
            capability_category="NATIVE_DELIVERY",
            classification="ALGORITHM_EXPLICIT",
            classification_rationale="The native blueprint, deployment contract, and security gates all explicitly require code signing, notarization, hardened runtime, and Keychain-safe storage for shipped macOS builds.",
            purpose="Provide the Apple-side signing, notarization, and local-trust chain needed to ship the native macOS operator workspace safely.",
            required_features=[
                "Apple developer signing identity",
                "notarization workflow",
                "hardened runtime compliance",
                "least-privilege entitlements",
                "Keychain-safe handling for native session material",
            ],
            data_or_credential_sensitivity="Apple signing certificates, notary API keys, and desktop credential-handling trust policy.",
            human_or_machine_actor="HUMAN_AND_MACHINE",
            owning_subsystem="DesktopPlatform",
            environment_scope=["ci", "staging", "production"],
            provisioning_prerequisites=[
                "KMS_HSM_ROOT_OF_TRUST",
                "SECRETS_MANAGER_OR_TOKEN_VAULT",
                "CI_CD_RUNNERS_ENV_SECRETS_AND_EPHEMERAL_PREVIEW",
            ],
            automation_feasibility="PARTIALLY_AUTOMATABLE_WITH_MANUAL_CHECKPOINTS",
            candidate_service_types=[
                "Apple developer signing program",
                "notarization service",
                "certificate-management boundary",
            ],
            source_refs=[
                heading_source(
                    MACOS_BLUEPRINT_PATH,
                    "11. Security and runtime posture for the desktop client",
                    "The native blueprint requires code signing, notarization, hardened runtime, and Keychain-only credential posture.",
                ),
                heading_source(
                    SECURITY_PATH,
                    "8. Operational security release gates",
                    "No production desktop client may ship without signature, notarization, and hardened-runtime policy.",
                ),
                heading_source(
                    DEPLOYMENT_PATH,
                    "2. Promotion pipeline",
                    "BuildArtifact promotion explicitly includes signing and notarization when the desktop app ships.",
                ),
            ],
            notes=[
                "Treat Apple-side trust as a distinct external dependency rather than a generic CI detail.",
            ],
            mvp_requirement="MVP_REQUIRED",
            decision_status="PROCUREMENT_OR_PLATFORM_CHOICE",
            adr_or_procurement_needed=True,
            needs_credentials_or_secrets=True,
        ),
        dependency_row(
            dependency_key="DESKTOP_RELEASE_AND_UPDATE_CHANNEL",
            capability_category="NATIVE_DELIVERY",
            classification="ALGORITHM_EXPLICIT",
            classification_rationale="The deployment topology explicitly names a desktop release/update channel with staged distribution and emergency revocation.",
            purpose="Distribute signed desktop builds, segment update channels, and support revocation or kill-switch behavior for the macOS operator workspace.",
            required_features=[
                "staged release channels",
                "signed update metadata",
                "compatibility and rollback policy support",
                "emergency revocation or kill switch",
                "artifact hosting for desktop releases",
            ],
            data_or_credential_sensitivity="Signed release artifacts, update metadata, and channel-publishing credentials.",
            human_or_machine_actor="HUMAN_AND_MACHINE",
            owning_subsystem="DesktopPlatform",
            environment_scope=["staging", "production"],
            provisioning_prerequisites=[
                "MACOS_CODE_SIGNING_NOTARIZATION_AND_KEYCHAIN_TRUST_CHAIN",
                "OBJECT_STORAGE_AND_QUARANTINE_BUCKETS",
                "DNS_TLS_WAF_AND_EDGE_DELIVERY",
                "CI_CD_RUNNERS_ENV_SECRETS_AND_EPHEMERAL_PREVIEW",
            ],
            automation_feasibility="PARTIALLY_AUTOMATABLE_WITH_STABLE_CALLBACKS",
            candidate_service_types=[
                "desktop update feed",
                "signed package repository",
                "artifact CDN",
            ],
            source_refs=[
                text_source(
                    DEPLOYMENT_PATH,
                    "**Desktop release/update channel**",
                    "1. Reference runtime topology",
                    "The deployment topology explicitly names the desktop release/update channel as a runtime component.",
                ),
                heading_source(
                    MACOS_BLUEPRINT_PATH,
                    "13. Delivery sequencing",
                    "Delivery sequencing assumes a real signed-distribution mechanism rather than ad hoc local builds.",
                ),
            ],
            notes=[
                "This is separate from signing and notarization; it governs ongoing distribution and revocation.",
            ],
            mvp_requirement="MVP_REQUIRED",
            decision_status="PROCUREMENT_OR_PLATFORM_CHOICE",
            adr_or_procurement_needed=True,
            needs_credentials_or_secrets=True,
        ),
        dependency_row(
            dependency_key="INTERNAL_NORTHBOUND_COMMAND_AND_SESSION_APIS",
            capability_category="INTERNAL_PRODUCT_API",
            classification="INTERNAL_ONLY",
            classification_rationale="The northbound command and session surfaces are explicitly product-internal APIs, not third-party dependencies.",
            purpose="Expose internal command ingress, session continuity, anti-CSRF posture, and browser/native state coordination for product clients.",
            required_features=[
                "command envelope ingestion",
                "session continuity and revocation behavior",
                "anti-CSRF and stale-view protections",
                "browser and native client coordination",
                "internal authorization enforcement",
            ],
            data_or_credential_sensitivity="Product session state and internal authorization metadata.",
            human_or_machine_actor="HUMAN_AND_MACHINE",
            owning_subsystem="ProductAPI",
            environment_scope=FULL_RUNTIME_SCOPE,
            provisioning_prerequisites=[
                "PRIMARY_TRANSACTIONAL_CONTROL_STORE",
                "CACHE_AND_STREAM_RESUME_STORE",
                "IDP_ROLE_SCOPE_MFA_AND_SESSION_POLICIES",
            ],
            automation_feasibility="INTERNAL_DELIVERY_ONLY",
            candidate_service_types=[
                "internal HTTP API",
                "internal command gateway",
                "internal session service",
            ],
            source_refs=[
                heading_source(
                    NORTHBOUND_API_PATH,
                    "2. Required northbound surfaces",
                    "The contract defines these APIs as internal system surfaces even though they are exposed over HTTP.",
                ),
                heading_source(
                    NORTHBOUND_API_PATH,
                    "8. Session, browser, and native-client rules",
                    "Session and browser-state rules are part of the internal product contract, not an external service dependency.",
                ),
            ],
            notes=[
                "This row exists to prevent later provisioning work from misclassifying product APIs as external services.",
            ],
            mvp_requirement="INTERNAL_SURFACE",
            decision_status="INTERNAL_IMPLEMENTATION",
            adr_or_procurement_needed=False,
            needs_credentials_or_secrets=False,
        ),
        dependency_row(
            dependency_key="INTERNAL_PRODUCT_READ_MODELS_STREAMS_AND_UPLOAD_APIS",
            capability_category="INTERNAL_PRODUCT_API",
            classification="INTERNAL_ONLY",
            classification_rationale="Read models, stream endpoints, and upload-session APIs are internal northbound product surfaces even when they touch externalized storage or scanning infrastructure underneath.",
            purpose="Expose governed internal read surfaces, stream/reconnect flows, and upload-session APIs to browser and native clients.",
            required_features=[
                "reconnect-safe read-model snapshots",
                "stream and resume semantics",
                "governed upload sessions",
                "customer-safe projection rules",
                "typed scan and limitation posture projection",
            ],
            data_or_credential_sensitivity="Customer-safe projections, upload-session state, and stream resume metadata.",
            human_or_machine_actor="HUMAN_AND_MACHINE",
            owning_subsystem="ReadModelDelivery",
            environment_scope=FULL_RUNTIME_SCOPE,
            provisioning_prerequisites=[
                "PRIMARY_TRANSACTIONAL_CONTROL_STORE",
                "OBJECT_STORAGE_AND_QUARANTINE_BUCKETS",
                "QUEUE_OR_BROKER_COORDINATION_FABRIC",
                "CACHE_AND_STREAM_RESUME_STORE",
                "MALWARE_SCANNING_AND_QUARANTINE_CAPABILITY",
            ],
            automation_feasibility="INTERNAL_DELIVERY_ONLY",
            candidate_service_types=[
                "internal read-model API",
                "internal stream endpoint",
                "internal upload-session service",
            ],
            source_refs=[
                heading_source(
                    NORTHBOUND_API_PATH,
                    "2. Required northbound surfaces",
                    "Admin, portal, and collaboration reads remain internal product APIs rather than third-party services.",
                ),
                heading_source(
                    COLLABORATION_PATH,
                    "8.2 Upload staging",
                    "Upload staging uses internal session APIs layered over storage and scanning dependencies.",
                ),
                heading_source(
                    NORTHBOUND_API_PATH,
                    "7. Stream and reconnect rules",
                    "Stream and resume semantics belong to the product API surface, not the external dependency list.",
                ),
            ],
            notes=[
                "This row separates the external infrastructure from the internal product contract that consumes it.",
            ],
            mvp_requirement="INTERNAL_SURFACE",
            decision_status="INTERNAL_IMPLEMENTATION",
            adr_or_procurement_needed=False,
            needs_credentials_or_secrets=False,
        ),
    ]


def build_credential_inventory() -> list[dict[str, Any]]:
    return [
        credential_record(
            credential_key="authority-oauth-token-bundle",
            dependency_key="AUTHORITY_API_PROVIDER_INTERFACE",
            credential_kind="access_refresh_tokens",
            owner_actor="MACHINE",
            owning_subsystem="AuthorityGateway",
            environment_scope=AUTHORITY_SCOPE,
            storage_boundary="SECRETS_MANAGER_OR_TOKEN_VAULT",
            rotation_or_renewal_rule="Renew on provider token lifecycle, bind to the registered client, and revoke or rotate on authority-link invalidation.",
            usage_constraints=[
                "No raw token outside the governed vault boundary.",
                "Queued sends must revalidate token version before use.",
            ],
            source_refs=[
                heading_source(
                    SECURITY_PATH,
                    "3. Secret, key, and token handling",
                    "Raw authority access and refresh tokens live only in the governed secret boundary.",
                ),
                heading_source(
                    AUTHORITY_PROTOCOL_PATH,
                    "9.6 Token and client binding rule",
                    "Authority tokens stay bound to the exact client and reporting-subject context.",
                ),
            ],
        ),
        credential_record(
            credential_key="hmrc-sandbox-client-credentials",
            dependency_key="AUTHORITY_SANDBOX_APP_REGISTRATION",
            credential_kind="client_id_client_secret",
            owner_actor="HUMAN_AND_MACHINE",
            owning_subsystem="AuthorityGateway",
            environment_scope=["sandbox", "staging"],
            storage_boundary="SECRETS_MANAGER_OR_TOKEN_VAULT",
            rotation_or_renewal_rule="Export to the vault immediately after issuance and rotate on environment refresh or provider policy changes.",
            usage_constraints=[
                "Sandbox and production client secrets must never share one record.",
            ],
            source_refs=[
                task_source("pc_0038", "The roadmap explicitly exports HMRC client identifiers and secrets into vault records."),
                heading_source(
                    AUTHORITY_PROTOCOL_PATH,
                    "9.6 Token and client binding rule",
                    "Client identity is a first-class binding input and must remain stable per environment.",
                ),
            ],
        ),
        credential_record(
            credential_key="hmrc-production-client-credentials",
            dependency_key="AUTHORITY_PRODUCTION_APP_REGISTRATION",
            credential_kind="client_id_client_secret",
            owner_actor="HUMAN_AND_MACHINE",
            owning_subsystem="AuthorityGateway",
            environment_scope=["production"],
            storage_boundary="SECRETS_MANAGER_OR_TOKEN_VAULT",
            rotation_or_renewal_rule="Export to the vault on issuance, attach live rotation evidence, and never co-store with sandbox credentials.",
            usage_constraints=[
                "Live authority credentials require stricter approval and rotation evidence than sandbox credentials.",
            ],
            source_refs=[
                task_source("pc_0038", "Vault export and rotation evidence apply to HMRC client identifiers and secrets."),
                heading_source(
                    AUTHORITY_PROTOCOL_PATH,
                    "9.3 Core protocol objects",
                    "Provider environment remains frozen on the authority binding, so live credentials must remain distinct.",
                ),
            ],
        ),
        credential_record(
            credential_key="idp-federation-signing-and-admin-material",
            dependency_key="EXTERNAL_IDENTITY_PROVIDER_FEDERATION",
            credential_kind="signing_keys_or_admin_api_material",
            owner_actor="HUMAN_AND_MACHINE",
            owning_subsystem="IdentityAndAccess",
            environment_scope=FULL_RUNTIME_SCOPE,
            storage_boundary="SECRETS_MANAGER_OR_TOKEN_VAULT",
            rotation_or_renewal_rule="Rotate on federation key rollover and provider admin-boundary changes.",
            usage_constraints=[
                "Do not mix IdP tenant-admin secrets with application client secrets.",
            ],
            source_refs=[
                heading_source(
                    SECURITY_PATH,
                    "2. Identity, session, and command trust",
                    "Federated identity is a governed security dependency that requires controlled key and admin material.",
                ),
            ],
        ),
        credential_record(
            credential_key="idp-application-client-secrets",
            dependency_key="IDP_TENANT_AND_APPLICATION_CLIENTS",
            credential_kind="client_secrets_or_private_keys",
            owner_actor="HUMAN_AND_MACHINE",
            owning_subsystem="IdentityAndAccess",
            environment_scope=FULL_RUNTIME_SCOPE,
            storage_boundary="SECRETS_MANAGER_OR_TOKEN_VAULT",
            rotation_or_renewal_rule="Rotate on client lifecycle events, redirect URI changes, or policy-hardening cycles.",
            usage_constraints=[
                "Separate web, native, and service-principal client material where the IdP does so.",
            ],
            source_refs=[
                task_source("pc_0039", "Application clients are a provisioning output and therefore create managed secrets."),
            ],
        ),
        credential_record(
            credential_key="email-provider-api-key-and-domain-proof",
            dependency_key="EMAIL_DELIVERY_PROVIDER_ACCOUNT_AND_SENDER_DOMAIN",
            credential_kind="api_key_and_dns_verification_material",
            owner_actor="HUMAN_AND_MACHINE",
            owning_subsystem="Notifications",
            environment_scope=["sandbox", "staging", "production"],
            storage_boundary="SECRETS_MANAGER_OR_TOKEN_VAULT",
            rotation_or_renewal_rule="Rotate API credentials on provider policy intervals; preserve domain-proof evidence separately from the key record.",
            usage_constraints=[
                "Outbound mail identities must remain environment-scoped and redaction-safe.",
            ],
            source_refs=[
                task_source("pc_0041", "The delivery provider account and sender domain create provider credentials and domain-proof artifacts."),
            ],
        ),
        credential_record(
            credential_key="email-webhook-signing-secret",
            dependency_key="EMAIL_TEMPLATE_WEBHOOK_AND_CALLBACK_CONFIGURATION",
            credential_kind="webhook_shared_secret_or_signing_key",
            owner_actor="MACHINE",
            owning_subsystem="Notifications",
            environment_scope=["sandbox", "staging", "production"],
            storage_boundary="SECRETS_MANAGER_OR_TOKEN_VAULT",
            rotation_or_renewal_rule="Rotate whenever callback endpoints or provider signing settings change.",
            usage_constraints=[
                "Webhook verification secrets must never be embedded in customer-visible templates or logs.",
            ],
            source_refs=[
                task_source("pc_0042", "Webhook and callback configuration produces shared verification material."),
            ],
        ),
        credential_record(
            credential_key="device-messaging-server-key",
            dependency_key="PUSH_NOTIFICATION_OR_DEVICE_MESSAGING_PROJECT",
            credential_kind="server_key_or_push_certificate",
            owner_actor="HUMAN_AND_MACHINE",
            owning_subsystem="Notifications",
            environment_scope=["staging", "production"],
            storage_boundary="SECRETS_MANAGER_OR_TOKEN_VAULT",
            rotation_or_renewal_rule="Rotate on platform key expiry or device messaging project rollover.",
            usage_constraints=[
                "Push payloads must remain redaction-safe regardless of provider choice.",
            ],
            source_refs=[
                task_source("pc_0043", "Device-messaging projects and keys generate platform credentials."),
            ],
        ),
        credential_record(
            credential_key="error-monitoring-ingest-token",
            dependency_key="SUPPLEMENTAL_ERROR_MONITORING_WORKSPACE",
            credential_kind="ingest_token",
            owner_actor="MACHINE",
            owning_subsystem="Observability",
            environment_scope=["local-dev", "ci", "staging", "production"],
            storage_boundary="SECRETS_MANAGER_OR_TOKEN_VAULT",
            rotation_or_renewal_rule="Rotate on workspace or environment rollover; keep alert-routing ownership separate from ingest credentials.",
            usage_constraints=[
                "Error-monitoring vendors must not receive raw authority tokens or unrestricted regulated payload bodies.",
            ],
            source_refs=[
                task_source("pc_0044", "The roadmap provisions error-monitoring project tokens."),
                heading_source(
                    SECURITY_PATH,
                    "6. Data protection, privacy, and cache safety",
                    "Logs and telemetry sinks must redact secrets and full regulated payload bodies.",
                ),
            ],
        ),
        credential_record(
            credential_key="helpdesk-api-token",
            dependency_key="HELPDESK_OR_OPERATOR_ASSIST_INTEGRATION",
            credential_kind="api_token",
            owner_actor="HUMAN_AND_MACHINE",
            owning_subsystem="SupportOperations",
            environment_scope=["staging", "production"],
            storage_boundary="SECRETS_MANAGER_OR_TOKEN_VAULT",
            rotation_or_renewal_rule="Rotate on integration rollout or support-vendor security policy change.",
            usage_constraints=[
                "External helpdesk sync must not widen visibility beyond customer-safe or operator-authorized context.",
            ],
            source_refs=[
                task_source("pc_0045", "External helpdesk integration requires vendor API credentials when selected."),
            ],
        ),
        credential_record(
            credential_key="ocr-service-credential",
            dependency_key="OCR_DOCUMENT_EXTRACTION_CAPABILITY",
            credential_kind="api_key_or_workload_identity",
            owner_actor="MACHINE",
            owning_subsystem="DocumentIntake",
            environment_scope=["sandbox", "staging", "production"],
            storage_boundary="SECRETS_MANAGER_OR_TOKEN_VAULT",
            rotation_or_renewal_rule="Rotate with provider policy or on self-host worker identity replacement.",
            usage_constraints=[
                "OCR workers must not bypass malware-scan or retention controls when fetching source documents.",
            ],
            source_refs=[
                task_source("pc_0046", "Managed OCR projects create provider credentials; self-hosted runtimes require workload identity instead."),
            ],
        ),
        credential_record(
            credential_key="scanner-service-credential",
            dependency_key="MALWARE_SCANNING_AND_QUARANTINE_CAPABILITY",
            credential_kind="api_key_or_workload_identity",
            owner_actor="MACHINE",
            owning_subsystem="DocumentIntake",
            environment_scope=["sandbox", "staging", "production"],
            storage_boundary="SECRETS_MANAGER_OR_TOKEN_VAULT",
            rotation_or_renewal_rule="Rotate on scanner provider rollover or self-host worker identity rotation.",
            usage_constraints=[
                "Scanning credentials must stay partitioned from customer-facing download or preview credentials.",
            ],
            source_refs=[
                task_source("pc_0047", "Managed scanning or self-hosted decision both require governed service identity."),
                heading_source(
                    COLLABORATION_PATH,
                    "8.2 Upload staging",
                    "Scan and publish-time visibility checks are mandatory before staged uploads can be delivered.",
                ),
            ],
        ),
        credential_record(
            credential_key="vault-admin-and-app-auth-boundary",
            dependency_key="SECRETS_MANAGER_OR_TOKEN_VAULT",
            credential_kind="admin_role_or_app_auth_material",
            owner_actor="HUMAN_AND_MACHINE",
            owning_subsystem="PlatformSecurity",
            environment_scope=FULL_RUNTIME_SCOPE,
            storage_boundary="break_glass_ops_boundary",
            rotation_or_renewal_rule="Rotate on security posture change and record every admin-boundary change with audit evidence.",
            usage_constraints=[
                "Never bootstrap a vault with unmanaged shared credentials embedded in CI or repos.",
            ],
            source_refs=[
                heading_source(
                    SECURITY_PATH,
                    "3. Secret, key, and token handling",
                    "Key and secret rotation must be auditable and fail closed on version-binding issues.",
                ),
            ],
        ),
        credential_record(
            credential_key="kms-root-key-admin-role",
            dependency_key="KMS_HSM_ROOT_OF_TRUST",
            credential_kind="admin_role_or_hsm_operator_boundary",
            owner_actor="HUMAN_AND_MACHINE",
            owning_subsystem="PlatformSecurity",
            environment_scope=FULL_RUNTIME_SCOPE,
            storage_boundary="break_glass_ops_boundary",
            rotation_or_renewal_rule="Rotate key-admin boundary on personnel or provider trust changes; key versions rotate per platform policy.",
            usage_constraints=[
                "Root key custody must stay segregated from ordinary application runtime roles.",
            ],
            source_refs=[
                heading_source(
                    SECURITY_PATH,
                    "3. Secret, key, and token handling",
                    "Root key material and rotation are governed at a stronger security boundary.",
                ),
            ],
        ),
        credential_record(
            credential_key="primary-db-app-and-migration-roles",
            dependency_key="PRIMARY_TRANSACTIONAL_CONTROL_STORE",
            credential_kind="database_roles",
            owner_actor="MACHINE",
            owning_subsystem="ControlPlaneRuntime",
            environment_scope=["sandbox", "staging", "production"],
            storage_boundary="SECRETS_MANAGER_OR_TOKEN_VAULT",
            rotation_or_renewal_rule="Rotate app and migration roles separately and gate promotion on schema compatibility evidence.",
            usage_constraints=[
                "Operational readers must not share write-capable migration credentials.",
            ],
            source_refs=[
                task_source("pc_0050", "Provisioning the primary PostgreSQL store creates runtime and migration credentials."),
                heading_source(
                    DEPLOYMENT_PATH,
                    "3. Schema and datastore migration rules",
                    "Migration workflows require a distinct controlled credential posture.",
                ),
            ],
        ),
        credential_record(
            credential_key="audit-store-write-role",
            dependency_key="APPEND_ONLY_AUDIT_STORE",
            credential_kind="write_only_or_append_role",
            owner_actor="MACHINE",
            owning_subsystem="AuditAndEvidence",
            environment_scope=["sandbox", "staging", "production"],
            storage_boundary="SECRETS_MANAGER_OR_TOKEN_VAULT",
            rotation_or_renewal_rule="Rotate on store rollover or audit-path resegmentation.",
            usage_constraints=[
                "Append-only evidence writers should not share mutable control-store credentials.",
            ],
            source_refs=[
                task_source("pc_0050", "Provisioning the audit store creates dedicated credentials or service identities."),
            ],
        ),
        credential_record(
            credential_key="object-storage-service-role",
            dependency_key="OBJECT_STORAGE_AND_QUARANTINE_BUCKETS",
            credential_kind="service_role_or_access_key",
            owner_actor="MACHINE",
            owning_subsystem="ArtifactStorage",
            environment_scope=["sandbox", "staging", "production"],
            storage_boundary="SECRETS_MANAGER_OR_TOKEN_VAULT",
            rotation_or_renewal_rule="Rotate on bucket-policy or delivery-binding changes.",
            usage_constraints=[
                "Separate quarantine writers from general artifact readers where the platform allows.",
            ],
            source_refs=[
                task_source("pc_0051", "Object storage buckets create runtime access roles or keys."),
            ],
        ),
        credential_record(
            credential_key="broker-client-auth-credential",
            dependency_key="QUEUE_OR_BROKER_COORDINATION_FABRIC",
            credential_kind="broker_username_password_or_mtls_identity",
            owner_actor="MACHINE",
            owning_subsystem="AsyncRuntime",
            environment_scope=["sandbox", "staging", "production"],
            storage_boundary="SECRETS_MANAGER_OR_TOKEN_VAULT",
            rotation_or_renewal_rule="Rotate on broker-cluster rollover or credential expiry.",
            usage_constraints=[
                "Broker identities must never imply durable truth ownership by themselves.",
            ],
            source_refs=[
                task_source("pc_0052", "Provisioning a queue or broker creates client-auth material for workers and inbox/outbox adapters."),
            ],
        ),
        credential_record(
            credential_key="cache-auth-token-or-mtls-identity",
            dependency_key="CACHE_AND_STREAM_RESUME_STORE",
            credential_kind="cache_auth_identity",
            owner_actor="MACHINE",
            owning_subsystem="ReadModelDelivery",
            environment_scope=["sandbox", "staging", "production"],
            storage_boundary="SECRETS_MANAGER_OR_TOKEN_VAULT",
            rotation_or_renewal_rule="Rotate on cache-cluster lifecycle or tenant-partition resegmentation.",
            usage_constraints=[
                "Cache credentials do not grant access to raw authority tokens or immutable audit evidence.",
            ],
            source_refs=[
                task_source("pc_0053", "Provisioning cache and stream-resume state creates service identities."),
            ],
        ),
        credential_record(
            credential_key="otel-ingest-identity",
            dependency_key="OPENTELEMETRY_COLLECTION_AND_BACKEND",
            credential_kind="ingest_token_or_mtls_identity",
            owner_actor="MACHINE",
            owning_subsystem="Observability",
            environment_scope=["local-dev", "ci", "staging", "production"],
            storage_boundary="SECRETS_MANAGER_OR_TOKEN_VAULT",
            rotation_or_renewal_rule="Rotate with backend lifecycle changes or collector trust-boundary rollover.",
            usage_constraints=[
                "Telemetry ingest identities must respect the contract's access separation between operational, security, and privacy signals.",
            ],
            source_refs=[
                task_source("pc_0054", "Provisioning telemetry backends creates ingest credentials or collector trust identities."),
            ],
        ),
        credential_record(
            credential_key="registry-and-signing-material",
            dependency_key="CONTAINER_REGISTRY_BUILD_SIGNING_AND_ATTESTATION",
            credential_kind="registry_token_and_signing_key_ref",
            owner_actor="MACHINE",
            owning_subsystem="ReleaseEngineering",
            environment_scope=["ci", "staging", "production"],
            storage_boundary="SECRETS_MANAGER_OR_TOKEN_VAULT",
            rotation_or_renewal_rule="Rotate registry push credentials and signing-key references independently; preserve provenance history across rotations.",
            usage_constraints=[
                "Signing keys must remain rooted in the KMS/HSM boundary, not copied into CI runner disks.",
            ],
            source_refs=[
                task_source("pc_0055", "Registry, build-signing, and attestation services create delivery credentials and key references."),
                heading_source(
                    SECURITY_PATH,
                    "7. Supply-chain and build integrity",
                    "Signed artifacts and attestation are release-gate requirements.",
                ),
            ],
        ),
        credential_record(
            credential_key="dns-api-and-cert-automation-identity",
            dependency_key="DNS_TLS_WAF_AND_EDGE_DELIVERY",
            credential_kind="dns_api_token_and_tls_automation_identity",
            owner_actor="HUMAN_AND_MACHINE",
            owning_subsystem="PlatformNetworking",
            environment_scope=["ephemeral-review", "sandbox", "staging", "production"],
            storage_boundary="SECRETS_MANAGER_OR_TOKEN_VAULT",
            rotation_or_renewal_rule="Rotate on zone transfer, certificate-automation rollover, or ingress-provider change.",
            usage_constraints=[
                "Do not reuse DNS or certificate automation credentials as generic deployment credentials.",
            ],
            source_refs=[
                task_source("pc_0056", "DNS, TLS, WAF, and edge delivery provisioning creates domain-control and certificate-automation identities."),
            ],
        ),
        credential_record(
            credential_key="ci-runner-and-preview-deploy-token",
            dependency_key="CI_CD_RUNNERS_ENV_SECRETS_AND_EPHEMERAL_PREVIEW",
            credential_kind="runner_registration_and_deploy_tokens",
            owner_actor="HUMAN_AND_MACHINE",
            owning_subsystem="ReleaseEngineering",
            environment_scope=["ci", "ephemeral-review", "staging", "production"],
            storage_boundary="SECRETS_MANAGER_OR_TOKEN_VAULT",
            rotation_or_renewal_rule="Rotate on runner-image replacement, preview-platform rollover, or release-pipeline hardening changes.",
            usage_constraints=[
                "Ephemeral preview credentials must not implicitly grant access to live authority or production secret scopes.",
            ],
            source_refs=[
                task_source("pc_0057", "Runner registration and preview-account provisioning create deployment credentials."),
            ],
        ),
        credential_record(
            credential_key="apple-signing-certificate-and-notary-key",
            dependency_key="MACOS_CODE_SIGNING_NOTARIZATION_AND_KEYCHAIN_TRUST_CHAIN",
            credential_kind="signing_certificate_and_notary_api_key",
            owner_actor="HUMAN_AND_MACHINE",
            owning_subsystem="DesktopPlatform",
            environment_scope=["ci", "staging", "production"],
            storage_boundary="SECRETS_MANAGER_OR_TOKEN_VAULT",
            rotation_or_renewal_rule="Rotate on certificate expiry, Apple-account rollover, or notarization-boundary change.",
            usage_constraints=[
                "Desktop-signing material must remain outside general CI runner storage and outside product runtime data paths.",
            ],
            source_refs=[
                heading_source(
                    MACOS_BLUEPRINT_PATH,
                    "11. Security and runtime posture for the desktop client",
                    "Signed and notarized native delivery requires protected Apple-side signing material.",
                ),
            ],
        ),
        credential_record(
            credential_key="desktop-update-publishing-identity",
            dependency_key="DESKTOP_RELEASE_AND_UPDATE_CHANNEL",
            credential_kind="feed_signing_key_or_artifact_publisher_role",
            owner_actor="HUMAN_AND_MACHINE",
            owning_subsystem="DesktopPlatform",
            environment_scope=["staging", "production"],
            storage_boundary="SECRETS_MANAGER_OR_TOKEN_VAULT",
            rotation_or_renewal_rule="Rotate on channel rollover or emergency revocation exercises.",
            usage_constraints=[
                "Publishing identities must only release already signed and notarized artifacts.",
            ],
            source_refs=[
                text_source(
                    DEPLOYMENT_PATH,
                    "**Desktop release/update channel**",
                    "1. Reference runtime topology",
                    "The update channel is a separate publishing boundary with its own release trust.",
                ),
            ],
        ),
    ]


def build_browser_automation_matrix() -> dict[str, Any]:
    return {
        "workspace_rules": [
            {
                "rule_code": "STABLE_CALLBACK_HOST_REQUIRED",
                "description": "Authority and IdP callback setup should anchor to long-lived staging or production hostnames rather than ephemeral review URLs.",
            },
            {
                "rule_code": "MFA_OR_CAPTCHA_CHECKPOINT",
                "description": "When third-party portals demand MFA, CAPTCHA, or manual review, automation should capture evidence and stop rather than fake progress.",
            },
            {
                "rule_code": "VAULT_INJECTED_SECRETS_ONLY",
                "description": "Browser automation should consume vault-injected secrets or short-lived session material; it should not persist raw credentials in repo files.",
            },
        ],
        "environment_profiles": [
            {
                "environment": "local-dev",
                "recommended_use": [
                    "first-pass sandbox provisioning",
                    "manual checkpoint capture",
                    "callback flow debugging with tunnels or temporary hosts",
                ],
                "tooling": "headed Playwright with operator-attended sessions",
                "secret_source": "vault-synced local env or operator-injected short-lived secrets",
                "overall_feasibility": "SUPPORTED_WITH_MANUAL_CHECKPOINTS",
            },
            {
                "environment": "ci",
                "recommended_use": [
                    "repeatable smoke checks against already-provisioned sandboxes",
                    "non-interactive provider console drift detection where MFA is bypassed by service account",
                ],
                "tooling": "headless or virtual-display Playwright runners",
                "secret_source": "CI-injected short-lived vault material",
                "overall_feasibility": "LIMITED",
            },
            {
                "environment": "ephemeral-review",
                "recommended_use": [
                    "internal product smoke tests only",
                    "never the canonical target for provider callback registration",
                ],
                "tooling": "preview-host browser automation only when third-party host stability is irrelevant",
                "secret_source": "review-app secrets with strict scope limits",
                "overall_feasibility": "NOT_RECOMMENDED",
            },
            {
                "environment": "staging",
                "recommended_use": [
                    "primary host for stable callback registration",
                    "repeatable full provisioning smoke",
                    "authority and IdP console confirmation after production-like config changes",
                ],
                "tooling": "headed and headless Playwright against stable long-lived domains",
                "secret_source": "staging vault scopes and environment-specific service accounts",
                "overall_feasibility": "SUPPORTED",
            },
        ],
        "dependency_assessments": [
            {
                "dependency_key": "AUTHORITY_DEVELOPER_HUB_WORKSPACE",
                "local-dev": "SUPPORTED_WITH_MANUAL_CHECKPOINTS",
                "ci": "LIMITED",
                "ephemeral-review": "NOT_RECOMMENDED",
                "staging": "SUPPORTED_WITH_MANUAL_CHECKPOINTS",
                "blocking_classes": ["MFA_OR_CAPTCHA_CHECKPOINT"],
                "notes": [
                    "Provider portal sessions often require attended MFA at least once.",
                ],
            },
            {
                "dependency_key": "AUTHORITY_SANDBOX_APP_REGISTRATION",
                "local-dev": "SUPPORTED_WITH_MANUAL_CHECKPOINTS",
                "ci": "LIMITED",
                "ephemeral-review": "NOT_RECOMMENDED",
                "staging": "SUPPORTED_WITH_MANUAL_CHECKPOINTS",
                "blocking_classes": ["MFA_OR_CAPTCHA_CHECKPOINT"],
                "notes": [
                    "Use staging callback hosts where provider policy refuses loopback or tunnel URLs.",
                ],
            },
            {
                "dependency_key": "AUTHORITY_PRODUCTION_APP_REGISTRATION",
                "local-dev": "NOT_RECOMMENDED",
                "ci": "NOT_RECOMMENDED",
                "ephemeral-review": "NOT_RECOMMENDED",
                "staging": "SUPPORTED_WITH_MANUAL_CHECKPOINTS",
                "blocking_classes": ["MFA_OR_CAPTCHA_CHECKPOINT", "STABLE_CALLBACK_HOST_REQUIRED"],
                "notes": [
                    "Live provider registration typically requires stable corporate domains and human approval evidence.",
                ],
            },
            {
                "dependency_key": "AUTHORITY_REDIRECT_URI_CALLBACK_AND_SCOPE_CONFIGURATION",
                "local-dev": "LIMITED",
                "ci": "LIMITED",
                "ephemeral-review": "NOT_RECOMMENDED",
                "staging": "SUPPORTED",
                "blocking_classes": ["STABLE_CALLBACK_HOST_REQUIRED"],
                "notes": [
                    "Callback hostnames should be anchored to long-lived staging or production domains.",
                ],
            },
            {
                "dependency_key": "IDP_TENANT_AND_APPLICATION_CLIENTS",
                "local-dev": "SUPPORTED_WITH_MANUAL_CHECKPOINTS",
                "ci": "LIMITED",
                "ephemeral-review": "LIMITED",
                "staging": "SUPPORTED",
                "blocking_classes": ["MFA_OR_CAPTCHA_CHECKPOINT"],
                "notes": [
                    "Many IdPs allow API-based client management after first-time tenant bootstrap.",
                ],
            },
            {
                "dependency_key": "EMAIL_DELIVERY_PROVIDER_ACCOUNT_AND_SENDER_DOMAIN",
                "local-dev": "LIMITED",
                "ci": "NOT_RECOMMENDED",
                "ephemeral-review": "NOT_RECOMMENDED",
                "staging": "SUPPORTED_WITH_MANUAL_CHECKPOINTS",
                "blocking_classes": ["STABLE_CALLBACK_HOST_REQUIRED"],
                "notes": [
                    "Sender-domain proof and DNS ownership make staging the primary automation target.",
                ],
            },
            {
                "dependency_key": "EMAIL_TEMPLATE_WEBHOOK_AND_CALLBACK_CONFIGURATION",
                "local-dev": "LIMITED",
                "ci": "LIMITED",
                "ephemeral-review": "NOT_RECOMMENDED",
                "staging": "SUPPORTED",
                "blocking_classes": ["STABLE_CALLBACK_HOST_REQUIRED"],
                "notes": [
                    "Webhook verification is easiest once staging callback hosts are stable.",
                ],
            },
            {
                "dependency_key": "PUSH_NOTIFICATION_OR_DEVICE_MESSAGING_PROJECT",
                "local-dev": "LIMITED",
                "ci": "NOT_RECOMMENDED",
                "ephemeral-review": "NOT_RECOMMENDED",
                "staging": "SUPPORTED_WITH_MANUAL_CHECKPOINTS",
                "blocking_classes": ["MFA_OR_CAPTCHA_CHECKPOINT"],
                "notes": [
                    "Treat push credential setup as embodiment-conditional rather than universally required.",
                ],
            },
            {
                "dependency_key": "SUPPLEMENTAL_ERROR_MONITORING_WORKSPACE",
                "local-dev": "SUPPORTED",
                "ci": "SUPPORTED",
                "ephemeral-review": "SUPPORTED",
                "staging": "SUPPORTED",
                "blocking_classes": [],
                "notes": [
                    "This is one of the easiest external provisioning targets to automate end to end.",
                ],
            },
            {
                "dependency_key": "HELPDESK_OR_OPERATOR_ASSIST_INTEGRATION",
                "local-dev": "SUPPORTED_WITH_MANUAL_CHECKPOINTS",
                "ci": "LIMITED",
                "ephemeral-review": "NOT_RECOMMENDED",
                "staging": "SUPPORTED_WITH_MANUAL_CHECKPOINTS",
                "blocking_classes": ["MFA_OR_CAPTCHA_CHECKPOINT"],
                "notes": [
                    "Support platforms often require attended setup and data-governance review.",
                ],
            },
            {
                "dependency_key": "OCR_DOCUMENT_EXTRACTION_CAPABILITY",
                "local-dev": "SUPPORTED",
                "ci": "SUPPORTED",
                "ephemeral-review": "LIMITED",
                "staging": "SUPPORTED",
                "blocking_classes": [],
                "notes": [
                    "Managed OCR services can be smoke-tested from CI once credentials exist; preview hosts are useful only when the callback or ingress model does not require stable domains.",
                ],
            },
            {
                "dependency_key": "MALWARE_SCANNING_AND_QUARANTINE_CAPABILITY",
                "local-dev": "SUPPORTED",
                "ci": "SUPPORTED",
                "ephemeral-review": "LIMITED",
                "staging": "SUPPORTED",
                "blocking_classes": [],
                "notes": [
                    "Managed or self-hosted scanners are both amenable to CI smoke once object storage hooks are stable.",
                ],
            },
        ],
    }


def build_mermaid(rows: list[dict[str, Any]]) -> str:
    lines = [
        "flowchart TD",
        '  env["Environment / tenant / authority profile matrix"]',
        '  browser["Browser automation workspace"]',
        '  vault["Secrets manager / token vault"]',
        '  kms["KMS / HSM root of trust"]',
        '  db["Primary transactional control store"]',
        '  audit["Append-only audit store"]',
        '  object["Object storage / quarantine"]',
        '  queue["Queue / broker"]',
        '  cache["Cache / stream resume store"]',
        '  otel["OpenTelemetry backend"]',
        '  registry["Registry / signing / attestation"]',
        '  edge["DNS / TLS / WAF / edge"]',
        '  cicd["CI/CD runners / preview"]',
        '  authHub["Authority developer hub"]',
        '  authSandbox["Authority sandbox app"]',
        '  authProd["Authority production app"]',
        '  authConfig["Authority callbacks / scopes"]',
        '  fraud["Fraud-prevention bindings"]',
        '  authority["Authority API provider interface"]',
        '  idp["External identity provider"]',
        '  idpClients["IdP tenant / app clients"]',
        '  idpPolicies["IdP roles / MFA / sessions"]',
        '  email["Email provider"]',
        '  emailConfig["Email templates / callbacks"]',
        '  push["Push / device messaging"]',
        '  errorMon["Optional error monitoring"]',
        '  helpdesk["Optional helpdesk integration"]',
        '  ocr["Optional OCR capability"]',
        '  malware["Malware scanning / quarantine"]',
        '  macsign["macOS signing / notarization"]',
        '  updates["Desktop release / update channel"]',
        '  internalApi["Internal northbound command / session APIs"]',
        '  internalReads["Internal read models / streams / uploads"]',
        "  kms --> vault",
        "  kms --> db",
        "  kms --> audit",
        "  kms --> object",
        "  kms --> registry",
        "  kms --> macsign",
        "  env --> browser",
        "  env --> edge",
        "  env --> idp",
        "  env --> authHub",
        "  browser --> authHub",
        "  authHub --> authSandbox",
        "  authHub --> authProd",
        "  authSandbox --> authConfig",
        "  authProd --> authConfig",
        "  authConfig --> fraud",
        "  vault --> authSandbox",
        "  vault --> authProd",
        "  vault --> authority",
        "  fraud --> authority",
        "  authConfig --> authority",
        "  edge --> authority",
        "  vault --> idp",
        "  idp --> idpClients",
        "  browser --> idpClients",
        "  vault --> idpClients",
        "  idpClients --> idpPolicies",
        "  browser --> email",
        "  edge --> email",
        "  vault --> email",
        "  email --> emailConfig",
        "  edge --> emailConfig",
        "  vault --> emailConfig",
        "  browser --> push",
        "  vault --> push",
        "  otel --> errorMon",
        "  vault --> errorMon",
        "  browser --> helpdesk",
        "  vault --> helpdesk",
        "  object --> ocr",
        "  vault --> ocr",
        "  object --> malware",
        "  queue --> malware",
        "  vault --> malware",
        "  registry --> cicd",
        "  vault --> cicd",
        "  edge --> cicd",
        "  cicd --> macsign",
        "  macsign --> updates",
        "  object --> updates",
        "  edge --> updates",
        "  cicd --> updates",
        "  db --> queue",
        "  db --> cache",
        "  db --> internalApi",
        "  cache --> internalApi",
        "  idpPolicies --> internalApi",
        "  db --> internalReads",
        "  object --> internalReads",
        "  queue --> internalReads",
        "  cache --> internalReads",
        "  malware --> internalReads",
    ]
    lines.extend(
        [
            "  classDef internal fill:#ECEFF4,stroke:#4C566A,color:#2E3440;",
            "  classDef optional fill:#FFF4D6,stroke:#B7791F,color:#744210;",
            "  classDef explicit fill:#E6FFFA,stroke:#2C7A7B,color:#234E52;",
            "  classDef implied fill:#EBF8FF,stroke:#3182CE,color:#2A4365;",
            "  class internalApi,internalReads internal;",
            "  class errorMon,helpdesk,ocr optional;",
            "  class authority,idp,malware,vault,kms,db,audit,object,queue,cache,otel,registry,macsign,updates explicit;",
            "  class env,browser,authHub,authSandbox,authProd,authConfig,fraud,idpClients,idpPolicies,email,emailConfig,push,edge,cicd implied;",
        ]
    )
    return "\n".join(lines) + "\n"


def build_dag(rows: list[dict[str, Any]]) -> dict[str, Any]:
    node_keys = [row["dependency_key"] for row in rows]
    edges: list[dict[str, str]] = []
    row_map = {row["dependency_key"]: row for row in rows}
    for row in rows:
        for prerequisite in row["provisioning_prerequisites"]:
            edges.append(
                {
                    "from": prerequisite,
                    "to": row["dependency_key"],
                    "reason": f"{row['dependency_key']} depends on {prerequisite} to satisfy {row['purpose']}",
                }
            )
    layers = topo_layers(node_keys, edges)
    return {
        "nodes": [
            {
                "dependency_key": row["dependency_key"],
                "classification": row["classification"],
                "mvp_requirement": row["mvp_requirement"],
                "owning_subsystem": row["owning_subsystem"],
                "automation_feasibility": row["automation_feasibility"],
                "provisionable": row["classification"] != "INTERNAL_ONLY",
            }
            for row in rows
        ],
        "edges": edges,
        "parallelizable_layers": layers,
        "roots": layers[0],
        "internal_only_leaf_nodes": [
            row["dependency_key"] for row in rows if row["classification"] == "INTERNAL_ONLY"
        ],
        "adr_required_dependency_keys": [
            row["dependency_key"] for row in rows if row["adr_or_procurement_needed"]
        ],
        "manual_checkpoint_dependency_keys": [
            row["dependency_key"]
            for row in rows
            if row["automation_feasibility"] == "PARTIALLY_AUTOMATABLE_WITH_MANUAL_CHECKPOINTS"
            or row["automation_feasibility"] == "MANUAL_OR_PROCUREMENT_GATED"
        ],
        "node_purposes": {key: row_map[key]["purpose"] for key in node_keys},
    }


def write_source_matrix(rows: list[dict[str, Any]]) -> None:
    fieldnames = [
        "dependency_key",
        "classification",
        "capability_category",
        "source_file",
        "source_heading_or_logical_block",
        "source_ref",
        "rationale",
    ]
    SOURCE_MATRIX_CSV_PATH.parent.mkdir(parents=True, exist_ok=True)
    with SOURCE_MATRIX_CSV_PATH.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            for ref in row["source_refs"]:
                writer.writerow(
                    {
                        "dependency_key": row["dependency_key"],
                        "classification": row["classification"],
                        "capability_category": row["capability_category"],
                        "source_file": ref["source_file"],
                        "source_heading_or_logical_block": ref["source_heading_or_logical_block"],
                        "source_ref": ref["source_ref"],
                        "rationale": ref["rationale"],
                    }
                )


def build_classification_summary(rows: list[dict[str, Any]], credentials: list[dict[str, Any]], dag: dict[str, Any]) -> dict[str, Any]:
    classification_counts = Counter(row["classification"] for row in rows)
    owner_counts = Counter(row["owning_subsystem"] for row in rows)
    mvp_counts = Counter(row["mvp_requirement"] for row in rows)
    return {
        "summary": {
            "dependency_count": len(rows),
            "credential_record_count": len(credentials),
            "classification_counts": dict(sorted(classification_counts.items())),
            "owning_subsystem_counts": dict(sorted(owner_counts.items())),
            "mvp_requirement_counts": dict(sorted(mvp_counts.items())),
            "adr_or_procurement_needed_count": sum(1 for row in rows if row["adr_or_procurement_needed"]),
        },
        "dependency_rows": [
            {
                "dependency_key": row["dependency_key"],
                "classification": row["classification"],
                "classification_rationale": row["classification_rationale"],
                "owning_subsystem": row["owning_subsystem"],
                "mvp_requirement": row["mvp_requirement"],
                "decision_status": row["decision_status"],
                "adr_or_procurement_needed": row["adr_or_procurement_needed"],
                "needs_credentials_or_secrets": row["needs_credentials_or_secrets"],
                "automation_feasibility": row["automation_feasibility"],
                "primary_source": {
                    "source_file": row["source_file"],
                    "source_heading_or_logical_block": row["source_heading_or_logical_block"],
                    "source_ref": row["source_ref"],
                },
            }
            for row in rows
        ],
        "internal_only_keys": [row["dependency_key"] for row in rows if row["classification"] == "INTERNAL_ONLY"],
        "vendor_or_platform_choice_keys": [
            row["dependency_key"] for row in rows if row["adr_or_procurement_needed"]
        ],
        "provisioning_root_keys": dag["roots"],
    }


def build_register_payload(rows: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "register_version": "1.0",
        "dependency_count": len(rows),
        "dependencies": rows,
    }


def build_credentials_payload(credentials: list[dict[str, Any]]) -> dict[str, Any]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for record in credentials:
        grouped[record["dependency_key"]].append(record)
    return {
        "credential_record_count": len(credentials),
        "dependencies_with_credentials": len(grouped),
        "credential_records": credentials,
        "credential_records_by_dependency": dict(sorted(grouped.items())),
    }


def write_register_doc(rows: list[dict[str, Any]], credentials: list[dict[str, Any]]) -> None:
    classification_counts = Counter(row["classification"] for row in rows)
    credential_dependency_count = len({record["dependency_key"] for record in credentials})
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        grouped[row["classification"]].append(row)

    sections = [
        "# External Services, APIs, and Control-Plane Dependencies",
        "",
        "This pack closes the corpus gap where capability requirements, third-party control planes, and internal-only northbound APIs were previously scattered across runtime, security, authority, and roadmap materials.",
        "",
        "## Summary",
        "",
        f"- Total dependency rows: `{len(rows)}`",
        f"- `ALGORITHM_EXPLICIT`: `{classification_counts['ALGORITHM_EXPLICIT']}`",
        f"- `ROADMAP_IMPLIED`: `{classification_counts['ROADMAP_IMPLIED']}`",
        f"- `OPTIONAL_VENDOR_SELECTED`: `{classification_counts['OPTIONAL_VENDOR_SELECTED']}`",
        f"- `INTERNAL_ONLY`: `{classification_counts['INTERNAL_ONLY']}`",
        f"- Dependencies with governed credentials or secrets: `{credential_dependency_count}`",
        "",
        "## Classification Law",
        "",
        "- `ALGORITHM_EXPLICIT`: the corpus names the capability boundary directly.",
        "- `ROADMAP_IMPLIED`: the provisioning checklist turns a real control-plane prerequisite into a concrete setup task.",
        "- `OPTIONAL_VENDOR_SELECTED`: the roadmap or corpus allows the capability to be selected or omitted depending on embodiment or procurement.",
        "- `INTERNAL_ONLY`: the surface is part of Taxat's own product API and must not be mistaken for a third-party dependency.",
        "",
    ]

    classification_titles = {
        "ALGORITHM_EXPLICIT": "Algorithm-Explicit Capabilities",
        "ROADMAP_IMPLIED": "Roadmap-Implied Provisioning Surfaces",
        "OPTIONAL_VENDOR_SELECTED": "Optional or Vendor-Selected Dependencies",
        "INTERNAL_ONLY": "Internal-Only Surfaces That Must Stay Out of External Procurement",
    }
    for classification in CLASSIFICATIONS:
        rows_for_class = grouped[classification]
        sections.extend(
            [
                f"## {classification_titles[classification]}",
                "",
                markdown_table(
                    ["Dependency", "Category", "MVP", "Owner", "Automation", "Candidate Service Types"],
                    [
                        [
                            row["dependency_key"],
                            row["capability_category"],
                            row["mvp_requirement"],
                            row["owning_subsystem"],
                            row["automation_feasibility"],
                            row["candidate_service_types"],
                        ]
                        for row in rows_for_class
                    ],
                ),
                "",
            ]
        )

    sections.extend(
        [
            "## Critical Distinctions",
            "",
            "- Sandbox and production authority registrations are modeled separately. The provider environment is frozen in authority bindings, so later automation must not collapse live and non-live credentials into one record.",
            "- Malware scanning is capability-mandatory because uploads cannot become downloadable or customer-visible until scan posture is explicit. The vendor remains open; the capability does not.",
            "- OCR remains optional and pluggable. The corpus hardens OCR-like connectors when present but does not make them part of the core invention boundary.",
            "- OpenTelemetry collection and backends are mandatory runtime capabilities. A branded error-monitoring workspace is only an optional overlay on top of that baseline.",
            "- Northbound command APIs, read models, stream endpoints, and upload-session surfaces are `INTERNAL_ONLY` and should not appear in vendor procurement or external dependency acquisition plans.",
            "",
            "## Open ADR or Procurement Queue",
            "",
            markdown_table(
                ["Dependency", "Decision Status", "Reason"],
                [
                    [
                        row["dependency_key"],
                        row["decision_status"],
                        row["classification_rationale"],
                    ]
                    for row in rows
                    if row["adr_or_procurement_needed"]
                ],
            ),
            "",
            "## Source Quality Notes",
            "",
            "- The card references `shared_operating_contract_0014_to_0021.md`, but that shared file is not present in the repository. This register therefore grounds itself directly in the named algorithm contracts and the checklist task block.",
            "- The dependency register deliberately keeps vendor names out of the normative rows. Later ADR work can bind these capabilities to a concrete stack without changing the source-grounded classification law.",
            "",
        ]
    )

    text_write(REGISTER_DOC_PATH, "\n".join(sections))


def write_provisioning_doc(rows: list[dict[str, Any]], dag: dict[str, Any], browser_matrix: dict[str, Any]) -> None:
    sections = [
        "# Provisioning Feasibility and Browser Automation Strategy",
        "",
        "This document turns the dependency register into a machine-followable provisioning order and an environment-specific browser automation posture.",
        "",
        "## Provisioning DAG Layers",
        "",
    ]
    for index, layer in enumerate(dag["parallelizable_layers"]):
        sections.extend(
            [
                f"### Layer {index}",
                "",
                markdown_table(
                    ["Dependency", "Classification", "Owner", "Why It Lives Here"],
                    [
                        [
                            dependency_key,
                            next(row["classification"] for row in rows if row["dependency_key"] == dependency_key),
                            next(row["owning_subsystem"] for row in rows if row["dependency_key"] == dependency_key),
                            dag["node_purposes"][dependency_key],
                        ]
                        for dependency_key in layer
                    ],
                ),
                "",
            ]
        )

    sections.extend(
        [
            "## Browser Automation Environment Profiles",
            "",
            markdown_table(
                ["Environment", "Overall Feasibility", "Tooling", "Secret Source", "Recommended Use"],
                [
                    [
                        profile["environment"],
                        profile["overall_feasibility"],
                        profile["tooling"],
                        profile["secret_source"],
                        profile["recommended_use"],
                    ]
                    for profile in browser_matrix["environment_profiles"]
                ],
            ),
            "",
            "## Dependency-Specific Browser Automation Feasibility",
            "",
            markdown_table(
                ["Dependency", "Local Dev", "CI", "Ephemeral Review", "Staging", "Blocking Classes"],
                [
                    [
                        item["dependency_key"],
                        item["local-dev"],
                        item["ci"],
                        item["ephemeral-review"],
                        item["staging"],
                        item["blocking_classes"],
                    ]
                    for item in browser_matrix["dependency_assessments"]
                ],
            ),
            "",
            "## Practical Automation Rules",
            "",
            "- Use `staging` as the canonical host for authority and IdP callback registrations. It is the only listed environment that is both stable and safely non-production.",
            "- Treat `ephemeral-review` as unsuitable for third-party callback registration. Review environments are for internal smoke and UI verification, not authority-control-plane truth.",
            "- When a provider console forces MFA, CAPTCHA, or human review, stop and capture evidence instead of forcing a partial automation through brittle hacks.",
            "- Vault-injected secrets or short-lived sessions are the only acceptable inputs for automation. Browser profiles may persist transient state but must not become the source of truth for raw credentials.",
            "",
            "## Parallelization Notes",
            "",
            "- Storage, queue, cache, observability, and key-management infrastructure can be provisioned largely in parallel after the environment matrix is frozen.",
            "- Authority, IdP, email, and support integrations share browser-automation and secret-boundary prerequisites but can fan out once those prerequisites exist.",
            "- macOS signing and the desktop update channel stay late in the DAG because they depend on CI, key custody, and distribution hosts.",
            "- Internal northbound APIs appear as downstream consumers in the DAG only to make clear what external prerequisites they rely on; they are not third-party procurement items.",
            "",
            "## Remaining Decision Pressure",
            "",
            markdown_table(
                ["Dependency", "Why Decision Is Still Open"],
                [
                    [row["dependency_key"], row["classification_rationale"]]
                    for row in rows
                    if row["adr_or_procurement_needed"]
                ],
            ),
            "",
        ]
    )

    text_write(PROVISIONING_DOC_PATH, "\n".join(sections))


def validate_browser_matrix(browser_matrix: dict[str, Any], rows: list[dict[str, Any]]) -> None:
    dependency_keys = {row["dependency_key"] for row in rows}
    expected_envs = {"local-dev", "ci", "ephemeral-review", "staging"}
    seen_envs = {profile["environment"] for profile in browser_matrix["environment_profiles"]}
    if seen_envs != expected_envs:
        raise ValueError(f"Browser automation environment coverage mismatch: {seen_envs}")

    for assessment in browser_matrix["dependency_assessments"]:
        if assessment["dependency_key"] not in dependency_keys:
            raise ValueError(f"Unknown dependency in browser matrix: {assessment['dependency_key']}")
        for env in expected_envs:
            status = assessment[env]
            if status not in BROWSER_AUTOMATION_STATUS_VALUES:
                raise ValueError(f"Invalid browser automation status `{status}` for {assessment['dependency_key']}:{env}")


def validate_dag(dag: dict[str, Any], rows: list[dict[str, Any]]) -> None:
    dependency_keys = {row["dependency_key"] for row in rows}
    dag_nodes = {node["dependency_key"] for node in dag["nodes"]}
    if dag_nodes != dependency_keys:
        raise ValueError("DAG nodes do not match dependency rows")
    topo_layers([node["dependency_key"] for node in dag["nodes"]], dag["edges"])
    for edge in dag["edges"]:
        if edge["from"] not in dependency_keys or edge["to"] not in dependency_keys:
            raise ValueError(f"Invalid DAG edge {edge}")
        if not edge["reason"]:
            raise ValueError(f"DAG edge missing reason: {edge}")


def main() -> None:
    rows = build_rows()
    validate_rows(rows)

    credentials = build_credential_inventory()
    validate_credentials(rows, credentials)

    browser_matrix = build_browser_automation_matrix()
    validate_browser_matrix(browser_matrix, rows)

    dag = build_dag(rows)
    validate_dag(dag, rows)

    register_payload = build_register_payload(rows)
    classification_payload = build_classification_summary(rows, credentials, dag)
    credential_payload = build_credentials_payload(credentials)

    json_write(REGISTER_JSON_PATH, register_payload)
    write_source_matrix(rows)
    json_write(CLASSIFICATION_JSON_PATH, classification_payload)
    json_write(CREDENTIALS_JSON_PATH, credential_payload)
    json_write(DAG_JSON_PATH, dag)
    json_write(BROWSER_MATRIX_JSON_PATH, browser_matrix)
    text_write(MERMAID_PATH, build_mermaid(rows))
    write_register_doc(rows, credentials)
    write_provisioning_doc(rows, dag, browser_matrix)

    print(
        json.dumps(
            {
                "status": "PASS",
                "dependency_count": len(rows),
                "credential_record_count": len(credentials),
                "dag_layer_count": len(dag["parallelizable_layers"]),
                "browser_matrix_dependency_count": len(browser_matrix["dependency_assessments"]),
            },
            indent=2,
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()
