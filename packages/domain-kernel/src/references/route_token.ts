import { asTaxatRouteToken, type TaxatRouteToken } from "../primitives/index.ts";

export type ReferenceRouteToken<Family extends string = string> = TaxatRouteToken<Family>;

type RouteTokenErrorCode =
  | "ROUTE_TOKEN_ABSOLUTE_URL_FORBIDDEN"
  | "ROUTE_TOKEN_EMPTY"
  | "ROUTE_TOKEN_FRAGMENT_FORBIDDEN"
  | "ROUTE_TOKEN_HOST_HINT_FORBIDDEN"
  | "ROUTE_TOKEN_SECRET_QUERY_FORBIDDEN"
  | "ROUTE_TOKEN_STRING_REQUIRED"
  | "ROUTE_TOKEN_WHITESPACE_FORBIDDEN";

type RouteTokenErrorInit = {
  code: RouteTokenErrorCode;
  detail: string;
};

const ABSOLUTE_URL_PATTERN = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i;
const STORAGE_PROVIDER_URL_PATTERN = /^(?:s3|gs|azure|az|file):\/\//i;
const SECRET_QUERY_PATTERN =
  /(?:^|[?&])(x-amz-[^=]+|x-goog-[^=]+|x-ms-[^=]+|sig|signature|token|expires|se|sp|sv|authorization)=/i;
const HOST_HINT_PATTERN =
  /(?:^|[?&])(tenant_id|client_id|principal_scope_ref|access_binding_hash)=/i;

export class RouteTokenError extends Error {
  readonly code: RouteTokenErrorCode;

  constructor(init: RouteTokenErrorInit) {
    super(`${init.code}: ${init.detail}`);
    this.name = "RouteTokenError";
    this.code = init.code;
  }
}

function assertRouteTokenLiteral(value: unknown) {
  if (typeof value !== "string") {
    throw new RouteTokenError({
      code: "ROUTE_TOKEN_STRING_REQUIRED",
      detail: "route tokens must remain strings because browser and native shells serialize them",
    });
  }

  if (value.length === 0) {
    throw new RouteTokenError({
      code: "ROUTE_TOKEN_EMPTY",
      detail: "route tokens cannot be empty",
    });
  }

  if (/\s/.test(value)) {
    throw new RouteTokenError({
      code: "ROUTE_TOKEN_WHITESPACE_FORBIDDEN",
      detail: "route tokens must stay URL- or scene-safe and may not contain raw whitespace",
    });
  }

  if (value.includes("#")) {
    throw new RouteTokenError({
      code: "ROUTE_TOKEN_FRAGMENT_FORBIDDEN",
      detail: "hash fragments are mutable browser trivia and cannot become durable route tokens",
    });
  }

  if (ABSOLUTE_URL_PATTERN.test(value) || STORAGE_PROVIDER_URL_PATTERN.test(value)) {
    throw new RouteTokenError({
      code: "ROUTE_TOKEN_ABSOLUTE_URL_FORBIDDEN",
      detail: "route tokens cannot be full URLs or storage-provider paths",
    });
  }

  if (SECRET_QUERY_PATTERN.test(value) || /^Bearer\s/i.test(value)) {
    throw new RouteTokenError({
      code: "ROUTE_TOKEN_SECRET_QUERY_FORBIDDEN",
      detail:
        "route tokens cannot embed signed-delivery parameters, bearer tokens, or replayable credentials",
    });
  }

  if (HOST_HINT_PATTERN.test(value)) {
    throw new RouteTokenError({
      code: "ROUTE_TOKEN_HOST_HINT_FORBIDDEN",
      detail: "tenant and access hints belong in delivery binding context, not in route tokens",
    });
  }

  return value;
}

export function asReferenceRouteToken<Family extends string>(
  value: unknown,
  family: Family,
): ReferenceRouteToken<Family> {
  return asTaxatRouteToken(assertRouteTokenLiteral(value), family);
}
