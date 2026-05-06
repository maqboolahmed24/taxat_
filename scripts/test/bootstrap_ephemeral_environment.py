from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from _ephemeral_common import (
    build_seed_material,
    cleanliness_report_path,
    compute_seed_profile_hash,
    identity_payload,
    initial_manifest,
    load_ephemeral_bundle,
    load_manifest_if_present,
    manifest_path,
    seed_material_path,
    stable_hash,
    transition_manifest,
    write_json,
    evaluate_cleanliness,
)


PHASE_CLOCK = {
    "IDENTITY_LOCK": "2026-04-23T01:00:00Z",
    "RUNTIME_HEALTH_GATE": "2026-04-23T01:00:10Z",
    "NAMESPACE_PROVISION": "2026-04-23T01:00:20Z",
    "MIGRATION_BASIS": "2026-04-23T01:00:30Z",
    "SEED_LOAD": "2026-04-23T01:00:40Z",
    "CLEANLINESS_VERIFY": "2026-04-23T01:00:50Z",
}


def current_manifest_or_new(
    bundle: dict[str, Any],
    *,
    environment_id: str,
    scope_class: str,
    owner_ref: str,
    shard_ref: str,
    runtime_profile: str,
    seed_profile: str,
    state_dir: Path,
    debug_retention_active: bool,
) -> tuple[dict[str, Any], dict[str, Any]]:
    manifest = load_manifest_if_present(state_dir, environment_id)
    if manifest:
        expected = {
            "scope_class_ref": scope_class,
            "owner_ref": owner_ref,
            "shard_ref": shard_ref,
            "runtime_profile_ref": runtime_profile,
        }
        for key, expected_value in expected.items():
            if manifest[key] != expected_value:
                raise SystemExit(
                    f"Existing manifest {key}={manifest[key]} does not match explicit bootstrap input {expected_value}"
                )
        if manifest["seed_profile_ref"] != seed_profile:
            raise SystemExit(
                f"Existing manifest seed profile {manifest['seed_profile_ref']} does not match explicit bootstrap input {seed_profile}"
            )
        seed_material = build_seed_material(
            bundle,
            {
                "environment_id": manifest["environment_id"],
                "environment_ref": manifest["environment_ref"],
                "scope_class_ref": manifest["scope_class_ref"],
                "owner_ref": manifest["owner_ref"],
                "shard_ref": manifest["shard_ref"],
                "runtime_profile_ref": manifest["runtime_profile_ref"],
                "seed_profile_ref": manifest["seed_profile_ref"],
                "environment_identity_hash": manifest["environment_identity_hash"],
                "namespace_hash": manifest["namespace_hash"],
            },
        )
        return manifest, seed_material

    identity = identity_payload(
        bundle,
        environment_id=environment_id,
        scope_class_ref=scope_class,
        owner_ref=owner_ref,
        shard_ref=shard_ref,
        runtime_profile_ref=runtime_profile,
        seed_profile_ref=seed_profile,
    )
    return initial_manifest(
        bundle,
        identity,
        debug_retention_active=debug_retention_active,
    )


def mark_bootstrap_step(
    bundle: dict[str, Any],
    manifest: dict[str, Any],
    *,
    phase_ref: str,
    event_ref: str,
    detail: str,
    to_state: str,
    status: str = "SUCCEEDED",
) -> dict[str, Any]:
    return transition_manifest(
        bundle,
        manifest,
        at=PHASE_CLOCK[phase_ref],
        to_state=to_state,
        phase_ref=phase_ref,
        event_ref=event_ref,
        detail=detail,
        status=status,
    )


