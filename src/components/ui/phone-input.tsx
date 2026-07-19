import { cn } from '@/lib/cn'

export const DIAL_CODES = [
  { code: '+57',  flag: '🇨🇴', name: 'Colombia' },
  { code: '+52',  flag: '🇲🇽', name: 'México' },
  { code: '+54',  flag: '🇦🇷', name: 'Argentina' },
  { code: '+56',  flag: '🇨🇱', name: 'Chile' },
  { code: '+51',  flag: '🇵🇪', name: 'Perú' },
  { code: '+58',  flag: '🇻🇪', name: 'Venezuela' },
  { code: '+593', flag: '🇪🇨', name: 'Ecuador' },
  { code: '+591', flag: '🇧🇴', name: 'Bolivia' },
  { code: '+595', flag: '🇵🇾', name: 'Paraguay' },
  { code: '+598', flag: '🇺🇾', name: 'Uruguay' },
  { code: '+55',  flag: '🇧🇷', name: 'Brasil' },
  { code: '+507', flag: '🇵🇦', name: 'Panamá' },
  { code: '+506', flag: '🇨🇷', name: 'Costa Rica' },
  { code: '+502', flag: '🇬🇹', name: 'Guatemala' },
  { code: '+504', flag: '🇭🇳', name: 'Honduras' },
  { code: '+503', flag: '🇸🇻', name: 'El Salvador' },
  { code: '+505', flag: '🇳🇮', name: 'Nicaragua' },
  { code: '+53',  flag: '🇨🇺', name: 'Cuba' },
  { code: '+1',   flag: '🇺🇸', name: 'Estados Unidos' },
  { code: '+1',   flag: '🇨🇦', name: 'Canadá' },
  { code: '+34',  flag: '🇪🇸', name: 'España' },
]

interface PhoneInputProps {
  dialCode: string
  number: string
  onDialCodeChange: (code: string) => void
  onNumberChange: (number: string) => void
  error?: string
  hint?: string
}

export default function PhoneInput({
  dialCode,
  number,
  onDialCodeChange,
  onNumberChange,
  error,
  hint,
}: PhoneInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-foreground">
        Teléfono
        <span className="ml-1 text-xs font-normal text-muted">(opcional)</span>
      </label>
      <div
        className={cn(
          'flex overflow-hidden rounded-xl border bg-surface shadow-sm transition-colors',
          'focus-within:ring-2 focus-within:ring-brand/25 focus-within:border-brand',
          error ? 'border-red-400 dark:border-red-500/60' : 'border-border-strong',
        )}
      >
        {/* Dial code selector */}
        <div className="relative flex shrink-0 items-center border-r border-border-strong">
          <select
            value={dialCode}
            onChange={(e) => onDialCodeChange(e.target.value)}
            aria-label="Código de país"
            className="h-full appearance-none bg-transparent py-2.5 pl-3 pr-7 text-sm text-foreground focus:outline-none cursor-pointer"
          >
            {DIAL_CODES.map((d, i) => (
              <option key={`${d.code}-${i}`} value={d.code} title={d.name}>
                {d.flag} {d.code}
              </option>
            ))}
          </select>
          {/* Chevron */}
          <span className="pointer-events-none absolute right-1.5 text-muted">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </div>

        {/* Number input */}
        <input
          type="tel"
          inputMode="numeric"
          placeholder="300 123 4567"
          value={number}
          onChange={(e) => onNumberChange(e.target.value.replace(/[^0-9\s]/g, ''))}
          autoComplete="tel-national"
          className="flex-1 min-w-0 bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none"
        />
      </div>
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>}
    </div>
  )
}
