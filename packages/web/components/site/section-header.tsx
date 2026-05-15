import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Eyebrow } from './eyebrow'

export function SectionHeader({
  eyebrow,
  title,
  description,
  className,
  ruled = true,
}: {
  eyebrow: string
  title: ReactNode
  description?: ReactNode
  className?: string
  ruled?: boolean
}) {
  return (
    <header
      className={cn(ruled && 'rule-top pt-12', 'flex flex-col gap-3 mb-12 md:mb-16', className)}
    >
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-balance max-w-2xl">
        {title}
      </h2>
      {description ? (
        <p className="text-fd-muted-foreground max-w-2xl text-pretty">{description}</p>
      ) : null}
    </header>
  )
}
