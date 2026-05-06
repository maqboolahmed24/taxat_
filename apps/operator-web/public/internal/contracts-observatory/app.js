const dataPaths = {
  navigationIndex: "./data/navigation-index.json",
  searchIndex: "./data/search-index.json",
  siteManifest: "./data/site-manifest.json",
};

const state = {
  artifactCache: new Map(),
  currentArtifact: null,
  currentFieldPath: "",
  currentHeadingSlug: "",
  navigationIndex: null,
  navCollapsed: new Set(),
  recentArtifacts: [],
  searchIndex: [],
  searchOpen: false,
  searchQuery: "",
  searchResults: [],
  searchSelectedIndex: 0,
  siteManifest: null,
};

const RECENT_STORAGE_KEY = "taxat-contracts-observatory-recent";
const SEARCH_LIMIT = 18;

const elements = {
  artifactCanvas: document.querySelector("#artifact-canvas"),
  artifactCopyLink: document.querySelector("#artifact-copy-link"),
  artifactKindChip: document.querySelector("#artifact-kind-chip"),
  artifactPath: document.querySelector("#artifact-path"),
  artifactSummary: document.querySelector("#artifact-summary"),
  artifactTitle: document.querySelector("#artifact-title"),
  bundleChip: document.querySelector("#bundle-chip"),
  commandSearchDialog: document.querySelector("#command-search-dialog"),
  commandSearchInput: document.querySelector("#command-search-input"),
  commandSearchResults: document.querySelector("#command-search-results"),
  commandSearchTrigger: document.querySelector("#command-search-trigger"),
  evidenceRail: document.querySelector("#evidence-rail"),
  evidenceTitle: document.querySelector("#evidence-title"),
  headerStrip: document.querySelector("#header-strip"),
  headingNavigation: document.querySelector("#heading-navigation"),
  navigationSections: document.querySelector("#navigation-sections"),
  pageSubtitle: document.querySelector("#page-subtitle"),
  pageTitle: document.querySelector("#page-title"),
  recentArtifacts: document.querySelector("#recent-artifacts"),
  sourceTruthChip: document.querySelector("#source-truth-chip"),
  sourceTruthStack: document.querySelector("#source-truth-stack"),
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function motionSync() {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  const sync = () => {
    document.documentElement.dataset.motion = media.matches ? "reduce" : "standard";
  };
  sync();
  media.addEventListener("change", sync);
}

function readRecentArtifacts() {
  try {
    const raw = window.localStorage.getItem(RECENT_STORAGE_KEY);
    const value = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value.filter((entry) => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

function persistRecentArtifacts() {
  window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(state.recentArtifacts));
}

function recordRecentArtifact(slug) {
  state.recentArtifacts = [slug, ...state.recentArtifacts.filter((entry) => entry !== slug)].slice(
    0,
    state.siteManifest.recentArtifactLimit,
  );
  persistRecentArtifacts();
}

function artifactBySlug(slug) {
  return state.navigationIndex.sections
    .flatMap((section) => section.artifacts)
    .find((artifact) => artifact.artifactSlug === slug);
}

function deepLinkFor(artifactSlug, headingSlug = "", fieldPath = "") {
  const params = new URLSearchParams();
  params.set("artifact", artifactSlug);
  if (headingSlug) {
    params.set("heading", headingSlug);
  }
  if (fieldPath) {
    params.set("field", fieldPath);
  }
  return `${window.location.pathname}?${params.toString()}`;
}

function currentRouteState() {
  const params = new URLSearchParams(window.location.search);
  return {
    artifactSlug: params.get("artifact") || state.siteManifest.defaultArtifactSlug,
    fieldPath: params.get("field") || "",
    headingSlug: params.get("heading") || "",
  };
}

function updateRoute({ artifactSlug, headingSlug = "", fieldPath = "" }, replace = false) {
  const url = deepLinkFor(artifactSlug, headingSlug, fieldPath);
  if (replace) {
    window.history.replaceState({}, "", url);
  } else {
    window.history.pushState({}, "", url);
  }
}

async function fetchJson(relativePath) {
  const response = await fetch(relativePath);
  if (!response.ok) {
    throw new Error(`Failed to load ${relativePath}`);
  }
  return response.json();
}

async function loadArtifact(slug) {
  if (state.artifactCache.has(slug)) {
    return state.artifactCache.get(slug);
  }
  const artifact = await fetchJson(`./data/artifacts/${slug}.json`);
  state.artifactCache.set(slug, artifact);
  return artifact;
}

function formatInline(text) {
  return escapeHtml(text)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) => {
      const safeHref = escapeHtml(href);
      return `<a href="${safeHref}">${escapeHtml(label)}</a>`;
    })
    .replace(/`([^`]+)`/g, (_match, code) => `<code class="mono">${escapeHtml(code)}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, (_match, bold) => `<strong>${escapeHtml(bold)}</strong>`);
}

