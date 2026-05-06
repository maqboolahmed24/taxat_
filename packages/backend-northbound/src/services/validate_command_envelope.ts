import {
  loadNorthboundPolicyBundle,
  NorthboundBoundaryError,
  type NorthboundActorContext,
  type NorthboundPolicyBundle,
} from "../../../../apps/control-plane-api/src/northbound/policy.ts";
import {
  parseCommandEnvelope,
  type ParsedCommandEnvelope,
} from "../../../../apps/control-plane-api/src/northbound/parse_command_envelope.ts";
import type { CommandEnvelope } from "../models/command_envelope.ts";

export type ValidateCommandEnvelopeInput = {
  actorContext: NorthboundActorContext;
  envelope: unknown;
  policyBundle?: NorthboundPolicyBundle;
};

const scopeTokenOrder = new Map<string, number>([
  ["year_end", 0],
  ["quarterly_update", 1],
  ["estimate_only", 2],
  ["prepare_submission", 3],
  ["submit", 4],
  ["amendment_intent", 5],
  ["amendment_submit", 6],
] as const);

const reportingScopeTokens = new Set(["year_end", "quarterly_update", "estimate_only"]);

const forbiddenPayloadKeyFragments = [
  "authority_token",
  "audit_signature",
  "base64",
  "binary",
  "client_derived_legal",
  "file_bytes",
  "raw_bytes",
  "raw_file",
  "upload_bytes",
];

const forbiddenPayloadKeys = new Set([
  "data_url",
  "latest_projection_ref",
  "latest_projection_sequence",
  "legal_state",
  "projection_state",
]);

function fail(reasonCode: string, detail?: string): never {
  throw new NorthboundBoundaryError("INVALID_COMMAND_ENVELOPE", [reasonCode], detail);
}

function validateRequestedScope(command: CommandEnvelope) {
  const scope = command.requested_scope;
  if (scope.length === 0) {
    return;
  }

  const unknownTokens = scope.filter((token) => !scopeTokenOrder.has(token));
  if (unknownTokens.length > 0) {
    fail("REQUESTED_SCOPE_UNKNOWN", `Unknown requested_scope tokens: ${unknownTokens.join(", ")}`);
  }

  const reportingTokens = scope.filter((token) => reportingScopeTokens.has(token));
  if (reportingTokens.length !== 1) {
    fail("REQUESTED_SCOPE_REPORTING_TOKEN_REQUIRED");
  }
  if (!reportingScopeTokens.has(scope[0] ?? "")) {
    fail("REQUESTED_SCOPE_REPORTING_TOKEN_NOT_FIRST");
  }

  const expected = [...scope].sort(
    (left, right) => (scopeTokenOrder.get(left) ?? 999) - (scopeTokenOrder.get(right) ?? 999),
  );
  if (JSON.stringify(scope) !== JSON.stringify(expected)) {
    fail("REQUESTED_SCOPE_NOT_CANONICAL", `requested_scope must use ${expected.join(", ")}`);
  }

  const actionTokens = new Set(scope.filter((token) => !reportingScopeTokens.has(token)));
  if (scope[0] === "estimate_only" && actionTokens.size > 0) {
    fail("REQUESTED_SCOPE_ESTIMATE_ONLY_MIXED");
  }
  if (actionTokens.has("submit") && !actionTokens.has("prepare_submission")) {
    fail("REQUESTED_SCOPE_SUBMIT_WITHOUT_PREPARE_SUBMISSION");
  }
  if (actionTokens.has("amendment_intent")) {
    const unexpected = [...actionTokens].filter((token) => token !== "amendment_intent");
    if (scope[0] !== "year_end" || unexpected.length > 0) {
      fail("REQUESTED_SCOPE_AMENDMENT_INTENT_INVALID");
    }
  }
  if (actionTokens.has("amendment_submit")) {
    const unexpected = [...actionTokens].filter((token) => token !== "amendment_submit");
    if (scope[0] !== "year_end" || unexpected.length > 0) {
      fail("REQUESTED_SCOPE_AMENDMENT_SUBMIT_INVALID");
    }
  }
}

function scanPayloadForForbiddenAuthority(value: unknown, path = "payload") {
  if (value === null || typeof value !== "object") {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => scanPayloadForForbiddenAuthority(entry, `${path}[${index}]`));
    return;
  }

  for (const [key, entry] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();
    if (
      forbiddenPayloadKeys.has(normalizedKey) ||
      forbiddenPayloadKeyFragments.some((fragment) => normalizedKey.includes(fragment))
    ) {
      fail("PAYLOAD_CONTAINS_FORBIDDEN_AUTHORITY_INPUT", `${path}.${key} is forbidden`);
    }
    scanPayloadForForbiddenAuthority(entry, `${path}.${key}`);
  }
}

function validateUploadFinalization(command: CommandEnvelope) {
  if (command.command_type !== "CLIENT_PORTAL_FINALIZE_UPLOAD") {
    return;
  }
  const uploadSessionId = command.payload.upload_session_id;
  if (typeof uploadSessionId !== "string" || uploadSessionId.length === 0) {
    fail("UPLOAD_SESSION_ID_REQUIRED");
  }
}

export async function validateCommandEnvelope(
  input: ValidateCommandEnvelopeInput,
): Promise<ParsedCommandEnvelope> {
  const policyBundle = input.policyBundle ?? (await loadNorthboundPolicyBundle());
  const parsed = await parseCommandEnvelope(input.envelope, input.actorContext, { policyBundle });

  validateRequestedScope(parsed.command);
  scanPayloadForForbiddenAuthority(parsed.command.payload);
  validateUploadFinalization(parsed.command);

  return parsed;
}

export { NorthboundBoundaryError };
