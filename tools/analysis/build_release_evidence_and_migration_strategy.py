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

RELEASE_EVIDENCE_PATH = (
    ALGORITHM_DIR / "release_candidate_identity_and_promotion_evidence_contract.md"
)
DEPLOYMENT_PATH = ALGORITHM_DIR / "deployment_and_resilience_contract.md"
RECOVERY_PATH = (
    ALGORITHM_DIR / "recovery_tier_checkpoint_and_fail_forward_governance_contract.md"
)
VERIFY_GATES_PATH = ALGORITHM_DIR / "verification_and_release_gates.md"
MANIFEST_FREEZE_PATH = ALGORITHM_DIR / "manifest_and_config_freeze_contract.md"
REPLAY_PATH = ALGORITHM_DIR / "replay_and_reproducibility_contract.md"
NIGHTLY_AUTOPILOT_PATH = ALGORITHM_DIR / "nightly_autopilot_contract.md"
NIGHTLY_SELECTION_PATH = (
    ALGORITHM_DIR / "nightly_selection_disposition_and_batch_isolation_contract.md"
)
SECURITY_PATH = ALGORITHM_DIR / "security_and_runtime_hardening_contract.md"
MACOS_BLUEPRINT_PATH = ALGORITHM_DIR / "macos_native_operator_workspace_blueprint.md"

RELEASE_GATE_MATRIX_PATH = (
    DATA_ANALYSIS_DIR / "release_candidate_and_compatibility_gate_matrix.json"
)
RELEASE_TEST_BINDING_PATH = (
    DATA_ANALYSIS_DIR / "release_candidate_test_evidence_binding.json"
)
ROLLBACK_BOUNDARY_PATH = (
    DATA_ANALYSIS_DIR / "rollback_fail_forward_boundary_matrix.json"
)
RECOVERY_MATRIX_PATH = DATA_ANALYSIS_DIR / "recovery_checkpoint_reopen_matrix.json"
RESTORE_PRIVACY_PATH = DATA_ANALYSIS_DIR / "restore_privacy_reconciliation_matrix.json"
SECURITY_GATE_MATRIX_PATH = DATA_ANALYSIS_DIR / "security_release_gate_matrix.json"
REBUILD_RESTORE_PATH = DATA_ANALYSIS_DIR / "rebuild_restore_and_replay_topology.json"
MANIFEST_CLAIM_PATH = (
    DATA_ANALYSIS_DIR / "manifest_start_claim_and_branch_selection_matrix.json"
)
NIGHTLY_SELECTION_MATRIX_PATH = (
    DATA_ANALYSIS_DIR / "nightly_selection_disposition_matrix.json"
)
NIGHTLY_UNATTENDED_PATH = DATA_ANALYSIS_DIR / "nightly_unattended_policy_matrix.json"

ADR_PATH = DOCS_ARCH_ADR_DIR / "ADR-009-release-evidence-and-migration-strategy.md"
COMPARISON_PATH = (
    DOCS_ARCH_ADR_DIR
    / "ADR-009-release-evidence-and-migration-strategy-comparison.md"
)
SCORECARD_PATH = (
    DOCS_ARCH_ADR_DIR
    / "ADR-009-release-evidence-and-migration-strategy-scorecard.json"
)
RELEASE_EVIDENCE_MATRIX_PATH = (
    DATA_ANALYSIS_DIR / "release_evidence_artifact_matrix.json"
)
MIGRATION_STRATEGY_PATH = (
    DATA_ANALYSIS_DIR / "schema_migration_and_reader_window_strategy.json"
)
ROLLBACK_DECISION_MATRIX_PATH = (
    DATA_ANALYSIS_DIR / "rollback_fail_forward_decision_matrix.json"
)
CLIENT_WINDOW_STRATEGY_PATH = (
    DATA_ANALYSIS_DIR / "client_compatibility_and_supported_window_strategy.json"
)
RESTORE_BINDING_RULES_PATH = (
    DATA_ANALYSIS_DIR / "restore_drill_and_promotion_binding_rules.json"
)
CANDIDATE_GATE_BINDING_MAP_PATH = (
    DATA_ANALYSIS_DIR / "candidate_identity_and_gate_binding_map.json"
)
MERMAID_PATH = (
    DIAGRAMS_ANALYSIS_DIR / "ADR-009-release-evidence-migration-strategy.mmd"
)

HEADING_RE = re.compile(r"^(#{2,4})\s+(.*)$")
TODAY = "2026-04-18"


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


def normalize_source_refs(source_refs: Iterable[Any]) -> list[str]:
    normalized: list[str] = []
    for ref in source_refs:
        if isinstance(ref, str):
            normalized.append(ref)
            continue
        if isinstance(ref, dict):
            source_file = ref.get("source_file", "unknown")
            logical_block = (
                ref.get("source_heading_or_logical_block")
                or ref.get("source_heading")
                or "source"
            )
            rationale = ref.get("rationale")
            text = f"{source_file}::{logical_block}"
            if rationale:
                text += f"[{rationale}]"
            normalized.append(text)
            continue
        normalized.append(str(ref))
    return ordered_unique(normalized)


def build_supporting_context() -> dict[str, Any]:
    release_matrix = load_json(RELEASE_GATE_MATRIX_PATH)
    release_binding = load_json(RELEASE_TEST_BINDING_PATH)
    rollback_boundary = load_json(ROLLBACK_BOUNDARY_PATH)
    recovery_matrix = load_json(RECOVERY_MATRIX_PATH)
    restore_privacy = load_json(RESTORE_PRIVACY_PATH)
    security_gate_matrix = load_json(SECURITY_GATE_MATRIX_PATH)
    rebuild_restore = load_json(REBUILD_RESTORE_PATH)
    manifest_claim = load_json(MANIFEST_CLAIM_PATH)
    nightly_selection = load_json(NIGHTLY_SELECTION_MATRIX_PATH)
    nightly_unattended = load_json(NIGHTLY_UNATTENDED_PATH)

    return {
        "candidate_identity_field_count": release_matrix["summary"][
            "candidate_identity_field_count"
        ],
        "compatibility_gate_field_count": release_matrix["summary"][
            "compatibility_gate_field_count"
        ],
        "admissibility_requirement_count": release_matrix["summary"][
            "admissibility_requirement_count"
        ],
        "release_evidence_binding_count": release_matrix["summary"][
            "evidence_binding_count"
        ],
        "blocking_gate_binding_count": release_binding["summary"][
            "blocking_gate_binding_count"
        ],
        "rollback_boundary_state_count": rollback_boundary["summary"][
            "rollback_boundary_state_count"
        ],
        "restore_requirement_count": rollback_boundary["summary"][
            "restore_drill_requirement_count"
        ],
        "recovery_tier_count": recovery_matrix["summary"]["recovery_tier_count"],
        "checkpoint_gate_count": recovery_matrix["summary"]["checkpoint_gate_count"],
        "privacy_reconciliation_state_count": restore_privacy["summary"][
            "restore_state_count"
        ],
        "security_release_gate_count": security_gate_matrix["summary"][
            "release_gate_count"
        ],
        "store_role_count": len(rebuild_restore["store_roles"]),
        "rebuild_path_count": len(rebuild_restore["rebuild_paths"]),
        "claim_invariant_count": manifest_claim["summary"]["claim_invariant_count"],
        "selection_disposition_count": nightly_selection["summary"][
            "selection_disposition_count"
        ],
        "global_stop_condition_count": nightly_unattended["summary"][
            "global_stop_condition_count"
        ],
    }


