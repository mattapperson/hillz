import Link from 'next/link'
import { Eyebrow } from '@/components/site/eyebrow'
import { Footer } from '@/components/site/footer'
import { Nav } from '@/components/site/nav'

export default function NotFound() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[64rem] px-6 md:px-8 py-32 md:py-40">
        <Eyebrow as="div">404 · no candidate accepted</Eyebrow>
        <h1 className="wordmark mt-8 text-6xl md:text-8xl">Off-frontier</h1>
        <p className="mt-8 text-fd-muted-foreground max-w-xl">
          That route isn't on the Pareto frontier yet. Try the{' '}
          <Link href="/" className="text-fd-foreground hover:underline">
            home page
          </Link>{' '}
          or the{' '}
          <Link href="/docs" className="text-fd-foreground hover:underline">
            docs
          </Link>
          .
        </p>
      </main>
      <Footer />
    </>
  )
}
