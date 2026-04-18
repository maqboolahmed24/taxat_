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
  transitionStep,
  type StepContract,
} from "../../../core/step_contract.js";
import {
  appendSanitizedEvidence,
  createDeveloperHubEvidenceManifest,
  DEVELOPER_HUB_PROVIDER_ID,
  dismissCookieBanner,
  waitForPortalStability,
} from "./developer_hub_shared.js";
import {
  HMRC_SANDBOX_APP_FLOW_ID,
  createDefaultSandboxApplicationEntryUrls,
  findApplicationLink,
  loadApplicationConsoleSelectorManifest,
  loadRequiredApiSetBaseline,
  assertSandboxApplicationRecordSanitized,
  type RequiredApiDescriptor,
  type SandboxApplicationEntryUrls,
  type SandboxApplicationRecord,
} from "./register_sandbox_application.js";

export const HMRC_SANDBOX_SUBSCRIPTION_STEP_IDS = {
  openApplication: "hmrc.devhub.sandbox-app.open-application",
  openSubscriptions: "hmrc.devhub.sandbox-app.open-subscriptions",
  reconcileSubscriptions: "hmrc.devhub.sandbox-app.reconcile-subscriptions",
  persistSubscriptionMatrix: "hmrc.devhub.sandbox-app.persist-subscription-matrix",
} as const;

export type ApiLabelResolution =
  | "CANONICAL_MATCH"
  | "ALIAS_MATCH"
  | "PORTAL_NOT_PRESENT";

export type ApiSubscriptionAction =
  | "ALREADY_SUBSCRIBED"
  | "SUBSCRIBED_DURING_RUN"
  | "DEFERRED_SCOPE";

export interface SandboxApiSubscriptionRow {
  api_key: string;
  display_name: string;
  current_observed_version: string;
  scope_bucket: "REQUIRED_NOW" | "LIKELY_REQUIRED_LATER";
  portal_label: string | null;
  label_resolution: ApiLabelResolution;
  subscription_state: "SUBSCRIBED" | "DEFERRED_SCOPE" | "NOT_VISIBLE";
  action_taken: ApiSubscriptionAction;
  relevant_operation_families: string[];
  documentation_url: string;
  source_refs: Array<{ url: string; rationale: string }>;
  notes: string[];
}

export interface SandboxApiSubscriptionMatrix {
  schema_version: "1.0";
  matrix_id: string;
  provider_id: "hmrc-developer-hub";
  provider_display_name: "HMRC Developer Hub";
  run_id: string;
  flow_id: "sandbox-app-registration";
  product_environment_id: string;
  provider_environment: "sandbox" | "production" | "fixture";
  operator_identity_alias: string;
  application_record_ref: string;
  required_api_baseline_ref: string;
  application_alias: string;
  application_display_name: string;
  applications_console_url: string;
  api_subscriptions_page_url: string;
  required_now_complete: boolean;
  rows: SandboxApiSubscriptionRow[];
  typed_gaps: string[];
  evidence_refs: string[];
  notes: string[];
  last_verified_at: string;
}

export interface SubscribeRequiredMtdApisOptions {
  page: Page;
  runContext: RunContext;
  applicationRecordPath: string;
  subscriptionMatrixPath: string;
  entryUrls?: SandboxApplicationEntryUrls;
  notes?: string[];
}