def build_criteria() -> list[dict[str, Any]]:
    return [
        {
            "criterion_id": "candidate_identity_integrity",
            "label": "Candidate identity integrity",
            "weight": 14,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Promotion evidence must describe one exact candidate tuple so release truth cannot silently mix builds, schema bundles, migration plans, provider profiles, or client windows.",
            "source_refs": [
                heading_ref(RELEASE_EVIDENCE_PATH, "1. Governing candidate identity model"),
                heading_ref(RELEASE_EVIDENCE_PATH, "2. Contract boundary"),
                heading_ref(VERIFY_GATES_PATH, "2. Release gate"),
            ],
        },
        {
            "criterion_id": "migration_safety_for_inflight_and_historical_manifests",
            "label": "Migration safety for in-flight and historical manifests",
            "weight": 13,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Schema changes must preserve sealed, in-flight, replayed, and recovered manifests under frozen bundle and config refs, even while live defaults advance.",
            "source_refs": [
                heading_ref(DEPLOYMENT_PATH, "3. Schema and datastore migration rules"),
                heading_ref(MANIFEST_FREEZE_PATH, "5.3 `RunManifest` required field groups"),
                heading_ref(REPLAY_PATH, "Historical post-seal basis"),
            ],
        },
        {
            "criterion_id": "rollback_versus_fail_forward_safety",
            "label": "Rollback versus fail-forward safety",
            "weight": 12,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Rollback is only lawful while compatibility guarantees still hold; after reader-window closure or destructive change, the system needs a typed fail-forward doctrine instead of operator judgment calls under pressure.",
            "source_refs": [
                heading_ref(DEPLOYMENT_PATH, "6. Rollout, rollback, and fail-forward posture"),
                heading_ref(RECOVERY_PATH, "Rollback and fail-forward law"),
                text_ref(
                    DEPLOYMENT_PATH,
                    "rollback is allowed only when compatibility guarantees still hold;",
                    "rollback_only_when_compatible",
                ),
            ],
        },
        {
            "criterion_id": "replay_and_restore_readability",
            "label": "Replay and restore readability",
            "weight": 10,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Release evidence, migration ledgers, and restore drills must preserve enough basis and reader-window detail to prove historical readability, replay admissibility, and recoverability later.",
            "source_refs": [
                heading_ref(REPLAY_PATH, "Execution-basis freeze contract"),
                heading_ref(REPLAY_PATH, "Exact replay preconditions"),
                heading_ref(DEPLOYMENT_PATH, "5. Backup, restore, and DR rules"),
            ],
        },
        {
            "criterion_id": "web_and_native_client_compatibility_governance",
            "label": "Web and native client compatibility governance",
            "weight": 10,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Promotion must block when the supported client window or shipped native desktop posture is incompatible; compatibility cannot be treated as an advisory note after deploy.",
            "source_refs": [
                heading_ref(VERIFY_GATES_PATH, "1. Required test families"),
                heading_ref(DEPLOYMENT_PATH, "2. Promotion pipeline"),
                heading_ref(MACOS_BLUEPRINT_PATH, "13. Delivery sequencing"),
            ],
        },
        {
            "criterion_id": "operator_burden_and_operational_clarity",
            "label": "Operator burden and operational clarity",
            "weight": 9,
            "priority": "STRONG_PREFERENCE",
            "rationale": "The strategy should be explainable in one promotion runbook so release operators know which artifact answers which question instead of triangulating CI pages, deploy logs, and oral history.",
            "source_refs": [
                heading_ref(DEPLOYMENT_PATH, "7. Minimum operational runbooks"),
                heading_ref(DEPLOYMENT_PATH, "8. Release and resilience invariants"),
                heading_ref(RELEASE_EVIDENCE_PATH, "5. Enforcement"),
            ],
        },
        {
            "criterion_id": "auditability_and_mixed_evidence_prevention",
            "label": "Auditability and mixed-evidence prevention",
            "weight": 11,
            "priority": "HARD_REQUIREMENT",
            "rationale": "The winning strategy must make mixed candidate, mixed compatibility-window, and mixed canary versus full-release evidence mechanically impossible or visibly inadmissible.",
            "source_refs": [
                heading_ref(RELEASE_EVIDENCE_PATH, "4. Eliminated failure modes"),
                heading_ref(VERIFY_GATES_PATH, "Gate admissibility rules"),
                text_ref(
                    VERIFY_GATES_PATH,
                    "`ReleaseVerificationManifest.blocking_gates.*` entry SHALL echo it so mixed-candidate gate binding",
                    "mixed_candidate_gate_binding_fails_closed",
                ),
            ],
        },
        {
            "criterion_id": "restore_drill_realism",
            "label": "Restore-drill realism",
            "weight": 8,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Restore drills must rehearse actual control, audit, object, queue, authority, and privacy posture so promotion evidence does not overclaim recoverability.",
            "source_refs": [
                heading_ref(DEPLOYMENT_PATH, "5. Backup, restore, and DR rules"),
                heading_ref(RECOVERY_PATH, "Recovery checkpoint law"),
                heading_ref(RECOVERY_PATH, "Restore privacy reconciliation law"),
            ],
        },
        {
            "criterion_id": "security_gate_compatibility",
            "label": "Security gate compatibility",
            "weight": 7,
            "priority": "HARD_REQUIREMENT",
            "rationale": "Release evidence needs to compose with signed-build, provenance, session-hardening, cache-isolation, and desktop notarization gates rather than bypassing them as a separate track.",
            "source_refs": [
                heading_ref(SECURITY_PATH, "8. Operational security release gates"),
                heading_ref(SECURITY_PATH, "9. Security invariants"),
                heading_ref(VERIFY_GATES_PATH, "4. Evidence required for promotion"),
            ],
        },
        {
            "criterion_id": "release_speed_versus_correctness",
            "label": "Release speed versus correctness",
            "weight": 6,
            "priority": "TRADEOFF",
            "rationale": "The strategy should keep promotion reasonably fast, but must reject any shortcut that trades replay safety, migration clarity, or recoverability for nominal delivery speed.",
            "source_refs": [
                heading_ref(DEPLOYMENT_PATH, "2. Promotion pipeline"),
                heading_ref(NIGHTLY_AUTOPILOT_PATH, "10. Crash recovery and stale-checkpoint resolution"),
                heading_ref(NIGHTLY_AUTOPILOT_PATH, "11. Global stop conditions and partial-failure handling"),
            ],
        },
    ]


def build_alternatives() -> list[dict[str, Any]]:
    return [
        {
            "alternative_id": "manifest_centered_candidate_bound_release_doctrine",
            "label": "Manifest-centered, candidate-bound release doctrine",
            "summary": "Treat one candidate identity, one compatibility boundary, and one release-verification manifest as the authoritative promotion spine; use expand -> migrate/backfill -> verify -> contract, and force fail-forward once rollback safety ends.",
            "strengths": [
                "Best fit for the corpus's first-class evidence objects and shared hash echoes.",
                "Centralizes migration chronology, restore evidence, and client-window posture into durable release truth.",
                "Makes mixed evidence mechanically inadmissible instead of relying on operator discipline.",
            ],
            "risks": [
                "Highest process discipline because more artifacts must be assembled and reviewed explicitly.",
                "Release tooling must understand candidate, compatibility, restore, and manifest-assembly contracts rather than only CI pass/fail.",
            ],
            "criterion_scores": {
                "candidate_identity_integrity": {
                    "raw_score": 4.9,
                    "note": "This is the only alternative built directly around the canonical candidate tuple and its hash echoes.",
                },
                "migration_safety_for_inflight_and_historical_manifests": {
                    "raw_score": 4.75,
                    "note": "Its explicit reader-window and migration-ledger posture is designed for frozen in-flight and historical manifests.",
                },
                "rollback_versus_fail_forward_safety": {
                    "raw_score": 4.8,
                    "note": "Rollback legality remains explicit until compatibility closes, after which fail-forward is typed and auditable.",
                },
                "replay_and_restore_readability": {
                    "raw_score": 4.75,
                    "note": "Replay, restore, and historical readability remain first-class because the strategy carries compatibility and drill lineage into promotion evidence.",
                },
                "web_and_native_client_compatibility_governance": {
                    "raw_score": 4.75,
                    "note": "Supported client windows and native desktop hardening remain blocking gates instead of post-deploy checks.",
                },
                "operator_burden_and_operational_clarity": {
                    "raw_score": 4.0,
                    "note": "The artifact set is larger, but each artifact has one clear responsibility and runbook location.",
                },
                "auditability_and_mixed_evidence_prevention": {
                    "raw_score": 4.9,
                    "note": "Manifest assembly contracts, candidate hashes, and compatibility hashes directly close the mixed-evidence failure modes named by the corpus.",
                },
                "restore_drill_realism": {
                    "raw_score": 4.8,
                    "note": "Restore drills remain candidate-bound, checkpoint-bound, privacy-aware, and authority-safe.",
                },
                "security_gate_compatibility": {
                    "raw_score": 4.65,
                    "note": "Signed builds, provenance, session-hardening, cache-isolation, and notarization fit naturally as named blocking evidence.",
                },
                "release_speed_versus_correctness": {
                    "raw_score": 4.2,
                    "note": "Slightly slower than dashboard-driven promotion, but speed comes from explicit automation rather than evidence shortcuts.",
                },
            },
        },
        {
            "alternative_id": "ci_dashboard_and_checklist_driven_release_posture",
            "label": "CI dashboard and checklist-driven release posture",
            "summary": "Use CI green runs, deploy dashboards, and operator checklists as the main release truth, with weaker durable bindings between candidate identity, migration chronology, restore evidence, and client compatibility.",
            "strengths": [
                "Lowest initial tooling burden because existing CI and dashboard surfaces can be reused quickly.",
                "Feels operationally simple when the system is small or migrations are rare.",
            ],
            "risks": [
                "Weakest protection against mixed evidence, stale compatibility windows, and swapped restore or canary lineage.",
                "Depends heavily on human interpretation during the exact moments when rollback and migration pressure is highest.",
            ],
            "criterion_scores": {
                "candidate_identity_integrity": {
                    "raw_score": 2.0,
                    "note": "Candidate identity can be described, but not enforced as the root of every artifact.",
                },
                "migration_safety_for_inflight_and_historical_manifests": {
                    "raw_score": 2.3,
                    "note": "Chronology can be documented, but reader-window and historical-manifest safety remain too implicit.",
                },
                "rollback_versus_fail_forward_safety": {
                    "raw_score": 2.1,
                    "note": "Operators are more likely to misapply rollback because legality is narrated in procedures instead of frozen in durable evidence.",
                },
                "replay_and_restore_readability": {
                    "raw_score": 2.25,
                    "note": "Replay and restore remain partly inferential because CI and dashboards are not authoritative evidence objects.",
                },
                "web_and_native_client_compatibility_governance": {
                    "raw_score": 2.4,
                    "note": "Client windows tend to become a checked box instead of a shared compatibility boundary that can block promotion.",
                },
                "operator_burden_and_operational_clarity": {
                    "raw_score": 3.6,
                    "note": "It feels lightweight at first, but clarity drops sharply when a release needs forensic reconstruction.",
                },
                "auditability_and_mixed_evidence_prevention": {
                    "raw_score": 1.8,
                    "note": "This is the riskiest option for mixed canary, mixed schema, or mixed supported-window evidence.",
                },
                "restore_drill_realism": {
                    "raw_score": 2.4,
                    "note": "Restore drills can exist, but their candidate and checkpoint lineage is too easy to decouple from the judged release.",
                },
                "security_gate_compatibility": {
                    "raw_score": 3.0,
                    "note": "Security signals can appear on dashboards, but they are less durable and less candidate-bound than the corpus expects.",
                },
                "release_speed_versus_correctness": {
                    "raw_score": 4.1,
                    "note": "This is the fastest-looking option, but it buys speed by weakening proof.",
                },
            },
        },
        {
            "alternative_id": "deployment_strategy_first_without_manifest_root",
            "label": "Deployment-strategy-first promotion without a manifest-root evidence object",
            "summary": "Prioritize blue/green, push-button, or other rollout mechanics as the release doctrine, with release readiness inferred primarily from deployment topology and live validation rather than a durable release-verification manifest.",
            "strengths": [
                "Can optimize traffic shifting and rollback mechanics for simple systems.",
                "Provides a strong story for deploy orchestration and canary routing mechanics.",
            ],
            "risks": [
                "Confuses deployment mechanics with release truth, even though the corpus requires migration, restore, and compatibility evidence that exist before or alongside rollout.",
                "Still needs most of the candidate and compatibility evidence eventually, which means it duplicates doctrine instead of replacing it.",
            ],
            "criterion_scores": {
                "candidate_identity_integrity": {
                    "raw_score": 2.6,
                    "note": "A deploy strategy can reference one build, but does not by itself bind the full candidate tuple or all companion artifacts.",
                },
                "migration_safety_for_inflight_and_historical_manifests": {
                    "raw_score": 2.7,
                    "note": "Blue/green style thinking does not solve reader-window, sealed-manifest, or historical replay obligations on its own.",
                },
                "rollback_versus_fail_forward_safety": {
                    "raw_score": 2.9,
                    "note": "Rollout mechanics make rollback look easy even after the compatibility boundary says fail-forward only.",
                },
                "replay_and_restore_readability": {
                    "raw_score": 2.5,
                    "note": "Deployment posture says little about restore lineage or exact replay basis without a stronger evidence root.",
                },
                "web_and_native_client_compatibility_governance": {
                    "raw_score": 3.0,
                    "note": "Canary and staged rollout can observe clients, but the supported client window still needs a first-class manifest-bound contract.",
                },
                "operator_burden_and_operational_clarity": {
                    "raw_score": 3.1,
                    "note": "Operators get a cleaner deploy UI, but the release truth remains split between deployment and evidence systems.",
                },
                "auditability_and_mixed_evidence_prevention": {
                    "raw_score": 2.3,
                    "note": "Without a manifest-root evidence object, canary and full-release evidence are more likely to drift apart or be stitched together after the fact.",
                },
                "restore_drill_realism": {
                    "raw_score": 2.8,
                    "note": "Restore drills can feed rollout decisions, but the model does not naturally keep checkpoint and privacy posture candidate-bound.",
                },
                "security_gate_compatibility": {
                    "raw_score": 3.4,
                    "note": "Deploy tooling can respect security gates, but the evidence still needs a stronger candidate-bound container.",
                },
                "release_speed_versus_correctness": {
                    "raw_score": 4.0,
                    "note": "Fast at moving traffic, but speed is overvalued relative to correctness in Taxat's source law.",
                },
            },
        },
    ]


