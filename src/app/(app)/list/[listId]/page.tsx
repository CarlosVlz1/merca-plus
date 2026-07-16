'use client'

import { useState, useEffect, useCallback } from 'react'
import { useHousehold } from '@/contexts/household-context'
import { createClient } from '@/lib/supabase/client'
import { formatListForWhatsApp } from '@/lib/whatsapp/format-list'
import type { Item, ShoppingList, ShoppingListItem } from '@/lib/types'
import Button from '@/components/ui/button'
import Alert from '@/components/ui/alert'

interface ListItemWithDetails extends ShoppingListItem {
  item: Item
}

type PageState = 'loading' | 'error' | 'ready'

function groupByCategory(items: ListItemWithDetails[]) {
  return items.reduce<Record<string, ListItemWithDetails[]>>((acc, li) => {
    const cat = li.item.category
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(li)
    return acc
  }, {})
}

export default function ListPage() {
  const { household } = useHousehold()
  const supabase = createClient()
  const [state, setState] = useState<PageState>('loading')
  const [list, setList] = useState<ShoppingList | null>(null)
  const [listItems, setListItems] = useState<ListItemWithDetails[]>([])
  const [catalogItems, setCatalogItems] = useState<Item[]>([])
  const [errorMsg, setErrorMsg] = useState('')
  const [copied, setCopied] = useState(false)
  const [addingItem, setAddingItem] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState('')

  const loadOrCreateList = useCallback(async () => {
    if (!household) return
    setState('loading')
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      let activeListData: ShoppingList | null = null

      const { data: foundList, error: listErr } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('household_id', household.id)
        .eq('status', 'ACTIVE')
        .maybeSingle()

      if (listErr) throw listErr

      if (!foundList) {
        const { data: newList, error: createError } = await supabase
          .from('shopping_lists')
          .insert({ household_id: household.id, status: 'ACTIVE' })
          .select()
          .single()
        if (createError) throw createError
        activeListData = newList
      } else {
        activeListData = foundList
      }

      setList(activeListData)

      const [itemsRes, catalogRes] = await Promise.all([
        supabase
          .from('shopping_list_items')
          .select('*, item:items(*)')
          .eq('list_id', activeListData!.id)
          .order('created_at'),
        supabase
          .from('items')
          .select('*')
          .eq('household_id', household.id)
          .order('category')
          .order('name'),
      ])

      if (itemsRes.error) throw itemsRes.error
      if (catalogRes.error) throw catalogRes.error

      setListItems((itemsRes.data as ListItemWithDetails[]) ?? [])
      setCatalogItems(catalogRes.data ?? [])
      setState('ready')
    } catch {
      setErrorMsg('No se pudo cargar la lista.')
      setState('error')
    }
  }, [household])

  useEffect(() => {
    loadOrCreateList()
  }, [loadOrCreateList])

  async function toggleChecked(li: ListItemWithDetails) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const newChecked = !li.checked
    const { error } = await supabase
      .from('shopping_list_items')
      .update({
        checked: newChecked,
        checked_by_user_id: newChecked ? user?.id : null,
      })
      .eq('id', li.id)

    if (!error) {
      setListItems((prev) =>
        prev.map((i) =>
          i.id === li.id
            ? { ...i, checked: newChecked, checked_by_user_id: newChecked ? (user?.id ?? null) : null }
            : i,
        ),
      )
    }
  }

  async function handleAddItem() {
    if (!list || !selectedItemId) return
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    setAddingItem(true)
    try {
      const { error } = await supabase.from('shopping_list_items').upsert(
        {
          list_id: list.id,
          item_id: selectedItemId,
          quantity: 1,
          added_by_user_id: user.id,
        },
        { onConflict: 'list_id,item_id' },
      )
      if (error) {
        setErrorMsg('No se pudo agregar el ítem.')
        return
      }
      setSelectedItemId('')
      await loadOrCreateList()
    } finally {
      setAddingItem(false)
    }
  }

  async function handleRemoveItem(li: ListItemWithDetails) {
    const { error } = await supabase
      .from('shopping_list_items')
      .delete()
      .eq('id', li.id)
    if (!error) {
      setListItems((prev) => prev.filter((i) => i.id !== li.id))
    }
  }

  async function handleCopyWhatsApp() {
    const text = formatListForWhatsApp(
      listItems.map((li) => ({
        ...li,
        quantity: Number(li.quantity),
        item: {
          name: li.item.name,
          category: li.item.category,
          unit: li.item.unit,
        },
      })),
    )
    if (!text) return
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const availableToAdd = catalogItems.filter(
    (ci) => !listItems.some((li) => li.item_id === ci.id),
  )

  const grouped = groupByCategory(listItems)
  const checkedCount = listItems.filter((i) => i.checked).length

  if (state === 'loading') {
    return (
      <div className="flex h-48 items-center justify-center">
        <span className="size-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Lista activa</h1>
        <span className="text-sm text-gray-500">
          {checkedCount}/{listItems.length} marcados
        </span>
      </div>

      {state === 'error' && <Alert message={errorMsg} />}

      {/* Add item */}
      <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100 flex gap-2">
        <select
          value={selectedItemId}
          onChange={(e) => setSelectedItemId(e.target.value)}
          className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="">Agregar ítem al catálogo…</option>
          {availableToAdd.map((ci) => (
            <option key={ci.id} value={ci.id}>
              {ci.category} — {ci.name}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          onClick={handleAddItem}
          loading={addingItem}
          disabled={!selectedItemId}
        >
          +
        </Button>
      </div>

      {/* Checklist grouped by category */}
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {cat}
            </span>
          </div>
          <ul className="divide-y divide-gray-100">
            {items.map((li) => (
              <li
                key={li.id}
                className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                  li.checked ? 'bg-emerald-50/50' : ''
                }`}
              >
                <button
                  onClick={() => toggleChecked(li)}
                  className={`size-6 shrink-0 rounded-full border-2 transition-colors flex items-center justify-center ${
                    li.checked
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-gray-300 hover:border-emerald-400'
                  }`}
                >
                  {li.checked && (
                    <svg
                      className="size-3.5"
                      viewBox="0 0 14 14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <polyline points="2,7 6,11 12,3" />
                    </svg>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      li.checked ? 'line-through text-gray-400' : ''
                    }`}
                  >
                    {li.item.name}
                    {li.item.unit && (
                      <span className="text-gray-400 font-normal">
                        {' '}({li.item.unit})
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">x{Number(li.quantity)}</p>
                </div>
                <button
                  onClick={() => handleRemoveItem(li)}
                  className="text-gray-300 hover:text-red-400 transition-colors"
                  aria-label="Quitar de la lista"
                >
                  <svg className="size-4" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth={1.5} />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {listItems.length === 0 && (
        <div className="rounded-2xl bg-white p-8 text-center border border-gray-100">
          <p className="text-gray-400 text-sm">
            La lista está vacía. Agrega ítems desde el catálogo.
          </p>
        </div>
      )}

      {/* WhatsApp button */}
      {checkedCount > 0 && (
        <Button
          onClick={handleCopyWhatsApp}
          variant={copied ? 'secondary' : 'primary'}
          size="lg"
          className="w-full"
        >
          {copied ? '¡Copiado!' : '📋 Copiar lista para WhatsApp'}
        </Button>
      )}
    </div>
  )
}
