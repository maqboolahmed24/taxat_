import { type ArtifactRetention } from "../../../generated-models/src/generated/typescript/provenance-and-evidence.ts";
import { type RetentionTag } from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";
import { stableJsonHash } from "../primitives/hash.ts";
import { normalizeUtcInstantString } from "../primitives/time.ts";

import {
  type GovernedObjectRecord,
  type ObjectLifecyclePolicyBundle,
  type RetentionMetadataHookPolicyRow,
} from "./object_lifecycle.ts";

export type RetentionHookResult = {
  artifactRetention: ArtifactRetention;
  retentionTag: RetentionTag;
  row: RetentionMetadataHookPolicyRow;
};

export type RetentionErasureDecision =
  | {
      artifactRetention: ArtifactRetention;
      outcome: "ERASURE_PENDING";
      retentionTag: RetentionTag;
    }
  | {
      artifactRetention: ArtifactRetention;
      outcome: "LIMITED";
      reasonCodes: string[];
      retentionTag: RetentionTag;
    };

function addHours(timestamp: string, hours: number) {
  return new Date(Date.parse(timestamp) + hours * 3_600_000).toISOString().replace(".000Z", "Z");
}

function selectHookRow(
  bundle: ObjectLifecyclePolicyBundle,
  hookRef: string,
  objectClassRef: string,
) {
  const row = bundle.retentionHooksByRef.get(hookRef) ?? null;
  if (!row || !row.applies_to_object_classes.includes(objectClassRef)) {
    throw new Error(`No retention hook ${hookRef} for ${objectClassRef}`);
  }
  return row;
}

function retentionTagId(record: GovernedObjectRecord, row: RetentionMetadataHookPolicyRow) {
  return `retention.tag.${stableJsonHash({
    hook_ref: row.hook_ref,
    object_ref: record.objectRef,
    storage_ref: record.storageRef,
  }).slice(0, 24)}`;
}

function retentionId(record: GovernedObjectRecord, row: RetentionMetadataHookPolicyRow) {
  return `artifact.retention.${stableJsonHash({
    hook_ref: row.hook_ref,
    object_ref: record.objectRef,
    tenant_id: record.tenantId,
  }).slice(0, 24)}`;
}

