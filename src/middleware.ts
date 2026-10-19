import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simple middleware to protect /admin routes
// In production, use NextAuth middleware
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login page
  if (pathname === "/admin/login") return NextResponse.next();

  // Allow public API routes
  if (pathname.startsWith("/api/store/") || pathname.startsWith("/api/sse") || pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  // Check auth cookie for admin routes
  if (pathname.startsWith("/admin")) {
    const token =
      request.cookies.get("authjs.session-token") ||
      request.cookies.get("__Secure-authjs.session-token");
    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
