import { deriveAuthoritativeEtag, type AuthoritativeEtagBasis } from "./derive_authoritative_etag.ts";

export type IfMatchValidationResult =
  | {
      authoritativeEtag: string;
      matchedToken: string;
      outcome: "MATCH";
    }
  | {
      authoritativeEtag: string;
      outcome: "MISSING";
      reasonCodes: ["IF_MATCH_REQUIRED"];
    }
  | {
      authoritativeEtag: string;
      outcome: "MISMATCH";
      reasonCodes: ["IF_MATCH_PRECONDITION_FAILED"];
    }
  | {
      authoritativeEtag: string;
      outcome: "INVALID";
      reasonCodes: ["IF_MATCH_INVALID"];
    };

function normalizeStrongEntityTag(token: string) {
  const trimmed = token.trim();
  if (trimmed.length === 0 || trimmed.startsWith("W/")) {
    return null;
  }
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    const unquoted = trimmed.slice(1, -1);
    return unquoted.length > 0 ? unquoted : null;
  }
  return trimmed;
}

export function parseIfMatchStrongTokens(ifMatch: string) {
  const tokens = ifMatch.split(",").map((token) => token.trim());
  if (tokens.length === 0 || tokens.some((token) => token.length === 0)) {
    return null;
  }
  if (tokens.includes("*")) {
    return tokens.length === 1 ? ["*"] : null;
  }
  const normalized = tokens.map(normalizeStrongEntityTag);
  if (normalized.some((token) => token === null)) {
    return null;
  }
  return normalized as string[];
}

export function validateIfMatchAgainstAuthoritativeGuard(input: {
  authoritative: AuthoritativeEtagBasis | string;
  ifMatch?: string | null;
  requireIfMatch?: boolean;
  resourceExists?: boolean;
}): IfMatchValidationResult {
  const authoritativeEtag =
    typeof input.authoritative === "string"
      ? input.authoritative
      : deriveAuthoritativeEtag(input.authoritative);
  if (authoritativeEtag.trim().length === 0) {
    throw new Error("authoritative If-Match ETag cannot be empty");
  }

  if (input.ifMatch === undefined || input.ifMatch === null) {
    if (input.requireIfMatch === true) {
      return {
        authoritativeEtag,
        outcome: "MISSING",
        reasonCodes: ["IF_MATCH_REQUIRED"],
      };
    }
    return {
      authoritativeEtag,
      matchedToken: authoritativeEtag,
      outcome: "MATCH",
    };
  }

  const tokens = parseIfMatchStrongTokens(input.ifMatch);
  if (tokens === null) {
    return {
      authoritativeEtag,
      outcome: "INVALID",
      reasonCodes: ["IF_MATCH_INVALID"],
    };
  }
  if (tokens.includes("*")) {
    return input.resourceExists === false
      ? {
          authoritativeEtag,
          outcome: "MISMATCH",
          reasonCodes: ["IF_MATCH_PRECONDITION_FAILED"],
        }
      : {
          authoritativeEtag,
          matchedToken: "*",
          outcome: "MATCH",
        };
  }
  const matchedToken = tokens.find((token) => token === authoritativeEtag);
  if (matchedToken !== undefined) {
    return {
      authoritativeEtag,
      matchedToken,
      outcome: "MATCH",
    };
  }
  return {
    authoritativeEtag,
    outcome: "MISMATCH",
    reasonCodes: ["IF_MATCH_PRECONDITION_FAILED"],
  };
}

