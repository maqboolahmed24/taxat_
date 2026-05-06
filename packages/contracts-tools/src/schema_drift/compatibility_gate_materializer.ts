import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildCurrentSchemaBundleMaterialization,
  buildDefaultMigrationReadinessContext,
  buildReleaseCandidateIdentityContract,
  loadSchemaDriftPolicy,
  readJson,
  repoRoot,
  stableHash,
  type AtlasScenarioCard,
  type ReleaseCandidateIdentityContract,
  type SchemaBundleMaterialization,
  type SchemaDriftGroupRef,
  type SchemaDriftPhaseRef,
  type SchemaDriftPolicy
} from "./schema_bundle_builder.ts";
import { compareSchemaBundles, summarizeDeltasByGroup, type SchemaDriftDelta } from "./schema_diff_engine.ts";
import {
  evaluateMigrationReadiness,
  type MigrationReadinessContext,
  type MigrationReadinessEvaluation
} from "./migration_readiness_evaluator.ts";

export type CompatibilityGateMaterialization = {
  state: "MATERIALIZED" | "BLOCKED";
  outputPathOrNull: string | null;
  compatibilityGateHashOrNull: string | null;
  reasonCodes: string[];
  contractOrNull: Record<string, unknown> | null;
};

export type SchemaDriftReportArtifact = {
  report_version: "SCHEMA_DRIFT_REPORT_V1";
  report_id: string;
  basis_statement: string;
  baseline_bundle: {
    bundle_ref: string;
    schema_bundle_hash: string;
    schema_source_map_hash: string;
    sample_binding_map_hash: string;
  };
  candidate_bundle: {
    bundle_ref: string;
    schema_bundle_hash: string;
    schema_source_map_hash: string;
    sample_binding_map_hash: string;
  };
  historical_protected_window: {
    compatibility_window_ref: string;
    writer_schema_bundle_hash: string;
    supported_reader_schema_bundle_hashes: string[];
    protected_historical_schema_bundle_hashes: string[];
  };
  candidate_identity_contract: ReleaseCandidateIdentityContract;
  readiness_verdict: {
    verdict_ref: string;
    admissibility_state: string;
    rollback_boundary_state: "ROLLBACK_ALLOWED" | "FAIL_FORWARD_ONLY";
    destructive_contract_state: "BLOCKED_UNTIL_WINDOW_CLOSE" | "ELIGIBLE_AFTER_WINDOW_CLOSE";
    reason_codes: string[];
    blocking_delta_refs: string[];
    recommended_actions: Array<{
      action_ref: string;
      summary: string;
      required_artifact_refs: string[];
    }>;
  };
  drift_summary: {
    total_delta_count: number;
    blocking_delta_count: number;
    counts_by_group: Record<SchemaDriftGroupRef, number>;
  };
  parity_state: {
    documentation_state: "IN_SYNC" | "DRIFT";
    generated_binding_state: "IN_SYNC" | "DRIFT";
    sample_binding_state: "IN_SYNC" | "DRIFT";
  };
  deltas: Array<{
    delta_ref: string;
    atlas_group_ref: SchemaDriftGroupRef;
    severity_ref: string;
    phase_ref: SchemaDriftPhaseRef;
    schema_name: string;
    schema_path: string;
    summary: string;
    readiness_impact_ref: string;
    migration_requirement: string;
    sealed_manifest_impact: boolean;
    reason_codes: string[];
    affected_artifacts: string[];
    baseline_value_or_null: string | null;
    candidate_value_or_null: string | null;
    source_lineage: string[];
  }>;
  compatibility_gate_materialization: CompatibilityGateMaterialization;
  source_lineage: string[];
};

export type SchemaCompatibilityAtlasPayload = {
  routeId: string;
  title: string;
  subtitle: string;
  basisStatement: string;
  currentVerdictChip: string;
  candidateHashBadge: string;
  baselineHashBadge: string;
  readerWindowChip: string;
  dataMode: "ACTUAL_DELTAS" | "CANONICAL_SCENARIOS";
  severityGroups: Array<{
    groupRef: SchemaDriftGroupRef;
    label: string;
    count: number;
    tone: "success" | "warning" | "danger" | "slate";
    summary: string;
  }>;
  chronologyPhases: Array<{
    phaseRef: SchemaDriftPhaseRef;
    label: string;
    summary: string;
    accessibleLabel: string;
  }>;
  diffCards: Array<{
    deltaRef: string;
    groupRef: SchemaDriftGroupRef;
    phaseRef: SchemaDriftPhaseRef;
    tone: "success" | "warning" | "danger" | "slate";
    accessibleLabel: string;
    summary: string;
    schemaPath: string;
    readinessImpact: string;
    rollbackBoundary: "ROLLBACK_ALLOWED" | "FAIL_FORWARD_ONLY";
    reasonCodes: string[];
    requiredArtifactRefs: string[];
    inspectorBody: string;
  }>;
  selectedGroupRef: SchemaDriftGroupRef;
  selectedPhaseRef: SchemaDriftPhaseRef;
  selectedDeltaRef: string;
};

