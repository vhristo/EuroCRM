import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import EmailMessage from '@/models/EmailMessage'

// 1×1 transparent GIF
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

// PUBLIC route — no auth required
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url)
  const tid = searchParams.get('tid')

  if (tid) {
    // Fire-and-forget — do not block the pixel response on DB write
    void recordOpen(tid, req).catch(() => {
      // silently ignore tracking errors
    })
  }

  return new NextResponse(TRACKING_PIXEL, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  })
}

async function recordOpen(trackingId: string, req: NextRequest): Promise<void> {
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
        opens: {
          timestamp: new Date(),
          ip,
          userAgent,
        },
      },
    }
  )
}
