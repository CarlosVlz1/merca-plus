'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useHousehold } from '@/contexts/household-context'
import { createClient } from '@/lib/supabase/client'
import { formatListForWhatsApp } from '@/lib/whatsapp/format-list'
import type { Item, ShoppingList, ShoppingListItem } from '@/lib/types'
import Button from '@/components/ui/button'
import Alert from '@/components/ui/alert'
import { PageSpinner } from '@/components/ui/spinner'
import EmptyState from '@/components/ui/empty-state'
import { getCategoryEmoji } from '@/components/ui/badge'
import { CheckIcon, PlusIcon, XIcon, WhatsAppIcon } from '@/components/icons'
import { cn } from '@/lib/cn'
import { useToast } from '@/contexts/toast-context'

interface ListItemWithDetails extends ShoppingListItem {
  item: Item
}

type PageState = 'loading' | 'error' | 'ready'

export default function ActiveListPage() {
  const { household, loading: householdLoading } = useHousehold()
  const supabase = createClient()
  const router = useRouter()
  const { toast } = useToast()
  const [state, setState] = useState<PageState>('loading')
  const [list, setList] = useState<ShoppingList | null>(null)
  const [listItems, setListItems] = useState<ListItemWithDetails[]>([])
  const [catalogItems, setCatalogItems] = useState<Item[]>([])
  const [errorMsg, setErrorMsg] = useState('')
  const [addingItem, setAddingItem] = useState(false)
  const [closingList, setClosingList] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState('')
  // price inputs: keyed by shopping_list_item.id
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({})
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const loadOrCreateList = useCallback(async () => {
    if (householdLoading) return
    if (!household) { setState('ready'); return }
    setState('loading')

    const catalogRes = await supabase
      .from('items')
      .select('*')
      .eq('household_id', household.id)
      .order('category')
      .order('name')
    if (!catalogRes.error) setCatalogItems(catalogRes.data ?? [])

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setState('ready'); return }

      const { data: activeLists, error: listError } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('household_id', household.id)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })
        .limit(1)

      if (listError) throw listError

      let activeList = activeLists?.[0] ?? null

      if (!activeList) {
        const { data: newLists, error: createError } = await supabase
          .from('shopping_lists')
          .insert({ household_id: household.id, status: 'ACTIVE' })
          .select()
          .limit(1)
        if (createError) throw createError
        activeList = newLists?.[0] ?? null
        if (!activeList) throw new Error('No se pudo crear la lista de compras.')
      }

      setList(activeList)

      const itemsRes = await supabase
        .from('shopping_list_items')
        .select('*, item:items(*)')
        .eq('list_id', activeList!.id)
        .order('created_at')

      if (itemsRes.error) throw itemsRes.error

      const loaded = (itemsRes.data as ListItemWithDetails[]) ?? []
      setListItems(loaded)

      // Restore saved prices into input state
      const savedPrices: Record<string, string> = {}
      loaded.forEach((li) => {
        if (li.price != null) savedPrices[li.id] = String(li.price)
      })
      setPriceInputs(savedPrices)

      setState('ready')
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err
        ? String((err as { message: string }).message)
        : 'Error desconocido'
      setErrorMsg(`Error cargando lista: ${msg}`)
      setState('error')
    }
  }, [household, householdLoading])

  useEffect(() => { loadOrCreateList() }, [loadOrCreateList])

  async function toggleChecked(li: ListItemWithDetails) {
    const { data: { user } } = await supabase.auth.getUser()
    const newChecked = !li.checked
    const { error } = await supabase
      .from('shopping_list_items')
      .update({ checked: newChecked, checked_by_user_id: newChecked ? (user?.id ?? null) : null })
      .eq('id', li.id)
    if (error) {
      toast('No se pudo actualizar el ítem. Intenta de nuevo.')
    } else {
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setAddingItem(true)
    try {
      const { error } = await supabase.from('shopping_list_items').upsert(
        { list_id: list.id, item_id: selectedItemId, quantity: 1, added_by_user_id: user.id },
        { onConflict: 'list_id,item_id' },
      )
      if (error) { setErrorMsg('No se pudo agregar el ítem.'); return }
      setSelectedItemId('')
      await loadOrCreateList()
    } finally {
      setAddingItem(false)
    }
  }

  async function handleUpdateQuantity(li: ListItemWithDetails, delta: number) {
    const newQty = Math.max(1, Number(li.quantity) + delta)
    const { error } = await supabase
      .from('shopping_list_items')
      .update({ quantity: newQty })
      .eq('id', li.id)
    if (error) {
      toast('No se pudo actualizar la cantidad.')
    } else {
      setListItems((prev) =>
        prev.map((i) => (i.id === li.id ? { ...i, quantity: newQty } : i)),
      )
    }
  }

  function handlePriceChange(liId: string, raw: string) {
    // Allow digits and one decimal separator
    const cleaned = raw.replace(/[^0-9.,]/g, '').replace(',', '.')
    setPriceInputs((prev) => ({ ...prev, [liId]: cleaned }))

    // Debounce save: 800ms after user stops typing
    clearTimeout(saveTimers.current[liId])
    saveTimers.current[liId] = setTimeout(async () => {
      const num = parseFloat(cleaned)
      if (!isNaN(num) && num > 0) {
        const { error } = await supabase
          .from('shopping_list_items')
          .update({ price: num })
          .eq('id', liId)
        if (error) {
          toast('No se pudo guardar el precio.')
        } else {
          setListItems((prev) =>
            prev.map((i) => (i.id === liId ? { ...i, price: num } : i)),
          )
        }
      } else if (cleaned === '' || cleaned === '0') {
        const { error } = await supabase
          .from('shopping_list_items')
          .update({ price: null })
          .eq('id', liId)
        if (!error) {
          setListItems((prev) =>
            prev.map((i) => (i.id === liId ? { ...i, price: null } : i)),
          )
        }
      }
    }, 800)
  }

  async function handleRemoveItem(li: ListItemWithDetails) {
    const { error } = await supabase.from('shopping_list_items').delete().eq('id', li.id)
    if (error) {
      toast(`No se pudo quitar "${li.item.name}" de la lista.`)
    } else {
      setListItems((prev) => prev.filter((i) => i.id !== li.id))
      setPriceInputs((prev) => { const next = { ...prev }; delete next[li.id]; return next })
    }
  }

  async function handleCloseList() {
    if (!list) return
    setClosingList(true)
    try {
      // Record prices in price_history and update last_price for items with price
      const itemsWithPrice = listItems.filter((li) => li.price != null && li.price > 0)

      if (itemsWithPrice.length > 0) {
        const priceHistoryRows = itemsWithPrice.map((li) => ({
          item_id: li.item_id,
          price: li.price!,
          recorded_at: new Date().toISOString(),
        }))

        const { error: histError } = await supabase
          .from('price_history')
          .insert(priceHistoryRows)
        if (histError) throw histError

        // Update last_price on each item
        await Promise.all(
          itemsWithPrice.map((li) =>
            supabase
              .from('items')
              .update({ last_price: li.price })
              .eq('id', li.item_id),
          ),
        )
      }

      // Archive the list with total
      const { error: closeError } = await supabase
        .from('shopping_lists')
        .update({
          status: 'CLOSED',
          closed_at: new Date().toISOString(),
          total: totalAmount > 0 ? totalAmount : null,
        })
        .eq('id', list.id)
      if (closeError) throw closeError

      router.push('/history')
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err
        ? String((err as { message: string }).message)
        : 'Error desconocido'
      setErrorMsg(`Error al finalizar lista: ${msg}`)
    } finally {
      setClosingList(false)
    }
  }

  function handleShareWhatsApp() {
    const text = formatListForWhatsApp(
      listItems.map((li) => ({
        ...li,
        quantity: Number(li.quantity),
        item: { name: li.item.name, category: li.item.category, unit: li.item.unit },
      })),
    )
    if (!text) return
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const [lastClosedList, setLastClosedList] = useState<{ id: string; closed_at: string | null; itemCount: number } | null>(null)

  useEffect(() => {
    if (!household || listItems.length > 0) return
    // Check if there's a recently closed list (only shown when active list is empty)
    supabase
      .from('shopping_lists')
      .select('id, closed_at')
      .eq('household_id', household.id)
      .eq('status', 'CLOSED')
      .order('closed_at', { ascending: false })
      .limit(1)
      .then(async ({ data }) => {
        const last = data?.[0]
        if (!last) return
        const { count } = await supabase
          .from('shopping_list_items')
          .select('id', { count: 'exact', head: true })
          .eq('list_id', last.id)
        setLastClosedList({ id: last.id, closed_at: last.closed_at, itemCount: count ?? 0 })
      })
  }, [household, listItems.length])

  const availableToAdd = catalogItems.filter((ci) => !listItems.some((li) => li.item_id === ci.id))
  const checkedCount = listItems.filter((i) => i.checked).length
  const total = listItems.length
  const progress = total > 0 ? (checkedCount / total) * 100 : 0
  const itemsWithPriceCount = listItems.filter((li) => li.price != null && li.price > 0).length

  const totalAmount = listItems.reduce((sum, li) => {
    if (li.price != null && li.price > 0) return sum + li.price * Number(li.quantity)
    return sum
  }, 0)

  const formatCOP = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

  const byCategory = listItems.reduce<Record<string, ListItemWithDetails[]>>((acc, li) => {
    const cat = li.item.category
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(li)
    return acc
  }, {})

  if (state === 'loading') return <PageSpinner />

  return (
    <div className="flex flex-col gap-4 py-4">
      {/* Header + progress */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Lista semanal</h1>
          <span className="text-sm font-medium text-gray-500">
            {checkedCount}/{total}
          </span>
        </div>
        {total > 0 && (
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        {totalAmount > 0 && (
          <div className="flex items-center justify-between rounded-xl bg-green-50 px-4 py-2.5">
            <span className="text-sm text-green-700 font-medium">Total estimado</span>
            <span className="text-base font-bold text-green-700">{formatCOP(totalAmount)}</span>
          </div>
        )}
      </div>

      {state === 'error' && <Alert message={errorMsg} />}

      {/* Add item */}
      <div className="flex gap-2 rounded-2xl bg-white p-3 shadow-sm border border-gray-100">
        <select
          value={selectedItemId}
          onChange={(e) => setSelectedItemId(e.target.value)}
          className="flex-1 min-w-0 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
        >
          <option value="">Agregar del catálogo…</option>
          {availableToAdd.map((ci) => (
            <option key={ci.id} value={ci.id}>
              {getCategoryEmoji(ci.category)} {ci.name}
              {ci.unit ? ` (${ci.unit})` : ''}
            </option>
          ))}
        </select>
        <Button
          size="md"
          onClick={handleAddItem}
          loading={addingItem}
          disabled={!selectedItemId}
          className="shrink-0 aspect-square px-0 w-10"
          aria-label="Agregar ítem"
        >
          <PlusIcon size={18} />
        </Button>
      </div>

      {/* Checklist por categoría */}
      {Object.entries(byCategory).map(([cat, items]) => (
        <div key={cat} className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50/80 border-b border-gray-100">
            <span className="text-base">{getCategoryEmoji(cat)}</span>
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{cat}</span>
          </div>
          <ul>
            {items.map((li, idx) => (
              <li
                key={li.id}
                className={cn(
                  'flex flex-col px-4 py-3 transition-colors gap-2',
                  li.checked ? 'bg-green-50/40' : 'bg-white',
                  idx !== items.length - 1 && 'border-b border-gray-50',
                )}
              >
                {/* Row: checkbox / name / qty / delete */}
                <div className="flex items-center gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleChecked(li)}
                    aria-label={li.checked ? 'Desmarcar' : 'Marcar como obtenido'}
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-150',
                      li.checked
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-gray-300 hover:border-green-400',
                    )}
                  >
                    {li.checked && <CheckIcon size={12} />}
                  </button>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        'text-sm font-medium leading-snug transition-all',
                        li.checked ? 'line-through text-gray-400' : 'text-gray-800',
                      )}
                    >
                      {li.item.name}
                      {li.item.unit && (
                        <span className={cn('font-normal', li.checked ? 'text-gray-300' : 'text-gray-400')}>
                          {' '}· {li.item.unit}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleUpdateQuantity(li, -1)}
                      disabled={Number(li.quantity) <= 1}
                      aria-label="Disminuir cantidad"
                      className="flex size-6 items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600 disabled:opacity-30 transition-all text-sm font-medium leading-none"
                    >
                      −
                    </button>
                    <span className={cn(
                      'min-w-6 text-center text-sm font-semibold tabular-nums',
                      li.checked ? 'text-gray-300' : 'text-gray-700',
                    )}>
                      {Number(li.quantity)}
                    </span>
                    <button
                      onClick={() => handleUpdateQuantity(li, 1)}
                      aria-label="Aumentar cantidad"
                      className="flex size-6 items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:border-green-400 hover:text-green-600 transition-all text-sm font-medium leading-none"
                    >
                      +
                    </button>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => handleRemoveItem(li)}
                    aria-label="Quitar de la lista"
                    className="shrink-0 rounded-lg p-1 text-gray-300 hover:bg-red-50 hover:text-red-400 transition-colors"
                  >
                    <XIcon size={14} />
                  </button>
                </div>

                {/* Price input — always visible */}
                <div className="ml-9 flex items-center gap-2">
                  <label className="text-xs text-gray-400 shrink-0">Precio:</label>
                  <div className="relative flex-1 max-w-[140px]">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                      $
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      value={priceInputs[li.id] ?? ''}
                      onChange={(e) => handlePriceChange(li.id, e.target.value)}
                      className={cn(
                        'w-full rounded-lg border bg-white pl-5 pr-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 placeholder:text-gray-300',
                        li.price != null && li.price > 0
                          ? 'border-green-300 focus:border-green-400 focus:ring-green-400/30'
                          : 'border-gray-200 focus:border-green-400 focus:ring-green-400/30',
                      )}
                    />
                  </div>
                  {li.price != null && li.price > 0 && (
                    <CheckIcon size={13} className="text-green-500 shrink-0" />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {/* Last closed list hint */}
      {listItems.length === 0 && lastClosedList && lastClosedList.itemCount > 0 && (
        <Link
          href="/history"
          className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800 hover:bg-amber-100 transition-colors"
        >
          <span className="text-xl shrink-0">📋</span>
          <div className="flex-1 min-w-0">
            <p className="font-medium">¿Buscas tu lista anterior?</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Tenía {lastClosedList.itemCount} producto{lastClosedList.itemCount !== 1 ? 's' : ''}.
              Ver en Historial →
            </p>
          </div>
        </Link>
      )}

      {/* Empty state */}
      {listItems.length === 0 && (
        <EmptyState
          emoji="🛒"
          title="Nueva lista"
          description="Agrega productos del catálogo para empezar tu nueva lista semanal."
        />
      )}

      {/* Actions */}
      {listItems.length > 0 && (
        <div className="flex flex-col gap-2">
          {/* Finalizar lista */}
          <Button
            onClick={handleCloseList}
            loading={closingList}
            size="lg"
            className="w-full"
          >
            <CheckIcon size={16} />
            Finalizar lista
            {itemsWithPriceCount > 0 && (
              <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-xs">
                {itemsWithPriceCount} precio{itemsWithPriceCount !== 1 ? 's' : ''}
              </span>
            )}
          </Button>

          {/* WhatsApp share */}
          {listItems.some((li) => !li.checked) && (
            <Button
              onClick={handleShareWhatsApp}
              variant="ghost"
              size="lg"
              className="w-full"
            >
              <WhatsAppIcon size={17} />
              Compartir lista por WhatsApp
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