type SchemaDriftReportSchema = {
  required?: string[];
  properties?: Record<string, unknown>;
  title?: string;
  type?: string;
};

const reportSchemaPath = path.join(repoRoot, "schemas", "schema_drift_report.schema.json");
const reportOutputPath = path.join(repoRoot, "data", "contracts", "schema_drift_report.json");
const compatibilityGateOutputPath = path.join(
  repoRoot,
  "data",
  "contracts",
  "schema_bundle_compatibility_gate.materialized.json",
);
const atlasDataPath = path.join(
  repoRoot,
  "apps",
  "operator-web",
  "public",
  "internal",
  "schema-compatibility-atlas",
  "data",
  "schema-compatibility-atlas.json",
);

function canonicalRows(contract: Record<string, unknown>, fieldName: string) {
  const value = contract[fieldName];
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string").sort()
    : [];
}

export function deriveSchemaBundleCompatibilityGateHash(
  contract: Record<string, unknown>,
) {
  const readerWindowContract =
    contract.schema_reader_window_contract && typeof contract.schema_reader_window_contract === "object"
      ? (contract.schema_reader_window_contract as Record<string, unknown>)
      : null;
  if (!readerWindowContract) {
    return null;
  }

  const requiredFields = {
    contract_version: contract.contract_version,
    candidate_identity_hash: contract.candidate_identity_hash,
    schema_bundle_hash: contract.schema_bundle_hash,
    compatibility_window_ref: contract.compatibility_window_ref,
    reader_window_state: contract.reader_window_state,
    historical_manifest_guard_state: contract.historical_manifest_guard_state,
    replay_restore_guard_state: contract.replay_restore_guard_state,
    native_client_window_state: contract.native_client_window_state,
    migration_chronology_state: contract.migration_chronology_state,
    destructive_contract_state: contract.destructive_contract_state,
    rollback_boundary_state: contract.rollback_boundary_state,
    historical_manifest_policy: contract.historical_manifest_policy,
    destructive_change_policy: contract.destructive_change_policy,
    rollback_boundary_policy: contract.rollback_boundary_policy,
    fail_forward_policy: contract.fail_forward_policy,
    replay_restore_policy: contract.replay_restore_policy,
    client_persistence_policy: contract.client_persistence_policy,
    evidence_binding_policy: contract.evidence_binding_policy,
    writer_schema_bundle_hash: readerWindowContract.writer_schema_bundle_hash,
  };

  if (
    Object.values(requiredFields).some((value) => typeof value !== "string" || value.length === 0)
  ) {
    return null;
  }

  return stableHash({
    contract_version: requiredFields.contract_version,
    candidate_identity_hash: requiredFields.candidate_identity_hash,
    schema_bundle_hash: requiredFields.schema_bundle_hash,
    compatibility_window_ref: requiredFields.compatibility_window_ref,
    reader_window_state: requiredFields.reader_window_state,
    migration_plan_ref_or_null: contract.migration_plan_ref_or_null ?? null,
    migration_ledger_refs: canonicalRows(contract, "migration_ledger_refs"),
    supported_client_window_ref_or_null: contract.supported_client_window_ref_or_null ?? null,
    historical_manifest_guard_state: requiredFields.historical_manifest_guard_state,
    replay_restore_guard_state: requiredFields.replay_restore_guard_state,
    native_client_window_state: requiredFields.native_client_window_state,
    migration_chronology_state: requiredFields.migration_chronology_state,
    destructive_contract_state: requiredFields.destructive_contract_state,
    rollback_boundary_state: requiredFields.rollback_boundary_state,
    reason_codes: canonicalRows(contract, "reason_codes"),
    writer_schema_bundle_hash: requiredFields.writer_schema_bundle_hash,
    supported_reader_schema_bundle_hashes: canonicalRows(
      readerWindowContract,
      "supported_reader_schema_bundle_hashes",
    ),
    protected_historical_schema_bundle_hashes: canonicalRows(
      readerWindowContract,
      "protected_historical_schema_bundle_hashes",
    ),
    historical_manifest_policy: requiredFields.historical_manifest_policy,
    destructive_change_policy: requiredFields.destructive_change_policy,
    rollback_boundary_policy: requiredFields.rollback_boundary_policy,
    fail_forward_policy: requiredFields.fail_forward_policy,
    replay_restore_policy: requiredFields.replay_restore_policy,
    client_persistence_policy: requiredFields.client_persistence_policy,
    evidence_binding_policy: requiredFields.evidence_binding_policy,
  });
}

