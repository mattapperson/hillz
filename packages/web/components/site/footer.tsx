import Link from 'next/link'
import { Eyebrow } from '@/components/site/eyebrow'

export function Footer() {
  return (
    <footer className="mt-32 border-t border-fd-border">
      <div className="mx-auto max-w-[64rem] px-6 md:px-8 py-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span className="wordmark text-sm">Hillz</span>
          <Eyebrow className="opacity-70">keep what improves</Eyebrow>
        </div>
        <nav className="flex items-center gap-6 text-sm text-fd-muted-foreground">
          <Link href="/docs" className="hover:text-fd-foreground transition-colors">
            Docs
          </Link>
          <Link
            href="https://github.com/mattapperson/hillz"
            className="hover:text-fd-foreground transition-colors"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </Link>
          <Link
            href="https://arxiv.org/abs/2507.19457"
            className="hover:text-fd-foreground transition-colors"
            target="_blank"
            rel="noreferrer"
          >
            GEPA paper
          </Link>
        </nav>
      </div>
    </footer>
  )
}
