'use client'

import { useState, useEffect, useCallback } from 'react'
import { useHousehold } from '@/contexts/household-context'
import { createClient } from '@/lib/supabase/client'
import { itemSchema } from '@/lib/validation/schemas'
import type { Item } from '@/lib/types'
import Button from '@/components/ui/button'
import Input from '@/components/ui/input'
import Alert from '@/components/ui/alert'
import { PageSpinner } from '@/components/ui/spinner'
import EmptyState from '@/components/ui/empty-state'
import { CategoryBadge, getCategoryEmoji, CATEGORY_CONFIG } from '@/components/ui/badge'
import { PlusIcon, SearchIcon, EditIcon, TrashIcon, XIcon } from '@/components/icons'
import { cn } from '@/lib/cn'
import { useToast } from '@/contexts/toast-context'

const CATEGORIES = Object.keys(CATEGORY_CONFIG)

interface ItemFormProps {
  initial?: Partial<Item>
  onSave: (data: { name: string; category: string; unit: string; last_price: number | null }) => Promise<void>
  onCancel: () => void
  saving: boolean
  error: string
}

function ItemForm({ initial, onSave, onCancel, saving, error }: ItemFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState(initial?.category ?? CATEGORIES[0])
  const [unit, setUnit] = useState(initial?.unit ?? '')
  const [price, setPrice] = useState(initial?.last_price != null ? String(initial.last_price) : '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cleaned = price.replace(',', '.')
    const num = parseFloat(cleaned)
    await onSave({ name, category, unit, last_price: !isNaN(num) && num > 0 ? num : null })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && <Alert message={error} />}
      <Input
        label="Nombre del producto"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ej: Leche entera"
        autoFocus
        required
      />
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-foreground">Categoría</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-xl border border-border-strong bg-surface px-3 py-2.5 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{getCategoryEmoji(c)} {c}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <Input
            label="Unidad (opcional)"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="Ej: 1 lt, libra, 500g"
          />
        </div>
        <div className="w-32">
          <Input
            label="Precio unitario"
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^0-9.,]/g, ''))}
            placeholder="0"
            inputMode="decimal"
            startIcon={<span className="text-sm text-muted">$</span>}
          />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" loading={saving} className="flex-1">
          Guardar
        </Button>
      </div>
    </form>
  )
}

type PageState = 'loading' | 'error' | 'ready'

