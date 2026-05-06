import {
  assertOperatorMorningDigest,
  type OperatorMorningDigestRecord,
} from "../../../backend-recovery/src/index.ts";

export type StoredOperatorMorningDigestRecord = {
  coverage_date: string;
  digest: OperatorMorningDigestRecord;
  digest_id: string;
  operator_morning_digest_ref: string;
  persisted_at: string;
  tenant_id: string;
};

export type OperatorMorningDigestRepositoryQuery = {
  coverage_date?: string | undefined;
  digest_id?: string | undefined;
  include_superseded?: boolean | undefined;
  tenant_id?: string | undefined;
};

export class OperatorMorningDigestRepositoryError extends Error {
  readonly code:
    | "OPERATOR_MORNING_DIGEST_DUPLICATE"
    | "OPERATOR_MORNING_DIGEST_NOT_FOUND";

  constructor(code: OperatorMorningDigestRepositoryError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "OperatorMorningDigestRepositoryError";
    this.code = code;
  }
}

export function operatorMorningDigestRef(digest: Pick<OperatorMorningDigestRecord, "digest_id">) {
  return `operator-morning-digest://${digest.digest_id}`;
}

function cloneDigest(digest: OperatorMorningDigestRecord) {
  return structuredClone(assertOperatorMorningDigest(digest));
}

function cloneStored(stored: StoredOperatorMorningDigestRecord) {
  return {
    ...stored,
    digest: cloneDigest(stored.digest),
  } satisfies StoredOperatorMorningDigestRecord;
}

function tenantCoverageKey(input: { coverage_date: string; tenant_id: string }) {
  return `${input.tenant_id}|${input.coverage_date}`;
}

function sortStored(
  left: StoredOperatorMorningDigestRecord,
  right: StoredOperatorMorningDigestRecord,
) {
  return (
    left.tenant_id.localeCompare(right.tenant_id) ||
    left.coverage_date.localeCompare(right.coverage_date) ||
    left.digest.published_at.localeCompare(right.digest.published_at) ||
    left.digest_id.localeCompare(right.digest_id)
  );
}

export class OperatorMorningDigestRepository {
  private readonly digestIdsByTenantCoverage = new Map<string, string[]>();
  private readonly digestIdsSupersededByDigestId = new Map<string, string>();
  private readonly records = new Map<string, StoredOperatorMorningDigestRecord>();

  private rebuildIndexes() {
    this.digestIdsByTenantCoverage.clear();
    this.digestIdsSupersededByDigestId.clear();
    for (const stored of this.records.values()) {
      const key = tenantCoverageKey(stored);
      const current = this.digestIdsByTenantCoverage.get(key) ?? [];
      if (!current.includes(stored.digest_id)) {
        current.push(stored.digest_id);
      }
      this.digestIdsByTenantCoverage.set(key, current);
      if (stored.digest.supersedes_digest_id !== null) {
        this.digestIdsSupersededByDigestId.set(
          stored.digest.supersedes_digest_id,
          stored.digest_id,
        );
      }
    }
  }

  async persistOperatorMorningDigest(input: {
    digest: OperatorMorningDigestRecord;
    persisted_at?: string | undefined;
  }) {
    const digest = cloneDigest(input.digest);
    const existing = this.records.get(digest.digest_id);
    if (existing !== undefined) {
      if (JSON.stringify(existing.digest) !== JSON.stringify(digest)) {
        throw new OperatorMorningDigestRepositoryError(
          "OPERATOR_MORNING_DIGEST_DUPLICATE",
          `operator morning digest ${digest.digest_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }
    const stored: StoredOperatorMorningDigestRecord = {
      coverage_date: digest.coverage_date,
      digest,
      digest_id: digest.digest_id,
      operator_morning_digest_ref: operatorMorningDigestRef(digest),
      persisted_at: input.persisted_at ?? digest.published_at,
      tenant_id: digest.tenant_id,
    };
    this.records.set(stored.digest_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getOperatorMorningDigestById(digestId: string) {
    const stored = this.records.get(digestId);
    return stored === undefined ? null : cloneStored(stored);
  }

  async listOperatorMorningDigests(query: OperatorMorningDigestRepositoryQuery = {}) {
    const includeSuperseded = query.include_superseded ?? true;
    return [...this.records.values()]
      .filter((stored) => query.digest_id === undefined || stored.digest_id === query.digest_id)
      .filter((stored) => query.tenant_id === undefined || stored.tenant_id === query.tenant_id)
      .filter(
        (stored) =>
          query.coverage_date === undefined || stored.coverage_date === query.coverage_date,
      )
      .filter(
        (stored) =>
          includeSuperseded || !this.digestIdsSupersededByDigestId.has(stored.digest_id),
      )
      .sort(sortStored)
      .map(cloneStored);
  }

  async getCurrentOperatorMorningDigest(input: {
    coverage_date: string;
    tenant_id: string;
  }) {
    const ids =
      this.digestIdsByTenantCoverage.get(
        tenantCoverageKey({
          coverage_date: input.coverage_date,
          tenant_id: input.tenant_id,
        }),
      ) ?? [];
    const current = ids
      .map((id) => this.records.get(id))
      .filter((stored): stored is StoredOperatorMorningDigestRecord => stored !== undefined)
      .filter((stored) => !this.digestIdsSupersededByDigestId.has(stored.digest_id))
      .sort(sortStored)
      .at(-1);
    return current === undefined ? null : cloneStored(current);
  }

  supersededByDigestId(digestId: string) {
    return this.digestIdsSupersededByDigestId.get(digestId) ?? null;
  }
}
