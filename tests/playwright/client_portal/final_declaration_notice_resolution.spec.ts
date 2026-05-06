import { expect, test } from "@playwright/test";

const route = "/apps/client-portal-web/public/approvals/final-declaration-confirmation/index.html";

async function gotoNoticeScenario(page, scenario: string) {
  await page.goto(`${route}?scenario=${scenario}`);
  await expect(page.getByRole("main", { name: "Final declaration confirmation" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Review requirements" })).toBeVisible();
}

async function surfaceOrder(page) {
  const ids = [
    "approval-summary",
    "packet-notice-stack",
    "change-digest",
    "declaration-panel",
    "sign-off-panel",
  ];
  const tops = [];
  for (const id of ids) {
    const box = await page.getByTestId(id).boundingBox();
    tops.push(box?.y ?? 0);
  }
  return tops;
}

test("required packet notices gate sign-off until every backend-authored requirement is acknowledged", async ({
  page,
}) => {
  await gotoNoticeScenario(page, "notice-required");

  await expect(page.getByTestId("packet-notice-card")).toHaveCount(3);
  await expect(page.getByTestId("approval-submit")).toBeDisabled();
  await page.getByRole("button", { name: "Requirement detail" }).first().click();
  await expect(page.getByText("cannot be reused after a rebase")).toBeVisible();

  await page.getByLabel("I have reviewed the current calculation").check();
  await expect(page.getByTestId("approval-submit")).toBeDisabled();
  await page.getByLabel("Confirm declaration basis").check();
  await page.getByLabel("Confirm required declaration notices").check();
  await expect(page.getByTestId("approval-submit")).toBeDisabled();
  await page.getByLabel("Confirm packet approval").check();
  await expect(page.getByTestId("approval-submit")).toBeEnabled();
});

test("notice-free packets keep a compact satisfied row and do not create a visual gap", async ({
  page,
}) => {
  await gotoNoticeScenario(page, "no-notices");

  await expect(page.getByTestId("packet-notice-satisfied")).toBeVisible();
  await expect(page.getByTestId("packet-notice-resolution-summary")).toContainText(
    "No packet-local review requirements",
  );
  await expect(page.getByTestId("packet-notice-card").first()).toBeHidden();
  await page.getByLabel("I have reviewed the current calculation").check();
  await expect(page.getByTestId("approval-submit")).toBeEnabled();
});

test("blocked notice posture disables sign-off and surfaces one promotion block", async ({
  page,
}) => {
  await gotoNoticeScenario(page, "notice-blocked");

  await expect(page.getByTestId("packet-notice-blocked")).toBeVisible();
  await expect(page.getByTestId("packet-promotion-block-notice")).toBeVisible();
  await expect(page.getByTestId("approval-submit")).toBeDisabled();
  await expect(page.getByLabel("Confirm declaration basis")).toBeDisabled();
});

test("mobile layout inserts review requirements between summary and change digest", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 860 });
  await gotoNoticeScenario(page, "notice-required");
  const order = await surfaceOrder(page);
  expect(order).toEqual([...order].sort((left, right) => left - right));
});
