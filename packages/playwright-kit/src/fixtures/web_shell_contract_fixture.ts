import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { SharedWebShellContractFixture } from "@taxat/frontend-shell-core";

const fixtureDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(fixtureDir, "../../../..");

export const webShellContractFixturePaths = {
  repoRoot,
  fixtureJson: path.join(
    repoRoot,
    "packages/frontend-shell-core/src/fixtures/web_shell_contract_packets.json",
  ),
  operatorCalmPage: "/apps/operator-web/public/calm/index.html",
  operatorGovernancePage: "/apps/operator-web/public/governance/index.html",
  operatorAtlasPage:
    "/apps/operator-web/public/internal/frontend-shell-foundation-atlas/index.html",
  clientPortalHomePage: "/apps/client-portal-web/public/home/index.html",
} as const;

export function loadWebShellContractFixture() {
  return JSON.parse(
    fs.readFileSync(webShellContractFixturePaths.fixtureJson, "utf8"),
  ) as SharedWebShellContractFixture;
}

export function semanticAnchorTestId(anchorRef: string) {
  return anchorRef;
}
