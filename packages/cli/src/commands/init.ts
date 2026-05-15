import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { CAC } from 'cac'
import pc from 'picocolors'

const SKILL_MD = `---
name: example
description: Example skill — replace with your own.
version: '1'
---

You are a helpful assistant.
`

const EVAL_TS = `import { defineEval } from '@hillz/core'
import { react } from '@hillz/agent'

export default defineEval({
  name: 'example',
  skill: 'example',
  flowVersion: '1',
  flow: ({ skill }) =>
    react({
      model: 'openai/gpt-5-nano',
      instructions: skill.body,
      tools: [],
    }),
  tasks: [
    { id: 'greet', input: 'Say hello.' },
  ],
  scorers: ['content-similarity'],
  passThreshold: 0.5,
})
`

const CONFIG_TS = `import { defineConfig } from '@hillz/core'

export default defineConfig({})
`

const ENV_EXAMPLE = `OPENROUTER_API_KEY=
HILLZ_JUDGE_MODEL=openai/gpt-5-nano
`

export const registerInitCommand = (cli: CAC): void => {
  cli
    .command('init [dir]', 'Scaffold a hillz project in the given directory')
    .action(async (dir?: string) => {
      const root = dir ? join(process.cwd(), dir) : process.cwd()
      await mkdir(join(root, 'skills', 'example'), { recursive: true })
      await mkdir(join(root, 'evals'), { recursive: true })
      await mkdir(join(root, 'scorers'), { recursive: true })
      await mkdir(join(root, 'fixtures'), { recursive: true })
      await mkdir(join(root, 'hillz'), { recursive: true })
      await writeFile(join(root, 'skills', 'example', 'SKILL.md'), SKILL_MD, 'utf8')
      await writeFile(join(root, 'evals', 'example.eval.ts'), EVAL_TS, 'utf8')
      await writeFile(join(root, 'hillz.config.ts'), CONFIG_TS, 'utf8')
      await writeFile(join(root, '.env.example'), ENV_EXAMPLE, 'utf8')
      process.stdout.write(`${pc.green('✓')} hillz project scaffolded at ${root}\n`)
    })
}
