import {
  assert,
  stableHash,
  type SchemaBundleMaterialization,
  type SchemaDriftGroupRef,
  type SchemaDriftPhaseRef,
  type SchemaDriftPolicy,
  type SchemaDriftSeverityRef
} from "./schema_bundle_builder.ts";

export type SchemaDriftReasonCode =
  | "OPTIONAL_PROPERTY_ADDED"
  | "REQUIRED_PROPERTY_ADDED"
  | "PROPERTY_REMOVED"
  | "TYPE_NARROWED"
  | "TYPE_WIDENED"
  | "TYPE_CHANGED"
  | "ENUM_NARROWED"
  | "ENUM_EXPANDED"
  | "ENUM_REORDERED"
  | "SCHEMA_ID_CHANGED"
  | "DOC_TOKEN_STALE"
  | "SAMPLE_BINDING_DRIFT"
  | "BINDING_SOURCE_MAP_STALE"
  | "BINDING_LANGUAGE_MISSING"
  | "SCHEMA_REMOVED"
  | "SCHEMA_ADDED"
  | "MIGRATION_LEDGER_MISSING"
  | "BACKFILL_EXECUTION_CONTRACT_INCOMPLETE"
  | "READER_WINDOW_STILL_OPEN"
  | "SUPPORTED_CLIENT_WINDOW_REF_MISMATCH";

export type SchemaDriftDelta = {
  deltaRef: string;
  atlasGroupRef: SchemaDriftGroupRef;
  severityRef: SchemaDriftSeverityRef;
  phaseRef: SchemaDriftPhaseRef;
  diffCode: SchemaDriftReasonCode;
  schemaName: string;
  schemaPath: string;
  summary: string;
  readinessImpactRef: "ROLLBACK_SAFE" | "FAIL_FORWARD_ONLY" | "BLOCKING";
  migrationRequirement:
    | "NONE"
    | "MIGRATION_LEDGER_REQUIRED"
    | "BACKFILL_REQUIRED"
    | "READER_WINDOW_CLOSE_REQUIRED";
  sealedManifestImpact: boolean;
  reasonCodes: string[];
  affectedArtifacts: string[];
  baselineValueOrNull: string | null;
  candidateValueOrNull: string | null;
  sourceLineage: string[];
};

export type SchemaDriftDiffResult = {
  baselineBundleRef: string;
  candidateBundleRef: string;
  deltas: SchemaDriftDelta[];
};

type SeverityRow = SchemaDriftPolicy["severityRows"][number];

function policyRowForDiffCode(policy: SchemaDriftPolicy, diffCode: SchemaDriftReasonCode) {
  const row = policy.severityRows.find((entry) => entry.diffCode === diffCode);
  assert(row, `missing schema drift policy row for ${diffCode}`);
  return row satisfies SeverityRow;
}

function pointer(base: string, key: string) {
  return `${base}/properties/${key}`;
}

function normalizedType(value: unknown) {
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value) && value.every((entry) => typeof entry === "string")) {
    return [...value].sort();
  }
  return null;
}

function normalizedEnum(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }
  const asStrings = value.filter((entry) => typeof entry === "string");
  return asStrings.length === value.length ? asStrings : null;
}

function isSealedManifestPath(
  policy: SchemaDriftPolicy,
  schemaName: string,
  schemaPath: string,
) {
  return policy.sealedManifestSchemaRefs.some(
    (entry) => schemaName === entry || schemaPath.startsWith(`${entry}#/`),
  );
}

