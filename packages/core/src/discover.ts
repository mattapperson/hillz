import { glob } from 'tinyglobby'
import { isRecord } from './guards'
import { loadSkill } from './skill-loader'
import type { Eval, Scorer, Skill } from './types'

export const discoverSkills = async (root: string): Promise<Skill[]> => {
  const paths = await glob(['skills/**/SKILL.md'], { cwd: root, absolute: true })
  return Promise.all(paths.map(loadSkill))
}

const isScorer = (v: unknown): v is Scorer =>
  isRecord(v) &&
  typeof v.name === 'string' &&
  (v.kind === 'code' || v.kind === 'llm') &&
  typeof v.run === 'function'

const isScorerArray = (v: unknown): v is Scorer[] => Array.isArray(v) && v.every(isScorer)

const isEval = (v: unknown): v is Eval =>
  isRecord(v) &&
  typeof v.name === 'string' &&
  typeof v.skill === 'string' &&
  Array.isArray(v.tasks) &&
  Array.isArray(v.scorers)

const isEvalArray = (v: unknown): v is Eval[] => Array.isArray(v) && v.every(isEval)

export const pickFromMod = (mod: unknown, names: string[]): unknown => {
  if (!isRecord(mod)) return undefined
  for (const name of names) {
    if (mod[name] !== undefined) return mod[name]
  }
  return undefined
}

export const discoverEvals = async (root: string): Promise<Eval[]> => {
  const paths = await glob(['evals/**/*.eval.ts'], { cwd: root, absolute: true })
  const mods = await Promise.all(
    paths.map((p) => import(p).then((m: unknown) => ({ path: p, mod: m }))),
  )
  const out: Eval[] = []
  for (const { path, mod } of mods) {
    const found = pickFromMod(mod, ['default', 'evalDef', 'evals'])
    if (found === undefined) {
      throw new Error(
        `Eval file ${path} has no default export, named 'evalDef', or named 'evals' array`,
      )
    }
    if (isEvalArray(found)) out.push(...found)
    else if (isEval(found)) out.push(found)
    else throw new Error(`Eval file ${path} exported a value that is not a valid Eval shape`)
  }
  return out
}

export const discoverScorers = async (root: string): Promise<Scorer[]> => {
  const paths = await glob(['scorers/**/*.scorer.ts'], { cwd: root, absolute: true })
  const mods = await Promise.all(
    paths.map((p) => import(p).then((m: unknown) => ({ path: p, mod: m }))),
  )
  const out: Scorer[] = []
  for (const { path, mod } of mods) {
    const found = pickFromMod(mod, ['default', 'scorer', 'scorers'])
    if (found === undefined) {
      throw new Error(
        `Scorer file ${path} has no default export, named 'scorer', or named 'scorers' array`,
      )
    }
    if (isScorerArray(found)) out.push(...found)
    else if (isScorer(found)) out.push(found)
    else throw new Error(`Scorer file ${path} exported a value that is not a valid Scorer shape`)
  }
  return out
}
