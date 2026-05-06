import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  buildFailureLifecycleDashboard as buildWorkflowFailureLifecycleDashboard,
  type AcceptedRiskApproval,
  type BuildFailureLifecycleDashboardInput as WorkflowBuildFailureLifecycleDashboardInput,
  type CompensationRecord,
  type FailureAcceptedRiskAccountableOwner,
  type FailureBlockingClass,
  type FailureClosureResolutionState,
  type FailureCompanionOwnerType,
  type FailureInvestigation,
  type FailureLifecycleDashboard,
  type FailureLifecycleDashboardRepository,
  type FailureLifecycleErrorSource,
  type FailureLifecycleWorkflowSource,
  type RemediationTask,
} from "../../../backend-workflow/src/index.ts";

export class FailureLifecycleDashboardProjectionError extends Error {
  readonly code:
    | "FAILURE_LIFECYCLE_DASHBOARD_EMPTY_LINEAGE"
    | "FAILURE_LIFECYCLE_DASHBOARD_FIELD_INVALID"
    | "FAILURE_LIFECYCLE_DASHBOARD_LINEAGE_DRIFT";

  constructor(code: FailureLifecycleDashboardProjectionError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "FailureLifecycleDashboardProjectionError";
    this.code = code;
  }
}

export type FailureLifecycleErrorResolutionState =
  | "OPEN"
  | "IN_PROGRESS"
  | "MONITORING"
  | "RESOLVED"
  | "ACCEPTED_RISK"
  | "SUPERSEDED"
  | "CANCELLED";

export type FailureLifecycleErrorRecord = {
  affected_object_refs?: readonly string[] | undefined;
  audit_refs?: readonly string[] | undefined;
  blocking_class?: FailureBlockingClass | undefined;
  caused_by_error_id?: string | null | undefined;
  closure_evidence_refs?: readonly string[] | undefined;
  error_id: string;
  first_seen_at?: string | undefined;
  last_seen_at: string;
  manifest_id: string;
  next_retry_at?: string | null | undefined;
  opened_at: string;
  provenance_refs?: readonly string[] | undefined;
  reason_codes?: readonly string[] | undefined;
  remediation_owner_ref?: string | null | undefined;
  remediation_owner_type?: FailureCompanionOwnerType | undefined;
  reopened_by_error_id?: string | null | undefined;
  resolved_at?: string | null | undefined;
  resolved_by_task_id?: string | null | undefined;
  resolution_basis_ref?: string | null | undefined;
  resolution_state?: FailureLifecycleErrorResolutionState | undefined;
  root_manifest_id: string;
  workflow_item_id?: string | null | undefined;
};

export type BuildFailureLifecycleDashboardProjectionInput = {
  accepted_risk_accountable_owners?:
    | readonly FailureAcceptedRiskAccountableOwner[]
    | undefined;
  accepted_risk_approvals?: readonly AcceptedRiskApproval[] | undefined;
  audit_refs?: readonly string[] | undefined;
  compensation_records?: readonly CompensationRecord[] | undefined;
  dashboard_id?: string | undefined;
  investigations?: readonly FailureInvestigation[] | undefined;
  lineage_error_records_in_order: readonly FailureLifecycleErrorRecord[];
  provenance_refs?: readonly string[] | undefined;
  remediation_tasks?: readonly RemediationTask[] | undefined;
  repository?: FailureLifecycleDashboardRepository | undefined;
  updated_at: string;
  workflow?: FailureLifecycleWorkflowSource | null | undefined;
};

function projectionError(
  code: FailureLifecycleDashboardProjectionError["code"],
  detail: string,
): never {
  throw new FailureLifecycleDashboardProjectionError(code, detail);
}

function requireString(label: string, value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    projectionError(
      "FAILURE_LIFECYCLE_DASHBOARD_FIELD_INVALID",
      `${label} must be a non-empty string`,
    );
  }
  return value.trim();
}

function optionalString(label: string, value: unknown) {
  if (value === undefined || value === null) {
    return null;
  }
  return requireString(label, value);
}

