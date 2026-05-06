import type {
  ClientDocumentUploadRequestBindingState,
  ClientPortalUploadRequestBindingContract,
} from "../types.ts";
import { ClientUploadSessionProjectionError } from "../types.ts";

export type DeriveUploadRequestBindingContractInput = {
  clientId: string;
  explicitReconfirmation?: boolean | undefined;
  frozenRequestVersionRef: string;
  liveRequestVersionRef?: string | null | undefined;
  now: string;
  requestId: string;
  requestIdentityRef?: string | null | undefined;
  supersede?: boolean | undefined;
  tenantId: string;
};

export type ReconcileUploadRequestBindingContractInput = {
  contract: ClientPortalUploadRequestBindingContract;
  explicitReconfirmation?: boolean | undefined;
  liveRequestVersionRef: string;
  now: string;
  supersede?: boolean | undefined;
};

const basisByState = {
  ORIGINAL_CURRENT: "ORIGINAL_FROZEN_REQUEST",
  RECONFIRMED_CURRENT: "EXPLICIT_RECONFIRMATION",
  RECONFIRMATION_REQUIRED: "ACTIVE_REQUEST_REBASE_PENDING_CONFIRMATION",
  SUPERSEDED: "ACTIVE_REQUEST_SUPERSEDED",
} as const satisfies Record<ClientDocumentUploadRequestBindingState, string>;

function fail(message: string, reasonCodes: readonly string[]): never {
  throw new ClientUploadSessionProjectionError(message, reasonCodes);
}

function assertNonEmpty(label: string, value: string | null | undefined): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(`${label} is required`, ["CLIENT_UPLOAD_SESSION_IDENTITY_SCOPE_INVALID"]);
  }
  return value;
}

function normalizeInstant(label: string, value: string) {
  const literal = assertNonEmpty(label, value);
  const parsed = new Date(literal);
  if (Number.isNaN(parsed.valueOf())) {
    fail(`${label} must be a valid ISO-8601 instant`, [
      "CLIENT_UPLOAD_SESSION_CHRONOLOGY_INVALID",
    ]);
  }
  const iso = parsed.toISOString();
  return iso.endsWith(".000Z") ? iso.replace(".000Z", "Z") : iso;
}

export function deriveFrozenBindingScopeHash(input: {
  clientId: string;
  frozenRequestVersionRef: string;
  requestId: string;
  tenantId: string;
}) {
  return [
    assertNonEmpty("tenant_id", input.tenantId),
    assertNonEmpty("client_id", input.clientId),
    assertNonEmpty("request_id", input.requestId),
    assertNonEmpty("frozen_request_version_ref", input.frozenRequestVersionRef),
  ].join("|");
}

export function deriveUploadRequestBindingState(input: {
  explicitReconfirmation?: boolean | undefined;
  frozenRequestVersionRef: string;
  liveRequestVersionRef: string;
  supersede?: boolean | undefined;
}): ClientDocumentUploadRequestBindingState {
  if (input.supersede) {
    return "SUPERSEDED";
  }
  if (input.explicitReconfirmation) {
    if (input.liveRequestVersionRef === input.frozenRequestVersionRef) {
      fail("explicit upload reconfirmation requires a live request rebase", [
        "CLIENT_UPLOAD_SESSION_RECONFIRMATION_WITHOUT_REBASE",
      ]);
    }
    return "RECONFIRMED_CURRENT";
  }
  return input.liveRequestVersionRef === input.frozenRequestVersionRef
    ? "ORIGINAL_CURRENT"
    : "RECONFIRMATION_REQUIRED";
}

