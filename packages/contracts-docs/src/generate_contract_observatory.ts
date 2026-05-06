import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import {
  sampleBindingCatalog,
  schemaCatalog,
  validatorArtifacts,
  type SampleBindingEntry,
  type SchemaCatalogEntry,
  type ValidatorArtifact,
} from "../../contracts-core/src/schemaCatalog.ts";
import { buildBindingCatalog } from "./build_binding_catalog.ts";
import { buildNavigationIndex } from "./build_navigation_index.ts";
import { buildSchemaCrosslinkGraph } from "./build_schema_crosslink_graph.ts";
import { buildSearchIndex } from "./build_search_index.ts";
import { parseMarkdownArtifact } from "./parse_markdown.ts";
import type {
  ArtifactAuthorityLevel,
  ArtifactTone,
  ArtifactKind,
  ContractsNavigationSchema,
  ContractsSiteManifest,
  NavigationSectionRef,
  ObservatoryArtifact,
  SchemaFieldRecord,
  SiteManifestPayload,
  SourceTruthStack,
} from "./types.ts";
import {
  assert,
  excerpt,
  humanizeStem,
  listMatchingFiles,
  readJson,
  relativeFromRepo,
  repoRoot,
  stableHash,
  stripMarkdown,
  unique,
  writeIfChanged,
} from "./utils.ts";

type SchemaDriftReport = {
  report_id: string;
  baseline_bundle: {
    schema_source_map_hash: string;
  };
  candidate_bundle: {
    schema_bundle_hash: string;
  };
  historical_protected_window: {
    compatibility_window_ref: string;
  };
  readiness_verdict: {
    verdict_ref: string;
    admissibility_state: string;
    rollback_boundary_state: string;
  };
  parity_state: {
    documentation_state: string;
    generated_binding_state: string;
    sample_binding_state: string;
  };
  candidate_identity_contract: {
    candidate_identity_hash: string;
  };
};

type ImportedSchemaSourceMap = {
  schemas: Array<{
    schemaName: string;
    schemaId: string;
    logicalFamilyRef: string;
    logicalFamilyLabel: string;
  }>;
};

type BindingCoverageReport = {
  generationBasis: {
    sourceMapHash: string;
  };
  languages: Array<{
    languageRef: string;
    label: string;
    summary: string;
    families: Array<{
      familyRef: string;
      familyLabel: string;
      outputRef: string;
      coverageClass: string;
      sourceHashAggregate: string;
      gapIds: string[];
    }>;
  }>;
};

type LocalSchemaDescriptor = {
  schemaDoc: Record<string, unknown>;
  schemaFields: SchemaFieldRecord[];
  schemaId: string;
  schemaName: string;
  schemaPath: string;
  sourceTruthBadge: string;
};

function replaceExtension(relativePath: string, suffix: string) {
  return relativePath.replace(/\.[^.]+$/u, suffix);
}

function toneForSection(sectionRef: NavigationSectionRef): ArtifactTone {
  switch (sectionRef) {
    case "RUNTIME_CONTRACTS":
    case "SCHEMAS":
      return "navy";
    case "DATA_MODEL":
    case "BINDINGS":
      return "sage";
    case "DRIFT_AND_READINESS":
    case "VALIDATORS":
      return "brass";
    default:
      return "slate";
  }
}

function heading(text: string, slug = "overview") {
  return [
    {
      level: 2,
      text,
      slug,
    },
  ];
}

function sectionRefForArtifact(
  navigationSchema: ContractsNavigationSchema,
  artifactKind: ArtifactKind,
  canonicalPath: string,
) {
  return (
    navigationSchema.sections.find(
      (rule) =>
        rule.appliesToKinds.includes(artifactKind) &&
        rule.includeGlobs.some((glob) => path.matchesGlob(canonicalPath, glob)),
    )?.sectionRef ?? navigationSchema.defaultSectionRef
  );
}

function ensureSchemaToken(token: string) {
  if (token.startsWith("https://taxat.dev/schemas/")) {
    return {
      schemaId: token,
      schemaName: path.basename(token),
    };
  }
  return {
    schemaId: "",
    schemaName: token,
  };
}

function deriveTypeLabel(schemaNode: Record<string, unknown>) {
  const typeValue = schemaNode.type;
  if (typeof schemaNode.$ref === "string") {
    return `$ref ${schemaNode.$ref}`;
  }
  if (Array.isArray(typeValue)) {
    return typeValue.filter((entry): entry is string => typeof entry === "string").join(" | ");
  }
  if (typeof typeValue === "string") {
    return typeValue;
  }
  if (Array.isArray(schemaNode.enum)) {
    return `enum(${schemaNode.enum.length})`;
  }
  if (Array.isArray(schemaNode.anyOf)) {
    return `anyOf(${schemaNode.anyOf.length})`;
  }
  if (Array.isArray(schemaNode.oneOf)) {
    return `oneOf(${schemaNode.oneOf.length})`;
  }
  if (typeof schemaNode.items === "object" && schemaNode.items !== null) {
    return "array";
  }
  if (typeof schemaNode.properties === "object" && schemaNode.properties !== null) {
    return "object";
  }
  return "unknown";
}

function collectSchemaFields(
  node: Record<string, unknown>,
  params: {
    currentPath: string;
    depth: number;
    requiredKeys: Set<string>;
    topLevelGroup: string;
  },
  output: SchemaFieldRecord[],
) {
  const properties =
    node.properties && typeof node.properties === "object"
      ? (node.properties as Record<string, unknown>)
      : {};

  for (const [key, child] of Object.entries(properties).sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    if (!child || typeof child !== "object") {
      continue;
    }
    const childNode = child as Record<string, unknown>;
    const fieldPath = params.currentPath ? `${params.currentPath}.${key}` : key;
    const topLevelGroup = params.topLevelGroup || key;
    output.push({
      path: fieldPath,
      label: key,
      typeLabel: deriveTypeLabel(childNode),
      required: params.requiredKeys.has(key),
      depth: params.depth,
      topLevelGroup,
      descriptionOrNull:
        typeof childNode.description === "string" ? childNode.description : null,
      refTargetOrNull: typeof childNode.$ref === "string" ? childNode.$ref : null,
    });

    collectSchemaFields(
      childNode,
      {
        currentPath: fieldPath,
        depth: params.depth + 1,
        requiredKeys: new Set(
          Array.isArray(childNode.required)
            ? childNode.required.filter((entry): entry is string => typeof entry === "string")
            : [],
        ),
        topLevelGroup,
      },
      output,
    );

    const items =
      childNode.items && typeof childNode.items === "object"
        ? (childNode.items as Record<string, unknown>)
        : null;
    if (items) {
      const itemPath = `${fieldPath}[]`;
      output.push({
        path: itemPath,
        label: `${key}[]`,
        typeLabel: deriveTypeLabel(items),
        required: params.requiredKeys.has(key),
        depth: params.depth + 1,
        topLevelGroup,
        descriptionOrNull: typeof items.description === "string" ? items.description : null,
        refTargetOrNull: typeof items.$ref === "string" ? items.$ref : null,
      });
      collectSchemaFields(
        items,
        {
          currentPath: itemPath,
          depth: params.depth + 2,
          requiredKeys: new Set(
            Array.isArray(items.required)
              ? items.required.filter((entry): entry is string => typeof entry === "string")
              : [],
          ),
          topLevelGroup,
        },
        output,
      );
    }
  }

  const defs =
    node.$defs && typeof node.$defs === "object" ? (node.$defs as Record<string, unknown>) : {};
  if (params.currentPath.length === 0) {
    for (const [key, child] of Object.entries(defs).sort(([left], [right]) =>
      left.localeCompare(right),
    )) {
      if (!child || typeof child !== "object") {
        continue;
      }
      const childNode = child as Record<string, unknown>;
      output.push({
        path: `$defs.${key}`,
        label: key,
        typeLabel: deriveTypeLabel(childNode),
        required: false,
        depth: 0,
        topLevelGroup: "$defs",
        descriptionOrNull:
          typeof childNode.description === "string" ? childNode.description : null,
        refTargetOrNull: typeof childNode.$ref === "string" ? childNode.$ref : null,
      });
      collectSchemaFields(
        childNode,
        {
          currentPath: `$defs.${key}`,
          depth: 1,
          requiredKeys: new Set(
            Array.isArray(childNode.required)
              ? childNode.required.filter((entry): entry is string => typeof entry === "string")
              : [],
          ),
          topLevelGroup: "$defs",
        },
        output,
      );
    }
  }
}

