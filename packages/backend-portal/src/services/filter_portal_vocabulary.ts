import { PortalLanguageContractProjectionError } from "../types.ts";

export const PORTAL_LANGUAGE_FORBIDDEN_TEXT_FRAGMENTS = {
  assignee: "assignment state",
  assigned: "assignment state",
  escalat: "escalation logic",
  audit: "audit lineage",
  override: "override logic",
  gate: "raw gate language",
  reviewer: "staff role vocabulary",
  staff: "staff role vocabulary",
  sla: "internal deadline acronym",
  "internal-only": "internal visibility language",
  "internal only": "internal visibility language",
  manifest: "manifest language",
  workflow: "workflow language",
  rebase: "stale/rebase jargon",
  stale: "stale/rebase jargon",
  operator: "operator-role language",
  queue: "queue language",
} as const;

export type PortalVocabularyLeak = {
  fragment: keyof typeof PORTAL_LANGUAGE_FORBIDDEN_TEXT_FRAGMENTS;
  marker: (typeof PORTAL_LANGUAGE_FORBIDDEN_TEXT_FRAGMENTS)[keyof typeof PORTAL_LANGUAGE_FORBIDDEN_TEXT_FRAGMENTS];
};

export function filterPortalVocabulary(value: unknown): PortalVocabularyLeak[] {
  if (typeof value !== "string" || value.length === 0) {
    return [];
  }
  const normalized = value.toLocaleLowerCase("en-GB");
  return Object.entries(PORTAL_LANGUAGE_FORBIDDEN_TEXT_FRAGMENTS)
    .filter(([fragment]) => normalized.includes(fragment))
    .map(([fragment, marker]) => ({
      fragment: fragment as keyof typeof PORTAL_LANGUAGE_FORBIDDEN_TEXT_FRAGMENTS,
      marker:
        marker as (typeof PORTAL_LANGUAGE_FORBIDDEN_TEXT_FRAGMENTS)[keyof typeof PORTAL_LANGUAGE_FORBIDDEN_TEXT_FRAGMENTS],
    }));
}

export function portalLanguageLeakMarkers(value: unknown): string[] {
  return [...new Set(filterPortalVocabulary(value).map((leak) => leak.marker))].sort();
}

export function assertPortalVocabularyAllowed(input: {
  fieldName?: string | undefined;
  value: unknown;
}) {
  const leakedMarkers = portalLanguageLeakMarkers(input.value);
  if (leakedMarkers.length === 0) {
    return;
  }
  throw new PortalLanguageContractProjectionError(
    `${input.fieldName ?? "portal copy"} must stay in client-safe portal language`,
    ["PORTAL_COPY_FORBIDDEN_VOCABULARY"],
  );
}
