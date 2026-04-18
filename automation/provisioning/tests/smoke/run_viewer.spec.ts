import { test, expect } from "@playwright/test";

const viewerUrl = "/report_viewer/index.html?fixture=./data/sample_run.json";
const credentialLedgerUrl =
  "/report_viewer/index.html?fixture=./data/sample_run.json&page=credential-lineage-ledger";
const idpTopologyAtlasUrl =
  "/report_viewer/index.html?fixture=./data/sample_run.json&page=idp-topology-atlas";
const accessStepupMatrixUrl =
  "/report_viewer/index.html?fixture=./data/sample_run.json&page=access-stepup-matrix";
const emailDomainReadinessBoardUrl =
  "/report_viewer/index.html?fixture=./data/sample_run.json&page=email-domain-readiness-board";
const notificationCopyAtlasUrl =
  "/report_viewer/index.html?fixture=./data/sample_run.json&page=notification-copy-atlas";
const deviceMessagingTopologyBoardUrl =
  "/report_viewer/index.html?fixture=./data/sample_run.json&page=device-messaging-topology-board";
const signalGovernanceBoardUrl =
  "/report_viewer/index.html?fixture=./data/sample_run.json&page=signal-governance-board";
const supportContextMappingBoardUrl =
  "/report_viewer/index.html?fixture=./data/sample_run.json&page=support-context-mapping-board";
const documentExtractionGovernanceBoardUrl =
  "/report_viewer/index.html?fixture=./data/sample_run.json&page=document-extraction-governance-board";
const uploadIntakeSafetyBoardUrl =
  "/report_viewer/index.html?fixture=./data/sample_run.json&page=upload-intake-safety-board";
const portalCheckpointAtlasUrl =
  "/report_viewer/index.html?fixture=./data/sample_run.json&page=portal-checkpoint-atlas";
const secretRootTopologyLedgerUrl =
  "/report_viewer/index.html?fixture=./data/sample_run.json&page=secret-root-topology-ledger";

test("renders run viewer landmarks and manual-checkpoint states", async ({
  page,
}) => {
  await page.goto(viewerUrl);

  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Run history" })).toBeVisible();
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("complementary")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fraud-header posture" })).toBeVisible();
  await expect(
    page.locator("#step-list .status-chip[data-status='MANUAL_CHECKPOINT_REQUIRED']"),
  ).toHaveCount(1);
  await expect(
    page.locator("#step-list .status-chip[data-status='FAILED']"),
  ).toHaveCount(1);
});

test("supports keyboard-driven drawer inspection and escape-to-close", async ({
  page,
}) => {
  await page.goto(viewerUrl);

  const button = page.getByRole("button", { name: "View dom snapshot" });
  await button.focus();
  await page.keyboard.press("Enter");

  const close = page.getByRole("button", { name: "Close evidence drawer" });
  await expect(close).toBeFocused();
  await expect(page.getByText("exact-secret-1")).toBeVisible();
  await expect(page.locator(".retry-list").getByText("step-004")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(close).not.toBeFocused();
  await expect(button).toBeFocused();
});

test("renders reduced-motion mode without breaking the viewer", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(viewerUrl);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(page.getByRole("button", { name: "Inspect checkpoint" })).toBeVisible();
});

test("renders the credential-lineage ledger with safe-copy actions only", async ({
  page,
}) => {
  await page.goto(credentialLedgerUrl);

  await expect(
    page.getByRole("navigation", { name: "Application partitions" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Identifiers" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Secret lineage" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy client alias" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy safe ref" })).toHaveCount(1);
  await expect(page.getByText("HMRC-SECRET-")).toHaveCount(0);
});

test("renders the idp topology atlas with a persistent inspector and safe refs only", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(idpTopologyAtlasUrl);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(
    page.getByRole("navigation", { name: "Environment and client families" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Provider tenant" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Interactive clients" })).toBeVisible();
  await expect(page.locator("#drawer-title")).toHaveText("Taxat Operator Web Sandbox");

  await page.getByRole("button", { name: /Taxat Native Operator Sandbox/i }).click();
  await expect(page.locator("#drawer-title")).toHaveText("Taxat Native Operator Sandbox");
  await expect(
    page.locator(".atlas-inspector .meta-label").filter({ hasText: "Bundle identifier" }),
  ).toBeVisible();
  await expect(page.getByText("dev.taxat.InternalOperatorWorkspaceMac")).toBeVisible();
  await expect(page.getByText("sandbox-operator-secret")).toHaveCount(0);
});

