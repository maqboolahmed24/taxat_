export type DecisionBundleConditionalRequestResult =
  | {
      etag: string;
      status: "NOT_MODIFIED";
    }
  | {
      etag: string;
      status: "SEND_BODY";
    };

import { deriveAuthoritativeEtag } from "./derive_authoritative_etag.ts";

function normalizeIfNoneMatchToken(token: string) {
  const trimmed = token.trim();
  if (trimmed.startsWith("W/")) {
    return null;
  }
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function applyDecisionBundleConditionalRequest(input: {
  currentDecisionBundleHash: string;
  ifNoneMatch?: string | null;
}): DecisionBundleConditionalRequestResult {
  const etag = deriveAuthoritativeEtag({
    basis: "GUARD_VALUE",
    staleGuardFamily: "DECISION_BUNDLE_HASH",
    value: input.currentDecisionBundleHash,
  });
  if (input.ifNoneMatch === undefined || input.ifNoneMatch === null) {
    return {
      etag,
      status: "SEND_BODY",
    };
  }

  const matches = input.ifNoneMatch
    .split(",")
    .map(normalizeIfNoneMatchToken)
    .some((token) => token === etag);

  return {
    etag,
    status: matches ? "NOT_MODIFIED" : "SEND_BODY",
  };
}