export async function loadSchemaDriftReportSchema() {
  return readJson<SchemaDriftReportSchema>(reportSchemaPath);
}

function validateSchemaDriftReportArtifact(
  schema: SchemaDriftReportSchema,
  report: SchemaDriftReportArtifact,
) {
  if (schema.type !== "object") {
    throw new Error("schema drift report schema must describe an object");
  }
  if (schema.title !== "SchemaDriftReport") {
    throw new Error("unexpected schema drift report schema title");
  }
  const requiredKeys = new Set(schema.required ?? []);
  for (const key of [
    "report_version",
    "report_id",
    "baseline_bundle",
    "candidate_bundle",
    "historical_protected_window",
    "candidate_identity_contract",
    "readiness_verdict",
    "drift_summary",
    "parity_state",
    "deltas",
    "compatibility_gate_materialization",
    "source_lineage",
  ]) {
    if (!requiredKeys.has(key)) {
      throw new Error(`schema drift report schema must require ${key}`);
    }
  }
  if (report.report_version !== "SCHEMA_DRIFT_REPORT_V1") {
    throw new Error("schema drift report version drifted");
  }
}

function mapDeltaToArtifact(delta: SchemaDriftDelta) {
  return {
    delta_ref: delta.deltaRef,
    atlas_group_ref: delta.atlasGroupRef,
    severity_ref: delta.severityRef,
    phase_ref: delta.phaseRef,
    schema_name: delta.schemaName,
    schema_path: delta.schemaPath,
    summary: delta.summary,
    readiness_impact_ref: delta.readinessImpactRef,
    migration_requirement: delta.migrationRequirement,
    sealed_manifest_impact: delta.sealedManifestImpact,
    reason_codes: delta.reasonCodes,
    affected_artifacts: delta.affectedArtifacts,
    baseline_value_or_null: delta.baselineValueOrNull,
    candidate_value_or_null: delta.candidateValueOrNull,
    source_lineage: delta.sourceLineage,
  };
}

