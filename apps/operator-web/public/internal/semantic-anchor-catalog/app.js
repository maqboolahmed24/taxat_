const SURFACES = [
  {
    shellFamily: "CALM_SHELL",
    selectorProfile: "OPERATOR_SEMANTIC_SELECTORS_V1",
    surfaceType: "LowNoiseExperienceFrame",
    accent: "#1D4ED8",
    anchors: [
      ["SHELL_ROOT", "low-noise-shell", "Low noise shell", "main", 1, null, null],
      ["SHELL_FAMILY", "shell-family", "Shell family", "region", null, null, null],
      ["OBJECT_ANCHOR", "object-anchor", "Object anchor", "region", null, null, null],
      ["DOMINANT_QUESTION", "dominant-question", "Dominant question", "region", 1, null, null],
      ["DOMINANT_ACTION", "dominant-action", "Dominant action", "region", null, null, null],
      ["SETTLEMENT_POSTURE", "settlement-posture", "Settlement posture", "region", null, null, null],
      ["RECOVERY_POSTURE", "recovery-posture", "Recovery posture", "region", null, null, null],
      ["CONTEXT_BAR", "context-bar", "Context bar", "navigation", null, null, "CONTEXT_BAR"],
      ["DECISION_SUMMARY", "decision-summary", "Decision summary", "region", 2, null, "DECISION_SUMMARY"],
      ["ACTION_STRIP", "action-strip", "Action strip", "toolbar", null, null, "ACTION_STRIP"],
      ["PRIMARY_ACTION", "primary-action", "Primary action", "button", null, null, "PRIMARY_ACTION"],
      ["NO_SAFE_ACTION_REASON", "no-safe-action", "No safe action reason", "region", null, null, null],
      ["DETAIL_DRAWER", "detail-drawer", "Detail drawer", "complementary", 2, null, "DETAIL_DRAWER"],
      ["PROMOTED_SUPPORT_REGION", "promoted-support-region", "Promoted support region", "complementary", 2, null, "PROMOTED_SUPPORT_REGION"],
      ["LIMITATION_NOTICE", "limitation-notice", "Limitation notice", "status", null, "polite", null],
      ["RECOVERY_NOTICE", "recovery-notice", "Recovery notice", "status", null, "assertive", null],
      ["ARTIFACT_HANDOFF", "artifact-handoff", "Artifact handoff", "region", null, null, null],
      ["ARTIFACT_STATE_LABEL", "artifact-state-label", "Artifact state label", "region", null, null, null],
      ["DETAIL_DRAWER", "detail-entry-evidence-prism", "Detail entry evidence prism", "region", 3, null, "DETAIL_DRAWER"],
    ],
    focusPath: [
      "shell-family",
      "object-anchor",
      "dominant-question",
      "action-strip",
      "promoted-support-region",
      "return-path-control",
    ],
  },
  {
    shellFamily: "CALM_SHELL",
    selectorProfile: "OPERATOR_SEMANTIC_SELECTORS_V1",
    surfaceType: "WorkspaceSnapshot",
    accent: "#1D4ED8",
    anchors: [
      ["SHELL_ROOT", "workspace-shell", "Workspace shell", "main", 1, null, null],
      ["SHELL_FAMILY", "shell-family", "Shell family", "region", null, null, null],
      ["OBJECT_ANCHOR", "object-anchor", "Object anchor", "region", null, null, null],
      ["DOMINANT_QUESTION", "dominant-question", "Dominant question", "region", 1, null, null],
      ["CONTEXT_BAR", "context-bar", "Context bar", "navigation", null, null, "CONTEXT_BAR"],
      ["DECISION_SUMMARY", "decision-summary", "Decision summary", "region", 2, null, "DECISION_SUMMARY"],
      ["ACTION_STRIP", "action-strip", "Action strip", "toolbar", null, null, "ACTION_STRIP"],
      ["DETAIL_DRAWER", "detail-drawer", "Detail drawer", "complementary", 2, null, "DETAIL_DRAWER"],
      ["PROMOTED_SUPPORT_REGION", "promoted-support-region", "Promoted support region", "complementary", 2, null, "PROMOTED_SUPPORT_REGION"],
      ["RETURN_PATH_CONTROL", "return-path-control", "Return path control", "button", null, null, null],
      ["LIMITATION_NOTICE", "limitation-notice", "Limitation notice", "status", null, "polite", null],
      ["RECOVERY_NOTICE", "recovery-notice", "Recovery notice", "status", null, "assertive", null],
    ],
    focusPath: ["context-bar", "decision-summary", "action-strip", "detail-drawer"],
  },
  {
    shellFamily: "CLIENT_PORTAL_SHELL",
    selectorProfile: "PORTAL_SEMANTIC_SELECTORS_V1",
    surfaceType: "ClientPortalWorkspace",
    accent: "#0F766E",
    anchors: [
      ["SHELL_ROOT", "portal-shell", "Portal shell", "main", 1, null, null],
      ["SHELL_FAMILY", "shell-family", "Shell family", "region", null, null, null],
      ["OBJECT_ANCHOR", "object-anchor", "Object anchor", "region", null, null, null],
      ["DOMINANT_QUESTION", "dominant-question", "Dominant question", "region", 1, null, null],
      ["WORKSPACE_POSTURE", "portal-workspace-posture", "Workspace posture", "region", null, null, null],
      ["PRIMARY_ACTION", "portal-primary-action", "Primary action", "button", null, null, "PRIMARY_ACTION"],
      ["PROMOTED_SUPPORT_REGION", "portal-support-panel", "Portal support panel", "complementary", 2, null, "PROMOTED_SUPPORT_REGION"],
      ["ROUTE_TABS", "portal-route-tabs", "Route tabs", "tablist", null, null, null],
      ["REQUEST_FOCUS", "portal-request-focus", "Request focus", "region", null, null, null],
      ["CURRENT_ARTIFACT", "portal-current-artifact", "Current artifact", "region", null, null, null],
      ["HISTORY_LIST", "portal-history-list", "History list", "list", null, null, null],
      ["RETURN_PATH_CONTROL", "return-path-control", "Return path control", "button", null, null, null],
      ["LIMITATION_NOTICE", "limitation-notice", "Limitation notice", "status", null, "polite", null],
      ["RECOVERY_NOTICE", "portal-inline-recovery", "Inline recovery", "status", null, "assertive", null],
    ],
    focusPath: ["portal-shell", "portal-primary-action", "portal-support-panel", "return-path-control"],
  },
  {
    shellFamily: "GOVERNANCE_DENSITY_SHELL",
    selectorProfile: "GOVERNANCE_SEMANTIC_SELECTORS_V1",
    surfaceType: "TenantGovernanceSnapshot",
    accent: "#6D28D9",
    anchors: [
      ["SHELL_ROOT", "governance-context-bar", "Governance context bar", "main", 1, null, null],
      ["SHELL_FAMILY", "governance-shell-family", "Shell family", "region", null, null, null],
      ["OBJECT_ANCHOR", "governance-object-anchor", "Object anchor", "region", null, null, null],
      ["DOMINANT_QUESTION", "dominant-question", "Dominant question", "region", 1, null, null],
      ["SECTION_NAV", "governance-section-nav", "Section navigation", "navigation", null, null, "SECTION_NAV"],
      ["PRIMARY_WORKLIST", "governance-primary-worklist", "Primary worklist", "navigation", null, null, "PRIMARY_WORKLIST"],
      ["WORKSPACE_HEADER", "workspace-header", "Workspace header", "banner", 2, null, "WORKSPACE_HEADER"],
      ["ATTENTION_SUMMARY", "overview-attention-summary", "Attention summary", "region", 2, null, "ATTENTION_SUMMARY"],
      ["PROMOTED_SUPPORT_REGION", "governance-support-sidecar", "Governance support sidecar", "complementary", 2, null, "PROMOTED_SUPPORT_REGION"],
      ["RISK_LEDGER", "governance-risk-ledger", "Risk ledger", "region", null, null, null],
      ["LIMITATION_NOTICE", "limitation-notice", "Limitation notice", "status", null, "polite", null],
      ["RECOVERY_NOTICE", "recovery-notice", "Recovery notice", "status", null, "assertive", null],
    ],
    focusPath: [
      "governance-section-nav",
      "governance-primary-worklist",
      "workspace-header",
      "overview-attention-summary",
      "governance-support-sidecar",
    ],
  },
  {
    shellFamily: "CALM_SHELL",
    selectorProfile: "OPERATOR_SEMANTIC_SELECTORS_V1",
    surfaceType: "NativeOperatorWorkspaceScene",
    accent: "#1D4ED8",
    anchors: [
      ["SHELL_ROOT", "native-operator-workspace", "Native operator workspace", "main", 1, null, null],
      ["LEADING_SIDEBAR", "leading-sidebar", "Leading sidebar", "navigation", null, null, "LEADING_SIDEBAR"],
      ["PRIMARY_CANVAS", "primary-canvas", "Primary canvas", "region", 2, null, "PRIMARY_CANVAS"],
      ["TRAILING_INSPECTOR", "trailing-inspector", "Trailing inspector", "complementary", null, null, "TRAILING_INSPECTOR"],
      ["PRIMARY_ACTION", "primary-action", "Primary action", "button", null, null, "PRIMARY_ACTION"],
      ["RECOVERY_NOTICE", "recovery-notice", "Recovery notice", "status", null, "assertive", null],
    ],
    focusPath: ["leading-sidebar", "primary-canvas", "trailing-inspector"],
  },
  {
    shellFamily: "CALM_SHELL",
    selectorProfile: "OPERATOR_SEMANTIC_SELECTORS_V1",
    surfaceType: "NativeOperatorSecondaryWindowScene",
    accent: "#1D4ED8",
    anchors: [
      ["SHELL_ROOT", "native-secondary-window", "Native secondary window", "main", 1, null, null],
      ["IDENTITY_HEADER", "identity-header", "Identity header", "banner", 1, null, "IDENTITY_HEADER"],
      ["SUMMARY_CARD", "summary-card", "Summary card", "region", 2, null, "SUMMARY_CARD"],
      ["DETAIL_BODY", "detail-body", "Detail body", "region", 2, null, "DETAIL_BODY"],
      ["RETURN_PATH_CONTROL", "return-path-control", "Return path control", "button", null, null, null],
      ["RECOVERY_NOTICE", "recovery-notice", "Recovery notice", "status", null, "assertive", null],
    ],
    focusPath: ["identity-header", "summary-card", "detail-body"],
  },
];

