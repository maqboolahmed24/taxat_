const summaryGrid = document.getElementById("summary-grid");
const pageTabs = document.getElementById("page-tabs");
const contentPane = document.getElementById("content-pane");
const motionMode = document.getElementById("motion-mode");
const decisionWinner = document.getElementById("decision-winner");
const decisionTagline = document.getElementById("decision-tagline");
const currentShellFamily = document.getElementById("current-shell-family");
const currentShellNote = document.getElementById("current-shell-note");

const PAGES = [
  { id: "overview", label: "Overview" },
  { id: "calm", label: "CALM_SHELL" },
  { id: "portal", label: "CLIENT_PORTAL_SHELL" },
  { id: "governance", label: "GOVERNANCE_DENSITY_SHELL" },
  { id: "lab", label: "Verification Lab" },
];

const DEFAULT_VARIANTS = {
  calm: "manifest",
  portal: "home",
  governance: "overview",
};

let atlasData = null;
let state = {
  pageId: "overview",
  variants: { ...DEFAULT_VARIANTS },
  scenarioId: "publication_or_epoch_rebase",
  supportOpen: false,
  supportContext: null,
  liveMessage: "",
  liveTone: "warning",
  lastOpenerTestId: null,
};

function createElement(tag, className, text) {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

function parseHash() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return {
    pageId: params.get("page") || "overview",
    calm: params.get("calm") || DEFAULT_VARIANTS.calm,
    portal: params.get("portal") || DEFAULT_VARIANTS.portal,
    governance: params.get("governance") || DEFAULT_VARIANTS.governance,
    scenarioId: params.get("scenario") || "publication_or_epoch_rebase",
  };
}

function writeHash(next, replace = false) {
  const params = new URLSearchParams();
  params.set("page", next.pageId);
  params.set("calm", next.variants.calm);
  params.set("portal", next.variants.portal);
  params.set("governance", next.variants.governance);
  if (next.pageId === "lab") {
    params.set("scenario", next.scenarioId);
  }
  const hash = `#${params.toString()}`;
  if (replace) {
    window.history.replaceState({}, "", hash);
  } else {
    window.history.pushState({}, "", hash);
  }
  syncStateFromLocation();
}

function syncStateFromLocation() {
  if (!atlasData) {
    return;
  }
  const next = parseHash();
  state.pageId = PAGES.some((page) => page.id === next.pageId) ? next.pageId : "overview";
  state.variants = {
    calm: resolveVariant("calm", next.calm),
    portal: resolveVariant("portal", next.portal),
    governance: resolveVariant("governance", next.governance),
  };
  state.scenarioId = resolveScenario(next.scenarioId);
  state.supportOpen = false;
  state.supportContext = null;
  state.lastOpenerTestId = null;
  render();
}

function resolveVariant(shellId, variantId) {
  const shell = getShell(shellId);
  const exists = shell.routeVariants.some((variant) => variant.id === variantId);
  return exists ? variantId : shell.routeVariants[0].id;
}

function resolveScenario(scenarioId) {
  const exists = atlasData.verificationLab.scenarios.some((scenario) => scenario.id === scenarioId);
  return exists ? scenarioId : atlasData.verificationLab.scenarios[0].id;
}

function setMotionMode() {
  const mode = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "reduce" : "standard";
  document.documentElement.dataset.motion = mode;
  motionMode.textContent = mode;
}

function getShell(shellId) {
  return atlasData.shells.find((shell) => shell.id === shellId);
}

function getCurrentVariant(shellId) {
  const shell = getShell(shellId);
  return shell.routeVariants.find((variant) => variant.id === state.variants[shellId]);
}

function getCurrentPageLabel() {
  return PAGES.find((page) => page.id === state.pageId)?.label || "Overview";
}

function renderSummaryCards() {
  const cards = [
    ["Deployables", atlasData.summary.deployables, "summary-deployables"],
    ["Browser routes", atlasData.summary.browserRoutes, "summary-browser-routes"],
    ["Shared packages", atlasData.summary.sharedPackages, "summary-shared-packages"],
    ["Selector profiles", atlasData.summary.selectorProfiles, "summary-selector-profiles"],
  ];
  summaryGrid.replaceChildren();
  cards.forEach(([label, value, testId]) => {
    const card = createElement("section", "summary-card");
    card.dataset.testid = testId;
    card.append(
      createElement("p", "summary-label", label),
      createElement("p", "summary-value", String(value)),
    );
    summaryGrid.append(card);
  });
}

