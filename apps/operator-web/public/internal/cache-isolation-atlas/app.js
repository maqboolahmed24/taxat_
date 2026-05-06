const dataPath = "./data/cache-isolation-atlas.json";

const state = {
  activeScenarioId: null,
  activeScopeClass: null,
  payload: null,
};

const elements = {
  basisStatement: document.querySelector("#basis-statement"),
  decisionChip: document.querySelector("#decision-chip"),
  inspectorBody: document.querySelector("#inspector-body"),
  inspectorTitle: document.querySelector("#inspector-title"),
  mutationGateChip: document.querySelector("#mutation-gate-chip"),
  pageSubtitle: document.querySelector("#page-subtitle"),
  pageTitle: document.querySelector("#page-title"),
  previewChip: document.querySelector("#preview-chip"),
  scenarioList: document.querySelector("#scenario-list"),
  scenarioTitle: document.querySelector("#scenario-title"),
  scopeSelector: document.querySelector("#scope-selector"),
};

function setMotionPreference() {
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const sync = () => {
    document.documentElement.dataset.motion = motionQuery.matches ? "reduce" : "standard";
  };
  sync();
  motionQuery.addEventListener("change", sync);
}

function scopeRows() {
  return state.payload.scopeRows;
}

function scenariosForScope(cacheScopeClass) {
  return state.payload.scenarios.filter((entry) => entry.cacheScopeClass === cacheScopeClass);
}

function activeScopeRow() {
  state.activeScopeClass = state.activeScopeClass ?? state.payload.selectedScopeClass;
  return (
    scopeRows().find((entry) => entry.cacheScopeClass === state.activeScopeClass) ?? scopeRows()[0]
  );
}

function activeScenario() {
  const scope = activeScopeRow();
  const scopedScenarios = scenariosForScope(scope.cacheScopeClass);
  state.activeScenarioId = state.activeScenarioId ?? state.payload.selectedScenarioId;
  if (!scopedScenarios.some((entry) => entry.scenarioId === state.activeScenarioId)) {
    state.activeScenarioId = scopedScenarios[0]?.scenarioId ?? null;
  }
  return scopedScenarios.find((entry) => entry.scenarioId === state.activeScenarioId) ?? null;
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

function scopeTone(scopeRow) {
  if (scopeRow.requiresPreviewSubject) {
    return "warning";
  }
  if (scopeRow.customerSafeProjectionMode === "REQUIRED_TRUE") {
    return "success";
  }
  if (
    scopeRow.customerSafeProjectionMode === "REQUIRED_FALSE" &&
    !scopeRow.requiresVisibilityPartition
  ) {
    return "danger";
  }
  return null;
}

function createScopeButton(scopeRow, active) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "scope-button";
  button.dataset.active = active ? "true" : "false";
  button.setAttribute("aria-pressed", active ? "true" : "false");
  button.setAttribute("aria-label", `Cache scope selector ${scopeRow.railLabel}`);
  button.addEventListener("click", () => {
    state.activeScopeClass = scopeRow.cacheScopeClass;
    state.activeScenarioId = null;
    render();
  });

  const title = document.createElement("strong");
  title.textContent = scopeRow.railLabel;
  button.append(title);

  const summary = document.createElement("span");
  summary.textContent = `${scopeRow.displayName} · ${scopeRow.restorePosture.replaceAll("_", " ").toLowerCase()}`;
  button.append(summary);

  return button;
}

function createScenarioCard(scenario, active) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "scenario-card";
  button.dataset.active = active ? "true" : "false";
  button.setAttribute("aria-pressed", active ? "true" : "false");
  button.setAttribute("aria-label", `Cache scenario selector ${scenario.displayName}`);
  button.addEventListener("click", () => {
    state.activeScenarioId = scenario.scenarioId;
    render();
  });

  const title = document.createElement("strong");
  title.textContent = scenario.displayName;
  button.append(title);

  const meta = document.createElement("span");
  meta.className = "scenario-card__meta";
  meta.textContent = `${scenario.decision} · ${scenario.liveLegalityState}`;
  button.append(meta);

  const summary = document.createElement("span");
  summary.className = "scenario-card__summary";
  summary.textContent = scenario.summary;
  button.append(summary);

  return button;
}

function renderHeader(scopeRow, scenario) {
  elements.pageTitle.textContent = state.payload.title;
  elements.pageSubtitle.textContent = state.payload.subtitle;
  elements.basisStatement.textContent = state.payload.basisStatement;
  elements.scenarioTitle.textContent =
    scenario === null ? scopeRow.displayName : `${scopeRow.displayName} · ${scenario.displayName}`;

  const decisionTone =
    scenario?.decision === "EXACT_REUSE"
      ? "success"
      : scenario?.decision === "READ_ONLY_RESTORE"
        ? "warning"
        : "danger";
  elements.decisionChip.textContent = scenario?.decision ?? scopeRow.restorePosture;
  elements.decisionChip.dataset.tone = decisionTone ?? scopeTone(scopeRow) ?? "";

  const mutationTone =
    scenario?.mutationGate === "ALLOW_MUTATION"
      ? "success"
      : scenario?.mutationGate === "BLOCK_MUTATION_PENDING_LIVE_LEGALITY"
        ? "warning"
        : "danger";
  elements.mutationGateChip.textContent = scenario?.mutationGate ?? "SCOPE_SELECTED";
  elements.mutationGateChip.dataset.tone = mutationTone ?? "";

  const previewTone = scenario?.previewDecision === "ALLOWED" ? "success" : "danger";
  elements.previewChip.textContent = scenario?.previewDecision ?? "SELECT_SCENARIO";
  elements.previewChip.dataset.tone = scenario ? previewTone : "";
}

