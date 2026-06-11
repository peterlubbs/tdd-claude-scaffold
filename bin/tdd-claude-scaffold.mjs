#!/usr/bin/env node
// tdd-claude-scaffold — install a strict TDD (Red-Green-Refactor) workflow into AI coding agents.
//
//   npx tdd-claude-scaffold install [options]
//
// Options:
//   --providers=<list>     Comma-separated harnesses to target (default: claude)
//   --scope=<project|user> project = ./.claude (this repo); user = ~/.claude (every project)
//   --dir=<path>           Target project root for project scope (default: cwd)
//   --test-command=<cmd>   How to run a single test file (substituted into the agents)
//   --test-dir=<path>      Where tests live (substituted into the test-writer agent)
//   --dry-run              Print what would be written without touching the filesystem
//   -h, --help             Show this help

import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { builders, KNOWN_PROVIDERS, PLANNED_PROVIDERS } from '../builders/index.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const SRC = join(ROOT, 'src')

function parseArgs(argv) {
  const positionals = []
  const flags = {}
  for (const arg of argv) {
    if (arg.startsWith('--')) {
      const [k, v] = arg.slice(2).split(/=(.*)/s)
      flags[k] = v === undefined ? true : v
    } else if (arg === '-h') {
      flags.help = true
    } else {
      positionals.push(arg)
    }
  }
  return { positionals, flags }
}

const HELP = `tdd-claude-scaffold — install a strict TDD Red-Green-Refactor workflow into AI coding agents.

Usage:
  npx tdd-claude-scaffold install [options]

Options:
  --providers=<list>      Comma-separated harnesses (default: claude). Known: ${KNOWN_PROVIDERS.join(', ')}
  --scope=<project|user>  project = ./.claude; user = ~/.claude (available in every project). Default: project
  --dir=<path>            Project root for project scope (default: current directory)
  --test-command=<cmd>    Single-test-file command, e.g. "npm test --", "pytest", "go test ./..."
  --test-dir=<path>       Where tests live, e.g. "tests/", "src/__tests__/"
  --dry-run               Show what would be written, change nothing
  -h, --help              Show this help

After installing, restart/reload the agent, then run:  /tdd-claude-scaffold "<feature to build>"
Or set up the test command first:                       /tdd-claude-scaffold init
`

function main() {
  const { positionals, flags } = parseArgs(process.argv.slice(2))
  const log = (msg) => process.stdout.write(msg + '\n')

  if (flags.help || positionals[0] === 'help') {
    log(HELP)
    return
  }

  const command = positionals[0] || 'install'
  if (command !== 'install') {
    log(`Unknown command "${command}".\n`)
    log(HELP)
    process.exitCode = 1
    return
  }

  const scope = flags.scope || 'project'
  if (scope !== 'project' && scope !== 'user') {
    log(`--scope must be "project" or "user" (got "${scope}").`)
    process.exitCode = 1
    return
  }

  const targetRoot = resolve(flags.dir || process.cwd())
  const requested = String(flags.providers || 'claude')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const dryRun = Boolean(flags['dry-run'])
  const opts = {
    sourceDir: SRC,
    targetRoot,
    scope,
    testCommand: flags['test-command'],
    testDir: flags['test-dir'],
    dryRun,
    log,
  }

  log(`tdd-claude-scaffold install  (scope: ${scope}${dryRun ? ', dry-run' : ''})`)
  if (scope === 'project') log(`target: ${targetRoot}`)

  let installedAny = false
  for (const provider of requested) {
    const builder = builders[provider]
    if (!builder) {
      if (PLANNED_PROVIDERS.includes(provider)) {
        log(`\n- ${provider}: not implemented yet (planned). Skipping.`)
      } else {
        log(`\n- ${provider}: unknown provider. Known: ${KNOWN_PROVIDERS.join(', ')}. Skipping.`)
        process.exitCode = 1
      }
      continue
    }
    log(`\n${builder.label}:`)
    try {
      builder.install(opts)
      installedAny = true
    } catch (err) {
      log(`  ERROR: ${err.message}`)
      process.exitCode = 1
    }
  }

  if (installedAny && !dryRun) {
    log(`\nDone. Restart/reload the agent, then run:  /tdd-claude-scaffold "<feature>"`)
    if (!flags['test-command']) {
      log(`Tip: set your test command with  /tdd-claude-scaffold init  (or pass --test-command on install).`)
    }
  }
}

main()
