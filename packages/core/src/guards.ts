import type { AgentTrace } from './types'

export const isRecord = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object'

export const readString = (v: unknown, key: string): string | undefined => {
  if (!isRecord(v)) return undefined
  const x = Reflect.get(v, key)
  return typeof x === 'string' ? x : undefined
}

export const readNumber = (v: unknown, key: string): number | undefined => {
  if (!isRecord(v)) return undefined
  const x = Reflect.get(v, key)
  return typeof x === 'number' ? x : undefined
}

export const readStringArray = (v: unknown, key: string): string[] | undefined => {
  if (!isRecord(v)) return undefined
  const x = Reflect.get(v, key)
  if (!Array.isArray(x)) return undefined
  return x.every((y) => typeof y === 'string') ? x : undefined
}

export const isAgentTrace = (v: unknown): v is AgentTrace => {
  if (!isRecord(v)) return false
  const usage = Reflect.get(v, 'usage')
  return (
    typeof Reflect.get(v, 'output') === 'string' &&
    Array.isArray(Reflect.get(v, 'items')) &&
    Array.isArray(Reflect.get(v, 'toolCalls')) &&
    v['input'] !== undefined &&
    typeof Reflect.get(v, 'fromCache') === 'boolean' &&
    typeof Reflect.get(v, 'durationMs') === 'number' &&
    isRecord(usage) &&
    typeof Reflect.get(usage, 'inputTokens') === 'number' &&
    typeof Reflect.get(usage, 'outputTokens') === 'number'
  )
}
