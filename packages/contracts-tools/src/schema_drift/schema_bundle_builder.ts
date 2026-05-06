import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type {
  LogicalFamilyRef,
  SampleBindingEntry,
  SchemaCatalogEntry
} from "../../../contracts-core/src/schemaCatalog.ts";
import { schemaCatalog } from "../../../contracts-core/src/schemaCatalog.ts";
import { computeImportedSchemaBundleHash, loadMigrationPolicyBundle } from "../../../control-plane-db/src/index.ts";

export type SchemaDriftGroupRef =
  | "ADDITIVE"
  | "NARROWING"
  | "DESTRUCTIVE"
  | "DOC_DRIFT"
  | "BINDING_DRIFT"
  | "MIGRATION_GAP";

export type SchemaDriftSeverityRef = "NOTICE" | "WARNING" | "BLOCKING";
export type SchemaDriftPhaseRef = "EXPAND" | "BACKFILL" | "VERIFY" | "CONTRACT";
export type GeneratedBindingStateRef = "IN_SYNC" | "DRIFT";

export type AtlasScenarioCard = {
  scenario_ref: string;
  atlas_group_ref: SchemaDriftGroupRef;
  phase_ref: SchemaDriftPhaseRef;
  tone: "success" | "warning" | "danger" | "slate";
  verdict_ref:
    | "ROLLBACK_SAFE"
    | "FAIL_FORWARD_ONLY"
    | "BLOCKED_PENDING_BACKFILL"
    | "BLOCKED_PENDING_READER_WINDOW"
    | "BLOCKED_PENDING_MIGRATION_LEDGER"
    | "BLOCKED_PENDING_DOC_SYNC"
    | "BLOCKED_PENDING_BINDING_REGEN"
    | "BLOCKED_PENDING_CLIENT_WINDOW";
  accessible_label: string;
  summary: string;
  schema_path: string;
  reason_codes: string[];
  required_artifact_refs: string[];
  rollback_boundary: "ROLLBACK_ALLOWED" | "FAIL_FORWARD_ONLY";
  inspector_body: string;
};

export type SchemaDriftPolicy = {
  contractVersion: "SCHEMA_DRIFT_POLICY_V1";
  policyId: string;
  basisStatement: string;
  comparisonBasis: {
    baselineBundleRef: string;
    candidateBundleRef: string;
    historicalWindowSourceRef: string;
  };
  severityRows: Array<{
    diffCode: string;
    atlasGroupRef: SchemaDriftGroupRef;
    severityRef: SchemaDriftSeverityRef;
    phaseRef: SchemaDriftPhaseRef;
    migrationRequirement:
      | "NONE"
      | "MIGRATION_LEDGER_REQUIRED"
      | "BACKFILL_REQUIRED"
      | "READER_WINDOW_CLOSE_REQUIRED";
    defaultReadinessImpact:
      | "ROLLBACK_SAFE"
      | "FAIL_FORWARD_ONLY"
      | "BLOCKING";
  }>;
  sealedManifestSchemaRefs: string[];
  candidateIdentityTemplate: {
    candidateEnvironmentRef: string;
    buildArtifactRef: string;
    artifactDigestSalt: string;
    providerProfileRefs: string[];
    supportedClientWindowRefOrNull: string | null;
  };
  documentationRoots: string[];
  bindingLanguagesRequired: string[];
  atlasScenarioCatalog: AtlasScenarioCard[];
};

export type ReleaseCandidateIdentityContract = {
  contract_version: "RELEASE_CANDIDATE_IDENTITY_V1";
  candidate_identity_hash: string;
  candidate_environment_ref: string;
  build_artifact_ref: string;
  artifact_digest: string;
  schema_bundle_hash: string;
  config_bundle_hash: string;
  migration_plan_ref_or_null: string | null;
  enabled_provider_profile_refs: string[];
  supported_client_window_ref_or_null: string | null;
  array_canonicalization_policy: "SORTED_UNIQUE_ARRAY_COMPONENTS_ONLY";
  suite_context_policy: "SUITE_SPECIFIC_DIMENSIONS_MUST_BE_DECLARED_OR_EXPLICITLY_NULL";
  admissibility_binding_policy: "GREEN_GATES_REQUIRE_EXACT_CANDIDATE_BINDING";
};

export type SchemaArtifactSnapshot = {
  schemaName: string;
  schemaId: string;
  logicalFamilyRef: LogicalFamilyRef;
  logicalFamilyLabel: string;
  sourcePath: string;
  destinationPath: string;
  sourceHash: string;
  destinationHash: string;
  document: Record<string, unknown>;
  sampleBindings: Array<{
    sampleName: string;
    destinationPath: string;
    destinationHash: string;
  }>;
  documentationRefs: string[];
};

