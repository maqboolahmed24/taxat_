const dataPath = "./data/schema-compatibility-atlas.json";

const state = {
  payload: null,
  selectedGroupRef: null,
  selectedPhaseRef: null,
  selectedDeltaRef: null,
};

const elements = {
  basisStatement: document.querySelector("#basis-statement"),
  baselineHashBadge: document.querySelector("#baseline-hash-badge"),
  candidateHashBadge: document.querySelector("#candidate-hash-badge"),
  canvasSummary: document.querySelector("#canvas-summary"),
  chronologyBand: document.querySelector("#chronology-band"),
  dataModeChip: document.querySelector("#data-mode-chip"),
  diffCardGrid: document.querySelector("#diff-card-grid"),
  groupList: document.querySelector("#group-list"),
  inspectorBody: document.querySelector("#inspector-body"),
  inspectorTitle: document.querySelector("#inspector-title"),
  pageSubtitle: document.querySelector("#page-subtitle"),
  pageTitle: document.querySelector("#page-title"),
  phaseRow: document.querySelector("#phase-row"),
  readerWindowChip: document.querySelector("#reader-window-chip"),
  verdictChip: document.querySelector("#verdict-chip"),
};

function setMotionPreference() {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  const sync = () => {
    document.documentElement.dataset.motion = media.matches ? "reduce" : "standard";
  };
  sync();
  media.addEventListener("change", sync);
}

function verdictTone(verdictRef) {
  if (verdictRef === "ROLLBACK SAFE") {
    return "success";
  }
  if (verdictRef === "FAIL FORWARD ONLY") {
    return "warning";
  }
  return "danger";
}

function filteredCards() {
  const cards = state.payload.diffCards.filter(
    (card) =>
      card.groupRef === state.selectedGroupRef && card.phaseRef === state.selectedPhaseRef,
  );
  if (cards.length > 0) {
    return cards;
  }

  const groupOnly = state.payload.diffCards.filter(
    (card) => card.groupRef === state.selectedGroupRef,
  );
  if (groupOnly.length > 0) {
    return groupOnly;
  }

  return state.payload.diffCards;
}

function activeCard() {
  const cards = filteredCards();
  const selected =
    cards.find((card) => card.deltaRef === state.selectedDeltaRef) ?? cards[0] ?? null;
  state.selectedDeltaRef = selected?.deltaRef ?? null;
  return selected;
}

function detailRow(label, value, mono = false) {
  const row = document.createElement("div");
  row.className = "detail-row";

  const heading = document.createElement("strong");
  heading.textContent = label;
  row.append(heading);

  const body = document.createElement("span");
  if (mono) {
    body.className = "mono";
  }
  body.textContent = value;
  row.append(body);

  return row;
}

function renderHeader() {
  elements.pageTitle.textContent = state.payload.title;
  elements.pageSubtitle.textContent = state.payload.subtitle;
  elements.basisStatement.textContent = state.payload.basisStatement;
  elements.candidateHashBadge.textContent = `Candidate ${state.payload.candidateHashBadge}`;
  elements.baselineHashBadge.textContent = `Baseline ${state.payload.baselineHashBadge}`;
  elements.readerWindowChip.textContent = state.payload.readerWindowChip;
  elements.dataModeChip.textContent = state.payload.dataMode.replaceAll("_", " ");
  elements.verdictChip.textContent = state.payload.currentVerdictChip;
  elements.verdictChip.dataset.tone = verdictTone(state.payload.currentVerdictChip);
}

function renderGroups() {
  elements.groupList.replaceChildren(
    ...state.payload.severityGroups.map((group) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "group-button";
      button.dataset.active = String(group.groupRef === state.selectedGroupRef);
      button.dataset.tone = group.tone;
      button.setAttribute(
        "aria-label",
        `Filter ${group.label.toLowerCase()} drift cards`,
      );
      button.setAttribute(
        "aria-pressed",
        String(group.groupRef === state.selectedGroupRef),
      );

      const row = document.createElement("div");
      row.className = "group-button__row";
      button.append(row);

      const label = document.createElement("strong");
      label.textContent = group.label;
      row.append(label);

      const count = document.createElement("span");
      count.className = "group-button__count";
      count.textContent = `${group.count}`;
      row.append(count);

      const summary = document.createElement("p");
      summary.className = "group-button__summary";
      summary.textContent = group.summary;
      button.append(summary);

      button.addEventListener("click", () => {
        state.selectedGroupRef = group.groupRef;
        state.selectedDeltaRef = null;
        render();
      });

      return button;
    }),
  );
}

function renderPhases() {
  elements.phaseRow.replaceChildren(
    ...state.payload.chronologyPhases.map((phase) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "phase-button";
      button.dataset.active = String(phase.phaseRef === state.selectedPhaseRef);
      button.setAttribute("aria-label", phase.accessibleLabel);
      button.setAttribute("aria-pressed", String(phase.phaseRef === state.selectedPhaseRef));

      const heading = document.createElement("strong");
      heading.textContent = phase.label;
      button.append(heading);

      const summary = document.createElement("p");
      summary.className = "phase-button__summary";
      summary.textContent = phase.summary;
      button.append(summary);

      button.addEventListener("click", () => {
        state.selectedPhaseRef = phase.phaseRef;
        state.selectedDeltaRef = null;
        render();
      });

      return button;
    }),
  );

  elements.chronologyBand.replaceChildren(
    ...state.payload.chronologyPhases.map((phase) => {
      const segment = document.createElement("div");
      segment.className = "chronology-band__segment";
      segment.dataset.active = String(phase.phaseRef === state.selectedPhaseRef);
      segment.setAttribute("role", "group");
      segment.setAttribute("aria-label", phase.accessibleLabel);

      const label = document.createElement("span");
      label.className = "chronology-band__label";
      label.textContent = phase.label;
      segment.append(label);

      return segment;
    }),
  );
}

