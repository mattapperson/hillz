import type { Scorer } from '@hillz/core'
import { createScorer } from '../createScorer'

export const maxToolCalls = (opts: { max: number }): Scorer =>
  createScorer({ name: 'max-tool-calls', kind: 'code' })
    .generateScore(({ run }) => (run.trace.toolCalls.length <= opts.max ? 1 : 0))
    .build()

export const maxTokens = (opts: { max: number }): Scorer =>
  createScorer({ name: 'max-tokens', kind: 'code' })
    .generateScore(({ run }) => {
      const total = run.trace.usage.inputTokens + run.trace.usage.outputTokens
      return total <= opts.max ? 1 : 0
    })
    .build()

export const maxCost = (opts: { max: number }): Scorer =>
  createScorer({ name: 'max-cost', kind: 'code' })
    .generateScore(({ run }) => {
      const cost = run.trace.usage.cost ?? 0
      return cost <= opts.max ? 1 : 0
    })
    .build()

export const allowedTools = (opts: { allowed: string[] }): Scorer =>
  createScorer({ name: 'allowed-tools', kind: 'code' })
    .generateScore(({ run }) => {
      const allow = new Set(opts.allowed)
      for (const call of run.trace.toolCalls) {
        if (!allow.has(call.name)) return 0
      }
      return 1
    })
    .build()

export const forbiddenTools = (opts: { forbidden: string[] }): Scorer =>
  createScorer({ name: 'forbidden-tools', kind: 'code' })
    .generateScore(({ run }) => {
      const deny = new Set(opts.forbidden)
      for (const call of run.trace.toolCalls) {
        if (deny.has(call.name)) return 0
      }
      return 1
    })
    .build()

export const requiredTools = (opts: { required: string[] }): Scorer =>
  createScorer({ name: 'required-tools', kind: 'code' })
    .generateScore(({ run }) => {
      if (opts.required.length === 0) return 1
      const called = new Set(run.trace.toolCalls.map((t) => t.name))
      let hits = 0
      for (const name of opts.required) {
        if (called.has(name)) hits++
      }
      return hits / opts.required.length
    })
    .build()

const isInOrder = (expected: string[], actual: string[]): boolean => {
  let i = 0
  for (const name of actual) {
    if (name === expected[i]) i++
    if (i === expected.length) return true
  }
  return i === expected.length
}

const isExact = (expected: string[], actual: string[]): boolean =>
  expected.length === actual.length && expected.every((e, i) => e === actual[i])

const isAnyOrder = (expected: string[], actual: string[]): boolean => {
  if (expected.length !== actual.length) return false
  const counts = new Map<string, number>()
  for (const n of expected) counts.set(n, (counts.get(n) ?? 0) + 1)
  for (const n of actual) {
    const c = counts.get(n)
    if (!c) return false
    counts.set(n, c - 1)
  }
  for (const c of counts.values()) if (c !== 0) return false
  return true
}

export const actionSequence = (opts: {
  sequence: string[]
  mode?: 'exact' | 'in_order' | 'any_order'
}): Scorer =>
  createScorer({ name: 'action-sequence', kind: 'code' })
    .generateScore(({ run }) => {
      const actual = run.trace.toolCalls.map((t) => t.name)
      const mode = opts.mode ?? 'in_order'
      const pass =
        mode === 'exact'
          ? isExact(opts.sequence, actual)
          : mode === 'any_order'
            ? isAnyOrder(opts.sequence, actual)
            : isInOrder(opts.sequence, actual)
      return pass ? 1 : 0
    })
    .build()
