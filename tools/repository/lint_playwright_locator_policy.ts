import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const repoRoot = "/Users/test/Code/taxat_";

type Violation = {
  filePath: string;
  lineNumber: number;
  message: string;
  snippet: string;
};

const blockedPatterns: Array<{ regex: RegExp; message: string }> = [
  {
    regex: /\bforce\s*:\s*true\b/,
    message: "Avoid `force: true`; fix actionability or locator semantics instead.",
  },
  {
    regex: /\bpage\.\$\$?\s*\(/,
    message: "Avoid Playwright element-handle APIs (`page.$`, `page.$$`); use locators instead.",
  },
  {
    regex: /\bwaitForTimeout\s*\(/,
    message: "Avoid `waitForTimeout`; wait on semantic UI state instead.",
  },
  {
    regex: /\.locator\(\s*["'`](?:xpath=|\/\/)/,
    message: "Avoid xpath locators; use semantic locators or stable IDs instead.",
  },
  {
    regex: /\.locator\(\s*["'`]css=/,
    message: "Avoid `css=` locators; use semantic locators or stable IDs instead.",
  },
  {
    regex: /\.locator\(\s*["'`][^"'`]*:nth-child\(/,
    message: "Avoid nth-child selectors; they are brittle under layout changes.",
  },
  {
    regex: /\.locator\(\s*["'`][^"'`]*>>[^"'`]*["'`]\s*\)/,
    message: "Avoid chained selector syntax; prefer explicit semantic locators.",
  },
];

function normalizeInput(filePath: string) {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  return {
    absolutePath,
    relativePath: path.relative(repoRoot, absolutePath).split(path.sep).join(path.posix.sep),
  };
}

function collectViolations(relativePath: string, contents: string) {
  const violations: Violation[] = [];
  const lines = contents.split("\n");

  lines.forEach((line, index) => {
    for (const blockedPattern of blockedPatterns) {
      if (blockedPattern.regex.test(line)) {
        violations.push({
          filePath: relativePath,
          lineNumber: index + 1,
          message: blockedPattern.message,
          snippet: line.trim(),
        });
      }
    }
  });

  return violations;
}

async function main() {
  const passthroughFiles = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
  const defaultScopes = ["tests/playwright", "tests/integration", "automation/provisioning/tests"];
  const targets =
    passthroughFiles.length > 0
      ? passthroughFiles.map((filePath) => normalizeInput(filePath))
      : defaultScopes.map((scope) => normalizeInput(scope));

  const fileSet = new Set<string>();
  const queue = [...targets];

  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) {
      continue;
    }
    const stats = await readFile(current.absolutePath, "utf8").catch(() => null);
    if (stats !== null) {
      if (current.relativePath.endsWith(".ts")) {
        fileSet.add(current.relativePath);
      }
      continue;
    }

    const dirEntries = await (await import("node:fs/promises")).readdir(current.absolutePath, {
      withFileTypes: true,
    });
    for (const entry of dirEntries) {
      const absolutePath = path.join(current.absolutePath, entry.name);
      const relativePath = path
        .relative(repoRoot, absolutePath)
        .split(path.sep)
        .join(path.posix.sep);
      if (entry.isDirectory()) {
        queue.push({ absolutePath, relativePath });
      } else if (entry.isFile() && entry.name.endsWith(".ts")) {
        fileSet.add(relativePath);
      }
    }
  }

  const violations: Violation[] = [];
  for (const relativePath of [...fileSet].sort()) {
    const absolutePath = path.join(repoRoot, relativePath);
    const contents = await readFile(absolutePath, "utf8");
    violations.push(...collectViolations(relativePath, contents));
  }

  if (violations.length > 0) {
    for (const violation of violations) {
      console.error(
        `${violation.filePath}:${violation.lineNumber} ${violation.message}\n  ${violation.snippet}`,
      );
    }
    process.exitCode = 1;
    return;
  }

  console.log(`verified playwright locator policy: ${fileSet.size} files`);
}

await main();
