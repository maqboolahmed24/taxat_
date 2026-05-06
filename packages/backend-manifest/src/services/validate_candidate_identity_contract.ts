import { computeReleaseCandidateIdentityHash } from "../hash/release_candidate_identity_hash.ts";
import {
  createReleaseCandidateIdentityHashTuple,
  type ReleaseCandidateIdentityHashInput,
} from "../hash/release_candidate_identity_hash.ts";
import {
  RELEASE_CANDIDATE_ADMISSIBILITY_BINDING_POLICY,
  RELEASE_CANDIDATE_ARRAY_CANONICALIZATION_POLICY,
  RELEASE_CANDIDATE_IDENTITY_ALLOWED_FIELDS,
  RELEASE_CANDIDATE_IDENTITY_CONTRACT_VERSION,
  RELEASE_CANDIDATE_SUITE_CONTEXT_POLICY,
  type ReleaseCandidateIdentityContractRecord,
  type ReleaseCandidateIdentityExpectedMirrors,
  type ReleaseCandidateIdentityHashTuple,
} from "../models/release_candidate_identity_contract.ts";
import { normalizeCandidateIdentityStringSet } from "./normalize_candidate_identity_arrays.ts";
import { RELEASE_CANDIDATE_HASH_PROFILE } from "./release_candidate_hash_profile.ts";

export type CandidateIdentityContractValidationIssueCode =
  | "RELEASE_CANDIDATE_CONTRACT_NOT_OBJECT"
  | "RELEASE_CANDIDATE_CONTRACT_UNKNOWN_FIELD"
  | "RELEASE_CANDIDATE_CONTRACT_REQUIRED_FIELD"
  | "RELEASE_CANDIDATE_CONTRACT_POLICY_MISMATCH"
  | "RELEASE_CANDIDATE_CONTRACT_FIELD_INVALID"
  | "RELEASE_CANDIDATE_CONTRACT_CANONICAL_ARRAY_MISMATCH"
  | "RELEASE_CANDIDATE_CONTRACT_HASH_MISMATCH"
  | "RELEASE_CANDIDATE_CONTRACT_EXPECTED_FIELD_MISMATCH";

export type CandidateIdentityContractValidationIssue = {
  code: CandidateIdentityContractValidationIssueCode;
  detail: string;
  path: string;
};

export type CandidateIdentityContractValidationResult =
  | {
      valid: true;
      contract: ReleaseCandidateIdentityContractRecord;
      hash_profile_version: typeof RELEASE_CANDIDATE_HASH_PROFILE.profile_version;
      hash_tuple: ReleaseCandidateIdentityHashTuple;
      issues: [];
    }
  | {
      valid: false;
      issues: CandidateIdentityContractValidationIssue[];
    };

export class CandidateIdentityContractValidationError extends Error {
  readonly issues: readonly CandidateIdentityContractValidationIssue[];

  constructor(issues: readonly CandidateIdentityContractValidationIssue[]) {
    super(
      `RELEASE_CANDIDATE_IDENTITY_CONTRACT_INVALID: ${issues
        .map((issue) => `${issue.path}:${issue.code}`)
        .join(", ")}`,
    );
    this.name = "CandidateIdentityContractValidationError";
    this.issues = issues;
  }
}

const allowedFieldSet = new Set<string>(RELEASE_CANDIDATE_IDENTITY_ALLOWED_FIELDS);
const requiredFieldSet = RELEASE_CANDIDATE_IDENTITY_ALLOWED_FIELDS;
const mirrorFields = [
  "candidate_identity_hash",
  "candidate_environment_ref",
  "build_artifact_ref",
  "artifact_digest",
  "schema_bundle_hash",
  "config_bundle_hash",
  "migration_plan_ref_or_null",
  "enabled_provider_profile_refs",
  "supported_client_window_ref_or_null",
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
  );
}

function pushIssue(
  issues: CandidateIdentityContractValidationIssue[],
  code: CandidateIdentityContractValidationIssueCode,
  path: string,
  detail: string,
) {
  issues.push({ code, path, detail });
}

function arraysEqual(left: readonly unknown[], right: readonly unknown[]) {
  return left.length === right.length && left.every((entry, index) => entry === right[index]);
}

function hasOwn(value: object, field: string) {
  return Object.prototype.hasOwnProperty.call(value, field);
}

function compareExpectedMirror(
  record: Record<string, unknown>,
  expectedMirrors: ReleaseCandidateIdentityExpectedMirrors,
  issues: CandidateIdentityContractValidationIssue[],
) {
  for (const field of mirrorFields) {
    if (!hasOwn(expectedMirrors, field)) {
      continue;
    }

    const expectedValue = expectedMirrors[field];
    const actualValue = record[field];
    const valuesMatch = Array.isArray(expectedValue)
      ? Array.isArray(actualValue) && arraysEqual(actualValue, expectedValue)
      : actualValue === expectedValue;

    if (!valuesMatch) {
      pushIssue(
        issues,
        "RELEASE_CANDIDATE_CONTRACT_EXPECTED_FIELD_MISMATCH",
        `$.${field}`,
        `${field} must mirror the owning artifact`,
      );
    }
  }
}

