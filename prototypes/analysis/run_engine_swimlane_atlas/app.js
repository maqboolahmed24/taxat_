const atlasRoot = document.querySelector("[data-testid='run-engine-atlas']");
const summaryGrid = document.getElementById("summary-grid");
const phaseRail = document.querySelector("[data-testid='phase-rail']");
const laneHeaderRow = document.getElementById("lane-header-row");
const laneRowStack = document.getElementById("lane-row-stack");
const detailPanel = document.querySelector("[data-testid='selected-phase-detail']");

const laneIndex = new Map();
const state = {
  data: null,
  selectedPhaseId: null,
};

function padPhase(value) {
  return String(value).padStart(2, "0");
}

function laneTitle(lane) {
  return lane.replaceAll("_", " ");
}

function itemKindLabel(kind) {
  return kind || "module";
}

function setMotionMode() {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.dataset.motion = reduced ? "reduce" : "standard";
}

function createChip(label, className, testId) {
  const span = document.createElement("span");
  span.className = `chip ${className}`.trim();
  span.textContent = label;
  if (testId) {
    span.dataset.testid = testId;
  }
  return span;
}

function renderSummaryCards(summary) {
  const template = document.getElementById("summary-card-template");
  const rows = [
    ["Phases", summary.phase_count || 18],
    ["Logical steps", summary.step_count],
    ["Audit events", summary.event_count],
    ["Artifact writes", summary.artifact_write_count],
  ];
  summaryGrid.replaceChildren();
  rows.forEach(([label, value]) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.querySelector(".summary-label").textContent = label;
    node.querySelector(".summary-value").textContent = value;
    summaryGrid.append(node);
  });
}

function renderLaneHeaders(lanes) {
  laneHeaderRow.replaceChildren();
  lanes.forEach((lane, index) => {
    laneIndex.set(lane, index + 1);
    const header = document.createElement("div");
    header.className = "lane-header";
    header.dataset.testid = `lane-${lane}`;
    header.textContent = laneTitle(lane);
    laneHeaderRow.append(header);
  });
}

