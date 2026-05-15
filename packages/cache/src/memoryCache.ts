import type { AgentTrace, CacheStore } from '@hillz/core'

interface Entry {
  trace: AgentTrace
  bytes: number
}

export const createMemoryCache = (opts?: { maxEntries?: number }): CacheStore => {
  const store = new Map<string, Entry>()
  const max = opts?.maxEntries
  let totalBytes = 0

  const evict = (key: string): void => {
    const entry = store.get(key)
    if (!entry) return
    totalBytes -= entry.bytes
    store.delete(key)
  }

  return {
    get: async (key) => {
      const e = store.get(key)
      if (!e) return null
      store.delete(key)
      store.set(key, e)
      return { ...e.trace, fromCache: false }
    },

    set: async (key, trace) => {
      const stored: AgentTrace = { ...trace, fromCache: false }
      const bytes = Buffer.byteLength(JSON.stringify(stored))
      evict(key)
      store.set(key, { trace: stored, bytes })
      totalBytes += bytes
      if (max !== undefined && store.size > max) {
        const oldest = store.keys().next().value
        if (oldest !== undefined) evict(oldest)
      }
    },

    has: async (key) => store.has(key),

    prune: async () => {
      const removed = store.size
      store.clear()
      totalBytes = 0
      return { removed }
    },

    clear: async () => {
      store.clear()
      totalBytes = 0
    },

    stats: async () => ({ entries: store.size, bytes: totalBytes }),
  }
}