function renderPageTabs() {
  pageTabs.replaceChildren();
  PAGES.forEach((page, index) => {
    const button = createElement("button", "page-tab", page.label);
    button.type = "button";
    button.id = `page-tab-${page.id}`;
    button.dataset.pageId = page.id;
    button.dataset.index = String(index);
    button.dataset.testid = `page-tab-${page.id}`;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-controls", "content-pane");
    button.setAttribute("aria-selected", String(page.id === state.pageId));
    button.tabIndex = page.id === state.pageId ? 0 : -1;
    button.addEventListener("click", () => {
      state.liveMessage = "";
      writeHash({ ...state, pageId: page.id });
    });
    button.addEventListener("keydown", handleTabKeydown);
    pageTabs.append(button);
  });
}

function handleTabKeydown(event) {
  const tabs = [...pageTabs.querySelectorAll(".page-tab")];
  const currentIndex = tabs.findIndex((tab) => tab.dataset.pageId === state.pageId);
  if (currentIndex === -1) {
    return;
  }
  let nextIndex = null;
  if (event.key === "ArrowRight") {
    nextIndex = (currentIndex + 1) % tabs.length;
  }
  if (event.key === "ArrowLeft") {
    nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
  }
  if (event.key === "Home") {
    nextIndex = 0;
  }
  if (event.key === "End") {
    nextIndex = tabs.length - 1;
  }
  if (nextIndex === null) {
    return;
  }
  event.preventDefault();
  const target = tabs[nextIndex];
  writeHash({ ...state, pageId: target.dataset.pageId });
  requestAnimationFrame(() => {
    const selected = pageTabs.querySelector(`[data-page-id="${target.dataset.pageId}"]`);
    selected?.focus();
  });
}

function updateMetaRail() {
  decisionWinner.textContent = atlasData.decision.winner;
  decisionTagline.textContent = atlasData.decision.tagline;
  if (state.pageId === "overview") {
    currentShellFamily.textContent = "Overview";
    currentShellNote.textContent =
      "Deployable boundaries, shared-package seams, and browser state rules are rendered together.";
    return;
  }
  if (state.pageId === "lab") {
    currentShellFamily.textContent = "Verification Lab";
    currentShellNote.textContent =
      "The lab validates shell continuity, focus return, stale/recovery posture, and reduced motion.";
    return;
  }
  const shell = getShell(state.pageId);
  const variant = getCurrentVariant(state.pageId);
  currentShellFamily.textContent = shell.shellFamily;
  currentShellNote.textContent = `${variant.label} · ${variant.routePattern} · ${shell.deployable}`;
}

function makePageHeader(label, title, subtitle, copy) {
  const section = createElement("section", "panel page-header");
  section.append(
    createElement("p", "kicker", label),
    createElement("h2", "page-title", title),
    createElement("p", "page-subtitle", subtitle),
    createElement("p", "page-copy", copy),
  );
  return section;
}