def build_scorecard(
    criteria: list[dict[str, Any]], alternatives: list[dict[str, Any]]
) -> dict[str, Any]:
    results: list[dict[str, Any]] = []
    for alternative in alternatives:
        breakdown: list[dict[str, Any]] = []
        weighted_total = 0.0
        for criterion in criteria:
            score_entry = alternative["criterion_scores"][criterion["criterion_id"]]
            weighted_score = round(score_entry["raw_score"] * criterion["weight"] / 5, 2)
            weighted_total = round(weighted_total + weighted_score, 2)
            breakdown.append(
                {
                    "criterion_id": criterion["criterion_id"],
                    "label": criterion["label"],
                    "priority": criterion["priority"],
                    "weight": criterion["weight"],
                    "raw_score": score_entry["raw_score"],
                    "weighted_score": weighted_score,
                    "note": score_entry["note"],
                }
            )
        results.append(
            {
                "alternative_id": alternative["alternative_id"],
                "label": alternative["label"],
                "summary": alternative["summary"],
                "strengths": alternative["strengths"],
                "risks": alternative["risks"],
                "criterion_breakdown": breakdown,
                "weighted_total": weighted_total,
            }
        )
    results.sort(key=lambda item: (-item["weighted_total"], item["label"]))
    for rank, item in enumerate(results, 1):
        item["rank"] = rank
    winner = results[0]
    return {
        "decision_id": "ADR-009-release-evidence-and-migration-strategy",
        "generated_at": TODAY,
        "criteria": criteria,
        "alternatives": results,
        "decision": {
            "selected_alternative_id": winner["alternative_id"],
            "selected_label": winner["label"],
            "selected_weighted_total": winner["weighted_total"],
            "runner_up_alternative_id": results[1]["alternative_id"],
            "runner_up_label": results[1]["label"],
            "runner_up_weighted_total": results[1]["weighted_total"],
            "rejected_alternative_ids": [item["alternative_id"] for item in results[1:]],
        },
    }


def build_candidate_identity_and_gate_binding_map() -> dict[str, Any]:
    release_matrix = load_json(RELEASE_GATE_MATRIX_PATH)
    release_binding = load_json(RELEASE_TEST_BINDING_PATH)
    candidate_fields = [
        {
            "field": row["candidate_identity_field"],
            "purpose": row["state_or_outcome"],
            "source_ref": row["source_ref"],
        }
        for row in release_matrix["candidate_identity_fields"]
    ]
    compatibility_fields = [
        {
            "field": row["compatibility_gate_field"],
            "purpose": row["state_or_outcome"],
            "source_ref": row["source_ref"],
        }
        for row in release_matrix["compatibility_gate_fields"]
    ]
    admissibility_rules = [
        {
            "rule_id": row["canonical_id"],
            "requirement": row["state_or_outcome"],
            "source_ref": row["source_ref"],
        }
        for row in release_matrix["admissibility_requirements"]
    ]
    batch_rules = [
        {
            "rule_id": "frozen_batch_envelope_prevents_candidate_drift",
            "rule": "Nightly selection freezes a batch envelope before execution so duplicate suppression and later evidence reuse do not silently widen the judged candidate or operating window.",
            "source_refs": [
                heading_ref(NIGHTLY_AUTOPILOT_PATH, "2. Trigger contract and frozen operating window"),
                heading_ref(NIGHTLY_AUTOPILOT_PATH, "4. Portfolio selection and eligibility contract"),
            ],
        },
        {
            "rule_id": "stale_batch_reclaim_must_not_reuse_incompatible_attempts",
            "rule": "Stale-batch reclaim may recover ownership, but it may not treat a reclaimed attempt as valid release evidence if schema, migration, or client-window identity drifted.",
            "source_refs": [
                heading_ref(NIGHTLY_AUTOPILOT_PATH, "10. Crash recovery and stale-checkpoint resolution"),
                heading_ref(NIGHTLY_SELECTION_PATH, "Recovery-reclaim law"),
            ],
        },
        {
            "rule_id": "manifest_start_claim_freezes_lineage_inputs",
            "rule": "Manifest start-claim and branch-selection identity inputs stay frozen so recovery, continuation, and replay cannot collapse into ordinary fresh execution under a new release boundary.",
            "source_refs": [
                heading_ref(NIGHTLY_SELECTION_PATH, "Identity law"),
                heading_ref(NIGHTLY_SELECTION_PATH, "Selection law"),
            ],
        },
        {
            "rule_id": "manifest_assembly_must_echo_gate_hashes",
            "rule": "ReleaseVerificationManifest assembly must echo candidate, compatibility, and authority-sandbox hashes per gate so mixed canary or mixed full-release evidence fails closed.",
            "source_refs": [
                heading_ref(VERIFY_GATES_PATH, "2. Release gate"),
                heading_ref(VERIFY_GATES_PATH, "4. Evidence required for promotion"),
            ],
        },
    ]
    typed_gaps = [
        {
            "id": "shared_operating_contract_0022_0029_missing",
            "type": "SOURCE_GAP",
            "summary": "The referenced shared operating contract for cards 0022 through 0029 is absent, so ADR-009 is grounded directly in named algorithm contracts and prior analysis outputs.",
        }
    ]
    return {
        "contract_version": TODAY,
        "selected_strategy_id": "manifest_centered_candidate_bound_release_doctrine",
        "summary": {
            "candidate_identity_field_count": len(candidate_fields),
            "compatibility_gate_field_count": len(compatibility_fields),
            "blocking_gate_binding_count": len(
                release_binding["blocking_gate_bindings"]
            ),
            "admissibility_requirement_count": len(admissibility_rules),
            "batch_identity_rule_count": len(batch_rules),
        },
        "candidate_identity_fields": candidate_fields,
        "compatibility_gate_fields": compatibility_fields,
        "blocking_gate_bindings": release_binding["blocking_gate_bindings"],
        "admissibility_requirements": admissibility_rules,
        "batch_and_recovery_identity_rules": batch_rules,
        "typed_gaps_or_deferred_decisions": typed_gaps,
    }


