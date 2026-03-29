# UI/UX Design Skill — Taxat Decision Observatory

## Purpose
This skill defines the product experience standard for the Taxat evidence-linked manifest decision engine.
It exists to ensure every interface built on top of the algorithm feels bespoke, high-trust, and operationally elegant rather than like a generic enterprise dashboard.

The interface should translate complex artifacts such as `RunManifest`, `GateDecisionRecord`, `TrustSummary`, `EvidenceGraph`, `FilingPacket`, `SubmissionRecord`, `DriftRecord`, and `AmendmentCase` into a lucid decision environment where the user can understand three things instantly:

1. what the system believes
2. why it believes it
3. what the safest next move is

---

## When to use this skill
Use this skill whenever the work involves:

- designing a new application shell or workflow for the Taxat engine
- mapping algorithmic phases into product surfaces
- inventing novel components for manifests, gates, provenance, trust, filing, or amendment flows
- improving usability of complex decision states
- designing internal tools for operators, reviewers, compliance analysts, or clients
- creating prototypes, mocks, specs, or implementation guidance for frontend teams

---

## Interface families and profile boundaries
The broader product requires at least three distinct interface families.
They share typography, motion discipline, accessibility standards, and auditability expectations, but they SHALL NOT share one layout grammar blindly.

### A. Decision workspace
This is the calm-shell workspace described throughout this file and constrained by `low_noise_experience_contract.md`.
It optimizes for one current posture, one safe next move, and progressive disclosure of forensic depth.

### B. Admin/Governance Console
This is a high-control control-plane interface for tenant configuration, access policy, authority-link operations, retention, and audit investigation.
It optimizes for comparison, staged mutation, blast-radius review, and append-only accountability rather than single-thread decision progression.

The Admin/Governance Console is **not** a variant of the calm shell.
In that surface, visible denials, explicit matrix cells, inventory tables, diff review, and audit sidecars are material features rather than noise.
When the task involves tenant policy, role or authority-link management, retention, erasure, legal hold, or audit reconstruction, use the governance-console architecture in `admin_governance_console_architecture.md`.

### C. Customer/Client portal
Client-facing experiences SHALL use `customer_client_portal_experience_contract.md` and a separate task-centric navigation model.
The client portal SHALL:

- translate gates, trust, workflow, and authority posture into plain-language status, tasks, deadlines, and confirmations
- avoid raw reason codes, manifest lineage, graph-first navigation, Packet Forge, and other observatory modules as first-view surfaces
- limit persistent global navigation to at most five destinations: `Home`, `Documents`, `Approvals`, `Onboarding` when active, and `Help`
- optimize for reassurance, low-friction completion, and mobile-first document capture rather than expert investigation

When a proposal mixes staff and client concerns, separate the flows rather than compromise both.

---

## Production profile precedence
The observatory language in this document is the semantic underlay, not a requirement that every named artifact be simultaneously visible.
For the default staff decision workspace, `low_noise_experience_contract.md` takes precedence over any later guidance that would otherwise create competing focal points, persistent multi-rail scan paths, ornamental motion, or parallel primary actions.
The Admin/Governance Console and customer/client portal use their own dedicated architecture contracts.

In production, the interface SHALL behave as a **calm decision workspace powered by an observatory backplane**.
That means:

- the user sees one dominant posture at a time, not every possible semantic object at once
- forensic depth remains available on demand, but starts collapsed behind clear detail entry points
- the shell answers three questions in order: current posture, why, and safest next move
- named observatory components remain valid implementation modules, but they are no longer assumed to be concurrent first-class surfaces in the default layout

---

## Experience north star
Design the product as a **calm decision workspace powered by a Decision Observatory**.
Not a dashboard. Not a form wizard. Not an ornamental control room.

The default experience should feel exact, quiet, and trustworthy.
Users should understand the current posture, why it exists, and the safest next move in one short scan cycle.
Depth remains available, but it arrives only when the user invites it.

The visual and interaction model should communicate:

- immutability where the system is frozen
- liveness where authority, workflow, or submission state is moving
- containment where risk or drift is unresolved
- progression where one safe next move exists

