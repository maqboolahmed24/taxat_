const itemId = "workflow-item-0150-preview";

const scenarios = {
  staff: {
    actionability: "ACTION_AVAILABLE",
    currentArtifact: "download://workflow-item-0150-preview/shared-current",
    entry: "WORK_INBOX",
    fallback: "/work -> work-inbox-row://workflow-item-0150-preview",
    focus: "work-item-focus://workflow-item-0150-preview/customer-activity",
    historyArtifacts: "download://workflow-item-0150-preview/shared-history",
    internalFiles: "download://workflow-item-0150-preview/internal",
    internalState: "IN_PROGRESS",
    modules: ["CUSTOMER_ACTIVITY", "INTERNAL_ACTIVITY", "FILES", "LINKED_CONTEXT", "AUDIT_TRAIL"],
    primaryAction: "ADD_INTERNAL_NOTE",
    returnRoute: "/work",
    route: `/work/items/${itemId}`,
    shell: "CALM_SHELL",
    suggestedModule: "None",
    summary: "Workspace summary for workflow-item-0150-preview",
    title: "Upload payroll records",
  },
  customer: {
    actionability: "ACTION_AVAILABLE",
    currentArtifact: "download://workflow-item-0150-preview/shared-current",
    entry: "REQUEST_LIST",
    fallback: "/portal/requests -> customer-request-row://workflow-item-0150-preview",
    focus: "work-item-focus://workflow-item-0150-preview/customer-activity",
    historyArtifacts: "download://workflow-item-0150-preview/shared-history",
    internalFiles: "Not exposed",
    internalState: "Not exposed",
    modules: ["CUSTOMER_ACTIVITY", "FILES"],
    primaryAction: "RESPOND_TO_REQUEST_INFO",
    returnRoute: "/portal/requests",
    route: `/portal/requests/${itemId}`,
    shell: "CLIENT_PORTAL_SHELL",
    suggestedModule: "None",
    summary: "Request status and next step",
    title: "Upload payroll records",
  },
};

const select = document.querySelector("#scenario");
const params = new URLSearchParams(window.location.search);
const initialScenario = params.get("scenario") === "customer" ? "customer" : "staff";
select.value = initialScenario;

function setText(id, value) {
  document.querySelector(`#${id}`).textContent = value;
}

function render(scenarioName) {
  const scenario = scenarios[scenarioName] ?? scenarios.staff;
  setText("shell", scenario.shell);
  setText("route", scenario.route);
  setText("title", scenario.title);
  setText("internal-state", scenario.internalState);
  setText("summary", scenario.summary);
  setText("actionability", scenario.actionability);
  setText("primary-action", scenario.primaryAction);
  setText("suggested-module", scenario.suggestedModule);
  setText("current-artifact", scenario.currentArtifact);
  setText("history-artifacts", scenario.historyArtifacts);
  setText("internal-files", scenario.internalFiles);
  setText("entry", scenario.entry);
  setText("focus", scenario.focus);
  setText("return-route", scenario.returnRoute);
  setText("fallback", scenario.fallback);

  const moduleList = document.querySelector("#modules");
  moduleList.replaceChildren();
  for (const moduleCode of scenario.modules) {
    const item = document.createElement("li");
    item.textContent = moduleCode;
    moduleList.append(item);
  }
}

select.addEventListener("change", () => {
  const url = new URL(window.location.href);
  url.searchParams.set("scenario", select.value);
  window.history.replaceState(null, "", url);
  render(select.value);
});

render(select.value);
