import {
  type ClientTimelineAuthorityTruthState,
  type ClientTimelineEventKind,
  ClientTimelineEventProjectionError,
} from "../types.ts";
import { portalLanguageContract } from "../contracts/portal_language_contract.ts";
import { portalLanguageLeakMarkers } from "./filter_portal_vocabulary.ts";

const confirmingAuthorityCopyMarkers = [
  "accepted",
  "approved",
  "complete",
  "completed",
  "confirmed",
  "filed",
  "settled",
  "successful",
  "successfully",
] as const;

function lower(value: string) {
  return value.trim().toLowerCase();
}

export function clientTimelineConfirmingCopyMarkers(value: string) {
  const text = lower(value);
  return confirmingAuthorityCopyMarkers.filter((marker) => text.includes(marker));
}

export function clientTimelineForbiddenCopyMarkers(value: string) {
  return portalLanguageLeakMarkers(value);
}

function assertLength(label: string, value: string, maxLength: number) {
  if (value.trim().length === 0 || value.length > maxLength) {
    throw new ClientTimelineEventProjectionError(`${label} violates portal copy budget`, [
      "CLIENT_TIMELINE_COPY_BUDGET_EXCEEDED",
    ]);
  }
}

export function assertClientTimelineCopyIsCustomerSafe(input: {
  eventKind: ClientTimelineEventKind;
  field: "detail" | "headline";
  maxLength: number;
  text: string;
}) {
  assertLength(input.field, input.text, input.maxLength);
  const forbidden = clientTimelineForbiddenCopyMarkers(input.text);
  if (forbidden.length > 0) {
    throw new ClientTimelineEventProjectionError(
      `client timeline ${input.field} leaks internal portal vocabulary`,
      ["CLIENT_TIMELINE_INTERNAL_LANGUAGE"],
    );
  }
}

export function assertClientTimelineHeadlineAuthorityCopy(input: {
  authorityTruthState: ClientTimelineAuthorityTruthState;
  eventKind: ClientTimelineEventKind;
  headline: string;
}) {
  assertClientTimelineCopyIsCustomerSafe({
    eventKind: input.eventKind,
    field: "headline",
    maxLength: portalLanguageContract.copy_budget.timeline_headline_max_chars,
    text: input.headline,
  });

  if (input.eventKind !== "STATUS_UPDATED" && input.eventKind !== "SUBMISSION_SENT") {
    return;
  }

  const confirmingMarkers = clientTimelineConfirmingCopyMarkers(input.headline);
  if (input.authorityTruthState !== "CONFIRMED" && confirmingMarkers.length > 0) {
    throw new ClientTimelineEventProjectionError(
      "non-confirmed authority truth must not publish confirming client timeline copy",
      ["CLIENT_TIMELINE_AUTHORITY_COPY_OVERSTATED"],
    );
  }

  if (
    input.authorityTruthState !== "CONFIRMED" &&
    input.authorityTruthState !== "NOT_APPLICABLE" &&
    lower(input.headline) === "status updated"
  ) {
    throw new ClientTimelineEventProjectionError(
      "unresolved authority truth must not collapse into generic status copy",
      ["CLIENT_TIMELINE_AUTHORITY_COPY_GENERIC"],
    );
  }
}

export function deriveClientTimelineHeadline(input: {
  authorityTruthState: ClientTimelineAuthorityTruthState;
  eventKind: ClientTimelineEventKind;
  headlineOverride?: string | null | undefined;
}) {
  const override = input.headlineOverride?.trim();
  if (override) {
    assertClientTimelineHeadlineAuthorityCopy({
      authorityTruthState: input.authorityTruthState,
      eventKind: input.eventKind,
      headline: override,
    });
    return override;
  }

  const headline = (() => {
    switch (input.eventKind) {
      case "APPROVAL_READY":
        return "Approval ready to review";
      case "APPROVAL_SIGNED":
        return "Approval signed";
      case "ONBOARDING_STEP_COMPLETED":
        return "Onboarding step completed";
      case "SUBMISSION_SENT":
        return "Submission sent, awaiting acknowledgement";
      case "UPLOAD_RECEIVED":
        return "Document received";
      case "UPLOAD_REJECTED":
        return "Document needs a replacement";
      case "STATUS_UPDATED":
        switch (input.authorityTruthState) {
          case "CONFIRMED":
            return "Authority confirmed the submission";
          case "NOT_APPLICABLE":
            return "Status updated";
          case "NOT_REQUESTED":
            return "Submission has not been sent";
          case "OUT_OF_BAND":
            return "External authority state needs review";
          case "PARTIAL_ACK":
            return "Authority acknowledgement is partial";
          case "PENDING_ACK":
            return "Waiting for authority acknowledgement";
          case "REJECTED":
            return "Authority rejected the submission";
          case "UNKNOWN":
            return "Authority outcome needs review";
        }
    }
  })();

  assertClientTimelineHeadlineAuthorityCopy({
    authorityTruthState: input.authorityTruthState,
    eventKind: input.eventKind,
    headline,
  });
  return headline;
}
