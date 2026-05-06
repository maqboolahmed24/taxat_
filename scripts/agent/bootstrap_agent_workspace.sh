#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROFILE="ci-validation"
DRY_RUN="false"
JSON_OUTPUT="false"
VERBOSE="false"
SKIP_NODE_INSTALL="false"
SKIP_HOOKS="false"
CREATE_PYTHON_VENV="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --profile)
      PROFILE="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    --json)
      JSON_OUTPUT="true"
      shift
      ;;
    --verbose)
      VERBOSE="true"
      shift
      ;;
    --skip-node-install)
      SKIP_NODE_INSTALL="true"
      shift
      ;;
    --skip-hooks)
      SKIP_HOOKS="true"
      shift
      ;;
    --create-python-venv)
      CREATE_PYTHON_VENV="true"
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

PROFILE_JSON="$(python3 "${REPO_ROOT}/scripts/agent/resolve_environment_profile.py" --json --task-ref bootstrap.workspace --profile "${PROFILE}")"

emit_payload() {
  local ok="$1"
  local error_code="$2"
  local error_message="$3"
  PROFILE_JSON="$PROFILE_JSON" DRY_RUN="$DRY_RUN" VERBOSE="$VERBOSE" \
  SKIP_NODE_INSTALL="$SKIP_NODE_INSTALL" SKIP_HOOKS="$SKIP_HOOKS" CREATE_PYTHON_VENV="$CREATE_PYTHON_VENV" \
  OK_VALUE="$ok" ERROR_CODE="$error_code" ERROR_MESSAGE="$error_message" \
  python3 - <<'PY'
import json
import os

profile = json.loads(os.environ["PROFILE_JSON"])
commands = []
if os.environ["CREATE_PYTHON_VENV"] == "true":
    commands.append(["python3", "-m", "venv", ".venv"])
if os.environ["SKIP_NODE_INSTALL"] != "true":
    commands.append(["pnpm", "install", "--frozen-lockfile"])
if os.environ["SKIP_HOOKS"] != "true":
    commands.append(["./.venv/bin/python3", "-m", "pre_commit", "install", "--hook-type", "pre-commit"])
payload = {
    "ok": os.environ["OK_VALUE"] == "true",
    "action": "bootstrap.workspace",
    "dryRun": os.environ["DRY_RUN"] == "true",
    "verbose": os.environ["VERBOSE"] == "true",
    "profile": profile,
    "requiredTools": ["bash", "node", "pnpm", "python3"],
    "commands": commands,
}
error_code = os.environ["ERROR_CODE"]
error_message = os.environ["ERROR_MESSAGE"]
if error_code:
    payload["code"] = error_code
    payload["message"] = error_message
print(json.dumps(payload, indent=2))
PY
}

machine_emit() {
  local payload="$1"
  if [[ "${JSON_OUTPUT}" == "true" ]]; then
    printf '%s\n' "${payload}"
  else
    printf 'AGENT_EVENT::%s\n' "${payload}"
  fi
}

if [[ "${DRY_RUN}" == "true" ]]; then
  machine_emit "$(emit_payload true "" "")"
  exit 0
fi

for tool in bash node pnpm python3; do
  if ! command -v "${tool}" >/dev/null 2>&1; then
    machine_emit "$(emit_payload false "BOOTSTRAP_TOOL_MISSING" "Required tool ${tool} is not available.")"
    exit 1
  fi
done

cd "${REPO_ROOT}"

if [[ ! -x "${REPO_ROOT}/.venv/bin/python3" ]]; then
  if [[ "${CREATE_PYTHON_VENV}" == "true" ]]; then
    python3 -m venv .venv
  else
    machine_emit "$(emit_payload false "BOOTSTRAP_PYTHON_ENV_MISSING" "Missing .venv/bin/python3. Re-run with --create-python-venv or restore the governed Python environment.")"
    exit 1
  fi
fi

if [[ "${SKIP_NODE_INSTALL}" != "true" ]]; then
  if [[ "${VERBOSE}" == "true" ]]; then
    pnpm install --frozen-lockfile
  else
    pnpm install --frozen-lockfile >/dev/null
  fi
fi

if [[ "${SKIP_HOOKS}" != "true" ]]; then
  if [[ "${VERBOSE}" == "true" ]]; then
    ./.venv/bin/python3 -m pre_commit install --hook-type pre-commit
  else
    ./.venv/bin/python3 -m pre_commit install --hook-type pre-commit >/dev/null
  fi
fi

machine_emit "$(emit_payload true "" "")"
