// src/components/shared/ToastProvider.tsx
'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Toast {
  id:      string
  message: string
  type:    'success' | 'error' | 'info'
}

interface ToastCtx {
  toast: (message: string, type?: Toast['type']) => void
}

const ToastContext = createContext<ToastCtx>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2500)
  }, [])

  const ICONS = { success: 'ti-check', error: 'ti-x', info: 'ti-info-circle' }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 right-5 flex flex-col gap-2 z-[100] pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            role="status"
            aria-live="polite"
            className={cn(
              'flex items-center gap-2 px-[14px] py-[9px] rounded-lg text-[13px] whitespace-nowrap',
              '[animation:slideUpToast_.2s_ease]',
              t.type === 'success' && 'bg-foreground text-background',
              t.type === 'error'   && 'bg-[#A32D2D] text-white',
              t.type === 'info'    && 'bg-[#185FA5] text-white',
            )}
          >
            <i className={`ti ${ICONS[t.type]} text-[14px]`} aria-hidden="true" />
            {t.message}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes slideUpToast {
          from { transform: translateY(8px); opacity: 0; }
          to   { transform: translateY(0);   opacity: 1; }
        }
      `}</style>
    </ToastContext.Provider>
  )
}