function createSchemaFieldInventory(schemaDoc: Record<string, unknown>) {
  const fields: SchemaFieldRecord[] = [];
  collectSchemaFields(
    schemaDoc,
    {
      currentPath: "",
      depth: 0,
      requiredKeys: new Set(
        Array.isArray(schemaDoc.required)
          ? schemaDoc.required.filter((entry): entry is string => typeof entry === "string")
          : [],
      ),
      topLevelGroup: "",
    },
    fields,
  );
  return fields;
}

function previewLiteral(value: unknown): string {
  if (typeof value === "string") {
    return value.length > 72 ? `${value.slice(0, 71)}…` : value;
  }
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null ||
    value === undefined
  ) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.length} item${value.length === 1 ? "" : "s"}]`;
  }
  if (typeof value === "object") {
    return "{…}";
  }
  return String(value);
}

function collectSamplePointers(
  value: unknown,
  pointer: string,
  topLevelGroup: string,
  output: ObservatoryArtifact["samplePointers"],
) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      const nextPointer = `${pointer}/${index}`;
      output.push({
        pointer: nextPointer,
        key: String(index),
        preview: previewLiteral(entry),
        topLevelGroup,
      });
      collectSamplePointers(entry, nextPointer, topLevelGroup, output);
    });
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  for (const [key, child] of Object.entries(value).sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    const nextPointer = `${pointer}/${key}`;
    const nextTopLevelGroup = topLevelGroup || key;
    output.push({
      pointer: nextPointer,
      key,
      preview: previewLiteral(child),
      topLevelGroup: nextTopLevelGroup,
    });
    collectSamplePointers(child, nextPointer, nextTopLevelGroup, output);
  }
}

function createSamplePointers(value: unknown) {
  const pointers: ObservatoryArtifact["samplePointers"] = [];
  collectSamplePointers(value, "", "", pointers);
  return pointers;
}

async function loadLocalSchemaDescriptors(sourceRoots: ContractsSiteManifest["sourceRoots"]) {
  const descriptors: LocalSchemaDescriptor[] = [];
  for (const sourceRoot of sourceRoots.filter((entry) => entry.artifactSourceRef === "LOCAL_SCHEMA")) {
    const relativePaths = unique(await listMatchingFiles(sourceRoot.root, sourceRoot.includeGlobs));
    for (const relativePath of relativePaths) {
      const schemaDoc = await readJson<Record<string, unknown>>(path.join(repoRoot, relativePath));
      const schemaName = path.basename(relativePath);
      descriptors.push({
        schemaDoc,
        schemaFields: createSchemaFieldInventory(schemaDoc),
        schemaId:
          typeof schemaDoc.$id === "string"
            ? schemaDoc.$id
            : `workspace://${relativePath.replace(/\//g, ".")}`,
        schemaName,
        schemaPath: relativePath,
        sourceTruthBadge: sourceRoot.sourceTruthBadge,
      });
    }
  }
  return descriptors.sort((left, right) => left.schemaPath.localeCompare(right.schemaPath));
}

function createOverviewArtifact(params: {
  bindingCatalogState: string;
  driftReport: SchemaDriftReport;
  manifest: ContractsSiteManifest;
  totalMarkdownArtifacts: number;
  totalSamples: number;
  totalSchemas: number;
  totalTasks: number;
}): ObservatoryArtifact {
  const canonicalPath = params.manifest.navigationSchemaPath;
  const sectionRef: NavigationSectionRef = "OVERVIEW";
  const summary =
    "One search-first cabinet for the authoritative corpus, schema mirror, workspace-local schemas, bundled samples, validators, generated bindings, and current release-readiness posture.";
  const prose = [
    `The observatory reads from ${params.totalMarkdownArtifacts} prose artifacts, ${params.totalSchemas} schemas, ${params.totalSamples} bundled samples, and ${params.totalTasks} roadmap task cards.`,
    `Current readiness verdict: ${params.driftReport.readiness_verdict.verdict_ref}. Binding parity: ${params.bindingCatalogState}.`,
    "Every page remains read-only, exposes source lineage, and keeps generated companions visibly subordinate to their authoritative inputs.",
  ].join("\n\n");

  return {
    artifactVersion: "CONTRACT_OBSERVATORY_ARTIFACT_V1",
    artifactSlug: "overview",
    artifactKind: "OVERVIEW",
    sectionRef,
    authorityLevel: "GENERATED_COMPANION",
    sourceTruthBadge: "Generated Observatory Overview",
    tone: toneForSection(sectionRef),
    title: params.manifest.title,
    subtitle: params.manifest.subtitle,
    summary,
    canonicalPath,
    sourceLineage: [
      "config/docs/contracts_site_manifest.json",
      "config/docs/contracts_navigation_schema.json",
      "data/contracts/schema_drift_report.json",
      "data/contracts/binding_coverage_report.json",
    ],
    headingCount: 1,
    headings: heading("Overview"),
    proseSections: [
      {
        headingSlug: "overview",
        headingText: "Overview",
        level: 2,
        lines: prose.split("\n"),
        plainText: stripMarkdown(prose),
        excerpt: summary,
        mentionedSchemaTokens: [],
        mentionedSampleTokens: [],
        mentionedTaskIds: [],
      },
    ],
    schemaIdentityOrNull: null,
    schemaFields: [],
    samplePointers: [],
    sampleIdentityOrNull: null,
    bindingIdentityOrNull: null,
    validatorIdentityOrNull: null,
    driftIdentityOrNull: {
      verdictRef: params.driftReport.readiness_verdict.verdict_ref,
      admissibilityState: params.driftReport.readiness_verdict.admissibility_state,
      rollbackBoundaryState: params.driftReport.readiness_verdict.rollback_boundary_state,
      documentationState: params.driftReport.parity_state.documentation_state,
      generatedBindingState: params.driftReport.parity_state.generated_binding_state,
      sampleBindingState: params.driftReport.parity_state.sample_binding_state,
      compatibilityWindowRef: params.driftReport.historical_protected_window.compatibility_window_ref,
      schemaBundleHash: params.driftReport.candidate_bundle.schema_bundle_hash,
      candidateIdentityHash: params.driftReport.candidate_identity_contract.candidate_identity_hash,
    },
    headerStrip: {
      kind: "OVERVIEW",
      badgeLabel: "Generated Overview",
      metricPairs: [
        { label: "Schemas", value: String(params.totalSchemas) },
        { label: "Samples", value: String(params.totalSamples) },
        { label: "Readiness", value: params.driftReport.readiness_verdict.verdict_ref },
      ],
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
      file: ["config/docs/contracts_site_manifest.json", "config/docs/contracts_navigation_schema.json"],
      headings: ["Overview"],
      schemaRefs: [],
      sampleRefs: [],
      bindingRefs: [],
      validatorRefs: [],
      driftRefs: [params.driftReport.report_id],
      taskRefs: [],
    },
    fieldCrosslinks: [],
    taskRefs: [],
  };
}

