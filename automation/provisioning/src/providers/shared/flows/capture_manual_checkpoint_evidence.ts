import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Locator, Page } from "@playwright/test";

import {
  appendEvidenceRecord,
  createEvidenceManifest,
  type EvidenceManifest,
} from "../../../core/evidence_manifest.js";
import {
  createManualCheckpoint,
  type ManualCheckpointReason,
  type ReentryPolicy,
} from "../../../core/manual_checkpoint.js";
import {
  summarizeRunContext,
  type RunContext,
  type RunContextSummary,
} from "../../../core/run_context.js";
import { createDefaultRedactionRules, redactText } from "../../../core/redaction.js";
import { FileResumeStore } from "../../../core/resume_store.js";
import {
  attachManualCheckpoint,
  createPendingStep,
  transitionStep,
  type StepContract,
} from "../../../core/step_contract.js";

export const MANUAL_PORTAL_CHECKPOINT_FLOW_ID = "portal-manual-checkpoint-capture";
export const MANUAL_CHECKPOINT_POLICY_VERSION = "1.0";
export const MANUAL_CHECKPOINT_POLICY_GENERATED_ON = "2026-04-18";

export const MANUAL_CHECKPOINT_STEP_IDS = {
  openCheckpointSurface: "shared.portal-checkpoint.open-surface",
  captureSanitizedEvidence: "shared.portal-checkpoint.capture-sanitized-evidence",
  persistCheckpointArtifacts: "shared.portal-checkpoint.persist-artifacts",
} as const;

export const REQUIRED_MANUAL_CHECKPOINT_REASON_CODES = [
  "CAPTCHA",
  "MFA_REQUIRED",
  "STEP_UP_REQUIRED",
  "EMAIL_VERIFICATION_REQUIRED",
  "DEVICE_APPROVAL_REQUIRED",
  "SUSPICIOUS_LOGIN_REVIEW",
  "HUMAN_CONFIRMATION_REQUIRED",
  "PORTAL_POLICY_BLOCK",
  "UNKNOWN_CHALLENGE_REVIEW_REQUIRED",
] as const;

export type ManualPortalCheckpointReasonCode =
  (typeof REQUIRED_MANUAL_CHECKPOINT_REASON_CODES)[number];

export type ManualCheckpointFamily =
  | "ANTI_BOT"
  | "IDENTITY_STEP_UP"
  | "VERIFICATION"
  | "HUMAN_APPROVAL"
  | "PORTAL_POLICY"
  | "UNKNOWN_REVIEW";

export type CheckpointSeverity =
  | "REVIEW_REQUIRED"
  | "ACTION_REQUIRED"
  | "BLOCKING";

export interface SourceRef {
  source_ref: string;
  rationale: string;
}

export interface ManualCheckpointReasonCodeRow {
  reason_code: ManualPortalCheckpointReasonCode;
  family: ManualCheckpointFamily;
  default_severity: CheckpointSeverity;
  mapped_core_reason: ManualCheckpointReason;
  default_resume_policy_ref: string;
  portal_safe_summary: string;
  operator_summary: string;
  detection_phrases: string[];
  source_refs: SourceRef[];
  notes: string[];
}

export interface ManualCheckpointReasonCodes {
  schema_version: "1.0";
  policy_id: "manual_checkpoint_reason_codes";
  generated_on: typeof MANUAL_CHECKPOINT_POLICY_GENERATED_ON;
  provider_docs_urls: string[];
  reason_rows: ManualCheckpointReasonCodeRow[];
  source_refs: SourceRef[];
  notes: string[];
}

export interface BlockedPortalResumePolicyRow {
  resume_policy_ref: string;
  applies_to_reason_codes: ManualPortalCheckpointReasonCode[];
  human_actor_role: string;
  expected_post_checkpoint_route_requirement: string;
  session_revalidation_requirement:
    | "REQUIRED"
    | "REQUIRED_AND_FAIL_CLOSED_IF_SESSION_ROTATED";
  selector_drift_check_requirement: "REQUIRED";
  safe_noop_verification_step: string;
  timeout_posture:
    | "FAIL_CLOSED_ON_EXPIRY"
    | "FAIL_CLOSED_ON_ROUTE_OR_SESSION_MISMATCH";
  forbidden_actions: string[];
  source_refs: SourceRef[];
  notes: string[];
}

export interface BlockedPortalResumePolicy {
  schema_version: "1.0";
  policy_id: "blocked_portal_resume_policy";
  generated_on: typeof MANUAL_CHECKPOINT_POLICY_GENERATED_ON;
  truth_boundary_statement: string;
  policy_rows: BlockedPortalResumePolicyRow[];
  source_refs: SourceRef[];
  notes: string[];
}

export interface CheckpointRedactionRuleRow {
  rule_ref: string;
  artifact_kind:
    | "SCREENSHOT"
    | "DOM_SNAPSHOT"
    | "TRACE_REFERENCE"
    | "COPY_SNAPSHOT"
    | "BROWSER_STORAGE";
  capture_mode: "REDACTED" | "SUPPRESSED" | "HASH_ONLY" | "REFERENCE_ONLY";
  applies_when: string;
  omitted_or_masked_targets: string[];
  source_refs: SourceRef[];
  notes: string[];
}

export interface CheckpointRedactionPolicy {
  schema_version: "1.0";
  policy_id: "checkpoint_redaction_policy";
  generated_on: typeof MANUAL_CHECKPOINT_POLICY_GENERATED_ON;
  truth_boundary_statement: string;
  rule_rows: CheckpointRedactionRuleRow[];
  source_refs: SourceRef[];
  notes: string[];
}

export interface ManualPortalCheckpointFlowContext {
  recipe_ref: string;
  step_id: string;
  step_title: string;
  safe_last_completed_step_id: string;
  selector_manifest_version: string;
  browser_session_posture: string;
  secret_entry_suppression_active: boolean;
}

export interface ManualPortalCheckpointResumeRequirements {
  resume_policy_ref: string;
  human_actor_role: string;
  expected_post_checkpoint_route_ref: string;
  session_revalidation_requirement:
    | "REQUIRED"
    | "REQUIRED_AND_FAIL_CLOSED_IF_SESSION_ROTATED";
  selector_drift_check_requirement: "REQUIRED";
  safe_noop_verification_step: string;
  timeout_posture:
    | "FAIL_CLOSED_ON_EXPIRY"
    | "FAIL_CLOSED_ON_ROUTE_OR_SESSION_MISMATCH";
  forbidden_actions: string[];
  resume_snapshot_ref_or_null: string | null;
}

export interface ManualPortalCheckpointCoreMapping {
  checkpoint_id: string;
  core_reason: ManualCheckpointReason;
  reentry_policy: ReentryPolicy;
  capture_policy: "REDACT" | "SUPPRESS";
}

export interface ManualPortalCheckpointRecord {
  schema_version: "1.0";
  checkpoint_record_id: "manual_portal_checkpoint_record";
  generated_on: typeof MANUAL_CHECKPOINT_POLICY_GENERATED_ON;
  provider_id: string;
  provider_label: string;
  flow_id: string;
  run_id: string;
  product_environment_id: string;
  provider_environment: RunContext["providerEnvironment"];
  environment_label: string;
  checkpoint_reason_code: ManualPortalCheckpointReasonCode;
  checkpoint_reason_family: ManualCheckpointFamily;
  checkpoint_severity: CheckpointSeverity;
  checkpoint_status: "OPEN";
  opened_at: string;
  checkpoint_expires_at_or_null: string | null;
  portal_route_ref: string;
  page_identity_ref: string;
  page_title_hash_sha256: string;
  url_hash_sha256: string;
  safe_route_fingerprint: string;
  flow_context: ManualPortalCheckpointFlowContext;
  mapped_core_checkpoint: ManualPortalCheckpointCoreMapping;
  reason_code_policy_ref: "config/provisioning/manual_checkpoint_reason_codes.json";
  resume_policy_ref: "config/provisioning/blocked_portal_resume_policy.json";
  redaction_policy_ref: "config/provisioning/checkpoint_redaction_policy.json";
  evidence_pack_ref: string;
  resume_requirements: ManualPortalCheckpointResumeRequirements;
  provider_docs_urls: string[];
  source_refs: SourceRef[];
  typed_gaps: string[];
  notes: string[];
}

export interface ManualCheckpointEvidenceArtifactRow {
  artifact_ref: string;
  artifact_kind:
    | "MASKED_SCREENSHOT"
    | "DOM_SIGNATURE"
    | "TRACE_REFERENCE"
    | "SAFE_COPY_SNAPSHOT";
  capture_mode: "REDACTED" | "SUPPRESSED" | "HASH_ONLY";
  relative_path_or_null: string | null;
  summary: string;
  redaction_notes: string[];
}

