import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  assertNonEmptySecretString,
  assertSecretVersion,
  normalizeSecretVersion,
  type SecretVersionRecord,
  uniqueSortedSecretStrings,
} from "../models/secret_version.ts";

export type SecretVersionAttestationScope =
  | "RELEASE_PROMOTION"
  | "ROTATION_CANDIDATE"
  | "RUNTIME_ACTIVATION";

const SECRET_VERSION_ATTESTATION_SCOPES = [
  "RELEASE_PROMOTION",
  "ROTATION_CANDIDATE",
  "RUNTIME_ACTIVATION",
] as const;

export type SecretVersionAttestationPayload = {
  attestation_authority_ref: string;
  attestation_evidence_refs: string[];
  attestation_scope: SecretVersionAttestationScope;
  attested_at: string;
  contract_version: "SECRET_VERSION_ATTESTATION_V1";
  expires_at: string | null;
  issued_at: string;
  key_version_ref: string;
  lineage_ref: string;
  policy_profile_ref: string;
  secret_class: string;
  secret_version_id: string;
  store_ref: string;
};

export type BuildSecretVersionAttestationInput = {
  attestation_authority_ref: string;
  attestation_evidence_refs: readonly string[];
  attestation_scope: SecretVersionAttestationScope;
  attested_at: string;
  secret_version: SecretVersionRecord;
};

export type AttestSecretVersionInput = BuildSecretVersionAttestationInput;

export type ActivateSecretVersionInput = {
  activated_at: string;
  secret_version: SecretVersionRecord;
};

export type AttestAndActivateSecretVersionInput = BuildSecretVersionAttestationInput & {
  activated_at: string;
};

export function buildSecretVersionAttestationPayload(
  input: BuildSecretVersionAttestationInput,
): SecretVersionAttestationPayload {
  const secretVersion = normalizeSecretVersion(input.secret_version);
  const attestedAt = normalizeUtcInstantString(input.attested_at);
  assertSecretVersion(
    Date.parse(attestedAt) >= Date.parse(secretVersion.issued_at),
    "SECRET_VERSION_CHRONOLOGY_INVALID",
    "attested_at must not be earlier than issued_at",
  );
  assertSecretVersion(
    SECRET_VERSION_ATTESTATION_SCOPES.includes(input.attestation_scope),
    "SECRET_VERSION_ATTESTATION_INVALID",
    `attestation_scope must be one of ${SECRET_VERSION_ATTESTATION_SCOPES.join(", ")}`,
  );
  return {
    attestation_authority_ref: assertNonEmptySecretString(
      "attestation_authority_ref",
      input.attestation_authority_ref,
    ),
    attestation_evidence_refs: uniqueSortedSecretStrings(
      "attestation_evidence_refs",
      [...input.attestation_evidence_refs],
      { allow_empty: false },
    ),
    attestation_scope: input.attestation_scope,
    attested_at: attestedAt,
    contract_version: "SECRET_VERSION_ATTESTATION_V1",
    expires_at: secretVersion.expires_at,
    issued_at: secretVersion.issued_at,
    key_version_ref: secretVersion.key_version_ref,
    lineage_ref: secretVersion.lineage_ref,
    policy_profile_ref: secretVersion.policy_profile_ref,
    secret_class: secretVersion.secret_class,
    secret_version_id: secretVersion.secret_version_id,
    store_ref: secretVersion.store_ref,
  };
}

export function deriveSecretVersionAttestationRef(payload: SecretVersionAttestationPayload) {
  return `secret-attestation://sha256/${stableJsonHash(payload)}`;
}

export function attestSecretVersion(input: AttestSecretVersionInput): SecretVersionRecord {
  const secretVersion = normalizeSecretVersion(input.secret_version);
  assertSecretVersion(
    secretVersion.rotation_state === "ISSUED" || secretVersion.rotation_state === "ATTESTED",
    "SECRET_VERSION_STATE_INVALID",
    "only ISSUED or ATTESTED versions can be attested before activation",
  );
  const payload = buildSecretVersionAttestationPayload({
    ...input,
    secret_version: secretVersion,
  });
  return normalizeSecretVersion({
    ...secretVersion,
    rotation_state: "ATTESTED",
    last_attested_at: payload.attested_at,
    attestation_ref: deriveSecretVersionAttestationRef(payload),
  });
}

export function activateSecretVersion(input: ActivateSecretVersionInput): SecretVersionRecord {
  const secretVersion = normalizeSecretVersion(input.secret_version);
  const activatedAt = normalizeUtcInstantString(input.activated_at);
  assertSecretVersion(
    secretVersion.rotation_state === "ATTESTED",
    "SECRET_VERSION_STATE_INVALID",
    "only ATTESTED SecretVersion records may be activated",
  );
  assertSecretVersion(
    secretVersion.attestation_ref !== null && secretVersion.last_attested_at !== null,
    "SECRET_VERSION_ATTESTATION_INVALID",
    "activation requires a known attestation_ref and last_attested_at",
  );
  assertSecretVersion(
    Date.parse(activatedAt) >= Date.parse(secretVersion.last_attested_at),
    "SECRET_VERSION_CHRONOLOGY_INVALID",
    "activated_at must not be earlier than last_attested_at",
  );
  return normalizeSecretVersion({
    ...secretVersion,
    rotation_state: "ACTIVE",
    activated_at: activatedAt,
  });
}

export function attestAndActivateSecretVersion(
  input: AttestAndActivateSecretVersionInput,
): SecretVersionRecord {
  return activateSecretVersion({
    activated_at: input.activated_at,
    secret_version: attestSecretVersion(input),
  });
}
