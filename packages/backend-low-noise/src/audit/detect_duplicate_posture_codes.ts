import type { LowNoiseBudgetAudit } from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import type { LowNoiseFrameSurfaces } from "../models/low_noise_frame.ts";

function normalizedVisibleText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.split(/\s+/u).join(" ").trim().toLocaleLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function duplicateValues(values: string[]) {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const value of values) {
    if (seen.has(value) && !duplicates.includes(value)) {
      duplicates.push(value);
    }
    seen.add(value);
  }
  return duplicates;
}

export function detectDuplicatePostureCodes(input: LowNoiseFrameSurfaces) {
  const duplicateCodes: LowNoiseBudgetAudit["duplicate_posture_codes"] = [];
  const limitationTexts = [
    normalizedVisibleText(input.context_bar.limitation_statement),
    normalizedVisibleText(input.decision_summary.limitation_statement),
  ].filter((value): value is string => value !== null);
  if (duplicateValues(limitationTexts).length > 0) {
    duplicateCodes.push("LIMITATION_STATEMENT_DUPLICATED");
  }

  const blockingTexts = [
    normalizedVisibleText(input.decision_summary.blocking_reason),
    normalizedVisibleText(input.action_strip.blocking_reason),
  ].filter((value): value is string => value !== null);
  if (duplicateValues(blockingTexts).length > 0) {
    duplicateCodes.push("BLOCKING_REASON_DUPLICATED");
  }

  const repeatedReferenceTexts = new Set(
    [
      normalizedVisibleText(input.context_bar.limitation_statement),
      normalizedVisibleText(input.decision_summary.limitation_statement),
      normalizedVisibleText(input.decision_summary.blocking_reason),
      normalizedVisibleText(input.action_strip.blocking_reason),
    ].filter((value): value is string => value !== null),
  );
  const detailEntryReasons = input.detail_drawer.entry_points
    .map((entry) => normalizedVisibleText(entry.entry_reason))
    .filter((value): value is string => value !== null);
  if (
    duplicateValues(detailEntryReasons).length > 0 ||
    detailEntryReasons.some((value) => repeatedReferenceTexts.has(value))
  ) {
    duplicateCodes.push("DETAIL_ENTRY_REASON_DUPLICATED");
  }
  return duplicateCodes;
}
