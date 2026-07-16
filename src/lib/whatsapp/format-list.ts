export interface ShoppingListItemWithDetails {
  id: string
  quantity: number
  price?: number | null
  checked: boolean
  item: {
    name: string
    category: string
    unit?: string | null
  }
}

const CATEGORY_EMOJI: Record<string, string> = {
  'Lácteos': '🥛',
  'Carnes': '🥩',
  'Verduras': '🥬',
  'Frutas': '🍎',
  'Panadería': '🍞',
  'Granos': '🌾',
  'Bebidas': '🧃',
  'Aseo': '🧴',
  'Snacks': '🍿',
  'Congelados': '🧊',
  'Otros': '📦',
}

function getEmoji(category: string): string {
  return CATEGORY_EMOJI[category] ?? '🛒'
}

function formatQty(qty: number): string {
  return qty % 1 === 0 ? String(qty) : qty.toFixed(2)
}

/**
 * Formats the pending (unchecked) items of a shopping list for WhatsApp sharing.
 * Returns empty string if there are no unchecked items.
 */
export function formatListForWhatsApp(
  items: ShoppingListItemWithDetails[],
): string {
  const pending = items.filter((i) => !i.checked)
  if (pending.length === 0) return ''

  const byCategory = pending.reduce<Record<string, ShoppingListItemWithDetails[]>>(
    (acc, li) => {
      const cat = li.item.category
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(li)
      return acc
    },
    {},
  )

  const date = new Date().toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const lines: string[] = [
    `🛒 *Lista de mercado*`,
    `_${date}_`,
  ]

  for (const [category, catItems] of Object.entries(byCategory)) {
    lines.push('')
    lines.push(`${getEmoji(category)} *${category}*`)
    for (const li of catItems) {
      const name = li.item.unit
        ? `${li.item.name} (${li.item.unit})`
        : li.item.name
      const qty = Number(li.quantity)
      lines.push(qty > 1 ? `• ${name} ×${formatQty(qty)}` : `• ${name}`)
    }
  }

  lines.push('')
  lines.push(`_Enviado con Merca+_ ✅`)

  return lines.join('\n')
}
