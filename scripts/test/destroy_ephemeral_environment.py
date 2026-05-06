from __future__ import annotations

import argparse
import json
from pathlib import Path

from _ephemeral_common import (
    build_reset_evidence,
    cleanliness_report_path,
    evidence_dir_path,
    ensure_ephemeral_manifest,
    load_ephemeral_bundle,
    load_manifest_if_present,
    manifest_path,
    seed_material_path,
    transition_manifest,
    write_json,
    zero_resource_counts,
)


def destroy_event(at: str, event_ref: str, status: str, detail: str) -> dict[str, str]:
    return {"at": at, "event_ref": event_ref, "status": status, "detail": detail}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--environment-id", required=True)
    parser.add_argument("--state-dir", type=Path, required=True)
    parser.add_argument("--override-debug-retention", action="store_true")
    args = parser.parse_args()

    bundle = load_ephemeral_bundle()
    manifest = load_manifest_if_present(args.state_dir, args.environment_id)
    if not manifest:
        raise SystemExit(f"Unknown ephemeral environment {args.environment_id}")
    ensure_ephemeral_manifest(bundle, manifest, args.environment_id)

    chronology: list[dict[str, str]] = []
    destroy_pending = transition_manifest(
        bundle,
        manifest,
        at="2026-04-23T03:00:00Z",
        to_state="DESTROY_PENDING",
        phase_ref="IDENTITY_LOCK",
        event_ref="destroy.identity-locked",
        detail="Explicit environment identity revalidated before destroy.",
    )
    write_json(manifest_path(args.state_dir, args.environment_id), destroy_pending)
    chronology.append(
        destroy_event(
            "2026-04-23T03:00:00Z",
            "destroy.identity-locked",
            "SUCCEEDED",
            "Explicit environment identity revalidated before destroy.",
        )
    )

    if (
        destroy_pending["resource_state"]["debug_retention_active"]
        and not args.override_debug_retention
    ):
        halted = transition_manifest(
            bundle,
            destroy_pending,
            at="2026-04-23T03:00:10Z",
            to_state="HALTED",
            phase_ref="DESTROY_CLEANUP",
            event_ref="destroy.debug-retention-blocked",
            detail="Destroy blocked because debug retention remains active.",
            status="HALTED",
        )
        write_json(manifest_path(args.state_dir, args.environment_id), halted)
        chronology.append(
            destroy_event(
                "2026-04-23T03:00:10Z",
                "destroy.debug-retention-blocked",
                "HALTED",
                "Destroy blocked because debug retention remains active.",
            )
        )
        evidence = build_reset_evidence(
            bundle,
            halted,
            action_kind="DESTROY",
            chronology=chronology,
            outcome="HALTED",
            residual_warnings=["DEBUG_RETENTION_ACTIVE"],
            reset_scope_ref="DESTROY_ENVIRONMENT",
        )
        evidence_path = (
            evidence_dir_path(args.state_dir, args.environment_id) / "destroy-halted.json"
        )
        write_json(evidence_path, evidence)
        print(json.dumps({"manifest": halted, "evidence": evidence}, indent=2))
        raise SystemExit(1)

    seed_path = seed_material_path(args.state_dir, args.environment_id)
    if seed_path.exists():
        seed_path.unlink()
    clean_path = cleanliness_report_path(args.state_dir, args.environment_id)
    if clean_path.exists():
        clean_path.unlink()

    destroy_pending["resource_state"] = zero_resource_counts(destroy_pending)

    destroyed = transition_manifest(
        bundle,
        destroy_pending,
        at="2026-04-23T03:00:20Z",
        to_state="DESTROYED",
        phase_ref="DESTROY_CLEANUP",
        event_ref="destroy.completed",
        detail="Ephemeral namespaces destroyed and only evidence retained.",
    )
    write_json(manifest_path(args.state_dir, args.environment_id), destroyed)
    chronology.append(
        destroy_event(
            "2026-04-23T03:00:20Z",
            "destroy.completed",
            "SUCCEEDED",
            "Ephemeral namespaces destroyed and only evidence retained.",
        )
    )

    evidence = build_reset_evidence(
        bundle,
        destroyed,
        action_kind="DESTROY",
        chronology=chronology,
        outcome="SUCCEEDED",
        residual_warnings=[],
        reset_scope_ref="DESTROY_ENVIRONMENT",
    )
    evidence_path = evidence_dir_path(args.state_dir, args.environment_id) / "destroy-0001.json"
    write_json(evidence_path, evidence)
    destroyed["last_reset_evidence_ref_or_null"] = str(
        evidence_path.relative_to(evidence_path.parents[1])
    )
    write_json(manifest_path(args.state_dir, args.environment_id), destroyed)
    print(json.dumps({"manifest": destroyed, "evidence": evidence}, indent=2))


if __name__ == "__main__":
    main()
