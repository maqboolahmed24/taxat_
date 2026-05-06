const dataPath = "./data/audit-stream-atlas.json";

const state = {
  activeEventId: null,
  activeFamilyRef: null,
  activeMergedMode: null,
  activeScenarioId: null,
  activeStreamRef: null,
  payload: null,
};

const elements = {
  basisStatement: document.querySelector("#basis-statement"),
  continuityChip: document.querySelector("#continuity-chip"),
  familyRail: document.querySelector("#family-rail"),
  focusNote: document.querySelector("#focus-note"),
  inspectorBody: document.querySelector("#inspector-body"),
  inspectorTitle: document.querySelector("#inspector-title"),
  ledger: document.querySelector("#ledger"),
  ledgerTitle: document.querySelector("#ledger-title"),
  mergedBody: document.querySelector("#merged-body"),
  mergedModeSelector: document.querySelector("#merged-mode-selector"),
  pageSubtitle: document.querySelector("#page-subtitle"),
  pageTitle: document.querySelector("#page-title"),
  retentionChip: document.querySelector("#retention-chip"),
  scenarioSelector: document.querySelector("#scenario-selector"),
  scenarioTitle: document.querySelector("#scenario-title"),
  signatureChip: document.querySelector("#signature-chip"),
  streamSelector: document.querySelector("#stream-selector"),
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

function scenarioFamilyStreams() {
  const scenario = activeScenario();
  state.activeFamilyRef = state.activeFamilyRef ?? scenario.selectedFamilyRef;
  return scenario.streams.filter((entry) => entry.familyRef === state.activeFamilyRef);
}

function activeStream() {
  const scenario = activeScenario();
  const familyStreams = scenarioFamilyStreams();
  state.activeStreamRef =
    state.activeStreamRef ??
    (familyStreams.find((entry) => entry.streamRef === scenario.selectedStreamRef)?.streamRef ??
      familyStreams[0]?.streamRef ??
      scenario.streams[0]?.streamRef);
  return (
    scenario.streams.find((entry) => entry.streamRef === state.activeStreamRef) ?? scenario.streams[0]
  );
}

function activeEvent() {
  const stream = activeStream();
  state.activeEventId = state.activeEventId ?? stream.events[0]?.auditEventId ?? null;
  return stream.events.find((entry) => entry.auditEventId === state.activeEventId) ?? stream.events[0];
}

function activeMergedMode() {
  state.activeMergedMode = state.activeMergedMode ?? state.payload.selectedMergedMode;
  return state.activeMergedMode;
}

function createChip(text, tone) {
  const chip = document.createElement("span");
  chip.className = "detail-chip";
  chip.textContent = text;
  if (tone) {
    chip.dataset.tone = tone;
  }
  return chip;
}

function createScenarioButton(scenario) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "scenario-card";
  button.dataset.active = scenario.scenarioId === activeScenario().scenarioId ? "true" : "false";
  button.setAttribute("aria-pressed", button.dataset.active === "true" ? "true" : "false");
  button.setAttribute("aria-label", `Audit scenario ${scenario.displayName}`);
  button.addEventListener("click", () => {
    state.activeScenarioId = scenario.scenarioId;
    state.activeFamilyRef = scenario.selectedFamilyRef;
    state.activeStreamRef = scenario.selectedStreamRef;
    state.activeEventId = null;
    render();
  });

  const title = document.createElement("strong");
  title.textContent = scenario.displayName;
  button.append(title);

  const summary = document.createElement("span");
  summary.className = "scenario-card__summary";
  summary.textContent = scenario.summary;
  button.append(summary);

  return button;
}

function createFamilyButton(family) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "family-button";
  button.dataset.active = family.familyRef === state.activeFamilyRef ? "true" : "false";
  button.setAttribute("aria-pressed", button.dataset.active === "true" ? "true" : "false");
  button.setAttribute("aria-label", family.accessibleLabel);
  button.addEventListener("click", () => {
    state.activeFamilyRef = family.familyRef;
    state.activeStreamRef = scenarioFamilyStreams()[0]?.streamRef ?? null;
    state.activeEventId = null;
    render();
  });

  const title = document.createElement("strong");
  title.textContent = family.familyRef;
  button.append(title);

  const label = document.createElement("span");
  label.textContent = family.label;
  button.append(label);

  const meta = document.createElement("small");
  meta.textContent = family.signaturePosture;
  button.append(meta);

  return button;
}

