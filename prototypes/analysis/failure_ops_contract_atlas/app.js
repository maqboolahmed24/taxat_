const summaryRoot = document.getElementById("hero-summary");
const railRoot = document.getElementById("signal-domain-rail");
const canvasRoot = document.getElementById("canvas");
const inspectorRoot = document.getElementById("failure-evidence-inspector");
const motionMode = document.getElementById("motion-mode");
const inspectorLayout = document.getElementById("inspector-layout");
const stackLayout = document.getElementById("stack-layout");

const DEFAULT_PAGE = "signal-model";
let atlasData = null;
let state = {
  pageId: DEFAULT_PAGE,
  auditGroupId: "identity_authority",
  lineageStateId: "open_failure",
};

function createElement(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function getPage(pageId) {
  return atlasData.pages.find((page) => page.page_id === pageId);
}

function getAuditGroup(groupId) {
  return atlasData.audit_groups.find((group) => group.group_id === groupId);
}

function getLineageState(stateId) {
  return atlasData.failure_lifecycle.states.find((item) => item.state_id === stateId);
}

function parseHash() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return {
    pageId: params.get("page") || DEFAULT_PAGE,
    auditGroupId: params.get("group") || "identity_authority",
    lineageStateId: params.get("lineage") || "open_failure",
  };
}

function updateHash(replace = false) {
  const params = new URLSearchParams();
  params.set("page", state.pageId);
  if (state.pageId === "audit-families") {
    params.set("group", state.auditGroupId);
  }
  if (state.pageId === "failure-lifecycle") {
    params.set("lineage", state.lineageStateId);
  }
  const hash = `#${params.toString()}`;
  if (replace) {
    window.history.replaceState({}, "", hash);
  } else {
    window.history.pushState({}, "", hash);
  }
}

function syncStateFromHash() {
  const next = parseHash();
  state.pageId = atlasData.pages.some((page) => page.page_id === next.pageId) ? next.pageId : DEFAULT_PAGE;
  state.auditGroupId = atlasData.audit_groups.some((group) => group.group_id === next.auditGroupId)
    ? next.auditGroupId
    : "identity_authority";
  state.lineageStateId = atlasData.failure_lifecycle.states.some((item) => item.state_id === next.lineageStateId)
    ? next.lineageStateId
    : "open_failure";
  render();
}

function setMotionMode() {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.dataset.motion = reduced ? "reduce" : "standard";
  motionMode.textContent = reduced ? "reduce" : "standard";
}

function setLayoutMode() {
  const inspectorCollapsed = window.matchMedia("(max-width: 1159px)").matches;
  const stacked = window.matchMedia("(max-width: 859px)").matches;
  document.documentElement.dataset.inspectorLayout = inspectorCollapsed ? "stacked" : "rail";
  document.documentElement.dataset.stackLayout = stacked ? "stacked" : "wide";
  inspectorLayout.textContent = inspectorCollapsed ? "stacked" : "rail";
  stackLayout.textContent = stacked ? "stacked" : "wide";
}

function renderSummary() {
  summaryRoot.replaceChildren();
  const cards = [
    ["Signal rows", atlasData.summary.signal_rows],
    ["Audit families", atlasData.summary.audit_families],
    ["Query contracts", atlasData.summary.query_contracts],
    ["Error families", atlasData.summary.error_families],
  ];
  cards.forEach(([label, value]) => {
    const card = createElement("section", "summary-card");
    card.append(
      createElement("p", "summary-label", label),
      createElement("p", "summary-value", String(value)),
    );
    summaryRoot.append(card);
  });
}

function handleRailKeydown(event) {
  const buttons = [...railRoot.querySelectorAll(".rail-button")];
  const currentIndex = buttons.findIndex((button) => button.dataset.pageId === state.pageId);
  if (currentIndex === -1) return;
  let nextIndex = null;
  if (event.key === "ArrowDown") nextIndex = (currentIndex + 1) % buttons.length;
  if (event.key === "ArrowUp") nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
  if (event.key === "Home") nextIndex = 0;
  if (event.key === "End") nextIndex = buttons.length - 1;
  if (nextIndex === null) return;
  event.preventDefault();
  const target = buttons[nextIndex];
  state.pageId = target.dataset.pageId;
  updateHash();
  render();
  requestAnimationFrame(() => {
    const next = railRoot.querySelector(`[data-page-id="${target.dataset.pageId}"]`);
    if (next) next.focus();
  });
}

