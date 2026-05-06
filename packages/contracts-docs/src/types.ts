export type NavigationSectionRef =
  | "OVERVIEW"
  | "RUNTIME_CONTRACTS"
  | "DATA_MODEL"
  | "SCHEMAS"
  | "SAMPLES"
  | "BINDINGS"
  | "VALIDATORS"
  | "DRIFT_AND_READINESS"
  | "SUPPORT_DOCS";

export type ArtifactKind =
  | "OVERVIEW"
  | "MARKDOWN"
  | "SCHEMA"
  | "SAMPLE"
  | "BINDING"
  | "VALIDATOR"
  | "DRIFT"
  | "TASK_CARD";

export type ArtifactAuthorityLevel =
  | "AUTHORITATIVE"
  | "GENERATED_COMPANION"
  | "SUPPORTING_REFERENCE"
  | "TRACEABILITY_REFERENCE";

export type ArtifactTone = "navy" | "sage" | "brass" | "slate";

export type ContractsSourceRoot = {
  root: string;
  includeGlobs: string[];
  artifactSourceRef:
    | "ALGORITHM_MARKDOWN"
    | "SUPPORT_DOCS"
    | "PROMPT_CARDS"
    | "IMPORTED_SCHEMA_MIRROR"
    | "LOCAL_SCHEMA"
    | "IMPORTED_SAMPLE_MIRROR"
    | "VALIDATOR_MIRROR";
  authorityLevel: ArtifactAuthorityLevel;
  sourceTruthBadge: string;
};

export type ContractsSiteManifest = {
  manifestVersion: "CONTRACTS_SITE_MANIFEST_V1";
  routeId: "contracts-observatory";
  title: string;
  subtitle: string;
  siteSummary: string;
  navigationSchemaPath: string;
  sourceRoots: ContractsSourceRoot[];
  outputPaths: {
    siteManifest: string;
    navigationIndex: string;
    searchIndex: string;
    schemaCrosslinkGraph: string;
    bindingCatalog: string;
    artifactsDirectory: string;
  };
  viewPolicies: {
    commandSearchLimit: number;
    recentArtifactLimit: number;
    largeSchemaFieldCollapseThreshold: number;
    proseExcerptLength: number;
  };
};

export type NavigationSectionRule = {
  sectionRef: NavigationSectionRef;
  label: string;
  summary: string;
  appliesToKinds: ArtifactKind[];
  includeGlobs: string[];
};

export type ContractsNavigationSchema = {
  schemaVersion: "CONTRACTS_NAVIGATION_SCHEMA_V1";
  defaultSectionRef: NavigationSectionRef;
  sectionOrder: NavigationSectionRef[];
  sections: NavigationSectionRule[];
};

export type MarkdownLinkRef = {
  label: string;
  rawHref: string;
  resolvedPathOrNull: string | null;
  anchorOrNull: string | null;
};

export type MarkdownHeading = {
  level: number;
  text: string;
  slug: string;
};

export type MarkdownSection = {
  headingSlug: string;
  headingText: string;
  level: number;
  lines: string[];
  plainText: string;
  excerpt: string;
  mentionedSchemaTokens: string[];
  mentionedSampleTokens: string[];
  mentionedTaskIds: string[];
};

export type ParsedMarkdownArtifact = {
  relativePath: string;
  title: string;
  headings: MarkdownHeading[];
  sections: MarkdownSection[];
  links: MarkdownLinkRef[];
  text: string;
  mentionedSchemaTokens: string[];
  mentionedSampleTokens: string[];
  mentionedTaskIds: string[];
  headingCollisions: string[];
};

export type SchemaFieldRecord = {
  path: string;
  label: string;
  typeLabel: string;
  required: boolean;
  depth: number;
  topLevelGroup: string;
  descriptionOrNull: string | null;
  refTargetOrNull: string | null;
};

export type SamplePointerRecord = {
  pointer: string;
  key: string;
  preview: string;
  topLevelGroup: string;
};

export type ArtifactLink = {
  artifactSlug: string;
  title: string;
  kind: ArtifactKind;
  authorityLevel: ArtifactAuthorityLevel;
  sectionRef: NavigationSectionRef;
  headingSlugOrNull: string | null;
  reason: string;
};

export type SourceTruthStack = {
  file: string[];
  headings: string[];
  schemaRefs: string[];
  sampleRefs: string[];
  bindingRefs: string[];
  validatorRefs: string[];
  driftRefs: string[];
  taskRefs: string[];
};

