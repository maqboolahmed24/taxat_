import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  assertReleaseVerificationManifestAssemblyContract,
  cloneReleaseVerificationManifestAssemblyContract,
  type ReleaseVerificationAssemblyDecisionState,
  type ReleaseVerificationManifestAssemblyContractRecord,
  type ReleaseVerificationMigrationMode,
} from "../models/release_verification_manifest_assembly_contract.ts";
import {
  assertSchemaBundleCompatibilityGateContract,
  cloneSchemaBundleCompatibilityGateContract,
  type SchemaBundleCompatibilityGateContractRecord,
} from "../models/schema_bundle_compatibility_gate_contract.ts";

export type ReleaseVerificationManifestAssemblyContractSchemaKind =
  | "schema_bundle_compatibility_gate_contract"
  | "release_verification_manifest_assembly_contract";

export type ReleaseVerificationManifestAssemblyContractSchemaValidator = (
  kind: ReleaseVerificationManifestAssemblyContractSchemaKind,
  payload: unknown,
) => Promise<void> | void;

export type ReleaseVerificationManifestAssemblyRepositoryInput = {
  validate_contract_schema: ReleaseVerificationManifestAssemblyContractSchemaValidator;
};

export type StoredSchemaBundleCompatibilityGateContractRecord = {
  compatibility_gate_hash: string;
  candidate_identity_hash: string;
  schema_bundle_hash: string;
  compatibility_window_ref: string;
  reader_window_state: SchemaBundleCompatibilityGateContractRecord["reader_window_state"];
  supported_client_window_ref_or_null: string | null;
  schema_bundle_compatibility_gate_contract_row_version: number;
  persisted_at: string;
  schema_bundle_compatibility_gate_contract: SchemaBundleCompatibilityGateContractRecord;
};

export type StoredReleaseVerificationManifestAssemblyContractRecord = {
  assembly_contract_hash: string;
  candidate_identity_hash: string;
  compatibility_gate_hash: string;
  decision_state: ReleaseVerificationAssemblyDecisionState;
  migration_mode: ReleaseVerificationMigrationMode;
  supported_client_window_ref: string;
  release_verification_manifest_assembly_contract_row_version: number;
  persisted_at: string;
  release_verification_manifest_assembly_contract: ReleaseVerificationManifestAssemblyContractRecord;
};

export type SchemaBundleCompatibilityGateContractListQuery = {
  candidate_identity_hash?: string;
  schema_bundle_hash?: string;
  compatibility_window_ref?: string;
  reader_window_state?: SchemaBundleCompatibilityGateContractRecord["reader_window_state"];
};

export type ReleaseVerificationManifestAssemblyContractListQuery = {
  candidate_identity_hash?: string;
  compatibility_gate_hash?: string;
  decision_state?: ReleaseVerificationAssemblyDecisionState;
  migration_mode?: ReleaseVerificationMigrationMode;
};

export type ReleaseVerificationManifestAssemblyRepositoryErrorCode =
  | "SCHEMA_BUNDLE_COMPATIBILITY_GATE_CONTRACT_DUPLICATE"
  | "SCHEMA_BUNDLE_COMPATIBILITY_GATE_CONTRACT_NOT_FOUND"
  | "RELEASE_VERIFICATION_MANIFEST_ASSEMBLY_CONTRACT_DUPLICATE"
  | "RELEASE_VERIFICATION_MANIFEST_ASSEMBLY_CONTRACT_NOT_FOUND";

export class ReleaseVerificationManifestAssemblyRepositoryError extends Error {
  readonly code: ReleaseVerificationManifestAssemblyRepositoryErrorCode;

  constructor(
    code: ReleaseVerificationManifestAssemblyRepositoryErrorCode,
    detail: string,
  ) {
    super(`${code}: ${detail}`);
    this.name = "ReleaseVerificationManifestAssemblyRepositoryError";
    this.code = code;
  }
}

function cloneStoredCompatibilityGate(
  record: StoredSchemaBundleCompatibilityGateContractRecord,
) {
  return structuredClone(record);
}

function cloneStoredAssembly(
  record: StoredReleaseVerificationManifestAssemblyContractRecord,
) {
  return structuredClone(record);
}

