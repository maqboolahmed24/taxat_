const dataPath = "./data/role-template-matrix-preview.json";

const decisionOrder = [
  "ALLOW",
  "ALLOW_MASKED",
  "REQUIRE_STEP_UP",
  "REQUIRE_APPROVAL",
  "DENY",
];

const pendingModes = [
  {
    value: "ALL",
    label: "All cells",
  },
  {
    value: "ONLY_PENDING",
    label: "Only pending",
  },
  {
    value: "ONLY_CLEAN",
    label: "Only clean",
  },
];

const state = {
  payload: null,
  filters: {
    resourceClasses: new Set(),
    actionFamilies: new Set(),
    decisionOutcomes: new Set(),
    pendingChangePresence: "ALL",
  },
  selectedCellRef: null,
  focusAnchorRef: null,
  recovery: null,
  renderedCellButtons: new Map(),
  cellByRef: new Map(),
  rowByResource: new Map(),
  columnByAction: new Map(),
};

const elements = {
  pageSubtitle: document.querySelector("#page-subtitle"),
  roleChip: document.querySelector("#role-chip"),
  policyHashChip: document.querySelector("#policy-hash-chip"),
  versionHashChip: document.querySelector("#version-hash-chip"),
  staleChip: document.querySelector("#stale-chip"),
  statusNarrative: document.querySelector("#status-narrative"),
  filterSummary: document.querySelector("#filter-summary"),
  clearFilters: document.querySelector("#clear-filters"),
  resourceFilters: document.querySelector("#resource-filters"),
  actionFilters: document.querySelector("#action-filters"),
  decisionFilters: document.querySelector("#decision-filters"),
  pendingFilters: document.querySelector("#pending-filters"),
  basisStatement: document.querySelector("#basis-statement"),
  summaryStrip: document.querySelector("#summary-strip"),
  recoveryBanner: document.querySelector("#recovery-banner"),
  matrixHead: document.querySelector("#matrix-head"),
  matrixBody: document.querySelector("#matrix-body"),
  emptyState: document.querySelector("#empty-state"),
  emptyStateMessage: document.querySelector("#empty-state-message"),
  inspectorTitle: document.querySelector("#inspector-title"),
  inspectorSummary: document.querySelector("#inspector-summary"),
  inspectorBody: document.querySelector("#inspector-body"),
};

function setMotionPreference() {
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const sync = () => {
    document.documentElement.dataset.motion = motionQuery.matches ? "reduce" : "standard";
  };
  sync();
  motionQuery.addEventListener("change", sync);
}

