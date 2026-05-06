SHELL := /usr/bin/env bash
.DEFAULT_GOAL := help

PROFILE ?= ci-validation
DRY_RUN ?= 0
VERBOSE ?= 0
KEEP_GOING ?= 0
JSON ?= 0
ACK_TOKEN ?=
TASK_REF ?=
CARD_ID ?=
PHASE ?= all
PARAMS ?=

GRAPH := python3 ./scripts/tasks/task_graph.py
AGENT_BOOTSTRAP := bash ./scripts/agent/bootstrap_agent_workspace.sh
AGENT_RUN_CARD := bash ./scripts/agent/run_card_task.sh
AGENT_VERIFY_EVIDENCE := bash ./scripts/agent/verify_card_evidence.sh

enabled = $(filter 1 true TRUE yes YES on ON,$(1))
json_flag = $(if $(call enabled,$(JSON)),--json,)
dry_run_flag = $(if $(call enabled,$(DRY_RUN)),--dry-run,)
verbose_flag = $(if $(call enabled,$(VERBOSE)),--verbose,)
keep_going_flag = $(if $(call enabled,$(KEEP_GOING)),--keep-going,)
ack_flag = $(if $(strip $(ACK_TOKEN)),--allow-dangerous "$(ACK_TOKEN)",)
param_flags = $(foreach pair,$(PARAMS),--param "$(pair)")

define graph_run
$(GRAPH) $(json_flag) run --profile "$(PROFILE)" $(dry_run_flag) $(verbose_flag) $(keep_going_flag) $(ack_flag) $(param_flags) --task-ref "$(1)"
endef

.PHONY: help task.list task.validate task.resolve task.run \
	bootstrap.workspace validate.contracts validate.repo contracts.import contracts.bindings \
	docs.generate docs.check drift.report drift.check local.plan local.bootstrap \
	local.reset.disposable local.reset.full ephemeral.bootstrap ephemeral.reset ephemeral.destroy \
	test.unit.repository test.integration.repository test.smoke.repository release.readiness \
	agent.bootstrap agent.run-card agent.verify-evidence

help:
	@$(GRAPH) $(json_flag) list

task.list:
	@$(GRAPH) $(json_flag) list

task.validate:
	@$(GRAPH) $(json_flag) validate

task.resolve:
	@if [[ -z "$(TASK_REF)" ]]; then echo "TASK_REF is required" >&2; exit 1; fi
	@$(GRAPH) $(json_flag) resolve --profile "$(PROFILE)" $(param_flags) --task-ref "$(TASK_REF)"

task.run:
	@if [[ -z "$(TASK_REF)" ]]; then echo "TASK_REF is required" >&2; exit 1; fi
	@$(GRAPH) $(json_flag) run --profile "$(PROFILE)" $(dry_run_flag) $(verbose_flag) $(keep_going_flag) $(ack_flag) $(param_flags) --task-ref "$(TASK_REF)"

bootstrap.workspace:
	@$(call graph_run,bootstrap.workspace)

validate.contracts:
	@$(call graph_run,validate.contracts)

validate.repo:
	@$(call graph_run,validate.repo)

contracts.import:
	@$(call graph_run,contracts.import)

contracts.bindings:
	@$(call graph_run,contracts.bindings)

docs.generate:
	@$(call graph_run,docs.generate)

docs.check:
	@$(call graph_run,docs.check)

drift.report:
	@$(call graph_run,drift.report)

drift.check:
	@$(call graph_run,drift.check)

local.plan:
	@$(call graph_run,local.plan)

local.bootstrap:
	@$(call graph_run,local.bootstrap)

local.reset.disposable:
	@$(call graph_run,local.reset.disposable)

local.reset.full:
	@$(call graph_run,local.reset.full)

ephemeral.bootstrap:
	@$(call graph_run,ephemeral.bootstrap)

ephemeral.reset:
	@$(call graph_run,ephemeral.reset)

ephemeral.destroy:
	@$(call graph_run,ephemeral.destroy)

test.unit.repository:
	@$(call graph_run,test.unit.repository)

test.integration.repository:
	@$(call graph_run,test.integration.repository)

test.smoke.repository:
	@$(call graph_run,test.smoke.repository)

release.readiness:
	@$(call graph_run,release.readiness)

agent.bootstrap:
	@$(AGENT_BOOTSTRAP) --profile "$(PROFILE)" $(dry_run_flag) $(verbose_flag) $(json_flag)

agent.run-card:
	@if [[ -z "$(CARD_ID)" ]]; then echo "CARD_ID is required" >&2; exit 1; fi
	@$(AGENT_RUN_CARD) --card-id "$(CARD_ID)" --profile "$(PROFILE)" --phase "$(PHASE)" $(dry_run_flag) $(verbose_flag) $(json_flag) $(ack_flag) $(param_flags)

agent.verify-evidence:
	@if [[ -z "$(CARD_ID)" ]]; then echo "CARD_ID is required" >&2; exit 1; fi
	@$(AGENT_VERIFY_EVIDENCE) --card-id "$(CARD_ID)" $(json_flag)
