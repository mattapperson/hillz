import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { computeKey } from './cacheKey'
import { persistResult } from './results'
import type {
  AgentRunner,
  AgentTrace,
  CacheStore,
  Eval,
  Judge,
  ProgressEvent,
  RunResult,
  ScoreResult,
  Scorer,
  ScorerRef,
  Skill,
  Task,
  WorkspaceFactory,
} from './types'

export type ScorerFactory = (opts: Record<string, unknown>) => Scorer

const isScorerFactory = (v: unknown): v is ScorerFactory => typeof v === 'function'

interface RunEvalInput {
  eval: Eval
  skill: Skill
  agent: AgentRunner
  scorers: Map<string, Scorer>
  scorerFactories?: Map<string, ScorerFactory>
  resultsDir: string
  judge?: Judge
  cache?: CacheStore
  workspaceFactory?: WorkspaceFactory
  options?: {
    workers?: number
    trials?: number
    skipJudge?: boolean
    refreshCache?: boolean
    keepWorkspaces?: boolean
    onProgress?: (e: ProgressEvent) => void
  }
}

const stripWorkspace = (t: AgentTrace): AgentTrace => {
  if (!t.workspace) return t
  const { workspace: _, ...rest } = t
  return rest
}

export const resolveScorerRefs = (
  refs: ScorerRef[] | undefined,
  registry: Map<string, Scorer>,
  factories: Map<string, ScorerFactory>,
): Scorer[] => {
  if (!refs) return []
  return refs.map((ref) => {
    if (typeof ref === 'string') {
      const s = registry.get(ref)
      if (!s) throw new Error(`Unknown scorer: '${ref}'`)
      return s
    }
    if ('run' in ref) return ref
    const factory = factories.get(ref.name)
    if (!isScorerFactory(factory)) {
      throw new Error(`Scorer '${ref.name}' is not a registered parameterized factory`)
    }
    return factory(ref.opts)
  })
}

const runTask = async (
  task: Task,
  trial: number,
  args: RunEvalInput,
  scorers: Scorer[],
  runId: string,
) => {
  const { agent, cache, eval: evalDef, judge, options, skill, workspaceFactory } = args

  args.options?.onProgress?.({ kind: 'task-start', taskId: task.id, trial })

  if (task.workspace && !workspaceFactory) {
    throw new Error(`Task ${task.id} declares a workspace but no WorkspaceFactory was provided`)
  }
  const ws = task.workspace
    ? await workspaceFactory?.create(task.workspace, runId, task.id)
    : undefined

  const before = ws ? await ws.snapshot() : undefined
  const wsAdapters = ws?.adapters({ allowShell: task.workspace?.allowShell })

  const step = agent.compileFlow({
    flow: evalDef.flow,
    skill,
    task,
    tools: evalDef.tools ?? [],
  })

  const key = ws
    ? null
    : computeKey({
        input: task.input,
        flowVersion: evalDef.flowVersion,
        cacheKeyFn: evalDef.cacheKey,
      })

  const cached = key && !options?.refreshCache ? ((await cache?.get(key)) ?? null) : null

  let trace: AgentTrace
  if (cached) {
    trace = { ...cached, fromCache: true }
    options?.onProgress?.({ kind: 'cache-hit', taskId: task.id })
  } else {
    trace = await agent.run({
      step,
      input: task.input,
      fs: wsAdapters?.fs,
      shell: wsAdapters?.shell,
      timeoutMs: task.timeoutMs,
    })
    trace.fromCache = false
    if (key && cache) {
      await cache.set(key, stripWorkspace(trace))
    }
  }

  if (ws && before) {
    const after = await ws.snapshot()
    trace.workspace = { before, after, diff: ws.diff(before, after) }
  }

  const applicableScorers = scorers.filter(
    (s) => !(s.kind === 'llm' && (options?.skipJudge || !judge)),
  )
  const scorerRun = {
    runId,
    input: task.input,
    output: trace.output,
    trace,
    workspace: trace.workspace,
  }
  const scoreResults: ScoreResult[] = await Promise.all(
    applicableScorers.map(async (scorer) => {
      try {
        const result = await scorer.run(scorerRun, { judge })
        options?.onProgress?.({
          kind: 'scorer',
          taskId: task.id,
          scorer: scorer.name,
          score: result.score,
        })
        return result
      } catch (err) {
        return {
          scorer: scorer.name,
          score: 0,
          reason: `scorer threw: ${err instanceof Error ? err.message : String(err)}`,
          metadata: { error: true },
        }
      }
    }),
  )

  const meanScore =
    scoreResults.length > 0
      ? scoreResults.reduce((a, s) => a + s.score, 0) / scoreResults.length
      : 0
  const threshold = evalDef.passThreshold ?? 0.8
  const passed = meanScore >= threshold

  if (ws) {
    if (!passed || options?.keepWorkspaces) {
      await ws.archive(join(args.resultsDir, runId, task.id, 'workspace'))
    }
    await ws.destroy()
  }

  options?.onProgress?.({
    kind: 'task-end',
    taskId: task.id,
    trial,
    passed,
    meanScore,
  })

  return {
    taskId: task.id,
    trial,
    trace,
    scores: scoreResults,
    meanScore,
    passed,
  }
}