export type BindingCoverageSnapshot = {
  generationSourceMapHash: string;
  familyCoverageByLanguage: Record<string, string[]>;
  staleLanguageRefs: string[];
  stateRef: GeneratedBindingStateRef;
};

export type SchemaBundleMaterialization = {
  bundleVersion: "SCHEMA_DRIFT_BUNDLE_V1";
  bundleRole: "BASELINE" | "CANDIDATE";
  bundleRef: string;
  basisStatement: string;
  schemaBundleHash: string;
  schemaSourceMapHash: string;
  sampleBindingMapHash: string;
  documentationBindingHash: string;
  generatedBindingSnapshot: BindingCoverageSnapshot;
  schemas: SchemaArtifactSnapshot[];
  sourceLineage: string[];
};

export type SchemaSourceMap = {
  schemas: SchemaCatalogEntry[];
};

export type SampleBindingMap = {
  samples: SampleBindingEntry[];
};

type BindingCoverageReport = {
  generationBasis: {
    sourceMapHash: string;
  };
  languages: Array<{
    languageRef: string;
    families: Array<{
      familyRef: string;
    }>;
  }>;
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(scriptDir, "..", "..", "..", "..");

const policyPath = path.join(repoRoot, "config", "contracts", "schema_drift_policy.json");
const schemaSourceMapPath = path.join(
  repoRoot,
  "packages",
  "contracts-core",
  "data",
  "schema_source_map.json",
);
const sampleBindingMapPath = path.join(
  repoRoot,
  "packages",
  "contracts-core",
  "data",
  "sample_binding_map.json",
);
const bindingCoverageReportPath = path.join(
  repoRoot,
  "data",
  "contracts",
  "binding_coverage_report.json",
);

export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalize(entry));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}

export function stableHash(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}

function sha256Hex(value: Buffer | string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function readJson<T>(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

async function listMarkdownFiles(rootPath: string): Promise<string[]> {
  const entries = await readdir(rootPath, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(rootPath, entry.name);
      if (entry.isDirectory()) {
        return listMarkdownFiles(fullPath);
      }
      return entry.isFile() && entry.name.endsWith(".md") ? [fullPath] : [];
    }),
  );
  return nested.flat().sort();
}

export async function loadSchemaDriftPolicy() {
  const policy = await readJson<SchemaDriftPolicy>(policyPath);
  assert(
    policy.contractVersion === "SCHEMA_DRIFT_POLICY_V1",
    "schema drift policy contract version drifted",
  );
  return policy;
}

function documentationRefForPath(filePath: string) {
  return path.relative(repoRoot, filePath).split(path.sep).join(path.posix.sep);
}

async function buildDocumentationBindingIndex(
  policy: SchemaDriftPolicy,
  catalogEntries: readonly SchemaCatalogEntry[],
) {
  const documentationFiles = (
    await Promise.all(
      policy.documentationRoots.map((relativeRoot) =>
        listMarkdownFiles(path.join(repoRoot, relativeRoot)).catch(() => []),
      ),
    )
  )
    .flat()
    .sort();

  const documents = await Promise.all(
    documentationFiles.map(async (filePath) => ({
      filePath,
      content: await readFile(filePath, "utf8"),
    })),
  );

  const bindings = new Map<string, string[]>();
  for (const entry of catalogEntries) {
    const refs = documents
      .filter(
        (document) =>
          document.content.includes(entry.schemaName) || document.content.includes(entry.schemaId),
      )
      .map((document) => documentationRefForPath(document.filePath))
      .sort();
    bindings.set(entry.schemaName, refs);
  }
  return bindings;
}

async function buildBindingCoverageSnapshot(
  sourceMapHash: string,
  policy: SchemaDriftPolicy,
) {
  const report = await readJson<BindingCoverageReport>(bindingCoverageReportPath);
  const familyCoverageByLanguage = Object.fromEntries(
    report.languages.map((language) => [
      language.languageRef,
      language.families.map((family) => family.familyRef).sort(),
    ]),
  ) as Record<string, string[]>;

  const staleLanguageRefs = report.languages
    .filter(() => report.generationBasis.sourceMapHash !== sourceMapHash)
    .map((language) => language.languageRef)
    .sort();

  const missingRequiredLanguageRefs = policy.bindingLanguagesRequired.filter(
    (languageRef) => !Object.hasOwn(familyCoverageByLanguage, languageRef),
  );
  const combinedStale = [...new Set([...staleLanguageRefs, ...missingRequiredLanguageRefs])].sort();

  return {
    generationSourceMapHash: report.generationBasis.sourceMapHash,
    familyCoverageByLanguage,
    staleLanguageRefs: combinedStale,
    stateRef: combinedStale.length === 0 ? "IN_SYNC" : "DRIFT",
  } satisfies BindingCoverageSnapshot;
}

