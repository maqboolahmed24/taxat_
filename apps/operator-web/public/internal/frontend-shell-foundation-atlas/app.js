const FIXTURE_PATH = "/packages/frontend-shell-core/src/fixtures/web_shell_contract_packets.json";
const MOTION_CEILING_MS = 180;

const EXPECTED_FOUNDATION_BY_FAMILY = {
  CALM_SHELL: {
    selector_profile: "OPERATOR_SEMANTIC_SELECTORS_V1",
    layout_density_token: "CALM_FOUR_SURFACE_DENSITY_V1",
    surface_spacing_token: "CALM_FOUR_SURFACE_SPACING_V1",
    support_surface_spacing_token: "CALM_DETAIL_DRAWER_SUPPORT_SPACING_V1",
    responsive_compaction_token: "CALM_SUPPORT_REDOCK_V1",
    continuity_policy: "SAME_OBJECT_SAME_SHELL_INLINE_RECOVERY",
    recovery_surface_policy: "INLINE_EXPLICIT_REBASE",
    history_presentation_policy: "CURRENT_PRIMARY_HISTORY_SECONDARY",
    preview_surface_policy: "DETAIL_DRAWER_OR_PARENT_BOUND_SECONDARY_WINDOW",
    notification_surface_policy: "CONTEXT_BOUND_INLINE_FEEDBACK_OR_PARENT_MIRROR",
    secondary_window_policy: "SUPPORT_ONLY_PARENT_BOUND_CLOSE_RETURNS_FOCUS",
  },
  CLIENT_PORTAL_SHELL: {
    selector_profile: "PORTAL_SEMANTIC_SELECTORS_V1",
    layout_density_token: "PORTAL_COMFORTABLE_TASK_DENSITY_V1",
    surface_spacing_token: "PORTAL_PRIMARY_STACK_SPACING_V1",
    support_surface_spacing_token: "PORTAL_INLINE_SUPPORT_SPACING_V1",
    responsive_compaction_token: "PORTAL_STACK_BELOW_PRIMARY_V1",
    continuity_policy: "SAME_SHELL_CONTEXTUAL_RETURN",
    recovery_surface_policy: "INLINE_REVIEW_OR_RECOVERY_NOTICE",
    history_presentation_policy: "CURRENT_PRIMARY_HISTORY_SECONDARY",
    preview_surface_policy: "PRIMARY_CONTEXT_WITH_STACKED_SUPPORT",
    notification_surface_policy: "CONTEXT_BOUND_INLINE_FEEDBACK",
    secondary_window_policy: "NOT_APPLICABLE",
  },
  GOVERNANCE_DENSITY_SHELL: {
    selector_profile: "GOVERNANCE_SEMANTIC_SELECTORS_V1",
    layout_density_token: "GOVERNANCE_WORKSPACE_DENSITY_V1",
    surface_spacing_token: "GOVERNANCE_CANVAS_SPACING_V1",
    support_surface_spacing_token: "GOVERNANCE_AUXILIARY_SURFACE_SPACING_V1",
    responsive_compaction_token: "GOVERNANCE_AUXILIARY_REDOCK_V1",
    continuity_policy: "SAME_OBJECT_SAME_SHELL_CONTEXT_RETENTION",
    recovery_surface_policy: "INLINE_TYPED_CONTEXTUAL_RECOVERY",
    history_presentation_policy: "ACTIVE_SLICE_PRIMARY_CONTEXTUAL_HISTORY",
    preview_surface_policy: "AUXILIARY_SURFACE_CONTEXTUAL_ONLY",
    notification_surface_policy: "CONTEXT_BOUND_INLINE_FEEDBACK",
    secondary_window_policy: "NOT_APPLICABLE",
  },
};

const SHELL_VISUAL_TOKENS = {
  CALM_SHELL: {
    accent: "#1D4ED8",
    maxWidth: "1560px",
    leading: "280px",
    primary: "760px",
    support: "380px",
    grid: "280px minmax(720px, 1fr) 368px",
    compactGrid: "minmax(0, 1fr)",
    breakpoint: "920px",
    glyph: "CALM_FOUR_PLANES",
    compactionPlacement: "DETAIL_DRAWER_REDOCKS_BELOW_ACTION_STRIP",
  },
  CLIENT_PORTAL_SHELL: {
    accent: "#0F766E",
    maxWidth: "1120px",
    leading: "0px",
    primary: "720px",
    support: "320px",
    grid: "minmax(0, 720px) minmax(280px, 320px)",
    compactGrid: "minmax(0, 1fr)",
    breakpoint: "1024px",
    glyph: "PORTAL_TASK_WITH_SUPPORT_SHELF",
    compactionPlacement: "SUPPORT_STACKS_BELOW_PRIMARY_TASK",
  },
  GOVERNANCE_DENSITY_SHELL: {
    accent: "#6D28D9",
    maxWidth: "1560px",
    leading: "292px",
    primary: "760px",
    support: "344px",
    grid: "292px minmax(760px, 1fr) 344px",
    compactGrid: "minmax(0, 1fr)",
    breakpoint: "1040px",
    glyph: "GOVERNANCE_CANVAS_SIDECAR",
    compactionPlacement: "AUXILIARY_SURFACE_REDOCKS_WITH_SELECTION_CONTEXT",
  },
};

