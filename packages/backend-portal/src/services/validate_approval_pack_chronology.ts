import type { ClientApprovalPackLifecycleState } from "../types.ts";
import { ClientApprovalPackProjectionError } from "../types.ts";

export type ValidateApprovalPackChronologyInput = {
  acknowledgedAt: string | null;
  changeDigestAcknowledgedAt: string | null;
  declarationAcknowledgedAt: string | null;
  lifecycleState: ClientApprovalPackLifecycleState;
  requiresStepUp: boolean;
  signedAt: string | null;
  stateChangedAt: string;
  stepUpExpiresAt: string | null;
  stepUpVerifiedAt: string | null;
  viewedAt: string | null;
};

function parseIso(value: string | null, fieldName: string): number | null {
  if (value === null) {
    return null;
  }
  const epoch = Date.parse(value);
  if (Number.isNaN(epoch)) {
    throw new ClientApprovalPackProjectionError(`${fieldName} must be an ISO date-time`, [
      "CLIENT_APPROVAL_PACK_TIMESTAMP_INVALID",
    ]);
  }
  return epoch;
}

function assertAfterOrEqual(input: {
  left: number | null;
  leftName: string;
  reasonCode: string;
  right: number | null;
  rightName: string;
}) {
  if (input.left !== null && input.right !== null && input.left < input.right) {
    throw new ClientApprovalPackProjectionError(
      `${input.leftName} must not be earlier than ${input.rightName}`,
      [input.reasonCode],
    );
  }
}

function assertNull(fieldName: string, value: string | null, reasonCode: string) {
  if (value !== null) {
    throw new ClientApprovalPackProjectionError(`${fieldName} must clear in this lifecycle`, [
      reasonCode,
    ]);
  }
}

function assertPresent(fieldName: string, value: string | null, reasonCode: string) {
  if (value === null) {
    throw new ClientApprovalPackProjectionError(`${fieldName} is required in this lifecycle`, [
      reasonCode,
    ]);
  }
}

