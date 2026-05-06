const rawRefs = {
  etag: "raw-authority-tax-value-never-render",
  shellToken: "raw-shell-token-never-render",
};

const baseFrame = {
  cache: {
    access: "access-binding:pc0233:current",
    masking: "masking:pc0233:current",
    route: "calm.manifest|manifest:pc0233|manifest",
    session: "session-binding:pc0233:current",
  },
  components: {
    decision_bundle_hash_or_null: "sha256:pc0233-decision-current",
    frame_epoch_or_null: 42,
    policy_snapshot_hash_or_null: "sha256:pc0233-policy-current",
    shell_stability_token_or_null: rawRefs.shellToken,
    view_guard_ref_or_null: "view-guard:pc0233:manifest",
    work_item_version_or_null: 17,
  },
  etag: rawRefs.etag,
  guardVectorHash: "sha256:pc0233-route-guard-current",
  publicationGeneration: 3,
  resumeCapability: "STREAM_RESUMABLE",
  resumeToken: "resume:pc0233:128",
  routeScopeClass: "MANIFEST_EXPERIENCE",
  stream: {
    deliveryWindowState: "LIVE_RESUMABLE",
    rebaseReason: null,
  },
};

const scenarioFrames = {
  access: {
    ...baseFrame,
    cache: {
      ...baseFrame.cache,
      access: "access-binding:pc0233:changed",
      masking: "masking:pc0233:changed",
      session: "session-binding:pc0233:changed",
    },
    stream: {
      deliveryWindowState: "ACCESS_REBIND_REQUIRED",
      rebaseReason: "ACCESS_BINDING_CHANGED",
    },
  },
  current: baseFrame,
  rebase: {
    ...baseFrame,
    components: {
      ...baseFrame.components,
      frame_epoch_or_null: 43,
      shell_stability_token_or_null: "shell-stability:pc0233:rebased",
    },
    guardVectorHash: "sha256:pc0233-route-guard-rebase",
    publicationGeneration: 4,
    stream: {
      deliveryWindowState: "REBASE_REQUIRED",
      rebaseReason: "FRAME_EPOCH_ADVANCED",
    },
  },
  snapshot: {
    ...baseFrame,
    resumeCapability: "SNAPSHOT_ONLY",
    resumeToken: null,
    stream: {
      deliveryWindowState: "SNAPSHOT_ONLY",
      rebaseReason: null,
    },
  },
  stale: {
    ...baseFrame,
    components: {
      ...baseFrame.components,
      decision_bundle_hash_or_null: "sha256:pc0233-decision-stale",
    },
    guardVectorHash: "sha256:pc0233-route-guard-stale",
    publicationGeneration: 4,
  },
};

let selectedScenario = "current";

function checksum(input) {
  let total = 0;
  for (let index = 0; index < input.length; index += 1) {
    total = (total + input.charCodeAt(index) * (index + 1)) % 9973;
  }
  return total.toString(16).padStart(4, "0");
}

function opaque(value) {
  if (value === null || value === undefined || value.length === 0) {
    return "opaque:none";
  }
  return `opaque:${value.length}:${checksum(value)}`;
}

function postureLabel(posture) {
  return posture.toLowerCase().replaceAll("_", " ");
}

function driftKeys(current, next) {
  return Object.keys(current.components).filter(
    (key) => current.components[key] !== next.components[key],
  );
}

