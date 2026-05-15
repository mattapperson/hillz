import { type MetricContext, runCandidate } from './metric'
import { buildParetoFront, type ParetoEntry } from './pareto'
import { proposeNewComponent } from './reflection'
import { createRng } from './rng'
import { selectComponent, selectParent } from './selection'
import {
  type ComponentKey,
  DEFAULT_GEPA_CONFIG,
  type GepaConfig,
  type GepaEvent,
  type GepaInput,
  type GepaResult,
  type ScoreVector,
  type SkillCandidate,
} from './types'

const getComponentValue = (candidate: SkillCandidate, component: ComponentKey): string => {
  if (component.kind === 'body') return candidate.body
  if (component.kind === 'description') return candidate.description
  return candidate.files[component.path] ?? ''
}

const withComponent = (
  parent: SkillCandidate,
  component: ComponentKey,
  value: string,
  id: string,
): SkillCandidate => {
  const next: SkillCandidate = {
    id,
    parentId: parent.id,
    body: parent.body,
    description: parent.description,
    files: { ...parent.files },
    mutatedComponent: component,
  }
  if (component.kind === 'body') next.body = value
  else if (component.kind === 'description') next.description = value
  else next.files[component.path] = value
  return next
}

const resolveConfig = (partial: Partial<GepaConfig> | undefined): GepaConfig => ({
  ...DEFAULT_GEPA_CONFIG,
  ...(partial ?? {}),
  components:
    partial?.components && partial.components.length > 0
      ? partial.components
      : DEFAULT_GEPA_CONFIG.components,
})

export const runGepa = async (input: GepaInput): Promise<GepaResult> => {
  const config = resolveConfig(input.config)
  const rng = createRng(config.seed)
  const history: GepaEvent[] = []
  const emit = (e: GepaEvent): void => {
    history.push(e)
    config.onEvent?.(e)
  }

  const metricCtx: MetricContext = {
    skill: input.skill,
    evalDef: input.evalDef,
    agent: input.agent,
    judge: input.judge,
    scorers: input.scorers,
    scorerFactories: input.scorerFactories,
    resultsDir: input.resultsDir,
    cache: input.cache,
    workspaceFactory: input.workspaceFactory,
  }

  const allTaskIds = input.evalDef.tasks.map((t) => t.id)
  if (allTaskIds.length === 0) {
    throw new Error(`Eval '${input.evalDef.name}' has no tasks; cannot optimize`)
  }
  const minibatchSize = Math.max(1, Math.min(config.minibatchSize, allTaskIds.length))

  const baselineFiles: Record<string, string> = {}
  const siblings = input.skill.siblings
  if (siblings !== undefined) {
    for (const file of siblings.references) baselineFiles[file.path] = file.content
    for (const file of siblings.scripts) baselineFiles[file.path] = file.content
    for (const file of siblings.assets) baselineFiles[file.path] = file.content
  }
  const baseline: SkillCandidate = {
    id: 'c0',
    body: input.skill.body,
    description: input.skill.description,
    files: baselineFiles,
  }
  let metricCalls = 0

  const baselineRun = await runCandidate(metricCtx, baseline, allTaskIds)
  metricCalls += allTaskIds.length
  const baselineScore = baselineRun.score
  emit({ kind: 'baseline', score: baselineScore })

  const baselineEntry: ParetoEntry = { candidate: baseline, score: baselineScore }
  const entries: ParetoEntry[] = [baselineEntry]
  let bestEntry: ParetoEntry = baselineEntry
  let rejectedSinceImprovement = 0
  let iter = 0
  let acceptances = 0
  let totalCost = baselineScore.totalCost
  let nextId = 1

  while (metricCalls < config.maxMetricCalls) {
    iter++

    const parent = selectParent(entries, allTaskIds, rng) ?? baselineEntry
    const component = selectComponent(config.components, iter - 1)
    const minibatchIds = rng.sample(allTaskIds, minibatchSize)
    if (minibatchIds.length === 0) break

    emit({ kind: 'iteration-start', iter, component, minibatchIds })

    const parentMinibatch = await runCandidate(metricCtx, parent.candidate, minibatchIds)
    metricCalls += minibatchIds.length
    totalCost += parentMinibatch.score.totalCost
    if (metricCalls >= config.maxMetricCalls) {
      emit({ kind: 'budget-stop', iter, metricCalls })
      break
    }

    const proposal = await proposeNewComponent({
      judge: input.judge,
      model: config.reflectionModel,
      component,
      current: getComponentValue(parent.candidate, component),
      entries: parentMinibatch.entries,
    })
    if (proposal.value === null) {
      emit({ kind: 'reflection-failed', iter, reason: proposal.reason })
      continue
    }

    const child = withComponent(parent.candidate, component, proposal.value, `c${nextId++}`)
    const childMinibatch = await runCandidate(metricCtx, child, minibatchIds)
    metricCalls += minibatchIds.length
    totalCost += childMinibatch.score.totalCost

    const parentScalar = parentMinibatch.score.sum
    const childScalar = childMinibatch.score.sum
    const improved = childScalar > parentScalar + config.minImprovementThreshold

    if (!improved) {
      emit({ kind: 'rejected', iter, parentScalar, childScalar, component })
      rejectedSinceImprovement++
      if (rejectedSinceImprovement >= config.earlyStoppingTrials) {
        emit({ kind: 'stagnation-stop', iter })
        break
      }
      continue
    }

    const fullRun = await runCandidate(metricCtx, child, allTaskIds)
    metricCalls += allTaskIds.length
    totalCost += fullRun.score.totalCost
    acceptances++
    rejectedSinceImprovement = 0

    const childEntry: ParetoEntry = { candidate: child, score: fullRun.score }
    entries.push(childEntry)

    if (fullRun.score.mean > bestEntry.score.mean) {
      bestEntry = childEntry
    }

    emit({ kind: 'accepted', iter, parentScalar, childScalar, component, fullScore: fullRun.score })
  }

  const paretoFront = buildParetoFront(entries)
  const result: GepaResult = {
    baseline,
    baselineScore,
    best: bestEntry.candidate,
    bestScore: bestEntry.score,
    paretoFront: paretoFront.map((e) => e.candidate),
    candidates: entries.map((e) => e.candidate),
    iterations: iter,
    acceptances,
    metricCalls,
    totalCost,
    history,
  }
  emit({ kind: 'done', iterations: iter, acceptances, best: bestEntry.score })
  return result
}

export type { ScoreVector }
