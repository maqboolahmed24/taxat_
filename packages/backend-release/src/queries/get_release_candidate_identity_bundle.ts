import type {
  ReleaseVerificationManifest,
  ReleaseVerificationManifestGateResult,
} from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import type {
  BuildArtifactRepository,
  StoredBuildArtifactRecord,
  StoredReleaseCandidateIdentityContractRecord,
} from "../repositories/build_artifact_repository.ts";
import type {
  ClientCompatibilityMatrixRepository,
  StoredClientCompatibilityMatrixRecord,
} from "../repositories/client_compatibility_matrix_repository.ts";
import type {
  DeploymentReleaseRepository,
  StoredCanaryHealthSummaryRecord,
  StoredDeploymentReleaseRecord,
} from "../repositories/deployment_release_repository.ts";
import type {
  GateAdmissibilityRecordRepository,
  StoredGateAdmissibilityRecord,
} from "../repositories/gate_admissibility_record_repository.ts";
import type {
  ReleaseVerificationManifestAssemblyRepository,
  StoredReleaseVerificationManifestAssemblyContractRecord,
  StoredSchemaBundleCompatibilityGateContractRecord,
} from "../repositories/release_verification_manifest_assembly_repository.ts";
import type {
  RestoreDrillResultRepository,
  StoredRestoreDrillResultRecord,
} from "../repositories/restore_drill_result_repository.ts";
import type {
  StoredVerificationSuiteResultRecord,
  VerificationSuiteResultRepository,
} from "../repositories/verification_suite_result_repository.ts";

export const RELEASE_EVIDENCE_QUERY_DTO_VERSION =
  "RELEASE_EVIDENCE_QUERY_BUNDLE_V1" as const;

export type ReleaseVerificationManifestRecord = ReleaseVerificationManifest;
export type ReleaseVerificationManifestDecisionState =
  ReleaseVerificationManifestRecord["decision_state"];

export type StoredReleaseVerificationManifestRecord = {
  verification_manifest_id: string;
  verification_manifest_ref: string;
  candidate_identity_hash: string;
  compatibility_gate_hash: string;
  decision_state: ReleaseVerificationManifestDecisionState;
  superseded_by_verification_manifest_ref: string | null;
  created_at: string;
  persisted_at: string;
  release_verification_manifest: ReleaseVerificationManifestRecord;
};

export type ReleaseVerificationManifestListQuery = {
  candidate_identity_hash?: string;
  compatibility_gate_hash?: string;
  decision_state?: ReleaseVerificationManifestDecisionState;
  deployment_release_ref?: string;
};

export type ReleaseVerificationManifestReadSource = {
  getReleaseVerificationManifestById(
    verificationManifestId: string,
  ): Promise<StoredReleaseVerificationManifestRecord>;
  listReleaseVerificationManifests(
    query?: ReleaseVerificationManifestListQuery,
  ): Promise<StoredReleaseVerificationManifestRecord[]>;
};

export type ReleaseEvidenceBundleSource = {
  buildArtifactRepository: Pick<
    BuildArtifactRepository,
    | "getBuildArtifactByRef"
    | "getReleaseCandidateIdentityContractByHash"
    | "listReleaseCandidateIdentityContracts"
  >;
  clientCompatibilityMatrixRepository: Pick<
    ClientCompatibilityMatrixRepository,
    "getClientCompatibilityMatrixById" | "listClientCompatibilityMatrices"
  >;
  deploymentReleaseRepository: Pick<
    DeploymentReleaseRepository,
    | "getCanaryHealthSummaryById"
    | "getDeploymentReleaseById"
    | "listCanaryHealthSummaries"
    | "listDeploymentReleases"
  >;
  gateAdmissibilityRecordRepository: Pick<
    GateAdmissibilityRecordRepository,
    "getGateAdmissibilityRecordById" | "listGateAdmissibilityRecords"
  >;
  releaseVerificationManifestAssemblyRepository: Pick<
    ReleaseVerificationManifestAssemblyRepository,
    | "getReleaseVerificationManifestAssemblyContractByHash"
    | "getSchemaBundleCompatibilityGateContractByHash"
    | "listReleaseVerificationManifestAssemblyContracts"
    | "listSchemaBundleCompatibilityGateContracts"
  >;
  releaseVerificationManifestRepository: ReleaseVerificationManifestReadSource;
  restoreDrillResultRepository: Pick<
    RestoreDrillResultRepository,
    "getRestoreDrillResultById" | "listRestoreDrillResults"
  >;
  verificationSuiteResultRepository: Pick<
    VerificationSuiteResultRepository,
    "getVerificationSuiteResultById" | "listVerificationSuiteResults"
  >;
};

