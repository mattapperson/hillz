import { join } from 'node:path'
import { createAgentRunner, createJudge } from '@hillz/agent'
import { createFileCache } from '@hillz/cache'
import type {
  AgentRunner,
  CacheStore,
  Eval,
  HillzConfig,
  Judge,
  Scorer,
  ScorerFactory,
  Skill,
  WorkspaceFactory,
} from '@hillz/core'
import {
  discoverEvals,
  discoverScorers,
  discoverSkills,
  isRecord,
  pickFromMod,
  readString,
} from '@hillz/core'
import { builtInScorerFactories, builtInScorers } from '@hillz/scorers'
import { createWorkspaceFactory } from '@hillz/workspace'

const isCacheStore = (v: unknown): v is CacheStore =>
  isRecord(v) &&
  typeof Reflect.get(v, 'get') === 'function' &&
  typeof Reflect.get(v, 'set') === 'function' &&
  typeof Reflect.get(v, 'has') === 'function' &&
  typeof Reflect.get(v, 'prune') === 'function' &&
  typeof Reflect.get(v, 'clear') === 'function' &&
  typeof Reflect.get(v, 'stats') === 'function'

const isJudge = (v: unknown): v is Judge =>
  isRecord(v) && typeof Reflect.get(v, 'evaluate') === 'function'

export interface LoadedContext {
  root: string
  config: HillzConfig
  skills: Map<string, Skill>
  evals: Eval[]
  scorers: Map<string, Scorer>
  scorerFactories: Map<string, ScorerFactory>
  agent: AgentRunner
  judge: Judge
  cache: CacheStore
  workspaceFactory: WorkspaceFactory
  resultsDir: string
}

const loadConfig = async (root: string): Promise<HillzConfig> => {
  try {
    const mod: unknown = await import(join(root, 'hillz.config.ts'))
    const fromDefault = pickFromMod(mod, ['default', 'config'])
    if (isRecord(fromDefault)) return fromDefault
  } catch {}
  return {}
}

export const loadContext = async (cwd: string): Promise<LoadedContext> => {
  const config = await loadConfig(cwd)

  const [skillList, evals, discoveredScorers] = await Promise.all([
    discoverSkills(cwd),
    discoverEvals(cwd),
    discoverScorers(cwd),
  ])

  const skills = new Map<string, Skill>()
  for (const s of skillList) skills.set(s.name, s)

  const scorers = new Map<string, Scorer>(builtInScorers)
  for (const s of discoveredScorers) scorers.set(s.name, s)

  const agent = createAgentRunner()
  const judge = isJudge(config.judge) ? config.judge : createJudge()
  const cache = isCacheStore(config.cache)
    ? config.cache
    : createFileCache(join(cwd, 'hillz', 'cache'))
  const workspaceFactory = createWorkspaceFactory()
  const resultsDir = readString(config, 'resultsDir') ?? join(cwd, 'hillz', 'results')

  return {
    root: cwd,
    config,
    skills,
    evals,
    scorers,
    scorerFactories: builtInScorerFactories,
    agent,
    judge,
    cache,
    workspaceFactory,
    resultsDir,
  }
}
