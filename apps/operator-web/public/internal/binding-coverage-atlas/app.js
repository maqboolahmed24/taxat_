const dataPath = "./data/binding-coverage-atlas.json";

const state = {
  payload: null,
  activeLanguageRef: null,
  activeEntryRef: null,
  activeFocusKind: "family",
  activeFocusRef: null,
};

const elements = {
  bundleBadge: document.querySelector("#bundle-badge"),
  repoTitle: document.querySelector("#repo-title"),
  topLanguageSelector: document.querySelector("#top-language-selector"),
  generationPosture: document.querySelector("#generation-posture"),
  summaryCopy: document.querySelector("#summary-copy"),
  lineageStrip: document.querySelector("#lineage-strip"),
  languageList: document.querySelector("#language-list"),
  familyList: document.querySelector("#family-list"),
  outputList: document.querySelector("#output-list"),
  coverageList: document.querySelector("#coverage-list"),
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

function chip(label, tone = "neutral") {
  const span = document.createElement("span");
  span.className = "chip";
  span.dataset.tone = tone;
  span.textContent = label;
  return span;
}

function statusChip(label, status) {
  const span = document.createElement("span");
  span.className = "status-chip";
  span.dataset.status = status;
  span.textContent = label;
  return span;
}

function toneForCoverage(value) {
  if (
    value === "FULL_FAMILY_GAP_BEARING_STRUCTURAL_BINDING" ||
    value === "SELECTED_NATIVE_SUBSET_GAP_BEARING_BINDING"
  ) {
    return "success";
  }
  if (value === "NOT_TARGETED" || value === "LOW" || value === "MEDIUM") {
    return "warning";
  }
  return "danger";
}

function selectLanguage(languageRef) {
  state.activeLanguageRef = languageRef;
  const language = resolveActiveLanguage();
  const selectedEntry =
    language.entries.find((entry) => entry.entry_ref === state.payload.selectedEntryRef) ??
    language.entries[0] ??
    null;
  state.activeEntryRef = selectedEntry?.entry_ref ?? null;
  state.activeFocusKind = "family";
  state.activeFocusRef = state.activeEntryRef;
  render();
}

function languageByRef(ref) {
  return state.payload.languages.find((language) => language.language_ref === ref) ?? null;
}

function entryByRef(ref) {
  return (
    state.payload.languages
      .flatMap((language) => language.entries)
      .find((entry) => entry.entry_ref === ref) ?? null
  );
}

function gapEntryById(gapId) {
  return (
    languageByRef("GAP_REGISTRY")?.entries.find((entry) => entry.gapIds.includes(gapId)) ?? null
  );
}

function resolveActiveLanguage() {
  if (!state.activeLanguageRef) {
    state.activeLanguageRef = state.payload.selectedLanguageRef;
  }
  return languageByRef(state.activeLanguageRef) ?? state.payload.languages[0];
}

function resolveActiveEntry(language) {
  if (
    !state.activeEntryRef ||
    !language.entries.some((entry) => entry.entry_ref === state.activeEntryRef)
  ) {
    state.activeEntryRef =
      language.entries.find((entry) => entry.entry_ref === state.payload.selectedEntryRef)
        ?.entry_ref ??
      language.entries[0]?.entry_ref ??
      null;
  }
  return state.activeEntryRef ? entryByRef(state.activeEntryRef) : null;
}

function createRow(ariaLabel, title, detail, chipsToAppend, active, onSelect) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "coverage-row";
  button.dataset.active = active ? "true" : "false";
  button.setAttribute("aria-label", ariaLabel);
  button.innerHTML = `
    <div class="row-head">
      <strong>${title}</strong>
      <div class="chip-row"></div>
    </div>
    <p>${detail}</p>
  `;
  const chipRow = button.querySelector(".chip-row");
  chipsToAppend.forEach((entry) => chipRow.append(entry));
  button.addEventListener("click", onSelect);
  return button;
}

function renderTopBar(activeLanguage) {
  elements.bundleBadge.textContent = state.payload.bundleBadge;
  elements.repoTitle.textContent = state.payload.title;
  elements.generationPosture.textContent = state.payload.generationPosture;
  elements.generationPosture.dataset.status = state.payload.generationPosture;

  elements.topLanguageSelector.replaceChildren(
    ...state.payload.languages.map((language) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "selector-chip";
      button.dataset.active =
        language.language_ref === activeLanguage.language_ref ? "true" : "false";
      button.textContent = language.label;
      button.setAttribute("aria-label", `Top selector ${language.label}`);
      button.addEventListener("click", () => selectLanguage(language.language_ref));
      return button;
    }),
  );
}

