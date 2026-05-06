const dataPath = "./data/environment-basis-atlas.json";

const state = {
  payload: null,
  activeConsumerRef: null,
  activeVariableRef: null,
};

const elements = {
  familyBadge: document.querySelector("#family-badge"),
  pageTitle: document.querySelector("#page-title"),
  consumerChip: document.querySelector("#consumer-chip"),
  variableChip: document.querySelector("#variable-chip"),
  basisStatement: document.querySelector("#basis-statement"),
  consumerList: document.querySelector("#consumer-list"),
  lineageStrip: document.querySelector("#lineage-strip"),
  strataGrid: document.querySelector("#strata-grid"),
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

function consumerByRef(consumerRef) {
  return state.payload.consumers.find((consumer) => consumer.consumer_ref === consumerRef) ?? null;
}

function resolveActiveConsumer() {
  state.activeConsumerRef = state.activeConsumerRef ?? state.payload.selectedConsumerRef;
  return consumerByRef(state.activeConsumerRef) ?? state.payload.consumers[0];
}

function variableByRef(consumer, variableRef) {
  return consumer.variables.find((variable) => variable.variable_ref === variableRef) ?? null;
}

function resolveActiveVariable(consumer) {
  const fallback = state.activeVariableRef ?? state.payload.selectedVariableRef;
  const resolved = variableByRef(consumer, fallback) ?? consumer.variables[0];
  state.activeVariableRef = resolved?.variable_ref ?? null;
  return resolved;
}

function renderTopBar(consumer, variable) {
  elements.familyBadge.textContent = state.payload.environmentFamilyBadge;
  elements.pageTitle.textContent = state.payload.title;
  elements.consumerChip.textContent = consumer.label;
  elements.variableChip.textContent = variable?.label ?? "No variable selected";
  elements.basisStatement.textContent = state.payload.basisStatement;
}

function renderConsumerRail(activeConsumer) {
  elements.consumerList.replaceChildren(
    ...state.payload.consumers.map((consumer) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "rail-button";
      button.setAttribute("aria-label", `${consumer.label} runtime consumer`);
      button.setAttribute(
        "aria-current",
        consumer.consumer_ref === activeConsumer.consumer_ref ? "true" : "false",
      );
      button.innerHTML = `
        <strong>${consumer.label}</strong>
        <span>${consumer.runtime_boundary}</span>
      `;
      button.addEventListener("click", () => {
        state.activeConsumerRef = consumer.consumer_ref;
        state.activeVariableRef = consumer.variables[0]?.variable_ref ?? null;
        render();
      });
      item.append(button);
      return item;
    }),
  );
}

function renderLineage(consumer) {
  const nodes = consumer.source_lineage.length
    ? consumer.source_lineage.map((entry, index) =>
        chip(index === 0 ? entry : `→ ${entry}`, index === 0 ? "teal" : "neutral"),
      )
    : [chip("No lineage declared", "neutral")];
  elements.lineageStrip.replaceChildren(...nodes);
}

function createVariableButton(variable, active) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "variable-button";
  button.dataset.active = active ? "true" : "false";
  button.setAttribute("aria-label", `Variable family ${variable.label}`);
  button.innerHTML = `
    <strong>${variable.label}</strong>
    <span>${variable.classification}</span>
  `;
  button.addEventListener("click", () => {
    state.activeVariableRef = variable.variable_ref;
    render();
  });
  return button;
}

function createPathCell(variable, cell, active) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "path-cell";
  button.dataset.status = cell.status;
  button.dataset.active = active ? "true" : "false";
  button.dataset.tone = variable.tone;
  button.setAttribute("aria-label", cell.accessible_label);
  button.innerHTML = `
    <span class="path-mark"></span>
    <span class="path-text">${cell.status === "ALLOW" ? "allow" : cell.status === "BLOCKED" ? "blocked" : "n/a"}</span>
  `;
  button.addEventListener("click", () => {
    state.activeVariableRef = variable.variable_ref;
    render();
  });
  return button;
}

function renderStrataGrid(consumer, activeVariable) {
  const nodes = [];

  const corner = document.createElement("div");
  corner.className = "grid-corner";
  corner.setAttribute("aria-hidden", "true");
  nodes.push(corner);

  for (const stratum of state.payload.strata) {
    const header = document.createElement("div");
    header.className = "stratum-header";

    const title = document.createElement("h3");
    title.textContent = stratum.label;
    header.append(title);

    const summary = document.createElement("p");
    summary.textContent = stratum.summary;
    header.append(summary);

    nodes.push(header);
  }

  for (const variable of consumer.variables) {
    const active = variable.variable_ref === activeVariable?.variable_ref;
    nodes.push(createVariableButton(variable, active));
    for (const cell of variable.path_cells) {
      nodes.push(createPathCell(variable, cell, active));
    }
  }

  elements.strataGrid.replaceChildren(...nodes);
}

function detailCard(title, description, content) {
  const card = document.createElement("section");
  card.className = "detail-card";

  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = title;
  card.append(eyebrow);

  if (description) {
    const note = document.createElement("p");
    note.className = "ledger-note";
    note.textContent = description;
    card.append(note);
  }

  if (Array.isArray(content)) {
    const list = document.createElement("ul");
    for (const item of content) {
      const entry = document.createElement("li");
      if (item.includes("TAXAT_") || item.includes("CONFIG") || item.includes("SECRET")) {
        entry.className = "mono";
      }
      entry.textContent = item;
      list.append(entry);
    }
    card.append(list);
  } else if (content) {
    const pre = document.createElement("pre");
    pre.textContent = content;
    card.append(pre);
  }

  return card;
}

function renderInspector(consumer, variable) {
  elements.drawerTitle.textContent = variable.label;
  elements.drawerBody.replaceChildren(
    detailCard("Consumer boundary", consumer.basis_statement, [
      `Runtime boundary · ${consumer.runtime_boundary}`,
      `Browser-safe projection · ${consumer.browser_safe_projection}`,
    ]),
    detailCard("Allowed keys", "Keys this consumer may lawfully receive.", consumer.allowed_keys),
    detailCard(
      "Forbidden keys",
      "Configured keys that fail closed for this consumer.",
      consumer.forbidden_keys,
    ),
    detailCard(
      "Source lineage",
      "Resolution order and freeze posture for the selected consumer.",
      consumer.source_lineage,
    ),
    detailCard(
      "Typed failure modes",
      "Errors surfaced without leaking raw secret values.",
      consumer.failure_modes,
    ),
    detailCard("Variable posture", variable.summary, [
      `Classification · ${variable.classification}`,
      `Browser safe · ${variable.inspector.browser_safe}`,
      `Blocked reason · ${variable.inspector.blocked_reason}`,
    ]),
    detailCard(
      "Allowed sources",
      "Only these sources may populate the selected variable.",
      variable.inspector.allowed_sources,
    ),
    detailCard("Notes", "Policy notes carried into the read-only atlas.", variable.inspector.notes),
  );
}

function render() {
  const consumer = resolveActiveConsumer();
  const variable = resolveActiveVariable(consumer);
  renderTopBar(consumer, variable);
  renderConsumerRail(consumer);
  renderLineage(consumer);
  renderStrataGrid(consumer, variable);
  if (variable) {
    renderInspector(consumer, variable);
  }
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
  elements.drawerTitle.textContent = "Atlas load failure";
  elements.drawerBody.textContent = error instanceof Error ? error.message : String(error);
  console.error(error);
});
