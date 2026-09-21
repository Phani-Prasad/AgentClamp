'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!isAuthenticated()) {
      // Encode the current path so we can redirect back after login
      const redirect = encodeURIComponent(pathname)
      router.replace(`/login?redirect=${redirect}`)
    } else {
      setChecking(false)
    }
  }, [pathname, router])

  if (checking) {
    // Premium skeleton loader — matches AgentClamp dark theme
    return (
      <div style={{
        display: 'flex',
        height: '100vh',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#050508',
        flexDirection: 'column',
        gap: 16,
      }}>
        {/* Animated logo mark */}
        <div style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: '3px solid transparent',
          borderTopColor: '#f97316',
          borderRightColor: 'rgba(249,115,22,0.3)',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{
          fontSize: '0.78rem',
          color: '#4b5563',
          fontWeight: 500,
          letterSpacing: '0.5px',
        }}>
          Verifying session…
        </span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return <>{children}</>
}
