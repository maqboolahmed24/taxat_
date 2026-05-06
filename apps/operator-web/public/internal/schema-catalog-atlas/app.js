const dataPath = "./data/schema-catalog-atlas.json";

const state = {
  payload: null,
  activeFamilyRef: null,
  activeSchemaRef: null,
  activeFocusKind: "schema",
  activeFocusRef: null,
};

const elements = {
  bundleBadge: document.querySelector("#bundle-badge"),
  repoTitle: document.querySelector("#repo-title"),
  schemaCountBadge: document.querySelector("#schema-count-badge"),
  importPosture: document.querySelector("#import-posture"),
  summaryCopy: document.querySelector("#summary-copy"),
  referenceRibbon: document.querySelector("#reference-ribbon"),
  familyList: document.querySelector("#family-list"),
  identityList: document.querySelector("#identity-list"),
  lineageList: document.querySelector("#lineage-list"),
  bindingList: document.querySelector("#binding-list"),
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

function familyByRef(ref) {
  return state.payload.families.find((family) => family.family_ref === ref) ?? null;
}

function schemaByRef(ref) {
  return (
    state.payload.families
      .flatMap((family) => family.schemas)
      .find((schema) => schema.schemaName === ref) ?? null
  );
}

function resolveActiveFamily() {
  if (!state.activeFamilyRef) {
    state.activeFamilyRef = state.payload.selectedFamilyRef;
  }
  return familyByRef(state.activeFamilyRef) ?? state.payload.families[0];
}

function resolveActiveSchema(activeFamily) {
  if (
    !state.activeSchemaRef ||
    !activeFamily.schemas.some((schema) => schema.schemaName === state.activeSchemaRef)
  ) {
    state.activeSchemaRef =
      activeFamily.schemas.find((schema) => schema.schemaName === state.payload.selectedSchemaRef)
        ?.schemaName ??
      activeFamily.schemas[0]?.schemaName ??
      null;
  }
  return state.activeSchemaRef ? schemaByRef(state.activeSchemaRef) : null;
}

function createRow(ariaLabel, title, detail, chipsToAppend, active, onSelect) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "topology-row";
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

function renderTopBar() {
  elements.bundleBadge.textContent = state.payload.bundleBadge;
  elements.repoTitle.textContent = state.payload.title;
  elements.schemaCountBadge.textContent = state.payload.schemaCountBadge;
  elements.importPosture.textContent = state.payload.importPosture;
  elements.importPosture.dataset.status = state.payload.importPosture;
  elements.summaryCopy.textContent = state.payload.summary;
}

function renderReferenceRibbon(activeSchema) {
  const sampleCount = activeSchema.sampleRefs.length;
  elements.referenceRibbon.replaceChildren(
    chip(`schema ${activeSchema.schemaName}`, "neutral"),
    chip(
      `${sampleCount} sample${sampleCount === 1 ? "" : "s"}`,
      sampleCount ? "success" : "warning",
    ),
    chip("validator python entrypoints", "warning"),
  );
}

function renderFamilyRail(activeFamily) {
  elements.familyList.replaceChildren(
    ...state.payload.families.map((family) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute(
        "aria-current",
        family.family_ref === activeFamily.family_ref ? "true" : "false",
      );
      button.innerHTML = `
        <div class="family-title">
          <strong>${family.label}</strong>
        </div>
        <div class="family-meta">
          <span>${family.schemas.length} schemas</span>
          <span>${family.schemas.reduce((count, schema) => count + schema.sampleRefs.length, 0)} samples</span>
        </div>
      `;
      button.addEventListener("click", () => {
        state.activeFamilyRef = family.family_ref;
        state.activeSchemaRef = family.schemas[0]?.schemaName ?? null;
        state.activeFocusKind = "schema";
        state.activeFocusRef = state.activeSchemaRef;
        render();
      });
      item.append(button);
      return item;
    }),
  );
}

function renderIdentityPlane(activeFamily, activeSchema) {
  elements.identityList.replaceChildren(
    ...activeFamily.schemas.map((schema) =>
      createRow(
        `Schema row ${schema.label}`,
        schema.label,
        `${schema.schemaId} · ${schema.destinationPath}`,
        [
          statusChip(schema.importStatus, schema.importStatus),
          chip(schema.logicalFamilyLabel, "neutral"),
        ],
        state.activeFocusKind === "schema" && activeSchema?.schemaName === schema.schemaName,
        () => {
          state.activeSchemaRef = schema.schemaName;
          state.activeFocusKind = "schema";
          state.activeFocusRef = schema.schemaName;
          render();
        },
      ),
    ),
  );
}

function renderLineagePlane(activeSchema) {
  const rows = [
    {
      ref: `${activeSchema.schemaName}:source`,
      label: "Upstream source",
      detail: activeSchema.sourcePath,
      chips: [chip(activeSchema.sourceHash.slice(0, 12), "warning")],
    },
    {
      ref: `${activeSchema.schemaName}:mirror`,
      label: "Imported mirror",
      detail: activeSchema.destinationPath,
      chips: [chip(activeSchema.destinationHash.slice(0, 12), "success")],
    },
    ...activeSchema.refTargets.map((ref) => ({
      ref: `${activeSchema.schemaName}:ref:${ref}`,
      label: "Reference",
      detail: ref,
      chips: [
        chip(
          ref.startsWith("#/") ? "local" : "schema",
          ref.startsWith("#/") ? "neutral" : "warning",
        ),
      ],
    })),
  ];

  elements.lineageList.replaceChildren(
    ...rows.map((row) =>
      createRow(
        `Lineage row ${row.label} ${row.detail}`,
        row.label,
        row.detail,
        row.chips,
        state.activeFocusKind === "lineage" && state.activeFocusRef === row.ref,
        () => {
          state.activeFocusKind = "lineage";
          state.activeFocusRef = row.ref;
          renderInspector(activeSchema);
          renderLineagePlane(activeSchema);
          renderBindingPlane(activeSchema);
        },
      ),
    ),
  );
}