const SURFACE_REGISTRY = {
  CALM_SHELL: [
    {
      surface_code: "CONTEXT_BAR",
      label: "Context bar",
      role: "STRUCTURAL_CONTEXT",
      semantic_anchor_ref: "calm.context-bar",
      order: 0,
      promoted_support_eligible: false,
      default_promoted_support: false,
      support_placement: "NOT_SUPPORT",
      return_focus_behavior: "NONE",
      live_region_role: "status",
      support_mode: "DEFAULT",
    },
    {
      surface_code: "DECISION_SUMMARY",
      label: "Decision summary",
      role: "PRIMARY_WORKSPACE",
      semantic_anchor_ref: "calm.decision-summary",
      order: 1,
      promoted_support_eligible: false,
      default_promoted_support: false,
      support_placement: "NOT_SUPPORT",
      return_focus_behavior: "NONE",
      live_region_role: "none",
      support_mode: "DEFAULT",
    },
    {
      surface_code: "ACTION_STRIP",
      label: "Action strip",
      role: "PRIMARY_ACTION",
      semantic_anchor_ref: "calm.action-strip",
      order: 2,
      promoted_support_eligible: false,
      default_promoted_support: false,
      support_placement: "NOT_SUPPORT",
      return_focus_behavior: "NONE",
      live_region_role: "none",
      support_mode: "DEFAULT",
    },
    {
      surface_code: "DETAIL_DRAWER",
      label: "Detail drawer",
      role: "PROMOTED_SUPPORT",
      semantic_anchor_ref: "calm.detail-drawer",
      order: 3,
      promoted_support_eligible: true,
      default_promoted_support: true,
      support_placement: "RIGHT_SUPPORT",
      return_focus_behavior: "RETURN_TO_INVOKER_OR_LAWFUL_ANCESTOR",
      live_region_role: "none",
      support_mode: "DEFAULT",
    },
  ],
  CLIENT_PORTAL_SHELL: [
    {
      surface_code: "IDENTITY_HEADER",
      label: "Identity header",
      role: "STRUCTURAL_CONTEXT",
      semantic_anchor_ref: "portal.identity-header",
      order: 0,
      promoted_support_eligible: false,
      default_promoted_support: false,
      support_placement: "NOT_SUPPORT",
      return_focus_behavior: "NONE",
      live_region_role: "none",
      support_mode: "DEFAULT",
    },
    {
      surface_code: "SUMMARY_CARD",
      label: "Status hero",
      role: "PRIMARY_WORKSPACE",
      semantic_anchor_ref: "portal.status-hero",
      order: 1,
      promoted_support_eligible: false,
      default_promoted_support: false,
      support_placement: "NOT_SUPPORT",
      return_focus_behavior: "NONE",
      live_region_role: "status",
      support_mode: "DEFAULT",
    },
    {
      surface_code: "PRIMARY_ACTION",
      label: "Primary action",
      role: "PRIMARY_ACTION",
      semantic_anchor_ref: "portal.primary-action",
      order: 2,
      promoted_support_eligible: false,
      default_promoted_support: false,
      support_placement: "NOT_SUPPORT",
      return_focus_behavior: "NONE",
      live_region_role: "none",
      support_mode: "DEFAULT",
    },
    {
      surface_code: "PROMOTED_SUPPORT_REGION",
      label: "Promoted support region",
      role: "PROMOTED_SUPPORT",
      semantic_anchor_ref: "portal.promoted-support-region",
      order: 3,
      promoted_support_eligible: true,
      default_promoted_support: true,
      support_placement: "STACK_BELOW_PRIMARY",
      return_focus_behavior: "RETURN_FOCUS_ANCHOR_THEN_LATEST_VISIBLE",
      live_region_role: "status",
      support_mode: "HELP",
    },
  ],
  GOVERNANCE_DENSITY_SHELL: [
    {
      surface_code: "PRIMARY_WORKLIST",
      label: "Primary worklist",
      role: "STRUCTURAL_CONTEXT",
      semantic_anchor_ref: "governance.primary-worklist",
      order: 0,
      promoted_support_eligible: false,
      default_promoted_support: false,
      support_placement: "NOT_SUPPORT",
      return_focus_behavior: "NONE",
      live_region_role: "none",
      support_mode: "DEFAULT",
    },
    {
      surface_code: "WORKSPACE_HEADER",
      label: "Workspace header",
      role: "STRUCTURAL_CONTEXT",
      semantic_anchor_ref: "governance.workspace-header",
      order: 1,
      promoted_support_eligible: false,
      default_promoted_support: false,
      support_placement: "NOT_SUPPORT",
      return_focus_behavior: "NONE",
      live_region_role: "status",
      support_mode: "DEFAULT",
    },
    {
      surface_code: "PRIMARY_CANVAS",
      label: "Primary canvas",
      role: "PRIMARY_WORKSPACE",
      semantic_anchor_ref: "governance.primary-canvas",
      order: 2,
      promoted_support_eligible: false,
      default_promoted_support: false,
      support_placement: "NOT_SUPPORT",
      return_focus_behavior: "NONE",
      live_region_role: "none",
      support_mode: "DEFAULT",
    },
    {
      surface_code: "TRAILING_INSPECTOR",
      label: "Trailing inspector",
      role: "PROMOTED_SUPPORT",
      semantic_anchor_ref: "governance.trailing-inspector",
      order: 3,
      promoted_support_eligible: true,
      default_promoted_support: true,
      support_placement: "AUXILIARY_SIDECAR",
      return_focus_behavior: "RETURN_FOCUS_ANCHOR_OR_ROVING_SELECTION",
      live_region_role: "none",
      support_mode: "DEFAULT",
    },
  ],
};

