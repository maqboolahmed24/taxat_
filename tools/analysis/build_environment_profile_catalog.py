#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import urllib.error
import urllib.request
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[2]
ALGORITHM_DIR = ROOT / "Algorithm"
PROMPT_DIR = ROOT / "PROMPT"
DATA_ANALYSIS_DIR = ROOT / "data" / "analysis"
DOCS_ANALYSIS_DIR = ROOT / "docs" / "analysis"
DIAGRAMS_ANALYSIS_DIR = ROOT / "diagrams" / "analysis"

CHECKLIST_PATH = PROMPT_DIR / "Checklist.md"
CARD_PATH = PROMPT_DIR / "CARDS" / "pc_0031.md"

MANIFEST_FREEZE_PATH = ALGORITHM_DIR / "manifest_and_config_freeze_contract.md"
REPLAY_PATH = ALGORITHM_DIR / "replay_and_reproducibility_contract.md"
RELEASE_IDENTITY_PATH = (
    ALGORITHM_DIR / "release_candidate_identity_and_promotion_evidence_contract.md"
)
RELEASE_GATES_PATH = ALGORITHM_DIR / "verification_and_release_gates.md"
DEPLOYMENT_PATH = ALGORITHM_DIR / "deployment_and_resilience_contract.md"
AUTHORITY_PATH = ALGORITHM_DIR / "authority_interaction_protocol.md"
ACTOR_MODEL_PATH = ALGORITHM_DIR / "actor_and_authority_model.md"
CONNECTOR_PATH = ALGORITHM_DIR / "connector_delegation_contract.md"
NORTHBOUND_PATH = ALGORITHM_DIR / "northbound_api_and_session_contract.md"
SECURITY_PATH = ALGORITHM_DIR / "security_and_runtime_hardening_contract.md"
DATA_MODEL_PATH = ALGORITHM_DIR / "data_model.md"

DEPENDENCY_REGISTER_PATH = DATA_ANALYSIS_DIR / "dependency_register.json"
AUTHORITY_BOUNDARY_PATH = DATA_ANALYSIS_DIR / "authority_boundary_responsibility_matrix.json"
AUTHORITY_OPERATION_MAP_PATH = (
    DATA_ANALYSIS_DIR / "authority_operation_to_boundary_map.json"
)
AUTHORITY_OPERATION_CATALOG_PATH = DATA_ANALYSIS_DIR / "authority_operation_catalog.json"
SESSION_FLOW_MATRIX_PATH = DATA_ANALYSIS_DIR / "session_flow_matrix.json"
RELEASE_ARTIFACT_MATRIX_PATH = DATA_ANALYSIS_DIR / "release_evidence_artifact_matrix.json"
TASK_DOD_MATRIX_PATH = DATA_ANALYSIS_DIR / "task_definition_of_done_matrix.json"

ENVIRONMENT_CATALOG_PATH = DATA_ANALYSIS_DIR / "environment_catalog.json"
DEPLOYABLE_MATRIX_PATH = DATA_ANALYSIS_DIR / "deployable_environment_matrix.json"
TENANT_MATRIX_PATH = DATA_ANALYSIS_DIR / "tenant_inventory_and_purpose_matrix.json"
PROFILE_CATALOG_PATH = DATA_ANALYSIS_DIR / "authority_provider_profile_catalog.json"
OPERATION_PROFILE_MATRIX_PATH = (
    DATA_ANALYSIS_DIR / "authority_operation_family_to_profile_matrix.json"
)
DOMAIN_MATRIX_PATH = DATA_ANALYSIS_DIR / "environment_domain_dns_callback_matrix.json"
SECRET_NAMESPACE_PATH = DATA_ANALYSIS_DIR / "environment_secret_namespace_plan.json"
TEST_USER_PLAN_PATH = DATA_ANALYSIS_DIR / "environment_test_user_and_seed_data_plan.json"
PROVIDER_VERSION_PATH = DATA_ANALYSIS_DIR / "provider_api_version_inventory.json"

DOC_CATALOG_PATH = (
    DOCS_ANALYSIS_DIR / "31_environment_tenant_authority_profile_catalog.md"
)
DOC_SEPARATION_PATH = (
    DOCS_ANALYSIS_DIR / "31_environment_promotion_and_data_separation_rules.md"
)
MERMAID_PATH = (
    DIAGRAMS_ANALYSIS_DIR / "31_environment_tenant_authority_profile_topology.mmd"
)

TODAY = "2026-04-18"
CONTRACT_VERSION = "1.0"
HMRC_TIMEOUT_SECONDS = 20

HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)$")
CHECKLIST_ITEM_RE = re.compile(r"^\s*-\s+\[[ X-]\]\s+`(?P<task>pc_\d{4})`\s+(?P<slug>.+?)\s*$")

CURRENT_VERSION_RE = re.compile(
    r'id="currentVersion">.*?Version\s*([0-9.]+)\s*-\s*([^<\s]+)',
    re.IGNORECASE | re.DOTALL,
)
LAST_UPDATED_RE = re.compile(r'id="lastUpdated">\s*([^<]+?)\s*</td>', re.IGNORECASE | re.DOTALL)
SANDBOX_BASE_RE = re.compile(
    r'id="subordinateUrl">\s*(https://[^<\s]+)\s*</td>',
    re.IGNORECASE | re.DOTALL,
)
PRODUCTION_BASE_RE = re.compile(
    r'id="principalUrl">\s*(https://[^<\s]+)\s*</td>',
    re.IGNORECASE | re.DOTALL,
)
OAS_VERSION_RE = re.compile(r"info:\s+version:\s*\"([0-9.]+)\"", re.DOTALL)
AUTH_URL_RE = re.compile(r"authorizationUrl:\s*(\S+)")
TOKEN_URL_RE = re.compile(r"tokenUrl:\s*(\S+)")
REFRESH_URL_RE = re.compile(r"refreshUrl:\s*(\S+)")
SCOPE_RE = re.compile(r"((?:read|write):self-assessment)\s*:")

REQUIRED_OPERATION_FAMILIES = [
    "AUTH_READ_REFERENCE",
    "AUTH_READ_OBLIGATIONS",
    "AUTH_READ_CALCULATION",
    "AUTH_CREATE_OR_AMEND_DATA",
    "AUTH_DELETE_DATA",
    "AUTH_TRIGGER_CALCULATION",
    "AUTH_SUBMIT_FINAL_DECLARATION",
    "AUTH_SUBMIT_PERIODIC_UPDATE",
    "AUTH_SUBMIT_POST_FINALISATION_AMENDMENT",
    "AUTH_RECONCILE_STATUS",
]

ENVIRONMENT_ORDER = [
    "env_local_authoring",
    "env_local_provisioning_workstation",
    "env_ci_ephemeral_validation",
    "env_ephemeral_review_preview",
    "env_shared_sandbox_integration",
    "env_preproduction_verification",
    "env_production",
    "env_disaster_recovery_drill",
]

PROFILE_ENVIRONMENT_ORDER = [
    "env_shared_sandbox_integration",
    "env_preproduction_verification",
    "env_production",
]

CONNECTION_METHOD_ORDER = [
    "WEB_APP_VIA_SERVER",
    "DESKTOP_APP_VIA_SERVER",
    "BATCH_PROCESS_DIRECT",
]

HMRC_API_DEFS = [
    {
        "api_key": "business_details",
        "display_name": "Business Details (MTD)",
        "service_slug": "business-details-api",
        "expected_version": "2.0",
        "product_chain_ref": "chain_hmrc_income_tax_mtd_business_details",
        "operation_families": ["AUTH_READ_REFERENCE"],
    },
    {
        "api_key": "obligations",
        "display_name": "Obligations (MTD)",
        "service_slug": "obligations-api",
        "expected_version": "3.0",
        "product_chain_ref": "chain_hmrc_income_tax_mtd_obligations",
        "operation_families": ["AUTH_READ_OBLIGATIONS"],
    },
    {
        "api_key": "individual_calculations",
        "display_name": "Individual Calculations (MTD)",
        "service_slug": "individual-calculations-api",
        "expected_version": "8.0",
        "product_chain_ref": "chain_hmrc_income_tax_mtd_individual_calculations",
        "operation_families": [
            "AUTH_READ_CALCULATION",
            "AUTH_TRIGGER_CALCULATION",
            "AUTH_SUBMIT_FINAL_DECLARATION",
            "AUTH_RECONCILE_STATUS",
        ],
    },
    {
        "api_key": "self_employment_business",
        "display_name": "Self Employment Business (MTD)",
        "service_slug": "self-employment-business-api",
        "expected_version": "5.0",
        "product_chain_ref": "chain_hmrc_income_tax_mtd_self_employment_business",
        "operation_families": [
            "AUTH_CREATE_OR_AMEND_DATA",
            "AUTH_DELETE_DATA",
            "AUTH_SUBMIT_PERIODIC_UPDATE",
            "AUTH_SUBMIT_POST_FINALISATION_AMENDMENT",
            "AUTH_RECONCILE_STATUS",
        ],
    },
    {
        "api_key": "property_business",
        "display_name": "Property Business (MTD)",
        "service_slug": "property-business-api",
        "expected_version": "6.0",
        "product_chain_ref": "chain_hmrc_income_tax_mtd_property_business",
        "operation_families": [
            "AUTH_CREATE_OR_AMEND_DATA",
            "AUTH_DELETE_DATA",
            "AUTH_SUBMIT_PERIODIC_UPDATE",
            "AUTH_SUBMIT_POST_FINALISATION_AMENDMENT",
            "AUTH_RECONCILE_STATUS",
        ],
    },
]

OPERATION_FAMILIES_BY_API_AND_METHOD = {
    "business_details": {
        "WEB_APP_VIA_SERVER": ["AUTH_READ_REFERENCE"],
        "DESKTOP_APP_VIA_SERVER": ["AUTH_READ_REFERENCE"],
        "BATCH_PROCESS_DIRECT": ["AUTH_READ_REFERENCE", "AUTH_RECONCILE_STATUS"],
    },
    "obligations": {
        "WEB_APP_VIA_SERVER": ["AUTH_READ_OBLIGATIONS"],
        "DESKTOP_APP_VIA_SERVER": ["AUTH_READ_OBLIGATIONS"],
        "BATCH_PROCESS_DIRECT": ["AUTH_READ_OBLIGATIONS", "AUTH_RECONCILE_STATUS"],
    },
    "individual_calculations": {
        "WEB_APP_VIA_SERVER": [
            "AUTH_READ_CALCULATION",
            "AUTH_TRIGGER_CALCULATION",
            "AUTH_SUBMIT_FINAL_DECLARATION",
            "AUTH_RECONCILE_STATUS",
        ],
        "DESKTOP_APP_VIA_SERVER": [
            "AUTH_READ_CALCULATION",
            "AUTH_TRIGGER_CALCULATION",
            "AUTH_SUBMIT_FINAL_DECLARATION",
            "AUTH_RECONCILE_STATUS",
        ],
        "BATCH_PROCESS_DIRECT": ["AUTH_READ_CALCULATION", "AUTH_RECONCILE_STATUS"],
    },
    "self_employment_business": {
        "WEB_APP_VIA_SERVER": [
            "AUTH_CREATE_OR_AMEND_DATA",
            "AUTH_DELETE_DATA",
            "AUTH_SUBMIT_PERIODIC_UPDATE",
            "AUTH_SUBMIT_POST_FINALISATION_AMENDMENT",
            "AUTH_RECONCILE_STATUS",
        ],
        "DESKTOP_APP_VIA_SERVER": [
            "AUTH_CREATE_OR_AMEND_DATA",
            "AUTH_DELETE_DATA",
            "AUTH_SUBMIT_PERIODIC_UPDATE",
            "AUTH_SUBMIT_POST_FINALISATION_AMENDMENT",
            "AUTH_RECONCILE_STATUS",
        ],
        "BATCH_PROCESS_DIRECT": ["AUTH_RECONCILE_STATUS"],
    },
    "property_business": {
        "WEB_APP_VIA_SERVER": [
            "AUTH_CREATE_OR_AMEND_DATA",
            "AUTH_DELETE_DATA",
            "AUTH_SUBMIT_PERIODIC_UPDATE",
            "AUTH_SUBMIT_POST_FINALISATION_AMENDMENT",
            "AUTH_RECONCILE_STATUS",
        ],
        "DESKTOP_APP_VIA_SERVER": [
            "AUTH_CREATE_OR_AMEND_DATA",
            "AUTH_DELETE_DATA",
            "AUTH_SUBMIT_PERIODIC_UPDATE",
            "AUTH_SUBMIT_POST_FINALISATION_AMENDMENT",
            "AUTH_RECONCILE_STATUS",
        ],
        "BATCH_PROCESS_DIRECT": ["AUTH_RECONCILE_STATUS"],
    },
}

CONNECTION_METHOD_DETAILS = {
    "WEB_APP_VIA_SERVER": {
        "method_short": "web",
        "audience_class": "BROWSER_HUMAN_VIA_SERVER",
        "fraud_header_profile_ref": "fph_web_app_via_server",
        "rationale": "Interactive browser journeys remain human initiated and gateway-mediated.",
    },
    "DESKTOP_APP_VIA_SERVER": {
        "method_short": "desktop",
        "audience_class": "DESKTOP_HUMAN_VIA_SERVER",
        "fraud_header_profile_ref": "fph_desktop_app_via_server",
        "rationale": "Native macOS flows remain human initiated, system-browser mediated, and still route through the controlled gateway.",
    },
    "BATCH_PROCESS_DIRECT": {
        "method_short": "batch",
        "audience_class": "SERVICE_AUTOMATION",
        "fraud_header_profile_ref": "fph_batch_process_direct",
        "rationale": "Unattended reconciliation or recovery reads must remain machine scoped rather than inheriting interactive fraud-header posture.",
    },
}


