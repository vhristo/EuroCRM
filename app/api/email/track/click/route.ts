import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import EmailMessage from '@/models/EmailMessage'

// PUBLIC route — no auth required
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url)
  const tid = searchParams.get('tid')
  const url = searchParams.get('url')

  // Record the click asynchronously before redirecting
  if (tid && url) {
    void recordClick(tid, url, req).catch(() => {
      // silently ignore tracking errors
    })
  }

  // Redirect to the original URL; fall back to homepage if missing/invalid
  const destination = url && isValidUrl(url) ? url : '/'

  return NextResponse.redirect(destination, { status: 302 })
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

async function recordClick(
  trackingId: string,
  url: string,
  req: NextRequest
): Promise<void> {
  await connectDB()

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    undefined

  const userAgent = req.headers.get('user-agent') ?? undefined

  await EmailMessage.findOneAndUpdate(
    { trackingId },
    {
      $push: {
        clicks: {
          timestamp: new Date(),
          url,
          ip,
          userAgent,
        },
      },
    }
  )
}
