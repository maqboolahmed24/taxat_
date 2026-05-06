import type {
  TenantGovernanceSnapshot,
} from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";

export type GovernanceFamilyCode =
  | "PENDING_APPROVALS"
  | "CONFIGURATION_DRIFT"
  | "AUTHORITY_LINK_RISK"
  | "RETENTION_EXCEPTION"
  | "AUDIT_HOTSPOT";

export type GovernanceQueueCode = TenantGovernanceSnapshot["primary_queue_code"];

export type GovernanceFamilyScoreSource = {
  criticalOpenCount?: number | undefined;
  family: GovernanceFamilyCode;
  noisePenalty?: boolean | undefined;
  oldestOpenAgeHours?: number | undefined;
  openCount: number;
  requiresOperatorAction?: boolean | undefined;
};

export type GovernanceFamilyScore = {
  critical_open_count: number;
  family: GovernanceFamilyCode;
  family_base: number;
  noise_penalty: 0 | 1;
  oldest_age_bucket: number;
  oldest_open_age_hours: number;
  open_count: number;
  previous_primary_bonus: 0 | 8;
  requires_operator_action: 0 | 1;
  score: number;
};

export type DerivedGovernanceFamilyScores = {
  calm: boolean;
  dominance_margin: number | null;
  family_scores: GovernanceFamilyScore[];
  hysteresis_retained: boolean;
  leading_family: GovernanceFamilyCode | null;
  previous_primary_family: GovernanceFamilyCode | null;
  previous_primary_family_still_live: boolean;
  primary_family: GovernanceFamilyCode | null;
};

export class GovernanceFamilyScoreError extends Error {
  constructor(detail: string) {
    super(`GOVERNANCE_FAMILY_SCORE_INVALID: ${detail}`);
    this.name = "GovernanceFamilyScoreError";
  }
}

export const governanceFamilyOrder = [
  "PENDING_APPROVALS",
  "CONFIGURATION_DRIFT",
  "AUTHORITY_LINK_RISK",
  "RETENTION_EXCEPTION",
  "AUDIT_HOTSPOT",
] as const satisfies readonly GovernanceFamilyCode[];

export const governanceQueueOrder = [
  "PENDING_APPROVALS",
  "CONFIGURATION_DRIFT",
  "AUTHORITY_LINK_RISKS",
  "RETENTION_EXCEPTIONS",
  "AUDIT_HOTSPOTS",
] as const satisfies readonly GovernanceQueueCode[];

export const governanceFamilyBaseScore = {
  AUDIT_HOTSPOT: 300,
  AUTHORITY_LINK_RISK: 380,
  CONFIGURATION_DRIFT: 420,
  PENDING_APPROVALS: 500,
  RETENTION_EXCEPTION: 340,
} as const satisfies Record<GovernanceFamilyCode, number>;

export const governanceFamilyToQueueCode = {
  AUDIT_HOTSPOT: "AUDIT_HOTSPOTS",
  AUTHORITY_LINK_RISK: "AUTHORITY_LINK_RISKS",
  CONFIGURATION_DRIFT: "CONFIGURATION_DRIFT",
  PENDING_APPROVALS: "PENDING_APPROVALS",
  RETENTION_EXCEPTION: "RETENTION_EXCEPTIONS",
} as const satisfies Record<GovernanceFamilyCode, GovernanceQueueCode>;

export const governanceQueueToFamilyCode = {
  AUDIT_HOTSPOTS: "AUDIT_HOTSPOT",
  AUTHORITY_LINK_RISKS: "AUTHORITY_LINK_RISK",
  CONFIGURATION_DRIFT: "CONFIGURATION_DRIFT",
  PENDING_APPROVALS: "PENDING_APPROVALS",
  RETENTION_EXCEPTIONS: "RETENTION_EXCEPTION",
} as const satisfies Record<GovernanceQueueCode, GovernanceFamilyCode>;

export function governanceFamilyFromPreviousSnapshot(
  previousSnapshot: TenantGovernanceSnapshot | null | undefined,
): GovernanceFamilyCode | null {
  if (!previousSnapshot) {
    return null;
  }
  if (previousSnapshot.attention_summary.attention_family !== "CALM") {
    return previousSnapshot.attention_summary.attention_family;
  }
  return governanceQueueToFamilyCode[previousSnapshot.primary_queue_code] ?? null;
}

function assertNonNegativeInteger(label: string, value: number) {
  if (!Number.isInteger(value) || value < 0) {
    throw new GovernanceFamilyScoreError(`${label} must be a non-negative integer`);
  }
  return value;
}

function assertNonNegativeFiniteNumber(label: string, value: number) {
  if (!Number.isFinite(value) || value < 0) {
    throw new GovernanceFamilyScoreError(`${label} must be a non-negative finite number`);
  }
  return value;
}

