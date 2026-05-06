import { expect, test } from "@playwright/test";
import {
  loadWebShellContractFixture,
  semanticAnchorTestId,
} from "../../../packages/playwright-kit/src/fixtures/web_shell_contract_fixture";

const fixture = loadWebShellContractFixture();

for (const route of fixture.routes) {
  test(`${route.route_id} renders the shared shell route scaffold`, async ({ page }) => {
    await page.goto(route.public_path);
    const rootAnchor = route.semantic_anchors.find((anchor) => anchor.anchor_code === "SHELL_ROOT");
    expect(rootAnchor).toBeTruthy();
    if (!rootAnchor) {
      return;
    }
    const shell = page.getByTestId(semanticAnchorTestId(rootAnchor.semantic_anchor_ref));

    await expect(shell).toBeVisible();
    await expect(shell).toHaveAttribute("data-route-id", route.route_id);
    await expect(shell).toHaveAttribute("data-shell-family", route.shell_family);
    await expect(shell).toHaveAttribute("data-shell-route-key", route.shell_route_key);
    await expect(page.getByRole("heading", { name: route.title })).toBeVisible();

    for (const anchor of route.semantic_anchors) {
      await expect(page.getByTestId(semanticAnchorTestId(anchor.semantic_anchor_ref))).toBeVisible();
    }
  });
}

test("refreshing a route preserves the shell route key and object anchor", async ({ page }) => {
  const route = fixture.routes.find((candidate) => candidate.route_id === "operator.calm.manifest-decision");
  expect(route).toBeTruthy();
  if (!route) {
    return;
  }

  await page.goto(route.public_path);
  const shell = page.getByTestId("calm.shell.root");
  const originalGeneration = Number(await shell.getAttribute("data-publication-generation"));
  await page.getByTestId(`${route.route_id}.refresh-action`).click();

  await expect(shell).toHaveAttribute("data-shell-route-key", route.shell_route_key);
  await expect(shell).toHaveAttribute("data-workspace-route-key", route.workspace_route_key);
  await expect(page.getByTestId(route.object_anchor_ref)).toBeVisible();
  await expect(shell).toHaveAttribute("data-publication-generation", String(originalGeneration + 1));
  await expect(page.getByTestId("calm.recovery-notice")).toContainText(
    `shell route key ${route.shell_route_key} retained`,
  );
});

test("support close returns focus to the invoker without a modal trap", async ({ page }) => {
  const route = fixture.routes.find((candidate) => candidate.route_id === "portal.home.workspace");
  expect(route).toBeTruthy();
  if (!route) {
    return;
  }

  await page.goto(route.public_path);
  const openSupport = page.getByTestId(`${route.route_id}.open-support`);
  await openSupport.click();
  await expect(page.getByTestId(`${route.route_id}.close-support`)).toBeFocused();
  await page.getByTestId(`${route.route_id}.close-support`).click();
  await expect(openSupport).toBeFocused();
  await expect(page.getByTestId("portal.promoted-support-region")).toHaveAttribute(
    "data-support-state",
    "collapsed",
  );
});

test("responsive restack keeps semantic anchors stable", async ({ page }) => {
  const route = fixture.routes.find(
    (candidate) => candidate.route_id === "operator.governance.policy-access",
  );
  expect(route).toBeTruthy();
  if (!route) {
    return;
  }

  await page.setViewportSize({ width: 390, height: 820 });
  await page.goto(route.public_path);
  await expect(page.getByTestId("governance.shell.root")).toHaveAttribute(
    "data-shell-route-key",
    route.shell_route_key,
  );
  await expect(page.getByTestId("governance.primary-worklist")).toBeVisible();
  await expect(page.getByTestId("governance.trailing-inspector")).toBeVisible();
});

test("route scaffold exposes reduced motion without changing shell meaning", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/apps/client-portal-web/public/home/index.html");
  await expect.poll(async () => page.evaluate(() => document.documentElement.dataset.motion)).toBe(
    "reduce",
  );
  await expect(page.getByTestId("portal.shell.root")).toHaveAttribute(
    "data-shell-family",
    "CLIENT_PORTAL_SHELL",
  );
});

test("foundation atlas links all shared route contracts", async ({ page }) => {
  await page.goto("/apps/operator-web/public/internal/frontend-shell-foundation-atlas/index.html");
  await expect(page.getByTestId("frontend-shell-foundation-atlas")).toBeVisible();

  for (const route of fixture.routes) {
    await expect(page.getByTestId(`atlas.route.${route.route_id}`)).toContainText(route.title);
  }
});
