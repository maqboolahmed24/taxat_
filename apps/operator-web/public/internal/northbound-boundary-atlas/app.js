const dataPath = "./data/northbound-boundary-atlas.json";

const state = {
  activeCommandType: null,
  activeStageRef: null,
  payload: null,
};

const elements = {
  activeFamilyChip: document.querySelector("#active-family-chip"),
  activeStageChip: document.querySelector("#active-stage-chip"),
  basisStatement: document.querySelector("#basis-statement"),
  boundaryPostureChip: document.querySelector("#boundary-posture-chip"),
  familySelector: document.querySelector("#family-selector"),
  flowGrid: document.querySelector("#flow-grid"),
  inspectorBody: document.querySelector("#inspector-body"),
  inspectorTitle: document.querySelector("#inspector-title"),
  pageSubtitle: document.querySelector("#page-subtitle"),
  pageTitle: document.querySelector("#page-title"),
  routeStabilityBadge: document.querySelector("#route-stability-badge"),
  schemaGrid: document.querySelector("#schema-grid"),
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

function activeFamily() {
  state.activeCommandType = state.activeCommandType ?? state.payload.selectedCommandType;
  return (
    state.payload.families.find((family) => family.commandType === state.activeCommandType) ??
    state.payload.families[0]
  );
}

function activeStage() {
  state.activeStageRef = state.activeStageRef ?? state.payload.selectedStageRef;
  return (
    state.payload.stages.find((stage) => stage.stage_ref === state.activeStageRef) ??
    state.payload.stages[0]
  );
}

function createFamilyButton(family, active) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "family-pill";
  button.dataset.active = active ? "true" : "false";
  button.setAttribute("aria-current", active ? "true" : "false");
  button.setAttribute(
    "aria-label",
    `${family.commandType} requires stale guard ${family.requiredGuardFields[0] ?? "none"}`,
  );
  button.textContent = family.commandType;
  button.addEventListener("click", () => {
    state.activeCommandType = family.commandType;
    render();
  });
  return button;
}

function createStageButton(stage, active) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "stage-button";
  button.dataset.active = active ? "true" : "false";
  button.setAttribute("aria-current", active ? "true" : "false");
  button.setAttribute("aria-label", `Boundary stage rail entry ${stage.label}`);

  const code = document.createElement("span");
  code.className = "stage-button__code";
  code.textContent = stage.label;
  button.append(code);

  const summary = document.createElement("span");
  summary.textContent = stage.summary;
  button.append(summary);

  button.addEventListener("click", () => {
    state.activeStageRef = stage.stage_ref;
    render();
  });
  return button;
}

function renderHeader(family, stage) {
  elements.pageTitle.textContent = state.payload.title;
  elements.pageSubtitle.textContent = state.payload.subtitle;
  elements.routeStabilityBadge.textContent = state.payload.routeStabilityBadge;
  elements.boundaryPostureChip.textContent = state.payload.boundaryPostureChip;
  elements.activeFamilyChip.textContent = family.commandType;
  elements.activeStageChip.textContent = stage.label;
  elements.basisStatement.textContent = state.payload.basisStatement;
}

function renderFamilySelector(family) {
  elements.familySelector.replaceChildren(
    ...state.payload.families.map((entry) =>
      createFamilyButton(entry, entry.commandType === family.commandType),
    ),
  );
}

function renderStageRail(stage) {
  elements.stageList.replaceChildren(
    ...state.payload.stages.map((entry) => {
      const item = document.createElement("li");
      item.className = "stage-item";
      item.append(createStageButton(entry, entry.stage_ref === stage.stage_ref));
      return item;
    }),
  );
}

function flowCard(title, summary, tokenText, tone, active) {
  const card = document.createElement("article");
  card.className = "flow-card";
  card.dataset.active = active ? "true" : "false";

  const titleRow = document.createElement("div");
  titleRow.className = "flow-card__title";

  const heading = document.createElement("strong");
  heading.textContent = title;
  titleRow.append(heading);

  const token = document.createElement("span");
  token.className = `token token--${tone}`;
  token.textContent = tokenText;
  titleRow.append(token);

  card.append(titleRow);

  const copy = document.createElement("p");
  copy.className = "inspector-copy";
  copy.textContent = summary;
  card.append(copy);

  return card;
}

