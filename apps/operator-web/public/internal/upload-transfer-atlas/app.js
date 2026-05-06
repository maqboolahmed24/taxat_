const dataPath = "./data/upload-transfer-atlas.json";

const state = {
  activeRungId: null,
  activeSessionId: null,
  activeStageRef: null,
  bindingOpen: false,
  payload: null,
};

const elements = {
  basisStatement: document.querySelector("#basis-statement"),
  bindingDetails: document.querySelector("#binding-details"),
  bindingToggle: document.querySelector("#binding-toggle"),
  inspectorBody: document.querySelector("#inspector-body"),
  inspectorTitle: document.querySelector("#inspector-title"),
  ladderColumn: document.querySelector("#ladder-column"),
  ladderTitle: document.querySelector("#ladder-title"),
  pageSubtitle: document.querySelector("#page-subtitle"),
  pageTitle: document.querySelector("#page-title"),
  requestBindingBadge: document.querySelector("#request-binding-badge"),
  resumabilityChip: document.querySelector("#resumability-chip"),
  seamList: document.querySelector("#seam-list"),
  sessionSelector: document.querySelector("#session-selector"),
  stageList: document.querySelector("#stage-list"),
  stageSummary: document.querySelector("#stage-summary"),
  transferStateChip: document.querySelector("#transfer-state-chip"),
  validationStateChip: document.querySelector("#validation-state-chip"),
};

function setMotionPreference() {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  const sync = () => {
    document.documentElement.dataset.motion = query.matches ? "reduce" : "standard";
  };
  sync();
  query.addEventListener("change", sync);
}

function sessionById(sessionId) {
  return state.payload.sessions.find((entry) => entry.sessionId === sessionId) ?? state.payload.sessions[0];
}

function stageByRef(stageRef) {
  return state.payload.stages.find((entry) => entry.stageRef === stageRef) ?? state.payload.stages[0];
}

function activeSession() {
  state.activeSessionId = state.activeSessionId ?? state.payload.selectedSessionId;
  return sessionById(state.activeSessionId);
}

function activeStage() {
  const session = activeSession();
  state.activeStageRef = state.activeStageRef ?? session.stageRef;
  return stageByRef(state.activeStageRef);
}

function visibleRungs(session) {
  return session.rungs;
}

function syncActiveRung(session) {
  const allowed = visibleRungs(session);
  if (allowed.some((entry) => entry.rungId === state.activeRungId)) {
    return;
  }
  state.activeRungId = session.selectedRungId ?? allowed[0]?.rungId ?? null;
}

function activeRung() {
  const session = activeSession();
  syncActiveRung(session);
  return session.rungs.find((entry) => entry.rungId === state.activeRungId) ?? null;
}

function chip(text) {
  const node = document.createElement("span");
  node.className = "metric-chip";
  node.textContent = text;
  return node;
}

function fieldList(entries) {
  const list = document.createElement("ul");
  list.className = "field-list";
  entries.forEach(([label, value]) => {
    const item = document.createElement("li");
    const heading = document.createElement("span");
    heading.textContent = label;
    const literal = document.createElement("code");
    literal.textContent = value;
    item.append(heading, literal);
    list.append(item);
  });
  return list;
}

function section(titleText, nodes) {
  const sectionNode = document.createElement("section");
  sectionNode.className = "inspector-section";
  const title = document.createElement("h3");
  title.textContent = titleText;
  sectionNode.append(title, ...nodes);
  return sectionNode;
}

function createSessionButton(session, active) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "session-button";
  button.dataset.active = active ? "true" : "false";
  button.setAttribute("aria-pressed", active ? "true" : "false");
  button.setAttribute("aria-label", `Upload session selector ${session.displayName}`);
  button.textContent = session.displayName;
  button.addEventListener("click", () => {
    state.activeSessionId = session.sessionId;
    state.activeStageRef = session.stageRef;
    state.activeRungId = session.selectedRungId;
    state.bindingOpen = false;
    render();
  });
  return button;
}

