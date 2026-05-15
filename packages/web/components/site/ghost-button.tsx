import Link from 'next/link'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'ghost'

type SharedProps = {
  children: ReactNode
  variant?: Variant
  arrow?: boolean
  className?: string
}

type ButtonProps = SharedProps & Omit<ComponentPropsWithoutRef<'button'>, keyof SharedProps>

type LinkProps = SharedProps & { href: string } & Omit<
    ComponentPropsWithoutRef<typeof Link>,
    keyof SharedProps | 'href'
  >

type Props = ButtonProps | LinkProps

const base =
  'btn-sharp inline-flex items-center gap-2 px-5 py-3 text-sm border transition-colors duration-150 select-none'

const variants: Record<Variant, string> = {
  primary:
    'border-fd-foreground text-fd-foreground hover:bg-fd-foreground hover:text-fd-background',
  ghost: 'border-fd-border text-fd-foreground hover:border-fd-foreground',
}

export function Arrow() {
  return (
    <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
      →
    </span>
  )
}

function isLinkProps(p: Props): p is LinkProps {
  return 'href' in p && typeof p.href === 'string'
}

export function GhostButton(props: Props) {
  const { children, variant = 'ghost', arrow = true, className } = props
  const cls = cn('group', base, variants[variant], className)
  const inner = (
    <>
      <span>{children}</span>
      {arrow ? <Arrow /> : null}
    </>
  )

  if (isLinkProps(props)) {
    const { children: _c, variant: _v, arrow: _a, className: _cn, href, ...rest } = props
    return (
      <Link href={href} className={cls} {...rest}>
        {inner}
      </Link>
    )
  }

  const { children: _c, variant: _v, arrow: _a, className: _cn, ...rest } = props
  return (
    <button type="button" className={cls} {...rest}>
      {inner}
    </button>
  )
}
