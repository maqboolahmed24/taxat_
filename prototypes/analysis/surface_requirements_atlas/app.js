const root = document.getElementById("app");

const state = {
  pageId: "overview",
  recordKey: "collaboration_staff_inbox",
  scenarioId: "inline_rebase",
  supportOpen: false,
};

let atlasData = null;
let restoreFocusId = null;

function parseHash() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return {
    pageId: params.get("page") || "overview",
    recordKey: params.get("record") || null,
    scenarioId: params.get("scenario") || "inline_rebase",
  };
}

function setMotionMode() {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.dataset.motion = reduced ? "reduce" : "standard";
}

function getPage(pageId) {
  return atlasData.pages.find((page) => page.page_id === pageId) || atlasData.pages[0];
}

function getFamilyByPage(pageId) {
  return atlasData.surface_families.find((family) => family.page_id === pageId) || null;
}

function getRoutesForPage(pageId) {
  const family = getFamilyByPage(pageId);
  if (!family) return [];
  return atlasData.route_records.filter((route) => route.surface_family === family.surface_family);
}

function getRecord(recordKey) {
  return atlasData.route_records.find((route) => route.route_or_scene_key === recordKey) || atlasData.route_records[0];
}

function getScenario(scenarioId) {
  return atlasData.continuity_scenarios.find((scenario) => scenario.scenario_id === scenarioId) || atlasData.continuity_scenarios[0];
}

function defaultRecordForPage(pageId) {
  return atlasData.page_route_defaults[pageId] || atlasData.default_record;
}

function syncStateFromHash(replace = false) {
  const next = parseHash();
  const page = getPage(next.pageId);
  state.pageId = page.page_id;
  const pageRoutes = getRoutesForPage(state.pageId);
  const recordExists = atlasData.route_records.some((route) => route.route_or_scene_key === next.recordKey);
  state.recordKey = recordExists ? next.recordKey : (pageRoutes[0]?.route_or_scene_key || atlasData.default_record);
  const scenarioExists = atlasData.continuity_scenarios.some((scenario) => scenario.scenario_id === next.scenarioId);
  state.scenarioId = scenarioExists ? next.scenarioId : atlasData.default_scenario;
  if (replace && !window.location.hash) {
    updateHash({ pageId: state.pageId, recordKey: state.recordKey, scenarioId: state.scenarioId }, true);
    return;
  }
  render();
}

