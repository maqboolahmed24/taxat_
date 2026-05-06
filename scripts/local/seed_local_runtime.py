from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from _runtime_common import ensure_allowed_runtime_profile, fixture_ids_from_golden_pack, load_runtime_bundle, state_file_path, write_json


def find_seed_profile(seed_profiles: dict[str, Any], seed_profile_ref: str) -> dict[str, Any]:
    for profile in seed_profiles["profiles"]:
        if profile["seed_profile_ref"] == seed_profile_ref:
            return profile
    raise SystemExit(f"Unknown seed profile {seed_profile_ref}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
      "--runtime-profile",
      choices=["local", "devcontainer", "local-provisioning"],
      default="local",
    )
    parser.add_argument("--seed-profile")
    parser.add_argument("--state-dir", type=Path, required=True)
    args = parser.parse_args()

    bundle = load_runtime_bundle()
    environment_ref = ensure_allowed_runtime_profile(bundle, args.runtime_profile)
    seed_profile_ref = args.seed_profile or bundle["seed_profiles"]["default_seed_profile_ref"]
    seed_profile = find_seed_profile(bundle["seed_profiles"], seed_profile_ref)
    if seed_profile["environment_ref"] != environment_ref:
        raise SystemExit(
            f"Seed profile {seed_profile_ref} targets {seed_profile['environment_ref']}, not {environment_ref}",
        )

    known_fixture_ids = fixture_ids_from_golden_pack(bundle["golden_pack_seed"])
    unknown = [fixture_id for fixture_id in seed_profile["required_fixture_ids"] if fixture_id not in known_fixture_ids]
    if unknown:
        raise SystemExit(f"Seed profile references unknown fixture ids: {', '.join(unknown)}")

    services = {service["service_ref"]: service for service in bundle["topology"]["services"]}
    state = {
        "state_version": "LOCAL_RUNTIME_STATE_V1",
        "runtime_profile_ref": args.runtime_profile,
        "environment_ref": environment_ref,
        "seed_profile_ref": seed_profile_ref,
        "deterministic_golden_pack_hash": bundle["golden_pack_seed"]["expected_golden_pack_hash"],
        "control_store_schema_bundle_hash": bundle["schema_bundle_catalog"]["currentImportedSchemaBundleHash"],
        "validator_status": "SKIPPED",
        "smoke_results": {},
        "markers": {
            "audit_append_probe_ready": True,
            "cache_namespace_refs": services["CACHE"]["namespace_refs"],
            "control_store_database_ready": True,
            "control_store_schema_bundle_hash": bundle["schema_bundle_catalog"][
                "currentImportedSchemaBundleHash"
            ],
            "deterministic_golden_pack_hash": bundle["golden_pack_seed"]["expected_golden_pack_hash"],
            "object_storage_bucket_refs": services["OBJECT_STORAGE"]["namespace_refs"],
            "queue_namespace_refs": services["QUEUE"]["namespace_refs"],
            "seed_profile_ref": seed_profile_ref,
            "validator_status": "SKIPPED",
        },
    }

    write_json(state_file_path(args.state_dir), state)
    print(json.dumps(state, indent=2))


if __name__ == "__main__":
    main()
