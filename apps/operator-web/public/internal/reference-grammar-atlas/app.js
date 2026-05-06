const dataPath = "./data/reference-grammar-atlas.json";

const state = {
  activeFamilyRef: null,
  payload: null,
};

const elements = {
  activeFamilyChip: document.querySelector("#active-family-chip"),
  axisHorizontal: document.querySelector("#axis-horizontal"),
  axisVertical: document.querySelector("#axis-vertical"),
  basisStatement: document.querySelector("#basis-statement"),
  familyList: document.querySelector("#family-list"),
  grammarBadge: document.querySelector("#grammar-badge"),
  inspectorBody: document.querySelector("#inspector-body"),
  inspectorTitle: document.querySelector("#inspector-title"),
  latticeGrid: document.querySelector("#lattice-grid"),
  pageSubtitle: document.querySelector("#page-subtitle"),
  pageTitle: document.querySelector("#page-title"),
  transitionList: document.querySelector("#transition-list"),
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
  return state.payload.families.find((family) => family.family_ref === familyRef) ?? null;
}

function activeFamily() {
  state.activeFamilyRef = state.activeFamilyRef ?? state.payload.selectedFamilyRef;
  return familyByRef(state.activeFamilyRef) ?? state.payload.families[0];
}

function createRailButton(family, active) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "rail-button";
  button.dataset.active = active ? "true" : "false";
  button.dataset.tone = family.tone;
  button.setAttribute("aria-current", active ? "true" : "false");
  button.setAttribute("aria-label", `Reference family rail entry ${family.rail_label}`);

  const code = document.createElement("span");
  code.className = "rail-button__code";
  code.textContent = family.rail_label;
  button.append(code);

  const label = document.createElement("span");
  label.className = "rail-button__label";
  label.textContent = family.display_name;
  button.append(label);

  button.addEventListener("click", () => {
    state.activeFamilyRef = family.family_ref;
    render();
  });

  return button;
}

function renderHeader(family) {
  elements.pageTitle.textContent = state.payload.title;
  elements.pageSubtitle.textContent = state.payload.subtitle;
  elements.grammarBadge.textContent = state.payload.grammarBadge;
  elements.activeFamilyChip.textContent = family.rail_label;
  elements.basisStatement.textContent = state.payload.basisStatement;
}

function renderAxes() {
  elements.axisHorizontal.replaceChildren(
    ...state.payload.axes.horizontal.map((label) => {
      const span = document.createElement("span");
      span.className = "axis-chip axis-chip--horizontal";
      span.textContent = label;
      return span;
    }),
  );

  elements.axisVertical.replaceChildren(
    ...state.payload.axes.vertical.map((label) => {
      const span = document.createElement("span");
      span.className = "axis-chip axis-chip--vertical";
      span.textContent = label;
      return span;
    }),
  );
}

function renderFamilyRail(family) {
  elements.familyList.replaceChildren(
    ...state.payload.families.map((entry) => {
      const item = document.createElement("li");
      item.className = "family-rail__item";
      item.append(createRailButton(entry, entry.family_ref === family.family_ref));

      const summary = document.createElement("p");
      summary.className = "family-summary";
      summary.textContent = entry.semantic_role;
      item.append(summary);
      return item;
    }),
  );
}

function createLatticeNode(family, active) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "lattice-node";
  button.dataset.active = active ? "true" : "false";
  button.dataset.tone = family.tone;
  button.style.gridColumn = String(family.lattice_column);
  button.style.gridRow = String(family.lattice_row);
  button.setAttribute(
    "aria-label",
    `Reference lattice node ${family.rail_label} ${family.display_name}`,
  );

  const overline = document.createElement("span");
  overline.className = "lattice-node__code";
  overline.textContent = family.rail_label;
  button.append(overline);

  const title = document.createElement("strong");
  title.textContent = family.display_name;
  button.append(title);

  const meta = document.createElement("span");
  meta.className = "lattice-node__meta";
  meta.textContent = `${family.durability_posture} / ${family.exposure_posture}`;
  button.append(meta);

  button.addEventListener("click", () => {
    state.activeFamilyRef = family.family_ref;
    render();
  });

  return button;
}

