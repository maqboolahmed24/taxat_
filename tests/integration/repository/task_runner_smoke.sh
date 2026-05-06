#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "${REPO_ROOT}"

help_output="$(make help JSON=1)"
printf '%s\n' "${help_output}" | grep -q '"catalogVersion": "TASK_CATALOG_V1"'

bootstrap_output="$(make bootstrap.workspace PROFILE=ci-validation DRY_RUN=1 JSON=1)"
printf '%s\n' "${bootstrap_output}" | grep -q '"taskRef": "bootstrap.workspace"'

validate_output="$(make validate.contracts PROFILE=ci-validation DRY_RUN=1 JSON=1)"
printf '%s\n' "${validate_output}" | grep -q '"taskRef": "validate.contracts"'
printf '%s\n' "${validate_output}" | grep -q 'Algorithm/scripts/validate_contracts.py'

docs_output="$(make docs.generate PROFILE=ci-validation DRY_RUN=1 JSON=1)"
printf '%s\n' "${docs_output}" | grep -q '"taskRef": "docs.generate"'
printf '%s\n' "${docs_output}" | grep -q '"contracts.import"'

drift_output="$(make drift.check PROFILE=ci-validation DRY_RUN=1 JSON=1)"
printf '%s\n' "${drift_output}" | grep -q '"taskRef": "drift.check"'

release_output="$(make release.readiness PROFILE=ci-validation DRY_RUN=1 JSON=1)"
printf '%s\n' "${release_output}" | grep -q '"taskRef": "release.readiness"'

card_output="$(make agent.run-card PROFILE=ci-validation DRY_RUN=1 JSON=1 CARD_ID=pc_0082)"
printf '%s\n' "${card_output}" | grep -q '"cardId": "pc_0082"'