export type ReleaseEvidenceReadKey =
  | {
      candidate_identity_hash: string;
      compatibility_gate_hash_or_null: string | null;
      key_type: "candidate_identity_hash";
    }
  | {
      key_type: "verification_manifest_id";
      verification_manifest_id: string;
    }
  | {
      key_type: "release_id";
      release_id: string;
    };

export type ReleaseEvidenceCompanionAvailability =
  | "AVAILABLE"
  | "AVAILABLE_REF_ONLY"
  | "MISSING_RECORD"
  | "MISSING_REF"
  | "NOT_REQUIRED";

export type ReleaseEvidenceCompanionEvidence = {
  availability_state: ReleaseEvidenceCompanionAvailability;
  evidence_kind:
    | "CANARY_SUMMARY"
    | "CLIENT_COMPATIBILITY_MATRIX"
    | "DETERMINISTIC_GOLDEN_PACK"
    | "RESTORE_CHECKPOINT"
    | "RESTORE_DRILL";
  ref_or_null: string | null;
  required_by_gate: boolean;
  verification_manifest_id: string;
};

export type ReleaseEvidenceManifestLineageEntry = {
  compatibility_gate_hash: string;
  decision_state: ReleaseVerificationManifestDecisionState;
  superseded_by_verification_manifest_ref: string | null;
  supersession_state: "CURRENT" | "SUPERSEDED";
  verification_manifest_id: string;
};

export type ReleaseEvidenceCurrentnessState =
  | "BLOCKED"
  | "CURRENT"
  | "NO_MANIFEST"
  | "SUPERSEDED";

export type ReleaseCandidateIdentityBundle = {
  artifact_type: "ReleaseCandidateIdentityBundle";
  build_artifact_record_or_null: StoredBuildArtifactRecord | null;
  canary_health_summary_records: StoredCanaryHealthSummaryRecord[];
  candidate_identity_hash: string;
  candidate_identity_record: StoredReleaseCandidateIdentityContractRecord;
  client_compatibility_matrix_records: StoredClientCompatibilityMatrixRecord[];
  companion_evidence: ReleaseEvidenceCompanionEvidence[];
  compatibility_gate_records: StoredSchemaBundleCompatibilityGateContractRecord[];
  currentness_state: ReleaseEvidenceCurrentnessState;
  deployment_release_records: StoredDeploymentReleaseRecord[];
  dto_version: typeof RELEASE_EVIDENCE_QUERY_DTO_VERSION;
  etag: string;
  gate_admissibility_records: StoredGateAdmissibilityRecord[];
  manifest_assembly_records: StoredReleaseVerificationManifestAssemblyContractRecord[];
  manifest_lineage: ReleaseEvidenceManifestLineageEntry[];
  missing_companion_evidence: ReleaseEvidenceCompanionEvidence[];
  read_key: Extract<ReleaseEvidenceReadKey, { key_type: "candidate_identity_hash" }>;
  release_verification_manifest_records: StoredReleaseVerificationManifestRecord[];
  restore_drill_result_records: StoredRestoreDrillResultRecord[];
  verification_suite_result_records: StoredVerificationSuiteResultRecord[];
};

export type ReleaseEvidenceQueryErrorCode =
  | "RELEASE_EVIDENCE_COMPATIBILITY_GATE_MIXED_CANDIDATE"
  | "RELEASE_EVIDENCE_FIELD_INVALID"
  | "RELEASE_EVIDENCE_MANIFEST_DUPLICATE"
  | "RELEASE_EVIDENCE_MANIFEST_MIXED_CANDIDATE"
  | "RELEASE_EVIDENCE_NOT_FOUND";

export class ReleaseEvidenceQueryError extends Error {
  readonly code: ReleaseEvidenceQueryErrorCode;

  constructor(code: ReleaseEvidenceQueryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ReleaseEvidenceQueryError";
    this.code = code;
  }
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function requireTrimmedString(label: string, value: unknown) {
  if (typeof value !== "string" || value.trim() !== value || value.length === 0) {
    throw new ReleaseEvidenceQueryError(
      "RELEASE_EVIDENCE_FIELD_INVALID",
      `${label} must be a non-empty trimmed string`,
    );
  }
  return value;
}

function sortByString<T>(values: readonly T[], selector: (value: T) => string) {
  return [...values].sort((left, right) => selector(left).localeCompare(selector(right)));
}

function isNotFoundError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string" &&
    (error as { code: string }).code.endsWith("_NOT_FOUND")
  );
}

