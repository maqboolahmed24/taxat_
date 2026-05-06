#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CARD_ID=""
REQUIRE_COMPLETE="false"
JSON_OUTPUT="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --card-id)
      CARD_ID="$2"
      shift 2
      ;;
    --require-complete)
      REQUIRE_COMPLETE="true"
      shift
      ;;
    --json)
      JSON_OUTPUT="true"
      shift
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

binding_json="$(python3 "${REPO_ROOT}/scripts/tasks/task_graph.py" --json resolve-card --card-id "${CARD_ID}" --phase all)"

set +e
verification_json="$(
  CARD_ID_VALUE="${CARD_ID}" REPO_ROOT_VALUE="${REPO_ROOT}" REQUIRE_COMPLETE_VALUE="${REQUIRE_COMPLETE}" BINDING_JSON="${binding_json}" python3 - <<'PY'
import json
import os
from pathlib import Path

card_id = os.environ["CARD_ID_VALUE"]
repo_root = Path(os.environ["REPO_ROOT_VALUE"])
binding = json.loads(os.environ["BINDING_JSON"])
require_complete = os.environ["REQUIRE_COMPLETE_VALUE"] == "true"
card_path = repo_root / "PROMPT" / "CARDS" / f"{card_id}.md"
checklist_path = repo_root / "PROMPT" / "Checklist.md"

if not card_path.exists():
    print(json.dumps({
        "ok": False,
        "code": "CARD_FILE_MISSING",
        "message": f"Card file {card_path} does not exist.",
    }, indent=2))
    raise SystemExit(1)

card_body = card_path.read_text(encoding="utf-8")
checklist_lines = checklist_path.read_text(encoding="utf-8").splitlines()
matching_line = next((line for line in checklist_lines if f"`{card_id}`" in line), None)
if matching_line is None:
    print(json.dumps({
        "ok": False,
        "code": "CHECKLIST_ENTRY_MISSING",
        "message": f"Checklist entry for {card_id} is missing.",
    }, indent=2))
    raise SystemExit(1)

state = matching_line.split("`", 1)[0].strip()
allowed_states = set(binding["allowedChecklistStates"])
if state not in allowed_states:
    print(json.dumps({
        "ok": False,
        "code": "CHECKLIST_STATE_NOT_ALLOWED",
        "message": f"Checklist state {state} is not allowed for {card_id}.",
    }, indent=2))
    raise SystemExit(1)

if require_complete and state != "[X]":
    print(json.dumps({
        "ok": False,
        "code": "CHECKLIST_NOT_COMPLETE",
        "message": f"Card {card_id} is {state}, not [X].",
    }, indent=2))
    raise SystemExit(1)

required_sections = ["## Implementation Notes", "## Verification Evidence"]
missing_sections = [section for section in required_sections if section not in card_body]
if missing_sections:
    print(json.dumps({
        "ok": False,
        "code": "CARD_EVIDENCE_SECTION_MISSING",
        "message": f"Card {card_id} is missing required sections: {', '.join(missing_sections)}.",
    }, indent=2))
    raise SystemExit(1)

payload = {
    "ok": True,
    "action": "agent.verify-evidence",
    "cardId": card_id,
    "checklistState": state,
    "requiredSections": required_sections,
    "outcomeSectionPresent": "## Outcome" in card_body,
    "cardPath": str(card_path),
    "checklistPath": str(checklist_path),
    "binding": binding,
}
print(json.dumps(payload, indent=2))
PY
)"
status=$?
set -e

if [[ "${JSON_OUTPUT}" == "true" ]]; then
  printf '%s\n' "${verification_json}"
else
  printf 'AGENT_EVENT::%s\n' "${verification_json}"
fi

exit "${status}"
