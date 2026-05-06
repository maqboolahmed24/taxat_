import type { UploadRequestBindingContract } from "../../../generated-models/src/generated/typescript/index.ts";
import { normalizeUtcInstantString } from "../primitives/time.ts";
import { assertReferenceFamily, assertReferenceKeyLiteral } from "../references/reference_key.ts";

export type UploadRequestBindingState = UploadRequestBindingContract["request_binding_state"];
export type UploadBindingResolutionBasis =
  UploadRequestBindingContract["binding_resolution_basis"];

export type UploadRequestBindingAssessment = {
  attachmentAuthorityAllowed: boolean;
  bindingResolutionBasis: UploadBindingResolutionBasis;
  isCurrentForAttachment: boolean;
  isStaleForCurrentRequest: boolean;
  nextActionCode:
    | "NONE"
    | "RECONFIRM_REQUEST"
    | "RETRY_UPLOAD"
    | "UPLOAD_REPLACEMENT";
  requestBindingState: UploadRequestBindingState;
};

type UploadRequestBindingErrorCode =
  | "UPLOAD_BINDING_CROSS_SCOPE"
  | "UPLOAD_BINDING_INVALID_RECONFIRMATION"
  | "UPLOAD_BINDING_REQUEST_DRIFT";

type UploadRequestBindingErrorInit = {
  code: UploadRequestBindingErrorCode;
  detail: string;
};

export class UploadRequestBindingError extends Error {
  readonly code: UploadRequestBindingErrorCode;

  constructor(init: UploadRequestBindingErrorInit) {
    super(`${init.code}: ${init.detail}`);
    this.name = "UploadRequestBindingError";
    this.code = init.code;
  }
}

function assertCondition(
  condition: unknown,
  init: UploadRequestBindingErrorInit,
): asserts condition {
  if (!condition) {
    throw new UploadRequestBindingError(init);
  }
}

function scopeHash(input: {
  frozenClientId: string;
  frozenRequestId: string;
  frozenRequestVersionRef: string;
  frozenTenantId: string;
}) {
  return [
    input.frozenTenantId,
    input.frozenClientId,
    input.frozenRequestId,
    input.frozenRequestVersionRef,
  ].join("|");
}

export function createUploadRequestBindingContract(input: {
  frozenClientId: string;
  frozenRequestId: string;
  frozenRequestVersionRef: string;
  frozenTenantId: string;
  liveRequestVersionRef?: string;
  now?: string;
  requestIdentityRef: string;
}) {
  assertReferenceKeyLiteral("tenant_id", input.frozenTenantId);
  assertReferenceKeyLiteral("client_id", input.frozenClientId);
  assertReferenceFamily("request_id", "IDENTITY", input.frozenRequestId);
  assertReferenceFamily("request_version_ref", "REFERENCE", input.frozenRequestVersionRef);
  assertReferenceFamily("request_identity_ref", "REFERENCE", input.requestIdentityRef);
  assertCondition(input.requestIdentityRef === input.frozenRequestId, {
    code: "UPLOAD_BINDING_CROSS_SCOPE",
    detail: "request_identity_ref must mirror frozen_request_id for client upload sessions",
  });

  const liveRequestVersionRef = input.liveRequestVersionRef ?? input.frozenRequestVersionRef;
  assertReferenceFamily("request_version_ref", "REFERENCE", liveRequestVersionRef);

  const rebased = liveRequestVersionRef !== input.frozenRequestVersionRef;
  const requestBindingState: UploadRequestBindingState = rebased
    ? "RECONFIRMATION_REQUIRED"
    : "ORIGINAL_CURRENT";
  const bindingResolutionBasis: UploadBindingResolutionBasis = rebased
    ? "ACTIVE_REQUEST_REBASE_PENDING_CONFIRMATION"
    : "ORIGINAL_FROZEN_REQUEST";

  return {
    attachment_authority_policy: "ATTACH_ONLY_TO_CURRENT_OR_RECONFIRMED_REQUEST",
    binding_resolution_basis: bindingResolutionBasis,
    contract_version: "UPLOAD_REQUEST_BINDING_V1",
    cross_device_resume_policy: "CROSS_DEVICE_RESUME_REUSES_EXISTING_SESSION",
    duplicate_file_policy: "REUSE_FROZEN_STORAGE_REF_ON_RESUME_OR_RETRY",
    duplicate_session_policy: "NO_DUPLICATE_SESSION_ON_RECONNECT",
    frozen_binding_scope_hash: scopeHash(input),
    frozen_client_id: input.frozenClientId,
    frozen_request_id: input.frozenRequestId,
    frozen_request_version_ref: input.frozenRequestVersionRef,
    frozen_tenant_id: input.frozenTenantId,
    inflight_rebase_policy: "IN_FLIGHT_REBASE_PRESERVES_SESSION_UNTIL_TRANSFER_TERMINATES",
    live_request_version_ref: liveRequestVersionRef,
    next_action_authority_policy: "TRANSFER_AND_BINDING_STATE_DETERMINE_NEXT_ACTION",
    rebase_detected_at_or_null: rebased
      ? normalizeUtcInstantString(input.now ?? new Date().toISOString())
      : null,
    request_binding_state: requestBindingState,
    request_identity_ref: input.frozenRequestId,
    resume_identity_policy: "RESUME_EXISTING_SESSION_ONLY",
    stale_completion_policy: "STALE_BYTES_NEVER_SATISFY_CURRENT_REQUEST",
  } satisfies UploadRequestBindingContract;
}

