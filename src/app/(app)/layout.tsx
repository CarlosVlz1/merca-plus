import { HouseholdProvider } from '@/contexts/household-context'
import AppNav from '@/components/app-nav'
import HouseholdErrorBanner from '@/components/household-error-banner'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <HouseholdProvider>
      <div className="flex min-h-dvh flex-col">
        <AppNav />
        <HouseholdErrorBanner />
        <main className="flex-1 px-4 pt-4 pb-28 max-w-2xl mx-auto w-full">
          {children}
        </main>
      </div>
    </HouseholdProvider>
  )
}