function createMigrationGapDelta(input: {
  context: MigrationReadinessContext;
  diffCode:
    | "MIGRATION_LEDGER_MISSING"
    | "BACKFILL_EXECUTION_CONTRACT_INCOMPLETE"
    | "READER_WINDOW_STILL_OPEN"
    | "SUPPORTED_CLIENT_WINDOW_REF_MISMATCH";
}) {
  const sharedLineage = [
    input.context.currentCatalogEntry.migrationId,
    "config/migrations/schema_bundle_version_catalog.json",
    "config/migrations/schema_reader_window_baseline.json",
    "config/migrations/backfill_execution_policy.json",
    "config/contracts/schema_drift_policy.json",
  ];

  switch (input.diffCode) {
    case "MIGRATION_LEDGER_MISSING":
      return {
        deltaRef: stableHash({
          diffCode: input.diffCode,
          migrationId: input.context.currentCatalogEntry.migrationId,
        }),
        atlasGroupRef: "MIGRATION_GAP",
        severityRef: "BLOCKING",
        phaseRef: "EXPAND",
        diffCode: input.diffCode,
        schemaName: "schema_bundle",
        schemaPath: "schema_bundle#/migration_plan_ref_or_null",
        summary:
          "Schema drift requires a numbered migration ledger before the candidate can be admitted.",
        readinessImpactRef: "BLOCKING",
        migrationRequirement: "MIGRATION_LEDGER_REQUIRED",
        sealedManifestImpact: false,
        reasonCodes: [input.diffCode],
        affectedArtifacts: [
          "config/migrations/schema_bundle_version_catalog.json",
          "packages/control-plane-db/src/migrations",
        ],
        baselineValueOrNull: input.context.currentCatalogEntry.migrationId,
        candidateValueOrNull: null,
        sourceLineage: sharedLineage,
      } satisfies SchemaDriftDelta;
    case "BACKFILL_EXECUTION_CONTRACT_INCOMPLETE":
      return {
        deltaRef: stableHash({
          diffCode: input.diffCode,
          executionState: input.context.backfillExecutionContract.execution_state,
        }),
        atlasGroupRef: "MIGRATION_GAP",
        severityRef: "BLOCKING",
        phaseRef: "BACKFILL",
        diffCode: input.diffCode,
        schemaName: "schema_bundle",
        schemaPath: "schema_bundle#/backfill_execution_contract",
        summary:
          "A required backfill contract is missing or incomplete, so historical meaning cannot be trusted yet.",
        readinessImpactRef: "BLOCKING",
        migrationRequirement: "BACKFILL_REQUIRED",
        sealedManifestImpact: false,
        reasonCodes: [input.diffCode],
        affectedArtifacts: ["config/migrations/backfill_execution_policy.json"],
        baselineValueOrNull: input.context.backfillExecutionContract.execution_state,
        candidateValueOrNull: "COMPLETE",
        sourceLineage: sharedLineage,
      } satisfies SchemaDriftDelta;
    case "READER_WINDOW_STILL_OPEN":
      return {
        deltaRef: stableHash({
          diffCode: input.diffCode,
          windowState: input.context.schemaReaderWindowContract.window_state,
        }),
        atlasGroupRef: "MIGRATION_GAP",
        severityRef: "BLOCKING",
        phaseRef: "VERIFY",
        diffCode: input.diffCode,
        schemaName: "schema_bundle",
        schemaPath: "schema_bundle#/schema_reader_window_contract/window_state",
        summary:
          "The compatibility window is still open, so destructive or narrowing drift remains blocked by default.",
        readinessImpactRef: "BLOCKING",
        migrationRequirement: "READER_WINDOW_CLOSE_REQUIRED",
        sealedManifestImpact: false,
        reasonCodes: [input.diffCode],
        affectedArtifacts: ["config/migrations/schema_reader_window_baseline.json"],
        baselineValueOrNull: input.context.schemaReaderWindowContract.window_state,
        candidateValueOrNull: "CONTRACT_ELIGIBLE_WINDOW_CLOSED",
        sourceLineage: sharedLineage,
      } satisfies SchemaDriftDelta;
    case "SUPPORTED_CLIENT_WINDOW_REF_MISMATCH":
      return {
        deltaRef: stableHash({
          diffCode: input.diffCode,
          compatibilityWindowRef: input.context.compatibilityWindowRef,
        }),
        atlasGroupRef: "MIGRATION_GAP",
        severityRef: "BLOCKING",
        phaseRef: "VERIFY",
        diffCode: input.diffCode,
        schemaName: "schema_bundle",
        schemaPath: "schema_bundle#/supported_client_window_ref_or_null",
        summary:
          "The candidate identity is bound to a client window that does not match the governed compatibility posture.",
        readinessImpactRef: "BLOCKING",
        migrationRequirement: "NONE",
        sealedManifestImpact: false,
        reasonCodes: [input.diffCode],
        affectedArtifacts: [
          "packages/contracts-core/schemas/release_candidate_identity_contract.schema.json",
          "config/contracts/schema_drift_policy.json",
        ],
        baselineValueOrNull: null,
        candidateValueOrNull: "unsupported-client-window",
        sourceLineage: sharedLineage,
      } satisfies SchemaDriftDelta;
  }
}

function createMigrationGapDeltas(input: {
  context: MigrationReadinessContext;
  evaluation: MigrationReadinessEvaluation;
}) {
  return input.evaluation.reasonCodes
    .filter((reasonCode) =>
      [
        "MIGRATION_LEDGER_MISSING",
        "BACKFILL_EXECUTION_CONTRACT_INCOMPLETE",
        "READER_WINDOW_STILL_OPEN",
        "SUPPORTED_CLIENT_WINDOW_REF_MISMATCH",
      ].includes(reasonCode),
    )
    .map((reasonCode) =>
      createMigrationGapDelta({
        context: input.context,
        // Narrowed by the filter list above.
        diffCode: reasonCode as
          | "MIGRATION_LEDGER_MISSING"
          | "BACKFILL_EXECUTION_CONTRACT_INCOMPLETE"
          | "READER_WINDOW_STILL_OPEN"
          | "SUPPORTED_CLIENT_WINDOW_REF_MISMATCH",
      }),
    );
}

