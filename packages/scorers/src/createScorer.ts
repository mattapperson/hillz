import type { ScoreResult, Scorer, ScorerDeps, ScorerRun } from '@hillz/core'

type AnyRecord = Record<string, unknown>

interface PipelineState {
  preprocess?: AnyRecord
  analyze?: AnyRecord
  score?: number
}

type PreprocessStep = (ctx: { run: ScorerRun; deps: ScorerDeps }) => Promise<AnyRecord> | AnyRecord
type AnalyzeStep = (ctx: {
  run: ScorerRun
  deps: ScorerDeps
  results: PipelineState
}) => Promise<AnyRecord> | AnyRecord
type ScoreStep = (ctx: {
  run: ScorerRun
  deps: ScorerDeps
  results: PipelineState
}) => Promise<number> | number
type ReasonStep = (ctx: {
  run: ScorerRun
  deps: ScorerDeps
  results: PipelineState
  score: number
}) => Promise<string | null> | string | null

interface ScorerBuilder {
  preprocess: (fn: PreprocessStep) => ScorerBuilder
  analyze: (fn: AnalyzeStep) => ScorerBuilder
  generateScore: (fn: ScoreStep) => ScorerBuilder
  generateReason: (fn: ReasonStep) => ScorerBuilder
  build: () => Scorer
}

interface CreateScorerOptions {
  name: string
  kind: 'code' | 'llm'
}

export const createScorer = (opts: CreateScorerOptions): ScorerBuilder => {
  let pre: PreprocessStep | undefined
  let ana: AnalyzeStep | undefined
  let scoreFn: ScoreStep | undefined
  let reasonFn: ReasonStep | undefined

  const builder: ScorerBuilder = {
    preprocess: (fn) => {
      pre = fn
      return builder
    },
    analyze: (fn) => {
      ana = fn
      return builder
    },
    generateScore: (fn) => {
      scoreFn = fn
      return builder
    },
    generateReason: (fn) => {
      reasonFn = fn
      return builder
    },
    build: () => ({
      name: opts.name,
      kind: opts.kind,
      run: async (run: ScorerRun, deps: ScorerDeps): Promise<ScoreResult> => {
        if (opts.kind === 'llm' && !deps.judge) {
          throw new Error(`Scorer '${opts.name}' requires a Judge but none was provided`)
        }
        const results: PipelineState = {}
        if (pre) results.preprocess = await pre({ run, deps })
        if (ana) results.analyze = await ana({ run, deps, results })
        if (!scoreFn) {
          throw new Error(`Scorer '${opts.name}' is missing generateScore()`)
        }
        const score = await scoreFn({ run, deps, results })
        results.score = score
        const reason = reasonFn ? await reasonFn({ run, deps, results, score }) : null
        return {
          scorer: opts.name,
          score: Math.max(0, Math.min(1, score)),
          reason: reason ?? undefined,
        }
      },
    }),
  }
  return builder
}

export type { ScorerBuilder }
