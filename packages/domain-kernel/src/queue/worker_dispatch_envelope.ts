import { asTaxatRef, type TaxatRef } from "../primitives/identifier.ts";
import { stableJsonHash, type HashDigest } from "../primitives/hash.ts";
import { normalizeUtcInstantString } from "../primitives/time.ts";
import { type CorrelationContract } from "../messaging/correlation.ts";
import { type EventEnvelope } from "../messaging/event_envelope.ts";
import { type QueueFamilyRef } from "./order_domain_policy.ts";

export type QueueDispatchActionRef =
  | "EXECUTE_STAGE_TASK"
  | "TRANSMIT_AUTHORITY_MUTATION"
  | "RECOVER_AUTHORITY_IDEMPOTENT_ATTEMPT"
  | "FOLLOW_UP_AUTHORITY_READ"
  | "REFRESH_READ_MODEL_PROJECTION"
  | "REBUILD_DELIVERY_FABRIC";

export type DurableDispatchTruthFamilyRef =
  | "OUTBOX_RECORD"
  | "AUTHORITY_INTERACTION_RECORD"
  | "INBOX_RECORD"
  | "MANIFEST_START_CLAIM"
  | "RECOVERY_LEDGER";

export type QueuePayloadPosture = "OPAQUE_REFS_HASHES_POLICY_ONLY";

export type SendRevalidationState = "NOT_PERFORMED" | "CLEAR_TO_SEND" | "BLOCKED";

export type ResendLegalityState =
  | "NOT_APPLICABLE"
  | "QUEUED_UNASSESSED"
  | "IDEMPOTENT_RECOVERY_ONLY"
  | "FOLLOW_UP_READ_ONLY"
  | "BLOCKED_BY_RECONCILIATION"
  | "BLOCKED_BY_ESCALATION"
  | "CLOSED_NO_RESEND";

export type WorkerDispatchEnvelope = {
  authorityInteractionRefOrNull: string | null;
  attemptLineageRefOrNull: string | null;
  correlation: CorrelationContract;
  dispatchActionRef: QueueDispatchActionRef;
  dispatchRef: string;
  durableTruthFamilyRef: DurableDispatchTruthFamilyRef;
  durableTruthRef: string;
  manifestRefOrNull: string | null;
  notes: string[];
  orderDomainKey: HashDigest;
  outboxRecordRef: string;
  payloadHash: HashDigest;
  payloadPosture: QueuePayloadPosture;
  payloadRefOrNull: string | null;
  policyRefs: string[];
  publishedAt: string;
  queueFamilyRef: QueueFamilyRef;
  queuePacketRef: TaxatRef<"queue-packet">;
  requestHash: HashDigest;
  resendLegalityState: ResendLegalityState;
  routingKey: string;
  sendRevalidationReasonCodes: string[];
  sendRevalidationState: SendRevalidationState;
  sourceRecordRef: string;
  sourceRecordVersionHash: string;
};

export type CreateWorkerDispatchEnvelopeInput = {
  authorityInteractionRefOrNull?: string | null;
  attemptLineageRefOrNull?: string | null;
  dispatchActionRef: QueueDispatchActionRef;
  dispatchRef: string;
  durableTruthFamilyRef: DurableDispatchTruthFamilyRef;
  durableTruthRef: string;
  eventEnvelope: EventEnvelope;
  manifestRefOrNull?: string | null;
  notes?: readonly string[];
  outboxRecordRef: string;
  payload: unknown;
  payloadRefOrNull?: string | null;
  policyRefs?: readonly string[];
  publishedAt: string;
  queueFamilyRef: QueueFamilyRef;
  resendLegalityState?: ResendLegalityState;
  routingKey: string;
  sendRevalidationReasonCodes?: readonly string[];
  sendRevalidationState?: SendRevalidationState;
};

type DispatchLegalityAssessment = {
  allowed: boolean;
  postureStatement: string;
  reasonCodes: string[];
};

