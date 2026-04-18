const phaseFilter = document.getElementById("filter-phase");
const layerFilter = document.getElementById("filter-layer");
const gapFilter = document.getElementById("filter-gap");
const manifestStatusChip = document.getElementById("manifest-status-chip");
const motionMode = document.getElementById("motion-mode");
const phaseSpine = document.getElementById("phase-spine");
const taskList = document.getElementById("task-list");
const inspector = document.getElementById("inspector");
const inspectorTitle = document.getElementById("inspector-title");
const inspectorBody = document.getElementById("inspector-body");
const inspectorClose = document.getElementById("inspector-close");
const summaryVisible = document.getElementById("summary-visible-count");
const summaryRelease = document.getElementById("summary-release-count");
const summaryGap = document.getElementById("summary-gap-count");
const resultsSummary = document.getElementById("results-summary");
const liveRegion = document.getElementById("atlas-live-region");

const state = {
  data: null,
  phase: "all",
  layer: "all",
  gap: "all",
  inspectorTaskId: null,
  lastOpenerTaskId: null,
};

function createElement(tag, className, text) {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

function setMotionMode() {
  const mode = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "reduce" : "standard";
  document.documentElement.dataset.motion = mode;
  motionMode.textContent = mode;
}

function filteredTasks() {
  if (!state.data) {
    return [];
  }
  return state.data.tasks.filter((task) => {
    if (state.phase !== "all" && task.phase !== state.phase) {
      return false;
    }
    if (state.layer === "blueprint" && task.blueprint_family_refs.length === 0) {
      return false;
    }
    if (state.layer === "release" && task.release_gate_refs.length === 0) {
      return false;
    }
    if (state.gap === "gapped" && task.blocking_gap_refs.length === 0) {
      return false;
    }
    return true;
  });
}

function lookupTask(taskId) {
  return state.data.tasks.find((task) => task.task_id === taskId) || null;
}

function lookupValidator(validatorId) {
  return state.data.validator_catalog.find((row) => row.validator_id === validatorId) || null;
}

function updateResultsSummary(tasks) {
  const releaseCount = tasks.filter((task) => task.release_gate_refs.length > 0).length;
  const gapCount = tasks.filter((task) => task.blocking_gap_refs.length > 0).length;
  summaryVisible.textContent = String(tasks.length);
  summaryRelease.textContent = String(releaseCount);
  summaryGap.textContent = String(gapCount);
  const phaseLabel = state.phase === "all" ? "all phases" : state.phase.replace("_", " ");
  const layerLabel =
    state.layer === "all"
      ? "all acceptance layers"
      : state.layer === "roadmap"
        ? "roadmap completion"
        : state.layer === "blueprint"
          ? "blueprint closure"
          : "release admissibility";
  resultsSummary.textContent = `${tasks.length} tasks visible across ${phaseLabel}; filter is ${layerLabel}.`;
}

function renderPhaseOptions() {
  const seen = new Set();
  for (const task of state.data.tasks) {
    if (seen.has(task.phase)) {
      continue;
    }
    seen.add(task.phase);
    const option = document.createElement("option");
    option.value = task.phase;
    option.textContent = task.phase.replace("_", " ");
    phaseFilter.append(option);
  }
}

function renderPhaseSpine() {
  phaseSpine.replaceChildren();
  state.data.phase_spine.forEach((unit) => {
    const button = createElement("button", "spine-card");
    button.type = "button";
    button.dataset.phaseId = unit.phase_id;
    button.dataset.testid = `phase-spine-${unit.execution_unit_id}`;
    if (unit.phase_id === state.phase || (state.phase === "all" && unit.current_state === "active")) {
      button.classList.add("active");
    }

    const phaseLabel = createElement("p", "eyebrow", unit.phase_label);
    const title = createElement(
      "p",
      "",
      unit.wave_id ? `${unit.wave_id} · ${unit.task_count} tasks` : `${unit.first_task_id} · ${unit.task_count} task`
    );
    const meta = createElement(
      "p",
      "spine-meta",
      `${unit.protocol_mode} · ${unit.current_state} · ${unit.current_claimable_task_ids.length} claimable`
    );
    button.append(phaseLabel, title, meta);
    button.addEventListener("click", () => {
      state.phase = unit.phase_id;
      phaseFilter.value = unit.phase_id;
      render();
      liveRegion.textContent = `Phase filter set to ${unit.phase_label}.`;
    });
    phaseSpine.append(button);
  });
}

function buildTagRow(values, className = "tag") {
  const container = createElement("div", "tag-stack");
  if (!values.length) {
    container.append(createElement("span", className, "n/a"));
    return container;
  }
  values.forEach((value) => {
    container.append(createElement("span", className, value));
  });
  return container;
}

function moveFocus(tasks, currentTaskId, direction) {
  const currentIndex = tasks.findIndex((task) => task.task_id === currentTaskId);
  if (currentIndex === -1) {
    return;
  }
  const lastIndex = tasks.length - 1;
  let nextIndex = currentIndex;
  if (direction === "down") {
    nextIndex = Math.min(lastIndex, currentIndex + 1);
  }
  if (direction === "up") {
    nextIndex = Math.max(0, currentIndex - 1);
  }
  if (direction === "home") {
    nextIndex = 0;
  }
  if (direction === "end") {
    nextIndex = lastIndex;
  }
  const nextTask = tasks[nextIndex];
  const nextButton = taskList.querySelector(`[data-task-id="${nextTask.task_id}"]`);
  nextButton?.focus();
}

function openInspector(taskId, openerTaskId = taskId) {
  state.inspectorTaskId = taskId;
  state.lastOpenerTaskId = openerTaskId;
  renderInspector();
}

function closeInspector() {
  inspector.hidden = true;
  state.inspectorTaskId = null;
  const openerTaskId = state.lastOpenerTaskId;
  if (openerTaskId) {
    requestAnimationFrame(() => {
      taskList.querySelector(`[data-task-id="${openerTaskId}"]`)?.focus();
    });
  }
}

function renderTaskList(tasks) {
  taskList.replaceChildren();
  if (!tasks.length) {
    const empty = createElement("div", "empty-state", "No tasks match the current filters.");
    taskList.append(empty);
    if (state.inspectorTaskId) {
      closeInspector();
    }
    return;
  }

  tasks.forEach((task) => {
    const button = createElement("button", "task-row");
    button.type = "button";
    button.dataset.taskId = task.task_id;
    button.dataset.testid = `task-row-${task.task_id}`;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(task.task_id === state.inspectorTaskId));
    if (task.task_id === state.inspectorTaskId) {
      button.classList.add("active");
    }
    if (task.blocking_gap_refs.length) {
      button.classList.add("gapped");
    }

    const title = createElement("div", "task-title");
    title.append(
      createElement("span", "task-id", task.task_id),
      createElement("strong", "", task.task_label),
      createElement(
        "span",
        "task-meta",
        `${task.phase} · ${task.protocol_mode}${task.track ? ` · ${task.track}` : ""}`
      )
    );

    const coverage = buildTagRow(task.blueprint_group_ids.map((groupId) => groupId.replaceAll("_", " ")));
    const vectors = buildTagRow(task.test_vector_refs.slice(0, 3), "code-chip");
    const gates = createElement("div", "task-title");
    gates.append(
      buildTagRow(task.release_gate_refs.slice(0, 3), "code-chip"),
      task.blocking_gap_refs.length
        ? buildTagRow(task.blocking_gap_refs.slice(0, 2), "gap-chip")
        : createElement("span", "task-meta", "No typed gap")
    );

    button.append(title, coverage, vectors, gates);
    button.addEventListener("click", () => openInspector(task.task_id));
    button.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveFocus(tasks, task.task_id, "down");
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        moveFocus(tasks, task.task_id, "up");
      }
      if (event.key === "Home") {
        event.preventDefault();
        moveFocus(tasks, task.task_id, "home");
      }
      if (event.key === "End") {
        event.preventDefault();
        moveFocus(tasks, task.task_id, "end");
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openInspector(task.task_id, task.task_id);
      }
    });
    taskList.append(button);
  });
}

