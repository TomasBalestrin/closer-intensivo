import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const pathname = request.nextUrl.pathname

  // Skip auth entirely for public routes and API routes - no DB calls needed
  const isPublicRoute = pathname.startsWith('/login') || pathname.startsWith('/form')
  const isApiRoute = pathname.startsWith('/api')

  if (isPublicRoute || isApiRoute) {
    return supabaseResponse
  }

  // Only create Supabase client and check auth for protected routes
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request,
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

    // Not authenticated -> redirect to login
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Only query role if we actually need it (admin routes or login redirect)
    if (pathname.startsWith('/admin')) {
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()

        if (userData?.role !== 'admin') {
          const url = request.nextUrl.clone()
          url.pathname = '/closer/dashboard'
          return NextResponse.redirect(url)
        }
      } catch {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
      }
    }

    return supabaseResponse
  } catch {
    // If there's any error, allow the request to continue
    return supabaseResponse
  }
}
