import { NextRequest, NextResponse } from 'next/server'

const publicPaths = [
  '/login',
  '/register',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/public/',
  '/api/email/track',
]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // V1 public API — authenticated via X-API-Key header, not Bearer token.
  // The middleware does a quick presence check; the route handlers perform
  // full API key validation via requireApiKey().
  if (pathname.startsWith('/api/v1/')) {
    const apiKey = req.headers.get('x-api-key')
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'API_KEY_REQUIRED' },
        { status: 401 }
      )
    }
    return NextResponse.next()
  }

  if (pathname.startsWith('/api/')) {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/((?!auth/login|auth/register|auth/refresh|email/track).*)',
    '/dashboard/:path*',
    '/pipeline/:path*',
    '/contacts/:path*',
    '/deals/:path*',
    '/leads/:path*',
    '/activities/:path*',
    '/reports/:path*',
    '/settings/:path*',
    '/email/:path*',
  ],
}
