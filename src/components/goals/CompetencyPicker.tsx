// src/components/goals/CompetencyPicker.tsx
'use client'

import { COMPETENCIES, COMPETENCY_META } from '@/lib/growth/score'
import type { NoteTag } from '@/lib/types'

// Single-select, optional competency picker — the same chip grammar as
// AddNoteModal's area step, reused so goals/wins land on the same axes as
// peer feedback. Click an active chip to clear it.
export function CompetencyPicker({
  value,
  onChange,
}: {
  value: NoteTag | null
  onChange: (next: NoteTag | null) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {COMPETENCIES.map(key => {
        const meta = COMPETENCY_META[key]
        const on = value === key
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(on ? null : key)}
            aria-pressed={on}
            className="rounded-[20px] border px-2.5 py-1 text-xs transition-all"
            style={on
              ? { background: meta.color, color: '#fff', borderColor: meta.color }
              : { background: `${meta.color}12`, color: meta.color, borderColor: `${meta.color}38` }}
          >
            {meta.label}
          </button>
        )
      })}
    </div>
  )
}
