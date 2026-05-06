import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import { RiskReportSchemaLineage } from "../../../generated-models/src/generated/typescript/decisioning-and-nightly.ts";
import type { SchemaBundleArtifactContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";

export type RiskReportExecutionMode = "COMPLIANCE" | "ANALYSIS";
export type RiskFeatureFlagState =
  | "NONE"
  | "MATERIAL_UNRESOLVED"
  | "BLOCKING_UNRESOLVED";

export type RiskReportFeatureScoreRecord = {
  blocking_threshold: number;
  feature_code: string;
  feature_resolved: boolean;
  feature_value: number;
  feature_weight: number;
  flag_state: RiskFeatureFlagState;
  material_threshold: number;
};

export type RiskReportRecord = {
  analysis_only: boolean;
  artifact_type: "RiskReport";
  contract: SchemaBundleArtifactContract;
  counterfactual_basis: string | null;
  created_at: string;
  execution_mode: RiskReportExecutionMode;
  feature_scores: RiskReportFeatureScoreRecord[];
  flags: string[];
  manifest_id: string;
  non_compliance_config_refs: string[];
  risk_id: string;
  risk_score: number;
  risk_threshold_profile_ref: string;
  unresolved_blocking_risk_flag: boolean;
  unresolved_material_blocking_risk_flag: boolean;
};

export type RiskReportContractBuildInput = {
  risk_content_hash: string;
  risk_id: string;
  schema_bundle_hash?: string;
  writer_build_id?: string;
};

export class RiskReportModelError extends Error {
  readonly code:
    | "RISK_REPORT_ARTIFACT_TYPE_INVALID"
    | "RISK_REPORT_BOUNDARY_INVALID"
    | "RISK_REPORT_CONTRACT_INVALID"
    | "RISK_REPORT_FEATURE_DUPLICATE"
    | "RISK_REPORT_FEATURE_INVALID"
    | "RISK_REPORT_FIELD_REQUIRED"
    | "RISK_REPORT_FLAG_POSTURE_INVALID"
    | "RISK_REPORT_SCORE_INVALID";

  constructor(code: RiskReportModelError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "RiskReportModelError";
    this.code = code;
  }
}

const FLAG_ORDER = [
  "RISK_WEIGHT_PROFILE_INVALID",
  "BLOCKING_RISK_UNRESOLVED",
  "MATERIAL_RISK_UNRESOLVED",
];

function requireString(label: string, value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new RiskReportModelError(
      "RISK_REPORT_FIELD_REQUIRED",
      `${label} must be a non-empty string`,
    );
  }
  return value.trim().normalize("NFC");
}

function normalizeNullableString(label: string, value: string | null) {
  return value === null ? null : requireString(label, value);
}

function normalizeStringSet(label: string, values: readonly string[]) {
  return [...new Set(values.map((value) => requireString(label, value)))].sort();
}

function orderFlags(flags: readonly string[]) {
  const normalized = normalizeStringSet("risk_report.flags", flags);
  const present = new Set(normalized);
  return [
    ...FLAG_ORDER.filter((flag) => present.has(flag)),
    ...normalized.filter((flag) => !FLAG_ORDER.includes(flag)).sort(),
  ];
}

function normalizeExecutionMode(value: unknown): RiskReportExecutionMode {
  const normalized = requireString("risk_report.execution_mode", value);
  if (normalized !== "COMPLIANCE" && normalized !== "ANALYSIS") {
    throw new RiskReportModelError(
      "RISK_REPORT_BOUNDARY_INVALID",
      "execution_mode must be COMPLIANCE or ANALYSIS",
    );
  }
  return normalized;
}

function normalizeScore(value: number) {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new RiskReportModelError(
      "RISK_REPORT_SCORE_INVALID",
      "risk_score must be a finite number in [0,100]",
    );
  }
  return value;
}

function normalizeUnitInterval(label: string, value: number, options?: { exclusiveMinimum?: boolean }) {
  const lowerOk = options?.exclusiveMinimum === true ? value > 0 : value >= 0;
  if (!Number.isFinite(value) || !lowerOk || value > 1) {
    throw new RiskReportModelError(
      "RISK_REPORT_FEATURE_INVALID",
      `${label} must be finite and inside the schema interval`,
    );
  }
  return value;
}

