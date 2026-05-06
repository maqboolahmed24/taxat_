import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const task = process.argv[2];
const workspacePath = process.argv[3];

if (!task || !workspacePath) {
  console.error("usage: workspace-task-stub.mjs <task> <workspace-path>");
  process.exit(1);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..");
const packageJsonPath = path.join(repoRoot, workspacePath, "package.json");
const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));

const line = [
  "BOOTSTRAP_PLACEHOLDER_TASK_OK",
  `task=${task}`,
  `workspace=${workspacePath}`,
  `package=${packageJson.name}`,
].join(" ");

console.log(line);