export default function CatalogPage() {
  const { household, loading: householdLoading } = useHousehold()
  const supabase = createClient()
  const { toast } = useToast()
  const [state, setState] = useState<PageState>('loading')
  const [items, setItems] = useState<Item[]>([])
  const [errorMsg, setErrorMsg] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Item | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [search, setSearch] = useState('')

  const loadItems = useCallback(async () => {
    if (householdLoading) return
    if (!household) { setState('ready'); return }
    setState('loading')
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('household_id', household.id)
      .order('category')
      .order('name')
    if (error) {
      setErrorMsg('No se pudieron cargar los ítems.')
      setState('error')
    } else {
      setItems(data ?? [])
      setState('ready')
    }
  }, [household, householdLoading])

  useEffect(() => { loadItems() }, [loadItems])

  async function handleCreate(data: { name: string; category: string; unit: string; last_price: number | null }) {
    if (!household) return
    setFormError('')
    const result = itemSchema.safeParse(data)
    if (!result.success) { setFormError(result.error.issues[0].message); return }
    setSaving(true)
    try {
      const { error } = await supabase.from('items').insert({
        household_id: household.id,
        name: data.name.trim(),
        category: data.category,
        unit: data.unit.trim() || null,
        last_price: data.last_price,
      })
      if (error) {
        setFormError(error.code === '23505' ? 'Ya existe un ítem con ese nombre en esa categoría.' : `Error: ${error.message}`)
        return
      }
      setShowForm(false)
      await loadItems()
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(data: { name: string; category: string; unit: string; last_price: number | null }) {
    if (!editItem) return
    setFormError('')
    const result = itemSchema.safeParse(data)
    if (!result.success) { setFormError(result.error.issues[0].message); return }
    setSaving(true)
    try {
      const { error } = await supabase
        .from('items')
        .update({ name: data.name.trim(), category: data.category, unit: data.unit.trim() || null, last_price: data.last_price })
        .eq('id', editItem.id)
      if (error) { setFormError('No se pudo actualizar el ítem.'); return }
      setEditItem(null)
      await loadItems()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(item: Item) {
    if (!confirm(`¿Eliminar "${item.name}"?`)) return
    const { error } = await supabase.from('items').delete().eq('id', item.id)
    if (error) {
      toast(`No se pudo eliminar "${item.name}". Intenta de nuevo.`)
    } else {
      await loadItems()
    }
  }

  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase()),
  )

  const byCategory = filtered.reduce<Record<string, Item[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  if (state === 'loading') return <PageSpinner />

  return (
    <div className="flex flex-col gap-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Catálogo</h1>
          {state === 'ready' && (
            <p className="text-sm text-muted">{items.length} producto{items.length !== 1 ? 's' : ''}</p>
          )}
        </div>
        {!showForm && !editItem && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <PlusIcon size={15} />
            Agregar
          </Button>
        )}
      </div>

      {state === 'error' && <Alert message={errorMsg} />}

      {/* New item form */}
      {showForm && (
        <div className="rounded-2xl bg-surface p-5 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Nuevo producto</h2>
            <button
              onClick={() => { setShowForm(false); setFormError('') }}
              className="rounded-lg p-1 text-muted hover:bg-foreground/8 hover:text-foreground"
            >
              <XIcon size={16} />
            </button>
          </div>
          <ItemForm
            onSave={handleCreate}
            onCancel={() => { setShowForm(false); setFormError('') }}
            saving={saving}
            error={formError}
          />
        </div>
      )}

      {/* Search */}
      {state === 'ready' && items.length > 0 && (
        <Input
          placeholder="Buscar productos…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          startIcon={<SearchIcon size={15} />}
        />
      )}

      {/* Items by category */}
      {state === 'ready' && Object.entries(byCategory).map(([cat, catItems]) => (
        <div key={cat} className="rounded-2xl bg-surface shadow-sm border border-border overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-foreground/[0.03] border-b border-border">
            <span className="text-base">{getCategoryEmoji(cat)}</span>
            <span className="text-xs font-bold uppercase tracking-wide text-muted">{cat}</span>
            <span className="ml-auto text-xs text-muted">{catItems.length}</span>
          </div>
          <ul>
            {catItems.map((item, idx) => (
              <li
                key={item.id}
                className={cn('px-4 py-3', idx !== catItems.length - 1 && 'border-b border-border/60')}
              >
                {editItem?.id === item.id ? (
                  <div className="py-1">
                    <ItemForm
                      initial={item}
                      onSave={handleEdit}
                      onCancel={() => { setEditItem(null); setFormError('') }}
                      saving={saving}
                      error={formError}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{item.name}</p>
                      <p className="text-xs text-muted mt-0.5">
                        {item.unit && <span>{item.unit}</span>}
                        {item.unit && item.last_price != null && <span> · </span>}
                        {item.last_price != null && (
                          <span className="text-brand font-medium">
                            ${Number(item.last_price).toLocaleString('es-CO')}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => { setEditItem(item); setFormError('') }}
                        aria-label={`Editar ${item.name}`}
                        className="rounded-lg p-1.5 text-muted hover:bg-foreground/8 hover:text-foreground transition-colors"
                      >
                        <EditIcon size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        aria-label={`Eliminar ${item.name}`}
                        className="rounded-lg p-1.5 text-muted hover:bg-red-500/10 hover:text-red-500 transition-colors"
                      >
                        <TrashIcon size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {state === 'ready' && filtered.length === 0 && !showForm && (
        <EmptyState
          emoji="📦"
          title={search ? 'Sin resultados' : 'Catálogo vacío'}
          description={
            search
              ? `No encontramos productos que coincidan con "${search}".`
              : 'Agrega los productos que compras habitualmente para usarlos en tus listas.'
          }
          action={
            !search && (
              <Button onClick={() => setShowForm(true)} size="sm">
                <PlusIcon size={15} />
                Agregar primer producto
              </Button>
            )
          }
        />
      )}
    </div>
  )
}
