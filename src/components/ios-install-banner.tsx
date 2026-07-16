'use client'

import { useState, useEffect } from 'react'

export default function IOSInstallBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const dismissed = sessionStorage.getItem('ios-banner-dismissed')

    if (isIOS && !isStandalone && !dismissed) {
      setShow(true)
    }
  }, [])

  function dismiss() {
    sessionStorage.setItem('ios-banner-dismissed', '1')
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="rounded-2xl bg-white border border-gray-100 shadow-xl p-4 flex gap-3">
        <div className="text-2xl shrink-0 mt-0.5">📲</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">Instala Merca+</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
            Toca{' '}
            <span className="inline-flex items-center gap-0.5 font-medium text-gray-700">
              <ShareIcon />
              Compartir
            </span>{' '}
            y luego{' '}
            <span className="font-medium text-gray-700">"Agregar a pantalla de inicio"</span>
          </p>
        </div>
        <button
          onClick={dismiss}
          aria-label="Cerrar"
          className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors self-start"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      {/* Flecha apuntando hacia abajo hacia la barra de Safari */}
      <div className="flex justify-center mt-1">
        <svg width="20" height="10" viewBox="0 0 20 10" fill="white" stroke="#e5e7eb" strokeWidth="1">
          <path d="M0 0 L10 10 L20 0Z" />
        </svg>
      </div>
    </div>
  )
}

function ShareIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  )
}
