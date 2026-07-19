'use client'

import { useTheme } from '@/contexts/theme-context'
import { cn } from '@/lib/cn'
import { MoonIcon, SunIcon } from './icons'

interface ThemeToggleProps {
  className?: string
}

export default function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      aria-pressed={isDark}
      className={cn(
        'flex items-center justify-center rounded-xl p-2 text-muted transition-colors hover:bg-foreground/8 hover:text-foreground',
        className,
      )}
    >
      {isDark ? <SunIcon size={18} /> : <MoonIcon size={18} />}
    </button>
  )
}
