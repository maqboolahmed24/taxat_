import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  assertClientCompatibilityMatrixRecord,
  cloneClientCompatibilityMatrixRecord,
  type ClientCompatibilityMatrixRecord,
} from "../models/client_compatibility_matrix.ts";
import type { ClientMatrixState } from "../services/derive_client_matrix_state.ts";

export type ClientCompatibilityMatrixContractSchemaKind =
  "client_compatibility_matrix";

export type ClientCompatibilityMatrixContractSchemaValidator = (
  kind: ClientCompatibilityMatrixContractSchemaKind,
  payload: unknown,
) => Promise<void> | void;

export type ClientCompatibilityMatrixRepositoryInput = {
  validate_contract_schema: ClientCompatibilityMatrixContractSchemaValidator;
};

export type StoredClientCompatibilityMatrixRecord = {
  compatibility_matrix_id: string;
  candidate_identity_hash: string;
  candidate_environment_ref: string;
  build_artifact_ref: string;
  supported_client_window_ref: string;
  compatibility_gate_hash: string;
  native_client_window_state: "NOT_APPLICABLE" | "VERIFIED_COMPATIBLE" | "BLOCKED";
  matrix_state: ClientMatrixState;
  evaluated_at: string;
  client_compatibility_matrix_row_version: number;
  persisted_at: string;
  client_compatibility_matrix: ClientCompatibilityMatrixRecord;
};

export type ClientCompatibilityMatrixListQuery = {
  candidate_identity_hash?: string;
  candidate_environment_ref?: string;
  build_artifact_ref?: string;
  supported_client_window_ref?: string;
  matrix_state?: ClientMatrixState;
};

export type ClientCompatibilityMatrixRepositoryErrorCode =
  | "CLIENT_COMPATIBILITY_MATRIX_DUPLICATE"
  | "CLIENT_COMPATIBILITY_MATRIX_NOT_FOUND";

export class ClientCompatibilityMatrixRepositoryError extends Error {
  readonly code: ClientCompatibilityMatrixRepositoryErrorCode;

  constructor(
    code: ClientCompatibilityMatrixRepositoryErrorCode,
    detail: string,
  ) {
    super(`${code}: ${detail}`);
    this.name = "ClientCompatibilityMatrixRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredClientCompatibilityMatrixRecord) {
  return structuredClone(record);
}

function pushIndex<K extends string>(index: Map<K, string[]>, key: K, id: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(id)) {
    current.push(id);
    index.set(key, current);
  }
}

function sortStoredClientCompatibilityMatrices(
  left: StoredClientCompatibilityMatrixRecord,
  right: StoredClientCompatibilityMatrixRecord,
) {
  return (
    left.candidate_identity_hash.localeCompare(right.candidate_identity_hash) ||
    left.supported_client_window_ref.localeCompare(
      right.supported_client_window_ref,
    ) ||
    left.evaluated_at.localeCompare(right.evaluated_at) ||
    left.compatibility_matrix_id.localeCompare(right.compatibility_matrix_id)
  );
}

export class ClientCompatibilityMatrixRepository {
  private readonly validateContractSchema: ClientCompatibilityMatrixContractSchemaValidator;
  private readonly matrices = new Map<
    string,
    StoredClientCompatibilityMatrixRecord
  >();
  private readonly matrixIdsByCandidateHash = new Map<string, string[]>();
  private readonly matrixIdsByCandidateEnvironmentRef = new Map<string, string[]>();
  private readonly matrixIdsByBuildArtifactRef = new Map<string, string[]>();
  private readonly matrixIdsBySupportedClientWindowRef = new Map<string, string[]>();
  private readonly matrixIdsByState = new Map<ClientMatrixState, string[]>();

  constructor(input: ClientCompatibilityMatrixRepositoryInput) {
    this.validateContractSchema = input.validate_contract_schema;
  }

  private async validateClientCompatibilityMatrix(
    record: ClientCompatibilityMatrixRecord,
  ) {
    const normalized = assertClientCompatibilityMatrixRecord(record);
    await this.validateContractSchema("client_compatibility_matrix", normalized);
    return normalized;
  }

