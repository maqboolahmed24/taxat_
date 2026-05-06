const dataPath = "./data/canonical-domain-example-atlas.json";

const state = {
  activeEmbodimentRef: null,
  activeVariantId: null,
  payload: null,
  showGoldenOverlay: false,
};

const elements = {
  basisStatement: document.querySelector("#basis-statement"),
  embodimentRail: document.querySelector("#embodiment-rail"),
  embodimentSelect: document.querySelector("#embodiment-select"),
  fixtureStack: document.querySelector("#fixture-stack"),
  goldenOverlayList: document.querySelector("#golden-overlay-list"),
  goldenOverlayTitle: document.querySelector("#golden-overlay-title"),
  goldenOverlayToggle: document.querySelector("#golden-overlay-toggle"),
  goldenPackChip: document.querySelector("#golden-pack-chip"),
  goldenPackOverlay: document.querySelector("#golden-pack-overlay"),
  inspectorStack: document.querySelector("#inspector-stack"),
  inspectorTitle: document.querySelector("#inspector-title"),
  narrativeGrid: document.querySelector("#narrative-grid"),
  narrativeTitle: document.querySelector("#narrative-title"),
  pageTitle: document.querySelector("#page-title"),
  replayClassBadge: document.querySelector("#replay-class-badge"),
  timelineList: document.querySelector("#timeline-list"),
  variantRow: document.querySelector("#variant-row"),
};

function setMotionPreference() {
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const sync = () => {
    document.documentElement.dataset.motion = motionQuery.matches ? "reduce" : "standard";
  };
  sync();
  motionQuery.addEventListener("change", sync);
}

function getActiveEmbodiment() {
  state.activeEmbodimentRef =
    state.activeEmbodimentRef ?? state.payload.selectedEmbodimentRef ?? state.payload.embodiments[0]?.embodimentRef;
  return (
    state.payload.embodiments.find(
      (embodiment) => embodiment.embodimentRef === state.activeEmbodimentRef,
    ) ?? state.payload.embodiments[0]
  );
}

function getActiveVariant(embodiment) {
  const fallbackVariant =
    embodiment.variants.find((variant) => variant.variantId === embodiment.selectedVariantId) ??
    embodiment.variants[0];
  const currentVariant =
    embodiment.variants.find((variant) => variant.variantId === state.activeVariantId) ??
    fallbackVariant;
  state.activeVariantId = currentVariant?.variantId ?? null;
  return currentVariant;
}

function formatLabel(value) {
  return value.replaceAll("_", " ").replaceAll("-", " ");
}

function chip(label, tone = "neutral") {
  const span = document.createElement("span");
  span.className = "chip";
  span.dataset.tone = tone;
  span.textContent = label;
  return span;
}

function listSection(title, values, kind = "text") {
  const section = document.createElement("section");
  section.className = "inspector-card";

  const heading = document.createElement("h3");
  heading.textContent = title;
  section.append(heading);

  if (kind === "chips") {
    const row = document.createElement("div");
    row.className = "chip-cluster";
    values.forEach((value) => row.append(chip(value, "outline")));
    section.append(row);
    return section;
  }

  const list = document.createElement("ul");
  list.className = "bullet-list";
  values.forEach((value) => {
    const item = document.createElement("li");
    item.textContent = value;
    list.append(item);
  });
  section.append(list);
  return section;
}

function keyValueRow(label, value, mono = false) {
  const row = document.createElement("div");
  row.className = "inspector-row";

  const term = document.createElement("span");
  term.className = "inspector-row__label";
  term.textContent = label;
  row.append(term);

  const detail = document.createElement("span");
  detail.className = mono ? "mono-value" : "inspector-row__value";
  detail.textContent = value;
  row.append(detail);
  return row;
}

