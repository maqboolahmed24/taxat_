# Dominant Question and Single Action Contract

## Purpose
This contract defines the cross-shell salience boundary that keeps every mounted Taxat shell semantically singular.
For any mounted object state, the read side SHALL publish one dominant question, one dominant safe next action or explicit `NO_SAFE_ACTION`, and at most one subordinate promoted support surface.

This contract closes the remaining gap where shell renderers could still derive hierarchy from local layout folklore instead of from machine-readable read-model truth.

It governs:

- low-noise calm-shell frames
- collaboration workspaces that reuse the calm shell
- client portal workspaces
- governance density snapshots
- native operator scene embodiments of those same shells

`frontend_shell_and_interaction_law.md` remains authoritative for cross-platform shell law.
This document tightens that law with one explicit salience contract that every shell family SHALL serialize and every renderer SHALL obey.

## Core contract

Every governed shell read model SHALL carry one `dominance_contract` that freezes:

- which surface owns the dominant question
- which surface owns the dominant action posture
- whether the shell currently has one safe next action or explicit `NO_SAFE_ACTION`
- the optional stable reference for the dominant action target when the source model publishes one
- which promoted support surface, if any, is subordinate to the primary posture
- whether compare or audit multi-focus is explicit
- that parallel primaries are disallowed
- that renderer-local salience heuristics are forbidden
- that responsive collapse preserves the same dominant summary and dominant action
- that detached or redocked support surfaces remain support-only and never become a second primary

The shared machine contract is `schemas/shell_dominance_contract.schema.json`.

## Required invariants

1. One dominant question per mounted shell state.
2. One dominant safe next action or explicit `NO_SAFE_ACTION`.
3. Summary and action surfaces SHALL answer the same dominant question.
4. Task queues, worklists, and secondary support regions SHALL remain subordinate to the dominant action posture.
5. Compare and audit escalation SHALL be explicit machine state, never a default first-view leak.
6. Responsive collapse, native inspector detachment, reconnect, and rebase SHALL preserve the same dominant summary/action hierarchy instead of inventing a new one.
7. Renderers SHALL consume the published salience contract directly and SHALL NOT promote competing hero, queue, drawer, sidecar, or detached-window actions heuristically.

## Shell mappings

### Calm shell and collaboration detail workspaces

- dominant question surface: `DECISION_SUMMARY`
- dominant action surface: `ACTION_STRIP`
- subordinate support surface: `DETAIL_DRAWER` only
- compare or audit multi-focus: explicit only

### Client portal

- `HOME`: `STATUS_HERO` owns the dominant question and the dominant action; `TASK_QUEUE` mirrors or supports that posture but SHALL NOT compete with it
- `DOCUMENTS`: `DOCUMENT_CENTER` owns the dominant question/action posture
- `APPROVALS`: `APPROVAL_CENTER` owns the dominant question/action posture
- `ONBOARDING`: `STEP_WORKSPACE` owns the dominant question/action posture
- `HELP`: `SUPPORT_PANEL` becomes the primary route surface instead of a competing support sidecar

### Governance density shell

- dominant question/action surface: `ATTENTION_SUMMARY`
- risk ledgers and worklists remain subordinate
- only one governance support sidecar may be promoted at a time

### Native operator scene

- dominant question surface: `PRIMARY_CANVAS`
- authoritative action surface: `ACTION_STRIP`
- trailing inspector remains support-only whether docked or detached

## Gap closure

This contract eliminates the following competing-posture failures:

- portal status hero and task queue advertising different next steps
- support drawers, sidecars, or panels competing with the primary action
- multiple mutation-capable actions appearing as peers
- compare or audit detail leaking into the default first view
- summary copy answering a different question than the action strip or hero
- responsive or native layout changes creating a second primary surface

## Validation criteria

The machine guard layer SHALL reject:

- shell payloads with no `dominance_contract`
- shell payloads whose published dominant question surface does not match the governing shell family or route
- shell payloads whose dominant action state drifts from the published action surface
- portal `HOME` payloads where `home_primary_task_ref`, `status_hero.primary_action`, and the dominance contract disagree
- workspaces that promote a support surface without marking it subordinate or investigative
- default-mode shells that serialize compare or audit multi-focus
- native scenes that allow the trailing inspector to become an authoritative action surface
- governance or portal shells that let supplemental worklists or task queues outrank the published dominant action posture