function setMotionMode() {
  const reduced =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.dataset.motion = reduced ? "reduce" : "standard";
}

function el(tagName, options = {}) {
  const node = document.createElement(tagName);
  if (options.className) {
    node.className = options.className;
  }
  if (options.text) {
    node.textContent = options.text;
  }
  if (options.html) {
    node.innerHTML = options.html;
  }
  if (options.attrs) {
    for (const [key, value] of Object.entries(options.attrs)) {
      if (value !== undefined && value !== null) {
        node.setAttribute(key, String(value));
      }
    }
  }
  return node;
}

function anchorByCode(route, anchorCode) {
  const anchor = route.semantic_anchors.find((candidate) => candidate.anchor_code === anchorCode);
  if (!anchor) {
    throw new Error(`Route ${route.route_id} is missing anchor ${anchorCode}`);
  }
  return anchor;
}

function validateFoundationContract(shellFamily, foundationContract) {
  if (!foundationContract) {
    return {
      ok: false,
      code: "THEME_CONTRACT_MISSING_FOUNDATION",
      message: `Missing InteractionLayerFoundationContract for ${shellFamily}.`,
    };
  }

  if (foundationContract.shell_family !== shellFamily) {
    return {
      ok: false,
      code: "THEME_CONTRACT_FAMILY_MISMATCH",
      message: `${foundationContract.shell_family} cannot theme ${shellFamily}.`,
    };
  }

  const expected = EXPECTED_FOUNDATION_BY_FAMILY[shellFamily];
  for (const [key, value] of Object.entries(expected)) {
    if (foundationContract[key] !== value) {
      return {
        ok: false,
        code: key === "selector_profile" ? "THEME_CONTRACT_SELECTOR_MISMATCH" : "THEME_CONTRACT_TOKEN_MISMATCH",
        message: `${shellFamily} expected ${key}=${value} but received ${foundationContract[key]}.`,
      };
    }
  }

  return { ok: true, expected };
}

function buildThemeContract(shellFamily, foundationContract, reducedMotion = false) {
  const validation = validateFoundationContract(shellFamily, foundationContract);
  if (!validation.ok) {
    return validation;
  }

  const visual = SHELL_VISUAL_TOKENS[shellFamily];
  const motion = reducedMotion
    ? { mode: "reduced", duration: "1ms", easing: "linear", translateY: "0px", opacityFrom: "1" }
    : {
        mode: "standard",
        duration: "160ms",
        easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        translateY: "6px",
        opacityFrom: "0.94",
      };

  return {
    ok: true,
    shellFamily,
    cssVars: {
      "--taxat-page": "#F7F5F1",
      "--taxat-surface": "#FFFFFF",
      "--taxat-surface-secondary": "#F1F3F0",
      "--taxat-surface-wash": "#ECE8DF",
      "--taxat-ink": "#171717",
      "--taxat-muted": "#667085",
      "--taxat-line": "rgba(17, 24, 39, 0.08)",
      "--taxat-shadow": "0 10px 28px rgba(17, 24, 39, 0.06)",
      "--taxat-radius": "20px",
      "--taxat-radius-tight": "18px",
      "--taxat-accent": visual.accent,
      "--taxat-focus-ring": visual.accent,
      "--taxat-shell-max-width": visual.maxWidth,
      "--taxat-shell-leading-width": visual.leading,
      "--taxat-shell-primary-min-width": visual.primary,
      "--taxat-shell-support-width": visual.support,
      "--taxat-shell-grid-template": visual.grid,
      "--taxat-shell-compact-grid-template": visual.compactGrid,
      "--taxat-shell-compact-breakpoint": visual.breakpoint,
      "--taxat-motion-duration": motion.duration,
      "--taxat-motion-easing": motion.easing,
      "--taxat-motion-opacity-from": motion.opacityFrom,
      "--taxat-motion-translate-y": motion.translateY,
    },
    dataAttrs: {
      "data-taxat-shell-family": shellFamily,
      "data-selector-profile": foundationContract.selector_profile,
      "data-layout-density-token": foundationContract.layout_density_token,
      "data-surface-spacing-token": foundationContract.surface_spacing_token,
      "data-support-spacing-token": foundationContract.support_surface_spacing_token,
      "data-responsive-compaction-token": foundationContract.responsive_compaction_token,
      "data-motion-token": foundationContract.motion_token,
      "data-motion-mode": motion.mode,
      "data-theme-contract-state": "valid",
      "data-card-glyph": visual.glyph,
    },
    tokenStrips: [
      ["density", foundationContract.layout_density_token],
      ["spacing", foundationContract.surface_spacing_token],
      ["support", foundationContract.support_surface_spacing_token],
      ["compaction", visual.compactionPlacement],
      ["motion", `${foundationContract.motion_profile} / ${motion.duration}`],
      ["current/history", foundationContract.history_presentation_policy],
      ["preview", foundationContract.preview_surface_policy],
      ["notification", foundationContract.notification_surface_policy],
      ["recovery", foundationContract.recovery_surface_policy],
    ],
  };
}

