import {
  buildDefaultMigrationReadinessContext,
  type ReleaseCandidateIdentityContract,
  type SchemaDriftPolicy
} from "./schema_bundle_builder.ts";
import type { BackfillExecutionContract, SchemaBundleVersionEntry, SchemaReaderWindowContract } from "../../../control-plane-db/src/index.ts";
import type { SchemaDriftDelta, SchemaDriftDiffResult } from "./schema_diff_engine.ts";

export type ReadinessVerdictRef =
  | "ROLLBACK_SAFE"
  | "FAIL_FORWARD_ONLY"
  | "BLOCKED_PENDING_BACKFILL"
  | "BLOCKED_PENDING_READER_WINDOW"
  | "BLOCKED_PENDING_MIGRATION_LEDGER"
  | "BLOCKED_PENDING_DOC_SYNC"
  | "BLOCKED_PENDING_BINDING_REGEN"
  | "BLOCKED_PENDING_CLIENT_WINDOW";

export type ReadinessAdmissibilityState = "ADMISSIBLE" | "BLOCKED";

export type MigrationReadinessRecommendedAction = {
  actionRef: string;
  summary: string;
  requiredArtifactRefs: string[];
};

export type MigrationReadinessContext = Awaited<
  ReturnType<typeof buildDefaultMigrationReadinessContext>
>;

export type MigrationReadinessEvaluation = {
  verdictRef: ReadinessVerdictRef;
  admissibilityState: ReadinessAdmissibilityState;
  rollbackBoundaryState: "ROLLBACK_ALLOWED" | "FAIL_FORWARD_ONLY";
  destructiveContractState: "BLOCKED_UNTIL_WINDOW_CLOSE" | "ELIGIBLE_AFTER_WINDOW_CLOSE";
  historicalManifestGuardState: "PROTECTED" | "BLOCKED";
  replayRestoreGuardState: "PROTECTED" | "BLOCKED";
  nativeClientWindowState: "NOT_APPLICABLE" | "VERIFIED_COMPATIBLE" | "BLOCKED";
  migrationChronologyState:
    | "NOT_REQUIRED"
    | "EXPAND_ONLY"
    | "BACKFILL_IN_PROGRESS"
    | "VERIFIED_PREVIOUS_READERS_SUPPORTED"
    | "CONTRACT_WINDOW_CLOSED";
  migrationPlanRefOrNull: string | null;
  migrationLedgerRefs: string[];
  blockingDeltaRefs: string[];
  reasonCodes: string[];
  recommendedActions: MigrationReadinessRecommendedAction[];
};

function includesBlockingGroup(delta: SchemaDriftDelta) {
  return delta.atlasGroupRef === "DESTRUCTIVE" || delta.atlasGroupRef === "NARROWING";
}

function needsReaderWindowClosure(delta: SchemaDriftDelta) {
  return (
    delta.migrationRequirement === "READER_WINDOW_CLOSE_REQUIRED" ||
    delta.readinessImpactRef === "FAIL_FORWARD_ONLY"
  );
}

function needsBackfill(delta: SchemaDriftDelta) {
  return delta.migrationRequirement === "BACKFILL_REQUIRED";
}

function needsMigrationLedger(delta: SchemaDriftDelta) {
  return delta.migrationRequirement !== "NONE";
}

function migrationChronologyState(
  readerWindow: SchemaReaderWindowContract,
  backfill: BackfillExecutionContract | null,
  requiresMigration: boolean,
) {
  if (!requiresMigration) {
    return "NOT_REQUIRED" as const;
  }
  if (readerWindow.window_state === "CONTRACT_ELIGIBLE_WINDOW_CLOSED") {
    return "CONTRACT_WINDOW_CLOSED" as const;
  }
  if (
    backfill &&
    backfill.execution_requirement === "IDEMPOTENT_BACKFILL_REQUIRED" &&
    backfill.execution_state !== "COMPLETE"
  ) {
    return "BACKFILL_IN_PROGRESS" as const;
  }
  if (readerWindow.window_state === "VERIFIED_PREVIOUS_READERS_SUPPORTED") {
    return "VERIFIED_PREVIOUS_READERS_SUPPORTED" as const;
  }
  return "EXPAND_ONLY" as const;
}

