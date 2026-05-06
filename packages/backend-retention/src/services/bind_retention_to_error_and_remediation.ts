import type { ArtifactRetentionRecord } from "../models/artifact_retention.ts";
import {
  assertNonEmptyRetentionString,
  assertRetention,
  type RetentionClass,
  type RetentionTagRecord,
} from "../models/retention_tag.ts";
import { assertRetentionTagArtifactAlignment } from "./propagate_limitation_and_expiry.ts";

export type RetentionCompanionKind =
  | "ERROR_RECORD"
  | "REMEDIATION_TASK"
  | "COMPENSATION_RECORD"
  | "ACCEPTED_RISK_APPROVAL"
  | "FAILURE_INVESTIGATION";

export type RetentionBindableCompanion = Record<string, unknown> & {
  affected_object_refs?: readonly string[];
  artifact_retention_ref?: string | null;
  bounded_scope_refs?: readonly string[];
  compensation_mode?: string;
  error_family?: string;
  investigation_class?: string;
  provenance_refs?: readonly string[];
  remediation_task_ref?: string | null;
  retention_class?: RetentionClass | null;
  target_object_refs?: readonly string[];
  task_type?: string;
  workflow_item_id?: string | null;
};

export type BoundRetentionCompanion<T extends RetentionBindableCompanion> = T & {
  artifact_retention_ref: string;
  retention_class: RetentionClass;
};

function unique(values: readonly string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function hasFollowUp(companion: RetentionBindableCompanion) {
  return Boolean(companion.workflow_item_id || companion.remediation_task_ref);
}

function bindArrayField<T extends RetentionBindableCompanion>(
  companion: T,
  field: "affected_object_refs" | "bounded_scope_refs" | "provenance_refs" | "target_object_refs",
  refs: readonly string[],
) {
  return {
    ...companion,
    [field]: unique([...(companion[field] ?? []), ...refs]),
  };
}

function assertCompanionSpecificRules(
  kind: RetentionCompanionKind,
  companion: RetentionBindableCompanion,
) {
  if (kind === "ERROR_RECORD" && ["RETENTION_ERROR", "PRIVACY_ERROR"].includes(String(companion.error_family))) {
    assertRetention(
      hasFollowUp(companion),
      "RETENTION_FIELD_INVALID",
      "retention/privacy errors require workflow_item_id or remediation_task_ref",
    );
  }
  if (kind === "REMEDIATION_TASK" && companion.task_type === "CHECK_RETENTION_HOLD") {
    assertRetention(
      Boolean(companion.workflow_item_id),
      "RETENTION_FIELD_INVALID",
      "CHECK_RETENTION_HOLD remediation requires workflow_item_id",
    );
  }
  if (kind === "FAILURE_INVESTIGATION" && companion.investigation_class === "RETENTION_PRIVACY_EXCEPTION") {
    assertRetention(
      Boolean(companion.workflow_item_id),
      "RETENTION_FIELD_INVALID",
      "RETENTION_PRIVACY_EXCEPTION investigation requires workflow_item_id",
    );
  }
}

export function bindRetentionToErrorAndRemediation<T extends RetentionBindableCompanion>(input: {
  artifact_retention: ArtifactRetentionRecord;
  companion: T;
  kind: RetentionCompanionKind;
  retained_basis_ref: string;
  retention_tag: RetentionTagRecord;
}): BoundRetentionCompanion<T> {
  assertRetentionTagArtifactAlignment({
    artifact_retention: input.artifact_retention,
    retention_tag: input.retention_tag,
  });
  const retainedBasisRef = assertNonEmptyRetentionString(
    "retained_basis_ref",
    input.retained_basis_ref,
  );
  assertRetention(
    retainedBasisRef === input.retention_tag.retention_basis_ref ||
      retainedBasisRef === input.retention_tag.proof_preservation_basis_ref ||
      retainedBasisRef === input.retention_tag.authority_ambiguity_ref,
    "RETENTION_BLOCKING_BASIS_INVALID",
    "retained_basis_ref must be one of the canonical RetentionTag basis refs",
  );
  assertCompanionSpecificRules(input.kind, input.companion);

  let companion: RetentionBindableCompanion = {
    ...input.companion,
    artifact_retention_ref: input.artifact_retention.retention_id,
    retention_class: input.artifact_retention.retention_class,
  };

  companion = bindArrayField(companion, "provenance_refs", [retainedBasisRef]);

  if (input.kind === "ERROR_RECORD") {
    companion = bindArrayField(companion, "affected_object_refs", [
      input.artifact_retention.artifact_ref,
      retainedBasisRef,
    ]);
  }
  if (input.kind === "REMEDIATION_TASK") {
    companion = bindArrayField(companion, "provenance_refs", [retainedBasisRef]);
  }
  if (input.kind === "COMPENSATION_RECORD") {
    companion = bindArrayField(companion, "target_object_refs", [
      input.artifact_retention.artifact_ref,
      retainedBasisRef,
    ]);
  }
  if (input.kind === "ACCEPTED_RISK_APPROVAL") {
    companion = bindArrayField(companion, "bounded_scope_refs", [
      input.artifact_retention.artifact_ref,
      retainedBasisRef,
    ]);
  }
  if (input.kind === "FAILURE_INVESTIGATION") {
    companion = bindArrayField(companion, "provenance_refs", [
      input.artifact_retention.artifact_ref,
      retainedBasisRef,
    ]);
  }

  assertRetention(
    companion.artifact_retention_ref === input.artifact_retention.retention_id &&
      companion.retention_class === input.artifact_retention.retention_class,
    "RETENTION_FIELD_INVALID",
    "retention companion binding must preserve exact artifact retention ref and class",
  );

  return companion as BoundRetentionCompanion<T>;
}
