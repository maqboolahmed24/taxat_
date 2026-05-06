import {
  assertFailureEnum,
  assertNoSelfReference,
  assertNotBefore,
  assertNullableFailureEnum,
  assertOwnerReference,
  assertRetentionLinkage,
  appendFailureRefs,
  cloneFailureCompanionRecord,
  failureCompanionContentFingerprint,
  failureCompanionError,
  normalizeFailureResolutionContract,
  normalizeFailureStringSet,
  normalizeFailureTimestamp,
  normalizeNullableFailureString,
  normalizeNullableFailureTimestamp,
  requireFailureString,
  type FailureCompensationOwnerType,
  type FailureResolutionContract,
  type FailureRetentionClass,
} from "./failure_companion_common.ts";

export type CompensationMode =
  | "NONE"
  | "MARK_AS_VOID"
  | "MARK_AS_SUPERSEDED"
  | "REVERT_DERIVED_ONLY"
  | "OPEN_RECONCILIATION"
  | "PRESERVE_AND_LIMIT"
  | "REQUIRE_MANUAL_SETTLEMENT";
export type CompensationStatus =
  | "PLANNED"
  | "IN_PROGRESS"
  | "APPLIED"
  | "VERIFIED"
  | "FAILED"
  | "CANCELLED"
  | "SUPERSEDED";

export type CompensationRecord = {
  artifact_retention_ref: string | null;
  audit_refs: string[];
  closure_evidence_refs: string[];
  compensated_at: string | null;
  compensation_id: string;
  compensation_mode: CompensationMode;
  compensation_status: CompensationStatus;
  compensation_steps_ref: string;
  created_at: string;
  error_id: string;
  failure_resolution_contract: FailureResolutionContract;
  manifest_id: string;
  owner_ref: string | null;
  owner_type: FailureCompensationOwnerType;
  provenance_refs: string[];
  resolution_basis_ref: string | null;
  retention_class: FailureRetentionClass | null;
  root_manifest_id: string;
  superseded_by_compensation_id: string | null;
  target_object_refs: string[];
  verification_ref: string | null;
  workflow_item_id: string | null;
};

export type CompensationRecordInput = Partial<CompensationRecord> & {
  audit_refs: readonly string[];
  compensation_id: string;
  compensation_mode: CompensationMode;
  compensation_steps_ref: string;
  created_at: string;
  error_id: string;
  failure_resolution_contract: FailureResolutionContract;
  manifest_id: string;
  owner_type: FailureCompensationOwnerType;
  provenance_refs: readonly string[];
  root_manifest_id: string;
  target_object_refs: readonly string[];
};

export const COMPENSATION_MODES = [
  "NONE",
  "MARK_AS_VOID",
  "MARK_AS_SUPERSEDED",
  "REVERT_DERIVED_ONLY",
  "OPEN_RECONCILIATION",
  "PRESERVE_AND_LIMIT",
  "REQUIRE_MANUAL_SETTLEMENT",
] as const satisfies readonly CompensationMode[];
export const COMPENSATION_STATUSES = [
  "PLANNED",
  "IN_PROGRESS",
  "APPLIED",
  "VERIFIED",
  "FAILED",
  "CANCELLED",
  "SUPERSEDED",
] as const satisfies readonly CompensationStatus[];
export const COMPENSATION_TERMINAL_STATUSES = [
  "VERIFIED",
  "FAILED",
  "CANCELLED",
  "SUPERSEDED",
] as const satisfies readonly CompensationStatus[];

const OWNER_TYPES = [
  "SYSTEM",
  "SERVICE_OPERATOR",
  "REVIEWER",
  "APPROVER",
  "TENANT_ADMIN",
  "SECURITY_OPERATOR",
] as const satisfies readonly FailureCompensationOwnerType[];

export const COMPENSATION_STATUS_TRANSITIONS = {
  APPLIED: ["VERIFIED", "SUPERSEDED"],
  CANCELLED: [],
  FAILED: [],
  IN_PROGRESS: ["APPLIED", "FAILED", "CANCELLED", "SUPERSEDED"],
  PLANNED: ["IN_PROGRESS", "APPLIED", "FAILED", "CANCELLED", "SUPERSEDED"],
  SUPERSEDED: [],
  VERIFIED: [],
} as const satisfies Record<CompensationStatus, readonly CompensationStatus[]>;

export function compensationRecordRef(record: Pick<CompensationRecord, "compensation_id">) {
  return `compensation-record://${record.compensation_id}`;
}

export function isCompensationRecordTerminalStatus(status: CompensationStatus) {
  return COMPENSATION_TERMINAL_STATUSES.includes(
    status as (typeof COMPENSATION_TERMINAL_STATUSES)[number],
  );
}

