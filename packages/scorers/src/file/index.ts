import type { Scorer } from '@hillz/core'
import type { z } from 'zod'
import { createScorer } from '../createScorer'

export const fileExists = (opts: { paths: string[] }): Scorer =>
  createScorer({ name: 'file-exists', kind: 'code' })
    .generateScore(({ run }) => {
      const files = run.workspace?.after.files ?? {}
      if (opts.paths.length === 0) return 1
      let hits = 0
      for (const p of opts.paths) {
        if (Object.prototype.hasOwnProperty.call(files, p)) hits++
      }
      return hits / opts.paths.length
    })
    .build()

export const fileAbsent = (opts: { paths: string[] }): Scorer =>
  createScorer({ name: 'file-absent', kind: 'code' })
    .generateScore(({ run }) => {
      const files = run.workspace?.after.files ?? {}
      if (opts.paths.length === 0) return 1
      let absent = 0
      for (const p of opts.paths) {
        if (!Object.prototype.hasOwnProperty.call(files, p)) absent++
      }
      return absent / opts.paths.length
    })
    .build()

const matchPattern = (content: string, pattern: string | RegExp): boolean =>
  pattern instanceof RegExp ? pattern.test(content) : content.includes(pattern)

export const fileContent = (opts: {
  path: string
  patterns: Array<string | RegExp>
  mode?: 'all' | 'any'
}): Scorer =>
  createScorer({ name: 'file-content', kind: 'code' })
    .generateScore(({ run }) => {
      const files = run.workspace?.after.files ?? {}
      const file = files[opts.path]
      if (!file || file.content === undefined) return 0
      if (opts.patterns.length === 0) return 1
      const matches = opts.patterns.map((p) => matchPattern(file.content ?? '', p))
      const hits = matches.filter(Boolean).length
      if ((opts.mode ?? 'all') === 'any') return hits > 0 ? 1 : 0
      return hits / opts.patterns.length
    })
    .build()

export const diffMatches = (opts: { path: string; lineFragments: string[] }): Scorer =>
  createScorer({ name: 'diff-matches', kind: 'code' })
    .generateScore(({ run }) => {
      if (opts.lineFragments.length === 0) return 1
      const mods = run.workspace?.diff.modified ?? []
      const entry = mods.find((m) => m.path === opts.path)
      if (!entry || !entry.unifiedDiff) return 0
      const lines = entry.unifiedDiff.split('\n')
      let cursor = 0
      let matched = 0
      for (const fragment of opts.lineFragments) {
        while (cursor < lines.length && !(lines[cursor] ?? '').includes(fragment)) cursor++
        if (cursor < lines.length) {
          matched++
          cursor++
        }
      }
      return matched / opts.lineFragments.length
    })
    .build()

export const noUnexpectedChanges = (opts: { allowedPaths: string[] }): Scorer =>
  createScorer({ name: 'no-unexpected-changes', kind: 'code' })
    .generateScore(({ run }) => {
      const diff = run.workspace?.diff
      if (!diff) return 1
      const allowed = new Set(opts.allowedPaths)
      const touched = [...diff.added, ...diff.removed, ...diff.modified.map((m) => m.path)]
      for (const p of touched) {
        if (!allowed.has(p)) return 0
      }
      return 1
    })
    .build()

export const jsonSchemaFile = (opts: { path: string; schema: z.ZodTypeAny }): Scorer =>
  createScorer({ name: 'json-schema-file', kind: 'code' })
    .generateScore(({ run }) => {
      const files = run.workspace?.after.files ?? {}
      const file = files[opts.path]
      if (!file || file.content === undefined) return 0
      try {
        const parsed: unknown = JSON.parse(file.content)
        const result = opts.schema.safeParse(parsed)
        return result.success ? 1 : 0
      } catch {
        return 0
      }
    })
    .build()
