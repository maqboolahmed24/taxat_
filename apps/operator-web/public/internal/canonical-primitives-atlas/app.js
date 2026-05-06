const dataPath = "./data/canonical-primitives-atlas.json";

const state = {
  payload: null,
  activeFamilyRef: null,
};

const elements = {
  pageTitle: document.querySelector("#page-title"),
  familyTabs: document.querySelector("#family-tabs"),
  canonicalityBadge: document.querySelector("#canonicality-badge"),
  activeFamilyChip: document.querySelector("#active-family-chip"),
  basisStatement: document.querySelector("#basis-statement"),
  familyList: document.querySelector("#family-list"),
  specimenColumns: document.querySelector("#specimen-columns"),
  drawerTitle: document.querySelector("#drawer-title"),
  drawerBody: document.querySelector("#drawer-body"),
};

function setMotionPreference() {
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const sync = () => {
    document.documentElement.dataset.motion = motionQuery.matches ? "reduce" : "standard";
  };
  sync();
  motionQuery.addEventListener("change", sync);
}

function chip(label) {
  const span = document.createElement("span");
  span.className = "chip";
  span.textContent = label;
  return span;
}

function familyByRef(familyRef) {
  return state.payload.families.find((family) => family.family_ref === familyRef) ?? null;
}

function resolveActiveFamily() {
  state.activeFamilyRef = state.activeFamilyRef ?? state.payload.selectedFamilyRef;
  return familyByRef(state.activeFamilyRef) ?? state.payload.families[0];
}

async function copyLiteral(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    const original = button.textContent;
    button.textContent = "Copied";
    window.setTimeout(() => {
      button.textContent = original;
    }, 900);
  } catch {
    button.textContent = "Unavailable";
    window.setTimeout(() => {
      button.textContent = "Copy";
    }, 900);
  }
}

function familyToneClass(family) {
  return family.tone;
}

function createFamilySelector(family, active, contextLabel) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "family-selector";
  button.dataset.active = active ? "true" : "false";
  button.dataset.tone = familyToneClass(family);
  button.setAttribute("aria-current", active ? "true" : "false");
  button.setAttribute("aria-label", `${contextLabel} ${family.label}`);

  const strong = document.createElement("strong");
  strong.textContent = family.label;
  button.append(strong);

  const span = document.createElement("span");
  span.textContent = family.hero.eyebrow;
  button.append(span);

  button.addEventListener("click", () => {
    state.activeFamilyRef = family.family_ref;
    render();
  });

  return button;
}

function renderTopBar(activeFamily) {
  elements.pageTitle.textContent = state.payload.title;
  elements.canonicalityBadge.textContent = state.payload.canonicalityBadge;
  elements.activeFamilyChip.textContent = activeFamily.label;
  elements.basisStatement.textContent = state.payload.basisStatement;

  elements.familyTabs.replaceChildren(
    ...state.payload.families.map((family) =>
      createFamilySelector(
        family,
        family.family_ref === activeFamily.family_ref,
        "Primitive family tab",
      ),
    ),
  );
}

function renderFamilyRail(activeFamily) {
  elements.familyList.replaceChildren(
    ...state.payload.families.map((family) => {
      const item = document.createElement("li");
      item.append(
        createFamilySelector(
          family,
          family.family_ref === activeFamily.family_ref,
          "Primitive family rail entry",
        ),
      );

      const note = document.createElement("p");
      note.className = "family-summary";
      note.textContent = family.rail_summary;
      item.append(note);
      return item;
    }),
  );
}

function createHeroDiagram(family) {
  const hero = document.createElement("section");
  hero.className = "hero-diagram";
  hero.dataset.kind = family.hero.diagram_kind;
  hero.dataset.tone = familyToneClass(family);

  const heading = document.createElement("div");
  heading.className = "hero-heading";
  hero.append(heading);

  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = family.hero.eyebrow;
  heading.append(eyebrow);

  const title = document.createElement("h3");
  title.textContent = family.hero.title;
  heading.append(title);

  const caption = document.createElement("p");
  caption.className = "ledger-note";
  caption.textContent = family.hero.caption;
  heading.append(caption);

  const stageStrip = document.createElement("div");
  stageStrip.className = "stage-strip";
  hero.append(stageStrip);

  family.hero.stages.forEach((stage) => {
    const stageNode = document.createElement("div");
    stageNode.className = "stage-node";
    stageNode.textContent = stage;
    stageStrip.append(stageNode);
  });

  const tokenCloud = document.createElement("div");
  tokenCloud.className = "token-cloud";
  hero.append(tokenCloud);

  family.hero.tokens.forEach((token) => {
    const tokenNode = document.createElement("span");
    tokenNode.className = "mono-token";
    tokenNode.textContent = token;
    tokenCloud.append(tokenNode);
  });

  return hero;
}

function createProfileList(profileRows) {
  const list = document.createElement("dl");
  list.className = "profile-list";

  profileRows.forEach((row) => {
    const term = document.createElement("dt");
    term.textContent = row.label;
    list.append(term);

    const value = document.createElement("dd");
    value.textContent = row.value;
    list.append(value);
  });

  return list;
}