export interface SubscribeRequiredMtdApisResult {
  outcome: "SUBSCRIPTIONS_READY";
  steps: StepContract[];
  evidenceManifestPath: string;
  subscriptionMatrixPath: string;
  subscriptionMatrix: SandboxApiSubscriptionMatrix;
  applicationRecord: SandboxApplicationRecord;
  notes: string[];
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[()]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function persistJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function isVisible(locator: Locator): Promise<boolean> {
  try {
    return await locator.first().isVisible();
  } catch {
    return false;
  }
}

function labelCandidates(api: RequiredApiDescriptor): string[] {
  return [api.display_name, ...api.portal_label_aliases].filter(
    (value, index, all) => all.indexOf(value) === index,
  );
}

async function resolveApiCheckbox(
  page: Page,
  api: RequiredApiDescriptor,
): Promise<{
  locator: Locator;
  portalLabel: string;
  labelResolution: ApiLabelResolution;
} | null> {
  for (const candidate of labelCandidates(api)) {
    const exactRole = page.getByRole("checkbox", {
      name: new RegExp(`^${escapeRegExp(candidate)}$`, "i"),
    });
    if (await isVisible(exactRole)) {
      return {
        locator: exactRole.first(),
        portalLabel: candidate,
        labelResolution:
          candidate === api.display_name ? "CANONICAL_MATCH" : "ALIAS_MATCH",
      };
    }

    const label = page.getByLabel(candidate, { exact: false });
    if (await isVisible(label)) {
      return {
        locator: label.first(),
        portalLabel: candidate,
        labelResolution:
          candidate === api.display_name ? "CANONICAL_MATCH" : "ALIAS_MATCH",
      };
    }
  }

  const apiRows = page.locator("[data-testid='api-subscription-row']");
  const rowCount = await apiRows.count();
  for (let index = 0; index < rowCount; index += 1) {
    const row = apiRows.nth(index);
    const labelText = normalizeLabel(await row.innerText());
    for (const candidate of labelCandidates(api)) {
      if (!labelText.includes(normalizeLabel(candidate))) {
        continue;
      }
      const rowCheckbox = row.getByRole("checkbox");
      if (!(await isVisible(rowCheckbox))) {
        continue;
      }
      return {
        locator: rowCheckbox.first(),
        portalLabel: (await row.innerText()).replace(/\s+/g, " ").trim(),
        labelResolution:
          candidate === api.display_name ? "CANONICAL_MATCH" : "ALIAS_MATCH",
      };
    }
  }

  return null;
}

function buildMatrixId(record: SandboxApplicationRecord): string {
  return `${record.application_record_id}-required-api-matrix`;
}

async function loadApplicationRecord(
  applicationRecordPath: string,
): Promise<SandboxApplicationRecord> {
  const raw = await readFile(applicationRecordPath, "utf8");
  return JSON.parse(raw) as SandboxApplicationRecord;
}

export async function subscribeRequiredMtdApis(
  options: SubscribeRequiredMtdApisOptions,
): Promise<SubscribeRequiredMtdApisResult> {
  const entryUrls = options.entryUrls ?? createDefaultSandboxApplicationEntryUrls();
  const selectorManifest = await loadApplicationConsoleSelectorManifest();
  const baseline = await loadRequiredApiSetBaseline();
  const applicationRecord = await loadApplicationRecord(options.applicationRecordPath);
  const providerRegistry = createDefaultProviderRegistry();
  const provider = providerRegistry.getRequired(DEVELOPER_HUB_PROVIDER_ID);

  if (options.runContext.flowId !== HMRC_SANDBOX_APP_FLOW_ID) {
    throw new Error(
      `RunContext flowId must be ${HMRC_SANDBOX_APP_FLOW_ID} for HMRC sandbox subscriptions.`,
    );
  }

  assertProviderFlowAllowed(options.runContext, provider, HMRC_SANDBOX_APP_FLOW_ID);
  assertSandboxApplicationRecordSanitized(applicationRecord);

  const steps: StepContract[] = [];
  let evidenceManifest = createDeveloperHubEvidenceManifest(options.runContext);

  let openApplicationStep = transitionStep(
    createPendingStep({
      stepId: HMRC_SANDBOX_SUBSCRIPTION_STEP_IDS.openApplication,
      title: "Open the canonical HMRC sandbox application",
      selectorRefs: ["applications-heading", "manage-api-subscriptions"],
    }),
    "RUNNING",
    "Opening the Applications console and resolving the canonical sandbox application.",
  );
  steps.push(openApplicationStep);

  await options.page.goto(entryUrls.applications);
  await waitForPortalStability(options.page);
  await dismissCookieBanner(options.page, selectorManifest);

  const applicationLink = await findApplicationLink(
    options.page,
    applicationRecord.sandbox_application.application_display_name,
  );
  if (!applicationLink) {
    throw new Error(
      `Canonical sandbox application ${applicationRecord.sandbox_application.application_display_name} could not be located from the Applications console.`,
    );
  }
  await applicationLink.click();
  await waitForPortalStability(options.page);

  openApplicationStep = transitionStep(
    openApplicationStep,
    "SUCCEEDED",
    "Canonical sandbox application opened successfully.",
  );
  steps[0] = openApplicationStep;
  evidenceManifest = appendSanitizedEvidence(
    evidenceManifest,
    openApplicationStep,
    `Application console opened at ${options.page.url()} for ${applicationRecord.sandbox_application.application_display_name}.`,
    [],
    openApplicationStep.selectorRefs,
  );

  let openSubscriptionsStep = transitionStep(
    createPendingStep({
      stepId: HMRC_SANDBOX_SUBSCRIPTION_STEP_IDS.openSubscriptions,
      title: "Open Manage API subscriptions for the canonical sandbox application",
      selectorRefs: ["manage-api-subscriptions", "subscriptions-heading"],
    }),
    "RUNNING",
    "Opening the Manage API subscriptions surface for the canonical sandbox application.",
  );
  steps.push(openSubscriptionsStep);

  const manageApiSubscriptions = options.page.getByRole("link", {
    name: /manage api subscriptions/i,
  });
  if (!(await isVisible(manageApiSubscriptions))) {
    throw new Error(
      "Selector drift detected for manage-api-subscriptions: the application console no longer exposes a stable Manage API subscriptions entrypoint.",
    );
  }
  await manageApiSubscriptions.first().click();
  await waitForPortalStability(options.page);

  const subscriptionsHeading = options.page.getByRole("heading", {
    name: /manage api subscriptions/i,
  });
  if (!(await isVisible(subscriptionsHeading))) {
    throw new Error(
      "Selector drift detected for subscriptions-heading: the Manage API subscriptions surface could not be confirmed.",
    );
  }

  openSubscriptionsStep = transitionStep(
    openSubscriptionsStep,
    "SUCCEEDED",
    "Manage API subscriptions surface verified.",
  );
  steps[steps.length - 1] = openSubscriptionsStep;
  evidenceManifest = appendSanitizedEvidence(
    evidenceManifest,
    openSubscriptionsStep,
    `Manage API subscriptions ready at ${options.page.url()}.`,
    [],
    openSubscriptionsStep.selectorRefs,
  );

  let reconcileStep = transitionStep(
    createPendingStep({
      stepId: HMRC_SANDBOX_SUBSCRIPTION_STEP_IDS.reconcileSubscriptions,
      title: "Reconcile the required MTD Income Tax API subscriptions",
      selectorRefs: ["save-subscriptions"],
    }),
    "RUNNING",
    "Reconciling required-now and later-scope API subscriptions against the verified baseline.",
  );
  steps.push(reconcileStep);

  const rows: SandboxApiSubscriptionRow[] = [];
  const typedGaps: string[] = [];
  let mutated = false;

  for (const api of baseline.required_now) {
    const resolved = await resolveApiCheckbox(options.page, api);
    if (!resolved) {
      throw new Error(
        `API label drift detected for ${api.api_key}: none of the expected portal labels are currently addressable.`,
      );
    }

    const checkedBefore = await resolved.locator.isChecked();
    if (!checkedBefore) {
      await resolved.locator.check();
      mutated = true;
    }
    rows.push({
      api_key: api.api_key,
      display_name: api.display_name,
      current_observed_version: api.current_observed_version,
      scope_bucket: "REQUIRED_NOW",
      portal_label: resolved.portalLabel,
      label_resolution: resolved.labelResolution,
      subscription_state: "SUBSCRIBED",
      action_taken: checkedBefore ? "ALREADY_SUBSCRIBED" : "SUBSCRIBED_DURING_RUN",
      relevant_operation_families: api.relevant_operation_families,
      documentation_url: api.documentation_url,
      source_refs: api.source_refs,
      notes: [
        api.requirement_rationale,
        checkedBefore
          ? "Subscription was already present before reconciliation."
          : "Subscription was enabled during this reconciliation run.",
      ],
    });

    if (resolved.labelResolution === "ALIAS_MATCH") {
      typedGaps.push(
        `Portal label drift resolved for ${api.api_key}: matched "${resolved.portalLabel}" instead of canonical "${api.display_name}".`,
      );
    }
  }

  for (const api of baseline.likely_required_later) {
    const resolved = await resolveApiCheckbox(options.page, api);
    rows.push({
      api_key: api.api_key,
      display_name: api.display_name,
      current_observed_version: api.current_observed_version,
      scope_bucket: "LIKELY_REQUIRED_LATER",
      portal_label: resolved?.portalLabel ?? null,
      label_resolution: resolved?.labelResolution ?? "PORTAL_NOT_PRESENT",
      subscription_state: resolved && (await resolved.locator.isChecked())
        ? "SUBSCRIBED"
        : resolved
          ? "DEFERRED_SCOPE"
          : "NOT_VISIBLE",
      action_taken: "DEFERRED_SCOPE",
      relevant_operation_families: api.relevant_operation_families,
      documentation_url: api.documentation_url,
      source_refs: api.source_refs,
      notes: [
        api.requirement_rationale,
        "Current roadmap slice records this API as deferred scope and does not subscribe it automatically.",
      ],
    });
    if (!resolved) {
      typedGaps.push(
        `Later-scope API ${api.api_key} is not currently visible on the portal subscription surface.`,
      );
    }
  }

  if (mutated) {
    await options.page.getByRole("button", { name: /save subscriptions/i }).click();
    await waitForPortalStability(options.page);
  }

  for (const api of baseline.required_now) {
    const resolved = await resolveApiCheckbox(options.page, api);
    if (!resolved || !(await resolved.locator.isChecked())) {
      throw new Error(
        `Required sandbox API ${api.display_name} was not confirmed as subscribed after reconciliation.`,
      );
    }
  }

  reconcileStep = transitionStep(
    reconcileStep,
    "SUCCEEDED",
    mutated
      ? "Required-now API subscriptions were reconciled and saved successfully."
      : "Required-now API subscriptions were already satisfied.",
  );
  steps[steps.length - 1] = reconcileStep;
  evidenceManifest = appendSanitizedEvidence(
    evidenceManifest,
    reconcileStep,
    `Required-now subscription reconciliation completed at ${options.page.url()}.`,
    [],
    reconcileStep.selectorRefs,
  );

  let persistStep = transitionStep(
    createPendingStep({
      stepId: HMRC_SANDBOX_SUBSCRIPTION_STEP_IDS.persistSubscriptionMatrix,
      title: "Persist the sanitized HMRC sandbox API subscription matrix",
    }),
    "RUNNING",
    "Writing the subscription matrix, evidence manifest, and updated sandbox application record.",
  );
  steps.push(persistStep);

  const evidenceManifestPath = options.subscriptionMatrixPath.replace(
    /\.json$/i,
    ".evidence_manifest.json",
  );
  const subscriptionMatrix: SandboxApiSubscriptionMatrix = {
    schema_version: "1.0",
    matrix_id: buildMatrixId(applicationRecord),
    provider_id: "hmrc-developer-hub",
    provider_display_name: "HMRC Developer Hub",
    run_id: options.runContext.runId,
    flow_id: HMRC_SANDBOX_APP_FLOW_ID,
    product_environment_id: options.runContext.productEnvironmentId,
    provider_environment: options.runContext.providerEnvironment,
    operator_identity_alias: options.runContext.operatorIdentityAlias,
    application_record_ref: options.applicationRecordPath,
    required_api_baseline_ref: applicationRecord.required_api_baseline_ref,
    application_alias: applicationRecord.sandbox_application.application_alias,
    application_display_name:
      applicationRecord.sandbox_application.application_display_name,
    applications_console_url: applicationRecord.portal_state.applications_console_url,
    api_subscriptions_page_url: options.page.url(),
    required_now_complete: true,
    rows,
    typed_gaps: typedGaps,
    evidence_refs: evidenceManifest.entries.map(
      (entry) => `evidence://${options.runContext.runId}/${entry.evidenceId}`,
    ),
    notes: [
      ...(options.notes ?? []),
      "Required-now APIs were reconciled from the live-verified HMRC baseline for this roadmap slice.",
      "Likely-required-later APIs were evaluated and recorded as deferred scope without mutating their subscription state.",
    ],
    last_verified_at: nowIso(),
  };

  applicationRecord.subscription_matrix_ref = options.subscriptionMatrixPath;
  applicationRecord.sandbox_application.subscription_state = "REQUIRED_NOW_SUBSCRIBED";
  applicationRecord.sandbox_application.api_subscriptions_page_url = options.page.url();
  applicationRecord.portal_state.last_safe_page_url = options.page.url();
  applicationRecord.portal_state.last_completed_step_id = HMRC_SANDBOX_SUBSCRIPTION_STEP_IDS.persistSubscriptionMatrix;
  applicationRecord.portal_state.evidence_manifest_ref = evidenceManifestPath;
  applicationRecord.evidence_refs = [
    ...new Set([...applicationRecord.evidence_refs, ...subscriptionMatrix.evidence_refs]),
  ];
  applicationRecord.console_location_refs = [
    ...new Set([
      ...applicationRecord.console_location_refs,
      applicationRecord.portal_state.applications_console_url,
      applicationRecord.sandbox_application.application_console_url,
      options.page.url(),
    ]),
  ];
  applicationRecord.notes = [
    ...applicationRecord.notes,
    "Required-now API subscriptions verified for the current roadmap slice.",
  ];
  applicationRecord.last_verified_at = subscriptionMatrix.last_verified_at;

  await persistJson(evidenceManifestPath, evidenceManifest);
  await persistJson(options.subscriptionMatrixPath, subscriptionMatrix);
  await persistJson(options.applicationRecordPath, applicationRecord);
  assertSandboxApplicationRecordSanitized(applicationRecord);

  persistStep = transitionStep(
    persistStep,
    "SUCCEEDED",
    "Subscription matrix, evidence manifest, and updated sandbox application record written successfully.",
  );
  steps[steps.length - 1] = persistStep;

  return {
    outcome: "SUBSCRIPTIONS_READY",
    steps,
    evidenceManifestPath,
    subscriptionMatrixPath: options.subscriptionMatrixPath,
    subscriptionMatrix,
    applicationRecord,
    notes: [
      "Required-now APIs are now normalized into one machine-readable subscription matrix.",
      "Later-scope APIs remain explicitly recorded as deferred scope rather than silently ignored.",
    ],
  };
}
