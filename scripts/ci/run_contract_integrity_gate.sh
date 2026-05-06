#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  cat <<'USAGE'
Usage: bash scripts/ci/run_contract_integrity_gate.sh [--dry-run]

Runs the merge-blocking contract integrity gate used by local development and CI.
USAGE
}

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"
cd "$repo_root"

dry_run=0
case "${1:-}" in
  "")
    ;;
  "--dry-run")
    dry_run=1
    ;;
  "-h" | "--help")
    usage
    exit 0
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac

required_files=(
  "Algorithm/README.md"
  "Algorithm/constraint_coverage_index.md"
  "Algorithm/constraint_traceability_register.json"
  "Algorithm/requirements-dev.txt"
  "Algorithm/schemas/constraint_traceability_register.schema.json"
  "Algorithm/scripts/validate_contracts.py"
  "Algorithm/tools/forensic_contract_guard.py"
)

for required_file in "${required_files[@]}"; do
  if [[ ! -f "$required_file" ]]; then
    echo "FAIL: required contract-integrity input is missing: $required_file" >&2
    if [[ "${GITHUB_ACTIONS:-}" == "true" ]]; then
      echo "::error title=Missing contract-integrity input::$required_file" >&2
    fi
    exit 1
  fi
done

choose_python() {
  if [[ -n "${PYTHON_BIN:-}" ]]; then
    if [[ -x "$PYTHON_BIN" ]] || command -v "$PYTHON_BIN" >/dev/null 2>&1; then
      printf '%s\n' "$PYTHON_BIN"
      return 0
    fi
    echo "FAIL: PYTHON_BIN is set but is not executable or on PATH: $PYTHON_BIN" >&2
    return 1
  fi

  if [[ -x "$repo_root/.venv/bin/python3" ]]; then
    printf '%s\n' "$repo_root/.venv/bin/python3"
    return 0
  fi

  if command -v python3 >/dev/null 2>&1; then
    command -v python3
    return 0
  fi

  echo "FAIL: no python3 interpreter found. Install Python and Algorithm/requirements-dev.txt." >&2
  return 1
}

python_bin="$(choose_python)"
export PYTHONDONTWRITEBYTECODE=1
export PYTHONHASHSEED=0
export PYTHONUTF8=1

validator_cmd=("$python_bin" "Algorithm/scripts/validate_contracts.py" "--self-test")
guard_cmd=("$python_bin" "Algorithm/tools/forensic_contract_guard.py")

print_command() {
  local first=1
  for arg in "$@"; do
    if [[ "$first" -eq 0 ]]; then
      printf ' '
    fi
    printf '%q' "$arg"
    first=0
  done
  printf '\n'
}

github_escape() {
  local value="$1"
  value="${value//'%'/'%25'}"
  value="${value//$'\r'/'%0D'}"
  value="${value//$'\n'/'%0A'}"
  printf '%s' "$value"
}

run_step() {
  local label="$1"
  shift

  local output_file
  output_file="$(mktemp "${TMPDIR:-/tmp}/taxat-contract-integrity.XXXXXX")"

  echo "==> $label"
  if [[ "${GITHUB_ACTIONS:-}" == "true" ]]; then
    echo "::group::$label"
  fi

  if "$@" >"$output_file" 2>&1; then
    sed 's/^/    /' "$output_file"
    if [[ "${GITHUB_ACTIONS:-}" == "true" ]]; then
      echo "::endgroup::"
    fi
    rm -f "$output_file"
    echo "PASS: $label"
    return 0
  fi

  local exit_code=$?
  echo "FAIL: $label" >&2
  sed 's/^/    /' "$output_file" >&2

  if [[ "${GITHUB_ACTIONS:-}" == "true" ]]; then
    echo "::endgroup::"
    local first_failure
    first_failure="$(grep -E '^(FAIL:|\[[^]]+\])' "$output_file" | head -n 1 || true)"
    local message
    message="${first_failure:-$label failed; see the grouped log for the broken path or rule.}"
    printf '::error title=%s::%s\n' "$(github_escape "$label")" "$(github_escape "$message")" >&2
  fi

  rm -f "$output_file"
  return "$exit_code"
}

if [[ "$dry_run" -eq 1 ]]; then
  echo "contract integrity gate: dry run"
  echo "validator:"
  print_command "${validator_cmd[@]}"
  echo "forensic guard:"
  print_command "${guard_cmd[@]}"
  exit 0
fi

run_step "Algorithm contract validator self-test" "${validator_cmd[@]}"
run_step "Forensic contract guard" "${guard_cmd[@]}"

echo "contract integrity gate: PASS"
