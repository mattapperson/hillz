import type { ScoreVector, SkillCandidate } from './types'

const isFiniteNumber = (n: number | undefined): n is number =>
  typeof n === 'number' && Number.isFinite(n)

export const dominatesVectorEps = (
  a: Record<string, number>,
  b: Record<string, number>,
  eps: number,
): boolean => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  let strictlyBetter = false
  for (const k of keys) {
    const av = a[k] ?? 0
    const bv = b[k] ?? 0
    if (av < bv - eps) return false
    if (av > bv + eps) strictlyBetter = true
  }
  return strictlyBetter
}

export interface ParetoEntry {
  candidate: SkillCandidate
  score: ScoreVector
}

export const buildParetoFront = (entries: ParetoEntry[], eps = 0): ParetoEntry[] => {
  const front: ParetoEntry[] = []
  for (const entry of entries) {
    let dominated = false
    for (const other of entries) {
      if (other === entry) continue
      if (dominatesVectorEps(other.score.perTask, entry.score.perTask, eps)) {
        dominated = true
        break
      }
    }
    if (!dominated) front.push(entry)
  }
  return front
}

export const perTaskFronts = (
  entries: ParetoEntry[],
  taskIds: string[],
  eps = 0,
): Map<string, ParetoEntry[]> => {
  const result = new Map<string, ParetoEntry[]>()
  for (const tid of taskIds) {
    let best = -Infinity
    for (const e of entries) {
      const v = e.score.perTask[tid]
      if (isFiniteNumber(v) && v > best) best = v
    }
    const onFront = entries.filter((e) => {
      const v = e.score.perTask[tid]
      return isFiniteNumber(v) && v >= best - eps
    })
    result.set(tid, onFront)
  }
  return result
}