function applyThemeVars(target, theme) {
  if (!theme.ok) {
    target.dataset.themeContractState = "error";
    target.dataset.themeContractError = theme.code;
    return;
  }

  for (const [name, value] of Object.entries(theme.cssVars)) {
    target.style.setProperty(name, value);
  }
  for (const [name, value] of Object.entries(theme.dataAttrs)) {
    target.setAttribute(name, value);
  }
}

function themeForRoute(route) {
  return buildThemeContract(
    route.shell_family,
    route.interaction_layer_foundation_contract,
    document.documentElement.dataset.motion === "reduce",
  );
}

function renderMetrics(route) {
  return el("div", {
    className: "metric-row",
    html: `
      <div class="metric"><strong>${route.route_stability_contract.publication_generation}</strong><span>publication generation</span></div>
      <div class="metric"><strong>${route.route_stability_contract.resume_capability}</strong><span>resume capability</span></div>
      <div class="metric"><strong>${route.semantic_accessibility_contract.required_anchor_codes.length}</strong><span>semantic anchors</span></div>
    `,
  });
}

function renderAnchorList(route, usedAnchorRefs) {
  const list = el("div", { className: "anchor-list" });
  for (const anchor of route.semantic_anchors) {
    const identifierAttributes = usedAnchorRefs.has(anchor.semantic_anchor_ref)
      ? { "data-anchor-ref": anchor.semantic_anchor_ref }
      : { "data-testid": anchor.semantic_anchor_ref };
    list.append(
      el("div", {
        className: "anchor-row",
        attrs: {
          ...identifierAttributes,
          "data-anchor-code": anchor.anchor_code,
          role: anchor.role === "toolbar" ? "toolbar" : undefined,
          "aria-label": anchor.role === "toolbar" ? anchor.label : undefined,
        },
        html: `<strong>${anchor.anchor_code}</strong><span>${anchor.semantic_anchor_ref}</span>`,
      }),
    );
  }
  return list;
}

