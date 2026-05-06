import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import {
  assertCanaryHealthSummaryRecord,
  cloneCanaryHealthSummaryRecord,
  type CanaryHealthSummaryRecord,
} from "../models/canary_health_summary.ts";
import {
  assertDeploymentReleaseRecord,
  cloneDeploymentReleaseRecord,
  deploymentReleaseRef,
  type DeploymentReleaseRecord,
  type DeploymentReleaseTransitionEventCode,
} from "../models/deployment_release.ts";
import {
  advanceDeploymentReleaseState as advanceDeploymentReleaseStateRecord,
  type AdvanceDeploymentReleaseStateInput,
} from "../services/advance_deployment_release_state.ts";

export type DeploymentReleaseContractSchemaKind =
  | "canary_health_summary"
  | "deployment_release"
  | "state_transition_contract";

export type DeploymentReleaseContractSchemaValidator = (
  kind: DeploymentReleaseContractSchemaKind,
  payload: unknown,
) => Promise<void> | void;

export type DeploymentReleaseRepositoryInput = {
  validate_contract_schema: DeploymentReleaseContractSchemaValidator;
};

export type StoredCanaryHealthSummaryRecord = {
  canary_summary_id: string;
  canary_summary_ref: string;
  candidate_identity_hash: string;
  candidate_environment_ref: string;
  build_artifact_ref: string;
  health_gate_state: CanaryHealthSummaryRecord["health_gate_state"];
  abort_recommended: boolean;
  canary_fraction: number;
  canary_health_summary_row_version: number;
  persisted_at: string;
  canary_health_summary: CanaryHealthSummaryRecord;
};

export type StoredDeploymentReleaseRecord = {
  release_id: string;
  deployment_release_ref: string;
  candidate_identity_hash: string;
  environment_ref: string;
  build_id: string;
  rollout_strategy: DeploymentReleaseRecord["rollout_strategy"];
  rollout_state: DeploymentReleaseRecord["rollout_state"];
  rollback_boundary_state: DeploymentReleaseRecord["rollback_boundary_state"];
  health_gate_state: DeploymentReleaseRecord["health_gate_state"];
  deployment_release_row_version: number;
  persisted_at: string;
  last_transition_audit_ref: string;
  deployment_release: DeploymentReleaseRecord;
};

export type CanaryHealthSummaryListQuery = {
  candidate_identity_hash?: string;
  candidate_environment_ref?: string;
  build_artifact_ref?: string;
  health_gate_state?: CanaryHealthSummaryRecord["health_gate_state"];
};

export type DeploymentReleaseListQuery = {
  candidate_identity_hash?: string;
  environment_ref?: string;
  build_id?: string;
  rollout_state?: DeploymentReleaseRecord["rollout_state"];
  rollback_boundary_state?: DeploymentReleaseRecord["rollback_boundary_state"];
};

export type AdvancePersistedDeploymentReleaseStateInput = Omit<
  AdvanceDeploymentReleaseStateInput,
  "release"
> & {
  release_id: string;
  expected_row_version: number;
};

export type DeploymentReleaseRepositoryErrorCode =
  | "CANARY_HEALTH_SUMMARY_DUPLICATE"
  | "CANARY_HEALTH_SUMMARY_NOT_FOUND"
  | "DEPLOYMENT_RELEASE_DUPLICATE"
  | "DEPLOYMENT_RELEASE_NOT_FOUND"
  | "DEPLOYMENT_RELEASE_ROW_VERSION_MISMATCH";

export class DeploymentReleaseRepositoryError extends Error {
  readonly code: DeploymentReleaseRepositoryErrorCode;

  constructor(code: DeploymentReleaseRepositoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "DeploymentReleaseRepositoryError";
    this.code = code;
  }
}

function canarySummaryRef(record: Pick<CanaryHealthSummaryRecord, "canary_summary_id">) {
  return record.canary_summary_id;
}

function cloneStoredCanary(record: StoredCanaryHealthSummaryRecord) {
  return structuredClone(record);
}

function cloneStoredRelease(record: StoredDeploymentReleaseRecord) {
  return structuredClone(record);
}

function sortStoredCanary(
  left: StoredCanaryHealthSummaryRecord,
  right: StoredCanaryHealthSummaryRecord,
) {
  return (
    left.candidate_environment_ref.localeCompare(right.candidate_environment_ref) ||
    left.build_artifact_ref.localeCompare(right.build_artifact_ref) ||
    left.persisted_at.localeCompare(right.persisted_at) ||
    left.canary_summary_id.localeCompare(right.canary_summary_id)
  );
}

