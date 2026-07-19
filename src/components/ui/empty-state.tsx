interface EmptyStateProps {
  emoji?: string
  title: string
  description?: string
  action?: React.ReactNode
}

export default function EmptyState({ emoji = '📭', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-surface border border-border px-6 py-12 text-center">
      <span className="text-4xl leading-none">{emoji}</span>
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-muted max-w-xs mx-auto">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
