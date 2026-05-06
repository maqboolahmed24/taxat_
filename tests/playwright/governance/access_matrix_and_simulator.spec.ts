import { expect, type Page, test } from "@playwright/test";

const workspacePath = "/apps/operator-web/public/governance/access/index.html";
const simulatorPath = "/apps/operator-web/public/governance/access/simulator/index.html";

async function gotoWorkspace(page: Page) {
  await page.goto(workspacePath);
  await expect(page.getByTestId("governance-access-workspace")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Governance access views" })).toBeVisible();
}

async function gotoSimulator(page: Page) {
  await page.goto(simulatorPath);
  await expect(page.getByTestId("governance-access-simulator")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Governance simulator scenarios" })).toBeVisible();
}

test("workspace renders reduced-motion parity and the default submit step-up inspector", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await gotoWorkspace(page);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(page.getByText("Taxat Governance Access Workspace")).toBeVisible();
  await expect(page.locator("#selected-decision-chip")).toHaveText("Decision: REQUIRE_STEP_UP");
  await expect(page.locator("#inspector-title")).toHaveText(
    "SubmissionRecord / SUBMIT_TO_AUTHORITY",
  );
  await expect(page.getByTestId("access-inspector")).toContainText(
    "STEP_UP_REQUIRED_FOR_AUTHORITY_SUBMISSION",
  );
});

test("workspace supports keyboard inspector changes and simulator updates scenario decisions", async ({
  page,
}) => {
  await gotoWorkspace(page);

  const erasureCell = page.getByRole("button", {
    name: "Principal access cell RetentionAction execute erasure require approval",
  });
  await erasureCell.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#inspector-title")).toHaveText("RetentionAction / EXECUTE_ERASURE");
  await expect(page.locator("#inspector-decision-chip")).toHaveText("REQUIRE_APPROVAL");
  await expect(page.getByTestId("access-inspector")).toContainText(
    "approval.erasure.security-review",
  );

  await gotoSimulator(page);
  const serviceScenario = page.getByRole("button", {
    name: "Service principal cannot sign client declaration",
  });
  await serviceScenario.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#decision-chip")).toHaveText("DENY");
  await expect(page.locator("#scenario-title")).toHaveText(
    "Service principal cannot sign client declaration",
  );
  await expect(page.getByTestId("simulator-inspector")).toContainText(
    "SERVICE_PRINCIPAL_HUMAN_ACTION_BLOCKED",
  );
});
