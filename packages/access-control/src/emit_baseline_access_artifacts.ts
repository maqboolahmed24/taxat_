import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { compileAccessMatrix } from "./access_matrix_compiler.ts";
import { buildPrincipalAccessPreviewBundle } from "./principal_access_projection_builder.ts";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..");
const outputPath = path.join(repoRoot, "config", "access", "access_control_matrix.json");

async function emitJson(payload: unknown) {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function checkJson(payload: unknown) {
  const expected = `${JSON.stringify(payload, null, 2)}\n`;
  const existing = await readFile(outputPath, "utf8");
  if (expected !== existing) {
    throw new Error(`Out-of-sync generated file: ${path.relative(repoRoot, outputPath)}`);
  }
}

async function buildPayload() {
  const [matrix, preview] = await Promise.all([
    compileAccessMatrix({ reload: true }),
    buildPrincipalAccessPreviewBundle({ reload: true }),
  ]);
  return {
    ...matrix,
    preview,
  };
}

export async function main() {
  const mode = new Set(process.argv.slice(2)).has("--emit") ? "emit" : "check";
  const payload = await buildPayload();
  if (mode === "emit") {
    await emitJson(payload);
  } else {
    await checkJson(payload);
  }
  console.log(`${mode === "emit" ? "emitted" : "verified"} baseline access control matrix`);
  console.log(`roles: ${payload.role_templates.length}`);
  console.log(`simulation scenarios: ${payload.preview.simulation_scenarios.length}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