function createDelta(
  policy: SchemaDriftPolicy,
  input: {
    affectedArtifacts: string[];
    baselineValueOrNull?: string | null;
    candidateValueOrNull?: string | null;
    diffCode: SchemaDriftReasonCode;
    reasonCodes?: string[];
    schemaName: string;
    schemaPath: string;
    sourceLineage: string[];
    summary: string;
  },
) {
  const policyRow = policyRowForDiffCode(policy, input.diffCode);
  const sealedManifestImpact = isSealedManifestPath(policy, input.schemaName, input.schemaPath);
  return {
    deltaRef: stableHash({
      diffCode: input.diffCode,
      schemaName: input.schemaName,
      schemaPath: input.schemaPath,
      summary: input.summary,
    }),
    atlasGroupRef: policyRow.atlasGroupRef,
    severityRef: policyRow.severityRef,
    phaseRef: policyRow.phaseRef,
    diffCode: input.diffCode,
    schemaName: input.schemaName,
    schemaPath: input.schemaPath,
    summary: input.summary,
    readinessImpactRef: policyRow.defaultReadinessImpact,
    migrationRequirement: policyRow.migrationRequirement,
    sealedManifestImpact,
    reasonCodes: [...new Set([input.diffCode, ...(input.reasonCodes ?? [])])],
    affectedArtifacts: [...new Set(input.affectedArtifacts)].sort(),
    baselineValueOrNull: input.baselineValueOrNull ?? null,
    candidateValueOrNull: input.candidateValueOrNull ?? null,
    sourceLineage: input.sourceLineage,
  } satisfies SchemaDriftDelta;
}

function compareDocumentationAndSamples(
  policy: SchemaDriftPolicy,
  baselineSchema: SchemaBundleMaterialization["schemas"][number],
  candidateSchema: SchemaBundleMaterialization["schemas"][number],
  deltas: SchemaDriftDelta[],
  lineage: string[],
) {
  const baselineDocs = [...baselineSchema.documentationRefs].sort();
  const candidateDocs = [...candidateSchema.documentationRefs].sort();
  if (JSON.stringify(baselineDocs) !== JSON.stringify(candidateDocs)) {
    deltas.push(
      createDelta(policy, {
        diffCode: "DOC_TOKEN_STALE",
        schemaName: candidateSchema.schemaName,
        schemaPath: `${candidateSchema.schemaName}#/documentationBindings`,
        summary:
          "Documentation token bindings drifted away from the schema identity surface.",
        affectedArtifacts: [
          candidateSchema.destinationPath,
          ...baselineDocs,
          ...candidateDocs,
        ],
        baselineValueOrNull: baselineDocs.join(", "),
        candidateValueOrNull: candidateDocs.join(", "),
        sourceLineage: lineage,
      }),
    );
  }

  const baselineSamples = baselineSchema.sampleBindings.map((entry) => entry.sampleName).sort();
  const candidateSamples = candidateSchema.sampleBindings.map((entry) => entry.sampleName).sort();
  if (JSON.stringify(baselineSamples) !== JSON.stringify(candidateSamples)) {
    deltas.push(
      createDelta(policy, {
        diffCode: "SAMPLE_BINDING_DRIFT",
        schemaName: candidateSchema.schemaName,
        schemaPath: `${candidateSchema.schemaName}#/sampleBindings`,
        summary:
          "Bundled sample bindings no longer match the schema surface that they are meant to illustrate.",
        affectedArtifacts: [
          candidateSchema.destinationPath,
          ...candidateSchema.sampleBindings.map((entry) => entry.destinationPath),
        ],
        baselineValueOrNull: baselineSamples.join(", "),
        candidateValueOrNull: candidateSamples.join(", "),
        sourceLineage: lineage,
      }),
    );
  }
}

