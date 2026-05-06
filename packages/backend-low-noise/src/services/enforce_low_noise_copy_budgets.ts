import { lowNoiseCopyBudget } from "../models/low_noise_frame.ts";

export const lowNoisePublicationCopyCaps = {
  actionLabel: Math.min(40, lowNoiseCopyBudget.action_label_max_chars),
  blockingReason: Math.min(96, lowNoiseCopyBudget.blocking_reason_max_chars),
  contextLabel: Math.min(24, lowNoiseCopyBudget.context_label_max_chars),
  detailEntryReason: Math.min(120, lowNoiseCopyBudget.detail_entry_reason_max_chars),
  detailEntryLabel: Math.min(48, lowNoiseCopyBudget.detail_entry_label_max_chars),
  detailSummary: Math.min(72, lowNoiseCopyBudget.detail_entry_reason_max_chars),
  explanation: Math.min(120, lowNoiseCopyBudget.explanation_max_chars),
  headline: Math.min(72, lowNoiseCopyBudget.headline_max_chars),
  manifestLabel: Math.min(48, lowNoiseCopyBudget.manifest_label_max_chars),
  ownerLabel: Math.min(32, lowNoiseCopyBudget.context_label_max_chars),
  reasonLabel: Math.min(80, lowNoiseCopyBudget.reason_label_max_chars),
  uncertainty: Math.min(80, lowNoiseCopyBudget.uncertainty_max_chars),
} as const;

export type LowNoiseCopyBudgetField = keyof typeof lowNoisePublicationCopyCaps;

export function compactLowNoiseText(value: string | null | undefined, fallback: string) {
  const normalized = (value ?? fallback).split(/\s+/u).join(" ").trim();
  const fallbackText = fallback.split(/\s+/u).join(" ").trim();
  return normalized.length > 0 ? normalized : fallbackText;
}

export function enforceLowNoiseCopyBudget(
  value: string | null | undefined,
  field: LowNoiseCopyBudgetField,
  fallback: string,
) {
  const maxChars = lowNoisePublicationCopyCaps[field];
  const text = compactLowNoiseText(value, fallback);
  return text.length <= maxChars ? text : text.slice(0, maxChars).trimEnd();
}

export function requireLowNoiseString(label: string, value: string) {
  if (value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

export function requireLowNoiseNonNegativeInteger(label: string, value: number) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
  return value;
}

export function uniqueLowNoiseStrings(values: readonly string[]) {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}
