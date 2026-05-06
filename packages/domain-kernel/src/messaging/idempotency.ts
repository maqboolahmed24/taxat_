import {
  AUTHORITY_REQUEST_IDENTITY_PROFILE_VERSION,
  deriveAuthorityDuplicateMeaningKey,
  deriveAuthorityIdempotencyKey,
  deriveAuthorityIdentityNamespaceHash,
  deriveAuthorityRequestHash,
  NONE_SENTINEL,
  normalizedOptionalIdentityValue,
  sha256HexUtf8,
  sortSetLikeStrings,
  stablePath,
  stableQueryString,
  stableJsonHash,
  type HashDigest,
} from "../primitives/hash.ts";

export const GENERIC_MESSAGE_IDENTITY_PROFILE_VERSION = "TRANSPORT_MESSAGE_IDENTITY_V1";

export type IdempotencyScopeRef =
  | "NORTHBOUND_COMMAND"
  | "STAGE_TASK"
  | "ARTIFACT_EVENT"
  | "AUTHORITY_REQUEST"
  | "AUTHORITY_INGRESS";

export type IdempotencyCollisionCode =
  | "NONE"
  | "BODY_COLLISION"
  | "IDENTITY_NAMESPACE_COLLISION";

type MessageIdentityBase = {
  duplicateMeaningKey: HashDigest;
  idempotencyKey: HashDigest;
  identityNamespaceHash: HashDigest;
  identityProfileVersion: string;
  namespaceTuple: Record<string, string>;
  requestBodyHash: HashDigest;
  requestHash: HashDigest;
  scopeRef: IdempotencyScopeRef;
};

export type MessageIdentityContract = MessageIdentityBase & {
  contractVersion: typeof GENERIC_MESSAGE_IDENTITY_PROFILE_VERSION;
  headerProfileRefs: string[];
  businessPartitionRefs: string[];
};

export type AuthorityRequestIdentityContract = MessageIdentityBase & {
  actingPartyRef: string;
  authorityBindingRef: string;
  authorityLinkRef: string;
  authorityName: string;
  authorityProductProfile: string;
  authorityScope: string;
  bindingLineageRef: string;
  businessPartitionRefs: string[];
  canonicalPath: string;
  canonicalQuery: string;
  clientId: string;
  contractVersion: typeof AUTHORITY_REQUEST_IDENTITY_PROFILE_VERSION;
  headerProfileRefs: string[];
  httpMethod: string;
  normalizedBasisType: string;
  normalizedObligationRef: string;
  operationFamily: string;
  operationProfile: string;
  policySnapshotHash: string;
  providerApiVersion: string;
  providerEnvironment: string;
  subjectRef: string;
  tenantId: string;
  tokenBindingRef: string;
};

export type ComparableIdentityContract = Pick<
  MessageIdentityBase,
  "duplicateMeaningKey" | "idempotencyKey" | "namespaceTuple" | "requestBodyHash" | "requestHash"
>;

export type GenericMessageIdentityInput = {
  actingPartyRefOrNull?: string | null;
  businessPartitionRefs?: readonly string[];
  channelRef: string;
  consumerRef: string;
  familyRef: string;
  headerProfileRefs?: readonly string[];
  payload: unknown;
  policyRefOrNull?: string | null;
  producerRef: string;
  scopeRef: Exclude<IdempotencyScopeRef, "AUTHORITY_REQUEST">;
  semanticOperationRef: string;
  semanticTargetRef: string;
  sourceRecordRef: string;
  sourceRecordVersionHash: string;
  subjectRefOrNull?: string | null;
  tenantId: string;
};

export type AuthorityRequestIdentityInput = {
  accessBindingHash: string;
  actingPartyRef: string;
  attemptLineageManifestId: string;
  authorityBindingRef: string;
  authorityLinkRef: string;
  authorityName: string;
  authorityProductProfile: string;
  authorityScope: string;
  basisTypeOrNull?: string | null;
  bindingLineageRef: string;
  body: unknown;
  businessPartitionRefs?: readonly string[];
  clientId: string;
  delegationGrantRefOrNull?: string | null;
  headerProfileRefs?: readonly string[];
  httpMethod: string;
  obligationRefOrNull?: string | null;
  operationFamily: string;
  operationProfile: string;
  pathParams: Record<string, unknown>;
  policySnapshotHash: string;
  providerApiVersion: string;
  providerEnvironment: string;
  queryParams?: Record<string, unknown>;
  resourceTemplate: string;
  subjectRef: string;
  tenantId: string;
  tokenBindingRef: string;
};

