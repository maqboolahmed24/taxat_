import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { UploadSessionRecoveryHarnessCompletionState } from "../../../generated-models/src/generated/typescript/index.ts";
import type { GovernedUploadSession } from "./upload_session_state.ts";
import { assessUploadRequestBinding } from "./upload_request_binding_reader.ts";

export type UploadCompletionBoundaryPolicy = {
  attachment_confirmation_required_posture: {
    attachment_state: "CONFIRMATION_REQUIRED";
    next_action_code: "CONFIRM_ATTACHMENT";
  };
  basis_statement: string;
  contract_version: "UPLOAD_COMPLETION_BOUNDARY_POLICY_V1";
  current_request_min_confidence_score: number;
  policy_id: string;
  scanner_or_validation_pending_posture: {
    attachment_state: "STAGED";
    next_action_code: "NONE";
  };
  stale_completion_posture: {
    attachment_state: "REBIND_REQUIRED";
    next_action_code: "RECONFIRM_REQUEST";
  };
  transfer_in_flight_posture: {
    attachment_state: "STAGED";
    next_action_code: "RESUME_UPLOAD";
  };
  transfer_success_policy: "TRANSFER_SUCCESS_NEVER_IMPLIES_ATTACHMENT_OR_REQUEST_SATISFACTION";
};

export type UploadCompletionBoundaryDecision = {
  attachmentState: GovernedUploadSession["attachment_state"];
  completionState: UploadSessionRecoveryHarnessCompletionState;
  nextActionCode: GovernedUploadSession["next_action_code"];
  readyForCurrentRequest: boolean;
  recoveryPosture: GovernedUploadSession["recovery_posture"];
  reasonCodes: string[];
};

type UploadCompletionBoundaryErrorCode = "UPLOAD_COMPLETION_POLICY_INVALID";

type UploadCompletionBoundaryErrorInit = {
  code: UploadCompletionBoundaryErrorCode;
  detail: string;
};

export class UploadCompletionBoundaryError extends Error {
  readonly code: UploadCompletionBoundaryErrorCode;

  constructor(init: UploadCompletionBoundaryErrorInit) {
    super(`${init.code}: ${init.detail}`);
    this.name = "UploadCompletionBoundaryError";
    this.code = init.code;
  }
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..", "..");
const completionPolicyPath = path.join(
  repoRoot,
  "config",
  "uploads",
  "upload_completion_boundary_policy.json",
);

let cachedPolicy: Promise<UploadCompletionBoundaryPolicy> | null = null;

function assertCondition(
  condition: unknown,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new UploadCompletionBoundaryError({
      code: "UPLOAD_COMPLETION_POLICY_INVALID",
      detail,
    });
  }
}

