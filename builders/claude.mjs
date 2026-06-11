// Claude Code builder for tdd-claude-scaffold.
//
// Emits the canonical src/ definition into a Claude Code layout:
//   <base>/commands/tdd-claude-scaffold.md              -> the /tdd-claude-scaffold slash command
//   <base>/skills/tdd-integration/SKILL.md     -> the auto-trigger orchestration skill
//   <base>/agents/{test-writer,implementer,refactorer}.md
//   <base>/hooks/tdd-claude-scaffold-skill-eval.mjs     -> forced skill-activation hook
//   <base>/settings.json                       -> UserPromptSubmit hook wired in (merged)
//
// <base> is "<targetRoot>/.claude" for project scope, or "~/.claude" for user scope.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

export const id = 'claude'
export const label = 'Claude Code'

/** Returns true if a project looks like it uses Claude Code (or always, since it's the default target). */
export function detect(targetRoot) {
  return existsSync(join(targetRoot, '.claude')) || existsSync(join(targetRoot, 'CLAUDE.md'))
}

function substitute(text, { testCommand, testDir }) {
  return text
    .replaceAll('{{TEST_COMMAND}}', testCommand || '<your test command — run `/tdd-claude-scaffold init`>')
    .replaceAll('{{TEST_DIR}}', testDir || '<your test directory — run `/tdd-claude-scaffold init`>')
}

function emit(path, contents, { dryRun, log }) {
  log(`  ${dryRun ? 'would write' : 'write'}  ${path}`)
  if (dryRun) return
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, contents)
}

/** Merge our UserPromptSubmit hook into an existing settings.json without clobbering other hooks. */
function mergeSettings(settingsPath, hookCommand, { dryRun, log }) {
  let settings = {}
  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, 'utf-8'))
    } catch {
      throw new Error(`Existing ${settingsPath} is not valid JSON; fix or remove it, then re-run.`)
    }
  }

  settings.hooks ||= {}
  settings.hooks.UserPromptSubmit ||= []

  const already = JSON.stringify(settings.hooks.UserPromptSubmit).includes('tdd-claude-scaffold-skill-eval')
  if (already) {
    log(`  ok     ${settingsPath} (hook already present)`)
    return
  }

  settings.hooks.UserPromptSubmit.push({
    matcher: '',
    hooks: [{ type: 'command', command: hookCommand, timeout: 5 }],
  })

  log(`  ${dryRun ? 'would merge' : 'merge'}  ${settingsPath} (UserPromptSubmit hook)`)
  if (dryRun) return
  mkdirSync(dirname(settingsPath), { recursive: true })
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n')
}

export function install({ sourceDir, targetRoot, scope, testCommand, testDir, dryRun, log }) {
  const base = scope === 'user' ? join(homedir(), '.claude') : join(targetRoot, '.claude')
  const read = (rel) => readFileSync(join(sourceDir, rel), 'utf-8')
  const ctx = { testCommand, testDir }

  emit(join(base, 'commands', 'tdd-claude-scaffold.md'), substitute(read('command.md'), ctx), { dryRun, log })
  emit(join(base, 'skills', 'tdd-integration', 'SKILL.md'), read('skill.md'), { dryRun, log })

  for (const agent of ['tdd-test-writer', 'tdd-implementer', 'tdd-refactorer']) {
    emit(join(base, 'agents', `${agent}.md`), substitute(read(`agents/${agent}.md`), ctx), { dryRun, log })
  }

  emit(join(base, 'hooks', 'tdd-claude-scaffold-skill-eval.mjs'), read('hook.mjs'), { dryRun, log })

  // For project scope, $CLAUDE_PROJECT_DIR resolves to the repo root at runtime.
  // For user scope it does not, so anchor on $HOME instead.
  const hookPath =
    scope === 'user'
      ? '"$HOME/.claude/hooks/tdd-claude-scaffold-skill-eval.mjs"'
      : '"$CLAUDE_PROJECT_DIR/.claude/hooks/tdd-claude-scaffold-skill-eval.mjs"'
  mergeSettings(join(base, 'settings.json'), `node ${hookPath}`, { dryRun, log })

  return { base }
}