function sortStoredCompatibilityGates(
  left: StoredSchemaBundleCompatibilityGateContractRecord,
  right: StoredSchemaBundleCompatibilityGateContractRecord,
) {
  return (
    left.candidate_identity_hash.localeCompare(right.candidate_identity_hash) ||
    left.compatibility_window_ref.localeCompare(right.compatibility_window_ref) ||
    left.persisted_at.localeCompare(right.persisted_at) ||
    left.compatibility_gate_hash.localeCompare(right.compatibility_gate_hash)
  );
}

function sortStoredAssemblies(
  left: StoredReleaseVerificationManifestAssemblyContractRecord,
  right: StoredReleaseVerificationManifestAssemblyContractRecord,
) {
  return (
    left.candidate_identity_hash.localeCompare(right.candidate_identity_hash) ||
    left.compatibility_gate_hash.localeCompare(right.compatibility_gate_hash) ||
    left.persisted_at.localeCompare(right.persisted_at) ||
    left.assembly_contract_hash.localeCompare(right.assembly_contract_hash)
  );
}

function pushIndex(index: Map<string, string[]>, key: string, id: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(id)) {
    current.push(id);
    index.set(key, current);
  }
}

export class ReleaseVerificationManifestAssemblyRepository {
  private readonly validateContractSchema: ReleaseVerificationManifestAssemblyContractSchemaValidator;
  private readonly compatibilityGates = new Map<
    string,
    StoredSchemaBundleCompatibilityGateContractRecord
  >();
  private readonly assemblies = new Map<
    string,
    StoredReleaseVerificationManifestAssemblyContractRecord
  >();
  private readonly compatibilityGateHashesByCandidateHash = new Map<string, string[]>();
  private readonly compatibilityGateHashesBySchemaBundleHash = new Map<string, string[]>();
  private readonly compatibilityGateHashesByWindowRef = new Map<string, string[]>();
  private readonly assemblyHashesByCandidateHash = new Map<string, string[]>();
  private readonly assemblyHashesByCompatibilityGateHash = new Map<string, string[]>();
  private readonly assemblyHashesByDecisionState = new Map<string, string[]>();

  constructor(input: ReleaseVerificationManifestAssemblyRepositoryInput) {
    this.validateContractSchema = input.validate_contract_schema;
  }

  private async validateCompatibilityGate(
    record: SchemaBundleCompatibilityGateContractRecord,
  ) {
    const normalized = assertSchemaBundleCompatibilityGateContract(record);
    await this.validateContractSchema(
      "schema_bundle_compatibility_gate_contract",
      normalized,
    );
    return normalized;
  }

  private async validateAssemblyContract(
    record: ReleaseVerificationManifestAssemblyContractRecord,
  ) {
    const normalized = assertReleaseVerificationManifestAssemblyContract(record);
    await this.validateContractSchema(
      "release_verification_manifest_assembly_contract",
      normalized,
    );
    return normalized;
  }

  private storedCompatibilityGate(input: {
    schema_bundle_compatibility_gate_contract: SchemaBundleCompatibilityGateContractRecord;
    persisted_at: string;
  }): StoredSchemaBundleCompatibilityGateContractRecord {
    const contract = assertSchemaBundleCompatibilityGateContract(
      input.schema_bundle_compatibility_gate_contract,
    );
    return {
      compatibility_gate_hash: contract.compatibility_gate_hash,
      candidate_identity_hash: contract.candidate_identity_hash,
      schema_bundle_hash: contract.schema_bundle_hash,
      compatibility_window_ref: contract.compatibility_window_ref,
      reader_window_state: contract.reader_window_state,
      supported_client_window_ref_or_null:
        contract.supported_client_window_ref_or_null,
      schema_bundle_compatibility_gate_contract_row_version: 1,
      persisted_at: normalizeUtcInstantString(input.persisted_at),
      schema_bundle_compatibility_gate_contract:
        cloneSchemaBundleCompatibilityGateContract(contract),
    };
  }

