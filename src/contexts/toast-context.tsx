'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { cn } from '@/lib/cn'

type ToastVariant = 'error' | 'success' | 'warning'

interface Toast {
  id: number
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const ICONS: Record<ToastVariant, string> = {
  error: '✕',
  success: '✓',
  warning: '⚠',
}

const STYLES: Record<ToastVariant, string> = {
  error: 'bg-red-600 text-white',
  success: 'bg-green-600 text-white',
  warning: 'bg-amber-500 text-white',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)

  const toast = useCallback((message: string, variant: ToastVariant = 'error') => {
    const id = ++counter.current
    setToasts((prev) => [...prev, { id, message, variant }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [])

  function dismiss(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg text-sm font-medium pointer-events-auto',
              'animate-in fade-in slide-in-from-top-2 duration-200',
              STYLES[t.variant],
            )}
          >
            <span className="shrink-0 font-bold text-base leading-none">{ICONS[t.variant]}</span>
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Cerrar"
              className="shrink-0 opacity-70 hover:opacity-100 transition-opacity ml-1"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return ctx
}