function normalizedPartitions(values: readonly string[] | undefined) {
  return values && values.length > 0 ? sortSetLikeStrings(values) : [NONE_SENTINEL];
}

function payloadHash(payload: unknown) {
  return stableJsonHash(payload ?? NONE_SENTINEL);
}

export function buildMessageIdempotencyIdentity(
  input: GenericMessageIdentityInput,
): MessageIdentityContract {
  const identityProfileVersion = GENERIC_MESSAGE_IDENTITY_PROFILE_VERSION;
  const headerProfileRefs = sortSetLikeStrings(input.headerProfileRefs ?? []);
  const businessPartitionRefs = normalizedPartitions(input.businessPartitionRefs);
  const requestBodyHash = payloadHash(input.payload);
  const namespaceTuple = {
    channel_ref: input.channelRef,
    consumer_ref: input.consumerRef,
    family_ref: input.familyRef,
    producer_ref: input.producerRef,
    scope_ref: input.scopeRef,
  };

  const identityNamespaceHash = stableJsonHash({
    identity_profile_version: identityProfileVersion,
    ...namespaceTuple,
  });

  const duplicateMeaningKey = stableJsonHash({
    acting_party_ref: normalizedOptionalIdentityValue(input.actingPartyRefOrNull),
    business_partition_refs: businessPartitionRefs,
    family_ref: input.familyRef,
    identity_namespace_hash: identityNamespaceHash,
    identity_profile_version: identityProfileVersion,
    payload_hash: requestBodyHash,
    semantic_operation_ref: input.semanticOperationRef,
    semantic_target_ref: input.semanticTargetRef,
    subject_ref: normalizedOptionalIdentityValue(input.subjectRefOrNull),
    tenant_id: input.tenantId,
  });

  const requestHash = stableJsonHash({
    duplicate_meaning_key: duplicateMeaningKey,
    header_profile_refs: headerProfileRefs,
    identity_namespace_hash: identityNamespaceHash,
    identity_profile_version: identityProfileVersion,
    policy_ref: normalizedOptionalIdentityValue(input.policyRefOrNull),
    source_record_ref: input.sourceRecordRef,
    source_record_version_hash: input.sourceRecordVersionHash,
  });

  return {
    businessPartitionRefs,
    contractVersion: identityProfileVersion,
    duplicateMeaningKey,
    headerProfileRefs,
    identityNamespaceHash,
    identityProfileVersion,
    idempotencyKey: stableJsonHash({
      duplicate_meaning_key: duplicateMeaningKey,
      identity_profile_version: identityProfileVersion,
    }),
    namespaceTuple,
    requestBodyHash,
    requestHash,
    scopeRef: input.scopeRef,
  };
}

