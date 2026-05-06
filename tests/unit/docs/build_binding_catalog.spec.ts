import { expect, test } from "@playwright/test";

import { buildBindingCatalog } from "../../../packages/contracts-docs/src/build_binding_catalog.ts";

test("buildBindingCatalog maps schema families into language binding entries and keeps source-map posture explicit", () => {
  const catalog = buildBindingCatalog({
    bindingCoverageReport: {
      generationBasis: {
        sourceMapHash: "schema-map-hash",
      },
      languages: [
        {
          languageRef: "TYPESCRIPT",
          label: "TypeScript",
          summary: "Typed structural bindings.",
          families: [
            {
              familyRef: "AUTHORITY_AND_ACCESS",
              familyLabel: "Authority & Access",
              outputRef: "packages/generated-models/src/generated/typescript/authority-and-access.ts",
              coverageClass: "FULL_FAMILY",
              sourceHashAggregate: "family-hash",
              gapIds: ["TS:AUTHORITY:UNION"],
            },
          ],
        },
      ],
    },
    expectedSourceMapHash: "schema-map-hash",
    schemaSourceMap: {
      schemas: [
        {
          schemaName: "actor_session.schema.json",
          schemaId: "https://taxat.dev/schemas/actor_session.schema.json",
          logicalFamilyRef: "AUTHORITY_AND_ACCESS",
          logicalFamilyLabel: "Authority & Access",
        },
      ],
    },
  });

  expect(catalog.generationState).toBe("IN_SYNC");
  expect(catalog.languages).toEqual([
    {
      familyCount: 1,
      label: "TypeScript",
      languageRef: "TYPESCRIPT",
      summary: "Typed structural bindings.",
    },
  ]);
  expect(catalog.schemaBindings[0].entries).toEqual([
    {
      bindingRef: "TYPESCRIPT:AUTHORITY_AND_ACCESS",
      languageRef: "TYPESCRIPT",
      familyRef: "AUTHORITY_AND_ACCESS",
      familyLabel: "Authority & Access",
      outputRef: "packages/generated-models/src/generated/typescript/authority-and-access.ts",
      coverageClass: "FULL_FAMILY",
      sourceHashAggregate: "family-hash",
      generationState: "IN_SYNC",
      gapIds: ["TS:AUTHORITY:UNION"],
    },
  ]);
});

test("buildBindingCatalog flags stale source-map lineage when the binding report hash drifts", () => {
  const catalog = buildBindingCatalog({
    bindingCoverageReport: {
      generationBasis: {
        sourceMapHash: "stale-hash",
      },
      languages: [],
    },
    expectedSourceMapHash: "current-hash",
    schemaSourceMap: {
      schemas: [],
    },
  });

  expect(catalog.generationState).toBe("STALE_SOURCE_MAP");
  expect(catalog.schemaSourceMapHash).toBe("current-hash");
  expect(catalog.reportSourceMapHash).toBe("stale-hash");
});
