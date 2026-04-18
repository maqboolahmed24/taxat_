const DEFAULT_FIXTURE = "./data/sample_run.json";
const DEFAULT_PAGE = "step-ledger";

const state = {
  payload: null,
  activeEvidence: null,
  activeStep: null,
  activeApplicationId: null,
  activeAtlasTenantRef: null,
  activeAtlasNodeRef: null,
  activePolicyRailRef: null,
  activePolicyTriggerRef: null,
  activeEmailDomainRef: null,
  activeEmailFocusRef: null,
  activePushChannelRef: null,
  activeMonitoringProjectRef: null,
  activeNotificationTemplateRef: null,
  activeNotificationLifecycleRef: null,
  activeSupportScenarioRef: null,
  activeDocumentExtractionProfileRef: null,
  activeDocumentExtractionEnvironmentRef: null,
  activeUploadSafetyScenarioRef: null,
  activeUploadSafetyEnvironmentRef: null,
  activePortalCheckpointScenarioRef: null,
  activeSecretEnvironmentRef: null,
  activeSecretAliasRef: null,
  activeSecretGrantRef: null,
  activeSecretNodeRef: null,
  activePostgresEnvironmentRef: null,
  activePostgresStoreRef: null,
  activePostgresRoleRef: null,
  activePostgresPolicyRef: null,
  activeStorageEnvironmentRef: null,
  activeStorageBucketRef: null,
  activeStorageLifecycleRef: null,
  activeStorageEventRef: null,
  activeMessagingEnvironmentRef: null,
  activeMessagingFamilyRef: null,
  activeMessagingChannelRef: null,
  activeMessagingPolicyKind: null,
  activeCacheEnvironmentRef: null,
  activeCacheFamilyRef: null,
  activeCacheFocusKind: null,
  activeCacheFocusRef: null,
  activeTelemetryEnvironmentRef: null,
  activeTelemetryFamilyRef: null,
  activeTelemetryFocusRef: null,
  activePage: DEFAULT_PAGE,
  lastTrigger: null,
};

const elements = {
  providerBadge: document.querySelector("#provider-badge"),
  runTitle: document.querySelector("#run-title"),
  runStatus: document.querySelector("#run-status"),
  environmentControl: document.querySelector(".environment-control"),
  environmentSelect: document.querySelector("#environment-select"),
  environmentChipWrap: document.querySelector("#environment-chip-wrap"),
  environmentChip: document.querySelector("#environment-chip"),
  environmentHint: document.querySelector("#environment-hint"),
  runRail: document.querySelector(".run-rail"),
  railEyebrow: document.querySelector("#rail-eyebrow"),
  railTitle: document.querySelector("#rail-title"),
  mainEyebrow: document.querySelector("#main-eyebrow"),
  mainTitle: document.querySelector("#main-title"),
  runList: document.querySelector("#run-list"),
  runSummary: document.querySelector("#run-summary"),
  stepList: document.querySelector("#step-list"),
  drawer: document.querySelector(".evidence-drawer"),
  drawerTitle: document.querySelector("#drawer-title"),
  drawerBody: document.querySelector("#drawer-body"),
  drawerClose: document.querySelector("#drawer-close"),
  viewerError: document.querySelector("#viewer-error"),
  workspaceShell: document.querySelector(".workspace-shell"),
};

function setMotionPreference() {
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const sync = () => {
    document.documentElement.dataset.motion = motionQuery.matches
      ? "reduce"
      : "standard";
  };
  sync();
  motionQuery.addEventListener("change", sync);
}

function readFixturePath() {
  const params = new URLSearchParams(window.location.search);
  return params.get("fixture") || DEFAULT_FIXTURE;
}

function readPageId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("page") || DEFAULT_PAGE;
}

function formatLabel(value) {
  return String(value).replaceAll("_", " ");
}

function formatTitleLabel(value) {
  return String(value)
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function statusTone(status) {
  if (
    status === "SUCCEEDED" ||
    status === "VALID_HEADERS" ||
    status === "BOUND" ||
    status === "ACTIVE_AND_RUNTIME_VERIFIED"
  ) {
    return "success";
  }
  if (
    status === "FAILED" ||
    status === "BLOCKED_BY_POLICY" ||
    status === "danger"
  ) {
    return "danger";
  }
  if (
    status === "MANUAL_CHECKPOINT_REQUIRED" ||
    status === "SKIPPED_AS_ALREADY_PRESENT" ||
    status === "ATTESTED_PENDING_RUNTIME_VERIFICATION" ||
    status === "warning"
  ) {
    return "warning";
  }
  return "neutral";
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function createChip(label, tone = "neutral") {
  const span = document.createElement("span");
  span.className = "chip";
  span.dataset.tone = tone;
  span.textContent = label;
  return span;
}

function createMetadataList(rows) {
  const list = document.createElement("ul");
  list.className = "metadata-list";
  rows.forEach(([label, value]) => {
    const item = document.createElement("li");
    item.innerHTML = `<strong>${label}</strong><span class="monospace">${value}</span>`;
    list.append(item);
  });
  return list;
}

function createCopyButton(label, value) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "copy-button";
  button.textContent = label;
  button.addEventListener("click", async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.append(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      const original = button.textContent;
      button.textContent = "Copied";
      window.setTimeout(() => {
        button.textContent = original;
      }, 1400);
    } catch {
      button.textContent = "Copy failed";
      window.setTimeout(() => {
        button.textContent = label;
      }, 1400);
    }
  });
  return button;
}

function openGenericDrawer(title, rows, blocks, trigger) {
  state.lastTrigger = trigger;
  elements.drawer.dataset.state = "open";
  elements.drawerTitle.textContent = title;
  const drawerGrid = document.createElement("div");
  drawerGrid.className = "drawer-grid";
  drawerGrid.append(createMetadataList(rows), ...blocks);
  elements.drawerBody.replaceChildren(drawerGrid);
  elements.drawerClose.focus();
}

function buildRetryLineage(step, allSteps) {
  const related = [];
  if (step.retryOfStepId) {
    const parent = allSteps.find((candidate) => candidate.stepId === step.retryOfStepId);
    if (parent) {
      related.push(parent);
    }
  }
  related.push(
    ...allSteps.filter((candidate) => candidate.retryOfStepId === step.stepId),
  );
  return related;
}

