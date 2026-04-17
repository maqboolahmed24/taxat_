#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[2]
ALGORITHM_DIR = ROOT / "Algorithm"
DATA_ANALYSIS_DIR = ROOT / "data" / "analysis"
DOCS_ANALYSIS_DIR = ROOT / "docs" / "analysis"
DIAGRAMS_ANALYSIS_DIR = ROOT / "diagrams" / "analysis"

FORMULA_SOURCE_PATH = ALGORITHM_DIR / "compute_parity_and_trust_formulas.md"
MODULES_PATH = ALGORITHM_DIR / "modules.md"
TEST_VECTORS_PATH = ALGORITHM_DIR / "test_vectors.md"

COMPUTE_SCHEMA_PATH = ALGORITHM_DIR / "schemas" / "compute_result.schema.json"
FORECAST_SCHEMA_PATH = ALGORITHM_DIR / "schemas" / "forecast_set.schema.json"
RISK_SCHEMA_PATH = ALGORITHM_DIR / "schemas" / "risk_report.schema.json"
PARITY_SCHEMA_PATH = ALGORITHM_DIR / "schemas" / "parity_result.schema.json"
TRUST_SCHEMA_PATH = ALGORITHM_DIR / "schemas" / "trust_summary.schema.json"
TRUST_INPUT_BASIS_SCHEMA_PATH = ALGORITHM_DIR / "schemas" / "trust_input_basis_contract.schema.json"
TRUST_SENSITIVITY_ALIAS_PATH = ALGORITHM_DIR / "schemas" / "trust_sensitivity_analysis_contract.schema.json"
TRUST_SENSITIVITY_SCHEMA_PATH = ALGORITHM_DIR / "schemas" / "trust_sensitivity_contract.schema.json"

MODULE_CATALOG_PATH = DATA_ANALYSIS_DIR / "module_catalog.json"
GATE_REGISTRY_PATH = DATA_ANALYSIS_DIR / "gate_registry.json"

FORMULA_DOC_PATH = DOCS_ANALYSIS_DIR / "11_compute_parity_risk_and_trust_formula_requirements.md"
DEPENDENCY_DOC_PATH = DOCS_ANALYSIS_DIR / "11_formula_dependency_and_execution_basis.md"
THRESHOLD_DOC_PATH = DOCS_ANALYSIS_DIR / "11_threshold_edge_case_and_sensitivity_matrix.md"
MERMAID_PATH = DIAGRAMS_ANALYSIS_DIR / "11_formula_dependency_graph.mmd"

REGISTRY_PATH = DATA_ANALYSIS_DIR / "formula_registry.json"
DEPENDENCY_CSV_PATH = DATA_ANALYSIS_DIR / "formula_dependencies.csv"
THRESHOLD_PATH = DATA_ANALYSIS_DIR / "thresholds_and_bands.json"
MONEY_CONTRACT_PATH = DATA_ANALYSIS_DIR / "money_and_rounding_contract.json"
REASON_CODE_MAP_PATH = DATA_ANALYSIS_DIR / "formula_reason_code_map.json"
TEST_VECTOR_PLAN_PATH = DATA_ANALYSIS_DIR / "formula_test_vector_plan.json"
SECONDARY_FAMILIES_PATH = DATA_ANALYSIS_DIR / "secondary_formula_families.json"

HEADING_RE = re.compile(r"^(#{2,3})\s+(.*)$")
SECTION_ID_RE = re.compile(r"^(8\.[0-9]+[A-Z]?)\s+(.*)$")
CODE_SPAN_RE = re.compile(r"`([^`]+)`")
REASON_CODE_RE = re.compile(
    r"\b(?:DQ|PARITY|RISK|GRAPH|TRUST|WORK|FLOW|UPLOAD|APPROVAL|FRICTION|COMPLETION)_[A-Z0-9_]+\b"
)

REQUIRED_NUMBERED_SECTIONS = [
    "8.1",
    "8.2",
    "8.3",
    "8.4",
    "8.5",
    "8.5A",
    "8.6",
    "8.7",
    "8.8",
    "8.9",
    "8.10",
    "8.10A",
    "8.11",
    "8.11A",
    "8.12",
    "8.13",
]
REQUIRED_SCHEMA_ARTIFACTS = {
    "ComputeResult": "Algorithm/schemas/compute_result.schema.json",
    "ForecastSet": "Algorithm/schemas/forecast_set.schema.json",
    "RiskReport": "Algorithm/schemas/risk_report.schema.json",
    "ParityResult": "Algorithm/schemas/parity_result.schema.json",
    "TrustSummary": "Algorithm/schemas/trust_summary.schema.json",
    "TrustInputBasisContract": "Algorithm/schemas/trust_input_basis_contract.schema.json",
    "TrustSensitivityAnalysisContract": "Algorithm/schemas/trust_sensitivity_contract.schema.json",
}
REQUIRED_EXISTING_VECTOR_IDS = [
    "TV-55",
    "TV-56",
    "TV-56A",
    "TV-56B",
    "TV-56C",
    "TV-56D",
    "TV-56E",
    "TV-56F",
    "TV-56G",
    "TV-57",
    "TV-58",
]
TRUST_PROBE_ORDER = [
    "TRUST_SCORE_MINUS_ONE",
    "TRUST_SCORE_PLUS_ONE",
    "RISK_SCORE_PLUS_ONE",
    "AUTHORITY_UNCERTAINTY_PLUS_ONE",
    "FRESHNESS_INVALIDATED",
    "INVALID_OVERRIDE_RELIED_UPON",
]
TRUST_EDGE_TRIGGER_ENUM = [
    "TRUST_GREEN_GUARD_BAND",
    "TRUST_AMBER_GUARD_BAND",
    "RISK_AUTOMATION_GUARD_BAND",
    "COMPLETENESS_GUARD_BAND",
    "GRAPH_FILING_GUARD_BAND",
    "AUTHORITY_REVIEW_GUARD_BAND",
    "AUTHORITY_BLOCK_GUARD_BAND",
]


@dataclass
class Block:
    key: str
    title: str
    level: int
    start_index: int
    end_index: int
    start_line: int
    end_line: int
    lines: list[str]
    children: list["Block"] = field(default_factory=list)
    section_id: str | None = None
    section_title: str | None = None


@dataclass(frozen=True)
class FormulaRecordSpec:
    formula_id: str
    label: str
    canonical_section: str
    subsection_titles: tuple[str, ...]
    formula_family: str
    output_artifacts: tuple[str, ...]
    output_fields: tuple[str, ...]
    inputs: tuple[str, ...]
    intermediate_terms: tuple[str, ...]
    mode_applicability: str
    money_profile_requirements: tuple[str, ...]
    determinism_rules: tuple[str, ...]
    threshold_dependencies: tuple[str, ...]
    reason_code_emissions: tuple[str, ...]
    downstream_gate_consumers: tuple[str, ...]
    module_bindings: tuple[str, ...]
    sensitivity_hooks: tuple[str, ...]
    schema_touchpoints: tuple[str, ...]
    notes: tuple[str, ...] = ()


@dataclass(frozen=True)
class DependencySpec:
    source_formula_id: str
    target_formula_id: str
    dependency_kind: str
    rationale: str


def repo_rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def line_ref(path: str, line_number: int, label: str) -> str:
    safe_label = re.sub(r"[^A-Za-z0-9_.-]+", "_", label).strip("_") or "line"
    return f"{path}::L{line_number}[{safe_label}]"


