import type { Scorer, ScorerFactory } from '@hillz/core'
import { isRecord, readNumber, readString, readStringArray } from '@hillz/core'
import type { z } from 'zod'
import {
  actionSequence,
  allowedTools,
  forbiddenTools,
  maxCost,
  maxTokens,
  maxToolCalls,
  requiredTools,
} from './behavior'
import { completeness } from './code/completeness'
import { contentSimilarity } from './code/contentSimilarity'
import { keywordCoverage } from './code/keywordCoverage'
import { textualDifference } from './code/textualDifference'
import { toneConsistency } from './code/toneConsistency'
import { toolCallAccuracy } from './code/toolCallAccuracy'
import { trajectoryAccuracy } from './code/trajectoryAccuracy'
import {
  diffMatches,
  fileAbsent,
  fileContent,
  fileExists,
  jsonSchemaFile,
  noUnexpectedChanges,
} from './file'

export {
  actionSequence,
  allowedTools,
  forbiddenTools,
  maxCost,
  maxTokens,
  maxToolCalls,
  requiredTools,
} from './behavior'
export { completeness } from './code/completeness'
export { contentSimilarity } from './code/contentSimilarity'
export { keywordCoverage } from './code/keywordCoverage'
export { textualDifference } from './code/textualDifference'
export { toneConsistency } from './code/toneConsistency'
export { toolCallAccuracy } from './code/toolCallAccuracy'
export { trajectoryAccuracy } from './code/trajectoryAccuracy'
export { createScorer } from './createScorer'
export {
  diffMatches,
  fileAbsent,
  fileContent,
  fileExists,
  jsonSchemaFile,
  noUnexpectedChanges,
} from './file'

const isZodSchema = (v: unknown): v is z.ZodTypeAny => {
  if (!isRecord(v)) return false
  return typeof Reflect.get(v, 'safeParse') === 'function'
}

const optPatterns = (v: unknown, key: string): Array<string | RegExp> | undefined => {
  if (!isRecord(v)) return undefined
  const x = Reflect.get(v, key)
  if (!Array.isArray(x)) return undefined
  return x.every((y) => typeof y === 'string' || y instanceof RegExp) ? x : undefined
}

const optMode = (v: unknown, key: string): 'all' | 'any' | undefined => {
  const s = readString(v, key)
  return s === 'all' || s === 'any' ? s : undefined
}

const optSeqMode = (v: unknown, key: string): 'exact' | 'in_order' | 'any_order' | undefined => {
  const s = readString(v, key)
  return s === 'exact' || s === 'in_order' || s === 'any_order' ? s : undefined
}

export const builtInScorers: Map<string, Scorer> = new Map<string, Scorer>([
  [contentSimilarity.name, contentSimilarity],
  [completeness.name, completeness],
  [toneConsistency.name, toneConsistency],
])

export const builtInScorerFactories: Map<string, ScorerFactory> = new Map<string, ScorerFactory>([
  [
    'keyword-coverage',
    (opts) => keywordCoverage({ keywords: readStringArray(opts, 'keywords') ?? [] }),
  ],
  [
    'textual-difference',
    (opts) => textualDifference({ reference: readString(opts, 'reference') ?? '' }),
  ],
  [
    'tool-call-accuracy',
    (opts) => toolCallAccuracy({ expected: readStringArray(opts, 'expected') ?? [] }),
  ],
  [
    'trajectory-accuracy',
    (opts) =>
      trajectoryAccuracy({ expectedSequence: readStringArray(opts, 'expectedSequence') ?? [] }),
  ],
  ['file-exists', (opts) => fileExists({ paths: readStringArray(opts, 'paths') ?? [] })],
  ['file-absent', (opts) => fileAbsent({ paths: readStringArray(opts, 'paths') ?? [] })],
  [
    'file-content',
    (opts) =>
      fileContent({
        path: readString(opts, 'path') ?? '',
        patterns: optPatterns(opts, 'patterns') ?? [],
        mode: optMode(opts, 'mode'),
      }),
  ],
  [
    'diff-matches',
    (opts) =>
      diffMatches({
        path: readString(opts, 'path') ?? '',
        lineFragments: readStringArray(opts, 'lineFragments') ?? [],
      }),
  ],
  [
    'no-unexpected-changes',
    (opts) => noUnexpectedChanges({ allowedPaths: readStringArray(opts, 'allowedPaths') ?? [] }),
  ],
  [
    'json-schema-file',
    (opts) => {
      const schema = isRecord(opts) ? Reflect.get(opts, 'schema') : undefined
      if (!isZodSchema(schema)) {
        throw new Error("json-schema-file requires a Zod schema in 'schema'")
      }
      return jsonSchemaFile({ path: readString(opts, 'path') ?? '', schema })
    },
  ],
  ['max-tool-calls', (opts) => maxToolCalls({ max: readNumber(opts, 'max') ?? 0 })],
  ['max-tokens', (opts) => maxTokens({ max: readNumber(opts, 'max') ?? 0 })],
  ['max-cost', (opts) => maxCost({ max: readNumber(opts, 'max') ?? 0 })],
  ['allowed-tools', (opts) => allowedTools({ allowed: readStringArray(opts, 'allowed') ?? [] })],
  [
    'forbidden-tools',
    (opts) => forbiddenTools({ forbidden: readStringArray(opts, 'forbidden') ?? [] }),
  ],
  [
    'required-tools',
    (opts) => requiredTools({ required: readStringArray(opts, 'required') ?? [] }),
  ],
  [
    'action-sequence',
    (opts) =>
      actionSequence({
        sequence: readStringArray(opts, 'sequence') ?? [],
        mode: optSeqMode(opts, 'mode'),
      }),
  ],
])
