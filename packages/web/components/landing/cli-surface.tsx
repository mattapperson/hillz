import Link from 'next/link'
import { SectionHeader } from '@/components/site/section-header'

const commands = [
  { cmd: 'run', body: 'Discover evals from your project. Execute them. Score, log, and report.' },
  {
    cmd: 'suggest',
    body: 'Draft an eval module for a SKILL.md from an LLM. Optionally scoped by a prompt.',
  },
  {
    cmd: 'enhance',
    body: 'GEPA-style hill-climb a skill against its eval — body, description, references, scripts, and assets.',
  },
  {
    cmd: 'coverage',
    body: 'Show which capabilities your eval set exercises and which gaps remain.',
  },
  { cmd: 'compare', body: 'Diff results across runs, models, or harnesses. Spot regressions.' },
  { cmd: 'grade', body: 'Human-grade ambiguous outputs and feed labels back into the loop.' },
]

export function CliSurface() {
  return (
    <section className="py-24 md:py-32">
      <SectionHeader
        eyebrow="cli"
        title="Six verbs."
        description="One verb per phase. No flags-as-modes, no DSL."
      />
      <dl className="border-t border-fd-border">
        {commands.map((c) => (
          <div
            key={c.cmd}
            className="grid grid-cols-[10rem_1fr] gap-6 py-5 border-b border-fd-border items-baseline"
          >
            <dt className="font-mono text-sm">
              <span aria-hidden className="opacity-40 mr-1">
                $
              </span>
              hillz {c.cmd}
            </dt>
            <dd className="text-fd-muted-foreground">
              {c.body}{' '}
              <Link href={`/docs/cli/${c.cmd}`} className="text-fd-foreground hover:underline">
                docs →
              </Link>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
