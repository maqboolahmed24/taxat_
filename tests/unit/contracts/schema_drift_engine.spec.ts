import { expect, test } from "@playwright/test";

import {
  compareSchemaBundles,
  createSyntheticSchemaArtifactSnapshot,
  createSyntheticSchemaBundleMaterialization,
  loadSchemaDriftPolicy,
  stableHash,
} from "../../../packages/contracts-tools/src/index.ts";

function createBaseSchemaArtifact() {
  return createSyntheticSchemaArtifactSnapshot({
    schemaName: "authority_truth_contract.schema.json",
    schemaId: "https://taxat.dev/schemas/authority_truth_contract.schema.json",
    document: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://taxat.dev/schemas/authority_truth_contract.schema.json",
      type: "object",
      properties: {
        authority_ref: {
          type: "string",
        },
      },
      required: ["authority_ref"],
      additionalProperties: false,
    },
    documentationRefs: ["docs/contracts/authority_truth_contract.md"],
    sampleBindings: [
      {
        sampleName: "sample_authority_truth_contract.json",
        destinationPath: "packages/contracts-core/samples/sample_authority_truth_contract.json",
        destinationHash: stableHash("sample-authority-truth-contract"),
      },
    ],
  });
}

test("optional field addition stays additive and requires no migration ledger", async () => {
  const policy = await loadSchemaDriftPolicy();
  const baselineSchema = createBaseSchemaArtifact();
  const candidateSchema = createSyntheticSchemaArtifactSnapshot({
    ...baselineSchema,
    document: {
      ...(baselineSchema.document as Record<string, unknown>),
      properties: {
        authority_ref: {
          type: "string",
        },
        reviewer_note_or_null: {
          type: ["string", "null"],
        },
      },
      required: ["authority_ref"],
    },
  });

  const diff = compareSchemaBundles({
    baselineBundle: createSyntheticSchemaBundleMaterialization({
      bundleRef: "baseline.optional-field",
      bundleRole: "BASELINE",
      schemas: [baselineSchema],
    }),
    candidateBundle: createSyntheticSchemaBundleMaterialization({
      bundleRef: "candidate.optional-field",
      bundleRole: "CANDIDATE",
      schemas: [candidateSchema],
    }),
    policy,
  });

  expect(diff.deltas).toHaveLength(1);
  expect(diff.deltas[0]).toMatchObject({
    diffCode: "OPTIONAL_PROPERTY_ADDED",
    atlasGroupRef: "ADDITIVE",
    migrationRequirement: "NONE",
    readinessImpactRef: "ROLLBACK_SAFE",
  });
});

test("schema identity drift plus rename surfaces structural and parity deltas together", async () => {
  const policy = await loadSchemaDriftPolicy();
  const baselineSchema = createBaseSchemaArtifact();
  const candidateSchema = createSyntheticSchemaArtifactSnapshot({
    ...baselineSchema,
    schemaId: "https://taxat.dev/schemas/authority_truth_contract_v2.schema.json",
    documentationRefs: ["docs/contracts/authority_truth_contract_v2.md"],
    sampleBindings: [
      {
        sampleName: "sample_authority_truth_contract_v2.json",
        destinationPath: "packages/contracts-core/samples/sample_authority_truth_contract_v2.json",
        destinationHash: stableHash("sample-authority-truth-contract-v2"),
      },
    ],
    document: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://taxat.dev/schemas/authority_truth_contract_v2.schema.json",
      type: "object",
      properties: {
        authority_binding_ref: {
          type: "string",
        },
      },
      required: ["authority_binding_ref"],
      additionalProperties: false,
    },
  });

  const diff = compareSchemaBundles({
    baselineBundle: createSyntheticSchemaBundleMaterialization({
      bundleRef: "baseline.rename",
      bundleRole: "BASELINE",
      schemas: [baselineSchema],
    }),
    candidateBundle: createSyntheticSchemaBundleMaterialization({
      bundleRef: "candidate.rename",
      bundleRole: "CANDIDATE",
      schemas: [candidateSchema],
    }),
    policy,
  });

  expect(diff.deltas.map((delta) => delta.diffCode)).toEqual(
    expect.arrayContaining([
      "SCHEMA_ID_CHANGED",
      "PROPERTY_REMOVED",
      "REQUIRED_PROPERTY_ADDED",
      "DOC_TOKEN_STALE",
      "SAMPLE_BINDING_DRIFT",
    ]),
  );
});

test("binding coverage drift creates stale source-map and per-language deltas", async () => {
  const policy = await loadSchemaDriftPolicy();
  const baselineSchema = createBaseSchemaArtifact();

  const baselineBundle = createSyntheticSchemaBundleMaterialization({
    bundleRef: "baseline.binding",
    bundleRole: "BASELINE",
    schemas: [baselineSchema],
  });
  const candidateBundle = createSyntheticSchemaBundleMaterialization({
    bundleRef: "candidate.binding",
    bundleRole: "CANDIDATE",
    schemas: [baselineSchema],
    schemaSourceMapHash: "candidate-source-map-hash",
    generatedBindingSnapshot: {
      generationSourceMapHash: "stale-source-map-hash",
      familyCoverageByLanguage: {
        TYPESCRIPT: ["AUTHORITY_AND_ACCESS"],
        PYTHON: ["AUTHORITY_AND_ACCESS"],
      },
      staleLanguageRefs: ["SWIFT"],
      stateRef: "DRIFT",
    },
  });

  const diff = compareSchemaBundles({
    baselineBundle,
    candidateBundle,
    policy,
  });

  expect(diff.deltas.map((delta) => delta.diffCode)).toEqual(
    expect.arrayContaining(["BINDING_SOURCE_MAP_STALE", "BINDING_LANGUAGE_MISSING"]),
  );
  expect(diff.deltas.find((delta) => delta.diffCode === "BINDING_LANGUAGE_MISSING")).toMatchObject(
    {
      atlasGroupRef: "BINDING_DRIFT",
      candidateValueOrNull: "SWIFT",
    },
  );
});
