import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  addExactDecimals,
  canonicalJsonStringify,
  deriveAuthorityDuplicateMeaningKey,
  deriveAuthorityIdempotencyKey,
  deriveAuthorityRequestHash,
  normalizeBusinessDateString,
  normalizeBusinessPeriodLabel,
  normalizeUtcInstantString,
  stableJsonHash,
  stablePath,
  stableQueryString,
} from "../../../packages/domain-kernel/src/primitives/index.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const builderTool = path.join(
  repoRoot,
  "packages/domain-kernel/src/primitives/build_canonical_primitives_atlas.ts",
);
const pythonExecutable = path.join(repoRoot, ".venv", "bin", "python3");
const hashProfilePath = path.join(repoRoot, "config/primitives/hash_profile.json");
const atlasPayloadPath = path.join(
  repoRoot,
  "apps/operator-web/public/internal/canonical-primitives-atlas/data/canonical-primitives-atlas.json",
);

type HashProfile = {
  authority_examples: Array<{
    payload: Record<string, unknown>;
    resource_template: string;
    path_params: Record<string, unknown>;
    query_params: Record<string, unknown>;
    normalized_obligation_ref: string;
    normalized_basis_type: string;
  }>;
  canonical_examples: Array<{
    payload: unknown;
  }>;
  query_examples: Array<{
    query: Record<string, unknown>;
  }>;
  path_examples: Array<{
    template: string;
    params: Record<string, unknown>;
  }>;
};

type PythonParityResult = {
  canonical_json: string;
  hash_digest: string;
  query_string: string;
  path_string: string;
  decimal_add_result: string;
  time_normalized: string;
  time_business_date: string;
  time_period_label: string;
  authority_duplicate_meaning_key: string;
  authority_request_hash: string;
  authority_idempotency_key: string;
};

async function readJson<T>(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

async function runPythonParity(input: object) {
  const pythonProgram = `
from __future__ import annotations
import json
import sys

sys.path.insert(0, ${JSON.stringify(path.join(repoRoot, "python", "validators", "src"))})
sys.path.insert(0, ${JSON.stringify(path.join(repoRoot, "Algorithm", "scripts"))})

from taxat_validators.primitives import (  # type: ignore
    ExactDecimal,
    canonical_json_dumps,
    normalize_business_date,
    normalize_business_period_label,
    normalize_utc_instant_string,
    stable_json_hash,
)
from validate_contracts import (  # type: ignore
    derive_authority_duplicate_meaning_key,
    derive_authority_idempotency_key,
    derive_authority_request_hash,
    stable_path,
    stable_query_string,
)

payload = json.loads(sys.argv[1])
authority_example = payload["authorityExample"]
canonical_path = stable_path(authority_example["resource_template"], authority_example["path_params"])
canonical_query = stable_query_string(authority_example["query_params"])
duplicate_meaning_key = derive_authority_duplicate_meaning_key(
    authority_example["payload"],
    canonical_path,
    canonical_query,
    authority_example["normalized_obligation_ref"],
    authority_example["normalized_basis_type"],
)

print(json.dumps({
    "canonical_json": canonical_json_dumps(payload["hashPayload"]),
    "hash_digest": stable_json_hash(payload["hashPayload"]),
    "query_string": canonical_query,
    "path_string": canonical_path,
    "decimal_add_result": ExactDecimal.parse(payload["decimalLeft"]).add(ExactDecimal.parse(payload["decimalRight"])).to_canonical_string(),
    "time_normalized": normalize_utc_instant_string(payload["timeInstant"]),
    "time_business_date": normalize_business_date(payload["timeBusinessDate"]),
    "time_period_label": normalize_business_period_label(payload["timePeriodValue"], payload["timePeriodFamily"]),
    "authority_duplicate_meaning_key": duplicate_meaning_key,
    "authority_request_hash": derive_authority_request_hash(authority_example["payload"], duplicate_meaning_key),
    "authority_idempotency_key": derive_authority_idempotency_key(duplicate_meaning_key),
}, ensure_ascii=True))
`.trim();

  const { stdout } = await execFileAsync(
    pythonExecutable,
    ["-c", pythonProgram, JSON.stringify(input)],
    {
      cwd: repoRoot,
      maxBuffer: 16 * 1024 * 1024,
    },
  );

  return JSON.parse(stdout) as PythonParityResult;
}

test.describe.configure({ mode: "serial" });

test("canonical primitives atlas generator re-emits without drift and records pass-state parity rows", async () => {
  const before = await readFile(atlasPayloadPath, "utf8");

  await execFileAsync("node", ["--experimental-strip-types", builderTool, "--emit"], {
    cwd: repoRoot,
    maxBuffer: 16 * 1024 * 1024,
  });

  const after = await readFile(atlasPayloadPath, "utf8");
  expect(after).toBe(before);

  const payload = JSON.parse(after);
  expect(payload.title).toBe("Taxat Canonical Primitives Atlas");
  expect(payload.families.map((family: { family_ref: string }) => family.family_ref)).toEqual([
    "IDENTIFIERS",
    "HASHES",
    "DECIMALS",
    "TIME",
  ]);
  expect(
    payload.families.every((family: { parity_rows: Array<{ status: string }> }) =>
      family.parity_rows.every((row) => row.status === "PASS"),
    ),
  ).toBe(true);
});

test("TypeScript primitives match Python parity helpers and validator-backed authority hash formulas", async () => {
  const hashProfile = await readJson<HashProfile>(hashProfilePath);
  const authorityExample = hashProfile.authority_examples[0];
  const hashPayload = hashProfile.canonical_examples[0].payload;
  const queryPayload = hashProfile.query_examples[0].query;
  const pathPayload = hashProfile.path_examples[0];

  const canonicalPath = stablePath(pathPayload.template, pathPayload.params);
  expect(canonicalPath).not.toBeNull();

  const duplicateMeaningKey = deriveAuthorityDuplicateMeaningKey(
    authorityExample.payload,
    canonicalPath ?? "",
    stableQueryString(queryPayload),
    authorityExample.normalized_obligation_ref,
    authorityExample.normalized_basis_type,
  );

  const python = await runPythonParity({
    hashPayload,
    decimalLeft: "1.20",
    decimalRight: "0.003",
    timeInstant: "2026-04-23T10:15:00+01:00",
    timeBusinessDate: "2026-04-23",
    timePeriodFamily: "CALENDAR_MONTH",
    timePeriodValue: "2026-04",
    authorityExample,
  });

  expect(canonicalJsonStringify(hashPayload)).toBe(python.canonical_json);
  expect(stableJsonHash(hashPayload)).toBe(python.hash_digest);
  expect(stableQueryString(queryPayload)).toBe(python.query_string);
  expect(canonicalPath).toBe(python.path_string);
  expect(addExactDecimals("1.20", "0.003").toCanonicalString()).toBe(python.decimal_add_result);
  expect(normalizeUtcInstantString("2026-04-23T10:15:00+01:00")).toBe(python.time_normalized);
  expect(normalizeBusinessDateString("2026-04-23")).toBe(python.time_business_date);
  expect(normalizeBusinessPeriodLabel("2026-04", "CALENDAR_MONTH")).toBe(python.time_period_label);
  expect(duplicateMeaningKey).toBe(python.authority_duplicate_meaning_key);
  expect(deriveAuthorityRequestHash(authorityExample.payload, duplicateMeaningKey)).toBe(
    python.authority_request_hash,
  );
  expect(deriveAuthorityIdempotencyKey(duplicateMeaningKey)).toBe(python.authority_idempotency_key);
});
