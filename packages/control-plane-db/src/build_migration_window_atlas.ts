import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { mainBuildAtlas } from "./migration_framework.ts";

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  mainBuildAtlas().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