function renderLanguageRail(activeLanguage) {
  elements.languageList.replaceChildren(
    ...state.payload.languages.map((language) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute(
        "aria-current",
        language.language_ref === activeLanguage.language_ref ? "true" : "false",
      );
      button.innerHTML = `
        <div class="language-title">
          <strong>${language.label}</strong>
        </div>
        <div class="language-meta">
          <span>${language.entries.length} entries</span>
          <span>${language.summary.split(".")[0]}</span>
        </div>
      `;
      button.addEventListener("click", () => selectLanguage(language.language_ref));
      item.append(button);
      return item;
    }),
  );
}

function renderSummary(activeLanguage, activeEntry) {
  const gapCount = activeEntry?.gapIds.length ?? 0;
  const summary = activeEntry
    ? `${state.payload.summary} Active language ${activeLanguage.label} exposes ${activeLanguage.entries.length} ledger entries and ${gapCount} typed gap ${gapCount === 1 ? "record" : "records"} for the selected row.`
    : state.payload.summary;
  elements.summaryCopy.textContent = summary;
}

function renderLineageStrip(activeEntry) {
  const chips = state.payload.lineageStrip.map((label, index) =>
    chip(
      index === 0 ? `${label} ${activeEntry.sourceHashAggregate.slice(0, 12)}` : label,
      index === 1 ? "warning" : "neutral",
    ),
  );
  chips.push(chip(activeEntry.outputRef, "success"));
  elements.lineageStrip.replaceChildren(...chips);
}

function renderFamilyPlane(activeLanguage, activeEntry) {
  elements.familyList.replaceChildren(
    ...activeLanguage.entries.map((entry) =>
      createRow(
        `Schema family row ${entry.label}`,
        entry.label,
        `${entry.familyRef} · ${entry.affectedSchemaNames.length} referenced schemas`,
        [
          statusChip(entry.coverageClass, entry.coverageClass),
          chip(
            `${entry.gapIds.length} gap${entry.gapIds.length === 1 ? "" : "s"}`,
            entry.gapIds.length ? "warning" : "success",
          ),
        ],
        state.activeFocusKind === "family" && activeEntry?.entry_ref === entry.entry_ref,
        () => {
          state.activeEntryRef = entry.entry_ref;
          state.activeFocusKind = "family";
          state.activeFocusRef = entry.entry_ref;
          render();
        },
      ),
    ),
  );
}

function renderOutputPlane(activeEntry) {
  const rows = [
    {
      ref: `${activeEntry.entry_ref}:output`,
      label: "Generated output",
      detail: activeEntry.outputRef,
      chips: [chip("output", "success")],
    },
    {
      ref: `${activeEntry.entry_ref}:tool`,
      label: "Generator",
      detail: activeEntry.toolId,
      chips: [chip(activeEntry.sourceHashAggregate.slice(0, 12), "warning")],
    },
    ...activeEntry.consumingSurfaceRefs.map((surfaceRef) => ({
      ref: `${activeEntry.entry_ref}:surface:${surfaceRef}`,
      label: "Consuming surface",
      detail: surfaceRef,
      chips: [chip("consumer", "neutral")],
    })),
  ];

  elements.outputList.replaceChildren(
    ...rows.map((row) =>
      createRow(
        `Generated output row ${row.label} ${row.detail}`,
        row.label,
        row.detail,
        row.chips,
        state.activeFocusKind === "output" && state.activeFocusRef === row.ref,
        () => {
          state.activeFocusKind = "output";
          state.activeFocusRef = row.ref;
          renderInspector(activeEntry);
          renderOutputPlane(activeEntry);
          renderCoveragePlane(activeEntry);
        },
      ),
    ),
  );
}

function renderCoveragePlane(activeEntry) {
  const rows = [
    {
      ref: `${activeEntry.entry_ref}:coverage`,
      label: activeEntry.coverageClass,
      detail: activeEntry.summary,
      chips: [chip(`${activeEntry.affectedSchemaNames.length} schemas`, "neutral")],
    },
    {
      ref: `${activeEntry.entry_ref}:decimal`,
      label: "Decimal posture",
      detail: activeEntry.decimalPolicyRef,
      chips: [chip("lossless", "success")],
    },
    {
      ref: `${activeEntry.entry_ref}:nullability`,
      label: "Nullability posture",
      detail: activeEntry.nullabilityPolicy,
      chips: [chip("policy", "neutral")],
    },
    ...(activeEntry.gapIds.length
      ? activeEntry.gapIds.map((gapId) => {
          const gap = gapEntryById(gapId);
          return {
            ref: `${activeEntry.entry_ref}:gap:${gapId}`,
            label: gapId,
            detail: gap?.summary ?? "Typed gap entry registered for this binding row.",
            chips: [
              statusChip(
                gap?.coverageClass ?? gap?.risk ?? "MEDIUM",
                gap?.coverageClass ?? gap?.risk ?? "MEDIUM",
              ),
            ],
          };
        })
      : [
          {
            ref: `${activeEntry.entry_ref}:gap:none`,
            label: "No typed gaps registered",
            detail: "This row currently carries no explicit gap ledger entries.",
            chips: [chip("clear", "success")],
          },
        ]),
  ];

  elements.coverageList.replaceChildren(
    ...rows.map((row) =>
      createRow(
        row.label.startsWith("No typed gaps")
          ? "Coverage row No typed gaps registered"
          : row.ref.includes(":gap:")
            ? `Gap row ${row.label}`
            : `Coverage row ${row.label}`,
        row.label,
        row.detail,
        row.chips,
        state.activeFocusKind === "coverage" && state.activeFocusRef === row.ref,
        () => {
          state.activeFocusKind = "coverage";
          state.activeFocusRef = row.ref;
          renderInspector(activeEntry);
          renderCoveragePlane(activeEntry);
          renderOutputPlane(activeEntry);
        },
      ),
    ),
  );
}

