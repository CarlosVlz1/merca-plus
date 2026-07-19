'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useHousehold } from '@/contexts/household-context'
import { createClient } from '@/lib/supabase/client'
import { householdSchema } from '@/lib/validation/schemas'
import Button from '@/components/ui/button'
import Input from '@/components/ui/input'
import Alert from '@/components/ui/alert'
import { PageSpinner } from '@/components/ui/spinner'
import { CartIcon, GridIcon, TrendingIcon, LinkIcon, CopyIcon, UserPlusIcon } from '@/components/icons'

function generateInviteCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function DashboardPage() {
  const { household, loading } = useHousehold()
  const [householdName, setHouseholdName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleCreateHousehold(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const result = householdSchema.safeParse({ name: householdName })
    if (!result.success) { setError(result.error.issues[0].message); return }
    setCreating(true)
    try {
      const { data: newId, error: rpcError } = await supabase.rpc('create_household', { household_name: householdName })
      if (rpcError) {
        setError(`Error: ${rpcError.message}`)
        return
      }
      if (!newId) {
        setError('El hogar no pudo crearse. Intenta de nuevo.')
        return
      }
      window.location.href = '/dashboard'
    } finally {
      setCreating(false)
    }
  }

  async function handleCreateInvite() {
    if (!household) return
    setInviteLoading(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const code = generateInviteCode()
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      const { error: insertError } = await supabase.from('household_invites').insert({
        household_id: household.id,
        code,
        created_by_user_id: user.id,
        expires_at: expiresAt,
      })
      if (insertError) { setError('No se pudo generar el enlace.'); return }
      setInviteLink(`${window.location.origin}/join/${code}`)
    } finally {
      setInviteLoading(false)
    }
  }

  async function copyInviteLink() {
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <PageSpinner />

  if (!household) {
    return (
      <div className="flex flex-col gap-6 py-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-brand text-3xl shadow-md shadow-brand/20">
            🏠
          </div>
          <h1 className="text-xl font-bold text-foreground">Crea tu hogar</h1>
          <p className="mt-1 text-sm text-muted max-w-xs mx-auto">
            Organiza las compras de tu familia en un solo lugar.
          </p>
        </div>

        <div className="rounded-2xl bg-surface p-6 shadow-sm border border-border">
          <form onSubmit={handleCreateHousehold} className="flex flex-col gap-4">
            {error && <Alert message={error} />}
            <Input
              label="Nombre del hogar"
              value={householdName}
              onChange={(e) => setHouseholdName(e.target.value)}
              placeholder="Ej: Casa Martínez"
              required
            />
            <Button type="submit" loading={creating} size="lg" className="w-full">
              Crear hogar
            </Button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 py-4">
      {/* Household card */}
      <div className="rounded-2xl bg-linear-to-br from-brand to-brand-dark p-5 text-white shadow-lg shadow-brand/20">
        <p className="text-xs font-medium text-white/70 uppercase tracking-wide">Tu hogar</p>
        <h1 className="mt-1 text-2xl font-bold">{household.name}</h1>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        <Link
          href="/list/active"
          className="flex flex-col items-center gap-2 rounded-2xl bg-surface border border-border p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand-light dark:bg-brand/15 text-brand">
            <CartIcon size={20} />
          </span>
          <span className="text-xs font-semibold text-center text-foreground">Lista activa</span>
        </Link>

        <Link
          href="/catalog"
          className="flex flex-col items-center gap-2 rounded-2xl bg-surface border border-border p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400">
            <GridIcon size={20} />
          </span>
          <span className="text-xs font-semibold text-center text-foreground">Catálogo</span>
        </Link>

        <Link
          href="/history"
          className="flex flex-col items-center gap-2 rounded-2xl bg-surface border border-border p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <TrendingIcon size={20} />
          </span>
          <span className="text-xs font-semibold text-center text-foreground">Precios</span>
        </Link>
      </div>

      {/* Invite members */}
      <div className="rounded-2xl bg-surface p-5 shadow-sm border border-border">
        <div className="flex items-center gap-3 mb-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-500/15">
            <UserPlusIcon size={18} className="text-purple-600 dark:text-purple-400" />
          </span>
          <div>
            <h2 className="font-semibold text-foreground">Invitar miembros</h2>
            <p className="text-xs text-muted">Enlace válido por 7 días</p>
          </div>
        </div>

        {error && <Alert message={error} className="mb-3" />}

        {inviteLink ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-border-strong bg-foreground/[0.03] px-3 py-2">
              <LinkIcon size={14} className="shrink-0 text-muted" />
              <span className="flex-1 truncate font-mono text-xs text-muted">{inviteLink}</span>
            </div>
            <Button
              variant={copied ? 'secondary' : 'primary'}
              onClick={copyInviteLink}
              className="w-full"
            >
              <CopyIcon size={15} />
              {copied ? '¡Copiado!' : 'Copiar enlace'}
            </Button>
          </div>
        ) : (
          <Button
            variant="secondary"
            loading={inviteLoading}
            onClick={handleCreateInvite}
            className="w-full"
          >
            Generar enlace de invitación
          </Button>
        )}
      </div>
    </div>
  )
}