function renderTopBar(embodiment, variant) {
  elements.pageTitle.textContent = state.payload.title;
  elements.basisStatement.textContent = state.payload.basisStatement;
  elements.replayClassBadge.textContent = variant.replayClass;
  elements.goldenPackChip.textContent =
    variant.goldenPackOverlay.length === 0
      ? "No golden-pack fixture"
      : `${variant.goldenPackOverlay.length} golden-pack fixture${variant.goldenPackOverlay.length === 1 ? "" : "s"}`;
  elements.goldenOverlayToggle.textContent = state.showGoldenOverlay
    ? "Hide golden-pack overlay"
    : state.payload.overlayToggleLabel;
  elements.goldenOverlayToggle.setAttribute(
    "aria-label",
    state.showGoldenOverlay ? "Hide golden-pack coverage overlay" : state.payload.overlayToggleLabel,
  );

  const options = state.payload.embodiments.map((entry) => {
    const option = document.createElement("option");
    option.value = entry.embodimentRef;
    option.textContent = `${entry.embodimentRef} · ${entry.displayName}`;
    return option;
  });
  elements.embodimentSelect.replaceChildren(...options);
  elements.embodimentSelect.value = embodiment.embodimentRef;
}

function renderRail(activeEmbodiment) {
  elements.embodimentRail.replaceChildren(
    ...state.payload.embodiments.map((embodiment) => {
      const item = document.createElement("li");

      const button = document.createElement("button");
      button.type = "button";
      button.className = "rail-card";
      button.dataset.active = embodiment.embodimentRef === activeEmbodiment.embodimentRef ? "true" : "false";
      button.setAttribute("aria-label", embodiment.accessibleLabel);
      button.setAttribute(
        "aria-current",
        embodiment.embodimentRef === activeEmbodiment.embodimentRef ? "true" : "false",
      );
      button.addEventListener("click", () => {
        state.activeEmbodimentRef = embodiment.embodimentRef;
        state.activeVariantId = embodiment.selectedVariantId;
        state.showGoldenOverlay = false;
        render();
      });

      const code = document.createElement("strong");
      code.className = "rail-card__code";
      code.textContent = embodiment.embodimentRef;
      button.append(code);

      const label = document.createElement("span");
      label.className = "rail-card__label";
      label.textContent = embodiment.displayName;
      button.append(label);

      const note = document.createElement("span");
      note.className = "rail-card__note";
      note.textContent = embodiment.railSummary;
      button.append(note);

      item.append(button);
      return item;
    }),
  );
}

function renderVariants(embodiment, activeVariant) {
  elements.variantRow.replaceChildren(
    ...embodiment.variants.map((variant) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "variant-chip";
      button.dataset.active = variant.variantId === activeVariant.variantId ? "true" : "false";
      button.setAttribute("aria-pressed", variant.variantId === activeVariant.variantId ? "true" : "false");
      button.setAttribute("aria-label", `Scenario variant ${variant.label}`);
      button.textContent = variant.label;
      button.addEventListener("click", () => {
        state.activeVariantId = variant.variantId;
        state.showGoldenOverlay = false;
        render();
      });
      return button;
    }),
  );
}

function renderNarrative(embodiment, activeVariant) {
  elements.narrativeTitle.textContent = embodiment.displayName;
  renderVariants(embodiment, activeVariant);

  const cards = [
    {
      title: "Purpose",
      rows: [embodiment.purpose, embodiment.fixtureBundle.narrativeSummary, activeVariant.summary],
    },
    {
      title: "Authority posture",
      rows: embodiment.actorsAndAuthorityPosture,
    },
    {
      title: "Initial conditions",
      rows: embodiment.initialConditions,
    },
    {
      title: "Input and privacy",
      rows: [...embodiment.inputSourceMix, embodiment.privacyStatement],
    },
  ];

  elements.narrativeGrid.replaceChildren(
    ...cards.map((card) => {
      const article = document.createElement("article");
      article.className = "narrative-card";

      const heading = document.createElement("h3");
      heading.textContent = card.title;
      article.append(heading);

      const list = document.createElement("ul");
      list.className = "bullet-list";
      card.rows.forEach((row) => {
        const item = document.createElement("li");
        item.textContent = row;
        list.append(item);
      });
      article.append(list);

      return article;
    }),
  );
}

