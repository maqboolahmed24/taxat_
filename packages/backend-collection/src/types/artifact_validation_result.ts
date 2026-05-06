import type { SchemaBundleArtifactContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import type { SchemaBundleEntryRecord } from "../../../backend-manifest/src/models/schema_bundle_entry.ts";

export type ArtifactContractGateDecision = "PASS" | "PASS_WITH_NOTICE" | "HARD_BLOCK";

export type ArtifactValidationReasonCode =
  | "ARTIFACT_CONTRACTS_VALID"
  | "ARTIFACT_CONTRACT_HASH_MISMATCH"
  | "ARTIFACT_CONTRACT_REF_MISSING"
  | "ARTIFACT_ENVELOPE_INCOMPLETE"
  | "ARTIFACT_SCHEMA_DEPRECATED_ALLOWED"
  | "ARTIFACT_SCHEMA_MISSING"
  | "ARTIFACT_SCHEMA_NOT_IN_BUNDLE"
  | "ARTIFACT_SCHEMA_VALIDATION_FAILED"
  | "ARTIFACT_VERSION_INCOMPATIBLE";

export type ArtifactValidationSeverity = "INFO" | "NOTICE" | "ERROR";

export type ArtifactValidationIssue = {
  artifact_ref: string;
  artifact_type: string;
  detail: string;
  reason_code: ArtifactValidationReasonCode;
  severity: ArtifactValidationSeverity;
};

export type ArtifactSchemaValidationIssue = {
  message: string;
  path: string;
};

export type ArtifactSchemaValidationResult = {
  issues: ArtifactSchemaValidationIssue[];
  valid: boolean;
};

export type ArtifactSchemaValidator = (input: {
  artifact: unknown;
  artifact_ref: string;
  artifact_type: string;
  schema_id: string;
}) => ArtifactSchemaValidationResult | Promise<ArtifactSchemaValidationResult>;

export type ArtifactValidationResult = {
  artifact_ref: string;
  artifact_type: string;
  contract: SchemaBundleArtifactContract | null;
  decision: ArtifactContractGateDecision;
  issues: ArtifactValidationIssue[];
  reason_codes: ArtifactValidationReasonCode[];
  schema_entry: SchemaBundleEntryRecord | null;
};

export type PresealArtifactValidationResult = {
  artifact_contract_hash_expected: string | null;
  artifact_contract_hash_recorded: string | null;
  artifact_contract_refs_expected: string[];
  artifact_contract_refs_recorded: string[];
  decision: ArtifactContractGateDecision;
  input_artifact_refs: string[];
  issues: ArtifactValidationIssue[];
  reason_codes: ArtifactValidationReasonCode[];
  validation_results: ArtifactValidationResult[];
};
