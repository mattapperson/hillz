#!/usr/bin/env bun
import { cac } from 'cac'
import pkg from '../package.json' with { type: 'json' }
import { registerCacheCommand } from './commands/cache'
import { registerCheckCommand } from './commands/check'
import { registerCompareCommand } from './commands/compare'
import { registerCoverageCommand } from './commands/coverage'
import { registerEnhanceCommand } from './commands/enhance'
import { registerGradeCommand } from './commands/grade'
import { registerInitCommand } from './commands/init'
import { registerRunCommand } from './commands/run'
import { registerSuggestCommand } from './commands/suggest'

const cli = cac('hillz')

registerInitCommand(cli)
registerRunCommand(cli)
registerSuggestCommand(cli)
registerEnhanceCommand(cli)
registerCoverageCommand(cli)
registerCompareCommand(cli)
registerGradeCommand(cli)
registerCheckCommand(cli)
registerCacheCommand(cli)

cli.help()
cli.version(pkg.version)

if (process.argv.length <= 2) {
  cli.outputHelp()
} else {
  cli.parse()
}