function renderScopeSelector(scopeRow) {
  elements.scopeSelector.replaceChildren(
    ...scopeRows().map((entry) =>
      createScopeButton(entry, entry.cacheScopeClass === scopeRow.cacheScopeClass),
    ),
  );
}

function renderScenarioRail(scopeRow, scenario) {
  const scopedScenarios = scenariosForScope(scopeRow.cacheScopeClass);
  if (scopedScenarios.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent =
      "No atlas scenario is attached to this scope class yet. The scope metadata still shows the canonical key segments and restore posture.";
    elements.scenarioList.replaceChildren(empty);
    return;
  }

  elements.scenarioList.replaceChildren(
    ...scopedScenarios.map((entry) =>
      createScenarioCard(entry, entry.scenarioId === scenario?.scenarioId),
    ),
  );
}

function renderInspector(scopeRow, scenario) {
  elements.inspectorTitle.textContent =
    scenario === null
      ? `${scopeRow.displayName} scope contract`
      : `${scenario.displayName} inspector`;

  const keySegmentList = document.createElement("ul");
  keySegmentList.className = "field-list";
  scopeRow.keySegments.forEach((entry) => {
    const item = document.createElement("li");
    item.innerHTML = `<strong>${entry}</strong>`;
    keySegmentList.append(item);
  });

  const scopeSection = section("Scope Contract", [
    (() => {
      const row = document.createElement("div");
      row.className = "detail-row";
      row.append(
        chip(scopeRow.cacheScopeClass, scopeTone(scopeRow)),
        chip(scopeRow.customerSafeProjectionMode),
        chip(
          scopeRow.requiresVisibilityPartition
            ? "visibility partition required"
            : "no visibility partition",
        ),
        chip(
          scopeRow.requiresPreviewSubject ? "preview subject required" : "preview subject cleared",
        ),
      );
      return row;
    })(),
    keySegmentList,
  ]);

  if (scenario === null) {
    elements.inspectorBody.replaceChildren(scopeSection);
    return;
  }

  const bindingList = document.createElement("ul");
  bindingList.className = "field-list";
  [
    ["cache key", scenario.cacheKey],
    ["route identity", scenario.routeIdentityRef],
    ["stored partition", scenario.storedVisibilityPartitionKeyOrNull ?? "<NONE>"],
    ["requested partition", scenario.requestedVisibilityPartitionKeyOrNull ?? "<NONE>"],
    ["selected subject", scenario.selectedSubjectRefOrNull ?? "<NONE>"],
  ].forEach(([label, value]) => {
    const item = document.createElement("li");
    item.innerHTML = `<strong>${label}</strong>: ${value}`;
    bindingList.append(item);
  });

  const mismatchList = document.createElement("ul");
  mismatchList.className = "note-list";
  if (scenario.mismatchFields.length === 0) {
    const item = document.createElement("li");
    item.textContent = "No contract fields drifted; reuse depends only on live-legality state.";
    mismatchList.append(item);
  } else {
    scenario.mismatchFields.forEach((entry) => {
      const item = document.createElement("li");
      item.textContent = entry;
      mismatchList.append(item);
    });
  }

  const purgeList = document.createElement("ul");
  purgeList.className = "note-list";
  if (scenario.purgeArtifactClasses.length === 0) {
    const item = document.createElement("li");
    item.textContent = "No purge artifacts are required while the contract remains exact.";
    purgeList.append(item);
  } else {
    scenario.purgeArtifactClasses.forEach((entry) => {
      const item = document.createElement("li");
      item.textContent = entry;
      purgeList.append(item);
    });
  }

  const triggerList = document.createElement("ul");
  triggerList.className = "note-list";
  if (scenario.purgeTriggerCodes.length === 0) {
    const item = document.createElement("li");
    item.textContent = "No purge trigger fired.";
    triggerList.append(item);
  } else {
    scenario.purgeTriggerCodes.forEach((entry) => {
      const item = document.createElement("li");
      item.textContent = entry;
      triggerList.append(item);
    });
  }

  elements.inspectorBody.replaceChildren(
    scopeSection,
    section("Binding Snapshot", [bindingList]),
    section("Mismatch Fields", [mismatchList]),
    section("Purge Triggers", [triggerList]),
    section("Purge Artifacts", [purgeList]),
  );
}

function render() {
  const scopeRow = activeScopeRow();
  const scenario = activeScenario();
  renderHeader(scopeRow, scenario);
  renderScopeSelector(scopeRow);
  renderScenarioRail(scopeRow, scenario);
  renderInspector(scopeRow, scenario);
}

async function load() {
  setMotionPreference();
  const response = await fetch(dataPath);
  if (!response.ok) {
    throw new Error(`Failed to load atlas payload: ${response.status}`);
  }
  state.payload = await response.json();
  render();
}

load().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  elements.pageSubtitle.textContent = message;
  elements.inspectorBody.replaceChildren(
    (() => {
      const fallback = document.createElement("div");
      fallback.className = "empty-state";
      fallback.textContent = message;
      return fallback;
    })(),
  );
});
