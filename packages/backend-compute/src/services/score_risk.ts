import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import type { ComputeResultRecord } from "../models/compute_result.ts";
import {
  withRefreshedRiskReportContract,
  type RiskReportExecutionMode,
  type RiskReportFeatureScoreRecord,
  type RiskReportRecord,
} from "../models/risk_report.ts";
import type {
  RiskReportRepository,
  StoredRiskReportRecord,
} from "../repositories/risk_report_repository.ts";
import { RiskFeatureRegistry, type RiskFeatureContext } from "./risk_feature_registry.ts";
import {
  deriveRiskFlags,
  invalidRiskWeightProfileFlags,
  type RiskFeatureScoreCandidate,
} from "./risk_flag_deriver.ts";
import {
  canonicalRiskThresholdProfileHash,
  compensatedSum,
  resolveRiskThresholdProfile,
  roundScore,
  RiskThresholdProfileResolverError,
  type RiskThresholdProfile,
} from "./risk_threshold_profile_resolver.ts";

export type ScoreRiskInput = {
  compute_result?: ComputeResultRecord;
  counterfactual_basis?: string | null;
  created_at: string;
  execution_mode: RiskReportExecutionMode;
  feature_context?: RiskFeatureContext;
  feature_registry?: RiskFeatureRegistry;
  manifest_id?: string;
  non_compliance_config_refs?: readonly string[];
  persisted_at?: string;
  repository?: RiskReportRepository;
  risk_id?: string;
  risk_threshold_profile: RiskThresholdProfile;
  schema_bundle_hash?: string;
  writer_build_id?: string;
};

export type ScoreRiskResult = {
  risk_report: RiskReportRecord;
  stored_risk_report: StoredRiskReportRecord | null;
};

export class ScoreRiskError extends Error {
  readonly code:
    | "RISK_ANALYSIS_BASIS_REQUIRED"
    | "RISK_COMPLIANCE_COUNTERFACTUAL_REJECTED"
    | "RISK_COMPUTE_BASIS_INVALID"
    | "RISK_FEATURE_EXTRACTOR_INVALID"
    | "RISK_MANIFEST_REQUIRED";

  constructor(code: ScoreRiskError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ScoreRiskError";
    this.code = code;
  }
}

type RiskExecutionBoundary = {
  analysis_only: boolean;
  counterfactual_basis: string | null;
  manifest_id: string;
  non_compliance_config_refs: string[];
};

function requireBoundaryString(label: string, value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ScoreRiskError("RISK_MANIFEST_REQUIRED", `${label} must be a non-empty string`);
  }
  return value.trim().normalize("NFC");
}

function normalizeStringSet(values: readonly string[]) {
  return [...new Set(values.map((value) => requireBoundaryString("risk.boundary.ref", value)))].sort();
}

function enforceRiskExecutionBoundary(input: {
  compute_result?: ComputeResultRecord;
  counterfactual_basis?: string | null;
  execution_mode: RiskReportExecutionMode;
  manifest_id?: string;
  non_compliance_config_refs?: readonly string[];
}): RiskExecutionBoundary {
  if (
    input.compute_result &&
    input.compute_result.lifecycle_state !== "COMPUTED" &&
    input.compute_result.lifecycle_state !== "SUPERSEDED"
  ) {
    throw new ScoreRiskError(
      "RISK_COMPUTE_BASIS_INVALID",
      "risk scoring requires a computed or historically superseded compute basis",
    );
  }
  const manifestId =
    input.manifest_id ??
    input.compute_result?.manifest_id;
  if (manifestId === undefined) {
    throw new ScoreRiskError(
      "RISK_MANIFEST_REQUIRED",
      "risk scoring requires manifest_id or compute_result.manifest_id",
    );
  }
  if (input.execution_mode === "COMPLIANCE") {
    if (
      input.counterfactual_basis !== undefined &&
      input.counterfactual_basis !== null
    ) {
      throw new ScoreRiskError(
        "RISK_COMPLIANCE_COUNTERFACTUAL_REJECTED",
        "COMPLIANCE risk scoring cannot carry a counterfactual basis",
      );
    }
    if (
      input.compute_result &&
      (input.compute_result.execution_mode !== "COMPLIANCE" ||
        input.compute_result.analysis_only !== false)
    ) {
      throw new ScoreRiskError(
        "RISK_COMPUTE_BASIS_INVALID",
        "COMPLIANCE risk scoring requires a compliance compute basis",
      );
    }
    if ((input.non_compliance_config_refs ?? []).length > 0) {
      throw new ScoreRiskError(
        "RISK_COMPLIANCE_COUNTERFACTUAL_REJECTED",
        "COMPLIANCE risk scoring cannot carry non-compliance config refs",
      );
    }
    return {
      analysis_only: false,
      counterfactual_basis: null,
      manifest_id: requireBoundaryString("risk.manifest_id", manifestId),
      non_compliance_config_refs: [],
    };
  }
  const counterfactualBasis =
    input.counterfactual_basis ??
    input.compute_result?.counterfactual_basis ??
    null;
  if (typeof counterfactualBasis !== "string" || counterfactualBasis.trim().length === 0) {
    throw new ScoreRiskError(
      "RISK_ANALYSIS_BASIS_REQUIRED",
      "ANALYSIS risk scoring requires a declared counterfactual basis",
    );
  }
  return {
    analysis_only: true,
    counterfactual_basis: counterfactualBasis.trim().normalize("NFC"),
    manifest_id: requireBoundaryString("risk.manifest_id", manifestId),
    non_compliance_config_refs: normalizeStringSet([
      ...(input.compute_result?.non_compliance_config_refs ?? []),
      ...(input.non_compliance_config_refs ?? []),
    ]),
  };
}

