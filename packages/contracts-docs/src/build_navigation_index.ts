import type {
  ContractsNavigationSchema,
  NavigationIndex,
  NavigationSectionRef,
  ObservatoryArtifact,
} from "./types.ts";

function pickRule(
  artifact: ObservatoryArtifact,
  navigationSchema: ContractsNavigationSchema,
) {
  return (
    navigationSchema.sections.find(
      (rule) =>
        rule.sectionRef === artifact.sectionRef && rule.appliesToKinds.includes(artifact.artifactKind),
    ) ??
    navigationSchema.sections.find((rule) => rule.sectionRef === navigationSchema.defaultSectionRef) ??
    navigationSchema.sections[0]
  );
}

export function buildNavigationIndex(params: {
  artifacts: ObservatoryArtifact[];
  navigationSchema: ContractsNavigationSchema;
  defaultArtifactSlug: string;
}): NavigationIndex {
  const { artifacts, navigationSchema, defaultArtifactSlug } = params;
  const sectionMap = new Map<NavigationSectionRef, NavigationIndex["sections"][number]>();

  for (const sectionRef of navigationSchema.sectionOrder) {
    const rule = navigationSchema.sections.find((entry) => entry.sectionRef === sectionRef);
    if (!rule) {
      continue;
    }
    sectionMap.set(sectionRef, {
      sectionRef,
      label: rule.label,
      summary: rule.summary,
      artifactCount: 0,
      artifacts: [],
    });
  }

  for (const artifact of artifacts) {
    const rule = pickRule(artifact, navigationSchema);
    const section = sectionMap.get(rule.sectionRef);
    if (!section) {
      continue;
    }
    section.artifacts.push({
      artifactSlug: artifact.artifactSlug,
      artifactKind: artifact.artifactKind,
      authorityLevel: artifact.authorityLevel,
      sourceTruthBadge: artifact.sourceTruthBadge,
      title: artifact.title,
      subtitle: artifact.subtitle,
      summary: artifact.summary,
      canonicalPath: artifact.canonicalPath,
      tone: artifact.tone,
      sourceTruthStackCounts: {
        schemas: artifact.sourceTruthStack.schemaRefs.length,
        samples: artifact.sourceTruthStack.sampleRefs.length,
        bindings: artifact.sourceTruthStack.bindingRefs.length,
        validators: artifact.sourceTruthStack.validatorRefs.length,
        tasks: artifact.sourceTruthStack.taskRefs.length,
      },
    });
  }

  const sections = navigationSchema.sectionOrder
    .map((sectionRef) => sectionMap.get(sectionRef))
    .filter((section): section is NavigationIndex["sections"][number] => section !== undefined)
    .map((section) => ({
      ...section,
      artifactCount: section.artifacts.length,
      artifacts: section.artifacts.sort((left, right) => left.title.localeCompare(right.title)),
    }));

  return {
    indexVersion: "CONTRACT_NAVIGATION_INDEX_V1",
    defaultArtifactSlug,
    sections,
  };
}
