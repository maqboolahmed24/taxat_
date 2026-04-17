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

FILE_INVENTORY_JSON_PATH = DATA_ANALYSIS_DIR / "file_inventory_manifest.json"
CROSS_REFERENCE_JSON_PATH = DATA_ANALYSIS_DIR / "contract_schema_script_index.json"
GLOSSARY_JSON_PATH = DATA_ANALYSIS_DIR / "glossary_normalized.json"
LANGUAGE_MAP_CSV_PATH = DATA_ANALYSIS_DIR / "ubiquitous_language_map.csv"
ALIAS_CONFLICTS_PATH = DATA_ANALYSIS_DIR / "term_alias_conflicts.json"
FIELD_TO_TERM_MAP_PATH = DATA_ANALYSIS_DIR / "field_to_term_map.json"
GLOSSARY_DOC_PATH = DOCS_ANALYSIS_DIR / "04_glossary_normalization_and_ubiquitous_language_map.md"
DRIFT_DOC_PATH = DOCS_ANALYSIS_DIR / "04_prohibited_synonyms_and_term_drift_rules.md"

GLOSSARY_PATH = "Algorithm/glossary.md"
README_PATH = "Algorithm/README.md"
IMPLEMENTATION_CONVENTIONS_PATH = "Algorithm/implementation_conventions.md"
ARCHITECTURE_GUARDRAILS_PATH = "Algorithm/architecture_coherence_guardrails.md"
ACTOR_AUTHORITY_MODEL_PATH = "Algorithm/actor_and_authority_model.md"
SOURCE_TAXONOMY_PATH = "Algorithm/canonical_source_and_evidence_taxonomy.md"
BOUNDARY_PATH = "Algorithm/invention_and_system_boundary.md"
MANIFEST_CONTRACT_PATH = "Algorithm/manifest_and_config_freeze_contract.md"
REPLAY_CONTRACT_PATH = "Algorithm/replay_and_reproducibility_contract.md"
DATA_MODEL_PATH = "Algorithm/data_model.md"

DOMAIN_TO_TERM_CATEGORY = {
    "engine": "core_engine",
    "manifest_replay": "lineage",
    "evidence_provenance": "evidence",
    "authority": "authority",
    "workflow": "workflow",
    "governance": "governance",
    "frontend_shell": "shell_route",
    "portal": "portal",
    "collaboration": "collaboration",
    "security_runtime": "authority",
    "retention_privacy": "retention",
    "observability": "observability",
    "release_resilience": "release",
    "validation": "observability",
    "coherence": "observability",
}
GLOSSARY_SECTION_CATEGORY = {
    "Core engine terms": "core_engine",
    "Execution lineage and identity terms": "lineage",
    "Audit ordering and integrity terms": "observability",
    "Provenance and explanation terms": "evidence",
    "Shell, route, and collaboration terms": "shell_route",
}
VISIBILITY_MARKERS = [
    "customer-safe",
    "customer-visible",
    "internal-only",
    "staff-full",
    "governance",
    "authority-facing",
    "portal",
    "client-visible",
    "operator",
]
HIGH_RISK_TERMS = {
    "run manifest",
    "canonical fact",
    "evidence item",
    "candidate fact",
    "authority acknowledgement",
    "authority reference",
    "shell family",
    "route context",
    "customer safe projection",
    "authority layer boundary",
    "command truth boundary contract",
    "continuation basis",
    "replay basis integrity contract",
    "state transition contract",
    "execution mode compliance",
    "execution mode analysis",
}
SHARED_SPINE_ENUM_NOTES = {
    "CALM_SHELL": "Canonical shell-family enum value for low-noise staff/operator shells.",
    "CLIENT_PORTAL_SHELL": "Canonical shell-family enum value for customer/client portal shells.",
    "GOVERNANCE_DENSITY_SHELL": "Canonical shell-family enum value for governance-density routes.",
    "NATIVE_OPERATOR": "Surface embodiment marker used for native operator delivery without inventing a new shell family.",
}
MANUAL_PROHIBITED_RULES = [
    {
        "alias": "execution envelope",
        "canonical_replacement": "Run Manifest",
        "canonical_term_ids": ["TERM_RUN_MANIFEST"],
        "rationale": "The execution control object is the Run Manifest; envelope wording blurs it with command envelopes and frozen execution bindings.",
        "risk_level": "high",
        "source_refs": [GLOSSARY_PATH, README_PATH],
    },
    {
        "alias": "authority ack",
        "canonical_replacement": "AUTHORITY_ACKNOWLEDGEMENT / Authority of Record acknowledgement",
        "canonical_term_ids": ["TERM_AUTHORITY_ACKNOWLEDGEMENT", "TERM_AUTHORITY_OF_RECORD"],
        "rationale": "Acknowledgement language is legally significant and should not collapse into shorthand.",
        "risk_level": "high",
        "source_refs": [SOURCE_TAXONOMY_PATH, ACTOR_AUTHORITY_MODEL_PATH],
    },
    {
        "alias": "authority data",
        "canonical_replacement": "AUTHORITY_ACKNOWLEDGEMENT or AUTHORITY_REFERENCE (choose the exact source class)",
        "canonical_term_ids": ["TERM_AUTHORITY_ACKNOWLEDGEMENT", "TERM_AUTHORITY_REFERENCE"],
        "rationale": "Authority acknowledgement and authority reference are distinct source classes with different legal effect.",
        "risk_level": "high",
        "source_refs": [SOURCE_TAXONOMY_PATH],
    },
    {
        "alias": "raw evidence",
        "canonical_replacement": "SourceRecord or EvidenceItem (choose the exact layer)",
        "canonical_term_ids": ["TERM_SOURCE_RECORD", "TERM_EVIDENCE_ITEM"],
        "rationale": "Raw source material and retained evidence are related but not interchangeable layers in the taxonomy.",
        "risk_level": "high",
        "source_refs": [SOURCE_TAXONOMY_PATH],
    },
    {
        "alias": "derived fact",
        "canonical_replacement": "DerivedValue or CanonicalFact (choose the exact artifact)",
        "canonical_term_ids": ["TERM_DERIVED_VALUE", "TERM_CANONICAL_FACT"],
        "rationale": "Deterministic derivations and canonical facts are distinct semantic layers.",
        "risk_level": "high",
        "source_refs": [SOURCE_TAXONOMY_PATH],
    },
    {
        "alias": "re-run",
        "canonical_replacement": "Replay, Recovery, or Continuation Basis (choose the exact lineage posture)",
        "canonical_term_ids": ["TERM_REPLAY", "TERM_RECOVERY", "TERM_CONTINUATION_BASIS"],
        "rationale": "Replay, recovery, and continuation have different lineage and legal semantics.",
        "risk_level": "high",
        "source_refs": [REPLAY_CONTRACT_PATH, GLOSSARY_PATH],
    },
    {
        "alias": "same screen",
        "canonical_replacement": "Shell Family / Route Context / Object Anchor Ref (choose the governing shell concept)",
        "canonical_term_ids": ["TERM_SHELL_FAMILY", "TERM_ROUTE_CONTEXT", "TERM_OBJECT_ANCHOR_REF"],
        "rationale": "Screen wording is too renderer-local to stand in for shell, route, and object-stability contracts.",
        "risk_level": "medium",
        "source_refs": [README_PATH, ARCHITECTURE_GUARDRAILS_PATH, GLOSSARY_PATH],
    },
    {
        "alias": "customer only",
        "canonical_replacement": "customer-safe or customer-visible (choose the exact visibility boundary)",
        "canonical_term_ids": ["TERM_CUSTOMER_SAFE_PROJECTION", "TERM_VISIBILITY_CLASS"],
        "rationale": "Customer-safe and customer-visible are distinct bounded vocabularies and cannot be replaced by looser audience shorthand.",
        "risk_level": "high",
        "source_refs": [README_PATH, GLOSSARY_PATH],
    },
    {
        "alias": "staff visible",
        "canonical_replacement": "internal-only, staff-full, or governance-controlled (choose the exact visibility boundary)",
        "canonical_term_ids": ["TERM_VISIBILITY_CLASS"],
        "rationale": "Internal audience language must keep explicit visibility classes rather than fuzzy staff wording.",
        "risk_level": "high",
        "source_refs": [README_PATH, GLOSSARY_PATH],
    },
    {
        "alias": "override approval",
        "canonical_replacement": "Override or Gate Decision (choose the exact control object)",
        "canonical_term_ids": ["TERM_OVERRIDE", "TERM_GATE"],
        "rationale": "Approvals, overrides, and gate decisions are related but distinct control layers.",
        "risk_level": "high",
        "source_refs": [GLOSSARY_PATH, ACTOR_AUTHORITY_MODEL_PATH],
    },
    {
        "alias": "amendment correction",
        "canonical_replacement": "Amendment Eligibility Contract, Drift, or authority correction (choose the exact posture)",
        "canonical_term_ids": ["TERM_AMENDMENT_ELIGIBILITY_CONTRACT", "TERM_DRIFT"],
        "rationale": "Amendment, drift, and authority correction are not interchangeable lifecycles.",
        "risk_level": "high",
        "source_refs": [GLOSSARY_PATH, BOUNDARY_PATH],
    },
    {
        "alias": "submission success",
        "canonical_replacement": "Authority of Record acknowledgement",
        "canonical_term_ids": ["TERM_AUTHORITY_OF_RECORD", "TERM_AUTHORITY_ACKNOWLEDGEMENT"],
        "rationale": "Internal submission intent or UI posture must not masquerade as authority-defined legal state.",
        "risk_level": "high",
        "source_refs": [ACTOR_AUTHORITY_MODEL_PATH, BOUNDARY_PATH],
    },
]


