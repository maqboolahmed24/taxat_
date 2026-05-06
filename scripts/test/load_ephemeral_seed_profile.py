from __future__ import annotations

import argparse
import json
from pathlib import Path

from _ephemeral_common import (
    build_seed_material,
    environment_dir_path,
    identity_payload,
    load_ephemeral_bundle,
    load_manifest_if_present,
    seed_material_path,
    write_json,
)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--environment-id", required=True)
    parser.add_argument("--scope-class")
    parser.add_argument("--owner-ref")
    parser.add_argument("--shard-ref")
    parser.add_argument("--runtime-profile")
    parser.add_argument("--seed-profile")
    parser.add_argument("--state-dir", type=Path, required=True)
    args = parser.parse_args()

    bundle = load_ephemeral_bundle()
    manifest = load_manifest_if_present(args.state_dir, args.environment_id)

    if manifest:
        identity = {
            "environment_id": manifest["environment_id"],
            "environment_ref": manifest["environment_ref"],
            "scope_class_ref": manifest["scope_class_ref"],
            "owner_ref": manifest["owner_ref"],
            "shard_ref": manifest["shard_ref"],
            "runtime_profile_ref": manifest["runtime_profile_ref"],
            "seed_profile_ref": manifest["seed_profile_ref"],
            "environment_identity_hash": manifest["environment_identity_hash"],
            "namespace_hash": manifest["namespace_hash"],
        }
    else:
        required = {
            "scope_class": args.scope_class,
            "owner_ref": args.owner_ref,
            "shard_ref": args.shard_ref,
            "runtime_profile": args.runtime_profile,
            "seed_profile": args.seed_profile,
        }
        missing = [key for key, value in required.items() if not value]
        if missing:
            raise SystemExit(
                "Missing explicit identity inputs for seed load: " + ", ".join(sorted(missing))
            )
        identity = identity_payload(
            bundle,
            environment_id=args.environment_id,
            scope_class_ref=args.scope_class,
            owner_ref=args.owner_ref,
            shard_ref=args.shard_ref,
            runtime_profile_ref=args.runtime_profile,
            seed_profile_ref=args.seed_profile,
        )

    seed_material = build_seed_material(bundle, identity)
    write_json(seed_material_path(args.state_dir, args.environment_id), seed_material)
    environment_dir_path(args.state_dir, args.environment_id).mkdir(parents=True, exist_ok=True)
    print(json.dumps(seed_material, indent=2))


if __name__ == "__main__":
    main()
