'use client'
import { AppSettingsProvider } from '@/contexts/AppSettingsContext'
import ThemeProvider from '@/components/ThemeProvider'

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AppSettingsProvider>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </AppSettingsProvider>
  )
}