@dataclass
class TraceabilityRecord:
    source_file: str
    source_heading_or_logical_block: str
    rationale: str

    def to_dict(self) -> dict[str, str]:
        return {
            "source_file": self.source_file,
            "source_heading_or_logical_block": self.source_heading_or_logical_block,
            "rationale": self.rationale,
        }


@dataclass
class TermRecord:
    term_id: str
    canonical_term: str
    term_category: str
    definition: str
    authoritative_source_refs: set[str] = field(default_factory=set)
    machine_field_names: set[str] = field(default_factory=set)
    canonical_contract_names: set[str] = field(default_factory=set)
    allowed_aliases: set[str] = field(default_factory=set)
    prohibited_aliases: set[str] = field(default_factory=set)
    related_terms: set[str] = field(default_factory=set)
    visibility_or_audience_notes: str = ""
    drift_risk_level: str = "medium"
    notes: list[str] = field(default_factory=list)
    source_heading_or_logical_block: str = ""
    traceability: list[TraceabilityRecord] = field(default_factory=list)
    source_sections: set[str] = field(default_factory=set)
    source_domain_families: set[str] = field(default_factory=set)
    source_glossary_terms: set[str] = field(default_factory=set)
    preferred_contract_hint: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "term_id": self.term_id,
            "canonical_term": self.canonical_term,
            "term_category": self.term_category,
            "definition": self.definition,
            "authoritative_source_refs": sorted(self.authoritative_source_refs),
            "machine_field_names": sorted(self.machine_field_names),
            "canonical_contract_names": sorted(self.canonical_contract_names),
            "allowed_aliases": sorted(self.allowed_aliases),
            "prohibited_aliases": sorted(self.prohibited_aliases),
            "related_terms": sorted(self.related_terms),
            "visibility_or_audience_notes": self.visibility_or_audience_notes,
            "drift_risk_level": self.drift_risk_level,
            "notes": self.notes,
            "source_heading_or_logical_block": self.source_heading_or_logical_block,
            "traceability": [record.to_dict() for record in self.traceability],
        }


def load_json(path: Path) -> Any:
    return json.loads(path.read_text())


def json_write(path: Path, payload: Any) -> None:
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")


def normalize_phrase(text: str) -> str:
    text = re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", text)
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()