function materializeCompatibilityGateContract(input: {
  candidateIdentity: ReleaseCandidateIdentityContract;
  context: MigrationReadinessContext;
  evaluation: MigrationReadinessEvaluation;
}) {
  const { candidateIdentity, context, evaluation } = input;
  const contract = {
    contract_version: "SCHEMA_BUNDLE_COMPATIBILITY_GATE_V1",
    compatibility_gate_hash: "",
    candidate_identity_hash: candidateIdentity.candidate_identity_hash,
    candidate_identity_contract: candidateIdentity,
    schema_bundle_hash: candidateIdentity.schema_bundle_hash,
    compatibility_window_ref: context.compatibilityWindowRef,
    reader_window_state: context.schemaReaderWindowContract.window_state,
    schema_reader_window_contract: context.schemaReaderWindowContract,
    migration_plan_ref_or_null: evaluation.migrationPlanRefOrNull,
    migration_ledger_refs: evaluation.migrationLedgerRefs,
    supported_client_window_ref_or_null: candidateIdentity.supported_client_window_ref_or_null,
    historical_manifest_guard_state: evaluation.historicalManifestGuardState,
    replay_restore_guard_state: evaluation.replayRestoreGuardState,
    native_client_window_state: evaluation.nativeClientWindowState,
    migration_chronology_state: evaluation.migrationChronologyState,
    destructive_contract_state: evaluation.destructiveContractState,
    rollback_boundary_state: evaluation.rollbackBoundaryState,
    reason_codes: evaluation.reasonCodes,
    historical_manifest_policy:
      context.schemaReaderWindowContract.historical_manifest_policy,
    destructive_change_policy: context.schemaReaderWindowContract.destructive_change_policy,
    rollback_boundary_policy: context.schemaReaderWindowContract.rollback_boundary_policy,
    fail_forward_policy: context.schemaReaderWindowContract.fail_forward_policy,
    replay_restore_policy: context.schemaReaderWindowContract.replay_restore_policy,
    client_persistence_policy:
      "SERVER_SCHEMA_GATE_REQUIRES_SUPPORTED_CLIENT_WINDOW_COMPATIBILITY",
    evidence_binding_policy:
      "EXACT_CANDIDATE_READER_WINDOW_AND_CLIENT_WINDOW_BINDING_REQUIRED",
  } as Record<string, unknown>;
  const compatibilityGateHash = deriveSchemaBundleCompatibilityGateHash(contract);
  if (!compatibilityGateHash) {
    throw new Error("unable to derive schema bundle compatibility gate hash");
  }
  contract.compatibility_gate_hash = compatibilityGateHash;
  return contract;
}

function materializeCompatibilityGate(input: {
  candidateIdentity: ReleaseCandidateIdentityContract;
  context: MigrationReadinessContext;
  evaluation: MigrationReadinessEvaluation;
}) {
  if (input.evaluation.admissibilityState !== "ADMISSIBLE") {
    return {
      state: "BLOCKED",
      outputPathOrNull: null,
      compatibilityGateHashOrNull: null,
      reasonCodes: input.evaluation.reasonCodes,
      contractOrNull: null,
    } satisfies CompatibilityGateMaterialization;
  }

  const contract = materializeCompatibilityGateContract(input);
  return {
    state: "MATERIALIZED",
    outputPathOrNull: "data/contracts/schema_bundle_compatibility_gate.materialized.json",
    compatibilityGateHashOrNull: String(contract.compatibility_gate_hash),
    reasonCodes: input.evaluation.reasonCodes,
    contractOrNull: contract,
  } satisfies CompatibilityGateMaterialization;
}