function sortStoredRelease(
  left: StoredDeploymentReleaseRecord,
  right: StoredDeploymentReleaseRecord,
) {
  return (
    left.environment_ref.localeCompare(right.environment_ref) ||
    left.persisted_at.localeCompare(right.persisted_at) ||
    left.release_id.localeCompare(right.release_id)
  );
}

function pushIndex(index: Map<string, string[]>, key: string, id: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(id)) {
    current.push(id);
    index.set(key, current);
  }
}

export class DeploymentReleaseRepository {
  private readonly validateContractSchema: DeploymentReleaseContractSchemaValidator;
  private readonly canaryIdsByBuildArtifactRef = new Map<string, string[]>();
  private readonly canaryIdsByCandidateEnvironmentRef = new Map<string, string[]>();
  private readonly canaryIdsByCandidateHash = new Map<string, string[]>();
  private readonly canarySummaries = new Map<string, StoredCanaryHealthSummaryRecord>();
  private readonly releaseIdsByBuildId = new Map<string, string[]>();
  private readonly releaseIdsByCandidateHash = new Map<string, string[]>();
  private readonly releaseIdsByEnvironmentRef = new Map<string, string[]>();
  private readonly deploymentReleases = new Map<string, StoredDeploymentReleaseRecord>();

  constructor(input: DeploymentReleaseRepositoryInput) {
    this.validateContractSchema = input.validate_contract_schema;
  }

  private async validateCanaryHealthSummary(record: CanaryHealthSummaryRecord) {
    const normalized = assertCanaryHealthSummaryRecord(record);
    await this.validateContractSchema("canary_health_summary", normalized);
    return normalized;
  }

  private async validateDeploymentRelease(record: DeploymentReleaseRecord) {
    const normalized = assertDeploymentReleaseRecord(record);
    await this.validateContractSchema(
      "state_transition_contract",
      normalized.state_transition_contract,
    );
    await this.validateContractSchema("deployment_release", normalized);
    return normalized;
  }

  private rebuildCanaryIndexes() {
    this.canaryIdsByBuildArtifactRef.clear();
    this.canaryIdsByCandidateEnvironmentRef.clear();
    this.canaryIdsByCandidateHash.clear();
    for (const stored of this.canarySummaries.values()) {
      pushIndex(
        this.canaryIdsByBuildArtifactRef,
        stored.build_artifact_ref,
        stored.canary_summary_id,
      );
      pushIndex(
        this.canaryIdsByCandidateEnvironmentRef,
        stored.candidate_environment_ref,
        stored.canary_summary_id,
      );
      pushIndex(
        this.canaryIdsByCandidateHash,
        stored.candidate_identity_hash,
        stored.canary_summary_id,
      );
    }
  }

  private rebuildReleaseIndexes() {
    this.releaseIdsByBuildId.clear();
    this.releaseIdsByCandidateHash.clear();
    this.releaseIdsByEnvironmentRef.clear();
    for (const stored of this.deploymentReleases.values()) {
      pushIndex(this.releaseIdsByBuildId, stored.build_id, stored.release_id);
      pushIndex(
        this.releaseIdsByCandidateHash,
        stored.candidate_identity_hash,
        stored.release_id,
      );
      pushIndex(
        this.releaseIdsByEnvironmentRef,
        stored.environment_ref,
        stored.release_id,
      );
    }
  }

  private storedCanary(input: {
    canary_health_summary: CanaryHealthSummaryRecord;
    persisted_at: string;
  }): StoredCanaryHealthSummaryRecord {
    const canary = assertCanaryHealthSummaryRecord(input.canary_health_summary);
    return {
      canary_summary_id: canary.canary_summary_id,
      canary_summary_ref: canarySummaryRef(canary),
      candidate_identity_hash: canary.candidate_identity_hash,
      candidate_environment_ref: canary.candidate_environment_ref,
      build_artifact_ref: canary.build_artifact_ref,
      health_gate_state: canary.health_gate_state,
      abort_recommended: canary.abort_recommended,
      canary_fraction: canary.canary_fraction,
      canary_health_summary_row_version: 1,
      persisted_at: normalizeUtcInstantString(input.persisted_at),
      canary_health_summary: cloneCanaryHealthSummaryRecord(canary),
    };
  }

