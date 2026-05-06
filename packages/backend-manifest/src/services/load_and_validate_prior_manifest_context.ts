import type { RunManifestRepository } from "../repositories/run_manifest_repository.ts";
import type { RunManifestRecord } from "../models/run_manifest.ts";
import {
  computeRequestIdentityHash,
  type ManifestRequestIdentityInput,
} from "./compute_request_identity_hash.ts";
import {
  getPriorManifestHash,
  validatePriorManifestCompatibility,
} from "./prior_manifest_compatibility_validator.ts";
import type { LoadedPriorManifestContext } from "../types/manifest_prior_context_status.ts";

export type LoadPriorManifestContextErrorCode =
  | "PRIOR_MANIFEST_SOURCE_REQUIRED"
  | "PRIOR_MANIFEST_TENANT_REQUIRED";

export class LoadPriorManifestContextError extends Error {
  readonly code: LoadPriorManifestContextErrorCode;

  constructor(code: LoadPriorManifestContextErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "LoadPriorManifestContextError";
    this.code = code;
  }
}

export type LoadAndValidatePriorManifestContextInput = {
  prior_manifest?: RunManifestRecord | null;
  prior_manifest_id?: string | null;
  request: ManifestRequestIdentityInput;
  run_manifest_repository?: RunManifestRepository;
  tenant_id?: string;
};

async function loadPriorManifest(
  input: LoadAndValidatePriorManifestContextInput,
): Promise<RunManifestRecord | null> {
  if (input.prior_manifest !== undefined) {
    return input.prior_manifest;
  }
  if (!input.prior_manifest_id) {
    return null;
  }
  if (!input.run_manifest_repository) {
    throw new LoadPriorManifestContextError(
      "PRIOR_MANIFEST_SOURCE_REQUIRED",
      "prior_manifest_id requires a RunManifestRepository",
    );
  }
  const tenantId = input.tenant_id ?? input.request.tenant_id;
  if (!tenantId) {
    throw new LoadPriorManifestContextError(
      "PRIOR_MANIFEST_TENANT_REQUIRED",
      "prior manifest repository lookup requires tenant_id",
    );
  }
  const stored = await input.run_manifest_repository.getManifestById(
    tenantId,
    input.prior_manifest_id,
  );
  return stored?.manifest ?? null;
}

export async function loadAndValidatePriorManifestContext(
  input: LoadAndValidatePriorManifestContextInput,
): Promise<LoadedPriorManifestContext> {
  const requestIdentity = computeRequestIdentityHash(input.request);
  const priorManifest = await loadPriorManifest(input);
  if (priorManifest === null) {
    return {
      status: "ABSENT",
      request: input.request,
      request_identity: requestIdentity,
      prior_manifest: null,
      prior_manifest_hash: null,
      compatibility: null,
      invalid_reason_codes: [],
    };
  }

  const compatibility = validatePriorManifestCompatibility({
    request: input.request,
    request_identity: requestIdentity,
    prior_manifest: priorManifest,
  });
  const invalidReasonCodes = compatibility.blocking_reason_codes;

  return {
    status: invalidReasonCodes.length === 0 ? "VALID" : "INVALID",
    request: input.request,
    request_identity: requestIdentity,
    prior_manifest: priorManifest,
    prior_manifest_hash: getPriorManifestHash(priorManifest),
    compatibility,
    invalid_reason_codes: invalidReasonCodes,
  };
}
