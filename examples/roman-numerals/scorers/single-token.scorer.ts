import { createScorer } from '@hillz/scorers'

const ROMAN_ONLY = /^[IVXLCDM]+$/

export default createScorer({ name: 'single-token', kind: 'code' })
  .generateScore(({ run }) => (ROMAN_ONLY.test(run.output.trim()) ? 1 : 0))
  .generateReason(({ run, score }) =>
    score === 1
      ? null
      : `Expected output to be a bare Roman numeral, got: ${JSON.stringify(run.output)}`,
  )
  .build()