export async function optionalRead<T>(read: () => Promise<T>) {
  try {
    return await read();
  } catch (error) {
    if (isNotFoundError(error)) {
      return null;
    }
    throw error;
  }
}

export function releaseVerificationManifestRef(
  manifest: Pick<ReleaseVerificationManifestRecord, "verification_manifest_id">,
) {
  return manifest.verification_manifest_id;
}

function gateMap(manifest: ReleaseVerificationManifestRecord) {
  return manifest.blocking_gates as Record<string, ReleaseVerificationManifestGateResult>;
}

export function releaseVerificationManifestCompatibilityGateHash(
  manifest: ReleaseVerificationManifestRecord,
) {
  return manifest.schema_bundle_compatibility_gate_contract.compatibility_gate_hash;
}

export function assertReleaseVerificationManifestBinding(
  manifest: ReleaseVerificationManifestRecord,
  expected: {
    candidate_identity_hash?: string;
    compatibility_gate_hash?: string;
  } = {},
) {
  const candidateHash = requireTrimmedString(
    "release_verification_manifest.candidate_identity_hash",
    manifest.candidate_identity_hash,
  );
  const compatibilityGateHash = requireTrimmedString(
    "release_verification_manifest.schema_bundle_compatibility_gate_contract.compatibility_gate_hash",
    releaseVerificationManifestCompatibilityGateHash(manifest),
  );
  const candidateFields: Array<[string, unknown]> = [
    [
      "candidate_identity_contract.candidate_identity_hash",
      manifest.candidate_identity_contract.candidate_identity_hash,
    ],
    [
      "manifest_assembly_contract.candidate_identity_hash",
      manifest.manifest_assembly_contract.candidate_identity_hash,
    ],
    [
      "schema_bundle_compatibility_gate_contract.candidate_identity_hash",
      manifest.schema_bundle_compatibility_gate_contract.candidate_identity_hash,
    ],
  ];
  for (const [label, value] of candidateFields) {
    if (value !== candidateHash) {
      throw new ReleaseEvidenceQueryError(
        "RELEASE_EVIDENCE_MANIFEST_MIXED_CANDIDATE",
        `${label} must mirror release_verification_manifest.candidate_identity_hash`,
      );
    }
  }
  if (
    expected.candidate_identity_hash !== undefined &&
    candidateHash !== expected.candidate_identity_hash
  ) {
    throw new ReleaseEvidenceQueryError(
      "RELEASE_EVIDENCE_MANIFEST_MIXED_CANDIDATE",
      `manifest ${manifest.verification_manifest_id} belongs to ${candidateHash}, not ${expected.candidate_identity_hash}`,
    );
  }
  if (
    manifest.manifest_assembly_contract.compatibility_gate_hash !==
    compatibilityGateHash
  ) {
    throw new ReleaseEvidenceQueryError(
      "RELEASE_EVIDENCE_COMPATIBILITY_GATE_MIXED_CANDIDATE",
      "manifest_assembly_contract.compatibility_gate_hash must mirror the embedded compatibility gate",
    );
  }
  if (
    expected.compatibility_gate_hash !== undefined &&
    compatibilityGateHash !== expected.compatibility_gate_hash
  ) {
    throw new ReleaseEvidenceQueryError(
      "RELEASE_EVIDENCE_COMPATIBILITY_GATE_MIXED_CANDIDATE",
      `manifest ${manifest.verification_manifest_id} belongs to compatibility gate ${compatibilityGateHash}, not ${expected.compatibility_gate_hash}`,
    );
  }

  for (const [gateName, gate] of Object.entries(gateMap(manifest))) {
    if (gate.candidate_identity_hash !== candidateHash) {
      throw new ReleaseEvidenceQueryError(
        "RELEASE_EVIDENCE_MANIFEST_MIXED_CANDIDATE",
        `blocking_gates.${gateName}.candidate_identity_hash must mirror the manifest candidate`,
      );
    }
    const compatibilityBoundGate =
      gateName === "schema_compatibility" ||
      gateName === "migration_verification" ||
      gateName === "operator_client";
    if (compatibilityBoundGate) {
      if (gate.compatibility_gate_hash_or_null !== compatibilityGateHash) {
        throw new ReleaseEvidenceQueryError(
          "RELEASE_EVIDENCE_COMPATIBILITY_GATE_MIXED_CANDIDATE",
          `blocking_gates.${gateName}.compatibility_gate_hash_or_null must mirror the embedded compatibility gate`,
        );
      }
    } else if (gate.compatibility_gate_hash_or_null !== null) {
      throw new ReleaseEvidenceQueryError(
        "RELEASE_EVIDENCE_COMPATIBILITY_GATE_MIXED_CANDIDATE",
        `blocking_gates.${gateName}.compatibility_gate_hash_or_null must stay null`,
      );
    }
  }
  return manifest;
}