function copyText(value) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(value);
  }
  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "true");
  input.style.position = "absolute";
  input.style.opacity = "0";
  document.body.append(input);
  input.select();
  document.execCommand("copy");
  input.remove();
  return Promise.resolve();
}

function makeChip(label) {
  const chip = document.createElement("span");
  chip.className = "stack-chip";
  chip.textContent = label;
  return chip;
}

function createButton(className, label, description) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.setAttribute("aria-label", label);
  if (description) {
    button.title = description;
  }
  return button;
}

function createAnchorRow(title, copyLabel, onCopy) {
  const row = document.createElement("div");
  row.className = "anchor-row";

  const heading = document.createElement("h3");
  heading.innerHTML = formatInline(title);
  row.append(heading);

  const copyButton = createButton("anchor-row__copy", copyLabel);
  copyButton.textContent = "Copy link";
  copyButton.addEventListener("click", onCopy);
  row.append(copyButton);

  return row;
}

function createParagraph(text) {
  const paragraph = document.createElement("p");
  paragraph.innerHTML = formatInline(text);
  return paragraph;
}

function appendMarkdownBlocks(container, lines) {
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line || line.trim().length === 0) {
      index += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const codeLines = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }
      const pre = document.createElement("pre");
      pre.textContent = codeLines.join("\n");
      container.append(pre);
      index += 1;
      continue;
    }

    if (line.startsWith("- ")) {
      const list = document.createElement("ul");
      while (index < lines.length && lines[index].startsWith("- ")) {
        const item = document.createElement("li");
        item.innerHTML = formatInline(lines[index].slice(2));
        list.append(item);
        index += 1;
      }
      container.append(list);
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const list = document.createElement("ol");
      while (index < lines.length && /^\d+\.\s/.test(lines[index])) {
        const item = document.createElement("li");
        item.innerHTML = formatInline(lines[index].replace(/^\d+\.\s/, ""));
        list.append(item);
        index += 1;
      }
      container.append(list);
      continue;
    }

    if (line.startsWith(">")) {
      const quoteLines = [];
      while (index < lines.length && lines[index].startsWith(">")) {
        quoteLines.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }
      const quote = document.createElement("blockquote");
      quote.innerHTML = quoteLines.map((entry) => formatInline(entry)).join("<br />");
      container.append(quote);
      continue;
    }

    const paragraphLines = [];
    while (
      index < lines.length &&
      lines[index].trim().length > 0 &&
      !lines[index].startsWith("```") &&
      !lines[index].startsWith("- ") &&
      !/^\d+\.\s/.test(lines[index]) &&
      !lines[index].startsWith(">")
    ) {
      paragraphLines.push(lines[index]);
      index += 1;
    }
    container.append(createParagraph(paragraphLines.join(" ")));
  }
}

