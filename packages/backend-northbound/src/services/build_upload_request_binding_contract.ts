import type { UploadRequestBindingContract } from "../../../../packages/generated-models/src/generated/typescript/index.ts";
import {
  deriveUploadRequestBindingContract,
  reconcileUploadRequestBindingContractForPortal,
  validateUploadRequestBindingScope,
} from "../../../../packages/backend-portal/src/index.ts";
import { assertUploadRequestBindingContract } from "../models/client_upload_session.ts";

export class UploadRequestBindingContractError extends Error {
  readonly code: string;
  readonly reasonCodes: string[];

  constructor(code: string, detail: string, reasonCodes: readonly string[]) {
    super(`${code}: ${detail}`);
    this.name = "UploadRequestBindingContractError";
    this.code = code;
    this.reasonCodes = [...reasonCodes];
  }
}

export function buildUploadRequestBindingContract(input: {
  clientId: string;
  frozenRequestVersionRef: string;
  liveRequestVersionRef?: string | null;
  now: string;
  requestId: string;
  requestIdentityRef: string;
  tenantId: string;
}) {
  const liveRequestVersionRef = input.liveRequestVersionRef ?? input.frozenRequestVersionRef;
  const contract = deriveUploadRequestBindingContract({
    clientId: input.clientId,
    frozenRequestVersionRef: input.frozenRequestVersionRef,
    liveRequestVersionRef,
    now: input.now,
    requestId: input.requestId,
    requestIdentityRef: input.requestIdentityRef,
    tenantId: input.tenantId,
  });
  return assertUploadRequestBindingContract(contract);
}

export function assertAllocationRequestVersionIsCurrent(input: {
  frozenRequestVersionRef: string;
  liveRequestVersionRef?: string | null;
}) {
  if (
    input.liveRequestVersionRef !== undefined &&
    input.liveRequestVersionRef !== null &&
    input.liveRequestVersionRef !== input.frozenRequestVersionRef
  ) {
    throw new UploadRequestBindingContractError(
      "UPLOAD_SESSION_STALE_REQUEST_ALLOCATION",
      "new upload-session allocation must target the currently live request version",
      ["UPLOAD_SESSION_STALE_REQUEST_VERSION", "UPLOAD_SESSION_NEW_STALE_SESSION_FORBIDDEN"],
    );
  }
}

export function reconcileUploadRequestBindingForSession(input: {
  contract: UploadRequestBindingContract;
  explicitReconfirmation?: boolean;
  liveRequestVersionRef: string;
  now: string;
  supersede?: boolean;
}) {
  const next = reconcileUploadRequestBindingContractForPortal({
    contract: input.contract,
    explicitReconfirmation: input.explicitReconfirmation,
    liveRequestVersionRef: input.liveRequestVersionRef,
    now: input.now,
    supersede: input.supersede,
  });
  return assertUploadRequestBindingContract(next);
}

export function assertUploadRequestBindingScope(input: {
  clientId: string;
  contract: UploadRequestBindingContract;
  requestId: string;
  tenantId: string;
}) {
  validateUploadRequestBindingScope(input);
  return true;
}
