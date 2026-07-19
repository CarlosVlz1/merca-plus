import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import ServiceWorkerRegister from '@/components/service-worker-register'
import IOSInstallBanner from '@/components/ios-install-banner'
import AndroidInstallBanner from '@/components/android-install-banner'
import { ToastProvider } from '@/contexts/toast-context'
import { ThemeProvider } from '@/contexts/theme-context'
import { THEME_STORAGE_KEY } from '@/lib/theme'

const geist = Geist({
  variable: '--font-geist',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: { default: 'Merca+', template: '%s | Merca+' },
  description: 'Organiza las compras de tu hogar de forma simple y colaborativa.',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Merca+' },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F8F5' },
    { media: '(prefers-color-scheme: dark)', color: '#0E1210' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

// Se ejecuta de forma sincrónica antes del primer paint para fijar
// data-theme según la preferencia guardada (o el sistema) y evitar el
// parpadeo entre el tema claro por defecto del servidor y el elegido por
// el usuario. Ver: node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md
const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={geist.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <ThemeProvider>
          <ServiceWorkerRegister />
          <IOSInstallBanner />
          <AndroidInstallBanner />
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
