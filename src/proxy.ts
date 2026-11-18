// proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PATHS = [
  "/profile",
  "/orders",
  "/settings",
  "/wishlist",
  "/checkout",
  "/checkout/success",
];

function isProtected(pathname: string) {
  return PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * Lightweight route guard. The Express backend enforces authorization on
 * every API call; this only bounces anonymous visitors away from pages that
 * need a session, using the presence of the backend's `session` cookie.
 */
export default function middleware(req: NextRequest) {
  const { pathname, origin, search } = req.nextUrl;
  const isLoggedIn = Boolean(req.cookies.get("session")?.value);

  if (isProtected(pathname) && !isLoggedIn) {
    const loginUrl = new URL("/auth/login", origin);
    loginUrl.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)",
  ],
};
