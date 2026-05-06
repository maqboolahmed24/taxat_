const dataPath = "./data/migration-window-atlas.json";

const state = {
  payload: null,
  selectedMigrationId: null,
};

const elements = {
  basisStatement: document.querySelector("#basis-statement"),
  datastoreBadge: document.querySelector("#datastore-badge"),
  inspectorBody: document.querySelector("#inspector-body"),
  inspectorTitle: document.querySelector("#inspector-title"),
  pageSubtitle: document.querySelector("#page-subtitle"),
  pageTitle: document.querySelector("#page-title"),
  phaseColumns: document.querySelector("#phase-columns"),
  rolloutChip: document.querySelector("#rollout-chip"),
  schemaBadge: document.querySelector("#schema-badge"),
  stateList: document.querySelector("#state-list"),
  timelineCanvas: document.querySelector("#timeline-canvas"),
};

function setMotionPreference() {
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const sync = () => {
    document.documentElement.dataset.motion = motionQuery.matches ? "reduce" : "standard";
  };
  sync();
  motionQuery.addEventListener("change", sync);
}

function timelineRowById(migrationId) {
  return state.payload.timelineRows.find((row) => row.migrationId === migrationId) ?? null;
}

function activeRow() {
  state.selectedMigrationId = state.selectedMigrationId ?? state.payload.selectedMigrationId;
  return timelineRowById(state.selectedMigrationId) ?? state.payload.timelineRows[0];
}

function formatRollbackLabel(rollbackClass) {
  return rollbackClass === "FAIL_FORWARD_ONLY" ? "FAIL FORWARD ONLY" : "ROLLBACK SAFE";
}

function formatPhaseLabel(phaseState) {
  return phaseState === "CONTRACTING" ? "CONTRACTING" : phaseState;
}

function renderHeader(row) {
  elements.pageTitle.textContent = state.payload.title;
  elements.pageSubtitle.textContent = state.payload.subtitle;
  elements.schemaBadge.textContent = state.payload.currentSchemaBundleBadge;
  elements.datastoreBadge.textContent = state.payload.currentDatastoreBadge;
  elements.rolloutChip.textContent = `${formatPhaseLabel(row.phaseState)} / ${formatRollbackLabel(
    row.rollbackClass,
  )}`;
  elements.basisStatement.textContent = state.payload.basisStatement;
}

function renderPhaseColumns() {
  elements.phaseColumns.replaceChildren(
    ...state.payload.phaseColumns.map((label) => {
      const span = document.createElement("span");
      span.className = "phase-pill";
      span.textContent = label;
      return span;
    }),
  );
}

function createRailButton(entry, selectedRow) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "state-button";
  button.dataset.active = entry.label === selectedRow.phaseState ? "true" : "false";
  button.dataset.tone = entry.tone;
  button.setAttribute("aria-current", entry.label === selectedRow.phaseState ? "true" : "false");
  button.setAttribute("aria-label", `Migration rail entry ${entry.label}`);

  const label = document.createElement("strong");
  label.textContent = entry.label;
  button.append(label);

  const count = document.createElement("span");
  count.className = "state-count";
  count.textContent = String(entry.count);
  button.append(count);

  button.addEventListener("click", () => {
    const firstMatch = state.payload.timelineRows.find((row) => row.phaseState === entry.label);
    if (firstMatch) {
      state.selectedMigrationId = firstMatch.migrationId;
      render();
    }
  });

  return button;
}

function renderRail(selectedRow) {
  elements.stateList.replaceChildren(
    ...state.payload.railStates.map((entry) => {
      const item = document.createElement("li");
      item.className = "state-item";
      item.append(createRailButton(entry, selectedRow));

      const meta = document.createElement("p");
      meta.className = "rail-meta";
      meta.textContent =
        entry.label === selectedRow.phaseState
          ? "Current focus in the observatory."
          : `${entry.count} deterministic scenario row${entry.count === 1 ? "" : "s"}.`;
      item.append(meta);
      return item;
    }),
  );
}