export interface ManualCheckpointEvidencePack {
  schema_version: "1.0";
  evidence_pack_id: "manual_checkpoint_evidence_pack";
  checkpoint_record_ref: string;
  run_id: string;
  provider_id: string;
  evidence_root: string;
  page_signature: {
    title_hash_sha256: string;
    url_hash_sha256: string;
    dom_hash_sha256: string;
    safe_route_fingerprint: string;
  };
  safe_copy_snapshot: string;
  artifact_rows: ManualCheckpointEvidenceArtifactRow[];
  provider_docs_urls: string[];
  source_refs: SourceRef[];
  notes: string[];
}

export interface PortalCheckpointTimelineRow {
  label: string;
  detail: string;
}

export interface PortalCheckpointAtlasScenario {
  scenario_ref: string;
  label: string;
  provider_label: string;
  provider_monogram: "HMRC" | "IDP";
  environment_label: string;
  checkpoint_reason_code: ManualPortalCheckpointReasonCode;
  checkpoint_severity_label: "Blocking" | "Action required" | "Review required";
  resume_readiness_label:
    | "Awaiting human step"
    | "Verify before continue"
    | "Expired until reopened";
  summary: string;
  automation_path_rows: PortalCheckpointTimelineRow[];
  checkpoint_rows: PortalCheckpointTimelineRow[];
  human_step_rows: PortalCheckpointTimelineRow[];
  resume_rows: PortalCheckpointTimelineRow[];
  outcome_rows: PortalCheckpointTimelineRow[];
  evidence_rows: PortalCheckpointTimelineRow[];
  redaction_rows: PortalCheckpointTimelineRow[];
  resume_precondition_rows: PortalCheckpointTimelineRow[];
  source_refs: SourceRef[];
}

export interface PortalCheckpointAtlasViewModel {
  provider_label: "Portal checkpoint governance";
  provider_monogram: "PAUSE";
  active_environment_label: string;
  truth_boundary_statement: string;
  scenarios: PortalCheckpointAtlasScenario[];
  notes: string[];
}

export interface CaptureManualCheckpointEvidenceOptions {
  page: Page;
  runContext: RunContext;
  checkpointRecordPath: string;
  evidencePackPath: string;
  resumeRoot?: string;
  entryUrl?: string;
  providerLabel: string;
  environmentLabel: string;
  recipeRef: string;
  stepId: string;
  stepTitle: string;
  safeLastCompletedStepId: string;
  selectorManifestVersion: string;
  browserSessionPosture: string;
  secretEntrySuppressionActive: boolean;
  expectedPostCheckpointRouteRef: string;
  portalRouteRef: string;
  pageIdentityRef: string;
  checkpointReasonCodeOverride?: ManualPortalCheckpointReasonCode;
  additionalSensitiveValues?: string[];
  browserStorageStateRef?: string | null;
  existingSteps?: StepContract[];
}

export interface CaptureManualCheckpointEvidenceResult {
  outcome: "MANUAL_CHECKPOINT_REQUIRED";
  steps: StepContract[];
  checkpointRecord: ManualPortalCheckpointRecord;
  evidencePack: ManualCheckpointEvidencePack;
  evidenceManifestPath: string;
  resumeSnapshotPath: string | null;
  notes: string[];
}

export const MANUAL_CHECKPOINT_PROVIDER_DOCS = [
  "https://developer.service.hmrc.gov.uk/api-documentation/docs/authorisation/two-step-verification",
  "https://developer.service.hmrc.gov.uk/developer/login",
  "https://developer.service.hmrc.gov.uk/developer/registration",
  "https://auth0.com/docs/secure/attack-protection/bot-detection",
  "https://auth0.com/docs/secure/attack-protection/suspicious-ip-throttling",
  "https://auth0.com/docs/secure/multi-factor-authentication/step-up-authentication",
  "https://auth0.com/docs/secure/multi-factor-authentication/adaptive-mfa",
  "https://auth0.com/docs/manage-users/access-control/configure-b2b-enterprise-level-settings",
] as const;

function nowIso(): string {
  return new Date().toISOString();
}

