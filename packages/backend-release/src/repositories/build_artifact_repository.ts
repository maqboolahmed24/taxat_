import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  assertBuildArtifactRecord,
  buildArtifactRef,
  cloneBuildArtifactRecord,
  normalizeBuildArtifactRecord,
  type BuildArtifactDraft,
  type BuildArtifactRecord,
} from "../models/build_artifact.ts";
import {
  assertReleaseCandidateIdentityContract,
  cloneReleaseCandidateIdentityContract,
  releaseCandidateIdentityContractRef,
  type ReleaseCandidateIdentityContractRecord,
} from "../models/release_candidate_identity_contract.ts";

export type StoredBuildArtifactRecord = {
  build_id: string;
  build_artifact_ref: string;
  artifact_digest: string;
  artifact_registry_ref: string;
  release_channel: string;
  distribution_targets: BuildArtifactRecord["distribution_targets"];
  build_artifact_row_version: number;
  persisted_at: string;
  build_artifact: BuildArtifactRecord;
};

export type StoredReleaseCandidateIdentityContractRecord = {
  candidate_identity_hash: string;
  candidate_identity_contract_ref: string;
  candidate_environment_ref: string;
  build_artifact_ref: string;
  artifact_digest: string;
  schema_bundle_hash: string;
  config_bundle_hash: string;
  migration_plan_ref_or_null: string | null;
  enabled_provider_profile_refs: string[];
  supported_client_window_ref_or_null: string | null;
  release_candidate_identity_row_version: number;
  persisted_at: string;
  release_candidate_identity_contract: ReleaseCandidateIdentityContractRecord;
};

export type BuildArtifactListQuery = {
  release_channel?: string;
  artifact_digest?: string;
  distribution_target?: BuildArtifactRecord["distribution_targets"][number];
};

export type ReleaseCandidateIdentityListQuery = {
  candidate_environment_ref?: string;
  build_artifact_ref?: string;
  artifact_digest?: string;
  schema_bundle_hash?: string;
  config_bundle_hash?: string;
  include_migration_plan_ref_or_null?: string | null;
  supported_client_window_ref_or_null?: string | null;
};

export type BuildArtifactRepositoryErrorCode =
  | "BUILD_ARTIFACT_DUPLICATE"
  | "BUILD_ARTIFACT_NOT_FOUND"
  | "BUILD_ARTIFACT_REF_COLLISION"
  | "RELEASE_CANDIDATE_IDENTITY_DUPLICATE"
  | "RELEASE_CANDIDATE_IDENTITY_NOT_FOUND"
  | "RELEASE_CANDIDATE_IDENTITY_REF_COLLISION";

export class BuildArtifactRepositoryError extends Error {
  readonly code: BuildArtifactRepositoryErrorCode;

  constructor(code: BuildArtifactRepositoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "BuildArtifactRepositoryError";
    this.code = code;
  }
}

function cloneStoredBuildArtifact(record: StoredBuildArtifactRecord) {
  return structuredClone(record);
}

function cloneStoredCandidate(record: StoredReleaseCandidateIdentityContractRecord) {
  return structuredClone(record);
}

function pushIndex(index: Map<string, string[]>, key: string, id: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(id)) {
    current.push(id);
    index.set(key, current);
  }
}

function sortStoredBuildArtifact(
  left: StoredBuildArtifactRecord,
  right: StoredBuildArtifactRecord,
) {
  return (
    left.release_channel.localeCompare(right.release_channel) ||
    left.build_artifact.build_time.localeCompare(right.build_artifact.build_time) ||
    left.build_id.localeCompare(right.build_id)
  );
}

function sortStoredCandidate(
  left: StoredReleaseCandidateIdentityContractRecord,
  right: StoredReleaseCandidateIdentityContractRecord,
) {
  return (
    left.candidate_environment_ref.localeCompare(right.candidate_environment_ref) ||
    left.build_artifact_ref.localeCompare(right.build_artifact_ref) ||
    left.candidate_identity_hash.localeCompare(right.candidate_identity_hash)
  );
}

export class BuildArtifactRepository {
  private readonly buildArtifactIdByRef = new Map<string, string>();
  private readonly buildArtifactIdByRegistryRef = new Map<string, string>();
  private readonly buildArtifactIdsByDigest = new Map<string, string[]>();
  private readonly buildArtifactIdsByReleaseChannel = new Map<string, string[]>();
  private readonly buildArtifacts = new Map<string, StoredBuildArtifactRecord>();

