import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import { sampleBindingCatalog } from "../../../packages/contracts-core/src/schemaCatalog.ts";
import {
  buildFixturePackArtifacts,
  materializeDeterministicGoldenPack,
} from "../../../tools/fixtures/build_deterministic_fixture_pack.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

async function validatePayloadAgainstSchema(schemaName: string, payload: unknown) {
  const script = `
import json
import pathlib
import sys

repo = pathlib.Path(sys.argv[1])
sys.path.insert(0, str(repo / "packages" / "contracts-core" / "python"))
from validate_contracts import (  # type: ignore
    CUSTOM_VALIDATORS,
    Draft202012Validator,
    build_registry,
    load_json,
)

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

test("generator check passes and the materialized deterministic golden pack validates against the canonical schema", async () => {
  const { stdout } = await execFileAsync(
    "node",
    ["--experimental-strip-types", "./tools/fixtures/build_deterministic_fixture_pack.ts", "--check"],
    {
      cwd: repoRoot,
    },
  );

  expect(stdout).toContain("verified deterministic fixture pack");

  const goldenPack = await materializeDeterministicGoldenPack();
  await validatePayloadAgainstSchema("deterministic_golden_pack.schema.json", goldenPack);
});

test("canonical examples only reference schema-valid mirrored samples and keep the seeded golden-pack expectation aligned", async () => {
  const artifacts = await buildFixturePackArtifacts();
  const files = new Map(artifacts.files.map((file) => [path.relative(repoRoot, file.path), file.contents]));

  const sampleNames = new Set<string>();
  for (const [relativePath, contents] of files) {
    if (!relativePath.startsWith("fixtures/synthetic/canonical_domain_examples/")) {
      continue;
    }
    if (relativePath.endsWith("README.md")) {
      continue;
    }
    const bundle = JSON.parse(contents) as {
      fixture_bundle: { artifact_samples: Array<{ sample_name: string }> };
    };
    bundle.fixture_bundle.artifact_samples.forEach((sample) => sampleNames.add(sample.sample_name));
  }

  const bindings = [...sampleNames].map((sampleName) => {
    const binding = sampleBindingCatalog.find((entry) => entry.sampleName === sampleName);
    expect(binding, `expected sample binding for ${sampleName}`).toBeTruthy();
    return binding!;
  });

  for (const binding of bindings) {
    const payload = JSON.parse(
      await readFile(path.join(repoRoot, binding.destinationPath), "utf8"),
    ) as unknown;
    await validatePayloadAgainstSchema(binding.inferredSchemaName, payload);
  }

  const goldenPackSeed = JSON.parse(
    files.get("fixtures/synthetic/deterministic_golden_pack_seed.json") ?? "{}",
  ) as { expected_golden_pack_hash: string };
  const goldenPack = await materializeDeterministicGoldenPack();
  expect(goldenPackSeed.expected_golden_pack_hash).toBe(goldenPack.golden_pack_hash);
});
