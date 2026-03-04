import { redirect } from 'next/navigation'

/**
 * Root page — immediately redirects to the dashboard.
 * Unauthenticated users are then bounced to /login by the Next.js middleware.
 * This is a Server Component; no 'use client' is needed for redirect().
 */
export default function RootPage() {
  redirect('/dashboard')
}
