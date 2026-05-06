# Portal Language Contract and Banned Vocabulary Filters

`packages/backend-portal/src/contracts/portal_language_contract.ts` publishes the runtime
`PORTAL_LANGUAGE_CONTRACT_V1` object used by portal projectors. The object is intentionally byte-for-byte
equivalent to the Python validator's `PORTAL_LANGUAGE_CONTRACT` and validates against
`portal_language_contract.schema.json`.

The contract governs customer-visible portal copy:

- direct text and governed text refs are the only allowed copy serialization forms;
- each route keeps one dominant question and one primary action;
- outside `HELP`, support copy remains subordinate to the active task;
- due labels normalize to `Due ...`, `Overdue ...`, or `No deadline yet`;
- current/history and pending/settled states stay explicit through the published artifact contracts;
- first-view route copy is capped by the shared `copy_budget` values.

The runtime filters in `filter_portal_vocabulary.ts` mirror the validator fragments for customer-safe
portal text. They reject internal vocabulary such as `manifest`, `workflow`, `rebase`, `stale`,
`operator`, `queue`, `gate`, `override`, `escalat`, assignment wording, staff-role wording, `sla`,
and internal-only visibility phrases.

`validate_portal_copy.ts` applies the text budgets, due-label grammar, banned vocabulary filters,
hero single-action rule, and duplicate support-copy guard. `measure_portal_first_view_budget.ts`
keeps `HOME`, `DOCUMENTS`, `APPROVALS`, `ONBOARDING`, `HELP`, and contextual `REQUEST_DETAIL`
first views aligned with the canonical budget totals before a workspace is returned.