function compareTypeAndEnum(
  policy: SchemaDriftPolicy,
  schemaName: string,
  schemaPath: string,
  baselineNode: Record<string, unknown>,
  candidateNode: Record<string, unknown>,
  affectedArtifacts: string[],
  lineage: string[],
  deltas: SchemaDriftDelta[],
) {
  const baselineTypes = normalizedType(baselineNode.type);
  const candidateTypes = normalizedType(candidateNode.type);
  if (baselineTypes && candidateTypes && JSON.stringify(baselineTypes) !== JSON.stringify(candidateTypes)) {
    const baselineSet = new Set(baselineTypes);
    const candidateSet = new Set(candidateTypes);
    const candidateWidens = baselineTypes.every((entry) => candidateSet.has(entry));
    const candidateNarrows = candidateTypes.every((entry) => baselineSet.has(entry));

    deltas.push(
      createDelta(policy, {
        diffCode: candidateWidens
          ? "TYPE_WIDENED"
          : candidateNarrows
            ? "TYPE_NARROWED"
            : "TYPE_CHANGED",
        schemaName,
        schemaPath,
        summary: candidateWidens
          ? "Type surface widened while preserving the previous accepted values."
          : candidateNarrows
            ? "Type surface narrowed and may reject historical or client-visible values."
            : "Type surface changed incompatibly.",
        affectedArtifacts,
        baselineValueOrNull: baselineTypes.join(" | "),
        candidateValueOrNull: candidateTypes.join(" | "),
        sourceLineage: lineage,
      }),
    );
  }

  const baselineEnum = normalizedEnum(baselineNode.enum);
  const candidateEnum = normalizedEnum(candidateNode.enum);
  if (baselineEnum && candidateEnum && JSON.stringify(baselineEnum) !== JSON.stringify(candidateEnum)) {
    const sameValues =
      baselineEnum.length === candidateEnum.length &&
      [...baselineEnum].sort().every((value, index) => value === [...candidateEnum].sort()[index]);

    deltas.push(
      createDelta(policy, {
        diffCode: sameValues
          ? "ENUM_REORDERED"
          : baselineEnum.every((value) => candidateEnum.includes(value))
            ? "ENUM_EXPANDED"
            : candidateEnum.every((value) => baselineEnum.includes(value))
              ? "ENUM_NARROWED"
              : "TYPE_CHANGED",
        schemaName,
        schemaPath,
        summary: sameValues
          ? "Enum ordering changed while the allowed value set remained identical."
          : baselineEnum.every((value) => candidateEnum.includes(value))
            ? "Enum value set expanded with new admissible values."
            : candidateEnum.every((value) => baselineEnum.includes(value))
              ? "Enum value set narrowed and may break replay or client compatibility."
              : "Enum value set changed incompatibly.",
        affectedArtifacts,
        baselineValueOrNull: baselineEnum.join(", "),
        candidateValueOrNull: candidateEnum.join(", "),
        sourceLineage: lineage,
      }),
    );
  }
}

