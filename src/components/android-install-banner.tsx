'use client'

import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function AndroidInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const dismissed = sessionStorage.getItem('android-banner-dismissed')
    if (dismissed) return

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true)

    if (isStandalone) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShow(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted' || outcome === 'dismissed') {
      setShow(false)
      setDeferredPrompt(null)
    }
  }

  function dismiss() {
    sessionStorage.setItem('android-banner-dismissed', '1')
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="rounded-2xl bg-surface border border-border shadow-xl p-4 flex gap-3 items-start">
        <div className="text-2xl shrink-0 mt-0.5">📲</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Instala Merca+</p>
          <p className="text-xs text-muted mt-0.5 leading-relaxed">
            Agrégala a tu pantalla de inicio para acceder más rápido.
          </p>
          <button
            onClick={handleInstall}
            className="mt-2.5 rounded-xl bg-brand px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark transition-colors"
          >
            Instalar
          </button>
        </div>
        <button
          onClick={dismiss}
          aria-label="Cerrar"
          className="shrink-0 text-muted hover:text-foreground transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  )
}
