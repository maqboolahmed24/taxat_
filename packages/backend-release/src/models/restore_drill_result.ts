import type { RestoreDrillResult } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import {
  normalizeRestorePrivacyReconciliationContract,
  RESTORE_PRIVACY_RECONCILIATION_FINAL_STATES,
  type RestorePrivacyReconciliationContract,
} from "../../../backend-recovery/src/index.ts";
import {
  assertReleaseCandidateIdentityContract,
  cloneReleaseCandidateIdentityContract,
  type ReleaseCandidateIdentityContractRecord,
} from "./release_candidate_identity_contract.ts";
import {
  assertSchemaReaderWindowContract,
  cloneSchemaReaderWindowContract,
  type SchemaReaderWindowContractRecord,
} from "./schema_reader_window_contract.ts";
import {
  isPlainRecord,
  requireBoolean,
  requireUtcInstant,
  requireVerificationSuiteNullableString,
  requireVerificationSuiteString,
} from "../services/canonicalize_verification_suite_scope.ts";

export type RestoreDrillResultRecord = RestoreDrillResult;
export type RestoreDrillOutcome = RestoreDrillResultRecord["outcome"];
export type RestoreDrillScope = RestoreDrillResultRecord["drill_scope"];

export const RESTORE_DRILL_RESULT_SCHEMA_ID =
  "https://taxat.dev/schemas/restore_drill_result.schema.json";

export const RESTORE_DRILL_SCOPES = [
  "CURRENT_RELEASE_CANDIDATE",
  "DR_FAILOVER_FAILBACK",
] as const satisfies readonly RestoreDrillScope[];

export const RESTORE_DRILL_OUTCOMES = [
  "PASSED",
  "FAILED",
  "QUARANTINED",
] as const satisfies readonly RestoreDrillOutcome[];

export type RestoreDrillResultModelErrorCode =
  | "RESTORE_DRILL_RESULT_FIELD_INVALID"
  | "RESTORE_DRILL_RESULT_CANDIDATE_DRIFT"
  | "RESTORE_DRILL_RESULT_WINDOW_DRIFT"
  | "RESTORE_DRILL_RESULT_PRIVACY_DRIFT"
  | "RESTORE_DRILL_RESULT_OUTCOME_INVALID"
  | "RESTORE_DRILL_RESULT_CANONICAL_ORDER_INVALID";

export class RestoreDrillResultModelError extends Error {
  readonly code: RestoreDrillResultModelErrorCode;

  constructor(code: RestoreDrillResultModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "RestoreDrillResultModelError";
    this.code = code;
  }
}

function assertRestoreDrill(
  condition: unknown,
  code: RestoreDrillResultModelErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new RestoreDrillResultModelError(code, detail);
  }
}