function createStageButton(stage, active) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "stage-button";
  button.dataset.active = active ? "true" : "false";
  button.setAttribute("aria-current", active ? "true" : "false");
  button.setAttribute("aria-label", `Transfer stage ${stage.label}`);
  button.addEventListener("click", () => {
    state.activeStageRef = stage.stageRef;
    render();
  });

  const title = document.createElement("strong");
  title.className = "stage-label";
  title.textContent = stage.label;
  const summary = document.createElement("span");
  summary.className = "stage-button__summary";
  summary.textContent = stage.summary;
  button.append(title, summary);
  return button;
}

function createRungButton(session, rung, active, activeStageRef) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "rung-button";
  button.dataset.active = active ? "true" : "false";
  button.dataset.checksumState = rung.checksumState;
  button.dataset.stageMatch = rung.stageRef === activeStageRef ? "true" : "false";
  button.setAttribute("aria-label", rung.accessibleLabel);
  button.addEventListener("click", () => {
    state.activeSessionId = session.sessionId;
    state.activeRungId = rung.rungId;
    state.activeStageRef = rung.stageRef;
    render();
  });

  const window = document.createElement("span");
  window.className = "rung-button__window";
  window.textContent = rung.windowLabel;

  const bar = document.createElement("span");
  bar.className = "rung-button__bar";
  const fill = document.createElement("span");
  fill.className = "rung-button__fill";
  bar.append(fill);

  const summary = document.createElement("span");
  summary.className = "rung-button__summary";
  summary.textContent = rung.summary;

  button.append(window, bar, summary);
  return button;
}

function renderHeader(session, stage, rung) {
  elements.pageTitle.textContent = state.payload.title;
  elements.pageSubtitle.textContent = state.payload.subtitle;
  elements.basisStatement.textContent = state.payload.basisStatement;
  elements.requestBindingBadge.textContent = session.requestBindingBadge;
  elements.resumabilityChip.textContent = session.resumabilityChip;
  elements.transferStateChip.textContent = session.transferState;
  elements.validationStateChip.textContent = session.validationState;
  elements.ladderTitle.textContent =
    rung === null ? session.displayName : `${session.displayName} · ${rung.windowLabel}`;
  elements.stageSummary.textContent = session.stageRef === stage.stageRef ? session.stageSummary : stage.summary;

  elements.sessionSelector.replaceChildren(
    ...state.payload.sessions.map((entry) =>
      createSessionButton(entry, entry.sessionId === session.sessionId),
    ),
  );
}

function renderStageRail(stage) {
  elements.stageList.replaceChildren(
    ...state.payload.stages.map((entry) => {
      const item = document.createElement("li");
      item.className = "stage-item";
      item.append(createStageButton(entry, entry.stageRef === stage.stageRef));
      return item;
    }),
  );
}

function renderLadder(session, stage, rung) {
  elements.ladderColumn.replaceChildren(
    ...visibleRungs(session).map((entry) =>
      createRungButton(session, entry, entry.rungId === rung?.rungId, stage.stageRef),
    ),
  );

  const visibleSeams = session.seams.filter((entry) => entry.stageRef === stage.stageRef);
  if (visibleSeams.length === 0) {
    const empty = document.createElement("p");
    empty.className = "inspector-copy";
    empty.textContent = "No seam note for this stage.";
    elements.seamList.replaceChildren(empty);
    return;
  }

  elements.seamList.replaceChildren(
    ...visibleSeams.map((entry) => {
      const card = document.createElement("section");
      card.className = "seam-card";
      card.dataset.active = "true";
      const title = document.createElement("h3");
      title.textContent = entry.title;
      const note = document.createElement("p");
      note.className = "inspector-copy";
      note.textContent = entry.note;
      card.append(title, note);
      return card;
    }),
  );
}

