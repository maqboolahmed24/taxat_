import type { StreamRecoveryContract } from "../../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type { RouteStabilityContract } from "../../../../packages/generated-models/src/generated/typescript/surface-and-experience.ts";
import type {
  LowNoiseExperienceFrameRecord,
  StoredLowNoiseExperienceFrameRecord,
} from "../query/get_latest_low_noise_experience_frame.ts";

export class LowNoiseExperiencePublicationError extends Error {
  readonly code = "LOW_NOISE_EXPERIENCE_PUBLICATION_INVALID";
  readonly reasonCodes: string[];

  constructor(message: string, reasonCodes: string[]) {
    super(message);
    this.name = "LowNoiseExperiencePublicationError";
    this.reasonCodes = reasonCodes;
  }
}

function fail(message: string, reasonCodes: string[]): never {
  throw new LowNoiseExperiencePublicationError(message, reasonCodes);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function recordField(value: unknown, fieldName: string): Record<string, unknown> {
  if (!isRecord(value)) {
    fail(`${fieldName} must be an object`, ["LOW_NOISE_FRAME_SCHEMA_INVALID"]);
  }
  return value;
}

function stringField(record: Record<string, unknown>, fieldName: string) {
  const value = record[fieldName];
  if (typeof value !== "string" || value.length === 0) {
    fail(`${fieldName} must be a non-empty string`, ["LOW_NOISE_FRAME_SCHEMA_INVALID"]);
  }
  return value;
}

function nullableStringField(record: Record<string, unknown>, fieldName: string) {
  const value = record[fieldName];
  if (value === null) {
    return null;
  }
  if (typeof value !== "string" || value.length === 0) {
    fail(`${fieldName} must be a non-empty string or null`, [
      "LOW_NOISE_FRAME_SCHEMA_INVALID",
    ]);
  }
  return value;
}

function nonNegativeIntegerField(record: Record<string, unknown>, fieldName: string) {
  const value = record[fieldName];
  if (!Number.isInteger(value) || (value as number) < 0) {
    fail(`${fieldName} must be a non-negative integer`, [
      "LOW_NOISE_FRAME_SCHEMA_INVALID",
    ]);
  }
  return value as number;
}

function stringArrayField(record: Record<string, unknown>, fieldName: string) {
  const value = record[fieldName];
  if (
    !Array.isArray(value) ||
    value.some((entry) => typeof entry !== "string" || entry.length === 0)
  ) {
    fail(`${fieldName} must be an array of non-empty strings`, [
      "LOW_NOISE_FRAME_SCHEMA_INVALID",
    ]);
  }
  return value as string[];
}

function assertEqual(left: unknown, right: unknown, message: string, reasonCodes: string[]) {
  if (left !== right) {
    fail(message, reasonCodes);
  }
}

function assertRouteStabilityContract(input: {
  expectedDecisionBundleHash: string;
  expectedFrameEpoch: number;
  expectedLastPublishedSequence: number;
  expectedResumeToken: string;
  expectedShellStabilityToken: string;
  stabilityContract: RouteStabilityContract;
}) {
  const contract = input.stabilityContract;
  assertEqual(contract.route_scope_class, "MANIFEST_EXPERIENCE", "route scope drifted", [
    "LOW_NOISE_STABILITY_SCOPE_DRIFT",
  ]);
  assertEqual(contract.resume_capability, "STREAM_RESUMABLE", "resume capability drifted", [
    "LOW_NOISE_STABILITY_RESUME_DRIFT",
  ]);
  assertEqual(
    contract.guard_vector_components.decision_bundle_hash_or_null,
    input.expectedDecisionBundleHash,
    "decision bundle hash drifted from stability contract",
    ["LOW_NOISE_STABILITY_DECISION_HASH_DRIFT"],
  );
  assertEqual(
    contract.guard_vector_components.shell_stability_token_or_null,
    input.expectedShellStabilityToken,
    "shell stability token drifted from stability contract",
    ["LOW_NOISE_STABILITY_SHELL_TOKEN_DRIFT"],
  );
  assertEqual(
    contract.guard_vector_components.frame_epoch_or_null,
    input.expectedFrameEpoch,
    "frame epoch drifted from stability contract",
    ["LOW_NOISE_STABILITY_FRAME_EPOCH_DRIFT"],
  );
  assertEqual(
    contract.last_published_sequence_or_null,
    input.expectedLastPublishedSequence,
    "sequence frontier drifted from stability contract",
    ["LOW_NOISE_STABILITY_SEQUENCE_DRIFT"],
  );
  assertEqual(
    contract.resume_token_or_null,
    input.expectedResumeToken,
    "resume token drifted from stability contract",
    ["LOW_NOISE_STABILITY_RESUME_TOKEN_DRIFT"],
  );
}

function assertStreamRecoveryContract(input: {
  expectedAccessBindingHash?: string;
  expectedFrameEpoch: number;
  expectedLastPublishedSequence: number;
  expectedManifestId: string;
  expectedMaskingContextHash?: string;
  expectedPublicationGeneration: number;
  expectedResumeToken: string;
  expectedSessionBindingHash?: string;
  expectedSessionRef?: string;
  expectedShellRouteKey: string;
  expectedShellStabilityToken: string;
  streamRecoveryContract: StreamRecoveryContract;
}) {
  const contract = input.streamRecoveryContract;
  assertEqual(contract.stream_scope_class, "MANIFEST_EXPERIENCE", "stream scope drifted", [
    "LOW_NOISE_STREAM_SCOPE_DRIFT",
  ]);
  assertEqual(contract.route_key, input.expectedShellRouteKey, "stream route key drifted", [
    "LOW_NOISE_STREAM_ROUTE_DRIFT",
  ]);
  assertEqual(contract.subject_ref, input.expectedManifestId, "stream subject drifted", [
    "LOW_NOISE_STREAM_SUBJECT_DRIFT",
  ]);
  assertEqual(
    contract.shell_stability_token,
    input.expectedShellStabilityToken,
    "stream shell token drifted",
    ["LOW_NOISE_STREAM_SHELL_TOKEN_DRIFT"],
  );
  assertEqual(
    contract.publication_generation,
    input.expectedPublicationGeneration,
    "stream publication generation drifted",
    ["LOW_NOISE_STREAM_GENERATION_DRIFT"],
  );
  assertEqual(contract.frame_epoch, input.expectedFrameEpoch, "stream epoch drifted", [
    "LOW_NOISE_STREAM_FRAME_EPOCH_DRIFT",
  ]);
  assertEqual(
    contract.last_published_sequence,
    input.expectedLastPublishedSequence,
    "stream sequence frontier drifted",
    ["LOW_NOISE_STREAM_SEQUENCE_DRIFT"],
  );
  assertEqual(
    contract.resume_binding_representation,
    "RAW_TOKEN",
    "stream resume binding representation drifted",
    ["LOW_NOISE_STREAM_RESUME_BINDING_DRIFT"],
  );
  assertEqual(
    contract.resume_binding_ref_or_null,
    input.expectedResumeToken,
    "stream resume token binding drifted",
    ["LOW_NOISE_STREAM_RESUME_TOKEN_DRIFT"],
  );
  assertEqual(
    contract.delivery_window_state,
    "LIVE_RESUMABLE",
    "stream delivery window drifted",
    ["LOW_NOISE_STREAM_DELIVERY_WINDOW_DRIFT"],
  );
  assertEqual(
    contract.rebase_reason_code_or_null,
    null,
    "live resumable stream cannot publish a rebase reason",
    ["LOW_NOISE_STREAM_REBASE_REASON_DRIFT"],
  );
  if (
    contract.compaction_floor_sequence_or_null !== null &&
    contract.compaction_floor_sequence_or_null > input.expectedLastPublishedSequence
  ) {
    fail("stream compaction floor moved beyond the published frontier", [
      "LOW_NOISE_STREAM_COMPACTION_DRIFT",
    ]);
  }
  if (input.expectedSessionRef !== undefined) {
    assertEqual(contract.session_ref, input.expectedSessionRef, "stream session drifted", [
      "LOW_NOISE_STREAM_SESSION_DRIFT",
    ]);
  }
  if (input.expectedSessionBindingHash !== undefined) {
    assertEqual(
      contract.session_binding_hash,
      input.expectedSessionBindingHash,
      "stream session binding drifted",
      ["LOW_NOISE_STREAM_SESSION_BINDING_DRIFT"],
    );
  }
  if (input.expectedAccessBindingHash !== undefined) {
    assertEqual(
      contract.access_binding_hash,
      input.expectedAccessBindingHash,
      "stream access binding drifted",
      ["LOW_NOISE_STREAM_ACCESS_BINDING_DRIFT"],
    );
  }
  if (input.expectedMaskingContextHash !== undefined) {
    assertEqual(
      contract.masking_context_hash,
      input.expectedMaskingContextHash,
      "stream masking context drifted",
      ["LOW_NOISE_STREAM_MASKING_DRIFT"],
    );
  }
}

function actionCode(action: unknown) {
  return isRecord(action) && typeof action.action_code === "string" ? action.action_code : null;
}

function actionKind(action: unknown) {
  return isRecord(action) && typeof action.action_kind === "string" ? action.action_kind : null;
}

function actionTargetObject(action: unknown) {
  return isRecord(action) && typeof action.target_object_ref === "string"
    ? action.target_object_ref
    : null;
}

const mutationActionKinds = new Set([
  "AUTHORITY_MUTATION",
  "FILING_MUTATION",
  "APPROVAL_MUTATION",
  "OVERRIDE_MUTATION",
]);

function assertSurfaceMirrors(frame: LowNoiseExperienceFrameRecord) {
  const attentionPolicy = recordField(frame.attention_policy, "attention_policy");
  const contextBar = recordField(frame.context_bar, "context_bar");
  const decisionSummary = recordField(frame.decision_summary, "decision_summary");
  const actionStrip = recordField(frame.action_strip, "action_strip");
  const detailDrawer = recordField(frame.detail_drawer, "detail_drawer");
  const budgetAudit = recordField(frame.low_noise_budget_audit, "low_noise_budget_audit");

  assertEqual(contextBar.source_module_code, "MANIFEST_RIBBON", "context module drifted", [
    "LOW_NOISE_CONTEXT_MODULE_DRIFT",
  ]);
  assertEqual(actionStrip.source_module_code, "WORKFLOW_CHOREOGRAPHER", "action module drifted", [
    "LOW_NOISE_ACTION_MODULE_DRIFT",
  ]);
  assertEqual(contextBar.connection_state, frame.connection_state, "context connection drifted", [
    "LOW_NOISE_CONTEXT_CONNECTION_DRIFT",
  ]);
  assertEqual(contextBar.truth_origin, frame.truth_origin, "context truth origin drifted", [
    "LOW_NOISE_CONTEXT_TRUTH_DRIFT",
  ]);
  assertEqual(
    decisionSummary.attention_state,
    attentionPolicy.attention_state,
    "summary attention drifted",
    ["LOW_NOISE_SUMMARY_ATTENTION_DRIFT"],
  );
  assertEqual(
    decisionSummary.visible_warning_count,
    attentionPolicy.visible_warning_count,
    "warning count drifted",
    ["LOW_NOISE_WARNING_COUNT_DRIFT"],
  );
  assertEqual(
    actionStrip.actionability_state,
    attentionPolicy.actionability_state,
    "actionability drifted",
    ["LOW_NOISE_ACTIONABILITY_DRIFT"],
  );

  const detailEntries = Array.isArray(detailDrawer.entry_points) ? detailDrawer.entry_points : [];
  const drawerEntryCodes = detailEntries.map((entry) =>
    isRecord(entry) ? entry.module_code : undefined,
  );
  const policyEntryCodes = Array.isArray(attentionPolicy.detail_entry_points)
    ? attentionPolicy.detail_entry_points
    : [];
  if (JSON.stringify(drawerEntryCodes) !== JSON.stringify(policyEntryCodes)) {
    fail("drawer entry points drifted from attention policy ordering", [
      "LOW_NOISE_DETAIL_ENTRY_ORDER_DRIFT",
    ]);
  }
  assertEqual(
    actionStrip.suggested_detail_surface_code,
    attentionPolicy.suggested_detail_surface_code,
    "suggested detail surface drifted",
    ["LOW_NOISE_SUGGESTED_DETAIL_DRIFT"],
  );
  assertEqual(
    actionStrip.active_detail_surface_code,
    frame.active_detail_surface_code,
    "action active detail drifted",
    ["LOW_NOISE_ACTIVE_DETAIL_DRIFT"],
  );
  assertEqual(
    detailDrawer.expanded_module_code,
    frame.active_detail_surface_code,
    "drawer expanded module drifted",
    ["LOW_NOISE_ACTIVE_DETAIL_DRIFT"],
  );
  assertEqual(actionStrip.focus_anchor_ref, frame.focus_anchor_ref, "action focus drifted", [
    "LOW_NOISE_FOCUS_DRIFT",
  ]);
  assertEqual(detailDrawer.focus_anchor_ref, frame.focus_anchor_ref, "drawer focus drifted", [
    "LOW_NOISE_FOCUS_DRIFT",
  ]);
  if (
    frame.active_detail_surface_code !== null &&
    !policyEntryCodes.includes(frame.active_detail_surface_code)
  ) {
    fail("active detail module is missing from attention policy entry points", [
      "LOW_NOISE_ACTIVE_DETAIL_NOT_RANKED",
    ]);
  }

  if (attentionPolicy.actionability_state === "ACTION_AVAILABLE") {
    const primaryCode = actionCode(actionStrip.primary_action);
    assertEqual(
      attentionPolicy.primary_action_code,
      primaryCode,
      "primary action drifted",
      ["LOW_NOISE_PRIMARY_ACTION_DRIFT"],
    );
    if (
      mutationActionKinds.has(actionKind(actionStrip.primary_action) ?? "") &&
      actionTargetObject(actionStrip.primary_action) !== frame.object_anchor_ref
    ) {
      fail("mutation-capable primary action targets a different object", [
        "LOW_NOISE_PRIMARY_ACTION_TARGET_DRIFT",
      ]);
    }
  } else {
    assertEqual(
      actionStrip.no_safe_action_reason_code,
      attentionPolicy.no_safe_action_reason_code,
      "no-safe-action reason drifted",
      ["LOW_NOISE_NO_SAFE_ACTION_REASON_DRIFT"],
    );
  }

  if (
    frame.recovery_posture !== "NONE" ||
    ["STALE_REVIEW_REQUIRED", "DEGRADED_READ_ONLY", "RECOVERY_REQUIRED"].includes(
      frame.settlement_state,
    ) ||
    ["STALE", "DEGRADED"].includes(frame.connection_state)
  ) {
    assertEqual(
      actionStrip.actionability_state,
      "NO_SAFE_ACTION",
      "stale, degraded, or recovery frames must fail closed",
      ["LOW_NOISE_RECOVERY_ACTIONABILITY_DRIFT"],
    );
    assertEqual(
      actionStrip.mode_safety_posture,
      "NON_LIVE_MUTATIONS_FORBIDDEN",
      "stale, degraded, or recovery frames must forbid non-live mutations",
      ["LOW_NOISE_RECOVERY_SAFETY_DRIFT"],
    );
  }

  if (Array.isArray(decisionSummary.source_module_codes)) {
    const expectedSummarySources = [
      "DECISION_CONSTELLATION",
      "GATE_LATTICE",
      "TRUST_PRISM",
    ];
    if (
      JSON.stringify(decisionSummary.source_module_codes) !==
      JSON.stringify(expectedSummarySources)
    ) {
      fail("decision summary source modules drifted from canonical order", [
        "LOW_NOISE_SUMMARY_MODULE_DRIFT",
      ]);
    }
  }

  assertEqual(
    budgetAudit.visible_warning_count,
    decisionSummary.visible_warning_count,
    "budget audit warning count drifted",
    ["LOW_NOISE_BUDGET_WARNING_DRIFT"],
  );
  assertEqual(
    budgetAudit.visible_detail_entry_count,
    detailEntries.length,
    "budget audit detail count drifted",
    ["LOW_NOISE_BUDGET_DETAIL_DRIFT"],
  );
  assertEqual(
    budgetAudit.collapsed_reason_count,
    decisionSummary.additional_reason_count,
    "budget audit collapsed reason count drifted",
    ["LOW_NOISE_BUDGET_REASON_DRIFT"],
  );
}

function assertStoredFrameIntegrity(stored: StoredLowNoiseExperienceFrameRecord) {
  const frame = stored.record;
  if (frame.artifact_type !== "LowNoiseExperienceFrame") {
    fail("low-noise frame artifact_type is invalid", ["LOW_NOISE_FRAME_SCHEMA_INVALID"]);
  }
  assertEqual(frame.frame_id, stored.frame_id, "frame id drifted from repository row", [
    "LOW_NOISE_FRAME_ROW_ID_DRIFT",
  ]);
  assertEqual(frame.manifest_id, stored.manifest_id, "manifest id drifted from repository row", [
    "LOW_NOISE_FRAME_MANIFEST_DRIFT",
  ]);
  assertEqual(
    frame.decision_bundle_hash,
    stored.decision_bundle_hash,
    "decision bundle hash drifted from repository row",
    ["LOW_NOISE_FRAME_DECISION_HASH_DRIFT"],
  );
  assertEqual(frame.frame_epoch, stored.frame_epoch, "frame epoch drifted from repository row", [
    "LOW_NOISE_FRAME_EPOCH_DRIFT",
  ]);
  assertEqual(
    frame.last_published_sequence,
    stored.last_published_sequence,
    "sequence frontier drifted from repository row",
    ["LOW_NOISE_FRAME_SEQUENCE_DRIFT"],
  );
  assertEqual(
    frame.shell_stability_token,
    stored.shell_stability_token,
    "shell token drifted from repository row",
    ["LOW_NOISE_FRAME_SHELL_TOKEN_DRIFT"],
  );
}

export function validateLowNoiseExperiencePublication(input: {
  accessBindingHash: string;
  maskingContextHash: string;
  republishedStabilityContract: RouteStabilityContract;
  republishedStreamRecoveryContract: StreamRecoveryContract;
  resumeToken: string;
  sessionBindingHash: string;
  sessionRef: string;
  stored: StoredLowNoiseExperienceFrameRecord;
}) {
  try {
    assertStoredFrameIntegrity(input.stored);
    const sourceFrame = input.stored.record;
    const sourceRecord = recordField(sourceFrame, "LowNoiseExperienceFrame");
    const frameId = stringField(sourceRecord, "frame_id");
    const manifestId = stringField(sourceRecord, "manifest_id");
    const decisionBundleHash = stringField(sourceRecord, "decision_bundle_hash");
    const shellRouteKey = stringField(sourceRecord, "shell_route_key");
    const shellStabilityToken = stringField(sourceRecord, "shell_stability_token");
    const frameEpoch = nonNegativeIntegerField(sourceRecord, "frame_epoch");
    const lastPublishedSequence = nonNegativeIntegerField(
      sourceRecord,
      "last_published_sequence",
    );
    stringField(sourceRecord, "decision_bundle_ref");
    stringField(sourceRecord, "object_anchor_ref");
    stringField(sourceRecord, "rendered_at");
    nullableStringField(sourceRecord, "focus_anchor_ref");
    stringArrayField(sourceRecord, "surface_order");

    assertEqual(sourceRecord.experience_profile, "LOW_NOISE", "experience profile drifted", [
      "LOW_NOISE_FRAME_PROFILE_DRIFT",
    ]);
    assertEqual(sourceRecord.shell_family, "CALM_SHELL", "shell family drifted", [
      "LOW_NOISE_FRAME_SHELL_FAMILY_DRIFT",
    ]);
    assertEqual(shellRouteKey, manifestId, "shell route key must equal manifest id", [
      "LOW_NOISE_FRAME_ROUTE_KEY_DRIFT",
    ]);

    assertRouteStabilityContract({
      expectedDecisionBundleHash: decisionBundleHash,
      expectedFrameEpoch: frameEpoch,
      expectedLastPublishedSequence: lastPublishedSequence,
      expectedResumeToken: sourceFrame.resume_token,
      expectedShellStabilityToken: shellStabilityToken,
      stabilityContract: sourceFrame.stability_contract,
    });
    assertStreamRecoveryContract({
      expectedFrameEpoch: frameEpoch,
      expectedLastPublishedSequence: lastPublishedSequence,
      expectedManifestId: manifestId,
      expectedPublicationGeneration: sourceFrame.stability_contract.publication_generation,
      expectedResumeToken: sourceFrame.resume_token,
      expectedShellRouteKey: shellRouteKey,
      expectedShellStabilityToken: shellStabilityToken,
      streamRecoveryContract: sourceFrame.stream_recovery_contract,
    });

    assertRouteStabilityContract({
      expectedDecisionBundleHash: decisionBundleHash,
      expectedFrameEpoch: frameEpoch,
      expectedLastPublishedSequence: lastPublishedSequence,
      expectedResumeToken: input.resumeToken,
      expectedShellStabilityToken: shellStabilityToken,
      stabilityContract: input.republishedStabilityContract,
    });
    assertStreamRecoveryContract({
      expectedAccessBindingHash: input.accessBindingHash,
      expectedFrameEpoch: frameEpoch,
      expectedLastPublishedSequence: lastPublishedSequence,
      expectedManifestId: manifestId,
      expectedMaskingContextHash: input.maskingContextHash,
      expectedPublicationGeneration: input.republishedStabilityContract.publication_generation,
      expectedResumeToken: input.resumeToken,
      expectedSessionBindingHash: input.sessionBindingHash,
      expectedSessionRef: input.sessionRef,
      expectedShellRouteKey: shellRouteKey,
      expectedShellStabilityToken: shellStabilityToken,
      streamRecoveryContract: input.republishedStreamRecoveryContract,
    });
    assertEqual(
      input.republishedStabilityContract.publication_generation,
      sourceFrame.stability_contract.publication_generation,
      "publication generation changed while republishing transport token",
      ["LOW_NOISE_PUBLICATION_GENERATION_DRIFT"],
    );

    const republishedFrame = {
      ...sourceFrame,
      resume_token: input.resumeToken,
      stability_contract: input.republishedStabilityContract,
      stream_recovery_contract: input.republishedStreamRecoveryContract,
    } satisfies LowNoiseExperienceFrameRecord;
    assertSurfaceMirrors(republishedFrame);
    return {
      frame: republishedFrame,
      frameId,
      frameRef: input.stored.frame_ref,
      publicationGeneration: republishedFrame.stability_contract.publication_generation,
    };
  } catch (error) {
    if (error instanceof LowNoiseExperiencePublicationError) {
      throw error;
    }
    throw new LowNoiseExperiencePublicationError(
      error instanceof Error ? error.message : "low-noise frame publication failed",
      ["LOW_NOISE_FRAME_SCHEMA_INVALID"],
    );
  }
}
