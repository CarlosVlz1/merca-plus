import { describe, it, expect } from 'vitest'
import { formatListForWhatsApp } from './format-list'
import type { ShoppingListItemWithDetails } from './format-list'

const makeItem = (
  overrides: Partial<ShoppingListItemWithDetails>,
): ShoppingListItemWithDetails => ({
  id: '1',
  quantity: 1,
  price: null,
  checked: false,
  item: { name: 'Ítem', category: 'General', unit: null },
  ...overrides,
})

describe('formatListForWhatsApp', () => {
  it('returns empty string when all items are already checked', () => {
    const items = [
      makeItem({ checked: true, item: { name: 'Leche', category: 'Lácteos', unit: '1 lt' } }),
    ]
    expect(formatListForWhatsApp(items)).toBe('')
  })

  it('only includes unchecked (pending) items', () => {
    const items = [
      makeItem({ checked: false, item: { name: 'Leche entera', category: 'Lácteos', unit: '1 lt' }, quantity: 2 }),
      makeItem({ checked: true, item: { name: 'Yogur', category: 'Lácteos', unit: null }, quantity: 1 }),
    ]
    const result = formatListForWhatsApp(items)
    expect(result).toContain('Leche entera (1 lt)')
    expect(result).not.toContain('Yogur')
  })

  it('groups items by category with emoji headers', () => {
    const items: ShoppingListItemWithDetails[] = [
      makeItem({ item: { name: 'Leche entera', category: 'Lácteos', unit: '1 lt' }, quantity: 2 }),
      makeItem({ item: { name: 'Tomate', category: 'Verduras', unit: 'libra' }, quantity: 3 }),
    ]
    const result = formatListForWhatsApp(items)
    expect(result).toContain('Lácteos')
    expect(result).toContain('Leche entera (1 lt)')
    expect(result).toContain('Verduras')
    expect(result).toContain('Tomate (libra)')
  })

  it('shows quantity multiplier only when > 1', () => {
    const items = [
      makeItem({ item: { name: 'Arroz', category: 'Granos', unit: null }, quantity: 1 }),
      makeItem({ item: { name: 'Panela', category: 'Granos', unit: null }, quantity: 3 }),
    ]
    const result = formatListForWhatsApp(items)
    expect(result).toContain('• Arroz\n')
    expect(result).toContain('• Panela ×3')
  })

  it('formats decimal quantities correctly', () => {
    const items = [
      makeItem({ item: { name: 'Arroz', category: 'Granos', unit: null }, quantity: 1.5 }),
    ]
    const result = formatListForWhatsApp(items)
    expect(result).toContain('×1.50')
  })

  it('includes Merca+ footer', () => {
    const items = [makeItem({ item: { name: 'Pan', category: 'Panadería', unit: null } })]
    const result = formatListForWhatsApp(items)
    expect(result).toContain('Merca+')
  })
})
