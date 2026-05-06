const dataPath = "./data/object-lifecycle-atlas.json";

const state = {
  activeObjectClassRef: null,
  activeStageRef: null,
  payload: null,
};

const elements = {
  activeClassChip: document.querySelector("#active-class-chip"),
  basisStatement: document.querySelector("#basis-statement"),
  branchList: document.querySelector("#branch-list"),
  classSelector: document.querySelector("#class-selector"),
  deliveryChip: document.querySelector("#delivery-chip"),
  inspectorBody: document.querySelector("#inspector-body"),
  inspectorTitle: document.querySelector("#inspector-title"),
  pageSubtitle: document.querySelector("#page-subtitle"),
  pageTitle: document.querySelector("#page-title"),
  retentionBadge: document.querySelector("#retention-badge"),
  riverList: document.querySelector("#river-list"),
  riverTitle: document.querySelector("#river-title"),
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

function objectClassByRef(ref) {
  return state.payload.objectClasses.find((entry) => entry.objectClassRef === ref) ?? null;
}

function activeObjectClass() {
  state.activeObjectClassRef = state.activeObjectClassRef ?? state.payload.selectedObjectClassRef;
  return objectClassByRef(state.activeObjectClassRef) ?? state.payload.objectClasses[0];
}

function activeStage(objectClass) {
  state.activeStageRef = state.activeStageRef ?? state.payload.selectedStageRef;
  return (
    objectClass.stageCards.find((entry) => entry.stageRef === state.activeStageRef) ??
    objectClass.stageCards[0]
  );
}

function stageMeta(stageRef) {
  return state.payload.stages.find((entry) => entry.stageRef === stageRef) ?? null;
}

function createClassButton(objectClass, active) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "selector-button";
  button.dataset.active = active ? "true" : "false";
  button.setAttribute("aria-pressed", active ? "true" : "false");
  button.setAttribute("aria-label", `Object class selector ${objectClass.railLabel}`);
  button.textContent = objectClass.railLabel;
  button.addEventListener("click", () => {
    state.activeObjectClassRef = objectClass.objectClassRef;
    state.activeStageRef = state.payload.selectedStageRef;
    render();
  });
  return button;
}

function renderHeader(objectClass, stage) {
  elements.pageTitle.textContent = state.payload.title;
  elements.pageSubtitle.textContent = state.payload.subtitle;
  elements.deliveryChip.textContent = state.payload.deliveryPostureChip;
  elements.retentionBadge.textContent = state.payload.retentionPostureBadge;
  elements.activeClassChip.textContent = objectClass.railLabel;
  elements.basisStatement.textContent = state.payload.basisStatement;
  elements.riverTitle.textContent = `${objectClass.displayName} flow`;
  elements.classSelector.replaceChildren(
    ...state.payload.objectClasses.map((entry) =>
      createClassButton(entry, entry.objectClassRef === objectClass.objectClassRef),
    ),
  );
  document.title = `${state.payload.title} | ${objectClass.displayName} | ${stage.label}`;
}

function createStageRailButton(stage, active) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "stage-rail__button";
  button.dataset.active = active ? "true" : "false";
  button.setAttribute("aria-current", active ? "true" : "false");
  button.setAttribute("aria-label", `Lifecycle stage rail entry ${stage.label.toUpperCase()}`);

  const label = document.createElement("span");
  label.className = "stage-rail__label";
  label.textContent = stage.label;
  button.append(label);

  const summary = document.createElement("span");
  summary.className = "stage-rail__summary";
  summary.textContent = stage.summary;
  button.append(summary);

  button.addEventListener("click", () => {
    state.activeStageRef = stage.stageRef;
    render();
  });
  return button;
}

function renderStageRail(stage) {
  elements.stageList.replaceChildren(
    ...state.payload.stages.map((entry) => {
      const item = document.createElement("li");
      item.className = "stage-rail__item";
      item.append(createStageRailButton(entry, entry.stageRef === stage.stageRef));
      return item;
    }),
  );
}

