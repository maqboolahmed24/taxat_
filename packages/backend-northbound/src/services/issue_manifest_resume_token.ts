import { randomUUID } from "node:crypto";

import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import type { NorthboundActorContext } from "../../../../apps/control-plane-api/src/northbound/policy.ts";

export type ManifestResumeBinding = {
  accessBindingHash: string;
  frameEpoch: number;
  lastPublishedSequence: number;
  manifestId: string;
  maskingContextHash: string;
  publicationGeneration: number;
  schemaCompatibilityRef: string;
  sessionBindingHash: string;
  sessionRef: string;
  shellRouteKey: string;
  shellStabilityToken: string;
};

function assertNonEmptyString(label: string, value: string) {
  if (value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
}

function assertNonNegativeInteger(label: string, value: number) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
}

export function deriveManifestSessionBindingHash(actorContext: NorthboundActorContext) {
  return stableJsonHash({
    client_id_or_null: actorContext.client_id_or_null,
    principal_ref: actorContext.principal_ref,
    session_ref: actorContext.session_ref,
    tenant_id: actorContext.tenant_id,
    token_contract_version: "MANIFEST_SESSION_BINDING_V1",
  });
}

export function deriveManifestAccessBindingHash(actorContext: NorthboundActorContext) {
  return (
    actorContext.access_binding_hash_or_null ??
    stableJsonHash({
      client_id_or_null: actorContext.client_id_or_null,
      principal_ref: actorContext.principal_ref,
      tenant_id: actorContext.tenant_id,
      token_contract_version: "MANIFEST_ACCESS_BINDING_V1",
    })
  );
}

export function deriveManifestMaskingContextHash(actorContext: NorthboundActorContext) {
  return (
    actorContext.masking_posture_fingerprint_or_null ??
    stableJsonHash({
      principal_ref: actorContext.principal_ref,
      tenant_id: actorContext.tenant_id,
      token_contract_version: "MANIFEST_MASKING_CONTEXT_V1",
      visibility_posture: "UNMASKED_OR_NOT_DECLARED",
    })
  );
}

export function manifestResumeBindingFromActor(input: {
  actorContext: NorthboundActorContext;
  frameEpoch: number;
  lastPublishedSequence: number;
  manifestId: string;
  publicationGeneration: number;
  schemaCompatibilityRef?: string;
  shellRouteKey: string;
  shellStabilityToken: string;
}): ManifestResumeBinding {
  return {
    accessBindingHash: deriveManifestAccessBindingHash(input.actorContext),
    frameEpoch: input.frameEpoch,
    lastPublishedSequence: input.lastPublishedSequence,
    manifestId: input.manifestId,
    maskingContextHash: deriveManifestMaskingContextHash(input.actorContext),
    publicationGeneration: input.publicationGeneration,
    schemaCompatibilityRef:
      input.schemaCompatibilityRef ?? "low_noise_experience_frame.schema.json@current",
    sessionBindingHash: deriveManifestSessionBindingHash(input.actorContext),
    sessionRef: input.actorContext.session_ref,
    shellRouteKey: input.shellRouteKey,
    shellStabilityToken: input.shellStabilityToken,
  };
}

export function issueManifestResumeToken(input: ManifestResumeBinding & {
  issuedAt?: string;
  nonce?: string;
}) {
  assertNonEmptyString("manifestId", input.manifestId);
  assertNonEmptyString("shellRouteKey", input.shellRouteKey);
  assertNonEmptyString("shellStabilityToken", input.shellStabilityToken);
  assertNonEmptyString("sessionRef", input.sessionRef);
  assertNonEmptyString("sessionBindingHash", input.sessionBindingHash);
  assertNonEmptyString("accessBindingHash", input.accessBindingHash);
  assertNonEmptyString("maskingContextHash", input.maskingContextHash);
  assertNonEmptyString("schemaCompatibilityRef", input.schemaCompatibilityRef);
  assertNonNegativeInteger("publicationGeneration", input.publicationGeneration);
  assertNonNegativeInteger("frameEpoch", input.frameEpoch);
  assertNonNegativeInteger("lastPublishedSequence", input.lastPublishedSequence);

  const tokenHash = stableJsonHash({
    access_binding_hash: input.accessBindingHash,
    frame_epoch: input.frameEpoch,
    issued_at: input.issuedAt ?? new Date().toISOString(),
    last_published_sequence: input.lastPublishedSequence,
    manifest_id: input.manifestId,
    masking_context_hash: input.maskingContextHash,
    nonce: input.nonce ?? randomUUID(),
    publication_generation: input.publicationGeneration,
    schema_compatibility_ref: input.schemaCompatibilityRef,
    session_binding_hash: input.sessionBindingHash,
    session_ref: input.sessionRef,
    shell_route_key: input.shellRouteKey,
    shell_stability_token: input.shellStabilityToken,
    token_contract_version: "MANIFEST_EXPERIENCE_RESUME_TOKEN_V1",
  });
  return `resume.manifest.${tokenHash.slice(0, 48)}`;
}