export function deriveUploadRequestBindingContract(
  input: DeriveUploadRequestBindingContractInput,
): ClientPortalUploadRequestBindingContract {
  const tenantId = assertNonEmpty("tenant_id", input.tenantId);
  const clientId = assertNonEmpty("client_id", input.clientId);
  const requestId = assertNonEmpty("request_id", input.requestId);
  const requestIdentityRef = assertNonEmpty(
    "request_identity_ref",
    input.requestIdentityRef ?? input.requestId,
  );
  const frozenRequestVersionRef = assertNonEmpty(
    "frozen_request_version_ref",
    input.frozenRequestVersionRef,
  );
  const liveRequestVersionRef = assertNonEmpty(
    "live_request_version_ref",
    input.liveRequestVersionRef ?? input.frozenRequestVersionRef,
  );

  if (requestIdentityRef !== requestId) {
    fail("request_identity_ref must mirror request_id for governed portal uploads", [
      "CLIENT_UPLOAD_SESSION_REQUEST_IDENTITY_DRIFT",
    ]);
  }

  const requestBindingState = deriveUploadRequestBindingState({
    explicitReconfirmation: input.explicitReconfirmation,
    frozenRequestVersionRef,
    liveRequestVersionRef,
    supersede: input.supersede,
  });

  return {
    attachment_authority_policy: "ATTACH_ONLY_TO_CURRENT_OR_RECONFIRMED_REQUEST",
    binding_resolution_basis: basisByState[requestBindingState],
    contract_version: "UPLOAD_REQUEST_BINDING_V1",
    cross_device_resume_policy: "CROSS_DEVICE_RESUME_REUSES_EXISTING_SESSION",
    duplicate_file_policy: "REUSE_FROZEN_STORAGE_REF_ON_RESUME_OR_RETRY",
    duplicate_session_policy: "NO_DUPLICATE_SESSION_ON_RECONNECT",
    frozen_binding_scope_hash: deriveFrozenBindingScopeHash({
      clientId,
      frozenRequestVersionRef,
      requestId,
      tenantId,
    }),
    frozen_client_id: clientId,
    frozen_request_id: requestId,
    frozen_request_version_ref: frozenRequestVersionRef,
    frozen_tenant_id: tenantId,
    inflight_rebase_policy: "IN_FLIGHT_REBASE_PRESERVES_SESSION_UNTIL_TRANSFER_TERMINATES",
    live_request_version_ref: liveRequestVersionRef,
    next_action_authority_policy: "TRANSFER_AND_BINDING_STATE_DETERMINE_NEXT_ACTION",
    rebase_detected_at_or_null:
      requestBindingState === "ORIGINAL_CURRENT" ? null : normalizeInstant("now", input.now),
    request_binding_state: requestBindingState,
    request_identity_ref: requestId,
    resume_identity_policy: "RESUME_EXISTING_SESSION_ONLY",
    stale_completion_policy: "STALE_BYTES_NEVER_SATISFY_CURRENT_REQUEST",
  };
}

export function reconcileUploadRequestBindingContractForPortal(
  input: ReconcileUploadRequestBindingContractInput,
): ClientPortalUploadRequestBindingContract {
  validateUploadRequestBindingContract(input.contract);
  const state = deriveUploadRequestBindingState({
    explicitReconfirmation: input.explicitReconfirmation,
    frozenRequestVersionRef: input.contract.frozen_request_version_ref,
    liveRequestVersionRef: input.liveRequestVersionRef,
    supersede: input.supersede,
  });
  const priorRebaseAt = input.contract.rebase_detected_at_or_null;
  return {
    ...input.contract,
    binding_resolution_basis: basisByState[state],
    live_request_version_ref: assertNonEmpty("live_request_version_ref", input.liveRequestVersionRef),
    rebase_detected_at_or_null:
      state === "ORIGINAL_CURRENT"
        ? null
        : (priorRebaseAt ?? normalizeInstant("now", input.now)),
    request_binding_state: state,
  };
}