export function createSchemaDriftReportArtifact(input: {
  baselineBundle: SchemaBundleMaterialization;
  candidateBundle: SchemaBundleMaterialization;
  context: MigrationReadinessContext;
  evaluation: MigrationReadinessEvaluation;
  compatibilityGateMaterialization: CompatibilityGateMaterialization;
  candidateIdentity: ReleaseCandidateIdentityContract;
  deltas: SchemaDriftDelta[];
  policy: SchemaDriftPolicy;
}) {
  const blockingDeltaRefs = [...new Set([
    ...input.evaluation.blockingDeltaRefs,
    ...input.deltas
      .filter((delta) => delta.severityRef === "BLOCKING")
      .map((delta) => delta.deltaRef),
  ])];

  const report = {
    report_version: "SCHEMA_DRIFT_REPORT_V1",
    report_id: "schema_drift_report.current_repo",
    basis_statement: input.policy.basisStatement,
    baseline_bundle: {
      bundle_ref: input.baselineBundle.bundleRef,
      schema_bundle_hash: input.baselineBundle.schemaBundleHash,
      schema_source_map_hash: input.baselineBundle.schemaSourceMapHash,
      sample_binding_map_hash: input.baselineBundle.sampleBindingMapHash,
    },
    candidate_bundle: {
      bundle_ref: input.candidateBundle.bundleRef,
      schema_bundle_hash: input.candidateBundle.schemaBundleHash,
      schema_source_map_hash: input.candidateBundle.schemaSourceMapHash,
      sample_binding_map_hash: input.candidateBundle.sampleBindingMapHash,
    },
    historical_protected_window: {
      compatibility_window_ref: input.context.compatibilityWindowRef,
      writer_schema_bundle_hash: input.context.schemaReaderWindowContract.writer_schema_bundle_hash,
      supported_reader_schema_bundle_hashes: [
        ...input.context.supportedReaderSchemaBundleHashes,
      ],
      protected_historical_schema_bundle_hashes: [
        ...input.context.historicalProtectedSchemaBundleHashes,
      ],
    },
    candidate_identity_contract: input.candidateIdentity,
    readiness_verdict: {
      verdict_ref: input.evaluation.verdictRef,
      admissibility_state: input.evaluation.admissibilityState,
      rollback_boundary_state: input.evaluation.rollbackBoundaryState,
      destructive_contract_state: input.evaluation.destructiveContractState,
      reason_codes: input.evaluation.reasonCodes,
      blocking_delta_refs: blockingDeltaRefs,
      recommended_actions: input.evaluation.recommendedActions.map((action) => ({
        action_ref: action.actionRef,
        summary: action.summary,
        required_artifact_refs: action.requiredArtifactRefs,
      })),
    },
    drift_summary: {
      total_delta_count: input.deltas.length,
      blocking_delta_count: input.deltas.filter((delta) => delta.severityRef === "BLOCKING").length,
      counts_by_group: summarizeDeltasByGroup(input.deltas),
    },
    parity_state: {
      documentation_state: input.deltas.some((delta) => delta.diffCode === "DOC_TOKEN_STALE")
        ? "DRIFT"
        : "IN_SYNC",
      generated_binding_state:
        input.candidateBundle.generatedBindingSnapshot.stateRef === "DRIFT" ? "DRIFT" : "IN_SYNC",
      sample_binding_state: input.deltas.some((delta) => delta.diffCode === "SAMPLE_BINDING_DRIFT")
        ? "DRIFT"
        : "IN_SYNC",
    },
    deltas: input.deltas.map(mapDeltaToArtifact),
    compatibility_gate_materialization: input.compatibilityGateMaterialization,
    source_lineage: [
      ...input.baselineBundle.sourceLineage,
      ...input.candidateBundle.sourceLineage,
      input.context.currentCatalogEntry.migrationId,
      "config/migrations/schema_reader_window_baseline.json",
      "config/migrations/backfill_execution_policy.json",
    ],
  } satisfies SchemaDriftReportArtifact;

  return report;
}

function atlasGroupSummary(groupRef: SchemaDriftGroupRef) {
  switch (groupRef) {
    case "ADDITIVE":
      return "Optional widening or new surfaces that preserve current readers by default.";
    case "NARROWING":
      return "Changes that reject formerly valid values or readers without an explicit safety window.";
    case "DESTRUCTIVE":
      return "Removal, re-typing, or sealed-path changes that cannot be assumed rollback-safe.";
    case "DOC_DRIFT":
      return "Schema, sample, or documentation parity drift that blocks trustworthy contract evidence.";
    case "BINDING_DRIFT":
      return "Generated binding artifacts are stale relative to the current schema bundle.";
    case "MIGRATION_GAP":
      return "Migration ledgers, backfill posture, or compatibility windows are missing or incomplete.";
  }
}

