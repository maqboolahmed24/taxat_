import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { FileResumeStore } from "../../../core/resume_store.js";
import {
  createRunContext,
  summarizeRunContext,
  assertLiveProviderGate,
  type ProviderEnvironment,
  type RunContext,
} from "../../../core/run_context.js";
import {
  createPendingStep,
  markSkippedAsAlreadyPresent,
  transitionStep,
  type StepContract,
} from "../../../core/step_contract.js";
import {
  assertProviderFlowAllowed,
  createDefaultProviderRegistry,
} from "../../../core/provider_registry.js";
import { createDeveloperHubAccount } from "./create_developer_hub_account.js";
import {
  appendSanitizedEvidence,
  buildWorkspaceRecordId,
  createDefaultDeveloperHubEntryUrls,
  createForbiddenValueMatcher,
  createDeveloperHubEvidenceManifest,
  DEVELOPER_HUB_FLOW_ID,
  DEVELOPER_HUB_PROVIDER_ID,
  DEVELOPER_HUB_STEP_IDS,
  deriveActivationStatus,
  dismissCookieBanner,
  fileExists,
  isLiveHmrcEntryUrls,
  isOnApplicationsPage,
  loadDeveloperHubSelectorManifest,
  mergeEvidenceManifests,
  sanitizeAlias,
  secretRefKind,
  waitForPortalStability,
  type DeveloperHubCredentials,
  type DeveloperHubEntryUrls,
  type DeveloperHubFlowOptions,
  type DeveloperHubFlowResult,
  type DeveloperHubLandingStatus,
  type DeveloperHubSecretRefs,
  type DeveloperHubSourceDisposition,
} from "./developer_hub_shared.js";
import { signInDeveloperHub } from "./sign_in_developer_hub.js";

export interface DeveloperHubWorkspaceRecord {
  schema_version: "1.0";
  workspace_record_id: string;
  provider_id: "hmrc-developer-hub";
  provider_display_name: "HMRC Developer Hub";
  workspace_id: string;
  run_id: string;
  flow_id: string;
  product_environment_id: string;
  provider_environment: ProviderEnvironment;
  operator_identity_alias: string;
  developer_hub_account: {
    account_alias: string;
    email_alias: string;
    account_status:
      | "ACTIVE"
      | "ACTIVATION_PENDING"
      | "SIGN_IN_REQUIRED"
      | "SECURITY_REVIEW_REQUIRED";
    activation_status:
      | "NOT_REQUIRED"
      | "EMAIL_VERIFICATION_PENDING"
      | "VERIFIED"
      | "SECURITY_INTERSTITIAL_PENDING";
    source_disposition:
      | "ADOPTED_EXISTING"
      | "CREATED_DURING_RUN"
      | "RESUMED_AFTER_PARTIAL_FAILURE";
  };
  workspace_state: {
    landing_status:
      | "APPLICATIONS_HOME_REACHED"
      | "AUTHENTICATION_REQUIRED"
      | "ACTIVATION_REQUIRED"
      | "SECURITY_INTERSTITIAL_REQUIRED";
    manual_checkpoint_open: boolean;
    last_completed_step_id: string;
    last_safe_page_url: string;
    applications_console_url: string;
    evidence_manifest_ref: string;
    resume_snapshot_ref: string | null;
  };
  secret_ref_bindings: Array<{
    secret_class_id:
      | "developer_hub_account_alias"
      | "developer_hub_password_ref"
      | "developer_hub_activation_channel_ref"
      | "developer_hub_mfa_recovery_material_ref"
      | "provisioning_browser_storage_state_ref";
    ref_kind: string;
    ref_value: string;
  }>;
  evidence_refs: string[];
  console_location_refs: string[];
  notes: string[];
  last_verified_at: string;
}

