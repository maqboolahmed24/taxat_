import { expect, test } from "@playwright/test";

import {
  artifactContractGate,
  recordArtifactContractRef,
  recordArtifactContractRefs,
  type ArtifactSchemaValidator,
} from "../../../packages/backend-collection/src/index.ts";
import {
  buildSchemaBundleRecord,
  buildSchemaReaderWindowContract,
  type SchemaBundleEntryRecord,
  type SchemaBundleRecord,
} from "../../../packages/backend-manifest/src/index.ts";

const requiredTypes = [
  "SourcePlan",
  "SourceWindow",
  "CollectionBoundary",
  "NormalizationContext",
  "SourceRecordSet",
  "EvidenceItemSet",
  "CandidateFactSet",
  "ConflictSet",
  "CanonicalFactSet",
  "Snapshot",
  "InputFreeze",
] as const;

const setTypes = new Set([
  "SourceRecordSet",
  "EvidenceItemSet",
  "CandidateFactSet",
  "ConflictSet",
  "CanonicalFactSet",
]);

function schemaId(artifactType: string) {
  return `https://taxat.dev/schemas/${artifactType.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase()}.schema.json`;
}

function entry(
  artifactType: string,
  overrides: Partial<SchemaBundleEntryRecord> = {},
): SchemaBundleEntryRecord {
  return {
    allowed_upgrade_kinds: ["PATCH_BACKWARD", "MINOR_BACKWARD"],
    artifact_type: artifactType,
    compatibility_class: "BACKWARD_COMPATIBLE",
    content_hash: `schema-content-hash://${artifactType}`,
    dialect_ref: "json-schema-draft-2020-12",
    schema_id: schemaId(artifactType),
    semantic_version: "1.0.0",
    supersedes_schema_id: null,
    writer_min_reader_version: "1.0.0",
    ...overrides,
  };
}

function bundle(entries: SchemaBundleEntryRecord[]) {
  return buildSchemaBundleRecord({
    compatibility_profile_ref: "compat-profile://artifact-contract-gate/unit",
    entries,
    published_at: "2026-04-27T18:10:00Z",
    schema_reader_window_contract: buildSchemaReaderWindowContract({
      compatibility_window_ref: "compat-window://artifact-contract-gate/unit",
      supported_reader_schema_bundle_hashes: ["schema-bundle-hash://provisional"],
      window_state: "VERIFIED_PREVIOUS_READERS_SUPPORTED",
      writer_schema_bundle_hash: "schema-bundle-hash://provisional",
    }),
  });
}

function artifactContract(input: {
  artifactType: string;
  bundleHash: string;
  entry: SchemaBundleEntryRecord;
}) {
  return {
    allowed_upgrade_kinds: [...input.entry.allowed_upgrade_kinds],
    artifact_content_hash: `${input.artifactType.toLowerCase()}-content-hash://unit`,
    artifact_id: `${input.artifactType.toLowerCase()}://unit/${input.artifactType}`,
    artifact_type: input.artifactType,
    compatibility_class: input.entry.compatibility_class,
    content_hash: input.entry.content_hash,
    dialect_ref: input.entry.dialect_ref,
    schema_bundle_hash: input.bundleHash,
    schema_id: input.entry.schema_id,
    semantic_version: input.entry.semantic_version,
    supersedes_schema_id: input.entry.supersedes_schema_id ?? null,
    writer_build_id: "build.taxat.collection.0120.unit",
    writer_min_reader_version: input.entry.writer_min_reader_version,
  };
}

function fakeArtifact(input: {
  artifactType: (typeof requiredTypes)[number];
  bundle: SchemaBundleRecord;
}) {
  const schemaEntry = input.bundle.entries.find(
    (candidate) => candidate.artifact_type === input.artifactType,
  )!;
  const contract = artifactContract({
    artifactType: input.artifactType,
    bundleHash: input.bundle.schema_bundle_hash,
    entry: schemaEntry,
  });
  const base = {
    artifact_type: input.artifactType,
    contract,
    manifest_id: "manifest-0120-unit",
  };
  if (!setTypes.has(input.artifactType)) {
    return base;
  }
  return {
    ...base,
    artifact_contract_hash: recordArtifactContractRef({ contract }).artifact_contract_hash,
    items: [],
  };
}

function pack(schemaBundle = bundle(requiredTypes.map((artifactType) => entry(artifactType)))) {
  const artifacts = Object.fromEntries(
    requiredTypes.map((artifactType) => [
      artifactType,
      fakeArtifact({ artifactType, bundle: schemaBundle }),
    ]),
  );
  const contracts = requiredTypes
    .filter((artifactType) => artifactType !== "InputFreeze")
    .map((artifactType) => artifacts[artifactType]!.contract);
  const recorded = recordArtifactContractRefs({ contracts });
  const inputFreeze = {
    ...artifacts.InputFreeze!,
    artifact_contract_hash: recorded.artifact_contract_hash,
    artifact_contract_refs: recorded.artifact_contract_refs,
  };
  return {
    artifacts: {
      candidate_fact_set: artifacts.CandidateFactSet!,
      canonical_fact_set: artifacts.CanonicalFactSet!,
      collection_boundary: artifacts.CollectionBoundary!,
      conflict_set: artifacts.ConflictSet!,
      evidence_item_set: artifacts.EvidenceItemSet!,
      input_freeze: inputFreeze,
      normalization_context: artifacts.NormalizationContext!,
      snapshot: artifacts.Snapshot!,
      source_plan: artifacts.SourcePlan!,
      source_record_set: artifacts.SourceRecordSet!,
      source_window: artifacts.SourceWindow!,
    },
    schemaBundle,
  };
}

