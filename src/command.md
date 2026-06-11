---
description: Run a strict TDD Red-Green-Refactor cycle for a feature, or manage the tdd-claude-scaffold setup. Drives the tdd-integration skill and its three isolated subagents.
argument-hint: <feature description> | init | red | green | refactor
allowed-tools: Task, Read, Glob, Grep, Bash
---

# /tdd-claude-scaffold

Single entry point for the TDD (Red → Green → Refactor) workflow. Dispatch on the first
argument; everything else is the feature description.

Arguments received: `$ARGUMENTS`

## Dispatch

- **`init`** — Set up this project. Detect or ask for the test command and test directory,
  then write/update `tdd-claude-scaffold.config.json` at the repo root with:
  ```json
  { "testCommand": "<how to run a single test file>", "testDir": "<where tests live>" }
  ```
  Confirm the values back to the user. Do not run any tests.

- **`red`** — Run only the RED phase: delegate to the `tdd-test-writer` subagent for the
  feature described in the remaining arguments. Stop after the failing test is confirmed.

- **`green`** — Run only the GREEN phase: delegate to the `tdd-implementer` subagent against
  the most recently written failing test. Stop after the test passes.

- **`refactor`** — Run only the REFACTOR phase: delegate to the `tdd-refactorer` subagent.

- **anything else** (the default) — Treat the full argument string as a feature requirement
  and run the complete cycle by following the **`tdd-integration`** skill:
  🔴 `tdd-test-writer` → 🟢 `tdd-implementer` → 🔵 `tdd-refactorer`, with hard phase gates.
  For multiple features, complete a full 🔴→🟢→🔵 cycle for each before starting the next.

## Rules

- Always honor the phase gates defined in the `tdd-integration` skill. Never write
  implementation before a failing test exists, and never skip the refactor evaluation.
- The subagents run in isolated contexts on purpose — pass each only what its phase needs.
- If `tdd-claude-scaffold.config.json` is missing and you need the test command, tell the user to run
  `/tdd-claude-scaffold init` (or discover it from `package.json`/`Makefile`/CI config) before proceeding.
