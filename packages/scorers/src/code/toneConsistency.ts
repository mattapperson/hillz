import { createScorer } from '../createScorer'

const sentenceSplit = (s: string): string[] => s.split(/(?<=[.!?])\s+/).filter((p) => p.length > 0)

const formalityScore = (sentence: string): number => {
  const words = sentence.toLowerCase().match(/[a-z']+/g) ?? []
  if (words.length === 0) return 0
  const contractions = words.filter((w) => w.includes("'")).length
  const longWords = words.filter((w) => w.length >= 7).length
  return longWords / words.length - (contractions / words.length) * 0.5
}

export const toneConsistency = createScorer({ name: 'tone-consistency', kind: 'code' })
  .generateScore(({ run }) => {
    const sentences = sentenceSplit(run.output)
    if (sentences.length < 2) return 1
    const scores = sentences.map(formalityScore)
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length
    const variance = scores.reduce((a, b) => a + (b - mean) ** 2, 0) / scores.length
    return Math.max(0, 1 - Math.sqrt(variance))
  })
  .build()
