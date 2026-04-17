#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
from decimal import Decimal
from pathlib import Path
from typing import Any

import build_formula_registry as builder


REQUIRED_OUTPUTS = [
    builder.REGISTRY_PATH,
    builder.DEPENDENCY_CSV_PATH,
    builder.THRESHOLD_PATH,
    builder.MONEY_CONTRACT_PATH,
    builder.REASON_CODE_MAP_PATH,
    builder.TEST_VECTOR_PLAN_PATH,
    builder.SECONDARY_FAMILIES_PATH,
    builder.FORMULA_DOC_PATH,
    builder.DEPENDENCY_DOC_PATH,
    builder.THRESHOLD_DOC_PATH,
    builder.MERMAID_PATH,
]


def fail(message: str) -> None:
    raise SystemExit(message)


def load_json(path: Path) -> Any:
    return json.loads(path.read_text())


def load_csv(path: Path) -> list[dict[str, str]]:
    return list(csv.DictReader(path.open()))


def main() -> int:
    for path in REQUIRED_OUTPUTS:
        if not path.exists():
            fail(f"Missing required artifact: {path}")

    outputs = builder.build_outputs()

    actual_registry = load_json(builder.REGISTRY_PATH)
    if actual_registry != outputs["registry"]:
        fail("formula_registry.json drifted from the canonical builder output.")

    actual_dependencies = load_csv(builder.DEPENDENCY_CSV_PATH)
    expected_dependencies = [{key: str(value) for key, value in row.items()} for row in outputs["dependencies"]]
    if actual_dependencies != expected_dependencies:
        fail("formula_dependencies.csv drifted from the canonical builder output.")

    actual_thresholds = load_json(builder.THRESHOLD_PATH)
    if actual_thresholds != outputs["thresholds"]:
        fail("thresholds_and_bands.json drifted from the canonical builder output.")

    actual_money = load_json(builder.MONEY_CONTRACT_PATH)
    if actual_money != outputs["money_contract"]:
        fail("money_and_rounding_contract.json drifted from the canonical builder output.")

    actual_reason_map = load_json(builder.REASON_CODE_MAP_PATH)
    if actual_reason_map != outputs["reason_code_map"]:
        fail("formula_reason_code_map.json drifted from the canonical builder output.")

    actual_test_plan = load_json(builder.TEST_VECTOR_PLAN_PATH)
    if actual_test_plan != outputs["test_plan"]:
        fail("formula_test_vector_plan.json drifted from the canonical builder output.")

    actual_secondary = load_json(builder.SECONDARY_FAMILIES_PATH)
    if actual_secondary != outputs["secondary"]:
        fail("secondary_formula_families.json drifted from the canonical builder output.")

    expected_docs = outputs["docs"]
    if builder.FORMULA_DOC_PATH.read_text() != expected_docs[0] + "\n":
        fail("11_compute_parity_risk_and_trust_formula_requirements.md drifted from the canonical builder render.")
    if builder.DEPENDENCY_DOC_PATH.read_text() != expected_docs[1] + "\n":
        fail("11_formula_dependency_and_execution_basis.md drifted from the canonical builder render.")
    if builder.THRESHOLD_DOC_PATH.read_text() != expected_docs[2] + "\n":
        fail("11_threshold_edge_case_and_sensitivity_matrix.md drifted from the canonical builder render.")
    if builder.MERMAID_PATH.read_text() != outputs["mermaid"]:
        fail("11_formula_dependency_graph.mmd drifted from the canonical builder render.")

    records = actual_registry["formula_records"]
    formula_ids = [row["formula_id"] for row in records]
    if len(formula_ids) != len(set(formula_ids)):
        fail("Duplicate formula_id values detected in formula_registry.json.")

    covered_sections = actual_registry["summary"]["numbered_sections_covered"]
    if covered_sections != builder.REQUIRED_NUMBERED_SECTIONS:
        fail(
            "Numbered formula-section coverage drifted. "
            f"Expected {builder.REQUIRED_NUMBERED_SECTIONS}, got {covered_sections}"
        )

    covered_artifacts = set(actual_registry["summary"]["schema_backed_artifacts_covered"])
    missing_artifacts = set(builder.REQUIRED_SCHEMA_ARTIFACTS) - covered_artifacts
    if missing_artifacts:
        fail(f"Missing schema-backed artifacts from formula coverage: {sorted(missing_artifacts)}")

    threshold_groups = {row["threshold_id"]: row for row in actual_thresholds["groups"]}
    required_threshold_ids = {
        "comparison_requirement_enum",
        "trust_input_state_enum",
        "upstream_gate_cap_enum",
        "trust_score_bands",
        "trust_guard_bands",
        "threshold_stability_enum",
        "trust_edge_trigger_enum",
        "trust_cap_band_rules",
        "automation_level_enum",
        "filing_readiness_enum",
        "analysis_mode_cap",
        "amendment_freshness_caps",
    }
    missing_threshold_ids = required_threshold_ids - set(threshold_groups)
    if missing_threshold_ids:
        fail(f"Missing required threshold groups: {sorted(missing_threshold_ids)}")

    if threshold_groups["trust_edge_trigger_enum"]["values"] != builder.TRUST_EDGE_TRIGGER_ENUM:
        fail("trust_edge_trigger_enum drifted from the canonical edge-trigger enum.")

    if actual_thresholds["summary"]["trust_probe_order"] != builder.TRUST_PROBE_ORDER:
        fail("Threshold summary trust_probe_order drifted from the canonical six probes.")

    if Decimal(str(threshold_groups["trust_score_bands"]["values"]["green_gte"])) != Decimal("85"):
        fail("Green trust threshold must remain exactly 85.")
    if Decimal(str(threshold_groups["trust_score_bands"]["values"]["amber_gte"])) != Decimal("65"):
        fail("Amber trust threshold must remain exactly 65.")
    if Decimal(str(threshold_groups["trust_guard_bands"]["values"]["green_guard_band"])) != Decimal("2"):
        fail("green_guard_band must remain exactly 2.")
    if Decimal(str(threshold_groups["trust_guard_bands"]["values"]["completeness_guard_band"])) != Decimal("3"):
        fail("completeness_guard_band must remain exactly 3.")
    if Decimal(str(threshold_groups["upload_confidence_thresholds"]["values"]["submit_attach_minimum"])) != Decimal("70"):
        fail("Upload confidence submit/attach minimum must remain exactly 70.")

    cap_rules = threshold_groups["trust_cap_band_rules"]["values"]
    if cap_rules["cap_band_enum"] != ["INSUFFICIENT_DATA", "RED", "AMBER", "GREEN"]:
        fail("cap_band enum drifted from the canonical trust cap-band order.")
    if cap_rules["severity_order"] != ["GREEN", "AMBER", "RED", "INSUFFICIENT_DATA"]:
        fail("trust-band severity order drifted from the canonical restriction order.")

    automation_enum = threshold_groups["automation_level_enum"]["values"]
    if automation_enum != ["ALLOWED", "LIMITED", "BLOCKED"]:
        fail("automation_level enum drifted from the canonical values.")
    readiness_enum = threshold_groups["filing_readiness_enum"]["values"]
    if readiness_enum != ["NOT_READY", "READY_REVIEW", "READY_TO_SUBMIT"]:
        fail("filing_readiness enum drifted from the canonical values.")

    money_contract = actual_money
    if money_contract["contract_version"] != "FORMULA_MONEY_AND_ROUNDING_V1":
        fail("Money contract version drifted.")
    if money_contract["serialization_contract"]["representation"] != "canonical decimal string":
        fail("Money contract must require canonical decimal string serialization.")
    if money_contract["serialization_contract"]["required_trailing_zeros"] is not True:
        fail("Money contract must require trailing zeros.")
    required_money_fields = {"currency_code", "scale", "rounding_mode", "aggregation_boundary", "serialization_profile"}
    if set(money_contract["money_profile_fields"]) != required_money_fields:
        fail("Money contract fields drifted from the required money profile boundary.")
    hard_rules = set(money_contract["hard_rules"])
    for required_rule in {
        "money is accumulated in exact fixed-scale decimal arithmetic in the smallest legal currency unit",
        "binary floating-point is forbidden for money-bearing sums, deltas, threshold checks, and parity breach checks",
        "rounding occurs only at declared aggregation boundaries",
        "all persisted money values serialize as canonical decimal strings with exact frozen scale",
        "serialization_profile = CANONICAL_DECIMAL_STRING_V1",
        "aggregation_boundary = DECLARED_AGGREGATION_BOUNDARY_ONLY",
    }:
        if required_rule not in hard_rules:
            fail(f"Money contract is missing required rule: {required_rule}")

    reason_map_rows = actual_reason_map["family_rows"]
    indexed_reason_codes = {row["reason_code"] for row in actual_reason_map["reason_code_index"]}
    emitted_reason_codes = {
        reason_code
        for record in records
        for reason_code in record["reason_code_emissions"]
    }
    if indexed_reason_codes != emitted_reason_codes:
        fail("Reason-code index does not match emitted reason codes from formula records.")
    if not any(row["formula_id"] == "formula_reason_code_emission" for row in reason_map_rows):
        fail("Reason-code map is missing the formula_reason_code_emission contract row.")

    secondary_ids = actual_secondary["summary"]["formula_ids"]
    if secondary_ids != [
        "collaboration_orchestration_queue_routing",
        "client_flow_reliability_and_completion",
    ]:
        fail(f"Secondary formula family ids drifted: {secondary_ids}")

    existing_vector_ids = [row["vector_id"] for row in actual_test_plan["existing_vectors"]]
    if existing_vector_ids != builder.REQUIRED_EXISTING_VECTOR_IDS:
        fail(f"Existing test-vector coverage drifted. Expected {builder.REQUIRED_EXISTING_VECTOR_IDS}, got {existing_vector_ids}")
    if actual_test_plan["summary"]["trust_probe_order"] != builder.TRUST_PROBE_ORDER:
        fail("Test-vector plan drifted from the canonical trust probe order.")

    dependency_pairs = {(row["source_formula_id"], row["target_formula_id"]) for row in outputs["dependencies"]}
    required_dependency_pairs = {
        ("data_quality_and_completeness", "trust_scoring_bands_and_readiness"),
        ("risk_scoring", "trust_scoring_bands_and_readiness"),
        ("aggregate_parity", "trust_scoring_bands_and_readiness"),
        ("evidence_graph_quality", "trust_scoring_bands_and_readiness"),
        ("trust_input_admissibility_and_basis", "trust_scoring_bands_and_readiness"),
        ("trust_upstream_gate_cap", "trust_scoring_bands_and_readiness"),
        ("trust_scoring_bands_and_readiness", "formula_reason_code_emission"),
    }
    missing_pairs = required_dependency_pairs - dependency_pairs
    if missing_pairs:
        fail(f"Dependency graph is missing required parity/trust/gating edges: {sorted(missing_pairs)}")

    if not any("TRUST_GATE" in record["downstream_gate_consumers"] for record in records):
        fail("No formula record feeds TRUST_GATE.")
    if not any("FILING_GATE" in record["downstream_gate_consumers"] for record in records):
        fail("No formula record feeds FILING_GATE.")

    summary = {
        "status": "PASS",
        "formula_record_count": len(records),
        "reason_code_count": len(indexed_reason_codes),
        "threshold_group_count": len(actual_thresholds["groups"]),
        "existing_vector_count": len(existing_vector_ids),
    }
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
