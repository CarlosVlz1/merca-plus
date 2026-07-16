import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  startIcon?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, startIcon, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-semibold text-gray-700">
            {label}
          </label>
        )}
        <div className="relative">
          {startIcon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {startIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full rounded-xl border bg-white py-2.5 text-sm text-gray-900',
              'placeholder:text-gray-400 shadow-sm',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-green-500/25 focus:border-green-500',
              'disabled:bg-gray-50 disabled:text-gray-400',
              startIcon ? 'pl-9 pr-3' : 'px-3',
              error
                ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
                : 'border-gray-200',
              className,
            )}
            {...props}
          />
        </div>
        {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
      </div>
    )
  },
)
Input.displayName = 'Input'

export default Input
