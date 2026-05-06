const dataPath = "./data/code-quality-atlas.json";

const state = {
  payload: null,
  activeFamilyRef: null,
  activeToolRef: null,
};

const elements = {
  repoBadge: document.querySelector("#repo-badge"),
  repoTitle: document.querySelector("#repo-title"),
  workspaceContext: document.querySelector("#workspace-context"),
  statusSentence: document.querySelector("#status-sentence"),
  familyList: document.querySelector("#family-list"),
  dependencyRibbon: document.querySelector("#dependency-ribbon"),
  familySummary: document.querySelector("#family-summary"),
  loomGrid: document.querySelector("#loom-grid"),
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

function familyMetaByRef(ref) {
  return state.payload.toolFamilies.find((family) => family.toolFamilyRef === ref) ?? null;
}

function toolGroupByFamilyRef(ref) {
  return state.payload.tools.find((group) => group.tool_family_ref === ref) ?? null;
}

function toolByRef(ref) {
  return (
    state.payload.tools.flatMap((group) => group.entries).find((entry) => entry.tool_ref === ref) ??
    null
  );
}

function resolveActiveFamily() {
  const fallback = state.payload.selectedToolFamilyRef;
  state.activeFamilyRef = state.activeFamilyRef ?? fallback;
  return familyMetaByRef(state.activeFamilyRef) ?? state.payload.toolFamilies[0];
}

function resolveActiveTool(group) {
  const selected = group.entries.find((entry) => entry.tool_ref === state.activeToolRef);
  if (!selected) {
    state.activeToolRef = group.entries[0]?.tool_ref ?? state.payload.selectedToolRef;
  }
  return toolByRef(state.activeToolRef) ?? group.entries[0];
}

function renderTopBar() {
  elements.repoBadge.textContent = state.payload.repositoryBadge;
  elements.repoTitle.textContent = state.payload.title;
  elements.workspaceContext.textContent = state.payload.workspaceContextChip;
  elements.statusSentence.textContent = state.payload.statusSentence;
}

function renderRibbon() {
  elements.dependencyRibbon.replaceChildren(
    ...state.payload.dependencyRibbon.map((step, index) =>
      chip(index === 0 ? step : `→ ${step}`, index === 1 ? "warning" : "neutral"),
    ),
  );
}

function familyToolCount(ref) {
  return toolGroupByFamilyRef(ref)?.entries.length ?? 0;
}

function renderFamilyRail(activeFamily) {
  elements.familyList.replaceChildren(
    ...state.payload.toolFamilies.map((family) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("aria-label", `${family.label} tool family`);
      button.setAttribute(
        "aria-current",
        family.toolFamilyRef === activeFamily.toolFamilyRef ? "true" : "false",
      );
      const meta = toolGroupByFamilyRef(family.toolFamilyRef);
      button.innerHTML = `
        <strong>${family.label}</strong>
        <div class="family-meta">
          <span>${meta?.entries[0]?.label ?? "policy"}</span>
          <span>${familyToolCount(family.toolFamilyRef)} tools</span>
        </div>
      `;
      button.addEventListener("click", () => {
        state.activeFamilyRef = family.toolFamilyRef;
        state.activeToolRef =
          toolGroupByFamilyRef(family.toolFamilyRef)?.entries[0]?.tool_ref ?? null;
        render();
      });
      item.append(button);
      return item;
    }),
  );
}

function toolTone(tool) {
  if (tool.blockingPolicy.includes("RELEASE") || tool.blockingPolicy.includes("BLOCKS_CI")) {
    return "danger";
  }
  if (tool.autofixPosture.includes("SAFE")) {
    return "success";
  }
  return "warning";
}

function createToolLabelButton(tool, active) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "tool-label-button";
  button.dataset.active = active ? "true" : "false";
  button.setAttribute("aria-label", `Tool band ${tool.label}`);
  button.innerHTML = `
    <strong>${tool.label}</strong>
    <div class="tool-meta">
      <span>${tool.coveredAreas.length} areas</span>
      <span>${tool.commandRef.split(" ")[0]}</span>
    </div>
  `;
  button.addEventListener("click", () => {
    state.activeToolRef = tool.tool_ref;
    renderInspector(tool);
    renderLoom();
  });
  return button;
}

