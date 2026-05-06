import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(scriptDir, "..", "..", "..");

export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export function toPosix(value: string) {
  return value.split(path.sep).join(path.posix.sep);
}

export function relativeFromRepo(absolutePath: string) {
  return toPosix(path.relative(repoRoot, absolutePath));
}

export async function readJson<T>(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

export function canonicalJsonStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJsonStringify(entry)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
    left.localeCompare(right),
  );
  return `{${entries
    .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJsonStringify(child)}`)
    .join(",")}}`;
}

export function stableHash(value: unknown) {
  return createHash("sha256").update(canonicalJsonStringify(value)).digest("hex");
}

export async function walkFiles(rootPath: string): Promise<string[]> {
  const entries = await readdir(rootPath, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = path.join(rootPath, entry.name);
      if (entry.isDirectory()) {
        return walkFiles(absolutePath);
      }
      return [absolutePath];
    }),
  );
  return files.flat().sort((left, right) => left.localeCompare(right));
}

export async function listMatchingFiles(rootRelativePath: string, includeGlobs: string[]) {
  const absoluteRoot = path.join(repoRoot, rootRelativePath);
  const files = await walkFiles(absoluteRoot);
  return files
    .map((absolutePath) => ({
      relativeFromRoot: toPosix(path.relative(absoluteRoot, absolutePath)),
      relativeFromRepo: relativeFromRepo(absolutePath),
    }))
    .filter(({ relativeFromRoot, relativeFromRepo }) =>
      includeGlobs.some(
        (glob) =>
          path.matchesGlob(relativeFromRoot, glob) || path.matchesGlob(relativeFromRepo, glob),
      ),
    )
    .map(({ relativeFromRepo }) => relativeFromRepo)
    .sort();
}

export async function ensureDirectory(targetPath: string) {
  await mkdir(targetPath, { recursive: true });
}

export async function writeIfChanged(filePath: string, contents: string) {
  let existing: string | null = null;
  try {
    existing = await readFile(filePath, "utf8");
  } catch {
    existing = null;
  }
  if (existing === contents) {
    return false;
  }
  await ensureDirectory(path.dirname(filePath));
  await writeFile(filePath, contents, "utf8");
  return true;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[`*_~()[\]{}'"!?.,:/\\]+/g, " ")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function stripMarkdown(input: string) {
  return input
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_>#-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function excerpt(input: string, maxLength: number) {
  const normalized = stripMarkdown(input);
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function humanizeStem(stem: string) {
  return stem
    .replace(/\.schema\.json$/i, "")
    .replace(/^sample_/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function unique<T>(values: T[]) {
  return [...new Set(values)];
}

export async function exists(relativePath: string) {
  try {
    await stat(path.join(repoRoot, relativePath));
    return true;
  } catch {
    return false;
  }
}

export function tokenSet(text: string) {
  return unique(
    stripMarkdown(text)
      .toLowerCase()
      .split(/[^a-z0-9_.:/-]+/g)
      .filter((token) => token.length > 1),
  );
}
