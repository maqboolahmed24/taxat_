import { access, readFile } from "node:fs/promises";
import type { Locator, Page } from "@playwright/test";

import {
  appendEvidenceRecord,
  createEvidenceManifest,
  type EvidenceManifest,
} from "../../../core/evidence_manifest.js";
import {
  createManualCheckpoint,
  type ManualCheckpointReason,
  type ManualCheckpointRecord,
} from "../../../core/manual_checkpoint.js";
import {
  createDefaultRedactionRules,
  redactText,
  type RedactionRule,
} from "../../../core/redaction.js";
import type { RunContext } from "../../../core/run_context.js";
import {
  rankSelectors,
  type SelectorDescriptor,
  type SelectorManifest,
} from "../../../core/selector_contract.js";
import type { StepContract } from "../../../core/step_contract.js";

export const DEVELOPER_HUB_PROVIDER_ID = "hmrc-developer-hub";
export const DEVELOPER_HUB_FLOW_ID = "developer-hub-workspace-setup";

export const DEVELOPER_HUB_STEP_IDS = {
  detectSession: "hmrc.devhub.workspace.detect-session",
  openRegister: "hmrc.devhub.account.open-register",
  submitRegister: "hmrc.devhub.account.submit-register",
  openSignIn: "hmrc.devhub.account.open-sign-in",
  submitSignIn: "hmrc.devhub.account.submit-sign-in",
  awaitCheckpoint: "hmrc.devhub.account.await-checkpoint",
  persistWorkspaceRecord: "hmrc.devhub.workspace.persist-record",
} as const;

export interface DeveloperHubEntryUrls {
  register: string;
  signIn: string;
  applications: string;
}

export interface DeveloperHubCredentials {
  firstName: string;
  lastName: string;
  emailAddress: string;
  password: string;
}

export interface DeveloperHubSecretRefs {
  accountAliasRef: string;
  passwordRef: string;
  activationChannelRef?: string;
  mfaRecoveryRef?: string;
  browserStorageStateRef?: string;
}

export type DeveloperHubAccountStatus =
  | "ACTIVE"
  | "ACTIVATION_PENDING"
  | "SIGN_IN_REQUIRED"
  | "SECURITY_REVIEW_REQUIRED";

export type DeveloperHubLandingStatus =
  | "APPLICATIONS_HOME_REACHED"
  | "AUTHENTICATION_REQUIRED"
  | "ACTIVATION_REQUIRED"
  | "SECURITY_INTERSTITIAL_REQUIRED";

export type DeveloperHubSourceDisposition =
  | "ADOPTED_EXISTING"
  | "CREATED_DURING_RUN"
  | "RESUMED_AFTER_PARTIAL_FAILURE";

export type DeveloperHubFlowOutcome =
  | "APPLICATIONS_READY"
  | "MANUAL_CHECKPOINT_REQUIRED"
  | "SIGN_IN_REQUIRED"
  | "REGISTRATION_REQUIRED";

export interface DeveloperHubFlowOptions {
  page: Page;
  runContext: RunContext;
  entryUrls?: DeveloperHubEntryUrls;
  accountAlias: string;
  credentials: DeveloperHubCredentials;
}

export interface DeveloperHubFlowResult {
  outcome: DeveloperHubFlowOutcome;
  steps: StepContract[];
  evidenceManifest: EvidenceManifest;
  checkpoint: ManualCheckpointRecord | null;
  accountStatus: DeveloperHubAccountStatus;
  landingStatus: DeveloperHubLandingStatus;
  sourceDisposition: DeveloperHubSourceDisposition;
  lastSafePageUrl: string;
  notes: string[];
}

export function createDefaultDeveloperHubEntryUrls(): DeveloperHubEntryUrls {
  return {
    register: "https://developer.service.hmrc.gov.uk/developer/registration",
    signIn: "https://developer.service.hmrc.gov.uk/developer/login",
    applications: "https://developer.service.hmrc.gov.uk/developer/applications",
  };
}