function uniqueSorted(label: string, values: readonly (string | null | undefined)[]) {
  const normalized = values
    .filter((value): value is string => value !== null && value !== undefined)
    .map((value) => requireString(`${label}[]`, value));
  return [...new Set(normalized)].sort((left, right) => left.localeCompare(right));
}

function orderedUnique(label: string, values: readonly string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = requireString(`${label}[]`, value);
    if (seen.has(normalized)) {
      projectionError(
        "FAILURE_LIFECYCLE_DASHBOARD_LINEAGE_DRIFT",
        `${label} must remain ordered and unique`,
      );
    }
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function latestTimestamp(label: string, values: readonly (string | null | undefined)[]) {
  return values
    .filter((value): value is string => value !== null && value !== undefined)
    .map((value) => normalizeUtcInstantString(value))
    .sort((left, right) => left.localeCompare(right))
    .at(-1) ?? projectionError(
      "FAILURE_LIFECYCLE_DASHBOARD_FIELD_INVALID",
      `${label} must contain at least one timestamp`,
    );
}

function earliestTimestamp(label: string, values: readonly (string | null | undefined)[]) {
  return values
    .filter((value): value is string => value !== null && value !== undefined)
    .map((value) => normalizeUtcInstantString(value))
    .sort((left, right) => left.localeCompare(right))[0] ?? projectionError(
      "FAILURE_LIFECYCLE_DASHBOARD_FIELD_INVALID",
      `${label} must contain at least one timestamp`,
    );
}

export function failureLifecycleErrorRef(record: Pick<FailureLifecycleErrorRecord, "error_id">) {
  return requireString("error_id", record.error_id);
}

function assertLineageLinks(lineage: readonly FailureLifecycleErrorRecord[]) {
  for (let index = 1; index < lineage.length; index += 1) {
    const previous = lineage[index - 1];
    const current = lineage[index];
    const previousRef = failureLifecycleErrorRef(previous);
    const currentRef = failureLifecycleErrorRef(current);
    const linkedByReopen = optionalString(
      "previous.reopened_by_error_id",
      previous.reopened_by_error_id,
    ) === currentRef;
    const linkedByCause = optionalString(
      "current.caused_by_error_id",
      current.caused_by_error_id,
    ) === previousRef;
    if (!linkedByReopen && !linkedByCause) {
      projectionError(
        "FAILURE_LIFECYCLE_DASHBOARD_LINEAGE_DRIFT",
        `lineage entry ${currentRef} must be linked from ${previousRef} by typed error lineage`,
      );
    }
  }
}

function normalizeLineage(
  records: readonly FailureLifecycleErrorRecord[],
): readonly FailureLifecycleErrorRecord[] {
  if (records.length === 0) {
    projectionError(
      "FAILURE_LIFECYCLE_DASHBOARD_EMPTY_LINEAGE",
      "lineage_error_records_in_order must contain at least one typed ErrorRecord",
    );
  }
  const refs = orderedUnique(
    "lineage_error_records_in_order.error_id",
    records.map(failureLifecycleErrorRef),
  );
  if (refs.length !== records.length) {
    projectionError(
      "FAILURE_LIFECYCLE_DASHBOARD_LINEAGE_DRIFT",
      "lineage_error_records_in_order must preserve every typed ErrorRecord once",
    );
  }
  assertLineageLinks(records);
  return records;
}

function currentSourceErrorFromLineage(
  lineage: readonly FailureLifecycleErrorRecord[],
): FailureLifecycleErrorSource {
  const root = lineage[0] ?? projectionError(
    "FAILURE_LIFECYCLE_DASHBOARD_EMPTY_LINEAGE",
    "lineage must contain a root error",
  );
  const current = lineage[lineage.length - 1] ?? root;
  const openedAt = earliestTimestamp("lineage.opened_at", [
    root.first_seen_at,
    root.opened_at,
  ]);
  return {
    affected_object_refs: uniqueSorted(
      "source_error.affected_object_refs",
      current.affected_object_refs ?? [],
    ),
    blocking_class: current.blocking_class ?? "NON_BLOCKING",
    closure_evidence_refs: uniqueSorted(
      "source_error.closure_evidence_refs",
      current.closure_evidence_refs ?? [],
    ),
    last_activity_at: latestTimestamp("source_error.last_activity_at", [
      current.opened_at,
      current.last_seen_at,
      current.resolved_at,
    ]),
    next_retry_at: current.next_retry_at ?? null,
    opened_at: openedAt,
    owner_ref: optionalString("source_error.owner_ref", current.remediation_owner_ref),
    owner_type: current.remediation_owner_type ?? "SYSTEM",
    reason_codes: uniqueSorted("source_error.reason_codes", current.reason_codes ?? []),
    resolution_basis_ref: optionalString(
      "source_error.resolution_basis_ref",
      current.resolution_basis_ref,
    ),
    resolution_state: (current.resolution_state ?? "OPEN") as FailureClosureResolutionState,
    resolved_at: current.resolved_at ?? null,
    resolved_by_task_id: optionalString(
      "source_error.resolved_by_task_id",
      current.resolved_by_task_id,
    ),
  };
}

function lineageRefs(records: readonly FailureLifecycleErrorRecord[]) {
  return records.map(failureLifecycleErrorRef);
}

function lineageAuditRefs(
  records: readonly FailureLifecycleErrorRecord[],
  explicit: readonly string[] | undefined,
) {
  return uniqueSorted("audit_refs", [
    ...(explicit ?? []),
    ...records.flatMap((record) => record.audit_refs ?? []),
  ]);
}

function lineageProvenanceRefs(
  records: readonly FailureLifecycleErrorRecord[],
  explicit: readonly string[] | undefined,
) {
  return uniqueSorted("provenance_refs", [
    ...(explicit ?? []),
    ...records.flatMap((record) => record.provenance_refs ?? []),
    ...records.flatMap((record) => record.closure_evidence_refs ?? []),
  ]);
}

function dashboardIdFor(input: {
  current_error_ref: string;
  root_error_ref: string;
}) {
  return `failure-dashboard://${stableJsonHash(input)}`;
}

export async function buildFailureLifecycleDashboard(
  input: BuildFailureLifecycleDashboardProjectionInput,
): Promise<FailureLifecycleDashboard> {
  const lineage = normalizeLineage(input.lineage_error_records_in_order);
  const root = lineage[0] ?? projectionError(
    "FAILURE_LIFECYCLE_DASHBOARD_EMPTY_LINEAGE",
    "lineage must contain a root error",
  );
  const current = lineage[lineage.length - 1] ?? root;
  const rootErrorRef = failureLifecycleErrorRef(root);
  const currentErrorRef = failureLifecycleErrorRef(current);
  const workflowInput: WorkflowBuildFailureLifecycleDashboardInput = {
    accepted_risk_accountable_owners: input.accepted_risk_accountable_owners,
    accepted_risk_approvals: input.accepted_risk_approvals,
    audit_refs: lineageAuditRefs(lineage, input.audit_refs),
    compensation_records: input.compensation_records,
    current_error_ref: currentErrorRef,
    dashboard_id:
      input.dashboard_id ??
      dashboardIdFor({
        current_error_ref: currentErrorRef,
        root_error_ref: rootErrorRef,
      }),
    investigations: input.investigations,
    lineage_error_refs_in_order: lineageRefs(lineage),
    manifest_id: requireString("current.manifest_id", current.manifest_id),
    provenance_refs: lineageProvenanceRefs(lineage, input.provenance_refs),
    remediation_tasks: input.remediation_tasks,
    repository: input.repository,
    root_error_ref: rootErrorRef,
    root_manifest_id: requireString("root.root_manifest_id", root.root_manifest_id),
    source_error: currentSourceErrorFromLineage(lineage),
    updated_at: normalizeUtcInstantString(input.updated_at),
    workflow: input.workflow ?? null,
  };
  return buildWorkflowFailureLifecycleDashboard(workflowInput);
}
