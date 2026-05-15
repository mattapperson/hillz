import 'server-only'
import { createHighlighter, type Highlighter } from 'shiki'
import { SHIKI_THEMES } from './shiki-themes'

export const SHIKI_LANGS = ['typescript', 'tsx', 'bash', 'json', 'markdown', 'yaml'] as const
export type ShikiLang = (typeof SHIKI_LANGS)[number]

let highlighterPromise: Promise<Highlighter> | undefined

export function getHighlighter(): Promise<Highlighter> {
  highlighterPromise ??= createHighlighter({
    themes: Object.values(SHIKI_THEMES),
    langs: [...SHIKI_LANGS],
  })
  return highlighterPromise
}

export async function highlight(code: string, lang: ShikiLang = 'typescript'): Promise<string> {
  const h = await getHighlighter()
  return h.codeToHtml(code, {
    lang,
    themes: SHIKI_THEMES,
    defaultColor: false,
  })
}