function cloneStoredManifest(record: StoredReleaseVerificationManifestRecord) {
  return clone(record);
}

export function storedReleaseVerificationManifest(input: {
  persisted_at: string;
  release_verification_manifest: ReleaseVerificationManifestRecord;
}): StoredReleaseVerificationManifestRecord {
  const manifest = assertReleaseVerificationManifestBinding(
    input.release_verification_manifest,
  );
  return {
    verification_manifest_id: manifest.verification_manifest_id,
    verification_manifest_ref: releaseVerificationManifestRef(manifest),
    candidate_identity_hash: manifest.candidate_identity_hash,
    compatibility_gate_hash: releaseVerificationManifestCompatibilityGateHash(manifest),
    decision_state: manifest.decision_state,
    superseded_by_verification_manifest_ref:
      manifest.superseded_by_verification_manifest_ref,
    created_at: normalizeUtcInstantString(manifest.created_at),
    persisted_at: normalizeUtcInstantString(input.persisted_at),
    release_verification_manifest: clone(manifest),
  };
}

export class ReleaseVerificationManifestReadRepository
  implements ReleaseVerificationManifestReadSource
{
  private readonly manifests = new Map<string, StoredReleaseVerificationManifestRecord>();

  async persistReleaseVerificationManifest(input: {
    persisted_at: string;
    release_verification_manifest: ReleaseVerificationManifestRecord;
  }) {
    const stored = storedReleaseVerificationManifest(input);
    const existing = this.manifests.get(stored.verification_manifest_id);
    if (existing) {
      if (
        stableJsonHash(existing.release_verification_manifest) !==
        stableJsonHash(stored.release_verification_manifest)
      ) {
        throw new ReleaseEvidenceQueryError(
          "RELEASE_EVIDENCE_MANIFEST_DUPLICATE",
          `release verification manifest ${stored.verification_manifest_id} already exists with a different payload`,
        );
      }
      return cloneStoredManifest(existing);
    }
    this.manifests.set(stored.verification_manifest_id, cloneStoredManifest(stored));
    return cloneStoredManifest(stored);
  }

  async getReleaseVerificationManifestById(verificationManifestId: string) {
    const stored = this.manifests.get(verificationManifestId);
    if (!stored) {
      throw new ReleaseEvidenceQueryError(
        "RELEASE_EVIDENCE_NOT_FOUND",
        `release verification manifest ${verificationManifestId} does not exist`,
      );
    }
    return cloneStoredManifest(stored);
  }

  async listReleaseVerificationManifests(
    query: ReleaseVerificationManifestListQuery = {},
  ) {
    let records = [...this.manifests.values()];
    if (query.candidate_identity_hash !== undefined) {
      records = records.filter(
        (record) => record.candidate_identity_hash === query.candidate_identity_hash,
      );
    }
    if (query.compatibility_gate_hash !== undefined) {
      records = records.filter(
        (record) => record.compatibility_gate_hash === query.compatibility_gate_hash,
      );
    }
    if (query.decision_state !== undefined) {
      records = records.filter((record) => record.decision_state === query.decision_state);
    }
    if (query.deployment_release_ref !== undefined) {
      records = records.filter(
        (record) =>
          record.release_verification_manifest.deployment_release_ref ===
          query.deployment_release_ref,
      );
    }
    return sortByString(
      records,
      (record) =>
        `${record.candidate_identity_hash}:${record.compatibility_gate_hash}:${record.created_at}:${record.verification_manifest_id}`,
    ).map(cloneStoredManifest);
  }
}

export function deriveReleaseEvidenceEtag(payload: unknown) {
  return `"release-evidence.${stableJsonHash(payload)}"`;
}