function openStepDrawer(step, evidence, trigger) {
  state.activeStep = step;
  state.activeEvidence = evidence;

  const blocks = [];
  const timeline = document.createElement("ul");
  timeline.className = "timeline-list";
  step.history.forEach((entry) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <strong>${formatLabel(entry.status)}</strong>
      <span>${entry.reason}</span>
      <span class="meta-note">${formatDate(entry.changedAt)}</span>
    `;
    timeline.append(item);
  });
  blocks.push(timeline);

  if (step.manualCheckpoint) {
    const checkpoint = document.createElement("section");
    checkpoint.className = "checkpoint-card";
    checkpoint.innerHTML = `
      <p class="eyebrow">Manual checkpoint</p>
      <h3>${formatLabel(step.manualCheckpoint.reason)}</h3>
      <p>${step.manualCheckpoint.prompt}</p>
      <p class="meta-note">Re-entry policy: ${formatLabel(step.manualCheckpoint.reentryPolicy)}</p>
    `;
    blocks.push(checkpoint);
  }

  if (evidence?.redactionNotes?.length) {
    const redactions = document.createElement("ul");
    redactions.className = "redaction-list";
    evidence.redactionNotes.forEach((note) => {
      const item = document.createElement("li");
      item.innerHTML = `
        <strong>${note.ruleId}</strong>
        <span>${note.category} x ${note.matchCount}</span>
      `;
      redactions.append(item);
    });
    blocks.push(redactions);
  }

  const lineage = buildRetryLineage(step, state.payload.steps);
  if (lineage.length) {
    const retryList = document.createElement("ul");
    retryList.className = "retry-list";
    lineage.forEach((entry) => {
      const item = document.createElement("li");
      item.innerHTML = `
        <strong>${entry.stepId}</strong>
        <span>${entry.title}</span>
        <span class="status-chip" data-status="${entry.status}">${formatLabel(entry.status)}</span>
      `;
      retryList.append(item);
    });
    blocks.push(retryList);
  }

  openGenericDrawer(
    evidence
      ? `${formatLabel(evidence.kind)} for ${step.stepId}`
      : `Checkpoint details for ${step.stepId}`,
    [
      ["Step ID", step.stepId],
      ["Status", formatLabel(step.status)],
      ["Recorded", evidence ? formatDate(evidence.recordedAt) : formatDate(step.changedAt)],
      ["Capture mode", evidence ? evidence.captureMode : step.manualCheckpoint?.capturePolicy ?? "n/a"],
      ["Relative path", evidence?.relativePath ?? "Suppressed or not captured"],
    ],
    blocks,
    trigger,
  );
}

function emptyDrawerMarkup() {
  if (state.activePage === "credential-lineage-ledger") {
    return `
      <p class="empty-state">
        Select a lineage node, attestation, or evidence row to inspect masked capture details,
        vault receipts, and manual-checkpoint lineage.
      </p>
    `;
  }
  if (state.activePage === "idp-topology-atlas") {
    return `
      <p class="empty-state">
        Select a client family or tenant node to inspect callback sets, origin bindings,
        bundle identifiers, and vault-safe secret posture.
      </p>
    `;
  }
  if (state.activePage === "access-stepup-matrix") {
    return `
      <p class="empty-state">
        Select a role, scope, session profile, or action-family row to inspect exact source refs,
        affected surfaces, and the explicit boundary between IdP posture and Taxat authorization truth.
      </p>
    `;
  }
  if (state.activePage === "email-domain-readiness-board") {
    return `
      <p class="empty-state">
        Select a sender domain, DNS record, stream, or workspace row to inspect exact readiness,
        ownership, and the explicit boundary between delivery transport and workflow truth.
      </p>
    `;
  }
  if (state.activePage === "notification-copy-atlas") {
    return `
      <p class="empty-state">
        Select a notification family or lifecycle stage to inspect webhook posture,
        delivery-event mapping, and privacy-minimizing telemetry defaults.
      </p>
    `;
  }
  if (state.activePage === "device-messaging-topology-board") {
    return `
      <p class="empty-state">
        Select a delivery channel to inspect key lineage, bundle bindings, and
        exact same-object notification-open continuity targets.
      </p>
    `;
  }
  if (state.activePage === "signal-governance-board") {
    return `
      <p class="empty-state">
        Select a monitoring project to inspect scrub posture, alert bindings,
        release tracks, and vault-safe token lineage.
      </p>
    `;
  }
  if (state.activePage === "support-context-mapping-board") {
    return `
      <p class="empty-state">
        Select a help scenario to inspect exact portal context, external-field mapping,
        privacy notes, and webhook posture without promoting the helpdesk to product truth.
      </p>
    `;
  }
  if (state.activePage === "document-extraction-governance-board") {
    return `
      <p class="empty-state">
        Select a document profile to inspect source bounds, threshold policy,
        processor pinning, and the candidate-fact boundary.
      </p>
    `;
  }
  if (state.activePage === "upload-intake-safety-board") {
    return `
      <p class="empty-state">
        Select an intake scenario to inspect coverage bounds, scan-result mapping,
        quarantine lifecycle, and release evidence in one place.
      </p>
    `;
  }
  if (state.activePage === "portal-checkpoint-atlas") {
    return `
      <p class="empty-state">
        Select a checkpoint family to inspect sanitized evidence posture,
        explicit resume preconditions, and fail-closed pause-and-resume rules.
      </p>
    `;
  }
  if (state.activePage === "secret-root-topology-ledger") {
    return `
      <p class="empty-state">
        Select an alias family, hierarchy node, or access grant to inspect
        lineage posture, environment partitions, and the exact least-privilege boundary.
      </p>
    `;
  }
  if (state.activePage === "control-and-audit-store-ledger") {
    return `
      <p class="empty-state">
        Select a store, role, or restore policy to inspect the exact truth boundary,
        append-only posture, and PITR gate set for the selected environment.
      </p>
    `;
  }
  if (state.activePage === "storage-bucket-topology-board") {
    return `
      <p class="empty-state">
        Select a bucket, lifecycle rule, or event route to inspect immutable refs,
        gateway access posture, lifecycle law, and quarantine boundaries together.
      </p>
    `;
  }
  if (state.activePage === "message-fabric-atlas") {
    return `
      <p class="empty-state">
        Select a channel family, fabric row, or policy rail to inspect durable outboxes,
        broker posture, authenticated inbox law, and rebuild guarantees together.
      </p>
    `;
  }
  if (state.activePage === "resume-isolation-atlas") {
    return `
      <p class="empty-state">
        Select a surface family, invalidation trigger, or boundary row to inspect
        partition identity, resume law, and local-versus-shared cache posture together.
      </p>
    `;
  }
  if (state.activePage === "telemetry-signal-atlas") {
    return `
      <p class="empty-state">
        Select a signal family or atlas row to inspect sampling posture,
        retention class, correlation keys, and the telemetry-to-audit boundary together.
      </p>
    `;
  }
  return `
    <p class="empty-state">
      Select a step evidence record or checkpoint summary to inspect
      redaction notes, retry lineage, and artifact metadata.
    </p>
  `;
}

function closeDrawer() {
  if (
    state.activePage === "idp-topology-atlas" ||
    state.activePage === "access-stepup-matrix" ||
    state.activePage === "email-domain-readiness-board" ||
    state.activePage === "notification-copy-atlas" ||
    state.activePage === "device-messaging-topology-board" ||
    state.activePage === "signal-governance-board" ||
    state.activePage === "support-context-mapping-board" ||
    state.activePage === "document-extraction-governance-board" ||
    state.activePage === "upload-intake-safety-board" ||
    state.activePage === "portal-checkpoint-atlas" ||
    state.activePage === "secret-root-topology-ledger" ||
    state.activePage === "control-and-audit-store-ledger" ||
    state.activePage === "storage-bucket-topology-board" ||
    state.activePage === "message-fabric-atlas" ||
    state.activePage === "resume-isolation-atlas" ||
    state.activePage === "telemetry-signal-atlas"
  ) {
    return;
  }
  elements.drawerClose.hidden = false;
  elements.drawer.dataset.state = "empty";
  elements.drawerTitle.textContent = "No evidence selected";
  elements.drawerBody.innerHTML = emptyDrawerMarkup();
  if (state.lastTrigger instanceof HTMLElement) {
    state.lastTrigger.focus();
  }
}

function renderDefaultTopBar(payload) {
  const { run, environmentOptions } = payload;
  elements.providerBadge.textContent = run.providerMonogram;
  elements.runTitle.textContent = `${run.providerDisplayName} run ${run.runId}`;
  elements.runStatus.textContent = formatLabel(run.status);
  elements.runStatus.dataset.status = run.status;
  elements.environmentControl.hidden = false;
  elements.environmentChipWrap.hidden = true;
  elements.environmentSelect.replaceChildren(
    ...environmentOptions.map((entry) => {
      const option = document.createElement("option");
      option.value = entry.value;
      option.textContent = entry.label;
      option.selected = entry.value === run.productEnvironmentId;
      return option;
    }),
  );
  elements.environmentSelect.disabled = false;
  elements.environmentHint.textContent =
    "Live-provider flows remain gated outside default CI.";
  document.title = `Provisioning Viewer - ${run.providerDisplayName}`;
}

function renderRunRail(payload) {
  elements.runRail.setAttribute("aria-label", "Run history");
  elements.runList.className = "run-list";
  elements.railEyebrow.textContent = "Run rail";
  elements.railTitle.textContent = "Execution lineage";
  elements.mainEyebrow.textContent = "Chronological ledger";
  elements.mainTitle.textContent = "Step history";

  elements.runList.replaceChildren(
    ...payload.runs.map((runEntry) => {
      const listItem = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute(
        "aria-current",
        runEntry.runId === payload.run.runId ? "true" : "false",
      );
      button.innerHTML = `
        <div class="run-list__title">
          <strong class="monospace">${runEntry.runId}</strong>
          <span class="status-chip" data-status="${runEntry.status}">${formatLabel(runEntry.status)}</span>
        </div>
        <div class="run-list__meta">
          <span>${runEntry.label}</span>
          <span class="meta-note">${formatDate(runEntry.updatedAt)}</span>
        </div>
      `;
      button.addEventListener("click", () => {
        window.alert(
          "This viewer is intentionally static for artifact review. Switch runs by opening a different fixture.",
        );
      });
      listItem.append(button);
      return listItem;
    }),
  );
}

function renderFraudPreventionSummary(fraudPrevention) {
  const section = document.createElement("section");
  section.className = "run-summary";
  section.innerHTML = `
    <div class="panel-heading">
      <p class="eyebrow">Sandbox validator</p>
      <h3>Fraud-header posture</h3>
    </div>
    <p class="meta-note">Execution mode: ${formatLabel(fraudPrevention.executionMode)}</p>
  `;

  const summaryGrid = document.createElement("div");
  summaryGrid.className = "summary-grid";
  fraudPrevention.profiles.forEach((profile) => {
    const article = document.createElement("article");
    article.className = "summary-card";
    article.innerHTML = `
      <strong>${formatLabel(profile.connectionMethod)}</strong>
      <span class="monospace">${profile.profileRef}</span>
    `;
    const chipRow = document.createElement("div");
    chipRow.className = "chip-row";
    chipRow.append(
      createChip(formatLabel(profile.status), statusTone(profile.status)),
      createChip(formatLabel(profile.scope), "neutral"),
      createChip(`${profile.warnings} warnings`, profile.warnings ? "warning" : "success"),
      createChip(`${profile.errors} errors`, profile.errors ? "danger" : "success"),
    );
    article.append(chipRow);
    summaryGrid.append(article);
  });

  const notes = document.createElement("ul");
  notes.className = "note-list";
  fraudPrevention.notes.forEach((note) => {
    const item = document.createElement("li");
    item.textContent = note;
    notes.append(item);
  });

  section.append(summaryGrid, notes);
  return section;
}

function renderRunSummary(payload) {
  const { run } = payload;
  const cards = [
    ["Operator", run.operatorIdentityAlias],
    ["Workspace", run.workspaceId],
    ["Provider env", run.providerEnvironment],
    ["Evidence root", run.evidenceRoot],
    ["Started", formatDate(run.startedAt)],
    ["Updated", formatDate(run.updatedAt)],
  ].map(([label, value]) => {
    const article = document.createElement("article");
    article.className = "summary-card";
    article.innerHTML = `<strong>${label}</strong><span class="monospace">${value}</span>`;
    return article;
  });

  const notes = document.createElement("ul");
  notes.className = "note-list";
  payload.run.notes.forEach((note) => {
    const item = document.createElement("li");
    item.textContent = note;
    notes.append(item);
  });

  elements.runSummary.innerHTML = `
    <div class="panel-heading">
      <p class="eyebrow">Run posture</p>
      <h2>${payload.run.providerDisplayName}</h2>
    </div>
  `;
  const summaryGrid = document.createElement("div");
  summaryGrid.className = "summary-grid";
  summaryGrid.append(...cards);
  elements.runSummary.append(summaryGrid, notes);

  if (payload.fraudPrevention?.profiles?.length) {
    elements.runSummary.append(renderFraudPreventionSummary(payload.fraudPrevention));
  }
}

function createPolicyBlock(reason) {
  const block = document.createElement("div");
  block.innerHTML = `
    <strong class="meta-label">Policy block</strong>
    <p>${reason}</p>
  `;
  return block;
}

function createStepCard(step) {
  const article = document.createElement("article");
  article.className = "step-card";

  const selectorChips = step.selectorRefs
    .map((selectorId) => `<span class="selector-chip">${selectorId}</span>`)
    .join("");

  article.innerHTML = `
    <div class="step-card__header">
      <div>
        <p class="eyebrow monospace">${step.stepId}</p>
        <h3>${step.title}</h3>
      </div>
      <span class="status-chip" data-status="${step.status}">${formatLabel(step.status)}</span>
    </div>
    <p class="step-card__summary">${step.summary}</p>
    <div class="step-meta">
      <div>
        <strong class="meta-label">Last change</strong>
        <p>${formatDate(step.changedAt)}</p>
      </div>
      <div>
        <strong class="meta-label">Attempts</strong>
        <p class="monospace">${step.attempts}</p>
      </div>
      <div>
        <strong class="meta-label">Retry of</strong>
        <p class="monospace">${step.retryOfStepId ?? "n/a"}</p>
      </div>
    </div>
    <div class="step-card__footer">
      <div class="selector-chip-row">${selectorChips}</div>
      <div class="action-row"></div>
    </div>
  `;

  const actionRow = article.querySelector(".action-row");
  step.evidence.forEach((evidence) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "subtle-button";
    button.textContent = `View ${formatLabel(evidence.kind).toLowerCase()}`;
    button.addEventListener("click", () => openStepDrawer(step, evidence, button));
    actionRow.append(button);
  });

  if (step.manualCheckpoint) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "action-button";
    button.textContent = "Inspect checkpoint";
    button.addEventListener("click", () => openStepDrawer(step, null, button));
    actionRow.append(button);
  }

  if (step.policyBlockReason) {
    article.querySelector(".step-meta").append(
      createPolicyBlock(step.policyBlockReason),
    );
  }

  return article;
}

function renderSteps(payload) {
  elements.stepList.className = "step-list";
  elements.stepList.replaceChildren(
    ...payload.steps.map((step) => createStepCard(step)),
  );
}

function resolveActiveApplication(ledger) {
  if (!state.activeApplicationId) {
    state.activeApplicationId =
      ledger.selectedApplicationId ?? ledger.applications[0]?.applicationId ?? null;
  }
  return (
    ledger.applications.find(
      (application) => application.applicationId === state.activeApplicationId,
    ) ?? ledger.applications[0]
  );
}

function renderCredentialTopBar(ledger, application) {
  elements.providerBadge.textContent = ledger.providerMonogram;
  elements.runTitle.textContent = `${ledger.providerDisplayName} credential lineage`;
  elements.runStatus.textContent = formatLabel(application.posture);
  elements.runStatus.dataset.status = application.posture;
  elements.environmentControl.hidden = true;
  elements.environmentChipWrap.hidden = false;
  elements.environmentChip.textContent = application.providerEnvironment.toUpperCase();
  elements.environmentChip.dataset.status = "RUNNING";
  elements.environmentHint.textContent =
    "Safe copies expose aliases, fingerprints, vault refs, and attestation refs only.";
  document.title = `Provisioning Viewer - ${application.applicationDisplayName}`;
}

function renderApplicationRail(ledger, activeApplication) {
  elements.runRail.setAttribute("aria-label", "Application partitions");
  elements.runList.className = "application-list";
  elements.railEyebrow.textContent = "Application rail";
  elements.railTitle.textContent = "Environment partitions";
  elements.mainEyebrow.textContent = "Credential ledger";
  elements.mainTitle.textContent = activeApplication.applicationDisplayName;

  elements.runList.replaceChildren(
    ...ledger.applications.map((application) => {
      const listItem = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute(
        "aria-current",
        application.applicationId === activeApplication.applicationId ? "true" : "false",
      );
      button.innerHTML = `
        <div class="application-list__title">
          <strong>${application.applicationDisplayName}</strong>
          <span class="status-chip" data-status="${application.posture}">${formatLabel(application.posture)}</span>
        </div>
        <div class="application-list__meta">
          <span class="meta-note">${application.providerEnvironment.toUpperCase()}</span>
          <span class="monospace">${application.applicationAlias}</span>
        </div>
      `;
      button.addEventListener("click", () => {
        state.activeApplicationId = application.applicationId;
        renderCredentialPage(ledger);
      });
      listItem.append(button);
      return listItem;
    }),
  );
}

function createFieldRow(label, value, options = {}) {
  const article = document.createElement("article");
  article.className = "field-row";

  const labelElement = document.createElement("strong");
  labelElement.className = "meta-label";
  labelElement.textContent = label;

  const valueWrap = document.createElement("div");
  valueWrap.className = "field-row__value";
  const valueElement = document.createElement("span");
  valueElement.textContent = value;
  if (options.monospace) {
    valueElement.className = "monospace";
  }
  valueWrap.append(valueElement);

  if (options.copyValue) {
    valueWrap.append(createCopyButton(options.copyLabel || "Copy", options.copyValue));
  }

  article.append(labelElement, valueWrap);

  if (options.note) {
    const note = document.createElement("p");
    note.className = "ledger-note";
    note.textContent = options.note;
    article.append(note);
  }

  if (options.chips?.length) {
    const chipRow = document.createElement("div");
    chipRow.className = "chip-row";
    options.chips.forEach((chip) => chipRow.append(chip));
    article.append(chipRow);
  }

  return article;
}

function openCredentialEvidenceDrawer(application, evidence, trigger) {
  const blocks = [];

  const summary = document.createElement("section");
  summary.className = "checkpoint-card";
  summary.innerHTML = `
    <p class="eyebrow">Evidence summary</p>
    <h3>${evidence.title}</h3>
    <p>${evidence.summary}</p>
  `;
  if (evidence.copyValue) {
    const copyWrap = document.createElement("div");
    copyWrap.className = "drawer-copy";
    copyWrap.append(createCopyButton("Copy safe ref", evidence.copyValue));
    summary.append(copyWrap);
  }
  blocks.push(summary);

  openGenericDrawer(
    `${evidence.kind.replaceAll("_", " ")} for ${application.applicationAlias}`,
    [
      ["Application", application.applicationDisplayName],
      ["Kind", formatLabel(evidence.kind)],
      ["Relative path", evidence.relativePath ?? "Inline metadata only"],
      ["Copy-safe ref", evidence.copyValue ?? "Not available"],
    ],
    blocks,
    trigger,
  );
}

function openCredentialAttestationDrawer(application, attestation, trigger) {
  const blocks = [];
  const summary = document.createElement("section");
  summary.className = "checkpoint-card";
  summary.innerHTML = `
    <p class="eyebrow">Attestation</p>
    <h3>${attestation.label}</h3>
    <p>${attestation.summary}</p>
  `;
  const copyWrap = document.createElement("div");
  copyWrap.className = "drawer-copy";
  copyWrap.append(createCopyButton("Copy attestation ref", attestation.attestationRef));
  summary.append(copyWrap);
  blocks.push(summary);

  openGenericDrawer(
    `Attestation for ${application.applicationAlias}`,
    [
      ["Application", application.applicationDisplayName],
      ["State", formatLabel(attestation.state)],
      ["Attestation ref", attestation.attestationRef],
      ["Client ID alias", application.clientIdAlias],
    ],
    blocks,
    trigger,
  );
}

function openCredentialVersionDrawer(application, version, trigger) {
  const blocks = [];
  const summary = document.createElement("section");
  summary.className = "checkpoint-card";
  summary.innerHTML = `
    <p class="eyebrow">Secret version</p>
    <h3>${version.secretVersionId}</h3>
    <p>Fingerprint and receipt metadata only. Raw HMRC secret material remains outside repo-tracked artifacts.</p>
  `;
  const copyWrap = document.createElement("div");
  copyWrap.className = "drawer-copy";
  copyWrap.append(
    createCopyButton("Copy receipt ref", version.vaultWriteReceiptRef),
    createCopyButton("Copy fingerprint", version.fingerprint),
  );
  summary.append(copyWrap);
  blocks.push(summary);

  openGenericDrawer(
    `Secret lineage for ${application.applicationAlias}`,
    [
      ["Version ID", version.secretVersionId],
      ["State", formatLabel(version.state)],
      ["Issued", formatDate(version.issuedAt)],
      ["Vault receipt", version.vaultWriteReceiptRef],
    ],
    blocks,
    trigger,
  );
}

function renderCredentialSummary(application) {
  elements.runSummary.innerHTML = "";
  const container = document.createElement("div");
  container.className = "credential-summary";
  container.innerHTML = `
    <div class="credential-summary__lead">
      <div>
        <p class="eyebrow">Application identity</p>
        <h2>${application.applicationDisplayName}</h2>
        <p class="ledger-note">This route records machine-usable aliases, bindings, and attestation lineage for the current HMRC sandbox credential set.</p>
      </div>
      <div class="chip-row"></div>
    </div>
  `;
  const chipRow = container.querySelector(".chip-row");
  chipRow.append(
    createChip(application.providerEnvironment.toUpperCase(), "neutral"),
    createChip(formatLabel(application.posture), statusTone(application.posture)),
    createChip(application.applicationAlias, "neutral"),
  );
  elements.runSummary.append(container);
}

function renderIdentifiersSection(application) {
  const section = document.createElement("section");
  section.className = "ledger-section";
  section.innerHTML = `
    <p class="eyebrow">Identifiers</p>
    <h3>Identifiers</h3>
    <p class="ledger-note">Portal and vault-safe identity anchors.</p>
  `;

  const list = document.createElement("div");
  list.className = "field-list";
  list.append(
    createFieldRow("Application alias", application.applicationAlias, {
      monospace: true,
      copyValue: application.applicationAlias,
      copyLabel: "Copy alias",
    }),
    createFieldRow("HMRC application alias", application.hmrcApplicationIdAlias, {
      monospace: true,
      copyValue: application.hmrcApplicationIdAlias,
      copyLabel: "Copy HMRC alias",
    }),
    createFieldRow("Client ID alias", application.clientIdAlias, {
      monospace: true,
      copyValue: application.clientIdAlias,
      copyLabel: "Copy client alias",
    }),
    createFieldRow("Client ID fingerprint", application.clientIdFingerprint, {
      monospace: true,
      copyValue: application.clientIdFingerprint,
      copyLabel: "Copy fingerprint",
      note: "Fingerprint only. The raw HMRC client ID never appears in this viewer.",
    }),
  );

  application.vaultRefs.forEach((vaultRef, index) => {
    list.append(
      createFieldRow(`Vault ref ${index + 1}`, vaultRef, {
        monospace: true,
        copyValue: vaultRef,
        copyLabel: "Copy vault ref",
      }),
    );
  });

  section.append(list);
  return section;
}

function renderBindingsSection(application) {
  const section = document.createElement("section");
  section.className = "ledger-section";
  section.innerHTML = `
    <p class="eyebrow">Bindings</p>
    <h3>Bindings</h3>
    <p class="ledger-note">Callback, scope, fraud, and token posture.</p>
  `;

  const list = document.createElement("div");
  list.className = "binding-list";
  application.bindings.forEach((binding) => {
    const card = document.createElement("article");
    card.className = "binding-card";
    card.innerHTML = `
      <div class="binding-card__meta">
        <span class="status-chip" data-status="RUNNING">${formatLabel(binding.connectionMethod)}</span>
        <span class="chip" data-tone="neutral">${binding.environmentRef}</span>
      </div>
      <div class="binding-card__grid">
        <div>
          <strong>Callback profile</strong>
          <span class="monospace">${binding.callbackProfileRef}</span>
        </div>
        <div>
          <strong>Scope set</strong>
          <span class="monospace">${binding.scopeSetRef}</span>
        </div>
        <div>
          <strong>Fraud profile</strong>
          <span class="monospace">${binding.fraudHeaderProfileRef}</span>
        </div>
        <div>
          <strong>Token binding</strong>
          <span class="monospace">${binding.tokenBindingProfileRef}</span>
        </div>
      </div>
    `;
    const scopes = document.createElement("div");
    scopes.className = "chip-row";
    binding.scopes.forEach((scope) => {
      scopes.append(createChip(scope, "neutral"));
    });
    card.append(scopes);
    list.append(card);
  });

  section.append(list);
  return section;
}

function renderSecretLineageSection(application) {
  const section = document.createElement("section");
  section.className = "ledger-section";
  section.innerHTML = `
    <p class="eyebrow">Secret lineage</p>
    <h3>Secret lineage</h3>
    <p class="ledger-note">Version succession and supersession strip.</p>
  `;

  const strip = document.createElement("div");
  strip.className = "lineage-strip";
  const track = document.createElement("div");
  track.className = "lineage-strip__track";

  application.secretLineage.forEach((version) => {
    const node = document.createElement("article");
    node.className = "lineage-node";
    node.dataset.state = version.state;
    node.innerHTML = `
      <strong>${version.secretVersionId}</strong>
      <span class="status-chip" data-status="${version.state}">${formatLabel(version.state)}</span>
      <span class="monospace">${version.fingerprint}</span>
      <span class="meta-note">Issued ${formatDate(version.issuedAt)}</span>
      <span class="meta-note">${version.supersededBy ? `Superseded by ${version.supersededBy}` : "Current active lineage node"}</span>
    `;
    const actionRow = document.createElement("div");
    actionRow.className = "field-row__actions";
    const inspect = document.createElement("button");
    inspect.type = "button";
    inspect.className = "subtle-button";
    inspect.textContent = "Inspect lineage";
    inspect.addEventListener("click", () =>
      openCredentialVersionDrawer(application, version, inspect),
    );
    actionRow.append(inspect);
    node.append(actionRow);
    track.append(node);
  });

  strip.append(track);
  section.append(strip);
  return section;
}

function renderAttestationSection(application) {
  const section = document.createElement("section");
  section.className = "ledger-section";
  section.innerHTML = `
    <p class="eyebrow">Attestation</p>
    <h3>Attestation</h3>
    <p class="ledger-note">Evidence, receipts, and manual-checkpoint lineage.</p>
  `;

  const attestationList = document.createElement("div");
  attestationList.className = "attestation-list";
  application.attestations.forEach((attestation) => {
    const card = document.createElement("article");
    card.className = "attestation-card";
    card.innerHTML = `
      <div class="attestation-card__meta">
        <span class="status-chip" data-status="${attestation.state}">${formatLabel(attestation.state)}</span>
        <span class="monospace">${attestation.attestationRef}</span>
      </div>
      <p><strong>${attestation.label}</strong></p>
      <p class="ledger-note">${attestation.summary}</p>
    `;
    const actions = document.createElement("div");
    actions.className = "attestation-card__actions";
    const inspect = document.createElement("button");
    inspect.type = "button";
    inspect.className = "subtle-button";
    inspect.textContent = "Inspect attestation";
    inspect.addEventListener("click", () =>
      openCredentialAttestationDrawer(application, attestation, inspect),
    );
    actions.append(
      inspect,
      createCopyButton("Copy attestation ref", attestation.attestationRef),
    );
    card.append(actions);
    attestationList.append(card);
  });

  const evidenceList = document.createElement("div");
  evidenceList.className = "evidence-list";
  application.evidence.forEach((evidence) => {
    const card = document.createElement("article");
    card.className = "evidence-card";
    card.innerHTML = `
      <div class="evidence-card__meta">
        <span class="status-chip" data-status="RUNNING">${formatLabel(evidence.kind)}</span>
        <span class="monospace">${evidence.evidenceId}</span>
      </div>
      <p><strong>${evidence.title}</strong></p>
      <p class="ledger-note">${evidence.summary}</p>
    `;
    const actions = document.createElement("div");
    actions.className = "evidence-card__actions";
    const inspect = document.createElement("button");
    inspect.type = "button";
    inspect.className = "subtle-button";
    inspect.textContent = "Inspect evidence";
    inspect.addEventListener("click", () =>
      openCredentialEvidenceDrawer(application, evidence, inspect),
    );
    actions.append(inspect);
    if (evidence.copyValue) {
      actions.append(createCopyButton("Copy safe ref", evidence.copyValue));
    }
    card.append(actions);
    evidenceList.append(card);
  });

  section.append(attestationList, evidenceList);
  return section;
}

function renderCredentialPage(ledger) {
  const activeApplication = resolveActiveApplication(ledger);
  renderCredentialTopBar(ledger, activeApplication);
  renderApplicationRail(ledger, activeApplication);
  renderCredentialSummary(activeApplication);

  const canvas = document.createElement("div");
  canvas.className = "ledger-canvas";
  canvas.append(
    renderIdentifiersSection(activeApplication),
    renderBindingsSection(activeApplication),
    renderSecretLineageSection(activeApplication),
    renderAttestationSection(activeApplication),
  );

  elements.stepList.className = "ledger-canvas";
  elements.stepList.replaceChildren(canvas);
}

function resolveActiveAtlasTenant(atlas) {
  const tenants = atlas.tenantRecord?.tenant_records ?? [];
  if (!tenants.length) {
    return null;
  }
  if (!state.activeAtlasTenantRef) {
    state.activeAtlasTenantRef =
      atlas.selectedTenantRef ??
      tenants.find((tenant) => tenant.provider_environment_tag === "Staging")?.tenant_ref ??
      tenants[0].tenant_ref;
  }
  return (
    tenants.find((tenant) => tenant.tenant_ref === state.activeAtlasTenantRef) ??
    tenants[0]
  );
}

function atlasNodesForTenant(atlas, tenant) {
  const interactive =
    atlas.applicationClientCatalog?.application_clients?.filter(
      (client) => client.tenant_ref === tenant.tenant_ref,
    ) ?? [];
  const machine =
    atlas.machineClientInventory?.machine_clients?.filter(
      (client) => client.tenant_ref === tenant.tenant_ref,
    ) ?? [];
  return { interactive, machine };
}

function resolveActiveAtlasNode(atlas, tenant) {
  const { interactive, machine } = atlasNodesForTenant(atlas, tenant);
  const nodes = [...interactive, ...machine];
  if (!nodes.length) {
    return null;
  }
  if (!state.activeAtlasNodeRef || !nodes.some((node) => node.client_ref === state.activeAtlasNodeRef)) {
    state.activeAtlasNodeRef =
      atlas.selectedNodeRef ??
      interactive[0]?.client_ref ??
      machine[0]?.client_ref ??
      null;
  }
  return nodes.find((node) => node.client_ref === state.activeAtlasNodeRef) ?? nodes[0];
}

function atlasTenantSummary(atlas, tenant) {
  const { interactive, machine } = atlasNodesForTenant(atlas, tenant);
  const productEnvironments = tenant.product_environment_ids.map(formatLabel).join(", ");
  const article = document.createElement("article");
  article.className = "atlas-tenant-card";
  article.innerHTML = `
    <div class="atlas-tenant-card__head">
      <div>
        <p class="eyebrow">Provider tenant</p>
        <h3>${tenant.tenant_label}</h3>
      </div>
      <div class="chip-row"></div>
    </div>
    <div class="atlas-tenant-card__grid">
      <div>
        <strong>Tenant ref</strong>
        <span class="monospace">${tenant.tenant_ref}</span>
      </div>
      <div>
        <strong>Custom domain</strong>
        <span class="monospace">${tenant.custom_domain ?? "n/a"}</span>
      </div>
      <div>
        <strong>Product environments</strong>
        <span>${productEnvironments}</span>
      </div>
      <div>
        <strong>Secret namespaces</strong>
        <span class="monospace">${tenant.secret_namespace_refs.join(", ")}</span>
      </div>
    </div>
  `;
  const chipRow = article.querySelector(".chip-row");
  chipRow.append(
    createChip(tenant.provider_environment_tag, "neutral"),
    createChip(`${interactive.length} interactive`, "neutral"),
    createChip(`${machine.length} machine`, "neutral"),
  );
  return article;
}

function renderIdpTopBar(atlas, tenant) {
  elements.providerBadge.textContent = atlas.providerMonogram ?? "OIDC";
  elements.runTitle.textContent = `${atlas.providerDisplayName} topology atlas`;
  elements.runStatus.textContent = formatLabel(atlas.selectionPosture);
  elements.runStatus.dataset.status = "RUNNING";
  elements.environmentControl.hidden = false;
  elements.environmentChipWrap.hidden = true;
  elements.environmentSelect.replaceChildren(
    ...(atlas.tenantRecord?.tenant_records ?? []).map((entry) => {
      const option = document.createElement("option");
      option.value = entry.tenant_ref;
      option.textContent = `${entry.provider_environment_tag} - ${entry.tenant_label}`;
      option.selected = entry.tenant_ref === tenant.tenant_ref;
      return option;
    }),
  );
  elements.environmentSelect.disabled = false;
  elements.environmentSelect.onchange = () => {
    state.activeAtlasTenantRef = elements.environmentSelect.value;
    state.activeAtlasNodeRef = null;
    renderIdpAtlasPage(atlas);
  };
  elements.environmentHint.textContent =
    "The atlas shows tenant, client, callback, and vault-safe secret posture only. No raw IdP secret material appears here.";
  document.title = `Provisioning Viewer - ${tenant.tenant_label}`;
}

function renderIdpInventoryRail(atlas, activeTenant) {
  elements.runRail.setAttribute("aria-label", "Environment and client families");
  elements.runList.className = "application-list";
  elements.railEyebrow.textContent = "Tenant rail";
  elements.railTitle.textContent = "Control-plane environments";
  elements.mainEyebrow.textContent = "Topology atlas";
  elements.mainTitle.textContent = activeTenant.tenant_label;

  elements.runList.replaceChildren(
    ...(atlas.tenantRecord?.tenant_records ?? []).map((tenant) => {
      const { interactive, machine } = atlasNodesForTenant(atlas, tenant);
      const listItem = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute(
        "aria-current",
        tenant.tenant_ref === activeTenant.tenant_ref ? "true" : "false",
      );
      button.innerHTML = `
        <div class="application-list__title">
          <strong>${tenant.tenant_label}</strong>
          <span class="status-chip" data-status="RUNNING">${tenant.provider_environment_tag}</span>
        </div>
        <div class="application-list__meta">
          <span class="meta-note">${tenant.product_environment_ids.map(formatLabel).join(", ")}</span>
          <span class="monospace">${interactive.length} interactive / ${machine.length} machine</span>
        </div>
      `;
      button.addEventListener("click", () => {
        state.activeAtlasTenantRef = tenant.tenant_ref;
        state.activeAtlasNodeRef = null;
        renderIdpAtlasPage(atlas);
      });
      listItem.append(button);
      return listItem;
    }),
  );
}

function createAtlasNodeButton(node, kind, active, onSelect) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "atlas-node";
  button.dataset.kind = kind;
  button.dataset.active = active ? "true" : "false";
  button.setAttribute("aria-pressed", active ? "true" : "false");
  button.innerHTML = `
    <div class="atlas-node__header">
      <div>
        <p class="eyebrow">${formatLabel(kind)}</p>
        <h3>${node.client_display_name}</h3>
      </div>
      <span class="status-chip" data-status="RUNNING">${formatLabel(node.source_disposition)}</span>
    </div>
    <div class="atlas-node__meta">
      <span class="monospace">${node.client_ref}</span>
      <span>${formatLabel(node.application_type)}</span>
    </div>
  `;
  button.addEventListener("click", () => onSelect(node.client_ref, button));
  return button;
}

function renderIdpAtlasSummary(atlas, tenant, activeNode) {
  elements.runSummary.innerHTML = "";
  const container = document.createElement("div");
  container.className = "atlas-summary";
  container.innerHTML = `
    <div class="atlas-summary__lead">
      <div>
        <p class="eyebrow">Control-plane posture</p>
        <h2>${tenant.tenant_label}</h2>
        <p class="ledger-note">${atlas.summary}</p>
      </div>
      <div class="chip-row"></div>
    </div>
  `;
  const chipRow = container.querySelector(".chip-row");
  chipRow.append(
    createChip(formatLabel(atlas.selectionPosture), "neutral"),
    createChip(`Policy ${atlas.policyVersion}`, "neutral"),
    createChip(activeNode ? formatLabel(activeNode.surface_family ?? activeNode.machine_client_family) : "Tenant", "success"),
  );
  const notes = document.createElement("ul");
  notes.className = "note-list";
  (atlas.notes ?? []).forEach((note) => {
    const item = document.createElement("li");
    item.textContent = note;
    notes.append(item);
  });
  elements.runSummary.append(container, notes);
}

function renderAtlasLane(title, eyebrow, content, modifier = "") {
  const section = document.createElement("section");
  section.className = `atlas-lane ${modifier}`.trim();
  section.innerHTML = `
    <div class="panel-heading">
      <p class="eyebrow">${eyebrow}</p>
      <h3>${title}</h3>
    </div>
  `;
  section.append(content);
  return section;
}

function renderIdpCanvas(atlas, tenant, activeNode) {
  const { interactive, machine } = atlasNodesForTenant(atlas, tenant);
  const matrixRows =
    atlas.callbackOriginMatrix?.rows?.filter(
      (row) =>
        row.registration_decision === "CONFIGURE_NOW" &&
        interactive.some((client) => client.client_ref === row.client_ref),
    ) ?? [];

  const tenantWrap = document.createElement("div");
  tenantWrap.className = "atlas-lane__grid atlas-lane__grid--single";
  tenantWrap.append(atlasTenantSummary(atlas, tenant));

  const interactiveWrap = document.createElement("div");
  interactiveWrap.className = "atlas-lane__grid";
  interactive.forEach((client) => {
    interactiveWrap.append(
      createAtlasNodeButton(
        client,
        client.surface_family,
        activeNode?.client_ref === client.client_ref,
        (clientRef) => {
          state.activeAtlasNodeRef = clientRef;
          renderIdpAtlasPage(atlas);
        },
      ),
    );
  });

  const bindingsWrap = document.createElement("div");
  bindingsWrap.className = "atlas-binding-list";
  matrixRows.forEach((row) => {
    const card = document.createElement("article");
    card.className = "atlas-binding-card";
    card.innerHTML = `
      <div class="atlas-binding-card__meta">
        <span class="status-chip" data-status="RUNNING">${formatLabel(row.surface_family)}</span>
        <span class="monospace">${row.callback_profile_ref}</span>
      </div>
      <p><strong>${row.callback_urls[0] ?? "n/a"}</strong></p>
      <p class="ledger-note">${row.allowed_web_origins.length ? row.allowed_web_origins.join(", ") : "No web origins required for this client."}</p>
    `;
    bindingsWrap.append(card);
  });

  const machineWrap = document.createElement("div");
  machineWrap.className = "atlas-machine-lane";
  machine.forEach((client) => {
    machineWrap.append(
      createAtlasNodeButton(
        client,
        client.machine_client_family,
        activeNode?.client_ref === client.client_ref,
        (clientRef) => {
          state.activeAtlasNodeRef = clientRef;
          renderIdpAtlasPage(atlas);
        },
      ),
    );
  });

  const canvas = document.createElement("div");
  canvas.className = "atlas-canvas";
  canvas.append(
    renderAtlasLane("Provider tenant", "Control plane", tenantWrap, "atlas-lane--tenant"),
    renderAtlasLane("Interactive clients", "Application tier", interactiveWrap),
    renderAtlasLane("Callback and origin bindings", "Deployable bindings", bindingsWrap),
    renderAtlasLane("Machine clients", "Machine tier", machineWrap, "atlas-lane--machine"),
  );
  return canvas;
}

function renderIdpInspector(atlas, tenant, activeNode) {
  elements.drawer.dataset.state = "open";
  elements.drawerClose.hidden = true;
  elements.drawerTitle.textContent = activeNode
    ? activeNode.client_display_name
    : tenant.tenant_label;

  const container = document.createElement("div");
  container.className = "atlas-inspector";

  const identity = document.createElement("div");
  identity.className = "field-list";
  identity.append(
    createFieldRow("Tenant", tenant.tenant_label, {
      monospace: false,
      chips: [createChip(tenant.provider_environment_tag, "neutral")],
    }),
  );

  if (activeNode) {
    const kindLabel = activeNode.surface_family ?? activeNode.machine_client_family;
    identity.append(
      createFieldRow("Client ref", activeNode.client_ref, {
        monospace: true,
        copyValue: activeNode.client_ref,
        copyLabel: "Copy ref",
      }),
      createFieldRow("Client alias", activeNode.client_id_alias, {
        monospace: true,
        copyValue: activeNode.client_id_alias,
        copyLabel: "Copy alias",
      }),
      createFieldRow("Family", formatLabel(kindLabel), {
        chips: [createChip(formatLabel(activeNode.application_type), "neutral")],
      }),
      createFieldRow("Client ID fingerprint", activeNode.client_id_fingerprint, {
        monospace: true,
        copyValue: activeNode.client_id_fingerprint,
        copyLabel: "Copy fingerprint",
      }),
    );

    if (activeNode.callback_urls?.length) {
      activeNode.callback_urls.forEach((value, index) => {
        identity.append(
          createFieldRow(`Callback ${index + 1}`, value, {
            monospace: true,
          }),
        );
      });
    }
    if (activeNode.logout_urls?.length) {
      activeNode.logout_urls.forEach((value, index) => {
        identity.append(
          createFieldRow(`Logout ${index + 1}`, value, {
            monospace: true,
          }),
        );
      });
    }
    if (activeNode.allowed_web_origins?.length) {
      activeNode.allowed_web_origins.forEach((value, index) => {
        identity.append(
          createFieldRow(`Allowed origin ${index + 1}`, value, {
            monospace: true,
          }),
        );
      });
    }
    if (activeNode.bundle_identifier) {
      identity.append(
        createFieldRow("Bundle identifier", activeNode.bundle_identifier, {
          monospace: true,
        }),
      );
    }
    if (activeNode.secret_posture) {
      identity.append(
        createFieldRow("Secret posture", formatLabel(activeNode.secret_posture.capture_posture), {
          chips: [
            createChip(
              activeNode.secret_posture.requires_vault_secret
                ? "Vault required"
                : "Public client",
              activeNode.secret_posture.requires_vault_secret ? "warning" : "success",
            ),
          ],
        }),
      );
      if (activeNode.secret_posture.client_secret_store_ref) {
        identity.append(
          createFieldRow(
            "Client secret store ref",
            activeNode.secret_posture.client_secret_store_ref,
            {
              monospace: true,
              copyValue: activeNode.secret_posture.client_secret_store_ref,
              copyLabel: "Copy safe ref",
            },
          ),
        );
      }
      if (activeNode.secret_posture.client_secret_metadata_ref) {
        identity.append(
          createFieldRow(
            "Secret metadata ref",
            activeNode.secret_posture.client_secret_metadata_ref,
            {
              monospace: true,
              copyValue: activeNode.secret_posture.client_secret_metadata_ref,
              copyLabel: "Copy safe ref",
            },
          ),
        );
      }
    }
  } else {
    identity.append(
      createFieldRow("Custom domain", tenant.custom_domain ?? "n/a", {
        monospace: true,
      }),
      createFieldRow(
        "Secret namespaces",
        tenant.secret_namespace_refs.join(", "),
        { monospace: true },
      ),
    );
  }

  const notes = document.createElement("ul");
  notes.className = "note-list";
  (activeNode?.notes ?? tenant.notes ?? []).forEach((note) => {
    const item = document.createElement("li");
    item.textContent = note;
    notes.append(item);
  });

  const gaps = document.createElement("ul");
  gaps.className = "note-list";
  (activeNode?.typed_gaps ?? []).forEach((gap) => {
    const item = document.createElement("li");
    item.textContent = gap;
    gaps.append(item);
  });

  container.append(identity);
  if (notes.childElementCount) {
    container.append(notes);
  }
  if (gaps.childElementCount) {
    container.append(gaps);
  }
  elements.drawerBody.replaceChildren(container);
}

function renderIdpAtlasPage(atlas) {
  const activeTenant = resolveActiveAtlasTenant(atlas);
  if (!activeTenant) {
    renderError(new Error("IdP topology atlas is missing tenant data."));
    return;
  }
  const activeNode = resolveActiveAtlasNode(atlas, activeTenant);
  renderIdpTopBar(atlas, activeTenant);
  renderIdpInventoryRail(atlas, activeTenant);
  renderIdpAtlasSummary(atlas, activeTenant, activeNode);
  elements.stepList.className = "atlas-canvas";
  elements.stepList.replaceChildren(renderIdpCanvas(atlas, activeTenant, activeNode));
  renderIdpInspector(atlas, activeTenant, activeNode);
}

function policyDecisionTone(cell) {
  if (cell === "ALLOW" || cell === "ALLOW_MASKED") {
    return cell === "ALLOW_MASKED" ? "warning" : "success";
  }
  if (cell === "REQUIRE_STEP_UP" || cell === "REQUIRE_APPROVAL") {
    return "warning";
  }
  return "danger";
}

function buildPolicyRailGroups(matrix) {
  return [
    {
      key: "roles",
      label: "Roles",
      items: (matrix.roleCatalog?.roles ?? []).map((role) => ({
        railRef: role.role_ref,
        railType: "role",
        title: role.label,
        subtitle: role.actor_classes.join(" | "),
        item: role,
      })),
    },
    {
      key: "scopes",
      label: "Scopes",
      items: (matrix.scopeCatalog?.scopes ?? []).map((scope) => ({
        railRef: scope.scope_ref,
        railType: "scope",
        title: scope.label,
        subtitle: scope.provider_permission_name,
        item: scope,
      })),
    },
    {
      key: "sessions",
      label: "Session Profiles",
      items: (matrix.sessionPolicyMatrix?.session_profiles ?? []).map((profile) => ({
        railRef: profile.session_profile_ref,
        railType: "session",
        title: profile.label,
        subtitle: profile.channel,
        item: profile,
      })),
    },
  ];
}

function resolveActivePolicyRailItem(matrix) {
  const groups = buildPolicyRailGroups(matrix);
  const items = groups.flatMap((group) => group.items);
  if (!items.length) {
    return null;
  }
  if (
    !state.activePolicyRailRef ||
    !items.some((item) => item.railRef === state.activePolicyRailRef)
  ) {
    state.activePolicyRailRef = matrix.selectedRailRef ?? items[0].railRef;
  }
  return items.find((item) => item.railRef === state.activePolicyRailRef) ?? items[0];
}

function rowMatchesPolicyRailItem(row, railItem) {
  if (!railItem) {
    return true;
  }
  if (railItem.railType === "role") {
    return row.role_refs.includes(railItem.railRef);
  }
  if (railItem.railType === "scope") {
    return row.scope_refs.includes(railItem.railRef);
  }
  if (railItem.railType === "session") {
    return row.session_profile_refs.includes(railItem.railRef);
  }
  return true;
}

function resolveActivePolicyTriggerRow(matrix, railItem) {
  const rows = (matrix.stepUpPolicyMatrix?.trigger_rows ?? []).filter((row) =>
    rowMatchesPolicyRailItem(row, railItem),
  );
  if (!rows.length) {
    return null;
  }
  if (
    !state.activePolicyTriggerRef ||
    !rows.some((row) => row.trigger_id === state.activePolicyTriggerRef)
  ) {
    state.activePolicyTriggerRef =
      matrix.selectedTriggerRef ?? rows[0].trigger_id;
  }
  return (
    rows.find((row) => row.trigger_id === state.activePolicyTriggerRef) ?? rows[0]
  );
}

function renderAccessTopBar(matrix) {
  elements.providerBadge.textContent = matrix.providerMonogram ?? "OIDC";
  elements.runTitle.textContent = `${matrix.providerDisplayName} access matrix`;
  elements.runStatus.textContent = formatLabel(matrix.selectionPosture);
  elements.runStatus.dataset.status = "RUNNING";
  elements.environmentControl.hidden = true;
  elements.environmentChipWrap.hidden = false;
  elements.environmentChip.textContent = `Policy ${matrix.policyVersion}`;
  elements.environmentChip.dataset.status = "RUNNING";
  elements.environmentHint.textContent =
    "Roles and scopes remain coarse. Taxat still owns per-object legality, delegation, authority-link truth, and authority-of-record outcome.";
  document.title = `Provisioning Viewer - ${matrix.providerDisplayName} access matrix`;
}

function renderAccessRail(matrix, activeRailItem) {
  const groups = buildPolicyRailGroups(matrix);
  elements.runRail.setAttribute("aria-label", "Roles, scopes, and session profiles");
  elements.runList.className = "policy-rail-list";
  elements.railEyebrow.textContent = "Policy rail";
  elements.railTitle.textContent = "Roles, scopes, and session profiles";
  elements.mainEyebrow.textContent = "Action-family matrix";
  elements.mainTitle.textContent = activeRailItem?.title ?? "Policy matrix";

  const items = [];
  groups.forEach((group) => {
    const heading = document.createElement("li");
    heading.className = "policy-rail-heading";
    heading.textContent = group.label;
    items.push(heading);
    group.items.forEach((entry) => {
      const listItem = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute(
        "aria-current",
        entry.railRef === activeRailItem?.railRef ? "true" : "false",
      );
      button.innerHTML = `
        <div class="application-list__title">
          <strong>${entry.title}</strong>
          <span class="status-chip" data-status="RUNNING">${entry.railType.toUpperCase()}</span>
        </div>
        <div class="application-list__meta">
          <span class="meta-note">${entry.subtitle}</span>
          <span class="monospace">${entry.railRef}</span>
        </div>
      `;
      button.addEventListener("click", () => {
        state.activePolicyRailRef = entry.railRef;
        state.activePolicyTriggerRef = null;
        renderAccessStepupMatrixPage(matrix);
      });
      listItem.append(button);
      items.push(listItem);
    });
  });
  elements.runList.replaceChildren(...items);
}

function renderAccessSummary(matrix, activeRailItem, activeRow) {
  elements.runSummary.innerHTML = "";
  const container = document.createElement("div");
  container.className = "atlas-summary";
  container.innerHTML = `
    <div class="atlas-summary__lead">
      <div>
        <p class="eyebrow">Policy posture</p>
        <h2>${activeRailItem?.title ?? "Access matrix"}</h2>
        <p class="ledger-note">${matrix.summary}</p>
      </div>
      <div class="chip-row"></div>
    </div>
  `;
  const chipRow = container.querySelector(".chip-row");
  chipRow.append(
    createChip(formatLabel(matrix.selectionPosture), "neutral"),
    createChip(`Policy ${matrix.policyVersion}`, "neutral"),
  );
  if (activeRow) {
    chipRow.append(
      createChip(formatLabel(activeRow.step_up_cell), policyDecisionTone(activeRow.step_up_cell)),
      createChip(formatLabel(activeRow.approval_cell), policyDecisionTone(activeRow.approval_cell)),
    );
  }
  const notes = document.createElement("ul");
  notes.className = "note-list";
  (matrix.notes ?? []).forEach((note) => {
    const item = document.createElement("li");
    item.textContent = note;
    notes.append(item);
  });
  elements.runSummary.append(container, notes);
}

function renderAccessMatrixCanvas(matrix, activeRailItem, activeRow) {
  const rows = (matrix.stepUpPolicyMatrix?.trigger_rows ?? []).filter((row) =>
    rowMatchesPolicyRailItem(row, activeRailItem),
  );
  const canvas = document.createElement("div");
  canvas.className = "access-matrix-canvas";

  rows.forEach((row) => {
    const article = document.createElement("article");
    article.className = "access-matrix-row";
    article.dataset.active = row.trigger_id === activeRow?.trigger_id ? "true" : "false";
    article.innerHTML = `
      <button type="button" class="access-matrix-row__button" aria-pressed="${row.trigger_id === activeRow?.trigger_id ? "true" : "false"}">
        <div class="access-matrix-row__head">
          <div>
            <p class="eyebrow">${formatLabel(row.trigger_kind)}</p>
            <h3>${row.label}</h3>
          </div>
          <span class="status-chip" data-status="RUNNING">${row.trigger_id}</span>
        </div>
        <div class="access-matrix-grid">
          <div>
            <strong>Role</strong>
            <div class="chip-row">${row.role_refs
              .map((value) => `<span class="chip" data-tone="neutral">${value}</span>`)
              .join("")}</div>
          </div>
          <div>
            <strong>Scope</strong>
            <div class="chip-row">${row.scope_refs
              .map((value) => `<span class="chip" data-tone="neutral">${value}</span>`)
              .join("")}</div>
          </div>
          <div>
            <strong>Step-up</strong>
            <div class="chip-row"><span class="chip" data-tone="${policyDecisionTone(row.step_up_cell)}">${formatLabel(row.step_up_cell)}</span></div>
          </div>
          <div>
            <strong>Approval</strong>
            <div class="chip-row"><span class="chip" data-tone="${policyDecisionTone(row.approval_cell)}">${formatLabel(row.approval_cell)}</span></div>
          </div>
          <div>
            <strong>Session posture</strong>
            <div class="chip-row">${row.session_profile_refs
              .map((value) => `<span class="chip" data-tone="neutral">${value}</span>`)
              .join("")}</div>
          </div>
          <div>
            <strong>Source block</strong>
            <span class="monospace">${row.source_refs[0]}</span>
          </div>
        </div>
      </button>
    `;
    article
      .querySelector(".access-matrix-row__button")
      .addEventListener("click", () => {
        state.activePolicyTriggerRef = row.trigger_id;
        renderAccessStepupMatrixPage(matrix);
      });
    canvas.append(article);
  });

  return canvas;
}

function renderAccessInspector(matrix, activeRailItem, activeRow) {
  elements.drawer.dataset.state = "open";
  elements.drawerClose.hidden = true;
  elements.drawerTitle.textContent = activeRow?.label ?? activeRailItem?.title ?? "Access inspector";

  const container = document.createElement("div");
  container.className = "atlas-inspector";

  const identity = document.createElement("div");
  identity.className = "field-list";

  if (activeRailItem?.railType === "role") {
    const role = activeRailItem.item;
    identity.append(
      createFieldRow("Role ref", role.role_ref, {
        monospace: true,
        copyValue: role.role_ref,
        copyLabel: "Copy ref",
      }),
      createFieldRow("Actor classes", role.actor_classes.join(", "), {
        monospace: false,
      }),
      createFieldRow("Baseline scopes", role.baseline_scope_refs.join(", "), {
        monospace: true,
      }),
      createFieldRow("Requestable scopes", role.requestable_scope_refs.join(", ") || "none", {
        monospace: true,
      }),
      createFieldRow("Surface families", role.allowed_surface_families.join(", "), {
        monospace: true,
      }),
    );
  } else if (activeRailItem?.railType === "scope") {
    const scope = activeRailItem.item;
    identity.append(
      createFieldRow("Scope ref", scope.scope_ref, {
        monospace: true,
        copyValue: scope.scope_ref,
        copyLabel: "Copy ref",
      }),
      createFieldRow("Provider permission", scope.provider_permission_name, {
        monospace: true,
      }),
      createFieldRow("Scope class", scope.scope_class, {
        chips: [createChip(scope.scope_class, scope.scope_class === "ELEVATED" ? "warning" : "success")],
      }),
      createFieldRow("Allowed actors", scope.allowed_actor_classes.join(", "), {}),
      createFieldRow("Allowed surfaces", scope.allowed_surface_families.join(", "), {
        monospace: true,
      }),
      createFieldRow("Boundary", scope.engine_authorization_boundary, {}),
    );
  } else if (activeRailItem?.railType === "session") {
    const session = activeRailItem.item;
    identity.append(
      createFieldRow("Session profile", session.session_profile_ref, {
        monospace: true,
        copyValue: session.session_profile_ref,
        copyLabel: "Copy ref",
      }),
      createFieldRow("Channel", session.channel, {
        chips: [createChip(session.channel, "neutral")],
      }),
      createFieldRow(
        "Idle / absolute",
        session.default_idle_timeout_hours === null
          ? "not applicable"
          : `${session.default_idle_timeout_hours}h / ${session.default_absolute_timeout_hours}h`,
        { monospace: true },
      ),
      createFieldRow("Refresh posture", session.refresh_token_rotation, {
        chips: [
          createChip(
            formatLabel(session.refresh_token_rotation),
            session.refresh_token_rotation === "ROTATING_EXPIRING" ? "warning" : "neutral",
          ),
        ],
      }),
      createFieldRow("Storage boundary", session.storage_boundary, {}),
    );
  }

  if (activeRow) {
    identity.append(
      createFieldRow("Trigger ID", activeRow.trigger_id, {
        monospace: true,
        copyValue: activeRow.trigger_id,
        copyLabel: "Copy trigger",
      }),
      createFieldRow("Assurance", activeRow.assurance_requirement, {}),
      createFieldRow("Affected surfaces", activeRow.surface_families.join(", "), {
        monospace: true,
      }),
    );
  }

  const sourceList = document.createElement("ul");
  sourceList.className = "note-list";
  const railSources =
    activeRailItem?.item?.source_refs?.map((entry) =>
      typeof entry === "string" ? entry : entry.source_ref,
    ) ?? [];
  const rowSources = activeRow?.source_refs ?? [];
  [...railSources, ...rowSources].forEach((source) => {
    const item = document.createElement("li");
    item.innerHTML = `<strong>Source</strong><span class="monospace">${source}</span>`;
    sourceList.append(item);
  });

  const invalidations = document.createElement("ul");
  invalidations.className = "note-list";
  (activeRow?.invalidation_events ?? []).forEach((eventId) => {
    const event = (matrix.stepUpPolicyMatrix?.invalidation_events ?? []).find(
      (candidate) => candidate.event_id === eventId,
    );
    const item = document.createElement("li");
    item.innerHTML = `
      <strong>${event?.label ?? eventId}</strong>
      <span>${event?.continuity_rule ?? eventId}</span>
    `;
    invalidations.append(item);
  });

  const notes = document.createElement("ul");
  notes.className = "note-list";
  [
    ...(activeRailItem?.item?.notes ?? []),
    ...(activeRow?.notes ?? []),
    ...(activeRow?.revalidation_requirements ?? []),
  ].forEach((note) => {
    const item = document.createElement("li");
    item.textContent = note;
    notes.append(item);
  });

  container.append(identity);
  if (sourceList.childElementCount) {
    container.append(sourceList);
  }
  if (invalidations.childElementCount) {
    container.append(invalidations);
  }
  if (notes.childElementCount) {
    container.append(notes);
  }
  elements.drawerBody.replaceChildren(container);
}

function renderAccessStepupMatrixPage(matrix) {
  const activeRailItem = resolveActivePolicyRailItem(matrix);
  if (!activeRailItem) {
    renderError(new Error("Access matrix is missing role, scope, and session data."));
    return;
  }
  const activeRow = resolveActivePolicyTriggerRow(matrix, activeRailItem);
  renderAccessTopBar(matrix);
  renderAccessRail(matrix, activeRailItem);
  renderAccessSummary(matrix, activeRailItem, activeRow);
  elements.stepList.className = "access-matrix-canvas";
  elements.stepList.replaceChildren(
    renderAccessMatrixCanvas(matrix, activeRailItem, activeRow),
  );
  renderAccessInspector(matrix, activeRailItem, activeRow);
}

function resolveActiveEmailDomain(board) {
  return (
    board.domains.find((domain) => domain.domain_ref === state.activeEmailDomainRef) ||
    board.domains[0] ||
    null
  );
}

function resolveActiveEmailFocus(board, activeDomain) {
  if (!activeDomain) {
    return null;
  }
  const workspace = board.workspace_rows.find(
    (row) => row.workspace_ref === activeDomain.workspace_ref,
  );
  const dnsMatch = activeDomain.dns_records.find(
    (row) => row.record_ref === state.activeEmailFocusRef,
  );
  if (dnsMatch) {
    return { kind: "dns", item: dnsMatch };
  }
  const streamMatch = activeDomain.message_streams.find(
    (row) => row.stream_ref === state.activeEmailFocusRef,
  );
  if (streamMatch) {
    return { kind: "stream", item: streamMatch };
  }
  if (workspace && workspace.workspace_ref === state.activeEmailFocusRef) {
    return { kind: "workspace", item: workspace };
  }
  return {
    kind: "dns",
    item:
      activeDomain.dns_records.find((row) => row.purpose === "DKIM_SIGNING") ||
      activeDomain.dns_records[0],
  };
}

function renderEmailTopBar(board, activeDomain) {
  elements.providerBadge.textContent = "MAIL";
  elements.runTitle.textContent = "Email domain readiness board";
  elements.runStatus.textContent = formatTitleLabel(activeDomain.readiness_state);
  elements.runStatus.dataset.status = activeDomain.readiness_state;
  elements.environmentControl.hidden = true;
  elements.environmentChipWrap.hidden = false;
  elements.environmentChip.textContent = activeDomain.environment_label;
  elements.environmentChip.dataset.status = activeDomain.verification_state;
  elements.environmentHint.textContent = board.truth_boundary_statement;
  document.title = `Provisioning Viewer - ${activeDomain.sender_domain}`;
}

function renderEmailDomainRail(board, activeDomain) {
  elements.runRail.setAttribute("aria-label", "Sender domains and streams");
  elements.runList.className = "domain-rail-list";
  elements.railEyebrow.textContent = "Sender domains";
  elements.railTitle.textContent = "Readiness inventory";
  elements.mainEyebrow.textContent = "Calm operational checklist";
  elements.mainTitle.textContent = activeDomain.sender_domain;

  elements.runList.replaceChildren(
    ...board.domains.map((domain) => {
      const listItem = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute(
        "aria-current",
        domain.domain_ref === activeDomain.domain_ref ? "true" : "false",
      );
      button.innerHTML = `
        <div class="domain-rail__title">
          <strong>${domain.sender_domain}</strong>
          <span class="status-chip" data-status="${domain.readiness_state}">${formatLabel(domain.readiness_state)}</span>
        </div>
        <div class="domain-rail__meta">
          <span>${domain.environment_label}</span>
          <span class="meta-note">${formatLabel(domain.verification_state)}</span>
        </div>
      `;
      button.addEventListener("click", () => {
        state.activeEmailDomainRef = domain.domain_ref;
        state.activeEmailFocusRef = null;
        renderEmailDomainReadinessBoard(board);
      });
      listItem.append(button);
      return listItem;
    }),
  );
}

function renderEmailSummary(board, activeDomain) {
  const summary = document.createElement("section");
  summary.className = "email-summary";
  summary.innerHTML = `
    <div class="panel-heading">
      <p class="eyebrow">Readiness summary</p>
      <h3>Domain readiness</h3>
    </div>
  `;

  const cards = document.createElement("div");
  cards.className = "summary-grid";
  [
    ["Workspace", activeDomain.workspace_ref],
    ["Verification", formatLabel(activeDomain.verification_state)],
    ["Readiness", formatLabel(activeDomain.readiness_state)],
    ["DNS records", `${activeDomain.dns_records.length} tracked`],
    ["Streams", `${activeDomain.message_streams.length} tracked`],
  ].forEach(([label, value]) => {
    const article = document.createElement("article");
    article.className = "summary-card";
    article.innerHTML = `<strong>${label}</strong><span class="monospace">${value}</span>`;
    cards.append(article);
  });

  const ladder = document.createElement("ol");
  ladder.className = "readiness-ladder";
  activeDomain.readiness_ladder.forEach((step) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <strong>${step.step}</strong>
      <span class="status-chip" data-status="${step.status}">${formatLabel(step.status)}</span>
    `;
    ladder.append(item);
  });

  const notes = document.createElement("ul");
  notes.className = "note-list";
  [board.truth_boundary_statement, ...(activeDomain.notes ?? [])].forEach((note) => {
    const item = document.createElement("li");
    item.textContent = note;
    notes.append(item);
  });

  summary.append(cards, ladder, notes);
  return summary;
}

