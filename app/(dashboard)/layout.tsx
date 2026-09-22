'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { setSidebarOpen } from '@/store/slices/uiSlice'
import { refreshSession } from '@/store/api/baseApi'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import NotificationSnackbar from '@/components/shared/NotificationSnackbar'
import LoadingOverlay from '@/components/shared/LoadingOverlay'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen)
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated)
  const isBootstrapping = useAppSelector((state) => state.auth.isBootstrapping)

  // The store is rebuilt on every mount, so a page reload arrives with no session.
  // The refresh cookie is the source of truth for both the session and which
  // company is active, so restore from it before giving up and redirecting.
  useEffect(() => {
    if (isAuthenticated) return

    let cancelled = false

    if (isBootstrapping) {
      refreshSession(dispatch).then((restored) => {
        if (!cancelled && !restored) router.replace('/login')
      })
    } else {
      router.replace('/login')
    }

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, isBootstrapping, dispatch, router])

  const handleClose = () => {
    dispatch(setSidebarOpen(false))
  }

  // Gate the children so their queries cannot fire — and race a second refresh —
  // before the session is restored.
  if (isBootstrapping) {
    return <LoadingOverlay open message="Restoring your session…" />
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={handleClose} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar />

        <main className="flex-1 overflow-y-auto p-3 sm:p-6">
          {children}
        </main>
      </div>

      <NotificationSnackbar />
    </div>
  )
}
