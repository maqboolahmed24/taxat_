const dataPath = "./data/principal-access-view-preview.json";

const state = {
  payload: null,
  filters: {
    principalTypes: new Set(),
    principalStates: new Set(),
    roleRefs: new Set(),
    delegatedClientRefs: new Set(),
    recentChangeOwnerRefs: new Set(),
  },
  selectedCellRef: null,
  renderedButtons: [],
};

const elements = {
  pageSubtitle: document.querySelector("#page-subtitle"),
  principalChip: document.querySelector("#principal-chip"),
  authnChip: document.querySelector("#authn-chip"),
  stepupChip: document.querySelector("#stepup-chip"),
  policyChip: document.querySelector("#policy-chip"),
  statusNarrative: document.querySelector("#status-narrative"),
  directorySummary: document.querySelector("#directory-summary"),
  clearFilters: document.querySelector("#clear-filters"),
  principalTypeFilters: document.querySelector("#principal-type-filters"),
  principalStateFilters: document.querySelector("#principal-state-filters"),
  roleFilters: document.querySelector("#role-filters"),
  clientFilters: document.querySelector("#client-filters"),
  ownerFilters: document.querySelector("#owner-filters"),
  basisStatement: document.querySelector("#basis-statement"),
  summaryStrip: document.querySelector("#summary-strip"),
  recoveryBanner: document.querySelector("#recovery-banner"),
  matrixHead: document.querySelector("#matrix-head"),
  matrixBody: document.querySelector("#matrix-body"),
  emptyState: document.querySelector("#empty-state"),
  emptyStateMessage: document.querySelector("#empty-state-message"),
  shelfTitle: document.querySelector("#shelf-title"),
  shelfCopy: document.querySelector("#shelf-copy"),
  shelfDetails: document.querySelector("#shelf-details"),
  inspectorTitle: document.querySelector("#inspector-title"),
  inspectorSummary: document.querySelector("#inspector-summary"),
  authorityStack: document.querySelector("#authority-stack"),
  inspectorSections: document.querySelector("#inspector-sections"),
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
    .replaceAll(".", " ")
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
      return "moss";
    case "REQUIRE_STEP_UP":
      return "slate";
    case "REQUIRE_APPROVAL":
      return "amber";
    case "DENY":
      return "danger";
    default:
      return "slate";
  }
}

function toneForOutcome(outcome) {
  switch (outcome) {
    case "ALLOW":
      return "success";
    case "ALLOW_MASKED":
      return "moss";
    case "REQUIRE_STEP_UP":
      return "warning";
    case "REQUIRE_APPROVAL":
      return "warning";
    case "DENY":
      return "danger";
    default:
      return "warning";
  }
}

function monospaceHash(label, value) {
  return `${label} ${value.slice(0, 12)}…${value.slice(-6)}`;
}

function currentView() {
  return state.payload.view;
}

function currentMetadata() {
  return state.payload;
}

function buildFilterState(filters) {
  return {
    principalTypes: new Set(filters.principal_types),
    principalStates: new Set(filters.principal_states),
    roleRefs: new Set(filters.role_refs),
    delegatedClientRefs: new Set(filters.delegated_client_refs),
    recentChangeOwnerRefs: new Set(filters.recent_change_owner_refs),
  };
}

function mountedPrincipalMatchesFilters() {
  const metadata = currentMetadata();
  const view = currentView();
  const typeMatch =
    state.filters.principalTypes.size === 0 ||
    state.filters.principalTypes.has(view.principal_type);
  const stateMatch =
    state.filters.principalStates.size === 0 ||
    state.filters.principalStates.has(metadata.principal_state);
  const roleMatch =
    state.filters.roleRefs.size === 0 ||
    [...state.filters.roleRefs].some((roleRef) => view.effective_role_set.includes(roleRef));
  const delegatedClientMatch =
    state.filters.delegatedClientRefs.size === 0 ||
    [...state.filters.delegatedClientRefs].some((clientRef) =>
      view.delegation_summaries.some((summary) => summary.client_id === clientRef),
    );
  const recentChangeOwnerMatch =
    state.filters.recentChangeOwnerRefs.size === 0 ||
    state.filters.recentChangeOwnerRefs.has(metadata.recent_change_owner_ref);
  return (
    typeMatch &&
    stateMatch &&
    roleMatch &&
    delegatedClientMatch &&
    recentChangeOwnerMatch
  );
}

