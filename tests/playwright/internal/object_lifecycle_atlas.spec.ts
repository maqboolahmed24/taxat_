import { expect, type Page, test } from "@playwright/test";

const atlasPath = "/apps/operator-web/public/internal/object-lifecycle-atlas/index.html";

async function gotoAtlas(page: Page) {
  await page.goto(atlasPath);
  await expect(page.getByTestId("object-lifecycle-atlas")).toBeVisible();
  await expect(
    page.getByRole("navigation", {
      name: "Lifecycle stage rail and delivery posture",
    }),
  ).toBeVisible();
}

test("renders the object lifecycle atlas with reduced motion and retained-evidence delivery focus", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await gotoAtlas(page);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(page.getByText("Taxat Object Lifecycle Atlas")).toBeVisible();
  await expect(page.locator("#delivery-chip")).toHaveText("Governed delivery only");
  await expect(page.locator("#active-class-chip")).toHaveText("EVIDENCE CURRENT");
  await expect(
    page.getByRole("button", { name: "Object class selector EVIDENCE CURRENT" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#inspector-body")).toContainText(
    "Preview and download require a fresh delivery_binding_hash plus current or historical target selection.",
  );
});

test("supports keyboard traversal into upload quarantine and exposes non-downloadable posture semantically", async ({
  page,
}) => {
  await gotoAtlas(page);

  const uploadClass = page.getByRole("button", { name: "Object class selector UPLOAD SOURCE" });
  await uploadClass.focus();
  await page.keyboard.press("Enter");

  const quarantineCard = page.getByRole("button", {
    name: "quarantined attachment not downloadable",
  });
  await quarantineCard.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#inspector-title")).toHaveText("QUARANTINE · Upload session source");
  await expect(page.locator("#inspector-body")).toContainText(
    "Malicious or policy-blocked verdicts move the body into isolated quarantine with customer-safe status only.",
  );
  await expect(
    page.getByRole("button", { name: "Lifecycle stage rail entry QUARANTINE" }),
  ).toHaveAttribute("aria-current", "true");
  await expect(page.locator("#inspector-body")).toContainText(
    "Delivery denied until a customer-safe derivative or explicit export bundle exists.",
  );
});
