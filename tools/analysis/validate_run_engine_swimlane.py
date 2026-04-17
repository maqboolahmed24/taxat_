#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any

import build_run_engine_swimlane as builder


REQUIRED_OUTPUTS = [
    builder.PHASE_INDEX_PATH,
    builder.STEP_LEDGER_PATH,
    builder.EVENT_TIMELINE_PATH,
    builder.BRANCH_CONDITIONS_PATH,
    builder.LIVE_EXPERIENCE_MAP_PATH,
    builder.SWIMLANE_DOC_PATH,
    builder.PHASE_CONTRACTS_DOC_PATH,
    builder.BRANCH_DOC_PATH,
    builder.MERMAID_PATH,
    builder.ATLAS_DATA_PATH,
    builder.ATLAS_INDEX_PATH,
    builder.ATLAS_STYLES_PATH,
    builder.ATLAS_APP_PATH,
]


def fail(message: str) -> None:
    raise SystemExit(message)


def load_json(path: Path) -> Any:
    return json.loads(path.read_text())


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    rows = []
    for line in path.read_text().splitlines():
        if line.strip():
            rows.append(json.loads(line))
    return rows


def first_diff(
    expected_rows: list[dict[str, Any]], actual_rows: list[dict[str, Any]]
) -> tuple[int, dict[str, Any] | None, dict[str, Any] | None] | None:
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
    expected_phase_index = outputs["phase_index"]
    expected_branch_conditions = outputs["branch_conditions"]
    expected_live_map = outputs["live_map"]
    expected_atlas_data = outputs["atlas_data"]
    expected_steps = [record.to_dict() for record in outputs["step_records"]]
    expected_event_timeline = outputs["event_timeline"]

    actual_phase_index = load_json(builder.PHASE_INDEX_PATH)
    if actual_phase_index != expected_phase_index:
        fail("run_engine_phase_index.json drifted from the builder's canonical phase model.")

    actual_branch_conditions = load_json(builder.BRANCH_CONDITIONS_PATH)
    if actual_branch_conditions != expected_branch_conditions:
        fail("run_engine_branch_conditions.json drifted from the canonical branch matrix.")

    actual_live_map = load_json(builder.LIVE_EXPERIENCE_MAP_PATH)
    if actual_live_map != expected_live_map:
        fail("run_engine_live_experience_map.json drifted from the canonical live-experience map.")

    actual_atlas_data = load_json(builder.ATLAS_DATA_PATH)
    if actual_atlas_data != expected_atlas_data:
        fail("atlas_data.json drifted from the canonical phase/branch/live-experience projection.")

    actual_steps = load_jsonl(builder.STEP_LEDGER_PATH)
    diff = first_diff(expected_steps, actual_steps)
    if diff is not None:
        index, expected, actual = diff
        fail(f"run_engine_step_ledger.jsonl drifted at row {index}. Expected {expected}, got {actual}")

    actual_event_timeline = list(csv.DictReader(builder.EVENT_TIMELINE_PATH.open()))
    if actual_event_timeline != [{key: str(value) for key, value in row.items()} for row in expected_event_timeline]:
        fail("run_engine_event_timeline.csv drifted from the canonical phase-local audit timeline.")

    phase_ids = [phase["phase_id"] for phase in actual_phase_index["phases"]]
    if phase_ids != [builder.phase_id(index) for index in range(1, 19)]:
        fail("The phase index does not contain phases `P01` through `P18` in exact source order.")

    phase_names = [phase["phase_name"] for phase in actual_phase_index["phases"]]
    if len(phase_names) != len(set(phase_names)):
        fail("Duplicate phase names detected in the phase index.")

    all_calls = {
        call["call_name"]: call
        for step in actual_steps
        for call in step["helper_calls"]
    }
    for step in actual_steps:
        for call_name in step["call_names"]:
            if call_name in step["module_calls"]:
                continue
            if call_name not in all_calls:
                fail(f"Call `{call_name}` was neither resolved to modules.md nor explicitly classified as a helper.")

    step_event_count = sum(len(step["event_codes"]) for step in actual_steps)
    if step_event_count != actual_phase_index["summary"]["event_count"]:
        fail("Event count in phase summary does not match the step ledger.")

    step_artifact_count = sum(len(step["artifact_writes"]) for step in actual_steps)
    if step_artifact_count != actual_phase_index["summary"]["artifact_write_count"]:
        fail("Artifact-write count in phase summary does not match the step ledger.")

    actual_branch_ids = {row["branch_id"] for row in actual_branch_conditions["rows"]}
    missing_branch_ids = sorted(builder.MANDATORY_BRANCH_IDS - actual_branch_ids)
    if missing_branch_ids:
        fail(f"Mandatory branch families are missing: {missing_branch_ids}")

    mermaid_text = builder.MERMAID_PATH.read_text()
    for phase_id in phase_ids:
        if phase_id not in mermaid_text:
            fail(f"Mermaid swimlane is missing phase node `{phase_id}`.")

    atlas_phase_ids = [phase["phase_id"] for phase in actual_atlas_data["phases"]]
    if atlas_phase_ids != phase_ids:
        fail("Atlas phase order does not match the canonical phase index.")

    if actual_atlas_data["lane_taxonomy"] != builder.LANE_ORDER:
        fail("Atlas lane taxonomy drifted from the canonical lane order.")

    atlas_html = builder.ATLAS_INDEX_PATH.read_text() + builder.ATLAS_APP_PATH.read_text()
    direct_test_ids = builder.MANDATORY_TEST_IDS - {"phase-row-01", "lane-CALLER_AND_SCOPE"}
    for test_id in direct_test_ids:
        if test_id not in atlas_html:
            fail(f"The atlas scaffold does not expose the required test id `{test_id}`.")
    if "phase-row-${padPhase" not in atlas_html:
        fail("The atlas scaffold does not expose the generated `phase-row-XX` test-id pattern.")
    if "lane-${lane}" not in atlas_html:
        fail("The atlas scaffold does not expose the generated `lane-<LANE_NAME>` test-id pattern.")

    if "prefers-reduced-motion" not in builder.ATLAS_STYLES_PATH.read_text():
        fail("The atlas stylesheet does not define a reduced-motion branch.")

    swimlane_doc = builder.SWIMLANE_DOC_PATH.read_text()
    if "# Run Engine End-to-End Execution Swimlane" not in swimlane_doc:
        fail("The swimlane markdown doc title is missing.")

    contracts_doc = builder.PHASE_CONTRACTS_DOC_PATH.read_text()
    if "# Run Engine Phase Contracts" not in contracts_doc:
        fail("The phase contracts doc title is missing.")

    branch_doc = builder.BRANCH_DOC_PATH.read_text()
    if "# Run Engine Branch and Terminalization Matrix" not in branch_doc:
        fail("The branch matrix doc title is missing.")

    summary = {
        "status": "PASS",
        "phase_count": len(phase_ids),
        "step_count": len(actual_steps),
        "event_count": step_event_count,
        "artifact_write_count": step_artifact_count,
        "branch_count": len(actual_branch_conditions["rows"]),
        "helper_call_count": len(all_calls),
    }
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