function renderLattice(family) {
  elements.latticeGrid.replaceChildren(
    ...state.payload.families.map((entry) =>
      createLatticeNode(entry, entry.family_ref === family.family_ref),
    ),
  );
}

function renderTransitions(family) {
  elements.transitionList.replaceChildren(
    ...family.invalid_substitutions.map((rule) => {
      const item = document.createElement("li");
      item.className = "transition-row";
      item.dataset.tone = family.tone;
      item.setAttribute("aria-label", rule.accessible_label);

      const statement = document.createElement("strong");
      statement.textContent = rule.statement;
      item.append(statement);

      const note = document.createElement("p");
      note.textContent = rule.note;
      item.append(note);
      return item;
    }),
  );
}

function sectionHeading(label) {
  const heading = document.createElement("h3");
  heading.className = "inspector-heading";
  heading.textContent = label;
  return heading;
}

function token(text) {
  const code = document.createElement("code");
  code.className = "mono-token";
  code.textContent = text;
  return code;
}

function renderInspector(family) {
  elements.inspectorTitle.textContent = family.rail_label;
  elements.inspectorBody.replaceChildren();

  const summary = document.createElement("p");
  summary.className = "inspector-summary";
  summary.textContent = family.semantic_role;
  elements.inspectorBody.append(summary);

  const posture = document.createElement("div");
  posture.className = "posture-grid";
  posture.append(token(family.durability_posture), token(family.exposure_posture));
  elements.inspectorBody.append(posture);

  elements.inspectorBody.append(sectionHeading("Allowed Producers"));
  const producers = document.createElement("ul");
  producers.className = "plain-list";
  family.allowed_producers.forEach((entry) => {
    const item = document.createElement("li");
    item.textContent = entry;
    producers.append(item);
  });
  elements.inspectorBody.append(producers);

  elements.inspectorBody.append(sectionHeading("Allowed Consumers"));
  const consumers = document.createElement("ul");
  consumers.className = "plain-list";
  family.allowed_consumers.forEach((entry) => {
    const item = document.createElement("li");
    item.textContent = entry;
    consumers.append(item);
  });
  elements.inspectorBody.append(consumers);

  elements.inspectorBody.append(sectionHeading("Examples"));
  const examples = document.createElement("div");
  examples.className = "example-stack";
  family.example_rows.forEach((entry) => {
    const row = document.createElement("article");
    row.className = "example-row";
    row.dataset.tone = family.tone;
    row.setAttribute("role", "group");
    row.setAttribute("aria-label", entry.accessible_label);

    const top = document.createElement("div");
    top.className = "example-row__top";
    row.append(top);

    const label = document.createElement("strong");
    label.textContent = entry.label;
    top.append(label);

    const note = document.createElement("p");
    note.className = "example-row__note";
    note.textContent = entry.note;
    row.append(note);

    const grid = document.createElement("div");
    grid.className = "example-row__grid";
    grid.append(token(entry.input_literal), token(entry.output_literal));
    row.append(grid);
    examples.append(row);
  });
  elements.inspectorBody.append(examples);

  elements.inspectorBody.append(sectionHeading("Companion Rules"));
  const companion = document.createElement("ul");
  companion.className = "plain-list";
  family.companion_rules.forEach((entry) => {
    const item = document.createElement("li");
    item.textContent = entry;
    companion.append(item);
  });
  elements.inspectorBody.append(companion);

  elements.inspectorBody.append(sectionHeading("Notes"));
  const notes = document.createElement("ul");
  notes.className = "plain-list";
  family.notes.forEach((entry) => {
    const item = document.createElement("li");
    item.textContent = entry;
    notes.append(item);
  });
  elements.inspectorBody.append(notes);
}

function render() {
  const family = activeFamily();
  renderHeader(family);
  renderAxes();
  renderFamilyRail(family);
  renderLattice(family);
  renderTransitions(family);
  renderInspector(family);
}

async function bootstrap() {
  setMotionPreference();
  const response = await fetch(dataPath);
  state.payload = await response.json();
  render();
}

await bootstrap();
