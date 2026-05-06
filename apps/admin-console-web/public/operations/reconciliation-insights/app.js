const snapshots = [
  {
    profile: "authority-operation-profile://hmrc-periodic-fast",
    environment: "HMRC_SANDBOX",
    operation: "AUTH_SUBMIT_PERIODIC_UPDATE",
    window: "2026-04-29T00:00:00Z to 2026-04-29T06:00:00Z",
    total: 18,
    unresolvedAmbiguity: 5,
    blocked: 7,
    escalated: 3,
    resume: 2,
    p95: 5400,
    recommendations: ["INCREASE_DEADLINE_WINDOW", "REVIEW_PROVIDER_AMBIGUITY"],
    budget: [
      ["ACTIVE", 6, "info"],
      ["CLOSED", 5, "success"],
      ["ESCALATED", 3, "danger"],
      ["EXHAUSTED", 4, "warning"],
      ["NOT_OPENED", 0, "neutral"],
    ],
    reasons: [
      ["RECONCILIATION_DEADLINE_EXPIRED", "RESEND_REFUSAL", 4],
      ["CONTRADICTORY_AUTHORITY_EVIDENCE", "RESEND_REFUSAL", 3],
      ["AUTO_RECONCILIATION_BUDGET_EXHAUSTED", "ESCALATION", 3],
    ],
  },
  {
    profile: "authority-operation-profile://hmrc-replay-stable",
    environment: "HMRC_SANDBOX",
    operation: "AUTH_SUBMIT_PERIODIC_UPDATE",
    window: "2026-04-29T00:00:00Z to 2026-04-29T06:00:00Z",
    total: 12,
    unresolvedAmbiguity: 0,
    blocked: 1,
    escalated: 0,
    resume: 6,
    p95: null,
    recommendations: ["NO_CHANGE_RECOMMENDED"],
    budget: [
      ["ACTIVE", 1, "info"],
      ["CLOSED", 11, "success"],
      ["ESCALATED", 0, "danger"],
      ["EXHAUSTED", 0, "warning"],
      ["NOT_OPENED", 0, "neutral"],
    ],
    reasons: [["TERMINAL_AUTHORITY_STATE_RECORDED", "RESEND_REFUSAL", 8]],
  },
  {
    profile: "authority-operation-profile://hmrc-empty-window",
    environment: "HMRC_PRODUCTION",
    operation: "AUTH_SUBMIT_FINAL_DECLARATION",
    window: "2026-04-29T00:00:00Z to 2026-04-29T06:00:00Z",
    total: 0,
    unresolvedAmbiguity: 0,
    blocked: 0,
    escalated: 0,
    resume: 0,
    p95: null,
    recommendations: ["NO_CHANGE_RECOMMENDED"],
    budget: [
      ["ACTIVE", 0, "info"],
      ["CLOSED", 0, "success"],
      ["ESCALATED", 0, "danger"],
      ["EXHAUSTED", 0, "warning"],
      ["NOT_OPENED", 0, "neutral"],
    ],
    reasons: [],
  },
];

const elements = {
  budgetBand: document.querySelector("#budget-band"),
  budgetLegend: document.querySelector("#budget-legend"),
  budgetTotal: document.querySelector("#budget-total"),
  dominantCopy: document.querySelector("#dominant-copy"),
  dominantPanel: document.querySelector("[data-testid='reconciliation-dominant-insight']"),
  dominantTitle: document.querySelector("#dominant-title"),
  drillBody: document.querySelector("#drill-body"),
  emptyCopy: document.querySelector("#empty-copy"),
  emptyState: document.querySelector("#empty-state"),
  form: document.querySelector("#query-form"),
  headerEnvironment: document.querySelector("#header-environment"),
  headerOperation: document.querySelector("#header-operation"),
  headerWindow: document.querySelector("#header-window"),
  latencyChip: document.querySelector("#latency-chip"),
  profileSummary: document.querySelector("#profile-summary"),
  reasonBody: document.querySelector("#reason-body"),
  recommendations: document.querySelector("#recommendation-list"),
  resumeStrip: document.querySelector("#resume-strip"),
  shell: document.querySelector(".shell"),
};

function activeFilters() {
  const data = new FormData(elements.form);
  return {
    ambiguityHeavy: data.get("ambiguityHeavy") === "on",
    environment: data.get("environment"),
    escalationOnly: data.get("escalationOnly") === "on",
    operation: data.get("operation"),
    profile: data.get("profile"),
    resumeHeavy: data.get("resumeHeavy") === "on",
    unresolvedOnly: data.get("unresolvedOnly") === "on",
  };
}

