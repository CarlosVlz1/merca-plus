import { cn } from '@/lib/cn'

interface AlertProps {
  message: string
  variant?: 'error' | 'success' | 'warning' | 'info'
  className?: string
}

const variantStyles = {
  error:   { container: 'bg-red-50 border-red-200',    text: 'text-red-700',    icon: '⚠️' },
  success: { container: 'bg-green-50 border-green-200', text: 'text-green-700',  icon: '✓' },
  warning: { container: 'bg-amber-50 border-amber-200', text: 'text-amber-700',  icon: '⚡' },
  info:    { container: 'bg-blue-50 border-blue-200',   text: 'text-blue-700',   icon: 'ℹ' },
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