function relateBindingRefsForSchema(
  bindingCatalog: ReturnType<typeof buildBindingCatalog>,
  schemaName: string,
) {
  return unique(
    bindingCatalog.schemaBindings
      .find((entry) => entry.schemaName === schemaName)
      ?.entries.map((entry) => entry.bindingRef) ?? [],
  );
}

function validatorRefs() {
  return validatorArtifacts.map((artifact) => artifact.artifactRef);
}

function schemaSourceTruthStack(params: {
  bindingCatalog: ReturnType<typeof buildBindingCatalog>;
  schemaEntry: SchemaCatalogEntry | LocalSchemaDescriptor;
  taskRefs?: string[];
}) {
  const schemaName = "schemaName" in params.schemaEntry ? params.schemaEntry.schemaName : params.schemaEntry.schemaName;
  const schemaId = "schemaId" in params.schemaEntry ? params.schemaEntry.schemaId : params.schemaEntry.schemaId;
  return {
    file: [
      "destinationPath" in params.schemaEntry
        ? params.schemaEntry.destinationPath
        : params.schemaEntry.schemaPath,
    ],
    headings: ["Overview", "Field Inventory", "Lineage"],
    schemaRefs: [schemaName, schemaId],
    sampleRefs:
      "sampleRefs" in params.schemaEntry ? [...params.schemaEntry.sampleRefs] : [],
    bindingRefs: relateBindingRefsForSchema(params.bindingCatalog, schemaName),
    validatorRefs: "sampleRefs" in params.schemaEntry ? validatorRefs() : [],
    driftRefs: "sampleRefs" in params.schemaEntry ? ["schema_drift_report.current_repo"] : [],
    taskRefs: params.taskRefs ?? [],
  } satisfies SourceTruthStack;
}

function buildArtifactsMap(artifacts: ObservatoryArtifact[]) {
  return {
    artifactBySlug: new Map(artifacts.map((artifact) => [artifact.artifactSlug, artifact])),
    bindingByRef: new Map(
      artifacts
        .filter((artifact) => artifact.bindingIdentityOrNull)
        .map((artifact) => [artifact.bindingIdentityOrNull!.bindingRef, artifact]),
    ),
    sampleByName: new Map(
      artifacts
        .filter((artifact) => artifact.sampleIdentityOrNull)
        .map((artifact) => [artifact.sampleIdentityOrNull!.sampleName, artifact]),
    ),
    schemaByToken: new Map(
      artifacts
        .filter((artifact) => artifact.schemaIdentityOrNull)
        .flatMap((artifact) => [
          [artifact.schemaIdentityOrNull!.schemaName, artifact] as const,
          [artifact.schemaIdentityOrNull!.schemaId, artifact] as const,
        ]),
    ),
    taskByRef: new Map(
      artifacts
        .filter((artifact) => artifact.artifactKind === "TASK_CARD")
        .flatMap((artifact) => artifact.taskRefs.map((taskRef) => [taskRef, artifact] as const)),
    ),
    validatorByRef: new Map(
      artifacts
        .filter((artifact) => artifact.validatorIdentityOrNull)
        .map((artifact) => [artifact.validatorIdentityOrNull!.artifactRef, artifact]),
    ),
  };
}

function finalizeRelationships(
  artifacts: ObservatoryArtifact[],
  graphResult: ReturnType<typeof buildSchemaCrosslinkGraph>,
) {
  const indexes = buildArtifactsMap(artifacts);

  return artifacts.map((artifact) => {
    const schemaLinks = unique(
      artifact.sourceTruthStack.schemaRefs
        .map((token) => indexes.schemaByToken.get(token))
        .filter((entry): entry is ObservatoryArtifact => entry !== undefined && entry.artifactSlug !== artifact.artifactSlug)
        .map((entry) => entry.artifactSlug),
    ).map((slug) => {
      const target = indexes.artifactBySlug.get(slug)!;
      return {
        artifactSlug: target.artifactSlug,
        title: target.title,
        kind: target.artifactKind,
        authorityLevel: target.authorityLevel,
        sectionRef: target.sectionRef,
        headingSlugOrNull: null,
        reason: "source truth stack includes this schema",
      };
    });

    const sampleLinks = unique(
      artifact.sourceTruthStack.sampleRefs
        .map((token) => indexes.sampleByName.get(token))
        .filter((entry): entry is ObservatoryArtifact => entry !== undefined && entry.artifactSlug !== artifact.artifactSlug)
        .map((entry) => entry.artifactSlug),
    ).map((slug) => {
      const target = indexes.artifactBySlug.get(slug)!;
      return {
        artifactSlug: target.artifactSlug,
        title: target.title,
        kind: target.artifactKind,
        authorityLevel: target.authorityLevel,
        sectionRef: target.sectionRef,
        headingSlugOrNull: null,
        reason: "source truth stack includes this sample",
      };
    });

    const bindingLinks = unique(
      artifact.sourceTruthStack.bindingRefs
        .map((token) => indexes.bindingByRef.get(token))
        .filter((entry): entry is ObservatoryArtifact => entry !== undefined && entry.artifactSlug !== artifact.artifactSlug)
        .map((entry) => entry.artifactSlug),
    ).map((slug) => {
      const target = indexes.artifactBySlug.get(slug)!;
      return {
        artifactSlug: target.artifactSlug,
        title: target.title,
        kind: target.artifactKind,
        authorityLevel: target.authorityLevel,
        sectionRef: target.sectionRef,
        headingSlugOrNull: null,
        reason: "source truth stack includes this binding family",
      };
    });

    const validatorLinks = unique(
      artifact.sourceTruthStack.validatorRefs
        .map((token) => indexes.validatorByRef.get(token))
        .filter((entry): entry is ObservatoryArtifact => entry !== undefined && entry.artifactSlug !== artifact.artifactSlug)
        .map((entry) => entry.artifactSlug),
    ).map((slug) => {
      const target = indexes.artifactBySlug.get(slug)!;
      return {
        artifactSlug: target.artifactSlug,
        title: target.title,
        kind: target.artifactKind,
        authorityLevel: target.authorityLevel,
        sectionRef: target.sectionRef,
        headingSlugOrNull: null,
        reason: "validator entrypoint participates in this artifact lineage",
      };
    });

    const taskLinks = unique(
      artifact.sourceTruthStack.taskRefs
        .map((token) => indexes.taskByRef.get(token))
        .filter((entry): entry is ObservatoryArtifact => entry !== undefined && entry.artifactSlug !== artifact.artifactSlug)
        .map((entry) => entry.artifactSlug),
    ).map((slug) => {
      const target = indexes.artifactBySlug.get(slug)!;
      return {
        artifactSlug: target.artifactSlug,
        title: target.title,
        kind: target.artifactKind,
        authorityLevel: target.authorityLevel,
        sectionRef: target.sectionRef,
        headingSlugOrNull: null,
        reason: "roadmap card references this artifact",
      };
    });

    const graphLinks = graphResult.relationshipsByArtifactSlug.get(artifact.artifactSlug);
    return {
      ...artifact,
      fieldCrosslinks:
        graphResult.fieldCrosslinksByArtifactSlug.get(artifact.artifactSlug) ?? artifact.fieldCrosslinks,
      relationships: {
        schemas: schemaLinks,
        samples:
          artifact.artifactKind === "SCHEMA" && graphLinks ? graphLinks.samples : sampleLinks,
        bindings:
          artifact.artifactKind === "SCHEMA" && graphLinks ? graphLinks.bindings : bindingLinks,
        validators:
          artifact.artifactKind === "SCHEMA" && graphLinks ? graphLinks.validators : validatorLinks,
        docs: artifact.artifactKind === "SCHEMA" && graphLinks ? graphLinks.docs : artifact.relationships.docs,
        tasks: artifact.artifactKind === "SCHEMA" && graphLinks ? graphLinks.tasks : taskLinks,
      },
    };
  });
}

