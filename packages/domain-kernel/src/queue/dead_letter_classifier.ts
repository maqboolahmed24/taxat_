import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { type QueueFamilyRef } from "./order_domain_policy.ts";
import {
  type QueueRetryBudgetState,
  type QueueRetryClass,
} from "./retry_scheduler.ts";
import {
  type ResendLegalityState,
  type SendRevalidationState,
} from "./worker_dispatch_envelope.ts";

export type DeadLetterResolutionClass =
  | "SAFE_REPLAY_FROM_DURABLE_TRUTH"
  | "RECONCILE_THEN_RETRY"
  | "REBUILD_FROM_DURABLE_TRUTH"
  | "OPERATOR_REVIEW_REQUIRED"
  | "TERMINAL_NO_RETRY";

export type DeadLetterResolutionPolicyRow = {
  resolution_ref: string;
  display_name: string;
  queue_family_refs: QueueFamilyRef[];
  retry_classes: Array<QueueRetryClass | "ANY">;
  budget_states: Array<QueueRetryBudgetState | "ANY">;
  resend_legality_states: Array<ResendLegalityState | "NOT_APPLICABLE" | "ANY">;
  send_revalidation_states: Array<SendRevalidationState | "NOT_APPLICABLE" | "ANY">;
  reason_codes_any: string[];
  resolution_class: DeadLetterResolutionClass;
  operator_action: string;
  dead_letter_queue_ref: string;
  notes: string[];
};

export type DeadLetterResolutionPolicy = {
  contract_version: "DEAD_LETTER_RESOLUTION_POLICY_V1";
  policy_id: string;
  basis_statement: string;
  resolution_rows: DeadLetterResolutionPolicyRow[];
  source_lineage: Array<{
    rationale: string;
    source_file: string;
    source_heading_or_logical_block: string;
  }>;
};

export type DeadLetterPolicyBundle = {
  deadLetterResolutionPolicy: DeadLetterResolutionPolicy;
};

export type DeadLetterClassificationInput = {
  budgetState: QueueRetryBudgetState;
  queueFamilyRef: QueueFamilyRef;
  reasonCodes: string[];
  resendLegalityStateOrNull?: ResendLegalityState | null;
  retryClass: QueueRetryClass;
  sendRevalidationStateOrNull?: SendRevalidationState | null;
};

export type DeadLetterClassification = {
  deadLetterQueueRef: string;
  displayName: string;
  notes: string[];
  operatorAction: string;
  resolutionClass: DeadLetterResolutionClass;
  resolutionRef: string;
};

export class DeadLetterClassifierError extends Error {
  readonly code: "POLICY_VALIDATION_FAILED";

  constructor(detail: string) {
    super(`POLICY_VALIDATION_FAILED: ${detail}`);
    this.name = "DeadLetterClassifierError";
    this.code = "POLICY_VALIDATION_FAILED";
  }
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..", "..");
const deadLetterPolicyPath = path.join(
  repoRoot,
  "config",
  "queue",
  "dead_letter_resolution_policy.json",
);

let cachedBundle: Promise<DeadLetterPolicyBundle> | null = null;

function assertCondition(condition: unknown, detail: string): asserts condition {
  if (!condition) {
    throw new DeadLetterClassifierError(detail);
  }
}

async function readJson<T>(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function validateDeadLetterResolutionPolicy(policy: DeadLetterResolutionPolicy) {
  assertCondition(
    policy.contract_version === "DEAD_LETTER_RESOLUTION_POLICY_V1",
    "dead-letter resolution policy contract version drifted",
  );
  assertCondition(policy.resolution_rows.length >= 5, "expected dead-letter resolution rows");
}

export async function loadDeadLetterPolicyBundle(options?: { reload?: boolean }) {
  if (!cachedBundle || options?.reload) {
    cachedBundle = (async () => {
      const deadLetterResolutionPolicy = await readJson<DeadLetterResolutionPolicy>(
        deadLetterPolicyPath,
      );
      validateDeadLetterResolutionPolicy(deadLetterResolutionPolicy);
      return {
        deadLetterResolutionPolicy,
      } satisfies DeadLetterPolicyBundle;
    })();
  }

  return cachedBundle;
}

export function classifyDeadLetterResolution(
  bundle: DeadLetterPolicyBundle,
  input: DeadLetterClassificationInput,
): DeadLetterClassification {
  const resendState = input.resendLegalityStateOrNull ?? "NOT_APPLICABLE";
  const sendRevalidationState = input.sendRevalidationStateOrNull ?? "NOT_APPLICABLE";

  for (const row of bundle.deadLetterResolutionPolicy.resolution_rows) {
    if (!row.queue_family_refs.includes(input.queueFamilyRef)) {
      continue;
    }
    if (!row.retry_classes.includes("ANY") && !row.retry_classes.includes(input.retryClass)) {
      continue;
    }
    if (!row.budget_states.includes("ANY") && !row.budget_states.includes(input.budgetState)) {
      continue;
    }
    if (
      !row.resend_legality_states.includes("ANY") &&
      !row.resend_legality_states.includes(resendState)
    ) {
      continue;
    }
    if (
      !row.send_revalidation_states.includes("ANY") &&
      !row.send_revalidation_states.includes(sendRevalidationState)
    ) {
      continue;
    }
    if (
      row.reason_codes_any.length > 0 &&
      !row.reason_codes_any.some((reasonCode) => input.reasonCodes.includes(reasonCode))
    ) {
      continue;
    }

    return {
      deadLetterQueueRef: row.dead_letter_queue_ref,
      displayName: row.display_name,
      notes: row.notes.slice(),
      operatorAction: row.operator_action,
      resolutionClass: row.resolution_class,
      resolutionRef: row.resolution_ref,
    };
  }

  return {
    deadLetterQueueRef: `dlq.${input.queueFamilyRef.toLowerCase().replaceAll("_", "-")}`,
    displayName: "Default operator review",
    notes: [
      "No specific dead-letter row matched; fail closed into operator review rather than silently replaying unknown queue posture.",
    ],
    operatorAction: "Review durable truth and republish only from persisted outbox or inbox evidence.",
    resolutionClass: "OPERATOR_REVIEW_REQUIRED",
    resolutionRef: "default.operator-review",
  };
}