export function validateApprovalPackChronology(input: ValidateApprovalPackChronologyInput) {
  if (input.lifecycleState === "DRAFT" || input.lifecycleState === "READY_FOR_CLIENT") {
    assertNull("viewed_at", input.viewedAt, "CLIENT_APPROVAL_PACK_PREVIEW_TIMESTAMP_PRESENT");
    assertNull(
      "change_digest_acknowledged_at",
      input.changeDigestAcknowledgedAt,
      "CLIENT_APPROVAL_PACK_PREVIEW_TIMESTAMP_PRESENT",
    );
    assertNull(
      "declaration_acknowledged_at",
      input.declarationAcknowledgedAt,
      "CLIENT_APPROVAL_PACK_PREVIEW_TIMESTAMP_PRESENT",
    );
    assertNull(
      "acknowledged_at",
      input.acknowledgedAt,
      "CLIENT_APPROVAL_PACK_PREVIEW_TIMESTAMP_PRESENT",
    );
    assertNull(
      "step_up_verified_at",
      input.stepUpVerifiedAt,
      "CLIENT_APPROVAL_PACK_PREVIEW_TIMESTAMP_PRESENT",
    );
    assertNull(
      "step_up_expires_at",
      input.stepUpExpiresAt,
      "CLIENT_APPROVAL_PACK_PREVIEW_TIMESTAMP_PRESENT",
    );
    assertNull("signed_at", input.signedAt, "CLIENT_APPROVAL_PACK_PREVIEW_TIMESTAMP_PRESENT");
  }

  if (input.lifecycleState === "CANCELLED") {
    assertNull("viewed_at", input.viewedAt, "CLIENT_APPROVAL_PACK_CANCELLED_VIEWED_AT_PRESENT");
    assertNull(
      "change_digest_acknowledged_at",
      input.changeDigestAcknowledgedAt,
      "CLIENT_APPROVAL_PACK_CANCELLED_ACK_PRESENT",
    );
    assertNull(
      "declaration_acknowledged_at",
      input.declarationAcknowledgedAt,
      "CLIENT_APPROVAL_PACK_CANCELLED_ACK_PRESENT",
    );
    assertNull(
      "acknowledged_at",
      input.acknowledgedAt,
      "CLIENT_APPROVAL_PACK_CANCELLED_ACK_PRESENT",
    );
    assertNull(
      "step_up_verified_at",
      input.stepUpVerifiedAt,
      "CLIENT_APPROVAL_PACK_CANCELLED_STEP_UP_PRESENT",
    );
    assertNull(
      "step_up_expires_at",
      input.stepUpExpiresAt,
      "CLIENT_APPROVAL_PACK_CANCELLED_STEP_UP_PRESENT",
    );
    assertNull("signed_at", input.signedAt, "CLIENT_APPROVAL_PACK_CANCELLED_SIGNED_AT_PRESENT");
  }

  if (
    ["VIEWED", "ACKNOWLEDGED", "STEP_UP_REQUIRED", "SIGNED", "COUNTERSIGNED"].includes(
      input.lifecycleState,
    )
  ) {
    assertPresent("viewed_at", input.viewedAt, "CLIENT_APPROVAL_PACK_VIEWED_AT_REQUIRED");
  }

  if (input.lifecycleState === "VIEWED") {
    assertNull(
      "change_digest_acknowledged_at",
      input.changeDigestAcknowledgedAt,
      "CLIENT_APPROVAL_PACK_VIEWED_ACK_PRESENT",
    );
    assertNull(
      "declaration_acknowledged_at",
      input.declarationAcknowledgedAt,
      "CLIENT_APPROVAL_PACK_VIEWED_ACK_PRESENT",
    );
    assertNull(
      "acknowledged_at",
      input.acknowledgedAt,
      "CLIENT_APPROVAL_PACK_VIEWED_ACK_PRESENT",
    );
    assertNull("signed_at", input.signedAt, "CLIENT_APPROVAL_PACK_VIEWED_SIGNED_AT_PRESENT");
  }

  if (
    ["ACKNOWLEDGED", "STEP_UP_REQUIRED", "SIGNED", "COUNTERSIGNED"].includes(
      input.lifecycleState,
    )
  ) {
    assertPresent(
      "change_digest_acknowledged_at",
      input.changeDigestAcknowledgedAt,
      "CLIENT_APPROVAL_PACK_DIGEST_ACK_REQUIRED",
    );
    assertPresent(
      "declaration_acknowledged_at",
      input.declarationAcknowledgedAt,
      "CLIENT_APPROVAL_PACK_DECLARATION_ACK_REQUIRED",
    );
    assertPresent(
      "acknowledged_at",
      input.acknowledgedAt,
      "CLIENT_APPROVAL_PACK_ACK_REQUIRED",
    );
  }

  if (input.lifecycleState === "STEP_UP_REQUIRED") {
    assertNull(
      "step_up_verified_at",
      input.stepUpVerifiedAt,
      "CLIENT_APPROVAL_PACK_STEP_UP_REQUIRED_VERIFIED_PRESENT",
    );
    assertNull(
      "step_up_expires_at",
      input.stepUpExpiresAt,
      "CLIENT_APPROVAL_PACK_STEP_UP_REQUIRED_VERIFIED_PRESENT",
    );
    assertNull("signed_at", input.signedAt, "CLIENT_APPROVAL_PACK_STEP_UP_SIGNED_AT_PRESENT");
  }

  if (input.lifecycleState === "SIGNED" || input.lifecycleState === "COUNTERSIGNED") {
    assertPresent("signed_at", input.signedAt, "CLIENT_APPROVAL_PACK_SIGNED_AT_REQUIRED");
    if (input.requiresStepUp) {
      assertPresent(
        "step_up_verified_at",
        input.stepUpVerifiedAt,
        "CLIENT_APPROVAL_PACK_SIGNED_STEP_UP_REQUIRED",
      );
      assertPresent(
        "step_up_expires_at",
        input.stepUpExpiresAt,
        "CLIENT_APPROVAL_PACK_SIGNED_STEP_UP_REQUIRED",
      );
    }
  }

  if (input.lifecycleState === "SUPERSEDED" || input.lifecycleState === "EXPIRED") {
    assertNull("signed_at", input.signedAt, "CLIENT_APPROVAL_PACK_TERMINAL_SIGNED_AT_PRESENT");
  }

  if (!input.requiresStepUp) {
    assertNull(
      "step_up_verified_at",
      input.stepUpVerifiedAt,
      "CLIENT_APPROVAL_PACK_STEP_UP_NOT_REQUIRED_TIMESTAMP_PRESENT",
    );
    assertNull(
      "step_up_expires_at",
      input.stepUpExpiresAt,
      "CLIENT_APPROVAL_PACK_STEP_UP_NOT_REQUIRED_TIMESTAMP_PRESENT",
    );
  }

  const viewedAt = parseIso(input.viewedAt, "viewed_at");
  const digestAt = parseIso(input.changeDigestAcknowledgedAt, "change_digest_acknowledged_at");
  const declarationAt = parseIso(
    input.declarationAcknowledgedAt,
    "declaration_acknowledged_at",
  );
  const acknowledgedAt = parseIso(input.acknowledgedAt, "acknowledged_at");
  const stepUpVerifiedAt = parseIso(input.stepUpVerifiedAt, "step_up_verified_at");
  const stepUpExpiresAt = parseIso(input.stepUpExpiresAt, "step_up_expires_at");
  const signedAt = parseIso(input.signedAt, "signed_at");
  const stateChangedAt = parseIso(input.stateChangedAt, "state_changed_at");

  assertAfterOrEqual({
    left: acknowledgedAt,
    leftName: "acknowledged_at",
    reasonCode: "CLIENT_APPROVAL_PACK_ACK_BEFORE_VIEW",
    right: viewedAt,
    rightName: "viewed_at",
  });
  assertAfterOrEqual({
    left: digestAt,
    leftName: "change_digest_acknowledged_at",
    reasonCode: "CLIENT_APPROVAL_PACK_DIGEST_ACK_BEFORE_VIEW",
    right: viewedAt,
    rightName: "viewed_at",
  });
  assertAfterOrEqual({
    left: declarationAt,
    leftName: "declaration_acknowledged_at",
    reasonCode: "CLIENT_APPROVAL_PACK_DECLARATION_ACK_BEFORE_VIEW",
    right: viewedAt,
    rightName: "viewed_at",
  });
  assertAfterOrEqual({
    left: acknowledgedAt,
    leftName: "acknowledged_at",
    reasonCode: "CLIENT_APPROVAL_PACK_ACK_BEFORE_DIGEST",
    right: digestAt,
    rightName: "change_digest_acknowledged_at",
  });
  assertAfterOrEqual({
    left: acknowledgedAt,
    leftName: "acknowledged_at",
    reasonCode: "CLIENT_APPROVAL_PACK_ACK_BEFORE_DECLARATION",
    right: declarationAt,
    rightName: "declaration_acknowledged_at",
  });
  assertAfterOrEqual({
    left: stepUpVerifiedAt,
    leftName: "step_up_verified_at",
    reasonCode: "CLIENT_APPROVAL_PACK_STEP_UP_BEFORE_ACK",
    right: acknowledgedAt,
    rightName: "acknowledged_at",
  });
  assertAfterOrEqual({
    left: signedAt,
    leftName: "signed_at",
    reasonCode: "CLIENT_APPROVAL_PACK_SIGNED_BEFORE_VIEW",
    right: viewedAt,
    rightName: "viewed_at",
  });
  assertAfterOrEqual({
    left: signedAt,
    leftName: "signed_at",
    reasonCode: "CLIENT_APPROVAL_PACK_SIGNED_BEFORE_ACK",
    right: acknowledgedAt,
    rightName: "acknowledged_at",
  });

  if (stepUpVerifiedAt !== null && stepUpExpiresAt !== null && stepUpExpiresAt <= stepUpVerifiedAt) {
    throw new ClientApprovalPackProjectionError(
      "step_up_expires_at must be later than step_up_verified_at",
      ["CLIENT_APPROVAL_PACK_STEP_UP_EXPIRY_NOT_AFTER_VERIFICATION"],
    );
  }
  if (
    input.requiresStepUp &&
    signedAt !== null &&
    stepUpExpiresAt !== null &&
    signedAt > stepUpExpiresAt
  ) {
    throw new ClientApprovalPackProjectionError(
      "signed_at must not outlive required step-up proof",
      ["CLIENT_APPROVAL_PACK_SIGNED_AFTER_STEP_UP_EXPIRY"],
    );
  }

  const latestMaterialTimestamp = Math.max(
    ...[
      viewedAt,
      digestAt,
      declarationAt,
      acknowledgedAt,
      stepUpVerifiedAt,
      signedAt,
    ].filter((value): value is number => value !== null),
  );
  if (stateChangedAt !== null && Number.isFinite(latestMaterialTimestamp)) {
    assertAfterOrEqual({
      left: stateChangedAt,
      leftName: "state_changed_at",
      reasonCode: "CLIENT_APPROVAL_PACK_STATE_CHANGED_BEFORE_MATERIAL_TIMESTAMP",
      right: latestMaterialTimestamp,
      rightName: "latest material approval-pack timestamp",
    });
  }
}

