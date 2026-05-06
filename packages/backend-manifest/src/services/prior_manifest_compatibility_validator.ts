import { normalizeScopeSequence } from "../../../backend-access/src/services/principal_context_normalizer.ts";
import type { ManifestRejectionReasonCode } from "../models/manifest_branch_decision_contract.ts";
import type { RunManifestRecord } from "../models/run_manifest.ts";
import { validateRunManifestMirrorConsistency } from "./manifest_mirror_consistency_validator.ts";
import {
  computeRequestIdentityHash,
  type ManifestRequestIdentity,
  type ManifestRequestIdentityInput,
} from "./compute_request_identity_hash.ts";
import type {
  PriorManifestCompatibilityEvaluation,
  PriorManifestInvalidReasonCode,
} from "../types/manifest_prior_context_status.ts";

const BLOCKING_REASON_TO_REJECTION: Partial<
  Record<PriorManifestInvalidReasonCode, ManifestRejectionReasonCode>
> = {
  ACCESS_BINDING_HASH_MISMATCH: "ACCESS_BINDING_HASH_MISMATCH",
  EFFECTIVE_SCOPE_MISMATCH: "EFFECTIVE_SCOPE_MISMATCH",
  MANIFEST_HASH_MISSING: "PRIOR_MANIFEST_HASH_MISSING",
  MODE_MISMATCH: "MODE_MISMATCH",
  NIGHTLY_WINDOW_MISMATCH: "NIGHTLY_WINDOW_MISMATCH",
  REPLAY_CLASS_MISMATCH: "REPLAY_CLASS_MISMATCH",
  REQUESTED_SCOPE_MISMATCH: "REQUESTED_SCOPE_MISMATCH",
  REQUEST_IDENTITY_HASH_MISMATCH: "REQUEST_IDENTITY_HASH_MISMATCH",
  RUN_KIND_MISMATCH: "RUN_KIND_MISMATCH",
};

function valuesEqual(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function priorManifestHash(priorManifest: RunManifestRecord) {
  return (
    priorManifest.hash_set?.manifest_hash ??
    priorManifest.frozen_execution_binding?.manifest_hash ??
    null
  );
}

function pushUnique<T>(values: T[], value: T) {
  if (!values.includes(value)) {
    values.push(value);
  }
}

export function requestIdentityFromManifest(
  manifest: RunManifestRecord,
): ManifestRequestIdentityInput {
  return {
    tenant_id: manifest.tenant_id,
    client_id: manifest.client_id,
    period: manifest.period,
    business_partitions: manifest.business_partitions,
    income_source_partitions: manifest.income_source_partitions,
    idempotency_key: manifest.idempotency_key,
    access_binding_hash: manifest.access_binding_hash,
    requested_scope: manifest.requested_scope,
    effective_scope:
      manifest.scope_execution_binding.executable_scope ??
      manifest.access_decision?.effective_scope ??
      manifest.requested_scope,
    mode: manifest.mode,
    run_kind: manifest.run_kind,
    replay_class_or_null: manifest.replay_class ?? null,
    nightly_window_key_or_null: manifest.nightly_window_key ?? null,
  };
}

export function getPriorManifestHash(priorManifest: RunManifestRecord) {
  return priorManifestHash(priorManifest);
}

export function validatePriorManifestCompatibility(input: {
  prior_manifest: RunManifestRecord;
  request: ManifestRequestIdentityInput;
  request_identity?: ManifestRequestIdentity;
}): PriorManifestCompatibilityEvaluation {
  const blocking: PriorManifestInvalidReasonCode[] = [];
  const identityDrift: PriorManifestInvalidReasonCode[] = [];
  const requestIdentity = input.request_identity ?? computeRequestIdentityHash(input.request);
  const prior = input.prior_manifest;

  try {
    validateRunManifestMirrorConsistency(prior);
  } catch {
    pushUnique(blocking, "LINEAGE_MIRROR_MISMATCH");
  }

  if (prior.tenant_id !== input.request.tenant_id) {
    pushUnique(blocking, "TENANT_ID_MISMATCH");
  }
  if (prior.client_id !== input.request.client_id) {
    pushUnique(blocking, "CLIENT_ID_MISMATCH");
  }
  if (prior.period !== input.request.period) {
    pushUnique(blocking, "PERIOD_MISMATCH");
  }
  if (prior.mode !== input.request.mode) {
    pushUnique(blocking, "MODE_MISMATCH");
  }
  if (prior.access_binding_hash !== input.request.access_binding_hash) {
    pushUnique(blocking, "ACCESS_BINDING_HASH_MISMATCH");
  }
  if (priorManifestHash(prior) === null) {
    pushUnique(blocking, "MANIFEST_HASH_MISSING");
  }

  const requestedScope = normalizeScopeSequence(
    "prior_manifest_compatibility.requested_scope",
    input.request.requested_scope,
  );
  const effectiveScope = normalizeScopeSequence(
    "prior_manifest_compatibility.effective_scope",
    input.request.effective_scope,
  );
  if (!valuesEqual(prior.requested_scope, requestedScope)) {
    pushUnique(identityDrift, "REQUESTED_SCOPE_MISMATCH");
  }
  if (!valuesEqual(prior.scope_execution_binding.executable_scope, effectiveScope)) {
    pushUnique(identityDrift, "EFFECTIVE_SCOPE_MISMATCH");
  }

  if (
    prior.run_kind !== input.request.run_kind &&
    input.request.run_kind !== "REPLAY"
  ) {
    pushUnique(identityDrift, "RUN_KIND_MISMATCH");
  }
  if (
    input.request.run_kind === "REPLAY" &&
    prior.run_kind === "REPLAY" &&
    (prior.replay_class ?? null) !== (input.request.replay_class_or_null ?? "STANDARD_REPLAY")
  ) {
    pushUnique(identityDrift, "REPLAY_CLASS_MISMATCH");
  }
  if (
    input.request.run_kind === "NIGHTLY" &&
    (prior.nightly_window_key ?? null) !== (input.request.nightly_window_key_or_null ?? null)
  ) {
    pushUnique(identityDrift, "NIGHTLY_WINDOW_MISMATCH");
  }

  const priorRequestIdentityHash =
    prior.manifest_branch_decision.request_identity_hash ??
    computeRequestIdentityHash(requestIdentityFromManifest(prior)).hash;
  const requestIdentityMatchesPrior = priorRequestIdentityHash === requestIdentity.hash;
  if (!requestIdentityMatchesPrior) {
    pushUnique(identityDrift, "REQUEST_IDENTITY_HASH_MISMATCH");
  }

  const branchDisqualifiers = [...blocking, ...identityDrift]
    .map((reason) => BLOCKING_REASON_TO_REJECTION[reason])
    .filter((reason): reason is ManifestRejectionReasonCode => reason !== undefined);

  return {
    blocking_reason_codes: blocking,
    identity_drift_reason_codes: identityDrift,
    branch_disqualifier_reason_codes: branchDisqualifiers,
    request_identity_matches_prior: requestIdentityMatchesPrior,
  };
}
