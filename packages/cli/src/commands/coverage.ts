import type { CAC } from 'cac'
import Table from 'cli-table3'
import type { LoadedContext } from '../loader'
import { loadContext } from '../loader'

interface CoverageOptions {
  format?: 'text' | 'markdown' | 'json'
}

interface CoverageRow {
  skill: string
  evalCount: number
  taskCount: number
  scorerKinds: number
  tier: 'none' | 'partial' | 'full'
}

const computeRows = (ctx: LoadedContext): CoverageRow[] => {
  const evalsBySkill = new Map<string, LoadedContext['evals']>()
  for (const e of ctx.evals) {
    const list = evalsBySkill.get(e.skill) ?? []
    list.push(e)
    evalsBySkill.set(e.skill, list)
  }

  const rows: CoverageRow[] = []
  for (const skill of ctx.skills.values()) {
    const skillEvals = evalsBySkill.get(skill.name) ?? []
    const taskCount = skillEvals.reduce((a, e) => a + e.tasks.length, 0)
    const scorerNames = new Set<string>()
    for (const e of skillEvals) {
      for (const ref of e.scorers) {
        scorerNames.add(typeof ref === 'string' ? ref : ref.name)
      }
    }
    const tier: CoverageRow['tier'] =
      skillEvals.length === 0
        ? 'none'
        : scorerNames.size >= 2 && taskCount >= 2
          ? 'full'
          : 'partial'
    rows.push({
      skill: skill.name,
      evalCount: skillEvals.length,
      taskCount,
      scorerKinds: scorerNames.size,
      tier,
    })
  }
  return rows
}

export const registerCoverageCommand = (cli: CAC): void => {
  cli
    .command('coverage', 'Report skill ↔ eval coverage')
    .option('--format <fmt>', 'text|markdown|json', { default: 'text' })
    .action(async (opts: CoverageOptions) => {
      const ctx = await loadContext(process.cwd())
      const rows = computeRows(ctx)
      const format = opts.format ?? 'text'

      if (format === 'json') {
        process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`)
        return
      }

      if (format === 'markdown') {
        process.stdout.write('| Skill | Evals | Tasks | Scorer kinds | Tier |\n')
        process.stdout.write('| --- | ---: | ---: | ---: | --- |\n')
        for (const r of rows) {
          process.stdout.write(
            `| ${r.skill} | ${r.evalCount} | ${r.taskCount} | ${r.scorerKinds} | ${r.tier} |\n`,
          )
        }
        return
      }

      const table = new Table({ head: ['Skill', 'Evals', 'Tasks', 'Scorer kinds', 'Tier'] })
      for (const r of rows) {
        table.push([
          r.skill,
          String(r.evalCount),
          String(r.taskCount),
          String(r.scorerKinds),
          r.tier,
        ])
      }
      process.stdout.write(`${table.toString()}\n`)
    })
}
