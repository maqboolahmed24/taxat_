import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import type { GateAdmissibilityRecord } from "../../../generated-models/src/generated/typescript/decisioning-and-nightly.ts";
import type { VerificationSuiteResult } from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type {
  DeterministicGoldenPack,
  DeterministicGoldenPackCadenceFixture,
  DeterministicGoldenPackModuleFixture,
  DeterministicGoldenPackReplayFixture,
  DeterministicGoldenPackStateTransitionFixture,
  ReleaseCandidateIdentityContract,
  ReleaseVerificationManifest,
  ReleaseVerificationManifestAssemblyContract,
  ReleaseVerificationManifestAssemblyContractGateBinding,
} from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import type { DeterministicGoldenPackRepository } from "../repositories/deterministic_golden_pack_repository.ts";
import {
  DETERMINISTIC_GOLDEN_PACK_ARTIFACT_TYPE,
  DETERMINISTIC_GOLDEN_PACK_CADENCE_POLICY,
  DETERMINISTIC_GOLDEN_PACK_CANONICAL_SERIALIZATION_POLICY,
  DETERMINISTIC_GOLDEN_PACK_CONTRACT_VERSION,
  DETERMINISTIC_GOLDEN_PACK_EXACT_DECIMAL_POLICY,
  DETERMINISTIC_GOLDEN_PACK_NULL_SLOT_POLICY,
  DETERMINISTIC_GOLDEN_PACK_REPLAY_COMPARISON_POLICY,
  DETERMINISTIC_GOLDEN_PACK_STATE_TRANSITION_POLICY,
  DeterministicGoldenPackModelError,
  assertDeterministicGoldenPackHash,
  deterministicGoldenPackRef,
  normalizeDeterministicCadenceFixtures,
  normalizeDeterministicGoldenPack,
  normalizeDeterministicModuleFixtures,
  normalizeDeterministicReplayFixtures,
  normalizeDeterministicStateTransitionFixtures,
  requireGoldenPackTrimmedString,
} from "../models/deterministic_golden_pack.ts";

export const DETERMINISTIC_SUITE_FAMILY = "DETERMINISTIC_AND_STATE_MACHINE" as const;
const RELEASE_MANIFEST_ASSEMBLY_CONTRACT_VERSION =
  "RELEASE_VERIFICATION_MANIFEST_ASSEMBLY_V1" as const;
const RELEASE_MANIFEST_ASSEMBLY_GATE_ORDER_POLICY =
  "CANONICAL_BLOCKING_GATE_ORDER_V1" as const;
const RELEASE_MANIFEST_ASSEMBLY_EVIDENCE_SOURCE_POLICY =
  "FIRST_CLASS_RESULT_AND_ADMISSIBILITY_ARTIFACTS_ONLY" as const;
const RELEASE_MANIFEST_ASSEMBLY_ADMISSIBILITY_DERIVATION_POLICY =
  "GREEN_REQUIRES_ADMISSIBLE_UNQUARANTINED_UNWAIVED_EVIDENCE" as const;
const RELEASE_MANIFEST_ASSEMBLY_COMPANION_EVIDENCE_POLICY =
  "GREEN_SUPPORTING_GATES_REQUIRE_COMPANION_EVIDENCE_REFS" as const;
const RELEASE_MANIFEST_ASSEMBLY_DECISION_POSTURE_POLICY =
  "APPROVAL_AND_SUPERSESSION_REQUIRE_EXPLICIT_DECISION_LINEAGE" as const;
const RELEASE_MANIFEST_ASSEMBLY_SUPERSESSION_POLICY =
  "NEW_MANIFEST_SUPERSEDES_OLD_MANIFEST_EXPLICITLY_NO_POST_HOC_REWRITE" as const;

export const RELEASE_VERIFICATION_MANIFEST_GATE_ORDER = [
  "schema_compatibility",
  "deterministic_and_state_machine",
  "northbound_api",
  "authority_sandbox",
  "operator_client",
  "security",
  "performance_and_canary",
  "restore_drill",
  "migration_verification",
  "supply_chain",
  "suite_admissibility",
] as const;