function renderWorkspaceBand(board, activeDomain, activeFocus) {
  const section = document.createElement("section");
  section.className = "readiness-band";
  section.innerHTML = `
    <div class="panel-heading">
      <p class="eyebrow">Band one</p>
      <h3>Workspace</h3>
    </div>
  `;

  const list = document.createElement("ul");
  list.className = "workspace-band-list";
  board.workspace_rows
    .filter((row) => row.workspace_ref === activeDomain.workspace_ref)
    .forEach((row) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "workspace-row-button";
      button.setAttribute(
        "aria-pressed",
        activeFocus.kind === "workspace" && activeFocus.item.workspace_ref === row.workspace_ref
          ? "true"
          : "false",
      );
      button.innerHTML = `
        <strong>${row.server_label}</strong>
        <span class="meta-note">${row.server_delivery_type} server</span>
        <span class="meta-note">${row.server_token_metadata_ref}</span>
      `;
      button.addEventListener("click", () => {
        state.activeEmailFocusRef = row.workspace_ref;
        renderEmailDomainReadinessBoard(board);
      });
      item.append(button);
      list.append(item);
    });
  section.append(list);
  return section;
}

function renderDomainIdentityBand(activeDomain) {
  const returnPathRecord = activeDomain.dns_records.find(
    (row) => row.purpose === "RETURN_PATH",
  );
  const section = document.createElement("section");
  section.className = "readiness-band";
  section.innerHTML = `
    <div class="panel-heading">
      <p class="eyebrow">Band two</p>
      <h3>Domain Identity</h3>
    </div>
  `;

  const block = document.createElement("div");
  block.className = "identity-band";
  block.innerHTML = `
    <div class="identity-card">
      <strong>Sender domain</strong>
      <span class="monospace">${activeDomain.sender_domain}</span>
    </div>
    <div class="identity-card">
      <strong>Return-Path</strong>
      <span class="monospace">${returnPathRecord?.host ?? "Not configured"}</span>
    </div>
    <div class="identity-card">
      <strong>Verification state</strong>
      <span>${formatLabel(activeDomain.verification_state)}</span>
    </div>
  `;

  section.append(block);
  return section;
}

function renderDnsBand(board, activeDomain, activeFocus) {
  const section = document.createElement("section");
  section.className = "readiness-band";
  section.innerHTML = `
    <div class="panel-heading">
      <p class="eyebrow">Band three</p>
      <h3>DNS Records</h3>
    </div>
  `;

  const list = document.createElement("ul");
  list.className = "dns-record-list";
  activeDomain.dns_records.forEach((record) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute(
      "aria-pressed",
      activeFocus.kind === "dns" && activeFocus.item.record_ref === record.record_ref
        ? "true"
        : "false",
    );
    button.innerHTML = `
      <div class="dns-record__title">
        <strong>${record.label}</strong>
        <span class="status-chip" data-status="${record.readiness_state}">${formatLabel(record.readiness_state)}</span>
      </div>
      <div class="dns-record__meta">
        <span class="monospace">${record.host}</span>
        <span>${record.ttl_seconds}s</span>
      </div>
    `;
    button.addEventListener("click", () => {
      state.activeEmailFocusRef = record.record_ref;
      renderEmailDomainReadinessBoard(board);
    });
    item.append(button);
    list.append(item);
  });

  section.append(list);
  return section;
}

function renderStreamsBand(board, activeDomain, activeFocus) {
  const section = document.createElement("section");
  section.className = "readiness-band";
  section.innerHTML = `
    <div class="panel-heading">
      <p class="eyebrow">Band four</p>
      <h3>Message Streams</h3>
    </div>
  `;

  const list = document.createElement("ul");
  list.className = "stream-list";
  activeDomain.message_streams.forEach((stream) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute(
      "aria-pressed",
      activeFocus.kind === "stream" && activeFocus.item.stream_ref === stream.stream_ref
        ? "true"
        : "false",
    );
    button.innerHTML = `
      <div class="stream-row__title">
        <strong>${stream.label}</strong>
        <span class="status-chip" data-status="${stream.allows_live_recipients ? "ACTIVE_AND_RUNTIME_VERIFIED" : "MANUAL_CHECKPOINT_REQUIRED"}">${stream.allows_live_recipients ? "Live recipients allowed" : "Sink safe"}</span>
      </div>
      <div class="stream-row__meta">
        <span class="monospace">${stream.provider_stream_name}</span>
        <span>${formatLabel(stream.allowed_recipient_posture)}</span>
      </div>
    `;
    button.addEventListener("click", () => {
      state.activeEmailFocusRef = stream.stream_ref;
      renderEmailDomainReadinessBoard(board);
    });
    item.append(button);
    list.append(item);
  });
  section.append(list);
  return section;
}

function renderEmailInspector(board, activeDomain, activeFocus) {
  elements.drawer.dataset.state = "open";
  elements.drawerClose.hidden = true;

  const container = document.createElement("div");
  container.className = "atlas-inspector";
  const renderNote = (entry) => {
    if (typeof entry === "string") {
      return entry;
    }
    if (entry?.source_ref) {
      return entry.source_ref;
    }
    return String(entry);
  };

  if (activeFocus.kind === "dns") {
    elements.drawerTitle.textContent = activeFocus.item.host;
    container.append(
      createMetadataList([
        ["Purpose", formatLabel(activeFocus.item.purpose)],
        ["Host", activeFocus.item.host],
        ["Expected value", activeFocus.item.expected_value],
        ["TTL", `${activeFocus.item.ttl_seconds}s`],
        ["Owner", formatLabel(activeFocus.item.owner_role)],
        ["Environment", activeDomain.environment_label],
      ]),
    );
    const notes = document.createElement("ul");
    notes.className = "note-list";
    [...(activeFocus.item.notes ?? []), ...(activeFocus.item.source_refs ?? [])].forEach(
      (entry) => {
        const item = document.createElement("li");
        item.textContent = renderNote(entry);
        notes.append(item);
      },
    );
    container.append(notes);
  } else if (activeFocus.kind === "stream") {
    elements.drawerTitle.textContent = activeFocus.item.provider_stream_name;
    container.append(
      createMetadataList([
        ["Label", activeFocus.item.label],
        ["Recipients", formatLabel(activeFocus.item.allowed_recipient_posture)],
        [
          "Live recipients",
          activeFocus.item.allows_live_recipients ? "Allowed" : "Not allowed",
        ],
        ["Environment", activeDomain.environment_label],
      ]),
    );
    const notes = document.createElement("ul");
    notes.className = "note-list";
    [...(activeFocus.item.notes ?? []), ...(activeFocus.item.source_refs ?? [])].forEach(
      (entry) => {
        const item = document.createElement("li");
        item.textContent = renderNote(entry);
        notes.append(item);
      },
    );
    container.append(notes);
  } else {
    elements.drawerTitle.textContent = activeFocus.item.server_label;
    container.append(
      createMetadataList([
        ["Delivery type", activeFocus.item.server_delivery_type],
        ["Account token ref", activeFocus.item.account_token_metadata_ref],
        ["Server token ref", activeFocus.item.server_token_metadata_ref],
        [
          "Live recipients",
          activeFocus.item.allows_live_recipients ? "Allowed" : "Not allowed",
        ],
      ]),
    );
    const notes = document.createElement("ul");
    notes.className = "note-list";
    [...(activeFocus.item.notes ?? []), ...(activeFocus.item.source_refs ?? [])].forEach(
      (entry) => {
        const item = document.createElement("li");
        item.textContent = renderNote(entry);
        notes.append(item);
      },
    );
    container.append(notes);
  }

  const truthBoundary = document.createElement("section");
  truthBoundary.className = "checkpoint-card";
  truthBoundary.innerHTML = `
    <p class="eyebrow">Truth boundary</p>
    <h3>Transport only</h3>
    <p>${board.truth_boundary_statement}</p>
  `;
  container.append(truthBoundary);

  elements.drawerBody.replaceChildren(container);
}

function renderEmailDomainReadinessBoard(board) {
  const activeDomain = resolveActiveEmailDomain(board);
  if (!activeDomain) {
    renderError(new Error("Email readiness board is missing sender-domain data."));
    return;
  }
  const activeFocus = resolveActiveEmailFocus(board, activeDomain);
  renderEmailTopBar(board, activeDomain);
  renderEmailDomainRail(board, activeDomain);
  elements.runSummary.replaceChildren(renderEmailSummary(board, activeDomain));
  elements.stepList.className = "email-readiness-canvas";
  elements.stepList.replaceChildren(
    renderWorkspaceBand(board, activeDomain, activeFocus),
    renderDomainIdentityBand(activeDomain),
    renderDnsBand(board, activeDomain, activeFocus),
    renderStreamsBand(board, activeDomain, activeFocus),
  );
  renderEmailInspector(board, activeDomain, activeFocus);
}

function resolveActivePushChannel(board) {
  return (
    board.channels.find((channel) => channel.channel_ref === state.activePushChannelRef) ||
    board.channels[0] ||
    null
  );
}

function renderPushTopBar(board, channel) {
  elements.providerBadge.textContent = board.provider_monogram;
  elements.runTitle.textContent = channel.label;
  elements.runStatus.textContent = channel.state_label;
  elements.runStatus.dataset.status =
    channel.state_label === "Active"
      ? "ACTIVE_AND_RUNTIME_VERIFIED"
      : channel.state_label === "Fixture Only"
        ? "SKIPPED_AS_ALREADY_PRESENT"
        : "BLOCKED_BY_POLICY";
  elements.environmentControl.hidden = true;
  elements.environmentChipWrap.hidden = false;
  elements.environmentChip.textContent = channel.environment_label;
  elements.environmentHint.textContent =
    "Remote delivery stays native-macOS internal only; browser push remains deferred.";
  document.title = `Provisioning Viewer - ${channel.label}`;
}

function renderPushRail(board, activeChannel) {
  elements.runRail.setAttribute("aria-label", "Device messaging channels");
  elements.runList.className = "push-channel-rail-list";
  elements.railEyebrow.textContent = "Channel rail";
  elements.railTitle.textContent = "Delivery surfaces";
  elements.mainEyebrow.textContent = "Transport topology";
  elements.mainTitle.textContent = activeChannel.label;

  elements.runList.replaceChildren(
    ...board.channels.map((channel) => {
      const listItem = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute(
        "aria-current",
        channel.channel_ref === activeChannel.channel_ref ? "true" : "false",
      );
      button.innerHTML = `
        <div class="push-channel-rail__title">
          <strong>${channel.label}</strong>
          <span class="status-chip" data-status="${channel.state_label === "Active" ? "ACTIVE_AND_RUNTIME_VERIFIED" : channel.state_label === "Deferred" ? "BLOCKED_BY_POLICY" : "SKIPPED_AS_ALREADY_PRESENT"}">${channel.state_label}</span>
        </div>
        <div class="push-channel-rail__meta">
          <span class="meta-note">${channel.environment_label}</span>
          <span class="monospace">${channel.provider_label}</span>
        </div>
      `;
      button.addEventListener("click", () => {
        state.activePushChannelRef = channel.channel_ref;
        renderDeviceMessagingTopologyBoard(board);
      });
      listItem.append(button);
      return listItem;
    }),
  );
}

function renderPushSummary(board, channel) {
  const section = document.createElement("section");
  section.className = "atlas-summary";
  section.innerHTML = `
    <div class="atlas-summary__lead">
      <div>
        <p class="eyebrow">Topology posture</p>
        <h2>${channel.summary}</h2>
        <p class="ledger-note">${board.notes[0]}</p>
      </div>
      <div class="chip-row"></div>
    </div>
  `;

  const chipRow = section.querySelector(".chip-row");
  chipRow.append(
    createChip(channel.provider_label, "neutral"),
    createChip(channel.client_surface_label, "neutral"),
    createChip(board.selection_posture.replaceAll("_", " "), "warning"),
  );

  return section;
}

function renderPushLane(title, eyebrow, rows, valueBuilder) {
  const section = document.createElement("section");
  section.className = "push-topology-lane";
  section.innerHTML = `
    <div class="panel-heading">
      <p class="eyebrow">${eyebrow}</p>
      <h3>${title}</h3>
    </div>
  `;

  const list = document.createElement("div");
  list.className = "push-topology-lane__list";
  rows.forEach((row) => {
    const card = document.createElement("article");
    card.className = "push-topology-card";
    valueBuilder(card, row);
    list.append(card);
  });
  section.append(list);
  return section;
}

function renderPushCanvas(channel) {
  const container = document.createElement("div");
  container.className = "push-topology-canvas";

  container.append(
    renderPushLane(
      "Product notification families",
      "Product notification families",
      channel.product_notification_families,
      (card, row) => {
        card.innerHTML = `
          <strong>${row.notification_family.replaceAll("_", " ")}</strong>
          <p>${row.delivery_decision}</p>
          <div class="field-row__meta">
            <span class="meta-note">${row.visibility_class}</span>
            <span class="meta-note">${row.urgency_class}</span>
          </div>
        `;
      },
    ),
    renderPushLane(
      "Provider channels",
      "Provider channels",
      channel.provider_channel_rows,
      (card, row) => {
        card.innerHTML = `
          <strong>${row.label}</strong>
          <p>${row.detail}</p>
        `;
      },
    ),
    renderPushLane(
      "Shell/route continuity targets",
      "Shell/route continuity targets",
      channel.continuity_target_rows,
      (card, row) => {
        card.innerHTML = `
          <strong>${row.label}</strong>
          <p class="monospace">${row.target_surface_ref}</p>
          <div class="field-row__meta">
            <span class="meta-note monospace">${row.focus_anchor_ref_template}</span>
          </div>
          <p class="meta-note">Return: ${row.return_surface_ref}</p>
        `;
      },
    ),
  );

  return container;
}

function renderPushInspector(board, channel) {
  elements.drawer.dataset.state = "open";
  elements.drawerClose.hidden = true;
  elements.drawerTitle.textContent = channel.label;

  const container = document.createElement("div");
  container.className = "atlas-inspector";

  const fields = document.createElement("div");
  fields.className = "field-list";
  fields.append(
    createFieldRow("Channel ref", channel.channel_ref, {
      monospace: true,
      copyValue: channel.channel_ref,
      copyLabel: "Copy ref",
    }),
    createFieldRow("Environment", channel.environment_label),
    createFieldRow("Client surface", channel.client_surface_label, {
      monospace: true,
    }),
  );

  const lineageSection = document.createElement("section");
  lineageSection.className = "checkpoint-card";
  lineageSection.innerHTML = `
    <p class="eyebrow">Key lineage</p>
    <h3>Key lineage</h3>
  `;
  const lineageList = document.createElement("ul");
  lineageList.className = "note-list";
  board.credential_lineage
    .filter((credential) => channel.key_lineage_refs.includes(credential.credential_ref))
    .forEach((credential) => {
      const item = document.createElement("li");
      item.innerHTML = `
        <strong>${credential.label}</strong>
        <span class="monospace">${credential.vault_ref}</span>
        <span class="meta-note">${credential.binding_summary}</span>
      `;
      lineageList.append(item);
    });
  lineageSection.append(lineageList);

  const continuitySection = document.createElement("section");
  continuitySection.className = "checkpoint-card";
  continuitySection.innerHTML = `
    <p class="eyebrow">Continuity notes</p>
    <h3>Continuity notes</h3>
  `;
  const continuityList = document.createElement("ul");
  continuityList.className = "note-list";
  channel.continuity_notes.forEach((note) => {
    const item = document.createElement("li");
    item.textContent = note;
    continuityList.append(item);
  });
  continuitySection.append(continuityList);

  const postureSection = document.createElement("section");
  postureSection.className = "checkpoint-card";
  postureSection.innerHTML = `
    <p class="eyebrow">Binding notes</p>
    <h3>Binding notes</h3>
  `;
  const postureList = document.createElement("ul");
  postureList.className = "note-list";
  channel.inspector_notes.forEach((note) => {
    const item = document.createElement("li");
    item.textContent = note;
    postureList.append(item);
  });
  postureSection.append(postureList);

  container.append(fields, lineageSection, continuitySection, postureSection);
  elements.drawerBody.replaceChildren(container);
}

function renderDeviceMessagingTopologyBoard(board) {
  const activeChannel = resolveActivePushChannel(board);
  if (!activeChannel) {
    renderError(new Error("Device messaging topology board is missing channel data."));
    return;
  }
  renderPushTopBar(board, activeChannel);
  renderPushRail(board, activeChannel);
  elements.runSummary.replaceChildren(renderPushSummary(board, activeChannel));
  elements.stepList.className = "push-topology-canvas";
  elements.stepList.replaceChildren(renderPushCanvas(activeChannel));
  renderPushInspector(board, activeChannel);
}

function resolveActiveMonitoringProject(board) {
  return (
    board.projects.find(
      (project) => project.project_ref === state.activeMonitoringProjectRef,
    ) ||
    board.projects[0] ||
    null
  );
}

function renderMonitoringTopBar(board, project) {
  elements.providerBadge.textContent = board.provider_monogram;
  elements.runTitle.textContent = project.label;
  elements.runStatus.textContent = project.status_label;
  elements.runStatus.dataset.status = "SUCCEEDED";
  elements.environmentControl.hidden = true;
  elements.environmentChipWrap.hidden = false;
  elements.environmentChip.textContent = project.environment_label;
  elements.environmentChip.dataset.status = "SUCCEEDED";
  elements.environmentHint.textContent = board.truth_boundary_statement;
  document.title = `Provisioning Viewer - ${project.label}`;
}

function renderMonitoringRail(board, activeProject) {
  elements.runRail.setAttribute("aria-label", "Monitoring projects");
  elements.runList.className = "monitoring-project-rail-list";
  elements.railEyebrow.textContent = "Project rail";
  elements.railTitle.textContent = "Governed projects";
  elements.mainEyebrow.textContent = "Signal governance";
  elements.mainTitle.textContent = activeProject.label;

  elements.runList.replaceChildren(
    ...board.projects.map((project) => {
      const listItem = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute(
        "aria-current",
        project.project_ref === activeProject.project_ref ? "true" : "false",
      );
      button.innerHTML = `
        <div class="monitoring-project-rail__title">
          <strong>${project.label}</strong>
          <span class="status-chip" data-status="SUCCEEDED">${project.status_label}</span>
        </div>
        <div class="monitoring-project-rail__meta">
          <span class="meta-note">${project.environment_label}</span>
          <span class="monospace">${project.project_kind_label}</span>
        </div>
      `;
      button.addEventListener("click", () => {
        state.activeMonitoringProjectRef = project.project_ref;
        renderSignalGovernanceBoard(board);
      });
      listItem.append(button);
      return listItem;
    }),
  );
}

function renderMonitoringSummary(board, project) {
  const section = document.createElement("section");
  section.className = "atlas-summary";
  section.innerHTML = `
    <div class="atlas-summary__lead">
      <div>
        <p class="eyebrow">Governance posture</p>
        <h2>${project.summary}</h2>
        <p class="ledger-note">${board.notes[0]}</p>
      </div>
      <div class="chip-row"></div>
    </div>
  `;

  const chipRow = section.querySelector(".chip-row");
  chipRow.append(
    createChip(project.project_kind_label, "neutral"),
    createChip(project.environment_label, "neutral"),
    createChip(board.selection_posture.replaceAll("_", " "), "warning"),
  );

  return section;
}

function renderMonitoringLane(title, eyebrow, rows, valueBuilder) {
  const section = document.createElement("section");
  section.className = "signal-governance-module";
  section.innerHTML = `
    <div class="panel-heading">
      <p class="eyebrow">${eyebrow}</p>
      <h3>${title}</h3>
    </div>
  `;

  const list = document.createElement("div");
  list.className = "signal-governance-module__list";
  rows.forEach((row) => {
    const card = document.createElement("article");
    card.className = "signal-governance-card";
    valueBuilder(card, row);
    list.append(card);
  });
  section.append(list);
  return section;
}

function renderMonitoringCanvas(project) {
  const container = document.createElement("div");
  container.className = "signal-governance-canvas";

  container.append(
    renderMonitoringLane("Projects", "Projects", project.project_rows, (card, row) => {
      card.innerHTML = `
        <strong>${row.label}</strong>
        <p>${row.detail}</p>
      `;
    }),
    renderMonitoringLane("Scrubbing", "Scrubbing", project.scrub_rows, (card, row) => {
      card.innerHTML = `
        <strong>${row.label}</strong>
        <p>${row.detail}</p>
      `;
    }),
    renderMonitoringLane(
      "Inbound Filters",
      "Inbound Filters",
      project.inbound_filter_rows,
      (card, row) => {
        card.innerHTML = `
          <strong>${row.label}</strong>
          <p>${row.detail}</p>
        `;
      },
    ),
    renderMonitoringLane(
      "Alerts & Release Mapping",
      "Alerts & Release Mapping",
      project.alert_and_release_rows,
      (card, row) => {
        card.innerHTML = `
          <strong>${row.label}</strong>
          <p>${row.detail}</p>
        `;
      },
    ),
  );

  return container;
}

function renderMonitoringInspector(board, project) {
  elements.drawer.dataset.state = "open";
  elements.drawerClose.hidden = true;
  elements.drawerTitle.textContent = project.label;

  const container = document.createElement("div");
  container.className = "atlas-inspector";

  const fields = document.createElement("div");
  fields.className = "field-list";
  fields.append(
    createFieldRow("Project ref", project.project_ref, {
      monospace: true,
      copyValue: project.project_ref,
      copyLabel: "Copy ref",
    }),
    createFieldRow("Environment", project.environment_label),
    createFieldRow("Project kind", project.project_kind_label, {
      monospace: true,
    }),
  );

  const tokenSection = document.createElement("section");
  tokenSection.className = "checkpoint-card";
  tokenSection.innerHTML = `
    <p class="eyebrow">Safe token lineage</p>
    <h3>Safe token lineage</h3>
  `;
  const tokenList = document.createElement("ul");
  tokenList.className = "note-list";
  project.token_rows.forEach((row) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <strong>${row.label}</strong>
      <span class="monospace">${row.safe_ref}</span>
    `;
    tokenList.append(item);
  });
  tokenSection.append(tokenList);

  const sourceSection = document.createElement("section");
  sourceSection.className = "checkpoint-card";
  sourceSection.innerHTML = `
    <p class="eyebrow">Source refs</p>
    <h3>Source refs</h3>
  `;
  const sourceList = document.createElement("ul");
  sourceList.className = "note-list";
  project.source_refs.forEach((row) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <strong>${row.rationale}</strong>
      <span class="monospace">${row.source_ref}</span>
    `;
    sourceList.append(item);
  });
  sourceSection.append(sourceList);

  const notesSection = document.createElement("section");
  notesSection.className = "checkpoint-card";
  notesSection.innerHTML = `
    <p class="eyebrow">Governance notes</p>
    <h3>Governance notes</h3>
  `;
  const notesList = document.createElement("ul");
  notesList.className = "note-list";
  [board.truth_boundary_statement, ...project.inspector_notes].forEach((note) => {
    const item = document.createElement("li");
    item.textContent = note;
    notesList.append(item);
  });
  notesSection.append(notesList);

  container.append(fields, tokenSection, sourceSection, notesSection);
  elements.drawerBody.replaceChildren(container);
}

