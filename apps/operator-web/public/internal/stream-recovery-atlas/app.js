const dataPath = "./data/stream-recovery-atlas.json";

const state = {
  activePhaseRef: null,
  activeScopeClass: null,
  overlayVisible: false,
  payload: null,
  selectedMarkerId: null,
};

const elements = {
  basisStatement: document.querySelector("#basis-statement"),
  canvasTitle: document.querySelector("#canvas-title"),
  inspectorBody: document.querySelector("#inspector-body"),
  inspectorTitle: document.querySelector("#inspector-title"),
  overlayToggle: document.querySelector("#overlay-toggle"),
  pageSubtitle: document.querySelector("#page-subtitle"),
  pageTitle: document.querySelector("#page-title"),
  phaseList: document.querySelector("#phase-list"),
  rebaseBadge: document.querySelector("#rebase-badge"),
  ribbonGrid: document.querySelector("#ribbon-grid"),
  routeChip: document.querySelector("#route-chip"),
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

function ribbonByScope(streamScopeClass) {
  return state.payload.ribbons.find((entry) => entry.streamScopeClass === streamScopeClass) ?? null;
}

function phaseByRef(phaseRef) {
  return state.payload.phases.find((entry) => entry.phaseRef === phaseRef) ?? null;
}

function activeRibbon() {
  state.activeScopeClass = state.activeScopeClass ?? state.payload.selectedStreamScopeClass;
  return ribbonByScope(state.activeScopeClass) ?? state.payload.ribbons[0];
}

function activePhase() {
  state.activePhaseRef = state.activePhaseRef ?? state.payload.selectedPhaseRef;
  return phaseByRef(state.activePhaseRef) ?? state.payload.phases[0];
}

function visibleMarkers(ribbon, phaseRef) {
  if (phaseRef === "REBASE") {
    return ribbon.markers.filter((entry) => entry.phaseRef === "REBASE");
  }
  if (phaseRef === "REVOKE") {
    return ribbon.markers.filter((entry) => entry.phaseRef === "REVOKE");
  }
  return ribbon.markers.filter((entry) => entry.phaseRef === phaseRef);
}

function syncSelectedMarker(ribbon, phaseRef) {
  const allowed = visibleMarkers(ribbon, phaseRef);
  if (allowed.some((entry) => entry.markerId === state.selectedMarkerId)) {
    return;
  }
  state.selectedMarkerId =
    ribbon.streamScopeClass === state.activeScopeClass ? (allowed[0]?.markerId ?? null) : state.selectedMarkerId;
}

function activeMarker() {
  const ribbon = activeRibbon();
  const phase = activePhase();
  syncSelectedMarker(ribbon, phase.phaseRef);
  return ribbon.markers.find((entry) => entry.markerId === state.selectedMarkerId) ?? null;
}

function metricChip(text, tone) {
  const chip = document.createElement("span");
  chip.className = "metric-chip";
  if (tone) {
    chip.dataset.tone = tone;
  }
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

function createScopeButton(ribbon, active) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "selector-button";
  button.dataset.active = active ? "true" : "false";
  button.setAttribute("aria-pressed", active ? "true" : "false");
  button.setAttribute("aria-label", `Stream scope selector ${ribbon.railLabel}`);
  button.textContent = ribbon.railLabel;
  button.addEventListener("click", () => {
    state.activeScopeClass = ribbon.streamScopeClass;
    state.selectedMarkerId = null;
    render();
  });
  return button;
}

function createPhaseButton(phase, active) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "phase-button";
  button.dataset.active = active ? "true" : "false";
  button.setAttribute("aria-current", active ? "true" : "false");
  button.setAttribute("aria-label", `Continuity phase ${phase.label}`);
  button.addEventListener("click", () => {
    state.activePhaseRef = phase.phaseRef;
    state.selectedMarkerId = null;
    render();
  });

  const title = document.createElement("strong");
  title.textContent = phase.label;
  button.append(title);

  const summary = document.createElement("span");
  summary.textContent = phase.summary;
  button.append(summary);
  return button;
}