function updateHash(nextState, replace = false) {
  const params = new URLSearchParams();
  params.set("page", nextState.pageId);
  if (nextState.recordKey) params.set("record", nextState.recordKey);
  if (nextState.pageId === "continuity") params.set("scenario", nextState.scenarioId);
  const nextHash = `#${params.toString()}`;
  if (replace) {
    window.history.replaceState({}, "", nextHash);
    syncStateFromHash(false);
  } else {
    window.location.hash = nextHash;
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function chips(values, klass = "") {
  return values
    .map((value) => `<span class="chip ${klass}".trim()>${escapeHtml(value)}</span>`)
    .join("");
}

function sourceRefList(sourceRefs) {
  return sourceRefs
    .map((sourceRef) => `
      <li class="list-note">
        <span class="mono">${escapeHtml(sourceRef.source_file)}</span><br />
        ${escapeHtml(sourceRef.source_heading_or_logical_block)}
      </li>
    `)
    .join("");
}

function metricLines(items) {
  return items
    .map(([label, value]) => `
      <div class="metric-line">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </div>
    `)
    .join("");
}

function lawCard(law) {
  return `
    <article class="card">
      <p class="eyebrow">${escapeHtml(law.law_key)}</p>
      <p class="copy">${escapeHtml(law.statement)}</p>
    </article>
  `;
}

function familyCard(family) {
  const routeCount = atlasData.summary.routes_by_family[family.surface_family] || 0;
  return `
    <article class="family-card card" style="--accent:${family.accent}">
      <p class="eyebrow">${escapeHtml(family.surface_family)}</p>
      <h3 class="card-title">${escapeHtml(family.label)}</h3>
      <p class="copy">${escapeHtml(family.thesis)}</p>
      <div class="chip-row">
        <span class="chip chip-accent">${routeCount} routes</span>
        <span class="chip">${escapeHtml(family.shell_families.join(" / "))}</span>
      </div>
      <p class="route-note">${escapeHtml(family.interaction_signature)}</p>
    </article>
  `;
}

function routeCard(route) {
  return `
    <button
      type="button"
      class="route-card"
      data-action="select-record"
      data-record-key="${escapeHtml(route.route_or_scene_key)}"
      data-active="${String(route.route_or_scene_key === state.recordKey)}"
      data-focus-id="${escapeHtml(route.route_or_scene_key)}"
      data-testid="route-card-${escapeHtml(route.route_or_scene_key)}"
      style="--accent:${escapeHtml(getAccent(route.surface_family))}"
    >
      <div class="route-header">
        <div>
          <p class="eyebrow">${escapeHtml(route.route_or_scene_kind)}</p>
          <h3 class="card-title">${escapeHtml(route.title)}</h3>
        </div>
        <span class="chip chip-accent">${escapeHtml(route.shell_family)}</span>
      </div>
      <p class="copy mono">${escapeHtml(route.route_pattern)}</p>
      <p class="route-note">${escapeHtml(route.dominant_question)}</p>
      <div class="chip-row">
        <span class="chip">${escapeHtml(route.selector_profile)}</span>
        <span class="chip">${escapeHtml(route.promoted_support_region)}</span>
      </div>
    </button>
  `;
}

function selectorChips(record) {
  const selectorRows = atlasData.selectors.filter((selector) => selector.selector_profile === record.selector_profile);
  return selectorRows
    .map((selector) => `
      <span
        class="selector-pill mono"
        data-testid="selector-chip-${escapeHtml(selector.selector_id)}"
      >
        ${escapeHtml(selector.selector_id)}
      </span>
    `)
    .join("");
}

function componentCards(record) {
  const components = atlasData.component_inventory.filter((component) =>
    component.route_or_scene_keys.includes(record.route_or_scene_key)
  );
  return components
    .map((component) => `
      <article class="component-card card">
        <p class="eyebrow">${escapeHtml(component.region_kind)}</p>
        <h3 class="card-title">${escapeHtml(component.label)}</h3>
        <p class="copy">${escapeHtml(component.notes)}</p>
        <div class="chip-row">
          <span class="chip mono">${escapeHtml(component.selector_anchor)}</span>
        </div>
      </article>
    `)
    .join("");
}

function renderOverview() {
  return `
    <section class="stage-panel panel">
      <div class="overview-hero">
        <div class="stack">
          <div class="stage-header">
            <p class="eyebrow">Overview</p>
            <h1 class="hero-title">Surface Requirements Atlas</h1>
            <p class="hero-subtitle">One coherent product architecture across collaboration, portal, governance, and native operator embodiments.</p>
          </div>
          <div class="summary-grid">
            <article class="card" data-testid="summary-surface-families">
              <p class="eyebrow">Families</p>
              <p class="kpi-value">${atlasData.summary.surface_family_count}</p>
            </article>
            <article class="card" data-testid="summary-route-scenes">
              <p class="eyebrow">Routes / scenes</p>
              <p class="kpi-value">${atlasData.summary.route_scene_count}</p>
            </article>
            <article class="card" data-testid="summary-selectors">
              <p class="eyebrow">Selectors</p>
              <p class="kpi-value">${atlasData.summary.selector_count}</p>
            </article>
            <article class="card" data-testid="summary-components">
              <p class="eyebrow">Components</p>
              <p class="kpi-value">${atlasData.summary.component_count}</p>
            </article>
          </div>
        </div>
        <div class="hero-glyph" aria-hidden="true" data-testid="overview-glyph">
          <div class="hero-bar"></div>
          <div class="hero-bar"></div>
          <div class="hero-bar"></div>
          <div class="hero-bar"></div>
        </div>
      </div>
    </section>

    <section class="stage-panel panel">
      <div class="family-grid">
        ${atlasData.surface_families.map((family) => familyCard(family)).join("")}
      </div>
    </section>

    <section class="stage-panel panel">
      <div class="route-header">
        <div>
          <p class="eyebrow">Laws that never change</p>
          <h2 class="section-title">Cross-surface invariants</h2>
        </div>
        <span class="chip chip-warning">${atlasData.gap_register.length} explicit gaps / normalizations</span>
      </div>
      <div class="family-grid">
        ${atlasData.shared_laws.map((law) => lawCard(law)).join("")}
      </div>
    </section>
  `;
}

function renderCollaborationPage(record) {
  return `
    <section class="stage-panel panel" style="--accent:#76A9FF">
      <div class="stage-header">
        <p class="eyebrow">Collaboration</p>
        <h1 class="hero-title">Shared work object, split visibility</h1>
        <p class="hero-subtitle">Staff calm-shell workspaces and customer-safe request routes sit over the same workflow truth, but never cross visibility lanes.</p>
      </div>
      <div class="lane-map" data-testid="collaboration-lane-map">
        <div class="lane-columns">
          <div class="lane-column">
            <p class="eyebrow">Lane A</p>
            <h3 class="card-title">CUSTOMER_VISIBLE</h3>
            <p class="copy">Customer threads, safe attachments, request replies, and role-filtered status live here. Concurrency is visibility-scoped.</p>
          </div>
          <div class="lane-column">
            <p class="eyebrow">Lane B</p>
            <h3 class="card-title">INTERNAL_ONLY</h3>
            <p class="copy">Staff notes, hidden attachments, triage facts, and restricted audit context never bleed into portal-visible surfaces.</p>
          </div>
        </div>
        <div class="chip-row">
          <span class="chip chip-accent">Assignment and escalation stay inline</span>
          <span class="chip">Current vs history artifact posture stays explicit</span>
          <span class="chip">Rebase preserves the same work item shell</span>
        </div>
      </div>
    </section>

    <section class="stage-panel panel">
      <div class="route-header">
        <div>
          <p class="eyebrow">Storyboard</p>
          <h2 class="section-title">Inbox, workspace, request list, request detail</h2>
        </div>
        <span class="chip chip-accent">${record.selector_profile}</span>
      </div>
      <div class="route-grid">
        ${getRoutesForPage("collaboration").map((route) => routeCard(route)).join("")}
      </div>
    </section>

    <section class="stage-panel panel">
      <div class="route-header">
        <div>
          <p class="eyebrow">Selector profile</p>
          <h2 class="section-title">Current route anchors</h2>
        </div>
        <span class="chip">${record.route_or_scene_key}</span>
      </div>
      <div class="selector-grid">${selectorChips(record)}</div>
    </section>

    <section class="stage-panel panel">
      <div class="route-header">
        <div>
          <p class="eyebrow">Components</p>
          <h2 class="section-title">Mounted components for the selected route</h2>
        </div>
      </div>
      <div class="component-grid">${componentCards(record)}</div>
    </section>
  `;
}

function renderPortalPage(record) {
  return `
    <section class="stage-panel panel" style="--accent:#99D2FF">
      <div class="stage-header">
        <p class="eyebrow">Portal</p>
        <h1 class="hero-title">Task-first, customer-safe routes</h1>
        <p class="hero-subtitle">Portal language stays plain, support stays subordinate, and upload / approval / onboarding posture stays explicit inside one client shell.</p>
      </div>
      <div class="portal-frame" data-testid="portal-mobile-frame">
        <div class="mini-stack">
          <p class="eyebrow">Primary stack</p>
          <h3 class="card-title">STATUS_HERO -> TASK_QUEUE -> route workspace</h3>
          <p class="copy">The active request, approval pack, or onboarding step takes the primary column; history and help stay subordinate.</p>
        </div>
        <div class="portal-ribbon">
          <span class="chip chip-accent" data-testid="upload-state-transfer">transfer</span>
          <span class="chip chip-warning" data-testid="upload-state-scan">scan</span>
          <span class="chip chip-warning" data-testid="upload-state-validation">validation</span>
          <span class="chip chip-success" data-testid="upload-state-accepted">accepted</span>
          <span class="chip chip-danger">rejected / replacement</span>
        </div>
      </div>
    </section>

    <section class="stage-panel panel">
      <div class="route-grid">
        ${getRoutesForPage("portal").map((route) => routeCard(route)).join("")}
      </div>
    </section>

    <section class="stage-panel panel">
      <div class="route-header">
        <div>
          <p class="eyebrow">Current selector profile</p>
          <h2 class="section-title">Portal anchors</h2>
        </div>
        <span class="chip">${record.selector_profile}</span>
      </div>
      <div class="selector-grid">${selectorChips(record)}</div>
    </section>

    <section class="stage-panel panel">
      <div class="component-grid">${componentCards(record)}</div>
    </section>
  `;
}

function renderGovernancePage(record) {
  return `
    <section class="stage-panel panel" style="--accent:#E7C37A">
      <div class="stage-header">
        <p class="eyebrow">Governance</p>
        <h1 class="hero-title">Dense control-plane, diff-first mutation</h1>
        <p class="hero-subtitle">Governance uses its own denser layout grammar: context bar, section nav, inventory rail, workspace canvas, and audit sidecar.</p>
      </div>
      <div class="governance-grid">
        <div class="governance-stack">
          <p class="eyebrow">Mutation posture</p>
          <h3 class="card-title" data-testid="governance-basket-ribbon">Change basket + approval composer</h3>
          <p class="copy">All risky mutations stage into a basket, preserve diff context, and expose blast radius before commit.</p>
        </div>
        <div class="governance-stack">
          <p class="eyebrow">Visibility posture</p>
          <h3 class="card-title">Masked slices + basis hashes</h3>
          <p class="copy">Every route preserves object anchor, dominant question, settlement state, and recovery posture under masking and basis drift.</p>
        </div>
      </div>
    </section>

    <section class="stage-panel panel">
      <div class="route-grid">
        ${getRoutesForPage("governance").map((route) => routeCard(route)).join("")}
      </div>
    </section>

    <section class="stage-panel panel">
      <div class="selector-grid">${selectorChips(record)}</div>
    </section>

    <section class="stage-panel panel">
      <div class="component-grid">${componentCards(record)}</div>
    </section>
  `;
}

function renderNativePage(record) {
  const native = atlasData.native_topology;
  return `
    <section class="stage-panel panel" style="--accent:#7FE0C8">
      <div class="stage-header">
        <p class="eyebrow">Native</p>
        <h1 class="hero-title">Primary scenes, support windows, restore envelope</h1>
        <p class="hero-subtitle">Native scenes embody calm-shell law with split views, detached support windows, command surfaces, and strict legality checks.</p>
      </div>
      <div class="native-topology" data-testid="native-primary-scene">
        <div class="native-grid">
          <div class="native-window-card">
            <p class="eyebrow">Primary scene</p>
            <h3 class="card-title">Sidebar -> canvas -> inspector</h3>
            <p class="copy">The same object remains mounted while sidebar and inspector independently collapse or detach.</p>
          </div>
          <div class="native-window-card">
            <p class="eyebrow">Auth + restore</p>
            <h3 class="card-title">External handoff, then lawful resume</h3>
            <p class="copy">Scene restoration binds tenant, masking, route identity, object, and preview subject before anything reopens.</p>
          </div>
        </div>
        <div class="chip-row">
          ${native.command_surfaces.slice(0, 6).map((command) => `<span class="chip mono">${escapeHtml(command)}</span>`).join("")}
        </div>
      </div>
    </section>

    <section class="stage-panel panel">
      <div class="route-grid">
        ${getRoutesForPage("native").map((route) => routeCard(route)).join("")}
      </div>
    </section>

    <section class="stage-panel panel">
      <div class="selector-grid">${selectorChips(record)}</div>
    </section>

    <section class="stage-panel panel">
      <div class="component-grid">${componentCards(record)}</div>
    </section>
  `;
}

function renderContinuityPage(scenario) {
  return `
    <section class="stage-panel panel" style="--accent:#76A9FF">
      <div class="stage-header">
        <p class="eyebrow">Continuity & Recovery</p>
        <h1 class="hero-title">Mounted truth, explicit recovery, serialized focus return</h1>
        <p class="hero-subtitle">Every family shares the same recovery vocabulary and the same promise: keep valid content mounted and explain the exact unsafe edge inline.</p>
      </div>
      <div class="timeline-panel">
        <div class="timeline-line" data-testid="continuity-timeline">
          <p class="card-title">${escapeHtml(scenario.title)}</p>
          <p class="copy">${escapeHtml(scenario.trigger)}</p>
          <p class="route-note">Preserved: ${escapeHtml(scenario.preserved.join(", "))}</p>
          <p class="route-note">Invalidated: ${escapeHtml(scenario.invalidated.join(", "))}</p>
        </div>
      </div>
    </section>

    <section class="stage-panel panel">
      <div class="route-header">
        <div>
          <p class="eyebrow">Scenario set</p>
          <h2 class="section-title">Continuity scenarios</h2>
        </div>
      </div>
      <div class="scenario-grid" data-testid="continuity-scenario-list">
        ${atlasData.continuity_scenarios.map((item) => `
          <button
            type="button"
            class="route-card"
            data-action="select-scenario"
            data-scenario-id="${escapeHtml(item.scenario_id)}"
            data-active="${String(item.scenario_id === state.scenarioId)}"
          >
            <p class="eyebrow">${escapeHtml(item.applies_to.join(" / "))}</p>
            <h3 class="card-title">${escapeHtml(item.title)}</h3>
            <p class="copy">${escapeHtml(item.trigger)}</p>
          </button>
        `).join("")}
      </div>
    </section>

    <section class="stage-panel panel">
      <div class="route-header">
        <div>
          <p class="eyebrow">Support-region focus return</p>
          <h2 class="section-title">Close support, return to anchor</h2>
        </div>
      </div>
      <div class="support-demo" data-testid="continuity-support-demo">
        <div class="button-row">
          <button type="button" class="button button-accent" data-action="toggle-support" data-testid="support-demo-toggle" data-focus-id="support-demo-toggle">Open support region</button>
        </div>
        <div class="support-shell">
          <div class="mini-stack">
            <p class="eyebrow">Parent surface</p>
            <h3 class="card-title">Route and scene anchors persist</h3>
            <p class="copy">The parent surface keeps its dominant question and object anchor while support opens, redocks, or closes.</p>
          </div>
          ${state.supportOpen ? `
            <aside class="support-drawer" data-testid="support-demo-drawer">
              <p class="eyebrow">Promoted support region</p>
              <h3 class="card-title">Serialized return target</h3>
              <p class="copy">Closing this support region restores focus to the exact parent trigger rather than to an approximate container.</p>
              <button type="button" class="button inspector-close" data-action="close-support" data-testid="support-demo-close">Close support region</button>
            </aside>
          ` : ""}
        </div>
      </div>
    </section>
  `;
}

function renderInspector() {
  if (state.pageId === "continuity") {
    const scenario = getScenario(state.scenarioId);
    return `
      <div class="inspector-panel panel" role="complementary" aria-label="Evidence inspector" data-testid="evidence-inspector">
        <p class="eyebrow">Evidence inspector</p>
        <h2 class="card-title">${escapeHtml(scenario.title)}</h2>
        <p class="copy">${escapeHtml(scenario.focus_return_rule)}</p>
        <div class="inspector-meta">
          <div class="meta-block">
            <p class="meta-label">Applies to</p>
            <p class="meta-value">${escapeHtml(scenario.applies_to.join(", "))}</p>
          </div>
          <div class="meta-block">
            <p class="meta-label">Preserved</p>
            <p class="meta-value">${escapeHtml(scenario.preserved.join(", "))}</p>
          </div>
          <div class="meta-block">
            <p class="meta-label">Source refs</p>
            <ul class="detail-list">${sourceRefList(scenario.source_refs)}</ul>
          </div>
        </div>
      </div>
    `;
  }

  const record = getRecord(state.recordKey);
  return `
    <div class="inspector-panel panel" role="complementary" aria-label="Evidence inspector" data-testid="evidence-inspector" style="--accent:${escapeHtml(getAccent(record.surface_family))}">
      <p class="eyebrow">Evidence inspector</p>
      <h2 class="card-title">${escapeHtml(record.title)}</h2>
      <p class="copy">${escapeHtml(record.notes)}</p>
      <div class="inspector-meta">
        <div class="meta-block">
          <p class="meta-label">Actors</p>
          <p class="meta-value">${escapeHtml(record.actor_profile)}</p>
        </div>
        <div class="meta-block">
          <p class="meta-label">Object ownership</p>
          <p class="meta-value">${escapeHtml(record.object_ownership)}</p>
        </div>
        <div class="meta-block">
          <p class="meta-label">Read models</p>
          <p class="meta-value">${escapeHtml(record.read_models.join(", "))}</p>
        </div>
        <div class="meta-block">
          <p class="meta-label">Commands</p>
          <p class="meta-value">${record.commands.length ? escapeHtml(record.commands.join(", ")) : "n/a"}</p>
        </div>
        <div class="meta-block">
          <p class="meta-label">Streams / live updates</p>
          <p class="meta-value">${escapeHtml(record.stream_sources.join(", "))}</p>
        </div>
        <div class="meta-block">
          <p class="meta-label">Visibility lanes</p>
          <p class="meta-value">${escapeHtml(record.visibility_lanes.join(", "))}</p>
        </div>
        <div class="meta-block">
          <p class="meta-label">Source refs</p>
          <ul class="detail-list">${sourceRefList(record.source_refs)}</ul>
        </div>
      </div>
      <button type="button" class="button inspector-close" data-action="clear-record" data-testid="inspector-close">Close inspector selection</button>
    </div>
  `;
}

function getAccent(surfaceFamily) {
  const family = atlasData.surface_families.find((item) => item.surface_family === surfaceFamily);
  return family ? family.accent : "#76A9FF";
}

function renderRail() {
  const currentPage = getPage(state.pageId);
  return `
    <aside class="rail">
      <div class="rail-panel panel">
        <p class="eyebrow">Surface atlas</p>
        <h1 class="card-title">Taxat multisurface map</h1>
        <p class="copy">Generated from the authoritative algorithm contracts and the current analysis pack.</p>
        <div class="rail-meta">
          ${metricLines([
            ["Current page", currentPage.title],
            ["Motion mode", document.documentElement.dataset.motion || "standard"],
            ["Gaps tracked", String(atlasData.gap_register.length)],
          ])}
        </div>
        <div class="page-nav" role="tablist" aria-label="Atlas pages" data-testid="atlas-page-tabs">
          ${atlasData.pages.map((page) => `
            <button
              type="button"
              class="page-tab"
              role="tab"
              id="page-tab-${escapeHtml(page.page_id)}"
              aria-selected="${String(page.page_id === state.pageId)}"
              aria-controls="atlas-stage"
              tabindex="${page.page_id === state.pageId ? "0" : "-1"}"
              data-action="select-page"
              data-page-id="${escapeHtml(page.page_id)}"
            >
              ${escapeHtml(page.title)}
            </button>
          `).join("")}
        </div>
      </div>
    </aside>
  `;
}

function renderStage() {
  const page = getPage(state.pageId);
  let pageMarkup = "";
  if (state.pageId === "overview") {
    pageMarkup = renderOverview();
  } else if (state.pageId === "collaboration") {
    pageMarkup = renderCollaborationPage(getRecord(state.recordKey));
  } else if (state.pageId === "portal") {
    pageMarkup = renderPortalPage(getRecord(state.recordKey));
  } else if (state.pageId === "governance") {
    pageMarkup = renderGovernancePage(getRecord(state.recordKey));
  } else if (state.pageId === "native") {
    pageMarkup = renderNativePage(getRecord(state.recordKey));
  } else {
    pageMarkup = renderContinuityPage(getScenario(state.scenarioId));
  }

  return `
    <main class="stage" id="atlas-stage" role="tabpanel" aria-labelledby="page-tab-${escapeHtml(page.page_id)}">
      ${pageMarkup}
    </main>
  `;
}

function render() {
  root.innerHTML = `
    <div class="atlas-shell">
      ${renderRail()}
      ${renderStage()}
      <aside class="inspector">${renderInspector()}</aside>
    </div>
  `;

  if (restoreFocusId) {
    requestAnimationFrame(() => {
      const target =
        document.getElementById(restoreFocusId) ||
        root.querySelector(`[data-focus-id="${CSS.escape(restoreFocusId)}"]`) ||
        root.querySelector(`[data-testid="${CSS.escape(restoreFocusId)}"]`);
      if (target) target.focus();
      restoreFocusId = null;
    });
  }
}

function handleClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target) return;

  const action = target.dataset.action;
  if (action === "select-page") {
    state.supportOpen = false;
    const pageId = target.dataset.pageId;
    const recordKey = defaultRecordForPage(pageId);
    updateHash({ pageId, recordKey, scenarioId: state.scenarioId });
    return;
  }

  if (action === "select-record") {
    state.supportOpen = false;
    const recordKey = target.dataset.recordKey;
    updateHash({ pageId: state.pageId, recordKey, scenarioId: state.scenarioId });
    return;
  }

  if (action === "select-scenario") {
    state.supportOpen = false;
    const scenarioId = target.dataset.scenarioId;
    updateHash({ pageId: "continuity", recordKey: state.recordKey, scenarioId });
    return;
  }

  if (action === "toggle-support") {
    state.supportOpen = true;
    render();
    return;
  }

  if (action === "close-support") {
    state.supportOpen = false;
    restoreFocusId = "support-demo-toggle";
    render();
    return;
  }

  if (action === "clear-record") {
    const fallback = defaultRecordForPage(state.pageId);
    restoreFocusId = state.recordKey;
    updateHash({ pageId: state.pageId, recordKey: fallback, scenarioId: state.scenarioId });
  }
}

function handleTabKeydown(event) {
  const tab = event.target.closest(".page-tab");
  if (!tab) return;
  const tabs = [...root.querySelectorAll(".page-tab")];
  const currentIndex = tabs.indexOf(tab);
  if (currentIndex === -1) return;

  let nextIndex = null;
  if (event.key === "ArrowDown" || event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
  if (event.key === "ArrowUp" || event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
  if (event.key === "Home") nextIndex = 0;
  if (event.key === "End") nextIndex = tabs.length - 1;
  if (nextIndex === null) return;

  event.preventDefault();
  restoreFocusId = `page-tab-${tabs[nextIndex].dataset.pageId}`;
  tabs[nextIndex].focus();
  tabs[nextIndex].click();
}

async function init() {
  const response = await fetch("./atlas_data.json");
  atlasData = await response.json();
  setMotionMode();
  syncStateFromHash(true);
  window.addEventListener("hashchange", () => syncStateFromHash(false));
  window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", () => {
    setMotionMode();
    render();
  });
  root.addEventListener("click", handleClick);
  root.addEventListener("keydown", handleTabKeydown);
}

init();