function renderRail() {
  railRoot.replaceChildren();
  atlasData.pages.forEach((page) => {
    const button = createElement("button", "rail-button");
    button.type = "button";
    button.setAttribute("role", "tab");
    button.id = `rail-${page.page_id}`;
    button.dataset.pageId = page.page_id;
    button.setAttribute("aria-controls", "atlas-panel");
    button.setAttribute("aria-selected", String(page.page_id === state.pageId));
    button.tabIndex = page.page_id === state.pageId ? 0 : -1;
    button.addEventListener("click", () => {
      state.pageId = page.page_id;
      updateHash();
      render();
    });
    button.addEventListener("keydown", handleRailKeydown);
    button.append(
      createElement("span", "rail-title", page.title),
      createElement("span", "rail-subtitle", `${page.accent} field guide`),
    );
    railRoot.append(button);
  });
}

function makeHeader(title, subtitle, testId = "") {
  const panel = createElement("section", "panel");
  panel.id = "atlas-panel";
  panel.setAttribute("role", "tabpanel");
  if (testId) panel.dataset.testid = testId;
  panel.append(
    createElement("p", "micro", "Atlas page"),
    createElement("h2", "panel-title", title),
    createElement("p", "panel-subtitle", subtitle),
  );
  return panel;
}

function renderSignalModel() {
  const fragment = document.createDocumentFragment();
  const header = makeHeader(
    "Signal Model",
    "Audit, ops, security, privacy, and failure truth stay distinct while sharing a correlation ribbon.",
  );
  fragment.append(header);

  const diagram = createElement("section", "panel");
  diagram.dataset.testid = "signal-separation-diagram";
  diagram.append(
    createElement("p", "micro", "Separation diagram"),
    createElement("h3", "panel-title", "Signal braid"),
  );
  const ribbon = createElement("div", "ribbon mono");
  ribbon.textContent = atlasData.shared_correlation_ribbon.join(" • ");
  diagram.append(ribbon);
  const laneGrid = createElement("div", "lane-grid");
  atlasData.signal_lanes.forEach((lane) => {
    const card = createElement("article", "lane-card");
    card.append(
      createElement("p", `micro accent-${lane.accent}`, lane.label),
      createElement("p", "body", lane.description),
    );
    const pills = createElement("div", "pill-row");
    lane.records.forEach((item) => {
      const pill = createElement("span", "pill mono", item);
      pills.append(pill);
    });
    card.append(pills);
    laneGrid.append(card);
  });
  diagram.append(laneGrid);
  fragment.append(diagram);

  const laws = createElement("section", "panel");
  laws.append(createElement("p", "micro", "Separation laws"), createElement("h3", "panel-title", "What must never be conflated"));
  const list = document.createElement("ul");
  list.className = "inspector-list";
  atlasData.signal_laws.forEach((law) => {
    const item = document.createElement("li");
    item.textContent = law;
    list.append(item);
  });
  laws.append(list);
  fragment.append(laws);
  return fragment;
}

function renderAuditFamilies() {
  const fragment = document.createDocumentFragment();
  fragment.append(
    makeHeader(
      "Audit Families",
      "Grouped mandatory audit event families rendered as a layered ledger instead of KPI cards.",
      "audit-family-ledger",
    ),
  );
  atlasData.audit_groups.forEach((group) => {
    const wrapper = createElement("section", "ledger-group");
    const button = createElement("button", "ledger-button");
    button.type = "button";
    button.dataset.groupId = group.group_id;
    button.setAttribute("aria-expanded", String(group.group_id === state.auditGroupId));
    button.addEventListener("click", () => {
      state.auditGroupId = group.group_id;
      updateHash();
      render();
    });
    const left = createElement("div");
    left.append(
      createElement("p", "micro", group.title),
      createElement("p", "body", `${group.event_count} required event families`),
    );
    const right = createElement("span", "pill mono", group.group_id);
    button.append(left, right);
    wrapper.append(button);

    const body = createElement("div", "ledger-body");
    if (group.group_id !== state.auditGroupId) {
      body.hidden = true;
    }
    group.events.forEach((eventItem) => {
      const item = createElement("article", "event-item");
      item.append(
        createElement("h4", "event-title", eventItem.canonical_name),
        createElement("p", "body", eventItem.notes[0] || "Mandatory append-only audit event."),
      );
      const pills = createElement("div", "pill-row");
      eventItem.closure_requirements.slice(0, 2).forEach((requirement) => {
        pills.append(createElement("span", "pill", requirement));
      });
      item.append(pills);
      body.append(item);
    });
    wrapper.append(body);
    fragment.append(wrapper);
  });
  return fragment;
}