async function buildGeneratedOutputs() {
  const manifest = await readJson<ContractsSiteManifest>(
    path.join(repoRoot, "config/docs/contracts_site_manifest.json"),
  );
  const navigationSchema = await readJson<ContractsNavigationSchema>(
    path.join(repoRoot, manifest.navigationSchemaPath),
  );
  const importedSchemaSourceMap = await readJson<ImportedSchemaSourceMap>(
    path.join(repoRoot, "packages/contracts-core/data/schema_source_map.json"),
  );
  const bindingCoverageReport = await readJson<BindingCoverageReport>(
    path.join(repoRoot, "data/contracts/binding_coverage_report.json"),
  );
  const driftReport = await readJson<SchemaDriftReport>(
    path.join(repoRoot, "data/contracts/schema_drift_report.json"),
  );
  const checklistText = await readFile(path.join(repoRoot, "PROMPT/Checklist.md"), "utf8");
  const activeTaskRefs = unique(
    Array.from(
      checklistText.matchAll(/^- \[(?:X|-)\] `(?<taskRef>pc_\d{4})`/gmu),
      (match) => match.groups?.taskRef ?? "",
    ).filter((taskRef) => taskRef.length > 0),
  );
  const bindingCatalog = buildBindingCatalog({
    bindingCoverageReport,
    expectedSourceMapHash: driftReport.baseline_bundle.schema_source_map_hash,
    schemaSourceMap: importedSchemaSourceMap,
  });

  const knownSchemaEntries = [
    ...schemaCatalog.map((entry) => ({
      schemaId: entry.schemaId,
      schemaName: entry.schemaName,
      path: entry.destinationPath,
    })),
  ];
  const localSchemas = await loadLocalSchemaDescriptors(manifest.sourceRoots);
  for (const localSchema of localSchemas) {
    knownSchemaEntries.push({
      schemaId: localSchema.schemaId,
      schemaName: localSchema.schemaName,
      path: localSchema.schemaPath,
    });
  }

  const knownSchemaNames = new Set(knownSchemaEntries.map((entry) => entry.schemaName));
  const knownSchemaIds = new Set(knownSchemaEntries.map((entry) => entry.schemaId));
  const knownSamples = new Set(sampleBindingCatalog.map((entry) => entry.sampleName));

  const markdownRootEntries = manifest.sourceRoots.filter((entry) =>
    ["ALGORITHM_MARKDOWN", "PROMPT_CARDS", "SUPPORT_DOCS"].includes(entry.artifactSourceRef),
  );
  const markdownPaths = unique(
    (
      await Promise.all(
        markdownRootEntries.map(async (entry) => {
          const files = await listMatchingFiles(entry.root, entry.includeGlobs);
          if (entry.artifactSourceRef !== "PROMPT_CARDS") {
            return files;
          }
          return files.filter((relativePath) => {
            const taskRef = relativePath.match(/\bpc_\d{4}\b/u)?.[0] ?? "";
            return activeTaskRefs.includes(taskRef);
          });
        }),
      )
    ).flat(),
  ).sort((left, right) => left.localeCompare(right));
  const parsedMarkdown = await Promise.all(markdownPaths.map((relativePath) => parseMarkdownArtifact(relativePath)));
  const markdownByPath = new Map(parsedMarkdown.map((entry) => [entry.relativePath, entry]));

  const brokenRelativeLinks: ReturnType<typeof buildSchemaCrosslinkGraph>["graph"]["brokenRelativeLinks"] = [];
  for (const artifact of parsedMarkdown) {
    if (artifact.relativePath.startsWith("PROMPT/CARDS/")) {
      continue;
    }
    for (const link of artifact.links) {
      if (!link.resolvedPathOrNull) {
        continue;
      }
      try {
        await readFile(path.join(repoRoot, link.resolvedPathOrNull), "utf8");
      } catch {
        brokenRelativeLinks.push({
          sourcePath: artifact.relativePath,
          href: link.rawHref,
        });
        continue;
      }

      if (link.anchorOrNull && markdownByPath.has(link.resolvedPathOrNull)) {
        const target = markdownByPath.get(link.resolvedPathOrNull)!;
        const hasHeading = target.headings.some((heading) => heading.slug === link.anchorOrNull);
        if (!hasHeading) {
          brokenRelativeLinks.push({
            sourcePath: artifact.relativePath,
            href: link.rawHref,
          });
        }
      }
    }
  }

  const headingCollisions = parsedMarkdown.flatMap((artifact) =>
    artifact.headingCollisions.map((slug) => ({
      sourcePath: artifact.relativePath,
      slug,
    })),
  );
  const missingSchemaTokens = parsedMarkdown.flatMap((artifact) =>
    (!artifact.relativePath.startsWith("Algorithm/")
      ? []
      : artifact.mentionedSchemaTokens)
      .filter((token) => {
        const resolved = ensureSchemaToken(token);
        return !knownSchemaNames.has(resolved.schemaName) && !knownSchemaIds.has(token);
      })
      .map((token) => ({
        sourcePath: artifact.relativePath,
        token,
      })),
  );
  const orphanSamples = sampleBindingCatalog
    .filter((sample) => !knownSchemaNames.has(sample.inferredSchemaName))
    .map((sample) => ({
      sampleName: sample.sampleName,
      inferredSchemaName: sample.inferredSchemaName,
    }));

  const artifacts: ObservatoryArtifact[] = [];
  artifacts.push(
    createOverviewArtifact({
      bindingCatalogState: bindingCatalog.generationState,
      driftReport,
      manifest,
      totalMarkdownArtifacts: parsedMarkdown.length,
      totalSamples: sampleBindingCatalog.length,
      totalSchemas: schemaCatalog.length + localSchemas.length,
      totalTasks: parsedMarkdown.filter((entry) => entry.relativePath.startsWith("PROMPT/CARDS/")).length,
    }),
  );

  const taskCardIdByPath = new Map(
    parsedMarkdown
      .filter((entry) => entry.relativePath.startsWith("PROMPT/CARDS/"))
      .map((entry) => [entry.relativePath, entry.relativePath.match(/\bpc_\d{4}\b/u)?.[0] ?? ""]),
  );

  for (const parsed of parsedMarkdown) {
    const taskRef = taskCardIdByPath.get(parsed.relativePath) || "";
    const root = markdownRootEntries.find((entry) =>
      parsed.relativePath === entry.root || parsed.relativePath.startsWith(`${entry.root}/`),
    );
    assert(root, `Unable to resolve source root for ${parsed.relativePath}.`);

    const schemaRefs = unique(
      parsed.mentionedSchemaTokens.flatMap((token) => {
        const resolved = ensureSchemaToken(token);
        return knownSchemaNames.has(resolved.schemaName)
          ? [resolved.schemaName, ...(!resolved.schemaId ? [] : [resolved.schemaId])]
          : knownSchemaIds.has(token)
            ? [token]
            : [];
      }),
    );

    const bindingRefs = unique(
      schemaRefs.flatMap((token) => {
        const schemaName = token.endsWith(".schema.json") ? token : ensureSchemaToken(token).schemaName;
        return relateBindingRefsForSchema(bindingCatalog, schemaName);
      }),
    );
    const sampleRefs = parsed.mentionedSampleTokens.filter((token) => knownSamples.has(token));
    const validatorMentions = validatorArtifacts
      .filter(
        (validator) =>
          parsed.text.includes(validator.artifactRef) || parsed.text.includes(validator.command),
      )
      .map((validator) => validator.artifactRef);
    const driftRefs =
      parsed.text.includes("schema_drift_report.json") ||
      parsed.text.includes("schema_bundle_compatibility_gate.materialized.json")
        ? [driftReport.report_id]
        : [];
    const taskRefs = unique([
      ...parsed.mentionedTaskIds,
      ...(taskRef ? [taskRef] : []),
    ]);
    const sectionRef = sectionRefForArtifact(
      navigationSchema,
      taskRef ? "TASK_CARD" : "MARKDOWN",
      parsed.relativePath,
    );
    const summary = parsed.sections[0]?.excerpt ?? excerpt(parsed.text, manifest.viewPolicies.proseExcerptLength);

    artifacts.push({
      artifactVersion: "CONTRACT_OBSERVATORY_ARTIFACT_V1",
      artifactSlug: `${taskRef ? "task" : "doc"}--${replaceExtension(parsed.relativePath, "").replace(/[/.]/g, "-")}`,
      artifactKind: taskRef ? "TASK_CARD" : "MARKDOWN",
      sectionRef,
      authorityLevel: root.authorityLevel,
      sourceTruthBadge: root.sourceTruthBadge,
      tone: toneForSection(sectionRef),
      title: taskRef ? `${taskRef} · ${parsed.title}` : parsed.title,
      subtitle: parsed.relativePath,
      summary,
      canonicalPath: parsed.relativePath,
      sourceLineage: [parsed.relativePath],
      headingCount: parsed.headings.length,
      headings: parsed.headings,
      proseSections: parsed.sections,
      schemaIdentityOrNull: null,
      schemaFields: [],
      samplePointers: [],
      sampleIdentityOrNull: null,
      bindingIdentityOrNull: null,
      validatorIdentityOrNull: null,
      driftIdentityOrNull: null,
      headerStrip: {
        kind: taskRef ? "TASK" : "PROSE",
        badgeLabel: taskRef ? "Task Traceability" : root.sourceTruthBadge,
        metricPairs: [
          { label: "Headings", value: String(parsed.headings.length) },
          { label: "Schemas", value: String(schemaRefs.length) },
          { label: "Tasks", value: String(taskRefs.length) },
        ],
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
        file: [parsed.relativePath],
        headings: parsed.headings.map((heading) => heading.text),
        schemaRefs,
        sampleRefs,
        bindingRefs,
        validatorRefs: validatorMentions,
        driftRefs,
        taskRefs,
      },
      fieldCrosslinks: [],
      taskRefs,
    });
  }

  for (const entry of schemaCatalog) {
    const schemaDoc = await readJson<Record<string, unknown>>(path.join(repoRoot, entry.destinationPath));
    const schemaFields = createSchemaFieldInventory(schemaDoc);
    const sectionRef = sectionRefForArtifact(navigationSchema, "SCHEMA", entry.destinationPath);
    artifacts.push({
      artifactVersion: "CONTRACT_OBSERVATORY_ARTIFACT_V1",
      artifactSlug: `schema--${entry.schemaStem}`,
      artifactKind: "SCHEMA",
      sectionRef,
      authorityLevel: "AUTHORITATIVE",
      sourceTruthBadge: "Imported Schema Mirror",
      tone: toneForSection(sectionRef),
      title: entry.label,
      subtitle: entry.schemaId,
      summary: `${entry.logicalFamilyLabel} schema mirrored from Algorithm with source and destination hash lineage preserved.`,
      canonicalPath: entry.destinationPath,
      sourceLineage: [entry.sourcePath, entry.destinationPath],
      headingCount: 1,
      headings: heading("Overview"),
      proseSections: [
        {
          headingSlug: "overview",
          headingText: "Overview",
          level: 2,
          lines: [
            `${entry.label} is part of ${entry.logicalFamilyLabel}.`,
            `Validation posture: ${entry.validationPosture}.`,
            `Imported from ${entry.sourcePath} into ${entry.destinationPath}.`,
          ],
          plainText: `${entry.label} ${entry.logicalFamilyLabel} ${entry.validationPosture}`,
          excerpt: `${entry.logicalFamilyLabel} schema with preserved source-hash lineage and validator compatibility.`,
          mentionedSchemaTokens: [entry.schemaName, entry.schemaId],
          mentionedSampleTokens: [...entry.sampleRefs],
          mentionedTaskIds: [],
        },
      ],
      schemaIdentityOrNull: {
        schemaName: entry.schemaName,
        schemaId: entry.schemaId,
        logicalFamilyLabel: entry.logicalFamilyLabel,
        validationPosture: entry.validationPosture,
        sourceHash: entry.sourceHash,
        destinationHash: entry.destinationHash,
        refTargets: [...entry.refTargets],
      },
      schemaFields,
      samplePointers: [],
      sampleIdentityOrNull: null,
      bindingIdentityOrNull: null,
      validatorIdentityOrNull: null,
      driftIdentityOrNull: null,
      headerStrip: {
        kind: "SCHEMA",
        badgeLabel: entry.logicalFamilyLabel,
        metricPairs: [
          { label: "Fields", value: String(schemaFields.length) },
          { label: "Samples", value: String(entry.sampleRefs.length) },
          { label: "Refs", value: String(entry.refTargets.length) },
        ],
      },
      relationships: {
        schemas: [],
        samples: [],
        bindings: [],
        validators: [],
        docs: [],
        tasks: [],
      },
      sourceTruthStack: schemaSourceTruthStack({
        bindingCatalog,
        schemaEntry: entry,
      }),
      fieldCrosslinks: [],
      taskRefs: [],
    });
  }

  for (const localSchema of localSchemas) {
    const sectionRef = sectionRefForArtifact(navigationSchema, "SCHEMA", localSchema.schemaPath);
    artifacts.push({
      artifactVersion: "CONTRACT_OBSERVATORY_ARTIFACT_V1",
      artifactSlug: `schema--${replaceExtension(localSchema.schemaPath, "").replace(/[/.]/g, "-")}`,
      artifactKind: "SCHEMA",
      sectionRef,
      authorityLevel: "AUTHORITATIVE",
      sourceTruthBadge: localSchema.sourceTruthBadge,
      tone: toneForSection(sectionRef),
      title: humanizeStem(localSchema.schemaName),
      subtitle: localSchema.schemaId,
      summary: `${localSchema.schemaPath} is a workspace-local schema companion surfaced alongside the imported bundle.`,
      canonicalPath: localSchema.schemaPath,
      sourceLineage: [localSchema.schemaPath],
      headingCount: 1,
      headings: heading("Overview"),
      proseSections: [
        {
          headingSlug: "overview",
          headingText: "Overview",
          level: 2,
          lines: [
            `${localSchema.schemaPath} is a local workspace schema artifact.`,
            `Schema id: ${localSchema.schemaId}.`,
          ],
          plainText: `${localSchema.schemaPath} ${localSchema.schemaId}`,
          excerpt: `${localSchema.schemaPath} is a local workspace schema companion.`,
          mentionedSchemaTokens: [localSchema.schemaName, localSchema.schemaId],
          mentionedSampleTokens: [],
          mentionedTaskIds: [],
        },
      ],
      schemaIdentityOrNull: {
        schemaName: localSchema.schemaName,
        schemaId: localSchema.schemaId,
        logicalFamilyLabel: localSchema.schemaPath.startsWith("config/")
          ? "Configuration Schema"
          : "Workspace Schema",
        validationPosture: "WORKSPACE_LOCAL_JSON_SCHEMA_COMPANION",
        sourceHash: stableHash(localSchema.schemaDoc),
        destinationHash: stableHash(localSchema.schemaDoc),
        refTargets: [],
      },
      schemaFields: localSchema.schemaFields,
      samplePointers: [],
      sampleIdentityOrNull: null,
      bindingIdentityOrNull: null,
      validatorIdentityOrNull: null,
      driftIdentityOrNull: null,
      headerStrip: {
        kind: "SCHEMA",
        badgeLabel: localSchema.sourceTruthBadge,
        metricPairs: [
          { label: "Fields", value: String(localSchema.schemaFields.length) },
          { label: "Path", value: localSchema.schemaPath.split("/").slice(0, 2).join("/") },
          { label: "Kind", value: "Workspace" },
        ],
      },
      relationships: {
        schemas: [],
        samples: [],
        bindings: [],
        validators: [],
        docs: [],
        tasks: [],
      },
      sourceTruthStack: schemaSourceTruthStack({
        bindingCatalog,
        schemaEntry: localSchema,
      }),
      fieldCrosslinks: [],
      taskRefs: [],
    });
  }

  for (const sampleEntry of sampleBindingCatalog) {
    const sampleValue = await readJson<unknown>(path.join(repoRoot, sampleEntry.destinationPath));
    const sectionRef = sectionRefForArtifact(navigationSchema, "SAMPLE", sampleEntry.destinationPath);
    artifacts.push({
      artifactVersion: "CONTRACT_OBSERVATORY_ARTIFACT_V1",
      artifactSlug: `sample--${replaceExtension(sampleEntry.sampleName, "").replace(/[/.]/g, "-")}`,
      artifactKind: "SAMPLE",
      sectionRef,
      authorityLevel: "AUTHORITATIVE",
      sourceTruthBadge: "Imported Sample Mirror",
      tone: toneForSection(sectionRef),
      title: sampleEntry.label,
      subtitle: sampleEntry.inferredSchemaId,
      summary: `${sampleEntry.sampleName} is bundled under the filename-convention binding to ${sampleEntry.inferredSchemaName}.`,
      canonicalPath: sampleEntry.destinationPath,
      sourceLineage: [sampleEntry.sourcePath, sampleEntry.destinationPath],
      headingCount: 1,
      headings: heading("Overview"),
      proseSections: [
        {
          headingSlug: "overview",
          headingText: "Overview",
          level: 2,
          lines: [
            `${sampleEntry.label} is mirrored from ${sampleEntry.sourcePath}.`,
            `The sample binds to ${sampleEntry.inferredSchemaName} by filename convention.`,
          ],
          plainText: `${sampleEntry.label} ${sampleEntry.inferredSchemaName}`,
          excerpt: `${sampleEntry.label} mirrors the canonical sample payload for ${sampleEntry.inferredSchemaName}.`,
          mentionedSchemaTokens: [sampleEntry.inferredSchemaName, sampleEntry.inferredSchemaId],
          mentionedSampleTokens: [sampleEntry.sampleName],
          mentionedTaskIds: [],
        },
      ],
      schemaIdentityOrNull: null,
      schemaFields: [],
      samplePointers: createSamplePointers(sampleValue),
      sampleIdentityOrNull: {
        sampleName: sampleEntry.sampleName,
        inferredSchemaName: sampleEntry.inferredSchemaName,
        inferredSchemaId: sampleEntry.inferredSchemaId,
        validationPosture: sampleEntry.validationPosture,
        sourceHash: sampleEntry.sourceHash,
        destinationHash: sampleEntry.destinationHash,
      },
      bindingIdentityOrNull: null,
      validatorIdentityOrNull: null,
      driftIdentityOrNull: null,
      headerStrip: {
        kind: "SAMPLE",
        badgeLabel: "Bundled Sample",
        metricPairs: [
          { label: "Pointers", value: String(createSamplePointers(sampleValue).length) },
          { label: "Schema", value: sampleEntry.inferredSchemaName.replace(/\.schema\.json$/u, "") },
          { label: "Binding", value: "Filename" },
        ],
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
        file: [sampleEntry.destinationPath],
        headings: ["Overview"],
        schemaRefs: [sampleEntry.inferredSchemaName, sampleEntry.inferredSchemaId],
        sampleRefs: [sampleEntry.sampleName],
        bindingRefs: relateBindingRefsForSchema(bindingCatalog, sampleEntry.inferredSchemaName),
        validatorRefs: validatorRefs(),
        driftRefs: [],
        taskRefs: [],
      },
      fieldCrosslinks: [],
      taskRefs: [],
    });
  }

  for (const language of bindingCatalog.languages) {
    const matchingFamilies = bindingCoverageReport.languages.find(
      (entry) => entry.languageRef === language.languageRef,
    )?.families ?? [];
    for (const family of matchingFamilies) {
      const schemasInFamily = bindingCatalog.schemaBindings
        .filter((entry) => entry.logicalFamilyRef === family.familyRef)
        .map((entry) => entry.schemaName);
      const sectionRef = sectionRefForArtifact(navigationSchema, "BINDING", family.outputRef);
      artifacts.push({
        artifactVersion: "CONTRACT_OBSERVATORY_ARTIFACT_V1",
        artifactSlug: `binding--${language.languageRef.toLowerCase()}--${family.familyRef.toLowerCase()}`,
        artifactKind: "BINDING",
        sectionRef,
        authorityLevel: "GENERATED_COMPANION",
        sourceTruthBadge: "Generated Binding Catalog",
        tone: toneForSection(sectionRef),
        title: `${language.label} · ${family.familyLabel}`,
        subtitle: family.outputRef,
        summary: `${language.label} binding coverage for ${family.familyLabel} with explicit gap-bearing posture and source-map lineage.`,
        canonicalPath: family.outputRef,
        sourceLineage: [
          "data/contracts/binding_coverage_report.json",
          "packages/contracts-core/data/schema_source_map.json",
        ],
        headingCount: 1,
        headings: heading("Overview"),
        proseSections: [
          {
            headingSlug: "overview",
            headingText: "Overview",
            level: 2,
            lines: [
              `${language.label} coverage for ${family.familyLabel}.`,
              `Coverage class: ${family.coverageClass}.`,
              `Output reference: ${family.outputRef}.`,
            ],
            plainText: `${language.label} ${family.familyLabel} ${family.coverageClass}`,
            excerpt: `${language.label} binding coverage for ${family.familyLabel}.`,
            mentionedSchemaTokens: [],
            mentionedSampleTokens: [],
            mentionedTaskIds: [],
          },
        ],
        schemaIdentityOrNull: null,
        schemaFields: [],
        samplePointers: [],
        sampleIdentityOrNull: null,
        bindingIdentityOrNull: {
          bindingRef: `${language.languageRef}:${family.familyRef}`,
          languageRef: language.languageRef,
          familyRef: family.familyRef,
          outputRef: family.outputRef,
          coverageClass: family.coverageClass,
          sourceHashAggregate: family.sourceHashAggregate,
          generationState: bindingCatalog.generationState,
          gapIds: [...family.gapIds],
        },
        validatorIdentityOrNull: null,
        driftIdentityOrNull: null,
        headerStrip: {
          kind: "BINDING",
          badgeLabel: language.label,
          metricPairs: [
            { label: "Family", value: family.familyLabel },
            { label: "Schemas", value: String(schemasInFamily.length) },
            { label: "State", value: bindingCatalog.generationState },
          ],
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
          file: [family.outputRef],
          headings: ["Overview"],
          schemaRefs: schemasInFamily,
          sampleRefs: [],
          bindingRefs: [`${language.languageRef}:${family.familyRef}`],
          validatorRefs: [],
          driftRefs: [driftReport.report_id],
          taskRefs: [],
        },
        fieldCrosslinks: [],
        taskRefs: [],
      });
    }
  }

  for (const validator of validatorArtifacts) {
    const sectionRef = sectionRefForArtifact(navigationSchema, "VALIDATOR", validator.destinationPath);
    artifacts.push({
      artifactVersion: "CONTRACT_OBSERVATORY_ARTIFACT_V1",
      artifactSlug: `validator--${replaceExtension(validator.artifactRef, "").replace(/[/.]/g, "-")}`,
      artifactKind: "VALIDATOR",
      sectionRef,
      authorityLevel: "AUTHORITATIVE",
      sourceTruthBadge: "Validator Mirror",
      tone: toneForSection(sectionRef),
      title: validator.artifactRef,
      subtitle: validator.command,
      summary: `${validator.artifactRef} is the authoritative mirrored validator entrypoint used for contract and forensic coherence checks.`,
      canonicalPath: validator.destinationPath,
      sourceLineage: [validator.sourcePath, validator.destinationPath],
      headingCount: 1,
      headings: heading("Overview"),
      proseSections: [
        {
          headingSlug: "overview",
          headingText: "Overview",
          level: 2,
          lines: [
            `${validator.artifactRef} remains authoritative through path-only adaptation.`,
            `Command: ${validator.command}.`,
          ],
          plainText: `${validator.artifactRef} ${validator.command}`,
          excerpt: `${validator.artifactRef} is the mirrored validator command surface.`,
          mentionedSchemaTokens: [],
          mentionedSampleTokens: [],
          mentionedTaskIds: [],
        },
      ],
      schemaIdentityOrNull: null,
      schemaFields: [],
      samplePointers: [],
      sampleIdentityOrNull: null,
      bindingIdentityOrNull: null,
      validatorIdentityOrNull: {
        artifactRef: validator.artifactRef,
        command: validator.command,
        adaptationPosture: validator.adaptationPosture,
        sourceHash: validator.sourceHash,
        destinationHash: validator.destinationHash,
      },
      driftIdentityOrNull: null,
      headerStrip: {
        kind: "VALIDATOR",
        badgeLabel: "Validator",
        metricPairs: [
          { label: "Source", value: relativeFromRepo(path.join(repoRoot, validator.sourcePath)).split("/")[0] },
          { label: "Mode", value: validator.adaptationPosture },
          { label: "Command", value: "python3" },
        ],
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
        file: [validator.destinationPath],
        headings: ["Overview"],
        schemaRefs: [],
        sampleRefs: [],
        bindingRefs: [],
        validatorRefs: [validator.artifactRef],
        driftRefs: [],
        taskRefs: [],
      },
      fieldCrosslinks: [],
      taskRefs: [],
    });
  }

  const driftSectionRef = sectionRefForArtifact(
    navigationSchema,
    "DRIFT",
    "data/contracts/schema_drift_report.json",
  );
  artifacts.push({
    artifactVersion: "CONTRACT_OBSERVATORY_ARTIFACT_V1",
    artifactSlug: "drift--schema-readiness",
    artifactKind: "DRIFT",
    sectionRef: driftSectionRef,
    authorityLevel: "GENERATED_COMPANION",
    sourceTruthBadge: "Generated Readiness Evidence",
    tone: toneForSection(driftSectionRef),
    title: "Schema Drift And Readiness",
    subtitle: driftReport.report_id,
    summary: `${driftReport.readiness_verdict.verdict_ref} based on the current schema bundle, reader window, and parity posture.`,
    canonicalPath: "data/contracts/schema_drift_report.json",
    sourceLineage: [
      "data/contracts/schema_drift_report.json",
      "data/contracts/schema_bundle_compatibility_gate.materialized.json",
      "docs/contracts/schema_drift_and_migration_readiness.md",
    ],
    headingCount: 1,
    headings: heading("Overview"),
    proseSections: [
      {
        headingSlug: "overview",
        headingText: "Overview",
        level: 2,
        lines: [
          `Readiness verdict: ${driftReport.readiness_verdict.verdict_ref}.`,
          `Documentation state: ${driftReport.parity_state.documentation_state}.`,
          `Binding state: ${driftReport.parity_state.generated_binding_state}.`,
        ],
        plainText: `${driftReport.readiness_verdict.verdict_ref} ${driftReport.parity_state.documentation_state} ${driftReport.parity_state.generated_binding_state}`,
        excerpt: `${driftReport.readiness_verdict.verdict_ref} from the current schema drift and compatibility posture.`,
        mentionedSchemaTokens: [],
        mentionedSampleTokens: [],
        mentionedTaskIds: ["pc_0080"],
      },
    ],
    schemaIdentityOrNull: null,
    schemaFields: [],
    samplePointers: [],
    sampleIdentityOrNull: null,
    bindingIdentityOrNull: null,
    validatorIdentityOrNull: null,
    driftIdentityOrNull: {
      verdictRef: driftReport.readiness_verdict.verdict_ref,
      admissibilityState: driftReport.readiness_verdict.admissibility_state,
      rollbackBoundaryState: driftReport.readiness_verdict.rollback_boundary_state,
      documentationState: driftReport.parity_state.documentation_state,
      generatedBindingState: driftReport.parity_state.generated_binding_state,
      sampleBindingState: driftReport.parity_state.sample_binding_state,
      compatibilityWindowRef: driftReport.historical_protected_window.compatibility_window_ref,
      schemaBundleHash: driftReport.candidate_bundle.schema_bundle_hash,
      candidateIdentityHash: driftReport.candidate_identity_contract.candidate_identity_hash,
    },
    headerStrip: {
      kind: "DRIFT",
      badgeLabel: "Readiness",
      metricPairs: [
        { label: "Verdict", value: driftReport.readiness_verdict.verdict_ref },
        { label: "Docs", value: driftReport.parity_state.documentation_state },
        { label: "Bindings", value: driftReport.parity_state.generated_binding_state },
      ],
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
      file: ["data/contracts/schema_drift_report.json"],
      headings: ["Overview"],
      schemaRefs: [],
      sampleRefs: [],
      bindingRefs: [],
      validatorRefs: [],
      driftRefs: [driftReport.report_id],
      taskRefs: ["pc_0080"],
    },
    fieldCrosslinks: [],
    taskRefs: ["pc_0080"],
  });

  const graphResult = buildSchemaCrosslinkGraph({
    artifacts,
    validation: {
      brokenRelativeLinks,
      headingCollisions,
      missingSchemaTokens,
      orphanSamples,
    },
  });
  const finalizedArtifacts = finalizeRelationships(artifacts, graphResult);
  const defaultArtifactSlug = "overview";
  const navigationIndex = buildNavigationIndex({
    artifacts: finalizedArtifacts,
    navigationSchema,
    defaultArtifactSlug,
  });
  const searchIndex = buildSearchIndex({
    artifacts: finalizedArtifacts,
  });

  const siteManifestPayload: SiteManifestPayload = {
    siteVersion: "CONTRACT_OBSERVATORY_SITE_V1",
    routeId: manifest.routeId,
    title: manifest.title,
    subtitle: manifest.subtitle,
    siteSummary: manifest.siteSummary,
    defaultArtifactSlug,
    currentDriftChip: driftReport.readiness_verdict.verdict_ref,
    currentBindingChip: bindingCatalog.generationState,
    currentBundleChip: driftReport.candidate_bundle.schema_bundle_hash.slice(0, 12),
    searchEntryCount: searchIndex.entries.length,
    artifactCount: finalizedArtifacts.length,
    recentArtifactLimit: manifest.viewPolicies.recentArtifactLimit,
    largeSchemaFieldCollapseThreshold: manifest.viewPolicies.largeSchemaFieldCollapseThreshold,
    sourceRoots: manifest.sourceRoots.map((entry) => ({
      root: entry.root,
      artifactSourceRef: entry.artifactSourceRef,
      sourceTruthBadge: entry.sourceTruthBadge,
    })),
  };

  if (
    graphResult.graph.brokenRelativeLinks.length > 0 ||
    graphResult.graph.missingSchemaTokens.length > 0 ||
    graphResult.graph.orphanSamples.length > 0 ||
    bindingCatalog.generationState !== "IN_SYNC"
  ) {
    const diagnostics = [
      ...graphResult.graph.brokenRelativeLinks.map(
        (entry) => `BROKEN_RELATIVE_LINK ${entry.sourcePath} -> ${entry.href}`,
      ),
      ...graphResult.graph.missingSchemaTokens.map(
        (entry) => `MISSING_SCHEMA_TOKEN ${entry.sourcePath} -> ${entry.token}`,
      ),
      ...graphResult.graph.orphanSamples.map(
        (entry) => `ORPHAN_SAMPLE ${entry.sampleName} -> ${entry.inferredSchemaName}`,
      ),
      ...(bindingCatalog.generationState === "IN_SYNC"
        ? []
        : [
            `STALE_BINDING_CATALOG expected source map hash ${bindingCatalog.schemaSourceMapHash} but report recorded ${bindingCatalog.reportSourceMapHash}`,
          ]),
    ];
    throw new Error(`contract observatory validation failed\n${diagnostics.join("\n")}`);
  }

  const outputs = new Map<string, string>();
  outputs.set(
    manifest.outputPaths.siteManifest,
    JSON.stringify(siteManifestPayload, null, 2),
  );
  outputs.set(
    manifest.outputPaths.navigationIndex,
    JSON.stringify(navigationIndex, null, 2),
  );
  outputs.set(
    manifest.outputPaths.searchIndex,
    JSON.stringify(searchIndex, null, 2),
  );
  outputs.set(
    manifest.outputPaths.schemaCrosslinkGraph,
    JSON.stringify(graphResult.graph, null, 2),
  );
  outputs.set(
    manifest.outputPaths.bindingCatalog,
    JSON.stringify(bindingCatalog, null, 2),
  );
  for (const artifact of finalizedArtifacts) {
    outputs.set(
      `${manifest.outputPaths.artifactsDirectory}/${artifact.artifactSlug}.json`,
      JSON.stringify(artifact, null, 2),
    );
  }

  return {
    outputs,
    siteManifestPayload,
  };
}