function renderGoldenOverlay(embodiment, activeVariant) {
  const overlayTitle =
    activeVariant.goldenPackOverlay.length === 0
      ? `${activeVariant.label} does not participate in the golden pack`
      : `${activeVariant.label} golden-pack coverage`;
  elements.goldenOverlayTitle.textContent = overlayTitle;

  const content =
    activeVariant.goldenPackOverlay.length === 0
      ? (() => {
          const empty = document.createElement("p");
          empty.className = "overlay-empty";
          empty.textContent =
            "No reviewed deterministic-golden-pack fixtures are bound to this selected embodiment variant.";
          return [empty];
        })()
      : activeVariant.goldenPackOverlay.map((fixture) => {
          const article = document.createElement("article");
          article.className = "overlay-card";

          const header = document.createElement("div");
          header.className = "overlay-card__header";
          article.append(header);

          const strong = document.createElement("strong");
          strong.textContent = fixture.label;
          header.append(strong);

          header.append(chip(fixture.fixtureKind, "outline"));

          const note = document.createElement("p");
          note.className = "overlay-note";
          note.textContent = fixture.note;
          article.append(note);
          return article;
        });

  elements.goldenOverlayList.replaceChildren(...content);
  elements.goldenPackOverlay.hidden = !state.showGoldenOverlay;
}

function renderFixtureBundle(embodiment, activeVariant) {
  renderGoldenOverlay(embodiment, activeVariant);

  const sampleSection = document.createElement("section");
  sampleSection.className = "fixture-section";
  sampleSection.append(Object.assign(document.createElement("h3"), { textContent: "Sample artifacts" }));

  const sampleGrid = document.createElement("div");
  sampleGrid.className = "sample-grid";
  embodiment.fixtureBundle.artifactSamples.forEach((sample) => {
    const card = document.createElement("article");
    card.className = "sample-card";

    const header = document.createElement("div");
    header.className = "sample-card__header";
    card.append(header);

    const title = document.createElement("strong");
    title.textContent = sample.artifact_role;
    header.append(title);
    header.append(chip(sample.schema_name, "outline"));

    const sampleName = document.createElement("p");
    sampleName.className = "mono-note";
    sampleName.textContent = sample.sample_name;
    card.append(sampleName);

    const pathNote = document.createElement("p");
    pathNote.className = "subtle-note";
    pathNote.textContent = sample.narrative_purpose;
    card.append(pathNote);

    const fields = document.createElement("div");
    fields.className = "chip-cluster";
    sample.summary_fields.forEach((field) => fields.append(chip(field, "soft")));
    card.append(fields);

    sampleGrid.append(card);
  });
  sampleSection.append(sampleGrid);

  const gateSection = document.createElement("section");
  gateSection.className = "fixture-section";
  gateSection.append(Object.assign(document.createElement("h3"), { textContent: "Expected gates and artifacts" }));

  const gateList = document.createElement("div");
  gateList.className = "gate-list";
  activeVariant.expectedGates.forEach((gate) => {
    const row = document.createElement("article");
    row.className = "gate-row";

    row.append(chip(gate.gateCode, "outline"));
    row.append(chip(gate.decision, gate.decision.includes("BLOCK") ? "danger" : "success"));

    const reason =
      gate.decisiveReasonCodes.length === 0
        ? "No decisive reason codes"
        : gate.decisiveReasonCodes.join(", ");
    const text = document.createElement("p");
    text.className = "subtle-note";
    text.textContent = reason;
    row.append(text);
    gateList.append(row);
  });
  gateSection.append(gateList);

  const artifactList = document.createElement("ul");
  artifactList.className = "artifact-list";
  activeVariant.expectedArtifacts.forEach((artifact) => {
    const item = document.createElement("li");
    item.className = "artifact-row";
    item.append(chip(artifact.artifactFamily, "outline"));

    const value = document.createElement("code");
    value.className = "mono-value";
    value.textContent = artifact.artifactRef;
    item.append(value);

    const note = document.createElement("span");
    note.className = "artifact-row__note";
    note.textContent = artifact.posture;
    item.append(note);
    artifactList.append(item);
  });
  gateSection.append(artifactList);

  elements.fixtureStack.replaceChildren(sampleSection, gateSection);
}