function visibleCells() {
  return mountedPrincipalMatchesFilters() ? currentView().action_matrix : [];
}

function rowOrder() {
  const order = [];
  for (const cell of currentView().action_matrix) {
    if (!order.includes(cell.resource_class)) {
      order.push(cell.resource_class);
    }
  }
  return order;
}

function columnOrder() {
  const order = [];
  for (const cell of currentView().action_matrix) {
    if (!order.includes(cell.action_family)) {
      order.push(cell.action_family);
    }
  }
  return order;
}

function cellByRef(cellRef) {
  return currentView().action_matrix.find((cell) => cell.cell_ref === cellRef) ?? null;
}

function visibleCellByTuple(resourceClass, actionFamily) {
  return visibleCells().find(
    (cell) => cell.resource_class === resourceClass && cell.action_family === actionFamily,
  ) ?? null;
}

function sentenceForCell(cell) {
  const principal = currentMetadata().principal_label.toLowerCase();
  const action = humanize(cell.action_family).toLowerCase();
  const resource = humanize(cell.resource_class).toLowerCase();
  switch (cell.decision) {
    case "ALLOW":
      return `${principal} may ${action} on ${resource}`;
    case "ALLOW_MASKED":
      return `${principal} may view masked ${resource}`;
    case "REQUIRE_STEP_UP":
      return `${principal} requires step up for ${action} on ${resource}`;
    case "REQUIRE_APPROVAL":
      return `${principal} requires approval for ${action} on ${resource}`;
    case "DENY":
      return `${principal} is denied ${action} on ${resource}`;
    default:
      return `${principal} has an access decision for ${action} on ${resource}`;
  }
}

function detailCopy(cell) {
  const clauses = [sentenceForCell(cell)];
  if (cell.required_authn_level) {
    clauses.push(`authn ${cell.required_authn_level.toLowerCase()}`);
  }
  if (cell.required_approvals.length > 0) {
    clauses.push(`approvals ${cell.required_approvals.join(", ")}`);
  }
  if (cell.masking_rules.length > 0) {
    clauses.push(`masking ${cell.masking_rules.length}`);
  }
  return clauses.join(" and ");
}

function selectedCell() {
  if (!mountedPrincipalMatchesFilters()) {
    return null;
  }
  return cellByRef(state.selectedCellRef) ?? null;
}

function selectExclusiveFilter(setRef, value) {
  if (setRef.size === 1 && setRef.has(value)) {
    render();
    return;
  }
  setRef.clear();
  setRef.add(value);
  render();
}

function createFilterButton({ label, ariaLabel, pressed, onClick }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "filter-pill";
  button.textContent = label;
  button.setAttribute("aria-label", ariaLabel);
  button.setAttribute("aria-pressed", pressed ? "true" : "false");
  button.addEventListener("click", onClick);
  return button;
}

function renderFilterGroup(container, options, setRef, labelPrefix) {
  container.replaceChildren();
  for (const option of options) {
    container.append(
      createFilterButton({
        label: humanize(option),
        ariaLabel: `Filter ${labelPrefix} ${humanize(option)}`,
        pressed: setRef.has(option),
        onClick: () => selectExclusiveFilter(setRef, option),
      }),
    );
  }
}

function renderTopBar() {
  const metadata = currentMetadata();
  const view = currentView();
  elements.pageSubtitle.textContent =
    "The browser reads one mounted principal view, keeps the selected action pinned to the backend payload, and treats principal filters as route context rather than matrix logic.";
  elements.principalChip.textContent = metadata.principal_label;
  elements.principalChip.title = view.principal_id;
  elements.authnChip.textContent = `${humanize(view.authn_level)} authn`;
  elements.stepupChip.textContent = view.last_step_up_at
    ? `Step-up ${view.last_step_up_at.slice(0, 10)}`
    : "No step-up";
  elements.stepupChip.title = view.last_step_up_at ?? "No step-up recorded";
  elements.policyChip.textContent = monospaceHash(
    "Policy",
    metadata.current_policy_snapshot_hash,
  );
  elements.policyChip.title = metadata.current_policy_snapshot_hash;
  elements.statusNarrative.textContent =
    "Directory filters preserve one mounted principal while the inspector, authority-chain rails, and optional simulator link stay bound to the same frozen selection.";
}

