export interface SeededRng {
  next: () => number
  pick: <T>(arr: readonly T[]) => T | undefined
  sample: <T>(arr: readonly T[], n: number) => T[]
}

const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const createRng = (seed?: number): SeededRng => {
  const next = seed === undefined ? Math.random : mulberry32(seed)
  return {
    next,
    pick: <T>(arr: readonly T[]): T | undefined => {
      if (arr.length === 0) return undefined
      const idx = Math.floor(next() * arr.length)
      return arr[idx]
    },
    sample: <T>(arr: readonly T[], n: number): T[] => {
      const k = Math.max(0, Math.min(n, arr.length))
      const pool = arr.slice()
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1))
        const tmp = pool[i]
        const other = pool[j]
        if (tmp === undefined || other === undefined) continue
        pool[i] = other
        pool[j] = tmp
      }
      return pool.slice(0, k)
    },
  }
}
