import { expect, test } from "@playwright/test";

const route = "/apps/client-portal-web/public/approvals/final-declaration-confirmation/index.html";

test("keyboard traversal through notice cards follows visible requirement order", async ({
  page,
}) => {
  await page.goto(`${route}?scenario=notice-required`);
  const detailButtons = page.getByRole("button", { name: "Requirement detail" });
  await detailButtons.first().focus();
  await expect(detailButtons.first()).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Confirm declaration basis")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(detailButtons.nth(1)).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Confirm required declaration notices")).toBeFocused();
});

test("reduced motion keeps notice disclosure usable without motion-dependent state", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${route}?scenario=notice-required`);
  await page.getByRole("button", { name: "Requirement detail" }).first().click();
  await expect(page.getByText("cannot be reused after a rebase")).toBeVisible();

  const duration = await page.getByText("cannot be reused after a rebase").evaluate((element) => {
    return window.getComputedStyle(element).transitionDuration;
  });
  expect(["0.001ms", "1e-06s"]).toContain(duration);
});

test("stale notice posture receives focus and does not leave sign-off visually live", async ({
  page,
}) => {
  await page.goto(`${route}?scenario=notice-stale`);
  await expect(page.getByTestId("packet-notice-blocked")).toBeFocused();
  await expect(page.getByTestId("packet-promotion-block-notice")).toBeVisible();
  await expect(page.getByTestId("approval-submit")).toBeDisabled();
  await expect(page).toHaveURL(/scenario=notice-stale/);
});