def build_release_evidence_artifact_matrix(
    candidate_gate_binding_map: dict[str, Any],
) -> dict[str, Any]:
    gate_binding_rows = candidate_gate_binding_map["blocking_gate_bindings"]
    rows = [
        {
            "artifact_id": "BuildArtifact",
            "promotion_stage": "BUILD_AND_ATTEST",
            "promotion_required": True,
            "blocking_gates": ["ARTIFACT_INTEGRITY_AND_NOTARIZATION", "SECURITY"],
            "candidate_binding": [
                "build_artifact_ref",
                "artifact_digest",
                "candidate_identity_hash",
            ],
            "compatibility_binding": [],
            "produced_from": "build, signing, provenance, and desktop notarization pipeline",
            "mixed_evidence_failure_mode": "A build digest or notarization result from another candidate is inadmissible.",
            "source_refs": [
                heading_ref(DEPLOYMENT_PATH, "2. Promotion pipeline"),
                heading_ref(SECURITY_PATH, "8. Operational security release gates"),
            ],
        },
        {
            "artifact_id": "SchemaBundleCompatibilityGateContract",
            "promotion_stage": "SCHEMA_COMPATIBILITY",
            "promotion_required": True,
            "blocking_gates": ["SCHEMA_COMPATIBILITY", "MIGRATION_VERIFICATION", "OPERATOR_CLIENT"],
            "candidate_binding": [
                "candidate_identity_hash",
                "schema_bundle_hash",
                "migration_plan_ref_or_null",
                "supported_client_window_ref_or_null",
            ],
            "compatibility_binding": ["compatibility_gate_hash"],
            "produced_from": "reader-window and migration compatibility evaluation",
            "mixed_evidence_failure_mode": "A changed client window, historical-manifest guard, or rollback posture requires a new compatibility gate hash.",
            "source_refs": [
                heading_ref(RELEASE_EVIDENCE_PATH, "2. Contract boundary"),
                heading_ref(DEPLOYMENT_PATH, "3. Schema and datastore migration rules"),
                heading_ref(VERIFY_GATES_PATH, "2. Release gate"),
            ],
        },
        {
            "artifact_id": "SchemaMigrationLedger",
            "promotion_stage": "MIGRATION_VERIFICATION",
            "promotion_required": True,
            "blocking_gates": ["MIGRATION_VERIFICATION"],
            "candidate_binding": [
                "schema_bundle_hash",
                "migration_plan_ref_or_null",
                "candidate_identity_hash",
            ],
            "compatibility_binding": ["compatibility_gate_hash"],
            "produced_from": "expand, backfill, verify, and contract migration execution",
            "mixed_evidence_failure_mode": "Backfill or contract results from a different chronology cannot be reused under the same candidate hash.",
            "source_refs": [
                heading_ref(DEPLOYMENT_PATH, "3. Schema and datastore migration rules"),
                heading_ref(VERIFY_GATES_PATH, "4. Evidence required for promotion"),
            ],
        },
        {
            "artifact_id": "VerificationSuiteResult",
            "promotion_stage": "BLOCKING_SUITE_EXECUTION",
            "promotion_required": True,
            "blocking_gates": ordered_unique(
                gate["gate_id"]
                for gate in gate_binding_rows
                if "VerificationSuiteResult" in gate["required_evidence"]
            ),
            "candidate_binding": [
                "candidate_identity_hash",
                "build_artifact_ref",
                "schema_bundle_hash",
            ],
            "compatibility_binding": ["compatibility_gate_hash_or_null"],
            "produced_from": "blocking verification suites",
            "mixed_evidence_failure_mode": "Mixed builds, mixed schema bundles, or mixed client windows fail admissibility.",
            "source_refs": [
                heading_ref(VERIFY_GATES_PATH, "Gate admissibility rules"),
                heading_ref(VERIFY_GATES_PATH, "4. Evidence required for promotion"),
            ],
        },
        {
            "artifact_id": "GateAdmissibilityRecord",
            "promotion_stage": "SUITE_ADMISSIBILITY",
            "promotion_required": True,
            "blocking_gates": ["SUITE_ADMISSIBILITY"],
            "candidate_binding": [
                "candidate_identity_hash",
                "build_artifact_ref",
                "supported_client_window_ref_or_null",
            ],
            "compatibility_binding": ["compatibility_gate_hash_or_null"],
            "produced_from": "post-suite admissibility evaluation",
            "mixed_evidence_failure_mode": "A green suite result without same-scope admissibility cannot satisfy a blocking gate.",
            "source_refs": [
                heading_ref(RELEASE_EVIDENCE_PATH, "3. Admissibility boundary"),
                heading_ref(VERIFY_GATES_PATH, "Gate admissibility rules"),
            ],
        },
        {
            "artifact_id": "DeterministicGoldenPack",
            "promotion_stage": "DETERMINISTIC_AND_STATE_MACHINE",
            "promotion_required": True,
            "blocking_gates": ["DETERMINISTIC_AND_STATE_MACHINE"],
            "candidate_binding": ["candidate_identity_hash", "artifact_digest"],
            "compatibility_binding": [],
            "produced_from": "deterministic and state-machine review pack",
            "mixed_evidence_failure_mode": "Deterministic green posture cannot be assembled without the exact frozen golden-pack ref.",
            "source_refs": [
                heading_ref(VERIFY_GATES_PATH, "2. Release gate"),
                heading_ref(VERIFY_GATES_PATH, "4A. Replayability verification additions"),
            ],
        },
        {
            "artifact_id": "AuthoritySandboxCoverageContract",
            "promotion_stage": "AUTHORITY_SANDBOX",
            "promotion_required": True,
            "blocking_gates": ["AUTHORITY_SANDBOX"],
            "candidate_binding": [
                "candidate_identity_hash",
                "enabled_provider_profile_refs[]",
            ],
            "compatibility_binding": [],
            "produced_from": "authority sandbox and controlled-edge breadth evaluation",
            "mixed_evidence_failure_mode": "Coverage from another provider-profile set cannot satisfy the active candidate.",
            "source_refs": [
                heading_ref(VERIFY_GATES_PATH, "Gate admissibility rules"),
                heading_ref(VERIFY_GATES_PATH, "4. Evidence required for promotion"),
            ],
        },
        {
            "artifact_id": "ClientCompatibilityMatrix",
            "promotion_stage": "OPERATOR_CLIENT",
            "promotion_required": True,
            "blocking_gates": ["OPERATOR_CLIENT"],
            "candidate_binding": [
                "candidate_identity_hash",
                "supported_client_window_ref_or_null",
                "build_artifact_ref",
            ],
            "compatibility_binding": ["compatibility_gate_hash"],
            "produced_from": "browser and native client window compatibility evaluation",
            "mixed_evidence_failure_mode": "Green client compatibility evidence cannot outlive a blocked native client window or bind a different window.",
            "source_refs": [
                heading_ref(RELEASE_EVIDENCE_PATH, "2. Contract boundary"),
                heading_ref(VERIFY_GATES_PATH, "4. Evidence required for promotion"),
                heading_ref(DEPLOYMENT_PATH, "3. Schema and datastore migration rules"),
            ],
        },
        {
            "artifact_id": "CanaryHealthSummary",
            "promotion_stage": "CANARY",
            "promotion_required": True,
            "blocking_gates": ["PERFORMANCE_CANARY"],
            "candidate_binding": ["candidate_identity_hash", "artifact_digest"],
            "compatibility_binding": ["compatibility_gate_hash_or_null"],
            "produced_from": "bounded pre-production or canary slice evaluation",
            "mixed_evidence_failure_mode": "Canary evidence from another candidate or another compatibility window cannot be stitched into the judged release.",
            "source_refs": [
                heading_ref(RELEASE_EVIDENCE_PATH, "2. Contract boundary"),
                heading_ref(DEPLOYMENT_PATH, "2. Promotion pipeline"),
            ],
        },
        {
            "artifact_id": "RecoveryCheckpoint",
            "promotion_stage": "RESTORE_DRILL",
            "promotion_required": True,
            "blocking_gates": ["RESTORE_DRILL"],
            "candidate_binding": ["candidate_identity_hash", "supported_client_window_ref_or_null"],
            "compatibility_binding": ["compatibility_gate_hash"],
            "produced_from": "checkpoint validation against recovery governance",
            "mixed_evidence_failure_mode": "A restore checkpoint with unresolved reopen blockers cannot be promoted as successful restore evidence.",
            "source_refs": [
                heading_ref(RECOVERY_PATH, "Recovery checkpoint law"),
                heading_ref(VERIFY_GATES_PATH, "Gate admissibility rules"),
            ],
        },
        {
            "artifact_id": "RestoreDrillResult",
            "promotion_stage": "RESTORE_DRILL",
            "promotion_required": True,
            "blocking_gates": ["RESTORE_DRILL"],
            "candidate_binding": [
                "candidate_identity_hash",
                "restore_drill_ref",
                "restore_checkpoint_ref",
            ],
            "compatibility_binding": ["compatibility_gate_hash"],
            "produced_from": "candidate-bound restore rehearsal",
            "mixed_evidence_failure_mode": "Restore evidence cannot swap in another drill or checkpoint lineage during admissibility evaluation.",
            "source_refs": [
                heading_ref(VERIFY_GATES_PATH, "Gate admissibility rules"),
                heading_ref(DEPLOYMENT_PATH, "5. Backup, restore, and DR rules"),
                heading_ref(RECOVERY_PATH, "Restore privacy reconciliation law"),
            ],
        },
        {
            "artifact_id": "ReleaseVerificationManifest",
            "promotion_stage": "MANIFEST_ASSEMBLY",
            "promotion_required": True,
            "blocking_gates": ["ALL_BLOCKING_GATES"],
            "candidate_binding": [
                "candidate_identity_hash",
                "schema_bundle_hash",
                "config_bundle_hash",
                "supported_client_window_ref_or_null",
            ],
            "compatibility_binding": ["compatibility_gate_hash"],
            "produced_from": "deterministic manifest assembly contract over blocking gates",
            "mixed_evidence_failure_mode": "Release truth cannot be inferred from CI or deploy logs once the manifest assembly contract exists.",
            "source_refs": [
                heading_ref(VERIFY_GATES_PATH, "2. Release gate"),
                heading_ref(VERIFY_GATES_PATH, "4. Evidence required for promotion"),
                heading_ref(DEPLOYMENT_PATH, "2. Promotion pipeline"),
            ],
        },
        {
            "artifact_id": "DeploymentRelease",
            "promotion_stage": "DEPLOY_AND_GOVERN",
            "promotion_required": True,
            "blocking_gates": ["DEPLOYMENT_RELEASE_DECISION"],
            "candidate_binding": [
                "candidate_identity_hash",
                "build_artifact_ref",
                "supported_client_window_ref_or_null",
            ],
            "compatibility_binding": ["compatibility_gate_hash"],
            "produced_from": "promotion, rollback, and fail-forward governance",
            "mixed_evidence_failure_mode": "Deployment records must retain the same candidate and compatibility boundary as the release manifest they promote.",
            "source_refs": [
                heading_ref(RELEASE_EVIDENCE_PATH, "2. Contract boundary"),
                heading_ref(DEPLOYMENT_PATH, "6. Rollout, rollback, and fail-forward posture"),
                heading_ref(RECOVERY_PATH, "Rollback and fail-forward law"),
            ],
        },
    ]
    return {
        "contract_version": TODAY,
        "selected_strategy_id": "manifest_centered_candidate_bound_release_doctrine",
        "summary": {
            "artifact_count": len(rows),
            "promotion_required_artifact_count": len(
                [row for row in rows if row["promotion_required"]]
            ),
            "compatibility_bound_artifact_count": len(
                [row for row in rows if row["compatibility_binding"]]
            ),
            "restore_or_recovery_artifact_count": len(
                [
                    row
                    for row in rows
                    if "RESTORE_DRILL" in row["blocking_gates"]
                    or row["artifact_id"] == "RecoveryCheckpoint"
                ]
            ),
        },
        "rows": rows,
        "typed_gaps_or_deferred_decisions": [
            {
                "id": "deployment_vendor_and_rollout_percentage_deferred",
                "type": "DEFERRED_DECISION",
                "summary": "ADR-009 fixes required evidence and decision posture, but not the final deployment vendor or rollout percentage policy.",
            }
        ],
    }