function compareSchemaNodes(
  policy: SchemaDriftPolicy,
  schemaName: string,
  schemaPath: string,
  baselineNode: Record<string, unknown>,
  candidateNode: Record<string, unknown>,
  affectedArtifacts: string[],
  lineage: string[],
  deltas: SchemaDriftDelta[],
) {
  compareTypeAndEnum(
    policy,
    schemaName,
    schemaPath,
    baselineNode,
    candidateNode,
    affectedArtifacts,
    lineage,
    deltas,
  );

  const baselineProperties =
    baselineNode.properties && typeof baselineNode.properties === "object"
      ? (baselineNode.properties as Record<string, unknown>)
      : {};
  const candidateProperties =
    candidateNode.properties && typeof candidateNode.properties === "object"
      ? (candidateNode.properties as Record<string, unknown>)
      : {};
  const baselineRequired = new Set(
    Array.isArray(baselineNode.required)
      ? baselineNode.required.filter((entry) => typeof entry === "string")
      : [],
  );
  const candidateRequired = new Set(
    Array.isArray(candidateNode.required)
      ? candidateNode.required.filter((entry) => typeof entry === "string")
      : [],
  );

  if (
    Array.isArray(baselineNode.required) &&
    Array.isArray(candidateNode.required) &&
    JSON.stringify([...baselineRequired].sort()) === JSON.stringify([...candidateRequired].sort()) &&
    JSON.stringify(baselineNode.required) !== JSON.stringify(candidateNode.required)
  ) {
    deltas.push(
      createDelta(policy, {
        diffCode: "ENUM_REORDERED",
        schemaName,
        schemaPath: `${schemaPath}/required`,
        summary: "Required-field ordering changed while the semantic set remained the same.",
        affectedArtifacts,
        baselineValueOrNull: JSON.stringify(baselineNode.required),
        candidateValueOrNull: JSON.stringify(candidateNode.required),
        sourceLineage: lineage,
      }),
    );
  }

  for (const propertyName of Object.keys(candidateProperties).sort()) {
    if (!Object.hasOwn(baselineProperties, propertyName)) {
      deltas.push(
        createDelta(policy, {
          diffCode: candidateRequired.has(propertyName)
            ? "REQUIRED_PROPERTY_ADDED"
            : "OPTIONAL_PROPERTY_ADDED",
          schemaName,
          schemaPath: pointer(schemaPath, propertyName),
          summary: candidateRequired.has(propertyName)
            ? "A new required field was introduced and can break historical payloads."
            : "A new optional field was introduced without changing existing payload validity.",
          affectedArtifacts,
          baselineValueOrNull: null,
          candidateValueOrNull: JSON.stringify(candidateProperties[propertyName]),
          sourceLineage: lineage,
        }),
      );
      continue;
    }

    if (
      typeof baselineProperties[propertyName] === "object" &&
      baselineProperties[propertyName] !== null &&
      typeof candidateProperties[propertyName] === "object" &&
      candidateProperties[propertyName] !== null
    ) {
      compareSchemaNodes(
        policy,
        schemaName,
        pointer(schemaPath, propertyName),
        baselineProperties[propertyName] as Record<string, unknown>,
        candidateProperties[propertyName] as Record<string, unknown>,
        affectedArtifacts,
        lineage,
        deltas,
      );
    }
  }

  for (const propertyName of Object.keys(baselineProperties).sort()) {
    if (!Object.hasOwn(candidateProperties, propertyName)) {
      deltas.push(
        createDelta(policy, {
          diffCode: "PROPERTY_REMOVED",
          schemaName,
          schemaPath: pointer(schemaPath, propertyName),
          summary:
            "A previously declared field was removed from the schema surface and cannot be treated as rollback-safe.",
          affectedArtifacts,
          baselineValueOrNull: JSON.stringify(baselineProperties[propertyName]),
          candidateValueOrNull: null,
          sourceLineage: lineage,
        }),
      );
    }
  }
}

export function summarizeDeltasByGroup(deltas: SchemaDriftDelta[]) {
  return Object.fromEntries(
    (
      [
        "ADDITIVE",
        "NARROWING",
        "DESTRUCTIVE",
        "DOC_DRIFT",
        "BINDING_DRIFT",
        "MIGRATION_GAP",
      ] satisfies SchemaDriftGroupRef[]
    ).map((groupRef) => [
      groupRef,
      deltas.filter((delta) => delta.atlasGroupRef === groupRef).length,
    ]),
  ) as Record<SchemaDriftGroupRef, number>;
}

