const dataPath = "./data/local-runtime-observatory.json";

const state = {
  payload: null,
  selectedEdgeRef: null,
  selectedServiceRef: null,
};

const elements = {
  basisStatement: document.querySelector("#basis-statement"),
  edgeList: document.querySelector("#edge-list"),
  edgeSummary: document.querySelector("#edge-summary"),
  edgeTitle: document.querySelector("#edge-title"),
  environmentBadge: document.querySelector("#environment-badge"),
  inspectorSummary: document.querySelector("#inspector-summary"),
  inspectorTitle: document.querySelector("#inspector-title"),
  legendStrip: document.querySelector("#legend-strip"),
  pageTitle: document.querySelector("#page-title"),
  propertyGrid: document.querySelector("#property-grid"),
  rebuildList: document.querySelector("#rebuild-list"),
  seedProfileChip: document.querySelector("#seed-profile-chip"),
  serviceList: document.querySelector("#service-list"),
  serviceMap: document.querySelector("#service-map"),
  validatorStatusChip: document.querySelector("#validator-status-chip"),
};

function setMotionPreference() {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  const sync = () => {
    document.documentElement.dataset.motion = media.matches ? "reduce" : "standard";
  };
  sync();
  media.addEventListener("change", sync);
}

function chip(label, tone = "neutral") {
  const span = document.createElement("span");
  span.className = "chip";
  span.dataset.tone = tone;
  span.textContent = label;
  return span;
}

function toneForPersistence(service) {
  if (service.persistence_class === "DURABLE_TRUTH") {
    return "success";
  }
  if (service.persistence_class === "DISPOSABLE_ACCELERATION") {
    return "warning";
  }
  return "neutral";
}

function railAccessibleLabel(service) {
  return `${service.accessible_label} in topology rail`;
}

function serviceMapAccessibleLabel(service) {
  return `${service.accessible_label} in service map`;
}

function selectedService() {
  const fallback = state.payload.selectedServiceRef;
  const service =
    state.payload.services.find((entry) => entry.service_ref === (state.selectedServiceRef ?? fallback)) ??
    state.payload.services[0];
  state.selectedServiceRef = service.service_ref;
  return service;
}

function selectedEdge() {
  const fallback = state.payload.selectedEdgeRef;
  const edge =
    state.payload.connections.find((entry) => entry.edge_ref === (state.selectedEdgeRef ?? fallback)) ??
    state.payload.connections[0];
  state.selectedEdgeRef = edge.edge_ref;
  return edge;
}

function renderTopbar() {
  elements.pageTitle.textContent = state.payload.title;
  elements.basisStatement.textContent = state.payload.basisStatement;
  elements.environmentBadge.textContent = state.payload.environmentBadge;
  elements.seedProfileChip.textContent = state.payload.seedProfileChip;
  elements.validatorStatusChip.textContent = state.payload.validatorStatusChip;
}

function renderLegend() {
  elements.legendStrip.replaceChildren(
    ...state.payload.legend.map((entry) => chip(entry.label, entry.tone)),
  );
}

function renderRail(activeService) {
  elements.serviceList.replaceChildren(
    ...state.payload.services.map((service) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "rail-button";
      button.setAttribute("aria-current", service.service_ref === activeService.service_ref ? "true" : "false");
      button.setAttribute("aria-label", railAccessibleLabel(service));
      button.innerHTML = `
        <strong>${service.label}</strong>
        <span>${service.family}</span>
      `;
      button.addEventListener("click", () => {
        state.selectedServiceRef = service.service_ref;
        render();
      });
      item.append(button);
      return item;
    }),
  );
}

function renderServiceMap(activeService) {
  elements.serviceMap.replaceChildren(
    ...state.payload.services.map((service) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "service-card";
      button.dataset.active = service.service_ref === activeService.service_ref ? "true" : "false";
      button.setAttribute("aria-label", serviceMapAccessibleLabel(service));
      button.innerHTML = `
        <div class="service-card-header">
          <div>
            <p class="eyebrow">${service.family}</p>
            <h3>${service.label}</h3>
          </div>
          <span class="chip" data-tone="${toneForPersistence(service)}">${service.status}</span>
        </div>
        <p>${service.notes[0]}</p>
        <div class="service-meta">
          <span class="chip" data-tone="${toneForPersistence(service)}">${service.persistence_class.replaceAll("_", " ")}</span>
          <span class="chip">${service.provider_family.replaceAll("_", " ")}</span>
        </div>
      `;
      button.addEventListener("click", () => {
        state.selectedServiceRef = service.service_ref;
        render();
      });
      return button;
    }),
  );
}

function renderEdges(activeEdge) {
  elements.edgeList.replaceChildren(
    ...state.payload.connections.map((edge) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "edge-button";
      button.dataset.active = edge.edge_ref === activeEdge.edge_ref ? "true" : "false";
      button.setAttribute("aria-label", edge.accessible_label);
      button.innerHTML = `
        <strong>${edge.label}</strong>
        <span>${edge.edge_class.replaceAll("_", " ")}</span>
      `;
      button.addEventListener("click", () => {
        state.selectedEdgeRef = edge.edge_ref;
        render();
      });
      return button;
    }),
  );
}

function property(term, value, mono = false) {
  const dt = document.createElement("dt");
  dt.textContent = term;
  const dd = document.createElement("dd");
  dd.textContent = Array.isArray(value) ? value.join(", ") : value;
  if (mono) {
    dd.className = "mono";
  }
  return [dt, dd];
}

function renderInspector(activeService, activeEdge) {
  elements.inspectorTitle.textContent = activeService.label;
  elements.inspectorSummary.textContent = activeService.notes.join(" ");

  const fields = [
    property("Persistence", activeService.persistence_class.replaceAll("_", " ")),
    property("Reset", activeService.reset_class.replaceAll("_", " ")),
    property("Compose", activeService.compose_service_refs.length ? activeService.compose_service_refs : "host process gate", true),
    property("Ports", activeService.port_bindings.length ? activeService.port_bindings : "n/a", true),
    property("Namespaces", activeService.namespace_refs.length ? activeService.namespace_refs : "n/a", true),
    property("Depends on", activeService.dependency_service_refs.length ? activeService.dependency_service_refs : "none", true),
    property("Boot phases", activeService.phase_refs, true),
    property("Health codes", activeService.readiness_codes, true),
  ].flat();
  elements.propertyGrid.replaceChildren(...fields);

  elements.rebuildList.replaceChildren(
    ...activeService.safe_rebuild_instructions.map((instruction) => {
      const item = document.createElement("li");
      item.textContent = instruction;
      return item;
    }),
  );

  elements.edgeTitle.textContent = activeEdge.label;
  elements.edgeSummary.textContent = activeEdge.summary;
}

function render() {
  const activeService = selectedService();
  const activeEdge = selectedEdge();
  renderTopbar();
  renderLegend();
  renderRail(activeService);
  renderServiceMap(activeService);
  renderEdges(activeEdge);
  renderInspector(activeService, activeEdge);
}

async function init() {
  setMotionPreference();
  const response = await fetch(dataPath);
  if (!response.ok) {
    throw new Error(`Failed to load observatory payload: ${response.status}`);
  }
  state.payload = await response.json();
  render();
}

void init();