function normalizeFeatureScores(features: readonly RiskReportFeatureScoreRecord[]) {
  const seen = new Set<string>();
  return features
    .map((feature) => {
      const featureCode = requireString("risk_report.feature_code", feature.feature_code);
      if (seen.has(featureCode)) {
        throw new RiskReportModelError(
          "RISK_REPORT_FEATURE_DUPLICATE",
          `duplicate feature_code ${featureCode}`,
        );
      }
      seen.add(featureCode);
      const materialThreshold = normalizeUnitInterval(
        "risk_report.material_threshold",
        feature.material_threshold,
        { exclusiveMinimum: true },
      );
      const blockingThreshold = normalizeUnitInterval(
        "risk_report.blocking_threshold",
        feature.blocking_threshold,
        { exclusiveMinimum: true },
      );
      if (blockingThreshold < materialThreshold) {
        throw new RiskReportModelError(
          "RISK_REPORT_FEATURE_INVALID",
          "blocking_threshold must be greater than or equal to material_threshold",
        );
      }
      if (!Number.isFinite(feature.feature_weight) || feature.feature_weight <= 0) {
        throw new RiskReportModelError(
          "RISK_REPORT_FEATURE_INVALID",
          "feature_weight must be positive",
        );
      }
      if (
        feature.flag_state !== "NONE" &&
        feature.flag_state !== "MATERIAL_UNRESOLVED" &&
        feature.flag_state !== "BLOCKING_UNRESOLVED"
      ) {
        throw new RiskReportModelError(
          "RISK_REPORT_FEATURE_INVALID",
          "flag_state is not allowed",
        );
      }
      if (feature.feature_resolved && feature.flag_state !== "NONE") {
        throw new RiskReportModelError(
          "RISK_REPORT_FLAG_POSTURE_INVALID",
          "resolved features must use flag_state NONE",
        );
      }
      if (!feature.feature_resolved && feature.flag_state === "NONE") {
        return {
          blocking_threshold: blockingThreshold,
          feature_code: featureCode,
          feature_resolved: false,
          feature_value: normalizeUnitInterval("risk_report.feature_value", feature.feature_value),
          feature_weight: feature.feature_weight,
          flag_state: "NONE" as const,
          material_threshold: materialThreshold,
        };
      }
      return {
        blocking_threshold: blockingThreshold,
        feature_code: featureCode,
        feature_resolved: feature.feature_resolved,
        feature_value: normalizeUnitInterval("risk_report.feature_value", feature.feature_value),
        feature_weight: feature.feature_weight,
        flag_state: feature.flag_state,
        material_threshold: materialThreshold,
      };
    })
    .sort((left, right) => left.feature_code.localeCompare(right.feature_code));
}

export function riskReportRef(record: Pick<RiskReportRecord, "risk_id">) {
  return `risk-report://${record.risk_id}`;
}

export function deriveRiskReportContentHash(record: Omit<RiskReportRecord, "contract">) {
  return `risk-report-content-hash://${stableJsonHash({
    artifact_family: "RISK_REPORT_CONTENT",
    payload: record,
  })}`;
}

export function buildRiskReportContract(
  input: RiskReportContractBuildInput,
): SchemaBundleArtifactContract {
  return {
    allowed_upgrade_kinds: ["PATCH_BACKWARD", "MINOR_BACKWARD"],
    artifact_content_hash: requireString(
      "risk_report.contract.artifact_content_hash",
      input.risk_content_hash,
    ),
    artifact_id: riskReportRef({ risk_id: input.risk_id }),
    artifact_type: "RiskReport",
    compatibility_class: "BACKWARD_COMPATIBLE",
    content_hash: RiskReportSchemaLineage.sourceHash,
    dialect_ref: "json-schema-draft-2020-12",
    schema_bundle_hash: requireString(
      "risk_report.contract.schema_bundle_hash",
      input.schema_bundle_hash ?? "schema.bundle.hash.compute.default",
    ),
    schema_id: RiskReportSchemaLineage.schemaId,
    semantic_version: "1.0.0",
    supersedes_schema_id: null,
    writer_build_id: requireString(
      "risk_report.contract.writer_build_id",
      input.writer_build_id ?? "build.taxat.compute.0123",
    ),
    writer_min_reader_version: "1.0.0",
  };
}

function enforceExecutionBoundary(record: RiskReportRecord) {
  if (record.execution_mode === "COMPLIANCE") {
    if (
      record.analysis_only !== false ||
      record.counterfactual_basis !== null ||
      record.non_compliance_config_refs.length !== 0
    ) {
      throw new RiskReportModelError(
        "RISK_REPORT_BOUNDARY_INVALID",
        "COMPLIANCE risk reports must not carry analysis-only posture",
      );
    }
    return;
  }
  if (record.analysis_only !== true || record.counterfactual_basis === null) {
    throw new RiskReportModelError(
      "RISK_REPORT_BOUNDARY_INVALID",
      "ANALYSIS risk reports require analysis_only=true and a counterfactual basis",
    );
  }
}