function manifestLineageEntry(
  record: StoredReleaseVerificationManifestRecord,
): ReleaseEvidenceManifestLineageEntry {
  return {
    compatibility_gate_hash: record.compatibility_gate_hash,
    decision_state: record.decision_state,
    superseded_by_verification_manifest_ref:
      record.superseded_by_verification_manifest_ref,
    supersession_state:
      record.decision_state === "SUPERSEDED" ||
      record.superseded_by_verification_manifest_ref !== null
        ? "SUPERSEDED"
        : "CURRENT",
    verification_manifest_id: record.verification_manifest_id,
  };
}

function deriveCurrentness(
  manifests: readonly StoredReleaseVerificationManifestRecord[],
): ReleaseEvidenceCurrentnessState {
  if (manifests.length === 0) {
    return "NO_MANIFEST";
  }
  const current = manifests.filter(
    (record) =>
      record.decision_state !== "SUPERSEDED" &&
      record.superseded_by_verification_manifest_ref === null,
  );
  if (current.length === 0) {
    return "SUPERSEDED";
  }
  if (current.some((record) => record.decision_state === "BLOCKED")) {
    return "BLOCKED";
  }
  return "CURRENT";
}

function companionAvailability(input: {
  available: boolean;
  durableRefOnly?: boolean;
  ref: string | null;
  required: boolean;
}): ReleaseEvidenceCompanionAvailability {
  if (input.ref === null) {
    return input.required ? "MISSING_REF" : "NOT_REQUIRED";
  }
  if (input.durableRefOnly) {
    return "AVAILABLE_REF_ONLY";
  }
  return input.available ? "AVAILABLE" : "MISSING_RECORD";
}

export function summarizeManifestCompanionEvidence(input: {
  canaryHealthSummaryRecords: readonly StoredCanaryHealthSummaryRecord[];
  clientCompatibilityMatrixRecords: readonly StoredClientCompatibilityMatrixRecord[];
  manifest: ReleaseVerificationManifestRecord;
  restoreDrillResultRecords: readonly StoredRestoreDrillResultRecord[];
}): ReleaseEvidenceCompanionEvidence[] {
  const gates = gateMap(input.manifest);
  const performanceRequired = gates.performance_and_canary?.status === "GREEN";
  const clientRequired = gates.operator_client?.status === "GREEN";
  const deterministicRequired =
    gates.deterministic_and_state_machine?.status === "GREEN";
  const restoreRequired = gates.restore_drill?.status === "GREEN";
  const canaryIds = new Set(
    input.canaryHealthSummaryRecords.map((record) => record.canary_summary_id),
  );
  const matrixIds = new Set(
    input.clientCompatibilityMatrixRecords.map(
      (record) => record.compatibility_matrix_id,
    ),
  );
  const restoreIds = new Set(
    input.restoreDrillResultRecords.map((record) => record.restore_drill_id),
  );
  const manifestId = input.manifest.verification_manifest_id;
  return [
    {
      availability_state: companionAvailability({
        available:
          input.manifest.canary_summary_ref !== null &&
          canaryIds.has(input.manifest.canary_summary_ref),
        ref: input.manifest.canary_summary_ref,
        required: performanceRequired,
      }),
      evidence_kind: "CANARY_SUMMARY",
      ref_or_null: input.manifest.canary_summary_ref,
      required_by_gate: performanceRequired,
      verification_manifest_id: manifestId,
    },
    {
      availability_state: companionAvailability({
        durableRefOnly: true,
        ref: input.manifest.deterministic_golden_pack_ref,
        required: deterministicRequired,
      }),
      evidence_kind: "DETERMINISTIC_GOLDEN_PACK",
      ref_or_null: input.manifest.deterministic_golden_pack_ref,
      required_by_gate: deterministicRequired,
      verification_manifest_id: manifestId,
    },
    {
      availability_state: companionAvailability({
        available:
          input.manifest.restore_drill_ref !== null &&
          restoreIds.has(input.manifest.restore_drill_ref),
        ref: input.manifest.restore_drill_ref,
        required: restoreRequired,
      }),
      evidence_kind: "RESTORE_DRILL",
      ref_or_null: input.manifest.restore_drill_ref,
      required_by_gate: restoreRequired,
      verification_manifest_id: manifestId,
    },
    {
      availability_state: companionAvailability({
        durableRefOnly: true,
        ref: input.manifest.restore_checkpoint_ref,
        required: restoreRequired,
      }),
      evidence_kind: "RESTORE_CHECKPOINT",
      ref_or_null: input.manifest.restore_checkpoint_ref,
      required_by_gate: restoreRequired,
      verification_manifest_id: manifestId,
    },
    {
      availability_state: companionAvailability({
        available:
          input.manifest.client_compatibility_matrix_ref !== null &&
          matrixIds.has(input.manifest.client_compatibility_matrix_ref),
        ref: input.manifest.client_compatibility_matrix_ref,
        required: clientRequired,
      }),
      evidence_kind: "CLIENT_COMPATIBILITY_MATRIX",
      ref_or_null: input.manifest.client_compatibility_matrix_ref,
      required_by_gate: clientRequired,
      verification_manifest_id: manifestId,
    },
  ];
}

