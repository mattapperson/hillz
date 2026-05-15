import { randomUUID } from 'node:crypto'
import { dirname, join } from 'node:path'
import type { RunResult } from '@hillz/core'
import { loadResult, persistResultAt, resolveScorerRefs } from '@hillz/core'
import type { CAC } from 'cac'
import pc from 'picocolors'
import { loadContext } from '../loader'

interface GradeOptions {
  inPlace?: boolean
  scorers?: string
  noJudge?: boolean
  output?: string
  ignoreMissingEval?: boolean
}

export const registerGradeCommand = (cli: CAC): void => {
  cli
    .command('grade <...files>', 'Re-score saved RunResults without re-running agents')
    .option('--in-place', 'Overwrite the source file')
    .option('--scorers <csv>', 'Only run the named scorers')
    .option('--no-judge', 'Skip LLM scorers')
    .option('--output <path>', 'Output file (single input only)')
    .option('--ignore-missing-eval', 'Use --scorers list when eval no longer exists')
    .action(async (files: string[], opts: GradeOptions) => {
      const ctx = await loadContext(process.cwd())
      const scorerFilter = opts.scorers
        ? new Set(opts.scorers.split(',').map((s) => s.trim()))
        : null

      for (const file of files) {
        const original: RunResult = await loadResult(file)
        const sourceEval = ctx.evals.find((e) => e.name === original.evalName)

        if (!sourceEval && !opts.ignoreMissingEval && !scorerFilter) {
          process.stderr.write(
            `${pc.red('error')} eval '${original.evalName}' not in project; pass --ignore-missing-eval --scorers <csv>\n`,
          )
          process.exitCode = 1
          continue
        }

        const refs = sourceEval ? sourceEval.scorers : null
        const baseScorers = refs
          ? resolveScorerRefs(refs, ctx.scorers, ctx.scorerFactories)
          : [...ctx.scorers.values()]
        const filtered = scorerFilter
          ? baseScorers.filter((s) => scorerFilter.has(s.name))
          : baseScorers

        const startedAt = new Date().toISOString()
        const newRunId = randomUUID()
        const regradedTasks: RunResult['tasks'] = []

        for (const t of original.tasks) {
          const runnableScorers = filtered.filter(
            (s) => !(s.kind === 'llm' && (opts.noJudge || !ctx.judge)),
          )
          const scores = await Promise.all(
            runnableScorers.map(async (scorer) => {
              try {
                return await scorer.run(
                  {
                    runId: newRunId,
                    input: t.trace.input,
                    output: t.trace.output,
                    trace: t.trace,
                    workspace: t.trace.workspace,
                  },
                  { judge: ctx.judge },
                )
              } catch (err) {
                const message = err instanceof Error ? err.message : String(err)
                process.stderr.write(
                  `${pc.yellow('warn')} scorer '${scorer.name}' skipped: ${message}\n`,
                )
                return null
              }
            }),
          )
          const validScores = scores.filter((s): s is NonNullable<typeof s> => s !== null)
          const meanScore =
            validScores.length > 0
              ? validScores.reduce((a, s) => a + s.score, 0) / validScores.length
              : 0
          const threshold = sourceEval?.passThreshold ?? 0.8
          regradedTasks.push({
            taskId: t.taskId,
            trial: t.trial,
            trace: t.trace,
            scores: validScores,
            meanScore,
            passed: meanScore >= threshold,
          })
        }

        const finishedAt = new Date().toISOString()
        const passCount = regradedTasks.filter((t) => t.passed).length
        const totalCost = regradedTasks.reduce((a, t) => a + (t.trace.usage.cost ?? 0), 0)
        const meanAll =
          regradedTasks.length > 0
            ? regradedTasks.reduce((a, t) => a + t.meanScore, 0) / regradedTasks.length
            : 0
        const cacheHits = regradedTasks.filter((t) => t.trace.fromCache).length

        const outPath = opts.inPlace
          ? file
          : (opts.output ?? join(dirname(file), `${original.runId}-graded-${newRunId}.json`))

        const regraded: RunResult = {
          ...original,
          runId: opts.inPlace ? original.runId : newRunId,
          startedAt,
          finishedAt,
          tasks: regradedTasks,
          aggregate: {
            meanScore: meanAll,
            passRate: regradedTasks.length > 0 ? passCount / regradedTasks.length : 0,
            totalCost,
            cacheHitRate: regradedTasks.length > 0 ? cacheHits / regradedTasks.length : 0,
          },
        }

        await persistResultAt(regraded, outPath)
        process.stdout.write(`${pc.green('✓')} ${original.runId.slice(0, 8)} → ${outPath}\n`)
      }
    })
}
