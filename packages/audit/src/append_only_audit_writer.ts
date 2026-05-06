import {
  createAuditChainHash,
  verifyAuditHashChain,
  type AuditEventRecord,
} from "./audit_hash_chain.ts";
import {
  createAuditEventDraft,
  finalizeAuditEventDraft,
  type AuditEventDraftInput,
} from "./audit_event_builder.ts";
import { AuditSignatureBatcher, type AuditSignatureBatchState } from "./audit_signature_batcher.ts";
import { AuditStreamSequencer, type AuditStreamHead } from "./audit_stream_sequencer.ts";
import { loadAuditPolicyBundle, type AuditFamilyRef, type AuditPolicyBundle } from "./audit_visibility_and_retention.ts";

export type StoredAuditEvent = {
  chain_hash: string;
  event: AuditEventRecord;
  event_family_ref: AuditFamilyRef;
  publication_ref: string;
  signature_batch_state: AuditSignatureBatchState | "NOT_APPLICABLE";
  signature_failure_reason_code_or_null: string | null;
};

export type AppendAuditEventInput = AuditEventDraftInput & {
  expectedPrevEventHashOrNull?: string | null;
  publicationRef: string;
  recordedAtOrNull?: string | null;
};

type AppendOnlyAuditWriterErrorInit = {
  code:
    | "AUDIT_CONTINUITY_BROKEN"
    | "AUDIT_DUPLICATE_PUBLICATION_DIVERGENT_PAYLOAD"
    | "AUDIT_EXPECTED_PREV_HASH_MISMATCH"
    | "AUDIT_PUBLICATION_REF_REQUIRED";
  detail: string;
};

export class AppendOnlyAuditWriterError extends Error {
  readonly code: AppendOnlyAuditWriterErrorInit["code"];

  constructor(init: AppendOnlyAuditWriterErrorInit) {
    super(`${init.code}: ${init.detail}`);
    this.name = "AppendOnlyAuditWriterError";
    this.code = init.code;
  }
}

export class AppendOnlyAuditWriter {
  private readonly eventsByStream = new Map<string, StoredAuditEvent[]>();
  private readonly publicationIndexByStream = new Map<string, Map<string, StoredAuditEvent>>();
  readonly policyBundle: AuditPolicyBundle;
  readonly sequencer: AuditStreamSequencer;
  readonly signatureBatcher: AuditSignatureBatcher;

  constructor(
    policyBundle: AuditPolicyBundle,
    sequencer = new AuditStreamSequencer(),
    signatureBatcher = new AuditSignatureBatcher(policyBundle),
  ) {
    this.policyBundle = policyBundle;
    this.sequencer = sequencer;
    this.signatureBatcher = signatureBatcher;
  }

  static async create() {
    return new AppendOnlyAuditWriter(await loadAuditPolicyBundle());
  }

  private publicationIndex(streamRef: string) {
    const existing = this.publicationIndexByStream.get(streamRef);
    if (existing) {
      return existing;
    }
    const created = new Map<string, StoredAuditEvent>();
    this.publicationIndexByStream.set(streamRef, created);
    return created;
  }

  private streamEvents(streamRef: string) {
    const existing = this.eventsByStream.get(streamRef);
    if (existing) {
      return existing;
    }
    const created: StoredAuditEvent[] = [];
    this.eventsByStream.set(streamRef, created);
    return created;
  }

