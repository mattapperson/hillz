import type { Scorer } from '@hillz/core'
import { createScorer } from '../createScorer'

export const keywordCoverage = (opts: { keywords: string[] }): Scorer =>
  createScorer({ name: 'keyword-coverage', kind: 'code' })
    .generateScore(({ run }) => {
      if (opts.keywords.length === 0) return 1
      const lower = run.output.toLowerCase()
      let hits = 0
      for (const k of opts.keywords) {
        if (lower.includes(k.toLowerCase())) hits++
      }
      return hits / opts.keywords.length
    })
    .build()
