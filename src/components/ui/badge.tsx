import { cn } from '@/lib/cn'

const CATEGORY_CONFIG: Record<string, { emoji: string; bg: string; text: string }> = {
  'Lácteos':              { emoji: '🥛', bg: 'bg-blue-50',   text: 'text-blue-700' },
  'Carnes y aves':        { emoji: '🥩', bg: 'bg-red-50',    text: 'text-red-700' },
  'Frutas y verduras':    { emoji: '🥦', bg: 'bg-green-50',  text: 'text-green-700' },
  'Panadería':            { emoji: '🍞', bg: 'bg-amber-50',  text: 'text-amber-700' },
  'Bebidas':              { emoji: '🥤', bg: 'bg-cyan-50',   text: 'text-cyan-700' },
  'Aseo del hogar':       { emoji: '🧹', bg: 'bg-purple-50', text: 'text-purple-700' },
  'Aseo personal':        { emoji: '🧴', bg: 'bg-pink-50',   text: 'text-pink-700' },
  'Congelados':           { emoji: '❄️', bg: 'bg-sky-50',    text: 'text-sky-700' },
  'Enlatados y conservas':{ emoji: '🥫', bg: 'bg-orange-50', text: 'text-orange-700' },
  'Granos y cereales':    { emoji: '🌾', bg: 'bg-yellow-50', text: 'text-yellow-700' },
  'Snacks':               { emoji: '🍿', bg: 'bg-rose-50',   text: 'text-rose-700' },
  'Otros':                { emoji: '📦', bg: 'bg-gray-100',  text: 'text-gray-600' },
}

interface CategoryBadgeProps {
  category: string
  showEmoji?: boolean
  className?: string
}

export function CategoryBadge({ category, showEmoji = true, className }: CategoryBadgeProps) {
  const cfg = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG['Otros']
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        cfg.bg,
        cfg.text,
        className,
      )}
    >
      {showEmoji && <span>{cfg.emoji}</span>}
      {category}
    </span>
  )
}

export function getCategoryEmoji(category: string): string {
  return CATEGORY_CONFIG[category]?.emoji ?? '📦'
}

export { CATEGORY_CONFIG }
