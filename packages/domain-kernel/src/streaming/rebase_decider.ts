import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { StreamRecoveryContract } from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import {
  StreamRecoveryError,
  verifyTransportResumeBinding,
} from "./stream_recovery.ts";

export type RebaseTriggerReasonCode = NonNullable<StreamRecoveryContract["rebase_reason_code_or_null"]>;

export type RebaseTriggerRow = {
  trigger_ref: string;
  comparison_family:
    | "EPOCH"
    | "COMPACTION"
    | "ROUTE"
    | "SHELL"
    | "SESSION"
    | "ACCESS"
    | "MASKING"
    | "SCHEMA"
    | "PUBLICATION";
  delivery_window_state: Exclude<StreamRecoveryContract["delivery_window_state"], "SNAPSHOT_ONLY">;
  reason_code: RebaseTriggerReasonCode;
  summary: string;
  notes: string[];
};

export type RebaseTriggerMatrix = {
  contract_version: "STREAM_REBASE_TRIGGER_MATRIX_V1";
  matrix_id: string;
  basis_statement: string;
  trigger_rows: RebaseTriggerRow[];
  source_lineage: Array<{
    rationale: string;
    source_file: string;
    source_heading_or_logical_block: string;
  }>;
};

export type StreamResumeAssessment = {
  allowed: boolean;
  delivery_window_state: StreamRecoveryContract["delivery_window_state"];
  reason_code_or_null: StreamRecoveryContract["rebase_reason_code_or_null"];
  summary: string;
  trigger_ref_or_null: string | null;
};

export type AssessStreamResumeInput = {
  current_contract: StreamRecoveryContract;
  raw_resume_token_or_null: string | null;
  requested_contract: StreamRecoveryContract;
  requested_next_sequence: number;
  schema_compatibility_matches: boolean;
};

type RebaseDecisionErrorInit = {
  code: "POLICY_VALIDATION_FAILED" | "TRIGGER_UNKNOWN";
  detail: string;
};

export class RebaseDecisionError extends Error {
  readonly code: RebaseDecisionErrorInit["code"];

