const dataPath = "./data/queue-fabric-atlas.json";

const state = {
  activeFamilyRef: null,
  activeStageRef: null,
  payload: null,
};

const elements = {
  activeFamilyChip: document.querySelector("#active-family-chip"),
  basisStatement: document.querySelector("#basis-statement"),
  canvasTitle: document.querySelector("#canvas-title"),
  deadLetterChip: document.querySelector("#dead-letter-chip"),
  familyGrid: document.querySelector("#family-grid"),
  familySelector: document.querySelector("#family-selector"),
  inspectorBody: document.querySelector("#inspector-body"),
  inspectorTitle: document.querySelector("#inspector-title"),
  orderingBadge: document.querySelector("#ordering-badge"),
  pageSubtitle: document.querySelector("#page-subtitle"),
  pageTitle: document.querySelector("#page-title"),
  payloadStatement: document.querySelector("#payload-statement"),
  stageList: document.querySelector("#stage-list"),
};

function setMotionPreference() {
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const sync = () => {
    document.documentElement.dataset.motion = motionQuery.matches ? "reduce" : "standard";
  };
  sync();
  motionQuery.addEventListener("change", sync);
}

function familyByRef(familyRef) {
  return state.payload.families.find((entry) => entry.familyRef === familyRef) ?? null;
}

function stageByRef(stageRef) {
  return state.payload.stages.find((entry) => entry.stageRef === stageRef) ?? null;
}

function activeFamily() {
  state.activeFamilyRef = state.activeFamilyRef ?? state.payload.selectedFamilyRef;
  return familyByRef(state.activeFamilyRef) ?? state.payload.families[0];
}

function activeStage() {
  state.activeStageRef = state.activeStageRef ?? state.payload.selectedStageRef;
  return stageByRef(state.activeStageRef) ?? state.payload.stages[0];
}

function activeNode(family, stage) {
  return family.stageNodes.find((entry) => entry.stageRef === stage.stageRef) ?? family.stageNodes[0];
}

function createFamilyButton(family, active) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "selector-button";
  button.dataset.active = active ? "true" : "false";
  button.setAttribute("aria-pressed", active ? "true" : "false");
  button.setAttribute("aria-label", `Queue family selector ${family.railLabel}`);
  button.textContent = family.railLabel;
  button.addEventListener("click", () => {
    state.activeFamilyRef = family.familyRef;
    render();
  });
  return button;
}

function renderHeader(family) {
  elements.pageTitle.textContent = state.payload.title;
  elements.pageSubtitle.textContent = state.payload.subtitle;
  elements.basisStatement.textContent = state.payload.basisStatement;
  elements.payloadStatement.textContent = state.payload.payloadSafetyStatement;
  elements.activeFamilyChip.textContent = family.railLabel;
  elements.orderingBadge.textContent = family.orderingScopeBadge;
  elements.deadLetterChip.textContent = family.deadLetterPostureChip;
  elements.canvasTitle.textContent = `${family.displayName} highlighted across the dispatch braid`;
  elements.familySelector.replaceChildren(
    ...state.payload.families.map((entry) =>
      createFamilyButton(entry, entry.familyRef === family.familyRef),
    ),
  );
}

function createStageButton(stage, active) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "stage-button";
  button.dataset.active = active ? "true" : "false";
  button.setAttribute("aria-current", active ? "true" : "false");
  button.setAttribute("aria-label", `Dispatch stage rail entry ${stage.label}`);
  button.addEventListener("click", () => {
    state.activeStageRef = stage.stageRef;
    render();
  });

  const title = document.createElement("strong");
  title.textContent = stage.label;
  button.append(title);

  const summary = document.createElement("span");
  summary.textContent = stage.summary;
  button.append(summary);
  return button;
}

function renderStageRail(stage) {
  elements.stageList.replaceChildren(
    ...state.payload.stages.map((entry) => {
      const item = document.createElement("li");
      item.append(createStageButton(entry, entry.stageRef === stage.stageRef));
      return item;
    }),
  );
}