function renderRoute(route) {
  const theme = themeForRoute(route);
  applyThemeVars(document.documentElement, theme);
  const rootAnchor = anchorByCode(route, "SHELL_ROOT");
  const objectAnchor = anchorByCode(route, "OBJECT_ANCHOR");
  const actionStripAnchor = route.semantic_anchors.find((anchor) => anchor.anchor_code === "ACTION_STRIP");
  const primaryActionAnchor = route.semantic_anchors.find((anchor) => anchor.anchor_code === "PRIMARY_ACTION");
  const primarySurfaceAnchor =
    route.semantic_anchors.find((anchor) =>
      ["DECISION_SUMMARY", "SUMMARY_CARD", "ATTENTION_SUMMARY"].includes(anchor.anchor_code),
    ) ?? objectAnchor;
  const supportAnchor =
    route.semantic_anchors.find((anchor) =>
      ["DETAIL_DRAWER", "PROMOTED_SUPPORT_REGION", "TRAILING_INSPECTOR"].includes(anchor.anchor_code),
    ) ?? route.semantic_anchors[route.semantic_anchors.length - 1];
  const liveAnchor =
    route.semantic_anchors.find((anchor) => anchor.anchor_code === "RECOVERY_NOTICE") ??
    route.semantic_anchors.find((anchor) => anchor.anchor_code === "LIMITATION_NOTICE") ??
    route.semantic_anchors.find((anchor) => anchor.anchor_code === "ATTENTION_SUMMARY") ??
    objectAnchor;

  const shell = el("main", {
    className: "shell",
    attrs: {
      "data-testid": rootAnchor.semantic_anchor_ref,
      "data-route-id": route.route_id,
      "data-shell-family": route.shell_family,
      "data-shell-route-key": route.shell_route_key,
      "data-workspace-route-key": route.workspace_route_key,
      "data-publication-generation": route.route_stability_contract.publication_generation,
      tabindex: "-1",
    },
  });
  applyThemeVars(shell, theme);

  const header = el("header", {
    className: "panel topline",
    attrs: {
      "data-testid": route.focus_anchor_ref,
      "aria-labelledby": "route-title",
    },
  });
  header.append(
    el("div", {
      html: `
        <p class="eyebrow">${route.app_boundary} · ${route.shell_family}</p>
        <h1 id="route-title">${route.title}</h1>
        <p class="copy">${route.primary_question}</p>
      `,
    }),
    el("a", {
      className: "link-button",
      text: "Foundation atlas",
      attrs: {
        href: "/apps/operator-web/public/internal/frontend-shell-foundation-atlas/index.html",
        "data-testid": `${route.route_id}.atlas-link`,
      },
    }),
  );

  const grid = el("section", {
    className: "route-grid",
    attrs: {
      "data-shell-family": route.shell_family,
      "aria-label": `${route.title} route workspace`,
    },
  });

  const context = el("aside", {
    className: "panel context-panel",
    attrs: {
      "data-testid": objectAnchor.semantic_anchor_ref,
      "aria-label": objectAnchor.label,
    },
  });
  context.append(
    el("p", { className: "eyebrow", text: "Route object" }),
    el("h2", { text: route.workspace_route_key }),
    renderMetrics(route),
    el("div", {
      className: "chip-row",
      html: `
        <span class="chip">${route.route_scope_class}</span>
        <span class="chip">${route.selector_profile}</span>
      `,
    }),
  );

  const primary = el("section", {
    className: "panel",
    attrs: {
      "data-testid": primarySurfaceAnchor.semantic_anchor_ref,
      "aria-labelledby": "primary-heading",
    },
  });
  const refreshButton = el("button", {
    className: "primary-button",
    text: route.primary_action_label,
    attrs: {
      type: "button",
      "data-testid": primaryActionAnchor?.semantic_anchor_ref ?? `${route.route_id}.refresh-action`,
    },
  });
  const supportButton = el("button", {
    className: "secondary-button",
    text: route.support_action_label,
    attrs: {
      type: "button",
      "data-testid": `${route.route_id}.open-support`,
    },
  });
  const liveRegion = el("p", {
    className: "copy",
    text: `Mounted context state: ${route.shell_state_taxonomy_contract.mounted_context_state}.`,
    attrs: {
      "data-testid": liveAnchor.semantic_anchor_ref,
      role: "status",
      "aria-live": "polite",
    },
  });
  primary.append(
    el("p", { className: "eyebrow", text: "Primary surface" }),
    el("h2", { text: route.route_contract.route_context.view_guard_ref, attrs: { id: "primary-heading" } }),
    el("p", {
      className: "copy",
      text: `Guard vector ${route.route_stability_contract.guard_vector_hash} is bound to ${route.route_contract.route_context.shell_stability_token}.`,
    }),
    el("div", {
      className: "action-row",
      attrs: {
        "data-testid": actionStripAnchor?.semantic_anchor_ref,
      },
    }),
    liveRegion,
  );
  primary.querySelector(".action-row").append(refreshButton, supportButton);

  const support = el("aside", {
    className: "panel panel-muted",
    attrs: {
      "data-testid": supportAnchor.semantic_anchor_ref,
      "data-support-state": "collapsed",
      "aria-labelledby": "support-heading",
    },
  });
  const closeSupport = el("button", {
    className: "secondary-button",
    text: "Close support",
    attrs: {
      type: "button",
      "data-testid": `${route.route_id}.close-support`,
    },
  });
  support.append(
    el("p", { className: "eyebrow", text: route.support_surface_kind }),
    el("h2", { text: supportAnchor.label, attrs: { id: "support-heading" } }),
    el("div", {
      className: "support-body",
      html: `<p class="copy">Support remains parent-bound and shares the same route key: ${route.shell_route_key}.</p>`,
    }),
    el("div", { className: "action-row" }),
  );
  support.querySelector(".action-row").append(closeSupport);

  const contractPanel = el("section", {
    className: "panel",
    attrs: {
      "aria-labelledby": "contract-heading",
    },
  });
  contractPanel.append(
    el("p", { className: "eyebrow", text: "Route contract packet" }),
    el("h2", { text: "Stability, semantics, and state", attrs: { id: "contract-heading" } }),
    renderAnchorList(
      route,
      new Set(
        [
          rootAnchor.semantic_anchor_ref,
          objectAnchor.semantic_anchor_ref,
          route.focus_anchor_ref,
          primarySurfaceAnchor.semantic_anchor_ref,
          actionStripAnchor?.semantic_anchor_ref,
          primaryActionAnchor?.semantic_anchor_ref,
          supportAnchor?.semantic_anchor_ref,
          liveAnchor.semantic_anchor_ref,
        ].filter(Boolean),
      ),
    ),
    el("pre", {
      className: "contract-pre",
      text: JSON.stringify(
        {
          route_stability_contract: route.route_stability_contract,
          semantic_accessibility_contract: route.semantic_accessibility_contract,
          shell_state_taxonomy_contract: route.shell_state_taxonomy_contract,
        },
        null,
        2,
      ),
      attrs: {
        "data-testid": `${route.route_id}.contract-json`,
      },
    }),
  );

  refreshButton.addEventListener("click", () => {
    const current = Number(shell.dataset.publicationGeneration ?? "0");
    shell.dataset.publicationGeneration = String(current + 1);
    liveRegion.textContent = `Same route object refreshed at generation ${current + 1}; shell route key ${route.shell_route_key} retained.`;
  });

  supportButton.addEventListener("click", () => {
    support.dataset.supportState = "expanded";
    closeSupport.focus();
  });

  closeSupport.addEventListener("click", () => {
    support.dataset.supportState = "collapsed";
    supportButton.focus();
  });

  grid.append(context, primary, support);
  shell.append(header, grid, contractPanel);
  return shell;
}

