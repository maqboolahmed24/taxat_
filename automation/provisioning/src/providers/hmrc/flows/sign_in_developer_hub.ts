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
  detectRegistrationRequiredSignal,
  dismissCookieBanner,
  fillRequiredSelector,
  getRequiredLocator,
  isOnApplicationsPage,
  isOnSignInPage,
  loadDeveloperHubSelectorManifest,
  waitForPortalStability,
  type DeveloperHubFlowOptions,
  type DeveloperHubFlowResult,
} from "./developer_hub_shared.js";

export async function signInDeveloperHub(
  options: DeveloperHubFlowOptions,
): Promise<DeveloperHubFlowResult> {
  const entryUrls = options.entryUrls ?? createDefaultDeveloperHubEntryUrls();
  const selectorManifest = await loadDeveloperHubSelectorManifest();
  const redactionRules = buildDeveloperHubRedactionRules(options.credentials);
  const steps: StepContract[] = [];
  let evidenceManifest = createDeveloperHubEvidenceManifest(options.runContext);

  let openStep = transitionStep(
    createPendingStep({
      stepId: DEVELOPER_HUB_STEP_IDS.openSignIn,
      title: "Open the HMRC Developer Hub sign-in page",
      selectorRefs: ["sign-in-heading", "cookie-reject"],
    }),
    "RUNNING",
    "Navigating to the HMRC sign-in entry point.",
  );
  steps.push(openStep);

  await options.page.goto(entryUrls.signIn);
  await waitForPortalStability(options.page);
  await dismissCookieBanner(options.page, selectorManifest);

  if (!(await isOnSignInPage(options.page, entryUrls, selectorManifest))) {
    throw new Error(
      "Selector drift detected for sign-in-heading: the HMRC sign-in page could not be confirmed.",
    );
  }

  openStep = transitionStep(
    openStep,
    "SUCCEEDED",
    "Sign-in page verified and ready for controlled input.",
  );
  steps[0] = openStep;
  evidenceManifest = appendSanitizedEvidence(
    evidenceManifest,
    openStep,
    `Sign-in page ready at ${options.page.url()} for account alias ${options.accountAlias}.`,
    redactionRules,
    openStep.selectorRefs,
  );

  let submitStep = transitionStep(
    createPendingStep({
      stepId: DEVELOPER_HUB_STEP_IDS.submitSignIn,
      title: "Submit the HMRC Developer Hub sign-in form",
      selectorRefs: ["sign-in-email", "sign-in-password", "sign-in-submit"],
      sensitiveCapturePolicy: "SUPPRESS",
    }),
    "RUNNING",
    "Submitting the governed Developer Hub credentials.",
  );
  steps.push(submitStep);

  await fillRequiredSelector(
    options.page,
    selectorManifest,
    "sign-in-email",
    options.credentials.emailAddress,
  );
  await fillRequiredSelector(
    options.page,
    selectorManifest,
    "sign-in-password",
    options.credentials.password,
  );
  await (await getRequiredLocator(options.page, selectorManifest, "sign-in-submit")).click();
  await waitForPortalStability(options.page);

  evidenceManifest = appendSanitizedEvidence(
    evidenceManifest,
    submitStep,
    `Sign-in form submitted at ${options.page.url()}.`,
    redactionRules,
    submitStep.selectorRefs,
  );

  if (await isOnApplicationsPage(options.page, entryUrls, selectorManifest)) {
    submitStep = transitionStep(
      submitStep,
      "SUCCEEDED",
      "Sign-in completed and the Applications area was verified.",
    );
    steps[steps.length - 1] = submitStep;
    evidenceManifest = appendSanitizedEvidence(
      evidenceManifest,
      submitStep,
      `Applications area verified after sign-in at ${options.page.url()}.`,
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
      sourceDisposition: "ADOPTED_EXISTING",
      lastSafePageUrl: options.page.url(),
      notes: ["Existing Developer Hub account signed in successfully."],
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
      "Sign-in submission completed and handed off to a manual checkpoint.",
    );
    steps[steps.length - 1] = submitStep;

    const checkpointStep = attachManualCheckpoint(
      createPendingStep({
        stepId: DEVELOPER_HUB_STEP_IDS.awaitCheckpoint,
        title: "Await sign-in security checkpoint resolution",
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
      sourceDisposition: "ADOPTED_EXISTING",
      lastSafePageUrl: options.page.url(),
      notes: ["Existing account sign-in requires human completion before the Applications area can be used."],
    };
  }

  if (await detectRegistrationRequiredSignal(options.page)) {
    submitStep = transitionStep(
      submitStep,
      "SUCCEEDED",
      "Sign-in path explicitly reported that registration is required.",
    );
    steps[steps.length - 1] = submitStep;
    evidenceManifest = appendSanitizedEvidence(
      evidenceManifest,
      submitStep,
      "Sign-in path reported that no existing account could be adopted and a registration path is required.",
      redactionRules,
    );
    return {
      outcome: "REGISTRATION_REQUIRED",
      steps,
      evidenceManifest,
      checkpoint: null,
      accountStatus: "SIGN_IN_REQUIRED",
      landingStatus: "AUTHENTICATION_REQUIRED",
      sourceDisposition: "ADOPTED_EXISTING",
      lastSafePageUrl: options.page.url(),
      notes: ["Sign-in path signaled that account creation is required before the workspace can be used."],
    };
  }

  throw new Error(
    "Sign-in completed without reaching Applications, a supported checkpoint, or an explicit registration-required signal.",
  );
}