  private readonly candidateHashByRef = new Map<string, string>();
  private readonly candidateHashesByArtifactDigest = new Map<string, string[]>();
  private readonly candidateHashesByBuildArtifactRef = new Map<string, string[]>();
  private readonly candidateHashesByConfigBundleHash = new Map<string, string[]>();
  private readonly candidateHashesByEnvironmentRef = new Map<string, string[]>();
  private readonly candidateHashesBySchemaBundleHash = new Map<string, string[]>();
  private readonly candidateIdentityContracts = new Map<
    string,
    StoredReleaseCandidateIdentityContractRecord
  >();

  private rebuildBuildArtifactIndexes() {
    this.buildArtifactIdByRef.clear();
    this.buildArtifactIdByRegistryRef.clear();
    this.buildArtifactIdsByDigest.clear();
    this.buildArtifactIdsByReleaseChannel.clear();
    for (const stored of this.buildArtifacts.values()) {
      this.buildArtifactIdByRef.set(stored.build_artifact_ref, stored.build_id);
      this.buildArtifactIdByRegistryRef.set(
        stored.artifact_registry_ref,
        stored.build_id,
      );
      pushIndex(this.buildArtifactIdsByDigest, stored.artifact_digest, stored.build_id);
      pushIndex(
        this.buildArtifactIdsByReleaseChannel,
        stored.release_channel,
        stored.build_id,
      );
    }
  }

  private rebuildCandidateIndexes() {
    this.candidateHashByRef.clear();
    this.candidateHashesByArtifactDigest.clear();
    this.candidateHashesByBuildArtifactRef.clear();
    this.candidateHashesByConfigBundleHash.clear();
    this.candidateHashesByEnvironmentRef.clear();
    this.candidateHashesBySchemaBundleHash.clear();
    for (const stored of this.candidateIdentityContracts.values()) {
      this.candidateHashByRef.set(
        stored.candidate_identity_contract_ref,
        stored.candidate_identity_hash,
      );
      pushIndex(
        this.candidateHashesByArtifactDigest,
        stored.artifact_digest,
        stored.candidate_identity_hash,
      );
      pushIndex(
        this.candidateHashesByBuildArtifactRef,
        stored.build_artifact_ref,
        stored.candidate_identity_hash,
      );
      pushIndex(
        this.candidateHashesByConfigBundleHash,
        stored.config_bundle_hash,
        stored.candidate_identity_hash,
      );
      pushIndex(
        this.candidateHashesByEnvironmentRef,
        stored.candidate_environment_ref,
        stored.candidate_identity_hash,
      );
      pushIndex(
        this.candidateHashesBySchemaBundleHash,
        stored.schema_bundle_hash,
        stored.candidate_identity_hash,
      );
    }
  }

  private storedBuildArtifact(input: {
    build_artifact: BuildArtifactRecord;
    persisted_at: string;
  }): StoredBuildArtifactRecord {
    const buildArtifact = assertBuildArtifactRecord(input.build_artifact);
    return {
      build_id: buildArtifact.build_id,
      build_artifact_ref: buildArtifactRef(buildArtifact),
      artifact_digest: buildArtifact.artifact_digest,
      artifact_registry_ref: buildArtifact.artifact_registry_ref,
      release_channel: buildArtifact.release_channel,
      distribution_targets: [...buildArtifact.distribution_targets],
      build_artifact_row_version: 1,
      persisted_at: normalizeUtcInstantString(input.persisted_at),
      build_artifact: cloneBuildArtifactRecord(buildArtifact),
    };
  }

  private storedCandidate(input: {
    release_candidate_identity_contract: ReleaseCandidateIdentityContractRecord;
    persisted_at: string;
  }): StoredReleaseCandidateIdentityContractRecord {
    const contract = assertReleaseCandidateIdentityContract(
      input.release_candidate_identity_contract,
    );
    return {
      candidate_identity_hash: contract.candidate_identity_hash,
      candidate_identity_contract_ref: releaseCandidateIdentityContractRef(contract),
      candidate_environment_ref: contract.candidate_environment_ref,
      build_artifact_ref: contract.build_artifact_ref,
      artifact_digest: contract.artifact_digest,
      schema_bundle_hash: contract.schema_bundle_hash,
      config_bundle_hash: contract.config_bundle_hash,
      migration_plan_ref_or_null: contract.migration_plan_ref_or_null,
      enabled_provider_profile_refs: [...contract.enabled_provider_profile_refs],
      supported_client_window_ref_or_null:
        contract.supported_client_window_ref_or_null,
      release_candidate_identity_row_version: 1,
      persisted_at: normalizeUtcInstantString(input.persisted_at),
      release_candidate_identity_contract:
        cloneReleaseCandidateIdentityContract(contract),
    };
  }