test("renders the access and step-up matrix with a persistent inspector and reduced-motion support", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(accessStepupMatrixUrl);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(
    page.getByRole("navigation", { name: "Roles, scopes, and session profiles" }),
  ).toBeVisible();
  await expect(page.locator("#main-title")).toHaveText("Governance admin");
  await expect(page.locator("#drawer-title")).toHaveText("Submit filing or amendment");
  await expect(page.getByText("Fresh step-up or approved equivalent")).toBeVisible();

  await page
    .locator(".policy-rail-list button")
    .filter({ hasText: "Portal signatory" })
    .first()
    .click();
  await expect(page.locator("#main-title")).toHaveText("Portal signatory");
  await expect(page.locator("#drawer-title")).toHaveText("Submit filing or amendment");
  await expect(
    page.locator("#drawer-body").getByText("scope.elevated.client_signoff"),
  ).toBeVisible();
});

test("renders the email domain readiness board with a persistent inspector and reduced-motion support", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(emailDomainReadinessBoardUrl);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(
    page.getByRole("navigation", { name: "Sender domains and streams" }),
  ).toBeVisible();
  await expect(page.locator("#main-title")).toHaveText("notify.sandbox.taxat.example");
  await expect(page.getByRole("heading", { name: "Workspace" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Domain Identity" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "DNS Records" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Message Streams" })).toBeVisible();
  await expect(page.locator("#drawer-title")).toHaveText(
    "20260418.pm._domainkey.notify.sandbox.taxat.example",
  );

  await page
    .locator(".domain-rail-list button")
    .filter({ hasText: "notify.preprod.taxat.example" })
    .click();
  await expect(page.locator("#main-title")).toHaveText("notify.preprod.taxat.example");
  await expect(page.locator("#run-status")).toHaveText("Manual Checkpoint Required");
});

test("renders the notification copy atlas with semantic preview and persistent inspector detail", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(notificationCopyAtlasUrl);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(
    page.getByRole("navigation", { name: "Notification template families" }),
  ).toBeVisible();
  await expect(page.locator("#run-title")).toHaveText("New request for information");
  await expect(page.getByRole("heading", { name: "Email preview" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Continuity and merge provenance" }),
  ).toBeVisible();
  await expect(page.locator("#drawer-title")).toHaveText("New request for information");

  await page
    .locator(".notification-template-rail-list button")
    .filter({ hasText: "Item resolved or closed" })
    .click();
  await expect(page.locator("#main-title")).toHaveText("Item resolved or closed");
  await expect(page.locator("#drawer-title")).toHaveText("Item resolved or closed");
});

test("renders the device messaging topology board with persistent inspector and reduced-motion support", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(deviceMessagingTopologyBoardUrl);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(
    page.getByRole("navigation", { name: "Device messaging channels" }),
  ).toBeVisible();
  await expect(page.locator("#run-title")).toHaveText(
    "Local fixture sink",
  );
  await expect(
    page.getByRole("heading", { name: "Product notification families" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Provider channels" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Shell/route continuity targets" }),
  ).toBeVisible();

  await page
    .locator(".push-channel-rail-list button")
    .filter({ hasText: "Native macOS system notification (Production)" })
    .click();
  await expect(page.locator("#main-title")).toHaveText(
    "Native macOS system notification (Production)",
  );
  await expect(page.locator("#drawer-title")).toHaveText(
    "Native macOS system notification (Production)",
  );
  await expect(page.getByText("vault://push/apns/production/auth-key")).toBeVisible();
  await expect(page.getByText("-----BEGIN PRIVATE KEY-----")).toHaveCount(0);
});

test("renders the secret root topology ledger with persistent inspector and reduced-motion support", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(secretRootTopologyLedgerUrl);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(
    page.getByRole("navigation", { name: "Secret alias families" }),
  ).toBeVisible();
  await expect(page.locator("#main-title")).toHaveText(
    "hmrc/client-secret/web-app-via-server",
  );
  await expect(page.getByRole("heading", { name: "Alias Catalog" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Key Hierarchy" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Access Matrix" })).toBeVisible();

  await page.locator(".secret-alias-rail-list button").filter({
    hasText: "monitoring/sentry/ingest-dsn",
  }).click();
  await expect(page.locator("#drawer-title")).toHaveText(
    "monitoring/sentry/ingest-dsn",
  );
  await expect(page.getByText("BEGIN PRIVATE KEY")).toHaveCount(0);
});