function ratio(count, total) {
  return total === 0 ? 0 : count / total;
}

function percent(count, total) {
  return `${Math.round(ratio(count, total) * 1000) / 10}%`;
}

function findSnapshot(filters) {
  return snapshots.find((snapshot) => {
    if (snapshot.environment !== filters.environment) return false;
    if (snapshot.operation !== filters.operation) return false;
    if (snapshot.profile !== filters.profile) return false;
    if (filters.unresolvedOnly && snapshot.unresolvedAmbiguity === 0) return false;
    if (filters.escalationOnly && snapshot.escalated === 0) return false;
    if (filters.resumeHeavy && ratio(snapshot.resume, snapshot.total) < 0.35) return false;
    if (filters.ambiguityHeavy && ratio(snapshot.unresolvedAmbiguity, snapshot.total) < 0.2) {
      return false;
    }
    return true;
  });
}

function filterEcho(filters) {
  return [
    filters.environment,
    filters.operation,
    filters.profile,
    filters.unresolvedOnly ? "unresolved only" : null,
    filters.escalationOnly ? "escalation only" : null,
    filters.resumeHeavy ? "resume heavy" : null,
    filters.ambiguityHeavy ? "ambiguity heavy" : null,
  ]
    .filter(Boolean)
    .join(" / ");
}

function setHeader(snapshot, filters) {
  elements.headerEnvironment.textContent = snapshot?.environment ?? filters.environment;
  elements.headerOperation.textContent = snapshot?.operation ?? filters.operation;
  elements.headerWindow.textContent =
    snapshot?.window ?? "2026-04-29T00:00:00Z to 2026-04-29T06:00:00Z";
  elements.profileSummary.textContent =
    "Read-only projection from AuthorityReconciliationAnalyticsSnapshot records using DURABLE_RECONCILIATION_CONTROL_CONTRACTS_ONLY.";
}

function renderDominant(snapshot) {
  if (snapshot.total === 0) {
    elements.dominantPanel.dataset.tone = "neutral";
    elements.dominantTitle.textContent = "No interactions in this snapshot window";
    elements.dominantCopy.textContent =
      "The active filters matched a persisted zero-interaction snapshot without treating missing traffic as success.";
    return;
  }
  if (snapshot.unresolvedAmbiguity > 0) {
    elements.dominantPanel.dataset.tone = "warning";
    elements.dominantTitle.textContent = "Ambiguity is the dominant pressure";
    elements.dominantCopy.textContent = `${snapshot.unresolvedAmbiguity} durable control contract(s) still carry ambiguity or contradiction posture.`;
    return;
  }
  if (snapshot.resume > 0) {
    elements.dominantPanel.dataset.tone = "info";
    elements.dominantTitle.textContent = "Replay resume is visible and stable";
    elements.dominantCopy.textContent =
      "The profile is resume heavy, but terminal outcomes remain acceptable and no tuning change is recommended.";
    return;
  }
  elements.dominantPanel.dataset.tone = "neutral";
  elements.dominantTitle.textContent = "No tuning pressure detected";
  elements.dominantCopy.textContent =
    "This window has no material ambiguity, escalation, or restore pressure.";
}

function renderBudget(snapshot) {
  elements.budgetTotal.textContent = `${snapshot.total} interaction(s)`;
  elements.budgetBand.replaceChildren(
    ...snapshot.budget.map(([code, count, tone]) => {
      const segment = document.createElement("div");
      segment.className = "budget-segment";
      segment.dataset.tone = tone;
      segment.style.flexBasis = snapshot.total === 0 ? "20%" : percent(count, snapshot.total);
      segment.setAttribute("aria-label", `${code} ${count}`);
      return segment;
    }),
  );
  elements.budgetLegend.replaceChildren(
    ...snapshot.budget.map(([code, count]) => {
      const item = document.createElement("li");
      const strong = document.createElement("strong");
      strong.textContent = code.replaceAll("_", " ");
      const span = document.createElement("span");
      span.textContent = `${count} / ${percent(count, snapshot.total)}`;
      item.append(strong, span);
      return item;
    }),
  );
}

