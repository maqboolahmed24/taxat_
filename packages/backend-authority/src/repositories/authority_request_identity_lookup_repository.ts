import {
  AuthorityModelError,
  assertEnum,
  cloneRecord,
  normalizeNullableString,
  normalizeTimestamp,
  requireString,
  stableEqual,
} from "../models/authority_common.ts";
import { authorityRequestEnvelopeRef, type AuthorityRequestEnvelope } from "../models/authority_request_envelope.ts";
import {
  normalizeAuthorityRequestIdentityContract,
  type AuthorityRequestIdentityContract,
} from "../models/submission_record.ts";

export const AUTHORITY_REQUEST_IDENTITY_LOOKUP_SOURCE_TYPES = [
  "AUTHORITY_REQUEST_ENVELOPE",
  "AUTHORITY_INTERACTION_RECORD",
  "SUBMISSION_RECORD",
  "EXTERNAL_STRONGER_TRUTH",
] as const;

export const AUTHORITY_REQUEST_IDENTITY_LOOKUP_POSTURES = [
  "REQUEST_SEALED",
  "INTERACTION_REGISTERED",
  "SUBMISSION_SETTLEMENT",
  "STRONGER_AUTHORITY_TRUTH",
] as const;

export const AUTHORITY_REQUEST_IDENTITY_TRUTH_STATES = [
  "NONE",
  "PENDING_ACK",
  "UNKNOWN",
  "CONFIRMED",
  "REJECTED",
  "OUT_OF_BAND",
] as const;

export type AuthorityRequestIdentityLookupSourceType =
  (typeof AUTHORITY_REQUEST_IDENTITY_LOOKUP_SOURCE_TYPES)[number];
export type AuthorityRequestIdentityLookupPosture =
  (typeof AUTHORITY_REQUEST_IDENTITY_LOOKUP_POSTURES)[number];
export type AuthorityRequestIdentityTruthState =
  (typeof AUTHORITY_REQUEST_IDENTITY_TRUTH_STATES)[number];

export type AuthorityRequestIdentityLookupRecord = {
  access_binding_hash: string;
  acting_party_ref: string;
  attempt_lineage_manifest_id: string;
  authority_binding_ref: string;
  authority_link_ref: string;
  authority_name: string;
  authority_product_profile: string;
  authority_scope: string;
  authority_truth_state: AuthorityRequestIdentityTruthState;
  binding_lineage_ref: string;
  business_partition_refs: string[];
  canonical_path: string;
  canonical_query: string;
  client_id: string;
  duplicate_meaning_key: string;
  idempotency_key: string;
  identity_namespace_hash: string;
  inserted_at: string;
  lookup_id: string;
  lookup_posture: AuthorityRequestIdentityLookupPosture;
  operation_family: string;
  operation_profile: string;
  policy_snapshot_hash: string;
  provider_api_version: string;
  provider_environment: string;
  request_body_hash: string;
  request_hash: string;
  request_id: string;
  request_identity_contract: AuthorityRequestIdentityContract;
  source_record_ref: string;
  source_record_type: AuthorityRequestIdentityLookupSourceType;
  stronger_truth_ref: string | null;
  subject_ref: string;
  tenant_id: string;
  token_binding_ref: string;
};

export type AuthorityRequestIdentityLookupRecordInput = Partial<
  Omit<
    AuthorityRequestIdentityLookupRecord,
    | "authority_truth_state"
    | "business_partition_refs"
    | "inserted_at"
    | "lookup_id"
    | "lookup_posture"
    | "request_identity_contract"
    | "source_record_type"
    | "stronger_truth_ref"
  >
> & {
  authority_truth_state?: AuthorityRequestIdentityTruthState;
  inserted_at?: string;
  lookup_id?: string;
  lookup_posture?: AuthorityRequestIdentityLookupPosture;
  request_identity_contract: AuthorityRequestIdentityContract;
  source_record_ref: string;
  source_record_type: AuthorityRequestIdentityLookupSourceType;
  stronger_truth_ref?: string | null;
};

function defaultLookupPosture(sourceType: AuthorityRequestIdentityLookupSourceType): AuthorityRequestIdentityLookupPosture {
  return (
    {
      AUTHORITY_INTERACTION_RECORD: "INTERACTION_REGISTERED",
      AUTHORITY_REQUEST_ENVELOPE: "REQUEST_SEALED",
      EXTERNAL_STRONGER_TRUTH: "STRONGER_AUTHORITY_TRUTH",
      SUBMISSION_RECORD: "SUBMISSION_SETTLEMENT",
    } as const
  )[sourceType];
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    current.sort();
    index.set(key, current);
  }
}

function sortLookupRecords(
  left: AuthorityRequestIdentityLookupRecord,
  right: AuthorityRequestIdentityLookupRecord,
) {
  return (
    left.tenant_id.localeCompare(right.tenant_id) ||
    left.client_id.localeCompare(right.client_id) ||
    left.attempt_lineage_manifest_id.localeCompare(right.attempt_lineage_manifest_id) ||
    left.source_record_ref.localeCompare(right.source_record_ref) ||
    left.lookup_id.localeCompare(right.lookup_id)
  );
}