function renderHeaderStrip(headerStrip) {
  const width = 268;
  const height = 72;
  const step = width / Math.max(1, headerStrip.metricPairs.length + 1);
  const circles = headerStrip.metricPairs
    .map((metric, index) => {
      const x = step * (index + 1);
      return `
        <circle cx="${x}" cy="28" r="7"></circle>
        <text x="${x}" y="50" text-anchor="middle">${escapeHtml(metric.label)}</text>
        <text x="${x}" y="64" text-anchor="middle">${escapeHtml(metric.value)}</text>
      `;
    })
    .join("");

  elements.headerStrip.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="presentation" width="100%" height="100%">
      <path d="M18 28H${width - 18}" stroke="rgba(16,20,24,0.14)" stroke-width="1.5" fill="none"></path>
      ${circles}
    </svg>
  `;
}

function renderTopBar() {
  elements.pageTitle.textContent = state.siteManifest.title;
  elements.pageSubtitle.textContent = state.siteManifest.siteSummary;
  elements.artifactKindChip.textContent = state.currentArtifact.artifactKind.replaceAll("_", " ");
  elements.sourceTruthChip.textContent = state.currentArtifact.sourceTruthBadge;
  elements.bundleChip.textContent = `Bundle ${state.siteManifest.currentBundleChip}`;
  elements.artifactPath.textContent = state.currentArtifact.canonicalPath;
  elements.artifactTitle.textContent = state.currentArtifact.title;
  elements.artifactSummary.textContent = state.currentArtifact.summary;
  renderHeaderStrip(state.currentArtifact.headerStrip);
}

function renderSourceTruthStack() {
  elements.sourceTruthStack.replaceChildren();
  const groups = [
    ["Files", state.currentArtifact.sourceTruthStack.file],
    ["Schemas", state.currentArtifact.sourceTruthStack.schemaRefs],
    ["Samples", state.currentArtifact.sourceTruthStack.sampleRefs],
    ["Bindings", state.currentArtifact.sourceTruthStack.bindingRefs],
    ["Validators", state.currentArtifact.sourceTruthStack.validatorRefs],
    ["Tasks", state.currentArtifact.sourceTruthStack.taskRefs],
  ].filter(([, values]) => values.length > 0);

  for (const [label, values] of groups) {
    const group = document.createElement("section");
    group.className = "stack-group";
    const title = document.createElement("div");
    title.className = "stack-group__title";
    title.innerHTML = `<strong>${escapeHtml(label)}</strong><span class="muted">${values.length}</span>`;
    group.append(title);
    const chipRow = document.createElement("div");
    chipRow.className = "stack-group__chips";
    values.slice(0, 12).forEach((value) => chipRow.append(makeChip(value)));
    group.append(chipRow);
    elements.sourceTruthStack.append(group);
  }
}

function renderNavigation() {
  elements.navigationSections.replaceChildren();
  const activeSectionRef = state.currentArtifact.sectionRef;

  state.navigationIndex.sections.forEach((section) => {
    const sectionNode = document.createElement("section");
    sectionNode.className = "navigation-section";

    const toggle = createButton(
      "section-toggle",
      `${section.label} section with ${section.artifactCount} artifacts`,
    );
    toggle.dataset.expanded = String(!state.navCollapsed.has(section.sectionRef));
    toggle.setAttribute("aria-expanded", String(!state.navCollapsed.has(section.sectionRef)));
    toggle.innerHTML = `
      <div class="section-toggle__row">
        <strong>${escapeHtml(section.label)}</strong>
        <span class="muted">${section.artifactCount}</span>
      </div>
      <p class="section-summary">${escapeHtml(section.summary)}</p>
    `;
    toggle.addEventListener("click", () => {
      if (state.navCollapsed.has(section.sectionRef)) {
        state.navCollapsed.delete(section.sectionRef);
      } else {
        state.navCollapsed.add(section.sectionRef);
      }
      renderNavigation();
    });
    sectionNode.append(toggle);

    const list = document.createElement("div");
    list.className = "section-artifacts";
    list.hidden = state.navCollapsed.has(section.sectionRef);
    section.artifacts.forEach((artifact) => {
      const button = createButton(
        "artifact-button",
        `${artifact.title} ${artifact.artifactKind.toLowerCase()} in ${section.label}`,
      );
      button.dataset.active = String(artifact.artifactSlug === state.currentArtifact.artifactSlug);
      button.innerHTML = `
        <div class="artifact-button__meta">
          <strong>${escapeHtml(artifact.title)}</strong>
          <span class="muted">${escapeHtml(artifact.sourceTruthBadge)}</span>
        </div>
        <p class="artifact-button__summary">${escapeHtml(
          artifact.summary || artifact.subtitle,
        )}</p>
      `;
      button.addEventListener("click", () => navigateToArtifact(artifact.artifactSlug));
      list.append(button);
    });
    sectionNode.append(list);

    if (section.sectionRef === activeSectionRef) {
      state.navCollapsed.delete(section.sectionRef);
    }

    elements.navigationSections.append(sectionNode);
  });
}

function renderHeadingRail() {
  elements.headingNavigation.replaceChildren();
  if (!state.currentArtifact.headings.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No heading anchors recorded for this artifact.";
    elements.headingNavigation.append(empty);
    return;
  }

  state.currentArtifact.headings.forEach((heading) => {
    const button = createButton(
      "heading-button",
      `Navigate to heading ${heading.text}`,
    );
    button.dataset.active = String(heading.slug === state.currentHeadingSlug);
    button.innerHTML = `
      <div class="artifact-button__meta">
        <strong>${escapeHtml(heading.text)}</strong>
        <span class="muted">H${heading.level}</span>
      </div>
    `;
    button.addEventListener("click", () => {
      state.currentHeadingSlug = heading.slug;
      updateRoute({
        artifactSlug: state.currentArtifact.artifactSlug,
        headingSlug: heading.slug,
        fieldPath: state.currentFieldPath,
      });
      renderHeadingRail();
      scrollSelectionIntoView();
    });
    elements.headingNavigation.append(button);
  });
}

function renderRecentArtifacts() {
  elements.recentArtifacts.replaceChildren();
  const recents = state.recentArtifacts
    .map((slug) => artifactBySlug(slug))
    .filter((artifact) => artifact && artifact.artifactSlug !== state.currentArtifact.artifactSlug);

  if (!recents.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "Visited artifacts appear here once you move through the atlas.";
    elements.recentArtifacts.append(empty);
    return;
  }

  recents.forEach((artifact) => {
    const button = createButton(
      "recent-button",
      `Reopen recent artifact ${artifact.title}`,
    );
    button.innerHTML = `
      <div class="artifact-button__meta">
        <strong>${escapeHtml(artifact.title)}</strong>
        <span class="muted">${escapeHtml(artifact.sourceTruthBadge)}</span>
      </div>
      <p class="recent-button__summary">${escapeHtml(artifact.subtitle)}</p>
    `;
    button.addEventListener("click", () => navigateToArtifact(artifact.artifactSlug));
    elements.recentArtifacts.append(button);
  });
}

function renderHeadingSection(section, isRelated) {
  const card = document.createElement("section");
  card.className = "content-card";
  card.dataset.related = String(isRelated);
  card.id = `heading-${section.headingSlug}`;
  card.append(
    createAnchorRow(
      section.headingText,
      `Copy link for heading ${section.headingText}`,
      () =>
        copyText(
          deepLinkFor(state.currentArtifact.artifactSlug, section.headingSlug, state.currentFieldPath),
        ),
    ),
  );
  appendMarkdownBlocks(card, section.lines);
  return card;
}

function renderSchemaFields(artifact) {
  if (!artifact.schemaFields.length) {
    return null;
  }

  const container = document.createElement("section");
  container.className = "field-groups";

  const groups = new Map();
  artifact.schemaFields.forEach((field) => {
    if (!groups.has(field.topLevelGroup)) {
      groups.set(field.topLevelGroup, []);
    }
    groups.get(field.topLevelGroup).push(field);
  });

  for (const [groupName, fields] of groups.entries()) {
    const details = document.createElement("details");
    details.className = "field-group";
    details.open = fields.length <= state.siteManifest.largeSchemaFieldCollapseThreshold;

    const summary = document.createElement("summary");
    summary.innerHTML = `
      <div class="section-toggle__row">
        <strong>${escapeHtml(groupName || "root")}</strong>
        <span class="muted">${fields.length} fields</span>
      </div>
    `;
    details.append(summary);

    const body = document.createElement("div");
    body.className = "field-group__body";
    fields.forEach((field) => {
      const crosslink =
        artifact.fieldCrosslinks.find((entry) => entry.fieldPath === field.path) ?? {
          proseTargets: [],
          sampleTargets: [],
        };
      const button = createButton(
        "field-button",
        `${field.label} field links to ${crosslink.proseTargets.length} prose sections and ${crosslink.sampleTargets.length} sample fragments`,
      );
      button.dataset.active = String(state.currentFieldPath === field.path);
      button.id = `field-${field.path.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
      button.innerHTML = `
        <div class="field-button__meta">
          <strong>${escapeHtml(field.path)}</strong>
          <span class="muted">${escapeHtml(field.typeLabel)}</span>
        </div>
        <p class="field-button__detail">${field.required ? "Required" : "Optional"} · ${escapeHtml(
          field.topLevelGroup,
        )}</p>
        ${
          field.descriptionOrNull
            ? `<p class="field-button__description">${escapeHtml(field.descriptionOrNull)}</p>`
            : ""
        }
      `;
      button.addEventListener("click", () => {
        state.currentFieldPath = field.path;
        updateRoute({
          artifactSlug: artifact.artifactSlug,
          headingSlug: state.currentHeadingSlug,
          fieldPath: field.path,
        });
        render();
      });
      body.append(button);
    });
    details.append(body);
    container.append(details);
  }

  return container;
}

