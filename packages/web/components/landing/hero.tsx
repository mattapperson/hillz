import { Eyebrow } from '@/components/site/eyebrow'
import { GhostButton } from '@/components/site/ghost-button'

export function Hero() {
  return (
    <section className="pt-24 md:pt-32 pb-20 md:pb-28">
      <Eyebrow>
        <span>
          powered by{' '}
          <a
            href="https://noetic.tools"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:no-underline"
          >
            noetic
          </a>{' '}
          &amp;{' '}
          <a
            href="https://openrouter.ai/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:no-underline"
          >
            openrouter
          </a>
        </span>
      </Eyebrow>
      <h1 className="wordmark mt-8 text-6xl md:text-8xl lg:text-9xl leading-[0.9]">Hillz</h1>
      <p className="mt-10 text-xl md:text-2xl max-w-2xl text-pretty leading-snug">
        Eval and auto-improve agent skills via hill climbing.
      </p>
      <p className="mt-4 text-fd-muted-foreground max-w-2xl text-pretty">
        Author evals in TypeScript. Auto-discover skills from a folder. Climb toward better prompts
        on a fixed budget — using GEPA-reflective evolution and an autoresearch-style accept/reject
        loop.
      </p>
      <div className="mt-10 flex flex-wrap items-center gap-3">
        <GhostButton href="/docs/quick-start" variant="primary">
          Get started
        </GhostButton>
        <GhostButton href="/docs">Read the docs</GhostButton>
      </div>
      <div className="mt-12 inline-flex items-center gap-3 border border-fd-border px-3 py-2 font-mono text-sm select-all">
        <span aria-hidden className="opacity-60">
          $
        </span>
        <span>npm i -g hillz</span>
      </div>
    </section>
  )
}