function createNodeButton(family, node, stage, active) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "node-button";
  button.dataset.active = active ? "true" : "false";
  button.dataset.tone = node.tone;
  button.setAttribute("aria-label", node.accessibleLabel);
  button.addEventListener("click", () => {
    state.activeFamilyRef = family.familyRef;
    state.activeStageRef = node.stageRef;
    render();
  });

  const eyebrow = document.createElement("span");
  eyebrow.className = "node-button__eyebrow";
  eyebrow.textContent = stage.label;
  button.append(eyebrow);

  const title = document.createElement("strong");
  title.textContent = node.title;
  button.append(title);

  const summary = document.createElement("p");
  summary.className = "node-button__summary";
  summary.textContent = node.summary;
  button.append(summary);

  const ring = document.createElement("span");
  ring.className = "node-button__ring";
  button.append(ring);

  return button;
}

function createFamilyRow(family, activeFamilyRef, activeStageRef) {
  const row = document.createElement("section");
  row.className = "family-row";
  row.dataset.active = family.familyRef === activeFamilyRef ? "true" : "false";

  const label = document.createElement("div");
  label.className = "row-label";
  const title = document.createElement("strong");
  title.textContent = family.railLabel;
  label.append(title);
  const summary = document.createElement("span");
  summary.textContent = family.displayName;
  label.append(summary);
  const queueMeta = document.createElement("p");
  queueMeta.textContent = family.queueRoutingKey;
  label.append(queueMeta);
  row.append(label);

  state.payload.stages.forEach((stage) => {
    const node = family.stageNodes.find((entry) => entry.stageRef === stage.stageRef);
    row.append(
      createNodeButton(
        family,
        node,
        stage,
        family.familyRef === activeFamilyRef && node.stageRef === activeStageRef,
      ),
    );
  });

  return row;
}

function renderFamilyGrid(family, stage) {
  elements.familyGrid.replaceChildren(
    ...state.payload.families.map((entry) =>
      createFamilyRow(entry, family.familyRef, stage.stageRef),
    ),
  );
}

function metricChip(text) {
  const chip = document.createElement("span");
  chip.className = "metric-chip";
  chip.textContent = text;
  return chip;
}

function section(titleText, nodes) {
  const sectionNode = document.createElement("section");
  sectionNode.className = "inspector-section";
  const title = document.createElement("h3");
  title.textContent = titleText;
  sectionNode.append(title, ...nodes);
  return sectionNode;
}

function renderInspector(family, stage, node) {
  elements.inspectorTitle.textContent = `${stage.label} · ${family.displayName}`;
  elements.inspectorBody.replaceChildren();

  const intro = document.createElement("p");
  intro.className = "inspector-copy";
  intro.textContent = node.detail;
  elements.inspectorBody.append(intro);

  const metrics = document.createElement("div");
  metrics.className = "metric-row";
  metrics.append(
    metricChip(family.queueRef),
    metricChip(family.retryBudgetClass),
    metricChip(family.workerClassRef),
  );
  elements.inspectorBody.append(metrics);

  const ordering = document.createElement("p");
  ordering.className = "inspector-copy";
  ordering.textContent = family.orderingSummary;
  elements.inspectorBody.append(section("Ordering", [ordering]));

  const retry = document.createElement("p");
  retry.className = "inspector-copy";
  retry.textContent = family.retrySummary;
  elements.inspectorBody.append(section("Retry posture", [retry]));

  const producers = document.createElement("ul");
  producers.className = "producer-list";
  family.producerFamilies.forEach((entry) => {
    const item = document.createElement("li");
    item.textContent = entry;
    producers.append(item);
  });
  elements.inspectorBody.append(section("Lawful producers", [producers]));

  const notes = document.createElement("ul");
  notes.className = "note-list";
  family.notes.forEach((entry) => {
    const item = document.createElement("li");
    item.textContent = entry;
    notes.append(item);
  });
  elements.inspectorBody.append(section("Notes", [notes]));
}

function render() {
  const family = activeFamily();
  const stage = activeStage();
  const node = activeNode(family, stage);
  renderHeader(family);
  renderStageRail(stage);
  renderFamilyGrid(family, stage);
  renderInspector(family, stage, node);
  document.title = `${state.payload.title} | ${family.displayName} | ${stage.label}`;
}

async function main() {
  setMotionPreference();
  const response = await fetch(dataPath);
  state.payload = await response.json();
  render();
}

main().catch((error) => {
  document.body.textContent = `Failed to load queue fabric atlas: ${String(error)}`;
});
