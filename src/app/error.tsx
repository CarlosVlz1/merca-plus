'use client'

import { useEffect } from 'react'
import Button from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 text-center">
      <div className="text-5xl mb-4">⚠️</div>
      <h1 className="text-xl font-bold text-foreground mb-2">Algo salió mal</h1>
      <p className="text-sm text-muted mb-6 max-w-xs">
        Ocurrió un error inesperado. Puedes intentar de nuevo o volver al inicio.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset} variant="primary">
          Intentar de nuevo
        </Button>
        <Button onClick={() => (window.location.href = '/dashboard')} variant="ghost">
          Ir al inicio
        </Button>
      </div>
      {error.digest && (
        <p className="mt-6 text-xs text-muted font-mono">ID: {error.digest}</p>
      )}
    </div>
  )
}
