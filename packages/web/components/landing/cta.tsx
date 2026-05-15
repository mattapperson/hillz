import { GhostButton } from '@/components/site/ghost-button'
import { SectionHeader } from '@/components/site/section-header'

export function Cta() {
  return (
    <section className="py-24 md:py-32">
      <SectionHeader
        eyebrow="next"
        title="Climb your first hill."
        description="The 30-second quick start. Or pull the source on GitHub and shape it."
      />
      <div className="flex flex-wrap items-center gap-3">
        <GhostButton href="/docs/quick-start" variant="primary">
          Quick start
        </GhostButton>
        <GhostButton href="https://github.com/mattapperson/hillz" target="_blank" rel="noreferrer">
          GitHub
        </GhostButton>
      </div>
    </section>
  )
}