const passValidator: ArtifactSchemaValidator = () => ({ issues: [], valid: true });

async function runGate(input: ReturnType<typeof pack>) {
  return artifactContractGate({
    artifacts: input.artifacts,
    decided_at: "2026-04-27T18:20:00Z",
    effective_scope: ["year_end", "prepare_submission"],
    manifest_id: "manifest-0120-unit",
    schema_bundle: input.schemaBundle,
    schema_validator: passValidator,
  });
}

test("clean frozen bundle and contract refs produce a pass gate record", async () => {
  const result = await runGate(pack());

  expect(result.validation.issues).toEqual([]);
  expect(result.validation.decision).toBe("PASS");
  expect(result.validation.reason_codes).toEqual(["ARTIFACT_CONTRACTS_VALID"]);
  expect(result.gate_record).toMatchObject({
    decision: "PASS",
    gate_code: "ARTIFACT_CONTRACT_GATE",
    gate_stage_index: 2,
    manifest_id: "manifest-0120-unit",
  });
  expect(result.gate_record.input_artifact_refs).toHaveLength(11);
});

test("missing or ambiguous frozen schema entries hard-block", async () => {
  const missing = pack();
  missing.schemaBundle = bundle(
    requiredTypes
      .filter((artifactType) => artifactType !== "SourcePlan")
      .map((artifactType) => entry(artifactType)),
  );

  const missingResult = await runGate(missing);
  expect(missingResult.gate_record.decision).toBe("HARD_BLOCK");
  expect(missingResult.gate_record.reason_codes).toContain("ARTIFACT_SCHEMA_MISSING");

  const ambiguousBundle = bundle([
    ...requiredTypes.map((artifactType) => entry(artifactType)),
    entry("SourcePlan", {
      schema_id: "https://taxat.dev/schemas/source_plan_legacy.schema.json",
    }),
  ]);
  const ambiguousResult = await runGate(pack(ambiguousBundle));
  expect(ambiguousResult.gate_record.decision).toBe("HARD_BLOCK");
  expect(ambiguousResult.gate_record.reason_codes).toContain("ARTIFACT_SCHEMA_MISSING");
});

test("deprecated but reader-window-allowed schemas pass with notice", async () => {
  const deprecatedBundle = bundle(
    requiredTypes.map((artifactType) =>
      entry(
        artifactType,
        artifactType === "SourcePlan" ? { compatibility_class: "DEPRECATED" } : {},
      ),
    ),
  );
  const result = await runGate(pack(deprecatedBundle));

  expect(result.gate_record.decision).toBe("PASS_WITH_NOTICE");
  expect(result.gate_record.reason_codes).toContain("ARTIFACT_SCHEMA_DEPRECATED_ALLOWED");
});

test("envelope incompleteness and contract hash mismatches hard-block", async () => {
  const incomplete = pack();
  delete (incomplete.artifacts.source_plan as { contract: { writer_build_id?: string } }).contract
    .writer_build_id;
  const incompleteResult = await runGate(incomplete);
  expect(incompleteResult.gate_record.decision).toBe("HARD_BLOCK");
  expect(incompleteResult.gate_record.reason_codes).toContain("ARTIFACT_ENVELOPE_INCOMPLETE");

  const mismatch = pack();
  (mismatch.artifacts.input_freeze as { artifact_contract_hash: string }).artifact_contract_hash =
    "artifact-contract-hash://wrong";
  const mismatchResult = await runGate(mismatch);
  expect(mismatchResult.gate_record.decision).toBe("HARD_BLOCK");
  expect(mismatchResult.gate_record.reason_codes).toContain("ARTIFACT_CONTRACT_HASH_MISMATCH");
});

test("schema closure failures and analysis-only missing hash map deterministically", async () => {
  const closureFailure = pack();
  const result = await artifactContractGate({
    artifacts: closureFailure.artifacts,
    decided_at: "2026-04-27T18:20:00Z",
    effective_scope: ["year_end", "prepare_submission"],
    manifest_id: "manifest-0120-unit",
    schema_bundle: closureFailure.schemaBundle,
    schema_validator: (input) =>
      input.artifact_type === "CollectionBoundary"
        ? {
            issues: [{ message: "Unevaluated properties are not allowed", path: "<root>" }],
            valid: false,
          }
        : { issues: [], valid: true },
  });
  expect(result.gate_record.decision).toBe("HARD_BLOCK");
  expect(result.gate_record.reason_codes).toContain("ARTIFACT_SCHEMA_VALIDATION_FAILED");

  const analysisOnly = pack();
  (
    analysisOnly.artifacts.input_freeze as { artifact_contract_hash: string }
  ).artifact_contract_hash = "";
  const analysisResult = await artifactContractGate({
    artifacts: analysisOnly.artifacts,
    decided_at: "2026-04-27T18:21:00Z",
    effective_scope: ["estimate_only"],
    execution_mode: "ANALYSIS",
    manifest_id: "manifest-0120-analysis",
    schema_bundle: analysisOnly.schemaBundle,
    schema_validator: passValidator,
  });
  expect(analysisResult.gate_record.decision).toBe("PASS_WITH_NOTICE");
  expect(analysisResult.gate_record.reason_codes).toContain("ARTIFACT_CONTRACT_HASH_MISMATCH");
});
