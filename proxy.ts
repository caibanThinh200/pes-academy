import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/database';
import {
  AUTH_ROUTES,
  CHANGE_PASSWORD_ROUTE,
  PUBLIC_ROUTES,
  REMEMBER_COOKIE,
  applyRemember,
  isSupabaseConfigured,
} from '@/lib/auth-shared';

function copyCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });
}

export async function proxy(request: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const remember = request.cookies.get(REMEMBER_COOKIE)?.value !== '0';

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, applyRemember(options, remember));
        });
        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicRoute = PUBLIC_ROUTES.includes(
    pathname as (typeof PUBLIC_ROUTES)[number]
  );
  const isAuthRoute = AUTH_ROUTES.includes(
    pathname as (typeof AUTH_ROUTES)[number]
  );

  const redirectTo = (targetPath: string) => {
    const url = request.nextUrl.clone();
    url.pathname = targetPath;
    url.search = '';
    const redirectResponse = NextResponse.redirect(url);
    copyCookies(response, redirectResponse);
    return redirectResponse;
  };

  if (!user) {
    if (!isPublicRoute) {
      return redirectTo('/login');
    }
    return response;
  }

  if (isAuthRoute) {
    return redirectTo('/');
  }

  const { data: profile } = await supabase
    .from('users')
    .select('must_change_password')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.must_change_password && pathname !== CHANGE_PASSWORD_ROUTE) {
    return redirectTo(CHANGE_PASSWORD_ROUTE);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon\\.ico|sw\\.js|manifest\\.webmanifest|icons/|.*\\..*).*)',
  ],
};

