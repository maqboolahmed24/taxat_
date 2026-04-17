#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any

import build_gate_registry as builder


REQUIRED_OUTPUTS = [
    builder.REGISTRY_PATH,
    builder.GATE_ORDER_PATH,
    builder.REASON_CODE_PATH,
    builder.OVERRIDE_MATRIX_PATH,
    builder.PHASE_BINDING_PATH,
    builder.TERMINALIZATION_PATH,
    builder.GATE_DOC_PATH,
    builder.PROGRESSION_DOC_PATH,
    builder.EXPLAINABILITY_DOC_PATH,
    builder.MERMAID_PATH,
]


def fail(message: str) -> None:
    raise SystemExit(message)


def load_json(path: Path) -> Any:
    return json.loads(path.read_text())


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def load_csv(path: Path) -> list[dict[str, str]]:
    return list(csv.DictReader(path.open()))


def first_diff(expected_rows: list[dict[str, Any]], actual_rows: list[dict[str, Any]]) -> tuple[int, Any, Any] | None:
    max_len = max(len(expected_rows), len(actual_rows))
    for index in range(max_len):
        expected = expected_rows[index] if index < len(expected_rows) else None
        actual = actual_rows[index] if index < len(actual_rows) else None
        if expected != actual:
            return index, expected, actual
    return None


