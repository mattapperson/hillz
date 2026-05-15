import type { ScorerRef } from '@hillz/core'
import type { CAC } from 'cac'
import pc from 'picocolors'
import { loadContext } from '../loader'

const refName = (ref: ScorerRef): string => (typeof ref === 'string' ? ref : ref.name)

export const registerCheckCommand = (cli: CAC): void => {
  cli.command('check', 'Validate skills, evals, and scorer references').action(async () => {
    const ctx = await loadContext(process.cwd())
    const errors: string[] = []
    const warnings: string[] = []

    if (ctx.skills.size === 0) errors.push('No SKILL.md files discovered under ./skills/')
    if (ctx.evals.length === 0) errors.push('No *.eval.ts files discovered under ./evals/')

    for (const e of ctx.evals) {
      if (!ctx.skills.has(e.skill)) {
        errors.push(`eval '${e.name}' references unknown skill '${e.skill}'`)
      }
      for (const ref of e.scorers) {
        const name = refName(ref)
        if (typeof ref === 'string' && !ctx.scorers.has(name) && !ctx.scorerFactories.has(name)) {
          errors.push(`eval '${e.name}' references unknown scorer '${name}'`)
        }
      }
      if (!e.cacheKey && !e.flowVersion) {
        warnings.push(
          `eval '${e.name}' has no 'cacheKey' or 'flowVersion' — cache will be bypassed for this eval`,
        )
      }
    }

    for (const w of warnings) process.stderr.write(`${pc.yellow('warn')} ${w}\n`)
    for (const err of errors) process.stderr.write(`${pc.red('error')} ${err}\n`)

    if (errors.length > 0) {
      process.exitCode = 1
      return
    }
    process.stdout.write(
      `${pc.green('✓')} ${ctx.skills.size} skill(s), ${ctx.evals.length} eval(s) OK\n`,
    )
  })
}