function renderBindingPanel(session) {
  elements.bindingToggle.setAttribute("aria-pressed", state.bindingOpen ? "true" : "false");
  elements.bindingDetails.hidden = !state.bindingOpen;
  elements.bindingDetails.replaceChildren();
  if (!state.bindingOpen) {
    return;
  }

  const intro = document.createElement("p");
  intro.className = "binding-copy";
  intro.textContent =
    "Frozen request identity stays stable while live request drift, reconfirmation, and next-action posture remain explicit.";

  const metrics = document.createElement("div");
  metrics.className = "binding-metrics";
  metrics.append(
    chip(session.requestBindingBadge),
    chip(session.nextActionCode),
    chip(session.attachmentState),
  );

  const refs = fieldList([
    ["frozen request version", session.frozenRequestVersionRef],
    ["live request version", session.liveRequestVersionRef],
    ["storage_ref", session.storageRef],
    ["session_id", session.sessionId],
  ]);

  const notes = document.createElement("ul");
  notes.className = "note-list";
  [
    "Current request completion stays separate from chronological upload history.",
    "Rebase uses the same upload session and storage lineage until the transfer settles.",
    "A stale accepted upload must ask for explicit reconfirmation before it can satisfy the live request.",
  ].forEach((entry) => {
    const item = document.createElement("li");
    item.textContent = entry;
    notes.append(item);
  });

  const wrapper = document.createElement("div");
  wrapper.className = "binding-section";
  wrapper.append(intro, metrics, refs, notes);
  elements.bindingDetails.append(wrapper);
}

function renderInspector(session, stage, rung) {
  elements.inspectorBody.replaceChildren();
  elements.inspectorTitle.textContent = rung
    ? `Chunk ${rung.chunkIndex} · ${stage.label}`
    : `${stage.label} · ${session.displayName}`;

  const intro = document.createElement("p");
  intro.className = "inspector-copy";
  intro.textContent =
    rung?.summary ??
    "Select a chunk rung to inspect offset range, checksum posture, storage lineage, and request-binding context.";
  elements.inspectorBody.append(intro);

  const metrics = document.createElement("div");
  metrics.className = "metric-row";
  metrics.append(
    chip(`bytes ${session.bytesTransferred}/${session.byteCount}`),
    chip(session.requestBindingBadge),
    chip(session.nextActionCode),
  );
  elements.inspectorBody.append(metrics);

  if (rung) {
    elements.inspectorBody.append(
      section("Chunk window", [
        fieldList([
          ["offset range", rung.windowLabel],
          ["checksum state", rung.checksumState],
          ["chunk digest", rung.checksumDigest],
          ["resume offset after chunk", String(rung.resumeOffsetAfterChunk)],
        ]),
      ]),
    );
  }

  elements.inspectorBody.append(
    section("Transfer contract", [
      fieldList([
        ["storage_ref", session.storageRef],
        ["frozen request version", session.frozenRequestVersionRef],
        ["live request version", session.liveRequestVersionRef],
        ["request binding", session.requestBindingState],
        ["attachment state", session.attachmentState],
        ["next action", session.nextActionCode],
      ]),
    ]),
  );

  const notes = document.createElement("ul");
  notes.className = "note-list";
  [
    rung?.storageLineageNote ??
      "The upload session remains the primary recovery anchor for reconnect and retry.",
    "Transfer success never flips the session to attached or complete unless attachment truth says so.",
    "No provider object URL or signed URL appears in the atlas because storage_ref is the only backing-handle lineage published here.",
  ].forEach((entry) => {
    const item = document.createElement("li");
    item.textContent = entry;
    notes.append(item);
  });
  elements.inspectorBody.append(section("Notes", [notes]));
}

function render() {
  const session = activeSession();
  const stage = activeStage();
  const rung = activeRung();
  renderHeader(session, stage, rung);
  renderStageRail(stage);
  renderLadder(session, stage, rung);
  renderBindingPanel(session);
  renderInspector(session, stage, rung);
}

async function load() {
  const response = await fetch(dataPath);
  if (!response.ok) {
    throw new Error(`Failed to load atlas data from ${dataPath}`);
  }
  state.payload = await response.json();
  state.activeSessionId = state.payload.selectedSessionId;
  state.activeStageRef = null;
  state.activeRungId = null;

  elements.bindingToggle.addEventListener("click", () => {
    state.bindingOpen = !state.bindingOpen;
    render();
  });

  setMotionPreference();
  render();
}

load().catch((error) => {
  console.error(error);
  document.body.innerHTML = `<pre>${error.message}</pre>`;
});
