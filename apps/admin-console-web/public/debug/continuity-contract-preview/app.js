const cases = [
  {
    id: "workspace-close-return",
    label: "Inbox row to workspace close",
    scope: "WORKSPACE_ROUTE",
    shell: "CALM_SHELL",
    preRoute: "/work/items/workflow-item-0155-preview",
    preFocus: "work-item-focus://workflow-item-0155-preview/customer-activity",
    postRoute: "/work",
    postFocus: "work-inbox-row://workflow-item-0155-preview",
    fallback: [
      "EXACT_FOCUS -> work-item-focus://workflow-item-0155-preview/customer-activity",
      "OBJECT_SUMMARY -> object-summary://workflow-item-0155-preview",
      "PARENT_RETURN -> work-inbox-row://workflow-item-0155-preview",
      "NARROWEST_SURVIVING_LIST -> /work",
    ],
    invalidation: [
      "ACCESS_BINDING_CHANGE",
      "MASKING_CHANGE",
      "SESSION_REVOKED",
      "OBJECT_GONE",
    ],
  },
  {
    id: "notification-object-summary",
    label: "Notification open stale focus",
    scope: "WORK_ITEM_NOTIFICATION",
    shell: "CLIENT_PORTAL_SHELL",
    preRoute: "/portal/requests/workflow-item-0155-preview",
    preFocus: "request-info-focus://request-info://workflow-item-0155-preview/1",
    postRoute: "/portal/requests/workflow-item-0155-preview",
    postFocus: "object-summary://workflow-item-0155-preview",
    fallback: [
      "EXACT_FOCUS -> request-info-focus://request-info://workflow-item-0155-preview/1",
      "OBJECT_SUMMARY -> object-summary://workflow-item-0155-preview",
      "PARENT_RETURN -> customer-request-row://workflow-item-0155-preview",
      "NARROWEST_SURVIVING_LIST -> /portal/requests",
    ],
    invalidation: ["ACCESS_BINDING_CHANGE", "MASKING_CHANGE", "VIEW_GUARD_CHANGE"],
  },
  {
    id: "live-update-focus-lock",
    label: "Live update focus lock",
    scope: "GOVERNANCE_ROUTE",
    shell: "GOVERNANCE_DENSITY_SHELL",
    preRoute: "/governance/risk/pending-approvals",
    preFocus: "compare-toggle:tenant-0155",
    postRoute: "/governance/risk/pending-approvals",
    postFocus: "compare-toggle:tenant-0155",
    fallback: [
      "EXACT_FOCUS -> compare-toggle:tenant-0155",
      "ACTIVE_FOCUS_LOCK -> COMPARE_CONTROL",
    ],
    invalidation: ["POLICY_SNAPSHOT_CHANGE", "SESSION_REVOKED"],
  },
];

const scenarioList = document.querySelector("#scenario-list");
const caseTitle = document.querySelector("#case-title");
const caseMetadata = document.querySelector("#case-metadata");
const routeFocusMap = document.querySelector("#route-focus-map");
const fallbackOrder = document.querySelector("#fallback-order");
const invalidationReasons = document.querySelector("#invalidation-reasons");

function chip(label, value) {
  return `<div><dt>${label}</dt><dd><code>${value}</code></dd></div>`;
}

function render(selected) {
  for (const button of scenarioList.querySelectorAll("button")) {
    button.setAttribute("aria-pressed", String(button.dataset.caseId === selected.id));
  }
  caseTitle.textContent = selected.label;
  caseMetadata.innerHTML = [
    chip("Scope", selected.scope),
    chip("Shell", selected.shell),
    chip("Case", selected.id),
  ].join("");
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
      `<button class="scenario-button" data-testid="continuity-case-row" data-case-id="${item.id}" type="button"><strong>${item.label}</strong><span>${item.scope}</span></button>`,
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
