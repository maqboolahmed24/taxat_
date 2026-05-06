import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import {
  isStringSubset,
  normalizeScopeSequence,
  requireTrimmedString,
  type CanonicalScopeToken,
} from "../../../backend-access/src/services/principal_context_normalizer.ts";
import type {
  ManifestBranchDecisionContract,
  ManifestLineageTrace,
  ManifestLineageTraceCandidateEvaluation,
} from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";

import type { RunManifestRecord } from "./run_manifest.ts";

export type ManifestBranchAction = ManifestBranchDecisionContract["branch_action"];
export type ManifestBranchReasonCode = ManifestBranchDecisionContract["branch_reason_code"];
export type ManifestRejectionReasonCode =
  ManifestLineageTraceCandidateEvaluation["disqualifier_reason_codes"][number];
export type ManifestMirrorSource = ManifestLineageTrace["mirror_sources"][number];

export const CANONICAL_BRANCH_ACTION_ORDER = [
  "NEW_MANIFEST",
  "RETURN_EXISTING_BUNDLE",
  "REUSE_SEALED_MANIFEST",
  "REPLAY_CHILD",
  "RECOVERY_CHILD",
  "CONTINUATION_CHILD",
  "NEW_REQUEST_CHILD",
] as const satisfies readonly ManifestBranchAction[];

export const MANIFEST_PRODUCING_BRANCH_ACTIONS = [
  "NEW_MANIFEST",
  "REPLAY_CHILD",
  "RECOVERY_CHILD",
  "CONTINUATION_CHILD",
  "NEW_REQUEST_CHILD",
] as const satisfies readonly RunManifestRecord["continuation_basis"][];

export const CANONICAL_REJECTION_REASON_CODE_ORDER = [
  "NO_PRIOR_MANIFEST",
  "REQUEST_IDENTITY_HASH_MISMATCH",
  "ACCESS_BINDING_HASH_MISMATCH",
  "REQUESTED_SCOPE_MISMATCH",
  "EFFECTIVE_SCOPE_MISMATCH",
  "MODE_MISMATCH",
  "RUN_KIND_MISMATCH",
  "REPLAY_CLASS_MISMATCH",
  "NIGHTLY_WINDOW_MISMATCH",
  "PRIOR_MANIFEST_NOT_TERMINAL",
  "PRIOR_MANIFEST_NOT_SEALED",
  "PRIOR_MANIFEST_ALREADY_STARTED",
  "PRIOR_MANIFEST_HASH_MISSING",
  "PARENT_MANIFEST_HASH_MISMATCH",
  "CONFIG_INHERITANCE_MODE_MISMATCH",
  "INPUT_INHERITANCE_MODE_MISMATCH",
  "REPLAY_NOT_REQUESTED",
  "RECOVERY_NOT_REQUIRED",
  "CONTINUATION_NOT_LEGAL",
  "REQUEST_IDENTITY_CONTINUATION_NOT_REQUIRED",
  "RETURNED_BUNDLE_NOT_AVAILABLE",
  "NIGHTLY_PREDECESSOR_CONTEXT_MISSING",
  "NIGHTLY_PREDECESSOR_BATCH_MISSING",
  "NIGHTLY_PREDECESSOR_MANIFEST_MISSING",
  "CHILD_ALLOCATION_NOT_REQUIRED",
] as const satisfies readonly ManifestRejectionReasonCode[];

export const CANONICAL_MIRROR_SOURCE_ORDER = [
  "RUN_MANIFEST_TOP_LEVEL",
  "CONTINUATION_SET",
  "MANIFEST_BRANCH_DECISION",
  "FROZEN_EXECUTION_BINDING",
] as const satisfies readonly ManifestMirrorSource[];

