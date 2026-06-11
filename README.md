# tdd-claude-scaffold

Import a strict **Red → Green → Refactor** TDD workflow into AI coding agents — across
projects — with a single `/tdd-claude-scaffold` command.

Instead of copying a `.claude/` folder into every repo by hand, `tdd-claude-scaffold` keeps one
tool-agnostic source of truth and an installer that emits the right files for each agent.
This mirrors the [impeccable](https://github.com/pbakaus/impeccable) model
(one definition → a CLI that builds per-harness installs → a single namespaced command).

Based on Alexander Opalic's
[*Forcing Claude Code to TDD*](https://alexop.dev/posts/custom-tdd-workflow-claude-code-vue/),
generalized to any stack and made installable.

## Install

From any project root:

```bash
npx tdd-claude-scaffold install --test-command="npm test --" --test-dir="src/__tests__/"
```

Or install once for **every** project (user scope):

```bash
npx tdd-claude-scaffold install --scope=user --test-command="<your test command>"
```

Then restart/reload the agent and run:

```
/tdd-claude-scaffold "Implement a password-reset flow: request a link, set a new password."
```

### Installer options

| Flag | Purpose | Default |
| ---- | ------- | ------- |
| `--providers=<list>` | Comma-separated harnesses to target | `claude` |
| `--scope=<project\|user>` | `project` → `./.claude`; `user` → `~/.claude` (all projects) | `project` |
| `--dir=<path>` | Project root for project scope | current dir |
| `--test-command=<cmd>` | How to run a single test file | prompted later via `/tdd-claude-scaffold init` |
| `--test-dir=<path>` | Where tests live | prompted later |
| `--dry-run` | Show what would be written, change nothing | — |

The installer is dependency-free plain Node (≥18) and merges its hook into an existing
`.claude/settings.json` non-destructively (and idempotently).

### As a git submodule

Pin the workflow to a specific commit and vendor it into your repo:

```bash
git submodule add https://github.com/<you>/tdd-claude-scaffold .tdd-claude-scaffold
node .tdd-claude-scaffold/bin/tdd-claude-scaffold.mjs install \
  --test-command="npm test --" --test-dir="tests/"
```

The CLI resolves its source (`src/`) relative to its own location and writes the install to
`--dir` (default: the current directory), so running the submodule's binary from your project
root reads the definition from the submodule and emits `.claude/` into your project.

`install` **copies** the files, so after updating the submodule
(`git submodule update --remote`) re-run the install command to pick up the new version.

## How it works

Three forces combine to make test-first development actually happen:

1. **A command** (`/tdd-claude-scaffold`) is the single entry point. It dispatches:
   `init` (set up the test command), a bare feature description (run the full cycle),
   or `red` / `green` / `refactor` (run one phase).
2. **A skill** (`tdd-integration`) defines explicit phase gates — no Green before Red fails,
   no skipping Refactor — and also auto-triggers on phrases like *implement / build / add feature*.
3. **Three subagents** run in **isolated contexts** so each phase only sees what it needs:
   - `tdd-test-writer` (🔴 RED) — writes a failing test, never sees the implementation plan.
   - `tdd-implementer` (🟢 GREEN) — writes minimal code to pass, only sees the failing test.
   - `tdd-refactorer` (🔵 REFACTOR) — improves the code while keeping tests green.

   This isolation is the key idea: in a single shared context the model "cheats" by designing
   tests around code it's already planning. Separate contexts prevent that.
4. **A hook** (`UserPromptSubmit`) injects a mandatory skill-evaluation step before every
   response, so the TDD skill reliably activates instead of being skipped.

## Repository layout

```
src/                          # SINGLE SOURCE OF TRUTH (tool-agnostic)
├── command.md                # the /tdd-claude-scaffold entry point + subcommands
├── skill.md                  # R→G→R orchestration skill
├── agents/                   # the three phase subagents ({{TEST_COMMAND}} tokens)
├── hook.mjs                  # forced skill-activation hook
└── templates/
    └── tdd-claude-scaffold.config.json
builders/                     # per-harness emitters
├── index.mjs                 # builder registry
└── claude.mjs                # Claude Code emitter (implemented)
bin/
└── tdd-claude-scaffold.mjs            # the installer CLI
```

What the Claude Code builder emits into `.claude/` (or `~/.claude/` for user scope):

```
.claude/
├── commands/tdd-claude-scaffold.md            # → /tdd-claude-scaffold
├── skills/tdd-integration/SKILL.md
├── agents/{tdd-test-writer,tdd-implementer,tdd-refactorer}.md
├── hooks/tdd-claude-scaffold-skill-eval.mjs
└── settings.json                     # UserPromptSubmit hook (merged, not clobbered)
```

## Adding another agent (Cursor, Codex CLI, Gemini CLI, …)

The architecture is built for it: add a module under `builders/` exporting
`{ id, label, detect(targetRoot), install(opts) }` and register it in `builders/index.mjs`.
The `src/` definition and CLI stay unchanged — only the emitter differs.

Caveat worth knowing: true per-phase **context isolation** relies on Claude Code subagents.
Harnesses without subagents would get a flattened single-prompt version of the cycle, which
works but loses the isolation guarantee. `cursor`, `codex`, and `gemini` are listed as planned
providers and currently report "not implemented yet" rather than installing a degraded build.

## Usage

```
/tdd-claude-scaffold init                          # set test command / dir → tdd-claude-scaffold.config.json
/tdd-claude-scaffold "<feature to build>"          # full 🔴→🟢→🔵 cycle
/tdd-claude-scaffold red "<feature>"               # just write the failing test
/tdd-claude-scaffold green                         # make the latest failing test pass
/tdd-claude-scaffold refactor                      # evaluate + refactor, tests stay green
```

For multiple features it completes a full 🔴→🟢→🔵 cycle for each before starting the next.
It deliberately does **not** auto-trigger for bug fixes, docs, or config changes — adjust the
`description` in `src/skill.md` and reinstall to change trigger behavior.

### Optional: project-specific skills

The test-writer and refactorer have commented-out `skills:` frontmatter. Create skills under
`.claude/skills/` documenting your test style and reusable-logic patterns, then reference them
so each phase follows your project's conventions.

## Credit

Workflow and original Vue implementation by Alexander Opalic —
<https://alexop.dev/posts/custom-tdd-workflow-claude-code-vue/>.
Distribution model inspired by [impeccable](https://github.com/pbakaus/impeccable).
