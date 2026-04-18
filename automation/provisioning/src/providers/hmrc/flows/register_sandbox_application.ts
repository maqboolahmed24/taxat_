import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Locator, Page } from "@playwright/test";

import {
  assertProviderFlowAllowed,
  createDefaultProviderRegistry,
} from "../../../core/provider_registry.js";
import type { RunContext } from "../../../core/run_context.js";
import {
  createPendingStep,
  markSkippedAsAlreadyPresent,
  transitionStep,
  type StepContract,
} from "../../../core/step_contract.js";
import {
  appendSanitizedEvidence,
  createDeveloperHubEvidenceManifest,
  DEVELOPER_HUB_PROVIDER_ID,
  dismissCookieBanner,
  fileExists,
  getRequiredLocator,
  isSelectorVisible,
  sanitizeAlias,
  waitForPortalStability,
} from "./developer_hub_shared.js";
import {
  rankSelectors,
  type SelectorManifest,
} from "../../../core/selector_contract.js";

export const HMRC_SANDBOX_APP_FLOW_ID = "sandbox-app-registration";

export const HMRC_SANDBOX_APP_STEP_IDS = {
  openApplications: "hmrc.devhub.sandbox-app.open-applications",
  detectExistingApplication: "hmrc.devhub.sandbox-app.detect-existing",
  openCreateApplication: "hmrc.devhub.sandbox-app.open-create",
  submitCreateApplication: "hmrc.devhub.sandbox-app.submit-create",
  persistApplicationRecord: "hmrc.devhub.sandbox-app.persist-record",
} as const;

export type SandboxApplicationSourceDisposition =
  | "ADOPTED_EXISTING"
  | "CREATED_DURING_RUN"
  | "RECREATED_AFTER_RETENTION_EXPIRY";

export type SandboxApplicationSubscriptionState =
  | "NOT_YET_VERIFIED"
  | "PARTIALLY_SUBSCRIBED"
  | "REQUIRED_NOW_SUBSCRIBED";

export interface SandboxApplicationEntryUrls {
  applications: string;
}

export interface RequiredApiSourceRef {
  url: string;
  rationale: string;
}

export interface RequiredApiDescriptor {
  api_key: string;
  display_name: string;
  current_observed_version: string;
  current_observed_stage: string;
  documentation_last_updated: string;
  documentation_url: string;
  oas_file_url?: string;
  oauth_scopes: string[];
  relevant_operation_families: string[];
  portal_label_aliases: string[];
  requirement_bucket: "REQUIRED_NOW" | "LIKELY_REQUIRED_LATER";
  requirement_rationale: string;
  source_refs: RequiredApiSourceRef[];
}

export interface RequiredApiDecision {
  api_key: string;
  decision: "REQUIRED_NOW" | "DEFERRED_TO_LATER_SCOPE";
  rationale: string;
}

export interface RequiredApiSetBaseline {
  schema_version: "1.0";
  verified_at: string;
  provider_id: "hmrc-developer-hub";
  provider_environment: "sandbox";
  roadmap_slice_id: "phase_01_seq_035";
  roadmap_slice_label: string;
  sandbox_base_url: string;
  source_refs: RequiredApiSourceRef[];
  required_now: RequiredApiDescriptor[];
  likely_required_later: RequiredApiDescriptor[];
  typed_decisions: RequiredApiDecision[];
  notes: string[];
}

export interface SandboxApplicationRecord {
  schema_version: "1.0";
  application_record_id: string;
  provider_id: "hmrc-developer-hub";
  provider_display_name: "HMRC Developer Hub";
  workspace_id: string;
  run_id: string;
  flow_id: "sandbox-app-registration";
  product_environment_id: string;
  provider_environment: "sandbox" | "production" | "fixture";
  operator_identity_alias: string;
  developer_hub_workspace_record_ref: string;
  required_api_baseline_ref: string;
  subscription_matrix_ref: string | null;
  sandbox_application: {
    application_alias: string;
    application_display_name: string;
    portal_environment: "SANDBOX";
    source_disposition: SandboxApplicationSourceDisposition;
    subscription_state: SandboxApplicationSubscriptionState;
    application_console_url: string;
    api_subscriptions_page_url: string;
  };
  portal_state: {
    applications_console_url: string;
    last_safe_page_url: string;
    last_completed_step_id: string;
    manual_checkpoint_open: boolean;
    evidence_manifest_ref: string;
  };
  evidence_refs: string[];
  console_location_refs: string[];
  notes: string[];
  last_verified_at: string;
}

