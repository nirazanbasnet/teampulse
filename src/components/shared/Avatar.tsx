// src/components/shared/Avatar.tsx

const PALETTES = [
  { bg: '#E1F5EE', color: '#0F6E56' },
  { bg: '#E6F1FB', color: '#185FA5' },
  { bg: '#FAEEDA', color: '#854F0B' },
  { bg: '#EEEDFE', color: '#534AB7' },
  { bg: '#FAECE7', color: '#993C1D' },
  { bg: '#FBEAF0', color: '#993556' },
  { bg: '#EAF3DE', color: '#3B6D11' },
]

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getPalette(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return PALETTES[Math.abs(hash) % PALETTES.length]
}

interface AvatarProps {
  name:       string
  size?:      number
  fontSize?:  number
  style?:     React.CSSProperties
}

export function Avatar({ name, size = 32, fontSize, style }: AvatarProps) {
  const initials = getInitials(name)
  const palette  = getPalette(name)
  const fs       = fontSize ?? Math.round(size * 0.36)

  return (
    <div
      aria-label={name}
      title={name}
      className="rounded-full flex items-center justify-center font-medium shrink-0 select-none"
      style={{
        width:      size,
        height:     size,
        background: palette.bg,
        color:      palette.color,
        fontSize:   fs,
        ...style,
      }}
    >
      {initials}
    </div>
  )
}
