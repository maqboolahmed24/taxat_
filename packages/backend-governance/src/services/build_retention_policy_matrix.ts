import type { RetentionGovernanceFrame } from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";

type RetentionArtifactRow = RetentionGovernanceFrame["artifact_rows"][number];

export const retentionPolicyMatrixColumnOrder = [
  "ARTIFACT_CLASS",
  "STATUTORY_BASELINE",
  "TENANT_OVERRIDE",
  "EFFECTIVE_MINIMUM",
  "LIMITATION_BEHAVIOR",
  "PSEUDONYMISATION_MODE",
  "EXPORT_POSTURE",
] as const satisfies readonly RetentionGovernanceFrame["retention_policy_matrix"]["column_order"][number][];

export type RetentionPolicyRowInput = {
  affectedArtifactCount: number;
  artifactClass: string;
  clientRefs?: readonly string[] | undefined;
  erasureEligibleItemRefs?: readonly string[] | undefined;
  exportPosture: RetentionArtifactRow["export_posture"];
  legalHoldRefs?: readonly string[] | undefined;
  limitationBehavior: string;
  limitationRefs?: readonly string[] | undefined;
  overrideApprovalPending?: boolean | undefined;
  overrideState?: RetentionArtifactRow["override_state"] | undefined;
  pseudonymisationMode: string;
  retentionClass: string;
  rowRef: string;
  stagedChangeRef?: string | null | undefined;
  statutoryMinimumDays: number;
  statutoryMinimumRef: string;
  tenantOverrideDays?: number | null | undefined;
  tenantOverrideRef?: string | null | undefined;
};

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values.filter((value) => value.trim().length > 0))].sort((left, right) =>
    left.localeCompare(right),
  );
}

function nonNegativeInteger(label: string, value: number) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
  return value;
}

function deriveOverrideState(
  row: RetentionPolicyRowInput,
): RetentionArtifactRow["override_state"] {
  if (row.overrideState) {
    return row.overrideState;
  }
  if (!row.tenantOverrideRef) {
    return "NONE";
  }
  if (
    typeof row.tenantOverrideDays === "number" &&
    row.tenantOverrideDays < row.statutoryMinimumDays
  ) {
    return "BLOCKED_BY_STATUTORY_MINIMUM";
  }
  return row.overrideApprovalPending ? "PENDING_APPROVAL" : "APPLIED";
}

function warningFor(input: {
  legalHoldRefs: readonly string[];
  overrideState: RetentionArtifactRow["override_state"];
}): RetentionArtifactRow["warning_posture"] {
  if (input.overrideState === "BLOCKED_BY_STATUTORY_MINIMUM") {
    return "STATUTORY_BLOCK";
  }
  if (input.overrideState === "PENDING_APPROVAL") {
    return "APPROVAL_OR_STEP_UP_REQUIRED";
  }
  if (input.legalHoldRefs.length > 0) {
    return "LEGAL_HOLD_BLOCK";
  }
  return "NONE";
}

function rowWarningRef(rowRef: string, warning: RetentionArtifactRow["warning_posture"]) {
  return `retention-warning.${rowRef}.${warning.toLowerCase()}`;
}

function stagedChangeRefFor(rowRef: string) {
  return `retention-staged-change.${rowRef}.override`;
}

function buildArtifactRow(input: {
  erasureQueueRef: string;
  legalHoldRegisterRef: string;
  row: RetentionPolicyRowInput;
}): RetentionArtifactRow {
  const legalHoldRefs = uniqueSorted(input.row.legalHoldRefs ?? []);
  const erasureEligibleItemRefs = uniqueSorted(input.row.erasureEligibleItemRefs ?? []);
  const limitationRefs = uniqueSorted(input.row.limitationRefs ?? []);
  const override_state = deriveOverrideState(input.row);
  const warning_posture = warningFor({ legalHoldRefs, overrideState: override_state });
  const staged_change_ref_or_null =
    override_state === "NONE" || warning_posture === "LEGAL_HOLD_BLOCK"
      ? null
      : input.row.stagedChangeRef ?? stagedChangeRefFor(input.row.rowRef);
  const tenant_override_ref =
    override_state === "NONE" ? null : input.row.tenantOverrideRef;
  if (override_state !== "NONE" && !tenant_override_ref) {
    throw new Error("retention policy override rows require tenantOverrideRef");
  }

  const blocking_reason_refs =
    warning_posture === "STATUTORY_BLOCK"
      ? [`retention-blocker.${input.row.rowRef}.statutory-minimum`]
      : warning_posture === "APPROVAL_OR_STEP_UP_REQUIRED"
        ? [`retention-blocker.${input.row.rowRef}.approval-required`]
        : warning_posture === "LEGAL_HOLD_BLOCK"
          ? legalHoldRefs
          : [];

  return {
    affected_artifact_count: nonNegativeInteger(
      "affectedArtifactCount",
      input.row.affectedArtifactCount,
    ),
    artifact_class: input.row.artifactClass,
    blocking_reason_refs,
    effective_minimum_ref:
      override_state === "APPLIED"
        ? tenant_override_ref!
        : input.row.statutoryMinimumRef,
    erasure_eligible_count: erasureEligibleItemRefs.length,
    erasure_queue_ref_or_null:
      erasureEligibleItemRefs.length > 0 ? input.erasureQueueRef : null,
    export_posture: input.row.exportPosture,
    inline_warning_ref_or_null:
      warning_posture === "NONE" ? null : rowWarningRef(input.row.rowRef, warning_posture),
    legal_hold_count: legalHoldRefs.length,
    legal_hold_register_ref_or_null:
      legalHoldRefs.length > 0 ? input.legalHoldRegisterRef : null,
    limitation_behavior: input.row.limitationBehavior,
    limitation_count: limitationRefs.length,
    override_state,
    pseudonymisation_mode: input.row.pseudonymisationMode,
    retention_class: input.row.retentionClass,
    row_ref: input.row.rowRef,
    staged_change_ref_or_null,
    statutory_minimum_ref: input.row.statutoryMinimumRef,
    tenant_override_ref,
    warning_posture,
  };
}

export function buildRetentionPolicyMatrix(input: {
  erasureQueueRef: string;
  legalHoldRegisterRef: string;
  rows: readonly RetentionPolicyRowInput[];
  selectedRowRef?: string | null | undefined;
}): {
  artifact_rows: RetentionGovernanceFrame["artifact_rows"];
  retention_policy_matrix: RetentionGovernanceFrame["retention_policy_matrix"];
} {
  if (input.rows.length === 0) {
    throw new Error("RetentionGovernanceFrame requires at least one artifact policy row");
  }
  const artifact_rows = input.rows.map((row) =>
    buildArtifactRow({
      erasureQueueRef: input.erasureQueueRef,
      legalHoldRegisterRef: input.legalHoldRegisterRef,
      row,
    }),
  );
  const rowRefs = artifact_rows.map((row) => row.row_ref);
  const selected_row_ref =
    input.selectedRowRef && rowRefs.includes(input.selectedRowRef)
      ? input.selectedRowRef
      : rowRefs[0]!;

  return {
    artifact_rows,
    retention_policy_matrix: {
      column_order: [...retentionPolicyMatrixColumnOrder],
      editing_posture: "EXPLICIT_STAGE_ONLY",
      inline_blocker_visibility: "ALWAYS_VISIBLE",
      row_refs: rowRefs,
      selected_row_ref,
      sticky_header_mode: "ROW_AND_COLUMN_HEADERS",
    },
  };
}