function renderGlyph(glyph) {
  const glyphNode = el("div", {
    className: "theme-card-glyph",
    attrs: {
      "data-glyph": glyph,
      "aria-hidden": "true",
    },
  });
  const planeCount = glyph === "CALM_FOUR_PLANES" ? 4 : 3;
  for (let index = 0; index < planeCount; index += 1) {
    glyphNode.append(el("span"));
  }
  return glyphNode;
}

function renderTokenStrips(theme) {
  const strips = el("div", { className: "theme-token-strips" });
  for (const [label, value] of theme.tokenStrips) {
    strips.append(
      el("div", {
        className: "theme-token-strip",
        html: `<strong>${label}</strong><code>${value}</code>`,
      }),
    );
  }
  return strips;
}

function renderThemeErrorProbe(shellFamily) {
  const theme = buildThemeContract(shellFamily, null);
  return el("div", {
    className: "taxat-theme-error",
    text: `${theme.code}: ${theme.message}`,
    attrs: {
      role: "status",
      "data-testid": "theme.contract-error.missing-foundation",
      "data-theme-contract-state": "error",
      "data-theme-contract-error": theme.code,
    },
  });
}

function surfaceRegistryForFamily(shellFamily) {
  return SURFACE_REGISTRY[shellFamily] ?? [];
}

function defaultSupportForFamily(shellFamily) {
  return surfaceRegistryForFamily(shellFamily).find((surface) => surface.default_promoted_support);
}

function primarySurfacesForFamily(shellFamily) {
  return surfaceRegistryForFamily(shellFamily).filter(
    (surface) => surface.role !== "PROMOTED_SUPPORT" && surface.role !== "NOTICE",
  );
}

function renderSurfacePill(surface) {
  return el("li", {
    className: "surface-pill",
    html: `<strong>${surface.surface_code}</strong><span>${surface.label}</span>`,
  });
}