export function validateCandidateIdentityContract(
  contract: unknown,
  expectedMirrors: ReleaseCandidateIdentityExpectedMirrors = {},
): CandidateIdentityContractValidationResult {
  const issues: CandidateIdentityContractValidationIssue[] = [];

  if (!isPlainObject(contract)) {
    return {
      valid: false,
      issues: [
        {
          code: "RELEASE_CANDIDATE_CONTRACT_NOT_OBJECT",
          path: "$",
          detail: "release candidate identity contract must be a plain object",
        },
      ],
    };
  }

  for (const field of Object.keys(contract)) {
    if (!allowedFieldSet.has(field)) {
      pushIssue(
        issues,
        "RELEASE_CANDIDATE_CONTRACT_UNKNOWN_FIELD",
        `$.${field}`,
        "release candidate identity contract cannot contain persistence-only or write-time fields",
      );
    }
  }

  for (const field of requiredFieldSet) {
    if (!hasOwn(contract, field)) {
      pushIssue(
        issues,
        "RELEASE_CANDIDATE_CONTRACT_REQUIRED_FIELD",
        `$.${field}`,
        `${field} is required`,
      );
    }
  }

  const expectedPolicies = {
    contract_version: RELEASE_CANDIDATE_IDENTITY_CONTRACT_VERSION,
    array_canonicalization_policy: RELEASE_CANDIDATE_ARRAY_CANONICALIZATION_POLICY,
    suite_context_policy: RELEASE_CANDIDATE_SUITE_CONTEXT_POLICY,
    admissibility_binding_policy: RELEASE_CANDIDATE_ADMISSIBILITY_BINDING_POLICY,
  } as const;

  for (const [field, expectedValue] of Object.entries(expectedPolicies)) {
    if (contract[field] !== expectedValue) {
      pushIssue(
        issues,
        "RELEASE_CANDIDATE_CONTRACT_POLICY_MISMATCH",
        `$.${field}`,
        `${field} must stay ${expectedValue}`,
      );
    }
  }

  if (
    typeof contract.candidate_identity_hash !== "string" ||
    contract.candidate_identity_hash.trim().length === 0 ||
    contract.candidate_identity_hash !== contract.candidate_identity_hash.trim()
  ) {
    pushIssue(
      issues,
      "RELEASE_CANDIDATE_CONTRACT_FIELD_INVALID",
      "$.candidate_identity_hash",
      "candidate_identity_hash must be a non-empty normalized string",
    );
  }

  let hashTuple: ReleaseCandidateIdentityHashTuple | null = null;
  try {
    hashTuple = createReleaseCandidateIdentityHashTuple(
      contract as unknown as ReleaseCandidateIdentityHashInput,
    );
  } catch (error) {
    pushIssue(
      issues,
      "RELEASE_CANDIDATE_CONTRACT_FIELD_INVALID",
      "$",
      error instanceof Error ? error.message : "candidate tuple fields are invalid",
    );
  }

  if (hashTuple && Array.isArray(contract.enabled_provider_profile_refs)) {
    const canonicalProviderRefs = normalizeCandidateIdentityStringSet(
      "release_candidate_identity.enabled_provider_profile_refs",
      contract.enabled_provider_profile_refs,
    );
    if (!arraysEqual(contract.enabled_provider_profile_refs, canonicalProviderRefs)) {
      pushIssue(
        issues,
        "RELEASE_CANDIDATE_CONTRACT_CANONICAL_ARRAY_MISMATCH",
        "$.enabled_provider_profile_refs",
        "enabled_provider_profile_refs must be sorted, normalized, and unique in stored contracts",
      );
    }
  }

  if (hashTuple) {
    const expectedHash = computeReleaseCandidateIdentityHash(hashTuple);
    if (contract.candidate_identity_hash !== expectedHash) {
      pushIssue(
        issues,
        "RELEASE_CANDIDATE_CONTRACT_HASH_MISMATCH",
        "$.candidate_identity_hash",
        "candidate_identity_hash must equal the canonical hash derived from the candidate tuple",
      );
    }
  }

  compareExpectedMirror(contract, expectedMirrors, issues);

  if (issues.length > 0 || hashTuple === null) {
    return { valid: false, issues };
  }

  return {
    valid: true,
    contract: contract as ReleaseCandidateIdentityContractRecord,
    hash_profile_version: RELEASE_CANDIDATE_HASH_PROFILE.profile_version,
    hash_tuple: hashTuple,
    issues: [],
  };
}

export function assertValidCandidateIdentityContract(
  contract: unknown,
  expectedMirrors: ReleaseCandidateIdentityExpectedMirrors = {},
) {
  const result = validateCandidateIdentityContract(contract, expectedMirrors);
  if (!result.valid) {
    throw new CandidateIdentityContractValidationError(result.issues);
  }
  return result.contract;
}
