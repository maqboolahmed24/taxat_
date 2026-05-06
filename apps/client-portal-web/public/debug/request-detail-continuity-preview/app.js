const cases = [
  {
    id: "portal-parent-return",
    label: "Back returns to request row",
    preRoute: "/portal/requests/workflow-item-0155-preview",
    preFocus: "upload-request:block:workflow-item-0155-preview",
    postRoute: "/portal/requests",
    postFocus: "customer-request-row://workflow-item-0155-preview",
    fallback: [
      "EXACT_FOCUS -> upload-request:block:workflow-item-0155-preview",
      "OBJECT_SUMMARY -> request-summary://workflow-item-0155-preview",
      "PARENT_RETURN -> customer-request-row://workflow-item-0155-preview",
      "NARROWEST_SURVIVING_LIST -> /portal/requests",
    ],
    invalidation: ["ACCESS_BINDING_CHANGE", "MASKING_CHANGE", "SESSION_REVOKED", "OBJECT_GONE"],
  },
  {
    id: "portal-help-handoff",
    label: "Help returns to source anchor",
    preRoute: "/portal/help?request=workflow-item-0155-preview",
    preFocus: "help:message-body:workflow-item-0155-preview",
    postRoute: "/portal/requests/workflow-item-0155-preview",
    postFocus: "help-link:workflow-item-0155-preview",
    fallback: [
      "PARENT_RETURN -> help-link:workflow-item-0155-preview",
      "NARROWEST_SURVIVING_LIST -> customer-request-row://workflow-item-0155-preview",
    ],
    invalidation: ["VIEW_GUARD_CHANGE", "OBJECT_GONE"],
  },
  {
    id: "portal-stale-object-summary",
    label: "Stale exact target uses object summary",
    preRoute: "/portal/requests/workflow-item-0155-preview",
    preFocus: "request-info-focus://request-info://workflow-item-0155-preview/1",
    postRoute: "/portal/requests/workflow-item-0155-preview",
    postFocus: "request-summary://workflow-item-0155-preview",
    fallback: [
      "OBJECT_SUMMARY -> request-summary://workflow-item-0155-preview",
      "PARENT_RETURN -> customer-request-row://workflow-item-0155-preview",
      "NARROWEST_SURVIVING_LIST -> /portal/requests",
    ],
    invalidation: ["MASKING_CHANGE", "SESSION_REVOKED"],
  },
];

const scenarioList = document.querySelector("#scenario-list");
const caseTitle = document.querySelector("#case-title");
const routeFocusMap = document.querySelector("#route-focus-map");
const fallbackOrder = document.querySelector("#fallback-order");
const invalidationReasons = document.querySelector("#invalidation-reasons");

function render(selected) {
  for (const button of scenarioList.querySelectorAll("button")) {
    button.setAttribute("aria-pressed", String(button.dataset.caseId === selected.id));
  }
  caseTitle.textContent = selected.label;
  routeFocusMap.innerHTML = `
    <div class="route-node"><strong>Pre state</strong><br /><code>${selected.preRoute}</code><br /><code>${selected.preFocus}</code></div>
    <div class="arrow" aria-hidden="true">-></div>
    <div class="route-node"><strong>Post state</strong><br /><code>${selected.postRoute}</code><br /><code>${selected.postFocus}</code></div>
  `;
  fallbackOrder.innerHTML = selected.fallback
    .map((item) => `<li class="fallback-item"><code>${item}</code></li>`)
    .join("");
  invalidationReasons.innerHTML = selected.invalidation
    .map(
      (reason) =>
        `<li class="reason-item" data-critical="${reason === "SESSION_REVOKED" || reason === "OBJECT_GONE"}"><code>${reason}</code></li>`,
    )
    .join("");
}

scenarioList.innerHTML = cases
  .map(
    (item) =>
      `<button class="scenario-button" data-testid="continuity-case-row" data-case-id="${item.id}" type="button"><strong>${item.label}</strong><span>${item.id}</span></button>`,
  )
  .join("");

scenarioList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-case-id]");
  if (!button) {
    return;
  }
  const selected = cases.find((item) => item.id === button.dataset.caseId);
  if (selected) {
    render(selected);
  }
});

render(cases[0]);