function modelErrorDetail(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function requireRestoreDrillScope(value: unknown): RestoreDrillScope {
  assertRestoreDrill(
    typeof value === "string" && RESTORE_DRILL_SCOPES.includes(value as RestoreDrillScope),
    "RESTORE_DRILL_RESULT_FIELD_INVALID",
    "drill_scope must be CURRENT_RELEASE_CANDIDATE or DR_FAILOVER_FAILBACK",
  );
  return value as RestoreDrillScope;
}

function requireRestoreDrillOutcome(value: unknown): RestoreDrillOutcome {
  assertRestoreDrill(
    typeof value === "string" &&
      RESTORE_DRILL_OUTCOMES.includes(value as RestoreDrillOutcome),
    "RESTORE_DRILL_RESULT_FIELD_INVALID",
    "outcome must be PASSED, FAILED, or QUARANTINED",
  );
  return value as RestoreDrillOutcome;
}

function requireCanonicalStringSet(
  label: string,
  values: unknown,
  allowEmpty = true,
) {
  assertRestoreDrill(
    Array.isArray(values),
    "RESTORE_DRILL_RESULT_FIELD_INVALID",
    `${label} must be an array`,
  );
  const normalized = values.map((value, index) =>
    requireVerificationSuiteString(`${label}[${index}]`, value),
  );
  assertRestoreDrill(
    allowEmpty || normalized.length > 0,
    "RESTORE_DRILL_RESULT_FIELD_INVALID",
    `${label} must contain at least one entry`,
  );
  const sorted = [...normalized].sort();
  const unique = new Set(normalized);
  assertRestoreDrill(
    unique.size === normalized.length,
    "RESTORE_DRILL_RESULT_CANONICAL_ORDER_INVALID",
    `${label} must not contain duplicate entries`,
  );
  assertRestoreDrill(
    normalized.every((entry, index) => entry === sorted[index]),
    "RESTORE_DRILL_RESULT_CANONICAL_ORDER_INVALID",
    `${label} must already be sorted in canonical order`,
  );
  return normalized;
}

function assertRestoreCandidateIdentityContract(
  value: unknown,
  expectedMirrors?: Parameters<typeof assertReleaseCandidateIdentityContract>[1],
) {
  try {
    return assertReleaseCandidateIdentityContract(value, expectedMirrors);
  } catch (error) {
    throw new RestoreDrillResultModelError(
      "RESTORE_DRILL_RESULT_CANDIDATE_DRIFT",
      `candidate_identity_contract must mirror restore drill scope: ${modelErrorDetail(error)}`,
    );
  }
}

function assertRestorePrivacyContract(
  value: unknown,
  expected: { checkpoint_ref: string; restore_drill_ref: string },
) {
  try {
    return normalizeRestorePrivacyReconciliationContract(
      value as RestorePrivacyReconciliationContract,
      expected,
    );
  } catch (error) {
    throw new RestoreDrillResultModelError(
      "RESTORE_DRILL_RESULT_PRIVACY_DRIFT",
      `privacy_reconciliation_contract must mirror restore drill scope: ${modelErrorDetail(error)}`,
    );
  }
}

function isFinalReadyPrivacyContract(
  contract: RestorePrivacyReconciliationContract,
) {
  return (
    RESTORE_PRIVACY_RECONCILIATION_FINAL_STATES.includes(
      contract.privacy_reconciliation_state as (typeof RESTORE_PRIVACY_RECONCILIATION_FINAL_STATES)[number],
    ) &&
    contract.audit_chain_continuity_state === "VERIFIED" &&
    contract.replay_limitation_state === "VERIFIED" &&
    contract.enquiry_limitation_state === "VERIFIED" &&
    contract.reopen_access_state === "READY_FOR_REOPEN"
  );
}

function assertOutcomePosture(input: {
  outcome: RestoreDrillOutcome;
  auditContinuityVerified: boolean;
  privacyReconciliationVerified: boolean;
  queueRebuildVerified: boolean;
  authorityRebuildVerified: boolean;
  authorityBindingRevalidationVerified: boolean;
  privacyContract: RestorePrivacyReconciliationContract;
  failureReasonCodes: readonly string[];
}) {
  const allVerified =
    input.auditContinuityVerified &&
    input.privacyReconciliationVerified &&
    input.queueRebuildVerified &&
    input.authorityRebuildVerified &&
    input.authorityBindingRevalidationVerified;
  assertRestoreDrill(
    !input.authorityBindingRevalidationVerified || input.authorityRebuildVerified,
    "RESTORE_DRILL_RESULT_OUTCOME_INVALID",
    "authority binding revalidation cannot be true while authority rebuild is false",
  );
  if (input.outcome === "PASSED") {
    assertRestoreDrill(
      allVerified,
      "RESTORE_DRILL_RESULT_OUTCOME_INVALID",
      "PASSED restore drills require every verification basis to be true",
    );
    assertRestoreDrill(
      input.failureReasonCodes.length === 0,
      "RESTORE_DRILL_RESULT_OUTCOME_INVALID",
      "PASSED restore drills must not carry failure_reason_codes",
    );
    assertRestoreDrill(
      isFinalReadyPrivacyContract(input.privacyContract),
      "RESTORE_DRILL_RESULT_PRIVACY_DRIFT",
      "PASSED restore drills require final, reopen-ready privacy reconciliation",
    );
    return;
  }
  assertRestoreDrill(
    !allVerified,
    "RESTORE_DRILL_RESULT_OUTCOME_INVALID",
    "non-passed restore drills must expose at least one failed verification basis",
  );
  assertRestoreDrill(
    input.failureReasonCodes.length > 0,
    "RESTORE_DRILL_RESULT_OUTCOME_INVALID",
    "FAILED or QUARANTINED restore drills require failure_reason_codes",
  );
  if (input.privacyReconciliationVerified) {
    assertRestoreDrill(
      isFinalReadyPrivacyContract(input.privacyContract),
      "RESTORE_DRILL_RESULT_PRIVACY_DRIFT",
      "privacy_reconciliation_verified=true requires final, reopen-ready privacy reconciliation",
    );
  }
}

export function normalizeRestoreDrillResult(input: unknown): RestoreDrillResultRecord {
  assertRestoreDrill(
    isPlainRecord(input),
    "RESTORE_DRILL_RESULT_FIELD_INVALID",
    "restore_drill_result must be an object",
  );
  const restoreDrillId = requireVerificationSuiteString(
    "restore_drill_result.restore_drill_id",
    input.restore_drill_id,
  );
  const checkpointRef = requireVerificationSuiteString(
    "restore_drill_result.checkpoint_ref",
    input.checkpoint_ref,
  );
  const candidateIdentityHash = requireVerificationSuiteString(
    "restore_drill_result.candidate_identity_hash",
    input.candidate_identity_hash,
  );
  const schemaBundleHash = requireVerificationSuiteString(
    "restore_drill_result.schema_bundle_hash",
    input.schema_bundle_hash,
  );
  const migrationPlanRef = requireVerificationSuiteNullableString(
    "restore_drill_result.migration_plan_ref",
    input.migration_plan_ref,
  );
  const enabledProviderProfileRefs = requireCanonicalStringSet(
    "restore_drill_result.enabled_provider_profile_refs",
    input.enabled_provider_profile_refs,
  );
  const candidateIdentityContract = assertRestoreCandidateIdentityContract(
    input.candidate_identity_contract,
    {
      artifact_digest: requireVerificationSuiteString(
        "restore_drill_result.artifact_digest",
        input.artifact_digest,
      ),
      build_artifact_ref: requireVerificationSuiteString(
        "restore_drill_result.build_artifact_ref",
        input.build_artifact_ref,
      ),
      candidate_environment_ref: requireVerificationSuiteString(
        "restore_drill_result.candidate_environment_ref",
        input.candidate_environment_ref,
      ),
      candidate_identity_hash: candidateIdentityHash,
      config_bundle_hash: requireVerificationSuiteString(
        "restore_drill_result.config_bundle_hash",
        input.config_bundle_hash,
      ),
      enabled_provider_profile_refs: enabledProviderProfileRefs,
      migration_plan_ref_or_null: migrationPlanRef,
      schema_bundle_hash: schemaBundleHash,
    },
  );
  const schemaReaderWindowContract = assertSchemaReaderWindowContract(
    input.schema_reader_window_contract,
  );
  assertRestoreDrill(
    schemaReaderWindowContract.writer_schema_bundle_hash === schemaBundleHash,
    "RESTORE_DRILL_RESULT_WINDOW_DRIFT",
    "schema_reader_window_contract.writer_schema_bundle_hash must mirror schema_bundle_hash",
  );
  const privacyContract = assertRestorePrivacyContract(
    input.privacy_reconciliation_contract,
    {
      checkpoint_ref: checkpointRef,
      restore_drill_ref: restoreDrillId,
    },
  );
  const outcome = requireRestoreDrillOutcome(input.outcome);
  const failureReasonCodes = requireCanonicalStringSet(
    "restore_drill_result.failure_reason_codes",
    input.failure_reason_codes,
  );
  const auditContinuityVerified = requireBoolean(
    "restore_drill_result.audit_continuity_verified",
    input.audit_continuity_verified,
  );
  const privacyReconciliationVerified = requireBoolean(
    "restore_drill_result.privacy_reconciliation_verified",
    input.privacy_reconciliation_verified,
  );
  const queueRebuildVerified = requireBoolean(
    "restore_drill_result.queue_rebuild_verified",
    input.queue_rebuild_verified,
  );
  const authorityRebuildVerified = requireBoolean(
    "restore_drill_result.authority_rebuild_verified",
    input.authority_rebuild_verified,
  );
  const authorityBindingRevalidationVerified = requireBoolean(
    "restore_drill_result.authority_binding_revalidation_verified",
    input.authority_binding_revalidation_verified,
  );
  assertOutcomePosture({
    auditContinuityVerified,
    authorityBindingRevalidationVerified,
    authorityRebuildVerified,
    failureReasonCodes,
    outcome,
    privacyContract,
    privacyReconciliationVerified,
    queueRebuildVerified,
  });

  return {
    restore_drill_id: restoreDrillId,
    checkpoint_ref: checkpointRef,
    candidate_environment_ref: candidateIdentityContract.candidate_environment_ref,
    build_artifact_ref: candidateIdentityContract.build_artifact_ref,
    artifact_digest: candidateIdentityContract.artifact_digest,
    candidate_identity_hash: candidateIdentityHash,
    candidate_identity_contract: cloneReleaseCandidateIdentityContract(
      candidateIdentityContract,
    ),
    schema_bundle_hash: schemaBundleHash,
    schema_reader_window_contract: cloneSchemaReaderWindowContract(
      schemaReaderWindowContract,
    ),
    config_bundle_hash: candidateIdentityContract.config_bundle_hash,
    migration_plan_ref: migrationPlanRef,
    enabled_provider_profile_refs: enabledProviderProfileRefs,
    drill_scope: requireRestoreDrillScope(input.drill_scope),
    executed_at: requireUtcInstant(
      "restore_drill_result.executed_at",
      input.executed_at,
    ),
    outcome,
    audit_continuity_verified: auditContinuityVerified,
    privacy_reconciliation_verified: privacyReconciliationVerified,
    queue_rebuild_verified: queueRebuildVerified,
    authority_rebuild_verified: authorityRebuildVerified,
    authority_binding_revalidation_verified: authorityBindingRevalidationVerified,
    privacy_reconciliation_contract:
      privacyContract as RestoreDrillResultRecord["privacy_reconciliation_contract"],
    drill_report_ref: requireVerificationSuiteString(
      "restore_drill_result.drill_report_ref",
      input.drill_report_ref,
    ),
    failure_reason_codes: failureReasonCodes,
  };
}

export type BuildRestoreDrillResultInput = {
  restore_drill_id: unknown;
  checkpoint_ref: unknown;
  candidate_identity_contract: ReleaseCandidateIdentityContractRecord;
  schema_reader_window_contract: SchemaReaderWindowContractRecord;
  privacy_reconciliation_contract: RestorePrivacyReconciliationContract;
  drill_scope: unknown;
  executed_at: unknown;
  outcome: unknown;
  audit_continuity_verified: unknown;
  privacy_reconciliation_verified: unknown;
  queue_rebuild_verified: unknown;
  authority_rebuild_verified: unknown;
  authority_binding_revalidation_verified: unknown;
  drill_report_ref: unknown;
  failure_reason_codes?: unknown;
};

export function buildRestoreDrillResult(
  input: BuildRestoreDrillResultInput,
): RestoreDrillResultRecord {
  const candidate = assertRestoreCandidateIdentityContract(
    input.candidate_identity_contract,
  );
  return normalizeRestoreDrillResult({
    restore_drill_id: input.restore_drill_id,
    checkpoint_ref: input.checkpoint_ref,
    candidate_environment_ref: candidate.candidate_environment_ref,
    build_artifact_ref: candidate.build_artifact_ref,
    artifact_digest: candidate.artifact_digest,
    candidate_identity_hash: candidate.candidate_identity_hash,
    candidate_identity_contract: candidate,
    schema_bundle_hash: candidate.schema_bundle_hash,
    schema_reader_window_contract: input.schema_reader_window_contract,
    config_bundle_hash: candidate.config_bundle_hash,
    migration_plan_ref: candidate.migration_plan_ref_or_null,
    enabled_provider_profile_refs: candidate.enabled_provider_profile_refs,
    drill_scope: input.drill_scope,
    executed_at: input.executed_at,
    outcome: input.outcome,
    audit_continuity_verified: input.audit_continuity_verified,
    privacy_reconciliation_verified: input.privacy_reconciliation_verified,
    queue_rebuild_verified: input.queue_rebuild_verified,
    authority_rebuild_verified: input.authority_rebuild_verified,
    authority_binding_revalidation_verified:
      input.authority_binding_revalidation_verified,
    privacy_reconciliation_contract: input.privacy_reconciliation_contract,
    drill_report_ref: input.drill_report_ref,
    failure_reason_codes: input.failure_reason_codes ?? [],
  });
}

export function assertRestoreDrillResultRecord(input: unknown) {
  return normalizeRestoreDrillResult(input);
}

export function cloneRestoreDrillResultRecord(record: RestoreDrillResultRecord) {
  return structuredClone(normalizeRestoreDrillResult(record));
}

export function restoreDrillResultRef(
  record: Pick<RestoreDrillResultRecord, "restore_drill_id">,
) {
  return record.restore_drill_id;
}

export function restoreDrillResultCheckpointRef(
  record: Pick<RestoreDrillResultRecord, "checkpoint_ref">,
) {
  return record.checkpoint_ref;
}

export function deriveRestoreVerificationHash(record: RestoreDrillResultRecord) {
  const normalized = normalizeRestoreDrillResult(record);
  return stableJsonHash({
    audit_continuity_verified: normalized.audit_continuity_verified,
    authority_binding_revalidation_verified:
      normalized.authority_binding_revalidation_verified,
    authority_rebuild_verified: normalized.authority_rebuild_verified,
    build_artifact_ref: normalized.build_artifact_ref,
    candidate_identity_hash: normalized.candidate_identity_hash,
    checkpoint_ref: normalized.checkpoint_ref,
    config_bundle_hash: normalized.config_bundle_hash,
    drill_scope: normalized.drill_scope,
    enabled_provider_profile_refs: normalized.enabled_provider_profile_refs,
    migration_plan_ref: normalized.migration_plan_ref,
    outcome: normalized.outcome,
    privacy_reconciliation_contract_hash:
      normalized.privacy_reconciliation_contract.reconciliation_contract_hash,
    privacy_reconciliation_verified: normalized.privacy_reconciliation_verified,
    queue_rebuild_verified: normalized.queue_rebuild_verified,
    restore_drill_id: normalized.restore_drill_id,
    schema_bundle_hash: normalized.schema_bundle_hash,
  });
}

export function restoreDrillResultIsPromotionEligible(
  record: RestoreDrillResultRecord,
) {
  const normalized = normalizeRestoreDrillResult(record);
  return (
    normalized.outcome === "PASSED" &&
    normalized.audit_continuity_verified &&
    normalized.privacy_reconciliation_verified &&
    normalized.queue_rebuild_verified &&
    normalized.authority_rebuild_verified &&
    normalized.authority_binding_revalidation_verified &&
    isFinalReadyPrivacyContract(
      normalized.privacy_reconciliation_contract as RestorePrivacyReconciliationContract,
    )
  );
}