const RELEASE_VERIFICATION_MANIFEST_GATE_SUITE_FAMILY = {
  schema_compatibility: "SCHEMA_COMPATIBILITY",
  deterministic_and_state_machine: DETERMINISTIC_SUITE_FAMILY,
  northbound_api: "NORTHBOUND_API",
  authority_sandbox: "AUTHORITY_SANDBOX",
  operator_client: "OPERATOR_CLIENT",
  security: "SECURITY",
  performance_and_canary: "PERFORMANCE_AND_CANARY",
  restore_drill: "RESTORE_DRILL",
  migration_verification: "MIGRATION_VERIFICATION",
  supply_chain: "SUPPLY_CHAIN",
  suite_admissibility: "SUITE_ADMISSIBILITY",
} as const satisfies Record<
  (typeof RELEASE_VERIFICATION_MANIFEST_GATE_ORDER)[number],
  ReleaseVerificationManifestAssemblyContractGateBinding["suite_family"]
>;

const RELEASE_VERIFICATION_MANIFEST_GATE_INDEX = Object.fromEntries(
  RELEASE_VERIFICATION_MANIFEST_GATE_ORDER.map((gateName, index) => [gateName, index]),
) as Record<(typeof RELEASE_VERIFICATION_MANIFEST_GATE_ORDER)[number], number>;

export type BuildDeterministicGoldenPackInput = {
  golden_pack_id: string;
  candidate_identity_contract: ReleaseCandidateIdentityContract;
  schema_bundle_hash?: string;
  config_bundle_hash?: string;
  module_fixtures: readonly DeterministicGoldenPackModuleFixture[];
  state_transition_fixtures: readonly DeterministicGoldenPackStateTransitionFixture[];
  replay_fixtures: readonly DeterministicGoldenPackReplayFixture[];
  cadence_fixtures: readonly DeterministicGoldenPackCadenceFixture[];
};

export function buildDeterministicGoldenPack(
  input: BuildDeterministicGoldenPackInput,
): DeterministicGoldenPack {
  const schemaBundleHash = input.schema_bundle_hash ?? input.candidate_identity_contract.schema_bundle_hash;
  const configBundleHash = input.config_bundle_hash ?? input.candidate_identity_contract.config_bundle_hash;
  const packWithoutHash: DeterministicGoldenPack = {
    golden_pack_id: input.golden_pack_id,
    artifact_type: DETERMINISTIC_GOLDEN_PACK_ARTIFACT_TYPE,
    contract_version: DETERMINISTIC_GOLDEN_PACK_CONTRACT_VERSION,
    golden_pack_hash: "pending",
    candidate_identity_hash: input.candidate_identity_contract.candidate_identity_hash,
    candidate_identity_contract: input.candidate_identity_contract,
    schema_bundle_hash: schemaBundleHash,
    config_bundle_hash: configBundleHash,
    canonical_serialization_policy: DETERMINISTIC_GOLDEN_PACK_CANONICAL_SERIALIZATION_POLICY,
    exact_decimal_policy: DETERMINISTIC_GOLDEN_PACK_EXACT_DECIMAL_POLICY,
    null_slot_policy: DETERMINISTIC_GOLDEN_PACK_NULL_SLOT_POLICY,
    replay_comparison_policy: DETERMINISTIC_GOLDEN_PACK_REPLAY_COMPARISON_POLICY,
    state_transition_policy: DETERMINISTIC_GOLDEN_PACK_STATE_TRANSITION_POLICY,
    cadence_policy: DETERMINISTIC_GOLDEN_PACK_CADENCE_POLICY,
    module_fixtures: normalizeDeterministicModuleFixtures(input.module_fixtures),
    state_transition_fixtures: normalizeDeterministicStateTransitionFixtures(
      input.state_transition_fixtures,
    ),
    replay_fixtures: normalizeDeterministicReplayFixtures(input.replay_fixtures),
    cadence_fixtures: normalizeDeterministicCadenceFixtures(input.cadence_fixtures),
  };
  return normalizeDeterministicGoldenPack(packWithoutHash);
}

export async function persistDeterministicGoldenPack(input: {
  repository: DeterministicGoldenPackRepository;
  golden_pack: DeterministicGoldenPack;
  persisted_at: string;
}) {
  return input.repository.persistDeterministicGoldenPack({
    golden_pack: assertDeterministicGoldenPackHash(input.golden_pack),
    persisted_at: input.persisted_at,
  });
}