function renderReasons(snapshot) {
  const rows = snapshot.reasons.length
    ? snapshot.reasons
    : [["NO_REASONS_IN_WINDOW", "RESEND_REFUSAL", 0]];
  elements.reasonBody.replaceChildren(
    ...rows.map(([reason, family, count]) => {
      const row = document.createElement("tr");
      const reasonCell = document.createElement("td");
      reasonCell.textContent = reason;
      const familyCell = document.createElement("td");
      familyCell.textContent = family;
      const countCell = document.createElement("td");
      countCell.textContent = String(count);
      const shareCell = document.createElement("td");
      const meter = document.createElement("span");
      meter.className = "reason-meter";
      const fill = document.createElement("span");
      fill.style.width = percent(count, snapshot.total);
      meter.append(fill);
      shareCell.append(`${percent(count, snapshot.total)} `, meter);
      row.append(reasonCell, familyCell, countCell, shareCell);
      return row;
    }),
  );
}

function renderResume(snapshot) {
  elements.latencyChip.textContent =
    snapshot.p95 === null ? "No escalation latency p95" : `p95 ${snapshot.p95}s`;
  const items = [
    ["Replay resume", snapshot.resume, percent(snapshot.resume, snapshot.total)],
    ["Escalated", snapshot.escalated, percent(snapshot.escalated, snapshot.total)],
    ["Blocked resend", snapshot.blocked, percent(snapshot.blocked, snapshot.total)],
  ];
  elements.resumeStrip.replaceChildren(
    ...items.map(([label, count, share]) => {
      const item = document.createElement("div");
      item.className = "strip-item";
      const strong = document.createElement("strong");
      strong.textContent = String(count);
      const span = document.createElement("span");
      span.textContent = `${label} / ${share}`;
      item.append(strong, span);
      return item;
    }),
  );
}

function renderDrill(snapshot) {
  const rows = [
    ["Total interaction count", snapshot.total],
    ["Unresolved ambiguity count", snapshot.unresolvedAmbiguity],
    ["Replay resume count", snapshot.resume],
    ["Escalated count", snapshot.escalated],
    ["Source policy", "DURABLE_RECONCILIATION_CONTROL_CONTRACTS_ONLY"],
  ];
  elements.drillBody.replaceChildren(
    ...rows.map(([label, value]) => {
      const row = document.createElement("tr");
      const labelCell = document.createElement("td");
      labelCell.textContent = label;
      const valueCell = document.createElement("td");
      valueCell.textContent = String(value);
      const actionCell = document.createElement("td");
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = `Inspect ${label}`;
      button.addEventListener("click", () => {
        row.dataset.selected = "true";
      });
      actionCell.append(button);
      row.append(labelCell, valueCell, actionCell);
      return row;
    }),
  );
}

function renderRecommendations(snapshot) {
  elements.recommendations.replaceChildren(
    ...snapshot.recommendations.map((code) => {
      const item = document.createElement("span");
      item.textContent = code.replaceAll("_", " ");
      return item;
    }),
  );
}

function renderEmpty(filters) {
  elements.emptyState.hidden = false;
  elements.emptyCopy.textContent = `Active filter: ${filterEcho(filters)}. The query surface stays read-only and does not synthesize false zeroes.`;
  const emptySnapshot = snapshots.find((snapshot) => snapshot.total === 0);
  setHeader(emptySnapshot, filters);
  renderDominant(emptySnapshot);
  renderBudget(emptySnapshot);
  renderReasons(emptySnapshot);
  renderResume(emptySnapshot);
  renderDrill(emptySnapshot);
  renderRecommendations(emptySnapshot);
}

function render() {
  const filters = activeFilters();
  const snapshot = findSnapshot(filters);
  elements.shell.dataset.filterState = "applied";
  if (!snapshot) {
    renderEmpty(filters);
    return;
  }
  elements.emptyState.hidden = snapshot.total !== 0;
  if (snapshot.total === 0) {
    elements.emptyCopy.textContent = `Active filter: ${filterEcho(filters)}.`;
  }
  setHeader(snapshot, filters);
  renderDominant(snapshot);
  renderBudget(snapshot);
  renderReasons(snapshot);
  renderResume(snapshot);
  renderDrill(snapshot);
  renderRecommendations(snapshot);
}

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  render();
});

const params = new URLSearchParams(window.location.search);
if (params.get("scenario") === "empty") {
  elements.form.elements.environment.value = "HMRC_PRODUCTION";
  elements.form.elements.operation.value = "AUTH_SUBMIT_FINAL_DECLARATION";
  elements.form.elements.profile.value = "authority-operation-profile://hmrc-empty-window";
}
if (params.get("scenario") === "resume-heavy") {
  elements.form.elements.profile.value = "authority-operation-profile://hmrc-replay-stable";
  elements.form.elements.resumeHeavy.checked = true;
}

render();