function assertCandidateRows(input: {
  candidateIdentityHash: string;
  label: string;
  records: readonly { candidate_identity_hash: string }[];
}) {
  for (const record of input.records) {
    if (record.candidate_identity_hash !== input.candidateIdentityHash) {
      throw new ReleaseEvidenceQueryError(
        "RELEASE_EVIDENCE_MANIFEST_MIXED_CANDIDATE",
        `${input.label} belongs to ${record.candidate_identity_hash}, not ${input.candidateIdentityHash}`,
      );
    }
  }
}

function filterByCompatibilityGate<T extends { compatibility_gate_hash: string }>(
  records: readonly T[],
  compatibilityGateHash: string | null,
) {
  if (compatibilityGateHash === null) {
    return [...records];
  }
  return records.filter((record) => record.compatibility_gate_hash === compatibilityGateHash);
}

export async function getReleaseCandidateIdentityBundle(input: {
  candidate_identity_hash: string;
  compatibility_gate_hash?: string | null;
  source: ReleaseEvidenceBundleSource;
}): Promise<ReleaseCandidateIdentityBundle> {
  const candidateIdentityHash = requireTrimmedString(
    "candidate_identity_hash",
    input.candidate_identity_hash,
  );
  const compatibilityGateHash =
    input.compatibility_gate_hash === undefined
      ? null
      : input.compatibility_gate_hash === null
        ? null
        : requireTrimmedString("compatibility_gate_hash", input.compatibility_gate_hash);
  const candidateRecord =
    await input.source.buildArtifactRepository.getReleaseCandidateIdentityContractByHash(
      candidateIdentityHash,
    );
  const buildArtifactRecord = await optionalRead(() =>
    input.source.buildArtifactRepository.getBuildArtifactByRef(
      candidateRecord.build_artifact_ref,
    ),
  );
  const allCompatibilityGates =
    await input.source.releaseVerificationManifestAssemblyRepository.listSchemaBundleCompatibilityGateContracts(
      { candidate_identity_hash: candidateIdentityHash },
    );
  const compatibilityGateRecords =
    compatibilityGateHash === null
      ? allCompatibilityGates
      : [
          await input.source.releaseVerificationManifestAssemblyRepository.getSchemaBundleCompatibilityGateContractByHash(
            compatibilityGateHash,
          ),
        ];
  assertCandidateRows({
    candidateIdentityHash,
    label: "schema bundle compatibility gate",
    records: compatibilityGateRecords,
  });
  if (
    compatibilityGateHash !== null &&
    compatibilityGateRecords[0]?.candidate_identity_hash !== candidateIdentityHash
  ) {
    throw new ReleaseEvidenceQueryError(
      "RELEASE_EVIDENCE_COMPATIBILITY_GATE_MIXED_CANDIDATE",
      `compatibility gate ${compatibilityGateHash} does not belong to ${candidateIdentityHash}`,
    );
  }
  const manifestAssemblyRecords = filterByCompatibilityGate(
    await input.source.releaseVerificationManifestAssemblyRepository.listReleaseVerificationManifestAssemblyContracts(
      { candidate_identity_hash: candidateIdentityHash },
    ),
    compatibilityGateHash,
  );
  assertCandidateRows({
    candidateIdentityHash,
    label: "release verification manifest assembly",
    records: manifestAssemblyRecords,
  });
  const releaseVerificationManifestRecords =
    await input.source.releaseVerificationManifestRepository.listReleaseVerificationManifests(
      {
        candidate_identity_hash: candidateIdentityHash,
        ...(compatibilityGateHash === null
          ? {}
          : { compatibility_gate_hash: compatibilityGateHash }),
      },
    );
  for (const record of releaseVerificationManifestRecords) {
    assertReleaseVerificationManifestBinding(record.release_verification_manifest, {
      candidate_identity_hash: candidateIdentityHash,
      ...(compatibilityGateHash === null
        ? {}
        : { compatibility_gate_hash: compatibilityGateHash }),
    });
  }
  const verificationSuiteResultRecords =
    await input.source.verificationSuiteResultRepository.listVerificationSuiteResults({
      candidate_identity_hash: candidateIdentityHash,
    });
  const gateAdmissibilityRecords =
    await input.source.gateAdmissibilityRecordRepository.listGateAdmissibilityRecords({
      candidate_identity_hash: candidateIdentityHash,
    });
  const clientCompatibilityMatrixRecords = filterByCompatibilityGate(
    await input.source.clientCompatibilityMatrixRepository.listClientCompatibilityMatrices(
      { candidate_identity_hash: candidateIdentityHash },
    ),
    compatibilityGateHash,
  );
  const restoreDrillResultRecords =
    await input.source.restoreDrillResultRepository.listRestoreDrillResults({
      candidate_identity_hash: candidateIdentityHash,
    });
  const canaryHealthSummaryRecords =
    await input.source.deploymentReleaseRepository.listCanaryHealthSummaries({
      candidate_identity_hash: candidateIdentityHash,
    });
  const deploymentReleaseRecords =
    await input.source.deploymentReleaseRepository.listDeploymentReleases({
      candidate_identity_hash: candidateIdentityHash,
    });

  assertCandidateRows({
    candidateIdentityHash,
    label: "verification suite result",
    records: verificationSuiteResultRecords,
  });
  assertCandidateRows({
    candidateIdentityHash,
    label: "gate admissibility record",
    records: gateAdmissibilityRecords,
  });
  assertCandidateRows({
    candidateIdentityHash,
    label: "client compatibility matrix",
    records: clientCompatibilityMatrixRecords,
  });
  assertCandidateRows({
    candidateIdentityHash,
    label: "restore drill result",
    records: restoreDrillResultRecords,
  });
  assertCandidateRows({
    candidateIdentityHash,
    label: "canary health summary",
    records: canaryHealthSummaryRecords,
  });
  assertCandidateRows({
    candidateIdentityHash,
    label: "deployment release",
    records: deploymentReleaseRecords,
  });

  const companionEvidence = releaseVerificationManifestRecords.flatMap((record) =>
    summarizeManifestCompanionEvidence({
      canaryHealthSummaryRecords,
      clientCompatibilityMatrixRecords,
      manifest: record.release_verification_manifest,
      restoreDrillResultRecords,
    }),
  );
  const bodyWithoutEtag = {
    artifact_type: "ReleaseCandidateIdentityBundle" as const,
    build_artifact_record_or_null: buildArtifactRecord,
    canary_health_summary_records: canaryHealthSummaryRecords,
    candidate_identity_hash: candidateIdentityHash,
    candidate_identity_record: candidateRecord,
    client_compatibility_matrix_records: clientCompatibilityMatrixRecords,
    companion_evidence: companionEvidence,
    compatibility_gate_records: compatibilityGateRecords,
    currentness_state: deriveCurrentness(releaseVerificationManifestRecords),
    deployment_release_records: deploymentReleaseRecords,
    dto_version: RELEASE_EVIDENCE_QUERY_DTO_VERSION,
    gate_admissibility_records: gateAdmissibilityRecords,
    manifest_assembly_records: manifestAssemblyRecords,
    manifest_lineage: releaseVerificationManifestRecords.map(manifestLineageEntry),
    missing_companion_evidence: companionEvidence.filter((entry) =>
      entry.availability_state.startsWith("MISSING"),
    ),
    read_key: {
      candidate_identity_hash: candidateIdentityHash,
      compatibility_gate_hash_or_null: compatibilityGateHash,
      key_type: "candidate_identity_hash" as const,
    },
    release_verification_manifest_records: releaseVerificationManifestRecords,
    restore_drill_result_records: restoreDrillResultRecords,
    verification_suite_result_records: verificationSuiteResultRecords,
  };
  return {
    ...bodyWithoutEtag,
    etag: deriveReleaseEvidenceEtag(bodyWithoutEtag),
  };
}
