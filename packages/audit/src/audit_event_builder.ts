import type {
  ManifestBranchDecisionContract,
  ManifestStartClaimContract,
} from "../../generated-models/src/generated/typescript/manifest-and-release.ts";
import type { TelemetryResourceCorrelationContext } from "../../generated-models/src/generated/typescript/retention-failure-and-observability.ts";
import { normalizeUtcInstantString } from "../../domain-kernel/src/primitives/time.ts";
import { createCorrelationContext } from "../../telemetry/src/correlation_context.ts";

import {
  createAuditExplainabilityContract,
  createAuditRetainedContext,
  loadAuditPolicyBundle,
  resolveAuditFamilyRule,
  type AuditFamilyRef,
  type AuditPayloadAvailabilityState,
  type AuditPolicyBundle,
  type AuditRetainedContext,
} from "./audit_visibility_and_retention.ts";
import {
  createAuditEventId,
  createAuditEventPayloadHash,
  createAuditChainHash,
  type AuditEventRecord,
} from "./audit_hash_chain.ts";
import { deriveAuditStreamRef } from "./audit_stream_sequencer.ts";

type AuditEventBuilderErrorInit = {
  code:
    | "AUDIT_ACTOR_OR_SERVICE_REQUIRED"
    | "AUDIT_BRANCH_DECISION_REQUIRED"
    | "AUDIT_CORRELATION_REQUIRED"
    | "AUDIT_EVENT_REASON_CODES_REQUIRED"
    | "AUDIT_MANIFEST_REQUIRED"
    | "AUDIT_START_CLAIM_REQUIRED"
    | "AUDIT_STRING_REQUIRED";
  detail: string;
};

export class AuditEventBuilderError extends Error {
  readonly code: AuditEventBuilderErrorInit["code"];

  constructor(init: AuditEventBuilderErrorInit) {
    super(`${init.code}: ${init.detail}`);
    this.name = "AuditEventBuilderError";
    this.code = init.code;
  }
}

type AuditCorrelationInput = Partial<TelemetryResourceCorrelationContext> & {
  manifest_branch_decision?: ManifestBranchDecisionContract;
  manifest_start_claim?: ManifestStartClaimContract;
};

export type AuditEventDraftInput = {
  actorRefOrNull?: string | null;
  auditStreamRefOrNull?: string | null;
  clientIdOrNull?: string | null;
  correlationContext?: AuditCorrelationInput;
  eventFamilyRefOrNull?: AuditFamilyRef | null;
  eventTime: string;
  eventType: string;
  limitationReasonCodes?: readonly string[] | null;
  lineageRefs?: readonly string[] | null;
  manifestIdOrNull?: string | null;
  objectRefs?: readonly string[] | null;
  payloadAvailabilityState?: AuditPayloadAvailabilityState;
  payloadExpiryAtOrNull?: string | null;
  reasonCodes?: readonly string[] | null;
  retentionClassOrNull?: string | null;
  serviceRefOrNull?: string | null;
  tenantId: string;
  visibilityClassOrNull?: string | null;
};

export type AuditEventDraft = {
  actorRef: string | null;
  auditStreamRef: string;
  clientId: string | null;
  correlationContext: TelemetryResourceCorrelationContext;
  eventFamilyRef: AuditFamilyRef;
  eventPayloadHash: string;
  eventTime: string;
  eventType: string;
  manifestId: string | null;
  objectRefs: string[];
  reasonCodes: string[];
  retainedContext: AuditRetainedContext;
  retentionClass: string;
  serviceRef: string | null;
  tenantId: string;
  visibilityClass: string;
};

