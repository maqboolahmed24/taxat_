import { expect, test, type Page } from "@playwright/test";

const atlasPath = "/apps/operator-web/public/internal/northbound-boundary-atlas/index.html";

async function gotoAtlas(page: Page) {
  await page.goto(atlasPath);
  await expect(page.getByTestId("northbound-boundary-atlas")).toBeVisible();
  await expect(
    page.getByRole("navigation", {
      name: "Boundary stage rail and command-family posture",
    }),
  ).toBeVisible();
}

test("renders the northbound atlas with reduced-motion parity and the default amend-return family", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await gotoAtlas(page);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(page.getByText("Taxat Northbound Boundary Atlas")).toBeVisible();
  await expect(page.locator("#route-stability-badge")).toHaveText("Route stability required");
  await expect(page.locator("#boundary-posture-chip")).toHaveText("Receipt / Problem only");
  await expect(page.locator("#active-family-chip")).toHaveText("AMEND_RETURN");
  await expect(page.locator("#active-stage-chip")).toHaveText("STALE");
  await expect(
    page.getByRole("button", {
      name: "AMEND_RETURN requires stale guard if_match_decision_bundle_hash",
    }),
  ).toHaveAttribute("aria-current", "true");
});

test("supports keyboard traversal across the family selector and stage rail while updating the inspector", async ({
  page,
}) => {
  await gotoAtlas(page);

  const familyButton = page.getByRole("button", {
    name: "ADMIN_STAGE_POLICY_CHANGE requires stale guard if_match_policy_snapshot_hash",
  });
  await familyButton.focus();
  await page.keyboard.press("Enter");

  const stageButton = page.getByRole("button", {
    name: "Boundary stage rail entry PROBLEM",
  });
  await stageButton.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#active-family-chip")).toHaveText("ADMIN_STAGE_POLICY_CHANGE");
  await expect(page.locator("#active-stage-chip")).toHaveText("PROBLEM");
  await expect(page.locator("#inspector-title")).toHaveText("ADMIN_STAGE_POLICY_CHANGE");
  await expect(page.locator("#inspector-body")).toContainText(
    "Emit typed ProblemEnvelope recovery",
  );
  await expect(page.locator("#inspector-body")).toContainText(
    "GOVERNANCE_SIMULATION_BASIS_REQUIRED",
  );
});
