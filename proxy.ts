import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const host = (request.headers.get("host") || "").split(":")[0].toLowerCase();
  if (host === "app.levplay.tech" && request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/trade", request.url));
  }
  if ((host === "levplay.tech" || host === "www.levplay.tech") && request.nextUrl.pathname === "/trade") {
    return NextResponse.redirect("https://app.levplay.tech");
  }
  return NextResponse.next();
}

export const config = { matcher: ["/", "/trade"] };
