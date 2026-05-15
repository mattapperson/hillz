import type { CAC } from 'cac'
import pc from 'picocolors'
import { loadContext } from '../loader'

interface PruneOptions {
  olderThan?: number
}

export const registerCacheCommand = (cli: CAC): void => {
  cli
    .command('cache:prune', 'Prune cache entries')
    .option('--older-than <days>', 'Days')
    .action(async (opts: PruneOptions) => {
      const ctx = await loadContext(process.cwd())
      const res = await ctx.cache.prune({ olderThanDays: opts.olderThan })
      process.stdout.write(`${pc.green('✓')} pruned ${res.removed} entries\n`)
    })

  cli.command('cache:clear', 'Clear all cache entries').action(async () => {
    const ctx = await loadContext(process.cwd())
    await ctx.cache.clear()
    process.stdout.write(`${pc.green('✓')} cache cleared\n`)
  })

  cli.command('cache:stats', 'Show cache stats').action(async () => {
    const ctx = await loadContext(process.cwd())
    const s = await ctx.cache.stats()
    process.stdout.write(`entries: ${s.entries}\nbytes: ${s.bytes}\n`)
  })
}
