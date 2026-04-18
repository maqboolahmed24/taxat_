const summaryGrid = document.getElementById("summary-grid");
        const assumptionList = document.getElementById("assumption-list");
        const tabsRoot = document.getElementById("atlas-tabs");
        const contentPane = document.getElementById("content-pane");
        const motionMode = document.getElementById("motion-mode");

        const DEFAULT_PAGE = "overview";
        let atlasData = null;
        let state = {
          pageId: DEFAULT_PAGE,
          scenarioId: "refresh_preserves_same_object",
          supportOpen: false,
        };

        function setMotionMode() {
          const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          const mode = reduced ? "reduce" : "standard";
          document.documentElement.dataset.motion = mode;
          motionMode.textContent = mode;
        }

        function parseLocationState() {
          const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
          return {
            pageId: params.get("page") || DEFAULT_PAGE,
            scenarioId: params.get("scenario") || "refresh_preserves_same_object",
          };
        }

        function syncStateFromLocation() {
          const locationState = parseLocationState();
          state.pageId = atlasData.shell_pages.some((page) => page.page_id === locationState.pageId)
            ? locationState.pageId
            : DEFAULT_PAGE;
          state.scenarioId = atlasData.continuity_scenarios.some((item) => item.scenario_id === locationState.scenarioId)
            ? locationState.scenarioId
            : "refresh_preserves_same_object";
          render();
        }

        function updateLocation(next, replace = false) {
          const params = new URLSearchParams();
          params.set("page", next.pageId);
          if (next.pageId === "continuity") {
            params.set("scenario", next.scenarioId);
          }
          const hash = `#${params.toString()}`;
          if (replace) {
            window.history.replaceState({}, "", hash);
          } else {
            window.history.pushState({}, "", hash);
          }
          syncStateFromLocation();
        }

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

        function createChip(label, className = "", testId = "") {
          const chip = createElement("span", `chip ${className}`.trim(), label);
          if (testId) {
            chip.dataset.testid = testId;
          }
          return chip;
        }

        function renderSummaryCards() {
          const cards = [
            ["Shell families", atlasData.summary.shell_family_count, "atlas-summary-shells"],
            ["Routes", atlasData.summary.route_count, "atlas-summary-routes"],
            ["Selectors", atlasData.summary.selector_count, "atlas-summary-selectors"],
            ["Recovery scenarios", atlasData.summary.scenario_count, "atlas-summary-scenarios"],
          ];
          summaryGrid.replaceChildren();
          cards.forEach(([label, value, testId]) => {
            const card = createElement("section", "summary-card");
            if (testId) {
              card.dataset.testid = testId;
            }
            card.append(
              createElement("p", "summary-label", label),
              createElement("p", "summary-value", String(value)),
            );
            summaryGrid.append(card);
          });
        }

        function renderAssumptions() {
          assumptionList.replaceChildren();
          atlasData.assumptions.forEach((item) => {
            const li = document.createElement("li");
            li.textContent = item.code;
            assumptionList.append(li);
          });
        }

        function renderTabs() {
          tabsRoot.replaceChildren();
          atlasData.shell_pages.forEach((page, index) => {
            const button = createElement("button", "atlas-tab", page.title);
            button.type = "button";
            button.setAttribute("role", "tab");
            button.dataset.pageId = page.page_id;
            button.dataset.index = String(index);
            button.id = `atlas-tab-${page.page_id}`;
            button.setAttribute("aria-controls", "atlas-panel");
            button.setAttribute("aria-selected", String(page.page_id === state.pageId));
            button.tabIndex = page.page_id === state.pageId ? 0 : -1;
            button.addEventListener("click", () => {
              state.supportOpen = false;
              updateLocation({ pageId: page.page_id, scenarioId: state.scenarioId });
            });
            button.addEventListener("keydown", handleTabKeydown);
            tabsRoot.append(button);
          });
        }

        function handleTabKeydown(event) {
          const buttons = [...tabsRoot.querySelectorAll(".atlas-tab")];
          const currentIndex = buttons.findIndex((button) => button.dataset.pageId === state.pageId);
          if (currentIndex === -1) {
            return;
          }
          let nextIndex = null;
          if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % buttons.length;
          if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
          if (event.key === "Home") nextIndex = 0;
          if (event.key === "End") nextIndex = buttons.length - 1;
          if (nextIndex === null) {
            return;
          }
  event.preventDefault();
  const target = buttons[nextIndex];
  state.supportOpen = false;
  updateLocation({ pageId: target.dataset.pageId, scenarioId: state.scenarioId });
  requestAnimationFrame(() => {
    const selected = tabsRoot.querySelector(`[data-page-id="${target.dataset.pageId}"]`);
    if (selected) {
      selected.focus();
    }
  });
}

        function getShellPage(pageId) {
          return atlasData.shell_pages.find((page) => page.page_id === pageId);
        }

        function getRoutesByShell(shellFamily) {
          return atlasData.route_records.filter((route) => route.shell_family === shellFamily);
        }

        function getFoundation(shellFamily) {
          return atlasData.interaction_layers.find((row) => row.shell_family === shellFamily);
        }

        function getProfile(shellFamily) {
          return atlasData.selector_profiles.find((profile) => profile.shell_family === shellFamily);
        }

        function makeHeader(page) {
          const header = createElement("section", "content-card page-header");
          const eyebrow = createElement("p", "kicker", page.shell_family || "Cross-shell");
          const title = createElement("h2", "page-title", page.title);
          const subtitle = createElement("p", "page-subtitle", page.subtitle);
          const statement = createElement("p", "page-copy", page.hero_statement);
          header.append(eyebrow, title, subtitle, statement);
          return header;
        }

        function renderOverview() {
          const page = getShellPage("overview");
          const fragment = document.createDocumentFragment();
          fragment.append(makeHeader(page));

          const shellGrid = createElement("section", "page-grid");
          atlasData.shell_families.forEach((shell) => {
            const routes = getRoutesByShell(shell.shell_family);
            const card = createElement("article", "shell-card");
            card.append(
              createElement("p", "kicker", shell.shell_family),
              createElement("h3", "shell-card-title", shell.shell_label),
              createElement("p", "card-copy", shell.owning_object_rule),
            );
            const chips = createElement("div", "chip-row");
            chips.append(
              createChip(`${routes.length} routes`, "chip-accent"),
              createChip(shell.selector_profile),
              createChip(shell.continuity_contract),
            );
            card.append(chips);
            card.append(
              createElement("p", "card-copy", `Surface order: ${shell.default_surface_order.join(" -> ")}`),
              createElement("p", "card-copy", `Support law: ${shell.promoted_support_region_law}`),
            );
            shellGrid.append(card);
          });
          fragment.append(shellGrid);

          const routeMatrix = createElement("section", "content-card");
          routeMatrix.append(
            createElement("p", "kicker", "Route matrix"),
            createElement("h3", "section-title", "Canonical browser route families"),
          );
          const routeTable = createElement("div", "route-table");
          atlasData.route_records.forEach((route) => {
            const row = createElement("div", "route-row");
            const left = createElement("div");
            left.append(
              createElement("p", "route-title", route.route_id),
              createElement("p", "route-meta mono", route.route_pattern),
              createElement("p", "route-note", route.dominant_question),
            );
            const right = createElement("div");
            right.append(
              createElement("p", "route-note", route.promoted_support_region_policy),
              createElement("p", "route-meta mono", route.interaction_layer_contract),
            );
            row.append(left, right);
            routeTable.append(row);
          });
          routeMatrix.append(routeTable);
          fragment.append(routeMatrix);

          const nativeCard = createElement("section", "content-card");
          nativeCard.append(
            createElement("p", "kicker", "Native embodiment"),
            createElement("h3", "section-title", "Embodiments, not shell sprawl"),
            createElement(
              "p",
              "card-copy",
              "Native primary scenes and detached support windows inherit calm-shell continuity. They do not invent a fourth shell family.",
            ),
          );
          const nativeList = createElement("ul", "detail-list");
          atlasData.native_overlays.forEach((overlay) => {
            const item = document.createElement("li");
            item.textContent = `${overlay.scene_type}: ${overlay.scene_order.join(" -> ")}`;
            nativeList.append(item);
          });
          nativeCard.append(nativeList);
          fragment.append(nativeCard);
          return fragment;
        }

        function makeMetricCard(label, value) {
          const row = createElement("div", "metric-line");
          row.append(createElement("span", "metric-label", label), createElement("span", "metric-value", value));
          return row;
        }

        function renderCalmStage() {
          const card = createElement("section", "stage-card");
          card.append(
            createElement("p", "kicker", "Surface demonstrator"),
            createElement("h3", "stage-title", "Four-surface calm shell"),
            createElement("p", "card-copy", "Quiet, summary-first, and support-budgeted. External handoffs and detail work stay parent-bound."),
          );
          const stack = createElement("div", "surface-stack");
          const blocks = [
            ["context-bar", "CONTEXT_BAR", "Current object, settlement posture, typed notices, and return path."],
            ["decision-summary", "DECISION_SUMMARY", "Dominant question, lawful state, and highest-signal decision context."],
            ["action-strip", "ACTION_STRIP", "Exactly one dominant action plus fail-closed no-safe-action posture."],
            ["detail-drawer", "DETAIL_DRAWER", "Evidence, packet, authority, drift, focus, and twin-lens support modules."],
          ];
          blocks.forEach(([testId, title, copy]) => {
            const block = createElement("div", "surface-block");
            block.dataset.testid = testId;
            block.append(createElement("strong", "", title), createElement("span", "", copy));
            stack.append(block);
          });
          const metadata = createElement("div", "chip-row");
          [
            ["shell-family", "CALM_SHELL"],
            ["object-anchor", "RunManifest / WorkflowItem anchor"],
            ["dominant-question", "One dominant question"],
            ["settlement-posture", "Settlement posture"],
            ["recovery-posture", "Recovery posture"],
            ["primary-action", "Primary action"],
          ].forEach(([testId, label]) => metadata.append(createChip(label, "chip-accent", testId)));
          card.append(stack, metadata);
          return card;
        }

        function renderPortalStage() {
          const card = createElement("section", "stage-card");
          card.append(
            createElement("p", "kicker", "Surface demonstrator"),
            createElement("h3", "stage-title", "Client-safe primary stack"),
            createElement("p", "card-copy", "One primary task column, plain-language status, and contextual support that never leaks internal workflow state."),
          );
          const stage = createElement("div", "portal-stage");
          [
            ["portal-shell", "PORTAL_HEADER", "Top-level destination framing and client-safe context."],
            ["portal-status-hero", "STATUS_HERO", "Next required client action with typed status language."],
            ["portal-primary-action", "PRIMARY_ACTION", "Single lawful CTA for documents, approvals, onboarding, or help."],
            ["portal-support-panel", "PROMOTED_SUPPORT_REGION", "Stacked support content beneath the primary task."],
            ["portal-current-artifact", "CURRENT_ARTIFACT", "Current client-visible artifact or handoff target."],
            ["portal-history-list", "HISTORY", "Historical items remain distinct from the current artifact."],
          ].forEach(([testId, title, copy]) => {
            const block = createElement("div", "portal-block");
            block.dataset.testid = testId;
            block.append(createElement("strong", "", title), createElement("span", "", copy));
            stage.append(block);
          });
          const chips = createElement("div", "chip-row");
          [
            ["portal-route-tabs", "Five top-level destinations"],
            ["portal-request-focus", "Contextual request detail"],
            ["portal-inline-recovery", "Inline recovery only"],
            ["return-path-control", "Return path"],
          ].forEach(([testId, label]) => chips.append(createChip(label, "chip-accent", testId)));
          card.append(stage, chips);
          return card;
        }

        function renderGovernanceStage() {
          const card = createElement("section", "stage-card");
          card.append(
            createElement("p", "kicker", "Surface demonstrator"),
            createElement("h3", "stage-title", "Governance density shell"),
            createElement("p", "card-copy", "Dense admin workspaces still respect one dominant question, one promoted auxiliary surface, and inline typed recovery."),
          );
          const stage = createElement("div", "governance-stage");

          const left = createElement("div", "governance-block");
          left.dataset.testid = "governance-primary-worklist";
          left.append(createElement("strong", "", "INVENTORY_RAIL"), createElement("span", "", "Filter slice, object selection, and route-stable worklist."));
          stage.append(left);

          const middle = createElement("div", "governance-block");
          middle.dataset.compact = "tall";
          middle.dataset.testid = "governance-workspace-header";
          middle.append(createElement("strong", "", "WORKSPACE_CANVAS"), createElement("span", "", "Primary diff, mutation, simulation, or audit canvas driven by the selected governance object."));
          stage.append(middle);

          const right = createElement("div", "governance-block");
          right.dataset.testid = "governance-support-sidecar";
          right.append(createElement("strong", "", "AUDIT_SIDECAR"), createElement("span", "", "One promoted auxiliary surface for diff, audit, blast radius, or chain detail."));
          stage.append(right);

          const chips = createElement("div", "chip-row");
          [
            ["governance-shell-family", "GOVERNANCE_DENSITY_SHELL"],
            ["governance-context-bar", "Context bar"],
            ["overview-attention-summary", "Attention summary"],
            ["change-basket", "Change basket"],
            ["approval-composer", "Approval composer"],
            ["governance-section-nav", "Section nav"],
          ].forEach(([testId, label]) => chips.append(createChip(label, "chip-accent", testId)));
          card.append(stage, chips);
          return card;
        }

        function renderShellPage(pageId) {
          const page = getShellPage(pageId);
          const routes = getRoutesByShell(page.shell_family);
          const foundation = getFoundation(page.shell_family);
          const profile = getProfile(page.shell_family);
          const fragment = document.createDocumentFragment();
          fragment.append(makeHeader(page));

          const topGrid = createElement("section", "shell-grid");
          let stage;
          if (pageId === "calm") stage = renderCalmStage();
          if (pageId === "portal") stage = renderPortalStage();
          if (pageId === "governance") stage = renderGovernanceStage();
          topGrid.append(stage);

          const lawCard = createElement("article", "content-card");
          lawCard.append(
            createElement("p", "kicker", "Foundation"),
            createElement("h3", "section-title", "Interaction-layer contract"),
            createElement("p", "card-copy", `${foundation.interaction_layer_contract} with ${foundation.behavior_contract.selector_profile}.`),
          );
          const chips = createElement("div", "chip-row");
          chips.append(
            createChip(foundation.behavior_contract.continuity_policy, "chip-accent"),
            createChip(foundation.design_tokens.layout_density_token),
            createChip(foundation.design_tokens.responsive_compaction_token),
          );
          lawCard.append(chips);
          lawCard.append(
            makeMetricCard("History presentation", foundation.behavior_contract.history_presentation_policy),
            makeMetricCard("Preview surface", foundation.behavior_contract.preview_surface_policy),
            makeMetricCard("Notification surface", foundation.behavior_contract.notification_surface_policy),
            makeMetricCard("Secondary window policy", foundation.behavior_contract.secondary_window_policy),
          );
          topGrid.append(lawCard);
          fragment.append(topGrid);

          const detailGrid = createElement("section", "detail-grid");
          const selectorsCard = createElement("article", "content-card");
          selectorsCard.append(
            createElement("p", "kicker", "Selectors"),
            createElement("h3", "section-title", "Semantic selector roster"),
            createElement("p", "card-copy", `Profile ${profile.profile_id} contributes ${profile.selector_entries.length} semantic anchors.`),
          );
          const selectorChips = createElement("div", "chip-row");
          profile.selector_entries.slice(0, 16).forEach((entry) => selectorChips.append(createChip(entry.selector)));
          selectorsCard.append(selectorChips);
          detailGrid.append(selectorsCard);

          const lawsCard = createElement("article", "content-card");
          lawsCard.append(
            createElement("p", "kicker", "Route law"),
            createElement("h3", "section-title", "Shell invariants"),
          );
          const lawList = createElement("ul", "detail-list");
          [
            routes[0]?.promoted_support_region_policy,
            routes[0]?.dominant_action_policy,
            `Required stability keys include ${routes[0]?.required_stability_keys.slice(0, 4).join(", ")} and route-specific context extensions.`,
            `Recovery postures are governed by ${routes[0]?.recovery_postures.join(", ")}.`,
          ].filter(Boolean).forEach((item) => {
            const li = document.createElement("li");
            li.textContent = item;
            lawList.append(li);
          });
          lawsCard.append(lawList);
          detailGrid.append(lawsCard);
          fragment.append(detailGrid);

          const routeSection = createElement("section", "route-grid");
          routes.forEach((route) => {
            const card = createElement("article", "route-card");
            card.dataset.testid = `route-card-${route.route_id}`;
            card.append(
              createElement("p", "kicker", route.shell_family),
              createElement("h3", "route-title", route.route_id),
              createElement("p", "route-meta mono", route.route_pattern),
              createElement("p", "route-note", route.dominant_question),
            );
            const chipRow = createElement("div", "route-chip-row");
            chipRow.append(
              createChip(route.owning_object_family, "chip-accent"),
              createChip(route.viewer_capability_profile),
              createChip(route.interaction_layer_contract),
            );
            card.append(chipRow);
            const list = createElement("ul", "route-list");
            [route.dominant_action_policy, route.promoted_support_region_policy, `Focus order: ${route.focus_order.join(" -> ")}`].forEach((item) => {
              const li = document.createElement("li");
              li.textContent = item;
              list.append(li);
            });
            card.append(list);
            routeSection.append(card);
          });
          fragment.append(routeSection);
          return fragment;
        }

        function renderContinuityPage() {
          const page = getShellPage("continuity");
          const scenario = atlasData.continuity_scenarios.find((item) => item.scenario_id === state.scenarioId);
          const fragment = document.createDocumentFragment();
          fragment.append(makeHeader(page));

          const grid = createElement("section", "continuity-grid");
          const selectors = createElement("article", "content-card");
          selectors.append(
            createElement("p", "kicker", "Scenarios"),
            createElement("h3", "section-title", "Recovery scenario rail"),
          );
          const selectorList = createElement("div", "scenario-selector-list");
          atlasData.continuity_scenarios.forEach((item) => {
            const button = createElement("button", "scenario-selector");
            button.type = "button";
            button.dataset.testid = `continuity-scenario-${item.scenario_id}`;
            button.setAttribute("aria-pressed", String(item.scenario_id === state.scenarioId));
            button.append(
              createElement("span", "kicker", item.recovery_mode),
              createElement("strong", "route-title", item.scenario_id),
              createElement("span", "card-copy", item.trigger),
            );
            button.addEventListener("click", () => {
              state.supportOpen = false;
              updateLocation({ pageId: "continuity", scenarioId: item.scenario_id });
            });
            selectorList.append(button);
          });
          selectors.append(selectorList);
          grid.append(selectors);

          const detail = createElement("article", "scenario-card");
          detail.append(
            createElement("p", "kicker", scenario.recovery_mode),
            createElement("h3", "scenario-title", scenario.scenario_id),
            createElement("p", "scenario-copy", scenario.trigger),
          );
          const chipRow = createElement("div", "scenario-chip-row");
          chipRow.append(
            createChip(`${scenario.applicable_shells.length} shell families`, "chip-accent"),
            createChip(scenario.announcement_posture === "assertive" ? "assertive live region" : "polite live region", scenario.announcement_posture === "assertive" ? "chip-danger" : "chip-success"),
          );
          detail.append(chipRow);
          const lists = createElement("div", "detail-grid");
          const invariants = createElement("section", "content-card");
          invariants.append(createElement("p", "kicker", "Preserved invariants"), createElement("h3", "section-title", "What must survive"));
          const invariantList = createElement("ul", "detail-list");
          scenario.preserved_invariants.forEach((item) => {
            const li = document.createElement("li");
            li.textContent = item;
            invariantList.append(li);
          });
          invariants.append(invariantList);
          lists.append(invariants);

          const focus = createElement("section", "content-card");
          focus.append(createElement("p", "kicker", "Focus restoration"), createElement("h3", "section-title", "Fallback order"));
          const focusList = createElement("ol", "detail-list");
          focusList.dataset.testid = "continuity-restoration-order";
          scenario.focus_restore_order.forEach((item) => {
            const li = document.createElement("li");
            li.textContent = item;
            focusList.append(li);
          });
          focus.append(focusList);
          lists.append(focus);
          detail.append(lists);

          const live = createElement("div", "live-region");
          live.dataset.testid = "continuity-live-region";
          live.setAttribute("aria-live", scenario.announcement_posture);
          live.textContent = `Announcement posture: ${scenario.announcement_posture}. Recovery mode: ${scenario.recovery_mode}.`;
          detail.append(live);

          const supportDemo = createElement("section", "support-demo");
          supportDemo.append(
            createElement("p", "kicker", "Return target demo"),
            createElement("h3", "section-title", "Support region close returns focus"),
            createElement("p", "card-copy", "Open the support region, then close it. Focus returns to the invoker to model parent-bound support law."),
          );

          const controls = createElement("div", "support-controls");
          const openButton = createElement("button", "button button-primary", "Open support region");
          openButton.type = "button";
          openButton.dataset.testid = "continuity-open-support";
          openButton.addEventListener("click", () => {
            state.supportOpen = true;
            render();
          });
          controls.append(openButton);
          supportDemo.append(controls);

          const panel = createElement("div", "support-panel");
          panel.dataset.testid = "continuity-support-panel";
          panel.hidden = !state.supportOpen;
          panel.append(
            createElement("p", "kicker", "Support-only overlay"),
            createElement("p", "card-copy", "This panel stands in for compare, audit, packet review, or authority support windows."),
          );
          const closeButton = createElement("button", "button", "Close and restore focus");
          closeButton.type = "button";
          closeButton.dataset.testid = "continuity-close-support";
          closeButton.addEventListener("click", () => {
            state.supportOpen = false;
            render();
            requestAnimationFrame(() => {
              const invoker = document.querySelector("[data-testid='continuity-open-support']");
              if (invoker) invoker.focus();
            });
          });
          panel.append(closeButton);
          supportDemo.append(panel);
          detail.append(supportDemo);

          grid.append(detail);
          fragment.append(grid);
          return fragment;
        }

        function render() {
          renderTabs();
          contentPane.id = "atlas-panel";
          contentPane.setAttribute("aria-labelledby", `atlas-tab-${state.pageId}`);
          contentPane.replaceChildren();
          let fragment;
          if (state.pageId === "overview") {
            fragment = renderOverview();
          } else if (state.pageId === "continuity") {
            fragment = renderContinuityPage();
          } else {
            fragment = renderShellPage(state.pageId);
          }
          contentPane.append(fragment);
        }

        async function bootstrap() {
          setMotionMode();
          window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", setMotionMode);
          const response = await fetch("./atlas_data.json");
          atlasData = await response.json();
          renderSummaryCards();
          renderAssumptions();
          const locationState = parseLocationState();
          updateLocation({ pageId: locationState.pageId || DEFAULT_PAGE, scenarioId: locationState.scenarioId || "refresh_preserves_same_object" }, true);
          window.addEventListener("popstate", syncStateFromLocation);
        }

        bootstrap().catch((error) => {
          contentPane.textContent = `Failed to load atlas: ${error.message}`;
        });
