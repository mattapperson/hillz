import { CodeBlock } from '@/components/code-block'
import { GhostButton } from '@/components/site/ghost-button'
import { SectionHeader } from '@/components/site/section-header'

const installCode = `npm i -g hillz`

const evalCode = `import { defineEval, score } from '@hillz/core'

export default defineEval({
  name: 'greets-by-name',
  skill: './skills/greeter',
  cases: [
    { input: { name: 'Ada' }, expect: { contains: 'Ada' } },
    { input: { name: 'Linus' }, expect: { contains: 'Linus' } },
  ],
  scorer: score.containsExpected(),
})
`

const runCode = `# discover skills + evals, run them, score, report
hillz run

# hill-climb the skill against its eval (GEPA-style reflective evolution).
# default mutates SKILL.md body + description; --full also touches
# references/, scripts/, and assets/ — one file per iteration.
hillz enhance greeter --full --write`

export function QuickStart() {
  return (
    <section className="py-24 md:py-32">
      <SectionHeader
        eyebrow="quick-start"
        title="Thirty seconds to first score."
        description="Install the CLI, drop an eval file in your repo, and run."
      />
      <div className="grid gap-6">
        <CodeBlock code={installCode} lang="bash" filename="terminal" />
        <CodeBlock code={evalCode} lang="typescript" filename="evals/greets-by-name.eval.ts" />
        <CodeBlock code={runCode} lang="bash" filename="terminal" />
      </div>
      <div className="mt-10">
        <GhostButton href="/docs/quick-start">Full quick start</GhostButton>
      </div>
    </section>
  )
}