function renderOverview() {
  const fragment = document.createDocumentFragment();
  fragment.append(
    makePageHeader(
      "Topology decision",
      "One platform spine, two browser deployables",
      "Portal stays customer-safe by deployable boundary while calm and governance stay together inside one internal browser runtime.",
      "ADR-006 selects a shared TypeScript/React platform with shared contracts, tokens, selector grammar, route runtime, state runtime, and northbound clients, but it refuses a single mega app and rejects route-level micro-frontends.",
    ),
  );

  const deployables = createElement("section", "data-grid two");
  atlasData.deployables.forEach((deployable) => {
    const card = createElement("article", "deployable-card");
    card.dataset.testid = `deployable-card-${deployable.deployable_id}`;
    card.append(
      createElement("p", "section-label", deployable.deployable_id),
      createElement("h3", "surface-title", deployable.label),
      createElement("p", "body-copy", deployable.bundle_policy),
    );
    const chips = createElement("div", "chip-row");
    chips.append(
      makeChip(`${deployable.route_count} routes`),
      makeChip(deployable.shell_families.join(" + "), "accent"),
      makeChip(`${deployable.audiences.length} audiences`),
    );
    card.append(chips, createElement("p", "detail-copy", deployable.why_separate));
    deployables.append(card);
  });
  fragment.append(deployables);

  const routeGroups = createElement("section", "panel stack");
  routeGroups.append(
    createElement("p", "section-label", "Route ownership"),
    createElement("h3", "surface-title", "Route groups stay inside their owning shell"),
  );
  const routeGroupGrid = createElement("div", "data-grid two");
  atlasData.routeGroups.forEach((group) => {
    const card = createElement("article", "route-group-card");
    card.dataset.testid = `route-group-${group.route_group_id}`;
    card.append(
      createElement("p", "section-label", group.shell_family),
      createElement("h4", "surface-title", group.label),
      createElement("p", "body-copy", group.continuity_rule),
    );
    card.append(
      createElement("p", "route-pattern mono", group.route_patterns.join(" · ")),
      createElement("p", "detail-copy", group.browser_handoff_rule),
    );
    const chips = createElement("div", "chip-row");
    chips.append(makeChip(group.deployable_id, "accent"), makeChip(`${group.route_count} routes`));
    card.append(chips);
    routeGroupGrid.append(card);
  });
  routeGroups.append(routeGroupGrid);
  fragment.append(routeGroups);

  const packagesAndState = createElement("section", "data-grid two");

  const packages = createElement("article", "panel stack");
  packages.append(
    createElement("p", "section-label", "Shared packages"),
    createElement("h3", "surface-title", "Shared once, not flattened"),
  );
  atlasData.sharedPackages.forEach((pkg) => {
    const card = createElement("div", "package-card");
    card.append(
      createElement("h4", "surface-title", pkg.package_id),
      createElement("p", "body-copy", pkg.responsibility),
      createElement("p", "detail-copy", `Must not hold: ${pkg.must_not_hold}`),
    );
    packages.append(card);
  });
  packagesAndState.append(packages);

  const state = createElement("article", "panel stack");
  state.append(
    createElement("p", "section-label", "Browser state law"),
    createElement("h3", "surface-title", "State domains do not become legal truth"),
  );
  atlasData.stateDomains.forEach((domain) => {
    const card = createElement("div", "state-card");
    card.append(
      createElement("h4", "surface-title", domain.domain_id),
      createElement("p", "state-copy", domain.purpose),
      createElement("p", "detail-copy", `Allowed storage: ${domain.allowed_storage}`),
      createElement("p", "detail-copy", `Forbidden: ${domain.forbidden_misuse}`),
    );
    state.append(card);
  });
  packagesAndState.append(state);
  fragment.append(packagesAndState);

  return fragment;
}

function makeChip(label, variant = "") {
  const chip = createElement("span", `chip ${variant}`.trim(), label);
  return chip;
}

function formatLayoutBudget(layoutBudget) {
  return Object.entries(layoutBudget).map(([key, value]) => `${key}: ${value}`);
}

function shellLayoutClass(shellId) {
  return shellId === "calm" ? "calm" : shellId === "portal" ? "portal" : "governance";
}

function shellAccentLabel(shellId) {
  return shellId === "calm" ? "restrained indigo" : shellId === "portal" ? "restrained teal" : "restrained plum";
}

function announceShellEvent(message, tone = "warning") {
  state.liveMessage = message;
  state.liveTone = tone;
  render();
}

function openSupport(shellId, opener) {
  state.supportOpen = true;
  state.supportContext = shellId;
  state.lastOpenerTestId = opener.dataset.testid || null;
  render();
  requestAnimationFrame(() => {
    const target = document.getElementById("support-close-button");
    target?.focus();
  });
}

function closeSupport() {
  const openerTestId = state.lastOpenerTestId;
  state.supportOpen = false;
  state.supportContext = null;
  state.lastOpenerTestId = null;
  render();
  requestAnimationFrame(() => {
    if (!openerTestId) {
      return;
    }
    document.querySelector(`[data-testid="${openerTestId}"]`)?.focus();
  });
}