function atlasTone(groupRef: SchemaDriftGroupRef) {
  switch (groupRef) {
    case "ADDITIVE":
      return "success";
    case "DOC_DRIFT":
      return "warning";
    case "BINDING_DRIFT":
      return "warning";
    case "NARROWING":
      return "danger";
    case "DESTRUCTIVE":
      return "danger";
    case "MIGRATION_GAP":
      return "danger";
  }
}

function mapDeltaToAtlasCard(delta: SchemaDriftDelta) {
  return {
    deltaRef: delta.deltaRef,
    groupRef: delta.atlasGroupRef,
    phaseRef: delta.phaseRef,
    tone: atlasTone(delta.atlasGroupRef),
    accessibleLabel: `${delta.summary.toLowerCase()}`,
    summary: delta.summary,
    schemaPath: delta.schemaPath,
    readinessImpact: delta.readinessImpactRef,
    rollbackBoundary: delta.sealedManifestImpact ? "FAIL_FORWARD_ONLY" : "ROLLBACK_ALLOWED",
    reasonCodes: delta.reasonCodes,
    requiredArtifactRefs: delta.affectedArtifacts,
    inspectorBody: [
      `Schema path: ${delta.schemaPath}`,
      `Severity: ${delta.severityRef}`,
      `Reason codes: ${delta.reasonCodes.join(", ")}`,
    ].join(" "),
  };
}

function mapScenarioToAtlasCard(scenario: AtlasScenarioCard) {
  return {
    deltaRef: scenario.scenario_ref,
    groupRef: scenario.atlas_group_ref,
    phaseRef: scenario.phase_ref,
    tone: scenario.tone,
    accessibleLabel: scenario.accessible_label,
    summary: scenario.summary,
    schemaPath: scenario.schema_path,
    readinessImpact: scenario.verdict_ref,
    rollbackBoundary: scenario.rollback_boundary,
    reasonCodes: scenario.reason_codes,
    requiredArtifactRefs: scenario.required_artifact_refs,
    inspectorBody: scenario.inspector_body,
  };
}

export function createSchemaCompatibilityAtlasPayload(input: {
  policy: SchemaDriftPolicy;
  report: SchemaDriftReportArtifact;
  deltas: SchemaDriftDelta[];
}) {
  const dataMode = input.deltas.length === 0 ? "CANONICAL_SCENARIOS" : "ACTUAL_DELTAS";
  const cards =
    dataMode === "ACTUAL_DELTAS"
      ? input.deltas.map(mapDeltaToAtlasCard)
      : input.policy.atlasScenarioCatalog.map(mapScenarioToAtlasCard);
  const selectedCard = cards[0];

  return {
    routeId: "schema-compatibility-atlas",
    title: "Taxat Schema Compatibility Atlas",
    subtitle:
      "Inspect deterministic schema drift, migration chronology posture, compatibility windows, and release admissibility without re-deriving source analysis in the browser.",
    basisStatement: input.policy.basisStatement,
    currentVerdictChip: input.report.readiness_verdict.verdict_ref.replaceAll("_", " "),
    candidateHashBadge: input.report.candidate_bundle.schema_bundle_hash.slice(0, 12),
    baselineHashBadge: input.report.baseline_bundle.schema_bundle_hash.slice(0, 12),
    readerWindowChip: input.report.historical_protected_window.compatibility_window_ref,
    dataMode,
    severityGroups: (
      [
        "ADDITIVE",
        "NARROWING",
        "DESTRUCTIVE",
        "DOC_DRIFT",
        "BINDING_DRIFT",
        "MIGRATION_GAP",
      ] satisfies SchemaDriftGroupRef[]
    ).map((groupRef) => ({
      groupRef,
      label: groupRef.replaceAll("_", " "),
      count: cards.filter((card) => card.groupRef === groupRef).length,
      tone: atlasTone(groupRef),
      summary: atlasGroupSummary(groupRef),
    })),
    chronologyPhases: [
      {
        phaseRef: "EXPAND",
        label: "Expand",
        summary: "Pre-destructive widening and reader-safe shape additions.",
        accessibleLabel: "Chronology phase expand",
      },
      {
        phaseRef: "BACKFILL",
        label: "Backfill",
        summary: "Data rewrites and idempotent derivations needed before verification.",
        accessibleLabel: "Chronology phase backfill",
      },
      {
        phaseRef: "VERIFY",
        label: "Verify",
        summary: "Reader-window and candidate-admissibility checks before contract.",
        accessibleLabel: "Chronology phase verify",
      },
      {
        phaseRef: "CONTRACT",
        label: "Contract",
        summary: "Post-window cleanup where rollback may already be fail-forward only.",
        accessibleLabel: "Chronology phase contract",
      },
    ],
    diffCards: cards,
    selectedGroupRef: selectedCard?.groupRef ?? "ADDITIVE",
    selectedPhaseRef: selectedCard?.phaseRef ?? "EXPAND",
    selectedDeltaRef: selectedCard?.deltaRef ?? "no-delta",
  } satisfies SchemaCompatibilityAtlasPayload;
}

