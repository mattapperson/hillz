import type {
  AgentRunner,
  CacheStore,
  Eval,
  Judge,
  RunResult,
  Scorer,
  ScorerFactory,
  Skill,
  SkillFile,
  SkillSiblings,
  Task,
  WorkspaceFactory,
} from '@hillz/core'
import { isRecord, runEval } from '@hillz/core'
import type { ReflectionEntry, ScoreVector, SkillCandidate } from './types'

export interface MetricContext {
  skill: Skill
  evalDef: Eval
  agent: AgentRunner
  judge?: Judge
  scorers: Map<string, Scorer>
  scorerFactories: Map<string, ScorerFactory>
  resultsDir: string
  cache?: CacheStore
  workspaceFactory?: WorkspaceFactory
}

const truncate = (s: string, max = 1200): string =>
  s.length <= max ? s : `${s.slice(0, max)}\n…[truncated ${s.length - max} chars]`

const renderMessage = (m: unknown): string => {
  if (typeof m === 'string') return m
  if (isRecord(m)) {
    const c = Reflect.get(m, 'content')
    return typeof c === 'string' ? c : JSON.stringify(c)
  }
  return JSON.stringify(m)
}

const renderInput = (input: unknown): string => {
  if (Array.isArray(input)) return input.map(renderMessage).join('\n')
  return renderMessage(input)
}

const toScoreVector = (result: RunResult): ScoreVector => {
  const perTask: Record<string, number> = {}
  let sum = 0
  let passCount = 0
  for (const t of result.tasks) {
    perTask[t.taskId] = t.meanScore
    sum += t.meanScore
    if (t.passed) passCount++
  }
  return {
    perTask,
    mean: result.aggregate.meanScore,
    sum,
    passCount,
    totalCost: result.aggregate.totalCost,
  }
}

const applyFileContent = (file: SkillFile, files: Record<string, string>): SkillFile => {
  const next = files[file.path]
  return next === undefined ? file : { ...file, content: next }
}

const mutateSiblings = (
  siblings: SkillSiblings | undefined,
  files: Record<string, string>,
): SkillSiblings | undefined => {
  if (siblings === undefined) return undefined
  return {
    references: siblings.references.map((f) => applyFileContent(f, files)),
    scripts: siblings.scripts.map((f) => applyFileContent(f, files)),
    assets: siblings.assets.map((f) => applyFileContent(f, files)),
  }
}

const mutateSkill = (skill: Skill, candidate: SkillCandidate): Skill => ({
  ...skill,
  body: candidate.body,
  description: candidate.description,
  siblings: mutateSiblings(skill.siblings, candidate.files),
})

export interface RunCandidateOutcome {
  score: ScoreVector
  entries: ReflectionEntry[]
}

export const runCandidate = async (
  ctx: MetricContext,
  candidate: SkillCandidate,
  taskIds: string[],
): Promise<RunCandidateOutcome> => {
  const filteredTasks = ctx.evalDef.tasks.filter((t) => taskIds.includes(t.id))
  if (filteredTasks.length === 0) {
    return {
      score: { perTask: {}, mean: 0, sum: 0, passCount: 0, totalCost: 0 },
      entries: [],
    }
  }
  const scopedEval: Eval = { ...ctx.evalDef, tasks: filteredTasks }
  const mutatedSkill = mutateSkill(ctx.skill, candidate)

  const result = await runEval({
    eval: scopedEval,
    skill: mutatedSkill,
    agent: ctx.agent,
    scorers: ctx.scorers,
    scorerFactories: ctx.scorerFactories,
    resultsDir: ctx.resultsDir,
    judge: ctx.judge,
    cache: ctx.cache,
    workspaceFactory: ctx.workspaceFactory,
    options: { refreshCache: true },
  })

  const score = toScoreVector(result)
  const taskById = new Map<string, Task>(filteredTasks.map((t) => [t.id, t]))
  const entries: ReflectionEntry[] = result.tasks.map((t) => {
    const matched = taskById.get(t.taskId)
    const rawInput = matched ? matched.input : ''
    const scoreLines =
      t.scores.length === 0
        ? '(no scorers)'
        : t.scores
            .map((s) => `  - ${s.scorer}: ${s.score.toFixed(3)}${s.reason ? ` — ${s.reason}` : ''}`)
            .join('\n')
    return {
      taskId: t.taskId,
      input: truncate(renderInput(rawInput)),
      output: truncate(t.trace.output),
      score: t.meanScore,
      scoreLines,
    }
  })

  return { score, entries }
}
