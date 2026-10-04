// proxy.ts
import { auth } from "@/app/auth";
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

export default auth((request) => {
  // Local cast bypasses the broken NextAuthRequest type.
  const req = request as unknown as NextRequest & {
    auth: { user?: { id?: string } } | null;
  };

  const { pathname, origin, search } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user?.id;

  if (isProtected(pathname) && !isLoggedIn) {
    const loginUrl = new URL("/auth/login", origin);
    loginUrl.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)",
  ],
};
