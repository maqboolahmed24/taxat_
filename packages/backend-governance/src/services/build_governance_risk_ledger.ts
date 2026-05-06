import type {
  TenantGovernanceSnapshotRiskLedgerEntry,
} from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";
import {
  governanceFamilyOrder,
  governanceFamilyToQueueCode,
  governanceQueueOrder,
  type GovernanceFamilyCode,
} from "./derive_governance_family_scores.ts";

export type GovernanceRiskLedgerFamilySource = {
  affectedScopeLabel?: string | null | undefined;
  family: GovernanceFamilyCode;
  headline?: string | undefined;
  nextActionLabel?: string | null | undefined;
  openCount: number;
  worklistRef: string;
};

export class GovernanceRiskLedgerError extends Error {
  constructor(detail: string) {
    super(`GOVERNANCE_RISK_LEDGER_INVALID: ${detail}`);
    this.name = "GovernanceRiskLedgerError";
  }
}

export const governanceRiskLedgerHeadline = {
  AUDIT_HOTSPOT: "Audit hotspots",
  AUTHORITY_LINK_RISK: "Authority-link risks",
  CONFIGURATION_DRIFT: "Configuration drift",
  PENDING_APPROVALS: "Pending approvals",
  RETENTION_EXCEPTION: "Retention exceptions",
} as const satisfies Record<GovernanceFamilyCode, string>;

function requireNonEmptyString(label: string, value: string | null | undefined) {
  const normalized = (value ?? "").trim();
  if (normalized.length === 0) {
    throw new GovernanceRiskLedgerError(`${label} must be a non-empty string`);
  }
  return normalized;
}

function assertNonNegativeInteger(label: string, value: number) {
  if (!Number.isInteger(value) || value < 0) {
    throw new GovernanceRiskLedgerError(`${label} must be a non-negative integer`);
  }
  return value;
}

function sourceByFamily(sources: readonly GovernanceRiskLedgerFamilySource[]) {
  const byFamily = new Map<GovernanceFamilyCode, GovernanceRiskLedgerFamilySource>();
  for (const source of sources) {
    if (byFamily.has(source.family)) {
      throw new GovernanceRiskLedgerError(`duplicate family source ${source.family}`);
    }
    byFamily.set(source.family, source);
  }
  for (const family of governanceFamilyOrder) {
    if (!byFamily.has(family)) {
      throw new GovernanceRiskLedgerError(`missing family source ${family}`);
    }
  }
  return byFamily;
}

export function buildGovernanceRiskLedger(input: {
  familySources: readonly GovernanceRiskLedgerFamilySource[];
  primaryFamily: GovernanceFamilyCode;
}): TenantGovernanceSnapshotRiskLedgerEntry[] {
  const byFamily = sourceByFamily(input.familySources);
  const primaryQueueCode = governanceFamilyToQueueCode[input.primaryFamily];
  const queueOrder = [
    primaryQueueCode,
    ...governanceQueueOrder.filter((queueCode) => queueCode !== primaryQueueCode),
  ];

  return queueOrder.map((queueCode) => {
    const family = governanceFamilyOrder.find(
      (candidate) => governanceFamilyToQueueCode[candidate] === queueCode,
    )!;
    const source = byFamily.get(family)!;
    const openCount = assertNonNegativeInteger(`${family}.openCount`, source.openCount);
    return {
      affected_scope_label:
        openCount === 0
          ? null
          : requireNonEmptyString(`${family}.affectedScopeLabel`, source.affectedScopeLabel),
      headline: requireNonEmptyString(
        `${family}.headline`,
        source.headline ?? governanceRiskLedgerHeadline[family],
      ),
      next_action_label:
        openCount === 0
          ? null
          : requireNonEmptyString(`${family}.nextActionLabel`, source.nextActionLabel),
      open_count: openCount,
      queue_code: queueCode,
      worklist_ref: requireNonEmptyString(`${family}.worklistRef`, source.worklistRef),
    } satisfies TenantGovernanceSnapshotRiskLedgerEntry;
  });
}
