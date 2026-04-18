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
PROMPT_DIR = ROOT / "PROMPT"

ACTOR_MODEL_PATH = ALGORITHM_DIR / "actor_and_authority_model.md"
NORTHBOUND_PATH = ALGORITHM_DIR / "northbound_api_and_session_contract.md"
SECURITY_PATH = ALGORITHM_DIR / "security_and_runtime_hardening_contract.md"
PORTAL_PATH = ALGORITHM_DIR / "customer_client_portal_experience_contract.md"
MACOS_PATH = ALGORITHM_DIR / "macos_native_operator_workspace_blueprint.md"
AUTHORITY_PATH = ALGORITHM_DIR / "authority_interaction_protocol.md"
CHECKLIST_PATH = PROMPT_DIR / "Checklist.md"

DEPENDENCY_REGISTER_PATH = DATA_ANALYSIS_DIR / "dependency_register.json"
CREDENTIAL_INVENTORY_PATH = DATA_ANALYSIS_DIR / "credential_secret_inventory.json"
SHELL_ROUTE_MATRIX_PATH = DATA_ANALYSIS_DIR / "shell_route_matrix.json"
NATIVE_SCENE_TOPOLOGY_PATH = DATA_ANALYSIS_DIR / "native_scene_window_topology.json"
CONTINUITY_MATRIX_PATH = DATA_ANALYSIS_DIR / "continuity_recovery_matrix.json"

ADR_PATH = DOCS_ARCH_ADR_DIR / "ADR-003-identity-step-up-and-session-model.md"
COMPARISON_PATH = (
    DOCS_ARCH_ADR_DIR / "ADR-003-identity-step-up-and-session-model-comparison.md"
)
SCORECARD_PATH = (
    DOCS_ARCH_ADR_DIR / "ADR-003-identity-step-up-and-session-model-scorecard.json"
)
SESSION_FLOW_MATRIX_PATH = DATA_ANALYSIS_DIR / "session_flow_matrix.json"
STEP_UP_INVALIDATION_PATH = DATA_ANALYSIS_DIR / "step_up_trigger_and_invalidation_matrix.json"
BOUNDARY_PATH = DATA_ANALYSIS_DIR / "browser_native_automation_identity_boundary.json"
DEEP_LINK_RULES_PATH = DATA_ANALYSIS_DIR / "deep_link_invite_and_resume_rules.json"
MERMAID_PATH = DIAGRAMS_ANALYSIS_DIR / "ADR-003-identity-session-topology.mmd"

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
        "| " + " | ".join(md_escape(cell) for cell in row) + " |"
        for row in rows
    ]
    return "\n".join([header_line, divider_line, *body_lines])


def lower_first(value: str) -> str:
    if not value:
        return value
    return value[0].lower() + value[1:]


def build_supporting_context() -> dict[str, Any]:
    dependency_register = load_json(DEPENDENCY_REGISTER_PATH)
    credentials = load_json(CREDENTIAL_INVENTORY_PATH)
    shell_matrix = load_json(SHELL_ROUTE_MATRIX_PATH)
    native_topology = load_json(NATIVE_SCENE_TOPOLOGY_PATH)
    continuity_matrix = load_json(CONTINUITY_MATRIX_PATH)

    dependency_keys = {
        row["dependency_key"]: row for row in dependency_register["dependencies"]
    }
    credential_rows = {
        row["credential_key"]: row for row in credentials["credential_records"]
    }
    continuity_rows = {
        row["scenario_id"]: row for row in continuity_matrix["scenarios"]
    }

    return {
        "dependency_count": dependency_register["dependency_count"],
        "route_count": shell_matrix["summary"]["route_count"],
        "shell_family_count": shell_matrix["summary"]["shell_family_count"],
        "continuity_scenario_count": continuity_matrix["summary"]["scenario_count"],
        "native_auth_transport": native_topology["auth_handoff"]["transport"],
        "native_auth_resume_rule": native_topology["auth_handoff"]["resume_rule"],
        "idp_client_dependency": dependency_keys["IDP_TENANT_AND_APPLICATION_CLIENTS"],
        "idp_policy_dependency": dependency_keys["IDP_ROLE_SCOPE_MFA_AND_SESSION_POLICIES"],
        "idp_client_secret_record": credential_rows["idp-application-client-secrets"],
        "idp_admin_material_record": credential_rows[
            "idp-federation-signing-and-admin-material"
        ],
        "deep_link_restore": continuity_rows["deep_link_entry_and_restore"],
        "access_rebind_after_scope_change": continuity_rows[
            "access_rebind_after_scope_change"
        ],
    }


def build_criteria() -> list[dict[str, Any]]:
    return [
        {
            "criterion_id": "actor_authority_and_delegation_integrity",
            "label": "Actor, authority, and delegation integrity",
            "weight": 12,
            "priority": "HARD_REQUIREMENT",
            "rationale": "The chosen model must preserve principal class, delegation basis, authority-link readiness, client scope, and masking posture as separate machine-checkable layers rather than collapsing them into one ambient login concept.",
            "source_refs": [
                heading_ref(ACTOR_MODEL_PATH, "3.4 Authority layers"),
                heading_ref(ACTOR_MODEL_PATH, "3.5 Actor-to-authority relationships"),
                heading_ref(ACTOR_MODEL_PATH, "3.6 Principal context schema"),
                heading_ref(ACTOR_MODEL_PATH, "3.10 Delegation rules"),
            ],
        },
        {
            "criterion_id": "non_delegable_step_up_and_human_gate_support",
            "label": "Non-delegable action and step-up coverage",
            "weight": 12,
            "priority": "HARD_REQUIREMENT",
            "rationale": "High-trust actions must surface as explicit human-gated paths with frozen approval or step-up evidence instead of relying on generic session age or client-side heuristics.",
            "source_refs": [
                heading_ref(ACTOR_MODEL_PATH, "3.11 Non-delegable and step-up actions"),
                text_ref(
                    ACTOR_MODEL_PATH,
                    "Any `CLIENT_SIGNATORY` action that creates declaration or sign-off truth SHALL require the session to satisfy the frozen signatory policy, including `subject_identity_assurance_level = STEP_UP_VERIFIED` whenever the current approval pack demands step-up.",
                    "client_signatory_step_up_rule",
                ),
                text_ref(
                    NORTHBOUND_PATH,
                    "- sign-off commands SHALL include fresh step-up proof whenever the approval pack or frozen policy marks step-up as required",
                    "fresh_step_up_proof_for_signoff",
                ),
                heading_ref(PORTAL_PATH, "Approval and sign-off flow"),
            ],
        },
        {
            "criterion_id": "authority_binding_and_token_lineage_safety",
            "label": "Authority binding and token-lineage safety",
            "weight": 12,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Authority interactions must remain bound to the exact principal, token lineage, authority link, access binding, and frozen step-up or approval evidence that authorized them.",
            "source_refs": [
                heading_ref(AUTHORITY_PATH, "B. `AuthorityBinding`"),
                heading_ref(AUTHORITY_PATH, "9.5 Preflight sequence"),
                heading_ref(AUTHORITY_PATH, "9.6 Token and client binding rule"),
                heading_ref(SECURITY_PATH, "3. Secret, key, and token handling"),
            ],
        },
        {
            "criterion_id": "browser_interactive_security_posture",
            "label": "Browser interactive security posture",
            "weight": 11,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Interactive browser writes must resist XSS and CSRF, keep sensitive session material out of unsafe browser storage, and force server-side validation against current actor and session state.",
            "source_refs": [
                heading_ref(NORTHBOUND_PATH, "8. Session, browser, and native-client rules"),
                heading_ref(SECURITY_PATH, "2. Identity, session, and command trust"),
                heading_ref(SECURITY_PATH, "4. Browser, native-client, API, and transport hardening"),
                text_ref(
                    SECURITY_PATH,
                    "3. no browser-origin write action without authenticated session and anti-CSRF protection, and no",
                    "browser_write_requires_session_and_csrf",
                ),
            ],
        },
        {
            "criterion_id": "native_session_security_and_local_storage_fit",
            "label": "Native session security and local-storage fit",
            "weight": 10,
            "priority": "HARD_REQUIREMENT",
            "rationale": "The model must fit a first-class macOS client that authenticates through the system browser, stores only allowed product-session material locally, and purges on revocation or scope drift.",
            "source_refs": [
                heading_ref(MACOS_PATH, "7. Authentication and session strategy"),
                heading_ref(MACOS_PATH, "8. Persistence model"),
                heading_ref(MACOS_PATH, "11. Security and runtime posture for the desktop client"),
                heading_ref(SECURITY_PATH, "4. Browser, native-client, API, and transport hardening"),
            ],
        },
        {
            "criterion_id": "machine_automation_separation",
            "label": "Machine automation separation from human sessions",
            "weight": 9,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Automation clients must use distinct credentials and identity posture so service principals cannot masquerade as human interactive sessions or satisfy human-only step-up and approval paths.",
            "source_refs": [
                heading_ref(ACTOR_MODEL_PATH, "3.13 Machine-actor rules"),
                heading_ref(NORTHBOUND_PATH, "8. Session, browser, and native-client rules"),
                heading_ref(SECURITY_PATH, "2. Identity, session, and command trust"),
            ],
        },
        {
            "criterion_id": "revocation_rotation_and_resume_invalidation",
            "label": "Revocation, rotation, and resume invalidation safety",
            "weight": 10,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Step-up completion, logout, revocation, tenant switch, and device or binding drift must rotate challenge state, invalidate stale resumability artifacts, and prevent future command acceptance until lawful revalidation.",
            "source_refs": [
                heading_ref(NORTHBOUND_PATH, "7. Stream and reconnect rules"),
                heading_ref(NORTHBOUND_PATH, "8. Session, browser, and native-client rules"),
                heading_ref(MACOS_PATH, "7. Authentication and session strategy"),
                heading_ref(SECURITY_PATH, "2. Identity, session, and command trust"),
            ],
        },
        {
            "criterion_id": "deep_link_invite_upload_and_same_object_continuity",
            "label": "Deep-link, invite, upload, and same-object continuity",
            "weight": 10,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Invite links, deep links, upload sessions, and external handoffs must preserve same-object continuity while still forcing authenticated upgrade before any sensitive mutation.",
            "source_refs": [
                heading_ref(NORTHBOUND_PATH, "2.2 Customer/Client portal and upload-session surfaces"),
                heading_ref(NORTHBOUND_PATH, "8. Session, browser, and native-client rules"),
                heading_ref(PORTAL_PATH, "Onboarding flow"),
                heading_ref(PORTAL_PATH, "Artifact, print, and browser-handoff rules"),
                text_ref(
                    PORTAL_PATH,
                    "- `route_context` SHALL carry contextual deep-link focus and return-path data without turning contextual routes into new",
                    "route_context_deep_link_focus_and_return_path",
                ),
            ],
        },
        {
            "criterion_id": "stale_view_rebase_and_multi_surface_consistency",
            "label": "Stale-view, rebase, and multi-surface consistency",
            "weight": 6,
            "priority": "HARD_REQUIREMENT",
            "rationale": "The same model must compose with stale-view rejection, route-visible rebase, reconnect, and native restore without letting cached session posture or resumed commands outrun current truth.",
            "source_refs": [
                heading_ref(NORTHBOUND_PATH, "6. Concurrency and stale-view rules"),
                heading_ref(NORTHBOUND_PATH, "7. Stream and reconnect rules"),
                heading_ref(PORTAL_PATH, "Playwright validation minimum"),
                text_ref(
                    MACOS_PATH,
                    "- stale-view rejection and duplicate suppression behave identically across browser and native clients",
                    "native_browser_stale_view_parity",
                ),
            ],
        },
        {
            "criterion_id": "auditability_and_forensic_clarity",
            "label": "Auditability and forensic clarity",
            "weight": 4,
            "priority": "STRONG_PREFERENCE",
            "rationale": "The model should produce one explainable lineage from human or machine identity through authorization, step-up evidence, session revocation, and authority request issuance.",
            "source_refs": [
                heading_ref(ACTOR_MODEL_PATH, "3.9 Policy decision model"),
                heading_ref(ACTOR_MODEL_PATH, "3.15 Frontend and governance-console rendering contract"),
                heading_ref(SECURITY_PATH, "2. Identity, session, and command trust"),
                heading_ref(AUTHORITY_PATH, "9.15 Audit invariants"),
            ],
        },
        {
            "criterion_id": "roadmap_alignment_and_common_idp_operability",
            "label": "Roadmap alignment and common IdP operability",
            "weight": 4,
            "priority": "STRONG_PREFERENCE",
            "rationale": "The ADR should map cleanly onto the already-scheduled IdP provisioning, session persistence, revocation, web integration, and native authentication tasks without forcing a bespoke vendor-specific posture.",
            "source_refs": [
                heading_ref(SECURITY_PATH, "2. Identity, session, and command trust"),
                text_ref(CHECKLIST_PATH, "`pc_0039`", "pc_0039"),
                text_ref(CHECKLIST_PATH, "`pc_0040`", "pc_0040"),
                text_ref(CHECKLIST_PATH, "`pc_0085`", "pc_0085"),
                text_ref(CHECKLIST_PATH, "`pc_0094`", "pc_0094"),
                text_ref(CHECKLIST_PATH, "`pc_0237`", "pc_0237"),
                text_ref(CHECKLIST_PATH, "`pc_0238`", "pc_0238"),
                text_ref(CHECKLIST_PATH, "`pc_0291`", "pc_0291"),
            ],
        },
    ]


