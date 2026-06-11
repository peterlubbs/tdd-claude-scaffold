// Builder registry. Each builder emits the canonical src/ definition into a
// specific harness's expected layout. Add new harnesses here.
//
// To support another agent (Cursor, Codex CLI, Gemini CLI, ...), create a sibling
// module exporting { id, label, detect(targetRoot), install(opts) } and register it
// below. The CLI and source-of-truth stay unchanged — only the emitter differs.

import * as claude from './claude.mjs'

export const builders = {
  [claude.id]: claude,
}

export const KNOWN_PROVIDERS = Object.keys(builders)

// Harnesses we intend to support but haven't implemented yet. Listed so the CLI can
// give a useful message instead of a generic "unknown provider".
export const PLANNED_PROVIDERS = ['cursor', 'codex', 'gemini']