async function readJson<T>(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function validatePolicy(policy: UploadCompletionBoundaryPolicy) {
  assertCondition(
    policy.contract_version === "UPLOAD_COMPLETION_BOUNDARY_POLICY_V1",
    "upload completion boundary policy contract version drifted",
  );
  assertCondition(
    policy.transfer_success_policy ===
      "TRANSFER_SUCCESS_NEVER_IMPLIES_ATTACHMENT_OR_REQUEST_SATISFACTION",
    "upload completion boundary must preserve transfer-to-attachment separation",
  );
}

export async function loadUploadCompletionBoundaryPolicy(options?: { reload?: boolean }) {
  if (!cachedPolicy || options?.reload) {
    cachedPolicy = (async () => {
      const policy = await readJson<UploadCompletionBoundaryPolicy>(completionPolicyPath);
      validatePolicy(policy);
      return policy;
    })();
  }
  return cachedPolicy;
}

export async function assessUploadCompletionBoundary(session: GovernedUploadSession) {
  const policy = await loadUploadCompletionBoundaryPolicy();
  const binding = assessUploadRequestBinding(session.upload_request_binding_contract);
  const reasonCodes: string[] = [];

  if (session.bytes_transferred < session.byte_count || session.transfer_state === "UPLOADING") {
    reasonCodes.push("TRANSFER_IN_FLIGHT");
    return {
      attachmentState: policy.transfer_in_flight_posture.attachment_state,
      completionState: "NOT_READY_BYTES_IN_FLIGHT",
      nextActionCode: policy.transfer_in_flight_posture.next_action_code,
      readyForCurrentRequest: false,
      recoveryPosture:
        session.request_binding_state === "RECONFIRMATION_REQUIRED"
          ? "RECONFIRM_INLINE"
          : "INLINE_RESUME",
      reasonCodes,
    } satisfies UploadCompletionBoundaryDecision;
  }

  if (
    session.integrity_state !== "VERIFIED" ||
    session.malware_scan_state === "PENDING" ||
    session.validation_state === "PENDING"
  ) {
    reasonCodes.push("TRANSFER_FINISHED_WAITING_FOR_SCAN_OR_VALIDATION");
    return {
      attachmentState: policy.scanner_or_validation_pending_posture.attachment_state,
      completionState: "NOT_READY_SCAN_OR_VALIDATION_PENDING",
      nextActionCode: policy.scanner_or_validation_pending_posture.next_action_code,
      readyForCurrentRequest: false,
      recoveryPosture: "NONE",
      reasonCodes,
    } satisfies UploadCompletionBoundaryDecision;
  }

  if (
    session.integrity_state === "FAILED" ||
    session.validation_state === "REJECTED" ||
    session.validation_state === "REQUIRES_REPLACEMENT" ||
    session.malware_scan_state === "QUARANTINED"
  ) {
    reasonCodes.push("TRANSFER_REJECTED_AFTER_VERIFICATION");
    return {
      attachmentState: "STAGED",
      completionState: "NOT_READY_SCAN_OR_VALIDATION_PENDING",
      nextActionCode:
        session.validation_state === "REQUIRES_REPLACEMENT" ? "UPLOAD_REPLACEMENT" : "RETRY_UPLOAD",
      readyForCurrentRequest: false,
      recoveryPosture: "SUPPORT_REQUIRED",
      reasonCodes,
    } satisfies UploadCompletionBoundaryDecision;
  }

  if (!binding.attachmentAuthorityAllowed) {
    reasonCodes.push("STALE_REQUEST_RECONFIRMATION_REQUIRED");
    return {
      attachmentState: policy.stale_completion_posture.attachment_state,
      completionState: "NOT_READY_STALE_RECONFIRM_REQUIRED",
      nextActionCode:
        session.request_binding_state === "SUPERSEDED"
          ? "UPLOAD_REPLACEMENT"
          : policy.stale_completion_posture.next_action_code,
      readyForCurrentRequest: false,
      recoveryPosture: "STALE_REVIEW_REQUIRED",
      reasonCodes,
    } satisfies UploadCompletionBoundaryDecision;
  }

  if (
    session.attachment_confirmed_at === null ||
    session.attached_document_ref === null ||
    session.attachment_state !== "ATTACHED"
  ) {
    reasonCodes.push("ATTACHMENT_CONFIRMATION_PENDING");
    return {
      attachmentState: policy.attachment_confirmation_required_posture.attachment_state,
      completionState: "NOT_READY_ATTACHMENT_CONFIRMATION_PENDING",
      nextActionCode: policy.attachment_confirmation_required_posture.next_action_code,
      readyForCurrentRequest: false,
      recoveryPosture: "NONE",
      reasonCodes,
    } satisfies UploadCompletionBoundaryDecision;
  }

  if (session.upload_confidence_score < policy.current_request_min_confidence_score) {
    reasonCodes.push("UPLOAD_CONFIDENCE_TOO_LOW");
    return {
      attachmentState: "CONFIRMATION_REQUIRED",
      completionState: "NOT_READY_ATTACHMENT_CONFIRMATION_PENDING",
      nextActionCode: "CONTACT_SUPPORT",
      readyForCurrentRequest: false,
      recoveryPosture: "SUPPORT_REQUIRED",
      reasonCodes,
    } satisfies UploadCompletionBoundaryDecision;
  }

  reasonCodes.push("CURRENT_REQUEST_SATISFIED");
  return {
    attachmentState: "ATTACHED",
    completionState: "READY_CURRENT_REQUEST_SATISFIED",
    nextActionCode: "NONE",
    readyForCurrentRequest: true,
    recoveryPosture: "NONE",
    reasonCodes,
  } satisfies UploadCompletionBoundaryDecision;
}
