import { expect, test } from "@playwright/test";

import { buildSchemaCrosslinkGraph } from "../../../packages/contracts-docs/src/build_schema_crosslink_graph.ts";

function baseArtifact(overrides = {}) {
  return {
    artifactVersion: "CONTRACT_OBSERVATORY_ARTIFACT_V1",
    artifactSlug: "artifact",
    artifactKind: "MARKDOWN",
    sectionRef: "SUPPORT_DOCS",
    authorityLevel: "SUPPORTING_REFERENCE",
    sourceTruthBadge: "Support Documentation",
    tone: "slate",
    title: "Artifact",
    subtitle: "artifact",
    summary: "artifact",
    canonicalPath: "artifact",
    sourceLineage: [],
    headingCount: 0,
    headings: [],
    proseSections: [],
    schemaIdentityOrNull: null,
    schemaFields: [],
    samplePointers: [],
    sampleIdentityOrNull: null,
    bindingIdentityOrNull: null,
    validatorIdentityOrNull: null,
    driftIdentityOrNull: null,
    headerStrip: { kind: "PROSE", badgeLabel: "Support", metricPairs: [] },
    relationships: {
      schemas: [],
      samples: [],
      bindings: [],
      validators: [],
      docs: [],
      tasks: [],
    },
    sourceTruthStack: {
      file: [],
      headings: [],
      schemaRefs: [],
      sampleRefs: [],
      bindingRefs: [],
      validatorRefs: [],
      driftRefs: [],
      taskRefs: [],
    },
    fieldCrosslinks: [],
    taskRefs: [],
    ...overrides,
  };
}

test("buildSchemaCrosslinkGraph links schema fields to prose sections and sample fragments", () => {
  const result = buildSchemaCrosslinkGraph({
    artifacts: [
      baseArtifact({
        artifactSlug: "schema--manifest_lineage_trace",
        artifactKind: "SCHEMA",
        sectionRef: "SCHEMAS",
        authorityLevel: "AUTHORITATIVE",
        title: "Manifest Lineage Trace",
        subtitle: "schema",
        schemaIdentityOrNull: {
          schemaName: "manifest_lineage_trace.schema.json",
          schemaId: "https://taxat.dev/schemas/manifest_lineage_trace.schema.json",
          logicalFamilyLabel: "Manifest & Release",
          validationPosture: "STRICT",
          sourceHash: "a",
          destinationHash: "a",
          refTargets: [],
        },
        schemaFields: [
          {
            path: "access_binding_hash",
            label: "access_binding_hash",
            typeLabel: "string",
            required: true,
            depth: 0,
            topLevelGroup: "access_binding_hash",
            descriptionOrNull: null,
            refTargetOrNull: null,
          },
        ],
        sourceTruthStack: {
          file: [],
          headings: [],
          schemaRefs: ["manifest_lineage_trace.schema.json"],
          sampleRefs: [],
          bindingRefs: [],
          validatorRefs: [],
          driftRefs: [],
          taskRefs: [],
        },
      }),
      baseArtifact({
        artifactSlug: "doc--analysis",
        title: "Analysis Note",
        proseSections: [
          {
            headingSlug: "overview",
            headingText: "Overview",
            level: 2,
            lines: ["The access_binding_hash must remain sealed."],
            plainText: "The access_binding_hash must remain sealed.",
            excerpt: "The access_binding_hash must remain sealed.",
            mentionedSchemaTokens: [],
            mentionedSampleTokens: [],
            mentionedTaskIds: [],
          },
        ],
        sourceTruthStack: {
          file: [],
          headings: [],
          schemaRefs: [
            "manifest_lineage_trace.schema.json",
            "https://taxat.dev/schemas/manifest_lineage_trace.schema.json",
          ],
          sampleRefs: [],
          bindingRefs: [],
          validatorRefs: [],
          driftRefs: [],
          taskRefs: [],
        },
      }),
      baseArtifact({
        artifactSlug: "sample--manifest_lineage_trace",
        artifactKind: "SAMPLE",
        sectionRef: "SAMPLES",
        authorityLevel: "AUTHORITATIVE",
        title: "Sample Manifest Lineage Trace",
        subtitle: "sample",
        sampleIdentityOrNull: {
          sampleName: "sample_manifest_lineage_trace.json",
          inferredSchemaName: "manifest_lineage_trace.schema.json",
          inferredSchemaId: "https://taxat.dev/schemas/manifest_lineage_trace.schema.json",
          validationPosture: "STRICT",
          sourceHash: "a",
          destinationHash: "a",
        },
        samplePointers: [
          {
            pointer: "/access_binding_hash",
            key: "access_binding_hash",
            preview: "binding-hash",
            topLevelGroup: "access_binding_hash",
          },
        ],
      }),
      baseArtifact({
        artifactSlug: "task--pc_0080",
        artifactKind: "TASK_CARD",
        title: "pc_0080",
        sourceTruthStack: {
          file: [],
          headings: [],
          schemaRefs: ["manifest_lineage_trace.schema.json"],
          sampleRefs: [],
          bindingRefs: [],
          validatorRefs: [],
          driftRefs: [],
          taskRefs: ["pc_0080"],
        },
        taskRefs: ["pc_0080"],
      }),
    ],
    validation: {
      brokenRelativeLinks: [],
      headingCollisions: [],
      missingSchemaTokens: [],
      orphanSamples: [],
    },
  });

  expect(result.graph.schemaNodes[0].linkedDocCount).toBe(2);
  expect(result.graph.schemaNodes[0].linkedSampleCount).toBe(1);
  expect(result.fieldCrosslinksByArtifactSlug.get("schema--manifest_lineage_trace")[0].proseTargets).toHaveLength(1);
  expect(result.fieldCrosslinksByArtifactSlug.get("schema--manifest_lineage_trace")[0].sampleTargets).toHaveLength(1);
});