function renderDirectoryRail() {
  const metadata = currentMetadata();
  const view = currentView();
  elements.directorySummary.textContent = `${humanize(metadata.principal_state)} ${humanize(
    view.principal_type,
  ).toLowerCase()} with ${view.effective_role_set.length} role template and ${
    view.delegation_summaries.length
  } delegated client slice.`;
  renderFilterGroup(
    elements.principalTypeFilters,
    metadata.filter_options.principal_types,
    state.filters.principalTypes,
    "principal type",
  );
  renderFilterGroup(
    elements.principalStateFilters,
    metadata.filter_options.principal_states,
    state.filters.principalStates,
    "principal state",
  );
  renderFilterGroup(
    elements.roleFilters,
    metadata.filter_options.role_refs,
    state.filters.roleRefs,
    "role ref",
  );
  renderFilterGroup(
    elements.clientFilters,
    metadata.filter_options.delegated_client_refs,
    state.filters.delegatedClientRefs,
    "delegated client",
  );
  renderFilterGroup(
    elements.ownerFilters,
    metadata.filter_options.recent_change_owner_refs,
    state.filters.recentChangeOwnerRefs,
    "recent change owner",
  );
}

function summaryState() {
  const cell = selectedCell();
  if (!mountedPrincipalMatchesFilters()) {
    return {
      label: "Recovery Required",
      tone: "danger",
      narrative:
        "The mounted principal no longer remains inside the active directory slice.",
    };
  }
  if (cell === null) {
    return {
      label: "No Selection",
      tone: "warning",
      narrative: "Choose a cell to inspect the mounted decision and authority-chain detail.",
    };
  }
  return {
    label: `Selected ${cell.cell_ref}`,
    tone: toneForOutcome(cell.decision),
    narrative: detailCopy(cell),
  };
}

function renderSummaryStrip() {
  const summary = summaryState();
  elements.summaryStrip.replaceChildren();
  const pill = document.createElement("div");
  pill.className = "summary-pill";
  pill.dataset.tone = summary.tone;
  pill.textContent = summary.label;
  elements.summaryStrip.append(pill);

  const sentence = document.createElement("div");
  sentence.className = "summary-pill";
  sentence.textContent = summary.narrative;
  elements.summaryStrip.append(sentence);
}

function renderRecovery() {
  const principalVisible = mountedPrincipalMatchesFilters();
  const cell = selectedCell();
  if (!principalVisible) {
    elements.recoveryBanner.hidden = false;
    elements.recoveryBanner.textContent =
      "The selected principal is no longer visible in the filtered directory slice. Recovery posture is Access Rebind Required.";
    elements.emptyState.hidden = false;
    elements.emptyStateMessage.textContent =
      "Remove or relax the directory filters to remount the principal access workspace.";
    return;
  }
  elements.recoveryBanner.hidden = true;
  elements.emptyState.hidden = cell !== null || visibleCells().length > 0;
  elements.emptyStateMessage.textContent =
    "The mounted principal still resolves, but there are no visible action cells in the current slice.";
}

