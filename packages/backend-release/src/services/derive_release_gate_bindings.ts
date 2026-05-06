import {
  canonicalReleaseVerificationManifestGateBindings,
  RELEASE_VERIFICATION_MANIFEST_GATE_SUITE_FAMILY,
  type ReleaseVerificationGateBindingRecord,
  type ReleaseVerificationGateName,
  type ReleaseVerificationGateStatus,
} from "../models/release_verification_manifest_assembly_contract.ts";

export type ReleaseGateBindingEvidenceInput = {
  gate_name: ReleaseVerificationGateName;
  result_ref: string;
  admissibility_ref: string;
  status: ReleaseVerificationGateStatus;
  admissibility_state: ReleaseVerificationGateBindingRecord["admissibility_state"];
  quarantine_state: ReleaseVerificationGateBindingRecord["quarantine_state"];
  manual_waiver_state: ReleaseVerificationGateBindingRecord["manual_waiver_state"];
  executed_at: string;
};

export type DeriveReleaseGateBindingsInput = {
  candidate_identity_hash: string;
  compatibility_gate_hash: string;
  authority_sandbox_coverage_hash: string;
  gate_evidence: readonly ReleaseGateBindingEvidenceInput[];
};

const compatibilityBoundGateNames = new Set<ReleaseVerificationGateName>([
  "schema_compatibility",
  "migration_verification",
  "operator_client",
]);

export function deriveReleaseGateBindings(
  input: DeriveReleaseGateBindingsInput,
): ReleaseVerificationGateBindingRecord[] {
  return canonicalReleaseVerificationManifestGateBindings(
    input.gate_evidence.map((evidence) => ({
      gate_name: evidence.gate_name,
      suite_family: RELEASE_VERIFICATION_MANIFEST_GATE_SUITE_FAMILY[
        evidence.gate_name
      ],
      candidate_identity_hash: input.candidate_identity_hash,
      compatibility_gate_hash_or_null: compatibilityBoundGateNames.has(
        evidence.gate_name,
      )
        ? input.compatibility_gate_hash
        : null,
      authority_sandbox_coverage_hash_or_null:
        evidence.gate_name === "authority_sandbox"
          ? input.authority_sandbox_coverage_hash
          : null,
      result_ref: evidence.result_ref,
      admissibility_ref: evidence.admissibility_ref,
      status: evidence.status,
      admissibility_state: evidence.admissibility_state,
      quarantine_state: evidence.quarantine_state,
      manual_waiver_state: evidence.manual_waiver_state,
      executed_at: evidence.executed_at,
    })),
  );
}