---

## Design philosophy

### 1. Compress semantics before adding visual novelty
The algorithm is phase-based, stateful, and evidence-linked.
The UI should preserve that structure, but the default shell must compress it into one dominant posture, one dominant action, and one active investigation path.

### 2. Make certainty and uncertainty equally legible
A polished UI that hides doubt is dangerous.
Confidence, trust posture, gate reason, limitation, override, and late-data caveat should be visible without forcing the user into a forensic search.

### 3. Show consequence, not merely status
A blocked gate is not merely red.
It should reveal which downstream actions are frozen, which tasks are opened, and what can legally happen next.

### 4. Use semantic distinction without visual novelty inflation
Artifacts may remain semantically distinct without each demanding a bespoke first-view silhouette.
The default shell should reuse a restrained component grammar and reserve special visual treatment for legal significance, not for taxonomy alone.

### 5. Preserve narrative continuity
Users should never lose context when moving from summary to detail.
Every drill-down should keep the current manifest, period, scope, trust posture, and next-action state visible.

### 6. Support skim first, inspect second
The product must satisfy both rapid operational scanning and deep investigative reasoning.
Every default surface should answer one question quickly and expose a deterministic path to deeper evidence.

### 7. Recognition beats recall
The user should not need to remember earlier rail content, decode hover-only states, or infer system posture from decorative topology.
Labels, reasons, and next actions must be explicit.

### 8. Omission beats disabled clutter
Illegal, unavailable, or non-material controls should be omitted from the default shell.
Visible controls must communicate possibility rather than tease unavailable branches.

---

## Core design language

### Visual identity
Adopt a restrained, low-noise identity.
The base UI should rely on disciplined spacing, clear grouping, and durable typography rather than theatrical chrome or sci-fi ornament.

### Palette behavior
Use a near-monochrome base and one accent family at a time.

- **Charcoal / stone / mist** for structural surfaces and readable density
- **Blue** for active continuity, live linkage, and focus
- **Amber** for notice, caution, and pending human action
- **Red** only for hard failure, integrity fracture, or explicit block
- **Green** only for verified completion or confirmed progression

Color must never operate alone.
Every state also needs text, iconography, and stable placement.

### Typography
Use one highly legible sans family for labels, summaries, and actions.
Reserve mono or semi-mono treatment for hashes, manifest identifiers, policy refs, authority refs, and evidence coordinates.
The product should feel calm at the summary layer and exact at the forensic layer.

### Shape language
Prefer quiet planes, consistent radii, clear dividers, and generous whitespace.
Avoid decorative corners, ornamental rings, or shape systems that force the user to learn a new metaphor before understanding the posture.

### Motion language
Motion should clarify causality and nothing else.
Use brief transitions for focus changes, state changes, and mounted-detail expansion.
No ambient loops, theatrical pulses, or decorative trajectory lines should appear in the default shell.

### Copy discipline
Primary-shell copy must be short, literal, and action-oriented.
Default surfaces should prefer plain language over branded metaphor, one sentence over stacked clauses, and explicit state labels over clever phrasing.

---

## Layout strategy
The default product MUST use a calm-shell layout with one vertical reading path and four persistent surfaces.

### Default product shell
1. `CONTEXT_BAR` for identity, scope, phase, freshness, truth origin, and ownership
2. `DECISION_SUMMARY` for the dominant posture plus bounded reasons and uncertainty
3. `ACTION_STRIP` for the single safest next move or explicit `NO_SAFE_ACTION`
4. `DETAIL_DRAWER` for on-demand evidence, authority, drift, packet, compare, and audit depth

The richer observatory surfaces below remain valid as semantic source modules and investigation-mode views only.
They SHALL NOT appear as concurrent peer regions on first load or during ordinary progression.

### Investigation-mode source surfaces
When the user asks for deeper inspection, compare, or audit depth, richer observatory modules may expand as drawer content, focus modes, or explicit deep-work routes.
They remain valuable, but they are not the default first-view shell.

---

## Primary user flow architecture

