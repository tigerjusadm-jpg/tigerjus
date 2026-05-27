'use client'
import { AppSettingsProvider } from '@/contexts/AppSettingsContext'

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AppSettingsProvider>
      {children}
    </AppSettingsProvider>
  )
}
