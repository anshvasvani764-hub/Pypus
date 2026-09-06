import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  // ── Device detection ──────────────────────────────────────────────────────
  const isMobile = /Android|iPhone|iPod|Windows Phone|webOS|BlackBerry|IEMobile|Opera Mini|\biPad\b/i.test(
    request.headers.get('user-agent') ?? ''
  )
  const forced = request.nextUrl.searchParams.get('device')
  const override =
    forced === 'mobile' || forced === 'desktop'
      ? forced
      : request.cookies.get('device-override')?.value
  const device =
    override === 'mobile' || override === 'desktop' ? override : isMobile ? 'mobile' : 'desktop'

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-device', device)

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  })

  // ── Auth check ────────────────────────────────────────────────────────────
  // Wrapped in try/catch so a Supabase outage doesn't crash routing for all pages.
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request: { headers: requestHeaders },
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const pathname = request.nextUrl.pathname

    // API routes are never redirected to /login — an external caller (Meta's
    // webhook verification, Cashfree's payment webhook, the cron scheduler)
    // can't follow a browser redirect, and every route under /api/ already
    // guards itself (hub.verify_token, CRON_SECRET, signature checks, or its
    // own supabase.auth.getUser() call returning a proper 401 JSON response).
    // Without this, those external callers got silently redirected here
    // instead of ever reaching their handler.
    const isApiRoute = pathname.startsWith('/api/')

    const isPublicRoute =
      isApiRoute ||
      pathname === '/' ||
      pathname.startsWith('/login') ||
      pathname.startsWith('/auth') ||
      pathname.startsWith('/invite') ||
      pathname.startsWith('/m/')

    const isProtectedRoute = !isApiRoute && (pathname.startsWith('/onboarding') || !isPublicRoute)

    // 1. Unauthenticated users trying to access protected routes -> redirect to /login
    if (!user && isProtectedRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // 2. Authenticated users trying to access /login -> redirect to / (which handles workspace routing)
    if (user && pathname === '/login') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  } catch (err) {
    // Supabase unreachable or env vars missing — allow the request through.
    // Pages that need auth will handle it themselves via createClient().
    console.error('[proxy] supabase auth check failed:', err)
  }

  // ── Device override cookie ────────────────────────────────────────────────
  if (forced === 'mobile' || forced === 'desktop') {
    supabaseResponse.cookies.set('device-override', forced, { path: '/' })
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
