import type {
  AgentRunner,
  CacheStore,
  Eval,
  Judge,
  Scorer,
  ScorerFactory,
  Skill,
  SkillFileKind,
  WorkspaceFactory,
} from '@hillz/core'

export type ComponentKey =
  | { kind: 'body' }
  | { kind: 'description' }
  | { kind: 'file'; path: string; fileKind: SkillFileKind }

export const componentId = (c: ComponentKey): string => {
  if (c.kind === 'file') return `file:${c.path}`
  return c.kind
}

export const componentLabel = (c: ComponentKey): string => {
  if (c.kind === 'file') return c.path
  return c.kind
}

export interface SkillCandidate {
  id: string
  parentId?: string
  body: string
  description: string
  files: Record<string, string>
  mutatedComponent?: ComponentKey
}

export interface ScoreVector {
  perTask: Record<string, number>
  mean: number
  sum: number
  passCount: number
  totalCost: number
}

export interface ReflectionEntry {
  taskId: string
  input: string
  output: string
  score: number
  scoreLines: string
}

export type GepaEvent =
  | { kind: 'baseline'; score: ScoreVector }
  | { kind: 'iteration-start'; iter: number; component: ComponentKey; minibatchIds: string[] }
  | { kind: 'reflection-failed'; iter: number; reason: string }
  | {
      kind: 'rejected'
      iter: number
      parentScalar: number
      childScalar: number
      component: ComponentKey
    }
  | {
      kind: 'accepted'
      iter: number
      parentScalar: number
      childScalar: number
      component: ComponentKey
      fullScore: ScoreVector
    }
  | { kind: 'stagnation-stop'; iter: number }
  | { kind: 'budget-stop'; iter: number; metricCalls: number }
  | { kind: 'done'; iterations: number; acceptances: number; best: ScoreVector }

export interface GepaConfig {
  maxMetricCalls: number
  minibatchSize: number
  earlyStoppingTrials: number
  minImprovementThreshold: number
  reflectionModel?: string
  components: ComponentKey[]
  seed?: number
  onEvent?: (e: GepaEvent) => void
}

export interface GepaInput {
  skill: Skill
  evalDef: Eval
  agent: AgentRunner
  judge: Judge
  scorers: Map<string, Scorer>
  scorerFactories: Map<string, ScorerFactory>
  resultsDir: string
  cache?: CacheStore
  workspaceFactory?: WorkspaceFactory
  config?: Partial<GepaConfig>
}

export interface GepaResult {
  baseline: SkillCandidate
  baselineScore: ScoreVector
  best: SkillCandidate
  bestScore: ScoreVector
  paretoFront: SkillCandidate[]
  candidates: SkillCandidate[]
  iterations: number
  acceptances: number
  metricCalls: number
  totalCost: number
  history: GepaEvent[]
}

export const DEFAULT_GEPA_CONFIG: GepaConfig = {
  maxMetricCalls: 30,
  minibatchSize: 4,
  earlyStoppingTrials: 5,
  minImprovementThreshold: 0,
  components: [{ kind: 'body' }, { kind: 'description' }],
}
