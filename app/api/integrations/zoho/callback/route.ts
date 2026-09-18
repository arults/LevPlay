import {
  exchangeAuthorizationCode,
  parseCookie,
  validateOAuthState,
  verifyLevPlayMailbox,
  ZOHO_STATE_COOKIE,
  zohoNoStoreHeaders,
} from "@/lib/zoho-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  const cookieState = parseCookie(request, ZOHO_STATE_COOKIE);
  const clearCookie = `${ZOHO_STATE_COOKIE}=; Path=/api/integrations/zoho; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
  let stage: "state" | "token_exchange" | "mailbox_verify" = "state";

  try {
    if (!state || !cookieState || state !== cookieState || !await validateOAuthState(state)) {
      throw new Error("Invalid or expired OAuth state");
    }
    stage = "token_exchange";
    const tokens = await exchangeAuthorizationCode(code);
    stage = "mailbox_verify";
    await verifyLevPlayMailbox(tokens.accessToken);
    const html = successPage(tokens.refreshToken);
    return new Response(html, { status: 200, headers: { ...zohoNoStoreHeaders(), "set-cookie": clearCookie } });
  } catch (error) {
    console.error("[zoho-oauth] callback failed", {
      stage,
      reason: error instanceof Error ? error.message : "Unknown OAuth failure",
    });
    return new Response(errorPage(stage), { status: 400, headers: { ...zohoNoStoreHeaders(), "set-cookie": clearCookie } });
  }
}

function successPage(refreshToken: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LevPlay Mail connected</title><style>${styles}</style></head><body><main><p class="eyebrow">LEVPLAY MAIL</p><h1>Zoho authorization succeeded</h1><p>The authorized account contains <strong>info@levplay.tech</strong>. Copy the one-time refresh token below into Vercel as <code>ZOHO_REFRESH_TOKEN</code>.</p><textarea readonly spellcheck="false" aria-label="Zoho refresh token">${escapeHtml(refreshToken)}</textarea><p class="warning">Treat this token like a password. Do not paste it into ChatGPT, email, Slack, GitHub, or documentation.</p><p>After saving it in Vercel, close this page and tell Codex only: <strong>Refresh token added</strong>.</p></main></body></html>`;
}

function errorPage(stage: "state" | "token_exchange" | "mailbox_verify") {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LevPlay Mail connection failed</title><style>${styles}</style></head><body><main><p class="eyebrow">LEVPLAY MAIL</p><h1>Authorization could not be completed</h1><p>The request was invalid, expired, or did not authorize <strong>info@levplay.tech</strong>. Start again from the LevPlay authorization link.</p><p>Diagnostic stage: <code>${stage}</code></p></main></body></html>`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] || character);
}

const styles = `:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#07090d;color:#f5f7fb;font:16px/1.6 Inter,ui-sans-serif,system-ui,sans-serif}main{width:min(680px,calc(100% - 32px));padding:40px;border:1px solid #283041;border-radius:20px;background:#0f131b}h1{font-size:clamp(28px,6vw,44px);line-height:1.1;margin:8px 0 20px}.eyebrow{letter-spacing:.14em;color:#f59e0b;font-size:12px;font-weight:800}textarea{width:100%;min-height:132px;margin:18px 0;padding:16px;border:1px solid #3d475b;border-radius:12px;background:#080b11;color:#dce5f4;font:14px/1.5 ui-monospace,SFMono-Regular,monospace;resize:vertical}.warning{color:#fbbf24}code{font:14px ui-monospace,SFMono-Regular,monospace;color:#fbbf24}`;
