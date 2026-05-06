import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  buildPrincipalAccessPreviewBundle,
  compileAccessMatrix,
} from "../../../packages/access-control/src/index.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const emitterPath = path.join(
  repoRoot,
  "packages/access-control/src/emit_baseline_access_artifacts.ts",
);
const matrixPath = path.join(repoRoot, "config/access/access_control_matrix.json");
const validatorPath = path.join(repoRoot, "packages/contracts-core/python/validate_contracts.py");

test.describe.configure({ mode: "serial" });

test("baseline access emitter stays deterministic and schema-valid", async () => {
  const before = await readFile(matrixPath, "utf8");

  await execFileAsync("node", ["--experimental-strip-types", emitterPath, "--emit"], {
    cwd: repoRoot,
    maxBuffer: 16 * 1024 * 1024,
  });

  const after = await readFile(matrixPath, "utf8");
  expect(after).toBe(before);

  const validation = await execFileAsync(
    path.join(repoRoot, ".venv/bin/python3"),
    [
      "-c",
      [
        "import importlib.util, json, sys",
        "validator_path, matrix_path = sys.argv[1], sys.argv[2]",
        "spec = importlib.util.spec_from_file_location('validator_module', validator_path)",
        "module = importlib.util.module_from_spec(spec)",
        "sys.modules[spec.name] = module",
        "spec.loader.exec_module(module)",
        "payload = json.load(open(matrix_path, 'r', encoding='utf8'))",
        "checks = [",
        "  ('principal_access_view', module.validate_principal_access_view(payload['preview']['principal_view'], 'preview.principal_view')),",
        "  ('role_template_matrix', module.validate_role_template_matrix(payload['preview']['role_template_matrix'], 'preview.role_template_matrix'))",
        "]",
        "checks.extend((",
        "  f\"governance_access_simulation[{index}]\",",
        "  module.validate_governance_access_simulation(entry['simulation'], f\"preview.simulation_scenarios[{index}].simulation\")",
        ") for index, entry in enumerate(payload['preview']['simulation_scenarios']))",
        "issues = [(name, issue.location, issue.message) for name, items in checks for issue in items]",
        "if issues:",
        "    print(issues)",
        "    raise SystemExit(1)",
        "print('PASS: baseline access previews validated')",
      ].join("\n"),
      validatorPath,
      matrixPath,
    ],
    {
      cwd: repoRoot,
      maxBuffer: 16 * 1024 * 1024,
    },
  );

  expect(validation.stdout).toContain("PASS: baseline access previews validated");
});

test("projection bundle exposes four scenarios and a principal step-up review slice", async () => {
  const [matrix, preview] = await Promise.all([
    compileAccessMatrix({ reload: true }),
    buildPrincipalAccessPreviewBundle({ reload: true }),
  ]);

  expect(matrix.role_templates).toHaveLength(4);
  expect(preview.principal_view.selected_action_detail?.decision).toBe("REQUIRE_STEP_UP");
  expect(preview.role_template_matrix.role_id).toBe("TENANT_ADMIN");
  expect(preview.simulation_scenarios.map((entry) => entry.scenario_id)).toEqual([
    "tenant-admin-submit-step-up",
    "tenant-admin-submit-link-missing",
    "tenant-admin-erasure-security-review",
    "service-principal-human-declaration-block",
  ]);
});