  private storedRelease(input: {
    deployment_release: DeploymentReleaseRecord;
    persisted_at: string;
    row_version: number;
  }): StoredDeploymentReleaseRecord {
    const release = assertDeploymentReleaseRecord(input.deployment_release);
    return {
      release_id: release.release_id,
      deployment_release_ref: deploymentReleaseRef(release),
      candidate_identity_hash: release.candidate_identity_hash,
      environment_ref: release.environment_ref,
      build_id: release.build_id,
      rollout_strategy: release.rollout_strategy,
      rollout_state: release.rollout_state,
      rollback_boundary_state: release.rollback_boundary_state,
      health_gate_state: release.health_gate_state,
      deployment_release_row_version: input.row_version,
      persisted_at: normalizeUtcInstantString(input.persisted_at),
      last_transition_audit_ref:
        release.state_transition_contract.transition_audit_ref,
      deployment_release: cloneDeploymentReleaseRecord(release),
    };
  }

  private listCanariesByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.canarySummaries.get(id))
      .filter(
        (record): record is StoredCanaryHealthSummaryRecord => record !== undefined,
      )
      .sort(sortStoredCanary)
      .map(cloneStoredCanary);
  }

  private listReleasesByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.deploymentReleases.get(id))
      .filter((record): record is StoredDeploymentReleaseRecord => record !== undefined)
      .sort(sortStoredRelease)
      .map(cloneStoredRelease);
  }

  async persistCanaryHealthSummary(input: {
    canary_health_summary: CanaryHealthSummaryRecord;
    persisted_at: string;
  }) {
    const normalized = await this.validateCanaryHealthSummary(
      input.canary_health_summary,
    );
    const stored = this.storedCanary({
      canary_health_summary: normalized,
      persisted_at: input.persisted_at,
    });
    const existing = this.canarySummaries.get(stored.canary_summary_id);
    if (existing) {
      if (
        stableJsonHash(existing.canary_health_summary) !==
        stableJsonHash(stored.canary_health_summary)
      ) {
        throw new DeploymentReleaseRepositoryError(
          "CANARY_HEALTH_SUMMARY_DUPLICATE",
          `canary summary ${stored.canary_summary_id} already exists with a different payload`,
        );
      }
      return cloneStoredCanary(existing);
    }
    this.canarySummaries.set(stored.canary_summary_id, cloneStoredCanary(stored));
    this.rebuildCanaryIndexes();
    return cloneStoredCanary(stored);
  }

  async persistDeploymentRelease(input: {
    deployment_release: DeploymentReleaseRecord;
    persisted_at: string;
  }) {
    const normalized = await this.validateDeploymentRelease(input.deployment_release);
    const stored = this.storedRelease({
      deployment_release: normalized,
      persisted_at: input.persisted_at,
      row_version: 1,
    });
    const existing = this.deploymentReleases.get(stored.release_id);
    if (existing) {
      if (
        stableJsonHash(existing.deployment_release) !==
        stableJsonHash(stored.deployment_release)
      ) {
        throw new DeploymentReleaseRepositoryError(
          "DEPLOYMENT_RELEASE_DUPLICATE",
          `deployment release ${stored.release_id} already exists with a different payload`,
        );
      }
      return cloneStoredRelease(existing);
    }
    this.deploymentReleases.set(stored.release_id, cloneStoredRelease(stored));
    this.rebuildReleaseIndexes();
    return cloneStoredRelease(stored);
  }

  async advanceDeploymentReleaseState(input: AdvancePersistedDeploymentReleaseStateInput) {
    const existing = this.deploymentReleases.get(input.release_id);
    if (!existing) {
      throw new DeploymentReleaseRepositoryError(
        "DEPLOYMENT_RELEASE_NOT_FOUND",
        `deployment release ${input.release_id} does not exist`,
      );
    }
    if (
      existing.deployment_release_row_version !== input.expected_row_version &&
      existing.deployment_release.state_transition_contract.transition_event_code ===
        input.transition_event_code &&
      existing.deployment_release.state_transition_contract.transition_audit_ref ===
        input.transition_audit_ref
    ) {
      return cloneStoredRelease(existing);
    }
    if (existing.deployment_release_row_version !== input.expected_row_version) {
      throw new DeploymentReleaseRepositoryError(
        "DEPLOYMENT_RELEASE_ROW_VERSION_MISMATCH",
        `deployment release ${input.release_id} row version is ${existing.deployment_release_row_version}, not ${input.expected_row_version}`,
      );
    }
    const canarySummary = input.canary_health_summary
      ? await this.validateCanaryHealthSummary(input.canary_health_summary)
      : undefined;
    const nextRelease = await this.validateDeploymentRelease(
      advanceDeploymentReleaseStateRecord({
        ...input,
        release: existing.deployment_release,
        canary_health_summary: canarySummary,
      }),
    );
    if (canarySummary) {
      const storedCanary = this.storedCanary({
        canary_health_summary: canarySummary,
        persisted_at: input.transition_applied_at,
      });
      const existingCanary = this.canarySummaries.get(storedCanary.canary_summary_id);
      if (
        existingCanary &&
        stableJsonHash(existingCanary.canary_health_summary) !==
          stableJsonHash(storedCanary.canary_health_summary)
      ) {
        throw new DeploymentReleaseRepositoryError(
          "CANARY_HEALTH_SUMMARY_DUPLICATE",
          `canary summary ${storedCanary.canary_summary_id} already exists with a different payload`,
        );
      }
      if (!existingCanary) {
        this.canarySummaries.set(
          storedCanary.canary_summary_id,
          cloneStoredCanary(storedCanary),
        );
        this.rebuildCanaryIndexes();
      }
    }
    const nextStored = this.storedRelease({
      deployment_release: nextRelease,
      persisted_at: input.transition_applied_at,
      row_version: existing.deployment_release_row_version + 1,
    });
    this.deploymentReleases.set(nextStored.release_id, cloneStoredRelease(nextStored));
    this.rebuildReleaseIndexes();
    return cloneStoredRelease(nextStored);
  }

  async getCanaryHealthSummaryById(canarySummaryId: string) {
    const stored = this.canarySummaries.get(canarySummaryId);
    if (!stored) {
      throw new DeploymentReleaseRepositoryError(
        "CANARY_HEALTH_SUMMARY_NOT_FOUND",
        `canary summary ${canarySummaryId} does not exist`,
      );
    }
    return cloneStoredCanary(stored);
  }

  async getDeploymentReleaseById(releaseId: string) {
    const stored = this.deploymentReleases.get(releaseId);
    if (!stored) {
      throw new DeploymentReleaseRepositoryError(
        "DEPLOYMENT_RELEASE_NOT_FOUND",
        `deployment release ${releaseId} does not exist`,
      );
    }
    return cloneStoredRelease(stored);
  }

  async listCanaryHealthSummaries(query: CanaryHealthSummaryListQuery = {}) {
    let records = [...this.canarySummaries.values()];
    if (query.candidate_identity_hash) {
      records = this.listCanariesByIds(
        this.canaryIdsByCandidateHash.get(query.candidate_identity_hash) ?? [],
      );
    }
    if (query.candidate_environment_ref) {
      const ids = new Set(
        this.canaryIdsByCandidateEnvironmentRef.get(query.candidate_environment_ref) ??
          [],
      );
      records = records.filter((record) => ids.has(record.canary_summary_id));
    }
    if (query.build_artifact_ref) {
      const ids = new Set(
        this.canaryIdsByBuildArtifactRef.get(query.build_artifact_ref) ?? [],
      );
      records = records.filter((record) => ids.has(record.canary_summary_id));
    }
    if (query.health_gate_state) {
      records = records.filter(
        (record) => record.health_gate_state === query.health_gate_state,
      );
    }
    return records.sort(sortStoredCanary).map(cloneStoredCanary);
  }

  async listDeploymentReleases(query: DeploymentReleaseListQuery = {}) {
    let records = [...this.deploymentReleases.values()];
    if (query.candidate_identity_hash) {
      records = this.listReleasesByIds(
        this.releaseIdsByCandidateHash.get(query.candidate_identity_hash) ?? [],
      );
    }
    if (query.environment_ref) {
      const ids = new Set(
        this.releaseIdsByEnvironmentRef.get(query.environment_ref) ?? [],
      );
      records = records.filter((record) => ids.has(record.release_id));
    }
    if (query.build_id) {
      const ids = new Set(this.releaseIdsByBuildId.get(query.build_id) ?? []);
      records = records.filter((record) => ids.has(record.release_id));
    }
    if (query.rollout_state) {
      records = records.filter((record) => record.rollout_state === query.rollout_state);
    }
    if (query.rollback_boundary_state) {
      records = records.filter(
        (record) => record.rollback_boundary_state === query.rollback_boundary_state,
      );
    }
    return records.sort(sortStoredRelease).map(cloneStoredRelease);
  }
}
