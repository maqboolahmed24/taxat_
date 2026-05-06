const dataPath = "./data/telemetry-correlation-atlas.json";

const state = {
  activeScenarioId: null,
  activeSignalRef: null,
  payload: null,
};

const elements = {
  basisStatement: document.querySelector("#basis-statement"),
  constellationCanvas: document.querySelector("#constellation-canvas"),
  inspectorBody: document.querySelector("#inspector-body"),
  inspectorTitle: document.querySelector("#inspector-title"),
  pageSubtitle: document.querySelector("#page-subtitle"),
  pageTitle: document.querySelector("#page-title"),
  retentionChip: document.querySelector("#retention-chip"),
  samplingChip: document.querySelector("#sampling-chip"),
  scenarioSelector: document.querySelector("#scenario-selector"),
  scenarioTitle: document.querySelector("#scenario-title"),
  serviceChip: document.querySelector("#service-chip"),
  signalRail: document.querySelector("#signal-rail"),
};

function setMotionPreference() {
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const sync = () => {
    document.documentElement.dataset.motion = motionQuery.matches ? "reduce" : "standard";
  };
  sync();
  motionQuery.addEventListener("change", sync);
}

function activeScenario() {
  state.activeScenarioId = state.activeScenarioId ?? state.payload.selectedScenarioId;
  return (
    state.payload.scenarios.find((entry) => entry.scenarioId === state.activeScenarioId) ??
    state.payload.scenarios[0]
  );
}

function activeSignalRef() {
  state.activeSignalRef = state.activeSignalRef ?? state.payload.selectedSignalRef;
  return state.activeSignalRef;
}

function activeSignalNode() {
  const scenario = activeScenario();
  return scenario.signals.find((entry) => entry.signalRef === activeSignalRef()) ?? scenario.signals[0];
}

function chip(text, tone) {
  const node = document.createElement("span");
  node.className = "detail-chip";
  if (tone) {
    node.dataset.tone = tone;
  }
  node.textContent = text;
  return node;
}

function section(titleText, nodes) {
  const sectionNode = document.createElement("section");
  sectionNode.className = "inspector-section";
  const title = document.createElement("h3");
  title.textContent = titleText;
  sectionNode.append(title, ...nodes);
  return sectionNode;
}

function toneFromNode(node) {
  return node.tone ?? "success";
}

function createScenarioButton(scenario) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "scenario-card";
  button.dataset.active = scenario.scenarioId === activeScenario().scenarioId ? "true" : "false";
  button.setAttribute("aria-pressed", button.dataset.active === "true" ? "true" : "false");
  button.setAttribute("aria-label", `Telemetry scenario ${scenario.displayName}`);
  button.addEventListener("click", () => {
    state.activeScenarioId = scenario.scenarioId;
    render();
  });

  const title = document.createElement("strong");
  title.textContent = scenario.displayName;
  button.append(title);

  const meta = document.createElement("span");
  meta.className = "scenario-card__meta";
  meta.textContent = `${scenario.samplingBadge} · ${scenario.retentionChip}`;
  button.append(meta);

  const summary = document.createElement("span");
  summary.className = "scenario-card__summary";
  summary.textContent = scenario.summary;
  button.append(summary);

  return button;
}

function createSignalRailButton(signal) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "signal-button";
  button.dataset.active = signal.signalRef === activeSignalRef() ? "true" : "false";
  button.setAttribute("aria-pressed", button.dataset.active === "true" ? "true" : "false");
  button.setAttribute("aria-label", signal.accessibleLabel);
  button.addEventListener("click", () => {
    state.activeSignalRef = signal.signalRef;
    render();
  });

  const title = document.createElement("strong");
  title.textContent = signal.label;
  button.append(title);

  const subtitle = document.createElement("span");
  subtitle.textContent = signal.signalRef.toLowerCase();
  button.append(subtitle);

  return button;
}

function createLink(signalRef, index) {
  const link = document.createElement("div");
  link.className = "constellation-link";
  link.style.transform = `translate(-50%, -50%) rotate(${index * 45}deg)`;
  link.dataset.signalRef = signalRef;
  return link;
}

function createNodeButton(node) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "node-button";
  button.dataset.active = node.signalRef === activeSignalRef() ? "true" : "false";
  button.dataset.signalRef = node.signalRef;
  button.dataset.tone = node.tone;
  button.setAttribute("aria-pressed", button.dataset.active === "true" ? "true" : "false");
  button.setAttribute("aria-label", node.accessibleLabel);
  button.addEventListener("click", () => {
    state.activeSignalRef = node.signalRef;
    render();
  });

  const title = document.createElement("strong");
  title.textContent = node.label;
  button.append(title);

  const summary = document.createElement("span");
  summary.className = "node-button__summary";
  summary.textContent = node.summary;
  button.append(summary);

  const meta = document.createElement("div");
  meta.className = "node-button__meta";
  meta.append(chip(node.samplingOrTrustBadge, toneFromNode(node)), chip(node.propagationMode));
  button.append(meta);

  return button;
}

