import type {
  ArtifactAuthorityLevel,
  ArtifactKind,
  NavigationSectionRef,
  ObservatoryArtifact,
  SchemaCrosslinkGraph,
} from "./types.ts";

type CrosslinkValidation = {
  brokenRelativeLinks: SchemaCrosslinkGraph["brokenRelativeLinks"];
  headingCollisions: SchemaCrosslinkGraph["headingCollisions"];
  missingSchemaTokens: SchemaCrosslinkGraph["missingSchemaTokens"];
  orphanSamples: SchemaCrosslinkGraph["orphanSamples"];
};

function makeLink(
  artifact: ObservatoryArtifact,
  reason: string,
  headingSlugOrNull: string | null = null,
) {
  return {
    artifactSlug: artifact.artifactSlug,
    title: artifact.title,
    kind: artifact.artifactKind as ArtifactKind,
    authorityLevel: artifact.authorityLevel as ArtifactAuthorityLevel,
    sectionRef: artifact.sectionRef as NavigationSectionRef,
    headingSlugOrNull,
    reason,
  };
}

export function buildSchemaCrosslinkGraph(params: {
  artifacts: ObservatoryArtifact[];
  validation: CrosslinkValidation;
}) {
  const schemaArtifacts = params.artifacts.filter((artifact) => artifact.artifactKind === "SCHEMA");
  const sampleArtifacts = params.artifacts.filter((artifact) => artifact.artifactKind === "SAMPLE");
  const bindingArtifacts = params.artifacts.filter((artifact) => artifact.artifactKind === "BINDING");
  const docArtifacts = params.artifacts.filter(
    (artifact) => artifact.artifactKind === "MARKDOWN" || artifact.artifactKind === "OVERVIEW",
  );
  const taskArtifacts = params.artifacts.filter((artifact) => artifact.artifactKind === "TASK_CARD");
  const nonSchemaDocArtifacts = [...docArtifacts, ...taskArtifacts];

  const fieldCrosslinksByArtifactSlug = new Map<
    string,
    ObservatoryArtifact["fieldCrosslinks"]
  >();
  const relationshipsByArtifactSlug = new Map<
    string,
    Pick<ObservatoryArtifact["relationships"], "bindings" | "docs" | "samples" | "tasks" | "validators">
  >();

  const schemaNodes = schemaArtifacts.map((schemaArtifact) => {
    const schemaName = schemaArtifact.schemaIdentityOrNull?.schemaName ?? schemaArtifact.title;
    const schemaId = schemaArtifact.schemaIdentityOrNull?.schemaId ?? schemaArtifact.title;
    const linkedDocs = nonSchemaDocArtifacts.filter((artifact) =>
      artifact.sourceTruthStack.schemaRefs.some((entry) => entry === schemaName || entry === schemaId),
    );
    const linkedSamples = sampleArtifacts.filter(
      (artifact) => artifact.sampleIdentityOrNull?.inferredSchemaName === schemaName,
    );
    const linkedBindings = bindingArtifacts.filter((artifact) =>
      artifact.sourceTruthStack.schemaRefs.includes(schemaName),
    );
    const linkedTasks = taskArtifacts.filter((artifact) =>
      artifact.sourceTruthStack.schemaRefs.some((entry) => entry === schemaName || entry === schemaId),
    );

    const fieldCrosslinks = schemaArtifact.schemaFields.map((field) => {
      const proseTargets = linkedDocs.flatMap((artifact) =>
        artifact.proseSections
          .filter((section) => {
            const haystack = `${section.plainText} ${section.headingText}`.toLowerCase();
            return (
              haystack.includes(field.label.toLowerCase()) ||
              haystack.includes(field.path.toLowerCase())
            );
          })
          .map((section) => ({
            artifactSlug: artifact.artifactSlug,
            headingSlug: section.headingSlug,
            title: artifact.title,
            excerpt: section.excerpt,
          })),
      );
      const sampleTargets = linkedSamples.flatMap((artifact) =>
        artifact.samplePointers
          .filter((pointer) => pointer.key === field.label || pointer.pointer.endsWith(`/${field.label}`))
          .map((pointer) => ({
            artifactSlug: artifact.artifactSlug,
            pointer: pointer.pointer,
            preview: pointer.preview,
          })),
      );

      return {
        fieldPath: field.path,
        proseTargets,
        sampleTargets,
      };
    });

    fieldCrosslinksByArtifactSlug.set(schemaArtifact.artifactSlug, fieldCrosslinks);
    relationshipsByArtifactSlug.set(schemaArtifact.artifactSlug, {
      bindings: linkedBindings.map((artifact) => makeLink(artifact, "shares the same logical binding family")),
      docs: linkedDocs.map((artifact) => makeLink(artifact, "mentions this schema")),
      samples: linkedSamples.map((artifact) => makeLink(artifact, "is bound to this schema")),
      tasks: linkedTasks.map((artifact) => makeLink(artifact, "references this schema or schema id")),
      validators: [],
    });

    return {
      schemaName,
      schemaId,
      artifactSlug: schemaArtifact.artifactSlug,
      linkedDocCount: linkedDocs.length,
      linkedSampleCount: linkedSamples.length,
      linkedBindingCount: linkedBindings.length,
      linkedTaskCount: linkedTasks.length,
      fields: fieldCrosslinks.map((field) => ({
        fieldPath: field.fieldPath,
        proseTargets: field.proseTargets.map((target) => ({
          artifactSlug: target.artifactSlug,
          headingSlug: target.headingSlug,
          title: target.title,
        })),
        sampleTargets: field.sampleTargets.map((target) => ({
          artifactSlug: target.artifactSlug,
          pointer: target.pointer,
        })),
      })),
    };
  });

  return {
    fieldCrosslinksByArtifactSlug,
    graph: {
      graphVersion: "SCHEMA_CROSSLINK_GRAPH_V1",
      brokenRelativeLinks: params.validation.brokenRelativeLinks,
      missingSchemaTokens: params.validation.missingSchemaTokens,
      orphanSamples: params.validation.orphanSamples,
      headingCollisions: params.validation.headingCollisions,
      schemaNodes,
    } satisfies SchemaCrosslinkGraph,
    relationshipsByArtifactSlug,
  };
}
