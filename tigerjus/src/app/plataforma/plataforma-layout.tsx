import { AppSettingsProvider } from '@/contexts/AppSettingsContext'

export default function PlataformaLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppSettingsProvider>
      {children}
    </AppSettingsProvider>
  )
}
