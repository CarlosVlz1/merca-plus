'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Household } from '@/lib/types'

interface HouseholdContextValue {
  household: Household | null
  households: Household[]
  setActiveHousehold: (h: Household) => void
  loading: boolean
}

const HouseholdContext = createContext<HouseholdContextValue | null>(null)

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const [households, setHouseholds] = useState<Household[]>([])
  const [household, setHousehold] = useState<Household | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data } = await supabase.rpc('get_user_households')

      if (data && data.length > 0) {
        const list = data as Household[]
        setHouseholds(list)
        setHousehold(list[0])
      }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <HouseholdContext.Provider
      value={{ household, households, setActiveHousehold: setHousehold, loading }}
    >
      {children}
    </HouseholdContext.Provider>
  )
}

export function useHousehold() {
  const ctx = useContext(HouseholdContext)
  if (!ctx) throw new Error('useHousehold must be used inside HouseholdProvider')
  return ctx
}
