const dataPath = "./data/config-resolution-atlas.json";

const state = {
  activeLayerRef: null,
  activeScenarioId: null,
  payload: null,
  showHashVector: false,
};

const elements = {
  basisChip: document.querySelector("#basis-chip"),
  basisStatement: document.querySelector("#basis-statement"),
  completenessChip: document.querySelector("#completeness-chip"),
  flagsChip: document.querySelector("#flags-chip"),
  hashVectorToggle: document.querySelector("#hash-vector-toggle"),
  inspectorBody: document.querySelector("#inspector-body"),
  inspectorTitle: document.querySelector("#inspector-title"),
  layerRail: document.querySelector("#layer-rail"),
  pageSubtitle: document.querySelector("#page-subtitle"),
  pageTitle: document.querySelector("#page-title"),
  scenarioSelector: document.querySelector("#scenario-selector"),
  scenarioTitle: document.querySelector("#scenario-title"),
  stackCanvas: document.querySelector("#stack-canvas"),
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

function activeLayer() {
  state.activeLayerRef = state.activeLayerRef ?? state.payload.selectedLayerRef;
  return (
    state.payload.layerRail.find((entry) => entry.layerRef === state.activeLayerRef) ??
    state.payload.layerRail[0]
  );
}

function currentLayerCard() {
  const scenario = activeScenario();
  const layer = activeLayer();
  return scenario.layerCards.find((entry) => entry.layerRef === layer.layerRef) ?? scenario.layerCards[0];
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

function toneForScenario(scenario) {
  if (scenario.blocked) {
    return "danger";
  }
  if (scenario.featureFlagSurfaceState === "NO_GOVERNED_FLAG_SURFACE") {
    return "warning";
  }
  return "success";
}

function createScenarioButton(scenario) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "scenario-card";
  button.dataset.active = scenario.scenarioId === activeScenario().scenarioId ? "true" : "false";
  button.setAttribute("aria-pressed", button.dataset.active === "true" ? "true" : "false");
  button.setAttribute("aria-label", `Manifest selector ${scenario.displayName}`);
  button.addEventListener("click", () => {
    state.activeScenarioId = scenario.scenarioId;
    render();
  });

  const title = document.createElement("strong");
  title.textContent = scenario.displayName;
  button.append(title);

  const meta = document.createElement("span");
  meta.className = "scenario-card__meta";
  meta.textContent = `${scenario.resolutionBasis} · ${scenario.completenessState}`;
  button.append(meta);

  const summary = document.createElement("span");
  summary.className = "scenario-card__summary";
  summary.textContent = scenario.summary;
  button.append(summary);

  return button;
}

function createLayerButton(layer) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "layer-button";
  button.dataset.active = layer.layerRef === activeLayer().layerRef ? "true" : "false";
  button.setAttribute("aria-pressed", button.dataset.active === "true" ? "true" : "false");
  button.setAttribute("aria-label", layer.accessibleLabel);
  button.addEventListener("click", () => {
    state.activeLayerRef = layer.layerRef;
    render();
  });

  const title = document.createElement("strong");
  title.textContent = layer.label;
  button.append(title);

  const summary = document.createElement("span");
  summary.textContent = layer.layerRef.replaceAll("_", " ").toLowerCase();
  button.append(summary);

  return button;
}

function createLayerCard(card) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "stack-card";
  button.dataset.active = card.layerRef === activeLayer().layerRef ? "true" : "false";
  button.dataset.tone = card.tone;
  button.setAttribute("aria-pressed", button.dataset.active === "true" ? "true" : "false");
  button.setAttribute(
    "aria-label",
    `${card.label.toLowerCase()} contributes hash component to frozen config surface`,
  );
  button.addEventListener("click", () => {
    state.activeLayerRef = card.layerRef;
    render();
  });

  const title = document.createElement("strong");
  title.textContent = card.label;
  button.append(title);

  const summary = document.createElement("span");
  summary.className = "stack-card__summary";
  summary.textContent = card.summary;
  button.append(summary);

  const meta = document.createElement("div");
  meta.className = "stack-card__meta";
  meta.append(chip(card.lineagePosture, card.tone), chip(card.tone.toUpperCase(), card.tone));
  button.append(meta);

  return button;
}

