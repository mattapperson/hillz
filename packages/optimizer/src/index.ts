export { runGepa } from './gepa'
export type { ParetoEntry } from './pareto'
export { buildParetoFront, dominatesVectorEps, perTaskFronts } from './pareto'
export type {
  ComponentKey,
  GepaConfig,
  GepaEvent,
  GepaInput,
  GepaResult,
  ReflectionEntry,
  ScoreVector,
  SkillCandidate,
} from './types'
export { componentId, componentLabel, DEFAULT_GEPA_CONFIG } from './types'
