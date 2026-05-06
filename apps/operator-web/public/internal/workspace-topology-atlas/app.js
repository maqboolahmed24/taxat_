const dataPath = "./data/workspace-topology-atlas.json";

const state = {
  payload: null,
  activeFamilyRef: null,
  activeNodeRef: null,
  activeFocusKind: "node",
  activeFocusRef: null,
};

const elements = {
  repoBadge: document.querySelector("#repo-badge"),
  repoTitle: document.querySelector("#repo-title"),
  languageStackBadge: document.querySelector("#language-stack-badge"),
  bootstrapPosture: document.querySelector("#bootstrap-posture"),
  familyList: document.querySelector("#family-list"),
  summaryCopy: document.querySelector("#summary-copy"),
  legendStrip: document.querySelector("#legend-strip"),
  ownershipList: document.querySelector("#ownership-list"),
  dependencyList: document.querySelector("#dependency-list"),
  runtimeList: document.querySelector("#runtime-list"),
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

function familySummary(family) {
  const bootstrapped = family.nodes.filter((node) => node.status === "BOOTSTRAPPED").length;
  return `${bootstrapped}/${family.nodes.length} bootstrapped`;
}

function familyByRef(ref) {
  return state.payload.families.find((family) => family.family_ref === ref) ?? null;
}

function nodeByRef(ref) {
  return (
    state.payload.families
      .flatMap((family) => family.nodes)
      .find((node) => node.node_ref === ref) ?? null
  );
}

function resolveActiveFamily() {
  if (!state.activeFamilyRef) {
    state.activeFamilyRef = state.payload.selectedFamilyRef;
  }
  return familyByRef(state.activeFamilyRef) ?? state.payload.families[0];
}

function resolveActiveNode(family) {
  if (!state.activeNodeRef || !family.nodes.some((node) => node.node_ref === state.activeNodeRef)) {
    state.activeNodeRef =
      family.nodes.find((node) => node.node_ref === state.payload.selectedNodeRef)?.node_ref ??
      family.nodes[0]?.node_ref ??
      null;
  }
  return state.activeNodeRef ? nodeByRef(state.activeNodeRef) : null;
}

function focusPayload(activeNode) {
  if (state.activeFocusKind === "dependency") {
    return nodeByRef(state.activeFocusRef);
  }
  return activeNode;
}

function renderTopBar() {
  elements.repoBadge.textContent = state.payload.repositoryBadge;
  elements.repoTitle.textContent = state.payload.title;
  elements.languageStackBadge.textContent = state.payload.languageStackBadge;
  elements.bootstrapPosture.textContent = state.payload.bootstrapPosture;
  elements.bootstrapPosture.dataset.status = state.payload.bootstrapPosture;
  elements.summaryCopy.textContent = state.payload.summary;
}

function renderLegend() {
  elements.legendStrip.replaceChildren(
    ...state.payload.legend.map((entry) => chip(entry.label, entry.tone)),
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
          <span>${familySummary(family)}</span>
          <span>${family.nodes.length} nodes</span>
        </div>
      `;
      button.addEventListener("click", () => {
        state.activeFamilyRef = family.family_ref;
        state.activeNodeRef = family.nodes[0]?.node_ref ?? null;
        state.activeFocusKind = "node";
        state.activeFocusRef = state.activeNodeRef;
        render();
      });
      item.append(button);
      return item;
    }),
  );
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

function renderOwnershipPlane(activeFamily, activeNode) {
  elements.ownershipList.replaceChildren(
    ...activeFamily.nodes.map((node) =>
      createRow(
        `Ownership row ${node.label}`,
        node.label,
        `${node.runtime_surface} · ${node.path}`,
        [statusChip(node.status, node.status), chip(node.owner_team_handle, "neutral")],
        state.activeFocusKind === "node" && activeNode?.node_ref === node.node_ref,
        () => {
          state.activeNodeRef = node.node_ref;
          state.activeFocusKind = "node";
          state.activeFocusRef = node.node_ref;
          render();
        },
      ),
    ),
  );
}

function renderDependencyPlane(activeNode) {
  const rows = activeNode.dependencies.length
    ? activeNode.dependencies.map((dependencyRef) => {
        const dependencyNode = nodeByRef(dependencyRef);
        return {
          ref: dependencyRef,
          label: dependencyNode?.label ?? dependencyRef,
          detail: dependencyNode
            ? `${dependencyNode.path} · layer ${dependencyNode.layer}`
            : "Planned dependency edge",
          chips: [
            chip(`L${dependencyNode?.layer ?? "?"}`, "warning"),
            chip(
              dependencyNode?.status ?? "PLANNED",
              dependencyNode?.status === "BOOTSTRAPPED" ? "success" : "warning",
            ),
          ],
        };
      })
    : [
        {
          ref: `${activeNode.node_ref}:root`,
          label: "No upstream runtime dependencies",
          detail:
            "This node anchors the graph at its current layer and remains a leaf in the dependency plane.",
          chips: [chip(`L${activeNode.layer}`, "neutral")],
        },
      ];

  elements.dependencyList.replaceChildren(
    ...rows.map((row) =>
      createRow(
        `Dependency / Task Graph row ${row.label}`,
        row.label,
        row.detail,
        row.chips,
        state.activeFocusKind === "dependency" && state.activeFocusRef === row.ref,
        () => {
          state.activeFocusKind = "dependency";
          state.activeFocusRef = row.ref;
          renderInspector(activeNode);
        },
      ),
    ),
  );
}

function renderRuntimePlane(activeNode) {
  const runtimeRows = activeNode.task_families.map((taskFamily) => ({
    ref: `${activeNode.node_ref}:${taskFamily}`,
    label: taskFamily,
    detail: `${activeNode.runtime_surface} · ${activeNode.primary_task_count} mapped future tasks`,
  }));

  elements.runtimeList.replaceChildren(
    ...runtimeRows.map((row) =>
      createRow(
        `Runtime Surface row ${row.label}`,
        row.label,
        row.detail,
        [
          chip(activeNode.category.replaceAll("_", " "), "neutral"),
          chip(`layer ${activeNode.layer}`, "warning"),
        ],
        state.activeFocusKind === "task" && state.activeFocusRef === row.ref,
        () => {
          state.activeFocusKind = "task";
          state.activeFocusRef = row.ref;
          renderInspector(activeNode);
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
      entry.className = item.startsWith("@taxat/") || item.includes("/") ? "mono" : "";
      entry.textContent = item;
      list.append(entry);
    });
    section.append(list);
  }
  return section;
}

function renderInspector(activeNode) {
  const focusedNode = focusPayload(activeNode) ?? activeNode;
  const overrideLines = state.payload.overrides
    .filter(
      (entry) =>
        entry.adopted === focusedNode.path ||
        entry.adopted === focusedNode.node_ref ||
        entry.adopted.includes(focusedNode.path),
    )
    .map((entry) => `${entry.requested} -> ${entry.adopted}`);

  elements.drawerTitle.textContent =
    state.activeFocusKind === "task"
      ? `${activeNode.label} / ${String(state.activeFocusRef).split(":").at(-1)}`
      : focusedNode.label;

  const container = document.createElement("div");
  container.className = "detail-grid";

  const fields = document.createElement("div");
  fields.className = "field-list";
  fields.append(
    ...[
      ["Path", focusedNode.path],
      ["Owner", focusedNode.owner_team_handle],
      ["Runtime surface", focusedNode.runtime_surface],
      ["Category", focusedNode.category],
      ["Status", focusedNode.status],
      ["Layer", String(focusedNode.layer)],
    ].map(([label, value]) => {
      const article = document.createElement("article");
      article.className = "field-row";
      article.innerHTML = `<strong>${label}</strong><span class="${
        label === "Path" ? "mono" : ""
      }">${value}</span>`;
      return article;
    }),
  );

  container.append(
    fields,
    detailCard("Responsibility", focusedNode.detail, [focusedNode.note]),
    detailCard(
      "Dependencies",
      focusedNode.dependencies.length
        ? "Allowed upstream imports and graph predecessors for this node."
        : "This node is currently a root or leaf for the selected family context.",
      focusedNode.dependencies.length
        ? focusedNode.dependencies
        : ["No upstream runtime dependencies"],
    ),
    detailCard(
      "Task and override posture",
      "Bootstrap task families remain deterministic placeholders until later phase work replaces them with concrete build/test pipelines.",
      [...focusedNode.task_families, ...overrideLines],
    ),
  );

  if (focusedNode.source_refs?.length) {
    container.append(
      detailCard(
        "Source contracts",
        "Named algorithm and ADR references that justify this workspace boundary.",
        focusedNode.source_refs,
      ),
    );
  }

  elements.drawerBody.replaceChildren(container);
}

function render() {
  const activeFamily = resolveActiveFamily();
  const activeNode = resolveActiveNode(activeFamily);
  if (!activeFamily || !activeNode) {
    return;
  }
  renderFamilyRail(activeFamily);
  renderOwnershipPlane(activeFamily, activeNode);
  renderDependencyPlane(activeNode);
  renderRuntimePlane(activeNode);
  renderInspector(activeNode);
}

async function boot() {
  setMotionPreference();
  const response = await fetch(dataPath);
  state.payload = await response.json();
  renderTopBar();
  renderLegend();
  state.activeFamilyRef = state.payload.selectedFamilyRef;
  state.activeNodeRef = state.payload.selectedNodeRef;
  state.activeFocusKind = "node";
  state.activeFocusRef = state.activeNodeRef;
  render();
}

boot().catch((error) => {
  elements.drawerTitle.textContent = "Workspace atlas failed to load";
  const pre = document.createElement("pre");
  pre.textContent = error instanceof Error ? error.message : String(error);
  elements.drawerBody.replaceChildren(pre);
});
