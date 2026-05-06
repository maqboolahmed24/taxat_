from __future__ import annotations

import argparse
import json
from pathlib import Path

from _ephemeral_common import (
    apply_reset_scope,
    build_reset_evidence,
    ensure_ephemeral_manifest,
    cleanliness_report_path,
    compute_seed_profile_hash,
    environment_dir_path,
    evaluate_cleanliness,
    evidence_dir_path,
    load_ephemeral_bundle,
    load_manifest_if_present,
    manifest_path,
    reset_scope_row,
    seed_material_path,
    stable_hash,
    transition_manifest,
    write_json,
    build_seed_material,
)


def reset_event(at: str, event_ref: str, status: str, detail: str) -> dict[str, str]:
    return {"at": at, "event_ref": event_ref, "status": status, "detail": detail}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--environment-id", required=True)
    parser.add_argument("--reset-scope", default="FULL_TEST_ISOLATION")
    parser.add_argument("--state-dir", type=Path, required=True)
    parser.add_argument("--force-fence-workers", action="store_true")
    args = parser.parse_args()

    bundle = load_ephemeral_bundle()
    manifest = load_manifest_if_present(args.state_dir, args.environment_id)
    if not manifest:
        raise SystemExit(f"Unknown ephemeral environment {args.environment_id}")
    ensure_ephemeral_manifest(bundle, manifest, args.environment_id)

    reset_scope = reset_scope_row(bundle, args.reset_scope)
    chronology: list[dict[str, str]] = []

    resetting = transition_manifest(
        bundle,
        manifest,
        at="2026-04-23T02:00:00Z",
        to_state="RESETTING",
        phase_ref="IDENTITY_LOCK",
        event_ref="reset.identity-locked",
        detail="Explicit environment identity revalidated before reset.",
    )
    write_json(manifest_path(args.state_dir, args.environment_id), resetting)
    chronology.append(
        reset_event(
            "2026-04-23T02:00:00Z",
            "reset.identity-locked",
            "SUCCEEDED",
            "Explicit environment identity revalidated before reset.",
        )
    )

    if resetting["resource_state"]["active_worker_leases"] > 0 and not args.force_fence_workers:
        halted = transition_manifest(
            bundle,
            resetting,
            at="2026-04-23T02:00:05Z",
            to_state="HALTED",
            phase_ref="RUNTIME_HEALTH_GATE",
            event_ref="reset.worker-lease-halt",
            detail="Reset halted because workers still hold live leases.",
            status="HALTED",
        )
        write_json(manifest_path(args.state_dir, args.environment_id), halted)
        chronology.append(
            reset_event(
                "2026-04-23T02:00:05Z",
                "reset.worker-lease-halt",
                "HALTED",
                "Reset halted because workers still hold live leases.",
            )
        )
        evidence = build_reset_evidence(
            bundle,
            halted,
            action_kind="RESET",
            chronology=chronology,
            outcome="HALTED",
            residual_warnings=[],
            reset_scope_ref=args.reset_scope,
        )
        evidence_path = evidence_dir_path(args.state_dir, args.environment_id) / "reset-halted.json"
        write_json(evidence_path, evidence)
        print(json.dumps({"manifest": halted, "evidence": evidence}, indent=2))
        raise SystemExit(1)

    if (
        not resetting["resource_state"]["service_availability"]["QUEUE"]
        or not resetting["resource_state"]["service_availability"]["CACHE"]
    ):
        halted = transition_manifest(
            bundle,
            resetting,
            at="2026-04-23T02:00:10Z",
            to_state="HALTED",
            phase_ref="RUNTIME_HEALTH_GATE",
            event_ref="reset.service-unavailable-halt",
            detail="Reset halted because queue or cache service is unavailable.",
            status="HALTED",
        )
        write_json(manifest_path(args.state_dir, args.environment_id), halted)
        chronology.append(
            reset_event(
                "2026-04-23T02:00:10Z",
                "reset.service-unavailable-halt",
                "HALTED",
                "Reset halted because queue or cache service is unavailable.",
            )
        )
        evidence = build_reset_evidence(
            bundle,
            halted,
            action_kind="RESET",
            chronology=chronology,
            outcome="HALTED",
            residual_warnings=[],
            reset_scope_ref=args.reset_scope,
        )
        evidence_path = evidence_dir_path(args.state_dir, args.environment_id) / "reset-halted.json"
        write_json(evidence_path, evidence)
        print(json.dumps({"manifest": halted, "evidence": evidence}, indent=2))
        raise SystemExit(1)

    if args.force_fence_workers and resetting["resource_state"]["active_worker_leases"] > 0:
        chronology.append(
            reset_event(
                "2026-04-23T02:00:15Z",
                "reset.worker-leases-fenced",
                "SUCCEEDED",
                "Worker leases fenced before reset.",
            )
        )

    reset_manifest = transition_manifest(
        bundle,
        resetting,
        at="2026-04-23T02:00:20Z",
        to_state="RESETTING",
        phase_ref="NAMESPACE_PROVISION",
        event_ref="reset.namespaces-recreated",
        detail=f"Reset scope {args.reset_scope} recreated or purged approved namespaces.",
    )
    reset_manifest = apply_reset_scope(bundle, reset_manifest, args.reset_scope)
    write_json(manifest_path(args.state_dir, args.environment_id), reset_manifest)
    chronology.append(
        reset_event(
            "2026-04-23T02:00:20Z",
            "reset.namespaces-recreated",
            "SUCCEEDED",
            f"Reset scope {args.reset_scope} recreated or purged approved namespaces.",
        )
    )

    if reset_scope["reseed_required"]:
        seed_material = build_seed_material(
            bundle,
            {
                "environment_id": reset_manifest["environment_id"],
                "environment_ref": reset_manifest["environment_ref"],
                "scope_class_ref": reset_manifest["scope_class_ref"],
                "owner_ref": reset_manifest["owner_ref"],
                "shard_ref": reset_manifest["shard_ref"],
                "runtime_profile_ref": reset_manifest["runtime_profile_ref"],
                "seed_profile_ref": reset_manifest["seed_profile_ref"],
                "environment_identity_hash": reset_manifest["environment_identity_hash"],
                "namespace_hash": reset_manifest["namespace_hash"],
            },
        )
        write_json(seed_material_path(args.state_dir, args.environment_id), seed_material)
        reset_manifest["seed_material_hash"] = stable_hash(seed_material)
        reset_manifest = transition_manifest(
            bundle,
            reset_manifest,
            at="2026-04-23T02:00:30Z",
            to_state="RESETTING",
            phase_ref="SEED_LOAD",
            event_ref="reset.seed-material-reloaded",
            detail="Deterministic seed material reloaded after full-isolation reset.",
        )
        write_json(manifest_path(args.state_dir, args.environment_id), reset_manifest)
        chronology.append(
            reset_event(
                "2026-04-23T02:00:30Z",
                "reset.seed-material-reloaded",
                "SUCCEEDED",
                "Deterministic seed material reloaded after full-isolation reset.",
            )
        )

    report = evaluate_cleanliness(
        bundle,
        reset_manifest,
        expected_seed_profile_hash=compute_seed_profile_hash(
            bundle, reset_manifest["seed_profile_ref"]
        ),
        require_ready_state=False,
    )
    write_json(cleanliness_report_path(args.state_dir, args.environment_id), report)

    if not report["ok"]:
        failed = transition_manifest(
            bundle,
            reset_manifest,
            at="2026-04-23T02:00:40Z",
            to_state="FAILED",
            phase_ref="CLEANLINESS_VERIFY",
            event_ref="reset.cleanliness-failed",
            detail="Reset finished with residual drift or uncleared state.",
            status="FAILED",
        )
        failed["last_cleanliness_hash_or_null"] = report["cleanliness_hash"]
        write_json(manifest_path(args.state_dir, args.environment_id), failed)
        chronology.append(
            reset_event(
                "2026-04-23T02:00:40Z",
                "reset.cleanliness-failed",
                "FAILED",
                "Reset finished with residual drift or uncleared state.",
            )
        )
        evidence = build_reset_evidence(
            bundle,
            failed,
            action_kind="RESET",
            chronology=chronology,
            outcome="FAILED",
            residual_warnings=report["warningCodes"],
            reset_scope_ref=args.reset_scope,
        )
        evidence_path = (
            evidence_dir_path(args.state_dir, args.environment_id)
            / f"reset-{failed['reset_counter']:04d}.json"
        )
        write_json(evidence_path, evidence)
        print(
            json.dumps({"manifest": failed, "cleanliness": report, "evidence": evidence}, indent=2)
        )
        raise SystemExit(1)

    ready = transition_manifest(
        bundle,
        reset_manifest,
        at="2026-04-23T02:00:50Z",
        to_state="READY",
        phase_ref="CLEANLINESS_VERIFY",
        event_ref="reset.cleanliness-verified",
        detail="Reset finished and the environment matches the declared basis.",
    )
    ready["last_cleanliness_hash_or_null"] = report["cleanliness_hash"]
    evidence = build_reset_evidence(
        bundle,
        ready,
        action_kind="RESET",
        chronology=chronology
        + [
            reset_event(
                "2026-04-23T02:00:50Z",
                "reset.cleanliness-verified",
                "SUCCEEDED",
                "Reset finished and the environment matches the declared basis.",
            )
        ],
        outcome="SUCCEEDED",
        residual_warnings=report["warningCodes"],
        reset_scope_ref=args.reset_scope,
    )
    evidence_path = (
        evidence_dir_path(args.state_dir, args.environment_id)
        / f"reset-{ready['reset_counter']:04d}.json"
    )
    write_json(evidence_path, evidence)
    ready["last_reset_evidence_ref_or_null"] = str(
        evidence_path.relative_to(environment_dir_path(args.state_dir, args.environment_id))
    )
    write_json(manifest_path(args.state_dir, args.environment_id), ready)
    print(json.dumps({"manifest": ready, "cleanliness": report, "evidence": evidence}, indent=2))


if __name__ == "__main__":
    main()
