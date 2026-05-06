import { expect, test } from "@playwright/test";

import {
  applyLegalHold,
  applyRetentionPolicy,
  type RetentionLifecycleApplicationInput,
  type RetentionPolicySource,
} from "../../../backend-retention/src/index.ts";
import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  bindRetentionFollowUpObjects,
  openRetentionOrPrivacyError,
} from "../index.ts";

const basePolicy: RetentionPolicySource = {
  minimum_retention_days: 365,
  policy_ref: "retention-basis://pc0216/default",
  policy_retention_days: 730,
  pseudonymisation_mode: "PSEUDONYMIZE_ALLOWED_AFTER_EXPIRY",
  retention_class: "regulated_record",
};

function retentionInput(
  overrides: Partial<RetentionLifecycleApplicationInput> = {},
): RetentionLifecycleApplicationInput {
  return {
    anchor_timestamp: "2026-05-01T09:00:00Z",
    artifact_ref: "source-record://pc0216/customer-file",
    erasure_decided_at: "2026-05-05T09:00:00Z",
    object_class: "SOURCE_RECORD",
    observed_at: "2026-05-05T09:05:00Z",
    policy: basePolicy,
    tenant_id: "tenant.pc0216",
    ...overrides,
  };
}

test("opens legal-hold retention errors with exact remediation linkage", async () => {
  const active = applyRetentionPolicy(retentionInput());
  const held = applyLegalHold({
    artifact_retention: active.artifact_retention,
    changed_at: "2026-05-05T09:06:00Z",
    hold_ref: "legal-hold://pc0216/open-enquiry",
    next_checkpoint_at: "2026-05-06T09:06:00Z",
    retention_tag: active.retention_tag,
    workflow_item_refs: ["workflow://pc0216/check-legal-hold"],
  });
  const opened = openRetentionOrPrivacyError({
    artifact_retention: held.artifact_retention,
    condition: "BLOCKED_LEGAL_HOLD",
    manifest_id: "manifest.pc0216.legal-hold",
    opened_at: "2026-05-05T09:07:00Z",
    remediation_owner_ref: "operator://pc0216/retention",
    retained_basis_ref: held.retention_tag.retention_basis_ref,
    retention_tag: held.retention_tag,
    root_manifest_id: "manifest.pc0216.root",
    workflow_item_id: "workflow://pc0216/check-legal-hold",
  });
  const followUps = bindRetentionFollowUpObjects({
    artifact_retention: held.artifact_retention,
    due_at: "2026-05-06T09:07:00Z",
    opened_error: opened,
    remediation_owner_ref: "operator://pc0216/retention",
    retention_tag: held.retention_tag,
  });

  expect(opened.error_record.error_family).toBe("RETENTION_ERROR");
  expect(opened.error_record.blocking_class).toBe("BLOCKS_ERASURE");
  expect(opened.error_record.artifact_retention_ref).toBe(
    held.artifact_retention.retention_id,
  );
  expect(opened.error_record.retention_class).toBe("regulated_record");
  expect(opened.error_record.next_action_ref).toBe(
    opened.error_record.remediation_task_ref,
  );
  expect(followUps.remediation_task?.task_type).toBe("CHECK_RETENTION_HOLD");
  expect(followUps.remediation_task?.artifact_retention_ref).toBe(
    held.artifact_retention.retention_id,
  );
  expect(followUps.remediation_task?.workflow_item_id).toBe(
    "workflow://pc0216/check-legal-hold",
  );

  await validateContractSchema("retention_tag", held.retention_tag);
  await validateContractSchema("artifact_retention", held.artifact_retention);
  await validateContractSchema("error_record", opened.error_record);
  await validateContractSchema("remediation_task", followUps.remediation_task);
});

