import { expect, type Page, test } from "@playwright/test";

const atlasPath = "/apps/operator-web/public/internal/environment-basis-atlas/index.html";

async function gotoAtlas(page: Page) {
  await page.goto(atlasPath);
  await expect(page.getByTestId("environment-basis-atlas")).toBeVisible();
  await expect(
    page.getByRole("navigation", {
      name: "Runtime consumers and environment posture",
    }),
  ).toBeVisible();
}

test("renders the environment basis atlas with reduced-motion parity and the four runtime strata", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await gotoAtlas(page);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(page.getByText("Taxat Environment Basis Atlas")).toBeVisible();
  await expect(page.getByRole("heading", { name: "BOOTSTRAP INPUTS", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "SECRET HANDLES", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "FROZEN CONFIG", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "RUNTIME CONSUMERS", exact: true })).toBeVisible();
  await expect(page.locator("#consumer-chip")).toHaveText("API");
  await expect(page.locator("#drawer-title")).toHaveText("TAXAT_ENVIRONMENT_ID");
});

test("supports keyboard traversal across consumer rail and variable traces without exposing secret text", async ({
  page,
}) => {
  await gotoAtlas(page);

  const playwrightButton = page.getByRole("button", { name: /PLAYWRIGHT runtime consumer/i });
  await playwrightButton.focus();
  await page.keyboard.press("Enter");

  const browserUrlVariable = page.getByRole("button", {
    name: /Variable family TAXAT_BROWSER_PUBLIC_BASE_URL/i,
  });
  await browserUrlVariable.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#drawer-title")).toHaveText("TAXAT_BROWSER_PUBLIC_BASE_URL");
  await expect(page.locator("#drawer-body")).toContainText("ALLOWLIST_PLUS_PROVIDER_METADATA");

  const blockedHandleVariable = page.getByRole("button", {
    name: /Variable family TAXAT_SECRET_REF_HMRC_WEB_CLIENT_SECRET/i,
  });
  await blockedHandleVariable.focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#drawer-title")).toHaveText("TAXAT_SECRET_REF_HMRC_WEB_CLIENT_SECRET");
  await expect(page.locator("#drawer-body")).toContainText(
    "Forbidden to PLAYWRIGHT; see consumer boundary and secret posture.",
  );
  await expect(page.locator("body")).not.toContainText("plaintext");
  await expect(page.locator("body")).not.toContainText("client_secret");
});