function renderSignalGovernanceBoard(board) {
  const activeProject = resolveActiveMonitoringProject(board);
  if (!activeProject) {
    renderError(new Error("Signal governance board is missing project data."));
    return;
  }
  renderMonitoringTopBar(board, activeProject);
  renderMonitoringRail(board, activeProject);
  elements.runSummary.replaceChildren(renderMonitoringSummary(board, activeProject));
  elements.stepList.className = "signal-governance-canvas";
  elements.stepList.replaceChildren(renderMonitoringCanvas(activeProject));
  renderMonitoringInspector(board, activeProject);
}

function resolveActiveDocumentExtractionEnvironment(board) {
  return (
    board.environment_options.find(
      (option) =>
        option.environment_ref === state.activeDocumentExtractionEnvironmentRef,
    ) ||
    board.environment_options.find(
      (option) => option.environment_ref === board.active_environment_ref,
    ) ||
    board.environment_options[0] ||
    null
  );
}

function resolveActiveDocumentExtractionProfile(board) {
  return (
    board.profiles.find(
      (profile) =>
        profile.profile_ref === state.activeDocumentExtractionProfileRef,
    ) ||
    board.profiles[0] ||
    null
  );
}

function documentExtractionStatusDataValue(statusLabel) {
  return statusLabel === "Not Enabled"
    ? "SKIPPED_AS_ALREADY_PRESENT"
    : "MANUAL_CHECKPOINT_REQUIRED";
}

function renderDocumentExtractionTopBar(board, environment, profile) {
  elements.providerBadge.textContent = board.provider_monogram;
  elements.runTitle.textContent = board.provider_label;
  elements.runStatus.textContent = board.selection_posture_label;
  elements.runStatus.dataset.status = "MANUAL_CHECKPOINT_REQUIRED";
  elements.environmentControl.hidden = false;
  elements.environmentChipWrap.hidden = true;
  elements.environmentSelect.replaceChildren(
    ...board.environment_options.map((option) => {
      const selectOption = document.createElement("option");
      selectOption.value = option.environment_ref;
      selectOption.textContent = option.label;
      selectOption.selected = option.environment_ref === environment.environment_ref;
      return selectOption;
    }),
  );
  elements.environmentSelect.disabled = false;
  elements.environmentSelect.onchange = () => {
    state.activeDocumentExtractionEnvironmentRef = elements.environmentSelect.value;
    renderDocumentExtractionGovernanceBoard(board);
  };
  elements.environmentHint.textContent = environment.summary;
  document.title = `Provisioning Viewer - ${profile.label}`;
}

function renderDocumentExtractionRail(board, activeProfile) {
  elements.runRail.setAttribute("aria-label", "Document extraction profiles");
  elements.runList.className = "document-extraction-profile-rail-list";
  elements.railEyebrow.textContent = "Profile rail";
  elements.railTitle.textContent = "Document classes";
  elements.mainEyebrow.textContent = "Evidence atelier";
  elements.mainTitle.textContent = activeProfile.label;

  elements.runList.replaceChildren(
    ...board.profiles.map((profile) => {
      const listItem = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute(
        "aria-current",
        profile.profile_ref === activeProfile.profile_ref ? "true" : "false",
      );
      button.innerHTML = `
        <div class="document-extraction-profile-rail__title">
          <strong>${profile.label}</strong>
          <span class="status-chip" data-status="${documentExtractionStatusDataValue(profile.status_label)}">${profile.status_label}</span>
        </div>
        <div class="document-extraction-profile-rail__meta">
          <span class="meta-note">${profile.summary}</span>
          <span class="monospace">${profile.profile_ref}</span>
        </div>
      `;
      button.addEventListener("click", () => {
        state.activeDocumentExtractionProfileRef = profile.profile_ref;
        renderDocumentExtractionGovernanceBoard(board);
      });
      listItem.append(button);
      return listItem;
    }),
  );
}

function renderDocumentExtractionSummary(board, environment, profile) {
  const section = document.createElement("section");
  section.className = "atlas-summary";
  section.innerHTML = `
    <div class="atlas-summary__lead">
      <div>
        <p class="eyebrow">Selection posture</p>
        <h2>${profile.summary}</h2>
        <p class="ledger-note">${environment.summary}</p>
      </div>
      <div class="chip-row"></div>
    </div>
  `;

  const chipRow = section.querySelector(".chip-row");
  chipRow.append(
    createChip(board.selection_posture_label, "warning"),
    createChip(environment.label, "neutral"),
    createChip(profile.status_label, "neutral"),
  );
  return section;
}

function renderDocumentExtractionColumn(title, eyebrow, rows) {
  const section = document.createElement("section");
  section.className = "document-extraction-column";
  section.innerHTML = `
    <div class="panel-heading">
      <p class="eyebrow">${eyebrow}</p>
      <h3>${title}</h3>
    </div>
  `;

  const list = document.createElement("div");
  list.className = "document-extraction-column__list";
  rows.forEach((row) => {
    const card = document.createElement("article");
    card.className = "document-extraction-card";
    card.innerHTML = `
      <strong>${row.label}</strong>
      <p>${row.detail}</p>
    `;
    list.append(card);
  });
  section.append(list);
  return section;
}

function renderDocumentExtractionCanvas(profile) {
  const container = document.createElement("div");
  container.className = "document-extraction-canvas";

  container.append(
    renderDocumentExtractionColumn(
      "Source Artifact",
      "Source Artifact",
      profile.source_artifact_rows,
    ),
    renderDocumentExtractionColumn(
      "Normalized Extraction",
      "Normalized Extraction",
      profile.normalized_extraction_rows,
    ),
    renderDocumentExtractionColumn(
      "Candidate-Fact Boundary",
      "Candidate-Fact Boundary",
      profile.candidate_boundary_rows,
    ),
  );

  const lineageStrip = document.createElement("section");
  lineageStrip.className = "document-extraction-lineage-strip";
  lineageStrip.innerHTML = `
    <div class="panel-heading">
      <p class="eyebrow">Lineage strip</p>
      <h3>upload object version -> extraction run -> evidence item -> candidate facts</h3>
    </div>
  `;
  const lineageList = document.createElement("div");
  lineageList.className = "document-extraction-lineage-strip__list";
  profile.lineage_rows.forEach((row) => {
    const card = document.createElement("article");
    card.className = "document-extraction-lineage-card";
    card.innerHTML = `
      <strong>${row.label}</strong>
      <p>${row.detail}</p>
    `;
    lineageList.append(card);
  });
  lineageStrip.append(lineageList);
  container.append(lineageStrip);
  return container;
}

function renderDocumentExtractionInspector(board, environment, profile) {
  elements.drawer.dataset.state = "open";
  elements.drawerClose.hidden = true;
  elements.drawerTitle.textContent = profile.label;

  const container = document.createElement("div");
  container.className = "atlas-inspector";

  const fields = document.createElement("div");
  fields.className = "field-list";
  fields.append(
    createFieldRow("Profile ref", profile.profile_ref, {
      monospace: true,
      copyValue: profile.profile_ref,
      copyLabel: "Copy ref",
    }),
    createFieldRow("Environment", environment.label),
    createFieldRow("Selection posture", board.selection_posture_label, {
      monospace: true,
    }),
  );

  const thresholdSection = document.createElement("section");
  thresholdSection.className = "checkpoint-card";
  thresholdSection.innerHTML = `
    <p class="eyebrow">Threshold policy</p>
    <h3>Threshold policy</h3>
  `;
  const thresholdList = document.createElement("ul");
  thresholdList.className = "note-list";
  profile.threshold_rows.forEach((row) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <strong>${row.label}</strong>
      <span>${row.detail}</span>
    `;
    thresholdList.append(item);
  });
  thresholdSection.append(thresholdList);

  const lineageSection = document.createElement("section");
  lineageSection.className = "checkpoint-card";
  lineageSection.innerHTML = `
    <p class="eyebrow">Lineage requirements</p>
    <h3>Lineage requirements</h3>
  `;
  const lineageList = document.createElement("ul");
  lineageList.className = "note-list";
  profile.lineage_rows.forEach((row) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <strong>${row.label}</strong>
      <span>${row.detail}</span>
    `;
    lineageList.append(item);
  });
  lineageSection.append(lineageList);

  const notesSection = document.createElement("section");
  notesSection.className = "checkpoint-card";
  notesSection.innerHTML = `
    <p class="eyebrow">Processor and profile pinning</p>
    <h3>Processor and profile pinning</h3>
  `;
  const notesList = document.createElement("ul");
  notesList.className = "note-list";
  [board.truth_boundary_statement, ...profile.inspector_notes].forEach((note) => {
    const item = document.createElement("li");
    item.textContent = note;
    notesList.append(item);
  });
  notesSection.append(notesList);

  const sourceSection = document.createElement("section");
  sourceSection.className = "checkpoint-card";
  sourceSection.innerHTML = `
    <p class="eyebrow">Source refs</p>
    <h3>Source refs</h3>
  `;
  const sourceList = document.createElement("ul");
  sourceList.className = "note-list";
  profile.source_refs.forEach((row) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <strong>${row.rationale}</strong>
      <span class="monospace">${row.source_ref}</span>
    `;
    sourceList.append(item);
  });
  sourceSection.append(sourceList);

  container.append(fields, thresholdSection, lineageSection, notesSection, sourceSection);
  elements.drawerBody.replaceChildren(container);
}

function renderDocumentExtractionGovernanceBoard(board) {
  const environment = resolveActiveDocumentExtractionEnvironment(board);
  const profile = resolveActiveDocumentExtractionProfile(board);
  if (!environment || !profile) {
    renderError(
      new Error("Document extraction governance board is missing required data."),
    );
    return;
  }
  renderDocumentExtractionTopBar(board, environment, profile);
  renderDocumentExtractionRail(board, profile);
  elements.runSummary.replaceChildren(
    renderDocumentExtractionSummary(board, environment, profile),
  );
  elements.stepList.className = "document-extraction-canvas";
  elements.stepList.replaceChildren(renderDocumentExtractionCanvas(profile));
  renderDocumentExtractionInspector(board, environment, profile);
}

function resolveActiveUploadSafetyEnvironment(board) {
  return (
    board.environment_options.find(
      (option) => option.environment_ref === state.activeUploadSafetyEnvironmentRef,
    ) ||
    board.environment_options.find(
      (option) => option.environment_ref === board.active_environment_ref,
    ) ||
    board.environment_options[0] ||
    null
  );
}

function resolveActiveUploadSafetyScenario(board) {
  return (
    board.scenarios.find(
      (scenario) => scenario.scenario_ref === state.activeUploadSafetyScenarioRef,
    ) ||
    board.scenarios[0] ||
    null
  );
}

function uploadSafetyStatusDataValue(statusLabel) {
  if (statusLabel === "Coverage Ready") {
    return "ACTIVE_AND_RUNTIME_VERIFIED";
  }
  if (statusLabel === "Review Required") {
    return "MANUAL_CHECKPOINT_REQUIRED";
  }
  return "SKIPPED_AS_ALREADY_PRESENT";
}

function renderUploadSafetyTopBar(board, environment, scenario) {
  elements.providerBadge.textContent = board.provider_monogram;
  elements.runTitle.textContent = board.provider_label;
  elements.runStatus.textContent = board.selection_posture_label;
  elements.runStatus.dataset.status = "MANUAL_CHECKPOINT_REQUIRED";
  elements.environmentControl.hidden = false;
  elements.environmentChipWrap.hidden = true;
  elements.environmentSelect.replaceChildren(
    ...board.environment_options.map((option) => {
      const selectOption = document.createElement("option");
      selectOption.value = option.environment_ref;
      selectOption.textContent = option.label;
      selectOption.selected = option.environment_ref === environment.environment_ref;
      return selectOption;
    }),
  );
  elements.environmentSelect.disabled = false;
  elements.environmentSelect.onchange = () => {
    state.activeUploadSafetyEnvironmentRef = elements.environmentSelect.value;
    renderUploadIntakeSafetyBoard(board);
  };
  elements.environmentHint.textContent = environment.summary;
  document.title = `Provisioning Viewer - ${scenario.label}`;
}

function renderUploadSafetyRail(board, activeScenario) {
  elements.runRail.setAttribute("aria-label", "Upload intake scenarios");
  elements.runList.className = "upload-intake-scenario-rail-list";
  elements.railEyebrow.textContent = "Scenario rail";
  elements.railTitle.textContent = "Upload classes and hazards";
  elements.mainEyebrow.textContent = "Intake safety";
  elements.mainTitle.textContent = activeScenario.label;

  elements.runList.replaceChildren(
    ...board.scenarios.map((scenario) => {
      const listItem = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute(
        "aria-current",
        scenario.scenario_ref === activeScenario.scenario_ref ? "true" : "false",
      );
      button.innerHTML = `
        <div class="upload-intake-scenario-rail__title">
          <strong>${scenario.label}</strong>
          <span class="status-chip" data-status="${uploadSafetyStatusDataValue(scenario.status_label)}">${scenario.status_label}</span>
        </div>
        <div class="upload-intake-scenario-rail__meta">
          <span class="meta-note">${scenario.summary}</span>
          <span class="monospace">${scenario.scenario_ref}</span>
        </div>
      `;
      button.addEventListener("click", () => {
        state.activeUploadSafetyScenarioRef = scenario.scenario_ref;
        renderUploadIntakeSafetyBoard(board);
      });
      listItem.append(button);
      return listItem;
    }),
  );
}

function renderUploadSafetySummary(board, environment, scenario) {
  const section = document.createElement("section");
  section.className = "atlas-summary";
  section.innerHTML = `
    <div class="atlas-summary__lead">
      <div>
        <p class="eyebrow">Intake safety posture</p>
        <h2>${scenario.summary}</h2>
        <p class="ledger-note">${environment.summary}</p>
      </div>
      <div class="chip-row"></div>
    </div>
  `;

  const chipRow = section.querySelector(".chip-row");
  chipRow.append(
    createChip(board.selection_posture_label, "warning"),
    createChip(environment.label, "neutral"),
    createChip(scenario.status_label, statusTone(uploadSafetyStatusDataValue(scenario.status_label))),
  );

  return section;
}

function renderUploadSafetyColumn(title, eyebrow, rows) {
  const section = document.createElement("section");
  section.className = "upload-intake-column";
  section.innerHTML = `
    <div class="panel-heading">
      <p class="eyebrow">${eyebrow}</p>
      <h3>${title}</h3>
    </div>
  `;

  const list = document.createElement("div");
  list.className = "upload-intake-column__list";
  rows.forEach((row) => {
    const card = document.createElement("article");
    card.className = "upload-intake-card";
    card.innerHTML = `
      <strong>${row.label}</strong>
      <p>${row.detail}</p>
    `;
    list.append(card);
  });
  section.append(list);
  return section;
}

function renderUploadSafetyCanvas(scenario) {
  const container = document.createElement("div");
  container.className = "upload-intake-conveyor";

  container.append(
    renderUploadSafetyColumn("Received", "Received", scenario.received_rows),
    renderUploadSafetyColumn("Transferred", "Transferred", scenario.transferred_rows),
    renderUploadSafetyColumn("Scan Pending", "Scan Pending", scenario.scan_pending_rows),
    renderUploadSafetyColumn("Clean", "Clean", scenario.clean_rows),
    renderUploadSafetyColumn("Rejected", "Rejected", scenario.rejected_rows),
    renderUploadSafetyColumn("Quarantined", "Quarantined", scenario.quarantined_rows),
  );

  return container;
}

function renderUploadSafetyInspector(board, environment, scenario) {
  elements.drawer.dataset.state = "open";
  elements.drawerClose.hidden = true;
  elements.drawerTitle.textContent = scenario.label;

  const container = document.createElement("div");
  container.className = "atlas-inspector";

  const fields = document.createElement("div");
  fields.className = "field-list";
  fields.append(
    createFieldRow("Scenario ref", scenario.scenario_ref, {
      monospace: true,
      copyValue: scenario.scenario_ref,
      copyLabel: "Copy ref",
    }),
    createFieldRow("Environment", environment.label),
    createFieldRow("Selection posture", board.selection_posture_label, {
      monospace: true,
    }),
  );

  const mappingSection = document.createElement("section");
  mappingSection.className = "checkpoint-card";
  mappingSection.innerHTML = `
    <p class="eyebrow">Mapping rules</p>
    <h3>Mapping rules</h3>
  `;
  const mappingList = document.createElement("ul");
  mappingList.className = "note-list";
  scenario.mapping_rows.forEach((row) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <strong>${row.label}</strong>
      <span>${row.detail}</span>
    `;
    mappingList.append(item);
  });
  mappingSection.append(mappingList);

  const lifecycleSection = document.createElement("section");
  lifecycleSection.className = "checkpoint-card";
  lifecycleSection.innerHTML = `
    <p class="eyebrow">Lifecycle posture</p>
    <h3>Lifecycle posture</h3>
  `;
  const lifecycleList = document.createElement("ul");
  lifecycleList.className = "note-list";
  scenario.lifecycle_rows.forEach((row) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <strong>${row.label}</strong>
      <span>${row.detail}</span>
    `;
    lifecycleList.append(item);
  });
  lifecycleSection.append(lifecycleList);

  const releaseSection = document.createElement("section");
  releaseSection.className = "checkpoint-card";
  releaseSection.innerHTML = `
    <p class="eyebrow">Release authority</p>
    <h3>Release authority</h3>
  `;
  const releaseList = document.createElement("ul");
  releaseList.className = "note-list";
  scenario.release_rows.forEach((row) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <strong>${row.label}</strong>
      <span>${row.detail}</span>
    `;
    releaseList.append(item);
  });
  releaseSection.append(releaseList);

  const notesSection = document.createElement("section");
  notesSection.className = "checkpoint-card";
  notesSection.innerHTML = `
    <p class="eyebrow">Safety notes</p>
    <h3>Safety notes</h3>
  `;
  const notesList = document.createElement("ul");
  notesList.className = "note-list";
  [board.truth_boundary_statement, ...scenario.inspector_notes].forEach((note) => {
    const item = document.createElement("li");
    item.textContent = note;
    notesList.append(item);
  });
  notesSection.append(notesList);

  const sourceSection = document.createElement("section");
  sourceSection.className = "checkpoint-card";
  sourceSection.innerHTML = `
    <p class="eyebrow">Source refs</p>
    <h3>Source refs</h3>
  `;
  const sourceList = document.createElement("ul");
  sourceList.className = "note-list";
  scenario.source_refs.forEach((row) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <strong>${row.rationale}</strong>
      <span class="monospace">${row.source_ref}</span>
    `;
    sourceList.append(item);
  });
  sourceSection.append(sourceList);

  container.append(
    fields,
    mappingSection,
    lifecycleSection,
    releaseSection,
    notesSection,
    sourceSection,
  );
  elements.drawerBody.replaceChildren(container);
}

function renderUploadIntakeSafetyBoard(board) {
  const environment = resolveActiveUploadSafetyEnvironment(board);
  const scenario = resolveActiveUploadSafetyScenario(board);
  if (!environment || !scenario) {
    renderError(new Error("Upload intake safety board is missing required data."));
    return;
  }
  renderUploadSafetyTopBar(board, environment, scenario);
  renderUploadSafetyRail(board, scenario);
  elements.runSummary.replaceChildren(
    renderUploadSafetySummary(board, environment, scenario),
  );
  elements.stepList.className = "upload-intake-conveyor";
  elements.stepList.replaceChildren(renderUploadSafetyCanvas(scenario));
  renderUploadSafetyInspector(board, environment, scenario);
}

function resolveActivePortalCheckpointScenario(board) {
  const activeScenario =
    board.scenarios.find(
      (scenario) =>
        scenario.scenario_ref === state.activePortalCheckpointScenarioRef,
    ) || board.scenarios[0] || null;
  if (activeScenario) {
    state.activePortalCheckpointScenarioRef = activeScenario.scenario_ref;
  }
  return activeScenario;
}

function portalCheckpointStatusDataValue(resumeReadinessLabel) {
  if (resumeReadinessLabel === "Expired until reopened") {
    return "BLOCKED_BY_POLICY";
  }
  return "MANUAL_CHECKPOINT_REQUIRED";
}

function renderPortalCheckpointTopBar(board, scenario) {
  elements.providerBadge.textContent = board.provider_monogram;
  elements.runTitle.textContent = board.provider_label;
  elements.runStatus.textContent = scenario.resume_readiness_label;
  elements.runStatus.dataset.status = portalCheckpointStatusDataValue(
    scenario.resume_readiness_label,
  );
  elements.environmentControl.hidden = true;
  elements.environmentChipWrap.hidden = false;
  elements.environmentChip.textContent = scenario.environment_label;
  elements.environmentChip.dataset.status = portalCheckpointStatusDataValue(
    scenario.resume_readiness_label,
  );
  elements.environmentHint.textContent = board.truth_boundary_statement;
  document.title = `Provisioning Viewer - ${scenario.label}`;
}

function renderPortalCheckpointRail(board, activeScenario) {
  elements.runRail.setAttribute(
    "aria-label",
    "Checkpoint families and portal runs",
  );
  elements.runList.className = "portal-checkpoint-rail-list";
  elements.railEyebrow.textContent = "Scenario rail";
  elements.railTitle.textContent = "Checkpoint families";
  elements.mainEyebrow.textContent = "Pause and resume ledger";
  elements.mainTitle.textContent = activeScenario.label;

  elements.runList.replaceChildren(
    ...board.scenarios.map((scenario) => {
      const listItem = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute(
        "aria-current",
        scenario.scenario_ref === activeScenario.scenario_ref ? "true" : "false",
      );
      button.innerHTML = `
        <div class="portal-checkpoint-rail__title">
          <strong>${scenario.label}</strong>
          <span class="status-chip" data-status="${portalCheckpointStatusDataValue(scenario.resume_readiness_label)}">${scenario.checkpoint_reason_code}</span>
        </div>
        <div class="portal-checkpoint-rail__meta">
          <span class="meta-note">${scenario.summary}</span>
          <span class="monospace">${scenario.provider_monogram}</span>
        </div>
      `;
      button.addEventListener("click", () => {
        state.activePortalCheckpointScenarioRef = scenario.scenario_ref;
        renderPortalCheckpointAtlas(board);
      });
      listItem.append(button);
      return listItem;
    }),
  );
}

function renderPortalCheckpointSummary(board, scenario) {
  const section = document.createElement("section");
  section.className = "atlas-summary";
  section.innerHTML = `
    <div class="atlas-summary__lead">
      <div>
        <p class="eyebrow">Checkpoint posture</p>
        <h2>${scenario.summary}</h2>
        <p class="ledger-note">${board.truth_boundary_statement}</p>
      </div>
      <div class="chip-row"></div>
    </div>
  `;

  const chipRow = section.querySelector(".chip-row");
  chipRow.append(
    createChip(scenario.provider_label, "neutral"),
    createChip(scenario.checkpoint_severity_label, "warning"),
    createChip(
      scenario.resume_readiness_label,
      scenario.resume_readiness_label === "Expired until reopened"
        ? "danger"
        : "warning",
    ),
  );

  const notes = document.createElement("ul");
  notes.className = "note-list";
  board.notes.forEach((note) => {
    const item = document.createElement("li");
    item.textContent = note;
    notes.append(item);
  });
  section.append(notes);

  return section;
}

function renderPortalCheckpointStage(title, eyebrow, rows, options = {}) {
  const section = document.createElement("section");
  section.className = "portal-checkpoint-stage";
  section.innerHTML = `
    <div class="panel-heading">
      <p class="eyebrow">${eyebrow}</p>
      <h3>${title}</h3>
    </div>
  `;

  const list = document.createElement("div");
  list.className = "portal-checkpoint-stage__list";
  if (options.testId) {
    list.dataset.testid = options.testId;
  }
  rows.forEach((row) => {
    const card = document.createElement("article");
    card.className = "portal-checkpoint-card";
    card.innerHTML = `
      <strong>${row.label}</strong>
      <p>${row.detail}</p>
    `;
    list.append(card);
  });
  section.append(list);
  return section;
}

function renderPortalCheckpointCanvas(scenario) {
  const container = document.createElement("div");
  container.className = "portal-checkpoint-timeline";
  container.dataset.testid = "portal-checkpoint-timeline";

  container.append(
    renderPortalCheckpointStage(
      "Automation Path",
      "Automation Path",
      scenario.automation_path_rows,
    ),
    renderPortalCheckpointStage(
      "Checkpoint Encountered",
      "Checkpoint Encountered",
      scenario.checkpoint_rows,
    ),
    renderPortalCheckpointStage("Human Step", "Human Step", scenario.human_step_rows),
    renderPortalCheckpointStage(
      "Resume Verification",
      "Resume Verification",
      scenario.resume_rows,
    ),
    renderPortalCheckpointStage("Outcome", "Outcome", scenario.outcome_rows),
  );

  return container;
}

function renderPortalCheckpointInspector(board, scenario) {
  elements.drawer.dataset.state = "open";
  elements.drawerClose.hidden = true;
  elements.drawerTitle.textContent = scenario.label;

  const container = document.createElement("div");
  container.className = "atlas-inspector";

  const fields = document.createElement("div");
  fields.className = "field-list";

  const reasonField = document.createElement("article");
  reasonField.className = "field-row";
  reasonField.innerHTML = `
    <strong class="meta-label">Checkpoint reason</strong>
  `;
  const reasonValue = document.createElement("div");
  reasonValue.className = "field-row__value";
  const reasonChip = createChip(
    scenario.checkpoint_reason_code,
    scenario.resume_readiness_label === "Expired until reopened"
      ? "danger"
      : "warning",
  );
  reasonChip.dataset.testid = "checkpoint-reason-chip";
  reasonValue.append(reasonChip);
  reasonField.append(reasonValue);

  fields.append(
    createFieldRow("Scenario ref", scenario.scenario_ref, {
      monospace: true,
      copyValue: scenario.scenario_ref,
      copyLabel: "Copy ref",
    }),
    createFieldRow("Provider", scenario.provider_label),
    createFieldRow("Environment", scenario.environment_label),
    createFieldRow("Resume readiness", scenario.resume_readiness_label),
    reasonField,
  );

  const evidenceSection = document.createElement("section");
  evidenceSection.className = "checkpoint-card";
  evidenceSection.innerHTML = `
    <p class="eyebrow">Evidence posture</p>
    <h3>Evidence and resume inspector</h3>
  `;
  const evidenceList = document.createElement("ul");
  evidenceList.className = "note-list";
  evidenceList.dataset.testid = "evidence-list";
  scenario.evidence_rows.forEach((row) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <strong>${row.label}</strong>
      <span>${row.detail}</span>
    `;
    evidenceList.append(item);
  });
  evidenceSection.append(evidenceList);

  const redactionSection = document.createElement("section");
  redactionSection.className = "checkpoint-card";
  redactionSection.innerHTML = `
    <p class="eyebrow">Redaction posture</p>
    <h3>Redaction posture</h3>
  `;
  const redactionList = document.createElement("ul");
  redactionList.className = "note-list";
  scenario.redaction_rows.forEach((row) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <strong>${row.label}</strong>
      <span>${row.detail}</span>
    `;
    redactionList.append(item);
  });
  redactionSection.append(redactionList);

  const resumeSection = document.createElement("section");
  resumeSection.className = "checkpoint-card";
  resumeSection.innerHTML = `
    <p class="eyebrow">Resume preconditions</p>
    <h3>Resume preconditions</h3>
  `;
  const resumeList = document.createElement("ul");
  resumeList.className = "note-list";
  resumeList.dataset.testid = "resume-preconditions-list";
  scenario.resume_precondition_rows.forEach((row) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <strong>${row.label}</strong>
      <span>${row.detail}</span>
    `;
    resumeList.append(item);
  });
  resumeSection.append(resumeList);

  const notesSection = document.createElement("section");
  notesSection.className = "checkpoint-card";
  notesSection.innerHTML = `
    <p class="eyebrow">Inspector notes</p>
    <h3>Inspector notes</h3>
  `;
  const notesList = document.createElement("ul");
  notesList.className = "note-list";
  [board.truth_boundary_statement, ...scenario.outcome_rows.map((row) => row.detail)].forEach(
    (note) => {
      const item = document.createElement("li");
      item.textContent = note;
      notesList.append(item);
    },
  );
  notesSection.append(notesList);

  const sourceSection = document.createElement("section");
  sourceSection.className = "checkpoint-card";
  sourceSection.innerHTML = `
    <p class="eyebrow">Source refs</p>
    <h3>Source refs</h3>
  `;
  const sourceList = document.createElement("ul");
  sourceList.className = "note-list";
  scenario.source_refs.forEach((row) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <strong>${row.rationale}</strong>
      <span class="monospace">${row.source_ref}</span>
    `;
    sourceList.append(item);
  });
  sourceSection.append(sourceList);

  container.append(
    fields,
    evidenceSection,
    redactionSection,
    resumeSection,
    notesSection,
    sourceSection,
  );
  elements.drawerBody.replaceChildren(container);
}

function renderPortalCheckpointAtlas(board) {
  const scenario = resolveActivePortalCheckpointScenario(board);
  if (!scenario) {
    renderError(new Error("Portal checkpoint atlas is missing scenario data."));
    return;
  }
  renderPortalCheckpointTopBar(board, scenario);
  renderPortalCheckpointRail(board, scenario);
  elements.runSummary.replaceChildren(renderPortalCheckpointSummary(board, scenario));
  elements.stepList.className = "portal-checkpoint-timeline";
  elements.stepList.replaceChildren(renderPortalCheckpointCanvas(scenario));
  renderPortalCheckpointInspector(board, scenario);
}

function resolveActiveSupportScenario(board) {
  return (
    board.scenarios.find(
      (scenario) => scenario.scenario_ref === state.activeSupportScenarioRef,
    ) ||
    board.scenarios[0] ||
    null
  );
}

function supportStatusDataValue(modeLabel) {
  if (modeLabel === "Selected") {
    return "ACTIVE_AND_RUNTIME_VERIFIED";
  }
  if (modeLabel === "Selected with Gaps") {
    return "MANUAL_CHECKPOINT_REQUIRED";
  }
  return "SKIPPED_AS_ALREADY_PRESENT";
}

function renderSupportTopBar(board, scenario) {
  elements.providerBadge.textContent = board.provider_monogram;
  elements.runTitle.textContent = board.provider_label;
  elements.runStatus.textContent = board.support_mode_label;
  elements.runStatus.dataset.status = supportStatusDataValue(
    board.support_mode_label,
  );
  elements.environmentControl.hidden = true;
  elements.environmentChipWrap.hidden = false;
  elements.environmentChip.textContent = board.environment_label;
  elements.environmentChip.dataset.status = supportStatusDataValue(
    board.support_mode_label,
  );
  elements.environmentHint.textContent = board.truth_boundary_statement;
  document.title = `Provisioning Viewer - ${scenario.label}`;
}

function renderSupportRail(board, activeScenario) {
  elements.runRail.setAttribute("aria-label", "Support mapping scenarios");
  elements.runList.className = "support-scenario-rail-list";
  elements.railEyebrow.textContent = "Scenario rail";
  elements.railTitle.textContent = "Help scenarios";
  elements.mainEyebrow.textContent = "Context mapping";
  elements.mainTitle.textContent = activeScenario.label;

  elements.runList.replaceChildren(
    ...board.scenarios.map((scenario) => {
      const listItem = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute(
        "aria-current",
        scenario.scenario_ref === activeScenario.scenario_ref ? "true" : "false",
      );
      button.innerHTML = `
        <div class="support-scenario-rail__title">
          <strong>${scenario.label}</strong>
          <span class="status-chip" data-status="${supportStatusDataValue(scenario.status_label)}">${scenario.status_label}</span>
        </div>
        <div class="support-scenario-rail__meta">
          <span class="meta-note">${scenario.recommended_channel_label}</span>
          <span class="monospace">${scenario.scenario_ref}</span>
        </div>
      `;
      button.addEventListener("click", () => {
        state.activeSupportScenarioRef = scenario.scenario_ref;
        renderSupportContextMappingBoard(board);
      });
      listItem.append(button);
      return listItem;
    }),
  );
}

function renderSupportSummary(board, scenario) {
  const section = document.createElement("section");
  section.className = "atlas-summary";
  section.innerHTML = `
    <div class="atlas-summary__lead">
      <div>
        <p class="eyebrow">Context handoff posture</p>
        <h2>${scenario.summary}</h2>
        <p class="ledger-note">${board.notes[0]}</p>
      </div>
      <div class="chip-row"></div>
    </div>
  `;

  const chipRow = section.querySelector(".chip-row");
  chipRow.append(
    createChip(board.support_mode_label, "neutral"),
    createChip(scenario.recommended_channel_label, "neutral"),
    createChip(board.selection_posture.replaceAll("_", " "), "warning"),
  );

  return section;
}

function renderSupportColumn(title, eyebrow, rows, valueBuilder) {
  const section = document.createElement("section");
  section.className = "support-mapping-column";
  section.innerHTML = `
    <div class="panel-heading">
      <p class="eyebrow">${eyebrow}</p>
      <h3>${title}</h3>
    </div>
  `;

  const list = document.createElement("div");
  list.className = "support-mapping-lattice";
  rows.forEach((row) => {
    const card = document.createElement("article");
    card.className = "support-mapping-card";
    valueBuilder(card, row);
    list.append(card);
  });
  section.append(list);
  return section;
}

function renderSupportCanvas(scenario) {
  const container = document.createElement("div");
  container.className = "support-mapping-canvas";

  container.append(
    renderSupportColumn(
      "Portal Context",
      "Portal Context",
      scenario.portal_context_rows,
      (card, row) => {
        card.innerHTML = `
          <strong>${row.label.replaceAll("_", " ")}</strong>
          <p>${row.detail}</p>
        `;
      },
    ),
    renderSupportColumn(
      "External Ticket Fields",
      "External Ticket Fields",
      scenario.external_ticket_rows,
      (card, row) => {
        card.innerHTML = `
          <strong>${row.label.replaceAll("_", " ")}</strong>
          <p>${row.detail}</p>
        `;
      },
    ),
    renderSupportColumn(
      "Return/Mirror Rules",
      "Return/Mirror Rules",
      scenario.return_mirror_rows,
      (card, row) => {
        card.innerHTML = `
          <strong>${row.label}</strong>
          <p>${row.detail}</p>
        `;
      },
    ),
  );

  return container;
}

function renderSupportInspector(board, scenario) {
  elements.drawer.dataset.state = "open";
  elements.drawerClose.hidden = true;
  elements.drawerTitle.textContent = scenario.label;

  const container = document.createElement("div");
  container.className = "atlas-inspector";

  const fields = document.createElement("div");
  fields.className = "field-list";
  fields.append(
    createFieldRow("Scenario ref", scenario.scenario_ref, {
      monospace: true,
      copyValue: scenario.scenario_ref,
      copyLabel: "Copy ref",
    }),
    createFieldRow("Recommended channel", scenario.recommended_channel_label),
    createFieldRow("Selection posture", board.selection_posture.replaceAll("_", " "), {
      monospace: true,
    }),
  );

  const privacySection = document.createElement("section");
  privacySection.className = "checkpoint-card";
  privacySection.innerHTML = `
    <p class="eyebrow">Privacy notes</p>
    <h3>Privacy notes</h3>
  `;
  const privacyList = document.createElement("ul");
  privacyList.className = "note-list";
  scenario.privacy_notes.forEach((note) => {
    const item = document.createElement("li");
    item.textContent = note;
    privacyList.append(item);
  });
  privacySection.append(privacyList);

  const webhookSection = document.createElement("section");
  webhookSection.className = "checkpoint-card";
  webhookSection.innerHTML = `
    <p class="eyebrow">Webhook posture</p>
    <h3>Webhook posture</h3>
  `;
  const webhookList = document.createElement("ul");
  webhookList.className = "note-list";
  scenario.webhook_rows.forEach((row) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <strong>${row.label}</strong>
      <span>${row.detail}</span>
    `;
    webhookList.append(item);
  });
  webhookSection.append(webhookList);

  const sourceSection = document.createElement("section");
  sourceSection.className = "checkpoint-card";
  sourceSection.innerHTML = `
    <p class="eyebrow">Source refs</p>
    <h3>Source refs</h3>
  `;
  const sourceList = document.createElement("ul");
  sourceList.className = "note-list";
  scenario.source_refs.forEach((row) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <strong>${row.rationale}</strong>
      <span class="monospace">${row.source_ref}</span>
    `;
    sourceList.append(item);
  });
  sourceSection.append(sourceList);

  const notesSection = document.createElement("section");
  notesSection.className = "checkpoint-card";
  notesSection.innerHTML = `
    <p class="eyebrow">Inspector notes</p>
    <h3>Inspector notes</h3>
  `;
  const notesList = document.createElement("ul");
  notesList.className = "note-list";
  scenario.inspector_notes.forEach((note) => {
    const item = document.createElement("li");
    item.textContent = note;
    notesList.append(item);
  });
  notesSection.append(notesList);

  container.append(fields, privacySection, webhookSection, sourceSection, notesSection);
  elements.drawerBody.replaceChildren(container);
}

function renderSupportContextMappingBoard(board) {
  const activeScenario = resolveActiveSupportScenario(board);
  if (!activeScenario) {
    renderError(new Error("Support context mapping board is missing scenario data."));
    return;
  }
  renderSupportTopBar(board, activeScenario);
  renderSupportRail(board, activeScenario);
  elements.runSummary.replaceChildren(renderSupportSummary(board, activeScenario));
  elements.stepList.className = "support-mapping-canvas";
  elements.stepList.replaceChildren(renderSupportCanvas(activeScenario));
  renderSupportInspector(board, activeScenario);
}

function resolveActiveNotificationTemplate(atlas) {
  return (
    atlas.templates.find(
      (template) => template.template_ref === state.activeNotificationTemplateRef,
    ) ||
    atlas.templates.find(
      (template) => template.template_ref === atlas.selectedTemplateRef,
    ) ||
    atlas.templates[0] ||
    null
  );
}

function resolveActiveNotificationLifecycle(atlas, template) {
  if (!template) {
    return null;
  }
  return (
    template.lifecycle_rail.find(
      (stage) => stage.stage_ref === state.activeNotificationLifecycleRef,
    ) ||
    template.lifecycle_rail.find(
      (stage) => stage.stage_ref === atlas.selectedLifecycleRef,
    ) ||
    template.lifecycle_rail[0] ||
    null
  );
}

function renderNotificationTopBar(atlas, template) {
  elements.providerBadge.textContent = atlas.providerMonogram;
  elements.runTitle.textContent = template.label;
  elements.runStatus.textContent = template.sender_stream_label;
  elements.runStatus.dataset.status = "RUNNING";
  elements.environmentControl.hidden = true;
  elements.environmentChipWrap.hidden = false;
  elements.environmentChip.textContent = template.selected_environment_label;
  elements.environmentChip.dataset.status = "RUNNING";
  elements.environmentHint.textContent = atlas.truthBoundaryStatement;
  document.title = `Provisioning Viewer - ${template.label}`;
}

function renderNotificationRail(atlas, activeTemplate) {
  elements.runRail.setAttribute("aria-label", "Notification template families");
  elements.runList.className = "notification-template-rail-list";
  elements.railEyebrow.textContent = "Template families";
  elements.railTitle.textContent = "Notification templates";
  elements.mainEyebrow.textContent = "Preview and provenance";
  elements.mainTitle.textContent = activeTemplate.label;

  elements.runList.replaceChildren(
    ...atlas.templates.map((template) => {
      const listItem = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute(
        "aria-current",
        template.template_ref === activeTemplate.template_ref ? "true" : "false",
      );
      button.innerHTML = `
        <div class="application-list__title">
          <strong>${template.label}</strong>
          <span class="status-chip" data-status="RUNNING">${formatTitleLabel(
            template.notification_family,
          )}</span>
        </div>
        <div class="application-list__meta">
          <span class="meta-note">${template.sender_stream_label}</span>
          <span class="monospace">${template.template_ref}</span>
        </div>
      `;
      button.addEventListener("click", () => {
        state.activeNotificationTemplateRef = template.template_ref;
        state.activeNotificationLifecycleRef = null;
        renderNotificationCopyAtlas(atlas);
      });
      listItem.append(button);
      return listItem;
    }),
  );
}

function renderNotificationSummary(atlas, template, activeLifecycle) {
  const section = document.createElement("section");
  section.className = "notification-summary";
  section.innerHTML = `
    <div class="atlas-summary__lead">
      <div>
        <p class="eyebrow">Lifecycle rail</p>
        <h2>${template.preview.subject}</h2>
        <p class="ledger-note">${atlas.notes[0]}</p>
      </div>
      <div class="chip-row"></div>
    </div>
  `;

  const chipRow = section.querySelector(".chip-row");
  chipRow.append(
    createChip(template.sender_stream_label, "neutral"),
    createChip(template.selected_environment_label, "neutral"),
    createChip(atlas.selectionPosture.replaceAll("_", " "), "warning"),
  );

  const rail = document.createElement("div");
  rail.className = "notification-lifecycle-rail";
  template.lifecycle_rail.forEach((stage) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "notification-lifecycle-rail__button";
    button.setAttribute(
      "aria-pressed",
      stage.stage_ref === activeLifecycle?.stage_ref ? "true" : "false",
    );
    button.innerHTML = `
      <strong>${stage.label}</strong>
      <span>${stage.summary}</span>
    `;
    button.addEventListener("click", () => {
      state.activeNotificationLifecycleRef = stage.stage_ref;
      renderNotificationCopyAtlas(atlas);
    });
    rail.append(button);
  });

  section.append(rail);
  return section;
}

function renderNotificationCanvas(template, activeLifecycle) {
  const container = document.createElement("div");
  container.className = "notification-copy-canvas";

  const preview = document.createElement("section");
  preview.className = "notification-preview";
  preview.innerHTML = `
    <div class="panel-heading">
      <p class="eyebrow">Email preview</p>
      <h3>Email preview</h3>
    </div>
  `;

  const previewCard = document.createElement("article");
  previewCard.className = "notification-preview__card";
  previewCard.innerHTML = `
    <p class="meta-label">Subject</p>
    <h4>${template.preview.subject}</h4>
    <p class="meta-note">${template.preview.preheader}</p>
    <div class="notification-preview__body">
      <p class="notification-preview__headline">${template.preview.headline}</p>
    </div>
  `;
  const bodyWrap = previewCard.querySelector(".notification-preview__body");
  template.preview.body_paragraphs.forEach((paragraph) => {
    const p = document.createElement("p");
    p.textContent = paragraph;
    bodyWrap.append(p);
  });
  const cta = document.createElement("a");
  cta.href = template.preview.cta_route;
  cta.className = "notification-preview__cta";
  cta.textContent = template.preview.cta_label;
  bodyWrap.append(cta);
  template.preview.footer_paragraphs.forEach((paragraph) => {
    const p = document.createElement("p");
    p.className = "meta-note";
    p.textContent = paragraph;
    bodyWrap.append(p);
  });
  preview.append(previewCard);

  const provenance = document.createElement("section");
  provenance.className = "notification-provenance";
  provenance.innerHTML = `
    <div class="panel-heading">
      <p class="eyebrow">Continuity and merge provenance</p>
      <h3>Continuity and merge provenance</h3>
    </div>
  `;

  const continuityList = document.createElement("div");
  continuityList.className = "notification-provenance__continuity";
  template.continuity_rows.forEach((row) => {
    continuityList.append(
      createFieldRow(row.label, row.value, {
        monospace: true,
      }),
    );
  });

  const mergeList = document.createElement("ul");
  mergeList.className = "note-list";
  template.merge_provenance.forEach((entry) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <strong>${entry.variable_ref}</strong>
      <span>${entry.sample_value}</span>
      <span class="meta-note">${entry.source_ref}</span>
    `;
    mergeList.append(item);
  });

  const stageCallout = document.createElement("section");
  stageCallout.className = "checkpoint-card";
  stageCallout.innerHTML = `
    <p class="eyebrow">Lifecycle focus</p>
    <h3>${activeLifecycle?.label ?? "Lifecycle"}</h3>
    <p>${activeLifecycle?.summary ?? ""}</p>
  `;

  provenance.append(continuityList, mergeList, stageCallout);
  container.append(preview, provenance);
  return container;
}

