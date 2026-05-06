import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import type { AuditInvestigationFrameActiveFilters } from "../../../../packages/generated-models/src/generated/typescript/governance-and-policy.ts";

export type AuditQueryContractCode =
  | "AUDIT_TRAIL"
  | "FILING_EVIDENCE_LEDGER"
  | "RUN_TIMELINE";

export type AuditQueryOrderingBasis =
  | "AUDIT_STREAM_SEQUENCE"
  | "RECORDED_AT_THEN_STREAM_SEQUENCE";

export type AuditQueryRouteFamily =
  | "GOVERNANCE_AUDIT_INVESTIGATIONS"
  | "MANIFEST_AUDIT_TRAIL";

export type MappedAuditQuery = {
  activeFilters: AuditInvestigationFrameActiveFilters;
  cursorOffset: number;
  focusAnchorRef: string | null;
  focusEventRef: string | null;
  limit: number;
  orderingBasis: AuditQueryOrderingBasis;
  queryAnchorRef: string;
  queryContractCode: AuditQueryContractCode;
  queryHash: string;
  routeFamily: AuditQueryRouteFamily;
};

export class AuditQueryMappingError extends Error {
  readonly code:
    | "AUDIT_CURSOR_INVALID"
    | "AUDIT_FILTER_TOKEN_INVALID"
    | "AUDIT_LIMIT_INVALID"
    | "AUDIT_QUERY_CONTRACT_INVALID"
    | "AUDIT_ROUTE_FILTER_CONFLICT";

  constructor(code: AuditQueryMappingError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "AuditQueryMappingError";
    this.code = code;
  }
}

const cursorPrefix = "audit-cursor.";
const defaultLimit = 50;
const maxLimit = 100;

function urlFor(path: string | undefined) {
  try {
    return new URL(path ?? "/", "http://taxat.local");
  } catch {
    return new URL("/", "http://taxat.local");
  }
}

function assertNonEmptyToken(fieldName: string, value: string) {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new AuditQueryMappingError(
      "AUDIT_FILTER_TOKEN_INVALID",
      `${fieldName} cannot contain an empty token`,
    );
  }
  return normalized;
}

function parseList(params: URLSearchParams, names: readonly string[]) {
  const values: string[] = [];
  for (const name of names) {
    for (const raw of params.getAll(name)) {
      for (const token of raw.split(",")) {
        values.push(assertNonEmptyToken(name, token));
      }
    }
  }
  return [...new Set(values)].sort();
}

function parseOptionalToken(params: URLSearchParams, names: readonly string[]) {
  for (const name of names) {
    const raw = params.get(name);
    if (raw !== null) {
      return assertNonEmptyToken(name, raw);
    }
  }
  return null;
}

export function orderingBasisForAuditQueryContract(
  queryContractCode: AuditQueryContractCode,
): AuditQueryOrderingBasis {
  return queryContractCode === "AUDIT_TRAIL"
    ? "AUDIT_STREAM_SEQUENCE"
    : "RECORDED_AT_THEN_STREAM_SEQUENCE";
}

function queryContractFromParam(
  raw: string | null,
  routeFamily: AuditQueryRouteFamily,
): AuditQueryContractCode {
  if (routeFamily === "MANIFEST_AUDIT_TRAIL") {
    if (raw !== null && raw.trim().length > 0 && raw.trim().toUpperCase() !== "AUDIT_TRAIL") {
      throw new AuditQueryMappingError(
        "AUDIT_QUERY_CONTRACT_INVALID",
        "manifest audit-trail route is fixed to AUDIT_TRAIL",
      );
    }
    return "AUDIT_TRAIL";
  }

  const normalized = (raw ?? "AUDIT_TRAIL").trim().toUpperCase().replaceAll("-", "_");
  switch (normalized) {
    case "AUDIT":
    case "AUDIT_TRAIL":
      return "AUDIT_TRAIL";
    case "FILING":
    case "FILING_EVIDENCE_LEDGER":
      return "FILING_EVIDENCE_LEDGER";
    case "RUN":
    case "RUN_TIMELINE":
    case "TIMELINE":
      return "RUN_TIMELINE";
    default:
      throw new AuditQueryMappingError(
        "AUDIT_QUERY_CONTRACT_INVALID",
        `unsupported audit query contract ${raw}`,
      );
  }
}

function parseLimit(params: URLSearchParams) {
  const raw = params.get("limit");
  if (raw === null) {
    return defaultLimit;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > maxLimit) {
    throw new AuditQueryMappingError(
      "AUDIT_LIMIT_INVALID",
      `audit query limit must be an integer between 1 and ${maxLimit}`,
    );
  }
  return value;
}

