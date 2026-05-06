const snapshot = {
  dominant_question: "What needs your attention?",
  request_list_route_key: "/portal/requests",
  selected_focus_anchor_ref_or_null: "customer-request-row://workflow-item-0150-preview",
  shell_family: "CLIENT_PORTAL_SHELL",
  rows: [
    {
      due_label_ref_or_null: "Due 2026-05-04",
      focus_anchor_ref: "customer-request-row://workflow-item-0150-preview",
      item_id: "workflow-item-0150-preview",
      no_safe_action_reason_ref_or_null: null,
      primary_action_code_or_null: "RESPOND_TO_REQUEST_INFO",
      primary_action_label_ref_or_null: "Reply",
      status_label_ref: "A reply is needed",
      title: "Upload payroll records",
    },
    {
      due_label_ref_or_null: "Due 2026-05-08",
      focus_anchor_ref: "customer-request-row://workflow-item-0150-review",
      item_id: "workflow-item-0150-review",
      no_safe_action_reason_ref_or_null: "We are reviewing this",
      primary_action_code_or_null: null,
      primary_action_label_ref_or_null: null,
      status_label_ref: "We are reviewing this",
      title: "Review tax return details",
    },
  ],
};

document.querySelector("#dominant-question").textContent = snapshot.dominant_question;
document.querySelector("#shell").textContent = snapshot.shell_family;
document.querySelector("#route").textContent = snapshot.request_list_route_key;
document.querySelector("#selected-focus").textContent = snapshot.selected_focus_anchor_ref_or_null;

const rows = document.querySelector("#rows");
for (const row of snapshot.rows) {
  const article = document.createElement("article");
  article.className = "request-row";
  article.dataset.testid = "customer-request-row";
  article.innerHTML = `
    <div>
      <h2>${row.title}</h2>
      <p class="meta">${row.status_label_ref} · ${row.due_label_ref_or_null ?? "No deadline yet"}</p>
    </div>
    <div>
      <p class="meta">${row.focus_anchor_ref}</p>
    </div>
    <div class="action" data-testid="customer-request-authoritative-action">
      <strong>Authoritative action</strong>
      <span>${row.primary_action_code_or_null ?? row.no_safe_action_reason_ref_or_null}</span>
    </div>
  `;
  rows.append(article);
}