function setMotionMode() {
  const reduced =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.dataset.motionMode = reduced ? "reduced" : "standard";
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

function anchorRecord(tuple) {
  const [code, ref, label, role, heading, live, focusRegion] = tuple;
  return { code, ref, label, role, heading, live, focusRegion };
}

function renderAnchorRow(anchor) {
  const row = el("article", {
    className: "anchor-row",
    attrs: {
      "aria-label": anchor.label,
      "aria-live": anchor.live,
      "data-focus-region-code": anchor.focusRegion,
      "data-heading-level": anchor.heading,
      "data-native-identifier": anchor.ref,
      "data-role": anchor.role,
      "data-screen-reader-label": anchor.label,
      "data-semantic-anchor-code": anchor.code,
      "data-semantic-anchor-ref": anchor.ref,
      "data-testid": anchor.ref,
      role: anchor.role === "button" ? "button" : anchor.role,
    },
  });
  row.append(
    el("span", { className: "anchor-code", text: anchor.code }),
    el("strong", { text: anchor.ref }),
    el("span", { className: "anchor-label", text: anchor.label }),
    el("span", {
      className: "anchor-meta",
      text: `role ${anchor.role} / heading ${anchor.heading ?? "none"} / native ${anchor.ref}`,
    }),
  );
  if (anchor.live) {
    row.append(el("span", { className: `live-badge ${anchor.live}`, text: anchor.live }));
  }
  return row;
}

function renderFocusLadder(surface) {
  const nav = el("nav", {
    className: "focus-ladder",
    attrs: {
      "aria-label": `${surface.shellFamily.replaceAll("_", " ").toLowerCase()} focus path`,
      "data-focus-path": surface.surfaceType,
      "data-testid": surface.surfaceType === "LowNoiseExperienceFrame" ? "calm-focus-ladder" : "focus-ladder",
    },
  });
  surface.focusPath.forEach((ref, index) => {
    const step = el("button", {
      className: "focus-step",
      text: ref,
      attrs: {
        "aria-label": `${index + 1}. ${ref}`,
        "data-focus-index": index + 1,
        "data-testid": ref,
        type: "button",
      },
    });
    nav.append(step);
    if (index < surface.focusPath.length - 1) {
      nav.append(el("span", { className: "focus-arrow", text: "->", attrs: { "aria-hidden": "true" } }));
    }
  });
  return nav;
}

function renderSurface(surface) {
  const section = el("section", {
    className: "surface-group",
    attrs: {
      "aria-label": `${surface.surfaceType} semantic anchors`,
      "data-selector-profile": surface.selectorProfile,
      "data-shell-family": surface.shellFamily,
      "data-surface-type": surface.surfaceType,
      "data-testid": "semantic-anchor-surface-group",
    },
  });
  section.style.setProperty("--shell-accent", surface.accent);
  const header = el("div", { className: "surface-header" });
  header.append(
    el("p", { className: "eyebrow", text: surface.shellFamily }),
    el("h2", { text: surface.surfaceType }),
    el("span", { className: "selector-chip", text: surface.selectorProfile }),
  );
  const columns = el("div", { className: "catalog-columns" });
  const rows = el("div", { className: "anchor-list" });
  surface.anchors.map(anchorRecord).forEach((anchor) => rows.append(renderAnchorRow(anchor)));
  const screenReaderPath = el("ol", {
    className: "screen-reader-path",
    attrs: { "aria-label": `${surface.surfaceType} screen-reader path` },
  });
  surface.anchors
    .map(anchorRecord)
    .filter((anchor) => anchor.role !== "region" || anchor.heading !== null || anchor.live !== null)
    .slice(0, 8)
    .forEach((anchor) => {
      const item = el("li");
      item.append(
        el("strong", { text: anchor.label }),
        el("span", { text: `${anchor.role} / ${anchor.ref}` }),
      );
      screenReaderPath.append(item);
    });
  columns.append(rows, screenReaderPath);
  section.append(header, renderFocusLadder(surface), columns);
  return section;
}

function renderLiveRegionLab() {
  const lab = el("section", {
    className: "live-region-lab",
    attrs: {
      "aria-labelledby": "live-region-lab-heading",
      "data-testid": "live-region-lab",
    },
  });
  const heading = el("h2", { text: "Live Region Focus Lab", attrs: { id: "live-region-lab-heading" } });
  const composer = el("textarea", {
    attrs: {
      "aria-label": "Active composer",
      "data-active-focus-kind": "COMPOSER",
      "data-testid": "active-composer",
      rows: 3,
    },
  });
  composer.value = "Active draft focus stays here while announcements change.";
  const liveRegion = el("div", {
    className: "semantic-live-region",
    text: "No announcement yet.",
    attrs: {
      "aria-live": "polite",
      "data-announced-change-kind": "NONE",
      "data-testid": "semantic-live-region",
      role: "status",
    },
  });
  const buttonRow = el("div", { className: "live-actions" });
  const announce = (kind, mode, message) => {
    liveRegion.setAttribute("aria-live", mode);
    liveRegion.setAttribute("data-announced-change-kind", kind);
    liveRegion.setAttribute("data-live-region-mode", mode.toUpperCase());
    liveRegion.setAttribute("role", mode === "assertive" ? "alert" : "status");
    liveRegion.textContent = message;
  };
  [
    ["announce-activity", "ACTIVITY_DELTA", "polite", "Activity update announced politely."],
    ["announce-failure", "COMMAND_FAILURE", "assertive", "Command failure announced assertively."],
  ].forEach(([testId, kind, mode, message]) => {
    const button = el("button", {
      className: "secondary-button",
      text: kind,
      attrs: { "data-testid": testId, type: "button" },
    });
    button.addEventListener("mousedown", (event) => event.preventDefault());
    button.addEventListener("click", () => announce(kind, mode, message));
    buttonRow.append(button);
  });
  lab.append(heading, composer, buttonRow, liveRegion);
  return lab;
}

function renderApp() {
  setMotionMode();
  const root = document.getElementById("semantic-anchor-root");
  const app = el("main", {
    className: "anchor-catalog-shell",
    attrs: {
      "aria-label": "Semantic anchor catalog",
      "data-motion-mode": document.documentElement.dataset.motionMode,
      "data-testid": "semantic-anchor-catalog",
      role: "main",
    },
  });
  const header = el("header", { className: "page-header" });
  header.append(
    el("p", { className: "eyebrow", text: "Semantic selector and accessibility spine" }),
    el("h1", { text: "Anchor Catalog" }),
    el("p", {
      className: "lede",
      text:
        "Browser data-testid, ARIA structure, focus order, live-region policy, and native identifiers share one semantic source.",
    }),
  );
  const groups = el("div", { className: "shell-groups" });
  const shellFamilies = [...new Set(SURFACES.map((surface) => surface.shellFamily))];
  shellFamilies.forEach((shellFamily) => {
    const shellGroup = el("section", {
      className: "shell-group",
      attrs: {
        "aria-label": `${shellFamily} anchor group`,
        "data-shell-family": shellFamily,
        "data-testid": "anchor-catalog-shell-group",
      },
    });
    shellGroup.append(el("h2", { text: shellFamily }));
    SURFACES.filter((surface) => surface.shellFamily === shellFamily).forEach((surface) =>
      shellGroup.append(renderSurface(surface)),
    );
    groups.append(shellGroup);
  });
  app.append(header, groups, renderLiveRegionLab());
  root.replaceChildren(app);
}

renderApp();