function renderSamplePointers(artifact, filteredPointers = artifact.samplePointers) {
  const card = document.createElement("section");
  card.className = "content-card";
  const title = document.createElement("h3");
  title.textContent = "Sample fragments";
  card.append(title);

  const grid = document.createElement("div");
  grid.className = "sample-grid";
  filteredPointers.slice(0, 32).forEach((pointer) => {
    const row = document.createElement("div");
    row.className = "sample-fragment";
    row.dataset.related = String(state.currentFieldPath && pointer.pointer.endsWith(`/${state.currentFieldPath.split(".").at(-1)}`));
    row.innerHTML = `
      <div class="artifact-button__meta">
        <strong class="mono">${escapeHtml(pointer.pointer || "/")}</strong>
        <span class="muted">${escapeHtml(pointer.topLevelGroup)}</span>
      </div>
      <p class="sample-pointer__preview">${escapeHtml(pointer.preview)}</p>
    `;
    grid.append(row);
  });
  card.append(grid);
  return card;
}

function renderArtifactCanvas() {
  elements.artifactCanvas.replaceChildren();
  const artifact = state.currentArtifact;

  artifact.proseSections.forEach((section) => {
    const currentFieldLink = artifact.fieldCrosslinks.find(
      (entry) => entry.fieldPath === state.currentFieldPath,
    );
    const isRelated =
      currentFieldLink?.proseTargets.some((target) => target.headingSlug === section.headingSlug) ??
      false;
    elements.artifactCanvas.append(renderHeadingSection(section, isRelated));
  });

  if (artifact.schemaIdentityOrNull) {
    const summaryCard = document.createElement("section");
    summaryCard.className = "content-card schema-grid";
    summaryCard.innerHTML = `
      <div class="anchor-row">
        <div>
          <h3>Schema identity</h3>
          <p class="artifact-summary mono">${escapeHtml(artifact.schemaIdentityOrNull.schemaId)}</p>
        </div>
      </div>
      <div class="relationship-grid">
        <div><strong>Logical family</strong><p>${escapeHtml(
          artifact.schemaIdentityOrNull.logicalFamilyLabel,
        )}</p></div>
        <div><strong>Validation</strong><p>${escapeHtml(
          artifact.schemaIdentityOrNull.validationPosture,
        )}</p></div>
        <div><strong>Source hash</strong><p class="mono">${escapeHtml(
          artifact.schemaIdentityOrNull.sourceHash.slice(0, 16),
        )}</p></div>
        <div><strong>Mirror hash</strong><p class="mono">${escapeHtml(
          artifact.schemaIdentityOrNull.destinationHash.slice(0, 16),
        )}</p></div>
      </div>
    `;
    elements.artifactCanvas.append(summaryCard);
    const fieldGroups = renderSchemaFields(artifact);
    if (fieldGroups) {
      elements.artifactCanvas.append(fieldGroups);
    }
  }

  if (artifact.sampleIdentityOrNull) {
    elements.artifactCanvas.append(renderSamplePointers(artifact));
  }

  if (artifact.bindingIdentityOrNull) {
    const card = document.createElement("section");
    card.className = "content-card relationship-grid";
    card.innerHTML = `
      <div><strong>Language</strong><p>${escapeHtml(artifact.bindingIdentityOrNull.languageRef)}</p></div>
      <div><strong>Family</strong><p>${escapeHtml(artifact.bindingIdentityOrNull.familyRef)}</p></div>
      <div><strong>Coverage</strong><p>${escapeHtml(
        artifact.bindingIdentityOrNull.coverageClass,
      )}</p></div>
      <div><strong>Output</strong><p class="mono">${escapeHtml(
        artifact.bindingIdentityOrNull.outputRef,
      )}</p></div>
    `;
    if (artifact.bindingIdentityOrNull.gapIds.length) {
      const gapCard = document.createElement("section");
      gapCard.className = "content-card";
      gapCard.innerHTML = "<h3>Gap register</h3>";
      const list = document.createElement("div");
      list.className = "quiet-list";
      artifact.bindingIdentityOrNull.gapIds.forEach((gapId) => {
        const row = document.createElement("div");
        row.className = "sample-fragment";
        row.innerHTML = `<strong class="mono">${escapeHtml(gapId)}</strong>`;
        list.append(row);
      });
      gapCard.append(list);
      elements.artifactCanvas.append(card, gapCard);
    } else {
      elements.artifactCanvas.append(card);
    }
  }

  if (artifact.validatorIdentityOrNull) {
    const card = document.createElement("section");
    card.className = "content-card relationship-grid";
    card.innerHTML = `
      <div><strong>Command</strong><p class="mono">${escapeHtml(
        artifact.validatorIdentityOrNull.command,
      )}</p></div>
      <div><strong>Adaptation posture</strong><p>${escapeHtml(
        artifact.validatorIdentityOrNull.adaptationPosture,
      )}</p></div>
      <div><strong>Source hash</strong><p class="mono">${escapeHtml(
        artifact.validatorIdentityOrNull.sourceHash.slice(0, 16),
      )}</p></div>
      <div><strong>Mirror hash</strong><p class="mono">${escapeHtml(
        artifact.validatorIdentityOrNull.destinationHash.slice(0, 16),
      )}</p></div>
    `;
    elements.artifactCanvas.append(card);
  }

  if (artifact.driftIdentityOrNull) {
    const card = document.createElement("section");
    card.className = "content-card relationship-grid";
    card.innerHTML = `
      <div><strong>Verdict</strong><p>${escapeHtml(artifact.driftIdentityOrNull.verdictRef)}</p></div>
      <div><strong>Admissibility</strong><p>${escapeHtml(
        artifact.driftIdentityOrNull.admissibilityState,
      )}</p></div>
      <div><strong>Rollback</strong><p>${escapeHtml(
        artifact.driftIdentityOrNull.rollbackBoundaryState,
      )}</p></div>
      <div><strong>Reader window</strong><p>${escapeHtml(
        artifact.driftIdentityOrNull.compatibilityWindowRef,
      )}</p></div>
    `;
    elements.artifactCanvas.append(card);
  }
}

