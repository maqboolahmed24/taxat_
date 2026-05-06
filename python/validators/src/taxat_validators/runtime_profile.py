from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any, Mapping, cast
from urllib.parse import urlparse


REPO_ROOT = Path(__file__).resolve().parents[4]
RUNTIME_CATALOG_PATH = REPO_ROOT / "config" / "runtime" / "runtime_environment_catalog.json"
PROVIDER_MATRIX_PATH = REPO_ROOT / "config" / "runtime" / "provider_environment_matrix.json"
SECRET_POLICY_PATH = REPO_ROOT / "config" / "runtime" / "secret_injection_policy.json"


class PythonRuntimeProfileError(RuntimeError):
    def __init__(self, code: str, detail: str, env_key: str | None = None) -> None:
        suffix = f" [key={env_key}]" if env_key else ""
        super().__init__(f"{code}: {detail}{suffix}")
        self.code = code
        self.env_key = env_key


def _read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text())


def _runtime_catalog() -> dict[str, Any]:
    return _read_json(RUNTIME_CATALOG_PATH)


def _provider_matrix() -> dict[str, Any]:
    return _read_json(PROVIDER_MATRIX_PATH)


def _secret_policy() -> dict[str, Any]:
    return _read_json(SECRET_POLICY_PATH)


def _consumer_row(catalog: dict[str, Any]) -> dict[str, Any]:
    for row in catalog["consumer_classes"]:
        if row["consumer_ref"] == "PYTHON":
            return row
    raise PythonRuntimeProfileError("RUNTIME_ENV_KEY_MISSING", "PYTHON consumer row is absent")


