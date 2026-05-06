# Focus Restoration, Return Target, And Recovery Projection

`pc_0177` adds reusable backend projectors for focus restoration and return-target selection. The goal is to keep close, back, help-return, stale recovery, responsive restack, live-update focus locks, and native secondary-window dismissal governed by serialized route data instead of browser history or DOM ancestry.

## Projector Inputs

The canonical return-target input is:

- current `routeOrSceneRef`
- `requestedFocusAnchorRefOrNull`
- optional exact invoker focus anchor
- optional same-object remapped focus anchor
- optional object-summary route and focus anchor
- serialized parent return route and focus anchor
- fallback route, fallback object, and fallback focus anchor
- trigger action
- object-loss state
- active focus-lock kind and lock ref for composers, pickers, and compare controls

The same input shape works for calm-shell support regions, collaboration detail routes, portal contextual routes, governance support routes, and parent-bound native support windows. The projectors do not flatten those routes into one product grammar; they select only the lawful focus/return target from the serialized anchors each route already owns.

## Fallback Order

`projectReturnTargetAndFallback` enforces this order:

1. exact invoker or parent-return anchor when still lawful
2. same-object focus remap
3. same-object summary
4. serialized parent return
5. narrowest surviving list target
6. explicit invalidation when no lawful target survives

`INVALIDATED` is used only after every lawful fallback is exhausted. A stale contextual route may not reopen `HOME`, `/home`, `DASHBOARD`, or `/dashboard` while a narrower governed list target remains serialized.

## Contract Alignment

`projectFocusRestorationContract` emits schema-valid `FocusRestorationContract` payloads. `validateReturnTargetNarrowness` additionally checks that route-context focus data and `cross_device_continuity_contract` focus fields cannot disagree.

For contextual portal and collaboration routes, parent return route and parent return focus anchor must be restored together. For parent-bound secondary windows, close returns to the serialized parent focus anchor, not just the parent scene root.

## Case Seeds

`buildFocusRestoreCaseSeeds` publishes deterministic, typed case seeds for later harness work. The seeds cover the TV-39I through TV-39O behaviors: support-region close, portal back navigation, help handoff return, stale narrow-list fallback, governance live-update focus lock, responsive restack, and native secondary-window close.

These seeds are not the full future regression suite. They are the backend-authored data that later Playwright, native, and accessibility harnesses can consume without inventing focus rules locally.