function renderSurfaceRegistryRow(family) {
  const surfaces = surfaceRegistryForFamily(family.shell_family);
  const primarySurfaces = primarySurfacesForFamily(family.shell_family);
  const defaultSupport = defaultSupportForFamily(family.shell_family);
  const row = el("article", {
    className: "surface-registry-row",
    attrs: {
      "data-testid": "surface-registry-row",
      "data-shell-family": family.shell_family,
      "data-support-budget-policy": "ONE_PROMOTED_SUPPORT_SURFACE_MAX",
      "aria-labelledby": `surface-registry-heading-${family.shell_family}`,
    },
  });

  const primaryList = el("ol", { className: "surface-list" });
  for (const surface of primarySurfaces) {
    primaryList.append(renderSurfacePill(surface));
  }

  const supportRegion = el("div", {
    className: "promoted-support-region",
    attrs: {
      "data-testid": "promoted-support-region",
      "data-promoted-state": "promoted",
      "data-support-surface-code": defaultSupport?.surface_code ?? "NONE",
      "data-support-placement": defaultSupport?.support_placement ?? "NOT_SUPPORT",
      "data-return-focus-behavior": defaultSupport?.return_focus_behavior ?? "NONE",
      tabindex: "-1",
      role: "region",
      "aria-live": "polite",
      "aria-label": `${family.shell_family} promoted support region`,
    },
  });
  supportRegion.append(
    el("p", { className: "eyebrow", text: "Promoted support" }),
    el("h3", { text: defaultSupport?.surface_code ?? "NONE" }),
    el("p", {
      className: "copy",
      text: `${defaultSupport?.label ?? "No support"} · ${defaultSupport?.support_placement ?? "NOT_SUPPORT"}`,
    }),
    el("span", {
      className: "chip",
      text: "ONE_PROMOTED_SUPPORT_SURFACE_MAX:1",
      attrs: {
        "data-testid": "support-budget-chip",
      },
    }),
  );

  const promoteButton = el("button", {
    className: "secondary-button",
    text: "Promote support",
    attrs: {
      type: "button",
      "data-testid": `surface-registry.promote.${family.shell_family}`,
    },
  });
  const demoteButton = el("button", {
    className: "secondary-button",
    text: "Demote support",
    attrs: {
      type: "button",
      "data-testid": `surface-registry.demote.${family.shell_family}`,
    },
  });

  function setSupportState(state) {
    supportRegion.dataset.promotedState = state;
    if (state === "promoted") {
      supportRegion.dataset.supportSurfaceCode = defaultSupport?.surface_code ?? "NONE";
      supportRegion.querySelector("h3").textContent = defaultSupport?.surface_code ?? "NONE";
      supportRegion.querySelector(".copy").textContent =
        `${defaultSupport?.label ?? "No support"} · ${defaultSupport?.support_placement ?? "NOT_SUPPORT"}`;
      supportRegion.focus();
      return;
    }

    supportRegion.dataset.supportSurfaceCode = "NONE";
    supportRegion.querySelector("h3").textContent = "No promoted support";
    supportRegion.querySelector(".copy").textContent =
      "Default support slot is reserved; no second support region mounts.";
    promoteButton.focus();
  }

  promoteButton.addEventListener("click", () => setSupportState("promoted"));
  demoteButton.addEventListener("click", () => setSupportState("demoted"));

  row.append(
    el("div", {
      className: "surface-family-cell",
      html: `
        <p class="eyebrow">Shell family</p>
        <h3 id="surface-registry-heading-${family.shell_family}">${family.shell_family}</h3>
        <code>${family.selector_profile}</code>
      `,
    }),
    el("div", {
      className: "surface-primary-cell",
      html: `
        <p class="eyebrow">Allowed primary surfaces</p>
      `,
    }),
    el("div", {
      className: "surface-support-cell",
      html: `
        <p class="eyebrow">One support slot</p>
      `,
    }),
  );
  row.querySelector(".surface-primary-cell").append(primaryList);
  row.querySelector(".surface-support-cell").append(
    supportRegion,
    el("div", { className: "surface-registry-actions" }),
  );
  row.querySelector(".surface-registry-actions").append(promoteButton, demoteButton);

  row.dataset.surfaceCount = String(surfaces.length);
  return row;
}

function renderSurfaceRegistryDiagram(fixture) {
  const section = el("section", {
    className: "panel surface-registry-diagram",
    attrs: {
      "data-testid": "surface-registry-diagram",
      "data-motion-mode": document.documentElement.dataset.motion === "reduce" ? "reduced" : "standard",
      "aria-labelledby": "surface-registry-title",
    },
  });
  section.append(
    el("div", {
      className: "surface-registry-heading",
      html: `
        <p class="eyebrow">Interaction layer foundation</p>
        <h2 id="surface-registry-title">Surface Registry Diagram</h2>
        <p class="copy">Primary surfaces mount in canonical order; support promotion is budgeted by the foundation contract.</p>
      `,
    }),
  );

  const rows = el("div", { className: "surface-registry-rows" });
  for (const family of fixture.shell_families) {
    rows.append(renderSurfaceRegistryRow(family));
  }
  section.append(rows);
  return section;
}