function createStreamButton(stream) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "stream-button";
  button.dataset.active = stream.streamRef === activeStream().streamRef ? "true" : "false";
  button.setAttribute("aria-pressed", button.dataset.active === "true" ? "true" : "false");
  button.setAttribute("aria-label", stream.accessibleLabel);
  button.addEventListener("click", () => {
    state.activeStreamRef = stream.streamRef;
    state.activeEventId = stream.events[0]?.auditEventId ?? null;
    render();
  });

  const title = document.createElement("strong");
  title.textContent = stream.displayName;
  button.append(title);

  const meta = document.createElement("span");
  meta.textContent = `${stream.continuityState} · ${stream.headSequence} rows`;
  button.append(meta);

  return button;
}

function createEventButton(event) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "event-card";
  button.dataset.active = event.auditEventId === activeEvent().auditEventId ? "true" : "false";
  button.setAttribute("aria-pressed", button.dataset.active === "true" ? "true" : "false");
  button.setAttribute("aria-label", event.accessibleLabel);
  button.addEventListener("click", () => {
    state.activeEventId = event.auditEventId;
    render();
  });

  const sequence = document.createElement("span");
  sequence.className = "event-card__sequence";
  sequence.textContent = `#${event.streamSequence}`;
  button.append(sequence);

  const title = document.createElement("strong");
  title.className = "ledger-event-title";
  title.textContent = event.eventType;
  button.append(title);

  const summary = document.createElement("span");
  summary.className = "event-card__summary";
  summary.textContent = event.summary;
  button.append(summary);

  const meta = document.createElement("div");
  meta.className = "event-card__meta";
  meta.append(
    createChip(
      event.payloadAvailabilityState,
      event.payloadAvailabilityState === "FULL" ? "success" : "warning",
    ),
    createChip(
      event.signatureState,
      event.signatureState === "FAILED" ? "danger" : "success",
    ),
  );
  button.append(meta);

  return button;
}

function createModeButton(mode) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "mode-button";
  button.dataset.active = mode.modeId === activeMergedMode() ? "true" : "false";
  button.setAttribute("aria-pressed", button.dataset.active === "true" ? "true" : "false");
  button.setAttribute("aria-label", mode.accessibleLabel);
  button.textContent = mode.label;
  button.addEventListener("click", () => {
    state.activeMergedMode = mode.modeId;
    render();
  });
  return button;
}

function section(titleText, children) {
  const sectionNode = document.createElement("section");
  sectionNode.className = "inspector-section";
  const title = document.createElement("h3");
  title.textContent = titleText;
  sectionNode.append(title, ...children);
  return sectionNode;
}

function definitionList(entries) {
  const list = document.createElement("dl");
  list.className = "detail-list";
  entries.forEach(([termText, valueText]) => {
    const term = document.createElement("dt");
    term.textContent = termText;
    const value = document.createElement("dd");
    value.textContent = valueText;
    list.append(term, value);
  });
  return list;
}

function bulletList(values) {
  const list = document.createElement("ul");
  list.className = "bullet-list";
  values.forEach((entry) => {
    const item = document.createElement("li");
    item.textContent = entry;
    list.append(item);
  });
  return list;
}

function renderHeader() {
  const scenario = activeScenario();
  const stream = activeStream();
  elements.pageTitle.textContent = state.payload.title;
  elements.pageSubtitle.textContent = state.payload.subtitle;
  elements.basisStatement.textContent = state.payload.basisStatement;
  elements.scenarioTitle.textContent = scenario.displayName;
  elements.continuityChip.textContent = stream.continuityState;
  elements.continuityChip.dataset.tone =
    stream.continuityState.includes("VERIFIED") ? "success" : "danger";
  elements.signatureChip.textContent = stream.signaturePosture;
  elements.signatureChip.dataset.tone =
    stream.signaturePosture.includes("FAILED")
      ? "danger"
      : stream.signaturePosture.includes("PENDING")
        ? "warning"
        : "success";
  elements.retentionChip.textContent = scenario.retentionChip;
  elements.retentionChip.dataset.tone = scenario.retentionChip.includes("LIMITED")
    ? "warning"
    : "success";
  elements.focusNote.textContent = scenario.focusNote;
}

function renderScenarioSelector() {
  elements.scenarioSelector.replaceChildren(
    ...state.payload.scenarios.map((scenario) => createScenarioButton(scenario)),
  );
}