function buildActiveFilters(input: {
  forcedManifestRef?: string | null;
  params: URLSearchParams;
}) {
  const manifestRefsFromQuery = parseList(input.params, [
    "manifest",
    "manifest_ref",
    "manifest_refs",
  ]);
  if (
    input.forcedManifestRef !== undefined &&
    input.forcedManifestRef !== null &&
    manifestRefsFromQuery.some((manifestRef) => manifestRef !== input.forcedManifestRef)
  ) {
    throw new AuditQueryMappingError(
      "AUDIT_ROUTE_FILTER_CONFLICT",
      "manifest audit-trail filters cannot widen beyond the routed manifest",
    );
  }
  return {
    actor_refs: parseList(input.params, ["actor", "actor_ref", "actor_refs"]),
    authority_operation_refs: parseList(input.params, [
      "authority_operation",
      "authority_operation_ref",
      "authority_operation_refs",
    ]),
    client_refs: parseList(input.params, ["client", "client_ref", "client_refs"]),
    event_families: parseList(input.params, [
      "event_family",
      "event_family_ref",
      "event_families",
    ]),
    manifest_refs:
      input.forcedManifestRef === undefined || input.forcedManifestRef === null
        ? manifestRefsFromQuery
        : [input.forcedManifestRef],
    object_refs: parseList(input.params, ["object", "object_ref", "object_refs"]),
    window_from: parseOptionalToken(input.params, ["window_from", "from"]),
    window_to: parseOptionalToken(input.params, ["window_to", "to"]),
  } satisfies AuditInvestigationFrameActiveFilters;
}

function queryHash(input: {
  activeFilters: AuditInvestigationFrameActiveFilters;
  limit: number;
  orderingBasis: AuditQueryOrderingBasis;
  queryAnchorRef: string;
  queryContractCode: AuditQueryContractCode;
  routeFamily: AuditQueryRouteFamily;
}) {
  return stableJsonHash(input);
}

export function encodeAuditQueryCursor(input: {
  nextOffset: number;
  queryHash: string;
}) {
  if (!Number.isInteger(input.nextOffset) || input.nextOffset < 0) {
    throw new AuditQueryMappingError(
      "AUDIT_CURSOR_INVALID",
      "audit query cursor offset must be a non-negative integer",
    );
  }
  if (input.queryHash.trim().length === 0) {
    throw new AuditQueryMappingError(
      "AUDIT_CURSOR_INVALID",
      "audit query cursor must retain a non-empty query hash",
    );
  }
  const body = Buffer.from(
    JSON.stringify({
      offset: input.nextOffset,
      query_hash: input.queryHash,
    }),
    "utf8",
  ).toString("base64url");
  return `${cursorPrefix}${body}`;
}

function decodeAuditQueryCursor(raw: string | null, expectedQueryHash: string) {
  if (raw === null) {
    return 0;
  }
  const token = assertNonEmptyToken("cursor", raw);
  if (!token.startsWith(cursorPrefix)) {
    throw new AuditQueryMappingError(
      "AUDIT_CURSOR_INVALID",
      "audit query cursor has an unknown prefix",
    );
  }
  try {
    const decoded = JSON.parse(
      Buffer.from(token.slice(cursorPrefix.length), "base64url").toString("utf8"),
    ) as { offset?: unknown; query_hash?: unknown };
    if (
      !Number.isInteger(decoded.offset) ||
      decoded.offset < 0 ||
      typeof decoded.query_hash !== "string" ||
      decoded.query_hash.length === 0
    ) {
      throw new Error("cursor body is malformed");
    }
    if (decoded.query_hash !== expectedQueryHash) {
      throw new AuditQueryMappingError(
        "AUDIT_CURSOR_INVALID",
        "audit query cursor belongs to a different filter contract",
      );
    }
    return decoded.offset;
  } catch (error) {
    if (error instanceof AuditQueryMappingError) {
      throw error;
    }
    throw new AuditQueryMappingError(
      "AUDIT_CURSOR_INVALID",
      error instanceof Error ? error.message : String(error),
    );
  }
}

export function mapAuditQueryFiltersAndCursor(input: {
  forcedManifestRef?: string | null;
  path?: string;
  queryAnchorRef: string;
  routeFamily: AuditQueryRouteFamily;
}): MappedAuditQuery {
  const url = urlFor(input.path);
  const queryContractCode = queryContractFromParam(
    url.searchParams.get("query_contract") ?? url.searchParams.get("query_contract_code"),
    input.routeFamily,
  );
  const orderingBasis = orderingBasisForAuditQueryContract(queryContractCode);
  const activeFilters = buildActiveFilters({
    forcedManifestRef: input.forcedManifestRef,
    params: url.searchParams,
  });
  const limit = parseLimit(url.searchParams);
  const hash = queryHash({
    activeFilters,
    limit,
    orderingBasis,
    queryAnchorRef: input.queryAnchorRef,
    queryContractCode,
    routeFamily: input.routeFamily,
  });
  return {
    activeFilters,
    cursorOffset: decodeAuditQueryCursor(url.searchParams.get("cursor"), hash),
    focusAnchorRef: parseOptionalToken(url.searchParams, ["focus_anchor_ref"]),
    focusEventRef: parseOptionalToken(url.searchParams, [
      "focus_event_ref",
      "selected_event_ref",
    ]),
    limit,
    orderingBasis,
    queryAnchorRef: input.queryAnchorRef,
    queryContractCode,
    queryHash: hash,
    routeFamily: input.routeFamily,
  };
}