def build_schema_migration_and_reader_window_strategy() -> dict[str, Any]:
    chronology_steps = [
        {
            "phase_id": "EXPAND",
            "goal": "Introduce new writer and reader shape without breaking the prior reader window.",
            "writer_posture": "new writers may emit the expanded shape while older readers remain supported",
            "required_artifacts": [
                "SchemaMigrationLedger",
                "schema_reader_window_contract",
                "schema_bundle_compatibility_gate_contract",
            ],
            "reader_window_expectation": "reader window remains open to the prior protected bundle set",
            "rollback_posture": "ROLLBACK_ALLOWED while the prior reader window still validates",
            "source_refs": [
                heading_ref(DEPLOYMENT_PATH, "3. Schema and datastore migration rules"),
                heading_ref(REPLAY_PATH, "Schema-reader incompatibility"),
            ],
        },
        {
            "phase_id": "MIGRATE_BACKFILL",
            "goal": "Backfill or transform durable truth idempotently while preserving frozen historical references.",
            "writer_posture": "both expanded and legacy-readable state may coexist",
            "required_artifacts": [
                "SchemaMigrationLedger.backfill_execution_contract",
                "ReleaseVerificationManifest",
                "RecoveryCheckpoint",
            ],
            "reader_window_expectation": "in-flight and sealed manifests continue on their frozen basis",
            "rollback_posture": "ROLLBACK_ALLOWED only if backfill remains reversible or compatibility-preserving",
            "source_refs": [
                heading_ref(DEPLOYMENT_PATH, "3. Schema and datastore migration rules"),
                heading_ref(MANIFEST_FREEZE_PATH, "5.5 Freeze timing rules"),
                heading_ref(MANIFEST_FREEZE_PATH, "5.7 Parent/child manifest semantics"),
            ],
        },
        {
            "phase_id": "VERIFY",
            "goal": "Prove reader-window, replay, restore, migration, and client-window safety under the shared compatibility gate.",
            "writer_posture": "candidate build and schema bundle are judged together",
            "required_artifacts": [
                "VerificationSuiteResult",
                "GateAdmissibilityRecord",
                "ClientCompatibilityMatrix",
                "RestoreDrillResult",
            ],
            "reader_window_expectation": "historical-manifest and replay or restore readability remain explicitly green",
            "rollback_posture": "ROLLBACK_ALLOWED only if the compatibility gate says the rollback window is still open",
            "source_refs": [
                heading_ref(VERIFY_GATES_PATH, "2. Release gate"),
                heading_ref(VERIFY_GATES_PATH, "Gate admissibility rules"),
                heading_ref(REPLAY_PATH, "Exact replay preconditions"),
            ],
        },
        {
            "phase_id": "CONTRACT",
            "goal": "Remove legacy shape only after no protected in-flight, replay, restore, or client window depends on it.",
            "writer_posture": "old readers and fields are removed in a controlled contract phase",
            "required_artifacts": [
                "SchemaMigrationLedger",
                "schema_reader_window_contract",
                "DeploymentRelease",
            ],
            "reader_window_expectation": "compatibility window closes only after protected historical and operational readers are safe",
            "rollback_posture": "FAIL_FORWARD_ONLY once the compatibility window closes or destructive change begins",
            "source_refs": [
                heading_ref(DEPLOYMENT_PATH, "3. Schema and datastore migration rules"),
                heading_ref(DEPLOYMENT_PATH, "6. Rollout, rollback, and fail-forward posture"),
                heading_ref(RECOVERY_PATH, "Rollback and fail-forward law"),
            ],
        },
        {
            "phase_id": "FAIL_FORWARD_OR_SETTLE",
            "goal": "If rollback safety ended, prove the compensating release plan and preserve prior truth instead of rewriting history.",
            "writer_posture": "forward fix or compensating release owns correction",
            "required_artifacts": [
                "DeploymentRelease.rollback_boundary_state",
                "DeploymentRelease.compensating_release_id_or_null",
                "DeploymentRelease.fail_forward_owner_ref_or_null",
            ],
            "reader_window_expectation": "closed windows stay closed; historical reads rely on preserved frozen basis",
            "rollback_posture": "FAILED_FORWARD or FAIL_FORWARD_ONLY with explicit owner and runbook lineage",
            "source_refs": [
                heading_ref(DEPLOYMENT_PATH, "6. Rollout, rollback, and fail-forward posture"),
                heading_ref(RECOVERY_PATH, "Rollback and fail-forward law"),
            ],
        },
    ]
    historical_manifest_guards = [
        {
            "rule_id": "sealed_and_inflight_manifests_keep_frozen_schema_and_config",
            "rule": "Sealed or in-progress manifests continue under their frozen schema bundle and config refs even when the default live bundle advances.",
            "source_refs": [
                heading_ref(DEPLOYMENT_PATH, "3. Schema and datastore migration rules"),
                heading_ref(MANIFEST_FREEZE_PATH, "5.3 `RunManifest` required field groups"),
            ],
        },
        {
            "rule_id": "historical_post_seal_basis_remains_explicit",
            "rule": "Historical replay uses preserved post-seal basis artifacts rather than recollecting live state.",
            "source_refs": [
                heading_ref(REPLAY_PATH, "Historical post-seal basis"),
                heading_ref(REPLAY_PATH, "Implementation shape"),
            ],
        },
        {
            "rule_id": "schema_reader_incompatibility_fails_closed",
            "rule": "Unreadable historical basis or schema-reader incompatibility fails closed instead of silently substituting a different reader.",
            "source_refs": [
                heading_ref(REPLAY_PATH, "Corruption and incomplete basis handling"),
                heading_ref(VERIFY_GATES_PATH, "2. Release gate"),
            ],
        },
        {
            "rule_id": "destructive_change_waits_for_historical_safety",
            "rule": "Dropped columns, destructive rewrites, or meaning changes cannot begin while manifests that rely on the old shape may still replay or reconcile.",
            "source_refs": [
                heading_ref(DEPLOYMENT_PATH, "3. Schema and datastore migration rules"),
                heading_ref(REPLAY_PATH, "Non-negotiable prohibitions"),
            ],
        },
        {
            "rule_id": "release_evidence_carries_reader_window_not_just_writer_hash",
            "rule": "Release evidence carries the full reader-window and compatibility posture, not just the static writer bundle hash.",
            "source_refs": [
                heading_ref(RELEASE_EVIDENCE_PATH, "2. Contract boundary"),
                heading_ref(VERIFY_GATES_PATH, "2. Release gate"),
            ],
        },
        {
            "rule_id": "restore_reads_same_protected_bundle_posture",
            "rule": "Restore and reopen safety are judged against the same protected reader-window and limitation posture as forward release promotion.",
            "source_refs": [
                heading_ref(DEPLOYMENT_PATH, "5. Backup, restore, and DR rules"),
                heading_ref(RECOVERY_PATH, "Restore privacy reconciliation law"),
            ],
        },
    ]
    continuation_rules = [
        {
            "rule_id": "nightly_duplicate_suppression_respects_frozen_envelope",
            "rule": "Nightly duplicate suppression and batch allocation operate on a frozen envelope so migration or client-window drift does not silently reuse stale attempt identity.",
            "source_refs": [
                heading_ref(NIGHTLY_AUTOPILOT_PATH, "2. Trigger contract and frozen operating window"),
                heading_ref(NIGHTLY_AUTOPILOT_PATH, "4. Portfolio selection and eligibility contract"),
            ],
        },
        {
            "rule_id": "reclaim_never_collapses_recovery_into_fresh_execution",
            "rule": "Crash recovery and reclaim may transfer ownership but may not collapse recovery into a fresh run with different basis, schema, or client-window assumptions.",
            "source_refs": [
                heading_ref(NIGHTLY_AUTOPILOT_PATH, "10. Crash recovery and stale-checkpoint resolution"),
                heading_ref(NIGHTLY_SELECTION_PATH, "Recovery-reclaim law"),
            ],
        },
        {
            "rule_id": "manifest_branch_identity_freezes_request_lineage",
            "rule": "Branch selection and manifest claim identity keep request lineage, nightly window keys, and inheritance basis frozen across continuation or replay.",
            "source_refs": [
                heading_ref(NIGHTLY_SELECTION_PATH, "Identity law"),
                heading_ref(NIGHTLY_SELECTION_PATH, "Selection law"),
            ],
        },
        {
            "rule_id": "batch_global_stop_conditions_prevent_invalid_promotion_inputs",
            "rule": "Nightly global stop conditions may halt batch progression before new control-plane work begins when release admissibility or authority safety is compromised.",
            "source_refs": [
                heading_ref(NIGHTLY_AUTOPILOT_PATH, "11. Global stop conditions and partial-failure handling"),
                heading_ref(NIGHTLY_AUTOPILOT_PATH, "6. Per-client and per-stage unattended policy matrix"),
            ],
        },
    ]
    return {
        "contract_version": TODAY,
        "selected_strategy_id": "manifest_centered_candidate_bound_release_doctrine",
        "summary": {
            "chronology_step_count": len(chronology_steps),
            "historical_guard_count": len(historical_manifest_guards),
            "continuation_rule_count": len(continuation_rules),
        },
        "chronology_steps": chronology_steps,
        "historical_manifest_guards": historical_manifest_guards,
        "continuation_and_reclaim_rules": continuation_rules,
        "typed_gaps_or_deferred_decisions": [
            {
                "id": "migration_executor_product_deferred",
                "type": "DEFERRED_DECISION",
                "summary": "ADR-009 fixes migration chronology and evidence boundaries, but not the final migration-runner product or orchestration engine.",
            }
        ],
    }


