from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CATALOG_PATH = REPO_ROOT / "scripts" / "tasks" / "task_catalog.json"
DEFAULT_STATE_DIR = REPO_ROOT / ".tmp" / "task-runner"
LOCAL_RUNTIME_STATE_PATH = Path.home() / ".taxat" / "local-runtime" / "local_runtime_state.json"

AGENT_DIR = REPO_ROOT / "scripts" / "agent"
if str(AGENT_DIR) not in sys.path:
    sys.path.insert(0, str(AGENT_DIR))

from resolve_environment_profile import (  # noqa: E402
    ProfileResolutionError,
    resolve_environment_profile,
)


TOKEN_PATTERN = re.compile(r"\{([a-zA-Z0-9_.-]+)\}")


@dataclass(slots=True)
class TaskGraphError(Exception):
    code: str
    message: str

    def as_payload(self) -> dict[str, str | bool]:
        return {"ok": False, "code": self.code, "message": self.message}


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"{json.dumps(payload, indent=2, sort_keys=True)}\n", encoding="utf-8")


def load_catalog(catalog_path: Path) -> dict[str, Any]:
    return read_json(catalog_path)


def profiles_by_ref(catalog: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {profile["profileRef"]: profile for profile in catalog["environmentProfiles"]}


def tasks_by_ref(catalog: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {task["taskRef"]: task for task in catalog["tasks"]}


def bindings_by_card_id(catalog: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {binding["cardId"]: binding for binding in catalog["cardBindings"]}


def build_alias_map(catalog: dict[str, Any]) -> dict[str, str]:
    aliases: dict[str, str] = {}
    for task in catalog["tasks"]:
        for alias in [task["taskRef"], *task["aliases"], task["makeTarget"]]:
            if alias in aliases and aliases[alias] != task["taskRef"]:
                raise TaskGraphError(
                    "TASK_ALIAS_COLLISION",
                    f"Alias {alias} is declared by both {aliases[alias]} and {task['taskRef']}.",
                )
            aliases[alias] = task["taskRef"]
    return aliases


def validate_catalog(catalog: dict[str, Any]) -> dict[str, Any]:
    task_map = tasks_by_ref(catalog)
    profile_map = profiles_by_ref(catalog)
    if len(task_map) != len(catalog["tasks"]):
        raise TaskGraphError("TASK_REF_COLLISION", "Task refs must be unique.")
    if len(profile_map) != len(catalog["environmentProfiles"]):
        raise TaskGraphError("PROFILE_REF_COLLISION", "Environment profile refs must be unique.")

    alias_map = build_alias_map(catalog)
    for task in catalog["tasks"]:
        for dependency in task["dependsOn"]:
            if dependency not in task_map:
                raise TaskGraphError(
                    "TASK_DEPENDENCY_UNKNOWN",
                    f"Task {task['taskRef']} depends on unknown task {dependency}.",
                )
        for conflict in task["conflictsWith"]:
            if conflict not in task_map:
                raise TaskGraphError(
                    "TASK_CONFLICT_UNKNOWN",
                    f"Task {task['taskRef']} conflicts with unknown task {conflict}.",
                )
        for supported_profile in task["supportedProfileRefs"]:
            if supported_profile not in profile_map:
                raise TaskGraphError(
                    "TASK_PROFILE_UNKNOWN",
                    f"Task {task['taskRef']} references unknown profile {supported_profile}.",
                )

    visited: dict[str, str] = {}

    def visit(task_ref: str, stack: list[str]) -> None:
        state = visited.get(task_ref)
        if state == "done":
            return
        if state == "visiting":
            raise TaskGraphError(
                "TASK_DEPENDENCY_CYCLE",
                f"Dependency cycle detected: {' -> '.join([*stack, task_ref])}.",
            )
        visited[task_ref] = "visiting"
        for dependency in task_map[task_ref]["dependsOn"]:
            visit(dependency, [*stack, task_ref])
        visited[task_ref] = "done"

    for task_ref in task_map:
        visit(task_ref, [])

    for binding in catalog["cardBindings"]:
        for task_ref in [*binding["executionTaskRefs"], *binding["verificationTaskRefs"]]:
            if task_ref not in task_map:
                raise TaskGraphError(
                    "CARD_TASK_UNKNOWN",
                    f"Card binding {binding['cardId']} references unknown task {task_ref}.",
                )

    return {
        "ok": True,
        "taskCount": len(task_map),
        "profileCount": len(profile_map),
        "aliasCount": len(alias_map),
        "cardBindingCount": len(catalog["cardBindings"]),
    }


def parse_params(raw_params: list[str]) -> dict[str, str]:
    params: dict[str, str] = {}
    for item in raw_params:
        if "=" not in item:
            raise TaskGraphError(
                "TASK_PARAM_INVALID",
                f"Expected KEY=VALUE parameter, received {item}.",
            )
        key, value = item.split("=", 1)
        if not key:
            raise TaskGraphError("TASK_PARAM_INVALID", "Task params must include a non-empty key.")
        params[key] = value
    return params


def resolve_requested_task_refs(
    catalog: dict[str, Any],
    requested_refs: list[str],
) -> list[str]:
    if not requested_refs:
        raise TaskGraphError("TASK_REF_REQUIRED", "At least one --task-ref is required.")
    alias_map = build_alias_map(catalog)
    task_map = tasks_by_ref(catalog)

    canonical: list[str] = []
    for requested in requested_refs:
        if requested not in alias_map:
            raise TaskGraphError("TASK_REF_UNKNOWN", f"Unknown task or alias {requested}.")
        canonical_ref = alias_map[requested]
        if canonical_ref not in canonical:
            canonical.append(canonical_ref)

    resolved: list[str] = []
    seen: set[str] = set()

    def add_task(task_ref: str) -> None:
        if task_ref in seen:
            return
        for dependency in task_map[task_ref]["dependsOn"]:
            add_task(dependency)
        seen.add(task_ref)
        resolved.append(task_ref)

    for task_ref in canonical:
        add_task(task_ref)

    resolved_set = set(resolved)
    for task_ref in resolved:
        for conflict in task_map[task_ref]["conflictsWith"]:
            if conflict in resolved_set:
                raise TaskGraphError(
                    "TASK_COMBINATION_CONFLICT",
                    f"Task {task_ref} cannot be resolved in the same plan as {conflict}.",
                )

    return resolved


def resolve_card_plan(
    catalog: dict[str, Any],
    card_id: str,
    *,
    phase: str,
) -> dict[str, Any]:
    binding = bindings_by_card_id(catalog).get(card_id)
    if binding is None:
        raise TaskGraphError("CARD_ID_UNKNOWN", f"Unknown card id {card_id}.")

    payload: dict[str, Any] = {
        "cardId": card_id,
        "allowedChecklistStates": binding["allowedChecklistStates"],
        "evidenceGlobs": binding["evidenceGlobs"],
        "executionTaskRefs": binding["executionTaskRefs"],
        "verificationTaskRefs": binding["verificationTaskRefs"],
    }
    if phase in {"execution", "all"}:
        payload["executionPlan"] = resolve_requested_task_refs(catalog, binding["executionTaskRefs"])
    if phase in {"verification", "all"}:
        payload["verificationPlan"] = resolve_requested_task_refs(
            catalog, binding["verificationTaskRefs"]
        )
    return payload


def flatten_context(profile: dict[str, Any], params: dict[str, str]) -> dict[str, str]:
    context = {
        "repo_root": str(REPO_ROOT),
        "profile.profileRef": str(profile["profileRef"]),
        "profile.environmentRef": str(profile["environmentRef"]),
        "profile.runtimeProfileRef": str(profile["runtimeProfileRef"]),
        "profile.scopeClassRef": "" if profile["scopeClassRefOrNull"] is None else str(profile["scopeClassRefOrNull"]),
        "profile.providerEnvironmentRef": str(profile["providerEnvironmentRef"]),
    }
    for key, value in params.items():
        context[f"param.{key}"] = value
    return context


def render_template(value: str, context: dict[str, str]) -> str:
    def replace(match: re.Match[str]) -> str:
        token = match.group(1)
        if token not in context:
            raise TaskGraphError("TASK_TEMPLATE_TOKEN_UNKNOWN", f"Unknown template token {token}.")
        return context[token]

    return TOKEN_PATTERN.sub(replace, value)


def render_command(
    command: dict[str, Any],
    *,
    profile: dict[str, Any],
    params: dict[str, str],
) -> list[str]:
    context = flatten_context(profile, params)
    return [render_template(part, context) for part in command["argv"]]


def render_expected_outputs(
    task: dict[str, Any],
    *,
    profile: dict[str, Any],
    params: dict[str, str],
) -> list[str]:
    context = flatten_context(profile, params)
    return [render_template(item, context) for item in task["expectedOutputs"]]


def ensure_required_params(task: dict[str, Any], params: dict[str, str]) -> None:
    missing = [key for key in task["requiredParams"] if key not in params]
    if missing:
        raise TaskGraphError(
            "TASK_PARAM_REQUIRED",
            f"Task {task['taskRef']} requires params: {', '.join(missing)}.",
        )


def merged_params(task: dict[str, Any], cli_params: dict[str, str]) -> dict[str, str]:
    merged = dict(task["defaultParams"])
    merged.update(cli_params)
    return merged


def local_runtime_state_path(params: dict[str, str]) -> Path:
    explicit = params.get("local_state_dir")
    if explicit:
        return Path(explicit) / "local_runtime_state.json"
    env_path = os.environ.get("TAXAT_LOCAL_STATE_DIR")
    if env_path:
        return Path(env_path) / "local_runtime_state.json"
    return LOCAL_RUNTIME_STATE_PATH


def check_local_stack_semantic_ready(params: dict[str, str]) -> dict[str, Any]:
    state_path = local_runtime_state_path(params)
    if not state_path.exists():
        raise TaskGraphError(
            "LOCAL_STACK_UNHEALTHY",
            f"Local runtime state file not found at {state_path}. Bootstrap the local stack first.",
        )
    payload = read_json(state_path)
    validator_status = payload.get("validator_status")
    smoke_results = payload.get("smoke_results", {})
    required_smoke_paths = [
        "command_path",
        "queue_path",
        "object_store_path",
        "cache_path",
        "audit_path",
    ]
    if validator_status != "PASSED":
        raise TaskGraphError(
            "LOCAL_STACK_UNHEALTHY",
            f"Local runtime validator status is {validator_status!r}, expected 'PASSED'.",
        )
    failing = [key for key in required_smoke_paths if smoke_results.get(key) != "PASS"]
    if failing:
        raise TaskGraphError(
            "LOCAL_STACK_UNHEALTHY",
            f"Local runtime smoke markers are incomplete: {', '.join(failing)}.",
        )
    return payload


def enforce_preconditions(task: dict[str, Any], params: dict[str, str]) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    for precondition in task["preconditions"]:
        if precondition == "LOCAL_STACK_SEMANTIC_READY":
            state = check_local_stack_semantic_ready(params)
            results.append(
                {
                    "precondition": precondition,
                    "status": "PASS",
                    "statePath": str(local_runtime_state_path(params)),
                    "runtimeProfileRef": state["runtime_profile_ref"],
                }
            )
        else:
            raise TaskGraphError(
                "TASK_PRECONDITION_UNKNOWN",
                f"Unknown precondition {precondition} on task {task['taskRef']}.",
            )
    return results


def sanitize_ref(value: str) -> str:
    return re.sub(r"[^a-zA-Z0-9._-]+", "_", value)


def result_paths(state_dir: Path, task_ref: str) -> dict[str, Path]:
    token = sanitize_ref(task_ref)
    return {
        "plan": state_dir / "plans" / f"{token}.json",
        "result": state_dir / "results" / f"{token}.json",
        "stdout": state_dir / "logs" / "stdout" / f"{token}.log",
        "stderr": state_dir / "logs" / "stderr" / f"{token}.log",
    }


def build_task_plan(
    task: dict[str, Any],
    *,
    profile: dict[str, Any],
    cli_params: dict[str, str],
) -> dict[str, Any]:
    params = merged_params(task, cli_params)
    ensure_required_params(task, params)
    commands = [render_command(command, profile=profile, params=params) for command in task["commands"]]
    return {
        "taskRef": task["taskRef"],
        "makeTarget": task["makeTarget"],
        "summary": task["summary"],
        "destructivePosture": task["destructivePosture"],
        "typedConfirmationRefOrNull": task["typedConfirmationRefOrNull"],
        "requiredTools": task["requiredTools"],
        "params": params,
        "commands": commands,
        "expectedOutputs": render_expected_outputs(task, profile=profile, params=params),
        "dryRunSafe": task["dryRunSafe"],
    }


def execute_command(command: list[str], *, verbose: bool) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command,
        cwd=REPO_ROOT,
        capture_output=not verbose,
        text=True,
        check=False,
    )


def emit(prefix: str, payload: dict[str, Any], *, json_only: bool) -> None:
    if json_only:
        print(json.dumps(payload, indent=2))
    else:
        print(f"{prefix}{json.dumps(payload, sort_keys=True)}")


def run_tasks(
    catalog: dict[str, Any],
    *,
    requested_task_refs: list[str],
    profile_ref: str,
    cli_params: dict[str, str],
    catalog_path: Path,
    dry_run: bool,
    verbose: bool,
    fail_fast: bool,
    allow_dangerous: str | None,
) -> dict[str, Any]:
    resolved_refs = resolve_requested_task_refs(catalog, requested_task_refs)
    task_map = tasks_by_ref(catalog)
    resolved_profile = resolve_environment_profile(
        task_ref=resolved_refs[-1],
        profile_ref=profile_ref,
        catalog_path=catalog_path,
        enforce_dangerous=False,
        ack_token=allow_dangerous,
    )

    state_dir = DEFAULT_STATE_DIR
    state_dir.mkdir(parents=True, exist_ok=True)

    task_results: list[dict[str, Any]] = []
    for task_ref in resolved_refs:
        task = task_map[task_ref]
        resolved_task_profile = resolve_environment_profile(
            task_ref=task_ref,
            profile_ref=profile_ref,
            catalog_path=catalog_path,
            enforce_dangerous=not dry_run,
            ack_token=allow_dangerous,
        )
        plan = build_task_plan(task, profile=resolved_task_profile, cli_params=cli_params)
        paths = result_paths(state_dir, task_ref)
        write_json(paths["plan"], plan)

        precondition_results: list[dict[str, Any]] = []
        if not dry_run:
            precondition_results = enforce_preconditions(task, plan["params"])
        elif task["preconditions"]:
            precondition_results = [
                {"precondition": item, "status": "SKIPPED_DRY_RUN"}
                for item in task["preconditions"]
            ]

        if dry_run:
            result_payload = {
                "ok": True,
                "taskRef": task_ref,
                "profileRef": profile_ref,
                "dryRun": True,
                "commands": plan["commands"],
                "preconditions": precondition_results,
                "planPath": str(paths["plan"]),
            }
            write_json(paths["result"], result_payload)
            task_results.append(result_payload)
            continue

        command_results: list[dict[str, Any]] = []
        task_ok = True
        for command in plan["commands"]:
            completed = execute_command(command, verbose=verbose)
            if not verbose:
                paths["stdout"].parent.mkdir(parents=True, exist_ok=True)
                paths["stderr"].parent.mkdir(parents=True, exist_ok=True)
                with paths["stdout"].open("a", encoding="utf-8") as stdout_handle:
                    stdout_handle.write(completed.stdout)
                with paths["stderr"].open("a", encoding="utf-8") as stderr_handle:
                    stderr_handle.write(completed.stderr)
            command_payload = {
                "argv": command,
                "exitCode": completed.returncode,
                "stdoutPath": str(paths["stdout"]),
                "stderrPath": str(paths["stderr"]),
            }
            command_results.append(command_payload)
            if completed.returncode != 0:
                task_ok = False
                if fail_fast:
                    break

        result_payload = {
            "ok": task_ok,
            "taskRef": task_ref,
            "profileRef": profile_ref,
            "dryRun": False,
            "preconditions": precondition_results,
            "commands": command_results,
            "planPath": str(paths["plan"]),
            "resultPath": str(paths["result"]),
        }
        write_json(paths["result"], result_payload)
        task_results.append(result_payload)
        if fail_fast and not task_ok:
            break

    overall_ok = all(result["ok"] for result in task_results)
    return {
        "ok": overall_ok,
        "profile": resolved_profile,
        "requestedTaskRefs": requested_task_refs,
        "resolvedTaskRefs": resolved_refs,
        "results": task_results,
        "stateDir": str(state_dir),
        "dryRun": dry_run,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--catalog-path", type=Path, default=DEFAULT_CATALOG_PATH)
    parser.add_argument("--json", action="store_true")
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("list")
    subparsers.add_parser("validate")

    resolve_parser = subparsers.add_parser("resolve")
    resolve_parser.add_argument("--task-ref", action="append", required=True)
    resolve_parser.add_argument("--profile", required=True)
    resolve_parser.add_argument("--param", action="append", default=[])

    resolve_card_parser = subparsers.add_parser("resolve-card")
    resolve_card_parser.add_argument("--card-id", required=True)
    resolve_card_parser.add_argument(
        "--phase",
        choices=["execution", "verification", "all"],
        default="all",
    )

    run_parser = subparsers.add_parser("run")
    run_parser.add_argument("--task-ref", action="append", required=True)
    run_parser.add_argument("--profile", required=True)
    run_parser.add_argument("--param", action="append", default=[])
    run_parser.add_argument("--dry-run", action="store_true")
    run_parser.add_argument("--verbose", action="store_true")
    run_parser.add_argument("--keep-going", action="store_true")
    run_parser.add_argument("--allow-dangerous")

    args = parser.parse_args()
    try:
        catalog = load_catalog(args.catalog_path)
        validation = validate_catalog(catalog)

        if args.command == "list":
            payload = {
                "ok": True,
                "catalogVersion": catalog["catalogVersion"],
                "authoritativeInterface": catalog["authoritativeInterface"],
                "taskRefs": [task["taskRef"] for task in catalog["tasks"]],
                "profileRefs": [profile["profileRef"] for profile in catalog["environmentProfiles"]],
                "validation": validation,
            }
            emit("TASK_EVENT::", payload, json_only=args.json)
            return

        if args.command == "validate":
            emit("TASK_EVENT::", validation, json_only=args.json)
            return

        if args.command == "resolve":
            params = parse_params(args.param)
            resolved_refs = resolve_requested_task_refs(catalog, args.task_ref)
            profile = resolve_environment_profile(
                task_ref=resolved_refs[-1],
                profile_ref=args.profile,
                catalog_path=args.catalog_path,
                enforce_dangerous=False,
                ack_token=None,
            )
            task_map = tasks_by_ref(catalog)
            plan = [
                build_task_plan(task_map[task_ref], profile=profile, cli_params=params)
                for task_ref in resolved_refs
            ]
            payload = {
                "ok": True,
                "profile": profile,
                "resolvedTaskRefs": resolved_refs,
                "plan": plan,
            }
            emit("TASK_EVENT::", payload, json_only=args.json)
            return

        if args.command == "resolve-card":
            payload = resolve_card_plan(catalog, args.card_id, phase=args.phase)
            payload["ok"] = True
            emit("TASK_EVENT::", payload, json_only=args.json)
            return

        if args.command == "run":
            params = parse_params(args.param)
            payload = run_tasks(
                catalog,
                requested_task_refs=args.task_ref,
                profile_ref=args.profile,
                cli_params=params,
                catalog_path=args.catalog_path,
                dry_run=args.dry_run,
                verbose=args.verbose,
                fail_fast=not args.keep_going,
                allow_dangerous=args.allow_dangerous,
            )
            emit("TASK_EVENT::", payload, json_only=args.json)
            raise SystemExit(0 if payload["ok"] else 1)

        raise TaskGraphError("TASK_COMMAND_UNKNOWN", f"Unknown task graph command {args.command}.")
    except (TaskGraphError, ProfileResolutionError) as error:
        payload = error.as_payload()
        emit("TASK_EVENT::", payload, json_only=args.json)
        raise SystemExit(1) from error


if __name__ == "__main__":
    main()
