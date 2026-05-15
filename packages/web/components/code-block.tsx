import { Eyebrow } from '@/components/site/eyebrow'
import { cn } from '@/lib/cn'
import { highlight, type ShikiLang } from '@/lib/shiki'

type Props = {
  code: string
  lang?: ShikiLang
  filename?: string
  className?: string
}

export async function CodeBlock({ code, lang = 'typescript', filename, className }: Props) {
  const html = await highlight(code.trim(), lang)
  return (
    <div className={cn('border border-fd-border bg-fd-card text-sm not-prose', className)}>
      {filename ? (
        <div className="flex items-center justify-between border-b border-fd-border px-4 py-2">
          <Eyebrow>{filename}</Eyebrow>
        </div>
      ) : null}
      <div
        className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed [&_pre]:bg-transparent [&_pre]:p-0 [&_code]:bg-transparent"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Shiki output is HTML
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
