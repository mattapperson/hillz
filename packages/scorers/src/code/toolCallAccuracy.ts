import type { Scorer } from '@hillz/core'
import { createScorer } from '../createScorer'

export const toolCallAccuracy = (opts: { expected: string[] }): Scorer =>
  createScorer({ name: 'tool-call-accuracy', kind: 'code' })
    .generateScore(({ run }) => {
      if (opts.expected.length === 0) return 1
      const called = new Set(run.trace.toolCalls.map((t) => t.name))
      let hits = 0
      for (const name of opts.expected) {
        if (called.has(name)) hits++
      }
      return hits / opts.expected.length
    })
    .build()