function deterministicRiskId(input: {
  execution_mode: RiskReportExecutionMode;
  feature_scores: readonly RiskReportFeatureScoreRecord[];
  flags: readonly string[];
  manifest_id: string;
  risk_score: number;
  risk_threshold_profile: RiskThresholdProfile;
}) {
  return `risk.${stableJsonHash({
    execution_mode: input.execution_mode,
    feature_scores: input.feature_scores,
    flags: input.flags,
    manifest_id: input.manifest_id,
    risk_score: input.risk_score,
    risk_threshold_profile_hash: canonicalRiskThresholdProfileHash(input.risk_threshold_profile),
  })}`;
}

function invalidProfileRef(profile: RiskThresholdProfile) {
  return typeof profile.risk_threshold_profile_ref === "string" &&
    profile.risk_threshold_profile_ref.trim().length > 0
    ? profile.risk_threshold_profile_ref.trim().normalize("NFC")
    : "risk-threshold-profile://invalid";
}

function buildInvalidRiskReport(input: {
  boundary: RiskExecutionBoundary;
  created_at: string;
  execution_mode: RiskReportExecutionMode;
  risk_id?: string;
  risk_threshold_profile: RiskThresholdProfile;
  schema_bundle_hash?: string;
  writer_build_id?: string;
}) {
  const flags = invalidRiskWeightProfileFlags();
  const riskScore = 100;
  const riskId =
    input.risk_id ??
    deterministicRiskId({
      execution_mode: input.execution_mode,
      feature_scores: flags.feature_scores,
      flags: flags.flags,
      manifest_id: input.boundary.manifest_id,
      risk_score: riskScore,
      risk_threshold_profile: input.risk_threshold_profile,
    });
  return withRefreshedRiskReportContract({
    risk_report: {
      analysis_only: input.boundary.analysis_only,
      artifact_type: "RiskReport",
      counterfactual_basis: input.boundary.counterfactual_basis,
      created_at: normalizeUtcInstantString(input.created_at),
      execution_mode: input.execution_mode,
      feature_scores: flags.feature_scores,
      flags: flags.flags,
      manifest_id: input.boundary.manifest_id,
      non_compliance_config_refs: input.boundary.non_compliance_config_refs,
      risk_id: riskId,
      risk_score: riskScore,
      risk_threshold_profile_ref: invalidProfileRef(input.risk_threshold_profile),
      unresolved_blocking_risk_flag: flags.unresolved_blocking_risk_flag,
      unresolved_material_blocking_risk_flag: flags.unresolved_material_blocking_risk_flag,
    },
    ...(input.schema_bundle_hash === undefined ? {} : { schema_bundle_hash: input.schema_bundle_hash }),
    ...(input.writer_build_id === undefined ? {} : { writer_build_id: input.writer_build_id }),
  });
}

