#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CARD_ID=""
PROFILE="ci-validation"
PHASE="all"
DRY_RUN="false"
VERBOSE="false"
JSON_OUTPUT="false"
ALLOW_DANGEROUS=""
PARAMS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --card-id)
      CARD_ID="$2"
      shift 2
      ;;
    --profile)
      PROFILE="$2"
      shift 2
      ;;
    --phase)
      PHASE="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    --verbose)
      VERBOSE="true"
      shift
      ;;
    --json)
      JSON_OUTPUT="true"
      shift
      ;;
    --allow-dangerous)
      ALLOW_DANGEROUS="$2"
      shift 2
      ;;
    --param)
      PARAMS+=("$2")
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "${CARD_ID}" ]]; then
  echo "Missing required --card-id" >&2
  exit 1
fi

set +e
binding_json="$(python3 "${REPO_ROOT}/scripts/tasks/task_graph.py" --json resolve-card --card-id "${CARD_ID}" --phase "${PHASE}")"
binding_status=$?
set -e

if [[ ${binding_status} -ne 0 ]]; then
  if [[ "${JSON_OUTPUT}" == "true" ]]; then
    printf '%s\n' "${binding_json}"
  else
    printf 'AGENT_EVENT::%s\n' "${binding_json}"
  fi
  exit "${binding_status}"
fi

readarray -t selected_task_refs < <(
  CARD_ID_VALUE="${CARD_ID}" PHASE_VALUE="${PHASE}" BINDING_JSON="${binding_json}" python3 - <<'PY'
import json
import os

binding = json.loads(os.environ["BINDING_JSON"])
phase = os.environ["PHASE_VALUE"]
ordered: list[str] = []

def add_many(items: list[str]) -> None:
    for item in items:
        if item not in ordered:
            ordered.append(item)

if phase in {"execution", "all"}:
    add_many(binding.get("executionPlan", []))
if phase in {"verification", "all"}:
    add_many(binding.get("verificationPlan", []))

for item in ordered:
    print(item)
PY
)

run_args=(python3 "${REPO_ROOT}/scripts/tasks/task_graph.py")
if [[ "${JSON_OUTPUT}" == "true" ]]; then
  run_args+=(--json)
fi
run_args+=(run --profile "${PROFILE}")
for task_ref in "${selected_task_refs[@]}"; do
  run_args+=(--task-ref "${task_ref}")
done
run_args+=(--param "card_id=${CARD_ID}")
for param in "${PARAMS[@]}"; do
  run_args+=(--param "${param}")
done
if [[ "${DRY_RUN}" == "true" ]]; then
  run_args+=(--dry-run)
fi
if [[ "${VERBOSE}" == "true" ]]; then
  run_args+=(--verbose)
fi
if [[ -n "${ALLOW_DANGEROUS}" ]]; then
  run_args+=(--allow-dangerous "${ALLOW_DANGEROUS}")
fi

set +e
run_json="$("${run_args[@]}")"
status=$?
set -e

if [[ "${JSON_OUTPUT}" == "true" ]]; then
  CARD_ID_VALUE="${CARD_ID}" PHASE_VALUE="${PHASE}" BINDING_JSON="${binding_json}" RUN_JSON="${run_json}" python3 - <<'PY'
import json
import os

binding = json.loads(os.environ["BINDING_JSON"])
run_result = json.loads(os.environ["RUN_JSON"])
payload = {
    "ok": run_result["ok"],
    "action": "agent.run-card",
    "cardId": os.environ["CARD_ID_VALUE"],
    "phase": os.environ["PHASE_VALUE"],
    "binding": binding,
    "run": run_result,
}
print(json.dumps(payload, indent=2))
PY
else
  printf 'AGENT_EVENT::%s\n' "${run_json}"
fi

exit "${status}"