const BRANCH_REASON_BY_ACTION = {
  NEW_MANIFEST: "NO_PRIOR_MANIFEST",
  RETURN_EXISTING_BUNDLE: "TERMINAL_IDEMPOTENT_RETRY",
  REUSE_SEALED_MANIFEST: "PRESTART_SEALED_CONTEXT_REUSE",
  REPLAY_CHILD: "REPLAY_REQUESTED_EXACT",
  RECOVERY_CHILD: "STARTED_ATTEMPT_RECOVERY",
  CONTINUATION_CHILD: "POST_TERMINAL_CONTINUATION_REQUIRED",
  NEW_REQUEST_CHILD: "REQUEST_IDENTITY_CHANGED",
} as const satisfies Record<ManifestBranchAction, ManifestBranchReasonCode>;

export type ManifestBranchDecisionContractErrorCode =
  | "BRANCH_DECISION_FIELD_REQUIRED"
  | "BRANCH_DECISION_LOCAL_ACTION_INVALID"
  | "BRANCH_DECISION_NIGHTLY_POSTURE_MISMATCH"
  | "BRANCH_DECISION_REPLAY_POSTURE_MISMATCH"
  | "BRANCH_DECISION_RETURN_BUNDLE_MISMATCH"
  | "BRANCH_DECISION_SCOPE_WIDENED"
  | "BRANCH_DECISION_SELECTED_BASIS_MISMATCH"
  | "BRANCH_DECISION_SELECTED_MANIFEST_MISMATCH"
  | "BRANCH_DECISION_TYPED_REASON_MISMATCH";

export class ManifestBranchDecisionContractError extends Error {
  readonly code: ManifestBranchDecisionContractErrorCode;

  constructor(code: ManifestBranchDecisionContractErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ManifestBranchDecisionContractError";
    this.code = code;
  }
}

function assertBranchDecision(
  condition: unknown,
  code: ManifestBranchDecisionContractErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new ManifestBranchDecisionContractError(code, detail);
  }
}

function normalizeOptionalString(label: string, value: string | null) {
  return value === null ? null : requireTrimmedString(label, value);
}

function requireSameValue(
  label: string,
  left: unknown,
  right: unknown,
  code: ManifestBranchDecisionContractErrorCode,
) {
  assertBranchDecision(
    JSON.stringify(left) === JSON.stringify(right),
    code,
    `${label} must match the selected manifest-local lineage truth`,
  );
}

export function expectedBranchReasonCodesForAction(input: {
  branch_action: ManifestBranchAction;
  run_kind: ManifestBranchDecisionContract["run_kind"];
}): ManifestBranchReasonCode[] {
  if (input.branch_action === "CONTINUATION_CHILD" && input.run_kind === "NIGHTLY") {
    return ["NIGHTLY_WINDOW_ADVANCED"];
  }
  return [BRANCH_REASON_BY_ACTION[input.branch_action]];
}

export function deriveManifestRequestIdentityHash(input: {
  access_binding_hash: string;
  effective_scope: readonly string[];
  idempotency_key: string;
  mode: ManifestBranchDecisionContract["mode"];
  nightly_window_key_or_null: string | null;
  replay_class_or_null: ManifestBranchDecisionContract["replay_class_or_null"];
  requested_scope: readonly string[];
  run_kind: ManifestBranchDecisionContract["run_kind"];
}) {
  return stableJsonHash({
    identity_profile_version: "MANIFEST_BRANCH_REQUEST_IDENTITY_V1",
    idempotency_key: requireTrimmedString("idempotency_key", input.idempotency_key),
    access_binding_hash: requireTrimmedString(
      "access_binding_hash",
      input.access_binding_hash,
    ),
    requested_scope: normalizeScopeSequence("requested_scope", input.requested_scope),
    effective_scope: normalizeScopeSequence("effective_scope", input.effective_scope),
    mode: input.mode,
    run_kind: input.run_kind,
    replay_class_or_null: input.replay_class_or_null,
    nightly_window_key_or_null: input.nightly_window_key_or_null,
  });
}