export function normalizeAuthorityRequestIdentityLookupRecord(
  input: AuthorityRequestIdentityLookupRecordInput,
): AuthorityRequestIdentityLookupRecord {
  const sourceType = assertEnum(
    "source_record_type",
    input.source_record_type,
    AUTHORITY_REQUEST_IDENTITY_LOOKUP_SOURCE_TYPES,
  );
  const contract = normalizeAuthorityRequestIdentityContract(
    input.request_identity_contract,
    input.request_identity_contract.binding_scope_class,
  );
  const sourceRecordRef = requireString("source_record_ref", input.source_record_ref);
  const lookupPosture = assertEnum(
    "lookup_posture",
    input.lookup_posture ?? defaultLookupPosture(sourceType),
    AUTHORITY_REQUEST_IDENTITY_LOOKUP_POSTURES,
  );
  const truthState = assertEnum(
    "authority_truth_state",
    input.authority_truth_state ?? "NONE",
    AUTHORITY_REQUEST_IDENTITY_TRUTH_STATES,
  );
  const strongerTruthRef = normalizeNullableString("stronger_truth_ref", input.stronger_truth_ref ?? null);
  if (lookupPosture === "STRONGER_AUTHORITY_TRUTH" && strongerTruthRef === null) {
    throw new AuthorityModelError(
      "AUTHORITY_FIELD_REQUIRED",
      "STRONGER_AUTHORITY_TRUTH lookup records require stronger_truth_ref",
    );
  }
  if (["CONFIRMED", "REJECTED", "OUT_OF_BAND"].includes(truthState) && strongerTruthRef === null) {
    throw new AuthorityModelError(
      "AUTHORITY_FIELD_REQUIRED",
      "authority-grounded stronger truth lookup records require stronger_truth_ref",
    );
  }

  return {
    access_binding_hash: requireString("access_binding_hash", input.access_binding_hash ?? contract.access_binding_hash),
    acting_party_ref: requireString("acting_party_ref", input.acting_party_ref ?? contract.acting_party_ref),
    attempt_lineage_manifest_id: requireString(
      "attempt_lineage_manifest_id",
      input.attempt_lineage_manifest_id ?? contract.attempt_lineage_manifest_id,
    ),
    authority_binding_ref: requireString(
      "authority_binding_ref",
      input.authority_binding_ref ?? contract.authority_binding_ref,
    ),
    authority_link_ref: requireString("authority_link_ref", input.authority_link_ref ?? contract.authority_link_ref),
    authority_name: requireString("authority_name", input.authority_name ?? contract.authority_name),
    authority_product_profile: requireString(
      "authority_product_profile",
      input.authority_product_profile ?? contract.authority_product_profile,
    ),
    authority_scope: requireString("authority_scope", input.authority_scope ?? contract.authority_scope),
    authority_truth_state: truthState,
    binding_lineage_ref: requireString("binding_lineage_ref", input.binding_lineage_ref ?? contract.binding_lineage_ref),
    business_partition_refs: [...contract.business_partition_refs],
    canonical_path: requireString("canonical_path", input.canonical_path ?? contract.canonical_path),
    canonical_query: typeof (input.canonical_query ?? contract.canonical_query) === "string"
      ? (input.canonical_query ?? contract.canonical_query)
      : requireString("canonical_query", input.canonical_query ?? contract.canonical_query),
    client_id: requireString("client_id", input.client_id ?? contract.client_id),
    duplicate_meaning_key: requireString(
      "duplicate_meaning_key",
      input.duplicate_meaning_key ?? contract.duplicate_meaning_key,
    ),
    idempotency_key: requireString("idempotency_key", input.idempotency_key ?? contract.idempotency_key),
    identity_namespace_hash: requireString(
      "identity_namespace_hash",
      input.identity_namespace_hash ?? contract.identity_namespace_hash,
    ),
    inserted_at: normalizeTimestamp("inserted_at", input.inserted_at ?? "2026-04-29T00:00:00Z"),
    lookup_id: requireString("lookup_id", input.lookup_id ?? `${sourceType}:${sourceRecordRef}`),
    lookup_posture: lookupPosture,
    operation_family: requireString("operation_family", input.operation_family ?? contract.operation_family),
    operation_profile: requireString("operation_profile", input.operation_profile ?? contract.operation_profile),
    policy_snapshot_hash: requireString(
      "policy_snapshot_hash",
      input.policy_snapshot_hash ?? contract.policy_snapshot_hash,
    ),
    provider_api_version: requireString(
      "provider_api_version",
      input.provider_api_version ?? contract.provider_api_version,
    ),
    provider_environment: requireString(
      "provider_environment",
      input.provider_environment ?? contract.provider_environment,
    ),
    request_body_hash: requireString("request_body_hash", input.request_body_hash ?? contract.request_body_hash),
    request_hash: requireString("request_hash", input.request_hash ?? contract.request_hash),
    request_id: requireString("request_id", input.request_id ?? contract.request_id),
    request_identity_contract: contract,
    source_record_ref: sourceRecordRef,
    source_record_type: sourceType,
    stronger_truth_ref: strongerTruthRef,
    subject_ref: requireString("subject_ref", input.subject_ref ?? contract.subject_ref),
    tenant_id: requireString("tenant_id", input.tenant_id ?? contract.tenant_id),
    token_binding_ref: requireString("token_binding_ref", input.token_binding_ref ?? contract.token_binding_ref),
  };
}

