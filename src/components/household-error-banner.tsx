'use client'

import { useHousehold } from '@/contexts/household-context'
import Alert from '@/components/ui/alert'

export default function HouseholdErrorBanner() {
  const { error } = useHousehold()
  if (!error) return null
  return (
    <div className="px-4 pt-3">
      <Alert message={error} variant="error" />
    </div>
  )
}
