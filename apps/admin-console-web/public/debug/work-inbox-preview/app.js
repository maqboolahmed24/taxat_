const rows = [
  {
    id: "workflow-item-0151-a",
    title: "Payroll records needed",
    meta: "Client client-0151-a · overdue · REQUEST_CUSTOMER_INFO",
    customerUnread: 1,
    internalUnread: 1,
    selected: true,
  },
  {
    id: "workflow-item-0151-b",
    title: "Review bank evidence",
    meta: "Client client-0151-b · in progress · REPLY",
    customerUnread: 0,
    internalUnread: 1,
    selected: false,
  },
  {
    id: "workflow-item-0151-c",
    title: "Assign onboarding check",
    meta: "Client client-0151-c · unassigned · ASSIGN_TO_ME",
    customerUnread: 0,
    internalUnread: 0,
    selected: false,
  },
];

const deltaLog = [
  "Snapshot loaded in canonical routing order.",
  "Delta applied: focused row workflow-item-0151-a changed order.",
  "Reorder deferred until focus exit; selected row remains mounted.",
  "Badge update preserved split customer/internal counts.",
];

function renderRows() {
  const root = document.querySelector("#inboxRows");
  if (!root) {
    return;
  }
  root.textContent = "";
  for (const row of rows) {
    const article = document.createElement("article");
    article.className = "row";
    article.dataset.testid = "work-inbox-row";
    article.setAttribute("tabindex", "0");
    article.setAttribute("aria-label", `${row.title}, ${row.meta}`);
    if (row.selected) {
      article.setAttribute("aria-current", "true");
    }

    const copy = document.createElement("div");
    const title = document.createElement("span");
    title.className = "row-title";
    title.textContent = row.title;
    const meta = document.createElement("p");
    meta.className = "row-meta";
    meta.textContent = row.meta;
    copy.append(title, meta);

    const badges = document.createElement("div");
    badges.className = "badges";
    const customerBadge = document.createElement("span");
    customerBadge.className = "badge";
    customerBadge.dataset.testid = "customer-unread-badge";
    customerBadge.textContent = `Customer ${row.customerUnread}`;
    const internalBadge = document.createElement("span");
    internalBadge.className = "badge internal";
    internalBadge.dataset.testid = "internal-unread-badge";
    internalBadge.textContent = `Internal ${row.internalUnread}`;
    badges.append(customerBadge, internalBadge);

    article.append(copy, badges);
    root.append(article);
  }
}

function renderLog() {
  const root = document.querySelector("#deltaLog");
  if (!root) {
    return;
  }
  root.textContent = "";
  for (const entry of deltaLog) {
    const item = document.createElement("li");
    item.textContent = entry;
    root.append(item);
  }
}

renderRows();
renderLog();