function renderFamilyRail() {
  const scenario = activeScenario();
  const familyRefs = new Set(scenario.streams.map((entry) => entry.familyRef));
  const visibleFamilies = state.payload.familyRail.filter((entry) => familyRefs.has(entry.familyRef));
  if (!familyRefs.has(state.activeFamilyRef)) {
    state.activeFamilyRef = visibleFamilies[0]?.familyRef ?? null;
  }
  elements.familyRail.replaceChildren(...visibleFamilies.map((family) => createFamilyButton(family)));
}

function renderStreamSelector() {
  const scenario = activeScenario();
  const streams = scenarioFamilyStreams();
  if (!streams.some((entry) => entry.streamRef === state.activeStreamRef)) {
    state.activeStreamRef = streams[0]?.streamRef ?? scenario.streams[0]?.streamRef ?? null;
  }
  elements.streamSelector.replaceChildren(...streams.map((stream) => createStreamButton(stream)));
}

function renderLedger() {
  const stream = activeStream();
  elements.ledgerTitle.textContent = `${stream.displayName} ledger`;
  if (!stream.events.some((entry) => entry.auditEventId === state.activeEventId)) {
    state.activeEventId = stream.events[0]?.auditEventId ?? null;
  }
  elements.ledger.replaceChildren(...stream.events.map((event) => createEventButton(event)));
}

function renderInspector() {
  const event = activeEvent();
  elements.inspectorTitle.textContent = `${event.eventType} detail`;

  const summaryRow = document.createElement("div");
  summaryRow.className = "detail-row";
  summaryRow.append(
    createChip(`Sequence ${event.streamSequence}`, "success"),
    createChip(
      event.payloadAvailabilityState,
      event.payloadAvailabilityState === "FULL" ? "success" : "warning",
    ),
    createChip(event.signatureState, event.signatureState === "FAILED" ? "danger" : "success"),
  );

  const blocks = [
    section("Summary", [summaryRow]),
    section("Continuity", [
      definitionList([
        ["Audit event id", event.auditEventId],
        ["Chain hash", event.chainHash],
        ["Previous hash", event.prevEventHashOrNull ?? "<root>"],
        ["Recorded at", event.recordedAt],
        ["Visibility class", event.visibilityClass],
      ]),
    ]),
    section("Retained context", [
      definitionList([
        ["Payload availability", event.payloadAvailabilityState],
        ["Audit sufficiency", event.auditSufficiencyState],
        ["Payload expiry", event.payloadExpiryAtOrNull ?? "<none>"],
        ["Signature ref", event.signatureRefOrNull ?? "<none>"],
        ["Signature failure", event.signatureFailureReasonCodeOrNull ?? "<none>"],
      ]),
    ]),
    section("Reason codes", [bulletList(event.reasonCodes.length > 0 ? event.reasonCodes : ["<none>"])]),
    section("Lineage refs", [bulletList(event.lineageRefs)]),
    section(
      "Limitation reason codes",
      [bulletList(event.limitationReasonCodes.length > 0 ? event.limitationReasonCodes : ["<none>"])],
    ),
    section("Object refs", [bulletList(event.objectRefs.length > 0 ? event.objectRefs : ["<none>"])]),
  ];

  elements.inspectorBody.replaceChildren(...blocks);
}

function renderMergedPanel() {
  const scenario = activeScenario();
  const mergedMode = activeMergedMode();
  elements.mergedModeSelector.replaceChildren(
    ...state.payload.mergedModes.map((mode) => createModeButton(mode)),
  );

  if (mergedMode === "STRICT_STREAM") {
    const message = document.createElement("p");
    message.className = "merged-message";
    message.textContent =
      "Strict stream mode keeps the ledger rail primary. Merged explanation is available, but it never changes stream order.";
    elements.mergedBody.replaceChildren(message);
    return;
  }

  const rows = scenario.mergedView.map((row) => {
    const article = document.createElement("article");
    article.className = "merged-row";
    article.setAttribute("aria-label", row.accessibleLabel);

    const title = document.createElement("strong");
    title.textContent = `${row.eventType} · ${row.streamRef}`;
    article.append(title);

    const meta = document.createElement("span");
    meta.textContent = `${row.recordedAt} · sequence ${row.streamSequence}`;
    article.append(meta);

    const summary = document.createElement("p");
    summary.textContent = row.summary;
    article.append(summary);

    return article;
  });
  elements.mergedBody.replaceChildren(...rows);
}

function render() {
  renderHeader();
  renderScenarioSelector();
  renderFamilyRail();
  renderStreamSelector();
  renderLedger();
  renderInspector();
  renderMergedPanel();
}

async function main() {
  setMotionPreference();
  const response = await fetch(dataPath);
  state.payload = await response.json();
  render();
}

void main();