function renderNotificationInspector(atlas, template) {
  elements.drawer.dataset.state = "open";
  elements.drawerClose.hidden = true;
  elements.drawerTitle.textContent = template.label;

  const container = document.createElement("div");
  container.className = "atlas-inspector";

  const fields = document.createElement("div");
  fields.className = "field-list";
  fields.append(
    createFieldRow("Template ref", template.template_ref, {
      monospace: true,
      copyValue: template.template_ref,
      copyLabel: "Copy ref",
    }),
    createFieldRow("Selected environment", template.selected_environment_label, {}),
    createFieldRow("Sender identity", template.sender_identity_label, {
      monospace: true,
    }),
  );

  const eventSection = document.createElement("section");
  eventSection.className = "checkpoint-card";
  eventSection.innerHTML = `
    <p class="eyebrow">Webhook events</p>
    <h3>Webhook events</h3>
  `;
  const eventList = document.createElement("ul");
  eventList.className = "note-list";
  atlas.webhookEvents
    .filter((event) => template.webhook_event_types.includes(event.provider_event_type))
    .forEach((event) => {
      const item = document.createElement("li");
      item.innerHTML = `
        <strong>${event.provider_event_type}</strong>
        <span>${event.enabled_by_default ? event.allowed_internal_updates.join(", ") : "Disabled by default"}</span>
      `;
      eventList.append(item);
    });
  eventSection.append(eventList);

  const callbackSection = document.createElement("section");
  callbackSection.className = "checkpoint-card";
  callbackSection.innerHTML = `
    <p class="eyebrow">Signed callback posture</p>
    <h3>Signed callback posture</h3>
    <p>Provider-native signatures are unavailable in the current adapter, so Taxat uses HTTPS, Basic Auth, a vault-bound custom header, replay windows, and idempotent duplicate handling.</p>
  `;

  const mappingSection = document.createElement("section");
  mappingSection.className = "checkpoint-card";
  mappingSection.innerHTML = `
    <p class="eyebrow">Provider mapping</p>
    <h3>Provider mapping</h3>
  `;
  const mappingList = document.createElement("ul");
  mappingList.className = "note-list";
  atlas.callbackRecords.forEach((record) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <strong>${record.product_environment_id}</strong>
      <span>${record.callback_url}</span>
      <span class="meta-note">${record.message_stream_ref}</span>
    `;
    mappingList.append(item);
  });
  mappingSection.append(mappingList);

  const privacySection = document.createElement("section");
  privacySection.className = "checkpoint-card";
  privacySection.innerHTML = `
    <p class="eyebrow">Privacy notes</p>
    <h3>Privacy notes</h3>
  `;
  const privacyList = document.createElement("ul");
  privacyList.className = "note-list";
  template.privacy_notes.forEach((note) => {
    const item = document.createElement("li");
    item.textContent = note;
    privacyList.append(item);
  });
  privacySection.append(privacyList);

  container.append(
    fields,
    eventSection,
    callbackSection,
    mappingSection,
    privacySection,
  );
  elements.drawerBody.replaceChildren(container);
}

function renderNotificationCopyAtlas(atlas) {
  const activeTemplate = resolveActiveNotificationTemplate(atlas);
  if (!activeTemplate) {
    renderError(new Error("Notification copy atlas is missing template data."));
    return;
  }
  const activeLifecycle = resolveActiveNotificationLifecycle(atlas, activeTemplate);
  renderNotificationTopBar(atlas, activeTemplate);
  renderNotificationRail(atlas, activeTemplate);
  elements.runSummary.replaceChildren(
    renderNotificationSummary(atlas, activeTemplate, activeLifecycle),
  );
  elements.stepList.className = "notification-copy-canvas";
  elements.stepList.replaceChildren(
    renderNotificationCanvas(activeTemplate, activeLifecycle),
  );
  renderNotificationInspector(atlas, activeTemplate);
}

function resolveActiveSecretEnvironment(board) {
  const environments = board.environments ?? [];
  if (!environments.length) {
    return null;
  }
  if (
    !state.activeSecretEnvironmentRef ||
    !environments.some(
      (environment) => environment.environment_ref === state.activeSecretEnvironmentRef,
    )
  ) {
    state.activeSecretEnvironmentRef =
      board.selectedEnvironmentRef ?? environments[0].environment_ref;
  }
  return (
    environments.find(
      (environment) => environment.environment_ref === state.activeSecretEnvironmentRef,
    ) ?? environments[0]
  );
}

function secretAliasesForEnvironment(board, environment) {
  return (board.aliases ?? []).filter((alias) =>
    alias.namespace_refs.some((namespaceRef) =>
      environment.namespace_refs.includes(namespaceRef),
    ),
  );
}

function resolveActiveSecretAlias(board, environment) {
  const aliases = secretAliasesForEnvironment(board, environment);
  if (!aliases.length) {
    return null;
  }
  if (
    !state.activeSecretAliasRef ||
    !aliases.some((alias) => alias.alias_ref === state.activeSecretAliasRef)
  ) {
    state.activeSecretAliasRef =
      board.selectedAliasRef && aliases.some((alias) => alias.alias_ref === board.selectedAliasRef)
        ? board.selectedAliasRef
        : aliases[0].alias_ref;
  }
  return aliases.find((alias) => alias.alias_ref === state.activeSecretAliasRef) ?? aliases[0];
}

function keyNodesForAlias(board, alias) {
  const byRef = new Map((board.keyNodes ?? []).map((node) => [node.node_ref, node]));
  const nodes = [];
  const active = byRef.get(alias.key_family_ref);
  if (active) {
    nodes.push(active);
    let parentRef = active.parent_ref;
    while (parentRef) {
      const parent = byRef.get(parentRef);
      if (!parent) {
        break;
      }
      nodes.unshift(parent);
      parentRef = parent.parent_ref;
    }
  }
  return nodes;
}

function resolveActiveSecretNode(board, alias) {
  const nodes = keyNodesForAlias(board, alias);
  if (!nodes.length) {
    return null;
  }
  if (
    !state.activeSecretNodeRef ||
    !nodes.some((node) => node.node_ref === state.activeSecretNodeRef)
  ) {
    state.activeSecretNodeRef = nodes[nodes.length - 1]?.node_ref ?? nodes[0].node_ref;
  }
  return nodes.find((node) => node.node_ref === state.activeSecretNodeRef) ?? nodes[0];
}

function grantTouchesAliasAndEnvironment(grant, alias, environment) {
  return (
    grant.alias_refs.includes(alias.alias_ref) &&
    grant.namespace_refs.some((namespaceRef) =>
      environment.namespace_refs.includes(namespaceRef),
    )
  );
}

function resolveActiveSecretGrant(board, alias, environment) {
  const grants = (board.accessGrants ?? []).filter((grant) =>
    grantTouchesAliasAndEnvironment(grant, alias, environment),
  );
  if (!grants.length) {
    return null;
  }
  if (
    !state.activeSecretGrantRef ||
    !grants.some((grant) => grant.grant_ref === state.activeSecretGrantRef)
  ) {
    state.activeSecretGrantRef = grants[0].grant_ref;
  }
  return grants.find((grant) => grant.grant_ref === state.activeSecretGrantRef) ?? grants[0];
}

function secretGrantRole(board, grant) {
  return (board.accessRoles ?? []).find((role) => role.role_ref === grant.role_ref) ?? null;
}

function aliasNamespaceForEnvironment(alias, environment) {
  return (
    alias.namespace_refs.find((namespaceRef) =>
      environment.namespace_refs.includes(namespaceRef),
    ) ?? alias.namespace_refs[0]
  );
}

function resolveActiveStorageEnvironment(board) {
  if (!state.activeStorageEnvironmentRef) {
    state.activeStorageEnvironmentRef =
      board.selectedEnvironmentRef ??
      board.environments?.[0]?.environment_ref ??
      null;
  }
  return (
    board.environments?.find(
      (environment) =>
        environment.environment_ref === state.activeStorageEnvironmentRef,
    ) ?? board.environments?.[0] ?? null
  );
}

function storageBucketsForEnvironment(board, environment) {
  return (board.buckets ?? []).filter(
    (bucket) => bucket.environment_ref === environment.environment_ref,
  );
}

function resolveActiveStorageBucket(board, environment) {
  const buckets = storageBucketsForEnvironment(board, environment);
  if (!buckets.length) {
    state.activeStorageBucketRef = null;
    return null;
  }
  if (
    !state.activeStorageBucketRef ||
    !buckets.some((bucket) => bucket.bucket_ref === state.activeStorageBucketRef)
  ) {
    state.activeStorageBucketRef =
      board.selectedBucketRef &&
      buckets.some((bucket) => bucket.bucket_ref === board.selectedBucketRef)
        ? board.selectedBucketRef
        : buckets[0].bucket_ref;
  }
  return (
    buckets.find((bucket) => bucket.bucket_ref === state.activeStorageBucketRef) ??
    buckets[0]
  );
}

function storageKeyFamiliesForBucket(board, bucket) {
  return (board.keyFamilies ?? []).filter(
    (family) => family.purpose_ref === bucket.purpose_ref,
  );
}

function storageLifecycleRulesForBucket(board, bucket) {
  return (board.lifecycleRules ?? []).filter(
    (rule) => rule.purpose_ref === bucket.purpose_ref,
  );
}

function storageEventRoutesForBucket(board, bucket) {
  return (board.eventRoutes ?? []).filter(
    (route) => route.purpose_ref === bucket.purpose_ref,
  );
}

function setActiveStorageBucketByPurpose(board, environment, purposeRef) {
  const match = storageBucketsForEnvironment(board, environment).find(
    (bucket) => bucket.purpose_ref === purposeRef,
  );
  if (match) {
    state.activeStorageBucketRef = match.bucket_ref;
  }
}

function resolveActiveStorageLifecycle(board, bucket) {
  const rules = storageLifecycleRulesForBucket(board, bucket);
  if (!rules.length) {
    state.activeStorageLifecycleRef = null;
    return null;
  }
  if (
    !state.activeStorageLifecycleRef ||
    !rules.some((rule) => rule.lifecycle_ref === state.activeStorageLifecycleRef)
  ) {
    state.activeStorageLifecycleRef =
      board.selectedLifecycleRef &&
      rules.some((rule) => rule.lifecycle_ref === board.selectedLifecycleRef)
        ? board.selectedLifecycleRef
        : rules[0].lifecycle_ref;
  }
  return (
    rules.find((rule) => rule.lifecycle_ref === state.activeStorageLifecycleRef) ??
    rules[0]
  );
}

function resolveActiveStorageEvent(board, bucket) {
  const routes = storageEventRoutesForBucket(board, bucket);
  if (!routes.length) {
    state.activeStorageEventRef = null;
    return null;
  }
  if (
    !state.activeStorageEventRef ||
    !routes.some((route) => route.route_ref === state.activeStorageEventRef)
  ) {
    state.activeStorageEventRef =
      board.selectedEventRef &&
      routes.some((route) => route.route_ref === board.selectedEventRef)
        ? board.selectedEventRef
        : routes[0].route_ref;
  }
  return (
    routes.find((route) => route.route_ref === state.activeStorageEventRef) ??
    routes[0]
  );
}

function renderStorageTopBar(board, environment) {
  elements.providerBadge.textContent = board.providerMonogram ?? "OBJ";
  elements.runTitle.textContent = `${board.providerDisplayName} atlas`;
  elements.runStatus.textContent = formatLabel(board.selectionPosture);
  elements.runStatus.dataset.status =
    board.selectionPosture === "PROVIDER_SELECTION_REQUIRED"
      ? "warning"
      : "success";
  elements.environmentControl.hidden = false;
  elements.environmentChipWrap.hidden = true;
  elements.environmentSelect.replaceChildren(
    ...(board.environments ?? []).map((entry) => {
      const option = document.createElement("option");
      option.value = entry.environment_ref;
      option.textContent = entry.label;
      option.selected = entry.environment_ref === environment.environment_ref;
      return option;
    }),
  );
  elements.environmentSelect.disabled = false;
  elements.environmentSelect.onchange = () => {
    state.activeStorageEnvironmentRef = elements.environmentSelect.value;
    state.activeStorageBucketRef = null;
    state.activeStorageLifecycleRef = null;
    state.activeStorageEventRef = null;
    renderStorageBucketTopologyBoard(board);
  };
  elements.environmentHint.textContent = board.isolationPostureLabel;
  document.title = `Provisioning Viewer - ${environment.label} object storage`;
}

function renderStorageRail(board, environment, activeBucket) {
  elements.runRail.setAttribute("aria-label", "Storage buckets and purpose zones");
  elements.runList.className = "storage-bucket-rail-list";
  elements.railEyebrow.textContent = "Bucket rail";
  elements.railTitle.textContent = "Purpose buckets";
  elements.mainEyebrow.textContent = "Storage atlas";
  elements.mainTitle.textContent = activeBucket.label;

  elements.runList.replaceChildren(
    ...storageBucketsForEnvironment(board, environment).map((bucket) => {
      const listItem = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute(
        "aria-current",
        bucket.bucket_ref === activeBucket.bucket_ref ? "true" : "false",
      );
      button.innerHTML = `
        <div class="storage-bucket-rail__title">
          <strong>${bucket.label}</strong>
          <span class="status-chip" data-status="${bucket.zone_ref === "QUARANTINE" ? "danger" : bucket.zone_ref === "DERIVED_EXPORT" ? "warning" : "SUCCEEDED"}">${formatLabel(bucket.zone_ref)}</span>
        </div>
        <div class="storage-bucket-rail__meta">
          <span class="monospace">${bucket.bucket_name}</span>
          <span class="meta-note">${formatLabel(bucket.direct_download_posture)}</span>
        </div>
      `;
      button.addEventListener("click", () => {
        state.activeStorageBucketRef = bucket.bucket_ref;
        state.activeStorageLifecycleRef = null;
        state.activeStorageEventRef = null;
        renderStorageBucketTopologyBoard(board);
      });
      listItem.append(button);
      return listItem;
    }),
  );
}

function renderStorageSummary(board, environment, activeBucket, activeLifecycle, activeEvent) {
  elements.runSummary.innerHTML = "";
  const container = document.createElement("div");
  container.className = "atlas-summary";
  container.innerHTML = `
    <div class="atlas-summary__lead">
      <div>
        <p class="eyebrow">Isolation posture</p>
        <h2>${environment.label}</h2>
        <p class="ledger-note">${board.summary}</p>
      </div>
      <div class="chip-row"></div>
    </div>
  `;
  const chipRow = container.querySelector(".chip-row");
  chipRow.append(
    createChip(board.isolationPostureLabel, "neutral"),
    createChip(activeBucket.label, activeBucket.zone_ref === "QUARANTINE" ? "warning" : "success"),
    createChip(activeLifecycle?.label ?? "Lifecycle", "warning"),
    createChip(activeEvent?.label ?? "Event", "neutral"),
  );
  const notes = document.createElement("ul");
  notes.className = "note-list";
  (board.notes ?? []).forEach((note) => {
    const item = document.createElement("li");
    item.textContent = note;
    notes.append(item);
  });
  elements.runSummary.append(container, notes);
}

function createStorageBucketCard(bucket, active, onSelect) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "storage-bucket-card";
  button.dataset.active = active ? "true" : "false";
  button.setAttribute("aria-pressed", active ? "true" : "false");
  button.innerHTML = `
    <div class="storage-bucket-card__head">
      <div>
        <p class="eyebrow">${formatLabel(bucket.zone_ref)}</p>
        <h3>${bucket.label}</h3>
      </div>
      <span class="status-chip" data-status="${bucket.zone_ref === "QUARANTINE" ? "danger" : bucket.zone_ref === "DERIVED_EXPORT" ? "warning" : "SUCCEEDED"}">${bucket.versioning_state}</span>
    </div>
    <div class="storage-bucket-card__grid">
      <div>
        <strong>Bucket</strong>
        <span class="monospace">${bucket.bucket_name}</span>
      </div>
      <div>
        <strong>Download</strong>
        <span>${formatLabel(bucket.direct_download_posture)}</span>
      </div>
      <div>
        <strong>Preview</strong>
        <span>${formatLabel(bucket.preview_posture)}</span>
      </div>
      <div>
        <strong>Lifecycle</strong>
        <span class="monospace">${bucket.lifecycle_ref}</span>
      </div>
    </div>
  `;
  button.addEventListener("click", onSelect);
  return button;
}

function renderStorageZone(board, environment, zoneRef, title) {
  const section = document.createElement("section");
  section.className = "storage-zone";
  section.innerHTML = `
    <div class="panel-heading">
      <p class="eyebrow">${title}</p>
      <h3>${title}</h3>
    </div>
  `;
  const list = document.createElement("div");
  list.className = "storage-zone__list";
  storageBucketsForEnvironment(board, environment)
    .filter((bucket) => bucket.zone_ref === zoneRef)
    .forEach((bucket) => {
      list.append(
        createStorageBucketCard(
          bucket,
          bucket.bucket_ref === state.activeStorageBucketRef,
          () => {
            state.activeStorageBucketRef = bucket.bucket_ref;
            state.activeStorageLifecycleRef = null;
            state.activeStorageEventRef = null;
            renderStorageBucketTopologyBoard(board);
          },
        ),
      );
    });
  section.append(list);
  return section;
}

function createStorageStripRow(kind, title, active, chips, detail, onSelect) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `storage-strip-row storage-strip-row--${kind}`;
  button.dataset.active = active ? "true" : "false";
  button.setAttribute("aria-pressed", active ? "true" : "false");
  button.innerHTML = `
    <div class="storage-strip-row__head">
      <div>
        <p class="eyebrow">${kind === "lifecycle" ? "Retention law" : "Event route"}</p>
        <strong>${title}</strong>
      </div>
      <div class="chip-row"></div>
    </div>
    <p class="ledger-note">${detail}</p>
  `;
  const chipRow = button.querySelector(".chip-row");
  chips.forEach(([label, tone]) => {
    chipRow.append(createChip(label, tone));
  });
  button.addEventListener("click", onSelect);
  return button;
}

function renderStorageStrip(board, environment, activeLifecycle, activeEvent) {
  const section = document.createElement("section");
  section.className = "storage-topology-strip";
  section.innerHTML = `
    <div class="panel-heading">
      <p class="eyebrow">Lifecycle / Retention / Event Routes</p>
      <h3>Lifecycle / Retention / Event Routes</h3>
    </div>
  `;

  const grid = document.createElement("div");
  grid.className = "storage-topology-strip__grid";

  const lifecycleColumn = document.createElement("div");
  lifecycleColumn.className = "storage-strip-column";
  lifecycleColumn.innerHTML = `
    <div class="panel-heading">
      <p class="eyebrow">Lifecycle rules</p>
      <h3>Lifecycle rules</h3>
    </div>
  `;
  const lifecycleList = document.createElement("div");
  lifecycleList.className = "storage-strip-column__list";
  (board.lifecycleRules ?? []).forEach((rule) => {
    lifecycleList.append(
      createStorageStripRow(
        "lifecycle",
        rule.label,
        rule.lifecycle_ref === activeLifecycle?.lifecycle_ref,
        [
          [rule.retention_class, "neutral"],
          [`${rule.retention_tags.length} tags`, "warning"],
        ],
        rule.note,
        () => {
          state.activeStorageLifecycleRef = rule.lifecycle_ref;
          setActiveStorageBucketByPurpose(board, environment, rule.purpose_ref);
          state.activeStorageEventRef = null;
          renderStorageBucketTopologyBoard(board);
        },
      ),
    );
  });
  lifecycleColumn.append(lifecycleList);

  const eventColumn = document.createElement("div");
  eventColumn.className = "storage-strip-column";
  eventColumn.innerHTML = `
    <div class="panel-heading">
      <p class="eyebrow">Event routes</p>
      <h3>Event routes</h3>
    </div>
  `;
  const eventList = document.createElement("div");
  eventList.className = "storage-strip-column__list";
  (board.eventRoutes ?? []).forEach((route) => {
    eventList.append(
      createStorageStripRow(
        "event",
        route.label,
        route.route_ref === activeEvent?.route_ref,
        [
          [`${route.event_types.length} events`, "neutral"],
          [route.destination_channel_ref, "warning"],
        ],
        route.note,
        () => {
          state.activeStorageEventRef = route.route_ref;
          setActiveStorageBucketByPurpose(board, environment, route.purpose_ref);
          state.activeStorageLifecycleRef = null;
          renderStorageBucketTopologyBoard(board);
        },
      ),
    );
  });
  eventColumn.append(eventList);

  grid.append(lifecycleColumn, eventColumn);
  section.append(grid);
  return section;
}

function renderStorageInspector(environment, activeBucket, keyFamilies, activeLifecycle, activeEvent) {
  elements.drawer.dataset.state = "open";
  elements.drawerClose.hidden = true;
  elements.drawerTitle.textContent = activeBucket.label;

  const container = document.createElement("div");
  container.className = "atlas-inspector";
  const fields = document.createElement("div");
  fields.className = "field-list";
  fields.append(
    createFieldRow("Bucket ref", activeBucket.bucket_ref, {
      monospace: true,
      copyValue: activeBucket.bucket_ref,
      copyLabel: "Copy ref",
    }),
    createFieldRow("Bucket name", activeBucket.bucket_name, {
      monospace: true,
      copyValue: activeBucket.bucket_name,
      copyLabel: "Copy bucket",
    }),
    createFieldRow("Environment", environment.label),
    createFieldRow("Zone", formatLabel(activeBucket.zone_ref), {
      chips: [createChip(activeBucket.versioning_state, "success")],
    }),
    createFieldRow("Download posture", formatLabel(activeBucket.direct_download_posture)),
    createFieldRow("Preview posture", formatLabel(activeBucket.preview_posture)),
  );

  const keySection = document.createElement("section");
  keySection.className = "checkpoint-card";
  keySection.innerHTML = `
    <p class="eyebrow">Key rules</p>
    <h3>Key rules</h3>
  `;
  const keyList = document.createElement("ul");
  keyList.className = "note-list";
  keyFamilies.forEach((family) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <strong>${family.artifact_family_label}</strong>
      <span class="monospace">${family.key_template}</span>
      <span>${family.required_dimensions.join(", ")}</span>
    `;
    keyList.append(item);
  });
  keySection.append(keyList);

  const lifecycleSection = document.createElement("section");
  lifecycleSection.className = "checkpoint-card";
  lifecycleSection.innerHTML = `
    <p class="eyebrow">Lifecycle rule</p>
    <h3>${activeLifecycle?.label ?? "No lifecycle selected"}</h3>
    <p>${activeLifecycle?.note ?? "Select a lifecycle row to inspect retention class and limitation posture."}</p>
  `;
  if (activeLifecycle) {
    lifecycleSection.append(
      createMetadataList([
        ["Lifecycle ref", activeLifecycle.lifecycle_ref],
        ["Retention class", activeLifecycle.retention_class],
        ["Retention tags", activeLifecycle.retention_tags.join(", ")],
      ]),
    );
  }

  const eventSection = document.createElement("section");
  eventSection.className = "checkpoint-card";
  eventSection.innerHTML = `
    <p class="eyebrow">Notification route</p>
    <h3>${activeEvent?.label ?? "No event route selected"}</h3>
    <p>${activeEvent?.note ?? "Select an event route to inspect delivery and dedupe posture."}</p>
  `;
  if (activeEvent) {
    eventSection.append(
      createMetadataList([
        ["Route ref", activeEvent.route_ref],
        ["Destination", activeEvent.destination_channel_ref],
        ["Event types", activeEvent.event_types.join(", ")],
        ["Dedupe", activeEvent.dedupe_fields.join(", ")],
      ]),
    );
  }

  const notesSection = document.createElement("section");
  notesSection.className = "checkpoint-card";
  notesSection.innerHTML = `
    <p class="eyebrow">Boundary notes</p>
    <h3>Boundary notes</h3>
  `;
  const notesList = document.createElement("ul");
  notesList.className = "note-list";
  [...(activeBucket.notes ?? [])].forEach((note) => {
    const item = document.createElement("li");
    item.textContent = note;
    notesList.append(item);
  });
  notesSection.append(notesList);

  container.append(fields, keySection, lifecycleSection, eventSection, notesSection);
  elements.drawerBody.replaceChildren(container);
}