  private storedAssembly(input: {
    release_verification_manifest_assembly_contract: ReleaseVerificationManifestAssemblyContractRecord;
    persisted_at: string;
  }): StoredReleaseVerificationManifestAssemblyContractRecord {
    const contract = assertReleaseVerificationManifestAssemblyContract(
      input.release_verification_manifest_assembly_contract,
    );
    return {
      assembly_contract_hash: contract.assembly_contract_hash,
      candidate_identity_hash: contract.candidate_identity_hash,
      compatibility_gate_hash: contract.compatibility_gate_hash,
      decision_state: contract.decision_state,
      migration_mode: contract.migration_mode,
      supported_client_window_ref: contract.supported_client_window_ref,
      release_verification_manifest_assembly_contract_row_version: 1,
      persisted_at: normalizeUtcInstantString(input.persisted_at),
      release_verification_manifest_assembly_contract:
        cloneReleaseVerificationManifestAssemblyContract(contract),
    };
  }

  private rebuildCompatibilityGateIndexes() {
    this.compatibilityGateHashesByCandidateHash.clear();
    this.compatibilityGateHashesBySchemaBundleHash.clear();
    this.compatibilityGateHashesByWindowRef.clear();
    for (const stored of this.compatibilityGates.values()) {
      pushIndex(
        this.compatibilityGateHashesByCandidateHash,
        stored.candidate_identity_hash,
        stored.compatibility_gate_hash,
      );
      pushIndex(
        this.compatibilityGateHashesBySchemaBundleHash,
        stored.schema_bundle_hash,
        stored.compatibility_gate_hash,
      );
      pushIndex(
        this.compatibilityGateHashesByWindowRef,
        stored.compatibility_window_ref,
        stored.compatibility_gate_hash,
      );
    }
  }

  private rebuildAssemblyIndexes() {
    this.assemblyHashesByCandidateHash.clear();
    this.assemblyHashesByCompatibilityGateHash.clear();
    this.assemblyHashesByDecisionState.clear();
    for (const stored of this.assemblies.values()) {
      pushIndex(
        this.assemblyHashesByCandidateHash,
        stored.candidate_identity_hash,
        stored.assembly_contract_hash,
      );
      pushIndex(
        this.assemblyHashesByCompatibilityGateHash,
        stored.compatibility_gate_hash,
        stored.assembly_contract_hash,
      );
      pushIndex(
        this.assemblyHashesByDecisionState,
        stored.decision_state,
        stored.assembly_contract_hash,
      );
    }
  }

  async persistSchemaBundleCompatibilityGateContract(input: {
    schema_bundle_compatibility_gate_contract: SchemaBundleCompatibilityGateContractRecord;
    persisted_at: string;
  }) {
    const normalized = await this.validateCompatibilityGate(
      input.schema_bundle_compatibility_gate_contract,
    );
    const stored = this.storedCompatibilityGate({
      schema_bundle_compatibility_gate_contract: normalized,
      persisted_at: input.persisted_at,
    });
    const existing = this.compatibilityGates.get(stored.compatibility_gate_hash);
    if (existing) {
      if (
        stableJsonHash(existing.schema_bundle_compatibility_gate_contract) !==
        stableJsonHash(stored.schema_bundle_compatibility_gate_contract)
      ) {
        throw new ReleaseVerificationManifestAssemblyRepositoryError(
          "SCHEMA_BUNDLE_COMPATIBILITY_GATE_CONTRACT_DUPLICATE",
          `schema compatibility gate ${stored.compatibility_gate_hash} already exists with a different payload`,
        );
      }
      return cloneStoredCompatibilityGate(existing);
    }
    this.compatibilityGates.set(
      stored.compatibility_gate_hash,
      cloneStoredCompatibilityGate(stored),
    );
    this.rebuildCompatibilityGateIndexes();
    return cloneStoredCompatibilityGate(stored);
  }

