const DATA_PATH = "/config/access/access_control_matrix.json";

function setMotionMode() {
  const prefersReducedMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.dataset.motion = prefersReducedMotion ? "reduce" : "standard";
}

function createElement(tagName, options = {}) {
  const element = document.createElement(tagName);
  if (options.className) {
    element.className = options.className;
  }
  if (options.id) {
    element.id = options.id;
  }
  if (options.text) {
    element.textContent = options.text;
  }
  if (options.html) {
    element.innerHTML = options.html;
  }
  if (options.attributes) {
    for (const [key, value] of Object.entries(options.attributes)) {
      element.setAttribute(key, String(value));
    }
  }
  return element;
}

function titleCaseDecision(decision) {
  return decision.toLowerCase().replaceAll("_", " ");
}

function decisionClassName(decision) {
  return decision.toLowerCase().replaceAll("_", "-");
}

function joinList(values) {
  return values.length > 0 ? values.join(", ") : "None";
}

function renderSummaryBlock(container, title, lines) {
  const block = createElement("section", { className: "summary-block" });
  block.append(createElement("strong", { text: title }));
  for (const line of lines) {
    block.append(createElement("p", { text: line }));
  }
  container.append(block);
}

function renderAuthorityChain(target, layers) {
  target.replaceChildren();
  for (const layer of layers) {
    const item = createElement("li", { className: "chain-card" });
    item.append(createElement("strong", { text: `${layer.layer_code} · ${layer.layer_outcome}` }));
    const reason = createElement("p");
    reason.append(createElement("code", { text: layer.reason_codes.join(" · ") }));
    item.append(reason);
    target.append(item);
  }
}

function bindWorkspace(payload) {
  const principalView = payload.preview.principal_view;
  const roleMatrix = payload.preview.role_template_matrix;
  const principalCard = document.getElementById("principal-card");
  const roleCard = document.getElementById("role-card");
  const grid = document.getElementById("principal-grid");
  const roleMatrixSummary = document.getElementById("role-matrix-summary");
  const selectedDecisionChip = document.getElementById("selected-decision-chip");
  const inspectorTitle = document.getElementById("inspector-title");
  const inspectorDecisionChip = document.getElementById("inspector-decision-chip");
  const inspectorScopeChip = document.getElementById("inspector-scope-chip");
  const inspectorBody = document.getElementById("inspector-body");
  const inspectorDetails = document.getElementById("inspector-details");
  const authorityChainList = document.getElementById("authority-chain-list");

  renderSummaryBlock(principalCard, principalView.principal_id, [
    `Roles: ${principalView.effective_role_set.join(", ")}`,
    `Authn level: ${principalView.authn_level}`,
    `Delegations: ${principalView.delegation_summaries.map((entry) => entry.client_id).join(", ")}`,
  ]);
  renderSummaryBlock(roleCard, roleMatrix.role_label, [
    `Policy snapshot: ${roleMatrix.policy_snapshot_hash.slice(0, 12)}...`,
    `Version hash: ${roleMatrix.version_hash.slice(0, 12)}...`,
    `Role tuple rows: ${roleMatrix.matrix_rows.length} x ${roleMatrix.matrix_columns.length}`,
  ]);

  const actionCellsByRef = new Map(
    principalView.action_matrix.map((cell) => [cell.cell_ref, cell]),
  );

  function updateInspector(cell) {
    selectedDecisionChip.textContent = `Decision: ${cell.decision}`;
    inspectorTitle.textContent = `${cell.resource_class} / ${cell.action_family}`;
    inspectorDecisionChip.textContent = cell.decision;
    inspectorDecisionChip.className = `chip decision-line ${decisionClassName(cell.decision)}`;
    inspectorScopeChip.textContent = joinList(cell.effective_scope);
    inspectorBody.textContent = `Reason codes: ${cell.reason_codes.join(", ")}. Policy path: ${cell.policy_path_ref ?? "None"}.`;
    inspectorDetails.replaceChildren(
      createElement("dt", { text: "Masking rules" }),
      createElement("dd", { text: joinList(cell.masking_rules) }),
      createElement("dt", { text: "Required approvals" }),
      createElement("dd", { text: joinList(cell.required_approvals) }),
      createElement("dt", { text: "Required authn level" }),
      createElement("dd", { text: cell.required_authn_level ?? "None" }),
      createElement("dt", { text: "Authority chain layers" }),
      createElement("dd", { text: String(cell.authority_chain_layers.length) }),
    );
    renderAuthorityChain(authorityChainList, cell.authority_chain_layers);
    for (const button of grid.querySelectorAll("button")) {
      button.setAttribute("aria-current", button.dataset.cellRef === cell.cell_ref ? "true" : "false");
    }
  }

  for (const cell of principalView.action_matrix) {
    const button = createElement("button", {
      className: "matrix-button",
      attributes: {
        type: "button",
        "data-cell-ref": cell.cell_ref,
        "aria-current": cell.cell_ref === principalView.selected_action_detail?.cell_ref ? "true" : "false",
        "aria-label": `Principal access cell ${cell.resource_class} ${cell.action_family.replaceAll("_", " ").toLowerCase()} ${titleCaseDecision(cell.decision)}`,
      },
    });
    button.dataset.cellRef = cell.cell_ref;
    button.append(
      createElement("h3", { text: `${cell.resource_class} / ${cell.action_family}` }),
      createElement("div", {
        className: `decision-line ${decisionClassName(cell.decision)}`,
        text: cell.decision,
      }),
      createElement("div", {
        className: "matrix-meta",
        text: `Scope ${joinList(cell.effective_scope)} · ${cell.reason_codes[0]}`,
      }),
    );
    button.addEventListener("click", () => updateInspector(actionCellsByRef.get(cell.cell_ref)));
    button.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        updateInspector(actionCellsByRef.get(cell.cell_ref));
      }
    });
    grid.append(button);
  }

  roleMatrixSummary.append(
    createElement("p", { className: "section-eyebrow", text: "Role Template Matrix" }),
    createElement("h3", { text: `${roleMatrix.role_label} review slice` }),
  );
  const miniGrid = createElement("div", { className: "mini-grid" });
  for (const cell of roleMatrix.matrix_cells.slice(0, 6)) {
    const card = createElement("section", { className: "mini-card" });
    card.append(
      createElement("strong", { text: `${cell.resource_class} / ${cell.action_family}` }),
      createElement("p", { text: `Decision: ${cell.decision}` }),
      createElement("p", { text: `Policy path: ${cell.policy_path_ref}` }),
    );
    miniGrid.append(card);
  }
  roleMatrixSummary.append(miniGrid);

  updateInspector(principalView.selected_action_detail ?? principalView.action_matrix[0]);
}

