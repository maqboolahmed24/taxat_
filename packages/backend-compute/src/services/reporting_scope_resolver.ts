import {
  deriveScopeFamily,
  normalizeScopeSequence,
  type CanonicalScopeToken,
} from "../../../backend-access/src/services/principal_context_normalizer.ts";

export type ComputeReportingScope = "year_end" | "quarterly_update" | "estimate_only";

export type ReportingScopeResolution = {
  reporting_scope: ComputeReportingScope;
  runtime_scope: CanonicalScopeToken[];
};

export class ReportingScopeResolverError extends Error {
  readonly code:
    | "COMPUTE_REPORTING_SCOPE_INVALID"
    | "COMPUTE_REPORTING_SCOPE_MISSING"
    | "COMPUTE_REPORTING_SCOPE_MULTIPLE";

  constructor(code: ReportingScopeResolverError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ReportingScopeResolverError";
    this.code = code;
  }
}

const REPORTING_SCOPE_TOKENS = new Set<string>(["year_end", "quarterly_update", "estimate_only"]);

export function resolveReportingScope(runtimeScope: readonly string[]): ReportingScopeResolution {
  const normalized = normalizeScopeSequence("compute.runtime_scope", runtimeScope);
  const reportingTokens = normalized.filter((token) => REPORTING_SCOPE_TOKENS.has(token));

  if (reportingTokens.length === 0) {
    throw new ReportingScopeResolverError(
      "COMPUTE_REPORTING_SCOPE_MISSING",
      "runtime_scope must contain exactly one reporting-scope token",
    );
  }
  if (reportingTokens.length > 1) {
    throw new ReportingScopeResolverError(
      "COMPUTE_REPORTING_SCOPE_MULTIPLE",
      "runtime_scope cannot contain multiple reporting-scope tokens",
    );
  }

  const reportingScope = reportingTokens[0] as ComputeReportingScope;
  const scopeFamily = deriveScopeFamily(normalized);
  if (scopeFamily === null) {
    throw new ReportingScopeResolverError(
      "COMPUTE_REPORTING_SCOPE_INVALID",
      "runtime_scope combines reporting and action tokens in an unsupported posture",
    );
  }
  if (
    (normalized.includes("amendment_intent") || normalized.includes("amendment_submit")) &&
    reportingScope !== "year_end"
  ) {
    throw new ReportingScopeResolverError(
      "COMPUTE_REPORTING_SCOPE_INVALID",
      "amendment posture must resolve to the year_end reporting basis",
    );
  }

  return {
    reporting_scope: reportingScope,
    runtime_scope: normalized,
  };
}
