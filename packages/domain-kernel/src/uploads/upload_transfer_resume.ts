import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { UploadSessionRecoveryHarnessScenarioCode } from "../../../generated-models/src/generated/typescript/index.ts";
import type { GovernedUploadSession } from "./upload_session_state.ts";
import type { ResumableOffsetTracker } from "./resumable_offset_tracker.ts";
import { queryResumeOffset } from "./resumable_offset_tracker.ts";
import {
  assessUploadRequestBinding,
  reconcileUploadRequestBindingContract,
} from "./upload_request_binding_reader.ts";

export type UploadResumeScenarioProfile = {
  allowed_surface_classes: Array<GovernedUploadSession["surface_class"]>;
  reason_code: string;
  scenario_code: UploadSessionRecoveryHarnessScenarioCode;
};

export type UploadResumePolicy = {
  allowed_resume_transfer_states: Array<GovernedUploadSession["transfer_state"]>;
  basis_statement: string;
  contract_version: "UPLOAD_RESUME_POLICY_V1";
  duplicate_allocation_reason_code: string;
  policy_id: string;
  scenario_profiles: UploadResumeScenarioProfile[];
  terminal_transfer_states: Array<GovernedUploadSession["transfer_state"]>;
};

export type UploadResumeAssessment = {
  allowed: boolean;
  nextActionCode: GovernedUploadSession["next_action_code"];
  reasonCodeOrNull: string | null;
  recoveryPosture: GovernedUploadSession["recovery_posture"];
  requestBindingState: GovernedUploadSession["request_binding_state"];
  resumeOffset: number;
  resumabilityState: GovernedUploadSession["resumability_state"];
  reusedExistingSession: boolean;
  stableStorageRef: string;
  uploadSessionId: string;
};

type UploadResumeErrorCode = "UPLOAD_RESUME_POLICY_INVALID";

type UploadResumeErrorInit = {
  code: UploadResumeErrorCode;
  detail: string;
};

export class UploadResumeError extends Error {
  readonly code: UploadResumeErrorCode;

  constructor(init: UploadResumeErrorInit) {
    super(`${init.code}: ${init.detail}`);
    this.name = "UploadResumeError";
    this.code = init.code;
  }
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..", "..");
const resumePolicyPath = path.join(repoRoot, "config", "uploads", "upload_resume_policy.json");

let cachedPolicy: Promise<UploadResumePolicy> | null = null;

function assertCondition(condition: unknown, detail: string): asserts condition {
  if (!condition) {
    throw new UploadResumeError({
      code: "UPLOAD_RESUME_POLICY_INVALID",
      detail,
    });
  }
}

async function readJson<T>(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function validatePolicy(policy: UploadResumePolicy) {
  assertCondition(policy.contract_version === "UPLOAD_RESUME_POLICY_V1", "resume policy drifted");
  assertCondition(
    policy.scenario_profiles.length === 7,
    "resume policy must cover the seven deterministic recovery harness scenarios",
  );
}

export async function loadUploadResumePolicy(options?: { reload?: boolean }) {
  if (!cachedPolicy || options?.reload) {
    cachedPolicy = (async () => {
      const policy = await readJson<UploadResumePolicy>(resumePolicyPath);
      validatePolicy(policy);
      return policy;
    })();
  }
  return cachedPolicy;
}

export async function assessUploadResume(input: {
  duplicateAllocationIntent?: boolean;
  liveRequestVersionRef: string;
  now: string;
  session: GovernedUploadSession;
  surfaceClass: GovernedUploadSession["surface_class"];
  tracker: ResumableOffsetTracker;
}) {
  const policy = await loadUploadResumePolicy();
  const reboundContract = reconcileUploadRequestBindingContract({
    contract: input.session.upload_request_binding_contract,
    liveRequestVersionRef: input.liveRequestVersionRef,
    now: input.now,
  });
  const binding = assessUploadRequestBinding(reboundContract);
  const resumeSnapshot = queryResumeOffset(input.tracker);
  const scenario = policy.scenario_profiles.find((entry) =>
    entry.allowed_surface_classes.includes(input.surfaceClass),
  );
  const terminal = policy.terminal_transfer_states.includes(input.session.transfer_state);
  const resumableTransfer = policy.allowed_resume_transfer_states.includes(input.session.transfer_state);

  if (
    input.duplicateAllocationIntent &&
    resumableTransfer &&
    input.session.resumability_state === "RESUMABLE"
  ) {
    return {
      allowed: true,
      nextActionCode: resumeSnapshot.isComplete ? "NONE" : "RESUME_UPLOAD",
      reasonCodeOrNull: policy.duplicate_allocation_reason_code,
      recoveryPosture:
        input.session.request_binding_state === "RECONFIRMATION_REQUIRED"
          ? "RECONFIRM_INLINE"
          : "INLINE_RESUME",
      requestBindingState: reboundContract.request_binding_state,
      resumeOffset: resumeSnapshot.resumeOffset,
      resumabilityState: "RESUMABLE",
      reusedExistingSession: true,
      stableStorageRef: input.session.storage_ref,
      uploadSessionId: input.session.upload_session_id,
    } satisfies UploadResumeAssessment;
  }

  if (resumeSnapshot.isComplete || terminal || input.session.resumability_state === "CLOSED") {
    return {
      allowed: false,
      nextActionCode: binding.nextActionCode,
      reasonCodeOrNull: scenario?.reason_code ?? "TRANSFER_ALREADY_SETTLED",
      recoveryPosture:
        binding.requestBindingState === "RECONFIRMATION_REQUIRED"
          ? "STALE_REVIEW_REQUIRED"
          : "NONE",
      requestBindingState: reboundContract.request_binding_state,
      resumeOffset: resumeSnapshot.resumeOffset,
      resumabilityState: "CLOSED",
      reusedExistingSession: true,
      stableStorageRef: input.session.storage_ref,
      uploadSessionId: input.session.upload_session_id,
    } satisfies UploadResumeAssessment;
  }

  if (binding.requestBindingState === "SUPERSEDED") {
    return {
      allowed: false,
      nextActionCode: "UPLOAD_REPLACEMENT",
      reasonCodeOrNull: "REQUEST_SUPERSEDED",
      recoveryPosture: "STALE_REVIEW_REQUIRED",
      requestBindingState: reboundContract.request_binding_state,
      resumeOffset: resumeSnapshot.resumeOffset,
      resumabilityState: "RESTART_REQUIRED",
      reusedExistingSession: true,
      stableStorageRef: input.session.storage_ref,
      uploadSessionId: input.session.upload_session_id,
    } satisfies UploadResumeAssessment;
  }

  return {
    allowed: true,
    nextActionCode: "RESUME_UPLOAD",
    reasonCodeOrNull: scenario?.reason_code ?? null,
    recoveryPosture:
      binding.requestBindingState === "RECONFIRMATION_REQUIRED"
        ? "RECONFIRM_INLINE"
        : "INLINE_RESUME",
    requestBindingState: reboundContract.request_binding_state,
    resumeOffset: resumeSnapshot.resumeOffset,
    resumabilityState: "RESUMABLE",
    reusedExistingSession: true,
    stableStorageRef: input.session.storage_ref,
    uploadSessionId: input.session.upload_session_id,
  } satisfies UploadResumeAssessment;
}
