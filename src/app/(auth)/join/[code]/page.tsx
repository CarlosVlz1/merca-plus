'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/button'
import Alert from '@/components/ui/alert'

export default function JoinPage() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [authed, setAuthed] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAuthed(!!data.user)
    })
  }, [])

  async function handleJoin() {
    setError('')
    setLoading(true)
    try {
      const { error: rpcError } = await supabase.rpc('redeem_household_invite', {
        invite_code: code,
      })
      if (rpcError) {
        if (rpcError.message.includes('invite_invalid_or_expired')) {
          setError('Este enlace ya no es válido. Pide uno nuevo.')
        } else {
          setError('No se pudo unir al hogar. Intenta de nuevo.')
        }
        return
      }
      router.push('/dashboard')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  if (authed === null) return null

  if (!authed) {
    return (
      <div className="rounded-2xl bg-surface p-8 shadow-sm border border-border text-center">
        <h2 className="text-lg font-semibold mb-2">Fuiste invitado a un hogar</h2>
        <p className="text-sm text-muted mb-6">
          Crea una cuenta o inicia sesión para unirte.
        </p>
        <Button
          onClick={() => router.push(`/login?next=/join/${code}`)}
          className="w-full"
        >
          Iniciar sesión o registrarse
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-surface p-8 shadow-sm border border-border text-center">
      <h2 className="text-lg font-semibold mb-2">Unirte a un hogar</h2>
      <p className="text-sm text-muted mb-2">
        Código: <span className="font-mono font-bold">{code}</span>
      </p>
      {error && <Alert message={error} />}
      <Button onClick={handleJoin} loading={loading} className="w-full mt-4">
        Unirse al hogar
      </Button>
    </div>
  )
}