export function deriveReleaseCandidateIdentityHash(
  contract: Omit<ReleaseCandidateIdentityContract, "candidate_identity_hash">,
) {
  return stableHash({
    candidate_environment_ref: contract.candidate_environment_ref,
    build_artifact_ref: contract.build_artifact_ref,
    artifact_digest: contract.artifact_digest,
    schema_bundle_hash: contract.schema_bundle_hash,
    config_bundle_hash: contract.config_bundle_hash,
    migration_plan_ref_or_null: contract.migration_plan_ref_or_null,
    enabled_provider_profile_refs: [...contract.enabled_provider_profile_refs].sort(),
    supported_client_window_ref_or_null: contract.supported_client_window_ref_or_null,
  });
}

export async function buildReleaseCandidateIdentityContract(
  input: {
    configBundleHash: string;
    migrationPlanRefOrNull?: string | null;
    schemaBundleHash: string;
    supportedClientWindowRefOrNull?: string | null;
  },
) {
  const policy = await loadSchemaDriftPolicy();
  const contractWithoutHash = {
    contract_version: "RELEASE_CANDIDATE_IDENTITY_V1",
    candidate_environment_ref: policy.candidateIdentityTemplate.candidateEnvironmentRef,
    build_artifact_ref: policy.candidateIdentityTemplate.buildArtifactRef,
    artifact_digest: stableHash({
      artifact_digest_salt: policy.candidateIdentityTemplate.artifactDigestSalt,
      config_bundle_hash: input.configBundleHash,
      schema_bundle_hash: input.schemaBundleHash,
    }),
    schema_bundle_hash: input.schemaBundleHash,
    config_bundle_hash: input.configBundleHash,
    migration_plan_ref_or_null: input.migrationPlanRefOrNull ?? null,
    enabled_provider_profile_refs: [...policy.candidateIdentityTemplate.providerProfileRefs].sort(),
    supported_client_window_ref_or_null:
      input.supportedClientWindowRefOrNull ??
      policy.candidateIdentityTemplate.supportedClientWindowRefOrNull,
    array_canonicalization_policy: "SORTED_UNIQUE_ARRAY_COMPONENTS_ONLY",
    suite_context_policy: "SUITE_SPECIFIC_DIMENSIONS_MUST_BE_DECLARED_OR_EXPLICITLY_NULL",
    admissibility_binding_policy: "GREEN_GATES_REQUIRE_EXACT_CANDIDATE_BINDING",
  } satisfies Omit<ReleaseCandidateIdentityContract, "candidate_identity_hash">;

  return {
    ...contractWithoutHash,
    candidate_identity_hash: deriveReleaseCandidateIdentityHash(contractWithoutHash),
  } satisfies ReleaseCandidateIdentityContract;
}

export function createSyntheticSchemaArtifactSnapshot(
  input: Partial<SchemaArtifactSnapshot> & {
    document: Record<string, unknown>;
    schemaId: string;
    schemaName: string;
  },
) {
  return {
    schemaName: input.schemaName,
    schemaId: input.schemaId,
    logicalFamilyRef: input.logicalFamilyRef ?? "MANIFEST_AND_RELEASE",
    logicalFamilyLabel: input.logicalFamilyLabel ?? "Manifest & Release",
    sourcePath: input.sourcePath ?? `Algorithm/schemas/${input.schemaName}`,
    destinationPath:
      input.destinationPath ?? `packages/contracts-core/schemas/${input.schemaName}`,
    sourceHash: input.sourceHash ?? stableHash(input.document),
    destinationHash: input.destinationHash ?? stableHash(input.document),
    document: input.document,
    sampleBindings: input.sampleBindings ?? [],
    documentationRefs: input.documentationRefs ?? [],
  } satisfies SchemaArtifactSnapshot;
}

export function createSyntheticSchemaBundleMaterialization(
  input: Partial<SchemaBundleMaterialization> & {
    bundleRef: string;
    bundleRole: "BASELINE" | "CANDIDATE";
    schemas: SchemaArtifactSnapshot[];
  },
) {
  return {
    bundleVersion: "SCHEMA_DRIFT_BUNDLE_V1",
    bundleRole: input.bundleRole,
    bundleRef: input.bundleRef,
    basisStatement: input.basisStatement ?? "Synthetic bundle for schema drift tests.",
    schemaBundleHash:
      input.schemaBundleHash ??
      stableHash(input.schemas.map((entry) => ({ schemaName: entry.schemaName, schemaId: entry.schemaId }))),
    schemaSourceMapHash: input.schemaSourceMapHash ?? stableHash(input.schemas.map((entry) => entry.schemaName)),
    sampleBindingMapHash:
      input.sampleBindingMapHash ??
      stableHash(input.schemas.flatMap((entry) => entry.sampleBindings.map((sample) => sample.sampleName))),
    documentationBindingHash:
      input.documentationBindingHash ??
      stableHash(input.schemas.flatMap((entry) => entry.documentationRefs)),
    generatedBindingSnapshot:
      input.generatedBindingSnapshot ??
      ({
        generationSourceMapHash:
          input.schemaSourceMapHash ?? stableHash(input.schemas.map((entry) => entry.schemaName)),
        familyCoverageByLanguage: {
          TYPESCRIPT: ["MANIFEST_AND_RELEASE"],
          PYTHON: ["MANIFEST_AND_RELEASE"],
          SWIFT: ["MANIFEST_AND_RELEASE"],
        },
        staleLanguageRefs: [],
        stateRef: "IN_SYNC",
      } satisfies BindingCoverageSnapshot),
    schemas: input.schemas,
    sourceLineage: input.sourceLineage ?? [input.bundleRef],
  } satisfies SchemaBundleMaterialization;
}

