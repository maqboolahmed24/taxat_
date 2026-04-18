import { expect, test } from "@playwright/test";

const atlasPath = "/prototypes/analysis/failure_ops_contract_atlas/index.html";

async function gotoAtlas(page, hash = "#page=signal-model") {
  await page.goto(`${atlasPath}${hash}`);
  await expect(page.getByTestId("failure-ops-contract-atlas")).toBeVisible();
}

test("domain rail supports keyboard navigation across atlas pages", async ({ page }) => {
  await gotoAtlas(page);
  const signalTab = page.getByRole("tab", { name: "Signal Model" });
  await signalTab.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("tab", { name: "Audit Families" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("audit-family-ledger")).toBeVisible();
  await page.keyboard.press("End");
  const retentionTab = page.getByRole("tab", { name: "Retention & Visibility" });
  await expect(retentionTab).toHaveAttribute("aria-selected", "true");
  await retentionTab.focus();
  await page.keyboard.press("Home");
  await expect(page.getByRole("tab", { name: "Signal Model" })).toHaveAttribute("aria-selected", "true");
});

test("reduced motion mode is reflected in the document dataset", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await gotoAtlas(page, "#page=failure-lifecycle&lineage=accepted_risk");
  await expect(page.getByTestId("motion-mode")).toContainText("reduce");
  await expect.poll(async () => page.evaluate(() => document.documentElement.dataset.motion)).toBe("reduce");
  await expect(page.getByTestId("failure-evidence-inspector")).toBeVisible();
});

test("failure lifecycle page exposes the required semantic anchors", async ({ page }) => {
  await gotoAtlas(page, "#page=failure-lifecycle&lineage=remediation_active");
  await expect(page.getByTestId("failure-lineage-ribbon")).toBeVisible();
  await expect(page.getByTestId("failure-dashboard-projection")).toBeVisible();
  await expect(page.getByTestId("failure-evidence-inspector")).toBeVisible();
  await expect(page.getByRole("button", { name: "Open failure" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Accepted risk" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Resolved" })).toBeVisible();
});