function buildShellPage(shellId) {
  const shell = getShell(shellId);
  const variant = getCurrentVariant(shellId);
  const fragment = document.createDocumentFragment();
  const layoutLines = formatLayoutBudget(shell.layoutBudget);

  fragment.append(
    makePageHeader(
      shell.shellFamily,
      shellId === "calm"
        ? "Calm shell keeps one dominant question"
        : shellId === "portal"
          ? "Portal shell stays reassuring and customer-safe"
          : "Governance shell stays dense without losing order",
      `${shell.deployable} · ${shell.selectorProfile} · ${shellAccentLabel(shellId)} accent only`,
      "The stage below is not a product screen mock. It is a shell contract visualizer that fixes route ownership, support-region law, motion posture, and continuity behavior before later implementation agents write the real application.",
    ),
  );

  const switcher = createElement("section", "route-switcher");
  switcher.append(
    createElement("p", "section-label", "Route variants"),
    createElement("h3", "surface-title", "Switch routes without switching shells"),
  );
  const routeButtons = createElement("div", "route-button-row");
  shell.routeVariants.forEach((routeVariant) => {
    const button = createElement("button", "route-button", routeVariant.label);
    button.type = "button";
    button.dataset.testid = `route-variant-${shellId}-${routeVariant.id}`;
    button.setAttribute("aria-pressed", String(routeVariant.id === variant.id));
    button.addEventListener("click", () => {
      if (routeVariant.id === state.variants[shellId]) {
        return;
      }
      const previous = getCurrentVariant(shellId);
      state.variants[shellId] = routeVariant.id;
      announceShellEvent(
        `${shell.shellFamily} preserved. Object anchor moved from ${previous.objectAnchor} to ${routeVariant.objectAnchor} without remounting the shell.`,
      );
      writeHash({ ...state, pageId: shellId });
    });
    routeButtons.append(button);
  });
  switcher.append(routeButtons);

  const layoutChips = createElement("div", "chip-row");
  layoutLines.forEach((line) => layoutChips.append(makeChip(line)));
  switcher.append(layoutChips);
  fragment.append(switcher);

  if (state.liveMessage && state.pageId === shellId) {
    const banner = createElement("section", "banner");
    banner.dataset.testid = "shell-continuity-banner";
    banner.dataset.tone = state.liveTone;
    banner.append(
      createElement("p", "section-label", "Continuity notice"),
      createElement("h3", "banner-title", state.liveTone === "danger" ? "Unsafe remount avoided" : "Shell continuity preserved"),
    );
    const live = createElement("p", "body-copy", state.liveMessage);
    live.dataset.testid = "shell-continuity-live-region";
    live.setAttribute("aria-live", "assertive");
    banner.append(live);
    fragment.append(banner);
  }

  const stage = createElement("section", "shell-stage");
  stage.dataset.shell = shellId;
  stage.dataset.testid = `${shellId}-shell-stage`;
  stage.append(
    buildShellHeader(shell, variant),
    buildShellColumns(shellId, shell, variant),
  );
  fragment.append(stage);

  return fragment;
}

function buildShellHeader(shell, variant) {
  const header = createElement("div", "shell-header");
  const left = createElement("div", "stack");
  left.append(
    createElement("p", "section-label", shell.deployable),
    createElement("h3", "shell-title", variant.label),
    createElement("p", "body-copy", variant.dominantQuestion),
  );
  const chips = createElement("div", "chip-row");
  chips.append(
    makeChip(shell.shellFamily, "accent"),
    makeChip(variant.routePattern, "mono"),
    makeChip(variant.objectAnchor, "mono"),
  );
  left.append(chips);

  const right = createElement("div", "stack");
  right.append(createElement("p", "shell-layout-note", variant.statusTone));
  const actions = createElement("div", "surface-actions");

  const staleButton = createElement("button", "secondary-button", "Simulate stale rebase");
  staleButton.type = "button";
  staleButton.dataset.testid = `${shell.id}-simulate-stale`;
  staleButton.addEventListener("click", () => {
    announceShellEvent(
      `${shell.shellFamily} kept ${variant.objectAnchor} and asked for explicit rebase instead of remounting a different route.`,
      "warning",
    );
  });

  const supportButton = createElement("button", "ghost-button", "Open support region");
  supportButton.type = "button";
  supportButton.dataset.testid = `${shell.id}-support-opener`;
  supportButton.addEventListener("click", () => openSupport(shell.id, supportButton));

  actions.append(staleButton, supportButton);
  right.append(actions);
  header.append(left, right);
  return header;
}

