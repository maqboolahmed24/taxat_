import { expect, test } from "@playwright/test";

const route = "/apps/client-portal-web/public/approvals/final-declaration-confirmation/index.html";

test("keyboard traversal follows visible approval order", async ({ page }) => {
  await page.goto(route);
  await page.getByRole("button", { name: "Show detail" }).focus();
  await expect(page.getByTestId("change-digest-details-toggle")).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(page.getByTestId("declaration-download")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByTestId("declaration-print")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Preview" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByTestId("calculation-confirm-checkbox")).toBeFocused();
});

test("reduced-motion mode keeps route usable without motion-dependent state", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${route}?scenario=stepup`);
  await expect(page.getByTestId("approval-step-up-inline")).toBeVisible();
  await page.getByRole("button", { name: "Complete step-up" }).click();
  await page.getByLabel("I have reviewed the current calculation").check();
  await expect(page.getByTestId("approval-submit")).toBeEnabled();

  const duration = await page.getByTestId("approval-submit").evaluate((element) => {
    return window.getComputedStyle(element).transitionDuration;
  });
  expect(["0.001ms", "1e-06s"]).toContain(duration);
});

test("stale notice receives lawful focus on load without changing route", async ({ page }) => {
  await page.goto(`${route}?scenario=stale`);
  await expect(page.getByTestId("calculation-stale-notice")).toBeFocused();
  await expect(page).toHaveURL(/scenario=stale/);
  await expect(page.getByTestId("approval-summary")).toBeVisible();
  await expect(page.getByTestId("sign-off-panel")).toBeVisible();
});