export class AuthorityRequestIdentityLookupRepository {
  private readonly idsByDuplicateMeaningKey = new Map<string, string[]>();
  private readonly idsByIdempotencyKey = new Map<string, string[]>();
  private readonly idsByIdentityNamespaceHash = new Map<string, string[]>();
  private readonly idsByRequestHash = new Map<string, string[]>();
  private readonly idsByTenantClient = new Map<string, string[]>();
  private readonly idsByTruthRef = new Map<string, string[]>();
  private readonly records = new Map<string, AuthorityRequestIdentityLookupRecord>();

  private rebuildIndexes() {
    this.idsByDuplicateMeaningKey.clear();
    this.idsByIdempotencyKey.clear();
    this.idsByIdentityNamespaceHash.clear();
    this.idsByRequestHash.clear();
    this.idsByTenantClient.clear();
    this.idsByTruthRef.clear();
    for (const record of this.records.values()) {
      pushIndex(this.idsByDuplicateMeaningKey, record.duplicate_meaning_key, record.lookup_id);
      pushIndex(this.idsByIdempotencyKey, record.idempotency_key, record.lookup_id);
      pushIndex(this.idsByIdentityNamespaceHash, record.identity_namespace_hash, record.lookup_id);
      pushIndex(this.idsByRequestHash, record.request_hash, record.lookup_id);
      pushIndex(this.idsByTenantClient, `${record.tenant_id}:${record.client_id}`, record.lookup_id);
      if (record.stronger_truth_ref !== null) {
        pushIndex(this.idsByTruthRef, record.stronger_truth_ref, record.lookup_id);
      }
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((record): record is AuthorityRequestIdentityLookupRecord => record !== undefined)
      .sort(sortLookupRecords)
      .map((record) => cloneRecord(record));
  }

  async upsertRequestIdentityLookup(input: AuthorityRequestIdentityLookupRecordInput) {
    const record = normalizeAuthorityRequestIdentityLookupRecord(input);
    const existing = this.records.get(record.lookup_id);
    if (existing !== undefined && !stableEqual(existing, record)) {
      throw new AuthorityModelError(
        "AUTHORITY_REPOSITORY_INVALID",
        `authority request identity lookup ${record.lookup_id} is sealed and cannot mutate`,
      );
    }
    if (existing !== undefined) {
      return cloneRecord(existing);
    }
    this.records.set(record.lookup_id, cloneRecord(record));
    this.rebuildIndexes();
    return cloneRecord(record);
  }

  async upsertRequestEnvelopeIdentity(input: {
    envelope: AuthorityRequestEnvelope;
    inserted_at?: string;
    lookup_posture?: AuthorityRequestIdentityLookupPosture;
  }) {
    return this.upsertRequestIdentityLookup({
      inserted_at: input.inserted_at,
      lookup_posture: input.lookup_posture ?? "REQUEST_SEALED",
      request_identity_contract: input.envelope.request_identity_contract,
      source_record_ref: authorityRequestEnvelopeRef(input.envelope),
      source_record_type: "AUTHORITY_REQUEST_ENVELOPE",
    });
  }

  async getRequestIdentityLookupById(lookupId: string) {
    const record = this.records.get(lookupId);
    return record ? cloneRecord(record) : null;
  }

  async listRequestIdentityLookupsByDuplicateMeaningKey(duplicateMeaningKey: string) {
    return this.listByIds(this.idsByDuplicateMeaningKey.get(duplicateMeaningKey) ?? []);
  }

  async listRequestIdentityLookupsByRequestHash(requestHash: string) {
    return this.listByIds(this.idsByRequestHash.get(requestHash) ?? []);
  }

  async listRequestIdentityLookupsByIdempotencyKey(idempotencyKey: string) {
    return this.listByIds(this.idsByIdempotencyKey.get(idempotencyKey) ?? []);
  }

  async listRequestIdentityLookupsByIdentityNamespaceHash(identityNamespaceHash: string) {
    return this.listByIds(this.idsByIdentityNamespaceHash.get(identityNamespaceHash) ?? []);
  }

  async listRequestIdentityLookupsByTenantClient(input: { client_id: string; tenant_id: string }) {
    return this.listByIds(this.idsByTenantClient.get(`${input.tenant_id}:${input.client_id}`) ?? []);
  }

  async listRequestIdentityLookupsByStrongerTruthRef(strongerTruthRef: string) {
    return this.listByIds(this.idsByTruthRef.get(strongerTruthRef) ?? []);
  }
}
