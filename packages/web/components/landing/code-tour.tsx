import { CodeBlock } from '@/components/code-block'
import { Eyebrow } from '@/components/site/eyebrow'
import { SectionHeader } from '@/components/site/section-header'
import type { ShikiLang } from '@/lib/shiki'

const defineCode = `import { defineEval, score } from '@hillz/core'
import { greeterSkill } from '../skills/greeter'

export default defineEval({
  name: 'greeter/handles-honorific',
  skill: greeterSkill,
  cases: [
    {
      input: { name: 'Dr. Ada Lovelace' },
      expect: { contains: 'Dr.' },
    },
    {
      input: { name: 'Linus' },
      expect: { matches: /^Hello, Linus/ },
    },
  ],
  scorer: score.weighted({
    keywordHit: 0.7,
    toneMatch: score.tone('warm'),
  }),
})
`

const runCode = `import { runEvals } from '@hillz/core'
import { openrouter } from '@hillz/agent/openrouter'

await runEvals({
  models: [
    openrouter('anthropic/claude-3.5-sonnet'),
    openrouter('openai/gpt-4o'),
  ],
  evals: './evals/**/*.eval.ts',
  reporters: ['junit', 'console'],
})
`

const enhanceCode = `# Hill-climb the greeter skill against its eval.
# Default mutates SKILL.md body + description.
hillz enhance greeter --write

# --full also mutates references/, scripts/, and assets/ —
# per the agentskills.io directory layout. One file per iteration,
# reflection prompt tailored to each file's kind.
hillz enhance greeter --full --max-metric-calls 60 --write
`

type Tab = {
  id: string
  label: string
  filename: string
  code: string
  lang: ShikiLang
}

const tabs: Tab[] = [
  {
    id: 'define',
    label: 'Define an eval',
    filename: 'evals/greeter.eval.ts',
    code: defineCode,
    lang: 'typescript',
  },
  {
    id: 'run',
    label: 'Run it',
    filename: 'scripts/run.ts',
    code: runCode,
    lang: 'typescript',
  },
  {
    id: 'enhance',
    label: 'Climb the eval',
    filename: 'terminal',
    code: enhanceCode,
    lang: 'bash',
  },
]

export function CodeTour() {
  return (
    <section className="py-24 md:py-32">
      <SectionHeader
        eyebrow="authoring"
        title="It's just TypeScript."
        description="Define an eval. Run it across models. Climb on the result. No DSL. No YAML."
      />
      <div className="grid gap-12">
        {tabs.map((t, i) => (
          <div key={t.id} className="flex flex-col gap-4">
            <Eyebrow as="div">
              0{i + 1} {t.label}
            </Eyebrow>
            <CodeBlock code={t.code} lang={t.lang} filename={t.filename} />
          </div>
        ))}
      </div>
    </section>
  )
}