function renderInspector() {
  const task = lookupTask(state.inspectorTaskId);
  if (!task) {
    inspector.hidden = true;
    return;
  }
  inspector.hidden = false;
  inspectorTitle.textContent = `${task.task_id} · ${task.task_label}`;
  inspectorBody.replaceChildren();

  const summaryCard = createElement("section", "inspector-card");
  summaryCard.append(
    createElement("h3", "", "Definition of done"),
    createElement("p", "", task.definition_of_done_summary),
    buildTagRow(task.blueprint_family_refs.slice(0, 10), "code-chip")
  );

  const validatorCard = createElement("section", "inspector-card");
  validatorCard.append(createElement("h3", "", "Exact validator commands"));
  task.validator_refs.forEach((validatorId) => {
    const validator = lookupValidator(validatorId);
    if (!validator) {
      return;
    }
    const label = createElement("p", "task-meta", validator.label);
    const code = createElement("pre", "code-block", validator.command);
    validatorCard.append(label, code);
  });

  const releaseCard = createElement("section", "inspector-card");
  releaseCard.append(
    createElement("h3", "", "Blueprint and release posture"),
    buildTagRow(task.test_vector_refs, "code-chip"),
    buildTagRow(task.release_gate_refs, "code-chip"),
    buildTagRow(task.evidence_artifact_refs, "tag")
  );

  const gapCard = createElement("section", "inspector-card");
  gapCard.dataset.testid = "typed-gap-state";
  gapCard.append(createElement("h3", "", "Typed gap state"));
  if (task.blocking_gap_refs.length) {
    gapCard.append(
      createElement(
        "p",
        "",
        task.blocking_gap_refs.join(", ")
      )
    );
    buildTagRow(task.blocking_gap_refs, "gap-chip").childNodes.forEach((node) => gapCard.append(node));
  } else {
    gapCard.append(createElement("p", "", "No typed gap is registered for this task."));
  }

  const ownershipCard = createElement("section", "inspector-card");
  ownershipCard.append(createElement("h3", "", "Packages and dependencies"));
  const list = createElement("ul");
  [
    `Primary package: ${task.primary_package_id || "n/a"}`,
    `Owner team: ${task.owner_team_handle || "n/a"}`,
    `Hard dependencies: ${task.hard_dependency_refs.join(", ") || "none"}`,
    `Soft context: ${task.soft_dependency_refs.join(", ") || "none"}`,
    `Wave candidate: ${task.wave_candidate}`,
  ].forEach((item) => {
    list.append(createElement("li", "", item));
  });
  ownershipCard.append(list);

  inspectorBody.append(summaryCard, validatorCard, releaseCard, gapCard, ownershipCard);
  liveRegion.textContent = `${task.task_id} opened in the inspector.`;
}

function render() {
  const tasks = filteredTasks();
  renderPhaseSpine();
  updateResultsSummary(tasks);
  renderTaskList(tasks);
  renderInspector();
}

async function init() {
  setMotionMode();
  window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", setMotionMode);

  const response = await fetch("./atlas_data.json");
  state.data = await response.json();
  manifestStatusChip.textContent = state.data.manifest_status.status_chip;
  renderPhaseOptions();
  render();
}

phaseFilter.addEventListener("change", (event) => {
  state.phase = event.target.value;
  render();
  liveRegion.textContent = `Phase filter changed to ${state.phase}.`;
});

layerFilter.addEventListener("change", (event) => {
  state.layer = event.target.value;
  render();
  liveRegion.textContent = `Acceptance layer changed to ${state.layer}.`;
});

gapFilter.addEventListener("change", (event) => {
  state.gap = event.target.value;
  render();
  liveRegion.textContent = `Gap filter changed to ${state.gap}.`;
});

inspectorClose.addEventListener("click", closeInspector);

init().catch((error) => {
  resultsSummary.textContent = `Failed to load atlas data: ${error.message}`;
  liveRegion.textContent = "Acceptance atlas failed to load.";
});