def build_rollback_fail_forward_decision_matrix() -> dict[str, Any]:
    rows = [
        {
            "scenario_id": "canary_failure_before_contract_phase",
            "decision_posture": "ROLLBACK_ALLOWED",
            "reader_window_state": "OPEN_AND_BACKWARD_COMPATIBLE",
            "native_client_window_state": "VERIFIED_COMPATIBLE",
            "restore_implication": "previous release baseline may remain serving while the candidate is withdrawn",
            "required_evidence": [
                "CanaryHealthSummary",
                "ReleaseVerificationManifest",
                "DeploymentRelease",
            ],
            "operator_message": "Abort the candidate and return to the prior baseline while the compatibility window remains open.",
            "source_refs": [
                heading_ref(DEPLOYMENT_PATH, "2. Promotion pipeline"),
                heading_ref(DEPLOYMENT_PATH, "6. Rollout, rollback, and fail-forward posture"),
            ],
        },
        {
            "scenario_id": "code_regression_with_open_reader_window",
            "decision_posture": "ROLLBACK_ALLOWED",
            "reader_window_state": "OPEN_AND_BACKWARD_COMPATIBLE",
            "native_client_window_state": "VERIFIED_COMPATIBLE",
            "restore_implication": "no restore posture change if durable truth remains intact",
            "required_evidence": [
                "schema_bundle_compatibility_gate_contract",
                "DeploymentRelease.rollback_boundary_state",
            ],
            "operator_message": "Rollback is lawful only while reader-window, migration, and client-window guarantees are still green.",
            "source_refs": [
                heading_ref(RECOVERY_PATH, "Rollback and fail-forward law"),
                heading_ref(DEPLOYMENT_PATH, "6. Rollout, rollback, and fail-forward posture"),
            ],
        },
        {
            "scenario_id": "native_supported_window_blocked",
            "decision_posture": "PROMOTION_BLOCKED",
            "reader_window_state": "WINDOW_MAY_BE_OPEN",
            "native_client_window_state": "BLOCKED",
            "restore_implication": "promotion never proceeds, so rollback is not yet the correct tool",
            "required_evidence": [
                "ClientCompatibilityMatrix",
                "schema_bundle_compatibility_gate_contract",
            ],
            "operator_message": "Promotion must stop when the shared compatibility gate records a blocked native client window.",
            "source_refs": [
                heading_ref(DEPLOYMENT_PATH, "3. Schema and datastore migration rules"),
                heading_ref(VERIFY_GATES_PATH, "4. Evidence required for promotion"),
                heading_ref(SECURITY_PATH, "8. Operational security release gates"),
            ],
        },
        {
            "scenario_id": "destructive_contract_started_or_window_closed",
            "decision_posture": "FAIL_FORWARD_ONLY",
            "reader_window_state": "CONTRACT_ELIGIBLE_WINDOW_CLOSED",
            "native_client_window_state": "VERIFIED_COMPATIBLE_OR_NOT_APPLICABLE",
            "restore_implication": "historical and restore readers must rely on preserved frozen basis rather than rollback",
            "required_evidence": [
                "SchemaMigrationLedger",
                "DeploymentRelease.rollback_boundary_state",
                "ReleaseVerificationManifest",
            ],
            "operator_message": "Once the compatibility window closes or destructive change begins, rollback is unlawful and the system must use a compensating forward fix.",
            "source_refs": [
                heading_ref(DEPLOYMENT_PATH, "3. Schema and datastore migration rules"),
                heading_ref(DEPLOYMENT_PATH, "6. Rollout, rollback, and fail-forward posture"),
                heading_ref(RECOVERY_PATH, "Rollback and fail-forward law"),
            ],
        },
        {
            "scenario_id": "inflight_manifest_depends_on_old_shape",
            "decision_posture": "FAIL_FORWARD_ONLY",
            "reader_window_state": "OPEN_FOR_PROTECTED_INFLIGHT_OR_HISTORICAL_MANIFESTS",
            "native_client_window_state": "VERIFIED_COMPATIBLE",
            "restore_implication": "do not strand in-flight manifests; preserve frozen lineage while forward-fixing the candidate",
            "required_evidence": [
                "schema_reader_window_contract",
                "RunManifest.schema_bundle_hash",
                "SchemaMigrationLedger",
            ],
            "operator_message": "Do not contract or roll back in a way that strands in-flight manifests under a broken reader window.",
            "source_refs": [
                heading_ref(DEPLOYMENT_PATH, "3. Schema and datastore migration rules"),
                heading_ref(MANIFEST_FREEZE_PATH, "5.3 `RunManifest` required field groups"),
            ],
        },
        {
            "scenario_id": "restore_checkpoint_not_reopen_ready",
            "decision_posture": "FAIL_CLOSED_PENDING_REOPEN",
            "reader_window_state": "MUST_MATCH_RESTORE_COMPATIBILITY_GATE",
            "native_client_window_state": "MUST_MATCH_RESTORE_COMPATIBILITY_GATE",
            "restore_implication": "reopen stays blocked until privacy reconciliation, queue rebuild, audit continuity, and authority revalidation complete",
            "required_evidence": [
                "RecoveryCheckpoint",
                "RestoreDrillResult",
                "privacy_reconciliation_contract",
            ],
            "operator_message": "A restore checkpoint that is not READY_FOR_REOPEN is not lawful evidence for reopen or for claiming recovery success.",
            "source_refs": [
                heading_ref(RECOVERY_PATH, "Recovery checkpoint law"),
                heading_ref(RECOVERY_PATH, "Restore privacy reconciliation law"),
                heading_ref(DEPLOYMENT_PATH, "5. Backup, restore, and DR rules"),
            ],
        },
        {
            "scenario_id": "fail_forward_active_with_compensating_release",
            "decision_posture": "FAILED_FORWARD",
            "reader_window_state": "CLOSED_OR_UNSAFE_FOR_ROLLBACK",
            "native_client_window_state": "BOUND_TO_COMPENSATING_RELEASE_PLAN",
            "restore_implication": "truth remains append-only; the forward fix and its owner must be explicit",
            "required_evidence": [
                "DeploymentRelease.compensating_release_id_or_null",
                "DeploymentRelease.fail_forward_owner_ref_or_null",
                "ReleaseVerificationManifest",
            ],
            "operator_message": "Failed-forward posture is only lawful when the compensating release plan and accountable owner are explicit.",
            "source_refs": [
                heading_ref(RECOVERY_PATH, "Rollback and fail-forward law"),
                heading_ref(DEPLOYMENT_PATH, "6. Rollout, rollback, and fail-forward posture"),
            ],
        },
    ]
    return {
        "contract_version": TODAY,
        "selected_strategy_id": "manifest_centered_candidate_bound_release_doctrine",
        "summary": {
            "scenario_count": len(rows),
            "rollback_allowed_count": len(
                [row for row in rows if row["decision_posture"] == "ROLLBACK_ALLOWED"]
            ),
            "fail_forward_only_count": len(
                [row for row in rows if row["decision_posture"] == "FAIL_FORWARD_ONLY"]
            ),
            "promotion_block_count": len(
                [row for row in rows if row["decision_posture"] == "PROMOTION_BLOCKED"]
            ),
        },
        "rows": rows,
        "typed_gaps_or_deferred_decisions": [
            {
                "id": "traffic_split_mechanics_deferred",
                "type": "DEFERRED_DECISION",
                "summary": "ADR-009 chooses release truth and rollback legality, but not the exact traffic-splitting mechanics used during canary or global rollout.",
            }
        ],
    }


def build_client_compatibility_and_supported_window_strategy() -> dict[str, Any]:
    compatibility_scenarios = [
        {
            "scenario_id": "browser_oldest_supported_against_current_server",
            "platform": "BROWSER",
            "purpose": "Prove the oldest still-supported browser client remains safe against the promoted server and schema bundle.",
            "must_bind": [
                "supported_client_window_ref",
                "candidate_identity_hash",
                "compatibility_gate_hash",
            ],
            "promotion_block_if_red": True,
            "source_refs": [
                heading_ref(VERIFY_GATES_PATH, "1. Required test families"),
                heading_ref(VERIFY_GATES_PATH, "4. Evidence required for promotion"),
            ],
        },
        {
            "scenario_id": "browser_current_against_rollback_safe_server",
            "platform": "BROWSER",
            "purpose": "Prove the current browser client can still operate against the rollback-safe server edge when that window is promised.",
            "must_bind": [
                "supported_client_window_ref",
                "candidate_identity_hash",
                "compatibility_gate_hash",
            ],
            "promotion_block_if_red": True,
            "source_refs": [
                heading_ref(VERIFY_GATES_PATH, "1. Required test families"),
                heading_ref(DEPLOYMENT_PATH, "6. Rollout, rollback, and fail-forward posture"),
            ],
        },
        {
            "scenario_id": "macos_oldest_supported_against_current_server",
            "platform": "MACOS_NATIVE",
            "purpose": "Prove the oldest supported native desktop client remains safe against the promoted backend and schema window.",
            "must_bind": [
                "supported_client_window_ref",
                "candidate_identity_hash",
                "compatibility_gate_hash",
                "desktop_notarization_ref",
            ],
            "promotion_block_if_red": True,
            "source_refs": [
                heading_ref(DEPLOYMENT_PATH, "2. Promotion pipeline"),
                heading_ref(SECURITY_PATH, "8. Operational security release gates"),
                heading_ref(MACOS_BLUEPRINT_PATH, "13. Delivery sequencing"),
            ],
        },
        {
            "scenario_id": "macos_current_against_rollback_safe_server",
            "platform": "MACOS_NATIVE",
            "purpose": "Prove the current shipped native client remains lawful against the rollback-safe server edge while the supported window is open.",
            "must_bind": [
                "supported_client_window_ref",
                "candidate_identity_hash",
                "compatibility_gate_hash",
                "desktop_notarization_ref",
            ],
            "promotion_block_if_red": True,
            "source_refs": [
                heading_ref(VERIFY_GATES_PATH, "1. Required test families"),
                heading_ref(DEPLOYMENT_PATH, "6. Rollout, rollback, and fail-forward posture"),
            ],
        },
    ]
    governing_artifacts = [
        {
            "artifact_id": "release_candidate_identity_contract",
            "role": "declares the supported client window as part of the candidate tuple",
            "source_refs": [heading_ref(RELEASE_EVIDENCE_PATH, "1. Governing candidate identity model")],
        },
        {
            "artifact_id": "schema_bundle_compatibility_gate_contract",
            "role": "freezes native client window posture and compatibility-window legality",
            "source_refs": [heading_ref(VERIFY_GATES_PATH, "2. Release gate")],
        },
        {
            "artifact_id": "VerificationSuiteResult.suite_family=OPERATOR_CLIENT",
            "role": "retains the exact supported client window that was judged",
            "source_refs": [heading_ref(VERIFY_GATES_PATH, "Gate admissibility rules")],
        },
        {
            "artifact_id": "GateAdmissibilityRecord.suite_family=OPERATOR_CLIENT",
            "role": "proves the operator-client result is same-candidate, same-window, and admissible",
            "source_refs": [heading_ref(VERIFY_GATES_PATH, "Gate admissibility rules")],
        },
        {
            "artifact_id": "ClientCompatibilityMatrix",
            "role": "binds browser/native window coverage to the candidate and shared compatibility boundary",
            "source_refs": [
                heading_ref(RELEASE_EVIDENCE_PATH, "2. Contract boundary"),
                heading_ref(VERIFY_GATES_PATH, "4. Evidence required for promotion"),
            ],
        },
        {
            "artifact_id": "ReleaseVerificationManifest",
            "role": "carries supported-client evidence into the promotion decision root",
            "source_refs": [heading_ref(VERIFY_GATES_PATH, "2. Release gate")],
        },
        {
            "artifact_id": "DeploymentRelease",
            "role": "preserves the resulting rollout, rollback boundary, and supported-window promise",
            "source_refs": [heading_ref(DEPLOYMENT_PATH, "6. Rollout, rollback, and fail-forward posture")],
        },
    ]
    promotion_blockers = [
        {
            "blocker_id": "missing_supported_client_window_when_promised",
            "rule": "Any candidate that promises a supported client window must keep a non-null supported-client ref everywhere the operator-client gate or deployment decision binds it.",
            "source_refs": [
                heading_ref(RELEASE_EVIDENCE_PATH, "1. Governing candidate identity model"),
                heading_ref(VERIFY_GATES_PATH, "Gate admissibility rules"),
            ],
        },
        {
            "blocker_id": "client_matrix_not_green",
            "rule": "Promotion blocks when ClientCompatibilityMatrix is not green for the promised browser/native window.",
            "source_refs": [
                heading_ref(VERIFY_GATES_PATH, "4. Evidence required for promotion"),
                heading_ref(DEPLOYMENT_PATH, "2. Promotion pipeline"),
            ],
        },
        {
            "blocker_id": "native_client_window_blocked",
            "rule": "Promotion blocks when the shared compatibility gate records native_client_window_state = BLOCKED, even if other evidence looks green.",
            "source_refs": [
                heading_ref(DEPLOYMENT_PATH, "3. Schema and datastore migration rules"),
                heading_ref(VERIFY_GATES_PATH, "2. Release gate"),
            ],
        },
        {
            "blocker_id": "desktop_notarization_or_hardening_missing",
            "rule": "A shipped macOS target blocks promotion if signature, notarization, hardened runtime, or entitlement policy evidence is missing or failing.",
            "source_refs": [
                heading_ref(SECURITY_PATH, "8. Operational security release gates"),
                heading_ref(MACOS_BLUEPRINT_PATH, "11. Security and runtime posture for the desktop client"),
            ],
        },
        {
            "blocker_id": "no_emergency_disable_or_pin_path",
            "rule": "Desktop rollout is not lawful without a documented compatibility window and an emergency disable or pin path.",
            "source_refs": [
                heading_ref(DEPLOYMENT_PATH, "8. Release and resilience invariants"),
                heading_ref(MACOS_BLUEPRINT_PATH, "13. Delivery sequencing"),
            ],
        },
    ]
    return {
        "contract_version": TODAY,
        "selected_strategy_id": "manifest_centered_candidate_bound_release_doctrine",
        "summary": {
            "compatibility_scenario_count": len(compatibility_scenarios),
            "governing_artifact_count": len(governing_artifacts),
            "promotion_blocker_count": len(promotion_blockers),
            "platform_count": len(
                ordered_unique(row["platform"] for row in compatibility_scenarios)
            ),
        },
        "compatibility_scenarios": compatibility_scenarios,
        "governing_artifacts": governing_artifacts,
        "promotion_blockers": promotion_blockers,
        "typed_gaps_or_deferred_decisions": [
            {
                "id": "exact_version_floor_policy_deferred",
                "type": "DEFERRED_DECISION",
                "summary": "ADR-009 fixes the supported-window governance model but not the exact client version floor or release-channel policy used to populate that window.",
            }
        ],
    }


