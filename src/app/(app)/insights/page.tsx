'use client'

import { useState, useEffect, useCallback } from 'react'
import { useHousehold } from '@/contexts/household-context'
import { createClient } from '@/lib/supabase/client'
import { PageSpinner } from '@/components/ui/spinner'
import EmptyState from '@/components/ui/empty-state'
import { getCategoryEmoji } from '@/components/ui/badge'
import { cn } from '@/lib/cn'

// ── Types ──────────────────────────────────────────────────────────────────

interface ClosedList {
  total: number
  closed_at: string
}

interface ListItemRow {
  price: number | null
  quantity: number
  item: { category: string }
}

interface CatalogItem {
  id: string
  name: string
}

interface PricePoint {
  price: number
  recorded_at: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

const formatCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)

function monthKey(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key: string) {
  const [year, month] = key.split('-')
  return new Date(Number(year), Number(month) - 1).toLocaleString('es-CO', {
    month: 'short',
    year: '2-digit',
  })
}

function formatDateShort(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ── SVG Bar Chart ──────────────────────────────────────────────────────────

interface BarChartProps {
  data: { label: string; value: number }[]
  color?: string
}

function BarChart({ data, color = '#16A34A' }: BarChartProps) {
  if (data.length === 0) return null
  const max = Math.max(...data.map((d) => d.value), 1)
  const W = 320
  const H = 140
  const padL = 8
  const padR = 8
  const padB = 28
  const padT = 8
  const chartW = W - padL - padR
  const chartH = H - padT - padB
  const barW = Math.max(8, chartW / data.length - 6)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-label="Gasto mensual">
      {/* Gridlines */}
      {[0.25, 0.5, 0.75, 1].map((frac) => {
        const y = padT + chartH * (1 - frac)
        return (
          <line
            key={frac}
            x1={padL}
            y1={y}
            x2={W - padR}
            y2={y}
            stroke="var(--color-border)"
            strokeWidth={1}
          />
        )
      })}
      {/* Bars */}
      {data.map((d, i) => {
        const barH = (d.value / max) * chartH
        const x = padL + (chartW / data.length) * i + (chartW / data.length - barW) / 2
        const y = padT + chartH - barH
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={4}
              fill={color}
              fillOpacity={0.85}
            />
            {/* X label */}
            <text
              x={x + barW / 2}
              y={H - 6}
              textAnchor="middle"
              fontSize={9}
              fill="var(--color-muted)"
            >
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── SVG Line Chart ─────────────────────────────────────────────────────────

interface LineChartProps {
  data: { label: string; value: number }[]
  color?: string
}

function LineChart({ data, color = '#16A34A' }: LineChartProps) {
  if (data.length === 0) return null
  const max = Math.max(...data.map((d) => d.value), 1)
  const min = Math.min(...data.map((d) => d.value), 0)
  const range = max - min || 1
  const W = 320
  const H = 140
  const padL = 8
  const padR = 8
  const padB = 28
  const padT = 12
  const chartW = W - padL - padR
  const chartH = H - padT - padB

  const pts = data.map((d, i) => ({
    x: padL + (chartW / Math.max(data.length - 1, 1)) * i,
    y: padT + chartH - ((d.value - min) / range) * chartH,
    ...d,
  }))

  const polyline = pts.map((p) => `${p.x},${p.y}`).join(' ')
  const area = [
    `${pts[0].x},${padT + chartH}`,
    ...pts.map((p) => `${p.x},${p.y}`),
    `${pts[pts.length - 1].x},${padT + chartH}`,
  ].join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-label="Evolución de precio">
      {/* Area fill */}
      <polygon points={area} fill={color} fillOpacity={0.08} />
      {/* Line */}
      <polyline points={polyline} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      {/* Points */}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={3.5} fill="var(--color-surface)" stroke={color} strokeWidth={2} />
          {/* X label — only first and last to avoid clutter */}
          {(i === 0 || i === pts.length - 1) && (
            <text
              x={p.x}
              y={H - 6}
              textAnchor={i === 0 ? 'start' : 'end'}
              fontSize={9}
              fill="var(--color-muted)"
            >
              {p.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}

// ── Horizontal Bar (category) ──────────────────────────────────────────────

function HBar({ label, value, max, color = '#16A34A' }: { label: string; value: number; max: number; color?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 shrink-0 text-xs text-muted truncate">{label}</span>
      <div className="flex-1 h-2.5 rounded-full bg-foreground/8 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-20 shrink-0 text-right text-xs font-semibold text-foreground/80">{formatCOP(value)}</span>
    </div>
  )
}

// ── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  emoji,
  highlight,
}: {
  label: string
  value: string
  sub?: string
  emoji: string
  highlight?: boolean
}) {
  return (
    <div className={cn(
      'flex flex-col gap-1 rounded-2xl p-4 border',
      highlight
        ? 'bg-brand border-brand text-white'
        : 'bg-surface border-border shadow-sm',
    )}>
      <span className="text-base">{emoji}</span>
      <p className={cn('text-lg font-bold leading-tight', highlight ? 'text-white' : 'text-foreground')}>
        {value}
      </p>
      <p className={cn('text-xs', highlight ? 'text-white/80' : 'text-muted')}>{label}</p>
      {sub && (
        <p className={cn('text-[11px] mt-0.5', highlight ? 'text-white/70' : 'text-muted')}>{sub}</p>
      )}
    </div>
  )
}

// ── Section wrapper ────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-muted uppercase tracking-wide px-1">{title}</h2>
      {children}
    </section>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

type PageState = 'loading' | 'error' | 'empty' | 'ready'

const CATEGORY_COLORS: Record<string, string> = {
  'Lácteos': '#3b82f6',
  'Carnes': '#ef4444',
  'Frutas y verduras': '#22c55e',
  'Panadería': '#f59e0b',
  'Bebidas': '#8b5cf6',
  'Limpieza': '#06b6d4',
  'Higiene': '#ec4899',
  'Snacks': '#f97316',
  'Granos': '#a16207',
  'Congelados': '#0ea5e9',
  'Otros': '#94a3b8',
}

export default function InsightsPage() {
  const { household, loading: householdLoading } = useHousehold()
  const supabase = createClient()

  const [state, setState] = useState<PageState>('loading')
  const [closedLists, setClosedLists] = useState<ClosedList[]>([])
  const [categoryData, setCategoryData] = useState<{ label: string; value: number }[]>([])
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([])
  const [selectedItemId, setSelectedItemId] = useState('')
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const load = useCallback(async () => {
    if (householdLoading) return
    if (!household) { setState('empty'); return }

    setState('loading')
    try {
      // 1. Closed lists
      const { data: lists, error: listsErr } = await supabase
        .from('shopping_lists')
        .select('total, closed_at')
        .eq('household_id', household.id)
        .eq('status', 'CLOSED')
        .order('closed_at')

      if (listsErr) throw listsErr
      if (!lists || lists.length === 0) { setState('empty'); return }

      setClosedLists(lists)

      // 2. Items of closed lists for category breakdown
      const listIds = lists
        .map((l) => l as { total: number; closed_at: string } & { id?: string })
      // We need list IDs — fetch with id
      const { data: listsWithId } = await supabase
        .from('shopping_lists')
        .select('id')
        .eq('household_id', household.id)
        .eq('status', 'CLOSED')

      if (listsWithId && listsWithId.length > 0) {
        const ids = listsWithId.map((l: { id: string }) => l.id)
        const { data: lineItems } = await supabase
          .from('shopping_list_items')
          .select('price, quantity, item:items(category)')
          .in('list_id', ids)
          .not('price', 'is', null)

        if (lineItems) {
          const byCategory: Record<string, number> = {}
          for (const li of lineItems as unknown as ListItemRow[]) {
            if (li.price == null) continue
            const cat = li.item?.category ?? 'Otros'
            byCategory[cat] = (byCategory[cat] ?? 0) + Number(li.price) * Number(li.quantity)
          }
          const sorted = Object.entries(byCategory)
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => b.value - a.value)
          setCategoryData(sorted)
        }
      }

      // 3. Catalog items for selector
      const { data: items } = await supabase
        .from('items')
        .select('id, name')
        .eq('household_id', household.id)
        .order('name')

      setCatalogItems(items ?? [])
      setState('ready')
    } catch {
      setState('error')
    }
  }, [household, householdLoading])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!selectedItemId) { setPriceHistory([]); return }
    setLoadingHistory(true)
    supabase
      .from('price_history')
      .select('price, recorded_at')
      .eq('item_id', selectedItemId)
      .order('recorded_at')
      .then(({ data }) => {
        setPriceHistory((data as PricePoint[] | null) ?? [])
        setLoadingHistory(false)
      })
  }, [selectedItemId])

  // ── Derived stats ────────────────────────────────────────────────────────

  const now = new Date()
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const thisMonthTotal = closedLists
    .filter((l) => monthKey(l.closed_at) === currentMonthKey)
    .reduce((s, l) => s + Number(l.total), 0)

  const allTotals = closedLists.map((l) => Number(l.total)).filter((t) => t > 0)
  const avgPerList = allTotals.length > 0
    ? allTotals.reduce((a, b) => a + b, 0) / allTotals.length
    : 0

  // Last 6 months bar chart data
  const monthlyMap: Record<string, number> = {}
  for (const l of closedLists) {
    const k = monthKey(l.closed_at)
    monthlyMap[k] = (monthlyMap[k] ?? 0) + Number(l.total)
  }
  const last6Months: string[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    last6Months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const monthlyBarData = last6Months.map((k) => ({
    label: monthLabel(k),
    value: monthlyMap[k] ?? 0,
  }))

  // Price history line chart data
  const priceLineData = priceHistory.map((p) => ({
    label: formatDateShort(p.recorded_at),
    value: Number(p.price),
  }))

  const maxCategory = categoryData[0]?.value ?? 1

  if (state === 'loading' || householdLoading) return <PageSpinner />

  if (state === 'empty') {
    return (
      <div className="py-4">
        <h1 className="text-xl font-bold text-foreground mb-6">Insights</h1>
        <EmptyState
          emoji="📊"
          title="Sin datos todavía"
          description="Completa al menos una lista de compras para ver tus métricas."
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 py-4">
      <h1 className="text-xl font-bold text-foreground">Insights</h1>

      {/* ── Stat cards ── */}
      <Section title="Resumen">
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            emoji="📅"
            label="Gasto este mes"
            value={thisMonthTotal > 0 ? formatCOP(thisMonthTotal) : '—'}
            highlight={thisMonthTotal > 0}
          />
          <StatCard
            emoji="📊"
            label="Promedio por lista"
            value={avgPerList > 0 ? formatCOP(avgPerList) : '—'}
          />
          <StatCard
            emoji="✅"
            label="Listas completadas"
            value={String(closedLists.length)}
            sub={`Total: ${formatCOP(allTotals.reduce((a, b) => a + b, 0))}`}
          />
          <StatCard
            emoji="🏷️"
            label="Productos rastreados"
            value={String(catalogItems.length)}
          />
        </div>
      </Section>

      {/* ── Monthly spend bar chart ── */}
      <Section title="Gasto mensual">
        <div className="rounded-2xl bg-surface border border-border shadow-sm p-4">
          <p className="text-xs text-muted mb-3">Últimos 6 meses</p>
          {monthlyBarData.every((d) => d.value === 0) ? (
            <p className="text-sm text-muted text-center py-6">Sin datos en este período</p>
          ) : (
            <BarChart data={monthlyBarData} />
          )}
          {/* Legend: max month */}
          {monthlyBarData.some((d) => d.value > 0) && (
            <div className="mt-3 flex justify-between text-xs text-muted">
              <span>Mes más alto: <strong className="text-foreground/80">{
                monthlyBarData.reduce((best, d) => d.value > best.value ? d : best, monthlyBarData[0]).label
              }</strong></span>
              <span>{formatCOP(Math.max(...monthlyBarData.map((d) => d.value)))}</span>
            </div>
          )}
        </div>
      </Section>

      {/* ── Price evolution line chart ── */}
      <Section title="Evolución de precios">
        <div className="rounded-2xl bg-surface border border-border shadow-sm p-4 flex flex-col gap-3">
          <select
            value={selectedItemId}
            onChange={(e) => setSelectedItemId(e.target.value)}
            className="w-full rounded-xl border border-border-strong bg-surface px-3 py-2.5 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          >
            <option value="">— Elige un producto —</option>
            {catalogItems.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>

          {loadingHistory && (
            <p className="text-sm text-muted text-center py-4">Cargando...</p>
          )}

          {!loadingHistory && selectedItemId && priceLineData.length === 0 && (
            <p className="text-sm text-muted text-center py-4">
              Este producto no tiene historial de precios aún.
            </p>
          )}

          {!loadingHistory && priceLineData.length > 0 && (
            <>
              <LineChart data={priceLineData} />
              <div className="flex justify-between text-xs text-muted border-t border-border/60 pt-2">
                <span>Mín: <strong className="text-foreground/80">{formatCOP(Math.min(...priceLineData.map((d) => d.value)))}</strong></span>
                <span>Máx: <strong className="text-foreground/80">{formatCOP(Math.max(...priceLineData.map((d) => d.value)))}</strong></span>
                <span>Último: <strong className="text-brand">{formatCOP(priceLineData[priceLineData.length - 1].value)}</strong></span>
              </div>
            </>
          )}

          {!selectedItemId && (
            <p className="text-sm text-muted text-center py-4">
              Selecciona un producto para ver cómo ha cambiado su precio.
            </p>
          )}
        </div>
      </Section>

      {/* ── Category breakdown ── */}
      {categoryData.length > 0 && (
        <Section title="Gasto por categoría">
          <div className="rounded-2xl bg-surface border border-border shadow-sm p-4 flex flex-col gap-3">
            {categoryData.map((d) => (
              <HBar
                key={d.label}
                label={`${getCategoryEmoji(d.label)} ${d.label}`}
                value={d.value}
                max={maxCategory}
                color={CATEGORY_COLORS[d.label] ?? '#94a3b8'}
              />
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}