export function buildAuthorityRequestIdentity(
  input: AuthorityRequestIdentityInput,
): AuthorityRequestIdentityContract {
  const canonicalPath = stablePath(input.resourceTemplate, input.pathParams);
  if (!canonicalPath) {
    throw new Error("Authority request identity requires a resolvable canonical path.");
  }

  const canonicalQuery = stableQueryString(input.queryParams ?? {});
  const businessPartitionRefs = normalizedPartitions(input.businessPartitionRefs);
  const headerProfileRefs = sortSetLikeStrings(input.headerProfileRefs ?? []);
  const normalizedObligationRef = normalizedOptionalIdentityValue(input.obligationRefOrNull);
  const normalizedBasisType = normalizedOptionalIdentityValue(input.basisTypeOrNull);
  const requestBodyHash = payloadHash(input.body);

  const payload = {
    access_binding_hash: input.accessBindingHash,
    acting_party_ref: input.actingPartyRef,
    attempt_lineage_manifest_id: input.attemptLineageManifestId,
    authority_binding_ref: input.authorityBindingRef,
    authority_link_ref: input.authorityLinkRef,
    authority_name: input.authorityName,
    authority_product_profile: input.authorityProductProfile,
    authority_scope: input.authorityScope,
    binding_lineage_ref: input.bindingLineageRef,
    business_partition_refs: businessPartitionRefs,
    client_id: input.clientId,
    delegation_grant_ref: input.delegationGrantRefOrNull ?? null,
    header_profile_refs: headerProfileRefs,
    http_method: input.httpMethod,
    operation_family: input.operationFamily,
    operation_profile: input.operationProfile,
    policy_snapshot_hash: input.policySnapshotHash,
    provider_api_version: input.providerApiVersion,
    provider_environment: input.providerEnvironment,
    request_body_hash: requestBodyHash,
    subject_ref: input.subjectRef,
    tenant_id: input.tenantId,
    token_binding_ref: input.tokenBindingRef,
  };

  const identityNamespaceHash = deriveAuthorityIdentityNamespaceHash(payload);
  const duplicateMeaningKey = deriveAuthorityDuplicateMeaningKey(
    payload,
    canonicalPath,
    canonicalQuery,
    normalizedObligationRef,
    normalizedBasisType,
  );
  const requestHash = deriveAuthorityRequestHash(payload, duplicateMeaningKey);
  const namespaceTuple = {
    attempt_lineage_manifest_id: input.attemptLineageManifestId,
    authority_name: input.authorityName,
    authority_product_profile: input.authorityProductProfile,
    authority_scope: input.authorityScope,
    binding_lineage_ref: input.bindingLineageRef,
    canonical_path: canonicalPath,
    operation_family: input.operationFamily,
    provider_environment: input.providerEnvironment,
  };

  return {
    actingPartyRef: input.actingPartyRef,
    authorityBindingRef: input.authorityBindingRef,
    authorityLinkRef: input.authorityLinkRef,
    authorityName: input.authorityName,
    authorityProductProfile: input.authorityProductProfile,
    authorityScope: input.authorityScope,
    bindingLineageRef: input.bindingLineageRef,
    businessPartitionRefs,
    canonicalPath,
    canonicalQuery,
    clientId: input.clientId,
    contractVersion: AUTHORITY_REQUEST_IDENTITY_PROFILE_VERSION,
    duplicateMeaningKey,
    headerProfileRefs,
    httpMethod: input.httpMethod,
    identityNamespaceHash,
    identityProfileVersion: AUTHORITY_REQUEST_IDENTITY_PROFILE_VERSION,
    idempotencyKey: deriveAuthorityIdempotencyKey(duplicateMeaningKey),
    namespaceTuple,
    normalizedBasisType,
    normalizedObligationRef,
    operationFamily: input.operationFamily,
    operationProfile: input.operationProfile,
    policySnapshotHash: input.policySnapshotHash,
    providerApiVersion: input.providerApiVersion,
    providerEnvironment: input.providerEnvironment,
    requestBodyHash,
    requestHash,
    scopeRef: "AUTHORITY_REQUEST",
    subjectRef: input.subjectRef,
    tenantId: input.tenantId,
    tokenBindingRef: input.tokenBindingRef,
  };
}

export function classifyIdempotencyCollision(
  existing: ComparableIdentityContract,
  candidate: ComparableIdentityContract,
): IdempotencyCollisionCode {
  if (
    existing.idempotencyKey === candidate.idempotencyKey &&
    existing.requestBodyHash !== candidate.requestBodyHash
  ) {
    return "BODY_COLLISION";
  }

  if (
    (existing.idempotencyKey === candidate.idempotencyKey ||
      existing.requestHash === candidate.requestHash) &&
    stableJsonHash(existing.namespaceTuple) !== stableJsonHash(candidate.namespaceTuple)
  ) {
    return "IDENTITY_NAMESPACE_COLLISION";
  }

  return "NONE";
}

export function deriveSemanticResendKey(
  scopeRef: IdempotencyScopeRef,
  duplicateMeaningKey: string,
  requestHash: string,
) {
  return sha256HexUtf8(`${scopeRef}|${duplicateMeaningKey}|${requestHash}`);
}
