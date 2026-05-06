import { expect, test } from "@playwright/test";

import { buildNavigationIndex } from "../../../packages/contracts-docs/src/build_navigation_index.ts";

function artifactStub(overrides = {}) {
  return {
    artifactVersion: "CONTRACT_OBSERVATORY_ARTIFACT_V1",
    artifactSlug: "overview",
    artifactKind: "OVERVIEW",
    sectionRef: "OVERVIEW",
    authorityLevel: "GENERATED_COMPANION",
    sourceTruthBadge: "Generated",
    tone: "slate",
    title: "Overview",
    subtitle: "overview",
    summary: "Overview summary",
    canonicalPath: "config/docs/contracts_site_manifest.json",
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
    headerStrip: {
      kind: "OVERVIEW",
      badgeLabel: "Generated",
      metricPairs: [],
    },
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

test("buildNavigationIndex groups artifacts by explicit taxonomy order", () => {
  const index = buildNavigationIndex({
    artifacts: [
      artifactStub(),
      artifactStub({
        artifactSlug: "schema--actor_session",
        artifactKind: "SCHEMA",
        sectionRef: "SCHEMAS",
        authorityLevel: "AUTHORITATIVE",
        sourceTruthBadge: "Imported Schema Mirror",
        tone: "navy",
        title: "Actor Session",
        subtitle: "actor_session.schema.json",
        summary: "Authority schema.",
      }),
    ],
    navigationSchema: {
      schemaVersion: "CONTRACT_NAVIGATION_SCHEMA_V1",
      defaultSectionRef: "SUPPORT_DOCS",
      sectionOrder: ["OVERVIEW", "SCHEMAS", "SUPPORT_DOCS"],
      sections: [
        {
          sectionRef: "OVERVIEW",
          label: "Overview",
          summary: "Overview section",
          appliesToKinds: ["OVERVIEW"],
          includeGlobs: [],
        },
        {
          sectionRef: "SCHEMAS",
          label: "Schemas",
          summary: "Schema section",
          appliesToKinds: ["SCHEMA"],
          includeGlobs: [],
        },
        {
          sectionRef: "SUPPORT_DOCS",
          label: "Support",
          summary: "Fallback",
          appliesToKinds: ["MARKDOWN", "TASK_CARD"],
          includeGlobs: [],
        },
      ],
    },
    defaultArtifactSlug: "overview",
  });

  expect(index.defaultArtifactSlug).toBe("overview");
  expect(index.sections.map((section) => section.sectionRef)).toEqual([
    "OVERVIEW",
    "SCHEMAS",
    "SUPPORT_DOCS",
  ]);
  expect(index.sections[0].artifacts[0].artifactSlug).toBe("overview");
  expect(index.sections[1].artifacts[0].artifactSlug).toBe("schema--actor_session");
});
