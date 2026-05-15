import type { Metadata } from 'next'

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hillz.dev'
export const SITE_NAME = 'Hillz'
export const SITE_DESCRIPTION =
  'Eval and auto-improve agent skills via hill climbing. GEPA-reflective evolution and autoresearch-inspired iteration, authored in TypeScript.'

export const BUILD_TIME = new Date()

export function buildMetadata(overrides?: Partial<Metadata>): Metadata {
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${SITE_NAME} — Hill-climbing eval harness for agent skills`,
      template: `%s · ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    openGraph: {
      type: 'website',
      url: SITE_URL,
      siteName: SITE_NAME,
      title: `${SITE_NAME} — Hill-climbing eval harness for agent skills`,
      description: SITE_DESCRIPTION,
    },
    twitter: {
      card: 'summary_large_image',
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
    },
    ...overrides,
  }
}