function enforceFlagPosture(record: RiskReportRecord) {
  const invalidProfile = record.flags.includes("RISK_WEIGHT_PROFILE_INVALID");
  if (invalidProfile) {
    if (
      record.risk_score !== 100 ||
      record.feature_scores.length !== 0 ||
      record.unresolved_material_blocking_risk_flag !== true ||
      record.unresolved_blocking_risk_flag !== false
    ) {
      throw new RiskReportModelError(
        "RISK_REPORT_FLAG_POSTURE_INVALID",
        "invalid weight profiles must use the schema-defined fail-closed posture",
      );
    }
    return;
  }
  if (record.feature_scores.length === 0) {
    throw new RiskReportModelError(
      "RISK_REPORT_FEATURE_INVALID",
      "non-invalid risk reports require at least one feature score",
    );
  }
  const hasBlockingFeature = record.feature_scores.some(
    (feature) => feature.flag_state === "BLOCKING_UNRESOLVED",
  );
  const hasMaterialFeature = record.feature_scores.some(
    (feature) =>
      feature.flag_state === "MATERIAL_UNRESOLVED" ||
      feature.flag_state === "BLOCKING_UNRESOLVED",
  );
  if (record.unresolved_blocking_risk_flag) {
    if (
      !record.unresolved_material_blocking_risk_flag ||
      !record.flags.includes("BLOCKING_RISK_UNRESOLVED") ||
      !hasBlockingFeature
    ) {
      throw new RiskReportModelError(
        "RISK_REPORT_FLAG_POSTURE_INVALID",
        "blocking posture must be mirrored by flags and feature rows",
      );
    }
  } else if (
    record.flags.includes("BLOCKING_RISK_UNRESOLVED") ||
    hasBlockingFeature
  ) {
    throw new RiskReportModelError(
      "RISK_REPORT_FLAG_POSTURE_INVALID",
      "non-blocking posture must not carry blocking flags",
    );
  }
  if (record.unresolved_material_blocking_risk_flag) {
    if (!hasMaterialFeature || !record.flags.includes("MATERIAL_RISK_UNRESOLVED")) {
      throw new RiskReportModelError(
        "RISK_REPORT_FLAG_POSTURE_INVALID",
        "material posture must be mirrored by flags and feature rows",
      );
    }
  } else if (hasMaterialFeature) {
    throw new RiskReportModelError(
      "RISK_REPORT_FLAG_POSTURE_INVALID",
      "clear posture must not carry material or blocking feature flags",
    );
  }
}

export function normalizeRiskReportRecord(input: RiskReportRecord): RiskReportRecord {
  if (input.artifact_type !== "RiskReport") {
    throw new RiskReportModelError(
      "RISK_REPORT_ARTIFACT_TYPE_INVALID",
      "artifact_type must be RiskReport",
    );
  }
  const executionMode = normalizeExecutionMode(input.execution_mode);
  const normalized: RiskReportRecord = {
    analysis_only: input.analysis_only,
    artifact_type: "RiskReport",
    contract: structuredClone(input.contract),
    counterfactual_basis: normalizeNullableString(
      "risk_report.counterfactual_basis",
      input.counterfactual_basis,
    ),
    created_at: normalizeUtcInstantString(input.created_at),
    execution_mode: executionMode,
    feature_scores: normalizeFeatureScores(input.feature_scores),
    flags: orderFlags(input.flags),
    manifest_id: requireString("risk_report.manifest_id", input.manifest_id),
    non_compliance_config_refs: normalizeStringSet(
      "risk_report.non_compliance_config_refs",
      input.non_compliance_config_refs,
    ),
    risk_id: requireString("risk_report.risk_id", input.risk_id),
    risk_score: normalizeScore(input.risk_score),
    risk_threshold_profile_ref: requireString(
      "risk_report.risk_threshold_profile_ref",
      input.risk_threshold_profile_ref,
    ),
    unresolved_blocking_risk_flag: input.unresolved_blocking_risk_flag,
    unresolved_material_blocking_risk_flag: input.unresolved_material_blocking_risk_flag,
  };
  enforceExecutionBoundary(normalized);
  enforceFlagPosture(normalized);
  if (
    normalized.contract.artifact_id !== riskReportRef(normalized) ||
    normalized.contract.artifact_type !== "RiskReport" ||
    normalized.contract.schema_id !== RiskReportSchemaLineage.schemaId
  ) {
    throw new RiskReportModelError(
      "RISK_REPORT_CONTRACT_INVALID",
      "contract must bind the RiskReport artifact",
    );
  }
  return normalized;
}

export function withRefreshedRiskReportContract(input: {
  risk_report: Omit<RiskReportRecord, "contract">;
  schema_bundle_hash?: string;
  writer_build_id?: string;
}) {
  const contentHash = deriveRiskReportContentHash(input.risk_report);
  return normalizeRiskReportRecord({
    ...input.risk_report,
    contract: buildRiskReportContract({
      risk_content_hash: contentHash,
      risk_id: input.risk_report.risk_id,
      ...(input.schema_bundle_hash === undefined
        ? {}
        : { schema_bundle_hash: input.schema_bundle_hash }),
      ...(input.writer_build_id === undefined ? {} : { writer_build_id: input.writer_build_id }),
    }),
  });
}

export function cloneRiskReportRecord(record: RiskReportRecord) {
  return structuredClone(record);
}
