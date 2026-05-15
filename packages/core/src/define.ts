import type { Eval, HillzConfig, Scorer, Skill, Task } from './types'

export const defineEval = <T extends Eval>(e: T): T => e
export const defineTask = <T extends Task>(t: T): T => t
export const defineSkill = <T extends Skill>(s: T): T => s
export const defineScorer = <T extends Scorer>(s: T): T => s
export const defineConfig = <T extends HillzConfig>(c: T): T => c
