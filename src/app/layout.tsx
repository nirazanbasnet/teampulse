// src/app/layout.tsx
import type { Metadata } from 'next'
import { DM_Sans }       from 'next/font/google'
import { createServerClient } from '@/lib/supabase/server'
import { ToastProvider }  from '@/components/shared/ToastProvider'
import './globals.css'

const dmSans = DM_Sans({
  subsets:  ['latin'],
  variable: '--font-dm-sans',
  weight:   ['300', '400', '500'],
})

export const metadata: Metadata = {
  title:       'TeamPulse — Anonymous team feedback',
  description: 'Collaborative anonymous sticky-note feedback board for teams.',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={dmSans.variable}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css"
        />
      </head>
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