export function reconcileUploadRequestBindingContract(input: {
  contract: UploadRequestBindingContract;
  explicitReconfirmation?: boolean;
  liveRequestVersionRef: string;
  now: string;
  supersede?: boolean;
}) {
  assertReferenceFamily("request_version_ref", "REFERENCE", input.liveRequestVersionRef);
  if (input.supersede) {
    return {
      ...input.contract,
      binding_resolution_basis: "ACTIVE_REQUEST_SUPERSEDED",
      live_request_version_ref: input.liveRequestVersionRef,
      rebase_detected_at_or_null:
        input.contract.rebase_detected_at_or_null ?? normalizeUtcInstantString(input.now),
      request_binding_state: "SUPERSEDED",
    } satisfies UploadRequestBindingContract;
  }

  if (input.explicitReconfirmation) {
    assertCondition(
      input.liveRequestVersionRef !== input.contract.frozen_request_version_ref ||
        input.contract.request_binding_state === "RECONFIRMATION_REQUIRED",
      {
        code: "UPLOAD_BINDING_INVALID_RECONFIRMATION",
        detail: "explicit reconfirmation must follow a live request rebase",
      },
    );
    return {
      ...input.contract,
      binding_resolution_basis: "EXPLICIT_RECONFIRMATION",
      live_request_version_ref: input.liveRequestVersionRef,
      rebase_detected_at_or_null:
        input.contract.rebase_detected_at_or_null ?? normalizeUtcInstantString(input.now),
      request_binding_state: "RECONFIRMED_CURRENT",
    } satisfies UploadRequestBindingContract;
  }

  if (input.liveRequestVersionRef === input.contract.frozen_request_version_ref) {
    return {
      ...input.contract,
      binding_resolution_basis:
        input.contract.request_binding_state === "RECONFIRMED_CURRENT"
          ? "EXPLICIT_RECONFIRMATION"
          : "ORIGINAL_FROZEN_REQUEST",
      live_request_version_ref: input.liveRequestVersionRef,
      request_binding_state:
        input.contract.request_binding_state === "RECONFIRMED_CURRENT"
          ? "RECONFIRMED_CURRENT"
          : "ORIGINAL_CURRENT",
    } satisfies UploadRequestBindingContract;
  }

  return {
    ...input.contract,
    binding_resolution_basis: "ACTIVE_REQUEST_REBASE_PENDING_CONFIRMATION",
    live_request_version_ref: input.liveRequestVersionRef,
    rebase_detected_at_or_null:
      input.contract.rebase_detected_at_or_null ?? normalizeUtcInstantString(input.now),
    request_binding_state: "RECONFIRMATION_REQUIRED",
  } satisfies UploadRequestBindingContract;
}

export function assessUploadRequestBinding(contract: UploadRequestBindingContract) {
  const attachmentAuthorityAllowed =
    contract.request_binding_state === "ORIGINAL_CURRENT" ||
    contract.request_binding_state === "RECONFIRMED_CURRENT";
  const isStaleForCurrentRequest =
    contract.request_binding_state === "RECONFIRMATION_REQUIRED" ||
    contract.request_binding_state === "SUPERSEDED";

  return {
    attachmentAuthorityAllowed,
    bindingResolutionBasis: contract.binding_resolution_basis,
    isCurrentForAttachment: attachmentAuthorityAllowed,
    isStaleForCurrentRequest,
    nextActionCode:
      contract.request_binding_state === "RECONFIRMATION_REQUIRED"
        ? "RECONFIRM_REQUEST"
        : contract.request_binding_state === "SUPERSEDED"
          ? "UPLOAD_REPLACEMENT"
          : "NONE",
    requestBindingState: contract.request_binding_state,
  } satisfies UploadRequestBindingAssessment;
}

export function assertUploadBindingScopeMatch(input: {
  contract: UploadRequestBindingContract;
  clientId: string;
  requestId: string;
  tenantId: string;
}) {
  assertReferenceKeyLiteral("tenant_id", input.tenantId);
  assertReferenceKeyLiteral("client_id", input.clientId);
  assertReferenceFamily("request_id", "IDENTITY", input.requestId);

  const candidate = scopeHash({
    frozenClientId: input.clientId,
    frozenRequestId: input.requestId,
    frozenRequestVersionRef: input.contract.frozen_request_version_ref,
    frozenTenantId: input.tenantId,
  });

  assertCondition(
    input.contract.request_identity_ref === input.requestId &&
      candidate === input.contract.frozen_binding_scope_hash,
    {
    code: "UPLOAD_BINDING_CROSS_SCOPE",
    detail: "upload session scope drifted across tenant, client, or request identity",
    },
  );
  return true;
}

export function assertLiveRequestDriftVisible(input: {
  contract: UploadRequestBindingContract;
  publishedRequestVersionRef: string;
}) {
  assertReferenceFamily("request_version_ref", "REFERENCE", input.publishedRequestVersionRef);
  assertCondition(
    input.contract.live_request_version_ref === input.publishedRequestVersionRef,
    {
      code: "UPLOAD_BINDING_REQUEST_DRIFT",
      detail: "read projection must publish the same live request version seen by the binding contract",
    },
  );
  return true;
}
