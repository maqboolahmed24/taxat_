import {
  normalizeScopeSequence,
  type CanonicalScopeToken,
} from "../../../backend-access/src/services/principal_context_normalizer.ts";
import type { GateCode } from "../models/gate_decision_record.ts";

export type CanonicalGateStageProfile = {
  gate_code: GateCode;
  gate_stage_index: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  conditional_scope_tokens: CanonicalScopeToken[];
  gate_class: "NON_ACCESS";
};

export const CANONICAL_NON_ACCESS_GATE_STAGE_PROFILE: readonly CanonicalGateStageProfile[] = [
  {
    conditional_scope_tokens: [],
    gate_class: "NON_ACCESS",
    gate_code: "MANIFEST_GATE",
    gate_stage_index: 1,
  },
  {
    conditional_scope_tokens: [],
    gate_class: "NON_ACCESS",
    gate_code: "ARTIFACT_CONTRACT_GATE",
    gate_stage_index: 2,
  },
  {
    conditional_scope_tokens: [],
    gate_class: "NON_ACCESS",
    gate_code: "INPUT_BOUNDARY_GATE",
    gate_stage_index: 3,
  },
  {
    conditional_scope_tokens: [],
    gate_class: "NON_ACCESS",
    gate_code: "DATA_QUALITY_GATE",
    gate_stage_index: 4,
  },
  {
    conditional_scope_tokens: [],
    gate_class: "NON_ACCESS",
    gate_code: "RETENTION_EVIDENCE_GATE",
    gate_stage_index: 5,
  },
  {
    conditional_scope_tokens: [],
    gate_class: "NON_ACCESS",
    gate_code: "PARITY_GATE",
    gate_stage_index: 6,
  },
  {
    conditional_scope_tokens: [],
    gate_class: "NON_ACCESS",
    gate_code: "TRUST_GATE",
    gate_stage_index: 7,
  },
  {
    conditional_scope_tokens: ["amendment_intent", "amendment_submit"],
    gate_class: "NON_ACCESS",
    gate_code: "AMENDMENT_GATE",
    gate_stage_index: 8,
  },
  {
    conditional_scope_tokens: ["prepare_submission", "submit", "amendment_submit"],
    gate_class: "NON_ACCESS",
    gate_code: "FILING_GATE",
    gate_stage_index: 9,
  },
  {
    conditional_scope_tokens: ["submit", "amendment_submit"],
    gate_class: "NON_ACCESS",
    gate_code: "SUBMISSION_GATE",
    gate_stage_index: 10,
  },
] as const;

const PROFILE_BY_CODE = new Map(
  CANONICAL_NON_ACCESS_GATE_STAGE_PROFILE.map((profile) => [profile.gate_code, profile] as const),
);

const REPORTING_SCOPE_TOKENS = new Set<CanonicalScopeToken>([
  "estimate_only",
  "quarterly_update",
  "year_end",
]);

function hasAnyScopeToken(scope: readonly CanonicalScopeToken[], tokens: readonly CanonicalScopeToken[]) {
  const set = new Set(scope);
  return tokens.some((token) => set.has(token));
}

export function canonicalizeGateEffectiveScope(values: readonly string[]) {
  const scope = normalizeScopeSequence("gate_decision.effective_scope", values);
  const reportingTokenCount = scope.filter((token) => REPORTING_SCOPE_TOKENS.has(token)).length;
  if (reportingTokenCount !== 1) {
    throw new Error("gate_decision.effective_scope must contain exactly one reporting scope token");
  }
  if (scope.length > 5) {
    throw new Error("gate_decision.effective_scope must contain at most five tokens");
  }
  return scope;
}

export function getGateStageProfileByCode(gateCode: GateCode) {
  const profile = PROFILE_BY_CODE.get(gateCode);
  if (!profile) {
    throw new Error(`unsupported non-access gate code ${gateCode}`);
  }
  return profile;
}

export function isGateApplicableToScope(input: {
  effective_scope: readonly CanonicalScopeToken[];
  gate_code: GateCode;
}) {
  const profile = getGateStageProfileByCode(input.gate_code);
  return (
    profile.conditional_scope_tokens.length === 0 ||
    hasAnyScopeToken(input.effective_scope, profile.conditional_scope_tokens)
  );
}

export function getCanonicalGateStageProfile(input?: {
  effective_scope?: readonly string[];
  include_inapplicable_conditionals?: boolean;
}) {
  if (input?.include_inapplicable_conditionals || input?.effective_scope === undefined) {
    return [...CANONICAL_NON_ACCESS_GATE_STAGE_PROFILE];
  }
  const scope = canonicalizeGateEffectiveScope(input.effective_scope);
  return CANONICAL_NON_ACCESS_GATE_STAGE_PROFILE.filter(
    (profile) =>
      profile.conditional_scope_tokens.length === 0 ||
      hasAnyScopeToken(scope, profile.conditional_scope_tokens),
  );
}

export function canonicalGateCodesForScope(effectiveScope: readonly string[]) {
  return getCanonicalGateStageProfile({ effective_scope: effectiveScope }).map(
    (profile) => profile.gate_code,
  );
}