function nonEmptyRef(ref: string) {
  return requireGoldenPackTrimmedString("deterministic_golden_pack_ref", ref);
}

function isGreenVerificationSuiteResult(result: VerificationSuiteResult) {
  return result.suite_family === DETERMINISTIC_SUITE_FAMILY && result.result_state === "PASSED";
}

function isGreenGateAdmissibilityRecord(record: GateAdmissibilityRecord) {
  return (
    record.suite_family === DETERMINISTIC_SUITE_FAMILY &&
    record.admissibility_state === "ADMISSIBLE" &&
    record.quarantine_state === "NONE" &&
    record.candidate_identity_match &&
    record.freshness_verified &&
    record.contract_window_consistent &&
    record.rerun_scope_preserved &&
    record.reason_codes.length === 0
  );
}

function isGreenReleaseManifestDeterministicGate(manifest: ReleaseVerificationManifest) {
  const gate = manifest.blocking_gates.deterministic_and_state_machine;
  return (
    gate.status === "GREEN" &&
    gate.admissibility_state === "ADMISSIBLE" &&
    gate.quarantine_state === "NONE" &&
    gate.manual_waiver_state === "NONE"
  );
}

export function bindDeterministicGoldenPackRefToVerificationSuiteResult(
  result: VerificationSuiteResult,
  goldenPackRef: string,
): VerificationSuiteResult {
  return {
    ...result,
    deterministic_golden_pack_ref: isGreenVerificationSuiteResult(result)
      ? nonEmptyRef(goldenPackRef)
      : null,
  };
}

export function validateDeterministicGoldenPackRefForVerificationSuiteResult(
  result: VerificationSuiteResult,
) {
  const shouldRetain = isGreenVerificationSuiteResult(result);
  if (shouldRetain && result.deterministic_golden_pack_ref === null) {
    throw new DeterministicGoldenPackModelError(
      "DETERMINISTIC_GOLDEN_PACK_RELEASE_BINDING_INVALID",
      "green deterministic verification suite results must retain deterministic_golden_pack_ref",
    );
  }
  if (!shouldRetain && result.deterministic_golden_pack_ref !== null) {
    throw new DeterministicGoldenPackModelError(
      "DETERMINISTIC_GOLDEN_PACK_RELEASE_BINDING_INVALID",
      "non-green or non-deterministic verification suite results must not retain deterministic_golden_pack_ref",
    );
  }
  return result;
}

export function bindDeterministicGoldenPackRefToGateAdmissibilityRecord(
  record: GateAdmissibilityRecord,
  goldenPackRef: string,
): GateAdmissibilityRecord {
  return {
    ...record,
    deterministic_golden_pack_ref: isGreenGateAdmissibilityRecord(record)
      ? nonEmptyRef(goldenPackRef)
      : null,
  };
}

export function validateDeterministicGoldenPackRefForGateAdmissibilityRecord(
  record: GateAdmissibilityRecord,
) {
  const shouldRetain = isGreenGateAdmissibilityRecord(record);
  if (shouldRetain && record.deterministic_golden_pack_ref === null) {
    throw new DeterministicGoldenPackModelError(
      "DETERMINISTIC_GOLDEN_PACK_RELEASE_BINDING_INVALID",
      "green deterministic admissibility records must retain deterministic_golden_pack_ref",
    );
  }
  if (!shouldRetain && record.deterministic_golden_pack_ref !== null) {
    throw new DeterministicGoldenPackModelError(
      "DETERMINISTIC_GOLDEN_PACK_RELEASE_BINDING_INVALID",
      "non-green or non-deterministic admissibility records must not retain deterministic_golden_pack_ref",
    );
  }
  return record;
}

function normalizeStringList(label: string, values: readonly string[], allowEmpty: boolean) {
  if (!allowEmpty && values.length === 0) {
    throw new DeterministicGoldenPackModelError(
      "DETERMINISTIC_GOLDEN_PACK_RELEASE_BINDING_INVALID",
      `${label} must contain at least one row`,
    );
  }
  for (const [index, value] of values.entries()) {
    requireGoldenPackTrimmedString(`${label}[${index}]`, value);
  }
  if (new Set(values).size !== values.length) {
    throw new DeterministicGoldenPackModelError(
      "DETERMINISTIC_GOLDEN_PACK_RELEASE_BINDING_INVALID",
      `${label} must not contain duplicates`,
    );
  }
  return [...values].sort();
}

