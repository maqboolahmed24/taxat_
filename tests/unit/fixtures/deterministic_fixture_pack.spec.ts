import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import { stableJsonHash } from "../../../packages/domain-kernel/src/primitives/hash.ts";
import {
  buildFixturePackArtifacts,
  materializeDeterministicGoldenPack,
} from "../../../tools/fixtures/build_deterministic_fixture_pack.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

function relativeFileMap(files: Array<{ contents: string; path: string }>) {
  return new Map(files.map((file) => [path.relative(repoRoot, file.path), file.contents]));
}

function parseJsonFile<T>(files: Map<string, string>, relativePath: string) {
  const contents = files.get(relativePath);
  expect(contents, `expected generated file ${relativePath}`).toBeTruthy();
  return JSON.parse(contents) as T;
}

test("covers the minimum embodiment set with deterministic seeds and required bundle structure", async () => {
  const artifacts = await buildFixturePackArtifacts();
  const files = relativeFileMap(artifacts.files);
  const embodimentIndex = parseJsonFile<{
    entries: Array<{ embodiment_ref: string; file_path: string; accessible_label: string }>;
  }>(files, "fixtures/synthetic/embodiment_index.json");

  expect(embodimentIndex.entries.map((entry) => entry.embodiment_ref)).toEqual([
    "EMB-01",
    "EMB-02",
    "EMB-03",
    "EMB-04",
    "EMB-05",
    "EMB-06",
    "EMB-07",
    "EMB-08",
    "EMB-09",
    "EMB-10",
    "EMB-11",
    "EMB-12",
  ]);

  for (const entry of embodimentIndex.entries) {
    const bundle = parseJsonFile<{
      deterministic_seed: { seed_hex: string; seed_ref: string };
      fixture_bundle: { artifact_samples: unknown[]; minimum_artifact_bundle: string[] };
      privacy_statement: string;
      scenario_variants: Array<{
        artifact_refs: unknown[];
        audit_timeline_skeleton: unknown[];
        constraint_refs: string[];
        expected_gate_outcomes: unknown[];
        expected_query_outputs: unknown[];
        test_vector_refs: string[];
      }>;
    }>(files, entry.file_path);

    expect(bundle.deterministic_seed.seed_ref).toContain(entry.embodiment_ref.toLowerCase());
    expect(bundle.deterministic_seed.seed_hex).toHaveLength(64);
    expect(bundle.fixture_bundle.artifact_samples.length).toBeGreaterThan(0);
    expect(bundle.fixture_bundle.minimum_artifact_bundle).toEqual([
      "NARRATIVE",
      "ARTIFACT_SAMPLES",
      "EXPECTED_GATE_OUTCOMES",
      "EXPECTED_ARTIFACT_REFS",
      "EXPECTED_AUDIT_TIMELINE",
      "EXPECTED_QUERY_OUTPUTS",
      "REPLAY_PROJECTION_POSTURE",
      "TRACEABILITY_BINDING",
    ]);
    expect(bundle.privacy_statement).toMatch(/synthetic/i);

    for (const variant of bundle.scenario_variants) {
      expect(variant.expected_gate_outcomes.length).toBeGreaterThan(0);
      expect(variant.artifact_refs.length).toBeGreaterThan(0);
      expect(variant.audit_timeline_skeleton.length).toBeGreaterThan(0);
      expect(variant.expected_query_outputs.length).toBeGreaterThan(0);
      expect(variant.test_vector_refs.length).toBeGreaterThan(0);
      expect(variant.constraint_refs.length).toBeGreaterThan(0);
    }

    expect(entry.accessible_label).toMatch(/^embodiment /);
  }
});

test("keeps generated fixture hashes, golden-pack materialization, and constraint coverage stable", async () => {
  const [left, right, registerText] = await Promise.all([
    buildFixturePackArtifacts(),
    buildFixturePackArtifacts(),
    readFile(path.join(repoRoot, "Algorithm", "constraint_traceability_register.json"), "utf8"),
  ]);
  const [goldenLeft, goldenRight] = await Promise.all([
    materializeDeterministicGoldenPack(),
    materializeDeterministicGoldenPack(),
  ]);

  const leftFiles = relativeFileMap(left.files);
  const rightFiles = relativeFileMap(right.files);

  const trackedHashes = [
    "fixtures/synthetic/deterministic_seed_catalog.json",
    "fixtures/synthetic/constraint_traceability_fixture_map.json",
    "fixtures/synthetic/deterministic_golden_pack_seed.json",
    "apps/operator-web/public/internal/canonical-domain-example-atlas/data/canonical-domain-example-atlas.json",
  ].map((relativePath) => ({
    relativePath,
    left: `${stableJsonHash(JSON.parse(leftFiles.get(relativePath) ?? "{}"))}`,
    right: `${stableJsonHash(JSON.parse(rightFiles.get(relativePath) ?? "{}"))}`,
  }));

  expect(trackedHashes.every((entry) => entry.left === entry.right)).toBe(true);
  expect(`${stableJsonHash(goldenLeft)}`).toBe(`${stableJsonHash(goldenRight)}`);
  expect(goldenLeft.golden_pack_hash).toBe(goldenRight.golden_pack_hash);

  const constraintRegister = JSON.parse(registerText) as {
    entries: Array<{ constraint_id: string }>;
  };
  const fixtureMap = parseJsonFile<{
    mappings: Array<{ constraint_ref: string }>;
  }>(leftFiles, "fixtures/synthetic/constraint_traceability_fixture_map.json");

  expect(fixtureMap.mappings.map((entry) => entry.constraint_ref).sort()).toEqual(
    constraintRegister.entries.map((entry) => entry.constraint_id).sort(),
  );
});
