import { runEval } from '@hillz/core'
import type { CAC } from 'cac'
import pc from 'picocolors'
import { loadContext } from '../loader'
import { matchesGlob } from '../utils'

interface RunOptions {
  task?: string
  tags?: string
  workers?: number
  trials?: number
  noJudge?: boolean
  noCache?: boolean
  refreshCache?: boolean
  keepWorkspaces?: boolean
  format?: 'text' | 'json'
}

export const registerRunCommand = (cli: CAC): void => {
  cli
    .command('run [pattern]', 'Run evals discovered in the project')
    .option('--task <glob>', 'Filter tasks by id glob')
    .option('--tags <csv>', 'Comma-separated tag filter')
    .option('--workers <n>', 'Concurrency cap', { default: 1 })
    .option('--trials <n>', 'Trials per task')
    .option('--no-judge', 'Skip LLM scorers')
    .option('--no-cache', 'Bypass cache reads and writes')
    .option('--refresh-cache', 'Bypass cache reads only')
    .option('--keep-workspaces', 'Preserve workspace dirs after run')
    .option('--format <fmt>', 'Output format: text|json', { default: 'text' })
    .action(async (pattern: string | undefined, opts: RunOptions) => {
      const ctx = await loadContext(process.cwd())
      const filtered = pattern ? ctx.evals.filter((e) => matchesGlob(e.name, pattern)) : ctx.evals
      if (filtered.length === 0) {
        process.stderr.write(`${pc.red('error')} no evals matched\n`)
        process.exitCode = 1
        return
      }

      const tags = opts.tags ? opts.tags.split(',').map((t) => t.trim()) : undefined

      for (const evalDef of filtered) {
        const skill = ctx.skills.get(evalDef.skill)
        if (!skill) {
          process.stderr.write(
            `${pc.red('error')} eval '${evalDef.name}' references unknown skill '${evalDef.skill}'\n`,
          )
          process.exitCode = 1
          continue
        }

        const filteredTasks = evalDef.tasks.filter((t) => {
          if (opts.task && !matchesGlob(t.id, opts.task)) return false
          if (tags && !(t.tags ?? []).some((tag) => tags.includes(tag))) return false
          return true
        })
        const scopedEval = { ...evalDef, tasks: filteredTasks }

        const result = await runEval({
          eval: scopedEval,
          skill,
          agent: ctx.agent,
          scorers: ctx.scorers,
          scorerFactories: ctx.scorerFactories,
          resultsDir: ctx.resultsDir,
          judge: opts.noJudge ? undefined : ctx.judge,
          cache: opts.noCache ? undefined : ctx.cache,
          workspaceFactory: ctx.workspaceFactory,
          options: {
            workers: opts.workers,
            trials: opts.trials,
            skipJudge: opts.noJudge,
            refreshCache: opts.refreshCache,
            keepWorkspaces: opts.keepWorkspaces,
          },
        })

        if ((opts.format ?? 'text') === 'json') {
          process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
        } else {
          const mark = result.aggregate.passRate === 1 ? pc.green('✓') : pc.yellow('●')
          process.stdout.write(
            `${mark} ${evalDef.name}: mean=${result.aggregate.meanScore.toFixed(2)} pass=${(
              result.aggregate.passRate * 100
            ).toFixed(0)}% cost=$${result.aggregate.totalCost.toFixed(4)} cache=${(
              result.aggregate.cacheHitRate * 100
            ).toFixed(0)}%\n`,
          )
        }
      }
    })
}