async function checkGeneratedOutputs(outputs: Map<string, string>) {
  const mismatches: string[] = [];
  for (const [relativePath, expected] of outputs.entries()) {
    const absolutePath = path.join(repoRoot, relativePath);
    let existing: string | null = null;
    try {
      existing = await readFile(absolutePath, "utf8");
    } catch {
      existing = null;
    }
    if (existing !== expected) {
      mismatches.push(relativePath);
    }
  }

  const artifactsDirectory = path.join(
    repoRoot,
    "apps/operator-web/public/internal/contracts-observatory/data/artifacts",
  );
  const existingArtifacts = (await readdir(artifactsDirectory)).filter((entry) => entry.endsWith(".json"));
  const expectedArtifacts = [...outputs.keys()]
    .filter((relativePath) => relativePath.startsWith("apps/operator-web/public/internal/contracts-observatory/data/artifacts/"))
    .map((relativePath) => path.basename(relativePath))
    .sort();
  if (JSON.stringify(existingArtifacts.sort()) !== JSON.stringify(expectedArtifacts)) {
    mismatches.push("apps/operator-web/public/internal/contracts-observatory/data/artifacts/*");
  }

  if (mismatches.length > 0) {
    throw new Error(`contract observatory artifacts drifted\n${mismatches.join("\n")}`);
  }
}

async function emitGeneratedOutputs(outputs: Map<string, string>) {
  for (const [relativePath, contents] of outputs.entries()) {
    await writeIfChanged(path.join(repoRoot, relativePath), contents);
  }
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const mode = args.has("--emit") ? "emit" : args.has("--check") ? "check" : "emit";
  const { outputs, siteManifestPayload } = await buildGeneratedOutputs();

  if (mode === "check") {
    await checkGeneratedOutputs(outputs);
    process.stdout.write(
      `verified contract observatory artifacts (${siteManifestPayload.artifactCount} artifacts)\n`,
    );
    return;
  }

  await emitGeneratedOutputs(outputs);
  process.stdout.write(
    `emitted contract observatory artifacts (${siteManifestPayload.artifactCount} artifacts)\n`,
  );
}

await main();