These flows begin from the calm shell.
Richer observatory modules may open inside `DETAIL_DRAWER`, focus mode, or explicit investigation routes when the user asks for depth.

### Flow A: Scope composition and run launch
The user begins in a **Scope Composer** rather than a plain form.

Concept:

- the reporting token lives at the center
- action tokens orbit around it
- illegal token combinations physically refuse to connect
- permissions, masking constraints, and approval requirements appear as live edges before launch

This makes the scope grammar self-explanatory.

### Flow B: Decision scan
After launch, the user lands on the calm shell, not a raw log or a multi-rail observatory.
Within seconds they should understand:

- manifest identity
- trust posture
- gate chain posture
- whether filing or amendment is possible
- whether the system is waiting on a human, authority, or evidence gap

### Flow C: Evidence investigation
Clicking a blocked gate, trust fracture, parity delta, or amendment posture should open a guided evidence pathway rather than dumping the user into a raw table.
The user should move from decision -> reasons -> supporting evidence -> config and authority context -> recommended next action.

### Flow D: Filing preparation and submission
Preparing a filing should feel like entering a **Packet Forge** where declared basis, packet binding, approvals, and authority preflight are visible as a notarization sequence.
Submission should feel deliberate and precise, not like pressing an ordinary save button.

### Flow E: Drift and amendment
Drift should not appear as a line item. It should appear as a spatial disturbance between baseline and current truth.
Amendment initiation and amendment submission must feel like legally distinct phases with distinct affordances and warnings.

---

## Signature observatory modules

These modules remain valid semantic building blocks, but in the production default they should usually appear through `DETAIL_DRAWER`, focus mode, or explicit investigation/audit routes rather than as simultaneous first-view regions.

### 1. Scope Composer
A radial or orbital composition tool for `requested_scope[]`.

Innovative characteristics:

- reporting scope in the nucleus
- action tokens as magnetized satellites
- invalid combinations visibly repel or gray out
- approval and masking requirements appear inline as orbit constraints
- estimated downstream path preview updates live as tokens change

Why it matters:
It turns abstract scope grammar into an intuitive visual contract.

### 2. Manifest Ribbon
A lineage-aware navigation artifact for `RunManifest` and continuation relationships.

Innovative characteristics:

- compact branch topology with frozen/live/terminal ring treatments
- delta overlay when comparing manifest generations
- replay and recovery rendered as different edge styles
- lifecycle ring SHALL reflect persisted `RunManifest.lifecycle_state`, while review / authority-pending / blocked decision posture SHALL appear as a separate overlay chip so the UI never invents pseudo-manifest states
- current node can expand into a mini health strip with gate counts and artifact availability

Why it matters:
It gives the product a memory and prevents users from getting lost across amendments, replays, and retries.

### 3. Decision Constellation
The main run visualization for engine phases.

Innovative characteristics:

- each algorithm phase is a station, not a tab
- stations illuminate based on causal completion, not page order alone
- edges between stations can carry reason-code fragments or trust attenuation signals
- hovering a station previews what changed in the downstream posture because of it

Why it matters:
It mirrors the actual engine logic and reduces cognitive fragmentation.

### 4. Gate Lattice
A replacement for ordinary badge lists or status tables.

Innovative characteristics:

- each gate is a geometric cell with a distinct containment form
- `PASS`, `PASS_WITH_NOTICE`, `MANUAL_REVIEW`, `OVERRIDABLE_BLOCK`, and `HARD_BLOCK` each have unique visual physics
- reason codes appear as fracture lines or internal strata, not tiny text tags
- selecting a gate opens a “blast radius” view showing impacted actions, workflows, and artifact dependencies

Why it matters:
Gates are central to the system. They deserve a dedicated visual language.

### 5. Trust Prism
A multidimensional trust object for `TrustSummary`.

Innovative characteristics:

- trust score, automation level, filing readiness, and support depth appear as a prism rather than a bar
- changes in trust animate along the axis that actually changed
- plain-language interpretation sits beside the prism
- clicking any face reveals the evidence and policy inputs contributing to that dimension

Why it matters:
Trust is not one number. The prism makes the multidimensional posture legible.

