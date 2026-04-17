#!/usr/bin/env python3
from __future__ import annotations

import csv
import hashlib
import json
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
ALGORITHM_DIR = ROOT / "Algorithm"
PROMPT_DIR = ROOT / "PROMPT"
DATA_ANALYSIS_DIR = ROOT / "data" / "analysis"
DOCS_ANALYSIS_DIR = ROOT / "docs" / "analysis"

INTAKE_MANIFEST_PATH = DATA_ANALYSIS_DIR / "archive_intake_manifest.json"
INTAKE_NORMALIZATION_PATH = DATA_ANALYSIS_DIR / "prompt_scaffold_path_normalization.json"
FILE_INVENTORY_JSON_PATH = DATA_ANALYSIS_DIR / "file_inventory_manifest.json"
FILE_INVENTORY_CSV_PATH = DATA_ANALYSIS_DIR / "file_inventory_manifest.csv"
HEADING_INVENTORY_PATH = DATA_ANALYSIS_DIR / "heading_inventory.jsonl"
SCHEMA_SAMPLE_INVENTORY_PATH = DATA_ANALYSIS_DIR / "schema_sample_inventory.json"
ORPHANED_FILES_PATH = DATA_ANALYSIS_DIR / "orphaned_or_unclassified_files.json"
FILE_ROLE_TAXONOMY_PATH = DATA_ANALYSIS_DIR / "file_role_taxonomy.json"
MANIFEST_DOC_PATH = DOCS_ANALYSIS_DIR / "02_corpus_file_inventory_manifest.md"
TOPOLOGY_DOC_PATH = DOCS_ANALYSIS_DIR / "02_corpus_topology_overview.md"

ALLOWED_PATH_KINDS = [
    "canonical_source",
    "prompt_scaffold",
    "archive_residue",
    "generated_output",
    "unknown",
]
ALLOWED_AUTHORITY_LEVELS = [
    "core_algorithm",
    "canonical_contract",
    "specialized_contract",
    "enforcement",
    "support_coherence",
    "historical_closure",
    "prompt_scaffold",
    "noncanonical_residue",
]

CORE_ALGORITHM_FILES = {
    "Algorithm/core_engine.md",
    "Algorithm/modules.md",
}
SUPPORT_COHERENCE_FILES = {
    "Algorithm/README.md",
    "Algorithm/UIUX_DESIGN_SKILL.md",
    "Algorithm/glossary.md",
    "Algorithm/implementation_conventions.md",
    "Algorithm/architecture_coherence_guardrails.md",
    "Algorithm/contract_integrity_requirements.md",
    "Algorithm/constraint_coverage_index.md",
    "Algorithm/constraint_traceability_register.json",
    "Algorithm/test_vectors.md",
    "Algorithm/embodiments_and_examples.md",
    "Algorithm/audit_and_provenance.md",
    "Algorithm/retention_error_and_observability_contract.md",
}
HISTORICAL_CLOSURE_FILES = {
    "Algorithm/AUDIT_FINDINGS.md",
    "Algorithm/PATCH_RESOLUTION_INDEX.md",
}
ENFORCEMENT_FILES = {
    "Algorithm/scripts/validate_contracts.py",
    "Algorithm/tools/forensic_contract_guard.py",
    "Algorithm/requirements-dev.txt",
}
PROMPT_SPECIAL_FILES = {
    "PROMPT/AGENT.md": {"prompt_subtype": "agent_protocol", "referenced_primary_objects": ["task_claim_protocol"]},
    "PROMPT/Checklist.md": {"prompt_subtype": "task_board", "referenced_primary_objects": ["task_checklist"]},
}
DOMAIN_KEYWORDS = {
    "engine": {"engine", "module", "modules", "data", "model", "state", "states", "gate", "gates", "parity", "trust", "decision", "twin", "formula", "formulas", "invariant", "invariants"},
    "manifest_replay": {"manifest", "replay", "reproducibility", "config", "freeze", "continuation", "branch", "child", "reuse", "nightly", "late", "retroactive", "input", "baseline"},
    "evidence_provenance": {"evidence", "provenance", "canonical", "candidate", "conflict", "snapshot", "source", "proof", "graph", "filing", "enquiry"},
    "authority": {"authority", "delegation", "oauth", "hmrc", "obligation", "submission", "fraud", "correction", "ingress", "binding"},
    "workflow": {"workflow", "failure", "remediation", "error", "compensation", "resolution", "notice", "queue", "assignment", "work_item", "work_item_notification"},
    "governance": {"governance", "policy", "tenant", "role", "blast", "risk", "principal", "access", "retention_governance", "investigation"},
    "frontend_shell": {"frontend", "shell", "route", "interaction", "focus", "semantic", "selector", "accessibility", "continuity", "return", "low", "noise", "design", "stream"},
    "portal": {"portal", "client", "customer", "upload", "approval", "onboarding", "timeline", "document", "help", "language"},
    "collaboration": {"collaboration", "workspace", "thread", "attachment", "participant", "activity", "inbox"},
    "security_runtime": {"security", "runtime", "session", "auth", "authorization", "secret", "cors", "csrf", "transport"},
    "retention_privacy": {"retention", "privacy", "erasure", "hold", "expiry", "explainability"},
    "observability": {"observability", "audit", "trace", "metric", "metrics", "log", "telemetry"},
    "validation": {"validate", "validation", "verification", "vector", "vectors", "constraint", "coverage", "integrity", "forensic", "schema", "sample", "guard"},
    "prompting": {"prompt", "agent", "checklist", "card", "cards"},
    "release_resilience": {"deployment", "release", "resilience", "recovery", "restore", "checkpoint", "canary", "migration", "compatibility", "candidate", "promotion"},
    "api_transport": {"api", "northbound", "command", "commands", "etag", "stream", "problem", "receipt"},
    "archive_packaging": {"archive", "residue", "macosx", "finder", "packaging"},
    "coherence": {"coherence", "glossary", "reference", "requirements", "overview", "conventions"},
}
READABLE_DOMAIN_LABELS = {
    "engine": "Engine",
    "manifest_replay": "Manifest / Replay",
    "evidence_provenance": "Evidence / Provenance",
    "authority": "Authority",
    "workflow": "Workflow",
    "governance": "Governance",
    "frontend_shell": "Frontend Shell",
    "portal": "Portal",
    "collaboration": "Collaboration",
    "security_runtime": "Security / Runtime",
    "retention_privacy": "Retention / Privacy",
    "observability": "Observability",
    "validation": "Validation",
    "prompting": "Prompting",
    "release_resilience": "Release / Resilience",
    "api_transport": "API / Transport",
    "archive_packaging": "Archive Packaging",
    "coherence": "Coherence",
}
CANONICAL_SCRIPT_FILES = [
    "Algorithm/scripts/validate_contracts.py",
    "Algorithm/tools/forensic_contract_guard.py",
]


