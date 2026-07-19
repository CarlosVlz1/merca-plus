import { cn } from '@/lib/cn'

interface AlertProps {
  message: string
  variant?: 'error' | 'success' | 'warning' | 'info'
  className?: string
}

const variantStyles = {
  error:   { container: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30',       text: 'text-red-700 dark:text-red-400',     icon: '⚠️' },
  success: { container: 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30', text: 'text-green-700 dark:text-green-400', icon: '✓' },
  warning: { container: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30', text: 'text-amber-700 dark:text-amber-400', icon: '⚡' },
  info:    { container: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30',     text: 'text-blue-700 dark:text-blue-400',   icon: 'ℹ' },
}

export default function Alert({ message, variant = 'error', className }: AlertProps) {
  const s = variantStyles[variant]
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm',
        s.container,
        className,
      )}
    >
      <span className="mt-px shrink-0 text-base leading-none">{s.icon}</span>
      <p className={cn('font-medium leading-snug', s.text)}>{message}</p>
    </div>
  )
}