function renderTimeline(embodiment) {
  const activeVariant = getActiveVariant(embodiment);
  elements.timelineList.replaceChildren(
    ...activeVariant.timeline.map((step, index) => {
      const item = document.createElement("li");
      item.className = "timeline-step";

      const marker = document.createElement("div");
      marker.className = "timeline-step__marker";
      marker.textContent = `${index + 1}`;
      item.append(marker);

      const body = document.createElement("div");
      body.className = "timeline-step__body";
      item.append(body);

      const header = document.createElement("div");
      header.className = "timeline-step__header";
      body.append(header);

      const strong = document.createElement("strong");
      strong.textContent = step.step;
      header.append(strong);
      header.append(chip(step.phase, "soft"));

      const mono = document.createElement("p");
      mono.className = "mono-note";
      mono.textContent = step.eventType;
      body.append(mono);

      const summary = document.createElement("p");
      summary.className = "subtle-note";
      summary.textContent = step.summary;
      body.append(summary);

      return item;
    }),
  );
}

function renderInspector(embodiment, activeVariant) {
  elements.inspectorTitle.textContent = `${embodiment.embodimentRef} traceability`;

  const seedCard = document.createElement("section");
  seedCard.className = "inspector-card";
  seedCard.append(Object.assign(document.createElement("h3"), { textContent: "Deterministic seed" }));
  seedCard.append(keyValueRow("Seed ref", embodiment.inspector.seedRef, true));
  seedCard.append(keyValueRow("Seed hex", embodiment.inspector.seedHex, true));

  const contextCard = document.createElement("section");
  contextCard.className = "inspector-card";
  contextCard.append(Object.assign(document.createElement("h3"), { textContent: "Frozen context" }));
  contextCard.append(keyValueRow("Config profile", embodiment.frozenContext.configProfileRef, true));
  contextCard.append(keyValueRow("Provider profile", embodiment.frozenContext.providerProfileRef, true));
  contextCard.append(
    keyValueRow("Baseline state", embodiment.frozenContext.baselineSubmissionState),
  );
  contextCard.append(
    keyValueRow("Comparison", embodiment.frozenContext.comparisonRequirement),
  );

  const traceCard = listSection("Schema refs", embodiment.inspector.schemaRefs, "chips");
  const vectorsCard = listSection("Test vectors", activeVariant.testVectorRefs, "chips");
  const constraintsCard = listSection("Constraint refs", activeVariant.constraintRefs, "chips");
  const notesCard = listSection("Variant notes", [
    `Replay class: ${activeVariant.replayClass}`,
    `Golden-pack participation: ${activeVariant.goldenPackParticipation}`,
    embodiment.privacyStatement,
  ]);

  elements.inspectorStack.replaceChildren(
    seedCard,
    contextCard,
    traceCard,
    vectorsCard,
    constraintsCard,
    notesCard,
  );
}

function render() {
  const embodiment = getActiveEmbodiment();
  const activeVariant = getActiveVariant(embodiment);
  renderTopBar(embodiment, activeVariant);
  renderRail(embodiment);
  renderNarrative(embodiment, activeVariant);
  renderFixtureBundle(embodiment, activeVariant);
  renderTimeline(embodiment);
  renderInspector(embodiment, activeVariant);
}

async function initialize() {
  setMotionPreference();

  const response = await fetch(dataPath);
  state.payload = await response.json();
  state.activeEmbodimentRef = state.payload.selectedEmbodimentRef;
  state.activeVariantId =
    state.payload.embodiments.find(
      (entry) => entry.embodimentRef === state.payload.selectedEmbodimentRef,
    )?.selectedVariantId ?? null;

  elements.embodimentSelect.addEventListener("change", (event) => {
    state.activeEmbodimentRef = event.currentTarget.value;
    state.activeVariantId =
      state.payload.embodiments.find((entry) => entry.embodimentRef === state.activeEmbodimentRef)
        ?.selectedVariantId ?? null;
    state.showGoldenOverlay = false;
    render();
  });

  elements.goldenOverlayToggle.addEventListener("click", () => {
    state.showGoldenOverlay = !state.showGoldenOverlay;
    render();
  });

  render();
}

await initialize();
