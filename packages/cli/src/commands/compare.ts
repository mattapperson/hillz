import { loadResult } from '@hillz/core'
import type { CAC } from 'cac'
import Table from 'cli-table3'

interface CompareOptions {
  format?: 'table' | 'json'
}

export const registerCompareCommand = (cli: CAC): void => {
  cli
    .command('compare <...files>', 'Diff two or more saved RunResult files')
    .option('--format <fmt>', 'table|json', { default: 'table' })
    .action(async (files: string[], opts: CompareOptions) => {
      const results = await Promise.all(files.map(loadResult))
      const format = opts.format ?? 'table'

      if (format === 'json') {
        const payload = results.map((r) => ({
          runId: r.runId,
          evalName: r.evalName,
          aggregate: r.aggregate,
        }))
        process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`)
        return
      }

      const head = ['Result', ...results.map((r) => `${r.evalName}@${r.runId.slice(0, 8)}`)]
      const table = new Table({ head })
      if (results.length === 0) return

      const taskMaps = results.map((r) => {
        const m = new Map<string, (typeof r.tasks)[number]>()
        for (const t of r.tasks) m.set(t.taskId, t)
        return m
      })

      const allTaskIds = new Set<string>()
      for (const m of taskMaps) for (const id of m.keys()) allTaskIds.add(id)
      const sorted = [...allTaskIds].sort()
      for (const id of sorted) {
        const row = [id]
        for (const m of taskMaps) {
          const t = m.get(id)
          row.push(t ? t.meanScore.toFixed(2) : 'n/a')
        }
        table.push(row)
      }
      table.push(['aggregate.mean', ...results.map((r) => r.aggregate.meanScore.toFixed(2))])
      table.push([
        'aggregate.pass',
        ...results.map((r) => `${(r.aggregate.passRate * 100).toFixed(0)}%`),
      ])
      process.stdout.write(`${table.toString()}\n`)
    })
}
