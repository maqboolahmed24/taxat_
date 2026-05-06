from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CATALOG_PATH = REPO_ROOT / "scripts" / "tasks" / "task_catalog.json"
LOCAL_PROVIDER_OVERRIDES_PATH = (
    REPO_ROOT / "config" / "runtime" / "local" / "provider_overrides.json"
)
PROVIDER_MATRIX_PATH = REPO_ROOT / "config" / "runtime" / "provider_environment_matrix.json"
EPHEMERAL_CATALOG_PATH = REPO_ROOT / "infra" / "test" / "ephemeral_environment_catalog.json"


@dataclass(slots=True)
class ProfileResolutionError(Exception):
    code: str
    message: str

    def as_payload(self) -> dict[str, str | bool]:
        return {"ok": False, "code": self.code, "message": self.message}


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def load_task_catalog(catalog_path: Path = DEFAULT_CATALOG_PATH) -> dict[str, Any]:
    return read_json(catalog_path)


def load_provider_overrides() -> dict[str, Any]:
    return read_json(LOCAL_PROVIDER_OVERRIDES_PATH)


def load_provider_matrix() -> dict[str, Any]:
    return read_json(PROVIDER_MATRIX_PATH)


def load_ephemeral_catalog() -> dict[str, Any]:
    return read_json(EPHEMERAL_CATALOG_PATH)