export function validateUploadRequestBindingContract(
  contract: ClientPortalUploadRequestBindingContract,
) {
  assertNonEmpty("frozen_tenant_id", contract.frozen_tenant_id);
  assertNonEmpty("frozen_client_id", contract.frozen_client_id);
  assertNonEmpty("frozen_request_id", contract.frozen_request_id);
  assertNonEmpty("request_identity_ref", contract.request_identity_ref);
  assertNonEmpty("frozen_request_version_ref", contract.frozen_request_version_ref);
  assertNonEmpty("live_request_version_ref", contract.live_request_version_ref);
  if (contract.request_identity_ref !== contract.frozen_request_id) {
    fail("upload request identity must mirror the frozen request id", [
      "CLIENT_UPLOAD_SESSION_REQUEST_IDENTITY_DRIFT",
    ]);
  }
  if (contract.contract_version !== "UPLOAD_REQUEST_BINDING_V1") {
    fail("upload request binding contract version drifted", [
      "CLIENT_UPLOAD_SESSION_BINDING_POLICY_DRIFT",
    ]);
  }
  if (contract.binding_resolution_basis !== basisByState[contract.request_binding_state]) {
    fail("binding_resolution_basis must mirror request_binding_state", [
      "CLIENT_UPLOAD_SESSION_BINDING_BASIS_DRIFT",
    ]);
  }
  const expectedScopeHash = deriveFrozenBindingScopeHash({
    clientId: contract.frozen_client_id,
    frozenRequestVersionRef: contract.frozen_request_version_ref,
    requestId: contract.frozen_request_id,
    tenantId: contract.frozen_tenant_id,
  });
  if (contract.frozen_binding_scope_hash !== expectedScopeHash) {
    fail("frozen_binding_scope_hash must equal the canonical tenant/client/request/version tuple", [
      "CLIENT_UPLOAD_SESSION_BINDING_SCOPE_HASH_DRIFT",
    ]);
  }
  if (
    contract.request_binding_state === "ORIGINAL_CURRENT" &&
    contract.rebase_detected_at_or_null !== null
  ) {
    fail("original current upload binding must not publish a rebase timestamp", [
      "CLIENT_UPLOAD_SESSION_REBASE_TIMESTAMP_DRIFT",
    ]);
  }
  if (
    contract.request_binding_state === "ORIGINAL_CURRENT" &&
    contract.live_request_version_ref !== contract.frozen_request_version_ref
  ) {
    fail("original current upload binding must keep live and frozen request versions aligned", [
      "CLIENT_UPLOAD_SESSION_BINDING_VERSION_DRIFT",
    ]);
  }
  if (
    contract.request_binding_state !== "ORIGINAL_CURRENT" &&
    contract.rebase_detected_at_or_null === null
  ) {
    fail("rebased upload bindings require rebase_detected_at_or_null", [
      "CLIENT_UPLOAD_SESSION_REBASE_TIMESTAMP_REQUIRED",
    ]);
  }
  if (
    contract.request_binding_state !== "ORIGINAL_CURRENT" &&
    contract.live_request_version_ref === contract.frozen_request_version_ref
  ) {
    fail("rebased upload bindings require a live request version distinct from the frozen version", [
      "CLIENT_UPLOAD_SESSION_BINDING_VERSION_DRIFT",
    ]);
  }
  return contract;
}

export function validateUploadRequestBindingScope(input: {
  clientId: string;
  contract: ClientPortalUploadRequestBindingContract;
  requestId: string;
  tenantId: string;
}) {
  validateUploadRequestBindingContract(input.contract);
  const expected = deriveFrozenBindingScopeHash({
    clientId: input.clientId,
    frozenRequestVersionRef: input.contract.frozen_request_version_ref,
    requestId: input.requestId,
    tenantId: input.tenantId,
  });
  if (
    input.contract.frozen_tenant_id !== input.tenantId ||
    input.contract.frozen_client_id !== input.clientId ||
    input.contract.frozen_request_id !== input.requestId ||
    input.contract.frozen_binding_scope_hash !== expected
  ) {
    fail("upload binding scope drifted across tenant, client, or request identity", [
      "CLIENT_UPLOAD_SESSION_SCOPE_MISMATCH",
    ]);
  }
  return true;
}