function renderStorageBucketTopologyBoard(board) {
  const environment = resolveActiveStorageEnvironment(board);
  if (!environment) {
    renderError(new Error("Storage bucket topology board is missing environment data."));
    return;
  }
  const activeBucket = resolveActiveStorageBucket(board, environment);
  if (!activeBucket) {
    renderError(new Error("Storage bucket topology board is missing bucket data."));
    return;
  }
  const activeLifecycle = resolveActiveStorageLifecycle(board, activeBucket);
  const activeEvent = resolveActiveStorageEvent(board, activeBucket);
  const keyFamilies = storageKeyFamiliesForBucket(board, activeBucket);

  renderStorageTopBar(board, environment);
  renderStorageRail(board, environment, activeBucket);
  renderStorageSummary(board, environment, activeBucket, activeLifecycle, activeEvent);
  elements.stepList.className = "storage-topology-page";
  elements.stepList.replaceChildren(
    renderStorageZone(board, environment, "UPLOAD_INTAKE", "Upload Intake"),
    renderStorageZone(board, environment, "RETAINED_EVIDENCE", "Retained Evidence"),
    renderStorageZone(board, environment, "DERIVED_EXPORT", "Derived / Export Artifacts"),
    renderStorageZone(board, environment, "QUARANTINE", "Quarantine"),
    renderStorageStrip(board, environment, activeLifecycle, activeEvent),
  );
  renderStorageInspector(
    environment,
    activeBucket,
    keyFamilies,
    activeLifecycle,
    activeEvent,
  );
}

function resolveActiveMessagingEnvironment(board) {
  if (!state.activeMessagingEnvironmentRef) {
    state.activeMessagingEnvironmentRef =
      board.selectedEnvironmentRef ??
      board.environments?.[0]?.environment_ref ??
      null;
  }
  return (
    board.environments?.find(
      (environment) =>
        environment.environment_ref === state.activeMessagingEnvironmentRef,
    ) ??
    board.environments?.[0] ??
    null
  );
}

function resolveActiveMessagingFamily(board) {
  if (!state.activeMessagingFamilyRef) {
    state.activeMessagingFamilyRef =
      board.selectedFamilyRef ?? board.families?.[0]?.family_ref ?? null;
  }
  return (
    board.families?.find(
      (family) => family.family_ref === state.activeMessagingFamilyRef,
    ) ??
    board.families?.[0] ??
    null
  );
}

function messageChannelsForFamily(board, family) {
  return (board.channels ?? []).filter(
    (channel) => channel.family_ref === family.family_ref,
  );
}

function resolveActiveMessagingChannel(board, family) {
  const familyChannels = messageChannelsForFamily(board, family);
  if (!familyChannels.length) {
    state.activeMessagingChannelRef = null;
    return null;
  }
  if (
    !state.activeMessagingChannelRef ||
    !familyChannels.some(
      (channel) => channel.channel_ref === state.activeMessagingChannelRef,
    )
  ) {
    state.activeMessagingChannelRef =
      board.selectedChannelRef &&
      familyChannels.some(
        (channel) => channel.channel_ref === board.selectedChannelRef,
      )
        ? board.selectedChannelRef
        : familyChannels[0].channel_ref;
  }
  return (
    familyChannels.find(
      (channel) => channel.channel_ref === state.activeMessagingChannelRef,
    ) ?? familyChannels[0]
  );
}

function resolveActiveMessagingPolicyKind(board) {
  if (!state.activeMessagingPolicyKind) {
    state.activeMessagingPolicyKind = board.selectedPolicyKind ?? "ordering";
  }
  if (!["ordering", "retry", "dedupe"].includes(state.activeMessagingPolicyKind)) {
    state.activeMessagingPolicyKind = "ordering";
  }
  return state.activeMessagingPolicyKind;
}

function resolveBrokerAlias(channel, environment) {
  return channel.broker_entity_alias_template.replace(
    "{namespace_prefix}",
    environment.namespace_prefix,
  );
}

function resolveActiveOrderingPolicy(board, channel) {
  return (
    board.orderingPolicies?.find(
      (policy) => policy.policy_ref === channel.ordering_policy_ref,
    ) ?? null
  );
}

function resolveActiveRetryPolicy(board, channel) {
  return (
    board.retryPolicies?.find(
      (policy) => policy.policy_ref === channel.retry_policy_ref,
    ) ?? null
  );
}

function resolveActiveDedupePolicy(board, channel) {
  return (
    board.dedupePolicies?.find(
      (policy) => policy.policy_ref === channel.dedupe_policy_ref,
    ) ?? null
  );
}

function renderMessageFabricTopBar(board, environment) {
  elements.providerBadge.textContent = board.providerMonogram ?? "MSG";
  elements.runTitle.textContent = `${board.providerDisplayName} atlas`;
  elements.runStatus.textContent = formatLabel(board.selectionPosture);
  elements.runStatus.dataset.status =
    board.selectionPosture === "PROVIDER_SELECTION_REQUIRED" ? "warning" : "success";
  elements.environmentControl.hidden = false;
  elements.environmentChipWrap.hidden = false;
  elements.environmentChip.textContent = board.recoveryChipLabel;
  elements.environmentSelect.replaceChildren(
    ...(board.environments ?? []).map((entry) => {
      const option = document.createElement("option");
      option.value = entry.environment_ref;
      option.textContent = entry.label;
      option.selected = entry.environment_ref === environment.environment_ref;
      return option;
    }),
  );
  elements.environmentSelect.disabled = false;
  elements.environmentSelect.onchange = () => {
    state.activeMessagingEnvironmentRef = elements.environmentSelect.value;
    renderMessageFabricAtlas(board);
  };
  elements.environmentHint.textContent =
    "Transport is rebuildable from durable truth. The broker never becomes manifest, authority, or workflow truth.";
  document.title = `Provisioning Viewer - ${environment.label} message fabric`;
}

function renderMessageFabricRail(board, activeFamily) {
  elements.runRail.setAttribute(
    "aria-label",
    "Channel families and coordination flows",
  );
  elements.runList.className = "message-family-rail-list";
  elements.railEyebrow.textContent = "Family rail";
  elements.railTitle.textContent = "Channel families";
  elements.mainEyebrow.textContent = "Transport-only broker law";
  elements.mainTitle.textContent = activeFamily.label;

  elements.runList.replaceChildren(
    ...(board.families ?? []).map((family) => {
      const listItem = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute(
        "aria-current",
        family.family_ref === activeFamily.family_ref ? "true" : "false",
      );
      button.innerHTML = `
        <div class="application-list__title">
          <strong>${family.label}</strong>
          <span class="status-chip" data-status="SUCCEEDED">${family.channel_count} channels</span>
        </div>
        <div class="application-list__meta">
          <span>${family.center_lane_emphasis}</span>
          <span class="meta-note">${family.note}</span>
        </div>
      `;
      button.addEventListener("click", () => {
        state.activeMessagingFamilyRef = family.family_ref;
        state.activeMessagingChannelRef = null;
        renderMessageFabricAtlas(board);
      });
      listItem.append(button);
      return listItem;
    }),
  );
}

function renderMessageFabricSummary(board, environment, activeFamily, activeChannel) {
  elements.runSummary.innerHTML = "";
  const container = document.createElement("div");
  container.className = "atlas-summary";
  container.innerHTML = `
    <div class="atlas-summary__lead">
      <div>
        <p class="eyebrow">Topology posture</p>
        <h2>${environment.label}</h2>
        <p class="ledger-note">${board.summary}</p>
      </div>
      <div class="chip-row"></div>
    </div>
  `;
  const chipRow = container.querySelector(".chip-row");
  chipRow.append(
    createChip(board.topologyModeLabel, "neutral"),
    createChip(activeFamily.label, "success"),
    createChip(activeChannel.label, "warning"),
  );
  const notes = document.createElement("ul");
  notes.className = "note-list";
  (board.notes ?? []).forEach((note) => {
    const item = document.createElement("li");
    item.textContent = note;
    notes.append(item);
  });
  elements.runSummary.append(container, notes);
}

function createMessageChannelRow(channel, environment, active, onSelect) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "message-channel-row";
  button.dataset.active = active ? "true" : "false";
  button.setAttribute("aria-pressed", active ? "true" : "false");
  const outboxLabel =
    channel.outbox_mode === "TRANSACTIONAL_OUTBOX_REQUIRED"
      ? channel.outbox_ref_or_null
      : "External callback edge";
  button.innerHTML = `
    <div class="message-channel-row__title">
      <strong>${channel.label}</strong>
      <span class="status-chip" data-status="${channel.inbox_mode === "AUTHENTICATED_DEDUPE_INBOX_REQUIRED" ? "warning" : "SUCCEEDED"}">${formatLabel(channel.broker_delivery_class)}</span>
    </div>
    <div class="message-channel-row__lanes">
      <div class="message-lane-cell">
        <p class="eyebrow">Durable Outbox</p>
        <span class="${channel.outbox_ref_or_null ? "monospace" : ""}">${outboxLabel}</span>
      </div>
      <div class="message-lane-cell">
        <p class="eyebrow">Broker Channel</p>
        <span class="monospace">${resolveBrokerAlias(channel, environment)}</span>
      </div>
      <div class="message-lane-cell">
        <p class="eyebrow">Inbox / Consumer</p>
        <span class="monospace">${channel.inbox_ref}</span>
        <span class="meta-note">${channel.consumer_binding_ref}</span>
      </div>
    </div>
  `;
  button.addEventListener("click", onSelect);
  return button;
}

function renderMessageFabricCanvas(board, environment, activeFamily, activeChannel) {
  const section = document.createElement("section");
  section.className = "message-fabric-section";
  section.innerHTML = `
    <div class="panel-heading">
      <p class="eyebrow">${activeFamily.center_lane_emphasis}</p>
      <h3>${activeFamily.label}</h3>
    </div>
  `;
  const laneHeader = document.createElement("div");
  laneHeader.className = "message-lane-header";
  laneHeader.innerHTML = `
    <h3>Durable Outboxes</h3>
    <h3>Broker Channels</h3>
    <h3>Inbox / Consumers</h3>
  `;
  const rows = document.createElement("div");
  rows.className = "message-channel-list";
  messageChannelsForFamily(board, activeFamily).forEach((channel) => {
    rows.append(
      createMessageChannelRow(
        channel,
        environment,
        channel.channel_ref === activeChannel.channel_ref,
        () => {
          state.activeMessagingChannelRef = channel.channel_ref;
          renderMessageFabricAtlas(board);
        },
      ),
    );
  });
  section.append(laneHeader, rows);
  return section;
}

function createMessagePolicyCard(kind, title, detail, chips, active, onSelect) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "message-policy-card";
  button.dataset.active = active ? "true" : "false";
  button.setAttribute("aria-pressed", active ? "true" : "false");
  button.innerHTML = `
    <div class="message-policy-card__head">
      <div>
        <p class="eyebrow">${kind}</p>
        <strong>${title}</strong>
      </div>
      <div class="chip-row"></div>
    </div>
    <p class="ledger-note">${detail}</p>
  `;
  const chipRow = button.querySelector(".chip-row");
  chips.forEach(([label, tone]) => {
    chipRow.append(createChip(label, tone));
  });
  button.addEventListener("click", onSelect);
  return button;
}

function renderMessagePolicyStrip(
  board,
  activeChannel,
  activeOrderingPolicy,
  activeRetryPolicy,
  activeDedupePolicy,
  activePolicyKind,
) {
  const section = document.createElement("section");
  section.className = "message-policy-strip";
  section.innerHTML = `
    <div class="panel-heading">
      <p class="eyebrow">Ordering / Partition / Retry</p>
      <h3>Ordering / Partition / Retry</h3>
    </div>
  `;
  const grid = document.createElement("div");
  grid.className = "message-policy-strip__grid";
  grid.append(
    createMessagePolicyCard(
      "Ordering policy",
      activeOrderingPolicy?.label ?? "Ordering",
      activeOrderingPolicy?.note ??
        "No ordering policy found for the selected channel.",
      [
        [`${activeOrderingPolicy?.partition_key_fields?.length ?? 0} keys`, "neutral"],
        [activeChannel.ordering_policy_ref, "warning"],
      ],
      activePolicyKind === "ordering",
      () => {
        state.activeMessagingPolicyKind = "ordering";
        renderMessageFabricAtlas(board);
      },
    ),
    createMessagePolicyCard(
      "Retry policy",
      activeRetryPolicy?.label ?? "Retry",
      activeRetryPolicy?.note ?? "No retry policy found for the selected channel.",
      [
        [`${activeRetryPolicy?.max_delivery_attempts ?? 0} attempts`, "neutral"],
        [activeRetryPolicy?.dead_letter_mode ?? activeChannel.retry_policy_ref, "warning"],
      ],
      activePolicyKind === "retry",
      () => {
        state.activeMessagingPolicyKind = "retry";
        renderMessageFabricAtlas(board);
      },
    ),
    createMessagePolicyCard(
      "Idempotency / Dedupe",
      activeDedupePolicy?.label ?? "Dedupe",
      activeDedupePolicy?.note ??
        "No dedupe policy found for the selected channel.",
      [
        [`${activeDedupePolicy?.dedupe_key_fields?.length ?? 0} keys`, "neutral"],
        [activeChannel.dedupe_policy_ref, "warning"],
      ],
      activePolicyKind === "dedupe",
      () => {
        state.activeMessagingPolicyKind = "dedupe";
        renderMessageFabricAtlas(board);
      },
    ),
  );
  section.append(grid);
  return section;
}

function renderMessageFabricInspector(
  environment,
  activeFamily,
  activeChannel,
  activeOrderingPolicy,
  activeRetryPolicy,
  activeDedupePolicy,
  activePolicyKind,
) {
  elements.drawer.dataset.state = "open";
  elements.drawerClose.hidden = true;
  elements.drawerTitle.textContent = activeChannel.label;

  const brokerAlias = resolveBrokerAlias(activeChannel, environment);
  const selectedPolicy =
    activePolicyKind === "ordering"
      ? activeOrderingPolicy
      : activePolicyKind === "retry"
        ? activeRetryPolicy
        : activeDedupePolicy;

  const container = document.createElement("div");
  container.className = "atlas-inspector";
  const fields = document.createElement("div");
  fields.className = "field-list";
  fields.append(
    createFieldRow("Channel ref", activeChannel.channel_ref, {
      monospace: true,
      copyValue: activeChannel.channel_ref,
      copyLabel: "Copy channel ref",
    }),
    createFieldRow("Family", activeFamily.label),
    createFieldRow("Broker alias", brokerAlias, {
      monospace: true,
      copyValue: brokerAlias,
      copyLabel: "Copy broker alias",
    }),
    createFieldRow(
      "Durable outbox",
      activeChannel.outbox_ref_or_null ?? "External callback edge",
      {
        monospace: Boolean(activeChannel.outbox_ref_or_null),
      },
    ),
    createFieldRow("Inbox", activeChannel.inbox_ref, {
      monospace: true,
    }),
    createFieldRow("Consumer", activeChannel.consumer_binding_ref, {
      monospace: true,
    }),
    createFieldRow("Environment", environment.label, {
      chips: [createChip(environment.recovery_posture, "neutral")],
    }),
  );

  const boundarySection = document.createElement("section");
  boundarySection.className = "checkpoint-card";
  boundarySection.innerHTML = `
    <p class="eyebrow">Truth boundary</p>
    <h3>Transport-only broker</h3>
    <p>${activeChannel.note}</p>
  `;

  const selectedPolicySection = document.createElement("section");
  selectedPolicySection.className = "checkpoint-card";
  selectedPolicySection.innerHTML = `
    <p class="eyebrow">Selected policy</p>
    <h3>${selectedPolicy?.label ?? "No policy selected"}</h3>
    <p>${selectedPolicy?.note ?? "Choose ordering, retry, or dedupe to inspect the bound transport law."}</p>
  `;
  if (activePolicyKind === "ordering" && activeOrderingPolicy) {
    selectedPolicySection.append(
      createMetadataList([
        ["Policy ref", activeOrderingPolicy.policy_ref],
        ["Partition keys", activeOrderingPolicy.partition_key_fields.join(", ")],
      ]),
    );
  }
  if (activePolicyKind === "retry" && activeRetryPolicy) {
    selectedPolicySection.append(
      createMetadataList([
        ["Policy ref", activeRetryPolicy.policy_ref],
        ["Attempts", String(activeRetryPolicy.max_delivery_attempts)],
        ["DLQ posture", activeRetryPolicy.dead_letter_mode],
      ]),
    );
  }
  if (activePolicyKind === "dedupe" && activeDedupePolicy) {
    selectedPolicySection.append(
      createMetadataList([
        ["Policy ref", activeDedupePolicy.policy_ref],
        ["Dedupe keys", activeDedupePolicy.dedupe_key_fields.join(", ")],
      ]),
    );
  }

  const laneSection = document.createElement("section");
  laneSection.className = "checkpoint-card";
  laneSection.innerHTML = `
    <p class="eyebrow">Lane posture</p>
    <h3>${formatLabel(activeChannel.broker_delivery_class)}</h3>
    <p>${activeChannel.note}</p>
  `;
  laneSection.append(
    createMetadataList([
      ["Outbox mode", formatLabel(activeChannel.outbox_mode)],
      ["Inbox mode", formatLabel(activeChannel.inbox_mode)],
      ["Ordering ref", activeChannel.ordering_policy_ref],
      ["Retry ref", activeChannel.retry_policy_ref],
      ["Dedupe ref", activeChannel.dedupe_policy_ref],
    ]),
  );

  container.append(
    fields,
    boundarySection,
    selectedPolicySection,
    laneSection,
  );
  elements.drawerBody.replaceChildren(container);
}

function renderMessageFabricAtlas(board) {
  const environment = resolveActiveMessagingEnvironment(board);
  const activeFamily = resolveActiveMessagingFamily(board);
  if (!environment || !activeFamily) {
    renderError(new Error("Message fabric atlas is missing environment or family data."));
    return;
  }
  const activeChannel = resolveActiveMessagingChannel(board, activeFamily);
  if (!activeChannel) {
    renderError(new Error("Message fabric atlas is missing channel data for the selected family."));
    return;
  }
  const activePolicyKind = resolveActiveMessagingPolicyKind(board);
  const activeOrderingPolicy = resolveActiveOrderingPolicy(board, activeChannel);
  const activeRetryPolicy = resolveActiveRetryPolicy(board, activeChannel);
  const activeDedupePolicy = resolveActiveDedupePolicy(board, activeChannel);

  renderMessageFabricTopBar(board, environment);
  renderMessageFabricRail(board, activeFamily);
  renderMessageFabricSummary(board, environment, activeFamily, activeChannel);
  elements.stepList.className = "message-fabric-page";
  elements.stepList.replaceChildren(
    renderMessageFabricCanvas(board, environment, activeFamily, activeChannel),
    renderMessagePolicyStrip(
      board,
      activeChannel,
      activeOrderingPolicy,
      activeRetryPolicy,
      activeDedupePolicy,
      activePolicyKind,
    ),
  );
  renderMessageFabricInspector(
    environment,
    activeFamily,
    activeChannel,
    activeOrderingPolicy,
    activeRetryPolicy,
    activeDedupePolicy,
    activePolicyKind,
  );
}

function resolveActiveCacheEnvironment(board) {
  if (!state.activeCacheEnvironmentRef) {
    state.activeCacheEnvironmentRef =
      board.selectedEnvironmentRef ?? board.environments?.[0]?.environment_ref ?? null;
  }
  return (
    board.environments?.find(
      (environment) => environment.environment_ref === state.activeCacheEnvironmentRef,
    ) ??
    board.environments?.[0] ??
    null
  );
}

function resolveActiveCacheFamily(board) {
  if (!state.activeCacheFamilyRef) {
    state.activeCacheFamilyRef =
      board.selectedFamilyRef ?? board.families?.[0]?.family_ref ?? null;
  }
  return (
    board.families?.find((family) => family.family_ref === state.activeCacheFamilyRef) ??
    board.families?.[0] ??
    null
  );
}

function resolveCachePartitionRow(board, family) {
  return (
    board.partitionRows?.find((row) => row.family_ref === family.family_ref) ?? null
  );
}

function resolveCacheResumeRow(board, family) {
  return board.resumeRows?.find((row) => row.family_ref === family.family_ref) ?? null;
}

function resolveCacheTtlRow(board, family) {
  return board.families?.find((row) => row.family_ref === family.family_ref) ?? null;
}

function cacheInvalidationRowsForFamily(board, family) {
  return (board.invalidationRows ?? []).filter((row) =>
    row.affected_family_refs.includes(family.family_ref),
  );
}

function cacheBoundaryRowsForFamily(board, family) {
  return (board.localSharedRows ?? []).filter((row) =>
    row.applicable_family_refs.includes(family.family_ref),
  );
}

function cacheContractRowsForFamily(board, family) {
  return (board.contractRows ?? []).filter(
    (row) => row.family_ref === family.family_ref,
  );
}

function cacheFocusIsValid(board, family, kind, ref) {
  if (kind === "family") {
    return ref === family.family_ref;
  }
  if (kind === "trigger") {
    return cacheInvalidationRowsForFamily(board, family).some(
      (row) => row.trigger_ref === ref,
    );
  }
  if (kind === "class") {
    return cacheBoundaryRowsForFamily(board, family).some(
      (row) => row.class_ref === ref,
    );
  }
  if (kind === "contract") {
    return cacheContractRowsForFamily(board, family).some(
      (row) => row.contract_row_ref === ref,
    );
  }
  return false;
}

function resolveActiveCacheFocus(board, family) {
  const selectedKind = board.selectedFocusKind ?? "family";
  const selectedRef = board.selectedFocusRef ?? family.family_ref;

  if (
    !state.activeCacheFocusKind ||
    !state.activeCacheFocusRef ||
    !cacheFocusIsValid(
      board,
      family,
      state.activeCacheFocusKind,
      state.activeCacheFocusRef,
    )
  ) {
    if (cacheFocusIsValid(board, family, selectedKind, selectedRef)) {
      state.activeCacheFocusKind = selectedKind;
      state.activeCacheFocusRef = selectedRef;
    } else {
      state.activeCacheFocusKind = "family";
      state.activeCacheFocusRef = family.family_ref;
    }
  }
  return {
    kind: state.activeCacheFocusKind,
    ref: state.activeCacheFocusRef,
  };
}

function renderResumeIsolationTopBar(board, environment) {
  elements.providerBadge.textContent = board.providerMonogram ?? "CAC";
  elements.runTitle.textContent = `${board.providerDisplayName} atlas`;
  elements.runStatus.textContent = formatLabel(board.selectionPosture);
  elements.runStatus.dataset.status =
    board.selectionPosture === "PROVIDER_SELECTION_REQUIRED" ? "warning" : "success";
  elements.environmentControl.hidden = false;
  elements.environmentChipWrap.hidden = false;
  elements.environmentChip.textContent = board.isolationChipLabel;
  elements.environmentSelect.replaceChildren(
    ...(board.environments ?? []).map((entry) => {
      const option = document.createElement("option");
      option.value = entry.environment_ref;
      option.textContent = entry.label;
      option.selected = entry.environment_ref === environment.environment_ref;
      return option;
    }),
  );
  elements.environmentSelect.disabled = false;
  elements.environmentSelect.onchange = () => {
    state.activeCacheEnvironmentRef = elements.environmentSelect.value;
    renderResumeIsolationAtlas(board);
  };
  elements.environmentHint.textContent =
    "Caches are disposable acceleration only. Route legality, visibility, and mutation authority still re-establish from durable truth.";
  document.title = `Provisioning Viewer - ${environment.label} resume isolation atlas`;
}

function renderResumeIsolationRail(board, activeFamily) {
  elements.runRail.setAttribute("aria-label", "Surface families and resume scopes");
  elements.runList.className = "resume-family-rail-list";
  elements.railEyebrow.textContent = "Surface family rail";
  elements.railTitle.textContent = "Resume scopes";
  elements.mainEyebrow.textContent = "Partition identity and continuity law";
  elements.mainTitle.textContent = activeFamily.label;

  elements.runList.replaceChildren(
    ...(board.families ?? []).map((family) => {
      const listItem = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute(
        "aria-current",
        family.family_ref === activeFamily.family_ref ? "true" : "false",
      );
      button.innerHTML = `
        <div class="application-list__title">
          <strong>${family.label}</strong>
          <span class="status-chip" data-status="${family.visibility_label.includes("required") ? "warning" : "SUCCEEDED"}">${family.ttl_summary}</span>
        </div>
        <div class="application-list__meta">
          <span>${family.visibility_label}</span>
          <span class="meta-note">${family.local_policy_summary}</span>
        </div>
      `;
      button.addEventListener("click", () => {
        state.activeCacheFamilyRef = family.family_ref;
        state.activeCacheFocusKind = "family";
        state.activeCacheFocusRef = family.family_ref;
        renderResumeIsolationAtlas(board);
      });
      listItem.append(button);
      return listItem;
    }),
  );
}

function renderResumeIsolationSummary(board, environment, activeFamily) {
  elements.runSummary.innerHTML = "";
  const container = document.createElement("div");
  container.className = "atlas-summary";
  container.innerHTML = `
    <div class="atlas-summary__lead">
      <div>
        <p class="eyebrow">Isolation posture</p>
        <h2>${environment.label}</h2>
        <p class="ledger-note">${board.summary}</p>
      </div>
      <div class="chip-row"></div>
    </div>
  `;
  const chipRow = container.querySelector(".chip-row");
  chipRow.append(
    createChip(board.topologyModeLabel, "neutral"),
    createChip(activeFamily.label, "success"),
    createChip(activeFamily.visibility_label, "warning"),
  );
  const notes = document.createElement("ul");
  notes.className = "note-list";
  (board.notes ?? []).forEach((note) => {
    const item = document.createElement("li");
    item.textContent = note;
    notes.append(item);
  });
  elements.runSummary.append(container, notes);
}

