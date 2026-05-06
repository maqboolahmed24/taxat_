import { expect, test } from "@playwright/test";

import { buildSearchIndex } from "../../../packages/contracts-docs/src/build_search_index.ts";

test("buildSearchIndex emits artifact, heading, and field entries with deep links", () => {
  const index = buildSearchIndex({
    artifacts: [
      {
        artifactVersion: "CONTRACT_OBSERVATORY_ARTIFACT_V1",
        artifactSlug: "schema--manifest_lineage_trace",
        artifactKind: "SCHEMA",
        sectionRef: "SCHEMAS",
        authorityLevel: "AUTHORITATIVE",
        sourceTruthBadge: "Imported Schema Mirror",
        tone: "navy",
        title: "Manifest Lineage Trace",
        subtitle: "https://taxat.dev/schemas/manifest_lineage_trace.schema.json",
        summary: "Manifest lineage schema.",
        canonicalPath: "packages/contracts-core/schemas/manifest_lineage_trace.schema.json",
        sourceLineage: [],
        headingCount: 1,
        headings: [{ level: 2, text: "Overview", slug: "overview" }],
        proseSections: [
          {
            headingSlug: "overview",
            headingText: "Overview",
            level: 2,
            lines: ["access binding hash is retained."],
            plainText: "access binding hash is retained.",
            excerpt: "access binding hash is retained.",
            mentionedSchemaTokens: [],
            mentionedSampleTokens: [],
            mentionedTaskIds: [],
          },
        ],
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
        samplePointers: [],
        sampleIdentityOrNull: null,
        bindingIdentityOrNull: null,
        validatorIdentityOrNull: null,
        driftIdentityOrNull: null,
        headerStrip: { kind: "SCHEMA", badgeLabel: "Manifest", metricPairs: [] },
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
          schemaRefs: ["manifest_lineage_trace.schema.json"],
          sampleRefs: [],
          bindingRefs: [],
          validatorRefs: [],
          driftRefs: [],
          taskRefs: ["pc_0080"],
        },
        fieldCrosslinks: [],
        taskRefs: ["pc_0080"],
      },
    ],
  });

  expect(index.entries.some((entry) => entry.deepLink === "./index.html?artifact=schema--manifest_lineage_trace")).toBeTruthy();
  expect(
    index.entries.some((entry) => entry.deepLink.includes("heading=overview")),
  ).toBeTruthy();
  expect(
    index.entries.some((entry) => entry.deepLink.includes("field=access_binding_hash")),
  ).toBeTruthy();
});