function buildShellColumns(shellId, shell, variant) {
  const columns = createElement("div", `shell-columns ${shellLayoutClass(shellId)}`);

  const leading = createElement("section", "column leading");
  leading.append(
    buildSurface(
      "Object frame",
      variant.objectAnchor,
      `Route key ${variant.routeKey}`,
      [
        `Selector profile: ${shell.selectorProfile}`,
        `Accent discipline: ${shellAccentLabel(shellId)}`,
        `Landmarks: ${variant.landmarks.join(", ") || "derived from route contract"}`,
      ],
      shellId === "portal" ? "portal-customer-safe-boundary" : shellId === "governance" ? "governance-density-nav" : "calm-context-column",
    ),
  );

  const primary = createElement("section", "column primary-column");
  primary.append(
    buildPrimarySurface(shellId, variant),
    buildMetricsSurface(shellId, shell, variant),
  );

  const support = createElement("section", "column support-column");
  support.append(buildSupportSurface(shellId, variant));
  if (state.supportOpen && state.supportContext === shellId) {
    support.append(buildSupportPanel(shellId, variant));
  }

  columns.append(leading, primary, support);
  return columns;
}

function buildSurface(label, title, copy, bulletLines, testId) {
  const surface = createElement("article", "surface");
  if (testId) {
    surface.dataset.testid = testId;
  }
  surface.append(
    createElement("p", "section-label", label),
    createElement("h4", "surface-title", title),
    createElement("p", "body-copy", copy),
  );
  const list = createElement("ul", "detail-list");
  bulletLines.forEach((line) => {
    const item = document.createElement("li");
    item.textContent = line;
    list.append(item);
  });
  surface.append(list);
  return surface;
}

function buildPrimarySurface(shellId, variant) {
  const surface = createElement("article", "surface primary");
  if (shellId === "calm") {
    surface.dataset.testid = "calm-primary-column";
  }
  if (shellId === "portal") {
    surface.dataset.testid = "portal-primary-column";
  }
  if (shellId === "governance") {
    surface.dataset.testid = "governance-density-canvas";
  }
  surface.append(
    createElement("p", "section-label", "Dominant question"),
    createElement("h4", "surface-title", variant.dominantQuestion),
    createElement("p", "body-copy", variant.statusTone),
  );
  const actions = createElement("div", "surface-actions");
  const primaryAction = createElement("button", "action-button", variant.primaryAction);
  primaryAction.type = "button";
  primaryAction.dataset.testid = `${shellId}-primary-action`;
  actions.append(primaryAction, makeChip("Same shell, new object only", "success"));
  surface.append(actions);

  const landmarks = createElement("ul", "inline-list");
  variant.landmarks.forEach((landmark) => {
    const item = document.createElement("li");
    item.append(makeChip(landmark, "mono"));
    landmarks.append(item);
  });
  surface.append(landmarks);
  return surface;
}

function buildMetricsSurface(shellId, shell, variant) {
  const surface = createElement("article", "surface");
  surface.append(
    createElement("p", "section-label", "Contract metrics"),
    createElement("h4", "surface-title", "Shell stays mounted while object context changes"),
  );
  const metrics = createElement("div", "metric-grid");
  const metricEntries = [
    ["Shell family", shell.shellFamily],
    ["Deployable", shell.deployable],
    ["Object anchor", variant.objectAnchor],
    ["Route pattern", variant.routePattern],
  ];
  metricEntries.forEach(([label, value]) => {
    const item = createElement("div", "metric-item");
    if (label === "Object anchor") {
      item.dataset.testid = `${shellId}-object-anchor`;
    }
    item.append(
      createElement("p", "metric-label", label),
      createElement("p", "metric-value mono", value),
    );
    metrics.append(item);
  });
  surface.append(metrics);
  return surface;
}

function buildSupportSurface(shellId, variant) {
  const surface = createElement("article", "surface");
  if (shellId === "portal") {
    surface.dataset.testid = "portal-support-region";
  }
  if (shellId === "governance") {
    surface.dataset.testid = "governance-sidecar";
  }
  surface.append(
    createElement("p", "section-label", "Promoted support region"),
    createElement("h4", "surface-title", variant.supportTitle),
    createElement(
      "p",
      "body-copy",
      shellId === "portal"
        ? "Support stays below the dominant task on compact widths and never leaks staff-only detail."
        : shellId === "governance"
          ? "Dense auxiliary detail redocks in compact mode without changing shell meaning."
          : "Support helps the decision surface; it does not compete with it.",
    ),
  );
  const actions = createElement("div", "surface-actions");
  const open = createElement("button", "secondary-button", "Inspect support detail");
  open.type = "button";
  open.dataset.testid = `${shellId}-support-opener-secondary`;
  open.addEventListener("click", () => openSupport(shellId, open));
  actions.append(open);
  surface.append(actions);
  return surface;
}