export type ObservatoryArtifact = {
  artifactVersion: "CONTRACT_OBSERVATORY_ARTIFACT_V1";
  artifactSlug: string;
  artifactKind: ArtifactKind;
  sectionRef: NavigationSectionRef;
  authorityLevel: ArtifactAuthorityLevel;
  sourceTruthBadge: string;
  tone: ArtifactTone;
  title: string;
  subtitle: string;
  summary: string;
  canonicalPath: string;
  sourceLineage: string[];
  headingCount: number;
  headings: MarkdownHeading[];
  proseSections: MarkdownSection[];
  schemaIdentityOrNull: {
    schemaName: string;
    schemaId: string;
    logicalFamilyLabel: string;
    validationPosture: string;
    sourceHash: string;
    destinationHash: string;
    refTargets: string[];
  } | null;
  schemaFields: SchemaFieldRecord[];
  samplePointers: SamplePointerRecord[];
  sampleIdentityOrNull: {
    sampleName: string;
    inferredSchemaName: string;
    inferredSchemaId: string;
    validationPosture: string;
    sourceHash: string;
    destinationHash: string;
  } | null;
  bindingIdentityOrNull: {
    bindingRef: string;
    languageRef: string;
    familyRef: string;
    outputRef: string;
    coverageClass: string;
    sourceHashAggregate: string;
    generationState: "IN_SYNC" | "STALE_SOURCE_MAP";
    gapIds: string[];
  } | null;
  validatorIdentityOrNull: {
    artifactRef: string;
    command: string;
    adaptationPosture: string;
    sourceHash: string;
    destinationHash: string;
  } | null;
  driftIdentityOrNull: {
    verdictRef: string;
    admissibilityState: string;
    rollbackBoundaryState: string;
    documentationState: string;
    generatedBindingState: string;
    sampleBindingState: string;
    compatibilityWindowRef: string;
    schemaBundleHash: string;
    candidateIdentityHash: string;
  } | null;
  headerStrip: {
    kind: "PROSE" | "SCHEMA" | "SAMPLE" | "BINDING" | "VALIDATOR" | "DRIFT" | "OVERVIEW" | "TASK";
    badgeLabel: string;
    metricPairs: Array<{
      label: string;
      value: string;
    }>;
  };
  relationships: {
    schemas: ArtifactLink[];
    samples: ArtifactLink[];
    bindings: ArtifactLink[];
    validators: ArtifactLink[];
    docs: ArtifactLink[];
    tasks: ArtifactLink[];
  };
  sourceTruthStack: SourceTruthStack;
  fieldCrosslinks: Array<{
    fieldPath: string;
    proseTargets: Array<{
      artifactSlug: string;
      headingSlug: string;
      title: string;
      excerpt: string;
    }>;
    sampleTargets: Array<{
      artifactSlug: string;
      pointer: string;
      preview: string;
    }>;
  }>;
  taskRefs: string[];
};

export type NavigationArtifactSummary = {
  artifactSlug: string;
  artifactKind: ArtifactKind;
  authorityLevel: ArtifactAuthorityLevel;
  sourceTruthBadge: string;
  title: string;
  subtitle: string;
  summary: string;
  canonicalPath: string;
  tone: ArtifactTone;
  sourceTruthStackCounts: {
    schemas: number;
    samples: number;
    bindings: number;
    validators: number;
    tasks: number;
  };
};

export type NavigationIndex = {
  indexVersion: "CONTRACT_NAVIGATION_INDEX_V1";
  defaultArtifactSlug: string;
  sections: Array<{
    sectionRef: NavigationSectionRef;
    label: string;
    summary: string;
    artifactCount: number;
    artifacts: NavigationArtifactSummary[];
  }>;
};

export type SearchIndexEntry = {
  entryId: string;
  artifactSlug: string;
  artifactKind: ArtifactKind;
  authorityLevel: ArtifactAuthorityLevel;
  sectionRef: NavigationSectionRef;
  title: string;
  summary: string;
  headingSlugOrNull: string | null;
  fieldPathOrNull: string | null;
  deepLink: string;
  searchText: string;
};

export type SearchIndex = {
  indexVersion: "CONTRACT_SEARCH_INDEX_V1";
  entries: SearchIndexEntry[];
};

export type BindingCatalog = {
  catalogVersion: "CONTRACT_BINDING_CATALOG_V1";
  schemaSourceMapHash: string;
  reportSourceMapHash: string;
  generationState: "IN_SYNC" | "STALE_SOURCE_MAP";
  languages: Array<{
    languageRef: string;
    label: string;
    summary: string;
    familyCount: number;
  }>;
  schemaBindings: Array<{
    schemaName: string;
    schemaId: string;
    logicalFamilyRef: string;
    logicalFamilyLabel: string;
    entries: Array<{
      bindingRef: string;
      languageRef: string;
      familyRef: string;
      familyLabel: string;
      outputRef: string;
      coverageClass: string;
      sourceHashAggregate: string;
      generationState: "IN_SYNC" | "STALE_SOURCE_MAP";
      gapIds: string[];
    }>;
  }>;
};

export type SchemaCrosslinkGraph = {
  graphVersion: "SCHEMA_CROSSLINK_GRAPH_V1";
  brokenRelativeLinks: Array<{
    sourcePath: string;
    href: string;
  }>;
  missingSchemaTokens: Array<{
    sourcePath: string;
    token: string;
  }>;
  orphanSamples: Array<{
    sampleName: string;
    inferredSchemaName: string;
  }>;
  headingCollisions: Array<{
    sourcePath: string;
    slug: string;
  }>;
  schemaNodes: Array<{
    schemaName: string;
    schemaId: string;
    artifactSlug: string;
    linkedDocCount: number;
    linkedSampleCount: number;
    linkedBindingCount: number;
    linkedTaskCount: number;
    fields: Array<{
      fieldPath: string;
      proseTargets: Array<{
        artifactSlug: string;
        headingSlug: string;
        title: string;
      }>;
      sampleTargets: Array<{
        artifactSlug: string;
        pointer: string;
      }>;
    }>;
  }>;
};

export type SiteManifestPayload = {
  siteVersion: "CONTRACT_OBSERVATORY_SITE_V1";
  routeId: "contracts-observatory";
  title: string;
  subtitle: string;
  siteSummary: string;
  defaultArtifactSlug: string;
  currentDriftChip: string;
  currentBindingChip: string;
  currentBundleChip: string;
  searchEntryCount: number;
  artifactCount: number;
  recentArtifactLimit: number;
  largeSchemaFieldCollapseThreshold: number;
  sourceRoots: Array<{
    root: string;
    artifactSourceRef: string;
    sourceTruthBadge: string;
  }>;
};
