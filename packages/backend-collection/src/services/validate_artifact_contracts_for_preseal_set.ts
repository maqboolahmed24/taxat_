import type { SchemaBundleArtifactContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import type { SchemaBundleRecord } from "../../../backend-manifest/src/models/schema_bundle.ts";
import { normalizeCollectionString } from "../models/collection_control_common.ts";
import {
  type ArtifactSchemaValidator,
  type ArtifactValidationIssue,
  type ArtifactValidationReasonCode,
  type ArtifactValidationResult,
  type PresealArtifactValidationResult,
} from "../types/artifact_validation_result.ts";
import { buildArtifactContractHash } from "./build_artifact_contract_hash.ts";
import {
  artifactContractRefFromParts,
  recordArtifactContractRef,
} from "./record_artifact_contract_ref.ts";
import { validateArtifact } from "./validate_artifact.ts";
import { validateArtifactSet } from "./validate_artifact_set.ts";

const REQUIRED_BOUNDARY_ARTIFACT_TYPES = [
  "SourcePlan",
  "SourceWindow",
  "CollectionBoundary",
  "NormalizationContext",
] as const;

const REQUIRED_SET_ARTIFACT_TYPES = [
  "SourceRecordSet",
  "EvidenceItemSet",
  "CandidateFactSet",
  "ConflictSet",
  "CanonicalFactSet",
] as const;

const REQUIRED_PRESEAL_SCHEMA_TYPES = [
  ...REQUIRED_BOUNDARY_ARTIFACT_TYPES,
  ...REQUIRED_SET_ARTIFACT_TYPES,
  "Snapshot",
  "InputFreeze",
] as const;

export type PresealArtifactContractPackInput = {
  candidate_fact_set: unknown;
  canonical_fact_set: unknown;
  collection_boundary: unknown;
  conflict_set: unknown;
  evidence_item_set: unknown;
  input_freeze: unknown;
  normalization_context: unknown;
  snapshot: unknown;
  source_plan: unknown;
  source_record_set: unknown;
  source_window: unknown;
};

type NamedArtifact = {
  artifact: unknown;
  artifact_type: (typeof REQUIRED_PRESEAL_SCHEMA_TYPES)[number];
  include_contract_ref: boolean;
  is_set: boolean;
};

function getObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function contractFrom(artifact: unknown): SchemaBundleArtifactContract | null {
  const contract = getObject(artifact).contract;
  return contract !== null && typeof contract === "object" && !Array.isArray(contract)
    ? (structuredClone(contract) as SchemaBundleArtifactContract)
    : null;
}

function inputFreezeRefs(inputFreeze: unknown) {
  const refs = getObject(inputFreeze).artifact_contract_refs;
  return Array.isArray(refs)
    ? refs.map((ref) => normalizeCollectionString("input_freeze.artifact_contract_ref", ref))
    : [];
}

function inputFreezeHash(inputFreeze: unknown) {
  const value = getObject(inputFreeze).artifact_contract_hash;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function artifactRef(artifact: unknown, artifactType: string) {
  const contract = contractFrom(artifact);
  return contract?.artifact_id ?? `artifact://${artifactType}/unknown`;
}

function issue(input: {
  artifact_ref: string;
  artifact_type: string;
  detail: string;
  reason_code: ArtifactValidationReasonCode;
  severity?: ArtifactValidationIssue["severity"];
}): ArtifactValidationIssue {
  return {
    artifact_ref: input.artifact_ref,
    artifact_type: input.artifact_type,
    detail: input.detail,
    reason_code: input.reason_code,
    severity: input.severity ?? "ERROR",
  };
}

function canonicalContractRefLooksValid(ref: string) {
  const match = ref.match(
    /^artifact-contract:\/\/([^?]+)\?artifact_id=([^&]+)&schema_id=([^&]+)&schema_bundle_hash=([^&]+)&artifact_content_hash=([^&]+)&artifact_contract_hash=([^&]+)$/,
  );
  if (!match) {
    return false;
  }
  const [
    ,
    artifactType,
    artifactId,
    schemaId,
    schemaBundleHash,
    artifactContentHash,
    artifactContractHash,
  ] = match;
  try {
    const decoded = {
      artifact_contract_hash: decodeURIComponent(artifactContractHash!),
      artifact_content_hash: decodeURIComponent(artifactContentHash!),
      artifact_id: decodeURIComponent(artifactId!),
      artifact_type: decodeURIComponent(artifactType!),
      schema_bundle_hash: decodeURIComponent(schemaBundleHash!),
      schema_id: decodeURIComponent(schemaId!),
    };
    return artifactContractRefFromParts(decoded) === ref;
  } catch {
    return false;
  }
}

function presealArtifacts(input: PresealArtifactContractPackInput): NamedArtifact[] {
  return [
    {
      artifact: input.source_plan,
      artifact_type: "SourcePlan",
      include_contract_ref: true,
      is_set: false,
    },
    {
      artifact: input.source_window,
      artifact_type: "SourceWindow",
      include_contract_ref: true,
      is_set: false,
    },
    {
      artifact: input.collection_boundary,
      artifact_type: "CollectionBoundary",
      include_contract_ref: true,
      is_set: false,
    },
    {
      artifact: input.normalization_context,
      artifact_type: "NormalizationContext",
      include_contract_ref: true,
      is_set: false,
    },
    {
      artifact: input.source_record_set,
      artifact_type: "SourceRecordSet",
      include_contract_ref: true,
      is_set: true,
    },
    {
      artifact: input.evidence_item_set,
      artifact_type: "EvidenceItemSet",
      include_contract_ref: true,
      is_set: true,
    },
    {
      artifact: input.candidate_fact_set,
      artifact_type: "CandidateFactSet",
      include_contract_ref: true,
      is_set: true,
    },
    {
      artifact: input.conflict_set,
      artifact_type: "ConflictSet",
      include_contract_ref: true,
      is_set: true,
    },
    {
      artifact: input.canonical_fact_set,
      artifact_type: "CanonicalFactSet",
      include_contract_ref: true,
      is_set: true,
    },
    {
      artifact: input.snapshot,
      artifact_type: "Snapshot",
      include_contract_ref: true,
      is_set: false,
    },
    {
      artifact: input.input_freeze,
      artifact_type: "InputFreeze",
      include_contract_ref: false,
      is_set: false,
    },
  ];
}

function semanticVersionParts(version: string) {
  const [major, minor] = version.split(".");
  return { major: major ?? "", minor: minor ?? "" };
}

function versionSkewIssues(results: readonly ArtifactValidationResult[]) {
  const entries = results
    .map((result) => result.schema_entry)
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  const majors = new Set(entries.map((entry) => semanticVersionParts(entry.semantic_version).major));
  const minors = new Set(entries.map((entry) => semanticVersionParts(entry.semantic_version).minor));
  if (majors.size > 1) {
    return [
      issue({
        artifact_ref: "schema-bundle://preseal/version-mix",
        artifact_type: "SchemaBundle",
        detail: "authoritative preseal artifacts mix incompatible major schema versions",
        reason_code: "ARTIFACT_VERSION_INCOMPATIBLE",
      }),
    ];
  }
  if (minors.size > 1) {
    return [
      issue({
        artifact_ref: "schema-bundle://preseal/version-mix",
        artifact_type: "SchemaBundle",
        detail: "authoritative preseal artifacts use a permitted backward-compatible minor-version skew",
        reason_code: "ARTIFACT_SCHEMA_DEPRECATED_ALLOWED",
        severity: "NOTICE",
      }),
    ];
  }
  return [];
}

function decisionForIssues(issues: readonly ArtifactValidationIssue[]) {
  if (issues.some((entry) => entry.severity === "ERROR")) {
    return "HARD_BLOCK" as const;
  }
  if (issues.some((entry) => entry.severity === "NOTICE")) {
    return "PASS_WITH_NOTICE" as const;
  }
  return "PASS" as const;
}

function reasonCodes(issues: readonly ArtifactValidationIssue[]): ArtifactValidationReasonCode[] {
  if (issues.length === 0) {
    return ["ARTIFACT_CONTRACTS_VALID"];
  }
  return [...new Set(issues.map((entry) => entry.reason_code))].sort();
}

export async function validateArtifactContractsForPresealSet(input: {
  artifacts: PresealArtifactContractPackInput;
  execution_mode?: "ANALYSIS" | "COMPLIANCE";
  schema_bundle: SchemaBundleRecord;
  schema_validator?: ArtifactSchemaValidator;
}): Promise<PresealArtifactValidationResult> {
  const executionMode = input.execution_mode ?? "COMPLIANCE";
  const validationResults: ArtifactValidationResult[] = [];
  const expectedRefs: string[] = [];
  const inputArtifactRefs: string[] = [];
  const issues: ArtifactValidationIssue[] = [];

  for (const artifact of presealArtifacts(input.artifacts)) {
    const result = artifact.is_set
      ? await validateArtifactSet({
          artifact: artifact.artifact,
          artifact_ref: artifactRef(artifact.artifact, artifact.artifact_type),
          schema_bundle: input.schema_bundle,
          ...(input.schema_validator === undefined
            ? {}
            : { schema_validator: input.schema_validator }),
        })
      : await validateArtifact({
          artifact: artifact.artifact,
          artifact_ref: artifactRef(artifact.artifact, artifact.artifact_type),
          artifact_type: artifact.artifact_type,
          schema_bundle: input.schema_bundle,
          ...(input.schema_validator === undefined
            ? {}
            : { schema_validator: input.schema_validator }),
        });
    validationResults.push(result);
    inputArtifactRefs.push(result.artifact_ref);
    issues.push(...result.issues);
    if (artifact.include_contract_ref && result.contract !== null) {
      expectedRefs.push(recordArtifactContractRef({ contract: result.contract }).artifact_contract_ref);
    }
  }

  const recordedRefs = inputFreezeRefs(input.artifacts.input_freeze);
  const recordedRefSet = new Set(recordedRefs);
  const inputFreezeRef = artifactRef(input.artifacts.input_freeze, "InputFreeze");
  for (const ref of recordedRefs) {
    if (!canonicalContractRefLooksValid(ref)) {
      issues.push(
        issue({
          artifact_ref: inputFreezeRef,
          artifact_type: "InputFreeze",
          detail: `input freeze contains a non-canonical artifact_contract_ref: ${ref}`,
          reason_code: "ARTIFACT_CONTRACT_REF_MISSING",
        }),
      );
    }
  }
  for (const requiredRef of expectedRefs) {
    if (!recordedRefSet.has(requiredRef)) {
      issues.push(
        issue({
          artifact_ref: inputFreezeRef,
          artifact_type: "InputFreeze",
          detail: `input freeze is missing required artifact contract ref ${requiredRef}`,
          reason_code: "ARTIFACT_CONTRACT_REF_MISSING",
        }),
      );
    }
  }

  const recordedHash = inputFreezeHash(input.artifacts.input_freeze);
  const expectedHash =
    recordedRefs.length === 0
      ? null
      : buildArtifactContractHash({ artifact_contract_refs: recordedRefs });
  if (recordedHash === null) {
    issues.push(
      issue({
        artifact_ref: inputFreezeRef,
        artifact_type: "InputFreeze",
        detail:
          executionMode === "ANALYSIS"
            ? "analysis-only input freeze omits artifact_contract_hash; downstream filing capability remains blocked"
            : "compliance-capable input freeze omits artifact_contract_hash",
        reason_code: "ARTIFACT_CONTRACT_HASH_MISMATCH",
        severity: executionMode === "ANALYSIS" ? "NOTICE" : "ERROR",
      }),
    );
  } else if (expectedHash !== null && recordedHash !== expectedHash) {
    issues.push(
      issue({
        artifact_ref: inputFreezeRef,
        artifact_type: "InputFreeze",
        detail: "input_freeze.artifact_contract_hash does not match its canonical contract refs",
        reason_code: "ARTIFACT_CONTRACT_HASH_MISMATCH",
      }),
    );
  }

  issues.push(...versionSkewIssues(validationResults));

  return {
    artifact_contract_hash_expected: expectedHash,
    artifact_contract_hash_recorded: recordedHash,
    artifact_contract_refs_expected: [...expectedRefs].sort(),
    artifact_contract_refs_recorded: [...recordedRefs].sort(),
    decision: decisionForIssues(issues),
    input_artifact_refs: [...new Set(inputArtifactRefs)].sort(),
    issues,
    reason_codes: reasonCodes(issues),
    validation_results: validationResults,
  };
}

export { REQUIRED_PRESEAL_SCHEMA_TYPES };
