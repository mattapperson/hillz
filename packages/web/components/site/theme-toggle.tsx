'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'

function resolveLabel(mounted: boolean, current: string | undefined): string {
  if (!mounted) return 'theme'
  return current === 'dark' ? 'dark' : 'light'
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const current = mounted ? (theme === 'system' ? resolvedTheme : theme) : undefined
  const next = current === 'dark' ? 'light' : 'dark'

  return (
    <button
      type="button"
      aria-label={`Switch to ${next} theme`}
      onClick={() => setTheme(next)}
      className={cn(
        'eyebrow border border-fd-border px-2 py-1 hover:border-fd-foreground transition-colors',
        className,
      )}
    >
      {resolveLabel(mounted, current)}
    </button>
  )
}