def build_alternatives() -> list[dict[str, Any]]:
    return [
        {
            "alternative_id": "standards_based_server_mediated_sessions",
            "label": "Standards-based human auth with server-mediated browser sessions, system-browser native auth, and separate machine credentials",
            "summary": "Use OIDC/OAuth-style human authentication through a shared identity provider, run browser interactions through secure server-mediated sessions with anti-CSRF, use system-browser-managed auth for native macOS, and issue distinct short-lived machine credentials for automation. Keep raw authority tokens in a governed vault and require step-up rotation before sensitive mutations continue.",
            "strengths": [
                "Best fit for the corpus requirement that interactive browser writes remain authenticated, CSRF-protected, and server-validated rather than token-self-authorized in the client.",
                "Preserves the native system-browser and Keychain posture without weakening same-object continuity or authority-token isolation.",
                "Separates machine automation from human sessions cleanly while still supporting short-lived non-browser credentials where the corpus explicitly allows them.",
            ],
            "risks": [
                "Requires a deliberate backend session plane, revocation propagation, and anti-CSRF design rather than a thin static frontend-only posture.",
                "Needs careful shared modeling of challenge-state rotation, stale-view revalidation, and resume-token invalidation across browser and native surfaces.",
            ],
            "criterion_scores": {
                "actor_authority_and_delegation_integrity": {
                    "raw_score": 4.75,
                    "note": "Keeps principal class, delegation, authority link, masking posture, and machine versus human identity as distinct server-enforced facts.",
                },
                "non_delegable_step_up_and_human_gate_support": {
                    "raw_score": 4.75,
                    "note": "Fits explicit `REQUIRE_STEP_UP` and `REQUIRE_APPROVAL` outcomes cleanly and keeps sign-off or authority-sensitive actions behind frozen human-gate evidence.",
                },
                "authority_binding_and_token_lineage_safety": {
                    "raw_score": 4.75,
                    "note": "Best fit for persisted `AuthorityBinding`, token-lineage revalidation, and request-envelope sealing before network send.",
                },
                "browser_interactive_security_posture": {
                    "raw_score": 4.75,
                    "note": "Browser writes stay behind secure cookies or equivalent same-origin protected session posture plus anti-CSRF and server-side policy checks.",
                },
                "native_session_security_and_local_storage_fit": {
                    "raw_score": 4.75,
                    "note": "Directly matches `ASWebAuthenticationSession`-style auth and Keychain-backed product-session storage without raw authority credentials on device.",
                },
                "machine_automation_separation": {
                    "raw_score": 4.5,
                    "note": "Human and machine credentials remain explicitly different, and machine clients can use short-lived creds without pretending to satisfy human step-up.",
                },
                "revocation_rotation_and_resume_invalidation": {
                    "raw_score": 4.75,
                    "note": "Supports session challenge rotation, revocation-aware cache purge, and invalidation of resume or upload control artifacts after step-up or revocation.",
                },
                "deep_link_invite_upload_and_same_object_continuity": {
                    "raw_score": 4.5,
                    "note": "Allows limited-context entry and external handoff while still forcing authenticated upgrade before upload, acknowledgement, or sign-off.",
                },
                "stale_view_rebase_and_multi_surface_consistency": {
                    "raw_score": 4.25,
                    "note": "A strong fit for typed stale-view rejection and same-object rebase, provided browser and native clients share the same session-lineage semantics.",
                },
                "auditability_and_forensic_clarity": {
                    "raw_score": 4.5,
                    "note": "Creates one explainable chain from IdP session through access binding, step-up evidence, revocation, and authority request issuance.",
                },
                "roadmap_alignment_and_common_idp_operability": {
                    "raw_score": 4.25,
                    "note": "Maps directly to the existing roadmap tasks for IdP client setup, MFA and session policy, actor-session persistence, revocation services, and native auth integration.",
                },
            },
        },
        {
            "alternative_id": "spa_bearer_tokens_in_browser_storage",
            "label": "SPA-centric bearer-token model with browser-held access tokens and minimal server session state",
            "summary": "Authenticate humans through standard OIDC/OAuth flows but let browser clients hold access tokens or refresh tokens in web storage, rely mostly on token self-contained claims for ongoing session state, and keep backend session state minimal. Use the same token-first pattern where possible for portal, operator browser, and some resume flows.",
            "strengths": [
                "Simplifies some frontend deployment and avoids a heavier server-side session layer.",
                "Can look attractive for pure API-centric SPAs and commodity IdP quickstarts.",
            ],
            "risks": [
                "Directly weakens the corpus requirement for secure browser session posture with anti-CSRF and server-side current-session validation.",
                "Makes revocation, step-up rotation, stale-view rebound, and same-object deep-link recovery more brittle because sensitive state lives too close to the browser runtime.",
            ],
            "criterion_scores": {
                "actor_authority_and_delegation_integrity": {
                    "raw_score": 2.0,
                    "note": "It is harder to keep delegation basis, authority-link posture, and current masking posture server-authoritative when the browser is treated as the durable session carrier.",
                },
                "non_delegable_step_up_and_human_gate_support": {
                    "raw_score": 2.25,
                    "note": "Step-up can be bolted on, but token-refresh-driven UX makes it easier to blur fresh step-up proof with stale browser-held session state.",
                },
                "authority_binding_and_token_lineage_safety": {
                    "raw_score": 2.25,
                    "note": "Persisted authority binding still exists server-side, but browser-held bearer posture introduces more pressure to trust client-carried identity context than the corpus allows.",
                },
                "browser_interactive_security_posture": {
                    "raw_score": 1.5,
                    "note": "Bearer tokens in browser storage are the weakest fit for the corpus's secure cookie, same-origin session, and anti-CSRF requirements.",
                },
                "native_session_security_and_local_storage_fit": {
                    "raw_score": 3.0,
                    "note": "Native could still secure local material better than the browser, but the overall product model remains centered on browser-held tokens rather than system-browser-backed sessions.",
                },
                "machine_automation_separation": {
                    "raw_score": 2.0,
                    "note": "A broad token-first philosophy increases the risk of conceptual drift between human interactive sessions and machine credential posture.",
                },
                "revocation_rotation_and_resume_invalidation": {
                    "raw_score": 2.0,
                    "note": "Step-up rotation and immediate revocation are materially harder when browser-held tokens remain usable until expiry or ad hoc refresh logic catches up.",
                },
                "deep_link_invite_upload_and_same_object_continuity": {
                    "raw_score": 3.0,
                    "note": "Client-controlled state can preserve context, but upgrade gating and request-binding safety become less trustworthy if sensitive mutation logic trusts browser session material too early.",
                },
                "stale_view_rebase_and_multi_surface_consistency": {
                    "raw_score": 2.25,
                    "note": "Keeping browser, native, and reconnect semantics aligned is harder when each client is tempted to infer more from locally held token state.",
                },
                "auditability_and_forensic_clarity": {
                    "raw_score": 2.5,
                    "note": "Audit trails remain possible, but the resulting lineage is less crisp because important session posture shifts happen closer to the client.",
                },
                "roadmap_alignment_and_common_idp_operability": {
                    "raw_score": 3.5,
                    "note": "Commodity IdPs support this style easily, but it does not align well with the roadmap items that explicitly call for revocation, device binding, CSRF protection, and native system-browser auth restoration.",
                },
            },
        },
        {
            "alternative_id": "embedded_webview_and_blended_token_flows",
            "label": "Embedded-webview or blended token model for browser and native flows",
            "summary": "Use a mixture of embedded web views, browser-hosted auth surfaces, and shared token-handling conventions across browser and native clients so sign-in, step-up, and some authority-linked checkpoints happen inside product-controlled web shells wherever convenient.",
            "strengths": [
                "Can appear to reduce context switching by keeping more of the journey inside a product-controlled shell.",
                "May simplify some visual continuity work if security and provider restrictions are ignored.",
            ],
            "risks": [
                "Directly conflicts with the explicit rules preferring system-browser or platform-auth-session handoff and limiting embedded web views to low-risk documentation or help.",
                "Blurs the trust boundary between native session material, browser session posture, and authority-owned checkpoints in ways the corpus repeatedly forbids.",
            ],
            "criterion_scores": {
                "actor_authority_and_delegation_integrity": {
                    "raw_score": 2.25,
                    "note": "Blended token and shell posture make it easier for trust boundaries to become implicit rather than machine-readable.",
                },
                "non_delegable_step_up_and_human_gate_support": {
                    "raw_score": 2.5,
                    "note": "It can present step-up inline, but the trustworthiness of that inline posture is weaker when embedded surfaces are overused for sign-in or authority checkpoints.",
                },
                "authority_binding_and_token_lineage_safety": {
                    "raw_score": 2.0,
                    "note": "Authority-token lineage and handoff posture become harder to reason about when credentials and challenge state cross embedded shells.",
                },
                "browser_interactive_security_posture": {
                    "raw_score": 2.0,
                    "note": "Still weaker than the chosen model because embedded or blended token patterns tend to reintroduce browser-visible credential handling and muddier CSRF posture.",
                },
                "native_session_security_and_local_storage_fit": {
                    "raw_score": 1.5,
                    "note": "This is the worst fit for the explicit native rule preferring `ASWebAuthenticationSession` or equivalent system-browser-managed flows and forbidding raw authority credentials on device.",
                },
                "machine_automation_separation": {
                    "raw_score": 2.0,
                    "note": "Mixed token handling does little to clarify machine-human separation and can make the overall posture more ambiguous.",
                },
                "revocation_rotation_and_resume_invalidation": {
                    "raw_score": 2.25,
                    "note": "Revocation and challenge-state invalidation are harder to enforce uniformly when multiple embedded shells and token caches participate.",
                },
                "deep_link_invite_upload_and_same_object_continuity": {
                    "raw_score": 2.5,
                    "note": "Visual continuity may look smoother, but the corpus explicitly prefers same-object recovery through governed return targets, not through collapsing security boundaries into one shell.",
                },
                "stale_view_rebase_and_multi_surface_consistency": {
                    "raw_score": 2.25,
                    "note": "Blended shell rules make stale-view and resume semantics harder to keep identical across browser and native clients.",
                },
                "auditability_and_forensic_clarity": {
                    "raw_score": 2.75,
                    "note": "Lineage is still observable, but the provenance of sign-in, step-up, and authority handoff becomes harder to explain precisely.",
                },
                "roadmap_alignment_and_common_idp_operability": {
                    "raw_score": 2.5,
                    "note": "It fights both the native delivery roadmap and the revocation plus CSRF work already planned for backend and frontend implementation.",
                },
            },
        },
    ]