function createStageCell(tool, cell, activeToolRef) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "stage-cell";
  button.dataset.posture = cell.posture;
  button.dataset.selected = tool.tool_ref === activeToolRef ? "true" : "false";
  button.setAttribute("aria-label", cell.accessibleLabel);
  button.textContent = cell.active ? "active" : "idle";
  button.addEventListener("click", () => {
    state.activeToolRef = tool.tool_ref;
    renderInspector(tool);
    renderLoom();
  });
  return button;
}

function renderLoom() {
  const activeFamily = resolveActiveFamily();
  const activeGroup = toolGroupByFamilyRef(activeFamily.toolFamilyRef);
  const activeTool = resolveActiveTool(activeGroup);

  elements.familySummary.textContent = activeFamily.summary;
  const nodes = [
    document.createElement("div"),
    ...state.payload.stageLanes.map((lane) => {
      const header = document.createElement("div");
      header.className = "stage-header";
      header.textContent = lane.label;
      return header;
    }),
  ];
  nodes[0].className = "stage-header blank";
  nodes[0].setAttribute("aria-hidden", "true");

  for (const tool of activeGroup.entries) {
    nodes.push(createToolLabelButton(tool, tool.tool_ref === activeTool.tool_ref));
    for (const cell of tool.stageCells) {
      nodes.push(createStageCell(tool, cell, activeTool.tool_ref));
    }
  }

  elements.loomGrid.replaceChildren(...nodes);
  renderInspector(activeTool);
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
      if (item.includes("/") || item.includes("pnpm ") || item.includes("python3 ")) {
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

function renderInspector(tool) {
  elements.drawerTitle.textContent = tool.label;

  const coverageSummary = tool.coveredAreas.map(
    (area) => `${area.label} · ${area.qualityClass} · ${area.areaRef}`,
  );
  const ignoredPolicies = tool.ignoredPolicies.length
    ? tool.ignoredPolicies.map(
        (policy) => `${policy.policyRef} · ${policy.classification} · ${policy.sourceOfTruth}`,
      )
    : ["No ignored policy refs."];
  const stageSummary = tool.stageCells.map(
    (cell) => `${cell.stageRef} · ${cell.posture} · ${cell.accessibleLabel}`,
  );

  elements.drawerBody.replaceChildren(
    detailCard("Tool summary", tool.summary, [
      `Autofix posture · ${tool.autofixPosture}`,
      `Blocking policy · ${tool.blockingPolicy}`,
    ]),
    detailCard("Command", "Deterministic command surface for this tool.", tool.commandRef),
    detailCard("Covered areas", "Declared repo areas mapped to this tool.", coverageSummary),
    detailCard("Covered paths", "Globs the selected tool is responsible for.", tool.coveredPaths),
    detailCard(
      "Ignored policies",
      "Generated, imported, or local-only paths intentionally excluded.",
      ignoredPolicies,
    ),
    detailCard("Stage cells", "Accessible labels for the active stage band row.", stageSummary),
    detailCard("Selection posture", "Family and enforcement tone for the current selection.", [
      `Family tone · ${toolTone(tool)}`,
      `Tool ref · ${tool.tool_ref}`,
    ]),
  );
}

function render() {
  const activeFamily = resolveActiveFamily();
  renderTopBar();
  renderRibbon();
  renderFamilyRail(activeFamily);
  renderLoom();
}

async function init() {
  setMotionPreference();
  const response = await fetch(dataPath);
  if (!response.ok) {
    throw new Error(`Unable to load ${dataPath}`);
  }

  state.payload = await response.json();
  state.activeFamilyRef = state.payload.selectedToolFamilyRef;
  state.activeToolRef = state.payload.selectedToolRef;
  render();
}

init().catch((error) => {
  elements.drawerTitle.textContent = "Unable to load code quality atlas";
  elements.drawerBody.textContent = error instanceof Error ? error.message : String(error);
  console.error(error);
});