function evaluate(next) {
  const drifts = driftKeys(baseFrame, next);
  const purgeCues = [];
  if (baseFrame.cache.session !== next.cache.session) {
    purgeCues.push("PURGE_CACHE_ON_SESSION_DRIFT");
  }
  if (baseFrame.cache.access !== next.cache.access) {
    purgeCues.push("PURGE_CACHE_ON_ACCESS_BINDING_DRIFT");
  }
  if (baseFrame.cache.masking !== next.cache.masking) {
    purgeCues.push("PURGE_CACHE_ON_MASKING_POSTURE_DRIFT");
  }
  if (baseFrame.cache.route !== next.cache.route) {
    purgeCues.push("PURGE_CACHE_ON_ROUTE_DRIFT");
  }

  if (
    next.stream.deliveryWindowState === "ACCESS_REBIND_REQUIRED" ||
    purgeCues.some((cue) => cue !== "PURGE_CACHE_ON_ROUTE_DRIFT")
  ) {
    return {
      canFormCommand: false,
      driftKeys: drifts,
      posture: "ACCESS_REBIND_REQUIRED",
      purgeCues,
      streamResumeControlsAvailable: false,
    };
  }
  if (
    next.stream.deliveryWindowState === "REBASE_REQUIRED" ||
    drifts.includes("frame_epoch_or_null") ||
    drifts.includes("shell_stability_token_or_null")
  ) {
    return {
      canFormCommand: false,
      driftKeys: drifts,
      posture: "REBASE_REQUIRED",
      purgeCues,
      streamResumeControlsAvailable: false,
    };
  }
  if (next.resumeCapability === "SNAPSHOT_ONLY") {
    return {
      canFormCommand: false,
      driftKeys: drifts,
      posture: "SNAPSHOT_ONLY",
      purgeCues,
      streamResumeControlsAvailable: false,
    };
  }
  if (next.guardVectorHash !== baseFrame.guardVectorHash || drifts.length > 0) {
    return {
      canFormCommand: false,
      driftKeys: drifts,
      posture: "STALE",
      purgeCues,
      streamResumeControlsAvailable: false,
    };
  }
  return {
    canFormCommand: true,
    driftKeys: drifts,
    posture: "CURRENT",
    purgeCues,
    streamResumeControlsAvailable: true,
  };
}

function el(tagName, options = {}) {
  const node = document.createElement(tagName);
  if (options.className) {
    node.className = options.className;
  }
  if (options.text) {
    node.textContent = options.text;
  }
  if (options.attrs) {
    for (const [key, value] of Object.entries(options.attrs)) {
      if (value !== null && value !== undefined) {
        node.setAttribute(key, String(value));
      }
    }
  }
  return node;
}

function setMotionMode(root) {
  const reduced =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  root.dataset.motionMode = reduced ? "reduced" : "standard";
}

function renderPill(frame, evaluation) {
  const pill = el("div", {
    className: "stability-pill",
    attrs: {
      "aria-label": `Route stability ${postureLabel(evaluation.posture)}`,
      "data-currentness-posture": evaluation.posture,
      "data-guard-vector-ref": opaque(frame.guardVectorHash),
      "data-route-scope-class": frame.routeScopeClass,
      "data-testid": "stability-debug-pill",
      role: "status",
    },
  });
  pill.append(
    el("span", { className: "pill-state", text: postureLabel(evaluation.posture) }),
    el("span", { className: "pill-ref", text: opaque(frame.guardVectorHash) }),
  );
  return pill;
}

function renderControls() {
  const controls = el("div", {
    className: "controls",
    attrs: { "aria-label": "Guard drift controls" },
  });
  for (const [scenario, label] of [
    ["current", "Current"],
    ["stale", "Stale guard"],
    ["rebase", "Rebase"],
    ["access", "Access rebind"],
    ["snapshot", "Snapshot only"],
  ]) {
    const button = el("button", {
      className: "control-button",
      text: label,
      attrs: {
        "aria-pressed": selectedScenario === scenario,
        "data-testid": `set-${scenario}`,
        type: "button",
      },
    });
    button.addEventListener("click", () => {
      selectedScenario = scenario;
      render();
      const nextButton = document.querySelector(`[data-testid="set-${scenario}"]`);
      if (nextButton instanceof HTMLElement) {
        nextButton.focus();
      }
    });
    controls.append(button);
  }
  return controls;
}

function guardRows(frame, evaluation) {
  return [
    ["Route scope", frame.routeScopeClass],
    ["Guard vector", opaque(frame.guardVectorHash)],
    ["ETag", opaque(frame.etag)],
    ["Shell token", opaque(frame.components.shell_stability_token_or_null)],
    ["Frame epoch", String(frame.components.frame_epoch_or_null)],
    ["Decision bundle", opaque(frame.components.decision_bundle_hash_or_null)],
    ["Drift keys", evaluation.driftKeys.length === 0 ? "none" : evaluation.driftKeys.join(", ")],
    ["Purge cues", evaluation.purgeCues.length === 0 ? "none" : evaluation.purgeCues.join(", ")],
  ];
}

