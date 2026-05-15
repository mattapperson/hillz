import Link from 'next/link'
import { ThemeToggle } from './theme-toggle'

export function Nav() {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-fd-background/70 border-b border-fd-border">
      <div className="mx-auto max-w-[64rem] px-6 md:px-8 h-14 flex items-center justify-between">
        <Link href="/" className="wordmark text-lg tracking-[0.05em] hover:opacity-80">
          Hillz
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link
            href="/docs"
            className="text-fd-muted-foreground hover:text-fd-foreground transition-colors"
          >
            Docs
          </Link>
          <Link
            href="https://github.com/mattapperson/hillz"
            className="text-fd-muted-foreground hover:text-fd-foreground transition-colors"
            target="_blank"
            rel="noreferrer"
          >
            GitHub <span aria-hidden>↗</span>
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
