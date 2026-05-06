from __future__ import annotations

import argparse
import json
import subprocess
import time
from pathlib import Path
from typing import Any

from _runtime_common import compose_file_path, health_contract_path, load_state_if_present, normalize_snapshot_payload, read_json, state_file_path


def evaluate_check(check: dict[str, Any], compose_states: dict[str, dict[str, Any]], markers: dict[str, Any]) -> bool:
    requirement = check["requirement_kind"]
    compose_service_ref = check["compose_service_ref_or_null"]
    if requirement == "COMPOSE_RUNNING_HEALTHY":
        service = compose_states.get(compose_service_ref)
        return bool(service and service["state"] == "running" and service["health"] == "healthy")
    if requirement == "COMPOSE_EXITED_ZERO":
        service = compose_states.get(compose_service_ref)
        return bool(service and service["state"] == "exited" and service["exit_code"] == 0)

    marker_ref = check["marker_ref_or_null"]
    marker = markers.get(marker_ref)
    if requirement == "STATE_MARKER_EQUALS":
        return marker == check["expected_string_or_null"]
    if requirement == "STATE_MARKER_NON_EMPTY":
        if isinstance(marker, list):
            return len(marker) > 0
        return marker not in (None, "")
    if requirement == "STATE_MARKER_INCLUDES_ALL":
        return isinstance(marker, list) and all(
            expected in marker for expected in (check["expected_values_or_null"] or [])
        )
    return False


def evaluate(readiness_class: str, snapshot: list[dict[str, Any]], markers: dict[str, Any]) -> dict[str, Any]:
    contract = read_json(health_contract_path())
    compose_states = {row["compose_service_ref"]: row for row in snapshot}
    target_checks = [
        check
        for check in contract["checks"]
        if readiness_class == "SEMANTIC" or check["readiness_class"] == "BASE"
    ]

    services: dict[str, dict[str, Any]] = {}
    for check in target_checks:
        service = services.setdefault(
            check["service_ref"],
            {"service_ref": check["service_ref"], "readiness_codes": [], "failure_codes": []},
        )
        if evaluate_check(check, compose_states, markers):
            service["readiness_codes"].append(check["readiness_code"])
        else:
            service["failure_codes"].append(check["failure_code"])

    service_statuses = []
    readiness_codes: list[str] = []
    failure_codes: list[str] = []
    for service_ref, service in services.items():
        ok = len(service["failure_codes"]) == 0
        readiness_codes.extend(service["readiness_codes"])
        failure_codes.extend(service["failure_codes"])
        service_statuses.append(
            {
                "serviceRef": service_ref,
                "ok": ok,
                "readinessCodes": sorted(set(service["readiness_codes"])),
                "failureCodes": sorted(set(service["failure_codes"])),
            },
        )

    return {
        "ok": len(failure_codes) == 0,
        "readinessClass": readiness_class,
        "readinessCodes": sorted(set(readiness_codes)),
        "failureCodes": sorted(set(failure_codes)),
        "serviceStatuses": sorted(service_statuses, key=lambda entry: entry["serviceRef"]),
    }


def read_live_snapshot() -> list[dict[str, Any]]:
    command = ["docker", "compose", "-f", str(compose_file_path()), "ps", "--format", "json"]
    completed = subprocess.run(command, capture_output=True, text=True, check=True)
    stdout = completed.stdout.strip()
    if stdout.startswith("["):
        payload = json.loads(stdout)
    else:
        payload = stdout
    return normalize_snapshot_payload(payload)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--readiness-class", choices=["BASE", "SEMANTIC"], default="SEMANTIC")
    parser.add_argument("--snapshot", type=Path)
    parser.add_argument("--state-dir", type=Path, required=True)
    parser.add_argument("--timeout-seconds", type=int, default=30)
    parser.add_argument("--poll-seconds", type=float, default=1.0)
    args = parser.parse_args()

    if args.snapshot:
        snapshot = normalize_snapshot_payload(read_json(args.snapshot))
        state = load_state_if_present(args.state_dir)
        markers = {} if not state else state.get("markers", {})
        result = evaluate(args.readiness_class, snapshot, markers)
        print(json.dumps(result, indent=2))
        if not result["ok"]:
            raise SystemExit(1)
        return

    deadline = time.time() + args.timeout_seconds
    last_result: dict[str, Any] | None = None
    while time.time() < deadline:
        snapshot = read_live_snapshot()
        state = load_state_if_present(args.state_dir)
        markers = {} if not state else state.get("markers", {})
        last_result = evaluate(args.readiness_class, snapshot, markers)
        if last_result["ok"]:
            print(json.dumps(last_result, indent=2))
            return
        time.sleep(args.poll_seconds)

    print(json.dumps(last_result or {"ok": False, "failureCodes": ["WAIT_TIMEOUT"]}, indent=2))
    raise SystemExit(1)


if __name__ == "__main__":
    main()
