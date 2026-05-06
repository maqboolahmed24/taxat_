import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import type { ParityComparisonRequirement } from "../models/parity_result.ts";

export type CalculationBasisRecord = {
  artifact_type: "CalculationBasis";
  basis_hash: string;
  basis_payload_ref: string;
  basis_status: "PROVISIONAL" | "CONFIRMED" | "REJECTED" | "SUPERSEDED";
  calculation_basis_id: string;
  manifest_id: string;
  parity_reusable: boolean;
};

export type ComparisonBasisProviderProfile = {
  comparison_requirement_by_reporting_scope?: Record<string, ParityComparisonRequirement>;
  default_comparison_requirement?: ParityComparisonRequirement;
};

export type ComparisonBasisResolution = {
  calculation_basis: CalculationBasisRecord | null;
  comparison_basis_ref: string | null;
  comparison_basis_state:
    | "RESOLVED"
    | "MISSING"
    | "NOT_REQUIRED"
    | "NOT_REUSABLE"
    | "MANIFEST_MISMATCH"
    | "INVALID";
  comparison_requirement: ParityComparisonRequirement;
  reason_codes: string[];
};

export class ComparisonBasisResolverError extends Error {
  readonly code: "PARITY_COMPARISON_BASIS_INVALID_INPUT";

  constructor(code: ComparisonBasisResolverError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ComparisonBasisResolverError";
    this.code = code;
  }
}

function requireString(label: string, value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ComparisonBasisResolverError(
      "PARITY_COMPARISON_BASIS_INVALID_INPUT",
      `${label} must be a non-empty string`,
    );
  }
  return value.trim().normalize("NFC");
}

function normalizeRequirement(value: unknown): ParityComparisonRequirement {
  if (value === "MANDATORY" || value === "DESIRABLE" || value === "NOT_REQUIRED") {
    return value;
  }
  throw new ComparisonBasisResolverError(
    "PARITY_COMPARISON_BASIS_INVALID_INPUT",
    "comparison requirement must be MANDATORY, DESIRABLE, or NOT_REQUIRED",
  );
}

function defaultRequirementForScopes(scopes: readonly string[]) {
  const normalized = scopes.map((scope) => scope.trim().toLowerCase());
  if (
    normalized.some((scope) =>
      ["year_end", "year-end", "final_declaration", "final-declaration"].includes(scope),
    )
  ) {
    return "MANDATORY" as const;
  }
  if (normalized.some((scope) => ["quarterly_update", "quarterly-update", "in_year"].includes(scope))) {
    return "DESIRABLE" as const;
  }
  return "MANDATORY" as const;
}

function resolveRequirement(input: {
  provider_profile?: ComparisonBasisProviderProfile;
  reporting_scope: readonly string[];
}) {
  const byScope = input.provider_profile?.comparison_requirement_by_reporting_scope ?? {};
  for (const scope of input.reporting_scope) {
    const candidate = byScope[scope];
    if (candidate !== undefined) {
      return normalizeRequirement(candidate);
    }
  }
  if (input.provider_profile?.default_comparison_requirement !== undefined) {
    return normalizeRequirement(input.provider_profile.default_comparison_requirement);
  }
  return defaultRequirementForScopes(input.reporting_scope);
}

function missingBasisRef(input: { manifest_id: string; reporting_scope: readonly string[] }) {
  return `comparison-basis://missing/${stableJsonHash({
    manifest_id: input.manifest_id,
    reporting_scope: [...input.reporting_scope].sort(),
  })}`;
}

function calculationBasisRef(record: CalculationBasisRecord) {
  return `calculation-basis://${record.calculation_basis_id}`;
}

function failClosed(input: {
  calculation_basis: CalculationBasisRecord | null;
  comparison_basis_ref: string;
  comparison_basis_state: ComparisonBasisResolution["comparison_basis_state"];
  comparison_requirement: ParityComparisonRequirement;
  reason_code: string;
}) {
  return {
    calculation_basis: input.calculation_basis,
    comparison_basis_ref: input.comparison_basis_ref,
    comparison_basis_state: input.comparison_basis_state,
    comparison_requirement: input.comparison_requirement,
    reason_codes: [input.reason_code],
  };
}

export function resolveComparisonBasis(input: {
  calculation_basis?: CalculationBasisRecord | null;
  manifest_id: string;
  provider_profile?: ComparisonBasisProviderProfile;
  reporting_scope: readonly string[];
}): ComparisonBasisResolution {
  const manifestId = requireString("parity.manifest_id", input.manifest_id);
  const reportingScope = input.reporting_scope.map((scope) =>
    requireString("parity.reporting_scope", scope),
  );
  const requirement = resolveRequirement({
    ...(input.provider_profile === undefined ? {} : { provider_profile: input.provider_profile }),
    reporting_scope: reportingScope,
  });
  if (requirement === "NOT_REQUIRED") {
    return {
      calculation_basis: input.calculation_basis ?? null,
      comparison_basis_ref: null,
      comparison_basis_state: "NOT_REQUIRED",
      comparison_requirement: "NOT_REQUIRED",
      reason_codes: [],
    };
  }
  const basis = input.calculation_basis ?? null;
  if (basis === null) {
    return failClosed({
      calculation_basis: null,
      comparison_basis_ref: missingBasisRef({ manifest_id: manifestId, reporting_scope: reportingScope }),
      comparison_basis_state: "MISSING",
      comparison_requirement: requirement,
      reason_code: "PARITY_COMPARISON_BASIS_MISSING",
    });
  }
  if (basis.artifact_type !== "CalculationBasis") {
    return failClosed({
      calculation_basis: null,
      comparison_basis_ref: missingBasisRef({ manifest_id: manifestId, reporting_scope: reportingScope }),
      comparison_basis_state: "INVALID",
      comparison_requirement: requirement,
      reason_code: "PARITY_COMPARISON_BASIS_INVALID",
    });
  }
  const basisRef = calculationBasisRef(basis);
  if (basis.manifest_id !== manifestId) {
    return failClosed({
      calculation_basis: basis,
      comparison_basis_ref: basisRef,
      comparison_basis_state: "MANIFEST_MISMATCH",
      comparison_requirement: requirement,
      reason_code: "PARITY_COMPARISON_BASIS_MANIFEST_MISMATCH",
    });
  }
  if (basis.basis_status !== "CONFIRMED" || !basis.parity_reusable) {
    return failClosed({
      calculation_basis: basis,
      comparison_basis_ref: basisRef,
      comparison_basis_state: "NOT_REUSABLE",
      comparison_requirement: requirement,
      reason_code: "PARITY_COMPARISON_BASIS_NOT_REUSABLE",
    });
  }
  requireString("calculation_basis.basis_payload_ref", basis.basis_payload_ref);
  requireString("calculation_basis.basis_hash", basis.basis_hash);
  return {
    calculation_basis: basis,
    comparison_basis_ref: basisRef,
    comparison_basis_state: "RESOLVED",
    comparison_requirement: requirement,
    reason_codes: [],
  };
}