function bindSimulator(payload) {
  const scenarios = payload.preview.simulation_scenarios;
  const scenarioList = document.getElementById("scenario-list");
  const simulatorSelectedChip = document.getElementById("simulator-selected-chip");
  const scenarioTitle = document.getElementById("scenario-title");
  const scenarioBody = document.getElementById("scenario-body");
  const decisionChip = document.getElementById("decision-chip");
  const resourceChip = document.getElementById("resource-chip");
  const decisionDetails = document.getElementById("decision-details");
  const chainList = document.getElementById("simulator-chain-list");

  const scenariosById = new Map(scenarios.map((entry) => [entry.scenario_id, entry]));

  function updateScenario(scenario) {
    simulatorSelectedChip.textContent = `Scenario: ${scenario.scenario_id}`;
    scenarioTitle.textContent = scenario.title;
    scenarioBody.textContent = scenario.narrative;
    decisionChip.textContent = scenario.simulation.authorization_decision.decision;
    decisionChip.className = `chip decision-line ${decisionClassName(scenario.simulation.authorization_decision.decision)}`;
    resourceChip.textContent = `${scenario.simulation.resource_class} / ${scenario.simulation.action_family}`;
    decisionDetails.replaceChildren(
      createElement("dt", { text: "Principal" }),
      createElement("dd", { text: scenario.principal_context.principal_id }),
      createElement("dt", { text: "Authn level" }),
      createElement("dd", { text: scenario.principal_context.authn_level }),
      createElement("dt", { text: "Required approvals" }),
      createElement("dd", { text: joinList(scenario.simulation.authorization_decision.required_approvals) }),
      createElement("dt", { text: "Reason codes" }),
      createElement("dd", { text: scenario.simulation.authorization_decision.reason_codes.join(", ") }),
    );
    renderAuthorityChain(chainList, scenario.simulation.authority_chain_layers);
    for (const button of scenarioList.querySelectorAll("button")) {
      button.setAttribute("aria-current", button.dataset.scenarioId === scenario.scenario_id ? "true" : "false");
    }
  }

  for (const scenario of scenarios) {
    const button = createElement("button", {
      className: "scenario-button",
      attributes: {
        type: "button",
        "data-scenario-id": scenario.scenario_id,
        "aria-current": scenario === scenarios[0] ? "true" : "false",
        "aria-label": scenario.title,
      },
    });
    button.dataset.scenarioId = scenario.scenario_id;
    button.append(
      createElement("h3", { text: scenario.title }),
      createElement("div", {
        className: `decision-line ${decisionClassName(scenario.simulation.authorization_decision.decision)}`,
        text: scenario.simulation.authorization_decision.decision,
      }),
      createElement("div", {
        className: "scenario-meta",
        text: `${scenario.principal_context.principal_type} · ${scenario.principal_context.authn_level} · ${scenario.simulation.action_family}`,
      }),
    );
    button.addEventListener("click", () => updateScenario(scenariosById.get(scenario.scenario_id)));
    button.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        updateScenario(scenariosById.get(scenario.scenario_id));
      }
    });
    scenarioList.append(button);
  }

  updateScenario(scenarios[0]);
}

async function bootstrap() {
  setMotionMode();
  const response = await fetch(DATA_PATH);
  if (!response.ok) {
    throw new Error(`Failed to load governance access payload: ${response.status}`);
  }
  const payload = await response.json();
  if (document.body.dataset.route === "simulator") {
    bindSimulator(payload);
  } else {
    bindWorkspace(payload);
  }
}

bootstrap().catch((error) => {
  console.error(error);
  const fallback = document.createElement("pre");
  fallback.textContent = error instanceof Error ? error.message : String(error);
  document.body.append(fallback);
});