const MANIFEST_SCOPED_EVENT_TYPES = new Set([
  "ManifestAllocated",
  "ManifestFrozen",
  "ManifestSealed",
  "RunStarted",
  "RunStartClaimRejected",
  "ManifestFailed",
  "ManifestBlocked",
  "ManifestCompleted",
  "ManifestSuperseded",
  "SubmissionAttempted",
  "SubmissionReconciled",
  "SubmissionConfirmed",
  "SubmissionRejected",
  "SubmissionUnknown",
  "OutOfBandStateObserved",
  "AmendmentSubmitted",
  "AmendmentConfirmed",
  "BaselineSelected",
  "AmendmentWindowEvaluated",
  "DriftDetected",
  "DriftClassified",
  "DriftRetroactiveImpactAnalyzed",
  "DriftSuperseded",
  "ReplayPreflightValidated",
  "ReplayBasisCorruptionDetected",
  "FrozenPostSealBasisLoaded",
  "HistoricalAuthorityBasisReused",
  "HistoricalLateDataBasisReused",
  "ReplayOutcomeCompared",
  "ReplayAttested",
]);

const NIGHTLY_EVENT_TYPES = new Set([
  "NightlyBatchAllocated",
  "NightlyPortfolioSelected",
  "NightlyClientExecutionDispatched",
  "NightlyClientExecutionDeferred",
  "NightlyClientExecutionSkipped",
  "NightlyClientExecutionEscalated",
  "NightlyBatchShardClaimed",
  "NightlyBatchShardReclaimed",
  "NightlyBatchQuiesced",
  "NightlyBatchCompleted",
  "NightlyBatchAbandoned",
  "OperatorMorningDigestPublished",
]);

const BRANCH_ACTION_EXPECTATIONS = new Map<string, Set<string>>([
  ["ExistingDecisionBundleReturned", new Set(["RETURN_EXISTING_BUNDLE"])],
  ["ManifestContextReused", new Set(["REUSE_SEALED_MANIFEST"])],
  ["ManifestAllocated", new Set(["NEW_MANIFEST"])],
  [
    "ContinuationChildAllocated",
    new Set(["REPLAY_CHILD", "RECOVERY_CHILD", "CONTINUATION_CHILD", "NEW_REQUEST_CHILD"]),
  ],
  [
    "ConfigInheritanceResolved",
    new Set(["NEW_MANIFEST", "REPLAY_CHILD", "RECOVERY_CHILD", "CONTINUATION_CHILD", "NEW_REQUEST_CHILD"]),
  ],
]);

function assertNonEmptyString(fieldName: string, value: string | null | undefined) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AuditEventBuilderError({
      code: "AUDIT_STRING_REQUIRED",
      detail: `${fieldName} must remain a non-empty string`,
    });
  }
  return value.trim();
}

function normalizeOptional(value: string | null | undefined) {
  if (value === undefined || value === null) {
    return null;
  }
  return assertNonEmptyString("audit optional string", value);
}

function normalizeStringArray(values: readonly string[] | null | undefined) {
  return [...new Set((values ?? []).map((entry) => assertNonEmptyString("audit list entry", entry)))];
}