function renderHeader(scenario) {
  elements.pageTitle.textContent = state.payload.title;
  elements.pageSubtitle.textContent = state.payload.subtitle;
  elements.basisStatement.textContent = state.payload.basisStatement;
  elements.scenarioTitle.textContent = `${scenario.displayName} · ${scenario.manifestLabel}`;

  const tone = toneForScenario(scenario);
  elements.basisChip.textContent = scenario.resolutionBasis;
  elements.basisChip.dataset.tone = tone;
  elements.completenessChip.textContent = scenario.completenessState;
  elements.completenessChip.dataset.tone = scenario.blocked ? "danger" : "success";
  elements.flagsChip.textContent = scenario.featureFlagSurfaceState;
  elements.flagsChip.dataset.tone =
    scenario.featureFlagSurfaceState === "NO_GOVERNED_FLAG_SURFACE" ? "warning" : tone;

  elements.hashVectorToggle.dataset.active = state.showHashVector ? "true" : "false";
  elements.hashVectorToggle.textContent = state.showHashVector ? "Hide hash vector" : "Show hash vector";
}

function renderScenarioSelector() {
  elements.scenarioSelector.replaceChildren(
    ...state.payload.scenarios.map((scenario) => createScenarioButton(scenario)),
  );
}

function renderLayerRail() {
  elements.layerRail.replaceChildren(
    ...state.payload.layerRail.map((layer) => createLayerButton(layer)),
  );
}

function renderStack(scenario) {
  elements.stackCanvas.replaceChildren(
    ...scenario.layerCards.map((card) => createLayerCard(card)),
  );
}

function renderInspector(scenario, card) {
  elements.inspectorTitle.textContent = `${card.label} inspector`;

  const sourceRefs = document.createElement("ul");
  sourceRefs.className = "field-list";
  card.sourceRefs.forEach((value) => {
    const item = document.createElement("li");
    item.innerHTML = `<strong>${value}</strong>`;
    sourceRefs.append(item);
  });

  const notes = document.createElement("ul");
  notes.className = "note-list";
  card.notes.forEach((value) => {
    const item = document.createElement("li");
    item.textContent = value;
    notes.append(item);
  });

  const detailRow = document.createElement("div");
  detailRow.className = "detail-row";
  detailRow.append(
    chip(scenario.resolutionBasis, toneForScenario(scenario)),
    chip(card.lineagePosture, card.tone),
    chip(scenario.blocked ? "READ_ONLY_BLOCKED" : "READ_ONLY_ATLAS"),
  );

  const sections = [
    section("Layer Summary", [detailRow]),
    section("Source Refs", [sourceRefs]),
    section("Notes", [notes]),
  ];

  if (state.showHashVector) {
    const vector = document.createElement("div");
    vector.className = "note-list";
    if (scenario.hashVector.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = "No hash vector exists because the completeness barrier blocked freeze materialization.";
      vector.append(empty);
    } else {
      scenario.hashVector.forEach((entry) => {
        const row = document.createElement("div");
        row.className = "hash-vector-row";
        row.innerHTML = `<strong>${entry.field}</strong><span>${entry.value}</span>`;
        vector.append(row);
      });
    }
    sections.push(section("Hash Vector", [vector]));
  }

  elements.inspectorBody.replaceChildren(...sections);
}

function render() {
  const scenario = activeScenario();
  const card = currentLayerCard();
  renderHeader(scenario);
  renderScenarioSelector();
  renderLayerRail();
  renderStack(scenario);
  renderInspector(scenario, card);
}

async function load() {
  setMotionPreference();
  elements.hashVectorToggle.addEventListener("click", () => {
    state.showHashVector = !state.showHashVector;
    render();
  });

  const response = await fetch(dataPath);
  if (!response.ok) {
    throw new Error(`Failed to load atlas payload: ${response.status}`);
  }
  state.payload = await response.json();
  render();
}

load().catch((error) => {
  console.error(error);
  document.body.innerHTML = `<pre>${String(error)}</pre>`;
});
