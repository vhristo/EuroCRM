import type { Metadata } from 'next'
import './globals.css'
import Providers from './providers'

export const metadata: Metadata = {
  title: 'EuroCRM',
  description: 'European CRM for modern sales teams',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div id="__next">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  )
}
