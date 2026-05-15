import { react } from '@hillz/agent'
import { defineEval } from '@hillz/core'
import type { Scorer } from '@hillz/core'
import { createScorer } from '@hillz/scorers'

const exactMatch = (expected: string): Scorer =>
  createScorer({ name: `exact-match:${expected}`, kind: 'code' })
    .generateScore(({ run }) => (run.output.trim() === expected ? 1 : 0))
    .generateReason(({ run, score }) =>
      score === 1 ? null : `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(run.output)}`,
    )
    .build()

interface Case {
  id: string
  number: number
  numeral: string
}

const cases: Case[] = [
  { id: 'five', number: 5, numeral: 'V' },
  { id: 'forty-nine', number: 49, numeral: 'XLIX' },
  { id: 'one-hundred', number: 100, numeral: 'C' },
  { id: 'twenty-twenty-four', number: 2024, numeral: 'MMXXIV' },
]

export default defineEval({
  name: 'roman-numerals',
  skill: 'roman-numerals',
  flowVersion: '1',
  flow: ({ skill }) =>
    react({
      model: 'openai/gpt-5-nano',
      instructions: skill.body,
      tools: [],
    }),
  scorers: ['single-token'],
  tasks: cases.map((c) => ({
    id: c.id,
    input: String(c.number),
    scorers: [
      exactMatch(c.numeral),
      { name: 'keyword-coverage', opts: { keywords: [c.numeral] } },
    ],
  })),
  passThreshold: 0.8,
})