function renderGuardList(frame, evaluation) {
  const list = el("section", {
    className: "state-panel",
    attrs: { "aria-labelledby": "guard-ledger-title", "data-testid": "guard-ledger" },
  });
  list.append(el("h2", { attrs: { id: "guard-ledger-title" }, text: "Guard Ledger" }));
  const rows = el("div", { className: "guard-list" });
  for (const [key, value] of guardRows(frame, evaluation)) {
    const row = el("div", { className: "guard-row" });
    row.append(
      el("span", { className: "guard-key", text: key }),
      el("span", { className: "guard-value", text: value }),
    );
    rows.append(row);
  }
  list.append(rows);
  return list;
}

function actionText(posture) {
  if (posture === "CURRENT") {
    return "Issue guarded mutation";
  }
  if (posture === "SNAPSHOT_ONLY") {
    return "Snapshot only";
  }
  if (posture === "ACCESS_REBIND_REQUIRED") {
    return "Rebind access";
  }
  if (posture === "REBASE_REQUIRED") {
    return "Rebase required";
  }
  return "Blocked by stale guard";
}

function renderActions(frame, evaluation) {
  const panel = el("section", {
    className: "state-panel",
    attrs: { "aria-labelledby": "action-title", "data-testid": "action-panel" },
  });
  panel.append(el("h2", { attrs: { id: "action-title" }, text: "Command Posture" }));

  const stack = el("div", { className: "action-stack" });
  const primary = el("button", {
    className: "primary-action",
    text: actionText(evaluation.posture),
    attrs: {
      "aria-disabled": evaluation.canFormCommand ? "false" : "true",
      "data-currentness-posture": evaluation.posture,
      "data-testid": "primary-action",
      type: "button",
    },
  });
  primary.disabled = !evaluation.canFormCommand;
  const resume = el("button", {
    className: "secondary-action",
    text: evaluation.streamResumeControlsAvailable ? "Resume stream" : "Stream resume unavailable",
    attrs: {
      "aria-disabled": evaluation.streamResumeControlsAvailable ? "false" : "true",
      "data-resume-available": evaluation.streamResumeControlsAvailable,
      "data-testid": "stream-resume-action",
      type: "button",
    },
  });
  resume.disabled = !evaluation.streamResumeControlsAvailable;
  stack.append(primary, resume);

  const notice = el("p", {
    className: "notice",
    text:
      evaluation.posture === "CURRENT"
        ? "Guard snapshot is current and command formation has all required route-scoped guards."
        : "Command formation is withheld until the route receives a current compatible guard snapshot.",
    attrs: {
      "data-posture": evaluation.posture,
      "data-testid": "posture-notice",
      role: evaluation.posture === "CURRENT" ? "status" : "alert",
    },
  });

  panel.append(stack, notice);
  return panel;
}

function render() {
  const root = document.getElementById("view-guard-root");
  const frame = scenarioFrames[selectedScenario];
  const evaluation = evaluate(frame);
  root.replaceChildren();
  setMotionMode(root);

  const header = el("header", { className: "state-header" });
  const copy = el("div");
  copy.append(
    el("p", { className: "eyebrow", text: "pc_0233 internal state container harness" }),
    el("h1", { text: "View Guard State Containers" }),
    el("p", {
      className: "lede",
      text: "Mocked route guards compare grouped stability vectors and switch command posture when currentness drifts.",
    }),
  );
  header.append(copy, renderPill(frame, evaluation));

  const grid = el("div", { className: "state-grid" });
  const controlsPanel = el("section", {
    className: "state-panel",
    attrs: { "aria-labelledby": "controls-title", "data-testid": "state-controls" },
  });
  controlsPanel.append(
    el("h2", { attrs: { id: "controls-title" }, text: "Posture Controls" }),
    renderControls(),
  );
  grid.append(renderGuardList(frame, evaluation), controlsPanel);

  const liveRegion = el("div", {
    className: "notice",
    text: `Currentness posture: ${postureLabel(evaluation.posture)}.`,
    attrs: {
      "aria-live": evaluation.posture === "CURRENT" ? "polite" : "assertive",
      "data-testid": "currentness-live-region",
      role: evaluation.posture === "CURRENT" ? "status" : "alert",
    },
  });

  root.append(header, grid, renderActions(frame, evaluation), liveRegion);
}

render();
