export type MemberRole = 'OWNER' | 'MEMBER'
export type ListStatus = 'ACTIVE' | 'CLOSED'

export interface Household {
  id: string
  name: string
  created_at: string
}

export interface HouseholdMember {
  id: string
  household_id: string
  user_id: string
  role: MemberRole
  joined_at: string
}

export interface HouseholdInvite {
  id: string
  household_id: string
  code: string
  created_by_user_id: string
  expires_at: string
  used_by_user_id: string | null
  used_at: string | null
  created_at: string
}

export interface Item {
  id: string
  household_id: string
  name: string
  category: string
  unit: string | null
  last_price: number | null
  created_at: string
}

export interface ShoppingList {
  id: string
  household_id: string
  status: ListStatus
  created_at: string
  closed_at: string | null
}

export interface ShoppingListItem {
  id: string
  list_id: string
  item_id: string
  quantity: number
  price: number | null
  checked: boolean
  added_by_user_id: string
  checked_by_user_id: string | null
  created_at: string
}

export interface PriceHistory {
  id: string
  item_id: string
  price: number
  recorded_at: string
}

export interface ShoppingListItemWithDetails extends ShoppingListItem {
  item: Item
}