export function normalizeReleaseVerificationManifestGateBindings(
  gateBindings: readonly ReleaseVerificationManifestAssemblyContractGateBinding[],
): ReleaseVerificationManifestAssemblyContractGateBinding[] {
  const seen = new Set<string>();
  const rows = gateBindings.map((binding) => {
    const gateName = binding.gate_name;
    if (!(gateName in RELEASE_VERIFICATION_MANIFEST_GATE_INDEX) || seen.has(gateName)) {
      throw new DeterministicGoldenPackModelError(
        "DETERMINISTIC_GOLDEN_PACK_RELEASE_BINDING_INVALID",
        `release manifest gate binding ${gateName} must be unique and canonical`,
      );
    }
    seen.add(gateName);
    const expectedSuiteFamily = RELEASE_VERIFICATION_MANIFEST_GATE_SUITE_FAMILY[gateName];
    if (binding.suite_family !== expectedSuiteFamily) {
      throw new DeterministicGoldenPackModelError(
        "DETERMINISTIC_GOLDEN_PACK_RELEASE_BINDING_INVALID",
        `release manifest gate binding ${gateName} must retain suite_family ${expectedSuiteFamily}`,
      );
    }
    const compatibilityGateHashOrNull = binding.compatibility_gate_hash_or_null;
    if (
      ["schema_compatibility", "migration_verification", "operator_client"].includes(gateName)
    ) {
      requireGoldenPackTrimmedString(
        `gate_bindings.${gateName}.compatibility_gate_hash_or_null`,
        compatibilityGateHashOrNull,
      );
    } else if (compatibilityGateHashOrNull !== null) {
      throw new DeterministicGoldenPackModelError(
        "DETERMINISTIC_GOLDEN_PACK_RELEASE_BINDING_INVALID",
        `gate ${gateName} must keep compatibility_gate_hash_or_null null`,
      );
    }
    if (gateName === "authority_sandbox") {
      requireGoldenPackTrimmedString(
        "gate_bindings.authority_sandbox.authority_sandbox_coverage_hash_or_null",
        binding.authority_sandbox_coverage_hash_or_null,
      );
    } else if (binding.authority_sandbox_coverage_hash_or_null !== null) {
      throw new DeterministicGoldenPackModelError(
        "DETERMINISTIC_GOLDEN_PACK_RELEASE_BINDING_INVALID",
        `gate ${gateName} must keep authority_sandbox_coverage_hash_or_null null`,
      );
    }
    if (
      binding.status === "GREEN" &&
      (binding.admissibility_state !== "ADMISSIBLE" ||
        binding.quarantine_state !== "NONE" ||
        binding.manual_waiver_state !== "NONE")
    ) {
      throw new DeterministicGoldenPackModelError(
        "DETERMINISTIC_GOLDEN_PACK_RELEASE_BINDING_INVALID",
        `green gate ${gateName} must be admissible, unquarantined, and unwaived`,
      );
    }
    return {
      gate_name: gateName,
      suite_family: expectedSuiteFamily,
      candidate_identity_hash: requireGoldenPackTrimmedString(
        `gate_bindings.${gateName}.candidate_identity_hash`,
        binding.candidate_identity_hash,
      ),
      compatibility_gate_hash_or_null: compatibilityGateHashOrNull,
      authority_sandbox_coverage_hash_or_null: binding.authority_sandbox_coverage_hash_or_null,
      result_ref: requireGoldenPackTrimmedString(
        `gate_bindings.${gateName}.result_ref`,
        binding.result_ref,
      ),
      admissibility_ref: requireGoldenPackTrimmedString(
        `gate_bindings.${gateName}.admissibility_ref`,
        binding.admissibility_ref,
      ),
      status: binding.status,
      admissibility_state: binding.admissibility_state,
      quarantine_state: binding.quarantine_state,
      manual_waiver_state: binding.manual_waiver_state,
      executed_at: requireGoldenPackTrimmedString(
        `gate_bindings.${gateName}.executed_at`,
        binding.executed_at,
      ),
    };
  });
  if (seen.size !== RELEASE_VERIFICATION_MANIFEST_GATE_ORDER.length) {
    throw new DeterministicGoldenPackModelError(
      "DETERMINISTIC_GOLDEN_PACK_RELEASE_BINDING_INVALID",
      "release manifest assembly gate_bindings must contain every blocking gate exactly once",
    );
  }
  return rows.sort(
    (left, right) =>
      RELEASE_VERIFICATION_MANIFEST_GATE_INDEX[left.gate_name] -
      RELEASE_VERIFICATION_MANIFEST_GATE_INDEX[right.gate_name],
  );
}