// Best-effort: noetic Items may carry a `model` field on LLM responses but the
// type doesn't guarantee it. Returns [] when no items expose it — reports only,
// never gates behavior.
const inferModels = (tasks: RunResult['tasks']): string[] => {
  const seen = new Set<string>()
  for (const t of tasks) {
    for (const item of t.trace.items) {
      const model = Reflect.get(item, 'model')
      if (typeof model === 'string') seen.add(model)
    }
  }
  return [...seen]
}

export const runEval = async (input: RunEvalInput): Promise<RunResult> => {
  const runId = randomUUID()
  const startedAt = new Date().toISOString()

  const factories = input.scorerFactories ?? new Map<string, ScorerFactory>()
  const evalScorers = resolveScorerRefs(input.eval.scorers, input.scorers, factories)
  const trials = input.options?.trials ?? input.eval.trials ?? 1
  const workers = Math.max(1, input.options?.workers ?? input.eval.workers ?? 1)

  const taskRuns: RunResult['tasks'] = []
  const queue: Array<{ task: Task; trial: number }> = []
  for (const task of input.eval.tasks) {
    for (let trial = 1; trial <= trials; trial++) {
      queue.push({ task, trial })
    }
  }

  let cursor = 0
  const next = () => (cursor < queue.length ? queue[cursor++] : undefined)
  const workerLoop = async () => {
    let job = next()
    while (job) {
      const taskScorers = [
        ...evalScorers,
        ...resolveScorerRefs(job.task.scorers, input.scorers, factories),
      ]
      const result = await runTask(job.task, job.trial, input, taskScorers, runId)
      taskRuns.push(result)
      job = next()
    }
  }
  await Promise.all(Array.from({ length: workers }, workerLoop))

  const finishedAt = new Date().toISOString()
  let passCount = 0
  let totalCost = 0
  let scoreSum = 0
  let cacheHits = 0
  for (const t of taskRuns) {
    if (t.passed) passCount++
    totalCost += t.trace.usage.cost ?? 0
    scoreSum += t.meanScore
    if (t.trace.fromCache) cacheHits++
  }
  const meanScore = taskRuns.length > 0 ? scoreSum / taskRuns.length : 0
  const cacheHitRate = taskRuns.length > 0 ? cacheHits / taskRuns.length : 0

  const result: RunResult = {
    runId,
    evalName: input.eval.name,
    skill: input.eval.skill,
    flowKind: typeof input.eval.flow === 'function' ? 'factory' : 'step',
    flowVersion: input.eval.flowVersion,
    models: inferModels(taskRuns),
    startedAt,
    finishedAt,
    tasks: taskRuns,
    aggregate: {
      meanScore,
      passRate: taskRuns.length > 0 ? passCount / taskRuns.length : 0,
      totalCost,
      cacheHitRate,
    },
  }

  await persistResult(result, input.resultsDir)
  return result
}
