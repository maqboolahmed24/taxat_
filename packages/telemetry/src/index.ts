export {
  createCorrelationContext,
  createChildCorrelationContext,
  createRootCorrelationContext,
  deriveSpanId,
  deriveTraceId,
  pickCorrelationKeys,
  summarizeCorrelationContext,
} from "./correlation_context.ts";
export { extractHttpContext, injectHttpContext } from "./http_context_propagation.ts";
export {
  createMessageContextEnvelope,
  extractMessageContextEnvelope,
} from "./message_context_propagation.ts";
export {
  createMetricEventRecord,
  createTelemetryBootstrap,
  createTraceSpanRecord,
  loadTelemetryPolicyBundle,
  lookupSamplingClassForSpanCode,
} from "./otel_bootstrap.ts";
export {
  createClientSurfaceLogRecord,
  createClientSurfaceMetricEvent,
} from "./client_surface_telemetry.ts";
export { createStructuredLogAdapter, createStructuredLogRecord } from "./structured_log_adapter.ts";
export { createTelemetryResource } from "./telemetry_resource_builder.ts";