function createStageCard(card, active) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "river-card";
  button.dataset.active = active ? "true" : "false";
  button.dataset.tone = card.tone;
  button.setAttribute("aria-label", card.accessibleLabel);

  const overline = document.createElement("span");
  overline.className = "river-card__eyebrow";
  overline.textContent = stageMeta(card.stageRef)?.label ?? card.stageRef;
  button.append(overline);

  const title = document.createElement("strong");
  title.textContent = card.label;
  button.append(title);

  const summary = document.createElement("p");
  summary.className = "river-card__summary";
  summary.textContent = card.summary;
  button.append(summary);

  const law = document.createElement("span");
  law.className = "river-card__law";
  law.textContent =
    card.deliveryLaw === "GOVERNED"
      ? "Governed delivery"
      : card.deliveryLaw === "DERIVATIVE_REQUIRED"
        ? "Derivative required"
        : "Delivery denied";
  button.append(law);

  button.addEventListener("click", () => {
    state.activeStageRef = card.stageRef;
    render();
  });
  return button;
}

function renderRiver(objectClass, stage) {
  elements.riverList.replaceChildren(
    ...objectClass.stageCards.map((card) =>
      createStageCard(card, card.stageRef === stage.stageRef),
    ),
  );
}

function renderBranchChips(objectClass) {
  elements.branchList.replaceChildren(
    ...objectClass.branchChips.map((chip) => {
      const item = document.createElement("li");
      item.className = "branch-chip";
      item.dataset.tone = chip.tone;
      const label = document.createElement("strong");
      label.textContent = chip.label;
      item.append(label);
      const text = document.createElement("p");
      text.textContent = chip.text;
      item.append(text);
      return item;
    }),
  );
}

function metricChip(text) {
  const chip = document.createElement("span");
  chip.className = "metric-chip";
  chip.textContent = text;
  return chip;
}

function sectionHeading(text) {
  const heading = document.createElement("h3");
  heading.textContent = text;
  return heading;
}

function renderInspector(objectClass, stage) {
  elements.inspectorTitle.textContent = `${stage.label.toUpperCase()} · ${objectClass.displayName}`;
  elements.inspectorBody.replaceChildren();

  const intro = document.createElement("p");
  intro.className = "inspector-copy";
  intro.textContent = stage.summary;
  elements.inspectorBody.append(intro);

  const metrics = document.createElement("div");
  metrics.className = "metric-row";
  metrics.append(
    metricChip(objectClass.storageRefPrefix),
    metricChip(objectClass.resumabilityPosture),
    metricChip(objectClass.currentHistoryPosture),
  );
  elements.inspectorBody.append(metrics);

  elements.inspectorBody.append(sectionHeading("Quarantine posture"));
  const quarantine = document.createElement("p");
  quarantine.className = "inspector-copy";
  quarantine.textContent = objectClass.quarantineSummary;
  elements.inspectorBody.append(quarantine);

  elements.inspectorBody.append(sectionHeading("Delivery binding"));
  const delivery = document.createElement("p");
  delivery.className = "inspector-copy";
  delivery.textContent = objectClass.deliverySummary;
  elements.inspectorBody.append(delivery);

  elements.inspectorBody.append(sectionHeading("Retention hooks"));
  const hooks = document.createElement("ul");
  hooks.className = "note-list";
  objectClass.retentionHookRefs.forEach((hookRef) => {
    const item = document.createElement("li");
    item.textContent = hookRef;
    hooks.append(item);
  });
  elements.inspectorBody.append(hooks);

  const retention = document.createElement("p");
  retention.className = "inspector-copy";
  retention.textContent = objectClass.retentionSummary;
  elements.inspectorBody.append(retention);

  elements.inspectorBody.append(sectionHeading("Notes"));
  const notes = document.createElement("ul");
  notes.className = "note-list";
  objectClass.notes.forEach((note) => {
    const item = document.createElement("li");
    item.textContent = note;
    notes.append(item);
  });
  elements.inspectorBody.append(notes);
}

function render() {
  const objectClass = activeObjectClass();
  const stage = activeStage(objectClass);
  renderHeader(objectClass, stage);
  renderStageRail(stage);
  renderRiver(objectClass, stage);
  renderBranchChips(objectClass);
  renderInspector(objectClass, stage);
}

async function main() {
  setMotionPreference();
  const response = await fetch(dataPath);
  state.payload = await response.json();
  render();
}

main().catch((error) => {
  elements.inspectorTitle.textContent = "Failed to load lifecycle atlas";
  elements.inspectorBody.textContent = error instanceof Error ? error.message : String(error);
});
