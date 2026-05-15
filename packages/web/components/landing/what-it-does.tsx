import { Eyebrow } from '@/components/site/eyebrow'
import { SectionHeader } from '@/components/site/section-header'

const points = [
  {
    label: 'author',
    body: 'Evals and tasks are TypeScript modules. Full type safety, autocomplete, reusable factories.',
  },
  {
    label: 'discover',
    body: 'Point Hillz at a folder. Skills (agentskills.io format) and evals load automatically.',
  },
  {
    label: 'climb',
    body: 'A fixed budget. One edit per iteration. Keep what improves the score. Drop what doesn’t.',
  },
]

export function WhatItDoes() {
  return (
    <section className="py-24 md:py-32">
      <SectionHeader
        eyebrow="overview"
        title="Three primitives. One loop."
        description="Hillz is small on purpose. The harness measures, the loop improves, and the rest is your code."
      />
      <ol className="grid gap-12 md:grid-cols-3 list-none">
        {points.map((p, i) => (
          <li key={p.label} className="flex flex-col gap-3">
            <Eyebrow as="div">
              {String(i + 1).padStart(2, '0')} {p.label}
            </Eyebrow>
            <p className="text-lg leading-snug text-balance">{p.body}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