export interface RegisterSandboxApplicationOptions {
  page: Page;
  runContext: RunContext;
  applicationRecordPath: string;
  developerHubWorkspaceRecordRef: string;
  applicationName: string;
  entryUrls?: SandboxApplicationEntryUrls;
  requiredApiBaselineRef?: string;
  notes?: string[];
}

export interface RegisterSandboxApplicationResult {
  outcome: "APPLICATION_READY";
  steps: StepContract[];
  sourceDisposition: SandboxApplicationSourceDisposition;
  evidenceManifestPath: string;
  applicationRecordPath: string;
  applicationRecord: SandboxApplicationRecord;
  notes: string[];
}

function nowIso(): string {
  return new Date().toISOString();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function persistJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function lastCompletedStepId(steps: StepContract[]): string {
  const completed = [...steps]
    .reverse()
    .find((step) => step.status !== "PENDING" && step.status !== "RUNNING");
  return completed?.stepId ?? HMRC_SANDBOX_APP_STEP_IDS.openApplications;
}

export function createDefaultSandboxApplicationEntryUrls(): SandboxApplicationEntryUrls {
  return {
    applications: "https://developer.service.hmrc.gov.uk/developer/applications",
  };
}

export async function loadApplicationConsoleSelectorManifest(): Promise<SelectorManifest> {
  const raw = await readFile(
    new URL("../selectors/application_console.selectors.json", import.meta.url),
    "utf8",
  );
  const manifest = JSON.parse(raw) as SelectorManifest;
  return {
    ...manifest,
    selectors: rankSelectors(manifest.selectors),
  };
}

export async function loadRequiredApiSetBaseline(): Promise<RequiredApiSetBaseline> {
  const raw = await readFile(
    new URL(
      "../../../../../../data/provisioning/hmrc_required_api_set_baseline.json",
      import.meta.url,
    ),
    "utf8",
  );
  return JSON.parse(raw) as RequiredApiSetBaseline;
}

function buildApplicationRecordId(
  runContext: RunContext,
  applicationName: string,
): string {
  return `hmrc-sandbox-app-${sanitizeAlias(runContext.workspaceId)}-${sanitizeAlias(
    applicationName,
  )}`;
}

async function isOnApplicationsPage(
  page: Page,
  entryUrls: SandboxApplicationEntryUrls,
  manifest: SelectorManifest,
): Promise<boolean> {
  const body = page.locator("body");
  const screen = await body.getAttribute("data-screen");
  if (screen === "applications") {
    return true;
  }
  if (page.url().split("#", 1)[0] === entryUrls.applications.split("#", 1)[0]) {
    return true;
  }
  return isSelectorVisible(page, manifest, "applications-heading");
}

async function locateVisible(locator: Locator): Promise<Locator | null> {
  try {
    const candidate = locator.first();
    if (await candidate.isVisible()) {
      return candidate;
    }
    return null;
  } catch {
    return null;
  }
}

export async function findApplicationLink(
  page: Page,
  applicationName: string,
): Promise<Locator | null> {
  const exact = await locateVisible(
    page.getByRole("link", {
      name: new RegExp(`^${escapeRegExp(applicationName)}$`, "i"),
    }),
  );
  if (exact) {
    return exact;
  }
  return locateVisible(page.getByText(applicationName, { exact: false }));
}

async function isOnApplicationConsole(
  page: Page,
  applicationName: string,
  manifest: SelectorManifest,
): Promise<boolean> {
  const body = page.locator("body");
  const screen = await body.getAttribute("data-screen");
  if (screen === "appconsole") {
    return true;
  }
  const heading = await locateVisible(
    page.getByRole("heading", {
      name: new RegExp(`^${escapeRegExp(applicationName)}$`, "i"),
    }),
  );
  if (!heading) {
    return false;
  }
  return isSelectorVisible(page, manifest, "manage-api-subscriptions");
}

async function detectExistingApplicationSignal(page: Page): Promise<boolean> {
  const text = (await page.evaluate(() => document.body.innerText))
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return text.includes("application with this name already exists");
}

function buildApplicationRecord(
  options: RegisterSandboxApplicationOptions,
  sourceDisposition: SandboxApplicationSourceDisposition,
  lastSafePageUrl: string,
  steps: StepContract[],
  evidenceManifestRef: string,
): SandboxApplicationRecord {
  return {
    schema_version: "1.0",
    application_record_id: buildApplicationRecordId(
      options.runContext,
      options.applicationName,
    ),
    provider_id: "hmrc-developer-hub",
    provider_display_name: "HMRC Developer Hub",
    workspace_id: options.runContext.workspaceId,
    run_id: options.runContext.runId,
    flow_id: HMRC_SANDBOX_APP_FLOW_ID,
    product_environment_id: options.runContext.productEnvironmentId,
    provider_environment: options.runContext.providerEnvironment,
    operator_identity_alias: options.runContext.operatorIdentityAlias,
    developer_hub_workspace_record_ref: options.developerHubWorkspaceRecordRef,
    required_api_baseline_ref:
      options.requiredApiBaselineRef ?? "./hmrc_required_api_set_baseline.json",
    subscription_matrix_ref: null,
    sandbox_application: {
      application_alias: sanitizeAlias(options.applicationName).toLowerCase(),
      application_display_name: options.applicationName,
      portal_environment: "SANDBOX",
      source_disposition: sourceDisposition,
      subscription_state: "NOT_YET_VERIFIED",
      application_console_url: lastSafePageUrl,
      api_subscriptions_page_url: lastSafePageUrl,
    },
    portal_state: {
      applications_console_url:
        options.entryUrls?.applications ??
        createDefaultSandboxApplicationEntryUrls().applications,
      last_safe_page_url: lastSafePageUrl,
      last_completed_step_id: lastCompletedStepId(steps),
      manual_checkpoint_open: false,
      evidence_manifest_ref: evidenceManifestRef,
    },
    evidence_refs: [],
    console_location_refs: [
      options.entryUrls?.applications ??
        createDefaultSandboxApplicationEntryUrls().applications,
      lastSafePageUrl,
    ],
    notes: [
      ...(options.notes ?? []),
      "Sanitized sandbox-application record only. Do not persist client IDs, client secrets, cookies, or bearer tokens here.",
    ],
    last_verified_at: nowIso(),
  };
}

export function assertSandboxApplicationRecordSanitized(
  record: SandboxApplicationRecord,
  forbiddenValues: string[] = [],
): void {
  const forbiddenKeys = new Set([
    "password",
    "cookie",
    "cookies",
    "client_id",
    "client_secret",
    "access_token",
    "refresh_token",
    "raw_secret",
  ]);

  function visit(value: unknown, pathSegments: string[]): void {
    if (Array.isArray(value)) {
      value.forEach((entry, index) => visit(entry, [...pathSegments, String(index)]));
      return;
    }

    if (value && typeof value === "object") {
      for (const [key, entry] of Object.entries(value)) {
        if (forbiddenKeys.has(key)) {
          throw new Error(
            `Sandbox application record contains forbidden field ${[...pathSegments, key].join(".")}.`,
          );
        }
        visit(entry, [...pathSegments, key]);
      }
      return;
    }

    if (typeof value === "string") {
      for (const forbiddenValue of forbiddenValues) {
        if (forbiddenValue && new RegExp(escapeRegExp(forbiddenValue), "i").test(value)) {
          throw new Error(
            "Sandbox application record contains a forbidden raw secret or credential value.",
          );
        }
      }
    }
  }

  visit(record, []);

  if (record.schema_version !== "1.0") {
    throw new Error("Sandbox application record schema_version must remain 1.0.");
  }
  if (record.provider_id !== DEVELOPER_HUB_PROVIDER_ID) {
    throw new Error("Sandbox application record provider_id must remain hmrc-developer-hub.");
  }
  if (record.flow_id !== HMRC_SANDBOX_APP_FLOW_ID) {
    throw new Error("Sandbox application record flow_id must remain sandbox-app-registration.");
  }
  if (record.sandbox_application.portal_environment !== "SANDBOX") {
    throw new Error("Sandbox application record must remain scoped to the sandbox portal.");
  }
  if (!record.console_location_refs.length || !record.evidence_refs.length) {
    throw new Error(
      "Sandbox application record must contain at least one console ref and one evidence ref.",
    );
  }
}

export async function registerSandboxApplication(
  options: RegisterSandboxApplicationOptions,
): Promise<RegisterSandboxApplicationResult> {
  const entryUrls = options.entryUrls ?? createDefaultSandboxApplicationEntryUrls();
  const selectorManifest = await loadApplicationConsoleSelectorManifest();
  const providerRegistry = createDefaultProviderRegistry();
  const provider = providerRegistry.getRequired(DEVELOPER_HUB_PROVIDER_ID);

  if (options.runContext.flowId !== HMRC_SANDBOX_APP_FLOW_ID) {
    throw new Error(
      `RunContext flowId must be ${HMRC_SANDBOX_APP_FLOW_ID} for HMRC sandbox application registration.`,
    );
  }

  assertProviderFlowAllowed(options.runContext, provider, HMRC_SANDBOX_APP_FLOW_ID);

  const steps: StepContract[] = [];
  let evidenceManifest = createDeveloperHubEvidenceManifest(options.runContext);

  let openApplicationsStep = transitionStep(
    createPendingStep({
      stepId: HMRC_SANDBOX_APP_STEP_IDS.openApplications,
      title: "Open the HMRC Developer Hub Applications area",
      selectorRefs: ["applications-heading", "add-application", "cookie-reject"],
    }),
    "RUNNING",
    "Opening the Applications console before checking for the canonical sandbox application.",
  );
  steps.push(openApplicationsStep);

  await options.page.goto(entryUrls.applications);
  await waitForPortalStability(options.page);
  await dismissCookieBanner(options.page, selectorManifest);

  if (!(await isOnApplicationsPage(options.page, entryUrls, selectorManifest))) {
    throw new Error(
      "Selector drift detected for applications-heading: the HMRC Applications area could not be confirmed.",
    );
  }

  openApplicationsStep = transitionStep(
    openApplicationsStep,
    "SUCCEEDED",
    "Applications console verified and ready for deterministic application lookup.",
  );
  steps[0] = openApplicationsStep;
  evidenceManifest = appendSanitizedEvidence(
    evidenceManifest,
    openApplicationsStep,
    `Applications console ready at ${options.page.url()} for canonical sandbox application ${options.applicationName}.`,
    [],
    openApplicationsStep.selectorRefs,
  );

  const existingRecordPresent = await fileExists(options.applicationRecordPath);

  let detectExistingApplicationStep = transitionStep(
    createPendingStep({
      stepId: HMRC_SANDBOX_APP_STEP_IDS.detectExistingApplication,
      title: "Detect whether the canonical HMRC sandbox application already exists",
    }),
    "RUNNING",
    "Checking the Applications console for the canonical sandbox application.",
  );
  steps.push(detectExistingApplicationStep);

  const existingApplicationLink = await findApplicationLink(
    options.page,
    options.applicationName,
  );

  let sourceDisposition: SandboxApplicationSourceDisposition;
  if (existingApplicationLink) {
    await existingApplicationLink.click();
    await waitForPortalStability(options.page);

    if (!(await isOnApplicationConsole(options.page, options.applicationName, selectorManifest))) {
      throw new Error(
        "Existing sandbox application was selected but the application console could not be confirmed.",
      );
    }

    detectExistingApplicationStep = markSkippedAsAlreadyPresent(
      detectExistingApplicationStep,
      "Canonical sandbox application already exists and was adopted safely.",
    );
    sourceDisposition = "ADOPTED_EXISTING";
  } else {
    detectExistingApplicationStep = transitionStep(
      detectExistingApplicationStep,
      "SUCCEEDED",
      "Canonical sandbox application not found; creation flow is required.",
    );

    let openCreateStep = transitionStep(
      createPendingStep({
        stepId: HMRC_SANDBOX_APP_STEP_IDS.openCreateApplication,
        title: "Open the sandbox application creation form",
        selectorRefs: ["add-application", "create-application-heading"],
      }),
      "RUNNING",
      "Opening the Add an application flow from the Applications console.",
    );
    steps.push(openCreateStep);

    await (await getRequiredLocator(options.page, selectorManifest, "add-application")).click();
    await waitForPortalStability(options.page);

    if (!(await isSelectorVisible(options.page, selectorManifest, "create-application-heading"))) {
      throw new Error(
        "Selector drift detected for create-application-heading: the sandbox application creation form could not be confirmed.",
      );
    }

    openCreateStep = transitionStep(
      openCreateStep,
      "SUCCEEDED",
      "Sandbox application creation form verified.",
    );
    steps[steps.length - 1] = openCreateStep;
    evidenceManifest = appendSanitizedEvidence(
      evidenceManifest,
      openCreateStep,
      `Application creation form ready at ${options.page.url()} for ${options.applicationName}.`,
      [],
      openCreateStep.selectorRefs,
    );

    let submitCreateStep = transitionStep(
      createPendingStep({
        stepId: HMRC_SANDBOX_APP_STEP_IDS.submitCreateApplication,
        title: "Create or adopt the canonical HMRC sandbox application",
        selectorRefs: ["application-name-field", "create-application-submit"],
      }),
      "RUNNING",
      "Submitting the canonical sandbox application name.",
    );
    steps.push(submitCreateStep);

    await (await getRequiredLocator(options.page, selectorManifest, "application-name-field")).fill(
      options.applicationName,
    );
    await (
      await getRequiredLocator(options.page, selectorManifest, "create-application-submit")
    ).click();
    await waitForPortalStability(options.page);

    if (await detectExistingApplicationSignal(options.page)) {
      await options.page.goto(entryUrls.applications);
      await waitForPortalStability(options.page);
      await dismissCookieBanner(options.page, selectorManifest);

      const adoptedAfterCollision = await findApplicationLink(
        options.page,
        options.applicationName,
      );
      if (!adoptedAfterCollision) {
        throw new Error(
          "Sandbox application create flow reported an existing application but the canonical application could not be re-located afterwards.",
        );
      }
      await adoptedAfterCollision.click();
      await waitForPortalStability(options.page);
      sourceDisposition = "ADOPTED_EXISTING";
      submitCreateStep = transitionStep(
        submitCreateStep,
        "SUCCEEDED",
        "Creation path reported an existing application; the canonical application was adopted instead.",
      );
    } else {
      sourceDisposition = existingRecordPresent
        ? "RECREATED_AFTER_RETENTION_EXPIRY"
        : "CREATED_DURING_RUN";
      submitCreateStep = transitionStep(
        submitCreateStep,
        "SUCCEEDED",
        "Sandbox application creation submitted successfully.",
      );
    }

    if (!(await isOnApplicationConsole(options.page, options.applicationName, selectorManifest))) {
      throw new Error(
        "Application creation completed but the sandbox application console could not be confirmed.",
      );
    }

    steps[steps.length - 1] = submitCreateStep;
    evidenceManifest = appendSanitizedEvidence(
      evidenceManifest,
      submitCreateStep,
      `Application console verified at ${options.page.url()} for ${options.applicationName}.`,
      [],
      [...submitCreateStep.selectorRefs, "manage-api-subscriptions"],
    );
  }

  steps[1] = detectExistingApplicationStep;
  evidenceManifest = appendSanitizedEvidence(
    evidenceManifest,
    detectExistingApplicationStep,
    `Canonical sandbox application ${options.applicationName} resolved with disposition ${sourceDisposition ?? "ADOPTED_EXISTING"}.`,
    [],
  );

  let persistStep = transitionStep(
    createPendingStep({
      stepId: HMRC_SANDBOX_APP_STEP_IDS.persistApplicationRecord,
      title: "Persist the sanitized HMRC sandbox application record",
    }),
    "RUNNING",
    "Writing the sanitized sandbox application record and evidence manifest.",
  );
  steps.push(persistStep);

  const evidenceManifestPath = options.applicationRecordPath.replace(
    /\.json$/i,
    ".evidence_manifest.json",
  );
  const applicationRecord = buildApplicationRecord(
    options,
    sourceDisposition ?? "ADOPTED_EXISTING",
    options.page.url(),
    steps,
    evidenceManifestPath,
  );
  applicationRecord.evidence_refs = evidenceManifest.entries.map(
    (entry) => `evidence://${options.runContext.runId}/${entry.evidenceId}`,
  );

  await persistJson(evidenceManifestPath, evidenceManifest);
  await persistJson(options.applicationRecordPath, applicationRecord);
  assertSandboxApplicationRecordSanitized(applicationRecord);

  persistStep = transitionStep(
    persistStep,
    "SUCCEEDED",
    "Sanitized sandbox application record and evidence manifest written successfully.",
  );
  steps[steps.length - 1] = persistStep;

  return {
    outcome: "APPLICATION_READY",
    steps,
    sourceDisposition: sourceDisposition ?? "ADOPTED_EXISTING",
    evidenceManifestPath,
    applicationRecordPath: options.applicationRecordPath,
    applicationRecord,
    notes: [
      "Sandbox application registration stops before client credential export.",
      "Later provisioning cards should consume the sanitized application record rather than rediscovering application identity from the portal.",
    ],
  };
}
