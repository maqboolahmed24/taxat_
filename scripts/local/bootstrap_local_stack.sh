#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="${REPO_ROOT}/infra/local/compose.yaml"
STATE_DIR="${TAXAT_LOCAL_STATE_DIR:-${HOME}/.taxat/local-runtime}"
RUNTIME_PROFILE="local"
SEED_PROFILE=""
PLAN_ONLY="false"
SKIP_SMOKE="false"
SKIP_VALIDATORS="false"
RESET_DISPOSABLE="false"
FULL_RESET="false"
CONFIRM_FULL_RESET="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --runtime-profile)
      RUNTIME_PROFILE="$2"
      shift 2
      ;;
    --seed-profile)
      SEED_PROFILE="$2"
      shift 2
      ;;
    --state-dir)
      STATE_DIR="$2"
      shift 2
      ;;
    --plan-only)
      PLAN_ONLY="true"
      shift
      ;;
    --skip-smoke)
      SKIP_SMOKE="true"
      shift
      ;;
    --skip-authoritative-validators)
      SKIP_VALIDATORS="true"
      shift
      ;;
    --reset-disposable)
      RESET_DISPOSABLE="true"
      shift
      ;;
    --full-reset)
      FULL_RESET="true"
      shift
      ;;
    --confirm-durable-reset)
      CONFIRM_FULL_RESET="true"
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

compose() {
  docker compose -f "${COMPOSE_FILE}" "$@"
}

if [[ "${FULL_RESET}" == "true" && "${CONFIRM_FULL_RESET}" != "true" ]]; then
  echo "Refusing durable reset without --confirm-durable-reset" >&2
  exit 1
fi

if [[ "${PLAN_ONLY}" == "true" ]]; then
  cat <<EOF
Bootstrap plan
- runtime profile: ${RUNTIME_PROFILE}
- seed profile: ${SEED_PROFILE:-default}
- state dir: ${STATE_DIR}
- compose file: ${COMPOSE_FILE}
- reset disposable: ${RESET_DISPOSABLE}
- full reset: ${FULL_RESET}
- skip smoke: ${SKIP_SMOKE}
- skip validators: ${SKIP_VALIDATORS}
EOF
  exit 0
fi

mkdir -p "${STATE_DIR}"

seed_args=(
  --runtime-profile
  "${RUNTIME_PROFILE}"
  --state-dir
  "${STATE_DIR}"
)

if [[ -n "${SEED_PROFILE}" ]]; then
  seed_args+=(
    --seed-profile
    "${SEED_PROFILE}"
  )
fi

smoke_args=(
  --state-dir
  "${STATE_DIR}"
)

if [[ "${SKIP_VALIDATORS}" == "true" ]]; then
  smoke_args+=(--skip-authoritative-validators)
fi

if [[ "${RESET_DISPOSABLE}" == "true" || "${FULL_RESET}" == "true" ]]; then
  compose down --remove-orphans || true
  docker volume rm taxat-local-runtime_rabbitmq-data taxat-local-runtime_redis-data >/dev/null 2>&1 || true
  rm -f "${STATE_DIR}/local_runtime_state.json"
fi

if [[ "${FULL_RESET}" == "true" ]]; then
  docker volume rm taxat-local-runtime_postgres-data taxat-local-runtime_minio-data >/dev/null 2>&1 || true
fi

compose up -d postgres minio rabbitmq redis
python3 "${REPO_ROOT}/scripts/local/wait_for_local_stack_ready.py" \
  --readiness-class BASE \
  --state-dir "${STATE_DIR}"

compose up -d postgres-bootstrap minio-bootstrap rabbitmq-bootstrap redis-bootstrap

python3 "${REPO_ROOT}/scripts/local/seed_local_runtime.py" \
  "${seed_args[@]}"

if [[ "${SKIP_SMOKE}" != "true" ]]; then
  python3 "${REPO_ROOT}/scripts/local/smoke_local_runtime.py" \
    "${smoke_args[@]}"
fi

python3 "${REPO_ROOT}/scripts/local/wait_for_local_stack_ready.py" \
  --readiness-class SEMANTIC \
  --state-dir "${STATE_DIR}"

cat <<EOF
Local runtime ready
- state file: ${STATE_DIR}/local_runtime_state.json
- next step: start host processes only after semantic readiness has passed
EOF