@dataclass(frozen=True)
class SchemaInfo:
    stem: str
    path: str
    schema_id: str | None
    title: str | None
    related_samples: list[str]
    search_terms: tuple[str, ...]


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def repo_rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug or "untitled"


def json_write(path: Path, payload: Any) -> None:
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")


def normalize_text(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", text.lower())


def load_json(path: Path) -> Any:
    return json.loads(path.read_text())


def build_schema_infos() -> tuple[dict[str, SchemaInfo], dict[str, list[str]]]:
    sample_paths_by_stem: dict[str, list[str]] = defaultdict(list)
    for sample_path in sorted((ALGORITHM_DIR / "schemas").glob("sample_*.json")):
        stem = sample_path.name[len("sample_") : -len(".json")]
        sample_paths_by_stem[stem].append(repo_rel(sample_path))

    schema_infos: dict[str, SchemaInfo] = {}
    for schema_path in sorted((ALGORITHM_DIR / "schemas").glob("*.schema.json")):
        stem = schema_path.name[: -len(".schema.json")]
        schema_json = load_json(schema_path)
        schema_id = schema_json.get("$id")
        title = schema_json.get("title")
        search_terms = tuple(
            sorted(
                {
                    stem.lower(),
                    stem.replace("_", " ").lower(),
                    "".join(part.capitalize() for part in stem.split("_")).lower(),
                    stem.replace("_", "").lower(),
                }
            )
        )
        schema_infos[stem] = SchemaInfo(
            stem=stem,
            path=repo_rel(schema_path),
            schema_id=schema_id,
            title=title,
            related_samples=sorted(sample_paths_by_stem.get(stem, [])),
            search_terms=search_terms,
        )
    return schema_infos, {stem: sorted(paths) for stem, paths in sorted(sample_paths_by_stem.items())}


def parse_markdown(path: Path) -> tuple[str | None, list[dict[str, Any]]]:
    text = path.read_text()
    title = None
    headings: list[dict[str, Any]] = []
    inside_fence = False
    for line_number, line in enumerate(text.splitlines(), start=1):
        stripped = line.strip()
        if stripped.startswith("```"):
            inside_fence = not inside_fence
            continue
        if inside_fence:
            continue
        heading_match = re.match(r"^(#{1,6})\s+(.+?)\s*$", line)
        if not heading_match:
            continue
        level = len(heading_match.group(1))
        heading_text = heading_match.group(2).strip()
        if level == 1 and title is None:
            title = heading_text
        headings.append(
            {
                "path": repo_rel(path),
                "line_number": line_number,
                "heading_level": level,
                "heading_text": heading_text,
                "heading_slug": slugify(heading_text),
            }
        )
    return title, headings


def synthetic_heading_for_path(path: Path, title: str | None = None) -> dict[str, Any]:
    heading_text = title or path.stem.replace("_", " ")
    return {
        "path": repo_rel(path),
        "line_number": 0,
        "heading_level": 0,
        "heading_text": heading_text,
        "heading_slug": slugify(heading_text),
        "heading_kind": "synthetic_empty_file_heading",
    }


def is_archive_residue(relative_path: Path) -> tuple[bool, str | None]:
    if "__MACOSX" in relative_path.parts:
        return True, "archive_packaging_residue"
    if relative_path.name == ".DS_Store":
        return True, "finder_metadata_residue"
    if relative_path.name.startswith("._"):
        return True, "appledouble_residue"
    return False, None


def is_workspace_byproduct(relative_path: Path) -> tuple[bool, str | None]:
    if "__pycache__" in relative_path.parts or relative_path.suffix == ".pyc":
        return True, "python_cache_byproduct"
    return False, None


def authority_for_path(relative_path: str) -> str:
    if relative_path.startswith("PROMPT/"):
        return "prompt_scaffold"
    if relative_path in CORE_ALGORITHM_FILES:
        return "core_algorithm"
    if relative_path in SUPPORT_COHERENCE_FILES:
        return "support_coherence"
    if relative_path in HISTORICAL_CLOSURE_FILES:
        return "historical_closure"
    if relative_path in ENFORCEMENT_FILES:
        return "enforcement"
    if relative_path.startswith("Algorithm/schemas/"):
        return "enforcement"
    if relative_path.endswith((".md", ".json")):
        stem = Path(relative_path).name
        specialized_markers = (
            "frontend_",
            "cross_device_",
            "stream_resume_",
            "shell_",
            "focus_",
            "upload_session_",
            "semantic_",
            "empty_state_",
            "dominant_question_",
            "low_noise_",
            "collaboration_",
            "customer_client_portal_",
            "admin_governance_",
            "policy_risk_",
            "northbound_api_",
            "cache_isolation_",
            "macos_native_",
            "native_cache_",
            "security_",
            "deployment_",
            "recovery_",
            "release_",
            "authority_calculation_",
            "authority_truth_",
            "retention_limited_",
            "failure_",
        )
        if stem.startswith(specialized_markers) or "contract" in stem or "blueprint" in stem:
            return "specialized_contract"
    return "canonical_contract"


def score_domains(text_fragments: list[str]) -> tuple[str, list[str]]:
    combined = normalize_text(" ".join(text_fragments))
    token_set = set(combined.split())
    scores: dict[str, int] = {}
    for domain, keywords in DOMAIN_KEYWORDS.items():
        score = sum(1 for keyword in keywords if keyword in token_set)
        if score:
            scores[domain] = score

    if not scores:
        return "coherence", []

    ordered = sorted(scores.items(), key=lambda item: (-item[1], item[0]))
    primary = ordered[0][0]
    secondary = [domain for domain, score in ordered[1:] if score == ordered[0][1] or score > 1]
    return primary, sorted(set(secondary))


def domain_for_row(relative_path: str, title: str | None, headings: list[dict[str, Any]], authority_level: str) -> tuple[str, list[str]]:
    if relative_path.startswith("PROMPT/"):
        return "prompting", []
    if authority_level == "historical_closure":
        return "validation", ["coherence"]
    if authority_level == "support_coherence":
        if relative_path.endswith("constraint_traceability_register.json"):
            return "validation", ["coherence"]
        return "coherence", ["validation"]
    if authority_level == "enforcement":
        if relative_path.startswith("Algorithm/schemas/"):
            stem = Path(relative_path).name.replace(".schema.json", "").replace("sample_", "").replace(".json", "")
            primary, secondary = score_domains([stem])
            return primary if primary != "coherence" else "validation", sorted(set(secondary + ["validation"]))
        return "validation", []
    if relative_path in {
        "Algorithm/core_engine.md",
        "Algorithm/modules.md",
        "Algorithm/data_model.md",
        "Algorithm/state_machines.md",
        "Algorithm/invariants_and_gates.md",
        "Algorithm/exact_gate_logic_and_decision_tables.md",
        "Algorithm/compute_parity_and_trust_formulas.md",
    }:
        return "engine", []
    if relative_path in {
        "Algorithm/manifest_and_config_freeze_contract.md",
        "Algorithm/manifest_branch_selection_contract.md",
        "Algorithm/manifest_lineage_explorer_and_reuse_decision_tracer_contract.md",
        "Algorithm/manifest_start_claim_protocol.md",
        "Algorithm/replay_and_reproducibility_contract.md",
        "Algorithm/nightly_autopilot_contract.md",
        "Algorithm/nightly_selection_disposition_and_batch_isolation_contract.md",
        "Algorithm/config_freeze_inheritance_and_consumption_contract.md",
        "Algorithm/input_boundary_and_cutoff_contract.md",
        "Algorithm/late_data_authority_correction_and_replay_propagation_contract.md",
        "Algorithm/late_data_policy_contract.md",
    }:
        return "manifest_replay", ["release_resilience"]
    if relative_path in {
        "Algorithm/canonical_source_and_evidence_taxonomy.md",
        "Algorithm/canonical_fact_promotion_and_partition_isolation_contract.md",
        "Algorithm/provenance_graph_semantics.md",
        "Algorithm/defensible_filing_graph_contract.md",
        "Algorithm/twin_view_contract.md",
    }:
        return "evidence_provenance", ["engine"]
    if relative_path in {
        "Algorithm/actor_and_authority_model.md",
        "Algorithm/authority_interaction_protocol.md",
        "Algorithm/authority_calculation_contract.md",
        "Algorithm/authority_truth_and_internal_projection_separation_contract.md",
        "Algorithm/connector_delegation_contract.md",
    }:
        return "authority", ["governance"]
    if relative_path in {
        "Algorithm/frontend_shell_and_interaction_law.md",
        "Algorithm/cross_device_continuity_and_restoration_contract.md",
        "Algorithm/stream_resume_and_catch_up_ordering_contract.md",
        "Algorithm/shell_continuity_fuzzing_and_recovery_contract.md",
        "Algorithm/focus_restoration_and_return_target_harness_contract.md",
        "Algorithm/semantic_selector_and_accessibility_contract.md",
        "Algorithm/semantic_selector_and_accessibility_regression_pack_contract.md",
        "Algorithm/empty_state_limitation_and_recovery_taxonomy_contract.md",
        "Algorithm/dominant_question_and_single_action_contract.md",
        "Algorithm/low_noise_experience_contract.md",
        "Algorithm/low_noise_surface_compression_and_noise_budget_audit_contract.md",
        "Algorithm/cross_shell_design_token_and_interaction_layer_foundation_contract.md",
    }:
        return "frontend_shell", ["portal", "collaboration"]
    if relative_path in {
        "Algorithm/customer_client_portal_experience_contract.md",
        "Algorithm/upload_session_request_binding_and_rebase_contract.md",
        "Algorithm/upload_session_recovery_harness_contract.md",
    }:
        return "portal", ["frontend_shell"]
    if relative_path == "Algorithm/collaboration_workspace_contract.md":
        return "collaboration", ["workflow"]
    if relative_path in {
        "Algorithm/admin_governance_console_architecture.md",
        "Algorithm/policy_risk_and_blast_radius_modeling_contract.md",
    }:
        return "governance", ["authority"]
    if relative_path == "Algorithm/northbound_api_and_session_contract.md":
        return "api_transport", ["frontend_shell", "portal"]
    if relative_path in {
        "Algorithm/security_and_runtime_hardening_contract.md",
        "Algorithm/cache_isolation_and_secure_reuse_contract.md",
        "Algorithm/native_cache_hydration_purge_and_rebase_contract.md",
        "Algorithm/macos_native_operator_workspace_blueprint.md",
    }:
        return "security_runtime", ["frontend_shell", "release_resilience"]
    if relative_path in {
        "Algorithm/retention_and_privacy.md",
        "Algorithm/retention_limited_explainability_and_audit_sufficiency_contract.md",
    }:
        return "retention_privacy", ["observability"]
    if relative_path in {
        "Algorithm/observability_and_audit_contract.md",
        "Algorithm/error_model_and_remediation_model.md",
        "Algorithm/failure_resolution_ownership_and_closure_contract.md",
        "Algorithm/failure_lifecycle_dashboard_and_lineage_contract.md",
    }:
        return "observability", ["workflow"]
    if relative_path in {
        "Algorithm/deployment_and_resilience_contract.md",
        "Algorithm/recovery_tier_checkpoint_and_fail_forward_governance_contract.md",
        "Algorithm/release_candidate_identity_and_promotion_evidence_contract.md",
        "Algorithm/verification_and_release_gates.md",
        "Algorithm/trust_sensitivity_and_threshold_stability_contract.md",
        "Algorithm/gate_decision_explainability_and_reason_code_compression_contract.md",
        "Algorithm/invariant_enforcement_and_fail_closed_contract.md",
    }:
        return "release_resilience", ["validation"]

    title_fragments = [Path(relative_path).stem, title or ""] + [heading["heading_text"] for heading in headings[:12]]
    return score_domains(title_fragments)


def discover_related_schemas_for_markdown(text: str, schema_infos: dict[str, SchemaInfo]) -> list[str]:
    normalized = normalize_text(text)
    matches = []
    for info in schema_infos.values():
        for term in info.search_terms:
            if f" {term} " in f" {normalized} ":
                matches.append(info.path)
                break
    return sorted(set(matches))


def discover_related_scripts(text: str) -> list[str]:
    normalized = normalize_text(text)
    script_matches = []
    if "validate contracts" in normalized or "validate_contracts" in normalized or "self test" in normalized:
        script_matches.append(CANONICAL_SCRIPT_FILES[0])
    if "forensic contract guard" in normalized or "forensic guard" in normalized or "forensic_contract_guard" in normalized:
        script_matches.append(CANONICAL_SCRIPT_FILES[1])
    return sorted(set(script_matches))


def build_primary_objects(
    relative_path: str,
    title: str | None,
    headings: list[dict[str, Any]],
    related_schema_files: list[str],
) -> list[str]:
    if relative_path.startswith("PROMPT/CARDS/"):
        card_id = Path(relative_path).stem
        return [card_id]
    if relative_path == "PROMPT/AGENT.md":
        return ["task_claim_protocol", "prompt_scaffold"]
    if relative_path == "PROMPT/Checklist.md":
        return ["task_board", "task_status"]
    if relative_path.startswith("PROMPT/shared_operating_contract_"):
        return [Path(relative_path).stem]
    if relative_path.endswith(".schema.json"):
        return [Path(relative_path).name[: -len(".schema.json")]]
    if relative_path.endswith(".json") and Path(relative_path).name.startswith("sample_"):
        return [Path(relative_path).name[len("sample_") : -len(".json")]]
    if relative_path.endswith(".py"):
        return [Path(relative_path).stem]

    object_names = [Path(schema_path).name[: -len(".schema.json")] for schema_path in related_schema_files]
    if not object_names:
        source = title or Path(relative_path).stem.replace("_", " ")
        object_names = [slugify(source).replace("-", "_")]
    heading_names = [slugify(heading["heading_text"]).replace("-", "_") for heading in headings[1:4]]
    return sorted(set(object_names + heading_names[:3]))


def build_prompt_relations(checklist_card_paths: set[str], card_paths: set[str]) -> dict[str, list[str]]:
    relations: dict[str, list[str]] = {}
    for path in sorted(card_paths):
        relations[path] = ["checklist_card_entry"] if path in checklist_card_paths else []
    relations["PROMPT/AGENT.md"] = ["checklist_protocol"]
    relations["PROMPT/Checklist.md"] = ["agent_protocol_reference"]
    for path in sorted(repo_rel(p) for p in PROMPT_DIR.glob("shared_operating_contract_*.md")):
        relations[path] = ["shared_operating_contract"]
    return relations


def build_taxonomy(schema_infos: dict[str, SchemaInfo]) -> dict[str, Any]:
    return {
        "generated_from_task": "pc_0002",
        "inventory_scope_roots": ["Algorithm", "PROMPT"],
        "allowed_path_kinds": ALLOWED_PATH_KINDS,
        "allowed_authority_levels": ALLOWED_AUTHORITY_LEVELS,
        "domain_families": READABLE_DOMAIN_LABELS,
        "explicit_authority_rules": {
            "core_algorithm_files": sorted(CORE_ALGORITHM_FILES),
            "support_coherence_files": sorted(SUPPORT_COHERENCE_FILES),
            "historical_closure_files": sorted(HISTORICAL_CLOSURE_FILES),
            "enforcement_files": sorted(ENFORCEMENT_FILES),
        },
        "domain_keyword_rules": {domain: sorted(keywords) for domain, keywords in sorted(DOMAIN_KEYWORDS.items())},
        "schema_inventory_baseline": {
            "schema_count": len(schema_infos),
            "sample_count": sum(len(info.related_samples) for info in schema_infos.values()),
        },
        "source_dependencies": {
            "pc_0001_archive_intake_manifest": repo_rel(INTAKE_MANIFEST_PATH),
            "pc_0001_prompt_path_normalization": repo_rel(INTAKE_NORMALIZATION_PATH),
        },
    }


def build_inventory() -> dict[str, Any]:
    intake_manifest = load_json(INTAKE_MANIFEST_PATH) if INTAKE_MANIFEST_PATH.exists() else {}
    schema_infos, sample_paths_by_stem = build_schema_infos()
    taxonomy = build_taxonomy(schema_infos)

    checklist_task_pattern = re.compile(r"^- \[[ X-]\] `(pc_\d{4})` ")
    checklist_entries = [
        line
        for line in (PROMPT_DIR / "Checklist.md").read_text().splitlines()
        if checklist_task_pattern.match(line)
    ]
    checklist_card_paths = {
        f"PROMPT/CARDS/{checklist_task_pattern.match(line).group(1)}.md"
        for line in checklist_entries
    }
    card_paths = {repo_rel(path) for path in (PROMPT_DIR / "CARDS").glob("pc_*.md")}
    prompt_relations = build_prompt_relations(checklist_card_paths=checklist_card_paths, card_paths=card_paths)

    inventory_rows: list[dict[str, Any]] = []
    heading_rows: list[dict[str, Any]] = []
    schemas_with_no_prose_owner: list[dict[str, Any]] = []
    samples_with_no_schema: list[dict[str, Any]] = []
    prompt_relation_gaps: list[dict[str, Any]] = []
    workspace_local_byproducts: list[dict[str, Any]] = []

    markdown_text_by_path: dict[str, str] = {}
    algorithm_markdown_texts: dict[str, str] = {}

    for root in (ALGORITHM_DIR, PROMPT_DIR):
        for file_path in sorted(path for path in root.rglob("*") if path.is_file()):
            relative_path = file_path.relative_to(ROOT)
            residue, residue_note = is_archive_residue(relative_path)
            workspace_byproduct, byproduct_note = is_workspace_byproduct(relative_path)

            if residue:
                path_kind = "archive_residue"
                authority_level = "noncanonical_residue"
                domain_family = "archive_packaging"
                secondary_domains: list[str] = []
                title_or_schema_id = residue_note
                headings: list[dict[str, Any]] = []
                file_type = file_path.suffix.lstrip(".") or "no_extension"
                related_schema_files: list[str] = []
                related_sample_files: list[str] = []
                related_script_files: list[str] = []
                inventory_notes = [f"True archive/finder residue: {residue_note}"]
            elif workspace_byproduct:
                path_kind = "unknown"
                authority_level = "noncanonical_residue"
                domain_family = "archive_packaging"
                secondary_domains = []
                title_or_schema_id = byproduct_note
                headings = []
                file_type = file_path.suffix.lstrip(".") or "no_extension"
                related_schema_files = []
                related_sample_files = []
                related_script_files = []
                inventory_notes = [f"Workspace-local byproduct: {byproduct_note}"]
                workspace_local_byproducts.append(
                    {
                        "path": repo_rel(file_path),
                        "reason": byproduct_note,
                    }
                )
            elif str(relative_path).startswith("PROMPT/"):
                path_kind = "prompt_scaffold"
                authority_level = "prompt_scaffold"
                title, headings = parse_markdown(file_path)
                if not headings:
                    headings = [synthetic_heading_for_path(file_path, title)]
                    title = title or file_path.stem.replace("_", " ")
                title_or_schema_id = title
                heading_rows.extend(
                    {
                        **heading,
                        "path_kind": path_kind,
                        "authority_level": authority_level,
                        "domain_family": "prompting",
                    }
                    for heading in headings
                )
                prompt_meta = PROMPT_SPECIAL_FILES.get(repo_rel(file_path), {})
                related_schema_files = []
                related_sample_files = []
                related_script_files = []
                file_type = "md"
                domain_family = "prompting"
                secondary_domains = []
                inventory_notes = [prompt_meta.get("prompt_subtype", "prompt_scaffold_file")]
                if repo_rel(file_path) in prompt_relations:
                    inventory_notes.extend(prompt_relations[repo_rel(file_path)])
                if repo_rel(file_path).startswith("PROMPT/CARDS/") and repo_rel(file_path) not in checklist_card_paths:
                    prompt_relation_gaps.append(
                        {
                            "path": repo_rel(file_path),
                            "reason": "card_file_missing_checklist_entry",
                        }
                    )
                if repo_rel(file_path).startswith("PROMPT/shared_operating_contract_"):
                    related_script_files = []
                markdown_text_by_path[repo_rel(file_path)] = file_path.read_text()
            else:
                path_kind = "canonical_source"
                authority_level = authority_for_path(repo_rel(file_path))
                file_type = (
                    "schema_json"
                    if file_path.name.endswith(".schema.json")
                    else "sample_json"
                    if file_path.name.startswith("sample_") and file_path.suffix == ".json"
                    else file_path.suffix.lstrip(".") or "no_extension"
                )
                headings = []
                if file_path.suffix == ".md":
                    title, headings = parse_markdown(file_path)
                    if not headings:
                        headings = [synthetic_heading_for_path(file_path, title)]
                        title = title or file_path.stem.replace("_", " ")
                    title_or_schema_id = title
                    file_text = file_path.read_text()
                    markdown_text_by_path[repo_rel(file_path)] = file_text
                    algorithm_markdown_texts[repo_rel(file_path)] = file_text
                    heading_rows.extend(
                        {
                            **heading,
                            "path_kind": path_kind,
                            "authority_level": authority_level,
                            "domain_family": None,
                        }
                        for heading in headings
                    )
                    related_schema_files = discover_related_schemas_for_markdown(file_text, schema_infos)
                    related_sample_files = sorted(
                        {
                            sample_path
                            for schema_path in related_schema_files
                            for sample_path in schema_infos[
                                Path(schema_path).name[: -len(".schema.json")]
                            ].related_samples
                        }
                    )
                    related_script_files = discover_related_scripts(file_text)
                    inventory_notes = []
                elif file_path.name.endswith(".schema.json"):
                    schema_stem = file_path.name[: -len(".schema.json")]
                    schema_info = schema_infos[schema_stem]
                    title_or_schema_id = schema_info.schema_id or schema_info.title or schema_stem
                    related_schema_files = []
                    related_sample_files = schema_info.related_samples
                    related_script_files = [CANONICAL_SCRIPT_FILES[0]]
                    inventory_notes = ["schema_contract"]
                    if not related_sample_files:
                        inventory_notes.append("no_sample_discovered")
                elif file_path.name.startswith("sample_") and file_path.suffix == ".json":
                    schema_stem = file_path.name[len("sample_") : -len(".json")]
                    title_or_schema_id = schema_stem
                    related_schema_files = [schema_infos[schema_stem].path] if schema_stem in schema_infos else []
                    related_sample_files = []
                    related_script_files = [CANONICAL_SCRIPT_FILES[0]]
                    inventory_notes = ["schema_sample_payload"]
                    if schema_stem not in schema_infos:
                        samples_with_no_schema.append(
                            {
                                "path": repo_rel(file_path),
                                "reason": "sample_without_matching_schema",
                            }
                        )
                elif file_path.suffix == ".py":
                    title_or_schema_id = file_path.stem
                    related_schema_files = []
                    related_sample_files = []
                    related_script_files = []
                    inventory_notes = ["enforcement_script"]
                else:
                    title_or_schema_id = file_path.name
                    related_schema_files = []
                    related_sample_files = []
                    related_script_files = []
                    inventory_notes = ["support_artifact"]

                if file_path.suffix != ".md":
                    title = None
                domain_family, secondary_domains = domain_for_row(
                    relative_path=repo_rel(file_path),
                    title=title if file_path.suffix == ".md" else str(title_or_schema_id),
                    headings=headings,
                    authority_level=authority_level,
                )

            primary_objects = build_primary_objects(
                relative_path=repo_rel(file_path),
                title=title_or_schema_id if isinstance(title_or_schema_id, str) else None,
                headings=headings,
                related_schema_files=related_schema_files,
            )

            row = {
                "path": repo_rel(file_path),
                "path_kind": path_kind,
                "file_type": file_type,
                "sha256": sha256_file(file_path),
                "size_bytes": file_path.stat().st_size,
                "authority_level": authority_level,
                "domain_family": domain_family,
                "secondary_domain_families": sorted(set(secondary_domains)),
                "title_or_schema_id": title_or_schema_id,
                "markdown_headings": headings,
                "referenced_primary_objects": sorted(set(primary_objects)),
                "related_schema_files": sorted(set(related_schema_files)),
                "related_sample_files": sorted(set(related_sample_files)),
                "related_script_files": sorted(set(related_script_files)),
                "inventory_notes": inventory_notes,
            }
            inventory_rows.append(row)

    algorithm_doc_text = "\n".join(algorithm_markdown_texts.values())
    algorithm_doc_text_normalized = normalize_text(algorithm_doc_text)
    for stem, schema_info in sorted(schema_infos.items()):
        has_owner = any(
            f" {term} " in f" {algorithm_doc_text_normalized} " for term in schema_info.search_terms
        )
        if not has_owner:
            schemas_with_no_prose_owner.append(
                {
                    "schema_path": schema_info.path,
                    "schema_stem": stem,
                    "reason": "no_obvious_prose_owner",
                }
            )

    for sample_stem, sample_paths in sorted(sample_paths_by_stem.items()):
        if sample_stem not in schema_infos:
            for sample_path in sample_paths:
                samples_with_no_schema.append(
                    {
                        "path": sample_path,
                        "reason": "sample_without_matching_schema",
                    }
                )

    inventory_rows.sort(key=lambda row: row["path"])
    heading_rows.sort(key=lambda row: (row["path"], row["line_number"], row["heading_level"], row["heading_text"]))

    for heading_row in heading_rows:
        owner = next(row for row in inventory_rows if row["path"] == heading_row["path"])
        heading_row["domain_family"] = owner["domain_family"]

    rows_by_authority = Counter(row["authority_level"] for row in inventory_rows)
    rows_by_domain = Counter(row["domain_family"] for row in inventory_rows)
    rows_by_path_kind = Counter(row["path_kind"] for row in inventory_rows)
    rows_by_file_type = Counter(row["file_type"] for row in inventory_rows)

    orphan_payload = {
        "generated_from_task": "pc_0002",
        "inventory_scope_roots": ["Algorithm", "PROMPT"],
        "schemas_with_no_obvious_prose_owner": schemas_with_no_prose_owner,
        "samples_with_no_schema": samples_with_no_schema,
        "prompt_scaffold_files_without_checklist_or_card_relationship": prompt_relation_gaps,
        "workspace_local_byproducts": workspace_local_byproducts,
        "unknown_rows": [row for row in inventory_rows if row["path_kind"] == "unknown"],
        "summary": {
            "schemas_with_no_obvious_prose_owner": len(schemas_with_no_prose_owner),
            "samples_with_no_schema": len(samples_with_no_schema),
            "prompt_relation_gaps": len(prompt_relation_gaps),
            "workspace_local_byproducts": len(workspace_local_byproducts),
            "unknown_rows": sum(1 for row in inventory_rows if row["path_kind"] == "unknown"),
        },
    }

    schema_sample_inventory = {
        "generated_from_task": "pc_0002",
        "schemas": [
            {
                "schema_path": info.path,
                "schema_stem": info.stem,
                "schema_id": info.schema_id,
                "schema_title": info.title,
                "related_sample_files": info.related_samples,
                "sample_status": "paired" if info.related_samples else "no_sample_discovered",
            }
            for info in sorted(schema_infos.values(), key=lambda item: item.path)
        ],
        "samples_without_schema": samples_with_no_schema,
    }

    inventory_manifest = {
        "generated_from_task": "pc_0002",
        "inventory_scope_roots": ["Algorithm", "PROMPT"],
        "source_dependencies": {
            "pc_0001_archive_intake_manifest": repo_rel(INTAKE_MANIFEST_PATH),
            "pc_0001_prompt_path_normalization": repo_rel(INTAKE_NORMALIZATION_PATH),
        },
        "pc_0001_baseline": {
            "canonical_file_count": intake_manifest.get("canonical_file_count"),
            "top_level_entries": intake_manifest.get("top_level_entries", []),
        },
        "row_count": len(inventory_rows),
        "heading_row_count": len(heading_rows),
        "rows_by_authority_level": dict(sorted(rows_by_authority.items())),
        "rows_by_domain_family": dict(sorted(rows_by_domain.items())),
        "rows_by_path_kind": dict(sorted(rows_by_path_kind.items())),
        "rows_by_file_type": dict(sorted(rows_by_file_type.items())),
        "rows": inventory_rows,
    }

    return {
        "inventory_manifest": inventory_manifest,
        "heading_rows": heading_rows,
        "schema_sample_inventory": schema_sample_inventory,
        "orphan_payload": orphan_payload,
        "taxonomy": taxonomy,
    }


def write_outputs(payload: dict[str, Any]) -> None:
    DATA_ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
    DOCS_ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)

    inventory_manifest = payload["inventory_manifest"]
    heading_rows = payload["heading_rows"]
    schema_sample_inventory = payload["schema_sample_inventory"]
    orphan_payload = payload["orphan_payload"]
    taxonomy = payload["taxonomy"]

    json_write(FILE_INVENTORY_JSON_PATH, inventory_manifest)
    json_write(SCHEMA_SAMPLE_INVENTORY_PATH, schema_sample_inventory)
    json_write(ORPHANED_FILES_PATH, orphan_payload)
    json_write(FILE_ROLE_TAXONOMY_PATH, taxonomy)

    with HEADING_INVENTORY_PATH.open("w", encoding="utf-8") as handle:
        for row in heading_rows:
            handle.write(json.dumps(row, sort_keys=True) + "\n")

    csv_columns = [
        "path",
        "path_kind",
        "file_type",
        "sha256",
        "size_bytes",
        "authority_level",
        "domain_family",
        "secondary_domain_families",
        "title_or_schema_id",
        "referenced_primary_objects",
        "related_schema_files",
        "related_sample_files",
        "related_script_files",
        "inventory_notes",
    ]
    with FILE_INVENTORY_CSV_PATH.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=csv_columns)
        writer.writeheader()
        for row in inventory_manifest["rows"]:
            writer.writerow(
                {
                    "path": row["path"],
                    "path_kind": row["path_kind"],
                    "file_type": row["file_type"],
                    "sha256": row["sha256"],
                    "size_bytes": row["size_bytes"],
                    "authority_level": row["authority_level"],
                    "domain_family": row["domain_family"],
                    "secondary_domain_families": json.dumps(row["secondary_domain_families"], sort_keys=True),
                    "title_or_schema_id": row["title_or_schema_id"] or "",
                    "referenced_primary_objects": json.dumps(row["referenced_primary_objects"], sort_keys=True),
                    "related_schema_files": json.dumps(row["related_schema_files"], sort_keys=True),
                    "related_sample_files": json.dumps(row["related_sample_files"], sort_keys=True),
                    "related_script_files": json.dumps(row["related_script_files"], sort_keys=True),
                    "inventory_notes": json.dumps(row["inventory_notes"], sort_keys=True),
                }
            )

    authority_counts = inventory_manifest["rows_by_authority_level"]
    domain_counts = inventory_manifest["rows_by_domain_family"]
    path_kind_counts = inventory_manifest["rows_by_path_kind"]
    file_type_counts = inventory_manifest["rows_by_file_type"]

    manifest_doc = "\n".join(
        [
            "# Corpus File Inventory Manifest",
            "",
            "## Summary",
            "",
            f"- Inventory scope roots: `Algorithm/` and `PROMPT/`",
            f"- Total rows: `{inventory_manifest['row_count']}`",
            f"- Heading inventory rows: `{inventory_manifest['heading_row_count']}`",
            f"- Schema/sample relationships: `{len(schema_sample_inventory['schemas'])}` schemas, `{sum(1 for item in schema_sample_inventory['schemas'] if item['sample_status'] == 'paired')}` with at least one sample",
            "",
            "## Counts By Path Kind",
            "",
            "| Path kind | Count |",
            "| --- | --- |",
            *[f"| `{key}` | `{value}` |" for key, value in sorted(path_kind_counts.items())],
            "",
            "## Counts By Authority Level",
            "",
            "| Authority level | Count |",
            "| --- | --- |",
            *[f"| `{key}` | `{value}` |" for key, value in sorted(authority_counts.items())],
            "",
            "## Counts By Domain Family",
            "",
            "| Domain family | Count |",
            "| --- | --- |",
            *[f"| `{key}` | `{value}` |" for key, value in sorted(domain_counts.items())],
            "",
            "## Counts By File Type",
            "",
            "| File type | Count |",
            "| --- | --- |",
            *[f"| `{key}` | `{value}` |" for key, value in sorted(file_type_counts.items())],
            "",
            "## Gap Summary",
            "",
            f"- Schemas with no obvious prose owner: `{orphan_payload['summary']['schemas_with_no_obvious_prose_owner']}`",
            f"- Samples with no schema: `{orphan_payload['summary']['samples_with_no_schema']}`",
            f"- Prompt scaffold relation gaps: `{orphan_payload['summary']['prompt_relation_gaps']}`",
            f"- Workspace-local byproducts under inventory roots: `{orphan_payload['summary']['workspace_local_byproducts']}`",
            "",
            "## Output Files",
            "",
            "- `data/analysis/file_inventory_manifest.json`",
            "- `data/analysis/file_inventory_manifest.csv`",
            "- `data/analysis/heading_inventory.jsonl`",
            "- `data/analysis/schema_sample_inventory.json`",
            "- `data/analysis/orphaned_or_unclassified_files.json`",
            "- `data/analysis/file_role_taxonomy.json`",
            "",
        ]
    )
    MANIFEST_DOC_PATH.write_text(manifest_doc)

    grouped_by_authority: dict[str, list[dict[str, Any]]] = defaultdict(list)
    grouped_by_domain: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in inventory_manifest["rows"]:
        grouped_by_authority[row["authority_level"]].append(row)
        grouped_by_domain[row["domain_family"]].append(row)

    topology_lines = [
        "# Corpus Topology Overview",
        "",
        "## Authority Layers",
        "",
    ]
    for authority in sorted(grouped_by_authority):
        rows = grouped_by_authority[authority]
        topology_lines.extend(
            [
                f"### `{authority}`",
                "",
                f"- Count: `{len(rows)}`",
                f"- Representative paths: {', '.join(f'`{row['path']}`' for row in rows[:8])}",
                "",
            ]
        )

    topology_lines.extend(["## Domain Layers", ""])
    for domain in sorted(grouped_by_domain):
        rows = grouped_by_domain[domain]
        topology_lines.extend(
            [
                f"### `{domain}`",
                "",
                f"- Count: `{len(rows)}`",
                f"- Representative paths: {', '.join(f'`{row['path']}`' for row in rows[:8])}",
                "",
            ]
        )

    TOPOLOGY_DOC_PATH.write_text("\n".join(topology_lines))


def main() -> int:
    payload = build_inventory()
    write_outputs(payload)
    summary = {
        "row_count": payload["inventory_manifest"]["row_count"],
        "heading_row_count": payload["inventory_manifest"]["heading_row_count"],
        "schema_count": len(payload["schema_sample_inventory"]["schemas"]),
        "schemas_without_prose_owner": payload["orphan_payload"]["summary"]["schemas_with_no_obvious_prose_owner"],
        "samples_without_schema": payload["orphan_payload"]["summary"]["samples_with_no_schema"],
    }
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
