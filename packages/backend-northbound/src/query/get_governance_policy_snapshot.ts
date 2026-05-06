import {
  normalizeGovernancePolicySnapshotRecord,
  type GovernancePolicySnapshotRecord,
} from "../../../backend-access/src/models/governance_policy_snapshot.ts";
import {
  GovernancePolicySnapshotRepository,
  type StoredGovernancePolicySnapshotRecord,
} from "../../../backend-access/src/repositories/governance_policy_snapshot_repository.ts";
import { buildTenantConfigWorkspace } from "../../../backend-governance/src/services/build_tenant_config_workspace.ts";
import {
  governanceRefOrUndefined,
  type GovernanceReadQueryInput,
} from "../services/normalize_governance_query_filters.ts";

export { GovernancePolicySnapshotRepository };
export type { GovernancePolicySnapshotRecord, StoredGovernancePolicySnapshotRecord };

export type GovernancePolicySnapshotRepositoryLike = {
  listSnapshotsByTenantId: (
    tenantId: string,
  ) =>
    | Promise<StoredGovernancePolicySnapshotRecord[]>
    | StoredGovernancePolicySnapshotRecord[];
};

export class GovernancePolicySnapshotPublicationError extends Error {
  readonly reasonCodes: string[];

  constructor(detail: string, reasonCodes: readonly string[]) {
    super(`GOVERNANCE_POLICY_SNAPSHOT_INVALID: ${detail}`);
    this.name = "GovernancePolicySnapshotPublicationError";
    this.reasonCodes = [...reasonCodes];
  }
}

const policySectionCodes = new Set<
  GovernancePolicySnapshotRecord["tenant_config_workspace"]["active_section_code"]
>([
  "TENANT_PROFILE",
  "SECURITY_POSTURE",
  "AUTHORITY_AND_ENVIRONMENTS",
  "CONNECTOR_POLICY",
  "APPROVAL_AND_CHANGE_CONTROL",
  "NOTIFICATIONS_AND_EVIDENCE",
]);

export function validateGovernancePolicySnapshotPublication(
  snapshot: GovernancePolicySnapshotRecord,
) {
  const normalized = normalizeGovernancePolicySnapshotRecord(snapshot);
  if (normalized.environment_bindings.length === 0) {
    throw new GovernancePolicySnapshotPublicationError(
      "environment_bindings must not be empty",
      ["GOVERNANCE_POLICY_ENVIRONMENT_BINDINGS_EMPTY"],
    );
  }
  if (normalized.step_up_rules.length === 0) {
    throw new GovernancePolicySnapshotPublicationError(
      "step_up_rules must not be empty",
      ["GOVERNANCE_POLICY_STEP_UP_RULES_EMPTY"],
    );
  }
  if (
    normalized.approval_rules.some((rule) => rule.approval_required) &&
    !normalized.session_security_posture.step_up_rotation_required
  ) {
    throw new GovernancePolicySnapshotPublicationError(
      "approval-required policy snapshots must keep step-up rotation explicit",
      ["GOVERNANCE_POLICY_APPROVAL_WITHOUT_STEP_UP_ROTATION"],
    );
  }
  if (
    normalized.change_basket.staged_change_groups.length > 0 &&
    normalized.blast_radius_panel.panel_state === "EMPTY"
  ) {
    throw new GovernancePolicySnapshotPublicationError(
      "staged governance changes require a visible blast-radius panel posture",
      ["GOVERNANCE_POLICY_STAGED_CHANGE_WITHOUT_BLAST_RADIUS"],
    );
  }
  return normalized;
}

function applyPolicyQueryContinuity(input: {
  query?: GovernanceReadQueryInput;
  snapshot: GovernancePolicySnapshotRecord;
}) {
  const snapshot = structuredClone(input.snapshot);
  const activeSection = governanceRefOrUndefined(input.query, [
    "active_section_code",
    "activeSectionCode",
    "section",
  ]);
  if (activeSection !== undefined && activeSection !== null) {
    if (
      !policySectionCodes.has(
        activeSection as GovernancePolicySnapshotRecord["tenant_config_workspace"]["active_section_code"],
      )
    ) {
      throw new GovernancePolicySnapshotPublicationError(
        `unsupported active section ${activeSection}`,
        ["GOVERNANCE_POLICY_ACTIVE_SECTION_INVALID"],
      );
    }
    snapshot.tenant_config_workspace = buildTenantConfigWorkspace({
      activeSectionCode: activeSection,
      previousWorkspace: snapshot.tenant_config_workspace,
    });
  }
  return validateGovernancePolicySnapshotPublication(snapshot);
}

export async function getGovernancePolicySnapshot(input: {
  governancePolicySnapshotRepository: GovernancePolicySnapshotRepositoryLike;
  query?: GovernanceReadQueryInput;
  tenantId: string;
}) {
  const snapshots = await input.governancePolicySnapshotRepository.listSnapshotsByTenantId(
    input.tenantId,
  );
  const current = snapshots
    .sort((left, right) => left.persisted_at.localeCompare(right.persisted_at))
    .at(-1);
  if (!current) {
    return null;
  }
  return {
    ...current,
    snapshot: applyPolicyQueryContinuity({
      query: input.query,
      snapshot: current.snapshot,
    }),
  } satisfies StoredGovernancePolicySnapshotRecord;
}
