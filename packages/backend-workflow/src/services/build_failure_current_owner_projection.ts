import {
  assertFailureEnum,
  assertOwnerReference,
  failureCompanionError,
  normalizeNullableFailureString,
  requireFailureString,
} from "../models/failure_companion_common.ts";
import {
  type FailureLifecycleDashboardCurrentOwner,
  type FailureLifecycleDashboardOwnerType,
  type FailureLifecycleDashboardSourceArtifactType,
} from "../models/failure_lifecycle_dashboard.ts";

export type FailureCurrentOwnerCandidate = {
  active: boolean;
  owner_ref_or_null: string | null;
  owner_type: FailureLifecycleDashboardOwnerType;
  precedence: number;
  source_artifact_type: FailureLifecycleDashboardSourceArtifactType;
  source_ref: string;
};

const OWNER_TYPES = [
  "SYSTEM",
  "SERVICE_OPERATOR",
  "REVIEWER",
  "APPROVER",
  "CLIENT",
  "TENANT_ADMIN",
  "SECURITY_OPERATOR",
] as const satisfies readonly FailureLifecycleDashboardOwnerType[];
const SOURCE_TYPES = [
  "ERROR_RECORD",
  "REMEDIATION_TASK",
  "COMPENSATION_RECORD",
  "FAILURE_INVESTIGATION",
  "ACCEPTED_RISK_APPROVAL",
  "WORKFLOW_ITEM",
] as const satisfies readonly FailureLifecycleDashboardSourceArtifactType[];

function normalizeCandidate(candidate: FailureCurrentOwnerCandidate) {
  const normalized = {
    active: candidate.active,
    owner_ref_or_null: normalizeNullableFailureString(
      "owner candidate owner_ref_or_null",
      candidate.owner_ref_or_null,
    ),
    owner_type: assertFailureEnum("owner candidate owner_type", candidate.owner_type, OWNER_TYPES),
    precedence: candidate.precedence,
    source_artifact_type: assertFailureEnum(
      "owner candidate source_artifact_type",
      candidate.source_artifact_type,
      SOURCE_TYPES,
    ),
    source_ref: requireFailureString("owner candidate source_ref", candidate.source_ref),
  };
  assertOwnerReference({
    label: "FailureLifecycleDashboard current_owner candidate",
    owner_ref: normalized.owner_ref_or_null,
    owner_type: normalized.owner_type,
  });
  return normalized;
}

export function buildFailureCurrentOwnerProjection(input: {
  candidates: readonly FailureCurrentOwnerCandidate[];
  fallback_error_ref: string;
}): FailureLifecycleDashboardCurrentOwner {
  const candidates = input.candidates.map(normalizeCandidate);
  const selected = candidates
    .filter((candidate) => candidate.active)
    .sort(
      (left, right) =>
        right.precedence - left.precedence || left.source_ref.localeCompare(right.source_ref),
    )[0];

  if (selected !== undefined) {
    return {
      owner_ref_or_null: selected.owner_ref_or_null,
      owner_type: selected.owner_type,
      source_artifact_type: selected.source_artifact_type,
      source_ref: selected.source_ref,
    };
  }

  const fallbackRef = requireFailureString("fallback_error_ref", input.fallback_error_ref);
  if (fallbackRef.length === 0) {
    failureCompanionError("fallback_error_ref is required");
  }
  return {
    owner_ref_or_null: null,
    owner_type: "SYSTEM",
    source_artifact_type: "ERROR_RECORD",
    source_ref: fallbackRef,
  };
}
