import { cn } from '@/lib/cn'

const CATEGORY_CONFIG: Record<string, { emoji: string; bg: string; text: string }> = {
  'Lácteos':              { emoji: '🥛', bg: 'bg-blue-50 dark:bg-blue-500/15',     text: 'text-blue-700 dark:text-blue-400' },
  'Carnes y aves':        { emoji: '🥩', bg: 'bg-red-50 dark:bg-red-500/15',       text: 'text-red-700 dark:text-red-400' },
  'Frutas y verduras':    { emoji: '🥦', bg: 'bg-green-50 dark:bg-green-500/15',   text: 'text-green-700 dark:text-green-400' },
  'Panadería':            { emoji: '🍞', bg: 'bg-amber-50 dark:bg-amber-500/15',  text: 'text-amber-700 dark:text-amber-400' },
  'Bebidas':              { emoji: '🥤', bg: 'bg-cyan-50 dark:bg-cyan-500/15',    text: 'text-cyan-700 dark:text-cyan-400' },
  'Aseo del hogar':       { emoji: '🧹', bg: 'bg-purple-50 dark:bg-purple-500/15', text: 'text-purple-700 dark:text-purple-400' },
  'Aseo personal':        { emoji: '🧴', bg: 'bg-pink-50 dark:bg-pink-500/15',    text: 'text-pink-700 dark:text-pink-400' },
  'Congelados':           { emoji: '❄️', bg: 'bg-sky-50 dark:bg-sky-500/15',      text: 'text-sky-700 dark:text-sky-400' },
  'Enlatados y conservas':{ emoji: '🥫', bg: 'bg-orange-50 dark:bg-orange-500/15', text: 'text-orange-700 dark:text-orange-400' },
  'Granos y cereales':    { emoji: '🌾', bg: 'bg-yellow-50 dark:bg-yellow-500/15', text: 'text-yellow-700 dark:text-yellow-400' },
  'Snacks':               { emoji: '🍿', bg: 'bg-rose-50 dark:bg-rose-500/15',    text: 'text-rose-700 dark:text-rose-400' },
  'Otros':                { emoji: '📦', bg: 'bg-foreground/8',                   text: 'text-muted' },
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
