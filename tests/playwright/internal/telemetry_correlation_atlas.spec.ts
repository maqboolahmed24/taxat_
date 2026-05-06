import { expect, type Page, test } from "@playwright/test";

const atlasPath = "/apps/operator-web/public/internal/telemetry-correlation-atlas/index.html";

async function gotoAtlas(page: Page) {
  await page.goto(atlasPath);
  await expect(page.getByTestId("telemetry-correlation-atlas")).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Telemetry scenario selector" }),
  ).toBeVisible();
}

test("renders the telemetry correlation atlas with semantic rails and reduced-motion posture", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await gotoAtlas(page);

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(page.getByText("Telemetry Correlation Atlas")).toBeVisible();
  await expect(page.locator("#sampling-chip")).toHaveText("DETERMINISTIC_RETAIN");
  await expect(
    page.getByRole("button", {
      name: "trace signal carries manifest id and trace id but not masked field payloads",
    }),
  ).toBeVisible();
});

test("supports keyboard traversal and shows malformed queue recovery without raw payload leakage", async ({
  page,
}) => {
  await gotoAtlas(page);

  const scenario = page.getByRole("button", {
    name: "Telemetry scenario Malformed queue packet recovered safely",
  });
  await scenario.focus();
  await page.keyboard.press("Enter");

  const queueSignal = page.getByRole("button", {
    name: "queue signal carries workflow and manifest anchors without trusting malformed transport baggage",
  });
  await queueSignal.focus();
  await page.keyboard.press("Enter");

  await expect(page.getByTestId("telemetry-inspector")).toContainText(
    "MALFORMED_MESSAGE_CORRELATION_CARRIER",
  );
  await expect(page.getByTestId("telemetry-inspector")).not.toContainText("not-base64");
});

test("shows hashed stream refs without implying live mutation controls", async ({ page }) => {
  await gotoAtlas(page);

  await page
    .getByRole("button", { name: "Telemetry scenario SSE publication with hashed resume binding" })
    .click();
  await page
    .getByRole("button", {
      name: "stream signal carries manifest correlation and hashed resume binding but not raw resume tokens",
    })
    .click();

  await expect(page.getByTestId("telemetry-inspector")).toContainText("Transport ref hash");
  await expect(page.getByTestId("telemetry-inspector")).not.toContainText("resume-token-raw-075");
  await expect(page.getByText("Telemetry Correlation Atlas")).toBeVisible();
});