function renderFlowCanvas(family, stage) {
  const inputColumn = document.createElement("section");
  inputColumn.className = "flow-column";
  const inputLabel = document.createElement("p");
  inputLabel.className = "flow-column__label";
  inputLabel.textContent = "Input";
  inputColumn.append(inputLabel);
  inputColumn.append(
    flowCard(
      "Command envelope",
      family.stageNarrative.PARSE,
      family.targetScopeClass,
      "receipt",
      stage.stage_ref === "PARSE" || stage.stage_ref === "VALIDATE",
    ),
  );

  const decisionColumn = document.createElement("section");
  decisionColumn.className = "flow-column";
  const decisionLabel = document.createElement("p");
  decisionLabel.className = "flow-column__label";
  decisionLabel.textContent = "Boundary decision";
  decisionColumn.append(decisionLabel);
  decisionColumn.append(
    flowCard(
      "Stale guard gate",
      family.stageNarrative.STALE,
      family.routeScopeClass,
      "problem",
      stage.stage_ref === "STALE",
    ),
  );
  decisionColumn.append(
    flowCard(
      "Duplicate gate",
      family.stageNarrative.DUPLICATE,
      "IDEMPOTENCY",
      "problem",
      stage.stage_ref === "DUPLICATE",
    ),
  );

  const outputColumn = document.createElement("section");
  outputColumn.className = "flow-column";
  const outputLabel = document.createElement("p");
  outputLabel.className = "flow-column__label";
  outputLabel.textContent = "Durable output";
  outputColumn.append(outputLabel);
  outputColumn.append(
    flowCard(
      "Durable receipt",
      family.stageNarrative.RECEIPT,
      family.projectionStreamClass,
      "receipt",
      stage.stage_ref === "RECEIPT",
    ),
  );
  outputColumn.append(
    flowCard(
      "Typed problem",
      family.stageNarrative.PROBLEM,
      "PROBLEM",
      "problem",
      stage.stage_ref === "PROBLEM",
    ),
  );

  elements.flowGrid.replaceChildren(inputColumn, decisionColumn, outputColumn);
}

function inspectorSection(title, body) {
  const section = document.createElement("section");
  section.className = "inspector-section";
  const heading = document.createElement("h3");
  heading.textContent = title;
  section.append(heading);
  section.append(body);
  return section;
}

function renderInspector(family, stage) {
  elements.inspectorTitle.textContent = family.commandType;
  elements.inspectorBody.replaceChildren();

  const intro = document.createElement("p");
  intro.className = "inspector-copy";
  intro.textContent = family.stageNarrative[stage.stage_ref];
  elements.inspectorBody.append(intro);

  const chipRow = document.createElement("div");
  chipRow.className = "chip-row";
  family.chips.forEach((chipText) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = chipText;
    chipRow.append(chip);
  });
  elements.inspectorBody.append(inspectorSection("Family posture", chipRow));

  const guards = document.createElement("ul");
  guards.className = "list-copy";
  family.requiredGuardFields.forEach((field) => {
    const item = document.createElement("li");
    item.textContent = field;
    guards.append(item);
  });
  elements.inspectorBody.append(inspectorSection("Required guard fields", guards));

  const problems = document.createElement("ul");
  problems.className = "list-copy";
  family.problemCodes.forEach((code) => {
    const item = document.createElement("li");
    item.textContent = code;
    problems.append(item);
  });
  elements.inspectorBody.append(inspectorSection("Problem codes", problems));

  const receiptFields = document.createElement("div");
  receiptFields.className = "code-grid";
  family.receiptFields.forEach((field) => {
    const code = document.createElement("code");
    code.textContent = field;
    receiptFields.append(code);
  });
  elements.inspectorBody.append(inspectorSection("Receipt fields", receiptFields));

  const notes = document.createElement("ul");
  notes.className = "list-copy";
  family.notes.forEach((entry) => {
    const item = document.createElement("li");
    item.textContent = entry;
    notes.append(item);
  });
  elements.inspectorBody.append(inspectorSection("Notes", notes));
}

function renderSchemaHashes() {
  elements.schemaGrid.replaceChildren(
    ...Object.entries(state.payload.schemaHashes).map(([label, hash]) => {
      const card = document.createElement("article");
      card.className = "schema-card";
      const heading = document.createElement("strong");
      heading.textContent = label;
      card.append(heading);
      const code = document.createElement("code");
      code.textContent = hash;
      card.append(code);
      const copy = document.createElement("p");
      copy.textContent = "Imported source hash frozen through generated bindings.";
      card.append(copy);
      return card;
    }),
  );
}

function render() {
  const family = activeFamily();
  const stage = activeStage();
  renderHeader(family, stage);
  renderFamilySelector(family);
  renderStageRail(stage);
  renderFlowCanvas(family, stage);
  renderInspector(family, stage);
  renderSchemaHashes();
}

async function main() {
  setMotionPreference();
  const response = await fetch(dataPath);
  state.payload = await response.json();
  render();
}

main().catch((error) => {
  elements.inspectorTitle.textContent = "Failed to load atlas";
  elements.inspectorBody.textContent = error instanceof Error ? error.message : String(error);
});
