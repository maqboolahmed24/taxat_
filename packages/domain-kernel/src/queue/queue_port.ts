import { asTaxatRef, type TaxatRef } from "../primitives/identifier.ts";
import { stableJsonHash } from "../primitives/hash.ts";
import { normalizeUtcInstantString, parseUtcInstant } from "../primitives/time.ts";
import {
  createDispatchClaim,
  dispatchClaimFence,
  extendDispatchClaim,
  isDispatchClaimActive,
  releaseDispatchClaim,
  type DispatchClaim,
  type DispatchClaimFence,
} from "./dispatch_claim.ts";
import {
  classifyDeadLetterResolution,
  type DeadLetterClassification,
  type DeadLetterClassificationInput,
  type DeadLetterResolutionClass,
  type DeadLetterPolicyBundle,
} from "./dead_letter_classifier.ts";
import {
  loadQueuePolicyBundle,
  queueCatalogRow,
  type QueueFamilyRef,
  type QueuePolicyBundle,
} from "./order_domain_policy.ts";
import {
  loadQueueRetryPolicyBundle,
  scheduleQueueRetry,
  type QueueRetryPolicyBundle,
  type QueueRetryScheduleDecision,
} from "./retry_scheduler.ts";
import {
  assessAuthorityDispatchLegality,
  type WorkerDispatchEnvelope,
} from "./worker_dispatch_envelope.ts";

export type DispatchQueueRecordState = "VISIBLE" | "CLAIMED" | "ACKNOWLEDGED" | "DEAD_LETTERED";

export type QueueDeliveryEvent = {
  at: string;
  eventRef:
    | "PUBLISHED"
    | "CLAIMED"
    | "VISIBILITY_EXTENDED"
    | "RELEASED_FOR_RETRY"
    | "ACKNOWLEDGED"
    | "DEAD_LETTERED"
    | "REBUILT_FROM_DURABLE_TRUTH";
  reasonCodes: string[];
  workerRefOrNull: string | null;
};

export type QueueDeadLetterRecord = {
  deadLetterQueueRef: string;
  deadLetterRef: TaxatRef<"queue-dead-letter">;
  notes: string[];
  operatorAction: string;
  queuePacketRef: string;
  recordedAt: string;
  reasonCodes: string[];
  resolutionClass: DeadLetterResolutionClass;
  resolutionRef: string;
};

export type DispatchQueueRecord = {
  ackedAtOrNull: string | null;
  claimOrNull: DispatchClaim | null;
  deadLetterOrNull: QueueDeadLetterRecord | null;
  deliveryCount: number;
  envelope: WorkerDispatchEnvelope;
  history: QueueDeliveryEvent[];
  nextVisibleAt: string;
  queueSequence: number;
  state: DispatchQueueRecordState;
};

export type DurableQueueRebuildSource = {
  durableDisposition: "PENDING" | "ACKNOWLEDGED" | "DEAD_LETTERED";
  envelope: WorkerDispatchEnvelope;
  rebuildReasonCodes: string[];
};

export interface QueuePort {
  acknowledge(input: {
    acknowledgedAt: string;
    fence: DispatchClaimFence;
    queuePacketRef: string;
  }): DispatchQueueRecord;
  claimNext(input: {
    at: string;
    leaseDurationSeconds: number;
    queueFamilyRef: QueueFamilyRef;
    workerRef: string;
  }): DispatchQueueRecord | null;
  deadLetter(input: {
    classification: DeadLetterClassification;
    deadLetteredAt: string;
    fence: DispatchClaimFence;
    queuePacketRef: string;
    reasonCodes: string[];
  }): DispatchQueueRecord;
  extendVisibility(input: {
    at: string;
    fence: DispatchClaimFence;
    leaseDurationSeconds: number;
    queuePacketRef: string;
  }): DispatchQueueRecord;
  get(queuePacketRef: string): DispatchQueueRecord;
  list(queueFamilyRef?: QueueFamilyRef): DispatchQueueRecord[];
  publish(input: {
    envelope: WorkerDispatchEnvelope;
    publishedAt?: string;
    rebuildReasonCodes?: string[];
  }): DispatchQueueRecord;
  rebuildFromDurableTruth(input: {
    at: string;
    queueFamilyRef: QueueFamilyRef;
    sources: DurableQueueRebuildSource[];
  }): DispatchQueueRecord[];
  releaseForRetry(input: {
    fence: DispatchClaimFence;
    queuePacketRef: string;
    releasedAt: string;
    schedule: QueueRetryScheduleDecision;
  }): DispatchQueueRecord;
}

export class InMemoryWorkerDispatchQueuePort implements QueuePort {
  readonly #deadLetterBundle: DeadLetterPolicyBundle;
  readonly #queueBundle: QueuePolicyBundle;
  readonly #records = new Map<string, DispatchQueueRecord>();
  readonly #retryBundle: QueueRetryPolicyBundle;
  #queueSequence = 0;

  constructor(init: {
    deadLetterBundle: DeadLetterPolicyBundle;
    queueBundle: QueuePolicyBundle;
    retryBundle: QueueRetryPolicyBundle;
  }) {
    this.#deadLetterBundle = init.deadLetterBundle;
    this.#queueBundle = init.queueBundle;
    this.#retryBundle = init.retryBundle;
  }