def build_restore_drill_and_promotion_binding_rules() -> dict[str, Any]:
    recovery_matrix = load_json(RECOVERY_MATRIX_PATH)
    restore_privacy = load_json(RESTORE_PRIVACY_PATH)
    tier_bindings = [
        {
            "protected_workload_class": row["protected_workload_class"],
            "recovery_tier_class": row["recovery_tier_class"],
            "rpo_class": row["rpo_class"],
            "rto_class": row["rto_class"],
            "source_ref": row["source_ref"],
        }
        for row in recovery_matrix["recovery_tier_mappings"]
    ]
    checkpoint_gates = [
        {
            "checkpoint_gate": row["checkpoint_gate"],
            "requirement": row["state_or_outcome"],
            "source_ref": row["source_ref"],
        }
        for row in recovery_matrix["checkpoint_gates"]
    ]
    privacy_outcomes = [
        {
            "privacy_reconciliation_state": row["privacy_reconciliation_state"],
            "reopen_access_state": row["reopen_access_state"],
            "release_gate_dependency": row["release_gate_dependency"],
            "resurrected_data_posture": row["resurrected_data_posture"],
            "source_ref": row["source_ref"],
        }
        for row in restore_privacy["rows"]
    ]
    promotion_binding_rules = [
        {
            "rule_id": "restore_drill_and_checkpoint_refs_are_mandatory",
            "rule": "Restore-drill evidence is promotion-eligible only when suite results and admissibility records echo the exact restore drill ref and restore checkpoint ref.",
            "source_refs": [
                heading_ref(VERIFY_GATES_PATH, "Gate admissibility rules"),
                heading_ref(DEPLOYMENT_PATH, "5. Backup, restore, and DR rules"),
            ],
        },
        {
            "rule_id": "restore_evidence_must_be_candidate_bound",
            "rule": "RestoreDrillResult must carry the same candidate-bound build/runtime identity tuple as the release candidate it claims to prove safe.",
            "source_refs": [
                heading_ref(VERIFY_GATES_PATH, "Gate admissibility rules"),
                heading_ref(RELEASE_EVIDENCE_PATH, "2. Contract boundary"),
            ],
        },
        {
            "rule_id": "restore_evidence_must_be_compatibility_bound",
            "rule": "Restore evidence must bind the same shared compatibility gate so replay-safe readers, historical-manifest protection, and native client windows remain consistent.",
            "source_refs": [
                heading_ref(VERIFY_GATES_PATH, "2. Release gate"),
                heading_ref(DEPLOYMENT_PATH, "3. Schema and datastore migration rules"),
            ],
        },
        {
            "rule_id": "privacy_reconciliation_must_reach_final_reconciled_state",
            "rule": "Restore evidence counts as successful promotion evidence only after privacy reconciliation reaches a final reconciled state and reopen is lawful.",
            "source_refs": [
                heading_ref(RECOVERY_PATH, "Restore privacy reconciliation law"),
                heading_ref(VERIFY_GATES_PATH, "Gate admissibility rules"),
            ],
        },
        {
            "rule_id": "audit_queue_and_authority_rebuild_must_be_verified",
            "rule": "Restore success requires audit continuity, queue rebuild verification, authority rebuild, and authority binding revalidation before reopen or promotion claims succeed.",
            "source_refs": [
                heading_ref(RECOVERY_PATH, "Recovery checkpoint law"),
                heading_ref(DEPLOYMENT_PATH, "5. Backup, restore, and DR rules"),
            ],
        },
        {
            "rule_id": "restored_environment_must_prove_same_release_basis",
            "rule": "A restored environment proves release eligibility only when the checkpoint, drill, candidate identity, and compatibility basis all align with the judged release.",
            "source_refs": [
                heading_ref(VERIFY_GATES_PATH, "2. Release gate"),
                heading_ref(REPLAY_PATH, "Execution-basis freeze contract"),
            ],
        },
    ]
    safe_states = [
        row["privacy_reconciliation_state"]
        for row in privacy_outcomes
        if row["reopen_access_state"] == "READY_FOR_REOPEN"
    ]
    return {
        "contract_version": TODAY,
        "selected_strategy_id": "manifest_centered_candidate_bound_release_doctrine",
        "summary": {
            "recovery_tier_count": len(tier_bindings),
            "checkpoint_gate_count": len(checkpoint_gates),
            "privacy_reconciliation_state_count": len(privacy_outcomes),
            "promotion_binding_rule_count": len(promotion_binding_rules),
            "ready_for_reopen_state_count": len(safe_states),
        },
        "recovery_tier_bindings": tier_bindings,
        "checkpoint_verification_gates": checkpoint_gates,
        "privacy_reconciliation_outcomes": privacy_outcomes,
        "ready_for_reopen_states": safe_states,
        "promotion_binding_rules": promotion_binding_rules,
        "typed_gaps_or_deferred_decisions": [
            {
                "id": "restore_environment_vendor_deferred",
                "type": "DEFERRED_DECISION",
                "summary": "ADR-009 fixes what a valid restore drill must prove, but not the exact infra product used to stand up restore rehearsal environments.",
            }
        ],
    }


def build_mermaid() -> str:
    return """flowchart LR
  candidate["Release Candidate Identity"]
  compat["Compatibility Gate + Reader Window"]
  migration["SchemaMigrationLedger"]
  suites["VerificationSuiteResult + GateAdmissibilityRecord"]
  client["ClientCompatibilityMatrix"]
  restore["RestoreDrillResult + RecoveryCheckpoint"]
  canary["CanaryHealthSummary"]
  manifest["ReleaseVerificationManifest"]
  deploy["DeploymentRelease"]
  rollback["Rollback / Fail-Forward Decision"]

  candidate --> compat
  candidate --> suites
  candidate --> client
  candidate --> restore
  compat --> migration
  compat --> suites
  compat --> client
  compat --> restore
  suites --> manifest
  client --> manifest
  restore --> manifest
  canary --> manifest
  migration --> manifest
  manifest --> deploy
  compat --> rollback
  deploy --> rollback

  classDef note fill:#f7f1d9,stroke:#8a6d1d,color:#3d3100;
  guard["No mixed candidate or compatibility-window evidence."]:::note
  manifest --> guard
"""