def ordered_unique(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if not value or value in seen:
            continue
        seen.add(value)
        result.append(value)
    return result


def slugify(text: str) -> str:
    text = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", text)
    text = re.sub(r"[^A-Za-z0-9]+", "_", text)
    return text.strip("_").lower()


def json_write(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")


def csv_write(path: Path, rows: list[dict[str, Any]], fieldnames: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def parse_blocks(path: Path) -> tuple[list[str], list[Block]]:
    lines = path.read_text().splitlines()
    headings: list[tuple[int, int, str]] = []
    for index, line in enumerate(lines):
        match = HEADING_RE.match(line)
        if match:
            headings.append((index, len(match.group(1)), match.group(2).strip()))
    blocks: list[Block] = []
    stack: list[Block] = []
    for heading_index, (start_index, level, title) in enumerate(headings):
        while stack and stack[-1].level >= level:
            stack.pop()
        end_index = len(lines)
        for next_start_index, next_level, _ in headings[heading_index + 1 :]:
            if next_level <= level:
                end_index = next_start_index
                break
        section_id = None
        section_title = None
        if level == 2:
            section_match = SECTION_ID_RE.match(title)
            if section_match:
                section_id = section_match.group(1)
                section_title = section_match.group(2).strip()
        parent = stack[-1] if stack else None
        if parent is not None:
            section_id = parent.section_id
            section_title = parent.section_title
        key_source = f"{level}:{title}:{start_index + 1}"
        block = Block(
            key=slugify(key_source),
            title=title,
            level=level,
            start_index=start_index,
            end_index=end_index,
            start_line=start_index + 1,
            end_line=end_index,
            lines=lines[start_index:end_index],
            section_id=section_id,
            section_title=section_title,
        )
        if stack:
            stack[-1].children.append(block)
        else:
            blocks.append(block)
        stack.append(block)
    return lines, blocks


def flatten_blocks(blocks: Iterable[Block]) -> list[Block]:
    result: list[Block] = []
    for block in blocks:
        result.append(block)
        result.extend(flatten_blocks(block.children))
    return result


def find_section_block(blocks: list[Block], section_id: str) -> Block:
    for block in blocks:
        if block.level == 2 and block.section_id == section_id:
            return block
    raise KeyError(section_id)


def find_subsection_block(section_block: Block, title: str) -> Block:
    normalized = title.lower()
    for block in flatten_blocks(section_block.children):
        if block.title.lower() == normalized:
            return block
    raise KeyError(f"{section_block.section_id}:{title}")


def block_source_refs(block: Block, extras: Iterable[Block] = ()) -> list[str]:
    refs = [line_ref(repo_rel(FORMULA_SOURCE_PATH), block.start_line, block.title)]
    for extra in extras:
        refs.append(line_ref(repo_rel(FORMULA_SOURCE_PATH), extra.start_line, extra.title))
    return ordered_unique(refs)


def infer_symbol(code: str) -> str | None:
    candidate = code.strip()
    if not candidate or "/" in candidate or candidate.startswith("http"):
        return None
    if candidate.startswith("schemas/"):
        return None
    for separator in (" = ", " in ", " >= ", " <= ", " > ", " < "):
        if separator in candidate:
            candidate = candidate.split(separator, 1)[0].strip()
            break
    candidate = candidate.removesuffix("[]").strip()
    if not candidate:
        return None
    if candidate[0].isdigit():
        return None
    if candidate.isupper() and "_" not in candidate and "(" not in candidate:
        return None
    return candidate


def extract_formula_symbols(blocks: Iterable[Block]) -> list[str]:
    symbols: list[str] = []
    for block in blocks:
        for line in block.lines:
            for code in CODE_SPAN_RE.findall(line):
                symbol = infer_symbol(code)
                if symbol is not None:
                    symbols.append(symbol)
    return ordered_unique(symbols)


def extract_reason_codes(blocks: Iterable[Block]) -> list[str]:
    codes: list[str] = []
    for block in blocks:
        for line in block.lines:
            codes.extend(REASON_CODE_RE.findall(line))
    return ordered_unique(codes)


def load_module_index() -> dict[str, dict[str, Any]]:
    payload = json.loads(MODULE_CATALOG_PATH.read_text())
    return {row["module_name"]: row for row in payload["modules"]}


def load_gate_index() -> dict[str, dict[str, Any]]:
    payload = json.loads(GATE_REGISTRY_PATH.read_text())
    return {row["gate_code"]: row for row in payload["gates"]}


def module_binding_rows(module_names: Iterable[str], module_index: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for module_name in module_names:
        row = module_index[module_name]
        rows.append(
            {
                "module_name": module_name,
                "phase_ids": [binding["phase_id"] for binding in row["run_phase_bindings"]],
                "step_ids": [binding["step_id"] for binding in row["run_phase_bindings"]],
                "artifact_targets": row["related_artifacts"],
                "schema_touchpoints": row["related_schemas"],
                "source_refs": row["source_heading_refs"],
            }
        )
    return rows


def gate_binding_rows(gate_codes: Iterable[str], gate_index: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for gate_code in gate_codes:
        row = gate_index[gate_code]
        rows.append(
            {
                "gate_code": gate_code,
                "reason_codes": row["reason_codes"],
                "overrideability": row["overrideability"],
                "source_refs": row["source_refs"],
                "downstream_consumers": row["downstream_consumers"],
            }
        )
    return rows


FORMULA_RECORD_SPECS = [
    FormulaRecordSpec(
        formula_id="trustsummary_artifact_binding",
        label="TrustSummary Artifact Binding",
        canonical_section="8.1",
        subsection_titles=(),
        formula_family="binding_contract",
        output_artifacts=("TrustSummary", "ComputeResult", "ForecastSet", "RiskReport", "ParityResult"),
        output_fields=(
            "execution_mode",
            "analysis_only",
            "compute_result_ref",
            "parity_result_ref",
            "risk_report_ref",
            "evidence_graph_ref",
            "gate_decision_refs",
            "trust_input_state",
            "trust_input_basis_contract",
            "trust_sensitivity_analysis_contract",
            "score_band",
            "cap_band",
            "trust_band",
            "trust_score",
            "automation_level",
            "filing_readiness",
            "dominant_reason_code",
            "decision_constraint_codes",
            "blocking_dependency_refs",
        ),
        inputs=(
            "compute_result_ref",
            "parity_result_ref",
            "risk_report_ref",
            "evidence_graph_ref",
            "gate_decision_refs",
            "baseline_submission_state",
            "live_authority_progression_requested",
        ),
        intermediate_terms=("trust_input_basis_contract", "trust_sensitivity_analysis_contract", "threshold_stability_state"),
        mode_applicability="Both COMPLIANCE and ANALYSIS; artifact flags must remain internally consistent.",
        money_profile_requirements=(
            "TrustSummary must carry dereferenceable compute/parity artifacts whose money-bearing fields preserve the frozen money profile.",
        ),
        determinism_rules=(
            "Formula execution must emit schema-valid TrustSummary, ComputeResult, ForecastSet, RiskReport, and ParityResult artifacts.",
            "Artifact binding is normative current behavior, not a deferred pack repair.",
        ),
        threshold_dependencies=("trust_input_state_enum", "score_band_enum", "cap_band_enum", "trust_band_enum", "automation_level_enum", "filing_readiness_enum"),
        reason_code_emissions=(),
        downstream_gate_consumers=("TRUST_GATE", "FILING_GATE", "SUBMISSION_GATE", "AMENDMENT_GATE"),
        module_bindings=("COMPUTE_OUTCOME", "FORECAST", "SCORE_RISK", "EVALUATE_PARITY", "SYNTHESIZE_TRUST"),
        sensitivity_hooks=("trust_input_basis_contract", "trust_sensitivity_analysis_contract"),
        schema_touchpoints=(
            repo_rel(TRUST_SCHEMA_PATH),
            repo_rel(COMPUTE_SCHEMA_PATH),
            repo_rel(FORECAST_SCHEMA_PATH),
            repo_rel(RISK_SCHEMA_PATH),
            repo_rel(PARITY_SCHEMA_PATH),
            repo_rel(TRUST_INPUT_BASIS_SCHEMA_PATH),
            repo_rel(TRUST_SENSITIVITY_SCHEMA_PATH),
        ),
        notes=(
            "This record is a contract surface, not an arithmetic equation family.",
            "It freezes the schema-backed output boundary for all later formula families.",
        ),
    ),
    FormulaRecordSpec(
        formula_id="standard_normalization_rules",
        label="Standard Normalization Rules",
        canonical_section="8.2",
        subsection_titles=(),
        formula_family="shared_runtime_helpers",
        output_artifacts=("ComputeResult", "ForecastSet", "ParityResult", "TrustSummary"),
        output_fields=("money_profile", "serialization_profile", "aggregation_boundary"),
        inputs=("money_profile", "active_weights", "timestamps", "runtime_scope"),
        intermediate_terms=(
            "clamp01",
            "clamp100",
            "round_score",
            "round_penalty30",
            "round_money",
            "safe_unit",
            "weighted_mean",
            "min_non_null",
            "hours_between",
            "half_life_score",
            "sigmoid",
            "Σw",
        ),
        mode_applicability="Shared across all formula families; applies identically under compliance, analysis, workflow, and client-flow evaluation.",
        money_profile_requirements=(
            "Use exact fixed-scale decimal arithmetic in the smallest legal currency unit.",
            "Round only at declared aggregation boundaries.",
            "Serialize money as canonical decimal strings with frozen scale and trailing zeros.",
            "Reject binary floating point, exponent notation, locale separators, NaN, infinity, and trimmed scale.",
        ),
        determinism_rules=(
            "Weighted averages normalize only by positive active-weight sums.",
            "Non-monetary multi-term reductions use deterministic canonical ordering plus pairwise or compensated summation.",
            "All deterministic branches must be byte-stable under the same manifest.",
        ),
        threshold_dependencies=("money_profile_contract", "canonical_decimal_serialization_v1"),
        reason_code_emissions=(),
        downstream_gate_consumers=("DATA_QUALITY_GATE", "PARITY_GATE", "TRUST_GATE", "FILING_GATE"),
        module_bindings=(
            "COMPUTE_OUTCOME",
            "FORECAST",
            "SCORE_RISK",
            "EVALUATE_PARITY",
            "ASSESS_TRUST_INPUT_STATE",
            "SYNTHESIZE_TRUST",
        ),
        sensitivity_hooks=("money_profile",),
        schema_touchpoints=(
            repo_rel(COMPUTE_SCHEMA_PATH),
            repo_rel(FORECAST_SCHEMA_PATH),
            repo_rel(PARITY_SCHEMA_PATH),
            repo_rel(TRUST_SCHEMA_PATH),
        ),
        notes=("Shared helper layer for all downstream formula records.",),
    ),
    FormulaRecordSpec(
        formula_id="data_quality_and_completeness",
        label="Data-Quality and Completeness",
        canonical_section="8.3",
        subsection_titles=(),
        formula_family="core_formula_family",
        output_artifacts=("TrustSummary", "GateDecisionRecord"),
        output_fields=("completeness_score", "data_quality_score"),
        inputs=(
            "C_d",
            "fact_confidence_f",
            "fact_weight_f",
            "decision_information_ratio_f",
            "projection_information_ratio_f",
            "limitation_explicitness_f",
            "error_budget_d",
            "critical_errors_d",
            "major_errors_d",
            "minor_errors_d",
            "partition_integrity_d",
            "weight_d",
        ),
        intermediate_terms=(
            "decision_survivability_f",
            "decision_confidence_f",
            "projection_fidelity_f",
            "projected_confidence_f",
            "presence_d",
            "survivability_d",
            "limitation_clarity_d",
            "privacy_projection_quality_d",
            "confidence_d",
            "validation_d",
            "effective_presence_d",
            "domain_quality_d",
        ),
        mode_applicability="Feeds trust in both modes; projection-side confidence remains read-side only and must never re-enter compute, parity, trust, or filing readiness.",
        money_profile_requirements=(),
        determinism_rules=(
            "NOT_REQUESTED and NOT_APPLICABLE facts stay out of the denominator; LIMITED and NOT_YET_MATERIALIZED facts remain in scope and degrade the score.",
            "Zero-sum domain weights, invalid error budgets, and filing-critical silent limitation ambiguity are structural failures, not soft warnings.",
        ),
        threshold_dependencies=("data_quality_freshness_scale", "dq_structural_fail_closed_conditions", "completeness_minimum_for_trust_caps"),
        reason_code_emissions=(
            "DQ_CONFIDENCE_WEIGHT_INVALID",
            "PRIVACY_PROJECTION_RATIO_INVALID",
            "LIMITATION_SILENT_AMBIGUITY",
            "DQ_INVALID_ERROR_BUDGET",
            "DQ_WEIGHT_PROFILE_INVALID",
            "DQ_LOW_COMPLETENESS",
            "DQ_LOW_QUALITY",
        ),
        downstream_gate_consumers=("DATA_QUALITY_GATE", "TRUST_GATE", "FILING_GATE"),
        module_bindings=("ASSESS_TRUST_INPUT_STATE", "SYNTHESIZE_TRUST"),
        sensitivity_hooks=("decision_information_ratio_f", "projection_fidelity_f", "limitation_explicitness_f"),
        schema_touchpoints=(repo_rel(TRUST_SCHEMA_PATH),),
        notes=("Decision confidence and projection confidence are deliberately separated to preserve legal decisioning boundaries.",),
    ),
    FormulaRecordSpec(
        formula_id="record_and_adjustment_compute",
        label="Record-Layer and Adjustment-Layer Compute",
        canonical_section="8.4",
        subsection_titles=("Quarterly basis profile", "Year-end reportable totals", "Rule-evaluated outcome"),
        formula_family="core_formula_family",
        output_artifacts=("ComputeResult",),
        output_fields=(
            "reporting_scope",
            "adjustment_scope_source",
            "quarterly_basis_profile_or_null",
            "totals",
            "assumptions",
            "diagnostic_reason_codes",
        ),
        inputs=(
            "F_record",
            "F_adjust",
            "runtime_scope",
            "adjustment_binding(a)",
            "eligible_compute_facts(mode)",
            "rule_version",
            "profile_facts",
            "declaration_facts",
            "authority_reference_facts",
        ),
        intermediate_terms=(
            "reporting_scope(runtime_scope[])",
            "selected_reporting_scope(runtime_scope[])",
            "record_total",
            "adjustment_total",
            "quarterly_reportable_total",
            "annual_record_total",
            "annual_adjusted_total",
            "annual_adjusted_totals",
            "outcome_vector",
        ),
        mode_applicability="Compliance compute requires CANONICAL facts and executable reporting scope; analysis mode may include PROVISIONAL facts only under explicit frozen analysis policy and must remain analysis_only.",
        money_profile_requirements=(
            "Contribution order within each slice is lexicographic by effective_date and canonical_fact_id.",
            "Exact-decimal intermediate precision is preserved until the declared aggregation boundary, then round_money applies once.",
        ),
        determinism_rules=(
            "Quarterly totals remain record-layer only even under cumulative basis.",
            "Compliance compute must derive adjustment inclusion from executable reporting scope and exact partition scope, never from requested scope or amendment posture.",
            "RuleEvaluation uses only frozen manifest inputs and executes in deterministic order.",
        ),
        threshold_dependencies=("quarterly_basis_enum", "analysis_only_mode_boundary"),
        reason_code_emissions=(),
        downstream_gate_consumers=("PARITY_GATE", "TRUST_GATE", "FILING_GATE", "AMENDMENT_GATE"),
        module_bindings=("COMPUTE_OUTCOME",),
        sensitivity_hooks=("adjustment_scope_source", "quarterly_basis", "analysis_mode_treatment"),
        schema_touchpoints=(repo_rel(COMPUTE_SCHEMA_PATH),),
        notes=("Amendment intent and amendment submit remain year-end reporting basis rather than a new reporting-scope token.",),
    ),
    FormulaRecordSpec(
        formula_id="forecast",
        label="Forecast",
        canonical_section="8.5",
        subsection_titles=(),
        formula_family="core_formula_family",
        output_artifacts=("ForecastSet",),
        output_fields=("point_forecasts", "scenarios", "seeds"),
        inputs=(
            "baseline_total(c)",
            "baseline_steps(c)",
            "seasonality_index(h,c)",
            "annualized_growth_rate(c)",
            "horizon_years(h)",
            "forecast_profile",
            "deterministic_seed",
        ),
        intermediate_terms=("baseline_run_rate(c)", "normalized_seasonality(h,c)", "forecast_seed", "epsilon_(h,c,s)", "point_forecast(h,c)", "simulated_forecast(h,c,s)"),
        mode_applicability="Analysis-only; forecast artifacts must never mutate the compliance compute result in place.",
        money_profile_requirements=("Forecast outputs round via round_money under the frozen forecast money profile.",),
        determinism_rules=(
            "The point forecast uses mass-preserving seasonality and horizon-scaled trend.",
            "Monte Carlo residuals must be deterministically seeded from frozen controls; manifest_id alone must not perturb the seed.",
        ),
        threshold_dependencies=("forecast_floor_cap_profile",),
        reason_code_emissions=(),
        downstream_gate_consumers=(),
        module_bindings=("FORECAST",),
        sensitivity_hooks=("forecast_seed", "scenario_id", "canonical_forecast_profile"),
        schema_touchpoints=(repo_rel(FORECAST_SCHEMA_PATH),),
        notes=("No forecast should be emitted for categories with zero baseline steps.",),
    ),
    FormulaRecordSpec(
        formula_id="risk_scoring",
        label="Risk Scoring",
        canonical_section="8.5A",
        subsection_titles=(),
        formula_family="core_formula_family",
        output_artifacts=("RiskReport", "TrustSummary"),
        output_fields=("risk_score", "feature_scores", "flags", "unresolved_material_blocking_risk_flag", "unresolved_blocking_risk_flag"),
        inputs=("feature_value_m", "feature_weight_m", "material_threshold_m", "blocking_threshold_m", "feature_resolved_m"),
        intermediate_terms=("Σw_risk", "risk_score_raw", "material_risk_flag_count", "blocking_risk_flag_count"),
        mode_applicability="Used in both modes from frozen pre-parity artifacts.",
        money_profile_requirements=(),
        determinism_rules=(
            "The model is feature-calibrated and profile-driven rather than heuristic.",
            "Zero-sum risk profiles fail closed with maximal risk and a blocking flag.",
        ),
        threshold_dependencies=("risk_blocking_thresholds", "risk_automation_guard_threshold"),
        reason_code_emissions=("RISK_WEIGHT_PROFILE_INVALID", "RISK_MATERIAL_FLAG", "RISK_BLOCKING_FLAG", "TRUST_BLOCKING_RISK"),
        downstream_gate_consumers=("TRUST_GATE", "FILING_GATE"),
        module_bindings=("SCORE_RISK", "SYNTHESIZE_TRUST"),
        sensitivity_hooks=("risk_threshold_profile_ref", "feature_weight_m", "material_threshold_m", "blocking_threshold_m"),
        schema_touchpoints=(repo_rel(RISK_SCHEMA_PATH), repo_rel(TRUST_SCHEMA_PATH)),
        notes=("Trust consumes both risk_score and the unresolved blocking flags rather than score alone.",),
    ),
    FormulaRecordSpec(
        formula_id="parity_comparison_set_construction",
        label="Parity Comparison-Set Construction",
        canonical_section="8.6",
        subsection_titles=("Scope rules",),
        formula_family="core_formula_family",
        output_artifacts=("ParityResult",),
        output_fields=("comparison_basis_ref", "comparison_requirement", "comparison_set_state", "ordered_field_codes", "dominant_reason_code", "reason_codes"),
        inputs=(
            "internal_value_k",
            "authority_value_k",
            "criticality_weight_k",
            "abs_threshold_k",
            "rel_threshold_k",
            "abs_floor_k",
            "criticality_class",
            "comparison_basis_ref",
            "comparison_requirement",
        ),
        intermediate_terms=("K", "criticality_rank", "comparison_set_state"),
        mode_applicability="Compliance parity requires canonical authority-comparable facts; analysis parity may include provisional facts only under explicit frozen analysis policy and must remain analysis_only.",
        money_profile_requirements=("Comparison items preserve exact-decimal internal and authority values under the frozen money profile.",),
        determinism_rules=(
            "K is deduplicated by field_code and ordered by criticality rank then field_code.",
            "Invalid comparison-set construction must persist a fail-closed ParityResult rather than guessing through partial materialization.",
        ),
        threshold_dependencies=("comparison_requirement_enum", "parity_threshold_profile"),
        reason_code_emissions=("PARITY_COMPARISON_SET_INVALID", "PARITY_NOT_COMPARABLE", "PARITY_PARTIAL_COVERAGE"),
        downstream_gate_consumers=("PARITY_GATE", "TRUST_GATE", "AMENDMENT_GATE"),
        module_bindings=("EVALUATE_PARITY",),
        sensitivity_hooks=("comparison_requirement", "comparison_basis_ref", "parity_threshold_profile_ref"),
        schema_touchpoints=(repo_rel(PARITY_SCHEMA_PATH),),
        notes=("Authority calculation path must be frozen before parity evaluation and reused by later filing or amendment stages.",),
    ),
    FormulaRecordSpec(
        formula_id="per_field_parity",
        label="Per-Field Parity",
        canonical_section="8.7",
        subsection_titles=("Per-field classification",),
        formula_family="core_formula_family",
        output_artifacts=("ParityResult",),
        output_fields=("deltas",),
        inputs=("internal_value_k", "authority_value_k", "abs_threshold_k", "rel_threshold_k", "abs_floor_k", "minimum_rel_floor"),
        intermediate_terms=("delta_signed_k", "delta_abs_k", "effective_abs_floor_k", "delta_rel_k", "breach_abs_k", "breach_rel_k", "breach_ratio_k", "field_class_k"),
        mode_applicability="Applies to every frozen comparison item; numeric invalidity must stop at the per-field layer and never leak as renderer-local coercion.",
        money_profile_requirements=(
            "Money-bearing deltas are exact-decimal values computed from unrounded intermediates.",
            "Threshold and floor checks use exact intermediates rather than previously rounded display totals.",
        ),
        determinism_rules=(
            "Each fieldDelta persists threshold and floor inputs needed for exact replay.",
            "Zero-threshold breaches use the profile-defined blocking_ratio_cap rather than implicit infinity semantics.",
        ),
        threshold_dependencies=("minimum_rel_floor", "blocking_ratio_cap", "parity_field_class_thresholds"),
        reason_code_emissions=(),
        downstream_gate_consumers=("PARITY_GATE", "TRUST_GATE"),
        module_bindings=("EVALUATE_PARITY",),
        sensitivity_hooks=("abs_threshold_k", "rel_threshold_k", "abs_floor_k", "minimum_rel_floor", "blocking_ratio_cap"),
        schema_touchpoints=(repo_rel(PARITY_SCHEMA_PATH),),
        notes=("Per-field classification is a deterministic threshold surface, not a UI-only explanation layer.",),
    ),
    FormulaRecordSpec(
        formula_id="aggregate_parity",
        label="Aggregate Parity",
        canonical_section="8.8",
        subsection_titles=("Aggregate parity classification",),
        formula_family="core_formula_family",
        output_artifacts=("ParityResult", "TrustSummary"),
        output_fields=("comparison_coverage", "weighted_parity_pressure", "parity_score", "parity_classification", "dominant_reason_code", "reason_codes"),
        inputs=("K", "field_class_k", "criticality_weight_k", "comparison_requirement", "comparison_set_state"),
        intermediate_terms=("Σw_required", "Σw_comparable", "comparison_coverage", "weighted_parity_pressure", "parity_score_raw", "parity_score"),
        mode_applicability="Feeds parity gating and trust synthesis in both modes.",
        money_profile_requirements=(),
        determinism_rules=(
            "The aggregate classification uses a strict precedence ladder; later score branches cannot override a prior match.",
            "Top-level explanation codes are persisted in deterministic priority order.",
        ),
        threshold_dependencies=("parity_aggregate_thresholds", "comparison_requirement_enum"),
        reason_code_emissions=(
            "PARITY_COMPARISON_SET_INVALID",
            "PARITY_NOT_COMPARABLE",
            "PARITY_PARTIAL_COVERAGE",
            "PARITY_BLOCKING_DIFFERENCE",
            "PARITY_MATERIAL_DIFFERENCE",
            "PARITY_MINOR_DIFFERENCE",
            "PARITY_MATCH",
            "PARITY_NOT_REQUIRED_NO_AUTHORITY_BASIS",
        ),
        downstream_gate_consumers=("PARITY_GATE", "TRUST_GATE", "AMENDMENT_GATE", "FILING_GATE"),
        module_bindings=("EVALUATE_PARITY", "SYNTHESIZE_TRUST"),
        sensitivity_hooks=("comparison_requirement", "comparison_coverage", "weighted_parity_pressure"),
        schema_touchpoints=(repo_rel(PARITY_SCHEMA_PATH), repo_rel(TRUST_SCHEMA_PATH)),
        notes=("The NOT_REQUIRED fallback applies only when the policy explicitly marks the scope as not requiring authority comparison.",),
    ),
    FormulaRecordSpec(
        formula_id="evidence_graph_quality",
        label="Evidence-Graph Quality",
        canonical_section="8.9",
        subsection_titles=(),
        formula_family="core_formula_family",
        output_artifacts=("TrustSummary", "GateDecisionRecord"),
        output_fields=("graph_quality_score",),
        inputs=(
            "F_return",
            "F_critical",
            "support_state(f)",
            "closure_state(f)",
            "proof_bundle_ref(f)",
            "support_confidence_e",
            "decision_information_ratio_e",
            "limitation_explicitness_e",
            "review_projection_ratio_e",
            "figure_weight_f",
        ),
        intermediate_terms=(
            "coverage_return",
            "coverage_critical",
            "closed_critical_ratio",
            "proof_bundle_coverage",
            "unsupported_ratio",
            "contradicted_ratio",
            "stale_ratio",
            "replay_failure_ratio",
            "open_closure_ratio",
            "explanation_failure_ratio",
            "path_survivability",
            "path_clarity",
            "path_review_projection_fidelity",
            "best_admissible_path",
            "best_path_confidence",
            "explanation_quality",
            "weighted_explanation_quality",
            "weighted_path_survivability",
            "limitation_clarity_ratio",
            "silent_ambiguity_ratio",
            "inferred_path_ratio",
            "graph_quality_raw",
            "graph_quality_score",
        ),
        mode_applicability="Feeds retention evidence gating and trust in filing-capable and review-capable runs.",
        money_profile_requirements=(),
        determinism_rules=(
            "Best admissible path selection is deterministic through path_tuple ordering.",
            "Fail-closed caps are explicit and severity-ordered; silent ambiguity blocks filing-capable trust regardless of rendered narrative quality.",
        ),
        threshold_dependencies=("graph_quality_fail_closed_caps", "graph_survivability_minima"),
        reason_code_emissions=("GRAPH_LOW_COVERAGE", "GRAPH_HIGH_INFERENCE", "GRAPH_WEIGHT_PROFILE_INVALID", "TRUST_RETENTION_PENALTY"),
        downstream_gate_consumers=("RETENTION_EVIDENCE_GATE", "TRUST_GATE", "FILING_GATE"),
        module_bindings=("SYNTHESIZE_TRUST",),
        sensitivity_hooks=("review_projection_ratio_e", "figure_weight_f", "submit_survivability_min", "review_survivability_min", "audit_survivability_min"),
        schema_touchpoints=(repo_rel(TRUST_SCHEMA_PATH),),
        notes=("Projection-side reviewer fidelity is scored explicitly without mutating canonical support semantics.",),
    ),
    FormulaRecordSpec(
        formula_id="trust_authority_uncertainty",
        label="Trust Authority Uncertainty",
        canonical_section="8.10",
        subsection_titles=("Authority-grounded uncertainty score",),
        formula_family="core_formula_family",
        output_artifacts=("TrustSummary", "TrustInputBasisContract"),
        output_fields=("authority_uncertainty_score",),
        inputs=("O", "src_rel_o", "corr_o", "fresh_o", "clarity_o"),
        intermediate_terms=("w_o", "W", "p_x", "reconciliation_confidence", "external_truth_ambiguity", "authority_state_staleness_score", "authority_uncertainty_raw", "authority_uncertainty_score"),
        mode_applicability="Always required when trust synthesis evaluates live authority progression or baseline submission posture.",
        money_profile_requirements=(),
        determinism_rules=(
            "Authority uncertainty is quantitative and source-weighted; it may not be replaced by a prose-only heuristic.",
            "The same frozen observation set must reproduce the same uncertainty score and emitted reasons.",
        ),
        threshold_dependencies=("authority_review_threshold", "authority_block_threshold", "authority_penalty_curve"),
        reason_code_emissions=(
            "TRUST_AUTHORITY_CONFIDENCE_LOW",
            "TRUST_AUTHORITY_AMBIGUITY_HIGH",
            "TRUST_AUTHORITY_STATE_STALE",
            "TRUST_AUTHORITY_STATE_UNRESOLVED",
        ),
        downstream_gate_consumers=("TRUST_GATE", "FILING_GATE", "AMENDMENT_GATE"),
        module_bindings=("ASSESS_TRUST_INPUT_STATE", "SYNTHESIZE_TRUST"),
        sensitivity_hooks=("half_life_seconds(source_class(o))", "src_rel_o", "corr_o", "clarity_o"),
        schema_touchpoints=(repo_rel(TRUST_SCHEMA_PATH), repo_rel(TRUST_INPUT_BASIS_SCHEMA_PATH)),
        notes=("Authority-defined legal truth outranks UI-defined confidence.",),
    ),
    FormulaRecordSpec(
        formula_id="trust_input_admissibility_and_basis",
        label="Trust Input Admissibility and Basis",
        canonical_section="8.10",
        subsection_titles=("Required trust input", "Trust-input admissibility state", "TrustInputBasisContract"),
        formula_family="core_formula_family",
        output_artifacts=("TrustSummary", "TrustInputBasisContract"),
        output_fields=("trust_input_state", "trust_input_basis_contract", "trust_fresh_until", "blocking_dependency_refs"),
        inputs=(
            "required_trust_artifacts[]",
            "required_context_inputs[]",
            "baseline_submission_state",
            "authority_uncertainty_score",
            "live_authority_progression_requested",
            "execution_mode",
            "analysis_only",
            "required_human_steps[]",
            "late_data_monitor",
            "overrides",
        ),
        intermediate_terms=(
            "input_presence_ok",
            "input_manifest_ok",
            "input_lifecycle_ok",
            "input_consistency_ok",
            "input_limitation_ok",
            "external_freshness_deadlines[]",
            "trust_fresh_until",
            "input_freshness_ok",
            "input_presence_state",
            "manifest_binding_state",
            "lifecycle_binding_state",
            "consistency_state",
            "limitation_semantics_state",
            "freshness_state",
            "freshness_dependency_classes[]",
            "baseline_progression_state",
            "baseline_selection_contract_hash_or_null",
            "baseline_automation_ceiling",
            "baseline_limitation_reason_codes[]",
            "authority_progression_state",
            "late_data_invalidation_state",
            "override_dependency_state",
            "human_step_state",
            "automation_ceiling",
            "filing_readiness_ceiling",
        ),
        mode_applicability="Required before any trust score or band math; applies in both modes and across continuation/replay lineage admitted by policy.",
        money_profile_requirements=(),
        determinism_rules=(
            "Missing, superseded, manifest-mismatched, inconsistent, or silently limited inputs fail closed with explicit reason codes.",
            "The trust_input_basis_contract freezes typed basis states and ceilings so downstream consumers cannot flatten them into a generic score.",
        ),
        threshold_dependencies=("trust_input_state_enum", "automation_ceiling_enum", "filing_readiness_ceiling_enum", "baseline_progression_state_enum", "authority_progression_state_enum"),
        reason_code_emissions=(
            "TRUST_INPUT_INCOMPLETE",
            "TRUST_INPUT_STALE",
            "TRUST_INPUT_CONTRADICTION",
            "TRUST_OVERRIDE_INVALID",
            "TRUST_REQUIRED_HUMAN_STEPS",
        ),
        downstream_gate_consumers=("TRUST_GATE", "FILING_GATE", "SUBMISSION_GATE"),
        module_bindings=("VALIDATE_OVERRIDE_DEPENDENCIES", "ASSESS_TRUST_INPUT_STATE", "CHECK_TRUST_CURRENCY", "SYNTHESIZE_TRUST"),
        sensitivity_hooks=("external_freshness_deadlines[]", "baseline_automation_ceiling", "authority_progression_state", "human_step_state"),
        schema_touchpoints=(repo_rel(TRUST_SCHEMA_PATH), repo_rel(TRUST_INPUT_BASIS_SCHEMA_PATH)),
        notes=("Every non-dominant basis reason must survive into decision_constraint_codes so later surfaces do not lose the ceiling rationale.",),
    ),
    FormulaRecordSpec(
        formula_id="trust_upstream_gate_cap",
        label="Trust Upstream Gate Cap",
        canonical_section="8.10",
        subsection_titles=("Upstream gate progression cap",),
        formula_family="core_formula_family",
        output_artifacts=("TrustSummary",),
        output_fields=("upstream_gate_cap",),
        inputs=("upstream_gate_records[]",),
        intermediate_terms=("u_block", "u_review", "u_notice", "upstream_gate_cap"),
        mode_applicability="Applies whenever trust reads prior non-access gate posture.",
        money_profile_requirements=(),
        determinism_rules=(
            "Trust cannot outrank earlier non-access gates.",
            "The progression order AUTO_ELIGIBLE > NOTICE_ONLY > REVIEW_ONLY > BLOCKED is frozen and persisted.",
        ),
        threshold_dependencies=("upstream_gate_cap_enum",),
        reason_code_emissions=("TRUST_UPSTREAM_GATE_BLOCK", "TRUST_UPSTREAM_GATE_REVIEW_REQUIRED", "TRUST_UPSTREAM_GATE_NOTICE_ACTIVE"),
        downstream_gate_consumers=("TRUST_GATE", "FILING_GATE"),
        module_bindings=("SYNTHESIZE_TRUST", "TRUST_GATE"),
        sensitivity_hooks=("upstream_gate_cap",),
        schema_touchpoints=(repo_rel(TRUST_SCHEMA_PATH),),
        notes=("Upstream gate posture is a stage-local legal ceiling, not a UI convenience.",),
    ),
    FormulaRecordSpec(
        formula_id="trust_scoring_bands_and_readiness",
        label="Trust Scoring, Bands, and Readiness",
        canonical_section="8.10",
        subsection_titles=(
            "Base trust score",
            "Penalties",
            "Score bands, threshold guard bands, and band caps",
            "Projected human-facing level",
            "Automation level",
            "Trust sensitivity analyzer",
            "Filing readiness",
            "Amendment freshness and retroactive caps",
        ),
        formula_family="core_formula_family",
        output_artifacts=("TrustSummary", "TrustSensitivityAnalysisContract"),
        output_fields=(
            "trust_core_score",
            "trust_score",
            "score_band",
            "cap_band",
            "trust_band",
            "threshold_stability_state",
            "trust_level",
            "automation_level",
            "filing_readiness",
            "legal_progression_rank",
            "trust_sensitivity_analysis_contract",
        ),
        inputs=(
            "Q",
            "P",
            "G",
            "R",
            "risk_score",
            "completeness_score",
            "graph_quality_score",
            "authority_uncertainty_score",
            "comparison_requirement",
            "baseline_submission_state",
            "execution_mode",
            "analysis_only",
            "required_human_steps_count",
            "active_filing_critical_override_count",
            "critical_retention_limited_count",
            "trust_input_state",
            "upstream_gate_cap",
        ),
        intermediate_terms=(
            "q_raw",
            "p_raw",
            "g_raw",
            "r_raw",
            "trust_core_score",
            "override_penalty",
            "retention_penalty",
            "authority_penalty",
            "trust_score",
            "score_band",
            "trust_green_margin",
            "trust_amber_margin",
            "risk_automation_margin",
            "completeness_margin",
            "graph_filing_margin",
            "authority_review_margin",
            "authority_block_margin",
            "threshold_stability_state",
            "cap_band",
            "trust_band",
            "trust_level",
            "automation_level",
            "score_cap_alignment_state",
            "cap_driver_reason_codes[]",
            "edge_trigger_codes[]",
            "projected_case_results[]",
            "readiness_rank",
            "automation_rank",
            "legal_progression_rank",
            "retroactive_penalty",
            "amendment_freshness_penalty",
        ),
        mode_applicability="Core trust family for both modes; ANALYSIS mode is explicitly capped and must never publish greener machine progression than READY_REVIEW/LIMITED.",
        money_profile_requirements=(),
        determinism_rules=(
            "Trust is conjunctive and uses a weighted geometric mean over normalized axes.",
            "score_band, cap_band, and trust_band are distinct persisted fields; cap-band restrictions may be stricter than the numeric score.",
            "The trust sensitivity contract freezes the score-vs-cap relation, edge triggers, margins, and exactly six perturbation probes.",
            "The bridge ALLOWED <-> READY_TO_SUBMIT, LIMITED <-> READY_REVIEW, BLOCKED <-> NOT_READY is exact and stage-monotone.",
        ),
        threshold_dependencies=(
            "trust_score_bands",
            "trust_guard_bands",
            "trust_cap_band_rules",
            "automation_level_enum",
            "filing_readiness_enum",
            "threshold_stability_enum",
            "trust_edge_trigger_enum",
            "analysis_mode_cap",
            "amendment_freshness_caps",
        ),
        reason_code_emissions=(
            "PARITY_NOT_REQUIRED_NO_AUTHORITY_BASIS",
            "TRUST_AUTHORITY_PENALTY",
            "TRUST_THRESHOLD_EDGE_REVIEW",
            "TRUST_AUTOMATION_LIMITED",
            "TRUST_ANALYSIS_MODE_CAP",
            "TRUST_AMENDMENT_FRESHNESS_STALE",
            "TRUST_RETROACTIVE_IMPACT_UNRESOLVED",
            "TRUST_GREEN",
            "TRUST_AMBER",
            "TRUST_RED",
            "TRUST_INSUFFICIENT_DATA",
        ),
        downstream_gate_consumers=("TRUST_GATE", "FILING_GATE", "AMENDMENT_GATE", "SUBMISSION_GATE"),
        module_bindings=("SYNTHESIZE_TRUST", "BUILD_GATE_EXPLANATION", "TRUST_GATE"),
        sensitivity_hooks=(
            "trust_green_margin",
            "trust_amber_margin",
            "risk_automation_margin",
            "completeness_margin",
            "graph_filing_margin_or_null",
            "authority_review_margin_or_null",
            "authority_block_margin_or_null",
            "edge_trigger_codes[]",
            "projected_case_results[]",
        ),
        schema_touchpoints=(repo_rel(TRUST_SCHEMA_PATH), repo_rel(TRUST_SENSITIVITY_SCHEMA_PATH), repo_rel(TRUST_SENSITIVITY_ALIAS_PATH)),
        notes=("Sensitivity analysis is a first-class persisted contract rather than debug-only output.",),
    ),
    FormulaRecordSpec(
        formula_id="collaboration_orchestration_queue_routing",
        label="Collaboration Orchestration, Queue, and Routing",
        canonical_section="8.10A",
        subsection_titles=(
            "Assignment efficiency and ownership confidence",
            "Resolution confidence",
            "Escalation pressure and escalation rank",
            "Queue health",
            "Collaboration priority and stable order",
        ),
        formula_family="secondary_formula_family",
        output_artifacts=("WorkRoutingContract", "WorkQueueHealthContract"),
        output_fields=("assignment_efficiency_score", "ownership_confidence_score", "resolution_confidence_score", "escalation_rank", "queue_health_score", "collaboration_priority_score"),
        inputs=(
            "effective_due_at_i",
            "queue_entered_at_i",
            "waiting_since_at_i",
            "routing_policy",
            "eligible_assignee_set",
            "arrival_rate_q",
            "service_rate_q",
            "staffed_parallelism_q",
        ),
        intermediate_terms=(
            "remaining_hours_i",
            "item_age_hours_i",
            "waiting_age_hours_i",
            "priority_base_i",
            "age_pressure_i",
            "customer_wait_pressure_i",
            "staff_wait_pressure_i",
            "authority_wait_pressure_i",
            "due_soon_signal_i",
            "breach_signal_i",
            "sla_pressure_raw_i",
            "sla_pressure_score_i",
            "assignment_efficiency_(i,a)",
            "best_assign_score_i",
            "assignment_margin_i",
            "ownership_confidence_raw_i",
            "ownership_confidence_score_i",
            "resolution_confidence_raw_i",
            "resolution_confidence_score_i",
            "resolution_uncertainty_i",
            "escalation_pressure_raw_i",
            "escalation_pressure_score_i",
            "escalation_rank_i",
            "P_wait_q",
            "expected_wait_hours_q",
            "queue_health_signal_q",
            "queue_health_score_q",
            "queue_pressure_i",
            "collaboration_priority_signal_i",
            "collaboration_priority_score_i",
            "priority_tuple_i",
        ),
        mode_applicability="Operational secondary family; must remain separate from core filing trust even though it reuses shared helpers.",
        money_profile_requirements=(),
        determinism_rules=(
            "Ordering is frozen per snapshot and must not vary with websocket arrival order or local sort heuristics.",
            "Assignment and queue health reuse the same deterministic helper surface as core formulas without feeding filing trust.",
        ),
        threshold_dependencies=("work_priority_base_map", "work_resolution_caps", "queue_health_floor", "escalation_pressure_threshold"),
        reason_code_emissions=(
            "WORK_SLA_UNBOUND",
            "WORK_OWNERSHIP_AMBIGUOUS",
            "WORK_ASSIGNMENT_LOW_EFFICIENCY",
            "WORK_RESPONSE_GUARD_STALE",
            "WORK_RESOLUTION_CONFIDENCE_LOW",
            "WORK_ESCALATION_PRESSURE_HIGH",
            "WORK_QUEUE_HEALTH_DEGRADED",
        ),
        downstream_gate_consumers=(),
        module_bindings=(),
        sensitivity_hooks=("item_age_half_life_hours(type_i)", "queue_health_floor", "reassignment_gain_threshold", "resolution_confidence_floor"),
        schema_touchpoints=(),
        notes=("Secondary operational formula family; do not fold into TrustSummary trust_score semantics.",),
    ),
    FormulaRecordSpec(
        formula_id="trust_currency_and_recalculation",
        label="Trust Currency and Recalculation",
        canonical_section="8.11",
        subsection_titles=(),
        formula_family="core_formula_family",
        output_artifacts=("TrustSummary",),
        output_fields=("lifecycle_state", "superseded_at", "superseded_by_trust_id"),
        inputs=(
            "baseline_submission_state",
            "authority_uncertainty_score",
            "ComputeResult",
            "ParityResult",
            "RiskReport",
            "graph_quality basis",
            "upstream gates",
            "overrides",
            "LateDataMonitorResult",
            "authority-state observation",
            "runtime_scope[]",
        ),
        intermediate_terms=("trust_currency_state", "TRUST_RECALCULATION_REQUIRED"),
        mode_applicability="Applies after synthesis on any filing-capable reuse path, rerun, continuation, replay, or amendment lineage.",
        money_profile_requirements=(),
        determinism_rules=(
            "A trust artifact becomes non-current whenever any listed dependency changes after synthesized_at.",
            "Continuation, rerun, amendment, and replay create new trust artifacts; trust history is append-only lineage.",
        ),
        threshold_dependencies=("authority_review_threshold", "authority_block_threshold"),
        reason_code_emissions=("TRUST_AUTHORITY_STATE_UNRESOLVED", "TRUST_RECALCULATION_REQUIRED"),
        downstream_gate_consumers=("TRUST_GATE", "FILING_GATE", "SUBMISSION_GATE"),
        module_bindings=("CHECK_TRUST_CURRENCY",),
        sensitivity_hooks=("authority_uncertainty_score", "late_data monitor changes", "override lifecycle changes"),
        schema_touchpoints=(repo_rel(TRUST_SCHEMA_PATH), repo_rel(TRUST_INPUT_BASIS_SCHEMA_PATH)),
        notes=("Currency evaluation is fail-closed and lineage-sensitive rather than timestamp-only freshness checking.",),
    ),
    FormulaRecordSpec(
        formula_id="client_flow_reliability_and_completion",
        label="Client-Flow Reliability and Completion",
        canonical_section="8.11A",
        subsection_titles=(
            "Flow-stability score",
            "Upload-confidence score",
            "Recovery posture and viability",
            "Approval-readiness score",
            "Risk-weighted friction score",
            "Completion probability",
        ),
        formula_family="secondary_formula_family",
        output_artifacts=("ClientUploadSession", "ClientApprovalPack", "ClientPortalWorkspace"),
        output_fields=("flow_stability_score", "upload_confidence_score", "recovery_posture_score", "approval_readiness_score", "risk_weighted_friction_score", "completion_probability"),
        inputs=(
            "surface_class",
            "network_posture",
            "freshness_state",
            "interaction_posture",
            "draft_state",
            "focus_anchor_ref",
            "bytes_transferred",
            "byte_count",
            "request_binding_state",
            "integrity_state",
            "malware_scan_state",
            "validation_state",
            "step_up_expires_at",
            "remaining_required_step_count",
            "required_input_count",
            "blocking_wait_seconds",
            "retry_count",
            "external_handoff_count",
        ),
        intermediate_terms=(
            "surface_penalty",
            "network_instability",
            "flow_stability_raw",
            "flow_stability_score",
            "progress_ratio",
            "observed_throughput_bps",
            "eta_seconds",
            "expiry_buffer",
            "binding_factor",
            "resume_success_ratio",
            "integrity_factor",
            "scan_factor",
            "validation_factor",
            "upload_confidence_raw",
            "upload_confidence_score",
            "recovery_mode_class",
            "resume_viability",
            "artifact_currency",
            "locality_factor",
            "preservation_factor",
            "recovery_posture_score",
            "approval_readiness_raw",
            "approval_readiness_score",
            "step_burden",
            "input_burden",
            "wait_burden",
            "retry_burden",
            "handoff_burden",
            "risk_justification",
            "raw_friction",
            "friction_allowance",
            "avoidable_friction",
            "risk_weighted_friction_score",
            "hazard_j",
            "completion_probability",
        ),
        mode_applicability="Secondary client and portal reliability family; normative for governed UX artifacts but must remain distinct from filing trust.",
        money_profile_requirements=(),
        determinism_rules=(
            "These metrics are materialized onto governed client artifacts rather than recomputed ad hoc in renderers.",
            "Successful client continuity actions must not decrease flow_stability_score absent exogenous state changes.",
        ),
        threshold_dependencies=("client_flow_thresholds", "upload_confidence_thresholds", "recovery_posture_mapping", "approval_readiness_thresholds", "completion_probability_thresholds"),
        reason_code_emissions=(
            "FLOW_STABILITY_LOW",
            "UPLOAD_CONFIDENCE_LOW",
            "UPLOAD_RESUME_EXPIRING",
            "UPLOAD_BINDING_STALE",
            "UPLOAD_INTEGRITY_FAILED",
            "APPROVAL_READINESS_LOW",
            "APPROVAL_VIEW_STALE",
            "APPROVAL_STEP_UP_EXPIRED",
            "FRICTION_EXCESSIVE",
            "COMPLETION_RISK_HIGH",
        ),
        downstream_gate_consumers=(),
        module_bindings=(),
        sensitivity_hooks=("portal_reliability_profile_ref", "surface_class", "network_posture", "risk_justification"),
        schema_touchpoints=(),
        notes=("Secondary governed-client formula family; its outputs should not be mistaken for filing trust or gate semantics.",),
    ),
    FormulaRecordSpec(
        formula_id="formula_reason_code_emission",
        label="Formula Reason-Code Emission",
        canonical_section="8.12",
        subsection_titles=(),
        formula_family="reason_code_contract",
        output_artifacts=("TrustSummary", "DecisionExplainabilityContract"),
        output_fields=("reason_codes", "dominant_reason_code", "plain_summary", "decision_constraint_codes", "decision_explainability_contract"),
        inputs=("matched thresholds", "matched caps", "freshness state", "admissibility state", "trust posture"),
        intermediate_terms=("compressed_reason_codes", "suppressed_reason_count", "semantic_qualifiers"),
        mode_applicability="Applies whenever formula outcomes materially affect trust posture, automation, or filing readiness.",
        money_profile_requirements=(),
        determinism_rules=(
            "TrustSummary.reason_codes preserves the terminal band code together with every applicable penalty or cap code.",
            "dominant_reason_code is the first reason in the frozen trust priority order corresponding to the decisive cap or blocker.",
            "decision_explainability_contract reuses the same ordered reason basis without local recomputation.",
        ),
        threshold_dependencies=("trust_band_reason_codes", "decision_explainability_contract"),
        reason_code_emissions=(
            "DQ_LOW_COMPLETENESS",
            "DQ_LOW_QUALITY",
            "DQ_INVALID_ERROR_BUDGET",
            "DQ_CONFIDENCE_WEIGHT_INVALID",
            "DQ_WEIGHT_PROFILE_INVALID",
            "PARITY_NOT_REQUIRED_NO_AUTHORITY_BASIS",
            "PARITY_MINOR_DIFFERENCE",
            "PARITY_MATERIAL_DIFFERENCE",
            "PARITY_BLOCKING_DIFFERENCE",
            "PARITY_NOT_COMPARABLE",
            "PARITY_PARTIAL_COVERAGE",
            "PARITY_COMPARISON_SET_INVALID",
            "RISK_WEIGHT_PROFILE_INVALID",
            "RISK_MATERIAL_FLAG",
            "RISK_BLOCKING_FLAG",
            "GRAPH_LOW_COVERAGE",
            "GRAPH_HIGH_INFERENCE",
            "GRAPH_WEIGHT_PROFILE_INVALID",
            "TRUST_INPUT_INCOMPLETE",
            "TRUST_INPUT_STALE",
            "TRUST_INPUT_CONTRADICTION",
            "TRUST_OVERRIDE_INVALID",
            "TRUST_THRESHOLD_EDGE_REVIEW",
            "TRUST_RECALCULATION_REQUIRED",
            "TRUST_OVERRIDE_PENALTY",
            "TRUST_RETENTION_PENALTY",
            "TRUST_AUTHORITY_PENALTY",
            "TRUST_AUTHORITY_CONFIDENCE_LOW",
            "TRUST_AUTHORITY_AMBIGUITY_HIGH",
            "TRUST_AUTHORITY_STATE_STALE",
            "TRUST_AUTHORITY_STATE_UNRESOLVED",
            "TRUST_AMENDMENT_FRESHNESS_STALE",
            "WORK_SLA_UNBOUND",
            "WORK_OWNERSHIP_AMBIGUOUS",
            "WORK_ASSIGNMENT_LOW_EFFICIENCY",
            "WORK_ESCALATION_PRESSURE_HIGH",
            "WORK_QUEUE_HEALTH_DEGRADED",
            "WORK_RESPONSE_GUARD_STALE",
            "WORK_RESOLUTION_CONFIDENCE_LOW",
            "TRUST_RETROACTIVE_IMPACT_UNRESOLVED",
            "TRUST_ANALYSIS_MODE_CAP",
            "TRUST_BLOCKING_RISK",
            "TRUST_REQUIRED_HUMAN_STEPS",
            "FLOW_STABILITY_LOW",
            "UPLOAD_CONFIDENCE_LOW",
            "UPLOAD_RESUME_EXPIRING",
            "UPLOAD_BINDING_STALE",
            "UPLOAD_INTEGRITY_FAILED",
            "APPROVAL_READINESS_LOW",
            "APPROVAL_VIEW_STALE",
            "APPROVAL_STEP_UP_EXPIRED",
            "FRICTION_EXCESSIVE",
            "COMPLETION_RISK_HIGH",
            "TRUST_AUTOMATION_LIMITED",
            "TRUST_UPSTREAM_GATE_BLOCK",
            "TRUST_UPSTREAM_GATE_REVIEW_REQUIRED",
            "TRUST_UPSTREAM_GATE_NOTICE_ACTIVE",
            "TRUST_GREEN",
            "TRUST_AMBER",
            "TRUST_RED",
            "TRUST_INSUFFICIENT_DATA",
        ),
        downstream_gate_consumers=("TRUST_GATE", "FILING_GATE"),
        module_bindings=("BUILD_GATE_EXPLANATION", "SYNTHESIZE_TRUST", "TRUST_GATE"),
        sensitivity_hooks=("cap_driver_reason_codes[]", "edge_trigger_codes[]", "decision_constraint_codes[]"),
        schema_touchpoints=(repo_rel(TRUST_SCHEMA_PATH),),
        notes=("Reason-code emission is normative semantics, not a renderer-local narration layer.",),
    ),
    FormulaRecordSpec(
        formula_id="formula_layer_summary",
        label="Formula Layer Summary",
        canonical_section="8.13",
        subsection_titles=(),
        formula_family="summary_anchor",
        output_artifacts=("TrustSummary",),
        output_fields=("trust posture",),
        inputs=("evidence quality", "compute outputs", "authority comparison", "graph defensibility", "override reliance"),
        intermediate_terms=(),
        mode_applicability="Summary anchor spanning both modes.",
        money_profile_requirements=(),
        determinism_rules=("This section is a prose summary anchor for the full formula layer and keeps the implementation package tied to the source’s one-sentence scope claim.",),
        threshold_dependencies=(),
        reason_code_emissions=(),
        downstream_gate_consumers=("TRUST_GATE", "FILING_GATE", "AMENDMENT_GATE"),
        module_bindings=("SYNTHESIZE_TRUST",),
        sensitivity_hooks=(),
        schema_touchpoints=(repo_rel(TRUST_SCHEMA_PATH),),
        notes=("Summary-only numbered section included to keep numbered-section coverage exact.",),
    ),
]

DEPENDENCY_SPECS = [
    DependencySpec("standard_normalization_rules", "data_quality_and_completeness", "shared_helper", "Shared clamping and stable summation govern domain scoring."),
    DependencySpec("standard_normalization_rules", "record_and_adjustment_compute", "shared_helper", "Money rounding and exact-decimal aggregation boundary rules govern compute."),
    DependencySpec("standard_normalization_rules", "forecast", "shared_helper", "Forecast point and Monte Carlo outputs use round_money and deterministic seed handling."),
    DependencySpec("standard_normalization_rules", "risk_scoring", "shared_helper", "round_score and clamp01 normalize risk."),
    DependencySpec("standard_normalization_rules", "per_field_parity", "shared_helper", "Exact-decimal delta handling and minimum floors rely on normalization helpers."),
    DependencySpec("standard_normalization_rules", "evidence_graph_quality", "shared_helper", "safe_unit and stable ordering control graph-path quality."),
    DependencySpec("standard_normalization_rules", "trust_scoring_bands_and_readiness", "shared_helper", "clamp100, round_score, and safe_unit normalize trust synthesis."),
    DependencySpec("standard_normalization_rules", "collaboration_orchestration_queue_routing", "shared_helper", "half_life_score, sigmoid, and min_non_null are reused by work routing."),
    DependencySpec("standard_normalization_rules", "client_flow_reliability_and_completion", "shared_helper", "Client-flow reliability reuses shared helpers plus additional UX-specific helpers."),
    DependencySpec("record_and_adjustment_compute", "forecast", "artifact_feed", "Forecast consumes compute baseline totals and run-rate context."),
    DependencySpec("record_and_adjustment_compute", "parity_comparison_set_construction", "artifact_feed", "Parity comparison basis starts from frozen compute outputs."),
    DependencySpec("record_and_adjustment_compute", "trustsummary_artifact_binding", "artifact_feed", "ComputeResult is a required TrustSummary input artifact."),
    DependencySpec("risk_scoring", "trust_scoring_bands_and_readiness", "score_feed", "Trust uses risk_score and unresolved risk flags."),
    DependencySpec("aggregate_parity", "trust_scoring_bands_and_readiness", "score_feed", "Trust uses parity_score and comparison requirement posture."),
    DependencySpec("evidence_graph_quality", "trust_scoring_bands_and_readiness", "score_feed", "Trust uses graph_quality_score and retention penalty posture."),
    DependencySpec("data_quality_and_completeness", "trust_scoring_bands_and_readiness", "score_feed", "Trust uses data_quality_score and completeness_score."),
    DependencySpec("trust_authority_uncertainty", "trust_input_admissibility_and_basis", "state_feed", "Authority uncertainty contributes to basis ceilings."),
    DependencySpec("trust_input_admissibility_and_basis", "trust_scoring_bands_and_readiness", "hard_ceiling", "Basis ceilings cap automation and filing readiness before score math."),
    DependencySpec("trust_upstream_gate_cap", "trust_scoring_bands_and_readiness", "hard_ceiling", "Upstream gates cap legal progression even when the numeric score is green."),
    DependencySpec("trust_scoring_bands_and_readiness", "formula_reason_code_emission", "reason_contract", "Trust posture generates dominant and constrained reason-code packets."),
    DependencySpec("formula_reason_code_emission", "trustsummary_artifact_binding", "artifact_feed", "Reason codes and explainability are persisted on TrustSummary."),
    DependencySpec("trust_scoring_bands_and_readiness", "trust_currency_and_recalculation", "currency_guard", "Trust reuse depends on the persisted trust basis and score/cap posture remaining current."),
    DependencySpec("trust_currency_and_recalculation", "trustsummary_artifact_binding", "lifecycle_feed", "Supersession and append-only lineage update the TrustSummary lifecycle boundary."),
    DependencySpec("aggregate_parity", "trust_upstream_gate_cap", "gate_intersection", "Parity gate posture contributes to the frozen upstream cap before trust gating."),
    DependencySpec("data_quality_and_completeness", "trust_upstream_gate_cap", "gate_intersection", "Data-quality gate posture can force review or block before trust."),
    DependencySpec("evidence_graph_quality", "trust_upstream_gate_cap", "gate_intersection", "Retention evidence gate posture contributes to upstream legal ceilings."),
    DependencySpec("trust_scoring_bands_and_readiness", "formula_layer_summary", "summary", "The summary section compresses the full trust package into one scope statement."),
]

THRESHOLD_GROUPS = [
    {
        "threshold_id": "data_quality_freshness_scale",
        "formula_ids": ["data_quality_and_completeness"],
        "kind": "ordered_scalar_map",
        "values": {"expired": 0, "unknown": 0.25, "stale": 0.5, "current": 1},
        "source_refs": [line_ref(repo_rel(FORMULA_SOURCE_PATH), 127, "freshness_d")],
        "notes": ["Freshness is a frozen discrete scale, not a free-form interpolation."],
    },
    {
        "threshold_id": "dq_structural_fail_closed_conditions",
        "formula_ids": ["data_quality_and_completeness"],
        "kind": "fail_closed_conditions",
        "values": [
            "DQ_INVALID_ERROR_BUDGET",
            "DQ_CONFIDENCE_WEIGHT_INVALID",
            "DQ_WEIGHT_PROFILE_INVALID",
            "LIMITATION_SILENT_AMBIGUITY on filing-critical domain or profile",
        ],
        "source_refs": [line_ref(repo_rel(FORMULA_SOURCE_PATH), 203, "dq_structural_failures")],
        "notes": ["Structural scoring failures must fail DATA_QUALITY_GATE closed."],
    },
    {
        "threshold_id": "quarterly_basis_enum",
        "formula_ids": ["record_and_adjustment_compute"],
        "kind": "enum",
        "values": ["PERIODIC", "CUMULATIVE"],
        "source_refs": [line_ref(repo_rel(FORMULA_SOURCE_PATH), 254, "quarterly_basis")],
        "notes": ["Quarterly totals remain record-layer only under both profiles."],
    },
    {
        "threshold_id": "risk_blocking_thresholds",
        "formula_ids": ["risk_scoring", "trust_scoring_bands_and_readiness"],
        "kind": "profile_thresholds",
        "values": {
            "material_threshold_m": "feature-specific in (0,1]",
            "blocking_threshold_m": "feature-specific in [material_threshold_m,1]",
            "risk_guard_band": 2,
            "risk_automation_guard_trigger": "risk_score >= 40 blocks green automation margin",
        },
        "source_refs": [
            line_ref(repo_rel(FORMULA_SOURCE_PATH), 348, "material_threshold_m"),
            line_ref(repo_rel(FORMULA_SOURCE_PATH), 951, "risk_guard_band"),
        ],
        "notes": ["Risk thresholds come from the frozen risk profile and trust guard bands."],
    },
    {
        "threshold_id": "comparison_requirement_enum",
        "formula_ids": ["parity_comparison_set_construction", "aggregate_parity", "trust_scoring_bands_and_readiness"],
        "kind": "enum",
        "values": ["MANDATORY", "DESIRABLE", "NOT_REQUIRED"],
        "source_refs": [line_ref(repo_rel(FORMULA_SOURCE_PATH), 441, "comparison_requirement")],
        "notes": ["Comparison requirement determines whether missing authority basis is fail-closed or a bounded fallback."],
    },
    {
        "threshold_id": "parity_field_class_thresholds",
        "formula_ids": ["per_field_parity"],
        "kind": "band_thresholds",
        "values": {
            "match_lt": 0.25,
            "minor_lt": 1.0,
            "material_lt": 2.5,
            "blocking_gte": 2.5,
            "blocking_ratio_cap_default": 3.0,
        },
        "source_refs": [
            line_ref(repo_rel(FORMULA_SOURCE_PATH), 483, "blocking_ratio_cap"),
            line_ref(repo_rel(FORMULA_SOURCE_PATH), 499, "per_field_classification"),
        ],
        "notes": ["Threshold-edge replay depends on persisted threshold and floor inputs per fieldDelta."],
    },
    {
        "threshold_id": "parity_aggregate_thresholds",
        "formula_ids": ["aggregate_parity"],
        "kind": "band_thresholds",
        "values": {
            "coverage_full_required": 1,
            "material_pressure_gte": 1.0,
            "minor_pressure_gte": 0.25,
        },
        "source_refs": [line_ref(repo_rel(FORMULA_SOURCE_PATH), 554, "aggregate_parity_classification")],
        "notes": ["Classification uses a strict precedence ladder above the raw score."],
    },
    {
        "threshold_id": "graph_survivability_minima",
        "formula_ids": ["evidence_graph_quality"],
        "kind": "named_thresholds",
        "values": {"submit_survivability_min": 0.8, "review_survivability_min": 0.45, "audit_survivability_min": 0.15},
        "source_refs": [line_ref(repo_rel(FORMULA_SOURCE_PATH), 642, "graph_survivability_minima")],
        "notes": ["These minima drive fail-closed caps rather than advisory annotations."],
    },
    {
        "threshold_id": "graph_quality_fail_closed_caps",
        "formula_ids": ["evidence_graph_quality"],
        "kind": "ordered_caps",
        "values": {
            "silent_ambiguity_ratio_gt_0": 29,
            "contradicted_target": 39,
            "unsupported_target": 49,
            "open_closure": 59,
            "missing_proof_bundle_or_explanation_failure": 69,
            "nonreplayable_or_low_review_survivability": 69,
            "stale_or_low_submit_survivability": 79,
        },
        "source_refs": [line_ref(repo_rel(FORMULA_SOURCE_PATH), 646, "graph_quality_caps")],
        "notes": ["Graph caps are explicit legal/defensibility ceilings, not derived from raw score percentiles."],
    },
    {
        "threshold_id": "authority_review_threshold",
        "formula_ids": ["trust_authority_uncertainty", "trust_input_admissibility_and_basis", "trust_scoring_bands_and_readiness", "trust_currency_and_recalculation"],
        "kind": "numeric",
        "values": {"review_limit": 35},
        "source_refs": [line_ref(repo_rel(FORMULA_SOURCE_PATH), 761, "authority_review_threshold")],
        "notes": ["35 is both a reason-code threshold and a live-progression review cap trigger."],
    },
    {
        "threshold_id": "authority_block_threshold",
        "formula_ids": ["trust_input_admissibility_and_basis", "trust_scoring_bands_and_readiness", "trust_currency_and_recalculation"],
        "kind": "numeric",
        "values": {"block_limit": 70},
        "source_refs": [
            line_ref(repo_rel(FORMULA_SOURCE_PATH), 834, "authority_progression_block"),
            line_ref(repo_rel(FORMULA_SOURCE_PATH), 1004, "authority_cap_band_red"),
        ],
        "notes": ["70 blocks live authority progression and trust-stage automation."],
    },
    {
        "threshold_id": "trust_input_state_enum",
        "formula_ids": ["trustsummary_artifact_binding", "trust_input_admissibility_and_basis", "trust_scoring_bands_and_readiness"],
        "kind": "enum",
        "values": ["ADMISSIBLE_CURRENT", "ADMISSIBLE_STALE", "INCOMPLETE", "CONTRADICTED"],
        "source_refs": [
            line_ref(repo_rel(FORMULA_SOURCE_PATH), 26, "trust_input_state_binding"),
            line_ref(repo_rel(FORMULA_SOURCE_PATH), 795, "trust_input_state"),
        ],
        "notes": ["Trust input state stays distinct from score bands and automation/readiness."],
    },
    {
        "threshold_id": "upstream_gate_cap_enum",
        "formula_ids": ["trustsummary_artifact_binding", "trust_upstream_gate_cap", "trust_scoring_bands_and_readiness"],
        "kind": "enum",
        "values": ["AUTO_ELIGIBLE", "NOTICE_ONLY", "REVIEW_ONLY", "BLOCKED"],
        "source_refs": [
            line_ref(repo_rel(FORMULA_SOURCE_PATH), 43, "upstream_gate_cap_binding"),
            line_ref(repo_rel(FORMULA_SOURCE_PATH), 875, "upstream_gate_cap"),
        ],
        "notes": ["Legal progression cannot exceed this frozen upstream cap."],
    },
    {
        "threshold_id": "trust_score_bands",
        "formula_ids": ["trustsummary_artifact_binding", "trust_scoring_bands_and_readiness"],
        "kind": "band_thresholds",
        "values": {"green_gte": 85, "amber_gte": 65, "red_lt": 65},
        "source_refs": [line_ref(repo_rel(FORMULA_SOURCE_PATH), 943, "score_band")],
        "notes": ["score_band is numeric-only and separate from cap-band restrictions."],
    },
    {
        "threshold_id": "trust_guard_bands",
        "formula_ids": ["trust_scoring_bands_and_readiness"],
        "kind": "guard_bands",
        "values": {
            "green_guard_band": 2,
            "amber_guard_band": 2,
            "risk_guard_band": 2,
            "completeness_guard_band": 3,
            "graph_guard_band": 3,
            "authority_allow_guard_band": 2,
            "authority_review_guard_band": 2,
            "authority_block_guard_band": 2,
        },
        "source_refs": [line_ref(repo_rel(FORMULA_SOURCE_PATH), 949, "trust_guard_bands")],
        "notes": ["Exact guard-band constants must be frozen into the trust sensitivity contract."],
    },
    {
        "threshold_id": "threshold_stability_enum",
        "formula_ids": ["trustsummary_artifact_binding", "trust_scoring_bands_and_readiness"],
        "kind": "enum",
        "values": ["STABLE", "EDGE_REVIEW"],
        "source_refs": [
            line_ref(repo_rel(FORMULA_SOURCE_PATH), 29, "threshold_stability_binding"),
            line_ref(repo_rel(FORMULA_SOURCE_PATH), 970, "threshold_stability_state"),
        ],
        "notes": ["Threshold stability is persisted independently of score band."],
    },
    {
        "threshold_id": "trust_edge_trigger_enum",
        "formula_ids": ["trust_scoring_bands_and_readiness"],
        "kind": "enum",
        "values": TRUST_EDGE_TRIGGER_ENUM,
        "source_refs": [line_ref(repo_rel(FORMULA_SOURCE_PATH), 985, "edge_trigger_codes")],
        "notes": ["These codes serialize the active threshold surface directly into the sensitivity contract."],
    },
    {
        "threshold_id": "trust_cap_band_rules",
        "formula_ids": ["trustsummary_artifact_binding", "trust_scoring_bands_and_readiness"],
        "kind": "ordered_band_rules",
        "values": {
            "cap_band_enum": ["INSUFFICIENT_DATA", "RED", "AMBER", "GREEN"],
            "severity_order": ["GREEN", "AMBER", "RED", "INSUFFICIENT_DATA"],
            "insufficient_data_conditions": [
                "trust_input_state in {INCOMPLETE, CONTRADICTED}",
                "missing required evidence/authority link/comparison/baseline or silent limitation ambiguity",
                "completeness_score < 60",
                "filing-capable run and graph_quality_score < 50",
            ],
            "red_conditions": [
                "unresolved_blocking_risk_flag = true",
                "upstream_gate_cap = BLOCKED",
                "live_authority_progression_requested and authority_uncertainty_score >= 70",
            ],
            "amber_conditions": [
                "execution_mode = ANALYSIS",
                "trust_input_state = ADMISSIBLE_STALE",
                "threshold_stability_state = EDGE_REVIEW",
                "risk_automation_margin < risk_guard_band",
                "upstream_gate_cap = REVIEW_ONLY",
                "required_human_steps_count > 0",
                "active_filing_critical_override_count > 0",
                "critical_retention_limited_count > 0",
                "unresolved_material_blocking_risk_flag = true",
                "live_authority_progression_requested and authority_uncertainty_score >= 35",
                "baseline_submission_state in {UNKNOWN, OUT_OF_BAND_UNRECONCILED}",
            ],
        },
        "source_refs": [line_ref(repo_rel(FORMULA_SOURCE_PATH), 996, "cap_band")],
        "notes": ["cap_band captures non-score legal and operational ceilings."],
    },
    {
        "threshold_id": "automation_level_enum",
        "formula_ids": ["trustsummary_artifact_binding", "trust_input_admissibility_and_basis", "trust_scoring_bands_and_readiness"],
        "kind": "enum",
        "values": ["ALLOWED", "LIMITED", "BLOCKED"],
        "source_refs": [
            line_ref(repo_rel(FORMULA_SOURCE_PATH), 52, "automation_level_binding"),
            line_ref(repo_rel(FORMULA_SOURCE_PATH), 1046, "automation_level"),
        ],
        "notes": ["automation_level is a trust-layer capability summary, not an unattended-action permit by itself."],
    },
    {
        "threshold_id": "filing_readiness_enum",
        "formula_ids": ["trustsummary_artifact_binding", "trust_input_admissibility_and_basis", "trust_scoring_bands_and_readiness"],
        "kind": "enum",
        "values": ["NOT_READY", "READY_REVIEW", "READY_TO_SUBMIT"],
        "source_refs": [
            line_ref(repo_rel(FORMULA_SOURCE_PATH), 53, "filing_readiness_binding"),
            line_ref(repo_rel(FORMULA_SOURCE_PATH), 1103, "filing_readiness"),
        ],
        "notes": ["The readiness bridge is exact and rank-preserving relative to automation_level."],
    },
    {
        "threshold_id": "analysis_mode_cap",
        "formula_ids": ["trust_scoring_bands_and_readiness"],
        "kind": "hard_caps",
        "values": {
            "max_trust_band": "AMBER",
            "max_automation_level": "LIMITED",
            "max_filing_readiness": "READY_REVIEW",
            "reason_code": "TRUST_ANALYSIS_MODE_CAP",
        },
        "source_refs": [line_ref(repo_rel(FORMULA_SOURCE_PATH), 1121, "analysis_mode_cap")],
        "notes": ["ANALYSIS mode can compute trust posture but cannot publish greener machine progression."],
    },
    {
        "threshold_id": "amendment_freshness_caps",
        "formula_ids": ["trust_scoring_bands_and_readiness"],
        "kind": "hard_caps",
        "values": {
            "automation_level_max": "LIMITED",
            "filing_readiness_max": "READY_REVIEW",
            "predicates": [
                "same DriftBaselineEnvelope.frozen_hash",
                "no widened difference_classes or filing-critical deltas",
                "no widened RetroactiveImpactAnalysis",
                "no provider-profile or amendment-window change",
            ],
        },
        "source_refs": [line_ref(repo_rel(FORMULA_SOURCE_PATH), 1139, "amendment_freshness_caps")],
        "notes": ["Amendment freshness and retroactive caps are part of trust semantics, not post-hoc decoration."],
    },
    {
        "threshold_id": "work_priority_base_map",
        "formula_ids": ["collaboration_orchestration_queue_routing"],
        "kind": "ordered_scalar_map",
        "values": {"LOW": 0.15, "NORMAL": 0.35, "HIGH": 0.6, "URGENT": 0.8, "CRITICAL": 1.0},
        "source_refs": [line_ref(repo_rel(FORMULA_SOURCE_PATH), 1168, "priority_base_i")],
        "notes": ["Operational routing still uses frozen scalars rather than UI-local sort weights."],
    },
    {
        "threshold_id": "work_resolution_caps",
        "formula_ids": ["collaboration_orchestration_queue_routing"],
        "kind": "ordered_caps",
        "values": {
            "response_or_lane_integrity_zero": 39,
            "next_action_clarity_zero": 49,
            "unassigned_item": 69,
        },
        "source_refs": [line_ref(repo_rel(FORMULA_SOURCE_PATH), 1234, "resolution_confidence_caps")],
        "notes": ["Resolution confidence caps are fail-closed and deterministic."],
    },
    {
        "threshold_id": "queue_health_floor",
        "formula_ids": ["collaboration_orchestration_queue_routing"],
        "kind": "profile_threshold",
        "values": {"queue_health_floor": "profile-defined"},
        "source_refs": [line_ref(repo_rel(FORMULA_SOURCE_PATH), 1294, "queue_health_floor")],
        "notes": ["Queue-health floors come from the frozen collaboration routing profile."],
    },
    {
        "threshold_id": "client_flow_thresholds",
        "formula_ids": ["client_flow_reliability_and_completion"],
        "kind": "thresholds",
        "values": {"flow_stability_unstable_lt": 60},
        "source_refs": [line_ref(repo_rel(FORMULA_SOURCE_PATH), 1432, "flow_stability_threshold")],
        "notes": ["Flow stability under 60 implies unstable mutation posture unless recovery is the only live mutation."],
    },
    {
        "threshold_id": "upload_confidence_thresholds",
        "formula_ids": ["client_flow_reliability_and_completion"],
        "kind": "hard_overrides",
        "values": {
            "submit_attach_minimum": 70,
            "attached_minimum": 85,
            "binding_superseded_maximum": 25,
            "integrity_failed": 0,
            "malware_quarantined": 0,
        },
        "source_refs": [line_ref(repo_rel(FORMULA_SOURCE_PATH), 1463, "upload_confidence_overrides")],
        "notes": ["Upload confidence drives governed CTA eligibility, not just a visual confidence meter."],
    },
    {
        "threshold_id": "recovery_posture_mapping",
        "formula_ids": ["client_flow_reliability_and_completion"],
        "kind": "ordered_mapping",
        "values": {
            "INLINE_RESUME": ">= 85 and no guard mismatch",
            "RECONFIRM_INLINE": "65-84 with in-place rebase or rebinding path",
            "STALE_REVIEW_REQUIRED": "40-64",
            "STEP_UP_RETRY": "only blocker is step-up proof",
            "HARD_RESET_REQUIRED": "re-upload or restart required",
            "SUPPORT_REQUIRED": "self-recovery unsafe",
        },
        "source_refs": [line_ref(repo_rel(FORMULA_SOURCE_PATH), 1512, "recovery_posture_mapping")],
        "notes": ["Published recovery posture must equal the deterministic posture derived from blocker state."],
    },
    {
        "threshold_id": "approval_readiness_thresholds",
        "formula_ids": ["client_flow_reliability_and_completion"],
        "kind": "hard_overrides",
        "values": {
            "sign_now_minimum": 85,
            "step_up_expired_maximum": 40,
            "superseded_or_expired": 0,
        },
        "source_refs": [line_ref(repo_rel(FORMULA_SOURCE_PATH), 1543, "approval_readiness_overrides")],
        "notes": ["Approval-readiness thresholds are governed control limits, not UI convenience copy."],
    },
    {
        "threshold_id": "completion_probability_thresholds",
        "formula_ids": ["client_flow_reliability_and_completion"],
        "kind": "band_thresholds",
        "values": {"save_or_help_lt": 0.4, "review_affordance_lt": 0.7, "completion_cta_gte": 0.7},
        "source_refs": [line_ref(repo_rel(FORMULA_SOURCE_PATH), 1596, "completion_probability_thresholds")],
        "notes": ["Completion thresholds govern CTA posture under legal reversibility constraints."],
    },
]

PLANNED_TEST_VECTORS = [
    {
        "planned_vector_id": "FORMULA-DQ-01",
        "formula_ids": ["data_quality_and_completeness"],
        "coverage_status": "planned_from_source_gap",
        "scenario": "Zero-sum domain-weight profile forces completeness_score = 0 and data_quality_score = 0 with DQ_WEIGHT_PROFILE_INVALID.",
        "expected_reason_codes": ["DQ_WEIGHT_PROFILE_INVALID"],
    },
    {
        "planned_vector_id": "FORMULA-DQ-02",
        "formula_ids": ["data_quality_and_completeness"],
        "coverage_status": "planned_from_source_gap",
        "scenario": "Projection-side confidence remains lower than or equal to decision-side confidence and never feeds trust scoring.",
        "expected_reason_codes": ["PRIVACY_PROJECTION_RATIO_INVALID", "LIMITATION_SILENT_AMBIGUITY"],
    },
    {
        "planned_vector_id": "FORMULA-COMPUTE-01",
        "formula_ids": ["record_and_adjustment_compute"],
        "coverage_status": "planned_from_source_gap",
        "scenario": "Compliance compute rejects requested-scope widening and uses executable reporting scope only.",
        "expected_reason_codes": [],
    },
    {
        "planned_vector_id": "FORMULA-FORECAST-01",
        "formula_ids": ["forecast"],
        "coverage_status": "planned_from_source_gap",
        "scenario": "Forecast Monte Carlo seed stays deterministic under the same frozen profile and scenario_id.",
        "expected_reason_codes": [],
    },
    {
        "planned_vector_id": "FORMULA-RISK-01",
        "formula_ids": ["risk_scoring"],
        "coverage_status": "planned_from_source_gap",
        "scenario": "Zero-sum risk profile fails closed to risk_score = 100 with unresolved blocking posture.",
        "expected_reason_codes": ["RISK_WEIGHT_PROFILE_INVALID"],
    },
    {
        "planned_vector_id": "FORMULA-PARITY-01",
        "formula_ids": ["parity_comparison_set_construction", "per_field_parity", "aggregate_parity"],
        "coverage_status": "planned_from_source_gap",
        "scenario": "Invalid comparison-set construction persists NOT_COMPARABLE with PARITY_COMPARISON_SET_INVALID and zero coverage/score.",
        "expected_reason_codes": ["PARITY_COMPARISON_SET_INVALID"],
    },
    {
        "planned_vector_id": "FORMULA-GRAPH-01",
        "formula_ids": ["evidence_graph_quality"],
        "coverage_status": "planned_from_source_gap",
        "scenario": "Silent ambiguity on a filing-critical target caps graph quality below filing-capable posture.",
        "expected_reason_codes": ["GRAPH_LOW_COVERAGE"],
    },
    {
        "planned_vector_id": "FORMULA-WORK-01",
        "formula_ids": ["collaboration_orchestration_queue_routing"],
        "coverage_status": "planned_from_source_gap",
        "scenario": "No eligible assignee and stale guard vectors lower ownership and resolution confidence without mutating trust.",
        "expected_reason_codes": ["WORK_OWNERSHIP_AMBIGUOUS", "WORK_RESPONSE_GUARD_STALE"],
    },
    {
        "planned_vector_id": "FORMULA-CLIENT-01",
        "formula_ids": ["client_flow_reliability_and_completion"],
        "coverage_status": "planned_from_source_gap",
        "scenario": "Superseded upload binding and expired approval step-up fail closed on governed CTA posture.",
        "expected_reason_codes": ["UPLOAD_BINDING_STALE", "APPROVAL_STEP_UP_EXPIRED"],
    },
]


def find_vector_source_refs(vector_ids: Iterable[str]) -> dict[str, str]:
    refs: dict[str, str] = {}
    for line_number, line in enumerate(TEST_VECTORS_PATH.read_text().splitlines(), start=1):
        match = re.match(r"^##\s+(TV-[0-9A-Z]+):", line)
        if match and match.group(1) in vector_ids:
            refs[match.group(1)] = line_ref(repo_rel(TEST_VECTORS_PATH), line_number, match.group(1))
    return refs


def build_formula_records() -> list[dict[str, Any]]:
    _, top_blocks = parse_blocks(FORMULA_SOURCE_PATH)
    flat_blocks = flatten_blocks(top_blocks)
    sections = {block.section_id: block for block in flat_blocks if block.level == 2 and block.section_id}
    module_index = load_module_index()
    gate_index = load_gate_index()
    records: list[dict[str, Any]] = []
    for spec in FORMULA_RECORD_SPECS:
        section_block = sections[spec.canonical_section]
        scoped_blocks = [section_block]
        if spec.subsection_titles:
            scoped_blocks = [find_subsection_block(section_block, title) for title in spec.subsection_titles]
        formula_symbols = extract_formula_symbols(scoped_blocks)
        extracted_reason_codes = extract_reason_codes(scoped_blocks)
        reason_codes = ordered_unique(list(spec.reason_code_emissions) + extracted_reason_codes)
        source_refs = block_source_refs(section_block, scoped_blocks)
        records.append(
            {
                "formula_id": spec.formula_id,
                "label": spec.label,
                "formula_family": spec.formula_family,
                "canonical_section": spec.canonical_section,
                "section_title": section_block.section_title,
                "subsection_titles": list(spec.subsection_titles),
                "inputs": list(spec.inputs),
                "intermediate_terms": list(spec.intermediate_terms),
                "output_fields": list(spec.output_fields),
                "output_artifacts": list(spec.output_artifacts),
                "mode_applicability": spec.mode_applicability,
                "money_profile_requirements": list(spec.money_profile_requirements),
                "determinism_rules": list(spec.determinism_rules),
                "threshold_dependencies": list(spec.threshold_dependencies),
                "reason_code_emissions": reason_codes,
                "downstream_gate_consumers": list(spec.downstream_gate_consumers),
                "sensitivity_hooks": list(spec.sensitivity_hooks),
                "source_refs": source_refs,
                "notes": list(spec.notes),
                "formula_symbols": formula_symbols,
                "module_bindings": module_binding_rows(spec.module_bindings, module_index),
                "gate_bindings": gate_binding_rows(spec.downstream_gate_consumers, gate_index),
                "schema_touchpoints": list(spec.schema_touchpoints),
                "source_span": {
                    "section_start_line": section_block.start_line,
                    "section_end_line": section_block.end_line,
                    "subsection_start_lines": {block.title: block.start_line for block in scoped_blocks if block is not section_block},
                },
            }
        )
    return records


def build_dependency_rows() -> list[dict[str, Any]]:
    return [
        {
            "source_formula_id": spec.source_formula_id,
            "target_formula_id": spec.target_formula_id,
            "dependency_kind": spec.dependency_kind,
            "rationale": spec.rationale,
        }
        for spec in DEPENDENCY_SPECS
    ]


def build_threshold_registry() -> dict[str, Any]:
    return {
        "contract_version": "FORMULA_THRESHOLDS_V1",
        "groups": THRESHOLD_GROUPS,
        "summary": {
            "group_count": len(THRESHOLD_GROUPS),
            "trust_edge_trigger_enum": TRUST_EDGE_TRIGGER_ENUM,
            "trust_probe_order": TRUST_PROBE_ORDER,
            "core_threshold_group_count": sum(
                1 for group in THRESHOLD_GROUPS if all(formula_id not in {"collaboration_orchestration_queue_routing", "client_flow_reliability_and_completion"} for formula_id in group["formula_ids"])
            ),
            "secondary_threshold_group_count": sum(
                1 for group in THRESHOLD_GROUPS if any(formula_id in {"collaboration_orchestration_queue_routing", "client_flow_reliability_and_completion"} for formula_id in group["formula_ids"])
            ),
        },
    }


def build_money_contract() -> dict[str, Any]:
    return {
        "contract_version": "FORMULA_MONEY_AND_ROUNDING_V1",
        "primary_section": "8.2",
        "money_profile_fields": [
            "currency_code",
            "scale",
            "rounding_mode",
            "aggregation_boundary",
            "serialization_profile",
        ],
        "hard_rules": [
            "money is accumulated in exact fixed-scale decimal arithmetic in the smallest legal currency unit",
            "binary floating-point is forbidden for money-bearing sums, deltas, threshold checks, and parity breach checks",
            "rounding occurs only at declared aggregation boundaries",
            "all persisted money values serialize as canonical decimal strings with exact frozen scale",
            "serialization_profile = CANONICAL_DECIMAL_STRING_V1",
            "aggregation_boundary = DECLARED_AGGREGATION_BOUNDARY_ONLY",
        ],
        "serialization_contract": {
            "representation": "canonical decimal string",
            "exact_fractional_digits": "money_profile.scale",
            "required_trailing_zeros": True,
            "rejects": ["exponent_notation", "locale_separators", "NaN", "infinity", "trimmed_scale"],
        },
        "deterministic_aggregation_rules": [
            "contribution order is deterministic and canonical before summation",
            "compute slice order is lexicographic by effective_date and canonical_fact_id",
            "exact-decimal intermediate precision is preserved until the aggregation boundary is reached",
            "round_money applies once at persisted output boundaries",
        ],
        "artifact_bindings": [
            {
                "artifact": "ComputeResult",
                "requirements": [
                    "persist money_profile",
                    "apply round_money only at declared aggregate totals",
                    "preserve executable reporting-scope basis",
                ],
            },
            {
                "artifact": "ForecastSet",
                "requirements": [
                    "persist money_profile",
                    "round point and simulated forecasts through round_money",
                ],
            },
            {
                "artifact": "ParityResult",
                "requirements": [
                    "persist money_profile",
                    "compute exact-decimal internal_value, authority_value, delta_signed, and delta_abs",
                    "use exact intermediates for threshold and floor checks",
                ],
            },
            {
                "artifact": "TrustSummary",
                "requirements": [
                    "consume money-bearing upstream artifacts without re-rounding them for trust decisions",
                ],
            },
        ],
        "source_refs": [
            line_ref(repo_rel(FORMULA_SOURCE_PATH), 77, "money_rules"),
            line_ref(repo_rel(FORMULA_SOURCE_PATH), 99, "money_profile_binding"),
            line_ref(repo_rel(FORMULA_SOURCE_PATH), 104, "money_serialization"),
            line_ref(repo_rel(FORMULA_SOURCE_PATH), 230, "compute_ordering"),
            line_ref(repo_rel(FORMULA_SOURCE_PATH), 463, "parity_exact_decimal"),
        ],
        "notes": [
            "Projection-side confidence and read-side summaries must not mutate the canonical money boundary.",
            "This contract closes the exact-decimal implementation gap across compute, forecast, parity, and trust replay.",
        ],
    }


def build_reason_code_map(records: list[dict[str, Any]]) -> dict[str, Any]:
    family_rows: list[dict[str, Any]] = []
    index: dict[str, list[str]] = {}
    for record in records:
        reason_codes = record["reason_code_emissions"]
        if not reason_codes:
            continue
        prefixes = ordered_unique(code.split("_", 1)[0] for code in reason_codes)
        family_rows.append(
            {
                "formula_id": record["formula_id"],
                "formula_family": record["formula_family"],
                "reason_code_prefixes": prefixes,
                "reason_codes": reason_codes,
                "downstream_gate_consumers": record["downstream_gate_consumers"],
                "source_refs": record["source_refs"],
            }
        )
        for code in reason_codes:
            index.setdefault(code, []).append(record["formula_id"])
    index_rows = [
        {
            "reason_code": code,
            "formula_ids": sorted(formula_ids),
            "reason_code_prefix": code.split("_", 1)[0],
        }
        for code, formula_ids in sorted(index.items())
    ]
    return {
        "family_rows": family_rows,
        "reason_code_index": index_rows,
        "summary": {
            "formula_family_count": len(family_rows),
            "reason_code_count": len(index_rows),
            "prefixes": ordered_unique(row["reason_code_prefix"] for row in index_rows),
        },
    }


def build_test_vector_plan() -> dict[str, Any]:
    vector_refs = find_vector_source_refs(REQUIRED_EXISTING_VECTOR_IDS)
    existing_vectors = [
        {
            "vector_id": "TV-55",
            "formula_ids": ["trust_scoring_bands_and_readiness"],
            "coverage_status": "existing_corpus_vector",
            "scenario": "Green score with filing-critical override is capped to review.",
            "expected_outputs": ["trust_band = AMBER", "automation_level != ALLOWED", "filing_readiness != READY_TO_SUBMIT"],
            "source_ref": vector_refs["TV-55"],
        },
        {
            "vector_id": "TV-56",
            "formula_ids": ["trust_scoring_bands_and_readiness"],
            "coverage_status": "existing_corpus_vector",
            "scenario": "Near-threshold trust instability forces EDGE_REVIEW.",
            "expected_outputs": ["threshold_stability_state = EDGE_REVIEW", "TRUST_THRESHOLD_EDGE_REVIEW"],
            "source_ref": vector_refs["TV-56"],
        },
        {
            "vector_id": "TV-56A",
            "formula_ids": ["trust_upstream_gate_cap", "trust_scoring_bands_and_readiness"],
            "coverage_status": "existing_corpus_vector",
            "scenario": "Upstream review cap cannot be outranked by a green trust score.",
            "expected_outputs": ["upstream_gate_cap = REVIEW_ONLY", "cap_band = AMBER", "automation_level != ALLOWED"],
            "source_ref": vector_refs["TV-56A"],
        },
        {
            "vector_id": "TV-56B",
            "formula_ids": ["trust_input_admissibility_and_basis", "trust_scoring_bands_and_readiness"],
            "coverage_status": "existing_corpus_vector",
            "scenario": "Trust-input basis ceilings prevent stale or authority-limited inputs from masquerading as green automation.",
            "expected_outputs": ["automation_ceiling caps final automation_level", "filing_readiness_ceiling caps final filing_readiness"],
            "source_ref": vector_refs["TV-56B"],
        },
        {
            "vector_id": "TV-56C",
            "formula_ids": ["formula_reason_code_emission"],
            "coverage_status": "existing_corpus_vector",
            "scenario": "Trust explainability discloses authority and limitation posture without replay.",
            "expected_outputs": ["compressed_reason_codes prefix of reason_codes", "semantic_qualifiers include AUTHORITY_STATE and LIMITATION_STATE"],
            "source_ref": vector_refs["TV-56C"],
        },
        {
            "vector_id": "TV-56D",
            "formula_ids": ["trust_scoring_bands_and_readiness"],
            "coverage_status": "existing_corpus_vector",
            "scenario": "Trust sensitivity contract freezes score-versus-cap divergence and guard-band triggers.",
            "expected_outputs": ["score_cap_alignment_state = CAP_STRICTER_THAN_SCORE", "cap_driver_reason_codes non-empty", "edge_trigger_codes exact"],
            "source_ref": vector_refs["TV-56D"],
        },
        {
            "vector_id": "TV-56E",
            "formula_ids": ["trust_scoring_bands_and_readiness"],
            "coverage_status": "existing_corpus_vector",
            "scenario": "Trust sensitivity contract uses only the canonical six perturbation probes.",
            "expected_outputs": TRUST_PROBE_ORDER,
            "source_ref": vector_refs["TV-56E"],
        },
        {
            "vector_id": "TV-56F",
            "formula_ids": ["trust_input_admissibility_and_basis", "trust_currency_and_recalculation", "trust_scoring_bands_and_readiness"],
            "coverage_status": "existing_corpus_vector",
            "scenario": "Freshness invalidation and invalid override probes fail closed.",
            "expected_outputs": ["TRUST_INPUT_STALE", "TRUST_RECALCULATION_REQUIRED", "TRUST_OVERRIDE_INVALID"],
            "source_ref": vector_refs["TV-56F"],
        },
        {
            "vector_id": "TV-56G",
            "formula_ids": ["trust_authority_uncertainty", "trust_scoring_bands_and_readiness"],
            "coverage_status": "existing_corpus_vector",
            "scenario": "Live authority review guard band forces edge review before automation.",
            "expected_outputs": ["AUTHORITY_REVIEW_GUARD_BAND", "threshold_stability_state = EDGE_REVIEW", "automation_level != ALLOWED"],
            "source_ref": vector_refs["TV-56G"],
        },
        {
            "vector_id": "TV-57",
            "formula_ids": ["trust_currency_and_recalculation"],
            "coverage_status": "existing_corpus_vector",
            "scenario": "Late data after packet preparation invalidates filing readiness.",
            "expected_outputs": ["trust_currency_state = RECALC_REQUIRED", "FILING_GATE blocks until trust resynthesizes"],
            "source_ref": vector_refs["TV-57"],
        },
        {
            "vector_id": "TV-58",
            "formula_ids": ["trust_currency_and_recalculation", "aggregate_parity", "trust_scoring_bands_and_readiness"],
            "coverage_status": "existing_corpus_vector",
            "scenario": "Authority correction reverses amendment-era trust readiness.",
            "expected_outputs": ["prior trust summary becomes stale", "new parity/trust cycle required"],
            "source_ref": vector_refs["TV-58"],
        },
    ]
    return {
        "existing_vectors": existing_vectors,
        "planned_vectors": PLANNED_TEST_VECTORS,
        "summary": {
            "existing_vector_count": len(existing_vectors),
            "planned_vector_count": len(PLANNED_TEST_VECTORS),
            "required_existing_vector_ids": REQUIRED_EXISTING_VECTOR_IDS,
            "trust_probe_order": TRUST_PROBE_ORDER,
        },
    }


def build_secondary_formula_families(records: list[dict[str, Any]]) -> dict[str, Any]:
    rows = [record for record in records if record["formula_family"] == "secondary_formula_family"]
    return {
        "families": rows,
        "summary": {
            "secondary_family_count": len(rows),
            "formula_ids": [row["formula_id"] for row in rows],
            "sections": ordered_unique(row["canonical_section"] for row in rows),
        },
    }


def build_registry(records: list[dict[str, Any]], dependency_rows: list[dict[str, Any]]) -> dict[str, Any]:
    covered_sections = ordered_unique(record["canonical_section"] for record in records)
    covered_artifacts = ordered_unique(artifact for record in records for artifact in record["output_artifacts"])
    covered_schemas = ordered_unique(schema for record in records for schema in record["schema_touchpoints"])
    return {
        "formula_records": records,
        "dependencies": dependency_rows,
        "summary": {
            "formula_record_count": len(records),
            "core_formula_family_count": sum(1 for row in records if row["formula_family"] == "core_formula_family"),
            "secondary_formula_family_count": sum(1 for row in records if row["formula_family"] == "secondary_formula_family"),
            "numbered_sections_covered": covered_sections,
            "schema_backed_artifacts_covered": covered_artifacts,
            "schema_touchpoint_count": len(covered_schemas),
            "formula_symbol_count": sum(len(row["formula_symbols"]) for row in records),
            "reason_code_count": len({code for row in records for code in row["reason_code_emissions"]}),
        },
        "required_schema_artifacts": REQUIRED_SCHEMA_ARTIFACTS,
        "numbered_sections_required": REQUIRED_NUMBERED_SECTIONS,
    }


def render_registry_doc(records: list[dict[str, Any]], registry: dict[str, Any]) -> str:
    lines = [
        "# Compute, Parity, Risk, and Trust Formula Requirements",
        "",
        "This document turns `compute_parity_and_trust_formulas.md` into a machine-oriented registry of formula families, operational bindings, downstream gate consumers, and schema-backed output surfaces.",
        "",
        "## Coverage Summary",
        "",
        f"- Formula records: `{registry['summary']['formula_record_count']}`",
        f"- Core formula families: `{registry['summary']['core_formula_family_count']}`",
        f"- Secondary formula families: `{registry['summary']['secondary_formula_family_count']}`",
        f"- Covered numbered sections: `{', '.join(registry['summary']['numbered_sections_covered'])}`",
        f"- Schema-backed artifacts covered: `{', '.join(registry['summary']['schema_backed_artifacts_covered'])}`",
        "",
        "## Formula Family Matrix",
        "",
        "| Formula ID | Section | Family | Output Artifacts | Module Bindings | Gate Consumers |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    for record in records:
        module_names = ", ".join(binding["module_name"] for binding in record["module_bindings"]) or "n/a"
        gates = ", ".join(record["downstream_gate_consumers"]) or "n/a"
        artifacts = ", ".join(record["output_artifacts"]) or "n/a"
        lines.append(
            f"| `{record['formula_id']}` | `{record['canonical_section']}` | `{record['formula_family']}` | {artifacts} | {module_names} | {gates} |"
        )
    lines.extend(
        [
            "",
            "## Notes",
            "",
            "- `8.10A` and `8.11A` are indexed as `secondary_formula_family` records so collaboration and client-flow metrics cannot be mistaken for filing trust.",
            "- `projection_*` confidence terms remain indexed but are explicitly constrained to read-side use; they do not feed compute, parity, trust, or filing readiness.",
            "- Trust synthesis is split across authority uncertainty, admissibility/basis, upstream gate cap, and score/cap/readiness records so later engineers do not collapse distinct ceilings into one score.",
            "",
        ]
    )
    for record in records:
        lines.extend(
            [
                f"### `{record['formula_id']}`",
                "",
                f"- Label: {record['label']}",
                f"- Source refs: {', '.join(record['source_refs'])}",
                f"- Inputs: {', '.join(f'`{value}`' for value in record['inputs']) or 'n/a'}",
                f"- Key intermediates: {', '.join(f'`{value}`' for value in record['intermediate_terms']) or 'n/a'}",
                f"- Output fields: {', '.join(f'`{value}`' for value in record['output_fields']) or 'n/a'}",
                f"- Threshold deps: {', '.join(f'`{value}`' for value in record['threshold_dependencies']) or 'n/a'}",
                f"- Reason codes: {', '.join(f'`{value}`' for value in record['reason_code_emissions']) or 'n/a'}",
                f"- Sensitivity hooks: {', '.join(f'`{value}`' for value in record['sensitivity_hooks']) or 'n/a'}",
                f"- Notes: {'; '.join(record['notes']) or 'n/a'}",
                "",
            ]
        )
    return "\n".join(lines)


def render_dependency_doc(records: list[dict[str, Any]], dependency_rows: list[dict[str, Any]]) -> str:
    record_map = {record["formula_id"]: record for record in records}
    lines = [
        "# Formula Dependency and Execution Basis",
        "",
        "This document captures how normalized helpers, core formula families, secondary families, and downstream gate bindings relate operationally.",
        "",
        "## Dependency Graph",
        "",
        "| Source | Target | Kind | Rationale |",
        "| --- | --- | --- | --- |",
    ]
    for row in dependency_rows:
        lines.append(
            f"| `{row['source_formula_id']}` | `{row['target_formula_id']}` | `{row['dependency_kind']}` | {row['rationale']} |"
        )
    lines.extend(["", "## Execution Basis", ""])
    for record in records:
        module_rows = record["module_bindings"]
        phase_refs = ordered_unique(phase_id for module_row in module_rows for phase_id in module_row["phase_ids"])
        lines.extend(
            [
                f"### `{record['formula_id']}`",
                "",
                f"- Mode applicability: {record['mode_applicability']}",
                f"- Determinism rules: {'; '.join(record['determinism_rules']) or 'n/a'}",
                f"- Module phases: {', '.join(f'`{value}`' for value in phase_refs) or 'n/a'}",
                f"- Schema touchpoints: {', '.join(f'`{value}`' for value in record['schema_touchpoints']) or 'n/a'}",
                f"- Gate consumers: {', '.join(f'`{value}`' for value in record['downstream_gate_consumers']) or 'n/a'}",
                "",
            ]
        )
    lines.extend(
        [
            "## Key Separation Rules",
            "",
            "- The money contract lives in the shared helper layer and is reused by compute, forecast, and parity rather than being restated per module.",
            "- `trust_input_state`, `threshold_stability_state`, and `upstream_gate_cap` are independent trust inputs and must not be inferred from `trust_score` alone.",
            "- The collaboration and client-flow families reuse the normalization surface but remain out of the filing-trust dependency chain.",
            "",
        ]
    )
    return "\n".join(lines)


def render_threshold_doc(thresholds: dict[str, Any], test_plan: dict[str, Any]) -> str:
    lines = [
        "# Threshold, Edge-Case, and Sensitivity Matrix",
        "",
        "This document centralizes the band, guard-band, fail-closed cap, and secondary-threshold semantics that were previously scattered across prose.",
        "",
        "## Threshold Groups",
        "",
        "| Threshold ID | Formula IDs | Kind | Key Values |",
        "| --- | --- | --- | --- |",
    ]
    for group in thresholds["groups"]:
        key_values = json.dumps(group["values"], sort_keys=True)
        lines.append(
            f"| `{group['threshold_id']}` | {', '.join(f'`{value}`' for value in group['formula_ids'])} | `{group['kind']}` | `{key_values}` |"
        )
    lines.extend(
        [
            "",
            "## Sensitivity Hooks",
            "",
            f"- Canonical trust edge-trigger enum: `{', '.join(TRUST_EDGE_TRIGGER_ENUM)}`",
            f"- Canonical trust probe order: `{', '.join(TRUST_PROBE_ORDER)}`",
            "",
            "## Test Vector Plan",
            "",
            "| Vector | Coverage | Formula IDs |",
            "| --- | --- | --- |",
        ]
    )
    for row in test_plan["existing_vectors"]:
        lines.append(
            f"| `{row['vector_id']}` | `{row['coverage_status']}` | {', '.join(f'`{value}`' for value in row['formula_ids'])} |"
        )
    for row in test_plan["planned_vectors"]:
        lines.append(
            f"| `{row['planned_vector_id']}` | `{row['coverage_status']}` | {', '.join(f'`{value}`' for value in row['formula_ids'])} |"
        )
    lines.extend(
        [
            "",
            "## Edge-Case Notes",
            "",
            "- Exact-decimal money semantics, canonical decimal-string serialization, and declared aggregation boundaries are binding implementation requirements.",
            "- `projection_*` confidence terms remain read-side only.",
            "- Silent limitation ambiguity, invalid weight profiles, stale or contradictory trust inputs, and invalid override dependencies are fail-closed states rather than advisory warnings.",
            "",
        ]
    )
    return "\n".join(lines)


def render_mermaid(records: list[dict[str, Any]], dependency_rows: list[dict[str, Any]]) -> str:
    secondary_ids = {"collaboration_orchestration_queue_routing", "client_flow_reliability_and_completion"}
    lines = [
        "flowchart LR",
        '  subgraph CORE["Core Formula Spine"]',
    ]
    for record in records:
        if record["formula_id"] in secondary_ids:
            continue
        lines.append(f'    {slugify(record["formula_id"])}["{record["label"]}"]')
    lines.extend(['  end', '  subgraph SECONDARY["Secondary Families"]'])
    for record in records:
        if record["formula_id"] not in secondary_ids:
            continue
        lines.append(f'    {slugify(record["formula_id"])}["{record["label"]}"]')
    lines.extend(['  end', '  subgraph ARTIFACTS["Schema-Backed Artifacts"]'])
    for artifact in REQUIRED_SCHEMA_ARTIFACTS:
        lines.append(f'    {slugify(artifact)}["{artifact}"]')
    lines.extend(['  end', '  subgraph GATES["Downstream Gates"]', '    trust_gate["TRUST_GATE"]', '    filing_gate["FILING_GATE"]', '    amendment_gate["AMENDMENT_GATE"]', '    submission_gate["SUBMISSION_GATE"]', '  end'])
    for row in dependency_rows:
        lines.append(f"  {slugify(row['source_formula_id'])} --> {slugify(row['target_formula_id'])}")
    for record in records:
        for artifact in record["output_artifacts"]:
            if artifact in REQUIRED_SCHEMA_ARTIFACTS:
                lines.append(f"  {slugify(record['formula_id'])} --> {slugify(artifact)}")
        for gate_code in record["downstream_gate_consumers"]:
            lines.append(f"  {slugify(record['formula_id'])} --> {slugify(gate_code.lower()) if gate_code not in {'TRUST_GATE','FILING_GATE','AMENDMENT_GATE','SUBMISSION_GATE'} else slugify(gate_code)}")
    return "\n".join(lines) + "\n"


def build_outputs() -> dict[str, Any]:
    records = build_formula_records()
    dependency_rows = build_dependency_rows()
    registry = build_registry(records, dependency_rows)
    thresholds = build_threshold_registry()
    money_contract = build_money_contract()
    reason_code_map = build_reason_code_map(records)
    test_plan = build_test_vector_plan()
    secondary = build_secondary_formula_families(records)
    docs = (
        render_registry_doc(records, registry),
        render_dependency_doc(records, dependency_rows),
        render_threshold_doc(thresholds, test_plan),
    )
    mermaid = render_mermaid(records, dependency_rows)
    return {
        "registry": registry,
        "dependencies": dependency_rows,
        "thresholds": thresholds,
        "money_contract": money_contract,
        "reason_code_map": reason_code_map,
        "test_plan": test_plan,
        "secondary": secondary,
        "docs": docs,
        "mermaid": mermaid,
    }


def main() -> int:
    outputs = build_outputs()
    json_write(REGISTRY_PATH, outputs["registry"])
    csv_write(
        DEPENDENCY_CSV_PATH,
        outputs["dependencies"],
        ["source_formula_id", "target_formula_id", "dependency_kind", "rationale"],
    )
    json_write(THRESHOLD_PATH, outputs["thresholds"])
    json_write(MONEY_CONTRACT_PATH, outputs["money_contract"])
    json_write(REASON_CODE_MAP_PATH, outputs["reason_code_map"])
    json_write(TEST_VECTOR_PLAN_PATH, outputs["test_plan"])
    json_write(SECONDARY_FAMILIES_PATH, outputs["secondary"])

    FORMULA_DOC_PATH.parent.mkdir(parents=True, exist_ok=True)
    FORMULA_DOC_PATH.write_text(outputs["docs"][0] + "\n")
    DEPENDENCY_DOC_PATH.write_text(outputs["docs"][1] + "\n")
    THRESHOLD_DOC_PATH.write_text(outputs["docs"][2] + "\n")

    MERMAID_PATH.parent.mkdir(parents=True, exist_ok=True)
    MERMAID_PATH.write_text(outputs["mermaid"])

    summary = {
        "status": "PASS",
        "formula_record_count": outputs["registry"]["summary"]["formula_record_count"],
        "core_formula_family_count": outputs["registry"]["summary"]["core_formula_family_count"],
        "secondary_formula_family_count": outputs["registry"]["summary"]["secondary_formula_family_count"],
        "reason_code_count": outputs["reason_code_map"]["summary"]["reason_code_count"],
        "threshold_group_count": outputs["thresholds"]["summary"]["group_count"],
    }
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