function renderThemeCard(family, route) {
  const theme = buildThemeContract(
    family.shell_family,
    route?.interaction_layer_foundation_contract,
    document.documentElement.dataset.motion === "reduce",
  );
  const card = el("article", {
    className: "theme-contract-card",
    attrs: {
      "data-testid": `theme.card.${family.shell_family}`,
      "aria-labelledby": `theme-heading-${family.shell_family}`,
    },
  });
  applyThemeVars(card, theme);

  if (!theme.ok) {
    card.append(
      el("h2", {
        text: family.shell_family,
        attrs: {
          id: `theme-heading-${family.shell_family}`,
        },
      }),
      el("div", {
        className: "taxat-theme-error",
        text: `${theme.code}: ${theme.message}`,
      }),
    );
    return card;
  }

  card.append(
    el("div", {
      className: "theme-card-header",
      html: `
        <div class="theme-card-title">
          <p class="eyebrow">${family.app_boundaries.join(" / ")}</p>
          <h2 id="theme-heading-${family.shell_family}">${family.shell_family}</h2>
          <p class="copy">${route?.route_contract.route_context.view_guard_ref ?? "No route-bound view guard"}</p>
        </div>
      `,
    }),
  );
  card.querySelector(".theme-card-header").append(renderGlyph(theme.dataAttrs["data-card-glyph"]));
  card.append(
    renderTokenStrips(theme),
    el("div", {
      className: "theme-proof-row",
      html: `
        <button class="theme-focus-button" type="button" data-testid="theme.focus-ring.${family.shell_family}">Focus proof</button>
        <span class="chip" data-testid="theme.compaction.${family.shell_family}">${theme.dataAttrs["data-responsive-compaction-token"]}</span>
      `,
    }),
    el("div", {
      className: "theme-motion-probe route-local-motion-override",
      text: `Motion is capped at ${MOTION_CEILING_MS}ms and bound to ${theme.dataAttrs["data-motion-token"]}.`,
      attrs: {
        "data-testid": `theme.motion-probe.${family.shell_family}`,
      },
    }),
    el("pre", {
      className: "contract-pre",
      text: JSON.stringify(
        {
          shell_family: family.shell_family,
          selector_profile: theme.dataAttrs["data-selector-profile"],
          css_vars: {
            accent: theme.cssVars["--taxat-accent"],
            duration: theme.cssVars["--taxat-motion-duration"],
            grid: theme.cssVars["--taxat-shell-grid-template"],
          },
        },
        null,
        2,
      ),
      attrs: {
        "data-testid": `theme.contract-json.${family.shell_family}`,
      },
    }),
  );

  return card;
}

function renderAtlas(fixture) {
  document.documentElement.style.removeProperty("--page");
  const shell = el("main", {
    className: "shell theme-atlas",
    attrs: {
      "data-testid": "frontend-shell-foundation-atlas",
    },
  });
  shell.append(
    el("header", {
      className: "panel",
      html: `
        <div class="taxat-wordmark"><span class="taxat-wordmark__mark">T</span><span>Taxat</span></div>
        <p class="eyebrow">Shared web shell contracts</p>
        <h1>Frontend Shell Foundation Atlas</h1>
        <p class="copy">${fixture.fixture_id}</p>
      `,
    }),
  );
  const themeGrid = el("section", {
    className: "theme-card-grid",
    attrs: {
      "aria-label": "Cross shell theme contracts",
    },
  });
  for (const family of fixture.shell_families) {
    const route = fixture.routes.find((candidate) => candidate.shell_family === family.shell_family);
    themeGrid.append(renderThemeCard(family, route));
  }

  const routeGrid = el("section", {
    className: "atlas-grid",
    attrs: {
      "aria-label": "Shared shell family route contracts",
    },
  });
  for (const route of fixture.routes) {
    const card = el("article", {
      className: "panel",
      attrs: {
        "data-testid": `atlas.route.${route.route_id}`,
      },
    });
    card.append(
      el("p", { className: "eyebrow", text: route.shell_family }),
      el("h2", { text: route.title }),
      el("p", { className: "copy", text: route.route_contract.route_context.view_guard_ref }),
      el("div", {
        className: "chip-row",
        html: `
          <span class="chip">${route.route_scope_class}</span>
          <span class="chip">${route.route_stability_contract.resume_capability}</span>
        `,
      }),
      el("a", {
        className: "link-button",
        text: "Open route",
        attrs: { href: route.public_path },
      }),
    );
    routeGrid.append(card);
  }
  shell.append(
    themeGrid,
    renderSurfaceRegistryDiagram(fixture),
    el("section", {
      className: "theme-error-grid",
      attrs: {
        "aria-label": "Theme runtime fail closed fixtures",
      },
    }),
    routeGrid,
    el("section", {
      className: "panel",
      html: `
        <p class="eyebrow">Semantic regression pack</p>
        <h2>${fixture.semantic_regression_pack.pack_id}</h2>
        <p class="copy">${fixture.semantic_regression_pack.cases.length} deterministic Playwright cases seed the cross-shell fixture.</p>
      `,
    }),
  );
  shell.querySelector(".theme-error-grid").append(renderThemeErrorProbe("CALM_SHELL"));
  return shell;
}

async function bootstrap() {
  setMotionMode();
  const response = await fetch(FIXTURE_PATH);
  if (!response.ok) {
    throw new Error(`Failed to load ${FIXTURE_PATH}: ${response.status}`);
  }
  const fixture = await response.json();
  window.__webShellFixture = fixture;
  window.__themeRuntime = { buildThemeContract };
  const root = document.getElementById("web-shell-root");
  const routeId = document.body.dataset.routeId;
  const route = routeId ? fixture.routes.find((candidate) => candidate.route_id === routeId) : null;
  root.replaceChildren(route ? renderRoute(route) : renderAtlas(fixture));
}

bootstrap().catch((error) => {
  console.error(error);
  document.body.append(
    el("pre", {
      text: error instanceof Error ? error.message : String(error),
    }),
  );
});
