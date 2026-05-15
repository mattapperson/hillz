import { createScorer } from '../createScorer'

const tokenize = (s: string): string[] => s.toLowerCase().match(/[a-z0-9]+/g) ?? []

export const completeness = createScorer({ name: 'completeness', kind: 'code' })
  .generateScore(({ run }) => {
    const ref = run.additionalContext?.reference
    if (!ref) return 0
    const refTokens = new Set(tokenize(ref))
    if (refTokens.size === 0) return 1
    const outTokens = new Set(tokenize(run.output))
    let hits = 0
    for (const t of refTokens) {
      if (outTokens.has(t)) hits++
    }
    return hits / refTokens.size
  })
  .build()