function renderBindingPlane(activeSchema) {
  const rows = [
    ...activeSchema.sampleRefs.map((sampleName) => ({
      ref: `${activeSchema.schemaName}:sample:${sampleName}`,
      label: sampleName,
      detail: "Bundled sample payload mirrored from Algorithm/schemas by filename convention.",
      chips: [chip("sample", "success")],
    })),
    ...state.payload.validators.map((validator) => ({
      ref: `${activeSchema.schemaName}:validator:${validator.artifactRef}`,
      label: validator.artifactRef,
      detail: validator.command,
      chips: [chip("validator", "warning")],
    })),
  ];

  elements.bindingList.replaceChildren(
    ...rows.map((row) =>
      createRow(
        `Binding row ${row.label}`,
        row.label,
        row.detail,
        row.chips,
        state.activeFocusKind === "binding" && state.activeFocusRef === row.ref,
        () => {
          state.activeFocusKind = "binding";
          state.activeFocusRef = row.ref;
          renderInspector(activeSchema);
          renderBindingPlane(activeSchema);
          renderLineagePlane(activeSchema);
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
        item.includes("/") ||
        item.startsWith("https://") ||
        item.startsWith("python3 ") ||
        /^[0-9a-f]{12,}$/i.test(item)
          ? "mono"
          : "";
      entry.textContent = item;
      list.append(entry);
    });
    section.append(list);
  }
  return section;
}

function renderInspector(activeSchema) {
  elements.drawerTitle.textContent = activeSchema.label;

  const container = document.createElement("div");
  container.className = "detail-grid";

  const fields = document.createElement("div");
  fields.className = "field-list";
  fields.append(
    ...[
      ["Schema ID", activeSchema.schemaId],
      ["Imported path", activeSchema.destinationPath],
      ["Source path", activeSchema.sourcePath],
      ["Source hash", activeSchema.sourceHash],
      ["Logical family", activeSchema.logicalFamilyLabel],
    ].map(([label, value]) => {
      const article = document.createElement("article");
      article.className = "field-row";
      article.innerHTML = `<strong>${label}</strong><span class="${
        label.includes("path") || label.includes("hash") || label === "Schema ID" ? "mono" : ""
      }">${value}</span>`;
      return article;
    }),
  );

  container.append(
    fields,
    detailCard(
      "Source and mirror lineage",
      "Imported contracts remain byte-stable mirrors for schemas and samples, with validator entrypoints adapted only for repo path context.",
      [
        activeSchema.sourcePath,
        activeSchema.destinationPath,
        activeSchema.sourceHash,
        activeSchema.destinationHash,
      ],
    ),
    detailCard(
      "Reference closure",
      activeSchema.refTargets.length
        ? "Every recorded $ref stays visible here so downstream codegen and review can verify closure without opening raw JSON first."
        : "This schema carries no external or local $ref targets.",
      activeSchema.refTargets.length ? activeSchema.refTargets : ["No $ref targets"],
    ),
    detailCard(
      "Bundled samples",
      activeSchema.sampleRefs.length
        ? "Bundled sample payloads bind by filename convention and stay machine-readable for downstream tooling."
        : "No bundled sample payload is present for this schema.",
      activeSchema.sampleRefs.length ? activeSchema.sampleRefs : ["No bundled samples"],
    ),
    detailCard(
      "Validator lineage",
      "The imported Python entrypoints remain authoritative and executable from the shared contracts package.",
      state.payload.validators.map((validator) => validator.command),
    ),
  );

  elements.drawerBody.replaceChildren(container);
}

function render() {
  const activeFamily = resolveActiveFamily();
  const activeSchema = resolveActiveSchema(activeFamily);
  if (!activeFamily || !activeSchema) {
    return;
  }
  renderTopBar();
  renderReferenceRibbon(activeSchema);
  renderFamilyRail(activeFamily);
  renderIdentityPlane(activeFamily, activeSchema);
  renderLineagePlane(activeSchema);
  renderBindingPlane(activeSchema);
  renderInspector(activeSchema);
}

async function boot() {
  setMotionPreference();
  const response = await fetch(dataPath);
  state.payload = await response.json();
  state.activeFamilyRef = state.payload.selectedFamilyRef;
  state.activeSchemaRef = state.payload.selectedSchemaRef;
  state.activeFocusKind = "schema";
  state.activeFocusRef = state.activeSchemaRef;
  render();
}

boot().catch((error) => {
  elements.drawerTitle.textContent = "Schema atlas failed to load";
  const pre = document.createElement("pre");
  pre.textContent = error instanceof Error ? error.message : String(error);
  elements.drawerBody.replaceChildren(pre);
});