function selectPhase(phaseId, options = {}) {
  state.selectedPhaseId = phaseId;
  [...phaseRail.querySelectorAll(".phase-button")].forEach((button) => {
    const selected = button.dataset.phaseId === phaseId;
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
  [...laneRowStack.querySelectorAll(".phase-band")].forEach((row) => {
    row.dataset.selected = String(row.dataset.phaseId === phaseId);
  });
  if (!options.skipHash) {
    window.history.replaceState({}, "", `#${phaseId}`);
  }
  renderInspector(phaseId);
}

function branchCountLabel(phase) {
  const count = phase.branch_rows.length;
  return count ? `${count} branch${count === 1 ? "" : "es"}` : "linear";
}

function renderPhaseRail(phases) {
  phaseRail.replaceChildren();
  phases.forEach((phase) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "phase-button";
    button.dataset.phaseId = phase.phase_id;
    button.dataset.phaseNumber = String(phase.ordered_index);
    button.dataset.testid = `phase-row-${padPhase(phase.ordered_index)}`;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", "false");
    button.tabIndex = -1;

    const top = document.createElement("div");
    top.className = "phase-topline";
    const code = document.createElement("span");
    code.className = "phase-code";
    code.textContent = phase.phase_id;
    const count = document.createElement("span");
    count.className = "phase-code";
    count.textContent = branchCountLabel(phase);
    top.append(code, count);

    const name = document.createElement("div");
    name.className = "phase-name";
    name.textContent = phase.phase_name;

    const chips = document.createElement("div");
    chips.className = "phase-chip-row";
    phase.branch_tags.slice(0, 2).forEach((tag) => {
      chips.append(createChip(tag, "chip-branch", "branch-chip"));
    });
    (phase.return_paths || []).slice(0, 1).forEach((path) => {
      chips.append(createChip(path, "chip-return"));
    });

    button.append(top, name, chips);
    button.addEventListener("click", () => selectPhase(phase.phase_id));
    button.addEventListener("keydown", (event) => handlePhaseRailKeydown(event, phases));
    phaseRail.append(button);
  });
}

function handlePhaseRailKeydown(event, phases) {
  const buttons = [...phaseRail.querySelectorAll(".phase-button")];
  const currentIndex = buttons.findIndex((button) => button.dataset.phaseId === state.selectedPhaseId);
  if (currentIndex === -1) {
    return;
  }
  let targetIndex = null;
  if (event.key === "ArrowDown") {
    targetIndex = Math.min(currentIndex + 1, buttons.length - 1);
  } else if (event.key === "ArrowUp") {
    targetIndex = Math.max(currentIndex - 1, 0);
  } else if (event.key === "Home") {
    targetIndex = 0;
  } else if (event.key === "End") {
    targetIndex = buttons.length - 1;
  }
  if (targetIndex === null) {
    return;
  }
  event.preventDefault();
  const phase = phases[targetIndex];
  selectPhase(phase.phase_id);
  buttons[targetIndex].focus();
}

function kindTestId(kind) {
  if (kind === "branch") return "branch-chip";
  if (kind === "gate") return "gate-node";
  if (kind === "artifact") return "artifact-capsule";
  if (kind === "event") return "event-pin";
  return null;
}

function buildLaneItem(item) {
  const node = document.createElement("div");
  const kind = itemKindLabel(item.kind);
  node.className = `lane-item kind-${kind}`;
  const testId = kindTestId(kind);
  if (testId) {
    node.dataset.testid = testId;
  }
  node.textContent = item.label;
  return node;
}

function renderTransactionLayer(row, phase) {
  const layer = document.createElement("div");
  layer.className = "transaction-layer";
  phase.transaction_spans.forEach((span) => {
    const node = document.createElement("div");
    node.className = "transaction-span";
    node.dataset.testid = "transaction-span";
    node.textContent = span.label;
    const start = laneIndex.get(span.lane_start);
    const end = laneIndex.get(span.lane_end);
    node.style.gridColumn = `${start} / ${end + 1}`;
    layer.append(node);
  });
  row.append(layer);
}

function renderLaneCanvas(phases, lanes) {
  laneRowStack.replaceChildren();
  phases.forEach((phase) => {
    const band = document.createElement("section");
    band.className = "phase-band";
    band.dataset.phaseId = phase.phase_id;
    band.dataset.selected = "false";

    const row = document.createElement("div");
    row.className = "lane-phase-row";
    if (phase.transaction_spans.length) {
      renderTransactionLayer(band, phase);
    }

    lanes.forEach((lane) => {
      const cell = document.createElement("article");
      cell.className = "lane-cell";

      const caption = document.createElement("div");
      caption.className = "lane-caption";
      const heading = document.createElement("h3");
      heading.textContent = laneTitle(lane);
      const count = document.createElement("span");
      count.className = "phase-code";
      count.textContent = `${(phase.lane_highlights[lane] || []).length} items`;
      caption.append(heading, count);

      const list = document.createElement("div");
      list.className = "lane-item-list";

      const items = phase.lane_highlights[lane] || [];
      if (items.length === 0) {
        const empty = document.createElement("div");
        empty.className = "lane-empty";
        empty.textContent = "No dominant phase-local item.";
        list.append(empty);
      } else {
        items.forEach((item) => list.append(buildLaneItem(item)));
      }

      cell.append(caption, list);
      row.append(cell);
    });

    band.append(row);
    laneRowStack.append(band);
  });
}

function buildDetailList(items) {
  const list = document.createElement("ul");
  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    list.append(li);
  });
  return list;
}