function validateEventSpecificRules(draft: {
  correlationContext: TelemetryResourceCorrelationContext;
  eventType: string;
  manifestId: string | null;
  reasonCodes: string[];
}) {
  const { correlationContext, eventType, manifestId, reasonCodes } = draft;
  if (MANIFEST_SCOPED_EVENT_TYPES.has(eventType) && manifestId === null) {
    throw new AuditEventBuilderError({
      code: "AUDIT_MANIFEST_REQUIRED",
      detail: `${eventType} must retain a non-null manifest_id`,
    });
  }
  if (NIGHTLY_EVENT_TYPES.has(eventType)) {
    if (!correlationContext.nightly_batch_run_ref || !correlationContext.nightly_window_key) {
      throw new AuditEventBuilderError({
        code: "AUDIT_CORRELATION_REQUIRED",
        detail: `${eventType} must retain nightly batch and window correlation`,
      });
    }
  }
  if (eventType === "OutOfBandStateObserved" && !correlationContext.submission_record_id) {
    throw new AuditEventBuilderError({
      code: "AUDIT_CORRELATION_REQUIRED",
      detail: "OutOfBandStateObserved must retain submission_record_id correlation",
    });
  }
  if (eventType === "RemediationOpened" || eventType === "RemediationCompleted") {
    if (!correlationContext.task_id) {
      throw new AuditEventBuilderError({
        code: "AUDIT_CORRELATION_REQUIRED",
        detail: `${eventType} must retain task_id correlation`,
      });
    }
  }
  if (eventType === "CompensationApplied" || eventType === "CompensationVerified") {
    if (!correlationContext.compensation_id) {
      throw new AuditEventBuilderError({
        code: "AUDIT_CORRELATION_REQUIRED",
        detail: `${eventType} must retain compensation_id correlation`,
      });
    }
  }
  if (eventType === "RunStarted" || eventType === "RunStartClaimRejected") {
    const claim = correlationContext.manifest_start_claim;
    if (!claim) {
      throw new AuditEventBuilderError({
        code: "AUDIT_START_CLAIM_REQUIRED",
        detail: `${eventType} must retain manifest_start_claim correlation`,
      });
    }
    if (eventType === "RunStarted" && claim.claim_state !== "ACTIVE_LEASED") {
      throw new AuditEventBuilderError({
        code: "AUDIT_START_CLAIM_REQUIRED",
        detail: "RunStarted must retain an active leased manifest_start_claim posture",
      });
    }
    if (
      eventType === "RunStartClaimRejected" &&
      !["ALREADY_ACTIVE", "STALE_RECLAIM_REQUIRED", "ALREADY_TERMINAL"].includes(
        claim.claim_status_code,
      )
    ) {
      throw new AuditEventBuilderError({
        code: "AUDIT_START_CLAIM_REQUIRED",
        detail: "RunStartClaimRejected must retain a non-claimable manifest_start_claim posture",
      });
    }
    if (eventType === "RunStartClaimRejected" && reasonCodes.length === 0) {
      throw new AuditEventBuilderError({
        code: "AUDIT_EVENT_REASON_CODES_REQUIRED",
        detail: "RunStartClaimRejected must retain typed reason codes",
      });
    }
  }
  if (
    eventType === "ErrorRecorded" ||
    eventType === "ManifestBlocked" ||
    eventType === "ManifestFailed" ||
    eventType === "ReplayBasisCorruptionDetected"
  ) {
    if (reasonCodes.length === 0) {
      throw new AuditEventBuilderError({
        code: "AUDIT_EVENT_REASON_CODES_REQUIRED",
        detail: `${eventType} must retain typed reason codes`,
      });
    }
  }
  if (
    (eventType === "ManifestBlocked" || eventType === "ManifestFailed") &&
    !correlationContext.error_id
  ) {
    throw new AuditEventBuilderError({
      code: "AUDIT_CORRELATION_REQUIRED",
      detail: `${eventType} must retain error_id correlation`,
    });
  }
  const expectedBranchActions = BRANCH_ACTION_EXPECTATIONS.get(eventType);
  if (expectedBranchActions) {
    const branchDecision = correlationContext.manifest_branch_decision;
    if (!branchDecision) {
      throw new AuditEventBuilderError({
        code: "AUDIT_BRANCH_DECISION_REQUIRED",
        detail: `${eventType} must retain manifest_branch_decision correlation`,
      });
    }
    if (!expectedBranchActions.has(branchDecision.branch_action)) {
      throw new AuditEventBuilderError({
        code: "AUDIT_BRANCH_DECISION_REQUIRED",
        detail: `${eventType} must retain a compatible manifest_branch_decision.branch_action`,
      });
    }
    if (
      eventType === "ConfigInheritanceResolved" &&
      ["RETURN_EXISTING_BUNDLE", "REUSE_SEALED_MANIFEST"].includes(branchDecision.branch_action)
    ) {
      throw new AuditEventBuilderError({
        code: "AUDIT_BRANCH_DECISION_REQUIRED",
        detail: "ConfigInheritanceResolved must not emit for bundle-return or same-manifest reuse paths",
      });
    }
  }
}