function relationshipCard(title, links, emptyCopy) {
  const card = document.createElement("section");
  card.className = "evidence-card";
  const header = document.createElement("div");
  header.className = "evidence-card__header";
  header.innerHTML = `<strong>${escapeHtml(title)}</strong><span class="muted">${links.length}</span>`;
  card.append(header);

  if (!links.length) {
    const empty = document.createElement("p");
    empty.className = "evidence-card__body";
    empty.textContent = emptyCopy;
    card.append(empty);
    return card;
  }

  const list = document.createElement("div");
  list.className = "quiet-list";
  links.slice(0, 12).forEach((link) => {
    const button = createButton(
      "evidence-link",
      `${link.title} ${link.reason}`,
    );
    button.innerHTML = `
      <div class="artifact-button__meta">
        <strong>${escapeHtml(link.title)}</strong>
        <span class="muted">${escapeHtml(link.kind)}</span>
      </div>
      <p class="evidence-card__body">${escapeHtml(link.reason)}</p>
    `;
    button.addEventListener("click", () =>
      navigateToArtifact(link.artifactSlug, link.headingSlugOrNull || "", ""),
    );
    list.append(button);
  });
  card.append(list);
  return card;
}

function renderEvidenceRail() {
  const artifact = state.currentArtifact;
  const currentFieldLink = artifact.fieldCrosslinks.find(
    (entry) => entry.fieldPath === state.currentFieldPath,
  );
  elements.evidenceTitle.textContent = currentFieldLink
    ? `Field evidence · ${state.currentFieldPath}`
    : "Evidence rail";
  elements.evidenceRail.replaceChildren();

  const lineageCard = document.createElement("section");
  lineageCard.className = "evidence-card";
  lineageCard.innerHTML = `
    <div class="evidence-card__header">
      <strong>Source lineage</strong>
      <span class="muted">${artifact.sourceLineage.length}</span>
    </div>
  `;
  const lineageList = document.createElement("div");
  lineageList.className = "evidence-card__chips";
  artifact.sourceLineage.forEach((entry) => lineageList.append(makeChip(entry)));
  lineageCard.append(lineageList);
  elements.evidenceRail.append(lineageCard);

  if (currentFieldLink) {
    const fieldCard = document.createElement("section");
    fieldCard.className = "evidence-card";
    fieldCard.innerHTML = `
      <div class="evidence-card__header">
        <strong>Selected field</strong>
        <span class="muted">${escapeHtml(state.currentFieldPath)}</span>
      </div>
      <p class="evidence-card__body">${currentFieldLink.proseTargets.length} prose references and ${currentFieldLink.sampleTargets.length} sample fragments.</p>
    `;
    const body = document.createElement("div");
    body.className = "quiet-list";

    currentFieldLink.proseTargets.forEach((target) => {
      const button = createButton(
        "evidence-link",
        `${target.title} heading ${target.headingSlug}`,
      );
      button.innerHTML = `
        <div class="artifact-button__meta">
          <strong>${escapeHtml(target.title)}</strong>
          <span class="muted">${escapeHtml(target.headingSlug)}</span>
        </div>
        <p class="evidence-card__body">${escapeHtml(target.excerpt)}</p>
      `;
      button.addEventListener("click", () =>
        navigateToArtifact(target.artifactSlug, target.headingSlug, ""),
      );
      body.append(button);
    });

    currentFieldLink.sampleTargets.forEach((target) => {
      const fragment = document.createElement("div");
      fragment.className = "sample-fragment";
      fragment.innerHTML = `
        <div class="artifact-button__meta">
          <strong>${escapeHtml(target.artifactSlug)}</strong>
          <span class="mono">${escapeHtml(target.pointer)}</span>
        </div>
        <p class="sample-pointer__preview">${escapeHtml(target.preview)}</p>
      `;
      body.append(fragment);
    });
    fieldCard.append(body);
    elements.evidenceRail.append(fieldCard);
  }

  elements.evidenceRail.append(
    relationshipCard("Linked schemas", artifact.relationships.schemas, "No schema links recorded."),
    relationshipCard("Linked samples", artifact.relationships.samples, "No sample links recorded."),
    relationshipCard("Binding companions", artifact.relationships.bindings, "No binding companions recorded."),
    relationshipCard("Validator entrypoints", artifact.relationships.validators, "No validator links recorded."),
    relationshipCard("Support documents", artifact.relationships.docs, "No supporting documents linked."),
    relationshipCard("Task references", artifact.relationships.tasks, "No task references linked."),
  );
}

