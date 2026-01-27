import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

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

    const pathname = request.nextUrl.pathname

    // Public routes that don't require authentication
    const publicRoutes = ['/login', '/form']
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

    // API routes that need special handling
    const isApiRoute = pathname.startsWith('/api')

    // If not authenticated and trying to access protected route
    if (!user && !isPublicRoute && !isApiRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // If authenticated and trying to access login
    if (user && pathname === '/login') {
      // Get user role to redirect appropriately
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()

        const url = request.nextUrl.clone()
        url.pathname = userData?.role === 'admin' ? '/admin/dashboard' : '/closer/dashboard'
        return NextResponse.redirect(url)
      } catch {
        // If database query fails, redirect to closer dashboard by default
        const url = request.nextUrl.clone()
        url.pathname = '/closer/dashboard'
        return NextResponse.redirect(url)
      }
    }

    // Role-based access control
    if (user && !isPublicRoute && !isApiRoute) {
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()

        // Protect admin routes
        if (pathname.startsWith('/admin') && userData?.role !== 'admin') {
          const url = request.nextUrl.clone()
          url.pathname = '/closer/dashboard'
          return NextResponse.redirect(url)
        }
      } catch {
        // If database query fails and trying to access admin routes, redirect to login
        if (pathname.startsWith('/admin')) {
          const url = request.nextUrl.clone()
          url.pathname = '/login'
          return NextResponse.redirect(url)
        }
      }
    }

    return supabaseResponse
  } catch {
    // If there's any error, allow the request to continue
    return supabaseResponse
  }
}