function createResumeFocusCard(title, eyebrow, detail, chips, active, onSelect) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "resume-focus-card";
  button.dataset.active = active ? "true" : "false";
  button.setAttribute("aria-pressed", active ? "true" : "false");
  button.innerHTML = `
    <div class="resume-focus-card__head">
      <div>
        <p class="eyebrow">${eyebrow}</p>
        <strong>${title}</strong>
      </div>
      <div class="chip-row"></div>
    </div>
    <p class="ledger-note">${detail}</p>
  `;
  const chipRow = button.querySelector(".chip-row");
  chips.forEach(([label, tone]) => chipRow.append(createChip(label, tone)));
  button.addEventListener("click", onSelect);
  return button;
}

function createResumeInvalidationRow(row, active, onSelect) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "resume-invalidation-row";
  button.dataset.active = active ? "true" : "false";
  button.setAttribute("aria-pressed", active ? "true" : "false");
  button.setAttribute("aria-label", `Invalidation trigger ${row.label}`);
  button.innerHTML = `
    <div class="resume-invalidation-row__head">
      <strong>${row.label}</strong>
      <span class="status-chip" data-status="${row.severity === "danger" ? "BLOCKED_BY_POLICY" : "warning"}">${formatLabel(row.severity)}</span>
    </div>
    <p class="ledger-note">${row.note}</p>
  `;
  button.addEventListener("click", onSelect);
  return button;
}

function createResumeBoundaryRow(row, active, onSelect) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "resume-boundary-row";
  button.dataset.active = active ? "true" : "false";
  button.setAttribute("aria-pressed", active ? "true" : "false");
  button.setAttribute("aria-label", `Boundary row ${row.label}`);
  button.innerHTML = `
    <div class="resume-boundary-row__head">
      <strong>${row.label}</strong>
      <span class="status-chip" data-status="${row.never_local || row.never_shared ? "BLOCKED_BY_POLICY" : "SUCCEEDED"}">${row.never_local || row.never_shared ? "Restricted" : "Allowed"}</span>
    </div>
    <p class="ledger-note">${row.note}</p>
  `;
  button.addEventListener("click", onSelect);
  return button;
}

function createResumeContractRow(row, active, onSelect) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "resume-contract-row";
  button.dataset.active = active ? "true" : "false";
  button.setAttribute("aria-pressed", active ? "true" : "false");
  button.setAttribute("aria-label", `Contract row ${row.label}`);
  button.innerHTML = `
    <div class="resume-boundary-row__head">
      <strong>${row.label}</strong>
      <span class="status-chip" data-status="SUCCEEDED">${row.recovery_mode}</span>
    </div>
    <p class="ledger-note">${row.note}</p>
  `;
  button.addEventListener("click", onSelect);
  return button;
}

function renderResumeIsolationCanvas(board, activeFamily, activeFocus) {
  const partitionRow = resolveCachePartitionRow(board, activeFamily);
  const resumeRow = resolveCacheResumeRow(board, activeFamily);
  const invalidationRows = cacheInvalidationRowsForFamily(board, activeFamily);

  const section = document.createElement("section");
  section.className = "resume-isolation-section";
  section.setAttribute("aria-label", "resume-isolation-canvas");

  const grid = document.createElement("div");
  grid.className = "resume-isolation-grid";

  const partitionZone = document.createElement("section");
  partitionZone.className = "resume-zone";
  partitionZone.innerHTML = `
    <div class="panel-heading">
      <p class="eyebrow">Route-bound partitioning</p>
      <h3>Partition Identity</h3>
    </div>
  `;
  if (partitionRow) {
    partitionZone.append(
      createResumeFocusCard(
        partitionRow.label,
        "Partition contract",
        partitionRow.note,
        [
          [`${partitionRow.key_segments.length} segments`, "neutral"],
          [
            partitionRow.visibility_partition_required
              ? "Visibility partition"
              : "No visibility partition",
            partitionRow.visibility_partition_required ? "warning" : "success",
          ],
        ],
        activeFocus.kind === "family",
        () => {
          state.activeCacheFocusKind = "family";
          state.activeCacheFocusRef = activeFamily.family_ref;
          renderResumeIsolationAtlas(board);
        },
      ),
    );
  }

  const resumeZone = document.createElement("section");
  resumeZone.className = "resume-zone";
  resumeZone.innerHTML = `
    <div class="panel-heading">
      <p class="eyebrow">Resume binding envelope</p>
      <h3>Resume Binding</h3>
    </div>
  `;
  if (resumeRow) {
    resumeZone.append(
      createResumeFocusCard(
        resumeRow.label,
        "Resume contract",
        resumeRow.note,
        [
          [`${resumeRow.envelope_fields.length} fields`, "neutral"],
          [resumeRow.local_persistence_policy, "warning"],
        ],
        activeFocus.kind === "family",
        () => {
          state.activeCacheFocusKind = "family";
          state.activeCacheFocusRef = activeFamily.family_ref;
          renderResumeIsolationAtlas(board);
        },
      ),
    );
  }

  const invalidationZone = document.createElement("section");
  invalidationZone.className = "resume-zone";
  invalidationZone.innerHTML = `
    <div class="panel-heading">
      <p class="eyebrow">Immediate drift beats TTL</p>
      <h3>Invalidation / Rebase</h3>
    </div>
  `;
  const invalidationList = document.createElement("div");
  invalidationList.className = "resume-invalidation-list";
  invalidationRows.forEach((row) => {
    invalidationList.append(
      createResumeInvalidationRow(
        row,
        activeFocus.kind === "trigger" && activeFocus.ref === row.trigger_ref,
        () => {
          state.activeCacheFocusKind = "trigger";
          state.activeCacheFocusRef = row.trigger_ref;
          renderResumeIsolationAtlas(board);
        },
      ),
    );
  });
  invalidationZone.append(invalidationList);

  grid.append(partitionZone, resumeZone, invalidationZone);
  section.append(grid);
  return section;
}

function renderResumeIsolationBoundaryStrip(board, activeFamily, activeFocus) {
  const section = document.createElement("section");
  section.className = "resume-boundary-strip";
  section.innerHTML = `
    <div class="panel-heading">
      <p class="eyebrow">Local / shared law</p>
      <h3>Local / Shared Boundary</h3>
    </div>
  `;

  const grid = document.createElement("div");
  grid.className = "resume-boundary-strip__grid";

  const boundaryColumn = document.createElement("div");
  boundaryColumn.className = "resume-strip-column";
  boundaryColumn.innerHTML = `<h4>Storage classes</h4>`;
  const boundaryList = document.createElement("div");
  boundaryList.className = "resume-strip-column__list";
  cacheBoundaryRowsForFamily(board, activeFamily).forEach((row) => {
    boundaryList.append(
      createResumeBoundaryRow(
        row,
        activeFocus.kind === "class" && activeFocus.ref === row.class_ref,
        () => {
          state.activeCacheFocusKind = "class";
          state.activeCacheFocusRef = row.class_ref;
          renderResumeIsolationAtlas(board);
        },
      ),
    );
  });
  boundaryColumn.append(boundaryList);

  const contractColumn = document.createElement("div");
  contractColumn.className = "resume-strip-column";
  contractColumn.innerHTML = `<h4>Contract anchors</h4>`;
  const contractList = document.createElement("div");
  contractList.className = "resume-strip-column__list";
  cacheContractRowsForFamily(board, activeFamily).forEach((row) => {
    contractList.append(
      createResumeContractRow(
        row,
        activeFocus.kind === "contract" && activeFocus.ref === row.contract_row_ref,
        () => {
          state.activeCacheFocusKind = "contract";
          state.activeCacheFocusRef = row.contract_row_ref;
          renderResumeIsolationAtlas(board);
        },
      ),
    );
  });
  contractColumn.append(contractList);

  grid.append(boundaryColumn, contractColumn);
  section.append(grid);
  return section;
}

function renderResumeIsolationInspector(board, environment, activeFamily, activeFocus) {
  const partitionRow = resolveCachePartitionRow(board, activeFamily);
  const resumeRow = resolveCacheResumeRow(board, activeFamily);
  const focusTrigger =
    activeFocus.kind === "trigger"
      ? cacheInvalidationRowsForFamily(board, activeFamily).find(
          (row) => row.trigger_ref === activeFocus.ref,
        ) ?? null
      : null;
  const focusClass =
    activeFocus.kind === "class"
      ? cacheBoundaryRowsForFamily(board, activeFamily).find(
          (row) => row.class_ref === activeFocus.ref,
        ) ?? null
      : null;
  const focusContract =
    activeFocus.kind === "contract"
      ? cacheContractRowsForFamily(board, activeFamily).find(
          (row) => row.contract_row_ref === activeFocus.ref,
        ) ?? null
      : null;

  const container = document.createElement("div");
  container.className = "atlas-inspector";
  const fields = document.createElement("div");
  fields.className = "field-list";

  elements.drawer.dataset.state = "open";
  elements.drawerClose.hidden = true;

  if (activeFocus.kind === "family") {
    const ttlSummary = activeFamily.ttl_summary;
    elements.drawerTitle.textContent = activeFamily.label;
    fields.append(
      createFieldRow("Family ref", activeFamily.family_ref, {
        monospace: true,
      }),
      createFieldRow("Environment", environment.label, {
        chips: [createChip(environment.recovery_posture, "neutral")],
      }),
      createFieldRow("Route identity", activeFamily.route_identity_pattern, {
        monospace: true,
      }),
      createFieldRow("Visibility posture", activeFamily.visibility_label),
      createFieldRow("TTL summary", ttlSummary),
    );

    const partitionSection = document.createElement("section");
    partitionSection.className = "checkpoint-card";
    partitionSection.innerHTML = `
      <p class="eyebrow">Partition identity</p>
      <h3>${partitionRow?.label ?? "No partition row"}</h3>
      <p>${partitionRow?.note ?? "No partition metadata found for the active family."}</p>
    `;
    if (partitionRow) {
      partitionSection.append(
        createMetadataList([
          ["Template", partitionRow.key_template],
          ["Segments", partitionRow.key_segments.join(", ")],
        ]),
      );
    }

    const resumeSection = document.createElement("section");
    resumeSection.className = "checkpoint-card";
    resumeSection.innerHTML = `
      <p class="eyebrow">Resume binding</p>
      <h3>${resumeRow?.label ?? "No resume row"}</h3>
      <p>${resumeRow?.note ?? "No resume policy found for the active family."}</p>
    `;
    if (resumeRow) {
      resumeSection.append(
        createMetadataList([
          ["Envelope fields", resumeRow.envelope_fields.join(", ")],
          ["States", resumeRow.delivery_window_states.join(", ")],
        ]),
      );
    }

    container.append(fields, partitionSection, resumeSection);
    elements.drawerBody.replaceChildren(container);
    return;
  }

  if (focusTrigger) {
    elements.drawerTitle.textContent = focusTrigger.label;
    fields.append(
      createFieldRow("Severity", formatTitleLabel(focusTrigger.severity)),
      createFieldRow("Families", String(focusTrigger.affected_family_refs.length)),
      createFieldRow("Shared action", focusTrigger.shared_cache_action, {
        monospace: true,
      }),
      createFieldRow("Local action", focusTrigger.local_cache_action, {
        monospace: true,
      }),
    );
    const triggerSection = document.createElement("section");
    triggerSection.className = "checkpoint-card";
    triggerSection.innerHTML = `
      <p class="eyebrow">Invalidation posture</p>
      <h3>${focusTrigger.label}</h3>
      <p>${focusTrigger.note}</p>
    `;
    triggerSection.append(
      createMetadataList([
        ["Stale render", focusTrigger.stale_render_posture],
        ["Resume action", focusTrigger.resume_action],
        ["Mutation gate", focusTrigger.mutation_gate],
      ]),
    );
    container.append(fields, triggerSection);
    elements.drawerBody.replaceChildren(container);
    return;
  }

  if (focusClass) {
    elements.drawerTitle.textContent = focusClass.label;
    fields.append(
      createFieldRow("Shared policy", focusClass.shared_store_policy, {
        monospace: true,
      }),
      createFieldRow("Local policy", focusClass.local_store_policy, {
        monospace: true,
      }),
      createFieldRow("Never local", focusClass.never_local ? "Yes" : "No"),
      createFieldRow("Never shared", focusClass.never_shared ? "Yes" : "No"),
    );
    const classSection = document.createElement("section");
    classSection.className = "checkpoint-card";
    classSection.innerHTML = `
      <p class="eyebrow">Boundary row</p>
      <h3>${focusClass.label}</h3>
      <p>${focusClass.note}</p>
    `;
    container.append(fields, classSection);
    elements.drawerBody.replaceChildren(container);
    return;
  }

  if (focusContract) {
    elements.drawerTitle.textContent = focusContract.label;
    fields.append(
      createFieldRow("Recovery mode", focusContract.recovery_mode, {
        monospace: true,
      }),
      createFieldRow("Contracts", String(focusContract.primary_contract_refs.length)),
      createFieldRow("Schemas", String(focusContract.schema_refs.length)),
    );
    const contractSection = document.createElement("section");
    contractSection.className = "checkpoint-card";
    contractSection.innerHTML = `
      <p class="eyebrow">Contract bridge</p>
      <h3>${focusContract.label}</h3>
      <p>${focusContract.note}</p>
    `;
    contractSection.append(
      createMetadataList([
        ["Primary refs", focusContract.primary_contract_refs.join(", ")],
        ["Schemas", focusContract.schema_refs.join(", ")],
      ]),
    );
    container.append(fields, contractSection);
    elements.drawerBody.replaceChildren(container);
  }
}

function renderResumeIsolationAtlas(board) {
  const environment = resolveActiveCacheEnvironment(board);
  const activeFamily = resolveActiveCacheFamily(board);

  if (!environment || !activeFamily) {
    renderError(new Error("Resume isolation atlas is missing environment or family data."));
    return;
  }

  const activeFocus = resolveActiveCacheFocus(board, activeFamily);

  renderResumeIsolationTopBar(board, environment);
  renderResumeIsolationRail(board, activeFamily);
  renderResumeIsolationSummary(board, environment, activeFamily);
  elements.stepList.className = "resume-isolation-page";
  elements.stepList.replaceChildren(
    renderResumeIsolationCanvas(board, activeFamily, activeFocus),
    renderResumeIsolationBoundaryStrip(board, activeFamily, activeFocus),
  );
  renderResumeIsolationInspector(board, environment, activeFamily, activeFocus);
}

function resolveActiveTelemetryEnvironment(board) {
  if (!state.activeTelemetryEnvironmentRef) {
    state.activeTelemetryEnvironmentRef =
      board.selectedEnvironmentRef ?? board.environments?.[0]?.environment_ref ?? null;
  }
  return (
    board.environments?.find(
      (environment) =>
        environment.environment_ref === state.activeTelemetryEnvironmentRef,
    ) ??
    board.environments?.[0] ??
    null
  );
}

function resolveActiveTelemetryFamily(board) {
  if (!state.activeTelemetryFamilyRef) {
    state.activeTelemetryFamilyRef =
      board.selectedFamilyRef ?? board.families?.[0]?.family_ref ?? null;
  }
  return (
    board.families?.find(
      (family) => family.family_ref === state.activeTelemetryFamilyRef,
    ) ??
    board.families?.[0] ??
    null
  );
}

function telemetryFocusRows(activeFamily) {
  return [
    ...(activeFamily.emission_rows ?? []),
    ...(activeFamily.collector_rows ?? []),
    ...(activeFamily.backend_rows ?? []),
    ...(activeFamily.correlation_rows ?? []),
  ];
}

function resolveActiveTelemetryFocus(board, activeFamily) {
  const rows = telemetryFocusRows(activeFamily);
  const selectedFocusRef = board.selectedFocusRef ?? null;
  if (
    state.activeTelemetryFocusRef &&
    rows.some((row) => row.row_ref === state.activeTelemetryFocusRef)
  ) {
    return (
      rows.find((row) => row.row_ref === state.activeTelemetryFocusRef) ?? null
    );
  }
  if (selectedFocusRef && rows.some((row) => row.row_ref === selectedFocusRef)) {
    state.activeTelemetryFocusRef = selectedFocusRef;
    return rows.find((row) => row.row_ref === selectedFocusRef) ?? null;
  }
  state.activeTelemetryFocusRef = null;
  return null;
}

function telemetryBadgeTone(label) {
  const normalized = String(label).toLowerCase();
  if (
    normalized.includes("blocked") ||
    normalized.includes("restricted") ||
    normalized.includes("first-party only")
  ) {
    return "warning";
  }
  if (normalized.includes("audit") || normalized.includes("join")) {
    return "success";
  }
  return "neutral";
}

function renderTelemetrySignalTopBar(board, environment) {
  elements.providerBadge.textContent = board.providerMonogram ?? "OTL";
  elements.runTitle.textContent = `${board.providerDisplayName} atlas`;
  elements.runStatus.textContent = formatLabel(board.selectionPosture);
  elements.runStatus.dataset.status =
    board.selectionPosture === "PROVIDER_SELECTION_REQUIRED" ? "warning" : "success";
  elements.environmentControl.hidden = false;
  elements.environmentChipWrap.hidden = false;
  elements.environmentChip.textContent = board.postureChipLabel;
  elements.environmentSelect.replaceChildren(
    ...(board.environments ?? []).map((entry) => {
      const option = document.createElement("option");
      option.value = entry.environment_ref;
      option.textContent = entry.label;
      option.selected = entry.environment_ref === environment.environment_ref;
      return option;
    }),
  );
  elements.environmentSelect.disabled = false;
  elements.environmentSelect.onchange = () => {
    state.activeTelemetryEnvironmentRef = elements.environmentSelect.value;
    renderTelemetrySignalAtlas(board);
  };
  elements.environmentHint.textContent =
    "Telemetry explains runtime behavior. Append-only audit, authority truth, and release evidence remain first-party durable stores.";
  document.title = `Provisioning Viewer - ${environment.label} telemetry signal atlas`;
}

function renderTelemetrySignalRail(board, activeFamily) {
  elements.runRail.setAttribute(
    "aria-label",
    "Signal families and telemetry routes",
  );
  elements.runList.className = "telemetry-family-rail-list";
  elements.railEyebrow.textContent = "Signal rail";
  elements.railTitle.textContent = "Signal families";
  elements.mainEyebrow.textContent = "Signal routes and audit joins";
  elements.mainTitle.textContent = activeFamily.label;

  elements.runList.replaceChildren(
    ...(board.families ?? []).map((family) => {
      const listItem = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute(
        "aria-current",
        family.family_ref === activeFamily.family_ref ? "true" : "false",
      );
      button.innerHTML = `
        <div class="telemetry-family-rail__title">
          <strong>${family.label}</strong>
          <span class="status-chip" data-status="${family.exportability_label === "First-party only" ? "warning" : "SUCCEEDED"}">${family.retention_class_label}</span>
        </div>
        <div class="telemetry-family-rail__meta">
          <span>${family.primary_backend_label}</span>
          <span class="meta-note">${family.exportability_label}</span>
        </div>
      `;
      button.addEventListener("click", () => {
        state.activeTelemetryFamilyRef = family.family_ref;
        state.activeTelemetryFocusRef = null;
        renderTelemetrySignalAtlas(board);
      });
      listItem.append(button);
      return listItem;
    }),
  );
}

function renderTelemetrySignalSummary(board, environment, activeFamily, activeFocus) {
  elements.runSummary.innerHTML = "";
  const container = document.createElement("div");
  container.className = "atlas-summary";
  container.innerHTML = `
    <div class="atlas-summary__lead">
      <div>
        <p class="eyebrow">Topology posture</p>
        <h2>${environment.label}</h2>
        <p class="ledger-note">${board.summary}</p>
      </div>
      <div class="chip-row"></div>
    </div>
  `;
  const chipRow = container.querySelector(".chip-row");
  chipRow.append(
    createChip(board.topologyChipLabel, "neutral"),
    createChip(activeFamily.label, "success"),
    createChip(activeFocus ? activeFocus.label : activeFamily.exportability_label, "warning"),
  );
  const notes = document.createElement("ul");
  notes.className = "note-list";
  (board.notes ?? []).forEach((note) => {
    const item = document.createElement("li");
    item.textContent = note;
    notes.append(item);
  });
  elements.runSummary.append(container, notes);
}

function createTelemetryAtlasRow(planeLabel, row, active, onSelect) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "telemetry-atlas-row";
  button.dataset.active = active ? "true" : "false";
  button.setAttribute("aria-pressed", active ? "true" : "false");
  button.setAttribute("aria-label", `${planeLabel} row ${row.label}`);
  button.innerHTML = `
    <div class="telemetry-atlas-row__head">
      <div>
        <p class="eyebrow">${planeLabel}</p>
        <strong>${row.label}</strong>
      </div>
      <div class="chip-row"></div>
    </div>
    <p class="ledger-note">${row.detail}</p>
  `;
  const chipRow = button.querySelector(".chip-row");
  (row.badges ?? []).forEach((badge) =>
    chipRow.append(createChip(badge, telemetryBadgeTone(badge))),
  );
  button.addEventListener("click", onSelect);
  return button;
}

function renderTelemetryPlane(planeLabel, eyebrow, rows, activeFocus) {
  const section = document.createElement("section");
  section.className = "telemetry-plane";
  section.innerHTML = `
    <div class="panel-heading">
      <p class="eyebrow">${eyebrow}</p>
      <h3>${planeLabel}</h3>
    </div>
  `;
  const list = document.createElement("div");
  list.className = "telemetry-plane__list";
  rows.forEach((row) => {
    list.append(
      createTelemetryAtlasRow(
        planeLabel,
        row,
        activeFocus?.row_ref === row.row_ref,
        () => {
          state.activeTelemetryFocusRef = row.row_ref;
          renderTelemetrySignalAtlas(state.payload.telemetrySignalAtlas);
        },
      ),
    );
  });
  section.append(list);
  return section;
}

function renderTelemetrySignalCanvas(activeFamily, activeFocus) {
  const section = document.createElement("section");
  section.className = "telemetry-signal-section";
  section.setAttribute("aria-label", "telemetry-atlas-canvas");

  const grid = document.createElement("div");
  grid.className = "telemetry-signal-grid";
  grid.append(
    renderTelemetryPlane(
      "Emission",
      "Runtime emitters",
      activeFamily.emission_rows ?? [],
      activeFocus,
    ),
    renderTelemetryPlane(
      "Collector / Processors",
      "OTLP gateways and processors",
      activeFamily.collector_rows ?? [],
      activeFocus,
    ),
    renderTelemetryPlane(
      "Backends / Sinks",
      "Ownership and storage boundary",
      activeFamily.backend_rows ?? [],
      activeFocus,
    ),
    renderTelemetryPlane(
      "Correlation To Audit",
      "Join keys and lineage",
      activeFamily.correlation_rows ?? [],
      activeFocus,
    ),
  );

  const lineage = document.createElement("section");
  lineage.className = "telemetry-lineage-strip";
  lineage.innerHTML = `
    <div class="panel-heading">
      <p class="eyebrow">Lineage strip</p>
      <h3>Runtime signal -> collector -> backend -> audit join</h3>
    </div>
    <p class="telemetry-lineage-strip__text">${activeFamily.lineage_strip}</p>
  `;

  section.append(grid, lineage);
  return section;
}

function createTelemetryInspectorSection(eyebrow, title, lines) {
  const section = document.createElement("section");
  section.className = "checkpoint-card";
  section.innerHTML = `
    <p class="eyebrow">${eyebrow}</p>
    <h3>${title}</h3>
  `;
  if (lines?.length) {
    const list = document.createElement("ul");
    list.className = "note-list";
    lines.forEach((line) => {
      const item = document.createElement("li");
      item.textContent = line;
      list.append(item);
    });
    section.append(list);
  }
  return section;
}

function renderTelemetrySignalInspector(environment, activeFamily, activeFocus) {
  elements.drawer.dataset.state = "open";
  elements.drawerClose.hidden = true;
  elements.drawerTitle.textContent = activeFocus?.label ?? activeFamily.label;

  const container = document.createElement("div");
  container.className = "atlas-inspector";
  const fields = document.createElement("div");
  fields.className = "field-list";
  fields.append(
    createFieldRow("Environment", environment.label, {
      chips: [createChip(environment.authority_lane_posture, "neutral")],
    }),
    createFieldRow("Signal family", activeFamily.label, {
      monospace: false,
    }),
    createFieldRow("Primary backend", activeFamily.primary_backend_label),
    createFieldRow("Retention class", activeFamily.retention_class_label),
    createFieldRow("Exportability", activeFamily.exportability_label, {
      chips: [createChip(activeFamily.exportability_label, telemetryBadgeTone(activeFamily.exportability_label))],
    }),
  );

  const familySection = document.createElement("section");
  familySection.className = "checkpoint-card";
  familySection.innerHTML = `
    <p class="eyebrow">Family posture</p>
    <h3>${activeFamily.label}</h3>
    <p>${activeFamily.summary}</p>
  `;
  familySection.append(
    createMetadataList([
      ["Sampling", activeFamily.sampling_summary],
      ["Scrub posture", activeFamily.scrub_summary],
      ["Lineage", activeFamily.lineage_strip],
    ]),
  );

  const focusSection = createTelemetryInspectorSection(
    "Focused row",
    activeFocus?.inspector_title ?? "Family overview",
    activeFocus
      ? [activeFocus.detail, ...(activeFocus.inspector_lines ?? [])]
      : activeFamily.inspector_notes,
  );

  const correlationSection = document.createElement("section");
  correlationSection.className = "checkpoint-card";
  correlationSection.innerHTML = `
    <p class="eyebrow">Required keys</p>
    <h3>Correlation to durable truth</h3>
    <p>These keys let telemetry resolve back to first-party audit, workflow, authority, and release evidence without making telemetry authoritative.</p>
  `;
  correlationSection.append(
    createMetadataList(
      (activeFamily.required_key_labels ?? []).map((key, index) => [
        `Key ${index + 1}`,
        key,
      ]),
    ),
  );

  container.append(fields, familySection, focusSection, correlationSection);
  elements.drawerBody.replaceChildren(container);
}

function renderTelemetrySignalAtlas(board) {
  const environment = resolveActiveTelemetryEnvironment(board);
  const activeFamily = resolveActiveTelemetryFamily(board);
  if (!environment || !activeFamily) {
    renderError(new Error("Telemetry signal atlas is missing environment or family data."));
    return;
  }
  const activeFocus = resolveActiveTelemetryFocus(board, activeFamily);

  renderTelemetrySignalTopBar(board, environment);
  renderTelemetrySignalRail(board, activeFamily);
  renderTelemetrySignalSummary(board, environment, activeFamily, activeFocus);
  elements.stepList.className = "telemetry-signal-page";
  elements.stepList.replaceChildren(
    renderTelemetrySignalCanvas(activeFamily, activeFocus),
  );
  renderTelemetrySignalInspector(environment, activeFamily, activeFocus);
}

function resolveActivePostgresEnvironment(board) {
  if (!state.activePostgresEnvironmentRef) {
    state.activePostgresEnvironmentRef =
      board.selectedEnvironmentRef ??
      board.environments?.[0]?.environment_ref ??
      null;
  }
  return (
    board.environments?.find(
      (environment) => environment.environment_ref === state.activePostgresEnvironmentRef,
    ) ?? board.environments?.[0] ?? null
  );
}

function resolveActivePostgresStore(board) {
  if (!state.activePostgresStoreRef) {
    state.activePostgresStoreRef =
      board.selectedStoreRef ??
      board.stores?.[0]?.store_ref ??
      null;
  }
  return (
    board.stores?.find((store) => store.store_ref === state.activePostgresStoreRef) ??
    board.stores?.[0] ??
    null
  );
}

function postgresRoleMatchesStore(role, store) {
  return role.store_refs.includes(store.store_ref);
}

function postgresRolesForStore(board, store) {
  return (board.roles ?? []).filter((role) => postgresRoleMatchesStore(role, store));
}

function resolveActivePostgresRole(board, store) {
  const matchingRoles = postgresRolesForStore(board, store);
  if (!matchingRoles.length) {
    state.activePostgresRoleRef = null;
    return null;
  }
  if (
    !state.activePostgresRoleRef ||
    !matchingRoles.some((role) => role.role_ref === state.activePostgresRoleRef)
  ) {
    state.activePostgresRoleRef =
      board.selectedRoleRef && matchingRoles.some((role) => role.role_ref === board.selectedRoleRef)
        ? board.selectedRoleRef
        : matchingRoles[0].role_ref;
  }
  return (
    matchingRoles.find((role) => role.role_ref === state.activePostgresRoleRef) ??
    matchingRoles[0]
  );
}

function resolveActivePostgresPolicy(board) {
  if (!state.activePostgresPolicyRef) {
    state.activePostgresPolicyRef =
      board.selectedRestorePolicyRef ??
      board.restorePolicies?.[0]?.policy_ref ??
      null;
  }
  return (
    board.restorePolicies?.find(
      (policy) => policy.policy_ref === state.activePostgresPolicyRef,
    ) ?? board.restorePolicies?.[0] ?? null
  );
}

function renderPostgresTopBar(board, environment) {
  elements.providerBadge.textContent = board.providerMonogram ?? "PG";
  elements.runTitle.textContent = `${board.providerDisplayName} ledger`;
  elements.runStatus.textContent = formatLabel(board.selectionPosture);
  elements.runStatus.dataset.status =
    board.selectionPosture === "PROVIDER_SELECTION_REQUIRED" ? "warning" : "success";
  elements.environmentControl.hidden = false;
  elements.environmentChipWrap.hidden = true;
  elements.environmentSelect.replaceChildren(
    ...(board.environments ?? []).map((entry) => {
      const option = document.createElement("option");
      option.value = entry.environment_ref;
      option.textContent = entry.label;
      option.selected = entry.environment_ref === environment.environment_ref;
      return option;
    }),
  );
  elements.environmentSelect.disabled = false;
  elements.environmentSelect.onchange = () => {
    state.activePostgresEnvironmentRef = elements.environmentSelect.value;
    renderControlAndAuditStoreLedger(board);
  };
  elements.environmentHint.textContent = `${board.topologyModeLabel}. ${board.restoreReadinessLabel}.`;
  document.title = `Provisioning Viewer - ${environment.label} stores`;
}