function renderMatrix() {
  const rows = rowOrder();
  const columns = columnOrder();
  const visible = new Set(visibleCells().map((cell) => cell.cell_ref));
  state.renderedButtons = [];

  elements.basisStatement.textContent =
    "Rows and columns are derived from the committed backend action matrix. Principal filters may trigger typed recovery, but they never rewrite the mounted decisions.";

  const headRow = document.createElement("tr");
  const emptyHead = document.createElement("th");
  emptyHead.className = "row-header";
  emptyHead.textContent = "Resource";
  headRow.append(emptyHead);
  for (const actionFamily of columns) {
    const th = document.createElement("th");
    th.className = "column-header";
    th.textContent = humanize(actionFamily);
    headRow.append(th);
  }
  elements.matrixHead.replaceChildren(headRow);

  elements.matrixBody.replaceChildren();
  for (const resourceClass of rows) {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    th.className = "row-header";
    th.textContent = humanize(resourceClass);
    tr.append(th);

    for (const actionFamily of columns) {
      const td = document.createElement("td");
      const cell = visibleCellByTuple(resourceClass, actionFamily);
      if (cell) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "matrix-button";
        button.dataset.cellRef = cell.cell_ref;
        button.dataset.testid = "principal-access-cell";
        button.dataset.decision = cell.decision;
        button.dataset.selected = state.selectedCellRef === cell.cell_ref ? "true" : "false";
        button.setAttribute("data-cell-ref", cell.cell_ref);
        button.setAttribute(
          "aria-label",
          `${currentMetadata().principal_label.toLowerCase()} ${sentenceForCell(cell).replace(
            `${currentMetadata().principal_label.toLowerCase()} `,
            "",
          )}`,
        );
        button.tabIndex = state.selectedCellRef === cell.cell_ref ? 0 : -1;
        button.addEventListener("click", () => {
          state.selectedCellRef = cell.cell_ref;
          render();
        });
        button.addEventListener("keydown", (event) => {
          if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(event.key)) {
            return;
          }
          event.preventDefault();
          const orderedCells = state.renderedButtons.map((entry) => entry.cellRef);
          const currentIndex = orderedCells.indexOf(cell.cell_ref);
          if (currentIndex === -1) {
            return;
          }
          const delta =
            event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
          const nextIndex =
            (currentIndex + delta + orderedCells.length) % orderedCells.length;
          state.selectedCellRef = orderedCells[nextIndex];
          render();
          const nextButton = state.renderedButtons[nextIndex]?.button;
          nextButton?.focus();
        });

        const content = document.createElement("div");
        const decision = document.createElement("div");
        decision.className = "cell-decision";
        decision.textContent = decisionLabel(cell.decision);
        const reason = document.createElement("div");
        reason.className = "cell-reason";
        reason.textContent = humanize(cell.reason_codes[0] ?? "No reason code");
        content.append(decision, reason);

        const marker = document.createElement("span");
        marker.className = "chip chip--mono";
        marker.textContent = humanize(cell.action_family);

        button.append(content, marker);
        td.append(button);
        state.renderedButtons.push({ button, cellRef: cell.cell_ref });
      }
      tr.append(td);
    }
    elements.matrixBody.append(tr);
  }

  if (!visible.size) {
    elements.matrixBody.replaceChildren();
  }
}

function createDetailCard(label, value, mono = false) {
  const card = document.createElement("div");
  card.className = "detail-card";
  const title = document.createElement("div");
  title.className = "detail-label";
  title.textContent = label;
  const content = document.createElement("div");
  content.className = `detail-value${mono ? " mono" : ""}`;
  content.textContent = value;
  card.append(title, content);
  return card;
}

function renderShelf() {
  const cell = selectedCell();
  if (!mountedPrincipalMatchesFilters()) {
    elements.shelfTitle.textContent = "Selection recovery required";
    elements.shelfCopy.textContent =
      "The directory slice excludes the mounted principal, so the shelf clears the selected action detail until the route is rebound.";
    elements.shelfDetails.replaceChildren(
      createDetailCard("Recovery", "Access Rebind Required"),
      createDetailCard("Settlement", "Recovery Required"),
    );
    return;
  }
  if (!cell) {
    elements.shelfTitle.textContent = "Choose an action cell";
    elements.shelfCopy.textContent =
      "No access cell is selected. Use the grid or keyboard travel to inspect one mounted decision.";
    elements.shelfDetails.replaceChildren();
    return;
  }
  elements.shelfTitle.textContent = `${humanize(cell.resource_class)} / ${humanize(
    cell.action_family,
  )}`;
  elements.shelfCopy.textContent = detailCopy(cell);
  elements.shelfDetails.replaceChildren(
    createDetailCard("Decision", decisionLabel(cell.decision)),
    createDetailCard("Cell Ref", cell.cell_ref, true),
    createDetailCard("Policy Path", cell.policy_path_ref ?? "Unavailable", true),
    createDetailCard(
      "Effective Scope",
      cell.effective_scope.length > 0 ? cell.effective_scope.join(", ") : "No effective scope",
      true,
    ),
  );
}