export async function loadDeveloperHubSelectorManifest(): Promise<SelectorManifest> {
  const raw = await readFile(
    new URL("../selectors/developer_hub_account.selectors.json", import.meta.url),
    "utf8",
  );
  const manifest = JSON.parse(raw) as SelectorManifest;
  return {
    ...manifest,
    selectors: rankSelectors(manifest.selectors),
  };
}

export function createDeveloperHubEvidenceManifest(
  runContext: RunContext,
): EvidenceManifest {
  return createEvidenceManifest(runContext);
}

export function buildDeveloperHubRedactionRules(
  credentials: DeveloperHubCredentials,
): RedactionRule[] {
  return createDefaultRedactionRules([
    credentials.emailAddress,
    credentials.password,
  ]);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeBodyText(value: string | null): string {
  return (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

async function visiblePageText(page: Page): Promise<string> {
  return normalizeBodyText(
    await page.evaluate(() => document.body.innerText),
  );
}

function stripHash(value: string): string {
  return value.split("#", 1)[0]!;
}

export function isLiveHmrcEntryUrls(entryUrls: DeveloperHubEntryUrls): boolean {
  return Object.values(entryUrls).some((value) =>
    value.startsWith("https://developer.service.hmrc.gov.uk/"),
  );
}

export function mergeEvidenceManifests(
  left: EvidenceManifest,
  right: EvidenceManifest,
): EvidenceManifest {
  return {
    ...left,
    entries: [...left.entries, ...right.entries],
  };
}

function locatorForSelector(page: Page, selector: SelectorDescriptor): Locator {
  switch (selector.strategy) {
    case "ROLE":
      return page.getByRole(selector.value as Parameters<Page["getByRole"]>[0], {
        name: selector.accessibleName,
      });
    case "LABEL":
      return page.getByLabel(selector.value, { exact: false });
    case "TEXT":
      return page.getByText(selector.value, { exact: false });
    case "URL":
      return page.locator(`[href="${selector.value}"], form[action="${selector.value}"]`);
    case "TEST_ID":
      return page.getByTestId(selector.value);
    case "CSS_FALLBACK":
      return page.locator(selector.value);
  }
}

async function isLocatorVisible(locator: Locator): Promise<boolean> {
  try {
    return await locator.first().isVisible();
  } catch {
    return false;
  }
}

function getSelectorRequired(
  manifest: SelectorManifest,
  selectorId: string,
): SelectorDescriptor {
  const selector = manifest.selectors.find((candidate) => candidate.selectorId === selectorId);
  if (!selector) {
    throw new Error(`Selector manifest is missing required selector ${selectorId}.`);
  }
  return selector;
}

export async function isSelectorVisible(
  page: Page,
  manifest: SelectorManifest,
  selectorId: string,
): Promise<boolean> {
  return isLocatorVisible(locatorForSelector(page, getSelectorRequired(manifest, selectorId)));
}

export async function getRequiredLocator(
  page: Page,
  manifest: SelectorManifest,
  selectorId: string,
): Promise<Locator> {
  const selector = getSelectorRequired(manifest, selectorId);
  const locator = locatorForSelector(page, selector);
  if (!(await isLocatorVisible(locator))) {
    throw new Error(
      `Selector drift detected for ${selectorId}: expected ${selector.strategy} selector ${JSON.stringify(
        selector.value,
      )} to be visible.`,
    );
  }
  return locator.first();
}

export async function clickSelectorIfVisible(
  page: Page,
  manifest: SelectorManifest,
  selectorId: string,
): Promise<boolean> {
  const selector = getSelectorRequired(manifest, selectorId);
  const locator = locatorForSelector(page, selector).first();
  if (!(await isLocatorVisible(locator))) {
    return false;
  }
  await locator.click();
  return true;
}

export async function fillRequiredSelector(
  page: Page,
  manifest: SelectorManifest,
  selectorId: string,
  value: string,
): Promise<void> {
  await (await getRequiredLocator(page, manifest, selectorId)).fill(value);
}

export async function dismissCookieBanner(
  page: Page,
  manifest: SelectorManifest,
): Promise<void> {
  if (await clickSelectorIfVisible(page, manifest, "cookie-reject")) {
    return;
  }
  await clickSelectorIfVisible(page, manifest, "cookie-accept");
}

export async function waitForPortalStability(page: Page): Promise<void> {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(75);
}

export async function isOnRegistrationPage(
  page: Page,
  entryUrls: DeveloperHubEntryUrls,
  manifest: SelectorManifest,
): Promise<boolean> {
  const body = page.locator("body");
  const screen = await body.getAttribute("data-screen");
  if (screen === "register") {
    return true;
  }
  if (stripHash(page.url()) === stripHash(entryUrls.register)) {
    return true;
  }
  return isSelectorVisible(page, manifest, "registration-heading");
}

export async function isOnSignInPage(
  page: Page,
  entryUrls: DeveloperHubEntryUrls,
  manifest: SelectorManifest,
): Promise<boolean> {
  const body = page.locator("body");
  const screen = await body.getAttribute("data-screen");
  if (screen === "login") {
    return true;
  }
  if (stripHash(page.url()) === stripHash(entryUrls.signIn)) {
    return true;
  }
  return isSelectorVisible(page, manifest, "sign-in-heading");
}

export async function isOnApplicationsPage(
  page: Page,
  entryUrls: DeveloperHubEntryUrls,
  manifest: SelectorManifest,
): Promise<boolean> {
  const body = page.locator("body");
  const screen = await body.getAttribute("data-screen");
  if (screen === "applications") {
    return true;
  }
  if (stripHash(page.url()) === stripHash(entryUrls.applications)) {
    return true;
  }
  if (await isSelectorVisible(page, manifest, "applications-heading")) {
    return true;
  }
  return isLocatorVisible(page.getByRole("link", { name: /add an application/i }));
}

export async function detectExistingAccountSignal(page: Page): Promise<boolean> {
  const body = page.locator("body");
  if ((await body.getAttribute("data-registration-disposition")) === "existing-account") {
    return true;
  }
  const text = await visiblePageText(page);
  return (
    text.includes("this account already exists") ||
    text.includes("an account already exists") ||
    text.includes("account already exists") ||
    text.includes("existing account")
  );
}

export async function detectRegistrationRequiredSignal(page: Page): Promise<boolean> {
  const body = page.locator("body");
  if ((await body.getAttribute("data-sign-in-disposition")) === "register") {
    return true;
  }
  const text = await visiblePageText(page);
  return (
    text.includes("we could not find an account") ||
    text.includes("register for an account to continue") ||
    text.includes("create an account to continue")
  );
}

function checkpointPrompt(reason: ManualCheckpointReason): string {
  switch (reason) {
    case "EMAIL_VERIFICATION":
      return "Verify the HMRC Developer Hub activation email, then resume without replaying account creation.";
    case "CAPTCHA":
      return "Complete the anti-bot challenge, then resume by verifying the current portal state before continuing.";
    case "MFA":
      return "Complete the HMRC 2-step verification challenge, then resume by verifying the current portal state.";
    case "HUMAN_REVIEW":
      return "Resolve the provider security review or suspicious-login check, then resume without resubmitting sensitive steps.";
    case "LEGAL_APPROVAL":
      return "Obtain the required approval and then resume after verifying the current portal state.";
    case "POLICY_CONFIRMATION":
      return "Confirm the required policy acknowledgement and then resume after verifying the current portal state.";
  }
}

export async function detectCheckpoint(
  stepId: string,
  page: Page,
): Promise<{
  checkpoint: ManualCheckpointRecord;
  landingStatus: DeveloperHubLandingStatus;
  accountStatus: DeveloperHubAccountStatus;
} | null> {
  const body = page.locator("body");
  const explicitReason = await body.getAttribute("data-checkpoint-reason");

  let reason: ManualCheckpointReason | null = null;
  if (explicitReason === "EMAIL_VERIFICATION" || explicitReason === "CAPTCHA" || explicitReason === "MFA" || explicitReason === "HUMAN_REVIEW" || explicitReason === "LEGAL_APPROVAL" || explicitReason === "POLICY_CONFIRMATION") {
    reason = explicitReason;
  } else {
    const text = await visiblePageText(page);
    if (
      text.includes("check your email") ||
      text.includes("activate your account") ||
      text.includes("activation link")
    ) {
      reason = "EMAIL_VERIFICATION";
    } else if (
      text.includes("2-step verification") ||
      text.includes("authenticator app") ||
      text.includes("6-digit code")
    ) {
      reason = "MFA";
    } else if (text.includes("captcha") || text.includes("security check")) {
      reason = "CAPTCHA";
    } else if (
      text.includes("suspicious login") ||
      text.includes("confirm your identity") ||
      text.includes("human review")
    ) {
      reason = "HUMAN_REVIEW";
    }
  }

  if (!reason) {
    return null;
  }

  return {
    checkpoint: createManualCheckpoint({
      checkpointId: `${stepId}.checkpoint`,
      stepId,
      reason,
      prompt: checkpointPrompt(reason),
      expectedSignals: [
        "Checkpoint page remains visible until human action is complete.",
        "Resume must verify the current portal page before any further mutation.",
      ],
      reentryPolicy: "VERIFY_CURRENT_STATE_THEN_CONTINUE",
      capturePolicy: "SUPPRESS",
    }),
    landingStatus:
      reason === "EMAIL_VERIFICATION"
        ? "ACTIVATION_REQUIRED"
        : "SECURITY_INTERSTITIAL_REQUIRED",
    accountStatus:
      reason === "EMAIL_VERIFICATION"
        ? "ACTIVATION_PENDING"
        : "SECURITY_REVIEW_REQUIRED",
  };
}

export function appendSanitizedEvidence(
  manifest: EvidenceManifest,
  step: StepContract,
  summary: string,
  redactionRules: readonly RedactionRule[],
  locatorRefs: string[] = [],
): EvidenceManifest {
  const redacted = redactText(summary, redactionRules);
  return appendEvidenceRecord(manifest, {
    evidenceId: `${step.stepId}.note.${manifest.entries.length + 1}`,
    stepId: step.stepId,
    kind: "NOTE",
    relativePath: null,
    captureMode: "REDACTED",
    summary: redacted.value,
    locatorRefs,
    redactionNotes: redacted.notes,
  });
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function sanitizeAlias(value: string): string {
  return value.trim().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._@-]/g, "");
}

export function buildWorkspaceRecordId(
  runContext: RunContext,
  accountAlias: string,
): string {
  return `hmrc-devhub-${sanitizeAlias(runContext.workspaceId)}-${sanitizeAlias(accountAlias)}`;
}

export function deriveActivationStatus(
  accountStatus: DeveloperHubAccountStatus,
): "NOT_REQUIRED" | "EMAIL_VERIFICATION_PENDING" | "VERIFIED" | "SECURITY_INTERSTITIAL_PENDING" {
  switch (accountStatus) {
    case "ACTIVE":
      return "VERIFIED";
    case "ACTIVATION_PENDING":
      return "EMAIL_VERIFICATION_PENDING";
    case "SECURITY_REVIEW_REQUIRED":
      return "SECURITY_INTERSTITIAL_PENDING";
    case "SIGN_IN_REQUIRED":
      return "NOT_REQUIRED";
  }
}

export function secretRefKind(secretClassId: string): string {
  switch (secretClassId) {
    case "developer_hub_account_alias":
      return "VAULT_METADATA_ALIAS";
    case "developer_hub_password_ref":
      return "VAULT_SECRET_REF";
    case "developer_hub_activation_channel_ref":
      return "VAULT_SECRET_REF";
    case "developer_hub_mfa_recovery_material_ref":
      return "VAULT_SECRET_REF";
    case "provisioning_browser_storage_state_ref":
      return "VAULT_SECRET_REF";
    default:
      return "SAFE_REF";
  }
}

export function createForbiddenValueMatcher(value: string): RegExp {
  return new RegExp(escapeRegExp(value), "i");
}
