import type { MetadataRoute } from 'next'
import { BUILD_TIME, SITE_URL } from '@/lib/metadata'
import { source } from '@/lib/source'

export default function sitemap(): MetadataRoute.Sitemap {
  const docs = source.getPages().map((p) => ({
    url: `${SITE_URL}${p.url}`,
    lastModified: BUILD_TIME,
  }))
  return [{ url: SITE_URL, lastModified: BUILD_TIME }, ...docs]
}