function createToken(label, tone = "moss") {
  const span = document.createElement("span");
  span.className = "token";
  span.dataset.tone = tone;
  span.textContent = label;
  return span;
}

function renderInspector() {
  const cell = selectedCell();
  elements.authorityStack.replaceChildren();
  elements.inspectorSections.replaceChildren();

  if (!mountedPrincipalMatchesFilters()) {
    elements.inspectorTitle.textContent = "Selection recovery required";
    elements.inspectorSummary.textContent =
      "The authority stack clears because the principal is outside the active directory slice.";
    return;
  }
  if (!cell) {
    elements.inspectorTitle.textContent = "No mounted action detail";
    elements.inspectorSummary.textContent =
      "Select a visible cell to inspect authority layers, scope, masking, approvals, and simulator linkage.";
    return;
  }

  elements.inspectorTitle.textContent = `${humanize(cell.resource_class)} / ${humanize(
    cell.action_family,
  )}`;
  elements.inspectorSummary.textContent = sentenceForCell(cell);

  for (const layer of cell.authority_chain_layers) {
    const row = document.createElement("div");
    row.className = "authority-layer";
    row.dataset.outcome = layer.layer_outcome;
    const rail = document.createElement("div");
    rail.className = "authority-rail";
    const copy = document.createElement("div");
    copy.className = "authority-copy";
    const title = document.createElement("div");
    title.className = "authority-title";
    title.textContent = humanize(layer.layer_code);
    const reasons = document.createElement("div");
    reasons.className = "authority-reasons";
    reasons.textContent = layer.reason_codes.map((value) => humanize(value)).join(" · ");
    copy.append(title, reasons);
    const outcome = document.createElement("div");
    outcome.className = "authority-outcome";
    outcome.textContent = decisionLabel(layer.layer_outcome);
    row.append(rail, copy, outcome);
    elements.authorityStack.append(row);
  }

  const scopeCard = document.createElement("div");
  scopeCard.className = "inspector-card";
  scopeCard.append(
    createDetailCard(
      "Effective Scope",
      cell.effective_scope.length > 0 ? cell.effective_scope.join(", ") : "No scope",
      true,
    ),
  );

  const maskingCard = document.createElement("div");
  maskingCard.className = "inspector-card";
  const maskingTitle = document.createElement("div");
  maskingTitle.className = "detail-label";
  maskingTitle.textContent = "Masking, approvals, simulator";
  const tokenCloud = document.createElement("div");
  tokenCloud.className = "token-cloud";
  if (cell.masking_rules.length === 0) {
    tokenCloud.append(createToken("No masking", "moss"));
  } else {
    for (const maskingRule of cell.masking_rules) {
      tokenCloud.append(createToken(maskingRule, "moss"));
    }
  }
  if (cell.required_approvals.length === 0) {
    tokenCloud.append(createToken("No approval gate", "moss"));
  } else {
    for (const approvalRef of cell.required_approvals) {
      tokenCloud.append(createToken(approvalRef, "amber"));
    }
  }
  tokenCloud.append(
    createToken(
      currentView().access_workspace.latest_simulation_ref ?? "No simulation",
      currentView().access_workspace.latest_simulation_ref ? "amber" : "danger",
    ),
  );
  maskingCard.append(maskingTitle, tokenCloud);

  elements.inspectorSections.append(scopeCard, maskingCard);
}

function render() {
  renderTopBar();
  renderDirectoryRail();
  renderSummaryStrip();
  renderRecovery();
  renderMatrix();
  renderShelf();
  renderInspector();
}

async function init() {
  setMotionPreference();
  const response = await fetch(dataPath);
  state.payload = await response.json();
  state.filters = buildFilterState(currentView().access_workspace.active_filters);
  state.selectedCellRef = currentView().access_workspace.selected_cell_ref;

  elements.clearFilters.addEventListener("click", () => {
    state.filters = {
      principalTypes: new Set(),
      principalStates: new Set(),
      roleRefs: new Set(),
      delegatedClientRefs: new Set(),
      recentChangeOwnerRefs: new Set(),
    };
    render();
  });

  render();
}

init();