function createDiffCard(card, active) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "diff-card";
  button.dataset.active = String(active);
  button.dataset.tone = card.tone;
  button.setAttribute("aria-label", card.accessibleLabel);

  const meta = document.createElement("div");
  meta.className = "diff-card__meta";
  button.append(meta);

  const path = document.createElement("span");
  path.className = "diff-card__path";
  path.textContent = card.schemaPath;
  meta.append(path);

  const impact = document.createElement("span");
  impact.className = "diff-card__impact";
  impact.textContent = card.readinessImpact.replaceAll("_", " ");
  meta.append(impact);

  const summary = document.createElement("p");
  summary.className = "diff-card__summary";
  summary.textContent = card.summary;
  button.append(summary);

  const tokens = document.createElement("div");
  tokens.className = "token-row";
  [...card.reasonCodes.slice(0, 3), card.rollbackBoundary].forEach((entry) => {
    const token = document.createElement("span");
    token.className = "token";
    token.textContent = entry.replaceAll("_", " ");
    tokens.append(token);
  });
  button.append(tokens);

  const select = () => {
    state.selectedDeltaRef = card.deltaRef;
    renderInspector(card);
    renderCards();
  };

  button.addEventListener("click", select);
  button.addEventListener("focus", () => renderInspector(card));
  button.addEventListener("mouseenter", () => renderInspector(card));

  return button;
}

function renderCards() {
  const cards = filteredCards();
  const currentCard = activeCard();

  elements.canvasSummary.textContent =
    cards.length === state.payload.diffCards.length
      ? "Showing the full admissibility deck for the current compatibility posture."
      : `Showing ${cards.length} deterministic card${cards.length === 1 ? "" : "s"} for the selected severity and chronology filter.`;

  elements.diffCardGrid.replaceChildren(...cards.map((card) => createDiffCard(card, currentCard?.deltaRef === card.deltaRef)));
}

function renderInspector(card = activeCard()) {
  if (!card) {
    elements.inspectorTitle.textContent = "No matching delta";
    elements.inspectorBody.replaceChildren();
    return;
  }

  elements.inspectorTitle.textContent = card.summary;
  elements.inspectorBody.replaceChildren();

  const copy = document.createElement("p");
  copy.className = "inspector-copy";
  copy.textContent = card.inspectorBody;
  elements.inspectorBody.append(copy);

  const detailGrid = document.createElement("div");
  detailGrid.className = "inspector-list";
  detailGrid.append(detailRow("Schema path", card.schemaPath, true));
  detailGrid.append(detailRow("Phase", card.phaseRef));
  detailGrid.append(detailRow("Group", card.groupRef));
  detailGrid.append(detailRow("Readiness", card.readinessImpact.replaceAll("_", " ")));
  detailGrid.append(detailRow("Rollback boundary", card.rollbackBoundary.replaceAll("_", " ")));
  elements.inspectorBody.append(detailGrid);

  const reasonSection = document.createElement("section");
  reasonSection.className = "reason-section";
  const reasonHeading = document.createElement("strong");
  reasonHeading.textContent = "Reason codes";
  reasonSection.append(reasonHeading);
  const reasonList = document.createElement("ul");
  reasonList.className = "reason-list";
  card.reasonCodes.forEach((reasonCode) => {
    const item = document.createElement("li");
    const token = document.createElement("span");
    token.className = "mono";
    token.textContent = reasonCode;
    item.append(token);
    reasonList.append(item);
  });
  reasonSection.append(reasonList);
  elements.inspectorBody.append(reasonSection);

  const artifactSection = document.createElement("section");
  artifactSection.className = "artifact-section";
  const artifactHeading = document.createElement("strong");
  artifactHeading.textContent = "Required artifacts";
  artifactSection.append(artifactHeading);
  const artifactList = document.createElement("ul");
  artifactList.className = "artifact-list";
  card.requiredArtifactRefs.forEach((artifactRef) => {
    const item = document.createElement("li");
    const token = document.createElement("span");
    token.className = "mono";
    token.textContent = artifactRef;
    item.append(token);
    artifactList.append(item);
  });
  artifactSection.append(artifactList);
  elements.inspectorBody.append(artifactSection);
}

function render() {
  renderHeader();
  renderGroups();
  renderPhases();
  renderCards();
  renderInspector();
}

async function main() {
  setMotionPreference();
  const response = await fetch(dataPath);
  if (!response.ok) {
    throw new Error(`Unable to load schema compatibility atlas payload: ${response.status}`);
  }

  state.payload = await response.json();
  state.selectedGroupRef = state.payload.selectedGroupRef;
  state.selectedPhaseRef = state.payload.selectedPhaseRef;
  state.selectedDeltaRef = state.payload.selectedDeltaRef;
  render();
}

main().catch((error) => {
  document.body.innerHTML = `<pre>${error instanceof Error ? error.message : String(error)}</pre>`;
  console.error(error);
});