export interface EnsureHmrcProjectWorkspaceOptions {
  page: DeveloperHubFlowOptions["page"];
  runContext: RunContext;
  workspaceRecordPath: string;
  resumeRoot?: string;
  entryUrls?: DeveloperHubEntryUrls;
  accountAlias: string;
  credentials: DeveloperHubCredentials;
  secretRefs: DeveloperHubSecretRefs;
  notes?: string[];
}

export interface EnsureHmrcProjectWorkspaceResult extends DeveloperHubFlowResult {
  workspaceRecord: DeveloperHubWorkspaceRecord;
  workspaceRecordPath: string;
  evidenceManifestPath: string;
  resumeSnapshotPath: string | null;
}

function nowIso(): string {
  return new Date().toISOString();
}

function ensureArrayHasValues(values: string[], label: string): void {
  if (values.length === 0) {
    throw new Error(`${label} must not be empty.`);
  }
}

function lastCompletedStepId(steps: StepContract[]): string {
  const completed = [...steps]
    .reverse()
    .find((step) => step.status !== "PENDING" && step.status !== "RUNNING");
  return completed?.stepId ?? steps.at(-1)?.stepId ?? DEVELOPER_HUB_STEP_IDS.detectSession;
}

function buildPersistStep(): StepContract {
  return transitionStep(
    transitionStep(
      createPendingStep({
        stepId: DEVELOPER_HUB_STEP_IDS.persistWorkspaceRecord,
        title: "Persist the sanitized HMRC Developer Hub workspace record",
      }),
      "RUNNING",
      "Writing the sanitized workspace record and evidence manifest.",
    ),
    "SUCCEEDED",
    "Sanitized workspace record and evidence manifest written successfully.",
  );
}

function buildWorkspaceRecord(
  options: EnsureHmrcProjectWorkspaceOptions,
  finalResult: DeveloperHubFlowResult,
  evidenceManifestRef: string,
  resumeSnapshotRef: string | null,
  entryUrls: DeveloperHubEntryUrls,
): DeveloperHubWorkspaceRecord {
  const bindings: DeveloperHubWorkspaceRecord["secret_ref_bindings"] = [
    {
      secret_class_id: "developer_hub_account_alias",
      ref_kind: secretRefKind("developer_hub_account_alias"),
      ref_value: options.secretRefs.accountAliasRef,
    },
    {
      secret_class_id: "developer_hub_password_ref",
      ref_kind: secretRefKind("developer_hub_password_ref"),
      ref_value: options.secretRefs.passwordRef,
    },
  ];

  if (options.secretRefs.activationChannelRef) {
    bindings.push({
      secret_class_id: "developer_hub_activation_channel_ref",
      ref_kind: secretRefKind("developer_hub_activation_channel_ref"),
      ref_value: options.secretRefs.activationChannelRef,
    });
  }
  if (options.secretRefs.mfaRecoveryRef) {
    bindings.push({
      secret_class_id: "developer_hub_mfa_recovery_material_ref",
      ref_kind: secretRefKind("developer_hub_mfa_recovery_material_ref"),
      ref_value: options.secretRefs.mfaRecoveryRef,
    });
  }
  if (options.secretRefs.browserStorageStateRef) {
    bindings.push({
      secret_class_id: "provisioning_browser_storage_state_ref",
      ref_kind: secretRefKind("provisioning_browser_storage_state_ref"),
      ref_value: options.secretRefs.browserStorageStateRef,
    });
  }

  return {
    schema_version: "1.0",
    workspace_record_id: buildWorkspaceRecordId(
      options.runContext,
      options.accountAlias,
    ),
    provider_id: "hmrc-developer-hub",
    provider_display_name: "HMRC Developer Hub",
    workspace_id: options.runContext.workspaceId,
    run_id: options.runContext.runId,
    flow_id: options.runContext.flowId,
    product_environment_id: options.runContext.productEnvironmentId,
    provider_environment: options.runContext.providerEnvironment,
    operator_identity_alias: options.runContext.operatorIdentityAlias,
    developer_hub_account: {
      account_alias: sanitizeAlias(options.accountAlias),
      email_alias: sanitizeAlias(options.credentials.emailAddress),
      account_status: finalResult.accountStatus,
      activation_status: deriveActivationStatus(finalResult.accountStatus),
      source_disposition: finalResult.sourceDisposition,
    },
    workspace_state: {
      landing_status: finalResult.landingStatus,
      manual_checkpoint_open: Boolean(finalResult.checkpoint),
      last_completed_step_id: lastCompletedStepId(finalResult.steps),
      last_safe_page_url: finalResult.lastSafePageUrl,
      applications_console_url: entryUrls.applications,
      evidence_manifest_ref: evidenceManifestRef,
      resume_snapshot_ref: resumeSnapshotRef,
    },
    secret_ref_bindings: bindings,
    evidence_refs: finalResult.evidenceManifest.entries.map(
      (entry) => `evidence://${options.runContext.runId}/${entry.evidenceId}`,
    ),
    console_location_refs: [
      entryUrls.register,
      entryUrls.signIn,
      entryUrls.applications,
      finalResult.lastSafePageUrl,
    ],
    notes: [
      ...(options.notes ?? []),
      ...finalResult.notes,
      "Sanitized workspace record only. No raw credentials, cookies, or active tokens are persisted here.",
    ],
    last_verified_at: nowIso(),
  };
}