def validate_inputs(criteria: list[dict[str, Any]], alternatives: list[dict[str, Any]]) -> None:
    if len(alternatives) < 3:
        raise ValueError("ADR-003 requires at least three serious alternatives")
    criterion_ids = {item["criterion_id"] for item in criteria}
    if len(criterion_ids) != len(criteria):
        raise ValueError("Duplicate criteria IDs detected")
    total_weight = sum(int(item["weight"]) for item in criteria)
    if total_weight != 100:
        raise ValueError(f"Criteria weights must sum to 100, got {total_weight}")
    for criterion in criteria:
        if criterion["priority"] not in {
            "HARD_REQUIREMENT",
            "STRONG_PREFERENCE",
            "DEFERRED_CONCERN",
        }:
            raise ValueError(f"Invalid priority: {criterion['priority']}")
    for alternative in alternatives:
        if set(alternative["criterion_scores"]) != criterion_ids:
            raise ValueError(
                f"{alternative['alternative_id']} does not cover every criterion"
            )
        for score_entry in alternative["criterion_scores"].values():
            raw_score = float(score_entry["raw_score"])
            if raw_score < 1 or raw_score > 5:
                raise ValueError(f"Scores must be within 1..5, got {raw_score}")


def calculate_results(
    criteria: list[dict[str, Any]], alternatives: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    criterion_map = {criterion["criterion_id"]: criterion for criterion in criteria}
    results: list[dict[str, Any]] = []
    for alternative in alternatives:
        criterion_breakdown: list[dict[str, Any]] = []
        weighted_total = 0.0
        for criterion in criteria:
            entry = alternative["criterion_scores"][criterion["criterion_id"]]
            weighted_score = round(
                float(entry["raw_score"]) * criterion["weight"] / 5.0, 2
            )
            weighted_total = round(weighted_total + weighted_score, 2)
            criterion_breakdown.append(
                {
                    "criterion_id": criterion["criterion_id"],
                    "label": criterion["label"],
                    "priority": criterion["priority"],
                    "weight": criterion["weight"],
                    "raw_score": float(entry["raw_score"]),
                    "weighted_score": weighted_score,
                    "note": entry["note"],
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
                "weighted_total": weighted_total,
            }
        )
    results.sort(key=lambda item: (-item["weighted_total"], item["alternative_id"]))
    for rank, result in enumerate(results, 1):
        result["rank"] = rank
    return results


def build_session_flow_matrix(supporting_context: dict[str, Any]) -> dict[str, Any]:
    flows = [
        {
            "flow_id": "browser_operator_interactive",
            "label": "Interactive browser operator session",
            "channel": "BROWSER",
            "principal_classes": [
                "TENANT_ADMIN",
                "PREPARER",
                "REVIEWER",
                "APPROVER",
                "AUDITOR",
                "SUPPORT_OPERATOR",
            ],
            "entry_posture": "OIDC/OAuth human sign-in through the chosen IdP, then server-mediated interactive session resolution.",
            "session_carrier": "Secure `HttpOnly`, same-site cookie or equivalent same-origin protected session plus anti-CSRF binding.",
            "local_storage_posture": "Only derivable route/cache state; interactive trust remains server-authoritative.",
            "sensitive_mutation_posture": "Governance, authority-link, approval, and submission actions require current actor-session validation and may trigger step-up or approval.",
            "step_up_posture": "Contained escalation path tied to the current object; step-up completion rotates effective challenge state before later command acceptance.",
            "authority_credential_posture": "No raw authority credentials in the browser; authority calls remain server-mediated from persisted `AuthorityBinding` and vault-held token lineage.",
            "blocked_or_forbidden": [
                "No browser-origin write action without authenticated session and anti-CSRF.",
                "No unsafe reliance on browser-held bearer tokens as the primary browser trust anchor.",
            ],
            "continuity_rules": [
                "Route and shell continuity stay same-object and same-shell where the broader frontend contract requires it.",
                "Stale-view rejection returns typed recovery metadata rather than mutating the current route in place.",
            ],
            "source_refs": [
                heading_ref(ACTOR_MODEL_PATH, "3.3 Actor classes"),
                heading_ref(NORTHBOUND_PATH, "8. Session, browser, and native-client rules"),
                heading_ref(SECURITY_PATH, "2. Identity, session, and command trust"),
                heading_ref(SECURITY_PATH, "4. Browser, native-client, API, and transport hardening"),
            ],
        },
        {
            "flow_id": "browser_portal_user_interactive",
            "label": "Interactive browser client-portal session",
            "channel": "BROWSER",
            "principal_classes": [
                "CLIENT_VIEWER",
                "CLIENT_CONTRIBUTOR",
                "CLIENT_SIGNATORY",
            ],
            "entry_posture": "Normal sign-in or post-invite upgrade into a fully authenticated portal session bound to one principal class, client scope, delegation basis, and masking posture.",
            "session_carrier": "Secure browser session cookie or equivalent same-origin protected session plus anti-CSRF binding.",
            "local_storage_posture": "Client-safe derivable snapshots and resumability only; governed truth stays server-side.",
            "sensitive_mutation_posture": "Document upload, acknowledgement, and sign-off happen only after authenticated upgrade into the normal portal session; `CLIENT_SIGNATORY` sign-off may additionally require `STEP_UP_VERIFIED` assurance.",
            "step_up_posture": "The sign-off flow keeps step-up as a contained checkpoint on the same `Approvals` route and same approval-pack context.",
            "authority_credential_posture": "No client-held authority credential material; authority-owned checkpoints may hand off externally but must return to the same route and focus target.",
            "blocked_or_forbidden": [
                "Invite and deep-link entry may not accept upload, acknowledgement, or sign-off before upgrade.",
                "A stale or superseded approval pack may not be signed.",
            ],
            "continuity_rules": [
                "The portal preserves declaration context and approval-pack focus through step-up completion.",
                "Notification or address-bar deep links reopen the same request or approval object with an explicit return path.",
            ],
            "source_refs": [
                heading_ref(ACTOR_MODEL_PATH, "3.3 Actor classes"),
                heading_ref(NORTHBOUND_PATH, "8. Session, browser, and native-client rules"),
                heading_ref(PORTAL_PATH, "Approval and sign-off flow"),
                heading_ref(PORTAL_PATH, "Artifact, print, and browser-handoff rules"),
            ],
        },
        {
            "flow_id": "native_macos_operator_interactive",
            "label": "Native macOS operator session",
            "channel": "NATIVE_MACOS",
            "principal_classes": [
                "TENANT_ADMIN",
                "PREPARER",
                "REVIEWER",
                "APPROVER",
                "AUDITOR",
                "SUPPORT_OPERATOR",
            ],
            "entry_posture": f"System-browser or platform auth-session sign-in through `{supporting_context['native_auth_transport']}` or equivalent.",
            "session_carrier": "Server-authoritative interactive session plus Keychain-backed product-session artifacts and resume metadata.",
            "local_storage_posture": "Persist only derivable product-session artifacts, receipts, resume metadata, and redaction-safe local state.",
            "sensitive_mutation_posture": "Commands use the same server-side actor-session and stale-view validation as browser clients; native-only local state never becomes legal truth.",
            "step_up_posture": "Native step-up uses system-browser-managed auth, rotates challenge state on completion, and never stores raw authority credentials on device.",
            "authority_credential_posture": "Authority-owned or HMRC-only tasks open in the default system browser; no unrestricted in-app web shell for primary sign-in or step-up.",
            "blocked_or_forbidden": [
                "No raw authority credentials on device.",
                "No scene restoration if cache, resume metadata, or server session have become invalid.",
            ],
            "continuity_rules": [
                "Scene restoration is allowed only while local cache, resume metadata, and server session all remain valid.",
                "Tenant switch, privilege downgrade, masking drift, or schema incompatibility force cache and cursor invalidation.",
            ],
            "source_refs": [
                heading_ref(MACOS_PATH, "7. Authentication and session strategy"),
                heading_ref(MACOS_PATH, "8. Persistence model"),
                heading_ref(MACOS_PATH, "11. Security and runtime posture for the desktop client"),
                heading_ref(NORTHBOUND_PATH, "8. Session, browser, and native-client rules"),
            ],
        },
        {
            "flow_id": "machine_automation_client",
            "label": "Machine automation client",
            "channel": "API_AUTOMATION",
            "principal_classes": [
                "SCHEDULER_SERVICE",
                "CONNECTOR_SERVICE",
                "NORMALIZER_SERVICE",
                "COMPUTE_SERVICE",
                "GRAPH_SERVICE",
                "FILING_SERVICE",
                "REPLAY_SERVICE",
                "RETENTION_SERVICE",
                "NOTIFICATION_SERVICE",
            ],
            "entry_posture": "Short-lived non-browser machine credential with explicit service identity and scoped environment or tenant binding.",
            "session_carrier": "Machine credential plus persisted `command_id`, `idempotency_key`, and server-evaluated `PrincipalContext` for each command.",
            "local_storage_posture": "No interactive session semantics; any machine-secret material remains in vault or managed runtime secret boundaries.",
            "sensitive_mutation_posture": "Machine actors may perform only service-allowed actions and must still satisfy server-side authorization and idempotency contracts.",
            "step_up_posture": "Machine actors never satisfy `REQUIRE_STEP_UP`, `REQUIRE_APPROVAL`, override approval, or exceptional authority on behalf of humans.",
            "authority_credential_posture": "Authority token use still revalidates lineage and binding immediately before send; machine posture never stands in for human signatory or authority-link proof.",
            "blocked_or_forbidden": [
                "No masquerading as an interactive browser or native product session.",
                "No invention of delegation or human approval capabilities.",
            ],
            "continuity_rules": [
                "Replay, retry, and delayed send remain bound to durable request identity and binding lineage.",
                "Short-lived bearer use is allowed only for non-browser automation clients, not as an interactive session substitute.",
            ],
            "source_refs": [
                heading_ref(ACTOR_MODEL_PATH, "3.13 Machine-actor rules"),
                heading_ref(NORTHBOUND_PATH, "8. Session, browser, and native-client rules"),
                heading_ref(SECURITY_PATH, "3. Secret, key, and token handling"),
                heading_ref(AUTHORITY_PATH, "9.6 Token and client binding rule"),
            ],
        },
        {
            "flow_id": "invite_or_deep_link_pre_upgrade",
            "label": "Invite or deep-link recipient before authenticated upgrade",
            "channel": "BROWSER_LIMITED_ENTRY",
            "principal_classes": [
                "CLIENT_VIEWER",
                "CLIENT_CONTRIBUTOR",
                "CLIENT_SIGNATORY",
            ],
            "entry_posture": "Notification, emailed deep link, or invite opens contextual route state before a normal authenticated session has been re-established.",
            "session_carrier": "Contextual entry posture only; not yet a full sensitive-mutation session.",
            "local_storage_posture": "May preserve request or approval focus and return path, but no trust-sensitive mutation may depend on pre-upgrade state alone.",
            "sensitive_mutation_posture": "Sensitive actions are blocked until the flow upgrades into a normal authenticated session bound to the correct principal, tenant, and client scope.",
            "step_up_posture": "If the target action is sign-off or another high-trust step, authenticated upgrade happens first and fresh step-up can still be required after return to the same object.",
            "authority_credential_posture": "External identity or authority checkpoints may hand off to system browser or auth session only; the local route keeps typed pending-return posture rather than inferring completion.",
            "blocked_or_forbidden": [
                "No document upload, acknowledgement, or sign-off before authenticated upgrade.",
                "No widening of client scope or route authority from deep-link context alone.",
            ],
            "continuity_rules": [
                "The flow preserves contextual focus and return path through `route_context` and typed fallback targets.",
                "Return from external handoff never implies success until the governed read model confirms settlement.",
            ],
            "source_refs": [
                heading_ref(PORTAL_PATH, "Onboarding flow"),
                heading_ref(PORTAL_PATH, "Artifact, print, and browser-handoff rules"),
                text_ref(
                    PORTAL_PATH,
                    "- `route_context` SHALL carry contextual deep-link focus and return-path data without turning contextual routes into new",
                    "route_context_deep_link_focus_and_return_path",
                ),
                heading_ref(NORTHBOUND_PATH, "8. Session, browser, and native-client rules"),
            ],
        },
        {
            "flow_id": "governed_upload_session",
            "label": "Governed upload-session transfer flow",
            "channel": "BROWSER_OR_MOBILE_TRANSFER",
            "principal_classes": [
                "CLIENT_CONTRIBUTOR",
                "CLIENT_SIGNATORY",
                "CLIENT_VIEWER",
            ],
            "entry_posture": "Authenticated portal session allocates a governed `ClientUploadSession` as the binary-transfer exception to the generic command surface.",
            "session_carrier": "Normal authenticated session plus upload-session binding contract that freezes tenant, client, request, and request-version identity.",
            "local_storage_posture": "Resumability metadata is allowed only as derivable transfer state; attachment finalization remains a typed command.",
            "sensitive_mutation_posture": "Byte transfer and status inspection are allowed; request attachment and later submission semantics still require current typed command validation.",
            "step_up_posture": "Upload itself is not a substitute for sign-off or authority-sensitive step-up; any later approval or sign-off still uses the normal authenticated session and policy-driven step-up rules.",
            "authority_credential_posture": "No independent authority or browser-held credential scope is created by upload resumability.",
            "blocked_or_forbidden": [
                "Upload session allocation fails closed on stale, cross-client, or cross-tenant request identity.",
                "Request rebases may force explicit reconfirmation rather than silently rebinding older bytes.",
            ],
            "continuity_rules": [
                "Resumed uploads stay visibly attached to the same request lane instead of appearing as fresh uploads.",
                "Revocation invalidates outstanding upload-session control operations.",
            ],
            "source_refs": [
                heading_ref(NORTHBOUND_PATH, "2.2 Customer/Client portal and upload-session surfaces"),
                heading_ref(PORTAL_PATH, "Secure document-upload flow"),
                heading_ref(NORTHBOUND_PATH, "8. Session, browser, and native-client rules"),
            ],
        },
    ]

    return {
        "decision_id": "ADR-003",
        "summary": {
            "flow_count": len(flows),
            "channels": ordered_unique(flow["channel"] for flow in flows),
        },
        "flows": flows,
    }


def build_step_up_trigger_and_invalidation_matrix() -> dict[str, Any]:
    invalidation_events = [
        {
            "event_id": "STEP_UP_COMPLETED",
            "label": "Step-up completed",
            "rotation_or_purge": [
                "Rotate effective session challenge state.",
                "Require revalidation of any pre-step-up command, cursor, or resumability artifact before reuse.",
            ],
            "effects_on_command_acceptance": "Pre-step-up commands cannot be replayed blindly after the challenge state rotates.",
            "effects_on_resume_and_upload": "Resume tokens, cursors, and upload-session control artifacts stay usable only if they are revalidated against the new session challenge lineage.",
            "continuity_rule": "Continuation returns to the same governed object and shell where the surface contract requires it.",
            "source_refs": [
                heading_ref(NORTHBOUND_PATH, "8. Session, browser, and native-client rules"),
                heading_ref(SECURITY_PATH, "2. Identity, session, and command trust"),
                heading_ref(MACOS_PATH, "7. Authentication and session strategy"),
            ],
        },
        {
            "event_id": "SESSION_REVOKED",
            "label": "Session revoked or administrator invalidation",
            "rotation_or_purge": [
                "Invalidate outstanding resume tokens.",
                "Invalidate upload-session control operations.",
                "Block future command acceptance until re-authentication.",
            ],
            "effects_on_command_acceptance": "All future commands fail closed until a lawful replacement session is established.",
            "effects_on_resume_and_upload": "Outstanding resume, scene-restoration, and upload control artifacts become revoked state rather than silently continuing.",
            "continuity_rule": "Clients surface revoked-session recovery rather than inventing a soft refresh.",
            "source_refs": [
                heading_ref(NORTHBOUND_PATH, "8. Session, browser, and native-client rules"),
                heading_ref(SECURITY_PATH, "2. Identity, session, and command trust"),
                heading_ref(MACOS_PATH, "11. Security and runtime posture for the desktop client"),
            ],
        },
        {
            "event_id": "LOGOUT",
            "label": "Logout",
            "rotation_or_purge": [
                "Treat logout as explicit session revocation.",
                "Audit the revocation and clear interactive session material.",
            ],
            "effects_on_command_acceptance": "Future interactive writes require a new authenticated session.",
            "effects_on_resume_and_upload": "Browser or native resumability remains invalid until the next session re-establishes lawful scope.",
            "continuity_rule": "No cached route context may silently regain live mutation posture after logout.",
            "source_refs": [
                heading_ref(SECURITY_PATH, "2. Identity, session, and command trust"),
                heading_ref(NORTHBOUND_PATH, "8. Session, browser, and native-client rules"),
            ],
        },
        {
            "event_id": "TENANT_SWITCH",
            "label": "Tenant or account switch",
            "rotation_or_purge": [
                "Purge incompatible local caches and resume metadata.",
                "Force re-resolution of principal class, client scope, delegation basis, and masking posture.",
            ],
            "effects_on_command_acceptance": "Commands must not reuse stale bindings from the prior tenant or account.",
            "effects_on_resume_and_upload": "Resume tokens, native scenes, and upload sessions from the old tenant become invalid or rebind-required.",
            "continuity_rule": "Clients reopen only the narrowest still-lawful target after the new tenant context is established.",
            "source_refs": [
                heading_ref(NORTHBOUND_PATH, "8. Session, browser, and native-client rules"),
                heading_ref(MACOS_PATH, "7. Authentication and session strategy"),
                heading_ref(MACOS_PATH, "8. Persistence model"),
                heading_ref(MACOS_PATH, "11. Security and runtime posture for the desktop client"),
            ],
        },
        {
            "event_id": "AUTHORITY_REBIND_OR_BINDING_DRIFT",
            "label": "Authority rebinding or binding drift",
            "rotation_or_purge": [
                "Require new binding resolution and, where materially different, a new request identity.",
                "Block delayed or queued send if token/client, subject, authority link, or approval or step-up evidence no longer match.",
            ],
            "effects_on_command_acceptance": "Authority-integrated commands cannot continue on ambiguous or stale binding lineage.",
            "effects_on_resume_and_upload": "Authority-adjacent continuations preserve pending-return posture but remain blocked until a fresh binding clears.",
            "continuity_rule": "Return the user to the same object with explicit rebind or escalation posture instead of silently swapping authority context.",
            "source_refs": [
                heading_ref(AUTHORITY_PATH, "B. `AuthorityBinding`"),
                heading_ref(AUTHORITY_PATH, "9.5 Preflight sequence"),
                heading_ref(AUTHORITY_PATH, "9.6 Token and client binding rule"),
                heading_ref(SECURITY_PATH, "3. Secret, key, and token handling"),
            ],
        },
        {
            "event_id": "STALE_VIEW_REBASE",
            "label": "Stale-view rejection or rebase",
            "rotation_or_purge": [
                "Reject the command with typed stale-view metadata.",
                "Preserve review progress only as read-only carry-forward where the surface contract says so.",
            ],
            "effects_on_command_acceptance": "Sign-off, override, and other exact-basis actions require a refresh onto the latest snapshot or pack before resubmission.",
            "effects_on_resume_and_upload": "Latest resume token, snapshot, or replacement ref may be issued, but the client must not synthesize a merge.",
            "continuity_rule": "Same route family and same object stay mounted where possible; unsafe mutation demotes into explicit review or recovery posture.",
            "source_refs": [
                heading_ref(NORTHBOUND_PATH, "6. Concurrency and stale-view rules"),
                heading_ref(NORTHBOUND_PATH, "7. Stream and reconnect rules"),
                heading_ref(PORTAL_PATH, "Approval and sign-off flow"),
                heading_ref(PORTAL_PATH, "Secure document-upload flow"),
            ],
        },
        {
            "event_id": "DEEP_LINK_OR_INVITE_EXPIRY",
            "label": "Deep-link, invite, or limited-context entry expiry",
            "rotation_or_purge": [
                "Require authenticated upgrade or re-authentication before sensitive mutation resumes.",
                "Use typed fallback target and return-path metadata instead of guessing the next route.",
            ],
            "effects_on_command_acceptance": "Upload, acknowledgement, and sign-off remain blocked until a fresh authenticated session and current object context exist.",
            "effects_on_resume_and_upload": "Expired contextual entry never silently revives a stale upload or approval posture.",
            "continuity_rule": "The user returns to the closest surviving same-object target or explicit fallback target with a reason code.",
            "source_refs": [
                heading_ref(PORTAL_PATH, "Onboarding flow"),
                heading_ref(PORTAL_PATH, "Artifact, print, and browser-handoff rules"),
                heading_ref(PORTAL_PATH, "Playwright validation minimum"),
                heading_ref(NORTHBOUND_PATH, "8. Session, browser, and native-client rules"),
            ],
        },
    ]

    trigger_rows = [
        {
            "trigger_id": "authority_link_or_relink",
            "label": "Linking or re-linking software to the authority",
            "trigger_kind": "STEP_UP_OR_APPROVAL_REQUIRED",
            "actors": ["TENANT_ADMIN", "PREPARER", "APPROVER"],
            "channels": ["BROWSER", "NATIVE_MACOS"],
            "assurance_requirement": "Fresh human gate evidence; no machine substitution.",
            "invalidation_events": [
                "STEP_UP_COMPLETED",
                "AUTHORITY_REBIND_OR_BINDING_DRIFT",
                "SESSION_REVOKED",
            ],
            "revalidation_requirements": [
                "Resolve a fresh `AuthorityBinding` if subject, client, authority scope, or link lineage changed.",
                "Do not continue from stale deep-link or ambient route state alone.",
            ],
            "source_refs": [
                heading_ref(ACTOR_MODEL_PATH, "3.11 Non-delegable and step-up actions"),
                heading_ref(AUTHORITY_PATH, "B. `AuthorityBinding`"),
            ],
        },
        {
            "trigger_id": "override_changes_filing_or_parity",
            "label": "Approve override changing filing readiness or parity outcome",
            "trigger_kind": "STEP_UP_OR_APPROVAL_REQUIRED",
            "actors": ["APPROVER", "TENANT_ADMIN"],
            "channels": ["BROWSER", "NATIVE_MACOS"],
            "assurance_requirement": "Fresh approver identity with current view and policy basis.",
            "invalidation_events": [
                "STEP_UP_COMPLETED",
                "STALE_VIEW_REBASE",
                "SESSION_REVOKED",
            ],
            "revalidation_requirements": [
                "Refresh on stale-view rejection before resubmitting.",
                "Preserve rationale, scope, and expiry on any override approval.",
            ],
            "source_refs": [
                heading_ref(ACTOR_MODEL_PATH, "3.11 Non-delegable and step-up actions"),
                heading_ref(ACTOR_MODEL_PATH, "3.14 Actor invariants"),
            ],
        },
        {
            "trigger_id": "submit_filing_or_amendment",
            "label": "Submit filing or amendment",
            "trigger_kind": "STEP_UP_OR_APPROVAL_REQUIRED",
            "actors": ["APPROVER", "CLIENT_SIGNATORY", "TENANT_ADMIN"],
            "channels": ["BROWSER", "NATIVE_MACOS"],
            "assurance_requirement": "Fresh step-up or approved equivalent plus current authority-binding safety.",
            "invalidation_events": [
                "STEP_UP_COMPLETED",
                "AUTHORITY_REBIND_OR_BINDING_DRIFT",
                "STALE_VIEW_REBASE",
                "SESSION_REVOKED",
            ],
            "revalidation_requirements": [
                "Verify current approval or step-up state before envelope build.",
                "Re-run send-time authority binding checks if transmit is delayed or retried.",
            ],
            "source_refs": [
                heading_ref(ACTOR_MODEL_PATH, "3.11 Non-delegable and step-up actions"),
                heading_ref(AUTHORITY_PATH, "9.5 Preflight sequence"),
                heading_ref(AUTHORITY_PATH, "9.6 Token and client binding rule"),
            ],
        },
        {
            "trigger_id": "mark_unverified_submission_out_of_band",
            "label": "Mark externally unverified submission as known out-of-band",
            "trigger_kind": "STEP_UP_OR_APPROVAL_REQUIRED",
            "actors": ["APPROVER", "TENANT_ADMIN", "SUPPORT_OPERATOR"],
            "channels": ["BROWSER", "NATIVE_MACOS"],
            "assurance_requirement": "Fresh human-gated exception posture with bounded rationale.",
            "invalidation_events": [
                "STEP_UP_COMPLETED",
                "AUTHORITY_REBIND_OR_BINDING_DRIFT",
                "SESSION_REVOKED",
            ],
            "revalidation_requirements": [
                "Keep out-of-band truth distinct from confirmed authority truth.",
                "Do not convert unknown authority truth into confirmed truth via exception handling.",
            ],
            "source_refs": [
                heading_ref(ACTOR_MODEL_PATH, "3.11 Non-delegable and step-up actions"),
                heading_ref(ACTOR_MODEL_PATH, "3.12 Authority precedence rules"),
            ],
        },
        {
            "trigger_id": "export_full_evidence_or_unmasked_provenance",
            "label": "Export full evidence packs or unmasked provenance",
            "trigger_kind": "STEP_UP_OR_APPROVAL_REQUIRED",
            "actors": ["AUDITOR", "APPROVER", "TENANT_ADMIN", "SUPPORT_OPERATOR"],
            "channels": ["BROWSER", "NATIVE_MACOS"],
            "assurance_requirement": "Fresh human gate and current masking or export posture.",
            "invalidation_events": [
                "STEP_UP_COMPLETED",
                "SESSION_REVOKED",
                "LOGOUT",
            ],
            "revalidation_requirements": [
                "Re-evaluate masking scope and export posture before materializing bytes.",
                "Do not rely on stale desktop caches or detached browser state for richer export posture.",
            ],
            "source_refs": [
                heading_ref(ACTOR_MODEL_PATH, "3.11 Non-delegable and step-up actions"),
                heading_ref(MACOS_PATH, "10. Native UX opportunities that should replace browser habits"),
                heading_ref(MACOS_PATH, "11. Security and runtime posture for the desktop client"),
            ],
        },
        {
            "trigger_id": "approve_compliance_mode_config_version",
            "label": "Approve config versions for compliance mode",
            "trigger_kind": "STEP_UP_OR_APPROVAL_REQUIRED",
            "actors": ["TENANT_ADMIN", "APPROVER"],
            "channels": ["BROWSER", "NATIVE_MACOS"],
            "assurance_requirement": "Current approver identity plus fresh policy and dependency topology basis.",
            "invalidation_events": [
                "STEP_UP_COMPLETED",
                "STALE_VIEW_REBASE",
                "SESSION_REVOKED",
            ],
            "revalidation_requirements": [
                "Treat config and compliance-mode mutation as exact-basis governance action.",
                "Rebase on stale policy or dependency topology drift before resubmission.",
            ],
            "source_refs": [
                heading_ref(ACTOR_MODEL_PATH, "3.11 Non-delegable and step-up actions"),
                heading_ref(ACTOR_MODEL_PATH, "3.9 Policy decision model"),
            ],
        },
        {
            "trigger_id": "erasure_legal_hold_release_or_retention_exception",
            "label": "Execute erasure, legal-hold release, or retention exception",
            "trigger_kind": "STEP_UP_OR_APPROVAL_REQUIRED",
            "actors": ["TENANT_ADMIN", "APPROVER"],
            "channels": ["BROWSER", "NATIVE_MACOS"],
            "assurance_requirement": "Fresh human gate and current retention or legal-hold basis.",
            "invalidation_events": [
                "STEP_UP_COMPLETED",
                "SESSION_REVOKED",
                "LOGOUT",
            ],
            "revalidation_requirements": [
                "Do not permit machine actors to satisfy the human gate.",
                "Invalidate cached export or restoration posture after policy change.",
            ],
            "source_refs": [
                heading_ref(ACTOR_MODEL_PATH, "3.11 Non-delegable and step-up actions"),
                heading_ref(SECURITY_PATH, "2. Identity, session, and command trust"),
            ],
        },
        {
            "trigger_id": "client_signatory_signoff_when_pack_demands_step_up",
            "label": "Client signatory declaration or sign-off when the approval pack demands step-up",
            "trigger_kind": "STEP_UP_REQUIRED",
            "actors": ["CLIENT_SIGNATORY"],
            "channels": ["BROWSER"],
            "assurance_requirement": "`subject_identity_assurance_level = STEP_UP_VERIFIED` whenever the frozen approval pack requires it.",
            "invalidation_events": [
                "STEP_UP_COMPLETED",
                "STALE_VIEW_REBASE",
                "SESSION_REVOKED",
                "DEEP_LINK_OR_INVITE_EXPIRY",
            ],
            "revalidation_requirements": [
                "Sign-off commands must carry fresh step-up proof where required.",
                "Continuation stays on the same `Approvals` route and same approval-pack context.",
            ],
            "source_refs": [
                text_ref(
                    ACTOR_MODEL_PATH,
                    "Any `CLIENT_SIGNATORY` action that creates declaration or sign-off truth SHALL require the session to satisfy the frozen signatory policy, including `subject_identity_assurance_level = STEP_UP_VERIFIED` whenever the current approval pack demands step-up.",
                    "client_signatory_step_up_rule",
                ),
                heading_ref(PORTAL_PATH, "Approval and sign-off flow"),
                text_ref(
                    NORTHBOUND_PATH,
                    "- sign-off commands SHALL include fresh step-up proof whenever the approval pack or frozen policy marks step-up as required",
                    "fresh_step_up_proof_for_signoff",
                ),
            ],
        },
        {
            "trigger_id": "governance_mutation_widening_access_or_relinking_scope",
            "label": "Governance mutation that widens access, changes step-up posture, alters retention minimums, or relinks authority scope",
            "trigger_kind": "STEP_UP_OR_APPROVAL_REQUIRED",
            "actors": ["TENANT_ADMIN", "APPROVER"],
            "channels": ["BROWSER", "NATIVE_MACOS"],
            "assurance_requirement": "Current governance authority plus fresh human gate evidence as required by policy.",
            "invalidation_events": [
                "STEP_UP_COMPLETED",
                "STALE_VIEW_REBASE",
                "TENANT_SWITCH",
                "SESSION_REVOKED",
            ],
            "revalidation_requirements": [
                "Commands must not proceed from stale governance views.",
                "Changed access or step-up posture may invalidate prior resumability and cache assumptions.",
            ],
            "source_refs": [
                text_ref(
                    NORTHBOUND_PATH,
                    "- commands that widen access, change step-up posture, alter retention minimums, or relink authority",
                    "governance_mutation_step_up_or_approval",
                ),
                heading_ref(ACTOR_MODEL_PATH, "3.9 Policy decision model"),
            ],
        },
        {
            "trigger_id": "invite_or_deep_link_upgrade_gate",
            "label": "Invite, deep-link, or external handoff entry before authenticated upgrade",
            "trigger_kind": "AUTHENTICATED_SESSION_UPGRADE_REQUIRED",
            "actors": ["CLIENT_VIEWER", "CLIENT_CONTRIBUTOR", "CLIENT_SIGNATORY"],
            "channels": ["BROWSER_LIMITED_ENTRY"],
            "assurance_requirement": "Upgrade to a normal authenticated session before upload, acknowledgement, or sign-off; fresh step-up may still be needed afterward.",
            "invalidation_events": [
                "DEEP_LINK_OR_INVITE_EXPIRY",
                "SESSION_REVOKED",
                "STALE_VIEW_REBASE",
            ],
            "revalidation_requirements": [
                "Keep route focus and return target through the upgrade and any external auth handoff.",
                "Do not imply completion until the governed read model settles.",
            ],
            "source_refs": [
                heading_ref(PORTAL_PATH, "Onboarding flow"),
                heading_ref(PORTAL_PATH, "Artifact, print, and browser-handoff rules"),
                heading_ref(NORTHBOUND_PATH, "8. Session, browser, and native-client rules"),
            ],
        },
    ]

    return {
        "decision_id": "ADR-003",
        "summary": {
            "trigger_count": len(trigger_rows),
            "invalidation_event_count": len(invalidation_events),
            "step_up_required_count": sum(
                1
                for row in trigger_rows
                if row["trigger_kind"] == "STEP_UP_REQUIRED"
            ),
            "step_up_or_approval_required_count": sum(
                1
                for row in trigger_rows
                if row["trigger_kind"] == "STEP_UP_OR_APPROVAL_REQUIRED"
            ),
            "upgrade_gate_count": sum(
                1
                for row in trigger_rows
                if row["trigger_kind"] == "AUTHENTICATED_SESSION_UPGRADE_REQUIRED"
            ),
        },
        "trigger_rows": trigger_rows,
        "invalidation_events": invalidation_events,
    }


def build_identity_boundary(
    supporting_context: dict[str, Any]
) -> dict[str, Any]:
    boundaries = [
        {
            "boundary_id": "interactive_browser_human",
            "label": "Interactive browser human boundary",
            "principal_resolution": "Human principal resolved server-side before route composition, stream issuance, upload-session allocation, or command acceptance.",
            "session_carrier": "Secure browser session cookie or equivalent same-origin protected session plus anti-CSRF binding.",
            "allowed_credentials_or_material": [
                "IdP redirect artifacts",
                "server-mediated session identifier",
                "anti-CSRF binding",
            ],
            "forbidden_credentials_or_material": [
                "browser-held raw authority credentials",
                "unsafe primary bearer-token storage for browser writes",
            ],
            "storage_boundary": "Backend session store plus browser-safe derivable cache only.",
            "step_up_support": "Yes; contained escalation path with session challenge rotation.",
            "can_satisfy_human_only_actions": True,
            "source_refs": [
                heading_ref(NORTHBOUND_PATH, "8. Session, browser, and native-client rules"),
                heading_ref(SECURITY_PATH, "2. Identity, session, and command trust"),
            ],
        },
        {
            "boundary_id": "portal_pre_upgrade_context",
            "label": "Portal invite or deep-link pre-upgrade boundary",
            "principal_resolution": "Context may be known, but sensitive mutation authority is not live until authenticated upgrade completes.",
            "session_carrier": "Contextual route and return-path state only.",
            "allowed_credentials_or_material": [
                "invite token or deep-link context",
                "focused request or approval anchor",
            ],
            "forbidden_credentials_or_material": [
                "sensitive mutation authority before authenticated upgrade",
                "scope widening from deep-link context alone",
            ],
            "storage_boundary": "Local route context only; no trust-sensitive mutation state.",
            "step_up_support": "Only after authenticated upgrade into the normal portal session.",
            "can_satisfy_human_only_actions": False,
            "source_refs": [
                heading_ref(PORTAL_PATH, "Onboarding flow"),
                heading_ref(PORTAL_PATH, "Artifact, print, and browser-handoff rules"),
                heading_ref(NORTHBOUND_PATH, "8. Session, browser, and native-client rules"),
            ],
        },
        {
            "boundary_id": "interactive_native_human",
            "label": "Interactive native human boundary",
            "principal_resolution": "Human principal resolved through system-browser or platform-auth-session sign-in and server-side actor-session validation.",
            "session_carrier": f"{supporting_context['native_auth_transport']} or equivalent plus Keychain-backed product-session material.",
            "allowed_credentials_or_material": [
                "product-session artifacts",
                "resume metadata",
                "redaction-safe local cache",
            ],
            "forbidden_credentials_or_material": [
                "raw authority credentials on device",
                "unrestricted embedded credential surfaces for primary sign-in or step-up",
            ],
            "storage_boundary": "Keychain and OS-protected tenant-bound cache only.",
            "step_up_support": "Yes; via system-browser or platform auth session with challenge rotation on completion.",
            "can_satisfy_human_only_actions": True,
            "source_refs": [
                heading_ref(MACOS_PATH, "7. Authentication and session strategy"),
                heading_ref(MACOS_PATH, "11. Security and runtime posture for the desktop client"),
                heading_ref(SECURITY_PATH, "4. Browser, native-client, API, and transport hardening"),
            ],
        },
        {
            "boundary_id": "machine_automation",
            "label": "Machine automation boundary",
            "principal_resolution": "Service principal or external automation identity resolved per command; never treated as an interactive human session.",
            "session_carrier": "Short-lived machine credential and explicit `command_id` plus `idempotency_key`.",
            "allowed_credentials_or_material": [
                "short-lived non-browser bearer or client credential",
                "service identity ref",
            ],
            "forbidden_credentials_or_material": [
                "human interactive session cookies",
                "human step-up or approval substitution",
            ],
            "storage_boundary": "Managed runtime secret boundary or vault-backed credential retrieval.",
            "step_up_support": "No; machine actors cannot satisfy human step-up or approval paths.",
            "can_satisfy_human_only_actions": False,
            "source_refs": [
                heading_ref(ACTOR_MODEL_PATH, "3.13 Machine-actor rules"),
                heading_ref(NORTHBOUND_PATH, "8. Session, browser, and native-client rules"),
            ],
        },
        {
            "boundary_id": "embedded_webview_low_risk_only",
            "label": "Embedded web-view boundary",
            "principal_resolution": "Not trusted as the primary sign-in, step-up, or authority handoff authority.",
            "session_carrier": "Low-risk documentation or help content only.",
            "allowed_credentials_or_material": [
                "non-sensitive documentation context",
            ],
            "forbidden_credentials_or_material": [
                "primary sign-in",
                "step-up completion",
                "HMRC-only task handoff",
            ],
            "storage_boundary": "No sensitive session authority should be anchored here.",
            "step_up_support": "No.",
            "can_satisfy_human_only_actions": False,
            "source_refs": [
                heading_ref(NORTHBOUND_PATH, "8. Session, browser, and native-client rules"),
                heading_ref(SECURITY_PATH, "4. Browser, native-client, API, and transport hardening"),
            ],
        },
        {
            "boundary_id": "authority_token_vault_boundary",
            "label": "Authority-token and IdP secret boundary",
            "principal_resolution": "Interactive and machine identities may trigger authority work, but raw token and client-secret material stays in governed secret boundaries.",
            "session_carrier": "Vault-held authority tokens, IdP admin material, and client-secret records referenced indirectly from application flows.",
            "allowed_credentials_or_material": [
                "vault-held authority token lineage",
                "vault-held IdP client secrets or private keys",
            ],
            "forbidden_credentials_or_material": [
                "raw authority access or refresh tokens in browser, queue, read model, or device cache",
                "mixed storage of IdP tenant-admin material with general application state",
            ],
            "storage_boundary": supporting_context["idp_client_secret_record"][
                "storage_boundary"
            ],
            "step_up_support": "Not applicable directly; this boundary exists to keep downstream token handling governed.",
            "can_satisfy_human_only_actions": False,
            "source_refs": [
                heading_ref(SECURITY_PATH, "3. Secret, key, and token handling"),
                supporting_context["idp_client_dependency"]["source_ref"],
                supporting_context["idp_policy_dependency"]["source_ref"],
            ],
        },
    ]

    return {
        "decision_id": "ADR-003",
        "summary": {
            "boundary_count": len(boundaries),
            "interactive_human_boundaries": 2,
            "non_interactive_or_limited_boundaries": len(boundaries) - 2,
        },
        "boundaries": boundaries,
    }


def build_deep_link_invite_and_resume_rules(
    supporting_context: dict[str, Any]
) -> dict[str, Any]:
    rules = [
        {
            "rule_id": "invite_upgrade_before_sensitive_mutation",
            "label": "Invite entry upgrades before sensitive mutation",
            "requirement": "Invite-link or emailed deep-link entry into the client portal upgrades into a normal authenticated session before upload, acknowledgement, or sign-off actions are accepted.",
            "applicable_channels": ["BROWSER_LIMITED_ENTRY"],
            "fallback_or_recovery": "Keep the same object context reserved locally, then resume to the same route after upgrade or external auth handoff.",
            "source_refs": [
                heading_ref(PORTAL_PATH, "Onboarding flow"),
                heading_ref(NORTHBOUND_PATH, "8. Session, browser, and native-client rules"),
            ],
        },
        {
            "rule_id": "deep_link_scope_narrows_never_widens",
            "label": "Deep-link scope narrows and never widens",
            "requirement": "Every authenticated session resolves one principal class, client scope, delegation basis, and masking posture before route composition, and deep links narrow into that bound scope rather than widening it.",
            "applicable_channels": ["BROWSER", "NATIVE_MACOS"],
            "fallback_or_recovery": "If the requested target exceeds current scope, route to the closest surviving lawful target with a typed explanation.",
            "source_refs": [
                heading_ref(NORTHBOUND_PATH, "8. Session, browser, and native-client rules"),
                heading_ref(PORTAL_PATH, "Read-model and API translation requirements"),
            ],
        },
        {
            "rule_id": "route_context_preserves_focus_and_return_path",
            "label": "Route context preserves focus and return path",
            "requirement": "Contextual deep-link focus, focused artifact bucket or subject, restoration disposition, return focus anchor, and fallback target are serialized in `route_context` rather than inferred locally.",
            "applicable_channels": ["BROWSER"],
            "fallback_or_recovery": "Use the explicit fallback target and reason when the original focus no longer survives.",
            "source_refs": [
                text_ref(
                    PORTAL_PATH,
                    "- `route_context` SHALL carry contextual deep-link focus and return-path data without turning contextual routes into new",
                    "route_context_deep_link_focus_and_return_path",
                ),
                heading_ref(PORTAL_PATH, "Playwright validation minimum"),
            ],
        },
        {
            "rule_id": "external_handoff_returns_to_same_object",
            "label": "External identity or authority handoff returns to the same object",
            "requirement": "Identity- or authority-owned checkpoints may hand off to the system browser or auth session, but the product preserves the same request, approval, or work-item context locally and restores the user to the same focused item afterward.",
            "applicable_channels": ["BROWSER", "NATIVE_MACOS"],
            "fallback_or_recovery": "Return posture stays pending until a governed read model confirms settlement.",
            "source_refs": [
                heading_ref(PORTAL_PATH, "Artifact, print, and browser-handoff rules"),
                heading_ref(MACOS_PATH, "7. Authentication and session strategy"),
            ],
        },
        {
            "rule_id": "return_does_not_imply_completion",
            "label": "Return from external handoff does not imply completion",
            "requirement": "Completion language and final receipt posture stay blocked until `ClientPortalWorkspace`, `ClientApprovalPack`, or the governing parent read model confirms settlement.",
            "applicable_channels": ["BROWSER", "NATIVE_MACOS"],
            "fallback_or_recovery": "Surface explicit pending or recovery posture instead of optimistic completion.",
            "source_refs": [
                heading_ref(PORTAL_PATH, "Artifact, print, and browser-handoff rules"),
                heading_ref(PORTAL_PATH, "Approval and sign-off flow"),
            ],
        },
        {
            "rule_id": "resume_tokens_bind_to_session_tenant_and_access",
            "label": "Resume tokens bind to session, tenant, principal class, and access binding",
            "requirement": "Manifest and workspace resume tokens bind to route lineage, session or access-binding context, and fail closed on wrong session, tenant, or principal class.",
            "applicable_channels": ["BROWSER", "NATIVE_MACOS"],
            "fallback_or_recovery": "Return typed `REBASE_REQUIRED`, `REVOKED`, or other invalidation posture with replacement refs where applicable.",
            "source_refs": [
                heading_ref(NORTHBOUND_PATH, "7. Stream and reconnect rules"),
                heading_ref(MACOS_PATH, "8. Persistence model"),
            ],
        },
        {
            "rule_id": "upload_session_binding_is_frozen_and_explicit",
            "label": "Upload-session binding is frozen and explicit",
            "requirement": "Upload-session allocation freezes tenant, client, request, and request-version identity so resumed or cross-device transfer cannot silently drift into the wrong request lane.",
            "applicable_channels": ["BROWSER", "BROWSER_OR_MOBILE_TRANSFER"],
            "fallback_or_recovery": "Request rebases preserve the same upload lineage but may require explicit reconfirmation or rebind-required posture.",
            "source_refs": [
                heading_ref(NORTHBOUND_PATH, "2.2 Customer/Client portal and upload-session surfaces"),
                heading_ref(PORTAL_PATH, "Secure document-upload flow"),
            ],
        },
        {
            "rule_id": "native_restore_requires_valid_server_session",
            "label": "Native restore requires valid local and server session state",
            "requirement": "Native scene restoration only proceeds when local cache, resume metadata, and the server session remain valid together.",
            "applicable_channels": ["NATIVE_MACOS"],
            "fallback_or_recovery": "Force re-authentication and explicit focus restoration or invalidation posture when tenant switch, privilege drift, masking drift, or schema incompatibility broke continuity.",
            "source_refs": [
                heading_ref(MACOS_PATH, "7. Authentication and session strategy"),
                heading_ref(MACOS_PATH, "11. Security and runtime posture for the desktop client"),
            ],
        },
    ]

    return {
        "decision_id": "ADR-003",
        "summary": {
            "rule_count": len(rules),
            "deep_link_restore_focus_order": supporting_context["deep_link_restore"][
                "focus_restore_order"
            ],
        },
        "rules": rules,
    }


def build_scorecard_payload(
    criteria: list[dict[str, Any]],
    results: list[dict[str, Any]],
    supporting_context: dict[str, Any],
    session_matrix: dict[str, Any],
    step_up_matrix: dict[str, Any],
    boundary: dict[str, Any],
    deep_link_rules: dict[str, Any],
) -> dict[str, Any]:
    return {
        "decision_id": "ADR-003",
        "decision_name": "identity_step_up_and_session_model",
        "generated_at": TODAY,
        "recommended_alternative_id": results[0]["alternative_id"],
        "recommended_alternative_label": results[0]["label"],
        "criteria": criteria,
        "alternatives": results,
        "supporting_context": {
            "dependency_count": supporting_context["dependency_count"],
            "shell_family_count": supporting_context["shell_family_count"],
            "route_count": supporting_context["route_count"],
            "continuity_scenario_count": supporting_context["continuity_scenario_count"],
            "native_auth_transport": supporting_context["native_auth_transport"],
            "idp_client_dependency_key": supporting_context["idp_client_dependency"][
                "dependency_key"
            ],
            "idp_policy_dependency_key": supporting_context["idp_policy_dependency"][
                "dependency_key"
            ],
            "secret_storage_boundary": supporting_context["idp_client_secret_record"][
                "storage_boundary"
            ],
        },
        "coverage_summary": {
            "session_flow_count": session_matrix["summary"]["flow_count"],
            "step_up_trigger_count": step_up_matrix["summary"]["trigger_count"],
            "invalidation_event_count": step_up_matrix["summary"][
                "invalidation_event_count"
            ],
            "identity_boundary_count": boundary["summary"]["boundary_count"],
            "deep_link_and_resume_rule_count": deep_link_rules["summary"]["rule_count"],
        },
    }


def build_mermaid() -> str:
    return "\n".join(
        [
            "graph LR",
            '  Browser["Browser human session"] --> IdP["OIDC / OAuth identity provider"]',
            '  IdP --> BrowserSession["Secure `HttpOnly` same-site session + anti-CSRF"]',
            '  BrowserSession --> Taxat["Taxat command, read, and stream surfaces"]',
            '  Browser["Browser human session"] --> StepUp["Contained step-up checkpoint"]',
            '  StepUp --> Rotate["Rotate challenge state"]',
            '  Rotate --> Invalidate["Invalidate pre-step-up commands, cursors, and resume artifacts"]',
            '  DeepLink["Invite / deep-link entry"] --> Upgrade["Upgrade to normal authenticated session"]',
            '  Upgrade --> BrowserSession',
            '  Upload["Governed upload session"] --> UploadBind["Frozen tenant / client / request binding"]',
            '  UploadBind --> Taxat',
            '  Native["Native macOS operator"] --> SystemBrowser["ASWebAuthenticationSession / system-browser flow"]',
            '  SystemBrowser --> IdP',
            '  IdP --> Keychain["Keychain-held product-session material"]',
            '  Keychain --> Taxat',
            '  Machine["Machine automation client"] --> MachineCred["Short-lived machine credential"]',
            '  MachineCred --> Taxat',
            '  Taxat --> Vault["Vault-held authority tokens + IdP secrets"]',
            '  Vault --> Binding["AuthorityBinding + token-lineage revalidation"]',
            '  Binding --> Authority["Authority gateway / HMRC"]',
            '  Revoke["Revocation / tenant switch / binding drift"] --> Purge["Invalidate resume tokens, upload controls, caches, and future command acceptance"]',
            '  Purge --> BrowserSession',
            '  Purge --> Keychain',
        ]
    ) + "\n"


def build_adr_markdown(
    criteria: list[dict[str, Any]],
    results: list[dict[str, Any]],
    session_matrix: dict[str, Any],
    step_up_matrix: dict[str, Any],
    boundary: dict[str, Any],
    deep_link_rules: dict[str, Any],
    supporting_context: dict[str, Any],
) -> str:
    winner = results[0]
    trigger_rows = step_up_matrix["trigger_rows"]
    session_rows = session_matrix["flows"]

    decision_driver_table = markdown_table(
        ["Driver", "Priority", "Weight", "Why It Matters"],
        [
            [
                criterion["label"],
                criterion["priority"],
                criterion["weight"],
                criterion["rationale"],
            ]
            for criterion in criteria
        ],
    )
    alternatives_table = markdown_table(
        ["Alternative", "Weighted Score", "Rank"],
        [
            [result["label"], result["weighted_total"], result["rank"]]
            for result in results
        ],
    )
    trigger_table = markdown_table(
        ["Trigger", "Outcome", "Actors", "Invalidation / Revalidation"],
        [
            [
                row["label"],
                row["trigger_kind"],
                row["actors"],
                row["invalidation_events"],
            ]
            for row in trigger_rows
        ],
    )
    session_table = markdown_table(
        ["Flow", "Entry", "Session Carrier", "Sensitive Mutation Posture", "Continuity Guard"],
        [
            [
                row["label"],
                row["entry_posture"],
                row["session_carrier"],
                row["sensitive_mutation_posture"],
                row["continuity_rules"][0],
            ]
            for row in session_rows
        ],
    )
    boundary_table = markdown_table(
        ["Boundary", "Session Carrier", "Allowed Material", "Forbidden Material"],
        [
            [
                row["label"],
                row["session_carrier"],
                row["allowed_credentials_or_material"],
                row["forbidden_credentials_or_material"],
            ]
            for row in boundary["boundaries"]
        ],
    )

    return f"""# ADR-003: Identity, Step-Up, and Session Model

- Status: Accepted
- Date: {TODAY}
- Deciders: Phase 00 architecture analysis pack

## Context

Taxat needs one declared identity and session model that spans browser operators, portal users, native macOS operators, machine automation clients, invite and deep-link entry, upload resumability, and authority-integrated send paths. The source corpus is unusually explicit: it names non-delegable actions, freezes `PrincipalContext` and `AuthorityBinding` lineage, requires anti-CSRF for browser writes, forbids raw authority credentials on native devices, and insists that step-up completion or revocation invalidate stale resumability rather than letting commands drift forward.

The prior phase-00 packs already established the surrounding architecture constraints: the dependency register surfaced `{supporting_context['dependency_count']}` dependencies including explicit IdP tenant and policy setup, the shell atlas normalized `{supporting_context['route_count']}` routes across `{supporting_context['shell_family_count']}` shell families, the native topology fixed `{supporting_context['native_auth_transport']}` as the preferred auth handoff, and the continuity matrix captured `{supporting_context['continuity_scenario_count']}` recovery scenarios. ADR-003 closes the remaining gap by selecting one cross-surface model for interactive sessions, step-up, machine credentials, deep-link upgrade, and invalidation behavior.

## Decision

Adopt a **standards-based identity model with server-mediated interactive sessions**:

- Human browser sessions authenticate through an OIDC/OAuth-capable identity provider and operate through secure `HttpOnly`, same-site cookies or an equivalently protected same-origin server-mediated session posture with anti-CSRF.
- Native macOS operators authenticate and step up through `{supporting_context['native_auth_transport']}` or an equivalent system-browser-managed flow, storing only product-session artifacts in Keychain-class storage.
- Machine automation clients use distinct short-lived non-browser credentials and explicit service identity; they are never interchangeable with human interactive sessions.
- Raw authority access or refresh tokens and IdP client-secret material stay in governed vault or secret-store boundaries, never in browser storage, native device caches, queues, or read models.
- Invite, deep-link, upload-session, and authority-owned handoff flows may preserve same-object continuity, but sensitive mutation still requires a normal authenticated session and any required fresh step-up.
- Step-up completion rotates the effective challenge state; revocation, logout, tenant switch, binding drift, and stale-view rebase invalidate or revalidate resumability artifacts exactly as the contract requires.

## Decision Drivers

{decision_driver_table}

## Step-Up Trigger Overview

{trigger_table}

The matrix covers `{step_up_matrix['summary']['trigger_count']}` trigger rows: `{step_up_matrix['summary']['step_up_required_count']}` explicit step-up-only trigger, `{step_up_matrix['summary']['step_up_or_approval_required_count']}` step-up-or-approval trigger families, and `{step_up_matrix['summary']['upgrade_gate_count']}` authenticated-upgrade gate for invite or deep-link entry.

## Session Flows

{session_table}

The session matrix covers `{session_matrix['summary']['flow_count']}` governed flows and keeps browser human, portal human, native human, machine automation, invite or deep-link pre-upgrade, and upload-session transfer posture explicitly separate.

## Identity Boundaries

{boundary_table}

The boundary model uses `{boundary['summary']['boundary_count']}` explicit security boundaries so browser human, native human, machine automation, limited-context entry, embedded low-risk web content, and vault-held secret material do not collapse into one ambiguous login posture.

## Alternatives Considered

{alternatives_table}

The winning option is **{winner['label']}** with a weighted score of `{winner['weighted_total']}`.

## Why This Option Wins

- It is the only option that matches the corpus requirement for secure browser session posture with anti-CSRF while still keeping human identity, delegation, authority link, and masking posture server-authoritative.
- It preserves the native system-browser and Keychain posture without weakening same-object continuity or allowing raw authority credentials onto the device.
- It keeps machine automation separate from human sessions, which is necessary because service principals are explicitly forbidden from satisfying `REQUIRE_STEP_UP`, `REQUIRE_APPROVAL`, or exceptional authority on behalf of humans.
- It composes cleanly with `AuthorityBinding`, send-time token-lineage revalidation, and the rule that a sendable `AuthorityRequestEnvelope` cannot exist until required step-up or approval evidence is already frozen.
- It lets invite, deep-link, and external handoff flows preserve route and object continuity while still forcing authenticated upgrade and fresh step-up where the current object demands it.

## Guardrails On The Decision

- Interactive browser writes SHALL remain behind a secure server-mediated session and anti-CSRF; bearer-token-in-browser-storage posture is rejected for primary interactive mutation.
- Native sign-in and step-up SHALL use system-browser or platform auth-session flows; embedded web views stay limited to low-risk documentation or help content.
- Machine credentials SHALL remain distinct from human sessions and SHALL NOT satisfy human-only step-up, approval, or signatory actions.
- Raw authority tokens and IdP client-secret material SHALL remain in governed vault or secret-store boundaries.
- Step-up completion SHALL rotate challenge state and SHALL force revalidation of pre-step-up commands, cursors, resume tokens, and upload-session control artifacts before they can continue.
- Revocation, logout, tenant switch, masking drift, authority rebinding, or stale-view rebase SHALL fail closed with typed recovery posture instead of silently refreshing hidden local state.
- Invite-link, emailed deep-link, and authority-owned handoff returns SHALL preserve same-object continuity, but return SHALL NOT imply completion before governed read models settle.

## Consequences

Positive consequences:

- Browser, native, and automation work now share one declared trust model before implementation starts.
- Later backend and frontend tasks can implement actor-session persistence, revocation, cache isolation, and native restoration against a stable cross-surface contract.
- Security posture stays explainable: browser trust is session-mediated, native trust is system-browser-plus-Keychain, automation trust is machine-credential-based, and authority tokens stay behind vault boundaries.

Negative consequences and tradeoffs:

- The product needs a deliberate backend session and revocation layer rather than a thin token-only SPA.
- Browser, backend, and native teams must coordinate on challenge-state rotation and resume-token invalidation instead of treating those concerns as surface-local details.
- Separate per-surface IdP client registrations and policy profiles are mandatory, which adds configuration work even though it sharpens the trust boundary.

## Deferred Decisions

- specific IdP vendor and hosting choice, so long as it supports OIDC/OAuth-compatible human auth, MFA, step-up, and short-lived session posture
- exact backend session-store product and revocation fanout mechanism
- exact browser BFF or edge-session topology used to implement the server-mediated web session
- exact step-up factor mix, enrollment UX, and device binding heuristics
- exact authority-boundary implementation details that belong to ADR-004 and later delivery tasks
- exact schema, service, and UI implementations scheduled in roadmap tasks `pc_0085`, `pc_0094`, `pc_0237`, `pc_0238`, and `pc_0291`

## References

- Session flow matrix: [session_flow_matrix.json]({SESSION_FLOW_MATRIX_PATH})
- Step-up trigger and invalidation matrix: [step_up_trigger_and_invalidation_matrix.json]({STEP_UP_INVALIDATION_PATH})
- Identity boundary model: [browser_native_automation_identity_boundary.json]({BOUNDARY_PATH})
- Deep-link, invite, and resume rules: [deep_link_invite_and_resume_rules.json]({DEEP_LINK_RULES_PATH})
- Scorecard: [ADR-003-identity-step-up-and-session-model-scorecard.json]({SCORECARD_PATH})
- Comparison notes: [ADR-003-identity-step-up-and-session-model-comparison.md]({COMPARISON_PATH})
- Decision diagram: [ADR-003-identity-session-topology.mmd]({MERMAID_PATH})
"""


def build_comparison_markdown(
    criteria: list[dict[str, Any]],
    results: list[dict[str, Any]],
    session_matrix: dict[str, Any],
    step_up_matrix: dict[str, Any],
    boundary: dict[str, Any],
    deep_link_rules: dict[str, Any],
) -> str:
    ranking_table = markdown_table(
        ["Rank", "Alternative", "Weighted Score", "Leading Strengths"],
        [
            [
                result["rank"],
                result["label"],
                result["weighted_total"],
                "; ".join(result["strengths"][:2]),
            ]
            for result in results
        ],
    )
    criteria_table = markdown_table(
        ["Criterion", "Priority", "Weight", "Source Grounding"],
        [
            [
                criterion["label"],
                criterion["priority"],
                criterion["weight"],
                criterion["source_refs"],
            ]
            for criterion in criteria
        ],
    )

    sections: list[str] = [
        "# ADR-003 Comparison Notes",
        "",
        "This comparison expands the weighted scorecard that supports ADR-003.",
        "",
        "## Ranking",
        "",
        ranking_table,
        "",
        "## Criteria and Weights",
        "",
        criteria_table,
        "",
        "## Coverage Summary",
        "",
        f"- Session flows covered: `{session_matrix['summary']['flow_count']}`",
        f"- Step-up or upgrade triggers covered: `{step_up_matrix['summary']['trigger_count']}`",
        f"- Invalidation events covered: `{step_up_matrix['summary']['invalidation_event_count']}`",
        f"- Identity boundaries covered: `{boundary['summary']['boundary_count']}`",
        f"- Deep-link and resume rules covered: `{deep_link_rules['summary']['rule_count']}`",
    ]

    for criterion in sorted(criteria, key=lambda item: (-item["weight"], item["criterion_id"])):
        sections.extend(
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
                                item["raw_score"]
                                for item in result["criterion_breakdown"]
                                if item["criterion_id"] == criterion["criterion_id"]
                            ),
                            next(
                                item["weighted_score"]
                                for item in result["criterion_breakdown"]
                                if item["criterion_id"] == criterion["criterion_id"]
                            ),
                            next(
                                item["note"]
                                for item in result["criterion_breakdown"]
                                if item["criterion_id"] == criterion["criterion_id"]
                            ),
                        ]
                        for result in results
                    ],
                ),
            ]
        )

    runner_ups = [result for result in results if result["rank"] > 1]
    sections.extend(
        [
            "",
            "## Why The Runner-Up Options Lost",
            "",
        ]
    )
    for result in runner_ups:
        sections.append(
            f"- `{result['label']}` lost because {lower_first(result['risks'][0])} "
            f"It also {lower_first(result['risks'][1])}"
        )

    return "\n".join(sections) + "\n"


