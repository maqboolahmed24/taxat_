import { AuthorityModelError, cloneRecord, stableEqual } from "../models/authority_common.ts";
import {
  authorityCalculationReadinessContextContentFingerprint,
  authorityCalculationReadinessContextRef,
  cloneAuthorityCalculationReadinessContext,
  normalizeAuthorityCalculationReadinessContext,
  type AuthorityCalculationReadinessContextRecord,
} from "../models/authority_calculation_readiness_context.ts";

export type StoredAuthorityCalculationReadinessContext = {
  calculation_readiness_context_id: string;
  calculation_readiness_context_ref: string;
  content_fingerprint: string;
  manifest_id: string;
  owner_artifact_ref: string;
  record: AuthorityCalculationReadinessContextRecord;
  row_version: number;
  validation_outcome: AuthorityCalculationReadinessContextRecord["validation_outcome"];
};

function cloneStored(record: StoredAuthorityCalculationReadinessContext) {
  return cloneRecord(record);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    current.sort();
    index.set(key, current);
  }
}

function sortStored(
  left: StoredAuthorityCalculationReadinessContext,
  right: StoredAuthorityCalculationReadinessContext,
) {
  return (
    left.manifest_id.localeCompare(right.manifest_id) ||
    left.record.persisted_at.localeCompare(right.record.persisted_at) ||
    left.calculation_readiness_context_id.localeCompare(right.calculation_readiness_context_id)
  );
}

export class AuthorityCalculationReadinessContextRepository {
  private readonly idByRef = new Map<string, string>();
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly idsByOwner = new Map<string, string[]>();
  private readonly idsByValidationOutcome = new Map<string, string[]>();
  private readonly records = new Map<string, StoredAuthorityCalculationReadinessContext>();

  private rebuildIndexes() {
    this.idByRef.clear();
    this.idsByManifest.clear();
    this.idsByOwner.clear();
    this.idsByValidationOutcome.clear();
    for (const stored of this.records.values()) {
      this.idByRef.set(
        stored.calculation_readiness_context_ref,
        stored.calculation_readiness_context_id,
      );
      pushIndex(this.idsByManifest, stored.manifest_id, stored.calculation_readiness_context_id);
      pushIndex(this.idsByOwner, stored.owner_artifact_ref, stored.calculation_readiness_context_id);
      pushIndex(
        this.idsByValidationOutcome,
        stored.validation_outcome,
        stored.calculation_readiness_context_id,
      );
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter(
        (record): record is StoredAuthorityCalculationReadinessContext => record !== undefined,
      )
      .sort(sortStored)
      .map(cloneStored);
  }

  async persistAuthorityCalculationReadinessContext(input: {
    context: AuthorityCalculationReadinessContextRecord;
  }) {
    const context = normalizeAuthorityCalculationReadinessContext(input.context);
    const existing = this.records.get(context.calculation_readiness_context_id);
    const contextRef = authorityCalculationReadinessContextRef(context);
    const refOwner = this.idByRef.get(contextRef);
    if (refOwner !== undefined && refOwner !== context.calculation_readiness_context_id) {
      throw new AuthorityModelError(
        "AUTHORITY_REPOSITORY_INVALID",
        `authority calculation readiness context ref ${contextRef} already belongs to ${refOwner}`,
      );
    }
    if (existing && stableEqual(existing.record, context)) {
      return cloneStored(existing);
    }
    const stored: StoredAuthorityCalculationReadinessContext = {
      calculation_readiness_context_id: context.calculation_readiness_context_id,
      calculation_readiness_context_ref: contextRef,
      content_fingerprint: authorityCalculationReadinessContextContentFingerprint(context),
      manifest_id: context.manifest_id,
      owner_artifact_ref: context.owner_artifact_ref,
      record: cloneAuthorityCalculationReadinessContext(context),
      row_version: (existing?.row_version ?? 0) + 1,
      validation_outcome: context.validation_outcome,
    };
    this.records.set(stored.calculation_readiness_context_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getAuthorityCalculationReadinessContextById(contextId: string) {
    const stored = this.records.get(contextId);
    return stored ? cloneStored(stored) : null;
  }

  async getAuthorityCalculationReadinessContextByRef(ref: string) {
    const id = this.idByRef.get(ref);
    const stored = id === undefined ? undefined : this.records.get(id);
    return stored ? cloneStored(stored) : null;
  }

  async listAuthorityCalculationReadinessContextsByOwner(ownerArtifactRef: string) {
    return this.listByIds(this.idsByOwner.get(ownerArtifactRef) ?? []);
  }

  async listAuthorityCalculationReadinessContextsByManifest(manifestId: string) {
    return this.listByIds(this.idsByManifest.get(manifestId) ?? []);
  }

  async listAuthorityCalculationReadinessContextsByValidationOutcome(
    validationOutcome: AuthorityCalculationReadinessContextRecord["validation_outcome"],
  ) {
    return this.listByIds(this.idsByValidationOutcome.get(validationOutcome) ?? []);
  }
}
