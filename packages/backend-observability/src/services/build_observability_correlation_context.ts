import type {
  ManifestBranchDecisionContract,
  ManifestStartClaimContract,
} from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import type {
  TelemetryResource,
  TelemetryResourceCorrelationContext,
} from "../../../generated-models/src/generated/typescript/retention-failure-and-observability.ts";
import { deriveSpanId, deriveTraceId } from "../../../telemetry/src/correlation_context.ts";
import {
  assertNonEmptyObservabilityString,
  assertObservabilityCorrelationContext,
  normalizeOptionalObservabilityString,
  OBSERVABILITY_CONTEXT_ENUM_FIELDS,
  OBSERVABILITY_CONTEXT_STRING_FIELDS,
  ObservabilityContractError,
  type ObservabilityCorrelationContext,
} from "../models/observability_correlation_context.ts";

export type BuildObservabilityCorrelationContextInput =
  Partial<TelemetryResourceCorrelationContext> & {
    manifestBranchDecision?: ManifestBranchDecisionContract | null;
    manifestStartClaim?: ManifestStartClaimContract | null;
    parentContext?: ObservabilityCorrelationContext | null;
    resource?: TelemetryResource | null;
    serviceNameOrNull?: string | null;
    codeBuildIdOrNull?: string | null;
    spanSeed?: string | null;
    traceSeed?: string | null;
  };

function assignStringField(
  context: ObservabilityCorrelationContext,
  field: keyof ObservabilityCorrelationContext,
  value: unknown,
) {
  if (value === undefined) {
    return;
  }
  const normalized = normalizeOptionalObservabilityString(`correlation_context.${field}`, value);
  if (normalized !== null) {
    context[field] = normalized as never;
  }
}

function assignEnumField<
  Field extends keyof typeof OBSERVABILITY_CONTEXT_ENUM_FIELDS,
>(
  context: ObservabilityCorrelationContext,
  field: Field,
  value: unknown,
) {
  if (value === undefined || value === null) {
    return;
  }
  const normalized = assertNonEmptyObservabilityString(
    `correlation_context.${field}`,
    value,
  );
  if (!(OBSERVABILITY_CONTEXT_ENUM_FIELDS[field] as readonly string[]).includes(normalized)) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_FIELD_INVALID",
      `${field} is outside the frozen observability vocabulary`,
    );
  }
  context[field] = normalized as never;
}

function mirrorFromBranchDecision(
  context: ObservabilityCorrelationContext,
  decision: ManifestBranchDecisionContract,
) {
  const mirrorPairs = [
    ["manifest_id", decision.selected_manifest_id],
    ["root_manifest_id", decision.root_manifest_id],
    ["parent_manifest_id", decision.parent_manifest_id_or_null],
    ["continuation_of_manifest_id", decision.continuation_of_manifest_id_or_null],
    ["replay_of_manifest_id", decision.replay_of_manifest_id_or_null],
    ["idempotency_key", decision.idempotency_key],
    ["access_binding_hash", decision.access_binding_hash],
    ["continuation_basis", decision.selected_manifest_continuation_basis],
    ["run_kind", decision.run_kind],
    ["mode", decision.mode],
    ["replay_class", decision.replay_class_or_null],
    ["nightly_window_key", decision.nightly_window_key_or_null],
    ["config_inheritance_mode", decision.config_inheritance_mode_or_null],
    ["input_inheritance_mode", decision.input_inheritance_mode_or_null],
  ] as const;

  for (const [field, expected] of mirrorPairs) {
    const current = context[field];
    if (expected === null) {
      if (current !== undefined && current !== null) {
        throw new ObservabilityContractError(
          "OBSERVABILITY_CONTEXT_BRANCH_MIRROR_DRIFT",
          `${field} conflicts with null manifest_branch_decision mirror`,
        );
      }
      continue;
    }
    if (current !== undefined && current !== expected) {
      throw new ObservabilityContractError(
        "OBSERVABILITY_CONTEXT_BRANCH_MIRROR_DRIFT",
        `${field} conflicts with manifest_branch_decision mirror ${expected}`,
      );
    }
    context[field] = expected as never;
  }
}

function mirrorFromStartClaim(
  context: ObservabilityCorrelationContext,
  startClaim: ManifestStartClaimContract,
) {
  for (const [field, expected] of [
    ["manifest_id", startClaim.manifest_id],
    ["access_binding_hash", startClaim.access_binding_hash],
  ] as const) {
    const current = context[field];
    if (current !== undefined && current !== expected) {
      throw new ObservabilityContractError(
        "OBSERVABILITY_CONTEXT_START_CLAIM_MIRROR_DRIFT",
        `${field} conflicts with manifest_start_claim mirror ${expected}`,
      );
    }
    context[field] = expected as never;
  }
}

export function buildObservabilityCorrelationContext(
  input: BuildObservabilityCorrelationContextInput,
): ObservabilityCorrelationContext {
  const context: ObservabilityCorrelationContext = {
    ...(input.parentContext ?? {}),
  };

  const inputWithResourceDefaults: BuildObservabilityCorrelationContextInput = {
    ...input,
    code_build_id: input.code_build_id ?? input.codeBuildIdOrNull ?? input.resource?.build_ref,
    environment_ref: input.environment_ref ?? input.resource?.environment_ref,
    service_name: input.service_name ?? input.serviceNameOrNull ?? input.resource?.service_name,
  };

  for (const field of OBSERVABILITY_CONTEXT_STRING_FIELDS) {
    assignStringField(context, field, inputWithResourceDefaults[field]);
  }
  for (const field of Object.keys(
    OBSERVABILITY_CONTEXT_ENUM_FIELDS,
  ) as (keyof typeof OBSERVABILITY_CONTEXT_ENUM_FIELDS)[]) {
    assignEnumField(context, field, inputWithResourceDefaults[field]);
  }

  const branchDecision =
    input.manifestBranchDecision ?? input.manifest_branch_decision ?? null;
  if (branchDecision !== null) {
    context.manifest_branch_decision = structuredClone(branchDecision);
    mirrorFromBranchDecision(context, branchDecision);
  }

  const startClaim = input.manifestStartClaim ?? input.manifest_start_claim ?? null;
  if (startClaim !== null) {
    context.manifest_start_claim = structuredClone(startClaim);
    mirrorFromStartClaim(context, startClaim);
  }

  if (!context.trace_id && input.traceSeed) {
    context.trace_id = deriveTraceId(input.traceSeed);
  }
  if (
    input.parentContext?.span_id &&
    input.spanSeed &&
    (inputWithResourceDefaults.span_id === undefined ||
      inputWithResourceDefaults.span_id === null)
  ) {
    delete context.span_id;
  }
  if (!context.span_id && input.spanSeed) {
    const parentFingerprint = input.parentContext?.span_id ?? "root";
    context.span_id = deriveSpanId(`${context.trace_id ?? "trace"}:${parentFingerprint}:${input.spanSeed}`);
  }

  assertObservabilityCorrelationContext(context);
  return context;
}
