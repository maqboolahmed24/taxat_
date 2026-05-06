import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseUtcInstant, normalizeUtcInstantString } from "../primitives/time.ts";
import { type QueueFamilyRef } from "./order_domain_policy.ts";
import { type ResendLegalityState, type SendRevalidationState } from "./worker_dispatch_envelope.ts";

export type QueueRetryClass =
  | "NO_RETRY"
  | "SAFE_RETRY"
  | "RECONCILE_THEN_RETRY"
  | "REBUILD_THEN_RETRY"
  | "HUMAN_REVIEW_THEN_RETRY";

export type QueueRetryBudgetState =
  | "ACTIVE"
  | "EXHAUSTED"
  | "PRECONDITION_BLOCKED"
  | "NEGATIVE_EXPECTED_GAIN"
  | "BLOCKED_BY_EXTERNAL_LEGALITY"
  | "NO_RETRY";

export type RetryBudgetAnchorMode = "OPENED_AT" | "LAST_FAILED_AT";
export type ExternalMutationGuard = "NOT_APPLICABLE" | "AUTHORITY_SEND_LEGALITY_REQUIRED";

export type RetryBudgetRow = {
  retry_budget_class: string;
  display_name: string;
  queue_family_refs: QueueFamilyRef[];
  retry_class: QueueRetryClass;
  budget_limit: number;
  base_delay_seconds: number;
  backoff_cap_seconds: number;
  phase_window_seconds: number;
  hard_deadline_seconds: number;
  anchor_mode: RetryBudgetAnchorMode;
  required_precondition_refs: string[];
  success_prior: number;
  decay_lambda: number;
  positive_expected_gain_required: boolean;
  external_mutation_guard: ExternalMutationGuard;
  notes: string[];
};

export type RetryBudgetMatrix = {
  contract_version: "QUEUE_RETRY_BUDGET_MATRIX_V1";
  matrix_id: string;
  basis_statement: string;
  retry_budget_rows: RetryBudgetRow[];
  source_lineage: Array<{
    rationale: string;
    source_file: string;
    source_heading_or_logical_block: string;
  }>;
};

export type QueueRetryPolicyBundle = {
  retryBudgetMatrix: RetryBudgetMatrix;
  rowsByClass: Map<string, RetryBudgetRow>;
};

export type QueueRetryScheduleInput = {
  attemptCost: number;
  errorCode: string;
  hardDeadlineAtOrNull?: string | null;
  lastFailedAtOrNull?: string | null;
  now: string;
  openedAt: string;
  preconditionsMet: boolean;
  progressValue: number;
  retryAttemptCount: number;
  retryBudgetClass: string;
  retryIdempotencyScopeRef: string;
  sendLegalityOrNull?: {
    externalTruthAmbiguity: number;
    idempotencyCollision: boolean;
    openSendClaimConflict: boolean;
    resendLegalityState: ResendLegalityState;
    sendRevalidationState: SendRevalidationState;
    unchangedBindingLineage: boolean;
  } | null;
};

export type QueueRetryScheduleDecision = {
  allowed: boolean;
  budgetState: QueueRetryBudgetState;
  delaySecondsOrNull: number | null;
  expectedGain: number;
  nextRetryAtOrNull: string | null;
  phaseOffsetSeconds: number;
  reasonCodes: string[];
  retryBudgetClass: string;
  retryClass: QueueRetryClass;
};

export class QueueRetrySchedulerError extends Error {
  readonly code: "POLICY_VALIDATION_FAILED" | "RETRY_BUDGET_UNKNOWN";