function isoAfterMinutes(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function truthBoundaryStatement(): string {
  return "Blocked portals are lawful pause points, not bypass candidates. Human verification, session revalidation, route revalidation, and stale-step suppression remain explicit before any mutating browser action resumes.";
}

function sharedSourceRefs(): SourceRef[] {
  return [
    {
      source_ref:
        "PROMPT/shared_operating_contract_0046_to_0053.md::Manual checkpoints remain lawful pauses",
      rationale:
        "The shared operating contract requires manual checkpoints to persist durable artifacts, sanitized evidence, and explicit resume rules.",
    },
    {
      source_ref:
        "Algorithm/actor_and_authority_model.md::3.11 Non-delegable and step-up actions",
      rationale:
        "Step-up, CAPTCHA, and human-confirmation actions must fail closed and may not be bypassed by a machine actor.",
    },
    {
      source_ref:
        "Algorithm/northbound_api_and_session_contract.md::step-up session rotation and reconnect rules",
      rationale:
        "Resume artifacts must be revalidated against route identity, session validity, and post-step-up continuity before mutation resumes.",
    },
    {
      source_ref:
        "Algorithm/security_and_runtime_hardening_contract.md::MFA and secret-handling rules",
      rationale:
        "Manual checkpoint evidence must stay sanitized and must not persist one-time codes or other sensitive materials.",
    },
    {
      source_ref:
        "Algorithm/frontend_shell_and_interaction_law.md::stable route keys and reduced-motion selectors",
      rationale:
        "Checkpoint atlases and resume diagnostics must remain automation-verifiable, keyboard reachable, and stable under reduced motion.",
    },
    {
      source_ref:
        "Algorithm/observability_and_audit_contract.md::audit-vs-telemetry separation",
      rationale:
        "Checkpoint artifacts require durable audit-safe structure instead of being buried in ephemeral telemetry noise.",
    },
  ];
}

function providerDocsUrls(): string[] {
  return [...MANUAL_CHECKPOINT_PROVIDER_DOCS];
}

function createReasonCodeRows(): ManualCheckpointReasonCodeRow[] {
  const sourceRefs = sharedSourceRefs();
  return [
    {
      reason_code: "CAPTCHA",
      family: "ANTI_BOT",
      default_severity: "ACTION_REQUIRED",
      mapped_core_reason: "CAPTCHA",
      default_resume_policy_ref: "resume.same-route.after-human-verification",
      portal_safe_summary:
        "Human verification is required before the portal session can continue.",
      operator_summary:
        "Anti-bot or auth-challenge screen detected; automation must stop and await human verification.",
      detection_phrases: [
        "captcha",
        "verify you're human",
        "auth challenge",
        "security check",
      ],
      source_refs: sourceRefs,
      notes: [
        "CAPTCHA and Auth Challenge remain provider-controlled and non-bypassable.",
      ],
    },
    {
      reason_code: "MFA_REQUIRED",
      family: "IDENTITY_STEP_UP",
      default_severity: "BLOCKING",
      mapped_core_reason: "MFA",
      default_resume_policy_ref: "resume.verify-session-and-route.before-mutation",
      portal_safe_summary:
        "A provider-controlled sign-in factor must be completed before the session can continue.",
      operator_summary:
        "A one-time code, authenticator prompt, or equivalent MFA gate is active.",
      detection_phrases: [
        "2-step verification",
        "authenticator app",
        "6-digit code",
        "multi-factor authentication",
      ],
      source_refs: sourceRefs,
      notes: [
        "MFA completion does not authorize stale pre-step-up mutations to replay.",
      ],
    },
    {
      reason_code: "STEP_UP_REQUIRED",
      family: "IDENTITY_STEP_UP",
      default_severity: "BLOCKING",
      mapped_core_reason: "MFA",
      default_resume_policy_ref: "resume.verify-session-and-route.before-mutation",
      portal_safe_summary:
        "The portal requires additional identity assurance before this action can continue.",
      operator_summary:
        "A sensitive step requires stronger identity posture than the pre-checkpoint session currently carries.",
      detection_phrases: [
        "additional verification",
        "step-up",
        "verify your identity",
        "security key",
      ],
      source_refs: sourceRefs,
      notes: [
        "Step-up requirements remain distinct from routine sign-in MFA in the governed reason model.",
      ],
    },
    {
      reason_code: "EMAIL_VERIFICATION_REQUIRED",
      family: "VERIFICATION",
      default_severity: "ACTION_REQUIRED",
      mapped_core_reason: "EMAIL_VERIFICATION",
      default_resume_policy_ref: "resume.same-route.after-human-verification",
      portal_safe_summary:
        "Email verification must complete before the portal session can continue.",
      operator_summary:
        "Provider requires a mailbox verification or activation link before the flow may proceed.",
      detection_phrases: [
        "check your email",
        "verify your email",
        "activation link",
        "verification email",
      ],
      source_refs: sourceRefs,
      notes: [
        "Email-verification pauses may outlive the current browser session and require route revalidation on return.",
      ],
    },
    {
      reason_code: "DEVICE_APPROVAL_REQUIRED",
      family: "VERIFICATION",
      default_severity: "ACTION_REQUIRED",
      mapped_core_reason: "MFA",
      default_resume_policy_ref: "resume.verify-session-and-route.before-mutation",
      portal_safe_summary:
        "Approval on a trusted device or hardware factor is required before continuing.",
      operator_summary:
        "Provider requested push approval, device trust confirmation, or hardware-factor acknowledgement.",
      detection_phrases: [
        "approve on your device",
        "device approval",
        "security key",
        "push notification",
      ],
      source_refs: sourceRefs,
      notes: [
        "Device approval may rotate the session or relocate the post-checkpoint route.",
      ],
    },
    {
      reason_code: "SUSPICIOUS_LOGIN_REVIEW",
      family: "IDENTITY_STEP_UP",
      default_severity: "BLOCKING",
      mapped_core_reason: "HUMAN_REVIEW",
      default_resume_policy_ref: "resume.verify-session-and-route.before-mutation",
      portal_safe_summary:
        "The provider requires a security review before the sign-in may continue.",
      operator_summary:
        "Suspicious-login or unusual-activity review is active and requires human intervention.",
      detection_phrases: [
        "suspicious login",
        "unusual activity",
        "review this sign in",
        "security review",
      ],
      source_refs: sourceRefs,
      notes: [
        "Security-review states must remain separate from selector drift and other automation breakages.",
      ],
    },
    {
      reason_code: "HUMAN_CONFIRMATION_REQUIRED",
      family: "HUMAN_APPROVAL",
      default_severity: "ACTION_REQUIRED",
      mapped_core_reason: "LEGAL_APPROVAL",
      default_resume_policy_ref: "resume.same-route.after-human-verification",
      portal_safe_summary:
        "A provider-controlled human confirmation step must complete before the flow can continue.",
      operator_summary:
        "A human confirmation, approval, or non-delegable acknowledgement is required.",
      detection_phrases: [
        "confirm to continue",
        "human confirmation",
        "approve this action",
        "review and continue",
      ],
      source_refs: sourceRefs,
      notes: [
        "Human confirmation remains distinct from broad policy blocks or suspicious-login review.",
      ],
    },
    {
      reason_code: "PORTAL_POLICY_BLOCK",
      family: "PORTAL_POLICY",
      default_severity: "REVIEW_REQUIRED",
      mapped_core_reason: "POLICY_CONFIRMATION",
      default_resume_policy_ref: "resume.fail-closed.reopen-after-policy-change",
      portal_safe_summary:
        "The provider blocked the current attempt and requires policy review before retrying.",
      operator_summary:
        "Provider policy, rate limit, or account posture blocked the flow before human completion.",
      detection_phrases: [
        "too many attempts",
        "policy block",
        "cannot continue",
        "rate limit",
      ],
      source_refs: sourceRefs,
      notes: [
        "Provider policy blocks may expire or require administrative changes before any safe retry.",
      ],
    },
    {
      reason_code: "UNKNOWN_CHALLENGE_REVIEW_REQUIRED",
      family: "UNKNOWN_REVIEW",
      default_severity: "REVIEW_REQUIRED",
      mapped_core_reason: "HUMAN_REVIEW",
      default_resume_policy_ref: "resume.fail-closed.reopen-after-policy-change",
      portal_safe_summary:
        "The portal presented an unclassified verification gate and the run requires review.",
      operator_summary:
        "Unknown challenge types fail closed into review rather than continuing on heuristics.",
      detection_phrases: [],
      source_refs: sourceRefs,
      notes: [
        "Unknown challenges stay explicit so selector drift and review-required states remain separable.",
      ],
    },
  ];
}

export function createManualCheckpointReasonCodes(): ManualCheckpointReasonCodes {
  return {
    schema_version: MANUAL_CHECKPOINT_POLICY_VERSION,
    policy_id: "manual_checkpoint_reason_codes",
    generated_on: MANUAL_CHECKPOINT_POLICY_GENERATED_ON,
    provider_docs_urls: providerDocsUrls(),
    reason_rows: createReasonCodeRows(),
    source_refs: sharedSourceRefs(),
    notes: [
      "Reason codes are provider-agnostic in the core and map to provider-specific wording only at the adapter edge.",
      "Unknown challenge types must fail closed into explicit review rather than continuing on heuristic guesses.",
    ],
  };
}

export function createBlockedPortalResumePolicy(): BlockedPortalResumePolicy {
  const sourceRefs = sharedSourceRefs();
  return {
    schema_version: MANUAL_CHECKPOINT_POLICY_VERSION,
    policy_id: "blocked_portal_resume_policy",
    generated_on: MANUAL_CHECKPOINT_POLICY_GENERATED_ON,
    truth_boundary_statement: truthBoundaryStatement(),
    policy_rows: [
      {
        resume_policy_ref: "resume.same-route.after-human-verification",
        applies_to_reason_codes: [
          "CAPTCHA",
          "EMAIL_VERIFICATION_REQUIRED",
          "HUMAN_CONFIRMATION_REQUIRED",
        ],
        human_actor_role: "PROVIDER_VERIFIED_OPERATOR",
        expected_post_checkpoint_route_requirement:
          "SAME_ROUTE_OR_PROVIDER_SUCCESSOR_MUST_BE_VISIBLE",
        session_revalidation_requirement: "REQUIRED",
        selector_drift_check_requirement: "REQUIRED",
        safe_noop_verification_step:
          "Verify the current route fingerprint and challenge-complete banner before any new click.",
        timeout_posture: "FAIL_CLOSED_ON_EXPIRY",
        forbidden_actions: [
          "REPLAY_PRE_CHECKPOINT_SUBMIT",
          "REUSE_STALE_FORM_STATE",
          "ENTER_ONE_TIME_CODE_IN_AUTOMATION_LOGS",
        ],
        source_refs: sourceRefs,
        notes: [
          "This policy fits challenges that often return to the same route once a human completes the provider-owned step.",
        ],
      },
      {
        resume_policy_ref: "resume.verify-session-and-route.before-mutation",
        applies_to_reason_codes: [
          "MFA_REQUIRED",
          "STEP_UP_REQUIRED",
          "DEVICE_APPROVAL_REQUIRED",
          "SUSPICIOUS_LOGIN_REVIEW",
        ],
        human_actor_role: "PROVIDER_VERIFIED_OPERATOR",
        expected_post_checkpoint_route_requirement:
          "POST_CHECKPOINT_ROUTE_MUST_MATCH_EXPECTED_SUCCESSOR_OR_FAIL_CLOSED",
        session_revalidation_requirement:
          "REQUIRED_AND_FAIL_CLOSED_IF_SESSION_ROTATED",
        selector_drift_check_requirement: "REQUIRED",
        safe_noop_verification_step:
          "Re-read portal heading, route fingerprint, and signed-in session marker before any mutating action resumes.",
        timeout_posture: "FAIL_CLOSED_ON_ROUTE_OR_SESSION_MISMATCH",
        forbidden_actions: [
          "REPLAY_MUTATING_CLICK_FROM_PRE_STEP_UP_STATE",
          "REUSE_INVALIDATED_SESSION_TOKEN",
          "SKIP_SELECTOR_DRIFT_REVALIDATION",
        ],
        source_refs: sourceRefs,
        notes: [
          "Step-up and suspicious-login challenges may rotate the session or relocate the browser to a different route.",
        ],
      },
      {
        resume_policy_ref: "resume.fail-closed.reopen-after-policy-change",
        applies_to_reason_codes: [
          "PORTAL_POLICY_BLOCK",
          "UNKNOWN_CHALLENGE_REVIEW_REQUIRED",
        ],
        human_actor_role: "SECURITY_OR_PLATFORM_OPERATOR",
        expected_post_checkpoint_route_requirement:
          "REOPEN_FROM_KNOWN_ENTRY_ROUTE_ONLY_AFTER_POLICY_OR_REVIEW_CHANGE",
        session_revalidation_requirement:
          "REQUIRED_AND_FAIL_CLOSED_IF_SESSION_ROTATED",
        selector_drift_check_requirement: "REQUIRED",
        safe_noop_verification_step:
          "Restart from the entry route, verify the previous block is cleared, then adopt the current page state before any mutation.",
        timeout_posture: "FAIL_CLOSED_ON_EXPIRY",
        forbidden_actions: [
          "BLIND_RETRY_ON_SAME_BLOCKED_ROUTE",
          "ASSUME_UNKNOWN_CHALLENGE_IS_SAFE",
          "PROMOTE_TELEMETRY_ONLY_SIGNAL_TO_RESUME_PERMISSION",
        ],
        source_refs: sourceRefs,
        notes: [
          "Unknown or provider-policy blocks stay fail-closed until human review or provider posture changes.",
        ],
      },
    ],
    source_refs: sourceRefs,
    notes: [
      "Every blocked-portal resume starts with idempotent verification reads before any mutating action resumes.",
      "Replay of stale pre-step-up mutations is forbidden across all policies.",
    ],
  };
}

export function createCheckpointRedactionPolicy(): CheckpointRedactionPolicy {
  const sourceRefs = sharedSourceRefs();
  return {
    schema_version: MANUAL_CHECKPOINT_POLICY_VERSION,
    policy_id: "checkpoint_redaction_policy",
    generated_on: MANUAL_CHECKPOINT_POLICY_GENERATED_ON,
    truth_boundary_statement: truthBoundaryStatement(),
    rule_rows: [
      {
        rule_ref: "screenshot.mask-sensitive-fields",
        artifact_kind: "SCREENSHOT",
        capture_mode: "REDACTED",
        applies_when:
          "Visible checkpoint page contains one-time-code, email, password, or device-approval fields.",
        omitted_or_masked_targets: [
          "[data-sensitive='true']",
          "input[type='password']",
          "[autocomplete='one-time-code']",
        ],
        source_refs: sourceRefs,
        notes: [
          "Checkpoint screenshots may exist only when masked; raw challenge answers and mailbox details remain hidden.",
        ],
      },
      {
        rule_ref: "dom.hash-only",
        artifact_kind: "DOM_SNAPSHOT",
        capture_mode: "HASH_ONLY",
        applies_when:
          "A portal checkpoint is open and DOM structure is needed only for route/signature verification.",
        omitted_or_masked_targets: [
          "raw innerHTML",
          "raw form values",
          "challenge responses",
        ],
        source_refs: sourceRefs,
        notes: [
          "The governed posture stores DOM hashes, not raw blocked-portal DOM captures, by default.",
        ],
      },
      {
        rule_ref: "trace.suppressed-by-default",
        artifact_kind: "TRACE_REFERENCE",
        capture_mode: "SUPPRESSED",
        applies_when:
          "Challenge screens are present or secret-entry suppression mode is active.",
        omitted_or_masked_targets: [
          "Playwright trace archive",
          "network payloads",
          "session cookies",
        ],
        source_refs: sourceRefs,
        notes: [
          "Trace retention is suppressed unless a future provider-specific adapter proves a safe redacted path.",
        ],
      },
      {
        rule_ref: "copy.redact-mailbox-and-otp",
        artifact_kind: "COPY_SNAPSHOT",
        capture_mode: "REDACTED",
        applies_when:
          "Provider copy includes mailbox hints, one-time codes, or personal identifiers.",
        omitted_or_masked_targets: [
          "email addresses",
          "6-digit codes",
          "device nicknames tagged as sensitive",
        ],
        source_refs: sourceRefs,
        notes: [
          "Safe copy snapshots are retained only after redaction and truncation.",
        ],
      },
      {
        rule_ref: "browser-storage.reference-only",
        artifact_kind: "BROWSER_STORAGE",
        capture_mode: "REFERENCE_ONLY",
        applies_when:
          "A resume snapshot references browser storage state or session materials.",
        omitted_or_masked_targets: [
          "cookies",
          "local storage values",
          "storage-state JSON bodies",
        ],
        source_refs: sourceRefs,
        notes: [
          "Browser storage remains secret-boundary material and may only appear as a vault or resume ref.",
        ],
      },
    ],
    source_refs: sourceRefs,
    notes: [
      "Screenshot capture, DOM capture, traces, and browser storage each have distinct checkpoint redaction posture.",
      "One-time codes and equivalent human-verification answers remain forbidden in repo-tracked evidence.",
    ],
  };
}

function reasonCodeMap(): Map<
  ManualPortalCheckpointReasonCode,
  ManualCheckpointReasonCodeRow
> {
  return new Map(
    createManualCheckpointReasonCodes().reason_rows.map((row) => [
      row.reason_code,
      row,
    ]),
  );
}

function resumePolicyMap(): Map<string, BlockedPortalResumePolicyRow> {
  return new Map(
    createBlockedPortalResumePolicy().policy_rows.map((row) => [
      row.resume_policy_ref,
      row,
    ]),
  );
}

export function detectCheckpointReasonCodeFromText(
  text: string,
): ManualPortalCheckpointReasonCode {
  const normalized = text.toLowerCase();
  for (const row of createManualCheckpointReasonCodes().reason_rows) {
    if (
      row.reason_code === "UNKNOWN_CHALLENGE_REVIEW_REQUIRED" ||
      row.detection_phrases.length === 0
    ) {
      continue;
    }
    if (
      row.detection_phrases.some((phrase) =>
        normalized.includes(phrase.toLowerCase()),
      )
    ) {
      return row.reason_code;
    }
  }
  return "UNKNOWN_CHALLENGE_REVIEW_REQUIRED";
}

function createCheckpointRedactionRules(
  additionalSensitiveValues: readonly string[],
) {
  return [
    ...createDefaultRedactionRules(
      additionalSensitiveValues.filter((value) => value.trim().length > 0),
    ),
    {
      id: "one-time-code",
      category: "SECRET" as const,
      kind: "REGEX" as const,
      pattern: /\b\d{6}\b/g,
      replacement: "[REDACTED_OTP]",
    },
    {
      id: "ipv4-address",
      category: "PII" as const,
      kind: "REGEX" as const,
      pattern:
        /\b(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}\b/g,
      replacement: "[REDACTED_IP]",
    },
  ];
}

function maskLocators(page: Page): Locator[] {
  return [
    page.locator("[data-sensitive='true']"),
    page.locator("[autocomplete='one-time-code']"),
    page.locator("input[type='password']"),
  ];
}

async function persistJson(filePath: string, payload: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function evidenceManifestPathFor(checkpointRecordPath: string): string {
  return path.join(
    path.dirname(checkpointRecordPath),
    "manual_checkpoint_evidence_manifest.json",
  );
}

function relativePathOrNull(baseDir: string, targetPath: string | null): string | null {
  if (!targetPath) {
    return null;
  }
  return path.relative(baseDir, targetPath);
}

async function readPageSignals(page: Page) {
  const body = page.locator("body");
  const pageTitle = await page.title();
  const bodyText = await body.innerText();
  const pageHtml = await page.content();
  const routeRefAttr =
    (await body.getAttribute("data-route-ref")) ?? "provider.portal.blocked";
  const pageIdentityAttr =
    (await body.getAttribute("data-page-identity")) ?? "blocked-portal";
  const reasonCodeAttr = await body.getAttribute("data-checkpoint-reason-code");
  const expectedPostRouteAttr =
    (await body.getAttribute("data-post-checkpoint-route")) ??
    "provider.portal.post-checkpoint";
  const challengeHeadline =
    (await body.getAttribute("data-challenge-headline")) ?? pageTitle;

  return {
    pageTitle,
    bodyText,
    pageHtml,
    routeRefAttr,
    pageIdentityAttr,
    reasonCodeAttr,
    expectedPostRouteAttr,
    challengeHeadline,
  };
}

function resolveReasonCode(
  explicit: string | null,
  bodyText: string,
  override?: ManualPortalCheckpointReasonCode,
): ManualPortalCheckpointReasonCode {
  if (override) {
    return override;
  }
  if (
    explicit &&
    REQUIRED_MANUAL_CHECKPOINT_REASON_CODES.includes(
      explicit as ManualPortalCheckpointReasonCode,
    )
  ) {
    return explicit as ManualPortalCheckpointReasonCode;
  }
  return detectCheckpointReasonCodeFromText(bodyText);
}

function safeRouteFingerprint(
  urlValue: string,
  pageIdentityRef: string,
): string {
  try {
    const parsed = new URL(urlValue);
    const queryKeys = [...parsed.searchParams.keys()].sort().join(",");
    return `${parsed.host}${parsed.pathname}|keys=${queryKeys}|page=${pageIdentityRef}`;
  } catch {
    return `local-fixture|page=${pageIdentityRef}`;
  }
}

function checkpointSeverityLabel(severity: CheckpointSeverity):
  | "Blocking"
  | "Action required"
  | "Review required" {
  if (severity === "BLOCKING") {
    return "Blocking";
  }
  if (severity === "ACTION_REQUIRED") {
    return "Action required";
  }
  return "Review required";
}

function buildPortalCheckpointAtlasScenario(
  scenarioRef: string,
  label: string,
  providerLabel: string,
  providerMonogram: "HMRC" | "IDP",
  environmentLabel: string,
  reasonCode: ManualPortalCheckpointReasonCode,
  resumeReadinessLabel:
    | "Awaiting human step"
    | "Verify before continue"
    | "Expired until reopened",
  summary: string,
  automationPath: string[],
  checkpointRows: string[],
  humanStepRows: string[],
  resumeRows: string[],
  outcomeRows: string[],
  evidenceRows: string[],
  redactionRows: string[],
  resumePreconditionRows: string[],
): PortalCheckpointAtlasScenario {
  const reasonRow = reasonCodeMap().get(reasonCode);
  if (!reasonRow) {
    throw new Error(`Unknown reason code ${reasonCode}`);
  }
  const toRows = (values: string[]): PortalCheckpointTimelineRow[] =>
    values.map((value, index) => ({
      label: `${index + 1}. ${value.split(":")[0]}`,
      detail: value.includes(":")
        ? value.slice(value.indexOf(":") + 1).trim()
        : value,
    }));

  return {
    scenario_ref: scenarioRef,
    label,
    provider_label: providerLabel,
    provider_monogram: providerMonogram,
    environment_label: environmentLabel,
    checkpoint_reason_code: reasonCode,
    checkpoint_severity_label: checkpointSeverityLabel(
      reasonRow.default_severity,
    ),
    resume_readiness_label: resumeReadinessLabel,
    summary,
    automation_path_rows: toRows(automationPath),
    checkpoint_rows: toRows(checkpointRows),
    human_step_rows: toRows(humanStepRows),
    resume_rows: toRows(resumeRows),
    outcome_rows: toRows(outcomeRows),
    evidence_rows: toRows(evidenceRows),
    redaction_rows: toRows(redactionRows),
    resume_precondition_rows: toRows(resumePreconditionRows),
    source_refs: sharedSourceRefs(),
  };
}

export function createPortalCheckpointAtlasViewModel(): PortalCheckpointAtlasViewModel {
  return {
    provider_label: "Portal checkpoint governance",
    provider_monogram: "PAUSE",
    active_environment_label: "Shared provisioning environments",
    truth_boundary_statement: truthBoundaryStatement(),
    scenarios: [
      buildPortalCheckpointAtlasScenario(
        "hmrc.sign-in.mfa",
        "HMRC sign-in 2-step verification",
        "HMRC Developer Hub",
        "HMRC",
        "Shared sandbox integration",
        "MFA_REQUIRED",
        "Verify before continue",
        "A provider-owned MFA interstitial blocks sign-in until a human completes the factor and the resumed browser state is revalidated.",
        [
          "Recipe step: Developer Hub sign-in submitted credentials and awaited Applications or checkpoint state.",
          "Last safe step: Credentials were entered, but no post-sign-in mutation ran after the checkpoint surfaced.",
        ],
        [
          "Checkpoint reason: A 2-step verification challenge appeared after sign-in submission.",
          "Pause posture: Automation stopped with a durable checkpoint instead of polling or replaying the submit.",
        ],
        [
          "Human action: Complete the provider-owned MFA factor outside automation.",
          "Human role: Provider-verified operator only; no machine actor enters the one-time code.",
        ],
        [
          "Resume verification: Confirm route fingerprint, heading, and session state before any further navigation.",
          "Selector drift: Revalidate semantic locators before continuing to Applications.",
        ],
        [
          "Outcome: Continue only from a no-op verification step; stale mutating steps remain forbidden.",
        ],
        [
          "Masked screenshot: Allowed with OTP and mailbox fields masked.",
          "DOM signature: Stored as hash only, not raw markup.",
        ],
        [
          "Trace posture: Suppressed by default when challenge screens are visible.",
          "Secret posture: One-time codes and browser storage stay outside repo-tracked evidence.",
        ],
        [
          "Precondition: Session still valid after MFA.",
          "Precondition: Expected post-checkpoint route or provider successor is visible.",
          "Precondition: No stale submit action is replayed.",
        ],
      ),
      buildPortalCheckpointAtlasScenario(
        "hmrc.activation.email",
        "HMRC developer-account activation",
        "HMRC Developer Hub",
        "HMRC",
        "Shared sandbox integration",
        "EMAIL_VERIFICATION_REQUIRED",
        "Awaiting human step",
        "Email activation pauses may outlive the current session, so the resumed run must verify route identity instead of assuming the browser is still current.",
        [
          "Recipe step: Registration submitted account details and awaited activation or Applications.",
          "Last safe step: Account creation request completed; no follow-on workspace mutation ran.",
        ],
        [
          "Checkpoint reason: Activation email verification is required.",
          "Pause posture: The run captured the checkpoint and persisted a resume snapshot.",
        ],
        [
          "Human action: Open the activation link in provider-controlled email and finish verification.",
          "Human role: Provider-verified operator with access to the approved mailbox.",
        ],
        [
          "Resume verification: Confirm the portal is on the expected post-activation route.",
          "Session verification: Re-check whether the original session survived or needs a fresh sign-in.",
        ],
        [
          "Outcome: Continue only after verifying the current page state; blind continuation is forbidden.",
        ],
        [
          "Copy snapshot: Provider wording is retained only after mailbox and link hints are redacted.",
          "Screenshot: Allowed in masked form because mailbox details are sensitive.",
        ],
        [
          "Mailbox redaction: Email addresses remain redacted in safe-copy evidence.",
          "Storage posture: Resume snapshot stores browser state by reference only.",
        ],
        [
          "Precondition: Activation state changed from pending to cleared.",
          "Precondition: Expected successor route or Applications area is visible.",
        ],
      ),
      buildPortalCheckpointAtlasScenario(
        "idp.bot-detection.auth-challenge",
        "Auth0 bot-detection auth challenge",
        "External identity dashboard",
        "IDP",
        "Shared sandbox integration",
        "CAPTCHA",
        "Awaiting human step",
        "Anti-bot challenges are lawful stops, not bypass targets, and the resumed flow must verify the same route before any new click.",
        [
          "Recipe step: Auth0 dashboard sign-in reached a provider auth challenge after credential submission.",
          "Last safe step: No tenant or client mutation occurred before the challenge.",
        ],
        [
          "Checkpoint reason: CAPTCHA or auth challenge surfaced as the dominant challenge family.",
          "Pause posture: Automation persisted masked evidence and a route fingerprint.",
        ],
        [
          "Human action: Complete the provider challenge directly in the portal.",
          "Human role: Provider-verified operator; no machine actor solves or proxies the challenge.",
        ],
        [
          "Resume verification: Reload or re-read the current page and verify the challenge is cleared.",
          "Selector drift: Confirm semantic locator stability before continuing to tenant setup.",
        ],
        [
          "Outcome: Resume from an idempotent verification read, not from a replayed submit.",
        ],
        [
          "Masked screenshot: Challenge shell retained with sensitive fields and any one-time values masked.",
          "Safe route fingerprint: Only host, path, and query-key names survive into evidence.",
        ],
        [
          "Trace posture: Suppressed by default across auth challenges.",
          "DOM posture: Hash-only to prevent raw challenge markup leaking into evidence.",
        ],
        [
          "Precondition: Challenge-cleared banner or known successor route is visible.",
          "Precondition: Session and tenant-selection posture are still valid.",
        ],
      ),
      buildPortalCheckpointAtlasScenario(
        "idp.step-up.device-approval",
        "Auth0 step-up device approval",
        "External identity dashboard",
        "IDP",
        "Preproduction verification",
        "DEVICE_APPROVAL_REQUIRED",
        "Verify before continue",
        "Device approval and step-up gates may rotate the session or land on a new route, so resume requires stronger revalidation than a same-page CAPTCHA.",
        [
          "Recipe step: Sensitive admin action triggered a stronger verification demand.",
          "Last safe step: Mutation intent exists, but no mutating click is replayable across the step-up boundary.",
        ],
        [
          "Checkpoint reason: Device approval or equivalent possession-factor challenge detected.",
          "Pause posture: Resume remains blocked until the human device action completes.",
        ],
        [
          "Human action: Approve on trusted device or hardware factor.",
          "Human role: Provider-verified operator with the bound factor.",
        ],
        [
          "Resume verification: Re-check session posture and expected successor route before mutation.",
          "No-op step: Read tenant heading and target object identity before any settings write resumes.",
        ],
        [
          "Outcome: Continue only if the post-checkpoint route matches the expected successor and no stale form state is reused.",
        ],
        [
          "Safe copy: Device nicknames stay masked when marked sensitive by the portal fixture.",
          "Route fingerprint: Query-value data is hashed, not stored raw.",
        ],
        [
          "Device data: Any provider-rendered factor labels marked sensitive are masked in screenshots.",
          "Browser storage: Resume uses refs only, never raw storage-state JSON.",
        ],
        [
          "Precondition: Session survived or was re-established after device approval.",
          "Precondition: Expected post-checkpoint route is visible.",
          "Precondition: Selector drift check passes before any mutation.",
        ],
      ),
      buildPortalCheckpointAtlasScenario(
        "idp.suspicious-login.review",
        "Auth0 suspicious login review",
        "External identity dashboard",
        "IDP",
        "Production",
        "SUSPICIOUS_LOGIN_REVIEW",
        "Verify before continue",
        "Suspicious-login review must remain separate from selector drift and from ordinary MFA; it is a security-review checkpoint with explicit fail-closed resume rules.",
        [
          "Recipe step: Dashboard sign-in hit a suspicious-login review state.",
          "Last safe step: No tenant mutation or client creation occurred beyond the review gate.",
        ],
        [
          "Checkpoint reason: The portal flagged unusual or risky sign-in posture.",
          "Pause posture: A durable checkpoint artifact records the reason family instead of a generic failure.",
        ],
        [
          "Human action: Complete provider review or unblock the account using approved provider controls.",
          "Human role: Security or platform operator with the right review authority.",
        ],
        [
          "Resume verification: Confirm the review is cleared and the session is lawful before continuing.",
          "No-op step: Re-read dashboard home state before any client or policy write resumes.",
        ],
        [
          "Outcome: If route, session, or review state drifted, reopen from a known entry route instead of replaying old actions.",
        ],
        [
          "Evidence: Security-review copy retained as redacted safe snapshot and route fingerprint only.",
        ],
        [
          "PII posture: IPs and mailbox hints are redacted in safe-copy evidence.",
          "Trace posture: Suppressed because session material may be visible during review.",
        ],
        [
          "Precondition: Expected successor route or safe dashboard home is visible.",
          "Precondition: Session rotation or forced re-auth has been revalidated.",
        ],
      ),
      buildPortalCheckpointAtlasScenario(
        "idp.portal-policy.block",
        "Provider policy or rate-limit block",
        "External identity dashboard",
        "IDP",
        "Preproduction verification",
        "PORTAL_POLICY_BLOCK",
        "Expired until reopened",
        "Policy blocks and rate limits are not resumable by guesswork. They require human review or provider posture change before a run may reopen from a known entry route.",
        [
          "Recipe step: The portal rejected the current attempt before the intended admin workflow could continue.",
          "Last safe step: The run recorded the block without retry storms or hidden backoff loops.",
        ],
        [
          "Checkpoint reason: Provider policy, throttling, or blocked posture surfaced instead of a human-verifiable challenge.",
          "Pause posture: The checkpoint remains open for review, not for blind continuation.",
        ],
        [
          "Human action: Review provider posture, rate limit, or admin policy before any retry.",
          "Human role: Security or platform operator with authority to change the blocking condition.",
        ],
        [
          "Resume verification: Reopen from a known entry route after the block is cleared.",
          "Fail-closed: Any unknown successor route or stale session forces a new checkpoint or review.",
        ],
        [
          "Outcome: Continue only after a fresh verification read proves the block is cleared.",
        ],
        [
          "Evidence: Route fingerprint, redacted copy snapshot, and policy-block reason are retained.",
        ],
        [
          "Retry posture: No trace archive or repeated screenshots are kept for blocked-policy loops.",
        ],
        [
          "Precondition: Policy block is cleared.",
          "Precondition: Route reopened from a known entry point.",
        ],
      ),
      buildPortalCheckpointAtlasScenario(
        "shared.unknown.challenge",
        "Unknown challenge review",
        "Shared checkpoint law",
        "IDP",
        "Local provisioning workstation",
        "UNKNOWN_CHALLENGE_REVIEW_REQUIRED",
        "Expired until reopened",
        "Unknown portal challenges fail closed into review so provider drift and blocked security posture never collapse into a hopeful continue.",
        [
          "Recipe step: The portal rendered a challenge that did not match known reason families.",
          "Last safe step: Automation captured enough sanitized evidence to support review, then stopped.",
        ],
        [
          "Checkpoint reason: The challenge is unclassified and therefore review-only.",
          "Pause posture: Unknown challenge remains distinct from selector drift and generic failures.",
        ],
        [
          "Human action: Review provider wording, route identity, and operator-safe next steps.",
          "Human role: Security or platform operator.",
        ],
        [
          "Resume verification: Reopen from a known route only after the challenge is classified or cleared.",
        ],
        [
          "Outcome: No continuation is allowed from an unknown challenge without explicit human review.",
        ],
        [
          "Evidence: Masked screenshot, DOM hash, safe-copy snapshot, and route fingerprint are preserved.",
        ],
        [
          "Redaction posture: Safe-copy evidence strips OTPs, mailboxes, and IPs before storage.",
        ],
        [
          "Precondition: Unknown challenge has been classified or cleared.",
          "Precondition: Selector drift has been checked separately.",
        ],
      ),
    ],
    notes: [
      "The atlas is a pause-and-resume ledger, not a support inbox or NOC dashboard.",
      "Reason families, evidence posture, and resume preconditions stay visible together so later provider adapters do not invent checkpoint law ad hoc.",
      "Reduced motion swaps translation for opacity and focus-state emphasis without changing information order.",
    ],
  };
}

function fixedTemplateRunContext(): RunContextSummary {
  return summarizeRunContext({
    runId: "run-manual-checkpoint-template-2026-04-18",
    providerId: "hmrc-developer-hub",
    flowId: "developer-hub-workspace-setup",
    productEnvironmentId: "env_shared_sandbox_integration",
    providerEnvironment: "fixture",
    executionMode: "fixture",
    operatorIdentityAlias: "ops.manual.checkpoint.template",
    workspaceId: "wk-manual-checkpoint-template",
    evidenceRoot: "artifacts/runs/manual-checkpoint-template",
    createdAt: "2026-04-18T00:00:00.000Z",
    liveProviderExecutionAllowed: false,
    browserStorageStatePolicy: "SECRET_REFERENCE_ONLY",
    evidenceCaptureDefault: "REDACT",
    guardrails: {
      rawCredentialPersistenceForbidden: true,
      browserStorageStateIsSecretMaterial: true,
      manualCheckpointRequiredForMfaCaptchaOrEmail: true,
    },
  });
}

export function createRecommendedManualCheckpointRecordTemplate(): ManualPortalCheckpointRecord {
  const reasonCatalog = reasonCodeMap();
  const reasonRow = reasonCatalog.get("MFA_REQUIRED");
  const resumeRow =
    resumePolicyMap().get("resume.verify-session-and-route.before-mutation");
  if (!reasonRow || !resumeRow) {
    throw new Error("Manual checkpoint template dependencies are missing.");
  }

  const titleHash = sha256("HMRC Developer Hub - 2-step verification");
  const urlHash = sha256(
    "https://developer.service.hmrc.gov.uk/developer/login?screen=checkpoint",
  );

  return {
    schema_version: MANUAL_CHECKPOINT_POLICY_VERSION,
    checkpoint_record_id: "manual_portal_checkpoint_record",
    generated_on: MANUAL_CHECKPOINT_POLICY_GENERATED_ON,
    provider_id: "hmrc-developer-hub",
    provider_label: "HMRC Developer Hub",
    flow_id: "developer-hub-workspace-setup",
    run_id: fixedTemplateRunContext().runId,
    product_environment_id: "env_shared_sandbox_integration",
    provider_environment: "fixture",
    environment_label: "Shared sandbox integration",
    checkpoint_reason_code: "MFA_REQUIRED",
    checkpoint_reason_family: reasonRow.family,
    checkpoint_severity: reasonRow.default_severity,
    checkpoint_status: "OPEN",
    opened_at: "2026-04-18T00:00:00.000Z",
    checkpoint_expires_at_or_null: "2026-04-18T00:20:00.000Z",
    portal_route_ref: "hmrc.developer_hub.login.checkpoint",
    page_identity_ref: "hmrc-developer-hub-sign-in-checkpoint",
    page_title_hash_sha256: titleHash,
    url_hash_sha256: urlHash,
    safe_route_fingerprint:
      "developer.service.hmrc.gov.uk/developer/login|keys=screen|page=hmrc-developer-hub-sign-in-checkpoint",
    flow_context: {
      recipe_ref: "hmrc.sign-in",
      step_id: "hmrc.devhub.account.sign-in",
      step_title: "Submit Developer Hub sign-in and inspect landing state",
      safe_last_completed_step_id: "hmrc.devhub.account.fill-sign-in-form",
      selector_manifest_version: "hmrc.developer-hub-account.v1",
      browser_session_posture: "PRE_STEP_UP_BROWSER_SESSION_PENDING_REVALIDATION",
      secret_entry_suppression_active: true,
    },
    mapped_core_checkpoint: {
      checkpoint_id: "hmrc.devhub.account.sign-in.checkpoint",
      core_reason: reasonRow.mapped_core_reason,
      reentry_policy: "VERIFY_CURRENT_STATE_THEN_CONTINUE",
      capture_policy: "REDACT",
    },
    reason_code_policy_ref: "config/provisioning/manual_checkpoint_reason_codes.json",
    resume_policy_ref: "config/provisioning/blocked_portal_resume_policy.json",
    redaction_policy_ref: "config/provisioning/checkpoint_redaction_policy.json",
    evidence_pack_ref: "runtime-generated://manual_checkpoint_evidence_pack.json",
    resume_requirements: {
      resume_policy_ref: resumeRow.resume_policy_ref,
      human_actor_role: resumeRow.human_actor_role,
      expected_post_checkpoint_route_ref:
        "hmrc.developer_hub.applications_or_security_successor",
      session_revalidation_requirement:
        resumeRow.session_revalidation_requirement,
      selector_drift_check_requirement:
        resumeRow.selector_drift_check_requirement,
      safe_noop_verification_step: resumeRow.safe_noop_verification_step,
      timeout_posture: resumeRow.timeout_posture,
      forbidden_actions: [...resumeRow.forbidden_actions],
      resume_snapshot_ref_or_null:
        "resume://run-manual-checkpoint-template-2026-04-18/latest",
    },
    provider_docs_urls: providerDocsUrls(),
    source_refs: sharedSourceRefs(),
    typed_gaps: [],
    notes: [
      "Template record demonstrates the governed shape for a provider-owned MFA checkpoint without persisting raw codes or cookies.",
      "Evidence pack ref stays runtime-generated because checkpoint evidence is per-run and not checked in as a static template artifact.",
    ],
  };
}

export function validateManualCheckpointReasonCodes(
  catalog: ManualCheckpointReasonCodes,
): void {
  REQUIRED_MANUAL_CHECKPOINT_REASON_CODES.forEach((reasonCode) => {
    if (!catalog.reason_rows.some((row) => row.reason_code === reasonCode)) {
      throw new Error(`Missing manual checkpoint reason code ${reasonCode}.`);
    }
  });
}

export function validateBlockedPortalResumePolicy(
  policy: BlockedPortalResumePolicy,
): void {
  REQUIRED_MANUAL_CHECKPOINT_REASON_CODES.forEach((reasonCode) => {
    if (
      !policy.policy_rows.some((row) =>
        row.applies_to_reason_codes.includes(reasonCode),
      )
    ) {
      throw new Error(
        `Resume policy is missing reason code coverage for ${reasonCode}.`,
      );
    }
  });
  policy.policy_rows.forEach((row) => {
    if (!row.forbidden_actions.length) {
      throw new Error(
        `Resume policy ${row.resume_policy_ref} must freeze forbidden replay actions.`,
      );
    }
  });
}

export function validateCheckpointRedactionPolicy(
  policy: CheckpointRedactionPolicy,
): void {
  const requiredKinds = [
    "SCREENSHOT",
    "DOM_SNAPSHOT",
    "TRACE_REFERENCE",
    "COPY_SNAPSHOT",
    "BROWSER_STORAGE",
  ];
  requiredKinds.forEach((kind) => {
    if (!policy.rule_rows.some((row) => row.artifact_kind === kind)) {
      throw new Error(`Missing checkpoint redaction rule for ${kind}.`);
    }
  });
}

export function validateManualPortalCheckpointRecord(
  record: ManualPortalCheckpointRecord,
): void {
  if (record.checkpoint_status !== "OPEN") {
    throw new Error("Checkpoint record must remain OPEN when first captured.");
  }
  if (record.resume_requirements.selector_drift_check_requirement !== "REQUIRED") {
    throw new Error("Checkpoint resume must require selector drift checks.");
  }
  if (!record.resume_requirements.forbidden_actions.length) {
    throw new Error("Checkpoint resume must freeze forbidden actions.");
  }
}

export function validateManualCheckpointEvidencePack(
  evidencePack: ManualCheckpointEvidencePack,
): void {
  if (!evidencePack.page_signature.dom_hash_sha256) {
    throw new Error("Checkpoint evidence pack must retain a DOM signature hash.");
  }
  if (!evidencePack.artifact_rows.some((row) => row.artifact_kind === "MASKED_SCREENSHOT")) {
    throw new Error("Checkpoint evidence pack must retain a masked screenshot artifact.");
  }
}

export function assertManualCheckpointArtifactsSanitized(
  payload: unknown,
  forbiddenValues: readonly string[],
): void {
  const serialized = JSON.stringify(payload).toLowerCase();
  [
    "bearer ",
    "authorization:",
    "set-cookie:",
    "cookie=",
    "\"password\":",
    "password=",
    ...forbiddenValues,
  ]
    .map((value) => value.toLowerCase())
    .filter(Boolean)
    .forEach((value) => {
      if (serialized.includes(value)) {
        throw new Error(
          `Manual checkpoint artifacts must not persist sensitive value ${value}.`,
        );
      }
    });
}

async function captureMaskedCheckpointScreenshot(
  page: Page,
  screenshotPath: string,
): Promise<void> {
  await mkdir(path.dirname(screenshotPath), { recursive: true });
  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
    animations: "disabled",
    mask: maskLocators(page),
  });
}

