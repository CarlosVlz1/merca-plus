'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/cn'
import { HomeIcon, CartIcon, GridIcon, TrendingIcon, LogOutIcon, Logo, ChartIcon } from './icons'

const navItems = [
  { href: '/dashboard', label: 'Inicio',    Icon: HomeIcon },
  { href: '/list/active', label: 'Lista',   Icon: CartIcon },
  { href: '/catalog', label: 'Catálogo',    Icon: GridIcon },
  { href: '/history', label: 'Historial',   Icon: TrendingIcon },
  { href: '/insights', label: 'Insights',   Icon: ChartIcon },
]

export default function AppNav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* Top header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-100 bg-white/80 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Logo size={28} />
          <span className="text-lg font-bold tracking-tight text-green-600">Merca+</span>
          <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700 uppercase tracking-wide">
            Beta
          </span>
        </div>
        <button
          onClick={handleSignOut}
          aria-label="Cerrar sesión"
          className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          <LogOutIcon size={16} />
          <span className="hidden sm:block">Salir</span>
        </button>
      </header>

      {/* Bottom tab bar */}
      <nav
        aria-label="Navegación principal"
        className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-100 bg-white/90 backdrop-blur-md"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto flex max-w-2xl">
          {navItems.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-1 flex-col items-center gap-1 pt-2 pb-3 text-[11px] font-medium transition-colors',
                  active ? 'text-green-600' : 'text-gray-400 hover:text-gray-600',
                )}
              >
                <span
                  className={cn(
                    'flex items-center justify-center rounded-xl p-1 transition-all',
                    active && 'bg-green-50',
                  )}
                >
                  <Icon
                    size={21}
                    className={cn(
                      'transition-transform duration-150',
                      active && 'scale-105',
                    )}
                  />
                </span>
                {label}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
