import Sidebar from '@/components/Sidebar'
import AuthGuard from '@/components/AuthGuard'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="app-shell">
        <Sidebar />
        <main className="main-content">{children}</main>
      </div>
    </AuthGuard>
  )
}

