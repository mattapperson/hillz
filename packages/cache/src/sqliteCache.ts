import { Database } from 'bun:sqlite'
import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { CacheStore } from '@hillz/core'
import { isAgentTrace, readNumber, readString } from '@hillz/core'

export const createSqliteCache = (dbPath: string): CacheStore => {
  let dbPromise: Promise<Database> | null = null

  const db = (): Promise<Database> => {
    if (dbPromise) return dbPromise
    dbPromise = (async () => {
      await mkdir(dirname(dbPath), { recursive: true })
      const fresh = new Database(dbPath)
      fresh.exec('PRAGMA journal_mode = WAL;')
      fresh.exec('PRAGMA synchronous = NORMAL;')
      fresh.exec(`
        CREATE TABLE IF NOT EXISTS cache (
          key            TEXT PRIMARY KEY NOT NULL,
          trace_json     TEXT NOT NULL,
          size_bytes     INTEGER NOT NULL,
          created_at     INTEGER NOT NULL,
          last_access_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_cache_age ON cache(created_at);
      `)
      return fresh
    })()
    return dbPromise
  }

  return {
    get: async (key) => {
      const conn = await db()
      const row = conn.query('SELECT trace_json FROM cache WHERE key = ?').get(key)
      const json = readString(row, 'trace_json')
      if (!json) return null
      try {
        const parsed: unknown = JSON.parse(json)
        if (!isAgentTrace(parsed)) {
          conn.query('DELETE FROM cache WHERE key = ?').run(key)
          return null
        }
        conn.query('UPDATE cache SET last_access_at = ? WHERE key = ?').run(Date.now(), key)
        return { ...parsed, fromCache: false }
      } catch {
        conn.query('DELETE FROM cache WHERE key = ?').run(key)
        return null
      }
    },

    set: async (key, trace) => {
      const conn = await db()
      const json = JSON.stringify({ ...trace, fromCache: false })
      const now = Date.now()
      conn
        .query(
          `INSERT INTO cache (key, trace_json, size_bytes, created_at, last_access_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(key) DO UPDATE SET
             trace_json = excluded.trace_json,
             size_bytes = excluded.size_bytes,
             last_access_at = excluded.last_access_at`,
        )
        .run(key, json, Buffer.byteLength(json), now, now)
    },

    has: async (key) => {
      const conn = await db()
      const row = conn.query('SELECT 1 AS hit FROM cache WHERE key = ?').get(key)
      return row !== null && row !== undefined
    },

    prune: async (opts) => {
      const conn = await db()
      if (opts?.olderThanDays !== undefined) {
        const cutoff = Date.now() - opts.olderThanDays * 24 * 60 * 60 * 1000
        const res = conn.query('DELETE FROM cache WHERE created_at < ?').run(cutoff)
        return { removed: Number(res.changes) }
      }
      const res = conn.query('DELETE FROM cache').run()
      return { removed: Number(res.changes) }
    },

    clear: async () => {
      const conn = await db()
      conn.exec('DELETE FROM cache')
    },

    stats: async () => {
      const conn = await db()
      const row = conn
        .query('SELECT COUNT(*) AS c, COALESCE(SUM(size_bytes), 0) AS b FROM cache')
        .get()
      const entries = readNumber(row, 'c') ?? 0
      const bytes = readNumber(row, 'b') ?? 0
      return { entries, bytes }
    },
  }
}