  private listBuildArtifactsByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.buildArtifacts.get(id))
      .filter((record): record is StoredBuildArtifactRecord => record !== undefined)
      .sort(sortStoredBuildArtifact)
      .map(cloneStoredBuildArtifact);
  }

  private listCandidatesByHashes(hashes: readonly string[]) {
    return hashes
      .map((hash) => this.candidateIdentityContracts.get(hash))
      .filter(
        (record): record is StoredReleaseCandidateIdentityContractRecord =>
          record !== undefined,
      )
      .sort(sortStoredCandidate)
      .map(cloneStoredCandidate);
  }

  async persistBuildArtifact(input: {
    build_artifact: BuildArtifactDraft | BuildArtifactRecord;
    persisted_at: string;
  }) {
    const buildArtifact = normalizeBuildArtifactRecord(input.build_artifact);
    const stored = this.storedBuildArtifact({
      build_artifact: buildArtifact,
      persisted_at: input.persisted_at,
    });
    const existing = this.buildArtifacts.get(stored.build_id);
    if (existing) {
      if (JSON.stringify(existing.build_artifact) !== JSON.stringify(buildArtifact)) {
        throw new BuildArtifactRepositoryError(
          "BUILD_ARTIFACT_DUPLICATE",
          `build artifact ${stored.build_id} already exists with a different payload`,
        );
      }
      return cloneStoredBuildArtifact(existing);
    }
    const existingRefOwner = this.buildArtifactIdByRef.get(stored.build_artifact_ref);
    if (existingRefOwner !== undefined) {
      throw new BuildArtifactRepositoryError(
        "BUILD_ARTIFACT_REF_COLLISION",
        `build artifact ref ${stored.build_artifact_ref} already belongs to ${existingRefOwner}`,
      );
    }
    const existingRegistryOwner = this.buildArtifactIdByRegistryRef.get(
      stored.artifact_registry_ref,
    );
    if (existingRegistryOwner !== undefined) {
      throw new BuildArtifactRepositoryError(
        "BUILD_ARTIFACT_REF_COLLISION",
        `artifact registry ref ${stored.artifact_registry_ref} already belongs to ${existingRegistryOwner}`,
      );
    }
    this.buildArtifacts.set(stored.build_id, cloneStoredBuildArtifact(stored));
    this.rebuildBuildArtifactIndexes();
    return cloneStoredBuildArtifact(stored);
  }

  async persistReleaseCandidateIdentityContract(input: {
    release_candidate_identity_contract: ReleaseCandidateIdentityContractRecord;
    persisted_at: string;
  }) {
    const stored = this.storedCandidate(input);
    const existing = this.candidateIdentityContracts.get(stored.candidate_identity_hash);
    if (existing) {
      if (
        JSON.stringify(existing.release_candidate_identity_contract) !==
        JSON.stringify(stored.release_candidate_identity_contract)
      ) {
        throw new BuildArtifactRepositoryError(
          "RELEASE_CANDIDATE_IDENTITY_DUPLICATE",
          `candidate identity hash ${stored.candidate_identity_hash} already exists with a different tuple`,
        );
      }
      return cloneStoredCandidate(existing);
    }
    const existingRefOwner = this.candidateHashByRef.get(
      stored.candidate_identity_contract_ref,
    );
    if (existingRefOwner !== undefined) {
      throw new BuildArtifactRepositoryError(
        "RELEASE_CANDIDATE_IDENTITY_REF_COLLISION",
        `candidate contract ref ${stored.candidate_identity_contract_ref} already belongs to ${existingRefOwner}`,
      );
    }
    this.candidateIdentityContracts.set(
      stored.candidate_identity_hash,
      cloneStoredCandidate(stored),
    );
    this.rebuildCandidateIndexes();
    return cloneStoredCandidate(stored);
  }

  async getBuildArtifactById(buildId: string) {
    const stored = this.buildArtifacts.get(buildId);
    if (!stored) {
      throw new BuildArtifactRepositoryError(
        "BUILD_ARTIFACT_NOT_FOUND",
        `build artifact ${buildId} does not exist`,
      );
    }
    return cloneStoredBuildArtifact(stored);
  }

  async getBuildArtifactByRef(buildArtifactRefValue: string) {
    const id = this.buildArtifactIdByRef.get(buildArtifactRefValue);
    if (!id) {
      throw new BuildArtifactRepositoryError(
        "BUILD_ARTIFACT_NOT_FOUND",
        `build artifact ref ${buildArtifactRefValue} does not exist`,
      );
    }
    return this.getBuildArtifactById(id);
  }

  async getReleaseCandidateIdentityContractByHash(candidateIdentityHash: string) {
    const stored = this.candidateIdentityContracts.get(candidateIdentityHash);
    if (!stored) {
      throw new BuildArtifactRepositoryError(
        "RELEASE_CANDIDATE_IDENTITY_NOT_FOUND",
        `candidate identity hash ${candidateIdentityHash} does not exist`,
      );
    }
    return cloneStoredCandidate(stored);
  }

  async getReleaseCandidateIdentityContractByRef(contractRef: string) {
    const hash = this.candidateHashByRef.get(contractRef);
    if (!hash) {
      throw new BuildArtifactRepositoryError(
        "RELEASE_CANDIDATE_IDENTITY_NOT_FOUND",
        `candidate contract ref ${contractRef} does not exist`,
      );
    }
    return this.getReleaseCandidateIdentityContractByHash(hash);
  }

  async listBuildArtifacts(query: BuildArtifactListQuery = {}) {
    let records = [...this.buildArtifacts.values()];
    if (query.release_channel) {
      records = this.listBuildArtifactsByIds(
        this.buildArtifactIdsByReleaseChannel.get(query.release_channel) ?? [],
      );
    }
    if (query.artifact_digest) {
      const ids = new Set(this.buildArtifactIdsByDigest.get(query.artifact_digest) ?? []);
      records = records.filter((record) => ids.has(record.build_id));
    }
    if (query.distribution_target) {
      records = records.filter((record) =>
        record.distribution_targets.includes(query.distribution_target!),
      );
    }
    return records.sort(sortStoredBuildArtifact).map(cloneStoredBuildArtifact);
  }

  async listReleaseCandidateIdentityContracts(
    query: ReleaseCandidateIdentityListQuery = {},
  ) {
    let records = [...this.candidateIdentityContracts.values()];
    if (query.candidate_environment_ref) {
      records = this.listCandidatesByHashes(
        this.candidateHashesByEnvironmentRef.get(query.candidate_environment_ref) ?? [],
      );
    }
    if (query.build_artifact_ref) {
      const hashes = new Set(
        this.candidateHashesByBuildArtifactRef.get(query.build_artifact_ref) ?? [],
      );
      records = records.filter((record) => hashes.has(record.candidate_identity_hash));
    }
    if (query.artifact_digest) {
      const hashes = new Set(
        this.candidateHashesByArtifactDigest.get(query.artifact_digest) ?? [],
      );
      records = records.filter((record) => hashes.has(record.candidate_identity_hash));
    }
    if (query.schema_bundle_hash) {
      const hashes = new Set(
        this.candidateHashesBySchemaBundleHash.get(query.schema_bundle_hash) ?? [],
      );
      records = records.filter((record) => hashes.has(record.candidate_identity_hash));
    }
    if (query.config_bundle_hash) {
      const hashes = new Set(
        this.candidateHashesByConfigBundleHash.get(query.config_bundle_hash) ?? [],
      );
      records = records.filter((record) => hashes.has(record.candidate_identity_hash));
    }
    if (Object.prototype.hasOwnProperty.call(query, "include_migration_plan_ref_or_null")) {
      records = records.filter(
        (record) =>
          record.migration_plan_ref_or_null === query.include_migration_plan_ref_or_null,
      );
    }
    if (Object.prototype.hasOwnProperty.call(query, "supported_client_window_ref_or_null")) {
      records = records.filter(
        (record) =>
          record.supported_client_window_ref_or_null ===
          query.supported_client_window_ref_or_null,
      );
    }
    return records.sort(sortStoredCandidate).map(cloneStoredCandidate);
  }
}
