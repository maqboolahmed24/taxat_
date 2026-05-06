const dataPath = "./data/event-envelope-atlas.json";

const state = {
  activeFamilyRef: null,
  activeLaneRef: null,
  payload: null,
};

const elements = {
  activeFamilyChip: document.querySelector("#active-family-chip"),
  activeLaneChip: document.querySelector("#active-lane-chip"),
  basisStatement: document.querySelector("#basis-statement"),
  drawerBody: document.querySelector("#drawer-body"),
  drawerTitle: document.querySelector("#drawer-title"),
  envelopeBadge: document.querySelector("#envelope-badge"),
  familyList: document.querySelector("#family-list"),
  laneAxis: document.querySelector("#lane-axis"),
  laneGrid: document.querySelector("#lane-grid"),
  pageSubtitle: document.querySelector("#page-subtitle"),
  pageTitle: document.querySelector("#page-title"),
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
  return state.payload.families.find((family) => family.familyRef === familyRef) ?? null;
}

function activeFamily() {
  state.activeFamilyRef = state.activeFamilyRef ?? state.payload.selectedFamilyRef;
  return familyByRef(state.activeFamilyRef) ?? state.payload.families[0];
}

function activeLane(family) {
  state.activeLaneRef = state.activeLaneRef ?? state.payload.selectedLaneRef;
  return (
    family.laneCards.find((lane) => lane.lane_ref === state.activeLaneRef) ?? family.laneCards[0]
  );
}

function createFamilyButton(family, active) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "family-button";
  button.dataset.active = active ? "true" : "false";
  button.dataset.tone = family.tone;
  button.setAttribute("aria-current", active ? "true" : "false");
  button.setAttribute("aria-label", `Message family rail entry ${family.railLabel}`);

  const code = document.createElement("span");
  code.className = "family-button__code";
  code.textContent = family.railLabel;
  button.append(code);

  const label = document.createElement("span");
  label.textContent = family.displayName;
  button.append(label);

  button.addEventListener("click", () => {
    state.activeFamilyRef = family.familyRef;
    state.activeLaneRef = state.payload.selectedLaneRef;
    render();
  });

  return button;
}

function renderHeader(family, lane) {
  elements.pageTitle.textContent = state.payload.title;
  elements.pageSubtitle.textContent = state.payload.subtitle;
  elements.envelopeBadge.textContent = state.payload.envelopeBadge;
  elements.activeFamilyChip.textContent = family.railLabel;
  elements.activeLaneChip.textContent = lane.overline;
  elements.basisStatement.textContent = state.payload.basisStatement;
}

function renderLaneAxis() {
  elements.laneAxis.replaceChildren(
    ...state.payload.lanes.map((lane) => {
      const chip = document.createElement("span");
      chip.className = "axis-chip";
      chip.textContent = lane.label;
      return chip;
    }),
  );
}

function renderFamilyRail(family) {
  elements.familyList.replaceChildren(
    ...state.payload.families.map((entry) => {
      const item = document.createElement("li");
      item.className = "family-item";
      item.append(createFamilyButton(entry, entry.familyRef === family.familyRef));

      const summary = document.createElement("p");
      summary.className = "family-summary";
      summary.textContent = entry.truthAnchor;
      item.append(summary);
      return item;
    }),
  );
}

function createLaneButton(family, lane, active) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "lane-card";
  button.dataset.active = active ? "true" : "false";
  button.dataset.tone = family.tone;
  button.setAttribute("aria-label", lane.accessible_label);

  const overline = document.createElement("span");
  overline.className = "lane-card__eyebrow";
  overline.textContent = lane.overline;
  button.append(overline);

  const title = document.createElement("strong");
  title.textContent = lane.label;
  button.append(title);

  const summary = document.createElement("p");
  summary.className = "lane-card__summary";
  summary.textContent = lane.summary;
  button.append(summary);

  button.addEventListener("click", () => {
    state.activeLaneRef = lane.lane_ref;
    render();
  });

  return button;
}

function renderLanes(family, lane) {
  elements.laneGrid.replaceChildren(
    ...family.laneCards.map((entry) => createLaneButton(family, entry, entry.lane_ref === lane.lane_ref)),
  );
}

function metricToken(text) {
  const token = document.createElement("span");
  token.className = "metric-token";
  token.textContent = text;
  return token;
}

function sectionHeading(label) {
  const heading = document.createElement("h3");
  heading.textContent = label;
  return heading;
}

function renderInspector(family, lane) {
  elements.drawerTitle.textContent = lane.label;
  elements.drawerBody.replaceChildren();

  const intro = document.createElement("p");
  intro.className = "drawer-copy";
  intro.textContent = `${family.truthAnchor}. ${lane.summary}`;
  elements.drawerBody.append(intro);

  const metrics = document.createElement("div");
  metrics.className = "metric-row";
  metrics.append(metricToken(family.duplicateScopeRef), metricToken(family.retrySummary));
  elements.drawerBody.append(metrics);

  const redaction = document.createElement("p");
  redaction.className = "drawer-copy";
  redaction.textContent = family.redactionSummary;
  elements.drawerBody.append(redaction);

  const identityCard = document.createElement("section");
  identityCard.className = "identity-card";
  identityCard.setAttribute("role", "group");
  identityCard.setAttribute("aria-label", `Example identity ${family.railLabel}`);

  const identityHeading = document.createElement("p");
  identityHeading.className = "identity-card__heading";
  identityHeading.textContent = family.exampleIdentity.note;
  identityCard.append(identityHeading);

  const identityGrid = document.createElement("dl");
  identityGrid.className = "identity-grid";
  [
    ["packet_id", family.exampleIdentity.packet_id],
    ["source_record_ref", family.exampleIdentity.source_record_ref],
    ["duplicate_meaning_key", family.exampleIdentity.duplicate_meaning_key],
    ["request_hash", family.exampleIdentity.request_hash],
    ["idempotency_key", family.exampleIdentity.idempotency_key],
  ].forEach(([label, value]) => {
    const wrapper = document.createElement("div");
    const term = document.createElement("dt");
    term.textContent = label;
    wrapper.append(term);
    const description = document.createElement("dd");
    description.textContent = value;
    wrapper.append(description);
    identityGrid.append(wrapper);
  });
  identityCard.append(identityGrid);
  elements.drawerBody.append(identityCard);

  elements.drawerBody.append(sectionHeading("Alerts"));
  const alerts = document.createElement("ul");
  alerts.className = "alert-list";
  family.alerts.forEach((alert) => {
    const item = document.createElement("li");
    item.className = "alert-row";
    const strong = document.createElement("strong");
    strong.textContent = alert.label;
    item.append(strong);
    const copy = document.createElement("p");
    copy.textContent = alert.text;
    item.append(copy);
    alerts.append(item);
  });
  elements.drawerBody.append(alerts);

  elements.drawerBody.append(sectionHeading("Notes"));
  const notes = document.createElement("ul");
  notes.className = "note-list";
  family.notes.forEach((entry) => {
    const item = document.createElement("li");
    item.textContent = entry;
    notes.append(item);
  });
  elements.drawerBody.append(notes);
}

function render() {
  const family = activeFamily();
  const lane = activeLane(family);
  renderHeader(family, lane);
  renderLaneAxis();
  renderFamilyRail(family);
  renderLanes(family, lane);
  renderInspector(family, lane);
}

async function main() {
  setMotionPreference();
  const response = await fetch(dataPath);
  state.payload = await response.json();
  render();
}

main().catch((error) => {
  elements.drawerTitle.textContent = "Failed to load atlas";
  elements.drawerBody.textContent = error instanceof Error ? error.message : String(error);
});
