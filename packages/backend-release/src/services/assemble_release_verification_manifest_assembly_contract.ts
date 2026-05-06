import {
  buildReleaseVerificationManifestAssemblyContract,
  type ReleaseVerificationManifestAssemblyContractRecord,
} from "../models/release_verification_manifest_assembly_contract.ts";

export type AssembleReleaseVerificationManifestAssemblyContractInput = Omit<
  ReleaseVerificationManifestAssemblyContractRecord,
  | "contract_version"
  | "assembly_contract_hash"
  | "gate_order_policy"
  | "evidence_source_policy"
  | "admissibility_derivation_policy"
  | "companion_evidence_policy"
  | "decision_posture_policy"
  | "supersession_policy"
>;

export function assembleReleaseVerificationManifestAssemblyContract(
  input: AssembleReleaseVerificationManifestAssemblyContractInput,
): ReleaseVerificationManifestAssemblyContractRecord {
  return buildReleaseVerificationManifestAssemblyContract(input);
}