function renderInspector(phaseId) {
  const phase = state.data.phases.find((item) => item.phase_id === phaseId);
  if (!phase) {
    return;
  }
  const shell = document.createElement("div");
  shell.className = "detail-shell";

  const heading = document.createElement("section");
  heading.className = "detail-heading";
  const code = document.createElement("p");
  code.className = "phase-code-large";
  code.textContent = `${phase.phase_id} · phase ${phase.ordered_index}`;
  const title = document.createElement("h2");
  title.textContent = phase.phase_name;
  const meta = document.createElement("p");
  meta.className = "detail-meta mono";
  meta.textContent = phase.source_heading_or_logical_block;
  heading.append(code, title, meta);

  const laneCard = document.createElement("section");
  laneCard.className = "detail-card";
  laneCard.innerHTML = "<h3>Lane focus and decisive branches</h3>";
  const laneRow = document.createElement("div");
  laneRow.className = "detail-chip-row";
  phase.lane_focus.forEach((lane) => laneRow.append(createChip(laneTitle(lane), "")));
  phase.branch_tags.forEach((tag) => laneRow.append(createChip(tag, "chip-branch", "branch-chip")));
  laneCard.append(laneRow);

  const conditionsCard = document.createElement("section");
  conditionsCard.className = "detail-card";
  conditionsCard.innerHTML = "<h3>Entry and exit contract</h3>";
  conditionsCard.append(buildDetailList([...phase.entry_conditions, ...phase.exit_conditions]));

  const moduleCard = document.createElement("section");
  moduleCard.className = "detail-card";
  moduleCard.innerHTML = "<h3>Modules, artifacts, and failures</h3>";
  const moduleList = document.createElement("ul");
  [
    `Modules: ${phase.called_modules.slice(0, 8).join(", ") || "n/a"}`,
    `Artifacts: ${phase.artifact_writes.join(", ") || "n/a"}`,
    `Return paths: ${(phase.return_paths || []).join(", ") || "nonterminal"}`,
    `Failure exits: ${phase.failure_exit_paths.join(" | ")}`,
  ].forEach((text) => {
    const li = document.createElement("li");
    li.textContent = text;
    moduleList.append(li);
  });
  moduleCard.append(moduleList);

  const experienceCard = document.createElement("section");
  experienceCard.className = "detail-card";
  experienceCard.innerHTML = "<h3>Live experience surfaces</h3>";
  const surfaceList = document.createElement("ul");
  surfaceList.className = "detail-surface-list";
  surfaceList.dataset.testid = "experience-update-list";
  const surfaces = phase.live_experience.surface_modules.length
    ? phase.live_experience.surface_modules
    : phase.live_experience.composite_shell_surfaces;
  surfaces.forEach((surface) => {
    const item = document.createElement("li");
    item.className = "detail-surface";
    item.innerHTML = `<strong>${surface}</strong><span>${phase.live_experience.posture_states.join(", ") || "steady posture"}</span>`;
    surfaceList.append(item);
  });
  experienceCard.append(surfaceList);

  const refsCard = document.createElement("section");
  refsCard.className = "detail-card";
  refsCard.innerHTML = "<h3>Supporting source refs</h3>";
  const refs = document.createElement("div");
  refs.className = "detail-link-list";
  phase.supporting_source_refs.forEach((ref) => {
    const anchor = document.createElement("a");
    anchor.href = "#";
    anchor.textContent = ref;
    anchor.title = ref;
    refs.append(anchor);
  });
  refsCard.append(refs);

  shell.append(heading, laneCard, conditionsCard, moduleCard, experienceCard, refsCard);
  detailPanel.replaceChildren(shell);
}

async function loadData() {
  const response = await fetch("./atlas_data.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Unable to load atlas data: ${response.status}`);
  }
  return response.json();
}

function initialPhaseId(phases) {
  const hash = window.location.hash.replace("#", "");
  return phases.some((phase) => phase.phase_id === hash) ? hash : phases[0].phase_id;
}

async function main() {
  setMotionMode();
  const data = await loadData();
  state.data = data;

  renderSummaryCards({
    ...data.summary,
    phase_count: data.phase_count,
  });
  renderLaneHeaders(data.lane_taxonomy);
  renderPhaseRail(data.phases);
  renderLaneCanvas(data.phases, data.lane_taxonomy);
  selectPhase(initialPhaseId(data.phases), { skipHash: false });
}

main().catch((error) => {
  detailPanel.innerHTML = `
    <div class="detail-empty">
      <p class="panel-eyebrow">Inspector</p>
      <h2>Atlas failed to load</h2>
      <p class="hero-text">${error.message}</p>
    </div>
  `;
  atlasRoot.dataset.error = "true";
});
