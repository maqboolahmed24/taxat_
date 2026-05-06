const dataPath = "./data/manifest-lineage-trace-viewer.json";

const state = {
  payload: null,
  selectedIndex: 0,
  nightlyHighlighted: false,
};

const elements = {
  traceIdChip: document.querySelector("#trace-id-chip"),
  actionChip: document.querySelector("#action-chip"),
  reasonChip: document.querySelector("#reason-chip"),
  priorHashChip: document.querySelector("#prior-hash-chip"),
  candidateList: document.querySelector("#candidate-list"),
  ribbonTitle: document.querySelector("#ribbon-title"),
  ribbonSvg: document.querySelector("#branch-ribbon-svg"),
  decisionCards: document.querySelector("#decision-cards"),
  inspectorTitle: document.querySelector("#inspector-title"),
  inspectorRows: document.querySelector("#inspector-rows"),
  nightlyContext: document.querySelector("#nightly-context"),
  traceRefs: document.querySelector("#trace-refs"),
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
    .replaceAll("_", " ")
    .replaceAll("OR NULL", "")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function actionSentence(action) {
  return humanize(action).toLowerCase();
}

function reasonSentence(reasonCodes) {
  if (reasonCodes.length === 0) {
    return "selected";
  }
  const reason = humanize(reasonCodes[0]).toLowerCase().replace("mismatch", "mismatched");
  return `rejected because ${reason}`;
}

function accessibleCandidateName(candidate) {
  return `${actionSentence(candidate.candidate_action)} ${reasonSentence(
    candidate.disqualifier_reason_codes,
  )}`;
}

function shortHash(value) {
  if (!value) {
    return "none";
  }
  return `${value.slice(0, 18)}...${value.slice(-10)}`;
}

function selectedCandidate() {
  return state.payload.trace.candidate_evaluations[state.selectedIndex];
}

function selectCandidate(index, focusButton = false) {
  state.selectedIndex = index;
  render();
  if (focusButton) {
    const button = elements.candidateList.querySelector(`[data-index="${index}"]`);
    button?.focus();
  }
}

function moveSelection(delta) {
  const count = state.payload.trace.candidate_evaluations.length;
  const nextIndex = (state.selectedIndex + delta + count) % count;
  selectCandidate(nextIndex, true);
}

function renderTopBar() {
  const { trace } = state.payload;
  elements.traceIdChip.textContent = trace.lineage_trace_id;
  elements.actionChip.textContent = humanize(trace.selected_branch_action);
  elements.reasonChip.textContent = humanize(trace.selected_branch_reason_code);
  elements.priorHashChip.textContent = shortHash(trace.prior_manifest_hash_at_decision_or_null);
}

function renderCandidateRail() {
  elements.candidateList.innerHTML = "";
  state.payload.trace.candidate_evaluations.forEach((candidate, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "candidate-button";
    button.dataset.testid = "branch-candidate";
    button.dataset.action = candidate.candidate_action;
    button.dataset.index = String(index);
    button.dataset.state = candidate.evaluation_state;
    button.dataset.selected = index === state.selectedIndex ? "true" : "false";
    button.setAttribute("aria-label", accessibleCandidateName(candidate));
    button.addEventListener("click", () => selectCandidate(index));
    button.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        event.preventDefault();
        moveSelection(1);
      }
      if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        event.preventDefault();
        moveSelection(-1);
      }
      if (event.key === "Home") {
        event.preventDefault();
        selectCandidate(0, true);
      }
      if (event.key === "End") {
        event.preventDefault();
        selectCandidate(state.payload.trace.candidate_evaluations.length - 1, true);
      }
    });

    const dot = document.createElement("span");
    dot.className = "candidate-dot";
    dot.setAttribute("aria-hidden", "true");
    const copy = document.createElement("span");
    const label = document.createElement("span");
    label.className = "candidate-label";
    label.textContent = humanize(candidate.candidate_action);
    const meta = document.createElement("span");
    meta.className = "candidate-meta";
    meta.textContent =
      candidate.evaluation_state === "SELECTED"
        ? "SELECTED"
        : candidate.disqualifier_reason_codes.join(" | ");
    copy.append(label, meta);
    button.append(dot, copy);
    elements.candidateList.append(button);
  });
}

function renderRibbon() {
  const candidates = state.payload.trace.candidate_evaluations;
  const selected = selectedCandidate();
  elements.ribbonTitle.textContent = `${humanize(selected.candidate_action)} / ${humanize(
    selected.evaluation_state,
  )}`;
  elements.ribbonSvg.innerHTML = "";

  candidates.forEach((candidate, index) => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const y = 14 + index * 15;
    const endY = candidate.evaluation_state === "SELECTED" ? 62 : y;
    path.setAttribute("d", `M18 62 C220 ${y}, 520 ${endY}, 884 ${endY}`);
    path.setAttribute("class", "ribbon-path");
    path.dataset.action = candidate.candidate_action;
    path.dataset.selected = index === state.selectedIndex ? "true" : "false";
    elements.ribbonSvg.append(path);
  });
}