function recommendedAction(
  actionRef: string,
  summary: string,
  requiredArtifactRefs: string[],
) {
  return { actionRef, summary, requiredArtifactRefs } satisfies MigrationReadinessRecommendedAction;
}

function uniqueness<T>(values: T[]) {
  return [...new Set(values)];
}

export function evaluateMigrationReadiness(input: {
  candidateIdentity: ReleaseCandidateIdentityContract;
  context: MigrationReadinessContext;
  diffResult: SchemaDriftDiffResult;
  policy: SchemaDriftPolicy;
}) {
  const { candidateIdentity, context, diffResult, policy } = input;
  const blockingDeltaRefs = diffResult.deltas
    .filter((delta) => delta.severityRef === "BLOCKING")
    .map((delta) => delta.deltaRef);
  const docsDrift = diffResult.deltas.some((delta) => delta.atlasGroupRef === "DOC_DRIFT");
  const bindingDrift = diffResult.deltas.some((delta) => delta.atlasGroupRef === "BINDING_DRIFT");
  const structuralBlocking = diffResult.deltas.filter(includesBlockingGroup);
  const requiresMigration = diffResult.deltas.some(needsMigrationLedger);
  const requiresBackfill = diffResult.deltas.some(needsBackfill);
  const requiresReaderWindowClosure = diffResult.deltas.some(needsReaderWindowClosure);
  const readerWindowClosed =
    context.schemaReaderWindowContract.window_state === "CONTRACT_ELIGIBLE_WINDOW_CLOSED";
  const migrationPlanRefOrNull = requiresMigration
    ? candidateIdentity.migration_plan_ref_or_null
    : null;
  const migrationLedgerRefs = requiresMigration && context.currentCatalogEntry
    ? [context.currentCatalogEntry.migrationId]
    : [];

  const reasonCodes: string[] = [];
  const recommendedActions: MigrationReadinessRecommendedAction[] = [];

  if (
    candidateIdentity.supported_client_window_ref_or_null !==
    policy.candidateIdentityTemplate.supportedClientWindowRefOrNull
  ) {
    reasonCodes.push("SUPPORTED_CLIENT_WINDOW_REF_MISMATCH");
    recommendedActions.push(
      recommendedAction(
        "align_supported_client_window",
        "Align the candidate identity to the expected supported client window before promotion evidence is assembled.",
        ["packages/contracts-core/schemas/release_candidate_identity_contract.schema.json"],
      ),
    );
  }

  if (docsDrift) {
    reasonCodes.push("DOCUMENTATION_BINDING_DRIFT");
    recommendedActions.push(
      recommendedAction(
        "repair_documentation_tokens",
        "Update documentation bindings so schema tokens, headings, and references match the candidate bundle.",
        ["docs/contracts/**", "config/contracts/schema_drift_policy.json"],
      ),
    );
  }

  if (bindingDrift) {
    reasonCodes.push("GENERATED_BINDINGS_STALE");
    recommendedActions.push(
      recommendedAction(
        "regenerate_language_bindings",
        "Regenerate language bindings and binding coverage before schema admissibility can be trusted.",
        ["data/contracts/binding_coverage_report.json", "packages/generated-models/src/generated"],
      ),
    );
  }

  if (requiresMigration && !migrationPlanRefOrNull) {
    reasonCodes.push("MIGRATION_LEDGER_MISSING");
    recommendedActions.push(
      recommendedAction(
        "record_migration_ledger",
        "Record a numbered migration ledger and bind the candidate identity to that migration plan before promoting the bundle.",
        [
          "config/migrations/schema_bundle_version_catalog.json",
          "packages/control-plane-db/src/migrations",
        ],
      ),
    );
  }

  if (
    requiresBackfill &&
    (!context.backfillExecutionContract ||
      context.backfillExecutionContract.execution_requirement !== "IDEMPOTENT_BACKFILL_REQUIRED" ||
      context.backfillExecutionContract.execution_state !== "COMPLETE")
  ) {
    reasonCodes.push("BACKFILL_EXECUTION_CONTRACT_INCOMPLETE");
    recommendedActions.push(
      recommendedAction(
        "complete_backfill_execution_contract",
        "Record and complete the idempotent backfill contract before the candidate can be admitted.",
        ["config/migrations/backfill_execution_policy.json"],
      ),
    );
  }

  if (requiresReaderWindowClosure && !readerWindowClosed) {
    reasonCodes.push("READER_WINDOW_STILL_OPEN");
    recommendedActions.push(
      recommendedAction(
        "close_reader_window",
        "Keep the change in expand/backfill posture until the compatibility window closes and historical readers are no longer protected.",
        ["config/migrations/schema_reader_window_baseline.json"],
      ),
    );
  }

  if (structuralBlocking.some((delta) => delta.sealedManifestImpact) && readerWindowClosed) {
    reasonCodes.push("SEALED_MANIFEST_PATH_FAIL_FORWARD_ONLY");
  }

  const nativeClientWindowState =
    candidateIdentity.supported_client_window_ref_or_null === null
      ? "NOT_APPLICABLE"
      : reasonCodes.includes("SUPPORTED_CLIENT_WINDOW_REF_MISMATCH")
        ? "BLOCKED"
        : "VERIFIED_COMPATIBLE";

  const historicalManifestGuardState =
    context.supportedReaderSchemaBundleHashes.includes(context.currentCatalogEntry.schemaBundleHash)
      ? "PROTECTED"
      : "BLOCKED";
  const replayRestoreGuardState = historicalManifestGuardState;
  const destructiveContractState = readerWindowClosed
    ? "ELIGIBLE_AFTER_WINDOW_CLOSE"
    : "BLOCKED_UNTIL_WINDOW_CLOSE";

  let verdictRef: ReadinessVerdictRef = "ROLLBACK_SAFE";
  if (reasonCodes.includes("SUPPORTED_CLIENT_WINDOW_REF_MISMATCH")) {
    verdictRef = "BLOCKED_PENDING_CLIENT_WINDOW";
  } else if (reasonCodes.includes("DOCUMENTATION_BINDING_DRIFT")) {
    verdictRef = "BLOCKED_PENDING_DOC_SYNC";
  } else if (reasonCodes.includes("GENERATED_BINDINGS_STALE")) {
    verdictRef = "BLOCKED_PENDING_BINDING_REGEN";
  } else if (reasonCodes.includes("MIGRATION_LEDGER_MISSING")) {
    verdictRef = "BLOCKED_PENDING_MIGRATION_LEDGER";
  } else if (reasonCodes.includes("BACKFILL_EXECUTION_CONTRACT_INCOMPLETE")) {
    verdictRef = "BLOCKED_PENDING_BACKFILL";
  } else if (reasonCodes.includes("READER_WINDOW_STILL_OPEN")) {
    verdictRef = "BLOCKED_PENDING_READER_WINDOW";
  } else if (requiresReaderWindowClosure && readerWindowClosed) {
    verdictRef = "FAIL_FORWARD_ONLY";
  }

  const admissibilityState =
    verdictRef === "ROLLBACK_SAFE" || verdictRef === "FAIL_FORWARD_ONLY"
      ? "ADMISSIBLE"
      : "BLOCKED";

  return {
    verdictRef,
    admissibilityState,
    rollbackBoundaryState:
      verdictRef === "FAIL_FORWARD_ONLY" ? "FAIL_FORWARD_ONLY" : "ROLLBACK_ALLOWED",
    destructiveContractState,
    historicalManifestGuardState,
    replayRestoreGuardState,
    nativeClientWindowState,
    migrationChronologyState: migrationChronologyState(
      context.schemaReaderWindowContract,
      context.backfillExecutionContract,
      requiresMigration,
    ),
    migrationPlanRefOrNull,
    migrationLedgerRefs,
    blockingDeltaRefs,
    reasonCodes: uniqueness(reasonCodes),
    recommendedActions: uniqueness(recommendedActions.map((entry) => JSON.stringify(entry))).map(
      (entry) => JSON.parse(entry) as MigrationReadinessRecommendedAction,
    ),
  } satisfies MigrationReadinessEvaluation;
}