export async function captureManualCheckpointEvidence(
  options: CaptureManualCheckpointEvidenceOptions,
): Promise<CaptureManualCheckpointEvidenceResult> {
  const steps: StepContract[] = [
    ...(options.existingSteps ?? []),
    createPendingStep({
      stepId: MANUAL_CHECKPOINT_STEP_IDS.openCheckpointSurface,
      title: "Open blocked portal checkpoint surface",
      selectorRefs: ["checkpoint-heading"],
    }),
    createPendingStep({
      stepId: options.stepId,
      title: options.stepTitle,
      selectorRefs: ["checkpoint-heading", "resume-note"],
      sensitiveCapturePolicy: "REDACT",
    }),
    createPendingStep({
      stepId: MANUAL_CHECKPOINT_STEP_IDS.persistCheckpointArtifacts,
      title: "Persist sanitized checkpoint record, evidence pack, and resume snapshot",
      selectorRefs: ["checkpoint-heading"],
      sensitiveCapturePolicy: "REDACT",
    }),
  ];

  let evidenceManifest = createEvidenceManifest(options.runContext);

  const openStepIndex = options.existingSteps ? options.existingSteps.length : 0;
  const checkpointStepIndex = openStepIndex + 1;
  const persistStepIndex = openStepIndex + 2;

  steps[openStepIndex] = transitionStep(
    steps[openStepIndex]!,
    "RUNNING",
    "Opening the blocked portal challenge surface.",
  );

  if (options.entryUrl) {
    await options.page.goto(options.entryUrl);
  }

  const signals = await readPageSignals(options.page);
  const reasonCode = resolveReasonCode(
    signals.reasonCodeAttr,
    signals.bodyText,
    options.checkpointReasonCodeOverride,
  );
  const reasonRow = reasonCodeMap().get(reasonCode);
  if (!reasonRow) {
    throw new Error(`No reason catalog row found for ${reasonCode}.`);
  }
  const resumePolicy = resumePolicyMap().get(reasonRow.default_resume_policy_ref);
  if (!resumePolicy) {
    throw new Error(
      `No resume policy found for ${reasonRow.default_resume_policy_ref}.`,
    );
  }

  steps[openStepIndex] = transitionStep(
    steps[openStepIndex]!,
    "SUCCEEDED",
    "Blocked portal surface opened and checkpoint signals were identified.",
  );
  evidenceManifest = appendEvidenceRecord(evidenceManifest, {
    evidenceId: `${steps[openStepIndex]!.stepId}.surface-note`,
    stepId: steps[openStepIndex]!.stepId,
    kind: "NOTE",
    relativePath: null,
    captureMode: "REDACTED",
    summary: `Opened the blocked portal surface and classified the checkpoint as ${reasonCode}.`,
  });

  steps[checkpointStepIndex] = transitionStep(
    steps[checkpointStepIndex]!,
    "RUNNING",
    "Capturing sanitized manual checkpoint evidence.",
  );

  const additionalSensitiveValues = options.additionalSensitiveValues ?? [];
  const redactionRules = createCheckpointRedactionRules(additionalSensitiveValues);
  const redactedCopy = redactText(
    `${signals.challengeHeadline}\n${signals.bodyText}`.slice(0, 800),
    redactionRules,
  );

  const titleHash = sha256(signals.pageTitle);
  const urlHash = sha256(options.page.url());
  const domHash = sha256(signals.pageHtml);
  const routeFingerprint = safeRouteFingerprint(
    options.page.url(),
    options.pageIdentityRef || signals.pageIdentityAttr,
  );

  const screenshotPath = path.join(
    path.dirname(options.evidencePackPath),
    "manual_checkpoint_masked.png",
  );
  await captureMaskedCheckpointScreenshot(options.page, screenshotPath);

  const coreCheckpoint = createManualCheckpoint({
    checkpointId: `${options.stepId}.checkpoint`,
    stepId: options.stepId,
    reason: reasonRow.mapped_core_reason,
    prompt: reasonRow.portal_safe_summary,
    expectedSignals: [
      "Checkpoint page remains visible until human action is complete.",
      "Resume must start with a no-op verification step before any mutation resumes.",
    ],
    reentryPolicy: "VERIFY_CURRENT_STATE_THEN_CONTINUE",
    capturePolicy: "REDACT",
  });
  steps[checkpointStepIndex] = attachManualCheckpoint(
    steps[checkpointStepIndex]!,
    coreCheckpoint,
  );

  const evidencePackRef = options.evidencePackPath;
  const checkpointExpiresAt = isoAfterMinutes(20);
  const checkpointRecord: ManualPortalCheckpointRecord = {
    schema_version: MANUAL_CHECKPOINT_POLICY_VERSION,
    checkpoint_record_id: "manual_portal_checkpoint_record",
    generated_on: MANUAL_CHECKPOINT_POLICY_GENERATED_ON,
    provider_id: options.runContext.providerId,
    provider_label: options.providerLabel,
    flow_id: options.runContext.flowId,
    run_id: options.runContext.runId,
    product_environment_id: options.runContext.productEnvironmentId,
    provider_environment: options.runContext.providerEnvironment,
    environment_label: options.environmentLabel,
    checkpoint_reason_code: reasonCode,
    checkpoint_reason_family: reasonRow.family,
    checkpoint_severity: reasonRow.default_severity,
    checkpoint_status: "OPEN",
    opened_at: coreCheckpoint.openedAt,
    checkpoint_expires_at_or_null: checkpointExpiresAt,
    portal_route_ref: options.portalRouteRef || signals.routeRefAttr,
    page_identity_ref: options.pageIdentityRef || signals.pageIdentityAttr,
    page_title_hash_sha256: titleHash,
    url_hash_sha256: urlHash,
    safe_route_fingerprint: routeFingerprint,
    flow_context: {
      recipe_ref: options.recipeRef,
      step_id: options.stepId,
      step_title: options.stepTitle,
      safe_last_completed_step_id: options.safeLastCompletedStepId,
      selector_manifest_version: options.selectorManifestVersion,
      browser_session_posture: options.browserSessionPosture,
      secret_entry_suppression_active: options.secretEntrySuppressionActive,
    },
    mapped_core_checkpoint: {
      checkpoint_id: coreCheckpoint.checkpointId,
      core_reason: coreCheckpoint.reason,
      reentry_policy: coreCheckpoint.reentryPolicy,
      capture_policy: coreCheckpoint.capturePolicy,
    },
    reason_code_policy_ref:
      "config/provisioning/manual_checkpoint_reason_codes.json",
    resume_policy_ref: "config/provisioning/blocked_portal_resume_policy.json",
    redaction_policy_ref: "config/provisioning/checkpoint_redaction_policy.json",
    evidence_pack_ref: evidencePackRef,
    resume_requirements: {
      resume_policy_ref: resumePolicy.resume_policy_ref,
      human_actor_role: resumePolicy.human_actor_role,
      expected_post_checkpoint_route_ref:
        options.expectedPostCheckpointRouteRef || signals.expectedPostRouteAttr,
      session_revalidation_requirement:
        resumePolicy.session_revalidation_requirement,
      selector_drift_check_requirement:
        resumePolicy.selector_drift_check_requirement,
      safe_noop_verification_step: resumePolicy.safe_noop_verification_step,
      timeout_posture: resumePolicy.timeout_posture,
      forbidden_actions: [...resumePolicy.forbidden_actions],
      resume_snapshot_ref_or_null: options.resumeRoot
        ? `resume://${options.runContext.runId}/latest`
        : null,
    },
    provider_docs_urls: providerDocsUrls(),
    source_refs: sharedSourceRefs(),
    typed_gaps:
      reasonCode === "UNKNOWN_CHALLENGE_REVIEW_REQUIRED"
        ? ["UNKNOWN_CHALLENGE_REVIEW_REQUIRED"]
        : [],
    notes: [
      `${reasonRow.operator_summary} Resume remains gated behind route, session, and selector revalidation.`,
      "No raw codes, cookies, mailbox details, or browser storage bodies were persisted.",
    ],
  };

  const evidencePack: ManualCheckpointEvidencePack = {
    schema_version: MANUAL_CHECKPOINT_POLICY_VERSION,
    evidence_pack_id: "manual_checkpoint_evidence_pack",
    checkpoint_record_ref: checkpointRecord.checkpoint_record_id,
    run_id: options.runContext.runId,
    provider_id: options.runContext.providerId,
    evidence_root: options.runContext.evidenceRoot,
    page_signature: {
      title_hash_sha256: titleHash,
      url_hash_sha256: urlHash,
      dom_hash_sha256: domHash,
      safe_route_fingerprint: routeFingerprint,
    },
    safe_copy_snapshot: redactedCopy.value.slice(0, 320),
    artifact_rows: [
      {
        artifact_ref: "checkpoint.masked_screenshot",
        artifact_kind: "MASKED_SCREENSHOT",
        capture_mode: "REDACTED",
        relative_path_or_null: relativePathOrNull(
          path.dirname(options.evidencePackPath),
          screenshotPath,
        ),
        summary:
          "Checkpoint screenshot retained with sensitive challenge fields masked.",
        redaction_notes: ["mask:[data-sensitive='true']", "mask:[autocomplete='one-time-code']"],
      },
      {
        artifact_ref: "checkpoint.dom_signature",
        artifact_kind: "DOM_SIGNATURE",
        capture_mode: "HASH_ONLY",
        relative_path_or_null: null,
        summary:
          "Raw DOM was not retained; only a sha256 signature hash was recorded for drift and route verification.",
        redaction_notes: ["hash-only:dom"],
      },
      {
        artifact_ref: "checkpoint.trace_reference",
        artifact_kind: "TRACE_REFERENCE",
        capture_mode: "SUPPRESSED",
        relative_path_or_null: null,
        summary:
          "Trace capture is suppressed by default while blocked challenge screens are visible.",
        redaction_notes: ["suppressed:trace"],
      },
      {
        artifact_ref: "checkpoint.safe_copy_snapshot",
        artifact_kind: "SAFE_COPY_SNAPSHOT",
        capture_mode: "REDACTED",
        relative_path_or_null: null,
        summary:
          "Provider wording retained as a redacted safe-copy snapshot for operator review.",
        redaction_notes: redactedCopy.notes.map(
          (note) => `${note.ruleId}:${note.matchCount}`,
        ),
      },
    ],
    provider_docs_urls: providerDocsUrls(),
    source_refs: sharedSourceRefs(),
    notes: [
      "Checkpoint evidence is sanitized and durable enough for review and lawful resume.",
      "Route fingerprint stores only host, path, query-key names, and page identity; raw query values are hashed.",
    ],
  };

  validateManualPortalCheckpointRecord(checkpointRecord);
  validateManualCheckpointEvidencePack(evidencePack);
  assertManualCheckpointArtifactsSanitized(
    { checkpointRecord, evidencePack, safeCopy: redactedCopy.value },
    additionalSensitiveValues,
  );

  evidenceManifest = appendEvidenceRecord(evidenceManifest, {
    evidenceId: `${options.stepId}.checkpoint-screenshot`,
    stepId: options.stepId,
    kind: "SCREENSHOT",
    relativePath: relativePathOrNull(
      path.dirname(options.evidencePackPath),
      screenshotPath,
    ),
    captureMode: "REDACTED",
    summary:
      "Checkpoint screenshot retained with masking so operator review does not require raw challenge data.",
  });
  evidenceManifest = appendEvidenceRecord(evidenceManifest, {
    evidenceId: `${options.stepId}.checkpoint-dom-signature`,
    stepId: options.stepId,
    kind: "DOM_SNAPSHOT",
    relativePath: null,
    captureMode: "SUPPRESSED",
    summary:
      "Checkpoint DOM retained as hash-only signature for route and selector verification.",
  });
  evidenceManifest = appendEvidenceRecord(evidenceManifest, {
    evidenceId: `${options.stepId}.checkpoint-copy-snapshot`,
    stepId: options.stepId,
    kind: "NOTE",
    relativePath: null,
    captureMode: "REDACTED",
    summary: redactedCopy.value.slice(0, 220),
    redactionNotes: redactedCopy.notes,
  });

  steps[persistStepIndex] = transitionStep(
    steps[persistStepIndex]!,
    "RUNNING",
    "Persisting checkpoint record, evidence pack, and resume snapshot.",
  );

  await persistJson(options.checkpointRecordPath, checkpointRecord);
  await persistJson(options.evidencePackPath, evidencePack);

  let resumeSnapshotPath: string | null = null;
  if (options.resumeRoot) {
    const store = new FileResumeStore(options.resumeRoot);
    await store.saveSnapshot({
      runContext: summarizeRunContext(options.runContext),
      steps,
      checkpoint: coreCheckpoint,
      notes: [
        `Manual checkpoint required: ${reasonCode}`,
        `Resume policy: ${resumePolicy.resume_policy_ref}`,
      ],
      browserStorageStateRef: options.browserStorageStateRef ?? null,
    });
    resumeSnapshotPath = path.join(
      options.resumeRoot,
      options.runContext.runId,
      "latest.json",
    );
  }

  const evidenceManifestPath = evidenceManifestPathFor(options.checkpointRecordPath);
  await persistJson(evidenceManifestPath, evidenceManifest);

  steps[persistStepIndex] = transitionStep(
    steps[persistStepIndex]!,
    "SUCCEEDED",
    "Persisted sanitized checkpoint artifacts and resume snapshot without raw challenge data.",
  );

  return {
    outcome: "MANUAL_CHECKPOINT_REQUIRED",
    steps,
    checkpointRecord,
    evidencePack,
    evidenceManifestPath,
    resumeSnapshotPath,
    notes: [
      `Captured ${reasonCode} as a first-class manual checkpoint artifact.`,
      "Resume remains lawful only after human completion and post-checkpoint verification steps succeed.",
    ],
  };
}