export function assertCompensationStatusTransition(input: {
  from_status: CompensationStatus;
  to_status: CompensationStatus;
}) {
  if (input.from_status === input.to_status) {
    return input.to_status;
  }
  if (
    !(COMPENSATION_STATUS_TRANSITIONS[input.from_status] as readonly CompensationStatus[]).includes(
      input.to_status,
    )
  ) {
    failureCompanionError(
      `illegal CompensationRecord transition ${input.from_status} -> ${input.to_status}`,
    );
  }
  return input.to_status;
}

function assertCompensationStatusContract(record: CompensationRecord) {
  switch (record.compensation_status) {
    case "PLANNED":
    case "IN_PROGRESS":
      if (
        record.compensated_at !== null ||
        record.verification_ref !== null ||
        record.resolution_basis_ref !== null ||
        record.closure_evidence_refs.length > 0 ||
        record.superseded_by_compensation_id !== null
      ) {
        failureCompanionError(
          "planned or in-progress compensation must not carry settlement, verification, closure, or supersession fields",
        );
      }
      break;
    case "FAILED":
    case "CANCELLED":
      if (record.compensated_at !== null || record.verification_ref !== null) {
        failureCompanionError("failed or cancelled compensation must clear compensated_at and verification_ref");
      }
      if (record.resolution_basis_ref === null || record.closure_evidence_refs.length === 0) {
        failureCompanionError("failed or cancelled compensation requires closure basis and evidence");
      }
      if (record.superseded_by_compensation_id !== null) {
        failureCompanionError("failed or cancelled compensation must clear superseded_by_compensation_id");
      }
      break;
    case "APPLIED":
      if (record.compensated_at === null) {
        failureCompanionError("applied compensation requires compensated_at");
      }
      if (record.verification_ref !== null || record.superseded_by_compensation_id !== null) {
        failureCompanionError("applied compensation must clear verification and supersession refs");
      }
      if (record.resolution_basis_ref === null || record.closure_evidence_refs.length === 0) {
        failureCompanionError("applied compensation requires closure basis and evidence");
      }
      break;
    case "VERIFIED":
      if (record.compensated_at === null || record.verification_ref === null) {
        failureCompanionError("verified compensation requires compensated_at and verification_ref");
      }
      if (record.resolution_basis_ref === null || record.closure_evidence_refs.length === 0) {
        failureCompanionError("verified compensation requires closure basis and evidence");
      }
      if (record.superseded_by_compensation_id !== null) {
        failureCompanionError("verified compensation must clear superseded_by_compensation_id");
      }
      break;
    case "SUPERSEDED":
      if (record.superseded_by_compensation_id === null) {
        failureCompanionError("superseded compensation requires superseded_by_compensation_id");
      }
      if (record.verification_ref !== null) {
        failureCompanionError("superseded compensation must clear verification_ref");
      }
      if (record.resolution_basis_ref === null || record.closure_evidence_refs.length === 0) {
        failureCompanionError("superseded compensation requires closure basis and evidence");
      }
      break;
  }

  if (record.verification_ref !== null && record.compensation_status !== "VERIFIED") {
    failureCompanionError("verification_ref is lawful only on verified compensation");
  }
  if (
    record.superseded_by_compensation_id !== null &&
    record.compensation_status !== "SUPERSEDED"
  ) {
    failureCompanionError("superseded_by_compensation_id is lawful only on superseded compensation");
  }
}

function assertCompensationModeContract(record: CompensationRecord) {
  if (
    record.compensation_mode === "NONE" &&
    !["APPLIED", "VERIFIED"].includes(record.compensation_status)
  ) {
    failureCompanionError("compensation_mode=NONE is lawful only when already applied or verified");
  }
  if (record.compensation_mode === "PRESERVE_AND_LIMIT") {
    if (record.retention_class === null || record.artifact_retention_ref === null) {
      failureCompanionError("PRESERVE_AND_LIMIT compensation requires retention linkage");
    }
  }
  if (
    ["OPEN_RECONCILIATION", "REQUIRE_MANUAL_SETTLEMENT"].includes(record.compensation_mode) &&
    record.workflow_item_id === null
  ) {
    failureCompanionError("manual or reconciliation compensation requires workflow_item_id");
  }
}

export function buildCompensationRecord(input: CompensationRecordInput): CompensationRecord {
  return normalizeCompensationRecord({
    artifact_retention_ref: input.artifact_retention_ref ?? null,
    audit_refs: [...input.audit_refs],
    closure_evidence_refs: [...(input.closure_evidence_refs ?? [])],
    compensated_at: input.compensated_at ?? null,
    compensation_id: input.compensation_id,
    compensation_mode: input.compensation_mode,
    compensation_status: input.compensation_status ?? "PLANNED",
    compensation_steps_ref: input.compensation_steps_ref,
    created_at: input.created_at,
    error_id: input.error_id,
    failure_resolution_contract: input.failure_resolution_contract,
    manifest_id: input.manifest_id,
    owner_ref: input.owner_ref ?? null,
    owner_type: input.owner_type,
    provenance_refs: [...input.provenance_refs],
    resolution_basis_ref: input.resolution_basis_ref ?? null,
    retention_class: input.retention_class ?? null,
    root_manifest_id: input.root_manifest_id,
    superseded_by_compensation_id: input.superseded_by_compensation_id ?? null,
    target_object_refs: [...input.target_object_refs],
    verification_ref: input.verification_ref ?? null,
    workflow_item_id: input.workflow_item_id ?? null,
  });
}

