import { NextRequest, NextResponse } from 'next/server'

const publicPaths = ['/login', '/register', '/api/auth/login', '/api/auth/register', '/api/auth/refresh']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (publicPaths.some((p) => pathname.startsWith(p))) {
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
  matcher: ['/api/((?!auth/login|auth/register|auth/refresh).*)', '/dashboard/:path*', '/pipeline/:path*', '/contacts/:path*', '/deals/:path*', '/leads/:path*', '/activities/:path*', '/reports/:path*', '/settings/:path*'],
}
