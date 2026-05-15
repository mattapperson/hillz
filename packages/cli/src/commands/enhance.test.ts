import { describe, expect, test } from 'bun:test'
import { parseComponentTokens } from './enhance'

describe('parseComponentTokens', () => {
  test('defaults to body+desc when unset', () => {
    const r = parseComponentTokens(undefined, false)
    expect(r.error).toBeUndefined()
    expect(r.tokens).toEqual(['body', 'desc'])
  })

  test('legacy "both" still works', () => {
    const r = parseComponentTokens('both', false)
    expect(r.tokens).toEqual(['body', 'desc'])
  })

  test('accepts canonical and alias tokens', () => {
    expect(parseComponentTokens('body', false).tokens).toEqual(['body'])
    expect(parseComponentTokens('desc', false).tokens).toEqual(['desc'])
    expect(parseComponentTokens('description', false).tokens).toEqual(['desc'])
    expect(parseComponentTokens('refs', false).tokens).toEqual(['refs'])
    expect(parseComponentTokens('references', false).tokens).toEqual(['refs'])
    expect(parseComponentTokens('scripts', false).tokens).toEqual(['scripts'])
    expect(parseComponentTokens('assets', false).tokens).toEqual(['assets'])
  })

  test('accepts comma-separated lists and de-duplicates', () => {
    const r = parseComponentTokens('body,refs,desc,refs', false)
    expect(r.tokens).toEqual(['body', 'refs', 'desc'])
  })

  test('"full" token expands to all', () => {
    const r = parseComponentTokens('full', false)
    expect(r.tokens).toEqual(['body', 'desc', 'refs', 'scripts', 'assets'])
  })

  test('--full flag (with no --components) expands to all', () => {
    const r = parseComponentTokens(undefined, true)
    expect(r.tokens).toEqual(['body', 'desc', 'refs', 'scripts', 'assets'])
  })

  test('--full + --components together is an error', () => {
    const r = parseComponentTokens('body', true)
    expect(r.error).toBeDefined()
    expect(r.tokens).toEqual([])
  })

  test('unknown token reports an error', () => {
    const r = parseComponentTokens('body,wat', false)
    expect(r.error).toBeDefined()
    expect(r.error).toContain('wat')
  })

  test('ignores blank/whitespace-only entries', () => {
    const r = parseComponentTokens(' body , , refs ', false)
    expect(r.tokens).toEqual(['body', 'refs'])
  })
})