function addDecisionCard(title, body, code) {
  const card = document.createElement("article");
  card.className = "decision-card";
  const heading = document.createElement("h3");
  heading.textContent = title;
  const copy = document.createElement("p");
  copy.textContent = body;
  card.append(heading, copy);
  if (code) {
    const codeLine = document.createElement("p");
    const codeElement = document.createElement("code");
    codeElement.textContent = code;
    codeLine.append(codeElement);
    card.append(codeLine);
  }
  elements.decisionCards.append(card);
}

function renderDecisionCards() {
  const { trace } = state.payload;
  const candidate = selectedCandidate();
  elements.decisionCards.innerHTML = "";
  addDecisionCard(
    "Candidate disposition",
    candidate.evaluation_state === "SELECTED"
      ? "This candidate is the persisted request-time branch outcome."
      : `This candidate was rejected with typed reasons: ${candidate.disqualifier_reason_codes.join(
          ", ",
        )}.`,
    candidate.candidate_action,
  );
  addDecisionCard(
    "Selected manifest basis",
    "The selected manifest keeps its own continuation basis; request-time bundle return is narrated by the trace.",
    trace.selected_manifest_continuation_basis,
  );
  addDecisionCard(
    "Prior comparison anchor",
    "The branch decision froze the compared manifest id, hash, and lifecycle state at decision time.",
    trace.prior_manifest_id_or_null,
  );
  addDecisionCard(
    "Returned bundle",
    trace.returned_decision_bundle_hash_or_null
      ? "The decision bundle hash is present because this trace returned an existing bundle."
      : "No decision bundle hash is attached to this branch action.",
    trace.returned_decision_bundle_hash_or_null,
  );
}

function addInspectorRow(label, value) {
  const row = document.createElement("div");
  row.className = "inspector-row";
  const labelElement = document.createElement("span");
  labelElement.textContent = label;
  const valueElement = document.createElement("code");
  valueElement.textContent = value ?? "null";
  row.append(labelElement, valueElement);
  elements.inspectorRows.append(row);
}

function renderInspector() {
  const { trace, selected_manifest: selectedManifest } = state.payload;
  elements.inspectorTitle.textContent = trace.selected_manifest_id;
  elements.inspectorRows.innerHTML = "";
  addInspectorRow("Continuation", selectedManifest.continuation_basis);
  addInspectorRow("Manifest action", selectedManifest.manifest_branch_action);
  addInspectorRow("Mirror state", trace.mirror_consistency_state);
  addInspectorRow("Mirror sources", trace.mirror_sources.join(" + "));
  addInspectorRow("Nightly window", trace.nightly_window_key_or_null);
  addInspectorRow("Decision bundle", selectedManifest.decision_bundle_ref);

  elements.nightlyContext.innerHTML = "";
  const contextButton = document.createElement("button");
  contextButton.type = "button";
  contextButton.className = "context-button";
  contextButton.dataset.highlighted = state.nightlyHighlighted ? "true" : "false";
  contextButton.textContent = `${humanize(trace.nightly_context_reason_code_or_null)} / ${
    trace.nightly_window_key_or_null
  }`;
  contextButton.setAttribute(
    "aria-label",
    `Highlight nightly context ${humanize(
      trace.nightly_context_reason_code_or_null,
    ).toLowerCase()}`,
  );
  contextButton.addEventListener("click", () => {
    state.nightlyHighlighted = !state.nightlyHighlighted;
    if (trace.nightly_context_reason_code_or_null === "SAME_WINDOW_REUSE") {
      selectCandidate(1);
    }
    renderInspector();
    renderRibbon();
  });
  elements.nightlyContext.append(contextButton);

  elements.traceRefs.innerHTML = "";
  for (const ref of selectedManifest.manifest_lineage_trace_refs) {
    const refElement = document.createElement("div");
    refElement.className = "trace-ref";
    refElement.textContent = ref;
    elements.traceRefs.append(refElement);
  }
}

function render() {
  renderTopBar();
  renderCandidateRail();
  renderRibbon();
  renderDecisionCards();
  renderInspector();
}

async function boot() {
  setMotionPreference();
  const response = await fetch(dataPath);
  state.payload = await response.json();
  state.selectedIndex = state.payload.trace.candidate_evaluations.findIndex(
    (candidate) => candidate.evaluation_state === "SELECTED",
  );
  render();
}

boot();
