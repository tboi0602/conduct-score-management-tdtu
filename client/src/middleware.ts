import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LOCALE_COOKIE = "locale";
const DEFAULT_LOCALE = "vi";
const SUPPORTED = ["vi", "en"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const cookieLocale = req.cookies.get(LOCALE_COOKIE)?.value ?? DEFAULT_LOCALE;

  if (pathname.startsWith("/_next") || pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  if (!SUPPORTED.includes(cookieLocale)) {
    const res = NextResponse.next();
    res.cookies.set(LOCALE_COOKIE, DEFAULT_LOCALE, { path: "/", maxAge: 31536000 });
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/((?!_next|api|favicon.ico).*)",
};