import { describe, expect, test } from 'bun:test'
import { buildParetoFront, dominatesVectorEps, perTaskFronts } from './pareto'
import type { SkillCandidate } from './types'

const mkCandidate = (id: string): SkillCandidate => ({
  id,
  body: id,
  description: id,
  files: {},
})

describe('dominatesVectorEps', () => {
  test('strict domination across all dims', () => {
    expect(dominatesVectorEps({ a: 0.8, b: 0.9 }, { a: 0.5, b: 0.6 }, 0)).toBe(true)
  })

  test('equal vectors do not dominate', () => {
    expect(dominatesVectorEps({ a: 0.5, b: 0.5 }, { a: 0.5, b: 0.5 }, 0)).toBe(false)
  })

  test('tie on one dim, strictly better on another → dominates', () => {
    expect(dominatesVectorEps({ a: 0.5, b: 0.9 }, { a: 0.5, b: 0.5 }, 0)).toBe(true)
  })

  test('worse on any dim → no domination', () => {
    expect(dominatesVectorEps({ a: 0.9, b: 0.4 }, { a: 0.5, b: 0.6 }, 0)).toBe(false)
  })

  test('eps absorbs small disadvantages', () => {
    expect(dominatesVectorEps({ a: 0.51, b: 0.49 }, { a: 0.5, b: 0.5 }, 0.05)).toBe(false)
    expect(dominatesVectorEps({ a: 0.6, b: 0.49 }, { a: 0.5, b: 0.5 }, 0.05)).toBe(true)
  })

  test('missing keys treated as 0', () => {
    expect(dominatesVectorEps({ a: 0.5 }, { b: 0.5 }, 0)).toBe(false)
    expect(dominatesVectorEps({ a: 0.5, b: 0.5 }, { a: 0.5 }, 0)).toBe(true)
  })
})

describe('buildParetoFront', () => {
  test('single entry is on the front', () => {
    const entries = [
      {
        candidate: mkCandidate('a'),
        score: { perTask: { t1: 0.5 }, mean: 0.5, sum: 0.5, passCount: 0, totalCost: 0 },
      },
    ]
    expect(buildParetoFront(entries)).toHaveLength(1)
  })

  test('strictly dominated entries dropped', () => {
    const entries = [
      {
        candidate: mkCandidate('a'),
        score: { perTask: { t1: 0.3, t2: 0.4 }, mean: 0.35, sum: 0.7, passCount: 0, totalCost: 0 },
      },
      {
        candidate: mkCandidate('b'),
        score: { perTask: { t1: 0.8, t2: 0.9 }, mean: 0.85, sum: 1.7, passCount: 0, totalCost: 0 },
      },
    ]
    const front = buildParetoFront(entries)
    expect(front).toHaveLength(1)
    expect(front[0]?.candidate.id).toBe('b')
  })

  test('non-dominated diverse entries all on front', () => {
    const entries = [
      {
        candidate: mkCandidate('a'),
        score: { perTask: { t1: 0.9, t2: 0.2 }, mean: 0.55, sum: 1.1, passCount: 0, totalCost: 0 },
      },
      {
        candidate: mkCandidate('b'),
        score: { perTask: { t1: 0.2, t2: 0.9 }, mean: 0.55, sum: 1.1, passCount: 0, totalCost: 0 },
      },
      {
        candidate: mkCandidate('c'),
        score: { perTask: { t1: 0.5, t2: 0.5 }, mean: 0.5, sum: 1.0, passCount: 0, totalCost: 0 },
      },
    ]
    const ids = buildParetoFront(entries)
      .map((e) => e.candidate.id)
      .sort()
    expect(ids).toEqual(['a', 'b', 'c'])
  })
})

describe('perTaskFronts', () => {
  test('each task gets at least one candidate', () => {
    const entries = [
      {
        candidate: mkCandidate('a'),
        score: { perTask: { t1: 0.9, t2: 0.2 }, mean: 0.55, sum: 1.1, passCount: 0, totalCost: 0 },
      },
      {
        candidate: mkCandidate('b'),
        score: { perTask: { t1: 0.2, t2: 0.9 }, mean: 0.55, sum: 1.1, passCount: 0, totalCost: 0 },
      },
    ]
    const fronts = perTaskFronts(entries, ['t1', 't2'])
    expect(fronts.get('t1')?.map((e) => e.candidate.id)).toEqual(['a'])
    expect(fronts.get('t2')?.map((e) => e.candidate.id)).toEqual(['b'])
  })

  test('ties share the front', () => {
    const entries = [
      {
        candidate: mkCandidate('a'),
        score: { perTask: { t1: 0.5 }, mean: 0.5, sum: 0.5, passCount: 0, totalCost: 0 },
      },
      {
        candidate: mkCandidate('b'),
        score: { perTask: { t1: 0.5 }, mean: 0.5, sum: 0.5, passCount: 0, totalCost: 0 },
      },
    ]
    const fronts = perTaskFronts(entries, ['t1'])
    expect(fronts.get('t1')).toHaveLength(2)
  })
})
