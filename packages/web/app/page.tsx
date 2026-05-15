import { CliSurface } from '@/components/landing/cli-surface'
import { ClimbChart } from '@/components/landing/climb-chart'
import { CodeTour } from '@/components/landing/code-tour'
import { Cta } from '@/components/landing/cta'
import { Hero } from '@/components/landing/hero'
import { KeyFeatures } from '@/components/landing/key-features'
import { QuickStart } from '@/components/landing/quick-start'
import { WhatItDoes } from '@/components/landing/what-it-does'
import { Footer } from '@/components/site/footer'
import { Nav } from '@/components/site/nav'

export default function HomePage() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[64rem] px-6 md:px-8">
        <Hero />
        <WhatItDoes />
        <QuickStart />
        <KeyFeatures />
        <ClimbChart />
        <CodeTour />
        <CliSurface />
        <Cta />
      </main>
      <Footer />
    </>
  )
}
