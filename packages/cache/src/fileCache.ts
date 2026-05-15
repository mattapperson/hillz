import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, rename, rm, stat, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { CacheStore } from '@hillz/core'
import { isAgentTrace } from '@hillz/core'

const keyToPath = (dir: string, key: string): string => {
  const safe = createHash('sha256').update(key).digest('hex')
  return join(dir, `${safe}.json`)
}

export const createFileCache = (dir: string): CacheStore => {
  let ensured = false
  const ensureDir = async (): Promise<void> => {
    if (ensured) return
    await mkdir(dir, { recursive: true })
    ensured = true
  }

  return {
    get: async (key) => {
      const path = keyToPath(dir, key)
      try {
        const raw = await readFile(path, 'utf8')
        const parsed: unknown = JSON.parse(raw)
        if (!isAgentTrace(parsed)) {
          await unlink(path).catch(() => {})
          return null
        }
        return { ...parsed, fromCache: false }
      } catch {
        return null
      }
    },

    set: async (key, trace) => {
      await ensureDir()
      const path = keyToPath(dir, key)
      const tmp = `${path}.tmp`
      await writeFile(tmp, JSON.stringify({ ...trace, fromCache: false }), 'utf8')
      await rename(tmp, path)
    },

    has: async (key) => {
      try {
        await stat(keyToPath(dir, key))
        return true
      } catch {
        return false
      }
    },

    prune: async (opts) => {
      await ensureDir()
      const cutoff = opts?.olderThanDays
        ? Date.now() - opts.olderThanDays * 24 * 60 * 60 * 1000
        : null
      const entries = (await readdir(dir).catch(() => [])).filter((n) => n.endsWith('.json'))
      const results = await Promise.all(
        entries.map(async (name) => {
          const p = join(dir, name)
          if (cutoff === null) {
            await unlink(p).catch(() => {})
            return true
          }
          const s = await stat(p).catch(() => null)
          if (s && s.mtimeMs < cutoff) {
            await unlink(p).catch(() => {})
            return true
          }
          return false
        }),
      )
      return { removed: results.filter(Boolean).length }
    },

    clear: async () => {
      await rm(dir, { recursive: true, force: true })
      ensured = false
    },

    stats: async () => {
      const entries = await readdir(dir).catch(() => [])
      const jsonNames = entries.filter((n) => n.endsWith('.json'))
      const sizes = await Promise.all(
        jsonNames.map((n) =>
          stat(join(dir, n))
            .then((s) => s.size)
            .catch(() => 0),
        ),
      )
      return {
        entries: sizes.filter((s) => s > 0).length,
        bytes: sizes.reduce((a, b) => a + b, 0),
      }
    },
  }
}