  get(queuePacketRef: string) {
    const record = this.#records.get(queuePacketRef);
    if (!record) {
      throw new Error(`Unknown queue packet ${queuePacketRef}`);
    }
    return record;
  }

  list(queueFamilyRef?: QueueFamilyRef) {
    return [...this.#records.values()]
      .filter((record) =>
        queueFamilyRef ? record.envelope.queueFamilyRef === queueFamilyRef : true,
      )
      .sort((left, right) => left.queueSequence - right.queueSequence);
  }

  publish(input: {
    envelope: WorkerDispatchEnvelope;
    publishedAt?: string;
    rebuildReasonCodes?: string[];
  }) {
    const existing = this.#records.get(input.envelope.queuePacketRef);
    if (existing) {
      return existing;
    }

    queueCatalogRow(this.#queueBundle, input.envelope.queueFamilyRef);
    const publishedAt = normalizeUtcInstantString(input.publishedAt ?? input.envelope.publishedAt);
    const record = {
      ackedAtOrNull: null,
      claimOrNull: null,
      deadLetterOrNull: null,
      deliveryCount: 0,
      envelope: input.envelope,
      history: [
        {
          at: publishedAt,
          eventRef: input.rebuildReasonCodes ? "REBUILT_FROM_DURABLE_TRUTH" : "PUBLISHED",
          reasonCodes: [...(input.rebuildReasonCodes ?? [])],
          workerRefOrNull: null,
        },
      ],
      nextVisibleAt: publishedAt,
      queueSequence: ++this.#queueSequence,
      state: "VISIBLE",
    } satisfies DispatchQueueRecord;
    this.#records.set(input.envelope.queuePacketRef, record);
    return record;
  }

  #terminal(record: DispatchQueueRecord) {
    return record.state === "ACKNOWLEDGED" || record.state === "DEAD_LETTERED";
  }

  claimNext(input: {
    at: string;
    leaseDurationSeconds: number;
    queueFamilyRef: QueueFamilyRef;
    workerRef: string;
  }) {
    const now = normalizeUtcInstantString(input.at);
    const records = this.list(input.queueFamilyRef);

    for (const record of records) {
      if (this.#terminal(record)) {
        continue;
      }

      const activeClaim =
        record.claimOrNull && isDispatchClaimActive(record.claimOrNull, now)
          ? record.claimOrNull
          : null;
      if (activeClaim) {
        continue;
      }

      if (parseUtcInstant(record.nextVisibleAt) > parseUtcInstant(now)) {
        continue;
      }

      const earlierBlocking = records.some(
        (candidate) =>
          candidate.queueSequence < record.queueSequence &&
          candidate.envelope.orderDomainKey === record.envelope.orderDomainKey &&
          !this.#terminal(candidate),
      );
      if (earlierBlocking) {
        continue;
      }

      const claim = createDispatchClaim({
        at: now,
        leaseDurationSeconds: input.leaseDurationSeconds,
        priorClaimOrNull: record.claimOrNull,
        queuePacketRef: record.envelope.queuePacketRef,
        workerRef: input.workerRef,
      });
      const updated = {
        ...record,
        claimOrNull: claim,
        deliveryCount: record.deliveryCount + 1,
        history: [
          ...record.history,
          {
            at: now,
            eventRef: "CLAIMED",
            reasonCodes: claim.staleReclaimReasonCodes,
            workerRefOrNull: input.workerRef,
          },
        ],
        state: "CLAIMED",
      } satisfies DispatchQueueRecord;
      this.#records.set(record.envelope.queuePacketRef, updated);
      return updated;
    }

    return null;
  }

  extendVisibility(input: {
    at: string;
    fence: DispatchClaimFence;
    leaseDurationSeconds: number;
    queuePacketRef: string;
  }) {
    const record = this.get(input.queuePacketRef);
    if (!record.claimOrNull) {
      throw new Error("Only claimed queue packets can extend visibility.");
    }
    const claim = extendDispatchClaim(record.claimOrNull, input.fence, {
      at: input.at,
      leaseDurationSeconds: input.leaseDurationSeconds,
    });
    const updated = {
      ...record,
      claimOrNull: claim,
      history: [
        ...record.history,
        {
          at: normalizeUtcInstantString(input.at),
          eventRef: "VISIBILITY_EXTENDED",
          reasonCodes: [],
          workerRefOrNull: claim.workerRef,
        },
      ],
    } satisfies DispatchQueueRecord;
    this.#records.set(input.queuePacketRef, updated);
    return updated;
  }

  acknowledge(input: {
    acknowledgedAt: string;
    fence: DispatchClaimFence;
    queuePacketRef: string;
  }) {
    const record = this.get(input.queuePacketRef);
    if (!record.claimOrNull) {
      throw new Error("Queue packet is not claimed.");
    }
    const released = releaseDispatchClaim(record.claimOrNull, input.fence, input.acknowledgedAt);
    const updated = {
      ...record,
      ackedAtOrNull: normalizeUtcInstantString(input.acknowledgedAt),
      claimOrNull: released,
      history: [
        ...record.history,
        {
          at: normalizeUtcInstantString(input.acknowledgedAt),
          eventRef: "ACKNOWLEDGED",
          reasonCodes: [],
          workerRefOrNull: released.workerRef,
        },
      ],
      state: "ACKNOWLEDGED",
    } satisfies DispatchQueueRecord;
    this.#records.set(input.queuePacketRef, updated);
    return updated;
  }

  releaseForRetry(input: {
    fence: DispatchClaimFence;
    queuePacketRef: string;
    releasedAt: string;
    schedule: QueueRetryScheduleDecision;
  }) {
    const record = this.get(input.queuePacketRef);
    if (!record.claimOrNull) {
      throw new Error("Queue packet is not claimed.");
    }
    const releasedClaim = releaseDispatchClaim(record.claimOrNull, input.fence, input.releasedAt);
    const updated = {
      ...record,
      claimOrNull: releasedClaim,
      history: [
        ...record.history,
        {
          at: normalizeUtcInstantString(input.releasedAt),
          eventRef: "RELEASED_FOR_RETRY",
          reasonCodes: input.schedule.reasonCodes,
          workerRefOrNull: releasedClaim.workerRef,
        },
      ],
      nextVisibleAt:
        input.schedule.nextRetryAtOrNull ?? normalizeUtcInstantString(input.releasedAt),
      state: "VISIBLE",
    } satisfies DispatchQueueRecord;
    this.#records.set(input.queuePacketRef, updated);
    return updated;
  }

  deadLetter(input: {
    classification: DeadLetterClassification;
    deadLetteredAt: string;
    fence: DispatchClaimFence;
    queuePacketRef: string;
    reasonCodes: string[];
  }) {
    const record = this.get(input.queuePacketRef);
    if (!record.claimOrNull) {
      throw new Error("Queue packet is not claimed.");
    }
    const releasedClaim = releaseDispatchClaim(
      record.claimOrNull,
      input.fence,
      input.deadLetteredAt,
    );
    const deadLetter = {
      deadLetterQueueRef: input.classification.deadLetterQueueRef,
      deadLetterRef: asTaxatRef(
        `queue-dead-letter.${stableJsonHash({
          queue_packet_ref: input.queuePacketRef,
          resolution_ref: input.classification.resolutionRef,
        })}`,
        "queue-dead-letter",
      ),
      notes: input.classification.notes.slice(),
      operatorAction: input.classification.operatorAction,
      queuePacketRef: input.queuePacketRef,
      recordedAt: normalizeUtcInstantString(input.deadLetteredAt),
      reasonCodes: [...input.reasonCodes],
      resolutionClass: input.classification.resolutionClass,
      resolutionRef: input.classification.resolutionRef,
    } satisfies QueueDeadLetterRecord;
    const updated = {
      ...record,
      claimOrNull: releasedClaim,
      deadLetterOrNull: deadLetter,
      history: [
        ...record.history,
        {
          at: deadLetter.recordedAt,
          eventRef: "DEAD_LETTERED",
          reasonCodes: deadLetter.reasonCodes,
          workerRefOrNull: releasedClaim.workerRef,
        },
      ],
      state: "DEAD_LETTERED",
    } satisfies DispatchQueueRecord;
    this.#records.set(input.queuePacketRef, updated);
    return updated;
  }

  rebuildFromDurableTruth(input: {
    at: string;
    queueFamilyRef: QueueFamilyRef;
    sources: DurableQueueRebuildSource[];
  }) {
    const rebuilt: DispatchQueueRecord[] = [];
    for (const source of input.sources) {
      if (source.envelope.queueFamilyRef !== input.queueFamilyRef) {
        continue;
      }
      if (source.durableDisposition !== "PENDING") {
        continue;
      }
      const legality = assessAuthorityDispatchLegality(source.envelope);
      if (!legality.allowed) {
        continue;
      }
      rebuilt.push(
        this.publish({
          envelope: source.envelope,
          publishedAt: input.at,
          rebuildReasonCodes: [...source.rebuildReasonCodes],
        }),
      );
    }
    return rebuilt;
  }

  classifyDeadLetter(input: DeadLetterClassificationInput) {
    return classifyDeadLetterResolution(this.#deadLetterBundle, input);
  }

  scheduleRetry(input: Parameters<typeof scheduleQueueRetry>[1]) {
    return scheduleQueueRetry(this.#retryBundle, input);
  }
}

export async function createInMemoryWorkerDispatchQueuePort(options?: { reload?: boolean }) {
  const [queueBundle, retryBundle, deadLetterBundle] = await Promise.all([
    loadQueuePolicyBundle({ reload: options?.reload }),
    loadQueueRetryPolicyBundle({ reload: options?.reload }),
    import("./dead_letter_classifier.ts").then((module) =>
      module.loadDeadLetterPolicyBundle({ reload: options?.reload }),
    ),
  ]);

  return new InMemoryWorkerDispatchQueuePort({
    deadLetterBundle,
    queueBundle,
    retryBundle,
  });
}