def main() -> int:
    for path in REQUIRED_OUTPUTS:
        if not path.exists():
            fail(f"Missing required artifact: {path}")

    outputs = builder.build_outputs()
    expected_registry = outputs["registry"]
    expected_gate_order = outputs["gate_order"]
    expected_reason_codes = outputs["reason_codes"]
    expected_override = outputs["override_matrix"]
    expected_phase_bindings = outputs["phase_bindings"]
    expected_terminalization = outputs["terminalization"]
    expected_docs = builder.render_docs(outputs)
    expected_mermaid = builder.render_mermaid(outputs["registry"]["gates"])

    actual_registry = load_json(builder.REGISTRY_PATH)
    if actual_registry != expected_registry:
        fail("gate_registry.json drifted from the canonical builder output.")

    actual_gate_order = load_csv(builder.GATE_ORDER_PATH)
    if actual_gate_order != [{key: str(value) for key, value in row.items()} for row in expected_gate_order]:
        fail("gate_order.csv drifted from the canonical builder output.")

    actual_reason_codes = load_jsonl(builder.REASON_CODE_PATH)
    diff = first_diff(expected_reason_codes, actual_reason_codes)
    if diff is not None:
        index, expected, actual = diff
        fail(f"gate_reason_code_registry.jsonl drifted at row {index}. Expected {expected}, got {actual}")

    actual_override = load_json(builder.OVERRIDE_MATRIX_PATH)
    if actual_override != expected_override:
        fail("override_resolution_matrix.json drifted from the canonical builder output.")

    actual_phase_bindings = load_json(builder.PHASE_BINDING_PATH)
    if actual_phase_bindings != expected_phase_bindings:
        fail("gate_to_phase_binding.json drifted from the canonical builder output.")

    actual_terminalization = load_json(builder.TERMINALIZATION_PATH)
    if actual_terminalization != expected_terminalization:
        fail("gate_terminalization_paths.json drifted from the canonical builder output.")

    if builder.GATE_DOC_PATH.read_text() != expected_docs[0]:
        fail("10_gate_order_reason_codes_and_override_rules.md drifted from the canonical builder render.")
    if builder.PROGRESSION_DOC_PATH.read_text() != expected_docs[1]:
        fail("10_gate_progression_and_terminalization_matrix.md drifted from the canonical builder render.")
    if builder.EXPLAINABILITY_DOC_PATH.read_text() != expected_docs[2]:
        fail("10_gate_explainability_and_reason_code_usage.md drifted from the canonical builder render.")
    if builder.MERMAID_PATH.read_text() != expected_mermaid:
        fail("10_gate_chain.mmd drifted from the canonical builder render.")

    gate_rows = actual_registry["gates"]
    gate_codes = [row["gate_code"] for row in gate_rows]
    expected_gate_codes = [spec.gate_code for spec in builder.GATE_SPECS]
    if gate_codes != expected_gate_codes:
        fail(f"Gate registry order drifted. Expected {expected_gate_codes}, got {gate_codes}")
    if len(gate_codes) != len(set(gate_codes)):
        fail("Duplicate gate_code values detected in the gate registry.")

    for row in gate_rows:
        if row["gate_class"] not in {"access", "non_access"}:
            fail(f"Gate `{row['gate_code']}` has invalid gate_class `{row['gate_class']}`.")
        if row["overrideability"] not in builder.OVERRIDEABILITY_ENUM:
            fail(f"Gate `{row['gate_code']}` has invalid overrideability `{row['overrideability']}`.")
        if row["evaluation_order_index"] != expected_gate_codes.index(row["gate_code"]) + 1:
            fail(f"Gate `{row['gate_code']}` has invalid evaluation order index.")
        if not row["source_refs"]:
            fail(f"Gate `{row['gate_code']}` has no source_refs.")
        if row["gate_class"] == "non_access":
            if row["decision_enum"] != builder.NON_ACCESS_DECISIONS:
                fail(f"Non-access gate `{row['gate_code']}` drifted from the shared decision enum.")
            if row["severity_model"]["decision_to_severity"] != builder.NON_ACCESS_SEVERITY_MAPPING:
                fail(f"Non-access gate `{row['gate_code']}` drifted from the shared severity mapping.")
        else:
            if row["decision_enum"] != builder.ACCESS_DECISIONS:
                fail("ACCESS_GATE drifted from the access decision enum.")

    shared = actual_registry["shared_contract"]
    if shared["non_access_decision_enum"] != builder.NON_ACCESS_DECISIONS:
        fail("Shared non-access decision enum drifted from section 7.1.")
    if shared["severity_mapping"] != builder.NON_ACCESS_SEVERITY_MAPPING:
        fail("Shared severity mapping drifted from section 7.1.")
    if shared["decision_rank_mapping"] != builder.DECISION_RANK_MAPPING:
        fail("Shared decision-rank mapping drifted from section 7.1.")
    if shared["progression_rank_mapping"] != builder.PROGRESSION_RANK_MAPPING:
        fail("Shared progression-rank mapping drifted from section 7.1.")
    if shared["readiness_rank_mapping"] != builder.READINESS_RANK_MAPPING:
        fail("Shared readiness-rank mapping drifted from section 7.1.")
    if shared["overrideability_enum"] != builder.OVERRIDEABILITY_ENUM:
        fail("Shared overrideability enum drifted from section 7.1.")

    declared_families = actual_registry["reason_code_family_declarations"]
    if declared_families != [f"{prefix}_*" for prefix in builder.REASON_CODE_FAMILY_PREFIXES.values()]:
        fail(f"Reason-code family declarations drifted: {declared_families}")
    if actual_registry["summary"]["missing_reason_code_families"] != ["ACCESS_*"]:
        fail("Expected ACCESS_* to remain the only declared-but-unenumerated reason-code family.")

    reason_code_rows = actual_reason_codes
    reason_code_ids = [row["reason_code_id"] for row in reason_code_rows]
    if len(reason_code_ids) != len(set(reason_code_ids)):
        fail("Duplicate reason_code_id values detected.")
    for row in reason_code_rows:
        expected_family = builder.classify_reason_code_family(row["gate_code"], row["reason_code"])
        if row["reason_code_family"] != expected_family:
            fail(f"Reason code `{row['reason_code']}` drifted from its gate family.")

    reason_codes_by_gate: dict[str, list[str]] = {}
    for gate in gate_rows:
        reason_codes_by_gate[gate["gate_code"]] = gate["reason_codes"]
    for gate_code, reason_codes in reason_codes_by_gate.items():
        if gate_code == "ACCESS_GATE":
            if reason_codes:
                fail("ACCESS_GATE should not have explicit reason codes until the source enumerates them.")
            continue
        registry_codes = [row["reason_code"] for row in reason_code_rows if row["gate_code"] == gate_code]
        if registry_codes != reason_codes:
            fail(f"Reason-code registry drifted for `{gate_code}`.")

    override_rows = actual_override["rows"]
    if [row["gate_code"] for row in override_rows] != expected_gate_codes:
        fail("Override matrix rows are not ordered by canonical gate order.")
    if len(override_rows) != len(expected_gate_codes):
        fail("Override matrix row count does not match gate registry row count.")
    for row in override_rows:
        gate_row = next(gate for gate in gate_rows if gate["gate_code"] == row["gate_code"])
        if row["overrideability"] != gate_row["overrideability"]:
            fail(f"Override matrix overrideability drifted for `{row['gate_code']}`.")

    phase_rows = actual_phase_bindings["rows"]
    if [row["gate_code"] for row in phase_rows] != expected_gate_codes:
        fail("Phase binding rows are not ordered by canonical gate order.")
    for row in phase_rows:
        if not row["evaluation_phase_refs"]:
            fail(f"Gate `{row['gate_code']}` is missing evaluation phase bindings.")
        module_names = set(row["module_bindings"])
        if row["gate_code"] == "ACCESS_GATE":
            if "AUTHORIZE" not in module_names:
                fail("ACCESS_GATE phase bindings are missing AUTHORIZE.")
        else:
            if row["gate_code"] not in module_names:
                fail(f"Gate `{row['gate_code']}` phase bindings are missing the gate module itself.")

    terminal_rows = actual_terminalization["rows"]
    if len(terminal_rows) != actual_terminalization["summary"]["row_count"]:
        fail("Terminalization summary row_count is inconsistent.")
    terminal_gate_decisions = {(row["gate_code"], row["decision"]) for row in terminal_rows}
    if len(terminal_gate_decisions) != len(terminal_rows):
        fail("Duplicate gate/decision terminalization rows detected.")
    for row in terminal_rows:
        gate_row = next(gate for gate in gate_rows if gate["gate_code"] == row["gate_code"])
        if row["decision"] not in gate_row["decision_table"]["branches"][0]["header"] and row["decision"] not in gate_row["decision_enum"]:
            fail(f"Terminalization row `{row['gate_code']}:{row['decision']}` is inconsistent with the gate decision enum.")

    if "# Gate Order, Reason Codes, and Override Rules" not in expected_docs[0]:
        fail("Main gate doc title is missing.")
    if "# Gate Progression and Terminalization Matrix" not in expected_docs[1]:
        fail("Progression doc title is missing.")
    if "# Gate Explainability and Reason-Code Usage" not in expected_docs[2]:
        fail("Explainability doc title is missing.")

    summary = {
        "status": "PASS",
        "gate_count": len(gate_rows),
        "reason_code_count": len(reason_code_rows),
        "override_row_count": len(override_rows),
        "phase_binding_row_count": len(phase_rows),
        "terminalization_row_count": len(terminal_rows),
    }
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