function scrollSelectionIntoView() {
  window.requestAnimationFrame(() => {
    const fieldId = state.currentFieldPath
      ? `field-${state.currentFieldPath.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`
      : "";
    const fieldNode = fieldId ? document.getElementById(fieldId) : null;
    const headingNode = state.currentHeadingSlug
      ? document.getElementById(`heading-${state.currentHeadingSlug}`)
      : null;
    (fieldNode || headingNode)?.scrollIntoView({ block: "center", inline: "nearest" });
  });
}

function render() {
  renderTopBar();
  renderNavigation();
  renderHeadingRail();
  renderRecentArtifacts();
  renderSourceTruthStack();
  renderArtifactCanvas();
  renderEvidenceRail();
  scrollSelectionIntoView();
}

async function navigateToArtifact(artifactSlug, headingSlug = "", fieldPath = "", replace = false) {
  state.currentArtifact = await loadArtifact(artifactSlug);
  state.currentHeadingSlug = headingSlug;
  state.currentFieldPath = fieldPath;
  recordRecentArtifact(artifactSlug);
  updateRoute({ artifactSlug, headingSlug, fieldPath }, replace);
  render();
}

function currentSearchResults() {
  const query = state.searchQuery.trim().toLowerCase();
  const searchEntries = Array.isArray(state.searchIndex) ? state.searchIndex : [];
  if (!query) {
    return state.recentArtifacts
      .map((slug) => artifactBySlug(slug))
      .filter(Boolean)
      .map((artifact) => ({
        title: artifact.title,
        summary: artifact.summary,
        deepLink: deepLinkFor(artifact.artifactSlug),
        artifactKind: artifact.artifactKind,
      }))
      .slice(0, SEARCH_LIMIT);
  }

  return searchEntries
    .filter(
      (entry) =>
        entry.title.toLowerCase().includes(query) || entry.searchText.toLowerCase().includes(query),
    )
    .slice(0, SEARCH_LIMIT);
}