function renderHeader(scenario) {
  elements.pageTitle.textContent = state.payload.title;
  elements.pageSubtitle.textContent = state.payload.subtitle;
  elements.basisStatement.textContent = state.payload.basisStatement;
  elements.serviceChip.textContent = "control-plane-api";
  elements.serviceChip.dataset.tone = "success";
  elements.samplingChip.textContent = scenario.samplingBadge;
  elements.samplingChip.dataset.tone =
    scenario.samplingBadge.includes("SAMPLED") ? "warning" : "success";
  elements.retentionChip.textContent = scenario.retentionChip;
  elements.retentionChip.dataset.tone = "success";
  elements.scenarioTitle.textContent = scenario.displayName;
}

function renderScenarioSelector() {
  elements.scenarioSelector.replaceChildren(
    ...state.payload.scenarios.map((scenario) => createScenarioButton(scenario)),
  );
}

function renderSignalRail() {
  elements.signalRail.replaceChildren(
    ...state.payload.signalRail.map((signal) => createSignalRailButton(signal)),
  );
}

function renderConstellation(scenario) {
  const signalNodes = scenario.signals.filter((entry) => entry.signalRef !== "ROOT");
  const rootNode = scenario.signals.find((entry) => entry.signalRef === "ROOT");
  elements.constellationCanvas.replaceChildren(
    ...signalNodes.map((entry, index) => createLink(entry.signalRef, index + 1)),
    createNodeButton(rootNode),
    ...signalNodes.map((entry) => createNodeButton(entry)),
  );
}

function renderInspector(node, scenario) {
  elements.inspectorTitle.textContent = `${node.label} inspector`;

  const retained = document.createElement("ul");
  retained.className = "field-list";
  node.retainedKeys.forEach((value) => {
    const item = document.createElement("li");
    item.innerHTML = `<strong>${value}</strong>`;
    retained.append(item);
  });

  const redacted = document.createElement("ul");
  redacted.className = "field-list";
  node.redactedKeys.forEach((value) => {
    const item = document.createElement("li");
    item.innerHTML = `<strong>${value}</strong>`;
    redacted.append(item);
  });

  const limited = document.createElement("ul");
  limited.className = "field-list";
  node.surfaceLimitedKeys.forEach((value) => {
    const item = document.createElement("li");
    item.innerHTML = `<strong>${value}</strong>`;
    limited.append(item);
  });

  const notes = document.createElement("ul");
  notes.className = "note-list";
  node.notes.forEach((value) => {
    const item = document.createElement("li");
    item.textContent = value;
    notes.append(item);
  });

  const detailRow = document.createElement("div");
  detailRow.className = "detail-row";
  detailRow.append(
    chip(node.samplingOrTrustBadge, toneFromNode(node)),
    chip(node.propagationMode),
    chip(
      node.signalRef === "ROOT" ? scenario.rootContract.auditJoinBoundary : "READ_ONLY_ATLAS",
      node.signalRef === "ROOT" ? "warning" : "success",
    ),
  );

  const sections = [
    section("Summary", [detailRow]),
    section("Retained Keys", [retained]),
    section("Redacted Keys", [redacted]),
    section("Surface-Limited Keys", [limited]),
    section("Notes", [notes]),
  ];

  if (node.signalRef === "ROOT") {
    const rootList = document.createElement("ul");
    rootList.className = "note-list";
    scenario.rootContract.summaryLines.forEach((value) => {
      const item = document.createElement("li");
      item.textContent = value;
      rootList.append(item);
    });
    sections.unshift(
      section("Root Contract", [
        chip(scenario.rootContract.trustPosture, toneFromNode(node)),
        chip(scenario.rootContract.auditJoinBoundary, "warning"),
        rootList,
      ]),
    );
  }

  elements.inspectorBody.replaceChildren(...sections);
}

function render() {
  const scenario = activeScenario();
  const node = activeSignalNode();
  renderHeader(scenario);
  renderScenarioSelector();
  renderSignalRail();
  renderConstellation(scenario);
  renderInspector(node, scenario);
}

async function loadPayload() {
  const response = await fetch(dataPath);
  if (!response.ok) {
    throw new Error(`Failed to load telemetry correlation atlas payload: ${response.status}`);
  }
  state.payload = await response.json();
}

async function main() {
  setMotionPreference();
  await loadPayload();
  render();
}

main().catch((error) => {
  document.body.innerHTML = `<pre>${error.message}</pre>`;
});