def repo_rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def ordered_unique(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for value in values:
        if not value or value in seen:
            continue
        seen.add(value)
        ordered.append(value)
    return ordered


def load_json(path: Path) -> Any:
    return json.loads(path.read_text())


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


def task_source(task_id: str, rationale: str) -> dict[str, str]:
    line_number, line = find_line_containing(CHECKLIST_PATH, f"`{task_id}`")
    match = CHECKLIST_ITEM_RE.match(line)
    if not match:
        raise ValueError(f"Could not parse checklist item for {task_id}")
    logical_block = f"{match.group('task')} {match.group('slug').strip()}"
    return {
        "source_file": repo_rel(CHECKLIST_PATH),
        "source_heading_or_logical_block": logical_block,
        "source_ref": line_ref(CHECKLIST_PATH, line_number, task_id),
        "rationale": rationale,
    }


def heading_source(path: Path, heading_text: str, rationale: str) -> dict[str, str]:
    return {
        "source_file": repo_rel(path),
        "source_heading_or_logical_block": heading_text,
        "source_ref": heading_ref(path, heading_text),
        "rationale": rationale,
    }


def text_source(path: Path, needle: str, logical_block: str, rationale: str) -> dict[str, str]:
    return {
        "source_file": repo_rel(path),
        "source_heading_or_logical_block": logical_block,
        "source_ref": text_ref(path, needle, logical_block),
        "rationale": rationale,
    }


def external_source(url: str, logical_block: str, rationale: str) -> dict[str, str]:
    return {
        "source_file": url,
        "source_heading_or_logical_block": logical_block,
        "source_ref": url,
        "rationale": rationale,
    }


def md_escape(value: Any) -> str:
    if isinstance(value, list):
        value = ", ".join(str(item) for item in value)
    if isinstance(value, dict):
        value = json.dumps(value, sort_keys=True)
    return str(value).replace("|", "\\|").replace("\n", " ").strip()


def markdown_table(headers: list[str], rows: list[list[Any]]) -> str:
    header_line = "| " + " | ".join(headers) + " |"
    divider_line = "| " + " | ".join("---" for _ in headers) + " |"
    body_lines = [
        "| " + " | ".join(md_escape(cell) for cell in row) + " |" for row in rows
    ]
    return "\n".join([header_line, divider_line, *body_lines])


def normalize_environment_order(environment_ids: Iterable[str]) -> list[str]:
    order = {env_id: index for index, env_id in enumerate(ENVIRONMENT_ORDER)}
    return sorted(environment_ids, key=lambda env_id: order.get(env_id, 999))


def normalize_connection_order(connection_methods: Iterable[str]) -> list[str]:
    order = {
        connection_method: index
        for index, connection_method in enumerate(CONNECTION_METHOD_ORDER)
    }
    return sorted(connection_methods, key=lambda item: order.get(item, 999))


def fetch_url_text(url: str) -> str:
    with urllib.request.urlopen(url, timeout=HMRC_TIMEOUT_SECONDS) as response:
        return response.read().decode("utf-8", "ignore")


def parse_hmrc_overview_page(html: str) -> dict[str, str]:
    version_match = CURRENT_VERSION_RE.search(html)
    last_updated_match = LAST_UPDATED_RE.search(html)
    sandbox_match = SANDBOX_BASE_RE.search(html)
    production_match = PRODUCTION_BASE_RE.search(html)
    if not (version_match and last_updated_match and sandbox_match and production_match):
        raise ValueError("Could not parse HMRC overview page fields")
    return {
        "current_observed_version": version_match.group(1),
        "current_observed_stage": version_match.group(2).upper(),
        "documentation_last_updated": last_updated_match.group(1).strip(),
        "sandbox_base_url": sandbox_match.group(1).strip(),
        "production_base_url": production_match.group(1).strip(),
    }


def parse_hmrc_oas_file(text: str) -> dict[str, Any]:
    version_match = OAS_VERSION_RE.search(text)
    auth_match = AUTH_URL_RE.search(text)
    token_match = TOKEN_URL_RE.search(text)
    refresh_match = REFRESH_URL_RE.search(text)
    scopes = ordered_unique(SCOPE_RE.findall(text))
    if not (version_match and auth_match and token_match and refresh_match and scopes):
        raise ValueError("Could not parse HMRC OAS file fields")
    return {
        "oas_version": version_match.group(1),
        "authorization_url": auth_match.group(1),
        "token_url": token_match.group(1),
        "refresh_url": refresh_match.group(1),
        "oauth_scopes": scopes,
    }


def build_provider_api_inventory(skip_live_hmrc: bool) -> dict[str, Any]:
    api_records: list[dict[str, Any]] = []
    typed_gaps: list[dict[str, Any]] = []

    for api_def in HMRC_API_DEFS:
        overview_url = (
            "https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/"
            f"{api_def['service_slug']}/{api_def['expected_version']}"
        )
        oas_page_url = overview_url + "/oas/page"
        oas_file_url = overview_url + "/oas/file"
        record: dict[str, Any] = {
            "api_key": api_def["api_key"],
            "display_name": api_def["display_name"],
            "provider_name": "HMRC",
            "provider_family": "MTD_INCOME_TAX",
            "compatible_product_chain_ref": api_def["product_chain_ref"],
            "relevant_operation_families": api_def["operation_families"],
            "documentation_url": overview_url,
            "oas_page_url": oas_page_url,
            "oas_file_url": oas_file_url,
            "expected_version": api_def["expected_version"],
            "current_observed_version": api_def["expected_version"],
            "current_observed_stage": "BETA",
            "documentation_last_updated": "UNKNOWN",
            "sandbox_base_url": "https://test-api.service.hmrc.gov.uk",
            "production_base_url": "https://api.service.hmrc.gov.uk",
            "authorization_url": "https://api.service.hmrc.gov.uk/oauth/authorize",
            "token_url": "https://api.service.hmrc.gov.uk/oauth/token",
            "refresh_url": "https://api.service.hmrc.gov.uk/oauth/refresh",
            "oauth_scopes": ["write:self-assessment", "read:self-assessment"],
            "verified_on": TODAY,
            "verification_status": "CURATED_SNAPSHOT_ONLY" if skip_live_hmrc else "SNAPSHOT_FALLBACK",
            "requires_live_revalidation_before_runtime_use": True,
            "source_refs": [
                external_source(
                    overview_url,
                    f"{api_def['display_name']} overview",
                    "Primary HMRC overview page for current observed version and environment base URLs.",
                ),
                external_source(
                    oas_file_url,
                    f"{api_def['display_name']} OAS file",
                    "Primary HMRC machine-readable OpenAPI definition for OAuth URLs and scopes.",
                ),
            ],
            "notes": [
                "Treat version and scope inventory as provisional provider facts that must be refreshed on each catalog build."
            ],
        }

        if not skip_live_hmrc:
            try:
                overview_html = fetch_url_text(overview_url)
                oas_text = fetch_url_text(oas_file_url)
                record.update(parse_hmrc_overview_page(overview_html))
                record.update(parse_hmrc_oas_file(oas_text))
                record["verification_status"] = "LIVE_VERIFIED"
                record["notes"].append(
                    "Live verification succeeded against HMRC Developer Hub overview and OpenAPI sources on 2026-04-18."
                )
            except (OSError, urllib.error.URLError, ValueError) as exc:
                record["notes"].append(
                    f"Live verification failed on 2026-04-18 and the catalog fell back to the curated baseline: {exc}"
                )
                typed_gaps.append(
                    {
                        "gap_id": f"gap_hmrc_live_verification_{api_def['api_key']}",
                        "severity": "WARNING",
                        "summary": f"{api_def['display_name']} live verification failed; fallback snapshot retained",
                        "rationale": "The build still emits a mechanically usable profile set, but a later run should refresh the official HMRC pages before production use.",
                        "source_refs": record["source_refs"],
                    }
                )

        api_records.append(record)

    oauth_rules = [
        {
            "rule_id": "oauth_redirect_uri_must_match_registered_value",
            "requirement": "The redirect URI used for authorisation must match one of the redirect URIs registered on the HMRC application.",
            "source_refs": [
                external_source(
                    "https://developer.service.hmrc.gov.uk/api-documentation/docs/reference-guide",
                    "Redirect URIs",
                    "HMRC reference guide rule for registered redirect URIs.",
                ),
                external_source(
                    "https://developer.service.hmrc.gov.uk/api-documentation/docs/authorisation/user-restricted-endpoints",
                    "Authorise endpoint parameters",
                    "HMRC OAuth authorisation request parameters.",
                ),
            ],
        },
        {
            "rule_id": "oauth_token_exchange_must_reuse_same_redirect_uri",
            "requirement": "The redirect URI used at `/oauth/token` must be the same redirect URI used at `/oauth/authorize`.",
            "source_refs": [
                external_source(
                    "https://developer.service.hmrc.gov.uk/api-documentation/docs/reference-guide",
                    "Redirect URIs",
                    "HMRC requires the same redirect URI to be reused across authorisation and token exchange.",
                ),
                external_source(
                    "https://developer.service.hmrc.gov.uk/api-documentation/docs/authorisation/user-restricted-endpoints",
                    "Exchange authorisation code for access token",
                    "Token exchange body parameters retain the same redirect URI.",
                ),
            ],
        },
        {
            "rule_id": "oauth_registered_redirect_uris_maximum_five",
            "requirement": "A single HMRC application may register at most five redirect URIs.",
            "source_refs": [
                external_source(
                    "https://developer.service.hmrc.gov.uk/api-documentation/docs/reference-guide",
                    "Redirect URIs",
                    "HMRC reference guide maximum redirect URI count.",
                )
            ],
        },
        {
            "rule_id": "oauth_installed_application_redirect_options",
            "requirement": "Installed applications may use `http://localhost:[PORT]`, `urn:ietf:wg:oauth:2.0:oob`, or `urn:ietf:wg:oauth:2.0:oob:auto` where the native client flow requires it.",
            "source_refs": [
                external_source(
                    "https://developer.service.hmrc.gov.uk/api-documentation/docs/authorisation/user-restricted-endpoints",
                    "OAuth 2.0 for installed applications",
                    "HMRC installed-application redirect patterns.",
                )
            ],
        },
    ]

    sandbox_operating_rules = [
        {
            "rule_id": "sandbox_base_url",
            "requirement": "Sandbox authorisation and API calls use `https://test-api.service.hmrc.gov.uk`.",
            "source_refs": [
                external_source(
                    "https://developer.service.hmrc.gov.uk/api-documentation/docs/testing",
                    "Configure your application for sandbox",
                    "HMRC sandbox configuration rule.",
                )
            ],
        },
        {
            "rule_id": "sandbox_application_lifecycle",
            "requirement": "Sandbox applications are automatically deleted after 30 days with no API calls, or after 6 months of inactivity following prior use.",
            "source_refs": [
                external_source(
                    "https://developer.service.hmrc.gov.uk/api-documentation/docs/testing",
                    "Getting started",
                    "HMRC sandbox application retention rule.",
                )
            ],
        },
        {
            "rule_id": "sandbox_test_user_creation",
            "requirement": "User-restricted endpoints require HMRC sandbox test users created through the Create Test User API.",
            "source_refs": [
                external_source(
                    "https://developer.service.hmrc.gov.uk/api-test-user",
                    "Create a test user",
                    "HMRC sandbox test-user provisioning rule.",
                ),
                external_source(
                    "https://developer.service.hmrc.gov.uk/api-documentation/docs/testing",
                    "Test the authorisation process",
                    "HMRC sandbox authorisation testing flow.",
                ),
            ],
        },
        {
            "rule_id": "sandbox_test_user_retention",
            "requirement": "Unused HMRC sandbox test users are deleted after 90 days and should be reused before creating new identities.",
            "source_refs": [
                external_source(
                    "https://developer.service.hmrc.gov.uk/api-test-user",
                    "Create a test user",
                    "HMRC sandbox test-user lifecycle rule.",
                )
            ],
        },
    ]

    fraud_connection_methods = [
        {
            "connection_method": "WEB_APP_VIA_SERVER",
            "profile_ref": "fph_web_app_via_server",
            "summary": "Browser-originated interactive traffic that reaches HMRC through vendor-controlled intermediary servers.",
            "required_headers_excerpt": [
                "Gov-Client-Connection-Method",
                "Gov-Client-Public-IP",
                "Gov-Client-Public-Port",
                "Gov-Vendor-Forwarded",
                "Gov-Vendor-Public-IP",
            ],
            "source_refs": [
                external_source(
                    "https://developer.service.hmrc.gov.uk/guides/fraud-prevention/connection-method/web-app-via-server/",
                    "Web application via server",
                    "HMRC fraud-prevention connection method for browser flows.",
                )
            ],
        },
        {
            "connection_method": "DESKTOP_APP_VIA_SERVER",
            "profile_ref": "fph_desktop_app_via_server",
            "summary": "Desktop-originated interactive traffic that reaches HMRC through vendor-controlled intermediary servers.",
            "required_headers_excerpt": [
                "Gov-Client-Connection-Method",
                "Gov-Client-Device-ID",
                "Gov-Client-Public-IP",
                "Gov-Client-Public-Port",
                "Gov-Vendor-Version",
            ],
            "source_refs": [
                external_source(
                    "https://developer.service.hmrc.gov.uk/guides/fraud-prevention/connection-method/desktop-app-via-server/",
                    "Desktop application via server",
                    "HMRC fraud-prevention connection method for native desktop flows.",
                )
            ],
        },
        {
            "connection_method": "BATCH_PROCESS_DIRECT",
            "profile_ref": "fph_batch_process_direct",
            "summary": "Batch or unattended traffic where end users do not initiate the action and vendor systems connect directly to HMRC.",
            "required_headers_excerpt": [
                "Gov-Client-Connection-Method",
                "Gov-Client-User-IDs",
                "Gov-Vendor-Product-Name",
                "Gov-Vendor-Version",
            ],
            "source_refs": [
                external_source(
                    "https://developer.service.hmrc.gov.uk/guides/fraud-prevention/connection-method/batch-process-direct/",
                    "Batch process direct",
                    "HMRC fraud-prevention connection method for unattended direct flows.",
                ),
                external_source(
                    "https://developer.service.hmrc.gov.uk/guides/fraud-prevention/connection-method/",
                    "What you need to send",
                    "HMRC guidance on when batch direct is lawful.",
                ),
            ],
        },
    ]

    typed_gaps.extend(
        [
            {
                "gap_id": "gap_missing_shared_operating_contract_0030_to_0037",
                "severity": "WARNING",
                "summary": "The referenced shared operating contract `shared_operating_contract_0030_to_0037.md` is absent",
                "rationale": "This catalog grounded itself directly in the named algorithm contracts plus prior phase outputs rather than the missing shared range document.",
                "source_refs": [
                    external_source(
                        repo_rel(CARD_PATH),
                        "Autonomous Coding Prompt",
                        "The task card references a shared operating contract that is not present in the repository.",
                    )
                ],
            },
            {
                "gap_id": "gap_reference_operation_family_overloads_multiple_hmrc_surfaces",
                "severity": "INFO",
                "summary": "`AUTH_READ_REFERENCE` is broader than the current HMRC baseline list and may need narrower surface splits later",
                "rationale": "The current phase-01 catalog maps `AUTH_READ_REFERENCE` to Business Details because it is the stable reference API in the current baseline, but later implementation may need a distinct profile for taxpayer-status or other reference APIs.",
                "source_refs": [
                    heading_source(
                        AUTHORITY_PATH,
                        "9.2 Protocol scope",
                        "The operation-family taxonomy is broader than one HMRC API family.",
                    )
                ],
            },
        ]
    )

    inventory = {
        "generated_at": TODAY,
        "contract_version": CONTRACT_VERSION,
        "refresh_command": "python3 tools/analysis/build_environment_profile_catalog.py --refresh-hmrc",
        "default_build_mode": "LIVE_REFRESH" if not skip_live_hmrc else "CURATED_SNAPSHOT_ONLY",
        "api_records": api_records,
        "oauth_rules": oauth_rules,
        "sandbox_operating_rules": sandbox_operating_rules,
        "fraud_connection_methods": fraud_connection_methods,
        "typed_gaps": typed_gaps,
        "summary": {
            "api_record_count": len(api_records),
            "oauth_rule_count": len(oauth_rules),
            "sandbox_rule_count": len(sandbox_operating_rules),
            "fraud_connection_method_count": len(fraud_connection_methods),
            "typed_gap_count": len(typed_gaps),
        },
    }
    return inventory


def build_callback_profiles() -> list[dict[str, Any]]:
    local_sources = [
        heading_source(
            NORTHBOUND_PATH,
            "8. Session, browser, and native-client rules",
            "Local and native callback posture stays bound to governed session rules.",
        ),
        heading_source(
            SECURITY_PATH,
            "4. Browser, native-client, API, and transport hardening",
            "Browser and native callback posture must respect server-mediated token custody and transport hardening.",
        ),
    ]
    hmrc_oauth_sources = [
        external_source(
            "https://developer.service.hmrc.gov.uk/api-documentation/docs/reference-guide",
            "Redirect URIs",
            "HMRC redirect URI rules govern registered callback patterns.",
        ),
        external_source(
            "https://developer.service.hmrc.gov.uk/api-documentation/docs/authorisation/user-restricted-endpoints",
            "OAuth 2.0 for installed applications",
            "HMRC installed-application redirect rules govern native loopback callbacks.",
        ),
    ]
    return [
        {
            "callback_profile_ref": "cb_local_browser_loopback_sandbox",
            "environment_refs": ["env_local_provisioning_workstation"],
            "connection_method": "WEB_APP_VIA_SERVER",
            "oauth_redirect_uri_pattern": "http://localhost:45080/oauth/hmrc/sandbox/browser-callback",
            "provider_ingress_uri_pattern": None,
            "host_separation_rule": "Local provisioning loopback only; never register for production.",
            "owning_deployable_id": "deployable_local_provisioning_workspace",
            "source_refs": hmrc_oauth_sources + local_sources,
        },
        {
            "callback_profile_ref": "cb_local_native_loopback_sandbox",
            "environment_refs": ["env_local_provisioning_workstation"],
            "connection_method": "DESKTOP_APP_VIA_SERVER",
            "oauth_redirect_uri_pattern": "http://localhost:45081/oauth/hmrc/sandbox/native-callback",
            "provider_ingress_uri_pattern": None,
            "host_separation_rule": "Local native loopback only; reserved for sandbox bootstrap and native auth-session testing.",
            "owning_deployable_id": "deployable_local_provisioning_workspace",
            "source_refs": hmrc_oauth_sources + local_sources,
        },
        {
            "callback_profile_ref": "cb_ephemeral_review_disallowed",
            "environment_refs": ["env_ephemeral_review_preview"],
            "connection_method": "WEB_APP_VIA_SERVER",
            "oauth_redirect_uri_pattern": None,
            "provider_ingress_uri_pattern": None,
            "host_separation_rule": "Ephemeral review hosts are intentionally not provider-registered because callback stability is not guaranteed.",
            "owning_deployable_id": "deployable_ephemeral_review_web_shell",
            "source_refs": [
                task_source(
                    "pc_0018",
                    "Dependency analysis already classified ephemeral review as unsuitable for provider callback truth.",
                ),
                heading_source(
                    DEPLOYMENT_PATH,
                    "1. Reference runtime topology",
                    "Authority ingress remains a governed deployable rather than an arbitrary preview host.",
                ),
            ],
        },
        {
            "callback_profile_ref": "cb_sandbox_web",
            "environment_refs": ["env_shared_sandbox_integration"],
            "connection_method": "WEB_APP_VIA_SERVER",
            "oauth_redirect_uri_pattern": "https://auth.sandbox.taxat.example/oauth/hmrc/callback",
            "provider_ingress_uri_pattern": "https://authority-ingress.sandbox.taxat.example/hmrc/inbox",
            "host_separation_rule": "Sandbox uses its own non-production hosts and never shares them with pre-production or production.",
            "owning_deployable_id": "deployable_northbound_api_session_gateway",
            "source_refs": hmrc_oauth_sources
            + [
                heading_source(
                    AUTHORITY_PATH,
                    "9.7 Fraud-prevention header rule",
                    "Interactive browser-originated authority requests must retain the correct connection-method posture.",
                )
            ],
        },
        {
            "callback_profile_ref": "cb_sandbox_desktop",
            "environment_refs": ["env_shared_sandbox_integration"],
            "connection_method": "DESKTOP_APP_VIA_SERVER",
            "oauth_redirect_uri_pattern": "http://localhost:46080/oauth/hmrc/sandbox/native-callback",
            "provider_ingress_uri_pattern": "https://authority-ingress.sandbox.taxat.example/hmrc/inbox",
            "host_separation_rule": "Sandbox native loopback path is port-and-path segregated from pre-production and production native callbacks.",
            "owning_deployable_id": "deployable_native_macos_operator_client",
            "source_refs": hmrc_oauth_sources + local_sources,
        },
        {
            "callback_profile_ref": "cb_sandbox_batch",
            "environment_refs": ["env_shared_sandbox_integration"],
            "connection_method": "BATCH_PROCESS_DIRECT",
            "oauth_redirect_uri_pattern": None,
            "provider_ingress_uri_pattern": "https://authority-ingress.sandbox.taxat.example/hmrc/inbox",
            "host_separation_rule": "Batch or recovery traffic uses gateway ingress only and has no interactive OAuth redirect URI.",
            "owning_deployable_id": "deployable_controlled_authority_gateway",
            "source_refs": [
                heading_source(
                    AUTHORITY_PATH,
                    "9.9A Inbound authority ingress protocol",
                    "Authenticated ingress stays within the authority gateway boundary.",
                ),
                external_source(
                    "https://developer.service.hmrc.gov.uk/guides/fraud-prevention/connection-method/batch-process-direct/",
                    "Batch process direct",
                    "Batch profiles do not require an interactive redirect URI.",
                ),
            ],
        },
        {
            "callback_profile_ref": "cb_preprod_web",
            "environment_refs": ["env_preproduction_verification"],
            "connection_method": "WEB_APP_VIA_SERVER",
            "oauth_redirect_uri_pattern": "https://auth.preprod.taxat.example/oauth/hmrc/callback",
            "provider_ingress_uri_pattern": "https://authority-ingress.preprod.taxat.example/hmrc/inbox",
            "host_separation_rule": "Pre-production keeps a production-like but still sandbox-only callback surface.",
            "owning_deployable_id": "deployable_northbound_api_session_gateway",
            "source_refs": hmrc_oauth_sources
            + [
                heading_source(
                    DEPLOYMENT_PATH,
                    "1. Reference runtime topology",
                    "Pre-production verification still routes authority traffic through the governed gateway.",
                )
            ],
        },
        {
            "callback_profile_ref": "cb_preprod_desktop",
            "environment_refs": ["env_preproduction_verification"],
            "connection_method": "DESKTOP_APP_VIA_SERVER",
            "oauth_redirect_uri_pattern": "http://localhost:46180/oauth/hmrc/preprod/native-callback",
            "provider_ingress_uri_pattern": "https://authority-ingress.preprod.taxat.example/hmrc/inbox",
            "host_separation_rule": "Pre-production native loopback callback uses a dedicated path and port range distinct from sandbox and production.",
            "owning_deployable_id": "deployable_native_macos_operator_client",
            "source_refs": hmrc_oauth_sources + local_sources,
        },
        {
            "callback_profile_ref": "cb_preprod_batch",
            "environment_refs": ["env_preproduction_verification"],
            "connection_method": "BATCH_PROCESS_DIRECT",
            "oauth_redirect_uri_pattern": None,
            "provider_ingress_uri_pattern": "https://authority-ingress.preprod.taxat.example/hmrc/inbox",
            "host_separation_rule": "Pre-production batch and recovery ingress stays on a dedicated non-production authority host.",
            "owning_deployable_id": "deployable_controlled_authority_gateway",
            "source_refs": [
                heading_source(
                    AUTHORITY_PATH,
                    "9.9A Inbound authority ingress protocol",
                    "Authority ingress must authenticate and correlate before mutation.",
                )
            ],
        },
        {
            "callback_profile_ref": "cb_production_web",
            "environment_refs": ["env_production"],
            "connection_method": "WEB_APP_VIA_SERVER",
            "oauth_redirect_uri_pattern": "https://auth.production.taxat.example/oauth/hmrc/callback",
            "provider_ingress_uri_pattern": "https://authority-ingress.production.taxat.example/hmrc/inbox",
            "host_separation_rule": "Production owns its own registered hosts and never reuses sandbox or pre-production callback surfaces.",
            "owning_deployable_id": "deployable_northbound_api_session_gateway",
            "source_refs": hmrc_oauth_sources
            + [
                text_source(
                    RELEASE_IDENTITY_PATH,
                    "enabled_provider_profile_refs[]",
                    "ReleaseCandidateIdentityContract",
                    "Release identity must freeze the exact enabled provider profile set, including production callback identity.",
                )
            ],
        },
        {
            "callback_profile_ref": "cb_production_desktop",
            "environment_refs": ["env_production"],
            "connection_method": "DESKTOP_APP_VIA_SERVER",
            "oauth_redirect_uri_pattern": "http://localhost:46280/oauth/hmrc/production/native-callback",
            "provider_ingress_uri_pattern": "https://authority-ingress.production.taxat.example/hmrc/inbox",
            "host_separation_rule": "Production native callback stays loopback-only on the device and still routes live authority traffic through the controlled gateway.",
            "owning_deployable_id": "deployable_native_macos_operator_client",
            "source_refs": hmrc_oauth_sources + local_sources,
        },
        {
            "callback_profile_ref": "cb_production_batch",
            "environment_refs": ["env_production"],
            "connection_method": "BATCH_PROCESS_DIRECT",
            "oauth_redirect_uri_pattern": None,
            "provider_ingress_uri_pattern": "https://authority-ingress.production.taxat.example/hmrc/inbox",
            "host_separation_rule": "Production batch ingress is separate from all non-production hosts and is used only for unattended reconciliation or recovery flows.",
            "owning_deployable_id": "deployable_controlled_authority_gateway",
            "source_refs": [
                heading_source(
                    AUTHORITY_PATH,
                    "9.9A Inbound authority ingress protocol",
                    "Production ingress remains authenticated and correlated before mutation.",
                )
            ],
        },
        {
            "callback_profile_ref": "cb_drill_disabled",
            "environment_refs": ["env_disaster_recovery_drill"],
            "connection_method": "BATCH_PROCESS_DIRECT",
            "oauth_redirect_uri_pattern": None,
            "provider_ingress_uri_pattern": None,
            "host_separation_rule": "Disaster-recovery drills do not receive live HMRC callbacks by default; any exception needs a separately approved drill profile.",
            "owning_deployable_id": "deployable_controlled_authority_gateway",
            "source_refs": [
                heading_source(
                    DEPLOYMENT_PATH,
                    "5. Backup, restore, and DR rules",
                    "Restore drills prove replay and recovery safety but do not automatically imply live provider integration.",
                )
            ],
        },
    ]


def build_token_binding_profiles() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for env_key, env_short, provider_environment in [
        ("env_shared_sandbox_integration", "sandbox", "sandbox"),
        ("env_preproduction_verification", "preprod", "sandbox"),
        ("env_production", "production", "production"),
    ]:
        rows.extend(
            [
                {
                    "token_binding_profile_ref": f"tb_{env_short}_web_gateway_bound",
                    "environment_ref": env_key,
                    "provider_environment": provider_environment,
                    "connection_method": "WEB_APP_VIA_SERVER",
                    "summary": "Browser sessions remain server-authoritative; raw authority tokens stay in the gateway and vault, never in browser storage.",
                    "source_refs": [
                        heading_source(
                            AUTHORITY_PATH,
                            "9.6 Token and client binding rule",
                            "Authority traffic must freeze the binding between client, token lineage, and provider environment.",
                        ),
                        heading_source(
                            NORTHBOUND_PATH,
                            "8. Session, browser, and native-client rules",
                            "Browser sessions remain server mediated.",
                        ),
                    ],
                },
                {
                    "token_binding_profile_ref": f"tb_{env_short}_desktop_gateway_bound",
                    "environment_ref": env_key,
                    "provider_environment": provider_environment,
                    "connection_method": "DESKTOP_APP_VIA_SERVER",
                    "summary": "Native desktop flows may receive loopback callbacks, but device-local custody of raw authority tokens remains forbidden.",
                    "source_refs": [
                        heading_source(
                            AUTHORITY_PATH,
                            "9.6 Token and client binding rule",
                            "Authority tokens remain bound to the approved client and environment.",
                        ),
                        heading_source(
                            SECURITY_PATH,
                            "4. Browser, native-client, API, and transport hardening",
                            "Native clients must not hold raw authority credentials on device.",
                        ),
                    ],
                },
                {
                    "token_binding_profile_ref": f"tb_{env_short}_batch_gateway_bound",
                    "environment_ref": env_key,
                    "provider_environment": provider_environment,
                    "connection_method": "BATCH_PROCESS_DIRECT",
                    "summary": "Batch or recovery traffic may use only vault-held, gateway-executed token lineage bound to the environment and provider profile.",
                    "source_refs": [
                        heading_source(
                            AUTHORITY_PATH,
                            "9.6 Token and client binding rule",
                            "Machine-driven gateway sends still remain bound to persisted authority lineage.",
                        ),
                        heading_source(
                            SECURITY_PATH,
                            "3. Secret, key, and token handling",
                            "Vault-held token material must remain segregated and attestable.",
                        ),
                    ],
                },
            ]
        )
    return rows


def build_environments(callback_profiles: list[dict[str, Any]]) -> dict[str, Any]:
    callback_profile_map = {
        profile["callback_profile_ref"]: profile for profile in callback_profiles
    }
    environments = [
        {
            "environment_id": "env_local_authoring",
            "label": "Local authoring and deterministic analysis",
            "environment_family": "LOCAL_AUTHORING",
            "purpose": "Repo-local coding, analysis, schema validation, and deterministic offline work.",
            "promotion_posture": "NON_PROMOTABLE_LOCAL",
            "provider_environment_binding": "NONE",
            "authority_operation_posture": "NO_LIVE_PROVIDER_TRAFFIC",
            "allowed_data_classes": [
                "algorithm corpus",
                "sanitized fixtures",
                "non-secret config templates",
            ],
            "forbidden_data_classes": [
                "live provider credentials",
                "sandbox OAuth client secrets",
                "production customer data",
            ],
            "tenant_refs": ["tenant_internal_engineering_automation"],
            "callback_profile_refs": [],
            "secret_namespace_refs": ["sec_local_authoring"],
            "source_refs": [
                heading_source(
                    MANIFEST_FREEZE_PATH,
                    "5.12 Provider and environment capture",
                    "Environment capture must distinguish provider environment from local analysis context.",
                ),
                task_source(
                    "pc_0001",
                    "The repository intake pack established local analysis as a non-runtime workspace.",
                ),
            ],
            "rationale": "The local authoring workspace is necessary for repeatable build and analysis work but is not a canonical provider-integration runtime.",
        },
        {
            "environment_id": "env_local_provisioning_workstation",
            "label": "Local Playwright and provisioning workstation",
            "environment_family": "LOCAL_PROVISIONING",
            "purpose": "Controlled browser automation and manual setup against vendor hubs, sandbox apps, and test-user bootstrap flows.",
            "promotion_posture": "NON_PROMOTABLE_LOCAL",
            "provider_environment_binding": "HMRC_SANDBOX_BOOTSTRAP_ONLY",
            "authority_operation_posture": "BOOTSTRAP_ONLY_NO_CANONICAL_OPERATION_FAMILY_EXECUTION",
            "allowed_data_classes": [
                "sandbox app setup material",
                "developer-hub account metadata",
                "transient sandbox callback codes",
            ],
            "forbidden_data_classes": [
                "production client credentials",
                "production callback registrations",
                "production customer data",
            ],
            "tenant_refs": [
                "tenant_internal_engineering_automation",
                "tenant_provider_sandbox_test_identity_pool",
            ],
            "callback_profile_refs": [
                "cb_local_browser_loopback_sandbox",
                "cb_local_native_loopback_sandbox",
            ],
            "secret_namespace_refs": ["sec_local_provisioning_sandbox"],
            "source_refs": [
                task_source(
                    "pc_0018",
                    "Dependency analysis identified a local provisioning workspace as the place where third-party setup occurs.",
                ),
                heading_source(
                    AUTHORITY_PATH,
                    "9.7 Fraud-prevention header rule",
                    "Provisioning must still respect the eventual connection method posture.",
                ),
            ],
            "rationale": "Provisioning work needs a separate local boundary because it handles sandbox bootstrap and developer-hub interactions that production runtimes must never inherit.",
        },
        {
            "environment_id": "env_ci_ephemeral_validation",
            "label": "CI ephemeral validation",
            "environment_family": "CI_EPHEMERAL",
            "purpose": "Build, lint, test, and contract validation in short-lived CI jobs.",
            "promotion_posture": "NON_PROMOTABLE_EPHEMERAL",
            "provider_environment_binding": "NONE",
            "authority_operation_posture": "NO_LIVE_PROVIDER_TRAFFIC",
            "allowed_data_classes": [
                "compiled artifacts",
                "temporary fixtures",
                "ephemeral test evidence",
            ],
            "forbidden_data_classes": [
                "stable callback registrations",
                "live provider credentials",
                "customer data",
            ],
            "tenant_refs": ["tenant_internal_engineering_automation"],
            "callback_profile_refs": [],
            "secret_namespace_refs": ["sec_ci_ephemeral"],
            "source_refs": [
                task_source(
                    "pc_0018",
                    "Dependency analysis classified CI as a delivery workspace, not a stable provider environment.",
                ),
                task_source(
                    "pc_0026",
                    "Testing doctrine binds CI to deterministic suites rather than live provider callbacks.",
                ),
            ],
            "rationale": "CI is required for reproducible verification but cannot lawfully own a stable HMRC callback or authority-secret domain.",
        },
        {
            "environment_id": "env_ephemeral_review_preview",
            "label": "Ephemeral review preview",
            "environment_family": "EPHEMERAL_REVIEW",
            "purpose": "Short-lived review deployables for browser-only visual and contract validation.",
            "promotion_posture": "NON_PROMOTABLE_EPHEMERAL",
            "provider_environment_binding": "NONE",
            "authority_operation_posture": "NO_LIVE_PROVIDER_TRAFFIC_UNSTABLE_CALLBACK_HOST",
            "allowed_data_classes": [
                "synthetic UI fixtures",
                "temporary preview build artifacts",
            ],
            "forbidden_data_classes": [
                "provider callback registrations",
                "authority tokens",
                "customer data",
            ],
            "tenant_refs": ["tenant_internal_engineering_automation"],
            "callback_profile_refs": ["cb_ephemeral_review_disallowed"],
            "secret_namespace_refs": ["sec_ephemeral_review"],
            "source_refs": [
                task_source(
                    "pc_0018",
                    "The dependency pack marked ephemeral review as unsuitable for provider callback truth.",
                )
            ],
            "rationale": "Preview hosts are useful for visual inspection, but their lifecycle is too unstable for provider registration or callback trust.",
        },
        {
            "environment_id": "env_shared_sandbox_integration",
            "label": "Shared sandbox integration",
            "environment_family": "SHARED_SANDBOX",
            "purpose": "The first stable shared runtime with registered sandbox callbacks, sandbox credentials, and reusable HMRC test identities.",
            "promotion_posture": "PRE_PROMOTION_SHARED_INTEGRATION",
            "provider_environment_binding": "HMRC_SANDBOX",
            "authority_operation_posture": "CANONICAL_SANDBOX_OPERATION_FAMILY_EXECUTION",
            "allowed_data_classes": [
                "sandbox client credentials",
                "sandbox test users",
                "synthetic business data",
                "candidate-bound sandbox evidence",
            ],
            "forbidden_data_classes": [
                "production customer data",
                "production authority credentials",
            ],
            "tenant_refs": [
                "tenant_internal_engineering_automation",
                "tenant_internal_operator_governance",
                "tenant_provider_sandbox_test_identity_pool",
            ],
            "callback_profile_refs": [
                "cb_sandbox_web",
                "cb_sandbox_desktop",
                "cb_sandbox_batch",
            ],
            "secret_namespace_refs": [
                "sec_sandbox_runtime",
                "sec_sandbox_web_authority",
                "sec_sandbox_desktop_authority",
                "sec_sandbox_batch_authority",
            ],
            "source_refs": [
                heading_source(
                    DEPLOYMENT_PATH,
                    "1. Reference runtime topology",
                    "The stable runtime topology includes a controlled authority gateway and vault boundary.",
                ),
                text_source(
                    RELEASE_GATES_PATH,
                    "authority sandbox suites green for enabled profiles",
                    "Blocking gates",
                    "The sandbox environment must exercise exact enabled provider profiles.",
                ),
            ],
            "rationale": "Sandbox is the first canonical provider-enabled environment because HMRC lands changes there before production and the release gates require exact sandbox coverage evidence.",
        },
        {
            "environment_id": "env_preproduction_verification",
            "label": "Pre-production verification",
            "environment_family": "PREPRODUCTION",
            "purpose": "Production-like topology, network policy, and secret domains used to verify release candidates before promotion.",
            "promotion_posture": "PRE_PRODUCTION_GATE",
            "provider_environment_binding": "HMRC_SANDBOX",
            "authority_operation_posture": "PRODUCTION_LIKE_INTERNALS_SANDBOX_PROVIDER",
            "allowed_data_classes": [
                "production-like configuration",
                "non-production secrets",
                "sandbox authority evidence",
                "candidate release artifacts",
            ],
            "forbidden_data_classes": [
                "live production authority credentials",
                "production customer data",
            ],
            "tenant_refs": [
                "tenant_internal_operator_governance",
                "tenant_break_glass_security_admin",
            ],
            "callback_profile_refs": [
                "cb_preprod_web",
                "cb_preprod_desktop",
                "cb_preprod_batch",
            ],
            "secret_namespace_refs": [
                "sec_preprod_runtime",
                "sec_preprod_web_authority",
                "sec_preprod_desktop_authority",
                "sec_preprod_batch_authority",
            ],
            "source_refs": [
                text_source(
                    DEPLOYMENT_PATH,
                    "deploy to pre-production with production-like secrets/network policy",
                    "Promotion pipeline",
                    "Pre-production must mirror production-like policy without sharing production authority trust.",
                ),
                task_source(
                    "pc_0027",
                    "Release evidence strategy already requires candidate-bound verification before promotion.",
                ),
            ],
            "rationale": "A pre-production boundary is required because release verification needs stable hosts and production-like controls, but production provider trust remains out of bounds until promotion.",
        },
        {
            "environment_id": "env_production",
            "label": "Production",
            "environment_family": "PRODUCTION",
            "purpose": "Live customer-facing runtime with production provider credentials, stable callback surfaces, and immutable audit evidence.",
            "promotion_posture": "PROMOTABLE_LIVE_RUNTIME",
            "provider_environment_binding": "HMRC_PRODUCTION",
            "authority_operation_posture": "CANONICAL_LIVE_OPERATION_FAMILY_EXECUTION",
            "allowed_data_classes": [
                "customer data",
                "production authority credentials",
                "immutable audit evidence",
                "release candidate manifests",
            ],
            "forbidden_data_classes": [
                "sandbox identities",
                "sandbox callback registrations",
                "synthetic seed data",
            ],
            "tenant_refs": [
                "tenant_internal_operator_governance",
                "tenant_customer_runtime_isolation",
                "tenant_break_glass_security_admin",
            ],
            "callback_profile_refs": [
                "cb_production_web",
                "cb_production_desktop",
                "cb_production_batch",
            ],
            "secret_namespace_refs": [
                "sec_production_runtime",
                "sec_production_web_authority",
                "sec_production_desktop_authority",
                "sec_production_batch_authority",
            ],
            "source_refs": [
                text_source(
                    RELEASE_IDENTITY_PATH,
                    "enabled_provider_profile_refs[]",
                    "ReleaseCandidateIdentityContract",
                    "Production promotion freezes the exact enabled provider profile set.",
                ),
                text_source(
                    DEPLOYMENT_PATH,
                    "no production promotion without a recorded `DeploymentRelease`",
                    "Promotion boundary",
                    "Production promotion is a governed release action with exact candidate identity.",
                ),
            ],
            "rationale": "Production is the only environment allowed to hold live customer data and production authority credentials, and it must remain disjoint from every non-production secret and callback domain.",
        },
        {
            "environment_id": "env_disaster_recovery_drill",
            "label": "Disaster-recovery and resilience drill",
            "environment_family": "DRILL",
            "purpose": "Restore, replay, and recoverability rehearsal under tightly governed conditions.",
            "promotion_posture": "DRILL_ONLY_NOT_GENERAL_RUNTIME",
            "provider_environment_binding": "NONE_BY_DEFAULT",
            "authority_operation_posture": "NO_LIVE_PROVIDER_TRAFFIC_UNLESS_SEPARATE_DRILL_PROFILE_APPROVED",
            "allowed_data_classes": [
                "encrypted restore snapshots",
                "redacted or controlled rehearsal data",
                "drill evidence and attestations",
            ],
            "forbidden_data_classes": [
                "shared production callback registrations",
                "always-on production provider credentials",
            ],
            "tenant_refs": [
                "tenant_internal_operator_governance",
                "tenant_break_glass_security_admin",
            ],
            "callback_profile_refs": ["cb_drill_disabled"],
            "secret_namespace_refs": [
                "sec_drill_runtime",
                "sec_drill_restore_material",
            ],
            "source_refs": [
                heading_source(
                    DEPLOYMENT_PATH,
                    "5. Backup, restore, and DR rules",
                    "The deployment contract defines a separate drill and restore posture.",
                ),
                task_source(
                    "pc_0015",
                    "Control-plane governance already distinguishes replay and recovery from normal production promotion.",
                ),
            ],
            "rationale": "DR drills need their own environment vocabulary so restore evidence and emergency controls do not silently inherit production callback trust or steady-state provider profiles.",
        },
    ]
    candidate_evaluations = [
        {
            "candidate_id": "candidate_local_authoring",
            "candidate_label": "local authoring / deterministic analysis",
            "disposition": "ADOPTED",
            "environment_ref": "env_local_authoring",
            "rationale": "The repository requires a non-runtime local analysis boundary for schema, replay, and documentation work.",
        },
        {
            "candidate_id": "candidate_local_provisioning_workstation",
            "candidate_label": "local Playwright / provisioning workstation",
            "disposition": "ADOPTED",
            "environment_ref": "env_local_provisioning_workstation",
            "rationale": "Third-party app setup and browser automation need a separate local boundary from coding work.",
        },
        {
            "candidate_id": "candidate_ci_ephemeral_validation",
            "candidate_label": "CI ephemeral validation",
            "disposition": "ADOPTED",
            "environment_ref": "env_ci_ephemeral_validation",
            "rationale": "CI must exist as a distinct ephemeral environment with no stable provider trust.",
        },
        {
            "candidate_id": "candidate_ephemeral_review_preview",
            "candidate_label": "ephemeral review preview",
            "disposition": "ADOPTED",
            "environment_ref": "env_ephemeral_review_preview",
            "rationale": "Dependency analysis explicitly identified review hosts as useful but unsuitable for provider callbacks.",
        },
        {
            "candidate_id": "candidate_shared_sandbox_integration",
            "candidate_label": "shared sandbox integration",
            "disposition": "ADOPTED",
            "environment_ref": "env_shared_sandbox_integration",
            "rationale": "Sandbox is the first canonical provider-enabled environment and gates releases.",
        },
        {
            "candidate_id": "candidate_preproduction_verification",
            "candidate_label": "pre-production / production-like verification",
            "disposition": "ADOPTED",
            "environment_ref": "env_preproduction_verification",
            "rationale": "Pre-production is required for stable release-candidate verification without sharing production authority trust.",
        },
        {
            "candidate_id": "candidate_production",
            "candidate_label": "production",
            "disposition": "ADOPTED",
            "environment_ref": "env_production",
            "rationale": "Production is the live customer and provider boundary.",
        },
        {
            "candidate_id": "candidate_disaster_recovery_or_drill",
            "candidate_label": "disaster-recovery or resilience drill",
            "disposition": "ADOPTED",
            "environment_ref": "env_disaster_recovery_drill",
            "rationale": "Recovery and drill work needs explicit separation from steady-state runtime environments.",
        },
        {
            "candidate_id": "candidate_native_standalone_environment",
            "candidate_label": "native-client specific environment boundary",
            "disposition": "REJECTED_AS_STANDALONE",
            "environment_ref": None,
            "rationale": "ADR-007 defines the native macOS operator workspace as a deployable and session boundary across shared server environments, not a separate provider environment.",
            "source_refs": [task_source("pc_0025", "The native macOS delivery ADR treats native as a delivery strategy and scene boundary rather than its own server environment.")],
        },
    ]
    typed_gaps = [
        {
            "gap_id": "gap_drill_live_provider_profile_not_defined",
            "severity": "INFO",
            "summary": "Disaster-recovery drills do not yet have a separately approved live HMRC provider profile",
            "rationale": "The current corpus proves replay and restore doctrine, but it does not require a default live provider callback or send path during drills.",
            "source_refs": [
                heading_source(
                    DEPLOYMENT_PATH,
                    "5. Backup, restore, and DR rules",
                    "Restore rules focus on recoverability rather than default live provider calls.",
                )
            ],
        }
    ]
    return {
        "generated_at": TODAY,
        "contract_version": CONTRACT_VERSION,
        "environment_records": environments,
        "evaluated_environment_candidates": candidate_evaluations,
        "callback_profile_refs": sorted(callback_profile_map),
        "typed_gaps": typed_gaps,
        "summary": {
            "environment_count": len(environments),
            "adopted_candidate_count": sum(
                1 for candidate in candidate_evaluations if candidate["disposition"].startswith("ADOPTED")
            ),
            "rejected_candidate_count": sum(
                1 for candidate in candidate_evaluations if candidate["disposition"].startswith("REJECTED")
            ),
            "typed_gap_count": len(typed_gaps),
        },
    }


def build_secret_namespace_plan() -> dict[str, Any]:
    secret_rows = [
        {
            "secret_namespace_ref": "sec_local_authoring",
            "store_path_prefix": "kv/taxat/local-authoring",
            "environment_refs": ["env_local_authoring"],
            "provider_environment_refs": [],
            "secret_classes": ["tooling-config", "analysis-fixture-metadata"],
            "rotation_owner_role": "ENGINEERING",
            "promotion_allowed": False,
            "mixing_rule": "Local authoring may not contain sandbox or production provider secrets.",
            "source_refs": [
                heading_source(
                    SECURITY_PATH,
                    "3. Secret, key, and token handling",
                    "Secret classes require explicit store references and active-use windows.",
                )
            ],
        },
        {
            "secret_namespace_ref": "sec_local_provisioning_sandbox",
            "store_path_prefix": "kv/taxat/local-provisioning/sandbox",
            "environment_refs": ["env_local_provisioning_workstation"],
            "provider_environment_refs": ["sandbox"],
            "secret_classes": ["developer-hub-account", "sandbox-bootstrap-credentials"],
            "rotation_owner_role": "ENGINEERING",
            "promotion_allowed": False,
            "mixing_rule": "Local provisioning secrets remain sandbox only and never promote into shared runtimes.",
            "source_refs": [task_source("pc_0018", "Provisioning dependencies already distinguish sandbox app registration from production registration.")],
        },
        {
            "secret_namespace_ref": "sec_ci_ephemeral",
            "store_path_prefix": "kv/taxat/ci/${run_id}",
            "environment_refs": ["env_ci_ephemeral_validation"],
            "provider_environment_refs": [],
            "secret_classes": ["ephemeral-build-token", "temporary-test-config"],
            "rotation_owner_role": "CI_SYSTEM",
            "promotion_allowed": False,
            "mixing_rule": "CI namespaces are unique per run and cannot be reused as stable callback or provider namespaces.",
            "source_refs": [task_source("pc_0026", "Testing doctrine makes ephemeral CI evidence candidate-bound and non-promotable.")],
        },
        {
            "secret_namespace_ref": "sec_ephemeral_review",
            "store_path_prefix": "kv/taxat/review/${preview_id}",
            "environment_refs": ["env_ephemeral_review_preview"],
            "provider_environment_refs": [],
            "secret_classes": ["preview-session-secret", "preview-feature-flags"],
            "rotation_owner_role": "CI_SYSTEM",
            "promotion_allowed": False,
            "mixing_rule": "Preview secrets cannot contain provider credentials because preview hosts are not provider-trusted.",
            "source_refs": [task_source("pc_0018", "Ephemeral review is not suitable for provider callback truth.")],
        },
        {
            "secret_namespace_ref": "sec_sandbox_runtime",
            "store_path_prefix": "kv/taxat/sandbox/runtime",
            "environment_refs": ["env_shared_sandbox_integration"],
            "provider_environment_refs": ["sandbox"],
            "secret_classes": ["runtime-app-secrets", "session-signing", "queue-auth", "db-auth"],
            "rotation_owner_role": "OPERATIONS",
            "promotion_allowed": False,
            "mixing_rule": "Sandbox runtime secrets remain separate from every production namespace.",
            "source_refs": [
                heading_source(
                    SECURITY_PATH,
                    "3. Secret, key, and token handling",
                    "Runtime secret storage must be versioned and attestable.",
                )
            ],
        },
        {
            "secret_namespace_ref": "sec_sandbox_web_authority",
            "store_path_prefix": "kv/taxat/sandbox/authority/web",
            "environment_refs": ["env_shared_sandbox_integration"],
            "provider_environment_refs": ["sandbox"],
            "secret_classes": ["sandbox-web-client-secret", "authority-token-lineage"],
            "rotation_owner_role": "SECURITY_AND_AUTHORITY_OPERATIONS",
            "promotion_allowed": False,
            "mixing_rule": "Sandbox web authority secrets stay distinct from desktop, batch, and all production namespaces.",
            "source_refs": [task_source("pc_0022", "Authority boundary ADR separates credential classes and provider environments.")],
        },
        {
            "secret_namespace_ref": "sec_sandbox_desktop_authority",
            "store_path_prefix": "kv/taxat/sandbox/authority/desktop",
            "environment_refs": ["env_shared_sandbox_integration"],
            "provider_environment_refs": ["sandbox"],
            "secret_classes": ["sandbox-desktop-client-secret", "authority-token-lineage"],
            "rotation_owner_role": "SECURITY_AND_AUTHORITY_OPERATIONS",
            "promotion_allowed": False,
            "mixing_rule": "Sandbox native authority credentials use a dedicated namespace because their callback and fraud-header posture differs from web.",
            "source_refs": [task_source("pc_0022", "Authority boundary ADR separates credential classes and callback boundaries.")],
        },
        {
            "secret_namespace_ref": "sec_sandbox_batch_authority",
            "store_path_prefix": "kv/taxat/sandbox/authority/batch",
            "environment_refs": ["env_shared_sandbox_integration"],
            "provider_environment_refs": ["sandbox"],
            "secret_classes": ["sandbox-batch-client-secret", "reconciliation-token-lineage"],
            "rotation_owner_role": "SECURITY_AND_AUTHORITY_OPERATIONS",
            "promotion_allowed": False,
            "mixing_rule": "Sandbox batch authority credentials remain distinct from interactive profiles.",
            "source_refs": [task_source("pc_0022", "Authority boundary ADR distinguishes transport and credential boundaries for interactive versus machine flows.")],
        },
        {
            "secret_namespace_ref": "sec_preprod_runtime",
            "store_path_prefix": "kv/taxat/preprod/runtime",
            "environment_refs": ["env_preproduction_verification"],
            "provider_environment_refs": ["sandbox"],
            "secret_classes": ["runtime-app-secrets", "session-signing", "db-auth"],
            "rotation_owner_role": "OPERATIONS",
            "promotion_allowed": False,
            "mixing_rule": "Pre-production runtime secrets remain production-like but still cannot merge with production secrets.",
            "source_refs": [text_source(DEPLOYMENT_PATH, "deploy to pre-production with production-like secrets/network policy", "Promotion pipeline", "Pre-production requires production-like policy with separate secret domains.")],
        },
        {
            "secret_namespace_ref": "sec_preprod_web_authority",
            "store_path_prefix": "kv/taxat/preprod/authority/web",
            "environment_refs": ["env_preproduction_verification"],
            "provider_environment_refs": ["sandbox"],
            "secret_classes": ["preprod-web-client-secret", "authority-token-lineage"],
            "rotation_owner_role": "SECURITY_AND_AUTHORITY_OPERATIONS",
            "promotion_allowed": False,
            "mixing_rule": "Pre-production web authority credentials remain sandbox-scoped and cannot share a namespace with sandbox shared-runtime or production web authority.",
            "source_refs": [task_source("pc_0027", "Release evidence requires exact provider-profile identity per release candidate.")],
        },
        {
            "secret_namespace_ref": "sec_preprod_desktop_authority",
            "store_path_prefix": "kv/taxat/preprod/authority/desktop",
            "environment_refs": ["env_preproduction_verification"],
            "provider_environment_refs": ["sandbox"],
            "secret_classes": ["preprod-desktop-client-secret", "authority-token-lineage"],
            "rotation_owner_role": "SECURITY_AND_AUTHORITY_OPERATIONS",
            "promotion_allowed": False,
            "mixing_rule": "Pre-production native authority credentials remain isolated from web and production.",
            "source_refs": [task_source("pc_0025", "Native delivery keeps a distinct desktop posture that must not silently inherit web credential namespaces.")],
        },
        {
            "secret_namespace_ref": "sec_preprod_batch_authority",
            "store_path_prefix": "kv/taxat/preprod/authority/batch",
            "environment_refs": ["env_preproduction_verification"],
            "provider_environment_refs": ["sandbox"],
            "secret_classes": ["preprod-batch-client-secret", "reconciliation-token-lineage"],
            "rotation_owner_role": "SECURITY_AND_AUTHORITY_OPERATIONS",
            "promotion_allowed": False,
            "mixing_rule": "Pre-production batch profiles remain distinct from interactive profiles and production batch credentials.",
            "source_refs": [task_source("pc_0022", "Machine-driven authority flows remain a separate credential boundary.")],
        },
        {
            "secret_namespace_ref": "sec_production_runtime",
            "store_path_prefix": "kv/taxat/production/runtime",
            "environment_refs": ["env_production"],
            "provider_environment_refs": ["production"],
            "secret_classes": ["runtime-app-secrets", "session-signing", "db-auth", "audit-attestation"],
            "rotation_owner_role": "OPERATIONS",
            "promotion_allowed": True,
            "mixing_rule": "Production runtime secrets are the only live runtime namespace and never mix with sandbox or pre-production.",
            "source_refs": [heading_source(SECURITY_PATH, "3. Secret, key, and token handling", "Production secrets remain versioned, attestable, and isolated.")],
        },
        {
            "secret_namespace_ref": "sec_production_web_authority",
            "store_path_prefix": "kv/taxat/production/authority/web",
            "environment_refs": ["env_production"],
            "provider_environment_refs": ["production"],
            "secret_classes": ["production-web-client-secret", "authority-token-lineage"],
            "rotation_owner_role": "SECURITY_AND_AUTHORITY_OPERATIONS",
            "promotion_allowed": True,
            "mixing_rule": "Production web authority credentials never share namespace with any sandbox, preprod, desktop, or batch credential set.",
            "source_refs": [task_source("pc_0022", "The authority boundary ADR makes provider-environment isolation explicit.")],
        },
        {
            "secret_namespace_ref": "sec_production_desktop_authority",
            "store_path_prefix": "kv/taxat/production/authority/desktop",
            "environment_refs": ["env_production"],
            "provider_environment_refs": ["production"],
            "secret_classes": ["production-desktop-client-secret", "authority-token-lineage"],
            "rotation_owner_role": "SECURITY_AND_AUTHORITY_OPERATIONS",
            "promotion_allowed": True,
            "mixing_rule": "Production desktop authority credentials remain distinct from web because the fraud-header and callback posture differ.",
            "source_refs": [task_source("pc_0025", "Native delivery maintains a distinct desktop trust and callback posture.")],
        },
        {
            "secret_namespace_ref": "sec_production_batch_authority",
            "store_path_prefix": "kv/taxat/production/authority/batch",
            "environment_refs": ["env_production"],
            "provider_environment_refs": ["production"],
            "secret_classes": ["production-batch-client-secret", "reconciliation-token-lineage"],
            "rotation_owner_role": "SECURITY_AND_AUTHORITY_OPERATIONS",
            "promotion_allowed": True,
            "mixing_rule": "Production batch credentials are reserved for unattended reconciliation and never reused for interactive sends.",
            "source_refs": [task_source("pc_0022", "Authority machine-flow credentials remain separate from interactive credentials.")],
        },
        {
            "secret_namespace_ref": "sec_drill_runtime",
            "store_path_prefix": "kv/taxat/drill/runtime",
            "environment_refs": ["env_disaster_recovery_drill"],
            "provider_environment_refs": [],
            "secret_classes": ["drill-runtime-secrets", "temporary-restore-access"],
            "rotation_owner_role": "BREAK_GLASS_SECURITY",
            "promotion_allowed": False,
            "mixing_rule": "Drill runtime material remains separate from steady-state production namespaces.",
            "source_refs": [task_source("pc_0015", "Recovery and replay governance already distinguishes drill material from steady-state runtime material.")],
        },
        {
            "secret_namespace_ref": "sec_drill_restore_material",
            "store_path_prefix": "kv/taxat/drill/restore-material",
            "environment_refs": ["env_disaster_recovery_drill"],
            "provider_environment_refs": [],
            "secret_classes": ["restore-snapshot-decryption", "drill-attestation-material"],
            "rotation_owner_role": "BREAK_GLASS_SECURITY",
            "promotion_allowed": False,
            "mixing_rule": "Restore-material secrets stay in a dedicated drill namespace and cannot become the steady-state production runtime namespace.",
            "source_refs": [heading_source(DEPLOYMENT_PATH, "5. Backup, restore, and DR rules", "Restore proof and drill material remain governed separately.")],
        },
    ]
    typed_gaps = [
        {
            "gap_id": "gap_no_shared_namespace_across_sandbox_and_production",
            "severity": "RESOLVED_BY_CATALOG",
            "summary": "This catalog makes sandbox and production secret namespaces fully disjoint",
            "rationale": "Later provisioning work can consume these namespace IDs directly instead of inferring them ad hoc.",
        }
    ]
    return {
        "generated_at": TODAY,
        "contract_version": CONTRACT_VERSION,
        "secret_namespace_rows": secret_rows,
        "typed_gaps": typed_gaps,
        "summary": {
            "secret_namespace_count": len(secret_rows),
            "typed_gap_count": len(typed_gaps),
        },
    }


def build_tenant_inventory() -> dict[str, Any]:
    audience_classes = [
        {
            "audience_class": "INTERNAL_ENGINEERING_AUTOMATION",
            "description": "Engineers and automation workers building, provisioning, or validating the product.",
        },
        {
            "audience_class": "INTERNAL_OPERATOR_GOVERNANCE",
            "description": "Internal operators, reviewers, approvers, and audit/governance staff.",
        },
        {
            "audience_class": "CUSTOMER_PORTAL_HUMAN",
            "description": "Customer or delegated client users accessing portal workflows.",
        },
        {
            "audience_class": "HMRC_SANDBOX_FIXTURE",
            "description": "HMRC sandbox test users and other non-production fixture identities.",
        },
        {
            "audience_class": "BREAK_GLASS_SECURITY_ADMIN",
            "description": "Exceptional operators who manage emergency restore, secret rotation, or lockdown flows.",
        },
        {
            "audience_class": "MACHINE_SERVICE_PRINCIPAL",
            "description": "Service principals running unattended jobs, reconciliation, or recovery flows.",
        },
        {
            "audience_class": "DESKTOP_HUMAN_VIA_SERVER",
            "description": "Native macOS operator users whose authority flows route through the controlled gateway.",
        },
        {
            "audience_class": "BROWSER_HUMAN_VIA_SERVER",
            "description": "Browser users whose authority flows route through the controlled gateway.",
        },
    ]
    tenant_rows = [
        {
            "tenant_id": "tenant_internal_engineering_automation",
            "tenant_class": "INTERNAL_ENGINEERING",
            "audience_class_refs": [
                "INTERNAL_ENGINEERING_AUTOMATION",
                "MACHINE_SERVICE_PRINCIPAL",
            ],
            "environment_refs": [
                "env_local_authoring",
                "env_local_provisioning_workstation",
                "env_ci_ephemeral_validation",
                "env_ephemeral_review_preview",
                "env_shared_sandbox_integration",
            ],
            "purpose": "Build, provision, validate, and maintain non-production surfaces.",
            "allowed_data_classes": [
                "synthetic fixtures",
                "sandbox setup material",
                "candidate build evidence",
            ],
            "forbidden_data_classes": [
                "live production customer data",
                "production authority credentials",
            ],
            "seed_data_posture": "May own sandbox fixture creation but never production seed data.",
            "secret_namespace_refs": [
                "sec_local_authoring",
                "sec_local_provisioning_sandbox",
                "sec_ci_ephemeral",
                "sec_ephemeral_review",
                "sec_sandbox_runtime",
            ],
            "source_refs": [
                heading_source(
                    ACTOR_MODEL_PATH,
                    "3.3 Actor classes",
                    "Actor classes distinguish internal humans and service principals from external actors.",
                ),
                task_source(
                    "pc_0018",
                    "Dependency inventory already established an engineering and provisioning tenancy.",
                ),
            ],
        },
        {
            "tenant_id": "tenant_internal_operator_governance",
            "tenant_class": "INTERNAL_RUNTIME",
            "audience_class_refs": [
                "INTERNAL_OPERATOR_GOVERNANCE",
                "BROWSER_HUMAN_VIA_SERVER",
                "DESKTOP_HUMAN_VIA_SERVER",
            ],
            "environment_refs": [
                "env_shared_sandbox_integration",
                "env_preproduction_verification",
                "env_production",
                "env_disaster_recovery_drill",
            ],
            "purpose": "Operate, review, approve, and govern runtime work across operator and governance surfaces.",
            "allowed_data_classes": [
                "runtime work items",
                "audit evidence",
                "customer-safe projections",
            ],
            "forbidden_data_classes": [
                "raw authority tokens on clients",
                "sandbox identities inside production operations",
            ],
            "seed_data_posture": "Consumes sandbox fixtures in non-production and live runtime data only in production.",
            "secret_namespace_refs": [
                "sec_sandbox_runtime",
                "sec_preprod_runtime",
                "sec_production_runtime",
                "sec_drill_runtime",
            ],
            "source_refs": [
                heading_source(
                    ACTOR_MODEL_PATH,
                    "3.4 Authority layers",
                    "Internal operator and governance roles remain distinct from external authority-of-record edges.",
                ),
                task_source(
                    "pc_0014",
                    "Cross-surface requirements already distinguish operator and governance surfaces from customer-facing ones.",
                ),
            ],
        },
        {
            "tenant_id": "tenant_customer_runtime_isolation",
            "tenant_class": "CUSTOMER_RUNTIME",
            "audience_class_refs": ["CUSTOMER_PORTAL_HUMAN"],
            "environment_refs": ["env_production"],
            "purpose": "Production customer and delegated-client isolation for portal and submission workflows.",
            "allowed_data_classes": [
                "customer-safe projections",
                "customer-uploaded artifacts",
                "live submission state",
            ],
            "forbidden_data_classes": [
                "sandbox test identities",
                "internal provisioning credentials",
            ],
            "seed_data_posture": "No synthetic seed data in production customer tenancy.",
            "secret_namespace_refs": ["sec_production_runtime"],
            "source_refs": [
                heading_source(
                    ACTOR_MODEL_PATH,
                    "3.3 Actor classes",
                    "Customer-facing actors remain separate from internal operators and service principals.",
                ),
                task_source(
                    "pc_0014",
                    "The cross-surface atlas distinguished customer-facing portal surfaces from internal operator surfaces.",
                ),
            ],
        },
        {
            "tenant_id": "tenant_provider_sandbox_test_identity_pool",
            "tenant_class": "SANDBOX_FIXTURE",
            "audience_class_refs": [
                "HMRC_SANDBOX_FIXTURE",
                "INTERNAL_ENGINEERING_AUTOMATION",
            ],
            "environment_refs": [
                "env_local_provisioning_workstation",
                "env_shared_sandbox_integration",
                "env_preproduction_verification",
            ],
            "purpose": "Own HMRC sandbox test users, enrolments, and stateful/dynamic seed data for provider verification.",
            "allowed_data_classes": [
                "sandbox test user credentials",
                "sandbox enrolment identifiers",
                "stateful test scenarios",
            ],
            "forbidden_data_classes": [
                "production customer data",
                "production authority credentials",
            ],
            "seed_data_posture": "Primary owner of HMRC sandbox Create Test User API assets and stateful test fixtures.",
            "secret_namespace_refs": [
                "sec_local_provisioning_sandbox",
                "sec_sandbox_web_authority",
                "sec_sandbox_desktop_authority",
                "sec_sandbox_batch_authority",
                "sec_preprod_web_authority",
                "sec_preprod_desktop_authority",
                "sec_preprod_batch_authority",
            ],
            "source_refs": [
                external_source(
                    "https://developer.service.hmrc.gov.uk/api-test-user",
                    "Create a test user",
                    "HMRC sandbox test-user ownership and lifecycle rules.",
                )
            ],
        },
        {
            "tenant_id": "tenant_break_glass_security_admin",
            "tenant_class": "BREAK_GLASS",
            "audience_class_refs": [
                "BREAK_GLASS_SECURITY_ADMIN",
                "MACHINE_SERVICE_PRINCIPAL",
            ],
            "environment_refs": [
                "env_preproduction_verification",
                "env_production",
                "env_disaster_recovery_drill",
            ],
            "purpose": "Manage emergency rotation, lockdown, restore, and exceptional authority controls.",
            "allowed_data_classes": [
                "secret attestation",
                "restore material",
                "drill evidence",
                "lockdown policy state",
            ],
            "forbidden_data_classes": [
                "general customer runtime operations outside approved emergency workflows",
            ],
            "seed_data_posture": "No standing synthetic data; drill material is separately governed and temporary.",
            "secret_namespace_refs": [
                "sec_preprod_runtime",
                "sec_production_runtime",
                "sec_drill_runtime",
                "sec_drill_restore_material",
            ],
            "source_refs": [
                heading_source(
                    SECURITY_PATH,
                    "3. Secret, key, and token handling",
                    "Emergency secret rotation and attestation remain governed operations.",
                ),
                task_source(
                    "pc_0015",
                    "Control-plane governance already separates recovery and no-blind-resend operations from normal runtime work.",
                ),
            ],
        },
    ]
    return {
        "generated_at": TODAY,
        "contract_version": CONTRACT_VERSION,
        "audience_classes": audience_classes,
        "tenant_rows": tenant_rows,
        "summary": {
            "tenant_count": len(tenant_rows),
            "audience_class_count": len(audience_classes),
        },
    }


def build_domain_dns_callback_matrix(callback_profiles: list[dict[str, Any]]) -> dict[str, Any]:
    rows = [
        {
            "domain_row_id": "dom_local_browser_loopback",
            "environment_ref": "env_local_provisioning_workstation",
            "host_pattern": "http://localhost:45080/oauth/hmrc/sandbox/browser-callback",
            "surface_kind": "LOOPBACK_REDIRECT",
            "owning_deployable_id": "deployable_local_provisioning_workspace",
            "callback_profile_ref": "cb_local_browser_loopback_sandbox",
            "provider_registration_allowed": True,
            "dns_required": False,
            "tls_posture": "LOCAL_HTTP_LOOPBACK_ALLOWED_BY_HMRC_FOR_INSTALLED_APP_REDIRECTS",
        },
        {
            "domain_row_id": "dom_local_native_loopback",
            "environment_ref": "env_local_provisioning_workstation",
            "host_pattern": "http://localhost:45081/oauth/hmrc/sandbox/native-callback",
            "surface_kind": "LOOPBACK_REDIRECT",
            "owning_deployable_id": "deployable_local_provisioning_workspace",
            "callback_profile_ref": "cb_local_native_loopback_sandbox",
            "provider_registration_allowed": True,
            "dns_required": False,
            "tls_posture": "LOCAL_HTTP_LOOPBACK_ALLOWED_BY_HMRC_FOR_INSTALLED_APP_REDIRECTS",
        },
        {
            "domain_row_id": "dom_preview_operator_shell",
            "environment_ref": "env_ephemeral_review_preview",
            "host_pattern": "https://operator-preview-{preview_id}.review.taxat.example",
            "surface_kind": "WEB_UI",
            "owning_deployable_id": "deployable_ephemeral_review_web_shell",
            "callback_profile_ref": "cb_ephemeral_review_disallowed",
            "provider_registration_allowed": False,
            "dns_required": True,
            "tls_posture": "TLS_REQUIRED",
        },
        {
            "domain_row_id": "dom_sandbox_operator_web",
            "environment_ref": "env_shared_sandbox_integration",
            "host_pattern": "https://operator.sandbox.taxat.example",
            "surface_kind": "WEB_UI",
            "owning_deployable_id": "deployable_operator_web_app",
            "callback_profile_ref": "cb_sandbox_web",
            "provider_registration_allowed": False,
            "dns_required": True,
            "tls_posture": "TLS_REQUIRED",
        },
        {
            "domain_row_id": "dom_sandbox_portal_web",
            "environment_ref": "env_shared_sandbox_integration",
            "host_pattern": "https://portal.sandbox.taxat.example",
            "surface_kind": "WEB_UI",
            "owning_deployable_id": "deployable_client_portal_web_app",
            "callback_profile_ref": "cb_sandbox_web",
            "provider_registration_allowed": False,
            "dns_required": True,
            "tls_posture": "TLS_REQUIRED",
        },
        {
            "domain_row_id": "dom_sandbox_auth_redirect",
            "environment_ref": "env_shared_sandbox_integration",
            "host_pattern": "https://auth.sandbox.taxat.example/oauth/hmrc/callback",
            "surface_kind": "OAUTH_REDIRECT",
            "owning_deployable_id": "deployable_northbound_api_session_gateway",
            "callback_profile_ref": "cb_sandbox_web",
            "provider_registration_allowed": True,
            "dns_required": True,
            "tls_posture": "TLS_REQUIRED",
        },
        {
            "domain_row_id": "dom_sandbox_ingress",
            "environment_ref": "env_shared_sandbox_integration",
            "host_pattern": "https://authority-ingress.sandbox.taxat.example/hmrc/inbox",
            "surface_kind": "AUTHORITY_INGRESS",
            "owning_deployable_id": "deployable_controlled_authority_gateway",
            "callback_profile_ref": "cb_sandbox_batch",
            "provider_registration_allowed": True,
            "dns_required": True,
            "tls_posture": "TLS_REQUIRED",
        },
        {
            "domain_row_id": "dom_preprod_operator_web",
            "environment_ref": "env_preproduction_verification",
            "host_pattern": "https://operator.preprod.taxat.example",
            "surface_kind": "WEB_UI",
            "owning_deployable_id": "deployable_operator_web_app",
            "callback_profile_ref": "cb_preprod_web",
            "provider_registration_allowed": False,
            "dns_required": True,
            "tls_posture": "TLS_REQUIRED",
        },
        {
            "domain_row_id": "dom_preprod_portal_web",
            "environment_ref": "env_preproduction_verification",
            "host_pattern": "https://portal.preprod.taxat.example",
            "surface_kind": "WEB_UI",
            "owning_deployable_id": "deployable_client_portal_web_app",
            "callback_profile_ref": "cb_preprod_web",
            "provider_registration_allowed": False,
            "dns_required": True,
            "tls_posture": "TLS_REQUIRED",
        },
        {
            "domain_row_id": "dom_preprod_auth_redirect",
            "environment_ref": "env_preproduction_verification",
            "host_pattern": "https://auth.preprod.taxat.example/oauth/hmrc/callback",
            "surface_kind": "OAUTH_REDIRECT",
            "owning_deployable_id": "deployable_northbound_api_session_gateway",
            "callback_profile_ref": "cb_preprod_web",
            "provider_registration_allowed": True,
            "dns_required": True,
            "tls_posture": "TLS_REQUIRED",
        },
        {
            "domain_row_id": "dom_preprod_ingress",
            "environment_ref": "env_preproduction_verification",
            "host_pattern": "https://authority-ingress.preprod.taxat.example/hmrc/inbox",
            "surface_kind": "AUTHORITY_INGRESS",
            "owning_deployable_id": "deployable_controlled_authority_gateway",
            "callback_profile_ref": "cb_preprod_batch",
            "provider_registration_allowed": True,
            "dns_required": True,
            "tls_posture": "TLS_REQUIRED",
        },
        {
            "domain_row_id": "dom_production_operator_web",
            "environment_ref": "env_production",
            "host_pattern": "https://operator.production.taxat.example",
            "surface_kind": "WEB_UI",
            "owning_deployable_id": "deployable_operator_web_app",
            "callback_profile_ref": "cb_production_web",
            "provider_registration_allowed": False,
            "dns_required": True,
            "tls_posture": "TLS_REQUIRED",
        },
        {
            "domain_row_id": "dom_production_portal_web",
            "environment_ref": "env_production",
            "host_pattern": "https://portal.production.taxat.example",
            "surface_kind": "WEB_UI",
            "owning_deployable_id": "deployable_client_portal_web_app",
            "callback_profile_ref": "cb_production_web",
            "provider_registration_allowed": False,
            "dns_required": True,
            "tls_posture": "TLS_REQUIRED",
        },
        {
            "domain_row_id": "dom_production_auth_redirect",
            "environment_ref": "env_production",
            "host_pattern": "https://auth.production.taxat.example/oauth/hmrc/callback",
            "surface_kind": "OAUTH_REDIRECT",
            "owning_deployable_id": "deployable_northbound_api_session_gateway",
            "callback_profile_ref": "cb_production_web",
            "provider_registration_allowed": True,
            "dns_required": True,
            "tls_posture": "TLS_REQUIRED",
        },
        {
            "domain_row_id": "dom_production_ingress",
            "environment_ref": "env_production",
            "host_pattern": "https://authority-ingress.production.taxat.example/hmrc/inbox",
            "surface_kind": "AUTHORITY_INGRESS",
            "owning_deployable_id": "deployable_controlled_authority_gateway",
            "callback_profile_ref": "cb_production_batch",
            "provider_registration_allowed": True,
            "dns_required": True,
            "tls_posture": "TLS_REQUIRED",
        },
        {
            "domain_row_id": "dom_drill_callbacks_disabled",
            "environment_ref": "env_disaster_recovery_drill",
            "host_pattern": "NONE_BY_DEFAULT",
            "surface_kind": "DISABLED_CALLBACK_SURFACE",
            "owning_deployable_id": "deployable_controlled_authority_gateway",
            "callback_profile_ref": "cb_drill_disabled",
            "provider_registration_allowed": False,
            "dns_required": False,
            "tls_posture": "NOT_APPLICABLE",
        },
    ]
    callback_refs = {profile["callback_profile_ref"] for profile in callback_profiles}
    for row in rows:
        if row["callback_profile_ref"] not in callback_refs:
            raise ValueError(f"Unknown callback profile ref {row['callback_profile_ref']}")
    return {
        "generated_at": TODAY,
        "contract_version": CONTRACT_VERSION,
        "domain_rows": rows,
        "summary": {
            "domain_row_count": len(rows),
            "provider_registration_capable_rows": sum(
                1 for row in rows if row["provider_registration_allowed"]
            ),
        },
    }


def build_test_user_and_seed_data_plan() -> dict[str, Any]:
    rows = [
        {
            "plan_id": "sandbox_application_registration_lifecycle",
            "environment_refs": [
                "env_local_provisioning_workstation",
                "env_shared_sandbox_integration",
                "env_preproduction_verification",
            ],
            "asset_class": "SANDBOX_APPLICATION",
            "owner_tenant_ref": "tenant_provider_sandbox_test_identity_pool",
            "provisioning_owner_role": "ENGINEERING",
            "automation_posture": "MIXED_BROWSER_AUTOMATION_AND_MANUAL_APPROVAL",
            "reuse_policy": "Reuse existing sandbox applications when viable; refresh activity to avoid automatic deletion.",
            "retention_or_expiry": "Deleted after 30 days without API calls; deleted after 6 months of inactivity after prior use.",
            "data_sensitivity": "NON_PRODUCTION_PROVIDER_CREDENTIALS",
            "source_refs": [
                external_source(
                    "https://developer.service.hmrc.gov.uk/api-documentation/docs/testing",
                    "Getting started",
                    "Sandbox application lifecycle rules.",
                )
            ],
        },
        {
            "plan_id": "sandbox_test_user_pool_individual",
            "environment_refs": [
                "env_local_provisioning_workstation",
                "env_shared_sandbox_integration",
                "env_preproduction_verification",
            ],
            "asset_class": "SANDBOX_TEST_USER_INDIVIDUAL",
            "owner_tenant_ref": "tenant_provider_sandbox_test_identity_pool",
            "provisioning_owner_role": "ENGINEERING",
            "automation_posture": "API_DRIVEN",
            "reuse_policy": "Check for reusable unused users before creating new ones.",
            "retention_or_expiry": "Unused users deleted by HMRC after 90 days.",
            "data_sensitivity": "SANDBOX_IDENTITY",
            "source_refs": [
                external_source(
                    "https://developer.service.hmrc.gov.uk/api-test-user",
                    "Create a test user",
                    "HMRC sandbox test-user lifecycle and generation rules.",
                )
            ],
        },
        {
            "plan_id": "sandbox_test_user_pool_agent",
            "environment_refs": [
                "env_local_provisioning_workstation",
                "env_shared_sandbox_integration",
                "env_preproduction_verification",
            ],
            "asset_class": "SANDBOX_TEST_USER_AGENT",
            "owner_tenant_ref": "tenant_provider_sandbox_test_identity_pool",
            "provisioning_owner_role": "ENGINEERING",
            "automation_posture": "API_DRIVEN",
            "reuse_policy": "Use Create Test User API for automated agent identity creation and retain inventory metadata internally.",
            "retention_or_expiry": "Unused users deleted by HMRC after 90 days.",
            "data_sensitivity": "SANDBOX_IDENTITY",
            "source_refs": [
                external_source(
                    "https://developer.service.hmrc.gov.uk/api-test-user",
                    "Create a test user",
                    "HMRC sandbox agent test-user generation rules.",
                )
            ],
        },
        {
            "plan_id": "sandbox_stateful_api_seed_data",
            "environment_refs": [
                "env_shared_sandbox_integration",
                "env_preproduction_verification",
            ],
            "asset_class": "SANDBOX_STATEFUL_SCENARIO_DATA",
            "owner_tenant_ref": "tenant_provider_sandbox_test_identity_pool",
            "provisioning_owner_role": "ENGINEERING_AND_TEST_AUTOMATION",
            "automation_posture": "API_AND_FIXTURE_DRIVEN",
            "reuse_policy": "Stateful or dynamic test scenarios are seeded intentionally and reset as needed; do not assume provider-wide immutability.",
            "retention_or_expiry": "Retain only as long as needed for candidate-bound authority sandbox coverage.",
            "data_sensitivity": "SANDBOX_STATEFUL_FIXTURE",
            "source_refs": [
                external_source(
                    "https://developer.service.hmrc.gov.uk/api-documentation/docs/testing",
                    "Test users, test data and stateful behaviour",
                    "HMRC sandbox supports stateful and dynamic testing for some APIs.",
                )
            ],
        },
        {
            "plan_id": "sandbox_authorisation_journey",
            "environment_refs": [
                "env_local_provisioning_workstation",
                "env_shared_sandbox_integration",
                "env_preproduction_verification",
            ],
            "asset_class": "SANDBOX_AUTHORITY_GRANT_FLOW",
            "owner_tenant_ref": "tenant_provider_sandbox_test_identity_pool",
            "provisioning_owner_role": "ENGINEERING_AND_TEST_AUTOMATION",
            "automation_posture": "BROWSER_AUTOMATION_WITH_CALLBACK_CHECKS",
            "reuse_policy": "Exercise grant and deny branches; do not assume sandbox sign-in automatically implies consent.",
            "retention_or_expiry": "Ephemeral per test run; retain only resulting evidence and inventory metadata.",
            "data_sensitivity": "SANDBOX_OAUTH_GRANT_METADATA",
            "source_refs": [
                external_source(
                    "https://developer.service.hmrc.gov.uk/api-documentation/docs/testing",
                    "Test the authorisation process",
                    "Sandbox user-restricted endpoint testing requires a full authorisation journey.",
                )
            ],
        },
        {
            "plan_id": "production_no_seed_data",
            "environment_refs": ["env_production"],
            "asset_class": "PRODUCTION_SEED_DATA",
            "owner_tenant_ref": "tenant_customer_runtime_isolation",
            "provisioning_owner_role": "OPERATIONS_AND_SECURITY",
            "automation_posture": "PROHIBITED",
            "reuse_policy": "Synthetic HMRC seed data and sandbox identities are forbidden in production.",
            "retention_or_expiry": "Not applicable because production seed data is not allowed.",
             "data_sensitivity": "PRODUCTION_DATA_PROHIBITION",
             "source_refs": [
                 heading_source(
                     RELEASE_GATES_PATH,
                    "2. Release gate",
                    "Production readiness requires exact blocking-gate evidence and forbids environment drift.",
                 ),
                 heading_source(
                     SECURITY_PATH,
                     "4. Browser, native-client, API, and transport hardening",
                    "Production posture must not weaken identity or credential boundaries.",
                ),
            ],
        },
        {
            "plan_id": "drill_restore_material",
            "environment_refs": ["env_disaster_recovery_drill"],
            "asset_class": "DRILL_RESTORE_DATA",
            "owner_tenant_ref": "tenant_break_glass_security_admin",
            "provisioning_owner_role": "BREAK_GLASS_SECURITY",
            "automation_posture": "APPROVAL_GATED",
            "reuse_policy": "Use redacted or tightly controlled restore snapshots only; destroy or re-key after drill completion.",
            "retention_or_expiry": "Per drill window and attestation policy.",
            "data_sensitivity": "RESTORE_MATERIAL",
            "source_refs": [
                heading_source(
                    DEPLOYMENT_PATH,
                    "5. Backup, restore, and DR rules",
                    "Restore material follows separate governance and attestation rules.",
                )
            ],
        },
    ]
    return {
        "generated_at": TODAY,
        "contract_version": CONTRACT_VERSION,
        "plan_rows": rows,
        "summary": {
            "plan_row_count": len(rows),
        },
    }


def build_deployable_environment_matrix(environment_catalog: dict[str, Any]) -> dict[str, Any]:
    env_map = {
        row["environment_id"]: row for row in environment_catalog["environment_records"]
    }
    rows = [
        {
            "deployable_id": "deployable_local_analysis_workspace",
            "deployable_kind": "LOCAL_WORKSPACE",
            "environment_refs": ["env_local_authoring"],
            "owning_boundary": "ENGINEERING_TOOLING",
            "secret_namespace_refs": ["sec_local_authoring"],
            "callback_profile_refs": [],
            "provider_profile_execution_allowed": False,
            "rationale": "Local deterministic analysis should not speak to live provider surfaces.",
        },
        {
            "deployable_id": "deployable_local_provisioning_workspace",
            "deployable_kind": "LOCAL_WORKSPACE",
            "environment_refs": ["env_local_provisioning_workstation"],
            "owning_boundary": "ENGINEERING_PROVISIONING",
            "secret_namespace_refs": ["sec_local_provisioning_sandbox"],
            "callback_profile_refs": [
                "cb_local_browser_loopback_sandbox",
                "cb_local_native_loopback_sandbox",
            ],
            "provider_profile_execution_allowed": False,
            "rationale": "Provisioning setup is allowed here, but canonical operation-family traffic is not.",
        },
        {
            "deployable_id": "deployable_ci_validation_runner",
            "deployable_kind": "CI_JOB",
            "environment_refs": ["env_ci_ephemeral_validation"],
            "owning_boundary": "CI",
            "secret_namespace_refs": ["sec_ci_ephemeral"],
            "callback_profile_refs": [],
            "provider_profile_execution_allowed": False,
            "rationale": "CI jobs remain non-provider runtimes with no stable callbacks.",
        },
        {
            "deployable_id": "deployable_ephemeral_review_web_shell",
            "deployable_kind": "REVIEW_DEPLOYABLE",
            "environment_refs": ["env_ephemeral_review_preview"],
            "owning_boundary": "WEB_PREVIEW",
            "secret_namespace_refs": ["sec_ephemeral_review"],
            "callback_profile_refs": ["cb_ephemeral_review_disallowed"],
            "provider_profile_execution_allowed": False,
            "rationale": "Preview shells are intentionally excluded from provider registration and trust.",
        },
        {
            "deployable_id": "deployable_operator_web_app",
            "deployable_kind": "WEB_UI",
            "environment_refs": [
                "env_shared_sandbox_integration",
                "env_preproduction_verification",
                "env_production",
            ],
            "owning_boundary": "BROWSER_OPERATOR_SURFACE",
            "secret_namespace_refs": [],
            "callback_profile_refs": ["cb_sandbox_web", "cb_preprod_web", "cb_production_web"],
            "provider_profile_execution_allowed": False,
            "rationale": "Browser apps initiate human flows but never directly hold or execute provider credentials.",
        },
        {
            "deployable_id": "deployable_client_portal_web_app",
            "deployable_kind": "WEB_UI",
            "environment_refs": [
                "env_shared_sandbox_integration",
                "env_preproduction_verification",
                "env_production",
            ],
            "owning_boundary": "CLIENT_PORTAL_SURFACE",
            "secret_namespace_refs": [],
            "callback_profile_refs": ["cb_sandbox_web", "cb_preprod_web", "cb_production_web"],
            "provider_profile_execution_allowed": False,
            "rationale": "Portal routes may trigger authority workflows, but transport remains server mediated.",
        },
        {
            "deployable_id": "deployable_northbound_api_session_gateway",
            "deployable_kind": "SERVER_GATEWAY",
            "environment_refs": [
                "env_shared_sandbox_integration",
                "env_preproduction_verification",
                "env_production",
                "env_disaster_recovery_drill",
            ],
            "owning_boundary": "NORTHBOUND_API",
            "secret_namespace_refs": [
                "sec_sandbox_runtime",
                "sec_preprod_runtime",
                "sec_production_runtime",
                "sec_drill_runtime",
            ],
            "callback_profile_refs": ["cb_sandbox_web", "cb_preprod_web", "cb_production_web"],
            "provider_profile_execution_allowed": False,
            "rationale": "The northbound gateway owns user sessions and redirect handling, not raw provider token transport.",
        },
        {
            "deployable_id": "deployable_manifest_orchestrator",
            "deployable_kind": "SERVER_WORKFLOW",
            "environment_refs": [
                "env_shared_sandbox_integration",
                "env_preproduction_verification",
                "env_production",
                "env_disaster_recovery_drill",
            ],
            "owning_boundary": "CONTROL_PLANE",
            "secret_namespace_refs": [
                "sec_sandbox_runtime",
                "sec_preprod_runtime",
                "sec_production_runtime",
                "sec_drill_runtime",
            ],
            "callback_profile_refs": [],
            "provider_profile_execution_allowed": False,
            "rationale": "Manifest orchestration consumes provider-profile refs and evidence but does not act as the transport gateway.",
        },
        {
            "deployable_id": "deployable_stage_workers",
            "deployable_kind": "SERVER_WORKER",
            "environment_refs": [
                "env_shared_sandbox_integration",
                "env_preproduction_verification",
                "env_production",
                "env_disaster_recovery_drill",
            ],
            "owning_boundary": "CONTROL_PLANE",
            "secret_namespace_refs": [
                "sec_sandbox_runtime",
                "sec_preprod_runtime",
                "sec_production_runtime",
                "sec_drill_runtime",
            ],
            "callback_profile_refs": [],
            "provider_profile_execution_allowed": False,
            "rationale": "Workers prepare and reconcile state but authority transport still happens through the controlled gateway.",
        },
        {
            "deployable_id": "deployable_controlled_authority_gateway",
            "deployable_kind": "CONTROLLED_EDGE",
            "environment_refs": [
                "env_shared_sandbox_integration",
                "env_preproduction_verification",
                "env_production",
            ],
            "owning_boundary": "AUTHORITY_GATEWAY",
            "secret_namespace_refs": [
                "sec_sandbox_web_authority",
                "sec_sandbox_desktop_authority",
                "sec_sandbox_batch_authority",
                "sec_preprod_web_authority",
                "sec_preprod_desktop_authority",
                "sec_preprod_batch_authority",
                "sec_production_web_authority",
                "sec_production_desktop_authority",
                "sec_production_batch_authority",
            ],
            "callback_profile_refs": [
                "cb_sandbox_batch",
                "cb_preprod_batch",
                "cb_production_batch",
            ],
            "provider_profile_execution_allowed": True,
            "rationale": "Only the controlled authority gateway executes canonical provider profiles and owns provider ingress correlation.",
        },
        {
            "deployable_id": "deployable_read_projector_stream_broker",
            "deployable_kind": "SERVER_DATA_PLANE",
            "environment_refs": [
                "env_shared_sandbox_integration",
                "env_preproduction_verification",
                "env_production",
                "env_disaster_recovery_drill",
            ],
            "owning_boundary": "READ_SIDE_AND_STREAMING",
            "secret_namespace_refs": [
                "sec_sandbox_runtime",
                "sec_preprod_runtime",
                "sec_production_runtime",
                "sec_drill_runtime",
            ],
            "callback_profile_refs": [],
            "provider_profile_execution_allowed": False,
            "rationale": "Projection and stream delivery remain internal data-plane responsibilities.",
        },
        {
            "deployable_id": "deployable_primary_control_store",
            "deployable_kind": "DATA_STORE",
            "environment_refs": [
                "env_shared_sandbox_integration",
                "env_preproduction_verification",
                "env_production",
                "env_disaster_recovery_drill",
            ],
            "owning_boundary": "PRIMARY_CONTROL_STORE",
            "secret_namespace_refs": [
                "sec_sandbox_runtime",
                "sec_preprod_runtime",
                "sec_production_runtime",
                "sec_drill_restore_material",
            ],
            "callback_profile_refs": [],
            "provider_profile_execution_allowed": False,
            "rationale": "The primary store records provider profile refs and authority state but is not the provider caller.",
        },
        {
            "deployable_id": "deployable_append_only_audit_store",
            "deployable_kind": "DATA_STORE",
            "environment_refs": [
                "env_shared_sandbox_integration",
                "env_preproduction_verification",
                "env_production",
                "env_disaster_recovery_drill",
            ],
            "owning_boundary": "AUDIT_STORE",
            "secret_namespace_refs": [
                "sec_sandbox_runtime",
                "sec_preprod_runtime",
                "sec_production_runtime",
                "sec_drill_restore_material",
            ],
            "callback_profile_refs": [],
            "provider_profile_execution_allowed": False,
            "rationale": "Audit evidence is immutable and environment-bound but not a provider-execution surface.",
        },
        {
            "deployable_id": "deployable_object_store",
            "deployable_kind": "OBJECT_STORE",
            "environment_refs": [
                "env_shared_sandbox_integration",
                "env_preproduction_verification",
                "env_production",
                "env_disaster_recovery_drill",
            ],
            "owning_boundary": "OBJECT_STORE",
            "secret_namespace_refs": [
                "sec_sandbox_runtime",
                "sec_preprod_runtime",
                "sec_production_runtime",
                "sec_drill_restore_material",
            ],
            "callback_profile_refs": [],
            "provider_profile_execution_allowed": False,
            "rationale": "Object storage stays environment-bound and may contain replay or restore bodies, not live provider credentials.",
        },
        {
            "deployable_id": "deployable_queue_broker",
            "deployable_kind": "QUEUE_BROKER",
            "environment_refs": [
                "env_shared_sandbox_integration",
                "env_preproduction_verification",
                "env_production",
                "env_disaster_recovery_drill",
            ],
            "owning_boundary": "QUEUE_AND_STREAM",
            "secret_namespace_refs": [
                "sec_sandbox_runtime",
                "sec_preprod_runtime",
                "sec_production_runtime",
                "sec_drill_runtime",
            ],
            "callback_profile_refs": [],
            "provider_profile_execution_allowed": False,
            "rationale": "The queue or broker carries work and receipts but does not own provider identity.",
        },
        {
            "deployable_id": "deployable_secrets_vault_kms",
            "deployable_kind": "SECRETS_AND_KMS",
            "environment_refs": [
                "env_shared_sandbox_integration",
                "env_preproduction_verification",
                "env_production",
                "env_disaster_recovery_drill",
            ],
            "owning_boundary": "TOKEN_VAULT_AND_KMS",
            "secret_namespace_refs": [
                "sec_sandbox_runtime",
                "sec_sandbox_web_authority",
                "sec_sandbox_desktop_authority",
                "sec_sandbox_batch_authority",
                "sec_preprod_runtime",
                "sec_preprod_web_authority",
                "sec_preprod_desktop_authority",
                "sec_preprod_batch_authority",
                "sec_production_runtime",
                "sec_production_web_authority",
                "sec_production_desktop_authority",
                "sec_production_batch_authority",
                "sec_drill_runtime",
                "sec_drill_restore_material",
            ],
            "callback_profile_refs": [],
            "provider_profile_execution_allowed": False,
            "rationale": "Vault and KMS hold secret material for all live environments but are still not the originator of provider requests.",
        },
        {
            "deployable_id": "deployable_desktop_release_channel",
            "deployable_kind": "DELIVERY_CHANNEL",
            "environment_refs": ["env_preproduction_verification", "env_production"],
            "owning_boundary": "NATIVE_DELIVERY",
            "secret_namespace_refs": [],
            "callback_profile_refs": [],
            "provider_profile_execution_allowed": False,
            "rationale": "The release channel distributes signed native binaries; it does not own provider integration.",
        },
        {
            "deployable_id": "deployable_native_macos_operator_client",
            "deployable_kind": "NATIVE_CLIENT",
            "environment_refs": [
                "env_shared_sandbox_integration",
                "env_preproduction_verification",
                "env_production",
            ],
            "owning_boundary": "NATIVE_OPERATOR_WORKSPACE",
            "secret_namespace_refs": [],
            "callback_profile_refs": [
                "cb_sandbox_desktop",
                "cb_preprod_desktop",
                "cb_production_desktop",
            ],
            "provider_profile_execution_allowed": False,
            "rationale": "The native macOS client participates in installed-app redirects but still must not hold raw authority tokens.",
        },
    ]
    for row in rows:
        row["environment_refs"] = normalize_environment_order(row["environment_refs"])
        for env_ref in row["environment_refs"]:
            if env_ref not in env_map:
                raise ValueError(f"Unknown environment ref {env_ref} on {row['deployable_id']}")
    return {
        "generated_at": TODAY,
        "contract_version": CONTRACT_VERSION,
        "rows": rows,
        "summary": {
            "deployable_count": len(rows),
            "provider_executing_deployable_count": sum(
                1 for row in rows if row["provider_profile_execution_allowed"]
            ),
        },
    }


def build_fraud_header_profiles() -> list[dict[str, Any]]:
    return [
        {
            "fraud_header_profile_ref": "fph_web_app_via_server",
            "connection_method": "WEB_APP_VIA_SERVER",
            "summary": "Interactive browser traffic through vendor-controlled intermediary servers.",
            "source_refs": [
                external_source(
                    "https://developer.service.hmrc.gov.uk/guides/fraud-prevention/connection-method/web-app-via-server/",
                    "Web application via server",
                    "HMRC defines the required fraud headers for browser-via-server traffic.",
                ),
                heading_source(
                    AUTHORITY_PATH,
                    "9.7 Fraud-prevention header rule",
                    "The algorithm requires fraud-header posture to be represented as profile data.",
                ),
            ],
        },
        {
            "fraud_header_profile_ref": "fph_desktop_app_via_server",
            "connection_method": "DESKTOP_APP_VIA_SERVER",
            "summary": "Interactive desktop traffic through vendor-controlled intermediary servers.",
            "source_refs": [
                external_source(
                    "https://developer.service.hmrc.gov.uk/guides/fraud-prevention/connection-method/desktop-app-via-server/",
                    "Desktop application via server",
                    "HMRC defines the required fraud headers for desktop-via-server traffic.",
                ),
                heading_source(
                    AUTHORITY_PATH,
                    "9.7 Fraud-prevention header rule",
                    "The algorithm requires fraud-header posture to be represented as profile data.",
                ),
            ],
        },
        {
            "fraud_header_profile_ref": "fph_batch_process_direct",
            "connection_method": "BATCH_PROCESS_DIRECT",
            "summary": "Batch or unattended traffic where end users do not initiate the action.",
            "source_refs": [
                external_source(
                    "https://developer.service.hmrc.gov.uk/guides/fraud-prevention/connection-method/batch-process-direct/",
                    "Batch process direct",
                    "HMRC defines the required fraud headers for unattended direct flows.",
                ),
                external_source(
                    "https://developer.service.hmrc.gov.uk/guides/fraud-prevention/connection-method/",
                    "What you need to send",
                    "HMRC clarifies when batch direct is lawful.",
                ),
            ],
        },
    ]


def build_authority_provider_profile_catalog(
    provider_inventory: dict[str, Any],
    callback_profiles: list[dict[str, Any]],
    token_binding_profiles: list[dict[str, Any]],
) -> dict[str, Any]:
    api_inventory = {
        record["api_key"]: record for record in provider_inventory["api_records"]
    }
    callback_profiles_by_ref = {
        profile["callback_profile_ref"]: profile for profile in callback_profiles
    }
    token_profiles_by_ref = {
        profile["token_binding_profile_ref"]: profile for profile in token_binding_profiles
    }

    environment_profile_specs = [
        {
            "environment_ref": "env_shared_sandbox_integration",
            "environment_short": "sandbox",
            "provider_environment": "sandbox",
            "api_base_profile": "hmrc_income_tax_mtd_sandbox_base",
            "callback_profile_ref_by_method": {
                "WEB_APP_VIA_SERVER": "cb_sandbox_web",
                "DESKTOP_APP_VIA_SERVER": "cb_sandbox_desktop",
                "BATCH_PROCESS_DIRECT": "cb_sandbox_batch",
            },
            "token_binding_profile_ref_by_method": {
                "WEB_APP_VIA_SERVER": "tb_sandbox_web_gateway_bound",
                "DESKTOP_APP_VIA_SERVER": "tb_sandbox_desktop_gateway_bound",
                "BATCH_PROCESS_DIRECT": "tb_sandbox_batch_gateway_bound",
            },
            "secret_namespace_ref_by_method": {
                "WEB_APP_VIA_SERVER": "sec_sandbox_web_authority",
                "DESKTOP_APP_VIA_SERVER": "sec_sandbox_desktop_authority",
                "BATCH_PROCESS_DIRECT": "sec_sandbox_batch_authority",
            },
            "sandbox_test_data_strategy": "HMRC_CREATE_TEST_USER_API_PLUS_STATEFUL_DYNAMIC_SCENARIOS",
        },
        {
            "environment_ref": "env_preproduction_verification",
            "environment_short": "preprod",
            "provider_environment": "sandbox",
            "api_base_profile": "hmrc_income_tax_mtd_sandbox_base",
            "callback_profile_ref_by_method": {
                "WEB_APP_VIA_SERVER": "cb_preprod_web",
                "DESKTOP_APP_VIA_SERVER": "cb_preprod_desktop",
                "BATCH_PROCESS_DIRECT": "cb_preprod_batch",
            },
            "token_binding_profile_ref_by_method": {
                "WEB_APP_VIA_SERVER": "tb_preprod_web_gateway_bound",
                "DESKTOP_APP_VIA_SERVER": "tb_preprod_desktop_gateway_bound",
                "BATCH_PROCESS_DIRECT": "tb_preprod_batch_gateway_bound",
            },
            "secret_namespace_ref_by_method": {
                "WEB_APP_VIA_SERVER": "sec_preprod_web_authority",
                "DESKTOP_APP_VIA_SERVER": "sec_preprod_desktop_authority",
                "BATCH_PROCESS_DIRECT": "sec_preprod_batch_authority",
            },
            "sandbox_test_data_strategy": "REUSE_SANDBOX_FIXTURES_AND_CANDIDATE_BOUND_PROOF",
        },
        {
            "environment_ref": "env_production",
            "environment_short": "production",
            "provider_environment": "production",
            "api_base_profile": "hmrc_income_tax_mtd_production_base",
            "callback_profile_ref_by_method": {
                "WEB_APP_VIA_SERVER": "cb_production_web",
                "DESKTOP_APP_VIA_SERVER": "cb_production_desktop",
                "BATCH_PROCESS_DIRECT": "cb_production_batch",
            },
            "token_binding_profile_ref_by_method": {
                "WEB_APP_VIA_SERVER": "tb_production_web_gateway_bound",
                "DESKTOP_APP_VIA_SERVER": "tb_production_desktop_gateway_bound",
                "BATCH_PROCESS_DIRECT": "tb_production_batch_gateway_bound",
            },
            "secret_namespace_ref_by_method": {
                "WEB_APP_VIA_SERVER": "sec_production_web_authority",
                "DESKTOP_APP_VIA_SERVER": "sec_production_desktop_authority",
                "BATCH_PROCESS_DIRECT": "sec_production_batch_authority",
            },
            "sandbox_test_data_strategy": "NONE_PRODUCTION_ONLY",
        },
    ]

    profiles: list[dict[str, Any]] = []
    for env_spec in environment_profile_specs:
        for api_def in HMRC_API_DEFS:
            inventory_record = api_inventory[api_def["api_key"]]
            for connection_method in CONNECTION_METHOD_ORDER:
                allowed_operations = OPERATION_FAMILIES_BY_API_AND_METHOD[api_def["api_key"]][
                    connection_method
                ]
                if not allowed_operations:
                    continue
                method_detail = CONNECTION_METHOD_DETAILS[connection_method]
                profile_id = (
                    f"profile_{env_spec['environment_short']}_{api_def['api_key']}_"
                    f"{method_detail['method_short']}"
                )
                callback_profile_ref = env_spec["callback_profile_ref_by_method"][
                    connection_method
                ]
                token_binding_profile_ref = env_spec["token_binding_profile_ref_by_method"][
                    connection_method
                ]
                secret_namespace_ref = env_spec["secret_namespace_ref_by_method"][
                    connection_method
                ]
                if callback_profile_ref not in callback_profiles_by_ref:
                    raise ValueError(f"Missing callback profile {callback_profile_ref}")
                if token_binding_profile_ref not in token_profiles_by_ref:
                    raise ValueError(
                        f"Missing token binding profile {token_binding_profile_ref}"
                    )
                profiles.append(
                    {
                        "profile_id": profile_id,
                        "provider_name": "HMRC",
                        "provider_environment": env_spec["provider_environment"],
                        "environment_ref": env_spec["environment_ref"],
                        "api_key": api_def["api_key"],
                        "api_display_name": api_def["display_name"],
                        "api_base_profile": env_spec["api_base_profile"],
                        "api_version": inventory_record["current_observed_version"],
                        "schema_version": inventory_record["oas_version"],
                        "fraud_header_profile_ref": method_detail[
                            "fraud_header_profile_ref"
                        ],
                        "token_binding_profile_ref": token_binding_profile_ref,
                        "callback_profile_ref": callback_profile_ref,
                        "compatible_product_chain_refs": [
                            "chain_hmrc_income_tax_mtd_oauth_and_fraud",
                            api_def["product_chain_ref"],
                        ],
                        "allowed_operation_family_refs": allowed_operations,
                        "audience_class": method_detail["audience_class"],
                        "connection_method": connection_method,
                        "secret_namespace_ref": secret_namespace_ref,
                        "sandbox_test_data_strategy": env_spec["sandbox_test_data_strategy"],
                        "source_file": inventory_record["documentation_url"],
                        "source_heading_or_logical_block": f"{api_def['display_name']} API overview",
                        "rationale": (
                            f"{api_def['display_name']} in {env_spec['environment_short']} "
                            f"for {connection_method} traffic. {method_detail['rationale']}"
                        ),
                        "oauth_scopes": inventory_record["oauth_scopes"],
                        "authorization_url": inventory_record["authorization_url"],
                        "token_url": inventory_record["token_url"],
                        "refresh_url": inventory_record["refresh_url"],
                        "documentation_last_updated": inventory_record[
                            "documentation_last_updated"
                        ],
                        "verified_on": inventory_record["verified_on"],
                        "verification_status": inventory_record["verification_status"],
                        "requires_live_revalidation_before_runtime_use": inventory_record[
                            "requires_live_revalidation_before_runtime_use"
                        ],
                        "source_refs": inventory_record["source_refs"]
                        + [
                            heading_source(
                                AUTHORITY_PATH,
                                "9.4 Operation profiles",
                                "Authority operation profiles freeze product profile, provider environment, and fraud-header posture.",
                            ),
                            heading_source(
                                MANIFEST_FREEZE_PATH,
                                "5.12 Provider and environment capture",
                                "Manifest capture requires provider name, environment, base profile, version, schema version, and binding refs.",
                            ),
                        ],
                    }
                )

    fraud_header_profiles = build_fraud_header_profiles()
    typed_gaps = [
        {
            "gap_id": "gap_reference_surface_may_need_more_than_business_details",
            "severity": "INFO",
            "summary": "Reference reads are currently anchored to Business Details in the canonical profile set",
            "rationale": "If later implementation introduces Self Assessment Individual Details or other reference APIs as first-class dependencies, a narrower reference-read profile split should be added rather than silently widening the current profile IDs.",
            "source_refs": [
                heading_source(
                    AUTHORITY_PATH,
                    "9.2 Protocol scope",
                    "The operation family is broader than a single provider API family.",
                )
            ],
        },
        {
            "gap_id": "gap_post_finalisation_amendment_api_split_not_yet_exposed",
            "severity": "INFO",
            "summary": "`AUTH_SUBMIT_POST_FINALISATION_AMENDMENT` still maps to the property and self-employment business APIs only",
            "rationale": "If later corpus work exposes a dedicated HMRC amendment surface beyond the current baseline, the profile map should split that family explicitly.",
            "source_refs": [
                heading_source(
                    AUTHORITY_PATH,
                    "9.2 Protocol scope",
                    "The protocol family names the operation but does not enumerate a narrower provider API split.",
                )
            ],
        },
    ]
    profile_family_summary: list[dict[str, Any]] = []
    grouped_profiles: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for profile in profiles:
        grouped_profiles[(profile["environment_ref"], profile["connection_method"])].append(
            profile
        )
    for (environment_ref, connection_method), group in sorted(grouped_profiles.items()):
        profile_family_summary.append(
            {
                "environment_ref": environment_ref,
                "connection_method": connection_method,
                "profile_count": len(group),
                "api_keys": ordered_unique(profile["api_key"] for profile in group),
                "allowed_operation_family_refs": ordered_unique(
                    operation_family
                    for profile in group
                    for operation_family in profile["allowed_operation_family_refs"]
                ),
            }
        )
    return {
        "generated_at": TODAY,
        "contract_version": CONTRACT_VERSION,
        "fraud_header_profiles": fraud_header_profiles,
        "token_binding_profiles": token_binding_profiles,
        "callback_profiles": callback_profiles,
        "profiles": profiles,
        "profile_family_summary": profile_family_summary,
        "typed_gaps": typed_gaps,
        "summary": {
            "profile_count": len(profiles),
            "fraud_header_profile_count": len(fraud_header_profiles),
            "token_binding_profile_count": len(token_binding_profiles),
            "callback_profile_count": len(callback_profiles),
            "typed_gap_count": len(typed_gaps),
        },
    }


def build_operation_family_profile_matrix(profile_catalog: dict[str, Any]) -> dict[str, Any]:
    profiles_by_env_and_operation: dict[tuple[str, str], list[str]] = defaultdict(list)
    profiles = profile_catalog["profiles"]
    profile_lookup = {profile["profile_id"]: profile for profile in profiles}
    for profile in profiles:
        for operation_family in profile["allowed_operation_family_refs"]:
            profiles_by_env_and_operation[(profile["environment_ref"], operation_family)].append(
                profile["profile_id"]
            )
    rows: list[dict[str, Any]] = []
    for operation_family in REQUIRED_OPERATION_FAMILIES:
        env_bindings: list[dict[str, Any]] = []
        for environment_ref in ENVIRONMENT_ORDER:
            allowed_profile_ids = sorted(
                profiles_by_env_and_operation.get((environment_ref, operation_family), [])
            )
            if environment_ref in PROFILE_ENVIRONMENT_ORDER:
                disposition = "ALLOWED" if allowed_profile_ids else "BLOCKED_BY_PROFILE_GAP"
            else:
                disposition = "BLOCKED_BY_ENVIRONMENT_POSTURE"
            env_bindings.append(
                {
                    "environment_ref": environment_ref,
                    "disposition": disposition,
                    "allowed_profile_ids": allowed_profile_ids,
                    "provider_environments": ordered_unique(
                        profile_lookup[profile_id]["provider_environment"]
                        for profile_id in allowed_profile_ids
                    ),
                    "connection_methods": normalize_connection_order(
                        ordered_unique(
                            profile_lookup[profile_id]["connection_method"]
                            for profile_id in allowed_profile_ids
                        )
                    ),
                }
            )
        rows.append(
            {
                "operation_family": operation_family,
                "environment_bindings": env_bindings,
            }
        )
    typed_gaps = [
        {
            "gap_id": "gap_local_and_ephemeral_envs_have_no_operation_family_profiles",
            "severity": "RESOLVED_BY_POLICY",
            "summary": "Local authoring, local provisioning, CI, preview, and drill environments explicitly block canonical authority operation families",
            "rationale": "The catalog now makes those blocks explicit instead of leaving them implicit.",
        }
    ]
    return {
        "generated_at": TODAY,
        "contract_version": CONTRACT_VERSION,
        "rows": rows,
        "typed_gaps": typed_gaps,
        "summary": {
            "operation_family_count": len(rows),
        },
    }


def validate_catalogs(
    environment_catalog: dict[str, Any],
    domain_matrix: dict[str, Any],
    secret_plan: dict[str, Any],
    profile_catalog: dict[str, Any],
    operation_profile_matrix: dict[str, Any],
    provider_inventory: dict[str, Any],
    authority_operation_catalog: dict[str, Any],
) -> None:
    source_operation_families = sorted(
        record["operation_family"]
        for record in authority_operation_catalog["operation_records"]
    )
    if source_operation_families != sorted(REQUIRED_OPERATION_FAMILIES):
        raise ValueError(
            "Authority operation catalog no longer matches the required operation family set"
        )

    environment_ids = {
        row["environment_id"] for row in environment_catalog["environment_records"]
    }
    callback_profile_refs = {
        profile["callback_profile_ref"] for profile in profile_catalog["callback_profiles"]
    }
    secret_namespace_refs = {
        row["secret_namespace_ref"] for row in secret_plan["secret_namespace_rows"]
    }

    for domain_row in domain_matrix["domain_rows"]:
        if domain_row["environment_ref"] not in environment_ids:
            raise ValueError(
                f"Unknown environment ref on domain matrix row {domain_row['domain_row_id']}"
            )
        if domain_row["callback_profile_ref"] not in callback_profile_refs:
            raise ValueError(
                f"Unknown callback profile ref on domain matrix row {domain_row['domain_row_id']}"
            )
        if not domain_row["owning_deployable_id"]:
            raise ValueError(
                f"Every domain row must identify an owning deployable: {domain_row['domain_row_id']}"
            )

    namespace_provider_groups: dict[str, set[str]] = defaultdict(set)
    for row in secret_plan["secret_namespace_rows"]:
        for provider_environment in row["provider_environment_refs"]:
            namespace_provider_groups[row["secret_namespace_ref"]].add(provider_environment)
    for namespace_ref, provider_environments in namespace_provider_groups.items():
        if provider_environments == {"sandbox", "production"}:
            raise ValueError(f"Secret namespace {namespace_ref} spans sandbox and production")

    profile_ids = {profile["profile_id"] for profile in profile_catalog["profiles"]}
    for profile in profile_catalog["profiles"]:
        if profile["secret_namespace_ref"] not in secret_namespace_refs:
            raise ValueError(f"Unknown secret namespace on profile {profile['profile_id']}")
        if profile["callback_profile_ref"] not in callback_profile_refs:
            raise ValueError(f"Unknown callback profile on profile {profile['profile_id']}")
        if profile["environment_ref"] not in environment_ids:
            raise ValueError(f"Unknown environment ref on profile {profile['profile_id']}")
        if not profile["allowed_operation_family_refs"]:
            raise ValueError(f"Profile {profile['profile_id']} must declare operations")

    for row in operation_profile_matrix["rows"]:
        if row["operation_family"] not in REQUIRED_OPERATION_FAMILIES:
            raise ValueError(f"Unexpected operation family {row['operation_family']}")
        for binding in row["environment_bindings"]:
            if binding["environment_ref"] not in environment_ids:
                raise ValueError(
                    f"Unknown environment ref on operation matrix row {row['operation_family']}"
                )
            unknown_profiles = set(binding["allowed_profile_ids"]) - profile_ids
            if unknown_profiles:
                raise ValueError(
                    f"Unknown profile ids on operation matrix row {row['operation_family']}: {sorted(unknown_profiles)}"
                )

    api_record_count = provider_inventory["summary"]["api_record_count"]
    expected_profiles = api_record_count * len(PROFILE_ENVIRONMENT_ORDER) * len(CONNECTION_METHOD_ORDER)
    if profile_catalog["summary"]["profile_count"] != expected_profiles:
        raise ValueError(
            f"Expected {expected_profiles} profiles but found {profile_catalog['summary']['profile_count']}"
        )


def build_docs(
    environment_catalog: dict[str, Any],
    deployable_matrix: dict[str, Any],
    tenant_inventory: dict[str, Any],
    profile_catalog: dict[str, Any],
    operation_profile_matrix: dict[str, Any],
    domain_matrix: dict[str, Any],
    secret_plan: dict[str, Any],
    test_user_plan: dict[str, Any],
    provider_inventory: dict[str, Any],
) -> tuple[str, str, str]:
    env_rows = [
        [
            row["environment_id"],
            row["environment_family"],
            row["provider_environment_binding"],
            row["authority_operation_posture"],
            row["secret_namespace_refs"],
            row["callback_profile_refs"],
        ]
        for row in environment_catalog["environment_records"]
    ]
    tenant_rows = [
        [
            row["tenant_id"],
            row["tenant_class"],
            row["environment_refs"],
            row["audience_class_refs"],
            row["purpose"],
        ]
        for row in tenant_inventory["tenant_rows"]
    ]
    profile_summary_rows = [
        [
            row["environment_ref"],
            row["connection_method"],
            row["profile_count"],
            row["api_keys"],
            row["allowed_operation_family_refs"],
        ]
        for row in profile_catalog["profile_family_summary"]
    ]
    operation_rows = []
    for row in operation_profile_matrix["rows"]:
        env_lookup = {
            binding["environment_ref"]: binding for binding in row["environment_bindings"]
        }
        operation_rows.append(
            [
                row["operation_family"],
                env_lookup["env_shared_sandbox_integration"]["allowed_profile_ids"],
                env_lookup["env_preproduction_verification"]["allowed_profile_ids"],
                env_lookup["env_production"]["allowed_profile_ids"],
            ]
        )

    api_rows = [
        [
            record["display_name"],
            record["current_observed_version"],
            record["sandbox_base_url"],
            record["production_base_url"],
            record["oauth_scopes"],
            record["verification_status"],
        ]
        for record in provider_inventory["api_records"]
    ]

    candidate_rows = [
        [
            row["candidate_label"],
            row["disposition"],
            row.get("environment_ref") or "n/a",
            row["rationale"],
        ]
        for row in environment_catalog["evaluated_environment_candidates"]
    ]

    catalog_doc = "\n".join(
        [
            "# Environment, Tenant, and Authority Profile Catalog",
            "",
            f"Generated on `{TODAY}`. This pack normalizes the canonical environment, tenant, callback, secret, and HMRC authority-profile vocabulary that later provisioning and implementation work must consume mechanically.",
            "",
            "## Summary",
            "",
            f"- Environments: `{environment_catalog['summary']['environment_count']}` accepted from `{len(environment_catalog['evaluated_environment_candidates'])}` evaluated candidates.",
            f"- Tenants: `{tenant_inventory['summary']['tenant_count']}` with `{tenant_inventory['summary']['audience_class_count']}` explicit audience classes.",
            f"- Provider profiles: `{profile_catalog['summary']['profile_count']}` across `{provider_inventory['summary']['api_record_count']}` HMRC API families, `{len(PROFILE_ENVIRONMENT_ORDER)}` live product environments, and `{len(CONNECTION_METHOD_ORDER)}` connection methods.",
            f"- Callback profiles: `{profile_catalog['summary']['callback_profile_count']}`.",
            f"- Secret namespaces: `{secret_plan['summary']['secret_namespace_count']}`.",
            "",
            "## Environment Inventory",
            "",
            markdown_table(
                [
                    "Environment",
                    "Family",
                    "Provider Env Binding",
                    "Authority Posture",
                    "Secret Namespaces",
                    "Callback Profiles",
                ],
                env_rows,
            ),
            "",
            "## Tenant Inventory",
            "",
            markdown_table(
                ["Tenant", "Class", "Environments", "Audience Classes", "Purpose"],
                tenant_rows,
            ),
            "",
            "## Provider Profile Families",
            "",
            markdown_table(
                [
                    "Environment",
                    "Connection Method",
                    "Profile Count",
                    "API Families",
                    "Allowed Operation Families",
                ],
                profile_summary_rows,
            ),
            "",
            "## Operation Family Bindings",
            "",
            markdown_table(
                [
                    "Operation Family",
                    "Sandbox Profiles",
                    "Preprod Profiles",
                    "Production Profiles",
                ],
                operation_rows,
            ),
            "",
            "## HMRC Baseline Observations",
            "",
            markdown_table(
                [
                    "API",
                    "Observed Version",
                    "Sandbox Base URL",
                    "Production Base URL",
                    "Scopes",
                    "Verification",
                ],
                api_rows,
            ),
            "",
            "## Environment Candidate Decisions",
            "",
            markdown_table(
                ["Candidate", "Disposition", "Environment Ref", "Rationale"],
                candidate_rows,
            ),
            "",
            "## Typed Gaps",
            "",
            *[
                f"- `{gap['gap_id']}`: {gap['summary']}"
                for gap in (
                    environment_catalog["typed_gaps"]
                    + profile_catalog["typed_gaps"]
                    + provider_inventory["typed_gaps"]
                )
            ],
            "",
        ]
    )

    promotion_rows = [
        ["Local authoring", "Local provisioning", "No promotion; separate local boundaries", "No live provider traffic, no shared secrets."],
        ["Local provisioning", "Shared sandbox", "Provisioning and callback registration only", "Sandbox bootstrap material stays sandbox scoped."],
        ["CI / Preview", "Shared sandbox", "Not a direct promotion path", "Ephemeral hosts cannot own provider trust."],
        ["Shared sandbox", "Pre-production", "Candidate-bound release verification", "Preprod keeps production-like controls but still uses HMRC sandbox."],
        ["Pre-production", "Production", "Governed release promotion", "Production gets distinct callback hosts, secret namespaces, and HMRC production credentials."],
        ["Production", "DR drill", "No automatic promotion", "Drill environments remain separate and do not inherit live provider trust by default."],
    ]
    domain_rows = [
        [
            row["domain_row_id"],
            row["environment_ref"],
            row["host_pattern"],
            row["surface_kind"],
            row["owning_deployable_id"],
            row["provider_registration_allowed"],
        ]
        for row in domain_matrix["domain_rows"]
    ]
    namespace_rows = [
        [
            row["secret_namespace_ref"],
            row["environment_refs"],
            row["provider_environment_refs"] or "n/a",
            row["secret_classes"],
            row["mixing_rule"],
        ]
        for row in secret_plan["secret_namespace_rows"]
    ]
    test_rows = [
        [
            row["plan_id"],
            row["environment_refs"],
            row["asset_class"],
            row["owner_tenant_ref"],
            row["retention_or_expiry"],
        ]
        for row in test_user_plan["plan_rows"]
    ]
    separation_doc = "\n".join(
        [
            "# Environment Promotion and Data Separation Rules",
            "",
            f"Generated on `{TODAY}`. These rules are the operational constraints that later provisioning work must follow when instantiating the environment and authority-profile catalog.",
            "",
            "## Promotion Path",
            "",
            markdown_table(
                ["From", "To", "Meaning", "Control"],
                promotion_rows,
            ),
            "",
            "## Callback and Domain Matrix",
            "",
            markdown_table(
                [
                    "Domain Row",
                    "Environment",
                    "Host Pattern",
                    "Surface Kind",
                    "Owning Deployable",
                    "Provider Registration Allowed",
                ],
                domain_rows,
            ),
            "",
            "## Secret Namespace Plan",
            "",
            markdown_table(
                [
                    "Namespace",
                    "Environments",
                    "Provider Envs",
                    "Secret Classes",
                    "Mixing Rule",
                ],
                namespace_rows,
            ),
            "",
            "## Sandbox Test Users and Seed Data",
            "",
            markdown_table(
                [
                    "Plan",
                    "Environments",
                    "Asset Class",
                    "Owner Tenant",
                    "Retention / Expiry",
                ],
                test_rows,
            ),
            "",
            "## Hard Separation Rules",
            "",
            "- Sandbox and production never share callback hosts, secret namespaces, or implied trust.",
            "- Native macOS uses installed-app style loopback callbacks where needed, but raw authority tokens remain server and vault bound.",
            "- Preview and CI environments are explicitly non-provider environments even when web deployables exist there.",
            "- Batch or unattended reconciliation does not inherit interactive fraud-header or token-binding posture.",
            "- Production forbids sandbox test users, synthetic seed data, and sandbox callback registrations.",
            "",
        ]
    )

    mermaid_lines = [
        "flowchart LR",
        '  E0["Local Authoring"]',
        '  E1["Local Provisioning"]',
        '  E2["CI / Preview"]',
        '  E3["Shared Sandbox"]',
        '  E4["Pre-production"]',
        '  E5["Production"]',
        '  E6["DR Drill"]',
        '  T0["Engineering / Automation"]',
        '  T1["Operator / Governance"]',
        '  T2["Customer Runtime"]',
        '  T3["Sandbox Fixture Pool"]',
        '  T4["Break-glass Security"]',
        '  H0["HMRC Sandbox Profiles"]',
        '  H1["HMRC Production Profiles"]',
        '  S0["Sandbox Secret Domains"]',
        '  S1["Production Secret Domains"]',
        '  C0["Sandbox Callback Hosts"]',
        '  C1["Production Callback Hosts"]',
        "  E0 --> T0",
        "  E1 --> T0",
        "  E1 --> T3",
        "  E2 --> T0",
        "  E3 --> T0",
        "  E3 --> T1",
        "  E3 --> T3",
        "  E4 --> T1",
        "  E4 --> T4",
        "  E5 --> T1",
        "  E5 --> T2",
        "  E5 --> T4",
        "  E6 --> T1",
        "  E6 --> T4",
        "  E3 --> H0",
        "  E4 --> H0",
        "  E5 --> H1",
        "  E3 --> S0",
        "  E4 --> S0",
        "  E5 --> S1",
        "  E3 --> C0",
        "  E4 --> C0",
        "  E5 --> C1",
        '  X0["Native standalone provider environment"]:::rejected',
        "  X0 -. rejected .-> E3",
        "  X0 -. rejected .-> E4",
        "  X0 -. rejected .-> E5",
        "  classDef rejected fill:#fce7e7,stroke:#b91c1c,color:#7f1d1d;",
    ]
    return catalog_doc, separation_doc, "\n".join(mermaid_lines) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build the canonical environment, tenant, and authority-profile catalog."
    )
    parser.add_argument(
        "--refresh-hmrc",
        action="store_true",
        help="Refresh HMRC provider metadata live from official documentation. This is the default behavior.",
    )
    parser.add_argument(
        "--skip-live-hmrc",
        action="store_true",
        help="Use the curated HMRC baseline without live network refresh.",
    )
    args = parser.parse_args()

    skip_live_hmrc = args.skip_live_hmrc and not args.refresh_hmrc

    dependency_register = load_json(DEPENDENCY_REGISTER_PATH)
    authority_boundary = load_json(AUTHORITY_BOUNDARY_PATH)
    authority_operation_map = load_json(AUTHORITY_OPERATION_MAP_PATH)
    authority_operation_catalog = load_json(AUTHORITY_OPERATION_CATALOG_PATH)
    session_flow_matrix = load_json(SESSION_FLOW_MATRIX_PATH)
    release_artifact_matrix = load_json(RELEASE_ARTIFACT_MATRIX_PATH)
    task_dod_matrix = load_json(TASK_DOD_MATRIX_PATH)

    required_dependency_keys = {
        "ENVIRONMENT_TENANT_AND_AUTHORITY_PROFILE_MATRIX",
        "AUTHORITY_SANDBOX_APP_REGISTRATION",
        "AUTHORITY_PRODUCTION_APP_REGISTRATION",
        "AUTHORITY_REDIRECT_URI_CALLBACK_AND_SCOPE_CONFIGURATION",
        "AUTHORITY_FRAUD_PREVENTION_PROFILE_BINDINGS",
        "SECRETS_MANAGER_OR_TOKEN_VAULT",
        "KMS_HSM_ROOT_OF_TRUST",
        "DNS_TLS_WAF_AND_EDGE_DELIVERY",
    }
    found_dependency_keys = {
        row["dependency_key"] for row in dependency_register["dependencies"]
    }
    missing_dependencies = required_dependency_keys - found_dependency_keys
    if missing_dependencies:
        raise ValueError(
            f"Missing dependency register keys required by pc_0031: {sorted(missing_dependencies)}"
        )
    if authority_boundary["responsibility_record_count"] < 8:
        raise ValueError("Authority boundary matrix appears incomplete")
    if authority_operation_map["operation_family_count"] != len(REQUIRED_OPERATION_FAMILIES):
        raise ValueError("Authority operation boundary map does not cover all operation families")
    if len(session_flow_matrix["flows"]) < 5:
        raise ValueError("Session flow matrix appears incomplete")
    if release_artifact_matrix["summary"]["artifact_count"] < 10:
        raise ValueError("Release artifact matrix appears incomplete")
    if task_dod_matrix["summary"]["task_count"] < 100:
        raise ValueError("Definition-of-done matrix appears incomplete")

    provider_inventory = build_provider_api_inventory(skip_live_hmrc=skip_live_hmrc)
    callback_profiles = build_callback_profiles()
    token_binding_profiles = build_token_binding_profiles()
    environment_catalog = build_environments(callback_profiles)
    secret_plan = build_secret_namespace_plan()
    tenant_inventory = build_tenant_inventory()
    domain_matrix = build_domain_dns_callback_matrix(callback_profiles)
    test_user_plan = build_test_user_and_seed_data_plan()
    profile_catalog = build_authority_provider_profile_catalog(
        provider_inventory=provider_inventory,
        callback_profiles=callback_profiles,
        token_binding_profiles=token_binding_profiles,
    )
    deployable_matrix = build_deployable_environment_matrix(environment_catalog)
    operation_profile_matrix = build_operation_family_profile_matrix(profile_catalog)

    validate_catalogs(
        environment_catalog=environment_catalog,
        domain_matrix=domain_matrix,
        secret_plan=secret_plan,
        profile_catalog=profile_catalog,
        operation_profile_matrix=operation_profile_matrix,
        provider_inventory=provider_inventory,
        authority_operation_catalog=authority_operation_catalog,
    )

    catalog_doc, separation_doc, mermaid = build_docs(
        environment_catalog=environment_catalog,
        deployable_matrix=deployable_matrix,
        tenant_inventory=tenant_inventory,
        profile_catalog=profile_catalog,
        operation_profile_matrix=operation_profile_matrix,
        domain_matrix=domain_matrix,
        secret_plan=secret_plan,
        test_user_plan=test_user_plan,
        provider_inventory=provider_inventory,
    )

    json_write(ENVIRONMENT_CATALOG_PATH, environment_catalog)
    json_write(DEPLOYABLE_MATRIX_PATH, deployable_matrix)
    json_write(TENANT_MATRIX_PATH, tenant_inventory)
    json_write(PROFILE_CATALOG_PATH, profile_catalog)
    json_write(OPERATION_PROFILE_MATRIX_PATH, operation_profile_matrix)
    json_write(DOMAIN_MATRIX_PATH, domain_matrix)
    json_write(SECRET_NAMESPACE_PATH, secret_plan)
    json_write(TEST_USER_PLAN_PATH, test_user_plan)
    json_write(PROVIDER_VERSION_PATH, provider_inventory)
    text_write(DOC_CATALOG_PATH, catalog_doc)
    text_write(DOC_SEPARATION_PATH, separation_doc)
    text_write(MERMAID_PATH, mermaid)

    summary = {
        "generated_at": TODAY,
        "environment_count": environment_catalog["summary"]["environment_count"],
        "tenant_count": tenant_inventory["summary"]["tenant_count"],
        "profile_count": profile_catalog["summary"]["profile_count"],
        "api_record_count": provider_inventory["summary"]["api_record_count"],
        "secret_namespace_count": secret_plan["summary"]["secret_namespace_count"],
        "domain_row_count": domain_matrix["summary"]["domain_row_count"],
        "test_plan_row_count": test_user_plan["summary"]["plan_row_count"],
        "hmrc_verification_mode": provider_inventory["default_build_mode"],
    }
    print(json.dumps(summary, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