function humanize(value) {
  return value
    .replaceAll(".", " / ")
    .replaceAll("_", " ")
    .replaceAll(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function decisionLabel(decision) {
  switch (decision) {
    case "ALLOW":
      return "Allow";
    case "ALLOW_MASKED":
      return "Masked";
    case "REQUIRE_STEP_UP":
      return "Step-up";
    case "REQUIRE_APPROVAL":
      return "Approval";
    case "DENY":
      return "Deny";
    default:
      return decision;
  }
}

function toneForDecision(decision) {
  switch (decision) {
    case "ALLOW":
      return "success";
    case "ALLOW_MASKED":
      return "sage";
    case "REQUIRE_STEP_UP":
      return "indigo";
    case "REQUIRE_APPROVAL":
      return "bronze";
    case "DENY":
      return "danger";
    default:
      return "indigo";
  }
}

function toneForStatus(status) {
  switch (status) {
    case "STEADY":
      return "success";
    case "STALE_REVIEW_REQUIRED":
      return "warning";
    case "RECOVERY_REQUIRED":
      return "danger";
    default:
      return "indigo";
  }
}

function monospaceHash(label, value) {
  return `${label} ${value.slice(0, 12)}…${value.slice(-6)}`;
}

function createChip(label, tone = "indigo", mono = false) {
  const span = document.createElement("span");
  span.className = "chip";
  span.dataset.tone = tone;
  if (mono) {
    span.classList.add("chip--mono");
  }
  span.textContent = label;
  return span;
}

function createToken(label, tone = "indigo") {
  const span = document.createElement("span");
  span.className = "token";
  span.dataset.tone = tone;
  span.textContent = label;
  return span;
}

function createFilterButton({ label, pressed, onClick, ariaLabel }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "filter-pill";
  button.textContent = label;
  button.setAttribute("aria-label", ariaLabel);
  button.setAttribute("aria-pressed", pressed ? "true" : "false");
  button.addEventListener("click", onClick);
  return button;
}

function currentMatrix() {
  return state.payload.matrix;
}

function currentSnapshot() {
  return state.payload.snapshot;
}

function resultCells() {
  return currentMatrix().matrix_cells.filter((cell) => {
    const resourceMatch =
      state.filters.resourceClasses.size === 0 ||
      state.filters.resourceClasses.has(cell.resource_class);
    const actionMatch =
      state.filters.actionFamilies.size === 0 ||
      state.filters.actionFamilies.has(cell.action_family);
    const decisionMatch =
      state.filters.decisionOutcomes.size === 0 ||
      state.filters.decisionOutcomes.has(cell.decision);
    const pendingMatch =
      state.filters.pendingChangePresence === "ALL" ||
      (state.filters.pendingChangePresence === "ONLY_PENDING" &&
        cell.pending_change_ref_or_null !== null) ||
      (state.filters.pendingChangePresence === "ONLY_CLEAN" &&
        cell.pending_change_ref_or_null === null);
    return resourceMatch && actionMatch && decisionMatch && pendingMatch;
  });
}

function visibleRows(cells) {
  const visibleResources = new Set(cells.map((cell) => cell.resource_class));
  return currentMatrix().matrix_rows.filter((row) => visibleResources.has(row.resource_class));
}

function visibleColumns(cells) {
  const visibleActions = new Set(cells.map((cell) => cell.action_family));
  return currentMatrix().matrix_columns.filter((column) => visibleActions.has(column.action_family));
}

function cellByTuple(resourceClass, actionFamily) {
  return state.cellByRef.get(`cell.${resourceClass}.${actionFamily}`) ?? null;
}

function sentenceForCell(cell) {
  const roleLabel = currentMatrix().role_label.toLowerCase();
  const resource = humanize(cell.resource_class).toLowerCase();
  const action = humanize(cell.action_family).toLowerCase();
  switch (cell.decision) {
    case "ALLOW":
      return `role ${roleLabel} allows ${action} on ${resource}`;
    case "ALLOW_MASKED":
      return `role ${roleLabel} allows masked ${action} on ${resource}`;
    case "REQUIRE_STEP_UP":
      return `role ${roleLabel} requires step up for ${action} on ${resource}`;
    case "REQUIRE_APPROVAL":
      return `role ${roleLabel} requires approval for ${action} on ${resource}`;
    case "DENY":
      return `role ${roleLabel} denies ${action} on ${resource}`;
    default:
      return `role ${roleLabel} exposes ${action} on ${resource}`;
  }
}

function detailSentence(cell) {
  const clauses = [sentenceForCell(cell)];
  if (cell.required_authn_level) {
    clauses.push(`authn ${cell.required_authn_level.toLowerCase()}`);
  }
  if (cell.required_approvals.length > 0) {
    clauses.push(`approvals ${cell.required_approvals.length}`);
  }
  if (cell.pending_change_ref_or_null) {
    clauses.push("pending change present");
  }
  return clauses.join(" and ");
}

function renderTopBar() {
  const snapshot = currentSnapshot();
  const matrix = currentMatrix();
  elements.pageSubtitle.textContent =
    "The browser reads one published policy snapshot and one published role matrix. Filters, focus, and selection stay query-local.";
  elements.roleChip.textContent = `${matrix.role_label} (${matrix.role_id})`;
  elements.roleChip.title = matrix.role_id;
  elements.policyHashChip.textContent = monospaceHash(
    "Policy",
    snapshot.policy_snapshot_hash,
  );
  elements.policyHashChip.title = snapshot.policy_snapshot_hash;
  elements.versionHashChip.textContent = monospaceHash("Version", matrix.version_hash);
  elements.versionHashChip.title = matrix.version_hash;
  elements.staleChip.dataset.tone = toneForStatus(snapshot.settlement_state);
  elements.staleChip.textContent = humanize(snapshot.settlement_state);
  elements.statusNarrative.textContent =
    snapshot.settlement_state === "STALE_REVIEW_REQUIRED"
      ? "The reviewed policy hash is intentionally stale in this preview, so stale-view posture is explicit before any route-local filtering happens."
      : "The reviewed policy hash matches the published policy slice.";
  elements.basisStatement.textContent =
    "Pending edits and latest simulation refs remain visible governance context, but they do not mutate the committed policy snapshot hash.";
}

function renderFilters(cells) {
  const resources = currentMatrix().matrix_rows.map((row) => row.resource_class);
  const actions = currentMatrix().matrix_columns.map((column) => column.action_family);
  const decisions = decisionOrder.filter((decision) =>
    currentMatrix().matrix_cells.some((cell) => cell.decision === decision),
  );

  elements.resourceFilters.replaceChildren(
    ...resources.map((resourceClass) =>
      createFilterButton({
        label: humanize(resourceClass),
        pressed: state.filters.resourceClasses.has(resourceClass),
        ariaLabel: `Filter resource class ${humanize(resourceClass)}`,
        onClick: () => {
          if (state.filters.resourceClasses.has(resourceClass)) {
            state.filters.resourceClasses.delete(resourceClass);
          } else {
            state.filters.resourceClasses.add(resourceClass);
          }
          renderWorkspace();
        },
      }),
    ),
  );

  elements.actionFilters.replaceChildren(
    ...actions.map((actionFamily) =>
      createFilterButton({
        label: humanize(actionFamily),
        pressed: state.filters.actionFamilies.has(actionFamily),
        ariaLabel: `Filter action family ${humanize(actionFamily)}`,
        onClick: () => {
          if (state.filters.actionFamilies.has(actionFamily)) {
            state.filters.actionFamilies.delete(actionFamily);
          } else {
            state.filters.actionFamilies.add(actionFamily);
          }
          renderWorkspace();
        },
      }),
    ),
  );

  elements.decisionFilters.replaceChildren(
    ...decisions.map((decision) =>
      createFilterButton({
        label: decisionLabel(decision),
        pressed: state.filters.decisionOutcomes.has(decision),
        ariaLabel: `Filter decision outcome ${decisionLabel(decision)}`,
        onClick: () => {
          if (state.filters.decisionOutcomes.has(decision)) {
            state.filters.decisionOutcomes.delete(decision);
          } else {
            state.filters.decisionOutcomes.add(decision);
          }
          renderWorkspace();
        },
      }),
    ),
  );

  elements.pendingFilters.replaceChildren(
    ...pendingModes.map((mode) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "segment-button";
      button.textContent = mode.label;
      button.setAttribute("aria-label", `Filter pending change presence ${mode.label}`);
      button.setAttribute(
        "aria-pressed",
        state.filters.pendingChangePresence === mode.value ? "true" : "false",
      );
      button.addEventListener("click", () => {
        state.filters.pendingChangePresence = mode.value;
        renderWorkspace();
      });
      return button;
    }),
  );

  const activeFilterParts = [
    state.filters.resourceClasses.size === 0
      ? "all resources"
      : `${state.filters.resourceClasses.size} resource filters`,
    state.filters.actionFamilies.size === 0
      ? "all actions"
      : `${state.filters.actionFamilies.size} action filters`,
    state.filters.decisionOutcomes.size === 0
      ? "all outcomes"
      : `${state.filters.decisionOutcomes.size} outcome filters`,
    state.filters.pendingChangePresence === "ALL"
      ? "pending: all"
      : state.filters.pendingChangePresence === "ONLY_PENDING"
        ? "pending: only pending"
        : "pending: only clean",
  ];

  elements.filterSummary.textContent = `${cells.length} visible cells across ${activeFilterParts.join(
    ", ",
  )}.`;
}

function clearSelectionRecoveryIfVisible(cells) {
  const visibleRefs = new Set(cells.map((cell) => cell.cell_ref));
  if (state.selectedCellRef && visibleRefs.has(state.selectedCellRef)) {
    state.recovery = null;
    return;
  }

  if (state.selectedCellRef && !visibleRefs.has(state.selectedCellRef)) {
    state.selectedCellRef = null;
    state.focusAnchorRef = null;
    state.recovery = {
      settlement: "RECOVERY_REQUIRED",
      posture: "ACCESS_REBIND_REQUIRED",
      message:
        "The selected cell is no longer visible in the filtered slice. Rebind inspector context by choosing a visible decision cell.",
    };
    return;
  }

  if (cells.length === 0) {
    state.recovery = {
      settlement: "RECOVERY_REQUIRED",
      posture: "ACCESS_REBIND_REQUIRED",
      message:
        "No matrix cells match the current filter set. Clear or broaden filters to recover a visible slice.",
    };
  }
}

function currentStatus(cells) {
  if (state.recovery) {
    return state.recovery;
  }
  if (cells.length === 0) {
    return {
      settlement: "RECOVERY_REQUIRED",
      posture: "ACCESS_REBIND_REQUIRED",
      message:
        "No matrix cells match the current filter set. Clear or broaden filters to recover a visible slice.",
    };
  }
  return {
    settlement: currentMatrix().settlement_state,
    posture: currentMatrix().recovery_posture,
    message: null,
  };
}

function orderedVisibleCellRefs(cells, rows, columns) {
  const visibleSet = new Set(cells.map((cell) => cell.cell_ref));
  return rows.map((row) =>
    columns
      .map((column) => `cell.${row.resource_class}.${column.action_family}`)
      .filter((cellRef) => visibleSet.has(cellRef)),
  );
}

function findSelectionCoordinates(grid) {
  for (let rowIndex = 0; rowIndex < grid.length; rowIndex += 1) {
    const columnIndex = grid[rowIndex].indexOf(state.selectedCellRef);
    if (columnIndex !== -1) {
      return {
        rowIndex,
        columnIndex,
      };
    }
  }
  return null;
}

function nextVisibleCellRef(grid, deltaRow, deltaColumn) {
  if (grid.length === 0) {
    return null;
  }

  const current = findSelectionCoordinates(grid) ?? {
    rowIndex: 0,
    columnIndex: 0,
  };
  let rowIndex = current.rowIndex;
  let columnIndex = current.columnIndex;

  while (true) {
    rowIndex += deltaRow;
    columnIndex += deltaColumn;
    if (rowIndex < 0 || rowIndex >= grid.length) {
      return null;
    }
    if (columnIndex < 0) {
      columnIndex = 0;
    }
    if (columnIndex >= grid[rowIndex].length) {
      columnIndex = grid[rowIndex].length - 1;
    }
    const candidate = grid[rowIndex][columnIndex];
    if (candidate) {
      return candidate;
    }
  }
}

function selectCell(cellRef, options = {}) {
  const cell = state.cellByRef.get(cellRef);
  if (!cell) {
    return;
  }
  state.selectedCellRef = cellRef;
  state.focusAnchorRef = cellRef;
  state.recovery = null;
  updateSelectionPresentation(options.focus ?? false);
}

function renderSummary(cells, rows, columns, status) {
  const decisionCounts = decisionOrder
    .map((decision) => [
      decision,
      cells.filter((cell) => cell.decision === decision).length,
    ])
    .filter(([, count]) => count > 0);

  const chips = [
    createChip(`${rows.length} rows`, "indigo"),
    createChip(`${columns.length} columns`, "indigo"),
    createChip(`${cells.length} visible cells`, "indigo"),
    ...decisionCounts.map(([decision, count]) =>
      createChip(`${decisionLabel(decision)} ${count}`, toneForDecision(decision)),
    ),
    createChip(
      state.selectedCellRef ? `Selected ${state.selectedCellRef}` : "Selected None",
      state.selectedCellRef ? "indigo" : "warning",
      true,
    ),
    createChip(
      state.focusAnchorRef ? `Focus ${state.focusAnchorRef}` : "Focus Unbound",
      state.focusAnchorRef ? "bronze" : "warning",
      true,
    ),
    createChip(humanize(status.settlement), toneForStatus(status.settlement)),
    createChip(humanize(status.posture), toneForStatus(status.settlement)),
  ];

  const latestSimulationRef = currentMatrix().role_matrix_workspace.latest_simulation_ref;
  if (latestSimulationRef) {
    chips.push(createChip(`Simulation ${latestSimulationRef}`, "bronze", true));
  }
  if (currentMatrix().role_matrix_workspace.role_editor_pending_change_refs.length > 0) {
    chips.push(
      createChip(
        `${currentMatrix().role_matrix_workspace.role_editor_pending_change_refs.length} pending refs`,
        "warning",
      ),
    );
  }

  elements.summaryStrip.replaceChildren(...chips);
}

function renderGrid(cells, rows, columns) {
  const cellSet = new Set(cells.map((cell) => cell.cell_ref));
  const grid = orderedVisibleCellRefs(cells, rows, columns);
  state.renderedCellButtons = new Map();

  const headerRow = document.createElement("tr");
  const corner = document.createElement("th");
  corner.className = "corner-cell";
  corner.scope = "col";
  corner.innerHTML = `
    <span class="column-label">Resource / Action</span>
    <span class="column-meta">Frozen row headers, query-local selection</span>
  `;
  headerRow.append(corner);

  for (const column of columns) {
    const th = document.createElement("th");
    th.scope = "col";
    th.innerHTML = `
      <span class="column-label">${humanize(column.action_family)}</span>
      <span class="column-meta">${column.action_family}</span>
    `;
    headerRow.append(th);
  }

  elements.matrixHead.replaceChildren(headerRow);

  const bodyRows = rows.map((row) => {
    const tr = document.createElement("tr");
    const rowHeader = document.createElement("th");
    rowHeader.scope = "row";
    rowHeader.innerHTML = `
      <span class="row-label">${humanize(row.resource_class)}</span>
      <span class="row-meta">${row.resource_class}</span>
    `;
    tr.append(rowHeader);

    for (const column of columns) {
      const td = document.createElement("td");
      const ref = `cell.${row.resource_class}.${column.action_family}`;
      if (!cellSet.has(ref)) {
        const placeholder = document.createElement("div");
        placeholder.className = "matrix-void";
        placeholder.setAttribute("aria-hidden", "true");
        td.append(placeholder);
        tr.append(td);
        continue;
      }

      const cell = state.cellByRef.get(ref);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "matrix-cell";
      button.dataset.cellRef = ref;
      button.dataset.decision = cell.decision;
      button.dataset.selected = state.selectedCellRef === ref ? "true" : "false";
      button.setAttribute("data-testid", "role-matrix-cell");
      button.setAttribute("aria-label", detailSentence(cell));
      button.tabIndex = state.selectedCellRef === ref ? 0 : -1;
      button.innerHTML = `
        <span>${decisionLabel(cell.decision)}</span>
        <span class="cell-note">${cell.required_authn_level ?? ""}${
          cell.required_approvals.length > 0 ? " / approval" : ""
        }</span>
      `;
      button.addEventListener("click", () => selectCell(ref, { focus: false }));
      button.addEventListener("keydown", (event) => {
        let nextRef = null;
        switch (event.key) {
          case "ArrowRight":
            nextRef = nextVisibleCellRef(grid, 0, 1);
            break;
          case "ArrowLeft":
            nextRef = nextVisibleCellRef(grid, 0, -1);
            break;
          case "ArrowDown":
            nextRef = nextVisibleCellRef(grid, 1, 0);
            break;
          case "ArrowUp":
            nextRef = nextVisibleCellRef(grid, -1, 0);
            break;
          default:
            break;
        }
        if (!nextRef) {
          return;
        }
        event.preventDefault();
        selectCell(nextRef, { focus: true });
      });
      state.renderedCellButtons.set(ref, button);
      td.append(button);
      tr.append(td);
    }

    return tr;
  });

  elements.matrixBody.replaceChildren(...bodyRows);
}

function updateSelectionPresentation(shouldFocus) {
  for (const [cellRef, button] of state.renderedCellButtons.entries()) {
    const selected = cellRef === state.selectedCellRef;
    button.dataset.selected = selected ? "true" : "false";
    button.tabIndex = selected ? 0 : -1;
    if (selected && shouldFocus) {
      button.focus();
    }
  }
  renderInspector();
  renderSummary(resultCells(), visibleRows(resultCells()), visibleColumns(resultCells()), currentStatus(resultCells()));
}

function inspectorCard(title, body, contentNode) {
  const section = document.createElement("section");
  section.className = "inspector-card";

  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = title;
  section.append(eyebrow);

  const copy = document.createElement("p");
  copy.className = "inspector-copy";
  copy.textContent = body;
  section.append(copy);

  if (contentNode) {
    section.append(contentNode);
  }

  return section;
}

function detailRow(label, value, mono = false) {
  const row = document.createElement("div");
  row.className = "detail-row";
  const term = document.createElement("span");
  term.className = "detail-label";
  term.textContent = label;
  row.append(term);
  const content = document.createElement("span");
  content.className = `meta-value${mono ? " mono" : ""}`;
  content.textContent = value;
  row.append(content);
  return row;
}

function tokenCloud(values, tone = "indigo") {
  const cloud = document.createElement("div");
  cloud.className = "token-cloud";
  if (values.length === 0) {
    cloud.append(createToken("None", "danger"));
    return cloud;
  }
  for (const value of values) {
    cloud.append(createToken(value, tone));
  }
  return cloud;
}

function policyPathList(policyPathRef) {
  const list = document.createElement("ol");
  list.className = "policy-list";
  for (const segment of policyPathRef.split(" | ")) {
    const item = document.createElement("li");
    item.textContent = segment;
    list.append(item);
  }
  return list;
}

function renderInspector() {
  const selectedCell =
    state.selectedCellRef === null ? null : state.cellByRef.get(state.selectedCellRef) ?? null;
  elements.inspectorBody.replaceChildren();

  if (!selectedCell) {
    const status = currentStatus(resultCells());
    elements.inspectorTitle.textContent = "Selection recovery required";
    elements.inspectorSummary.textContent =
      "Choose a visible cell to rebind the access inspector after filters or stale review posture change the active slice.";
    elements.inspectorBody.append(
      inspectorCard(
        "Route posture",
        status.message ??
          "The route has no active selected cell. Select any visible decision to restore the inspector.",
        (() => {
          const list = document.createElement("div");
          list.className = "detail-list";
          list.append(detailRow("Settlement", humanize(status.settlement)));
          list.append(detailRow("Recovery posture", humanize(status.posture)));
          list.append(detailRow("Policy snapshot", currentSnapshot().policy_snapshot_hash, true));
          list.append(detailRow("Version hash", currentMatrix().version_hash, true));
          return list;
        })(),
      ),
    );
    return;
  }

  elements.inspectorTitle.textContent = `${humanize(selectedCell.resource_class)} / ${humanize(
    selectedCell.action_family,
  )}`;
  elements.inspectorSummary.textContent = sentenceForCell(selectedCell);

  const summary = document.createElement("div");
  summary.className = "detail-list";
  summary.append(detailRow("Decision", decisionLabel(selectedCell.decision)));
  summary.append(
    detailRow(
      "Authn level",
      selectedCell.required_authn_level ? selectedCell.required_authn_level : "Not required",
    ),
  );
  summary.append(
    detailRow(
      "Pending change",
      selectedCell.pending_change_ref_or_null ?? "No staged role edit",
      Boolean(selectedCell.pending_change_ref_or_null),
    ),
  );
  summary.append(detailRow("Cell ref", selectedCell.cell_ref, true));

  elements.inspectorBody.append(
    inspectorCard(
      "Decision posture",
      "Exact decision vocabulary stays visible in the inspector instead of collapsing to a generic allowed badge.",
      summary,
    ),
  );

  elements.inspectorBody.append(
    inspectorCard(
      "Reason codes",
      "Reason codes remain ordered and explicit so authority-layer explanation survives projection.",
      tokenCloud(selectedCell.reason_codes, toneForDecision(selectedCell.decision)),
    ),
  );

  elements.inspectorBody.append(
    inspectorCard(
      "Effective scope",
      "Scope tokens are read directly from the published matrix cell.",
      tokenCloud(selectedCell.effective_scope),
    ),
  );

  elements.inspectorBody.append(
    inspectorCard(
      "Masking and approvals",
      "Masking rules and approvals stay separate from the decision so ALLOW_MASKED, step-up, and approval obligations remain inspectable.",
      (() => {
        const wrapper = document.createElement("div");
        wrapper.className = "detail-list";
        const masking = document.createElement("div");
        masking.append(detailRow("Masking rules", ""));
        masking.append(tokenCloud(selectedCell.masking_rules, "sage"));
        const approvals = document.createElement("div");
        approvals.append(detailRow("Required approvals", ""));
        approvals.append(tokenCloud(selectedCell.required_approvals, "bronze"));
        wrapper.append(masking, approvals);
        return wrapper;
      })(),
    ),
  );

  elements.inspectorBody.append(
    inspectorCard(
      "Policy path",
      "The assembled path order is deterministic, so reviewers can explain why this cell resolved the way it did.",
      policyPathList(selectedCell.policy_path_ref),
    ),
  );
}

function renderWorkspace() {
  const cells = resultCells();
  clearSelectionRecoveryIfVisible(cells);
  const rows = visibleRows(cells);
  const columns = visibleColumns(cells);
  const status = currentStatus(cells);

  renderFilters(cells);
  renderSummary(cells, rows, columns, status);

  elements.recoveryBanner.hidden = status.message === null;
  elements.recoveryBanner.textContent = status.message ?? "";
  elements.emptyState.hidden = cells.length > 0;
  elements.emptyStateMessage.textContent = status.message ?? "";

  if (cells.length > 0) {
    renderGrid(cells, rows, columns);
  } else {
    elements.matrixHead.replaceChildren();
    elements.matrixBody.replaceChildren();
    state.renderedCellButtons = new Map();
  }

  renderInspector();
}

async function init() {
  setMotionPreference();

  const response = await fetch(dataPath);
  state.payload = await response.json();
  state.selectedCellRef = state.payload.matrix.role_matrix_workspace.selected_cell_ref;
  state.focusAnchorRef = state.payload.matrix.focus_anchor_ref;

  state.cellByRef = new Map(
    state.payload.matrix.matrix_cells.map((cell) => [cell.cell_ref, cell]),
  );
  state.rowByResource = new Map(
    state.payload.matrix.matrix_rows.map((row) => [row.resource_class, row]),
  );
  state.columnByAction = new Map(
    state.payload.matrix.matrix_columns.map((column) => [column.action_family, column]),
  );

  elements.clearFilters.addEventListener("click", () => {
    state.filters.resourceClasses.clear();
    state.filters.actionFamilies.clear();
    state.filters.decisionOutcomes.clear();
    state.filters.pendingChangePresence = "ALL";
    renderWorkspace();
  });

  renderTopBar();
  renderWorkspace();
}

init().catch((error) => {
  document.body.innerHTML = `<pre>${error.stack}</pre>`;
});
