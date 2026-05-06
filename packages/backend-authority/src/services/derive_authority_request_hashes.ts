import {
  AUTHORITY_REQUEST_IDENTITY_PROFILE_VERSION,
  deriveAuthorityDuplicateMeaningKey,
  deriveAuthorityIdempotencyKey,
  deriveAuthorityIdentityNamespaceHash,
  deriveAuthorityRequestHash,
} from "../../../domain-kernel/src/primitives/hash.ts";
import {
  normalizeAuthorityRequestIdentityInputs,
  type NormalizeAuthorityRequestIdentityInputsInput,
  type NormalizedAuthorityRequestIdentityInputs,
} from "./normalize_authority_request_identity_inputs.ts";

export type DerivedAuthorityRequestHashes = {
  attempt_lineage_manifest_id: string;
  duplicate_meaning_key: string;
  idempotency_key: string;
  identity_namespace_hash: string;
  identity_profile_version: typeof AUTHORITY_REQUEST_IDENTITY_PROFILE_VERSION;
  normalized_inputs: NormalizedAuthorityRequestIdentityInputs;
  request_body_hash: string;
  request_hash: string;
};

export function deriveAuthorityRequestHashes(
  input: NormalizeAuthorityRequestIdentityInputsInput,
): DerivedAuthorityRequestHashes {
  const normalized = normalizeAuthorityRequestIdentityInputs(input);
  const identityNamespaceHash = deriveAuthorityIdentityNamespaceHash(normalized);
  const hashPayload = {
    ...normalized,
    identity_namespace_hash: identityNamespaceHash,
  };
  const duplicateMeaningKey = deriveAuthorityDuplicateMeaningKey(
    hashPayload,
    normalized.canonical_path,
    normalized.canonical_query,
    normalized.normalized_obligation_ref,
    normalized.normalized_basis_type,
  );
  const requestHash = deriveAuthorityRequestHash(hashPayload, duplicateMeaningKey);

  return {
    attempt_lineage_manifest_id: normalized.attempt_lineage_manifest_id,
    duplicate_meaning_key: duplicateMeaningKey,
    idempotency_key: deriveAuthorityIdempotencyKey(duplicateMeaningKey),
    identity_namespace_hash: identityNamespaceHash,
    identity_profile_version: AUTHORITY_REQUEST_IDENTITY_PROFILE_VERSION,
    normalized_inputs: normalized,
    request_body_hash: normalized.request_body_hash,
    request_hash: requestHash,
  };
}
