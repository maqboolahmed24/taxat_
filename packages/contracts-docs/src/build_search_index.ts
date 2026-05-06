import type { ObservatoryArtifact, SearchIndex, SearchIndexEntry } from "./types.ts";
import { tokenSet, unique } from "./utils.ts";

function createEntryId(parts: Array<string | null>) {
  return parts.filter((part) => part && part.length > 0).join("::");
}

function createDeepLink(
  artifactSlug: string,
  headingSlugOrNull: string,
  fieldPathOrNull: string,
) {
  const params = new URLSearchParams();
  params.set("artifact", artifactSlug);
  if (headingSlugOrNull) {
    params.set("heading", headingSlugOrNull);
  }
  if (fieldPathOrNull) {
    params.set("field", fieldPathOrNull);
  }
  return `./index.html?${params.toString()}`;
}

export function buildSearchIndex(params: {
  artifacts: ObservatoryArtifact[];
}): SearchIndex {
  const entries: SearchIndexEntry[] = [];

  for (const artifact of params.artifacts) {
    const baseText = unique([
      artifact.title,
      artifact.subtitle,
      artifact.summary,
      artifact.canonicalPath,
      ...artifact.sourceTruthStack.schemaRefs,
      ...artifact.sourceTruthStack.sampleRefs,
      ...artifact.sourceTruthStack.bindingRefs,
      ...artifact.sourceTruthStack.validatorRefs,
      ...artifact.sourceTruthStack.taskRefs,
    ]).join(" ");

    entries.push({
      entryId: createEntryId([artifact.artifactSlug, "artifact"]),
      artifactSlug: artifact.artifactSlug,
      artifactKind: artifact.artifactKind,
      authorityLevel: artifact.authorityLevel,
      sectionRef: artifact.sectionRef,
      title: artifact.title,
      summary: artifact.summary,
      headingSlugOrNull: null,
      fieldPathOrNull: null,
      deepLink: createDeepLink(artifact.artifactSlug, "", ""),
      searchText: tokenSet(baseText).join(" "),
    });

    for (const heading of artifact.headings) {
      entries.push({
        entryId: createEntryId([artifact.artifactSlug, heading.slug, "heading"]),
        artifactSlug: artifact.artifactSlug,
        artifactKind: artifact.artifactKind,
        authorityLevel: artifact.authorityLevel,
        sectionRef: artifact.sectionRef,
        title: `${artifact.title} · ${heading.text}`,
        summary: artifact.proseSections.find((section) => section.headingSlug === heading.slug)?.excerpt ?? artifact.summary,
        headingSlugOrNull: heading.slug,
        fieldPathOrNull: null,
        deepLink: createDeepLink(artifact.artifactSlug, heading.slug, ""),
        searchText: tokenSet(
          `${artifact.title} ${heading.text} ${artifact.canonicalPath} ${
            artifact.proseSections.find((section) => section.headingSlug === heading.slug)?.plainText ?? ""
          }`,
        ).join(" "),
      });
    }

    for (const field of artifact.schemaFields) {
      entries.push({
        entryId: createEntryId([artifact.artifactSlug, field.path, "field"]),
        artifactSlug: artifact.artifactSlug,
        artifactKind: artifact.artifactKind,
        authorityLevel: artifact.authorityLevel,
        sectionRef: artifact.sectionRef,
        title: `${artifact.title} · ${field.path}`,
        summary: `${field.typeLabel} · ${field.required ? "required" : "optional"}`,
        headingSlugOrNull: null,
        fieldPathOrNull: field.path,
        deepLink: createDeepLink(artifact.artifactSlug, "", field.path),
        searchText: tokenSet(
          `${artifact.title} ${field.path} ${field.label} ${field.typeLabel} ${
            field.descriptionOrNull ?? ""
          } ${artifact.schemaIdentityOrNull?.schemaId ?? ""}`,
        ).join(" "),
      });
    }
  }

  return {
    indexVersion: "CONTRACT_SEARCH_INDEX_V1",
    entries: entries.sort((left, right) => left.title.localeCompare(right.title)),
  };
}
