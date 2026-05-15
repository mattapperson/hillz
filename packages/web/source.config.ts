import { defineConfig, defineDocs } from 'fumadocs-mdx/config'
import { SHIKI_THEMES } from './lib/shiki-themes'

export const docs = defineDocs({
  dir: 'content/docs',
})

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: {
      themes: SHIKI_THEMES,
    },
  },
})
