import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import type { ReactNode } from 'react'
import { source } from '@/lib/source'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{
        title: <span className="wordmark text-base">Hillz</span>,
        url: '/',
      }}
      links={[
        { text: 'Home', url: '/' },
        { text: 'GitHub', url: 'https://github.com/mattapperson/hillz', external: true },
      ]}
    >
      {children}
    </DocsLayout>
  )
}
