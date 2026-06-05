// src/components/shared/CycleBadge.tsx
import type { CycleStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

interface CycleBadgeProps {
  name:   string
  status: CycleStatus
}

export function CycleBadge({ name, status }: CycleBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-[5px] px-[10px] py-[3px] rounded-[20px] text-[11px] font-mono',
        status === 'active'   && 'bg-[#E1F5EE] text-[#0F6E56]',
        status === 'closed'   && 'bg-muted text-muted-foreground',
        status === 'archived' && 'bg-muted text-muted-foreground/70',
      )}
    >
      <span
        className={cn(
          'inline-block w-[5px] h-[5px] rounded-full shrink-0',
          status === 'active'   && 'bg-[#1D9E75]',
          status === 'closed'   && 'bg-border',
          status === 'archived' && 'bg-border',
        )}
      />
      {name} · {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}