function renderSearchResults() {
  state.searchResults = currentSearchResults();
  state.searchSelectedIndex = Math.min(
    state.searchSelectedIndex,
    Math.max(0, state.searchResults.length - 1),
  );
  elements.commandSearchResults.replaceChildren();

  if (!state.searchResults.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No matching artifacts, headings, fields, or task references.";
    elements.commandSearchResults.append(empty);
    return;
  }

  state.searchResults.forEach((entry, index) => {
    const button = createButton(
      "search-result",
      `${entry.title} ${entry.summary}`,
    );
    button.dataset.active = String(index === state.searchSelectedIndex);
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(index === state.searchSelectedIndex));
    button.innerHTML = `
      <div class="search-result__meta">
        <strong>${escapeHtml(entry.title)}</strong>
        <span class="muted">${escapeHtml(entry.artifactKind)}</span>
      </div>
      <p class="search-result__summary">${escapeHtml(entry.summary)}</p>
    `;
    button.addEventListener("click", () => {
      commitSearchSelection(index);
    });
    elements.commandSearchResults.append(button);
  });
}

function refreshSearchQuery(resetSelection = false) {
  const liveValue = elements.commandSearchInput?.value || "";
  const queryChanged = liveValue !== state.searchQuery;
  state.searchQuery = liveValue;
  if (resetSelection || queryChanged) {
    state.searchSelectedIndex = 0;
  }
  renderSearchResults();
}

