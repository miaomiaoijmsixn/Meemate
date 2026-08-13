import { NextRequest, NextResponse } from "next/server";

const COOKIE = "mm_sess";
const YEAR = 60 * 60 * 24 * 365;

/**
 * 多租户前门。
 * - 首次访问自动种下 mm_sess=<uuid>,别人访问永远是一个干净的新用户
 * - xingmiaoli.com?resume=legacy 是老账户回锅入口,cookie 切到 legacy
 *   然后 clear URL(免得刷新又重置),这样 demo 前端不给用户露 legacy 入口
 * - .well-known / _next 等系统路径不走这层,免得种一堆没用的 cookie
 */
export function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const resume = url.searchParams.get("resume");

  if (resume) {
    url.searchParams.delete("resume");
    const res = NextResponse.redirect(url);
    res.cookies.set(COOKIE, resume, {
      path: "/",
      maxAge: YEAR,
      sameSite: "lax",
    });
    return res;
  }

  const existing = req.cookies.get(COOKIE)?.value;
  if (existing) return NextResponse.next();

  const id = crypto.randomUUID();
  const res = NextResponse.next();
  res.cookies.set(COOKIE, id, {
    path: "/",
    maxAge: YEAR,
    sameSite: "lax",
  });
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.well-known|robots.txt).*)"],
};