function renderPostgresRail(board, activeStore) {
  elements.runRail.setAttribute("aria-label", "PostgreSQL stores and profiles");
  elements.runList.className = "postgres-store-rail-list";
  elements.railEyebrow.textContent = "Store rail";
  elements.railTitle.textContent = "Control, audit, and restore profiles";
  elements.mainEyebrow.textContent = "Durable truth boundary";
  elements.mainTitle.textContent = activeStore.label;

  elements.runList.replaceChildren(
    ...(board.stores ?? []).map((store) => {
      const listItem = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute(
        "aria-current",
        store.store_ref === activeStore.store_ref ? "true" : "false",
      );
      button.innerHTML = `
        <div class="postgres-store-rail__title">
          <strong>${store.label}</strong>
          <span class="status-chip" data-status="${store.store_kind === "AUDIT_STORE" ? "warning" : store.store_kind.includes("PROFILE") ? "RUNNING" : "SUCCEEDED"}">${formatLabel(store.store_kind)}</span>
        </div>
        <div class="postgres-store-rail__meta">
          <span class="meta-note">${store.database_name_or_null ?? "profile only"}</span>
          <span class="monospace">${store.owner_role_ref}</span>
        </div>
      `;
      button.addEventListener("click", () => {
        state.activePostgresStoreRef = store.store_ref;
        state.activePostgresRoleRef = null;
        renderControlAndAuditStoreLedger(board);
      });
      listItem.append(button);
      return listItem;
    }),
  );
}

function renderPostgresSummary(board, environment, activeStore, activePolicy) {
  elements.runSummary.innerHTML = "";
  const container = document.createElement("div");
  container.className = "atlas-summary";
  container.innerHTML = `
    <div class="atlas-summary__lead">
      <div>
        <p class="eyebrow">Topology posture</p>
        <h2>${environment.label}</h2>
        <p class="ledger-note">${board.summary}</p>
      </div>
      <div class="chip-row"></div>
    </div>
  `;
  const chipRow = container.querySelector(".chip-row");
  chipRow.append(
    createChip(board.topologyModeLabel, "neutral"),
    createChip(formatLabel(environment.ha_posture), "neutral"),
    createChip(activeStore.label, activeStore.store_kind === "AUDIT_STORE" ? "warning" : "success"),
    createChip(activePolicy?.label ?? "Restore", "warning"),
  );
  const notes = document.createElement("ul");
  notes.className = "note-list";
  (board.notes ?? []).forEach((note) => {
    const item = document.createElement("li");
    item.textContent = note;
    notes.append(item);
  });
  elements.runSummary.append(container, notes);
}

function createPostgresLedgerPanel(store, active) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "postgres-ledger-panel";
  button.dataset.active = active ? "true" : "false";
  button.innerHTML = `
    <div class="postgres-ledger-panel__head">
      <div>
        <p class="eyebrow">${store.store_kind === "CONTROL_STORE" ? "Transactional Control Truth" : "Append-Only Audit Evidence"}</p>
        <h3>${store.label}</h3>
      </div>
      <span class="status-chip" data-status="${store.store_kind === "AUDIT_STORE" ? "warning" : "SUCCEEDED"}">${store.database_name_or_null ?? "profile"}</span>
    </div>
  `;
  const grid = document.createElement("div");
  grid.className = "postgres-ledger-panel__grid";
  [
    ["Owner role", store.owner_role_ref],
    ["Schemas", store.schema_names.join(", ") || "n/a"],
    ["Runtime roles", store.runtime_role_refs.join(", ") || "n/a"],
    [
      "Append-only posture",
      store.append_only_posture === "NOT_APPLICABLE"
        ? "Not applicable"
        : "Trigger-guarded append-only",
    ],
  ].forEach(([label, value]) => {
    const cell = document.createElement("div");
    cell.innerHTML = `
      <strong>${label}</strong>
      <span class="${label === "Owner role" ? "monospace" : ""}">${value}</span>
    `;
    grid.append(cell);
  });
  const notes = document.createElement("ul");
  notes.className = "note-list";
  notes.append(
    ...store.notes.map((note) => {
      const item = document.createElement("li");
      item.textContent = note;
      return item;
    }),
  );
  button.append(grid, notes);
  return button;
}

function renderPostgresTwinLedgerSection(board, activeStore) {
  const section = document.createElement("section");
  section.className = "postgres-ledger-section";
  section.innerHTML = `
    <div class="panel-heading">
      <p class="eyebrow">Twin ledger spine</p>
      <h3>Transactional Control Truth / Append-Only Audit Evidence</h3>
    </div>
  `;
  const twin = document.createElement("div");
  twin.className = "postgres-ledger-twin";
  (board.stores ?? [])
    .filter(
      (store) =>
        store.store_kind === "CONTROL_STORE" || store.store_kind === "AUDIT_STORE",
    )
    .forEach((store) => {
      const panel = createPostgresLedgerPanel(store, store.store_ref === activeStore.store_ref);
      panel.addEventListener("click", () => {
        state.activePostgresStoreRef = store.store_ref;
        state.activePostgresRoleRef = null;
        renderControlAndAuditStoreLedger(board);
      });
      twin.append(panel);
    });
  section.append(twin);
  return section;
}

function renderPostgresRoleModelSection(board, activeStore, activeRole) {
  const section = document.createElement("section");
  section.className = "postgres-ledger-section";
  section.innerHTML = `
    <div class="panel-heading">
      <p class="eyebrow">Role Model</p>
      <h3>Role Model</h3>
    </div>
  `;
  const list = document.createElement("div");
  list.className = "postgres-role-list";
  postgresRolesForStore(board, activeStore).forEach((role) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "postgres-role-row";
    button.dataset.active = role.role_ref === activeRole?.role_ref ? "true" : "false";
    button.setAttribute(
      "aria-pressed",
      role.role_ref === activeRole?.role_ref ? "true" : "false",
    );
    button.innerHTML = `
      <div class="postgres-role-row__head">
        <div>
          <p class="eyebrow">${formatLabel(role.actor_class)}</p>
          <strong>${role.label}</strong>
        </div>
        <span class="status-chip" data-status="${role.privilege_band === "AUDIT_APPEND_ONLY" ? "warning" : role.privilege_band === "BACKUP_AND_RESTORE" ? "RUNNING" : "SUCCEEDED"}">${formatLabel(role.privilege_band)}</span>
      </div>
    `;
    const chipRow = document.createElement("div");
    chipRow.className = "chip-row";
    role.capabilities.slice(0, 4).forEach((capability) => {
      chipRow.append(createChip(formatLabel(capability), "neutral"));
    });
    button.append(chipRow);
    button.addEventListener("click", () => {
      state.activePostgresRoleRef = role.role_ref;
      renderControlAndAuditStoreLedger(board);
    });
    list.append(button);
  });
  section.append(list);
  return section;
}

function renderPostgresRestoreStrip(board, activePolicy) {
  const section = document.createElement("section");
  section.className = "postgres-ledger-section postgres-ledger-section--strip";
  section.innerHTML = `
    <div class="panel-heading">
      <p class="eyebrow">PITR / Restore / Migration Window</p>
      <h3>PITR / Restore / Migration Window</h3>
    </div>
  `;
  const strip = document.createElement("div");
  strip.className = "postgres-policy-strip";
  (board.restorePolicies ?? []).forEach((policy) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "postgres-policy-row";
    button.dataset.active = policy.policy_ref === activePolicy?.policy_ref ? "true" : "false";
    button.setAttribute(
      "aria-pressed",
      policy.policy_ref === activePolicy?.policy_ref ? "true" : "false",
    );
    button.innerHTML = `
      <div class="postgres-policy-row__head">
        <div>
          <p class="eyebrow">${policy.rpo_class} / ${policy.rto_class}</p>
          <strong>${policy.label}</strong>
        </div>
        <span class="status-chip" data-status="warning">${policy.gate_codes.length} gates</span>
      </div>
      <p class="ledger-note">${policy.note}</p>
    `;
    button.addEventListener("click", () => {
      state.activePostgresPolicyRef = policy.policy_ref;
      renderControlAndAuditStoreLedger(board);
    });
    strip.append(button);
  });
  section.append(strip);
  return section;
}

function renderPostgresInspector(environment, activeStore, activeRole, activePolicy) {
  elements.drawer.dataset.state = "open";
  elements.drawerClose.hidden = true;
  elements.drawerTitle.textContent = activeStore.label;

  const container = document.createElement("div");
  container.className = "atlas-inspector";
  const fields = document.createElement("div");
  fields.className = "field-list";
  fields.append(
    createFieldRow("Cluster alias", environment.cluster_alias, {
      monospace: true,
      copyValue: environment.cluster_alias,
      copyLabel: "Copy cluster alias",
    }),
    createFieldRow("Database", activeStore.database_name_or_null ?? "profile only", {
      monospace: Boolean(activeStore.database_name_or_null),
    }),
    createFieldRow("Owner role", activeStore.owner_role_ref, {
      monospace: true,
    }),
    createFieldRow("Schemas", activeStore.schema_names.join(", ") || "n/a", {
      monospace: activeStore.schema_names.length > 0,
    }),
    createFieldRow("HA posture", formatLabel(environment.ha_posture), {
      chips: [createChip(formatLabel(environment.read_replica_posture), "neutral")],
    }),
  );

  const roleCard = document.createElement("section");
  roleCard.className = "checkpoint-card";
  roleCard.innerHTML = `
    <p class="eyebrow">Selected role</p>
    <h3>${activeRole?.label ?? "No role selected"}</h3>
    <p>${activeRole?.notes?.[0] ?? "Select a role row to inspect its exact capability boundary."}</p>
  `;
  if (activeRole) {
    roleCard.append(
      createMetadataList([
        ["Role ref", activeRole.role_ref],
        ["Privilege band", activeRole.privilege_band],
      ]),
    );
    const caps = document.createElement("div");
    caps.className = "chip-row";
    activeRole.capabilities.forEach((capability) => {
      caps.append(createChip(formatLabel(capability), "success"));
    });
    activeRole.forbidden_capabilities.forEach((capability) => {
      caps.append(createChip(formatLabel(capability), "warning"));
    });
    roleCard.append(caps);
  }

  const policyCard = document.createElement("section");
  policyCard.className = "checkpoint-card";
  policyCard.innerHTML = `
    <p class="eyebrow">Selected restore policy</p>
    <h3>${activePolicy?.label ?? "No restore policy selected"}</h3>
    <p>${activePolicy?.wal_summary ?? "Select a restore or migration row to inspect the bound PITR law."}</p>
  `;
  if (activePolicy) {
    const gateList = document.createElement("ul");
    gateList.className = "note-list";
    activePolicy.gate_codes.forEach((gateCode) => {
      const item = document.createElement("li");
      item.textContent = gateCode;
      gateList.append(item);
    });
    policyCard.append(gateList);
  }

  const postureCard = document.createElement("section");
  postureCard.className = "checkpoint-card";
  postureCard.innerHTML = `
    <p class="eyebrow">Store posture</p>
    <h3>${activeStore.store_kind === "AUDIT_STORE" ? "Append-only evidence" : activeStore.store_kind.includes("PROFILE") ? "Non-authoritative profile" : "Transactional truth"}</h3>
    <p>${activeStore.topology_posture}</p>
  `;
  postureCard.append(
    createMetadataList([
      ["Ordering", activeStore.order_guarantee],
      ["Retention / restore", activeStore.retention_or_restore_posture],
    ]),
  );

  container.append(fields, roleCard, policyCard, postureCard);
  elements.drawerBody.replaceChildren(container);
}

function renderControlAndAuditStoreLedger(board) {
  const environment = resolveActivePostgresEnvironment(board);
  const activeStore = resolveActivePostgresStore(board);
  if (!environment || !activeStore) {
    renderError(new Error("Control and audit store ledger is missing topology data."));
    return;
  }
  const activeRole = resolveActivePostgresRole(board, activeStore);
  const activePolicy = resolveActivePostgresPolicy(board);
  renderPostgresTopBar(board, environment);
  renderPostgresRail(board, activeStore);
  renderPostgresSummary(board, environment, activeStore, activePolicy);
  elements.stepList.className = "postgres-ledger-canvas";
  elements.stepList.replaceChildren(
    renderPostgresTwinLedgerSection(board, activeStore),
    renderPostgresRoleModelSection(board, activeStore, activeRole),
    renderPostgresRestoreStrip(board, activePolicy),
  );
  renderPostgresInspector(environment, activeStore, activeRole, activePolicy);
}

function renderSecretRootTopBar(board, environment) {
  elements.providerBadge.textContent = board.providerMonogram ?? "KEY";
  elements.runTitle.textContent = `${board.providerDisplayName} ledger`;
  elements.runStatus.textContent = formatLabel(board.selectionPosture);
  elements.runStatus.dataset.status =
    board.selectionPosture === "PROVIDER_SELECTION_REQUIRED" ? "warning" : "success";
  elements.environmentControl.hidden = false;
  elements.environmentChipWrap.hidden = true;
  elements.environmentSelect.replaceChildren(
    ...(board.environments ?? []).map((entry) => {
      const option = document.createElement("option");
      option.value = entry.environment_ref;
      option.textContent = entry.label;
      option.selected = entry.environment_ref === environment.environment_ref;
      return option;
    }),
  );
  elements.environmentSelect.disabled = false;
  elements.environmentSelect.onchange = () => {
    state.activeSecretEnvironmentRef = elements.environmentSelect.value;
    state.activeSecretAliasRef = null;
    state.activeSecretGrantRef = null;
    state.activeSecretNodeRef = null;
    renderSecretRootTopologyLedger(board);
  };
  elements.environmentHint.textContent =
    "Raw secret values never render here. The ledger shows aliases, namespace partitions, key hierarchy, and least-privilege grants only.";
  document.title = `Provisioning Viewer - ${environment.label} secrets`;
}

function renderSecretRootRail(board, environment, activeAlias) {
  const aliases = secretAliasesForEnvironment(board, environment);
  elements.runRail.setAttribute("aria-label", "Secret alias families");
  elements.runList.className = "secret-alias-rail-list";
  elements.railEyebrow.textContent = "Alias rail";
  elements.railTitle.textContent = "Secret alias families";
  elements.mainEyebrow.textContent = "Secret root topology";
  elements.mainTitle.textContent = activeAlias.label;

  elements.runList.replaceChildren(
    ...aliases.map((alias) => {
      const listItem = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute(
        "aria-current",
        alias.alias_ref === activeAlias.alias_ref ? "true" : "false",
      );
      button.innerHTML = `
        <div class="application-list__title">
          <strong>${alias.label}</strong>
          <span class="status-chip" data-status="${alias.value_mode === "METADATA_ONLY" ? "RUNNING" : alias.value_mode === "EXTERNALLY_GENERATED_ONE_TIME_CAPTURE" ? "warning" : "SUCCEEDED"}">${formatLabel(alias.value_mode)}</span>
        </div>
        <div class="application-list__meta">
          <span class="meta-note">${formatLabel(alias.secret_class)}</span>
          <span class="monospace">${alias.alias_ref}</span>
        </div>
      `;
      button.addEventListener("click", () => {
        state.activeSecretAliasRef = alias.alias_ref;
        state.activeSecretGrantRef = null;
        state.activeSecretNodeRef = null;
        renderSecretRootTopologyLedger(board);
      });
      listItem.append(button);
      return listItem;
    }),
  );
}

function renderSecretRootSummary(board, environment, activeAlias) {
  elements.runSummary.innerHTML = "";
  const container = document.createElement("div");
  container.className = "atlas-summary";
  container.innerHTML = `
    <div class="atlas-summary__lead">
      <div>
        <p class="eyebrow">Root posture</p>
        <h2>${environment.label}</h2>
        <p class="ledger-note">${board.summary}</p>
      </div>
      <div class="chip-row"></div>
    </div>
  `;
  const chipRow = container.querySelector(".chip-row");
  chipRow.append(
    createChip(board.rootPostureLabel, "warning"),
    createChip(environment.root_requirement, environment.root_requirement === "OPTIONAL_HSM_CAPABLE_ROOT" ? "warning" : "neutral"),
    createChip(formatLabel(activeAlias.secret_class), "neutral"),
  );
  const notes = document.createElement("ul");
  notes.className = "note-list";
  (board.notes ?? []).forEach((note) => {
    const item = document.createElement("li");
    item.textContent = note;
    notes.append(item);
  });
  elements.runSummary.append(container, notes);
}

function renderSecretRootAliasSection(alias, environment) {
  const namespaceRef = aliasNamespaceForEnvironment(alias, environment);
  const storeRefPreview = alias.store_ref_preview.replace(
    /vault:\/\/(secret|metadata)\/[^/]+/,
    (prefix) => prefix.replace(/[^/]+$/, namespaceRef),
  );
  const metadataRefPreview = alias.metadata_ref_preview.replace(
    /vault:\/\/(secret|metadata)\/[^/]+/,
    (prefix) => prefix.replace(/[^/]+$/, namespaceRef),
  );
  const section = document.createElement("section");
  section.className = "secret-ledger-section";
  section.innerHTML = `
    <div class="panel-heading">
      <p class="eyebrow">Alias Catalog</p>
      <h3>Alias Catalog</h3>
    </div>
  `;
  const card = document.createElement("article");
  card.className = "secret-ledger-card";
  const consumers = document.createElement("div");
  consumers.className = "chip-row";
  alias.consumer_role_refs.forEach((roleRef) => {
    consumers.append(createChip(roleRef, "neutral"));
  });
  card.append(
    createFieldRow("Alias ref", alias.alias_ref, {
      monospace: true,
      copyValue: alias.alias_ref,
      copyLabel: "Copy alias ref",
    }),
    createFieldRow("Store ref preview", storeRefPreview, {
      monospace: true,
      copyValue: storeRefPreview,
      copyLabel: "Copy store ref",
    }),
    createFieldRow("Metadata ref preview", metadataRefPreview, {
      monospace: true,
      copyValue: metadataRefPreview,
      copyLabel: "Copy metadata ref",
    }),
    createFieldRow("Value mode", formatLabel(alias.value_mode), {
      chips: [createChip(environment.label, "neutral")],
      note:
        alias.value_mode === "EXTERNALLY_GENERATED_ONE_TIME_CAPTURE"
          ? "Plaintext may exist only during governed provider reveal and immediate ingestion."
          : undefined,
    }),
    createFieldRow("Rotation policy", alias.rotation_policy_ref, {
      monospace: true,
    }),
    createFieldRow("Allowed consumers", "", {
      chips: Array.from(consumers.children),
    }),
  );
  const notes = document.createElement("ul");
  notes.className = "note-list";
  alias.notes.forEach((note) => {
    const item = document.createElement("li");
    item.textContent = note;
    notes.append(item);
  });
  card.append(notes);
  section.append(card);
  return section;
}

function renderSecretRootHierarchySection(board, alias, activeNode) {
  const section = document.createElement("section");
  section.className = "secret-ledger-section";
  section.innerHTML = `
    <div class="panel-heading">
      <p class="eyebrow">Key Hierarchy</p>
      <h3>Key Hierarchy</h3>
    </div>
  `;
  const chain = document.createElement("div");
  chain.className = "secret-hierarchy-chain";
  keyNodesForAlias(board, alias).forEach((node) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "secret-hierarchy-node";
    button.dataset.active = node.node_ref === activeNode?.node_ref ? "true" : "false";
    button.setAttribute("aria-pressed", node.node_ref === activeNode?.node_ref ? "true" : "false");
    button.innerHTML = `
      <p class="eyebrow">${formatLabel(node.node_kind)}</p>
      <strong>${node.label}</strong>
      <span class="monospace">${node.node_ref}</span>
      <span class="meta-note">${node.namespace_refs.join(", ")}</span>
    `;
    button.addEventListener("click", () => {
      state.activeSecretNodeRef = node.node_ref;
      renderSecretRootTopologyLedger(board);
    });
    chain.append(button);
  });
  section.append(chain);
  return section;
}

function renderSecretRootAccessSection(board, alias, environment, activeGrant) {
  const section = document.createElement("section");
  section.className = "secret-ledger-section";
  section.innerHTML = `
    <div class="panel-heading">
      <p class="eyebrow">Access Matrix</p>
      <h3>Access Matrix</h3>
    </div>
  `;
  const list = document.createElement("div");
  list.className = "secret-access-list";
  (board.accessGrants ?? [])
    .filter((grant) => grantTouchesAliasAndEnvironment(grant, alias, environment))
    .forEach((grant) => {
      const role = secretGrantRole(board, grant);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "secret-access-row";
      button.dataset.active = grant.grant_ref === activeGrant?.grant_ref ? "true" : "false";
      button.setAttribute(
        "aria-pressed",
        grant.grant_ref === activeGrant?.grant_ref ? "true" : "false",
      );
      button.innerHTML = `
        <div class="secret-access-row__head">
          <div>
            <p class="eyebrow">${role?.actor_class ?? "Grant"}</p>
            <strong>${role?.label ?? grant.role_ref}</strong>
          </div>
          <span class="status-chip" data-status="${grant.dual_control_required ? "warning" : "SUCCEEDED"}">${grant.dual_control_required ? "Dual control" : "Routine"}</span>
        </div>
      `;
      const chipRow = document.createElement("div");
      chipRow.className = "chip-row";
      [
        ["read", grant.capabilities.read_secret],
        ["decrypt", grant.capabilities.decrypt_unwrap],
        ["rotate", grant.capabilities.rotate_version],
        ["revoke", grant.capabilities.disable_or_revoke],
      ].forEach(([label, value]) => {
        chipRow.append(
          createChip(
            `${label}:${value.toLowerCase()}`,
            value === "ALLOW" ? "success" : value === "ALLOW_METADATA_ONLY" ? "warning" : "neutral",
          ),
        );
      });
      button.append(chipRow);
      button.addEventListener("click", () => {
        state.activeSecretGrantRef = grant.grant_ref;
        renderSecretRootTopologyLedger(board);
      });
      list.append(button);
    });
  section.append(list);
  return section;
}

function renderSecretRootInspector(board, environment, alias, activeNode, activeGrant) {
  const namespaceRef = aliasNamespaceForEnvironment(alias, environment);
  elements.drawer.dataset.state = "open";
  elements.drawerClose.hidden = true;
  elements.drawerTitle.textContent = alias.label;

  const container = document.createElement("div");
  container.className = "atlas-inspector";

  const fields = document.createElement("div");
  fields.className = "field-list";
  fields.append(
    createFieldRow("Alias ref", alias.alias_ref, {
      monospace: true,
      copyValue: alias.alias_ref,
      copyLabel: "Copy alias ref",
    }),
    createFieldRow("Secret class", formatLabel(alias.secret_class), {
      chips: [createChip(formatLabel(alias.value_mode), alias.value_mode === "VALUE_BEARING" ? "success" : "warning")],
    }),
    createFieldRow("Environment", environment.label, {
      chips: environment.namespace_refs.map((namespaceRef) => createChip(namespaceRef, "neutral")),
    }),
    createFieldRow("Active namespace", namespaceRef, {
      monospace: true,
    }),
    createFieldRow("Key family", alias.key_family_ref, {
      monospace: true,
    }),
    createFieldRow("Rotation policy", alias.rotation_policy_ref, {
      monospace: true,
    }),
  );

  const lineageSection = document.createElement("section");
  lineageSection.className = "checkpoint-card";
  lineageSection.innerHTML = `
    <p class="eyebrow">Lineage posture</p>
    <h3>${formatLabel(alias.lineage_posture)}</h3>
    <p>${alias.notes[0] ?? "Governed lineage only."}</p>
  `;

  const keySection = document.createElement("section");
  keySection.className = "checkpoint-card";
  keySection.innerHTML = `
    <p class="eyebrow">Selected key node</p>
    <h3>${activeNode?.label ?? "No key node selected"}</h3>
    <p>${activeNode?.hardware_posture ?? "No key node details available."}</p>
  `;
  if (activeNode) {
    keySection.append(
      createMetadataList([
        ["Node ref", activeNode.node_ref],
        ["Rotation", activeNode.rotation_mode],
      ]),
    );
  }

  const grantSection = document.createElement("section");
  grantSection.className = "checkpoint-card";
  grantSection.innerHTML = `
    <p class="eyebrow">Selected grant</p>
    <h3>${activeGrant ? (secretGrantRole(board, activeGrant)?.label ?? activeGrant.role_ref) : "No matching grant"}</h3>
    <p>${activeGrant?.notes?.[0] ?? "No matching grant for this alias in the selected environment."}</p>
  `;
  if (activeGrant) {
    grantSection.append(
      createMetadataList([
        ["Role ref", activeGrant.role_ref],
        ["Grant ref", activeGrant.grant_ref],
      ]),
    );
    const capabilityList = document.createElement("ul");
    capabilityList.className = "note-list";
    Object.entries(activeGrant.capabilities).forEach(([label, value]) => {
      const item = document.createElement("li");
      item.innerHTML = `
        <strong>${formatLabel(label)}</strong>
        <span>${formatLabel(value)}</span>
      `;
      capabilityList.append(item);
    });
    grantSection.append(capabilityList);
  }

  container.append(fields, lineageSection, keySection, grantSection);
  elements.drawerBody.replaceChildren(container);
}

function renderSecretRootTopologyLedger(board) {
  const environment = resolveActiveSecretEnvironment(board);
  if (!environment) {
    renderError(new Error("Secret root topology ledger is missing environment data."));
    return;
  }
  const activeAlias = resolveActiveSecretAlias(board, environment);
  if (!activeAlias) {
    renderError(new Error("Secret root topology ledger is missing alias data for the selected environment."));
    return;
  }
  const activeNode = resolveActiveSecretNode(board, activeAlias);
  const activeGrant = resolveActiveSecretGrant(board, activeAlias, environment);
  renderSecretRootTopBar(board, environment);
  renderSecretRootRail(board, environment, activeAlias);
  renderSecretRootSummary(board, environment, activeAlias);
  elements.stepList.className = "secret-ledger-canvas";
  elements.stepList.replaceChildren(
    renderSecretRootAliasSection(activeAlias, environment),
    renderSecretRootHierarchySection(board, activeAlias, activeNode),
    renderSecretRootAccessSection(board, activeAlias, environment, activeGrant),
  );
  renderSecretRootInspector(board, environment, activeAlias, activeNode, activeGrant);
}

async function loadPayload() {
  const response = await fetch(readFixturePath());
  if (!response.ok) {
    throw new Error(`Unable to load viewer fixture: ${response.status}`);
  }
  return response.json();
}

function renderError(error) {
  elements.viewerError.hidden = false;
  elements.viewerError.textContent = error instanceof Error ? error.message : String(error);
}

function bindEvents() {
  elements.drawerClose.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      elements.drawer.dataset.state === "open" &&
      state.activePage !== "idp-topology-atlas" &&
      state.activePage !== "access-stepup-matrix" &&
      state.activePage !== "email-domain-readiness-board" &&
      state.activePage !== "notification-copy-atlas" &&
      state.activePage !== "device-messaging-topology-board" &&
      state.activePage !== "signal-governance-board" &&
      state.activePage !== "support-context-mapping-board" &&
      state.activePage !== "document-extraction-governance-board" &&
      state.activePage !== "upload-intake-safety-board" &&
      state.activePage !== "portal-checkpoint-atlas" &&
      state.activePage !== "secret-root-topology-ledger" &&
      state.activePage !== "control-and-audit-store-ledger" &&
      state.activePage !== "storage-bucket-topology-board" &&
      state.activePage !== "message-fabric-atlas" &&
      state.activePage !== "resume-isolation-atlas" &&
      state.activePage !== "telemetry-signal-atlas"
    ) {
      closeDrawer();
    }
  });
}

async function boot() {
  setMotionPreference();
  bindEvents();

  try {
    state.activePage = readPageId();
    state.payload = await loadPayload();
    elements.workspaceShell.dataset.page = state.activePage;
    elements.drawerClose.hidden = false;

    if (
      state.activePage === "credential-lineage-ledger" &&
      state.payload.credentialLedger?.applications?.length
    ) {
      renderCredentialPage(state.payload.credentialLedger);
    } else if (
      state.activePage === "idp-topology-atlas" &&
      state.payload.idpTopologyAtlas?.tenantRecord?.tenant_records?.length
    ) {
      renderIdpAtlasPage(state.payload.idpTopologyAtlas);
    } else if (
      state.activePage === "access-stepup-matrix" &&
      state.payload.accessStepupMatrix?.stepUpPolicyMatrix?.trigger_rows?.length
    ) {
      renderAccessStepupMatrixPage(state.payload.accessStepupMatrix);
    } else if (
      state.activePage === "email-domain-readiness-board" &&
      state.payload.emailDomainReadinessBoard?.domains?.length
    ) {
      renderEmailDomainReadinessBoard(state.payload.emailDomainReadinessBoard);
    } else if (
      state.activePage === "notification-copy-atlas" &&
      state.payload.notificationCopyAtlas?.templates?.length
    ) {
      renderNotificationCopyAtlas(state.payload.notificationCopyAtlas);
    } else if (
      state.activePage === "device-messaging-topology-board" &&
      state.payload.deviceMessagingTopologyBoard?.channels?.length
    ) {
      renderDeviceMessagingTopologyBoard(state.payload.deviceMessagingTopologyBoard);
    } else if (
      state.activePage === "signal-governance-board" &&
      state.payload.signalGovernanceBoard?.projects?.length
    ) {
      renderSignalGovernanceBoard(state.payload.signalGovernanceBoard);
    } else if (
      state.activePage === "support-context-mapping-board" &&
      state.payload.supportContextMappingBoard?.scenarios?.length
    ) {
      renderSupportContextMappingBoard(state.payload.supportContextMappingBoard);
    } else if (
      state.activePage === "document-extraction-governance-board" &&
      state.payload.documentExtractionGovernanceBoard?.profiles?.length
    ) {
      renderDocumentExtractionGovernanceBoard(
        state.payload.documentExtractionGovernanceBoard,
      );
    } else if (
      state.activePage === "upload-intake-safety-board" &&
      state.payload.uploadIntakeSafetyBoard?.scenarios?.length
    ) {
      renderUploadIntakeSafetyBoard(state.payload.uploadIntakeSafetyBoard);
    } else if (
      state.activePage === "portal-checkpoint-atlas" &&
      state.payload.portalCheckpointAtlas?.scenarios?.length
    ) {
      renderPortalCheckpointAtlas(state.payload.portalCheckpointAtlas);
    } else if (
      state.activePage === "secret-root-topology-ledger" &&
      state.payload.secretRootTopologyLedger?.aliases?.length
    ) {
      renderSecretRootTopologyLedger(state.payload.secretRootTopologyLedger);
    } else if (
      state.activePage === "control-and-audit-store-ledger" &&
      state.payload.controlAndAuditStoreLedger?.stores?.length
    ) {
      renderControlAndAuditStoreLedger(state.payload.controlAndAuditStoreLedger);
    } else if (
      state.activePage === "storage-bucket-topology-board" &&
      state.payload.storageBucketTopologyBoard?.buckets?.length
    ) {
      renderStorageBucketTopologyBoard(state.payload.storageBucketTopologyBoard);
    } else if (
      state.activePage === "message-fabric-atlas" &&
      state.payload.messageFabricAtlas?.channels?.length
    ) {
      renderMessageFabricAtlas(state.payload.messageFabricAtlas);
    } else if (
      state.activePage === "resume-isolation-atlas" &&
      state.payload.resumeIsolationAtlas?.families?.length
    ) {
      renderResumeIsolationAtlas(state.payload.resumeIsolationAtlas);
    } else if (
      state.activePage === "telemetry-signal-atlas" &&
      state.payload.telemetrySignalAtlas?.families?.length
    ) {
      renderTelemetrySignalAtlas(state.payload.telemetrySignalAtlas);
    } else {
      renderDefaultTopBar(state.payload);
      renderRunRail(state.payload);
      renderRunSummary(state.payload);
      renderSteps(state.payload);
    }
    closeDrawer();
  } catch (error) {
    renderError(error);
  }
}

boot();