test("binds proof, authority, limitation, compensation, investigation, and accepted-risk refs to the same retention object", async () => {
  const authorityBlocked = applyRetentionPolicy(
    retentionInput({
      authority_ambiguity_ref: "authority-ambiguity://pc0216/reconcile-before-erasure",
      observed_at: "2026-05-05T09:15:00Z",
    }),
  );
  const authorityError = openRetentionOrPrivacyError({
    artifact_retention: authorityBlocked.artifact_retention,
    authority_operation_ref: "authority-operation://pc0216/ambiguous-state",
    condition: "BLOCKED_AUTHORITY_AMBIGUITY",
    manifest_id: "manifest.pc0216.authority-ambiguity",
    opened_at: "2026-05-05T09:16:00Z",
    remediation_owner_ref: "operator://pc0216/reconciliation",
    retained_basis_ref: authorityBlocked.retention_tag.authority_ambiguity_ref,
    retention_tag: authorityBlocked.retention_tag,
    root_manifest_id: "manifest.pc0216.root",
    workflow_item_id: "workflow://pc0216/reconcile-authority-state",
  });
  const authorityFollowUps = bindRetentionFollowUpObjects({
    artifact_retention: authorityBlocked.artifact_retention,
    due_at: "2026-05-06T09:16:00Z",
    investigation_owner_ref: "operator://pc0216/reconciliation",
    opened_error: authorityError,
    retention_tag: authorityBlocked.retention_tag,
  });

  expect(authorityError.error_record.error_family).toBe("PRIVACY_ERROR");
  expect(authorityError.error_record.authority_operation_ref).toBe(
    "authority-operation://pc0216/ambiguous-state",
  );
  expect(authorityFollowUps.failure_investigation?.investigation_class).toBe(
    "RETENTION_PRIVACY_EXCEPTION",
  );
  expect(authorityFollowUps.failure_investigation?.artifact_retention_ref).toBe(
    authorityBlocked.artifact_retention.retention_id,
  );

  const limited = applyRetentionPolicy(
    retentionInput({
      artifact_ref: "proof-bundle://pc0216/limited-survival",
      limitation_behavior: "SURVIVE_WITH_LIMITATION_NOTES",
      limitation_reason_codes: ["RETENTION_LIMITED_DECISIVE_PATH"],
      object_class: "PROOF_BUNDLE",
      observed_at: "2026-05-05T09:20:00Z",
      policy: {
        ...basePolicy,
        policy_ref: "retention-basis://pc0216/limited",
        retention_class: "derived_artifact",
      },
    }),
  );
  const limitedError = openRetentionOrPrivacyError({
    artifact_retention: limited.artifact_retention,
    condition: "RETENTION_LIMITED_SURVIVAL",
    manifest_id: "manifest.pc0216.limited",
    opened_at: "2026-05-05T09:21:00Z",
    remediation_owner_ref: "operator://pc0216/limited",
    retention_tag: limited.retention_tag,
    root_manifest_id: "manifest.pc0216.root",
    workflow_item_id: "workflow://pc0216/preserve-limited-artifact",
  });
  const limitedFollowUps = bindRetentionFollowUpObjects({
    accepted_risk: {
      expires_at: "2026-06-05T09:21:00Z",
      rationale_ref: "rationale://pc0216/preserve-limited-artifact",
    },
    artifact_retention: limited.artifact_retention,
    compensation_owner_ref: "operator://pc0216/limited",
    opened_error: limitedError,
    retention_tag: limited.retention_tag,
  });

  expect(limitedFollowUps.compensation_record?.compensation_mode).toBe(
    "PRESERVE_AND_LIMIT",
  );
  expect(limitedFollowUps.compensation_record?.artifact_retention_ref).toBe(
    limited.artifact_retention.retention_id,
  );
  expect(limitedFollowUps.accepted_risk_approval?.artifact_retention_ref).toBe(
    limited.artifact_retention.retention_id,
  );
  expect(limitedFollowUps.accepted_risk_approval?.policy_basis_ref).toBe(
    limited.retention_tag.retention_basis_ref,
  );

  await validateContractSchema("error_record", authorityError.error_record);
  await validateContractSchema(
    "failure_investigation",
    authorityFollowUps.failure_investigation,
  );
  await validateContractSchema("retention_tag", limited.retention_tag);
  await validateContractSchema("artifact_retention", limited.artifact_retention);
  await validateContractSchema("error_record", limitedError.error_record);
  await validateContractSchema("compensation_record", limitedFollowUps.compensation_record);
  await validateContractSchema(
    "accepted_risk_approval",
    limitedFollowUps.accepted_risk_approval,
  );
});