function createPhaseCell(label, row, active) {
  const cell = document.createElement("span");
  cell.className = "timeline-row__phase";
  cell.dataset.active = active ? "true" : "false";
  cell.dataset.tone =
    row.phaseState === "FAILED"
      ? "danger"
      : row.phaseState === "HALTED"
        ? "rust"
        : row.phaseState === "CONTRACTING"
          ? "fern"
          : "slate";
  cell.textContent = label;
  return cell;
}

function createTimelineRow(row, selected) {
  const article = document.createElement("article");
  article.className = "timeline-row";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "timeline-row__button";
  button.dataset.active = selected ? "true" : "false";
  button.dataset.tone =
    row.phaseState === "FAILED"
      ? "danger"
      : row.phaseState === "HALTED"
        ? "rust"
        : row.phaseState === "CONTRACTING"
          ? "fern"
          : "slate";
  button.setAttribute("aria-label", row.accessibleLabel);

  const grid = document.createElement("div");
  grid.className = "timeline-row__grid";
  button.append(grid);

  const meta = document.createElement("div");
  meta.className = "timeline-row__meta";
  grid.append(meta);

  const title = document.createElement("strong");
  title.textContent = `${row.targetVersion} / ${row.migrationId}`;
  meta.append(title);

  const summary = document.createElement("p");
  summary.className = "timeline-summary";
  summary.textContent = row.summary;
  meta.append(summary);

  state.payload.phaseColumns.forEach((label) => {
    grid.append(createPhaseCell(label, row, row.phaseColumn === label));
  });

  button.addEventListener("click", () => {
    state.selectedMigrationId = row.migrationId;
    render();
  });
  article.append(button);

  const band = document.createElement("div");
  band.className = "compatibility-band";
  band.setAttribute("role", "group");
  band.setAttribute("aria-label", `Compatibility band for ${row.accessibleLabel}`);
  band.textContent = row.compatibilityBandLabel;
  article.append(band);

  return article;
}

function renderTimeline(selectedRow) {
  elements.timelineCanvas.replaceChildren(
    ...state.payload.timelineRows.map((row) =>
      createTimelineRow(row, row.migrationId === selectedRow.migrationId),
    ),
  );
}

function detailRow(label, value) {
  const wrapper = document.createElement("div");
  wrapper.className = "detail-grid__row";

  const heading = document.createElement("strong");
  heading.textContent = label;
  wrapper.append(heading);

  const token = document.createElement("span");
  token.className = "detail-token mono";
  token.textContent = value;
  wrapper.append(token);

  return wrapper;
}

function renderInspector(row) {
  elements.inspectorTitle.textContent = row.migrationId;
  elements.inspectorBody.replaceChildren();

  const copy = document.createElement("p");
  copy.className = "inspector-copy";
  copy.textContent = row.summary;
  elements.inspectorBody.append(copy);

  const details = document.createElement("div");
  details.className = "detail-grid";
  details.append(detailRow("Target version", row.targetVersion));
  details.append(detailRow("Schema bundle hash", row.schemaBundleHash));
  details.append(detailRow("Lock posture", row.lockPosture));
  details.append(detailRow("Rollback class", row.rollbackClass));
  details.append(detailRow("Reader window", row.readerWindowState));
  details.append(detailRow("Backfill", row.backfillSummary));
  elements.inspectorBody.append(details);

  const evidenceHeading = document.createElement("strong");
  evidenceHeading.textContent = "Evidence refs";
  elements.inspectorBody.append(evidenceHeading);

  const evidenceList = document.createElement("ul");
  evidenceList.className = "detail-list";
  row.evidenceRefs.forEach((entry) => {
    const item = document.createElement("li");
    item.textContent = entry;
    evidenceList.append(item);
  });
  elements.inspectorBody.append(evidenceList);
}

function render() {
  const row = activeRow();
  renderHeader(row);
  renderPhaseColumns();
  renderRail(row);
  renderTimeline(row);
  renderInspector(row);
}

async function main() {
  setMotionPreference();
  const response = await fetch(dataPath);
  if (!response.ok) {
    throw new Error(`Unable to load migration atlas payload: ${response.status}`);
  }
  state.payload = await response.json();
  render();
}

main().catch((error) => {
  document.body.innerHTML = `<pre>${error instanceof Error ? error.message : String(error)}</pre>`;
});