function detailCard(title, body, items = []) {
  const section = document.createElement("section");
  section.className = "detail-card";
  section.innerHTML = `
    <p class="eyebrow">${title}</p>
    <p class="ledger-note">${body}</p>
  `;
  if (items.length) {
    const list = document.createElement("ul");
    items.forEach((item) => {
      const entry = document.createElement("li");
      entry.className =
        item.includes("/") || /^[A-Z0-9_:-]+$/.test(item) || /^[0-9a-f]{12,}$/i.test(item)
          ? "mono"
          : "";
      entry.textContent = item;
      list.append(entry);
    });
    section.append(list);
  }
  return section;
}

function renderInspector(activeEntry) {
  const gapMatch =
    state.activeFocusKind === "coverage" && state.activeFocusRef.includes(":gap:")
      ? state.activeFocusRef.split(":gap:")[1]
      : null;
  const activeGap = gapMatch ? gapEntryById(gapMatch) : null;

  if (activeGap) {
    elements.drawerTitle.textContent = activeGap.gapIds[0];
    elements.drawerBody.replaceChildren(
      detailCard("Gap posture", activeGap.summary, [activeGap.coverageClass, activeGap.toolId]),
      detailCard("Required follow-on", activeGap.outputRef),
      detailCard(
        "Affected schemas",
        "These schema artifacts contribute to the selected gap entry.",
        activeGap.affectedSchemaNames,
      ),
    );
    return;
  }

  elements.drawerTitle.textContent = activeEntry.label;
  elements.drawerBody.replaceChildren(
    detailCard(
      "Lineage",
      "Source-hash lineage remains visible so downstream model consumers can detect import drift.",
      [activeEntry.sourceHashAggregate, activeEntry.outputRef, activeEntry.toolId],
    ),
    detailCard(
      "Policy posture",
      "Exact decimals remain string aliases and nullability is expressed according to the named binding policy.",
      [activeEntry.decimalPolicyRef, activeEntry.nullabilityPolicy, activeEntry.coverageClass],
    ),
    detailCard(
      "Consuming surfaces",
      activeEntry.consumingSurfaceRefs.length
        ? "These repo surfaces are the intended readers of the selected generated row."
        : "This row is ledger-only and does not map to a consuming surface directly.",
      activeEntry.consumingSurfaceRefs,
    ),
    detailCard(
      "Schema coverage",
      "Selected row family coverage is anchored to the canonical contracts-core bundle.",
      activeEntry.affectedSchemaNames,
    ),
    detailCard(
      "Open gap entries",
      activeEntry.gapIds.length
        ? "Gap entries stay typed and explicit rather than being hidden inside the generated bindings."
        : "No typed gap entries are currently registered for this row.",
      activeEntry.gapIds.length ? activeEntry.gapIds : ["NO_TYPED_GAPS_REGISTERED"],
    ),
  );
}

function render() {
  const activeLanguage = resolveActiveLanguage();
  const activeEntry = resolveActiveEntry(activeLanguage);
  renderTopBar(activeLanguage);
  renderLanguageRail(activeLanguage);
  renderSummary(activeLanguage, activeEntry);
  renderLineageStrip(activeEntry);
  renderFamilyPlane(activeLanguage, activeEntry);
  renderOutputPlane(activeEntry);
  renderCoveragePlane(activeEntry);
  renderInspector(activeEntry);
}

async function init() {
  setMotionPreference();
  const response = await fetch(dataPath);
  state.payload = await response.json();
  render();
}

init().catch((error) => {
  console.error(error);
  elements.drawerTitle.textContent = "Binding atlas failed to load";
  elements.drawerBody.textContent = String(error);
});
