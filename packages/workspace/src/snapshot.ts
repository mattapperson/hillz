import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import type { FileSnapshot, WorkspaceDiff } from '@hillz/core'
import { createTwoFilesPatch } from 'diff'

const DEFAULT_TEXT_THRESHOLD = 64 * 1024

const looksBinary = (buf: Buffer): boolean => {
  const len = Math.min(buf.length, 8000)
  for (let i = 0; i < len; i++) {
    if (buf[i] === 0) return true
  }
  return false
}

const walk = async (dir: string, base: string, paths: string[]): Promise<void> => {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  await Promise.all(
    entries.map(async (entry) => {
      const abs = join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(abs, base, paths)
      } else if (entry.isFile() || entry.isSymbolicLink()) {
        paths.push(relative(base, abs))
      }
    }),
  )
}

const readEntry = async (
  dir: string,
  rel: string,
  threshold: number,
): Promise<[string, FileSnapshot['files'][string]] | null> => {
  const buf = await readFile(join(dir, rel)).catch(() => null)
  if (!buf) return null
  const sha256 = createHash('sha256').update(buf).digest('hex')
  const binary = looksBinary(buf)
  const includeContent = !binary && buf.length <= threshold
  return [
    rel,
    {
      sha256,
      size: buf.length,
      content: includeContent ? buf.toString('utf8') : undefined,
      binary,
    },
  ]
}

export const snapshotDir = async (
  dir: string,
  opts?: { maxFileBytes?: number },
): Promise<FileSnapshot> => {
  const threshold = opts?.maxFileBytes ?? DEFAULT_TEXT_THRESHOLD
  const paths: string[] = []
  await walk(dir, dir, paths)
  paths.sort()

  const entries = await Promise.all(paths.map((rel) => readEntry(dir, rel, threshold)))
  const files: FileSnapshot['files'] = {}
  for (const entry of entries) {
    if (entry) files[entry[0]] = entry[1]
  }
  return { files }
}

export const diffSnapshots = (before: FileSnapshot, after: FileSnapshot): WorkspaceDiff => {
  const added: string[] = []
  const removed: string[] = []
  const modified: WorkspaceDiff['modified'] = []
  const unchanged: string[] = []

  const beforePaths = new Set(Object.keys(before.files))
  const afterPaths = new Set(Object.keys(after.files))

  for (const path of beforePaths) {
    if (!afterPaths.has(path)) {
      removed.push(path)
      continue
    }
    const b = before.files[path]
    const a = after.files[path]
    if (!a || !b) continue
    if (a.sha256 === b.sha256) {
      unchanged.push(path)
      continue
    }
    if (a.content !== undefined && b.content !== undefined) {
      modified.push({
        path,
        unifiedDiff: createTwoFilesPatch(path, path, b.content, a.content),
      })
    } else {
      modified.push({
        path,
        unifiedDiff: '',
        beforeSha256: b.sha256,
        afterSha256: a.sha256,
      })
    }
  }
  for (const path of afterPaths) {
    if (!beforePaths.has(path)) added.push(path)
  }

  added.sort()
  removed.sort()
  modified.sort((x, y) => x.path.localeCompare(y.path))
  unchanged.sort()

  return { added, removed, modified, unchanged }
}