test("renders the signal governance board with a persistent inspector and safe refs only", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(signalGovernanceBoardUrl);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(
    page.getByRole("navigation", { name: "Monitoring projects" }),
  ).toBeVisible();
  await expect(page.locator("#run-title")).toHaveText("Sandbox Backend runtime");
  await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Scrubbing", exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Inbound Filters", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Alerts & Release Mapping", exact: true }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: /^Production Client portal web\b/i })
    .click();
  await expect(page.locator("#main-title")).toHaveText("Production Client portal web");
  await expect(page.locator("#drawer-title")).toHaveText("Production Client portal web");
  await expect(
    page.getByText("vault://monitoring/sentry/production/client-portal-web/dsn"),
  ).toBeVisible();
  await expect(page.getByText("sntrys_")).toHaveCount(0);
  await expect(page.getByText("sentry_key=")).toHaveCount(0);
});

test("renders the document extraction governance board with environment switching and a persistent inspector", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(documentExtractionGovernanceBoardUrl);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(
    page.getByRole("navigation", { name: "Document extraction profiles" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Source Artifact" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Normalized Extraction" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Candidate-Fact Boundary" }),
  ).toBeVisible();
  await expect(page.locator("#run-status")).toHaveText(
    "Self-host decision required",
  );
  await expect(page.locator("#drawer-title")).toHaveText("EXPENSE RECEIPT");

  await page.selectOption("#environment-select", "env_production");
  await expect(page.locator("#environment-hint")).toContainText("Production");

  await page
    .locator(".document-extraction-profile-rail-list button")
    .filter({ hasText: "HANDWRITTEN NOTE" })
    .click();
  await expect(page.locator("#main-title")).toHaveText("HANDWRITTEN NOTE");
  await expect(page.locator("#drawer-title")).toHaveText("HANDWRITTEN NOTE");
  await expect(page.getByText("always review", { exact: false })).toBeVisible();
});

test("renders the support context mapping board with scenario switching and a persistent inspector", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(supportContextMappingBoardUrl);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(
    page.getByRole("navigation", { name: "Support mapping scenarios" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Portal Context" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "External Ticket Fields" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Return/Mirror Rules" }),
  ).toBeVisible();
  await expect(page.locator("#drawer-title")).toHaveText("Contextual request help");

  await page
    .locator(".support-scenario-rail-list button")
    .filter({ hasText: "General help route" })
    .click();
  await expect(page.locator("#main-title")).toHaveText("General help route");
  await expect(page.locator("#drawer-title")).toHaveText("General help route");
  await expect(page.getByText("REFERENCE AND STATUS METADATA ONLY")).toBeVisible();
  await expect(
    page.getByText(
      "restate_required = false remains product law whether or not a vendor is later selected.",
    ),
  ).toBeVisible();
});

test("renders the upload intake safety board with scenario switching and a persistent inspector", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(uploadIntakeSafetyBoardUrl);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(
    page.getByRole("navigation", { name: "Upload intake scenarios" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Received", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Transferred", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Scan Pending", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Clean", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Rejected", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Quarantined", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#run-status")).toHaveText(
    "Self-host decision required",
  );
  await expect(page.locator("#drawer-title")).toHaveText("PORTAL PDF OR IMAGE");

  await page
    .locator(".upload-intake-scenario-rail-list button")
    .filter({ hasText: "ARCHIVE OR ENCRYPTED BINARY" })
    .click();
  await expect(page.locator("#main-title")).toHaveText(
    "ARCHIVE OR ENCRYPTED BINARY",
  );
  await expect(page.locator("#drawer-title")).toHaveText(
    "ARCHIVE OR ENCRYPTED BINARY",
  );
  await expect(
    page.getByText(
      "Password-protected archives and client-side encrypted blobs stay blocked by policy with next action UPLOAD_REPLACEMENT.",
    ),
  ).toBeVisible();
});

test("renders the portal checkpoint atlas with scenario switching and a persistent inspector", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(portalCheckpointAtlasUrl);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(
    page.getByRole("navigation", { name: "Checkpoint families and portal runs" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Automation Path", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Checkpoint Encountered", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#drawer-title")).toHaveText(
    "HMRC sign-in 2-step verification",
  );
  await expect(page.getByTestId("checkpoint-reason-chip")).toHaveText(
    "MFA_REQUIRED",
  );
  await expect(page.getByTestId("resume-preconditions-list")).toBeVisible();
  await expect(page.getByTestId("evidence-list")).toBeVisible();

  await page
    .locator(".portal-checkpoint-rail-list button")
    .filter({ hasText: "Provider policy or rate-limit block" })
    .click();
  await expect(page.locator("#main-title")).toHaveText(
    "Provider policy or rate-limit block",
  );
  await expect(page.locator("#drawer-title")).toHaveText(
    "Provider policy or rate-limit block",
  );
  await expect(page.getByTestId("checkpoint-reason-chip")).toHaveText(
    "PORTAL_POLICY_BLOCK",
  );
});