export function applyRetentionHook(
  bundle: ObjectLifecyclePolicyBundle,
  record: GovernedObjectRecord,
  input: {
    at: string;
    holdRefOrNull?: string | null;
    hookRef:
      | "STAGE_WRITE"
      | "PUBLISH"
      | "QUARANTINE"
      | "RETAIN_HOLD"
      | "ERASURE_REQUEST"
      | "ERASURE_COMPLETE";
  },
): RetentionHookResult {
  const row = selectHookRow(bundle, input.hookRef, record.objectClassRef);
  const at = normalizeUtcInstantString(input.at);
  const minimumExpiryAt = addHours(at, 24);
  const policyExpiryAt = addHours(at, 24 * 365);
  const effectiveExpiryAt = policyExpiryAt;
  const retentionTag: RetentionTag = {
    artifact_type: "RetentionTag",
    retention_tag_id: record.retentionTagOrNull?.retention_tag_id ?? retentionTagId(record, row),
    retention_class: bundle.objectClassesByRef.get(record.objectClassRef)!.retention_class,
    anchor_event: row.anchor_event,
    anchor_timestamp: at,
    minimum_expiry_at: minimumExpiryAt,
    policy_expiry_at: policyExpiryAt,
    effective_expiry_at: effectiveExpiryAt,
    legal_hold_state: row.artifact_retention_state === "LEGAL_HOLD" ? "ACTIVE" : "NONE",
    legal_hold_ref: input.holdRefOrNull ?? null,
    legal_hold_changed_at: at,
    erasure_eligibility: row.erasure_eligibility,
    erasure_decided_at: at,
    erasure_reason_codes:
      row.artifact_retention_state === "ERASURE_PENDING" ||
      row.artifact_retention_state === "ERASED"
        ? ["ERASURE_REQUEST_ACCEPTED"]
        : [],
    pseudonymisation_mode:
      row.limitation_behavior === "PSEUDONYMISED_SURVIVAL" ? "PSEUDONYMIZE_ALLOWED" : "NONE",
    limitation_behavior: row.limitation_behavior,
    limitation_reason_codes: row.limitation_behavior === "NONE" ? [] : [row.hook_ref],
    retention_basis_ref: `retention.basis.${row.hook_ref.toLowerCase()}`,
    proof_preservation_basis_ref:
      row.erasure_eligibility === "BLOCKED_PROOF_PRESERVATION"
        ? "proof.preservation.quarantine-lineage"
        : null,
    authority_ambiguity_ref: null,
  };

  const artifactRetention: ArtifactRetention = {
    artifact_type: "ArtifactRetention",
    retention_scope_class: "GOVERNED_ARTIFACT",
    retention_id: record.artifactRetentionOrNull?.retention_id ?? retentionId(record, row),
    tenant_id: record.tenantId,
    artifact_ref: record.objectRef,
    retention_tag_ref: retentionTag.retention_tag_id,
    retention_class: retentionTag.retention_class,
    lifecycle_state: row.artifact_retention_state,
    minimum_expiry_at: retentionTag.minimum_expiry_at,
    policy_expiry_at: retentionTag.policy_expiry_at,
    effective_expiry_at: retentionTag.effective_expiry_at,
    state_changed_at: at,
    last_evaluated_at: at,
    hold_ref: input.holdRefOrNull ?? null,
    next_checkpoint_at: addHours(at, row.default_checkpoint_offset_hours),
    workflow_item_refs: [],
    limitation_behavior: row.limitation_behavior === "NONE" ? null : row.limitation_behavior,
    limitation_reason_codes: row.limitation_behavior === "NONE" ? [] : [row.hook_ref],
    erasure_request_ref:
      row.artifact_retention_state === "ERASURE_PENDING" ||
      row.artifact_retention_state === "ERASED"
        ? `erasure.request.${stableJsonHash({ object_ref: record.objectRef }).slice(0, 20)}`
        : null,
    erasure_action_ref:
      row.artifact_retention_state === "ERASED"
        ? `erasure.action.${stableJsonHash({ object_ref: record.objectRef }).slice(0, 20)}`
        : null,
    erasure_proof_ref:
      row.artifact_retention_state === "ERASED"
        ? `erasure.proof.${stableJsonHash({ object_ref: record.objectRef }).slice(0, 20)}`
        : null,
  };

  return {
    artifactRetention,
    retentionTag,
    row,
  };
}

export function requestErasureWithCurrentViewGuard(
  bundle: ObjectLifecyclePolicyBundle,
  record: GovernedObjectRecord,
  input: {
    at: string;
    currentArtifactRefs: string[];
  },
): RetentionErasureDecision {
  if (input.currentArtifactRefs.length > 0) {
    const base = applyRetentionHook(bundle, record, {
      at: input.at,
      hookRef: "PUBLISH",
    });
    return {
      artifactRetention: {
        ...base.artifactRetention,
        lifecycle_state: "LIMITED",
        limitation_behavior: "SURVIVE_WITH_LIMITATION_NOTES",
        limitation_reason_codes: ["CURRENT_ARTIFACT_VIEW_REFERENCE_BLOCKS_ERASURE"],
        last_evaluated_at: normalizeUtcInstantString(input.at),
      },
      outcome: "LIMITED",
      reasonCodes: ["CURRENT_ARTIFACT_VIEW_REFERENCE_BLOCKS_ERASURE"],
      retentionTag: {
        ...base.retentionTag,
        limitation_behavior: "SURVIVE_WITH_LIMITATION_NOTES",
        limitation_reason_codes: ["CURRENT_ARTIFACT_VIEW_REFERENCE_BLOCKS_ERASURE"],
        erasure_eligibility: "BLOCKED_PROOF_PRESERVATION",
      },
    };
  }

  const accepted = applyRetentionHook(bundle, record, {
    at: input.at,
    hookRef: "ERASURE_REQUEST",
  });
  return {
    artifactRetention: accepted.artifactRetention,
    outcome: "ERASURE_PENDING",
    retentionTag: accepted.retentionTag,
  };
}