  constructor(init: RebaseDecisionErrorInit) {
    super(`${init.code}: ${init.detail}`);
    this.name = "RebaseDecisionError";
    this.code = init.code;
  }
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..", "..");
const rebaseTriggerMatrixPath = path.join(
  repoRoot,
  "config",
  "streaming",
  "rebase_trigger_matrix.json",
);

let cachedMatrix: Promise<RebaseTriggerMatrix> | null = null;

function assertCondition(condition: unknown, detail: string): asserts condition {
  if (!condition) {
    throw new RebaseDecisionError({
      code: "POLICY_VALIDATION_FAILED",
      detail,
    });
  }
}

async function readJson<T>(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function validateMatrix(matrix: RebaseTriggerMatrix) {
  assertCondition(
    matrix.contract_version === "STREAM_REBASE_TRIGGER_MATRIX_V1",
    "rebase trigger matrix contract version drifted",
  );
  const seenTriggers = new Set<string>();
  for (const row of matrix.trigger_rows) {
    assertCondition(!seenTriggers.has(row.trigger_ref), `duplicate trigger ${row.trigger_ref}`);
    seenTriggers.add(row.trigger_ref);
  }
}

export async function loadRebaseTriggerMatrix(options?: { reload?: boolean }) {
  if (!cachedMatrix || options?.reload) {
    cachedMatrix = (async () => {
      const matrix = await readJson<RebaseTriggerMatrix>(rebaseTriggerMatrixPath);
      validateMatrix(matrix);
      return matrix;
    })();
  }

  return cachedMatrix;
}

function triggerRowByReasonCode(matrix: RebaseTriggerMatrix, reasonCode: RebaseTriggerReasonCode) {
  const row = matrix.trigger_rows.find((entry) => entry.reason_code === reasonCode) ?? null;
  if (!row) {
    throw new RebaseDecisionError({
      code: "TRIGGER_UNKNOWN",
      detail: `missing trigger row for ${reasonCode}`,
    });
  }
  return row;
}

function denialFromReasonCode(
  matrix: RebaseTriggerMatrix,
  reasonCode: RebaseTriggerReasonCode,
  deliveryWindowState: Exclude<StreamRecoveryContract["delivery_window_state"], "SNAPSHOT_ONLY">,
) {
  const row = triggerRowByReasonCode(matrix, reasonCode);
  return {
    allowed: false,
    delivery_window_state: deliveryWindowState,
    reason_code_or_null: reasonCode,
    summary: row.summary,
    trigger_ref_or_null: row.trigger_ref,
  } satisfies StreamResumeAssessment;
}

export async function assessStreamResume(input: AssessStreamResumeInput) {
  const matrix = await loadRebaseTriggerMatrix();

  if (input.current_contract.delivery_window_state !== "LIVE_RESUMABLE") {
    if (input.current_contract.delivery_window_state === "SNAPSHOT_ONLY") {
      return {
        allowed: false,
        delivery_window_state: "SNAPSHOT_ONLY",
        reason_code_or_null: null,
        summary: "Server exposes a snapshot-only window and will not honor transport resume.",
        trigger_ref_or_null: null,
      } satisfies StreamResumeAssessment;
    }

    return denialFromReasonCode(
      matrix,
      input.current_contract.rebase_reason_code_or_null!,
      input.current_contract.delivery_window_state,
    );
  }

  if (
    input.current_contract.stream_scope_class !== input.requested_contract.stream_scope_class ||
    input.current_contract.route_key !== input.requested_contract.route_key ||
    input.current_contract.subject_ref !== input.requested_contract.subject_ref
  ) {
    return denialFromReasonCode(matrix, "ROUTE_CONTEXT_CHANGED", "REBASE_REQUIRED");
  }

  if (input.current_contract.shell_stability_token !== input.requested_contract.shell_stability_token) {
    return denialFromReasonCode(matrix, "SHELL_STABILITY_CHANGED", "REBASE_REQUIRED");
  }

  if (input.current_contract.frame_epoch !== input.requested_contract.frame_epoch) {
    return denialFromReasonCode(matrix, "FRAME_EPOCH_ADVANCED", "REBASE_REQUIRED");
  }

  if (
    input.current_contract.publication_generation !== input.requested_contract.publication_generation
  ) {
    return denialFromReasonCode(matrix, "SCHEMA_INCOMPATIBLE", "ACCESS_REBIND_REQUIRED");
  }

  if (
    input.current_contract.compaction_floor_sequence_or_null !== null &&
    input.requested_next_sequence < input.current_contract.compaction_floor_sequence_or_null
  ) {
    return denialFromReasonCode(matrix, "HISTORY_COMPACTED", "REBASE_REQUIRED");
  }

  if (
    input.current_contract.session_ref !== input.requested_contract.session_ref ||
    input.current_contract.session_binding_hash !== input.requested_contract.session_binding_hash
  ) {
    return denialFromReasonCode(matrix, "SESSION_BINDING_CHANGED", "ACCESS_REBIND_REQUIRED");
  }

  if (input.current_contract.access_binding_hash !== input.requested_contract.access_binding_hash) {
    return denialFromReasonCode(matrix, "ACCESS_BINDING_CHANGED", "ACCESS_REBIND_REQUIRED");
  }

  if (input.current_contract.masking_context_hash !== input.requested_contract.masking_context_hash) {
    return denialFromReasonCode(matrix, "MASKING_POSTURE_CHANGED", "ACCESS_REBIND_REQUIRED");
  }

  if (!input.schema_compatibility_matches) {
    return denialFromReasonCode(matrix, "SCHEMA_INCOMPATIBLE", "ACCESS_REBIND_REQUIRED");
  }

  if (input.raw_resume_token_or_null) {
    try {
      verifyTransportResumeBinding(input.current_contract, input.raw_resume_token_or_null);
    } catch (error) {
      if (error instanceof StreamRecoveryError && error.code === "TRANSPORT_TOKEN_MISMATCH") {
        return denialFromReasonCode(matrix, "SESSION_BINDING_CHANGED", "ACCESS_REBIND_REQUIRED");
      }
      throw error;
    }
  } else {
    return {
      allowed: false,
      delivery_window_state: "ACCESS_REBIND_REQUIRED",
      reason_code_or_null: "SESSION_BINDING_CHANGED",
      summary:
        "Raw transport token alone is insufficient. Exact route, session, scope, and masking continuity must still be proven.",
      trigger_ref_or_null: "TRANSPORT_TOKEN_ABSENT",
    } satisfies StreamResumeAssessment;
  }

  return {
    allowed: true,
    delivery_window_state: "LIVE_RESUMABLE",
    reason_code_or_null: null,
    summary:
      "Resume is lawful because route, shell, epoch, session, access, masking, and token binding still match the authoritative recovery contract.",
    trigger_ref_or_null: null,
  } satisfies StreamResumeAssessment;
}