function renderFailureLifecycle() {
  const item = getLineageState(state.lineageStateId);
  const fragment = document.createDocumentFragment();
  fragment.append(
    makeHeader(
      "Failure Lifecycle",
      "The lineage ribbon, dashboard projection, and closure law remain visible together.",
    ),
  );

  const ribbonPanel = createElement("section", "panel");
  ribbonPanel.dataset.testid = "failure-lineage-ribbon";
  ribbonPanel.append(
    createElement("p", "micro", "Current lineage"),
    createElement("h3", "panel-title", item.inspector_title),
    createElement("p", "panel-subtitle", item.inspector_copy),
  );
  const ribbon = createElement("div", "lineage-ribbon");
  item.lineage_nodes.forEach((node) => {
    ribbon.append(createElement("span", "lineage-node", node));
  });
  ribbonPanel.append(ribbon);
  const jumps = createElement("div", "lineage-jumps");
  atlasData.failure_lifecycle.states.forEach((stateItem) => {
    const button = createElement("button", "lineage-jump", stateItem.label);
    button.type = "button";
    button.dataset.stateId = stateItem.state_id;
    button.setAttribute("aria-pressed", String(stateItem.state_id === state.lineageStateId));
    button.addEventListener("click", () => {
      state.lineageStateId = stateItem.state_id;
      updateHash();
      render();
    });
    jumps.append(button);
  });
  ribbonPanel.append(jumps);
  fragment.append(ribbonPanel);

  const dashboard = createElement("section", "panel");
  dashboard.dataset.testid = "failure-dashboard-projection";
  dashboard.append(
    createElement("p", "micro", "Projection truth"),
    createElement("h3", "panel-title", "Persisted dashboard fields"),
  );
  const fieldChips = createElement("div", "field-chip-row");
  atlasData.failure_lifecycle.dashboard_fields.forEach((field) => {
    fieldChips.append(createElement("span", "field-chip mono", field));
  });
  dashboard.append(fieldChips);
  const grid = createElement("div", "dashboard-grid");
  [
    ["Lineage state", item.lineage_state],
    ["Current owner", item.owner],
    ["Next legal action", item.next_action],
    ["Blocking scope", item.blocking_scope],
    ["Retry posture", item.retry_posture],
    ["Compensation posture", item.compensation_posture],
    ["Accepted risk posture", item.accepted_risk_posture],
  ].forEach(([label, value]) => {
    const card = createElement("div", "dashboard-card");
    card.append(createElement("p", "micro", label), createElement("p", "body", value));
    grid.append(card);
  });
  dashboard.append(grid);
  const checks = document.createElement("ul");
  checks.className = "inspector-list";
  item.closure_checks.forEach((check) => {
    const li = document.createElement("li");
    li.textContent = check;
    checks.append(li);
  });
  dashboard.append(checks);
  fragment.append(dashboard);
  return fragment;
}

function renderQueryContracts() {
  const fragment = document.createDocumentFragment();
  fragment.append(
    makeHeader(
      "Query Contracts",
      "Explicit query surfaces, ordering basis, and correlation dependencies across audit, replay, filing, privacy, and provenance.",
      "query-contract-catalog",
    ),
  );
  const grid = createElement("section", "query-grid");
  atlasData.query_contracts.forEach((query) => {
    const card = createElement("article", "query-card");
    card.append(
      createElement("p", "micro", query.query_code),
      createElement("h3", "query-title", query.canonical_name),
      createElement("p", "body", query.notes),
    );
    const pills = createElement("div", "pill-row");
    pills.append(createElement("span", "pill", query.domain), createElement("span", "pill mono", query.ordering_basis));
    card.append(pills);
    const deps = createElement("p", "body mono", query.correlation_keys.slice(0, 8).join(" • "));
    card.append(deps);
    grid.append(card);
  });
  fragment.append(grid);
  return fragment;
}