export async function buildDefaultMigrationReadinessContext() {
  const migrationBundle = await loadMigrationPolicyBundle();
  return {
    currentCatalogEntry: migrationBundle.currentEntry,
    schemaReaderWindowContract: structuredClone(migrationBundle.readerWindowBaseline),
    backfillExecutionContract: structuredClone(migrationBundle.backfillPolicy),
    compatibilityWindowRef: migrationBundle.readerWindowBaseline.compatibility_window_ref,
    historicalProtectedSchemaBundleHashes: [
      ...migrationBundle.readerWindowBaseline.protected_historical_schema_bundle_hashes,
    ],
    supportedReaderSchemaBundleHashes: [
      ...migrationBundle.readerWindowBaseline.supported_reader_schema_bundle_hashes,
    ],
  };
}

export async function buildCurrentSchemaBundleMaterialization(
  input: {
    bundleRef?: string;
    bundleRole?: "BASELINE" | "CANDIDATE";
  } = {},
) {
  const [policy, schemaSourceMapBuffer, sampleBindingMapBuffer] = await Promise.all([
    loadSchemaDriftPolicy(),
    readFile(schemaSourceMapPath),
    readFile(sampleBindingMapPath),
  ]);
  const schemaSourceMap = JSON.parse(schemaSourceMapBuffer.toString("utf8")) as SchemaSourceMap;
  const sampleBindingMap = JSON.parse(sampleBindingMapBuffer.toString("utf8")) as SampleBindingMap;

  const documentationBindings = await buildDocumentationBindingIndex(policy, schemaSourceMap.schemas);
  const schemaSourceMapHash = sha256Hex(schemaSourceMapBuffer);
  const sampleBindingMapHash = sha256Hex(sampleBindingMapBuffer);
  const generatedBindingSnapshot = await buildBindingCoverageSnapshot(schemaSourceMapHash, policy);

  const schemas = await Promise.all(
    schemaCatalog.map(async (entry) => {
      const document = await readJson<Record<string, unknown>>(
        path.join(repoRoot, entry.destinationPath),
      );
      return {
        schemaName: entry.schemaName,
        schemaId: entry.schemaId,
        logicalFamilyRef: entry.logicalFamilyRef,
        logicalFamilyLabel: entry.logicalFamilyLabel,
        sourcePath: entry.sourcePath,
        destinationPath: entry.destinationPath,
        sourceHash: entry.sourceHash,
        destinationHash: entry.destinationHash,
        document,
        sampleBindings: sampleBindingMap.samples
          .filter((sample) => sample.inferredSchemaName === entry.schemaName)
          .map((sample) => ({
            sampleName: sample.sampleName,
            destinationPath: sample.destinationPath,
            destinationHash: sample.destinationHash,
          }))
          .sort((left, right) => left.sampleName.localeCompare(right.sampleName)),
        documentationRefs: documentationBindings.get(entry.schemaName) ?? [],
      } satisfies SchemaArtifactSnapshot;
    }),
  );

  return {
    bundleVersion: "SCHEMA_DRIFT_BUNDLE_V1",
    bundleRole: input.bundleRole ?? "CANDIDATE",
    bundleRef: input.bundleRef ?? policy.comparisonBasis.candidateBundleRef,
    basisStatement: policy.basisStatement,
    schemaBundleHash: computeImportedSchemaBundleHash(),
    schemaSourceMapHash,
    sampleBindingMapHash,
    documentationBindingHash: stableHash(
      schemas.map((entry) => ({
        schemaName: entry.schemaName,
        documentationRefs: entry.documentationRefs,
      })),
    ),
    generatedBindingSnapshot,
    schemas,
    sourceLineage: [
      policy.policyId,
      "packages/contracts-core/data/schema_source_map.json",
      "packages/contracts-core/data/sample_binding_map.json",
      "data/contracts/binding_coverage_report.json",
    ],
  } satisfies SchemaBundleMaterialization;
}
