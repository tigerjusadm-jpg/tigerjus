import type { Metadata } from 'next'
import { Playfair_Display, DM_Sans, DM_Mono } from 'next/font/google'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['700', '900'],
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600', '700', '800'],
})

const const dmMono = DM_Mono({   subsets: ['latin'],   variable: '--font-mono',   weight: ['300', '400', '500'], }) = DM_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '700'],
})

export const metadata: Metadata = {
  title: 'TigerJus — Estude como um Tigre',
  description: 'A plataforma jurídica mais inteligente do Brasil. Estude Direito com IA, gamificação e metodologia de alta performance. Aprovação na OAB garantida.',
  keywords: 'OAB, direito, estudo jurídico, simulado OAB, questões OAB, IA jurídica, aprovação OAB',
  openGraph: {
    title: 'TigerJus — Estude como um Tigre',
    description: 'Plataforma jurídica com IA, gamificação e simulados OAB. Mais de 12.400 estudantes aprovados.',
    url: 'https://tigerjus.com.br',
    siteName: 'TigerJus',
    type: 'website',
    locale: 'pt_BR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TigerJus — Estude como um Tigre',
    description: 'Plataforma jurídica com IA, gamificação e simulados OAB.',
  },
  robots: { index: true, follow: true },
  metadataBase: new URL('https://tigerjus.com.br'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${playfair.variable} ${dmSans.variable} ${dmMono.variable}`}>
      <body className="bg-deep-black text-app-white font-body antialiased">
        {children}
      </body>
    </html>
  )
}
