'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { signUpSchema, signInSchema } from '@/lib/validation/schemas'
import Button from '@/components/ui/button'
import Input from '@/components/ui/input'
import Alert from '@/components/ui/alert'
import { cn } from '@/lib/cn'
import { Logo } from '@/components/icons'

const PASSWORD_RULES = [
  { label: 'Mínimo 8 caracteres', test: (p: string) => p.length >= 8 },
  { label: 'Al menos una mayúscula', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Al menos un número', test: (p: string) => /[0-9]/.test(p) },
]

function PasswordChecklist({ password }: { password: string }) {
  if (!password) return null
  return (
    <ul className="flex flex-col gap-1 mt-1">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password)
        return (
          <li key={rule.label} className={cn('flex items-center gap-1.5 text-xs', ok ? 'text-green-600' : 'text-gray-400')}>
            <span className="shrink-0">{ok ? '✓' : '○'}</span>
            {rule.label}
          </li>
        )
      })}
    </ul>
  )
}

type Mode = 'login' | 'register'

function mapAuthError(code: string | undefined): string {
  if (code === 'user_already_exists' || code === 'email_address_already_authorized') {
    return 'Ese correo ya tiene una cuenta. Intenta iniciar sesión.'
  }
  if (code === 'invalid_credentials' || code === 'email_not_confirmed') {
    return 'Correo o contraseña incorrectos.'
  }
  return 'No se pudo completar la acción. Intenta de nuevo.'
}

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [mode, setMode] = useState<Mode>('login')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [registered, setRegistered] = useState(false)

  function switchMode() {
    setMode((m) => (m === 'login' ? 'register' : 'login'))
    setError('')
    setRegistered(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setRegistered(false)

    if (mode === 'login') {
      const result = signInSchema.safeParse({ email, password })
      if (!result.success) {
        setError(result.error.issues[0].message)
        return
      }
      setLoading(true)
      try {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
        if (authError) { setError(mapAuthError(authError.code)); return }
        router.push('/dashboard')
        router.refresh()
      } finally {
        setLoading(false)
      }
    } else {
      const result = signUpSchema.safeParse({ fullName, phone, email, password, confirmPassword })
      if (!result.success) {
        setError(result.error.issues[0].message)
        return
      }
      setLoading(true)
      try {
        const origin = typeof window !== 'undefined' ? window.location.origin : ''
        const { error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${origin}/auth/callback`,
            data: {
              full_name: fullName.trim(),
              phone: phone.trim() || null,
            },
          },
        })
        if (authError) { setError(mapAuthError(authError.code)); return }
        setRegistered(true)
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Logo */}
      <div className="text-center">
        <div className="flex justify-center mb-4 drop-shadow-lg drop-shadow-green-600/30">
          <Logo size={64} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Merca+</h1>
        <p className="mt-1 text-sm text-gray-500">
          {mode === 'login' ? 'Bienvenido de vuelta' : 'Crea tu cuenta gratis'}
        </p>
      </div>

      {/* Card */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        {registered ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <span className="text-4xl">📬</span>
            <div>
              <p className="font-semibold text-gray-800">¡Revisa tu correo!</p>
              <p className="mt-1 text-sm text-gray-500">
                Enviamos un enlace de confirmación a <span className="font-medium">{email}</span>.
                Confirma tu cuenta para ingresar.
              </p>
            </div>
            <Button variant="ghost" onClick={switchMode} className="text-sm">
              ← Volver al inicio de sesión
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <h2 className="font-semibold text-gray-800">
              {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </h2>

            {error && <Alert message={error} />}

            {mode === 'register' && (
              <>
                <Input
                  label="Nombre completo"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ana García"
                  autoComplete="name"
                  required
                />
                <Input
                  label="Teléfono"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+57 300 123 4567"
                  autoComplete="tel"
                  hint="Opcional"
                />
              </>
            )}

            <Input
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              autoComplete="email"
              required
            />
            <div>
              <Input
                label="Contraseña"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
              />
              {mode === 'register' && <PasswordChecklist password={password} />}
            </div>

            {mode === 'register' && (
              <Input
                label="Confirmar contraseña"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
            )}

            <Button type="submit" loading={loading} size="lg" className="w-full mt-1">
              {mode === 'login' ? 'Ingresar' : 'Crear cuenta'}
            </Button>
          </form>
        )}
      </div>

      {!registered && (
        <p className="text-center text-sm text-gray-500">
          {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
          <button
            type="button"
            onClick={switchMode}
            className="font-semibold text-green-600 hover:underline"
          >
            {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
          </button>
        </p>
      )}
    </div>
  )
}
