import { createHash } from 'node:crypto'
import type { InputMessage } from './types'

const canonicalJSON = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalJSON).join(',')}]`
  const keys = Object.keys(value).sort()
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${canonicalJSON(Reflect.get(value, k))}`)
    .join(',')}}`
}

const sha256Hex = (s: string): string => createHash('sha256').update(s, 'utf8').digest('hex')

export const computeKey = (req: {
  input: InputMessage | InputMessage[]
  flowVersion?: string
  cacheKeyFn?: (input: InputMessage | InputMessage[]) => string
}): string | null => {
  if (req.cacheKeyFn) {
    return sha256Hex(req.cacheKeyFn(req.input))
  }
  if (req.flowVersion) {
    return sha256Hex(`${req.flowVersion}:${canonicalJSON(req.input)}`)
  }
  return null
}

export const canonicalize = canonicalJSON