### 6. Evidence Prism
A guided provenance explorer for `EvidenceGraph` and `EnquiryPack`.

Innovative characteristics:

- center the selected output or decision artifact
- surround it with concentric evidence layers: evidence, canonical facts, config, authority context, overrides, limitations
- allow the user to peel layers back one ring at a time
- highlight critical paths with light-channel tracing instead of raw graph clutter
- always preserve a plain-language “why this matters” companion panel

Why it matters:
Most provenance UIs collapse into unreadable hairballs. This one preserves causality and comprehension.

### 7. Twin Lens
A high-clarity `TwinView` for comparing computed internal posture with authority-facing posture.

Innovative characteristics:

- paired timelines that can lock, drift, or diverge
- delta arcs between corresponding facts or obligations
- confidence and freshness displayed directly on the delta bridge
- toggles for source-space, computation-space, and authority-space interpretations

Why it matters:
The user can see both the disagreement and the reason for disagreement in one place.

### 8. Drift Ripple Field
A purpose-built surface for `DriftRecord` and amendment eligibility.

Innovative characteristics:

- baseline sits as a stable plane
- current truth introduces visible ripples proportional to legal and material significance
- critical field deltas become anchored markers on the ripple field
- amendment recommendation, amendment window, and intent state appear as overlay rings

Why it matters:
Drift becomes visually meaningful rather than abstract.

### 9. Packet Forge
A bespoke workspace for `FilingPacket` preparation.

Innovative characteristics:

- packet payload, declared basis, disclaimers, approvals, and manifest binding shown as a staged forging process
- the manifest-binding hash is treated as a visible seal, not hidden metadata
- users can inspect exactly which data and policy state the packet crystallized from
- approval gaps appear as open lock-chambers in the forge sequence

Why it matters:
It makes filing preparation feel deliberate, accountable, and hard to misuse.

### 10. Authority Handshake Tunnel
A live operation view for `AuthorityOperation`, `AuthorityBinding`, request, response, and reconciliation.

Innovative characteristics:

- preflight checks displayed as gateway locks before the tunnel opens
- request identity, idempotency key, and binding integrity appear before transmit
- the response enters through a mirrored return channel with retry and reconciliation posture clearly separated
- reconciliation outcomes update the tunnel instead of dumping to a separate status page

Why it matters:
Authority interaction is one of the highest-risk product moments and needs ceremony plus clarity.

### 11. Workflow Choreographer
A next-action orchestration surface for `WorkflowItem` and `RemediationTask`.

Innovative characteristics:

- tasks are clustered by blocking power, urgency, and owner type rather than only due date
- the user can view tasks from the perspective of a gate, artifact, or person
- resolving a task visibly changes the affected stations and consequence rail in real time

Why it matters:
Workflow becomes part of the decision environment instead of a disconnected queue.

### 12. Audit Echo Panel
A high-integrity event surface for `AuditEvent` and observability traces.

Innovative characteristics:

- append-only event stream rendered as a hash-linked tape
- every action can reveal the upstream and downstream audit neighborhood
- system vs human vs authority events use distinct visual channels

Why it matters:
It reinforces credibility and helps investigations without overwhelming normal users.

---

## Microinteraction rules

- Hover should preview consequence, not repeat labels.
- Press states should feel mechanical and exact, never soft or mushy.
- Loading states should reveal progression through meaningful system phases.
- Empty states should teach the model, not just report absence.
- Error states should separate user-correctable issues from integrity failures.
- Confirmation moments should be used sparingly and reserved for irreversible or externally binding actions.

---

## Information hierarchy rules

Always structure content in three bands:

1. **Posture** — what state the system is in now
2. **Causality** — what caused that state
3. **Actionability** — what the user can do next

Do not bury next action under evidence details.
Do not show raw evidence before the user understands the decision posture it explains.
Do not present policy and reason codes without a translated human interpretation.

---

## Accessibility and elite usability requirements