function createMarkerButton(ribbon, marker, active) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "marker-button";
  button.dataset.active = active ? "true" : "false";
  button.dataset.frameEpoch = String(marker.frameEpoch);
  button.dataset.phaseRef = marker.phaseRef;
  button.setAttribute("aria-label", marker.accessibleLabel);
  button.addEventListener("click", () => {
    state.activeScopeClass = ribbon.streamScopeClass;
    state.selectedMarkerId = marker.markerId;
    render();
  });

  const epoch = document.createElement("span");
  epoch.className = "marker-button__eyebrow";
  epoch.textContent = `Epoch ${marker.frameEpoch}`;
  button.append(epoch);

  const sequence = document.createElement("strong");
  sequence.textContent =
    marker.sequenceOrNull === null ? marker.eventType.toUpperCase() : String(marker.sequenceOrNull);
  button.append(sequence);

  const summary = document.createElement("span");
  summary.className = "marker-button__summary";
  summary.textContent = marker.summary;
  button.append(summary);

  return button;
}

function createRibbonRow(ribbon, activeScopeClass, phaseRef, selectedMarkerId) {
  const row = document.createElement("section");
  row.className = "ribbon-row";
  row.dataset.active = ribbon.streamScopeClass === activeScopeClass ? "true" : "false";
  row.dataset.scopeClass = ribbon.streamScopeClass;

  const label = document.createElement("div");
  label.className = "row-label";
  const title = document.createElement("strong");
  title.textContent = ribbon.displayName;
  label.append(title);
  const route = document.createElement("span");
  route.textContent = ribbon.contract.route_key;
  label.append(route);
  const stateChipRow = document.createElement("div");
  stateChipRow.className = "chip-stack";
  stateChipRow.append(metricChip(ribbon.cursorState), metricChip(ribbon.rebaseBadge, "danger"));
  if (state.overlayVisible) {
    stateChipRow.append(
      metricChip(`duplicate ${ribbon.duplicatePolicyChip}`),
      metricChip(
        `floor ${ribbon.compactionFloorSequenceOrNull === null ? "none" : ribbon.compactionFloorSequenceOrNull}`,
      ),
    );
  }
  label.append(stateChipRow);
  row.append(label);

  const ribbonCanvas = document.createElement("div");
  ribbonCanvas.className = "ribbon-canvas";
  const markers = visibleMarkers(ribbon, phaseRef);
  const visibleEpoch = markers[0]?.frameEpoch ?? ribbon.contract.frame_epoch;
  ribbonCanvas.dataset.visibleEpoch = String(visibleEpoch);

  markers.forEach((marker, index) => {
    if (index > 0 && markers[index - 1].frameEpoch !== marker.frameEpoch) {
      const seam = document.createElement("span");
      seam.className = "epoch-seam";
      seam.setAttribute("aria-hidden", "true");
      ribbonCanvas.append(seam);
    }
    ribbonCanvas.append(
      createMarkerButton(
        ribbon,
        marker,
        ribbon.streamScopeClass === activeScopeClass && marker.markerId === selectedMarkerId,
      ),
    );
  });

  if (markers.length === 0) {
    const empty = document.createElement("div");
    empty.className = "ribbon-empty";
    empty.textContent = "No markers for this phase.";
    ribbonCanvas.append(empty);
  }

  row.append(ribbonCanvas);
  return row;
}

function renderHeader(ribbon, marker) {
  elements.pageTitle.textContent = state.payload.title;
  elements.pageSubtitle.textContent = state.payload.subtitle;
  elements.basisStatement.textContent = state.payload.basisStatement;
  elements.routeChip.textContent = ribbon.contract.route_key;
  elements.rebaseBadge.textContent = ribbon.rebaseBadge;
  elements.canvasTitle.textContent =
    marker === null ? `${ribbon.displayName} continuity` : `${ribbon.displayName} · ${marker.summary}`;
  elements.overlayToggle.textContent = state.payload.overlayToggleLabel;
  elements.overlayToggle.setAttribute("aria-pressed", state.overlayVisible ? "true" : "false");
  elements.scopeSelector.replaceChildren(
    ...state.payload.ribbons.map((entry) =>
      createScopeButton(entry, entry.streamScopeClass === ribbon.streamScopeClass),
    ),
  );
}

function renderPhaseRail(phase) {
  elements.phaseList.replaceChildren(
    ...state.payload.phases.map((entry) => {
      const item = document.createElement("li");
      item.append(createPhaseButton(entry, entry.phaseRef === phase.phaseRef));
      return item;
    }),
  );
}

function renderRibbons(ribbon, phase) {
  elements.ribbonGrid.replaceChildren(
    ...state.payload.ribbons.map((entry) =>
      createRibbonRow(entry, ribbon.streamScopeClass, phase.phaseRef, state.selectedMarkerId),
    ),
  );
}

