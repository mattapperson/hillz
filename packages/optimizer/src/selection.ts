import { type ParetoEntry, perTaskFronts } from './pareto'
import type { SeededRng } from './rng'
import type { ComponentKey } from './types'

export const selectParent = (
  entries: ParetoEntry[],
  taskIds: string[],
  rng: SeededRng,
): ParetoEntry | undefined => {
  if (entries.length === 0) return undefined
  if (entries.length === 1) return entries[0]

  const fronts = perTaskFronts(entries, taskIds)
  const frequency = new Map<ParetoEntry, number>()
  for (const front of fronts.values()) {
    for (const e of front) {
      frequency.set(e, (frequency.get(e) ?? 0) + 1)
    }
  }
  if (frequency.size === 0) return rng.pick(entries)

  let total = 0
  for (const w of frequency.values()) total += w
  if (total === 0) return rng.pick(entries)

  let roll = rng.next() * total
  for (const [entry, weight] of frequency) {
    roll -= weight
    if (roll <= 0) return entry
  }
  return rng.pick([...frequency.keys()])
}

export const selectComponent = (
  components: readonly ComponentKey[],
  iteration: number,
): ComponentKey => {
  if (components.length === 0) {
    throw new Error('selectComponent called with empty components list')
  }
  const pick = components[iteration % components.length]
  if (pick === undefined) {
    throw new Error('selectComponent indexed undefined slot')
  }
  return pick
}
