import { RootProvider } from 'fumadocs-ui/provider/next'
import { JetBrains_Mono } from 'next/font/google'
import type { ReactNode } from 'react'
import { ContourBg } from '@/components/site/contour-bg'
import { buildMetadata } from '@/lib/metadata'
import './globals.css'

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono-loaded',
  display: 'swap',
  weight: ['400', '500', '700'],
})

export const metadata = buildMetadata()

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={jetbrains.variable}>
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600&display=swap"
        />
      </head>
      <body className="min-h-dvh antialiased">
        <ContourBg />
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  )
}