def main() -> None:
    supporting_context = build_supporting_context()
    criteria = build_criteria()
    alternatives = build_alternatives()
    validate_inputs(criteria, alternatives)
    results = calculate_results(criteria, alternatives)
    session_matrix = build_session_flow_matrix(supporting_context)
    step_up_matrix = build_step_up_trigger_and_invalidation_matrix()
    boundary = build_identity_boundary(supporting_context)
    deep_link_rules = build_deep_link_invite_and_resume_rules(supporting_context)
    scorecard = build_scorecard_payload(
        criteria,
        results,
        supporting_context,
        session_matrix,
        step_up_matrix,
        boundary,
        deep_link_rules,
    )

    adr_markdown = build_adr_markdown(
        criteria,
        results,
        session_matrix,
        step_up_matrix,
        boundary,
        deep_link_rules,
        supporting_context,
    )
    comparison_markdown = build_comparison_markdown(
        criteria,
        results,
        session_matrix,
        step_up_matrix,
        boundary,
        deep_link_rules,
    )
    mermaid = build_mermaid()

    json_write(SCORECARD_PATH, scorecard)
    json_write(SESSION_FLOW_MATRIX_PATH, session_matrix)
    json_write(STEP_UP_INVALIDATION_PATH, step_up_matrix)
    json_write(BOUNDARY_PATH, boundary)
    json_write(DEEP_LINK_RULES_PATH, deep_link_rules)
    text_write(ADR_PATH, adr_markdown)
    text_write(COMPARISON_PATH, comparison_markdown)
    text_write(MERMAID_PATH, mermaid)

    print(
        json.dumps(
            {
                "winner": results[0]["label"],
                "winner_score": results[0]["weighted_total"],
                "session_flows": session_matrix["summary"]["flow_count"],
                "step_up_triggers": step_up_matrix["summary"]["trigger_count"],
                "invalidation_events": step_up_matrix["summary"][
                    "invalidation_event_count"
                ],
                "identity_boundaries": boundary["summary"]["boundary_count"],
                "deep_link_rules": deep_link_rules["summary"]["rule_count"],
            },
            indent=2,
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()
