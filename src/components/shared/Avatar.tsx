// src/components/shared/Avatar.tsx
'use client'

import { useEffect, useState } from 'react'

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

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const buf  = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

interface AvatarProps {
  name:       string
  size?:      number
  fontSize?:  number
  style?:     React.CSSProperties
  /** Account photo (e.g. Google profile picture). Preferred when present. */
  src?:       string | null
  /** Registered email — falls back to its Gravatar when no `src` is given. */
  email?:     string | null
}

export function Avatar({ name, size = 32, fontSize, style, src, email }: AvatarProps) {
  const initials = getInitials(name)
  const palette  = getPalette(name)
  const fs       = fontSize ?? Math.round(size * 0.36)

  // Resolve the best image: an explicit src (account photo) wins; otherwise the
  // email's Gravatar — which 404s (and so falls back to initials) when none.
  const [imgUrl,  setImgUrl]  = useState<string | null>(src ?? null)
  const [errored, setErrored] = useState(false)

  useEffect(() => {
    let cancelled = false
    setErrored(false)

    if (src) { setImgUrl(src); return }

    const addr = email?.trim().toLowerCase()
    if (!addr) { setImgUrl(null); return }

    sha256Hex(addr)
      .then(hash => { if (!cancelled) setImgUrl(`https://www.gravatar.com/avatar/${hash}?s=${size * 2}&d=404`) })
      .catch(() => { if (!cancelled) setImgUrl(null) })

    return () => { cancelled = true }
  }, [src, email, size])

  const showImage = imgUrl && !errored

  return (
    <div
      aria-label={name}
      title={name}
      className="rounded-full flex items-center justify-center font-medium shrink-0 select-none overflow-hidden"
      style={{
        width:      size,
        height:     size,
        background: palette.bg,
        color:      palette.color,
        fontSize:   fs,
        ...style,
      }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imgUrl!}
          alt={name}
          width={size}
          height={size}
          referrerPolicy="no-referrer"
          onError={() => setErrored(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        initials
      )}
    </div>
  )
}