function createExampleRow(example) {
  const item = document.createElement("li");
  item.className = "example-row";
  item.setAttribute("role", "group");
  item.setAttribute("aria-label", `Literal output row ${example.accessible_label}`);

  const header = document.createElement("div");
  header.className = "example-row__header";
  item.append(header);

  const textBlock = document.createElement("div");
  textBlock.className = "example-row__text";
  header.append(textBlock);

  const title = document.createElement("strong");
  title.textContent = example.label;
  textBlock.append(title);

  const note = document.createElement("p");
  note.className = "ledger-note";
  note.textContent = example.note;
  textBlock.append(note);

  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.className = "copy-button";
  copyButton.setAttribute("aria-label", `Copy literal for ${example.accessible_label}`);
  copyButton.textContent = "Copy";
  copyButton.addEventListener("click", () => copyLiteral(example.copy_literal, copyButton));
  header.append(copyButton);

  const literalGrid = document.createElement("div");
  literalGrid.className = "literal-grid";
  item.append(literalGrid);

  const input = document.createElement("code");
  input.className = "literal-cell";
  input.textContent = example.input_literal;
  literalGrid.append(input);

  const output = document.createElement("code");
  output.className = "literal-cell literal-cell--output";
  output.textContent = example.output_literal;
  literalGrid.append(output);

  return item;
}

function createSpecimenColumn(family, active) {
  const article = document.createElement("article");
  article.className = "specimen-column";
  article.dataset.active = active ? "true" : "false";
  article.dataset.tone = familyToneClass(family);

  const activate = document.createElement("button");
  activate.type = "button";
  activate.className = "column-activate";
  activate.dataset.active = active ? "true" : "false";
  activate.setAttribute("aria-label", `Activate ${family.label} specimen`);
  activate.addEventListener("click", () => {
    state.activeFamilyRef = family.family_ref;
    render();
  });
  article.append(activate);

  const title = document.createElement("h3");
  title.textContent = family.label;
  article.append(title);

  const summary = document.createElement("p");
  summary.className = "ledger-note";
  summary.textContent = family.rail_summary;
  article.append(summary);

  article.append(createProfileList(family.profile_rows));

  if (active) {
    article.append(createHeroDiagram(family));

    const examplesHeading = document.createElement("div");
    examplesHeading.className = "section-heading";
    examplesHeading.innerHTML = `
      <p class="eyebrow">Examples</p>
      <h4>Literal output rows</h4>
    `;
    article.append(examplesHeading);

    const list = document.createElement("ul");
    list.className = "example-list";
    family.examples.forEach((example) => list.append(createExampleRow(example)));
    article.append(list);
  } else {
    const dormant = document.createElement("div");
    dormant.className = "dormant-summary";
    dormant.append(chip(family.hero.eyebrow));
    dormant.append(chip(`${family.examples.length} examples`));
    dormant.append(chip(`${family.forbidden_cases.length} guardrails`));
    article.append(dormant);
  }

  return article;
}

function detailCard(title, description, items, mono = false) {
  const section = document.createElement("section");
  section.className = "detail-card";

  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = title;
  section.append(eyebrow);

  if (description) {
    const note = document.createElement("p");
    note.className = "ledger-note";
    note.textContent = description;
    section.append(note);
  }

  const list = document.createElement("ul");
  if (mono) {
    list.className = "mono-list";
  }
  items.forEach((item) => {
    const entry = document.createElement("li");
    entry.textContent = item;
    list.append(entry);
  });
  section.append(list);
  return section;
}

function renderDrawer(activeFamily) {
  elements.drawerTitle.textContent = activeFamily.label;

  const parityCards = activeFamily.parity_rows.map((row) =>
    detailCard(
      row.label,
      `${row.status} via ${row.python_source}`,
      [...row.notes, `TypeScript ${row.ts_value}`, `Python ${row.python_value}`],
      true,
    ),
  );

  const examplePreview = activeFamily.examples
    .slice(0, 3)
    .map((example) => `${example.label}: ${example.output_literal}`);
  const forbiddenPreview = activeFamily.forbidden_cases.map(
    (entry) => `${entry.label}: ${entry.reason}`,
  );
  const lineagePreview = activeFamily.source_lineage.map(
    (entry) => `${entry.source_file} · ${entry.source_heading_or_logical_block}`,
  );

  elements.drawerBody.replaceChildren(
    detailCard(
      "Profile",
      "Compact profile details for the selected primitive family.",
      activeFamily.profile_rows.map((row) => `${row.label} · ${row.value}`),
    ),
    detailCard("Examples", "Active literal outputs from the specimen field.", examplePreview, true),
    detailCard(
      "Forbidden cases",
      "Lossy or non-canonical shortcuts intentionally rejected by the shared layer.",
      forbiddenPreview,
    ),
    ...parityCards,
    detailCard(
      "Banned patterns",
      "These shortcuts remain outside the canonical helpers.",
      activeFamily.banned_patterns,
    ),
    detailCard(
      "Source lineage",
      "Authoritative source contracts behind this family.",
      lineagePreview,
    ),
  );
}

function renderSpecimenField(activeFamily) {
  elements.specimenColumns.replaceChildren(
    ...state.payload.families.map((family) =>
      createSpecimenColumn(family, family.family_ref === activeFamily.family_ref),
    ),
  );
}

function render() {
  const activeFamily = resolveActiveFamily();
  renderTopBar(activeFamily);
  renderFamilyRail(activeFamily);
  renderSpecimenField(activeFamily);
  renderDrawer(activeFamily);
}

async function init() {
  setMotionPreference();
  const response = await fetch(dataPath);
  if (!response.ok) {
    throw new Error(`Failed to load atlas payload from ${dataPath}`);
  }
  state.payload = await response.json();
  render();
}

init().catch((error) => {
  elements.drawerTitle.textContent = "Failed to load atlas";
  elements.drawerBody.textContent = error instanceof Error ? error.message : String(error);
  console.error(error);
});
