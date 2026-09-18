import { buildAuthorizationUrl, createOAuthState, ZOHO_STATE_COOKIE, zohoNoStoreHeaders } from "@/lib/zoho-oauth";
import { InstanceRateLimiter } from "@/lib/http-safety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = new InstanceRateLimiter(5, 60_000);

export async function GET(request: Request) {
  const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rate = limiter.take(key);
  if (!rate.allowed) {
    return new Response("Too many authorization attempts", {
      status: 429,
      headers: { ...zohoNoStoreHeaders("text/plain; charset=utf-8"), "retry-after": String(rate.retryAfterSeconds) },
    });
  }
  try {
    const state = await createOAuthState();
    const headers = new Headers(zohoNoStoreHeaders("text/plain; charset=utf-8"));
    headers.set("location", buildAuthorizationUrl(state).toString());
    headers.set("set-cookie", `${ZOHO_STATE_COOKIE}=${encodeURIComponent(state)}; Path=/api/integrations/zoho; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
    return new Response(null, { status: 302, headers });
  } catch (error) {
    const detail = error instanceof Error && /^Missing ZOHO_[A-Z_]+$/.test(error.message)
      ? `: ${error.message}`
      : "";
    return new Response(`Zoho integration is not configured${detail}`, { status: 503, headers: zohoNoStoreHeaders("text/plain; charset=utf-8") });
  }
}
