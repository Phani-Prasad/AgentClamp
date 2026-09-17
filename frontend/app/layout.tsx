import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'AgentClamp Platform — Agentic AI Testbed',
  description: 'Build, run, observe, and govern AI agents end-to-end. Powered by LangGraph, Groq, and open-source tools.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className={inter.className}>
        <div className="aurora-bg">
          <div className="aurora-blob aurora-1" />
          <div className="aurora-blob aurora-2" />
        </div>
        {children}
      </body>
    </html>
  )
}