function contractFieldList(contract) {
  const list = document.createElement("ul");
  list.className = "field-list";
  [
    ["scope", contract.stream_scope_class],
    ["epoch", String(contract.frame_epoch)],
    ["frontier", String(contract.last_published_sequence)],
    [
      "compaction floor",
      contract.compaction_floor_sequence_or_null === null ? "none" : String(contract.compaction_floor_sequence_or_null),
    ],
    ["delivery window", contract.delivery_window_state],
    ["rebase reason", contract.rebase_reason_code_or_null ?? "none"],
  ].forEach(([label, value]) => {
    const item = document.createElement("li");
    const name = document.createElement("span");
    name.textContent = label;
    const literal = document.createElement("code");
    literal.textContent = value;
    item.append(name, literal);
    list.append(item);
  });
  return list;
}

function renderInspector(ribbon, phase, marker) {
  elements.inspectorBody.replaceChildren();
  elements.inspectorTitle.textContent = `${phase.label} · ${ribbon.displayName}`;

  const intro = document.createElement("p");
  intro.className = "inspector-copy";
  intro.textContent =
    marker?.detail ??
    "Select a marker to inspect the governing recovery contract, refs, and drift posture.";
  elements.inspectorBody.append(intro);

  const metricRow = document.createElement("div");
  metricRow.className = "metric-row";
  metricRow.append(metricChip(ribbon.duplicatePolicyChip), metricChip(ribbon.exactMatchChip));
  if (state.overlayVisible) {
    metricRow.append(
      metricChip(
        ribbon.compactionFloorSequenceOrNull === null
          ? "compaction floor none"
          : `compaction floor ${ribbon.compactionFloorSequenceOrNull}`,
      ),
    );
  }
  elements.inspectorBody.append(metricRow);

  if (phase.phaseRef === "REBASE") {
    const replacementSummary = document.createElement("p");
    replacementSummary.className = "inspector-copy";
    replacementSummary.textContent = ribbon.rebasePanel.summary;

    const triggerList = document.createElement("ul");
    triggerList.className = "note-list";
    ribbon.rebasePanel.triggerCodes.forEach((entry) => {
      const item = document.createElement("li");
      item.textContent = entry;
      triggerList.append(item);
    });

    elements.inspectorBody.append(
      section("Replacement frame", [
        metricChip(`Epoch ${ribbon.rebasePanel.replacementEpoch}`, "danger"),
        metricChip(ribbon.rebasePanel.replacementSnapshotRef),
        replacementSummary,
        triggerList,
      ]),
    );
  }

  elements.inspectorBody.append(
    section("Recovery contract", [
      contractFieldList(phase.phaseRef === "REBASE" ? ribbon.replacementContract : ribbon.contract),
    ]),
  );

  if (marker) {
    const refs = document.createElement("ul");
    refs.className = "note-list";
    marker.refs.forEach((entry) => {
      const item = document.createElement("li");
      item.textContent = entry;
      refs.append(item);
    });
    elements.inspectorBody.append(section("Event refs", [refs]));
  }

  const notes = document.createElement("ul");
  notes.className = "note-list";
  ribbon.inspectorNotes.forEach((entry) => {
    const item = document.createElement("li");
    item.textContent = entry;
    notes.append(item);
  });
  elements.inspectorBody.append(section("Operator notes", [notes]));
}

function render() {
  const ribbon = activeRibbon();
  const phase = activePhase();
  syncSelectedMarker(ribbon, phase.phaseRef);
  const marker = activeMarker();

  renderHeader(ribbon, marker);
  renderPhaseRail(phase);
  renderRibbons(ribbon, phase);
  renderInspector(ribbon, phase, marker);
}

async function init() {
  setMotionPreference();
  const response = await fetch(dataPath);
  state.payload = await response.json();
  state.activeScopeClass = state.payload.selectedStreamScopeClass;
  state.activePhaseRef = state.payload.selectedPhaseRef;
  state.selectedMarkerId = state.payload.selectedMarkerId;
  elements.overlayToggle.addEventListener("click", () => {
    state.overlayVisible = !state.overlayVisible;
    render();
  });
  render();
}

init().catch((error) => {
  console.error(error);
  document.body.innerHTML = `<pre>${String(error)}</pre>`;
});
