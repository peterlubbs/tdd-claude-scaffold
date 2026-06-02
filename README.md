# TDD Scaffold for Claude Code

A drop-in `.claude/` setup that forces Claude Code to follow a strict
**Red → Green → Refactor** cycle when you ask it to build a feature.

Based on Alexander Opalic's
[*Forcing Claude Code to TDD: An Agentic Red-Green-Refactor Loop*](https://alexop.dev/posts/custom-tdd-workflow-claude-code-vue/),
generalized so it works with any stack (JS/TS, Python, Go, Rust, Ruby, etc.).

## How it works

Three forces combine to make test-first development actually happen:

1. **A skill** (`tdd-integration`) defines explicit phase gates. Each phase blocks the next
   until it completes — no Green before Red fails, no skipping Refactor.
2. **Three subagents** run in **isolated contexts** so each phase only sees what it needs:
   - `tdd-test-writer` (🔴 RED) — writes a failing test, never sees the implementation plan.
   - `tdd-implementer` (🟢 GREEN) — writes minimal code to pass, only sees the failing test.
   - `tdd-refactorer` (🔵 REFACTOR) — improves the code while keeping tests green.
   This isolation is the key idea: in a single shared context the model "cheats" by designing
   tests around code it's already planning. Separate contexts prevent that.
3. **A hook** (`UserPromptSubmit`) injects a mandatory skill-evaluation step before every
   response, so the TDD skill reliably activates instead of being skipped.

```
.claude/
├── settings.json                    # wires up the hook
├── skills/
│   └── tdd-integration/
│       └── skill.md                 # orchestrates the R-G-R cycle
├── agents/
│   ├── tdd-test-writer.md           # 🔴 RED phase
│   ├── tdd-implementer.md           # 🟢 GREEN phase
│   └── tdd-refactorer.md            # 🔵 REFACTOR phase
└── hooks/
    └── user-prompt-skill-eval.mjs   # forces skill activation each prompt
```

## Install

1. Copy the `.claude/` directory into the root of your project.
   (If you already have a `.claude/settings.json`, merge the `hooks` block in rather than
   overwriting.)
2. Do the customization step below.
3. Restart / reload Claude Code so it picks up the new skill, agents, and hook.

The hook script uses plain `node`, which Claude Code already requires — no extra
dependencies to install. On macOS/Linux you can optionally `chmod +x
.claude/hooks/user-prompt-skill-eval.mjs`, though it isn't required since the hook invokes
`node` explicitly.

## Customize (required, ~5 minutes)

The agents ship with placeholders so they don't assume your stack. Replace them:

- **`<TEST_COMMAND>`** — appears in all three agent files. Set it to how you run a single
  test file, e.g.:
  | Stack            | Command                 |
  | ---------------- | ----------------------- |
  | npm + Vitest/Jest| `npm test --`           |
  | pnpm             | `pnpm test:unit`        |
  | Python           | `pytest`                |
  | Go               | `go test ./...`         |
  | Rust             | `cargo test`            |
  | Ruby             | `bundle exec rspec`     |

- **`<TEST_DIR>`** (in `tdd-test-writer.md`) — where tests live in your project.

- **Delete the `## CUSTOMIZE FOR YOUR PROJECT` sections** once you've filled them in.

### Optional: project-specific skills

The test-writer and refactorer have commented-out `skills:` frontmatter. If you want the
agents to follow your project's exact conventions (test helpers, how you extract reusable
logic, naming patterns), create skills under `.claude/skills/` and reference them. The
source article uses two such skills — one documenting test style, one documenting
reusable-logic patterns — to give each agent project-specific context.

## Usage

Just ask Claude Code to build something:

> "Implement a password-reset flow: a user can request a reset link and set a new password."

The `tdd-integration` skill triggers on words like *implement / add feature / build / create*,
then drives the cycle:

```
🔴 RED   → tdd-test-writer writes a failing test, confirms it fails
🟢 GREEN → tdd-implementer writes minimal code, confirms the test passes
🔵 REFACTOR → tdd-refactorer improves the code, confirms tests still pass
```

For multiple features it completes a full 🔴→🟢→🔵 cycle for each before starting the next.

It deliberately does **not** trigger for bug fixes, docs, or config changes — adjust the
`description` field in `skill.md` if you want different trigger behavior.

## Credit

Workflow and original Vue implementation by Alexander Opalic —
<https://alexop.dev/posts/custom-tdd-workflow-claude-code-vue/>.
The forced-skill-activation hook approach references Scott Spence's testing of hook
configurations. This scaffold generalizes that work into a framework-agnostic template.