def normalize_key(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", normalize_phrase(text))


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def pascalize(text: str) -> str:
    clean = re.sub(r"[/()]+", " ", text)
    parts = re.findall(r"[A-Za-z0-9]+", clean)
    return "".join(part.capitalize() for part in parts)


def repo_rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def line_ref(path: str, line_number: int, label: str) -> str:
    return f"{path}::L{line_number}[{slugify(label) or 'term'}]"


def dedupe_sorted(values: Iterable[str]) -> list[str]:
    return sorted({value for value in values if value})


def flatten_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def load_inventory_domain_map() -> dict[str, str]:
    rows = load_json(FILE_INVENTORY_JSON_PATH)["rows"]
    return {row["path"]: row["domain_family"] for row in rows}


def load_cross_reference_rows() -> list[dict[str, Any]]:
    return load_json(CROSS_REFERENCE_JSON_PATH)["rows"]


def build_cross_reference_index(rows: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    indexed: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        keys = {
            normalize_key(row["logical_family_name"]),
            normalize_key(row["logical_family_id"]),
            normalize_key(row["normalized_key"]),
        }
        for alias in row.get("aliases", []):
            keys.add(normalize_key(alias))
        for key in keys:
            if key:
                indexed[key].append(row)
    return dict(indexed)


def extract_heading_section(path: Path, heading: str) -> str:
    text = path.read_text()
    lines = text.splitlines()
    capture = False
    collected: list[str] = []
    target_prefix = f"## {heading}"
    for line in lines:
        if line.startswith("## "):
            if capture:
                break
            if line.strip() == target_prefix:
                capture = True
                continue
        if capture:
            collected.append(line)
    return "\n".join(collected).strip()


def parse_glossary_terms() -> list[dict[str, Any]]:
    lines = (ROOT / GLOSSARY_PATH).read_text().splitlines()
    terms: list[dict[str, Any]] = []
    current_section = "Glossary"
    index = 0
    while index < len(lines):
        line = lines[index]
        section_match = re.match(r"^##\s+(.+)$", line)
        if section_match:
            current_section = section_match.group(1).strip()
            index += 1
            continue
        if not line.startswith("**"):
            index += 1
            continue

        title_parts = [line.strip()]
        start_line = index + 1
        while "**:" not in " ".join(title_parts):
            index += 1
            title_parts.append(lines[index].strip())
        combined = " ".join(title_parts)
        match = re.match(r"^\*\*(.+?)\*\*:\s*(.*)$", combined)
        if not match:
            raise ValueError(f"Unable to parse glossary term near line {start_line}: {combined}")

        title = match.group(1).strip()
        definition_parts = [match.group(2).strip()]
        index += 1
        while index < len(lines) and not lines[index].startswith("**") and not lines[index].startswith("## "):
            if lines[index].strip():
                definition_parts.append(lines[index].strip())
            index += 1
        terms.append(
            {
                "section": current_section,
                "title": title,
                "definition": flatten_text(" ".join(definition_parts)),
                "line_number": start_line,
            }
        )
    return terms


def split_title_and_tokens(title: str) -> tuple[str, list[str]]:
    tokens = re.findall(r"`([^`]+)`", title)
    clean_title = re.sub(r"\s*\((?:`[^`]+`(?:,\s*`[^`]+`)*)\)\s*", "", title).strip()
    return clean_title, tokens


def detect_machine_field_names(tokens: Iterable[str]) -> list[str]:
    fields: list[str] = []
    for token in tokens:
        if token.endswith(".json") or token.endswith(".md"):
            continue
        if re.fullmatch(r"[a-z][a-z0-9_\[\]]*", token):
            fields.append(token)
    return dedupe_sorted(fields)


def detect_contract_names(tokens: Iterable[str], canonical_term: str) -> list[str]:
    names: set[str] = set()
    for token in tokens:
        if token.endswith(".json") or token.endswith(".md"):
            names.add(token)
        elif re.fullmatch(r"[A-Z][A-Za-z0-9]+", token):
            names.add(token)
        elif token.endswith("_contract") or token.endswith("_harness") or token.endswith("_snapshot"):
            names.add(token)
    if canonical_term.endswith(" Contract") or canonical_term.endswith(" Harness") or canonical_term.endswith(" Snapshot"):
        names.add(pascalize(canonical_term))
    if canonical_term.endswith(" Item") or canonical_term.endswith(" Fact") or canonical_term.endswith(" Record"):
        names.add(pascalize(canonical_term))
    return dedupe_sorted(names)


def infer_term_category(section: str, canonical_term: str, definition: str, *, explicit_domain: str | None = None) -> str:
    if explicit_domain:
        return DOMAIN_TO_TERM_CATEGORY.get(explicit_domain, explicit_domain)

    normalized_term = normalize_phrase(canonical_term)
    if "authority" in normalized_term or "delegation" in normalized_term:
        return "authority"
    if any(token in normalized_term for token in ["governance", "retention", "blast radius"]):
        return "governance"
    if any(token in normalized_term for token in ["portal", "customer safe", "upload session"]):
        return "portal"
    if any(token in normalized_term for token in ["collaboration", "queue", "workflow", "work item"]):
        return "collaboration" if "collaboration" in normalized_term or "queue" in normalized_term else "workflow"
    if any(token in normalized_term for token in ["shell", "route", "focus", "workspace", "view guard", "surface embodiment"]):
        return "shell_route"
    if any(token in normalized_term for token in ["lineage", "continuation", "replay", "manifest", "execution mode"]):
        return "lineage"
    if any(token in normalized_term for token in ["evidence", "canonical fact", "candidate fact", "source", "derived value", "proof", "path"]):
        return "evidence"
    if any(token in normalized_term for token in ["audit", "stream", "recorded at", "traceability", "forensic"]):
        return "observability"
    if any(token in normalized_term for token in ["state transition", "schema reader", "sandbox coverage", "nightly", "backfill", "release"]):
        return "release"
    return GLOSSARY_SECTION_CATEGORY.get(section, "core_engine")


def infer_visibility_notes(definition: str, canonical_term: str) -> str:
    normalized_definition = normalize_phrase(definition)
    if any(marker in normalized_definition for marker in VISIBILITY_MARKERS):
        return "Audience or visibility-sensitive term. Preserve the exact projection boundary named in the corpus."
    if "portal" in normalized_definition or "client" in normalized_definition:
        return "Customer-safe or customer-visible wording must not redefine internal operator semantics."
    if "authority" in normalized_definition:
        return "Authority-facing terminology must preserve external authority-of-record semantics."
    return ""


def infer_drift_risk(canonical_term: str, definition: str, category: str) -> str:
    normalized = normalize_phrase(canonical_term)
    if normalized in HIGH_RISK_TERMS:
        return "high"
    if any(token in normalized for token in ["authority", "visibility", "customer safe", "route", "shell", "manifest", "replay", "recovery", "constraint", "gate", "override"]):
        return "high"
    if category in {"authority", "shell_route", "evidence", "lineage", "governance", "release"}:
        return "high"
    if category in {"portal", "collaboration", "workflow", "observability"}:
        return "medium"
    return "low"


def make_term_id(canonical_term: str) -> str:
    return "TERM_" + re.sub(r"[^A-Z0-9]+", "_", canonical_term.upper()).strip("_")


def build_initial_term(title: str, definition: str, section: str, line_number: int) -> TermRecord:
    canonical_term, title_tokens = split_title_and_tokens(title)
    term = TermRecord(
        term_id=make_term_id(canonical_term),
        canonical_term=canonical_term,
        term_category=infer_term_category(section, canonical_term, definition),
        definition=definition,
        source_heading_or_logical_block=section,
        visibility_or_audience_notes=infer_visibility_notes(definition, canonical_term),
        drift_risk_level=infer_drift_risk(canonical_term, definition, infer_term_category(section, canonical_term, definition)),
    )
    term.authoritative_source_refs.add(line_ref(GLOSSARY_PATH, line_number, canonical_term))
    term.traceability.append(
        TraceabilityRecord(
            source_file=GLOSSARY_PATH,
            source_heading_or_logical_block=section,
            rationale="Authoritative glossary seed term.",
        )
    )
    term.source_sections.add(section)
    term.source_glossary_terms.add(title)
    term.allowed_aliases.update(extract_safe_aliases(canonical_term, title_tokens))
    term.machine_field_names.update(detect_machine_field_names(title_tokens))
    term.canonical_contract_names.update(detect_contract_names(title_tokens, canonical_term))

    definition_tokens = re.findall(r"`([^`]+)`", definition)
    term.machine_field_names.update(
        token
        for token in definition_tokens
        if re.fullmatch(r"[a-z][a-z0-9_\[\]]*", token)
    )
    term.canonical_contract_names.update(
        token
        for token in definition_tokens
        if re.fullmatch(r"[A-Z][A-Za-z0-9]+", token) or token.endswith(".json") or token.endswith(".md")
    )

    if canonical_term == "Work Item / Workflow Item":
        term.allowed_aliases.update(["Work Item", "Workflow Item", "WorkflowItem"])
        term.notes.append("User-facing copy may say 'work item'; persisted object semantics remain `WorkflowItem`.")
    if canonical_term == "Trust Score Band / Cap Band":
        term.allowed_aliases.update(["Trust Score Band", "Cap Band", "Trust Cap Band"])
        term.notes.append("This glossary entry intentionally preserves both score-derived and capped trust bands without collapsing them.")
    if canonical_term == "Constraint Traceability Register":
        term.notes.append("This is the live machine-readable constraint register, not a historical findings ledger.")
    return term


def extract_safe_aliases(canonical_term: str, title_tokens: Iterable[str]) -> list[str]:
    aliases: set[str] = set()
    aliases.add(canonical_term)
    if " / " in canonical_term:
        for part in canonical_term.split("/"):
            aliases.add(part.strip())
    for token in title_tokens:
        if token.endswith(".json") or token.endswith(".md"):
            aliases.add(token)
        elif re.fullmatch(r"[A-Z][A-Za-z0-9]+", token):
            aliases.add(token)
        elif re.fullmatch(r"[a-z][a-z0-9_]+", token):
            aliases.add(token)
    if canonical_term.endswith(" Contract") or canonical_term.endswith(" Harness") or canonical_term.endswith(" Snapshot"):
        aliases.add(pascalize(canonical_term))
    return dedupe_sorted(aliases)


def append_traceability(term: TermRecord, source_file: str, block: str, rationale: str) -> None:
    record = TraceabilityRecord(source_file=source_file, source_heading_or_logical_block=block, rationale=rationale)
    if record.to_dict() not in [item.to_dict() for item in term.traceability]:
        term.traceability.append(record)


def ensure_term(terms: dict[str, TermRecord], canonical_term: str, **kwargs: Any) -> TermRecord:
    term_id = make_term_id(canonical_term)
    term = terms.get(term_id)
    if term is None:
        term = TermRecord(
            term_id=term_id,
            canonical_term=canonical_term,
            term_category=kwargs.pop("term_category", "core_engine"),
            definition=kwargs.pop("definition", ""),
            source_heading_or_logical_block=kwargs.pop("source_heading_or_logical_block", ""),
            visibility_or_audience_notes=kwargs.pop("visibility_or_audience_notes", ""),
            drift_risk_level=kwargs.pop("drift_risk_level", "medium"),
        )
        terms[term_id] = term
    for key, value in kwargs.items():
        if key == "definition" and value and not term.definition:
            term.definition = value
        elif key == "term_category" and value:
            term.term_category = value
        elif key == "source_heading_or_logical_block" and value and not term.source_heading_or_logical_block:
            term.source_heading_or_logical_block = value
        elif key == "visibility_or_audience_notes" and value and not term.visibility_or_audience_notes:
            term.visibility_or_audience_notes = value
        elif key == "drift_risk_level" and value:
            term.drift_risk_level = value
    return term


def extract_markdown_heading_anchor(path: str, heading_text: str) -> str:
    return f"{path}#{slugify(heading_text)}"


def add_readme_shared_spine_terms(terms: dict[str, TermRecord], cross_rows: dict[str, list[dict[str, Any]]]) -> dict[str, list[str]]:
    section = extract_heading_section(ROOT / README_PATH, "Shared Spine Vocabulary")
    lines = [line.strip() for line in section.splitlines() if line.strip().startswith("- ")]
    shared_spine = {
        "shell_families": [],
        "shared_fields": [],
        "read_models": [],
        "interaction_layers": [],
        "visibility_vocab": [],
    }

    for line in lines:
        tokens = re.findall(r"`([^`]+)`", line)
        if "Canonical shell families are fixed" in line:
            shared_spine["shell_families"] = tokens
        elif "field family across browser" in line:
            shared_spine["shared_fields"] = tokens
        elif "authoritative route-visible read models are" in line:
            shared_spine["read_models"] = tokens
        elif "Shared interaction posture is carried explicitly through" in line:
            shared_spine["interaction_layers"] = tokens
        elif "InteractionLayerFoundationContract" in line:
            shared_spine["interaction_layers"].append("InteractionLayerFoundationContract")
        elif "Visibility class language is explicit shared-spine vocabulary" in line:
            shared_spine["visibility_vocab"] = [
                "customer-safe",
                "customer-visible",
                "internal-only",
                "staff-full",
                "governance-controlled",
                "authority-facing",
            ]

    readme_block = "Shared Spine Vocabulary"
    readme_anchor = extract_markdown_heading_anchor(README_PATH, readme_block)

    for enum_value in shared_spine["shell_families"]:
        term = ensure_term(
            terms,
            enum_value,
            term_category="shell_route",
            definition=SHARED_SPINE_ENUM_NOTES[enum_value],
            source_heading_or_logical_block=readme_block,
            visibility_or_audience_notes="Closed shared-spine vocabulary. Do not rename or paraphrase when serializing shell ownership.",
            drift_risk_level="high",
        )
        term.authoritative_source_refs.add(readme_anchor)
        term.allowed_aliases.add(enum_value)
        append_traceability(term, README_PATH, readme_block, "Shared-spine shell-family enum.")

    native_term = ensure_term(
        terms,
        "NATIVE_OPERATOR",
        term_category="shell_route",
        definition=SHARED_SPINE_ENUM_NOTES["NATIVE_OPERATOR"],
        source_heading_or_logical_block=readme_block,
        visibility_or_audience_notes="Embodiment marker only; it does not create a second shell family.",
        drift_risk_level="high",
    )
    native_term.authoritative_source_refs.add(readme_anchor)
    native_term.allowed_aliases.update(["NATIVE_OPERATOR", "Native Operator"])
    native_term.machine_field_names.add("surface_embodiment")
    append_traceability(native_term, README_PATH, readme_block, "Shared-spine native embodiment marker.")

    for field_name in shared_spine["shared_fields"]:
        if field_name == "dominance_contract":
            canonical_term = "Dominance Contract"
            definition = "Shared route-stability metadata field in the README spine vocabulary. It binds dominant-question and action posture across route-visible shells."
        else:
            canonical_term = field_name.replace("_", " ").title().replace("Ref", "Ref")
            definition = f"Shared-spine field named in README Shared Spine Vocabulary: `{field_name}`."
        term = ensure_term(
            terms,
            canonical_term,
            term_category="shell_route",
            definition=definition,
            source_heading_or_logical_block=readme_block,
            visibility_or_audience_notes="Shared-spine route identity field. Preserve exact cross-surface meaning.",
            drift_risk_level="high",
        )
        term.authoritative_source_refs.add(readme_anchor)
        term.machine_field_names.add(field_name)
        term.allowed_aliases.add(field_name)
        append_traceability(term, README_PATH, readme_block, "Shared-spine route or workspace field from README.")

    for read_model in shared_spine["read_models"]:
        term = ensure_term(
            terms,
            read_model,
            term_category=infer_term_category(readme_block, read_model, "", explicit_domain="frontend_shell"),
            definition="Authoritative route-visible read model named in README Shared Spine Vocabulary.",
            source_heading_or_logical_block=readme_block,
            drift_risk_level="high",
        )
        term.authoritative_source_refs.add(readme_anchor)
        term.allowed_aliases.add(read_model)
        term.canonical_contract_names.add(read_model)
        append_traceability(term, README_PATH, readme_block, "README-owned route-visible read model.")
        enrich_from_cross_reference(term, cross_rows)

    for interaction_layer in dedupe_sorted(shared_spine["interaction_layers"]):
        canonical_term = interaction_layer
        if interaction_layer == "InteractionLayerFoundationContract":
            definition = "Shared root contract for portal, operator, and governance interaction layers."
        else:
            readable_name = re.sub(r"([a-z])([A-Z])", r"\1 \2", interaction_layer)
            canonical_term = readable_name
            definition = "Shared interaction-layer contract named in README Shared Spine Vocabulary."
        term = ensure_term(
            terms,
            canonical_term,
            term_category="shell_route",
            definition=definition,
            source_heading_or_logical_block=readme_block,
            visibility_or_audience_notes="Interaction-layer boundary between server-authored semantics and renderer translation.",
            drift_risk_level="high",
        )
        term.authoritative_source_refs.add(readme_anchor)
        term.allowed_aliases.add(interaction_layer)
        term.canonical_contract_names.add(interaction_layer)
        append_traceability(term, README_PATH, readme_block, "README interaction-layer contract.")
        enrich_from_cross_reference(term, cross_rows)

    visibility_term = ensure_term(
        terms,
        "Visibility Boundary Classes",
        term_category="shell_route",
        definition="README shared-spine vocabulary for customer-safe, customer-visible, internal-only, staff-full, governance-controlled, and authority-facing visibility boundaries.",
        source_heading_or_logical_block=readme_block,
        visibility_or_audience_notes="Explicit audience boundary vocabulary. Do not widen or rename locally.",
        drift_risk_level="high",
    )
    visibility_term.authoritative_source_refs.add(readme_anchor)
    visibility_term.allowed_aliases.update(shared_spine["visibility_vocab"])
    append_traceability(visibility_term, README_PATH, readme_block, "README visibility-boundary vocabulary.")

    return shared_spine


def extract_section_text_between(text: str, start_heading: str, end_heading_prefix: str) -> str:
    start = text.index(start_heading)
    section = text[start:]
    end_match = re.search(end_heading_prefix, section)
    if end_match:
        return section[: end_match.start()]
    return section


def add_source_taxonomy_terms(terms: dict[str, TermRecord], cross_rows: dict[str, list[dict[str, Any]]]) -> None:
    text = (ROOT / SOURCE_TAXONOMY_PATH).read_text()
    core_objects_block = extract_section_text_between(text, "## 4.2 Core objects", r"\n## 4\.3 ")
    canonical_term_map = {
        "SourceRecord": "Source Record",
        "EvidenceItem": "Evidence Item",
        "CandidateFact": "Candidate Fact",
        "CanonicalFact": "Canonical Fact",
        "DerivedValue": "Derived Value",
        "InferenceRecord": "Inference Record",
        "GovernanceArtifact": "Governance Artifact",
    }
    for match in re.finditer(r"\*\*(.+?)\*\*\n(.+?)(?=\n\n\*\*|\n## |\Z)", core_objects_block, flags=re.S):
        raw_term = match.group(1).strip()
        canonical_term = canonical_term_map.get(raw_term, raw_term)
        definition = flatten_text(match.group(2))
        term = ensure_term(
            terms,
            canonical_term,
            term_category="evidence",
            definition=definition,
            source_heading_or_logical_block="4.2 Core objects",
            drift_risk_level="high" if canonical_term in {"SourceRecord", "EvidenceItem", "CandidateFact", "CanonicalFact", "DerivedValue"} else "medium",
        )
        term.authoritative_source_refs.add(extract_markdown_heading_anchor(SOURCE_TAXONOMY_PATH, "4.2 Core objects"))
        term.allowed_aliases.update([canonical_term, raw_term])
        term.canonical_contract_names.add(raw_term)
        append_traceability(term, SOURCE_TAXONOMY_PATH, "4.2 Core objects", "Canonical source/evidence taxonomy core object.")
        enrich_from_cross_reference(term, cross_rows)

    source_classes_block = extract_section_text_between(text, "## 4.3 Source classes by origin", r"\n## 4\.4 ")
    for match in re.finditer(r"###\s+Class [A-Z] - `([^`]+)`\n\n(.+?)(?=\n\n### |\n## |\Z)", source_classes_block, flags=re.S):
        canonical_term = match.group(1).strip()
        definition = flatten_text(match.group(2).split("\n\nUse for:", maxsplit=1)[0])
        term = ensure_term(
            terms,
            canonical_term,
            term_category="evidence",
            definition=definition,
            source_heading_or_logical_block="4.3 Source classes by origin",
            drift_risk_level="high",
        )
        term.authoritative_source_refs.add(extract_markdown_heading_anchor(SOURCE_TAXONOMY_PATH, "4-3-source-classes-by-origin"))
        term.allowed_aliases.update([canonical_term, canonical_term.replace("_", " ").title()])
        term.canonical_contract_names.add(canonical_term)
        append_traceability(term, SOURCE_TAXONOMY_PATH, "4.3 Source classes by origin", "Closed source_class vocabulary from taxonomy.")


def add_authority_model_terms(terms: dict[str, TermRecord], cross_rows: dict[str, list[dict[str, Any]]]) -> None:
    text = (ROOT / ACTOR_AUTHORITY_MODEL_PATH).read_text()
    core_concepts_block = extract_section_text_between(text, "## 3.2 Core concepts", r"\n## 3\.3 ")
    for match in re.finditer(r"\*\*(.+?)\*\*\n(.+?)(?=\n\n\*\*|\n## |\n### |\Z)", core_concepts_block, flags=re.S):
        canonical_term = match.group(1).strip()
        definition = flatten_text(match.group(2))
        term = ensure_term(
            terms,
            canonical_term,
            term_category="authority",
            definition=definition,
            source_heading_or_logical_block="3.2 Core concepts",
            drift_risk_level="high",
        )
        term.authoritative_source_refs.add(extract_markdown_heading_anchor(ACTOR_AUTHORITY_MODEL_PATH, "3-2-core-concepts"))
        term.allowed_aliases.add(canonical_term)
        term.canonical_contract_names.add(pascalize(canonical_term))
        append_traceability(term, ACTOR_AUTHORITY_MODEL_PATH, "3.2 Core concepts", "Core authority-model concept.")
        enrich_from_cross_reference(term, cross_rows)

    for match in re.finditer(r"###\s+Layer \d+ - (.+?)\n\n(.+?)(?=\n\n### |\n## |\Z)", text, flags=re.S):
        canonical_term = match.group(1).strip()
        definition = flatten_text(match.group(2))
        term = ensure_term(
            terms,
            canonical_term,
            term_category="authority",
            definition=definition,
            source_heading_or_logical_block="3.4 Authority layers",
            drift_risk_level="high",
        )
        term.authoritative_source_refs.add(extract_markdown_heading_anchor(ACTOR_AUTHORITY_MODEL_PATH, "3-4-authority-layers"))
        term.allowed_aliases.add(canonical_term)
        append_traceability(term, ACTOR_AUTHORITY_MODEL_PATH, "3.4 Authority layers", "Explicit authority layer in actor/authority model.")


def add_execution_mode_terms(terms: dict[str, TermRecord]) -> None:
    compliance = ensure_term(
        terms,
        "Execution Mode COMPLIANCE",
        term_category="lineage",
        definition="Execution mode in which the engine may produce compliance-capable outcomes; analysis-only allowances remain forbidden.",
        source_heading_or_logical_block="2. Execution-context propagation / mode rules",
        drift_risk_level="high",
    )
    compliance.authoritative_source_refs.update(
        [
            extract_markdown_heading_anchor(ARCHITECTURE_GUARDRAILS_PATH, "2-execution-context-propagation"),
            MANIFEST_CONTRACT_PATH,
            REPLAY_CONTRACT_PATH,
        ]
    )
    compliance.allowed_aliases.update(["COMPLIANCE", "execution_mode = COMPLIANCE"])
    compliance.machine_field_names.update(["execution_mode", "analysis_only", "non_compliance_config_refs[]", "counterfactual_basis"])
    append_traceability(compliance, ARCHITECTURE_GUARDRAILS_PATH, "2. Execution-context propagation", "Closed execution-mode vocabulary.")
    append_traceability(compliance, MANIFEST_CONTRACT_PATH, "mode rules", "Manifest mode contract.")

    analysis = ensure_term(
        terms,
        "Execution Mode ANALYSIS",
        term_category="lineage",
        definition="Read-only execution mode for counterfactual or analytical outcomes; it must not allocate live compliance submissions or amendment transmit posture.",
        source_heading_or_logical_block="2. Execution-context propagation / mode rules",
        drift_risk_level="high",
    )
    analysis.authoritative_source_refs.update(
        [
            extract_markdown_heading_anchor(ARCHITECTURE_GUARDRAILS_PATH, "2-execution-context-propagation"),
            MANIFEST_CONTRACT_PATH,
            REPLAY_CONTRACT_PATH,
        ]
    )
    analysis.allowed_aliases.update(["ANALYSIS", "execution_mode = ANALYSIS", "COUNTERFACTUAL_ANALYSIS"])
    analysis.machine_field_names.update(["execution_mode", "analysis_only", "counterfactual_basis"])
    analysis.prohibited_aliases.add("live-ready analysis")
    append_traceability(analysis, ARCHITECTURE_GUARDRAILS_PATH, "2. Execution-context propagation", "Closed execution-mode vocabulary.")
    append_traceability(analysis, REPLAY_CONTRACT_PATH, "COUNTERFACTUAL_ANALYSIS", "Replay contract analysis mode.")


def add_boundary_terms(terms: dict[str, TermRecord]) -> None:
    boundary_terms = [
        (
            "Inside the Engine",
            "Functionality inside the core engine boundary where canonical collection, normalization, computation, explanation, filing packet generation, authority acknowledgement capture, and drift assessment occur.",
            "2) System boundary",
        ),
        (
            "Outside the Core Engine but Inside the Broader Product",
            "Functionality outside the engine proper but still inside the broader product boundary; it must not be mistaken for canonical engine behavior.",
            "2) System boundary",
        ),
        (
            "Outside the Engine Altogether",
            "Activities that remain outside the engine altogether and must not be silently absorbed into engine semantics.",
            "2) System boundary",
        ),
    ]
    for canonical_term, definition, block in boundary_terms:
        term = ensure_term(
            terms,
            canonical_term,
            term_category="core_engine",
            definition=definition,
            source_heading_or_logical_block=block,
            drift_risk_level="high",
        )
        term.authoritative_source_refs.add(extract_markdown_heading_anchor(BOUNDARY_PATH, "2-system-boundary-what-happens-inside-the-engine-and-what-stays-outside"))
        append_traceability(term, BOUNDARY_PATH, block, "Explicit invention/system boundary vocabulary.")


def enrich_from_cross_reference(term: TermRecord, cross_rows: dict[str, list[dict[str, Any]]]) -> None:
    keys = {normalize_key(term.canonical_term)}
    keys.update(normalize_key(alias) for alias in term.allowed_aliases)
    matched_rows: list[dict[str, Any]] = []
    for key in keys:
        matched_rows.extend(cross_rows.get(key, []))
    unique_rows = {row["logical_family_id"]: row for row in matched_rows}.values()
    for row in unique_rows:
        if row["family_kind"] in {"object_family", "contract_family", "state_machine_family"}:
            term.canonical_contract_names.add(row["logical_family_name"])
            term.authoritative_source_refs.update(row["authoritative_prose_refs"][:4])
            if row["family_kind"] == "object_family":
                term.machine_field_names.update(
                    field
                    for field in row.get("aliases", [])
                    if re.fullmatch(r"[a-z][a-z0-9_\[\]]*", field)
                )


def assign_term_level_prohibited_aliases(terms: dict[str, TermRecord]) -> None:
    term_rules = {
        "Run Manifest": ["execution envelope", "just manifest"],
        "Evidence Item": ["source fact"],
        "Canonical Fact": ["derived fact", "evidence fact"],
        "SourceRecord": ["source evidence"],
        "Execution Mode ANALYSIS": ["live-ready analysis"],
        "Authority of Record": ["submission success", "internal success state"],
        "Visibility Class": ["customer only", "staff visible"],
    }
    for canonical_term, aliases in term_rules.items():
        term = terms.get(make_term_id(canonical_term))
        if term:
            term.prohibited_aliases.update(aliases)


def build_related_terms(terms: dict[str, TermRecord]) -> None:
    by_id = list(terms.values())
    alias_lookup: dict[str, list[str]] = defaultdict(list)
    for term in by_id:
        phrases = {term.canonical_term, *term.allowed_aliases}
        for phrase in phrases:
            key = normalize_phrase(phrase)
            if len(key) >= 4:
                alias_lookup[key].append(term.term_id)

    manual_clusters = [
        ["TERM_SOURCE_RECORD", "TERM_EVIDENCE_ITEM", "TERM_CANDIDATE_FACT", "TERM_CANONICAL_FACT", "TERM_DERIVED_VALUE"],
        ["TERM_RUN_MANIFEST", "TERM_CONTINUATION_BASIS", "TERM_MANIFEST_BRANCH_DECISION", "TERM_REPLAY", "TERM_RECOVERY"],
        ["TERM_SHELL_FAMILY", "TERM_ROUTE_CONTEXT", "TERM_OBJECT_ANCHOR_REF", "TERM_VIEW_GUARD_REF", "TERM_WORKSPACE_VERSION"],
        ["TERM_AUTHORITY_OF_RECORD", "TERM_AUTHORITY_ACKNOWLEDGEMENT", "TERM_AUTHORITY_REFERENCE", "TERM_AUTHORITY_LAYER_BOUNDARY"],
        ["TERM_OVERRIDE", "TERM_GATE", "TERM_FAILURE_RESOLUTION_CONTRACT", "TERM_STATE_TRANSITION_CONTRACT"],
    ]
    for cluster in manual_clusters:
        existing = [term_id for term_id in cluster if term_id in terms]
        for term_id in existing:
            terms[term_id].related_terms.update(other for other in existing if other != term_id)

    for term in by_id:
        searchable = normalize_phrase(" ".join([term.definition, " ".join(term.notes), term.visibility_or_audience_notes]))
        for phrase, term_ids in alias_lookup.items():
            if phrase == normalize_phrase(term.canonical_term):
                continue
            if phrase and phrase in searchable:
                term.related_terms.update(other_id for other_id in term_ids if other_id != term.term_id)
        term.related_terms = set(sorted(term.related_terms)[:12])


def build_alias_conflicts(terms: dict[str, TermRecord]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    alias_map: dict[str, set[str]] = defaultdict(set)
    display_map: dict[str, set[str]] = defaultdict(set)
    for term in terms.values():
        aliases = {term.canonical_term, *term.allowed_aliases, *term.machine_field_names, *term.canonical_contract_names}
        for alias in aliases:
            key = normalize_phrase(alias)
            if not key:
                continue
            alias_map[key].add(term.term_id)
            display_map[key].add(alias)

    collisions: list[dict[str, Any]] = []
    for key, term_ids in sorted(alias_map.items()):
        if len(term_ids) < 2:
            continue
        collisions.append(
            {
                "alias_normalized": key,
                "alias_variants": sorted(display_map[key]),
                "term_ids": sorted(term_ids),
                "canonical_terms": sorted(terms[term_id].canonical_term for term_id in term_ids),
                "rationale": "One alias or token resolves to multiple canonical terms and therefore must not be used as unqualified shorthand.",
            }
        )

    prohibited_rules = [
        {
            "alias": rule["alias"],
            "canonical_replacement": rule["canonical_replacement"],
            "canonical_term_ids": rule["canonical_term_ids"],
            "risk_level": rule["risk_level"],
            "rationale": rule["rationale"],
            "source_refs": rule["source_refs"],
        }
        for rule in MANUAL_PROHIBITED_RULES
    ]
    return collisions, sorted(prohibited_rules, key=lambda rule: rule["alias"])


def build_field_map(terms: dict[str, TermRecord]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    field_map: dict[str, list[TermRecord]] = defaultdict(list)
    for term in terms.values():
        for field_name in term.machine_field_names:
            field_map[field_name].append(term)

    field_rows: list[dict[str, Any]] = []
    ambiguous_rows: list[dict[str, Any]] = []
    for field_name, linked_terms in sorted(field_map.items()):
        if len(linked_terms) > 1:
            ambiguous_rows.append(
                {
                    "field_name": field_name,
                    "term_ids": sorted(term.term_id for term in linked_terms),
                    "canonical_terms": sorted(term.canonical_term for term in linked_terms),
                    "rationale": "The same machine token is reused by multiple glossary concepts and must be qualified by object or contract context.",
                }
            )
        primary_term = sorted(linked_terms, key=lambda term: (term.drift_risk_level != "high", term.canonical_term))[0]
        field_rows.append(
            {
                "field_name": field_name,
                "term_id": primary_term.term_id,
                "canonical_term": primary_term.canonical_term,
                "term_category": primary_term.term_category,
                "authoritative_source_refs": sorted(primary_term.authoritative_source_refs),
                "rationale": "Machine field mapped to the normalized ubiquitous-language term.",
            }
        )
    return field_rows, ambiguous_rows


def validate_glossary_coverage(glossary_entries: list[dict[str, Any]], terms: dict[str, TermRecord]) -> list[str]:
    failures: list[str] = []
    coverage_counter: Counter[str] = Counter()
    aliases_by_term = {
        term_id: {normalize_phrase(term.canonical_term), *(normalize_phrase(alias) for alias in term.allowed_aliases)}
        for term_id, term in terms.items()
    }
    for entry in glossary_entries:
        title = entry["title"]
        canonical_term, _tokens = split_title_and_tokens(title)
        normalized = normalize_phrase(canonical_term)
        matches = [term_id for term_id, aliases in aliases_by_term.items() if normalized in aliases]
        if len(matches) != 1:
            failures.append(f"Glossary term `{title}` resolved to {len(matches)} normalized entries.")
        else:
            coverage_counter[matches[0]] += 1
    duplicate_canonical_hits = [term_id for term_id, count in coverage_counter.items() if count > 1]
    if duplicate_canonical_hits:
        failures.append(f"Glossary coverage produced duplicate canonical hits: {sorted(duplicate_canonical_hits)}")
    return failures


def validate_shared_spine_fields(shared_spine: dict[str, list[str]], terms: dict[str, TermRecord]) -> list[str]:
    present_fields = {field_name for term in terms.values() for field_name in term.machine_field_names}
    missing = sorted(field for field in shared_spine["shared_fields"] if field not in present_fields)
    return missing


def write_csv(terms: list[TermRecord]) -> None:
    fieldnames = [
        "term_id",
        "canonical_term",
        "term_category",
        "definition",
        "authoritative_source_refs",
        "machine_field_names",
        "canonical_contract_names",
        "allowed_aliases",
        "prohibited_aliases",
        "related_terms",
        "visibility_or_audience_notes",
        "drift_risk_level",
        "notes",
        "source_heading_or_logical_block",
    ]
    with LANGUAGE_MAP_CSV_PATH.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for term in terms:
            payload = term.to_dict()
            writer.writerow(
                {
                    key: " | ".join(payload[key]) if isinstance(payload[key], list) else payload[key]
                    for key in fieldnames
                }
            )


def build_summary_doc(
    terms: list[TermRecord],
    shared_spine: dict[str, list[str]],
    glossary_coverage_failures: list[str],
    shared_spine_missing_fields: list[str],
    alias_conflicts: list[dict[str, Any]],
    field_ambiguities: list[dict[str, Any]],
) -> str:
    category_counts = Counter(term.term_category for term in terms)
    risk_counts = Counter(term.drift_risk_level for term in terms)
    lines = [
        "# Glossary Normalization And Ubiquitous Language Map",
        "",
        "This report turns the authoritative Taxat vocabulary into a machine-readable ubiquitous-language layer for downstream architecture, schema, QA, and prompt work.",
        "",
        "## Summary",
        "",
        f"- Total normalized terms: `{len(terms)}`.",
        f"- High-drift-risk terms: `{risk_counts['high']}`.",
        f"- Medium-drift-risk terms: `{risk_counts['medium']}`.",
        f"- Low-drift-risk terms: `{risk_counts['low']}`.",
        f"- Shared-spine fields covered: `{len(shared_spine['shared_fields']) - len(shared_spine_missing_fields)}` / `{len(shared_spine['shared_fields'])}`.",
        f"- Glossary seed failures: `{len(glossary_coverage_failures)}`.",
        f"- Alias collisions surfaced: `{len(alias_conflicts)}`.",
        f"- Ambiguous machine-field mappings: `{len(field_ambiguities)}`.",
        "",
        "## Category Counts",
        "",
        "| Category | Count |",
        "| --- | ---: |",
    ]
    for category, count in sorted(category_counts.items()):
        lines.append(f"| `{category}` | `{count}` |")

    lines.extend(
        [
            "",
            "## Shared-Spine Coverage",
            "",
            f"- Shell families captured: `{', '.join(shared_spine['shell_families'])}`.",
            f"- Route/shared field family captured: `{', '.join(shared_spine['shared_fields'])}`.",
            f"- Route-visible read models captured: `{len(shared_spine['read_models'])}`.",
            "",
            "## Notable Drift Risks",
            "",
            "| Term | Category | Risk | Notes |",
            "| --- | --- | --- | --- |",
        ]
    )
    for term in [candidate for candidate in terms if candidate.drift_risk_level == "high"][:15]:
        lines.append(
            f"| `{term.canonical_term}` | `{term.term_category}` | `{term.drift_risk_level}` | {term.visibility_or_audience_notes or '; '.join(term.notes) or 'n/a'} |"
        )

    lines.extend(
        [
            "",
            "## Validation Notes",
            "",
            f"- Glossary canonicalization failures: `{len(glossary_coverage_failures)}`.",
            f"- Shared-spine fields missing from the normalized map: `{len(shared_spine_missing_fields)}`.",
            "",
            "## Output Files",
            "",
            "- `data/analysis/glossary_normalized.json`",
            "- `data/analysis/ubiquitous_language_map.csv`",
            "- `data/analysis/term_alias_conflicts.json`",
            "- `data/analysis/field_to_term_map.json`",
            "- `docs/analysis/04_prohibited_synonyms_and_term_drift_rules.md`",
        ]
    )
    return "\n".join(lines) + "\n"


def build_drift_doc(
    prohibited_rules: list[dict[str, Any]],
    alias_conflicts: list[dict[str, Any]],
    field_ambiguities: list[dict[str, Any]],
) -> str:
    lines = [
        "# Prohibited Synonyms And Term Drift Rules",
        "",
        "These rules are the explicit anti-drift layer for the Taxat ubiquitous-language map. They identify phrases and shorthands that should not be introduced in future prose or support documents without disambiguation.",
        "",
        "## Prohibited Alias Rules",
        "",
        "| Prohibited alias | Canonical replacement | Risk | Rationale |",
        "| --- | --- | --- | --- |",
    ]
    for rule in prohibited_rules:
        lines.append(
            f"| `{rule['alias']}` | {rule['canonical_replacement']} | `{rule['risk_level']}` | {rule['rationale']} |"
        )

    lines.extend(
        [
            "",
            "## Alias Collision Clusters",
            "",
            "| Alias variants | Canonical terms |",
            "| --- | --- |",
        ]
    )
    for conflict in alias_conflicts[:20]:
        lines.append(
            f"| `{', '.join(conflict['alias_variants'])}` | {', '.join(conflict['canonical_terms'])} |"
        )

    lines.extend(
        [
            "",
            "## Ambiguous Machine Field Tokens",
            "",
            "| Field token | Canonical terms |",
            "| --- | --- |",
        ]
    )
    for ambiguity in field_ambiguities[:20]:
        lines.append(
            f"| `{ambiguity['field_name']}` | {', '.join(ambiguity['canonical_terms'])} |"
        )

    return "\n".join(lines) + "\n"


def main() -> int:
    domain_map = load_inventory_domain_map()
    cross_rows = build_cross_reference_index(load_cross_reference_rows())

    terms: dict[str, TermRecord] = {}
    glossary_entries = parse_glossary_terms()
    for entry in glossary_entries:
        term = build_initial_term(entry["title"], entry["definition"], entry["section"], entry["line_number"])
        terms[term.term_id] = term
        enrich_from_cross_reference(term, cross_rows)

    shared_spine = add_readme_shared_spine_terms(terms, cross_rows)
    add_source_taxonomy_terms(terms, cross_rows)
    add_authority_model_terms(terms, cross_rows)
    add_execution_mode_terms(terms)
    add_boundary_terms(terms)

    for term in terms.values():
        for source_ref in list(term.authoritative_source_refs):
            path = re.split(r"::|#", source_ref, maxsplit=1)[0]
            if path in domain_map:
                term.source_domain_families.add(domain_map[path])
        if term.term_category == "core_engine" and term.source_domain_families:
            preferred = sorted(term.source_domain_families, key=lambda value: DOMAIN_TO_TERM_CATEGORY.get(value, value))[0]
            term.term_category = DOMAIN_TO_TERM_CATEGORY.get(preferred, term.term_category)
        if not term.visibility_or_audience_notes:
            term.visibility_or_audience_notes = infer_visibility_notes(term.definition, term.canonical_term)
        term.drift_risk_level = infer_drift_risk(term.canonical_term, term.definition, term.term_category)
        term.allowed_aliases = set(dedupe_sorted(term.allowed_aliases))
        term.machine_field_names = set(dedupe_sorted(term.machine_field_names))
        term.canonical_contract_names = set(dedupe_sorted(term.canonical_contract_names))

    assign_term_level_prohibited_aliases(terms)
    build_related_terms(terms)
    alias_conflicts, prohibited_rules = build_alias_conflicts(terms)
    field_rows, field_ambiguities = build_field_map(terms)
    glossary_coverage_failures = validate_glossary_coverage(glossary_entries, terms)
    shared_spine_missing_fields = validate_shared_spine_fields(shared_spine, terms)

    term_rows = sorted(terms.values(), key=lambda term: term.term_id)
    json_write(
        GLOSSARY_JSON_PATH,
        {
            "summary": {
                "generated_from_task": "pc_0004",
                "term_count": len(term_rows),
                "category_counts": dict(sorted(Counter(term.term_category for term in term_rows).items())),
                "drift_risk_counts": dict(sorted(Counter(term.drift_risk_level for term in term_rows).items())),
                "glossary_seed_count": len(glossary_entries),
                "shared_spine_field_count": len(shared_spine["shared_fields"]),
                "shared_spine_missing_fields": shared_spine_missing_fields,
                "glossary_coverage_failures": glossary_coverage_failures,
            },
            "shared_spine_vocabulary": shared_spine,
            "prohibited_alias_rules": prohibited_rules,
            "terms": [term.to_dict() for term in term_rows],
        },
    )
    write_csv(term_rows)
    json_write(
        ALIAS_CONFLICTS_PATH,
        {
            "generated_from_task": "pc_0004",
            "alias_conflicts": alias_conflicts,
            "prohibited_alias_rules": prohibited_rules,
            "glossary_coverage_failures": glossary_coverage_failures,
            "shared_spine_missing_fields": shared_spine_missing_fields,
        },
    )
    json_write(
        FIELD_TO_TERM_MAP_PATH,
        {
            "generated_from_task": "pc_0004",
            "field_rows": field_rows,
            "ambiguous_field_tokens": field_ambiguities,
        },
    )
    GLOSSARY_DOC_PATH.write_text(
        build_summary_doc(term_rows, shared_spine, glossary_coverage_failures, shared_spine_missing_fields, alias_conflicts, field_ambiguities)
    )
    DRIFT_DOC_PATH.write_text(build_drift_doc(prohibited_rules, alias_conflicts, field_ambiguities))

    print(
        json.dumps(
            {
                "status": "PASS",
                "term_count": len(term_rows),
                "glossary_seed_count": len(glossary_entries),
                "shared_spine_missing_fields": len(shared_spine_missing_fields),
                "alias_conflict_count": len(alias_conflicts),
                "ambiguous_field_token_count": len(field_ambiguities),
            },
            indent=2,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
