import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Eyebrow({
  children,
  className,
  as: As = 'span',
}: {
  children: ReactNode
  className?: string
  as?: 'span' | 'div' | 'p'
}) {
  return (
    <As className={cn('eyebrow inline-flex items-center', className)}>
      <span aria-hidden className="opacity-60 mr-2">
        {'//'}
      </span>
      {children}
    </As>
  )
}
