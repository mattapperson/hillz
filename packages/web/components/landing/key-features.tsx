import Link from 'next/link'
import { Arrow } from '@/components/site/ghost-button'
import { SectionHeader } from '@/components/site/section-header'

const features = [
  {
    title: 'Typed evals',
    body: 'Evals are TypeScript. Refactor an input shape and the compiler tells you which cases broke.',
    href: '/docs/concepts/evals-and-tasks',
  },
  {
    title: 'Skill auto-discovery',
    body: 'Drop SKILL.md folders anywhere. Hillz resolves agentskills.io format with progressive disclosure.',
    href: '/docs/concepts/skills',
  },
  {
    title: 'GEPA reflective evolution',
    body: 'Reflect on execution traces in natural language. Mutate prompts. Keep a Pareto frontier.',
    href: '/docs/concepts/gepa',
  },
  {
    title: 'Autoresearch hill-climb',
    body: 'One file edited per iteration. Fixed time budget per step. Accept on metric, reject otherwise.',
    href: '/docs/concepts/autoresearch',
  },
  {
    title: 'Pareto frontier tracking',
    body: 'Never collapse to a single best. Keep cost-vs-score trade-offs explicit. Compare frontiers across runs.',
    href: '/docs/cli/compare',
  },
  {
    title: 'Multi-model compare',
    body: 'Score the same eval set across models and harnesses. Surface what generalizes, what overfits.',
    href: '/docs/cli/compare',
  },
]

export function KeyFeatures() {
  return (
    <section className="py-24 md:py-32">
      <SectionHeader
        eyebrow="features"
        title="What Hillz does well."
        description="Six things, each replaceable. None decorative."
      />
      <ul className="grid gap-px bg-fd-border border border-fd-border md:grid-cols-2 lg:grid-cols-3 list-none">
        {features.map((f) => (
          <li key={f.title} className="bg-fd-background p-6 flex flex-col gap-3 group">
            <h3 className="text-lg font-medium">{f.title}</h3>
            <p className="text-fd-muted-foreground text-sm leading-relaxed">{f.body}</p>
            <Link
              href={f.href}
              className="group mt-2 text-sm inline-flex items-center gap-1 hover:underline"
            >
              Read more
              <Arrow />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
