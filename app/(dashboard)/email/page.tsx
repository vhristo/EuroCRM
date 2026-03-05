import { Metadata } from 'next'
import EmailPageClient from './EmailPageClient'

export const metadata: Metadata = {
  title: 'Email | EuroCRM',
  description: 'Send and track emails to contacts and deals',
}

export default function EmailPage() {
  return <EmailPageClient />
}
