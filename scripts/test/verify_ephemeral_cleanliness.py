from __future__ import annotations

import argparse
import json
from pathlib import Path

from _ephemeral_common import (
    cleanliness_report_path,
    compute_seed_profile_hash,
    evaluate_cleanliness,
    load_ephemeral_bundle,
    load_manifest_if_present,
    write_json,
)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--environment-id", required=True)
    parser.add_argument("--state-dir", type=Path, required=True)
    parser.add_argument("--expected-seed-profile-hash")
    parser.add_argument("--allow-non-ready-state", action="store_true")
    args = parser.parse_args()

    bundle = load_ephemeral_bundle()
    manifest = load_manifest_if_present(args.state_dir, args.environment_id)
    if not manifest:
        raise SystemExit(f"Unknown ephemeral environment {args.environment_id}")

    expected_seed_profile_hash = args.expected_seed_profile_hash or compute_seed_profile_hash(
        bundle, manifest["seed_profile_ref"]
    )
    report = evaluate_cleanliness(
        bundle,
        manifest,
        expected_seed_profile_hash=expected_seed_profile_hash,
        require_ready_state=not args.allow_non_ready_state,
    )
    write_json(cleanliness_report_path(args.state_dir, args.environment_id), report)
    print(json.dumps(report, indent=2))
    if not report["ok"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