export async function buildMigrationReadinessArtifacts() {
  const [policy, baselineBundle, context] = await Promise.all([
    loadSchemaDriftPolicy(),
    buildCurrentSchemaBundleMaterialization({
      bundleRef: "schema_bundle_catalog.current_imported_baseline",
      bundleRole: "BASELINE",
    }),
    buildDefaultMigrationReadinessContext(),
  ]);
  const configBundleHash = stableHash({
    backfill_execution_policy: context.backfillExecutionContract,
    schema_drift_policy: policy,
    schema_reader_window_contract: context.schemaReaderWindowContract,
    schema_version_entry: context.currentCatalogEntry,
  });
  const candidateIdentity = await buildReleaseCandidateIdentityContract({
    configBundleHash,
    migrationPlanRefOrNull: null,
    schemaBundleHash: baselineBundle.schemaBundleHash,
  });
  const candidateBundle = await buildCurrentSchemaBundleMaterialization({
    bundleRef: policy.comparisonBasis.candidateBundleRef,
    bundleRole: "CANDIDATE",
  });
  const diffResult = compareSchemaBundles({
    baselineBundle,
    candidateBundle,
    policy,
  });
  const evaluation = evaluateMigrationReadiness({
    candidateIdentity,
    context,
    diffResult,
    policy,
  });
  const migrationGapDeltas = createMigrationGapDeltas({
    context,
    evaluation,
  });
  const combinedDeltas = [...diffResult.deltas, ...migrationGapDeltas].sort((left, right) =>
    left.schemaPath.localeCompare(right.schemaPath),
  );
  const compatibilityGateMaterialization = materializeCompatibilityGate({
    candidateIdentity,
    context,
    evaluation,
  });
  const report = createSchemaDriftReportArtifact({
    baselineBundle,
    candidateBundle,
    context,
    evaluation,
    compatibilityGateMaterialization,
    candidateIdentity,
    deltas: combinedDeltas,
    policy,
  });
  const atlasPayload = createSchemaCompatibilityAtlasPayload({
    policy,
    report,
    deltas: combinedDeltas,
  });
  const reportSchema = await loadSchemaDriftReportSchema();
  validateSchemaDriftReportArtifact(reportSchema, report);

  return {
    atlasPayload,
    candidateIdentity,
    compatibilityGateMaterialization,
    diffResult,
    evaluation,
    policy,
    report,
  };
}

async function writeArtifact(filePath: string, payload: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function checkArtifact(filePath: string, payload: unknown, label: string) {
  const current = await readFile(filePath, "utf8");
  const next = `${JSON.stringify(payload, null, 2)}\n`;
  if (current !== next) {
    throw new Error(`${label} is out of sync. Run --emit.`);
  }
}

export async function emitOrCheckMigrationReadinessArtifacts(mode: "emit" | "check") {
  const artifacts = await buildMigrationReadinessArtifacts();
  if (mode === "emit") {
    await writeArtifact(reportOutputPath, artifacts.report);
    if (artifacts.compatibilityGateMaterialization.contractOrNull) {
      await writeArtifact(
        compatibilityGateOutputPath,
        artifacts.compatibilityGateMaterialization.contractOrNull,
      );
    }
    await writeArtifact(atlasDataPath, artifacts.atlasPayload);
  } else {
    await checkArtifact(reportOutputPath, artifacts.report, "schema drift report");
    if (artifacts.compatibilityGateMaterialization.contractOrNull) {
      await checkArtifact(
        compatibilityGateOutputPath,
        artifacts.compatibilityGateMaterialization.contractOrNull,
        "schema bundle compatibility gate artifact",
      );
    }
    await checkArtifact(atlasDataPath, artifacts.atlasPayload, "schema compatibility atlas data");
  }

  return artifacts;
}