export function deriveReleaseVerificationManifestAssemblyContractHash(
  contract: ReleaseVerificationManifestAssemblyContract,
) {
  const gateBindings = normalizeReleaseVerificationManifestGateBindings(contract.gate_bindings);
  const requiredStrings = {
    contract_version: contract.contract_version,
    candidate_identity_hash: contract.candidate_identity_hash,
    compatibility_gate_hash: contract.compatibility_gate_hash,
    gate_order_policy: contract.gate_order_policy,
    evidence_source_policy: contract.evidence_source_policy,
    admissibility_derivation_policy: contract.admissibility_derivation_policy,
    companion_evidence_policy: contract.companion_evidence_policy,
    decision_posture_policy: contract.decision_posture_policy,
    supersession_policy: contract.supersession_policy,
    migration_mode: contract.migration_mode,
    supported_client_window_ref: contract.supported_client_window_ref,
    decision_state: contract.decision_state,
  };
  for (const [fieldName, value] of Object.entries(requiredStrings)) {
    requireGoldenPackTrimmedString(`manifest_assembly_contract.${fieldName}`, value);
  }
  const nullableFields = {
    migration_plan_ref_or_null: contract.migration_plan_ref_or_null,
    canary_summary_ref_or_null: contract.canary_summary_ref_or_null,
    deterministic_golden_pack_ref_or_null: contract.deterministic_golden_pack_ref_or_null,
    restore_drill_ref_or_null: contract.restore_drill_ref_or_null,
    restore_checkpoint_ref_or_null: contract.restore_checkpoint_ref_or_null,
    client_compatibility_matrix_ref_or_null: contract.client_compatibility_matrix_ref_or_null,
    approval_ref_or_null: contract.approval_ref_or_null,
    deployment_release_ref_or_null: contract.deployment_release_ref_or_null,
    superseded_by_verification_manifest_ref_or_null:
      contract.superseded_by_verification_manifest_ref_or_null,
  };
  for (const [fieldName, value] of Object.entries(nullableFields)) {
    if (value !== null) {
      requireGoldenPackTrimmedString(`manifest_assembly_contract.${fieldName}`, value);
    }
  }
  return stableJsonHash({
    ...requiredStrings,
    ...nullableFields,
    enabled_provider_profile_refs: normalizeStringList(
      "manifest_assembly_contract.enabled_provider_profile_refs",
      contract.enabled_provider_profile_refs,
      true,
    ),
    executed_test_run_identifiers: normalizeStringList(
      "manifest_assembly_contract.executed_test_run_identifiers",
      contract.executed_test_run_identifiers,
      false,
    ),
    migration_ledger_refs: normalizeStringList(
      "manifest_assembly_contract.migration_ledger_refs",
      contract.migration_ledger_refs,
      true,
    ),
    gate_bindings: gateBindings,
  });
}

