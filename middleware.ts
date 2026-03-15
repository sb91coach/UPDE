import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Routes that do not require authentication (public). */
function isPublicRoute(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/login/") ||
    pathname.startsWith("/signup/")
  );
}

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll().map((c) => ({ name: c.name, value: c.value }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  if (!session && !isPublicRoute(req.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