function renderRetentionVisibility() {
  const fragment = document.createDocumentFragment();
  fragment.append(
    makeHeader(
      "Retention & Visibility",
      "Visibility fences, retention boundaries, and lawful limitation posture remain explicit per signal domain.",
      "retention-visibility-matrix",
    ),
  );
  const grid = createElement("section", "matrix-grid");
  atlasData.retention_visibility_rows.forEach((row) => {
    const card = createElement("article", "matrix-row");
    card.append(
      createElement("p", "micro", `${row.domain} domain`),
      createElement("h3", "matrix-title", row.canonical_name),
      createElement("p", "body", row.visibility_boundary),
      createElement("p", "body", row.retention_boundary),
    );
    const pills = createElement("div", "pill-row");
    row.notes.forEach((note) => pills.append(createElement("span", "pill", note)));
    card.append(pills);
    grid.append(card);
  });
  fragment.append(grid);
  return fragment;
}

function renderCanvas() {
  canvasRoot.replaceChildren();
  const pageId = state.pageId;
  if (pageId === "signal-model") canvasRoot.append(renderSignalModel());
  if (pageId === "audit-families") canvasRoot.append(renderAuditFamilies());
  if (pageId === "failure-lifecycle") canvasRoot.append(renderFailureLifecycle());
  if (pageId === "query-contracts") canvasRoot.append(renderQueryContracts());
  if (pageId === "retention-visibility") canvasRoot.append(renderRetentionVisibility());
}

function renderInspector() {
  inspectorRoot.replaceChildren();
  const page = getPage(state.pageId);
  const top = createElement("section", "inspector-card");
  top.append(
    createElement("p", "micro", "Selected page"),
    createElement("h3", "query-title", page.title),
    createElement("p", "body", "The inspector summarizes the currently selected domain, ledger, or lineage state without becoming a second dashboard."),
  );
  inspectorRoot.append(top);

  if (state.pageId === "signal-model") {
    const card = createElement("section", "inspector-card");
    card.append(
      createElement("p", "micro", "Signal laws"),
      createElement("p", "body", atlasData.design_influences.map((item) => `${item.source}: ${item.insight}`).join(" ")),
    );
    inspectorRoot.append(card);
  }

  if (state.pageId === "audit-families") {
    const group = getAuditGroup(state.auditGroupId);
    const card = createElement("section", "inspector-card");
    card.append(
      createElement("p", "micro", "Active audit ledger"),
      createElement("h3", "query-title", group.title),
      createElement("p", "body", group.heading),
    );
    const list = document.createElement("ul");
    list.className = "inspector-list";
    group.events.slice(0, 6).forEach((eventItem) => {
      const li = document.createElement("li");
      li.textContent = eventItem.canonical_name;
      list.append(li);
    });
    card.append(list);
    inspectorRoot.append(card);
  }

  if (state.pageId === "failure-lifecycle") {
    const item = getLineageState(state.lineageStateId);
    const card = createElement("section", "inspector-card");
    card.append(
      createElement("p", "micro", "Closure checks"),
      createElement("h3", "query-title", item.inspector_title),
      createElement("p", "body", item.inspector_copy),
    );
    const list = document.createElement("ul");
    list.className = "inspector-list";
    item.closure_checks.forEach((check) => {
      const li = document.createElement("li");
      li.textContent = check;
      list.append(li);
    });
    card.append(list);
    inspectorRoot.append(card);
  }

  if (state.pageId === "query-contracts") {
    const card = createElement("section", "inspector-card");
    card.append(
      createElement("p", "micro", "Catalog law"),
      createElement("p", "body", "Every query contract states its ordering basis and integrity posture explicitly; no query widens visibility beyond the tightest contributing surface."),
    );
    inspectorRoot.append(card);
  }

  if (state.pageId === "retention-visibility") {
    const card = createElement("section", "inspector-card");
    card.append(
      createElement("p", "micro", "Limitation posture"),
      createElement("p", "body", "Retention-limited visibility stays explicit. Audit proof, typed failures, and lawful absence remain distinguishable even when payloads age out."),
    );
    inspectorRoot.append(card);
  }
}

function render() {
  renderSummary();
  renderRail();
  renderCanvas();
  renderInspector();
  setMotionMode();
  setLayoutMode();
}

async function main() {
  const response = await fetch("./atlas_data.json");
  atlasData = await response.json();
  syncStateFromHash();

  window.addEventListener("hashchange", syncStateFromHash);
  window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", () => {
    setMotionMode();
  });
  window.matchMedia("(max-width: 1159px)").addEventListener("change", () => {
    setLayoutMode();
  });
  window.matchMedia("(max-width: 859px)").addEventListener("change", () => {
    setLayoutMode();
  });
}

main();
