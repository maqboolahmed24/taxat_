export {
  assert,
  buildCurrentSchemaBundleMaterialization,
  buildDefaultMigrationReadinessContext,
  buildReleaseCandidateIdentityContract,
  createSyntheticSchemaArtifactSnapshot,
  createSyntheticSchemaBundleMaterialization,
  deriveReleaseCandidateIdentityHash,
  loadSchemaDriftPolicy,
  repoRoot,
  stableHash,
  type AtlasScenarioCard,
  type BindingCoverageSnapshot,
  type GeneratedBindingStateRef,
  type ReleaseCandidateIdentityContract,
  type SchemaArtifactSnapshot,
  type SchemaBundleMaterialization,
  type SchemaDriftGroupRef,
  type SchemaDriftPhaseRef,
  type SchemaDriftPolicy,
  type SchemaDriftSeverityRef
} from "./schema_drift/schema_bundle_builder.ts";
export {
  compareSchemaBundles,
  summarizeDeltasByGroup,
  type SchemaDriftDelta,
  type SchemaDriftDiffResult,
  type SchemaDriftReasonCode
} from "./schema_drift/schema_diff_engine.ts";
export {
  evaluateMigrationReadiness,
  type MigrationReadinessContext,
  type MigrationReadinessEvaluation,
  type MigrationReadinessRecommendedAction,
  type ReadinessAdmissibilityState,
  type ReadinessVerdictRef
} from "./schema_drift/migration_readiness_evaluator.ts";
export {
  buildMigrationReadinessArtifacts,
  createSchemaCompatibilityAtlasPayload,
  createSchemaDriftReportArtifact,
  deriveSchemaBundleCompatibilityGateHash,
  emitOrCheckMigrationReadinessArtifacts,
  loadSchemaDriftReportSchema,
  type CompatibilityGateMaterialization,
  type SchemaCompatibilityAtlasPayload,
  type SchemaDriftReportArtifact
} from "./schema_drift/compatibility_gate_materializer.ts";
