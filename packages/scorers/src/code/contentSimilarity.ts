import { createScorer } from '../createScorer'

const lcs = (a: string, b: string): number => {
  const m = a.length
  const n = b.length
  if (m === 0 || n === 0) return 0
  const prev = new Array(n + 1).fill(0)
  const curr = new Array(n + 1).fill(0)
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], curr[j - 1])
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j]
  }
  return prev[n] ?? 0
}

export const contentSimilarity = createScorer({ name: 'content-similarity', kind: 'code' })
  .generateScore(({ run }) => {
    const ref = run.additionalContext?.reference
    if (!ref) return 0
    const out = run.output
    if (out.length === 0 && ref.length === 0) return 1
    if (out.length === 0 || ref.length === 0) return 0
    const longest = lcs(out, ref)
    return (2 * longest) / (out.length + ref.length)
  })
  .build()