export function assertDeveloperHubWorkspaceRecordSanitized(
  record: DeveloperHubWorkspaceRecord,
  forbiddenValues: string[] = [],
): void {
  const forbiddenKeys = new Set([
    "password",
    "cookie",
    "cookies",
    "access_token",
    "refresh_token",
    "client_secret",
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
            `Workspace record contains forbidden field ${[...pathSegments, key].join(".")}.`,
          );
        }
        visit(entry, [...pathSegments, key]);
      }
      return;
    }

    if (typeof value === "string") {
      for (const forbiddenValue of forbiddenValues) {
        if (!forbiddenValue) {
          continue;
        }
        if (createForbiddenValueMatcher(forbiddenValue).test(value)) {
          throw new Error("Workspace record contains a forbidden raw secret value.");
        }
      }
    }
  }

  visit(record, []);

  if (record.provider_id !== DEVELOPER_HUB_PROVIDER_ID) {
    throw new Error("Workspace record provider_id must remain hmrc-developer-hub.");
  }
  if (record.schema_version !== "1.0") {
    throw new Error("Workspace record schema_version must remain 1.0.");
  }
  ensureArrayHasValues(record.console_location_refs, "console_location_refs");
  ensureArrayHasValues(record.evidence_refs, "evidence_refs");
  ensureArrayHasValues(
    record.secret_ref_bindings.map((binding) => binding.ref_value),
    "secret_ref_bindings",
  );
}

async function persistJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(value, null, 2));
}

async function persistCheckpointSnapshot(
  options: EnsureHmrcProjectWorkspaceOptions,
  result: DeveloperHubFlowResult,
): Promise<{ resumeSnapshotPath: string | null; resumeSnapshotRef: string | null }> {
  if (!options.resumeRoot || !result.checkpoint) {
    return { resumeSnapshotPath: null, resumeSnapshotRef: null };
  }

  const store = new FileResumeStore(options.resumeRoot);
  await store.saveSnapshot({
    runContext: summarizeRunContext(options.runContext),
    steps: result.steps,
    checkpoint: result.checkpoint,
    browserStorageStateRef: options.secretRefs.browserStorageStateRef ?? null,
    notes: [
      `HMRC Developer Hub checkpoint opened: ${result.checkpoint.reason}`,
    ],
  });

  return {
    resumeSnapshotPath: path.join(
      options.resumeRoot,
      options.runContext.runId,
      "latest.json",
    ),
    resumeSnapshotRef: `resume://${options.runContext.runId}/latest`,
  };
}