  constructor(code: "POLICY_VALIDATION_FAILED" | "RETRY_BUDGET_UNKNOWN", detail: string) {
    super(`${code}: ${detail}`);
    this.name = "QueueRetrySchedulerError";
    this.code = code;
  }
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..", "..");
const retryBudgetMatrixPath = path.join(repoRoot, "config", "queue", "retry_budget_matrix.json");

let cachedBundle: Promise<QueueRetryPolicyBundle> | null = null;

function assertCondition(condition: unknown, detail: string): asserts condition {
  if (!condition) {
    throw new QueueRetrySchedulerError("POLICY_VALIDATION_FAILED", detail);
  }
}

async function readJson<T>(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function deterministicPhaseOffset(scopeRef: string, errorCode: string, windowSeconds: number) {
  if (windowSeconds <= 0) {
    return 0;
  }
  let hash = 0;
  const literal = `${scopeRef}|${errorCode}`;
  for (const character of literal) {
    hash = (hash * 33 + character.charCodeAt(0)) % 2_147_483_647;
  }
  return hash % windowSeconds;
}

function addSeconds(instant: string, seconds: number) {
  const value = new Date(parseUtcInstant(instant).valueOf() + seconds * 1_000).toISOString();
  return value.endsWith(".000Z") ? value.replace(".000Z", "Z") : value;
}

function earlierInstant(left: string, right: string) {
  return parseUtcInstant(left) <= parseUtcInstant(right) ? left : right;
}

function validateRetryBudgetMatrix(matrix: RetryBudgetMatrix) {
  assertCondition(
    matrix.contract_version === "QUEUE_RETRY_BUDGET_MATRIX_V1",
    "queue retry budget matrix contract version drifted",
  );
  assertCondition(matrix.retry_budget_rows.length >= 5, "expected retry budget rows");
  const seen = new Set<string>();
  for (const row of matrix.retry_budget_rows) {
    assertCondition(!seen.has(row.retry_budget_class), `duplicate retry budget ${row.retry_budget_class}`);
    seen.add(row.retry_budget_class);
    assertCondition(row.budget_limit >= 0, `budget ${row.retry_budget_class} must be non-negative`);
    assertCondition(
      row.phase_window_seconds >= 0,
      `budget ${row.retry_budget_class} phase window must be non-negative`,
    );
  }
}

export async function loadQueueRetryPolicyBundle(options?: { reload?: boolean }) {
  if (!cachedBundle || options?.reload) {
    cachedBundle = (async () => {
      const retryBudgetMatrix = await readJson<RetryBudgetMatrix>(retryBudgetMatrixPath);
      validateRetryBudgetMatrix(retryBudgetMatrix);
      return {
        retryBudgetMatrix,
        rowsByClass: new Map(
          retryBudgetMatrix.retry_budget_rows.map((row) => [row.retry_budget_class, row] as const),
        ),
      } satisfies QueueRetryPolicyBundle;
    })();
  }

  return cachedBundle;
}

export function retryBudgetRow(bundle: QueueRetryPolicyBundle, retryBudgetClass: string) {
  const row = bundle.rowsByClass.get(retryBudgetClass);
  if (!row) {
    throw new QueueRetrySchedulerError(
      "RETRY_BUDGET_UNKNOWN",
      `unknown retry budget class ${retryBudgetClass}`,
    );
  }
  return row;
}

export function scheduleQueueRetry(
  bundle: QueueRetryPolicyBundle,
  input: QueueRetryScheduleInput,
): QueueRetryScheduleDecision {
  const row = retryBudgetRow(bundle, input.retryBudgetClass);
  const reasonCodes: string[] = [];
  if (row.retry_class === "NO_RETRY") {
    return {
      allowed: false,
      budgetState: "NO_RETRY",
      delaySecondsOrNull: null,
      expectedGain: 0,
      nextRetryAtOrNull: null,
      phaseOffsetSeconds: 0,
      reasonCodes: ["RETRY_CLASS_NO_RETRY"],
      retryBudgetClass: row.retry_budget_class,
      retryClass: row.retry_class,
    };
  }

  const nextAttemptCount = input.retryAttemptCount + 1;
  if (nextAttemptCount > row.budget_limit) {
    return {
      allowed: false,
      budgetState: "EXHAUSTED",
      delaySecondsOrNull: null,
      expectedGain: 0,
      nextRetryAtOrNull: null,
      phaseOffsetSeconds: 0,
      reasonCodes: ["RETRY_BUDGET_EXHAUSTED"],
      retryBudgetClass: row.retry_budget_class,
      retryClass: row.retry_class,
    };
  }

  if (!input.preconditionsMet) {
    return {
      allowed: false,
      budgetState: "PRECONDITION_BLOCKED",
      delaySecondsOrNull: null,
      expectedGain: 0,
      nextRetryAtOrNull: null,
      phaseOffsetSeconds: 0,
      reasonCodes: [
        "RETRY_PRECONDITIONS_UNSATISFIED",
        ...row.required_precondition_refs.map((value) => `precondition:${value}`),
      ],
      retryBudgetClass: row.retry_budget_class,
      retryClass: row.retry_class,
    };
  }

  if (row.external_mutation_guard === "AUTHORITY_SEND_LEGALITY_REQUIRED") {
    const legality = input.sendLegalityOrNull;
    if (
      !legality ||
      !legality.unchangedBindingLineage ||
      legality.idempotencyCollision ||
      legality.openSendClaimConflict ||
      legality.externalTruthAmbiguity > 0.15 ||
      legality.sendRevalidationState === "BLOCKED" ||
      !["QUEUED_UNASSESSED", "IDEMPOTENT_RECOVERY_ONLY"].includes(
        legality.resendLegalityState,
      )
    ) {
      if (!legality?.unchangedBindingLineage) {
        reasonCodes.push("BINDING_LINEAGE_DRIFT");
      }
      if (legality?.idempotencyCollision) {
        reasonCodes.push("IDEMPOTENCY_COLLISION");
      }
      if (legality?.openSendClaimConflict) {
        reasonCodes.push("SEND_CLAIM_CONFLICT");
      }
      if ((legality?.externalTruthAmbiguity ?? 0) > 0.15) {
        reasonCodes.push("EXTERNAL_TRUTH_AMBIGUITY_TOO_HIGH");
      }
      if (legality?.sendRevalidationState === "BLOCKED") {
        reasonCodes.push("SEND_TIME_REVALIDATION_BLOCKED");
      }
      if (
        legality &&
        !["QUEUED_UNASSESSED", "IDEMPOTENT_RECOVERY_ONLY"].includes(
          legality.resendLegalityState,
        )
      ) {
        reasonCodes.push("RESEND_LEGALITY_BLOCKS_AUTOMATIC_RETRY");
      }
      return {
        allowed: false,
        budgetState: "BLOCKED_BY_EXTERNAL_LEGALITY",
        delaySecondsOrNull: null,
        expectedGain: 0,
        nextRetryAtOrNull: null,
        phaseOffsetSeconds: 0,
        reasonCodes,
        retryBudgetClass: row.retry_budget_class,
        retryClass: row.retry_class,
      };
    }
  }

  const phaseOffsetSeconds = deterministicPhaseOffset(
    input.retryIdempotencyScopeRef,
    input.errorCode,
    row.phase_window_seconds,
  );
  const delaySeconds = Math.min(
    row.backoff_cap_seconds,
    row.base_delay_seconds * 2 ** input.retryAttemptCount,
  ) + phaseOffsetSeconds;
  const anchor =
    row.anchor_mode === "LAST_FAILED_AT" && input.lastFailedAtOrNull
      ? normalizeUtcInstantString(input.lastFailedAtOrNull)
      : normalizeUtcInstantString(input.openedAt);
  let nextRetryAt = addSeconds(anchor, Math.floor(delaySeconds));
  const hardDeadlineAt = earlierInstant(
    addSeconds(normalizeUtcInstantString(input.openedAt), row.hard_deadline_seconds),
    input.hardDeadlineAtOrNull
      ? normalizeUtcInstantString(input.hardDeadlineAtOrNull)
      : addSeconds(normalizeUtcInstantString(input.openedAt), row.hard_deadline_seconds),
  );
  nextRetryAt = earlierInstant(nextRetryAt, hardDeadlineAt);

  const probability =
    row.success_prior * Math.exp(-row.decay_lambda * input.retryAttemptCount);
  const expectedGain = probability * input.progressValue - input.attemptCost;

  if (row.positive_expected_gain_required && expectedGain <= 0) {
    return {
      allowed: false,
      budgetState: "NEGATIVE_EXPECTED_GAIN",
      delaySecondsOrNull: null,
      expectedGain,
      nextRetryAtOrNull: null,
      phaseOffsetSeconds,
      reasonCodes: ["RETRY_EXPECTED_GAIN_NON_POSITIVE"],
      retryBudgetClass: row.retry_budget_class,
      retryClass: row.retry_class,
    };
  }

  return {
    allowed: true,
    budgetState: "ACTIVE",
    delaySecondsOrNull: Math.floor(delaySeconds),
    expectedGain,
    nextRetryAtOrNull: nextRetryAt,
    phaseOffsetSeconds,
    reasonCodes: [],
    retryBudgetClass: row.retry_budget_class,
    retryClass: row.retry_class,
  };
}