export async function createAuditEventDraft(
  input: AuditEventDraftInput,
  options?: { policyBundle?: AuditPolicyBundle; reload?: boolean },
): Promise<AuditEventDraft> {
  const policyBundle = options?.policyBundle ?? (await loadAuditPolicyBundle({ reload: options?.reload }));
  const tenantId = assertNonEmptyString("tenantId", input.tenantId);
  const actorRef = normalizeOptional(input.actorRefOrNull);
  const serviceRef = normalizeOptional(input.serviceRefOrNull);
  if (actorRef === null && serviceRef === null) {
    throw new AuditEventBuilderError({
      code: "AUDIT_ACTOR_OR_SERVICE_REQUIRED",
      detail: "audit events must identify either actor_ref or service_ref",
    });
  }

  const normalizedEventTime = normalizeUtcInstantString(input.eventTime);
  const familyRow =
    input.eventFamilyRefOrNull === undefined || input.eventFamilyRefOrNull === null
      ? resolveAuditFamilyRule(policyBundle, input.eventType)
      : policyBundle.familiesByRef.get(input.eventFamilyRefOrNull);
  if (!familyRow) {
    throw new AuditEventBuilderError({
      code: "AUDIT_CORRELATION_REQUIRED",
      detail: `no audit family row found for ${input.eventType}`,
    });
  }

  const explainabilityContract = createAuditExplainabilityContract();
  const normalizedCorrelation = createCorrelationContext({
    ...(input.correlationContext ?? {}),
    client_id:
      input.clientIdOrNull ?? input.correlationContext?.client_id ?? null,
    manifest_id:
      input.manifestIdOrNull ?? input.correlationContext?.manifest_id ?? null,
    tenant_id: tenantId,
  });
  if (input.correlationContext?.manifest_branch_decision) {
    normalizedCorrelation.manifest_branch_decision =
      input.correlationContext.manifest_branch_decision;
  }
  if (input.correlationContext?.manifest_start_claim) {
    normalizedCorrelation.manifest_start_claim = input.correlationContext.manifest_start_claim;
  }

  const manifestId =
    input.manifestIdOrNull ?? normalizedCorrelation.manifest_id ?? null;
  const clientId =
    input.clientIdOrNull ?? normalizedCorrelation.client_id ?? null;
  normalizedCorrelation.manifest_id = manifestId;
  normalizedCorrelation.client_id = clientId;
  normalizedCorrelation.tenant_id = tenantId;

  const reasonCodes = normalizeStringArray(input.reasonCodes);
  const objectRefs = normalizeStringArray(
    input.objectRefs ?? [
      input.manifestIdOrNull ??
        normalizedCorrelation.manifest_id ??
        normalizedCorrelation.workflow_item_id ??
        normalizedCorrelation.authority_operation_id ??
        `audit.subject.${familyRow.family_ref}.${input.eventType}`,
    ],
  );
  validateEventSpecificRules({
    correlationContext: normalizedCorrelation,
    eventType: input.eventType,
    manifestId,
    reasonCodes,
  });

  const payloadAvailabilityState = input.payloadAvailabilityState ?? "FULL";
  const retainedContext = createAuditRetainedContext({
    limitationReasonCodes:
      payloadAvailabilityState === "FULL"
        ? []
        : (input.limitationReasonCodes ?? (reasonCodes.length > 0 ? reasonCodes : ["PAYLOAD_EXPIRED"])),
    lineageRefs:
      payloadAvailabilityState === "FULL"
        ? input.lineageRefs ?? [`audit.lineage.${input.eventType}`]
        : (input.lineageRefs ?? [`audit.lineage.${input.eventType}`]),
    payloadAvailabilityState,
    payloadExpiryAtOrNull:
      payloadAvailabilityState === "FULL"
        ? null
        : (input.payloadExpiryAtOrNull ?? normalizedEventTime),
  });

  const visibilityClass = input.visibilityClassOrNull ?? familyRow.default_visibility_class;
  const retentionClass = input.retentionClassOrNull ?? familyRow.default_retention_class;
  const auditStreamRef =
    input.auditStreamRefOrNull ??
    deriveAuditStreamRef(policyBundle, {
      correlationContext: normalizedCorrelation,
      eventFamilyRef: familyRow.family_ref,
      manifestIdOrNull: manifestId,
      tenantId,
    });

  const eventPayloadHash = createAuditEventPayloadHash({
    actor_ref: actorRef,
    client_id: clientId,
    correlation_context: normalizedCorrelation,
    event_time: normalizedEventTime,
    event_type: input.eventType,
    manifest_id: manifestId,
    object_refs: objectRefs,
    reason_codes: reasonCodes,
    retained_context: retainedContext,
    retention_class: retentionClass,
    retention_limited_explainability_contract: explainabilityContract,
    service_ref: serviceRef,
    tenant_id: tenantId,
    visibility_class: visibilityClass,
  });

  return {
    actorRef,
    auditStreamRef,
    clientId,
    correlationContext: normalizedCorrelation,
    eventFamilyRef: familyRow.family_ref,
    eventPayloadHash,
    eventTime: normalizedEventTime,
    eventType: input.eventType,
    manifestId,
    objectRefs,
    reasonCodes,
    retainedContext,
    retentionClass,
    serviceRef,
    tenantId,
    visibilityClass,
  };
}