function openSearch() {
  state.searchOpen = true;
  elements.commandSearchDialog.hidden = false;
  elements.commandSearchInput.value = "";
  state.searchQuery = "";
  state.searchSelectedIndex = 0;
  renderSearchResults();
  elements.commandSearchInput.focus();
}

function closeSearch() {
  state.searchOpen = false;
  elements.commandSearchDialog.hidden = true;
}

function commitSearchSelection(index) {
  const entry = state.searchResults[index];
  if (!entry) {
    return;
  }
  const url = new URL(entry.deepLink, window.location.href);
  closeSearch();
  navigateToArtifact(
    url.searchParams.get("artifact") || state.siteManifest.defaultArtifactSlug,
    url.searchParams.get("heading") || "",
    url.searchParams.get("field") || "",
  );
}

function handleSearchKeydown(event) {
  if (!state.searchOpen) {
    return;
  }
  if (event.key === "ArrowDown") {
    event.preventDefault();
    state.searchSelectedIndex = Math.min(
      state.searchSelectedIndex + 1,
      Math.max(0, state.searchResults.length - 1),
    );
    renderSearchResults();
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    state.searchSelectedIndex = Math.max(0, state.searchSelectedIndex - 1);
    renderSearchResults();
  } else if (event.key === "Enter") {
    event.preventDefault();
    refreshSearchQuery(false);
    commitSearchSelection(state.searchSelectedIndex);
  } else if (event.key === "Escape") {
    event.preventDefault();
    closeSearch();
  }
}

async function bootstrap() {
  motionSync();
  state.recentArtifacts = readRecentArtifacts();
  const [siteManifest, navigationIndex, searchIndexDocument] = await Promise.all([
    fetchJson(dataPaths.siteManifest),
    fetchJson(dataPaths.navigationIndex),
    fetchJson(dataPaths.searchIndex),
  ]);
  state.siteManifest = siteManifest;
  state.navigationIndex = navigationIndex;
  state.searchIndex = Array.isArray(searchIndexDocument.entries) ? searchIndexDocument.entries : [];

  const route = currentRouteState();
  await navigateToArtifact(route.artifactSlug, route.headingSlug, route.fieldPath, true);

  elements.commandSearchTrigger.addEventListener("click", openSearch);
  elements.commandSearchInput.addEventListener("input", () => refreshSearchQuery(true));
  elements.commandSearchInput.addEventListener("change", () => refreshSearchQuery(true));
  elements.commandSearchInput.addEventListener("search", () => refreshSearchQuery(true));
  elements.commandSearchDialog.addEventListener("click", (event) => {
    if (event.target === elements.commandSearchDialog) {
      closeSearch();
    }
  });
  elements.artifactCopyLink.addEventListener("click", () =>
    copyText(
      deepLinkFor(
        state.currentArtifact.artifactSlug,
        state.currentHeadingSlug,
        state.currentFieldPath,
      ),
    ),
  );
  window.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      openSearch();
      return;
    }
    handleSearchKeydown(event);
  });
  window.addEventListener("popstate", async () => {
    const routeState = currentRouteState();
    await navigateToArtifact(
      routeState.artifactSlug,
      routeState.headingSlug,
      routeState.fieldPath,
      true,
    );
  });
}

bootstrap().catch((error) => {
  console.error(error);
  elements.artifactCanvas.innerHTML = `
    <section class="content-card">
      <h3>Observatory load failure</h3>
      <p>${escapeHtml(error.message || String(error))}</p>
    </section>
  `;
});