export function normalizeManifestBranchDecisionContract(
  decision: ManifestBranchDecisionContract,
): ManifestBranchDecisionContract {
  const requested_scope = normalizeScopeSequence(
    "manifest_branch_decision.requested_scope",
    decision.requested_scope as readonly string[],
  );
  const effective_scope = normalizeScopeSequence(
    "manifest_branch_decision.effective_scope",
    decision.effective_scope as readonly string[],
  );

  assertBranchDecision(
    isStringSubset(effective_scope, requested_scope),
    "BRANCH_DECISION_SCOPE_WIDENED",
    "manifest_branch_decision.effective_scope cannot widen beyond requested_scope",
  );

  const expectedReasons = expectedBranchReasonCodesForAction({
    branch_action: decision.branch_action,
    run_kind: decision.run_kind,
  });
  assertBranchDecision(
    expectedReasons.includes(decision.branch_reason_code),
    "BRANCH_DECISION_TYPED_REASON_MISMATCH",
    `${decision.branch_action} requires one of ${expectedReasons.join(", ")}`,
  );

  assertBranchDecision(
    decision.run_kind === "REPLAY"
      ? decision.replay_class_or_null !== null
      : decision.replay_class_or_null === null,
    "BRANCH_DECISION_REPLAY_POSTURE_MISMATCH",
    "replay_class_or_null must be present only for replay runs",
  );
  assertBranchDecision(
    decision.run_kind === "NIGHTLY"
      ? decision.nightly_window_key_or_null !== null
      : decision.nightly_window_key_or_null === null,
    "BRANCH_DECISION_NIGHTLY_POSTURE_MISMATCH",
    "nightly_window_key_or_null must be present only for nightly runs",
  );
  assertBranchDecision(
    decision.branch_action === "RETURN_EXISTING_BUNDLE"
      ? decision.returned_decision_bundle_hash_or_null !== null
      : decision.returned_decision_bundle_hash_or_null === null,
    "BRANCH_DECISION_RETURN_BUNDLE_MISMATCH",
    "returned_decision_bundle_hash_or_null is legal only for RETURN_EXISTING_BUNDLE",
  );

  return {
    ...structuredClone(decision),
    idempotency_key: requireTrimmedString(
      "manifest_branch_decision.idempotency_key",
      decision.idempotency_key,
    ),
    request_identity_hash: requireTrimmedString(
      "manifest_branch_decision.request_identity_hash",
      decision.request_identity_hash,
    ),
    access_binding_hash: requireTrimmedString(
      "manifest_branch_decision.access_binding_hash",
      decision.access_binding_hash,
    ),
    requested_scope: requested_scope as ManifestBranchDecisionContract["requested_scope"],
    effective_scope: effective_scope as ManifestBranchDecisionContract["effective_scope"],
    nightly_window_key_or_null: normalizeOptionalString(
      "manifest_branch_decision.nightly_window_key_or_null",
      decision.nightly_window_key_or_null,
    ),
    prior_manifest_id_or_null: normalizeOptionalString(
      "manifest_branch_decision.prior_manifest_id_or_null",
      decision.prior_manifest_id_or_null,
    ),
    prior_manifest_hash_at_decision_or_null: normalizeOptionalString(
      "manifest_branch_decision.prior_manifest_hash_at_decision_or_null",
      decision.prior_manifest_hash_at_decision_or_null,
    ),
    selected_manifest_id: requireTrimmedString(
      "manifest_branch_decision.selected_manifest_id",
      decision.selected_manifest_id,
    ),
    root_manifest_id: requireTrimmedString(
      "manifest_branch_decision.root_manifest_id",
      decision.root_manifest_id,
    ),
    parent_manifest_id_or_null: normalizeOptionalString(
      "manifest_branch_decision.parent_manifest_id_or_null",
      decision.parent_manifest_id_or_null,
    ),
    continuation_of_manifest_id_or_null: normalizeOptionalString(
      "manifest_branch_decision.continuation_of_manifest_id_or_null",
      decision.continuation_of_manifest_id_or_null,
    ),
    replay_of_manifest_id_or_null: normalizeOptionalString(
      "manifest_branch_decision.replay_of_manifest_id_or_null",
      decision.replay_of_manifest_id_or_null,
    ),
    supersedes_manifest_id_or_null: normalizeOptionalString(
      "manifest_branch_decision.supersedes_manifest_id_or_null",
      decision.supersedes_manifest_id_or_null,
    ),
    returned_decision_bundle_hash_or_null: normalizeOptionalString(
      "manifest_branch_decision.returned_decision_bundle_hash_or_null",
      decision.returned_decision_bundle_hash_or_null,
    ),
  };
}

