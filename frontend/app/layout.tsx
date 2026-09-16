import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AgentClamp Platform — Agentic AI Testbed',
  description: 'Build, run, observe, and govern AI agents end-to-end. Powered by LangGraph, Groq, and open-source tools.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="aurora-bg">
          <div className="aurora-blob aurora-1" />
          <div className="aurora-blob aurora-2" />
        </div>
        {children}
      </body>
    </html>
  )
}