function normalizeSources(sources: readonly GovernanceFamilyScoreSource[]) {
  const byFamily = new Map<GovernanceFamilyCode, GovernanceFamilyScoreSource>();
  for (const source of sources) {
    if (byFamily.has(source.family)) {
      throw new GovernanceFamilyScoreError(`duplicate family source ${source.family}`);
    }
    byFamily.set(source.family, source);
  }
  for (const family of governanceFamilyOrder) {
    if (!byFamily.has(family)) {
      throw new GovernanceFamilyScoreError(`missing family source ${family}`);
    }
  }
  return governanceFamilyOrder.map((family) => byFamily.get(family)!);
}

export function oldestGovernanceAgeBucket(oldestOpenAgeHours: number) {
  return Math.min(Math.floor(assertNonNegativeFiniteNumber("oldestOpenAgeHours", oldestOpenAgeHours) / 8), 6);
}

export function deriveGovernanceFamilyScores(input: {
  familySources: readonly GovernanceFamilyScoreSource[];
  previousPrimaryFamily?: GovernanceFamilyCode | null | undefined;
  previousSnapshot?: TenantGovernanceSnapshot | null | undefined;
}): DerivedGovernanceFamilyScores {
  const previousPrimaryFamily =
    input.previousPrimaryFamily ?? governanceFamilyFromPreviousSnapshot(input.previousSnapshot);
  const familyScores = normalizeSources(input.familySources).map((source) => {
    const openCount = assertNonNegativeInteger(`${source.family}.openCount`, source.openCount);
    const criticalOpenCount = assertNonNegativeInteger(
      `${source.family}.criticalOpenCount`,
      source.criticalOpenCount ?? 0,
    );
    if (criticalOpenCount > openCount) {
      throw new GovernanceFamilyScoreError(
        `${source.family}.criticalOpenCount must not exceed openCount`,
      );
    }
    const oldestOpenAgeHours =
      openCount === 0
        ? 0
        : assertNonNegativeFiniteNumber(
            `${source.family}.oldestOpenAgeHours`,
            source.oldestOpenAgeHours ?? 0,
          );
    const oldestAgeBucket = oldestGovernanceAgeBucket(oldestOpenAgeHours);
    const requiresOperatorAction = source.requiresOperatorAction ? 1 : 0;
    const previousPrimaryBonus = source.family === previousPrimaryFamily ? 8 : 0;
    const noisePenalty = source.noisePenalty ? 1 : 0;
    const familyBase = governanceFamilyBaseScore[source.family];
    return {
      critical_open_count: criticalOpenCount,
      family: source.family,
      family_base: familyBase,
      noise_penalty: noisePenalty,
      oldest_age_bucket: oldestAgeBucket,
      oldest_open_age_hours: oldestOpenAgeHours,
      open_count: openCount,
      previous_primary_bonus: previousPrimaryBonus,
      requires_operator_action: requiresOperatorAction,
      score:
        familyBase +
        25 * criticalOpenCount +
        6 * Math.min(openCount, 9) +
        4 * oldestAgeBucket +
        10 * requiresOperatorAction +
        previousPrimaryBonus -
        8 * noisePenalty,
    } satisfies GovernanceFamilyScore;
  });

  const liveFamilyScores = familyScores.filter((score) => score.open_count > 0);
  if (liveFamilyScores.length === 0) {
    return {
      calm: true,
      dominance_margin: null,
      family_scores: familyScores,
      hysteresis_retained: false,
      leading_family: null,
      previous_primary_family: previousPrimaryFamily,
      previous_primary_family_still_live: false,
      primary_family: null,
    };
  }

  const rankedLiveFamilies = [...liveFamilyScores].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }
    return governanceFamilyOrder.indexOf(left.family) - governanceFamilyOrder.indexOf(right.family);
  });
  const leading = rankedLiveFamilies[0]!;
  const previousScore =
    previousPrimaryFamily === null
      ? undefined
      : liveFamilyScores.find((score) => score.family === previousPrimaryFamily);
  const dominanceMargin =
    previousScore && previousScore.family !== leading.family
      ? leading.score - previousScore.score
      : rankedLiveFamilies.length > 1
        ? leading.score - rankedLiveFamilies[1]!.score
        : null;
  const retainPrevious =
    previousScore !== undefined &&
    previousScore.family !== leading.family &&
    leading.score - previousScore.score < 20;

  return {
    calm: false,
    dominance_margin: dominanceMargin,
    family_scores: familyScores,
    hysteresis_retained: retainPrevious,
    leading_family: leading.family,
    previous_primary_family: previousPrimaryFamily,
    previous_primary_family_still_live: previousScore !== undefined,
    primary_family: retainPrevious ? previousScore.family : leading.family,
  };
}