  async persistReleaseVerificationManifestAssemblyContract(input: {
    release_verification_manifest_assembly_contract: ReleaseVerificationManifestAssemblyContractRecord;
    persisted_at: string;
  }) {
    const normalized = await this.validateAssemblyContract(
      input.release_verification_manifest_assembly_contract,
    );
    const stored = this.storedAssembly({
      release_verification_manifest_assembly_contract: normalized,
      persisted_at: input.persisted_at,
    });
    const existing = this.assemblies.get(stored.assembly_contract_hash);
    if (existing) {
      if (
        stableJsonHash(existing.release_verification_manifest_assembly_contract) !==
        stableJsonHash(stored.release_verification_manifest_assembly_contract)
      ) {
        throw new ReleaseVerificationManifestAssemblyRepositoryError(
          "RELEASE_VERIFICATION_MANIFEST_ASSEMBLY_CONTRACT_DUPLICATE",
          `release verification manifest assembly ${stored.assembly_contract_hash} already exists with a different payload`,
        );
      }
      return cloneStoredAssembly(existing);
    }
    this.assemblies.set(stored.assembly_contract_hash, cloneStoredAssembly(stored));
    this.rebuildAssemblyIndexes();
    return cloneStoredAssembly(stored);
  }

  async getSchemaBundleCompatibilityGateContractByHash(
    compatibilityGateHash: string,
  ) {
    const stored = this.compatibilityGates.get(compatibilityGateHash);
    if (!stored) {
      throw new ReleaseVerificationManifestAssemblyRepositoryError(
        "SCHEMA_BUNDLE_COMPATIBILITY_GATE_CONTRACT_NOT_FOUND",
        `schema compatibility gate ${compatibilityGateHash} does not exist`,
      );
    }
    return cloneStoredCompatibilityGate(stored);
  }

  async getReleaseVerificationManifestAssemblyContractByHash(
    assemblyContractHash: string,
  ) {
    const stored = this.assemblies.get(assemblyContractHash);
    if (!stored) {
      throw new ReleaseVerificationManifestAssemblyRepositoryError(
        "RELEASE_VERIFICATION_MANIFEST_ASSEMBLY_CONTRACT_NOT_FOUND",
        `release verification manifest assembly ${assemblyContractHash} does not exist`,
      );
    }
    return cloneStoredAssembly(stored);
  }

  async listSchemaBundleCompatibilityGateContracts(
    query: SchemaBundleCompatibilityGateContractListQuery = {},
  ) {
    let records = [...this.compatibilityGates.values()];
    if (query.candidate_identity_hash) {
      const ids = new Set(
        this.compatibilityGateHashesByCandidateHash.get(
          query.candidate_identity_hash,
        ) ?? [],
      );
      records = records.filter((record) => ids.has(record.compatibility_gate_hash));
    }
    if (query.schema_bundle_hash) {
      const ids = new Set(
        this.compatibilityGateHashesBySchemaBundleHash.get(query.schema_bundle_hash) ??
          [],
      );
      records = records.filter((record) => ids.has(record.compatibility_gate_hash));
    }
    if (query.compatibility_window_ref) {
      const ids = new Set(
        this.compatibilityGateHashesByWindowRef.get(query.compatibility_window_ref) ??
          [],
      );
      records = records.filter((record) => ids.has(record.compatibility_gate_hash));
    }
    if (query.reader_window_state) {
      records = records.filter(
        (record) => record.reader_window_state === query.reader_window_state,
      );
    }
    return records.sort(sortStoredCompatibilityGates).map(cloneStoredCompatibilityGate);
  }

  async listReleaseVerificationManifestAssemblyContracts(
    query: ReleaseVerificationManifestAssemblyContractListQuery = {},
  ) {
    let records = [...this.assemblies.values()];
    if (query.candidate_identity_hash) {
      const ids = new Set(
        this.assemblyHashesByCandidateHash.get(query.candidate_identity_hash) ?? [],
      );
      records = records.filter((record) => ids.has(record.assembly_contract_hash));
    }
    if (query.compatibility_gate_hash) {
      const ids = new Set(
        this.assemblyHashesByCompatibilityGateHash.get(
          query.compatibility_gate_hash,
        ) ?? [],
      );
      records = records.filter((record) => ids.has(record.assembly_contract_hash));
    }
    if (query.decision_state) {
      const ids = new Set(
        this.assemblyHashesByDecisionState.get(query.decision_state) ?? [],
      );
      records = records.filter((record) => ids.has(record.assembly_contract_hash));
    }
    if (query.migration_mode) {
      records = records.filter(
        (record) => record.migration_mode === query.migration_mode,
      );
    }
    return records.sort(sortStoredAssemblies).map(cloneStoredAssembly);
  }
}