export function validateManifestLocalBranchDecisionContract(input: {
  decision: ManifestBranchDecisionContract;
  selected_manifest?: RunManifestRecord;
}) {
  const decision = normalizeManifestBranchDecisionContract(input.decision);
  assertBranchDecision(
    MANIFEST_PRODUCING_BRANCH_ACTIONS.includes(
      decision.branch_action as RunManifestRecord["continuation_basis"],
    ),
    "BRANCH_DECISION_LOCAL_ACTION_INVALID",
    "RunManifest.manifest_branch_decision must persist only manifest-producing branch actions",
  );
  assertBranchDecision(
    decision.branch_action === decision.selected_manifest_continuation_basis,
    "BRANCH_DECISION_SELECTED_BASIS_MISMATCH",
    "manifest-local branch_action must mirror selected_manifest_continuation_basis",
  );
  assertBranchDecision(
    decision.returned_decision_bundle_hash_or_null === null,
    "BRANCH_DECISION_RETURN_BUNDLE_MISMATCH",
    "manifest-local branch decisions cannot carry returned decision bundle hashes",
  );

  if (input.selected_manifest) {
    const manifest = input.selected_manifest;
    requireSameValue(
      "selected_manifest_id",
      decision.selected_manifest_id,
      manifest.manifest_id,
      "BRANCH_DECISION_SELECTED_MANIFEST_MISMATCH",
    );
    requireSameValue(
      "selected_manifest_continuation_basis",
      decision.selected_manifest_continuation_basis,
      manifest.continuation_basis,
      "BRANCH_DECISION_SELECTED_BASIS_MISMATCH",
    );
    requireSameValue(
      "root_manifest_id",
      decision.root_manifest_id,
      manifest.root_manifest_id,
      "BRANCH_DECISION_SELECTED_MANIFEST_MISMATCH",
    );
    requireSameValue(
      "parent_manifest_id_or_null",
      decision.parent_manifest_id_or_null,
      manifest.parent_manifest_id,
      "BRANCH_DECISION_SELECTED_MANIFEST_MISMATCH",
    );
    requireSameValue(
      "continuation_of_manifest_id_or_null",
      decision.continuation_of_manifest_id_or_null,
      manifest.continuation_of_manifest_id,
      "BRANCH_DECISION_SELECTED_MANIFEST_MISMATCH",
    );
    requireSameValue(
      "replay_of_manifest_id_or_null",
      decision.replay_of_manifest_id_or_null,
      manifest.replay_of_manifest_id,
      "BRANCH_DECISION_SELECTED_MANIFEST_MISMATCH",
    );
    requireSameValue(
      "supersedes_manifest_id_or_null",
      decision.supersedes_manifest_id_or_null,
      manifest.supersedes_manifest_id,
      "BRANCH_DECISION_SELECTED_MANIFEST_MISMATCH",
    );
    requireSameValue(
      "selected_manifest_generation",
      decision.selected_manifest_generation,
      manifest.manifest_generation,
      "BRANCH_DECISION_SELECTED_MANIFEST_MISMATCH",
    );
  }

  return decision;
}

export function normalizeCanonicalRejectionReasonCodes(
  reasonCodes: readonly ManifestRejectionReasonCode[],
) {
  const seen = new Set<ManifestRejectionReasonCode>();
  const normalized: ManifestRejectionReasonCode[] = [];
  for (const reasonCode of CANONICAL_REJECTION_REASON_CODE_ORDER) {
    if (reasonCodes.includes(reasonCode) && !seen.has(reasonCode)) {
      seen.add(reasonCode);
      normalized.push(reasonCode);
    }
  }
  return normalized;
}

export function normalizeScopeForBranchContracts(
  label: string,
  values: readonly string[],
): CanonicalScopeToken[] {
  return normalizeScopeSequence(label, values);
}
