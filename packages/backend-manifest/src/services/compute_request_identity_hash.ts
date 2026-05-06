import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import {
  normalizeScopeSequence,
  normalizeStringSet,
  requireTrimmedString,
  type CanonicalScopeToken,
} from "../../../backend-access/src/services/principal_context_normalizer.ts";
import type {
  RunManifestMode,
  RunManifestReplayClass,
  RunManifestRunKind,
} from "../models/run_manifest.ts";

export type ManifestRequestIdentityInput = {
  access_binding_hash: string;
  business_partitions?: string[];
  client_id: string;
  effective_scope: readonly string[];
  idempotency_key: string;
  income_source_partitions?: string[];
  mode: RunManifestMode;
  nightly_window_key_or_null?: string | null;
  period: string;
  replay_class_or_null?: RunManifestReplayClass | null;
  requested_scope: readonly string[];
  run_kind: RunManifestRunKind;
  tenant_id: string;
};

export type ManifestRequestIdentity = {
  hash: string;
  vector: {
    access_binding_hash: string;
    business_partitions: string[];
    client_id: string;
    effective_scope: CanonicalScopeToken[];
    idempotency_key: string;
    identity_profile_version: "MANIFEST_REQUEST_IDENTITY_V1";
    income_source_partitions: string[];
    mode: RunManifestMode;
    nightly_window_key_or_null: string | null;
    period: string;
    replay_class_or_null: RunManifestReplayClass | null;
    requested_scope: CanonicalScopeToken[];
    run_kind: RunManifestRunKind;
    tenant_id: string;
  };
};

export function normalizeManifestRequestIdentityInput(
  input: ManifestRequestIdentityInput,
): ManifestRequestIdentity["vector"] {
  return {
    identity_profile_version: "MANIFEST_REQUEST_IDENTITY_V1",
    tenant_id: requireTrimmedString("manifest_request_identity.tenant_id", input.tenant_id),
    client_id: requireTrimmedString("manifest_request_identity.client_id", input.client_id),
    period: requireTrimmedString("manifest_request_identity.period", input.period),
    business_partitions: normalizeStringSet(
      "manifest_request_identity.business_partitions",
      input.business_partitions ?? [],
    ),
    income_source_partitions: normalizeStringSet(
      "manifest_request_identity.income_source_partitions",
      input.income_source_partitions ?? [],
    ),
    idempotency_key: requireTrimmedString(
      "manifest_request_identity.idempotency_key",
      input.idempotency_key,
    ),
    access_binding_hash: requireTrimmedString(
      "manifest_request_identity.access_binding_hash",
      input.access_binding_hash,
    ),
    requested_scope: normalizeScopeSequence(
      "manifest_request_identity.requested_scope",
      input.requested_scope,
    ),
    effective_scope: normalizeScopeSequence(
      "manifest_request_identity.effective_scope",
      input.effective_scope,
    ),
    mode: input.mode,
    run_kind: input.run_kind,
    replay_class_or_null:
      input.run_kind === "REPLAY"
        ? input.replay_class_or_null ?? "STANDARD_REPLAY"
        : null,
    nightly_window_key_or_null:
      input.run_kind === "NIGHTLY"
        ? requireTrimmedString(
            "manifest_request_identity.nightly_window_key_or_null",
            input.nightly_window_key_or_null ?? "",
          )
        : null,
  };
}

export function computeRequestIdentityHash(
  input: ManifestRequestIdentityInput,
): ManifestRequestIdentity {
  const vector = normalizeManifestRequestIdentityInput(input);
  return {
    vector,
    hash: stableJsonHash(vector),
  };
}
