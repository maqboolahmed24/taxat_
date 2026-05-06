import { PortalLanguageContractProjectionError } from "../types.ts";

const portalDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

export function isClearPortalDueLabel(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }
  if (value === "No deadline yet") {
    return true;
  }
  if (value.startsWith("Due ") || value.startsWith("Overdue ")) {
    return [...value].some((character) => /\d/.test(character));
  }
  return false;
}

function formatPortalDate(value: string) {
  const epoch = Date.parse(value);
  if (Number.isNaN(epoch)) {
    throw new PortalLanguageContractProjectionError(
      "portal due labels require a parseable due_at instant",
      ["PORTAL_DUE_LABEL_INVALID_DUE_AT"],
    );
  }
  return portalDateFormatter.format(new Date(epoch));
}

export function deriveClearDueLabel(input: {
  dueAt?: string | null | undefined;
  dueLabel?: string | null | undefined;
  now?: string | undefined;
}): string {
  const explicitLabel = input.dueLabel?.trim();
  if (explicitLabel) {
    if (isClearPortalDueLabel(explicitLabel)) {
      return explicitLabel;
    }
    throw new PortalLanguageContractProjectionError(
      "portal due labels must use `Due ...`, `Overdue ...`, or `No deadline yet`",
      ["PORTAL_DUE_LABEL_NOT_CLEAR"],
    );
  }
  if (!input.dueAt) {
    return "No deadline yet";
  }
  const dueEpoch = Date.parse(input.dueAt);
  const nowEpoch = input.now === undefined ? NaN : Date.parse(input.now);
  if (Number.isNaN(dueEpoch)) {
    throw new PortalLanguageContractProjectionError(
      "portal due labels require a parseable due_at instant",
      ["PORTAL_DUE_LABEL_INVALID_DUE_AT"],
    );
  }
  const prefix = !Number.isNaN(nowEpoch) && dueEpoch < nowEpoch ? "Overdue" : "Due";
  return `${prefix} ${formatPortalDate(input.dueAt)}`;
}

export function assertClearPortalDueLabel(input: {
  fieldName?: string | undefined;
  value: unknown;
}): asserts input is { fieldName?: string | undefined; value: string } {
  if (isClearPortalDueLabel(input.value)) {
    return;
  }
  throw new PortalLanguageContractProjectionError(
    `${input.fieldName ?? "portal due label"} must use explicit due-label wording`,
    ["PORTAL_DUE_LABEL_NOT_CLEAR"],
  );
}