function buildFeatureCandidates(input: {
  compute_result?: ComputeResultRecord;
  context?: RiskFeatureContext;
  profile: ReturnType<typeof resolveRiskThresholdProfile>;
  registry: RiskFeatureRegistry;
}) {
  const context: RiskFeatureContext = {
    ...(input.context ?? {}),
    ...(input.compute_result === undefined ? {} : { compute_result: input.compute_result }),
  };
  return input.profile.features.map<RiskFeatureScoreCandidate>((feature) => {
    const extracted = input.registry.extract({ context, feature });
    return {
      blocking_threshold: feature.blocking_threshold,
      feature_code: feature.feature_code,
      feature_resolved: extracted.feature_resolved,
      feature_value: extracted.feature_value,
      feature_weight: feature.feature_weight,
      material_threshold: feature.material_threshold,
    };
  });
}

function scoreFeatures(candidates: readonly RiskFeatureScoreCandidate[]) {
  const weightedValue = compensatedSum(
    candidates.map((feature) => feature.feature_weight * feature.feature_value),
  );
  const totalWeight = compensatedSum(candidates.map((feature) => feature.feature_weight));
  if (totalWeight <= 0) {
    return 100;
  }
  return roundScore((100 * weightedValue) / totalWeight);
}

export async function scoreRisk(input: ScoreRiskInput): Promise<ScoreRiskResult> {
  const boundary = enforceRiskExecutionBoundary({
    execution_mode: input.execution_mode,
    ...(input.compute_result === undefined ? {} : { compute_result: input.compute_result }),
    ...(input.counterfactual_basis === undefined
      ? {}
      : { counterfactual_basis: input.counterfactual_basis }),
    ...(input.manifest_id === undefined ? {} : { manifest_id: input.manifest_id }),
    ...(input.non_compliance_config_refs === undefined
      ? {}
      : { non_compliance_config_refs: input.non_compliance_config_refs }),
  });
  let riskReport: RiskReportRecord;
  try {
    const profile = resolveRiskThresholdProfile(input.risk_threshold_profile);
    const candidates = buildFeatureCandidates({
      profile,
      registry: input.feature_registry ?? new RiskFeatureRegistry(),
      ...(input.compute_result === undefined ? {} : { compute_result: input.compute_result }),
      ...(input.feature_context === undefined ? {} : { context: input.feature_context }),
    });
    const flags = deriveRiskFlags(candidates);
    const riskScore = scoreFeatures(candidates);
    const riskId =
      input.risk_id ??
      deterministicRiskId({
        execution_mode: input.execution_mode,
        feature_scores: flags.feature_scores,
        flags: flags.flags,
        manifest_id: boundary.manifest_id,
        risk_score: riskScore,
        risk_threshold_profile: input.risk_threshold_profile,
      });
    riskReport = withRefreshedRiskReportContract({
      risk_report: {
        analysis_only: boundary.analysis_only,
        artifact_type: "RiskReport",
        counterfactual_basis: boundary.counterfactual_basis,
        created_at: normalizeUtcInstantString(input.created_at),
        execution_mode: input.execution_mode,
        feature_scores: flags.feature_scores,
        flags: flags.flags,
        manifest_id: boundary.manifest_id,
        non_compliance_config_refs: boundary.non_compliance_config_refs,
        risk_id: riskId,
        risk_score: riskScore,
        risk_threshold_profile_ref: profile.risk_threshold_profile_ref,
        unresolved_blocking_risk_flag: flags.unresolved_blocking_risk_flag,
        unresolved_material_blocking_risk_flag: flags.unresolved_material_blocking_risk_flag,
      },
      ...(input.schema_bundle_hash === undefined ? {} : { schema_bundle_hash: input.schema_bundle_hash }),
      ...(input.writer_build_id === undefined ? {} : { writer_build_id: input.writer_build_id }),
    });
  } catch (error) {
    if (!(error instanceof RiskThresholdProfileResolverError)) {
      throw new ScoreRiskError(
        "RISK_FEATURE_EXTRACTOR_INVALID",
        error instanceof Error ? error.message : "risk feature extraction failed",
      );
    }
    riskReport = buildInvalidRiskReport({
      boundary,
      created_at: input.created_at,
      execution_mode: input.execution_mode,
      risk_threshold_profile: input.risk_threshold_profile,
      ...(input.risk_id === undefined ? {} : { risk_id: input.risk_id }),
      ...(input.schema_bundle_hash === undefined ? {} : { schema_bundle_hash: input.schema_bundle_hash }),
      ...(input.writer_build_id === undefined ? {} : { writer_build_id: input.writer_build_id }),
    });
  }
  const stored = input.repository
    ? await input.repository.persistRiskReport({
        persisted_at: input.persisted_at ?? riskReport.created_at,
        risk_report: riskReport,
      })
    : null;
  return { risk_report: riskReport, stored_risk_report: stored };
}
