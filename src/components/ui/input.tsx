import { InputHTMLAttributes, forwardRef, useState } from 'react'
import { cn } from '@/lib/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  startIcon?: React.ReactNode
}

const EyeIcon = ({ open }: { open: boolean }) =>
  open ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  )

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, startIcon, className, id, type, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    const isPassword = type === 'password'
    const [showPassword, setShowPassword] = useState(false)

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-semibold text-foreground">
            {label}
          </label>
        )}
        <div className="relative">
          {startIcon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
              {startIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            type={isPassword && showPassword ? 'text' : type}
            className={cn(
              'w-full rounded-xl border bg-surface py-2.5 text-sm text-foreground',
              'placeholder:text-muted shadow-sm',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand',
              'disabled:bg-foreground/5 disabled:text-muted',
              startIcon ? 'pl-9' : 'pl-3',
              isPassword ? 'pr-10' : 'pr-3',
              error
                ? 'border-red-400 dark:border-red-500/60 focus:border-red-400 focus:ring-red-400/20'
                : 'border-border-strong',
              className,
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
            >
              <EyeIcon open={showPassword} />
            </button>
          )}
        </div>
        {hint && !error && <p className="text-xs text-muted">{hint}</p>}
        {error && <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>}
      </div>
    )
  },
)
Input.displayName = 'Input'

export default Input
