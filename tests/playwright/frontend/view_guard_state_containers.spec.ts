import { expect, test } from "@playwright/test";

const viewGuardStateContainersPath =
  "/apps/operator-web/public/internal/view-guard-state-containers/index.html";

test("mocked route changes primary action posture when stale guards drift", async ({ page }) => {
  await page.goto(viewGuardStateContainersPath);

  await expect(page.getByTestId("stability-debug-pill")).toHaveAttribute(
    "data-currentness-posture",
    "CURRENT",
  );
  await expect(page.getByTestId("primary-action")).toBeEnabled();
  await expect(page.getByTestId("stream-resume-action")).toBeEnabled();

  await page.getByTestId("set-stale").click();
  await expect(page.getByTestId("stability-debug-pill")).toHaveAttribute(
    "data-currentness-posture",
    "STALE",
  );
  await expect(page.getByTestId("primary-action")).toBeDisabled();
  await expect(page.getByTestId("primary-action")).toContainText("Blocked by stale guard");
  await expect(page.getByTestId("posture-notice")).toHaveAttribute("role", "alert");
  await expect(page.getByTestId("guard-ledger")).toContainText("decision_bundle_hash_or_null");
});

test("rebase, access-rebind, and snapshot-only states withhold stream resume controls", async ({
  page,
}) => {
  await page.goto(viewGuardStateContainersPath);

  await page.getByTestId("set-rebase").click();
  await expect(page.getByTestId("stability-debug-pill")).toHaveAttribute(
    "data-currentness-posture",
    "REBASE_REQUIRED",
  );
  await expect(page.getByTestId("primary-action")).toContainText("Rebase required");
  await expect(page.getByTestId("stream-resume-action")).toBeDisabled();

  await page.getByTestId("set-access").click();
  await expect(page.getByTestId("stability-debug-pill")).toHaveAttribute(
    "data-currentness-posture",
    "ACCESS_REBIND_REQUIRED",
  );
  await expect(page.getByTestId("guard-ledger")).toContainText(
    "PURGE_CACHE_ON_ACCESS_BINDING_DRIFT",
  );
  await expect(page.getByTestId("stream-resume-action")).toBeDisabled();

  await page.getByTestId("set-snapshot").click();
  await expect(page.getByTestId("stability-debug-pill")).toHaveAttribute(
    "data-currentness-posture",
    "SNAPSHOT_ONLY",
  );
  await expect(page.getByTestId("primary-action")).toContainText("Snapshot only");
  await expect(page.getByTestId("stream-resume-action")).toHaveAttribute(
    "data-resume-available",
    "false",
  );
});

test("stability pills expose opaque refs only", async ({ page }) => {
  await page.goto(viewGuardStateContainersPath);

  await expect(page.locator("body")).not.toContainText("raw-authority-tax-value-never-render");
  await expect(page.locator("body")).not.toContainText("raw-shell-token-never-render");
  await expect(page.getByTestId("stability-debug-pill")).toHaveAttribute(
    "data-guard-vector-ref",
    /opaque:/,
  );
});

test("reduced motion and keyboard focus are preserved across posture changes", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(viewGuardStateContainersPath);

  await expect(page.getByTestId("view-guard-state-containers")).toHaveAttribute(
    "data-motion-mode",
    "reduced",
  );

  await page.getByTestId("set-stale").focus();
  await expect(page.getByTestId("set-stale")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("set-stale")).toBeFocused();
  await expect(page.getByTestId("currentness-live-region")).toHaveAttribute(
    "aria-live",
    "assertive",
  );

  await page.keyboard.press("Tab");
  await expect(page.getByTestId("set-rebase")).toBeFocused();
});