function normalizeReleaseVerificationManifestAssemblyContract(
  contract: ReleaseVerificationManifestAssemblyContract,
  deterministicGoldenPackRefOrNull: string | null,
) {
  const next: ReleaseVerificationManifestAssemblyContract = {
    ...contract,
    contract_version: RELEASE_MANIFEST_ASSEMBLY_CONTRACT_VERSION,
    gate_order_policy: RELEASE_MANIFEST_ASSEMBLY_GATE_ORDER_POLICY,
    evidence_source_policy: RELEASE_MANIFEST_ASSEMBLY_EVIDENCE_SOURCE_POLICY,
    admissibility_derivation_policy: RELEASE_MANIFEST_ASSEMBLY_ADMISSIBILITY_DERIVATION_POLICY,
    companion_evidence_policy: RELEASE_MANIFEST_ASSEMBLY_COMPANION_EVIDENCE_POLICY,
    decision_posture_policy: RELEASE_MANIFEST_ASSEMBLY_DECISION_POSTURE_POLICY,
    supersession_policy: RELEASE_MANIFEST_ASSEMBLY_SUPERSESSION_POLICY,
    deterministic_golden_pack_ref_or_null: deterministicGoldenPackRefOrNull,
    gate_bindings: normalizeReleaseVerificationManifestGateBindings(contract.gate_bindings),
  };
  return {
    ...next,
    assembly_contract_hash: deriveReleaseVerificationManifestAssemblyContractHash(next),
  };
}

export function bindDeterministicGoldenPackRefToReleaseVerificationManifest(
  manifest: ReleaseVerificationManifest,
  goldenPackRef: string,
): ReleaseVerificationManifest {
  const deterministicRef = isGreenReleaseManifestDeterministicGate(manifest)
    ? nonEmptyRef(goldenPackRef)
    : null;
  return {
    ...manifest,
    deterministic_golden_pack_ref: deterministicRef,
    manifest_assembly_contract: normalizeReleaseVerificationManifestAssemblyContract(
      manifest.manifest_assembly_contract,
      deterministicRef,
    ),
  };
}

export function validateDeterministicGoldenPackRefForReleaseVerificationManifest(
  manifest: ReleaseVerificationManifest,
) {
  const shouldRetain = isGreenReleaseManifestDeterministicGate(manifest);
  const assemblyRef =
    manifest.manifest_assembly_contract.deterministic_golden_pack_ref_or_null;
  if (shouldRetain && manifest.deterministic_golden_pack_ref === null) {
    throw new DeterministicGoldenPackModelError(
      "DETERMINISTIC_GOLDEN_PACK_RELEASE_BINDING_INVALID",
      "green deterministic release manifest gates must retain deterministic_golden_pack_ref",
    );
  }
  if (!shouldRetain && manifest.deterministic_golden_pack_ref !== null) {
    throw new DeterministicGoldenPackModelError(
      "DETERMINISTIC_GOLDEN_PACK_RELEASE_BINDING_INVALID",
      "non-green deterministic release manifest gates must not retain deterministic_golden_pack_ref",
    );
  }
  if (manifest.deterministic_golden_pack_ref !== assemblyRef) {
    throw new DeterministicGoldenPackModelError(
      "DETERMINISTIC_GOLDEN_PACK_RELEASE_BINDING_INVALID",
      "release manifest deterministic_golden_pack_ref must mirror manifest_assembly_contract.deterministic_golden_pack_ref_or_null",
    );
  }
  return manifest;
}

export function propagateDeterministicGoldenPackRefToReleaseEvidence(input: {
  golden_pack: DeterministicGoldenPack;
  verification_suite_result: VerificationSuiteResult;
  gate_admissibility_record: GateAdmissibilityRecord;
  release_verification_manifest: ReleaseVerificationManifest;
}) {
  const ref = deterministicGoldenPackRef(input.golden_pack);
  const verificationSuiteResult = bindDeterministicGoldenPackRefToVerificationSuiteResult(
    input.verification_suite_result,
    ref,
  );
  const gateAdmissibilityRecord = bindDeterministicGoldenPackRefToGateAdmissibilityRecord(
    input.gate_admissibility_record,
    ref,
  );
  const releaseVerificationManifest = bindDeterministicGoldenPackRefToReleaseVerificationManifest(
    input.release_verification_manifest,
    ref,
  );
  return {
    deterministic_golden_pack_ref: ref,
    verification_suite_result: validateDeterministicGoldenPackRefForVerificationSuiteResult(
      verificationSuiteResult,
    ),
    gate_admissibility_record: validateDeterministicGoldenPackRefForGateAdmissibilityRecord(
      gateAdmissibilityRecord,
    ),
    release_verification_manifest:
      validateDeterministicGoldenPackRefForReleaseVerificationManifest(
        releaseVerificationManifest,
      ),
  };
}