function buildSupportPanel(shellId, variant) {
  const panel = createElement("section", "support-panel");
  panel.dataset.open = "true";
  panel.dataset.testid = "support-panel";
  panel.append(
    createElement("p", "section-label", "Support detail"),
    createElement("h4", "surface-title", `${variant.supportTitle} open`),
    createElement(
      "p",
      "body-copy",
      "Closing this region returns focus to the invoking control instead of dropping the keyboard user at the top of the page.",
    ),
  );
  const close = createElement("button", "ghost-button", "Close support region");
  close.type = "button";
  close.id = "support-close-button";
  close.dataset.testid = "support-close-button";
  close.addEventListener("click", closeSupport);
  panel.append(close);
  return panel;
}

function renderLab() {
  const fragment = document.createDocumentFragment();
  fragment.append(
    makePageHeader(
      "Verification lab",
      "Playwright-first continuity and recovery contract",
      "The lab mirrors the exact contract focus of ADR-006: semantic anchors, route stability, focus return, reduced motion, and stale/recovery behavior.",
      "A later implementation can replace the visualizer with product code, but it must keep these browser behaviors intact.",
    ),
  );

  const labGrid = createElement("section", "lab-grid");

  const selectorPanel = createElement("article", "lab-card stack");
  selectorPanel.append(
    createElement("p", "section-label", "Scenarios"),
    createElement("h3", "surface-title", "Pick a recovery contract"),
  );
  const list = createElement("div", "scenario-list");
  atlasData.verificationLab.scenarios.forEach((scenario) => {
    const button = createElement("button", "scenario-button");
    button.type = "button";
    button.dataset.testid = `lab-scenario-${scenario.id}`;
    button.setAttribute("aria-pressed", String(scenario.id === state.scenarioId));
    button.append(
      createElement("span", "surface-title", scenario.label),
      createElement("span", "detail-copy", scenario.message),
    );
    button.addEventListener("click", () => {
      writeHash({ ...state, pageId: "lab", scenarioId: scenario.id });
    });
    list.append(button);
  });
  selectorPanel.append(list);
  labGrid.append(selectorPanel);

  const current = atlasData.verificationLab.scenarios.find((scenario) => scenario.id === state.scenarioId);
  const detailPanel = createElement("article", "lab-card stack");
  detailPanel.append(
    createElement("p", "section-label", "Active scenario"),
    createElement("h3", "surface-title", current.label),
  );
  const live = createElement("p", "body-copy callout", current.message);
  live.dataset.testid = "lab-live-region";
  live.setAttribute("aria-live", current.ariaLive);
  detailPanel.append(live);

  const preservedLabel = createElement("p", "section-label", "Preserved invariants");
  const preserved = createElement("ul", "inline-list");
  current.preserved.forEach((item) => {
    const row = document.createElement("li");
    row.append(makeChip(item));
    preserved.append(row);
  });
  detailPanel.append(preservedLabel, preserved);

  const focusRule = createElement(
    "p",
    "detail-copy",
    atlasData.verificationLab.focusReturnContract,
  );
  focusRule.dataset.testid = "lab-focus-return-contract";
  detailPanel.append(focusRule);

  labGrid.append(detailPanel);
  fragment.append(labGrid);
  return fragment;
}

function render() {
  renderSummaryCards();
  renderPageTabs();
  updateMetaRail();
  contentPane.replaceChildren();
  contentPane.dataset.page = state.pageId;
  contentPane.append(
    state.pageId === "overview"
      ? renderOverview()
      : state.pageId === "lab"
        ? renderLab()
        : buildShellPage(state.pageId),
  );
}

async function boot() {
  setMotionMode();
  const response = await fetch("./atlas_data.json");
  atlasData = await response.json();
  syncStateFromLocation();
}

window.addEventListener("popstate", syncStateFromLocation);
window.addEventListener("hashchange", syncStateFromLocation);
window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", () => {
  setMotionMode();
  render();
});

boot().catch((error) => {
  contentPane.replaceChildren(
    createElement(
      "p",
      "body-copy",
      `Unable to load atlas data: ${error instanceof Error ? error.message : String(error)}`,
    ),
  );
});
