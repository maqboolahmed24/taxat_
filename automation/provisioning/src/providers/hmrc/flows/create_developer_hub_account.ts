import {
  createPendingStep,
  attachManualCheckpoint,
  transitionStep,
  type StepContract,
} from "../../../core/step_contract.js";
import {
  appendSanitizedEvidence,
  buildDeveloperHubRedactionRules,
  createDefaultDeveloperHubEntryUrls,
  createDeveloperHubEvidenceManifest,
  DEVELOPER_HUB_STEP_IDS,
  detectCheckpoint,
  detectExistingAccountSignal,
  dismissCookieBanner,
  fillRequiredSelector,
  getRequiredLocator,
  isOnApplicationsPage,
  isOnRegistrationPage,
  loadDeveloperHubSelectorManifest,
  waitForPortalStability,
  type DeveloperHubFlowOptions,
  type DeveloperHubFlowResult,
} from "./developer_hub_shared.js";

export async function createDeveloperHubAccount(
  options: DeveloperHubFlowOptions,
): Promise<DeveloperHubFlowResult> {
  const entryUrls = options.entryUrls ?? createDefaultDeveloperHubEntryUrls();
  const selectorManifest = await loadDeveloperHubSelectorManifest();
  const redactionRules = buildDeveloperHubRedactionRules(options.credentials);
  const steps: StepContract[] = [];
  let evidenceManifest = createDeveloperHubEvidenceManifest(options.runContext);

  let openStep = transitionStep(
    createPendingStep({
      stepId: DEVELOPER_HUB_STEP_IDS.openRegister,
      title: "Open the HMRC Developer Hub registration page",
      selectorRefs: ["registration-heading", "cookie-reject"],
    }),
    "RUNNING",
    "Navigating to the HMRC registration entry point.",
  );
  steps.push(openStep);

  await options.page.goto(entryUrls.register);
  await waitForPortalStability(options.page);
  await dismissCookieBanner(options.page, selectorManifest);

  if (!(await isOnRegistrationPage(options.page, entryUrls, selectorManifest))) {
    throw new Error(
      "Selector drift detected for registration-heading: the HMRC registration landing page could not be confirmed.",
    );
  }

  openStep = transitionStep(
    openStep,
    "SUCCEEDED",
    "Registration page verified and ready for controlled input.",
  );
  steps[0] = openStep;
  evidenceManifest = appendSanitizedEvidence(
    evidenceManifest,
    openStep,
    `Registration page ready at ${options.page.url()} for account alias ${options.accountAlias}.`,
    redactionRules,
    openStep.selectorRefs,
  );

  let submitStep = transitionStep(
    createPendingStep({
      stepId: DEVELOPER_HUB_STEP_IDS.submitRegister,
      title: "Submit the HMRC Developer Hub registration form",
      selectorRefs: [
        "registration-first-name",
        "registration-last-name",
        "registration-email",
        "registration-password",
        "registration-confirm-password",
        "registration-submit",
      ],
      sensitiveCapturePolicy: "SUPPRESS",
    }),
    "RUNNING",
    "Filling the registration form with governed runtime values.",
  );
  steps.push(submitStep);

  await fillRequiredSelector(
    options.page,
    selectorManifest,
    "registration-first-name",
    options.credentials.firstName,
  );
  await fillRequiredSelector(
    options.page,
    selectorManifest,
    "registration-last-name",
    options.credentials.lastName,
  );
  await fillRequiredSelector(
    options.page,
    selectorManifest,
    "registration-email",
    options.credentials.emailAddress,
  );
  await fillRequiredSelector(
    options.page,
    selectorManifest,
    "registration-password",
    options.credentials.password,
  );
  await fillRequiredSelector(
    options.page,
    selectorManifest,
    "registration-confirm-password",
    options.credentials.password,
  );
  await (await getRequiredLocator(options.page, selectorManifest, "registration-submit")).click();
  await waitForPortalStability(options.page);

  evidenceManifest = appendSanitizedEvidence(
    evidenceManifest,
    submitStep,
    `Registration form submitted at ${options.page.url()}.`,
    redactionRules,
    submitStep.selectorRefs,
  );

  if (await detectExistingAccountSignal(options.page)) {
    submitStep = transitionStep(
      submitStep,
      "SUCCEEDED",
      "Registration flow surfaced an existing-account signal; switching to sign-in.",
    );
    steps[steps.length - 1] = submitStep;
    evidenceManifest = appendSanitizedEvidence(
      evidenceManifest,
      submitStep,
      "Registration path indicated an existing HMRC Developer Hub account rather than a new-account path.",
      redactionRules,
      submitStep.selectorRefs,
    );
    return {
      outcome: "SIGN_IN_REQUIRED",
      steps,
      evidenceManifest,
      checkpoint: null,
      accountStatus: "SIGN_IN_REQUIRED",
      landingStatus: "AUTHENTICATION_REQUIRED",
      sourceDisposition: "ADOPTED_EXISTING",
      lastSafePageUrl: options.page.url(),
      notes: ["Registration path reported that the account already exists."],
    };
  }

  const checkpointState = await detectCheckpoint(
    DEVELOPER_HUB_STEP_IDS.awaitCheckpoint,
    options.page,
  );
  if (checkpointState) {
    submitStep = transitionStep(
      submitStep,
      "SUCCEEDED",
      "Registration submission completed and handed off to a manual checkpoint.",
    );
    steps[steps.length - 1] = submitStep;

    const checkpointStep = attachManualCheckpoint(
      createPendingStep({
        stepId: DEVELOPER_HUB_STEP_IDS.awaitCheckpoint,
        title: "Await activation or security checkpoint resolution",
        sensitiveCapturePolicy: "SUPPRESS",
      }),
      checkpointState.checkpoint,
    );
    steps.push(checkpointStep);
    evidenceManifest = appendSanitizedEvidence(
      evidenceManifest,
      checkpointStep,
      `Manual checkpoint required: ${checkpointState.checkpoint.reason} at ${options.page.url()}.`,
      redactionRules,
    );
    return {
      outcome: "MANUAL_CHECKPOINT_REQUIRED",
      steps,
      evidenceManifest,
      checkpoint: checkpointState.checkpoint,
      accountStatus: checkpointState.accountStatus,
      landingStatus: checkpointState.landingStatus,
      sourceDisposition: "CREATED_DURING_RUN",
      lastSafePageUrl: options.page.url(),
      notes: ["Registration requires human completion before the account can be used."],
    };
  }

  if (!(await isOnApplicationsPage(options.page, entryUrls, selectorManifest))) {
    throw new Error(
      "Registration completed but neither the Applications area nor a supported checkpoint state was detected.",
    );
  }

  submitStep = transitionStep(
    submitStep,
    "SUCCEEDED",
    "Registration completed and the Applications area was verified.",
  );
  steps[steps.length - 1] = submitStep;
  evidenceManifest = appendSanitizedEvidence(
    evidenceManifest,
    submitStep,
    `Applications area verified after registration at ${options.page.url()}.`,
    redactionRules,
    ["applications-heading"],
  );

  return {
    outcome: "APPLICATIONS_READY",
    steps,
    evidenceManifest,
    checkpoint: null,
    accountStatus: "ACTIVE",
    landingStatus: "APPLICATIONS_HOME_REACHED",
    sourceDisposition: "CREATED_DURING_RUN",
    lastSafePageUrl: options.page.url(),
    notes: ["Developer Hub account registration completed and landed in Applications."],
  };
}
