import type {
  TelemetryResource,
  TelemetryResourceCorrelationContext,
} from "../../generated-models/src/generated/typescript/retention-failure-and-observability.ts";
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

export type HttpTrustBoundary = "PUBLIC_INGRESS" | "INTERNAL_SERVICE" | "BROWSER_CLIENT";

export type HttpExtractionInput = {
  authoritativeContext: Partial<TelemetryResourceCorrelationContext>;
  headers: Headers | Record<string, string | string[] | undefined>;
  policyBundle: PolicyBundleShape;
  resource: TelemetryResource;
  spanSeed: string;
  traceSeed?: string;
  trustBoundary: HttpTrustBoundary;
};

export type HttpInjectionInput = {
  audience: "INTERNAL_SERVICE" | "BROWSER_CLIENT";
  context: TelemetryResourceCorrelationContext;
  policyBundle: PolicyBundleShape;
};

const TRACEPARENT_HEADER = "traceparent";
const TRACESTATE_HEADER = "tracestate";
const TAXAT_CONTEXT_HEADER = "x-taxat-correlation";
const traceparentPattern = /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/i;

function readHeaderValue(
  headers: Headers | Record<string, string | string[] | undefined>,
  key: string,
) {
  if (headers instanceof Headers) {
    return headers.get(key);
  }
  const entry = headers[key] ?? headers[key.toLowerCase()] ?? headers[key.toUpperCase()];
  return Array.isArray(entry) ? entry[0] ?? null : entry ?? null;
}

function parseTraceparent(value: string | null) {
  if (!value) {
    return null;
  }
  const match = traceparentPattern.exec(value.trim());
  if (!match) {
    return null;
  }
  const [, traceId, parentSpanId, traceFlags] = match;
  if (/^0+$/.test(traceId) || /^0+$/.test(parentSpanId)) {
    return null;
  }
  return {
    parentSpanId,
    traceFlags: traceFlags.toLowerCase(),
    traceId: traceId.toLowerCase(),
  };
}

function formatTraceparent(traceId: string, spanId: string, traceFlags = "01") {
  return `00-${traceId.toLowerCase()}-${spanId.toLowerCase()}-${traceFlags.toLowerCase()}`;
}

function channelRow(bundle: PolicyBundleShape, channelRef: string) {
  const row = bundle.correlationKeyMatrix.channel_rows.find(
    (entry) => entry.channel_ref === channelRef,
  );
  if (!row) {
    throw new Error(`HTTP_CONTEXT_POLICY_CHANNEL_MISSING:${channelRef}`);
  }
  return row;
}

function encodeCarrier(context: TelemetryResourceCorrelationContext, retainedKeys: string[]) {
  return Buffer.from(JSON.stringify(pickCorrelationKeys(context, retainedKeys)), "utf8").toString(
    "base64url",
  );
}

function decodeCarrier(encoded: string, retainedKeys: string[]) {
  const decoded = Buffer.from(encoded, "base64url").toString("utf8");
  const payload = JSON.parse(decoded) as Record<string, unknown>;
  const allowed = new Set(retainedKeys);
  const filtered: Partial<TelemetryResourceCorrelationContext> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (allowed.has(key) && (typeof value === "string" || value === null)) {
      filtered[key as keyof TelemetryResourceCorrelationContext] = value as never;
    }
  }
  return filtered;
}

export function extractHttpContext(input: HttpExtractionInput): CorrelationNormalizationResult {
  const warnings: string[] = [];
  const parsedTrace = parseTraceparent(readHeaderValue(input.headers, TRACEPARENT_HEADER));
  const traceStateOrNull = readHeaderValue(input.headers, TRACESTATE_HEADER);
  const carrierHeader = readHeaderValue(input.headers, TAXAT_CONTEXT_HEADER);
  let propagatedBusinessContext: Partial<TelemetryResourceCorrelationContext> = {};

  if (carrierHeader) {
    if (input.trustBoundary === "INTERNAL_SERVICE") {
      try {
        propagatedBusinessContext = decodeCarrier(
          carrierHeader,
          channelRow(input.policyBundle, "HTTP_INTERNAL_PROPAGATION").retained_keys,
        );
      } catch {
        warnings.push("MALFORMED_INTERNAL_CORRELATION_CARRIER");
      }
    } else {
      warnings.push("INBOUND_BUSINESS_CONTEXT_IGNORED");
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
        traceSeed:
          input.traceSeed ??
          JSON.stringify({
            authoritative: input.authoritativeContext,
            boundary: input.trustBoundary,
            span_seed: input.spanSeed,
          }),
      });

  return {
    auditJoinBoundary: "TELEMETRY_CORRELATES_TO_AUDIT_BUT_DOES_NOT_REPLACE_IT",
    context,
    parentSpanIdOrNull: parsedTrace?.parentSpanId ?? null,
    traceStateOrNull: traceStateOrNull?.trim() || null,
    transportTrustState: parsedTrace
      ? warnings.length > 0
        ? "INTERNAL_CONTEXT_REUSED"
        : "REUSED_TRANSPORT_TRACE"
      : readHeaderValue(input.headers, TRACEPARENT_HEADER)
        ? "MALFORMED_INBOUND_CONTEXT"
        : "MISSING_INBOUND_CONTEXT",
    warnings,
  };
}

export function injectHttpContext(input: HttpInjectionInput) {
  const spanId = input.context.span_id;
  const traceId = input.context.trace_id;
  if (!spanId || !traceId) {
    throw new Error("HTTP_CONTEXT_TRACE_IDS_REQUIRED");
  }

  const headers: Record<string, string> = {
    [TRACEPARENT_HEADER]: formatTraceparent(traceId, spanId),
  };

  if (input.audience === "INTERNAL_SERVICE") {
    headers[TAXAT_CONTEXT_HEADER] = encodeCarrier(
      input.context,
      channelRow(input.policyBundle, "HTTP_INTERNAL_PROPAGATION").retained_keys,
    );
  }

  return headers;
}
