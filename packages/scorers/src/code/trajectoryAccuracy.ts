import type { Scorer } from '@hillz/core'
import { createScorer } from '../createScorer'

const longestInOrderMatch = (expected: string[], actual: string[]): number => {
  let i = 0
  let matched = 0
  for (const e of expected) {
    while (i < actual.length && actual[i] !== e) i++
    if (i < actual.length) {
      matched++
      i++
    }
  }
  return matched
}

export const trajectoryAccuracy = (opts: { expectedSequence: string[] }): Scorer =>
  createScorer({ name: 'trajectory-accuracy', kind: 'code' })
    .generateScore(({ run }) => {
      if (opts.expectedSequence.length === 0) return 1
      const actual = run.trace.toolCalls.map((t) => t.name)
      const matched = longestInOrderMatch(opts.expectedSequence, actual)
      return matched / opts.expectedSequence.length
    })
    .build()