def profiles_by_ref(catalog: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {profile["profileRef"]: profile for profile in catalog["environmentProfiles"]}


def tasks_by_ref(catalog: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {task["taskRef"]: task for task in catalog["tasks"]}


def find_provider_environment_ref(environment_ref: str, matrix: dict[str, Any]) -> str:
    for row in matrix["environment_rows"]:
        if row["environment_ref"] == environment_ref:
            return row["provider_environment_ref"]
    raise ProfileResolutionError(
        "PROVIDER_ENVIRONMENT_NOT_FOUND",
        f"Environment {environment_ref} is missing from provider_environment_matrix.json.",
    )


def validate_runtime_profile(profile: dict[str, Any], provider_overrides: dict[str, Any]) -> None:
    runtime_profile_ref = profile.get("runtimeProfileRef")
    if runtime_profile_ref is None:
        return
    runtime_profiles = provider_overrides["runtime_profiles"]
    if runtime_profile_ref not in runtime_profiles:
        raise ProfileResolutionError(
            "RUNTIME_PROFILE_UNKNOWN",
            f"Runtime profile {runtime_profile_ref} is missing from local provider overrides.",
        )
    allowed = set(provider_overrides["allowed_bootstrap_profile_refs"])
    if runtime_profile_ref not in allowed:
        raise ProfileResolutionError(
            "RUNTIME_PROFILE_NOT_BOOTSTRAPPABLE",
            f"Runtime profile {runtime_profile_ref} is not allowed for governed bootstrap.",
        )
    if profile.get("scopeClassRefOrNull") is not None:
        return
    mapped_environment_ref = runtime_profiles[runtime_profile_ref]["environment_ref"]
    if mapped_environment_ref != profile["environmentRef"]:
        raise ProfileResolutionError(
            "RUNTIME_PROFILE_ENVIRONMENT_MISMATCH",
            (
                f"Profile {profile['profileRef']} resolves to environment {profile['environmentRef']}, "
                f"but runtime profile {runtime_profile_ref} maps to {mapped_environment_ref}."
            ),
        )


def validate_scope_class(profile: dict[str, Any], ephemeral_catalog: dict[str, Any]) -> None:
    scope_class_ref = profile.get("scopeClassRefOrNull")
    if scope_class_ref is None:
        return
    rows = {
        row["scope_class_ref"]: row
        for row in ephemeral_catalog["scope_rows"]
    }
    if scope_class_ref not in rows:
        raise ProfileResolutionError(
            "SCOPE_CLASS_UNKNOWN",
            f"Scope class {scope_class_ref} is missing from ephemeral_environment_catalog.json.",
        )
    expected_environment_ref = rows[scope_class_ref]["environment_ref"]
    if expected_environment_ref != profile["environmentRef"]:
        raise ProfileResolutionError(
            "SCOPE_CLASS_ENVIRONMENT_MISMATCH",
            (
                f"Profile {profile['profileRef']} resolves to environment {profile['environmentRef']}, "
                f"but scope class {scope_class_ref} maps to {expected_environment_ref}."
            ),
        )


def resolve_environment_profile(
    *,
    task_ref: str,
    profile_ref: str,
    catalog_path: Path = DEFAULT_CATALOG_PATH,
    enforce_dangerous: bool = False,
    ack_token: str | None = None,
) -> dict[str, Any]:
    catalog = load_task_catalog(catalog_path)
    task = tasks_by_ref(catalog).get(task_ref)
    if task is None:
        raise ProfileResolutionError(
            "TASK_REF_UNKNOWN",
            f"Unknown task ref {task_ref}.",
        )

    profile = profiles_by_ref(catalog).get(profile_ref)
    if profile is None:
        raise ProfileResolutionError(
            "PROFILE_REF_UNKNOWN",
            f"Unknown environment profile {profile_ref}.",
        )

    if profile_ref not in task["supportedProfileRefs"]:
        raise ProfileResolutionError(
            "TASK_PROFILE_NOT_SUPPORTED",
            f"Task {task_ref} does not support profile {profile_ref}.",
        )

    provider_overrides = load_provider_overrides()
    provider_matrix = load_provider_matrix()
    ephemeral_catalog = load_ephemeral_catalog()

    validate_runtime_profile(profile, provider_overrides)
    validate_scope_class(profile, ephemeral_catalog)

    destructive_posture = task["destructivePosture"]
    typed_confirmation = task["typedConfirmationRefOrNull"]
    destructive = destructive_posture != "NON_DESTRUCTIVE"
    if destructive and not profile["destructiveProfileAllowed"]:
        raise ProfileResolutionError(
            "UNSUPPORTED_ENVIRONMENT_PROFILE_FOR_DESTRUCTIVE_COMMAND",
            (
                f"Profile {profile_ref} is validation-only for destructive task {task_ref}; "
                "choose a local or explicitly destructive-capable profile."
            ),
        )

    if enforce_dangerous and destructive:
        if not typed_confirmation:
            raise ProfileResolutionError(
                "DANGEROUS_COMMAND_MISSING_TYPED_CONFIRMATION",
                f"Task {task_ref} is destructive but the catalog does not define a typed confirmation ref.",
            )
        if ack_token != typed_confirmation:
            raise ProfileResolutionError(
                "DANGEROUS_PROFILE_ACK_REQUIRED",
                (
                    f"Task {task_ref} requires typed confirmation {typed_confirmation} "
                    f"for profile {profile_ref}."
                ),
            )

    provider_environment_ref = find_provider_environment_ref(profile["environmentRef"], provider_matrix)
    runtime_profile_ref = profile.get("runtimeProfileRef")
    runtime_profile_row = None
    if runtime_profile_ref is not None:
        runtime_profile_row = provider_overrides["runtime_profiles"][runtime_profile_ref]

    return {
      "ok": True,
      "taskRef": task_ref,
      "profileRef": profile_ref,
      "environmentRef": profile["environmentRef"],
      "runtimeProfileRef": runtime_profile_ref,
      "scopeClassRefOrNull": profile.get("scopeClassRefOrNull"),
      "providerEnvironmentRef": provider_environment_ref,
      "destructiveProfileAllowed": profile["destructiveProfileAllowed"],
      "destructivePosture": destructive_posture,
      "typedConfirmationRefOrNull": typed_confirmation,
      "runtimeProfileSafeForLiveProvidersOrNull": None if runtime_profile_row is None else runtime_profile_row["safe_for_live_providers"],
      "notes": profile["notes"],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--task-ref", required=True)
    parser.add_argument("--profile", required=True)
    parser.add_argument("--catalog-path", type=Path, default=DEFAULT_CATALOG_PATH)
    parser.add_argument("--enforce-dangerous", action="store_true")
    parser.add_argument("--ack-token")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    try:
        payload = resolve_environment_profile(
            task_ref=args.task_ref,
            profile_ref=args.profile,
            catalog_path=args.catalog_path,
            enforce_dangerous=args.enforce_dangerous,
            ack_token=args.ack_token,
        )
    except ProfileResolutionError as error:
        if args.json:
            print(json.dumps(error.as_payload(), indent=2))
        else:
            print(f"PROFILE_EVENT::{json.dumps(error.as_payload(), sort_keys=True)}")
        raise SystemExit(1) from error

    if args.json:
        print(json.dumps(payload, indent=2))
    else:
        print(f"PROFILE_EVENT::{json.dumps(payload, sort_keys=True)}")


if __name__ == "__main__":
    main()