  private stored(input: {
    client_compatibility_matrix: ClientCompatibilityMatrixRecord;
    persisted_at: string;
  }): StoredClientCompatibilityMatrixRecord {
    const matrix = assertClientCompatibilityMatrixRecord(
      input.client_compatibility_matrix,
    );
    return {
      compatibility_matrix_id: matrix.compatibility_matrix_id,
      candidate_identity_hash: matrix.candidate_identity_hash,
      candidate_environment_ref: matrix.candidate_environment_ref,
      build_artifact_ref: matrix.build_artifact_ref,
      supported_client_window_ref: matrix.supported_client_window_ref,
      compatibility_gate_hash:
        matrix.schema_bundle_compatibility_gate_contract.compatibility_gate_hash,
      native_client_window_state:
        matrix.schema_bundle_compatibility_gate_contract
          .native_client_window_state,
      matrix_state: matrix.matrix_state,
      evaluated_at: matrix.evaluated_at,
      client_compatibility_matrix_row_version: 1,
      persisted_at: normalizeUtcInstantString(input.persisted_at),
      client_compatibility_matrix: cloneClientCompatibilityMatrixRecord(matrix),
    };
  }

  private rebuildIndexes() {
    this.matrixIdsByCandidateHash.clear();
    this.matrixIdsByCandidateEnvironmentRef.clear();
    this.matrixIdsByBuildArtifactRef.clear();
    this.matrixIdsBySupportedClientWindowRef.clear();
    this.matrixIdsByState.clear();
    for (const stored of this.matrices.values()) {
      pushIndex(
        this.matrixIdsByCandidateHash,
        stored.candidate_identity_hash,
        stored.compatibility_matrix_id,
      );
      pushIndex(
        this.matrixIdsByCandidateEnvironmentRef,
        stored.candidate_environment_ref,
        stored.compatibility_matrix_id,
      );
      pushIndex(
        this.matrixIdsByBuildArtifactRef,
        stored.build_artifact_ref,
        stored.compatibility_matrix_id,
      );
      pushIndex(
        this.matrixIdsBySupportedClientWindowRef,
        stored.supported_client_window_ref,
        stored.compatibility_matrix_id,
      );
      pushIndex(
        this.matrixIdsByState,
        stored.matrix_state,
        stored.compatibility_matrix_id,
      );
    }
  }

  async persistClientCompatibilityMatrix(input: {
    client_compatibility_matrix: ClientCompatibilityMatrixRecord;
    persisted_at: string;
  }) {
    const normalized = await this.validateClientCompatibilityMatrix(
      input.client_compatibility_matrix,
    );
    const stored = this.stored({
      persisted_at: input.persisted_at,
      client_compatibility_matrix: normalized,
    });
    const existing = this.matrices.get(stored.compatibility_matrix_id);
    if (existing) {
      if (
        stableJsonHash(existing.client_compatibility_matrix) !==
        stableJsonHash(stored.client_compatibility_matrix)
      ) {
        throw new ClientCompatibilityMatrixRepositoryError(
          "CLIENT_COMPATIBILITY_MATRIX_DUPLICATE",
          `client compatibility matrix ${stored.compatibility_matrix_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }
    this.matrices.set(stored.compatibility_matrix_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getClientCompatibilityMatrixById(compatibilityMatrixId: string) {
    const stored = this.matrices.get(compatibilityMatrixId);
    if (!stored) {
      throw new ClientCompatibilityMatrixRepositoryError(
        "CLIENT_COMPATIBILITY_MATRIX_NOT_FOUND",
        `client compatibility matrix ${compatibilityMatrixId} does not exist`,
      );
    }
    return cloneStored(stored);
  }

  async listClientCompatibilityMatrices(
    query: ClientCompatibilityMatrixListQuery = {},
  ) {
    let records = [...this.matrices.values()];
    if (query.candidate_identity_hash) {
      const ids = new Set(
        this.matrixIdsByCandidateHash.get(query.candidate_identity_hash) ?? [],
      );
      records = records.filter((record) =>
        ids.has(record.compatibility_matrix_id),
      );
    }
    if (query.candidate_environment_ref) {
      const ids = new Set(
        this.matrixIdsByCandidateEnvironmentRef.get(
          query.candidate_environment_ref,
        ) ?? [],
      );
      records = records.filter((record) =>
        ids.has(record.compatibility_matrix_id),
      );
    }
    if (query.build_artifact_ref) {
      const ids = new Set(
        this.matrixIdsByBuildArtifactRef.get(query.build_artifact_ref) ?? [],
      );
      records = records.filter((record) =>
        ids.has(record.compatibility_matrix_id),
      );
    }
    if (query.supported_client_window_ref) {
      const ids = new Set(
        this.matrixIdsBySupportedClientWindowRef.get(
          query.supported_client_window_ref,
        ) ?? [],
      );
      records = records.filter((record) =>
        ids.has(record.compatibility_matrix_id),
      );
    }
    if (query.matrix_state) {
      const ids = new Set(this.matrixIdsByState.get(query.matrix_state) ?? []);
      records = records.filter((record) =>
        ids.has(record.compatibility_matrix_id),
      );
    }
    return records.sort(sortStoredClientCompatibilityMatrices).map(cloneStored);
  }
}