def maybe_halt_after_phase(
    bundle: dict[str, Any],
    manifest: dict[str, Any],
    *,
    halt_after_phase: str | None,
    phase_ref: str,
    state_dir: Path,
) -> None:
    if halt_after_phase != phase_ref:
        return
    halted = mark_bootstrap_step(
        bundle,
        manifest,
        phase_ref=phase_ref,
        event_ref=f"{phase_ref.lower()}.halted",
        detail=f"Bootstrap halted explicitly after {phase_ref}.",
        to_state="HALTED",
        status="HALTED",
    )
    write_json(manifest_path(state_dir, manifest["environment_id"]), halted)
    raise SystemExit(1)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--environment-id", required=True)
    parser.add_argument("--scope-class", required=True)
    parser.add_argument("--owner-ref", required=True)
    parser.add_argument("--shard-ref", required=True)
    parser.add_argument("--runtime-profile", required=True)
    parser.add_argument("--seed-profile")
    parser.add_argument("--state-dir", type=Path, required=True)
    parser.add_argument("--halt-after-phase", choices=["MIGRATION_BASIS", "SEED_LOAD"])
    parser.add_argument("--debug-retention-active", action="store_true")
    args = parser.parse_args()

    bundle = load_ephemeral_bundle()
    scope_default_seed = next(
        row["default_seed_profile_ref"]
        for row in bundle["catalog"]["scope_rows"]
        if row["scope_class_ref"] == args.scope_class
    )
    seed_profile = args.seed_profile or scope_default_seed
    manifest, seed_material = current_manifest_or_new(
        bundle,
        environment_id=args.environment_id,
        scope_class=args.scope_class,
        owner_ref=args.owner_ref,
        shard_ref=args.shard_ref,
        runtime_profile=args.runtime_profile,
        seed_profile=seed_profile,
        state_dir=args.state_dir,
        debug_retention_active=args.debug_retention_active,
    )

    if manifest["lifecycle_state"] == "READY" and manifest["seed_profile_ref"] == seed_profile:
        report = evaluate_cleanliness(
            bundle,
            manifest,
            expected_seed_profile_hash=compute_seed_profile_hash(bundle, seed_profile),
        )
        write_json(cleanliness_report_path(args.state_dir, args.environment_id), report)
        print(json.dumps({"manifest": manifest, "cleanliness": report}, indent=2))
        return

    requested = manifest
    if requested["lifecycle_state"] in {"REQUESTED", "HALTED"}:
        requested = mark_bootstrap_step(
            bundle,
            requested,
            phase_ref="IDENTITY_LOCK",
            event_ref="environment.identity-locked",
            detail="Explicit environment identity and seed basis accepted.",
            to_state="BOOTSTRAPPING",
        )
    write_json(manifest_path(args.state_dir, args.environment_id), requested)

    runtime_gated = requested
    if "RUNTIME_HEALTH_GATE" not in runtime_gated["completed_phase_refs"]:
        runtime_gated = mark_bootstrap_step(
            bundle,
            runtime_gated,
            phase_ref="RUNTIME_HEALTH_GATE",
            event_ref="environment.runtime-health-gated",
            detail="Shared local runtime topology acknowledged for ephemeral namespace work.",
            to_state="BOOTSTRAPPING",
        )
    write_json(manifest_path(args.state_dir, args.environment_id), runtime_gated)

    provisioned = runtime_gated
    if "NAMESPACE_PROVISION" not in provisioned["completed_phase_refs"]:
        provisioned = mark_bootstrap_step(
            bundle,
            provisioned,
            phase_ref="NAMESPACE_PROVISION",
            event_ref="environment.namespaces-provisioned",
            detail="Ephemeral schemas, object prefixes, queue namespaces, cache partitions, cursors, and worker leases derived.",
            to_state="BOOTSTRAPPING",
        )
    write_json(manifest_path(args.state_dir, args.environment_id), provisioned)

    migrated = provisioned
    if "MIGRATION_BASIS" not in migrated["completed_phase_refs"]:
        migrated = mark_bootstrap_step(
            bundle,
            migrated,
            phase_ref="MIGRATION_BASIS",
            event_ref="environment.migration-basis-recorded",
            detail="Current schema bundle attached before deterministic seed load.",
            to_state="BOOTSTRAPPING",
        )
    write_json(manifest_path(args.state_dir, args.environment_id), migrated)
    maybe_halt_after_phase(
        bundle,
        migrated,
        halt_after_phase=args.halt_after_phase,
        phase_ref="MIGRATION_BASIS",
        state_dir=args.state_dir,
    )

    seeded = migrated
    if "SEED_LOAD" not in seeded["completed_phase_refs"]:
        write_json(seed_material_path(args.state_dir, args.environment_id), seed_material)
        seeded["seed_material_hash"] = stable_hash(seed_material)
        seeded = mark_bootstrap_step(
            bundle,
            seeded,
            phase_ref="SEED_LOAD",
            event_ref="environment.seed-material-loaded",
            detail="Deterministic seed material loaded from the reviewed fixture basis.",
            to_state="BOOTSTRAPPING",
        )
    write_json(manifest_path(args.state_dir, args.environment_id), seeded)
    maybe_halt_after_phase(
        bundle,
        seeded,
        halt_after_phase=args.halt_after_phase,
        phase_ref="SEED_LOAD",
        state_dir=args.state_dir,
    )

    cleanliness = evaluate_cleanliness(
        bundle,
        seeded,
        expected_seed_profile_hash=compute_seed_profile_hash(bundle, seed_profile),
        require_ready_state=False,
    )
    write_json(cleanliness_report_path(args.state_dir, args.environment_id), cleanliness)

    if not cleanliness["ok"]:
        failed = mark_bootstrap_step(
            bundle,
            seeded,
            phase_ref="CLEANLINESS_VERIFY",
            event_ref="environment.cleanliness-failed",
            detail="Environment cleanliness verification failed during bootstrap.",
            to_state="FAILED",
            status="FAILED",
        )
        failed["last_cleanliness_hash_or_null"] = cleanliness["cleanliness_hash"]
        write_json(manifest_path(args.state_dir, args.environment_id), failed)
        print(json.dumps({"manifest": failed, "cleanliness": cleanliness}, indent=2))
        raise SystemExit(1)

    ready = mark_bootstrap_step(
        bundle,
        seeded,
        phase_ref="CLEANLINESS_VERIFY",
        event_ref="environment.cleanliness-verified",
        detail="Environment matches the declared deterministic basis.",
        to_state="READY",
    )
    ready["last_cleanliness_hash_or_null"] = cleanliness["cleanliness_hash"]
    write_json(manifest_path(args.state_dir, args.environment_id), ready)
    print(json.dumps({"manifest": ready, "cleanliness": cleanliness}, indent=2))


if __name__ == "__main__":
    main()
