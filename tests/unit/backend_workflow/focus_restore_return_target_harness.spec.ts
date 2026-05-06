import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  buildFocusRestoreReturnTargetHarness,
  FocusRestoreReturnTargetHarnessRepository,
  WorkflowModelError,
} from "../../../packages/backend-workflow/src/index.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

async function validatePayloadAgainstSchema(schemaName: string, payload: unknown) {
  const script = `
import json
import pathlib
import sys

repo = pathlib.Path(sys.argv[1])
sys.path.insert(0, str(repo / "packages" / "contracts-core" / "python"))
from validate_contracts import CUSTOM_VALIDATORS, Draft202012Validator, build_registry, load_json  # type: ignore

schema_name = sys.argv[2]
payload = json.loads(sys.argv[3])
schema = load_json(repo / "packages" / "contracts-core" / "schemas" / schema_name)
validator = Draft202012Validator(
    schema,
    registry=build_registry(),
    format_checker=Draft202012Validator.FORMAT_CHECKER,
)
issues = [
    f"schema:<{'/'.join(map(str, error.absolute_path)) or '<root>'}>: {error.message}"
    for error in sorted(validator.iter_errors(payload), key=lambda error: list(error.absolute_path))
]
custom_validator = CUSTOM_VALIDATORS.get(schema_name.replace(".schema.json", ""))
if custom_validator:
    issues.extend(
        f"custom:{getattr(issue, 'location', 'inline')}: {getattr(issue, 'message', str(issue))}"
        for issue in custom_validator(payload, "inline")
    )
if issues:
    raise SystemExit("\\n".join(issues))
`;

  await execFileAsync(path.join(repoRoot, ".venv", "bin", "python3"), [
    "-c",
    script,
    repoRoot,
    schemaName,
    JSON.stringify(payload),
  ]);
}

test("generates a schema-valid deterministic focus restore return-target harness", async () => {
  const harness = buildFocusRestoreReturnTargetHarness({
    deterministic_seed: 15501,
    harness_id: "focus-restore-return-target-harness-0155",
  });

  expect(harness.cases).toHaveLength(7);
  expect(new Set(harness.cases.map((harnessCase) => harnessCase.trigger_action))).toEqual(
    new Set([
      "RESPONSIVE_RESTACK",
      "CLOSE_SUPPORT_REGION",
      "BACK_NAVIGATION",
      "HELP_HANDOFF_RETURN",
      "STALE_REBASE_RECOVERY",
      "LIVE_UPDATE_DURING_ACTIVE_INPUT",
      "SECONDARY_WINDOW_CLOSE",
    ]),
  );
  expect(
    harness.cases.every((harnessCase) => harnessCase.covered_modalities.includes("KEYBOARD_ONLY")),
  ).toBe(true);
  expect(
    harness.cases.find(
      (harnessCase) => harnessCase.trigger_action === "LIVE_UPDATE_DURING_ACTIVE_INPUT",
    )?.active_focus_lock_kind_or_null,
  ).toBe("COMPARE_CONTROL");
  expect(
    harness.cases.find((harnessCase) => harnessCase.trigger_action === "SECONDARY_WINDOW_CLOSE")
      ?.post_state.active_focus_anchor_ref_or_null,
  ).toBe("canvas:workflow-item-0155");

  await validatePayloadAgainstSchema("focus_restore_return_target_harness.schema.json", harness);
});

test("persists harnesses immutably by harness id", async () => {
  const repository = new FocusRestoreReturnTargetHarnessRepository();
  const harness = buildFocusRestoreReturnTargetHarness({
    deterministic_seed: 15501,
    harness_id: "focus-restore-return-target-harness-0155-repo",
  });

  const stored = await repository.persistFocusRestoreReturnTargetHarness({ harness });
  expect(stored.case_count).toBe(7);
  await expect(repository.persistFocusRestoreReturnTargetHarness({ harness })).resolves.toEqual(
    stored,
  );

  const drifted = {
    ...harness,
    deterministic_seed: 15502,
  };
  await expect(
    repository.persistFocusRestoreReturnTargetHarness({ harness: drifted }),
  ).rejects.toThrow(WorkflowModelError);
});

test("schema validation catches missing keyboard-first coverage", async () => {
  const harness = buildFocusRestoreReturnTargetHarness();
  const drifted = {
    ...harness,
    cases: harness.cases.map((harnessCase, index) =>
      index === 0
        ? {
            ...harnessCase,
            covered_modalities: harnessCase.covered_modalities.filter(
              (modality) => modality !== "KEYBOARD_ONLY",
            ),
          }
        : harnessCase,
    ),
  };

  await expect(
    validatePayloadAgainstSchema("focus_restore_return_target_harness.schema.json", drifted),
  ).rejects.toThrow();
});
