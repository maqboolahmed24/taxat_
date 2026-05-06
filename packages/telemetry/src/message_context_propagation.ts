import type {
  TelemetryResource,
  TelemetryResourceCorrelationContext,
} from "../../generated-models/src/generated/typescript/retention-failure-and-observability.ts";
import { stableJsonHash } from "../../domain-kernel/src/primitives/hash.ts";
import {
  createChildCorrelationContext,
  createRootCorrelationContext,
  pickCorrelationKeys,
  type CorrelationNormalizationResult,
} from "./correlation_context.ts";

type CorrelationChannelRow = {
  channel_ref: string;
  retained_keys: string[];
};

type PolicyBundleShape = {
  correlationKeyMatrix: {
    channel_rows: CorrelationChannelRow[];
  };
};

export type MessageChannel = "QUEUE_MESSAGE" | "STREAM_PUBLICATION" | "UPLOAD_CONTINUATION";

export type MessagePropagationEnvelope = {
  channel_ref: MessageChannel;
  correlation_baggage_or_null: string | null;
  safe_refs: Record<string, string>;
  traceparent: string;
  transport_ref_hash_or_null: string | null;
};

type CreateMessageEnvelopeInput = {
  channel: MessageChannel;
  context: TelemetryResourceCorrelationContext;
  opaqueTransportRefOrNull?: string | null;
  policyBundle: PolicyBundleShape;
  safeRefs?: Record<string, string>;
};

type ExtractMessageEnvelopeInput = {
  authoritativeContext: Partial<TelemetryResourceCorrelationContext>;
  envelope: MessagePropagationEnvelope;
  policyBundle: PolicyBundleShape;
  resource: TelemetryResource;
  spanSeed: string;
};

const traceparentPattern = /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/i;

function channelRow(bundle: PolicyBundleShape, channelRef: MessageChannel) {
  const row = bundle.correlationKeyMatrix.channel_rows.find(
    (entry) => entry.channel_ref === channelRef,
  );
  if (!row) {
    throw new Error(`MESSAGE_CONTEXT_POLICY_CHANNEL_MISSING:${channelRef}`);
  }
  return row;
}

function formatTraceparent(traceId: string, spanId: string, traceFlags = "01") {
  return `00-${traceId.toLowerCase()}-${spanId.toLowerCase()}-${traceFlags.toLowerCase()}`;
}

function parseTraceparent(value: string) {
  const match = traceparentPattern.exec(value.trim());
  if (!match) {
    return null;
  }
  const [, traceId, parentSpanId] = match;
  if (/^0+$/.test(traceId) || /^0+$/.test(parentSpanId)) {
    return null;
  }
  return {
    parentSpanId: parentSpanId.toLowerCase(),
    traceId: traceId.toLowerCase(),
  };
}

function encodeCarrier(context: TelemetryResourceCorrelationContext, retainedKeys: string[]) {
  return Buffer.from(JSON.stringify(pickCorrelationKeys(context, retainedKeys)), "utf8").toString(
    "base64url",
  );
}

function decodeCarrier(encoded: string, retainedKeys: string[]) {
  const payload = JSON.parse(
    Buffer.from(encoded, "base64url").toString("utf8"),
  ) as Record<string, unknown>;
  const allowed = new Set(retainedKeys);
  const filtered: Partial<TelemetryResourceCorrelationContext> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (allowed.has(key) && (typeof value === "string" || value === null)) {
      filtered[key as keyof TelemetryResourceCorrelationContext] = value as never;
    }
  }
  return filtered;
}

export function createMessageContextEnvelope(
  input: CreateMessageEnvelopeInput,
): MessagePropagationEnvelope {
  const traceId = input.context.trace_id;
  const spanId = input.context.span_id;
  if (!traceId || !spanId) {
    throw new Error("MESSAGE_CONTEXT_TRACE_IDS_REQUIRED");
  }

  return {
    channel_ref: input.channel,
    correlation_baggage_or_null: encodeCarrier(
      input.context,
      channelRow(input.policyBundle, input.channel).retained_keys,
    ),
    safe_refs: input.safeRefs ?? {},
    traceparent: formatTraceparent(traceId, spanId),
    transport_ref_hash_or_null: input.opaqueTransportRefOrNull
      ? stableJsonHash({
          channel_ref: input.channel,
          opaque_transport_ref: input.opaqueTransportRefOrNull,
        })
      : null,
  };
}

export function extractMessageContextEnvelope(
  input: ExtractMessageEnvelopeInput,
): CorrelationNormalizationResult {
  const warnings: string[] = [];
  const parsedTrace = parseTraceparent(input.envelope.traceparent);
  if (!parsedTrace) {
    warnings.push("MALFORMED_MESSAGE_TRACEPARENT");
  }

  let propagatedBusinessContext: Partial<TelemetryResourceCorrelationContext> = {};
  if (input.envelope.correlation_baggage_or_null) {
    try {
      propagatedBusinessContext = decodeCarrier(
        input.envelope.correlation_baggage_or_null,
        channelRow(input.policyBundle, input.envelope.channel_ref).retained_keys,
      );
    } catch {
      warnings.push("MALFORMED_MESSAGE_CORRELATION_CARRIER");
    }
  }

  const context = parsedTrace
    ? createChildCorrelationContext({
        parent: {
          ...propagatedBusinessContext,
          trace_id: parsedTrace.traceId,
          span_id: parsedTrace.parentSpanId,
        },
        resource: input.resource,
        spanSeed: input.spanSeed,
        overrides: input.authoritativeContext,
      })
    : createRootCorrelationContext({
        ...propagatedBusinessContext,
        ...input.authoritativeContext,
        resource: input.resource,
        spanSeed: input.spanSeed,
        traceSeed: JSON.stringify({
          authoritative: input.authoritativeContext,
          channel_ref: input.envelope.channel_ref,
          span_seed: input.spanSeed,
        }),
      });

  return {
    auditJoinBoundary: "TELEMETRY_CORRELATES_TO_AUDIT_BUT_DOES_NOT_REPLACE_IT",
    context,
    parentSpanIdOrNull: parsedTrace?.parentSpanId ?? null,
    traceStateOrNull: null,
    transportTrustState: warnings.length > 0 ? "MALFORMED_INBOUND_CONTEXT" : "INTERNAL_CONTEXT_REUSED",
    warnings,
  };
}
