#!/usr/bin/env python3
"""Lint the provisioning secret policy pack for obvious omissions and unsafe posture."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any


REQUIRED_RECORD_FIELDS = [
    "secret_class_id",
    "label",
    "classification",
    "owner_role",
    "owning_system",
    "namespace_refs",
    "environment_refs",
    "vault_namespace_pattern",
    "key_naming_pattern",
    "allowed_capture_channel_ids",
    "allowed_persistence_layer_ids",
    "forbidden_persistence_location_ids",
    "rotation_trigger_ids",
    "max_active_versions",
    "attestation_requirement",
    "secret_version_required",
    "cutover_sequence_id",
    "human_entry_rule",
    "machine_ingest_rule",
    "evidence_requirement_ids",
    "log_policy",
]

REQUIRED_LOG_SURFACES = {"general_log", "screenshot", "trace", "dom_snapshot"}
HIGH_SENSITIVITY_CLASSES = {"SENSITIVE", "HIGHLY_SENSITIVE", "CRITICAL"}
STRICT_SECRET_CLASSES = {"HIGHLY_SENSITIVE", "CRITICAL"}
STRICT_ALLOWED_LAYERS = {
    "VAULT_SECRET_VALUE",
    "VAULT_METADATA",
    "CONTROL_STORE_REF_ONLY",
    "SECURE_OPERATOR_DEVICE_CACHE",
    "EPHEMERAL_PROCESS_MEMORY",
    "SECRET_MANAGER_ALIAS",
}
MINIMUM_STATIC_FORBIDDEN = {
    "REPO_TRACKED_FILE",
    "DOCS_AND_MARKDOWN",
    "CI_STDOUT_STDERR",
    "GENERAL_APPLICATION_LOG",
    "PLAYWRIGHT_TRACE",
    "PLAYWRIGHT_SCREENSHOT",
    "DOM_SNAPSHOT",
    "HTML_REPORT",
    "SHELL_HISTORY",
    "UNMANAGED_BROWSER_STORAGE",
    "CHAT_TICKET_EMAIL",
    "DOWNLOADS_AND_CLIPBOARD",
}


def load_json(path: Path) -> Any:
    try:
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    except FileNotFoundError as exc:
        raise SystemExit(f"Missing required file: {path}") from exc


def ensure(condition: bool, message: str, errors: list[str]) -> None:
    if not condition:
        errors.append(message)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--repo-root",
        type=Path,
        default=Path(__file__).resolve().parents[2],
        help="Repository root. Defaults to the current Taxat repo root.",
    )
    args = parser.parse_args()

    repo_root = args.repo_root.resolve()

    inventory_path = repo_root / "data/security/provisioning_secret_inventory.json"
    rotation_path = repo_root / "data/security/secret_lineage_and_rotation_matrix.json"
    channels_path = repo_root / "data/security/provider_credential_capture_channels.json"
    redaction_path = repo_root / "data/security/redaction_and_log_sanitization_rules.json"
    bootstrap_path = repo_root / "data/security/bootstrap_secret_seeding_contract.json"
    schema_map_path = repo_root / "data/security/secret_version_and_attestation_schema_map.json"
    forbidden_path = repo_root / "data/security/forbidden_secret_persistence_locations.json"
    namespace_plan_path = repo_root / "data/analysis/environment_secret_namespace_plan.json"
    secret_schema_path = repo_root / "Algorithm/schemas/secret_version.schema.json"

    inventory = load_json(inventory_path)
    rotation = load_json(rotation_path)
    channels = load_json(channels_path)
    redaction = load_json(redaction_path)
    bootstrap = load_json(bootstrap_path)
    schema_map = load_json(schema_map_path)
    forbidden = load_json(forbidden_path)
    namespace_plan = load_json(namespace_plan_path)
    secret_schema = load_json(secret_schema_path)

    errors: list[str] = []

    ensure(
        secret_schema.get("title") == "SecretVersion",
        "Algorithm secret_version schema title must remain SecretVersion.",
        errors,
    )

    known_namespaces = {
        row["secret_namespace_ref"]
        for row in namespace_plan.get("secret_namespace_rows", [])
    }
    known_channel_ids = {
        row["channel_id"] for row in channels.get("channel_definitions", [])
    }
    known_forbidden_ids = {
        row["location_id"] for row in forbidden.get("location_definitions", [])
    }
    minimum_forbidden = set(forbidden.get("minimum_global_forbidden_location_ids", []))
    rotation_by_id = {
        row["sequence_id"]: row for row in rotation.get("rotation_sequences", [])
    }
    schema_map_by_class = {
        row["secret_class_id"]: row for row in schema_map.get("schema_mappings", [])
    }
    channel_binding_by_class = {
        row["secret_class_id"]: row for row in channels.get("secret_class_bindings", [])
    }
    redaction_rule_ids = {
        row["rule_id"] for row in redaction.get("pattern_rules", [])
    }

    ensure(
        minimum_forbidden == MINIMUM_STATIC_FORBIDDEN,
        "Forbidden-location minimum set drifted from the required provisioning baseline.",
        errors,
    )

    inventory_rows = inventory.get("secret_inventory", [])
    ensure(bool(inventory_rows), "Provisioning secret inventory is empty.", errors)

    known_class_ids: set[str] = set()

    for row in inventory_rows:
        class_id = row.get("secret_class_id", "<missing>")
        known_class_ids.add(class_id)

        for field in REQUIRED_RECORD_FIELDS:
            ensure(field in row, f"{class_id}: missing required field {field}.", errors)

        if any(field not in row for field in REQUIRED_RECORD_FIELDS):
            continue

        ensure(
            row["classification"] in inventory.get("classification_levels", []),
            f"{class_id}: invalid classification {row['classification']}.",
            errors,
        )
        ensure(
            bool(row["owner_role"]),
            f"{class_id}: owner_role must be non-empty.",
            errors,
        )
        ensure(
            bool(row["vault_namespace_pattern"]),
            f"{class_id}: vault_namespace_pattern must be non-empty.",
            errors,
        )
        ensure(
            bool(row["key_naming_pattern"]),
            f"{class_id}: key_naming_pattern must be non-empty.",
            errors,
        )
        ensure(
            isinstance(row["max_active_versions"], int) and row["max_active_versions"] >= 1,
            f"{class_id}: max_active_versions must be an integer >= 1.",
            errors,
        )
        ensure(
            REQUIRED_LOG_SURFACES.issubset(set(row["log_policy"].keys())),
            f"{class_id}: log_policy must cover {sorted(REQUIRED_LOG_SURFACES)}.",
            errors,
        )

        unknown_namespace_refs = sorted(set(row["namespace_refs"]) - known_namespaces)
        ensure(
            not unknown_namespace_refs,
            f"{class_id}: unknown namespace refs {unknown_namespace_refs}.",
            errors,
        )

        unknown_channels = sorted(set(row["allowed_capture_channel_ids"]) - known_channel_ids)
        ensure(
            not unknown_channels,
            f"{class_id}: unknown capture channels {unknown_channels}.",
            errors,
        )

        unknown_forbidden = sorted(
            set(row["forbidden_persistence_location_ids"]) - known_forbidden_ids
        )
        ensure(
            not unknown_forbidden,
            f"{class_id}: unknown forbidden locations {unknown_forbidden}.",
            errors,
        )

        if row["classification"] in HIGH_SENSITIVITY_CLASSES:
            ensure(
                minimum_forbidden.issubset(set(row["forbidden_persistence_location_ids"])),
                f"{class_id}: sensitive classes must forbid the full provisioning sink baseline.",
                errors,
            )

        if row["classification"] in STRICT_SECRET_CLASSES:
            disallowed_layers = sorted(
                set(row["allowed_persistence_layer_ids"]) - STRICT_ALLOWED_LAYERS
            )
            ensure(
                not disallowed_layers,
                f"{class_id}: high-sensitivity secrets allow unsafe persistence layers {disallowed_layers}.",
                errors,
            )

        sequence = rotation_by_id.get(row["cutover_sequence_id"])
        ensure(
            sequence is not None,
            f"{class_id}: unknown cutover sequence {row['cutover_sequence_id']}.",
            errors,
        )
        if sequence is not None:
            ensure(
                class_id in sequence.get("secret_class_ids", []),
                f"{class_id}: cutover sequence {row['cutover_sequence_id']} does not include this class.",
                errors,
            )

        schema_entry = schema_map_by_class.get(class_id)
        ensure(
            schema_entry is not None,
            f"{class_id}: missing schema map entry.",
            errors,
        )
        if schema_entry is not None:
            ensure(
                row["secret_version_required"] == schema_entry.get("secret_version_required"),
                f"{class_id}: secret_version_required disagrees with schema map.",
                errors,
            )
            if row["secret_version_required"]:
                ensure(
                    schema_entry.get("schema_path") == "Algorithm/schemas/secret_version.schema.json",
                    f"{class_id}: versioned secrets must map to Algorithm/schemas/secret_version.schema.json.",
                    errors,
                )
                ensure(
                    schema_entry.get("schema_title") == "SecretVersion",
                    f"{class_id}: versioned secrets must map to schema title SecretVersion.",
                    errors,
                )
                ensure(
                    sequence is not None and sequence.get("secret_version_required") is True,
                    f"{class_id}: versioned secrets require a versioned cutover sequence.",
                    errors,
                )

        binding = channel_binding_by_class.get(class_id)
        ensure(
            binding is not None,
            f"{class_id}: missing capture-channel binding entry.",
            errors,
        )
        if binding is not None:
            ensure(
                set(binding.get("allowed_channel_ids", [])) == set(row["allowed_capture_channel_ids"]),
                f"{class_id}: inventory channels differ from provider_credential_capture_channels.json.",
                errors,
            )

        if "PROVIDER_ONE_TIME_REVEAL_CAPTURE" in row["allowed_capture_channel_ids"]:
            ensure(
                row["log_policy"]["screenshot"] == "SUPPRESS"
                and row["log_policy"]["trace"] == "SUPPRESS"
                and row["log_policy"]["dom_snapshot"] == "SUPPRESS",
                f"{class_id}: one-time reveal classes must suppress screenshot, trace, and DOM capture.",
                errors,
            )

        if (
            row["classification"] in STRICT_SECRET_CLASSES
            and "MANUAL_SECURE_ENTRY_AT_CHECKPOINT" in row["allowed_capture_channel_ids"]
        ):
            ensure(
                row["log_policy"]["screenshot"] == "SUPPRESS"
                and row["log_policy"]["trace"] == "SUPPRESS"
                and row["log_policy"]["dom_snapshot"] == "SUPPRESS",
                f"{class_id}: high-sensitivity manual-entry classes must suppress browser artifacts.",
                errors,
            )

    # Sequence checks.
    for sequence_id, sequence in rotation_by_id.items():
        steps = sequence.get("steps", [])
        orders = [step["order"] for step in steps]
        ensure(
            orders == sorted(orders) and len(orders) == len(set(orders)),
            f"{sequence_id}: rotation steps must have unique ascending order.",
            errors,
        )

    hmrc_sequence = rotation_by_id.get("hmrc-client-secret-rotate")
    if hmrc_sequence is not None:
        hmrc_step_kinds = [step["step_kind"] for step in hmrc_sequence.get("steps", [])]
        ensure(
            hmrc_sequence.get("provider_hard_limit") == 5,
            "hmrc-client-secret-rotate must record the current HMRC provider hard limit of 5.",
            errors,
        )
        ensure(
            hmrc_sequence.get("max_concurrent_versions") == 2,
            "hmrc-client-secret-rotate must keep Taxat's stricter planned overlap limit of 2.",
            errors,
        )
        required_hmrc_steps = [
            "ISSUE_NEW_VERSION",
            "UPDATE_DEPENDENT_VAULT_REFS",
            "VERIFY_CUTOVER",
            "ATTEST_ROTATION",
            "RETIRE_OLD_VERSION",
        ]
        ensure(
            hmrc_step_kinds == required_hmrc_steps,
            "hmrc-client-secret-rotate must preserve the exact safe HMRC cutover order.",
            errors,
        )

    # Bootstrap seeding checks.
    seen_seeded_classes: set[str] = set()
    for row in bootstrap.get("environment_seeding_rows", []):
        env_id = row.get("environment_id")
        ensure(
            bool(env_id),
            "bootstrap contract rows must carry environment_id.",
            errors,
        )
        unknown_seed_namespaces = sorted(set(row.get("secret_namespace_refs", [])) - known_namespaces)
        ensure(
            not unknown_seed_namespaces,
            f"{env_id}: bootstrap contract references unknown namespaces {unknown_seed_namespaces}.",
            errors,
        )
        unknown_seed_classes = sorted(set(row.get("permitted_secret_class_ids", [])) - known_class_ids)
        ensure(
            not unknown_seed_classes,
            f"{env_id}: bootstrap contract references unknown secret classes {unknown_seed_classes}.",
            errors,
        )
        seen_seeded_classes.update(row.get("permitted_secret_class_ids", []))

        if env_id in {"env_ci_ephemeral_validation", "env_ephemeral_review_preview", "env_local_authoring"}:
            ensure(
                row.get("raw_secret_delivery_allowed") is False,
                f"{env_id}: non-provider-trusted environments must not permit raw secret delivery.",
                errors,
            )

    missing_seed_coverage = sorted(
        class_id
        for class_id in known_class_ids
        if class_id != "manual_checkpoint_secret_entry_artifact_ref" and class_id not in seen_seeded_classes
    )
    ensure(
        not missing_seed_coverage,
        f"Bootstrap seeding contract is missing classes: {missing_seed_coverage}.",
        errors,
    )

    # Redaction checks.
    for rule in redaction.get("pattern_rules", []):
        try:
            re.compile(rule["pattern"])
        except re.error as exc:
            errors.append(f"Redaction rule {rule['rule_id']} has invalid regex: {exc}")

    for class_id, required_rule_ids in redaction.get("required_rule_ids_for_inventory_classes", {}).items():
        ensure(
            class_id in known_class_ids,
            f"Redaction rules reference unknown secret class {class_id}.",
            errors,
        )
        missing_rules = sorted(set(required_rule_ids) - redaction_rule_ids)
        ensure(
            not missing_rules,
            f"{class_id}: missing required redaction rules {missing_rules}.",
            errors,
        )

    if errors:
        for message in errors:
            print(f"ERROR: {message}")
        return 1

    print("PASS: provisioning secret inventory, rotation matrix, and capture policy validated.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
