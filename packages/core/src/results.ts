import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { RunResult } from './types'

const isRunResult = (v: unknown): v is RunResult => {
  if (v === null || typeof v !== 'object') return false
  const aggregate = Reflect.get(v, 'aggregate')
  return (
    typeof Reflect.get(v, 'runId') === 'string' &&
    typeof Reflect.get(v, 'evalName') === 'string' &&
    typeof Reflect.get(v, 'skill') === 'string' &&
    typeof Reflect.get(v, 'flowKind') === 'string' &&
    Array.isArray(Reflect.get(v, 'models')) &&
    typeof Reflect.get(v, 'startedAt') === 'string' &&
    typeof Reflect.get(v, 'finishedAt') === 'string' &&
    Array.isArray(Reflect.get(v, 'tasks')) &&
    typeof aggregate === 'object' &&
    aggregate !== null
  )
}

export const persistResult = async (r: RunResult, dir: string): Promise<string> => {
  await mkdir(dir, { recursive: true })
  const path = join(dir, `${r.runId}.json`)
  await writeFile(path, JSON.stringify(r, null, 2), 'utf8')
  return path
}

export const persistResultAt = async (r: RunResult, path: string): Promise<string> => {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(r, null, 2), 'utf8')
  return path
}

export const loadResult = async (path: string): Promise<RunResult> => {
  const raw = await readFile(path, 'utf8')
  const parsed: unknown = JSON.parse(raw)
  if (!isRunResult(parsed)) {
    throw new Error(`File ${path} does not contain a valid RunResult`)
  }
  return parsed
}