const FAMILY_ACTIONS = new Map<QueueFamilyRef, Set<QueueDispatchActionRef>>([
  ["STAGE_WORK", new Set(["EXECUTE_STAGE_TASK"])],
  [
    "AUTHORITY_TRANSMIT",
    new Set(["TRANSMIT_AUTHORITY_MUTATION", "RECOVER_AUTHORITY_IDEMPOTENT_ATTEMPT"]),
  ],
  ["RECONCILIATION_FOLLOW_UP", new Set(["FOLLOW_UP_AUTHORITY_READ"])],
  ["PROJECTION_REFRESH", new Set(["REFRESH_READ_MODEL_PROJECTION"])],
  ["RECOVERY_JOB", new Set(["REBUILD_DELIVERY_FABRIC"])],
]);

function deriveQueuePacketRef(input: {
  dispatchActionRef: QueueDispatchActionRef;
  dispatchRef: string;
  queueFamilyRef: QueueFamilyRef;
  requestHash: HashDigest;
  sourceRecordRef: string;
}) {
  return asTaxatRef(
    `queue-packet.${stableJsonHash({
      dispatch_action_ref: input.dispatchActionRef,
      dispatch_ref: input.dispatchRef,
      queue_family_ref: input.queueFamilyRef,
      request_hash: input.requestHash,
      source_record_ref: input.sourceRecordRef,
    })}`,
    "queue-packet",
  );
}

function validateFamilyActionPair(input: {
  dispatchActionRef: QueueDispatchActionRef;
  queueFamilyRef: QueueFamilyRef;
}) {
  const allowed = FAMILY_ACTIONS.get(input.queueFamilyRef);
  if (!allowed?.has(input.dispatchActionRef)) {
    throw new Error(
      `Dispatch action ${input.dispatchActionRef} is not legal for queue family ${input.queueFamilyRef}.`,
    );
  }
}

export function createWorkerDispatchEnvelope(
  input: CreateWorkerDispatchEnvelopeInput,
): WorkerDispatchEnvelope {
  validateFamilyActionPair(input);
  const publishedAt = normalizeUtcInstantString(input.publishedAt);

  return {
    authorityInteractionRefOrNull: input.authorityInteractionRefOrNull ?? null,
    attemptLineageRefOrNull: input.attemptLineageRefOrNull ?? null,
    correlation: input.eventEnvelope.correlation,
    dispatchActionRef: input.dispatchActionRef,
    dispatchRef: input.dispatchRef,
    durableTruthFamilyRef: input.durableTruthFamilyRef,
    durableTruthRef: input.durableTruthRef,
    manifestRefOrNull: input.manifestRefOrNull ?? null,
    notes: [...(input.notes ?? [])],
    orderDomainKey: input.eventEnvelope.orderDomainKey,
    outboxRecordRef: input.outboxRecordRef,
    payloadHash: stableJsonHash(input.payload),
    payloadPosture: "OPAQUE_REFS_HASHES_POLICY_ONLY",
    payloadRefOrNull: input.payloadRefOrNull ?? input.eventEnvelope.payloadRefOrNull,
    policyRefs: [...(input.policyRefs ?? [])],
    publishedAt,
    queueFamilyRef: input.queueFamilyRef,
    queuePacketRef: deriveQueuePacketRef({
      dispatchActionRef: input.dispatchActionRef,
      dispatchRef: input.dispatchRef,
      queueFamilyRef: input.queueFamilyRef,
      requestHash: input.eventEnvelope.identity.requestHash,
      sourceRecordRef: input.eventEnvelope.sourceRecordRef,
    }),
    requestHash: input.eventEnvelope.identity.requestHash,
    resendLegalityState: input.resendLegalityState ?? "NOT_APPLICABLE",
    routingKey: input.routingKey,
    sendRevalidationReasonCodes: [...(input.sendRevalidationReasonCodes ?? [])],
    sendRevalidationState: input.sendRevalidationState ?? "NOT_PERFORMED",
    sourceRecordRef: input.eventEnvelope.sourceRecordRef,
    sourceRecordVersionHash: input.eventEnvelope.sourceRecordVersionHash,
  };
}