def build_adr_markdown(
    context: dict[str, Any],
    scorecard: dict[str, Any],
    release_evidence_matrix: dict[str, Any],
    migration_strategy: dict[str, Any],
    rollback_decision_matrix: dict[str, Any],
    client_strategy: dict[str, Any],
    restore_rules: dict[str, Any],
) -> str:
    winner = scorecard["decision"]
    criteria_rows = [
        [item["label"], item["priority"], item["weight"], item["rationale"]]
        for item in scorecard["criteria"]
    ]
    evidence_rows = [
        [
            row["artifact_id"],
            row["promotion_stage"],
            ", ".join(row["blocking_gates"][:2])
            + (" ..." if len(row["blocking_gates"]) > 2 else ""),
            ", ".join(row["candidate_binding"][:3]),
        ]
        for row in release_evidence_matrix["rows"][:8]
    ]
    migration_rows = [
        [
            row["phase_id"],
            row["goal"],
            row["reader_window_expectation"],
            row["rollback_posture"],
        ]
        for row in migration_strategy["chronology_steps"]
    ]
    rollback_rows = [
        [
            row["scenario_id"],
            row["decision_posture"],
            row["reader_window_state"],
            row["native_client_window_state"],
        ]
        for row in rollback_decision_matrix["rows"][:5]
    ]
    compatibility_rows = [
        [
            row["platform"],
            row["scenario_id"],
            row["must_bind"],
            "yes" if row["promotion_block_if_red"] else "no",
        ]
        for row in client_strategy["compatibility_scenarios"]
    ]
    deferred_rows = [
        f"- `{row['id']}` ({row['type']}): {row['summary']}"
        for row in (
            release_evidence_matrix["typed_gaps_or_deferred_decisions"]
            + migration_strategy["typed_gaps_or_deferred_decisions"]
            + rollback_decision_matrix["typed_gaps_or_deferred_decisions"]
            + client_strategy["typed_gaps_or_deferred_decisions"]
            + restore_rules["typed_gaps_or_deferred_decisions"]
            + [
                {
                    "id": "shared_operating_contract_0022_0029_missing",
                    "type": "SOURCE_GAP",
                    "summary": "The referenced shared operating contract for cards 0022 through 0029 is absent, so ADR-009 is grounded directly in named algorithm contracts and prior analysis outputs.",
                }
            ]
        )
    ]
    ranking_rows = [
        [item["rank"], item["label"], item["weighted_total"]]
        for item in scorecard["alternatives"]
    ]
    return f"""# ADR-009: Release Evidence and Migration Strategy

- Status: Accepted
- Date: {TODAY}
- Decision: {winner["selected_label"]}
- Score: {winner["selected_weighted_total"]}

## Context

Taxat already had the raw law for safe promotion, but it was split across candidate identity, verification gates, migration chronology, restore governance, native delivery, and security hardening. Prior phase-00 outputs normalized `{context["candidate_identity_field_count"]}` candidate-identity fields, `{context["compatibility_gate_field_count"]}` compatibility-gate fields, `{context["blocking_gate_binding_count"]}` blocking gate bindings, `{context["checkpoint_gate_count"]}` checkpoint gates, and `{context["security_release_gate_count"]}` security release gates. ADR-009 turns those fragments into one release doctrine.

The deciding constraint is not deployment fashion. Taxat needs one operational truth for how a candidate is identified, how migrations stay readable for in-flight and historical manifests, when rollback remains lawful, when fail-forward becomes mandatory, how restore drills count as release evidence, and how browser/native client compatibility blocks promotion instead of merely warning.

## Decision

Adopt a **manifest-centered, candidate-bound promotion strategy**:

1. Freeze one release candidate identity and canonical `candidate_identity_hash`.
2. Freeze one shared schema compatibility boundary and `compatibility_gate_hash`.
3. Run blocking suites, restore drills, client-window validation, and canary against that same candidate and compatibility posture.
4. Persist one first-class `ReleaseVerificationManifest` as the promotion-evidence root rather than reconstructing release truth from CI or deploy dashboards.
5. Execute schema change as `expand -> migrate/backfill -> verify -> contract`, carrying the same reader-window posture through migration ledgers, manifests, restore drills, and deployment records.
6. Allow rollback only while the compatibility window remains open and the shared gate still certifies safety.
7. Force explicit fail-forward once destructive change begins, the compatibility window closes, or rollback safety breaks.
8. Block promotion when supported browser/native client window evidence is missing or red, and when shipped macOS posture lacks signing, notarization, or hardened-runtime evidence.

This decision intentionally makes release evidence heavier than a generic dashboard workflow. That is the point: the corpus requires durable proof that the judged release, the migration posture, the restore posture, and the client window all refer to the same release basis.

## Decision Drivers

{markdown_table(["Driver", "Priority", "Weight", "Why It Matters"], criteria_rows)}

## Promotion Evidence Spine

{markdown_table(["Artifact", "Stage", "Primary Gates", "Candidate Binding"], evidence_rows)}

Every blocking release artifact appears in the generated evidence matrix, and every artifact that judges schema, restore, or client-window safety also carries the shared compatibility boundary rather than only a writer bundle hash.

## Migration Chronology and Reader Window

{markdown_table(["Phase", "Goal", "Reader Window Expectation", "Rollback Posture"], migration_rows)}

This closes the prior gap where reader-window chronology was distributed across multiple contracts. The chosen strategy now centralizes `{migration_strategy["summary"]["chronology_step_count"]}` chronology steps, `{migration_strategy["summary"]["historical_guard_count"]}` historical-manifest guards, and `{migration_strategy["summary"]["continuation_rule_count"]}` continuation or reclaim rules into one machine-readable pack.

## Rollback and Fail-Forward Governance

{markdown_table(["Scenario", "Decision", "Reader Window", "Native Window"], rollback_rows)}

The critical rule is simple: rollback is a compatibility-bound permission, not a deployment operator preference. Once the shared compatibility gate or migration chronology says rollback is no longer safe, the system moves to explicit fail-forward with named ownership and compensating-release lineage.

## Client Compatibility Governance

{markdown_table(["Platform", "Scenario", "Must Bind", "Block If Red?"], compatibility_rows)}

Browser and native compatibility are judged together under the supported client window, but macOS adds one extra constraint: when the native desktop target ships, signature, notarization, hardened runtime, and entitlement posture become blocking release evidence rather than best-effort hygiene.

## Restore-Drill Promotion Binding

- Recovery tiers carried forward: `{restore_rules["summary"]["recovery_tier_count"]}`
- Checkpoint verification gates carried forward: `{restore_rules["summary"]["checkpoint_gate_count"]}`
- Privacy reconciliation states carried forward: `{restore_rules["summary"]["privacy_reconciliation_state_count"]}`
- Ready-for-reopen states: `{", ".join(restore_rules["ready_for_reopen_states"])}`

Restore drills therefore remain real promotion evidence only when they are candidate-bound, compatibility-bound, checkpoint-bound, and privacy-reconciled. A green restore run without those bindings is not admissible release proof.

## Alternatives Considered

{markdown_table(["Rank", "Alternative", "Weighted Score"], ranking_rows)}

The winning option is **{winner["selected_label"]}** with a weighted score of `{winner["selected_weighted_total"]}`.

## Why This Option Wins

- It is the only alternative that directly matches the corpus's first-class evidence objects: candidate identity, compatibility gate, manifest assembly, restore drill, client compatibility, and deployment release.
- It centralizes migration chronology and rollback legality instead of leaving them spread across source documents or operator memory.
- It blocks the exact edge cases the task called out: mixed evidence, destructive migrations that strand historical manifests, blocked native windows, swapped restore lineage, and silent canary/full-release drift.
- It composes cleanly with security release gates instead of treating security as a separate approval stream.

## Consequences

Positive consequences:

- release, migration, and platform teams get one stable vocabulary for candidate identity, compatibility windows, restore proof, and rollback legality
- later implementation tasks can consume machine-readable matrices instead of re-deriving the doctrine from prose
- audit and incident review become easier because promotion truth lives in durable artifacts, not reconstructed dashboards

Negative consequences and tradeoffs:

- more first-class artifacts must be produced and stored before promotion
- release tooling must understand manifest assembly and compatibility boundaries explicitly
- rollout speed is intentionally subordinated to correctness whenever the two conflict

## Rollback Posture

Operational rollback remains allowed only while the chosen strategy's own compatibility gate says it is allowed. Rolling back the strategy itself would mean returning to weaker dashboard or deploy-log truth, which would reopen the mixed-evidence and migration-clarity gaps this ADR closes. That should only happen through an explicit contract revision.

## Deferred Decisions and Typed Gaps

{chr(10).join(deferred_rows)}

## Generated Artifacts

- `{repo_rel(RELEASE_EVIDENCE_MATRIX_PATH)}`
- `{repo_rel(MIGRATION_STRATEGY_PATH)}`
- `{repo_rel(ROLLBACK_DECISION_MATRIX_PATH)}`
- `{repo_rel(CLIENT_WINDOW_STRATEGY_PATH)}`
- `{repo_rel(RESTORE_BINDING_RULES_PATH)}`
- `{repo_rel(CANDIDATE_GATE_BINDING_MAP_PATH)}`
- `{repo_rel(MERMAID_PATH)}`
"""


def build_comparison_markdown(
    scorecard: dict[str, Any],
    context: dict[str, Any],
) -> str:
    criteria_rows = [
        [item["label"], item["weight"], item["priority"], item["rationale"]]
        for item in scorecard["criteria"]
    ]
    alternative_rows = [
        [item["rank"], item["label"], item["weighted_total"], item["summary"]]
        for item in scorecard["alternatives"]
    ]
    sections = [
        "# ADR-009 Comparison",
        "",
        "## Weighted Criteria",
        "",
        markdown_table(
            ["Criterion", "Weight", "Priority", "Rationale"], criteria_rows
        ),
        "",
        "## Alternative Totals",
        "",
        markdown_table(
            ["Rank", "Alternative", "Weighted Total", "Summary"], alternative_rows
        ),
        "",
        "## Evidence Context",
        "",
        f"- Candidate identity fields already normalized: `{context['candidate_identity_field_count']}`",
        f"- Compatibility gate fields already normalized: `{context['compatibility_gate_field_count']}`",
        f"- Blocking gate bindings already normalized: `{context['blocking_gate_binding_count']}`",
        f"- Checkpoint gates already normalized: `{context['checkpoint_gate_count']}`",
        f"- Security release gates already normalized: `{context['security_release_gate_count']}`",
        f"- Nightly selection dispositions already normalized: `{context['selection_disposition_count']}`",
        "",
    ]
    for criterion in scorecard["criteria"]:
        sections.extend(
            [
                f"## {criterion['label']}",
                "",
                f"- Priority: `{criterion['priority']}`",
                f"- Weight: `{criterion['weight']}`",
                f"- Rationale: {criterion['rationale']}",
                "",
                markdown_table(
                    ["Alternative", "Raw", "Weighted", "Reason"],
                    [
                        [
                            alternative["label"],
                            next(
                                row["raw_score"]
                                for row in alternative["criterion_breakdown"]
                                if row["criterion_id"] == criterion["criterion_id"]
                            ),
                            next(
                                row["weighted_score"]
                                for row in alternative["criterion_breakdown"]
                                if row["criterion_id"] == criterion["criterion_id"]
                            ),
                            next(
                                row["note"]
                                for row in alternative["criterion_breakdown"]
                                if row["criterion_id"] == criterion["criterion_id"]
                            ),
                        ]
                        for alternative in scorecard["alternatives"]
                    ],
                ),
                "",
            ]
        )
    sections.extend(
        [
            "## Why The Runner-Ups Lost",
            "",
            *[
                f"- `{alternative['label']}` lost because {alternative['risks'][0][0].lower() + alternative['risks'][0][1:]}"
                for alternative in scorecard["alternatives"][1:]
            ],
            "",
        ]
    )
    return "\n".join(sections)


def main() -> None:
    context = build_supporting_context()
    criteria = build_criteria()
    alternatives = build_alternatives()
    scorecard = build_scorecard(criteria, alternatives)
    candidate_gate_binding_map = build_candidate_identity_and_gate_binding_map()
    release_evidence_matrix = build_release_evidence_artifact_matrix(
        candidate_gate_binding_map
    )
    migration_strategy = build_schema_migration_and_reader_window_strategy()
    rollback_decision_matrix = build_rollback_fail_forward_decision_matrix()
    client_strategy = build_client_compatibility_and_supported_window_strategy()
    restore_rules = build_restore_drill_and_promotion_binding_rules()
    mermaid = build_mermaid()
    adr_markdown = build_adr_markdown(
        context,
        scorecard,
        release_evidence_matrix,
        migration_strategy,
        rollback_decision_matrix,
        client_strategy,
        restore_rules,
    )
    comparison_markdown = build_comparison_markdown(scorecard, context)

    text_write(ADR_PATH, adr_markdown)
    text_write(COMPARISON_PATH, comparison_markdown)
    json_write(SCORECARD_PATH, scorecard)
    json_write(RELEASE_EVIDENCE_MATRIX_PATH, release_evidence_matrix)
    json_write(MIGRATION_STRATEGY_PATH, migration_strategy)
    json_write(ROLLBACK_DECISION_MATRIX_PATH, rollback_decision_matrix)
    json_write(CLIENT_WINDOW_STRATEGY_PATH, client_strategy)
    json_write(RESTORE_BINDING_RULES_PATH, restore_rules)
    json_write(CANDIDATE_GATE_BINDING_MAP_PATH, candidate_gate_binding_map)
    text_write(MERMAID_PATH, mermaid)


if __name__ == "__main__":
    main()
