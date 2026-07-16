'use client'

import { useState, useEffect, useCallback } from 'react'
import { useHousehold } from '@/contexts/household-context'
import { createClient } from '@/lib/supabase/client'
import type { Item, PriceHistory, ShoppingList, ShoppingListItem } from '@/lib/types'
import Alert from '@/components/ui/alert'
import { PageSpinner } from '@/components/ui/spinner'
import Spinner from '@/components/ui/spinner'
import EmptyState from '@/components/ui/empty-state'
import { getCategoryEmoji } from '@/components/ui/badge'
import { CheckIcon } from '@/components/icons'
import { cn } from '@/lib/cn'

type PageState = 'loading' | 'error' | 'ready'

interface ClosedListWithItems extends ShoppingList {
  items: (ShoppingListItem & { item: Item })[]
}

const formatPrice = (p: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(p)

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })

const formatDateShort = (d: string) =>
  new Date(d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })

export default function HistoryPage() {
  const { household, loading: householdLoading } = useHousehold()
  const supabase = createClient()
  const [state, setState] = useState<PageState>('loading')
  const [items, setItems] = useState<Item[]>([])
  const [selectedItemId, setSelectedItemId] = useState('')
  const [history, setHistory] = useState<PriceHistory[]>([])
  const [errorMsg, setErrorMsg] = useState('')
  const [historyLoading, setHistoryLoading] = useState(false)
  const [closedLists, setClosedLists] = useState<ClosedListWithItems[]>([])
  const [expandedListId, setExpandedListId] = useState<string | null>(null)

  const loadItems = useCallback(async () => {
    if (householdLoading) return
    if (!household) { setState('ready'); return }
    setState('loading')

    const [itemsRes, listsRes] = await Promise.all([
      supabase
        .from('items')
        .select('*')
        .eq('household_id', household.id)
        .order('category')
        .order('name'),
      supabase
        .from('shopping_lists')
        .select('*, items:shopping_list_items(*, item:items(*))')
        .eq('household_id', household.id)
        .eq('status', 'CLOSED')
        .order('closed_at', { ascending: false })
        .limit(10),
    ])

    if (itemsRes.error) {
      setErrorMsg('No se pudieron cargar los ítems.')
      setState('error')
    } else {
      setItems(itemsRes.data ?? [])
      setClosedLists((listsRes.data as ClosedListWithItems[]) ?? [])
      setState('ready')
    }
  }, [household, householdLoading])

  useEffect(() => { loadItems() }, [loadItems])

  useEffect(() => {
    if (!selectedItemId) { setHistory([]); return }
    setHistoryLoading(true)
    supabase
      .from('price_history')
      .select('*')
      .eq('item_id', selectedItemId)
      .order('recorded_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error) setHistory(data ?? [])
        setHistoryLoading(false)
      })
  }, [selectedItemId])

  const selectedItem = items.find((i) => i.id === selectedItemId)

  const priceMin = history.length > 0 ? Math.min(...history.map((h) => h.price)) : null
  const priceMax = history.length > 0 ? Math.max(...history.map((h) => h.price)) : null

  if (state === 'loading') return <PageSpinner />

  return (
    <div className="flex flex-col gap-4 py-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Historial</h1>
        <p className="text-sm text-gray-400">Listas completadas y precios</p>
      </div>

      {state === 'error' && <Alert message={errorMsg} />}

      {/* ── Listas completadas ── */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-1">
          Listas completadas
        </h2>

        {closedLists.length === 0 ? (
          <EmptyState
            emoji="✅"
            title="Sin listas completadas"
            description="Cuando finalices una lista de compras aparecerá aquí."
          />
        ) : (
          closedLists.map((cl) => {
            const isExpanded = expandedListId === cl.id
            const checkedItems = cl.items.filter((i) => i.checked)
            const totalItems = cl.items.length
            const closedDate = cl.closed_at ?? cl.created_at

            return (
              <div key={cl.id} className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
                {/* List header */}
                <button
                  onClick={() => setExpandedListId(isExpanded ? null : cl.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50/80 transition-colors"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-600 text-base">
                    ✅
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800">
                      Lista del {formatDateShort(closedDate)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {totalItems} producto{totalItems !== 1 ? 's' : ''} · {checkedItems.length} obtenido{checkedItems.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <span className={cn(
                    'text-gray-300 transition-transform duration-200 text-xs',
                    isExpanded && 'rotate-180',
                  )}>
                    ▼
                  </span>
                </button>

                {/* Expanded items */}
                {isExpanded && (
                  <ul className="border-t border-gray-100">
                    {cl.items.map((li, idx) => (
                      <li
                        key={li.id}
                        className={cn(
                          'flex items-center gap-3 px-4 py-2.5',
                          li.checked ? 'bg-green-50/30' : 'bg-white',
                          idx !== cl.items.length - 1 && 'border-b border-gray-50',
                        )}
                      >
                        <span className={cn(
                          'flex size-5 shrink-0 items-center justify-center rounded-full border-2',
                          li.checked ? 'border-green-500 bg-green-500 text-white' : 'border-gray-200',
                        )}>
                          {li.checked && <CheckIcon size={10} />}
                        </span>
                        <span className={cn(
                          'flex-1 text-sm',
                          li.checked ? 'line-through text-gray-400' : 'text-gray-700',
                        )}>
                          {li.item.name}
                          {li.item.unit && (
                            <span className="text-gray-400 font-normal"> · {li.item.unit}</span>
                          )}
                          <span className="text-gray-300"> ×{Number(li.quantity)}</span>
                        </span>
                        {li.price != null && li.price > 0 && (
                          <span className="text-xs font-semibold text-green-600 shrink-0">
                            {formatPrice(Number(li.price))}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })
        )}
      </section>

      {/* ── Historial de precios ── */}
      <section className="flex flex-col gap-3 mt-2">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-1">
          Precios por producto
        </h2>

        {/* Item selector */}
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Selecciona un producto
          </label>
          <select
            value={selectedItemId}
            onChange={(e) => setSelectedItemId(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
          >
            <option value="">— Elige un producto —</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {getCategoryEmoji(item.category)} {item.name}
                {item.unit ? ` (${item.unit})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Price stats + history */}
        {selectedItem && (
          <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
            {/* Item header */}
            <div className="px-4 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getCategoryEmoji(selectedItem.category)}</span>
                <div>
                  <h2 className="font-bold text-gray-800">{selectedItem.name}</h2>
                  {selectedItem.unit && (
                    <p className="text-xs text-gray-400">{selectedItem.unit}</p>
                  )}
                </div>
                {selectedItem.last_price && (
                  <div className="ml-auto text-right">
                    <p className="text-xs text-gray-400">Último precio</p>
                    <p className="font-bold text-green-600">{formatPrice(selectedItem.last_price)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Price range stats */}
            {!historyLoading && history.length > 1 && priceMin !== null && priceMax !== null && (
              <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
                <div className="px-4 py-3 text-center">
                  <p className="text-xs text-gray-400">Precio mínimo</p>
                  <p className="font-bold text-green-600">{formatPrice(priceMin)}</p>
                </div>
                <div className="px-4 py-3 text-center">
                  <p className="text-xs text-gray-400">Precio máximo</p>
                  <p className="font-bold text-red-500">{formatPrice(priceMax)}</p>
                </div>
              </div>
            )}

            {/* History list */}
            {historyLoading ? (
              <div className="flex h-24 items-center justify-center">
                <Spinner size="md" />
              </div>
            ) : history.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-gray-400">Sin registros de precios aún.</p>
                <p className="text-xs text-gray-300 mt-1">Los precios se registran al finalizar una lista.</p>
              </div>
            ) : (
              <ul>
                {history.map((ph, idx) => (
                  <li
                    key={ph.id}
                    className={`flex items-center justify-between px-4 py-3 ${
                      idx !== history.length - 1 ? 'border-b border-gray-50' : ''
                    }`}
                  >
                    <span className="text-sm text-gray-500">{formatDate(ph.recorded_at)}</span>
                    <span className="font-semibold text-sm text-gray-800">
                      {formatPrice(ph.price)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* No item selected */}
        {!selectedItem && items.length === 0 && (
          <EmptyState
            emoji="📈"
            title="Sin productos aún"
            description="Agrega productos al catálogo para poder registrar sus precios."
          />
        )}
      </section>
    </div>
  )
}
