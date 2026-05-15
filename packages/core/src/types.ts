import type {
  FsAdapter,
  HarnessResponse,
  Item,
  Tool as NoeticTool,
  ShellAdapter,
  Step,
  SubprocessAdapter,
} from '@noetic-tools/core'
import type { z } from 'zod'

export type { FsAdapter, HarnessResponse, Item, NoeticTool, ShellAdapter, Step, SubprocessAdapter }

export interface AgentTraceUsage {
  inputTokens: number
  outputTokens: number
  cachedTokens?: number
  cost?: number
}

export type InputMessage = string | { role: 'user' | 'system'; content: string }

export interface ToolCallRecord {
  id: string
  name: string
  args: unknown
  result: unknown
  error?: { message: string }
  durationMs?: number
}

export type SkillFileKind = 'markdown' | 'script' | 'data' | 'asset'

export type SkillFileGroup = 'references' | 'scripts' | 'assets'

export interface SkillFile {
  path: string
  absolutePath: string
  content: string
  kind: SkillFileKind
  group: SkillFileGroup
}

export interface SkillSiblings {
  references: SkillFile[]
  scripts: SkillFile[]
  assets: SkillFile[]
}

export interface SkillLoadWarning {
  path: string
  reason: 'binary' | 'unreadable' | 'oversize'
  detail?: string
}

export interface Skill {
  name: string
  description: string
  version?: string
  body: string
  filePath: string
  siblings?: SkillSiblings
  loadWarnings?: SkillLoadWarning[]
}

export interface WorkspaceSpec {
  fixture?: string
  allowShell?: boolean
  maxFileBytes?: number
}

export interface FileSnapshot {
  files: Record<
    string,
    {
      sha256: string
      size: number
      content?: string
      binary?: boolean
    }
  >
}

export interface WorkspaceDiff {
  added: string[]
  removed: string[]
  modified: Array<{
    path: string
    unifiedDiff: string
    beforeSha256?: string
    afterSha256?: string
  }>
  unchanged: string[]
}

export interface AgentTrace {
  input: InputMessage | InputMessage[]
  output: string
  items: Item[]
  toolCalls: ToolCallRecord[]
  usage: AgentTraceUsage
  fromCache: boolean
  durationMs: number
  workspace?: {
    before: FileSnapshot
    after: FileSnapshot
    diff: WorkspaceDiff
  }
}

export interface ScoreResult {
  scorer: string
  score: number
  reason?: string
  metadata?: Record<string, unknown>
}

export interface ScorerRun {
  runId: string
  input: InputMessage | InputMessage[]
  output: string
  trace: AgentTrace
  additionalContext?: {
    reference?: string
    context?: string[]
  }
  workspace?: {
    before: FileSnapshot
    after: FileSnapshot
    diff: WorkspaceDiff
  }
}

export interface ScorerDeps {
  judge?: Judge
}

export interface Scorer {
  name: string
  kind: 'code' | 'llm'
  run: (run: ScorerRun, deps: ScorerDeps) => Promise<ScoreResult>
}

export type ScorerRef = string | Scorer | { name: string; opts: Record<string, unknown> }

export interface Task {
  id: string
  displayName?: string
  tags?: string[]
  input: InputMessage | InputMessage[]
  expect?: {
    contains?: string[]
    toolCalls?: string[]
    schema?: z.ZodTypeAny
  }
  scorers?: ScorerRef[]
  workspace?: WorkspaceSpec
  timeoutMs?: number
}

export type FlowFactory = (ctx: {
  skill: Skill
  task: Task
  tools: NoeticTool[]
}) => Step<unknown, string, string>

export type EvalFlow = Step<unknown, string, string> | FlowFactory

export interface Eval {
  name: string
  skill: string
  flow: EvalFlow
  tools?: NoeticTool[]
  tasks: Task[]
  scorers: ScorerRef[]
  workers?: number
  trials?: number
  passThreshold?: number
  cacheKey?: (input: InputMessage | InputMessage[]) => string
  flowVersion?: string
}

export interface RunResult {
  runId: string
  evalName: string
  skill: string
  flowKind: 'step' | 'factory'
  flowVersion?: string
  models: string[]
  startedAt: string
  finishedAt: string
  tasks: Array<{
    taskId: string
    trial: number
    trace: AgentTrace
    scores: ScoreResult[]
    meanScore: number
    passed: boolean
  }>
  aggregate: {
    meanScore: number
    passRate: number
    totalCost: number
    cacheHitRate: number
  }
}

export type ProgressEvent =
  | { kind: 'task-start'; taskId: string; trial: number }
  | { kind: 'task-end'; taskId: string; trial: number; passed: boolean; meanScore: number }
  | { kind: 'scorer'; taskId: string; scorer: string; score: number }
  | { kind: 'cache-hit'; taskId: string }

export interface AgentRunner {
  run: (req: {
    step: Step<unknown, string, string>
    input: InputMessage | InputMessage[]
    fs?: FsAdapter
    shell?: ShellAdapter
    subprocess?: SubprocessAdapter
    timeoutMs?: number
  }) => Promise<AgentTrace>

  compileFlow: (req: {
    flow: EvalFlow
    skill: Skill
    task: Task
    tools: NoeticTool[]
  }) => Step<unknown, string, string>
}

export interface Judge {
  evaluate: <T extends z.ZodTypeAny>(req: {
    model?: string
    rubric: string
    input: string
    schema: T
  }) => Promise<z.infer<T>>
}

export interface CacheStore {
  get: (key: string) => Promise<AgentTrace | null>
  set: (key: string, trace: AgentTrace) => Promise<void>
  has: (key: string) => Promise<boolean>
  prune: (opts?: { olderThanDays?: number }) => Promise<{ removed: number }>
  clear: () => Promise<void>
  stats: () => Promise<{ entries: number; bytes: number }>
}

export interface Workspace {
  dir: string
  snapshot: () => Promise<FileSnapshot>
  diff: (before: FileSnapshot, after: FileSnapshot) => WorkspaceDiff
  adapters: (opts?: { allowShell?: boolean }) => {
    fs: FsAdapter
    shell?: ShellAdapter
  }
  destroy: () => Promise<void>
  archive: (toDir: string) => Promise<void>
}

export interface WorkspaceFactory {
  create: (spec: WorkspaceSpec, runId: string, taskId: string) => Promise<Workspace>
}

export interface HillzConfig {
  cache?: CacheStore
  resultsDir?: string
  judge?: Judge
}

export type ToolDefinition = NoeticTool
