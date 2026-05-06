import {
  buildSchemaBundleCompatibilityGateContract,
  type SchemaBundleCompatibilityGateContractRecord,
} from "../models/schema_bundle_compatibility_gate_contract.ts";
import type { ReleaseCandidateIdentityContractRecord } from "../models/release_candidate_identity_contract.ts";
import type { SchemaReaderWindowContractRecord } from "../models/schema_reader_window_contract.ts";

export type AssembleSchemaBundleCompatibilityGateContractInput = {
  candidate_identity_contract: ReleaseCandidateIdentityContractRecord;
  schema_reader_window_contract: SchemaReaderWindowContractRecord;
  migration_plan_ref_or_null?: string | null;
  migration_ledger_refs?: string[];
  supported_client_window_ref_or_null?: string | null;
  historical_manifest_guard_state?: "PROTECTED" | "BLOCKED";
  replay_restore_guard_state?: "PROTECTED" | "BLOCKED";
  native_client_window_state?: "NOT_APPLICABLE" | "VERIFIED_COMPATIBLE" | "BLOCKED";
  reason_codes?: string[];
};

export function assembleSchemaBundleCompatibilityGateContract(
  input: AssembleSchemaBundleCompatibilityGateContractInput,
): SchemaBundleCompatibilityGateContractRecord {
  return buildSchemaBundleCompatibilityGateContract(input);
}