export function compareSchemaBundles(input: {
  baselineBundle: SchemaBundleMaterialization;
  candidateBundle: SchemaBundleMaterialization;
  policy: SchemaDriftPolicy;
}) {
  const { baselineBundle, candidateBundle, policy } = input;
  const baselineByName = new Map(
    baselineBundle.schemas.map((schema) => [schema.schemaName, schema] as const),
  );
  const candidateByName = new Map(
    candidateBundle.schemas.map((schema) => [schema.schemaName, schema] as const),
  );
  const deltas: SchemaDriftDelta[] = [];

  for (const [schemaName, candidateSchema] of candidateByName) {
    const baselineSchema = baselineByName.get(schemaName);
    const affectedArtifacts = [
      candidateSchema.destinationPath,
      ...candidateSchema.sampleBindings.map((entry) => entry.destinationPath),
      ...candidateSchema.documentationRefs,
    ];
    const lineage = [baselineBundle.bundleRef, candidateBundle.bundleRef, schemaName];

    if (!baselineSchema) {
      deltas.push(
        createDelta(policy, {
          diffCode: "SCHEMA_ADDED",
          schemaName,
          schemaPath: `${schemaName}#`,
          summary: "A new schema entered the bundle and must be reviewed for migration implications.",
          affectedArtifacts,
          candidateValueOrNull: candidateSchema.schemaId,
          sourceLineage: lineage,
        }),
      );
      continue;
    }

    if (baselineSchema.schemaId !== candidateSchema.schemaId) {
      deltas.push(
        createDelta(policy, {
          diffCode: "SCHEMA_ID_CHANGED",
          schemaName,
          schemaPath: `${schemaName}#/$id`,
          summary: "The schema `$id` changed, which breaks canonical contract identity.",
          affectedArtifacts,
          baselineValueOrNull: baselineSchema.schemaId,
          candidateValueOrNull: candidateSchema.schemaId,
          sourceLineage: lineage,
        }),
      );
    }

    compareSchemaNodes(
      policy,
      schemaName,
      `${schemaName}#`,
      baselineSchema.document,
      candidateSchema.document,
      affectedArtifacts,
      lineage,
      deltas,
    );
    compareDocumentationAndSamples(policy, baselineSchema, candidateSchema, deltas, lineage);
  }

  for (const [schemaName, baselineSchema] of baselineByName) {
    if (!candidateByName.has(schemaName)) {
      deltas.push(
        createDelta(policy, {
          diffCode: "SCHEMA_REMOVED",
          schemaName,
          schemaPath: `${schemaName}#`,
          summary:
            "A schema disappeared from the candidate bundle and the release cannot assume historical readers no longer require it.",
          affectedArtifacts: [baselineSchema.destinationPath],
          baselineValueOrNull: baselineSchema.schemaId,
          candidateValueOrNull: null,
          sourceLineage: [baselineBundle.bundleRef, candidateBundle.bundleRef, schemaName],
        }),
      );
    }
  }

  if (
    candidateBundle.generatedBindingSnapshot.generationSourceMapHash !==
      candidateBundle.schemaSourceMapHash ||
    candidateBundle.generatedBindingSnapshot.stateRef === "DRIFT"
  ) {
    deltas.push(
      createDelta(policy, {
        diffCode: "BINDING_SOURCE_MAP_STALE",
        schemaName: "schema_bundle",
        schemaPath: "schema_bundle#/$defs/generatedBindings",
        summary:
          "Generated language bindings are stale relative to the current imported schema bundle.",
        affectedArtifacts: ["data/contracts/binding_coverage_report.json"],
        baselineValueOrNull: candidateBundle.generatedBindingSnapshot.generationSourceMapHash,
        candidateValueOrNull: candidateBundle.schemaSourceMapHash,
        reasonCodes: candidateBundle.generatedBindingSnapshot.staleLanguageRefs.map(
          (languageRef) => `LANGUAGE_${languageRef}_STALE`,
        ),
        sourceLineage: [baselineBundle.bundleRef, candidateBundle.bundleRef, "binding_coverage"],
      }),
    );
  }

  for (const languageRef of candidateBundle.generatedBindingSnapshot.staleLanguageRefs) {
    deltas.push(
      createDelta(policy, {
        diffCode: "BINDING_LANGUAGE_MISSING",
        schemaName: "schema_bundle",
        schemaPath: `schema_bundle#/$defs/generatedBindings/${languageRef}`,
        summary: `Generated binding coverage for ${languageRef} is missing or out of sync.`,
        affectedArtifacts: ["data/contracts/binding_coverage_report.json"],
        candidateValueOrNull: languageRef,
        sourceLineage: [baselineBundle.bundleRef, candidateBundle.bundleRef, languageRef],
      }),
    );
  }

  deltas.sort((left, right) => left.schemaPath.localeCompare(right.schemaPath));
  return {
    baselineBundleRef: baselineBundle.bundleRef,
    candidateBundleRef: candidateBundle.bundleRef,
    deltas,
  } satisfies SchemaDriftDiffResult;
}