export async function ensureHmrcProjectWorkspace(
  options: EnsureHmrcProjectWorkspaceOptions,
): Promise<EnsureHmrcProjectWorkspaceResult> {
  const entryUrls = options.entryUrls ?? createDefaultDeveloperHubEntryUrls();
  const selectorManifest = await loadDeveloperHubSelectorManifest();
  const providerRegistry = createDefaultProviderRegistry();
  const provider = providerRegistry.getRequired(DEVELOPER_HUB_PROVIDER_ID);

  if (options.runContext.flowId !== DEVELOPER_HUB_FLOW_ID) {
    throw new Error(
      `RunContext flowId must be ${DEVELOPER_HUB_FLOW_ID} for HMRC Developer Hub workspace setup.`,
    );
  }

  assertProviderFlowAllowed(options.runContext, provider, DEVELOPER_HUB_FLOW_ID);
  if (isLiveHmrcEntryUrls(entryUrls)) {
    assertLiveProviderGate(options.runContext);
  }

  const redactionRules = [options.credentials.password];
  const existingWorkspaceRecordPresent = await fileExists(options.workspaceRecordPath);
  const detectSessionStepIndex = 0;
  const steps: StepContract[] = [];
  let evidenceManifest = createDeveloperHubEvidenceManifest(options.runContext);

  let detectSessionStep = transitionStep(
    createPendingStep({
      stepId: DEVELOPER_HUB_STEP_IDS.detectSession,
      title: "Detect an existing authenticated Developer Hub session",
      selectorRefs: ["applications-heading", "sign-in-heading", "cookie-reject"],
    }),
    "RUNNING",
    "Opening the Applications entry point to detect whether a safe session already exists.",
  );
  steps.push(detectSessionStep);

  await options.page.goto(entryUrls.applications);
  await waitForPortalStability(options.page);
  await dismissCookieBanner(options.page, selectorManifest);

  if (await isOnApplicationsPage(options.page, entryUrls, selectorManifest)) {
    detectSessionStep = markSkippedAsAlreadyPresent(
      detectSessionStep,
      "Existing authenticated session already landed in the Applications area.",
    );
    steps[detectSessionStepIndex] = detectSessionStep;
    evidenceManifest = appendSanitizedEvidence(
      evidenceManifest,
      detectSessionStep,
      `Existing authenticated session adopted at ${options.page.url()}.`,
      [],
      detectSessionStep.selectorRefs,
    );

    const baseResult: DeveloperHubFlowResult = {
      outcome: "APPLICATIONS_READY",
      steps,
      evidenceManifest,
      checkpoint: null,
      accountStatus: "ACTIVE",
      landingStatus: "APPLICATIONS_HOME_REACHED",
      sourceDisposition: existingWorkspaceRecordPresent
        ? "RESUMED_AFTER_PARTIAL_FAILURE"
        : "ADOPTED_EXISTING",
      lastSafePageUrl: options.page.url(),
      notes: ["Applications area was already available and was adopted safely."],
    };

    const checkpointSnapshot = await persistCheckpointSnapshot(options, baseResult);
    const evidenceManifestPath = options.workspaceRecordPath.replace(
      /\.json$/i,
      ".evidence_manifest.json",
    );
    const persistStep = buildPersistStep();
    const finalizedBaseResult: DeveloperHubFlowResult = {
      ...baseResult,
      steps: [...baseResult.steps, persistStep],
      evidenceManifest: appendSanitizedEvidence(
        baseResult.evidenceManifest,
        persistStep,
        `Workspace record will be written to ${options.workspaceRecordPath}. Evidence manifest will be written to ${evidenceManifestPath}.`,
        [],
      ),
    };
    const workspaceRecord = buildWorkspaceRecord(
      options,
      finalizedBaseResult,
      `./${path.basename(evidenceManifestPath)}`,
      checkpointSnapshot.resumeSnapshotRef,
      entryUrls,
    );
    assertDeveloperHubWorkspaceRecordSanitized(workspaceRecord, redactionRules);
    await persistJson(evidenceManifestPath, finalizedBaseResult.evidenceManifest);
    await persistJson(options.workspaceRecordPath, workspaceRecord);
    return {
      ...finalizedBaseResult,
      workspaceRecord,
      workspaceRecordPath: options.workspaceRecordPath,
      evidenceManifestPath,
      resumeSnapshotPath: checkpointSnapshot.resumeSnapshotPath,
    };
  }

  detectSessionStep = transitionStep(
    detectSessionStep,
    "SUCCEEDED",
    "No active Applications session detected; continuing with bootstrap flow.",
  );
  steps[detectSessionStepIndex] = detectSessionStep;
  evidenceManifest = appendSanitizedEvidence(
    evidenceManifest,
    detectSessionStep,
    `No active Applications session detected at ${options.page.url()}.`,
    [],
    detectSessionStep.selectorRefs,
  );

  const flowOptions: DeveloperHubFlowOptions = {
    page: options.page,
    runContext: options.runContext,
    entryUrls,
    accountAlias: options.accountAlias,
    credentials: options.credentials,
  };

  let finalResult: DeveloperHubFlowResult;
  if (existingWorkspaceRecordPresent) {
    const signInResult = await signInDeveloperHub(flowOptions);
    finalResult = {
      ...signInResult,
      steps: [...steps, ...signInResult.steps],
      evidenceManifest: mergeEvidenceManifests(
        evidenceManifest,
        signInResult.evidenceManifest,
      ),
      notes: [
        "Existing workspace record found; sign-in path was attempted first.",
        ...signInResult.notes,
      ],
    };
  } else {
    const createResult = await createDeveloperHubAccount(flowOptions);
    let mergedCreateResult: DeveloperHubFlowResult = {
      ...createResult,
      steps: [...steps, ...createResult.steps],
      evidenceManifest: mergeEvidenceManifests(
        evidenceManifest,
        createResult.evidenceManifest,
      ),
      notes: [
        "No prior workspace record found; registration path was attempted first.",
        ...createResult.notes,
      ],
    };

    if (createResult.outcome === "SIGN_IN_REQUIRED") {
      const signInResult = await signInDeveloperHub(flowOptions);
      finalResult = {
        ...signInResult,
        steps: [...mergedCreateResult.steps, ...signInResult.steps],
        evidenceManifest: mergeEvidenceManifests(
          mergedCreateResult.evidenceManifest,
          signInResult.evidenceManifest,
        ),
        notes: [
          ...mergedCreateResult.notes,
          "Registration path detected an existing account and safely fell back to sign-in.",
          ...signInResult.notes,
        ],
      };
    } else {
      finalResult = mergedCreateResult;
    }
  }

  const checkpointSnapshot = await persistCheckpointSnapshot(options, finalResult);
  const evidenceManifestPath = options.workspaceRecordPath.replace(
    /\.json$/i,
    ".evidence_manifest.json",
  );
  const persistStep = buildPersistStep();
  finalResult = {
    ...finalResult,
    steps: [...finalResult.steps, persistStep],
    evidenceManifest: appendSanitizedEvidence(
      finalResult.evidenceManifest,
      persistStep,
      `Workspace record will be written to ${options.workspaceRecordPath}. Evidence manifest will be written to ${evidenceManifestPath}.`,
      [],
    ),
  };
  const workspaceRecord = buildWorkspaceRecord(
    options,
    finalResult,
    `./${path.basename(evidenceManifestPath)}`,
    checkpointSnapshot.resumeSnapshotRef,
    entryUrls,
  );
  assertDeveloperHubWorkspaceRecordSanitized(workspaceRecord, redactionRules);
  await persistJson(evidenceManifestPath, finalResult.evidenceManifest);
  await persistJson(options.workspaceRecordPath, workspaceRecord);

  return {
    ...finalResult,
    workspaceRecord,
    workspaceRecordPath: options.workspaceRecordPath,
    evidenceManifestPath,
    resumeSnapshotPath: checkpointSnapshot.resumeSnapshotPath,
  };
}