def _key_index(catalog: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {row["env_key"]: row for row in catalog["runtime_key_catalog"]}


def _resolution_ladder(policy: dict[str, Any]) -> list[str]:
    for row in policy["consumer_resolution_ladders"]:
        if row["consumer_ref"] == "PYTHON":
            return list(row["order"])
    raise PythonRuntimeProfileError("RUNTIME_ENV_KEY_MISSING", "PYTHON resolution ladder is absent")


def _handle_policy_index(policy: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {row["env_key"]: row for row in policy["handle_env_keys"]}


def _required_for_consumer(
    consumer_ref: str, catalog: dict[str, Any], consumer: dict[str, Any]
) -> set[str]:
    required_keys = set(consumer.get("allowed_env_keys", []))
    for row in catalog["runtime_key_catalog"]:
        if consumer_ref in row.get("required_for", []):
            required_keys.add(row["env_key"])
    return required_keys


def _assert_non_empty(value: str | None, env_key: str) -> str:
    if value is None:
        raise PythonRuntimeProfileError(
            "RUNTIME_ENV_KEY_MISSING",
            "required environment key is absent",
            env_key,
        )
    trimmed = value.strip()
    if not trimmed:
        raise PythonRuntimeProfileError(
            "RUNTIME_ENV_EMPTY",
            "present environment key resolved to an empty string",
            env_key,
        )
    return trimmed


def _coerce_scalar(definition: dict[str, Any], raw_value: str | None) -> bool | int | str:
    env_key = definition["env_key"]
    trimmed = _assert_non_empty(raw_value, env_key)
    value_kind = definition["value_kind"]

    if value_kind in {"STRING", "PATH"}:
        return trimmed
    if value_kind == "INTEGER":
        try:
            return int(trimmed)
        except ValueError as error:
            raise PythonRuntimeProfileError(
                "RUNTIME_ENV_COERCION_FAILED",
                f"expected integer but received {trimmed}",
                env_key,
            ) from error
    if value_kind == "BOOLEAN":
        if trimmed == "true":
            return True
        if trimmed == "false":
            return False
        raise PythonRuntimeProfileError(
            "RUNTIME_ENV_COERCION_FAILED",
            f"expected boolean literal true|false but received {trimmed}",
            env_key,
        )
    if value_kind == "URL":
        parsed = urlparse(trimmed)
        if not parsed.scheme or not parsed.netloc:
            raise PythonRuntimeProfileError(
                "RUNTIME_ENV_COERCION_FAILED",
                f"expected absolute URL but received {trimmed}",
                env_key,
            )
        return trimmed.rstrip("/")
    if value_kind == "ENUM":
        allowed_values = set(definition.get("allowed_values", []))
        if trimmed not in allowed_values:
            raise PythonRuntimeProfileError(
                "RUNTIME_ENV_COERCION_FAILED",
                f"expected one of {sorted(allowed_values)} but received {trimmed}",
                env_key,
            )
        return trimmed
    raise PythonRuntimeProfileError(
        "RUNTIME_ENV_COERCION_FAILED",
        f"secret handles must not be parsed as scalar values for {env_key}",
        env_key,
    )


def _find_environment_row(matrix: dict[str, Any], environment_ref: str) -> dict[str, Any]:
    for row in matrix["environment_rows"]:
        if row["environment_ref"] == environment_ref:
            return row
    raise PythonRuntimeProfileError(
        "RUNTIME_ENV_PROVIDER_MISMATCH",
        f"environment {environment_ref} is not present in provider_environment_matrix.json",
        "TAXAT_ENVIRONMENT_ID",
    )


def _matches_pattern(value: str, pattern: str) -> bool:
    regex = "^" + re.escape(pattern).replace("\\*", ".*") + "$"
    return re.match(regex, value) is not None


def _local_bootstrap_path(
    env: Mapping[str, str],
    policy: dict[str, Any],
    ladder: list[str],
) -> Path | None:
    bootstrap_key = policy["local_bootstrap_policy"]["env_key"]
    if "PROCESS_ENV" in ladder:
        candidate = env.get(bootstrap_key)
        if candidate:
            return Path(candidate)
    return None


def _local_bootstrap_map(path: Path | None) -> dict[str, str]:
    if path is None:
        return {}
    parsed = json.loads(path.read_text())
    if not isinstance(parsed, dict):
        raise PythonRuntimeProfileError(
            "RUNTIME_LOCAL_BOOTSTRAP_FORBIDDEN",
            "local bootstrap payload must be a JSON object",
            "TAXAT_LOCAL_SECRET_BOOTSTRAP_FILE",
        )
    parsed_map = cast(dict[str, Any], parsed)
    normalized: dict[str, str] = {}
    for key, value in parsed_map.items():
        normalized[key] = value if isinstance(value, str) else json.dumps(value)
    return normalized


def _required_payload_string(payload: Mapping[str, Any], field: str, env_key: str) -> str:
    value = payload.get(field)
    if not isinstance(value, str) or not value.strip():
        raise PythonRuntimeProfileError(
            "RUNTIME_ENV_COERCION_FAILED",
            f"secret handle must carry {field}",
            env_key,
        )
    return value


def _resolve_value(
    env_key: str,
    allowed_sources: list[str],
    ladder: list[str],
    env: Mapping[str, str],
    local_bootstrap: Mapping[str, str],
) -> str | None:
    for source in ladder:
        if source not in allowed_sources:
            continue
        if source == "PROCESS_ENV" and env_key in env:
            return env[env_key]
        if source == "LOCAL_FILE_BOOTSTRAP" and env_key in local_bootstrap:
            return local_bootstrap[env_key]
    return None


def _parse_secret_handle(
    raw_value: str,
    definition: dict[str, Any],
    forbidden_fields: list[str],
    env_key: str,
    environment_ref: str,
) -> dict[str, Any]:
    trimmed = _assert_non_empty(raw_value, env_key)
    parsed = json.loads(trimmed)
    if not isinstance(parsed, dict):
        raise PythonRuntimeProfileError(
            "RUNTIME_ENV_COERCION_FAILED",
            "secret handle payload must be a JSON object",
            env_key,
        )
    payload = cast(dict[str, Any], parsed)

    for field in forbidden_fields:
        if field in payload and payload[field] not in (None, ""):
            raise PythonRuntimeProfileError(
                "RUNTIME_SECRET_HANDLE_RAW_VALUE_FORBIDDEN",
                f"raw field {field} is forbidden in Python handle payloads",
                env_key,
            )

    alias_ref = _required_payload_string(payload, "alias_ref", env_key)
    namespace_ref = _required_payload_string(payload, "namespace_ref", env_key)
    metadata_ref = _required_payload_string(payload, "metadata_ref", env_key)
    version_ref = _required_payload_string(payload, "version_ref", env_key)
    store_ref = _required_payload_string(payload, "store_ref", env_key)

    if alias_ref != definition["alias_ref"]:
        raise PythonRuntimeProfileError(
            "RUNTIME_SECRET_HANDLE_FORBIDDEN",
            f"alias {alias_ref} does not match policy alias {definition['alias_ref']}",
            env_key,
        )
    if environment_ref not in definition["allowed_environment_refs"]:
        raise PythonRuntimeProfileError(
            "RUNTIME_SECRET_HANDLE_FORBIDDEN",
            f"environment {environment_ref} is not allowed for this secret handle",
            env_key,
        )
    if namespace_ref not in definition["allowed_namespace_refs"]:
        raise PythonRuntimeProfileError(
            "RUNTIME_ENV_PROVIDER_MISMATCH",
            f"namespace {namespace_ref} is not allowed for this handle",
            env_key,
        )

    return {
        "alias_ref": alias_ref,
        "namespace_ref": namespace_ref,
        "store_ref": store_ref,
        "metadata_ref": metadata_ref,
        "version_ref": version_ref,
        "fingerprint": payload.get("fingerprint"),
        "provider_environment_ref": payload.get("provider_environment_ref"),
        "handle_ref": payload.get("handle_ref"),
        "resolution_mode": definition["resolution_mode"],
        "cache_policy": definition["cache_policy"],
    }


def load_python_runtime_profile(env: Mapping[str, str] | None = None) -> dict[str, Any]:
    runtime_env = dict(os.environ if env is None else env)
    catalog = _runtime_catalog()
    provider_matrix = _provider_matrix()
    policy = _secret_policy()
    consumer = _consumer_row(catalog)
    key_index = _key_index(catalog)
    handle_policies = _handle_policy_index(policy)
    ladder = _resolution_ladder(policy)
    required_keys = _required_for_consumer("PYTHON", catalog, consumer)

    bootstrap_path = _local_bootstrap_path(runtime_env, policy, ladder)
    local_bootstrap = _local_bootstrap_map(bootstrap_path)

    environment_definition = key_index["TAXAT_ENVIRONMENT_ID"]
    environment_raw = _resolve_value(
        "TAXAT_ENVIRONMENT_ID",
        list(environment_definition["allowed_sources"]),
        ladder,
        runtime_env,
        local_bootstrap,
    )
    environment_ref = _coerce_scalar(environment_definition, environment_raw)
    if not isinstance(environment_ref, str):
        raise PythonRuntimeProfileError(
            "RUNTIME_ENV_COERCION_FAILED",
            "environment ref must resolve to a string",
            "TAXAT_ENVIRONMENT_ID",
        )
    environment_row = _find_environment_row(provider_matrix, environment_ref)

    if bootstrap_path is not None:
        bootstrap_policy = policy["local_bootstrap_policy"]
        if "PYTHON" not in bootstrap_policy["allowed_consumer_refs"]:
            raise PythonRuntimeProfileError(
                "RUNTIME_LOCAL_BOOTSTRAP_FORBIDDEN",
                "PYTHON consumer is not allowed to use local bootstrap files",
                "TAXAT_LOCAL_SECRET_BOOTSTRAP_FILE",
            )
        if environment_ref not in bootstrap_policy["allowed_environment_refs"]:
            raise PythonRuntimeProfileError(
                "RUNTIME_LOCAL_BOOTSTRAP_FORBIDDEN",
                f"environment {environment_ref} does not allow local bootstrap files",
                "TAXAT_LOCAL_SECRET_BOOTSTRAP_FILE",
            )
        if not environment_row["local_bootstrap_allowed"]:
            raise PythonRuntimeProfileError(
                "RUNTIME_LOCAL_BOOTSTRAP_FORBIDDEN",
                f"environment {environment_ref} does not allow local bootstrap files",
                "TAXAT_LOCAL_SECRET_BOOTSTRAP_FILE",
            )

    profile: dict[str, Any] = {
        "consumer_ref": "PYTHON",
        "environment_ref": environment_ref,
        "provider_environment_ref": environment_row["provider_environment_ref"],
        "values": {},
        "secret_handles": {},
    }

    allowed_keys = set(consumer["allowed_env_keys"]) | set(consumer["allowed_secret_keys"])
    for env_key in key_index:
        if env_key in allowed_keys:
            continue
        if env_key in runtime_env or env_key in local_bootstrap:
            raise PythonRuntimeProfileError(
                "RUNTIME_ENV_KEY_FORBIDDEN",
                f"PYTHON consumer is not allowed to receive configured key {env_key}",
                env_key,
            )

    for env_key in consumer["allowed_env_keys"]:
        definition = key_index[env_key]
        raw_value = _resolve_value(
            env_key,
            list(definition["allowed_sources"]),
            ladder,
            runtime_env,
            local_bootstrap,
        )
        if raw_value is None:
            if env_key in required_keys:
                raise PythonRuntimeProfileError(
                    "RUNTIME_ENV_KEY_MISSING",
                    "required environment key is absent",
                    env_key,
                )
            continue
        profile["values"][env_key] = _coerce_scalar(definition, raw_value)

    for env_key in consumer["allowed_secret_keys"]:
        definition = key_index[env_key]
        raw_value = _resolve_value(
            env_key,
            list(definition["allowed_sources"]),
            ladder,
            runtime_env,
            local_bootstrap,
        )
        if raw_value is None:
            continue
        profile["secret_handles"][env_key] = _parse_secret_handle(
            raw_value,
            handle_policies[env_key],
            list(policy["local_bootstrap_policy"]["raw_value_fields_forbidden"]),
            env_key,
            environment_ref,
        )

    provider_environment = profile["values"].get("TAXAT_PROVIDER_ENVIRONMENT")
    if provider_environment != environment_row["provider_environment_ref"]:
        raise PythonRuntimeProfileError(
            "RUNTIME_ENV_PROVIDER_MISMATCH",
            (
                f"environment {environment_ref} expects provider "
                f"{environment_row['provider_environment_ref']} but received {provider_environment}"
            ),
            "TAXAT_PROVIDER_ENVIRONMENT",
        )

    hmrc_base_url = profile["values"].get("TAXAT_HMRC_API_BASE_URL")
    if isinstance(hmrc_base_url, str) and environment_row["hmrc_base_url_patterns"]:
        if not any(
            _matches_pattern(hmrc_base_url, pattern)
            for pattern in environment_row["hmrc_base_url_patterns"]
        ):
            raise PythonRuntimeProfileError(
                "RUNTIME_ENV_PROVIDER_MISMATCH",
                f"HMRC base URL {hmrc_base_url} is incompatible with environment {environment_ref}",
                "TAXAT_HMRC_API_BASE_URL",
            )

    browser_base_url = profile["values"].get("TAXAT_BROWSER_PUBLIC_BASE_URL")
    if isinstance(browser_base_url, str) and environment_row["browser_public_origin_patterns"]:
        if not any(
            _matches_pattern(browser_base_url, pattern)
            for pattern in environment_row["browser_public_origin_patterns"]
        ):
            raise PythonRuntimeProfileError(
                "RUNTIME_ENV_PROVIDER_MISMATCH",
                (
                    "browser public base URL "
                    f"{browser_base_url} is incompatible with environment {environment_ref}"
                ),
                "TAXAT_BROWSER_PUBLIC_BASE_URL",
            )

    for env_key, handle in profile["secret_handles"].items():
        namespace_ref = handle["namespace_ref"]
        if namespace_ref not in environment_row["allowed_namespace_refs"]:
            raise PythonRuntimeProfileError(
                "RUNTIME_ENV_PROVIDER_MISMATCH",
                f"namespace {namespace_ref} is not allowed in environment {environment_ref}",
                env_key,
            )

    return profile