  async append(input: AppendAuditEventInput) {
    if (typeof input.publicationRef !== "string" || input.publicationRef.trim().length === 0) {
      throw new AppendOnlyAuditWriterError({
        code: "AUDIT_PUBLICATION_REF_REQUIRED",
        detail: "append-only audit writes require a non-empty publicationRef",
      });
    }

    const draft = await createAuditEventDraft(input, {
      policyBundle: this.policyBundle,
    });

    return this.sequencer.runExclusive(draft.auditStreamRef, async (head) => {
      if (head.stream_sequence > 0 && head.last_event_hash_or_null === null) {
        throw new AppendOnlyAuditWriterError({
          code: "AUDIT_CONTINUITY_BROKEN",
          detail: `audit stream ${draft.auditStreamRef} has a non-empty head without a previous hash`,
        });
      }

      const publicationIndex = this.publicationIndex(draft.auditStreamRef);
      const existing = publicationIndex.get(input.publicationRef);
      if (existing) {
        if (existing.event.event_payload_hash === draft.eventPayloadHash) {
          return {
            status: "DUPLICATE_IGNORED" as const,
            storedEvent: existing,
          };
        }
        throw new AppendOnlyAuditWriterError({
          code: "AUDIT_DUPLICATE_PUBLICATION_DIVERGENT_PAYLOAD",
          detail: `audit stream ${draft.auditStreamRef} already contains publicationRef ${input.publicationRef} with a different payload`,
        });
      }

      const expectedPrev = input.expectedPrevEventHashOrNull;
      if (
        expectedPrev !== undefined &&
        (expectedPrev ?? null) !== (head.last_event_hash_or_null ?? null)
      ) {
        throw new AppendOnlyAuditWriterError({
          code: "AUDIT_EXPECTED_PREV_HASH_MISMATCH",
          detail: `audit stream ${draft.auditStreamRef} head changed before append commit`,
        });
      }

      const signatureBatch = this.signatureBatcher.reserveBatch({
        auditStreamRef: draft.auditStreamRef,
        familyRef: draft.eventFamilyRef,
        recordedAt: input.recordedAtOrNull ?? draft.eventTime,
      });
      const event = finalizeAuditEventDraft(draft, {
        prevEventHashOrNull: head.last_event_hash_or_null,
        recordedAt: input.recordedAtOrNull ?? draft.eventTime,
        signatureRefOrNull: signatureBatch?.signature_ref ?? null,
        streamSequence: head.stream_sequence + 1,
      });
      const chainHash = createAuditChainHash(event);
      const storedEvent: StoredAuditEvent = {
        chain_hash: chainHash,
        event,
        event_family_ref: draft.eventFamilyRef,
        publication_ref: input.publicationRef,
        signature_batch_state: signatureBatch?.state ?? "NOT_APPLICABLE",
        signature_failure_reason_code_or_null: null,
      };
      this.streamEvents(draft.auditStreamRef).push(storedEvent);
      publicationIndex.set(input.publicationRef, storedEvent);
      this.sequencer.commitHead({
        audit_stream_ref: draft.auditStreamRef,
        continuity_state: "ACTIVE",
        last_audit_event_id_or_null: event.audit_event_id,
        last_event_hash_or_null: chainHash,
        last_recorded_at_or_null: event.recorded_at,
        stream_sequence: event.stream_sequence,
      });

      return {
        status: "APPENDED" as const,
        storedEvent,
      };
    });
  }

  listMergedView() {
    return [...this.eventsByStream.values()]
      .flatMap((stream) => stream)
      .sort((left, right) => {
        if (left.event.recorded_at !== right.event.recorded_at) {
          return left.event.recorded_at.localeCompare(right.event.recorded_at);
        }
        if (left.event.audit_stream_ref !== right.event.audit_stream_ref) {
          return left.event.audit_stream_ref.localeCompare(right.event.audit_stream_ref);
        }
        return left.event.stream_sequence - right.event.stream_sequence;
      });
  }

  listSignatureBatches() {
    return this.signatureBatcher.listBatches();
  }

  markSignatureBatchOutcome(init: {
    failureReasonCodeOrNull?: string | null;
    signatureRef: string;
    state: AuditSignatureBatchState;
  }) {
    const batch = this.signatureBatcher.recordBatchOutcome(init);
    if (!batch) {
      return null;
    }
    for (const events of this.eventsByStream.values()) {
      for (const storedEvent of events) {
        if (storedEvent.event.signature_ref === init.signatureRef) {
          storedEvent.signature_batch_state = init.state;
          storedEvent.signature_failure_reason_code_or_null =
            init.state === "FAILED" ? init.failureReasonCodeOrNull ?? null : null;
        }
      }
    }
    return batch;
  }

  readStream(streamRef: string) {
    return [...(this.eventsByStream.get(streamRef) ?? [])];
  }

  restoreStreamHead(head: AuditStreamHead) {
    this.sequencer.commitHead(head);
  }

  seedHead(head: AuditStreamHead) {
    this.sequencer.seedHead(head);
  }

  verifyStream(streamRef: string) {
    return verifyAuditHashChain(this.readStream(streamRef).map((entry) => entry.event));
  }
}

export async function createAppendOnlyAuditWriter() {
  return AppendOnlyAuditWriter.create();
}
