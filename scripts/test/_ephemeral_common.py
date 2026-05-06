from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"{json.dumps(payload, indent=2, sort_keys=True)}\n", encoding="utf-8")


def stable_hash(payload: Any) -> str:
    return hashlib.sha256(
        json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()


def apply_template(template: str, replacements: dict[str, str]) -> str:
    rendered = template
    for key, value in replacements.items():
        rendered = rendered.replace("${" + key + "}", value)
    return rendered


def catalog_path() -> Path:
    return REPO_ROOT / "infra" / "test" / "ephemeral_environment_catalog.json"


def lifecycle_policy_path() -> Path:
    return REPO_ROOT / "infra" / "test" / "ephemeral_environment_lifecycle_policy.json"


def reset_scope_policy_path() -> Path:
    return REPO_ROOT / "infra" / "test" / "reset_scope_policy.json"


def reset_evidence_schema_path() -> Path:
    return REPO_ROOT / "infra" / "test" / "reset_evidence.schema.json"


def seed_profiles_path() -> Path:
    return REPO_ROOT / "config" / "runtime" / "local" / "local_seed_profiles.json"


def local_runtime_topology_path() -> Path:
    return REPO_ROOT / "infra" / "local" / "local_runtime_topology.json"


def schema_bundle_catalog_path() -> Path:
    return REPO_ROOT / "config" / "migrations" / "schema_bundle_version_catalog.json"


def deterministic_golden_pack_path() -> Path:
    return REPO_ROOT / "fixtures" / "synthetic" / "deterministic_golden_pack_seed.json"


def load_ephemeral_bundle() -> dict[str, Any]:
    return {
        "catalog": read_json(catalog_path()),
        "lifecycle_policy": read_json(lifecycle_policy_path()),
        "reset_scope_policy": read_json(reset_scope_policy_path()),
        "reset_evidence_schema": read_json(reset_evidence_schema_path()),
        "seed_profiles": read_json(seed_profiles_path()),
        "local_runtime_topology": read_json(local_runtime_topology_path()),
        "schema_bundle_catalog": read_json(schema_bundle_catalog_path()),
        "golden_pack_seed": read_json(deterministic_golden_pack_path()),
    }


def environment_dir_path(state_dir: Path, environment_id: str) -> Path:
    return state_dir / environment_id


def manifest_path(state_dir: Path, environment_id: str) -> Path:
    return environment_dir_path(state_dir, environment_id) / "environment_manifest.json"


def seed_material_path(state_dir: Path, environment_id: str) -> Path:
    return environment_dir_path(state_dir, environment_id) / "seed_material.json"


def cleanliness_report_path(state_dir: Path, environment_id: str) -> Path:
    return environment_dir_path(state_dir, environment_id) / "cleanliness_report.json"


def evidence_dir_path(state_dir: Path, environment_id: str) -> Path:
    return environment_dir_path(state_dir, environment_id) / "evidence"


def load_manifest_if_present(state_dir: Path, environment_id: str) -> dict[str, Any] | None:
    path = manifest_path(state_dir, environment_id)
    if not path.exists():
        return None
    return read_json(path)


def scope_row(bundle: dict[str, Any], scope_class_ref: str) -> dict[str, Any]:
    for row in bundle["catalog"]["scope_rows"]:
        if row["scope_class_ref"] == scope_class_ref:
            return row
    raise SystemExit(f"Unknown ephemeral scope class {scope_class_ref}")


def seed_profile_row(bundle: dict[str, Any], seed_profile_ref: str) -> dict[str, Any]:
    for row in bundle["seed_profiles"]["profiles"]:
        if row["seed_profile_ref"] == seed_profile_ref:
            return row
    raise SystemExit(f"Unknown seed profile {seed_profile_ref}")


def reset_scope_row(bundle: dict[str, Any], reset_scope_ref: str) -> dict[str, Any]:
    for row in bundle["reset_scope_policy"]["reset_scope_rows"]:
        if row["reset_scope_ref"] == reset_scope_ref:
            return row
    raise SystemExit(f"Unknown reset scope {reset_scope_ref}")


def ensure_ephemeral_environment_id(bundle: dict[str, Any], environment_id: str) -> None:
    pattern = re.compile(bundle["catalog"]["naming_contract"]["environment_id_pattern"])
    if not pattern.fullmatch(environment_id):
        raise SystemExit(
            f"Environment id {environment_id} violates the approved ephemeral pattern."
        )


def ensure_owner_ref(bundle: dict[str, Any], scope_class_ref: str, owner_ref: str) -> None:
    row = scope_row(bundle, scope_class_ref)
    pattern = re.compile(row["owner_ref_pattern"])
    if not pattern.fullmatch(owner_ref):
        raise SystemExit(f"Owner ref {owner_ref} is invalid for {scope_class_ref}")


def ensure_ephemeral_manifest(
    bundle: dict[str, Any], manifest: dict[str, Any], environment_id: str
) -> None:
    ensure_ephemeral_environment_id(bundle, environment_id)
    if manifest["environment_id"] != environment_id:
        raise SystemExit(
            f"Manifest environment id {manifest['environment_id']} does not match explicit target {environment_id}"
        )
    allowed_envs = {row["environment_ref"] for row in bundle["catalog"]["scope_rows"]}
    if manifest["environment_ref"] not in allowed_envs:
        raise SystemExit(
            f"Environment ref {manifest['environment_ref']} is not ephemeral and cannot be targeted."
        )


def identity_payload(
    bundle: dict[str, Any],
    *,
    environment_id: str,
    scope_class_ref: str,
    owner_ref: str,
    shard_ref: str,
    runtime_profile_ref: str,
    seed_profile_ref: str,
) -> dict[str, Any]:
    scope = scope_row(bundle, scope_class_ref)
    ensure_ephemeral_environment_id(bundle, environment_id)
    ensure_owner_ref(bundle, scope_class_ref, owner_ref)
    seed_profile_row(bundle, seed_profile_ref)

    identity_hash = stable_hash(
        {
            "environment_id": environment_id,
            "environment_ref": scope["environment_ref"],
            "owner_ref": owner_ref,
            "runtime_profile_ref": runtime_profile_ref,
            "scope_class_ref": scope_class_ref,
            "seed_profile_ref": seed_profile_ref,
            "shard_ref": shard_ref,
        }
    )
    namespace_length = bundle["catalog"]["naming_contract"]["namespace_hash_length"]
    return {
        "environment_id": environment_id,
        "environment_ref": scope["environment_ref"],
        "scope_class_ref": scope_class_ref,
        "owner_ref": owner_ref,
        "shard_ref": shard_ref,
        "runtime_profile_ref": runtime_profile_ref,
        "seed_profile_ref": seed_profile_ref,
        "environment_identity_hash": identity_hash,
        "namespace_hash": identity_hash[:namespace_length],
    }


def derive_namespaces(bundle: dict[str, Any], identity: dict[str, Any]) -> dict[str, Any]:
    replacements = {
        "environment_id": identity["environment_id"],
        "namespace_hash": identity["namespace_hash"],
    }
    resources = {
        row["resource_class_ref"]: apply_template(row["namespace_template"], replacements)
        for row in bundle["catalog"]["resource_class_rows"]
    }
    return {
        "control_schema_ref": resources["CONTROL_SCHEMA"],
        "audit_schema_ref": resources["AUDIT_SCHEMA"],
        "object_prefix_refs": [
            resources["OBJECT_PREFIX_STAGING"],
            resources["OBJECT_PREFIX_QUARANTINE"],
            resources["OBJECT_PREFIX_DERIVED"],
        ],
        "queue_namespace_refs": [resources["QUEUE_NAMESPACE_SET"]],
        "dlq_namespace_refs": [resources["DLQ_NAMESPACE_SET"]],
        "cache_namespace_refs": [resources["CACHE_NAMESPACE_SET"]],
        "projection_namespace_ref": resources["PROJECTION_NAMESPACE_SET"],
        "stream_cursor_namespace_ref": resources["STREAM_CURSOR_SET"],
        "upload_session_namespace_ref": resources["UPLOAD_SESSION_SET"],
        "worker_lease_namespace_ref": resources["WORKER_LEASE_SET"],
        "audit_stream_namespace_ref": resources["AUDIT_STREAM_SET"],
    }


def compute_seed_profile_hash(bundle: dict[str, Any], seed_profile_ref: str) -> str:
    profile = seed_profile_row(bundle, seed_profile_ref)
    return stable_hash(
        {
            "embodiment_refs": profile["embodiment_refs"],
            "environment_ref": profile["environment_ref"],
            "golden_pack_hash": bundle["golden_pack_seed"]["expected_golden_pack_hash"],
            "required_fixture_ids": profile["required_fixture_ids"],
            "seed_profile_ref": profile["seed_profile_ref"],
            "smoke_contract_refs": profile["smoke_contract_refs"],
        }
    )


def build_seed_material(bundle: dict[str, Any], identity: dict[str, Any]) -> dict[str, Any]:
    profile = seed_profile_row(bundle, identity["seed_profile_ref"])
    seed_profile_hash = compute_seed_profile_hash(bundle, identity["seed_profile_ref"])
    namespace_hash = identity["namespace_hash"]
    return {
        "material_version": "EPHEMERAL_SEED_MATERIAL_V1",
        "environment_id": identity["environment_id"],
        "environment_identity_hash": identity["environment_identity_hash"],
        "seed_profile_ref": identity["seed_profile_ref"],
        "seed_profile_hash": seed_profile_hash,
        "golden_pack_hash": bundle["golden_pack_seed"]["expected_golden_pack_hash"],
        "deterministic_seed_refs": profile["deterministic_seed_refs"],
        "embodiment_refs": profile["embodiment_refs"],
        "required_fixture_ids": profile["required_fixture_ids"],
        "browser_session": {
            "actor_alias": f"fixture.operator.{namespace_hash}",
            "session_ref": f"session.ephemeral.{namespace_hash}",
            "client_ref": f"client.synthetic.{namespace_hash}",
        },
        "route_identity_ref": f"/ephemeral/environments/{identity['environment_id']}/work-items/{namespace_hash}",
        "queue_flow_ref": f"queue.ephemeral.{namespace_hash}.stage-work",
        "upload_object_ref": f"object.ephemeral.upload.{namespace_hash}",
        "upload_session_ref": f"upload.session.ephemeral.{namespace_hash}",
        "request_version_ref": f"request.version.ephemeral.{namespace_hash}.v1",
        "cache_partition_ref": f"cache.ephemeral.{namespace_hash}.workspace",
        "retry_rebase_token": f"rebase.token.{namespace_hash}",
    }


def zero_resource_counts(manifest: dict[str, Any]) -> dict[str, Any]:
    state = dict(manifest["resource_state"])
    state["active_worker_leases"] = 0
    state["queue_message_count"] = 0
    state["cache_key_count"] = 0
    state["projection_count"] = 0
    state["stream_cursor_count"] = 0
    state["upload_session_count"] = 0
    state["object_prefix_object_counts"] = {
        key: 0 for key in state["object_prefix_object_counts"].keys()
    }
    return state


def initial_manifest(
    bundle: dict[str, Any],
    identity: dict[str, Any],
    *,
    debug_retention_active: bool,
) -> tuple[dict[str, Any], dict[str, Any]]:
    namespaces = derive_namespaces(bundle, identity)
    seed_material = build_seed_material(bundle, identity)
    manifest = {
        "manifest_version": "EPHEMERAL_ENVIRONMENT_MANIFEST_V1",
        "environment_id": identity["environment_id"],
        "environment_ref": identity["environment_ref"],
        "scope_class_ref": identity["scope_class_ref"],
        "owner_ref": identity["owner_ref"],
        "shard_ref": identity["shard_ref"],
        "runtime_profile_ref": identity["runtime_profile_ref"],
        "runtime_topology_ref": bundle["local_runtime_topology"]["topology_id"],
        "control_store_schema_bundle_hash": bundle["schema_bundle_catalog"][
            "currentImportedSchemaBundleHash"
        ],
        "environment_identity_hash": identity["environment_identity_hash"],
        "namespace_hash": identity["namespace_hash"],
        "seed_profile_ref": identity["seed_profile_ref"],
        "seed_profile_hash": seed_material["seed_profile_hash"],
        "golden_pack_hash": bundle["golden_pack_seed"]["expected_golden_pack_hash"],
        "lifecycle_state": "REQUESTED",
        "current_phase_ref": "IDENTITY_LOCK",
        "completed_phase_refs": [],
        "chronology": [
            {
                "at": "2026-04-23T00:00:00Z",
                "event_ref": "environment.requested",
                "phase_ref": "IDENTITY_LOCK",
                "lifecycle_state": "REQUESTED",
                "status": "SUCCEEDED",
                "detail": f"Ephemeral environment {identity['environment_id']} requested explicitly.",
            }
        ],
        "namespaces": namespaces,
        "resource_state": {
            "service_availability": {
                "AUDIT_STORE": True,
                "CACHE": True,
                "CONTROL_STORE": True,
                "OBJECT_STORAGE": True,
                "QUEUE": True,
            },
            "active_worker_leases": 0,
            "queue_message_count": 0,
            "cache_key_count": 0,
            "projection_count": 0,
            "stream_cursor_count": 0,
            "upload_session_count": 0,
            "control_schema_row_count": len(seed_material["required_fixture_ids"]),
            "audit_schema_row_count": 1,
            "object_prefix_object_counts": {
                prefix: 0 for prefix in namespaces["object_prefix_refs"]
            },
            "last_reset_scope_ref_or_null": None,
            "debug_retention_active": debug_retention_active,
        },
        "browser_attachment": {
            "environment_identity_chip": identity["environment_id"],
            "session_fixture_alias": seed_material["browser_session"]["actor_alias"],
            "route_identity_ref": seed_material["route_identity_ref"],
            "queue_flow_ref": seed_material["queue_flow_ref"],
            "upload_object_ref": seed_material["upload_object_ref"],
            "cache_partition_ref": seed_material["cache_partition_ref"],
            "retry_rebase_token": seed_material["retry_rebase_token"],
        },
        "seed_material_hash": stable_hash(seed_material),
        "last_cleanliness_hash_or_null": None,
        "reset_counter": 0,
        "last_reset_evidence_ref_or_null": None,
    }
    return manifest, seed_material


def transition_allowed(
    bundle: dict[str, Any], from_state: str, to_state: str, phase_ref: str
) -> bool:
    return any(
        row["from_state"] == from_state
        and row["to_state"] == to_state
        and row["allowed_phase_ref"] == phase_ref
        for row in bundle["lifecycle_policy"]["transition_rows"]
    )


def transition_manifest(
    bundle: dict[str, Any],
    manifest: dict[str, Any],
    *,
    at: str,
    to_state: str,
    phase_ref: str,
    event_ref: str,
    detail: str,
    status: str = "SUCCEEDED",
) -> dict[str, Any]:
    if not transition_allowed(bundle, manifest["lifecycle_state"], to_state, phase_ref):
        raise SystemExit(
            f"Illegal lifecycle transition {manifest['lifecycle_state']} -> {to_state} at {phase_ref}"
        )
    next_manifest = dict(manifest)
    next_manifest["lifecycle_state"] = to_state
    next_manifest["current_phase_ref"] = phase_ref
    completed = list(manifest["completed_phase_refs"])
    if status == "SUCCEEDED" and phase_ref not in completed:
        completed.append(phase_ref)
    next_manifest["completed_phase_refs"] = completed
    chronology = list(manifest["chronology"])
    chronology.append(
        {
            "at": at,
            "event_ref": event_ref,
            "phase_ref": phase_ref,
            "lifecycle_state": to_state,
            "status": status,
            "detail": detail,
        }
    )
    next_manifest["chronology"] = chronology
    return next_manifest


def touched_reset_state(
    manifest: dict[str, Any], touched_resource_classes: list[str]
) -> dict[str, Any]:
    state = dict(manifest["resource_state"])
    object_counts = dict(state["object_prefix_object_counts"])

    if "WORKER_LEASE_SET" in touched_resource_classes:
        state["active_worker_leases"] = 0
    if (
        "QUEUE_NAMESPACE_SET" in touched_resource_classes
        or "DLQ_NAMESPACE_SET" in touched_resource_classes
    ):
        state["queue_message_count"] = 0
    if "CACHE_NAMESPACE_SET" in touched_resource_classes:
        state["cache_key_count"] = 0
    if "PROJECTION_NAMESPACE_SET" in touched_resource_classes:
        state["projection_count"] = 0
    if "STREAM_CURSOR_SET" in touched_resource_classes:
        state["stream_cursor_count"] = 0
    if "UPLOAD_SESSION_SET" in touched_resource_classes:
        state["upload_session_count"] = 0
    if "OBJECT_PREFIX_STAGING" in touched_resource_classes:
        object_counts[manifest["namespaces"]["object_prefix_refs"][0]] = 0
    if "OBJECT_PREFIX_QUARANTINE" in touched_resource_classes:
        object_counts[manifest["namespaces"]["object_prefix_refs"][1]] = 0
    if "OBJECT_PREFIX_DERIVED" in touched_resource_classes:
        object_counts[manifest["namespaces"]["object_prefix_refs"][2]] = 0
    state["object_prefix_object_counts"] = object_counts
    return state


def apply_reset_scope(
    bundle: dict[str, Any], manifest: dict[str, Any], reset_scope_ref: str
) -> dict[str, Any]:
    scope = reset_scope_row(bundle, reset_scope_ref)
    next_manifest = dict(manifest)
    state = touched_reset_state(manifest, scope["touched_resource_classes"])
    state["last_reset_scope_ref_or_null"] = reset_scope_ref
    next_manifest["resource_state"] = state
    next_manifest["reset_counter"] = manifest["reset_counter"] + 1
    return next_manifest


def evaluate_cleanliness(
    bundle: dict[str, Any],
    manifest: dict[str, Any],
    *,
    expected_seed_profile_hash: str | None = None,
    require_ready_state: bool = True,
) -> dict[str, Any]:
    failure_codes: list[str] = []
    warning_codes: list[str] = []

    if require_ready_state and manifest["lifecycle_state"] != "READY":
        failure_codes.append("ENVIRONMENT_NOT_READY")
    try:
        ensure_ephemeral_manifest(bundle, manifest, manifest["environment_id"])
    except SystemExit as exc:
        failure_codes.append(str(exc))

    state = manifest["resource_state"]
    if state["active_worker_leases"] != 0:
        failure_codes.append("ACTIVE_WORKER_LEASES_PRESENT")
    if not state["service_availability"]["QUEUE"]:
        failure_codes.append("QUEUE_SERVICE_UNAVAILABLE")
    if not state["service_availability"]["CACHE"]:
        failure_codes.append("CACHE_SERVICE_UNAVAILABLE")
    if not state["service_availability"]["OBJECT_STORAGE"]:
        failure_codes.append("OBJECT_STORAGE_SERVICE_UNAVAILABLE")
    if state["queue_message_count"] != 0:
        failure_codes.append("QUEUE_NOT_EMPTY")
    if state["cache_key_count"] != 0:
        failure_codes.append("CACHE_NOT_EMPTY")
    if state["projection_count"] != 0:
        failure_codes.append("PROJECTION_NOT_EMPTY")
    if state["stream_cursor_count"] != 0:
        failure_codes.append("STREAM_CURSOR_NOT_EMPTY")
    if state["upload_session_count"] != 0:
        failure_codes.append("UPLOAD_SESSIONS_NOT_EMPTY")

    object_total = sum(int(count) for count in state["object_prefix_object_counts"].values())
    if object_total != 0:
        failure_codes.append("OBJECT_PREFIX_NOT_EMPTY")

    current_seed_hash = compute_seed_profile_hash(bundle, manifest["seed_profile_ref"])
    if expected_seed_profile_hash is None:
        expected_seed_profile_hash = current_seed_hash
    if manifest["seed_profile_hash"] != expected_seed_profile_hash:
        failure_codes.append("SEED_PROFILE_HASH_DRIFT")

    if state["debug_retention_active"]:
        warning_codes.append("DEBUG_RETENTION_ACTIVE")

    report = {
        "report_version": "EPHEMERAL_CLEANLINESS_REPORT_V1",
        "environment_id": manifest["environment_id"],
        "environment_identity_hash": manifest["environment_identity_hash"],
        "ok": len(failure_codes) == 0,
        "failureCodes": failure_codes,
        "warningCodes": warning_codes,
        "cleanliness_hash": stable_hash(
            {
                "environment_identity_hash": manifest["environment_identity_hash"],
                "failure_codes": failure_codes,
                "warning_codes": warning_codes,
                "resource_state": {
                    "active_worker_leases": state["active_worker_leases"],
                    "queue_message_count": state["queue_message_count"],
                    "cache_key_count": state["cache_key_count"],
                    "projection_count": state["projection_count"],
                    "stream_cursor_count": state["stream_cursor_count"],
                    "upload_session_count": state["upload_session_count"],
                    "object_prefix_object_counts": state["object_prefix_object_counts"],
                },
                "seed_profile_hash": manifest["seed_profile_hash"],
            }
        ),
        "resource_counts": {
            "active_worker_leases": state["active_worker_leases"],
            "queue_message_count": state["queue_message_count"],
            "cache_key_count": state["cache_key_count"],
            "projection_count": state["projection_count"],
            "stream_cursor_count": state["stream_cursor_count"],
            "upload_session_count": state["upload_session_count"],
            "object_prefix_object_count_total": object_total,
        },
    }
    return report


def validate_reset_evidence(bundle: dict[str, Any], evidence: dict[str, Any]) -> None:
    required_keys = set(bundle["reset_evidence_schema"].get("required", []))
    for key in required_keys:
        if key not in evidence:
            raise SystemExit(f"Reset evidence is missing required key {key}")
    if evidence["evidence_version"] != "EPHEMERAL_RESET_EVIDENCE_V1":
        raise SystemExit("Reset evidence version drifted")
    if evidence["action_kind"] not in {"RESET", "DESTROY"}:
        raise SystemExit(f"Unsupported reset evidence action {evidence['action_kind']}")


def build_reset_evidence(
    bundle: dict[str, Any],
    manifest: dict[str, Any],
    *,
    action_kind: str,
    chronology: list[dict[str, Any]],
    outcome: str,
    residual_warnings: list[str],
    reset_scope_ref: str,
) -> dict[str, Any]:
    cleanliness = evaluate_cleanliness(
        bundle,
        manifest,
        expected_seed_profile_hash=manifest["seed_profile_hash"],
        require_ready_state=action_kind == "RESET",
    )
    evidence: dict[str, Any] = {
        "evidence_version": "EPHEMERAL_RESET_EVIDENCE_V1",
        "action_kind": action_kind,
        "environment_id": manifest["environment_id"],
        "environment_identity_hash": manifest["environment_identity_hash"],
        "environment_ref": manifest["environment_ref"],
        "reset_scope_ref": reset_scope_ref,
        "seed_profile_ref": manifest["seed_profile_ref"],
        "seed_profile_hash": manifest["seed_profile_hash"],
        "golden_pack_hash": manifest["golden_pack_hash"],
        "approved_target_pattern": bundle["catalog"]["naming_contract"]["environment_id_pattern"],
        "chronology": chronology,
        "resource_counts": cleanliness["resource_counts"],
        "residual_warnings": residual_warnings,
        "outcome": outcome,
        "source_lineage": [
            bundle["catalog"]["catalog_id"],
            bundle["lifecycle_policy"]["policy_id"],
            bundle["reset_scope_policy"]["policy_id"],
            manifest["runtime_topology_ref"],
        ],
    }
    validate_reset_evidence(bundle, evidence)
    return evidence
