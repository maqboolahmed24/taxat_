import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  assertValidCandidateIdentityContract,
  BASE_RELEASE_CANDIDATE_IDENTITY_VECTOR,
  buildReleaseCandidateIdentityContract,
  computeReleaseCandidateIdentityHash,
  type ReleaseCandidateIdentityContractRecord,
  validateCandidateIdentityContract,
} from "../../../packages/backend-manifest/src/index.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

async function validatePayloadAgainstSchema(schemaName: string, payload: unknown) {
  const script = `
import json
import pathlib
import sys

repo = pathlib.Path(sys.argv[1])
sys.path.insert(0, str(repo / "packages" / "contracts-core" / "python"))
from validate_contracts import Draft202012Validator, build_registry, load_json  # type: ignore

schema_name = sys.argv[2]
payload = json.loads(sys.argv[3])
schema = load_json(repo / "packages" / "contracts-core" / "schemas" / schema_name)
validator = Draft202012Validator(
    schema,
    registry=build_registry(),
    format_checker=Draft202012Validator.FORMAT_CHECKER,
)
issues = [
    f"{'/'.join(map(str, error.absolute_path)) or '<root>'}: {error.message}"
    for error in sorted(validator.iter_errors(payload), key=lambda error: list(error.absolute_path))
]
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

class InMemoryReleaseCandidateIdentityStore {
  readonly #records = new Map<string, ReleaseCandidateIdentityContractRecord>();

  async save(contract: ReleaseCandidateIdentityContractRecord) {
    assertValidCandidateIdentityContract(contract, {
      candidate_identity_hash: contract.candidate_identity_hash,
    });
    this.#records.set(contract.candidate_identity_hash, structuredClone(contract));
  }

  async load(candidateIdentityHash: string) {
    const contract = this.#records.get(candidateIdentityHash);
    if (!contract) {
      throw new Error(`missing candidate identity ${candidateIdentityHash}`);
    }
    return structuredClone(contract);
  }
}

test("release candidate identity contract validates, stores, reloads, and rehashes", async () => {
  const store = new InMemoryReleaseCandidateIdentityStore();
  const contract = BASE_RELEASE_CANDIDATE_IDENTITY_VECTOR.contract;

  await validatePayloadAgainstSchema("release_candidate_identity_contract.schema.json", contract);
  await store.save(contract);

  const reloaded = await store.load(contract.candidate_identity_hash);
  await validatePayloadAgainstSchema("release_candidate_identity_contract.schema.json", reloaded);

  const validation = validateCandidateIdentityContract(reloaded, {
    candidate_identity_hash: contract.candidate_identity_hash,
    enabled_provider_profile_refs: contract.enabled_provider_profile_refs,
  });
  expect(validation.valid).toBe(true);
  expect(computeReleaseCandidateIdentityHash(reloaded)).toBe(contract.candidate_identity_hash);
});

test("imported sample release-candidate JSON is schema-valid and hash-consistent", async () => {
  const samplePath = path.join(
    repoRoot,
    "packages",
    "contracts-core",
    "samples",
    "sample_release_candidate_identity_contract.json",
  );
  const sample = JSON.parse(await readFile(samplePath, "utf8")) as unknown;

  await validatePayloadAgainstSchema("release_candidate_identity_contract.schema.json", sample);
  const contract = assertValidCandidateIdentityContract(sample);
  expect(contract.candidate_identity_hash).toBe(
    "64d88b39d20eda04a6762286bfb9a87051d0f8da7274cc6a2ed4ca3ad087877c",
  );
  expect(computeReleaseCandidateIdentityHash(contract)).toBe(contract.candidate_identity_hash);
});

test("storage reload fails closed when the nested contract hash diverges from the top-level mirror", async () => {
  const stored = buildReleaseCandidateIdentityContract({
    candidate_environment_ref: "candidate-env-roundtrip",
    build_artifact_ref: "build-roundtrip",
    artifact_digest: "artifact-digest-roundtrip",
    schema_bundle_hash: "schema-hash-roundtrip",
    config_bundle_hash: "config-hash-roundtrip",
    migration_plan_ref_or_null: null,
    enabled_provider_profile_refs: ["provider-a"],
    supported_client_window_ref_or_null: null,
  });
  const topLevelHash = stored.candidate_identity_hash;
  const reloadedWithDrift = {
    ...stored,
    candidate_identity_hash: "drifted-nested-candidate-hash",
  };

  const validation = validateCandidateIdentityContract(reloadedWithDrift, {
    candidate_identity_hash: topLevelHash,
  });

  expect(validation.valid).toBe(false);
  expect(validation.issues.map((issue) => issue.code)).toEqual(
    expect.arrayContaining([
      "RELEASE_CANDIDATE_CONTRACT_HASH_MISMATCH",
      "RELEASE_CANDIDATE_CONTRACT_EXPECTED_FIELD_MISMATCH",
    ]),
  );
});