- Every state communicated by color must also be communicated by icon, text, and structure.
- All core flows must be fully keyboard operable.
- Focus order must follow the system’s semantic order, not arbitrary DOM order.
- Deep evidence exploration must remain usable at 200 percent zoom.
- Motion must respect reduced-motion preferences without losing state clarity.
- Screen-reader labels should describe the decision meaning, not just the visual object.
- Dense forensic views must offer a plain-language layer for non-expert users.
- No essential decision should depend on hover alone.

---

## Anti-patterns to avoid

Do not use:

- generic KPI cards as the primary expression of system state
- conventional left-nav plus dashboard cards as the default shell
- giant undifferentiated data tables as the first stop for investigation
- color-only severity badges
- modal chains that destroy context
- graph hairballs without guided pathing
- hidden legal or authority caveats inside tertiary accordions
- “submit” buttons that look identical to harmless actions
- parallel first-view observatory rails that compete with the calm shell for primary attention

This project deserves a product language with stronger identity and higher semantic fidelity.

---

## Staff/operator screen and investigation architecture

The screen set below applies to staff/operator experiences.
For the simplified customer/client interface, use `customer_client_portal_experience_contract.md` instead of reusing expert observatory screens.

At minimum, define these first-class screens or macro-surfaces for staff/operator experiences:

1. **Calm Shell Home** — `CONTEXT_BAR`, `DECISION_SUMMARY`, `ACTION_STRIP`, and `DETAIL_DRAWER`
2. **Manifest Lineage View** — replay, recovery, continuation, amendment branches
3. **Evidence Prism View** — provenance and enquiry exploration
4. **Twin Lens View** — internal vs authority comparison
5. **Packet Forge View** — filing preparation, declared basis, packet seal
6. **Authority Tunnel View** — preflight, request, response, reconciliation
7. **Drift Ripple View** — baseline comparison and amendment path
8. **Workflow Choreographer View** — tasks, remediations, owners, blast radius
9. **Audit Echo View** — append-only event and trace inspection
10. **Admin/Governance Console** — tenant settings, access policy, authority links, retention, and audit control-plane workflows

### Additional governance-console routes
The Admin/Governance Console is specified in `admin_governance_console_architecture.md`.
At minimum, define these routes or equivalent route families:

1. **Governance Overview** — pending approvals, stale authority links, retention exceptions, and audit hotspots
2. **Tenant Configuration** — tenant profile, security posture, connector and authority environment policy, and change-control staging
3. **Access & Roles** — principal directory, role templates, permission matrix, delegation visibility, and policy simulation
4. **Authority Links** — client-scoped authority-link inventory, binding health, relink/unlink flows, and handshake history
5. **Retention & Privacy** — policy matrix, legal holds, erasure queue, and retention impact previews
6. **Audit & Investigations** — append-only audit workbench, correlation filters, object-neighborhood reconstruction, and export controls

---

## macOS native workspace embodiment
When the operator workspace is embodied as a native macOS app, the calm-shell architecture should map
onto desktop primitives rather than browser route stacks.

- `CONTEXT_BAR`, `DECISION_SUMMARY`, and `ACTION_STRIP` SHOULD anchor the primary content column of
  the main workspace window.
- `DETAIL_DRAWER` SHOULD usually become a trailing inspector or detachable secondary pane rather than a
  route transition.
- multi-manifest work SHOULD prefer multiple windows or tabbed windows over deep nested tab stacks.
- primary actions MUST be reachable through visible controls, keyboard shortcuts, and menu/command
  surfaces.
- dense evidence, audit, and comparison tables MAY use AppKit-backed views where native virtualization
  and column control materially improve investigation quality.
- authority handoff, policy references, and HMRC-only tasks SHOULD open in the system browser rather
  than an unrestricted in-app full-trust web surface.

---

## Playwright-first / XCUITest-first design expectation
This skill explicitly encourages the use of **Playwright** for shipped browser surfaces and **Xcode
Previews + XCUITest** for native macOS surfaces as part of the design process, not only as late-stage
QA tools.

### Why executable validation belongs in the UI/UX loop
The interface proposed here contains layered states, animated semantic transitions, guided evidence exploration, and multiple legally meaningful decision paths.
These experiences should be validated in a real product environment early: browser for web surfaces,
and Xcode-driven previews/XCUITest for native macOS surfaces.
These toolchains are ideal because they can verify:

- multi-step flows across manifests, gates, filing, and amendment states
- keyboard navigation and focus integrity
- deterministic empty, loading, blocked, review, and completed states
- visual regressions for bespoke components such as the Gate Lattice, Evidence Prism, and Packet Forge
- mocked authority interactions and reconciliation paths
- reduced-motion, dark-mode, high-contrast, responsive, and multi-window desktop behaviors

### Playwright / XCUITest guidance
For every major UI surface, define a matching Playwright or XCUITest contract with:

- stable route or entry point
- stable seeded fixture or mocked API state
- deterministic element identifiers
- keyboard path expectations
- screenshot checkpoints for important semantic states
- success and failure assertions for the primary user journey

### Selector strategy
Use semantic `data-testid` attributes that reflect domain objects rather than visual styling. For
native macOS surfaces, mirror the same identifiers through stable `accessibilityIdentifier` values.
Examples:

- `context-bar`
- `decision-summary`
- `action-strip`
- `detail-drawer`
- `scope-composer`
- `manifest-ribbon`
- `decision-constellation`
- `gate-lattice`
- `gate-cell-trust`
- `trust-prism`
- `evidence-prism`
- `twin-lens`
- `drift-ripple-field`
- `packet-forge`
- `authority-handshake-tunnel`
- `workflow-choreographer`
- `audit-echo-panel`
- `consequence-rail`

### Governance-console selector strategy
When the broader product is implementing the Admin/Governance Console, add selectors that reflect control-plane semantics rather than visual chrome.
Examples:

- `governance-context-bar`
- `governance-section-nav`
- `governance-workspace-header`
- `tenant-config-workspace`
- `change-basket`
- `approval-composer`
- `principal-directory`
- `principal-access-grid`
- `policy-simulator`
- `authority-link-inventory`
- `authority-link-detail`
- `retention-policy-matrix`
- `legal-hold-register`
- `erasure-queue`
- `audit-investigation-workbench`
- `audit-sidecar`
- `blast-radius-panel`

### What to test with Playwright / XCUITest
At minimum, cover:

1. assert that first load mounts only `CONTEXT_BAR`, `DECISION_SUMMARY`, `ACTION_STRIP`, and `DETAIL_DRAWER`
2. launch a run from Scope Composer with a legal scope combination
3. reject an illegal scope combination visually and functionally
4. inspect a `HARD_BLOCK` gate and confirm the blast radius explanation appears
5. open the Evidence Prism from a trust issue and trace to supporting evidence
6. prepare a filing packet and verify the manifest-binding seal is visible
7. execute a mocked authority preflight and inspect failed vs passing preflight states
8. enter amendment intent, then confirm amendment submission remains visually distinct
9. navigate the full experience using only keyboard input
10. capture visual baselines for each trust and gate posture
11. verify reduced-motion mode preserves clarity without ornamental transitions

### Design deliverables should include validation notes
Whenever you propose a new screen or component, include:

- intended user goal
- key states
- recommended `data-testid` values
- focus behavior
- motion behavior
- at least one Playwright or XCUITest scenario name

This keeps the design system implementation-ready and testable.

---

## Deliverable template for future UI/UX proposals
When using this skill, structure outputs in the following order:

1. design concept title
2. one-paragraph experience thesis
3. layout architecture
4. core surfaces and components
5. interaction model and navigation logic
6. state model and edge cases
7. accessibility commitments
8. validation plan
9. visual identity notes
10. implementation priorities

---

## Example experience thesis
Taxat should feel like a calm, high-trust workspace for compliance truth: a place where the current
posture, its cause, and the safest next move are legible in one short scan cycle, while deeper
evidence, policy, and authority context remain available on demand without breaking narrative
continuity.

---

## Final instruction
When inventing UI for this project, optimize for **memorability, semantic clarity, and evidence-driven confidence**.
If a design choice is visually striking but weakens interpretability, auditability, or safe action-taking, reject it.

The bar is elite product craft in service of legal and operational precision.
