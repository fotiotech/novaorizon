// middleware.ts
import { auth } from "@/app/auth";
import { NextResponse } from "next/server";

export async function middleware(request: any) {
  // 1) Get the session using NextAuth's auth() function (pass the request)
  const session = await auth(request);
  const response = NextResponse.next();

  // 2) If not authenticated, ensure a guestId cookie exists
  if (!session?.user?.id) {
    const guestId = request.cookies.get("guestId")?.value;
    if (!guestId) {
      response.cookies.set("guestId", crypto.randomUUID(), {
        path: "/",
        maxAge: 60 * 60 * 24 * 365, // 1 year
        sameSite: "lax",
        httpOnly: true,
      });
    }
  } else {
    // Optionally clear guest cookie if user logs in (not required)
    response.cookies.delete("guestId");
  }

  return response;
}

// Match all routes except static files, auth pages, etc.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|auth/|public/).*)"],
};