export function normalizeCompensationRecord(input: CompensationRecord): CompensationRecord {
  const record: CompensationRecord = {
    artifact_retention_ref: normalizeNullableFailureString(
      "artifact_retention_ref",
      input.artifact_retention_ref,
    ),
    audit_refs: normalizeFailureStringSet("audit_refs", input.audit_refs, { minItems: 1 }),
    closure_evidence_refs: normalizeFailureStringSet(
      "closure_evidence_refs",
      input.closure_evidence_refs,
    ),
    compensated_at: normalizeNullableFailureTimestamp("compensated_at", input.compensated_at),
    compensation_id: requireFailureString("compensation_id", input.compensation_id),
    compensation_mode: assertFailureEnum(
      "compensation_mode",
      input.compensation_mode,
      COMPENSATION_MODES,
    ),
    compensation_status: assertFailureEnum(
      "compensation_status",
      input.compensation_status,
      COMPENSATION_STATUSES,
    ),
    compensation_steps_ref: requireFailureString(
      "compensation_steps_ref",
      input.compensation_steps_ref,
    ),
    created_at: normalizeFailureTimestamp("created_at", input.created_at),
    error_id: requireFailureString("error_id", input.error_id),
    failure_resolution_contract: normalizeFailureResolutionContract(
      input.failure_resolution_contract,
      "COMPENSATION_RECORD",
    ),
    manifest_id: requireFailureString("manifest_id", input.manifest_id),
    owner_ref: normalizeNullableFailureString("owner_ref", input.owner_ref),
    owner_type: assertFailureEnum("owner_type", input.owner_type, OWNER_TYPES),
    provenance_refs: normalizeFailureStringSet("provenance_refs", input.provenance_refs, {
      minItems: 1,
    }),
    resolution_basis_ref: normalizeNullableFailureString(
      "resolution_basis_ref",
      input.resolution_basis_ref,
    ),
    retention_class: assertNullableFailureEnum(
      "retention_class",
      input.retention_class,
      [
        "regulated_record",
        "derived_artifact",
        "operational_log",
        "analytics_projection",
        "policy_governed_other",
      ] as const,
    ),
    root_manifest_id: requireFailureString("root_manifest_id", input.root_manifest_id),
    superseded_by_compensation_id: normalizeNullableFailureString(
      "superseded_by_compensation_id",
      input.superseded_by_compensation_id,
    ),
    target_object_refs: normalizeFailureStringSet("target_object_refs", input.target_object_refs, {
      minItems: 1,
    }),
    verification_ref: normalizeNullableFailureString("verification_ref", input.verification_ref),
    workflow_item_id: normalizeNullableFailureString("workflow_item_id", input.workflow_item_id),
  };

  assertOwnerReference({
    label: "CompensationRecord",
    owner_ref: record.owner_ref,
    owner_type: record.owner_type,
  });
  assertRetentionLinkage({
    artifact_retention_ref: record.artifact_retention_ref,
    label: "CompensationRecord",
    retention_class: record.retention_class,
  });
  assertNoSelfReference({
    id: record.compensation_id,
    id_label: "compensation_id",
    reference: record.superseded_by_compensation_id,
    reference_label: "superseded_by_compensation_id",
  });
  assertNotBefore({
    earlier_label: "created_at",
    earlier_value: record.created_at,
    later_label: "compensated_at",
    later_value: record.compensated_at,
  });
  assertCompensationStatusContract(record);
  assertCompensationModeContract(record);
  return record;
}

export function cloneCompensationRecord(record: CompensationRecord) {
  return cloneFailureCompanionRecord(record);
}

export function compensationRecordContentFingerprint(record: CompensationRecord) {
  return failureCompanionContentFingerprint(normalizeCompensationRecord(record));
}

export function withCompensationRecordLineage(input: {
  audit_refs?: readonly string[];
  provenance_refs?: readonly string[];
  record: CompensationRecord;
}) {
  return normalizeCompensationRecord({
    ...input.record,
    audit_refs: appendFailureRefs(input.record.audit_refs, input.audit_refs, "audit_refs", {
      minItems: 1,
    }),
    provenance_refs: appendFailureRefs(
      input.record.provenance_refs,
      input.provenance_refs,
      "provenance_refs",
      { minItems: 1 },
    ),
  });
}