export function finalizeAuditEventDraft(
  draft: AuditEventDraft,
  init: {
    prevEventHashOrNull: string | null;
    recordedAt: string;
    signatureRefOrNull: string | null;
    streamSequence: number;
  },
): AuditEventRecord {
  if (init.streamSequence < 1) {
    throw new AuditEventBuilderError({
      code: "AUDIT_STRING_REQUIRED",
      detail: "audit stream sequence must stay one-based",
    });
  }
  if (init.streamSequence === 1 && init.prevEventHashOrNull !== null) {
    throw new AuditEventBuilderError({
      code: "AUDIT_STRING_REQUIRED",
      detail: "the first audit event in a stream must not retain a previous hash",
    });
  }
  if (init.streamSequence > 1 && init.prevEventHashOrNull === null) {
    throw new AuditEventBuilderError({
      code: "AUDIT_STRING_REQUIRED",
      detail: "non-root audit events must retain the previous chain hash",
    });
  }

  const provisionalEvent: AuditEventRecord = {
    actor_ref: draft.actorRef,
    audit_event_id: "audit.pending",
    audit_stream_ref: draft.auditStreamRef,
    client_id: draft.clientId,
    correlation_context: draft.correlationContext,
    event_payload_hash: draft.eventPayloadHash,
    event_time: draft.eventTime,
    event_type: draft.eventType,
    manifest_id: draft.manifestId,
    object_refs: draft.objectRefs,
    prev_event_hash: init.prevEventHashOrNull,
    reason_codes: draft.reasonCodes,
    recorded_at: normalizeUtcInstantString(init.recordedAt),
    retained_context: draft.retainedContext,
    retention_class: draft.retentionClass,
    retention_limited_explainability_contract: createAuditExplainabilityContract(),
    service_ref: draft.serviceRef,
    signature_ref: init.signatureRefOrNull,
    stream_sequence: init.streamSequence,
    tenant_id: draft.tenantId,
    visibility_class: draft.visibilityClass,
  };

  const chainHash = createAuditChainHash(provisionalEvent);
  return {
    ...provisionalEvent,
    audit_event_id: createAuditEventId(chainHash),
  };
}