export function assessAuthorityDispatchLegality(
  envelope: WorkerDispatchEnvelope,
): DispatchLegalityAssessment {
  if (
    envelope.queueFamilyRef !== "AUTHORITY_TRANSMIT" &&
    envelope.queueFamilyRef !== "RECONCILIATION_FOLLOW_UP"
  ) {
    return {
      allowed: true,
      postureStatement: "No authority resend gating applies to this queue family.",
      reasonCodes: [],
    };
  }

  if (envelope.sendRevalidationState === "BLOCKED") {
    return {
      allowed: false,
      postureStatement:
        "Send-time revalidation blocked the packet, so queue transport may not reissue the external mutation.",
      reasonCodes: [
        "SEND_TIME_REVALIDATION_BLOCKED",
        ...envelope.sendRevalidationReasonCodes,
      ],
    };
  }

  switch (envelope.dispatchActionRef) {
    case "TRANSMIT_AUTHORITY_MUTATION":
      if (envelope.resendLegalityState !== "QUEUED_UNASSESSED") {
        return {
          allowed: false,
          postureStatement:
            "Fresh authority mutation sends require queued-unassessed legality and must fail closed once that posture changes.",
          reasonCodes: ["AUTHORITY_SEND_REQUIRES_QUEUED_UNASSESSED"],
        };
      }
      return {
        allowed: true,
        postureStatement:
          "Queued authority mutation is lawful only until send-time revalidation checks the persisted interaction truth.",
        reasonCodes: [],
      };
    case "RECOVER_AUTHORITY_IDEMPOTENT_ATTEMPT":
      return envelope.resendLegalityState === "IDEMPOTENT_RECOVERY_ONLY"
        ? {
            allowed: true,
            postureStatement:
              "Crash recovery may reuse the exact persisted request lineage without minting a new authority mutation.",
            reasonCodes: [],
          }
        : {
            allowed: false,
            postureStatement:
              "Idempotent authority recovery requires the persisted interaction to remain in idempotent-recovery-only posture.",
            reasonCodes: ["AUTHORITY_RECOVERY_REQUIRES_IDEMPOTENT_RECOVERY_ONLY"],
          };
    case "FOLLOW_UP_AUTHORITY_READ":
      return envelope.resendLegalityState === "FOLLOW_UP_READ_ONLY"
        ? {
            allowed: true,
            postureStatement:
              "Reconciliation follow-up stays read-only and is lawful only while persisted resend legality remains follow-up-read-only.",
            reasonCodes: [],
          }
        : {
            allowed: false,
            postureStatement:
              "Reconciliation follow-up cannot drift into a new mutation send when persisted resend legality no longer permits read-only follow-up.",
            reasonCodes: ["FOLLOW_UP_READ_REQUIRES_FOLLOW_UP_READ_ONLY"],
          };
    default:
      return {
        allowed: true,
        postureStatement: "Non-authority dispatch action is outside authority resend gating.",
        reasonCodes: [],
      };
  }
}

export function dispatchTransportStatement(envelope: WorkerDispatchEnvelope) {
  const familyLabel =
    envelope.queueFamilyRef === "STAGE_WORK"
      ? "stage work"
      : envelope.queueFamilyRef === "AUTHORITY_TRANSMIT"
        ? "authority transmit"
        : envelope.queueFamilyRef === "RECONCILIATION_FOLLOW_UP"
          ? "reconciliation follow up"
          : envelope.queueFamilyRef === "PROJECTION_REFRESH"
            ? "projection refresh"
            : "recovery job";

  return `${familyLabel} queue packet references ${envelope.durableTruthFamilyRef.toLowerCase().replaceAll("_", " ")} and uses resend legality ${envelope.resendLegalityState.toLowerCase().replaceAll("_", " ")}`;
}
