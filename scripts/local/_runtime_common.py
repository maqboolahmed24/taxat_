from __future__ import annotations

import json
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
STATE_FILENAME = "local_runtime_state.json"


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"{json.dumps(payload, indent=2, sort_keys=True)}\n", encoding="utf-8")


def topology_path() -> Path:
    return REPO_ROOT / "infra" / "local" / "local_runtime_topology.json"


def health_contract_path() -> Path:
    return REPO_ROOT / "infra" / "local" / "service_health_contract.json"


def boot_order_path() -> Path:
    return REPO_ROOT / "infra" / "local" / "service_boot_order.json"


def provider_overrides_path() -> Path:
    return REPO_ROOT / "config" / "runtime" / "local" / "provider_overrides.json"


def seed_profiles_path() -> Path:
    return REPO_ROOT / "config" / "runtime" / "local" / "local_seed_profiles.json"


def golden_pack_seed_path() -> Path:
    return REPO_ROOT / "fixtures" / "synthetic" / "deterministic_golden_pack_seed.json"


def schema_bundle_catalog_path() -> Path:
    return REPO_ROOT / "config" / "migrations" / "schema_bundle_version_catalog.json"


def compose_file_path() -> Path:
    return REPO_ROOT / "infra" / "local" / "compose.yaml"


def load_runtime_bundle() -> dict[str, Any]:
    return {
        "topology": read_json(topology_path()),
        "health_contract": read_json(health_contract_path()),
        "boot_order": read_json(boot_order_path()),
        "provider_overrides": read_json(provider_overrides_path()),
        "seed_profiles": read_json(seed_profiles_path()),
        "golden_pack_seed": read_json(golden_pack_seed_path()),
        "schema_bundle_catalog": read_json(schema_bundle_catalog_path()),
    }


def ensure_allowed_runtime_profile(bundle: dict[str, Any], runtime_profile_ref: str) -> str:
    allowed = set(bundle["provider_overrides"]["allowed_bootstrap_profile_refs"])
    if runtime_profile_ref not in allowed:
        raise SystemExit(
            f"Runtime profile {runtime_profile_ref} is not allowed for local bootstrap. "
            f"Allowed profiles: {', '.join(sorted(allowed))}",
        )
    return bundle["topology"]["environment_ref_map"][runtime_profile_ref]


def state_file_path(state_dir: Path) -> Path:
    return state_dir / STATE_FILENAME


def load_state_if_present(state_dir: Path) -> dict[str, Any] | None:
    path = state_file_path(state_dir)
    if not path.exists():
        return None
    return read_json(path)


def fixture_ids_from_golden_pack(golden_pack_seed: dict[str, Any]) -> set[str]:
    fixture_ids: set[str] = set()
    for key in (
        "module_fixture_inputs",
        "state_transition_fixture_inputs",
        "replay_fixture_inputs",
        "cadence_fixture_inputs",
    ):
        for entry in golden_pack_seed[key]:
            fixture_ids.add(entry["fixture_id"])
    return fixture_ids


def normalize_snapshot_payload(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        rows = payload
    elif isinstance(payload, dict) and "compose_service_states" in payload:
        rows = payload["compose_service_states"]
    else:
        rows = []
        for line in str(payload).splitlines():
            line = line.strip()
            if not line:
                continue
            rows.append(json.loads(line))

    normalized: list[dict[str, Any]] = []
    for row in rows:
        compose_service_ref = (
            row.get("compose_service_ref")
            or row.get("Service")
            or row.get("service")
            or row.get("Name")
            or row.get("name")
        )
        state = (row.get("state") or row.get("State") or "unknown").lower()
        health = row.get("health") or row.get("Health")
        exit_code = row.get("exit_code") if "exit_code" in row else row.get("ExitCode")
        normalized.append(
            {
                "compose_service_ref": compose_service_ref,
                "state": state,
                "health": None if health in ("", None) else str(health).lower(),
                "exit_code": None if exit_code in ("", None) else int(exit_code),
            },
        )
    return normalized
